/* art/reliquary.js — THE DROWNED RELIQUARY.
 *
 * A cathedral standing a foot deep in black-green water, lit from the upper
 * left by a rose window that has not seen a sunrise in thirteen years. Every
 * surface here is either drowned marble, saint-glass, or something pale that
 * grew in the dark.
 *
 * The rule the whole area is built on: WATER IS THE FLOOR. So every walking
 * surface carries a meniscus line, a caustic band, and a reflection, and every
 * one of them is a little quieter in value than the stone in the painting
 * behind it. A platform here is never a slab — it is a lily, a pane of lit
 * glass, or a dead root that grew across the gap.
 */

import { TAU, makeRng, clamp, mixHex, withAlpha } from '../core.js';
import {
  chipEdge, crust, sheen, castShadow, groundShadow, glowDot,
  chain, railing, arch, lightPool, grain, poly, line, ramp,
} from './paint.js';

/* the rose window is up and to the left */
export const LIGHT = { x: -0.55, y: -0.83 };

function mats(pal) {
  return {
    marble: ramp('#3c4f4e', pal, { blend: 0.30, sink: 0.22, topMix: 0.26, footMix: 0.66 }),
    wall: ramp('#4a5c5e', pal, { blend: 0.22, sink: 0.12, topMix: 0.30, footMix: 0.50 }),
    silt: ramp('#2c3a37', pal, { blend: 0.34, sink: 0.30, topMix: 0.20, footMix: 0.74 }),
    root: ramp('#8d9184', pal, { blend: 0.14, sink: 0.12, topMix: 0.34, footMix: 0.56 }),
    lily: ramp('#3f5f4c', pal, { blend: 0.20, sink: 0.16, topMix: 0.30, footMix: 0.62 }),
    lead: ramp('#2a3436', pal, { blend: 0.12, sink: 0.14, topMix: 0.30 }),
    brass: ramp('#5c5133', pal, { blend: 0.12, sink: 0.16, topMix: 0.40 }),
    water: mixHex('#0d2a2c', pal.mid, 0.42),
    shine: mixHex(pal.glow, '#c9fff2', 0.42),
    glass: mixHex('#79e8d4', pal.glow, 0.22),
    petal: mixHex('#f2e4ef', pal.glow, 0.3),
    candle: mixHex(pal.warm, '#ffe6a8', 0.5),
  };
}

let cachedPal = null; let cachedMats = null;
const M = (pal) => {
  if (cachedPal !== pal) { cachedPal = pal; cachedMats = mats(pal); }
  return cachedMats;
};

/* The flood line. Everything that touches the floor gets one, so the whole
 * area reads as one body of water rather than a set of wet objects. */
