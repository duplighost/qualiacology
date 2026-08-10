/* art/atlas.js — the painted sprite sheets.
 *
 * The art is a fixed inheritance: four hand-painted sheets, no room to add
 * frames. So poses that the sheets do not contain (a crouch, a downward dive)
 * are CONSTRUCTED here from the frames that exist, by slicing a frame into a
 * leg band and a torso band and compressing them independently. That reads as
 * a real crouch rather than a squashed decal, because the legs keep their
 * proportions and only the body sinks.
 *
 * Sheet geometry (measured, do not guess):
 *   sabine-atlas   1536x1024   4 cols x 384       rows y[0]=0/341, [1]=341/342, [2]=683/341
 *   enemies-a/b     887x1774   2 cols x 443.5     5 rows x 354.8
 *   abbess-atlas   1536x1024   4 cols x 384       2 rows x 512
 *
 * All art faces RIGHT natively; the caller flips with ctx.scale(facing, 1).
 * The draw origin is the character's FEET.
 */

import { clamp } from '../core.js';

const ASSET = (name) => new URL(`../../assets/${name}`, import.meta.url).href;

/* ---- sheet loading -------------------------------------------------- */

const SHEETS = {
  sabine: 'sabine-atlas.webp',
  enemiesA: 'enemies-a.webp',
  enemiesB: 'enemies-b.webp',
  abbess: 'abbess-atlas.webp',
  titleArt: 'title-art.webp',
};

const images = Object.create(null);

export function preloadSprites() {
  if (typeof Image === 'undefined') return Promise.resolve(false);
  const jobs = Object.entries(SHEETS).map(([key, file]) => new Promise((res) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => { images[key] = img; res(true); };
    img.onerror = () => res(false);
    img.src = ASSET(file);
  }));
  return Promise.all(jobs).then((r) => r.every(Boolean));
}

export const sheet = (key) => {
  const img = images[key];
  return img && img.complete && img.naturalWidth ? img : null;
};

export const spritesReady = () => Boolean(sheet('sabine') && sheet('enemiesA') && sheet('enemiesB') && sheet('abbess'));

/* ---- Sabine --------------------------------------------------------- */

const SAB_COL_W = 384;
const SAB_ROWS = [{ y: 0, h: 341 }, { y: 341, h: 342 }, { y: 683, h: 341 }];
/* Distance from the top of the frame down to the character's feet. */
const SAB_BASELINE = [305, 305, 305, 300, 240, 276, 279, 267, 251, 250, 250, 253];

export const SAB = {
  IDLE_A: 0, IDLE_B: 1, RUN_A: 2, RUN_B: 3, RUN_C: 4,
  RISE: 5, FALL: 6, STEP: 7,
  WINDUP: 8, STRIKE: 9, RECOVER: 10, HURT: 11,
};

/* Scale chosen so Sabine stands ~92px tall in the 540px-high view: big enough
 * to read her pose at a glance, small enough that the painting stays the room. */
export const SABINE_SCALE = 0.40;

function sabFrameRect(i) {
  const col = i % 4;
  const row = SAB_ROWS[Math.floor(i / 4)];
  return { sx: col * SAB_COL_W, sy: row.y, sw: SAB_COL_W, sh: row.h, base: SAB_BASELINE[i] };
}

/* Draw a Sabine frame with the origin at her feet. opts:
 *   scale, alpha, flash (screen-blend white-out), ghost (cyan bloom),
 *   crouch (0..1 — how far into the crouch), lean (px of forward lean) */
export function drawSabine(ctx, frame, opts = {}) {
  const img = sheet('sabine');
  if (!img) return false;
  const f = sabFrameRect(clamp(frame | 0, 0, 11));
  const s = (opts.scale ?? SABINE_SCALE);
  const w = f.sw * s;
  const above = f.base * s;             // art height above the feet
  const below = (f.sh - f.base) * s;    // art that spills below the feet line

  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (opts.rim) {
    /* A white silhouette, screen-blended and offset toward the key light.
     * The real sprite lands on top of it, so all that survives is a lit edge
     * on the light side — which is what stops a dark character from
     * disappearing into a dark painting. */
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'brightness(0) invert(1) blur(0.6px)';
    ctx.globalAlpha *= opts.rim;
  } else if (opts.flash) {
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'brightness(2.7) saturate(.14) contrast(1.2)';
  } else {
    ctx.shadowColor = opts.ghost ? 'rgba(147,241,245,.42)' : 'rgba(206,232,232,.30)';
    ctx.shadowBlur = opts.ghost ? 9 : 3.5;
  }

  const crouch = clamp(opts.crouch ?? 0, 0, 1);
  if (crouch <= 0.001) {
    ctx.drawImage(img, f.sx, f.sy, f.sw, f.sh, -w * 0.5, -above, w, above + below);
  } else {
    /* Two-band crouch. The bottom LEG_BAND of the art above the feet keeps its
     * shape (only a little compression, plus a widening for planted weight);
     * everything above sinks toward it. */
    const LEG_BAND = 0.36;
    const legSrcH = f.base * LEG_BAND;
    const torsoSrcH = f.base - legSrcH;

    const legSquash = 1 - 0.16 * crouch;
    const torsoSquash = 1 - 0.42 * crouch;
    const widen = 1 + 0.10 * crouch;

    const legH = legSrcH * s * legSquash;
    const torsoH = torsoSrcH * s * torsoSquash;
    const lean = (opts.lean ?? 7) * crouch;

    /* legs + the spill below the feet, drawn as one piece so the boots stay put */
    ctx.drawImage(
      img,
      f.sx, f.sy + torsoSrcH, f.sw, legSrcH + (f.sh - f.base),
      -w * widen * 0.5, -legH, w * widen, legH + below,
    );
    /* torso, compressed and leaned */
    ctx.drawImage(
      img,
      f.sx, f.sy, f.sw, torsoSrcH,
      -w * 0.5 + lean, -legH - torsoH, w, torsoH,
    );
  }
  ctx.restore();
  return true;
}

