// EVENSONG — rendering. A dark stone room, a ladder of lit strings, flames for voices.
// The whole read lives in: your gold flame, their pale flame, and the ribbon between.
// No HUD, no meters. If a number matters, it must be visible as light.
window.WORLD = (function () {
  const W = {};
  const CFG = window.CFG, U = window.U, T = window.THEORY;
  let cv, cx, t0 = 0;
  const rnd = U.rng(7);

  // particle pools — allocated once, reused forever. nothing in this game may stutter.
  const MOTES = []; for (let i = 0; i < 40; i++) MOTES.push({ x: rnd() * 1280, y: rnd() * 720, s: 0.3 + rnd() * 0.7, p: rnd() * 6.28 });
  const SPARKS = []; for (let i = 0; i < 96; i++) SPARKS.push({ live: false, x: 0, y: 0, vx: 0, vy: 0, life: 0, max: 1, tint: '#fff' });
  const BLOOMS = []; for (let i = 0; i < 8; i++) BLOOMS.push({ live: false, x: 0, y: 0, r: 0, max: 1, tint: '#fff', t: 0 });

  W.init = function (canvas) {
    cv = canvas; cx = cv.getContext('2d');
    cv.width = CFG.W; cv.height = CFG.H;
  };

  W.yForDegree = function (deg) {
    const span = CFG.LADDER_BOT_Y - CFG.LADDER_TOP_Y;
    const top = CFG.N_STRINGS - 1;
    if (deg <= top) return CFG.LADDER_BOT_Y - (deg / top) * span;
    // above the playable ladder (Wren, the finale descant): compressed spacing so the
    // whole soprano register stays on screen — she floats above what you can reach.
    return CFG.LADDER_TOP_Y - (deg - top) * 16;
  };
  W.xForBeat = function (beatDelta) {  // beats-from-now -> lane x
    const pxPerBeat = (CFG.W - CFG.NOW_X) / (CFG.LOOKAHEAD_BARS * CFG.BEATS_PER_BAR);
    return CFG.NOW_X + beatDelta * pxPerBeat;
  };

  W.spawnSpark = function (x, y, tint, n, spread) {
    let made = 0;
    for (const s of SPARKS) {
      if (s.live) continue;
      s.live = true; s.x = x + (rnd() - 0.5) * 8; s.y = y + (rnd() - 0.5) * 8;
      s.vx = (rnd() - 0.5) * (spread || 40); s.vy = -10 - rnd() * 35;
      s.life = 0; s.max = 0.7 + rnd() * 0.8; s.tint = tint;
      if (++made >= n) break;
    }
  };
  W.spawnBloom = function (x, y, tint, big) {
    for (const b of BLOOMS) {
      if (b.live) continue;
      b.live = true; b.x = x; b.y = y; b.r = 4; b.max = big ? 340 : 160; b.tint = tint; b.t = 0;
      break;
    }
  };

  function flame(x, y, r, tint, heat, flick) {
    // layered radial glow; heat 0..1 raises the white core. flick adds candle wobble.
    const w = flick ? Math.sin(t0 * 9.1 + x) * 1.3 + Math.sin(t0 * 23.7 + y) * 0.7 : 0;
    const g = cx.createRadialGradient(x + w * 0.4, y + w, 0, x + w * 0.4, y + w, r * 3);
    g.addColorStop(0, 'rgba(255,252,240,' + (0.75 + 0.25 * heat) + ')');
    g.addColorStop(0.18, tint);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(x - r * 3 + w, y - r * 3 + w, r * 6, r * 6);
  }

  function drawText(str, x, y, size, alpha, align) {
    if (!str || alpha <= 0.004) return;
    cx.save();
    cx.globalAlpha = U.clamp(alpha, 0, 1);
    cx.fillStyle = CFG.COL_TEXT;
    cx.font = size + 'px Georgia, serif';
    cx.textAlign = align || 'center';
    cx.textBaseline = 'middle';
    cx.shadowColor = 'rgba(232,220,192,0.35)'; cx.shadowBlur = 12;
    cx.fillText(str, x, y);
    cx.restore();
  }

  // ------------------------------------------------------------------ the frame
  // G is the game state object (sibling module, not a public API).
  W.draw = function (G, dtReal) {
    t0 += dtReal;
    const warm = U.clamp(G.warmth01 || 0, 0, 1);

    // -- room
    const bg = cx.createLinearGradient(0, 0, 0, CFG.H);
    bg.addColorStop(0, CFG.COL_BG_TOP); bg.addColorStop(1, CFG.COL_BG_BOT);
    cx.globalCompositeOperation = 'source-over';
    cx.fillStyle = bg; cx.fillRect(0, 0, CFG.W, CFG.H);
    // faint arches, warmer as warmth rises
    cx.save();
    cx.strokeStyle = 'rgba(120,110,140,' + (0.05 + warm * 0.05) + ')';
    cx.lineWidth = 3;
    for (let i = 0; i < 3; i++) {
      cx.beginPath();
      cx.arc(CFG.W / 2, CFG.H + 260 - i * 40, 720 - i * 120, Math.PI * 1.12, Math.PI * 1.88);
      cx.stroke();
    }
    cx.restore();
    // motes
    cx.globalCompositeOperation = 'lighter';
    for (const m of MOTES) {
      m.y -= dtReal * 6 * m.s; m.x += Math.sin(t0 * 0.4 + m.p) * 0.08;
      if (m.y < -4) { m.y = CFG.H + 4; m.x = rnd() * CFG.W; }
      cx.globalAlpha = 0.05 + 0.05 * Math.sin(t0 + m.p);
      cx.fillStyle = '#cfc8e8';
      cx.fillRect(m.x, m.y, m.s * 2, m.s * 2);
    }
    cx.globalAlpha = 1;

    if (G.scene === 'title') { drawTitle(G); drawEmber(G); finishParticles(dtReal); vignette(); return; }

    // -- the ladder
    cx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < CFG.N_STRINGS; i++) {
      const y = W.yForDegree(i);
      const isPlayer = G.singing && G.playerDeg === i;
      const isC = T.stepOfDegree(i) === 6;
      const fictaGlow = isC && G.fictaActive;
      let a = 0.10 + (G.hoverDeg === i ? 0.10 : 0) + (isPlayer ? 0.22 : 0) + (fictaGlow ? 0.10 : 0);
      cx.strokeStyle = fictaGlow ? 'rgba(255,226,160,' + a + ')' : 'rgba(200,198,228,' + a + ')';
      cx.lineWidth = isPlayer ? 1.6 : 1;
      cx.beginPath();
      // sounding strings vibrate: a decaying sine along their length
      const vib = (isPlayer ? 2.2 : 0) + (G.soulDegOnLadder === i && G.soulSounding ? 1.6 : 0);
      if (vib > 0) {
        for (let x = 0; x <= CFG.W; x += 16)
          cx.lineTo(x, y + Math.sin(x * 0.02 + t0 * 22) * vib * Math.exp(-x / 900));
      } else { cx.moveTo(0, y); cx.lineTo(CFG.W, y); }
      cx.stroke();
    }

    // -- now-line: the cantor's column, a hairline of candlelight
    const nl = cx.createLinearGradient(0, 60, 0, CFG.H - 40);
    nl.addColorStop(0, 'rgba(240,201,106,0)'); nl.addColorStop(0.5, 'rgba(240,201,106,' + (0.10 + warm * 0.12) + ')'); nl.addColorStop(1, 'rgba(240,201,106,0)');
    cx.fillStyle = nl; cx.fillRect(CFG.NOW_X - 1, 60, 2, CFG.H - 100);

    // -- lane notes (souls, resolutions, finale voices)
    cx.globalCompositeOperation = 'lighter';
    for (const n of G.laneNotes) {                     // {beatDelta, deg, lenBeats, tint, vel, sounding}
      const x = W.xForBeat(n.beatDelta), y = W.yForDegree(n.deg);
      if (x > CFG.W + 60) continue;
      const len = n.lenBeats * ((CFG.W - CFG.NOW_X) / (CFG.LOOKAHEAD_BARS * CFG.BEATS_PER_BAR));
      const x2 = Math.min(x + len, CFG.W + 60);
      if (x2 < CFG.NOW_X - 40) continue;
      const a = n.sounding ? 0.8 : 0.4;
      const grad = cx.createLinearGradient(x, y, x2, y);
      grad.addColorStop(0, n.tint); grad.addColorStop(1, 'rgba(0,0,0,0)');
      cx.save();
      cx.globalAlpha = a * (n.vel || 1);
      cx.strokeStyle = grad; cx.lineWidth = n.sounding ? 5 : 3; cx.lineCap = 'round';
      cx.beginPath(); cx.moveTo(Math.max(x, CFG.NOW_X), y); cx.lineTo(x2, y); cx.stroke();
      cx.restore();
      flame(Math.max(x, CFG.NOW_X), y, n.sounding ? 7 : 4.5, n.tint, n.sounding ? 0.9 : 0.3, true);
    }

    // -- ghost hints
    for (const h of G.ghostNotes) {                    // {beatDelta, deg, rest, pulse}
      const x = W.xForBeat(h.beatDelta);
      if (x < CFG.NOW_X - 10 || x > CFG.W + 40) continue;
      const y = W.yForDegree(h.deg);
      cx.save();
      cx.globalAlpha = (0.32 + (h.pulse ? 0.2 * (0.5 + 0.5 * Math.sin(t0 * 6)) : 0));
      if (h.rest) {
        cx.strokeStyle = '#cfc8e8'; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(x, y, 9, 0, 6.283); cx.stroke();
        cx.beginPath(); cx.moveTo(x - 4, y); cx.lineTo(x + 4, y); cx.stroke();   // a rest: a circle holding nothing
      } else {
        cx.strokeStyle = CFG.COL_PLAYER; cx.lineWidth = 1.5;
        cx.beginPath(); cx.arc(x, y, 7, 0, 6.283); cx.stroke();
      }
      cx.restore();
    }

    // -- the ribbon: you <-> the soul. THE feedback system.
    if (G.ribbon && G.ribbon.on) {
      const R = G.ribbon;
      const y1 = G.playerYpx, y2 = W.yForDegree(R.soulDeg);
      const x = CFG.NOW_X;
      const col = R.sus === 'suspended' ? CFG.COL_RIBBON_SUS
        : R.quality === 'imperfect' ? CFG.COL_RIBBON_WARM
        : R.quality === 'perfect' ? CFG.COL_RIBBON_PERF
        : R.quality === 'neutral' ? 'rgba(160,165,190,0.8)'
        : CFG.COL_RIBBON_DISS;
      cx.save();
      const segs = 14, amp = R.quality === 'dissonant' ? 5.5 : R.sus === 'suspended' ? 2.5 : 1.2;
      const alpha = R.sus === 'suspended' ? 0.65 + 0.3 * Math.sin(t0 * 10) : R.quality === 'imperfect' ? 0.6 : 0.42;
      cx.globalAlpha = alpha;
      cx.strokeStyle = col; cx.lineWidth = R.quality === 'imperfect' ? 3 : 2;
      cx.beginPath();
      for (let i = 0; i <= segs; i++) {
        const f = i / segs, yy = U.lerp(y1, y2, f);
        const wob = Math.sin(f * Math.PI) * Math.sin(t0 * (R.quality === 'dissonant' ? 31 : 7) + f * 9) * amp;
        cx.lineTo(x + wob, yy);
      }
      cx.stroke();
      cx.restore();
      if (R.quality === 'dissonant' && !R.grace && rnd() < 0.25) W.spawnSpark(x, (y1 + y2) / 2, CFG.COL_RIBBON_DISS, 1, 26);
      if (R.quality === 'imperfect' && rnd() < 0.18) W.spawnSpark(x, U.lerp(y1, y2, rnd()), CFG.COL_RIBBON_WARM, 1, 14);
    }

    // -- player flame. the ember IS the cursor (css hides the OS pointer) — it must
    // exist on every screen, or the player is aiming blind.
    if (G.singing && G.scene !== 'endcard') flame(CFG.NOW_X, G.playerYpx, 9, CFG.COL_PLAYER, 0.6 + 0.4 * warm, true);
    else drawEmber(G);
    // fermata: while you stay released, the world visibly answers — a halo grows around
    // your resting ember so 2.5 seconds of stillness reads as "yes, keep doing this."
    if (G.scene === 'fermata' && G.fermataRel01 > 0) {
      const p = U.clamp(G.fermataRel01, 0, 1);
      cx.save();
      cx.globalCompositeOperation = 'lighter';
      cx.globalAlpha = 0.25 + 0.45 * p;
      cx.strokeStyle = CFG.COL_PLAYER; cx.lineWidth = 1.5 + p * 2;
      cx.beginPath(); cx.arc(G.mouseXpx, G.mouse.y * CFG.H, 18 + p * 130, 0, 6.283); cx.stroke();
      cx.restore();
    }

    // -- ground pulse + votives
    cx.globalCompositeOperation = 'lighter';
    const gp = 1 - U.clamp(G.beatInBar / 0.6, 0, 1);   // soft thump on each bar's downbeat
    if (gp > 0 && G.groundOn) {
      const g2 = cx.createRadialGradient(CFG.W / 2, CFG.H + 60, 0, CFG.W / 2, CFG.H + 60, 420);
      g2.addColorStop(0, 'rgba(232,160,90,' + 0.10 * gp + ')'); g2.addColorStop(1, 'rgba(0,0,0,0)');
      cx.fillStyle = g2; cx.fillRect(0, CFG.H - 280, CFG.W, 280);
    }
    G.votives.forEach((v, i) => {
      const x = 46 + i * 34, y = CFG.H - 42;
      flame(x, y, 5, v.tint, 0.7, true);
      cx.globalAlpha = 0.5; cx.fillStyle = 'rgba(220,210,230,0.25)';
      cx.fillRect(x - 2, y + 8, 4, 12);
      cx.globalAlpha = 1;
    });

    finishParticles(dtReal);

    // -- text layers
    cx.globalCompositeOperation = 'source-over';
    if (G.textCenter) drawText(G.textCenter.str, CFG.W / 2, 200, 26, G.textCenter.alpha);
    if (G.textSub) drawText(G.textSub.str, CFG.W / 2, 244, 17, G.textSub.alpha);
    if (G.textBottom) drawText(G.textBottom.str, CFG.W / 2, CFG.H - 64, 17, G.textBottom.alpha);
    if (G.scene === 'endcard') drawEndcard(G);
    if (G.debug) drawDebug(G);
    vignette();
  };

  function finishParticles(dtReal) {
    cx.globalCompositeOperation = 'lighter';
    for (const s of SPARKS) {
      if (!s.live) continue;
      s.life += dtReal; s.x += s.vx * dtReal; s.y += s.vy * dtReal; s.vy += 14 * dtReal;
      if (s.life >= s.max) { s.live = false; continue; }
      cx.globalAlpha = (1 - s.life / s.max) * 0.7;
      cx.fillStyle = s.tint;
      cx.fillRect(s.x, s.y, 2.2, 2.2);
    }
    for (const b of BLOOMS) {
      if (!b.live) continue;
      b.t += dtReal; b.r = U.easeOut(Math.min(1, b.t / 1.4)) * b.max;
      if (b.t > 1.4) { b.live = false; continue; }
      cx.globalAlpha = (1 - b.t / 1.4) * 0.35;
      cx.strokeStyle = b.tint; cx.lineWidth = 2.5;
      cx.beginPath(); cx.arc(b.x, b.y, b.r, 0, 6.283); cx.stroke();
    }
    cx.globalAlpha = 1;
  }

  function drawEmber(G) {
    cx.globalCompositeOperation = 'lighter';
    flame(G.mouseXpx, G.mouse.y * CFG.H, 3.5, 'rgba(240,201,106,0.55)', 0.2, true);
  }

  function drawTitle(G) {
    cx.globalCompositeOperation = 'lighter';
    flame(CFG.W / 2, CFG.H / 2 + 60, 10, CFG.COL_VOTIVE, 0.8, true);
    cx.globalCompositeOperation = 'source-over';
    cx.save();
    cx.fillStyle = CFG.COL_TEXT; cx.textAlign = 'center';
    cx.font = '42px Georgia, serif';
    cx.letterSpacing = '14px';
    cx.fillText('EVENSONG', CFG.W / 2 + 7, CFG.H / 2 - 60);
    cx.restore();
    drawText(window.SCORE.TEXT.subtitle, CFG.W / 2, CFG.H / 2 - 14, 18, 0.85);
    drawText(window.SCORE.TEXT.begin, CFG.W / 2, CFG.H / 2 + 140, 15, 0.45 + 0.2 * Math.sin(t0 * 2));
  }

  function drawEndcard(G) {
    // six votives, the sixth one yours, a shade brighter.
    cx.globalCompositeOperation = 'lighter';
    const n = G.votives.length + 1, w = 60, x0 = CFG.W / 2 - (n - 1) * w / 2;
    G.votives.forEach((v, i) => flame(x0 + i * w, CFG.H / 2, 7, v.tint, 0.75, true));
    flame(x0 + G.votives.length * w, CFG.H / 2, 9, CFG.COL_PLAYER, 1, true);
    cx.globalCompositeOperation = 'source-over';
    drawText('EVENSONG', CFG.W / 2, CFG.H / 2 - 110, 26, 0.9);
    drawText(window.SCORE.TEXT.endAgain, CFG.W / 2 - 90, CFG.H / 2 + 130, 18, G.endHover === 0 ? 1 : 0.55);
    drawText(window.SCORE.TEXT.endStay, CFG.W / 2 + 90, CFG.H / 2 + 130, 18, G.endHover === 1 ? 1 : 0.55);
  }

  function drawDebug(G) {
    cx.save();
    cx.fillStyle = 'rgba(0,0,0,0.55)'; cx.fillRect(8, 8, 340, 120);
    cx.fillStyle = '#9f9'; cx.font = '12px monospace'; cx.textAlign = 'left';
    const L = [
      'scene ' + G.scene + '  soul ' + G.soulIdx + '  loop ' + G.loopCount,
      'mt ' + G.mt.toFixed(2) + '  bar ' + G.groundBar + ' beat ' + G.beatInBar.toFixed(2) + (G.fictaActive ? ' FICTA' : ''),
      'deg ' + G.playerDeg + ' sing ' + G.singing + ' q ' + (G.ribbon && G.ribbon.quality),
      'sus soul:' + G.susSoulState + ' bass:' + G.susBassState,
      'knot ' + G.knotDesc,
      'warmth ' + (G.warmth01 || 0).toFixed(2) + '  fps ' + (G.fps | 0),
    ];
    L.forEach((s, i) => cx.fillText(s, 16, 26 + i * 17));
    cx.restore();
  }

  function vignette() {
    cx.globalCompositeOperation = 'source-over';
    const v = cx.createRadialGradient(CFG.W / 2, CFG.H / 2, CFG.H * 0.42, CFG.W / 2, CFG.H / 2, CFG.H * 0.98);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(2,2,8,0.55)');
    cx.fillStyle = v; cx.fillRect(0, 0, CFG.W, CFG.H);
  }

  return W;
})();
