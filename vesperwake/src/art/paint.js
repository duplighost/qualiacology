/* art/paint.js — the shared brush set.
 *
 * Terrain in this game is drawn, not tiled. These are the primitives every
 * area painter is built from: bevelled slabs that catch the area's key light,
 * grain patterns that never crawl, cast shadows that put an object ON the
 * ground rather than in front of it, and carved ornament.
 *
 * The rules that keep three areas looking like one game:
 *   - light always comes from the area's LIGHT vector, never from nowhere
 *   - the top face is the brightest surface and the undercut is the darkest
 *   - every solid casts down onto whatever is beneath it
 *   - colours are mixed toward the sampled matte palette, never invented
 */

import { clamp, lerp, mixHex, withAlpha, makeRng, TAU, hash01 } from '../core.js';

/* ---- grain patterns (built once, cached) ---------------------------- */

const patterns = new Map();

export function grain(ctx, key, opts) {
  const id = `${key}|${opts.size}|${opts.light}|${opts.dark}|${opts.accent}|${opts.density}`;
  if (patterns.has(id)) return patterns.get(id);
  if (typeof document === 'undefined') return null;
  const size = opts.size ?? 96;
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const rng = makeRng((key.length * 2654435761) ^ size);
  if (opts.base) { g.fillStyle = opts.base; g.fillRect(0, 0, size, size); }
  const n = opts.density ?? 220;
  for (let i = 0; i < n; i += 1) {
    const x = rng() * size; const y = rng() * size;
    const r = 0.5 + rng() * (opts.grainSize ?? 2.1);
    const roll = rng();
    g.fillStyle = roll < 0.42 ? opts.light : roll < 0.86 ? opts.dark : (opts.accent ?? opts.light);
    g.beginPath(); g.ellipse(x, y, r, r * (0.55 + rng() * 0.7), rng() * TAU, 0, TAU); g.fill();
  }
  const pat = ctx.createPattern(c, 'repeat');
  patterns.set(id, pat);
  return pat;
}

export function clearPatternCache() { patterns.clear(); spriteCache.clear(); }

/* ---- baked props ---------------------------------------------------- *
 * Some scenery is enormous, static, and behind everything: the great bell in
 * the belfry is 500x590 of gradient and it was costing more of the frame than
 * the entire play layer. Anything that does not change shape gets drawn once
 * into its own canvas and blitted after that. `draw` receives a context whose
 * origin is the sprite's anchor point.
 * -------------------------------------------------------------------- */
const spriteCache = new Map();

export function bakedSprite(key, w, h, ax, ay, draw) {
  let sprite = spriteCache.get(key);
  if (sprite !== undefined) return sprite;
  if (typeof document === 'undefined') { spriteCache.set(key, null); return null; }
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  const g = c.getContext('2d');
  g.translate(ax, ay);
  draw(g);
  const entry = { canvas: c, ax, ay };
  if (spriteCache.size > 40) spriteCache.clear();
  spriteCache.set(key, entry);
  return entry;
}

export function drawBaked(ctx, entry, x, y) {
  if (!entry) return false;
  ctx.drawImage(entry.canvas, x - entry.ax, y - entry.ay);
  return true;
}

/* ---- primitives ----------------------------------------------------- */

export function poly(ctx, pts, fill, stroke, lw = 1.4) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

export function line(ctx, x1, y1, x2, y2, colour, w = 2, alpha = 1) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = w;
  ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.restore();
}

/* Glows are the single most-called drawing call in the game — every lantern,
 * every impact, every lily. Building a radial gradient per call per frame was
 * costing whole milliseconds, so they are baked into small sprites once and
 * blitted after that. Radius and alpha are quantised so the cache stays small
 * even when a value is pulsing. */
const glowCache = new Map();

function glowSprite(r, colour, alpha, core) {
  const key = `${r}|${colour}|${alpha}|${core}`;
  let sprite = glowCache.get(key);
  if (sprite !== undefined) return sprite;
  if (typeof document === 'undefined') { glowCache.set(key, null); return null; }
  const size = Math.max(2, Math.ceil(r * 2));
  const c = document.createElement('canvas');
  c.width = size; c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(r, r, core * r, r, r, r);
  grad.addColorStop(0, withAlpha(colour, alpha));
  grad.addColorStop(0.45, withAlpha(colour, alpha * 0.32));
  grad.addColorStop(1, withAlpha(colour, 0));
  g.fillStyle = grad;
  g.beginPath(); g.arc(r, r, r, 0, TAU); g.fill();
  if (glowCache.size > 700) glowCache.clear();
  glowCache.set(key, c);
  return c;
}

