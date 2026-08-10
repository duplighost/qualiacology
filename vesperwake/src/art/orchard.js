/* art/orchard.js — THE WAKE ORCHARD.
 *
 * A graveyard terrace of wet flagstone on the lip of a gorge, planted with
 * bare pear trees that fruit out of season. The painting behind it decides
 * everything: moonlight from the upper right, warm lantern light low and
 * close, rain, and a blue-grey stone that is almost never neutral.
 *
 * Nothing here is a generic platform. A ledge is a toppled headstone. A
 * crumbling step is a rotten plank laid over a grave cut. A high platform is
 * a pear bough thick enough to stand on. If it holds your weight, it is
 * something that would be in this orchard.
 */

import { TAU, hash01, makeRng, clamp, lerp, mixHex, withAlpha } from '../core.js';
import {
  slab, courses, chipEdge, crust, sheen, castShadow, groundShadow, glowDot,
  railing, chain, arch, lightPool, grain, poly, line, ramp, dim, lit,
} from './paint.js';

export const LIGHT = { x: 0.62, y: -0.78 };

/* Materials are mixed from the sampled matte so the stone in front is made of
 * the stone behind. */
function mats(pal) {
  return {
    flag: ramp('#3a4652', pal, { blend: 0.34, sink: 0.34, topMix: 0.20, footMix: 0.72 }),
    tomb: ramp('#5a636d', pal, { blend: 0.24, sink: 0.13, topMix: 0.32, footMix: 0.52 }),
    slab: ramp('#565f69', pal, { blend: 0.26, sink: 0.26, topMix: 0.30, footMix: 0.60 }),
    bark: ramp('#4a3b2e', pal, { blend: 0.16, sink: 0.18, topMix: 0.24, footMix: 0.66 }),
    plank: ramp('#5b4633', pal, { blend: 0.14, sink: 0.16, topMix: 0.28, footMix: 0.66 }),
    iron: ramp('#2b333a', pal, { blend: 0.10, sink: 0.10, topMix: 0.34 }),
    moss: mixHex('#3f5c46', pal.mid, 0.35),
    pear: mixHex('#e8dfae', pal.glow, 0.34),
    lamp: mixHex(pal.warm, '#ffdc92', 0.45),
    wet: withAlpha(pal.glow, 0.5),
  };
}

let cachedPal = null; let cachedMats = null;
const M = (pal) => {
  if (cachedPal !== pal) { cachedPal = pal; cachedMats = mats(pal); }
  return cachedMats;
};

/* ------------------------------------------------------------------ *
 * SOLID GROUND — the wet flagstone terrace.
 * ------------------------------------------------------------------ */

