// FINALE — amber beams. The game's guaranteed-honest content: they cannot be converted, cannot be
// cheesed by the core mechanic, and must simply be dodged. Every bullet-hell needs a floor of pure
// dodging or the clever mechanic eats the genre.
//
// A beam is geometry, not bullets — 8 of these cost nothing, where a 200-bullet line would cost real
// budget and read worse. Telegraph first, always: an amber beam that appears without warning is a
// bug, not a difficulty setting.
window.Beams = (() => {
  const CAP = 12;
  const list = [];
  for (let i = 0; i < CAP; i++) list.push({
    active: false, x: 0, y: 0, ang: 0, len: 1500, w: 14,
    tele: 0, teleMax: 0.6, live: 0, liveMax: 0.5, sweep: 0,
  });

  function reset() { for (let i = 0; i < CAP; i++) list[i].active = false; }

  function add(x, y, ang, opts) {
    for (let i = 0; i < CAP; i++) {
      const b = list[i];
      if (b.active) continue;
      b.active = true; b.x = x; b.y = y; b.ang = ang;
      b.len = (opts && opts.len) || 1600;
      b.w = (opts && opts.w) || 14;
      b.teleMax = b.tele = (opts && opts.tele !== undefined) ? opts.tele : 0.6;
      b.liveMax = (opts && opts.live !== undefined) ? opts.live : 0.5;
      b.live = 0;
      b.sweep = (opts && opts.sweep) || 0;      // rad/s while active
      return b;
    }
    return null;
  }

  // HORNET fires two beams that bracket the player — you dodge into the gap between them.
  function fireFrom(e, n) {
    const px = Game.playerX(), py = Game.playerY();
    const base = Math.atan2(py - e.y, px - e.x);
    const spread = U.deg(26);
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? base : base - spread / 2 + spread * (i / (n - 1));
      add(e.x, e.y, a, { tele: 0.6, live: 0.5, w: 14 });
    }
  }

  function update(dt) {
    for (let i = 0; i < CAP; i++) {
      const b = list[i];
      if (!b.active) continue;
      if (b.tele > 0) {
        b.tele -= dt;
        if (b.tele <= 0) b.live = b.liveMax;
      } else {
        b.live -= dt;
        b.ang += b.sweep * dt;
        if (b.live <= 0) b.active = false;
      }
    }
  }

  // distance from point to the beam's ray, only counting the forward half
  function hits(px, py, pad) {
    for (let i = 0; i < CAP; i++) {
      const b = list[i];
      if (!b.active || b.live <= 0) continue;
      const dx = px - b.x, dy = py - b.y;
      const c = U.fcos(b.ang), s = U.fsin(b.ang);
      const t = dx * c + dy * s;                       // projection along the beam
      if (t < 0 || t > b.len) continue;
      const perp = Math.abs(-dx * s + dy * c);
      if (perp <= b.w * 0.5 + pad) return true;
    }
    return false;
  }

  function draw(ctx) {
    const A = CFG.COL.amber, rgb = U.hex2rgb(A);
    ctx.save();
    for (let i = 0; i < CAP; i++) {
      const b = list[i];
      if (!b.active) continue;
      const c = U.fcos(b.ang), s = U.fsin(b.ang);
      const ex = b.x + c * b.len, ey = b.y + s * b.len;
      if (b.tele > 0) {
        // telegraph: a hairline that thickens as it arms, so the warning itself is a countdown
        const k = 1 - b.tele / b.teleMax;
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = U.rgba(rgb, 0.25 + 0.4 * k);
        ctx.lineWidth = 1 + 2 * k;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
      } else {
        const k = U.clamp(b.live / b.liveMax, 0, 1);
        const w = b.w * (0.6 + 0.4 * k);
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = U.rgba(rgb, 0.22);
        ctx.lineWidth = w * 2.6;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = A; ctx.lineWidth = w;
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
        ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, w * 0.22);
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(ex, ey); ctx.stroke();
      }
    }
    ctx.restore();
  }

  const count = () => { let c = 0; for (let i = 0; i < CAP; i++) if (list[i].active) c++; return c; };
  return { list, reset, add, fireFrom, update, hits, draw, count };
})();
