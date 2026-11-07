// The yard as a music-video set: everything that moves, burns, soaks, lights or breaks on top of the baked yard.
// Every piece's state is a function of song time (update(dt, t) puts the whole set where it is at t), so a
// rewind or a start anywhere is exact. Breakables remember when they broke and come back on a rewind before it.
import * as THREE from 'three';
import { Flames } from './fire.js';
import { soak, char, pool } from './overlays.js';
import { dress, T2 } from './set2.js';
import { Held } from './held.js';
import * as P from './props.js';
import { M, GLOW, canvasTex } from './mats.js';
import { PLAN } from './yard-lite.js';
import { LAYER } from '../../game/arena.js';

export const TIME = {
  bedFire: 5.466, lamps: 11.178, market: 22.587, scales: 42.54, bandCut: 46.457, matchbookUp: 46.82,
  soak: [47.53, 48.61, 49.33, 50.41, 51.11], drawMatch: 52.52, strike: 53.259, fuse: 55.02, fuseStreet: 55.59, silence: 58.21, erupt: 60.352,
  embers: 93.836, bedroom: 95.625,
};
const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ramp = (t, a, b) => clamp01((t - a) / (b - a));
const ease = (k) => k * k * (3 - 2 * k);
const back = (k) => { const c = 1.5; return 1 + (c + 1) * Math.pow(k - 1, 3) + c * Math.pow(k - 1, 2); };
// a piece that rises out of a trapdoor at t0 (over d) and sinks at t1
const rise = (t, t0, t1, d = 0.42, depth = 2.8) => (t < t0 ? -depth : t < t0 + d ? -depth * (1 - back(ramp(t, t0, t0 + d))) : t < t1 ? 0 : -depth * ease(ramp(t, t1, t1 + d * 2)));

const _up = new THREE.Vector3(), _Yax = new THREE.Vector3(0, 1, 0);
export const BLOCK = PLAN.block;   // x -6..8.6, z -6.9..3.4
const inRect = (x, z, r, x0, z0, x1, z1, m = 0) => x > x0 - r - m && x < x1 + r + m && z > z0 - r - m && z < z1 + r + m;

// the fuse: down the walk to the street, then both ways round the block's gold edging
const FUSE = (() => {
  const down = [[0, -4.6], [0, 3.4]], left = [[0, 3.4], [-6, 3.4], [-6, -6.9], [0, -6.9]], right = [[0, 3.4], [8.6, 3.4], [8.6, -6.9], [0, -6.9]];
  const paths = [{ pts: down, t0: TIME.fuse, v: 14 }, { pts: left, t0: TIME.fuseStreet, v: 13.85 }, { pts: right, t0: TIME.fuseStreet, v: 13.75 }];
  const segs = [];
  for (const p of paths) { let s = 0; for (let i = 0; i < p.pts.length - 1; i++) { const [ax, az] = p.pts[i], [bx, bz] = p.pts[i + 1]; const L = Math.hypot(bx - ax, bz - az); segs.push({ ax, az, bx, bz, L, tA: p.t0 + s / p.v, v: p.v }); s += L; } }
  return segs;
})();

export class YardSet {
  constructor(f, arena) {
    this.f = f; this.arena = arena; this.scene = f.scene;
    this.root = new THREE.Group(); this.root.name = 'yard-set'; this.scene.add(this.root);
    this.t = 0;
    this.colliders = [];    // { active(t), type: 'box'|'circle', x, z, hx, hz, r }
    this.blockers = [];     // projectile blockers: { active(t), x0, z0, x1, z1 } or circles
    this.hazards = [];      // touch = 1 heart and a bounce out: { active(t), test(x,z,r), out(x,z) -> {x,z,nx,nz}, name }
    this.breakables = [];
    this.pieces = [];       // { update(t, dt) }
    this.lights = {};
  }

