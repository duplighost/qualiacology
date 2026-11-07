// THE CLERK's attack vocabulary, on top of src/game/patterns.js. Every helper takes exact song times (start: the
// telegraph appears, end: the impact on the named word) and is snapped at `start`: nothing tracks YOU after its
// shape is drawn, and nothing she throws homes.
// Like the shared patterns (an impact whose telegraph is gone never lands; a perfect catch pays more: the design's
// 4 / 6 units), plus: o.onCancel when YOU's spotlight took it, a quieter white for room-sized shapes, no impact flash
// on them (the attack draws its own: the hem's whip), meshes that fly along a lob.
import * as THREE from 'three';

export const TAU = Math.PI * 2;
export const toward = (a, b) => Math.atan2(b.x - a.x, b.z - a.z);
export const angDiff = (a, b) => Math.atan2(Math.sin(a - b), Math.cos(a - b));
export const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
export const ease = (k) => k * k * (3 - 2 * k);

// damage: design units -> HP (a strike A is one unit)
export const U = 11;

// ------------------------------------------------------------------------------------------------ the resolver
// like patterns.area, plus: o.onCancel when the spotlight took it, o.cueKind for the sound, o.y lifts the shape
export function area(f, o) {
  const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
  let g = null;
  if (!o.noTele) {
    const s0 = o.start ?? f.t, start = f.encoreMode ? o.end - (o.end - s0) * 0.72 : s0;
    // a room-sized shape (the hem's flares, the gun's sweeps) doesn't flash at all: its white flash would be the whole
    // screen. Its impact is drawn by the attack itself (the hem's whip, the tags)
    const size = sh.shape === 'rect' ? sh.w * sh.h : sh.w * sh.w;
    const linger = o.linger ?? (size > 60 ? 0.001 : undefined);
    // (o.teleColor: a white shape drawn in a quieter white; anything not tagged 'pink' still reads as white to the bot)
    g = f.tele.add({ ...sh, kind: o.teleColor && o.kind !== 'pink' ? 'whiteq' : o.kind, color: o.teleColor, start, end: o.end, linger, follow: o.follow ? () => { const p = o.follow(); sh.x = p.x; sh.z = p.z; if (p.angle !== undefined) sh.angle = p.angle; return p; } : null });
    if (g.dead) { o.onCancel && o.onCancel(sh); return sh; }        // born during YOU's spotlight: it never happens
    if (!o.silent) f.cue(o.kind, sh);
  }
  sh.tele = g;
  f.after(Math.max(0, o.end - f.t), () => {
    if (g && g.dead) { o.onCancel && o.onCancel(sh); return; }      // the spotlight shattered it (or a rewind did)
    if (f.state !== 'play') return;
    const hit = o.damage === 0 ? 'miss' : f.resolveArea(sh, o);
    o.onImpact && o.onImpact(hit, sh);
    if (o.sound !== false) f.sfx.impactArea && f.sfx.impactArea(o.kind, f.pan(sh.x), hit);
  });
  return sh;
}

// shapes, snapped now; `from` defaults to her feet, `at` to YOU
const src = (f, o) => (o.from ? { x: o.from.x, z: o.from.z } : { x: f.boss.x, z: f.boss.z });
const tgt = (f, o) => (o.at ? { x: o.at.x, z: o.at.z } : { x: f.player.x, z: f.player.z });

export function lane(f, o) {
  const s = src(f, o), a = o.angle ?? toward(s, tgt(f, o));
  return area(f, { ...o, shape: 'rect', x: s.x, z: s.z, angle: a, w: o.w ?? 1.2, h: o.h ?? 13, kind: o.kind || 'white' });
}
export function cone(f, o) {
  const s = src(f, o), a = (o.angle ?? toward(s, tgt(f, o))) + (o.turn || 0);
  return area(f, { ...o, shape: 'cone', x: s.x, z: s.z, angle: a, w: o.w ?? 3.2, param: o.param ?? 0.42, kind: o.kind || 'pink', melee: o.melee ?? true });
}
export function circle(f, o) {
  const p = o.at ? o.at : o.around ? src(f, o) : tgt(f, o);
  return area(f, { ...o, shape: 'circle', x: p.x, z: p.z, w: o.w ?? 1.1, kind: o.kind || 'white' });
}
export function ring(f, o) {
  const p = o.at ? o.at : src(f, o);
  // (a room-sized ring, the hem's third flare, in the hem's quieter white: see arc() below)
  const quiet = (o.w ?? 3.0) > 8 && (o.kind || 'white') === 'white' ? ARC_WHITE : undefined;
  return area(f, { teleColor: quiet, ...o, shape: 'ring', x: p.x, z: p.z, w: o.w ?? 3.0, param: o.param ?? 1.6, kind: o.kind || 'white', melee: o.melee ?? true });
}
// an arc band round her; `gap` (radians, the whole slit) centred on `gapAt` (a bearing from her). The shared shader
// lights an arc's whole band as its "edge", so a room-sized one (the hem) is drawn in a quieter white or it washes the
// whole floor white for its whole fill
const ARC_WHITE = new THREE.Color(1.25, 1.55, 1.9).multiplyScalar(0.42);
export function arc(f, o) {
  const p = src(f, o);
  const half = Math.PI - (o.gap ?? 1.74) / 2;
  return area(f, { teleColor: (o.w ?? 21) > 8 ? ARC_WHITE : undefined, ...o, shape: 'arc', x: p.x, z: p.z, angle: (o.gapAt ?? 0) + Math.PI, w: o.w ?? 21, h: o.h ?? 19.4, param: half, kind: o.kind || 'white', melee: true });
}