function waterline(ctx, x, y, w, env, strength = 1) {
  const m = M(env.palette);
  const t = env.time;
  ctx.save();
  /* the film itself */
  const film = ctx.createLinearGradient(0, y - 3, 0, y + 9);
  film.addColorStop(0, withAlpha(m.shine, 0.30 * strength));
  film.addColorStop(0.35, withAlpha(m.water, 0.5 * strength));
  film.addColorStop(1, withAlpha(m.water, 0));
  ctx.fillStyle = film;
  ctx.fillRect(x, y - 3, w, 12);
  /* the meniscus, which is the brightest line in the area */
  ctx.strokeStyle = withAlpha(m.shine, 0.62 * strength);
  ctx.lineWidth = 1.3;
  ctx.beginPath();
  const steps = Math.max(4, Math.floor(w / 22));
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const px = x + w * f;
    const py = y - 1.4 + Math.sin(t * 1.6 + px * 0.045) * 0.9;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  /* caustics crawling along it */
  ctx.globalCompositeOperation = 'screen';
  const crng = makeRng(((x * 15485863) ^ 0x9e) | 1);
  for (let i = 0; i < Math.floor(w / 34); i += 1) {
    const cx = x + crng() * w;
    const drift = Math.sin(t * 0.7 + cx * 0.02) * 14;
    ctx.globalAlpha = (0.05 + crng() * 0.07) * strength;
    ctx.fillStyle = m.shine;
    ctx.beginPath();
    ctx.ellipse(cx + drift, y + 3.4, 12 + crng() * 22, 1.8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * SOLID GROUND — drowned paving.
 * ------------------------------------------------------------------ */

function paintPaving(ctx, b, env, silt = false) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = b;
  const h = Math.min(b.h, 260);
  const mat = silt ? m.silt : m.marble;

  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, mat.top);
  body.addColorStop(0.05, mat.face);
  body.addColorStop(0.15, mat.foot);
  body.addColorStop(0.46, mat.deep);
  body.addColorStop(1, mixHex(mat.deep, pal.shadow, 0.75));
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* big marble flags with a chequer that has mostly worn away */
  const rng = makeRng(((x * 2654435761) ^ 0x51) | 1);
  let fx = x - 40;
  let alt = 0;
  while (fx < x + w + 40) {
    const fw = 54 + rng() * 34;
    if (alt % 2 === 0) {
      ctx.fillStyle = withAlpha(mixHex(mat.top, pal.glow, 0.10), 0.5);
      ctx.fillRect(fx, y, fw - 1.5, 3);
    }
    ctx.strokeStyle = withAlpha(mixHex(mat.deep, pal.shadow, 0.45), 0.7);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(fx, y); ctx.lineTo(fx + (rng() - 0.5) * 2.4, y + 13); ctx.stroke();
    fx += fw; alt += 1;
  }

  /* the plinth moulding, then the flood-stained face below it */
  ctx.fillStyle = withAlpha(mixHex(mat.deep, pal.shadow, 0.5), 0.9);
  ctx.fillRect(x, y + 14, w, 3.5);
  ctx.fillStyle = withAlpha(mat.lip, 0.10);
  ctx.fillRect(x, y + 13, w, 1);

  const gr = grain(ctx, 'reliquary-marble', {
    size: 128, base: 'rgba(0,0,0,0)',
    light: withAlpha(pal.glow, 0.08),
    dark: 'rgba(0,6,8,.32)',
    accent: withAlpha(m.lily.face, 0.14),
    density: 280,
  });
  if (gr) {
    ctx.save();
    ctx.globalAlpha = 0.46;
    ctx.fillStyle = gr;
    ctx.translate(x % 128, y % 128);
    ctx.fillRect(-128, -128, w + 256, h + 256);
    ctx.restore();
  }

  /* weed and algae hanging off the plinth */
  const vrng = makeRng(((x * 3221225473) ^ 0x2d) | 1);
  ctx.strokeStyle = withAlpha(m.lily.face, 0.42);
  for (let i = 0; i < Math.floor(w / 46); i += 1) {
    const vx = x + vrng() * w;
    const len = 12 + vrng() * 40;
    ctx.lineWidth = 0.9 + vrng() * 1.2;
    ctx.beginPath();
    ctx.moveTo(vx, y + 16);
    ctx.quadraticCurveTo(vx + (vrng() - 0.5) * 10, y + 16 + len * 0.6, vx + (vrng() - 0.5) * 16, y + 16 + len);
    ctx.stroke();
  }

  /* the deep water swallowing the base */
  const sink = ctx.createLinearGradient(0, y + h * 0.24, 0, y + h);
  sink.addColorStop(0, withAlpha(m.water, 0));
  sink.addColorStop(1, withAlpha(m.water, 0.55));
  ctx.fillStyle = sink;
  ctx.fillRect(x, y + h * 0.24, w, h * 0.76);
  ctx.restore();

  waterline(ctx, x, y, w, env, silt ? 1.25 : 1);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.7), x, 2.4);
}

/* A reliquary wall: gilt niches, and a pale saint standing in each. */
function paintReliquaryWall(ctx, body, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w, h } = body;
  const rng = makeRng(((x * 40503) ^ (y * 7919)) | 1);

  castShadow(ctx, x, y + h, w, 0.5, 26);

  const g = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 230));
  g.addColorStop(0, m.wall.top);
  g.addColorStop(0.05, m.wall.face);
  g.addColorStop(0.32, m.wall.foot);
  g.addColorStop(1, m.wall.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* a cornice and slender shafts, not a brick grid */
  ctx.fillStyle = withAlpha(m.wall.deep, 0.9);
  ctx.fillRect(x, y + 8, w, 3);
  ctx.fillStyle = withAlpha(pal.glow, 0.13);
  ctx.fillRect(x, y + 1.2, w, 1.3);
  for (let sx = x + 5; sx < x + w - 4; sx += 44 + rng() * 26) {
    const sg = ctx.createLinearGradient(sx, 0, sx + 7, 0);
    sg.addColorStop(0, withAlpha(m.wall.deep, 0.5));
    sg.addColorStop(0.4, withAlpha(pal.glow, 0.07));
    sg.addColorStop(1, withAlpha(m.wall.deep, 0.55));
    ctx.fillStyle = sg;
    ctx.fillRect(sx, y + 11, 7, h - 11);
  }

  /* the niches — a short lintel gets a row of small ones rather than none */
  const nw = h > 84 ? 46 : 30;
  const nh = h > 84 ? 66 : Math.max(22, h - 26);
  if (w > 92) {
    for (let nx = x + 22; nx < x + w - nw - 12; nx += nw + 40 + rng() * 44) {
      /* a short lintel can leave no headroom at all for the niche; a negative
       * range here would push the arch up out of its own wall */
      const ny = y + 24 + rng() * Math.max(0, Math.min(30, h - nh - 34));
      arch(ctx, nx, ny, nw, nh, 'rgba(2,7,9,.88)', withAlpha(m.brass.lip, 0.22), 1.3);
      /* gilt lip */
      ctx.strokeStyle = withAlpha(m.brass.lip, 0.30);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(nx + nw * 0.5, ny + nw * 0.5, nw * 0.5, Math.PI * 1.08, Math.PI * 1.82);
      ctx.stroke();
      /* a pale saint, mostly a suggestion */
      ctx.globalAlpha = 0.20;
      ctx.fillStyle = pal.glow;
      ctx.beginPath();
      ctx.ellipse(nx + nw * 0.5, ny + nh * 0.46, nw * 0.15, nh * 0.30, 0, 0, TAU);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(nx + nw * 0.5, ny + nh * 0.19, nw * 0.085, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
      /* a votive flame at its feet */
      if (rng() > 0.45) glowDot(ctx, nx + nw * 0.5, ny + nh - 6, 16, m.candle, 0.34);
    }
  }

  crust(ctx, x, y + h * 0.4, w, h * 0.6, m.lily.face, x + 5, 0.6);
  const sinkH = Math.min(80, h * 0.55);
  const sink = ctx.createLinearGradient(0, y + h - sinkH, 0, y + h);
  sink.addColorStop(0, withAlpha(m.water, 0));
  sink.addColorStop(1, withAlpha(m.water, 0.5));
  ctx.fillStyle = sink;
  ctx.fillRect(x, y + h - sinkH, w, sinkH);
  ctx.restore();

  sheen(ctx, x + 3, y + 0.9, w - 6, withAlpha(pal.glow, 0.5), x * 0.03, 0.4, 1.1);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.8), x + 3, 2.4);
}

