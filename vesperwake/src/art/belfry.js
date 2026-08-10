/* art/belfry.js — THE MERIDIAN BELFRY.
 *
 * A clockworks hung over a lightning storm. The painting behind it decides
 * everything: an eclipsed moon, gilt astrolabe rings turning in the sky, a
 * colossal bell on a riveted frame, chains in every direction, and a wet slate
 * deck that mirrors the whole mess back at you.
 *
 * Bronze is the hard part of this chapter. Real bronze under a storm is a dark
 * warm GREY — it only goes gold where an edge turns into the light. So the
 * ramps here are mixed cold and the gild is added at the lip alone, and the
 * lightning is the thing that briefly gilds everything else.
 *
 * Nothing is a generic platform. A ledge is a broken cog, a chain bridge or a
 * girder; a crumbling step is a deck plate whose rivets are letting go. If it
 * holds your weight, it is a piece of the machine.
 *
 * One structural rule that differs from the Orchard: every texture loop here
 * is indexed off a fixed lattice and hashed, never walked with a running RNG.
 * That means the only strip we have to draw is the strip the camera can see,
 * and the texture still holds perfectly still while you run past it.
 */

import { TAU, hash01, makeRng, clamp, lerp, mixHex, withAlpha } from '../core.js';
import { VIEW_W } from '../config.js';
import {
  slab, courses, chipEdge, crust, sheen, castShadow, groundShadow, glowDot,
  railing, chain, arch, lightPool, grain, poly, line, ramp, dim, lit,
  bakedSprite, drawBaked,
} from './paint.js';

/* An eclipse, so the key light is high and barely off vertical. */
export const LIGHT = { x: -0.2, y: -0.98 };

/* ------------------------------------------------------------------ *
 * LIGHTNING
 *
 * Rare, brief, and DETERMINISTIC. A Math.random() flash sampled per frame
 * strobes, cannot be reproduced by the autotest, and — worse — makes every
 * highlight in the level jitter independently. Instead each 5.2s window either
 * holds one strike or holds none, and where the strike falls inside its window
 * is fixed by the window's index. The same second always looks the same.
 * ------------------------------------------------------------------ */

const STRIKE_PERIOD = 5.2;

export function lightning(t) {
  const n = Math.floor(t / STRIKE_PERIOD);
  if (hash01(n * 3.77 + 1.3) < 0.42) return 0;      // most windows stay dark
  const at = 0.5 + hash01(n * 9.13) * 3.7;
  const d = t - n * STRIKE_PERIOD - at;
  if (d < 0 || d > 0.44) return 0;
  const decay = 1 - d / 0.44;
  /* one hard stroke followed by a couple of weaker flickers */
  return decay * decay * (0.42 + 0.58 * Math.abs(Math.sin(d * 54 + 1.05)));
}

const strikeSeed = (t) => Math.floor(t / STRIKE_PERIOD);

/* ------------------------------------------------------------------ *
 * MATERIALS — mixed from the sampled matte, so the metal in front is made of
 * the metal behind.
 * ------------------------------------------------------------------ */

/* Bronze goes gold on the lit edge and nowhere else. */
function gild(r, gold, k) {
  return {
    ...r,
    lip: mixHex(r.lip, gold, k),
    top: mixHex(r.top, gold, k * 0.30),
  };
}

function mats(pal) {
  const gold = mixHex(pal.warm, '#ffd489', 0.44);
  return {
    /* the deck plates you walk on */
    deck: gild(ramp('#4a4033', pal, { blend: 0.34, sink: 0.30, topMix: 0.20, footMix: 0.74 }), gold, 0.50),
    /* girders, cogs, straps, everything else cast */
    bronze: gild(ramp('#514536', pal, { blend: 0.28, sink: 0.24, topMix: 0.24, footMix: 0.66 }), gold, 0.55),
    /* the cold stone under the machine */
    slate: ramp('#333d49', pal, { blend: 0.36, sink: 0.34, topMix: 0.18, footMix: 0.76 }),
    /* the bell frame */
    timber: ramp('#3d3126', pal, { blend: 0.18, sink: 0.22, topMix: 0.22, footMix: 0.70 }),
    /* chain, hardware, the things that are not bronze */
    iron: ramp('#2c3239', pal, { blend: 0.14, sink: 0.16, topMix: 0.30, footMix: 0.66 }),
    /* Verdigris is the only saturated thing in the chapter, so it is mixed
     * most of the way back to the matte. Bright green speckle on a bronze deck
     * reads as litter, not as corrosion. */
    patina: mixHex('#3f7f6b', pal.mid, 0.62),
    gold,
    lamp: mixHex(pal.warm, '#ffdc9a', 0.42),
    spark: lit(pal.glow, 0.55),
  };
}

let cachedPal = null; let cachedMats = null;
const M = (pal) => {
  if (cachedPal !== pal) { cachedPal = pal; cachedMats = mats(pal); }
  return cachedMats;
};

/* ------------------------------------------------------------------ *
 * SHARED FITTINGS
 * ------------------------------------------------------------------ */

/* The strip of a wide run the camera can actually see. Deck runs are 1500px
 * long and the rivet rows are dense; without this we pay for sixty screens of
 * bolts to show one. */
function strip(env, x, w, pad = 100) {
  const cam = env.camera;
  if (!cam) return { x0: x, x1: x + w };
  const ox = cam.ox ?? cam.x ?? 0;
  return { x0: Math.max(x, ox - pad), x1: Math.min(x + w, ox + VIEW_W + pad) };
}

/* courses() lays its joints relative to the x it is handed, so culling it
 * naively would make the masonry crawl sideways as the camera moves. Snapping
 * the window to the brush's own 46px lattice holds it still. */
function snapped(x, x0, x1, lattice = 46) {
  const sx = x + Math.floor((x0 - x) / lattice) * lattice;
  const ex = x + Math.ceil((x1 - x) / lattice) * lattice;
  return { x: sx, w: Math.max(lattice, ex - sx) };
}

/* A dome-head rivet. The light is high and slightly left, so the catch sits on
 * the upper-left of the head and the seat shadow sits under it. */
function rivet(ctx, x, y, r, m, fl = 0) {
  ctx.fillStyle = m.deck.deep;
  ctx.beginPath(); ctx.arc(x, y + 0.7, r + 0.6, 0, TAU); ctx.fill();
  ctx.fillStyle = m.deck.face;
  ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(m.gold, 0.44 + fl * 0.5);
  ctx.beginPath(); ctx.arc(x - r * 0.30, y - r * 0.34, r * 0.44, 0, TAU); ctx.fill();
}

/* A cog. The teeth turn; the highlight does NOT — it stays on the upper-left
 * in world space, which is the whole reason a turning gear reads as turning. */
