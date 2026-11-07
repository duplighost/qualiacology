// The room's loose things: a few porcelain ornaments on the floor of every room, glazed in its colours. Both of you
// use them. Strike one and it flies at her. She kicks one at you when it's at her feet (pink: block it, or send it
// back). Her attacks landing on them smash them, and so does her body thrown into them. A few more are put out at
// each new section, and a rewind puts the room back.
// A track can say: setPieces: false (none), or { count, palette: [hex, ...], kinds: [...], kicks: false, scale }.
import * as THREE from 'three';
import { inShape } from './choreo.js';

const KINDS = ['vase', 'heart', 'bust', 'orb', 'candle'];
const GOLD = new THREE.MeshStandardMaterial({ color: 0xe0b04a, metalness: 1, roughness: 0.25 });
const _mats = new Map();
function glaze(hex) {
  let m = _mats.get(hex);
  if (!m) { m = new THREE.MeshPhysicalMaterial({ color: hex, roughness: 0.2, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.06, emissive: 0x000000 }); _mats.set(hex, m); }
  return m;
}
function heartShape(s) {
  const h = new THREE.Shape();
  h.moveTo(0, -0.12 * s); h.bezierCurveTo(0.2 * s, 0.02 * s, 0.13 * s, 0.17 * s, 0, 0.09 * s); h.bezierCurveTo(-0.13 * s, 0.17 * s, -0.2 * s, 0.02 * s, 0, -0.12 * s);
  return h;
}
// one ornament, about half a metre tall, resting on y = 0
function makePiece(kind, hex, hex2) {
  const g = new THREE.Group(), body = glaze(hex), alt = glaze(hex2 ?? hex);
  const add = (geo, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(geo, m); o.position.set(x, y, z); o.castShadow = true; o.receiveShadow = false; g.add(o); return o; };
  if (kind === 'vase') {
    const pts = [[0, 0], [0.12, 0], [0.14, 0.03], [0.2, 0.19], [0.17, 0.34], [0.085, 0.45], [0.08, 0.5], [0.12, 0.54], [0.11, 0.55]].map(([x, y]) => new THREE.Vector2(x, y));
    add(new THREE.LatheGeometry(pts, 28), body);
    add(new THREE.TorusGeometry(0.083, 0.011, 8, 28), GOLD, 0, 0.47).rotation.x = Math.PI / 2;
    add(new THREE.TorusGeometry(0.2, 0.008, 8, 32), GOLD, 0, 0.19).rotation.x = Math.PI / 2;
  } else if (kind === 'heart') {
    const geo = new THREE.ExtrudeGeometry(heartShape(1.7), { depth: 0.1, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 4, curveSegments: 16 });
    geo.translate(0, 0, -0.05);
    add(geo, body, 0, 0.32, 0);
    add(new THREE.CylinderGeometry(0.1, 0.13, 0.08, 24), GOLD, 0, 0.04, 0);
    add(new THREE.CylinderGeometry(0.025, 0.03, 0.12, 12), GOLD, 0, 0.12, 0);
  } else if (kind === 'bust') {
    add(new THREE.CylinderGeometry(0.13, 0.15, 0.12, 24), alt, 0, 0.06);
    add(new THREE.TorusGeometry(0.135, 0.01, 8, 28), GOLD, 0, 0.12).rotation.x = Math.PI / 2;
    const sh = add(new THREE.SphereGeometry(0.16, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), body, 0, 0.13); sh.scale.set(1.15, 0.55, 0.7);
    add(new THREE.CylinderGeometry(0.045, 0.055, 0.12, 16), body, 0, 0.26);
    const hd = add(new THREE.SphereGeometry(0.095, 24, 16), body, 0, 0.4); hd.scale.set(0.92, 1.1, 1);
    const bun = add(new THREE.SphereGeometry(0.06, 16, 10), body, 0, 0.48, -0.06);
    bun.scale.set(1, 0.9, 1);
  } else if (kind === 'orb') {
    add(new THREE.CylinderGeometry(0.07, 0.11, 0.06, 20), GOLD, 0, 0.03);
    add(new THREE.SphereGeometry(0.19, 28, 18), body, 0, 0.24);
    add(new THREE.TorusGeometry(0.19, 0.012, 8, 36), GOLD, 0, 0.24);
  } else {   // candle: a pillar, a gold collar
    add(new THREE.CylinderGeometry(0.1, 0.11, 0.42, 24), body, 0, 0.21);
    add(new THREE.CylinderGeometry(0.13, 0.14, 0.05, 24), GOLD, 0, 0.025);
    add(new THREE.TorusGeometry(0.1, 0.012, 8, 24), GOLD, 0, 0.42).rotation.x = Math.PI / 2;
    add(new THREE.CylinderGeometry(0.006, 0.006, 0.05, 6), new THREE.MeshStandardMaterial({ color: 0x222222 }), 0, 0.445);
  }
  return g;
}

