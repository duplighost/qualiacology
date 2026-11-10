// The boss: a song's narrator, performing at you. A body (a porcelain figurine, or a placeholder until one is
// built) plus everything the choreography needs: honest health with three notches, breaks, guard states that
// physically deflect, flinches, movement helpers, and the bookkeeping for rewinds.
import * as THREE from 'three';

const ease = { inOut: (k) => k * k * (3 - 2 * k), out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k, linear: (k) => k, back: (k) => { const c = 1.7; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); } };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------- the way round ----------
// She walks round what's standing in the room, not through it. The arena's own floor test (its colliders and its
// edges) says where a body can stand; a walk whose straight line is blocked takes the short way round.
function freeAt(A, x, z, r) { const o = A.resolve(x, z, r); return Math.abs(o.x - x) + Math.abs(o.z - z) < 0.03; }
function clearLine(A, ax, az, bx, bz, r) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.2));
  for (let i = 1; i < n; i++) { const k = i / n; if (!freeAt(A, ax + (bx - ax) * k, az + (bz - az) * k, r)) return false; }
  return true;
}
// the last open point on the straight line from a toward b
function lastClear(A, ax, az, bx, bz, r) {
  const d = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(d / 0.2)); let k0 = 0;
  for (let i = 1; i <= n; i++) { const k = i / n; if (!freeAt(A, ax + (bx - ax) * k, az + (bz - az) * k, r)) break; k0 = k; }
  return [ax + (bx - ax) * k0, az + (bz - az) * k0];
}
// a path of points from a to b over open floor (a grid search, then pulled tight), or null
function route(A, ax, az, bx, bz, r) {
  const C = 0.3, pad = 3.6, x0 = Math.min(ax, bx) - pad, z0 = Math.min(az, bz) - pad;
  const W = Math.ceil((Math.abs(bx - ax) + pad * 2) / C) + 1, H = Math.ceil((Math.abs(bz - az) + pad * 2) / C) + 1, N = W * H;
  if (N > 14000) return null;
  const free = new Int8Array(N), g = new Float32Array(N).fill(1e9), from = new Int32Array(N).fill(-1), shut = new Uint8Array(N);
  const si = Math.round((ax - x0) / C), sj = Math.round((az - z0) / C), ti = Math.round((bx - x0) / C), tj = Math.round((bz - z0) / C);
  const S = sj * W + si, T = tj * W + ti; free[S] = 1; free[T] = 1;
  const ok = (i, j) => { if (i < 0 || j < 0 || i >= W || j >= H) return false; const id = j * W + i; if (!free[id]) free[id] = freeAt(A, x0 + i * C, z0 + j * C, r) ? 1 : -1; return free[id] > 0; };
  const hh = (i, j) => { const dx = Math.abs(i - ti), dz = Math.abs(j - tj); return Math.max(dx, dz) + 0.4142 * Math.min(dx, dz); };
  const open = [S]; g[S] = 0; let found = false, seen = 0;
  for (let guard = 0; guard < 9000 && open.length; guard++) {
    let bi = 0, bf = 1e9; for (let q = 0; q < open.length; q++) { const id = open[q], f = g[id] + hh(id % W, (id / W) | 0); if (f < bf) { bf = f; bi = q; } }
    const cur = open[bi]; open[bi] = open[open.length - 1]; open.pop();
    if (cur === T) { found = true; break; }
    if (shut[cur]) continue; shut[cur] = 1; seen++;
    const ci = cur % W, cj = (cur / W) | 0;
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue;
      const ni = ci + di, nj = cj + dj; if (!ok(ni, nj)) continue;
      if (di && dj && !(ok(ci + di, cj) && ok(ci, cj + dj))) continue;      // (no cutting a corner)
      const id = nj * W + ni, ng = g[cur] + (di && dj ? 1.4142 : 1);
      if (ng < g[id] - 1e-4) { g[id] = ng; from[id] = cur; if (!shut[id]) open.push(id); }
    }
  }
  // (nowhere to go from where she stands, and it's a small place: she's boxed in, between things)
  if (!found) return !open.length && seen < 260 ? 'boxed' : null;
  const cells = []; for (let id = T; id >= 0; id = from[id]) { cells.push([x0 + (id % W) * C, z0 + ((id / W) | 0) * C]); if (id === S) break; }
  cells.reverse(); cells[0] = [ax, az]; cells[cells.length - 1] = [bx, bz];
  // pulled tight: from each point, straight to the furthest one it can see
  const out = [cells[0]]; let i = 0;
  while (i < cells.length - 1) {
    let j = cells.length - 1;
    while (j > i + 1 && !clearLine(A, cells[i][0], cells[i][1], cells[j][0], cells[j][1], r)) j--;
    out.push(cells[j]); i = j;
  }
  return out;
}

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
    // every hit moves her: a shove the way the blow went, on top of where the song has her (it springs back, so her
    // script never loses its place); and how high off the floor she is while she's being juggled (the fight's)
    this.shX = 0; this.shZ = 0; this.airY = 0; this.tipK = 0; this.tipA = 0;
    if (this.rig) this.rig.flinchGain = 1.9;
  }

  on(ev, fn) { (this.listeners[ev] ||= []).push(fn); }
  emit(ev, a) { for (const fn of this.listeners[ev] || []) fn(a); }

  get targetable() { return !this.intangible && this.state !== 'finished' && this.state !== 'gone'; }
  get hpK() { return this.hp / this.maxHp; }

  // pinned: her bar is empty and she's down on her knees for the finale; the script's moves and one-shots wait
  place(x, z, facing) {
    if (this.pinned || this.scene) return;
    this._endMove(); this._wait = null;
    this.x = x; this.z = z; if (facing !== undefined) this.facing = facing;
    this._lastX = x; this._lastZ = z; this._speed = 0;      // (put there, not run there: no stride on the spot)
    this._sync();
  }
  _sync() { this.root.position.set(this.x + this.shX, this.root.position.y, this.z + this.shZ); this.root.rotation.y = this.facing; }
  // knocked the way a blow went (ang, world): k metres of shove, and her body folds round it
  shove(ang, k = 0.3, hard = false) {
    if (this.lockPos || this.noShove) k *= 0.25;
    this.shX += Math.sin(ang) * k; this.shZ += Math.cos(ang) * k;
    const m = Math.hypot(this.shX, this.shZ); if (m > 1.2) { this.shX *= 1.2 / m; this.shZ *= 1.2 / m; }
    if (this.rig) { const a = ang - this.facing; this.rig.flinchDir.set(Math.sin(a), 0, Math.cos(a)); this.rig.flinch = Math.max(this.rig.flinch, hard ? 1 : 0.7); this.tipA = a; this.tipK = Math.min(1.4, Math.max(this.tipK, (hard ? 1.2 : 0.75) * (this.lockPos || this.noShove ? 0.4 : 1))); }
  }
  // a heavy blow she isn't in the middle of something for: she takes it with her whole body
  react(tier, ang) {
    if (tier < 3 || !this.rig || this.noReact || this.pinned || this.busy || this.move || this.state === 'stagger' || this.hp <= 0) return;
    const front = Math.cos(ang - this.facing) < 0;
    this.rig.once(front ? 'Hit_Chest' : 'Hit_Head', { duration: tier >= 4 ? 0.42 : 0.3, fade: 0.04, then: this.idleClip, thenFade: 0.18 });
    this._locoClip = '';
  }

  // move to (x, z) over dur seconds (game time); returns the arrival time.
  // She goes round whatever stands between (anything the arena's floor test knows), in the same time. Options:
  //   through: true   straight there whatever's in the way (onto a seat, a counter, a stand: the track's own business)
  //   arc: h          a real jump: her feet leave the floor, h metres at the top, over whatever's between
  //   land: y         (with arc) the height she comes down at (default: where she left from)
  //   straight: true  no way round: she stops at the first thing in her way (a lunge down a line you were shown)
  // A spot that is itself inside something is taken as meant, and nothing is routed. A move asked for while she's
  // stunned isn't lost: it waits, and she makes it when she's back (the last one asked for).
  moveTo(x, z, dur, { easing = 'inOut', face = true, now = this._now, through = false, arc = 0, land, straight = false } = {}) {
    if (this.scene) return now + dur;
    const o = { easing, face, through, arc, land, straight };
    if (this.pinned || this.dazed) { if (!this.pinned || this.juggled) this._wait = { x, z, dur, o }; this.moveHeld = true; return now + dur; }
    this._wait = null; this.moveHeld = false; this._endMove();
    let path = null;
    const A = this.arena, d = Math.hypot(x - this.x, z - this.z);
    if (A && A.resolve && !through && !arc && this.routes !== false && d > 0.6) {
      const r = Math.min(0.42, this.radius * 0.5);
      if (freeAt(A, x, z, r)) {
        // (leaving a spot inside something, a seat or a counter: straight out of it first)
        let sx = this.x, sz = this.z, lead = false;
        if (!freeAt(A, sx, sz, r)) { const q = A.resolve(sx, sz, r + 0.06); sx = q.x; sz = q.z; lead = true; }
        if (!clearLine(A, sx, sz, x, z, r)) {
          if (straight) { const p = lastClear(A, sx, sz, x, z, r); x = p[0]; z = p[1]; }
          else {
            path = route(A, sx, sz, x, z, r);
            // boxed in between things (landed there, or they landed round her): she jumps out
            if (path === 'boxed') { path = null; arc = Math.min(1.5, 1.0 + d * 0.06); if (this.rig && !this.busy && this.jumpClip !== null) this.perform(this.jumpClip || 'NinjaJump_Start', { duration: Math.max(0.25, Math.min(0.7, dur)), from: 0.1, to: 0.85 }); }
            // (a dash, faster than anyone runs: round only if that's nearly as short, or it's a zigzag)
            if (path && d / Math.max(0.01, dur) > 16) { let L = 0; for (let i = 1; i < path.length; i++) L += Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]); if (L > d * 1.35) path = null; }
            if (path && lead) path.unshift([this.x, this.z]);
          }
        }
      }
    }
    const m = this.move = { fx: this.x, fz: this.z, tx: x, tz: z, t0: now, dur: Math.max(0.01, dur), ease: ease[easing] || ease.inOut, face, o };
    if (path && path.length > 2) {
      m.path = path; m.len = [0];
      for (let i = 1; i < path.length; i++) m.len[i] = m.len[i - 1] + Math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]);
    }
    if (arc > 0) { m.arc = arc; m.y0 = this.root.position.y; m.y1 = land === undefined ? m.y0 : land; }
    return now + dur;
  }
  stop() { this._endMove(); this._wait = null; }
  // a move cut short: a jump comes down (where it left from, or where it was going if it was past the top)
  _endMove(keep = false) {
    const m = this.move; if (!m) return;
    if (m.arc) this.root.position.y = ((this._now || 0) - m.t0) / m.dur < 0.5 ? m.y0 : m.y1;
    if (keep && !this._wait) this._wait = { x: m.tx, z: m.tz, dur: Math.max(0.25, m.t0 + m.dur - (this._now || 0)), o: { ...m.o, arc: 0 } };
    this.move = null;
  }
  // is she where the script last sent her? (a track that puts her on something only once she's there asks this)
  near(x, z, tol = 0.7) { return !this.move && !this._wait && Math.hypot(this.x - x, this.z - z) <= tol; }

  // play a clip fitted so that `at` (0..1 of the clip window) lands at song time `impactT`
  perform(clip, { from = 0, to = 1, duration, then = 'idle', fade = 0.1, speed, force = false } = {}) {
    if (!this.rig || ((this.pinned || this.dazed || this.scene) && !force)) return;
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
  loop(clip, opts = {}) { if (this.rig && (!this.pinned || opts.force) && !this.scene) this.rig.play(clip, { fade: 0.2, ...opts }); }
  // stunned by a counter: she reels for sec (her script's walks and moves wait), and whatever lands on her meanwhile
  // does k times the damage
  daze(sec, k = 1.35) {
    if (this.hp <= 0 || this.state === 'finished' || this.state === 'gone') return;
    if (this.state === 'perform' || this.state === 'open') { this.state = 'open'; this.st = 0; this.openFor = sec; }
    this.openK = k; this._endMove(true); this.dazeUntil = (this._now || 0) + sec; this.busyUntil = 0;
    if (this.rig && !this.pinned) this.rig.once(k >= 1.45 ? 'Hit_Knockback' : 'Hit_Head', { duration: Math.min(sec, k >= 1.45 ? 0.7 : 0.4), fade: 0.05, then: this.idleClip });
  }
  get dazed() { return (this._now || 0) < (this.dazeUntil || 0); }
  // down on her knees for the finale's last bars. Some tracks play clips straight on her rig: while she's pinned those
  // wait too (all but the one she's down in)
  pin(clip = 'Crouch_Idle_Loop') {
    const rig = this.rig; this.pinned = true; this.idleClip = clip; this.busyUntil = 0;
    this._wrapRig();
    if (rig) rig.play(clip, { fade: 0.3 });
  }
  // (while she's pinned, or in her death scene, a clip a track plays straight on her rig waits)
  _wrapRig() {
    const rig = this.rig;
    if (!rig || rig._pinWrap) return;
    const play = rig.play.bind(rig), once = rig.once.bind(rig);
    rig._pinWrap = true;
    rig.play = (c, o) => (this.scene || (this.pinned && c !== this.idleClip) ? undefined : play(c, o));
    rig.once = (c, o) => (this.pinned || this.scene ? undefined : once(c, o));
    rig.rawPlay = play; rig.rawOnce = once;
  }
  set idle(c) { if (!this.pinned) this.idleClip = c; }
  get idle() { return this.idleClip; }

  // ---------- being hit ----------
  // info: {dmg, kind, heavy, from, onBeat, x, z, ang}; returns {landed, dmg, deflected, broke}
  takeHit(info) {
    if (!this.targetable) return { landed: false };
    if (this.guard) {
      this.emit('deflect', info);
      return { landed: false, deflected: true };
    }
    let dmg = info.dmg;
    if (this.state === 'open' || this.state === 'stagger') dmg *= this.state === 'open' && this.dazed ? (this.openK || 1.35) : 1.35;
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
    this._endMove(true);
    this.emit('break', { index: i, piece });
  }

  // parried melee or a punished whiff: open for a moment, takes more damage
  open(sec) { if (this.state === 'perform') { this.state = 'open'; this.st = 0; this.openFor = sec; this.emit('open', sec); } }

  // ---------- per frame ----------
  update(dt, now, beat, player) {
    this._now = now; this._beat = beat || 0.5;
    this.st += dt;
    // in her death scene the scene moves her: only what's on top of that runs (the flinch, the shove, her glaze)
    if (this.scene) {
      this.flinchK *= Math.exp(-dt * 8); this.hitFlash *= Math.exp(-dt * 14);
      { const k = Math.exp(-dt * 7.5); this.shX *= k; this.shZ *= k; }
      if (this.rig) this.rig.flinch = Math.max(this.rig.flinch, this.flinchK * 0.6);
      this._sync();
      if (this.fig && this.fig.update) { this.fig.setDamage && this.fig.setDamage(this.damageK); this.fig.update(dt); } else if (this.rig) this.rig.update(dt);
      return;
    }
    if (this.state === 'stagger' && this.st >= (this.staggerFor || 1)) { this.state = this.hp <= 0 ? 'desperate' : 'perform'; this.st = 0; this.emit('recover'); }
    if (this.state === 'open' && this.st >= (this.openFor || 0.8)) { this.state = 'perform'; this.st = 0; this.openK = 0; }
    // back from a stun: the move the script asked for meanwhile, now (so she's where the song thinks she is)
    if (this._wait && !this.move && !this.pinned && !this.dazed && this.state !== 'stagger') {
      const w = this._wait, d = Math.hypot(w.x - this.x, w.z - this.z); this._wait = null;
      if (d > 0.3) this.moveTo(w.x, w.z, Math.max(d / 7, Math.min(w.dur, 1.2)), w.o);
    }
    if (this.move) {
      const m = this.move, k = Math.min(1, Math.max(0, (now - m.t0) / m.dur)), e = m.ease(k);
      let nx = m.fx + (m.tx - m.fx) * e, nz = m.fz + (m.tz - m.fz) * e;
      if (m.path) {
        const L = m.len, dd = Math.min(1, Math.max(0, e)) * L[L.length - 1]; let i = 1; while (i < L.length - 1 && L[i] < dd) i++;
        const a = m.path[i - 1], c = m.path[i], u = (dd - L[i - 1]) / Math.max(1e-4, L[i] - L[i - 1]);
        nx = a[0] + (c[0] - a[0]) * u; nz = a[1] + (c[1] - a[1]) * u;
      }
      if (m.face && !this.lockFacing) { const dx = nx - this.x, dz = nz - this.z; if (dx * dx + dz * dz > 1e-6) this._turn(Math.atan2(dx, dz), dt, 12); }
      this.x = nx; this.z = nz;
      if (m.arc) this.root.position.y = m.y0 + (m.y1 - m.y0) * k + 4 * m.arc * k * (1 - k);
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
    { const k = Math.exp(-dt * 6.5); this.shX *= k; this.shZ *= k; }
    // tipped away from the blow, about her hips, and back up (not while a track or a scene has her body, or she's up in the air)
    if (this.rig && (this.tipK > 0.002 || this._tipped)) {
      this.tipK *= Math.exp(-dt * 8.5); const B = this.rig.body, on = this.tipK > 0.002 && !this.airY && !this.noTip;
      B.pitch = on ? Math.cos(this.tipA) * 0.24 * this.tipK : 0; B.roll = on ? -Math.sin(this.tipA) * 0.24 * this.tipK : 0; this._tipped = on;
    }
    // her hard glaze softens if she's left alone (or opened, staggered, beaten)
    if (this.hard) { this.hardT += dt; if (this.hardT > 3.5 || this.state !== 'perform' || this.hp <= 0) { this.hard = 0; this.emit('soften'); } }
    this.hardK += ((this.hard ? 1 : 0) - this.hardK) * Math.min(1, dt * (this.hard ? 14 : 6));
    if (this.fig) this.fig.hardK = this.hardK * (0.55 + 0.45 * this.beatPulse);
    if (this.rig) {
      this.rig.flinch = Math.max(this.rig.flinch, this.flinchK * 0.6);
      if (player) this.rig.lookTarget = new THREE.Vector3(player.x, 1.4, player.z);
    }
    this._sync();
    if (this.dazed && this.rig && !this.pinned && this.hp > 0) { this.rig.lean.set(Math.sin(now * 5.2) * 0.34, 0.44 + 0.1 * Math.sin(now * 3.1)); this._swayed = true; }
    else if (this._swayed && this.rig) { this._swayed = false; this.rig.lean.set(0, 0); }
    else if (this._bowT > 0) { this._bowT -= dt; const k = Math.sin(Math.min(1, 1 - this._bowT / 1.2) * Math.PI); if (this.rig) this.rig.lean.set(0, 0.9 * k); }
    else if (this.rig && this.nodsToBeat !== false && (this.state === 'perform' || this.state === 'desperate') && !this.busy && this._speed < 1.5) this.rig.lean.set(this.rig.lean.x, 0.17 * (this.nod || 0));
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
    this.state = this.hp <= 0 ? 'desperate' : 'perform'; this.st = 0; this._endMove(); this._wait = null; this.openUntil = 0; this.busyUntil = 0;
    this.hard = 0; this.offRun = 0; this.hardK = 0; this.shX = this.shZ = 0; this.airY = 0;
    if (this.fig && this.fig.restorePieces) this.fig.restorePieces(this.broken);
    if (this.rig && this.idleClip) this.rig.play(this.idleClip, { fade: 0.1, force: true });
    this._sync();
  }
}