function paintFlagstone(ctx, b, env) {
  const m = M(env.palette);
  const { x, y, w } = b;
  const h = Math.min(b.h, 260);
  const pal = env.palette;

  /* The terrace is a LIP, not a wall. Light lands on the top 3px and the
   * first hand's-breadth of the fascia; everything below that falls into the
   * gorge. Foreground surfaces sit BELOW the matte in value or the picture
   * comes apart. */
  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, m.flag.top);
  body.addColorStop(0.045, m.flag.face);
  body.addColorStop(0.13, m.flag.foot);
  body.addColorStop(0.42, m.flag.deep);
  body.addColorStop(1, mixHex(m.flag.deep, pal.shadow, 0.7));
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* ---- the walking surface: irregular flags, each its own value ---- */
  const rng = makeRng(((x * 31) ^ 0x9e37) | 1);
  let fx = x - 30;
  while (fx < x + w + 30) {
    const fw = 30 + rng() * 52;
    const tone = rng();
    const flagTop = tone < 0.34
      ? mixHex(m.flag.top, pal.shadow, 0.20)
      : tone > 0.82 ? mixHex(m.flag.top, pal.glow, 0.13) : m.flag.top;
    ctx.fillStyle = flagTop;
    ctx.fillRect(fx, y, fw - 1.2, 3.4);
    /* the seam between flags, cut into the fascia */
    ctx.strokeStyle = withAlpha(mixHex(m.flag.deep, pal.shadow, 0.5), 0.8);
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(fx, y);
    ctx.lineTo(fx + (rng() - 0.5) * 3, y + 12 + rng() * 4);
    ctx.stroke();
    fx += fw;
  }
  /* the lip itself, catching the moon */
  ctx.fillStyle = m.flag.lip;
  ctx.fillRect(x, y, w, 1.5);

  /* ---- fascia: a dentil course, low contrast, irregular ---- */
  ctx.fillStyle = withAlpha(mixHex(m.flag.deep, pal.shadow, 0.55), 0.9);
  ctx.fillRect(x, y + 15, w, 3);
  const crng = makeRng(((x * 2246822519) ^ 0x33) | 1);
  for (let cxp = x + 10 + crng() * 26; cxp < x + w - 10; cxp += 26 + crng() * 12) {
    ctx.globalAlpha = 0.35 + crng() * 0.3;
    ctx.fillStyle = mixHex(m.flag.foot, pal.shadow, 0.35);
    ctx.fillRect(cxp, y + 18, 9 + crng() * 4, 6 + crng() * 3);
  }
  ctx.globalAlpha = 1;
  ctx.fillStyle = withAlpha(m.flag.lip, 0.10);
  ctx.fillRect(x, y + 14, w, 1);

  /* ---- grain ---- */
  const g = grain(ctx, 'orchard-flag', {
    size: 128, base: 'rgba(0,0,0,0)',
    light: withAlpha(pal.glow, 0.09),
    dark: 'rgba(0,3,7,.34)',
    accent: withAlpha(m.moss, 0.13),
    density: 300,
  });
  if (g) {
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = g;
    ctx.translate(x % 128, y % 128);
    ctx.fillRect(-128, -128, w + 256, h + 256);
    ctx.restore();
  }
  crust(ctx, x, y + 1, w, 15, m.moss, x, 0.8);

  /* ---- standing water in the low spots ---- */
  const prng = makeRng(((x * 7919) ^ 0x51ed) | 1);
  for (let i = 0; i < Math.floor(w / 190); i += 1) {
    const px = x + 30 + prng() * (w - 60);
    const pw = 46 + prng() * 100;
    ctx.save();
    ctx.globalAlpha = 0.20 + prng() * 0.14;
    const pg = ctx.createLinearGradient(px, y, px, y + 4);
    pg.addColorStop(0, withAlpha(pal.glow, 0.5));
    pg.addColorStop(1, withAlpha(pal.sky, 0.0));
    ctx.fillStyle = pg;
    ctx.fillRect(px, y, pw, 3.4);
    ctx.restore();
  }

  /* ---- an iron drain grate, rarely ---- */
  const drng = makeRng(((x * 104729) ^ 0x1234) | 1);
  for (let dx = x + 220; dx < x + w - 120; dx += 520 + drng() * 380) {
    const gw = 30;
    ctx.fillStyle = withAlpha(mixHex(m.iron.foot, pal.shadow, 0.4), 0.9);
    ctx.fillRect(dx, y + 0.6, gw, 3);
    ctx.strokeStyle = withAlpha(m.iron.lip, 0.28);
    ctx.lineWidth = 0.8;
    for (let i = 1; i < 6; i += 1) {
      ctx.beginPath();
      ctx.moveTo(dx + i * (gw / 6), y + 0.8);
      ctx.lineTo(dx + i * (gw / 6), y + 3.4);
      ctx.stroke();
    }
  }

  /* ---- the cut face below: bedrock, fissures, hanging vine ---- */
  const rockRng = makeRng(((x * 15485863) ^ 0xabc) | 1);
  for (let i = 0; i < Math.floor(w / 18); i += 1) {
    const rx = x + rockRng() * w;
    const ry = y + 30 + rockRng() * rockRng() * (h - 40);
    const fade = Math.max(0, 1 - (ry - y) / (h * 0.7));
    ctx.globalAlpha = (0.05 + rockRng() * 0.12) * fade;
    ctx.fillStyle = rockRng() > 0.55 ? m.flag.face : m.flag.deep;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 16 + rockRng() * 40, 6 + rockRng() * 18, (rockRng() - 0.5) * 0.5, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 0.20;
  ctx.strokeStyle = mixHex(m.flag.deep, pal.shadow, 0.6);
  for (let i = 0; i < Math.floor(w / 80); i += 1) {
    const cx2 = x + rockRng() * w;
    ctx.lineWidth = 1 + rockRng() * 1.8;
    ctx.beginPath();
    ctx.moveTo(cx2, y + 26);
    ctx.lineTo(cx2 + (rockRng() - 0.5) * 30, y + 26 + 50 + rockRng() * 90);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  const vrng = makeRng(((x * 3221225473) ^ 0x9d) | 1);
  ctx.strokeStyle = withAlpha(m.moss, 0.42);
  for (let i = 0; i < Math.floor(w / 64); i += 1) {
    const vx = x + vrng() * w;
    const len = 14 + vrng() * 46;
    ctx.lineWidth = 0.9 + vrng();
    ctx.beginPath();
    ctx.moveTo(vx, y + 16);
    ctx.quadraticCurveTo(vx + (vrng() - 0.5) * 12, y + 16 + len * 0.6, vx + (vrng() - 0.5) * 20, y + 16 + len);
    ctx.stroke();
  }

  /* ---- mist gathering against the base of the terrace ---- */
  const mist = ctx.createLinearGradient(0, y + h * 0.30, 0, y + h);
  mist.addColorStop(0, withAlpha(pal.mid, 0));
  mist.addColorStop(1, withAlpha(pal.mid, 0.34));
  ctx.fillStyle = mist;
  ctx.fillRect(x, y + h * 0.30, w, h * 0.7);
  ctx.restore();

  /* wet sheen along the lip, angled to the moon */
  sheen(ctx, x + 4, y + 0.9, w - 8, withAlpha(pal.glow, 0.6), x * 0.02, 0.42, 1.2);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.75), x, 2.6);
}

/* A mausoleum: a mass of dark stone with light only on its top edge and its
 * pilasters. The failure mode this replaces was a pale brick box — a regular
 * grid across a big surface is the single fastest way to make a wall look
 * like a stock asset. */