function cog(ctx, cx, cy, r, rot, m, opts = {}) {
  const teeth = Math.max(8, Math.round(r / 4.4));
  const root = r * 0.87;
  const body = opts.body ?? m.bronze.foot;
  const tooth = opts.tooth ?? m.bronze.face;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = body;
  ctx.beginPath(); ctx.arc(0, 0, root, 0, TAU); ctx.fill();

  ctx.fillStyle = tooth;
  const hw = (TAU / teeth) * 0.31;
  for (let i = 0; i < teeth; i += 1) {
    const a = (i / teeth) * TAU;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a - hw) * root, Math.sin(a - hw) * root);
    ctx.lineTo(Math.cos(a - hw * 0.6) * r, Math.sin(a - hw * 0.6) * r);
    ctx.lineTo(Math.cos(a + hw * 0.6) * r, Math.sin(a + hw * 0.6) * r);
    ctx.lineTo(Math.cos(a + hw) * root, Math.sin(a + hw) * root);
    ctx.closePath(); ctx.fill();
  }

  /* Lightening holes are HOLES — they show the dark behind the wheel, so they
   * are cut from black and never mixed from the material. Tint them and a gear
   * turns into a pale polka dot, which is exactly what happens when the body
   * behind them is darker than the material they came from. */
  if (opts.spokes !== false && r > 26) {
    const spokes = r > 54 ? 6 : 5;
    ctx.fillStyle = 'rgba(1,3,7,.82)';
    for (let i = 0; i < spokes; i += 1) {
      const a = ((i + 0.5) / spokes) * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * root * 0.56, Math.sin(a) * root * 0.56, root * 0.21, root * 0.27, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = tooth;
    ctx.beginPath(); ctx.arc(0, 0, Math.max(4, r * 0.19), 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(1,3,7,.9)';
    ctx.beginPath(); ctx.arc(0, 0, Math.max(1.6, r * 0.075), 0, TAU); ctx.fill();
  }
  ctx.restore();

  /* The catch along the top-left crests stays put while the teeth turn under
   * it — that fixed highlight is what makes a spinning gear read as spinning
   * rather than as a wheel with a painted-on mark. */
  ctx.save();
  ctx.strokeStyle = withAlpha(opts.edge ?? m.gold, opts.edgeAlpha ?? 0.32);
  ctx.lineWidth = Math.max(1, r * 0.034);
  ctx.beginPath(); ctx.arc(cx, cy, root, Math.PI * 1.06, Math.PI * 1.60);
  ctx.stroke();
  ctx.restore();
}

/* ------------------------------------------------------------------ *
 * SOLID — the riveted bronze deck over slate.
 * ------------------------------------------------------------------ */

const PLATE = 96;
/* Plate seams sit on a fixed lattice with a hashed nudge, so the joints can be
 * culled to the visible strip without the deck sliding under your feet. */
const seamAt = (k) => k * PLATE + (hash01(k * 12.9898) - 0.5) * 34;

function paintDeck(ctx, b, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = b;
  const h = Math.min(b.h, 300);
  const fl = lightning(env.time);
  const s = (px) => clamp(px / h, 0, 1);
  const cull = strip(env, x, w);

  /* The deck is a LIP over a drop. Light lands on the top 4px of plate and on
   * the proud fascia band a hand below it; the slate under that falls into the
   * storm. Foreground surfaces live BELOW the matte in value or the picture
   * comes apart. */
  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, m.deck.top);
  body.addColorStop(s(4), m.deck.face);
  body.addColorStop(s(11), m.deck.foot);
  body.addColorStop(s(13), mixHex(m.deck.foot, pal.shadow, 0.30));
  body.addColorStop(s(25), mixHex(m.slate.foot, pal.shadow, 0.24));
  body.addColorStop(s(78), m.slate.deep);
  body.addColorStop(1, mixHex(m.slate.deep, pal.shadow, 0.80));
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* ---- the walking surface: bronze plates, each its own value ---- */
  const k0 = Math.floor((cull.x0 - x) / PLATE) - 1;
  const k1 = Math.ceil((cull.x1 - x) / PLATE) + 1;
  for (let k = k0; k <= k1; k += 1) {
    const px = x + seamAt(k);
    const pw = seamAt(k + 1) - seamAt(k);
    const tone = hash01(k * 7.31 + 2.1);
    const top = tone < 0.32
      ? mixHex(m.deck.top, pal.shadow, 0.22)
      : tone > 0.80 ? mixHex(m.deck.top, m.gold, 0.14) : m.deck.top;
    ctx.fillStyle = top;
    ctx.fillRect(px, y, pw - 1.4, 4.2);

    /* the seam, cut down through the plate edge into the fascia */
    ctx.strokeStyle = withAlpha(m.deck.deep, 0.92);
    ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(px, y); ctx.lineTo(px, y + 25); ctx.stroke();
    /* with light from above-left the far wall of a groove is the lit one */
    ctx.strokeStyle = withAlpha(m.gold, 0.16 + fl * 0.26);
    ctx.lineWidth = 0.8;
    ctx.beginPath(); ctx.moveTo(px + 1.4, y + 0.5); ctx.lineTo(px + 1.4, y + 12); ctx.stroke();

    /* verdigris weeping out of the joint — this is what makes it bronze and
     * not brass, and it is the only saturated thing in the material */
    const weep = 22 + hash01(k * 3.3) * 58;
    const wg = ctx.createLinearGradient(0, y + 6, 0, y + 6 + weep);
    wg.addColorStop(0, withAlpha(m.patina, 0.34));
    wg.addColorStop(1, withAlpha(m.patina, 0));
    ctx.fillStyle = wg;
    ctx.fillRect(px - 1.6, y + 6, 3.4 + hash01(k * 5.9) * 3, weep);

    /* wet plates mirror the sky for the first inch below the lip */
    if (tone > 0.55) {
      const rg = ctx.createLinearGradient(0, y + 4, 0, y + 13);
      rg.addColorStop(0, withAlpha(pal.sky, 0.26));
      rg.addColorStop(1, withAlpha(pal.sky, 0));
      ctx.fillStyle = rg;
      ctx.fillRect(px + 3, y + 4, Math.max(0, pw - 7), 9);
    }
  }

  /* the lip itself */
  ctx.fillStyle = m.deck.lip;
  ctx.fillRect(x, y, w, 1.6);

  /* ---- the bolted fascia band: a proud strap, two rows of rivets ---- */
  ctx.fillStyle = withAlpha(mixHex(m.deck.face, pal.shadow, 0.18), 0.95);
  ctx.fillRect(x, y + 13, w, 12);
  ctx.fillStyle = withAlpha(m.deck.lip, 0.20 + fl * 0.24);
  ctx.fillRect(x, y + 13, w, 1);
  ctx.fillStyle = withAlpha(m.deck.deep, 0.9);
  ctx.fillRect(x, y + 24.4, w, 1.6);

  const r0 = Math.floor((cull.x0 - x) / 26) - 1;
  const r1 = Math.ceil((cull.x1 - x) / 26) + 1;
  for (let i = r0; i <= r1; i += 1) {
    const rx = x + i * 26 + 13;
    if (rx < x || rx > x + w) continue;
    rivet(ctx, rx, y + 8, 1.9, m, fl);
    rivet(ctx, rx + 13, y + 19, 2.2, m, fl);
  }

  /* ---- grain over the metal ---- */
  const g = grain(ctx, 'belfry-deck', {
    size: 128,
    base: 'rgba(0,0,0,0)',
    light: withAlpha(pal.glow, 0.07),
    dark: 'rgba(2,4,8,.36)',
    accent: withAlpha(m.patina, 0.11),
    density: 280,
  });
  if (g) {
    ctx.save();
    ctx.globalAlpha = 0.48;
    ctx.fillStyle = g;
    ctx.translate(x % 128, y % 128);
    ctx.fillRect(-128, -128, w + 256, h + 256);
    ctx.restore();
  }
  /* corrosion gathers UNDER the lip and in the joints, not on the tread */
  crust(ctx, x, y + 9, w, 18, m.patina, x, 0.30);

  /* ---- standing water lying in the plate dishes ---- */
  for (let i = Math.floor(cull.x0 / 190); i <= Math.ceil(cull.x1 / 190); i += 1) {
    const px = i * 190 + hash01(i * 4.7) * 120;
    if (px < x + 20 || px > x + w - 40) continue;
    const pwid = 44 + hash01(i * 8.2) * 96;
    ctx.save();
    ctx.globalAlpha = 0.20 + hash01(i * 2.4) * 0.16 + fl * 0.3;
    const pg = ctx.createLinearGradient(px, y, px, y + 4.2);
    pg.addColorStop(0, withAlpha(pal.glow, 0.52));
    pg.addColorStop(1, withAlpha(pal.sky, 0));
    ctx.fillStyle = pg;
    ctx.fillRect(px, y, pwid, 4);
    ctx.restore();
  }

  /* ---- the slate beneath: ashlar, fissures, storm haze ---- */
  const sn = snapped(x, cull.x0, cull.x1);
  courses(ctx, sn.x, y + 26, sn.w, Math.max(0, Math.min(h - 26, 170)),
    withAlpha(mixHex(m.slate.deep, pal.shadow, 0.5), 0.9), 30, x, 0.13);

  for (let i = Math.floor(cull.x0 / 88); i <= Math.ceil(cull.x1 / 88); i += 1) {
    const fx = i * 88 + hash01(i * 6.1) * 60;
    if (fx < x || fx > x + w) continue;
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = mixHex(m.slate.deep, pal.shadow, 0.62);
    ctx.lineWidth = 1 + hash01(i * 1.9) * 1.7;
    ctx.beginPath();
    ctx.moveTo(fx, y + 28);
    ctx.lineTo(fx + (hash01(i * 3.4) - 0.5) * 30, y + 28 + 44 + hash01(i * 9.4) * 92);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;

  /* hanging chains against the cut face — the belfry's ivy */
  for (let i = Math.floor(cull.x0 / 240); i <= Math.ceil(cull.x1 / 240); i += 1) {
    const cx = i * 240 + hash01(i * 11.3) * 170;
    if (cx < x + 30 || cx > x + w - 30) continue;
    const len = 40 + hash01(i * 2.77) * 110;
    chain(ctx, cx, y + 26, cx + (hash01(i * 5.5) - 0.5) * 14, y + 26 + len,
      withAlpha(m.iron.foot, 0.5), 0, 0, 2.4);
  }

  /* storm gathering under the deck */
  const haze = ctx.createLinearGradient(0, y + h * 0.26, 0, y + h);
  haze.addColorStop(0, withAlpha(pal.mid, 0));
  haze.addColorStop(1, withAlpha(pal.mid, 0.36 + fl * 0.18));
  ctx.fillStyle = haze;
  ctx.fillRect(x, y + h * 0.26, w, h * 0.74);
  ctx.restore();

  /* wet sheen along the lip, and the lightning catching the whole edge */
  sheen(ctx, x + 4, y + 1, w - 8, withAlpha(pal.glow, 0.62), x * 0.02, 0.42, 1.2);
  if (fl > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = withAlpha(m.spark, fl * 0.42);
    ctx.fillRect(x, y - 0.6, w, 1.8);
    ctx.restore();
  }
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.7), x, 2.4);
}

/* The bell frame: heavy timber strapped in bronze. Anything you can stand on
 * that is not the deck is part of the thing that holds the bell up. */
function paintFrame(ctx, b, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w, h } = b;
  const fl = lightning(env.time);
  const upright = h >= w;

  const body = ctx.createLinearGradient(0, y, 0, y + h);
  body.addColorStop(0, m.timber.top);
  body.addColorStop(Math.min(0.06, 4 / h), m.timber.face);
  body.addColorStop(Math.min(0.22, 22 / h), m.timber.foot);
  body.addColorStop(1, mixHex(m.timber.deep, pal.shadow, 0.55));
  ctx.fillStyle = body;
  ctx.fillRect(x, y, w, h);

  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();

  /* ---- the baulks ---- */
  const span = upright ? w : h;
  const baulk = 54;
  const n = Math.max(1, Math.round(span / baulk));
  for (let i = 0; i < n; i += 1) {
    const t0 = i / n;
    const t1 = (i + 1) / n;
    const shade = 0.06 + hash01(i * 4.4 + x * 0.01) * 0.20;
    ctx.fillStyle = withAlpha(mixHex(m.timber.deep, pal.shadow, shade), 0.42);
    if (upright) ctx.fillRect(x + w * t0, y, 1.8, h);
    else ctx.fillRect(x, y + h * t0, w, 1.8);
    /* end grain / long grain, drawn along the baulk */
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = m.timber.deep;
    ctx.lineWidth = 0.9;
    for (let j = 0; j < 4; j += 1) {
      const u = lerp(t0, t1, 0.18 + j * 0.22);
      ctx.beginPath();
      if (upright) {
        const gx = x + w * u;
        ctx.moveTo(gx, y + 3);
        ctx.quadraticCurveTo(gx + (hash01(j + i * 3.1) - 0.5) * 5, y + h * 0.5, gx, y + h - 3);
      } else {
        const gy = y + h * u;
        ctx.moveTo(x + 3, gy);
        ctx.quadraticCurveTo(x + w * 0.5, gy + (hash01(j + i * 3.1) - 0.5) * 5, x + w - 3, gy);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  /* ---- bronze straps every couple of feet ---- */
  const strapEvery = 62;
  const across = upright ? h : w;
  const straps = Math.max(1, Math.floor(across / strapEvery));
  for (let i = 0; i <= straps; i += 1) {
    const u = (i + 0.5) / (straps + 1);
    const sw = 10;
    if (upright) {
      const sy = y + h * u;
      const sg = ctx.createLinearGradient(0, sy - sw * 0.5, 0, sy + sw * 0.5);
      sg.addColorStop(0, m.bronze.top);
      sg.addColorStop(0.34, m.bronze.face);
      sg.addColorStop(1, m.bronze.deep);
      ctx.fillStyle = sg;
      ctx.fillRect(x - 2, sy - sw * 0.5, w + 4, sw);
      ctx.fillStyle = withAlpha(m.bronze.lip, 0.32 + fl * 0.4);
      ctx.fillRect(x - 2, sy - sw * 0.5, w + 4, 1);
      rivet(ctx, x + 7, sy, 2.3, m, fl);
      rivet(ctx, x + w - 7, sy, 2.3, m, fl);
      if (w > 90) rivet(ctx, x + w * 0.5, sy, 2.3, m, fl);
    } else {
      const sx = x + w * u;
      const sg = ctx.createLinearGradient(sx - sw * 0.5, 0, sx + sw * 0.5, 0);
      sg.addColorStop(0, m.bronze.face);
      sg.addColorStop(0.26, m.bronze.top);
      sg.addColorStop(1, m.bronze.deep);
      ctx.fillStyle = sg;
      ctx.fillRect(sx - sw * 0.5, y - 2, sw, h + 4);
      ctx.fillStyle = withAlpha(m.bronze.lip, 0.26 + fl * 0.4);
      ctx.fillRect(sx - sw * 0.5, y - 2, 1, h + 4);
      rivet(ctx, sx, y + 8, 2.3, m, fl);
      rivet(ctx, sx, y + h - 8, 2.3, m, fl);
    }
  }

  /* ---- a diagonal brace, because a frame without one falls over ---- */
  if (w > 130 && h > 90) {
    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.strokeStyle = mixHex(m.timber.face, pal.shadow, 0.28);
    ctx.lineWidth = 17;
    ctx.lineCap = 'butt';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + h - 8);
    ctx.lineTo(x + w - 8, y + 18);
    ctx.stroke();
    ctx.strokeStyle = withAlpha(m.timber.top, 0.30);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 8, y + h - 16);
    ctx.lineTo(x + w - 8, y + 10);
    ctx.stroke();
    ctx.restore();
    /* the gusset where the brace lands */
    const gx = x + w * 0.5; const gy = y + h * 0.5;
    poly(ctx, [[gx - 15, gy - 15], [gx + 15, gy - 12], [gx + 12, gy + 15], [gx - 15, gy + 12]],
      m.bronze.face, withAlpha(m.bronze.lip, 0.4), 1.2);
    for (const [ox, oy] of [[-8, -8], [8, -6], [7, 8], [-8, 6]]) rivet(ctx, gx + ox, gy + oy, 2, m, fl);
  }

  crust(ctx, x, y, w, h * 0.6, m.patina, x + 9, 0.45);

  /* everything below the first hand's-breadth falls away */
  const sink = ctx.createLinearGradient(0, y + 18, 0, y + h);
  sink.addColorStop(0, 'rgba(0,0,0,0)');
  sink.addColorStop(1, 'rgba(1,3,7,.62)');
  ctx.fillStyle = sink;
  ctx.fillRect(x, y + 18, w, h - 18);
  ctx.restore();

  /* the bronze capping strip on top — the only bright line on the block */
  const cap = ctx.createLinearGradient(0, y - 1, 0, y + 4);
  cap.addColorStop(0, m.bronze.lip);
  cap.addColorStop(1, m.bronze.face);
  ctx.fillStyle = cap;
  ctx.fillRect(x - 1.5, y - 1.5, w + 3, 4);
  if (fl > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = withAlpha(m.spark, fl * 0.5);
    ctx.fillRect(x - 1.5, y - 1.5, w + 3, 1.4);
    ctx.restore();
  }
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.55), x + 3, 2.6);
}

