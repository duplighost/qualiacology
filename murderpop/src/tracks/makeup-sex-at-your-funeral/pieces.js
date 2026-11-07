// The set pieces that move with her attacks: the six pallbearers with your casket, the headstone she rides,
// the hearses of the procession, the 3 a.m. chapel (the casket she hides in, the director's torch), and the
// small things the floor keeps for a moment (mascara streaks, open graves, the pink flood).
import * as THREE from 'three';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';
import { Rig } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { inShape } from '../../game/choreo.js';
import { FEEL } from '../../game/player.js';
import { FXK } from '../../engine/post.js';
import { makeHearse, mats } from './props.js';
import { TL } from './set.js';

const PI = Math.PI;
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const BEARER = {
  name: 'pallbearer', body: 'male', scale: 1.14, porcelain: 0xf2ece6,
  layers: [
    { kind: 'bottom', from: 'waist', hem: 'ankle', color: 0x0c0a0e, finish: 'lacquer' },
    { kind: 'top', from: 'hips', neckline: 'crew', sleeves: 'wrist', color: 0xf4f0ea, finish: 'gloss' },
    { kind: 'top', from: 'hips', neckline: 'v', depth: 0.2, width: 0.07, sleeves: 'wrist', color: 0x0c0a0e, finish: 'lacquer', trim: false },
    { kind: 'gloves', from: 'wrist', color: 0xf6f3ee, finish: 'satin' },
  ],
  hair: { style: 'parted', color: 0x0a0a0c },
  face: { brows: { color: '#1a1416', thick: 1.0 }, lips: { color: '#a27a78', gloss: 0.3 }, blush: { amount: 0.08 }, lashes: { n: 5, len: 0.6 } },
  accessories: [{ type: 'shoes', from: 'ankle', color: 0x060507, finish: 'lacquer', toe: 'round', smooth: 10 }],
};

