// THE DOCTOR's attacks, on exact song times (the sheet's seconds), built on the shared resolver (area) and projectiles.
//  SEND: pink, catchable: a pink circle (r 0.9) where it arrives, filling to the arrival beat; its speed is solved from
//        the distance and clamped (released later if it would be too fast, so it still arrives on the beat).
//  SHOT: white, fast: a lane along its aim that fills to the release beat; then the projectile crosses it.
//  LASER: a white lane that is hit on its beat (a 0.1 s red-white beam flashes along it).
// Every function takes the fight f, the track's runtime R (sounds, fx) and options; times are song seconds.
import * as THREE from 'three';
import { area, toward } from '../../game/patterns.js';
import { LAYER } from '../../game/arena.js';

const D2R = Math.PI / 180;
export const youAt = (f) => ({ x: f.player.x, z: f.player.z });
const clampIn = (f, p, m = 0.5) => ({ x: Math.max(f.bounds.minX + m, Math.min(f.bounds.maxX - m, p.x)), z: Math.max(f.bounds.minZ + m, Math.min(f.bounds.maxZ - m, p.z)) });
// her pointer's tip, toward a point
function tip(f, aimAng, out = 0.9) { const b = f.boss; return { x: b.x + Math.sin(aimAng) * out, z: b.z + Math.cos(aimAng) * out }; }

