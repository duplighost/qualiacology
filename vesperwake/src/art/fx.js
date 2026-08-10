/* art/fx.js — particles, impact rings, damage bloom, and the whip chain.
 *
 * All of it is drawn in world space and graded with everything else, so a
 * spark and a lantern are lit by the same photograph.
 */

import { TAU, clamp, withAlpha, makeRng, lerp } from '../core.js';

const rng = makeRng(0xc0ffee);

export class Particles {
  constructor(limit = 520) {
    this.items = [];
    this.limit = limit;
  }

  clear() { this.items.length = 0; }

  add(p) {
    if (this.items.length >= this.limit) this.items.shift();
    this.items.push(p);
  }

  burst(x, y, colour, count, speed, kind = 'spark', opts = {}) {
    for (let i = 0; i < count; i += 1) {
      const a = opts.angle !== undefined
        ? opts.angle + (rng() - 0.5) * (opts.spread ?? 1.2)
        : rng() * TAU;
      const s = speed * (0.35 + rng() * 0.9);
      this.add({
        kind, x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - (opts.lift ?? 0),
        life: (opts.life ?? 0.5) * (0.6 + rng() * 0.8),
        maxLife: (opts.life ?? 0.5),
        r: (opts.r ?? 2.4) * (0.5 + rng()),
        colour, gravity: opts.gravity ?? 620, drag: opts.drag ?? 1.4,
        spin: (rng() - 0.5) * 8, rot: rng() * TAU,
      });
    }
  }

  ring(x, y, colour, r0, r1, life = 0.32, width = 3) {
    this.add({ kind: 'ring', x, y, r: r0, r1, life, maxLife: life, colour, width });
  }

  slash(x, y, angle, len, colour, life = 0.16) {
    this.add({ kind: 'slash', x, y, angle, len, colour, life, maxLife: life });
  }

  update(dt) {
    const out = [];
    for (const p of this.items) {
      p.life -= dt;
      if (p.life <= 0) continue;
      if (p.kind === 'ring' || p.kind === 'slash') { out.push(p); continue; }
      p.vy += (p.gravity ?? 0) * dt;
      p.vx -= p.vx * (p.drag ?? 0) * dt;
      p.vy -= p.vy * (p.drag ?? 0) * 0.35 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
      out.push(p);
    }
    this.items = out;
  }

  draw(ctx) {
    ctx.save();
    for (const p of this.items) {
      const t = clamp(p.life / p.maxLife, 0, 1);
      if (p.kind === 'ring') {
        const r = lerp(p.r, p.r1, 1 - t);
        ctx.globalAlpha = t * 0.85;
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = p.width * t;
        ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.stroke();
        continue;
      }
      if (p.kind === 'slash') {
        ctx.globalAlpha = t;
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.strokeStyle = p.colour;
        ctx.lineWidth = 3.4 * t;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(0, 0, p.len, -0.9, 0.9);
        ctx.stroke();
        ctx.restore();
        continue;
      }
      ctx.globalAlpha = t * (p.kind === 'ember' ? 0.9 : 0.8);
      if (p.kind === 'ember' || p.kind === 'spark') {
        ctx.globalCompositeOperation = 'screen';
      } else {
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.fillStyle = p.colour;
      if (p.kind === 'dust' || p.kind === 'smoke') {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (2 - t), 0, TAU); ctx.fill();
      } else if (p.kind === 'shard') {
        ctx.save();
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillRect(-p.r, -p.r * 0.4, p.r * 2, p.r * 0.8);
        ctx.restore();
      } else {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r * t + 0.4, 0, TAU); ctx.fill();
      }
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 * The Nooncord itself — a chain of iron links ending in a bell-clapper.
 * Its length is `links`, which the shard system can extend.
 * ------------------------------------------------------------------ */

export function drawChainWhip(ctx, from, to, opts = {}) {
  const links = opts.links ?? 9;
  const colour = opts.colour ?? '#c9d6d4';
  const glow = opts.glow ?? '#a8f0ff';
  const t = clamp(opts.t ?? 1, 0, 1);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len; const ny = dx / len;
  const sag = (opts.sag ?? 12) * (1 - t) + (opts.sag ?? 12) * 0.25;

  ctx.save();
  if (opts.hot) {
    ctx.shadowColor = withAlpha(glow, 0.8);
    ctx.shadowBlur = 12;
  }
  ctx.strokeStyle = colour;
  for (let i = 1; i <= links; i += 1) {
    const f = i / links;
    const px = from.x + dx * f + nx * Math.sin(f * Math.PI) * sag;
    const py = from.y + dy * f + ny * Math.sin(f * Math.PI) * sag;
    const weight = opts.weight ?? 1;
    const size = lerp(2.1, 3.6, f) * weight;
    ctx.lineWidth = lerp(1.1, 1.8, f) * weight;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(dy, dx) + (i % 2 ? Math.PI * 0.5 : 0));
    ctx.beginPath();
    ctx.ellipse(0, 0, size, size * 0.56, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  /* the clapper */
  const cw = 1 + ((opts.weight ?? 1) - 1) * 0.8;
  ctx.fillStyle = opts.hot ? '#fff2c0' : '#dfe9e6';
  ctx.beginPath();
  ctx.moveTo(to.x, to.y - 5.8 * cw);
  ctx.quadraticCurveTo(to.x + 6 * cw, to.y - 1.8 * cw, to.x + 3.8 * cw, to.y + 5.2 * cw);
  ctx.lineTo(to.x - 3.8 * cw, to.y + 5.2 * cw);
  ctx.quadraticCurveTo(to.x - 6 * cw, to.y - 1.8 * cw, to.x, to.y - 5.8 * cw);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = opts.hot ? '#fffbe0' : 'rgba(240,250,248,.6)';
  ctx.lineWidth = 0.9;
  ctx.stroke();
  ctx.restore();
}
