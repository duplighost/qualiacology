// THE EX: a glazed porcelain pop star in a coral dress and Dad's flannel, platinum lob, gold stilettos.
// The figurine spec (design §3), her custom notch pieces (the flannel is a garment shell, the hair is the hair
// mesh: the kit can't break either, so they break here), and the Director: how she moves between scripted
// attacks (keep-away skids and the shove in the verses, dancing close in the choruses, pouring in the quiets),
// her leaps, skids and struts, and her faces.
import * as THREE from 'three';
import { CharacterKit } from '../../engine/character.js';
import { buildFigurine } from '../../game/figurine.js';
import { Boss } from '../../game/boss.js';

export const SPEC = {
  name: 'THE EX', body: 'female', scale: 1.15, porcelain: 0xf3e7d6,
  skin: { roughness: 0.28, coatRough: 0.035 },
  layers: [
    // the coral lipstick dress, painted on: sweetheart neckline edged in gold leaf, sparse gold sequin dots
    { kind: 'top', from: 'hips', neckline: 'sweetheart', sleeves: null, color: 0xff5a4a, finish: 'gloss',
      pattern: { type: 'polka', color2: 'gold', period: 0.045, duty: 0.1 }, trim: { color: 'gold', width: 0.011, relief: 0.0006 } },
    { kind: 'belt', at: 'waist', width: 0.012, color: 0xe0b04a, finish: 'gold' },
    // Dad's flannel: oversized, worn open, sleeves rolled below the elbow; buffalo check oxblood and cream
    { kind: 'top', from: 'lowhip', neckline: 'plunge', width: 0.13, sleeves: 'elbow', color: 0x5c1a1f, finish: 'satin',
      pattern: { type: 'plaid', color2: 0xefe3cf, period: 0.1, duty: 1 }, trim: { color: 'gold', width: 0.005, relief: 0.0004 },
      shell: { thickness: 0.012, smooth: 9, min: 0.006 } },
    { kind: 'lapels', of: { neckline: 'plunge', width: 0.13, from: 'lowhip', sleeves: 'elbow' }, width: 0.045, to: 'navel',
      color: 0x6e2026, finish: 'satin', pattern: { type: 'plaid', color2: 0xefe3cf, period: 0.1, duty: 1 }, trim: { color: 'gold', width: 0.004, relief: 0.0003 } },
  ],
  hair: { style: 'long', color: 0xf0e4c4, gild: 0.22 },
  face: {
    brows: { shape: 'high', color: '#8a5a3a', thick: 0.8 },
    liner: { color: '#0b0706', thick: 1.25, wing: 1.35 },
    lashes: { n: 10, len: 1.15, lower: 0.35 },
    shadow: { color: '#e8705a', amount: 0.62 },
    lips: { color: '#ff5a4a', shape: 'natural', gloss: 0.6 },
    blush: { color: '#f2a08c', amount: 0.42 },
    marks: [{ at: 'cheek', side: 1, r: 0.0025 }],
  },
  eyes: { iris: 0xb0702a, iris2: 0x5a2e0c },
  accessories: [
    { type: 'skirt', from: 'waist', to: 'midthigh', flare: 1.38, color: 0xff5a4a, finish: 'gloss', trim: { hem: 0.022, waist: 0 } },
    { type: 'shoes', color: 0xffffff, finish: 'gold', toe: 'point', trim: false },
    { type: 'cuffs', at: 'wrist', radius: 0.035, tube: 0.0032 },
  ],
  // notch 1: the flannel, notch 2: the hair (both broken here), notch 3: the match hand
  breaks: ['flannel', 'hair', 'forearm_l'],
};
const FLANNEL_LAYERS = 2;   // the flannel and its collar are the last two layers