// ------------------------------------------------------------------------------------------ the laser's flash
const BEAM_GEO = new THREE.PlaneGeometry(1, 1); BEAM_GEO.translate(0, 0.5, 0); BEAM_GEO.rotateX(Math.PI / 2);
export class Flashes {
  constructor(scene) { this.scene = scene; this.list = []; }
  laser(x, z, ang, w, h, t, dur = 0.1) {
    let m = this.list.find((q) => !q.visible);
    if (!m) {
      m = new THREE.Mesh(BEAM_GEO, new THREE.MeshBasicMaterial({ color: new THREE.Color(4.0, 1.4, 1.3), transparent: true, opacity: 1, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
      m.layers.set(LAYER.NO_REFLECT); m.renderOrder = 6; m.frustumCulled = false; m.userData.rpdTrue = true;
      this.scene.add(m); this.list.push(m);
    }
    m.position.set(x, 0.12, z); m.rotation.set(0, ang, 0); m.scale.set(Math.max(0.12, w * 0.9), 1, h);
    m.userData.t0 = t; m.userData.dur = dur; m.visible = true;
  }
  update(t) { for (const m of this.list) { if (!m.visible) continue; const k = (t - m.userData.t0) / m.userData.dur; if (k > 1 || k < -0.05) m.visible = false; else m.material.opacity = 1 - k * k; } }
  clear() { for (const m of this.list) m.visible = false; }
  dispose() { for (const m of this.list) { this.scene.remove(m); m.material.dispose(); } }
}

// ------------------------------------------------------------------------------------------ SEND (pink)
// o: { start, end, at (point; default YOU now), n, arc (deg), shape, size, vmin, vmax, spin, fn (per-frame extra),
//      homing, r (circle radius) }
export function send(f, R, o) {
  const at = o.at || youAt(f);
  const b = f.boss;
  const base = toward(b, at);
  const dist0 = Math.hypot(at.x - b.x, at.z - b.z);
  const n = o.n ?? 1, arc = (o.arc ?? 0) * D2R;
  // close in, a wide fan's circles would pile into one blinding pink blob: each shrinks to the room it has
  const spacing = n > 1 ? arc / (n - 1) * Math.max(1.2, dist0 - 0.9) : 9;
  const rr = n > 1 ? Math.max(0.5, Math.min(o.r ?? 0.9, spacing * 0.6)) : (o.r ?? 0.9);
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc);
    const src = tip(f, a);
    const d = Math.max(1.2, dist0 - 0.9);
    const p = clampIn(f, { x: src.x + Math.sin(a) * d, z: src.z + Math.cos(a) * d }, 0.3);
    const dd = Math.hypot(p.x - src.x, p.z - src.z);
    // point blank: a straight throw would be in YOUR face before the beat; it goes up and drops on the beat instead
    if (Math.hypot(f.player.x - src.x, f.player.z - src.z) < 2.0 || dd < 1.7) {
      f.pat.lob(f, { from: src, fromY: 1.5, at: p, end: o.end, r: rr, shape: o.shape || 'orb', size: o.size ?? 0.32, kind: 'pink', back: 16, silentCue: true, peak: 1.6 + (o.end - f.t) * 0.8 });
      continue;
    }
    const span = Math.max(0.05, o.end - o.start);
    const v = Math.max(o.vmin ?? 2.5, Math.min(o.vmax ?? 9, dd / span));
    const release = Math.max(o.start, o.end - dd / v);
    const ang = Math.atan2(p.x - src.x, p.z - src.z);
    f.tele.add({ shape: 'circle', x: p.x, z: p.z, w: rr, kind: 'pink', start: o.start, end: o.end });
    out.push({ src, p, ang, v, release });
  }
  f.cue('pink', at);
  // each leaves when it must to arrive on the beat (the volley's sound with the first)
  let first = true;
  for (const q of out) {
    const fire = () => {
      const pr = f.proj.spawn({ x: q.src.x, z: q.src.z, y: o.y ?? 1.45, angle: q.ang, speed: q.v, kind: 'pink', shape: o.shape || 'orb', size: o.size ?? 0.32, spin: o.spin ?? 3,
        life: Math.hypot(q.p.x - q.src.x, q.p.z - q.src.z) / q.v + 1.6, homing: o.homing, target: o.homing ? () => f.player : null, fn: o.fn ? (pp, dt) => o.fn(pp, dt, q) : null });
      if (pr) pr.rpdArrive = o.end;
      if (first) { first = false; f.sfx.fire && f.sfx.fire(o.shape || 'orb', f.pan(b.x), 'pink'); o.onFire && o.onFire(); }
    };
    if (q.release <= f.t + 1e-3) fire(); else f.at(q.release, fire);
  }
  return out;
}

// a pill thrown in a lob: the floor dot shows its true position; up it goes (1.0 -> 2.2 -> 1.0 m)
export function pill(f, R, { start, end }) {
  return send(f, R, { start, end, shape: 'pill', size: 0.32, vmin: 1.5, vmax: 12, spin: 4, fn: (p, dt, q) => {
    const tot = Math.max(0.05, end - q.release), k = Math.min(1, (f.t - q.release) / tot);
    p.y = 1.0 + 1.2 * Math.sin(Math.PI * Math.min(1, k));
  } });
}

// ------------------------------------------------------------------------------------------ SHOT (white)
// o: { start, end, at, angles (deg offsets) | n + arc, w, h, speed, shape, size }
export function shot(f, R, o) {
  const at = o.at || youAt(f);
  const b = f.boss;
  const base = toward(b, at);
  const offs = o.angles || (o.n > 1 ? Array.from({ length: o.n }, (_, i) => (i / (o.n - 1) - 0.5) * (o.arc ?? 20)) : [0]);
  const lanes = offs.map((d) => {
    const a = base + d * D2R;
    const src = tip(f, a, 0.6);
    f.tele.add({ shape: 'rect', x: src.x, z: src.z, angle: a, w: o.w ?? 0.35, h: o.h ?? 14, kind: 'white', start: o.start, end: o.end });
    return { a, src };
  });
  f.cue('white', b);
  f.at(o.end, () => {
    for (const l of lanes) f.proj.spawn({ x: l.src.x, z: l.src.z, y: 1.3, angle: l.a, speed: o.speed ?? 14, kind: 'white', shape: o.shape || 'shard', size: o.size ?? 0.28, life: 2.2 });
    f.sfx.fire && f.sfx.fire(o.shape || 'shard', f.pan(b.x), 'white');
  });
  return lanes;
}

// ------------------------------------------------------------------------------------------ LASER (white lane, hit on its beat)
// o: { start, end, at | angle, from {x,z}, w, h, damage, follow }
export function laser(f, R, o) {
  const b = f.boss;
  const from = o.from || tip(f, toward(b, o.at || youAt(f)), 0.5);
  const ang = o.angle ?? toward(from, o.at || youAt(f));
  const w = o.w ?? 0.45, h = o.h ?? 16;
  const sh = area(f, { shape: 'rect', x: from.x, z: from.z, angle: ang, w, h, kind: 'white', start: o.start, end: o.end, damage: o.damage ?? 1, sound: false,
    onImpact: (hit) => { R.flashes.laser(from.x, from.z, ang, w, h, f.t); R.snd.play('zap', { x: from.x }); o.onImpact && o.onImpact(hit); } });
  return sh;
}
// a line ruled across the floor (x-aligned, through z) or down it (z-aligned, through x)
export function lineX(f, R, { z, start, end, w = 0.45, damage, onImpact }) { return laser(f, R, { from: { x: f.bounds.minX - 0.5, z }, angle: Math.PI / 2, w, h: f.bounds.maxX - f.bounds.minX + 1, start, end, damage, onImpact, glide: false }); }
export function lineZ(f, R, { x, start, end, w = 0.45, damage, onImpact }) { return laser(f, R, { from: { x, z: f.bounds.minZ - 0.5 }, angle: 0, w, h: f.bounds.maxZ - f.bounds.minZ + 1, start, end, damage, onImpact, glide: false }); }

// ------------------------------------------------------------------------------------------ areas on the floor
export function circle(f, R, { x, z, r, start, end, kind = 'white', damage = 1, onImpact, sound }) {
  return area(f, { shape: 'circle', x, z, w: r, kind, start, end, damage, onImpact, sound });
}
export function ringArea(f, R, { x, z, r, th, start, end, kind = 'white', damage = 1, onImpact }) {
  return area(f, { shape: 'ring', x, z, w: r, param: th, kind, start, end, damage, onImpact });
}

// ------------------------------------------------------------------------------------------ her body
// fit a one-shot so its contact (fraction `hit` of the clip) lands on song time t
export function strikeOn(f, clip, t, { hit = 0.5, len, from = 0, to = 1 } = {}) {
  const b = f.boss, c = b.rig && b.rig.kit.clips[clip];
  const span = (len ?? (c ? c.duration : 0.5)) * (to - from);
  const lead = span * hit;
  const go = () => { b.perform(clip, { from, to, duration: span, fade: 0.06 }); };
  if (t - lead <= f.t + 1e-3) go(); else f.at(t - lead, go);
}

// the red pen: a white arc in front of her toward YOU, Sword_Regular_B landing on the beat, then her recovery
export function redPen(f, R, { start, end, rot = 0 }) {
  const b = f.boss, at = youAt(f);
  const ang = toward(b, at) + rot * D2R;
  b.faceNow(at.x, at.z);
  const sh = area(f, { shape: 'arc', x: b.x, z: b.z, angle: ang, w: 2.8, h: 1.4, param: 75 * D2R, kind: 'white', start, end, damage: 1, melee: true,
    onImpact: (hit) => { R.snd.play('swish', { x: b.x }); if (hit !== 'hit') { b.perform('Sword_Regular_B_Rec', { duration: 0.6 }); b.open(f.beat); } } });
  strikeOn(f, 'Sword_Regular_B', end, { hit: 0.55 });
  return sh;
}

// the pointer thrust (pink: parry it on the beat and she's open)
export function thrust(f, R, { start, end, w = 2.6, deg = 18, bluff = false }) {
  const b = f.boss, at = youAt(f);
  const ang = toward(b, at);
  b.faceNow(at.x, at.z);
  const sh = { shape: 'cone', x: b.x, z: b.z, angle: ang, w, param: deg * D2R };
  if (bluff) return R.lies.bluff({ ...sh, kind: 'pink', start, end });
  area(f, { ...sh, kind: 'pink', start, end, damage: 1, melee: true, onImpact: (hit) => { R.snd.play('tsing', { x: b.x }); if (hit === 'dodged' || hit === 'miss') b.perform('Sword_Regular_A_Rec', { duration: 0.55 }); } });
  strikeOn(f, 'Sword_Regular_A', end, { hit: 0.6 });
  return sh;
}

// office hours: a pink lunge to where YOU stood, her body arriving on the beat (a parry stops her dead)
export function lunge(f, R, { start, end, w = 1.0, len = 8 }) {
  const b = f.boss, at = youAt(f);
  const ang = toward(b, at);
  const d = Math.min(len, Math.hypot(at.x - b.x, at.z - b.z) + 0.6);
  const sx = b.x, sz = b.z;
  const e = clampIn(f, { x: sx + Math.sin(ang) * d, z: sz + Math.cos(ang) * d }, 0.8);
  const realLen = Math.hypot(e.x - sx, e.z - sz);
  b.faceNow(at.x, at.z);
  area(f, { shape: 'rect', x: sx, z: sz, angle: ang, w, h: realLen, kind: 'pink', start, end, damage: 1, melee: true, onImpact: (hit) => { if (hit === 'parried') b.stop(); } });
  for (let k = 0; k < 3; k++) f.at(end - 0.36 + k * 0.08, () => R.snd.play('heel', { x: b.x, rate: 1.3 }));
  const travel = 0.22;
  // (straight down the lane YOU was shown: she stops at whatever stands in it, never through it or round it. Stunned
  // as it starts, she doesn't lunge at all: it isn't kept for when she comes round)
  f.at(end - travel, () => { b.perform('Sword_Dash', { from: 0.1, to: 0.45, duration: travel + 0.3 }); b.moveTo(e.x, e.z, travel, { easing: 'in', straight: true }); if (b.moveHeld) b.stop(); R.snd.play('swish', { x: b.x }); });
}

// a circle around her
export function slam(f, R, { start, end, r = 3.2, damage = 1 }) {
  const b = f.boss;
  return area(f, { shape: 'circle', x: b.x, z: b.z, w: r, kind: 'white', start, end, damage, melee: true });
}

// a ring of shards from her with a gap toward YOU, its cue ring at her feet
export function ringShards(f, R, { start, end, n = 12, speed = 6.5, gap = 50, cueW = 1.2, cueT = 0.4, shape = 'shard' }) {
  const b = f.boss;
  f.tele.add({ shape: 'ring', x: b.x, z: b.z, w: cueW, param: cueT, kind: 'white', start, end });
  f.cue('white', b);
  f.at(end, () => {
    const g = toward(b, f.player), gw = gap * D2R;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + g + Math.PI / n;
      const d = Math.atan2(Math.sin(a - g), Math.cos(a - g)); if (Math.abs(d) < gw / 2) continue;
      f.proj.spawn({ x: b.x + Math.sin(a) * 0.8, z: b.z + Math.cos(a) * 0.8, y: 1.2, angle: a, speed, kind: 'white', shape, size: 0.3, life: 4 });
    }
    f.sfx.fire && f.sfx.fire(shape, f.pan(b.x), 'white');
  });
}

