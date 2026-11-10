// The test bot, taught this court's rule (it stands in for a player who has learned the fight; it is never Alex):
// don't strike her while she's PRETTY unless a counter is armed or she's open; when nothing is landing on you,
// go and strike the evidence on the floor; catch the pinks for gold. The sloppy bot knows the rule too, but
// forgets it now and then.
import * as THREE from 'three';
import { inShape } from '../../game/choreo.js';
import { FEEL } from '../../game/player.js';

const SHAPES = ['circle', 'ring', 'rect', 'cone', 'arc'];
function threatened(f, x, z, horizon) {
  const t = f.t;
  for (const g of f.tele.list) {
    if (g.dead) continue;
    const tl = g.end - t; if (tl < -0.05 || tl > horizon) continue;
    const pink = g.kind ? g.kind === 'pink' : g.color.r > g.color.b * 1.6 && g.color.g < 1.2;
    if (pink || g.kind === 'dim') continue;   // dim outlines never hurt
    if (inShape({ shape: SHAPES[g.shape] || g.shape, x: g.x, z: g.z, angle: g.angle, w: g.w, h: g.h, param: g.param }, x, z, FEEL.radius + 0.45)) return true;
  }
  for (const q of f.proj.list) {
    if (q.owner !== 'boss' || q.parryable) continue;
    const dx = x - q.x, dz = z - q.z, d = Math.hypot(dx, dz); if (d > 7) continue;
    const vx = Math.sin(q.angle), vz = Math.cos(q.angle);
    if ((dx * vx + dz * vz) <= 0) continue;
    if (Math.abs(dx * vz - dz * vx) < q.radius + FEEL.radius + 0.6) return true;
  }
  for (const hz of (f.ppg && f.ppg.hazards) || []) {
    const o = hz.o; if (f.t < o.t0 - 0.5 || f.t > o.t1) continue;
    const sh = typeof o.shape === 'function' ? o.shape(Math.max(f.t, o.t0)) : o.shape;
    if (sh && inShape(sh, x, z, FEEL.radius + 0.6)) return true;
  }
  return false;
}

export function teachBot(f) {
  const bot = f.input;
  if (!bot || typeof bot.think !== 'function' || bot._ppg) return;
  bot._ppg = true;
  const sloppy = (bot.skill && bot.skill.miss) > 0.2;
  if (sloppy && !new URLSearchParams(location.search).has("ppgteach")) return;   // the sloppy bot hasn't learned the rule
  const base = bot.think.bind(bot);
  const P = new THREE.Vector3();
  const aimAt = (x, z) => { P.set(x, 0, z).project(f.cam.logic); bot.mouse.x = (P.x + 1) / 2; bot.mouse.y = (1 - P.y) / 2; };
  let mind = 0, mindT = -9;
  // a live hazard (the fire, the key's lane, frozen floor) at x, z: the base bot reads only telegraphs, a player sees flames
  const burning = (x, z) => { for (const hz of (f.ppg && f.ppg.hazards) || []) { const o = hz.o; if (f.t < o.t0 - 0.15 || f.t > o.t1) continue; const sh = typeof o.shape === 'function' ? o.shape(Math.min(o.t1, f.t + 0.25)) : o.shape; if (sh && inShape(sh, x, z, FEEL.radius + 0.35)) return true; } return false; };
  bot.think = () => {
    base();
    const pl = f.player, b = f.boss, C = f.court;
    if (!pl || !b || !C || f.state !== 'play' || (f.exec && f.exec.on)) return;
    const t = f.t;
    if (t - mindT > 1.5) { mindT = t; mind = bot.rand(); }
    const canHit = !C.pretty || pl.counterT > 0 || b.state === 'open' || b.state === 'stagger' || b.blinded || b.state === 'desperate';
    const si = bot.pressed.indexOf('strike');
    if (si >= 0 && !canHit && (!sloppy || mind < 0.65)) { bot.pressed.splice(si, 1); bot.pressedAt && bot.pressedAt.splice(si, 1); }
    // never into the fire: out of it by the shortest way, or hold still at its edge
    if (burning(pl.x + bot.mv.x * 0.7, pl.z + bot.mv.y * 0.7)) {
      let best = null;
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, ux = Math.sin(a), uz = Math.cos(a); for (const d of [0.6, 1.2, 1.8]) if (!burning(pl.x + ux * d, pl.z + uz * d)) { if (!best || d < best.d) best = { d, x: ux, y: uz }; break; } }
      bot.mv = best && burning(pl.x, pl.z) ? { x: best.x, y: best.y } : { x: 0, y: 0 };
      return;
    }
    if (threatened(f, pl.x, pl.z, 1.0)) return;
    // evidence on the floor: fetch it (the sloppy bot forgets some of the time)
    let best = null, bd = 1e9;
    for (const e of C.floor) { const d = Math.hypot(e.x - pl.x, e.z - pl.z); if (d < bd && !threatened(f, e.x, e.z, 0.9)) { bd = d; best = e; } }
    if (best && (!sloppy || mind < 0.6)) {
      const dx = best.x - pl.x, dz = best.z - pl.z, d = Math.hypot(dx, dz) || 1;
      // step to it unless the way there is about to be hit
      const sx = pl.x + dx / d * 0.8, sz = pl.z + dz / d * 0.8;
      if (!threatened(f, sx, sz, 0.8)) bot.mv = { x: dx / d, y: dz / d };
      aimAt(best.x, best.z);
      if (d < 1.9 && pl.state !== 'strike') { if (!bot.pressed.includes('strike')) bot.press('strike'); }
      return;
    }
    if (!canHit) {
      // keep a catching distance from her and circle; pinks are caught by the base bot
      const dx = b.x - pl.x, dz = b.z - pl.z, d = Math.hypot(dx, dz) || 1;
      const want = 2.7, push = (d - want) * 0.6;
      bot.mv = { x: (-dz / d) * 0.6 + dx / d * push, y: (dx / d) * 0.6 + dz / d * push };
      const l = Math.hypot(bot.mv.x, bot.mv.y); if (l > 1) bot.mv = { x: bot.mv.x / l, y: bot.mv.y / l };
    }
  };
}