export function glowDot(ctx, x, y, r, colour, alpha = 0.5, core = 0) {
  if (r <= 0.2 || alpha <= 0.002) return;
  const qr = Math.max(2, Math.round(r / 3) * 3);
  const qa = Math.round(clamp(alpha, 0, 1) * 40) / 40;
  const qc = core > 0 ? Math.round((core / Math.max(r, 1)) * 8) / 8 : 0;
  const sprite = glowSprite(qr, colour, qa, qc);
  if (!sprite) {
    const g = ctx.createRadialGradient(x, y, core, x, y, Math.max(0.1, r));
    g.addColorStop(0, withAlpha(colour, alpha));
    g.addColorStop(1, withAlpha(colour, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    return;
  }
  ctx.drawImage(sprite, x - qr, y - qr, qr * 2, qr * 2);
}

/* A specular sheen running along a top face, angled to the key light. */
export function sheen(ctx, x, y, w, colour, seed = 0, alpha = 0.55, thickness = 1.6) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = thickness;
  ctx.lineCap = 'round';
  ctx.beginPath();
  const steps = Math.max(3, Math.floor(w / 26));
  for (let i = 0; i <= steps; i += 1) {
    const t = i / steps;
    const px = x + w * t;
    const py = y + Math.sin(t * 5.2 + seed) * 0.9;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.stroke();
  ctx.restore();
}

/* The contact shadow. Without this, everything floats. */
export function castShadow(ctx, x, y, w, strength = 0.42, spread = 12) {
  const g = ctx.createLinearGradient(0, y, 0, y + spread);
  g.addColorStop(0, `rgba(2,5,9,${strength})`);
  g.addColorStop(1, 'rgba(2,5,9,0)');
  ctx.fillStyle = g;
  ctx.fillRect(x - 4, y, w + 8, spread);
}

export function groundShadow(ctx, cx, y, w, strength = 0.4) {
  const g = ctx.createRadialGradient(cx, y, 0, cx, y, w);
  g.addColorStop(0, `rgba(1,4,8,${strength})`);
  g.addColorStop(1, 'rgba(1,4,8,0)');
  ctx.save();
  ctx.translate(cx, y);
  ctx.scale(1, 0.26);
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, w, 0, TAU); ctx.fill();
  ctx.restore();
}

/* A bevelled block: bright top lip, lit face, dark undercut. `light` is a unit
 * vector; a positive x means the right-hand side catches the light. */
export function slab(ctx, x, y, w, h, cols, light = { x: 0.6, y: -0.8 }) {
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, cols.top);
  g.addColorStop(0.14, cols.upper);
  g.addColorStop(0.62, cols.face);
  g.addColorStop(1, cols.foot);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);

  /* top lip */
  ctx.fillStyle = cols.lip;
  ctx.fillRect(x, y, w, 2.4);

  /* lit vertical edge */
  const lx = light.x >= 0 ? x + w - 3 : x;
  const sideGrad = ctx.createLinearGradient(lx, y, lx + 3, y);
  sideGrad.addColorStop(0, withAlpha(cols.lip, 0.0));
  sideGrad.addColorStop(1, withAlpha(cols.lip, 0.38));
  ctx.fillStyle = light.x >= 0 ? sideGrad : withAlpha(cols.lip, 0.16);
  ctx.fillRect(lx, y, 3, h);

  /* undercut */
  const under = ctx.createLinearGradient(0, y + h - 9, 0, y + h);
  under.addColorStop(0, 'rgba(0,0,0,0)');
  under.addColorStop(1, 'rgba(0,0,0,.45)');
  ctx.fillStyle = under;
  ctx.fillRect(x, y + h - 9, w, 9);
}

/* Masonry joints across a face — a run of blocks with staggered courses. */
export function courses(ctx, x, y, w, h, colour, courseH = 17, seed = 0, alpha = 0.24) {
  ctx.save();
  ctx.globalAlpha *= alpha;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1;
  let row = 0;
  for (let cy = y + courseH; cy < y + h; cy += courseH, row += 1) {
    ctx.beginPath(); ctx.moveTo(x, cy); ctx.lineTo(x + w, cy); ctx.stroke();
    const offset = (row % 2 ? 0.5 : 0) * 46;
    for (let cx = x + offset + 20; cx < x + w - 6; cx += 46) {
      const jitter = (hash01(cx * 0.37 + cy * 1.7 + seed) - 0.5) * 5;
      ctx.beginPath();
      ctx.moveTo(cx + jitter, cy - courseH);
      ctx.lineTo(cx + jitter, cy);
      ctx.stroke();
    }
  }
  ctx.restore();
}

/* Crack / chip damage along a top edge so no two slabs read identical. */
export function chipEdge(ctx, x, y, w, colour, seed = 0, depth = 4) {
  const rng = makeRng((seed * 7919) | 1);
  ctx.save();
  ctx.fillStyle = colour;
  let cx = x + rng() * 30;
  while (cx < x + w - 8) {
    const cw = 5 + rng() * 13;
    const ch = 1 + rng() * depth;
    ctx.beginPath();
    ctx.moveTo(cx, y);
    ctx.lineTo(cx + cw * 0.4, y + ch);
    ctx.lineTo(cx + cw, y);
    ctx.closePath();
    ctx.fill();
    cx += cw + 14 + rng() * 40;
  }
  ctx.restore();
}

