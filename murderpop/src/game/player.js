// YOU. Movement, the ring combo, the guard (hold right click: block; press it as a hit lands: send it back and hit
// her), the ring throw (E), the dash, the spotlight, getting hurt.
// Everything happens on the floor plane (x, z). The fight hands in a context each frame:
//   ctx = { dt, t (song time), input, aim (THREE.Vector3 on the floor), boss, projectiles, beats, fx, sfx, arena, hud }
// Tuning lives in FEEL at the top; change it from play reports, not from bots.
//
// The beat: a strike pressed on a beat (judged on the press, like any rhythm game: a little early is fine) lands on
// it: it sounds on the beat and flashes gold. On the felt beat (every beat, or every other one in a quick song:
// BeatMap.strikeStep) it hits hard; on the beat between, a little harder than plain; off the beat, half. Three in
// a row on the beat and the third is the finisher. In the spotlight every strike lands on the next eighth.
import * as THREE from 'three';

export const FEEL = {
  runSpeed: 7.6, guardSpeed: 3.1, accel: 75, decel: 60, turnRate: 18,
  radius: 0.42,
  // strikes: [startup to hit, total, lunge metres, damage, clip, clip from, clip to, hit fraction of the window]
  strikes: [
    { name: 'A', clip: 'Sword_Regular_A', dur: 0.28, from: 0.18, to: 0.9, hitAt: 0.48, lunge: 1.0, dmg: 11, cancel: 0.64, sweep: 1 },
    { name: 'B', clip: 'Sword_Regular_B', dur: 0.25, from: 0.2, to: 0.68, hitAt: 0.64, lunge: 1.1, dmg: 11, cancel: 0.7, sweep: -1 },
    { name: 'C', clip: 'Sword_Regular_C', dur: 0.46, from: 0.02, to: 0.36, hitAt: 0.52, lunge: 1.6, dmg: 18, cancel: 0.72, heavy: true, sweep: 0 },
  ],
  punches: [
    { name: 'jab', clip: 'Punch_Jab', dur: 0.24, from: 0.15, to: 0.62, hitAt: 0.45, lunge: 0.6, dmg: 6, cancel: 0.6, sweep: 1 },
    { name: 'cross', clip: 'Punch_Cross', dur: 0.28, from: 0.12, to: 0.55, hitAt: 0.5, lunge: 0.7, dmg: 7, cancel: 0.6, sweep: -1 },
    { name: 'hook', clip: 'Melee_Hook', dur: 0.32, from: 0.0, to: 0.95, hitAt: 0.5, lunge: 0.9, dmg: 10, cancel: 0.7, heavy: true, sweep: 0 },
  ],
  comboWindow: 0.55, strikeRange: 2.4, strikeArc: 1.35, magnetRange: 4.2, magnetArc: 1.1, stopShort: 1.05,
  // the beat: how early / late a press can be and still be on it (seconds, and at most this share of the beat), and
  // what it's worth: on the felt beat (big), on a beat between, off the beat, the finisher, in the solo
  early: 0.08, late: 0.055, earlyK: 0.2, lateK: 0.14, dmgBig: 1.8, dmgOn: 1.1, dmgOff: 0.45, dmgFinisher: 3.0, dmgSolo: 1.6,
  // the guard: a press opens the window (perfect / good: the hit lands this soon after the press); holding blocks
  catchPerfect: 0.11, catchGood: 0.2, catchRadius: 1.7, catchCooldown: 0.3, guardMin: 0.24, blockPush: 5.5,
  // sending it back: a hit of hers turned on her, when she's close enough to reach
  riposte: { reach: 4.4, perfect: 46, good: 30 },
  dashTime: 0.16, dashSpeed: 34, dashIframes: 0.15, dashCharges: 2, dashRecharge: 0.55,
  ringSpeed: 30, ringReturn: 38, ringRange: 13, ringHang: 0.14, ringDmg: 9, ringRadius: 1.15,
  hearts: 5, hurtStun: 0.24, hurtInv: 1.05, knock: 9,
  // the spotlight fills mostly from defence: what you send back, what you slip past, a little from the beat
  meter: { perfectCatch: 0.2, goodCatch: 0.1, block: 0.03, nearMiss: 0.1, onBeatHit: 0.012, ringHit: 0.015, finisher: 0.06 },
};

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));

