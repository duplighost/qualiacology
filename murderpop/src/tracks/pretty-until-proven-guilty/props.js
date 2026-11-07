// Breakable cover and the evidence room (design §4 layout, §5): the defense and prosecution tables, the lectern,
// EXHIBIT A on its easel; in verse 2 the steel shelving flies in, four glass display cases rise from floor traps
// (cover: they shatter after 3 strikes or 6 receipts, spilling YOU's old gifts) and four ring-light phones on
// tripods switch on (one strike topples a phone and kills its light). Everything has a time window and comes back
// on a rewind as it was at the checkpoint.
import * as THREE from 'three';
import { mats, M } from './pieces.js';

const box = (w, h, d, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); o.castShadow = false; o.receiveShadow = true; return o; };
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);

export class Props {
  constructor(f) {
    this.f = f; mats();
    this.group = new THREE.Group(); this.group.name = 'ppg:props'; f.scene.add(this.group);
    this.list = [];
    const glass = this.glassM = new THREE.MeshPhysicalMaterial({ color: 0xe8f0f4, roughness: 0.04, transparent: true, opacity: 0.28, clearcoat: 1, depthWrite: false });
    const paper = new THREE.MeshStandardMaterial({ color: 0xf2ead8, roughness: 0.7 });
    // the tables: oxblood lacquer with gold edges; her pink clutch and a crystal pitcher; your box of exhibits and a photo
    const table = (x, z, extras) => { const g = new THREE.Group(); g.add(box(2.6, 0.06, 1.0, M.gold, 0, 0.78, 0)); g.add(box(2.5, 0.7, 0.9, M.lacquer, 0, 0.4, 0)); extras(g); g.position.set(x, 0, z); return g; };
    const def = table(-5.2, 1.0, (g) => { g.add(box(0.36, 0.16, 0.08, new THREE.MeshPhysicalMaterial({ color: 0xff6fa8, roughness: 0.3, clearcoat: 1 }), 0.6, 0.89, 0)); const p = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.3, 14), glass); p.position.set(-0.7, 0.96, 0.1); g.add(p); });
    const pro = table(5.2, 1.0, (g) => { g.add(box(0.5, 0.3, 0.4, M.cardboard, -0.6, 0.96, 0)); const fr = box(0.3, 0.38, 0.03, M.gold, 0.6, 1.0, 0); fr.rotation.x = -0.25; g.add(fr); });
    this.add(def, { col: { type: 'box', w: 2.6, d: 1.0 }, hp: 8, receipts: 6, sound: 'wood', tag: 'table' });
    this.add(pro, { col: { type: 'box', w: 2.6, d: 1.0 }, hp: 8, receipts: 6, sound: 'wood', tag: 'table' });
    const lect = new THREE.Group(); lect.add(box(0.8, 1.15, 0.6, M.lacquer, 0, 0.575, 0)); const top = box(0.9, 0.06, 0.66, M.gold, 0, 1.2, 0); top.rotation.x = 0.25; lect.add(top); lect.position.set(0, 0, 3.4);
    this.add(lect, { col: { type: 'box', w: 0.8, d: 0.6 }, hp: 4, receipts: 4, sound: 'wood', tag: 'lectern' });
    // EXHIBIT A: a blown-up phone screenshot of blurred pink message bubbles, on an easel; topples on one strike
    const easel = new THREE.Group();
    for (const s of [-1, 1]) { const leg = box(0.05, 1.9, 0.05, M.gold, s * 0.45, 0.95, 0); leg.rotation.z = -s * 0.08; easel.add(leg); }
    const c = document.createElement('canvas'); c.width = 256; c.height = 384; const g2 = c.getContext('2d');
    g2.fillStyle = '#16121a'; g2.fillRect(0, 0, 256, 384); g2.filter = 'blur(3px)';
    for (let i = 0; i < 8; i++) { const r = i % 2; g2.fillStyle = r ? '#ff6fa8' : '#5a5a66'; const w = 80 + (i * 53) % 90; g2.beginPath(); g2.roundRect(r ? 256 - 24 - w : 24, 30 + i * 42, w, 30, 14); g2.fill(); }
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    const board = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.4, 0.04), [M.gold, M.gold, M.gold, M.gold, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.5, emissive: new THREE.Color(0xffffff), emissiveMap: tex, emissiveIntensity: 0.35 }), M.gold]);
    board.position.set(0, 1.35, 0.04); board.rotation.x = -0.1; easel.add(board); easel.position.set(-8.6, 0, -4.2); easel.rotation.y = 0.5;
    this.add(easel, { col: { type: 'box', w: 1.1, d: 0.4 }, hp: 1, receipts: 2, sound: 'wood', tag: 'easel', topple: true });
    // the evidence room's glass display cases, with YOU's old gifts inside
    const gifts = [
      (g) => { const b = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 0.22, 12), new THREE.MeshPhysicalMaterial({ color: 0xff9fc8, roughness: 0.05, transparent: true, opacity: 0.8 })); b.position.y = 1.15; g.add(b); },
      (g) => { const fur = new THREE.MeshStandardMaterial({ color: 0x8a5a36, roughness: 1 }); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 10), fur).translateY(1.18)); g.add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), fur).translateY(1.42)); },
      (g) => { const n = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 6, 30), M.gold); n.position.y = 1.2; n.rotation.x = 1.2; g.add(n); },
      (g) => { g.add(box(0.4, 0.1, 0.3, new THREE.MeshPhysicalMaterial({ color: 0xd61c3b, roughness: 0.3, clearcoat: 1 }), 0, 1.1, 0)); },
    ];
    this.cases = [];
    [[-6.5, -3.2], [6.5, -3.2], [-6.5, 4.0], [6.5, 4.0]].forEach(([x, z], i) => {
      const g = new THREE.Group();
      g.add(box(1.2, 0.95, 1.2, M.steel, 0, 0.475, 0)); g.add(box(1.22, 0.04, 1.22, M.brass, 0, 0.97, 0));
      const gl = box(1.16, 0.62, 1.16, glass, 0, 1.3, 0); gl.castShadow = false; g.add(gl); g.add(box(1.22, 0.04, 1.22, M.brass, 0, 1.62, 0));
      gifts[i](g); g.position.set(x, 0, z);
      const p = this.add(g, { col: { type: 'box', w: 1.2, d: 1.2 }, hp: 3, receipts: 6, sound: 'glass', tag: 'case', window: [57.733, 84.052], rise: 0.8 });
      this.cases.push(p);
    });
    // the ring-light phones on tripods at the corners (they switch on at 68.566 for the livestream)
    this.phones = [];
    [['NW', -9.6, -6.0], ['NE', 9.6, -6.0], ['SW', -9.6, 6.0], ['SE', 9.6, 6.0]].forEach(([name, x, z]) => {
      const g = new THREE.Group();
      for (let k = 0; k < 3; k++) { const a = k / 3 * Math.PI * 2; const leg = box(0.03, 1.5, 0.03, M.black, Math.sin(a) * 0.22, 0.72, Math.cos(a) * 0.22); leg.rotation.set(Math.cos(a) * 0.15, 0, -Math.sin(a) * 0.15); g.add(leg); }
      g.add(box(0.03, 0.4, 0.03, M.black, 0, 1.6, 0));
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.035, 8, 32), new THREE.MeshStandardMaterial({ color: 0x202020, emissive: new THREE.Color(0xffffff), emissiveIntensity: 0 }));
      ring.position.y = 1.85; g.add(ring);
      const phone = box(0.1, 0.19, 0.012, M.black, 0, 1.85, 0.02); g.add(phone);
      const dot = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff2030 })); dot.position.set(0.035, 1.93, 0.03); g.add(dot);
      g.position.set(x, 0, z); g.lookAt(0, 0, 0);
      const p = this.add(g, { col: { type: 'circle', r: 0.35 }, hp: 1, receipts: 99, sound: 'glass', tag: 'phone', window: [57.733, 84.052], rise: 0.8, topple: true });
      p.name = name; p.ring = ring; p.dot = dot;
      this.phones.push(p);
    });
    this.phonesOn = -1;
  }

  add(obj, o) {
    this.group.add(obj);
    const p = { obj, ...o, maxHp: o.hp, alive: true, home: { p: obj.position.clone(), r: obj.rotation.clone() }, hitAt: -9, fall: 0 };
    p.receiptsLeft = o.receipts ?? 99;
    this.list.push(p);
    return p;
  }
  // inside the window and not broken
  live(p, t) { if (!p.alive) return false; if (p.window && (t < p.window[0] || t > p.window[1])) return false; return true; }
  solid(p, t) { if (!this.live(p, t)) return false; if (p.window && p.rise && t < p.window[0] + p.rise * 0.6) return false; return true; }

  resolve(x, z, r) {
    const t = this.f.t;
    for (const p of this.list) {
      if (!this.solid(p, t)) continue;
      const o = p.obj, ox = o.position.x, oz = o.position.z;
      if (p.col.type === 'circle') {
        const dx = x - ox, dz = z - oz, d = Math.hypot(dx, dz), m = p.col.r + r;
        if (d < m && d > 1e-5) { x = ox + dx / d * m; z = oz + dz / d * m; }
      } else {
        const a = -o.rotation.y, ca = Math.cos(a), sa = Math.sin(a);
        let lx = (x - ox) * ca - (z - oz) * sa, lz = (x - ox) * sa + (z - oz) * ca;
        const hw = p.col.w / 2 + r, hd = p.col.d / 2 + r;
        if (Math.abs(lx) < hw && Math.abs(lz) < hd) {
          if (hw - Math.abs(lx) < hd - Math.abs(lz)) lx = Math.sign(lx || 1) * hw; else lz = Math.sign(lz || 1) * hd;
          x = ox + lx * ca + lz * sa; z = oz - lx * sa + lz * ca;
        }
      }
    }
    return { x, z };
  }
  // is (x, z) inside a solid piece? (receipts and cards stop on cover)
  blocks(x, z) {
    const t = this.f.t;
    for (const p of this.list) {
      if (!this.solid(p, t)) continue;
      const o = p.obj, dx = x - o.position.x, dz = z - o.position.z;
      if (p.col.type === 'circle') { if (Math.hypot(dx, dz) < p.col.r) return p; }
      else { const a = -o.rotation.y, lx = dx * Math.cos(a) - dz * Math.sin(a), lz = dx * Math.sin(a) + dz * Math.cos(a); if (Math.abs(lx) < p.col.w / 2 && Math.abs(lz) < p.col.d / 2) return p; }
    }
    return null;
  }
  strikeArc(x, z, ang, range, arc, s) {
    const t = this.f.t;
    for (const p of this.list) {
      if (!this.solid(p, t)) continue;
      const o = p.obj, dx = o.position.x - x, dz = o.position.z - z, d = Math.hypot(dx, dz);
      const reach = range + (p.col.r || Math.max(p.col.w, p.col.d) / 2);
      if (d > reach) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      this.hit(p, s && s.heavy ? 2 : 1, ang);
    }
  }
  receipt(p) { p.receiptsLeft--; this.f.fx.chips(p.obj.position.x, 0.9, p.obj.position.z, new THREE.Color(1.6, 1.5, 1.4), 4); if (p.receiptsLeft <= 0) this._break(p, 0); else this.f.ppg.snd.play(p.sound === 'glass' ? 'tink' : 'thwack', { pan: this.f.pan(p.obj.position.x), gain: 0.25, gate: 0.05 }); }
  hit(p, dmg, ang) {
    const f = this.f; if (!p.alive) return;
    p.hp -= dmg; p.hitAt = f.t;
    f.fx.chips(p.obj.position.x, 0.9, p.obj.position.z, p.sound === 'glass' ? new THREE.Color(2.2, 2.4, 2.6) : new THREE.Color(1.3, 0.25, 0.3), 8, ang);
    if (p.hp <= 0) this._break(p, ang);
    else f.ppg.snd.play(p.sound === 'glass' ? 'tink' : 'thwack', { pan: f.pan(p.obj.position.x), gain: 0.45 });
  }
  _break(p, ang) {
    const f = this.f; p.alive = false; p.brokeAt = f.t;
    const o = p.obj;
    f.fx.chips(o.position.x, 0.9, o.position.z, p.sound === 'glass' ? new THREE.Color(2.4, 2.6, 2.8) : new THREE.Color(1.4, 0.3, 0.35), 30);
    f.fx.glitter(o.position.x, 1.0, o.position.z, new THREE.Color(3, 2.2, 0.8), 12, 0.8);
    f.cam.shake(0.35, 0.1);
    f.ppg.snd.play(p.sound === 'glass' ? 'glass' : 'thwack', { pan: f.pan(o.position.x), gain: 0.7 });
    if (p.tag === 'phone') f.ppg.snd.play('glitch', { pan: f.pan(o.position.x), gain: 0.3, rate: 1.5 });
    f._good && f._good(60);
    if (!p.topple) o.visible = false;
  }
  // rewinds: the snapshot of what was broken at the checkpoint
  snapshot() { return this.list.map((p) => !p.alive); }
  restore(broken) {
    this.list.forEach((p, i) => {
      p.alive = !(broken && broken[i]); p.hp = p.maxHp; p.receiptsLeft = p.receipts ?? 99; p.brokeAt = p.alive ? undefined : -99;
      p.obj.position.copy(p.home.p); p.obj.rotation.copy(p.home.r); p.obj.visible = p.alive || !!p.topple;
    });
  }
  update(dt, t) {
    for (const p of this.list) {
      const o = p.obj;
      // in and out of the floor traps
      if (p.window) {
        const inK = clamp01((t - p.window[0]) / (p.rise || 0.6)), outK = clamp01((t - p.window[1]) / 0.5);
        const k = t < p.window[0] ? 0 : t < p.window[1] ? ease(inK) : 1 - ease(outK);
        o.visible = k > 0.002 && (p.alive || !!p.topple);
        o.position.y = p.home.p.y - (1 - k) * 2.2;
      }
      // toppled: a phone or the easel falls over on its face
      if (p.topple && !p.alive) { const k = clamp01((t - (p.brokeAt ?? -99)) / 0.35); o.rotation.x = p.home.r.x + (Math.PI / 2 - 0.05) * (k * k); }
      // a struck piece jolts
      const j = Math.exp(-(t - p.hitAt) * 30) * 0.05; o.position.x = p.home.p.x + (p.alive ? Math.sin(t * 90) * j : 0);
    }
    // the phones' ring lights
    for (const p of this.phones) {
      const on = t >= 68.566 && t < 84.052 && p.alive;
      p.ring.material.emissiveIntensity += ((on ? 3.2 : 0) - p.ring.material.emissiveIntensity) * 0.3;
      p.dot.visible = on && Math.floor(t * 2) % 2 === 0;
      const fl = p.flashAt !== undefined ? Math.exp(-(t - p.flashAt) * 10) : 0;
      if (fl > 0.01) p.ring.material.emissiveIntensity = 3.2 + fl * 30;
    }
  }
  dispose() { this.f.scene.remove(this.group); }
}

