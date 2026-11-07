// Her attacks, on absolute song times: every impact sits on a beat-map beat (the script snaps the design's
// seconds to the grid). Built on src/game/patterns.js (area() resolves every hit: PINK parries, WHITE dodges).
import * as THREE from 'three';

const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const cx = (f, x, m = 0.6) => clamp(x, f.bounds.minX + m, f.bounds.maxX - m);
const cz = (f, z, m = 0.6) => clamp(z, f.bounds.minZ + m, f.bounds.maxZ - m);

// a shape that fills from t0 and lands at t1
export function zone(f, o) {
  return f.pat.area(f, { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h, param: o.param, kind: o.kind || 'white',
    start: o.t0 ?? f.t, end: o.t1, damage: o.damage ?? 1, melee: !!o.melee, follow: o.follow, onImpact: o.onImpact, silent: o.silent, sound: o.sound });
}

// a mark that follows YOU from now until tLock, then strikes where it stopped at t1. Returns the spot (live).
export function markAt(f, { t0, tLock, t1, r = 1.5, kind = 'white', damage = 1, onImpact, silent, melee = false, spot: given }) {
  const spot = given || { x: f.player.x, z: f.player.z, locked: false };
  spot.x = f.player.x; spot.z = f.player.z; spot.locked = false;
  const follow = () => { if (f.t < tLock) { spot.x = f.player.x; spot.z = f.player.z; } else spot.locked = true; return { x: spot.x, z: spot.z }; };
  const g = f.tele.add({ shape: 'circle', x: spot.x, z: spot.z, w: r, kind, start: t0 ?? f.t, end: t1, follow });
  if (!silent) f.cue(kind, f.player);
  f.after(Math.max(0, t1 - f.t), () => {
    // nothing lands that you can't see (the spotlight or a rewind cleared its mark, or it was born in the spotlight)
    if (g.dead) return;
    f.pat.area(f, { shape: 'circle', x: spot.x, z: spot.z, w: r, kind, start: f.t - 0.01, end: f.t, damage, onImpact, noTele: true, melee });
  });
  return spot;
}

// shots that arrive at tArrive: aimed at YOU now (lead: fraction of your motion to aim ahead), speed fitted
// to the distance and clamped (the texts: 6-11 m/s), fanned over `arc` degrees
export function shotAt(f, { tArrive, n = 1, arc = 0, shape = 'card', size = 0.42, kind = 'pink', from, lead = 0, homing, life, wave, min = 6, max = 11, damage, offset = 0.9 }) {
  if (f.suppress) return;
  const src = from || { x: f.boss.x, z: f.boss.z };
  const dur = Math.max(0.15, tArrive - f.t);
  const pl = f.player;
  const tx = pl.x + (pl.vx || 0) * dur * lead, tz = pl.z + (pl.vz || 0) * dur * lead;
  // point blank, it leaves her hand slower and closer to her: always a beat or more to see it and catch it
  const d0 = Math.hypot(tx - src.x, tz - src.z);
  const off = clamp(d0 - 2.2, 0.25, offset);
  const d = Math.max(0.4, d0 - off - 0.5);
  const speed = clamp(d / dur, d0 < 4.5 ? 2.2 : min, max);
  f.pat.fan(f, { from: src, at: { x: tx, z: tz }, n, arc, speed, shape, size, kind, homing, life, wave, damage, offset: off });
}

