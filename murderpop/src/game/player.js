// YOU. One button fights: every strike goes to her by itself and lands on the song's pulse (the tick). Press on the
// tick and it lands at once, gold; press any other time and it lands on the next one. Keep pressing and the string
// runs: cuts, a lunge, a spin, a slam on the accent. Hold the button and the next one is the heavy. Space jumps (over
// what's on the floor), and pressed in the middle of a string it's the lift: she goes up and so do you; strike up there,
// and the last one brings you both down. Far from her, the same button throws a ring. Right click is the guard (hold:
// block; press as it lands: send it back). Shift is the dash.
// Everything is on the floor plane (x, z) with a height y. The fight hands in a context each frame:
//   ctx = { dt, t (song time), input, boss, beats, fx, sfx, arena, hud, on... }
// Tuning lives in FEEL and MOVES; change them from play reports, not from bots.
import * as THREE from 'three';

export const FEEL = {
  runSpeed: 7.8, guardSpeed: 3.6, accel: 80, decel: 64, turnRate: 18,
  radius: 0.42,
  // the tick: how early / late a press can be and still be on it (seconds, and at most this share of the tick)
  early: 0.085, late: 0.07, earlyK: 0.27, lateK: 0.22,
  snap: 0.045,           // pressed on the tick: it lands this soon
  minLead: 0.045,        // pressed off it: the soonest it can land
  reach: 1.5,            // a strike's reach, from her edge
  blink: 3.2,            // pressed on the tick, a strike crosses this much to her at once
  magnet: 6.0,           // inside this (from her edge) a strike carries you to her; further, the ring goes
  stand: 0.45,           // where a strike leaves you, from her edge (close enough that the rings are on her)
  comboTicks: 2.5,       // the string waits this many ticks for the next press
  holdT: 0.22, chargeMax: 4,      // hold this long and the next one is the heavy; it lets go by itself after this many ticks
  jumpH: 1.7, jumpTicks: 2, airJumps: 1, airSafe: 0.65, airAccel: 30,
  // what a strike is worth: pressed on the tick, landing on an accent, in the spotlight; and your combo's heat
  perfect: 1.5, accent: 1.15, solo: 1.35, heat: 0.06,
  // the guard: a press opens the window (perfect / good: the hit lands this soon after the press); holding blocks
  catchPerfect: 0.11, catchGood: 0.2, catchRadius: 1.7, catchCooldown: 0.2, guardMin: 0.24, blockPush: 5.5,
  // sending it back: a hit of hers turned on her, when she's close enough to reach
  riposte: { reach: 4.6, perfect: 44, good: 30 },
  dashTime: 0.16, dashSpeed: 34, dashIframes: 0.16, dashCharges: 2, dashRecharge: 0.5, stingerT: 0.32,
  ringDmg: 7, ringRadius: 1.15, ringRange: 13, ringReturn: 44, ringMax: 62,
  hearts: 5, hurtStun: 0.24, hurtInv: 1.05, knock: 9,
  heartPerHit: 0.5,   // a hit takes half a heart (Alex, 7 Nov: "a little more health for the player character")
  // the spotlight fills mostly from defence: what you send back, what you slip past, a little from the beat
  meter: { perfectCatch: 0.2, goodCatch: 0.1, block: 0.03, nearMiss: 0.1, onBeatHit: 0.012, hit: 0.004, ringHit: 0.008, finisher: 0.05 },
  // (older tracks read these two lists for a strike's base damage)
  strikes: [{ name: 'A', dmg: 10 }, { name: 'B', dmg: 10 }, { name: 'C', dmg: 12 }], punches: [{ name: 'jab', dmg: 6 }, { name: 'cross', dmg: 7 }, { name: 'hook', dmg: 10 }],
};

// A move: its clip and the window of it that plays [from, to] (fractions of the clip), where in that window the hit
// is (hit), how long its wind-up is at its own speed (wind, s), the pause on contact (stop) and the follow-through (rec).
// sfx: the swing it sounds like (A B C F). sweep: which way its arc runs (1, -1, 0 = overhead). tilt: the arc's plane
// (0 flat, 1.57 upright). spin: turns of the whole body. hop: how high she leaves the floor.
const mv = (name, clip, from, to, hit, o = {}) => ({ name, clip, from, to, hit, dmg: 10, reach: FEEL.reach, arc: 1.5, wind: 0.26, stop: 0.055, rec: 0.3, sfx: 'A', sweep: 1, tilt: 0.3, ...o });
export const MOVES = {
  // the string, two of each: mash and it still looks like something
  cut:       mv('cut', 'Sword_Regular_A', 0.18, 0.92, 0.48, { dmg: 10, sfx: 'A', sweep: 1, tilt: 0.75 }),
  sweep:     mv('sweep', 'Sword_Heavy_Combo', 0.045, 0.235, 0.56, { dmg: 10, sfx: 'A', sweep: -1, tilt: 0.05, arc: 1.9 }),
  back:      mv('back', 'Sword_Regular_B', 0.2, 0.95, 0.42, { dmg: 10, sfx: 'B', sweep: -1, tilt: 0.15 }),
  thrust:    mv('thrust', 'Sword_Regular_Combo', 0.2, 0.36, 0.38, { dmg: 11, sfx: 'B', sweep: 0, tilt: 1.3, arc: 0.9, push: 0.5 }),
  twirl:     mv('twirl', 'Sword_Regular_C', 0.02, 0.36, 0.52, { dmg: 12, sfx: 'C', sweep: 1, tilt: 0.1, arc: 2.6, hop: 0.25 }),
  low:       mv('low', 'Sword_Regular_Combo', 0.49, 0.72, 0.2, { dmg: 12, sfx: 'C', sweep: -1, tilt: -0.25, arc: 2.0, wind: 0.14 }),
  pirouette: mv('pirouette', 'Sword_Heavy_Combo', 0.245, 0.4, 0.55, { dmg: 13, sfx: 'C', sweep: 1, tilt: 0.2, arc: 2.2, push: 0.4 }),
  wide:      mv('wide', 'Sword_Attack', 0.2, 0.62, 0.57, { dmg: 13, sfx: 'C', sweep: -1, tilt: 0.0, arc: 2.6, wind: 0.36 }),
  slam:      mv('slam', 'Sword_Heavy_Combo', 0.43, 0.74, 0.56, { dmg: 26, sfx: 'F', sweep: 0, tilt: 1.45, arc: 1.4, wind: 0.5, stop: 0.12, rec: 0.42, heavy: true, finisher: true, accent: true, hop: 0.7, knock: 1.6, shock: 2.2 }),
  // the heavy (hold, let go): a full turn with both rings out. She goes up if she can be lifted.
  saw:       mv('saw', 'Sword_Attack', 0.2, 0.62, 0.57, { dmg: 22, sfx: 'F', sweep: 1, tilt: 0.05, arc: 3.1, wind: 0.36, stop: 0.1, rec: 0.4, heavy: true, spin: 1, knock: 1.3, launch: 0.9, charged: true }),
  // Space in the middle of it: the lift
  lift:      mv('lift', 'Sword_Regular_A', 0.18, 0.92, 0.5, { dmg: 12, sfx: 'A', sweep: 1, tilt: 1.35, arc: 1.3, wind: 0.2, stop: 0.08, rec: 0.3, heavy: true, launch: 1, rise: true }),
  // in the air
  acut:      mv('acut', 'Sword_Regular_B', 0.2, 0.95, 0.42, { dmg: 9, sfx: 'B', sweep: -1, tilt: 0.3, air: true, upper: true, wind: 0.16 }),
  across:    mv('across', 'Sword_Regular_A', 0.18, 0.92, 0.48, { dmg: 9, sfx: 'A', sweep: 1, tilt: 0.9, air: true, upper: true, wind: 0.16 }),
  aspin:     mv('aspin', 'Sword_Regular_C', 0.04, 0.34, 0.52, { dmg: 12, sfx: 'C', sweep: 1, tilt: 0.1, arc: 2.6, air: true, wind: 0.2 }),
  dive:      mv('dive', 'Sword_Heavy_Combo', 0.5, 0.74, 0.44, { dmg: 22, sfx: 'F', sweep: 0, tilt: 1.5, arc: 1.5, air: true, wind: 0.3, stop: 0.13, rec: 0.4, heavy: true, finisher: true, dive: true, spike: true, shock: 2.8, knock: 1.2 }),
  // out of a dash: the lunge
  stinger:   mv('stinger', 'Sword_Dash', 0.0, 0.5, 0.36, { dmg: 14, sfx: 'C', sweep: 0, tilt: 1.3, arc: 0.8, wind: 0.2, stop: 0.08, rec: 0.3, magnet: 10, push: 0.7, heavy: true }),
  // a hit of hers sent back: the cut
  riposte:   mv('riposte', 'Sword_Regular_C', 0.02, 0.36, 0.5, { dmg: 30, sfx: 'F', sweep: 1, tilt: 0.25, arc: 2.6, wind: 0.1, stop: 0.13, rec: 0.3, heavy: true, riposte: true, knock: 1.9 }),
  // far from her: the ring
  throw:     mv('throw', 'OverhandThrow', 0.28, 0.62, 0.3, { dmg: FEEL.ringDmg, sfx: 'A', upper: true, thrown: true, wind: 0.12, rec: 0.22 }),
};
export const STRING = [['cut', 'sweep'], ['back', 'thrust'], ['twirl', 'low'], ['pirouette', 'wide'], ['slam', 'slam']];
export const AIR = ['acut', 'across', 'aspin'];

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const TAU = Math.PI * 2;