export function paintSolid(ctx, b, env) {
  if (b.tag === 'block' || b.tag === 'wall' || b.tag === 'frame') paintFrame(ctx, b, env);
  else paintDeck(ctx, b, env);
}

/* ------------------------------------------------------------------ *
 * ONE-WAY PLATFORMS
 * ------------------------------------------------------------------ */

/* A gear-tooth walkway: an arc snapped out of a cog the size of a house,
 * bolted back in place through its bearing collar. You walk the web; the teeth
 * hang underneath where they can still catch you out. */
function paintGearWalk(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = 13;
  const fl = lightning(env.time);
  const hubLeft = hash01(x * 0.13) > 0.5;
  const bulge = Math.min(7, 3 + w * 0.02);

  castShadow(ctx, x, y + h + bulge, w, 0.30, 18);

  /* the rim band: flat where you walk, arced underneath */
  ctx.save();
  const g = ctx.createLinearGradient(0, y, 0, y + h + bulge);
  g.addColorStop(0, m.bronze.top);
  g.addColorStop(0.16, m.bronze.face);
  g.addColorStop(0.55, m.bronze.foot);
  g.addColorStop(1, m.bronze.deep);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w, y);
  ctx.lineTo(x + w, y + h);
  ctx.quadraticCurveTo(x + w * 0.5, y + h + bulge * 2, x, y + h);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = withAlpha(m.bronze.deep, 0.8);
  ctx.lineWidth = 1.1;
  ctx.stroke();

  /* teeth along the underside, fanned as though they radiate from a centre
   * somewhere far above the frame */
  const pitch = 21;
  const teeth = Math.max(2, Math.floor(w / pitch));
  for (let i = 0; i < teeth; i += 1) {
    const t = (i + 0.5) / teeth;
    const tx = x + w * t;
    const base = y + h + Math.sin(Math.PI * t) * bulge * 1.6;
    const fan = (t - 0.5) * 0.30;
    ctx.save();
    ctx.translate(tx, base);
    ctx.rotate(fan);
    const len = 10 + hash01(i * 5.1 + x * 0.02) * 3;
    poly(ctx, [[-6.4, 0], [-3.6, len], [3.6, len], [6.4, 0]],
      mixHex(m.bronze.foot, pal.shadow, 0.20), null);
    /* only the left flank of each tooth turns into the light */
    ctx.fillStyle = withAlpha(m.gold, 0.16 + fl * 0.3);
    ctx.fillRect(-6.4, 0, 1.5, len * 0.8);
    ctx.restore();
  }

  /* bolt holes through the web */
  for (let bx = x + 16; bx < x + w - 10; bx += 32) {
    ctx.fillStyle = withAlpha(m.bronze.deep, 0.9);
    ctx.beginPath(); ctx.ellipse(bx, y + 7.4, 3.4, 3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = withAlpha(m.gold, 0.24 + fl * 0.26);
    ctx.lineWidth = 0.9;
    ctx.beginPath(); ctx.arc(bx, y + 7.4, 3.6, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
  }

  /* the bearing collar at one end */
  const hx = hubLeft ? x + 15 : x + w - 15;
  const hy = y + h * 0.62;
  ctx.fillStyle = m.bronze.foot;
  ctx.beginPath(); ctx.arc(hx, hy, 12, 0, TAU); ctx.fill();
  ctx.fillStyle = m.bronze.face;
  ctx.beginPath(); ctx.arc(hx, hy, 8.4, 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(m.bronze.deep, 0.95);
  ctx.beginPath(); ctx.arc(hx, hy, 4.4, 0, TAU); ctx.fill();
  ctx.fillRect(hx - 1.6, hy - 7.2, 3.2, 3.6);          // the keyway
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * TAU + 0.3;
    rivet(ctx, hx + Math.cos(a) * 10, hy + Math.sin(a) * 10, 1.5, m, fl);
  }
  ctx.strokeStyle = withAlpha(m.gold, 0.34 + fl * 0.4);
  ctx.lineWidth = 1.3;
  ctx.beginPath(); ctx.arc(hx, hy, 12, Math.PI * 1.02, Math.PI * 1.72); ctx.stroke();
  ctx.restore();

  crust(ctx, x, y + h - 3, w, 8, m.patina, x + 5, 0.9);
  ctx.fillStyle = m.bronze.lip;
  ctx.fillRect(x, y, w, 1.8);
  sheen(ctx, x + 5, y + 1.1, w - 10, withAlpha(pal.glow, 0.72), x * 0.05, 0.5, 1.3);
  if (fl > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = withAlpha(m.spark, fl * 0.5);
    ctx.fillRect(x, y - 0.5, w, 1.5);
    ctx.restore();
  }
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.62), x + 4, 2.2);
}

/* A chain bridge: two catenaries with plank treads slung between them. The sag
 * is kept under 7px on purpose — the collision surface is flat, and anything
 * deeper than that and you can see your feet floating. */
function paintChainBridge(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const fl = lightning(env.time);
  const sag = clamp(w * 0.045, 3, 7);
  const curve = (t) => y + Math.sin(Math.PI * t) * sag;

  castShadow(ctx, x + 6, y + 14 + sag, w - 12, 0.22, 14);

  /* the far chain sits a little high and reads dimmer */
  chain(ctx, x, y - 3, x + w, y - 3, withAlpha(m.iron.foot, 0.55), sag, 0, 3.4);

  /* treads — wide enough to read as boards you could put a foot on rather
   * than as a row of beads strung over the drop */
  const tread = 19;
  const gap = 6;
  const count = Math.max(2, Math.floor((w - 8) / (tread + gap)));
  for (let i = 0; i < count; i += 1) {
    const t = (i + 0.5) / count;
    const tx = x + 4 + i * (tread + gap);
    const ty = curve(t);
    /* each tread lies along the local slope of the chain */
    const slope = Math.cos(Math.PI * t) * Math.PI * sag / w;
    ctx.save();
    ctx.translate(tx + tread * 0.5, ty + 4);
    ctx.rotate(Math.atan(slope));
    const tg = ctx.createLinearGradient(0, -4, 0, 8);
    tg.addColorStop(0, m.timber.top);
    tg.addColorStop(0.3, m.timber.face);
    tg.addColorStop(1, m.timber.deep);
    ctx.fillStyle = tg;
    ctx.fillRect(-tread * 0.5, -4, tread, 8.4);
    /* bronze binding at each end of the tread, and one nail apiece */
    ctx.fillStyle = m.bronze.foot;
    ctx.fillRect(-tread * 0.5, -4, 3, 8.4);
    ctx.fillRect(tread * 0.5 - 3, -4, 3, 8.4);
    ctx.fillStyle = withAlpha(m.timber.lip, 0.72 + fl * 0.28);
    ctx.fillRect(-tread * 0.5, -4, tread, 1.4);
    ctx.fillStyle = withAlpha(m.gold, 0.5);
    ctx.beginPath(); ctx.arc(0, -1.4, 0.9, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* the near chain, drawn over the treads and darker because it is closer */
  chain(ctx, x, y + 2, x + w, y + 2, withAlpha(mixHex(m.iron.face, pal.shadow, 0.4), 0.95), sag + 2, 0, 3.6);

  /* anchor cleats — the bridge has to be bolted to something */
  for (const ax of [x, x + w]) {
    const dir = ax === x ? 1 : -1;
    ctx.fillStyle = m.bronze.face;
    ctx.fillRect(ax - 5 * dir, y - 7, 10, 18);
    ctx.fillStyle = withAlpha(m.bronze.lip, 0.34 + fl * 0.36);
    ctx.fillRect(ax - 5 * dir, y - 7, 10, 1.2);
    ctx.strokeStyle = m.iron.face;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(ax, y - 9, 4.4, 0, TAU); ctx.stroke();
    rivet(ctx, ax, y + 6, 2, m, fl);
  }
  crust(ctx, x, y - 2, w, 9, m.patina, x + 13, 0.5);
}

/* A bronze girder. The web is left open so the storm shows through it — that
 * hole is the difference between a girder and a plank painted brown. */
function paintGirder(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = 13;
  const web = 22;
  const fl = lightning(env.time);

  castShadow(ctx, x, y + h + web, w, 0.24, 16);

  /* top flange */
  const fg = ctx.createLinearGradient(0, y, 0, y + h);
  fg.addColorStop(0, m.bronze.top);
  fg.addColorStop(0.3, m.bronze.face);
  fg.addColorStop(1, m.bronze.deep);
  ctx.fillStyle = fg;
  ctx.fillRect(x, y, w, h * 0.62);
  ctx.fillStyle = m.bronze.lip;
  ctx.fillRect(x, y, w, 1.8);

  /* the lattice: N-bracing between the flanges */
  ctx.save();
  ctx.strokeStyle = mixHex(m.bronze.foot, pal.shadow, 0.16);
  ctx.lineWidth = 4.2;
  ctx.lineCap = 'butt';
  const bay = 26;
  const bays = Math.max(1, Math.round(w / bay));
  for (let i = 0; i < bays; i += 1) {
    const x0 = x + (w / bays) * i;
    const x1 = x + (w / bays) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x0, y + h * 0.62);
    ctx.lineTo(x1, y + h + web - 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x1, y + h * 0.62);
    ctx.lineTo(x1, y + h + web - 2);
    ctx.stroke();
  }
  /* the left flank of every member is the one that turns into the light */
  ctx.strokeStyle = withAlpha(m.gold, 0.14 + fl * 0.3);
  ctx.lineWidth = 1;
  for (let i = 0; i < bays; i += 1) {
    const x0 = x + (w / bays) * i;
    const x1 = x + (w / bays) * (i + 1);
    ctx.beginPath();
    ctx.moveTo(x0 - 1.4, y + h * 0.62);
    ctx.lineTo(x1 - 1.4, y + h + web - 2);
    ctx.stroke();
  }
  ctx.restore();

  /* bottom flange */
  ctx.fillStyle = mixHex(m.bronze.deep, pal.shadow, 0.24);
  ctx.fillRect(x, y + h + web - 3, w, 4.6);
  ctx.fillStyle = withAlpha(m.bronze.foot, 0.7);
  ctx.fillRect(x, y + h + web - 3, w, 1);

  /* gussets and rivets at the bearing points */
  for (const gx of [x + 9, x + w - 9]) {
    ctx.fillStyle = m.bronze.face;
    ctx.fillRect(gx - 8, y + 2, 16, h + web - 6);
    ctx.fillStyle = withAlpha(m.bronze.lip, 0.30 + fl * 0.36);
    ctx.fillRect(gx - 8, y + 2, 16, 1);
    for (let i = 0; i < 4; i += 1) rivet(ctx, gx + (i % 2 ? 4 : -4), y + 8 + Math.floor(i / 2) * 12, 1.9, m, fl);
  }
  for (let rx = x + 24; rx < x + w - 18; rx += 24) rivet(ctx, rx, y + 4.4, 1.8, m, fl);

  crust(ctx, x, y + h * 0.5, w, web, m.patina, x + 17, 0.6);
  sheen(ctx, x + 4, y + 1.1, w - 8, withAlpha(pal.glow, 0.66), x * 0.05, 0.46, 1.3);
  chipEdge(ctx, x, y, w, withAlpha(pal.sky, 0.6), x + 2, 2.2);
}

export function paintLedge(ctx, p, env) {
  if (p.tag === 'gear') paintGearWalk(ctx, p, env);
  else if (p.tag === 'chain') paintChainBridge(ctx, p, env);
  else paintGirder(ctx, p, env);
}

/* ------------------------------------------------------------------ *
 * CRUMBLE — a deck plate whose rivets are letting go.
 *
 * The warning is never colour: the plate jitters, the rivet heads visibly lift
 * out of their holes, and the crack across it opens. You can read all three
 * with the saturation turned off.
 * ------------------------------------------------------------------ */

export function paintCrumble(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const shake = p.shake ?? 0;
  const jitter = shake > 0 ? Math.sin(env.time * 71 + p.x) * shake * 2.4 : 0;
  const x = p.x + jitter;
  const y = p.y + Math.abs(jitter) * 0.35;
  const w = p.w;
  const h = 12;
  const fl = lightning(env.time);

  castShadow(ctx, x, y + h, w, 0.36, 14);

  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, m.deck.top);
  g.addColorStop(0.22, m.deck.face);
  g.addColorStop(0.6, m.deck.foot);
  g.addColorStop(1, m.deck.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.deck.lip;
  ctx.fillRect(x, y, w, 1.6);

  /* the crack, opening as it goes */
  ctx.save();
  ctx.strokeStyle = withAlpha(m.deck.deep, 0.95);
  ctx.lineWidth = 1 + shake * 2.4;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.22, y);
  ctx.lineTo(x + w * 0.34, y + h * 0.55);
  ctx.lineTo(x + w * 0.28, y + h);
  ctx.stroke();
  ctx.restore();

  /* rivets popping out of their seats */
  const n = Math.max(3, Math.round(w / 20));
  for (let i = 0; i < n; i += 1) {
    const rx = x + (w / n) * (i + 0.5);
    const eager = hash01(i * 3.9 + p.x * 0.01);
    const lift = shake * (1.5 + eager * 5.5);
    /* the empty seat left behind reads darker than anything else on the plate */
    ctx.fillStyle = withAlpha('#02050a', 0.65 + shake * 0.3);
    ctx.beginPath(); ctx.ellipse(rx, y + 3.6, 2.3, 1.7, 0, 0, TAU); ctx.fill();
    rivet(ctx, rx, y + 3.4 - lift, 2.1, m, fl);
    if (lift > 3) {
      ctx.strokeStyle = withAlpha(m.gold, 0.4);
      ctx.lineWidth = 0.8;
      ctx.beginPath(); ctx.moveTo(rx, y + 3.4 - lift + 2); ctx.lineTo(rx, y + 3.2); ctx.stroke();
    }
  }

  /* snapped chain stubs at the corners — this plate used to be held */
  chain(ctx, x + 5, y + h, x + 3, y + h + 12 + shake * 6, withAlpha(m.iron.foot, 0.7), 0, 3, 2.2);
  chain(ctx, x + w - 5, y + h, x + w - 3, y + h + 10 + shake * 7, withAlpha(m.iron.foot, 0.7), 0, 3, 2.2);

  crust(ctx, x, y, w, h, m.patina, x + 3, 0.6);
  if (shake > 0) {
    ctx.save();
    ctx.globalAlpha = shake * 0.75;
    ctx.strokeStyle = withAlpha(m.spark, 0.95);
    ctx.lineWidth = 1.3;
    ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);
    ctx.restore();
  }
  sheen(ctx, x + 3, y + 0.9, w - 6, withAlpha(pal.glow, 0.5), x * 0.06, 0.36, 1.1);
}