let kit = null;
export async function buildEx(f) {
  if (!kit) { kit = new CharacterKit('assets/characters/'); await kit.init(); }
  const fig = await buildFigurine(kit, SPEC);
  f.scene.add(fig.root);
  try { await fig.prepare(f.app.renderer, f.cam.cam, f.scene); } catch (e) { console.warn('ex: prepare', e.message); }
  const b = new Boss({ root: fig.root, rig: fig.rig, figurine: fig }, { name: 'THE EX', hp: 3400, notches: [0.75, 0.5, 0.25], pieces: ['flannel', 'hair', 'forearm_l'], radius: 0.85 });
  b.walkClip = 'Walk_Formal_Loop'; b.runClip = 'Walk_Formal_Loop';     // she never jogs
  b.idle = 'Idle_Talking_Loop'; b.loop('Idle_Talking_Loop');
  b.faceTarget = f.player;
  b.behave = 'hold';
  const dir = new Director(f, b, fig);
  return { boss: b, fig, dir };
}

const ease = { inOut: (k) => k * k * (3 - 2 * k), out: (k) => 1 - (1 - k) * (1 - k), in: (k) => k * k };
const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));

// ---------------------------------------------------------------------------------------------------------
// The Director: everything she does that isn't an attack's own telegraph.
export class Director {
  constructor(f, boss, fig) {
    this.f = f; this.b = boss; this.fig = fig;
    this.mode = 'story';          // story (verse keep-away) | dance (chorus) | pour (quiet) | still (scripted, no reactions)
    this.lockUntil = -1;          // scripted priority: no reactive moves before this song time
    this.jump = null;             // { t0, t1, h, x0, z0, x1, z1 }
    this.exprBase = 'smug';
    this.exprUntil = -1;
    this.close = 0; this.closeSince = -1; this.far = 0; this.farSince = -1;
    this.hitCount = 0;            // hits taken in a quiet (every 4: she skids away)
    this.lastSkid = -9;
    this.shoveCool = -9;
    this.wrecked = false;
    this.props = {};              // things in her hands (set.js fills these: phone, match, staff...)
    // her reactions to being hit
    boss.on('hit', (h) => this._onHit(h));
    boss.on('open', (s) => this._onOpen(s));
  }

  get t() { return this.f.t; }
  get beat() { return this.f.beat || 0.356; }
  lock(t1) { this.lockUntil = Math.max(this.lockUntil, t1); }

  // ---------- faces ----------
  face(name, hold = 0, fade = 0.12) {
    if (!this.fig) return;
    this.fig.setExpression(this._mapFace(name), { fade });
    this.exprUntil = hold > 0 ? this.t + hold : -1;
    if (hold <= 0) this.exprBase = name;
  }
  setBase(name) { this.exprBase = name; if (this.exprUntil < 0 || this.t > this.exprUntil) this.fig.setExpression(this._mapFace(name), { fade: 0.2 }); }
  _mapFace(n) { return ({ smug: 'smug', glee: 'delight', hurt: 'hurt', fury: 'fury', wrecked: 'delight', shock: 'shock', sing: 'sing' })[n] || n; }

  // ---------- moves ----------
  // walk (her strut) to x, z at a speed; returns the arrival time
  strut(x, z, speed = 2.4) {
    const b = this.b, d = Math.hypot(x - b.x, z - b.z);
    const dur = Math.max(0.15, d / speed);
    b.moveTo(x, z, dur, { easing: 'inOut' });
    return this.t + dur;
  }
  // the signature reposition: a figurine pushed across a glazed shelf, fast, a crisp stop, still facing you
  skid(x, z, dur = 0.5, { face = false } = {}) {
    const b = this.b, f = this.f;
    const r = f.arena.resolve ? f.arena.resolve(x, z, b.radius * 0.8) : { x, z };
    b.perform('Slide_Loop', { duration: dur, from: 0.0, to: 1.0, fade: 0.06 });
    b.moveTo(r.x, r.z, dur, { easing: 'out', face });
    this.lastSkid = this.t;
    const sfx = f.track && f.track._snd;
    if (sfx) sfx.play('skid', { x: b.x, z: b.z });
    if (f.fx) { f.fx.glitter(b.x, 0.25, b.z, new THREE.Color(3.0, 2.2, 0.8), 10, 0.6); f.fx.dust(b.x, b.z, 6, new THREE.Color(0.9, 0.85, 0.8)); }
    return this.t + dur;
  }
  // a leap: up, a hang, and down exactly at song time tLand on `target` ({x, z}, may be live: a mark's spot that
  // follows YOU until it locks; she homes on it in the air and lands on the locked spot)
  leap(target, tLand, { h = 3.2, crouch = 0.1 } = {}) {
    const b = this.b, t0 = this.t;
    b.move = null;
    this.jump = { t0: t0 + crouch, t1: tLand, h, x0: b.x, z0: b.z, target, rot: this.wrecked ? Math.PI * 2 : 0 };
    b.perform('NinjaJump_Start', { duration: Math.min(0.3, Math.max(0.12, (tLand - t0) * 0.3)), then: 'NinjaJump_Idle_Loop', fade: 0.05 });
    b.busyUntil = Math.max(b.busyUntil || 0, tLand + 0.05);
    this.lock(tLand + this.beat);
    const sfx = this.f.track && this.f.track._snd;
    if (sfx) sfx.play('leap', { x: b.x });
    this.f.at(tLand, () => { b.perform('NinjaJump_Land', { duration: 0.42, fade: 0.04 }); });
  }

