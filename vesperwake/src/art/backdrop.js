/* art/backdrop.js — making the painting and the playfield the same picture.
 *
 * The paintings are beautiful and they were the problem: a full-brightness,
 * full-detail matte behind flat grey slabs reads as two unrelated images. The
 * fix is not "nicer platforms", it is depth and a shared grade:
 *
 *   1. The matte is pushed BACK   — blurred, darkened, desaturated, fogged.
 *   2. A mid layer is derived from the same matte at a nearer parallax, dark
 *      enough to be architecture rather than detail.
 *   3. The playfield is painted with colours SAMPLED FROM THE MATTE, so the
 *      stone in front is literally made of the stone behind.
 *   4. Authored foreground elements (boughs, railings, chains) pass in front
 *      of the player at parallax > 1, which is what actually sells the space.
 *   5. One grade pass — multiply + glow + vignette + grain — lands on matte,
 *      terrain, actors and effects together, so nothing can look pasted on.
 *
 * Everything expensive is pre-rendered once per area into offscreen canvases.
 */

import { VIEW_W, VIEW_H } from '../config.js';
import { clamp, lerp, rgba, rgb, withAlpha, makeRng, TAU } from '../core.js';

const ASSET = (name) => new URL(`../../assets/${name}`, import.meta.url).href;

/* ---- image cache ---------------------------------------------------- */

const cache = new Map();

export function loadImage(file) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  if (cache.has(file)) return cache.get(file);
  const p = new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => res(img);
    img.onerror = () => res(null);
    img.src = ASSET(file);
  });
  cache.set(file, p);
  return p;
}

function offscreen(w, h) {
  if (typeof document === 'undefined') return null;
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

/* ---- palette extraction --------------------------------------------- */

/* Read the matte down to a postage stamp and pull the values the terrain
 * painters need. Sampling beats guessing: the stone in the Reliquary is a
 * different green from the stone in the Orchard and the eye notices. */
export function samplePalette(img) {
  const fallback = {
    sky: '#16202e', far: '#1d2a38', mid: '#22303a', ground: '#1a232b',
    glow: '#cfe6ea', warm: '#e5c477', shadow: '#070c12', accent: '#8fd7dd',
  };
  if (!img || typeof document === 'undefined') return fallback;
  const W = 48; const H = 27;
  const c = offscreen(W, H);
  if (!c) return fallback;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0, W, H);
  let data;
  try { data = g.getImageData(0, 0, W, H).data; } catch { return fallback; }

  const bandAvg = (y0, y1) => {
    let r = 0; let gg = 0; let b = 0; let n = 0;
    for (let y = y0; y < y1; y += 1) {
      for (let x = 0; x < W; x += 1) {
        const i = (y * W + x) * 4;
        r += data[i]; gg += data[i + 1]; b += data[i + 2]; n += 1;
      }
    }
    return n ? rgb(r / n, gg / n, b / n) : '#000';
  };

  /* brightest and warmest pixels give the light and lantern colours */
  let best = -1; let glow = [200, 220, 230];
  let warmBest = -1; let warm = [220, 180, 110];
  let darkBest = 1e9; let shadow = [8, 12, 18];
  for (let i = 0; i < data.length; i += 4) {
    const r = data[i]; const gg = data[i + 1]; const b = data[i + 2];
    const lum = r * 0.3 + gg * 0.59 + b * 0.11;
    if (lum > best) { best = lum; glow = [r, gg, b]; }
    if (lum < darkBest) { darkBest = lum; shadow = [r, gg, b]; }
    const warmth = r - b;
    if (warmth > warmBest && lum > 70) { warmBest = warmth; warm = [r, gg, b]; }
  }

  const lift = (v, k) => clamp(v * k, 0, 255);
  return {
    sky: bandAvg(0, 6),
    far: bandAvg(6, 13),
    mid: bandAvg(13, 20),
    ground: bandAvg(20, H),
    glow: rgb(lift(glow[0], 1), lift(glow[1], 1), lift(glow[2], 1)),
    warm: rgb(lift(warm[0], 1.05), lift(warm[1], 1.0), lift(warm[2], 0.9)),
    shadow: rgb(shadow[0], shadow[1], shadow[2]),
    accent: bandAvg(9, 16),
  };
}