function paintTomb(ctx, body, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w, h } = body;
  const rng = makeRng(((x * 40503) ^ (y * 7919)) | 1);

  castShadow(ctx, x, y + h, w, 0.5, 26);

  const g = ctx.createLinearGradient(0, y, 0, y + Math.min(h, 220));
  g.addColorStop(0, m.tomb.top);
  g.addColorStop(0.05, m.tomb.face);
  g.addColorStop(0.30, m.tomb.foot);
  g.addColorStop(1, m.tomb.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* a cornice, then pilasters at the ends and at wide intervals */
  ctx.fillStyle = withAlpha(m.tomb.deep, 0.9);
  ctx.fillRect(x, y + 9, w, 3.5);
  ctx.fillStyle = withAlpha(pal.glow, 0.16);
  ctx.fillRect(x, y + 1.4, w, 1.4);

  const pilasterAt = (px, pw) => {
    const pg = ctx.createLinearGradient(px, 0, px + pw, 0);
    pg.addColorStop(0, withAlpha(m.tomb.deep, 0.55));
    pg.addColorStop(0.42, withAlpha(pal.glow, 0.07));
    pg.addColorStop(1, withAlpha(m.tomb.deep, 0.62));
    ctx.fillStyle = pg;
    ctx.fillRect(px, y + 12, pw, h - 12);
    ctx.fillStyle = withAlpha(pal.glow, 0.13);
    ctx.fillRect(px + pw * 0.28, y + 12, 1.6, h - 12);
  };
  pilasterAt(x + 3, 16);
  pilasterAt(x + w - 19, 16);
  for (let px = x + 3 + 150; px < x + w - 60; px += 140 + rng() * 90) pilasterAt(px, 13);

  /* a very small number of very large ashlar joints, jittered */
  ctx.strokeStyle = withAlpha(mixHex(m.tomb.deep, pal.shadow, 0.5), 0.55);
  ctx.lineWidth = 1;
  for (let cy = y + 46; cy < y + h - 12; cy += 44 + rng() * 26) {
    ctx.beginPath();
    ctx.moveTo(x, cy);
    for (let sx = x; sx < x + w; sx += 40) ctx.lineTo(sx, cy + (rng() - 0.5) * 1.6);
    ctx.stroke();
  }

  /* recessed niches, only where there is room for them */
  const nw = 64; const nh = 84;
  if (w > 120 && h > 110) {
    for (let nx = x + 34; nx < x + w - nw - 20; nx += nw + 58 + rng() * 70) {
      const ny = y + 30 + rng() * Math.min(40, h - nh - 40);
      arch(ctx, nx, ny, nw, nh, 'rgba(2,5,9,.86)', withAlpha(m.tomb.lip, 0.16), 1.3);
      /* the shoulder of the niche catches the moon */
      ctx.strokeStyle = withAlpha(pal.glow, 0.13);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(nx + nw * 0.5, ny + nw * 0.5, nw * 0.5, Math.PI * 1.15, Math.PI * 1.75);
      ctx.stroke();
      /* a pale figure standing in the dark of it */
      if (rng() > 0.42) {
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = pal.glow;
        ctx.beginPath();
        ctx.ellipse(nx + nw * 0.5, ny + nh * 0.42, nw * 0.16, nh * 0.30, 0, 0, TAU);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(nx + nw * 0.5, ny + nh * 0.18, nw * 0.08, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }
  } else if (w > 46 && h > 54) {
    const pw = Math.min(w - 20, 58);
    const ph = Math.min(h - 18, 70);
    arch(ctx, x + (w - pw) * 0.5, y + 18, pw, ph, 'rgba(2,5,9,.8)', withAlpha(m.tomb.lip, 0.18), 1.2);
  }

  /* grain + weathering, heaviest at the base */
  const gr = grain(ctx, 'orchard-tomb', {
    size: 128, base: 'rgba(0,0,0,0)',
    light: withAlpha(pal.glow, 0.06),
    dark: 'rgba(0,3,7,.34)',
    accent: withAlpha(m.moss, 0.12),
    density: 260,
  });
  if (gr) {
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = gr;
    ctx.translate(x % 128, y % 128);
    ctx.fillRect(-128, -128, w + 256, h + 256);
    ctx.restore();
  }
  crust(ctx, x, y + h * 0.35, w, h * 0.65, m.moss, x + 7, 0.7);

  /* the mass sinks into shadow near the ground */
  const sinkH = Math.min(70, h * 0.42);
  const sink = ctx.createLinearGradient(0, y + h - sinkH, 0, y + h);
  sink.addColorStop(0, 'rgba(1,4,8,0)');
  sink.addColorStop(1, 'rgba(1,4,8,.44)');
  ctx.fillStyle = sink;
  ctx.fillRect(x, y + h - sinkH, w, sinkH);
  ctx.restore();

  sheen(ctx, x + 3, y + 0.9, w - 6, withAlpha(pal.glow, 0.5), x * 0.03, 0.4, 1.1);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.8), x + 3, 2.6);
}