// ------------------------------------------------------------------------------------------------ the pallbearers
export class Bearers {
  constructor(tr) { this.tr = tr; this.f = tr.f; this.men = []; this.on = false; this.state = 'off'; this.x = 0; this.z = -5; this.h = -PI / 2; this.carry = false; }
  async build(kit) {
    try {
      const fig = await buildFigurine(kit, BEARER);
      this.fig = fig;
      for (let i = 0; i < 6; i++) {
        const model = i === 0 ? fig.model : SkeletonUtils.clone(fig.model);
        const rig = i === 0 ? fig.rig : new Rig(kit, model);
        rig.root.visible = false;
        this.f.scene.add(rig.root);
        model.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
        this.men.push({ rig, i, side: i < 3 ? -1 : 1, along: [0.85, 0, -0.85][i % 3] });
      }
      // the director in the chapel doorway: a seventh man in black, holding the torch
      const dm = SkeletonUtils.clone(fig.model); this.director = new Rig(kit, dm); this.director.root.visible = false; this.f.scene.add(this.director.root);
      dm.traverse((o) => { if (o.isMesh) o.frustumCulled = false; });
      this.director.play('Idle_FoldArms_Loop', { fade: 0 });
      if (this.tr.set.arena) { for (const m of this.men) this.tr.set.arena.addCaster(m.rig.root); }
    } catch (e) { console.warn('pallbearers:', e.message); this.men = []; }
  }
  get footprint() { return this.on ? { type: 'box', x: this.x, z: this.z, hx: 0.85, hz: 1.25, rot: -this.h, name: 'bearers' } : null; }
  reset(t) {
    this.on = false; this.state = 'off'; this.path = null; this.tr.set.release('casket');
    // between their entrance and the cemetery, they stand round your casket by the catafalque
    if (t > TL.walls - 9 && t < TL.turf && t >= 46.436) { this.on = true; this.state = 'stand'; this.x = 0; this.z = -5.0; this.h = -PI / 2; this.carry = true; }
    for (const m of this.men) m.rig.root.visible = this.on;
  }
  marchIn(t0, t1) {
    this.on = true; this.state = 'walk'; this.carry = false;
    this.path = { t0, t1, fx: 12.6, fz: -1.2, tx: 0.0, tz: -5.0, h0: -1.9, h1: -PI / 2 };
    this.tr.sounds && this.tr.sounds.play('boots', { x: 11, gain: 0.8 });
  }
  // a charge with your casket from where they stand, through YOU, to the far wall (11 m/s)
  charge(t0, t1) {
    const f = this.f, D = this.tr.D;
    if (!this.on) this.reset(t0);
    if (!this.on) { this.on = true; this.x = 0; this.z = -5; this.h = -PI / 2; }
    this.carry = true;
    const from = { x: this.x, z: this.z }, a = toward(from, f.player);
    const end = this._end(from, a);
    const len = Math.hypot(end.x - from.x, end.z - from.z);
    this.state = 'turn'; this.turn = { t0, h0: this.h, h1: a };
    D.area({ shape: 'rect', x: from.x, z: from.z, angle: a, w: 0.9, h: len + 1.2, kind: 'white', start: t0, end: t1, keep: true, onImpact: () => { this.tr.sounds && (this.tr.sounds.play('woodHeavy', { x: from.x, gain: 0.7 }), this.tr.sounds.play('coins', { x: from.x })); } });
    this.tr.sounds && this.tr.sounds.play('creak', { x: from.x, gain: 0.6 });
    this.path = { t0: t1 - 0.12, t1: t1 - 0.12 + len / 11, fx: from.x, fz: from.z, tx: end.x, tz: end.z, h0: a, h1: a, run: true };
  }
  // FOREVER MINE THIS WAY: through the gate (or from the side) with the open casket
  scoop(t0, t1, from) {
    const f = this.f, D = this.tr.D;
    const p = { x: f.player.x, z: f.player.z };
    const st = from === 'gate' ? { x: 0, z: -8.2 } : { x: p.x > 0 ? -12 : 12, z: p.z };
    const a = toward(st, p);
    const end = this._end(st, a, true);
    this.on = true; this.carry = true; this.x = st.x; this.z = st.z; this.h = a; this.state = 'stand';
    for (const m of this.men) m.rig.root.visible = true;
    D.area({ shape: 'rect', x: st.x, z: st.z, angle: a, w: 0.9, h: Math.hypot(end.x - st.x, end.z - st.z) + 1.5, kind: 'white', start: t0, end: t1, keep: true });
    this.path = { t0: t1 - 0.15, t1: t1 - 0.15 + Math.hypot(end.x - st.x, end.z - st.z) / 11, fx: st.x, fz: st.z, tx: end.x, tz: end.z, h0: a, h1: a, run: true, exit: true };
    this.tr.sounds && this.tr.sounds.play('boots', { x: st.x });
  }
  _end(from, a, through = false) {
    const b = this.f.bounds; let x = from.x, z = from.z;
    for (let s = 0; s < 40; s += 0.25) { const nx = from.x + Math.sin(a) * s, nz = from.z + Math.cos(a) * s; if (nx < b.minX + 1.2 || nx > b.maxX - 1.2 || nz < b.minZ + 1.2 || nz > b.maxZ - 1.2) { if (through && s > 3) { x = nx + Math.sin(a) * 3; z = nz + Math.cos(a) * 3; } break; } x = nx; z = nz; }
    return { x, z };
  }
  update(dt) {
    const f = this.f, t = f.t;
    if (!this.men.length) return;
    if (t >= TL.turf && t < 170 && this.on) { this.on = false; this.tr.set.release('casket'); }
    let moving = 0;
    if (this.state === 'turn' && this.turn) { const k = Math.min(1, (t - this.turn.t0) / 0.3); let d = Math.atan2(Math.sin(this.turn.h1 - this.turn.h0), Math.cos(this.turn.h1 - this.turn.h0)); this.h = this.turn.h0 + d * k; if (k >= 1) this.state = 'stand'; }
    if (this.path && t >= this.path.t0) {
      const p = this.path, k = Math.min(1, (t - p.t0) / Math.max(0.01, p.t1 - p.t0)), e = p.run ? k : k * k * (3 - 2 * k);
      const nx = p.fx + (p.tx - p.fx) * e, nz = p.fz + (p.tz - p.fz) * e;
      moving = Math.hypot(nx - this.x, nz - this.z) / Math.max(1e-4, dt);
      this.x = nx; this.z = nz;
      this.h = p.h0 + Math.atan2(Math.sin(p.h1 - p.h0), Math.cos(p.h1 - p.h0)) * k;
      if (p.run) this._smash();
      if (k >= 1) { const ex = p.exit; this.path = null; this.state = 'stand'; if (!p.run) { this.carry = true; this.tr.sounds && this.tr.sounds.play('woodLight', { x: this.x }); } if (ex) { this.on = false; this.tr.set.release('casket'); } }
    }
    // the men round the casket: three a side, facing the way they go
    const ch = Math.cos(this.h), sh = Math.sin(this.h);
    const run = moving > 4, walk = moving > 0.3;
    for (const m of this.men) {
      m.rig.root.visible = this.on;
      if (!this.on) continue;
      const lx = m.side * 0.62, lz = m.along;
      m.rig.root.position.set(this.x + lx * ch + lz * sh, 0, this.z - lx * sh + lz * ch);
      m.rig.root.rotation.y = this.h;
      m.rig.play(run ? 'Sprint_Loop' : walk ? 'Walk_Formal_Loop' : 'Idle_Loop', { fade: 0.2, speed: run ? 1.5 : 1 });
      m.rig.update(dt);
    }
    // your casket rides with them, open, at their hands
    if (this.on && this.carry) this.tr.set.drive('casket', { x: this.x, z: this.z, y: 0.82, rotY: this.h + PI / 2, visible: true });
  }
  // a charge breaks the pews in its path
  _smash() {
    const set = this.tr.set;
    for (const p of Object.values(set.props)) {
      if (!p.name.startsWith('pew') || !p.active || !p.up) continue;
      const o = p.obj; if (Math.hypot(o.position.x - this.x, o.position.z - this.z) < 1.8) set.hitProp(p.name, 99, this.h, 'her');
    }
  }
  updateDirector(dt, on, x, z, h) {
    if (!this.director) return;
    this.director.root.visible = on;
    if (!on) return;
    this.director.root.position.set(x, 0, z); this.director.root.rotation.y = h;
    this.director.update(dt);
  }
}