  // ---------- per frame ----------
  update(dt) {
    const f = this.f, b = this.b, t = this.t, pl = f.player;
    // the jump arc (the boss tween moves x, z; we lift her)
    if (this.jump) {
      const J = this.jump, k = THREE.MathUtils.clamp((t - J.t0) / Math.max(0.01, J.t1 - J.t0), 0, 1), e = ease.inOut(k);
      if (t >= J.t0) { b.x = J.x0 + (J.target.x - J.x0) * e; b.z = J.z0 + (J.target.z - J.z0) * e; }
      b.move = null; b._sync();
      b.root.position.y = t < J.t0 ? 0 : 4 * J.h * k * (1 - k);
      if (J.rot) b.root.rotation.y = b.facing + J.rot * ease.inOut(k);
      if (t >= J.t1) { b.x = J.target.x; b.z = J.target.z; b._sync(); b.root.position.y = 0; this.jump = null; }
    } else if (this._seated) b.root.position.y = this.seatY || 0;
    else if (b.root.position.y !== 0) b.root.position.y = 0;
    // faces revert after a held reaction
    if (this.exprUntil > 0 && t > this.exprUntil) { this.exprUntil = -1; this.fig.setExpression(this._mapFace(this.exprBase), { fade: 0.18 }); }
    if (f.state !== 'play' || !pl || b.state === 'finished') return;
    // wrecked: between her moves she flings lit matches anywhere (cosmetic: sparks, no harm)
    if (this.wrecked && t > (this._flingT || 0) && this.f.track.set) {
      this._flingT = t + 1.1 + Math.random() * 0.9;
      const a = Math.random() * Math.PI * 2, r = 2 + Math.random() * 4;
      this.f.track.set.flyMatch(b, { x: THREE.MathUtils.clamp(b.x + Math.sin(a) * r, -10, 10), z: THREE.MathUtils.clamp(b.z + Math.cos(a) * r, -6.5, 6.5) }, t + 0.55, true);
    }
    // reactions only when nothing is scripted
    const free = t > this.lockUntil && !this.jump && b.state !== 'stagger' && b.state !== 'open' && !this._seated;
    if (this.mode === 'pour' && this._pourSkid && !this.jump && !this._seated && t - this.lastSkid > 0.8) { this._pourSkid = false; const pl2 = f.player; let ax = b.x - pl2.x, az = b.z - pl2.z; const l = Math.hypot(ax, az) || 1; const s2 = this.safeSpot ? this.safeSpot(b.x + ax / l * 3.2, b.z + az / l * 3.2) : { x: b.x + ax / l * 3.2, z: b.z + az / l * 3.2 }; this.skid(s2.x, s2.z, 0.42); }
    const d = Math.hypot(pl.x - b.x, pl.z - b.z);
    if (d < 3) { if (this.closeSince < 0) this.closeSince = t; } else this.closeSince = -1;
    if (d > 10) { if (this.farSince < 0) this.farSince = t; } else this.farSince = -1;
    if (!free) return;
    if (this.mode === 'story') this._story(d);
    else if (this.mode === 'dance') this._dance(d);
    else if (this.mode === 'pour') { /* her path is scripted; the 4-hit skid is in _onHit */ }
  }

