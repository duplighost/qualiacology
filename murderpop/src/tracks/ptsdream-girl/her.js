// PTSDREAM GIRL's moves. Every one is called with absolute song times (from the design, on its beats), draws its
// shape on the floor first, and lands on the beat it names. Her rule: COUNT TO FOUR. Her big moves tick four
// times and land on the next beat; her perfume grenade is pink: catch it on four and it goes off on her.
import * as THREE from 'three';
import { FEEL } from '../../game/player.js';
import { inShape } from '../../game/choreo.js';
import { grenadeGeometry } from './girl.js';

const TAU = Math.PI * 2;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const ease = (k) => k * k * (3 - 2 * k);
const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const PINKC = new THREE.Color(3.6, 0.5, 1.5), GOLDC = new THREE.Color(3.4, 2.1, 0.6), WHITEC = new THREE.Color(2.4, 2.7, 3.2), REDC = new THREE.Color(3.2, 0.2, 0.3);

// ---------------------------------------------------------------- shared look bits
let GRENADE = null;
export function grenadeModel(H = 0.5) {
  if (!GRENADE) {
    const g = grenadeGeometry(1);
    GRENADE = {
      body: g.body, gold: g.gold,
      ruby: new THREE.MeshPhysicalMaterial({ color: 0x9a0016, roughness: 0.08, metalness: 0.0, clearcoat: 1, clearcoatRoughness: 0.03, emissive: new THREE.Color(0.35, 0.0, 0.03), sheen: 0.4, sheenColor: new THREE.Color(1, 0.3, 0.4) }),
      goldM: new THREE.MeshPhysicalMaterial({ color: 0xe9b949, metalness: 1, roughness: 0.22 }),
      gilt: new THREE.MeshPhysicalMaterial({ color: 0xffd27a, metalness: 1, roughness: 0.2, emissive: new THREE.Color(0.8, 0.5, 0.1) }),
      light: new THREE.SphereGeometry(0.035, 10, 8),
      glow: new THREE.SpriteMaterial({ map: glowTex(), color: new THREE.Color(1, 0.3, 0.5), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }),
    };
  }
  const G = GRENADE;
  const root = new THREE.Group();
  const body = new THREE.Group(); root.add(body);
  const bm = new THREE.Mesh(G.body, G.ruby); bm.castShadow = true; body.add(bm);
  for (const [geo] of G.gold) { const m = new THREE.Mesh(geo, G.goldM); m.castShadow = true; body.add(m); }
  // four count lights in a row down the cap side
  const lights = [];
  for (let i = 0; i < 4; i++) {
    const m = new THREE.Mesh(G.light, new THREE.MeshBasicMaterial({ color: new THREE.Color(0.25, 0.05, 0.08) }));
    m.position.set(0.0, 0.7 - i * 0.12, 0.3); body.add(m); lights.push(m);
  }
  const glow = new THREE.Sprite(G.glow.clone()); glow.scale.setScalar(1.3); glow.position.y = 0.45; glow.material.opacity = 0.55; body.add(glow);
  body.scale.setScalar(H);
  return { root, body, lights, glow };
}
let _glowTex = null;
function glowTex() {
  if (_glowTex) return _glowTex;
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  _glowTex = new THREE.CanvasTexture(c); return _glowTex;
}
// her reflection: a red figure lying in the gloss (the tell before she rises out of the floor)
let _reflTex = null;
function reflTex() {
  if (_reflTex) return _reflTex;
  const W = 128, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  // drawn upright, head at the top; laid on the floor head-toward-camera it reads as her reflection
  g.translate(W / 2, 0);
  const fig = () => {
    g.beginPath();
    g.ellipse(0, 30, 14, 17, 0, 0, TAU);                    // head
    g.moveTo(-16, 22); g.quadraticCurveTo(-30, 70, -22, 118); g.lineTo(22, 118); g.quadraticCurveTo(30, 70, 16, 22); // hair
    g.moveTo(-22, 52); g.lineTo(22, 52); g.lineTo(16, 104); g.lineTo(-16, 104);   // torso
    g.moveTo(-14, 100); g.lineTo(14, 100); g.lineTo(46, 166); g.lineTo(-46, 166); // skirt
    g.moveTo(-14, 160); g.lineTo(-4, 160); g.lineTo(-7, 246); g.lineTo(-13, 246); // legs
    g.moveTo(4, 160); g.lineTo(14, 160); g.lineTo(13, 246); g.lineTo(7, 246);
    g.moveTo(-22, 54); g.lineTo(-40, 112); g.lineTo(-34, 114); g.lineTo(-17, 64); // arms
    g.moveTo(22, 54); g.lineTo(40, 112); g.lineTo(34, 114); g.lineTo(17, 64);
    g.fill();
  };
  g.filter = 'blur(6px)'; g.fillStyle = 'rgba(255,40,70,0.9)'; fig();
  g.filter = 'blur(1.5px)'; g.fillStyle = 'rgba(255,120,140,0.85)'; fig();
  _reflTex = new THREE.CanvasTexture(c); _reflTex.colorSpace = THREE.SRGBColorSpace;
  return _reflTex;
}
let _vhsTex = null;
function vhsTex() {
  if (_vhsTex) return _vhsTex;
  const c = document.createElement('canvas'); c.width = 64; c.height = 128; const g = c.getContext('2d');
  for (let y = 0; y < 128; y += 3) { const a = 0.3 + Math.random() * 0.7; g.fillStyle = `rgba(${200 + Math.random() * 55},${80 + Math.random() * 100},${150 + Math.random() * 100},${a})`; const o = (Math.random() - 0.5) * 30; g.fillRect(8 + o, y, 48 + Math.random() * 10, 2); }
  _vhsTex = new THREE.CanvasTexture(c); _vhsTex.colorSpace = THREE.SRGBColorSpace; return _vhsTex;
}

// ---------------------------------------------------------------- the moves
export class Her {
  constructor(f, tr) {
    this.f = f; this.tr = tr;
    this.grenades = [];         // live bottles
    this.decals = [];           // reflections, tears, burst clouds (cleared on a rewind)
    this.knivesStuck = [];
    this.watch = 0;             // > song time while she's watching a count land (no flickers, no slaps)
    this.slapOn = false; this._beatIdx = -1; this._slapBar = -99;
    this.solidUntil = 0;
    this.extraUpdate = [];      // per-frame jobs: {update(dt, t) -> keep?}
    this.hp = 0;
    this.group = new THREE.Group(); f.scene.add(this.group);
  }
  get boss() { return this.f.boss; }
  get snd() { return this.tr.snd; }
  get set() { return this.tr.set; }
  beatAt(t) { return this.f.bm.periodAt(t); }
  // the song time n beats after t (follows the drums)
  plus(t, n) { const bm = this.f.bm; return bm.timeOf(bm.beatAt(t) + n); }
  dmg(k) { return this.boss.maxHp * k; }

