// A bot that plays a fight, standing in for the Input object (tests, captures, fairness checks).
// It's not Alex: a bot winning proves a fight is possible, never that it's fun.
// skill: { react (s), jitter (s), greed (0..1: how much it strikes instead of playing safe), miss (chance to fumble) }
// It reads what a player reads: telegraphs filling on the floor and shots in the air. PINK it catches on the beat;
// WHITE it leaves, choosing a way out that clears every shape and stays in the room, and dashes when walking won't.
import * as THREE from 'three';
import { inShape } from './choreo.js';
import { FEEL } from './player.js';

const SHAPES = ['circle', 'ring', 'rect', 'cone', 'arc'];
const TAU = Math.PI * 2;

export class Autopilot {
  constructor(fight, skill = {}) {
    this.f = fight;
    // rhythm: how often it times a strike to the beat (a good player mostly does; mashing doesn't)
    this.skill = { react: 0.1, jitter: 0.03, greed: 0.65, miss: 0.0, rhythm: 0.75, ...skill };
    this.mouse = { x: 0.5, y: 0.5, px: 0, py: 0, moved: true, inside: true };
    this.down = new Set(); this.pressed = []; this.pressedAt = []; this.released = [];
    this.mv = { x: 0, y: 0 };
    this.rng = 1234567;
    this.nextStrike = 0; this.parryAt = -1; this.dashAt = -1; this.holdUntil = -1; this.blockUntil = -1;
  }
  rand() { this.rng = (this.rng * 1103515245 + 12345) & 0x7fffffff; return this.rng / 0x7fffffff; }

  // ---------- Input interface ----------
  move() { return this.mv; }
  // presses keep the song time they were made at (the player judges a strike's beat on its press)
  take(a, now, w) { const i = this.pressed.indexOf(a); if (i >= 0) { this.pressed.splice(i, 1); const st = this.pressedAt.splice(i, 1)[0]; return { action: a, t: now, songT: st }; } return null; }
  peek(a) { return this.pressed.includes(a); }
  isDown(a) { return this.down.has(a); }
  takeRelease(a) { const i = this.released.indexOf(a); if (i >= 0) { this.released.splice(i, 1); return { action: a }; } return null; }
  clear() { this.pressed.length = 0; this.pressedAt.length = 0; this.released.length = 0; }
  press(a) { this.pressed.push(a); this.pressedAt.push(this.f.t); this.down.add(a); }
  release(a) { this.down.delete(a); this.released.push(a); }

  _shape(g) { return { shape: SHAPES[g.shape] || g.shape, x: g.x, z: g.z, angle: g.angle, w: g.w, h: g.h, param: g.param }; }
  _isPink(g) { return g.kind ? g.kind === 'pink' : (g.color.r > g.color.b * 1.6 && g.color.g < 1.2); }

