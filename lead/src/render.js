/* How it looks.
 *
 * Flat high-contrast shapes with hard silhouettes, four parallax planes each
 * locked to its own value band, and one warm low sun behind everything. The
 * two bodies you care about are the only saturated things in the frame, so
 * they read at any size, in any light, on any monitor — value and shape carry
 * it, and hue is only ever decoration on top.
 *
 * The sky is the clock. It walks from afternoon to gold as the route runs
 * west, and nothing anywhere says so. */

import { C, PX, PAL } from './config.js';
import { ROUTE } from './route.js';
import { clamp, lerp, mulberry } from './feel.js';
import { light, tint, mix } from './gfx.js';

const rnd = mulberry(0x10ad);

/* Deterministic skyline/tree strips, generated once per band. */
function makeBand(seed, spec) {
  const r = mulberry(seed);
  const items = [];
  let x = spec.from;
  while (x < spec.to) {
    const w = spec.w[0] + r() * (spec.w[1] - spec.w[0]);
    const h = spec.h[0] + r() * (spec.h[1] - spec.h[0]);
    items.push({ x, w, h, k: r(), roof: r() });
    x += w + spec.gap[0] + r() * (spec.gap[1] - spec.gap[0]);
  }
  return items;
}

export class Render {
  constructor(gfx, world) {
    this.gfx = gfx;
    this.world = world;
    const end = world.length + 80;
    this.bands = {
      far: makeBand(11, { from: -60, to: end, w: [10, 30], h: [5, 13], gap: [3, 20] }),
      mid: makeBand(22, { from: -60, to: end, w: [7, 18], h: [4, 11], gap: [2, 12] }),
      near: makeBand(33, { from: -60, to: end, w: [5, 13], h: [3, 8], gap: [6, 26] }),
      fore: makeBand(44, { from: -60, to: end, w: [1.2, 3.6], h: [2.2, 5.5], gap: [1.2, 4.5] }),
    };
    this.dust = Array.from({ length: 90 }, () => ({
      x: rnd() * 2000, y: rnd() * 1100, s: 0.6 + rnd() * 2.2,
      p: 0.3 + rnd() * 0.7, ph: rnd() * 6.28
    }));
    this.t = 0;
  }

  /* 0 = afternoon, 1 = low gold. Driven purely by how far west you have got. */
  daylight(x) {
    return clamp((x / PX) / (this.world.length * 0.92), 0, 1);
  }

  draw(game, alpha) {
    const gfx = this.gfx, cam = game.cam;
    const s = gfx.begin();
    const day = this.daylight(game.kid.x);
    this.t = game.time;

    this.sky(s, day, cam);

    /* The camera position this frame, resolved once: the parallax planes are
     * drawn in screen space and need it before the world matrix exists. */
    const c = {
      cx: lerp(cam.px, cam.x, alpha) + cam.shakeX,
      cy: lerp(cam.py, cam.y, alpha) + cam.shakeY,
    };
    const halfW = gfx.vw / (2 * cam.zoom), halfH = gfx.vh / (2 * cam.zoom);
    const view = { x0: c.cx - halfW - 200, x1: c.cx + halfW + 200, y0: c.cy - halfH, y1: c.cy + halfH, cam };

    this.parallax(s, view, c, day);
    this.sea(s, view, c, day, cam);

    gfx.world(s);
    const glow = gfx.worldGlow();
    s.save(); glow.save();
    cam.apply(s, alpha);
    cam.apply(glow, alpha);

    this.ground(s, view, day, game.world.chapterAt(game.kid.x).id);
    this.viaduct(s, view, day);
    this.road(s, view, day);
    this.shore(s, view, day);
    this.props(s, game, view, day);
    this.shadows(s, game);
    this.actors(s, glow, game, day);
    this.particles(s, game);
    s.restore(); glow.restore();

    this.foreground(s, gfx, c, cam, view, day);
    this.airborneDust(s, gfx, c, cam);

    gfx.end({ bloom: 0.85, vignette: lerp(0.34, 0.52, day), grain: 0.045 });

    /* The last light. Not a cut and not a card — the afternoon just runs out
     * while the player still has the keys. */
    const fade = game.fadeT || 0;
    if (fade > 0) {
      const o = gfx.ctx;
      o.setTransform(1, 0, 0, 1, 0, 0);
      o.globalAlpha = Math.pow(fade, 1.4);
      o.fillStyle = '#0f1118';
      o.fillRect(0, 0, gfx.w, gfx.h);
      o.globalAlpha = 1;
    }
  }

  sky(s, day, cam) {
    const g = this.gfx;
    const top = mix(PAL.skyHigh, PAL.skyDusk, day * 0.72);
    const low = mix(PAL.skyLow, PAL.skyDuskLow, day);
    const grd = s.createLinearGradient(0, 0, 0, g.h);
    grd.addColorStop(0, top);
    grd.addColorStop(0.52, mix(top, low, 0.55));
    grd.addColorStop(1, low);
    s.fillStyle = grd;
    s.fillRect(0, 0, g.w, g.h);

    /* The sun sits low and to the west, parked in screen space so it feels
     * infinitely distant. The disc goes in the scene buffer so the town and
     * the hills can stand in front of it; only the halo goes in the glow
     * buffer, where bleeding over a silhouette is what light actually does. */
    const sx = g.w * (0.86 - day * 0.04);
    const sy = Math.min(g.h * (0.28 + day * 0.26), g.h * 0.5 - g.h * 0.012);
    s.save();
    s.fillStyle = PAL.sun;
    s.beginPath(); s.arc(sx, sy, g.h * 0.030, 0, 6.2832); s.fill();
    light(s, sx, sy, g.h * (0.26 + day * 0.16), PAL.sun, 0.40 + day * 0.22, 3.0);
    s.restore();
    const gl = this.gfx.gctx;
    gl.setTransform(this.gfx.glow.width / g.w, 0, 0, this.gfx.glow.width / g.w, 0, 0);
    light(gl, sx, sy, g.h * (0.20 + day * 0.14), PAL.sun, 0.34 + day * 0.20, 3.2);
    this.sun = { x: sx, y: sy };

    /* A few long clouds, value-only, so the sky is not an empty gradient. */
    s.save();
    s.globalAlpha = 0.16 + day * 0.14;
    s.fillStyle = mix('#ffffff', PAL.skyDuskLow, day);
    for (let i = 0; i < 5; i++) {
      const cy = g.h * (0.12 + i * 0.075);
      const cx = ((i * 733 + this.t * (6 + i * 3)) % (g.w * 1.6)) - g.w * 0.3;
      const w = g.w * (0.16 + (i % 3) * 0.10), h = g.h * 0.016;
      s.beginPath(); s.ellipse(cx, cy, w, h, 0, 0, 6.2832); s.fill();
      s.beginPath(); s.ellipse(cx + w * 0.4, cy - h * 0.7, w * 0.5, h * 0.8, 0, 0, 6.2832); s.fill();
    }
    s.restore();
  }

