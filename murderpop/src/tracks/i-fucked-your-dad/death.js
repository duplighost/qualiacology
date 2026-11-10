// THE EX's end: YOU LIT THE MATCH SO GENTLY. She came with petrol and a match to burn the holiday card down, and said
// it was YOU who lit it. So YOU does. On Dad's front walk the giant matchbook comes back up where it stood in the
// bridge (its cover is the song's own line). She heaves the can at YOU: YOU goes through it and past her, and what
// she threw is a trail to her own feet. She swings the can: the cut sends it up, over, and all of it down on her.
// She strikes her last match, soaked, and flicks it: YOU catches it. She comes for it: YOU is up on the matchbook.
// "Now what the fuck you gonna do": YOU lets it fall. It runs along her trail to her and she goes up: she's the
// fucking fire, and dances in it. On the last hit YOU comes down through it and she breaks.
// Then what the set already does with her: her head on Dad's walk, a lit match in its teeth (now on the gold plate
// her revenge was served on), YOU'RE WELCOME on the mat; and the bear is YOU's.
// (src/game/execution.js runs it. Each step's `lead` puts the two of them on their marks; `do` is the beat. Everything
// that isn't one of them, the can, the match, the petrol, the fire, is the Kill below: built at load with the set, so
// its shaders compile in the loading veil, and driven from song time.)
import * as THREE from 'three';
import * as P from './props.js';
import { Flames } from './fire.js';
import { soak } from './overlays.js';

