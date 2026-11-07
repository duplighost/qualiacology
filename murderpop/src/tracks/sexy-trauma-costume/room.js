// The back room's real-time pieces on top of the baked set: everything that moves, breaks, opens or lights up on
// the song (racks, dress forms, curtains, the pegboard wall and the party behind it, the mirror, the shutter and the
// bins, the trapdoors, the register, receipts, the hero package...). setStateAt(t) derives all of it from the
// timeline, so a rewind or a start anywhere puts the room exactly as it is at t.
import * as THREE from 'three';
import { Stage } from '../../game/stage.js';
import { LAYER } from '../../game/arena.js';
import * as K from './props.js';
import { Sound } from './sound.js';
import { EVENTS } from './events.js';
import { buildGuests } from './guests.js';
import { Reflection } from './reflection.js';

const clamp01 = (k) => Math.max(0, Math.min(1, k));
const ease = (k) => k * k * (3 - 2 * k);
const step = (t, a, b) => clamp01((t - a) / Math.max(1e-4, b - a));

// ------------------------------------------------------------------------------------------------ the lighting
// [time, stateA, stateB, k, exposure]: piecewise; between keys the later one holds (stepped) unless `fade` is set
// L0 work lamp, L1 shop, L2 black light, L3 mirror, L4 party (uv + the riser), L5 follow spot (dark), L6 black (uv,
// harder), L7 the till, L8 hell, L9 house lights
const LIGHTS = [
  [0.0, 'till', 'till', 0, 0.55],
  [1.317, 'till', 'shop', 0.4, 0.8],
  [1.645, 'till', 'shop', 0.7, 0.9],
  [2.64, 'shop', 'shop', 0, 1],
  [32.0, 'shop', 'dark', 0.35, 0.95],
  [32.327, 'shop', 'dark', 0.7, 0.9],
  [32.656, 'dark', 'dark', 0, 1],
  [33.325, 'uv', 'uv', 0, 1],
  [54.659, 'shop', 'shop', 0, 1],
  [76.01, 'shop', 'mirror', 1, 1, 0.3],
  [86.653, 'uv', 'uv', 0, 1],
  [129.326, 'dark', 'dark', 0, 1],
  [141.67, 'uv', 'uv', 0, 1.12],
  [182.664, 'till', 'till', 0, 1],
  [197.33, 'till', 'hell', 0.3, 1],
  [198.65, 'till', 'hell', 0.55, 1],
  [200.02, 'till', 'hell', 0.8, 1],
  [201.34, 'hell', 'hell', 0, 1],
  [214.7, 'shop', 'shop', 0, 0.6, 0.4],
];
// the black light strobes off and on a beat at a time (under the black light), and the blackouts of the bridge
// (whole-room light changes stay under 3 a second, with soft edges)
const STROBES = [[47.66, 48.66], [100.99, 101.99]];
const BLACKOUTS = [[139.70, 139.80], [141.15, 141.64]];
export { LIGHTS };

export class Room {
  constructor(f, world) {
    this.f = f; this.w = world; this.scene = f.scene;
    this.group = new THREE.Group(); this.group.name = 'backroom'; this.scene.add(this.group);
    this.exposureK = 1;
    this.inited = false;
    this.live = [];          // temporary things (landed packages, pits, tears...): { obj, until, dispose? }
    this.snd = new Sound(f);
    this._st = '';
  }

  async build(kit) {
    const f = this.f;
    this.stage = new Stage(f, this.w);
    this.stage.group.name = 'backroom-stage';
    this.mat = K.materials();
    // the set's own pieces
    this.racks = K.racks(this);
    this.forms = K.dressForms(this);
    this.curt = K.curtains(this);
    this.peg = K.pegboard(this);
    this.riser = K.riser(this);
    this.mirror = K.mirrorGlass(this);
    this.shutter = K.shutter(this);
    this.bins = K.bins(this);
    this.boxes = K.shelfBoxes(this);
    this.heads = K.movingHeads(this);
    this.register = K.register(this);
    this.lanterns = K.lanterns(this);
    this.cannons = K.cannons(this);
    this.sign = K.returnsSign(this);
    this.pool = K.followPool(this);
    this.party = K.partyLight(this);
    this.packages = K.packageFactory(this);
    if (K.dressMaterial) K.dressMaterial(this);
    this.hero = K.heroPackage(this);
    this.footer = K.footer(this);
    this.guests = await buildGuests(this, kit);
    this.refl = new Reflection(this);
    // the arena's own materials we tint (the black wave) and flicker (sconces, the mirror bulbs)
    this.arenaMats = {};
    const ar = this.w.arena;
    if (ar) ar.group.traverse((o) => { if (o.isMesh && o.material) { const n = o.material.name || ''; (this.arenaMats[n] ||= new Set()).add(o.material); } });
  }

