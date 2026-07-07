// ── VESPERBANE · fx.js ───────────────────────────────────────────────
// Particles, afterimages, screenshake, hitstop. All the juice.
'use strict';

const FX = {
  parts: [],
  ghosts: [],
  shakeT: 0, shakeMag: 0,
  stopT: 0,

  hitstop(t) { this.stopT = Math.max(this.stopT, t); },
  shake(mag, t) {
    if (mag >= this.shakeMag || this.shakeT <= 0) { this.shakeMag = mag; this.shakeT = t; }
  },

  burst(x, y, color, n, opt) {
    opt = opt || {};
    for (let i = 0; i < n; i++) {
      const a = (opt.angle !== undefined ? opt.angle : Math.random() * Math.PI * 2)
        + (Math.random() - 0.5) * (opt.spread !== undefined ? opt.spread : Math.PI * 2);
      const sp = (opt.speed || 60) * (0.4 + Math.random() * 0.9);
      this.parts.push({
        x, y,
        vx: Math.cos(a) * sp + (opt.vx || 0),
        vy: Math.sin(a) * sp + (opt.vy || 0),
        life: (opt.life || 0.4) * (0.6 + Math.random() * 0.7),
        t: 0,
        size: opt.size || 1 + (Math.random() < 0.3 ? 1 : 0),
        color: Array.isArray(color) ? color[(Math.random() * color.length) | 0] : color,
        grav: opt.grav !== undefined ? opt.grav : 220,
        fade: opt.fade !== undefined ? opt.fade : true,
      });
    }
  },

  ghost(img, x, y) {
    this.ghosts.push({ img, x, y, t: 0, life: 0.22 });
  },

  update(dt) {
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.t += dt;
      if (p.t >= p.life) { this.parts.splice(i, 1); continue; }
      p.vy += p.grav * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const g = this.ghosts[i];
      g.t += dt;
      if (g.t >= g.life) this.ghosts.splice(i, 1);
    }
    if (this.shakeT > 0) this.shakeT -= dt;
  },

  shakeOffset() {
    if (this.shakeT <= 0) return [0, 0];
    const m = this.shakeMag * Math.min(1, this.shakeT * 8);
    return [(Math.random() - 0.5) * 2 * m, (Math.random() - 0.5) * 2 * m];
  },

  // camera-space draw
  draw(ctx, camX, camY) {
    for (const g of this.ghosts) {
      ctx.globalAlpha = 0.34 * (1 - g.t / g.life);
      ctx.drawImage(g.img, Math.round(g.x - camX), Math.round(g.y - camY));
    }
    ctx.globalAlpha = 1;
    for (const p of this.parts) {
      if (p.fade) ctx.globalAlpha = clamp(1 - p.t / p.life, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(Math.round(p.x - camX), Math.round(p.y - camY), p.size, p.size);
    }
    ctx.globalAlpha = 1;
  },

  reset() { this.parts.length = 0; this.ghosts.length = 0; this.shakeT = 0; this.stopT = 0; },
};