  /* Each plane sits at its own value, so depth is legible with the colour
   * turned off entirely.
   *
   * Drawn in explicit screen space rather than by nudging the world matrix:
   * a distant plane has to move slower AND sit smaller AND stay anchored to
   * the horizon while the play plane climbs a viaduct, and that is three
   * different relationships to the camera. */
  parallax(s, view, c, day) {
    const gfx = this.gfx, cam = view.cam;
    const zoom = cam.zoom, W = gfx.w / gfx.scale, H = gfx.h / gfx.scale;
    s.save();
    s.setTransform(gfx.scale, 0, 0, gfx.scale, 0, 0);

    const planes = [
      { band: 'far', p: 0.10, k: 0.20, col: mix(PAL.far, PAL.skyDuskLow, day * 0.6), a: 0.92 },
      { band: 'mid', p: 0.26, k: 0.33, col: mix(PAL.mid, PAL.skyDusk, day * 0.45), a: 0.97 },
      { band: 'near', p: 0.52, k: 0.55, col: mix(PAL.near, PAL.skyDusk, day * 0.32), a: 1 },
    ];

    for (const pl of planes) {
      /* The plane's ground line stays near the horizon and only creeps as the
       * camera climbs, which is what makes a hill feel high. */
      const baseY = H * (0.70 + pl.p * 0.03) - (c.cy + 1.4 * PX) * pl.p * 0.30 * zoom;
      const scale = zoom * pl.k;
      const toX = (xm) => (xm * PX - c.cx * pl.p) * scale + W / 2;
      const x0 = (c.cx * pl.p - (W / 2) / scale) / PX;
      const x1 = (c.cx * pl.p + (W / 2) / scale) / PX;

      /* The town thins out only when the route actually leaves it. */
      const townFade = clamp(1 - ((c.cx / PX) - (ROUTE.marks.lastDune - 96)) / 70, 0, 1);
      s.globalAlpha = pl.a * townFade;
      if (s.globalAlpha < 0.02) continue;
      s.fillStyle = pl.col;
      for (const b of this.bands[pl.band]) {
        if (b.x + b.w < x0 - 10 || b.x > x1 + 10) continue;
        const gx = toX(b.x), gw = b.w * PX * scale;
        const gh = b.h * PX * scale;
        if (b.k > 0.70) {
          /* A tree. Sized off its height, not its plot width — a canopy wider
           * than the tree is tall is not a tree, it is a flying saucer. */
          const th = gh * 1.05, tw = th * 0.34;
          const cx0 = gx + gw * 0.5;
          s.fillRect(cx0 - Math.max(1.5, tw * 0.13), baseY - th * 0.46, Math.max(3, tw * 0.26), th * 0.46);
          s.beginPath();
          s.ellipse(cx0, baseY - th * 0.68, tw, th * 0.34, 0, 0, 6.2832);
          s.ellipse(cx0 - tw * 0.5, baseY - th * 0.52, tw * 0.6, th * 0.24, 0, 0, 6.2832);
          s.ellipse(cx0 + tw * 0.55, baseY - th * 0.55, tw * 0.55, th * 0.22, 0, 0, 6.2832);
          s.fill();
        } else {
          s.fillRect(gx, baseY - gh, gw, gh + 90 * scale + 30);
          if (b.roof > 0.55) {
            s.beginPath();
            s.moveTo(gx - gw * 0.07, baseY - gh);
            s.lineTo(gx + gw * 0.5, baseY - gh - gw * 0.26);
            s.lineTo(gx + gw * 1.07, baseY - gh);
            s.closePath(); s.fill();
          }
          /* Lit windows. Value only, and only close enough to matter. */
          if (pl.p > 0.4 && gh > 40) {
            s.save();
            s.fillStyle = tint(PAL.sun, 0.12 + day * 0.34);
            const cols = clamp(Math.floor(b.w / 3.0), 1, 5);
            const rows = clamp(Math.floor(b.h / 2.6), 1, 4);
            for (let cx2 = 0; cx2 < cols; cx2++) for (let ry = 0; ry < rows; ry++) {
              if (((cx2 * 7 + ry * 13 + Math.floor(b.x)) % 4) === 0) continue;
              s.fillRect(
                gx + gw * (0.18 + cx2 * 0.68 / cols), baseY - gh + gh * (0.18 + ry * 0.66 / rows),
                Math.max(2, gw * 0.26 / cols), Math.max(2, gh * 0.22 / rows)
              );
            }
            s.restore();
          }
        }
      }
    }
    s.restore();
  }

