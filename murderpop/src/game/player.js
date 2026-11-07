// YOU. Movement, the ring combo, the catch, the ring throw, the dash, the spotlight, getting hurt.
// Everything happens on the floor plane (x, z). The fight hands in a context each frame:
//   ctx = { dt, t (song time), input, aim (THREE.Vector3 on the floor), boss, projectiles, beats, fx, sfx, arena, hud }
// Tuning lives in FEEL at the top; change it from play reports, not from bots.
import * as THREE from 'three';

export const FEEL = {
  runSpeed: 7.6, aimSpeed: 4.4, catchSpeed: 5.0, accel: 75, decel: 60, turnRate: 18,
  radius: 0.42,
  // strikes: [startup to hit, total, lunge metres, damage, clip, clip from, clip to, hit fraction of the window]
  strikes: [
    { name: 'A', clip: 'Sword_Regular_A', dur: 0.28, from: 0.18, to: 0.9, hitAt: 0.48, lunge: 1.0, dmg: 11, cancel: 0.64 },
    { name: 'B', clip: 'Sword_Regular_B', dur: 0.25, from: 0.2, to: 0.68, hitAt: 0.64, lunge: 1.1, dmg: 11, cancel: 0.7 },
    { name: 'C', clip: 'Sword_Regular_C', dur: 0.46, from: 0.02, to: 0.36, hitAt: 0.52, lunge: 1.6, dmg: 18, cancel: 0.72, heavy: true },
  ],
  punches: [
    { name: 'jab', clip: 'Punch_Jab', dur: 0.24, from: 0.15, to: 0.62, hitAt: 0.45, lunge: 0.6, dmg: 6, cancel: 0.6 },
    { name: 'cross', clip: 'Punch_Cross', dur: 0.28, from: 0.12, to: 0.55, hitAt: 0.5, lunge: 0.7, dmg: 7, cancel: 0.6 },
    { name: 'hook', clip: 'Melee_Hook', dur: 0.32, from: 0.0, to: 0.95, hitAt: 0.5, lunge: 0.9, dmg: 10, cancel: 0.7, heavy: true },
  ],
  comboWindow: 0.55, strikeRange: 2.4, strikeArc: 1.35, magnetRange: 4.2, magnetArc: 1.1, stopShort: 1.05,
  catchPerfect: 0.11, catchGood: 0.2, catchRadius: 1.7, catchCooldown: 0.34, holdToAim: 0.2,
  dashTime: 0.16, dashSpeed: 34, dashIframes: 0.15, dashCharges: 2, dashRecharge: 0.55,
  ringSpeed: 30, ringReturn: 38, ringRange: 13, ringHang: 0.14, ringDmg: 9, ringRadius: 1.15,
  hearts: 5, hurtStun: 0.24, hurtInv: 1.05, knock: 9,
  onBeat: 0.07,
  meter: { perfectCatch: 0.12, goodCatch: 0.06, nearMiss: 0.16, onBeatHit: 0.03, ringHit: 0.025, comboC: 0.04 },
};

