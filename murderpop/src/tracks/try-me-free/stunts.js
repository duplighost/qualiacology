// The commercial's set pieces that attack: each draws its shape on the floor, lands on its word, and is a thing
// in the world (a swipe bar, a chyron, a toy ambulance, alphabet cereal, the ring light, mail-in parcels, a pour,
// a wave of milk, a toy key, a bomb, a tile floor that pops, sugar frost). Mixed into the set (set.js).
import * as THREE from 'three';
import * as P from './paint.js';
import { LAYER } from '../../game/arena.js';


const clamp01 = (k) => Math.max(0, Math.min(1, k));
const clampX = (x) => Math.max(-10.6, Math.min(10.4, x));
const clampZ = (z) => Math.max(-6.2, Math.min(6.5, z));
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const R = 0.42;   // YOU's radius
const near = (pl, x, z, r) => Math.hypot(pl.x - x, pl.z - z) < r;

function live(f, o) {
  const g = f.tele.add({ shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h, param: o.param, kind: o.kind || 'white', start: f.t, end: f.t + 1, follow: o.follow });
  if (g.dead) return g;
  let landed = null;
  const F = () => Math.max(1e-3, Math.min(1, o.fill(f.t)));
  Object.defineProperty(g, 'start', { get: () => (landed !== null ? landed - 0.3 : f.t - 0.1), set() {} });
  Object.defineProperty(g, 'end', { get: () => (landed !== null ? landed : f.t - 0.1 + 0.1 / F()), set() {} });
  g.land = (t) => { landed = t; };
  return g;
}
const lac = (c, r = 0.15) => new THREE.MeshPhysicalMaterial({ color: c, roughness: r, clearcoat: 1, clearcoatRoughness: 0.04 });