  // the storyteller: 5-8 m away, talking; skids away when you crowd her (or land three on her); shoves when cornered
  _story(d) {
    const f = this.f, b = this.b, pl = f.player, t = this.t;
    const bnd = f.bounds;
    const crowded = (this.closeSince > 0 && t - this.closeSince > this.beat * 0.75) || this.recentHits >= 3;
    if (crowded && t - this.lastSkid > 0.9) {
      const nb = f.bm.nearest(t, 1); const bNext = nb.time > t + 0.02 ? nb.beat : nb.beat + 1, tNext = f.bm.timeOf(bNext);
      const cornered = Math.min(b.x - bnd.minX, bnd.maxX - b.x, b.z - bnd.minZ, bnd.maxZ - b.z) < 2.0;
      this.closeSince = -1; this.recentHits = 0;
      if (cornered && t > this.shoveCool) { this.shoveCool = t + 3; this.lock(tNext + this.beat * 1.6); f.at(tNext, () => this._shove(f.bm.timeOf(bNext + 1))); return; }
      // away from you, toward the open middle of the yard: try a fan of directions, take the roomiest
      let ax = b.x - pl.x, az = b.z - pl.z; const l = Math.hypot(ax, az) || 1; ax /= l; az /= l;
      let best = null, bs = -1e9;
      for (let k = -3; k <= 3; k++) {
        const a = Math.atan2(ax, az) + k * 0.42, dist = 5.5;
        let tx = b.x + Math.sin(a) * dist, tz = b.z + Math.cos(a) * dist;
        tx = THREE.MathUtils.clamp(tx, bnd.minX + 1.4, bnd.maxX - 1.4); tz = THREE.MathUtils.clamp(tz, bnd.minZ + 1.2, bnd.maxZ - 1.2);
        const s2 = this.safeSpot ? this.safeSpot(tx, tz) : { x: tx, z: tz };
        const score = Math.hypot(s2.x - pl.x, s2.z - pl.z) - Math.abs(k) * 0.3 - (Math.abs(s2.x - tx) + Math.abs(s2.z - tz)) * 2;
        if (score > bs) { bs = score; best = s2; }
      }
      this.lock(tNext + 0.55);
      f.at(tNext, () => { if (this.jump || this.t < this.lockUntil - 0.6) return; this.skid(best.x, best.z, 0.5); });
      return;
    }
    if (this.farSince > 0 && t - this.farSince > this.beat * 8) {
      this.farSince = -1;
      let ax = pl.x - b.x, az = pl.z - b.z; const l = Math.hypot(ax, az) || 1;
      const end = this.strut(b.x + ax / l * (l - 6), b.z + az / l * (l - 6), 2.6);
      this.lock(end);
    }
  }
  // the cornered shove: a one-beat wind-up from the beat it's cued on, landing exactly on the next (t1)
  _shove(t1) {
    const f = this.f, b = this.b;
    if (f.suppress) return;
    b.faceNow(f.player.x, f.player.z);
    const beats = Math.max(0.5, ((t1 ?? f.t + f.beat) - f.t) / f.beat);
    b.perform('Punch_Cross', { duration: this.beat * 1.15, from: 0.0, to: 0.7 });
    f.pat.sweep(f, { beats, r: 2.2, arc: 60, kind: 'pink', onImpact: (hit) => { if (hit === 'hit') { const pl = f.player; const a = Math.atan2(pl.x - b.x, pl.z - b.z); pl.vx = Math.sin(a) * 14; pl.vz = Math.cos(a) * 14; this.face('glee', 0.7); } } });
  }
  // the performer: comes to you, dances at 3-4 m
  _dance(d) {
    const f = this.f, b = this.b, pl = f.player;
    if (d > 4.6 || d < 2.4) {
      let ax = b.x - pl.x, az = b.z - pl.z; const l = Math.hypot(ax, az) || 1;
      const want = 3.4;
      let tx = pl.x + ax / l * want, tz = pl.z + az / l * want;
      const safe = this.safeSpot ? this.safeSpot(tx, tz) : { x: tx, z: tz };
      const end = this.strut(safe.x, safe.z, 3.0);
      this.lock(Math.min(end, this.t + 1.2));
    }
  }