  async build(boss) {
    const f = this.f, R = this.root;
    this.boss = boss;
    // ---- real-time lights (all created now, so the light count never changes: no recompiles mid-song)
    const L = this.lights;
    L.bed = new THREE.PointLight(0xff6a2a, 0, 9, 2); L.bed.position.set(5, 2.4, -0.6);
    L.match = new THREE.PointLight(0xffb060, 0, 10, 2);
    L.fire = new THREE.PointLight(0xff6a2a, 0, 26, 1.6); L.fire.position.set(1.3, 3.2, -1.75);
    L.rim = new THREE.PointLight(0x9c8cff, 0, 7, 2);
    L.spot = new THREE.SpotLight(0xc8b8ff, 0, 30, 0.22, 0.6, 1.2); L.spot.position.set(0, 13, 9);
    for (const l of Object.values(L)) R.add(l);
    R.add(L.spot.target);
    // ---- fire (one draw for the yard's flames)
    const F = this.fire = new Flames(this.scene, R);
    F.fillRect(4.05, -1.65, 5.95, 0.45, 0.68, { y: 0.55, h: 1.25, w: 0.85, group: 'bed' });
    for (const s of FUSE) {
      const n = Math.max(1, Math.round(s.L / 0.34));
      for (let i = 0; i <= n; i++) { const k = i / n; F.add({ x: s.ax + (s.bx - s.ax) * k, z: s.az + (s.bz - s.az) * k, h: 0.62 + Math.random() * 0.2, w: 0.5, group: 'ring', ignite: s.tA + s.L * k / s.v }); }
    }
    F.fillRect(BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1, 1.08, { h: 2.3, w: 1.15, group: 'block' });
    F.fillRect(BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1, 2.0, { h: 3.2, w: 1.5, group: 'blockTall' });
    for (let z = -6.6; z < 3.2; z += 0.9) for (const x of [-11.3, 11.3]) F.add({ x, z, y: 0.6, h: 1.6, w: 0.9, group: 'fences' });
    F.build();
    // ---- intro: our bed and your things
    const bed = P.bed(); bed.position.set(5, 0, -0.6); R.add(bed);
    const things = P.bedside(); things.position.set(5, 0, -0.6); R.add(things);
    // the bed chars as it burns (its own copies of the glazes), so its flames read against it, not a lit white duvet
    const bedMats = [], CHAR = new THREE.Color(0x22130d);
    bed.traverse((o) => { if (o.isMesh && o.material && o.material !== M.gold) { o.material = o.material.clone(); bedMats.push({ m: o.material, c0: o.material.color.clone() }); } });
    this.addPiece((t) => {
      const y = t < TIME.market ? 0 : -1.5 * ease(ramp(t, TIME.market, TIME.market + 0.7)); bed.position.y = y; things.position.y = y; bed.visible = things.visible = y > -1.45;
      const k = 0.8 * ease(ramp(t, TIME.bedFire, TIME.bedFire + 2.5)); for (const q of bedMats) q.m.color.lerpColors(q.c0, CHAR, k);
    });
    this.colliders.push({ type: 'box', x: 5, z: -0.6, hx: 1.0, hz: 1.1, active: (t) => t < TIME.market + 0.2 });
    this.blockers.push({ x0: 4, z0: -1.7, x1: 6, z1: 0.5, active: (t) => t < TIME.market + 0.2 });
    this.hazards.push({ name: 'bed', active: (t) => t > TIME.bedFire + 0.1 && t < TIME.market, rect: [4.0, -1.7, 6.0, 0.5] });
    // ---- the pour: five soaked regions (the dormant telegraph), and the block's dashed outline once it's whole
    const mid = (BLOCK.z0 + BLOCK.z1) / 2;
    const regions = [[-6.0, mid, -1.4, BLOCK.z1], [-6.0, BLOCK.z0, -1.4, mid], [-1.4, BLOCK.z0, 1.4, BLOCK.z1], [1.4, BLOCK.z0, 8.6, mid], [1.4, mid, 8.6, BLOCK.z1]];
    this.soaks = regions.map((r, i) => ({ o: soak(R, r, 0.013 + i * 0.0004), t: TIME.soak[i] }));
    this.outline = soak(R, [BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1], 0.016);
    this.chars = [char(R, [-6.0, BLOCK.z0, -1.4, BLOCK.z1], 0.014), char(R, [1.4, BLOCK.z0, 8.6, BLOCK.z1], 0.0142), char(R, [-1.4, BLOCK.z0, 1.4, BLOCK.z1], 0.0138)];
    // ---- the giant matchbook (rises at 46.82, burns at 60.35, sinks when the bedroom drops)
    const mb = P.matchbook(); mb.position.set(0, -3, -5.3); R.add(mb);
    this.addPiece((t) => {
      mb.position.y = rise(t, TIME.matchbookUp, TIME.bedroom, 0.5, 3.0); mb.visible = mb.position.y > -2.95;
      const cov = mb.userData.cover;
      const reveal = ramp(t, TIME.drawMatch, TIME.drawMatch + 0.4), blaze = ramp(t, TIME.strike, TIME.strike + 0.15) * (1 - 0.5 * ramp(t, TIME.strike + 0.3, TIME.strike + 2.5));
      const burn = ramp(t, TIME.erupt, TIME.erupt + 3.5);
      cov.emissiveIntensity = (0.25 * reveal + 1.4 * blaze) * (1 - burn) + 2.2 * Math.sin(Math.PI * Math.min(1, burn * 1.4)) * (1 - burn);
      cov.color.setScalar(1 - 0.85 * burn);
    });
    this.colliders.push({ type: 'box', x: 0, z: -5.3, hx: 0.8, hz: 0.35, active: (t) => t > TIME.matchbookUp + 0.25 && t < TIME.bedroom });
    this.blockers.push({ x0: -0.8, z0: -5.5, x1: 0.8, z1: -5.1, active: (t) => t > TIME.matchbookUp + 0.25 && t < TIME.bedroom });
    // ---- the block: the ring of fire seals it (a thin line: walking into it hurts, a dash is free), then it burns
    this.hazards.push({ name: 'ring', active: (t) => t > TIME.fuse && t < TIME.erupt, line: true });
    this.hazards.push({ name: 'block', active: (t) => t > TIME.erupt + 0.05 && t < TIME.embers, rect: [BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1] });
    // ---- her staff: the giant match, in her right hand (52.52 - 93.84), a flame and a light at its head
    if (boss && boss.fig) this._buildHeld(boss);
    // ---- the holidays, section by section
    dress(this);
    // the follow-spot's pool on the floor (the baked floor can't take a real-time light), and the matchbook's spot
    this.spotPool = this.pool(0, 0, 1.7, 0xc8b8ff); this.bookPool = this.pool(0, -5.0, 1.6, 0xffd9a0);
    // ---- flame bursts (landings, fire pillars): a pool of small clusters placed where they're needed
    this.bursts = [];
    for (let i = 0; i < 6; i++) {
      const g = new THREE.Group(); R.add(g);
      const fl = new Flames(this.scene, g);
      for (let k = 0; k < 9; k++) { const a = k / 9 * Math.PI * 2, rr = k === 0 ? 0 : 0.55 + Math.random() * 0.35; fl.add({ x: Math.cos(a) * rr * (k ? 1 : 0), z: Math.sin(a) * rr * (k ? 1 : 0), h: k === 0 ? 2.2 : 1.2 + Math.random() * 0.6, w: 0.9, group: 'b' }); }
      fl.build();
      this.bursts.push({ g, fl, t0: -99, k: 1 });
    }
    // ---- things that fly from her hand (a match flicked onto the bed, the empty can tossed on the street)
    this.flyers = [];
    this._extras();
    this.update(0, f.t || 0);
  }

  addPiece(fn) { this.pieces.push(fn); }
  pool(x, z, r, color, mode) { return pool(this.root, x, z, r, color, mode === 'dark'); }
  outroT() { return this.f.track && this.f.track._outro ? this.f.track._outro.t : this.t; }
  teddyRollDur() { const h = this.teddyHome, e = this.teddyEnd; return Math.min(1.0, Math.max(0.15, Math.hypot(e.x - h.x, e.z - h.z) / 12)); }
  polaAim(g) { const pl = this.f.player; return Math.atan2(pl.x - g.position.x, pl.z - g.position.z); }
  // a breakable bursts and pops one pink lob at YOU (catch it for a gold throw)
  // it lands on a beat, two after the next one, so the catch falls on the beat like every other
  burstLob(shape, x, z) {
    const f = this.f; if (f.state !== 'play') return;
    const nb = f.bm.nearest(f.t, 1), b0 = nb.time > f.t + 0.05 ? nb.beat : nb.beat + 1;
    f.pat.lob(f, { from: { x, z }, fromY: 0.9, end: f.bm.timeOf(b0 + 2), shape, size: 0.42, r: 1.0 });
  }

