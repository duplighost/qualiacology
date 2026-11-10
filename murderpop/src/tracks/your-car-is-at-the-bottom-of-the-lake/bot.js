// What the test bot needs to know about her lake that the floor can't tell it: at the first stop the only clear floor is
// the pier (and the way onto it is its ramp); at the second, the eye beside her; YOUR headlights and her pour are
// live hazards with shadows. A good bot moves when the bass goes. A sloppy one plays the stops like a first-timer who
// reads only the floor: white means get away from it (toward the house, away from her), which is exactly wrong.
import { onPier, pierPoint, PIER, SPOTS } from './lake.js';
import { S } from './song.js';

export function teachBot(f, L) {
  const bot = f.input;
  if (!bot || typeof bot.think !== 'function' || bot._lake) return;
  bot._lake = true;
  const base = bot.think.bind(bot);
  const sloppy = (bot.skill && bot.skill.miss) > 0.2;
  const go = (pl, x, z) => { const dx = x - pl.x, dz = z - pl.z, l = Math.hypot(dx, dz); if (l < 0.15) return { x: 0, y: 0 }; return { x: dx / l, y: dz / l }; };
  bot.think = () => {
    base();
    const t = f.t, pl = f.player, b = f.boss;
    if (!pl || !b || f.state !== 'play') return;
    // her death scene: the shared bot presses what it asks for; nothing of the yard's to steer round
    if (f.exec && f.exec.on) return;
    const panic = () => { bot.pressed = bot.pressed.filter((a) => a !== 'strike'); };
    if (sloppy && t >= S.still + 0.8 && t < S.surge + 0.05) { panic(); bot.mv = go(pl, pl.x * 0.6 - 1, -6.0); return; }
    if (sloppy && t >= S.white2 + 0.35 && t < S.under + 0.05) { panic(); const dx = pl.x - b.x, dz = pl.z - b.z, l = Math.hypot(dx, dz) || 1; bot.mv = { x: dx / l, y: dz / l }; return; }
    // the first stop: onto the pier by its ramp, and stay on it
    const s1 = S.bassGo1;
    if (!sloppy && t >= s1 && t < S.surge + 0.05) {
      const s = (pl.x - PIER.a.x) * PIER.u.x + (pl.z - PIER.a.z) * PIER.u.z;
      const across = (pl.x - PIER.a.x) * PIER.n.x + (pl.z - PIER.a.z) * PIER.n.z;
      let goal;
      // (to the foot of the ramp, square on, then up it: the foot is at -0.9, so "short of the foot" is anything before
      // -1.2, or it would stand at the foot aiming at where it already is)
      if (onPier(pl.x, pl.z) && s > 0.4) goal = pierPoint(Math.min(2.9, Math.max(1.6, s)), 0);
      else if (Math.abs(across) > 0.5 || s < -1.2) goal = pierPoint(-0.9, 0);
      else goal = pierPoint(2.4, 0);
      bot.mv = go(pl, goal.x, goal.z);
      return;
    }
    // the second stop: into the eye beside her
    const s2 = S.rise;
    if (!sloppy && t >= s2 && t < S.under + 0.05) {
      const eye = { x: b.x + 1.0, z: b.z + 0.9 };
      bot.mv = go(pl, eye.x, eye.z);
      if (!sloppy && Math.hypot(b.x - pl.x, b.z - pl.z) < 2.4 && t < S.under - 0.3 && Math.random() < 0.3) bot.press('strike');
      return;
    }
    // live hazards: get out the way it isn't going
    for (const hz of f.lakeHz) {
      if (t < hz.start || t > hz.end) continue;
      const soon = hz.test(pl.x, pl.z, t + 0.12, 0.85) || hz.test(pl.x, pl.z, t + 0.3, 0.85);
      if (!soon) continue;
      const e = hz.escape(pl.x, pl.z, t);
      if (e) { bot.mv = { x: e.x, y: e.z }; if (hz.test(pl.x, pl.z, t + 0.06, 0.5) && pl.dashCharges > 0 && !sloppy) bot.press('dash'); }
      return;
    }
    // round things, not into them: walking and getting nowhere (the stick shift and the depth posts stand across the
    // yard) means going round, one way and then the other
    // (only while it's walking at her, never while it's getting out of something)
    const k = bot._unstick || (bot._unstick = { x: pl.x, z: pl.z, t, side: 1, until: -1 });
    const want = Math.hypot(bot.mv.x, bot.mv.y), db = Math.hypot(b.x - pl.x, b.z - pl.z) || 1;
    const approach = want > 0.3 && pl.state === 'free' && db > 2.7 && (bot.mv.x * (b.x - pl.x) + bot.mv.y * (b.z - pl.z)) / (want * db) > 0.8;
    if (!approach) { k.x = pl.x; k.z = pl.z; k.t = t; k.until = -1; return; }
    if (t < k.until) { const ux = bot.mv.x / want, uz = bot.mv.y / want; bot.mv = { x: ux * 0.35 - uz * k.side, y: uz * 0.35 + ux * k.side }; return; }
    if (Math.hypot(pl.x - k.x, pl.z - k.z) > 0.25 || t < k.t) { k.x = pl.x; k.z = pl.z; k.t = t; return; }
    if (t - k.t > 0.5) { k.until = t + 0.6; k.side = -k.side; k.t = t; }
  };
}
