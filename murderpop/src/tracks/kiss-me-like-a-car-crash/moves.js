// THE WRECK's body and her attacks. She only ever comes toward you and never brakes: every charge that misses you
// ends in whatever was behind you, and the further she ran, the harder she hits it. Distance decides the variant at
// every flexible cue (a head-on from over 5 m, the whiplash inside it; a kiss lunge inside 4 m, a blown kiss beyond).
// Every attack draws its shape on the road first and fills to the exact beat (the song's own seconds).
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { FEEL } from '../../game/player.js';
import { FLOOR, LANE_Z } from './road.js';
import { looseGrenade } from './her.js';

export const U = 2.2;   // the design's damage units in this game's (YOU's strikes here hit about 2.2x the design's numbers)
export const UC = 4.0;  // ...and what the road does to her weighs more: the rule is the fight (strikes on her are halved, see track.js)
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const PORCELAIN = new THREE.Color(2.2, 2.1, 2.0), GOLD = new THREE.Color(3.2, 2.0, 0.55), CHERRY = new THREE.Color(2.4, 0.2, 0.5), LACQUER = new THREE.Color(0.15, 0.12, 0.14);
const SPARK = new THREE.Color(3.2, 2.4, 1.4), GLASS = new THREE.Color(2.4, 2.6, 2.9), DIRT = new THREE.Color(0.35, 0.28, 0.2);
const SURF_BONUS = { car: 10, truck: 10, barrier: 10, board: 10, roadblock: 0, guardrail: 0, krail: 0, boulder: 0, none: 0 };
const SURF_SOUND = { car: 'crunch', truck: 'thud', barrier: 'clang', board: 'crunch', roadblock: 'concrete', guardrail: 'clang', krail: 'concrete', boulder: 'concrete', none: 'thud' };

// YOU's spotlight blinds her: whatever she has started fizzles (its shape was swept off the road, so it must never
// land after the light goes), and she starts nothing while it's on. The world keeps going: what the road, the hill,
// the traffic or a package already in the air does keeps its shape through the spotlight and lands as drawn.
// W.ep counts spotlights; an attack remembers the count it started under and lands only if it hasn't changed.
let WREF = null;
const blind = (f) => f.suppress;
const sameLight = (ep) => !WREF || (WREF.ep === ep && !WREF.f.suppress);
function cue(f, kind, at, world) { if (world && f.suppress) { f.sfx.cue && f.sfx.cue(kind || 'white', f.pan(at.x ?? 0)); } else f.cue(kind, at); }
// the kit's area() (src/game/patterns.js), spotlight-aware: o.world shapes are the road's, never swept away
export function area(f, o) {
  const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
  const world = !!o.world;
  if (!world && blind(f)) return sh;
  const ep = WREF ? WREF.ep : 0;
  if (!o.noTele) {
    const s0 = o.start ?? f.t, start = f.encoreMode ? o.end - (o.end - s0) * 0.72 : s0;
    const tg = { ...sh, kind: o.kind, color: o.color, start, end: o.end, linger: o.linger, follow: o.follow ? () => { const p = o.follow(); sh.x = p.x; sh.z = p.z; if (p.angle !== undefined) sh.angle = p.angle; return p; } : null };
    if (world && WREF) WREF.addWorld(tg); else f.tele.add(tg);
    if (!o.silent) cue(f, o.kind, sh, world);
  }
  f.after(Math.max(0, o.end - f.t), () => {
    if (!world && !sameLight(ep)) { o.onFizzle && o.onFizzle(sh); return; }
    const hit = f.resolveArea(sh, o);
    o.onImpact && o.onImpact(hit, sh);
    if (o.sound !== false) f.sfx.impactArea && f.sfx.impactArea(o.kind === 'pink' ? 'pink' : 'white', f.pan(sh.x), hit);
  });
  return sh;
}
// the kit's lob(): a package in a high arc to a pink circle. Once it's in the air it's the road's (it lands as drawn).
export function lob(f, o) {
  const src = o.from && o.from.x !== undefined ? o.from : f.boss;
  const at = o.at ? { x: o.at.x, z: o.at.z } : { x: f.player.x, z: f.player.z };
  const kind = o.kind || 'pink', r = o.r ?? 1.1;
  const t0 = f.t, t1 = o.end ?? t0 + (o.beats ?? 2) * f.beat, dur = Math.max(0.15, t1 - t0);
  const sx = src.x, sz = src.z, sy = o.fromY ?? 1.7, peak = o.peak ?? Math.min(6, 2.2 + dur * 1.5);
  const place = (q, k) => { q.x = sx + (at.x - sx) * k; q.z = sz + (at.z - sz) * k; q.y = sy + (0.35 - sy) * k + 4 * peak * k * (1 - k); };
  const mesh = o.mesh || null;
  if (mesh) f.scene.add(mesh);
  const p = f.proj.spawn({ x: sx, z: sz, y: sy, angle: 0, speed: 0, kind, shape: o.shape || 'card', size: o.size ?? 0.45, color: o.color, life: dur + 0.08, owner: 'deco', spin: o.spin ?? 2.5, parryable: false,
    fn: (q) => { const k = Math.min(1, Math.max(0, (f.t - t0) / dur)); place(q, k); if (mesh) { mesh.position.set(q.x, q.y, q.z); mesh.rotation.y += 0.05; mesh.rotation.x = Math.sin(k * Math.PI) * 0.6; } } });
  if (kind === 'pink' && !o.silent) f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(sx), kind);
  return area(f, { shape: 'circle', x: at.x, z: at.z, w: r, kind, start: t0, end: t1, damage: o.damage ?? 1, world: true,
    onImpact: (hit, sh) => {
      if (p) p.dead = true;
      if (mesh) f.scene.remove(mesh);
      if (hit === 'parried') {
        const pl = f.player, b = f.boss;
        const q = f.proj.spawn({ x: pl.x, z: pl.z, y: 1.3, angle: toward(pl, b), speed: o.backSpeed ?? 17, kind: 'gold', shape: o.shape || 'card', size: (o.size ?? 0.45) * 1.1, owner: 'you', life: 3, homing: 7, target: () => b, spin: 6 });
        if (q) q.dmgBack = f.lastCatch === 'perfect' ? (o.backPerfect ?? Math.round((o.back ?? 18) * 1.35)) : (o.back ?? 18);
        o.onCaught && o.onCaught(q, sh);
      } else o.onLand && o.onLand(hit, sh);
    } });
}