  // ---------- her body ----------
  // play clip so its contact point (0..1 of the window) lands on song time impactT
  act(clip, impactT, { contact = 0.5, dur, from = 0, to = 1, then = 'idle' } = {}) {
    const f = this.f, b = this.boss;
    const c = b.rig && b.rig.kit.clips[clip];
    const d = dur ?? (c ? c.duration * (to - from) : 0.6);
    const start = impactT - contact * d;
    const go = () => {
      if (!b.rig || b.state === 'stagger' || b.state === 'finished') return;
      const late = f.t - start;
      if (late > 0.02) { const k = clamp(late / d, 0, 0.85); b.perform(clip, { from: from + (to - from) * k, to, duration: Math.max(0.08, d - late), then }); }
      else b.perform(clip, { from, to, duration: d, then });
    };
    if (start <= f.t + 0.005) go(); else f.at(start, go);
  }
  expr(name, at, hold) {
    const fig = this.boss.fig; if (!fig) return;
    const f = this.f;
    const set = () => { if (!this.tr.wrecked) fig.setExpression(name, { fade: 0.12 }); };
    if (at === undefined || at <= f.t) set(); else f.at(at, set);
    if (hold) f.at((at ?? f.t) + hold, () => { if (!this.tr.wrecked) fig.setExpression(this.tr.baseExpr || 'smug', { fade: 0.3 }); });
  }
  place(x, z, face) { const b = this.boss; b.place(x, z, face ?? toward({ x, z }, this.f.player)); }
  // a spot she can stand on: the nearest open floor to (x, z), clear of whatever's down (a flicker never puts her
  // inside the island, the bed, a door post)
  floor(x, z) { return this.tr.safeSpot ? this.tr.safeSpot(x, z, this.boss.radius * 0.8 + 0.04) : { x, z }; }
  hide(on) {
    const b = this.boss;
    if (b.scene && on) return;            // her death scene has her: she doesn't vanish out of it
    b.intangible = on; b.root.visible = !on;
    if (b.fig && b.fig.world) b.fig.world.visible = true;
  }
  // her death scene begins: whatever she was in the middle of ends where it is (a leap comes down, a flicker comes
  // back), and she is there to be seen
  standDown() {
    const b = this.boss;
    for (const j of this.extraUpdate) j.cancel && j.cancel();
    this.extraUpdate.length = 0;
    for (const g of this.grenades) { for (const h of g.tickH || []) this.snd.stop(h); this._dispose(g); g.state = 'gone'; }
    this.grenades.length = 0;
    this.slapOn = false; this.watch = 0;
    b.intangible = false; b.root.visible = true; b.lockFacing = false;
    b.root.position.y = 0;
    this.tr.extra && this.tr.extra.hideAllHeld();
  }