/* ---- pre-rendered depth layers -------------------------------------- */

/* Build the far and mid plates once. Both come from the same painting; the
 * difference in blur, value and scale is what turns one image into a space. */
function buildPlates(img, tint) {
  const farW = Math.round(VIEW_W * 1.22);
  const farH = Math.round(VIEW_H * 1.22);
  const far = offscreen(farW, farH);
  if (far) {
    const g = far.getContext('2d');
    g.filter = 'blur(1.7px) brightness(0.86) saturate(0.86) contrast(0.98)';
    drawCover(g, img, 0, 0, farW, farH);
    g.filter = 'none';
    /* haze that thickens with distance — the single biggest depth cue */
    const grad = g.createLinearGradient(0, 0, 0, farH);
    grad.addColorStop(0, withAlpha(tint.sky, 0.16));
    grad.addColorStop(0.55, withAlpha(tint.mid, 0.26));
    grad.addColorStop(1, withAlpha(tint.ground, 0.42));
    g.fillStyle = grad;
    g.fillRect(0, 0, farW, farH);
  }

  /* The mid plate is the same painting pushed forward: bigger, darker, and
   * cropped to its architecture band so it reads as the near skyline. */
  const midW = Math.round(VIEW_W * 1.7);
  const midH = Math.round(VIEW_H * 0.72);
  const mid = offscreen(midW, midH);
  if (mid) {
    const g = mid.getContext('2d');
    g.filter = 'blur(1.5px) brightness(0.44) saturate(0.40) contrast(1.14)';
    const sy = img.naturalHeight * 0.22;
    const sh = img.naturalHeight * 0.56;
    g.drawImage(img, 0, sy, img.naturalWidth, sh, 0, 0, midW, midH);
    g.filter = 'none';
    /* Feather BOTH edges. A hard line across the sky is the single most
     * obvious tell that a backdrop is two images pretending to be one. */
    g.globalCompositeOperation = 'destination-out';
    const top = g.createLinearGradient(0, 0, 0, midH * 0.34);
    top.addColorStop(0, 'rgba(0,0,0,1)');
    top.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = top;
    g.fillRect(0, 0, midW, midH * 0.34);
    const fade = g.createLinearGradient(0, midH * 0.58, 0, midH);
    fade.addColorStop(0, 'rgba(0,0,0,0)');
    fade.addColorStop(1, 'rgba(0,0,0,1)');
    g.fillStyle = fade;
    g.fillRect(0, midH * 0.5, midW, midH * 0.5);
    g.globalCompositeOperation = 'source-over';
  }
  return { far, mid };
}

function drawCover(g, img, x, y, w, h) {
  const ir = img.naturalWidth / img.naturalHeight;
  const rr = w / h;
  let dw = w; let dh = h;
  if (ir > rr) dw = h * ir; else dh = w / ir;
  g.drawImage(img, x + (w - dw) * 0.5, y + (h - dh) * 0.5, dw, dh);
}

/* ------------------------------------------------------------------ *
 * Backdrop — one per area.
 * ------------------------------------------------------------------ */

export class Backdrop {
  constructor(spec) {
    this.spec = spec;                 // { early, late, light, fog, rain, motes }
    this.palette = samplePalette(null);
    this.early = null;
    this.late = null;
    this.plates = null;
    this.latePlates = null;
    this.ready = false;
    this.blend = 0;                   // 0 = early painting, 1 = late painting
    this.rng = makeRng(0x5ab19e);
    this.motes = [];
    this.rain = [];
    this._seedWeather();
  }

  async load() {
    this.early = await loadImage(this.spec.early);
    this.late = this.spec.late ? await loadImage(this.spec.late) : null;
    if (this.early) {
      this.palette = samplePalette(this.early);
      this.plates = buildPlates(this.early, this.palette);
    }
    if (this.late) this.latePlates = buildPlates(this.late, samplePalette(this.late));
    this.ready = Boolean(this.early);
    return this.ready;
  }

