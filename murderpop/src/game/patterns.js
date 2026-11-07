// The attack library every boss draws from. Each pattern takes the fight `f` and options, draws its
// telegraph now and lands on the beat it names. PINK things can be caught (projectiles) or parried
// (melee and areas: catch at the impact); WHITE things must be dodged (get out, or dash through).
// Times are song seconds; `beats` options are counted in the song's own beats at that moment.
//
// f provides: t, beat, after(sec, fn), player, boss, proj (Projectiles), tele (Telegraphs), area(shape, opts),
//             sfx, fx, bounds

import { blockable } from './kinds.js';

const TAU = Math.PI * 2;
const toward = (from, to) => Math.atan2(to.x - from.x, to.z - from.z);

function originOf(f, from) { return from === 'boss' || !from ? { x: f.boss.x, z: f.boss.z } : from; }

// ---------------- projectile volleys ----------------

// n projectiles in an arc aimed at `at` (player by default), fired `beats` from now (0 = now)
export function fan(f, o = {}) {
  const src = originOf(f, o.from);
  const tgt = o.at || f.player;
  const fire = () => {
    const base = o.angle ?? toward(src, tgt);
    const n = o.n ?? 5, arc = (o.arc ?? 50) * Math.PI / 180;
    for (let i = 0; i < n; i++) {
      const a = base + (n === 1 ? 0 : (i / (n - 1) - 0.5) * arc);
      f.proj.spawn({ x: src.x + Math.sin(a) * (o.offset ?? 0.9), z: src.z + Math.cos(a) * (o.offset ?? 0.9), angle: a, speed: o.speed ?? 8,
        kind: o.kind || 'pink', shape: o.shape || 'orb', size: o.size, accel: o.accel, homing: o.homing, target: o.homing ? () => f.player : null,
        life: o.life, curve: o.curve ? o.curve * (i % 2 ? 1 : -1) : 0, wave: o.wave, spin: o.spin ?? 3, damage: o.damage });
    }
    f.sfx.fire && f.sfx.fire(o.shape || 'orb', f.pan(src.x), o.kind);
    o.onFire && o.onFire();
  };
  if (o.beats) { f.cue(o.kind, src); f.after(o.beats * f.beat, fire); } else fire();
}

// a full ring of n, optionally with a gap facing the player (so there's always a way through)
export function ring(f, o = {}) {
  const src = originOf(f, o.from);
  const fire = () => {
    const n = o.n ?? 16, gapA = o.gap ? toward(src, f.player) : null, gapW = (o.gapWidth ?? 40) * Math.PI / 180;
    const off = o.rot ?? 0;
    for (let i = 0; i < n; i++) {
      const a = off + (i / n) * TAU;
      if (gapA !== null) { const d = Math.atan2(Math.sin(a - gapA), Math.cos(a - gapA)); if (Math.abs(d) < gapW / 2) continue; }
      f.proj.spawn({ x: src.x + Math.sin(a) * (o.offset ?? 0.8), z: src.z + Math.cos(a) * (o.offset ?? 0.8), angle: a, speed: o.speed ?? 6.5,
        kind: o.kind || 'white', shape: o.shape || 'shard', size: o.size, accel: o.accel, life: o.life, curve: o.curve, spin: o.spin, damage: o.damage });
    }
    f.sfx.fire && f.sfx.fire(o.shape || 'shard', f.pan(src.x), o.kind);
  };
  if (o.beats) { f.cue(o.kind || 'white', src); f.after(o.beats * f.beat, fire); } else fire();
}

// arms rotating, one burst per beat for `count` beats
export function spiral(f, o = {}) {
  const arms = o.arms ?? 3, count = o.count ?? 8, step = o.step ?? 1, turn = (o.turn ?? 18) * Math.PI / 180;
  for (let k = 0; k < count; k++) {
    f.after(k * step * f.beat, () => {
      const src = originOf(f, o.from);
      for (let i = 0; i < arms; i++) {
        const a = (o.rot ?? 0) + k * turn * (o.dir ?? 1) + (i / arms) * TAU;
        f.proj.spawn({ x: src.x + Math.sin(a) * 0.8, z: src.z + Math.cos(a) * 0.8, angle: a, speed: o.speed ?? 7, kind: o.kind || 'pink', shape: o.shape || 'orb', size: o.size, life: o.life, spin: o.spin });
      }
      if (k % 2 === 0) f.sfx.fire && f.sfx.fire(o.shape || 'orb', f.pan(src.x), o.kind);
    });
  }
}