/* ------------------------------------------------------------------ *
 * MOVER — a counterweight on a chain, or a cog tooth coming round.
 * ------------------------------------------------------------------ */

export function paintMover(ctx, p, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const { x, y, w } = p;
  const h = p.h ?? 16;
  const fl = lightning(env.time);
  const cx = x + w * 0.5;

  if (p.angle != null) {
    /* a tooth of a great wheel turning behind the play layer; you ride the
     * flat of the tooth as it comes round */
    const r = Math.max(90, w * 1.8);
    cog(ctx, cx, y + h + r * 0.92, r, p.angle, m, {
      body: withAlpha(mixHex(m.bronze.deep, pal.shadow, 0.5), 0.9),
      tooth: withAlpha(mixHex(m.bronze.foot, pal.shadow, 0.34), 0.94),
      edgeAlpha: 0.22,
    });
  } else {
    /* the hoist chain, and the guide rail it runs in */
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.fillStyle = mixHex(m.iron.deep, pal.shadow, 0.4);
    ctx.fillRect(cx - 3, y - 420, 6, 420);
    ctx.restore();
    chain(ctx, cx, y - 420, cx, y - 4, withAlpha(m.iron.face, 0.85), 0, 0, 3.6);
  }

  /* the pallet itself */
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, m.bronze.top);
  g.addColorStop(0.2, m.bronze.face);
  g.addColorStop(1, m.bronze.deep);
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = m.bronze.lip;
  ctx.fillRect(x, y, w, 1.8);

  /* diamond tread on the deck of it, so it does not read as a bar of soap */
  ctx.save();
  ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  ctx.strokeStyle = withAlpha(m.bronze.deep, 0.55);
  ctx.lineWidth = 1;
  for (let d = -h; d < w + h; d += 9) {
    ctx.beginPath(); ctx.moveTo(x + d, y + h); ctx.lineTo(x + d + h, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + d, y); ctx.lineTo(x + d + h, y + h); ctx.stroke();
  }
  ctx.restore();

  /* kick rims at both ends and the lifting eyes */
  for (const ex of [x + 4, x + w - 4]) {
    ctx.fillStyle = m.bronze.face;
    ctx.fillRect(ex - 3, y - 5, 6, h + 5);
    ctx.fillStyle = withAlpha(m.bronze.lip, 0.34 + fl * 0.4);
    ctx.fillRect(ex - 3, y - 5, 6, 1);
    rivet(ctx, ex, y + h * 0.6, 1.9, m, fl);
  }

  if (p.angle == null) {
    /* the lead counterweight slung under it — the reason it moves at all */
    chain(ctx, cx - 10, y + h, cx - 10, y + h + 22, withAlpha(m.iron.foot, 0.8), 0, 4, 2.4);
    chain(ctx, cx + 10, y + h, cx + 10, y + h + 22, withAlpha(m.iron.foot, 0.8), 0, 4, 2.4);
    const wy = y + h + 22;
    const wg = ctx.createLinearGradient(0, wy, 0, wy + 26);
    wg.addColorStop(0, m.iron.face);
    wg.addColorStop(1, mixHex(m.iron.deep, pal.shadow, 0.5));
    ctx.fillStyle = wg;
    ctx.fillRect(cx - 17, wy, 34, 26);
    ctx.fillStyle = withAlpha(m.iron.lip, 0.3);
    ctx.fillRect(cx - 17, wy, 34, 1.2);
  }
  crust(ctx, x, y, w, h, m.patina, x + 6, 0.5);
  sheen(ctx, x + 5, y + 1, w - 10, withAlpha(pal.glow, 0.6), x * 0.04, 0.42, 1.2);
}

/* ------------------------------------------------------------------ *
 * PROPS
 * ------------------------------------------------------------------ */

/* The bell shape, shared by the hanging bells, the moulds and the shrine.
 *
 * What makes a bell a bell and not a lampshade is that the profile is NOT a
 * cone: the shoulder swells hard and early, the waist then runs almost
 * straight (tucking in a hair), and all the width arrives at the very bottom
 * in the sound bow. Straighten any one of those three and you have a bucket. */
function bellPath(ctx, wdt, hgt) {
  const w = wdt; const h = hgt;
  ctx.beginPath();
  ctx.moveTo(-w * 0.20, 0);
  ctx.bezierCurveTo(-w * 0.31, h * 0.06, -w * 0.35, h * 0.20, -w * 0.345, h * 0.42);
  ctx.bezierCurveTo(-w * 0.335, h * 0.58, -w * 0.35, h * 0.70, -w * 0.39, h * 0.82);
  ctx.bezierCurveTo(-w * 0.44, h * 0.90, -w * 0.50, h * 0.955, -w * 0.50, h);
  ctx.lineTo(w * 0.50, h);
  ctx.bezierCurveTo(w * 0.50, h * 0.955, w * 0.44, h * 0.90, w * 0.39, h * 0.82);
  ctx.bezierCurveTo(w * 0.35, h * 0.70, w * 0.335, h * 0.58, w * 0.345, h * 0.42);
  ctx.bezierCurveTo(w * 0.35, h * 0.20, w * 0.31, h * 0.06, w * 0.20, 0);
  ctx.closePath();
}

/* Half-width of that profile at height u, so mouldings can be cut to the
 * surface they sit on instead of running past the silhouette. */
function bellHalf(u) {
  const k = [[0, 0.20], [0.20, 0.345], [0.55, 0.335], [0.82, 0.39], [1, 0.50]];
  for (let i = 1; i < k.length; i += 1) {
    if (u <= k[i][0]) {
      const t = (u - k[i - 1][0]) / (k[i][0] - k[i - 1][0]);
      return lerp(k[i - 1][1], k[i][1], t);
    }
  }
  return 0.5;
}