export class Her {
  constructor(W) {
    WREF = W;
    this.W = W; this.act = null; this.mode = 'approach'; this.modeUntil = 0; this.busyUntil = -1; this.near = 0;
    this.alight = false; this.grenade = null; this.held = null; this.bulge = null; this.eyesOn = 0; this.headTurn = 0; this.headTurnT = 0;
    this.parries = 0;
  }
  get f() { return this.W.f; }
  get b() { return this.W.f.boss; }
  get fig() { return this.W.f.boss.fig; }
  get road() { return this.W.road; }
  get snd() { return this.W.snd; }
  get pl() { return this.W.f.player; }
  dist() { return Math.hypot(this.pl.x - this.b.x, this.pl.z - this.b.z); }
  usable() { const b = this.b; return b.state !== 'finished' && b.state !== 'gone' && !this.bulge; }
  // a telegraph's start in ENCORE: the same impact, less warning
  start(t0, t1) { return this.f.encoreMode ? t1 - (t1 - t0) * 0.72 : t0; }
  expr(name, fade = 0.14) { const fig = this.fig; if (fig && fig.setExpression) fig.setExpression(this.b.hp <= 0 ? 'wreck_wrecked' : name, { fade }); }
  clip(name, o = {}) { const b = this.b; if (!b.rig) return; b.rig.once(name, { fade: 0.08, ...o, then: o.then === undefined ? (this.mode === 'plea' ? 'Walk_Formal_Loop' : b.idleClip) : o.then }); b.busyUntil = this.f.t + (o.duration || 0.5); b._locoClip = ''; }
  endAct() { if (this.act) { const a = this.act; this.act = null; a.end && a.end(); } }
  doAct(a) { this.endAct(); this.act = a; this.b.move = null; }
  claim(until) { this.busyUntil = Math.max(this.busyUntil, until); }

  // ------------------------------------------------------------------ per frame
  update(dt, t) {
    const f = this.f, b = this.b, pl = this.pl;
    if (b.state === 'finished') return;
    if (this.act) {
      if (t >= this.act.until) this.endAct();
      else if (this.act.update) this.act.update(dt, t);
    }
    if (!this.act && !this.bulge && b.state !== 'stagger') this._approach(dt, t);
    // the hold: a clinch keeps YOU where she caught you until a dash breaks it or she shoves
    if (this.held) {
      if (pl.state === 'dash' || t >= this.held.until || pl.state === 'dead') {
        if (pl.state !== 'dash' && pl.state !== 'dead' && t >= this.held.until) { const a = toward(b, pl); pl.vx = Math.sin(a) * 15; pl.vz = Math.cos(a) * 15; this.snd.play('thud', { x: pl.x, gain: 0.6 }); }
        this.held = null;
      } else { pl.x = this.held.x; pl.z = this.held.z; pl.vx = pl.vz = 0; pl._sync && pl._sync(); }
    }
    // the idle rule: hug her for two beats with nothing scripted and she kisses you on the next beat 4 (only while
    // she's coming at you: never in the plea, the bruises, the bridge's answers or the walk away, which are harmless)
    if (!this.act && t > this.busyUntil && this.usable() && b.state === 'perform' && (this.mode === 'approach' || this.mode === 'intro') && !blind(f) && this.dist() < 2.0) {
      this.near += dt;
      if (this.near > f.beat * 2) {
        this.near = 0;
        const bm = f.bm, k = bm.beatAt(t), next4 = Math.ceil(k + 0.6);
        let j = next4; while (((j - 1) % 4 + 4) % 4 !== 3) j++;
        const ti = bm.timeOf(j);
        // nothing scripted: no cue of the song's own between now and just after that beat
        const cues = this.W.cues || [], busy = cues.some((c) => c > t - 0.02 && c < ti + f.beat * 0.6);
        if (ti - t >= f.beat * 0.9 && !busy) this.kissLunge({ impact: ti });
      }
    } else this.near = 0;
    // her head, snapped round by the whiplash (applied after the rig has posed her)
    if (this.headTurnT > 0 && b.rig) {
      const head = b.rig.bones.Head || b.rig.bones.head;
      if (head) head.rotation.y += this.headTurn;
    }
    // the grenade on her: its blast circle rides with her
    if (this.grenade && this.grenade.on === 'her' && this.grenade.g) { this.grenade.g.x = b.x; this.grenade.g.z = b.z; }
    // on the ground she's as solid as the cars, wrecks, rocks and barriers: a lunge or a step never ends inside one
    // (a charge stops at the thing it hits; in the air, on a roof or under the road she's elsewhere)
    if (b.root.position.y < 0.3 && !this.bulge && b.root.visible && b.z > FLOOR.minZ - 0.2) {
      // and two bodies don't share a spot (except in her arms: the clinch, the last kiss)
      const lr = this.W.lastRun, hug = this.held || (lr && lr.heldAt !== undefined) || (this.act && this.act.name === 'headon' && this.act.phase === 'run');
      const ddx = b.x - pl.x, ddz = b.z - pl.z, dd = Math.hypot(ddx, ddz);
      if (!hug && dd < 0.72 && pl.state !== 'dead') { const k = (0.72 - dd) / Math.max(1e-3, dd); b.x += (dd > 1e-3 ? ddx : Math.sin(b.facing + Math.PI)) * (dd > 1e-3 ? k : 0.72); b.z += (dd > 1e-3 ? ddz : Math.cos(b.facing + Math.PI)) * (dd > 1e-3 ? k : 0.72); if (b.move) b.move = null; }
      // and a push never puts her inside the K-rail or through the guardrail, the truck or the roadblock (going over
      // them at speed is the ring-out and the live lane, which are elsewhere)
      if (!(this.act && (this.act.name === 'ringout' || this.act.name === 'lane'))) {
        const cx = clamp(b.x, FLOOR.minX + 0.42, FLOOR.maxX - 0.42), cz = clamp(b.z, FLOOR.minZ + 0.42, FLOOR.maxZ - 0.42);
        if (cx !== b.x || cz !== b.z) { b.x = cx; b.z = cz; if (b.move) b.move = null; b._sync(); }
      }
      const r = this.road.resolve(b.x, b.z, 0.42);
      if (Math.abs(r.x - b.x) + Math.abs(r.z - b.z) > 1e-4) { b.x = r.x; b.z = r.z; if (b.move) { b.move.tx = r.x; b.move.tz = r.z; b.move.fx = r.x; b.move.fz = r.z; } b._sync(); }
    }
  }