// aimed single shots on beats: [0, 1, 2] beats from now, each re-aimed
export function burst(f, o = {}) {
  const at = o.at ?? [0, 1, 2];
  for (const b of at) f.after(b * f.beat, () => fan(f, { ...o, n: o.n ?? 1, beats: 0, arc: o.arc ?? 0 }));
}

// things fall: n circles near/around the player that land `beats` from now
export function rain(f, o = {}) {
  const n = o.n ?? 6, r = o.r ?? 1.3, beats = o.beats ?? 2, spread = o.spread ?? 4.5;
  const pts = o.points || Array.from({ length: n }, (_, i) => {
    if (i === 0 && o.onPlayer !== false) return { x: f.player.x, z: f.player.z };
    const a = Math.random() * TAU, d = 1.5 + Math.random() * spread;
    return { x: clampX(f, f.player.x + Math.sin(a) * d), z: clampZ(f, f.player.z + Math.cos(a) * d) };
  });
  pts.forEach((p, i) => {
    const lag = (o.stagger ?? 0) * i * f.beat;
    const t0 = f.t + lag, t1 = t0 + beats * f.beat;
    f.after(lag, () => area(f, { shape: 'circle', x: p.x, z: p.z, w: r, kind: o.kind || 'white', start: t0, end: t1, damage: o.damage, onImpact: o.onImpact, sound: o.sound }));
  });
}

// a lane from (x,z) toward `angle` (or at the player), length h, half-width w
export function lane(f, o = {}) {
  const src = originOf(f, o.from);
  const ang = o.angle ?? toward(src, o.at || f.player);
  return area(f, { shape: 'rect', x: src.x, z: src.z, angle: ang, w: o.w ?? 0.9, h: o.h ?? 16, kind: o.kind || 'white', start: f.t, end: f.t + (o.beats ?? 2) * f.beat, damage: o.damage, onImpact: o.onImpact, follow: o.follow });
}

// an expanding ring wave from (x,z): radius grows at `speed`; touching its band hurts unless you dash through
export function wave(f, o = {}) {
  const src = originOf(f, o.from);
  const fire = () => {
    const w = { x: src.x, z: src.z, r: 0.5, speed: o.speed ?? 9, band: o.band ?? 0.55, max: o.max ?? 20, kind: o.kind || 'white', hit: false, damage: o.damage ?? 1 };
    f.addWave(w);
    f.sfx.wave && f.sfx.wave(f.pan(src.x));
  };
  if (o.beats) { f.cue(o.kind || 'white', src); f.tele.add({ shape: 'ring', x: src.x, z: src.z, w: 2.2, param: 0.5, kind: o.kind || 'white', start: f.t, end: f.t + o.beats * f.beat }); f.after(o.beats * f.beat, fire); }
  else fire();
}

// ---------------- melee (her body) ----------------

// a charge from where she is toward the player's position now, landing `beats` later
export function lunge(f, o = {}) {
  const b = f.boss, beats = o.beats ?? 2, len = o.len ?? 9, w = o.w ?? 1.0;
  const ang = o.angle ?? toward(b, f.player);
  const sx = b.x, sz = b.z;
  const ex = clampX(f, sx + Math.sin(ang) * len), ez = clampZ(f, sz + Math.cos(ang) * len);
  const realLen = Math.hypot(ex - sx, ez - sz);
  const t1 = f.t + beats * f.beat;
  b.faceNow(f.player.x, f.player.z);
  o.windup && o.windup(t1);
  area(f, { shape: 'rect', x: sx, z: sz, angle: ang, w, h: realLen, kind: o.kind || 'pink', start: f.t, end: t1, damage: o.damage ?? 1, melee: true,
    onImpact: (hit) => { o.onImpact && o.onImpact(hit); } });
  // she travels the lane in the last part of the wind-up, arriving on the beat
  f.after(Math.max(0, beats * f.beat - (o.travel ?? 0.16)), () => b.moveTo(ex, ez, o.travel ?? 0.16, { easing: 'in' }));
}