function paintBell(ctx, prop, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  const fl = lightning(t);
  const hgt = prop.h ?? 92;
  const wdt = hgt * 0.82;
  const { x, y } = prop;
  /* very slight — a bell this heavy does not swing, it breathes */
  const swing = Math.sin(t * 0.42 + hash01(x) * 6.3) * 0.026;

  /* the chain it hangs from, and the headstock */
  chain(ctx, x, y - (prop.drop ?? 220), x, y - 8, withAlpha(m.iron.foot, 0.7), 0, 0, 3.2);

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(swing);

  ctx.fillStyle = m.timber.face;
  ctx.fillRect(-wdt * 0.34, -11, wdt * 0.68, 11);
  ctx.fillStyle = withAlpha(m.timber.top, 0.4);
  ctx.fillRect(-wdt * 0.34, -11, wdt * 0.68, 1.4);
  ctx.fillStyle = m.bronze.foot;
  ctx.fillRect(-wdt * 0.30, -11, 5, 12);
  ctx.fillRect(wdt * 0.30 - 5, -11, 5, 12);
  /* the canons — the loops the bell actually hangs by */
  ctx.strokeStyle = m.bronze.face;
  ctx.lineWidth = 3.4;
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(s * wdt * 0.12, 0, 5.4, Math.PI, 0);
    ctx.stroke();
  }

  /* The body sits low in value like everything else in the play layer; the
   * only gold on it is the contour that turns into the light. */
  const g = ctx.createLinearGradient(-wdt * 0.5, 0, wdt * 0.5, 0);
  g.addColorStop(0, mixHex(m.bronze.foot, m.gold, 0.22));
  g.addColorStop(0.14, m.bronze.foot);
  g.addColorStop(0.55, mixHex(m.bronze.deep, pal.shadow, 0.18));
  g.addColorStop(1, mixHex(m.bronze.deep, pal.shadow, 0.55));
  bellPath(ctx, wdt, hgt);
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = withAlpha(m.bronze.deep, 0.8);
  ctx.lineWidth = 1.2;
  ctx.stroke();
  /* the lit contour, down the left side only */
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(-wdt * 0.20, 0);
  ctx.bezierCurveTo(-wdt * 0.31, hgt * 0.06, -wdt * 0.35, hgt * 0.20, -wdt * 0.345, hgt * 0.42);
  ctx.bezierCurveTo(-wdt * 0.335, hgt * 0.58, -wdt * 0.35, hgt * 0.70, -wdt * 0.39, hgt * 0.82);
  ctx.bezierCurveTo(-wdt * 0.44, hgt * 0.90, -wdt * 0.50, hgt * 0.955, -wdt * 0.50, hgt);
  ctx.strokeStyle = withAlpha(m.gold, 0.40 + fl * 0.5);
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  bellPath(ctx, wdt, hgt);
  ctx.clip();

  /* mouldings — cut to the profile's own width at each height, so they wrap
   * the bell instead of running off the edges like barrel hoops */
  for (const u of [0.30, 0.62, 0.88]) {
    const by = hgt * u;
    const bw = bellHalf(u) * wdt;
    ctx.strokeStyle = withAlpha(m.bronze.deep, 0.75);
    ctx.lineWidth = 2.6;
    ctx.beginPath(); ctx.ellipse(0, by, bw, bw * 0.16, 0, 0, Math.PI); ctx.stroke();
    ctx.strokeStyle = withAlpha(m.gold, 0.24 + fl * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(0, by - 1.8, bw, bw * 0.16, 0, Math.PI * 1.0, Math.PI * 1.55); ctx.stroke();
  }

  /* the inscription band: reads as lettering without pretending to be legible */
  ctx.save();
  ctx.globalAlpha = 0.34;
  ctx.strokeStyle = m.bronze.deep;
  ctx.lineWidth = 1.1;
  for (let i = 0; i < 14; i += 1) {
    const u = (i + 0.5) / 14;
    const gx = lerp(-wdt * 0.30, wdt * 0.30, u);
    const gy = hgt * 0.40 + Math.abs(gx) * 0.05;
    ctx.beginPath();
    ctx.moveTo(gx, gy - 3);
    ctx.lineTo(gx + (hash01(i * 2.2 + x) - 0.5) * 2.4, gy + 3);
    ctx.stroke();
  }
  ctx.restore();

  /* verdigris running down out of the mouldings */
  crust(ctx, -wdt * 0.5, hgt * 0.28, wdt, hgt * 0.6, m.patina, x + 3, 1.1);
  ctx.restore();

  /* the mouth, and the clapper hanging in it a half-beat behind the swing */
  ctx.fillStyle = 'rgba(2,4,9,.92)';
  ctx.beginPath(); ctx.ellipse(0, hgt, wdt * 0.50, wdt * 0.075, 0, 0, TAU); ctx.fill();
  ctx.strokeStyle = withAlpha(m.gold, 0.34 + fl * 0.46);
  ctx.lineWidth = 1.6;
  ctx.beginPath(); ctx.ellipse(0, hgt, wdt * 0.50, wdt * 0.075, 0, Math.PI * 1.02, Math.PI * 1.86); ctx.stroke();

  /* The clapper swings a half-beat behind the bell, and you only ever see it
   * through the mouth — the body is solid bronze, so a rod drawn over the
   * whole height reads as a seam painted down the front. */
  const lag = Math.sin(t * 0.42 + hash01(x) * 6.3 - 0.7) * 0.07;
  ctx.save();
  ctx.beginPath();
  ctx.rect(-wdt * 0.5, hgt * 0.855, wdt, hgt * 0.2);
  ctx.clip();
  ctx.rotate(lag);
  ctx.strokeStyle = withAlpha(m.iron.face, 0.9);
  ctx.lineWidth = 2.4;
  ctx.beginPath(); ctx.moveTo(0, hgt * 0.5); ctx.lineTo(0, hgt * 0.9); ctx.stroke();
  ctx.fillStyle = m.iron.face;
  ctx.beginPath(); ctx.arc(0, hgt * 0.93, 5.2, 0, TAU); ctx.fill();
  ctx.fillStyle = withAlpha(m.gold, 0.34);
  ctx.beginPath(); ctx.arc(-1.7, hgt * 0.915, 2, 0, TAU); ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function paintProp(ctx, prop, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  const fl = lightning(t);

  switch (prop.kind) {
    case 'lantern': {
      /* a caged bronze lamp — the glow is drawn first and the bars over it, so
       * you read the cage as being between you and the flame */
      const { x, y } = prop;
      const hgt = prop.h ?? 80;
      ctx.fillStyle = m.bronze.foot;
      ctx.fillRect(x - 3, y - hgt, 6, hgt);
      ctx.fillStyle = withAlpha(m.bronze.lip, 0.28 + fl * 0.34);
      ctx.fillRect(x - 3, y - hgt, 1.6, hgt);
      poly(ctx, [[x - 9, y], [x + 9, y], [x + 6, y - 7], [x - 6, y - 7]], m.bronze.foot,
        withAlpha(m.bronze.deep, 0.8), 1);
      for (let i = 0; i < 3; i += 1) rivet(ctx, x - 5 + i * 5, y - 3, 1.6, m, fl);

      const lx = x + 13;
      const ly = y - hgt + 12;
      ctx.strokeStyle = m.bronze.face;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(x, y - hgt + 4);
      ctx.quadraticCurveTo(x + 13, y - hgt - 2, lx, ly);
      ctx.stroke();

      const flick = 0.85 + Math.sin(t * 7.7 + prop.x) * 0.10 + Math.sin(t * 2.3 + prop.x * 0.3) * 0.05;
      glowDot(ctx, lx, ly + 11, 44 * flick, m.lamp, 0.26);
      glowDot(ctx, lx, ly + 11, 13, '#fff2c0', 0.6);
      /* the cage */
      poly(ctx, [[lx - 7, ly + 3], [lx + 7, ly + 3], [lx + 8.5, ly + 19], [lx - 8.5, ly + 19]],
        withAlpha('#ffe4a2', 0.34 * flick), withAlpha(m.bronze.lip, 0.7), 1.2);
      ctx.strokeStyle = withAlpha(m.bronze.face, 0.95);
      ctx.lineWidth = 1.3;
      for (let i = 0; i < 4; i += 1) {
        const bx = lx - 7 + (i / 3) * 14;
        ctx.beginPath(); ctx.moveTo(bx, ly + 3); ctx.lineTo(bx + (i - 1.5) * 0.9, ly + 19); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(lx - 7.6, ly + 10.5); ctx.lineTo(lx + 7.6, ly + 10.5); ctx.stroke();
      /* the cap */
      poly(ctx, [[lx - 9, ly + 3], [lx + 9, ly + 3], [lx + 4, ly - 5], [lx - 4, ly - 5]],
        m.bronze.face, withAlpha(m.bronze.lip, 0.5), 1);
      lightPool(ctx, lx, prop.groundY ?? y, 100, m.lamp, 0.32 * flick);
      break;
    }

    case 'bell': paintBell(ctx, prop, env); break;

    case 'greatbell': {
      /* The colossal bell hung behind the play layer. Drawn nearly black with
       * only the contour that turns into the light picked out: the entire job
       * of this thing is SCALE, and a bell you can read the detail of is a
       * bell the eye sizes as small.
       *
       * It is BAKED. At r=250 this is 500x590 of gradient and strokes; drawn
       * live it cost more of the frame than the whole play layer did. Only the
       * sway is applied per frame. */
      const { x, y } = prop;
      const r = prop.r ?? 180;
      const wdt = r * 2;
      const hgt = r * 2.35;
      const sway = Math.sin(t * 0.23 + hash01(x) * 6.3) * 0.012;
      /* The sprite is trimmed tight: a blit still pays for every transparent
       * pixel it covers, and this thing is already bigger than the screen. The
       * chains stay live because they are a handful of strokes and they would
       * have doubled the sprite's height. */
      const padX = Math.ceil(wdt * 0.53);
      const padTop = 44;
      chain(ctx, x - wdt * 0.22, y - 330, x - wdt * 0.22, y - 14, withAlpha(m.iron.deep, 0.5), 0, 0, 4.4);
      chain(ctx, x + wdt * 0.22, y - 330, x + wdt * 0.22, y - 14, withAlpha(m.iron.deep, 0.5), 0, 0, 4.4);
      const baked = bakedSprite(
        `greatbell|${Math.round(r)}|${pal.shadow}|${pal.glow}`,
        padX * 2, padTop + hgt + 30, padX, padTop,
        (g) => {
          glowDot(g, 0, hgt * 0.44, hgt * 0.40, pal.shadow, 0.62);
          g.fillStyle = mixHex(m.timber.deep, pal.shadow, 0.42);
          g.fillRect(-wdt * 0.30, -18, wdt * 0.60, 18);
          g.fillStyle = withAlpha(m.gold, 0.16);
          g.fillRect(-wdt * 0.30, -18, wdt * 0.60, 2);

          bellPath(g, wdt, hgt);
          const bg = g.createLinearGradient(-wdt * 0.5, 0, wdt * 0.5, 0);
          bg.addColorStop(0, mixHex(m.bronze.deep, pal.shadow, 0.62));
          bg.addColorStop(0.5, mixHex(m.bronze.deep, pal.shadow, 0.84));
          bg.addColorStop(1, 'rgba(3,5,10,.98)');
          g.fillStyle = bg;
          g.fill();

          g.strokeStyle = withAlpha(m.gold, 0.22);
          g.lineWidth = Math.max(1.6, r * 0.016);
          for (const u of [0.34, 0.62, 0.88]) {
            const bw = bellHalf(u) * wdt;
            g.beginPath();
            g.ellipse(0, hgt * u, bw, bw * 0.15, 0, Math.PI * 1.04, Math.PI * 1.60);
            g.stroke();
          }
          g.lineWidth = Math.max(2, r * 0.02);
          g.beginPath();
          g.moveTo(-wdt * 0.20, 0);
          g.bezierCurveTo(-wdt * 0.31, hgt * 0.06, -wdt * 0.35, hgt * 0.20, -wdt * 0.345, hgt * 0.42);
          g.bezierCurveTo(-wdt * 0.335, hgt * 0.58, -wdt * 0.35, hgt * 0.70, -wdt * 0.39, hgt * 0.82);
          g.bezierCurveTo(-wdt * 0.44, hgt * 0.90, -wdt * 0.50, hgt * 0.955, -wdt * 0.50, hgt);
          g.stroke();
          g.fillStyle = 'rgba(1,3,7,.96)';
          g.beginPath(); g.ellipse(0, hgt, wdt * 0.5, wdt * 0.055, 0, 0, TAU); g.fill();
        },
      );
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(sway);
      if (!drawBaked(ctx, baked, 0, 0)) {
        bellPath(ctx, wdt, hgt);
        ctx.fillStyle = 'rgba(3,5,10,.9)';
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'gearwheel': {
      /* One great wheel, bedded in whatever is under it. (x, y) is where the
       * wheel STANDS, not its centre, so a wheel in the pit and a wheel on the
       * deck are placed by the same rule and neither one floats. */
      const { x, y } = prop;
      const r = prop.r ?? 90;
      const cy = y - r;
      ctx.save();
      const back = ctx.createRadialGradient(x, cy, 0, x, cy, r * 1.7);
      back.addColorStop(0, withAlpha(pal.shadow, 0.68));
      back.addColorStop(0.7, withAlpha(pal.shadow, 0.40));
      back.addColorStop(1, withAlpha(pal.shadow, 0));
      ctx.fillStyle = back;
      ctx.fillRect(x - r * 1.7, cy - r * 1.7, r * 3.4, r * 3.4);
      ctx.globalAlpha = 0.92;
      /* the sense of rotation is fixed by position, so the same wheel always
       * turns the same way however many times you walk past it */
      cog(ctx, x, cy, r, t * (26 / r) * (hash01(x * 0.11) > 0.5 ? 1 : -1), m, {
        body: withAlpha(mixHex(m.bronze.deep, pal.shadow, 0.54), 0.96),
        tooth: withAlpha(mixHex(m.bronze.foot, pal.shadow, 0.24), 0.96),
        edgeAlpha: 0.26,
      });
      /* the shaft it turns on, running down out of frame */
      ctx.fillStyle = mixHex(m.iron.deep, pal.shadow, 0.42);
      ctx.fillRect(x - r * 0.09, cy, r * 0.18, r * 1.05);
      ctx.fillStyle = withAlpha(m.gold, 0.10 + fl * 0.26);
      ctx.fillRect(x - r * 0.09, cy, r * 0.03, r * 1.05);
      ctx.restore();
      break;
    }

    case 'bellframe': {
      /* The frame a bell hangs in, standing on the deck: two strapped legs, a
       * head beam, braces into both corners, and the gudgeon bearings the
       * headstock turns in. Without the bearings it is a doorway. */
      const { x, y } = prop;
      const hgt = prop.h ?? 150;
      const wdt = prop.w ?? 130;
      const x0 = x - wdt * 0.5;
      const top = y - hgt;
      const leg = Math.max(10, wdt * 0.11);
      groundShadow(ctx, x, y, wdt * 0.8, 0.44);

      const post = (px) => {
        const pg = ctx.createLinearGradient(px, 0, px + leg, 0);
        pg.addColorStop(0, m.timber.face);
        pg.addColorStop(0.3, m.timber.foot);
        pg.addColorStop(1, mixHex(m.timber.deep, pal.shadow, 0.45));
        ctx.fillStyle = pg;
        ctx.fillRect(px, top, leg, hgt);
        ctx.fillStyle = withAlpha(m.timber.top, 0.26);
        ctx.fillRect(px, top, 1.6, hgt);
        for (let i = 0; i < 3; i += 1) {
          const sy = top + hgt * (0.22 + i * 0.28);
          ctx.fillStyle = mixHex(m.bronze.foot, pal.shadow, 0.22);
          ctx.fillRect(px - 2, sy, leg + 4, 7);
          ctx.fillStyle = withAlpha(m.bronze.lip, 0.24 + fl * 0.34);
          ctx.fillRect(px - 2, sy, leg + 4, 1);
          rivet(ctx, px + leg * 0.5, sy + 3.5, 1.7, m, fl);
        }
      };
      post(x0);
      post(x0 + wdt - leg);

      /* the head beam */
      const hg = ctx.createLinearGradient(0, top - 12, 0, top + 6);
      hg.addColorStop(0, m.timber.top);
      hg.addColorStop(0.3, m.timber.face);
      hg.addColorStop(1, mixHex(m.timber.deep, pal.shadow, 0.40));
      ctx.fillStyle = hg;
      ctx.fillRect(x0 - 8, top - 12, wdt + 16, 18);
      ctx.fillStyle = withAlpha(m.gold, 0.20 + fl * 0.40);
      ctx.fillRect(x0 - 8, top - 12, wdt + 16, 1.6);

      /* braces into both corners — a frame without them falls over */
      ctx.save();
      ctx.strokeStyle = mixHex(m.timber.foot, pal.shadow, 0.30);
      ctx.lineWidth = Math.max(6, wdt * 0.055);
      ctx.lineCap = 'butt';
      ctx.beginPath();
      ctx.moveTo(x0 + leg, top + hgt * 0.34); ctx.lineTo(x0 + wdt * 0.42, top + 6);
      ctx.moveTo(x0 + wdt - leg, top + hgt * 0.34); ctx.lineTo(x0 + wdt * 0.58, top + 6);
      ctx.stroke();
      ctx.restore();

      /* the bearings, and the gold catch on the upper-left of each */
      for (const bx of [x0 + leg * 0.5, x0 + wdt - leg * 0.5]) {
        ctx.fillStyle = m.bronze.foot;
        ctx.beginPath(); ctx.arc(bx, top + 22, 9, 0, TAU); ctx.fill();
        ctx.fillStyle = withAlpha(m.bronze.deep, 0.95);
        ctx.beginPath(); ctx.arc(bx, top + 22, 4.2, 0, TAU); ctx.fill();
        ctx.strokeStyle = withAlpha(m.gold, 0.30 + fl * 0.40);
        ctx.lineWidth = 1.3;
        ctx.beginPath(); ctx.arc(bx, top + 22, 9, Math.PI * 1.04, Math.PI * 1.70); ctx.stroke();
      }
      crust(ctx, x0, top, wdt, hgt, m.patina, x + 5, 0.6);
      break;
    }

    case 'gearwall': {
      /* a wall of meshing cogs turning behind everything. Centres are placed
       * exactly r1+r2 apart so the teeth genuinely mesh — a wall of cogs that
       * do not touch is the tell that kills the whole illusion. */
      const { x, y } = prop;
      const w = prop.w ?? 340;
      const hgt = prop.h ?? 260;
      const rng = makeRng(((x * 2246822519) ^ 0x77) | 1);
      ctx.save();
      /* The murk the works sit in is a soft pool, not a box. A rectangle of
       * darkness behind the play layer reads as a rectangle, every time. */
      const back = ctx.createRadialGradient(
        x + w * 0.5, y - hgt * 0.5, 0,
        x + w * 0.5, y - hgt * 0.5, Math.max(w, hgt) * 0.62,
      );
      back.addColorStop(0, withAlpha(pal.shadow, 0.88));
      back.addColorStop(0.62, withAlpha(pal.shadow, 0.64));
      back.addColorStop(1, withAlpha(pal.shadow, 0));
      ctx.fillStyle = back;
      ctx.fillRect(x - w * 0.3, y - hgt * 1.3, w * 1.6, hgt * 1.6);
      ctx.globalAlpha = 0.88;

      const body = withAlpha(mixHex(m.bronze.deep, pal.shadow, 0.5), 0.95);
      const tooth = withAlpha(mixHex(m.bronze.foot, pal.shadow, 0.06), 0.95);
      let cx = x + 26;
      let cy = y - hgt * 0.58;
      let r = 30 + rng() * 26;
      let dir = 1;
      for (let i = 0; i < 8 && cx - r < x + w + 30; i += 1) {
        cog(ctx, cx, cy, r, t * dir * (24 / r) + i, m, { body, tooth, edgeAlpha: 0.24 });
        const nr = 20 + rng() * 38;
        const d = r + nr;
        const band = y - hgt * (0.26 + rng() * 0.5);
        const ang = Math.asin(clamp((band - cy) / d, -0.7, 0.7));
        cx += Math.cos(ang) * d;
        cy += Math.sin(ang) * d;
        r = nr;
        dir = -dir;
      }
      /* a little light leaking from behind the works */
      ctx.globalCompositeOperation = 'screen';
      glowDot(ctx, x + w * 0.5, y - hgt * 0.5, hgt * 0.7, pal.glow, 0.06);
      ctx.restore();
      break;
    }

    case 'astrolabe': {
      /* the one genuinely warm bright thing in the chapter */
      const { x, y } = prop;
      const r = prop.r ?? 34;
      const drop = prop.h ?? 150;
      const sway = Math.sin(t * 0.5 + hash01(x) * 5) * 0.028;
      /* everything swings about the point it hangs from, chain included */
      ctx.save();
      ctx.translate(x, y - drop);
      ctx.rotate(sway);
      chain(ctx, 0, 0, 0, drop - r - 8, withAlpha(m.iron.foot, 0.6), 0, 0, 2.6);
      ctx.translate(0, drop);
      glowDot(ctx, 0, 0, r * 2.4, m.gold, 0.16 + fl * 0.1);
      /* suspension eye */
      ctx.strokeStyle = m.gold;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, -r - 4, 4, 0, TAU); ctx.stroke();
      /* outer ring with its graduations */
      ctx.strokeStyle = withAlpha(m.gold, 0.9);
      ctx.lineWidth = 3.2;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1;
      ctx.strokeStyle = withAlpha(m.gold, 0.55);
      for (let i = 0; i < 48; i += 1) {
        const a = (i / 48) * TAU;
        const k = i % 4 === 0 ? 6 : 3;
        line(ctx, Math.cos(a) * (r - 2), Math.sin(a) * (r - 2),
          Math.cos(a) * (r - 2 - k), Math.sin(a) * (r - 2 - k), withAlpha(m.gold, 0.6), 1);
      }
      /* the inner ring, turning */
      ctx.save();
      ctx.rotate(t * 0.19);
      ctx.strokeStyle = withAlpha(m.gold, 0.8);
      ctx.lineWidth = 2.2;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.64, r * 0.64, 0, 0, TAU); ctx.stroke();
      ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.64, r * 0.2, 0, 0, TAU); ctx.stroke();
      ctx.restore();
      /* the alidade */
      ctx.save();
      ctx.rotate(-t * 0.11 + 0.6);
      ctx.fillStyle = withAlpha(m.gold, 0.95);
      ctx.fillRect(-r * 0.9, -1.6, r * 1.8, 3.2);
      ctx.beginPath(); ctx.arc(0, 0, 4.6, 0, TAU); ctx.fill();
      ctx.restore();
      ctx.restore();
      break;
    }

    case 'anvil': {
      const { x, y } = prop;
      groundShadow(ctx, x, y, 30, 0.44);
      /* the stump */
      ctx.fillStyle = m.timber.foot;
      ctx.fillRect(x - 15, y - 26, 30, 26);
      ctx.fillStyle = withAlpha(m.timber.deep, 0.6);
      ctx.fillRect(x + 6, y - 26, 9, 26);
      ctx.fillStyle = m.iron.foot;
      ctx.fillRect(x - 16, y - 22, 32, 3);
      ctx.fillRect(x - 16, y - 8, 32, 3);
      /* the anvil: horn left, heel right, waisted */
      const ay = y - 26;
      poly(ctx, [
        [x - 24, ay - 8], [x - 8, ay - 11], [x + 20, ay - 11], [x + 20, ay - 5],
        [x + 9, ay - 4], [x + 7, ay + 1], [x + 11, ay + 5], [x - 11, ay + 5],
        [x - 7, ay + 1], [x - 9, ay - 4], [x - 12, ay - 5],
      ], (() => {
        const g = ctx.createLinearGradient(0, ay - 11, 0, ay + 5);
        g.addColorStop(0, m.iron.face);
        g.addColorStop(1, mixHex(m.iron.deep, pal.shadow, 0.4));
        return g;
      })(), withAlpha(m.iron.deep, 0.8), 1.1);
      /* the face is the one polished thing on it */
      ctx.fillStyle = withAlpha(m.gold, 0.34 + fl * 0.5);
      ctx.fillRect(x - 8, ay - 11, 28, 1.6);
      break;
    }

    case 'sundisc': {
      /* the checkpoint is a meridian dial. Both hands stand at midnight,
       * because that is what is wrong with this city. Lit and unlit differ by
       * brightness and by whether the ring turns — never by hue alone. */
      const { x, y } = prop;
      const on = prop.lit ? 1 : 0.30;
      const r = 16;
      const cy = y - 40;
      ctx.fillStyle = m.bronze.foot;
      ctx.fillRect(x - 3.5, cy, 7, 40);
      poly(ctx, [[x - 10, y], [x + 10, y], [x + 7, y - 6], [x - 7, y - 6]], m.bronze.foot, null);
      groundShadow(ctx, x, y, 20, 0.4);

      glowDot(ctx, x, cy, 58, prop.lit ? m.gold : pal.glow, 0.22 * on);
      ctx.save();
      ctx.translate(x, cy);
      /* the outer ring creeps round once it is lit */
      ctx.save();
      ctx.rotate(prop.lit ? t * 0.16 : 0);
      ctx.strokeStyle = withAlpha(prop.lit ? m.gold : pal.glow, 0.85 * on);
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(0, 0, r + 6, 0, TAU); ctx.stroke();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * TAU;
        const len = i % 3 === 0 ? 7 : 4;
        line(ctx, Math.cos(a) * (r + 5), Math.sin(a) * (r + 5),
          Math.cos(a) * (r + 5 - len), Math.sin(a) * (r + 5 - len),
          withAlpha(prop.lit ? m.gold : pal.glow, 0.9 * on), 1.8);
      }
      ctx.restore();
      ctx.fillStyle = withAlpha(prop.lit ? '#fff1c6' : pal.glow, 0.24 * on);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = withAlpha(prop.lit ? m.gold : pal.glow, 0.9 * on);
      ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      /* both hands, straight up */
      ctx.lineCap = 'round';
      line(ctx, 0, 0, 0, -r * 0.86, withAlpha(prop.lit ? '#fff6d6' : pal.glow, 0.95 * on), 2.2);
      line(ctx, 0, 0, 0, -r * 0.58, withAlpha(prop.lit ? '#fff6d6' : pal.glow, 0.95 * on), 3);
      ctx.restore();
      break;
    }

    case 'shrine': {
      /* a bell-founder's shrine: a bronze niche with a votive bell in it */
      const { x, y } = prop;
      const hgt = prop.h ?? 100;
      groundShadow(ctx, x, y, 38, 0.46);
      poly(ctx, [[x - 26, y], [x - 22, y - hgt * 0.72], [x, y - hgt], [x + 22, y - hgt * 0.72], [x + 26, y]],
        (() => {
          const g = ctx.createLinearGradient(0, y - hgt, 0, y);
          g.addColorStop(0, m.bronze.top);
          g.addColorStop(0.18, m.bronze.face);
          g.addColorStop(1, mixHex(m.bronze.deep, pal.shadow, 0.4));
          return g;
        })(), withAlpha(m.bronze.lip, 0.4), 1.4);
      for (let i = 0; i < 4; i += 1) rivet(ctx, x - 18 + i * 12, y - hgt * 0.70, 1.8, m, fl);
      arch(ctx, x - 13, y - hgt * 0.66, 26, hgt * 0.56, 'rgba(2,5,10,.9)', withAlpha(m.bronze.lip, 0.34), 1.2);
      /* the votive bell, swinging on nothing */
      ctx.save();
      ctx.translate(x, y - hgt * 0.60);
      ctx.rotate(Math.sin(t * 1.1 + x) * 0.05);
      bellPath(ctx, 17, 21);
      ctx.fillStyle = m.bronze.foot;
      ctx.fill();
      ctx.strokeStyle = withAlpha(m.gold, 0.4 + fl * 0.4);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
      const flick = 0.8 + Math.sin(t * 6.2 + x) * 0.15;
      glowDot(ctx, x, y - hgt * 0.24, 26, m.lamp, 0.44 * flick);
      crust(ctx, x - 26, y - hgt, 52, hgt, m.patina, x, 0.7);
      break;
    }

    case 'fence': {
      /* a bronze balustrade on the deck edge, with a kick plate */
      const { x, y } = prop;
      const w = prop.w ?? 120;
      ctx.fillStyle = mixHex(m.bronze.foot, pal.shadow, 0.3);
      ctx.fillRect(x, y - 8, w, 8);
      ctx.fillStyle = withAlpha(m.bronze.lip, 0.22 + fl * 0.28);
      ctx.fillRect(x, y - 8, w, 1);
      railing(ctx, x, y - 30, w, 22, m.bronze.foot, withAlpha(m.gold, 0.55 + fl * 0.4), x, 23);
      for (let rx = x + 6; rx < x + w; rx += 23) rivet(ctx, rx, y - 4, 1.7, m, fl);
      break;
    }

    default: break;
  }
}

