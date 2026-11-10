// What's coming at YOU, as a player reads it: everything of hers that will land on you if you stay where you are, when
// it lands, and what answers it. The floor draws these as rings closing on YOU (fx/strikes.js notes): a pink ring is
// one to guard (press as it closes and it goes back to her), a striped white one is one to get out from under or
// jump. Step out of a shape and its ring is gone: no ring, nothing is about to hit you.
import { inShape } from './choreo.js';
import { FEEL } from './player.js';

const SHAPES = ['circle', 'ring', 'rect', 'cone', 'arc'];

// [{ tl (seconds until it lands), t1 (song time it lands), kind: 'pink' | 'white', x, z (where it comes from) }], soonest first
export function threats(f, horizon = 1.6) {
  const pl = f.player, t = f.t, out = [];
  if (!pl || f.suppress || f.harmless) return out;
  for (const g of f.tele.list) {
    if (g.dead || g.kind === 'gold') continue;
    const tl = g.end - t;
    if (tl < -0.02 || tl > horizon || t < g.start - 0.001) continue;
    const sh = { shape: SHAPES[g.shape] || g.shape, x: g.x, z: g.z, angle: g.angle, w: g.w, h: g.h, param: g.param };
    if (!inShape(sh, pl.x, pl.z, FEEL.radius * 0.8)) continue;
    // where it comes from: a shape drawn on you came from her
    let x = g.x, z = g.z;
    if (Math.hypot(x - pl.x, z - pl.z) < 0.9 && f.boss) { x = f.boss.x; z = f.boss.z; }
    out.push({ tl, t1: g.end, kind: g.dodge ? 'white' : 'pink', x, z, src: g });
  }
  for (const q of f.proj.list) {
    if (q.owner !== 'boss' || q.dead || q.age < q.delay) continue;
    const dx = pl.x - q.x, dz = pl.z - q.z, d = Math.hypot(dx, dz);
    const vx = Math.sin(q.angle) * q.speed, vz = Math.cos(q.angle) * q.speed;
    const closing = (dx * vx + dz * vz) / Math.max(0.01, d);
    if (closing <= 0.5) continue;
    const tl = (d - q.radius - FEEL.radius) / closing;
    if (tl > Math.min(horizon, 1.1) || tl < -0.02) continue;
    const perp = Math.abs(dx * vz - dz * vx) / Math.max(0.1, q.speed);
    if (perp > q.radius + FEEL.radius + 0.12) continue;
    out.push({ tl: Math.max(0, tl), t1: t + Math.max(0, tl), kind: q.parryable ? 'pink' : 'white', x: q.x, z: q.z, src: q, shot: true });
  }
  for (const w of f.waves || []) {
    if (w.hit) continue;
    const d = Math.hypot(pl.x - w.x, pl.z - w.z), gap = d - w.r;
    if (gap < -w.band || gap > w.speed * horizon) continue;
    const tl = Math.max(0, gap / Math.max(0.1, w.speed));
    out.push({ tl, t1: t + tl, kind: 'white', x: w.x, z: w.z, src: w, wave: true });
  }
  for (const bm of f.beams || []) {
    if (t > bm.tOff) continue;
    const dur = Math.max(0.01, bm.tOff - bm.tOn);
    for (let dt = Math.max(0, bm.tOn - t); dt < Math.min(horizon, bm.tOff - t); dt += 0.06) {
      const k = Math.min(1, Math.max(0, (t + dt - bm.tOn) / dur)), ang = bm.a0 + (bm.a1 - bm.a0) * k;
      if (inShape({ shape: 'rect', x: bm.src.x, z: bm.src.z, angle: ang, w: bm.w, h: bm.h }, pl.x, pl.z, FEEL.radius * 0.7)) { out.push({ tl: dt, t1: t + dt, kind: 'white', x: bm.src.x, z: bm.src.z, src: bm, beam: true }); break; }
    }
  }
  out.sort((a, b) => a.tl - b.tl);
  return out;
}