  /* The floor. A dark mass is not a floor — it is a hole. What makes ground
   * read as ground is a lit lip, a band of surface under it, and enough
   * texture passing underfoot to tell you that you are moving. */
  ground(s, view, day, chapter) {
    const W = this.world;
    const step = 9;
    const bottom = view.y1 + 900;
    /* One sweep of the terrain per frame, reused by every pass below.
     * groundAt is the single hottest call in the renderer and there is no
     * reason to make it four times for the same line. */
    const xs = this._xs || (this._xs = []);
    const ys = this._ys || (this._ys = []);
    let n = 0;
    for (let x = view.x0; x <= view.x1 + step; x += step) {
      xs[n] = x; ys[n] = W.groundAt(x); n++;
    }
    const path = (offset) => {
      s.beginPath();
      s.moveTo(xs[0], ys[0] + offset);
      for (let i = 1; i < n; i++) s.lineTo(xs[i], ys[i] + offset);
    };

    /* The body of the earth, darkening downward. */
    path(0);
    s.lineTo(view.x1, bottom); s.lineTo(view.x0, bottom); s.closePath();
    const beachC = chapter === 'beach', parkC = chapter === 'park';
    const top = beachC ? mix('#a08a63', '#7a6248', day * 0.55)
      : parkC ? mix('#3f4a3c', '#2f2a34', day * 0.45)
      : mix(PAL.ground, '#2b2530', day * 0.45);
    const surfY = W.groundAt(view.cam.x);
    const g = s.createLinearGradient(0, surfY, 0, view.y1);
    g.addColorStop(0, top);
    g.addColorStop(0.45, mix(top, '#1d2029', beachC ? 0.16 : 0.55));
    g.addColorStop(1, mix('#181b23', '#171220', day * 0.5));
    s.fillStyle = g;
    s.fill();

    /* Strata. A few horizontal seams so the mass under your feet has a scale
     * and the bottom of the frame is not a hole. */
    s.save();
    s.globalAlpha = 0.10;
    s.strokeStyle = '#000';
    s.lineWidth = 3;
    for (let k = 1; k <= 4; k++) {
      s.beginPath();
      for (let i = 0; i < n; i += 5) {
        const x = xs[i], y = ys[i] + k * 128 + Math.sin(x * 0.0021 + k * 1.7) * 22;
        if (i === 0) s.moveTo(x, y); else s.lineTo(x, y);
      }
      s.stroke();
    }
    s.restore();

    const beach = beachC, park = parkC;
    const surface = beach ? PAL.sand : park ? PAL.grass : PAL.groundLit;

    /* The surface band: about a third of a metre of whatever you are standing
     * on, lit from the west. */
    s.save();
    path(0);
    s.strokeStyle = mix(mix(surface, PAL.ground, 0.35), PAL.sun, 0.16 + day * 0.22);
    s.lineWidth = 30; s.lineJoin = 'round';
    s.stroke();
    s.restore();

    /* The lit lip. One bright line is what says "the floor is here" from
     * across a room, and it does it in value alone. */
    path(-2);
    s.strokeStyle = mix(mix(surface, '#ffffff', 0.30), PAL.sun, 0.34 + day * 0.36);
    s.lineWidth = 5; s.lineCap = 'round'; s.lineJoin = 'round';
    s.stroke();

    /* Texture passing underfoot: kerbstones on the street, tufts on grass,
     * ripples on sand. Deterministic, so it never crawls. */
    s.save();
    const x0 = Math.floor(view.x0 / 140) * 140;
    for (let x = x0; x <= view.x1; x += 140) {
      const y = W.groundAt(x);
      const h = ((x * 2654435761) >>> 8) % 1000 / 1000;
      if (beach) {
        s.globalAlpha = 0.16;
        s.strokeStyle = mix(PAL.sand, '#ffffff', 0.4);
        s.lineWidth = 3;
        s.beginPath();
        s.moveTo(x - 40, y + 26 + h * 40);
        s.quadraticCurveTo(x, y + 20 + h * 40, x + 46, y + 27 + h * 40);
        s.stroke();
      } else if (park) {
        s.globalAlpha = 0.26;
        s.strokeStyle = mix(PAL.grass, '#000', 0.30);
        s.lineWidth = 3; s.lineCap = 'round';
        for (let i = 0; i < 3; i++) {
          const gx = x + i * 34 + h * 40;
          const bend = (h - 0.5) * 16 + Math.sin(this.t * 1.1 + gx * 0.01) * 5;
          s.beginPath(); s.moveTo(gx, y + 8);
          s.quadraticCurveTo(gx + bend * 0.4, y - 10, gx + bend, y - 17 - h * 9);
          s.stroke();
        }
      } else {
        s.globalAlpha = 0.22;
        s.strokeStyle = '#11141b';
        s.lineWidth = 3;
        s.beginPath(); s.moveTo(x + h * 60, y + 6); s.lineTo(x + h * 60, y + 34); s.stroke();
        s.globalAlpha = 0.12;
        s.fillStyle = '#0d1016';
        s.fillRect(x - 60, y + 34, 240, 5);
      }
    }
    s.restore();
  }

  props(s, game, view, day) {
    const W = this.world;
    for (const p of W.props) {
      const x = p.x * PX;
      if (x < view.x0 - 300 || x > view.x1 + 300) continue;
      const y = W.groundAt(x);
      drawProp(s, p, x, y, day, this.t, game);
    }
    for (const c of game.cars) drawVehicle(s, c, W, day, this.t);
  }

  /* The road. A whole chapter whose lesson is "hold on" needs to look like a
   * road, and the only thing that makes one is markings going past. */
  /* The water's edge.
   *
   * The sea has always been a band pinned to the horizon and the sand a slab
   * under it, and the two met at a hard line the characters ran along. So the
   * destination of the whole twelve minutes was a backdrop, and the place the
   * dog goes in and shakes the whole thing over you was dry ground.
   *
   * What is missing is not the sea, it is the EDGE: dry sand, then wet sand
   * that holds the light, then water. It runs up the beach and back on its
   * own time, and the furthest it ever reaches is the mark that stops you, so
   * the thing that turns you round is a thing you can see.
   */
  shore(s, view, day) {
    const M = ROUTE.marks, W = this.world;
    /* Up the sand and back, about eleven seconds. */
    const reach = 1.8 + Math.sin(this.t * 0.55) * 1.8;
    const edge = (M.shore - reach) * PX;
    if (view.x1 < edge - 2 * PX) return;

    const step = 7;
    const x0 = Math.max(view.x0, edge - 9 * PX);
    const x1 = view.x1 + 120;
    const line = (from, off) => {
      s.beginPath();
      s.moveTo(from, W.groundAt(from) + off);
      for (let x = from + step; x <= x1; x += step) s.lineTo(x, W.groundAt(x) + off);
      s.lineTo(x1, W.groundAt(x1) + off);
    };

    s.save();
    s.lineCap = 'round'; s.lineJoin = 'round';

    /* Wet sand: the width the water has just been over, darker and holding a
     * little of the sky. Value, not hue — it reads with the colour off. */
    if (x0 < edge) {
      s.globalAlpha = 0.55;
      s.strokeStyle = mix(PAL.sand, '#2a2b34', 0.42);
      s.lineWidth = 26;
      line(x0, 4);
      s.stroke();
      s.globalAlpha = 0.20;
      s.strokeStyle = mix(PAL.sea, PAL.sun, 0.30 + day * 0.2);
      s.lineWidth = 14;
      line(x0, -1);
      s.stroke();
      s.globalAlpha = 1;
    }

    /* The water itself: a film lying ON the sand it covers, not a fill to the
     * bottom of the frame. Seen from the side, a beach under two inches of sea
     * is still a beach — what changes is the surface, and it deepens as it
     * goes out. */
    s.beginPath();
    s.moveTo(edge, W.groundAt(edge));
    for (let x = edge + step; x <= x1; x += step) {
      const t2 = Math.min(1, (x - edge) / (26 * PX));
      s.lineTo(x, W.groundAt(x) - 2 - t2 * 15);
    }
    for (let x = x1; x >= edge; x -= step) s.lineTo(x, W.groundAt(x) + 13);
    s.closePath();
    s.fillStyle = mix(PAL.sea, PAL.sun, 0.10 + day * 0.10);
    s.globalAlpha = 0.88;
    s.fill();
    s.globalAlpha = 1;

    /* Foam where it lands. Drawn as short segments that thin and fade going
     * out, because one continuous bright line at one width is a kerb. */
    const foamLen = 2.6 * PX;
    s.strokeStyle = mix('#ffffff', PAL.sun, 0.22);
    s.lineCap = 'round';
    for (let x = edge; x < Math.min(x1, edge + foamLen); x += step) {
      const t2 = (x - edge) / foamLen;
      const fall = (1 - t2) * (1 - t2);
      const wob = Math.sin(x * 0.021 + this.t * 2.2) * 2.0 * (1 - t2);
      s.globalAlpha = 0.75 * fall;
      s.lineWidth = 1.5 + 4.5 * fall;
      s.beginPath();
      s.moveTo(x, W.groundAt(x) - 1 + wob);
      s.lineTo(x + step, W.groundAt(x + step) - 1 + wob);
      s.stroke();
      s.globalAlpha = 0.22 * fall;
      s.lineWidth = 6 + 9 * fall;
      s.stroke();
    }
    s.globalAlpha = 1;
    s.restore();
  }