export function paintSolid(ctx, b, env) {
  if (b.tag === 'tomb' || b.tag === 'block' || b.tag === 'wall') paintTomb(ctx, b, env);
  else paintFlagstone(ctx, b, env);
}

/* ------------------------------------------------------------------ *
 * ONE-WAY PLATFORMS
 * ------------------------------------------------------------------ */

/* A toppled headstone. Carved face, chipped shoulders, moss on the north. */
function paintGraveSlab(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = 17;
  castShadow(ctx, x, y + h, w, 0.40, 20);

  /* the stone: wider at the top, chipped at both ends, sunk at one corner */
  const rng = makeRng(((x * 2654435761) ^ 0xfe) | 1);
  const tiltR = (rng() - 0.5) * 3.2;
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, m.slab.top);
  g.addColorStop(0.18, m.slab.face);
  g.addColorStop(0.62, m.slab.foot);
  g.addColorStop(1, m.slab.deep);
  poly(ctx, [
    [x + 2, y + tiltR * 0.4],
    [x + w - 2, y - tiltR * 0.4],
    [x + w - 7, y + h],
    [x + 7, y + h],
  ], g, withAlpha(m.slab.lip, 0.30), 1.1);

  /* the lit lip, broken where the stone is chipped */
  ctx.save();
  ctx.strokeStyle = withAlpha(pal.glow, 0.55);
  ctx.lineWidth = 1.6;
  let lx = x + 3;
  while (lx < x + w - 4) {
    const seg = 12 + rng() * 34;
    ctx.beginPath();
    ctx.moveTo(lx, y + 0.8 + tiltR * 0.4 * (1 - (lx - x) / w));
    ctx.lineTo(Math.min(lx + seg, x + w - 4), y + 0.8);
    ctx.stroke();
    lx += seg + 3 + rng() * 12;
  }
  ctx.restore();

  /* the inscription face, worn to nothing */
  ctx.save();
  ctx.globalAlpha = 0.26;
  ctx.strokeStyle = m.slab.deep;
  ctx.lineWidth = 1;
  for (let i = 0; i < 3; i += 1) {
    const ly = y + 5 + i * 3.2;
    const lx0 = x + 12 + rng() * 14;
    const lx1 = x + w - 12 - rng() * 18;
    if (lx1 - lx0 > 14) { ctx.beginPath(); ctx.moveTo(lx0, ly); ctx.lineTo(lx1, ly); ctx.stroke(); }
  }
  /* a cross incised at one end */
  const cx = rng() > 0.5 ? x + 12 : x + w - 12;
  ctx.globalAlpha = 0.34;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(cx, y + 3.5); ctx.lineTo(cx, y + 11);
  ctx.moveTo(cx - 3, y + 6); ctx.lineTo(cx + 3, y + 6);
  ctx.stroke();
  ctx.restore();

  /* the dark underside, so it does not float */
  ctx.fillStyle = 'rgba(1,4,8,.55)';
  ctx.fillRect(x + 7, y + h - 3, w - 14, 3);

  crust(ctx, x, y, w, h * 0.85, m.moss, x + 11, 1.0);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.8), x + 5, 3);
}