  think() {
    const f = this.f, pl = f.player, b = f.boss, t = f.t, sk = this.skill;
    if (!pl || !b) return;
    // the song clock jumped back (a rewind, the encore): my timers were on the old clock
    if (this._lastT !== undefined && t < this._lastT - 0.5) { this.nextStrike = 0; this.blockUntil = -1; }
    this._lastT = t;
    // the held guard: down while I'm blocking, up otherwise (a catch is a tap: press and let go)
    if (t < this.blockUntil) this.down.add('parry'); else this.down.delete('parry');
    // aim at the boss
    const p = this._p || (this._p = new THREE.Vector3());
    p.set(b.x, 0, b.z).project(f.cam.logic);
    this.mouse.x = (p.x + 1) / 2; this.mouse.y = (1 - p.y) / 2;

    // every telegraph that will land on me soon
    const near = [], all = [];
    for (const g of f.tele.list) {
      if (g.dead) continue;
      const tl = g.end - t;
      if (tl < -0.02 || tl > 1.5) continue;
      const sh = this._shape(g), pink = this._isPink(g);
      all.push({ tl, g, sh, pink });
      if (inShape(sh, pl.x, pl.z, FEEL.radius + 0.2)) near.push({ tl, g, sh, pink });
    }
    near.sort((a, b2) => a.tl - b2.tl);
    // incoming shots: every one that will pass through me in the next moment
    const shots = [];
    for (const q of f.proj.list) {
      if (q.owner !== 'boss' || q.age < q.delay || q.dead) continue;
      const dx = pl.x - q.x, dz = pl.z - q.z, d = Math.hypot(dx, dz);
      const vx = Math.sin(q.angle) * q.speed, vz = Math.cos(q.angle) * q.speed;
      const closing = (dx * vx + dz * vz) / Math.max(0.01, d);
      if (closing <= 0) continue;
      const tti = (d - q.radius - FEEL.radius) / Math.max(0.1, closing);
      if (tti > 1.0) continue;
      const perp = Math.abs(dx * vz - dz * vx) / Math.max(0.1, q.speed);
      if (perp > q.radius + FEEL.radius + 0.5) continue;
      shots.push({ tti, q, vx, vz });
    }
    shots.sort((a, b2) => a.tti - b2.tti);
    const shot = shots[0] || null;
    // one catch takes one thing: a lone pink shot is caught, a volley is dodged
    const volley = shots.length > 1 && shots[1].tti - shots[0].tti < 0.35;

    // live sweeps: a beam turning onto me, or a wave's front reaching me: dash through it as it arrives
    let sweep = null;
    for (const bm of f.beams || []) {
      if (t < bm.tOn - 0.05 || t > bm.tOff) continue;
      const dur = Math.max(0.01, bm.tOff - bm.tOn);
      for (const dt of [0, 0.08, 0.16, 0.24]) {
        const k = Math.min(1, Math.max(0, (t + dt - bm.tOn) / dur)), ang = bm.a0 + (bm.a1 - bm.a0) * k;
        if (inShape({ shape: 'rect', x: bm.src.x, z: bm.src.z, angle: ang, w: bm.w, h: bm.h }, pl.x, pl.z, FEEL.radius + 0.15)) { if (!sweep || dt < sweep.tl) sweep = { tl: dt, x: bm.src.x, z: bm.src.z, ang }; break; }
      }
    }
    for (const w of f.waves || []) {
      const d = Math.hypot(pl.x - w.x, pl.z - w.z), gap = d - w.r;
      if (w.hit || gap < -w.band || gap > w.speed * 0.3) continue;
      const tl = Math.max(0, gap / Math.max(0.1, w.speed));
      if (!sweep || tl < sweep.tl) sweep = { tl, x: w.x, z: w.z, wave: true };
    }
    if (sweep && sweep.tl < 0.12 + sk.jitter && pl.dashCharges > 0 && pl.state !== 'dash' && this.rand() > sk.miss) {
      // through it: across a beam, into a wave (its band is thin)
      let ux, uz;
      if (sweep.wave) { ux = sweep.x - pl.x; uz = sweep.z - pl.z; } else { ux = Math.cos(sweep.ang); uz = -Math.sin(sweep.ang); }
      const l = Math.hypot(ux, uz) || 1; this.mv = { x: ux / l, y: uz / l }; this.press('dash');
      return;
    }

    this.mv = { x: 0, y: 0 };
    const firstPink = near.find((x) => x.pink), firstWhite = near.find((x) => !x.pink);
    // catch: a pink thing landing now with nothing white landing on me at the same moment
    let caught = false;
    if (pl.catchCool <= 0 && this.rand() > sk.miss) {
      if (shot && shot.q.parryable && !volley && shot.tti < 0.12 + sk.jitter) caught = true;
      else if (firstPink && firstPink.tl < 0.09 + sk.jitter && !(firstWhite && firstWhite.tl < firstPink.tl + 0.2)) caught = true;
      if (caught) { this.press('parry'); if (t >= this.blockUntil) this.down.delete('parry'); }
    }
    // a pink thing landing on me that I can't catch in time: hold the guard up through it
    if (!caught && firstPink && firstPink.tl < 0.3 && (pl.catchCool > firstPink.tl || this.rand() < sk.miss) && !(firstWhite && firstWhite.tl < firstPink.tl + 0.3)) {
      this.blockUntil = t + firstPink.tl + 0.12; this.down.add('parry');
    }
    if (t < this.blockUntil && !near.some((x) => !x.pink && x.tl < 0.6)) { this.mv = { x: 0, y: 0 }; return; }
    // what I have to leave: white shapes, and pink ones I can't catch in time
    const leave = near.filter((x) => !x.pink);
    const hardShot = shot && (!shot.q.parryable || volley || pl.catchCool > shot.tti) && shot.tti < 0.7;
    if (leave.length || hardShot) {
      const soon = Math.min(leave.length ? leave[0].tl : 9, hardShot ? shot.tti : 9);
      const out = this._escape(all.filter((x) => !x.pink), shots, soon);
      this.mv = { x: out.x, y: out.y };
      // a dash through it on the impact (its i-frames) when walking won't get me clear
      if (!out.safe && soon < 0.16 + sk.react * 0.3 && pl.dashCharges > 0 && this.rand() > sk.miss) this.press('dash');
      else if (soon < 0.1 && pl.dashCharges > 0 && this.rand() > sk.miss + 0.5) this.press('dash');
      return;
    }
    // spotlight
    if (pl.meter >= 1) this.press('spot');
    // her keepsake on the floor: go and get it
    if (f.ks && f.ks.state === 'wait') { const kx = f.ks.at.x - pl.x, kz = f.ks.at.z - pl.z, kl = Math.hypot(kx, kz) || 1; this.mv = { x: kx / kl, y: kz / kl }; return; }
    // offense: close in and strike, or throw from range; keep clear of shapes about to land where I'd step
    const dx = b.x - pl.x, dz = b.z - pl.z, d = Math.hypot(dx, dz);
    // an ornament at my feet and her across the room: hit it at her
    const sp = f.setPieces && f.setPieces.on ? f.setPieces.list.find((q) => q.state === 'rest' && Math.hypot(q.x - pl.x, q.z - pl.z) < 1.9) : null;
    if (sp && d > 4 && d < 13 && b.targetable && t >= this.nextStrike && this.rand() < 0.5) {
      p.set(sp.x, 0, sp.z).project(f.cam.logic); this.mouse.x = (p.x + 1) / 2; this.mouse.y = (1 - p.y) / 2;
      this.press('strike'); this.nextStrike = t + 0.3; return;
    }
    if (b.targetable && !b.guard) {
      if (d > 2.6) {
        if (d > 6 && pl.ringsInHand() > 0 && this.rand() < 0.02) { this.press('throw'); this.release('throw'); }
        if (this.rand() < sk.greed) { const l = d || 1; this.mv = { x: dx / l, y: dz / l }; if (this._stepsInto(all, this.mv)) this.mv = { x: 0, y: 0 }; }
      } else if (t >= this.nextStrike) {
        this.press('strike');
        // the next press: on the next beat (give or take a little), or whenever, mashing
        const bm = f.bm;
        if (bm && this.rand() < sk.rhythm) { const nb = bm.timeOf(Math.ceil(bm.beatAt(t + 0.16))); this.nextStrike = nb + (this.rand() - 0.6) * 0.07; }
        else this.nextStrike = t + 0.18 + this.rand() * 0.12;
      }
    } else {
      // keep a respectful distance and circle
      const l = d || 1; this.mv = { x: -dz / l * 0.8 - dx / l * (d < 4 ? 0.6 : -0.2), y: dx / l * 0.8 - dz / l * (d < 4 ? 0.6 : -0.2) };
      if (this._stepsInto(all, this.mv)) this.mv = { x: -this.mv.x, y: -this.mv.y };
    }
    // and drift away from walls so nothing pins me
    const bd = f.bounds;
    if (bd) {
      const m = 1.6;
      if (pl.x < bd.minX + m) this.mv.x += 0.6; if (pl.x > bd.maxX - m) this.mv.x -= 0.6;
      if (pl.z < bd.minZ + m) this.mv.y += 0.6; if (pl.z > bd.maxZ - m) this.mv.y -= 0.6;
    }
  }