  _approach(dt, t) {
    const b = this.b, pl = this.pl, d = this.dist();
    if (b.state !== 'perform' && b.state !== 'open' && b.state !== 'desperate') return;
    if (b.busy) return;
    const m = this.mode;
    if (m === 'stand' || m === 'hold' || m === 'dead') return;
    let speed = d > 10 ? 4.0 : 1.8;
    if (m === 'plea') speed = 1.2;
    if (m === 'zombie') speed = 1.8;
    if (m === 'slow') speed = 0.9;
    if (m === 'intro') speed = 1.4;
    if (b.hp <= 0) speed = 1.3;
    if (d < 1.6) return;
    if (m === 'away') {           // the only time she turns her back: away down the road, from YOU
      const dir = pl.x > b.x ? -1 : 1;
      let nx = b.x + dir * 1.1 * dt;
      nx = clamp(nx, FLOOR.minX + 1.2, FLOOR.maxX - 1.2);
      b.x = nx; b.facing = dir > 0 ? Math.PI / 2 : -Math.PI / 2; b._sync(); return;
    }
    const a = toward(b, pl);
    let nx = b.x + Math.sin(a) * speed * dt, nz = b.z + Math.cos(a) * speed * dt;
    const r = this.road.resolve(nx, nz, 0.5); nx = clamp(r.x, FLOOR.minX + 0.5, FLOOR.maxX - 0.5); nz = clamp(r.z, FLOOR.minZ + 0.5, FLOOR.maxZ - 0.5);
    b.x = nx; b.z = nz; b._sync();
  }

  // YOU's spotlight swung onto YOU: she's blinded. What she was winding up stops (its shape is already gone);
  // a charge already under way, a leap in the air or the last run carry on (they can't touch YOU while it's on).
  blinded() {
    const a = this.act; if (!a) return;
    if ((a.name === 'headon' && a.phase === 'set') || a.name === 'whiplash' || a.name === 'kiss') {
      this.endAct(); const b = this.b; if (b.rig) b.rig.play(b.idleClip, { fade: 0.15 }); b.busyUntil = this.f.t; b._locoClip = '';
    }
  }