export class Player {
  constructor(heroine, scene) {
    this.h = heroine;
    this.rig = heroine.rig;
    this.root = heroine.root;
    scene.add(this.root);
    this.x = 0; this.z = 4; this.y = 0; this.vx = 0; this.vz = 0; this.vy = 0; this.grounded = true; this.g = 30;
    this.facing = Math.PI; // facing -z (toward the back of the arena)
    this.state = 'free'; this.st = 0;
    this.hearts = FEEL.hearts; this.inv = 0;
    this.dashCharges = FEEL.dashCharges; this.dashCool = 0;
    this.combo = 0; this.comboT = 0; this.strike = null; this.streak = 0; this.strings = 0; this.comboUntil = -1; this.lastK = -1e9;
    this.airN = 0; this.airJumps = FEEL.airJumps; this.T = 0;
    this.catchT = -1; this.catchCool = 0; this.aiming = false;
    this.guarding = false; this._posing = false; this._poseUntil = 0; this.pushT = 0; this.blockK = 0;
    this.meter = 0; this.spot = 0; this.solo = false;
    this.rings = heroine.rings.map((r) => ({ ...r, state: 'hand', pos: new THREE.Vector3(), tgt: new THREE.Vector3(), t: 0, hitOut: false, hitBack: false, spin: 0 }));
    this.counterT = 0;            // after a near miss: next strike is a counter
    this.lastHitBy = '';
    this.locked = false;          // during the opening pose or a scene (never long)
    this.speedMul = 1;
    this.walk = false;            // the credits: no fighting, the hands reach for things (ctx.onInteract)
    this.clock = 0;
    this.stats = { hits: 0, onBeat: 0, catches: 0, perfect: 0, nearMiss: 0, ringHits: 0, hurt: 0, damage: 0, blocks: 0, ripostes: 0, finishers: 0, air: 0, lifts: 0, best: 0 };
    this.rig.play('Sword_Idle', { fade: 0 });
  }

  get pos() { return _v.set(this.x, 0, this.z); }
  // up off the floor, what's on the floor can't touch you
  get airborne() { return this.y > FEEL.airSafe; }
  get invulnerable() { return this.inv > 0 || (this.state === 'dash' && this.st < FEEL.dashIframes) || this.state === 'dead' || this.state === 'spot' || this.state === 'scene' || this.airborne || this.T < (this._safeUntil || 0); }
  // (a shot in the air is at its own height: the fight asks this instead)
  get untouchable() { return this.inv > 0 || (this.state === 'dash' && this.st < FEEL.dashIframes) || this.state === 'dead' || this.state === 'spot' || this.state === 'scene' || this.T < (this._safeUntil || 0); }
  // the press's window: a hit landing in it is sent back
  get catching() { return this.catchT >= 0 && this.catchT <= FEEL.catchGood; }
  // the held guard: a pink hit landing on it is stopped (no window: nothing goes back)
  get blocking() { return this.guarding && this.grounded && (this.state === 'free' || this.state === 'catch'); }
  ringsInHand() { return this.rings.filter((r) => r.state === 'hand').length; }

  place(x, z, facing) { this.x = x; this.z = z; this.y = 0; this.vx = this.vz = this.vy = 0; this.grounded = true; if (facing !== undefined) this.facing = facing; this._sync(); }
  _sync() { this.root.position.set(this.x, this.y, this.z); this.root.rotation.y = this.facing; }

  heal(n = 1) { this.hearts = Math.min(this.maxHearts || FEEL.hearts, this.hearts + n); }
  // the spotlight's meter: faster the hotter your combo is; from: where it was earned (gold motes fly from there to you)
  addMeter(k, from) {
    if (this.solo) return;
    const was = this.meter; this.meter = Math.min(1, this.meter + k * (1 + 0.1 * (this.heat || 0)));
    if (from && this._fx && this.meter > was && was < 1) this._fx.mote(from, this, k >= 0.1 ? 4 : 2);
    if (was < 1 && this.meter >= 1) this._meterFull = true;
  }

  // a press at song time t against the tick: on (on a tick), big (an accent), off (seconds from it)
  beatJudge(ctx, t = ctx.t) {
    const bm = ctx.beats;
    if (!bm) return { on: false, big: false, off: 1 };
    const n = bm.nearestTick(t), per = bm.tickPeriod(t);
    const on = n.offset >= -Math.min(FEEL.early, per * FEEL.earlyK) && n.offset <= Math.min(FEEL.late, per * FEEL.lateK);
    return { on, big: on && n.accent, off: n.offset, time: n.time, k: n.k };
  }

