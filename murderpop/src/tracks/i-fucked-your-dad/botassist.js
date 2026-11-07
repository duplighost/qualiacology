// Test-only: the shared autopilot (src/game/autopilot.js) reads telegraphs and shots, but not this set's standing
// hazards (the burning bed, the ring of fire, the yard on fire, the table, the presents' fires). This wraps its
// think() from here so it steers round them the way a player who can see fire would: it never walks or dashes
// into one, gets out of the block once its fill starts, and dashes across the ring of fire. It does nothing
// unless ?auto is on. (A shared `arena.hazards` the autopilot could read would replace this: see the report.)
import { BLOCK, TIME } from './set.js';

const DIRS = Array.from({ length: 16 }, (_, i) => { const a = i / 16 * Math.PI * 2; return { x: Math.sin(a), y: Math.cos(a) }; });

export function assistBot(f, set, sloppy = false) {
  const auto = f.app && f.app.auto;
  if (!auto || auto._yardAssist) return;
  auto._yardAssist = true;
  const think = auto.think.bind(auto);
  auto.think = () => {
    think();
    const pl = f.player, t = f.t;
    if (!pl || f.state !== 'play') return;
    const inBlock = (x, z, m = 0) => x > BLOCK.x0 - m && x < BLOCK.x1 + m && z > BLOCK.z0 - m && z < BLOCK.z1 + m;
    const blockLive = t > TIME.strike + (sloppy ? 4.0 : 0.4) && t < TIME.embers;
    const bad = (x, z) => !!set.hazardAt(x, z, 0.45) || (blockLive && inBlock(x, z, 0.35)) || x < f.bounds.minX + 0.3 || x > f.bounds.maxX - 0.3 || z < f.bounds.minZ + 0.3 || z > f.bounds.maxZ - 0.3;
    const clear = (d, len) => { for (let s = 0.5; s <= len; s += 0.5) if (bad(pl.x + d.x * s, pl.z + d.y * s)) return false; return true; };
    const dashing = auto.pressed.includes('dash');
    // in the block once it's live: out by the nearest edge (dash across the ring of fire)
    if (blockLive && inBlock(pl.x, pl.z, 0.4)) {
      const c = [[BLOCK.x0 - 1.0, pl.z], [BLOCK.x1 + 1.0, pl.z], [pl.x, BLOCK.z1 + 1.0]];
      let b = c[0], bd = 1e9; for (const q of c) { const d = Math.hypot(q[0] - pl.x, q[1] - pl.z); if (d < bd) { bd = d; b = q; } }
      const l = Math.hypot(b[0] - pl.x, b[1] - pl.z) || 1;
      auto.mv = { x: (b[0] - pl.x) / l, y: (b[1] - pl.z) / l };
      if (t > TIME.fuse && bd < 1.8 && pl.dashCharges > 0 && !sloppy && !dashing) auto.press('dash');
      return;
    }
    let mv = auto.mv;
    const moving = !!(mv.x || mv.y);
    // a dash goes where you're steering, or where you face: make sure that's not into a fire
    if (dashing) {
      const d = moving ? mv : { x: Math.sin(pl.facing), y: Math.cos(pl.facing) };
      if (!clear(d, 4.5)) {
        let best = null, bs = -1e9;
        for (const q of DIRS) { if (!clear(q, 4.5)) continue; const s = q.x * d.x + q.y * d.y * 0.5 - (q.y < 0 && blockLive ? 0.5 : 0); if (s > bs) { bs = s; best = q; } }
        if (best) mv = best; else { const i = auto.pressed.indexOf('dash'); if (i >= 0) auto.pressed.splice(i, 1); }
      }
    } else if (moving && !clear(mv, 0.8)) {
      // slide along it instead
      let best = null, bs = -1e9;
      for (const q of DIRS) { if (!clear(q, 0.8)) continue; const s = q.x * mv.x + q.y * mv.y; if (s > bs) { bs = s; best = q; } }
      mv = best && bs > -0.2 ? best : { x: 0, y: 0 };
    }
    auto.mv = mv;
  };
}
