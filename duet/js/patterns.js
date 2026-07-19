// DUET — pattern grammar. Pure emitters: given the pool + partner, push bullets. Timing lives in game.js.
// Everything leaves a cyan-width lane (Touhou spacing); speed is capped low, density carries the pressure.
window.Patterns = (() => {
  const { TAU, cos, sin } = { TAU: U.TAU, cos: Math.cos, sin: Math.sin };

  function at(pool, x, y, ang, spd, kind, opts) {
    return pool.spawn(x, y, Math.cos(ang) * spd, Math.sin(ang) * spd, kind, opts);
  }

  // aimed n-way fan centered on the shot toward the player (or a given base angle)
  function aimed(pool, partner, player, count, step, spd, kind, baseAng) {
    const base = (baseAng == null) ? partner.aim(player.x, player.y) : baseAng;
    const start = base - step * (count - 1) / 2;
    for (let i = 0; i < count; i++) at(pool, partner.x, partner.y, start + i * step, spd, kind || 'rose');
  }

  // evenly-spaced ring of k, rotated by phase
  function ring(pool, partner, k, spd, phase, kind) {
    for (let i = 0; i < k; i++) at(pool, partner.x, partner.y, phase + TAU * i / k, spd, kind || 'rose');
  }

  // one spiral increment across `arms` arms at current angle theta (caller advances theta each frame)
  function spiralStep(pool, partner, arms, theta, spd, kind) {
    for (let arm = 0; arm < arms; arm++) at(pool, partner.x, partner.y, theta + TAU * arm / arms, spd, kind || 'rose');
  }

  // ring of decelerating "petals" that brake to a near-stop then drift back out (a held chord)
  function decelPetals(pool, partner, count, spd, phase) {
    for (let i = 0; i < count; i++)
      at(pool, partner.x, partner.y, phase + TAU * i / count, spd, 'rose',
         { beh: 1, decK: 0.985, accK: 1.03, minSpeed: 0.4 });
  }

  // one stream bullet along a telegraphed swept edge (caller advances the angle)
  function laserBullet(pool, partner, ang, spd) {
    at(pool, partner.x, partner.y, ang, spd, 'rose', { r: 5 });
  }

  // curtain rain: a drop from the top edge falling straight down
  function rainDrop(pool, x, spd) { pool.spawn(x, -10, 0, spd, 'rose', { r: 6 }); }

  // fast aimed needles (the only fast rose; always telegraphed by the caller)
  function needles(pool, partner, player, count, step, spd) {
    aimed(pool, partner, player, count, step, spd, 'needle');
  }

  // Movement V: a recorded point fires a slow aimed 2-way at the LIVE player, in ghost-lilac
  function ghostShot(pool, gx, gy, player, spd, step) {
    const base = Math.atan2(player.y - gy, player.x - gx);
    at(pool, gx, gy, base - step / 2, spd, 'ghost');
    at(pool, gx, gy, base + step / 2, spd, 'ghost');
  }

  // named dispatch for the debug API (spawnPattern)
  function spawn(name, ctx, opts) {
    const { pool, partner, player } = ctx; opts = opts || {};
    const spd = opts.speed;
    switch (name) {
      case 'cantabile5way': aimed(pool, partner, player, 5, opts.step || 0.16, spd || 2.3); break;
      case 'cantabile3way': aimed(pool, partner, player, 3, opts.step || 0.18, spd || 2.2); break;
      case 'lanternRing': ring(pool, partner, opts.k || 16, spd || 2.2, opts.phase || 0); break;
      case 'decelPetals': decelPetals(pool, partner, opts.count || 8, spd || 2.4, opts.phase || 0); break;
      case 'helixSpiral': spiralStep(pool, partner, opts.arms || 3, opts.theta || 0, spd || 2.6); break;
      case 'curtainLaser': laserBullet(pool, partner, opts.angle || Math.PI / 2, spd || CFG.LASER_STREAM_SPEED); break;
      case 'curtainRain': rainDrop(pool, opts.x != null ? opts.x : 80 + U.rnd() * 1120, spd || 2.2); break;
      case 'needles': needles(pool, partner, player, opts.count || 9, opts.step || 0.10, spd || CFG.NEEDLE_SPEED); break;
      case 'ghostPlayback': ghostShot(pool, opts.x || partner.x, opts.y || partner.y, player, spd || 2.1, opts.step || 0.25); break;
      default: return false;
    }
    return true;
  }

  return { at, aimed, ring, spiralStep, decelPetals, laserBullet, rainDrop, needles, ghostShot, spawn };
})();