  road(s, view, day) {
    const M = ROUTE.marks, W = this.world;
    const x0 = Math.max(view.x0, (M.roadStart - 2) * PX);
    const x1 = Math.min(view.x1, (M.roadEnd + 2) * PX);
    if (x1 <= x0) return;
    s.save();
    /* Asphalt: darker and flatter than the pavement it interrupts. */
    s.beginPath();
    s.moveTo(x0, W.groundAt(x0) - 2);
    for (let x = x0; x <= x1; x += 12) s.lineTo(x, W.groundAt(x) - 2);
    s.lineTo(x1, W.groundAt(x1) + 46);
    for (let x = x1; x >= x0; x -= 12) s.lineTo(x, W.groundAt(x) + 46);
    s.closePath();
    s.fillStyle = mix('#2b2f38', '#241d28', day * 0.5);
    s.fill();
    /* Centre line, dashed, passing under you. */
    s.globalAlpha = 0.55;
    s.strokeStyle = mix('#d9cfb4', PAL.sun, 0.2 + day * 0.3);
    s.lineWidth = 5;
    s.setLineDash([46, 54]);
    s.beginPath();
    for (let x = x0, f = true; x <= x1; x += 14) {
      const y = W.groundAt(x) + 30;
      if (f) { s.moveTo(x, y); f = false; } else s.lineTo(x, y);
    }
    s.stroke();
    s.setLineDash([]);
    s.restore();
  }

  /* The viaduct. From the deck you cannot see what you are standing on, so
   * the arches under it are the only thing that says how far down it is —
   * and the gap you are about to be thrown across is exactly that far down.
   *
   * Drawn after the ground, as openings cut through the mass rather than as
   * shapes laid on top of it. */
  viaduct(s, view, day) {
    const M = ROUTE.marks, W = this.world;
    /* Where the deck actually ends.
     *
     * This used to be the constant 986, which is ten metres past the point
     * where the beach starts dropping away — so for the fourteen metres
     * straight after the gap, which is the frame immediately after the whole
     * game's thesis lands, the deck slab was painted over open sand, the
     * arches came up as domes on top of the dune, and the dog galloped along
     * inside the stonework. Ask the ground instead. */
    const from = (M.lip - 12) * PX;
    if (this._viaEnd == null) {
      const deck0 = W.groundAt((M.lip + 10) * PX);
      let e = M.gapEnd + 2;
      while (e < 1010 && Math.abs(W.groundAt(e * PX) - deck0) < 0.5 * PX) e += 0.25;
      this._viaEnd = e * PX;
    }
    const to = this._viaEnd;
    const x0 = Math.max(view.x0, from), x1 = Math.min(view.x1, to);
    if (x1 <= x0) return;
    const deck = W.groundAt((M.lip + 10) * PX);

    s.save();
    /* The deck slab: a band of stone directly under the road. */
    s.fillStyle = mix('#3a3f4a', '#2c2330', day * 0.5);
    s.fillRect(x0, deck + 30, x1 - x0, 1.5 * PX);

    /* The openings. Sky-coloured, so you can see straight through the thing
     * you are standing on. */
    /* The break in the deck.
     *
     * Painting nothing here left the screen-space sea band showing straight
     * through, so the one place on the route that is not ground was the
     * BRIGHTEST large shape in the frame — a five-metre hole twenty metres up
     * reading as a lit window, pulling the eye away from the kid at the exact
     * moment the game is about. A hole is the darkest thing in a picture. */
    const gap = (ROUTE.gaps || []).find((g) => g.x1 > M.gapStart - 1 && g.x0 < M.gapEnd + 1);
    if (gap) {
      const gx0 = gap.x0 * PX, gx1 = gap.x1 * PX;
      const floor = -gap.floor * PX + (deck + gap.lip * PX);
      const gg = s.createLinearGradient(0, deck, 0, floor);
      gg.addColorStop(0, '#14161d');
      gg.addColorStop(1, '#0a0b0f');
      s.fillStyle = gg;
      s.fillRect(gx0, deck, gx1 - gx0, floor - deck);
      /* Two lit cut faces, so it reads as masonry broken rather than a slot. */
      s.fillStyle = mix('#5b6270', PAL.sun, 0.20 + day * 0.18);
      s.fillRect(gx0 - 7, deck, 7, 26);
      s.fillRect(gx1, deck, 7, 26);
      /* And a floor, so the hole has an end. */
      s.fillStyle = mix('#1b1e26', '#121016', day * 0.5);
      s.fillRect(gx0 - 7, floor - 16, (gx1 - gx0) + 14, 16);
    }

    const pitch = 9.2 * PX, w = 5.8 * PX, top = deck + 1.7 * PX, drop = 14 * PX;
    const first = Math.floor((x0 - pitch) / pitch) * pitch + pitch * 0.5;
    s.fillStyle = mix(mix(PAL.skyLow, PAL.skyDuskLow, day), '#1e1c28', 0.66);
    for (let cx = first; cx <= x1 + pitch; cx += pitch) {
      if (cx + w / 2 < from || cx - w / 2 > to) continue;
      /* Nothing under the gap: that is the whole point of the gap. */
      if (cx > M.gapStart * PX - w && cx < M.gapEnd * PX + w) continue;

      s.beginPath();
      s.moveTo(cx - w / 2, top + drop);
      s.lineTo(cx - w / 2, top + w / 2);
      s.arc(cx, top + w / 2, w / 2, Math.PI, 0);
      s.lineTo(cx + w / 2, top + drop);
      s.closePath();
      s.fill();
    }

    /* A parapet along the edge, so the deck has a lip you can see over. */
    s.fillStyle = mix('#4b515e', PAL.sun, 0.10 + day * 0.12);
    s.fillRect(x0, deck - 74, x1 - x0, 11);
    s.fillRect(x0, deck - 14, x1 - x0, 14);
    s.fillStyle = mix('#3a4049', '#2a2130', day * 0.5);
    for (let x = Math.floor(x0 / 46) * 46; x <= x1; x += 46) {
      if (x < from) continue;
      if (x > M.gapStart * PX && x < M.gapEnd * PX) continue;
      s.fillRect(x, deck - 68, 9, 58);
    }
    /* Where the deck runs out, a battered abutment rather than a clean slice
     * through open air. */
    if (to <= view.x1 && to >= view.x0 - 200) {
      s.fillStyle = mix('#343945', '#272030', day * 0.5);
      s.beginPath();
      s.moveTo(to - 4, deck - 74);
      s.lineTo(to + 40, deck - 62);
      s.lineTo(to + 96, W.groundAt(to + 96) + 20);
      s.lineTo(to - 4, deck + 30 + 1.5 * PX);
      s.closePath(); s.fill();
    }
    s.restore();
  }