  update(ctx) {
    const { dt, input } = ctx;
    const now = performance.now();
    this.st += dt; this.clock += dt; this._fx = ctx.fx;
    // the clock strikes are timed on: the song's while it runs; my own when it's stopped (the finish) or has jumped
    const adv = ctx.t - (this._ct ?? ctx.t); this._ct = ctx.t;
    if (adv > 1e-6 && adv < 0.3) this.T = ctx.t; else { this.T += dt; if (adv < -0.05 || adv >= 0.3) this._clockJump(ctx); }
    const T = this.T;
    if (this.inv > 0) this.inv -= dt;
    if (this.counterT > 0) this.counterT -= dt;
    if (this.catchT >= 0) this.catchT += dt;
    if (this.catchCool > 0) this.catchCool -= dt;
    if (this.pushT > 0) this.pushT -= dt;
    if (T > this.comboUntil && this.state !== 'strike') { this.combo = 0; this.streak = 0; }
    this.comboT = Math.max(0, this.comboUntil - T);
    this.blockK = Math.max(0, this.blockK - dt * 5);
    if (this.dashCharges < FEEL.dashCharges) { this.dashCool -= dt; if (this.dashCool <= 0) { this.dashCharges++; this.dashCool = FEEL.dashRecharge; } }
    const b = ctx.boss, tgt = b && b.targetable ? b : null;
    const toB = tgt ? Math.atan2(b.x - this.x, b.z - this.z) : this.facing;

    if (this.state === 'dead') { this.guarding = false; this._pose(false); this._fall(dt); this._integrate(dt, 0, 0, FEEL.decel); this._post(ctx); return; }
    // in a scene (her death): the scene moves her and reads the presses itself
    if (this.state === 'scene') { this._rings(ctx); this._post(ctx); return; }

    // ---- inputs that can interrupt ----
    const rel = input.takeRelease('strike'); if (rel) this._released = true;
    if (this.walk && !this.locked) {
      const dashKey = input.peek('dash', now, 120) ? 'dash' : input.peek('jump', now, 120) ? 'jump' : null;
      if (dashKey && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) { input.take(dashKey, now, 120); this._dash(ctx, toB); }
      if (input.take('strike', now, 220) || input.take('parry', now, 220) || input.take('spot', now, 220) || input.take('throw', now, 220)) ctx.onInteract && ctx.onInteract();
      input.takeRelease('parry');
    } else if (!this.locked && this.state !== 'hurt' && this.state !== 'spot') {
      // spotlight
      if (this.meter >= 1 && input.take('spot', now, 200)) { ctx.onSpotlight && ctx.onSpotlight(); }
      // dash: cancels everything but itself
      if (input.peek('dash', now, 120) && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) {
        input.take('dash', now, 120);
        this._dash(ctx, toB);
      }
      // jump (and, in the middle of a string, the lift)
      if (input.peek('jump', now, 140) && this.state !== 'dash') {
        if (this._jump(ctx, tgt)) input.take('jump', now, 140);
      }
      // the guard: a press opens the window (any time but a dash); holding it keeps the guard up
      if (input.take('parry', now, 130)) {
        if (this.catchCool <= 0) { this.catchT = 0; this.catchCool = FEEL.catchCooldown; this._catchPose(ctx, toB); }
        this._poseUntil = this.clock + FEEL.guardMin;
      }
      input.takeRelease('parry');
      this.guarding = input.isDown('parry') && this.grounded && (this.state === 'free' || this.state === 'catch');
      // the ring, by hand (E): at her, now
      if (input.take('throw', now, 200) && this.ringsInHand() > 0 && this._canStrike()) this._strike(ctx, T, { def: MOVES.throw });
      // strike: buffered while one is on its way
      if (input.peek('strike', now, 260)) {
        if (this._canStrike()) {
          const p = input.take('strike', now, 260);
          // the press's own song time: a press held over from a moment ago is judged when it was made
          const pt = p ? (p.songT ?? T - clamp((now - p.t) / 1000, 0, 0.26)) : T;
          this._released = false; this._holdFrom = T;
          this._strike(ctx, pt);
        }
      }
      // held down past the hit: the next one is the heavy, wound up for as long as it's held
      if (input.isDown('strike') && !this._released && !this.solo) {
        const s = this.strike;
        if (this.state === 'strike' && s && s.hit && !s.charging && !s.def.charged && !s.def.thrown && T - this._holdFrom >= FEEL.holdT && T >= s.tHit + s.stop) this._charge(ctx);
        else if ((this.state === 'free' || this.state === 'catch') && T - (this._holdFrom ?? T) >= FEEL.holdT && this._holdFrom !== undefined && T - this._holdFrom < 2) this._charge(ctx);
      }
    } else this.guarding = false;
    // the guard pose: held while guarding, and for a moment after a tap
    this._pose((this.guarding || this.clock < this._poseUntil) && (this.state === 'free' || this.state === 'catch'));

    // ---- state behaviour ----
    const mvI = this.locked ? { x: 0, y: 0 } : input.move();
    let speed = FEEL.runSpeed * this.speedMul;
    if (this.guarding) speed = FEEL.guardSpeed * this.speedMul;
    if (this.state === 'free' || this.state === 'catch') {
      const tvx = mvI.x * speed, tvz = mvI.y * speed;
      this._integrate(dt, tvx, tvz, this.pushT > 0 ? 14 : !this.grounded ? FEEL.airAccel : (mvI.x || mvI.y) ? FEEL.accel : FEEL.decel);
      this._fall(dt, ctx);
      // facing: her, while guarding or just after a strike; else the way you run
      const moving = Math.hypot(this.vx, this.vz) > 0.8;
      let want = this.facing;
      if (this.guarding || this.catching) want = this._threatAng ?? toB;
      else if (moving) want = Math.atan2(this.vx, this.vz);
      else if (tgt && T < this.comboUntil) want = toB;
      this._turn(want, dt, this.guarding || this.catching ? 30 : FEEL.turnRate);
      if (this.state === 'catch' && this.catchT > FEEL.catchGood + 0.05) this.state = 'free';
      // legs: in the air, a guarded walk, a run, or the stance
      const sp = Math.hypot(this.vx, this.vz);
      if (!this.grounded) { if (this.clock > (this._jumpAnim || 0)) this.rig.play('NinjaJump_Idle_Loop', { fade: 0.1 }); }
      else if (this._landT > 0) { this._landT -= dt; }
      else if (sp > 0.6) this.rig.play(this.guarding ? 'Walk_Loop' : 'Sprint_Loop', { speed: this.guarding ? Math.max(0.8, sp / 2.2) : Math.max(0.7, sp / 6.4), fade: 0.12 });
      else this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: this.walk ? 0.3 : 0.18 });
      this.rig.lean.set(clamp(angDiff(Math.atan2(this.vx, this.vz), this.facing) * sp * -0.01, -0.12, 0.12), this.guarding ? 0.1 : !this.grounded ? 0 : Math.min(0.14, sp * 0.012));
    } else if (this.state === 'strike') {
      this._strikeUpdate(ctx, dt, mvI, tgt);
    } else if (this.state === 'dash') {
      const k = this.st / FEEL.dashTime;
      const v = FEEL.dashSpeed * (k < 1 ? (1 - k * k * 0.7) : 0.2);
      this.vx = Math.sin(this._dashAng) * v; this.vz = Math.cos(this._dashAng) * v;
      this._move(dt);
      if (!this.grounded) { this.vy = Math.max(this.vy, -2); this._fall(dt, ctx, 0.35); }
      this._turn(this._dashFace, dt, 50);
      if (this.st >= FEEL.dashTime) { this.state = 'free'; this.st = 0; this.vx *= 0.35; this.vz *= 0.35; this._stingerUntil = T + FEEL.stingerT; ctx.fx && ctx.fx.dashEnd(this); }
      this.rig.lean.set(0, 0.25);
    } else if (this.state === 'hurt') {
      this._integrate(dt, 0, 0, 30); this._fall(dt, ctx);
      if (this.st >= FEEL.hurtStun) { this.state = 'free'; this.st = 0; }
    } else if (this.state === 'spot') {
      this._integrate(dt, 0, 0, FEEL.decel); this._fall(dt, ctx);
    }

    this._rings(ctx);
    if (this._meterFull) { this._meterFull = false; ctx.sfx && ctx.sfx.meterFull && ctx.sfx.meterFull(); ctx.fx && ctx.fx.meterFull && ctx.fx.meterFull(this); }
    this._post(ctx);
  }

  // the song jumped (a rewind, the encore, a start part-way in): nothing timed on the old clock survives
  _clockJump(ctx) {
    this.lastK = -1e9; this.comboUntil = -1; this._stingerUntil = -1; this._holdFrom = undefined; this._safeUntil = 0; this._lastLandK = -1e9;
    if (this.state === 'strike') this._endStrike();
    this.T = ctx.t;
  }

  _integrate(dt, tvx, tvz, rate) {
    const dvx = tvx - this.vx, dvz = tvz - this.vz;
    const d = Math.hypot(dvx, dvz), m = rate * dt;
    if (d <= m) { this.vx = tvx; this.vz = tvz; } else { this.vx += dvx / d * m; this.vz += dvz / d * m; }
    this._move(dt);
  }
  _move(dt) {
    this.x += this.vx * dt; this.z += this.vz * dt;
    if (this.arena) { const r = this.arena.resolve(this.x, this.z, FEEL.radius); this.x = r.x; this.z = r.z; }
  }
  _turn(want, dt, rate) { const d = angDiff(want, this.facing); const m = rate * dt; this.facing += Math.abs(d) <= m ? d : Math.sign(d) * m; }

  // up and down (gk: how much of gravity, for a strike that hangs in the air)
  _fall(dt, ctx, gk = 1) {
    if (this.grounded) return;
    this.vy -= this.g * gk * dt; this.y += this.vy * dt;
    if (this.y <= 0 && this.vy <= 0) this._land(ctx);
  }
  _land(ctx, hard = false) {
    this.y = 0; this.vy = 0; this.grounded = true; this.airN = 0; this.airJumps = FEEL.airJumps;
    if (this._diving) { this._diving = false; hard = true; ctx && ctx.onShock && ctx.onShock(this.x, this.z, MOVES.dive.shock, { on: true, def: MOVES.dive, name: 'F', move: 'dive' }); }
    this.rig.body.squash = hard ? 0.16 : 0.1; this._landT = 0.1;
    if (this.state === 'strike' && this.strike && this.strike.upper) this.rig.play('Sword_Idle', { fade: 0.08, force: true });
    if (this.state === 'free') this.rig.once('NinjaJump_Land', { duration: 0.22, from: 0.1, to: 0.36, fade: 0.04, then: this.walk ? 'Idle_Loop' : 'Sword_Idle', thenFade: 0.12 });
    if (ctx) { ctx.fx && ctx.fx.dust && ctx.fx.dust(this.x, this.z, hard ? 10 : 5); ctx.sfx && ctx.sfx.land && ctx.sfx.land(this, hard); }
  }

  // ---------- jump ----------
  // returns true if the press was used
  _jump(ctx, tgt) {
    const T = this.T, s = this.strike, b = ctx.boss;
    // in the middle of a string, beside her: the lift
    if (this.grounded && tgt && !this.solo) {
      const d = Math.hypot(b.x - this.x, b.z - this.z) - b.radius;
      const mid = (this.state === 'strike' && s && s.hit && !s.def.thrown) || (T < this.comboUntil && this.combo > 0);
      if (mid && d < FEEL.reach + 1.2) {
        if (!this._canStrike()) return false;     // it waits for the one on its way to land
        this._strike(ctx, T, { def: MOVES.lift, pressT: T });
        return true;
      }
    }
    if (this.state === 'strike' && s && !s.hit) return false;
    if (!this.grounded) {
      if (this.airJumps <= 0) return true;
      this.airJumps--;
    }
    if (this.state === 'strike') this._endStrike();
    this._leap(ctx, this.grounded ? 1 : 0.82);
    this.catchT = -1; this.guarding = false; this._pose(false);
    this.rig.once('NinjaJump_Start', { duration: 0.2, from: 0.12, to: 0.5, fade: 0.04, then: 'NinjaJump_Idle_Loop', thenFade: 0.1 }); this._jumpAnim = this.clock + 0.24;
    ctx.sfx && ctx.sfx.jump && ctx.sfx.jump(this);
    ctx.fx && ctx.fx.dust && this.y < 0.1 && ctx.fx.dust(this.x, this.z, 5);
    return true;
  }
  // leave the floor: up for about two ticks of the song (you land on the beat you jumped two before)
  _leap(ctx, k = 1) {
    const tp = ctx.beats ? ctx.beats.tickPeriod(this.T) : 0.36, Ta = clamp(tp * FEEL.jumpTicks, 0.54, 0.76);
    this.g = 8 * FEEL.jumpH / (Ta * Ta); this.vy = this.g * Ta / 2 * k; this.grounded = false; this.y = Math.max(this.y, 0.02);
    this.state = this.state === 'strike' ? 'strike' : 'free'; if (this.state === 'free') this.st = 0;
  }

  // ---------- strike ----------
  _canStrike() {
    const s = this.strike;
    if (this.state === 'free' || this.state === 'catch') return true;
    if (this.state === 'strike') return !!s && (s.charging ? false : s.hit && this.T >= s.tHit + s.stop);
    if (this.state === 'dash') return this.st >= FEEL.dashTime * 0.55;
    return false;
  }

  // start a strike pressed at song time pressT. o.def: a move by name (else what the moment calls for)
  _strike(ctx, pressT = this.T, o = {}) {
    const bm = ctx.beats, T = this.T, b = ctx.boss, tgt = b && b.targetable ? b : null;
    const tp = bm ? bm.tickPeriod(T) : 0.36;
    const dx = tgt ? b.x - this.x : 0, dz = tgt ? b.z - this.z : 0, dist = Math.hypot(dx, dz), edge = tgt ? dist - b.radius : Infinity;
    // a thing on the floor that's there to be hit (a track's own: the courtroom's exhibits) takes the swing when it's
    // the nearer, or when she can't be cut just now. The swing goes to it the way it goes to her.
    let aim = null;
    if (!o.def && this.grounded && ctx.things) {
      const th = ctx.things(); let bd = FEEL.magnet;
      if (th) for (const e of th) { const d = Math.hypot(e.x - this.x, e.z - this.z) - (e.r || 0.4) * 0.5; if (d < bd) { bd = d; aim = e; } }
      if (aim && tgt && !b.guard && bd >= edge) aim = null;
    }
    // ---- which move
    let def = o.def;
    if (!def) {
      if (T > this.comboUntil || this._stringDone) { this.combo = 0; this.strings++; this._stringDone = false; if (T > this.comboUntil) this.streak = 0; }
      if (!this.grounded) def = this.airN >= AIR.length ? MOVES.dive : MOVES[AIR[this.airN]];
      else if (!aim && tgt && edge > FEEL.reach + 0.4 && T < (this._stingerUntil || -1)) def = MOVES.stinger;
      else if (!aim && tgt && edge > FEEL.magnet) def = this.ringsInHand() > 0 ? MOVES.throw : null;
      else if (this.solo) def = MOVES[['cut', 'back', 'sweep', 'thrust'][this.combo % 4]];
      else def = MOVES[STRING[this.combo % STRING.length][this.strings % 2]];
    }
    if (!def) return;
    if (def.thrown && this.ringsInHand() <= 0) return;
    // ---- when it lands
    let tHit, k, perfect = false;
    const need = aim ? Math.max(0, Math.hypot(aim.x - this.x, aim.z - this.z) - 0.5) : tgt ? Math.max(0, edge - FEEL.stand) : 0;      // how far she has to go to reach her
    if (!bm) { tHit = T + 0.12; k = this.lastK + 1; }
    else if (this.solo) { k = Math.ceil(bm.tickAt(T + FEEL.snap) * 2 - 1e-6) / 2; tHit = bm.tickTime(k); perfect = true; }
    else {
      // One strike to a tick. Pressed on the tick, with the tick free: it lands at once, gold. Pressed on the tick as one
      // is already landing on it: that press was that hit (nothing queues up behind the beat). Pressed in the gap: it
      // lands on the next tick, plain. So one press a tick, on the tick, is gold every time, and mashing is one plain
      // hit a tick.
      const j = bm.nearestTick(pressT), lateW = Math.min(FEEL.late, tp * FEEL.lateK);
      const onTick = j.offset >= -Math.min(FEEL.early, tp * FEEL.earlyK) && j.offset <= lateW && T <= j.time + lateW + 0.07;
      if (onTick && j.k <= this.lastK && !o.def) return;
      if (onTick && j.k > this.lastK) {
        perfect = true;
        if ((need <= FEEL.blink || (!tgt && !aim)) && !def.thrown && (!def.accent || j.accent)) { k = j.k; tHit = Math.max(j.time, T + FEEL.snap); }
        else { const n = bm.nextTick(T, FEEL.minLead); k = Math.max(n.k, j.k + (def.accent ? 0 : 1)); tHit = bm.tickTime(k); if (tHit < T + FEEL.snap) { k += 1; tHit = bm.tickTime(k); } }
      } else { const n = bm.nextTick(T, FEEL.minLead); k = Math.max(n.k, this.lastK + 1); tHit = bm.tickTime(k); }
      // the slam waits for the accent, up in the air with both rings over her head
      if (def.accent && !bm.accent(k)) { k += 1; tHit = bm.tickTime(k); }
      // a ring has to get there
      if (def.thrown) while (dist / Math.max(0.01, tHit - T - 0.05) > FEEL.ringMax) { k += 1; tHit = bm.tickTime(k); }
    }
    this.lastK = Math.max(this.lastK, Math.floor(k));
    if (!def.air && !def.thrown && !o.def) this.combo++;
    if (def.air && !def.dive) this.airN++;
    // ---- the strike
    const charge = o.charge || 0;
    const s = { def, move: def.name, name: def.sfx, t0: T, tHit, k, on: perfect, big: bm ? bm.accent(Math.round(k)) : false, hit: false, pressT,
      stop: def.stop, rec: def.rec, dmg: def.dmg * (1 + 0.45 * charge), heavy: !!def.heavy, finisher: !!def.finisher, riposte: !!def.riposte, sweep: def.sweep, armed: true,
      launch: def.launch || 0, spike: !!def.spike, charge, sx: this.x, sz: this.z, sy: this.y, idx: this.combo, dur: tHit - T + def.stop + def.rec, tgt: !!tgt };
    s.ang = aim ? Math.atan2(aim.x - this.x, aim.z - this.z) : tgt ? Math.atan2(dx, dz) : this._moveAng(ctx) ?? this.facing;
    if (aim) s.aim = { x: aim.x, z: aim.z };
    s.tEnd = tHit + s.stop + s.rec;
    // how much of the wind-up there's time to show: pressed on the tick, only its last moment
    s.k0 = 1 - clamp((tHit - T) / def.wind, 0.22, 1);
    if (o.q) s.q = o.q;
    if (def.riposte) { s.on = true; s.dmg = o.dmg ?? def.dmg; }
    // the dive: straight down onto the floor on the tick; or, with her up there beside you, her first (and you after her)
    if (def.dive) s.plunge = !(tgt && (b.airY || 0) > 0.7 && edge < FEEL.reach + 2.6 && !this.grounded);
    // three in a row pressed on the tick: the next is worth more (and the slam with all of them, the most)
    this.streak = s.on ? this.streak + 1 : 0;
    this.comboUntil = tHit + tp * FEEL.comboTicks;
    if (def.finisher && !def.air) this._stringDone = true;
    this.facing = s.ang;
    this.state = 'strike'; this.st = 0; this.strike = s;
    this.catchT = -1; this.guarding = false;
    this._pose(false);
    // a ring that's out comes back for it
    if (!def.thrown) this.recallRings(true);
    if (def.upper || (def.air && !def.dive && def.clip !== 'Sword_Regular_C')) { this.rig.upperScrub(def.clip, { from: def.from, to: def.to, fade: 0.04 }); if (!this.grounded) this.rig.play('NinjaJump_Idle_Loop', { fade: 0.1 }); s.upper = true; }
    else { this.rig.upperStop(0.04); this.rig.scrub(def.clip, { from: def.from, to: def.to, fade: 0.04 }); }
    this._scrub(s, def.hit * s.k0);
    if (def.thrown) this._throw(ctx, s);
    ctx.sfx && ctx.sfx.swing && ctx.sfx.swing(s, this);
    ctx.fx && ctx.fx.swing && ctx.fx.swing(this, s);
    ctx.onStrikeStart && ctx.onStrikeStart(s);
  }
  _scrub(s, k) { if (s.upper) this.rig.upperScrubTo(k); else this.rig.scrubTo(k); }
  _moveAng(ctx) { const m = ctx.input.move(); return (m.x || m.y) ? Math.atan2(m.x, m.y) : null; }

  // hold: both rings wound back; let go and the heavy lands on the next tick
  _charge(ctx) {
    const T = this.T, def = this.grounded ? MOVES.saw : MOVES.dive;
    if (!this.grounded) { this._holdFrom = undefined; this._strike(ctx, T, { def }); return; }
    if (this.state === 'strike') this._endStrike(true);
    const b = ctx.boss, tgt = b && b.targetable ? b : null;
    const s = { def, move: def.name, name: def.sfx, t0: T, tHit: Infinity, k: 0, on: false, big: false, hit: false, charging: true, chargeT: T, stop: def.stop, rec: def.rec, dmg: def.dmg, heavy: true,
      finisher: false, riposte: false, sweep: def.sweep, armed: true, launch: def.launch || 0, sx: this.x, sz: this.z, sy: this.y, ang: tgt ? Math.atan2(b.x - this.x, b.z - this.z) : this.facing, k0: 0, tEnd: Infinity, dur: 1, tgt: !!tgt };
    this.state = 'strike'; this.st = 0; this.strike = s; this.catchT = -1; this.guarding = false; this._pose(false);
    this.rig.upperStop(0.04); this.rig.scrub(def.clip, { from: def.from, to: def.to, fade: 0.1 });
    this.rig.scrubTo(def.hit * 0.3);
    this.recallRings(true);
    ctx.sfx && ctx.sfx.charge && ctx.sfx.charge(this, true);
    ctx.fx && ctx.fx.charge && ctx.fx.charge(this, true);
  }
  _release(ctx) {
    const s = this.strike, bm = ctx.beats, T = this.T, def = s.def;
    const tp = bm ? bm.tickPeriod(T) : 0.36;
    const held = T - s.chargeT, charge = clamp(held / (tp * 2), 0, 1);
    let tHit, k, perfect = false;
    if (!bm) { tHit = T + 0.12; k = this.lastK + 1; }
    else {
      const j = bm.nearestTick(T);
      const onTick = j.offset >= -Math.min(FEEL.early, tp * FEEL.earlyK) && j.offset <= Math.min(FEEL.late, tp * FEEL.lateK);
      if (onTick && j.k > this.lastK) { perfect = true; k = j.k; tHit = Math.max(j.time, T + FEEL.snap); }
      else { const n = bm.nextTick(T, FEEL.minLead); k = Math.max(n.k, this.lastK + 1); tHit = bm.tickTime(k); }
    }
    this.lastK = Math.max(this.lastK, k);
    Object.assign(s, { charging: false, t0: T, tHit, k, on: perfect, big: bm ? bm.accent(k) : false, charge, dmg: def.dmg * (1 + 0.5 * charge), tEnd: tHit + s.stop + s.rec, sx: this.x, sz: this.z, k0: 0.3, pressT: T, dur: tHit - T + s.stop + s.rec });
    this.comboUntil = tHit + tp * FEEL.comboTicks; this.combo = 0; this.strings++;
    this._holdFrom = undefined;
    ctx.sfx && ctx.sfx.charge && ctx.sfx.charge(this, false);
    ctx.fx && ctx.fx.charge && ctx.fx.charge(this, false);
    ctx.sfx && ctx.sfx.swing && ctx.sfx.swing(s, this);
    ctx.fx && ctx.fx.swing && ctx.fx.swing(this, s);
  }

  _strikeUpdate(ctx, dt, mvI, tgt) {
    const s = this.strike, def = s.def, T = this.T, b = ctx.boss, rig = this.rig;
    // ---- wound up, held
    if (s.charging) {
      const tp = ctx.beats ? ctx.beats.tickPeriod(T) : 0.36, held = T - s.chargeT;
      this._integrate(dt, mvI.x * 2.4, mvI.y * 2.4, 40);
      if (tgt) { s.ang = Math.atan2(b.x - this.x, b.z - this.z); this._turn(s.ang, dt, 14); }
      const w = clamp(held / (tp * 2), 0, 1);
      rig.scrubTo(def.hit * (0.3 + 0.25 * w) + Math.sin(this.clock * 30) * 0.004 * w);
      s.chargeK = w;
      if (this._released || !ctx.input.isDown('strike') || held > tp * FEEL.chargeMax) this._release(ctx);
      return;
    }
    const L = Math.max(1e-3, s.tHit - s.t0);
    if (!s.hit) {
      // ---- the wind-up: she goes to her (most of the way at once), and the pose arrives with the tick
      const u = clamp((T - s.t0) / L, 0, 1);
      const g = s.aim || (tgt ? b : null);
      if (g && !def.thrown) {
        s.ang = Math.atan2(g.x - this.x, g.z - this.z) || s.ang;
        const d = Math.hypot(g.x - s.sx, g.z - s.sz), want = Math.max(0, d - (s.aim ? 0.05 : b.radius) - FEEL.stand);
        const max = (def.magnet ?? FEEL.magnet) + 1.2, go = Math.min(want, max);
        const a0 = Math.atan2(g.x - s.sx, g.z - s.sz), e = 1 - (1 - u) * (1 - u);
        let nx = s.sx + Math.sin(a0) * go * e, nz = s.sz + Math.cos(a0) * go * e;
        if (this.arena) { const r = this.arena.resolve(nx, nz, FEEL.radius); nx = r.x; nz = r.z; }
        this.vx = (nx - this.x) / Math.max(dt, 1e-3) * 0.2; this.vz = (nz - this.z) / Math.max(dt, 1e-3) * 0.2;
        this.x = nx; this.z = nz;
      } else if (!def.thrown) {
        const lv = 4.5 * (1 - u);
        this._integrate(dt, Math.sin(s.ang) * lv, Math.cos(s.ang) * lv, 200);
      } else this._integrate(dt, mvI.x * FEEL.runSpeed * 0.7, mvI.y * FEEL.runSpeed * 0.7, FEEL.accel);
      this.facing = s.ang;
      // height: a dive comes down onto the tick; an air strike hangs, and goes up to her if she's up there
      if (def.dive && s.plunge) { const e = u * u * u; this.y = s.sy * (1 - e); this.vy = 0; if (u >= 1) { this.y = 0; } }
      else if (!this.grounded) {
        const by = b && b.airY ? b.airY : 0;
        // she's up there: go to her. She's on the floor: come down on her
        const ty = def.air && tgt ? (by > 0.4 ? clamp(by - 0.1, 0.3, 4) : Math.min(this.y, 0.85)) : null;
        if (ty !== null) { this.y += (ty - this.y) * Math.min(1, dt * 9); this.vy = 0; }
        else { this.vy = Math.max(this.vy, -1.5); this._fall(dt, ctx, 0.3); }
      }
      this._scrub(s, def.hit * (s.k0 + (1 - s.k0) * Math.pow(u, 1.7)));
      this._bodyFx(s, u * 0.5);
      if (T >= s.tHit) {
        s.hit = true;
        if (def.dive) { if (s.plunge) { this.y = 0; this._land(ctx, true); } else this._diving = true; }
        if (def.rise) { this._leap(ctx, 1.02); ctx.fx && ctx.fx.dust && ctx.fx.dust(this.x, this.z, 6); }
        if (!def.thrown) this._strikeHit(ctx);
      }
    } else {
      // ---- contact: the pose stops dead for a moment, then follows through
      const e2 = T - s.tHit, u = clamp((e2 - s.stop) / s.rec, 0, 1);
      this._scrub(s, def.hit + (1 - def.hit) * (1 - Math.pow(1 - u, 2.4)) * (def.thrown ? 1 : 0.85));
      this._bodyFx(s, 0.5 + 0.5 * u);
      if (e2 < s.stop) { this.vx = this.vz = 0; if (!this.grounded && !def.rise) this.vy = Math.max(this.vy, 0); }
      else {
        if (this._diving && !this.grounded) this.vy = Math.min(this.vy, -30);
        if (def.thrown) this._integrate(dt, mvI.x * FEEL.runSpeed * 0.8, mvI.y * FEEL.runSpeed * 0.8, FEEL.accel);
        else this._integrate(dt, 0, 0, 60);
        this._fall(dt, ctx, def.air && e2 < s.stop + 0.14 ? 0.25 : 1);
      }
      if (tgt && e2 < s.stop + 0.1) this.facing = s.ang;
      // it's over: or you walked out of it
      const walked = (mvI.x || mvI.y) && e2 > s.stop + Math.min(0.16, s.rec * 0.5) && !def.finisher;
      if (T >= s.tEnd || walked) this._endStrike();
    }
  }
  // the whole body's part in a move: p 0..1 through it (0.5 at the hit)
  _bodyFx(s, p) {
    const B = this.rig.body, d = s.def;
    if (d.spin) B.spin = -TAU * d.spin * (p < 0.5 ? p * p * 2 : 1 - (1 - p) * (1 - p) * 2) * (s.sweep < 0 ? -1 : 1);
    if (d.hop && this.grounded) { const u = clamp(p * 2, 0, 1); B.y = d.hop * (u < 0.62 ? 1 - Math.pow(1 - u / 0.62, 2) : 1 - Math.pow((u - 0.62) / 0.38, 2.2)); }
  }
  _endStrike(quiet = false) {
    const s = this.strike; if (!s) return;
    const B = this.rig.body; B.spin = 0; B.y = 0;
    this.rig.upperStop(0.1);
    this.state = 'free'; this.st = 0;
    if (!quiet) this.rig.play(!this.grounded ? 'NinjaJump_Idle_Loop' : 'Sword_Idle', { fade: 0.16, force: true });
    if (s.charging) { this._fx && this._fx.charge && this._fx.charge(this, false); }
    this.strike = null;
  }

  _strikeHit(ctx) {
    const s = this.strike, b = ctx.boss, d = s.def;
    ctx.fx && ctx.fx.slash && ctx.fx.slash(this, s, s.ang);
    // breakables first (props in the arena)
    ctx.onStrikeArc && ctx.onStrikeArc(this.x, this.z, s.ang, d.reach + 0.9, Math.min(Math.PI, d.arc), s);
    if (d.shock && !(d.dive && !s.plunge)) ctx.onShock && ctx.onShock(this.x + Math.sin(s.ang) * 0.9, this.z + Math.cos(s.ang) * 0.9, d.shock, s);
    if (!b || !b.targetable) return;
    const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
    const reach = (s.riposte ? FEEL.riposte.reach : d.reach) + b.radius + 0.45;
    if (dist > reach) { ctx.onWhiff && ctx.onWhiff(s); return; }
    // she's up there and you aren't (or the other way round)
    const by = b.airY || 0;
    if (Math.abs(by - this.y) > (d.dive ? 9 : 1.9)) { ctx.onWhiff && ctx.onWhiff(s); return; }
    let dmg = s.dmg;
    const on = s.on || s.riposte;
    if (!s.riposte) dmg *= (this.solo ? FEEL.solo : s.on ? FEEL.perfect : 1) * (s.big ? FEEL.accent : 1);
    if (s.on && this.streak >= 3 && !s.riposte) dmg *= 1.12;
    dmg *= 1 + FEEL.heat * (this.heat || 0);           // a hot combo hits harder
    const counter = this.counterT > 0 && !s.riposte; if (counter) { dmg *= 1.4; this.counterT = 0; }
    const big = !!(s.heavy || counter || s.finisher || s.riposte);
    const res = b.takeHit({ dmg, kind: 'strike', heavy: big, from: this, onBeat: on, bigBeat: !!(s.big || s.finisher || this.solo), x: this.x, z: this.z, ang: s.ang, finisher: !!s.finisher, riposte: !!s.riposte, move: s.move, launch: s.launch, spike: s.spike, air: !this.grounded });
    if (res && res.landed) {
      this.stats.hits++; if (on) this.stats.onBeat++; this.stats.damage += res.dmg || dmg;
      if (s.finisher) this.stats.finishers++;
      if (s.riposte) this.stats.ripostes++;
      if (d.air) this.stats.air++;
      if (d.rise) this.stats.lifts++;
      const at = { x: b.x, y: 1.3 + by, z: b.z };
      this.addMeter(on ? FEEL.meter.onBeatHit : FEEL.meter.hit, on && s.big ? at : null);
      if (s.finisher) this.addMeter(FEEL.meter.finisher, at);
      // in the air a hit holds you up there
      if (!this.grounded && !d.rise && !d.dive) this.vy = Math.max(this.vy, 3.4);
      ctx.onPlayerLanded && ctx.onPlayerLanded(s, res, on, counter);
    } else if (res && res.deflected) { this.streak = 0; ctx.onWhiff && ctx.onWhiff(s, true); }
  }

  // the fight turns a hit of hers you sent back into this: a cut that reaches her and lands at once.
  // Returns false when she's out of reach (the fight sends the gold back at her instead).
  riposte(ctx, q) {
    const b = ctx.boss;
    if (!b || !b.targetable || this.state === 'dead') return false;
    const dist = Math.hypot(b.x - this.x, b.z - this.z);
    if (dist > FEEL.riposte.reach + b.radius) return false;
    if (Math.abs((b.airY || 0) - this.y) > 2.2) return false;
    if (this.state === 'strike') this._endStrike(true);
    const lk = this.lastK;
    this._strike(ctx, this.T, { def: MOVES.riposte, q, dmg: q === 'perfect' ? FEEL.riposte.perfect : FEEL.riposte.good });
    const s = this.strike; if (!s) return false;
    // it doesn't wait for a tick: it lands now (the hit you sent back was on her beat already)
    s.tHit = this.T + 0.07; s.tEnd = s.tHit + s.stop + s.rec; s.k0 = 0.75; s.on = true; this.lastK = lk;
    this.combo = 0; this._safeUntil = this.T + 0.3;
    return true;
  }

  // ---------- the guard ----------
  _pose(on) {
    if (on === this._posing) return;
    this._posing = on;
    if (on) this.rig.upperHold('Sword_Block', { duration: 0.1, from: 0.08, to: 0.3, fade: 0.05 });
    else if (!(this.state === 'strike' && this.strike && this.strike.upper)) this.rig.upperStop(0.1);
  }
  _catchPose(ctx, toB) {
    if (this.state === 'free') { this.state = 'catch'; this.st = 0; }
    if (this.state === 'catch') this.facing = this._threatAng ?? toB;
    // the arms snap up into the guard again on every press
    this._posing = false; this._pose(true);
    ctx.fx && ctx.fx.catchFlash && ctx.fx.catchFlash(this, false);
  }
  // called by the fight when a catchable thing reaches you while the window is open. Returns 'perfect'|'good'|null
  tryCatch() {
    if (!this.catching) return null;
    return this.catchT <= FEEL.catchPerfect ? 'perfect' : 'good';
  }
  caught(q, ctx) {
    this.stats.catches++; if (q === 'perfect') this.stats.perfect++;
    this.addMeter(q === 'perfect' ? FEEL.meter.perfectCatch : FEEL.meter.goodCatch, { x: this.x + Math.sin(this.facing) * 0.8, y: 1.2, z: this.z + Math.cos(this.facing) * 0.8 });
    this.rig.hitStop(q === 'perfect' ? 0.1 : 0.06);
    this.blockK = 1;
    this.catchT = FEEL.catchGood + 0.001; // one catch per press...
    this.catchCool = Math.min(this.catchCool, 0.1); // ...but a quick follow-up is allowed
    this._safeUntil = this.T + 0.18;
  }
  // a pink hit stopped on the held guard: you're pushed back a little, nothing lost, nothing sent back
  blocked(ctx, fromX, fromZ, power = 1) {
    const a = Math.atan2(this.x - fromX, this.z - fromZ);
    this.vx = Math.sin(a) * FEEL.blockPush * power; this.vz = Math.cos(a) * FEEL.blockPush * power; this.pushT = 0.14;
    this.rig.hitStop(0.05);
    this.rig.flinch = Math.max(this.rig.flinch, 0.45); this.rig.flinchDir.set(Math.sin(a), 0, Math.cos(a));
    this.stats.blocks++; this.blockK = 1;
    this.addMeter(FEEL.meter.block, { x: this.x - Math.sin(a) * 0.8, y: 1.1, z: this.z - Math.cos(a) * 0.8 });
  }

  // ---------- the ring ----------
  // thrown at her so it gets there on the tick (s.tHit), then comes back to the hand
  _throw(ctx, s) {
    const r = this.rings.find((x) => x.state === 'hand' && x.side === 'R') || this.rings.find((x) => x.state === 'hand');
    if (!r) return;
    const b = ctx.boss;
    r.holder.getWorldPosition(r.pos);
    const world = this.root.parent;
    world.attach(r.holder);
    r.state = 'out'; r.t = 0; r.hitOut = false; r.hitBack = false; r.spin = 0; r.s = s;
    r.from = r.pos.clone(); r.t0 = this.T + 0.04; r.t1 = Math.max(s.tHit, this.T + 0.1);
    r.judge = { on: s.on, big: s.big };
    r.aim = b && b.targetable ? b : null;
    // (an ornament at your feet goes first: the throw's swing knocks it her way)
    ctx.onStrikeArc && ctx.onStrikeArc(this.x, this.z, s.ang, 2.1, 1.2, s);
    if (!r.aim) r.tgt.set(this.x + Math.sin(s.ang) * FEEL.ringRange, 1.1, this.z + Math.cos(s.ang) * FEEL.ringRange);
    ctx.sfx && ctx.sfx.ringThrow && ctx.sfx.ringThrow(r);
    ctx.fx && ctx.fx.ringTrail && ctx.fx.ringTrail(r, true);
  }

  _rings(ctx) {
    const dt = ctx.dt, b = ctx.boss, T = this.T;
    for (const r of this.rings) {
      if (r.state === 'hand') continue;
      r.t += dt; r.spin += dt * 30;
      if (r.state === 'out') {
        if (r.aim && r.aim.targetable) r.tgt.set(r.aim.x, 1.15 + (r.aim.airY || 0), r.aim.z);
        const u = clamp((T - r.t0) / Math.max(0.03, r.t1 - r.t0), 0, 1);
        r.pos.lerpVectors(r.from, r.tgt, u); r.pos.y += Math.sin(u * Math.PI) * 0.35;
        if (u >= 1) {
          if (r.aim && r.aim.targetable && !r.hitOut) { r.hitOut = true; this._ringHit(ctx, r); }
          r.state = 'back'; r.t = 0; ctx.sfx && ctx.sfx.ringRecall && ctx.sfx.ringRecall(r);
        }
      } else if (r.state === 'back') {
        const hand = (r.side === 'L' ? this.h.rig.bones.hand_l : this.h.rig.bones.hand_r);
        const hp = hand ? hand.getWorldPosition(_v2) : _v2.set(this.x, 1 + this.y, this.z);
        _v.copy(hp).sub(r.pos); const d = _v.length();
        const sp = FEEL.ringReturn * Math.min(2.2, 0.8 + r.t * 4) * (r.rush ? 2.5 : 1);
        if (d <= sp * dt + 0.25) { this._ringHome(ctx, r); continue; }
        r.pos.addScaledVector(_v, (sp * dt) / d);
      }
      r.holder.position.copy(r.pos);
      r.holder.rotation.set(Math.PI / 2, 0, r.spin);
    }
  }
  _ringHit(ctx, r) {
    const on = r.judge && r.judge.on, s = r.s || {};
    const res = ctx.boss.takeHit({ dmg: FEEL.ringDmg * (on ? FEEL.perfect : 1) * (r.judge && r.judge.big ? FEEL.accent : 1), kind: 'ring', heavy: false, from: this, onBeat: on, x: r.pos.x, z: r.pos.z, ang: Math.atan2(r.tgt.x - r.from.x, r.tgt.z - r.from.z) });
    if (res && res.landed) { this.stats.ringHits++; this.addMeter(FEEL.meter.ringHit, on ? r.pos : null); ctx.onPlayerLanded && ctx.onPlayerLanded({ name: 'ring', move: 'ring', on, big: !!(r.judge && r.judge.big), def: MOVES.throw, ang: Math.atan2(r.tgt.x - r.from.x, r.tgt.z - r.from.z) }, res, on, false, r.pos); }
  }
  _ringHome(ctx, r) {
    r.state = 'hand'; r.rush = false;
    const bone = r.bone;
    bone.attach(r.holder);
    r.holder.position.set(0, 0, 0); r.holder.rotation.set(0, 0, 0); r.holder.scale.set(1, 1, 1);
    ctx && ctx.sfx && ctx.sfx.ringCatch && ctx.sfx.ringCatch(r);
    ctx && ctx.fx && ctx.fx.ringTrail && ctx.fx.ringTrail(r, false);
  }
  recallRings(rush = false) { for (const r of this.rings) if (r.state !== 'hand') { r.state = 'back'; r.t = Math.max(r.t, 0.2); if (rush) r.rush = true; } }

  // ---------- dash ----------
  _dash(ctx, toB) {
    const mv2 = ctx.input.move(), b = ctx.boss, tgt = b && b.targetable;
    // no direction held: back, away from her
    this._dashAng = (mv2.x || mv2.y) ? Math.atan2(mv2.x, mv2.y) : tgt ? toB + Math.PI : this.facing;
    // close to her you keep your eyes on her through it
    const near = tgt && Math.hypot(b.x - this.x, b.z - this.z) < 9;
    this._dashFace = near && Math.abs(angDiff(this._dashAng, toB)) > 0.9 ? toB : this._dashAng;
    if (this.state === 'strike') this._endStrike(true);
    this.state = 'dash'; this.st = 0; this.dashCharges--; if (this.dashCool <= 0) this.dashCool = FEEL.dashRecharge;
    this.catchT = -1; this.guarding = false; this._pose(false);
    this.rig.once('Sword_Dash', { duration: FEEL.dashTime + 0.08, from: 0.12, to: 0.38, fade: 0.03, then: null });
    ctx.sfx && ctx.sfx.dash && ctx.sfx.dash(this);
    ctx.fx && ctx.fx.dashStart && ctx.fx.dashStart(this);
  }
  // the fight asks this when an attack would have hit during i-frames
  nearMiss(ctx) {
    if (this._nmCool > ctx.t) return;
    this._nmCool = ctx.t + 0.25;
    this.stats.nearMiss++; this.addMeter(FEEL.meter.nearMiss, { x: this.x, y: 1.6, z: this.z }); this.counterT = 0.7;
    ctx.sfx && ctx.sfx.nearMiss && ctx.sfx.nearMiss(this);
    ctx.fx && ctx.fx.nearMiss && ctx.fx.nearMiss(this);
  }

  // ---------- getting hurt ----------
  hurt(ctx, dmg = 1, fromX, fromZ, kind = '') {
    if (this.invulnerable) { if (this.state === 'dash') this.nearMiss(ctx); return false; }
    // a white hit goes through the guard: it breaks, you can see it
    if (this.guarding && ctx.fx && ctx.fx.guardBreak) ctx.fx.guardBreak(this);
    this.hearts = Math.max(this.minHearts || 0, this.hearts - dmg * FEEL.heartPerHit); this.inv = FEEL.hurtInv; this.stats.hurt++;
    if (this.hearts < 1e-6) this.hearts = 0;
    const a = Math.atan2(this.x - fromX, this.z - fromZ);
    this.vx = Math.sin(a) * FEEL.knock; this.vz = Math.cos(a) * FEEL.knock;
    if (this.state === 'strike') this._endStrike(true);
    this.aiming = false; this.guarding = false; this._pose(false); this.streak = 0; this.combo = 0; this.comboUntil = -1;
    this.lastHitBy = kind;
    if (this.hearts <= 0) { this.state = 'dead'; this.st = 0; this.rig.once('Death01', { duration: 1.1, from: 0, to: 0.7, fade: 0.06, then: null }); }
    else { this.state = 'hurt'; this.st = 0; this.rig.once(dmg > 1 ? 'Hit_Knockback' : 'Hit_Chest', { duration: dmg > 1 ? 0.5 : 0.32, fade: 0.04, then: null }); }
    this.rig.hitStop(0.07);
    this.rig.flinch = 1; this.rig.flinchDir.set(Math.sin(a), 0, Math.cos(a));
    return true;
  }

  // a scene takes her (her death): she's the scene's to move until it lets go
  scene(on) {
    if (on) {
      if (this.strike) this._endStrike(true);
      this.recallRings(true); this.state = 'scene'; this.st = 0; this.locked = true; this.guarding = false; this._pose(false);
      this.vx = this.vz = this.vy = 0; this.inv = 0; this.root.visible = true; this.catchT = -1; this._diving = false;
    } else if (this.state === 'scene') {
      this.state = 'free'; this.st = 0; this.locked = false; this.y = 0; this.grounded = true;
      const B = this.rig.body; B.y = B.spin = B.pitch = B.roll = 0;
      this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: 0.25, force: true });
    }
  }

  revive() {
    if (this.strike) this._endStrike(true);
    this.state = 'free'; this.st = 0; this.hearts = this.maxHearts || FEEL.hearts; this.inv = 1.2;
    this.y = 0; this.vy = 0; this.grounded = true; this.airN = 0; this.airJumps = FEEL.airJumps; this._diving = false;
    const B = this.rig.body; B.y = 0; B.spin = 0; B.pitch = 0; B.roll = 0; B.squash = 0;
    this.guarding = false; this._posing = false; this.rig.upperStop(0.05); this.streak = 0; this.combo = 0; this.comboT = 0; this.comboUntil = -1; this.catchT = -1; this.lastK = -1e9; this._holdFrom = undefined; this._safeUntil = 0; this._stingerUntil = -1;
    this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: 0.1, force: true }); this.recallRings();
  }

  _post(ctx) {
    const B = this.rig.body;
    if (B.squash > 0) B.squash = Math.max(0, B.squash - ctx.dt * 1.4);
    this._sync();
    if (ctx.boss) this.rig.lookTarget = _v.set(ctx.boss.x, 1.5 + (ctx.boss.airY || 0), ctx.boss.z).clone();
    else if (this.walk) this.rig.lookTarget = ctx.lookAt || null;
    // blink while invulnerable after a hit
    const blink = this.inv > 0 && this.state !== 'dead' && Math.floor(this.inv * 14) % 2 === 0 && this.inv < FEEL.hurtInv - 0.1;
    this.root.visible = !blink || this.inv <= 0;
    this.h.update(ctx.dt);
  }
}