/* ------------------------------------------------------------------ *
 * BREAKABLES
 * ------------------------------------------------------------------ */

/* A brass bell-mould — the cope of a casting, hooped and waiting to be filled. */
function paintMould(ctx, b, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const fl = lightning(env.time);
  const cx = b.x + b.w * 0.5;
  const base = b.y + b.h;
  const hgt = b.h;
  const wdt = b.w * 1.6;

  groundShadow(ctx, cx, base, wdt * 0.5, 0.4);
  ctx.save();
  ctx.translate(cx, base - hgt);
  bellPath(ctx, wdt, hgt);
  const g = ctx.createLinearGradient(-wdt * 0.5, 0, wdt * 0.5, 0);
  g.addColorStop(0, mixHex(m.bronze.face, m.gold, 0.14));
  g.addColorStop(0.4, m.bronze.foot);
  g.addColorStop(1, mixHex(m.bronze.deep, pal.shadow, 0.3));
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = withAlpha(m.bronze.deep, 0.85);
  ctx.lineWidth = 1.1;
  ctx.stroke();
  /* binding hoops and the seam where the two halves come apart */
  ctx.strokeStyle = withAlpha(m.iron.face, 0.9);
  ctx.lineWidth = 2;
  for (const u of [0.34, 0.68]) {
    const bw = bellHalf(u) * wdt;
    ctx.beginPath(); ctx.moveTo(-bw, hgt * u); ctx.lineTo(bw, hgt * u); ctx.stroke();
  }
  ctx.strokeStyle = withAlpha(m.bronze.deep, 0.8);
  ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, 1); ctx.lineTo(0, hgt - 1); ctx.stroke();
  /* the pouring cup */
  ctx.fillStyle = m.bronze.face;
  ctx.fillRect(-wdt * 0.13, -4, wdt * 0.26, 5);
  ctx.fillStyle = withAlpha(m.gold, 0.4 + fl * 0.4);
  ctx.fillRect(-wdt * 0.13, -4, wdt * 0.26, 1.2);
  ctx.restore();
  crust(ctx, cx - wdt * 0.5, base - hgt, wdt, hgt, m.patina, b.x, 0.9);
}