// her charge along a lane toward YOU (aimed at t0), arriving at the lane's end on t1
export function lungeAt(f, { t0, t1, w = 0.8, len = 3.5, kind = 'pink', damage = 1, travel = 0.16, onImpact, clip = 'Sword_Dash' }) {
  const b = f.boss;
  if (b.state === 'desperate') clip = 'Zombie_Scratch';
  const ang = toward(b, f.player);
  const sx = b.x, sz = b.z;
  const ex = cx(f, sx + Math.sin(ang) * len), ez = cz(f, sz + Math.cos(ang) * len);
  const realLen = Math.max(0.6, Math.hypot(ex - sx, ez - sz));
  b.faceNow(f.player.x, f.player.z);
  zone(f, { shape: 'rect', x: sx, z: sz, angle: ang, w, h: realLen, kind, t0: t0 ?? f.t, t1, damage, melee: true, onImpact });
  const tGo = t1 - travel;
  f.after(Math.max(0, tGo - f.t - 0.12), () => b.perform(clip, { duration: travel + 0.3, from: 0.1, to: 0.7, fade: 0.04 }));
  f.after(Math.max(0, tGo - f.t), () => b.moveTo(ex, ez, travel, { easing: 'in', face: false }));
  return { ex, ez };
}

// a wedge in front of her toward YOU (aimed now), landing at t1; arc: full angle in degrees
export function sweepAt(f, { t0, t1, r = 3, arc = 110, kind = 'pink', damage = 1, step = 0, onImpact, clip }) {
  const b = f.boss;
  const ang = toward(b, f.player);
  b.faceNow(f.player.x, f.player.z);
  if (step) { const nx = cx(f, b.x + Math.sin(ang) * step), nz = cz(f, b.z + Math.cos(ang) * step); f.after(Math.max(0, t1 - f.t - 0.12), () => b.moveTo(nx, nz, 0.12, { easing: 'out', face: false })); }
  if (clip) f.after(Math.max(0, t1 - f.t - 0.22), () => b.perform(clip, { duration: 0.42, from: 0.15, to: 0.75, fade: 0.04 }));
  return zone(f, { shape: 'cone', x: b.x, z: b.z, angle: ang, w: r, param: arc * Math.PI / 360, kind, t0: t0 ?? f.t, t1, damage, melee: true, onImpact });
}

// a circle round her where she stands now, landing at t1
export function slamAt(f, { t0, t1, r = 3, kind = 'white', damage = 1, onImpact }) {
  const b = f.boss;
  return zone(f, { shape: 'circle', x: b.x, z: b.z, w: r, kind, t0: t0 ?? f.t, t1, damage, melee: true, onImpact });
}

// an arc band round her facing YOU: outer radius r, thickness th, half-angle (degrees)
export function arcAt(f, { t0, t1, r = 5.2, th = 1.8, half = 55, kind = 'white', damage = 1, from, onImpact }) {
  const src = from || f.boss;
  const ang = toward(src, f.player);
  return zone(f, { shape: 'arc', x: src.x, z: src.z, angle: ang, w: r, h: th, param: half * Math.PI / 180, kind, t0: t0 ?? f.t, t1, damage, onImpact });
}

// a cone from a point toward YOU, tracking YOU until tLock (the camera flash)
export function coneTrack(f, { from, t0, tLock, t1, r = 9, half = 28, kind = 'white', damage = 1, onImpact, test }) {
  const src = from || f.boss;
  const sh = { angle: toward(src, f.player) };
  const follow = () => { if (f.t < tLock) sh.angle = toward(src, f.player); return { x: src.x, z: src.z, angle: sh.angle }; };
  return f.pat.area(f, { shape: 'cone', x: src.x, z: src.z, angle: sh.angle, w: r, param: half * Math.PI / 180, kind, start: t0 ?? f.t, end: t1, damage, follow, onImpact,
    ...(test ? {} : {}) });
}

// a ring wave from a point: the ring telegraph from t0, the wave sets off at t1 and runs out at `speed`
export function waveAt(f, { from, t0, t1, speed = 8, band = 0.6, max = 12, kind = 'white', damage = 1 }) {
  const src = from ? { x: from.x, z: from.z } : { x: f.boss.x, z: f.boss.z };
  const g = f.tele.add({ shape: 'ring', x: src.x, z: src.z, w: 2.2, param: 0.5, kind, start: t0 ?? f.t, end: t1 });
  f.cue(kind, src);
  f.after(Math.max(0, t1 - f.t), () => { if (g.dead) return; f.addWave({ x: src.x, z: src.z, r: 0.5, speed, band, max, kind, hit: false, damage }); f.sfx.wave && f.sfx.wave(f.pan(src.x)); });
}