// a circle around her that lands `beats` later
export function slam(f, o = {}) {
  const b = f.boss, beats = o.beats ?? 2, t1 = f.t + beats * f.beat;
  o.windup && o.windup(t1);
  area(f, { shape: 'circle', x: b.x, z: b.z, w: o.r ?? 3.2, kind: o.kind || 'white', start: f.t, end: t1, damage: o.damage ?? 1, melee: true, follow: o.follow ? () => ({ x: b.x, z: b.z }) : null, onImpact: o.onImpact });
}

// a wedge in front of her toward the player
export function sweep(f, o = {}) {
  const b = f.boss, beats = o.beats ?? 1.5, t1 = f.t + beats * f.beat;
  const ang = o.angle ?? toward(b, f.player);
  b.faceNow(f.player.x, f.player.z);
  o.windup && o.windup(t1);
  area(f, { shape: 'cone', x: b.x, z: b.z, angle: ang, w: o.r ?? 4.2, param: (o.arc ?? 70) * Math.PI / 360, kind: o.kind || 'pink', start: f.t, end: t1, damage: o.damage ?? 1, melee: true, onImpact: o.onImpact });
}

// a mark follows you for `beats`, freezes for `freeze` beats, then strikes where it stopped (the selfie flash)
export function mark(f, o = {}) {
  const beats = o.beats ?? 2, freeze = o.freeze ?? 0.5, r = o.r ?? 1.4;
  const tFreeze = f.t + beats * f.beat, t1 = tFreeze + freeze * f.beat;
  let fx = f.player.x, fz = f.player.z;
  const tg = f.tele.add({ shape: 'circle', x: fx, z: fz, w: r, kind: o.kind || 'white', start: f.t, end: t1,
    follow: () => { if (f.t < tFreeze) { fx = f.player.x; fz = f.player.z; } return { x: fx, z: fz }; } });
  f.cue(o.kind || 'white', f.player);
  f.after(t1 - f.t, () => { if (tg.dead) return; tg.dead = true; area(f, { shape: 'circle', x: fx, z: fz, w: r, kind: o.kind || 'white', start: f.t - 0.01, end: f.t, damage: o.damage ?? 1, onImpact: o.onImpact, noTele: true }); });
}

// a sweeping beam: a lane anchored at `from` rotating from angle a0 to a1 over `beats` (live the whole time)
export function beam(f, o = {}) {
  const src = originOf(f, o.from), beats = o.beats ?? 2, warm = o.warm ?? 1;
  const a0 = o.a0 ?? toward(src, f.player) - 0.9, a1 = o.a1 ?? a0 + 1.8, w = o.w ?? 0.55, h = o.h ?? 18;
  const tOn = f.t + warm * f.beat, tOff = tOn + beats * f.beat;
  const g = f.tele.add({ shape: 'rect', x: src.x, z: src.z, angle: a0, w, h, kind: o.kind || 'white', start: f.t, end: tOn });
  f.addBeam({ src, a0, a1, w, h, tOn, tOff, kind: o.kind || 'white', damage: o.damage ?? 1, tele: g });
  f.cue(o.kind || 'white', src);
}