export function paintBreakable(ctx, b, env) {
  const m = M(env.palette);
  const fl = lightning(env.time);

  if (b.kind === 'falsewall') {
    /* a service hatch someone bricked shut. The bronze frame stays; the slate
     * infill is the part the whip takes out. */
    const { x, y, w, h } = b;
    slab(ctx, x, y, w, h, m.slate, LIGHT);
    courses(ctx, x, y, w, h, withAlpha(m.slate.deep, 0.85), 16, x, 0.42);
    ctx.save();
    ctx.strokeStyle = m.bronze.foot;
    ctx.lineWidth = 5;
    ctx.strokeRect(x + 2.5, y + 2.5, w - 5, h - 5);
    ctx.strokeStyle = withAlpha(m.gold, 0.26 + fl * 0.4);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + w - 1, y + 1);
    ctx.moveTo(x + 1, y + 1); ctx.lineTo(x + 1, y + h - 1);
    ctx.stroke();
    for (let i = 0; i < 3; i += 1) {
      rivet(ctx, x + 5, y + 8 + i * ((h - 16) / 2), 2, m, fl);
      rivet(ctx, x + w - 5, y + 8 + i * ((h - 16) / 2), 2, m, fl);
    }
    /* two hinges and a ring pull, so it reads as a door and not a patch */
    ctx.fillStyle = m.bronze.face;
    ctx.fillRect(x + 3, y + h * 0.22, 11, 6);
    ctx.fillRect(x + 3, y + h * 0.68, 11, 6);
    ctx.strokeStyle = m.iron.face;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(x + w - 12, y + h * 0.5, 5.4, 0, TAU); ctx.stroke();
    crust(ctx, x, y, w, h, m.patina, x + 4, 0.8);
    ctx.restore();
    if (b.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.fillStyle = withAlpha(m.spark, b.flash * 0.5);
      ctx.fillRect(x, y, w, h);
      ctx.restore();
    }
  } else {
    paintMould(ctx, b, env);
    if (b.flash > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.globalAlpha = b.flash * 0.6;
      paintMould(ctx, b, env);
      ctx.restore();
    }
  }
}

/* ------------------------------------------------------------------ *
 * HAZARDS — the works below, and the open air.
 * ------------------------------------------------------------------ */

function paintGears(ctx, hz, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  const fl = lightning(t);

  /* The pit is a rectangle, and an unframed rectangle of dark reads as a hole
   * in the drawing rather than a hole in the floor. So the machine housing is
   * drawn around it: a lintel across the top and a jamb down each side. Now
   * the hard edges are architecture, which is what they were always meant to
   * be. */
  const jambW = 22;
  const lintelH = 16;
  const housing = (x, y, w, h, vertical) => {
    const g = vertical
      ? ctx.createLinearGradient(x, 0, x + w, 0)
      : ctx.createLinearGradient(0, y, 0, y + h);
    g.addColorStop(0, mixHex(m.bronze.foot, pal.shadow, 0.30));
    g.addColorStop(0.34, mixHex(m.bronze.face, pal.shadow, 0.16));
    g.addColorStop(1, mixHex(m.bronze.deep, pal.shadow, 0.55));
    ctx.fillStyle = g;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = withAlpha(m.gold, 0.13 + fl * 0.3);
    if (vertical) ctx.fillRect(x + w * 0.24, y, 1.6, h);
    else ctx.fillRect(x, y + 1.4, w, 1.4);
  };
  housing(hz.x - jambW, hz.y - lintelH, hz.w + jambW * 2, lintelH, false);
  housing(hz.x - jambW, hz.y, jambW, hz.h, true);
  housing(hz.x + hz.w, hz.y, jambW, hz.h, true);
  for (let ry = hz.y + 16; ry < hz.y + hz.h - 8; ry += 34) {
    rivet(ctx, hz.x - jambW * 0.5, ry, 1.8, m, fl);
    rivet(ctx, hz.x + hz.w + jambW * 0.5, ry, 1.8, m, fl);
  }
  for (let rx = hz.x - jambW + 10; rx < hz.x + hz.w + jambW - 6; rx += 40) {
    rivet(ctx, rx, hz.y - lintelH * 0.5, 1.7, m, fl);
  }

  ctx.save();
  ctx.beginPath(); ctx.rect(hz.x, hz.y, hz.w, hz.h); ctx.clip();

  /* oil and dark under the machinery */
  const g = ctx.createLinearGradient(0, hz.y, 0, hz.y + hz.h);
  g.addColorStop(0, withAlpha(pal.shadow, 0.55));
  g.addColorStop(0.5, 'rgba(3,5,9,.9)');
  g.addColorStop(1, 'rgba(1,2,5,.98)');
  ctx.fillStyle = g;
  ctx.fillRect(hz.x, hz.y, hz.w, hz.h);

  /* The wheels sit so their crown of teeth breaks the pit mouth: the thing you
   * have to read at a glance is a row of hard bright edges turning right where
   * you would land. Centres are spaced 1.78r so the teeth actually interleave. */
  const r = clamp(hz.h * 0.62, 44, 84);
  const cy = hz.y + r * 1.02;
  const spacing = r * 1.78;
  const n = Math.max(2, Math.ceil(hz.w / spacing) + 1);
  const crest = mixHex(m.bronze.face, pal.shadow, 0.10);
  for (let i = 0; i < n; i += 1) {
    const cx = hz.x + i * spacing + r * 0.3;
    cog(ctx, cx, cy, r, t * 0.5 * (i % 2 ? -1 : 1) + i * 0.4, m, {
      body: 'rgba(3,5,10,.98)',
      tooth: crest,
      spokes: false,
      edgeAlpha: 0.26,
    });
  }

  /* oil rising up the wheels, so they sink into the dark instead of sitting on
   * top of it like cut-outs */
  const oil = ctx.createLinearGradient(0, cy - r * 0.5, 0, hz.y + hz.h);
  oil.addColorStop(0, 'rgba(2,4,8,0)');
  oil.addColorStop(0.45, 'rgba(2,4,8,.72)');
  oil.addColorStop(1, 'rgba(1,2,5,.98)');
  ctx.fillStyle = oil;
  ctx.fillRect(hz.x, cy - r * 0.5, hz.w, hz.h);

  /* sparks where two wheels bite — on the centre line between them, which is
   * where the teeth actually engage */
  for (let i = 1; i < n; i += 1) {
    const mx = hz.x + i * spacing + r * 0.3 - spacing * 0.5;
    const beat = Math.abs(Math.sin(t * 3.1 + i * 2.3));
    if (beat < 0.9) continue;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    glowDot(ctx, mx, cy - r * 0.34, 24, m.spark, 0.44 * beat);
    for (let k = 0; k < 4; k += 1) {
      const a = -2.3 + hash01(k + i * 3.7) * 1.7;
      line(ctx, mx, cy - r * 0.34,
        mx + Math.cos(a) * 18, cy - r * 0.34 + Math.sin(a) * 14,
        withAlpha(m.spark, 0.85 * beat), 1.4);
    }
    ctx.restore();
  }

  /* grease at the lip, so the boundary of the safe deck is a hard line */
  ctx.fillStyle = 'rgba(2,4,8,.8)';
  ctx.fillRect(hz.x, hz.y, hz.w, 3);
  ctx.restore();
}