// one clap: a ring wave from her (dash through it)
export function clapWave(f, R, { start, end, speed = 9, band = 0.6, from }) {
  const b = f.boss, src = from || null;
  const sx = () => (src ? src.x : b.x), sz = () => (src ? src.z : b.z);
  f.tele.add({ shape: 'ring', x: sx(), z: sz(), w: 2.2, param: 0.5, kind: 'white', start, end });
  f.cue('white', b);
  f.at(end, () => { R.snd.play('clap', { x: sx() }); f.addWave({ x: sx(), z: sz(), r: 0.5, speed, band, max: 20, kind: 'white', hit: false, damage: 1 }); f.sfx.wave && f.sfx.wave(f.pan(sx())); });
}

// a sweeping beam: warm (its lane telegraphed) then live, sweeping `sweep` degrees across YOU
export function sweepBeam(f, R, { start, on, off, sweep = 120, w = 0.55, h = 18 }) {
  const b = f.boss, src = { x: b.x, z: b.z };
  const mid = toward(src, f.player), a0 = mid - sweep * D2R / 2, a1 = mid + sweep * D2R / 2;
  const g = f.tele.add({ shape: 'rect', x: src.x, z: src.z, angle: a0, w, h, kind: 'white', start, end: on });
  f.addBeam({ src, a0, a1, w, h, tOn: on, tOff: off, kind: 'white', damage: 1, tele: g });
  f.cue('white', src);
}