// ------------------------------------------------------------------------------------------------ shots
// n shots in a fan from `from` toward `at` (snapped now), released at `end`; an aim line fills to the release
export function fan(f, o) {
  const s = src(f, o), a = o.angle ?? toward(s, tgt(f, o));
  if (o.aim !== false) area(f, { shape: 'rect', x: s.x, z: s.z, angle: a, w: o.aimW ?? 0.15, h: o.aimH ?? 8, kind: 'white', start: o.start ?? f.t, end: o.end, damage: 0, sound: false, silent: o.silent });
  f.at(o.end, () => {
    if (f.suppress || f.state !== 'play') return;
    const n = o.n ?? 3, arcR = (o.arc ?? 30) * Math.PI / 180;
    const from = o.live ? src(f, o) : s;
    for (let i = 0; i < n; i++) {
      const aa = a + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arcR);
      const p = f.proj.spawn({ x: from.x + Math.sin(aa) * 0.9, z: from.z + Math.cos(aa) * 0.9, y: o.y ?? 1.2, angle: aa, speed: o.speed ?? 11, kind: o.kind || 'white', shape: o.shape || 'card', size: o.size ?? 0.3, life: (o.range ?? 10) / (o.speed ?? 11), spin: 4 });
      if (p && o.blink) p.fn = blinker(f, p);
    }
    f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(from.x), o.kind || 'white');
    o.onFire && o.onFire();
  });
}
// the gaslight: after 2 m a tag blinks out for 0.33 s and comes back further along; its floor dot never blinks
function blinker(f, p) {
  const x0 = p.x, z0 = p.z; let state = 0, t0 = 0;
  return (q) => {
    const d = Math.hypot(q.x - x0, q.z - z0);
    if (state === 0 && d > 2) { state = 1; t0 = f.t; q._size = q.size; q.size = 0.001; f.room && f.room.snd.pfft(q.x); }
    else if (state === 1 && f.t - t0 > 0.33) { state = 2; q.size = q._size; }
  };
}
// a ring of n from a point, released at `end`, a white ring telegraph round the point filling to it
export function burst(f, o) {
  const p = { x: o.at.x, z: o.at.z };
  area(f, { shape: 'ring', x: p.x, z: p.z, w: o.ringW ?? 1.4, param: o.ringT ?? 0.25, kind: 'white', start: o.start ?? f.t, end: o.end, damage: 0, sound: false, silent: o.silent, onCancel: o.onCancel });
  f.at(o.end, () => {
    if (f.suppress || f.state !== 'play') return;
    const n = o.n ?? 8, rot = o.rot ?? Math.random() * TAU;
    for (let i = 0; i < n; i++) {
      const a = rot + i / n * TAU;
      f.proj.spawn({ x: p.x + Math.sin(a) * 0.5, z: p.z + Math.cos(a) * 0.5, y: o.y ?? 0.8, angle: a, speed: o.speed ?? 7, kind: o.kind || 'white', shape: o.shape || 'card', size: o.size ?? 0.3, life: (o.range ?? 10) / (o.speed ?? 7), spin: 5 });
    }
    f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(p.x), 'white');
    o.onFire && o.onFire(p);
  });
}