  shadows(s, game) {
    const all = [...game.kid.shadows(), ...game.dog.shadows(),
      ...(game.pal ? game.pal.shadows() : [])];
    for (const sd of all) {
      s.fillStyle = `rgba(24,20,28,${sd.a * 0.62})`;
      s.beginPath();
      s.ellipse(sd.x, sd.y, sd.r, sd.r * 0.30, 0, 0, 6.2832);
      s.fill();
    }
  }

  actors(s, glow, game, day) {
    const leash = game.leash;

    /* The other dog first, so it passes behind yours. It has been simulated
     * every frame since the park gate — position, legs, gaze — and nothing
     * has ever drawn it, so the pack run has been one dog running beside
     * nothing, which is the beat that argues for opening your hand. */
    if (game.pal) game.pal.draw(s, { light: -1 });
    game.dog.draw(s, { light: -1 });
    game.kid.draw(s);

    /* The rope. Slack it is a dull sagging line; taut it is the brightest
     * thing on screen and it hums. Nothing else in the frame does that, so
     * the state of the leash is readable from across a room. */
    /* Once the clip is open there is no rope. Nothing moves these points any
     * more, so drawing them leaves a metre of leash hanging in the air at the
     * one beat with nothing else on screen to look at. */
    if (game.unclipped) return;
    const pts = leash.pts;
    const tension = leash.strain;
    s.save();
    s.lineCap = 'round'; s.lineJoin = 'round';

    const path = () => {
      s.beginPath();
      s.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        s.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      s.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    };

    /* A dark liner under the whole rope, so it reads against pale sand and
     * bright sky as well as it does against dark road. */
    s.strokeStyle = 'rgba(20,18,24,0.55)';
    s.lineWidth = lerp(7.4, 4.6, tension);
    path(); s.stroke();

    /* Slack it is a dark, thick, sagging line. Taut it is a bright thin one.
     * Value and shape both change, and both say the same thing. */
    s.strokeStyle = mix(PAL.ropeSlack, PAL.rope, Math.pow(tension, 0.6));
    s.lineWidth = lerp(5.2, 2.9, tension);
    path(); s.stroke();

    const l = pts[pts.length - 1];
    if (tension > 0.12) {
      /* A bright core only when it is actually carrying load. */
      s.strokeStyle = tint('#fffdf6', clamp(tension, 0, 1));
      s.lineWidth = lerp(2.2, 1.2, tension);
      path(); s.stroke();
      glow.save();
      glow.lineCap = 'round'; glow.lineJoin = 'round';
      glow.strokeStyle = tint(PAL.sun, tension * 0.5);
      glow.lineWidth = lerp(2, 5, tension);
      glow.beginPath();
      glow.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i].x + pts[i + 1].x) / 2, my = (pts[i].y + pts[i + 1].y) / 2;
        glow.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
      }
      glow.lineTo(l.x, l.y);
      glow.stroke();
      glow.restore();
    }
    s.restore();
  }

  particles(s, game) {
    const P = game.parts;
    for (let i = 0; i < P.n; i++) {
      const life = P.life[i] / P.max_[i];
      if (life <= 0) continue;
      const k = P.kind[i];
      s.globalAlpha = k === 2 ? life * 0.85 : life * 0.6;
      s.fillStyle = k === 1 ? PAL.sea : k === 2 ? PAL.sun : PAL.dust;
      const r = P.size[i] * (k === 2 ? life : 0.4 + life * 0.6);
      s.beginPath(); s.arc(P.x[i], P.y[i], r, 0, 6.2832); s.fill();
    }
    s.globalAlpha = 1;
  }

  /* Near-black grass and scrub along the very bottom edge, moving faster than
   * the play plane. It frames the picture and, more importantly, it is the
   * only thing on screen that tells you how fast you are actually going when
   * the ground itself is a flat colour. */
  foreground(s, gfx, c, cam, view, day) {
    const W = gfx.w / gfx.scale, H = gfx.h / gfx.scale;
    s.save();
    s.setTransform(gfx.scale, 0, 0, gfx.scale, 0, 0);
    s.fillStyle = mix('#0c0f16', '#191019', day * 0.7);
    const p = 1.42, scale = cam.zoom * 1.15;
    /* This sits at the bottom of the frame to give flat ground a speed cue. It
     * was drawn at H*1.03 — below the frame — at 0.13 of its own height, so
     * the tallest tuft in the game peaked twenty pixels short of the bottom
     * edge and never actually broke it. */
    const baseY = H * 0.995;
    /* Grass at the bottom of the frame only makes sense when you are near the
     * ground. Twenty metres up on a viaduct there is nothing down there. */
    const low = clamp(1 - (-(view.y1 - 200) / PX) / 26, 0, 1);
    s.globalAlpha = low;
    if (low < 0.03) { s.restore(); return; }
    for (const b of this.bands.fore) {
      const gx = (b.x * PX - c.cx * p) * scale + W / 2;
      if (gx < -260 || gx > W + 260) continue;
      const h = b.h * PX * scale * 0.34, w = b.w * PX * scale * 0.34;
      s.beginPath();
      s.moveTo(gx - w * 0.5, baseY);
      s.quadraticCurveTo(gx - w * 0.30, baseY - h * 1.15, gx, baseY - h * 0.55);
      s.quadraticCurveTo(gx + w * 0.10, baseY - h * 1.35, gx + w * 0.32, baseY - h * 0.5);
      s.quadraticCurveTo(gx + w * 0.46, baseY - h * 0.9, gx + w * 0.5, baseY);
      s.closePath();
      s.fill();
    }
    s.restore();
  }

  /* The sea. Only exists once the route turns west and starts down, and it
   * arrives as a fact rather than an announcement: one flat band under the
   * horizon that is suddenly there when you crest the viaduct. */
  sea(s, view, c, day, cam) {
    const gfx = this.gfx;
    const W = gfx.w / gfx.scale, H = gfx.h / gfx.scale;
    /* You see the sea for the first time when you crest the viaduct, and not
     * a metre before. It is the thing the whole climb was for. */
    const near = clamp(((c.cx / PX) - (ROUTE.marks.lip - 24)) / 40, 0, 1);
    if (near <= 0) return;
    s.save();
    s.setTransform(gfx.scale, 0, 0, gfx.scale, 0, 0);
    s.globalAlpha = near;
    /* The horizon is at eye level. Always. That is what a horizon is, and it
     * is why the sea appears the moment the land in front of you drops. */
    const horizon = H / 2;
    const key = Math.round(horizon) + ':' + Math.round(H) + ':' + (day * 24 | 0);
    if (key !== this._seaKey) {
      this._seaKey = key;
      const g = s.createLinearGradient(0, horizon, 0, H);
      g.addColorStop(0, mix(PAL.sea, PAL.skyDuskLow, 0.20 + day * 0.16));
      g.addColorStop(0.35, mix(PAL.sea, '#2c4c60', 0.35));
      g.addColorStop(1, mix(PAL.sea, '#16232e', 0.72));
      this._seaGrad = g;
    }
    s.fillStyle = this._seaGrad;
    s.fillRect(0, horizon, W, H - horizon);
    /* A sun track on the water: one bright column, no detail. */
    if (this.sun) {
      s.globalCompositeOperation = 'lighter';
      const sx = this.sun.x / gfx.scale;
      /* One soft column, widening as it comes toward you. Hard bars read as
       * floating rectangles; a gradient reads as light on water. */
      /* Soft stamps down the column. Hard edges on water read as a cut-out;
       * overlapping falloffs read as glare. */
      for (let i = 0; i < 9; i++) {
        const t = i / 8;
        const y = horizon + t * (H - horizon) * 0.98;
        const w = 34 + t * 210;
        s.globalAlpha = near * (0.30 - t * 0.24);
        light(s, sx + Math.sin(this.t * 0.8 + i * 1.6) * 14, y, w, PAL.sun, 1, 2.0);
      }
      s.globalAlpha = near * 0.12;
      for (let i = 0; i < 6; i++) {
        const t = (i + 1) / 7;
        const y = horizon + t * (H - horizon) * 0.9;
        const w = 50 + t * 260;
        s.fillStyle = tint(PAL.sun, 0.5);
        s.beginPath();
        s.ellipse(sx + Math.sin(this.t * 0.9 + i * 1.7) * 22, y, w / 2, 3 + t * 3, 0, 0, 6.2832);
        s.fill();
      }
      s.globalCompositeOperation = 'source-over';
    }
    s.restore();
  }

  /* Motes in the sun beam. Screen-space, so they never tie to the world and
   * never cost anything. */
  airborneDust(s, gfx, c, cam) {
    s.save();
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'lighter';
    for (const d of this.dust) {
      const x = (d.x - c.cx * d.p * 0.12) % (gfx.w + 60);
      const y = d.y + Math.sin(this.t * 0.4 + d.ph) * 12;
      s.fillStyle = tint(PAL.sun, 0.10 * d.p);
      s.beginPath(); s.arc(x < 0 ? x + gfx.w + 60 : x, y % gfx.h, d.s, 0, 6.2832); s.fill();
    }
    s.restore();
  }
}