export class Player {
  constructor(heroine, scene) {
    this.h = heroine;
    this.rig = heroine.rig;
    this.root = heroine.root;
    scene.add(this.root);
    this.x = 0; this.z = 4; this.vx = 0; this.vz = 0;
    this.facing = Math.PI; // facing -z (toward the back of the arena)
    this.state = 'free'; this.st = 0;
    this.hearts = FEEL.hearts; this.inv = 0;
    this.dashCharges = FEEL.dashCharges; this.dashCool = 0;
    this.combo = 0; this.comboT = 0; this.strike = null; this.streak = 0;
    this.catchT = -1; this.catchCool = 0; this.aiming = false;
    this.guarding = false; this._posing = false; this._poseUntil = 0; this.pushT = 0; this.blockK = 0;
    this.meter = 0; this.spot = 0; this.solo = false;
    this.rings = heroine.rings.map((r) => ({ ...r, state: 'hand', pos: new THREE.Vector3(), tgt: new THREE.Vector3(), t: 0, hitOut: false, hitBack: false, spin: 0 }));
    this.counterT = 0;            // after a near miss: next strike is a counter
    this.lastHitBy = '';
    this.locked = false;          // during the opening pose or cinematic bits (never long)
    this.speedMul = 1;
    this.walk = false;            // the credits: no fighting, the hands reach for things (ctx.onInteract)
    this.ringHeld = 0;
    this.clock = 0;
    this.stats = { hits: 0, onBeat: 0, catches: 0, perfect: 0, nearMiss: 0, ringHits: 0, hurt: 0, damage: 0, blocks: 0, ripostes: 0, finishers: 0 };
    this.rig.play('Sword_Idle', { fade: 0 });
  }

  get pos() { return _v.set(this.x, 0, this.z); }
  get invulnerable() { return this.inv > 0 || (this.state === 'dash' && this.st < FEEL.dashIframes) || this.state === 'dead' || this.state === 'spot'; }
  // the press's window: a hit landing in it is sent back
  get catching() { return this.catchT >= 0 && this.catchT <= FEEL.catchGood; }
  // the held guard: a pink hit landing on it is stopped (no window: nothing goes back)
  get blocking() { return this.guarding && (this.state === 'free' || this.state === 'catch'); }
  ringsInHand() { return this.rings.filter((r) => r.state === 'hand').length; }

  place(x, z, facing) { this.x = x; this.z = z; this.vx = this.vz = 0; if (facing !== undefined) this.facing = facing; this._sync(); }
  _sync() { this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.facing; }

  heal(n = 1) { this.hearts = Math.min(this.maxHearts || FEEL.hearts, this.hearts + n); }
  // the spotlight's meter: faster the hotter your combo is; from: where it was earned (gold motes fly from there to you)
  addMeter(k, from) {
    if (this.solo) return;
    const was = this.meter; this.meter = Math.min(1, this.meter + k * (1 + 0.1 * (this.heat || 0)));
    if (from && this._fx && this.meter > was && was < 1) this._fx.mote(from, this, k >= 0.1 ? 4 : 2);
    if (was < 1 && this.meter >= 1) this._meterFull = true;
  }

  // judgement of an action at song time t against the beat grid (the ring throw, and anything else that asks)
  // on: on a beat; big: on the felt beat (the strike grid)
  beatJudge(ctx, t = ctx.t) {
    const bm = ctx.beats;
    if (!bm) return { on: false, big: false, off: 1 };
    const n = bm.nearest(t, 1), per = bm.periodAt(t);
    const on = n.offset >= -Math.min(FEEL.early, per * FEEL.earlyK) && n.offset <= Math.min(FEEL.late, per * FEEL.lateK);
    const big = on && (Math.round(n.beat - bm.downbeat) % bm.strikeStep + bm.strikeStep) % bm.strikeStep === 0;
    return { on, big, off: n.offset, time: n.time };
  }
  // a strike pressed at song time pressT, starting now, its hit su0 after the start at its own speed: on the beat if
  // the press was (then the hit lands on that beat, or as soon after it as it can); in the spotlight, the next eighth
  _beatTime(ctx, pressT, su0) {
    const bm = ctx.beats; if (!bm) return null;
    const tHit = ctx.t + su0;
    if (this.solo) {
      for (const sub of [2, 4]) { const g = bm.timeOf(Math.ceil(bm.beatAt(tHit - 0.05) * sub) / sub); if (g - tHit <= 0.13 || sub === 4) return { g, on: true, big: true, beat: g }; }
    }
    const j = this.beatJudge(ctx, pressT);
    if (!j.on) return null;
    return { g: Math.max(j.time, ctx.t + su0 * 0.55), on: true, big: j.big, beat: j.time };
  }