export function paintSolid(ctx, b, env) {
  if (b.tag === 'silt') paintPaving(ctx, b, env, true);
  else if (b.tag === 'ground' || b.tag === 'floor') paintPaving(ctx, b, env, false);
  else paintReliquaryWall(ctx, b, env);
}

/* ------------------------------------------------------------------ *
 * ONE-WAY PLATFORMS
 * ------------------------------------------------------------------ */

/* A pane of saint-glass laid flat and lit from beneath. The best-looking
 * thing in the area, on purpose: you should want to stand on it. */
function paintGlass(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = 13;
  const t = env.time;
  const pulse = 0.82 + Math.sin(t * 1.3 + x * 0.01) * 0.18;

  /* the light it throws down into the water */
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  const spill = ctx.createLinearGradient(0, y + h, 0, y + h + 110);
  spill.addColorStop(0, withAlpha(m.glass, 0.24 * pulse));
  spill.addColorStop(1, withAlpha(m.glass, 0));
  ctx.fillStyle = spill;
  ctx.beginPath();
  ctx.moveTo(x + 4, y + h);
  ctx.lineTo(x + w - 4, y + h);
  ctx.lineTo(x + w + 26, y + h + 110);
  ctx.lineTo(x - 26, y + h + 110);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  /* the leaded frame */
  poly(ctx, [[x, y], [x + w, y], [x + w - 5, y + h], [x + 5, y + h]],
    withAlpha(m.lead.face, 0.95), withAlpha(m.lead.lip, 0.5), 1.3);

  /* the panes: a few coloured, most of them the same cold green as the flood */
  const rng = makeRng(((x * 6700417) ^ 0x3b) | 1);
  let px = x + 4;
  while (px < x + w - 6) {
    const pw = 9 + rng() * 15;
    const roll = rng();
    const tint = roll > 0.86 ? mixHex('#d9bbf1', pal.glow, 0.2)
      : roll > 0.7 ? mixHex('#f0d583', pal.glow, 0.2)
        : m.glass;
    ctx.fillStyle = withAlpha(tint, (0.24 + rng() * 0.34) * pulse);
    ctx.fillRect(px, y + 2.4, Math.min(pw, x + w - 6 - px), h - 5);
    ctx.strokeStyle = withAlpha(m.lead.deep, 0.85);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(px, y + 1.6); ctx.lineTo(px, y + h - 1.6); ctx.stroke();
    px += pw;
  }

  /* the lit top edge and the film of water standing on it */
  ctx.strokeStyle = withAlpha(m.shine, 0.7 * pulse);
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.moveTo(x + 2, y + 0.8); ctx.lineTo(x + w - 2, y + 0.8); ctx.stroke();
  glowDot(ctx, x + w * 0.5, y + h * 0.5, w * 0.62, m.glass, 0.13 * pulse);
}