/* --- props ------------------------------------------------------------- */

function drawProp(s, p, x, y, day, t, game) {
  const A = PAL;
  switch (p.kind) {
    case 'lamppost': {
      s.fillStyle = mix(A.near, '#20242e', 0.4);
      s.fillRect(x - 5, y - 3.3 * PX, 10, 3.3 * PX);
      s.beginPath(); s.ellipse(x, y - 3.4 * PX, 20, 14, 0, 0, 6.2832); s.fill();
      s.fillStyle = tint(A.sun, 0.30 + day * 0.5);
      s.beginPath(); s.ellipse(x, y - 3.33 * PX, 13, 9, 0, 0, 6.2832); s.fill();
      break;
    }
    case 'bin': {
      s.fillStyle = mix(A.near, A.ground, 0.3);
      s.fillRect(x - 26, y - 0.82 * PX, 52, 0.82 * PX);
      s.fillStyle = mix(A.near, '#000', 0.25);
      s.fillRect(x - 30, y - 0.90 * PX, 60, 12);
      break;
    }
    case 'hydrant': {
      s.fillStyle = '#a2453c';
      s.fillRect(x - 11, y - 0.62 * PX, 22, 0.62 * PX);
      s.beginPath(); s.arc(x, y - 0.62 * PX, 12, Math.PI, 0); s.fill();
      break;
    }
    case 'grass': {
      s.strokeStyle = mix(A.grass, A.sun, 0.15 + day * 0.2);
      s.lineWidth = 4; s.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const gx = x + (i - 3) * 13;
        const sw = Math.sin(t * 1.4 + i) * 7;
        s.beginPath(); s.moveTo(gx, y); s.quadraticCurveTo(gx + sw * 0.5, y - 22, gx + sw, y - 40); s.stroke();
      }
      break;
    }
    case 'puddle': {
      s.save();
      s.globalAlpha = 0.55;
      s.fillStyle = mix(A.sea, A.skyLow, 0.4 + day * 0.3);
      s.beginPath(); s.ellipse(x, y + 3, 0.95 * PX, 10, 0, 0, 6.2832); s.fill();
      s.restore();
      break;
    }
    case 'pigeons': {
      const flown = p.flown || 0;
      const n = p.count || 8;
      for (let i = 0; i < n; i++) {
        const px = x + (i - n / 2) * 26 + Math.sin(t * 0.8 + i * 2) * 4;
        if (flown > 0) {
          const f = Math.min(1, flown);
          const fy = y - f * (140 + i * 40) - Math.sin(t * 8 + i) * 10;
          const fx = px + f * (i - n / 2) * 60 + f * 90;
          s.save(); s.globalAlpha = clamp(1.4 - f, 0, 1);
          s.fillStyle = mix('#8d96a6', '#e5dfd2', (i % 3) / 3);
          s.beginPath(); s.ellipse(fx, fy, 13, 7, -0.3, 0, 6.2832); s.fill();
          const w = Math.sin(t * 22 + i) * 12;
          s.strokeStyle = '#c7c2b6'; s.lineWidth = 3;
          s.beginPath(); s.moveTo(fx, fy); s.lineTo(fx - 12, fy - w); s.stroke();
          s.beginPath(); s.moveTo(fx, fy); s.lineTo(fx + 12, fy + w); s.stroke();
          s.restore();
        } else {
          s.fillStyle = mix('#8d96a6', '#e5dfd2', (i % 3) / 3);
          s.beginPath(); s.ellipse(px, y - 12, 12, 9, 0, 0, 6.2832); s.fill();
          s.fillStyle = '#6d7686';
          s.beginPath(); s.arc(px + 9, y - 20, 5, 0, 6.2832); s.fill();
        }
      }
      break;
    }
    case 'cat': {
      const spooked = p.spooked || 0;
      const cx = x + spooked * 260, cy = y - spooked * 90;
      s.save(); s.translate(cx, cy);
      s.fillStyle = '#3c3540';
      s.beginPath(); s.ellipse(0, -22, 30, 15, spooked * -0.4, 0, 6.2832); s.fill();
      s.beginPath(); s.arc(22, -34, 13, 0, 6.2832); s.fill();
      s.beginPath(); s.moveTo(16, -44); s.lineTo(20, -56); s.lineTo(26, -45); s.closePath(); s.fill();
      s.strokeStyle = '#3c3540'; s.lineWidth = 6; s.lineCap = 'round';
      s.beginPath(); s.moveTo(-26, -24);
      s.quadraticCurveTo(-46, -34 - spooked * 20, -40, -56 - spooked * 24); s.stroke();
      s.restore();
      break;
    }
    case 'ball': {
      s.fillStyle = '#e8b64a';
      s.beginPath(); s.arc(x, y - 20 + Math.sin(t * 2) * 3, 19, 0, 6.2832); s.fill();
      s.fillStyle = 'rgba(255,255,255,0.35)';
      s.beginPath(); s.arc(x - 6, y - 27, 6, 0, 6.2832); s.fill();
      break;
    }
    case 'sprinkler': {
      s.fillStyle = mix(A.near, A.ground, 0.4);
      s.fillRect(x - 5, y - 34, 10, 34);
      s.save(); s.globalAlpha = 0.5;
      s.strokeStyle = A.sea; s.lineWidth = 3;
      for (let i = 0; i < 9; i++) {
        const a = -Math.PI * (0.15 + 0.7 * ((i + Math.sin(t * 1.3) * 2) / 9));
        s.beginPath(); s.moveTo(x, y - 34);
        s.quadraticCurveTo(x + Math.cos(a) * 90, y - 34 + Math.sin(a) * 90,
          x + Math.cos(a) * 170, y - 10);
        s.stroke();
      }
      s.restore();
      break;
    }
    case 'cart': {
      const tip = p.tipped || 0;
      s.save(); s.translate(x, y); s.rotate(-tip * 0.5);
      /* The vendor, behind it, leaning on the counter until he is not. */
      s.save();
      s.translate(0.15 * PX, 0);
      s.fillStyle = mix('#3d4a63', '#000', 0.1);
      s.fillRect(-0.10 * PX, -1.5 * PX, 0.22 * PX, 0.9 * PX);
      s.fillStyle = '#e8dcc4';
      s.fillRect(-0.14 * PX, -1.75 * PX, 0.30 * PX, 0.3 * PX);
      s.fillStyle = PAL.kidSkin;
      s.beginPath(); s.arc(0, -1.92 * PX + tip * 12, 0.15 * PX, 0, 6.2832); s.fill();
      s.fillStyle = '#e8dcc4';
      s.beginPath(); s.ellipse(0, -2.06 * PX + tip * 12, 0.18 * PX, 0.07 * PX, 0, 0, 6.2832); s.fill();
      /* A hand up when the dog goes past instead of into him. */
      if (p.nod) {
        const wave = Math.sin(t * 9) * 0.5 + 0.5;
        s.strokeStyle = PAL.kidSkin;
        s.lineWidth = 0.09 * PX; s.lineCap = 'round';
        s.beginPath();
        s.moveTo(-0.10 * PX, -1.42 * PX);
        s.lineTo(-0.10 * PX - 0.22 * PX * p.nod, -1.78 * PX - 0.14 * PX * wave * p.nod);
        s.stroke();
      }
      s.restore();
      /* Striped awning: the loudest thing in the park, on purpose. */
      const poleH = 1.9 * PX;
      s.fillStyle = '#8d5a3c';
      s.fillRect(-0.98 * PX, -poleH, 7, poleH);
      s.fillRect(0.92 * PX, -poleH, 7, poleH);
      for (let i = 0; i < 6; i++) {
        s.fillStyle = i % 2 ? '#f0e4cd' : '#c2543f';
        s.fillRect(-1.06 * PX + i * 0.35 * PX, -poleH - 0.20 * PX, 0.36 * PX, 0.22 * PX);
      }
      s.fillStyle = '#c2543f';
      s.fillRect(-0.9 * PX, -1.05 * PX, 1.8 * PX, 0.62 * PX);
      s.fillStyle = mix('#e8dcc4', A.sun, 0.2);
      s.fillRect(-0.95 * PX, -1.30 * PX, 1.9 * PX, 0.26 * PX);
      s.fillStyle = '#4a4048';
      s.beginPath(); s.arc(-0.5 * PX, -0.2 * PX, 0.22 * PX, 0, 6.2832); s.fill();
      s.beginPath(); s.arc(0.5 * PX, -0.2 * PX, 0.22 * PX, 0, 6.2832); s.fill();
      /* Steam, because a still frame of a hot-dog cart should smell. */
      s.save(); s.globalAlpha = 0.20;
      s.fillStyle = '#fff';
      for (let i = 0; i < 3; i++) {
        const yy = -1.4 * PX - ((t * 40 + i * 40) % 120);
        s.beginPath(); s.arc(Math.sin(t + i) * 14, yy, 12 + i * 5, 0, 6.2832); s.fill();
      }
      s.restore();
      s.restore();
      break;
    }
    case 'tree': {
      /* A park tree on the play plane: dark trunk, three-lobe canopy, and a
       * long shadow west. Big enough to frame the two of you as you pass. */
      const h = 4.3 * PX, w = h * 0.27;
      s.save();
      s.fillStyle = mix('#46543f', '#302636', day * 0.5);
      s.fillRect(x - w * 0.10, y - h * 0.50, w * 0.20, h * 0.50);
      const sway = Math.sin(t * 0.7 + x * 0.01) * 6;
      s.beginPath();
      s.ellipse(x + sway, y - h * 0.74, w, h * 0.30, 0, 0, 6.2832);
      s.ellipse(x + sway - w * 0.55, y - h * 0.58, w * 0.62, h * 0.22, 0, 0, 6.2832);
      s.ellipse(x + sway + w * 0.58, y - h * 0.60, w * 0.58, h * 0.21, 0, 0, 6.2832);
      s.fill();
      s.globalAlpha = 0.30;
      s.fillStyle = mix(A.grass, '#ffffff', 0.35 + day * 0.3);
      s.beginPath();
      s.ellipse(x + sway - w * 0.30, y - h * 0.80, w * 0.52, h * 0.16, -0.2, 0, 6.2832);
      s.fill();
      s.restore();
      break;
    }
    case 'bench': {
      s.save();
      s.fillStyle = mix('#6b503a', '#2f2430', day * 0.45);
      s.fillRect(x - 0.85 * PX, y - 0.46 * PX, 1.7 * PX, 9);
      s.fillRect(x - 0.85 * PX, y - 0.72 * PX, 1.7 * PX, 8);
      s.fillStyle = mix('#4a4048', '#241d28', day * 0.4);
      s.fillRect(x - 0.72 * PX, y - 0.46 * PX, 8, 0.46 * PX);
      s.fillRect(x + 0.64 * PX, y - 0.46 * PX, 8, 0.46 * PX);
      s.restore();
      break;
    }
    case 'sausage': {
      s.save(); s.translate(x, y - 12); s.rotate(Math.sin(t * 1.6 + x) * 0.12);
      s.fillStyle = '#b8603f';
      s.beginPath(); s.ellipse(0, 0, 26, 11, 0, 0, 6.2832); s.fill();
      s.fillStyle = 'rgba(255,225,190,0.30)';
      s.beginPath(); s.ellipse(-4, -4, 16, 4, -0.2, 0, 6.2832); s.fill();
      s.restore();
      break;
    }
    case 'gulls': {
      for (let i = 0; i < 7; i++) {
        const a = t * 0.5 + i * 0.9;
        const gx = x + Math.cos(a) * (120 + i * 40);
        const gy = y - p.high * PX + Math.sin(a * 1.3) * (40 + i * 14);
        s.strokeStyle = tint('#fdf6e6', 0.8); s.lineWidth = 4; s.lineCap = 'round';
        const w = Math.sin(t * 5 + i) * 9;
        s.beginPath();
        s.moveTo(gx - 15, gy + w); s.quadraticCurveTo(gx, gy - 6, gx + 15, gy + w);
        s.stroke();
      }
      break;
    }
    case 'sea': {
      break;   /* the sea is drawn by the beach chapter, not as a prop */
    }
    case 'otherdog': break;   /* a real Dog instance, drawn by the game */
    default: break;
  }
}