function paintGorge(ctx, hz, env) {
  const pal = env.palette;
  const t = env.time;
  const fl = lightning(t);
  ctx.save();
  ctx.beginPath(); ctx.rect(hz.x, hz.y, hz.w, hz.h); ctx.clip();

  const g = ctx.createLinearGradient(0, hz.y, 0, hz.y + Math.min(hz.h, 260));
  g.addColorStop(0, withAlpha(pal.mid, 0));
  g.addColorStop(0.3, withAlpha(pal.sky, 0.4));
  g.addColorStop(1, 'rgba(2,4,10,.9)');
  ctx.fillStyle = g;
  ctx.fillRect(hz.x, hz.y, hz.w, hz.h);

  /* cloud rolling through, slowly, at three depths */
  for (let i = 0; i < 4; i += 1) {
    const yy = hz.y + 24 + i * 34;
    const off = Math.sin(t * 0.16 + i * 1.9 + hz.x * 0.004) * 46;
    ctx.globalAlpha = 0.13 - i * 0.02 + fl * 0.16;
    ctx.fillStyle = i % 2 ? pal.mid : pal.far;
    ctx.beginPath();
    ctx.ellipse(hz.x + hz.w * 0.5 + off, yy, hz.w * 0.6, 20 + i * 8, 0, 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  /* the strike itself: a fork drawn from a seed fixed by the strike index, so
   * the same bolt is in the same place for as long as the flash lasts */
  if (fl > 0.05) {
    const rng = makeRng(((strikeSeed(t) * 2654435761) ^ (Math.floor(hz.x) * 97)) | 1);
    const x0 = hz.x + hz.w * (0.2 + rng() * 0.6);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = fl;
    const bg = ctx.createLinearGradient(0, hz.y, 0, hz.y + hz.h * 0.7);
    bg.addColorStop(0, withAlpha(pal.glow, 0.26));
    bg.addColorStop(1, withAlpha(pal.glow, 0));
    ctx.fillStyle = bg;
    ctx.fillRect(hz.x, hz.y, hz.w, hz.h * 0.7);

    /* Walk the trunk ONCE and keep the points. Both the halo pass and the core
     * pass have to trace the same bolt, and re-rolling the RNG per pass would
     * give you two different forks stacked on top of each other. */
    const pts = [[x0, hz.y]];
    for (let i = 1; i <= 8; i += 1) {
      const k = i / 8;
      pts.push([x0 + (rng() - 0.5) * 74 * (1 - k * 0.5), hz.y + hz.h * 0.72 * k]);
    }
    const branches = [];
    for (let i = 0; i < 2; i += 1) {
      const from = pts[2 + i * 2];
      branches.push([from, [from[0] + (rng() - 0.5) * 96, from[1] + 40 + rng() * 52]]);
    }

    ctx.strokeStyle = withAlpha('#eaf2ff', 0.95);
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    for (const pass of [3.6, 1.3]) {
      ctx.globalAlpha = fl * (pass > 2 ? 0.34 : 1);
      ctx.lineWidth = pass;
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i += 1) ctx.lineTo(pts[i][0], pts[i][1]);
      for (const [a, b] of branches) { ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); }
      ctx.stroke();
    }
    ctx.restore();
  }
  ctx.restore();
}

export function paintHazard(ctx, hz, env) {
  if (hz.kind === 'gears') paintGears(ctx, hz, env);
  else paintGorge(ctx, hz, env);
}

/* ------------------------------------------------------------------ *
 * FOREGROUND — passes IN FRONT of the player at parallax > 1.
 *
 * Near-black and slightly out of focus. This is the single most effective
 * trick for welding the play layer into the painting, and it is cheap: four
 * shapes per screen do more than any amount of detail on the platforms.
 * ------------------------------------------------------------------ */

export function paintFront(ctx, item, env) {
  const m = M(env.palette);
  const pal = env.palette;
  const t = env.time;
  const fl = lightning(t);

  switch (item.kind) {
    case 'mist': {
      /* storm cloud, lit from inside when the sky goes off */
      const { x, y } = item;
      const w = item.w ?? 520;
      ctx.save();
      ctx.globalAlpha = 0.52;
      for (let i = 0; i < 3; i += 1) {
        const off = Math.sin(t * 0.18 + i * 2.3 + x * 0.01) * 34;
        const g = ctx.createLinearGradient(0, y - 34 + i * 12, 0, y + 44);
        /* cloud this close to the lens is a dark mass with a lit top, not a
         * milky wash — a pale foreground fogs the play layer out of the shot */
        g.addColorStop(0, withAlpha(pal.glow, 0.03 + fl * 0.20));
        g.addColorStop(0.42, withAlpha(dim(pal.mid, 0.58), 0.50));
        g.addColorStop(1, withAlpha('#02040a', 0.76));
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.ellipse(x + w * 0.5 + off, y + i * 10, w * 0.56, 28 + i * 8, 0, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
      break;
    }

    case 'steam': {
      /* Steam venting up out of the works. It climbs and thins on a loop whose
       * phase is fixed by the vent's index, so it moves without ever being
       * random — and it stays dark-cored, because a pale foreground fogs the
       * play layer straight out of the shot. */
      const { x, y } = item;
      const w = item.w ?? 400;
      const vents = Math.max(2, Math.round(w / 150));
      ctx.save();
      ctx.globalAlpha = item.alpha ?? 0.46;
      for (let v = 0; v < vents; v += 1) {
        const vx = x + w * ((v + 0.5) / vents) + (hash01(v * 5.7 + x * 0.01) - 0.5) * 44;
        const period = 3.4 + hash01(v * 2.3) * 2.2;
        for (let i = 0; i < 3; i += 1) {
          /* three puffs walking the same climb a third of a period apart */
          const k = ((t / period) + i / 3 + hash01(v * 9.1 + x * 0.003)) % 1;
          const py = y - k * 158;
          const rad = 16 + k * 64;
          const fade = Math.sin(Math.PI * k);
          const g = ctx.createRadialGradient(vx, py, 0, vx, py, rad);
          g.addColorStop(0, withAlpha(pal.glow, (0.09 + fl * 0.16) * fade));
          g.addColorStop(0.55, withAlpha(dim(pal.mid, 0.44), 0.32 * fade));
          g.addColorStop(1, withAlpha('#03060c', 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.ellipse(vx + Math.sin(t * 0.6 + v * 2.1 + i) * 13 * k, py, rad, rad * 0.78, 0, 0, TAU);
          ctx.fill();
        }
      }
      ctx.restore();
      break;
    }

    case 'chain': {
      /* heavy chain passing the camera — big links, near black, a hair of
       * blur so it sits in front of the focal plane */
      const { x, y } = item;
      ctx.save();
      ctx.filter = 'blur(1.1px)';
      ctx.globalAlpha = item.alpha ?? 0.95;
      const sway = Math.sin(t * 0.5 + x * 0.01) * 5;
      chain(ctx, x, y, x + (item.dx ?? 26) + sway, y + (item.h ?? 340),
        dim(m.iron.deep, 0.72), item.sag ?? 24, 0, item.r ?? 6.4);
      ctx.restore();
      /* the lightning finds even this */
      if (fl > 0.05) {
        ctx.save();
        ctx.globalAlpha = fl * 0.4;
        chain(ctx, x - 1.6, y, x + (item.dx ?? 26) + sway - 1.6, y + (item.h ?? 340),
          withAlpha(m.gold, 0.5), item.sag ?? 24, 0, item.r ?? 6.4);
        ctx.restore();
      }
      break;
    }

    case 'bell': {
      /* an enormous bell rim entering frame. Nothing sells the scale of this
       * place like a piece of it that does not fit on the screen. */
      const { x, y } = item;
      const w = item.w ?? 620;
      const hgt = item.h ?? 460;
      ctx.save();
      ctx.filter = 'blur(1.5px)';
      ctx.globalAlpha = item.alpha ?? 0.96;
      ctx.translate(x + w * 0.5, y);
      bellPath(ctx, w, hgt);
      ctx.fillStyle = 'rgba(3,5,10,.97)';
      ctx.fill();
      /* two mouldings and the lit contour down its left side */
      ctx.strokeStyle = withAlpha(m.gold, 0.16 + fl * 0.5);
      ctx.lineWidth = 2.6;
      for (const u of [0.58, 0.86]) {
        const bw = bellHalf(u) * w;
        ctx.beginPath(); ctx.ellipse(0, hgt * u, bw, bw * 0.14, 0, Math.PI * 1.04, Math.PI * 1.62);
        ctx.stroke();
      }
      ctx.lineWidth = 3.2;
      ctx.beginPath();
      ctx.moveTo(-w * 0.20, 0);
      ctx.bezierCurveTo(-w * 0.31, hgt * 0.06, -w * 0.35, hgt * 0.20, -w * 0.345, hgt * 0.42);
      ctx.bezierCurveTo(-w * 0.335, hgt * 0.58, -w * 0.35, hgt * 0.70, -w * 0.39, hgt * 0.82);
      ctx.bezierCurveTo(-w * 0.44, hgt * 0.90, -w * 0.50, hgt * 0.955, -w * 0.50, hgt);
      ctx.stroke();
      /* the mouth */
      ctx.fillStyle = 'rgba(1,2,6,1)';
      ctx.beginPath(); ctx.ellipse(0, hgt, w * 0.5, w * 0.055, 0, 0, TAU); ctx.fill();
      ctx.restore();
      break;
    }

    case 'cable': {
      /* a tensioned bronze cable crossing the frame, with its whipping and a
       * couple of loose tails hanging off the served section */
      const { x, y } = item;
      const w = item.w ?? 520;
      const dy = item.dy ?? 120;
      /* a cable this heavy hangs; drawn taut it reads as a scratch on the lens */
      const droop = item.droop ?? w * 0.16;
      ctx.save();
      ctx.filter = 'blur(1.2px)';
      ctx.globalAlpha = item.alpha ?? 0.94;
      ctx.strokeStyle = 'rgba(3,6,11,.97)';
      ctx.lineCap = 'round';
      ctx.lineWidth = item.r ?? 9;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.quadraticCurveTo(x + w * 0.5, y + dy * 0.5 + droop, x + w, y + dy);
      ctx.stroke();
      /* the serving: tight turns of wire around the middle */
      ctx.lineWidth = 1.6;
      ctx.strokeStyle = withAlpha(m.gold, 0.10 + fl * 0.34);
      for (let i = 0; i < 14; i += 1) {
        const k = 0.36 + i * 0.021;
        const px = x + w * k;
        const py = y + dy * k + Math.sin(Math.PI * k) * droop;
        ctx.beginPath();
        ctx.moveTo(px, py - 6);
        ctx.lineTo(px + 4, py + 6);
        ctx.stroke();
      }
      ctx.strokeStyle = 'rgba(3,6,11,.95)';
      ctx.lineWidth = 2.4;
      for (let i = 0; i < 3; i += 1) {
        const k = 0.42 + i * 0.06;
        const px = x + w * k;
        const py = y + dy * k + Math.sin(Math.PI * k) * droop;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.quadraticCurveTo(px + 8, py + 26, px + (i - 1) * 14, py + 46 + i * 9);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    default: break;
  }
}

export const belfryPainter = {
  key: 'belfry',
  light: LIGHT,
  paintSolid, paintLedge, paintCrumble, paintMover,
  paintProp, paintBreakable, paintHazard, paintFront,
};