// ------------------------------------------------------------------------------------------ the evidence room's flats
// steel shelving with brass label plates, cardboard boxes, bagged items and lockers flies down in front of the side
// walls (57.733 over a bar) and back up at 84.052; a cork board with red string on the left.
export class Shelving {
  constructor(f) {
    this.f = f; mats();
    this.group = new THREE.Group(); this.group.name = 'ppg:shelving'; f.scene.add(this.group);
    const bag = new THREE.MeshPhysicalMaterial({ color: 0xeef4f6, roughness: 0.15, transparent: true, opacity: 0.55, clearcoat: 1 });
    const label = new THREE.MeshStandardMaterial({ color: 0xb88a3e, metalness: 0.9, roughness: 0.35 });
    this.sides = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group();
      for (let i = 0; i < 6; i++) {
        const z = -5.2 + i * 2.0;
        const unit = new THREE.Group();
        unit.add(box(0.5, 3.6, 0.06, M.steel, 0, 1.8, -0.95)); unit.add(box(0.5, 3.6, 0.06, M.steel, 0, 1.8, 0.95));
        for (let k = 0; k < 5; k++) {
          const y = 0.2 + k * 0.82; unit.add(box(0.5, 0.04, 1.96, M.steel, 0, y, 0)); unit.add(box(0.02, 0.06, 0.3, label, -s * 0.26, y + 0.06, 0));
          for (let j = 0; j < 3; j++) { const zz = -0.6 + j * 0.6 + ((i + k + j) % 3) * 0.05; const kind = (i * 7 + k * 3 + j) % 4; if (kind === 3) continue; unit.add(box(0.42, 0.3 + (kind === 1 ? 0.12 : 0), 0.45, kind === 2 ? bag : M.cardboard, 0, y + 0.18 + (kind === 1 ? 0.06 : 0), zz)); }
        }
        unit.position.set(0, 0, z); g.add(unit);
      }
      g.position.set(s * 12.6, 0, 0);
      this.group.add(g); this.sides.push(g);
    }
    // the cork board: photos of her, one of YOU, red string
    const c = document.createElement('canvas'); c.width = 512; c.height = 320; const x = c.getContext('2d');
    x.fillStyle = '#9a6b3e'; x.fillRect(0, 0, 512, 320);
    const pins = [];
    for (let i = 0; i < 7; i++) { const px = 40 + (i * 71) % 420, py = 30 + ((i * 113) % 220); x.fillStyle = '#f4f0ea'; x.fillRect(px, py, 70, 84); x.fillStyle = i === 3 ? '#c87a4a' : '#e8a0b8'; x.fillRect(px + 6, py + 6, 58, 58); pins.push([px + 35, py + 4]); }
    x.strokeStyle = '#d0102a'; x.lineWidth = 3; x.beginPath(); pins.forEach(([a, b], i) => (i ? x.lineTo(a, b) : x.moveTo(a, b))); x.lineTo(pins[3][0], pins[3][1]); x.stroke();
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const cork = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.6), new THREE.MeshStandardMaterial({ map: t, roughness: 0.9 }));
    cork.position.set(0.35, 2.9, 3.2); cork.rotation.y = Math.PI / 2; this.sides[0].add(cork);
  }
  update(t) {
    const inK = clamp01((t - 57.733) / 1.4), outK = clamp01((t - 84.052) / 0.8);
    const k = t < 57.733 ? 0 : t < 84.052 ? ease(inK) : 1 - ease(outK);
    for (const g of this.sides) { g.visible = k > 0.002; g.position.y = (1 - k) * 9; }
  }
  dispose() { this.f.scene.remove(this.group); }
}