/* A pear bough — the high road through the orchard. */
function paintBough(ctx, p, env) {
  const m = M(env.palette);
  const { x, y, w } = p;
  const h = 13;
  castShadow(ctx, x, y + h + 2, w, 0.30, 18);

  /* the limb, thicker at its root */
  const rootLeft = (p.root ?? 'left') === 'left';
  ctx.save();
  const g = ctx.createLinearGradient(0, y - 2, 0, y + h + 4);
  g.addColorStop(0, m.bark.top);
  g.addColorStop(0.35, m.bark.face);
  g.addColorStop(1, m.bark.deep);
  ctx.fillStyle = g;
  ctx.beginPath();
  const thickA = rootLeft ? 15 : 5;
  const thickB = rootLeft ? 5 : 15;
  /* the limb tapers hard from its root and kinks twice on the way out */
  ctx.moveTo(x - 10, y - thickA * 0.55);
  ctx.quadraticCurveTo(x + w * 0.34, y - 6, x + w * 0.62, y - 2);
  ctx.quadraticCurveTo(x + w * 0.86, y + 1, x + w + 8, y - thickB * 0.3);
  ctx.lineTo(x + w + 8, y + thickB * 0.8);
  ctx.quadraticCurveTo(x + w * 0.7, y + h + 1, x + w * 0.4, y + h + 3);
  ctx.quadraticCurveTo(x + w * 0.16, y + h + 4, x - 10, y + thickA * 0.95);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(m.bark.lip, 0.34);
  ctx.lineWidth = 1.1;
  ctx.stroke();

  /* bark striations along the length */
  ctx.globalAlpha = 0.32;
  ctx.strokeStyle = m.bark.deep;
  ctx.lineWidth = 0.9;
  const rng = makeRng(((x * 40503) ^ 0x77) | 1);
  for (let i = 0; i < Math.floor(w / 9); i += 1) {
    const bx = x + rng() * w;
    ctx.beginPath();
    ctx.moveTo(bx, y + 1 + rng() * 3);
    ctx.lineTo(bx + 3 + rng() * 7, y + 6 + rng() * 5);
    ctx.stroke();
  }
  ctx.restore();

  /* twigs, blossom and out-of-season pears hanging beneath */
  const trng = makeRng(((x * 6700417) ^ 0xbe) | 1);
  ctx.save();
  ctx.strokeStyle = withAlpha(m.bark.face, 0.95);
  ctx.lineWidth = 1.8;
  for (let i = 0; i < Math.max(3, Math.floor(w / 22)); i += 1) {
    const tx = x + 12 + trng() * (w - 24);
    const drop = 10 + trng() * 20;
    ctx.beginPath();
    ctx.moveTo(tx, y + h - 2);
    ctx.quadraticCurveTo(tx + (trng() - 0.5) * 10, y + h + drop * 0.6, tx + (trng() - 0.5) * 14, y + h + drop);
    ctx.stroke();
    const px = tx + (trng() - 0.5) * 14;
    const py = y + h + drop;
    if (trng() > 0.4) {
      /* a pear, lit like the ones in the painting */
      glowDot(ctx, px, py + 3, 9, env.palette.glow, 0.16);
      ctx.fillStyle = m.pear;
      ctx.beginPath();
      ctx.ellipse(px, py + 4, 3.1, 4.2, 0, 0, TAU);
      ctx.fill();
      ctx.fillStyle = withAlpha('#ffffff', 0.5);
      ctx.beginPath(); ctx.ellipse(px - 1, py + 2.6, 0.9, 1.2, 0, 0, TAU); ctx.fill();
    } else {
      ctx.fillStyle = withAlpha('#f3f6ea', 0.72);
      for (let k = 0; k < 4; k += 1) {
        const a = (k / 4) * TAU;
        ctx.beginPath();
        ctx.ellipse(px + Math.cos(a) * 2.4, py + Math.sin(a) * 2.4, 1.5, 1.1, a, 0, TAU);
        ctx.fill();
      }
    }
  }
  ctx.restore();
  sheen(ctx, x + 6, y - 1, w - 12, withAlpha(env.palette.glow, 0.55), x * 0.04, 0.4, 1.2);
}

/* Rotten planking laid over an open grave cut. */
function paintPlank(ctx, p, env, shake = 0) {
  const m = M(env.palette);
  const jitter = shake > 0 ? (Math.random() - 0.5) * shake * 2.6 : 0;
  const x = p.x + jitter; const y = p.y + jitter * 0.5; const w = p.w;
  const h = 11;
  castShadow(ctx, x, y + h, w, 0.36, 14);
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, m.plank.top);
  g.addColorStop(0.4, m.plank.face);
  g.addColorStop(1, m.plank.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = withAlpha(m.plank.deep, 0.9);
  ctx.lineWidth = 1;
  const boards = Math.max(2, Math.round(w / 26));
  for (let i = 1; i < boards; i += 1) {
    const bx = x + (w / boards) * i;
    ctx.beginPath(); ctx.moveTo(bx, y); ctx.lineTo(bx, y + h); ctx.stroke();
  }
  /* nails catching the moon */
  ctx.fillStyle = withAlpha(env.palette.glow, 0.5);
  for (let i = 0; i < boards; i += 1) {
    const bx = x + (w / boards) * (i + 0.5);
    ctx.beginPath(); ctx.arc(bx, y + 3, 1.1, 0, TAU); ctx.fill();
  }
  crust(ctx, x, y, w, h, m.moss, x + 3, 0.7);
  if (shake > 0) {
    ctx.save();
    ctx.globalAlpha = shake * 0.7;
    ctx.strokeStyle = withAlpha('#ffdda0', 0.9);
    ctx.lineWidth = 1.2;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.restore();
  }
  sheen(ctx, x + 3, y + 0.9, w - 6, withAlpha(env.palette.glow, 0.5), x * 0.06, 0.35, 1.1);
}

export function paintLedge(ctx, p, env) {
  if (p.tag === 'bough') paintBough(ctx, p, env);
  else paintGraveSlab(ctx, p, env);
}

export function paintCrumble(ctx, p, env) {
  paintPlank(ctx, p, env, p.shake ?? 0);
}

export function paintMover(ctx, p, env) {
  /* a bier on chains — the orchard's only moving thing */
  const m = M(env.palette);
  const { x, y, w } = p;
  chain(ctx, x + 8, y - 240, x + 8, y, withAlpha(m.iron.lip, 0.5), 0, 0, 2.6);
  chain(ctx, x + w - 8, y - 240, x + w - 8, y, withAlpha(m.iron.lip, 0.5), 0, 0, 2.6);
  paintGraveSlab(ctx, { x, y, w }, env);
}

/* ------------------------------------------------------------------ *
 * PROPS
 * ------------------------------------------------------------------ */