const V3 = THREE.Vector3;
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (k) => k * k * (3 - 2 * k);
const backOut = (k) => { const c = 1.5; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
const GOLD = new THREE.Color(3.2, 2.0, 0.55), EMBER = new THREE.Color(3.2, 1.0, 0.3), AMBER = new THREE.Color(2.4, 1.5, 0.35);
const LONG_AGO = -1e6;

// the line it's played on, in front of the matchbook (0, -5.3)
const LINE = -4.3;
export const MARK = {
  her: [2.3, LINE],          // she stands in her own petrol
  you0: [-2.5, -3.7],        // YOU, across the walk from her
  you1: [4.8, -3.7],         // past her, after going through what she threw
  you2: [3.6, -3.95],        // in reach, for the cut
  top: [0.0, 2.3, -5.98],    // up on the matchbook: x, y, z
  touch: [0.3, LINE],        // where the match comes down
  serve: [0.0, -5.3],        // the gold plate, where the matchbook stood
  bear: [2.95, LINE + 0.5],
};
// the song's own hits through its last bars (data/accents), and what falls between them
export const AT = { slosh: 225.019, cut: 226.089, flick: 227.511, jump: 228.946, land: 229.47, drop: 230.004, touch: 230.42, whoomph: 230.71 };
const TRAIL = { x0: -3.3, x1: 1.8, z0: LINE - 0.42, z1: LINE + 0.42 };
const PUDDLE = { x0: 1.3, x1: 3.3, z0: LINE - 0.95, z1: LINE + 0.95 };
const CAN_K = 1.35, MATCH_K = 3.6;
const POUR0 = 0.2, POUR1 = 0.52, BONK = 0.64, REST = 1.0;       // the can, after it leaves her hand (seconds)
const G = 20;

const _p = new V3(), _q = new THREE.Quaternion(), _s = new V3(), _m = new THREE.Matrix4();

// ------------------------------------------------------------------------------------------------ everything but the two of them
export class Kill {
  constructor(set, boss) {
    const R = set.root;
    this.set = set; this.f = set.f; this.boss = boss;
    this.live = false; this.began = false; this.step = 0; this.t = {}; this.now = 0;
    this.book = null; this.plate = null; this.canInHand = false; this.burnK = 0; this.fireK = 0; this.matchLit = false; this.matchPos = new V3();
    // her petrol on the floor: the trail she throws, the pool she ends up standing in
    this.trail = soak(R, [TRAIL.x0, TRAIL.z0, TRAIL.x1, TRAIL.z1], 0.0172);
    this.puddle = soak(R, [PUDDLE.x0, PUDDLE.z0, PUDDLE.x1, PUDDLE.z1], 0.0176);
    // and in the air: thrown, poured, dripping off her
    this.N = 150; this.drops = []; this._acc = 0;
    this.dropMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0xd8a034, roughness: 0.08, clearcoat: 1, clearcoatRoughness: 0.05, emissive: 0x7a4400, emissiveIntensity: 0.7 }), this.N);
    this.dropMesh.count = 0; this.dropMesh.frustumCulled = false; this.dropMesh.castShadow = false; R.add(this.dropMesh);
    // the can, once it's out of her hand
    this.can = P.gasCan(); this.can.scale.setScalar(CAN_K); this.can.visible = false; R.add(this.can);
    this.canFrom = new V3();
    // the match: one, wherever it is (her hand, the air, YOU's fingers, the air again)
    this.match = new THREE.Group(); const stick = P.smallMatch(); stick.scale.setScalar(MATCH_K); this.match.add(stick); this.match.visible = false; R.add(this.match);
    this.matchFire = new Flames(set.scene, this.match); this.matchFire.add({ x: 0, z: 0, y: 0.125 * MATCH_K, w: 0.2, h: 0.42, group: 'm' }); this.matchFire.build();
    this.flickFrom = new V3(); this.dropFrom = new V3(); this.fumbleAt = new V3();
    // the fire: along her trail from where the match lands (each flame catches as it gets there), round her feet, on her
    const tf = this.trailFire = new Flames(set.scene, R);
    const v = (MARK.her[0] - 0.6 - MARK.touch[0]) / (AT.whoomph - AT.touch - 0.03);
    for (let x = TRAIL.x0 + 0.15; x < MARK.her[0] - 0.45; x += 0.27) tf.add({ x, z: LINE + (Math.random() - 0.5) * 0.4, h: 0.75 + Math.random() * 0.35, w: 0.55, group: 'trail', ignite: AT.touch + Math.abs(x - MARK.touch[0]) / v });
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r = 0.5 + Math.random() * 0.5; tf.add({ x: MARK.her[0] + Math.cos(a) * r, z: LINE + Math.sin(a) * r * 0.8, h: 1.2 + Math.random() * 0.7, w: 0.85, group: 'pool' }); }
    tf.build(); tf.mesh.visible = false;
    const hf = this.herFire = new Flames(set.scene, boss.root);
    for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2 + 0.4; hf.add({ x: Math.cos(a) * 0.3, z: Math.sin(a) * 0.3, y: 0.05, h: 1.5, w: 0.75, group: 'her' }); }
    for (let i = 0; i < 4; i++) { const a = i / 4 * Math.PI * 2; hf.add({ x: Math.cos(a) * 0.22, z: Math.sin(a) * 0.22, y: 0.9, h: 1.3, w: 0.6, group: 'her' }); }
    hf.add({ x: 0, z: 0.05, y: 1.75, h: 0.9, w: 0.55, group: 'her' }); hf.add({ x: 0.1, z: -0.1, y: 1.6, h: 1.0, w: 0.5, group: 'her' });
    hf.build(); hf.mesh.visible = false;
    // its light on the floor (the baked floor takes no real-time light)
    this.firePool = set.pool(MARK.her[0], LINE, 4.2, 0xff6a2a); this.matchPool = set.pool(0, 0, 1.5, 0xffb060);
    this.reset();
  }

  // ---- the scene's own calls
  begin(t) { this.reset(); this.began = true; this.live = true; this.step = 0; this.t = { begin: t }; this.canInHand = true; this._shove(); }
  // joined part-way (her bar emptied late): the stage as step n finds it
  cold(n, t) {
    const T = this.t = { begin: LONG_AGO };
    this.drops.length = 0;
    this.canInHand = n <= 2;
    if (n >= 2) T.slosh = LONG_AGO;
    if (n >= 3) { T.pop = LONG_AGO; T.pour = LONG_AGO; this.canFrom.set(MARK.her[0], 2.2, LINE); }
    if (n >= 4) { T.lit = T.flick = T.catch = T.have = LONG_AGO; }
    if (n >= 5) T.land = t - 2;
    if (n >= 6) { T.drop = LONG_AGO; this.dropFrom.set(MARK.top[0] + 0.3, MARK.top[1] + 1.1, MARK.top[2] + 0.5); }
  }
  // the room's loose ornaments, out of the picture
  _shove() {
    const sp = this.f.setPieces; if (!sp || !sp.on) return;
    for (const p of sp.list) {
      if (p.state !== 'rest' || p.x < -5.2 || p.x > 7.4 || p.z < -6.9 || p.z > 4.2) continue;
      const side = p.x < 1 ? -1 : 1, need = side < 0 ? p.x + 6.4 : 8.6 - p.x;
      p.vx = side * Math.max(4, need * 5.2); p.vz = (p.z < -4 ? -1 : 1) * 1.5; p.spin = 8;
    }
  }
  herHand(out = new V3()) { const h = this.boss.fig && this.boss.fig.bones.hand_r; return h ? h.getWorldPosition(out) : out.set(this.boss.x, 1.5, this.boss.z); }
  youHand(out = new V3()) { const h = this.f.player.rig.bones.hand_r; return h ? h.getWorldPosition(out) : out.set(this.f.player.x, 1.3 + this.f.player.y, this.f.player.z); }
  // n drops thrown from a point so that each comes down where it's sent, at its own moment
  throwDrops(t0, from, n, land) {
    for (let i = 0; i < n && this.drops.length < this.N; i++) {
      const to = land(i / Math.max(1, n - 1)), life = to.life, s = 0.035 + Math.random() * 0.05;
      this.drops.push({ t0: t0 + Math.random() * 0.03, x: from.x, y: from.y, z: from.z, vx: (to.x - from.x) / life, vy: (0.03 - from.y + G / 2 * life * life) / life, vz: (to.z - from.z) / life, life, s });
    }
  }
  // she heaves the can: what's in it, in an arc, along the line to where YOU stood
  slosh(t) {
    this.t.slosh = t;
    const h = this.herHand(); h.y = Math.max(1.2, h.y - 0.3);
    this.throwDrops(t, h, 56, (u) => ({ x: MARK.her[0] - 0.7 + (TRAIL.x0 + 0.2 - MARK.her[0] + 0.7) * Math.pow(u, 0.8) + (Math.random() - 0.5) * 0.3, z: LINE + (Math.random() - 0.5) * 0.7, life: 0.17 + 0.24 * u + Math.random() * 0.05 }));
  }
  // the can leaves her hand
  pop(t) { this.t.pop = t; this.canInHand = false; this.herHand(this.canFrom); }
  // the match leaves her hand; leaves YOU's
  flick(t) { this.t.flick = t; this.herHand(this.flickFrom); this.flickFrom.y += 0.1; }
  drop(t) { this.t.drop = t; this.dropFrom.copy(this.matchPos); }

  reset() {
    this.live = false; this.began = false; this.step = 0; this.t = {}; this.drops.length = 0; this.canInHand = false; this.burnK = 0; this.fireK = 0; this.matchLit = false;
    this.book = null; this.plate = null;
    this.trail.set(0, 0); this.puddle.set(0, 0); this.dropMesh.count = 0; this.can.visible = false; this.match.visible = false;
    this.trailFire.mesh.visible = false; this.herFire.mesh.visible = false; this.firePool.set(0); this.matchPool.set(0);
  }

  // ---- every frame, from the set, before its pieces (t: song time, running on after the finish)
  update(dt, t) {
    const f = this.f, ex = f.exec, b = this.boss, pl = f.player;
    if (!(this.began && ex && (ex.on || ex.over))) { if (this.live || this.began) this.reset(); return; }
    this.live = true; this.now = t;
    const T = this.t, has = (k) => T[k] != null && t >= T[k];
    const killed = has('kill');
    // the matchbook: up through its trapdoor; it burns and goes down again when she's gone
    const up = backOut(ramp(t, T.begin, T.begin + 0.5)), down = killed ? ease(ramp(t, T.kill + 0.15, T.kill + 0.95)) : 0;
    const landK = has('land') ? Math.exp(-(t - T.land) * 2.4) : 0;
    this.book = { y: -3.0 * (1 - up) - 3.0 * down, glow: 0.5 + (has('land') ? 0.3 : 0) + 1.6 * landK + (has('drop') && !killed ? 0.25 * Math.sin(t * 31) * Math.sin(t * 7) : 0), burn: killed ? ramp(t, T.kill, T.kill + 0.7) : 0 };
    // the gold plate her revenge was served on: out of the way; then up where the matchbook stood, for her head
    const cs = this.set.clocheSpot || { x: 0, z: 2 };
    if (!killed || t < T.kill + 0.55) { const k = ramp(t, T.begin, T.begin + 0.3); this.plate = { x: cs.x, z: cs.z, y: -0.5 * k, vis: k < 1, lit: k < 0.4 }; }
    else { const k = backOut(ramp(t, T.kill + 0.55, T.kill + 0.95)); this.plate = { x: MARK.serve[0], z: MARK.serve[1], y: -0.4 * (1 - k), vis: true, lit: false }; }
    // petrol on the floor (it burns off under the fire)
    const lit = has('drop');
    const kt = has('slosh') ? ease(ramp(t, T.slosh + 0.2, T.slosh + 0.55)) : 0, bt = lit ? ramp(t, AT.touch + 0.15, AT.touch + 1.0) : 0;
    this.trail.set(kt * (1 - bt), 0.85 * kt * (1 - bt)); this.trail.u.uTime.value = t; this.trail.u.uFill.value = 0;
    const kp = has('pour') ? 0.25 + 0.75 * ease(ramp(t, T.pour, T.pour + 0.7)) : has('slosh') ? 0.25 * ease(ramp(t, T.slosh + 0.2, T.slosh + 0.5)) : 0;
    const bp = lit ? ramp(t, AT.whoomph + 0.2, AT.whoomph + 1.4) : 0;
    this.puddle.set(kp * (1 - bp), 0.85 * (has('pour') ? 1 : 0) * ease(ramp(t, T.pour ?? 0, (T.pour ?? 0) + 0.5)) * (1 - bp)); this.puddle.u.uTime.value = t; this.puddle.u.uFill.value = 0;
    // the can
    const C = this.can;
    if (!has('pop')) C.visible = false;
    else {
      const tau = t - T.pop, a = this.canFrom, hx = MARK.her[0], hz = LINE, hov = [hx + 0.02, 3.08, hz + 0.02], rest = [hx - 1.4, 0.115, hz - 0.8];
      let x, y, z, rz, ry = 0.5;
      if (tau < POUR0) { const k = 1 - Math.pow(1 - tau / POUR0, 2); x = a.x + (hov[0] - a.x) * k; y = a.y + (hov[1] - a.y) * k; z = a.z + (hov[2] - a.z) * k; rz = Math.PI * 3 * k; }
      else if (tau < POUR1) { x = hov[0]; y = hov[1] + Math.sin(tau * 26) * 0.03; z = hov[2]; rz = Math.PI + Math.sin(tau * 22) * 0.14; }
      else if (tau < BONK) { const k = (tau - POUR1) / (BONK - POUR1); x = hov[0]; z = hov[2]; y = hov[1] + (2.72 - hov[1]) * k * k; rz = Math.PI; }
      else if (tau < REST) { const k = (tau - BONK) / (REST - BONK); x = hov[0] + (rest[0] - hov[0]) * k; z = hov[2] + (rest[2] - hov[2]) * k; y = 2.72 + (rest[1] - 2.72) * k * k + 1.6 * k * (1 - k); rz = Math.PI + k * 7.85; ry = 0.5 + k * 2; }
      else { const k = Math.min(1, (tau - REST) / 0.25); x = rest[0] - 0.25 * k * (2 - k); y = rest[1] + 0.12 * Math.sin(Math.PI * k) * (1 - k); z = rest[2]; rz = Math.PI / 2; ry = 2.5; }
      C.position.set(x, y, z); C.rotation.set(0, ry, rz); C.visible = true;
      // what's left in it, down on her head
      if (dt > 0 && tau >= POUR0 && tau < POUR1 + 0.03) {
        this._acc += dt * 95;
        while (this._acc >= 1 && this.drops.length < this.N) { this._acc -= 1; this.drops.push({ t0: t, x: hov[0] + (Math.random() - 0.5) * 0.12, y: hov[1] - 0.62, z: hov[2] + (Math.random() - 0.5) * 0.12, vx: (Math.random() - 0.5) * 1.6, vy: -1.5, vz: (Math.random() - 0.5) * 1.6, life: 0.3 + Math.random() * 0.14, s: 0.04 + Math.random() * 0.05 }); }
      }
    }
    // she drips (the can in her hand slops as she dances; soaked, she runs with it)
    if (dt > 0 && !killed && b.root.visible) {
      const rate = has('pour') && !(lit && t >= AT.whoomph) ? 26 : this.canInHand && !has('slosh') ? 9 : 0;
      this._acc2 = (this._acc2 || 0) + dt * rate;
      while (this._acc2 >= 1 && this.drops.length < this.N) {
        this._acc2 -= 1;
        if (has('pour')) this.drops.push({ t0: t, x: b.x + (Math.random() - 0.5) * 0.55, y: 0.7 + Math.random() * 1.3, z: b.z + (Math.random() - 0.5) * 0.45, vx: 0, vy: -0.4, vz: 0, life: 0.34, s: 0.028 + Math.random() * 0.03 });
        else { const h = this.herHand(_p); this.drops.push({ t0: t, x: h.x, y: h.y - 0.35, z: h.z, vx: (Math.random() - 0.5) * 1.5, vy: 1.2, vz: (Math.random() - 0.5) * 1.5, life: 0.42, s: 0.03 + Math.random() * 0.03 }); }
      }
    }
    // the drops
    let n = 0; _q.identity();
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const d = this.drops[i], tau = t - d.t0;
      if (tau >= d.life || tau < -0.2) { this.drops.splice(i, 1); continue; }
      if (tau < 0) continue;
      _p.set(d.x + d.vx * tau, Math.max(0.03, d.y + d.vy * tau - G / 2 * tau * tau), d.z + d.vz * tau); _s.set(d.s, d.s * 1.7, d.s);
      this.dropMesh.setMatrixAt(n++, _m.compose(_p, _q, _s));
    }
    this.dropMesh.count = n; this.dropMesh.instanceMatrix.needsUpdate = true;
    // the match
    const Mx = this.match; let mLit = false, mVis = true;
    if (has('drop')) {
      const k = ramp(t, T.drop, Math.max(AT.touch, T.drop + 0.25));
      if (k >= 1) mVis = false;
      else { const a = this.dropFrom; Mx.position.set(a.x + (MARK.touch[0] - a.x) * k, a.y + (0.06 - a.y) * Math.pow(k, 1.8) + 0.25 * Math.sin(Math.PI * Math.min(1, k * 2.2)) * (1 - k), a.z + (MARK.touch[1] - a.z) * k); Mx.rotation.set(k * 5.5, 0.3, 0.5 + k * 3.2); mLit = true; }
    } else if (has('have')) { this.youHand(_p); Mx.position.set(_p.x, _p.y + 0.02, _p.z); Mx.rotation.set(0.12, 0, 0.1 * Math.sin(t * 2.3)); mLit = true; }
    else if (has('catch')) { Mx.position.copy(this.fumbleAt); Mx.rotation.set(0, 0.7, Math.PI / 2 - 0.12); mLit = true; }
    else if (has('flick')) {
      const k = ramp(t, T.flick, Math.max(AT.flick, T.flick + 0.06)), a = this.flickFrom; this.youHand(_p);
      Mx.position.set(a.x + (_p.x - a.x) * k, a.y + (_p.y - a.y) * k + 0.22 * Math.sin(Math.PI * k), a.z + (_p.z - a.z) * k); Mx.rotation.set(0, 0, -k * 12); mLit = true;
    } else if (has('lit')) { this.herHand(_p); Mx.position.set(_p.x, _p.y + 0.06, _p.z); Mx.rotation.set(0, 0, -0.15); mLit = true; }
    else mVis = false;
    Mx.visible = mVis; this.matchLit = mVis && mLit; if (mVis) this.matchPos.copy(Mx.position);
    this.matchFire.set('m', this.matchLit ? 1 : 0, has('lit') && t < T.lit + 0.3 ? 2.2 - 4 * (t - T.lit) : 1); this.matchFire.update(dt, t);
    this.matchPool.mesh.position.set(Mx.position.x, 0.0185, Mx.position.z); this.matchPool.set(this.matchLit ? 0.2 * clamp01(1.6 - Mx.position.y * 0.5) : 0);
    // the fire
    const tf = this.trailFire, hf = this.herFire, wh = lit && t >= AT.whoomph;
    const whK = wh ? Math.exp(-(t - AT.whoomph) * 4) : 0, kK = killed ? Math.exp(-(t - T.kill) * 5) : 0;
    const dead = killed ? ramp(t, T.kill + 0.5, T.kill + 2.6) : 0;
    tf.mesh.visible = lit && t >= AT.touch - 0.02 && dead < 1;
    tf.set('trail', lit ? 1 - dead : 0, 1 + 0.5 * whK);
    tf.set('pool', wh ? 1 - (killed ? ramp(t, T.kill + 0.25, T.kill + 1.8) : 0) : 0, 1 + 0.9 * whK + 1.0 * kK);
    tf.update(dt, t);
    hf.mesh.visible = wh && (!killed || t < T.kill + 0.2);
    hf.set('her', wh ? (killed ? 1 - ramp(t, T.kill, T.kill + 0.14) : 1) : 0, 1 + 1.0 * whK);
    hf.update(dt, t);
    this.burnK = wh && !killed ? 1 : 0;
    this.fireK = wh ? (killed ? 1 - ramp(t, T.kill + 0.1, T.kill + 1.3) : 1) * (1 + 0.8 * whK + 0.8 * kK) : lit && t >= AT.touch ? 0.25 : 0;
    this.firePool.set(0.34 * Math.min(1.6, this.fireK));
  }
  // the set's real-time lights, while they're the scene's: the match's on whoever has it, the fire's on her and YOU
  light(L, flick) {
    if (!this.live) return;
    if (this.matchLit) { L.match.position.set(this.matchPos.x, this.matchPos.y + 0.45, this.matchPos.z + 0.25); L.match.intensity = 2.4 * flick; }
    if (this.fireK > 0.01) { L.bed.position.set(MARK.her[0] - 0.5, 1.5, LINE + 1.2); L.bed.intensity = 46 * this.fireK * flick; }
  }
}