// a lane from a point along an angle (or at YOU), half-width w, length h, landing at t1 (live while `live` runs)
export function laneAt(f, { from, angle, t0, t1, w = 0.9, h = 6, kind = 'white', damage = 1, follow, onImpact, melee = false }) {
  const src = from || { x: f.boss.x, z: f.boss.z };
  const ang = angle ?? toward(src, f.player);
  return zone(f, { shape: 'rect', x: src.x, z: src.z, angle: ang, w, h, kind, t0: t0 ?? f.t, t1, damage, follow, onImpact, melee });
}

export { toward, clamp, cx, cz };

// the camera flash: a cone from her that tracks YOU until tLock and lands at t1, unless a solid set piece stands
// between her and YOU (blocked(x0, z0, x1, z1) -> true): then the flash is spent on it
export function flashAt(f, { t0, tLock, t1, r = 9, half = 28, damage = 1, blocked, onImpact }) {
  const b = f.boss, sh = { shape: 'cone', x: b.x, z: b.z, angle: toward(b, f.player), w: r, h: r, param: half * Math.PI / 180 };
  const g = f.tele.add({ ...sh, kind: 'white', start: t0 ?? f.t, end: t1, follow: () => { sh.x = b.x; sh.z = b.z; if (f.t < tLock) sh.angle = toward(b, f.player); return { x: sh.x, z: sh.z, angle: sh.angle }; } });
  f.cue('white', b);
  f.after(Math.max(0, t1 - f.t), () => {
    if (g.dead) return;
    const pl = f.player;
    const hid = blocked && blocked(sh.x, sh.z, pl.x, pl.z);
    const hit = hid ? 'miss' : f.resolveArea(sh, { kind: 'white', damage });
    onImpact && onImpact(hit, sh, hid);
  });
  return sh;
}
// a ring that follows YOU until tLock, then closes on the beat: outer radius r, band th (a phone cord loop)
export function ringAt(f, { t0, tLock, t1, r = 5, th = 1.2, kind = 'white', damage = 1, onImpact, spot: given }) {
  const spot = given || { x: f.player.x, z: f.player.z };
  const follow = () => { if (f.t < tLock) { spot.x = f.player.x; spot.z = f.player.z; } return { x: spot.x, z: spot.z }; };
  const shape = th >= r ? 'circle' : 'ring';
  const g = f.tele.add({ shape, x: spot.x, z: spot.z, w: r, param: th, kind, start: t0 ?? f.t, end: t1, follow });
  f.after(Math.max(0, t1 - f.t), () => { if (!g.dead) f.pat.area(f, { shape, x: spot.x, z: spot.z, w: r, param: th, kind, start: f.t - 0.01, end: f.t, damage, onImpact, noTele: true }); });
  return spot;
}

// a huge area (the block, the burning table): the same white telegraph, drawn dimmer so a 15 x 10 m fill doesn't
// wash the picture out; it lands as white
export function bigZone(f, { shape = 'rect', x, z, angle = 0, w, h, param, t0, t1, damage = 1, dim = 0.45, onImpact }) {
  const sh = { shape, x, z, angle, w, h: h ?? w, param: param ?? 0.5 };
  const g = f.tele.add({ ...sh, kind: 'dim', color: new THREE.Color(1.25 * dim, 1.55 * dim, 1.9 * dim), start: t0 ?? f.t, end: t1 });
  Object.defineProperty(sh, 'tele', { value: g, enumerable: false });
  f.after(Math.max(0, t1 - f.t), () => {
    if (g.dead) return;
    const hit = f.resolveArea(sh, { kind: 'white', damage });
    onImpact && onImpact(hit, sh);
    f.sfx.impactArea && f.sfx.impactArea('white', f.pan(sh.x), hit);
  });
  return sh;
}