const TAU = Math.PI * 2;
// each room's glazes (and which ornaments suit it)
const ROOMS = {
  'sexy-trauma-costume': { palette: [0xff6a13, 0x7a3cff, 0xf4efe6, 0x231a2e], kinds: ['bust', 'heart', 'vase', 'orb'] },
  'your-car-is-at-the-bottom-of-the-lake': { palette: [0xffb3c7, 0x3fb8a8, 0xf7f2ea], kinds: ['vase', 'orb', 'heart'] },
  'pretty-until-proven-guilty': { palette: [0xb3122e, 0xf4efe6, 0x2a1c1e], kinds: ['bust', 'orb', 'vase'] },
  'makeup-sex-at-your-funeral': { palette: [0x18141a, 0xf4f0ea, 0x7c5a9e], kinds: ['vase', 'candle', 'bust'] },
  'kiss-me-like-a-car-crash': { palette: [0xd9d9df, 0xe8352a, 0xff8a1a], kinds: ['orb', 'heart', 'candle'] },
  'i-fucked-your-dad': { palette: [0xf2c94c, 0xff6f91, 0x5fb36b, 0xf4efe6], kinds: ['heart', 'orb', 'vase'] },
  'rent-free': { palette: [0xf6b6d0, 0xb79ad6, 0xf4efe6], kinds: ['vase', 'candle', 'heart', 'bust'] },
  'reverse-psychology-degree': { palette: [0x7a4a2e, 0xf4efe6, 0x2f5d50], kinds: ['bust', 'vase', 'orb'] },
  'ptsdream-girl': { palette: [0xff5f9e, 0x8ad4ff, 0xf4efe6], kinds: ['heart', 'orb', 'candle'] },
  'try-me-free': { palette: [0xffd23f, 0x3fc1ff, 0xff4f8b], kinds: ['orb', 'heart', 'vase'] },
};

export class SetPieces {
  constructor(f) {
    this.f = f;
    const c = f.track.setPieces;
    this.on = c !== false;
    this.cfg = { count: 6, kinds: KINDS, palette: [0xf4efe6, 0xff5f9e, 0x8a6cff], kicks: true, scale: 1.6, ...(ROOMS[f.track.id] || {}), ...(c && typeof c === 'object' ? c : {}) };
    this.list = [];
    this.group = new THREE.Group(); this.group.name = 'set-pieces'; f.scene.add(this.group);
    // one of each, hidden, so their glazes compile with everything else at load
    if (this.on) { this.warm = new THREE.Group(); for (const k of this.cfg.kinds) { const g = makePiece(k, this.cfg.palette[0], this.cfg.palette[1]); g.visible = false; this.warm.add(g); } this.group.add(this.warm); }
    this.kickCool = 7; this.seed = 7;
    this.stats = { launched: 0, hitHer: 0, kicked: 0, broken: 0 };
  }
  rand() { this.seed = (this.seed * 16807) % 2147483647; return this.seed / 2147483647; }

  get alive() { return this.list.filter((p) => p.state !== 'gone'); }