  // ---------- GRENADE ----------
  // pin (the and-of-4: the ring flicks off), land (the count's beat 1: it lands where you were going), four ticks,
  // the sting on the next beat 1. Catch it (RMB within 1.6 m) any time in the count; on four it's perfect.
  // o: { pin, land, sting, at: {x,z} | null (YOU), from: {x,z} | null (her hand), thing, onSting(g, caught), lead (0.4) }
  grenade(o) {
    const f = this.f, pl = f.player, bm = f.bm;
    if (f.suppress) return null;          // her spotlight: she throws nothing
    const land = o.land, iL = bm.beatAt(land);
    const ticks = [0, 1, 2, 3].map((i) => bm.timeOf(iL + i));
    const sting = o.sting ?? bm.timeOf(iL + 4);
    let at = o.at;
    if (!at) { const lead = o.lead ?? 0.4; at = { x: pl.x + pl.vx * lead, z: pl.z + pl.vz * lead }; }
    if (!o.exact) at = this.tr.safeSpot ? this.tr.safeSpot(at.x, at.z, 1.2) : { x: clamp(at.x, -10.2, 10.2), z: clamp(at.z, -6.2, 6.2) };
    const src = o.from ? { x: o.from.x, z: o.from.z, y: o.fromY ?? 1.6 } : this._hand();
    const g = { ...o, land, ticks, t4: ticks[3], sting, x: at.x, z: at.z, state: 'fly', src, caught: null, model: grenadeModel(o.size ?? 0.5), rim: [], t0f: f.t };
    g.model.root.position.set(src.x, src.y, src.z);
    this.group.add(g.model.root);
    this.grenades.push(g);
    this.watch = Math.max(this.watch, sting);
    // the pin: a gold tink as the ring flicks off
    this.snd.play('pin', { x: src.x });
    f.fx.sparks(src.x, src.y + 0.2, src.z, GOLDC, 6);
    if (!o.from && !o.noThrow) this.act('OverhandThrow', Math.min(land - 0.05, f.t + 0.22), { contact: 0.55, dur: 0.5 });
    // a faint mark where it'll land
    g.mark = f.tele.add({ shape: 'circle', x: g.x, z: g.z, w: 0.45, kind: 'pink', start: f.t, end: land });
    // the count: a pink circle that fills to the sting, ticks on the rim
    f.at(land, () => this._land(g));
    for (let i = 0; i < 4; i++) f.at(ticks[i], () => this._tick(g, i));
    f.at(sting, () => this._sting(g));
    // schedule the ticks' sounds exactly on the beats (called off if the bottle fizzles)
    // (her count is the rule: these four sit a little higher than her other ticks)
    g.tickH = ticks.map((tk, i) => this.snd.play('tik', { x: g.x, rate: this.snd.tickRate(tk, i), when: tk, gain: 1.35 }));
    return g;
  }
  _hand() {
    const b = this.boss, bone = b.fig && b.fig.bones.hand_r;
    if (bone) { const p = bone.getWorldPosition(new THREE.Vector3()); return { x: p.x, y: p.y, z: p.z }; }
    return { x: b.x, y: 1.6, z: b.z };
  }
  _land(g) {
    if (g.state !== 'fly') return;
    const f = this.f;
    g.state = 'count';
    g.model.root.position.set(g.x, 0, g.z);
    this.snd.play('clonk', { x: g.x });
    f.fx.dust(g.x, g.z, 5, new THREE.Color(1.2, 0.4, 0.6));
    g.tele = f.tele.add({ shape: 'circle', x: g.x, z: g.z, w: 2.8, kind: 'pink', start: g.land, end: g.sting });
    // rim lights: four small discs that come on one a beat
    for (let i = 0; i < 4; i++) {
      const a = -Math.PI / 2 + i * Math.PI / 2 + Math.PI / 4;
      const d = new THREE.Mesh(new THREE.CircleGeometry(0.2, 18), new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 0.06, 0.15), transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
      d.rotation.x = -Math.PI / 2; d.position.set(g.x + Math.sin(a) * 2.8, 0.04, g.z + Math.cos(a) * 2.8); d.renderOrder = 3;
      this.group.add(d); g.rim.push(d);
    }
  }
  _tick(g, i) {
    if (g.state !== 'count') return;
    const L = g.model.lights[i]; if (L) L.material.color.setRGB(4, 0.7, 1.8);
    const d = g.rim[i]; if (d) d.material.color.setRGB(3.2, 0.5, 1.4);
    g.rock = 1;
    if (i === 3) g.model.glow.material.opacity = 1;
  }
  // tap RMB near a counting bottle: caught (polled every frame)
  _tryCatch(g) {
    const f = this.f, pl = f.player;
    if (g.state !== 'count' || !pl.catching || f.t > g.sting - 0.05) return false;
    if (Math.hypot(pl.x - g.x, pl.z - g.z) > 1.6) return false;
    const pressT = f.t - pl.catchT;
    const q = Math.abs(pressT - g.t4) <= FEEL.catchPerfect ? 'perfect' : 'good';
    this._caught(g, q, g.sting);
    return true;
  }
  _caught(g, q, arrive) {
    const f = this.f, pl = f.player;
    pl.caught(q, f._ctx(0));
    f.fx.caught(g.x, 0.6, g.z, q === 'perfect');
    f.sfx.catch && f.sfx.catch(q, f.pan(g.x));
    f._glimmer(q === 'perfect' ? 2 : 1, true);
    f._good(q === 'perfect' ? 160 : 100);
    g.state = 'back'; g.caught = q;
    if (g.tele) g.tele.dead = true;
    for (const d of g.rim) d.material.color.setRGB(3.0, 1.9, 0.5);
    for (const L of g.model.lights) L.material.color.setRGB(3.0, 1.9, 0.5);
    g.model.glow.material.color.setRGB(1, 0.75, 0.3);
    g.from = { x: g.x, y: 0.9, z: g.z };
    g.t0 = f.t; g.t0c = f.t; g.arrive = Math.max(f.t + 0.3, arrive);
    this.snd.play('whoosh', { x: g.x, rate: 1.3 });
    this.expr('fury', f.t, 0.9);
    this.tr.onGrenadeCaught && this.tr.onGrenadeCaught(g, q);
  }
  _sting(g) {
    const f = this.f, pl = f.player;
    if (g.state === 'back' || g.state === 'gone') return;
    if (g.state === 'fly') this._land(g);
    if (g.tele) g.tele.dead = true;
    if (f.suppress) { this._fizzle(g); return; }
    // inside the burst at the sting: a late catch, a dash through it, or a heart
    const d = Math.hypot(pl.x - g.x, pl.z - g.z);
    let hit = 'miss';
    if (d <= 2.8 + FEEL.radius * 0.8) {
      if (pl.catching) { this._caught(g, 'good', f.t + 0.32); return; }
      if (pl.invulnerable) { if (pl.state === 'dash') { pl.nearMiss(f._ctx(0)); f._good(70); } hit = 'dodged'; }
      else if (pl.hurt(f._ctx(0), o2d(g.damage, 1), g.x, g.z, 'area')) { f._hurt(g.x, g.z); hit = 'hit'; this.expr('delight', f.t, 1.0); }
    }
    this._burst(g, hit);
    // her own perfume, if she's standing in it
    const b = this.boss;
    if (b.targetable && Math.hypot(b.x - g.x, b.z - g.z) < 2.8 + b.radius * 0.5) { b.takeHit({ dmg: this.dmg(0.02), kind: 'return', heavy: false, x: g.x, z: g.z, onBeat: true }); this.expr('fury', f.t, 0.8); }
    g.onSting && g.onSting(g, hit);
  }
  _fizzle(g) {
    const p = g.model.root.position;
    g.state = 'gone'; this._dispose(g); this.f.fx.glitter(p.x, Math.max(0.5, p.y), p.z, PINKC, 20, 1);
    for (const h of g.tickH || []) this.snd.stop(h);
  }
  _burst(g, hit) {
    const f = this.f;
    g.state = 'gone';
    this.snd.play('sting', { x: g.x });
    f.fx.glitter(g.x, 0.8, g.z, PINKC, 46, 2.4);
    f.fx.sparks(g.x, 0.5, g.z, new THREE.Color(3.5, 1.2, 1.6), 22);
    f.fx.flash(new THREE.Color(0.3, 0.06, 0.12), 0.7);
    this.cloud(g.x, g.z, 2.8, new THREE.Color(0.55, 0.12, 0.25));
    this._dispose(g);
  }
  _dispose(g) {
    this.group.remove(g.model.root);
    for (const d of g.rim) { this.group.remove(d); d.geometry.dispose(); d.material.dispose(); }
    g.rim.length = 0;
    if (g.tele) g.tele.dead = true; if (g.mark) g.mark.dead = true;
  }
  // a perfume cloud: a soft pink disc that swells and fades
  cloud(x, z, r, color, life = 0.9) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ map: glowTex(), color, transparent: true, opacity: 0.9, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.3, z); m.renderOrder = 6; this.group.add(m);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color, transparent: true, opacity: 0.6, depthWrite: false, blending: THREE.AdditiveBlending }));
    s.position.set(x, 1.0, z); this.group.add(s);
    this.decal({ life, update: (k) => { const e = 1 - Math.pow(1 - k, 3); m.scale.setScalar(r * (0.55 + 0.5 * e)); m.material.opacity = 0.5 * (1 - k) * (1 - k); s.scale.setScalar(r * (0.7 + 0.4 * e)); s.material.opacity = 0.3 * (1 - k) * (1 - k); }, dispose: () => { this.group.remove(m, s); m.geometry.dispose(); m.material.dispose(); s.material.dispose(); } });
  }
  decal(d) { d.t = 0; this.decals.push(d); return d; }

  _updateGrenades(dt) {
    const f = this.f;
    for (let i = this.grenades.length - 1; i >= 0; i--) {
      const g = this.grenades[i];
      if (g.state === 'gone') { this.grenades.splice(i, 1); continue; }
      const r = g.model.root, body = g.model.body;
      // nothing of hers lands that you can't see: a bottle whose mark or count circle was cleared (the spotlight, or
      // thrown while it shines) goes to glitter where it is
      if ((g.state === 'fly' && g.mark && g.mark.dead) || (g.state === 'count' && g.tele && g.tele.dead)) { this._fizzle(g); continue; }
      if (g.state === 'fly') {
        const dur = Math.max(0.12, g.land - g.t0f), kk = clamp((f.t - g.t0f) / dur, 0, 1);
        const dist = Math.hypot(g.x - g.src.x, g.z - g.src.z), peak = Math.min(1.2 + dur * 2, 0.45 + dist * 0.45);
        r.position.set(g.src.x + (g.x - g.src.x) * kk, g.src.y * (1 - kk) + Math.sin(Math.PI * kk) * peak, g.src.z + (g.z - g.src.z) * kk);
        // thrown it tumbles; lifted off its dish it rocks on the beats
        if (dist > 0.3) body.rotation.z = kk * 5; else body.rotation.set(Math.sin(f.bm.beatAt(f.t) * Math.PI) * 0.25, body.rotation.y + dt, 0);
      } else if (g.state === 'count') {
        this._tryCatch(g);
        g.rock = (g.rock || 0) * Math.exp(-dt * 7);
        body.rotation.set(Math.sin(f.t * 20) * 0.18 * g.rock, body.rotation.y + dt * 0.6, Math.cos(f.t * 17) * 0.14 * g.rock);
        r.position.y = 0.04 * g.rock;
        g.model.glow.material.opacity = 0.45 + 0.5 * Math.max(0, 1 - (g.sting - f.t) / 1.7) * (0.6 + 0.4 * Math.sin(f.t * 30));
      } else if (g.state === 'back') {
        // YOU flicks it back in a high lob, gold, onto her (wherever she is) exactly on the sting
        const b = this.boss;
        // she's in transit: it waits in the air, then goes the rest of the way when she's back
        if (!b.targetable && !g.onBack && f.t < g.arrive + 2.5) {
          if (!g.waiting) { g.waiting = true; g.hold = r.position.clone(); }
          r.position.set(g.hold.x, g.hold.y + Math.sin(f.t * 6) * 0.08, g.hold.z); body.rotation.z += dt * 6;
          continue;
        }
        if (g.waiting) { g.waiting = false; g.from = { x: r.position.x, y: r.position.y, z: r.position.z }; g.t0 = f.t; g.arrive = f.t + 0.3; }
        const dur = Math.max(0.05, g.arrive - g.t0), k = clamp((f.t - g.t0) / dur, 0, 1);
        const tx = b.x, tz = b.z;
        r.position.set(g.from.x + (tx - g.from.x) * k, g.from.y + (1.4 - g.from.y) * k + Math.sin(Math.PI * k) * Math.min(3, 0.6 + dur * 1.6), g.from.z + (tz - g.from.z) * k);
        body.rotation.z += dt * 12;
        if (g.rim.length && f.t > g.t0c + 0.3) { for (const d of g.rim) { this.group.remove(d); d.geometry.dispose(); d.material.dispose(); } g.rim.length = 0; }
        if (k >= 1) this._backHit(g);
      }
    }
  }
  _backHit(g) {
    const f = this.f, b = this.boss;
    g.state = 'gone';
    const x = b.x, z = b.z;
    if (b.targetable) {
      const dm = this.dmg(g.caught === 'perfect' ? 0.035 : 0.025);
      b.takeHit({ dmg: dm, kind: 'return', heavy: true, x, z, onBeat: g.caught === 'perfect' });
      b.fig && b.fig.hitAt && b.fig.hitAt(new THREE.Vector3(x, 1.5, z), new THREE.Vector3(0, 0, -1), { power: 1.8 });
      if (b.state === 'perform' || b.state === 'open') this.act('Hit_Knockback', f.t + 0.05, { contact: 0.1, dur: 0.5 });
      this.expr('fury', f.t, 0.8);
      f.sfx.returnHit && f.sfx.returnHit(f.pan(x));
    }
    this.snd.play('boom', { x });
    // a warm bloom, not a white-out: this happens every time you send one back
    f.fx.flash(new THREE.Color(0.26, 0.13, 0.11), 1); f.fx.aberrate(1.1);
    f.fx.glitter(x, 1.4, z, GOLDC, 40, 1.6); f.fx.glitter(x, 1.2, z, PINKC, 30, 1.6);
    f.cam.shake(0.7, 0.18); f.cam.kick(1.2);
    this.cloud(x, z, 2.0, new THREE.Color(0.55, 0.32, 0.18), 0.7);
    this._dispose(g);
    this.tr.onGrenadeBack && this.tr.onGrenadeBack(g);
  }

  // ---------- KISS FAN ---------- (on the snare: she touches her lips and flicks)
  kissFan(t, { n = 3, spread = 14, speed = 8.5, from = null, aim = null, size = 0.42, card = false } = {}) {
    const f = this.f;
    const fire = () => {
      const b = this.boss;
      if (b.scene) return;                 // (a kiss she'd wound up for as her death scene began)
      if (!from && (!b.root.visible || b.intangible)) return;
      const tgt = aim || f.player;
      // up close it's one kiss, softer, from her lips: yours to catch on the beat
      const close = !from && Math.hypot(tgt.x - b.x, tgt.z - b.z) < 2.6;
      const src = from || (close ? { x: b.x, z: b.z } : this._handOrHer());
      const base = Math.atan2(tgt.x - src.x, tgt.z - src.z);
      const wrecked = this.tr.wrecked;
      const nn = close ? 1 : n, spd = close ? Math.min(speed, 6.5) : speed, off = close ? -0.3 : 0.5;
      // the middle kiss is yours; the others open out so they pass either side of you
      const d = Math.hypot(tgt.x - src.x, tgt.z - src.z);
      const step = nn === 1 ? 0 : Math.min(0.45, Math.max(spread * Math.PI / 180 / (nn - 1), Math.atan2(1.35, Math.max(0.5, d))));
      let shot = 0;
      for (let i = 0; i < nn; i++) {
        const a = base + (i - (nn - 1) / 2) * step;
        // once she's wrecked her kisses pop into glitter before they reach you
        const p = f.proj.spawn({ x: src.x + Math.sin(a) * off, z: src.z + Math.cos(a) * off, y: 1.45, angle: a, speed: spd, kind: 'pink', shape: card ? 'card' : 'kiss', size: card ? 0.5 : size, spin: card ? 7 : 0, owner: wrecked ? 'deco' : 'boss',
          life: wrecked ? 0.5 : 7, fn: wrecked ? (q, dt) => { q.x += Math.sin(q.angle) * q.speed * dt; q.z += Math.cos(q.angle) * q.speed * dt; } : null });
        if (p && wrecked) p.onDeath = (q) => f.fx.glitter(q.x, 1.2, q.z, PINKC, 8, 0.4);
        if (p) shot++;
      }
      // no kiss sound for kisses the spotlight stopped
      if (shot) this.snd.play(card ? 'flutter' : 'kiss', { x: src.x });
    };
    if (!from) this.act('Spell_Simple_Shoot', t, { contact: 0.4, dur: 0.55 });
    if (t <= f.t + 0.005) fire(); else f.at(t, fire);
  }
  _handOrHer() { const b = this.boss; const h = this._hand(); return { x: (h.x + b.x) / 2, z: (h.z + b.z) / 2 }; }

  // ---------- SLAP ---------- (pink: parry it) a cone in front of her, filling over one beat
  slap(start, impact) {
    const f = this.f, b = this.boss;
    if (!b.root.visible || b.intangible) return;
    b.faceNow(f.player.x, f.player.z);
    const ang = b.facing;
    f.pat.area(f, { shape: 'cone', x: b.x, z: b.z, angle: ang, w: 2.4, param: 50 * Math.PI / 180, kind: 'pink', start, end: impact, damage: 1, melee: true,
      onImpact: (hit) => { this.snd.play('clack', { x: b.x }); if (hit === 'hit') { this.expr('delight', f.t, 1); const pl = f.player; const a = toward(b, pl); pl.vx += Math.sin(a) * 4; pl.vz += Math.cos(a) * 4; } if (hit === 'parried') { this.act('Hit_Chest', f.t + 0.05, { contact: 0.1, dur: 0.4 }); b.open(this.beatAt(f.t) * 2); } } });
    this.act('Melee_Hook', impact, { contact: 0.55, dur: 0.6 });
    f.at(impact - 0.18, () => this.snd.play('whoosh', { x: b.x }));
    this._slapBar = this._barOf(start);
  }
  _barOf(t) { return Math.floor((this.f.bm.beatAt(t) - this.f.bm.downbeat) / 4); }
  // the rule in the verses: YOU within 2.6 m on a beat, she slaps on the next (once a bar, never during her count)
  _slapWatch() {
    const f = this.f, bm = f.bm, b = this.boss;
    const i = Math.floor(bm.beatAt(f.t));
    if (i === this._beatIdx) return;
    this._beatIdx = i;
    if (!this.slapOn || f.t < this.watch || f.t < (this.noSlapUntil || 0) || b.intangible || !b.root.visible || b.busy || b.state !== 'perform' || this.tr.wrecked) return;
    if (this._barOf(f.t) === this._slapBar) return;
    if (Math.hypot(f.player.x - b.x, f.player.z - b.z) > 2.6) return;
    this.slap(f.t, bm.timeOf(i + 1));
  }

  // ---------- SWIPE ---------- (white: dodge it) an arc band in front of her
  swipe(start, impact, { from = null, angle = null, r = 3.0 } = {}) {
    const f = this.f, b = this.boss;
    const src = from || { x: b.x, z: b.z };
    let ang = angle;
    const sh = f.pat.area(f, { shape: 'arc', x: src.x, z: src.z, angle: ang ?? toward(src, f.player), w: r, h: 1.2, param: 75 * Math.PI / 180, kind: 'white', start, end: impact, damage: 1, melee: true,
      follow: angle === null ? () => { const s = from || b; const a = f.t < impact - this.beatAt(f.t) * 0.5 ? toward(s, f.player) : sh.angle; return { x: s.x, z: s.z, angle: a }; } : null,
      onImpact: (hit) => { if (hit === 'hit') this.expr('delight', f.t, 1); } });
    this.act('Zombie_Scratch', impact, { contact: 0.5, dur: 0.6 });
    f.at(impact - 0.12, () => this.snd.play('skreek', { x: src.x }));
    return sh;
  }

  // ---------- FLICKER ---------- out on a beat (a VHS tear); her tell where she'll be a beat before; in on the beat
  out(t) {
    const f = this.f;
    const go = () => {
      const b = this.boss;
      if (b.state === 'finished' || b.scene) return;
      this.tear(b.x, b.z);
      this.snd.play('vhs', { x: b.x });
      this.hide(true);
    };
    if (t <= f.t + 0.005) go(); else f.at(t, go);
  }
  in(t, x, z, { tell = 'floor', face = null, clip = null } = {}) {
    const f = this.f, bt = this.beatAt(t);
    const tellT = t - bt;
    // out of the floor: on open floor (the spot asked for may be under something that's down)
    if (tell === 'floor') ({ x, z } = this.floor(x, z));
    const doTell = () => { if (this.boss.scene) return; if (tell === 'floor') this.reflection(x, z, f.t, t); else this.tr.set && this.tr.set.tell(tell, f.t, t); this.snd.play(tell === 'floor' ? 'hiss' : 'latch', { x }); };
    if (tellT <= f.t + 0.005) doTell(); else f.at(tellT, doTell);
    const go = () => {
      const b = this.boss;
      if (b.state === 'finished' || b.scene) return;
      this.place(x, z, face ?? undefined);
      this.hide(false);
      this.tear(x, z, 0.12);
      this.snd.play('appear', { x });
      f.fx.glitter(x, 1.2, z, PINKC, 12, 0.6);
      this.solidUntil = t + bt * 4;
      if (clip) b.loop(clip);
    };
    if (t <= f.t + 0.005) go(); else f.at(t, go);
  }
  flicker(tOut, tIn, x, z, o = {}) { this.out(tOut); this.in(tIn, x, z, o); }
  // the two-frame VHS tear where she was
  tear(x, z, life = 0.09) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 2.6), new THREE.MeshBasicMaterial({ map: vhsTex(), color: new THREE.Color(2.2, 1.4, 2.0), transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.position.set(x, 1.3, z); this.group.add(m);
    const cam = this.f.cam.cam;
    this.decal({ life, update: (k) => { m.quaternion.copy(cam.quaternion); m.scale.set(1 + k * 1.5, 1 - k * 0.4, 1); m.material.opacity = 1 - k; m.position.x = x + (Math.random() - 0.5) * 0.2; }, dispose: () => { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); } });
  }
  // a thin white band round a stomp's circle, riding with it: the shockwave's starting line
  waveMark(sh, t0, land, r) {
    const m = new THREE.Mesh(new THREE.RingGeometry(r + 0.44, r + 0.6, 72), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.0, 1.25, 1.6), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 3; m.position.set(sh.x, 0.025, sh.z);
    this.group.add(m);
    this.decal({ life: Math.max(0.2, land - this.f.t + 0.2), update: (k, t) => { m.position.set(sh.x, 0.025, sh.z); m.material.opacity = t < t0 ? 0 : t < land ? 0.3 + 0.5 * clamp((t - t0) / Math.max(0.01, land - t0), 0, 1) : Math.max(0, 1 - (t - land) / 0.15); }, dispose: () => { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); } });
    return m;
  }
  // her red reflection lying in the floor at (x, z) from t0, until she rises out of it at t1
  reflection(x, z, t0, t1, { angle = 0, scale = 1 } = {}) {
    const f = this.f;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.1 * scale, 2.2 * scale), new THREE.MeshBasicMaterial({ map: reflTex(), color: new THREE.Color(1.6, 0.6, 0.7), transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
    m.rotation.set(-Math.PI / 2, 0, angle + Math.PI); m.position.set(x, 0.03, z + 1.05 * scale); m.renderOrder = 3;
    this.group.add(m);
    const life = Math.max(0.2, t1 - t0 + 0.25);
    this.decal({ life, update: (k, t) => { const a = t < t1 ? clamp((t - t0) / 0.15, 0, 1) * (0.75 + 0.25 * Math.sin(t * 25)) : Math.max(0, 1 - (t - t1) / 0.25); m.material.opacity = a; }, dispose: () => { this.group.remove(m); m.geometry.dispose(); m.material.dispose(); } });
    return m;
  }

  // ---------- KNIFE BLOCK ---------- four beats: a knife drawn each beat, its lane aimed where YOU is, then locked;
  // on the next beat 1 all four fly at 20 m/s and stick where they stop
  knives(ticks, fly, { from = null } = {}) {
    const f = this.f;
    const lanes = [];
    ticks.forEach((tk, i) => {
      const draw = () => {
        if (f.suppress) return;           // the spotlight: she draws nothing
        const b = this.boss;
        const src = from || { x: b.x, z: b.z };
        const ang = toward(src, f.player);
        const sh = { shape: 'rect', x: src.x, z: src.z, angle: ang, w: 0.35, h: 16 };
        lanes[i] = sh;
        sh.tele = f.tele.add({ ...sh, kind: 'white', start: f.t, end: fly });
        f.cue('white', src);
        this.snd.play('shing', { x: src.x, rate: 1 + i * 0.06 });
        this.act('PickUp_Table', f.t + 0.12, { contact: 0.5, dur: 0.42 });
        this.tr.extra && this.tr.extra.show('knife', true);
      };
      if (tk <= f.t + 0.005) draw(); else f.at(tk, draw);
    });
    f.at(fly, () => {
      this.tr.extra && this.tr.extra.show('knife', false);
      // only the lanes you can still see fly (the spotlight clears them)
      const live = lanes.filter((sh) => sh && sh.tele && !sh.tele.dead);
      if (live.length) this.snd.play('thwip', { x: this.boss.x });
      for (const sh of live) {
        const p = f.proj.spawn({ x: sh.x + Math.sin(sh.angle) * 0.6, z: sh.z + Math.cos(sh.angle) * 0.6, y: 1.1, angle: sh.angle, speed: 20, kind: 'white', shape: 'shard', size: 0.42, life: 16 / 20, damage: 1, tag: 'knife' });
        if (p) p.onDeath = (q) => this.stick(q.x, q.z, q.angle);
        if (p) p.onBlocked = (q) => this.stick(q.x, q.z, q.angle);
      }
    });
  }
  stick(x, z, ang) {
    const f = this.f;
    x = clamp(x, -10.9, 10.9); z = clamp(z, -6.9, 6.9);
    const kn = new THREE.Group();
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 0.008), new THREE.MeshPhysicalMaterial({ color: 0xe8eef6, metalness: 1, roughness: 0.15 })); blade.position.y = 0.12; kn.add(blade);
    const hilt = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.13, 0.03), new THREE.MeshPhysicalMaterial({ color: 0x3a2214, roughness: 0.5 })); hilt.position.y = 0.33; kn.add(hilt);
    kn.position.set(x, 0, z); kn.rotation.set(0.5 * Math.cos(ang), ang, -0.5 * Math.sin(ang)); kn.traverse((o) => { o.castShadow = true; });
    this.group.add(kn);
    this.snd.play('thunk', { x });
    f.fx.sparks(x, 0.3, z, WHITEC, 5);
    const until = f.t + this.beatAt(f.t) * 8;
    this.decal({ life: until - f.t, update: () => {}, dispose: () => { this.group.remove(kn); kn.traverse((o) => { if (o.isMesh) { o.geometry.dispose(); o.material.dispose(); } }); } });
  }

  // ---------- BEYOND REPAIR ---------- her hand mirror cracks on each beat; ten white lanes, one at YOU; it bursts
  mirrorRing(cracks, burst, { rot = 0, n = 10, lanes: laneLen = 9, aimed = true, from = null } = {}) {
    const f = this.f, b = this.boss;
    const src = from || { x: b.x, z: b.z };
    const base = (aimed ? toward(src, f.player) : 0) + rot * Math.PI / 180;
    const angs = Array.from({ length: n }, (_, i) => base + i * TAU / n);
    const teles = angs.map((a) => f.tele.add({ shape: 'rect', x: src.x, z: src.z, angle: a, w: 0.3, h: laneLen, kind: 'white', start: f.t, end: burst }));
    const gone = () => teles.every((g) => g.dead);    // cleared by the spotlight: no count, no shards
    if (gone()) return;
    f.cue('white', src);
    if (!from) { b.loop('Spell_Simple_Idle_Loop'); this.tr.extra && this.tr.extra.show('mirror', true); }
    cracks.forEach((tc, i) => {
      const crack = () => { if (gone()) return; this.snd.play('crack', { x: src.x, rate: 1 + i * 0.05 }); f.fx.sparks(src.x, 1.7, src.z, WHITEC, 4); };
      if (tc <= f.t + 0.005) crack(); else f.at(tc, crack);
    });
    f.at(burst, () => {
      if (!from) { this.tr.extra && this.tr.extra.show('mirror', false); b.loop(b.idleClip); }
      if (gone()) return;
      this.snd.play('smash', { x: src.x });
      f.fx.glitter(src.x, 1.6, src.z, WHITEC, 24, 0.8);
      angs.forEach((a, i) => { if (!teles[i].dead) f.proj.spawn({ x: src.x + Math.sin(a) * 0.6, z: src.z + Math.cos(a) * 0.6, y: 1.2, angle: a, speed: 11, kind: 'white', shape: 'shard', size: 0.4, life: (laneLen - 0.6) / 11, damage: 1 }); });
    });
  }

  // ---------- DOOR BLAST ---------- she stands at the EXIT door, her back to you; the sign blinks four times while
  // a white cone fills; on the downbeat she shoves the push bar and the cone fires. 2.
  doorBlast(ticks, fire, { apex = { x: 0, z: -6.4 } } = {}) {
    const f = this.f;
    const sh = { shape: 'cone', x: apex.x, z: apex.z, angle: 0, w: 13.5, param: 26 * Math.PI / 180 };
    f.pat.area(f, { ...sh, kind: 'white', start: ticks[0], end: fire, damage: 2, onImpact: () => {} });
    ticks.forEach((tk) => f.at(tk, () => { this.tr.set && this.tr.set.exitBlink(tk); this.snd.play('tik', { x: apex.x, rate: 0.5 }); }));
    this.act('Shield_OneShot', fire, { contact: 0.45, dur: 0.6 });
    f.at(fire, () => {
      this.snd.play('clank', { x: apex.x }); this.snd.play('whoop', { x: apex.x }); this.snd.play('rush', { x: apex.x });
      f.cam.shake(1.0, 0.3); f.cam.kick(2.0);
      f.fx.flash(new THREE.Color(0.42, 0.4, 0.38), 1);
      for (let i = 0; i < 6; i++) { const a = (Math.random() - 0.5) * 0.9, d = 2 + Math.random() * 9; f.fx.glitter(apex.x + Math.sin(a) * d, 1.2, apex.z + Math.cos(a) * d, i % 2 ? GOLDC : WHITEC, 14, 1.2); }
      this.tr.set && this.tr.set.doorBang(fire);
    });
  }

  // ---------- THE CHORUS CADENCE ---------- she counts in eighths: four eighth-note ticks over two beats,
  // tracking YOU for the first beat, locked for the second
  _eighths(t0, t1, x, kind = 'white') { const n = 4; for (let i = 0; i < n; i++) { const tk = t0 + (t1 - t0) * i / n; this.f.at(tk, () => { if (!this.f.suppress) this.snd.play('tik', { x: x(), rate: this.snd.tickRate(tk, i) * 0.9 }); }); } }
  _follow(sh, lockT) { const f = this.f; let lx = f.player.x, lz = f.player.z; return () => { if (f.t < lockT) { lx = f.player.x; lz = f.player.z; } sh.x = lx; sh.z = lz; return { x: lx, z: lz }; }; }
  // HEAD: she leaps out of the top of the frame and drops heels first onto a circle under YOU
  head(t0, lock, drop, { r = 1.8, leapAt = null } = {}) {
    const f = this.f;
    const sh = { shape: 'circle', x: f.player.x, z: f.player.z, w: r };
    f.pat.area(f, { ...sh, kind: 'white', start: t0, end: drop, damage: 1, follow: this._follow(sh, lock) });
    this._eighths(t0, drop, () => sh.x);
    this.leap(leapAt !== null && leapAt < t0 ? Math.max(f.t, leapAt) : t0, drop, sh, { clipUp: 'Jump_Start', clipDown: 'Jump_Land' });
    f.at(drop, () => { this.snd.play('heel', { x: sh.x }); f.cam.shake(0.6, 0.15); f.fx.dust(sh.x, sh.z, 10); });
  }
  // she goes up (off the top of the frame) at t0 and comes down on sh at t1
  leap(t0, t1, sh, { clipUp = 'Jump_Start', clipDown = 'Jump_Land', height = 13 } = {}) {
    const f = this.f;
    // she comes down on the circle, on open floor (YOU can stand closer to a thing than she can: a hand's width off)
    const land = () => { const b = this.boss, q = this.floor(sh.x, sh.z); b.place(q.x, q.z); };
    const job = { update: (dt, t) => {
      const b = this.boss;
      if (t < t0) return true;
      const up = 0.28, down = 0.2;
      if (t < t0 + up) { const k = (t - t0) / up; b.root.position.y = height * k * k; b.intangible = true; }
      else if (t < t1 - down) { b.root.position.y = height; b.intangible = true; b.root.visible = false; }
      else if (t < t1) { if (!job.placed) { job.placed = true; land(); b.root.visible = true; b.perform(clipDown, { duration: 0.5, from: 0, to: 1 }); } const k = (t1 - t) / down; b.root.position.y = height * k * k; }
      else { b.root.position.y = 0; b.intangible = false; b.root.visible = true; if (!job.placed) land(); return false; }
      return true;
    }, cancel: () => { const b = this.boss; b.root.position.y = 0; b.intangible = false; b.root.visible = true; } };
    this.extraUpdate.push(job);
    this.act(clipUp, t0 + 0.12, { contact: 0.5, dur: 0.3 });
    f.at(t0 + 0.05, () => this.snd.play('whoosh', { x: this.boss.x, rate: 0.8 }));
    f.at(t1 - 0.2, () => this.snd.play('whoosh', { x: sh.x, rate: 0.6 }));
  }
  // BED: a bed drops out of the flies onto a rect under YOU, bounces once and flies back up two beats later
  bed(t0, lock, land, { up } = {}) {
    const f = this.f;
    const sh = { shape: 'rect', x: f.player.x, z: f.player.z - 1.4, w: 1.2, h: 2.8, angle: 0 };
    const fol = this._follow({}, lock);
    f.pat.area(f, { ...sh, kind: 'white', start: t0, end: land, damage: 1, follow: () => { const p = fol(); sh.x = p.x; sh.z = p.z - 1.4; return { x: sh.x, z: sh.z }; } });
    this._eighths(t0, land, () => sh.x);
    this.tr.set && this.tr.set.dropBed(land, () => ({ x: sh.x, z: sh.z + 1.4 }), up ?? this.plus(land, 2));
    f.at(land, () => { this.snd.play('bed', { x: sh.x }); f.cam.shake(0.8, 0.2); f.fx.dust(sh.x, sh.z + 1.4, 14); });
  }
  // BREAKDOWN: her red reflection in the floor right behind YOU; she steps out of it and swipes
  breakdown(t0, there, swipeT) {
    const f = this.f, pl = f.player;
    const aim = Math.atan2(f._aim ? f._aim.x - pl.x : 0, f._aim ? f._aim.z - pl.z : -1);
    const { x: bx, z: bz } = this.floor(clamp(pl.x - Math.sin(aim) * 2.2, -10, 10), clamp(pl.z - Math.cos(aim) * 2.2, -6.5, 6.5));
    this.out(t0);
    this.reflection(bx, bz, t0, there);
    f.at(t0, () => this.snd.play('whoosh', { pan: -f.pan(pl.x) * 0.5, rate: 0.7 }));
    f.at(there, () => { this.place(bx, bz); this.hide(false); this.tear(bx, bz, 0.1); });
    this.swipe(there, swipeT, { from: { x: bx, z: bz } });
  }
  // STOMP: she leaps; a circle under YOU with an outer ring shown; she lands (2 inside), then a shockwave races out
  stomp(t0, lock, land, { r = 2.2, hearts = 0, wave = 9 } = {}) {
    const f = this.f;
    const sh = { shape: 'circle', x: f.player.x, z: f.player.z, w: r };
    const fol = this._follow(sh, lock);
    f.pat.area(f, { ...sh, kind: 'white', start: t0, end: land, damage: 2, follow: fol });
    // the outer ring: where the shockwave will start. A mark on the floor, not a place that hurts
    this.waveMark(sh, t0, land, r);
    this._eighths(t0, land, () => sh.x);
    this.leap(t0, land, sh, { clipUp: 'NinjaJump_Start', clipDown: 'NinjaJump_Land', height: 11 });
    f.at(land, () => {
      this.snd.play('stomp', { x: sh.x });
      f.cam.shake(1.1, 0.25); f.cam.kick(1.6);
      f.fx.dust(sh.x, sh.z, 18);
      f.addWave({ x: sh.x, z: sh.z, r, speed: (wave - r) / 0.35, band: 0.6, max: wave, kind: 'white', hit: false, damage: 1 });
      if (hearts) f.pat.ring(f, { from: { x: sh.x, z: sh.z }, n: hearts, speed: 5, kind: 'pink', shape: 'heart', size: 0.42, rot: Math.random() * TAU });
    });
  }

  // ---------- CROWN SEARCH ---------- she walks to the cushion, finds it empty, pats it, looks around: open
  crown(t0, t1, { at = { x: 0, z: -4.9 } } = {}) {
    const f = this.f, b = this.boss;
    const go = () => {
      if (b.intangible) this.hide(false);
      b.behave = 'hold';
      b.moveTo(at.x, at.z, Math.min(1.0, (t1 - t0) * 0.3), { easing: 'inOut' });
      f.at(f.t + 1.0, () => { if (b.state === 'perform' || b.state === 'open') { b.faceNow(at.x, at.z - 3); this.act('Interact', f.t + 0.3, { contact: 0.4, dur: 0.9 }); this.snd.play('pats', { x: at.x }); } });
      f.at(f.t + 1.9, () => { b.loop('Idle_No_Loop'); this.snd.play('clink', { x: at.x, rate: 0.7 }); });
      b.open(t1 - f.t);
      this.tr.set && this.tr.set.cushionSpot(t0, t1);
    };
    if (t0 <= f.t + 0.005) go(); else f.at(t0, go);
    f.at(t1, () => { b.loop(b.idleClip); });
  }

  // ---------- EVERYWHERE ---------- she flashes in round YOU on each beat (behind, right, front, left), told a beat
  // ahead by her reflection, and blows one (or two) kisses straight at you
  everywhere(outT, beats, { per = 1, dist = 5.5, speed = 13, settle = null } = {}) {
    const f = this.f;
    this.out(outT);
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    beats.forEach((tb, i) => {
      const bt = this.beatAt(tb);
      const spot = () => { const pl = f.player; const [dx, dz] = dirs[i % 4]; return this.floor(clamp(pl.x + dx * dist, -10.2, 10.2), clamp(pl.z + dz * dist * 0.85, -6.4, 6.4)); };
      let p = null;
      f.at(tb - bt, () => { p = spot(); this.reflection(p.x, p.z, f.t, tb); this.snd.play('hiss', { x: p.x }); });
      f.at(tb, () => {
        if (!p) p = spot();
        if (i > 0) this.tear(this.boss.x, this.boss.z, 0.06);
        this.place(p.x, p.z); this.hide(false); this.tear(p.x, p.z, 0.08);
        this.kissFan(f.t, { n: per, spread: 10, speed, size: 0.42 });
        if (i < beats.length - 1) f.at(this.plus(tb, 0.55), () => { this.hide(true); });
      });
    });
    if (settle) f.at(settle.t, () => { this.hide(false); this.solidUntil = settle.t + this.beatAt(settle.t) * 4; });
  }

  // ---------- per frame ----------
  update(dt) {
    const f = this.f, t = f.t;
    this._updateGrenades(dt);
    this._slapWatch();
    for (let i = this.extraUpdate.length - 1; i >= 0; i--) { const j = this.extraUpdate[i]; if (!j.update(dt, t)) this.extraUpdate.splice(i, 1); }
    for (let i = this.decals.length - 1; i >= 0; i--) {
      const d = this.decals[i]; d.t += dt;
      const k = Math.min(1, d.t / d.life);
      d.update(k, t);
      if (k >= 1) { d.dispose(); this.decals.splice(i, 1); }
    }
  }
  // one of each thing she makes, to compile their shaders at load (the set's warm-up removes them)
  warmObjects() {
    const out = [];
    const g = grenadeModel(0.5); this.group.add(g.root); out.push(g.root);
    const before = this.decals.length;
    this.cloud(0, 0, 1, new THREE.Color(0.5, 0.1, 0.2), 0.01); this.tear(0, 0, 0.01); this.reflection(0, 0, 0, 0.01); this.waveMark({ x: 0, z: 0 }, 0, 0.01, 1);
    for (const d of this.decals.splice(before)) { d.update(0, 0); }
    this.group.children.forEach((c) => out.push(c));
    return out;
  }
  // the rewind: everything of hers in the air or on the floor goes
  reset() {
    for (const g of this.grenades) this._dispose(g);
    this.grenades.length = 0;
    for (const d of this.decals) d.dispose();
    this.decals.length = 0;
    for (const j of this.extraUpdate) j.cancel && j.cancel();
    this.extraUpdate.length = 0;
    this.watch = 0; this._slapBar = -99; this.noSlapUntil = 0;
    const b = this.boss; b.root.position.y = 0;
    this.tr.extra && this.tr.extra.hideAllHeld();
  }
  // the bar is empty: everything of hers turns to glitter, this frame
  glitterAll() {
    const f = this.f;
    for (const g of this.grenades) { f.fx.glitter(g.model.root.position.x, 0.5, g.model.root.position.z, PINKC, 20, 1); for (const h of g.tickH || []) this.snd.stop(h); this._dispose(g); g.state = 'gone'; }
    for (const p of f.proj.list) if (p.owner === 'boss') { f.fx.glitter(p.x, p.y, p.z, PINKC, 6, 0.4); p.dead = true; }
    f.tele.clear();
    for (const w of f.waves) f._dropWave(w);        // the ring's material goes back to the fight's pool
    f.waves.length = 0;
  }
}
function o2d(v, d) { return v === undefined ? d : v; }
export { inShape, toward, clamp, ease };
