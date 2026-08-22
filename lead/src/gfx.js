/* Canvas 2D presentation layer.
 *
 * Two buffers: a main scene buffer and a "glow" buffer that only receives the
 * things that emit light. The glow buffer is drawn at a quarter size, blurred
 * with a cheap separable box blur via repeated downscale-upscale, and
 * composited additively. That is what makes a flat 2D canvas look lit rather
 * than coloured in. */

export class Gfx {
  constructor(canvas, { design = 1280, minH = 640 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false, desynchronized: true });
    this.design = design;
    this.minH = minH;
    this.dpr = 1;
    this.w = design; this.h = minH;
    this.scene = document.createElement('canvas');
    this.sctx = this.scene.getContext('2d', { alpha: false });
    this.glow = document.createElement('canvas');
    this.gctx = this.glow.getContext('2d', { alpha: true });
    this.blurA = document.createElement('canvas');
    this.blurB = document.createElement('canvas');
    this.resize();
  }

  resize() {
    const el = this.canvas;
    const cssW = el.clientWidth || window.innerWidth;
    const cssH = el.clientHeight || window.innerHeight;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    this.dpr = dpr;
    const W = Math.max(320, Math.round(cssW * dpr));
    const H = Math.max(240, Math.round(cssH * dpr));
    if (el.width !== W || el.height !== H) { el.width = W; el.height = H; }
    this.w = W; this.h = H;

    /* Scene at full res; glow at a quarter for speed and softness. */
    if (this.scene.width !== W) { this.scene.width = W; this.scene.height = H; }
    else if (this.scene.height !== H) this.scene.height = H;
    const gw = Math.max(64, Math.round(W / 4)), gh = Math.max(48, Math.round(H / 4));
    if (this.glow.width !== gw || this.glow.height !== gh) { this.glow.width = gw; this.glow.height = gh; }
    for (const c of [this.blurA, this.blurB]) {
      const bw = Math.max(32, Math.round(W / 8)), bh = Math.max(24, Math.round(H / 8));
      if (c.width !== bw || c.height !== bh) { c.width = bw; c.height = bh; }
    }
    /* World units: the viewport is `design` units wide, height follows aspect. */
    this.scale = W / this.design;
    this.vw = this.design;
    this.vh = H / this.scale;
  }

  /* Begin a frame. Returns the scene context, already cleared. */
  begin(clearStyle) {
    const s = this.sctx;
    s.setTransform(1, 0, 0, 1, 0, 0);
    if (clearStyle) { s.fillStyle = clearStyle; s.fillRect(0, 0, this.w, this.h); }
    const g = this.gctx;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.clearRect(0, 0, this.glow.width, this.glow.height);
    return s;
  }

  /* World transform for the scene buffer. */
  world(ctx) { ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0); }
  /* World transform for the glow buffer (quarter res). */
  worldGlow() {
    const g = this.gctx;
    const s = this.glow.width / this.design;
    g.setTransform(s, 0, 0, s, 0, 0);
    return g;
  }

  /* Blur the glow buffer and composite it additively over the scene. */
  end({ bloom = 1, passes = 3, vignette = 0.5, grain = 0 } = {}) {
    const out = this.ctx;
    out.setTransform(1, 0, 0, 1, 0, 0);
    out.imageSmoothingEnabled = true;

    if (bloom > 0) {
      const a = this.blurA.getContext('2d'), b = this.blurB.getContext('2d');
      a.setTransform(1, 0, 0, 1, 0, 0); b.setTransform(1, 0, 0, 1, 0, 0);
      a.clearRect(0, 0, this.blurA.width, this.blurA.height);
      a.drawImage(this.glow, 0, 0, this.blurA.width, this.blurA.height);
      for (let i = 0; i < passes; i++) {
        b.clearRect(0, 0, this.blurB.width, this.blurB.height);
        b.drawImage(this.blurA, 0, 0, this.blurB.width, this.blurB.height);
        a.clearRect(0, 0, this.blurA.width, this.blurA.height);
        a.drawImage(this.blurB, 0, 0, this.blurA.width, this.blurA.height);
      }
    }

    out.globalCompositeOperation = 'source-over';
    out.globalAlpha = 1;
    out.drawImage(this.scene, 0, 0);

    if (bloom > 0) {
      out.globalCompositeOperation = 'lighter';
      out.globalAlpha = 0.85 * bloom;
      out.drawImage(this.blurA, 0, 0, this.w, this.h);
      out.globalAlpha = 0.5 * bloom;
      out.drawImage(this.glow, 0, 0, this.w, this.h);
      out.globalAlpha = 1;
      out.globalCompositeOperation = 'source-over';
    }

    if (vignette > 0) {
      if (!this._vig || this._vigW !== this.w || this._vigH !== this.h || this._vigA !== vignette) {
        this._vigW = this.w; this._vigH = this.h; this._vigA = vignette;
        const g = out.createRadialGradient(
          this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.28,
          this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.74
        );
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, `rgba(0,0,0,${vignette})`);
        this._vig = g;
      }
      out.fillStyle = this._vig;
      out.fillRect(0, 0, this.w, this.h);
    }

    if (grain > 0) this.grain(out, grain);
  }

  /* Film grain. Built once as a few pre-tiled sheets and drawn as ONE blended
   * image: tiling a 128px square across the frame is a hundred-odd 'overlay'
   * draws a frame, which is the most expensive thing in the renderer for the
   * least visible reason. */
  grain(out, amount) {
    const gw = 512, gh = 512;
    if (!this._grain) {
      this._grain = [];
      for (let s = 0; s < 3; s++) {
        const c = document.createElement('canvas');
        c.width = gw; c.height = gh;
        const g2 = c.getContext('2d');
        const img = g2.createImageData(gw, gh);
        for (let i = 0; i < img.data.length; i += 4) {
          const v = 128 + (Math.random() * 2 - 1) * 62;
          img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
          img.data[i + 3] = 255;
        }
        g2.putImageData(img, 0, 0);
        this._grain.push(c);
      }
      this._grainAt = 0;
    }
    this._grainAt = (this._grainAt + 1) % 3;
    out.globalCompositeOperation = 'overlay';
    out.globalAlpha = amount;
    out.drawImage(this._grain[this._grainAt], 0, 0, this.w, this.h);
    out.globalAlpha = 1;
    out.globalCompositeOperation = 'source-over';
  }

  shot() { return this.canvas.toDataURL('image/png'); }
}