/* A lily dais: a pad on the water with a ring of petals. */
function paintLily(ctx, p, env, shake = 0) {
  const m = M(env.palette);
  /* the tremor is driven by world time, never by Math.random(), so a shaking
   * lily paints the same at the same instant and the autotest can reproduce it */
  const jitter = shake > 0 ? (Math.sin(env.time * 44) * shake * 2.2) : 0;
  const x = p.x; const y = p.y + Math.abs(jitter) * 0.6; const w = p.w;
  const cx = x + w * 0.5;
  const t = env.time;
  const bob = Math.sin(t * 1.1 + x * 0.02) * 1.4;

  ctx.save();
  ctx.translate(0, bob);

  /* the water pushed up around it */
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = m.shine;
  ctx.beginPath();
  ctx.ellipse(cx, y + 9, w * 0.72, 6, 0, 0, TAU);
  ctx.fill();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;

  /* the pad */
  const g = ctx.createLinearGradient(0, y - 2, 0, y + 12);
  g.addColorStop(0, m.lily.top);
  g.addColorStop(0.4, m.lily.face);
  g.addColorStop(1, m.lily.deep);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, y + 5, w * 0.5, 6.4, 0, 0, TAU);
  ctx.fill();
  /* the notch every lily pad has */
  ctx.fillStyle = withAlpha(m.water, 0.9);
  ctx.beginPath();
  ctx.moveTo(cx + w * 0.5, y + 5);
  ctx.lineTo(cx + w * 0.22, y + 1.6);
  ctx.lineTo(cx + w * 0.24, y + 8.4);
  ctx.closePath(); ctx.fill();
  /* veins */
  ctx.strokeStyle = withAlpha(m.lily.lip, 0.34);
  ctx.lineWidth = 0.9;
  for (let i = 0; i < 7; i += 1) {
    const a = -Math.PI + (i / 6) * Math.PI;
    ctx.beginPath();
    ctx.moveTo(cx, y + 5);
    ctx.lineTo(cx + Math.cos(a) * w * 0.46, y + 5 + Math.sin(a) * 5.6);
    ctx.stroke();
  }
  /* the flower, which is the thing you actually aim at */
  const petals = 6;
  for (let i = 0; i < petals; i += 1) {
    const a = (i / petals) * TAU + t * 0.12;
    ctx.fillStyle = withAlpha(m.petal, 0.72);
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * 5.5, y - 1 + Math.sin(a) * 2.4, 4.2, 2.1, a, 0, TAU);
    ctx.fill();
  }
  glowDot(ctx, cx, y - 1, 15, m.petal, 0.24);

  if (shake > 0) {
    ctx.globalAlpha = shake * 0.8;
    ctx.strokeStyle = withAlpha('#ffe6b0', 0.9);
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.ellipse(cx, y + 5, w * 0.54, 8, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/* A dead root grown across the gap, pale as bone. */
function paintRoot(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = 12;
  castShadow(ctx, x, y + h + 2, w, 0.3, 18);

  const rng = makeRng(((x * 99991) ^ 0x7a) | 1);
  const g = ctx.createLinearGradient(0, y - 3, 0, y + h + 3);
  g.addColorStop(0, m.root.top);
  g.addColorStop(0.34, m.root.face);
  g.addColorStop(1, m.root.deep);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 8, y + 1);
  ctx.quadraticCurveTo(x + w * 0.3, y - 5, x + w * 0.58, y - 1);
  ctx.quadraticCurveTo(x + w * 0.82, y + 2, x + w + 8, y - 2);
  ctx.lineTo(x + w + 8, y + 8);
  ctx.quadraticCurveTo(x + w * 0.6, y + h + 3, x + w * 0.32, y + h + 2);
  ctx.quadraticCurveTo(x + w * 0.1, y + h + 1, x - 8, y + 10);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(m.root.lip, 0.3);
  ctx.lineWidth = 1;
  ctx.stroke();

  /* the fibres, and the little roots that hang down looking for the floor */
  ctx.globalAlpha = 0.3;
  ctx.strokeStyle = m.root.deep;
  ctx.lineWidth = 0.9;
  for (let i = 0; i < Math.floor(w / 7); i += 1) {
    const bx = x + rng() * w;
    ctx.beginPath();
    ctx.moveTo(bx, y + 1 + rng() * 3);
    ctx.lineTo(bx + 4 + rng() * 9, y + 5 + rng() * 5);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.7;
  ctx.strokeStyle = withAlpha(m.root.face, 0.8);
  for (let i = 0; i < Math.max(2, Math.floor(w / 40)); i += 1) {
    const bx = x + 10 + rng() * (w - 20);
    const drop = 14 + rng() * 30;
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(bx, y + h - 1);
    ctx.quadraticCurveTo(bx + (rng() - 0.5) * 12, y + h + drop * 0.6, bx + (rng() - 0.5) * 18, y + h + drop);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  sheen(ctx, x + 4, y - 1.4, w - 8, withAlpha(pal.glow, 0.5), x * 0.05, 0.4, 1.1);
}

export function paintLedge(ctx, p, env) {
  if (p.tag === 'glass') paintGlass(ctx, p, env);
  else if (p.tag === 'lily') paintLily(ctx, p, env, 0);
  else if (p.tag === 'root') paintRoot(ctx, p, env);
  else paintGlass(ctx, p, env);
}

export function paintCrumble(ctx, p, env) {
  paintLily(ctx, p, env, clamp(p.shake ?? 0, 0, 1));
}

/* A reliquary bier drifting on chains. */
export function paintMover(ctx, p, env) {
  const m = M(env.palette);
  const { x, y, w } = p;
  chain(ctx, x + 9, y - 300, x + 9, y, withAlpha(m.brass.lip, 0.45), 0, 0, 3);
  chain(ctx, x + w - 9, y - 300, x + w - 9, y, withAlpha(m.brass.lip, 0.45), 0, 0, 3);
  const h = 15;
  castShadow(ctx, x, y + h, w, 0.34, 18);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, m.brass.top);
  g.addColorStop(0.3, m.brass.face);
  g.addColorStop(1, m.brass.deep);
  poly(ctx, [[x, y], [x + w, y], [x + w - 6, y + h], [x + 6, y + h]], g, withAlpha(m.brass.lip, 0.4), 1.2);
  ctx.fillStyle = withAlpha(m.brass.lip, 0.22);
  for (let i = x + 10; i < x + w - 8; i += 18) ctx.fillRect(i, y + 4, 2, h - 8);
  glowDot(ctx, x + w * 0.5, y + 2, w * 0.5, m.candle, 0.16);
  sheen(ctx, x + 4, y + 1, w - 8, withAlpha(env.palette.glow, 0.55), x * 0.04, 0.45, 1.2);
}

/* ------------------------------------------------------------------ *
 * PROPS
 * ------------------------------------------------------------------ */

export function paintProp(ctx, prop, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  switch (prop.kind) {
    case 'lantern': {
      /* hangs on a chain out of the dark above, and lands on the water */
      const { x, y } = prop;
      const hgt = prop.h ?? 80;
      const sway = Math.sin(t * 0.8 + x * 0.02) * 0.05;
      const topY = y - hgt - 120;
      ctx.save();
      ctx.translate(x, topY);
      ctx.rotate(sway);
      chain(ctx, 0, 0, 0, 120, withAlpha(m.brass.lip, 0.42), 0, 0, 2.4);
      const ly = 120;
      const flick = 0.84 + Math.sin(t * 6.2 + x) * 0.1;
      glowDot(ctx, 0, ly + 9, 52 * flick, m.candle, 0.26);
      glowDot(ctx, 0, ly + 9, 16, '#fff4c8', 0.5);
      poly(ctx, [[-6, ly + 2], [6, ly + 2], [7.5, ly + 17], [-7.5, ly + 17]],
        withAlpha('#ffe6a8', 0.44 * flick), withAlpha(m.brass.lip, 0.6), 1.1);
      poly(ctx, [[-7, ly + 2], [7, ly + 2], [0, ly - 5]], m.brass.face, withAlpha(m.brass.lip, 0.5), 1);
      ctx.restore();
      lightPool(ctx, x, prop.groundY ?? y, 110, m.candle, 0.28 * (0.9 + Math.sin(t * 6.2 + x) * 0.1));
      break;
    }
    case 'statue':
    case 'cross': {
      /* a robed saint standing in the flood, worn faceless */
      const { x, y } = prop;
      const hgt = prop.h ?? 78;
      groundShadow(ctx, x, y, 20, 0.4);
      const g = ctx.createLinearGradient(0, y - hgt, 0, y);
      g.addColorStop(0, m.marble.top);
      g.addColorStop(0.5, m.marble.face);
      g.addColorStop(1, m.marble.deep);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 9, y);
      ctx.quadraticCurveTo(x - 11, y - hgt * 0.5, x - 5, y - hgt * 0.76);
      ctx.quadraticCurveTo(x, y - hgt * 1.02, x + 5, y - hgt * 0.76);
      ctx.quadraticCurveTo(x + 11, y - hgt * 0.5, x + 9, y);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = withAlpha(pal.glow, 0.12);
      ctx.beginPath(); ctx.ellipse(x - 3, y - hgt * 0.6, 2.6, hgt * 0.3, 0, 0, TAU); ctx.fill();
      /* the hood, hollow */
      ctx.fillStyle = 'rgba(3,9,11,.8)';
      ctx.beginPath(); ctx.ellipse(x, y - hgt * 0.8, 4.2, 5.4, 0, 0, TAU); ctx.fill();
      crust(ctx, x - 10, y - hgt, 20, hgt, m.lily.face, x, 1.0);
      waterline(ctx, x - 11, y - 1, 22, env, 0.7);
      break;
    }
    case 'headstone': {
      /* a stele: a name-plate of dark stone with a gilt rim */
      const { x, y } = prop;
      const hgt = prop.h ?? 36; const wdt = prop.w ?? 24;
      groundShadow(ctx, x, y, wdt, 0.3);
      arch(ctx, x - wdt * 0.5, y - hgt, wdt, hgt, (() => {
        const g = ctx.createLinearGradient(0, y - hgt, 0, y);
        g.addColorStop(0, m.wall.top); g.addColorStop(1, m.wall.deep);
        return g;
      })(), withAlpha(m.brass.lip, 0.26), 1.2);
      ctx.globalAlpha = 0.28;
      ctx.strokeStyle = m.wall.deep; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(x - wdt * 0.26, y - hgt * 0.54 + i * 5);
        ctx.lineTo(x + wdt * 0.26, y - hgt * 0.54 + i * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      waterline(ctx, x - wdt * 0.5, y - 1, wdt, env, 0.7);
      break;
    }
    case 'urn': {
      const { x, y } = prop;
      groundShadow(ctx, x, y, 14, 0.32);
      const g = ctx.createLinearGradient(x - 10, y - 26, x + 10, y);
      g.addColorStop(0, m.marble.top); g.addColorStop(1, m.marble.deep);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.quadraticCurveTo(x - 13, y - 15, x - 6, y - 22);
      ctx.lineTo(x + 6, y - 22);
      ctx.quadraticCurveTo(x + 13, y - 15, x + 7, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = withAlpha(m.brass.lip, 0.34);
      ctx.fillRect(x - 8, y - 25, 16, 2.6);
      glowDot(ctx, x, y - 24, 14, m.candle, 0.22);
      waterline(ctx, x - 9, y - 1, 18, env, 0.7);
      break;
    }
    case 'tree': {
      /* the roots that came in through the vault when the water did */
      const { x, y } = prop;
      const hgt = prop.h ?? 200;
      const rng = makeRng((x * 8191) | 1);
      ctx.save();
      ctx.globalAlpha = 0.9;
      ctx.strokeStyle = mixHex(m.root.deep, pal.shadow, 0.35);
      ctx.lineCap = 'round';
      const branch = (bx, by, ang, len, wdt, depth) => {
        if (depth <= 0 || len < 5) return;
        const ex = bx + Math.cos(ang) * len;
        const ey = by + Math.sin(ang) * len;
        ctx.lineWidth = wdt;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + Math.cos(ang - 0.3) * len * 0.55, by + Math.sin(ang - 0.3) * len * 0.55, ex, ey);
        ctx.stroke();
        branch(ex, ey, ang - 0.4 - rng() * 0.28, len * (0.63 + rng() * 0.13), wdt * 0.62, depth - 1);
        branch(ex, ey, ang + 0.36 + rng() * 0.3, len * (0.6 + rng() * 0.16), wdt * 0.6, depth - 1);
      };
      groundShadow(ctx, x, y, 40, 0.4);
      branch(x, y, -Math.PI * 0.5, hgt * 0.4, 9, 5);
      ctx.restore();
      waterline(ctx, x - 22, y - 1, 44, env, 0.8);
      break;
    }
    case 'lilies': {
      const { x, y } = prop;
      const w = prop.w ?? 120;
      const rng = makeRng((x * 2654435761) | 1);
      for (let i = 0; i < Math.max(3, w / 26); i += 1) {
        const px = x + rng() * w;
        const py = y - rng() * 5;
        ctx.fillStyle = withAlpha(m.lily.face, 0.7);
        ctx.beginPath();
        ctx.ellipse(px, py + 2, 9 + rng() * 6, 3, 0, 0, TAU);
        ctx.fill();
        if (rng() > 0.45) {
          glowDot(ctx, px, py - 2, 13, m.petal, 0.24);
          ctx.fillStyle = withAlpha(m.petal, 0.85);
          for (let k = 0; k < 5; k += 1) {
            const a = (k / 5) * TAU;
            ctx.beginPath();
            ctx.ellipse(px + Math.cos(a) * 3, py - 2 + Math.sin(a) * 1.6, 3, 1.6, a, 0, TAU);
            ctx.fill();
          }
        }
      }
      break;
    }
    case 'organ': {
      /* a rank of pipes going up out of frame */
      const { x, y } = prop;
      const w = prop.w ?? 130;
      const rng = makeRng((x * 104729) | 1);
      ctx.save();
      let px = x;
      while (px < x + w) {
        const pw = 9 + rng() * 8;
        const ph = 140 + rng() * 260;
        const g = ctx.createLinearGradient(px, 0, px + pw, 0);
        g.addColorStop(0, m.brass.deep);
        g.addColorStop(0.34, m.brass.face);
        g.addColorStop(0.55, m.brass.top);
        g.addColorStop(1, m.brass.deep);
        ctx.fillStyle = g;
        ctx.fillRect(px, y - ph, pw, ph);
        ctx.fillStyle = withAlpha(m.brass.lip, 0.22);
        ctx.beginPath();
        ctx.ellipse(px + pw * 0.5, y - ph, pw * 0.5, 3, 0, 0, TAU);
        ctx.fill();
        px += pw + 2;
      }
      ctx.restore();
      waterline(ctx, x, y - 1, w, env, 0.8);
      break;
    }
    case 'candles': {
      const { x, y } = prop;
      const rng = makeRng((x * 40503) | 1);
      ctx.fillStyle = m.brass.face;
      ctx.fillRect(x - 22, y - 30, 44, 3.4);
      ctx.fillRect(x - 2, y - 30, 4, 30);
      for (let i = 0; i < 5; i += 1) {
        const cx = x - 18 + i * 9;
        const ch = 6 + rng() * 8;
        ctx.fillStyle = 'rgba(238,240,222,.8)';
        ctx.fillRect(cx - 1.4, y - 30 - ch, 2.8, ch);
        const flick = 0.7 + Math.sin(t * (7 + i) + i) * 0.3;
        glowDot(ctx, cx, y - 32 - ch, 13 * flick, m.candle, 0.4);
      }
      break;
    }
    case 'fence': {
      /* an altar rail, half drowned */
      const { x, y } = prop;
      const w = prop.w ?? 110;
      ctx.save();
      ctx.strokeStyle = m.brass.face;
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.moveTo(x, y - 28); ctx.lineTo(x + w, y - 28); ctx.stroke();
      for (let px = x + 6; px < x + w; px += 18) {
        ctx.lineWidth = 1.6;
        ctx.beginPath(); ctx.moveTo(px, y - 30); ctx.lineTo(px, y - 2); ctx.stroke();
        glowDot(ctx, px, y - 31, 6, m.candle, 0.2);
      }
      ctx.restore();
      waterline(ctx, x, y - 1, w, env, 0.7);
      break;
    }
    case 'shrine': {
      const { x, y } = prop;
      const hgt = prop.h ?? 100;
      groundShadow(ctx, x, y, 40, 0.44);
      poly(ctx, [[x - 26, y], [x - 22, y - hgt * 0.7], [x, y - hgt], [x + 22, y - hgt * 0.7], [x + 26, y]],
        (() => { const g = ctx.createLinearGradient(0, y - hgt, 0, y); g.addColorStop(0, m.wall.top); g.addColorStop(1, m.wall.deep); return g; })(),
        withAlpha(m.brass.lip, 0.3), 1.4);
      arch(ctx, x - 12, y - hgt * 0.66, 24, hgt * 0.56, 'rgba(2,8,10,.88)', withAlpha(m.brass.lip, 0.26), 1.2);
      const flick = 0.8 + Math.sin(t * 5.4 + x) * 0.15;
      glowDot(ctx, x, y - hgt * 0.3, 28, m.candle, 0.42 * flick);
      waterline(ctx, x - 27, y - 1, 54, env, 0.8);
      break;
    }
    case 'sundisc': {
      const { x, y } = prop;
      const lit0 = prop.lit ? 1 : 0.34;
      const spin = t * 0.42;
      glowDot(ctx, x, y - 34, 68, prop.lit ? '#ffe9a4' : pal.glow, 0.22 * lit0);
      ctx.save();
      ctx.translate(x, y - 34);
      ctx.strokeStyle = withAlpha(prop.lit ? '#ffdf92' : pal.glow, 0.8 * lit0);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i += 1) {
        const a = spin + (i / 12) * TAU;
        line(ctx, Math.cos(a) * 17, Math.sin(a) * 17,
          Math.cos(a) * (17 + (i % 2 ? 9 : 5)), Math.sin(a) * (17 + (i % 2 ? 9 : 5)),
          withAlpha(prop.lit ? '#ffe9a8' : pal.glow, 0.85 * lit0), 1.8);
      }
      ctx.fillStyle = withAlpha(prop.lit ? '#fff4c4' : pal.glow, 0.3 * lit0);
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.fillStyle = m.brass.face;
      ctx.fillRect(x - 3, y - 22, 6, 22);
      waterline(ctx, x - 12, y - 1, 24, env, 1.1);
      break;
    }
    default: break;
  }
}

/* ------------------------------------------------------------------ */

export function paintBreakable(ctx, b, env) {
  if (b.kind === 'falsewall') {
    paintReliquaryWall(ctx, { x: b.x, y: b.y, w: b.w, h: b.h }, env);
    ctx.save();
    ctx.strokeStyle = withAlpha(env.palette.glow, 0.13);
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(b.x + 4, b.y + 4, b.w - 8, b.h - 8);
    ctx.setLineDash([]);
    ctx.restore();
  } else {
    paintProp(ctx, { kind: 'urn', x: b.x + b.w * 0.5, y: b.y + b.h }, env);
  }
  if (b.flash > 0) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = withAlpha('#d8f5fb', b.flash * 0.45);
    ctx.fillRect(b.x, b.y, b.w, b.h);
    ctx.restore();
  }
}