/* Moss / verdigris settling in the joints and on the north faces. */
export function crust(ctx, x, y, w, h, colour, seed = 0, density = 0.5) {
  const rng = makeRng((seed * 104729) | 1);
  ctx.save();
  ctx.fillStyle = colour;
  const n = Math.floor((w / 12) * density);
  for (let i = 0; i < n; i += 1) {
    const px = x + rng() * w;
    const py = y + rng() * rng() * h;
    const r = 1.4 + rng() * 4.2;
    ctx.globalAlpha = 0.10 + rng() * 0.24;
    ctx.beginPath();
    ctx.ellipse(px, py, r, r * (0.4 + rng() * 0.5), rng() * TAU, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

/* A hanging chain, drawn link by link with a catenary sag. */
export function chain(ctx, x1, y1, x2, y2, colour, sag = 0, links = 0, r = 3.1) {
  const dx = x2 - x1; const dy = y2 - y1;
  const len = Math.hypot(dx, dy) || 1;
  const n = links || Math.max(2, Math.round(len / (r * 2.1)));
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 1.5;
  for (let i = 0; i <= n; i += 1) {
    const t = i / n;
    const px = x1 + dx * t;
    const py = y1 + dy * t + Math.sin(t * Math.PI) * sag;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(Math.atan2(dy, dx) + (i % 2 ? Math.PI * 0.5 : 0));
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.56, 0, 0, TAU);
    ctx.stroke();
    ctx.restore();
  }
  ctx.restore();
}

/* Wrought-iron railing: uprights with a top rail and a finial run. */
export function railing(ctx, x, y, w, h, colour, highlight, seed = 0, spacing = 21) {
  ctx.save();
  ctx.strokeStyle = colour;
  ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + w, y); ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(x, y + h * 0.55); ctx.lineTo(x + w, y + h * 0.55); ctx.stroke();
  for (let px = x + 6; px < x + w - 2; px += spacing) {
    const wob = (hash01(px * 0.71 + seed) - 0.5) * 1.6;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(px + wob, y - 5); ctx.lineTo(px + wob, y + h); ctx.stroke();
    ctx.fillStyle = colour;
    ctx.beginPath();
    ctx.moveTo(px + wob, y - 10);
    ctx.lineTo(px + wob + 3, y - 5);
    ctx.lineTo(px + wob, y - 2);
    ctx.lineTo(px + wob - 3, y - 5);
    ctx.closePath(); ctx.fill();
  }
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = highlight;
  ctx.lineWidth = 0.8;
  ctx.beginPath(); ctx.moveTo(x, y - 0.8); ctx.lineTo(x + w, y - 0.8); ctx.stroke();
  ctx.restore();
}

/* A gothic arch outline — used for niches, windows and doorways. */
export function arch(ctx, x, y, w, h, fill, stroke, lw = 2) {
  const r = w * 0.5;
  ctx.beginPath();
  ctx.moveTo(x, y + h);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h);
  ctx.closePath();
  if (fill) { ctx.fillStyle = fill; ctx.fill(); }
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
}

/* A warm pool of lantern light on the floor. */
export function lightPool(ctx, cx, y, w, colour, strength = 0.3) {
  if (strength <= 0.004) return;
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.translate(cx, y);
  ctx.scale(1, 0.3);
  glowDot(ctx, 0, 0, w, colour, strength);
  ctx.restore();
}

/* Build a material ramp out of a base colour, tuned to the area palette. */
/* The play layer must live BELOW the matte in value. A painting that is all
 * midtones behind flat midtones in front is exactly the "pasted on" look; the
 * fix is that only the top lip of a foreground surface catches light and
 * everything under it falls away fast. */
export function ramp(base, palette, opts = {}) {
  const toward = opts.toward ?? palette.mid;
  const b = mixHex(mixHex(base, toward, opts.blend ?? 0.22), palette.shadow, opts.sink ?? 0.16);
  return {
    lip: mixHex(b, palette.glow, opts.lipMix ?? 0.56),
    top: mixHex(b, palette.glow, opts.topMix ?? 0.28),
    upper: mixHex(b, palette.glow, 0.11),
    face: mixHex(b, palette.shadow, 0.12),
    foot: mixHex(b, palette.shadow, opts.footMix ?? 0.60),
    deep: mixHex(b, palette.shadow, 0.86),
  };
}

/* Wetness: a mirrored, squashed, faded copy of whatever the caller draws. */
export function reflect(ctx, x, y, w, h, drawFn, alpha = 0.18) {
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.globalAlpha *= alpha;
  ctx.translate(0, y * 2);
  ctx.scale(1, -0.62);
  ctx.filter = 'blur(1.4px)';
  drawFn(ctx);
  ctx.restore();
}

export const dim = (hex, k) => mixHex(hex, '#01040a', clamp(k, 0, 1));
export const lit = (hex, k) => mixHex(hex, '#ffffff', clamp(k, 0, 1));
export { lerp, clamp, withAlpha, mixHex };