/* --- drawing helpers ---------------------------------------------------- */

/* A soft radial light. Cached per (radius, colour) so it costs one drawImage. */
const lightCache = new Map();
export function light(ctx, x, y, r, color = '#fff', alpha = 1, falloff = 2.2) {
  /* Quantise the radius. A continuously varying one means a brand new
   * offscreen gradient every single frame, which thrashes the cache it was
   * supposed to be using and quietly allocates a canvas per frame. */
  r = Math.max(8, Math.round(r / 8) * 8);
  const key = r + color + falloff.toFixed(2);
  let c = lightCache.get(key);
  if (!c) {
    const s = Math.max(8, Math.ceil(r * 2));
    c = document.createElement('canvas');
    c.width = c.height = s;
    const g = c.getContext('2d');
    const grd = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    const stops = 8;
    for (let i = 0; i <= stops; i++) {
      const t = i / stops;
      grd.addColorStop(t, tint(color, Math.pow(1 - t, falloff)));
    }
    g.fillStyle = grd; g.fillRect(0, 0, s, s);
    lightCache.set(key, c);
    if (lightCache.size > 260) lightCache.delete(lightCache.keys().next().value);
  }
  ctx.globalAlpha = alpha;
  ctx.drawImage(c, x - r, y - r, r * 2, r * 2);
  ctx.globalAlpha = 1;
}

export function tint(hex, a) {
  if (hex[0] !== '#') return hex;
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  return `rgba(${r},${g},${b},${a})`;
}

export function mix(h1, h2, t) {
  const p = (h) => { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const a = p(h1), b = p(h2);
  const c = a.map((v, i) => Math.round(v + (b[i] - v) * t));
  return `#${c.map((v) => v.toString(16).padStart(2, '0')).join('')}`;
}

/* A rounded-cap thick line, used constantly for limbs and beams. */
export function stroke(ctx, x1, y1, x2, y2, w, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color; ctx.lineWidth = w; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
  ctx.globalAlpha = 1;
}

export function circle(ctx, x, y, r, color, alpha = 1) {
  ctx.globalAlpha = alpha; ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, 6.2832); ctx.fill();
  ctx.globalAlpha = 1;
}

/* A quadratic-smoothed polyline through points — for cloth, hair, ribbons. */
export function ribbon(ctx, pts, w, color, alpha = 1) {
  if (pts.length < 2) return;
  ctx.globalAlpha = alpha; ctx.strokeStyle = color;
  ctx.lineWidth = w; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length - 1; i++) {
    const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
    ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
  }
  const l = pts[pts.length - 1];
  ctx.lineTo(l.x, l.y);
  ctx.stroke();
  ctx.globalAlpha = 1;
}