export const STUNTS = {
  // a mover: tick(t, dt) every frame from now until `until` (rewinds drop it; with `quash`, the spotlight does too)
  _move(until, tick, end, quash = false) { const m = { until, tick, end, quash }; this.movers.push(m); return m; },
  _hurt(f, kind = 'white', dmg = 1) { const pl = f.player; return f.resolveArea({ shape: 'circle', x: pl.x, z: pl.z, w: 0.6, h: 0.6, angle: 0, param: 0 }, { kind, damage: dmg }); },

  // SWIPE UP: a white bar the full width rises at the front edge; on "up" it sweeps to the back; one gap
  swipe(f, t0, tUp, tEnd) {
    const pl = f.player, gap = Math.max(-9, Math.min(9, -pl.x)), z0 = 6.4, z1 = -6.7;
    const zb = (t) => (t < tUp ? z0 : z0 + (z1 - z0) * clamp01((t - tUp) / (tEnd - tUp)));
    const fill = (t) => (t < tUp ? (t - t0) / (tUp - t0) : 1);
    const segs = [[-11.4, gap - 1.2], [gap + 1.2, 11.0]].filter(([a, b]) => b - a > 0.2);
    const teles = segs.map(([a, b]) => live(f, { shape: 'rect', x: (a + b) / 2, z: z0 - 0.6, angle: 0, w: (b - a) / 2, h: 1.2, kind: 'white', fill, follow: () => ({ x: (a + b) / 2, z: zb(f.t) - 0.6 }) }));
    if (teles.every((g) => g.dead)) return;   // sent in the spotlight: it never comes
    f.cue('white', { x: 0 });
    if (!this.swipeM) { this.swipeM = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, clearcoat: 1, emissive: 0xbfd8ff, emissiveIntensity: 0.6, transparent: true, opacity: 0.85 }); }
    const bars = segs.map(([a, b]) => { const m = new THREE.Mesh(new THREE.BoxGeometry(b - a, 0.3, 1.2), this.swipeM); m.position.set((a + b) / 2, -0.4, z0); this.group.add(m); return m; });
    let hit = false;
    this._move(tEnd + 0.15, (t) => {
      const z = zb(t), rise = clamp01((t - t0) / (tUp - t0));
      for (const m of bars) m.position.set(m.position.x, -0.4 + 0.6 * rise, z);
      if (t >= tUp && t <= tEnd && !hit && Math.abs(pl.z - z) < 0.6 + R && Math.abs(pl.x - gap) > 1.2 - 0.25) { hit = true; this._hurt(f); }
      if (t > tEnd) for (const g of teles) g.dead = true;
    }, () => { for (const m of bars) { this.group.remove(m); m.geometry.dispose(); } for (const g of teles) g.dead = true; }, true);
    const born = f.t;
    f.at(tUp, () => { if (!this.quashed(born)) this.sound.play('servo', 0, { rate: 4, gain: 1.2 }); });
  },

  // CAPTIONED: a glossy blue chyron hangs over YOU's lane, locks, and slams; it shatters into plastic
  caption(f, tLock, t1) {
    if (f.suppress) return;   // sent in the spotlight: it never comes
    const pl = f.player; let lz = clampZ(pl.z);
    f.pat.area(f, { shape: 'rect', x: -11.6, z: lz, angle: Math.PI / 2, w: 1.0, h: 23.2, kind: 'white', start: f.t, end: t1, follow: () => { if (f.t < tLock) lz = clampZ(pl.z); return { x: -11.6, z: lz }; },
      onImpact: () => { this.sound.play('cardboard', 0, { rate: 0.8, gain: 1.2 }); this.sound.play('clack', 0, { rate: 0.7 }); f.cam.shake(0.4, 0.14); for (let x = -10; x <= 10; x += 2.5) f.fx.chips(x, 0.3, lz, new THREE.Color(0.6, 1.0, 3.0), 8); } });
    if (!this.chyronTex) this.chyronTex = P.chyron();
    const m = new THREE.Mesh(new THREE.PlaneGeometry(21, 1.7), new THREE.MeshBasicMaterial({ map: this.chyronTex, transparent: true, side: THREE.DoubleSide, color: new THREE.Color(1.4, 1.4, 1.4) }));
    m.rotation.x = -Math.PI / 2 + 0.25; this.group.add(m);
    const t0 = f.t;
    this._move(t1 + 0.02, (t) => { const k = t < t1 - 0.14 ? 0 : clamp01((t - (t1 - 0.14)) / 0.14); m.position.set(0, 3.4 - 3.2 * k * k, lz); m.material.opacity = clamp01((t - t0) / 0.3); }, () => { this.group.remove(m); m.geometry.dispose(); }, true);
  },

  // the toy ambulance: rolls in, parks at the front, its beacon flashes the halves, drives off
  ambulance(f, tIn, tOut) {
    const g = this._toyCar('ambulance');
    this._move(tOut + 1.2, (t) => {
      g.visible = true;
      const x = t < tIn + 0.69 ? 14 - 14 * clamp01((t - tIn) / 0.69) : t > tOut ? -16 * clamp01((t - tOut) / 1.0) : 0;
      g.position.set(x, 0, 6.4); g.rotation.y = -Math.PI / 2;
      const b = g.userData.beacon; if (b) b.material.color.setRGB(Math.sin(t * 22) > 0 ? 4 : 0.3, 0.3, Math.sin(t * 22) > 0 ? 0.3 : 3);
    }, () => { g.visible = false; });
    this.sound.play('pour', 8, { rate: 2.2, gain: 0.35 });
  },
  beacon(f, s) { f.fx.flash(s < 0 ? new THREE.Color(0.4, 0.05, 0.05) : new THREE.Color(0.05, 0.08, 0.4), 0.4); },

  // R-I-P, I-G, F-M-L, O-M-G: toasted letters pop out of the milk and fly left to right in their lanes
  alphabet(f, words) {
    const pl = f.player, beat = f.beat;
    for (const w of words) {
      let lz = clampZ(pl.z);
      const first = w.letters[0][1], last = w.letters[w.letters.length - 1][1];
      const tShow = w.lock - 2 * beat;
      let g = null;
      f.at(tShow, () => {
        g = live(f, { shape: 'rect', x: -11.4, z: lz, angle: Math.PI / 2, w: 0.7, h: 22.4, kind: 'white', fill: (t) => (t < first ? (t - tShow) / (first - tShow) : 1), follow: () => { if (f.t < w.lock) lz = clampZ(pl.z); return { x: -11.4, z: lz }; } });
        if (g.dead) return;
        f.cue('white', { x: -10 });
        f.at(last + 2.2, () => { g.dead = true; });
      });
      // a word whose lane the spotlight took back sends no more letters down it
      for (const [ch, tl] of w.letters) f.at(tl, () => { if (g && !g.dead) this._letter(f, ch, lz, ch === 'O' && w.letters[0][0] === 'O'); });
    }
  },
  _letter(f, ch, z, pink) {
    const x0 = -25.5 + Math.sqrt(Math.max(0, 15.5 * 15.5 - z * z)) + 0.5;
    const p = f.proj.spawn({ x: x0, z, y: 0.9, angle: Math.PI / 2, speed: 11, kind: pink ? 'pink' : 'white', shape: pink ? 'ring' : 'card', size: pink ? 0.6 : 0.16, radius: 0.45, life: 3.2, spin: pink ? 6 : 0 });
    this.sound.play('bubble', x0, { rate: 0.5, gain: 1.2 });
    if (!p || pink) return;
    if (!this.letterTex) this.letterTex = {};
    if (!this.letterTex[ch]) this.letterTex[ch] = P.letter(ch);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.letterTex[ch], color: new THREE.Color(1.3, 1.3, 1.3) }));
    s.scale.set(1.1, 1.1, 1); this.group.add(s);
    this._move(f.t + 3.3, () => { s.visible = !p.dead && p.age < p.life; s.position.set(p.x, 1.0 + Math.sin(p.age * 9) * 0.08, p.z); s.material.rotation = Math.sin(p.age * 7) * 0.2; }, () => { this.group.remove(s); s.material.dispose(); });
  },

  // THE RING LIGHT: thrown down a lane at YOU, out to the far end, hangs a beat, comes back to her head
  ringLight(f, tThrow, tFar, tBack) {
    const b = f.boss, pl = f.player, pr = this.prize;
    let ang = toward(b, pl);
    const useHalo = !pr.props.halo.userData.broken;
    const g = live(f, { shape: 'rect', x: b.x, z: b.z, angle: ang, w: 1.2, h: 14, kind: 'white', fill: (t) => (t < tThrow ? (t - (tThrow - f.beat)) / f.beat : 1), follow: () => { if (f.t < tThrow) ang = toward(b, pl); return { x: b.x, z: b.z, angle: ang }; } });
    if (g.dead) return;   // sent in the spotlight: it never comes
    f.cue('white', b);
    f.at(tThrow, () => {
      if (g.dead) return;   // the spotlight took it back before she threw
      const sx = b.x, sz = b.z, a = ang, ex = sx + Math.sin(a) * 13.2, ez = sz + Math.cos(a) * 13.2;
      b.perform('Spell_Simple_Shoot', { duration: 0.45 });
      const ring = useHalo ? new THREE.Mesh(new THREE.TorusGeometry(0.475, 0.05, 12, 48), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 4.4, 4.2) })) : pr.props.spoon.children[0].clone();
      this.group.add(ring); this._out = (this._out || 0) + 1; if (useHalo) pr.props.halo.visible = false; else pr.props.spoon.visible = false;
      const hang = tFar + (tBack - tFar) / 2;
      const posAt = (t) => { let k; if (t < tFar) { const u = (t - tThrow) / (tFar - tThrow); k = 1 - (1 - u) * (1 - u); } else if (t < hang) k = 1; else { const u = (t - hang) / (tBack - hang); k = 1 - u * u; } return { x: sx + (ex - sx) * k, z: sz + (ez - sz) * k }; };
      let hitOut = false, hitBack = false;
      this.sound.play('servo', sx, { rate: 2.2, gain: 1.4 });
      this._move(tBack + 0.05, (t) => {
        const p = posAt(t); ring.position.set(p.x, 1.4, p.z); ring.rotation.set(Math.PI / 2, 0, t * 14);
        const out = t < hang;
        if (near(pl, p.x, p.z, 0.75 + R) && (out ? !hitOut : !hitBack)) { if (out) hitOut = true; else hitBack = true; this._hurt(f); }
        if (t >= tBack - 0.02) g.dead = true;
      }, () => { this.group.remove(ring); this._out = Math.max(0, (this._out || 0) - 1); if (!this._out) { if (useHalo && !pr.props.halo.userData.broken) pr.props.halo.visible = true; if (!useHalo && pr.costume === 'self') pr.props.spoon.visible = true; } g.dead = true; }, true);
    });
  },

  // MAIL-IN PRIZES: two parcels fall onto circles (one on YOU, one where YOU is heading); they stay as cover
  dropParcels(f, t1) {
    if (f.suppress) return;   // in the spotlight: nothing falls
    const pl = f.player, sp = Math.hypot(pl.vx || 0, pl.vz || 0);
    const ahead = sp > 0.5 ? { x: pl.x + (pl.vx / sp) * 3, z: pl.z + (pl.vz / sp) * 3 } : { x: pl.x + (pl.x > 0 ? -3 : 3), z: pl.z };
    for (const at of [{ x: clampX(pl.x), z: clampZ(pl.z) }, { x: clampX(ahead.x), z: clampZ(ahead.z) }]) {
      const p = this.parcels.find((q) => !q.alive && !q.falling); if (!p) return;
      p.falling = true; p.at = { ...at }; p.g.visible = true; p.g.rotation.y = Math.random() * 1.5;
      f.pat.area(f, { shape: 'circle', x: at.x, z: at.z, w: 1.3, kind: 'white', start: f.t, end: t1, onImpact: () => { p.falling = false; p.alive = true; p.hp = 1; this.sound.play('cardboard', at.x, { gain: 1.1 }); f.fx.dust(at.x, at.z, 10); },
        onFizzle: () => { p.falling = false; p.alive = false; p.g.visible = false; } });
      this._move(t1 + 0.01, (t) => { const k = clamp01((t - (t1 - 0.45)) / 0.45); p.g.position.set(at.x, 9 * (1 - k * k), at.z); }, () => { p.g.position.set(at.x, 0, at.z); });
    }
  },

  // THE POUR: a box tilts toward YOU and a firehose of cereal crashes down along a lane from its foot
  pour(f, from, tLock, t1) {
    const pl = f.player; let ang = toward(from, pl);
    const len = 16.5;
    const g = f.pat.area(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w: 1.2, h: len, kind: 'white', start: f.t, end: t1, follow: () => { if (f.t < tLock) ang = toward(from, pl); return { x: from.x, z: from.z, angle: ang }; },
      onImpact: () => { f.cam.shake(0.35, 0.15); this._spill(f, from, ang, len); } });
    this.tilts.push({ x: from.x, t0: t1 - 0.7, t1: t1 + 0.6 });
    const born = f.t, sup = !!f.suppress;
    f.at(t1 - 0.32, () => { if (this.quashed(born, sup)) return; this.sound.play('pour', from.x, { gain: 1.1 }); this._cascade(f, from, ang, len, t1); });
  },
  _cascade(f, from, ang, len, t1) {
    const n = 40, s = Math.sin(ang), c = Math.cos(ang);
    for (let i = 0; i < n; i++) {
      const d = 0.6 + Math.random() * (len - 1.2), x = from.x + s * d + (Math.random() - 0.5) * 2.0 * c, z = from.z + c * d - (Math.random() - 0.5) * 2.0 * s;
      this._drop(x, 5 + Math.random() * 4, z, t1 - 0.05 + Math.random() * 0.12);
    }
  },
  _spill(f, from, ang, len) { this.spills.push({ x: from.x, z: from.z, ang, len, seed: Math.random() * 100 }); this._spillDirty = true; },

  // CATCHING THE CREST: a wave of milk rolls left to right with one dip in its crest
  crest(f, t0) {
    const pl = f.player, dipZ = clampZ(pl.z + (pl.z < 2.2 ? 4 : -4)), x = (t) => -10 + 8 * (t - t0);
    const tEnd = t0 + 21.5 / 8;
    const segs = [[-7.0, dipZ - 1.1], [dipZ + 1.1, 7.0]].filter(([a, b]) => b - a > 0.2);
    const teles = segs.map(([a, b]) => live(f, { shape: 'rect', x: x(t0), z: a, angle: 0, w: 0.55, h: b - a, kind: 'white', fill: () => 1, follow: () => ({ x: x(f.t), z: a }) }));
    if (teles.every((g) => g.dead)) return;   // sent in the spotlight: it never comes
    f.cue('white', { x: -10 });
    if (!this.foamM) this.foamM = new THREE.MeshPhysicalMaterial({ color: 0xf6f4ee, roughness: 0.3, clearcoat: 1, emissive: 0xcfe0ff, emissiveIntensity: 0.35 });
    const crest = segs.map(([a, b]) => { const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.5, Math.max(0.1, b - a - 1.0), 6, 12), this.foamM); m.rotation.x = Math.PI / 2; m.position.set(-10, 0.45, (a + b) / 2); m.castShadow = true; this.group.add(m); return m; });
    let hit = false;
    this._move(tEnd, (t) => {
      const cx = x(t);
      for (const m of crest) { m.position.x = cx; m.scale.set(1.15, 1, 1.5 + 0.12 * Math.sin(t * 13 + m.position.z)); m.position.y = 0.55; }
      if (!hit && Math.abs(pl.x - cx) < 0.5 + R && Math.abs(pl.z - dipZ) > 1.1 - 0.15) { hit = true; this._hurt(f); }
      if (Math.random() < 0.5) f.fx.glitter(cx, 0.8, -6 + Math.random() * 12, new THREE.Color(2.4, 2.4, 2.5), 2, 0.4);
    }, () => { for (const m of crest) { this.group.remove(m); m.geometry.dispose(); } for (const g of teles) g.dead = true; }, true);
    this.sound.play('slosh', -9, { gain: 1.2 }); f.at(t0 + 1.2, () => { if (!this.quashed(t0)) this.sound.play('slosh', 0, { gain: 1.0, rate: 0.9 }); });
  },

  // O-O-O: an O lobbed onto YOU that touches down when the commercial pauses, and lands when it plays
  frozenLob(f, t0, tTouch, tLand) {
    const b = f.boss, pl = f.player, at = { x: clampX(pl.x), z: clampZ(pl.z) };
    const sx = b.x, sz = b.z, sy = 1.8, peak = 3;
    const k = (t) => (t < tTouch ? (t - t0) / (tTouch - t0) * 0.96 : t < tLand ? 0.96 : 1);
    const g = live(f, { shape: 'circle', x: at.x, z: at.z, w: 1.1, kind: 'pink', fill: (t) => k(t) });
    if (g.dead) return;   // thrown in the spotlight: it never comes
    const p = f.proj.spawn({ x: sx, z: sz, y: sy, angle: 0, speed: 0, kind: 'pink', shape: 'ring', size: 0.6, life: tLand - t0 + 0.1, owner: 'deco', spin: 3, parryable: false,
      fn: (q) => { if (g.dead && !g.landed) { q.dead = true; return; } const u = Math.min(1, Math.max(0, k(f.t))); q.x = sx + (at.x - sx) * u; q.z = sz + (at.z - sz) * u; q.y = sy + (0.35 - sy) * u + 4 * peak * u * (1 - u); if (f.t >= tTouch && f.t < tLand) q.rot = 0; } });
    f.sfx.fire && f.sfx.fire('ring', f.pan(sx), 'pink');
    f.at(tLand, () => {
      if (g.dead) { if (p) p.dead = true; return; }   // the spotlight took it back
      g.land && g.land(tLand); g.landed = true; if (p) p.dead = true;
      const sh = { shape: 'circle', x: at.x, z: at.z, w: 1.1, h: 1.1, angle: 0, param: 0 };
      const hit = f.resolveArea(sh, { kind: 'pink', damage: 1 });
      if (hit === 'parried') { const q = f.proj.spawn({ x: pl.x, z: pl.z, y: 1.3, angle: toward(pl, b), speed: 17, kind: 'gold', shape: 'ring', size: 0.66, owner: 'you', life: 3, homing: 7, target: () => b, spin: 6 }); if (q) q.dmgBack = 22; }
      f.sfx.impactArea && f.sfx.impactArea('pink', f.pan(at.x), hit);
    });
  },
  // the commercial pauses: her, the O's, the confetti, the marquee; YOU moves freely, she's open
  pause(f, on) {
    const b = f.boss;
    b.frozen = on; this.prize.fig.rig.timeScale = on ? 0 : 1;
    if (on) { b.open(1.39); this.sound.play('chunkOff', 0, { rate: 1.6, gain: 0.8 }); } else this.sound.play('splice', 0, { rate: 0.5, gain: 1.4 });
    f.app.post.fx.vhs = on ? 0.18 : 0;
  },

  // FOAM: pink bubbles drift out of the bowl, homing gently
  bubbles(f, n) {
    const pl = f.player;
    for (let i = 0; i < n; i++) {
      const z = clampZ(pl.z + (i ? 1.6 : -1.6)), x = -25.5 + Math.sqrt(Math.max(0, 15.5 * 15.5 - z * z)) + 0.4;
      f.proj.spawn({ x, z, y: 1.6, angle: toward({ x, z }, pl), speed: 4, kind: 'pink', shape: 'orb', size: 0.42, homing: 0.8, target: () => f.player, life: 4, spin: 1 });
    }
    this.sound.play('bubble', -10, { rate: 0.8 });
  },

  // THROW AWAY THE KEY: a pink toy key down a lane at YOU, out past you, a beat spinning, back to her hand
  key(f, t0, tFar, tBack) {
    const b = f.boss, pl = f.player, sx = b.x, sz = b.z, ang = toward(b, pl), d = Math.hypot(pl.x - sx, pl.z - sz) + 3;
    const ex = clampX(sx + Math.sin(ang) * d), ez = clampZ(sz + Math.cos(ang) * d), L = Math.hypot(ex - sx, ez - sz);
    const hang = tFar + f.beat;
    const posAt = (t) => { let k; if (t < tFar) { const u = clamp01((t - t0) / (tFar - t0)); k = 1 - (1 - u) * (1 - u); } else if (t < hang) k = 1; else { const u = clamp01((t - hang) / (tBack - hang)); k = 1 - u * u; } return { x: sx + (ex - sx) * k, z: sz + (ez - sz) * k }; };
    const g = live(f, { shape: 'rect', x: sx, z: sz, angle: ang, w: 0.6, h: L, kind: 'pink', fill: (t) => (t < tFar ? (t - t0) / (tFar - t0) : 1) });
    if (g.dead) return;   // thrown in the spotlight: it never comes
    f.cue('pink', b);
    b.perform('OverhandThrow', { duration: 0.5 });
    if (!this.keyMesh) {
      const m = new THREE.Group(), blue = lac(0x2a5aff), yel = lac(0xffd21a);
      const bow = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.09, 10, 24), yel); m.add(bow);
      const shaft = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.9, 0.08), blue); shaft.position.y = -0.7; m.add(shaft);
      for (const y of [-0.95, -1.08]) { const tooth = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.08, 0.08), blue); tooth.position.set(0.12, y, 0); m.add(tooth); }
      this.keyMesh = m; this.group.add(m);
    }
    const km = this.keyMesh; km.visible = true;
    let p = null, caught = false;
    const spawn = () => { const q = posAt(f.t); p = f.proj.spawn({ x: q.x, z: q.z, y: 1.2, angle: 0, speed: 0, kind: 'pink', shape: 'ring', size: 0.5, radius: 0.55, life: tBack - f.t + 0.1, spin: 10, fn: (pp) => { if (pp.owner !== 'boss') { caught = true; return; } const r = posAt(f.t); pp.x = r.x; pp.z = r.z; } }); };
    spawn();
    this.sound.play('servo', sx, { rate: 1.6, gain: 1.2 });
    this._move(tBack, (t) => {
      if (!caught && p && p.dead && t < tBack - 0.1 && p.owner === 'boss') spawn();
      const q = caught && p ? { x: p.x, z: p.z } : posAt(t);
      km.position.set(q.x, 1.3, q.z); km.rotation.set(0, t * 8, Math.PI / 2 + t * 6);
      if (caught && p && p.dead) km.visible = false;
    }, () => { km.visible = false; g.dead = true; if (p && !caught) p.dead = true; }, true);
  },

  // BATHROOM FLOOR: the tile pops in a checkerboard of 2 m squares, one colour then the other
  tilePops(f, list) {
    const pl = f.player;
    for (const [t0, t1, set] of list) {
      f.at(t0, () => {
        const gs = [];
        for (let i = 0; i < 11; i++) for (let j = 0; j < 7; j++) {
          if ((i + j) % 2 !== set) continue;
          const x0 = -11 + i * 2, z0 = -7 + j * 2;
          gs.push(f.tele.add({ shape: 'rect', x: x0 + 1, z: z0, angle: 0, w: 0.98, h: 1.98, kind: 'white', start: f.t, end: t1, linger: 0.18 }));
        }
        if (gs.every((g) => g.dead)) return;   // in the spotlight: these tiles don't pop
        f.cue('white', { x: 0 });
        f.at(t1, () => {
          if (gs.every((g) => g.dead)) return;   // the spotlight took them back
          const i = Math.floor((pl.x + 11) / 2), j = Math.floor((pl.z + 7) / 2);
          const fx = (pl.x + 11) / 2 - i, fz = (pl.z + 7) / 2 - j;
          const onSet = (i + j) % 2 === set, edge = Math.min(fx, 1 - fx, fz, 1 - fz) * 2;
          if (onSet && edge > 0.12) this._hurt(f);
          this.sound.play('clack', 0, { gain: 1.2 }); this.sound.play('clack', -6, { rate: 0.9 }); this.sound.play('clack', 6, { rate: 1.1 });
          this.tilePop = { t: t1, set };
        });
      });
    }
  },

  // A BEAUTIFUL BOMB: lobbed high onto YOU (locked); catch it as it lands, or it blows where it lies
  bomb(f, t0, tLock, tLand, tBlast) {
    const b = f.boss, pl = f.player; let lx = pl.x, lz = pl.z;
    const g = live(f, { shape: 'circle', x: lx, z: lz, w: 1.1, kind: 'pink', fill: (t) => (t - t0) / (tLand - t0), follow: () => { if (f.t < tLock) { lx = clampX(pl.x); lz = clampZ(pl.z); } return { x: lx, z: lz }; } });
    if (g.dead) return;   // in the spotlight: no bomb
    b.perform('OverhandThrow', { duration: 0.6 });
    f.cue('pink', b);
    const mesh = this._bombMesh();
    f.at(tLock, () => {
      if (g.dead) return;   // the spotlight took it back before she threw
      g.dead = true;
      f.pat.lob(f, { from: { x: b.x, z: b.z }, fromY: 2.2, at: { x: lx, z: lz }, end: tLand, r: 1.1, shape: 'orb', size: 0.7, kind: 'pink', back: 60, peak: 5.5, mesh, silentCue: true,
        onCaught: (q) => { this.sound.play('pop', b.x, { gain: 0.6 }); f.after(0.45, () => { f.fx.flash(new THREE.Color(0.6, 0.4, 0.2), 0.6); f.fx.chips(b.x, 1.5, b.z, new THREE.Color(3, 1.2, 1.6), 30); this.sound.play('whoomph', b.x, { gain: 0.9 }); f.cam.shake(0.7, 0.2); }); },
        onLand: () => {
          const m2 = mesh.clone(); m2.position.set(lx, 0.6, lz); this.group.add(m2);
          f.pat.area(f, { shape: 'circle', x: lx, z: lz, w: 3.5, kind: 'white', start: f.t, end: tBlast, damage: 2,
            onImpact: () => { this.group.remove(m2); f.fx.flash(new THREE.Color(0.8, 0.5, 0.3), 0.6); f.fx.chips(lx, 0.8, lz, new THREE.Color(3, 2.2, 1), 40); f.fx.glitter(lx, 1, lz, new THREE.Color(3.4, 1.2, 2), 40, 2); this.sound.play('whoomph', lx, { gain: 1.0 }); f.cam.shake(0.8, 0.25); } });
          this._move(tBlast, (t) => { m2.scale.setScalar(1 + 0.08 * Math.sin(t * 40)); }, () => this.group.remove(m2), true);
        } });
      this.sound.play('crackle', b.x, { rate: 1.4 });
    });
  },
  _bombMesh() {
    const g = new THREE.Group();
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.6, 24, 16), lac(0x0d0b0e, 0.12)); g.add(s);
    const lbl = new THREE.Mesh(new THREE.CircleGeometry(0.32, 24), new THREE.MeshPhysicalMaterial({ map: P.badgeTex(), transparent: true, alphaTest: 0.4 })); lbl.position.z = 0.59; g.add(lbl);
    const fuse = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.3, 8), lac(0xe8dcc8)); fuse.position.y = 0.7; g.add(fuse);
    const spark = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 3, 1) })); spark.position.y = 0.86; g.add(spark);
    return g;
  },

  // PINPOINTS: a thin lane at YOU locked a beat before; a fast dart down it
  dart(f, tLock, tFire) {
    const b = f.boss, pl = f.player; let ang = toward(b, pl);
    const g = live(f, { shape: 'rect', x: b.x, z: b.z, angle: ang, w: 0.25, h: 15, kind: 'white', fill: (t) => (t - f.t) / (tFire - f.t + 1e-3), follow: () => { if (f.t < tLock) ang = toward(b, pl); return { x: b.x, z: b.z, angle: ang }; } });
    f.cue('white', b);
    f.at(tFire, () => { if (g.dead) return; g.dead = true; f.proj.spawn({ x: b.x + Math.sin(ang) * 0.8, z: b.z + Math.cos(ang) * 0.8, y: 1.3, angle: ang, speed: 16, kind: 'white', shape: 'shard', size: 0.45, life: 1.5 }); f.sfx.fire && f.sfx.fire('shard', f.pan(b.x), 'white'); });
  },

  // DISARMED: her spoon spins out of her hand and clatters away across the tile
  disarm(f) {
    const pr = this.prize, b = f.boss;
    if (!pr.props.spoon.visible) return;
    const s = pr.props.spoon.children[0].clone(); pr.props.spoon.visible = false;
    s.position.set(b.x, 1.2, b.z); this.group.add(s);
    const a = Math.random() * Math.PI * 2, t0 = f.t;
    this._move(t0 + 2.2, (t) => { const k = t - t0, d = 6 * (1 - Math.exp(-k * 2.2)); s.position.set(b.x + Math.sin(a) * d, Math.max(0.05, 1.2 - k * 4) , b.z + Math.cos(a) * d); s.rotation.set(Math.PI / 2, 0, k * 18 * Math.exp(-k)); }, () => this.group.remove(s));
    this.sound.play('clack', b.x, { rate: 1.3, gain: 1.2 }); f.after(0.3, () => this.sound.play('clack', b.x, { rate: 1.6 })); f.after(0.55, () => this.sound.play('clack', b.x, { rate: 1.9, gain: 0.7 }));
  },

  // EQUALIZE: flames race along both lanes, left to right
  fireLanes(f, tLock, tRace, tIgnite) {
    if (f.suppress) return;   // in the spotlight: no flames
    const pl = f.player; let z0 = clampZ(pl.z), z1 = clampZ(pl.z + 3.4);
    this._move(tIgnite + 0.4, (t) => {
      if (t < tLock) { z0 = clampZ(pl.z); z1 = clampZ(pl.z + 3.4); }
      if (t >= tRace && t < tIgnite) { const x = -11 + 22 * (t - tRace) / (tIgnite - tRace); for (const z of [z0, z1]) f.fx.sparks(x, 0.3, z + (Math.random() - 0.5) * 1.2, new THREE.Color(3.2, 1.2, 0.3), 3, Math.PI / 2); }
      if (t >= tIgnite && t < tIgnite + 0.3) for (const z of [z0, z1]) f.fx.sparks(-11 + Math.random() * 22, 0.4, z, new THREE.Color(3.4, 1.4, 0.35), 6);
    }, null, true);
  },
  petals(f) { const b = f.boss; f.fx.glitter(b.x, 1.6, b.z, new THREE.Color(3.4, 1.0, 1.8), 50, 1.4); f.fx.chips(b.x, 1.6, b.z, new THREE.Color(3, 1.5, 2), 20); this.sound.play('crunchSmall', b.x, { rate: 1.4 }); },

  // RIGOR MORTIS, VIGOR MORTIS: sugar frost spreads over the floor; on the pulse, standing still is a hit
  frost(f, t0, t1) {
    const pl = f.player, hist = [];
    const g = live(f, { shape: 'circle', x: pl.x, z: pl.z, w: 0.7, kind: 'white', fill: (t) => (t - t0) / (t1 - t0), follow: () => ({ x: pl.x, z: pl.z }) });
    if (g.dead) return;   // in the spotlight: no frost
    this.frostSpan = { t0, t1 };
    this.sound.play('crackle', 0, { rate: 0.7, gain: 1.4 });
    this._move(t1 + 0.05, (t) => { hist.push([t, pl.x, pl.z]); while (hist.length && hist[0][0] < t - 0.3) hist.shift(); });
    f.at(t1, () => {
      if (g.dead) return;   // the spotlight took it back
      g.land && g.land(t1);
      const h0 = hist[0] || [t1, pl.x, pl.z], moved = Math.hypot(pl.x - h0[1], pl.z - h0[2]);
      this.sound.play('heart', 0, { rate: 0.85, gain: 1.1 }); f.fx.glitter(pl.x, 0.3, pl.z, new THREE.Color(2.2, 2.6, 3.2), 16, 1.2);
      if (moved < 0.35) this._hurt(f);
    });
  },
};