  // a mode for a stretch of song: 'plea' (arms open, slow, harmless), 'zombie' (arms out), 'stand', 'away', 'slow'
  setMode(mode, until) {
    const b = this.b; this.mode = mode; this.modeUntil = until ?? Infinity;
    if (!b.rig) return;
    if (mode === 'plea' || mode === 'slow') {
      b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Walk_Formal_Loop'; b.idle = 'Spell_Simple_Idle_Loop';
      b.rig.upperOnce('Spell_Simple_Enter', { duration: 0.35 });
      this.f.after(0.35, () => { if (this.mode === mode) b.rig.upperOnce('Spell_Simple_Idle_Loop', { duration: Math.max(0.5, (until ?? this.f.t + 3) - this.f.t), weight: 1 }); });
      if (mode === 'plea') this.expr('wreck_plea');
    } else if (mode === 'zombie') { b.walkClip = 'Zombie_Walk_Fwd_Loop'; b.runClip = 'Zombie_Walk_Fwd_Loop'; b.idle = 'Zombie_Walk_Fwd_Loop'; b.rig.upperStop(); }
    else { b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Jog_Fwd_Loop'; b.idle = 'Idle_Talking_Loop'; b.rig.upperStop(); if (mode === 'approach') this.expr('wreck_stare'); }
    b._locoClip = '';
  }

  // ------------------------------------------------------------------ HEAD-ON: "Kiss me like a car crash"
  // a WHITE lane from her through YOU to the first thing in its way; it tracks YOU until the lock (a flash and a glassy
  // tick), she launches and is flat out as she passes YOU's locked spot on the impact beat, then hits what's beyond.
  headOn(o) {
    const f = this.f, b = this.b, t = f.t;
    if (!this.usable() || b.state === 'finished' || blind(f)) return;
    if (!o.always && this.dist() <= 5) return this.whiplash({ impact: o.impact });
    this.endAct(); b.move = null;
    if (b.state === 'stagger') b.state = 'perform';
    const kind = o.kind || 'white', w = o.w ?? 0.8;
    const g = f.tele.add({ shape: 'rect', x: b.x, z: b.z, angle: toward(b, this.pl), w, h: 4, kind, start: this.start(t, o.impact), end: o.impact, linger: 0.06 });
    f.cue(kind, b);
    this.claim(o.impact + f.beat * 2);
    this.expr(o.last ? 'wreck_kiss' : 'wreck_stare');
    if (b.rig) { b.rig.upperStop(); b.rig.play('Crouch_Idle_Loop', { fade: 0.12 }); }
    b.busyUntil = o.lock + 0.05;
    this.snd.play('heel', { x: b.x }); this.snd.play('roar', { x: b.x, gain: o.car ? 0 : 0.9, rate: 1.4 / Math.max(0.6, o.lock - t + 0.35) });
    const act = { name: 'headon', phase: 'set', g, o, until: o.impact + 8, ep: this.W.ep };
    act.update = (dt, tt) => {
      if (act.phase === 'set') {
        const a = toward(b, this.pl);
        b.facing += clamp(angDiff(a, b.facing), -9.4 * dt, 9.4 * dt); b._sync();
        const r = this.road.ray(b.x, b.z, Math.sin(a), Math.cos(a));
        g.x = b.x; g.z = b.z; g.angle = a; g.h = Math.max(1.2, r.d + 0.5);
        if (o.steer && tt < o.lock) { /* the last run steers: she's already moving */ }
        if (tt >= o.lock) this._launch(act, a, r);
      } else if (act.phase === 'run') this._run(act, dt, tt);
    };
    act.end = () => { if (act.g) act.g.dead = act.phase === 'set'; if (act.trail) act.trail.live = false; if (act.phase !== 'down') b.busyUntil = this.f.t; };
    this.doAct(act);
  }
  _launch(act, a, r) {
    const f = this.f, b = this.b, o = act.o, pl = this.pl;
    const dx = Math.sin(a), dz = Math.cos(a);
    const dYou = Math.max(0.5, (pl.x - b.x) * dx + (pl.z - b.z) * dz);
    const T = Math.max(0.2, o.impact - f.t);
    const v = Math.max(o.minV ?? 11, dYou / (0.8 * T));
    // she passes YOU's locked spot on the impact beat, never before it: from close up she holds the crouch a moment
    // and goes late (the run covers 0.8 * v * time: 40% of it accelerating, then flat out)
    const Tr = Math.min(T, dYou / (0.8 * v));
    act.phase = 'run'; act.dx = dx; act.dz = dz; act.sx = b.x; act.sz = b.z; act.t0 = f.t + (T - Tr); act.T = Tr; act.v = v; act.acc = v / (0.4 * Tr); act.ta = 0.4 * Tr;
    act.stop = Math.max(0.6, r.d); act.hit = r; act.s = 0; act.touched = false; act.go = false;
    act.g.angle = a; act.g.h = act.stop + 0.5;
    // the lock: a flash and a glassy tick on the beat
    this.snd.play('tick', { x: b.x });
    f.fx.sparks(b.x, 0.3, b.z, new THREE.Color(2.6, 2.8, 3.2), 10);
    b.busyUntil = f.t + 30;
    this.snd.play('whoosh', { x: b.x, at: Math.max(0, T - 0.32), gain: 1 });
  }
  // off the line
  _go(act) {
    const f = this.f, b = this.b, v = act.v;
    act.go = true;
    if (b.rig) b.rig.play(v > 20 ? 'Shield_Dash' : 'Sprint_Loop', { fade: 0.06, speed: v > 20 ? 0.001 : Math.min(2.2, v / 7) });
    if (v > 20) act.trail = f.fx.trail(() => new THREE.Vector3(b.x, 1.1, b.z), { w: 0.35, color: new THREE.Color(3.2, 1.4, 2.0), len: 22, life: 0.35 });
    this.road.knock(b.x, b.z, 0.8, act.dx, act.dz, v);
  }
  _run(act, dt, t) {
    const f = this.f, b = this.b, pl = this.pl;
    const tau = t - act.t0;
    if (tau < 0) { b.facing = Math.atan2(act.dx, act.dz); b._sync(); return; }     // locked, crouched, waiting to go
    if (!act.go) this._go(act);
    const s = tau < act.ta ? 0.5 * act.acc * tau * tau : 0.5 * act.v * act.ta + act.v * (tau - act.ta);
    const s1 = Math.min(s, act.stop);
    const px = act.sx + act.dx * act.s, pz = act.sz + act.dz * act.s;
    b.x = act.sx + act.dx * s1; b.z = act.sz + act.dz * s1; b.facing = Math.atan2(act.dx, act.dz); b._sync();
    // contact: YOU in her path between last frame and this one (not if YOU's spotlight blinded her since she set)
    if (!act.touched && s1 > act.s && sameLight(act.ep)) {
      const seg = { shape: 'rect', x: px - act.dx * 0.5, z: pz - act.dz * 0.5, angle: Math.atan2(act.dx, act.dz), w: (act.o.w ?? 0.8) + 0.1, h: s1 - act.s + 1.0 };
      if (inShape(seg, pl.x, pl.z, FEEL.radius * 0.8)) {
        act.touched = true;
        const res = f.resolveArea(seg, { kind: act.o.kind || 'white', damage: act.o.damage ?? 1, melee: true });
        act.res = res;
        if (res === 'hit') this.snd.play('thud', { x: pl.x });
        if (act.o.onContact) act.o.onContact(res);
      }
    }
    this.road.knock(b.x, b.z, 0.9, act.dx, act.dz, act.v);
    act.s = s1;
    if (s >= act.stop) this._crash(act);
  }
  _crash(act) {
    const f = this.f, b = this.b, r = act.hit, o = act.o;
    if (act.trail) act.trail.live = false;
    act.phase = 'down';
    if (act.g) act.g.dead = true;
    const run = Math.hypot(b.x - act.sx, b.z - act.sz) + 0.5, v = act.v;
    if (o.onCrash && o.onCrash(r, run, v) === false) return;
    if (o.burning && this.alight) this.W.burnLane = { x: act.sx, z: act.sz, dx: act.dx, dz: act.dz, len: run, until: f.t + f.beat };
    this.crash(r.type, r.s, run, v, act.dx, act.dz, r.nx, r.nz);
  }
  // her crash, the rule's payoff: damage 30 + 2.5 a metre of run beyond 4 m (to 80), plus what she hit
  crash(type, s, run, v, dx, dz, nx = 0, nz = 0, o = {}) {
    const f = this.f, b = this.b, fast = v > 25;
    let bonus = SURF_BONUS[type] ?? 0;
    if (fast && (type === 'guardrail' || type === 'roadblock')) bonus += 20;
    if (fast && type === 'krail') bonus += 30;
    const base = Math.min(80, 30 + 2.5 * Math.max(0, run - 4));
    const dmg = UC * (base + bonus);
    const hx = b.x + dx * 0.5, hz = b.z + dz * 0.5;
    if (!o.paid) {           // (the last run pays as she passes YOU: here it's only the wreck)
      const res = b.takeHit({ dmg, kind: 'crash', heavy: true, x: hx, z: hz, onBeat: false });
      if (res && res.landed) f._good && f._good(120 + Math.round(run * 12));
    }
    if (b.fig && b.fig.hitAt) b.fig.hitAt(new THREE.Vector3(hx, 1.2, hz), new THREE.Vector3(-dx, 0, -dz), { power: 1.6 + run * 0.03 });
    // what it looks and sounds like, scaled by the run
    const big = Math.min(1, run / 18);
    f.fx.sparks(hx, 1.0, hz, SPARK, 16 + Math.round(24 * big), Math.atan2(-dx, -dz));
    f.fx.chips(hx, 1.2, hz, PORCELAIN, 14 + Math.round(16 * big));
    f.fx.chips(hx, 1.2, hz, type === 'car' ? GLASS : type === 'truck' ? CHERRY : LACQUER, 8 + Math.round(10 * big));
    f.fx.glitter(hx, 1.3, hz, GOLD, 10 + Math.round(20 * big), 0.8);
    f.cam.shake(0.45 + 0.75 * big, 0.18 + 0.14 * big); if (big > 0.4) f.cam.kick(0.6 + big);
    this.snd.play(SURF_SOUND[type] || 'thud', { x: hx, gain: 0.7 + 0.3 * big });
    this.snd.play('thud', { x: hx, gain: 0.5 + 0.4 * big, at: 0.02 });
    if (run > 12) this.snd.play('boom', { x: hx, gain: 0.25 + 0.3 * big, rate: 1.3, at: 0.03 });
    this.snd.play('glass', { x: hx, gain: 0.35 + 0.3 * big, at: 0.08 });
    this.W.flashAt && this.W.flashAt(hx, 1.0, hz, 5 + 6 * big, 0.22);
    if (s) s.hits = (s.hits || 0) + 1;
    if (type === 'car') this.snd.play('chirp', { x: hx, at: 0.25 });
    if (type === 'boulder' && s && s.obj) { if (s.hits >= 2) { f.fx.chips(s.x, 0.6, s.z, new THREE.Color(0.5, 0.48, 0.46), 40); this.snd.play('concrete', { x: s.x, at: 0.05 }); } else s.obj.scale.setScalar(0.9); }
    if (type === 'barrier' && s && s.obj) s.obj.rotation.z = (dx > 0 ? -1 : 1) * 0.35;
    if (type === 'truck') { f.fx.glitter(hx, 1.4, hz, new THREE.Color(3.0, 0.4, 1.0), 40, 1.6); this.road.gust(hx + 1, hz, 1, 0, 16, 3.2); f.fx.chips(hx, 1.2, hz, new THREE.Color(2.4, 0.25, 0.6), 30); }
    // stunned in the wreck: 2 beats + 1 per 6 m beyond 4 m, at most 5 (fully hittable), then up laughing
    const stun = Math.min(5, 2 + Math.floor(Math.max(0, run - 4) / 6)) * f.beat;
    if (fast && type === 'guardrail') return this._ringOut(stun);
    if (fast && type === 'krail') return this._overRail();
    this.down(stun);
  }
  // down in the wreck for `sec`, then she gets up laughing
  down(sec, { face = true } = {}) {
    const f = this.f, b = this.b;
    b.move = null;
    if (b.rig) { b.rig.upperStop(); b.rig.once('Hit_Knockback', { duration: 0.22, fade: 0.04, then: null }); }
    const t0 = f.t;
    const act = { name: 'down', until: t0 + sec + 0.6, laid: false, up: false };
    act.update = (dt, t) => {
      if (!act.laid && t >= t0 + 0.2) { act.laid = true; if (b.rig) b.rig.once('Death01', { duration: 0.45, from: 0.0, to: 1.0, fade: 0.06, then: null }); }
      if (!act.up && t >= t0 + sec) { act.up = true; this.expr('wreck_grin'); if (b.rig) b.rig.once('LayToIdle', { speed: 1.5, fade: 0.1, then: b.idleClip }); b.busyUntil = t + 0.55; }
    };
    act.end = () => { if (!act.up && b.rig) b.rig.play(b.idleClip, { fade: 0.2 }); this.f.after(0.7, () => this.expr('wreck_stare')); };
    b.busyUntil = t0 + sec + 0.6;
    this.doAct(act);
    if (b.state === 'perform') b.open(sec);
  }
  // over the guardrail at speed: down the embankment, gone two beats, back over it (open a beat)
  _ringOut(stun) {
    const f = this.f, b = this.b, t0 = f.t, beat = f.beat;
    const sx = b.x, sz = b.z;
    if (b.rig) b.rig.once('Jump_Start', { duration: 0.3, then: 'Jump_Loop' });
    const act = { name: 'ringout', until: t0 + beat * 3.2 };
    act.update = (dt, t) => {
      const u = (t - t0) / (beat * 3);
      if (u < 0.3) { const k = u / 0.3; b.x = sx; b.z = sz + k * 2.6; b.root.position.y = Math.sin(k * Math.PI) * 1.2 - k * 2.2; }
      else if (u < 0.72) { b.root.visible = false; }
      else { b.root.visible = true; const k = clamp((u - 0.72) / 0.28, 0, 1); b.z = lerp(sz + 2.6, FLOOR.maxZ - 2.0, k); b.root.position.y = Math.sin(k * Math.PI) * 1.6 - (1 - k) * 2.2; if (k >= 1 && !act.landed) { act.landed = true; b.root.position.y = 0; this.snd.play('thud', { x: b.x }); if (b.rig) b.rig.once('Jump_Land', { duration: 0.3 }); } }
      b._sync();
    };
    act.end = () => { b.root.visible = true; b.root.position.y = 0; b.z = Math.min(b.z, FLOOR.maxZ - 1.2); b._sync(); if (b.state === 'perform') b.open(beat); };
    this.doAct(act);
  }
  // over the K-rail at speed: into the live lane, where the next car hits her; then she pounces back at YOU
  _overRail() {
    const f = this.f, b = this.b, t0 = f.t, beat = f.beat, sx = b.x;
    if (b.rig) b.rig.once('Jump_Start', { duration: 0.25, then: 'Crouch_Idle_Loop' });
    const act = { name: 'lane', until: t0 + beat * 4.5, hit: false, pounced: false };
    act.update = (dt, t) => {
      const u = t - t0;
      if (u < 0.3) { const k = u / 0.3; b.z = lerp(FLOOR.minZ + 0.4, LANE_Z, k); b.root.position.y = Math.sin(k * Math.PI) * 1.5; }
      else { b.z = LANE_Z; b.root.position.y = u > 0.55 ? 1.35 : 0; }
      if (!act.hit && u >= 0.4) { act.hit = true; b.takeHit({ dmg: U * 0, kind: 'car', heavy: true, x: b.x + 1, z: b.z }); this.snd.play('crunch', { x: b.x }); f.fx.chips(b.x, 1.2, b.z, PORCELAIN, 18); f.cam.shake(0.5, 0.15); }
      if (u > 0.55) b.x = sx - (u - 0.55) * 14;      // riding the roof, carried left
      b.x = Math.max(FLOOR.minX + 0.5, b.x);
      b._sync();
      if (!act.pounced && u >= beat * 2) { act.pounced = true; const bm = f.bm, k = Math.ceil(bm.beatAt(t)) + 1; this.pounce({ lock: bm.timeOf(k), land: bm.timeOf(k + 1), fromRoof: true }); }
    };
    act.end = () => { b.root.position.y = 0; };
    this.doAct(act);
  }

  // ------------------------------------------------------------------ WHIPLASH: "Break my fucking neck"
  // her head snaps 180 deg with a crack, then her body whips round after it: a WHITE arc band (1.2 .. 4.5 m, 90 deg
  // either side) toward YOU. Back out past 4.5 m, dash through it, or hug her inside 1.2 m.
  whiplash(o) {
    const f = this.f, b = this.b, t = f.t;
    if (!this.usable() || blind(f)) return;
    this.endAct(); b.move = null;
    if (b.state === 'stagger') b.state = 'perform';
    const a = toward(b, this.pl);
    arc(f, { x: b.x, z: b.z, angle: a, w: 4.5, h: 3.3, param: Math.PI / 2, start: this.start(t, o.impact), end: o.impact,
      onImpact: (hit) => { if (hit === 'miss' || hit === 'dodged') this.f.after(0.05, () => { if (b.state === 'perform') b.open(f.beat); }); } });
    this.claim(o.impact + f.beat);
    // the snap
    this.snd.play('snap', { x: b.x }); this.headTurn = Math.PI; this.headTurnT = 1;
    this.expr('wreck_grin');
    b.faceNow(this.pl.x, this.pl.z);
    const act = { name: 'whiplash', until: o.impact + 0.35 };
    act.update = (dt, tt) => {
      if (!act.swung && tt >= o.impact - 0.16) { act.swung = true; this.headTurnT = 0; this.headTurn = 0; if (b.rig) b.rig.once('Sword_Regular_C', { from: 0.02, to: 0.36, duration: 0.32, fade: 0.04, then: b.idleClip }); this.snd.play('whoosh', { x: b.x, rate: 0.8 }); }
      b.facing = a; b._sync();
    };
    act.end = () => { this.headTurnT = 0; this.headTurn = 0; };
    if (b.rig) b.rig.play('Idle_Shield_Loop', { fade: 0.1 });
    this.doAct(act);
  }

  // ------------------------------------------------------------------ kisses
  // a kiss cue: within 4 m the KISS LUNGE, beyond it the BLOWN KISS (thrown now, arriving on the impact)
  kiss(o) { if (!this.usable() || blind(this.f)) return; if (this.dist() <= 4) { const f = this.f; const t1 = o.impact - f.beat; if (t1 > f.t + 0.02) f.at(t1, () => this.kissLunge({ impact: o.impact, ...o })); else this.kissLunge(o); } else this.blownKiss(o); }
  // KISS LUNGE: a PINK cone (4 m, 25 deg) a beat ahead and a 3 m lunge on the beat. Parry it and she recoils, open.
  kissLunge(o) {
    const f = this.f, b = this.b, t = f.t;
    if (!this.usable() || blind(f)) return;
    if (this.act && this.act.name !== 'down') return;
    this.endAct(); b.move = null;
    const a = toward(b, this.pl), r = o.r ?? 4, half = (o.half ?? 25) * Math.PI / 180;
    area(f, { shape: 'cone', x: b.x, z: b.z, angle: a, w: r, param: half, kind: 'pink', start: Math.min(t, o.impact - f.beat * 0.6), end: o.impact, damage: 1, melee: true,
      onImpact: (hit) => { if (hit === 'parried') { this.parries++; if (b.rig) b.rig.once('Hit_Chest', { duration: 0.3 }); this.snd.play('clink', { x: b.x }); } o.onImpact && o.onImpact(hit); } });
    this.claim(o.impact + 0.2);
    this.expr('wreck_kiss');
    b.faceNow(this.pl.x, this.pl.z);
    const lunge = Math.min(o.lunge ?? 3, Math.max(0, this.dist() - 0.9));     // a kiss, not a tackle: she stops at YOU's lips
    const ex = clamp(b.x + Math.sin(a) * lunge, FLOOR.minX + 0.5, FLOOR.maxX - 0.5), ez = clamp(b.z + Math.cos(a) * lunge, FLOOR.minZ + 0.5, FLOOR.maxZ - 0.5);
    const act = { name: 'kiss', until: o.impact + 0.25 };
    act.update = (dt, tt) => { if (!act.go && tt >= o.impact - 0.15) { act.go = true; b.moveTo(ex, ez, 0.15, { easing: 'in', now: tt }); if (b.rig) b.rig.once('Sword_Dash', { from: 0.1, to: 0.45, duration: 0.3, then: b.idleClip }); this.snd.play('whoosh', { x: b.x, rate: 1.3, gain: 0.7 }); } };
    act.end = () => { this.f.after(0.3, () => this.expr('wreck_stare')); };
    this.doAct(act);
  }
  // BLOWN KISS: a pink kiss flying straight at where YOU were, landing on the beat; a pink circle where it lands
  blownKiss(o) {
    const f = this.f, b = this.b, t = f.t, pl = this.pl;
    if (!this.usable() || blind(f)) return;
    // in her arms already: a kiss blown from here would be on YOU before it was ever seen. She lunges instead.
    if (this.dist() < 2.2) return this.kissLunge(o);
    const tx = pl.x, tz = pl.z, a = toward(b, pl);
    const sx = b.x + Math.sin(a) * 0.8, sz = b.z + Math.cos(a) * 0.8;
    const d = Math.hypot(tx - sx, tz - sz), dur = Math.max(0.2, o.impact - t);
    f.tele.add({ shape: 'circle', x: tx, z: tz, w: 0.9, kind: 'pink', start: this.start(t, o.impact), end: o.impact });
    f.proj.spawn({ x: sx, z: sz, y: 1.5, angle: Math.atan2(tx - sx, tz - sz), speed: d / dur, kind: 'pink', shape: 'kiss', size: 0.5, life: dur + 0.35, spin: 0 });
    f.sfx.fire && f.sfx.fire('kiss', f.pan(sx), 'pink');
    this.expr('wreck_kiss');
    if (b.rig) b.rig.upperOnce('Spell_Simple_Shoot', { duration: 0.35 });
    b.faceNow(pl.x, pl.z);
    this.claim(t + 0.4);
    this.f.after(0.5, () => { if (!this.act) this.expr('wreck_stare'); });
  }

  // ------------------------------------------------------------------ GRAB: "hold me close"
  grab(o) {
    const f = this.f, b = this.b, t = f.t;
    if (!this.usable() || blind(f)) return;
    if (this.act && this.act.name === 'headon') return;
    this.claim(o.impact + 0.3);
    this.snd.play('creak', { x: b.x });
    area(f, { shape: 'circle', x: b.x, z: b.z, w: o.r ?? 2.4, kind: 'pink', start: this.start(t, o.impact), end: o.impact, damage: o.damage ?? 1, melee: true, linger: 0.07, follow: () => ({ x: b.x, z: b.z }),
      onImpact: (hit) => {
        if (hit === 'hit') { this.held = { x: this.pl.x, z: this.pl.z, until: f.t + f.beat }; this.snd.play('thud', { x: b.x, gain: 0.5 }); o.onHold && o.onHold(); }
        if (hit === 'parried' && b.rig) b.rig.once('Hit_Chest', { duration: 0.35 });
        o.onImpact && o.onImpact(hit);
      } });
    if (b.rig) b.rig.upperOnce('Zombie_Scratch', { duration: Math.max(0.3, o.impact - t + 0.25), from: 0.0, to: 0.7 });
    this.expr('wreck_kiss');
    this.f.after(o.impact - t + 0.4, () => { if (!this.act) this.expr(this.mode === 'plea' ? 'wreck_plea' : 'wreck_stare'); });
  }

  // ------------------------------------------------------------------ POUNCE: a WHITE circle on YOU, locks a beat before she lands
  pounce(o) {
    const f = this.f, b = this.b, t = f.t, pl = this.pl, r = o.r ?? 1.8;
    if (!this.usable() || blind(f)) return;
    this.endAct(); b.move = null;
    const ep = this.W.ep;
    const sh = { shape: 'circle', x: pl.x, z: pl.z, w: r };
    let lx = pl.x, lz = pl.z, locked = false;
    const g = f.tele.add({ shape: 'circle', x: pl.x, z: pl.z, w: r, kind: 'white', start: this.start(t, o.land), end: o.land, follow: () => { if (f.t < o.lock) { lx = pl.x; lz = pl.z; } else if (!locked) { locked = true; const d = Math.hypot(lx - b.x, lz - b.z); if (d > 12) { lx = b.x + (lx - b.x) / d * 12; lz = b.z + (lz - b.z) / d * 12; } this.snd.play('tick', { x: lx, gain: 0.7 }); } return { x: lx, z: lz }; } });
    f.cue('white', pl);
    this.claim(o.land + 0.3);
    if (b.rig) b.rig.once('NinjaJump_Start', { duration: 0.25, then: 'NinjaJump_Idle_Loop' });
    this.snd.play('creak', { x: b.x, gain: 0.6 });
    const sx = b.x, sz = b.z, sy = b.root.position.y, t0 = t;
    const act = { name: 'pounce', until: o.land + 0.4 };
    act.update = (dt, tt) => {
      const tl = Math.max(t0 + 0.05, o.lock - 0.15);
      if (tt < tl) { b.faceNow(pl.x, pl.z); return; }
      const k = clamp((tt - tl) / (o.land - tl), 0, 1);
      b.x = lerp(sx, lx, k); b.z = lerp(sz, lz, k); b.root.position.y = lerp(sy, 0, k) + Math.sin(k * Math.PI) * 2.6; b.facing = Math.atan2(lx - sx, lz - sz); b._sync();
      if (k >= 1 && !act.landed) {
        act.landed = true; b.root.position.y = 0;
        if (sameLight(ep)) { const hit = f.resolveArea({ shape: 'circle', x: lx, z: lz, w: r }, { kind: 'white', damage: 1, melee: true }); f.sfx.impactArea && f.sfx.impactArea('white', f.pan(lx), hit); }
        this.snd.play('thud', { x: lx }); f.fx.dust(lx, lz, 12); f.cam.shake(0.4, 0.12);
        if (b.rig) b.rig.once('NinjaJump_Land', { duration: 0.3, then: b.idleClip });
        g.dead = true;
      }
    };
    act.end = () => { b.root.position.y = 0; };
    this.doAct(act);
  }

  // ------------------------------------------------------------------ THE BOMB: a heart gift box lobbed at YOU on "Fuck"
  // caught, it flies back gold, sticks to her and goes off on "bomb threat"; not caught, it ticks in a WHITE circle
  bomb(o) {
    const f = this.f, b = this.b, t = f.t, W = this.W;
    if (!this.usable() || blind(f)) return;
    const mesh = W.giftBox();
    this.claim(o.land);
    if (b.rig) b.rig.upperOnce('OverhandThrow', { duration: 0.4, from: 0.2, to: 0.7 });
    this.snd.play('whoosh', { x: b.x, rate: 0.7, gain: 0.6 });
    lob(f, { from: b, at: { x: this.pl.x, z: this.pl.z }, end: o.land, r: 1.0, kind: 'pink', shape: 'heart', size: 0.6, peak: o.peak ?? 5, mesh, back: 0, fromY: 2.0,
      onCaught: (q) => { if (q) q.dead = true; this._stick(o.blast, o.dmg ?? 40); },
      onLand: (hit, sh) => {
        if (hit === 'hit') { f.fx.glitter(sh.x, 0.5, sh.z, new THREE.Color(3, 0.6, 1.4), 20, 0.8); return; }
        // it ticks where it fell
        const box = W.giftBox(); box.position.set(sh.x, 0.15, sh.z); f.scene.add(box);
        const tick = () => { if (f.t < o.blast - 0.05 && box.parent) { this.snd.play('clock', { x: sh.x }); f.after(f.beat / 2, tick); } };
        tick();
        area(f, { shape: 'circle', x: sh.x, z: sh.z, w: 3.2, kind: 'white', start: f.t, end: o.blast, damage: 1, world: true, linger: 0.08,
          onImpact: () => { f.scene.remove(box); this._boom(sh.x, sh.z, 3.2, 0.9); if (Math.hypot(b.x - sh.x, b.z - sh.z) < 3.2 + 0.4) b.takeHit({ dmg: UC * 30, kind: 'bomb', heavy: true, x: sh.x, z: sh.z }); } });
      } });
  }
  _stick(blast, dmg) {
    // the box flies back to her chest and sticks; it goes off on the beat
    const f = this.f, b = this.b, W = this.W;
    const box = W.giftBox(); f.scene.add(box);
    const from = new THREE.Vector3(this.pl.x, 1.2, this.pl.z), t0 = f.t, dur = Math.min(0.35, Math.max(0.12, blast - t0 - 0.05));
    const act = { box, t0, dur, until: blast + 0.1 };
    W.stuck.push(act);
    f.after(Math.max(0, blast - f.t), () => {
      f.scene.remove(box); W.stuck = W.stuck.filter((s) => s !== act);
      this._boom(b.x, b.z, 1.6, 1.0);
      b.takeHit({ dmg: UC * dmg, kind: 'bomb', heavy: true, x: b.x, z: b.z });
      if (b.fig && b.fig.hitAt) b.fig.hitAt(new THREE.Vector3(b.x, 1.3, b.z + 0.2), new THREE.Vector3(0, 0, -1), { power: 2 });
      this.expr('wreck_grin');
    });
    act.from = from;
  }
  _boom(x, z, r, k = 1) {
    const f = this.f;
    this.snd.play('boom', { x, gain: 0.7 * k + 0.3 });
    f.fx.flash(new THREE.Color(0.36, 0.2, 0.26), 0.6 * k); f.cam.shake(0.8 * k, 0.25); f.cam.kick(1.2 * k);
    f.fx.sparks(x, 0.6, z, new THREE.Color(3.4, 1.6, 2.2), 30); f.fx.glitter(x, 0.8, z, new THREE.Color(3.4, 0.8, 1.8), 40, r * 0.6); f.fx.dust(x, z, 14);
    this.W.flashAt && this.W.flashAt(x, 1.2, z, r * 2.5, 0.3, new THREE.Color(1.0, 0.5, 0.7));
  }

  // ------------------------------------------------------------------ WHISKEY BOTTLES: one landing on every snare
  bottle(o) {
    const f = this.f, b = this.b, W = this.W;
    if (!this.usable() || blind(f)) return;
    if (b.rig) b.rig.upperOnce('OverhandThrow', { duration: 0.27, from: 0.25, to: 0.7 });
    lob(f, { from: b, at: { x: this.pl.x, z: this.pl.z }, end: o.land, r: 0.9, kind: 'pink', shape: 'pill', size: 0.42, peak: 3, back: U * 15, fromY: 1.9,
      onCaught: () => { this.snd.play('clink', { x: this.pl.x, gain: 0.8 }); },
      onLand: (hit, sh) => { this.snd.play('glass', { x: sh.x, gain: 0.8 }); f.fx.chips(sh.x, 0.3, sh.z, new THREE.Color(2.2, 1.2, 0.3), 10); W.puddle(sh.x, sh.z); } });
  }

  // ------------------------------------------------------------------ THE BURIAL: dirt on "lie"
  burial(o) {
    const f = this.f, pl = this.pl, r = o.r ?? 2.2;
    if (blind(f)) return;
    const ep = this.W.ep;
    let lx = pl.x, lz = pl.z;
    const g = f.tele.add({ shape: 'circle', x: pl.x, z: pl.z, w: r, kind: 'white', start: this.start(f.t, o.impact), end: o.impact, linger: 0.07, follow: () => { if (f.t < o.lock) { lx = pl.x; lz = pl.z; } return { x: lx, z: lz }; } });
    f.cue('white', pl);
    this.snd.play('rumble', { x: pl.x, gain: 0.5, rate: 1.2 });
    f.after(Math.max(0, o.impact - f.t), () => {
      g.dead = true;
      if (!sameLight(ep)) return;
      const hit = f.resolveArea({ shape: 'circle', x: lx, z: lz, w: r }, { kind: 'white', damage: o.damage ?? 2 });
      this.snd.play('splash', { x: lx, rate: 0.6, gain: 0.9 }); this.snd.play('concrete', { x: lx, gain: 0.6 });
      f.fx.chips(lx, 2.5, lz, DIRT, 40); f.fx.dust(lx, lz, 18); f.cam.shake(0.6, 0.2);
      this.road.addMark('dirt', lx, lz, { r: r * 0.95 });
    });
  }

  // ------------------------------------------------------------------ the grenade (the bridge)
  grenadeOff() {   // she unclips it from the sash: it's in her hand
    const fig = this.fig; if (!fig) return;
    const acc = fig.acc && fig.acc.find((a) => a.name === 'grenade');
    if (acc) for (const o of acc.objects) o.visible = false;
    const hand = fig.bones.hand_r || fig.bones.hand_l;
    if (hand && !this.handNade) { const g = looseGrenade(); g.scale.setScalar(1.4 / fig.scale); hand.add(g); g.position.set(0, 0.08 / fig.scale, 0.03 / fig.scale); this.handNade = g; }
    if (this.handNade) this.handNade.visible = true;
  }
  grenadeOn() { // back on the sash (rewinds)
    const fig = this.fig; if (!fig) return;
    const acc = fig.acc && fig.acc.find((a) => a.name === 'grenade');
    if (acc) for (const o of acc.objects) o.visible = true;
    if (this.handNade) this.handNade.visible = false;
    this.grenade = null;
  }
}
const lerp = (a, b, k) => a + (b - a) * k;
// a WHITE arc band (the whiplash, the backhand)
export function arc(f, o) {
  const sh = { shape: 'arc', x: o.x, z: o.z, angle: o.angle, w: o.w, h: o.h, param: o.param };
  if (blind(f)) return null;
  const ep = WREF ? WREF.ep : 0;
  const g = f.tele.add({ ...sh, kind: 'white', start: o.start ?? f.t, end: o.end });
  f.cue('white', sh);
  f.after(Math.max(0, o.end - f.t), () => {
    if (!sameLight(ep)) return;
    const hit = f.resolveArea(sh, { kind: 'white', damage: o.damage ?? 1, melee: true });
    o.onImpact && o.onImpact(hit, sh);
    f.sfx.impactArea && f.sfx.impactArea('white', f.pan(sh.x), hit);
  });
  return g;
}