  // the room as the song has it at a section's start: fill up to count, somewhere you can stand, clear of you both
  fill(n = this.cfg.count) {
    if (!this.on) return;
    let tries = 0;
    while (this.alive.length < n && tries++ < 12) this._place();
  }
  _place() {
    const f = this.f, b = f.bounds, A = f.arena, pl = f.player, boss = f.boss;
    if (!b) return;
    for (let k = 0; k < 40; k++) {
      const x = b.minX + 1.4 + this.rand() * (b.maxX - b.minX - 2.8), z = b.minZ + 1.4 + this.rand() * (b.maxZ - b.minZ - 2.8);
      if (A && A.resolve) { const r = A.resolve(x, z, 0.45); if (Math.hypot(r.x - x, r.z - z) > 0.01) continue; }
      if (pl && Math.hypot(pl.x - x, pl.z - z) < 3) continue;
      if (boss && Math.hypot(boss.x - x, boss.z - z) < 2.4) continue;
      if (this.alive.some((p) => Math.hypot(p.x - x, p.z - z) < 2.2)) continue;
      const kinds = this.cfg.kinds, pal = this.cfg.palette;
      const kind = kinds[Math.floor(this.rand() * kinds.length)], hex = pal[Math.floor(this.rand() * pal.length)], hex2 = pal[Math.floor(this.rand() * pal.length)];
      const g = makePiece(kind, hex, hex2); g.scale.setScalar(this.cfg.scale * (0.9 + this.rand() * 0.25));
      g.position.set(x, 0, z); g.rotation.y = this.rand() * TAU;
      this.group.add(g);
      this.list.push({ g, kind, color: new THREE.Color(hex), x, z, y: 0, vx: 0, vz: 0, spin: 0, state: 'rest', t: 0 });
      return;
    }
  }
  reset() { for (const p of this.list) this.group.remove(p.g); this.list.length = 0; this.kickCool = 6; this.fill(); }