  // ---------------------------------------------------------------------------------------------- per frame
  lights(t, arena) {
    let L = LIGHTS[0], next = null;
    for (let i = 0; i < LIGHTS.length; i++) { if (LIGHTS[i][0] <= t) { L = LIGHTS[i]; next = LIGHTS[i + 1] || null; } }
    let [t0, a, b, k, ex, fade] = L;
    if (fade) { const prev = LIGHTS[LIGHTS.indexOf(L) - 1]; const kk = ease(step(t, t0, t0 + fade)); if (kk < 1 && prev) { a = prev[2] === prev[1] || prev[3] === 0 ? prev[1] : prev[2]; b = L[2]; k = kk * (L[3] || 1); if (L[1] !== L[2]) { a = prev[1]; } } }
    let e = ex;
    // (a beat dark, a beat lit: in the dark she moves)
    for (const [s0, s1] of STROBES) if (t >= s0 && t < s1) { const bt = this.f.beat, u = (t - s0) / bt, ph = Math.floor(u), fr = u - ph; if (ph % 2 === 0) e *= 1 - 0.75 * Math.min(1, fr * bt / 0.05, (1 - fr) * bt / 0.05); }
    for (const [s0, s1] of BLACKOUTS) if (t >= s0 && t < s1) e *= 0.04;
    for (const [s0, s1] of this.blinks || []) if (t >= s0 && t < s1) e *= 0.1;
    // the gas lamps gutter in the bar with no low end (64.01 -> 64.83): slowly, not a flicker
    if (t >= 64.01 && t < 64.83) e *= 0.85 + 0.1 * Math.sin(t * 11.0) * Math.sin(t * 3.1);
    // a soft pulse on the bar lines under the black light, and on the last slam's hits (red)
    if (a === 'uv' && b === 'uv' && t > 33.33 && t < 107.99 && !(t >= 54.659 && t < 86.653)) { const bt = this.f.bm.barAt(t); if (bt.beat < 1.25) e *= 1 + 0.25 * (1 - (bt.beat - 1) / 0.25); }
    if (t >= 203.99 && t < 213.33) { for (const h of [203.99, 204.83, 206.48, 207.49, 209.16, 210.33]) if (t >= h && t < h + 0.15) e *= 1 + 0.35 * (1 - (t - h) / 0.15); }
    this.exposureK = e;
    const key = a + '|' + b + '|' + k.toFixed(2);
    if (key !== this._st) { this._st = key; arena.setState(a, b, k); }
    this._lightsAt = { a, b, k };
    void next;
  }

  // ---------------------------------------------------------------------------------------------- the timeline
  // the room as it is at song time t (after a rewind, or a start anywhere)
  setStateAt(t) {
    this.inited = true;
    for (const l of this.live) this._kill(l);
    this.live.length = 0;
    this.stage.reset();
    for (const fn of this.parts()) fn && fn.at && fn.at(t);
    this.blinks = [];
    this._black(t >= 142.33 ? 1 : 0);
  }
  parts() { return [this.racks, this.forms, this.curt, this.peg, this.riser, this.mirror, this.shutter, this.bins, this.boxes, this.heads, this.register, this.lanterns, this.cannons, this.sign, this.pool, this.hero, this.footer, this.guests, this.refl, this.party]; }
  _kill(l) { if (l.obj) { l.obj.parent && l.obj.parent.remove(l.obj); } l.dispose && l.dispose(); }
  keep(obj, until, o = {}) { if (obj && !obj.parent) this.group.add(obj); const l = { obj, until, ...o }; this.live.push(l); return l; }

  update(dt, t) {
    const f = this.f;
    if (!this.inited) this.setStateAt(t);
    this.stage.update(t);
    for (let i = this.live.length - 1; i >= 0; i--) { const l = this.live[i]; if (l.tick) l.tick(t, dt); if (t >= l.until) { this._kill(l); this.live.splice(i, 1); } }
    for (const p of this.parts()) p && p.update && p.update(dt, t);
    // the black wave: from the counter outward, 141.67 -> 142.33
    if (t >= 141.67 && t < 142.6) this._black(step(t, 141.67, 142.33));
    // tall cover: her shots die against a standing rack (or a dress form)
    this._cover();
  }

  _cover() {
    const f = this.f;
    for (const p of f.proj.list) {
      if (p.owner !== 'boss' || p.dead) continue;
      for (const r of this.racks.list) if (r.tall && r.hits(p.x, p.z)) { p.dead = true; f.fx.sparks(p.x, p.y, p.z, new THREE.Color(2.2, 2.2, 2.4), 6); break; }
    }
  }

  // the room's costumes, the counter front, the shelving and her orange go black lacquer and gold
  _black(k) {
    if (this._blackK === k) return; this._blackK = k;
    const tint = (names, to) => { for (const n of names) for (const m of this.arenaMats[n] || []) { m.userData.c0 ||= m.color.clone(); m.color.copy(m.userData.c0).lerp(to, k); } };
    tint(['stc_orange'], new THREE.Color(0.012, 0.008, 0.01));
    tint(['stc_wallpaper', 'stc_velvet'], new THREE.Color(0.01, 0.006, 0.008));
    this.racks && this.racks.black(k);
    this.boxes && this.boxes.black(k);
    this.peg && this.peg.black && this.peg.black(k);
    this.f.clerk && this.f.clerk.black(k);
  }