// ------------------------------------------------------------------------------------------------ packages
// A LOB: a thing in a high arc to a circle on the floor, landing at `end`. PINK: caught in the circle on the beat,
// it goes back to her gold (back / backPerfect in units). WHITE (FINAL SALE): it can't be caught; a try is a thud.
// Uncaught: under it hurts and it's spent; otherwise onLand(at) opens it. o.mesh flies along the arc.
// o: { start, end, at, from {x,z}, fromY, r, kind, shape, size, back, backPerfect, peak, mesh, damage, onLand(sh), onCaught(perfect, q), onHit(sh), spin }
export function lob(f, o) {
  const s = o.from ? { x: o.from.x, z: o.from.z } : { x: f.boss.x + Math.sin(f.boss.facing) * 0.4, z: f.boss.z + Math.cos(f.boss.facing) * 0.4 };
  const at = tgt(f, o);
  const kind = o.kind || 'pink', r = o.r ?? 1.1;
  const t0 = o.start ?? f.t, t1 = o.end, dur = Math.max(0.15, t1 - t0);
  const sy = o.fromY ?? 1.9, peak = o.peak ?? Math.min(5.5, 2.2 + dur * 1.5);
  const mesh = o.mesh || null;
  let p = null;
  const fly = () => {
    if (mesh) { f.scene.add(mesh); mesh.visible = true; }
    p = f.proj.spawn({ x: s.x, z: s.z, y: sy, angle: 0, speed: 0, kind, shape: o.shape || 'card', size: o.size ?? 0.45, life: dur + 0.1, owner: 'deco', spin: o.spin ?? 2.5, parryable: false,
      fn: (q) => {
        const k = clamp((f.t - t0) / dur, 0, 1);
        q.x = s.x + (at.x - s.x) * k; q.z = s.z + (at.z - s.z) * k; q.y = sy + (0.35 - sy) * k + 4 * peak * k * (1 - k);
        if (mesh) { mesh.position.set(q.x, q.y, q.z); mesh.rotation.y += 0.06; mesh.rotation.x = Math.sin(k * Math.PI) * 0.7; }
      } });
    if (!p && mesh) f.scene.remove(mesh);     // the spotlight is on: she can't throw
    if (p && kind === 'pink' && !o.silent) f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(s.x), kind);
  };
  fly();
  return area(f, { shape: 'circle', x: at.x, z: at.z, w: r, kind, start: t0, end: t1, damage: o.damage ?? 1, silent: o.silentCue, sound: o.sound,
    onCancel: () => { if (p) p.dead = true; if (mesh) dropMesh(f, mesh); },
    onImpact: (hit, sh) => {
      if (p) p.dead = true;
      if (mesh) f.scene.remove(mesh);
      if (hit === 'parried') {
        const pl = f.player, b = f.boss;
        const perfect = f.lastCatch === 'perfect';
        const q = f.proj.spawn({ x: pl.x, z: pl.z, y: 1.3, angle: toward(pl, b), speed: o.backSpeed ?? 17, kind: 'gold', shape: o.shape || 'card', size: (o.size ?? 0.45) * 1.1,
          owner: 'you', life: 3, homing: 7, target: () => b, spin: 6 });
        if (q) q.dmgBack = ((perfect ? o.backPerfect : o.back) ?? (perfect ? 6 : 4)) * U;
        f.clerk && f.clerk.returned(q);
        o.onCaught && o.onCaught(perfect, q, sh);
      } else if (hit === 'hit') { o.onHit && o.onHit(sh); }
      else if (hit === 'miss') o.onLand && o.onLand(sh, hit);         // dashed through it: spent, like a hit
    } });
}
// a thrown thing the spotlight knocked out of the air: it drops where it is
function dropMesh(f, mesh) {
  const y0 = mesh.position.y; const t0 = f.t;
  const tick = () => { const k = (f.t - t0) / 0.35; mesh.position.y = Math.max(0.05, y0 * (1 - k * k)); if (k < 1) f.after(0.016, tick); else f.scene.remove(mesh); };
  tick();
}

// ------------------------------------------------------------------------------------------------ live hazards
// a hazard that is live for a while (a tripwire, a walker, a boomerang): call every frame; hurts once per `cool`
export function touch(f, x, z, r, o = {}) {
  if (f.suppress || f.state !== 'play') return false;
  const pl = f.player;
  if (Math.hypot(pl.x - x, pl.z - z) > r + 0.42 * 0.8) return false;
  if (pl.invulnerable) { if (pl.state === 'dash' && !o.nm) { pl.nearMiss(f._ctx(0)); f._good(60); } return false; }
  if (o.kind === 'pink' && pl.catching && o.catchable) {
    const q = pl.tryCatch(); if (q) { pl.caught(q, f._ctx(0)); f.fx.caught(pl.x, 1.2, pl.z, q === 'perfect'); f.sfx.catch && f.sfx.catch(q, f.pan(pl.x)); f._glimmer(q === 'perfect' ? 2 : 1, true); f._good(q === 'perfect' ? 120 : 70); o.onCatch && o.onCatch(q); return 'caught'; }
  }
  if (pl.hurt(f._ctx(0), o.damage ?? 1, x, z, o.why || 'touch')) { f._hurt(x, z); return 'hit'; }
  return false;
}