// ------------------------------------------------------------------------------------------------ the scene
const kill = (X) => X.f.track.set.kill;
const snd = (X, name, o) => { const s = X.f.track._snd; return s ? s.play(name, { always: true, ...o }) : null; };
// the picture, beat by beat
const SHOT = {
  open: { pos: [-0.1, 1.45, 3.5], look: [-0.1, 1.3, LINE], fov: 36 },            // the walk: the matchbook comes up between them
  past: { pos: [3.3, 1.4, 1.9], look: [3.3, 1.25, LINE], fov: 34 },              // the two of them, right of it
  can: { pos: [3.9, 0.55, 0.9], look: [2.6, 1.85, LINE], fov: 40 },              // from the floor: the can, up and over her
  jump: { pos: [1.7, 0.6, 2.3], look: [1.2, 1.9, -5.0], fov: 42 },               // over her head and up
  hero: { pos: [3.2, 0.6, 1.2], look: [1.0, 2.0, -5.1], fov: 40 },               // YOU on the matchbook, her below
  dive: { pos: [4.7, 0.7, 0.3], look: [1.5, 1.7, -4.9], fov: 40 },
  after: { pos: [2.3, 1.2, 1.5], look: [1.1, 1.0, -5.0], fov: 36 },
};
// the picture: blended to, or cut to when the stage has just been put
function view(X, shot, blend = 0, o = {}) { const K = kill(X); X.cam(shot, { ...o, blend: K.cut ? 0 : blend }); K.cut = false; }
// a step begins. Joined part-way (or before the last one was through), the stage is put as this step finds it
function arrive(X, n) {
  const K = kill(X), p = X.you, t = X.t;
  if (K.step !== n - 1 || (n === 1 && t - K.t.begin < 0.45)) {
    K.cold(n, t);
    const B = p.rig.body; B.y = B.spin = B.pitch = B.roll = 0;
    X.place('her', ...MARK.her); X.lift('her', 0, 0.001);
    if (n >= 5) { X.place('you', MARK.top[0], MARK.top[2]); p.y = MARK.top[1]; p.grounded = false; } else { X.place('you', ...(n === 1 ? MARK.you0 : n === 2 ? MARK.you2 : MARK.you1)); p.y = 0; p.grounded = true; }
    X.go('you', p.x, p.z, 0.001, { y: p.y });
    X.faceEach();
    X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 }); X.clip('her', n === 6 ? 'Dance_Loop' : 'Idle_Loop', { loop: true, fade: 0.1 });
    X.herFace(n === 6 ? 'delight' : 'fury'); X.expr(n >= 4 ? 'A_Amused' : 'A_Focus');
    K.cut = true;
  }
  K.step = n;
  return K;
}