  // ---------- being hit ----------
  _onHit(h) {
    const t = this.t;
    this.recentHits = (this.t - (this._lastHitT ?? -9) < 1.4 ? (this.recentHits || 0) : 0) + 1; this._lastHitT = this.t;
    if (this.mode === 'pour') {
      this.hitCount++;
      if (this.hitCount % 4 === 0 && t > this.lockUntil - 99) this._pourSkid = true;
    }
    if (h.desperate) return;
    if (h.heavy) {
      if (!this.b.busy && !this.jump && !this._seated) this.b.perform(Math.random() < 0.5 ? 'Hit_Chest' : 'Hit_Head', { duration: 0.42, fade: 0.05 });
      this.face('glee', 0.6);
    } else if (this.exprUntil < 0 || this.exprBase !== 'hurt') this.face('fury', this.beat * 0.5, 0.05);
  }
  _onOpen(sec) {
    if (this._seated || this.jump) return;
    this.b.perform('Idle_Shield_Break', { duration: Math.max(0.6, sec), fade: 0.05 });
    this.face('shock', sec * 0.5, 0.05);
    this.f.after(sec * 0.5, () => this.face('glee', sec * 0.5));
  }
}

// ---------------------------------------------------------------------------------------------------------
// Her notch pieces the kit can't break: the flannel (a garment shell over the body's painted layers) and the
// hair (its own skinned mesh). Each bursts into its glazed shards; restore() puts them back for a rewind.
export class Pieces {
  constructor(fig) {
    this.fig = fig;
    this.bodyLayN = fig.body.material.userData.figUniforms.fLayN;
    this.layN = this.bodyLayN.value;
    this.flannel = fig.shells[fig.shells.length - 1] || null;    // the flannel is the only shell
    this.hair = fig.hairMeshes.slice();
    this.broken = { flannel: false, hair: false };
  }
  _plan(mesh) { const plans = this.fig.prepareShatter(); return plans.find((p) => p.mesh === mesh); }
  _burst(mesh, power = 0.8) {
    const fig = this.fig, p = this._plan(mesh);
    fig.root.updateWorldMatrix(true, true);
    if (p && p.plan) {
      const { P, N } = fig._pose(p.mesh, p.geo || p.mesh.geometry);
      fig.shards.fire(p.plan, P, N, { center: fig._center(), power });
    }
  }
  breakFlannel() {
    if (this.broken.flannel || !this.flannel) return;
    this.broken.flannel = true;
    this._burst(this.flannel, 0.75);
    this.flannel.visible = false;
    this.bodyLayN.value = this.layN - FLANNEL_LAYERS;
    const c = this.fig._center();
    this.fig.chips.burst(c, new THREE.Vector3(0, -1, 0), new THREE.Color(0x5c1a1f), 26, 3.4, this.fig.scale);
  }
  breakHair() {
    if (this.broken.hair) return;
    this.broken.hair = true;
    for (const h of this.hair) { this._burst(h, 0.55); h.visible = false; }
    const hd = this.fig.bones.Head ? this.fig.bones.Head.getWorldPosition(new THREE.Vector3()) : this.fig._center();
    this.fig.glitter.burst(hd, 160, [new THREE.Color(1, 0.92, 0.7), new THREE.Color(1, 0.8, 0.4)], 0.5, 1.6);
  }
  // a rewind to n notches broken
  restore(n) {
    const fig = this.fig;
    const wantF = n >= 1, wantH = n >= 2;
    if (this.broken.flannel && !wantF) { const p = this._plan(this.flannel); if (p) fig.shards.reset(p.plan); this.flannel.visible = true; this.bodyLayN.value = this.layN; this.broken.flannel = false; }
    if (!this.broken.flannel && wantF) { this.flannel.visible = false; this.bodyLayN.value = this.layN - FLANNEL_LAYERS; this.broken.flannel = true; }
    if (this.broken.hair && !wantH) { for (const h of this.hair) { const p = this._plan(h); if (p) fig.shards.reset(p.plan); h.visible = true; } this.broken.hair = false; }
    if (!this.broken.hair && wantH) { for (const h of this.hair) h.visible = false; this.broken.hair = true; }
  }
}