/* Traffic and bicycles. Nothing here can hurt anyone — they swerve, they
 * honk, and they carry on — but they are loud and fast and close, which is
 * the whole reason the crossing wants your hand shut. */
function drawVehicle(s, c, W, day, t) {
  const x = c.x, y = W.groundAt(x) + 22;
  const dir = Math.sign(c.v) || 1;
  s.save();
  s.translate(x, y);
  s.scale(dir, 1);
  if (c.kind === 'cycle') {
    s.strokeStyle = '#22262f'; s.lineWidth = 5;
    for (const wx of [-30, 30]) {
      s.beginPath(); s.arc(wx, -22, 21, 0, 6.2832); s.stroke();
    }
    s.lineWidth = 6;
    s.beginPath();
    s.moveTo(-30, -22); s.lineTo(-4, -22); s.lineTo(14, -48); s.lineTo(30, -22);
    s.moveTo(-4, -22); s.lineTo(12, -50);
    s.stroke();
    s.fillStyle = '#4e6f8e';
    s.beginPath(); s.ellipse(2, -66, 15, 20, -0.25, 0, 6.2832); s.fill();
    s.fillStyle = PAL.kidSkin;
    s.beginPath(); s.arc(10, -92, 12, 0, 6.2832); s.fill();
  } else {
    const col = c.col || '#c8564a';
    s.fillStyle = mix(col, '#1c1a22', 0.20 + day * 0.20);
    s.beginPath();
    s.moveTo(-88, -6); s.lineTo(-96, -44); s.lineTo(-52, -50);
    s.lineTo(-24, -78); s.lineTo(34, -78); s.lineTo(58, -50);
    s.lineTo(96, -44); s.lineTo(90, -6);
    s.closePath(); s.fill();
    s.fillStyle = 'rgba(200,225,240,0.35)';
    s.beginPath();
    s.moveTo(-46, -50); s.lineTo(-22, -72); s.lineTo(30, -72); s.lineTo(50, -50);
    s.closePath(); s.fill();
    s.fillStyle = '#1a1a20';
    for (const wx of [-54, 56]) { s.beginPath(); s.arc(wx, -4, 18, 0, 6.2832); s.fill(); }
    /* One warm headlight, which is the only part of it you see coming. */
    s.fillStyle = tint(PAL.sun, 0.55 + day * 0.4);
    s.beginPath(); s.ellipse(94, -34, 8, 6, 0, 0, 6.2832); s.fill();
  }
  s.restore();
}