  update(ctx) {
    const { dt, input } = ctx;
    const now = performance.now();
    this.st += dt; this.clock += dt; this._fx = ctx.fx;
    if (this.inv > 0) this.inv -= dt;
    if (this.counterT > 0) this.counterT -= dt;
    if (this.catchT >= 0) this.catchT += dt;
    if (this.catchCool > 0) this.catchCool -= dt;
    if (this.pushT > 0) this.pushT -= dt;
    if (this.comboT > 0) this.comboT -= dt; else { this.combo = 0; this.streak = 0; }
    this.blockK = Math.max(0, this.blockK - dt * 5);
    if (this.dashCharges < FEEL.dashCharges) { this.dashCool -= dt; if (this.dashCool <= 0) { this.dashCharges++; this.dashCool = FEEL.dashRecharge; } }
    const aimAng = Math.atan2(ctx.aim.x - this.x, ctx.aim.z - this.z);

    if (this.state === 'dead') { this.guarding = false; this._pose(false); this._integrate(dt, 0, 0, FEEL.decel); this._post(ctx); return; }

    // ---- inputs that can interrupt ----
    if (this.walk && !this.locked) {
      if (input.peek('dash', now, 120) && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) { input.take('dash', now, 120); this._dash(ctx, aimAng); }
      if (input.take('strike', now, 220) || input.take('parry', now, 220) || input.take('spot', now, 220) || input.take('throw', now, 220)) ctx.onInteract && ctx.onInteract();
      input.takeRelease('parry'); input.takeRelease('strike');
    } else if (!this.locked && this.state !== 'hurt' && this.state !== 'spot') {
      // spotlight
      if (this.meter >= 1 && input.take('spot', now, 200)) { ctx.onSpotlight && ctx.onSpotlight(); }
      // dash: cancels everything but itself (and the catch's first frames)
      if (input.peek('dash', now, 120) && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) {
        input.take('dash', now, 120);
        this._dash(ctx, aimAng);
      }
      // the guard: a press opens the window (any time but a dash); holding it keeps the guard up
      if (input.take('parry', now, 130)) {
        if (this.catchCool <= 0) { this.catchT = 0; this.catchCool = FEEL.catchCooldown; this._catchPose(ctx, aimAng); }
        this._poseUntil = this.clock + FEEL.guardMin;
      }
      input.takeRelease('parry');
      this.guarding = input.isDown('parry') && (this.state === 'free' || this.state === 'catch');
      // the ring throw: at the reticle, now
      if (input.take('throw', now, 200) && this.ringsInHand() > 0) {
        const s = this.strike;
        if (this.state === 'free' || this.state === 'catch' || (this.state === 'strike' && s && !s.riposte && this.st >= s.dur * s.cancel)) {
          if (this.state === 'strike') { this.state = 'free'; this.st = 0; }
          this._throw(ctx, aimAng);
        }
      }
      // strike (LMB), buffered while striking
      if (input.peek('strike', now, 220)) {
        const s = this.strike;
        // the press's own song time: a press held over from a moment ago is judged when it was made
        const go = () => { const p = input.take('strike', now, 220); const pt = p ? (p.songT ?? ctx.t - Math.max(0, Math.min(0.25, (now - p.t) / 1000))) : ctx.t; this._strike(ctx, aimAng, pt); };
        if (this.state === 'free' || this.state === 'catch') go();
        else if (this.state === 'strike' && !s.riposte && this.st >= s.dur * s.cancel) go();
        else if (this.state === 'dash' && this.st >= FEEL.dashTime * 0.6) go();
      }
    } else this.guarding = false;
    // the guard pose: held while guarding, and for a moment after a tap
    this._pose((this.guarding || this.clock < this._poseUntil) && (this.state === 'free' || this.state === 'catch'));

    // ---- state behaviour ----
    const mv = this.locked ? { x: 0, y: 0 } : input.move();
    let speed = FEEL.runSpeed * this.speedMul;
    if (this.guarding) speed = FEEL.guardSpeed * this.speedMul;
    if (this.state === 'free' || this.state === 'catch') {
      const tvx = mv.x * speed, tvz = mv.y * speed;
      this._integrate(dt, tvx, tvz, this.pushT > 0 ? 14 : (mv.x || mv.y) ? FEEL.accel : FEEL.decel);
      // facing: the aim while guarding or just after a strike, else the way you run
      const moving = Math.hypot(this.vx, this.vz) > 0.8;
      const justStruck = this.comboT > FEEL.comboWindow - 0.22 && this.combo !== 0;
      let want = this.facing;
      if (this.guarding || this.catching) want = aimAng;
      else if (justStruck) want = this.facing;
      else if (moving) want = Math.atan2(this.vx, this.vz);
      this._turn(want, dt, this.guarding || this.catching ? 30 : FEEL.turnRate);
      if (this.state === 'catch' && this.catchT > FEEL.catchGood + 0.05) this.state = 'free';
      // legs: a guarded walk, a run, or the stance
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > 0.6) this.rig.play(this.guarding ? 'Walk_Loop' : 'Sprint_Loop', { speed: this.guarding ? Math.max(0.8, sp / 2.2) : Math.max(0.7, sp / 6.4), fade: 0.12 });
      else this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: this.walk ? 0.3 : 0.18 });
      this.rig.lean.set(clamp(angDiff(Math.atan2(this.vx, this.vz), this.facing) * sp * -0.01, -0.12, 0.12), this.guarding ? 0.1 : Math.min(0.14, sp * 0.012));
    } else if (this.state === 'strike') {
      const s = this.strike;
      // lunge along the strike direction during the startup
      const k = this.st / s.dur;
      const lungeK = k < s.hitAt ? 1 : Math.max(0, 1 - (k - s.hitAt) * 3);
      const lv = (this._lunge / (s.dur * s.hitAt)) * lungeK;
      this._integrate(dt, Math.sin(this._strikeAng) * lv, Math.cos(this._strikeAng) * lv, 200);
      this._turn(this._strikeAng, dt, 40);
      if (!s.hit && k >= s.hitAt) { s.hit = true; this._strikeHit(ctx); }
      if (this.st >= s.dur) { this.state = 'free'; this.st = 0; }
      this.rig.lean.set(0, s.finisher || s.riposte ? 0.16 : 0.05);
    } else if (this.state === 'dash') {
      const k = this.st / FEEL.dashTime;
      const v = FEEL.dashSpeed * (k < 1 ? (1 - k * k * 0.7) : 0.2);
      this.vx = Math.sin(this._dashAng) * v; this.vz = Math.cos(this._dashAng) * v;
      this._move(dt);
      this._turn(this._dashAng, dt, 50);
      if (this.st >= FEEL.dashTime) { this.state = 'free'; this.st = 0; this.vx *= 0.35; this.vz *= 0.35; ctx.fx && ctx.fx.dashEnd(this); }
      this.rig.lean.set(0, 0.25);
    } else if (this.state === 'hurt') {
      this._integrate(dt, 0, 0, 30);
      if (this.st >= FEEL.hurtStun) { this.state = 'free'; this.st = 0; }
    } else if (this.state === 'spot') {
      this._integrate(dt, 0, 0, FEEL.decel);
    }

    this._rings(ctx);
    if (this._meterFull) { this._meterFull = false; ctx.sfx && ctx.sfx.meterFull && ctx.sfx.meterFull(); ctx.fx && ctx.fx.meterFull && ctx.fx.meterFull(this); }
    this._post(ctx);
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

  // ---------- strike ----------
  _strike(ctx, aimAng, pressT = ctx.t) {
    const ringsIn = this.ringsInHand();
    const set = ringsIn > 0 ? FEEL.strikes : FEEL.punches;
    if (this.comboT <= 0) { this.combo = 0; this.streak = 0; }
    const idx = this.combo % set.length;
    const s = { ...set[idx], hit: false, idx, armed: ringsIn > 0 };
    this.combo = (this.combo + 1) % set.length;
    // magnet: toward the boss if she's close and roughly where you're aiming
    let ang = aimAng, lunge = s.lunge;
    const b = ctx.boss;
    if (b && b.targetable) {
      const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
      const bAng = Math.atan2(dx, dz);
      if (dist < FEEL.magnetRange + b.radius && Math.abs(angDiff(bAng, aimAng)) < FEEL.magnetArc) {
        ang = bAng;
        lunge = clamp(dist - b.radius - FEEL.stopShort, 0, s.lunge + 1.4);
      }
    }
    // the beat: pressed on one, the hit lands on it
    const su0 = s.dur * s.hitAt, bt = this._beatTime(ctx, pressT, su0);
    s.on = !!(bt && bt.on); s.big = !!(bt && bt.big); s.beatT = bt ? bt.beat : null; s.pressT = pressT;   // the beat it was pressed on, and when
    if (bt) { const su = clamp(bt.g - ctx.t, su0 * 0.55, su0 + 0.16); s.dur = su / s.hitAt; }
    // three on the beat: the third is the finisher
    this.streak = s.on ? this.streak + 1 : 0;
    if (idx === set.length - 1) { if (s.on && this.streak >= set.length && !this.solo) { s.finisher = true; s.heavy = true; } this.streak = 0; }
    // the combo waits a beat and a half of the strike grid for the next one
    const period = ctx.beats ? ctx.beats.periodAt(ctx.t) * ctx.beats.strikeStep : 0.5;
    this.comboT = Math.max(FEEL.comboWindow + s.dur, period * 1.45);
    this._strikeAng = ang; this._lunge = lunge * (s.finisher ? 1.25 : 1);
    this.facing = ang;
    this.state = 'strike'; this.st = 0; this.strike = s;
    this.catchT = -1;
    this._pose(false);
    this.rig.once(s.clip, { duration: s.dur, from: s.from, to: s.to, fade: 0.05, then: null });
    ctx.sfx && ctx.sfx.swing && ctx.sfx.swing(s, this);
    ctx.fx && ctx.fx.swing && ctx.fx.swing(this, s);
  }

  _strikeHit(ctx) {
    const s = this.strike, b = ctx.boss;
    ctx.fx && ctx.fx.slash && ctx.fx.slash(this, s, this._strikeAng);
    // breakables first (props in the arena)
    ctx.onStrikeArc && ctx.onStrikeArc(this.x, this.z, this._strikeAng, FEEL.strikeRange, FEEL.strikeArc, s);
    if (!b || !b.targetable) return;
    const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
    const range = s.riposte ? FEEL.riposte.reach : FEEL.strikeRange;
    if (dist > range + b.radius) return;
    if (!s.riposte && Math.abs(angDiff(Math.atan2(dx, dz), this._strikeAng)) > FEEL.strikeArc && dist > b.radius + 0.4) return;
    let dmg = s.dmg;
    const on = s.on || s.riposte;
    if (!s.riposte) dmg *= this.solo ? FEEL.dmgSolo : s.finisher ? FEEL.dmgFinisher : s.big ? FEEL.dmgBig : s.on ? FEEL.dmgOn : FEEL.dmgOff;
    dmg *= 1 + 0.06 * (this.heat || 0);           // a hot combo hits harder
    const counter = this.counterT > 0 && !s.riposte; if (counter) { dmg *= 1.5; this.counterT = 0; }
    const big = !!(s.heavy || counter || s.finisher || s.riposte);
    const res = b.takeHit({ dmg, kind: 'strike', heavy: big, from: this, onBeat: on, bigBeat: !!(s.big || s.finisher || this.solo), x: this.x, z: this.z, ang: this._strikeAng, finisher: !!s.finisher, riposte: !!s.riposte });
    if (res && res.landed) {
      this.stats.hits++; if (on) this.stats.onBeat++; this.stats.damage += res.dmg || dmg;
      if (s.finisher) this.stats.finishers++;
      if (s.riposte) this.stats.ripostes++;
      this.rig.hitStop(s.riposte ? 0.13 : s.finisher ? 0.12 : big ? 0.085 : on ? 0.065 : 0.045);
      const at = { x: b.x, y: 1.3, z: b.z };
      if (on && !s.riposte) this.addMeter(FEEL.meter.onBeatHit, s.big ? at : null);
      if (s.finisher) this.addMeter(FEEL.meter.finisher, at);
      ctx.onPlayerLanded && ctx.onPlayerLanded(s, res, on, counter);
    } else if (res && res.deflected) this.streak = 0;
  }

  // the fight turns a hit of hers you sent back into this: a cut that reaches her and lands at once.
  // Returns false when she's out of reach (the fight sends the gold back at her instead).
  riposte(ctx, q) {
    const b = ctx.boss;
    if (!b || !b.targetable || this.state === 'dead') return false;
    const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
    if (dist > FEEL.riposte.reach + b.radius) return false;
    const armed = this.ringsInHand() > 0;
    const s = armed
      ? { name: 'R', clip: 'Sword_Regular_C', dur: 0.24, from: 0.02, to: 0.36, hitAt: 0.42, cancel: 1, sweep: 0 }
      : { name: 'R', clip: 'Melee_Hook', dur: 0.24, from: 0.0, to: 0.95, hitAt: 0.45, cancel: 1, sweep: 0 };
    Object.assign(s, { hit: false, idx: 2, armed, riposte: true, heavy: true, on: true, q, dmg: q === 'perfect' ? FEEL.riposte.perfect : FEEL.riposte.good });
    const ang = Math.atan2(dx, dz);
    this._strikeAng = ang; this._lunge = clamp(dist - b.radius - FEEL.stopShort, 0, FEEL.riposte.reach);
    this.facing = ang; this.state = 'strike'; this.st = 0; this.strike = s;
    this.catchT = -1; this.combo = 0; this.streak = 0; this.comboT = 0;
    this._pose(false);
    this.rig.once(s.clip, { duration: s.dur, from: s.from, to: s.to, fade: 0.03, then: null });
    ctx.sfx && ctx.sfx.swing && ctx.sfx.swing({ name: 'F' }, this);
    ctx.fx && ctx.fx.swing && ctx.fx.swing(this, s);
    return true;
  }

  // ---------- the guard ----------
  _pose(on) {
    if (on === this._posing) return;
    this._posing = on;
    if (on) this.rig.upperHold('Sword_Block', { duration: 0.1, from: 0.08, to: 0.3, fade: 0.05 });
    else this.rig.upperStop(0.1);
  }
  _catchPose(ctx, aimAng) {
    if (this.state === 'free') { this.state = 'catch'; this.st = 0; }
    if (this.state === 'catch') this.facing = aimAng;
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
    this.catchCool = Math.min(this.catchCool, 0.12); // ...but a quick follow-up is allowed
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

  // ---------- ring throw ----------
  _throw(ctx, aimAng) {
    const r = this.rings.find((x) => x.state === 'hand' && x.side === 'R') || this.rings.find((x) => x.state === 'hand');
    if (!r) return;
    const tgt = _v2.copy(ctx.aim); tgt.y = 0;
    const dx = tgt.x - this.x, dz = tgt.z - this.z, d = Math.hypot(dx, dz) || 1;
    const range = Math.min(FEEL.ringRange, Math.max(2.5, d));
    r.tgt.set(this.x + dx / d * range, 1.0, this.z + dz / d * range);
    // detach from the hand into the world
    r.holder.getWorldPosition(r.pos);
    const world = this.root.parent;
    world.attach(r.holder);
    r.state = 'out'; r.t = 0; r.hitOut = false; r.hitBack = false; r.spin = 0;
    r.judge = this.beatJudge(ctx);
    this.facing = aimAng;
    this._pose(false);
    this.rig.upperOnce('OverhandThrow', { duration: 0.32, from: 0.28, to: 0.62, fade: 0.04 });
    ctx.sfx && ctx.sfx.ringThrow && ctx.sfx.ringThrow(r);
    ctx.fx && ctx.fx.ringTrail && ctx.fx.ringTrail(r, true);
  }

  _rings(ctx) {
    const dt = ctx.dt, b = ctx.boss;
    for (const r of this.rings) {
      if (r.state === 'hand') continue;
      r.t += dt; r.spin += dt * 28;
      if (r.state === 'out') {
        _v.copy(r.tgt).sub(r.pos); const d = _v.length();
        const step = FEEL.ringSpeed * dt;
        if (d <= step) { r.pos.copy(r.tgt); r.state = 'hang'; r.t = 0; } else r.pos.addScaledVector(_v, step / d);
        if (!r.hitOut && b && b.targetable && Math.hypot(b.x - r.pos.x, b.z - r.pos.z) < FEEL.ringRadius + b.radius) { r.hitOut = true; this._ringHit(ctx, r); }
      } else if (r.state === 'hang') {
        if (r.t >= FEEL.ringHang) { r.state = 'back'; r.t = 0; ctx.sfx && ctx.sfx.ringRecall && ctx.sfx.ringRecall(r); }
      } else if (r.state === 'back') {
        const hand = (r.side === 'L' ? this.h.rig.bones.hand_l : this.h.rig.bones.hand_r);
        const hp = hand ? hand.getWorldPosition(_v2) : _v2.set(this.x, 1, this.z);
        _v.copy(hp).sub(r.pos); const d = _v.length();
        const sp = FEEL.ringReturn * Math.min(1.6, 0.6 + r.t * 2.5);
        if (d <= sp * dt + 0.25) { this._ringHome(ctx, r); continue; }
        r.pos.addScaledVector(_v, (sp * dt) / d);
        if (!r.hitBack && b && b.targetable && Math.hypot(b.x - r.pos.x, b.z - r.pos.z) < FEEL.ringRadius + b.radius) { r.hitBack = true; this._ringHit(ctx, r); }
      }
      r.holder.position.copy(r.pos);
      r.holder.rotation.set(Math.PI / 2, 0, r.spin);
    }
  }
  _ringHit(ctx, r) {
    const on = r.judge && r.judge.on;
    const res = ctx.boss.takeHit({ dmg: FEEL.ringDmg * (on ? 1.25 : 1), kind: 'ring', heavy: false, from: this, onBeat: on, x: r.pos.x, z: r.pos.z, ang: 0 });
    if (res && res.landed) { this.stats.ringHits++; this.addMeter(FEEL.meter.ringHit, on ? r.pos : null); ctx.onPlayerLanded && ctx.onPlayerLanded({ name: 'ring' }, res, on, false, r.pos); }
  }
  _ringHome(ctx, r) {
    r.state = 'hand';
    const bone = r.bone;
    bone.attach(r.holder);
    r.holder.position.set(0, 0, 0); r.holder.rotation.set(0, 0, 0); r.holder.scale.set(1, 1, 1);
    ctx.sfx && ctx.sfx.ringCatch && ctx.sfx.ringCatch(r);
    ctx.fx && ctx.fx.ringTrail && ctx.fx.ringTrail(r, false);
  }
  recallRings() { for (const r of this.rings) if (r.state !== 'hand') { r.state = 'back'; r.t = 0.5; } }

  // ---------- dash ----------
  _dash(ctx, aimAng) {
    const mv = ctx.input.move();
    this._dashAng = (mv.x || mv.y) ? Math.atan2(mv.x, mv.y) : this.facing;
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
    this.hearts = Math.max(this.minHearts || 0, this.hearts - dmg); this.inv = FEEL.hurtInv; this.stats.hurt++;
    const a = Math.atan2(this.x - fromX, this.z - fromZ);
    this.vx = Math.sin(a) * FEEL.knock; this.vz = Math.cos(a) * FEEL.knock;
    this.aiming = false; this.guarding = false; this._pose(false); this.streak = 0;
    this.lastHitBy = kind;
    if (this.hearts <= 0) { this.state = 'dead'; this.st = 0; this.rig.once('Death01', { duration: 1.1, from: 0, to: 0.7, fade: 0.06, then: null }); }
    else { this.state = 'hurt'; this.st = 0; this.rig.once(dmg > 1 ? 'Hit_Knockback' : 'Hit_Chest', { duration: dmg > 1 ? 0.5 : 0.32, fade: 0.04, then: null }); }
    this.rig.hitStop(0.07);
    this.rig.flinch = 1; this.rig.flinchDir.set(Math.sin(a), 0, Math.cos(a));
    return true;
  }

  revive() {
    this.state = 'free'; this.st = 0; this.hearts = this.maxHearts || FEEL.hearts; this.inv = 1.2;
    this.guarding = false; this._posing = false; this.rig.upperStop(0.05); this.streak = 0; this.combo = 0; this.comboT = 0; this.catchT = -1;
    this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: 0.1, force: true }); this.recallRings();
  }

  _post(ctx) {
    this._sync();
    if (ctx.boss) this.rig.lookTarget = _v.set(ctx.boss.x, 1.5, ctx.boss.z).clone();
    else if (this.walk) this.rig.lookTarget = ctx.lookAt || null;
    // blink while invulnerable after a hit
    const blink = this.inv > 0 && this.state !== 'dead' && Math.floor(this.inv * 14) % 2 === 0 && this.inv < FEEL.hurtInv - 0.1;
    this.root.visible = !blink || this.inv <= 0;
    this.h.update(ctx.dt);
  }
}