// ------------------------------------------------------------------------------------------------ BELOVED, ridden
export class Ride {
  constructor(tr) { this.tr = tr; this.f = tr.f; this.on = false; this.island = false; this.bx = 0; this.bz = -4.6; this.h = 0; }
  get D() { return this.tr.D; }
  mount(again = false) {
    const f = this.f, b = f.boss;
    const base = again ? { x: 0, z: -5.6 } : { x: 0, z: -4.6 };
    this.island = false; this.bx = base.x; this.bz = base.z;
    // too far to step onto it: she leaps on, and the ride starts when she lands
    if (Math.hypot(b.x - base.x, b.z - base.z) > 1.2 && !this._leaping) { this._leaping = true; this.D.leap(base.x, base.z, 0.32); f.after(0.33, () => { this._leaping = false; this.mount(again); }); return; }
    this.on = true; this.h = toward(base, f.player);
    b.place(base.x, base.z); b.setMark(base.x, base.z);
    this.D.hold('Sitting_Idle_Loop', 0.3, f.t + 60);
    b.rig.upperOnce('Spell_Simple_Idle_Loop', { duration: 3, from: 0.3, to: 0.4 });
    f.fx.dust(base.x, base.z, 18, new THREE.Color(0.32, 0.22, 0.18)); f.fx.chips(base.x, 0.5, base.z, new THREE.Color(0.3, 0.22, 0.18), 16);
    this.tr.sounds && (this.tr.sounds.play('stone', { x: base.x, gain: 1 }), this.tr.sounds.play('soilHeavy', { x: base.x }));
    f.cam.shake(0.6, 0.2);
    this.D.face('cackle');
  }
  ram(t0, t1) {
    const f = this.f, b = f.boss;
    if (!this.on) this.mount(t0 > 190);
    const from = { x: b.x, z: b.z }, a = toward(from, f.player);
    let ex = from.x + Math.sin(a) * 9, ez = from.z + Math.cos(a) * 9;
    const r = this.tr.set.resolve(Math.max(f.bounds.minX + 1.2, Math.min(f.bounds.maxX - 1.2, ex)), Math.max(f.bounds.minZ + 1.2, Math.min(f.bounds.maxZ - 1.2, ez)), 0.5); ex = r.x; ez = r.z;
    const len = Math.hypot(ex - from.x, ez - from.z);
    this.D.area({ shape: 'rect', x: from.x, z: from.z, angle: a, w: 1.0, h: Math.max(2, len + 0.8), kind: 'white', start: t0, end: t1 });
    this.h = a;
    this.tr.sounds && this.tr.sounds.play('stone', { x: from.x, gain: 0.5, rate: 0.7 });
    const dur = Math.max(0.2, len / 14);
    f.after(Math.max(0, t1 - f.t - dur * 0.5), () => { if (!this.on) return; b.moveTo(ex, ez, dur, { easing: 'in', face: false }); b.setMark(ex, ez); this.tr.furrow && this.tr.furrow(from, { x: ex, z: ez }); this.tr.sounds && this.tr.sounds.play('stone', { x: ex, gain: 0.9, delay: dur * 0.8 }); });
  }
  toIsland(tIsland) {
    const f = this.f, b = f.boss;
    if (!this.on) this.mount();
    const dur = Math.max(0.3, tIsland - f.t);
    b.moveTo(-0.5, 0, dur, { easing: 'inOut', face: false }); b.setMark(-0.5, 0);
    f.after(dur, () => { this.island = true; this.on = false; this.D.free(); b.rig.upperStop(); this.D.face('pout'); });
  }
  dismount(x = 0, z = -4.0) {
    const f = this.f, b = f.boss;
    this.on = false; this.island = false; this.D.free(); b.rig.upperStop();
    this.D.leap(x, z, 0.5);
  }
  reset(t) {
    // on a rewind: where the song has her (riding, on the island) is set again; the rams are not
    this.on = false; this.island = false; this._leaping = false;
    if (t >= TL.belovedOut && t < 127.0) this.mount();
    else if (t >= TL.island && t < 145.88) { this.island = true; this.f.boss.place(-0.5, 0); this.f.boss.setMark(-0.5, 0); }
    else if (t >= 195.4 && t < 198.163) this.mount(true);
  }
  update(dt) {
    const f = this.f, b = f.boss, set = this.tr.set, t = f.t;
    if (this.on) {
      // BELOVED under her, bucking
      set.drive('beloved', { x: b.x, z: b.z, y: 0.15, rotY: this.h + PI, rotX: Math.sin(t * 9) * 0.12 });
      b.facing = this.h + Math.sin(t * 6) * 0.15;
    } else if (t >= TL.island && t < TL.chapel) {
      set.drive('beloved', { x: 1.0, z: 0.0, y: 0.32, rotY: 0, rotX: 0 });
    } else if (t >= TL.belovedOut && t < TL.island) {
      // it stays where she left it
    } else if (set.override.has('beloved') && !(t >= 195.4 && t < 199.4)) set.release('beloved');
  }
}

