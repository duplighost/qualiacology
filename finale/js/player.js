// FINALE — the player. Fast, light, immediately lethal, before you understand anything.
//
// Accel resolves in 6.5 frames — enough that the ship has weight, not enough to ever read as float.
// There is no fire button: the gun is always on from tick 0. FLARE has NO invulnerability, on
// purpose. It is an offensive cascade-steering tool, not an escape hatch. Escape is MISFIRE, and
// MISFIRE is limited. Blur that line and the whole risk economy collapses.
window.Player = (() => {
  const p = {
    x: CFG.W / 2, y: CFG.H * 0.74, prevX: CFG.W / 2, prevY: CFG.H * 0.74, vx: 0, vy: 0,
    lives: CFG.LIVES, invuln: 0, dead: 0,
    focus: false, fireT: 0, recoil: 0,
    flareT: 0, flareCd: 0, flareVx: 0, flareVy: 0,
    misfires: CFG.MISFIRE_START, misfireEarned: 0,
    trailX: new Float32Array(8), trailY: new Float32Array(8), trailN: 0,
    hitThisAct: false,
  };
  let env = null;
  function bind(e) { env = e; }

  function reset(full) {
    p.x = p.prevX = CFG.W / 2; p.y = p.prevY = CFG.H * 0.74; p.vx = p.vy = 0;
    p.invuln = 0; p.dead = 0; p.fireT = 0; p.recoil = 0;
    p.flareT = 0; p.flareCd = 0;
    if (full) { p.lives = CFG.LIVES; p.misfires = CFG.MISFIRE_START; p.misfireEarned = 0; p.hitThisAct = false; }
    p.trailN = 0;
  }

  function move(intent, dt) {
    const top = p.focus ? CFG.FOCUS_SPEED : CFG.TOP_SPEED;
    p.prevX = p.x; p.prevY = p.y;         // collide() sweeps this segment so a 35px/frame dash can't tunnel
    if (p.flareT > 0) {
      // dash overrides steering entirely — committing is the point
      p.x += p.flareVx * dt; p.y += p.flareVy * dt;
      p.flareT -= dt;
    } else if (intent.mouse) {
      // 1:1 absolute pointer, no smoothing, but capped per frame so mouse can never out-run keys
      let dx = intent.mx - p.x, dy = intent.my - p.y;
      const m = Math.hypot(dx, dy);
      const cap = (p.focus ? CFG.FOCUS_SPEED : CFG.TOP_SPEED) * dt;
      if (m > cap && m > 0) { dx = dx / m * cap; dy = dy / m * cap; }
      p.x += dx; p.y += dy;
      p.vx = dt > 0 ? dx / dt : 0; p.vy = dt > 0 ? dy / dt : 0;  // real velocity: petals inherit it
    } else {
      let dx = intent.dx, dy = intent.dy;
      if (dx && dy) { const k = Math.SQRT1_2; dx *= k; dy *= k; }   // normalised diagonals
      const tx = dx * top, ty = dy * top;
      const ax = (dx === 0 ? CFG.DECEL : CFG.ACCEL) * dt;
      const ay = (dy === 0 ? CFG.DECEL : CFG.ACCEL) * dt;
      p.vx = U.approach(p.vx, tx, ax);
      p.vy = U.approach(p.vy, ty, ay);
      p.x += p.vx * dt; p.y += p.vy * dt;
    }
    p.x = U.clamp(p.x, 10, CFG.W - 10);
    p.y = U.clamp(p.y, 26, CFG.H - 14);
    // Reconcile reported velocity with ACTUAL displacement after the clamp. Otherwise a player parked
    // against a wall still reports full 520 px/s, and PETAL_INHERIT rakes every bloom at 234 px/s for
    // free — the aim without the dodge, which subverts the line the whole design is built on.
    if (dt > 0) { p.vx = (p.x - p.prevX) / dt; p.vy = (p.y - p.prevY) / dt; }
  }

  const OFFS2 = new Float32Array([-CFG.FIRE_OFFSET, CFG.FIRE_OFFSET]);
  const OFFS4 = new Float32Array([-16, -CFG.FIRE_OFFSET, CFG.FIRE_OFFSET, 16]);
  const FIRE_OPT = { r: 4, dmg: CFG.FIRE_DMG, life: 1.6, pierce: 1 };  // reused: fire() runs 10x/s all run
  function fire(bul, dt) {
    p.fireT -= dt;
    if (p.fireT > 0) return;
    p.fireT += CFG.FIRE_INTERVAL;
    const twin = Fuse.tier >= CFG.FIRE_TIER_DOUBLE;    // waves buy boss power: FINALE tier doubles the gun
    const offs = twin ? OFFS4 : OFFS2;
    for (let i = 0; i < offs.length; i++) {
      bul.spawn(p.x + offs[i], p.y - 10, 0, -CFG.FIRE_SPEED, Pool.T.PEA, Pool.FACTION.PLAYER, FIRE_OPT);
    }
    p.recoil = 1.2;
    env.audio.shot();
  }

  function flare(bul) {
    if (p.flareCd > 0 || p.flareT > 0) return false;
    let dx = p.vx, dy = p.vy;
    if (Math.abs(dx) < 1 && Math.abs(dy) < 1) { dx = 0; dy = -1; }
    const m = Math.hypot(dx, dy); dx /= m; dy /= m;
    const spd = CFG.FLARE_DIST / CFG.FLARE_TIME;
    p.flareVx = dx * spd; p.flareVy = dy * spd;
    p.flareT = CFG.FLARE_TIME; p.flareCd = CFG.FLARE_CD;
    // shove nearby petals along the dash vector — this is how you rake a cascade into a target
    const R2 = CFG.FLARE_PETAL_R * CFG.FLARE_PETAL_R;
    for (let i = 0; i < bul.n; i++) {
      if (bul.faction[i] !== Pool.FACTION.PLAYER || bul.type[i] !== Pool.T.PETAL) continue;
      const ddx = bul.x[i] - p.x, ddy = bul.y[i] - p.y;
      if (ddx * ddx + ddy * ddy > R2) continue;
      bul.vx[i] += dx * CFG.FLARE_PETAL_BOOST;
      bul.vy[i] += dy * CFG.FLARE_PETAL_BOOST;
    }
    env.audio.flare();
    env.fx.shake(2.0);
    env.emit('flare', { x: p.x, y: p.y });
    return true;
  }

  // MISFIRE: the panic button. Every open window instantly blue-blooms, and every enemy bullet near
  // you becomes a petal. One of only two authored exceptions to "petals never clear enemy bullets".
  function misfire(bul) {
    if (p.misfires <= 0) return false;
    p.misfires--;
    p.invuln = Math.max(p.invuln, CFG.MISFIRE_IFRAMES);
    env.fx.hitstop(CFG.MISFIRE_HITSTOP);
    env.fx.shake(9);
    env.fx.bloomFlash(p.x, p.y, 60, true);
    env.audio.misfire();

    for (let i = 0; i < Enemies.list.length; i++) {
      const e = Enemies.list[i];
      if (e.alive && e.fuseOpen) { Fuse.closeWindow(e); e.alive = false; Fuse.blueBloom(e); }
    }
    const R2 = CFG.MISFIRE_CONVERT_R * CFG.MISFIRE_CONVERT_R;
    const stage = Fuse.petalStage(), pierce = Fuse.chainPierce();
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== Pool.FACTION.ENEMY) continue;
      if (bul.flags[i] & Pool.F.AMBER) continue;              // amber never converts. Ever.
      const dx = bul.x[i] - p.x, dy = bul.y[i] - p.y;
      if (dx * dx + dy * dy > R2) continue;
      const sp = Math.hypot(bul.vx[i], bul.vy[i]) || 200;
      const a = Math.atan2(dy, dx);
      bul.vx[i] = U.fcos(a) * sp * 1.4; bul.vy[i] = U.fsin(a) * sp * 1.4;
      bul.faction[i] = Pool.FACTION.PLAYER; bul.type[i] = Pool.T.PETAL;
      bul.dmg[i] = CFG.PETAL_DMG; bul.stage[i] = stage; bul.pierce[i] = pierce;
      bul.life[i] = CFG.PETAL_LIFE; bul.age[i] = 0; bul.beh[i] = 0; bul.flags[i] = 0;
    }
    env.emit('misfire', { x: p.x, y: p.y, left: p.misfires });
    return true;
  }

  function hit() {
    if (p.invuln > 0 || p.dead > 0) return false;
    p.lives--;
    p.hitThisAct = true;
    p.dead = CFG.RESPAWN_LOCK;
    p.invuln = CFG.IFRAMES + CFG.RESPAWN_LOCK;
    p.vx = p.vy = 0; p.flareT = 0;
    Fuse.onPlayerHit();
    env.fx.hitstop(CFG.HITSTOP_DEATH);
    env.fx.shake(10);
    env.fx.deathBurst(p.x, p.y);
    env.audio.death();
    env.emit('hit', { lives: p.lives, x: p.x, y: p.y });
    if (p.lives <= 0) env.emit('death', {});
    return true;
  }

  function update(intent, bul, dt) {
    p.focus = intent.focus;
    if (p.dead > 0) { p.dead -= dt; }
    else { move(intent, dt); fire(bul, dt); }
    if (p.invuln > 0) p.invuln -= dt;
    if (p.flareCd > 0) p.flareCd -= dt;
    if (p.recoil > 0) p.recoil = Math.max(0, p.recoil - dt * 8);
    // earn MISFIRE charges from lifetime chain links — aggression refills the panic button
    const earned = (Fuse.chainLifetime / CFG.MISFIRE_CHAIN_REFILL) | 0;
    if (earned > p.misfireEarned) {
      p.misfireEarned = earned;
      if (p.misfires < CFG.MISFIRE_MAX) { p.misfires++; env.emit('misfire_gain', { left: p.misfires }); }
    }
    // trail ring buffer (cosmetic)
    p.trailN = (p.trailN + 1) & 7;
    p.trailX[p.trailN] = p.x; p.trailY[p.trailN] = p.y;
  }

  function draw(ctx) {
    const C = CFG.COL;
    const blink = p.invuln > 0 && ((p.invuln * 20) | 0) % 2 === 0;
    const sp = Math.hypot(p.vx, p.vy) / CFG.TOP_SPEED;

    // trail
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 1; k < 8; k++) {
      const i = (p.trailN - k + 8) & 7;
      const a = (1 - k / 8) * 0.34 * U.clamp(sp, 0.15, 1);
      if (a <= 0.01) continue;
      ctx.fillStyle = U.hexa(C.mineA, a);
      const r = 5 * (1 - k / 9);
      ctx.fillRect(p.trailX[i] - r, p.trailY[i] - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';

    if (p.dead > 0) return;

    ctx.save();
    ctx.translate(p.x, p.y + p.recoil);
    if (!blink) {
      // hull: 26x20 arrowhead
      ctx.fillStyle = C.mineA;
      ctx.beginPath();
      ctx.moveTo(0, -13); ctx.lineTo(9, 8); ctx.lineTo(0, 4); ctx.lineTo(-9, 8);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(0, -11); ctx.lineTo(3.4, 3); ctx.lineTo(0, 1.2); ctx.lineTo(-3.4, 3);
      ctx.closePath(); ctx.fill();
      // pilot light
      const blinkOn = (Math.sin(performance.now() * 0.0088) > 0);
      if (blinkOn) { ctx.fillStyle = C.accent; ctx.fillRect(-1.2, 5, 2.4, 2.4); }
    }
    // FOCUS shows the hitbox ring larger — the read you want when threading
    if (p.focus) {
      ctx.strokeStyle = U.hexa('#00E5FF', 0.55); ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(0, 0, 12, 0, U.TAU); ctx.stroke();
    }
    // THE HITBOX IS ALWAYS DRAWN. Blink the hull during i-frames, never the dot — losing sight of
    // your own hitbox in a bullet hell is the single most unfair thing a game can do.
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.arc(0, 0, CFG.HITBOX_R, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = '#00E5FF'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(0, 0, CFG.HITBOX_R + 1.6, 0, U.TAU); ctx.stroke();
    ctx.restore();
  }

  return { p, bind, reset, update, draw, flare, misfire, hit };
})();