/* ------------------------------------------------------------------ *
 * HAZARD — the deep.
 * ------------------------------------------------------------------ */

export function paintHazard(ctx, hzRect, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  /* paint wider than the collision rect: hazards are drawn before terrain, so
   * the overhang slides under the paving and the water stops being a box */
  const OVER = 150;
  const hz = { x: hzRect.x - OVER, y: hzRect.y, w: hzRect.w + OVER * 2, h: hzRect.h, kind: hzRect.kind };
  ctx.save();

  const g = ctx.createLinearGradient(0, hz.y - 22, 0, hz.y + Math.min(hz.h, 260));
  g.addColorStop(0, withAlpha(m.water, 0.72));
  g.addColorStop(0.16, withAlpha(mixHex(m.water, pal.shadow, 0.5), 0.94));
  g.addColorStop(0.6, 'rgba(2,10,12,.97)');
  g.addColorStop(1, 'rgba(1,5,7,1)');
  ctx.fillStyle = g;
  ctx.fillRect(hz.x, hz.y - 22, hz.w, hz.h + 22);

  /* the surface: caustics and a bright rim where it meets the stone */
  ctx.globalCompositeOperation = 'screen';
  const rng = makeRng(((hz.x * 6700417) ^ 0x5d) | 1);
  for (let i = 0; i < Math.floor(hz.w / 20); i += 1) {
    const cx = hz.x + rng() * hz.w;
    const drift = Math.sin(t * 0.55 + cx * 0.018) * 22;
    ctx.globalAlpha = 0.05 + rng() * 0.07;
    ctx.fillStyle = m.shine;
    ctx.beginPath();
    ctx.ellipse(cx + drift, hz.y - 14 + rng() * 26, 14 + rng() * 30, 2.2, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';

  ctx.strokeStyle = withAlpha(m.shine, 0.5);
  ctx.lineWidth = 1.4;
  ctx.beginPath();
  const steps = Math.max(6, Math.floor(hz.w / 20));
  for (let i = 0; i <= steps; i += 1) {
    const f = i / steps;
    const px = hz.x + hz.w * f;
    const py = hz.y - 20 + Math.sin(t * 1.4 + px * 0.04) * 1.6;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();

  /* petals turning on the surface — the only thing down there that moves */
  const prng = makeRng(((hz.x * 40503) ^ 0x11) | 1);
  for (let i = 0; i < Math.floor(hz.w / 90); i += 1) {
    const base = hz.x + prng() * hz.w;
    const px = base + Math.sin(t * 0.3 + i * 2.1) * 26;
    const py = hz.y - 16 + Math.sin(t * 0.9 + i) * 3;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = m.petal;
    ctx.beginPath();
    ctx.ellipse(px, py, 4.4, 1.8, Math.sin(t * 0.4 + i), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * FOREGROUND
 * ------------------------------------------------------------------ */

export function paintFront(ctx, item, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  switch (item.kind) {
    case 'roots':
    case 'bough': {
      /* pale roots crossing the top of frame, close enough to be out of focus */
      const { x, y } = item;
      const w = item.w ?? 440;
      const rng = makeRng((x * 99991) | 1);
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.94;
      ctx.strokeStyle = 'rgba(4,10,12,.96)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 15;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * 0.45, y + 40, x + w, y - 10);
      ctx.stroke();
      ctx.lineWidth = 5.5;
      for (let i = 0; i < 9; i += 1) {
        const tt = 0.06 + rng() * 0.88;
        const bx = x + w * tt;
        const by = y + Math.sin(tt * Math.PI) * 34;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + (rng() - 0.5) * 50, by + 34 + rng() * 32, bx + (rng() - 0.5) * 84, by + 60 + rng() * 50);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
    case 'mist': {
      const { x, y } = item;
      const w = item.w ?? 520;
      ctx.save();
      ctx.globalAlpha = 0.32;
      for (let i = 0; i < 3; i += 1) {
        const off = Math.sin(t * 0.18 + i * 2.3 + x * 0.01) * 26;
        const g = ctx.createLinearGradient(0, y - 34 + i * 12, 0, y + 34);
        g.addColorStop(0, withAlpha(m.shine, 0));
        g.addColorStop(0.5, withAlpha(pal.mid, 0.55));
        g.addColorStop(1, withAlpha(pal.ground, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5 + off, y + i * 8, w * 0.55, 24 + i * 7, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'railing': {
      /* the gallery rail, between the lens and the drop: nearly a silhouette,
       * with one cold rim along the top bar where the rose window catches it */
      const { x, y } = item;
      const w = item.w ?? 300;
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.9;
      railing(ctx, x, y, w, 40, 'rgba(4,10,12,.95)', withAlpha(m.shine, 0.34), x, 26);
      ctx.restore();
      break;
    }
    case 'chain': {
      const { x, y } = item;
      const hgt = item.h ?? 300;
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.95;
      chain(ctx, x, y, x + (item.dx ?? 26), y + hgt, 'rgba(3,8,10,.98)', item.sag ?? 20, 0, 9);
      ctx.globalAlpha = 0.2;
      chain(ctx, x - 1.6, y, x + (item.dx ?? 26) - 1.6, y + hgt, withAlpha(pal.glow, 0.7), item.sag ?? 20, 0, 9);
      ctx.restore();
      break;
    }
    case 'drip': {
      /* water coming off something above, hitting the flood */
      const { x, y } = item;
      const w = item.w ?? 200;
      const rng = makeRng((x * 15485863) | 1);
      ctx.save();
      for (let i = 0; i < 7; i += 1) {
        const px = x + rng() * w;
        const period = 1.4 + rng() * 1.8;
        const f = ((t + i * 0.6) % period) / period;
        const py = y - 200 + f * 240;
        ctx.globalAlpha = 0.34 * (1 - f * 0.5);
        ctx.strokeStyle = withAlpha(m.shine, 0.85);
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px, py + 11); ctx.stroke();
        if (f > 0.94) {
          ctx.globalAlpha = (1 - f) * 8;
          ctx.beginPath(); ctx.ellipse(px, y + 38, 9, 2.4, 0, 0, TAU); ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }
    default: break;
  }
}

export const reliquaryPainter = {
  key: 'reliquary',
  light: LIGHT,
  paintSolid, paintLedge, paintCrumble, paintMover,
  paintProp, paintBreakable, paintHazard, paintFront,
};