  _seedWeather() {
    const r = this.rng;
    const rainCount = this.spec.rain ?? 0;
    for (let i = 0; i < rainCount; i += 1) {
      this.rain.push({
        x: r() * (VIEW_W + 260) - 130,
        y: r() * VIEW_H,
        len: 12 + r() * 26,
        speed: 620 + r() * 520,
        depth: 0.35 + r() * 0.9,
      });
    }
    const moteCount = this.spec.motes ?? 0;
    for (let i = 0; i < moteCount; i += 1) {
      this.motes.push({
        x: r() * VIEW_W,
        y: r() * VIEW_H,
        r: 0.7 + r() * 2.1,
        drift: (r() - 0.5) * 16,
        rise: -4 - r() * 16,
        phase: r() * TAU,
        depth: 0.3 + r() * 0.85,
      });
    }
  }

  update(dt, blendTarget) {
    this.blend = lerp(this.blend, clamp(blendTarget, 0, 1), 1 - Math.exp(-1.4 * dt));
    for (const d of this.rain) {
      d.y += d.speed * d.depth * dt;
      d.x -= d.speed * 0.16 * d.depth * dt;
      if (d.y > VIEW_H + 40) { d.y = -40; d.x = this.rng() * (VIEW_W + 260) - 130; }
      if (d.x < -140) d.x += VIEW_W + 260;
    }
    for (const m of this.motes) {
      m.phase += dt * 0.9;
      m.x += (m.drift + Math.sin(m.phase) * 8) * dt;
      m.y += m.rise * dt;
      if (m.y < -12) { m.y = VIEW_H + 12; m.x = this.rng() * VIEW_W; }
      if (m.x < -12) m.x = VIEW_W + 12;
      if (m.x > VIEW_W + 12) m.x = -12;
    }
  }

  /* ---- layers ---- */

