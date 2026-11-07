// The test bot (src/game/autopilot.js) reads telegraphs and runs from them; an inverse is the one attack where safety
// is a place to run TO. This teaches the bot to read the holes (a sloppy bot reads them late, and sometimes not at all).
// Only the bot: Alex's hands never pass through here.
import { FEEL } from '../../game/player.js';

export function coachBot(f, R) {
  const bot = f.input;
  if (!bot || typeof bot.think !== 'function' || !bot.skill || bot._rpdCoached) return;
  bot._rpdCoached = true;
  const sk = bot.skill;
  const think = bot.think.bind(bot);
  bot.think = () => {
    think();
    const iv = R.lies.inv;
    if (!iv || iv.resolved || f.suppress) return;
    const t = f.t, pl = f.player;
    if (t < iv.start + sk.react * 4) return;
    if (iv._botSkip === undefined) iv._botSkip = bot.rand() < sk.miss * 1.25;   // a sloppy player misreads the floor
    if (iv._botSkip) return;
    let best = null, bd = 1e9;
    for (const h of iv.holes) {
      let p;
      if (h.strip) p = { x: h.x, z: pl.z };
      else {
        p = { x: h.x, z: h.z };
        if (h.solid) { const dx = pl.x - h.x, dz = pl.z - h.z, l = Math.hypot(dx, dz) || 1; p = { x: h.x + dx / l * (h.solid + 0.7), z: h.z + dz / l * (h.solid + 0.7) }; }
      }
      const d = Math.hypot(p.x - pl.x, p.z - pl.z);
      if (d < bd) { bd = d; best = p; }
    }
    if (!best) return;
    const safe = R.lies.inHole(pl.x, pl.z, FEEL.radius + 0.4);
    const dx = best.x - pl.x, dz = best.z - pl.z, l = Math.hypot(dx, dz) || 1;
    if (!safe) {
      bot.mv = { x: dx / l, y: dz / l };
      if (bd > 4 && iv.end - t < 0.9 && pl.dashCharges > 0 && !bot.pressed.includes('dash')) bot.press('dash');
    } else {
      // inside: don't let anything else talk it out of the hole
      const nx = pl.x + bot.mv.x * 0.5, nz = pl.z + bot.mv.y * 0.5;
      if (!R.lies.inHole(nx, nz, FEEL.radius + 0.3)) bot.mv = { x: dx / l * 0.3, y: dz / l * 0.3 };
      bot.pressed = bot.pressed.filter((a) => a !== 'dash');
    }
  };
}