  // ---------- YOU ----------
  // your strike's arc: anything of the room's in it flies at her (or on, the way you swung, when she isn't there)
  strikeArc(x, z, ang, range, arc, s) {
    if (!this.on) return;
    const f = this.f, b = f.boss;
    for (const p of this.list) {
      if (p.state !== 'rest') continue;
      const dx = p.x - x, dz = p.z - z, d = Math.hypot(dx, dz);
      if (d > range + 0.4) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.8) continue;
      const toHer = b && b.targetable && Math.hypot(b.x - p.x, b.z - p.z) < 15;
      p.state = 'fly'; p.t = 0; p.owner = 'you'; p.on = !!(s && (s.on || s.finisher || s.riposte)); this.stats.launched++;
      p.from = new THREE.Vector3(p.x, 0.3, p.z);
      p.dir = toHer ? null : ang; p.spin = 14;
      p.trail = f.fx.trail(() => p.g.position, { w: 0.18, color: new THREE.Color(3.2, 1.95, 0.5), len: 12, life: 0.18 });
      f.fx.sparks(p.x, 0.5, p.z, new THREE.Color(3, 2.2, 0.8), 10, ang);
      f.sfx.hitProp && f.sfx.hitProp(f.pan(p.x));
    }
  }

  // ---------- her ----------
  // one of her attacks landed here: whatever's in it is thrown clear and cracks (cracked already, it shatters)
  areaHit(sh) {
    if (!this.on) return;
    for (const p of this.list) {
      if (p.state !== 'rest' || !inShape(sh, p.x, p.z, 0.2)) continue;
      if (p.cracked) { this._break(p, 0.6); continue; }
      p.cracked = true;
      const a = Math.atan2(p.x - sh.x, p.z - sh.z) + (this.rand() - 0.5) * 0.8;
      p.vx = Math.sin(a) * 4.5; p.vz = Math.cos(a) * 4.5; p.spin = 9;
      this.f.fx.chips(p.x, 0.4, p.z, p.color.clone().multiplyScalar(1.5), 6);
      for (const m of p.g.children) if (m.material && m.material.color && m.material !== GOLD) { m.material = m.material.clone(); m.material.roughness = 0.45; m.material.color.multiplyScalar(0.82); }
    }
  }
  // her body, thrown into the room: whatever she hits shatters (and hurts her: the fight's slam already did)
  slam(x, z, r = 1.5) { if (!this.on) return 0; let n = 0; for (const p of this.list) if (p.state === 'rest' && Math.hypot(p.x - x, p.z - z) < r) { this._break(p, 1); n++; } return n; }

  // at her feet and you're across the room: she kicks it at you, on the beat
  _kickCheck() {
    const f = this.f, b = f.boss, pl = f.player, now = f.t;
    if (!this.cfg.kicks || this.kickCool > 0 || f.state !== 'play' || f.suppress || f.harmless || f.spotUntil > 0) return;
    if (b.state !== 'perform' || !b.targetable || b.busy || b.move || b.guard || b.intangible || b.hp <= 0) return;
    if (f.tele.list.some((g) => !g.dead && g.kind !== 'gold' && g.end > now - 0.05 && g.end < now + 1.4)) return;
    const p = this.list.find((q) => q.state === 'rest' && Math.hypot(q.x - b.x, q.z - b.z) < 3.2 && Math.hypot(q.x - pl.x, q.z - pl.z) > 3.0 && Math.hypot(q.x - pl.x, q.z - pl.z) < 13);
    if (!p) return;
    this.kickCool = 6 + this.rand() * 4;
    const bm = f.bm;
    let t1 = bm.timeOf(Math.ceil(bm.beatAt(now + 0.45)));
    if (t1 - now > 0.9) t1 = bm.timeOf(Math.ceil(bm.beatAt(now + 0.45) * 2) / 2);
    b.faceNow(p.x, p.z);
    b.strikeAt('Melee_Hook', t1, { from: 0.0, to: 0.95, hit: 0.5 });
    p.state = 'tell'; p.t = 0; p.at = t1;
    f.cue('pink', p);
    f.fx.sparks(p.x, 0.5, p.z, new THREE.Color(3.4, 0.5, 1.5), 8);
    // it goes on the beat, at you
    f.at(t1, () => {
      if (p.state !== 'tell') return;
      if (f.suppress || f.harmless || f.state !== 'play') { p.state = 'rest'; return; }
      const ang = Math.atan2(pl.x - p.x, pl.z - p.z);
      const q = f.proj.spawn({ x: p.x + Math.sin(ang) * 0.3, z: p.z + Math.cos(ang) * 0.3, y: 0.8, angle: ang, speed: 12, kind: 'pink', shape: 'orb', size: 0.42, life: 1.6, spin: 0 });
      if (!q) { p.state = 'rest'; return; }
      p.state = 'kicked'; p.q = q; p.t = 0; p.spin = 10; this.stats.kicked++;
      f.sfx.fire && f.sfx.fire('orb', f.pan(p.x), 'pink');
      f.fx.dust(p.x, p.z, 6);
    });
  }

  _break(p, power = 1) {
    if (p.state === 'gone') return;
    const f = this.f, o = p.g.position;
    p.state = 'gone'; this.group.remove(p.g); this.stats.broken++;
    if (p.trail) { p.trail.live = false; p.trail = null; }
    const c = p.color.clone().multiplyScalar(1.6);
    f.fx.chips(o.x, Math.max(0.3, o.y + 0.3), o.z, c, Math.round(14 + 14 * power));
    f.fx.chips(o.x, Math.max(0.3, o.y + 0.3), o.z, new THREE.Color(2.4, 1.7, 0.6), 5);
    f.fx.glitter(o.x, Math.max(0.4, o.y + 0.4), o.z, new THREE.Color(3, 2.2, 0.8), 8, 0.4);
    f.cam.shake(0.25 + 0.2 * power, 0.1);
    f.sfx.breakProp && f.sfx.breakProp(f.pan(o.x));
  }

  update(dt) {
    if (!this.on) return;
    const f = this.f, b = f.boss, pl = f.player;
    if (this.kickCool > 0) this.kickCool -= dt;
    this.beat = f.bm ? f.bm.pulse(f.t, 7) : 0;
    this._kickCheck();
    for (const p of this.list) {
      if (p.state === 'gone') continue;
      p.t += dt;
      const g = p.g;
      if (p.state === 'rest' || p.state === 'tell') {
        // YOU walking into it nudges it along
        const dx = p.x - pl.x, dz = p.z - pl.z, d = Math.hypot(dx, dz);
        if (d < 0.6 && d > 1e-3 && pl.state !== 'dead') { const sp = Math.max(2.5, Math.hypot(pl.vx, pl.vz) * 0.9); p.vx = dx / d * sp; p.vz = dz / d * sp; p.spin = 5; }
        if (p.vx || p.vz) {
          let nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
          if (f.arena && f.arena.resolve) { const r = f.arena.resolve(nx, nz, 0.35); nx = r.x; nz = r.z; }
          const bd = f.bounds; if (bd) { nx = Math.max(bd.minX + 0.6, Math.min(bd.maxX - 0.6, nx)); nz = Math.max(bd.minZ + 0.6, Math.min(bd.maxZ - 0.6, nz)); }
          p.x = nx; p.z = nz;
          const fr = Math.exp(-dt * 5); p.vx *= fr; p.vz *= fr;
          if (Math.hypot(p.vx, p.vz) < 0.05) { p.vx = p.vz = 0; }
        }
        p.spin *= Math.exp(-dt * 4);
        g.rotation.y += p.spin * dt;
        const wob = p.state === 'tell' ? Math.sin(p.t * 40) * 0.12 : (p.vx || p.vz ? Math.sin(p.t * 18) * 0.15 : 0);
        // they dance to it: a hop on every beat, higher the hotter your combo
        const hop = this.beat * this.beat * (0.06 + 0.05 * (f.heat || 0)), sq = this.beat * (0.05 + 0.02 * (f.heat || 0));
        g.position.set(p.x, hop, p.z); g.rotation.z = wob;
        const s0 = g.userData.s0 ?? (g.userData.s0 = g.scale.x);
        g.scale.set(s0 * (1 + sq * 0.5), s0 * (1 - sq), s0 * (1 + sq * 0.5));
      } else if (p.state === 'fly') {
        // yours, toward her: a short hop and in (she's gone: it carries on the way it was going)
        const sp = 17, k = Math.min(1, p.t / 0.6);
        if (!p.dir && !(b && b.targetable)) { p.dir = Math.atan2(p.x - p.from.x, p.z - p.from.z) || 0; p.from.set(p.x, 0.3, p.z); }
        let tx, tz;
        if (!p.dir && b && b.targetable) { tx = b.x; tz = b.z; } else { const a = p.dir ?? 0; tx = p.from.x + Math.sin(a) * 7; tz = p.from.z + Math.cos(a) * 7; }
        const dx = tx - p.x, dz = tz - p.z, d = Math.hypot(dx, dz);
        if (d > 1e-3) { const st = Math.min(d, sp * dt); p.x += dx / d * st; p.z += dz / d * st; }
        p.y = 0.35 + 0.9 * Math.sin(Math.min(1, k) * Math.PI);
        g.position.set(p.x, p.y, p.z); g.rotation.x += dt * 11; g.rotation.y += dt * 7;
        if (!p.dir && b && b.targetable && Math.hypot(b.x - p.x, b.z - p.z) < b.radius + 0.45) {
          const res = b.takeHit({ dmg: p.on ? 30 : 20, kind: 'prop', heavy: true, x: p.x, z: p.z, onBeat: p.on });
          if (res && res.landed) {
            this.stats.hitHer++;
            f.fx.sparks(p.x, 1.2, p.z, new THREE.Color(3.2, 2.0, 0.55), 22, Math.atan2(dx, dz));
            f.sfx.hit && f.sfx.hit({ heavy: true, onBeat: p.on, pan: f.pan(p.x) });
            f._good && f._good(80);
            b.fig && b.fig.hitAt && b.fig.hitAt(new THREE.Vector3(p.x, 1.2, p.z), new THREE.Vector3(dx, 0, dz).normalize(), { power: 1.4 });
          }
          this._break(p, 1);
        } else if (p.t > 1.2 || (p.dir !== null && p.dir !== undefined && d < 0.3)) {
          // spent: it lands where it is and stays (one more go)
          if (p.trail) { p.trail.live = false; p.trail = null; }
          if (p.t > 2) this._break(p, 0.5); else { p.state = 'rest'; p.y = 0; p.t = 0; p.vx = p.vz = 0; f.fx.dust(p.x, p.z, 5); }
        }
      } else if (p.state === 'kicked') {
        // hers, in the air: it rides its shot (caught, the shot turns gold and so does it); when the shot ends, it breaks
        const q = p.q;
        if (q && !q.dead) { p.x = q.x; p.z = q.z; g.position.set(q.x, q.y ?? 0.8, q.z); g.rotation.x += dt * 12; g.rotation.y += dt * 8; }
        else this._break(p, 0.8);
      }
    }
  }

  dispose() { this.f.scene.remove(this.group); for (const p of this.list) if (p.trail) p.trail.live = false; this.list.length = 0; }
}