// ------------------------------------------------------------------------------------------------ the hearses
const CAR_HZ = 0.8;   // half the hearse's width (1.5 m body and its chrome)
export class Hearses {
  constructor(tr) { this.tr = tr; this.f = tr.f; this.pool = []; this.live = []; }
  build() {
    // one every 2 beats at full tilt, each on the road ~2.7 s from its lane lighting: 6 so every lit lane gets its car
    for (let i = 0; i < 6; i++) {
      const h = makeHearse(i); h.visible = false; this.f.scene.add(h);
      if (this.tr.set.arena) this.tr.set.arena.addCaster(h);
      // the headlight pools are light, not things: they cast nothing
      h.traverse((o) => { if (o.isMesh && o.material && o.material.blending === THREE.AdditiveBlending) { o.castShadow = false; o.layers.set(0); this.beam = o.material; } });
      this.pool.push(h);
    }
    if (this.beam) this.beam0 = this.beam.color.clone();
  }
  // lit at t0 (2 beats before), in at the arena's edge at t1, across at 14 m/s
  go(t0, t1, lane, o = {}) {
    const f = this.f, D = this.tr.D;
    if (f.suppress) return;   // under her spotlight her traffic fizzles like everything else of hers
    const dir = lane === 'north' ? 1 : -1, z = lane === 'north' ? -1.2 : 1.2, x0 = -dir * 17;
    // lit 2 beats before it comes; then the lane counts down to the moment the car reaches you. The lane is the
    // car's own width (a rect's w is its half-width), so the two lanes never meet: the gold centre line between
    // them stays dark, and standing on it the cars go by either side of you
    D.tele({ shape: 'rect', x: x0, z, angle: dir * PI / 2, w: CAR_HZ, h: 34, kind: 'white', start: t0, end: t1, linger: 0.05 });
    const live = D.tele({ shape: 'rect', x: x0, z, angle: dir * PI / 2, w: CAR_HZ, h: 34, kind: 'white', start: t1, end: t1 + 2.4, linger: 0.05 });
    if (!live || live.dead) return;   // no lane on the floor, no car
    live.keep = true;
    if (!f.suppress) f.cue('white', { x: -dir * 11 });
    if (o.horn !== false) this.tr.sounds && this.tr.sounds.horn(dir * -11);
    const mesh = this.pool.find((m) => !this.live.some((l) => l.mesh === m));
    if (!mesh) return;
    this.live.push({ mesh, t1, dir, z, x0: -dir * 13.5, hit: false, sound: false, tg: live });
  }
  footprints() { return this.live.filter((h) => h.on).map((h) => ({ type: 'box', x: h.x, z: h.z, hx: 2.8, hz: CAR_HZ, rot: 0, name: 'hearse' })); }
  clear() { for (const h of this.live) h.mesh.visible = false; this.live.length = 0; }
  update(dt) {
    const f = this.f, pl = f.player;
    // the headlight pools come down with the game's other glows in the night's high exposure (FXK)
    if (this.beam && this.live.length) this.beam.color.copy(this.beam0).multiplyScalar(Math.min(1, FXK.value));
    for (let i = this.live.length - 1; i >= 0; i--) {
      const h = this.live[i];
      // its lane went dark before it came (her spotlight, a rewind): it doesn't come
      if (h.tg && h.tg.dead && !h.on) { h.mesh.visible = false; this.live.splice(i, 1); continue; }
      const x = h.x0 + h.dir * 14 * (f.t - h.t1 + 2.5 / 14);
      h.x = x; h.on = f.t >= h.t1 - 0.2 && Math.abs(x) < 17;
      h.mesh.visible = h.on;
      h.mesh.position.set(x, 0, h.z); h.mesh.rotation.y = h.dir > 0 ? 0 : PI;
      if (h.on && !h.sound) { h.sound = true; this.tr.sounds && this.tr.sounds.play('rumble', { x, gain: 1 }); }
      if (Math.abs(x) > 17 && f.t > h.t1) { h.mesh.visible = false; if (h.tg) h.tg.dead = true; this.live.splice(i, 1); continue; }
      // the lane's countdown: until its front reaches your x; it stays lit while the body goes past you, then it's gone
      if (h.tg && !h.tg.dead && f.t >= h.t1) {
        const front = x + h.dir * 2.8, rear = x - h.dir * 2.8;
        const ahead = h.dir * (pl.x - front), behind = h.dir * (pl.x - rear);
        if (ahead > -0.6) { h.tg.start = Math.min(h.tg.start, f.t); h.tg.end = f.t + Math.max(0.03, ahead / 14); }
        else if (behind > -0.6) h.tg.end = f.t + 0.03;
        else h.tg.end = Math.min(h.tg.end, f.t - 0.01);
      }
      // the hit: its body through you (dash through it for a near miss); a brush of its flank on the centre line isn't one
      if (h.on && !h.hit && Math.abs(pl.x - x) < 2.9 && Math.abs(pl.z - h.z) < CAR_HZ + FEEL.radius * 0.35) {
        if (pl.invulnerable) { if (pl.state === 'dash' && !h.nm) { h.nm = true; pl.nearMiss(f._ctx(0)); } }
        else if (!f.suppress && f.boss.state !== 'desperate') { h.hit = true; if (pl.hurt(f._ctx(0), 1, pl.x, h.z, 'hearse')) { f._hurt(x, h.z); this.tr.sounds && this.tr.sounds.play('thudBody', { x }); } }
      }
    }
  }
}