// a fan of white cards: the cone is their telegraph; the cards fly on the beat
export function cards(f, R, { start, end, n = 6, w = 11, deg = 37, speed = 9.5, size = 0.38, at }) {
  const b = f.boss, tgt = at || youAt(f);
  const ang = toward(b, tgt);
  b.faceNow(tgt.x, tgt.z);
  f.tele.add({ shape: 'cone', x: b.x, z: b.z, angle: ang, w, param: deg * D2R, kind: 'white', start, end });
  f.cue('white', b);
  f.at(end, () => {
    const spread = deg * 2 * D2R;
    for (let i = 0; i < n; i++) { const a = ang + (n === 1 ? 0 : (i / (n - 1) - 0.5) * spread); f.proj.spawn({ x: b.x + Math.sin(a) * 0.8, z: b.z + Math.cos(a) * 0.8, y: 1.2, angle: a, speed, kind: 'white', shape: 'card', size, spin: 9, life: 2.4, tag: 'card' }); }
    R.snd.lib('k-page', { x: b.x, gain: 0.8 });
    f.sfx.fire && f.sfx.fire('card', f.pan(b.x), 'white');
  });
}

// hearts sent with a little homing for their first second
export function hearts(f, R, { t, n = 4, speed = 5.5, homing = 0.6, homeFor = 1.0, arc = 40, size = 0.36 }) {
  const b = f.boss;
  const base = toward(b, f.player);
  f.cue('pink', b);
  for (let i = 0; i < n; i++) {
    const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc * D2R);
    const t0 = f.t;
    f.proj.spawn({ x: b.x + Math.sin(a) * 0.9, z: b.z + Math.cos(a) * 0.9, y: 1.4, angle: a, speed, kind: 'pink', shape: 'heart', size, spin: 0, life: 5,
      homing: homing || 0, target: homing ? () => f.player : null, fn: homing ? (p) => { if (f.t - t0 > homeFor) p.homing = 0; } : null });
  }
  R.snd.play('bloop', { x: b.x });
}

// a spiral of pink from a point: `count` bursts every `step` beats, `arms` arms turning `turn` degrees per burst
export function spiral(f, R, { t0, count = 8, step = 0.5, arms = 2, speed = 6, turn = 22, shape = 'orb', size = 0.3, from }) {
  const beat = f.beat;
  for (let k = 0; k < count; k++) {
    f.at(t0 + k * step * beat, () => {
      const src = from || { x: f.boss.x, z: f.boss.z };
      const base = toward(src, f.player);
      for (let i = 0; i < arms; i++) {
        const a = base + k * turn * D2R + (i / arms) * Math.PI * 2;
        f.proj.spawn({ x: src.x + Math.sin(a) * 0.8, z: src.z + Math.cos(a) * 0.8, y: 1.3, angle: a, speed, kind: 'pink', shape, size, spin: 3, life: 4 });
      }
      if (k % 2 === 0) f.sfx.fire && f.sfx.fire(shape, f.pan(src.x), 'pink');
    });
  }
}
