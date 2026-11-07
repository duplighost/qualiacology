// The boss: a song's narrator, performing at you. A body (a porcelain figurine, or a placeholder until one is
// built) plus everything the choreography needs: honest health with three notches, breaks, guard states that
// physically deflect, flinches, movement helpers, and the bookkeeping for rewinds.
import * as THREE from 'three';

const ease = { inOut: (k) => k * k * (3 - 2 * k), out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, linear: (k) => k, back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

export class Boss {
  // body: { root, rig, figurine? }   opts: { name, hp, radius, scale, notches, pieces }
  constructor(body, opts = {}) {
    this.body = body;
    this.root = body.root;
    this.rig = body.rig;
    this.fig = body.figurine || null;
    this.name = opts.name || 'THE BOSS';
    this.maxHp = opts.hp || 1000; this.hp = this.maxHp;
    this.notches = opts.notches || [0.75, 0.5, 0.25];
    this.pieces = opts.pieces || [];       // names broken off at each notch, in order
    this.broken = 0;
    this.radius = opts.radius || 0.85;
    this.x = 0; this.z = -3; this.facing = 0;
    this.state = 'perform';                 // perform | stagger | open | desperate | finished | gone
    this.st = 0;
    this.guard = null;                      // null | 'pretty' | 'busy' : hits are deflected, with a thud
    this.intangible = false;                // e.g. vanished: hits pass through, and you can SEE she's not there
    this.move = null;                       // current tween {fx, fz, tx, tz, t0, dur, ease}
    this.faceTarget = null;                 // a {x,z} to keep facing (usually the player)
    this.lockFacing = false;
    this.flinchK = 0;
    this.damageK = 0;                       // 0..1 for cracks
    this.openUntil = 0;
    this.listeners = {};
    this.hitFlash = 0;
    this.lastHitT = -9;
    this.blinded = false;
    // between scripted moves: 'hold' | 'circle' | 'keep' | 'chase' (see _behave); speed in m/s
    this.behave = 'hold'; this.behaveOpts = { r: 6, rMin: 4.5, rMax: 8, speed: 2.4, dir: 1 };
    this.walkClip = 'Walk_Formal_Loop'; this.runClip = 'Jog_Fwd_Loop';
    this._lastX = 0; this._lastZ = 0; this._speed = 0; this._locoClip = '';
    this._now = 0; this.busyUntil = 0;     // song time of her last update (moves start from it), end of her one-shot
    // hit her off the beat and keep at it and her glaze goes hard: strikes glance off it until one on the felt
    // beat cracks it (or she's left alone a few seconds). Tracks can turn it off: boss.hardens = false
    this.hard = 0; this.offRun = 0; this.hardT = 0; this.hardK = 0; this.beatPulse = 0;
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, a) { for (const fn of this.listeners[ev] || []) fn(a); }

  get targetable() { return !this.intangible && this.state !== 'finished' && this.state !== 'gone'; }
  get hpK() { return this.hp / this.maxHp; }

  place(x, z, facing) { this.x = x; this.z = z; if (facing !== undefined) this.facing = facing; this.move = null; this._sync(); }
  _sync() { this.root.position.set(this.x, this.root.position.y, this.z); this.root.rotation.y = this.facing; }

  // move to (x, z) over dur seconds (game time); returns the arrival time
  moveTo(x, z, dur, { easing = 'inOut', face = true, now = this._now } = {}) {
    this.move = { fx: this.x, fz: this.z, tx: x, tz: z, t0: now, dur: Math.max(0.01, dur), ease: ease[easing] || ease.inOut, face };
    return now + dur;
  }
  stop() { this.move = null; }

  // play a clip fitted so that `at` (0..1 of the clip window) lands at song time `impactT`
  perform(clip, { from = 0, to = 1, duration, then = 'idle', fade = 0.1, speed } = {}) {
    if (!this.rig) return;
    this.rig.once(clip, { from, to, duration, speed, fade, then: then === 'idle' ? this.idleClip : then });
    const c = this.rig.kit.clips[clip];
    const len = duration || (c ? c.duration * (to - from) / (speed || 1) : 0.5);
    this.busyUntil = Math.max(this.busyUntil || 0, (this._now || 0) + len);
    this._locoClip = '';
  }
  get busy() { return (this._now || 0) < (this.busyUntil || 0); }
  // a clip whose contact (fraction `hit` of the window [from, to]) lands at song time `at`, starting now
  strikeAt(clip, at, { from = 0, to = 1, hit = 0.5, then = 'idle' } = {}) {
    const lead = Math.max(0.12, at - (this._now || 0));
    this.perform(clip, { from, to, duration: lead / Math.max(0.05, hit), then, fade: 0.06 });
  }
  loop(clip, opts = {}) { if (this.rig) this.rig.play(clip, { fade: 0.2, ...opts }); }
  set idle(c) { this.idleClip = c; }
  get idle() { return this.idleClip; }

  // ---------- being hit ----------
  // info: {dmg, kind, heavy, from, onBeat, x, z, ang}; returns {landed, dmg, deflected, broke}
  takeHit(info) {
    if (!this.targetable) return { landed: false };
    if (this.guard) {
      this.emit('deflect', info);
      return { landed: false, deflected: true };
    }
    // (her hard glaze: only a strike on the felt beat cracks it; anything else glances off while it's hard)
    if (info.kind === 'strike' && !info.riposte && this.hardens !== false && this.hp > 0) {
      if (this.hard && (info.bigBeat || this.blinded || this.state !== 'perform')) { this.hard = 0; this.offRun = 0; this.emit('crack', info); info = { ...info, dmg: info.dmg * 1.3, heavy: true, cracked: true }; }
      else if (this.hard) { this.hardT = 0; this.emit('deflect', info); return { landed: false, deflected: true, hard: true }; }
      else if (info.onBeat || this.blinded) this.offRun = 0;
      else if (this.state === 'perform' && ++this.offRun >= 3) { this.hard = 1; this.offRun = 0; this.hardT = 0; this.emit('harden', info); }
    }
    let dmg = info.dmg;
    if (this.state === 'open' || this.state === 'stagger') dmg *= 1.35;
    if (this.state === 'desperate' || this.hp <= 0) {
      // the bar is empty: she's wrecked, still performing until the song ends; hits still crack her and score
      this.emit('hit', { ...info, dmg, desperate: true });
      this.flinchK = 1; this.hitFlash = 1;
      return { landed: true, dmg, desperate: true };
    }
    const before = this.hp;
    this.hp = Math.max(0, this.hp - dmg);
    this.damageK = 1 - this.hp / this.maxHp;
    this.flinchK = Math.min(1, this.flinchK + (info.heavy ? 1 : 0.55));
    this.hitFlash = 1;
    this.lastHitT = this._now;
    this.emit('hit', { ...info, dmg });
    let broke = false;
    for (let i = this.broken; i < this.notches.length; i++) {
      const n = this.notches[i] * this.maxHp;
      if (before > n && this.hp <= n) { this.broken = i + 1; broke = true; this._break(i); break; }
    }
    if (this.hp <= 0) { this.state = 'desperate'; this.st = 0; this.emit('empty', info); }
    return { landed: true, dmg, broke };
  }

  _break(i) {
    const piece = this.pieces[i];
    if (this.fig && piece) this.fig.breakPiece(piece);
    this.state = 'stagger'; this.st = 0; this.staggerFor = this._beat * 2;
    this.move = null;
    this.emit('break', { index: i, piece });
  }

  // parried melee or a punished whiff: open for a moment, takes more damage
  open(sec) { if (this.state === 'perform') { this.state = 'open'; this.st = 0; this.openFor = sec; this.emit('open', sec); } }

  // ---------- per frame ----------
  update(dt, now, beat, player) {
    this._now = now; this._beat = beat || 0.5;
    this.st += dt;
    if (this.state === 'stagger' && this.st >= (this.staggerFor || 1)) { this.state = this.hp <= 0 ? 'desperate' : 'perform'; this.st = 0; this.emit('recover'); }
    if (this.state === 'open' && this.st >= (this.openFor || 0.8)) { this.state = 'perform'; this.st = 0; }
    if (this.move) {
      const m = this.move, k = Math.min(1, Math.max(0, (now - m.t0) / m.dur)), e = m.ease(k);
      const nx = m.fx + (m.tx - m.fx) * e, nz = m.fz + (m.tz - m.fz) * e;
      if (m.face && !this.lockFacing) { const dx = nx - this.x, dz = nz - this.z; if (dx * dx + dz * dz > 1e-6) this._turn(Math.atan2(dx, dz), dt, 12); }
      this.x = nx; this.z = nz;
      if (k >= 1) this.move = null;
    } else {
      if (this.state === 'perform' && player && !this.busy) this._behave(dt, player);
      if (this.faceTarget && !this.lockFacing && this.state !== 'stagger') this._turn(Math.atan2(this.faceTarget.x - this.x, this.faceTarget.z - this.z), dt, 7);
    }
    // locomotion clip follows the real speed (unless a one-shot is playing)
    const sp = Math.hypot(this.x - this._lastX, this.z - this._lastZ) / Math.max(1e-4, dt);
    this._speed += (sp - this._speed) * Math.min(1, dt * 10);
    this._lastX = this.x; this._lastZ = this.z;
    const moving = this.state === 'perform' || this.state === 'desperate';
    if (this.rig && !this.busy && moving && this.idleClip && (!this.rig.base || this.rig.base.loop !== 2200)) {
      const want = this._speed > 3.2 ? this.runClip : this._speed > 0.5 ? this.walkClip : this.idleClip;
      if (want !== this._locoClip && (this.rig.baseName === this._locoClip || !this._locoClip || this.rig.baseName === this.idleClip || this.rig.baseName === this.walkClip || this.rig.baseName === this.runClip)) {
        this._locoClip = want; this.rig.play(want, { fade: 0.25, speed: want === this.idleClip ? 1 : Math.max(0.6, this._speed / (want === this.runClip && want !== this.walkClip ? 3.4 : 1.3)) });
      }
      // the stride keeps up with her real speed (a clip picked up at the first slow frame would foot-slide)
      const bn = this.rig.baseName;
      if (this.rig.base && bn === this._locoClip && (bn === this.walkClip || bn === this.runClip) && bn !== this.idleClip) this.rig.base.timeScale = Math.max(0.6, this._speed / (bn === this.runClip && bn !== this.walkClip ? 3.4 : 1.3));
    }
    this.flinchK *= Math.exp(-dt * 8);
    this.hitFlash *= Math.exp(-dt * 14);
    // her hard glaze softens if she's left alone (or opened, staggered, beaten)
    if (this.hard) { this.hardT += dt; if (this.hardT > 3.5 || this.state !== 'perform' || this.hp <= 0) { this.hard = 0; this.emit('soften'); } }
    this.hardK += ((this.hard ? 1 : 0) - this.hardK) * Math.min(1, dt * (this.hard ? 14 : 6));
    if (this.fig) this.fig.hardK = this.hardK * (0.55 + 0.45 * this.beatPulse);
    if (this.rig) {
      this.rig.flinch = Math.max(this.rig.flinch, this.flinchK * 0.6);
      if (player) this.rig.lookTarget = new THREE.Vector3(player.x, 1.4, player.z);
    }
    this._sync();
    if (this._bowT > 0) { this._bowT -= dt; const k = Math.sin(Math.min(1, 1 - this._bowT / 1.2) * Math.PI); if (this.rig) this.rig.lean.set(0, 0.9 * k); }
    else if (this.rig && this.nodsToBeat !== false && (this.state === 'perform' || this.state === 'desperate') && !this.busy && this._speed < 1.5) this.rig.lean.set(this.rig.lean.x, 0.07 * (this.nod || 0));
    else if (this.rig && this._nodded) this.rig.lean.set(this.rig.lean.x, 0);
    this._nodded = this.rig && this.rig.lean.y !== 0;
    // a figurine runs its own rig (and its cracks, cloth and shards); a plain body is just a rig
    if (this.fig && this.fig.update) { this.fig.setDamage && this.fig.setDamage(this.damageK); this.fig.update(dt); }
    else if (this.rig) this.rig.update(dt);
  }
  _behave(dt, pl) {
    const o = this.behaveOpts, dx = this.x - pl.x, dz = this.z - pl.z, d = Math.hypot(dx, dz) || 1;
    let vx = 0, vz = 0;
    if (this.behave === 'circle') { const tx = -dz / d * o.dir, tz = dx / d * o.dir, pull = (o.r - d) * 0.6; vx = tx * o.speed + dx / d * pull; vz = tz * o.speed + dz / d * pull; }
    else if (this.behave === 'keep') { if (d < o.rMin) { vx = dx / d * o.speed; vz = dz / d * o.speed; } else if (d > o.rMax) { vx = -dx / d * o.speed; vz = -dz / d * o.speed; } }
    else if (this.behave === 'chase') { if (d > 1.8) { vx = -dx / d * o.speed; vz = -dz / d * o.speed; } }
    if (!vx && !vz) return;
    let nx = this.x + vx * dt, nz = this.z + vz * dt;
    if (this.arena) { const r = this.arena.resolve(nx, nz, this.radius * 0.8); nx = r.x; nz = r.z; }
    this.x = nx; this.z = nz;
  }
  _turn(want, dt, rate) { const d = angDiff(want, this.facing); const m = rate * dt; this.facing += Math.abs(d) <= m ? d : Math.sign(d) * m; }
  faceNow(x, z) { this.facing = Math.atan2(x - this.x, z - this.z); this._sync(); }

  bow(sec = 1.2) { if (!this.rig) return; this._bowT = sec; }
  // ---------- rewinds ----------
  snapshot() { return { hp: this.hp, broken: this.broken, x: this.x, z: this.z, facing: this.facing, damageK: this.damageK, guard: this.guard, intangible: this.intangible }; }
  restore(s) {
    Object.assign(this, { hp: s.hp, broken: s.broken, x: s.x, z: s.z, facing: s.facing, damageK: s.damageK, guard: s.guard, intangible: s.intangible });
    this.state = this.hp <= 0 ? 'desperate' : 'perform'; this.st = 0; this.move = null; this.openUntil = 0; this.busyUntil = 0;
    this.hard = 0; this.offRun = 0; this.hardK = 0;
    if (this.fig && this.fig.restorePieces) this.fig.restorePieces(this.broken);
    if (this.rig && this.idleClip) this.rig.play(this.idleClip, { fade: 0.1, force: true });
    this._sync();
  }
}