  drawFar(ctx, cam) {
    const p = this.palette;
    ctx.save();
    if (!this.plates || !this.plates.far) {
      const g = ctx.createLinearGradient(0, 0, 0, VIEW_H);
      g.addColorStop(0, p.sky); g.addColorStop(1, p.ground);
      ctx.fillStyle = g; ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.restore();
      return;
    }
    const plate = this.plates.far;
    const drift = -((cam.x * 0.13) % (plate.width - VIEW_W));
    const y = -clamp((cam.y - cam.baseY) * 0.06, -30, 30) - (plate.height - VIEW_H) * 0.5;
    ctx.drawImage(plate, drift, y);
    if (this.latePlates && this.latePlates.far && this.blend > 0.002) {
      ctx.globalAlpha = this.blend;
      ctx.drawImage(this.latePlates.far, drift, y);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  drawMid(ctx, cam) {
    if (!this.plates || !this.plates.mid) return;
    const plate = this.plates.mid;
    const span = plate.width - VIEW_W;
    const drift = -((cam.x * 0.36) % span);
    const y = VIEW_H * 0.34 - clamp((cam.y - cam.baseY) * 0.20, -46, 46);
    ctx.save();
    ctx.globalAlpha = 0.52;
    ctx.drawImage(plate, drift, y);
    ctx.drawImage(plate, drift + span, y);
    if (this.latePlates && this.latePlates.mid && this.blend > 0.002) {
      ctx.globalAlpha = this.blend * 0.52;
      ctx.drawImage(this.latePlates.mid, drift, y);
      ctx.drawImage(this.latePlates.mid, drift + span, y);
    }
    ctx.globalAlpha = 1;
    /* fog bank between mid and play layers */
    const fog = ctx.createLinearGradient(0, VIEW_H * 0.46, 0, VIEW_H);
    fog.addColorStop(0, withAlpha(this.palette.mid, 0));
    fog.addColorStop(0.6, withAlpha(this.palette.mid, 0.22));
    fog.addColorStop(1, withAlpha(this.palette.ground, 0.34));
    ctx.fillStyle = fog;
    ctx.fillRect(0, VIEW_H * 0.46, VIEW_W, VIEW_H * 0.54);
    ctx.restore();
  }

  /* Weather drawn between mid and play so it sits in the world, plus a second
   * sparser pass in front (drawn by drawFrontWeather). */
  drawWeather(ctx, front = false) {
    const p = this.palette;
    ctx.save();
    ctx.lineCap = 'round';
    for (const d of this.rain) {
      const isFront = d.depth > 0.85;
      if (isFront !== front) continue;
      ctx.globalAlpha = front ? 0.20 : 0.11 + d.depth * 0.10;
      ctx.strokeStyle = withAlpha(p.glow, 0.55);
      ctx.lineWidth = front ? 1.5 : 0.9;
      ctx.beginPath();
      ctx.moveTo(d.x, d.y);
      ctx.lineTo(d.x - d.len * 0.16, d.y + d.len);
      ctx.stroke();
    }
    for (const m of this.motes) {
      const isFront = m.depth > 0.85;
      if (isFront !== front) continue;
      ctx.globalAlpha = (front ? 0.5 : 0.3) * (0.4 + Math.sin(m.phase) * 0.3 + 0.4);
      ctx.fillStyle = withAlpha(p.glow, 0.9);
      ctx.beginPath();
      ctx.arc(m.x, m.y, m.r * (front ? 1.5 : 1), 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  /* ---- the shared grade ------------------------------------------- *
   * Runs LAST, over the matte, the terrain, the actors and the effects at
   * once. Anything drawn before it belongs to the same photograph.        */
  grade(ctx, opts = {}) {
    const p = this.palette;
    const t = opts.time ?? 0;
    ctx.save();

    /* cool the shadows and unify the hue */
    ctx.globalCompositeOperation = 'multiply';
    const m = ctx.createLinearGradient(0, 0, 0, VIEW_H);
    m.addColorStop(0, withAlpha(this.spec.gradeTop ?? p.sky, 0.22));
    m.addColorStop(0.58, withAlpha(this.spec.gradeMid ?? p.mid, 0.10));
    m.addColorStop(1, withAlpha(this.spec.gradeLow ?? p.shadow, 0.26));
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    /* the key light — a soft bloom from wherever the painting's light is */
    ctx.globalCompositeOperation = 'screen';
    const L = this.spec.light ?? { x: 0.72, y: 0.18, r: 0.78, strength: 0.13 };
    const rad = ctx.createRadialGradient(
      VIEW_W * L.x, VIEW_H * L.y, 0,
      VIEW_W * L.x, VIEW_H * L.y, VIEW_W * L.r,
    );
    const pulse = 1 + Math.sin(t * 0.6) * 0.06;
    rad.addColorStop(0, withAlpha(p.glow, L.strength * pulse));
    rad.addColorStop(0.5, withAlpha(p.glow, L.strength * 0.34 * pulse));
    rad.addColorStop(1, withAlpha(p.glow, 0));
    ctx.fillStyle = rad;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    /* vignette */
    ctx.globalCompositeOperation = 'source-over';
    const vig = ctx.createRadialGradient(
      VIEW_W * 0.5, VIEW_H * 0.52, VIEW_H * 0.30,
      VIEW_W * 0.5, VIEW_H * 0.52, VIEW_H * 0.92,
    );
    vig.addColorStop(0, 'rgba(2,5,10,0)');
    vig.addColorStop(1, `rgba(2,5,10,${opts.vignette ?? 0.52})`);
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);

    if (opts.flash > 0.001) {
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = rgba(255, 246, 216, clamp(opts.flash, 0, 1) * 0.5);
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    if (opts.damage > 0.001) {
      ctx.globalCompositeOperation = 'source-over';
      const dv = ctx.createRadialGradient(
        VIEW_W * 0.5, VIEW_H * 0.5, VIEW_H * 0.24,
        VIEW_W * 0.5, VIEW_H * 0.5, VIEW_H * 0.86,
      );
      dv.addColorStop(0, 'rgba(120,20,52,0)');
      dv.addColorStop(1, `rgba(132,22,58,${clamp(opts.damage, 0, 1) * 0.32})`);
      ctx.fillStyle = dv;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
    ctx.restore();
  }
}