  // ---------------------------------------------------------------- the helices, the brand, the live hazards, the finish
  _extras() {
    const f = this.f, R = this.root;
    // SAME GENETICS: three double helices of white pearls with gold rungs, a line along z, sweeping +x at 10 m/s
    const NP = 120, pearl = new THREE.SphereGeometry(0.12, 12, 8);
    this.helixMesh = new THREE.InstancedMesh(pearl, new THREE.MeshPhysicalMaterial({ color: 0xf6f2ea, roughness: 0.12, clearcoat: 1, iridescence: 0.6, emissive: new THREE.Color(0.25, 0.25, 0.3) }), 3 * NP * 2);
    this.helixMesh.count = 0; this.helixMesh.frustumCulled = false; R.add(this.helixMesh);
    this.rungMesh = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 1, 6), M.gold, 3 * NP);
    this.rungMesh.count = 0; this.rungMesh.frustumCulled = false; R.add(this.rungMesh);
    this.helices = [];
    this.hazards.push({ name: 'helix', active: (t) => this.helices.length > 0, test: (x, z, r, t) => this.helices.some((h) => { const hx = -10 + 10 * (t - h.t0); return t > h.t0 && Math.abs(x - hx) < 0.42 + r * 0.6 && Math.abs(z - h.gap) > 1.2 - r * 0.5; }), once: true });
    // the brand: DAD, mirror-image, scorched into the lawn
    const tex = canvasTex(512, 256, (c, w, h) => { c.clearRect(0, 0, w, h); c.translate(w, 0); c.scale(-1, 1); c.font = '900 200px "Archivo Black", Arial Black, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.shadowColor = '#ff6a2a'; c.shadowBlur = 24; c.fillStyle = '#1a0a06'; c.fillText('DAD', w / 2, h / 2 + 8); c.shadowBlur = 0; c.fillText('DAD', w / 2, h / 2 + 8); });
    this.brand = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 1.3), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, color: new THREE.Color(1, 1, 1) }));
    this.brand.rotation.x = -Math.PI / 2; this.brand.position.y = 0.021; this.brand.renderOrder = 1; this.brand.visible = false; this.brand.layers.set(LAYER.NO_REFLECT); R.add(this.brand);
    this.brandT = -1;
    // the cart charge and the rolling teddy are live while they run
    this.hazards.push({ name: 'cart', active: (t) => t > 33.28 && t < 33.99, test: (x, z, r, t) => { const c = this.cart; return c && Math.hypot(x - c.position.x, z - c.position.z) < 1.0 + r || (this.boss && Math.hypot(x - this.boss.x, z - this.boss.z) < 0.8 + r); } });
    this.hazards.push({ name: 'teddy', active: (t) => t > T2.teddyRoll && t < T2.teddyRoll + this.teddyRollDur(), test: (x, z, r) => this.teddy && Math.hypot(x - this.teddy.position.x, z - this.teddy.position.z) < 1.0 + r });
    // the finish: her face lands on the walk with a lit match in its teeth; the dead-eye teddy sits up in the glitter
    // (a little larger than life, 60 cm, so the keepsake reads from the high camera)
    this.bear = P.teddy(0.32); this.bear.visible = false; R.add(this.bear);
    this.bearPool = this.pool(0, 0, 1.1, 0xffc890);
    this.headMatch = P.smallMatch(); this.headMatch.scale.setScalar(2.4); this.headMatch.visible = false; R.add(this.headMatch);
    this.headFlame = new Flames(this.scene, this.headMatch); this.headFlame.add({ x: 0, z: 0, y: 0.13, w: 0.12, h: 0.24, group: 'm' }); this.headFlame.build();
    this.youre = new Flames(this.scene, R);
    for (let i = 0; i < 14; i++) this.youre.add({ x: -0.45 + i * 0.07, z: -6.8, y: 0.03, w: 0.12, h: 0.18, group: 'y', ignite: T2.youre + i * 0.04 });
    this.youre.build();
  }
  helix(t0, gap) { this.helices.push({ t0, gap, hit: false }); }
  brandAt(x, z, t) { this.brandPos = { x, z }; this.brandT = t; }
  // does a solid set piece stand on the line from (x0, z0) to (x1, z1)? (the camera flash)
  blocksLine(x0, z0, x1, z1) {
    const L = Math.hypot(x1 - x0, z1 - z0), t = this.t;
    for (let d = 0.7; d < L - 0.5; d += 0.2) {
      const x = x0 + (x1 - x0) * d / L, z = z0 + (z1 - z0) * d / L;
      for (const b of this.blockers) { if (!b.active(t)) continue; if (b.r ? Math.hypot(x - b.x, z - b.z) < b.r : (x > b.x0 && x < b.x1 && z > b.z0 && z < b.z1)) return true; }
    }
    return false;
  }
  _helices(t) {
    const H = this.helixMesh, Rg = this.rungMesh, m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(1, 1, 1), p = new THREE.Vector3();
    this.helices = this.helices.filter((h) => h.t0 <= t + 0.01 && t < h.t0 + 2.4);
    let n = 0, nr = 0;
    for (const h of this.helices) {
      const hx = -10 + 10 * Math.max(0, t - h.t0);
      for (let i = 0; i < 120; i++) {
        const z = -7 + i * (14 / 120); if (Math.abs(z - h.gap) < 1.2) continue;
        const a = z * 2.2 + t * 6;
        for (const sg of [0, Math.PI]) { p.set(hx + Math.cos(a + sg) * 0.32, 0.75 + Math.sin(a + sg) * 0.32, z); m.compose(p, q, s); H.setMatrixAt(n++, m); }
        if (i % 3 === 0) { const r = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), a + Math.PI / 2); p.set(hx, 0.75, z); m.compose(p, r, new THREE.Vector3(1, 0.64, 1)); Rg.setMatrixAt(nr++, m); }
      }
    }
    H.count = n; Rg.count = nr; H.instanceMatrix.needsUpdate = true; Rg.instanceMatrix.needsUpdate = true;
  }
  _rings(f, t) {
    const pl = f.player; if (!pl || !pl.rings) return;
    for (const r of pl.rings) {
      if (r.state === 'hand') continue;
      for (const b of this.breakables) if (!b.broken && b.active(t) && Math.hypot(r.pos.x - b.x, r.pos.z - b.z) < b.r + 0.55) this.breakAt(b, f);
      if (this.presents && t < T2.ignite) this.presents.forEach((g, i) => { if (g.visible && this.knocked[i] === undefined && t > T2.lift[i] + 0.3 && Math.hypot(r.pos.x - g.position.x, r.pos.z - g.position.z) < 0.9) { this.knocked[i] = t + 0.34; const sp = this.hangSpots[i] || { x: g.position.x, z: g.position.z }; this.hangSpots[i] = sp; f.pat.area(f, { shape: 'circle', x: sp.x, z: sp.z, w: 0.9 + g.userData.s * 0.8, kind: 'white', start: t, end: t + 0.34 }); this.f.track._snd && this.f.track._snd.play('crash', { x: sp.x, rate: 1.6, gain: 0.4 }); } });
    }
  }
  _finishUpdate(dt) {
    const f = this.f, fig = this.boss && this.boss.fig;
    if (!this._finished && this._lean && f.cam.override === this._lean) f.cam.override = null;
    if (!this._finished) { this.bear.visible = false; this.headMatch.visible = false; this.headFlame.set('m', 0, 1); this.youre.set('y', 0, 1); this.bearPool && this.bearPool.set(0); return; }
    const ot = this.outroT();
    if (!this._head && fig) this._head = this._findFace(fig);
    const H = this._head, T0 = this._finishT;
    // her face is the one shard the shatter keeps whole; it's drawn a little larger than life (HS) so it reads
    // from the high camera as her head on the walk, not a scrap of glaze
    const HS = 2.4;
    const target = new THREE.Vector3(0.12, 0.16, -5.72);
    if (H && H.body) {
      const b = H.body;
      if (!H.from) { H.from = b.pos.clone(); H.q0 = b.q.clone(); b.asleep = true; b.vel.set(0, 0, 0); b.w.set(0, 0, 0); }
      if (H.nudge) { target.x = Math.max(-10.4, Math.min(10.4, target.x + H.nudge.x)); target.z = Math.max(-6.5, Math.min(6.5, target.z + H.nudge.z)); }
      // the current move: the pop off her shoulders onto the walk, or a knock from a strike (a short hop and a twirl)
      const mv = H.mv || (H.mv = { t0: T0, dur: 1.1, hop: 2.2, spin: Math.PI * 2, base: 0 });
      const k = Math.min(1, (ot - mv.t0) / mv.dur), e = k * k * (3 - 2 * k), kf = Math.min(1, (ot - T0) / 1.1);
      b.pos.lerpVectors(H.from, target, e); b.pos.y += Math.sin(Math.PI * k) * mv.hop;
      const spin = new THREE.Quaternion().setFromAxisAngle(_Yax, mv.base + mv.spin * e);
      b.q.copy(spin).multiply(H.qFace); b.scale = 1.5 + (HS - 1.5) * kf * kf * (3 - 2 * kf);
      fig.shards.write();
      const mouth = new THREE.Vector3(0, -0.075, 0.12).multiplyScalar(b.scale / 1.5).applyQuaternion(b.q).add(b.pos);
      // the camera leans in on YOU and her face (it follows her mark; she's in pieces)
      const bb = this.boss; bb.x += (b.pos.x - bb.x) * Math.min(1, dt * 1.5); bb.z += (b.pos.z - 0.3 - bb.z) * Math.min(1, dt * 1.5);
      this.headMatch.position.copy(mouth); this.headMatch.rotation.set(0, 0, Math.PI / 2.2 + Math.sin(ot * 3) * 0.05); this.headMatch.scale.setScalar(2.4 * b.scale / 1.5); this.headMatch.visible = true;
    } else { this.headMatch.position.copy(target).add(new THREE.Vector3(0, 0.05, 0)); this.headMatch.visible = true; this.headMatch.rotation.set(0, 0, Math.PI / 2); }
    this.headFlame.set('m', ot < T2.out ? 1 : 0, 1); this.headFlame.update(dt, ot);
    // the match in her teeth lights her face a little (the staff's light, free since chorus 1)
    const L = this.lights, lit = ot < T2.out ? 1 : 0;
    L.match.position.copy(this.headMatch.position).add(_up.set(0, 0.3, 0.3)); L.match.intensity = 2.4 * lit * (0.85 + 0.15 * Math.sin(ot * 23) * Math.sin(ot * 7.3));
    if (ot >= T2.out && !this._pff) { this._pff = true; f.track._snd && f.track._snd.play('pff', { x: 0, always: true }); f.fx.dust(this.headMatch.position.x, this.headMatch.position.z, 4, new THREE.Color(0.6, 0.6, 0.65)); }
    // the bear: out of the hollow of her chest, it drops and sits up in the glitter where she stood
    const bk = Math.min(1, (ot - T0) / 0.55);
    const bp = this._bearAt || (this._bearAt = { x: this.boss.x, z: this.boss.z });
    this.bear.visible = true; this.bear.position.set(bp.x, 1.25 * (1 - bk * bk) + (bk >= 1 ? 0 : 0), bp.z); this.bear.rotation.set(bk < 1 ? (1 - bk) * 1.2 : 0, 0.4, 0);
    // a soft warm light on it as it sits up in the glitter (the bed fire's light, free since verse 1), and a pool
    const bl = Math.min(1, Math.max(0, (ot - T0 - 0.4) / 1.2));
    L.bed.position.set(bp.x, 1.5, bp.z + 0.8); L.bed.intensity = 3.2 * bl;
    this.bearPool.mesh.position.set(bp.x, 0.019, bp.z); this.bearPool.set(0.22 * bl);
    this.youre.set('y', ot > T2.youre && ot < T2.youre + 1.6 ? 1 - Math.max(0, ot - T2.youre - 0.9) / 0.7 : 0, 1); this.youre.update(dt, ot);
    // YOU'RE WELCOME: for the last bars the picture leans in on the mat, her head and the bear together, the way the
    // finish leans in on the two of you (YOU keeps control). The camera alone frames YOU and her head, and loses the bear.
    const lean = ramp(ot, T2.youre - 0.7, T2.youre + 0.3), cam = f.cam;
    if (lean > 0 && (!cam.override || cam.override === this._lean)) {
      const hp = H && H.body ? H.body.pos : target;
      const x0 = Math.min(0, hp.x, bp.x), x1 = Math.max(0, hp.x, bp.x), z0 = Math.min(-6.6, hp.z, bp.z), z1 = Math.max(-6.6, hp.z, bp.z);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2 + 0.4, s = Math.min(1.8, Math.max(1, Math.max(x1 - x0, (z1 - z0) * 1.5) / 5.5));
      const ln = this._lean || (this._lean = { pos: new THREE.Vector3(), look: new THREE.Vector3(), k: 0 });
      ln.pos.set(cx + 1.0 * s, 6.0 * s, cz + 7.0 * s); ln.look.set(cx, 0.3, cz); ln.k = 0.7 * ease(lean);
      cam.override = ln;
    }
    // a strike near the face knocks it rolling with a hollow tonk
    const pl = f.player;
    if (H && pl.state === 'strike' && !this._tonk && H.body && Math.hypot(pl.x - H.body.pos.x, pl.z - H.body.pos.z) < 1.8 && ot - T0 > 1.2) { this._tonk = ot + 0.4; const a = Math.atan2(H.body.pos.x - pl.x, H.body.pos.z - pl.z); H.nudge = { x: (H.nudge ? H.nudge.x : 0) + Math.sin(a) * 1.2, z: (H.nudge ? H.nudge.z : 0) + Math.cos(a) * 1.2 }; H.from = H.body.pos.clone(); H.from.y = target.y; H.mv = { t0: ot, dur: 0.5, hop: 0.35, spin: Math.PI * 2, base: H.mv ? H.mv.base + H.mv.spin : 0 }; f.track._snd && f.track._snd.play('tonk', { x: pl.x, always: true }); }
    if (this._tonk && ot > this._tonk) this._tonk = 0;
  }
  // her face, the one shard the shatter keeps whole: turned up toward the camera
  _findFace(fig) {
    try {
      const plans = fig.prepareShatter(); const p = plans.find((q) => q.name === 'body'); if (!p || !p.plan.bodies) return null;
      const A = p.plan.attrs.aBind ? p.plan.attrs.aBind.array : null; if (!A) return null;
      let best = null, bn = 0;
      for (const b of p.plan.bodies) { const fv = p.plan.shardFront[b.local]; if (!fv || fv.length < 20) continue; let y = 0, z = 0; for (const i of fv) { y += A[i * 4 + 1]; z += A[i * 4 + 2]; } y /= fv.length; z /= fv.length; if (y > fig.I.Y.neck && z > fig.I.headC.z && fv.length > bn) { bn = fv.length; best = b; } }
      if (!best) return null;
      const fwd = new THREE.Vector3(Math.sin(this.boss.facing), 0, Math.cos(this.boss.facing));
      const qFace = new THREE.Quaternion().setFromUnitVectors(fwd, new THREE.Vector3(0, 0.82, 0.57).normalize());
      return { body: best, qFace };
    } catch (e) { console.warn('ex: face', e.message); return null; }
  }

  // a burst of fire at (x, z): k scales it (a DAD landing 1.3, a spark 0.5)
  burst(x, z, k = 1) {
    const b = this.bursts.reduce((m, q) => (q.t0 < m.t0 ? q : m), this.bursts[0]);
    b.t0 = this.t; b.k = k; b.g.position.set(x, 0, z); b.g.scale.set(k, k, k);
    this.f.fx.sparks(x, 0.6, z, new THREE.Color(3.2, 0.9, 0.25), Math.round(14 * k));
  }
  // a small lit match from her hand in an arc to a spot, landing at tLand
  flyMatch(boss, to, tLand, sparks) { this._fly(boss, to, tLand, P.smallMatch(), 1.6, true, false, sparks); }
  tossCan(boss, to, tLand) { this._fly(boss, to, tLand, P.gasCan(), 2.4, false, true); }
  _fly(boss, to, tLand, mesh, peak, lit, tumble, sparks) {
    const t0 = this.t, sx = boss.x, sz = boss.z;
    if (lit) { const fl = new Flames(this.scene, mesh); fl.add({ x: 0, z: 0, y: 0.11, w: 0.12, h: 0.22, group: 'm' }); fl.build(); fl.set('m', 1, 1); mesh.userData.fl = fl; }
    mesh.scale.setScalar(lit ? 2.2 : 1); this.root.add(mesh);
    this.flyers.push({ mesh, t0, t1: tLand, sx, sz, tx: to.x, tz: to.z, peak, tumble, sparks });
  }
  _flyers(dt, t) {
    for (let i = this.flyers.length - 1; i >= 0; i--) {
      const q = this.flyers[i], k = (t - q.t0) / Math.max(0.05, q.t1 - q.t0);
      if (k >= 1 || k < 0) { if (k >= 1 && q.sparks && dt > 0) this.f.fx.sparks(q.tx, 0.2, q.tz, new THREE.Color(3.2, 1.2, 0.3), 12); this.root.remove(q.mesh); if (q.mesh.userData.fl) q.mesh.userData.fl.dispose(); q.mesh.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); this.flyers.splice(i, 1); continue; }
      q.mesh.position.set(q.sx + (q.tx - q.sx) * k, 1.5 * (1 - k) + 0.1 + 4 * q.peak * k * (1 - k), q.sz + (q.tz - q.sz) * k);
      q.mesh.rotation.set(q.tumble ? k * 9 : 0.4, k * 6, q.tumble ? k * 5 : 0.3);
      if (q.mesh.userData.fl) q.mesh.userData.fl.update(dt, t);
    }
  }
  // a spot for her to stand that isn't inside the yard on fire (she walks in it freely; YOU can't)
  safeSpot(x, z) {
    const t = this.t;
    if (t > TIME.erupt && t < TIME.embers && inRect(x, z, 0, BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1, 0.6)) {
      const c = [[BLOCK.x0 - 1.1, z], [BLOCK.x1 + 1.1, z], [x, BLOCK.z1 + 1.1]];
      let b = c[0], bd = 1e9; for (const q of c) { const d = Math.hypot(q[0] - x, q[1] - z); if (d < bd) { bd = d; b = q; } }
      return { x: Math.max(-10.2, Math.min(10.2, b[0])), z: Math.max(-6.3, Math.min(6.3, b[1])) };
    }
    return { x: Math.max(-10.2, Math.min(10.2, x)), z: Math.max(-6.3, Math.min(6.3, z)) };
  }
  // her resting loop at a song time (what she goes back to after a rewind)
  idleAt(t) {
    if (t < 2.3) return 'Sitting_Idle_Loop';
    if (t < 11.18) return 'Idle_TalkingPhone_Loop';
    if (t < 22.59) return 'Spell_Simple_Idle_Loop';
    if (t >= TIME.erupt - 0.8 && t < TIME.embers) return 'Dance_Loop';
    return 'Idle_Talking_Loop';
  }
  strikeArc(x, z, ang, range, arc, s, f) {
    for (const b of this.breakables) {
      if (b.broken || !b.active(this.t)) continue;
      const dx = b.x - x, dz = b.z - z, d = Math.hypot(dx, dz);
      if (d > range + b.r) continue;
      const da = Math.atan2(Math.sin(Math.atan2(dx, dz) - ang), Math.cos(Math.atan2(dx, dz) - ang));
      if (Math.abs(da) > arc && d > 0.9) continue;
      this.breakAt(b, f);
    }
  }
  breakAt(b, f) {
    b.broken = true; b.tBroke = this.t;
    f.fx.chips(b.x, 0.8, b.z, b.chips || new THREE.Color(2.2, 2.0, 1.8), 24); f.fx.glitter(b.x, 0.9, b.z, new THREE.Color(3, 2.2, 0.8), 12, 0.7);
    f.player.addMeter && f.player.addMeter(0.02); f._good && f._good(60);
    f.sfx.breakProp && f.sfx.breakProp(f.pan(b.x));
    b.onBreak && b.onBreak(f, b);
  }
  // the baked yard's lighting states on the timeline: [a, b, k] (design §4.6)
  stateAt(t) {
    const R = (a, b) => ramp(t, a, b);
    if (t < 11.178) return ['quiet', 'quiet', 0];
    if (t < 46.457) return ['quiet', 'night', R(11.178, 11.54)];
    if (t < TIME.strike) return ['night', 'quiet', R(46.457, 47.9)];
    if (t < TIME.erupt) return ['quiet', 'fire', 0.08 * R(TIME.strike, TIME.strike + 0.4) + 0.14 * R(TIME.fuse, 57.6)];
    if (t < TIME.embers) return ['quiet', 'fire', 0.3 + 0.12 * R(TIME.erupt, TIME.erupt + 0.12) + 0.06 * Math.max(0, 1 - (t - TIME.erupt) * 2)];
    if (t < TIME.bedroom) return ['quiet', 'fire', 0.42 * (1 - R(TIME.embers, TIME.embers + 1.2))];
    if (t < 117.708) return ['night', 'dusk', R(TIME.bedroom, TIME.bedroom + 0.35)];
    if (t < 124.843) return ['dusk', 'night', R(117.708, 118.0)];
    if (t < 140.879) return ['night', 'quiet', R(124.843, 124.95)];
    if (t < 166.539) return ['quiet', 'day', R(141.58, 142.29)];
    if (t < 177.59) return ['day', 'dusk', R(166.539, 167.4)];
    if (t < 183.649) return ['dusk', 'quiet', R(177.59, 178.3)];
    if (t < 184.37) return ['quiet', 'fire', 0.3 * R(183.649, 183.8)];
    if (t < 195.056) return t < 185.1 ? ['fire', 'rain', 0.7 + 0.3 * R(184.37, 185.1)] : ['rain', 'rain', 0];
    if (t < 197.545) return ['rain', 'quiet', 0.5];
    if (t < 231.75) return ['night', 'fire', 0.06];
    return ['night', 'dawn', R(232.14, 239.28)];
  }
  // the picture's grade by section: saturated fire, daylight held down so white telegraphs keep their edge
  grade(t) {
    const R = (a, b) => ramp(t, a, b);
    const fire = t > TIME.erupt && t < TIME.embers ? 1 : (t > 183.65 && t < 185.0 ? 0.6 : 0);
    const day = R(141.58, 142.29) * (1 - R(166.54, 167.4));
    const holiday = t > 197.55 && t < 231.75 ? 1 : 0;
    const fx = this.f.app.post.fx;
    fx.saturation = 1 + 0.32 * fire + 0.12 * holiday - 0.05 * day;
    fx.contrast = 1 + 0.1 * fire + 0.12 * day;
    this.exposureK = 1 - 0.27 * day - 0.06 * fire;
  }
  light(base, t) {
    this.exposureK = 1;
    this.grade(t);
    if (!base) return;
    const k = this.stateAt(t);
    if (k[0] !== this._st0 || k[1] !== this._st1 || Math.abs(k[2] - (this._stk ?? -1)) > 0.004) { base.setState(k[0], k[1], k[2]); this._st0 = k[0]; this._st1 = k[1]; this._stk = k[2]; }
  }
  finish(f) { this._finishT = this.t; this._finished = true; }

  _buildHeld(boss) { this.heldProps = new Held(this, boss); }

  // ---------------------------------------------------------------- collisions, hazards, blockers
  resolve(x, z, r) {
    const t = this.t;
    for (const c of this.colliders) {
      if (!c.active(t)) continue;
      if (c.type === 'circle') { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m && d > 1e-5) { x = c.x + dx / d * m; z = c.z + dz / d * m; } }
      else {
        const lx = x - c.x, lz = z - c.z, hx = c.hx + r, hz = c.hz + r;
        if (Math.abs(lx) < hx && Math.abs(lz) < hz) { const px = hx - Math.abs(lx), pz = hz - Math.abs(lz); if (px < pz) x = c.x + Math.sign(lx || 1) * hx; else z = c.z + Math.sign(lz || 1) * hz; }
      }
    }
    return { x, z };
  }
  // is (x, z) inside an active hazard (with margin)? returns the hazard
  hazardAt(x, z, r = 0.4, t = this.t) {
    for (const h of this.hazards) {
      if (!h.active(t)) continue;
      if (h.rect && inRect(x, z, r, ...h.rect)) return h;
      if (h.line && this._fuseDist(x, z, t) < 0.25 + r) return h;
      if (h.test && h.test(x, z, r, t)) return h;
    }
    return null;
  }
  _fuseDist(x, z, t) {
    let best = 99;
    for (const s of FUSE) {
      if (t < s.tA) continue;
      const lit = Math.min(1, (t - s.tA) * s.v / s.L);
      const ex = s.ax + (s.bx - s.ax) * lit, ez = s.az + (s.bz - s.az) * lit;
      const vx = ex - s.ax, vz = ez - s.az, L2 = vx * vx + vz * vz;
      const k = L2 > 1e-6 ? clamp01(((x - s.ax) * vx + (z - s.az) * vz) / L2) : 0;
      best = Math.min(best, Math.hypot(x - (s.ax + vx * k), z - (s.az + vz * k)));
    }
    return best;
  }
  // where to put YOU after a hazard bounces you: out of the block / off the bed, to the nearest edge
  _out(h, x, z) {
    let r = h.rect;
    if (h.name === 'ring') r = [BLOCK.x0, BLOCK.z0, BLOCK.x1, BLOCK.z1];
    if (!r) return { x, z };
    const m = 0.75, cands = [[r[0] - m, z], [r[2] + m, z], [x, r[1] - m], [x, r[3] + m]];
    let best = cands[0], bd = 1e9;
    for (const c of cands) { const d = Math.hypot(c[0] - x, c[1] - z); const ok = c[0] > -10.6 && c[0] < 10.6 && c[1] > -6.6 && c[1] < 6.6; if (ok && d < bd) { bd = d; best = c; } }
    return { x: best[0], z: best[1] };
  }
  _hazards(f) {
    const pl = f.player; if (!pl || pl.state === 'dead' || f.state !== 'play') return;
    const h = this.hazardAt(pl.x, pl.z, 0.42 * 0.7);
    if (!h) return;
    if (h.once) { const hx = this.helices.find((q) => !q.hit && Math.abs(pl.x - (-10 + 10 * (f.t - q.t0))) < 1.2); if (!hx) return; if (pl.invulnerable) { if (pl.state === 'dash' && !hx.nm) { hx.nm = true; pl.nearMiss(f._ctx(0)); } return; } hx.hit = true; if (pl.hurt(f._ctx(0), 1, pl.x - 1, pl.z, 'helix')) f._hurt(pl.x, pl.z); return; }
    if (pl.invulnerable) { if (pl.state === 'dash' && h.name === 'ring' && !this._nmT) { this._nmT = f.t + 0.3; pl.nearMiss(f._ctx(0)); } if (this._nmT && f.t > this._nmT) this._nmT = 0; return; }
    const o = this._out(h, pl.x, pl.z);
    const src = { x: pl.x - (o.x - pl.x) * 0.5, z: pl.z - (o.z - pl.z) * 0.5 };
    if (pl.hurt(f._ctx(0), 1, src.x, src.z, 'fire')) {
      f._hurt(pl.x, pl.z);
      pl.x = o.x; pl.z = o.z; pl._sync && pl._sync();
      f.fx.sparks(pl.x, 1.0, pl.z, new THREE.Color(3.2, 1.0, 0.3), 20);
    }
  }
  _blockShots(f) {
    const t = this.t;
    for (const p of f.proj.list) {
      if (p.owner !== 'boss' || p.dead) continue;
      for (const b of this.blockers) {
        if (!b.active(t)) continue;
        if (b.r ? Math.hypot(p.x - b.x, p.z - b.z) < b.r : (p.x > b.x0 && p.x < b.x1 && p.z > b.z0 && p.z < b.z1)) { p.dead = true; f.fx.sparks(p.x, p.y, p.z, new THREE.Color(2.6, 2.2, 2.0), 6); break; }
      }
    }
  }

  // ---------------------------------------------------------------- per frame (and setStateAt: update(0, t))
  update(dt, t) {
    this.t = t;
    const f = this.f, F = this.fire, L = this.lights;
    for (const fn of this.pieces) fn(t, dt);
    // fire levels
    const bedLvl = ramp(t, TIME.bedFire, TIME.bedFire + 0.3) * (1 - ramp(t, TIME.market, TIME.market + 0.35));
    F.set('bed', bedLvl, 1);
    const ringLvl = t >= TIME.fuse && t < TIME.embers + 0.6 ? (t < TIME.erupt ? 1 : 1 - ramp(t, TIME.embers, TIME.embers + 0.6)) : 0;
    F.set('ring', ringLvl, t > TIME.silence && t < TIME.erupt ? 1.15 + 0.1 * Math.sin(t * 9) : 1);
    const en = f.bm ? f.bm.energyAt(t) : 0.8;
    const erupt = t >= TIME.erupt ? Math.exp(-(t - TIME.erupt) * 3) : 0;
    const blk = t >= TIME.erupt && t < TIME.embers ? ramp(t, TIME.erupt, TIME.erupt + 0.12) : t >= TIME.embers ? 0.14 * (1 - ramp(t, TIME.embers + 0.6, TIME.bedroom)) : 0;
    F.set('block', blk, (t < TIME.embers ? 0.85 + 0.3 * en : 0.25) + 0.6 * erupt);
    F.set('blockTall', t < TIME.embers ? blk : 0, 0.9 + 0.35 * en + 0.5 * erupt);
    F.set('fences', t >= TIME.erupt && t < TIME.embers ? ramp(t, TIME.erupt + 0.4, TIME.erupt + 1.6) : 0, 1);
    // the staff's flame
    const staffOn = t >= TIME.drawMatch && t < TIME.embers;
    const H = this.heldProps ? this.heldProps.update(dt, t, this) : null;
    // her cracks glow from inside like a kiln from "I'm the fucking fire" to the end of the chorus
    const fig = this.boss && this.boss.fig;
    if (fig) { const kiln = t > 55.37 && t < TIME.embers ? 1 : 0, wreck = this.boss.state === 'desperate' ? 1 : 0; fig.U.fKintsugi.value = 1 + 4.5 * Math.max(kiln, wreck * 0.8); fig.U.fGold.value.setRGB(1.0, 0.74 - 0.3 * Math.max(kiln, wreck), 0.33 - 0.2 * Math.max(kiln, wreck)); }
    F.update(dt, t);
    // soaks and their dashed outlines; the char after the fire
    this.soaks.forEach((s, i) => { const k = ramp(t, s.t, s.t + 0.45) * (1 - ramp(t, TIME.erupt, TIME.erupt + 0.3)); s.o.set(k, t < TIME.soak[4] + 0.3 ? k : 0); s.o.u.uTime.value = t; s.o.u.uFill.value = ramp(t, TIME.strike, TIME.erupt); });
    const ol = t > TIME.soak[4] && t < TIME.erupt ? 1 : 0;
    this.outline.set(0, ol); this.outline.u.uTime.value = t;
    const pulse = f.bm ? f.bm.pulse(t, 5) : 0;
    for (const c of this.chars) { const k = ramp(t, TIME.erupt, TIME.erupt + 0.8) * (1 - ramp(t, 140.88, 141.3)); c.set(k, t < TIME.embers ? 0.25 : 1 - 0.65 * ramp(t, TIME.embers + 2, TIME.embers + 12)); c.u.uPulse.value = pulse; c.u.uTime.value = t; }
    // lights
    const flick = 0.8 + 0.2 * Math.sin(t * 23) * Math.sin(t * 7.3);
    L.bed.intensity = 4.5 * bedLvl * flick;
    L.fire.intensity = (t >= TIME.erupt && t < TIME.embers ? 90 * (0.8 + 0.25 * en) : 0) * flick + 260 * erupt;
    const boss = f.boss;
    if (boss && H && H.staffLit && !this._finished) { L.match.position.copy(H.staffTip()); L.match.intensity = 9 * flick * (t < TIME.strike + 0.5 ? 2.5 - 3 * (t - TIME.strike) : 1); } else L.match.intensity = 0;
    const fireSection = (t >= TIME.fuse && t < TIME.embers + 1);
    if (boss) { L.rim.position.set(boss.x - 1.2, 2.6, boss.z - 1.4); L.rim.intensity = fireSection ? 22 : 0; }
    const spotK = ramp(t, TIME.bandCut, TIME.bandCut + 0.5) * (1 - ramp(t, TIME.erupt, TIME.erupt + 0.2));
    if (boss) { L.spot.target.position.set(boss.x, 1.0, boss.z); L.spot.intensity = 80 * spotK; this.spotPool.mesh.position.set(boss.x, 0.018, boss.z); this.spotPool.set(0.32 * spotK); }
    this.bookPool.set(0.28 * ramp(t, TIME.drawMatch, TIME.drawMatch + 0.3) * (1 - ramp(t, TIME.erupt, TIME.erupt + 0.3)));
    // a seek (a rewind, a start anywhere): what hadn't happened yet goes away
    if (dt === 0) { this.helices = this.helices.filter((h) => h.t0 <= t); for (const b of this.bursts) if (b.t0 > t) b.t0 = -99; for (const q of this.flyers) q.t1 = -1; if (this.brandT > t) this.brandT = -1; if (t < 131.2) { this.hangSpots.length = 0; this.knocked.length = 0; } }
    this._helices(t);
    if (this.brandT < 0 && t > 165.9 && t < 999) this.brandAt(-3.4, 1.2, 165.83);
    this.brand.visible = this.brandT > 0 && t >= this.brandT && t < 999; if (this.brand.visible) { this.brand.position.set(this.brandPos.x, 0.021, this.brandPos.z); const g = Math.max(0, 1 - (t - this.brandT) / 6); this.brand.material.color.setRGB(1 + g * 2, 1 + g * 0.6, 1); }
    if (dt > 0) this._rings(f, t);
    this._finishUpdate(dt);
    // bursts and flyers
    for (const b of this.bursts) { const a = t - b.t0; b.fl.set('b', a >= 0 && a < 1.2 ? Math.exp(-a * 2.6) : 0, 1 + 0.6 * Math.exp(-a * 6)); b.fl.update(dt, t); if (a < -0.01) b.t0 = -99; }
    this._flyers(dt, t);
    // breakables come back on a rewind to before they broke
    for (const b of this.breakables) if (b.broken && b.tBroke > t + 0.01) { b.broken = false; b.onRestore && b.onRestore(b); }
    for (const b of this.breakables) if (b.mesh) b.mesh.visible = !b.broken && b.active(t);
    // the burning phone: caught, it's a heavy return (1.4x a perfect one)
    for (const p of f.proj.list) if (p.tag === 'phone' && p.owner !== 'boss' && !p._heavy) { p._heavy = true; p.dmgBack = 31; p.size *= 1.1; }
    if (dt > 0) { this._hazards(f); this._blockShots(f); }
  }

  dispose() {
    const fx = this.f.app.post.fx; fx.saturation = 1; fx.contrast = 1;
    if (this._lean && this.f.cam && this.f.cam.override === this._lean) this.f.cam.override = null;
    this.fire.dispose(); if (this.heldProps) this.heldProps.dispose();
    for (const b of this.bursts || []) b.fl.dispose();
    this.scene.remove(this.root);
  }
}
