// DUET — fx. The decorative layer ONLY (§3.5 carve-out): shake, chroma, desaturate, warmth bloom, particles.
// This module is forbidden from touching rose bullets or the cyan core. It paints the room, never the threat.
window.FX = (() => {
  const C = CFG.COL;
  const particles = Ent.makeParticlePool(1500);
  let shake = 0, chroma = 0, desat = 0, flash = 0;
  const cyan = U.hex2rgb(C.core), teal = U.hex2rgb(C.fire), spark = U.hex2rgb(C.spark),
        gold = U.hex2rgb(C.gold), roseC = U.hex2rgb(C.roseCore);

  // baked glow sprites (one per particle color) so renderParticles blits instead of building a gradient per particle
  const glowSprites = {};
  function bakeGlow(hex) {
    const R = 16, s = R * 2, cn = document.createElement('canvas'); cn.width = cn.height = s;
    const g = cn.getContext('2d'), rgb = U.hex2rgb(hex);
    const grad = g.createRadialGradient(R, R, 0, R, R, R);
    grad.addColorStop(0, U.rgba(rgb, 0.55)); grad.addColorStop(1, U.rgba(rgb, 0));
    g.fillStyle = grad; g.fillRect(0, 0, s, s); glowSprites[hex] = cn;
  }
  [C.core, C.fire, C.spark, C.gold, C.halo].forEach(bakeGlow);

  function reset() { shake = 0; chroma = 0; desat = 0; flash = 0; particles.clear(); }
  function triggerShake(px) { if (!CFG.REDUCED_MOTION) shake = Math.max(shake, px); }
  function spikeChroma(px) { chroma = Math.max(chroma, px); }
  function triggerDesat() { desat = 1; }
  function triggerFlash(a) { flash = Math.max(flash, a); }

  // graze fleck at the bullet's nearest edge toward the player (the heartbeat's visible tick)
  function grazeFleck(bx, by, px, py) {
    const a = Math.atan2(py - by, px - bx);
    particles.spawn(bx + Math.cos(a) * 6, by + Math.sin(a) * 6,
      Math.cos(a) * 1.2 + (Math.random() - 0.5), Math.sin(a) * 1.2 + (Math.random() - 0.5),
      14, C.core, 2, 6);
  }
  function muzzle(x, y) { particles.spawn(x, y - 4, (Math.random() - 0.5) * 1.5, -1 - Math.random(), 8, C.fire, 2, 4); }
  function popcorn(x, y, n, col) {
    for (let i = 0; i < n; i++) { const a = Math.random() * U.TAU, s = 1 + Math.random() * 3;
      particles.spawn(x, y, Math.cos(a) * s, Math.sin(a) * s, 16 + Math.random() * 12, col || C.spark, 2, 5); }
  }

  function update(dt, conductor) {
    particles.update();
    shake *= CFG.SHAKE_DECAY; if (shake < 0.2) shake = 0;
    flash *= 0.86; if (flash < 0.01) flash = 0;
    desat = Math.max(0, desat - dt / (CFG.DESATURATE_MS / 1000) * 0.6);
    // chroma base rides the conductor (bloom layer only); spikes decay back to it
    const base = U.lerp(0, CFG.CHROMA_MAX, Math.max(conductor.closeness * 0.4, conductor.unison));
    chroma = Math.max(base, chroma * 0.88);
  }

  function shakeOffset() {
    if (shake <= 0) return [0, 0];
    return [(Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake];
  }

  // warm dawn bloom centered on the partner — additive, rides warmth (closeness). Decoration only.
  function renderBloom(ctx, partner, closeness, unison) {
    const warm = closeness;
    if (warm <= 0.01 && unison <= 0 && flash <= 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // donut falloff: dimmest at the emitter center (0.3) so spawning rose always sits on a darker background,
    // peak in a mid-ring, gone at the edges. Keeps the contrast budget: bloom stays under rose/cyan luminance.
    const drawGlow = (cx, ox, tint, alpha) => {
      const g = ctx.createRadialGradient(cx + ox, partner.y, 0, cx + ox, partner.y, 640);
      g.addColorStop(0, U.rgba(tint, alpha * 0.3));
      g.addColorStop(0.42, U.rgba(tint, alpha));
      g.addColorStop(1, U.rgba(tint, 0));
      ctx.fillStyle = g; ctx.fillRect(0, 0, CFG.W, CFG.H);
    };
    const a = Math.min(0.4, warm * 0.30 + unison * 0.18) + flash * 0.26;   // hard cap so it never washes the threat
    const warmTint = unison > 0 ? gold : [255, 150, 120];
    if (chroma > 0.4) { // split the bloom into RGB — chromatic aberration on decoration only
      drawGlow(partner.x, -chroma, [warmTint[0], 40, 60], a * 0.42);
      drawGlow(partner.x, 0, [40, warmTint[1] * 0.5, 60], a * 0.42);
      drawGlow(partner.x, chroma, [40, 60, warmTint[2]], a * 0.42);
    } else {
      drawGlow(partner.x, 0, warmTint, a);
    }
    if (unison > 0) drawGlow(partner.x, 0, gold, unison * 0.18);
    ctx.restore();
  }

  function renderParticles(ctx) {
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < particles.cap; i++) { const p = particles.arr[i]; if (!p.active) continue;
      const k = 1 - p.life / p.max;
      if (p.glow) { const spr = glowSprites[p.col] || glowSprites[C.core], sz = p.glow * 3.4;
        ctx.globalAlpha = 0.55 * k; ctx.drawImage(spr, p.x - sz / 2, p.y - sz / 2, sz, sz); }
      ctx.globalAlpha = k; ctx.fillStyle = p.col;            // hex string, no per-frame alloc
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, U.TAU); ctx.fill();
    }
    ctx.globalAlpha = 1; ctx.restore();
  }

  // gray wash on a hit — desaturates the whole non-lethal world. Called AFTER world, BEFORE rose/core.
  function renderDesat(ctx) {
    if (desat <= 0.01) return;
    ctx.save(); ctx.globalCompositeOperation = 'saturation';
    ctx.fillStyle = `rgba(120,120,130,${desat})`; ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = U.rgba(U.hex2rgb(CFG.COL.dead), desat * 0.28); ctx.fillRect(0, 0, CFG.W, CFG.H);
    ctx.restore();
  }

  return { particles, reset, triggerShake, spikeChroma, triggerDesat, triggerFlash,
           grazeFleck, muzzle, popcorn, update, shakeOffset, renderBloom, renderParticles, renderDesat,
           get chroma(){ return chroma; }, get desat(){ return desat; } };
})();