// a LOB: she throws something in a high arc to a circle on the floor, landing at `end` (song time) or `beats`
// from now. PINK: catch it as it lands (inside the circle) and it goes back to her gold (back: its damage).
// WHITE (FINAL SALE...): it can't be caught, only dodged. Uncaught, it hurts if you're under it and is spent;
// if you aren't, onLand(hit, at) opens it (a burst, a puddle, nothing). Returns the landing shape.
// o: { at {x,z} (default: YOU now, snapped), from, fromY, end | beats, r (1.1), shape ('card'), size (0.45),
//      color, kind, damage, back (18), peak (m), mesh (a 3D thing that flies along; removed on landing),
//      onCaught(projectile back), onLand(hit, at) }
export function lob(f, o = {}) {
  const src = originOf(f, o.from);
  const at = o.at ? { x: o.at.x, z: o.at.z } : { x: f.player.x, z: f.player.z };
  const kind = o.kind || 'pink', r = o.r ?? 1.1;
  const t0 = f.t, t1 = o.end ?? t0 + (o.beats ?? 2) * f.beat, dur = Math.max(0.15, t1 - t0);
  const sx = src.x, sz = src.z, sy = o.fromY ?? 1.7, peak = o.peak ?? Math.min(6, 2.2 + dur * 1.5);
  const place = (q, k) => { q.x = sx + (at.x - sx) * k; q.z = sz + (at.z - sz) * k; q.y = sy + (0.35 - sy) * k + 4 * peak * k * (1 - k); };
  const mesh = o.mesh || null;
  if (mesh) { f.scene.add(mesh); }
  const p = f.proj.spawn({ x: sx, z: sz, y: sy, angle: 0, speed: 0, kind, shape: o.shape || 'card', size: o.size ?? 0.45, color: o.color, life: dur + 0.08, owner: 'deco', spin: o.spin ?? 2.5, parryable: false,
    fn: (q) => { const k = Math.min(1, Math.max(0, (f.t - t0) / dur)); place(q, k); if (mesh) { mesh.position.set(q.x, q.y, q.z); mesh.rotation.y += 0.05; mesh.rotation.x = Math.sin(k * Math.PI) * 0.6; } } });
  if (kind === 'pink' && !o.silent) f.sfx.fire && f.sfx.fire(o.shape || 'card', f.pan(sx), kind);
  return area(f, { shape: 'circle', x: at.x, z: at.z, w: r, kind, hard: kind === 'white', start: t0, end: t1, damage: o.damage ?? 1, silent: o.silentCue, sound: o.sound,
    onFizzle: () => { if (p) p.dead = true; if (mesh) f.scene.remove(mesh); },
    onImpact: (hit, sh) => {
      if (p) p.dead = true;
      if (mesh) f.scene.remove(mesh);
      if (hit === 'parried') {
        const pl = f.player, b = f.boss;
        const q = f.proj.spawn({ x: pl.x, z: pl.z, y: 1.3, angle: toward(pl, b), speed: o.backSpeed ?? 17, kind: 'gold', shape: o.shape || 'card', size: (o.size ?? 0.45) * 1.1,
          owner: 'you', life: 3, homing: 7, target: () => b, spin: 6 });
        if (q) q.dmgBack = f.lastCatch === 'perfect' ? (o.backPerfect ?? Math.round((o.back ?? 18) * 1.35)) : (o.back ?? 18);
        o.onCaught && o.onCaught(q, sh);
      } else o.onLand && o.onLand(hit, sh);
    } });
}

// ---------------- the core resolver ----------------
// an area that lands at `end`: draws its telegraph from `start`; at `end` hurts the player if inside,
// unless they dash through it (near miss) or, if PINK, catch/parry at the impact.
export function area(f, o) {
  o = blockable(o);
  const sh = { shape: o.shape, x: o.x, z: o.z, angle: o.angle || 0, w: o.w, h: o.h ?? o.w, param: o.param ?? 0.5 };
  let g = null;
  if (!o.noTele) {
    // ENCORE: the same impact on the same word, less warning
    const s0 = o.start ?? f.t, start = f.encoreMode ? o.end - (o.end - s0) * 0.72 : s0;
    g = f.tele.add({ ...sh, kind: o.kind, start, end: o.end, alphaK: o.alphaK, flash: o.flash, follow: o.follow ? () => { const p = o.follow(); sh.x = p.x; sh.z = p.z; if (p.angle !== undefined) sh.angle = p.angle; return p; } : null });
    if (!o.silent) f.cue(o.kind, sh);
    sh.tele = g;
  }
  f.after(Math.max(0, o.end - f.t), () => {
    // nothing lands that you can't see: its telegraph was cleared (her spotlight fizzle) or never drawn
    if (g && g.dead) { o.onFizzle && o.onFizzle(sh); return; }
    const hit = f.resolveArea(sh, o);
    o.onImpact && o.onImpact(hit, sh);
    if (o.sound !== false) f.sfx.impactArea && f.sfx.impactArea(o.kind, f.pan(sh.x), hit);
  });
  return sh;
}

const clampX = (f, x) => Math.max(f.bounds.minX + 0.6, Math.min(f.bounds.maxX - 0.6, x));
const clampZ = (f, z) => Math.max(f.bounds.minZ + 0.6, Math.min(f.bounds.maxZ - 0.6, z));
export { toward, clampX, clampZ };