// ------------------------------------------------------------------------------------------------ the 3 a.m. chapel
export class Chapel {
  constructor(tr) { this.tr = tr; this.f = tr.f; this.inside = false; this.torchOn = false; this.beam = null; }
  get D() { return this.tr.D; }
  get b() { return this.f.boss; }
  dive() {
    const b = this.b;
    this.D.slide(0, -3.2, 0.4);
    this.f.after(0.42, () => { this.hide(true); this.tr.sounds && this.tr.sounds.play('woodLight', { x: 0 }); });
  }
  hide(on) {
    const b = this.b; this.inside = on;
    b.fig.root.visible = !on;
    b.dmgMul = on ? 0.5 : 1;
    if (on) { b.place(0, -4.0); b.setMark(0, -4.0); }
    this.tr.set.drive('casket', { lid: on });
    this.lid(on ? 0 : -1.75);
  }
  lid(rx) { const c = this.tr.set.props.casket.obj.userData; c.lidHead.rotation.x = rx; c.lidFoot.rotation.x = 0; }
  lightsOut() { this.f.cam.shake(0.5, 0.15); this.tr.sounds && this.tr.sounds.play('woodHeavy', { x: 0, gain: 0.8 }); }
  // the director's torch from the doorway: a TORCH shot whose beam sweeps (lockT: it follows you, then locks)
  torch(t0, t1, lockT) {
    const f = this.f, door = { x: 8.1, z: 0.5 };
    this.torchOn = true;
    this.tr.sounds && this.tr.sounds.play('torch', { x: 8 });
    const first = lockT === null;
    const way = first ? [{ x: 6.5, z: 4.2 }, { x: -6.8, z: 3.6 }, { x: 0, z: -4.0 }] : [{ x: 0, z: -4.0 }, { x: -6.5, z: 1.0 }];
    let ang = toward(door, way[0]);
    const tFollow = first ? t1 : t0 + 2 * f.beat;
    const s = this.tr.shots.start({ variant: 'TORCH', t0, t1, apex: door, noBoss: true, sidestep: false, hold: 4,
      follow: (t) => {
        const k = Math.min(1, (t - t0) / (t1 - t0));
        if (first) { const seg = k < 0.6 ? 0 : 1, kk = seg === 0 ? k / 0.6 : (k - 0.6) / 0.4; const a = way[seg], c = way[seg + 1]; const e = kk * kk * (3 - 2 * kk); ang = toward(door, { x: a.x + (c.x - a.x) * e, z: a.z + (c.z - a.z) * e }); }
        else if (t < tFollow) { const kk = Math.min(1, (t - t0) / (tFollow - t0)); ang = toward(door, { x: way[0].x + (way[1].x - way[0].x) * kk, z: way[0].z + (way[1].z - way[0].z) * kk }); }
        else if (t < lockT) { const want = toward(door, f.player); const d = Math.atan2(Math.sin(want - ang), Math.cos(want - ang)); ang += Math.max(-3 * f.dt, Math.min(3 * f.dt, d)); }
        else if (!this._click) { this._click = true; this.tr.sounds && this.tr.sounds.play('metalClick', { x: door.x }); }
        return { x: door.x, z: door.z, angle: ang };
      },
      onFlash: () => { this._click = false; this.sitUp(t1); } });
    this.beam = s;
  }
  sitUp(t1) {
    const b = this.b, f = this.f;
    this.hide(false); this.lid(-1.75);
    b.root.position.y = 0.95;
    this.D.hold('LayToIdle', 0.4, t1 + 4 * f.beat);
    b.pose = { until: t1 + 4 * f.beat, kind: 'casket' };
    b.lockFacing = true; b.facing = toward(b, f.player);
    this.D.face('cackle');
    this.D.act('Pistol_Shoot', 0.25, { then: null });
    this.f.after(4 * f.beat, () => { this.D.hold('LayToIdle', 0.2, f.t + 3 * f.beat); this.D.face('cackle'); });
  }
  // (out of the box whatever happened before: if your spotlight cancelled the torch's flash she never sat up, and she
  // must not stalk you unseen)
  climbOut() { const b = this.b, f = this.f; if (this.inside) { this.hide(false); this.lid(-1.75); } b.root.position.y = 0; b.lockFacing = false; b.pose = null; this.D.free(); b.place(0.9, -3.5); b.setMark(f.player.x * 0.5, (f.player.z - 4) * 0.5); this.D.face('fury'); }
  topple() { const b = this.b; this.D.act('Hit_Knockback', 0.35, { from: 0, to: 0.25 }); b.moveTo(0, -3.4, 0.3, { easing: 'out' }); b.setMark(0, -3.4); }
  burst(t0, t1) {
    const f = this.f, b = this.b;
    this.hide(true);
    this.lid(0);
    for (const k of [0.5, 1]) f.after(k * f.beat, () => { this.tr.sounds && this.tr.sounds.play('knock', { x: 0, gain: 0.9 }); this.tr.set.drive('casket', { lift: 0.05 }); f.after(0.08, () => this.tr.set.drive('casket', { lift: 0 })); });
    this.D.area({ shape: 'circle', x: 0, z: -4.0, w: 4.5, kind: 'white', start: t0, end: t1, keep: true, onImpact: () => {
      this.hide(false); b.place(0, -4.0); b.setMark(0, -3.4);
      this.tr.set.release('casket'); this.tr.casketBurst && this.tr.casketBurst();
      f.cam.shake(1.4, 0.35); f.cam.kick(2.4);
      this.tr.sounds && (this.tr.sounds.play('woodHeavy', { x: 0, gain: 1 }), this.tr.sounds.play('plank', { x: 0, delay: 0.04 }), this.tr.sounds.play('glassHeavy', { x: -6, delay: 0.08, gain: 0.7 }), this.tr.sounds.play('glassHeavy', { x: 6, delay: 0.12, gain: 0.7 }));
      f.fx.chips(0, 0.9, -4.0, new THREE.Color(0.25, 0.12, 0.1), 50); f.fx.glitter(0, 2, -4, new THREE.Color(2.6, 2.2, 3.2), 120, 6);
      this.torchOn = false;
    } });
  }
  reset(t) {
    this.torchOn = t >= 148.502 && t < TL.burst; this.beam = null; this._click = false;
    const inDive = TL.chapel + 0.42;
    const inside = t >= inDive && t < 158.601 && !(t >= 150.777 && t < 157.947);
    if (this.b.fig) { this.hide(inside); if (t >= 150.777 && t < 156.0) { this.b.place(0, -4.0); this.b.root.position.y = 0.95; this.D.hold('LayToIdle', 0.4, t + 1); } }
    // a start in the middle of her dive (its event already behind us): finish the dive into the casket
    if (t > TL.chapel + 0.01 && t < inDive && this.b.fig) { const left = inDive - t; this.D.slide(0, -3.2, Math.max(0.05, left)); this.f.after(left, () => { if (this.f.t < TL.burst) { this.hide(true); this.tr.sounds && this.tr.sounds.play('woodLight', { x: 0 }); } }); }
  }
  update(dt) {
    const f = this.f, t = f.t;
    const inChapel = t >= TL.chapel && t < TL.burst;
    if (!inChapel && this.inside) this.hide(false);
    if (!inChapel && this.b.dmgMul !== 1) this.b.dmgMul = 1;
    // the hymn board reads only in the torch's light
    const hb = this.tr.set.props.hymn.obj.userData.mat;
    const s = this.beam && !this.beam.done ? this.beam : null;
    let lit = 0;
    if (s && s.ax !== undefined) lit = inShape({ shape: 'cone', x: s.ax, z: s.az, angle: s.ang, w: 18, param: 0.3 }, -8.2, -2.0, 0.4) ? 1 : 0;
    hb.emissiveIntensity += (lit * 0.9 - hb.emissiveIntensity) * Math.min(1, dt * 8);
    if (lit && !this._sign) { this._sign = true; this.tr.sounds && this.tr.sounds.play('tick', { x: -8 }); }
    // the director stands in the doorway with his torch
    this.tr.bearers && this.tr.bearers.updateDirector(dt, inChapel, 8.7, 0.5, -PI / 2);
    if (this.torchLight) { this.torchLight.intensity = inChapel && this.torchOn ? 60 : 0; if (s && s.ax !== undefined) { this.torchLight.position.set(s.ax, 1.6, s.az); this.torchLight.target.position.set(s.ax + Math.sin(s.ang) * 6, 0, s.az + Math.cos(s.ang) * 6); } }
  }
  makeLight() {
    // always in the scene, dark when off: a light that comes and goes would rebuild every shader in the room
    const l = new THREE.SpotLight(0xfff0d0, 0, 22, 0.26, 0.5, 1.5); l.castShadow = false;
    this.f.scene.add(l, l.target); this.torchLight = l;
  }
}