export const death = {
  beats: 24,
  hold: 2.3,
  enter(X) {
    const f = X.f, K = kill(X), b = X.her, p = X.you, D = f.track.dir;
    K.begin(X.t);
    if (D) { D.jump = null; D._seated = false; } b.lockFacing = false; b.root.position.y = 0;
    // she skids to her mark, the can in her fist; YOU runs to hers
    const th = Math.min(0.48, Math.max(0.22, Math.hypot(b.x - MARK.her[0], b.z - MARK.her[1]) / 22)), ty = Math.min(0.46, Math.max(0.2, Math.hypot(p.x - MARK.you0[0], p.z - MARK.you0[1]) / 24));
    X.go('her', ...MARK.her, th, { ease: 'out' }); X.face('her', ...MARK.you0); X.clip('her', 'Slide_Loop', { loop: true, fade: 0.05 });
    X.go('you', ...MARK.you0, ty, { ease: 'out', y: 0 }); X.face('you', ...MARK.you0); X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.3, fade: 0.05 });
    snd(X, 'skid', { x: b.x }); snd(X, 'thump', { x: 0, gain: 0.8 });
    X.after(th, () => { if (K.step) return; X.faceEach(); X.clip('her', 'Dance_Loop', { loop: true, fade: 0.12 }); snd(X, 'splash', { x: MARK.her[0], gain: 0.7 }); X.fx.dust(MARK.her[0], LINE, 6); });
    X.after(ty, () => { if (K.step) return; X.face('you', ...MARK.her); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
    X.herFace('delight'); X.expr('A_Focus');
    X.cam(SHOT.open);
  },
  steps: [
    // "than YOU": all of the can, at YOU. Through it, and past her
    { t: AT.slosh, key: 'dash',
      lead(X, s) {
        arrive(X, 1);
        X.place('her', ...MARK.her); X.go('you', ...MARK.you0, 0.1); X.faceEach();
        X.clip('her', 'OverhandThrow', { dur: Math.max(0.2, s.t - X.t), from: 0.04, to: 0.27, fade: 0.12 });
        X.clip('you', 'Sword_Idle', { loop: true, fade: 0.1 });
        view(X, SHOT.open, 0.2);
      },
      do(X, ok) {
        const K = kill(X), p = X.you, b = X.her;
        K.slosh(X.t);
        X.clip('her', 'OverhandThrow', { dur: 0.3, from: 0.27, to: 0.52, fade: 0.02 });
        snd(X, 'slosh', { x: b.x, gain: 1.0 }); X.after(0.26, () => { snd(X, 'splash', { x: -1, gain: 0.9 }); X.fx.dust(-1.2, LINE, 5, new THREE.Color(0.25, 0.22, 0.3)); });
        X.face('you', ...MARK.you1);
        if (ok) {
          X.clip('you', 'Sword_Dash', { dur: 0.26, from: 0.12, to: 0.38, fade: 0.03 }); X.go('you', ...MARK.you1, 0.2, { ease: 'out' });
          X.fx.dashStart && X.fx.dashStart(p); X.sfx.dash && X.sfx.dash(p);
          X.after(0.07, () => X.fx.nearMiss && X.fx.nearMiss(p));
          X.after(0.2, () => { X.fx.dashEnd && X.fx.dashEnd(p); X.face('you', ...MARK.her); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
        } else {
          // a faceful of it: she gets there anyway, the long way
          X.clip('you', 'Hit_Chest', { dur: 0.3 }); X.fx.sparks(p.x, 1.2, p.z, AMBER, 14);
          X.after(0.2, () => { X.clip('you', 'Sprint_Loop', { loop: true, speed: 1.2, fade: 0.06 }); X.go('you', ...MARK.you1, 0.36, { ease: 'inOut' }); });
          X.after(0.57, () => { X.face('you', ...MARK.her); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.12 }); });
        }
        X.after(0.3, () => { X.face('her', ...MARK.you1); X.herFace('fury'); X.clip('her', 'Idle_Loop', { loop: true, fade: 0.15 }); });
        view(X, SHOT.past, 0.3);
      } },
    // "I FUCKED your dad": she swings the can at YOU. The cut sends it up, over, and all of it down on her
    { t: AT.cut, key: 'strike',
      lead(X, s) {
        arrive(X, 2);
        X.place('her', ...MARK.her); X.face('her', ...MARK.you2);
        X.go('you', ...MARK.you2, 0.2, { ease: 'out' }); X.face('you', ...MARK.her);
        X.strike('lift', s.t);
        X.clip('her', 'OverhandThrow', { dur: Math.max(0.2, s.t - X.t - 0.02), from: 0.06, to: 0.27, fade: 0.1 });
        X.herFace('fury');
        view(X, SHOT.can, 0.25);
      },
      do(X, ok) {
        const K = kill(X), b = X.her, t0 = X.t, h = K.herHand();
        X.slash('lift', { gold: ok }); X.hit({ power: ok ? 1.25 : 0.6, gold: ok, at: { x: h.x, y: h.y, z: h.z } });
        K.pop(t0);
        X.clip('her', 'Hit_Chest', { dur: 0.3, fade: 0.03 });
        snd(X, 'clatter', { x: b.x, gain: 0.6, rate: 1.5 });
        X.at(t0 + POUR0, () => { K.t.pour = X.t; X.clip('her', 'Idle_Shield_Break', { dur: 0.5, fade: 0.08 }); X.herFace('shock'); snd(X, 'splash', { x: b.x, gain: 1.0, rate: 0.8 }); X.fx.glitter(b.x, 2.1, b.z, AMBER, 12, 0.4); });
        X.at(t0 + BONK, () => { X.clip('her', 'Hit_Head', { dur: 0.3, fade: 0.03 }); snd(X, 'tonk', { x: b.x, gain: 1.0 }); X.hit({ power: 0.5, gold: false, y: 2.0, quiet: true, dir: Math.PI }); });
        X.at(t0 + REST, () => { snd(X, 'clatter', { x: b.x - 1.4, gain: 0.7 }); X.fx.dust(MARK.her[0] - 1.4, LINE - 0.8, 5); });
        X.go('you', ...MARK.you1, 0.3, { ease: 'out' });
        X.after(0.34, () => { X.face('you', ...MARK.her); X.clip('you', 'Sword_Idle', { loop: true, fade: 0.15 }); X.expr('A_Amused'); });
      } },
    // "your DAD": soaked, she strikes her last match and flicks it. Caught
    { t: AT.flick, key: 'parry',
      lead(X, s) {
        const K = arrive(X, 3), b = X.her;
        X.place('her', ...MARK.her); X.face('her', ...MARK.you1);
        X.go('you', ...MARK.you1, 0.15); X.face('you', ...MARK.her);
        const tS = Math.max(X.t + 0.04, s.t - 0.46), tW = tS + 0.17, tF = Math.max(tW + 0.08, s.t - 0.09);
        X.at(tS, () => { K.t.lit = X.t; X.clip('her', 'Interact', { dur: 0.2, from: 0.3, to: 0.5, fade: 0.05 }); X.herFace('fury'); snd(X, 'strike', { x: b.x, gain: 1.1 }); const q = K.herHand(); X.fx.sparks(q.x, q.y, q.z, EMBER, 12); X.flash(new THREE.Color(0.12, 0.07, 0.025), 1); });
        X.at(tW, () => X.clip('her', 'OverhandThrow', { dur: Math.max(0.08, tF - tW), from: 0.12, to: 0.27, fade: 0.05 }));
        X.at(tF, () => { X.clip('her', 'OverhandThrow', { dur: 0.3, from: 0.27, to: 0.5, fade: 0.02 }); K.flick(X.t); snd(X, 'flick', { x: b.x }); });
        view(X, SHOT.past, 0.3);
      },
      do(X, ok) {
        const K = kill(X), p = X.you, m = K.matchPos;
        K.t.catch = X.t;
        if (ok) {
          K.t.have = X.t;
          X.clip('you', 'Interact', { dur: 0.1, from: 0.3, to: 0.42, fade: 0.03 });
          X.fx.caught(m.x, m.y, m.z, true); X.sfx.catch && X.sfx.catch('perfect', X.f.pan(p.x));
          X.after(0.2, () => { X.clip('you', 'Consume', { dur: 0.3, from: 0.2, to: 0.42, fade: 0.1 }); X.expr('A_Amused'); });
          X.cam('you', { dist: 2.9, h: 1.35 });
          X.after(0.85, () => view(X, SHOT.past, 0.3));
        } else {
          // off her chest and down: she has it a moment later
          K.fumbleAt.set(p.x - 0.55, 0.06, p.z + 0.35);
          X.clip('you', 'Hit_Chest', { dur: 0.3 }); X.fx.sparks(p.x, 1.35, p.z, EMBER, 12);
          X.after(0.34, () => X.clip('you', 'PickUp_Table', { dur: 0.3, fade: 0.06 }));
          X.after(0.52, () => { K.t.have = X.t; });
          X.after(0.66, () => X.clip('you', 'Consume', { dur: 0.3, from: 0.2, to: 0.42, fade: 0.1 }));
        }
        X.after(0.22, () => { X.herFace('shock'); X.clip('her', 'Idle_No_Loop', { loop: true, fade: 0.15, speed: 1.6 }); });
      } },
    // "what the FUCK": she comes for it. Up, over her, onto the matchbook
    { t: AT.jump, key: 'jump',
      lead(X, s) {
        arrive(X, 4);
        X.place('her', ...MARK.her); X.face('her', ...MARK.you1); X.go('you', ...MARK.you1, 0.12); X.face('you', ...MARK.her);
        X.herFace('fury');
        const tL = Math.max(X.t + 0.02, s.t - 0.44);
        X.at(tL, () => { X.clip('her', 'Zombie_Scratch', { dur: 0.8, from: 0.08, to: 0.5, fade: 0.08 }); X.go('her', MARK.her[0] + 0.8, LINE + 0.15, 0.42, { ease: 'in' }); });
        X.at(s.t - 0.2, () => X.clip('you', 'NinjaJump_Start', { dur: 0.2, from: 0.0, to: 0.12, fade: 0.06 }));
        view(X, SHOT.jump, 0.35);
      },
      do(X, ok) {
        const K = kill(X), p = X.you, tLand = Math.max(X.t + 0.34, AT.land), dur = tLand - X.t;
        X.clip('you', 'NinjaJump_Start', { dur: 0.18, from: 0.12, to: 0.5, fade: 0.03 });
        X.after(0.18, () => X.clip('you', 'NinjaJump_Idle_Loop', { loop: true, fade: 0.08 }));
        X.face('you', MARK.top[0], MARK.top[2]);
        X.go('you', MARK.top[0], MARK.top[2], dur, { ease: 'inOut', arc: 1.5, y: MARK.top[1] });
        X.body('you', { pitch: -Math.PI * 2 }, dur * 0.92, 'inOut');
        X.sfx.jump && X.sfx.jump(p); X.fx.dust(p.x, p.z, 6);
        if (!ok) X.fx.sparks(p.x, 0.7, p.z, new THREE.Color(2.4, 2.4, 2.6), 8);        // (her hand on YOU's hem)
        X.at(tLand, () => { p.rig.body.pitch = 0; K.t.land = X.t; X.face('you', ...MARK.her); X.clip('you', 'NinjaJump_Land', { dur: 0.22, from: 0.12, to: 0.4, fade: 0.03 }); snd(X, 'thump', { x: 0, gain: 0.7, rate: 1.5 }); X.shake(0.3, 0.1); });
        X.at(tLand + 0.22, () => { X.clip('you', 'Interact', { dur: 0.25, from: 0.2, to: 0.42, fade: 0.1 }); X.expr('A_Amused'); });
        // she goes through where YOU was, and turns
        X.after(0.3, () => { X.go('her', ...MARK.her, 0.25, { ease: 'out' }); X.face('her', MARK.top[0], MARK.top[2]); X.clip('her', 'Spell_Simple_Idle_Loop', { loop: true, fade: 0.2 }); X.herFace('fury'); });
      } },
    // "gonna": YOU lit the match so gently. It runs along her trail, and on the next hit she goes up
    { t: AT.drop, key: 'parry',
      lead(X) {
        arrive(X, 5);
        X.go('her', ...MARK.her, 0.18, { ease: 'out' }); X.face('her', MARK.top[0], MARK.top[2]);
        view(X, SHOT.hero, 0.3);
      },
      do(X, ok) {
        const K = kill(X), b = X.her;
        K.drop(X.t);
        X.clip('you', ok ? 'Interact' : 'Hit_Chest', ok ? { dur: 0.45, from: 0.45, to: 0.72, fade: 0.05 } : { dur: 0.3 });
        snd(X, 'flick', { x: 0, gain: 0.6, rate: 0.7 });
        X.at(AT.touch, () => { snd(X, 'whump', { x: MARK.touch[0], gain: 1.0 }); snd(X, 'fuse', { x: MARK.touch[0], gain: 0.7, rate: 1.7, path: [[0.26, MARK.her[0]]] }); X.fx.sparks(MARK.touch[0], 0.2, LINE, EMBER, 16); X.herFace('shock'); });
        X.at(AT.whoomph, () => {
          snd(X, 'whoomph', { x: b.x, gain: 0.8, rate: 1.25 }); X.flash(new THREE.Color(0.32, 0.12, 0.03), 1); X.fx.aberrate && X.fx.aberrate(1.6); X.shake(1.0, 0.3); X.f.cam.kick(1.8);
          X.fx.sparks(b.x, 1.0, b.z, EMBER, 40); X.clip('her', 'Hit_Chest', { dur: 0.2, fade: 0.03 });
          // she's the fucking fire
          X.after(0.2, () => { X.herFace('delight'); X.clip('her', 'Dance_Loop', { loop: true, fade: 0.1, speed: 1.5 }); });
        });
      } },
    // "DO": down through it
    { last: true, key: 'strike',
      lead(X, s) {
        arrive(X, 6);
        const p = X.you;
        X.place('her', ...MARK.her); p.rig.body.pitch = 0;
        X.face('you', ...MARK.her);
        X.strike('dive', s.t);
        X.go('you', MARK.her[0] - 0.6, LINE + 0.1, Math.max(0.1, s.t - X.t), { ease: 'in', arc: 0.85, y: 0 });
        X.expr('A_Exertion');
        view(X, SHOT.dive, 0.3);
      },
      do(X, ok) {
        const K = kill(X), b = X.her;
        K.t.kill = X.t;
        X.slash('dive', { gold: ok }); X.hit({ power: 2.3, gold: ok });
        X.fx.ring && X.fx.ring(b.x, b.z, GOLD, 3.4); X.fx.dust(b.x, b.z, 18); X.fx.sparks(b.x, 1.2, b.z, EMBER, 60);
        snd(X, 'crash', { x: b.x, gain: 0.7 });
        // (not pressed: the kiln does it, a moment late, and she bursts where she stands)
        X.shatter({ dir: new V3(-0.25, ok ? -1 : 0.7, 0.35), power: ok ? 1.6 : 1.1 });
      } },
  ],
  after(X) {
    const p = X.you;
    X.go('you', p.x, p.z, 0.05, { y: 0 });
    X.after(0.3, () => { X.face('you', 0.6, 6); X.clip('you', 'Idle_FoldArms_Loop', { loop: true, fade: 0.3 }); X.expr('A_Amused'); });
    view(X, SHOT.after, 0.5);
  },
};