/* Silhouette fallback so the game is playable (and testable) before the
 * painted sheets decode. */
export function drawSabineFallback(ctx, w, h, colour = '#132028') {
  ctx.save();
  ctx.fillStyle = colour;
  ctx.strokeStyle = 'rgba(200,236,236,.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.roundRect(-w * 0.5, -h, w, h, 5);
  ctx.fill(); ctx.stroke();
  ctx.restore();
}

/* ---- enemies -------------------------------------------------------- */

/* sheet: 0 = enemies-a, 1 = enemies-b. row: 0..4. col 0 = rest, col 1 = act.
 * `base` is the feet offset for [rest, act]. */
export const ENEMY_ART = {
  wretch:    { sheet: 0, row: 0, scale: 0.34, base: [338, 335] },
  hound:     { sheet: 0, row: 1, scale: 0.23, base: [355, 355] },
  crow:      { sheet: 0, row: 2, scale: 0.19, base: [354, 354] },
  warden:    { sheet: 0, row: 3, scale: 0.34, base: [355, 324] },
  moth:      { sheet: 0, row: 4, scale: 0.28, base: [323, 328] },
  choir:     { sheet: 1, row: 0, scale: 0.31, base: [333, 316] },
  duelist:   { sheet: 1, row: 1, scale: 0.33, base: [355, 355] },
  bellKnight:{ sheet: 1, row: 2, scale: 0.38, base: [352, 351] },
  harrier:   { sheet: 1, row: 3, scale: 0.27, base: [317, 353] },
  censer:    { sheet: 1, row: 4, scale: 0.34, base: [322, 317] },
};

const ENEMY_COLS = 2;
const ENEMY_ROWS = 5;

/* opts: acting (bool), scale, alpha, flash, squashX, squashY */
export function drawEnemy(ctx, kind, opts = {}) {
  const def = ENEMY_ART[kind];
  if (!def) return false;
  const img = sheet(def.sheet === 0 ? 'enemiesA' : 'enemiesB');
  if (!img) return false;
  const col = opts.acting ? 1 : 0;
  const sw = img.naturalWidth / ENEMY_COLS;
  const sh = img.naturalHeight / ENEMY_ROWS;
  const s = (opts.scale ?? 1) * def.scale;
  const w = sw * s * (opts.squashX ?? 1);
  const above = def.base[col] * s * (opts.squashY ?? 1);
  const below = (sh - def.base[col]) * s * (opts.squashY ?? 1);

  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (opts.rim) {
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'brightness(0) invert(1) blur(0.6px)';
    ctx.globalAlpha *= opts.rim;
  } else if (opts.flash) {
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'brightness(3) saturate(.12) contrast(1.15)';
  } else {
    ctx.shadowColor = opts.acting ? 'rgba(247,225,155,.40)' : 'rgba(206,232,232,.26)';
    ctx.shadowBlur = opts.acting ? 5 : 3;
  }
  ctx.drawImage(img, col * sw, def.row * sh, sw, sh, -w * 0.5, -above, w, above + below);
  ctx.restore();
  return true;
}

/* ---- Abbess Ione ---------------------------------------------------- */

const ABB_COL_W = 384;
const ABB_ROW_H = 512;
const ABB_BASELINE = [397, 402, 400, 404, 339, 336, 327, 331];

export const ABB = { IDLE: 0, SWEEP: 1, LUNGE: 2, SLAM: 3, BELLS: 4, HALO: 5, STORM: 6, FALLEN: 7 };

export const ABBESS_SCALE = 0.72;

export function drawAbbess(ctx, frame, opts = {}) {
  const img = sheet('abbess');
  if (!img) return false;
  const i = clamp(frame | 0, 0, 7);
  const col = i % 4;
  const row = Math.floor(i / 4);
  const s = opts.scale ?? ABBESS_SCALE;
  const w = ABB_COL_W * s;
  const above = ABB_BASELINE[i] * s;
  const below = (ABB_ROW_H - ABB_BASELINE[i]) * s;

  ctx.save();
  ctx.globalAlpha *= opts.alpha ?? 1;
  if (opts.flash) {
    ctx.globalCompositeOperation = 'screen';
    ctx.filter = 'brightness(2.9) saturate(.12) contrast(1.15)';
  } else {
    ctx.shadowColor = opts.telegraph ? 'rgba(246,218,148,.5)' : 'rgba(229,214,242,.34)';
    ctx.shadowBlur = opts.telegraph ? 8 : 4;
  }
  ctx.drawImage(img, col * ABB_COL_W, row * ABB_ROW_H, ABB_COL_W, ABB_ROW_H, -w * 0.5, -above, w, above + below);
  ctx.restore();
  return true;
}

export function titleArt() { return sheet('titleArt'); }