// ------------------------------------------------------------------------------------------------ marks the floor keeps a moment
export class Decals {
  constructor(f) { this.f = f; this.list = []; this.g = new THREE.Group(); f.scene.add(this.g); }
  add(mesh, life, fade = 1) { mesh.renderOrder = 1; this.g.add(mesh); this.list.push({ mesh, t: 0, life, fade }); }
  // a black gloss streak of mascara where the brush swiped
  streak(x, z, a) {
    const g = new THREE.RingGeometry(2.6, 3.3, 24, 1, -0.9, 1.8);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ color: 0x050407, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.9, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.set(-PI / 2, 0, a - PI / 2); m.position.set(x, 0.02, z);
    this.add(m, 5);
  }
  // an open grave snapping open under you (SIX FEET)
  pit(x, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.0), new THREE.MeshBasicMaterial({ color: 0x030204, transparent: true, opacity: 0.95, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.x = -PI / 2; m.position.set(x, 0.02, z); this.add(m, 2.2);
  }
  // the furrow BELOVED ploughs
  furrow(a, b) {
    const len = Math.hypot(b.x - a.x, b.z - a.z); if (len < 0.5) return;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, len), new THREE.MeshStandardMaterial({ color: 0x2a1c16, roughness: 0.95, transparent: true, opacity: 0.85, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    m.rotation.set(-PI / 2, 0, -Math.atan2(b.x - a.x, b.z - a.z) + PI); m.position.set((a.x + b.x) / 2, 0.018, (a.z + b.z) / 2); this.add(m, 9);
  }
  // the pink flood sloshing downhill in the tilt: an uneven spill of deep rose fluid, glossy and see-through. Never a
  // clean bright pink shape: a pink ellipse on the floor reads as one of her catchable telegraphs
  flood() {
    const pts = [];
    for (let i = 0; i < 56; i++) { const a = i / 56 * PI * 2, r = 1 + 0.16 * Math.sin(a * 3 + 1.3) + 0.09 * Math.sin(a * 7 + 0.4) + 0.05 * Math.sin(a * 13 + 2.1); pts.push(new THREE.Vector2(Math.cos(a) * r, Math.sin(a) * r)); }
    const m = new THREE.Mesh(new THREE.ShapeGeometry(new THREE.Shape(pts)), new THREE.MeshStandardMaterial({ color: 0x8a1d44, roughness: 0.04, metalness: 0.25, transparent: true, opacity: 0.5, depthWrite: false, emissive: new THREE.Color(0x14020a), polygonOffset: true, polygonOffsetFactor: -3 }));
    m.rotation.x = -PI / 2; m.position.set(-2, 0.016, 2.5); m.userData.grow = true; this.add(m, 3.2);
  }
  clear() { for (const d of this.list) { this.g.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); } this.list.length = 0; }
  update(dt) {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const d = this.list[i]; d.t += dt;
      if (d.mesh.userData.grow) { const k = Math.min(1, d.t / 1.2); d.mesh.scale.set(1 + 4.2 * k, 1 + 1.6 * k, 1); d.mesh.position.x = -2 + 4 * k; }
      const left = d.life - d.t;
      if (left < 1) d.mesh.material.opacity = Math.max(0, left) * (d.mesh.material.userData.op ?? (d.mesh.material.userData.op = d.mesh.material.opacity));
      if (left <= 0) { this.g.remove(d.mesh); d.mesh.geometry.dispose(); d.mesh.material.dispose(); this.list.splice(i, 1); }
    }
  }
  dispose() { this.clear(); this.f.scene.remove(this.g); }
}
export { mats };