export function paintProp(ctx, prop, env) {
  const m = M(env.palette);
  const t = env.time;
  switch (prop.kind) {
    case 'lantern': {
      const { x, y } = prop;
      const hgt = prop.h ?? 78;
      /* post */
      ctx.fillStyle = m.iron.face;
      ctx.fillRect(x - 2.5, y - hgt, 5, hgt);
      ctx.fillStyle = withAlpha(m.iron.lip, 0.35);
      ctx.fillRect(x - 2.5, y - hgt, 1.5, hgt);
      ctx.fillStyle = m.iron.foot;
      ctx.beginPath(); ctx.ellipse(x, y, 8, 3, 0, 0, TAU); ctx.fill();
      /* arm and lamp */
      const lx = x + 10; const ly = y - hgt + 8;
      ctx.strokeStyle = m.iron.face; ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.moveTo(x, y - hgt + 3); ctx.quadraticCurveTo(x + 10, y - hgt - 1, lx, ly); ctx.stroke();
      const flick = 0.86 + Math.sin(t * 7.3 + prop.x) * 0.09 + Math.sin(t * 2.1 + prop.x * 0.3) * 0.05;
      glowDot(ctx, lx, ly + 8, 46 * flick, m.lamp, 0.26);
      glowDot(ctx, lx, ly + 8, 15, '#fff4c8', 0.55);
      poly(ctx, [[lx - 5, ly + 2], [lx + 5, ly + 2], [lx + 6.5, ly + 15], [lx - 6.5, ly + 15]],
        withAlpha('#ffe6a8', 0.5 * flick), withAlpha(m.iron.lip, 0.7), 1.2);
      poly(ctx, [[lx - 6, ly + 2], [lx + 6, ly + 2], [lx, ly - 4]], m.iron.face, withAlpha(m.iron.lip, 0.5), 1);
      lightPool(ctx, lx, prop.groundY ?? y, 104, m.lamp, 0.34 * flick);
      break;
    }
    case 'cross': {
      const { x, y } = prop;
      const hgt = prop.h ?? 44;
      const lean = prop.lean ?? (hash01(x) - 0.5) * 0.22;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(lean);
      groundShadow(ctx, 0, 0, 16, 0.34);
      ctx.fillStyle = m.slab.face;
      ctx.fillRect(-3.5, -hgt, 7, hgt);
      ctx.fillRect(-12, -hgt * 0.72, 24, 6.5);
      ctx.fillStyle = withAlpha(m.slab.lip, 0.4);
      ctx.fillRect(-3.5, -hgt, 2, hgt);
      ctx.fillRect(-12, -hgt * 0.72, 24, 1.6);
      crust(ctx, -12, -hgt, 24, hgt, m.moss, x, 0.9);
      ctx.restore();
      break;
    }
    case 'headstone': {
      const { x, y } = prop;
      const hgt = prop.h ?? 34; const wdt = prop.w ?? 22;
      const lean = (hash01(x * 1.7) - 0.5) * 0.2;
      ctx.save();
      ctx.translate(x, y); ctx.rotate(lean);
      groundShadow(ctx, 0, 0, wdt, 0.3);
      arch(ctx, -wdt * 0.5, -hgt, wdt, hgt, (() => {
        const g = ctx.createLinearGradient(0, -hgt, 0, 0);
        g.addColorStop(0, m.slab.top); g.addColorStop(1, m.slab.foot);
        return g;
      })(), withAlpha(m.slab.lip, 0.4), 1.2);
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = m.slab.deep; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i += 1) {
        ctx.beginPath();
        ctx.moveTo(-wdt * 0.28, -hgt * 0.55 + i * 5);
        ctx.lineTo(wdt * 0.28, -hgt * 0.55 + i * 5);
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      crust(ctx, -wdt * 0.5, -hgt, wdt, hgt, m.moss, x, 1.1);
      ctx.restore();
      break;
    }
    case 'tree': {
      /* a bare pear tree standing in the play layer, drawn dark so it never
       * competes with the actors */
      const { x, y } = prop;
      const hgt = prop.h ?? 190;
      const rng = makeRng((x * 8191) | 1);
      ctx.save();
      ctx.globalAlpha = 0.92;
      ctx.strokeStyle = dim(m.bark.face, 0.42);
      ctx.lineCap = 'round';
      const branch = (bx, by, ang, len, wdt, depth) => {
        if (depth <= 0 || len < 5) return;
        const ex = bx + Math.cos(ang) * len;
        const ey = by + Math.sin(ang) * len;
        ctx.lineWidth = wdt;
        ctx.beginPath(); ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + Math.cos(ang - 0.25) * len * 0.55, by + Math.sin(ang - 0.25) * len * 0.55, ex, ey);
        ctx.stroke();
        branch(ex, ey, ang - 0.36 - rng() * 0.3, len * (0.62 + rng() * 0.14), wdt * 0.62, depth - 1);
        branch(ex, ey, ang + 0.34 + rng() * 0.3, len * (0.6 + rng() * 0.16), wdt * 0.6, depth - 1);
        if (depth <= 2 && rng() > 0.45) {
          ctx.save();
          ctx.globalAlpha = 0.55;
          glowDot(ctx, ex, ey + 4, 8, env.palette.glow, 0.2);
          ctx.fillStyle = m.pear;
          ctx.beginPath(); ctx.ellipse(ex, ey + 5, 2.4, 3.3, 0, 0, TAU); ctx.fill();
          ctx.restore();
        }
      };
      groundShadow(ctx, x, y, 40, 0.4);
      branch(x, y, -Math.PI * 0.5, hgt * 0.42, 8.5, 5);
      ctx.restore();
      break;
    }
    case 'fence': {
      const { x, y } = prop;
      railing(ctx, x, y - 26, prop.w ?? 120, 26, m.iron.face, withAlpha(env.palette.glow, 0.6), x);
      break;
    }
    case 'urn': {
      const { x, y } = prop;
      groundShadow(ctx, x, y, 14, 0.34);
      const g = ctx.createLinearGradient(x - 10, y - 26, x + 10, y);
      g.addColorStop(0, m.slab.top); g.addColorStop(1, m.slab.foot);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(x - 7, y);
      ctx.quadraticCurveTo(x - 13, y - 15, x - 7, y - 22);
      ctx.lineTo(x + 7, y - 22);
      ctx.quadraticCurveTo(x + 13, y - 15, x + 7, y);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = withAlpha(m.slab.lip, 0.5);
      ctx.fillRect(x - 9, y - 25, 18, 3.2);
      break;
    }
    case 'sundisc': {
      const { x, y } = prop;
      const lit0 = prop.lit ? 1 : 0.34;
      const spin = t * 0.42;
      glowDot(ctx, x, y - 34, 62, prop.lit ? '#ffe9a4' : env.palette.glow, 0.20 * lit0);
      ctx.save();
      ctx.translate(x, y - 34);
      ctx.strokeStyle = withAlpha(prop.lit ? '#ffdf92' : env.palette.glow, 0.8 * lit0);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.arc(0, 0, 15, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i += 1) {
        const a = spin + (i / 12) * TAU;
        const r0 = 17; const r1 = 17 + (i % 2 ? 9 : 5);
        line(ctx, Math.cos(a) * r0, Math.sin(a) * r0, Math.cos(a) * r1, Math.sin(a) * r1,
          withAlpha(prop.lit ? '#ffe9a8' : env.palette.glow, 0.85 * lit0), 1.8);
      }
      ctx.fillStyle = withAlpha(prop.lit ? '#fff4c4' : env.palette.glow, 0.30 * lit0);
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, TAU); ctx.fill();
      ctx.restore();
      /* the post it stands on */
      ctx.fillStyle = m.iron.face;
      ctx.fillRect(x - 3, y - 22, 6, 22);
      groundShadow(ctx, x, y, 20, 0.4);
      break;
    }
    case 'shrine': {
      const { x, y } = prop;
      const hgt = prop.h ?? 96;
      groundShadow(ctx, x, y, 40, 0.44);
      poly(ctx, [[x - 26, y], [x - 22, y - hgt * 0.7], [x, y - hgt], [x + 22, y - hgt * 0.7], [x + 26, y]],
        (() => { const g = ctx.createLinearGradient(0, y - hgt, 0, y); g.addColorStop(0, m.tomb.top); g.addColorStop(1, m.tomb.foot); return g; })(),
        withAlpha(m.tomb.lip, 0.4), 1.4);
      arch(ctx, x - 12, y - hgt * 0.66, 24, hgt * 0.56, 'rgba(3,7,12,.86)', withAlpha(m.tomb.lip, 0.3), 1.2);
      const flick = 0.8 + Math.sin(t * 6 + x) * 0.14;
      glowDot(ctx, x, y - hgt * 0.30, 26, m.lamp, 0.42 * flick);
      break;
    }
    default: break;
  }
}