  // would a step that way put me inside something white landing soon
  _stepsInto(all, mv) {
    const pl = this.f.player, x = pl.x + mv.x * 1.2, z = pl.z + mv.y * 1.2;
    return all.some((th) => !th.pink && th.tl < 0.8 && inShape(th.sh, x, z, FEEL.radius + 0.2));
  }

  // the best way out: 16 directions, each walked for the time I have (and through the room's walls), scored on
  // leaving every white shape, staying off the walls and away from shots; safe if a walk alone clears them
  _escape(threats, shots, soon) {
    const f = this.f, pl = f.player, sp = FEEL.runSpeed, T = Math.max(0.12, Math.min(0.7, soon));
    const bd = f.bounds;
    let best = { x: 0, y: 0, safe: false }, bs = -1e9;
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU, ux = Math.sin(a), uz = Math.cos(a);
      let x = pl.x + ux * sp * T, z = pl.z + uz * sp * T;
      if (f.arena && f.arena.resolve) { const r = f.arena.resolve(x, z, FEEL.radius); x = r.x; z = r.z; }
      let score = 0, inside = 0;
      for (const th of threats) if (th.tl < T + 0.35 && inShape(th.sh, x, z, FEEL.radius + 0.15)) inside++;
      score -= inside * 10;
      if (bd) score += Math.min(3, Math.min(x - bd.minX, bd.maxX - x, z - bd.minZ, bd.maxZ - z)) * 0.7;
      score += Math.hypot(x - pl.x, z - pl.z) * 0.25;                       // a direction that actually moves me
      score -= Math.hypot(x - f.boss.x, z - f.boss.z) * 0.04;               // and keeps me in the fight
      // where each shot will be when I get there: stay off their lines
      for (const sh of shots) {
        const s2 = sh.q, ddx = x - s2.x, ddz = z - s2.z, along = (ddx * sh.vx + ddz * sh.vz) / Math.max(0.1, s2.speed);
        if (along < -0.5) continue;
        const perp = Math.abs(ddx * sh.vz - ddz * sh.vx) / Math.max(0.1, s2.speed);
        if (perp < s2.radius + FEEL.radius + 0.35) score -= 5;
      }
      if (score > bs) { bs = score; best = { x: ux, y: uz, safe: inside === 0 }; }
    }
    return best;
  }
}