const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

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
    this.combo = 0; this.comboT = 0; this.strike = null; this.queued = false;
    this.catchT = -1; this.catchCool = 0; this.aiming = false; this.rmbDownAt = 0;
    this.meter = 0; this.spot = 0;
    this.rings = heroine.rings.map((r) => ({ ...r, state: 'hand', pos: new THREE.Vector3(), tgt: new THREE.Vector3(), t: 0, hitOut: false, hitBack: false, spin: 0 }));
    this.counterT = 0;            // after a near miss: next strike is a counter
    this.lastHitBy = '';
    this.locked = false;          // during the opening pose or cinematic bits (never long)
    this.speedMul = 1;
    this.walk = false;            // the credits: no fighting, the hands reach for things (ctx.onInteract)
    this.ringHeld = 0;
    this.stats = { hits: 0, onBeat: 0, catches: 0, perfect: 0, nearMiss: 0, ringHits: 0, hurt: 0, damage: 0 };
    this.rig.play('Sword_Idle', { fade: 0 });
  }

  get pos() { return _v.set(this.x, 0, this.z); }
  get invulnerable() { return this.inv > 0 || (this.state === 'dash' && this.st < FEEL.dashIframes) || this.state === 'dead' || this.state === 'spot'; }
  get catching() { return this.catchT >= 0 && this.catchT <= FEEL.catchGood; }
  ringsInHand() { return this.rings.filter((r) => r.state === 'hand').length; }

  place(x, z, facing) { this.x = x; this.z = z; this.vx = this.vz = 0; if (facing !== undefined) this.facing = facing; this._sync(); }
  _sync() { this.root.position.set(this.x, 0, this.z); this.root.rotation.y = this.facing; }

  heal(n = 1) { this.hearts = Math.min(this.maxHearts || FEEL.hearts, this.hearts + n); }
  addMeter(k) { if (this.spot > 0) return; this.meter = Math.min(1, this.meter + k); }

  // judgement of an action at song time t against the beat grid
  beatJudge(ctx) {
    if (!ctx.beats) return { on: false, off: 1 };
    const n = ctx.beats.nearest(ctx.t, 2); // eighth notes count too
    const nq = ctx.beats.nearest(ctx.t, 1);
    const on = Math.abs(nq.offset) <= FEEL.onBeat || Math.abs(n.offset) <= FEEL.onBeat * 0.7;
    return { on, off: nq.offset };
  }

  update(ctx) {
    const { dt, input } = ctx;
    const now = performance.now();
    this.st += dt;
    if (this.inv > 0) this.inv -= dt;
    if (this.counterT > 0) this.counterT -= dt;
    if (this.catchT >= 0) this.catchT += dt;
    if (this.catchCool > 0) this.catchCool -= dt;
    if (this.comboT > 0) this.comboT -= dt; else this.combo = 0;
    if (this.dashCharges < FEEL.dashCharges) { this.dashCool -= dt; if (this.dashCool <= 0) { this.dashCharges++; this.dashCool = FEEL.dashRecharge; } }
    const aimAng = Math.atan2(ctx.aim.x - this.x, ctx.aim.z - this.z);

    if (this.state === 'dead') { this._integrate(dt, 0, 0, FEEL.decel); this._post(ctx); return; }

    // ---- inputs that can interrupt ----
    if (this.walk && !this.locked) {
      if (input.peek('dash', now, 120) && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) { input.take('dash', now, 120); this._dash(ctx, aimAng); }
      if (input.take('strike', now, 220) || input.take('parry', now, 220) || input.take('spot', now, 220)) ctx.onInteract && ctx.onInteract();
      input.takeRelease('parry'); input.takeRelease('strike');
    } else if (!this.locked && this.state !== 'hurt' && this.state !== 'spot') {
      // spotlight
      if (this.meter >= 1 && input.take('spot', now, 200)) { ctx.onSpotlight && ctx.onSpotlight(); }
      // dash: cancels everything but itself (and the catch's first frames)
      if (input.peek('dash', now, 120) && this.dashCharges > 0 && (this.state !== 'dash' || this.st > FEEL.dashTime * 0.8)) {
        input.take('dash', now, 120);
        this._dash(ctx, aimAng);
      }
      // catch / aim with RMB
      const rmb = input.take('parry', now, 130);
      if (rmb) {
        this.rmbDownAt = now;
        if (this.catchCool <= 0) { this.catchT = 0; this.catchCool = FEEL.catchCooldown; this._catchPose(ctx, aimAng); }
      }
      const rmbHeld = input.isDown('parry');
      if (rmbHeld && !this.aiming && this.rmbDownAt && (now - this.rmbDownAt) / 1000 > FEEL.holdToAim && this.ringsInHand() > 0 && this.state !== 'dash') {
        this.aiming = true; ctx.fx && ctx.fx.aimLine(true);
      }
      const rel = input.takeRelease('parry');
      if (rel && this.aiming) { this.aiming = false; ctx.fx && ctx.fx.aimLine(false); this._throw(ctx, aimAng); }
      else if (rel) { this.aiming = false; }
      // strike (LMB), buffered while striking
      if (input.peek('strike', now, 220)) {
        if (this.state === 'free' || this.state === 'catch') { input.take('strike', now, 220); this._strike(ctx, aimAng); }
        else if (this.state === 'strike' && this.st >= this.strike.dur * this.strike.cancel) { input.take('strike', now, 220); this._strike(ctx, aimAng); }
        else if (this.state === 'dash' && this.st >= FEEL.dashTime * 0.6) { input.take('strike', now, 220); this._strike(ctx, aimAng); }
      }
    }

    // ---- state behaviour ----
    const mv = this.locked ? { x: 0, y: 0 } : input.move();
    let speed = FEEL.runSpeed * this.speedMul;
    if (this.aiming) speed = FEEL.aimSpeed;
    if (this.state === 'free' || this.state === 'catch') {
      const tvx = mv.x * speed, tvz = mv.y * speed;
      this._integrate(dt, tvx, tvz, (mv.x || mv.y) ? FEEL.accel : FEEL.decel);
      // facing: the aim while aiming/catching or just after a strike, else the way you run
      const moving = Math.hypot(this.vx, this.vz) > 0.8;
      const justStruck = this.comboT > FEEL.comboWindow - 0.22;
      let want = this.facing;
      if (this.aiming || this.catching) want = aimAng;
      else if (justStruck) want = this.facing;
      else if (moving) want = Math.atan2(this.vx, this.vz);
      this._turn(want, dt, this.aiming || this.catching ? 30 : FEEL.turnRate);
      if (this.state === 'catch' && this.catchT > FEEL.catchGood + 0.05) this.state = 'free';
      // legs
      const sp = Math.hypot(this.vx, this.vz);
      if (sp > 0.6) this.rig.play('Sprint_Loop', { speed: Math.max(0.7, sp / 6.4), fade: 0.12 });
      else this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: this.walk ? 0.3 : 0.18 });
      this.rig.lean.set(THREE.MathUtils.clamp(angDiff(Math.atan2(this.vx, this.vz), this.facing) * sp * -0.01, -0.12, 0.12), Math.min(0.14, sp * 0.012));
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
      this.rig.lean.set(0, 0.05);
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
  _strike(ctx, aimAng) {
    const ringsIn = this.ringsInHand();
    const set = ringsIn > 0 ? FEEL.strikes : FEEL.punches;
    if (this.comboT <= 0) this.combo = 0;
    const s = { ...set[this.combo % set.length], hit: false };
    this.combo = (this.combo + 1) % set.length; this.comboT = FEEL.comboWindow + s.dur;
    // magnet: toward the boss if she's close and roughly where you're aiming
    let ang = aimAng, lunge = s.lunge;
    const b = ctx.boss;
    if (b && b.targetable) {
      const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
      const bAng = Math.atan2(dx, dz);
      if (dist < FEEL.magnetRange + b.radius && Math.abs(angDiff(bAng, aimAng)) < FEEL.magnetArc) {
        ang = bAng;
        lunge = THREE.MathUtils.clamp(dist - b.radius - FEEL.stopShort, 0, s.lunge + 1.4);
      }
    }
    this._strikeAng = ang; this._lunge = lunge;
    this.facing = ang;
    this.state = 'strike'; this.st = 0; this.strike = s;
    s.judge = this.beatJudge(ctx);
    this.rig.once(s.clip, { duration: s.dur, from: s.from, to: s.to, fade: 0.05, then: null });
    ctx.sfx && ctx.sfx.swing && ctx.sfx.swing(s, this);
    ctx.fx && ctx.fx.swing && ctx.fx.swing(this, s);
  }

  _strikeHit(ctx) {
    const s = this.strike, b = ctx.boss;
    // breakables first (props in the arena)
    ctx.onStrikeArc && ctx.onStrikeArc(this.x, this.z, this._strikeAng, FEEL.strikeRange, FEEL.strikeArc, s);
    if (!b || !b.targetable) return;
    const dx = b.x - this.x, dz = b.z - this.z, dist = Math.hypot(dx, dz);
    if (dist > FEEL.strikeRange + b.radius) return;
    if (Math.abs(angDiff(Math.atan2(dx, dz), this._strikeAng)) > FEEL.strikeArc && dist > b.radius + 0.4) return;
    let dmg = s.dmg;
    const on = s.judge.on;
    if (on) dmg *= 1.25;
    const counter = this.counterT > 0; if (counter) { dmg *= 1.5; this.counterT = 0; }
    const res = b.takeHit({ dmg, kind: 'strike', heavy: !!s.heavy || counter, from: this, onBeat: on, x: this.x, z: this.z, ang: this._strikeAng });
    if (res && res.landed) {
      this.stats.hits++; if (on) this.stats.onBeat++; this.stats.damage += res.dmg || dmg;
      this.rig.hitStop(s.heavy || counter ? 0.085 : 0.055);
      if (on) this.addMeter(FEEL.meter.onBeatHit);
      if (s.name === 'C' || s.name === 'hook') this.addMeter(FEEL.meter.comboC);
      ctx.onPlayerLanded && ctx.onPlayerLanded(s, res, on, counter);
    }
  }

  // ---------- catch ----------
  _catchPose(ctx, aimAng) {
    if (this.state === 'free') { this.state = 'catch'; this.st = 0; }
    this.rig.upperOnce('Sword_Block', { duration: 0.28, from: 0.08, to: 0.4, fade: 0.04 });
    ctx.fx && ctx.fx.catchFlash && ctx.fx.catchFlash(this, false);
  }
  // called by the fight when a catchable thing reaches you while the window is open. Returns 'perfect'|'good'|null
  tryCatch() {
    if (!this.catching) return null;
    const q = this.catchT <= FEEL.catchPerfect ? 'perfect' : 'good';
    return q;
  }
  caught(q, ctx) {
    this.stats.catches++; if (q === 'perfect') this.stats.perfect++;
    this.addMeter(q === 'perfect' ? FEEL.meter.perfectCatch : FEEL.meter.goodCatch);
    this.rig.hitStop(q === 'perfect' ? 0.09 : 0.05);
    this.catchT = FEEL.catchGood + 0.001; // one catch per press...
    this.catchCool = Math.min(this.catchCool, 0.12); // ...but a quick follow-up is allowed
  }

  // ---------- ring throw ----------
  _throw(ctx, aimAng) {
    const r = this.rings.find((x) => x.state === 'hand' && x.side === 'R') || this.rings.find((x) => x.state === 'hand');
    if (!r) return;
    const tgt = _v2.copy(ctx.aim); tgt.y = 0;
    const dx = tgt.x - this.x, dz = tgt.z - this.z, d = Math.hypot(dx, dz) || 1;
    const range = Math.min(FEEL.ringRange, d);
    r.tgt.set(this.x + dx / d * range, 1.0, this.z + dz / d * range);
    // detach from the hand into the world
    r.holder.getWorldPosition(r.pos);
    const world = this.root.parent;
    world.attach(r.holder);
    r.state = 'out'; r.t = 0; r.hitOut = false; r.hitBack = false; r.spin = 0;
    r.judge = this.beatJudge(ctx);
    this.facing = aimAng;
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
    if (res && res.landed) { this.stats.ringHits++; this.addMeter(FEEL.meter.ringHit); ctx.onPlayerLanded && ctx.onPlayerLanded({ name: 'ring' }, res, on, false, r.pos); }
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
    this.catchT = -1;
    this.rig.once('Sword_Dash', { duration: FEEL.dashTime + 0.08, from: 0.12, to: 0.38, fade: 0.03, then: null });
    ctx.sfx && ctx.sfx.dash && ctx.sfx.dash(this);
    ctx.fx && ctx.fx.dashStart && ctx.fx.dashStart(this);
  }
  // the fight asks this when an attack would have hit during i-frames
  nearMiss(ctx) {
    if (this._nmCool > ctx.t) return;
    this._nmCool = ctx.t + 0.25;
    this.stats.nearMiss++; this.addMeter(FEEL.meter.nearMiss); this.counterT = 0.7;
    ctx.sfx && ctx.sfx.nearMiss && ctx.sfx.nearMiss(this);
    ctx.fx && ctx.fx.nearMiss && ctx.fx.nearMiss(this);
  }

  // ---------- getting hurt ----------
  hurt(ctx, dmg = 1, fromX, fromZ, kind = '') {
    if (this.invulnerable) { if (this.state === 'dash') this.nearMiss(ctx); return false; }
    this.hearts = Math.max(this.minHearts || 0, this.hearts - dmg); this.inv = FEEL.hurtInv; this.stats.hurt++;
    const a = Math.atan2(this.x - fromX, this.z - fromZ);
    this.vx = Math.sin(a) * FEEL.knock; this.vz = Math.cos(a) * FEEL.knock;
    this.aiming = false; ctx.fx && ctx.fx.aimLine(false);
    this.lastHitBy = kind;
    if (this.hearts <= 0) { this.state = 'dead'; this.st = 0; this.rig.once('Death01', { duration: 1.1, from: 0, to: 0.7, fade: 0.06, then: null }); }
    else { this.state = 'hurt'; this.st = 0; this.rig.once(dmg > 1 ? 'Hit_Knockback' : 'Hit_Chest', { duration: dmg > 1 ? 0.5 : 0.32, fade: 0.04, then: null }); }
    this.rig.hitStop(0.07);
    this.rig.flinch = 1; this.rig.flinchDir.set(Math.sin(a), 0, Math.cos(a));
    return true;
  }

  revive() { this.state = 'free'; this.st = 0; this.hearts = this.maxHearts || FEEL.hearts; this.inv = 1.2; this.rig.play(this.walk ? 'Idle_Loop' : 'Sword_Idle', { fade: 0.1, force: true }); this.recallRings(); }

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