/* ------------------------------------------------------------------ *
 * BREAKABLES
 * ------------------------------------------------------------------ */

export function paintBreakable(ctx, b, env) {
  const m = M(env.palette);
  if (b.kind === 'falsewall') {
    const { x, y, w, h } = b;
    slab(ctx, x, y, w, h, m.tomb, LIGHT);
    courses(ctx, x, y, w, h, withAlpha(m.tomb.deep, 0.8), 18, x, 0.4);
    if (b.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = withAlpha('#ffe6a8', b.flash * 0.5);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  } else {
    paintProp(ctx, { kind: 'urn', x: b.x + b.w * 0.5, y: b.y + b.h }, env);
    if (b.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = b.flash * 0.6;
      paintProp(ctx, { kind: 'urn', x: b.x + b.w * 0.5, y: b.y + b.h }, env);
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ *
 * HAZARD — the gorge.
 * ------------------------------------------------------------------ */

export function paintHazard(ctx, hzRect, env) {
  const t = env.time;
  const pal = env.palette;
  /* wider than the collision rect, so the cut edges hide under the terrace */
  const OVER = 130;
  const hz = { x: hzRect.x - OVER, y: hzRect.y, w: hzRect.w + OVER * 2, h: hzRect.h };
  ctx.save();
  /* the far wall of the gorge, then the dark, then the river a long way down */
  const g = ctx.createLinearGradient(0, hz.y - 30, 0, hz.y + Math.min(hz.h, 300));
  g.addColorStop(0, withAlpha(mixHex(pal.mid, pal.shadow, 0.62), 0.55));
  g.addColorStop(0.18, withAlpha(mixHex(pal.mid, pal.shadow, 0.80), 0.92));
  g.addColorStop(0.55, 'rgba(2,5,10,.97)');
  g.addColorStop(1, 'rgba(1,3,6,1)');
  ctx.fillStyle = g;
  ctx.fillRect(hz.x, hz.y - 30, hz.w, hz.h + 30);

  /* rock strata on the far wall, fading out fast */
  const rng = makeRng(((hz.x * 6700417) ^ 0x2f) | 1);
  for (let i = 0; i < Math.floor(hz.w / 14); i += 1) {
    const rx = hz.x + rng() * hz.w;
    const ry = hz.y - 20 + rng() * rng() * 150;
    ctx.globalAlpha = 0.07 * Math.max(0, 1 - (ry - hz.y) / 150);
    ctx.fillStyle = pal.mid;
    ctx.beginPath();
    ctx.ellipse(rx, ry, 16 + rng() * 40, 5 + rng() * 12, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* mist rolling UP out of it — the only bright thing down there */
  for (let i = 0; i < 4; i += 1) {
    const yy = hz.y + 6 + i * 26;
    const off = Math.sin(t * 0.32 + i * 1.9 + hz.x * 0.01) * 34;
    ctx.globalAlpha = 0.13 - i * 0.026;
    ctx.fillStyle = pal.glow;
    ctx.beginPath();
    ctx.ellipse(hz.x + hz.w * 0.5 + off, yy, hz.w * 0.6, 12 + i * 4, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * FOREGROUND — passes IN FRONT of the player. This is what welds the
 * play layer into the painting.
 * ------------------------------------------------------------------ */

export function paintFront(ctx, item, env) {
  const t = env.time;
  const m = M(env.palette);
  switch (item.kind) {
    case 'bough': {
      /* a heavy branch across the top of frame, out of focus and nearly black */
      const { x, y } = item;
      const w = item.w ?? 420;
      const rng = makeRng((x * 99991) | 1);
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.92;
      ctx.strokeStyle = 'rgba(3,7,12,.96)';
      ctx.lineCap = 'round';
      ctx.lineWidth = 16;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * 0.45, y + 34, x + w, y - 8);
      ctx.stroke();
      ctx.lineWidth = 6;
      for (let i = 0; i < 8; i += 1) {
        const tt = 0.08 + rng() * 0.86;
        const bx = x + w * tt;
        const by = y + Math.sin(tt * Math.PI) * 30;
        ctx.beginPath();
        ctx.moveTo(bx, by);
        ctx.quadraticCurveTo(bx + (rng() - 0.5) * 50, by + 30 + rng() * 30, bx + (rng() - 0.5) * 80, by + 54 + rng() * 46);
        ctx.stroke();
      }
      /* a few pears close to the lens catch the light hard */
      ctx.globalAlpha = 0.9;
      for (let i = 0; i < 5; i += 1) {
        const tt = 0.1 + rng() * 0.8;
        const bx = x + w * tt + (rng() - 0.5) * 40;
        const by = y + 44 + rng() * 52;
        glowDot(ctx, bx, by, 16, env.palette.glow, 0.22);
        ctx.fillStyle = withAlpha(m.pear, 0.85);
        ctx.beginPath(); ctx.ellipse(bx, by, 4.6, 6.2, 0, 0, TAU); ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'railing': {
      const { x, y } = item;
      ctx.save();
      ctx.globalAlpha = 0.88;
      railing(ctx, x, y, item.w ?? 300, 40, 'rgba(4,8,13,.95)', withAlpha(env.palette.glow, 0.34), x, 26);
      ctx.restore();
      break;
    }
    case 'mist': {
      const { x, y } = item;
      const w = item.w ?? 520;
      ctx.save();
      ctx.globalAlpha = 0.34;
      for (let i = 0; i < 3; i += 1) {
        const off = Math.sin(t * 0.22 + i * 2.1 + x * 0.01) * 30;
        const g = ctx.createLinearGradient(0, y - 30 + i * 12, 0, y + 40);
        g.addColorStop(0, withAlpha(env.palette.glow, 0));
        g.addColorStop(0.5, withAlpha(env.palette.mid, 0.5));
        g.addColorStop(1, withAlpha(env.palette.ground, 0));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5 + off, y + i * 9, w * 0.55, 26 + i * 7, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }
    case 'chain': {
      const { x, y } = item;
      const hgt = item.h ?? 300;
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.95;
      /* heavy, close to the lens, and lit only on one side */
      chain(ctx, x, y, x + (item.dx ?? 30), y + hgt, 'rgba(3,7,12,.98)', item.sag ?? 20, 0, 9.5);
      ctx.globalAlpha = 0.22;
      chain(ctx, x - 1.6, y, x + (item.dx ?? 30) - 1.6, y + hgt, withAlpha(env.palette.glow, 0.7), item.sag ?? 20, 0, 9.5);
      ctx.restore();
      break;
    }
    default: break;
  }
}

export const orchardPainter = {
  key: 'orchard',
  light: LIGHT,
  paintSolid, paintLedge, paintCrumble, paintMover,
  paintProp, paintBreakable, paintHazard, paintFront,
};