  onSection() {}
  onFinish() { this.cannons.fire(this.f.t); }
  dispose() { this.refl && this.refl.dispose(); this.scene.remove(this.group); this.stage.dispose(); }
  // the mirror, the reflection
  mirrorFacing() { const p = this.mirror.panels[1]; return { x: p.cx + Math.sin(p.a) * 0.3, z: p.cz + Math.cos(p.a) * 0.3, a: p.a }; }
  mirrorBurst() { this.mirror.shatter(); this.f.cam.shake(0.7, 0.25); }
  reflectionLate() {}
  // the walkers (the final chorus)
  walkers(t0, tGo) { this.curt.event('walk', this.f.t); this.guests.startWalkers(t0, tGo); }
  walkersArmed(t0, t1) { this.guests.arm(t0, t1); }
  onSpotlight(on) { this.heads.toYou = on; }

  // ---------------------------------------------------------------------------------------------- events
  // the floor tears along a Divorce lane; the runner stays torn where it crossed (until the gaslight mends it; a tear
  // cut after the gaslight stays to the end). quiet: a second lane cut on the same beat (one rip is enough)
  tear(sh, quiet) { const d = K.tearDecal(this, sh); this.keep(d, this.f.t < 64.83 ? 64.83 : 1e9); if (!quiet) this.snd.rip(sh); }
  ripSound(t0, t1) { this.snd.stretch(t0, t1); }
  package(kind) { return this.packages.make(kind); }
  // a package that landed and sits there until `until`
  landed(sh, until, kind = 'box') { const m = this.packages.make(kind); if (!m) return null; m.position.set(sh.x, 0.18, sh.z); m.rotation.set(0, Math.random() * 6, 0); this.keep(m, until); this.snd.land(sh); return m; }
  zip(t0, t1) { this.snd.zip(t0, t1); }
  tapeLoop(c, t0, t1) { const m = K.tapeRing(this, c); this.keep(m, t1 + 0.2, { tick: (t) => { const k = step(t, t0, t1); m.scale.setScalar(1 + (1 - k) * 0.6); m.material.opacity = 0.35 + 0.6 * k; } }); }
  wrapped(who, sec) { const m = K.tapeRing(this, who); m.scale.setScalar(0.45); const f = this.f; this.keep(m, f.t + sec, { tick: () => m.position.set(who.x, 0.9, who.z) }); }
  curtains(what) { this.curt.event(what, this.f.t); }
  mirrorOn() { this.mirror.bulbsOn = true; }
  peanuts(sh) { this.f.fx.emit(26, { x: sh.x, y: 0.3, z: sh.z, color: new THREE.Color(1.8, 1.7, 1.5), shape: 2, speed: 3, life: 0.9, size: 0.06, gravity: 12, up: 0.8, bounce: 0.3 }); this.snd.land(sh); }
  glitterPop(sh) { this.f.fx.glitter(sh.x, 0.4, sh.z, new THREE.Color(3, 2.2, 0.8), 30, 0.6); this.snd.land(sh); }
  dress(on) { if (on) K.giantDress(this, this.f.t); else this.dressGone && this.dressGone(); }
  // the hem whips across the floor: a black wave with a gold edge racing out from her hoop to the walls, round
  // everything but the slit (gap radians wide, centred on the bearing gapAt). It's called 0.15 s before the impact
  // and crosses the floor in a quarter second, so the edge is mid-floor on the beat
  hemWhip(gap = 0, gapAt = 0, at = this.f.boss) {
    const f = this.f; f.cam.shake(0.25, 0.1); this.dressFlare && this.dressFlare(); this.snd.whoosh();
    const L = Math.PI * 2 - gap, th0 = gapAt + gap / 2 - Math.PI / 2;     // ring angle = bearing - 90 degrees
    const dark = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.0, 96, 1, th0, L), new THREE.MeshBasicMaterial({ color: 0x050204, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide }));
    const rim = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.0, 96, 1, th0, L), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 1.7, 0.5), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
    const g = new THREE.Group(); g.position.set(at.x, 0.03, at.z);
    for (const m of [dark, rim]) { m.rotation.x = -Math.PI / 2; m.layers.set(LAYER.NO_REFLECT); m.renderOrder = 3; g.add(m); }
    const t0 = f.t;
    this.keep(g, t0 + 0.45, {
      tick: (t) => { const k = step(t, t0, t0 + 0.25), r = 1.6 + 19.4 * k; g.scale.setScalar(r); const fade = 1 - step(t, t0 + 0.2, t0 + 0.45); dark.material.opacity = 0.7 * fade; rim.material.opacity = fade; },
      dispose: () => { for (const m of [dark, rim]) { m.geometry.dispose(); m.material.dispose(); } },
    });
  }
  flareSound(t0, t1) { this.snd.stretch(t0, t1, 0.6); }
  headsTo(who, t0, t1) { this.heads.focus(who, t0, t1); }
  // (the chorus's own downbeat fires the cannons on this same beat)
  herFlash() { const f = this.f; f.fx.flash(new THREE.Color(0.42, 0.4, 0.47), 1); f.cam.shake(0.5, 0.15); this.snd.thoom(); }
}

Object.assign(Room.prototype, EVENTS);
