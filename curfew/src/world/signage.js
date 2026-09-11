// signage — the promises, painted where they were made. ROUND 22, lane D.
//
// ALEX, 2026-09-10: "Nobody in this county promised morning. *Everybody* did. That's the
// story, and it's already written into the world if you put each promise where it was made."
// God (GEN 8:22 on a church board that went up before it happened; JOY COMES IN THE MORNING
// on the cemetery gate; the same verse on a barn with LIAR scratched under it), the
// government (REMAIN INDOORS. DAYLIGHT RESUMES 6:14 AM, then TUESDAY, THIS WEEK, SOON, then a
// hand-painted MORNING on plywood — "bureaucracy losing its nerve one flyer at a time"), and
// the road (MORNING — 40: "It's a town. It's the far end of the map."). Plus the county's own
// voice from the alternate titles (YOU SAID TOMORROW, WHO TURNED IT OFF, DO YOU REMEMBER
// MORNING), the historical marker, mile markers with words scratched in, the gas price that
// climbs and then gives up, curfew notices, and FALL BACK on the kitchen calendars.
//
// HOW IT COSTS NOTHING. Every face here is painted on a canvas and mounted with EXACTLY the
// opening's `_paper` recipe (opening.js:222): places.matBody.clone() with the map swapped,
// bumpScale 0, opaque, no alphaTest. three r161's Material.clone() drops matBody's own
// compile hook (the round-21 snow injection is an own property, not copied), so the clone
// lands in the unpatched mapped-Lambert program that the opening's six papers and every
// major body already link at boot. Zero new programs
// (measured in tools/round22/check-D.mjs: 94 -> 94). ONE 2048x1024 atlas holds every face;
// the gas price has its own small texture so a repaint uploads 200 KB, not 8 MB. Faces are
// merged per ~1 km cluster so the whole lane is a few dozen draws, and the mounts (posts,
// boards, stakes) go on places.matBody itself so a signpost is indistinguishable from any
// other prop in the county. Nothing here runs per frame except one integer compare.
//
// NEVER WHITE. The atlas is read in NoColorSpace, so a canvas hex IS the linear albedo, and
// tests/sites.mjs frame A rations pixels over 200. Paper tops out at C.paper (0.32).
//
// LANE H QUEUES THROUGH `request()`: a banner asked for before init() builds is painted into
// the same atlas; a request after the build is logged once and ignored.

import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { CFG } from '../config.js';
import { Kit, C } from './sites.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';
import { MAJORS } from './placedata.js';
import { OPENING as O } from './opening-layout.js';

const S = CFG.signage || {};
const POSTER_EVERY = S.posterEveryM ?? 260;
const MILE_EVERY = S.mileEveryM ?? 800;
const RADIAL_MILE_EVERY = S.radialMileEveryM ?? 300;
const VERGE_EXTRA = S.vergeExtra ?? 2.1;
const KEEPOUT_MAJOR = S.keepoutMajor ?? 70;
const KEEPOUT_MINOR = S.keepoutMinor ?? 14;
const KEEPOUT_SIGN = S.keepoutSign ?? 30;
const ATLAS_W = (S.atlas && S.atlas.w) || 2048;
const ATLAS_H = (S.atlas && S.atlas.h) || 1024;
const GUTTER = (S.atlas && S.atlas.gutter) || 8;
const PRICE_STAGES = S.priceStages ?? 6;
const BANDS = S.decayBands || [950, 1400, 1750, 2350];
const PLYWOOD_N = S.plywoodBoards ?? 6;
const WATER_Y = (CFG.wilds && CFG.wilds.waterY) || 1.5;

/* ------------------------------------------------------------------ the palette --
 * Linear albedo as hex (NoColorSpace). Nothing above C.paper 0.32 = #52 in any channel.
 */
const INK = '#060402';          // print, spray shadow, gouges' shadow
const PAPER = '#4a4535';        // government paper, the marquee's tray field
const PAPER_LO = '#3a3628';     // aged paper
const PAPER_HI = '#52503f';     // fresh paper, highway lettering — the ceiling
const GREEN = '#0d2a1c';        // highway enamel (sites.js's own lesson: 0.178 max on a board)
const BROWN = '#0c0704';        // the historical marker (MEASURED: #2a190c and #170d05 both washed to orange under the torch at 4 m)
const GOLD = '#52421a';         // its lettering, at the ceiling
const PLY = '#241b0e';          // plywood (MEASURED: #3a2c18 and the brush letters washed together under the torch)
const PLY_LO = '#1a130a';
const STONE = '#232422';        // the lintel
const STONE_HI = '#3f403c';     // its raised letters
const WASH = '#464438';         // whitewash, brush MORNING, spray paint
const BOARD = '#0b0a08';        // what shows through a torn poster: the board behind it
const ENAMEL = '#101820';       // OPEN 24 HRS
const CLOTH = '#3f3a2c';        // a bleachers banner
const PRICE_BG = '#1a1d22';     // the hand-changed price board's black field
const PLANK = '#1c1710';        // barn boards

/** Colours for the mounts, in the kit's own linear floats. */
const K_WOOD = C.wood, K_METAL = C.metal, K_DARK = C.dark, K_PLANK = C.plank, K_PAPER = C.paper;
const K_BROWN = [0.16, 0.10, 0.05], K_GREEN = [0.05, 0.16, 0.11], K_CLOTH = [0.25, 0.23, 0.17];

/** Pixels per metre by style — legibility against an atlas that has to hold everything. */
const PPM = {
  billboard: 120, stone: 100, barn: 72, poster: 220, plywood: 200, highway: 140, marquee: 200,
  marker: 300, mile: 400, open24: 180, curfew: 240, calendar: 300, almanac: 600, graffiti: 64,
  banner: 150,
};

/** The alternate-title pile is not in the repo; the mile markers use the spec's own words. */
const MILE_WORDS = ['TOMORROW', 'SOON', 'EAST', 'STILL HERE', 'MORNING', 'WAIT', 'DUSK'];

/** The poster's date by band. Alex: "The date decays as you go deeper." */
const POSTER_STAGE = ['6:14 AM', 'TUESDAY', 'THIS WEEK', 'SOON'];

/** The price ladder. Alex: "climbs daily, then NO GAS, then NO, then a drawing of a sun." */
const PRICE_STAGE = ['4.29', '5.89', '9.99', 'NO GAS', 'NO', 'SUN'];

/* ------------------------------------------------------------------ small tools -- */
function mulberry(seed) {
  let a = (seed | 0) || 1;
  return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
function hashStr(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

/** Set a font so `text` fits `maxW`, starting from `px` and shrinking. Returns the size. */
function fit(c, text, maxW, px, family, weight = 'bold', style = '') {
  c.font = `${style} ${weight} ${px}px ${family}`.trim();
  const m = c.measureText(text).width;
  if (m > maxW) { px = Math.max(8, Math.floor(px * maxW / m)); c.font = `${style} ${weight} ${px}px ${family}`.trim(); }
  return px;
}
/** Paper grain: the calendar's own trick, thousands of one-pixel flecks. */
function grain(c, w, h, rnd, n, a, b) {
  for (let i = 0; i < n; i++) { c.fillStyle = (i & 1) ? a : b; c.fillRect(rnd() * w, rnd() * h, 1 + (i % 3), 2); }
}
/** Weather streaks running down a face. */
function streaks(c, w, h, rnd, n, col, alpha) {
  c.save(); c.globalAlpha = alpha; c.fillStyle = col;
  for (let i = 0; i < n; i++) { const x = rnd() * w, sw = 2 + rnd() * 6, y0 = rnd() * h * 0.3; c.fillRect(x, y0, sw, h - y0); }
  c.restore();
}
/** Spray-paint letters with drips under them. */
function spray(c, text, x, y, px, col, rnd, maxW) {
  fit(c, text, maxW, px, 'Impact, "Arial Black", sans-serif', 'bold');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.save(); c.globalAlpha = 0.35; c.fillStyle = INK; c.fillText(text, x + px * 0.04, y + px * 0.05); c.restore();
  c.fillStyle = col; c.fillText(text, x, y);
  const tw = c.measureText(text).width;
  for (let i = 0; i < 14; i++) {
    const dx = x - tw * 0.5 + rnd() * tw, len = px * (0.2 + rnd() * 0.9);
    c.fillRect(dx, y + px * 0.25, 2 + rnd() * 3, len);
  }
}
/** Hand-lettered: each glyph placed with its own small slip and tilt. */
function hand(c, text, cx, y, px, col, rnd, family = 'Georgia, serif', spacing = 0.02) {
  c.font = `bold ${px}px ${family}`; c.textAlign = 'left'; c.textBaseline = 'middle'; c.fillStyle = col;
  const widths = text.split('').map(ch => c.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + widths.length * px * spacing;
  let x = cx - total * 0.5;
  for (let i = 0; i < text.length; i++) {
    c.save(); c.translate(x + widths[i] * 0.5, y + (rnd() - 0.5) * px * 0.10); c.rotate((rnd() - 0.5) * 0.10);
    c.fillText(text[i], -widths[i] * 0.5, 0); c.restore();
    x += widths[i] + px * spacing;
  }
}
/** Thin gouges: a word scratched into a surface with something sharp. */
function scratch(c, text, cx, y, px, col, rnd, maxW) {
  fit(c, text, maxW, px, '"Courier New", monospace', 'normal');
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineWidth = Math.max(1, px * 0.045); c.strokeStyle = INK; c.strokeText(text, cx + 1, y + 1);
  c.lineWidth = Math.max(1, px * 0.03); c.strokeStyle = col; c.strokeText(text, cx, y);
  // a few stray scores where the tool skipped
  c.lineWidth = 1; c.beginPath();
  for (let i = 0; i < 6; i++) { const x = cx + (rnd() - 0.5) * maxW, yy = y + (rnd() - 0.5) * px; c.moveTo(x, yy); c.lineTo(x + (rnd() - 0.5) * px * 0.6, yy + (rnd() - 0.5) * px * 0.3); }
  c.stroke();
}

/* ------------------------------------------------------------------ the painters --
 * Each takes a canvas context already clipped to its cell, the cell's pixel size, the sign
 * record (lines, stage, arrow, seed) and a seeded rng. Text is Alex's, verbatim.
 */
const PAINT = {
  billboard(c, w, h, r, rnd) {
    // a church board that went up before it happened: bleached, streaked, still legible
    c.fillStyle = PAPER; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 5000, PAPER_LO, PAPER_HI);
    c.strokeStyle = INK; c.lineWidth = w * 0.012; c.strokeRect(w * 0.03, h * 0.05, w * 0.94, h * 0.9);
    c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, r.lines[0], w * 0.8, h * 0.13, 'Georgia, serif', 'normal'); c.fillText(r.lines[0], w * 0.5, h * 0.20);
    fit(c, r.lines[1], w * 0.86, h * 0.27, 'Georgia, serif', 'bold'); c.fillText(r.lines[1], w * 0.5, h * 0.47);
    fit(c, r.lines[2], w * 0.86, h * 0.27, 'Georgia, serif', 'bold'); c.fillText(r.lines[2], w * 0.5, h * 0.76);
    streaks(c, w, h, rnd, 28, PAPER_LO, 0.55);
    // a corner of the paper gone, board behind it
    c.fillStyle = BOARD; c.beginPath(); c.moveTo(w, h * 0.72); c.lineTo(w, h); c.lineTo(w * 0.86, h); c.closePath(); c.fill();
  },
  stone(c, w, h, r, rnd) {
    // carved into the lintel: raised letters catching what light there is
    c.fillStyle = STONE; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 3000, '#1e1f1d', '#2a2b28');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, r.lines[0], w * 0.92, h * 0.62, 'Georgia, serif', 'bold');
    c.fillStyle = INK; c.fillText(r.lines[0], w * 0.5 + h * 0.03, h * 0.5 + h * 0.04);
    c.fillStyle = STONE_HI; c.fillText(r.lines[0], w * 0.5, h * 0.5);
  },
  barn(c, w, h, r, rnd) {
    // whitewash brushed on barn boards, and LIAR scratched under it with something sharp
    c.fillStyle = PLANK; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += h / 9) { c.fillStyle = '#120f0a'; c.fillRect(0, y, w, 2); }
    grain(c, w, h, rnd, 3000, '#191409', '#221b12');
    c.textAlign = 'center'; c.textBaseline = 'middle';
    const px = fit(c, r.lines[0], w * 0.94, h * 0.44, 'Georgia, serif', 'bold');
    c.fillStyle = WASH; c.fillText(r.lines[0], w * 0.5, h * 0.33);
    // drips off the brush strokes
    const tw = c.measureText(r.lines[0]).width;
    for (let i = 0; i < 26; i++) { const x = w * 0.5 - tw * 0.5 + rnd() * tw; c.fillRect(x, h * 0.33 + px * 0.3, 2 + rnd() * 3, px * (0.1 + rnd() * 0.5)); }
    fit(c, r.lines[1], w * 0.3, h * 0.13, 'Georgia, serif', 'normal'); c.fillStyle = WASH; c.fillText(r.lines[1], w * 0.85, h * 0.62);
    scratch(c, r.lines[2], w * 0.5, h * 0.80, h * 0.30, WASH, rnd, w * 0.5);
  },
  poster(c, w, h, r, rnd) {
    // stapled to a stake. The header is print; the date is the part they kept re-issuing.
    const st = r.stage | 0, age = st / 3;
    c.fillStyle = PAPER_HI; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 1500 + st * 900, PAPER_LO, PAPER);
    c.fillStyle = INK; c.fillRect(0, 0, w, h * 0.06);
    c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, r.lines[0], w * 0.9, h * 0.17, 'Arial, sans-serif', 'bold'); c.fillText(r.lines[0], w * 0.5, h * 0.24);
    fit(c, r.lines[1], w * 0.88, h * 0.11, 'Arial, sans-serif', 'normal'); c.fillText(r.lines[1], w * 0.5, h * 0.44);
    // the date: print for the first, then a thicker, hurrier hand each re-issue
    if (st === 0) { fit(c, r.lines[2], w * 0.86, h * 0.24, 'Arial, sans-serif', 'bold'); c.fillText(r.lines[2], w * 0.5, h * 0.70); }
    else { hand(c, r.lines[2], w * 0.5, h * 0.70, h * (0.24 - st * 0.02), INK, rnd, st > 1 ? 'Georgia, serif' : 'Arial, sans-serif', 0.04); }
    // a strike through what it said before
    if (st > 0) { c.strokeStyle = INK; c.lineWidth = 3; c.beginPath(); c.moveTo(w * 0.2, h * 0.52); c.lineTo(w * 0.8, h * 0.50); c.stroke(); }
    c.strokeStyle = INK; c.lineWidth = 2; c.strokeRect(w * 0.04, h * 0.09, w * 0.92, h * 0.86);
    // staples
    c.fillStyle = '#2a2c30';
    for (const [sx, sy] of [[0.08, 0.10], [0.92, 0.10], [0.08, 0.92], [0.92, 0.92]]) c.fillRect(w * sx - 5, h * sy - 2, 10, 4);
    // torn edges: bites showing the board, more of them the older the issue
    c.fillStyle = BOARD;
    const bites = 2 + st * 4;
    for (let i = 0; i < bites; i++) {
      const edge = i % 4, t = rnd(), rad = w * (0.03 + rnd() * 0.06 * (1 + age));
      const x = edge === 0 ? t * w : edge === 1 ? w : edge === 2 ? t * w : 0;
      const y = edge === 0 ? 0 : edge === 1 ? t * h : edge === 2 ? h : t * h;
      c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill();
    }
    streaks(c, w, h, rnd, 4 + st * 5, PAPER_LO, 0.5);
  },
  plywood(c, w, h, r, rnd) {
    // hand-painted on a scrap sheet: the last poster, with nobody's letterhead on it
    c.fillStyle = PLY; c.fillRect(0, 0, w, h);
    c.strokeStyle = PLY_LO; c.lineWidth = 2;
    for (let i = 0; i < 22; i++) { const y = rnd() * h; c.beginPath(); c.moveTo(0, y); c.bezierCurveTo(w * 0.3, y + rnd() * 12 - 6, w * 0.7, y + rnd() * 12 - 6, w, y + rnd() * 8 - 4); c.stroke(); }
    // sized to the sheet first (MEASURED: a fixed 0.52h Impact overflowed the cell and clipped the M and the G)
    const px = fit(c, r.lines[0], w * 0.74, h * 0.52, 'Impact, "Arial Black", sans-serif', 'bold');
    hand(c, r.lines[0], w * 0.5, h * 0.5, px, PAPER_HI, rnd, 'Impact, "Arial Black", sans-serif', 0.06);
    const tw = w * 0.8;
    for (let i = 0; i < 12; i++) { const x = w * 0.1 + rnd() * tw; c.fillStyle = PAPER_HI; c.fillRect(x, h * 0.66, 2 + rnd() * 3, h * (0.05 + rnd() * 0.22)); }
  },
  highway(c, w, h, r, rnd) {
    // green guide sign, county-issue: a town, a distance, an arrow
    c.fillStyle = GREEN; c.fillRect(0, 0, w, h);
    c.strokeStyle = PAPER_HI; c.lineWidth = Math.max(3, h * 0.035); c.strokeRect(h * 0.05, h * 0.05, w - h * 0.1, h - h * 0.1);
    c.fillStyle = PAPER_HI; c.textBaseline = 'middle';
    const dist = r.lines[1], arrow = r.arrow || '';
    if (dist) {
      c.textAlign = 'left'; fit(c, r.lines[0], w * 0.50, h * 0.5, 'Arial, Helvetica, sans-serif', 'bold'); c.fillText(r.lines[0], w * 0.06, h * 0.5);
      c.textAlign = 'right'; fit(c, dist, w * 0.2, h * 0.5, 'Arial, Helvetica, sans-serif', 'bold'); c.fillText(dist, w * (arrow ? 0.80 : 0.93), h * 0.5);
    } else {
      c.textAlign = 'center'; fit(c, r.lines[0], w * 0.86, h * 0.5, 'Arial, Helvetica, sans-serif', 'bold'); c.fillText(r.lines[0], w * 0.5, h * 0.5);
    }
    if (arrow) {
      const ax = w * 0.90, ay = h * 0.5, L = h * 0.16;
      c.save(); c.translate(ax, ay); c.rotate(arrow === 'left' ? Math.PI : arrow === 'up' ? -Math.PI * 0.5 : 0);
      c.fillRect(-L, -L * 0.22, L * 1.3, L * 0.44);
      c.beginPath(); c.moveTo(L * 0.2, -L * 0.6); c.lineTo(L, 0); c.lineTo(L * 0.2, L * 0.6); c.closePath(); c.fill();
      c.restore();
    }
    streaks(c, w, h, rnd, 6, INK, 0.25);
  },
  marquee(c, w, h, r, rnd) {
    // a changeable-letter board, unlit, two letters fallen into the tray. "That's the
    // county's voice and it's already written."
    c.fillStyle = PAPER; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 2500, PAPER_LO, PAPER_HI);
    const rows = r.lines, missing = r.missing || [];
    const px = Math.min(h * 0.19, w / 12), rowY = (ri) => h * 0.14 + ri * h * 0.24;
    // letter tracks, one under each row
    c.strokeStyle = '#2e2b22'; c.lineWidth = 2;
    for (let i = 0; i < rows.length; i++) { c.beginPath(); c.moveTo(0, rowY(i) + px * 0.55); c.lineTo(w, rowY(i) + px * 0.55); c.stroke(); }
    c.fillStyle = INK; c.textBaseline = 'middle'; c.textAlign = 'center';
    c.font = `bold ${px}px Arial, Helvetica, sans-serif`;
    const gap = px * 0.78, fallen = [];
    rows.forEach((row, ri) => {
      const y = rowY(ri), x0 = w * 0.5 - (row.length - 1) * gap * 0.5;
      for (let i = 0; i < row.length; i++) {
        const ch = row[i];
        if (missing.some(m => m[0] === ri && m[1] === i)) { fallen.push(ch); continue; }
        c.fillText(ch, x0 + i * gap, y);
      }
    });
    // the tray, and what is lying in it
    c.fillStyle = '#26231b'; c.fillRect(0, h * 0.86, w, h * 0.14);
    c.fillStyle = '#1a1813'; c.fillRect(0, h * 0.86, w, 3);
    fallen.forEach((ch, i) => { c.save(); c.translate(w * (0.32 + i * 0.28), h * 0.93); c.rotate(i ? 1.25 : -0.55); c.fillStyle = INK; c.fillText(ch, 0, 0); c.restore(); });
  },
  marker(c, w, h, r, rnd) {
    // official brown-and-gold. Alex: "It was erected. Somebody filed paperwork."
    c.fillStyle = BROWN; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 1500, '#24150a', '#2f1d0e');
    c.strokeStyle = GOLD; c.lineWidth = Math.max(3, w * 0.014);
    c.strokeRect(w * 0.04, w * 0.04, w * 0.92, h - w * 0.08);
    c.lineWidth = Math.max(1, w * 0.005); c.strokeRect(w * 0.07, w * 0.07, w * 0.86, h - w * 0.14);
    c.fillStyle = GOLD; c.textAlign = 'center'; c.textBaseline = 'middle';
    const words = r.lines[0].split(' ');
    // the title on three lines, the way a real marker breaks it
    const t = [words.slice(0, 3).join(' '), words.slice(3, 4).join(' '), words.slice(4).join(' ')].filter(Boolean);
    let y = h * 0.22;
    for (const line of t) { fit(c, line, w * 0.8, h * 0.13, 'Georgia, serif', 'bold'); c.fillText(line, w * 0.5, y); y += h * 0.15; }
    c.fillRect(w * 0.3, y - h * 0.04, w * 0.4, 2);
    fit(c, r.lines[1], w * 0.78, h * 0.075, 'Georgia, serif', 'normal'); c.fillText(r.lines[1], w * 0.5, y + h * 0.07);
    // a small county seal, a ring with a ring in it
    c.strokeStyle = GOLD; c.lineWidth = 2; c.beginPath(); c.arc(w * 0.5, h * 0.88, h * 0.05, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(w * 0.5, h * 0.88, h * 0.028, 0, Math.PI * 2); c.stroke();
  },
  mile(c, w, h, r, rnd) {
    // a green plate. The number gouged off, a word scratched in its place.
    c.fillStyle = GREEN; c.fillRect(0, 0, w, h);
    c.strokeStyle = PAPER_HI; c.lineWidth = 2; c.strokeRect(3, 3, w - 6, h - 6);
    c.fillStyle = PAPER_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, 'MILE', w * 0.7, h * 0.12, 'Arial, sans-serif', 'bold'); c.fillText('MILE', w * 0.5, h * 0.14);
    // the number that was here
    c.font = `bold ${h * 0.3}px Arial, sans-serif`; c.fillText(String(r.stage), w * 0.5, h * 0.40);
    // gouged: bare metal scored across it until it does not read
    c.strokeStyle = '#2a2d30'; c.lineWidth = h * 0.04;
    for (let i = 0; i < 9; i++) { c.beginPath(); const y = h * (0.27 + rnd() * 0.26); c.moveTo(w * (0.05 + rnd() * 0.15), y); c.lineTo(w * (0.8 + rnd() * 0.15), y + (rnd() - 0.5) * h * 0.08); c.stroke(); }
    c.fillStyle = '#2a2d30';
    for (let i = 0; i < 12; i++) c.fillRect(w * 0.1 + rnd() * w * 0.8, h * 0.27 + rnd() * h * 0.26, 3 + rnd() * 10, 2 + rnd() * 5);
    // the word: scored in with something sharp, deep enough to read from the road (MEASURED:
    // hairline strokes on a 0.32 m plate were invisible at 3 m; a filled letter with a dark
    // score round it is the same idea, legible)
    const gouge = (t, y, px) => {
      fit(c, t, w * 0.92, px, '"Courier New", monospace', 'bold'); c.textAlign = 'center'; c.textBaseline = 'middle';
      c.lineWidth = Math.max(2, px * 0.12); c.strokeStyle = INK; c.strokeText(t, w * 0.5 + 1, y + 1);
      c.fillStyle = PAPER_HI; c.fillText(t, w * 0.5, y);
      c.lineWidth = 1; c.strokeStyle = INK; c.beginPath();
      for (let i = 0; i < 5; i++) { const x = w * (0.1 + rnd() * 0.8), yy = y + (rnd() - 0.5) * px; c.moveTo(x, yy); c.lineTo(x + (rnd() - 0.5) * px * 0.8, yy + (rnd() - 0.5) * px * 0.3); }
      c.stroke();
    };
    const word = r.lines[0], two = word.indexOf(' ') > 0;
    if (two) { const [a, b] = word.split(' '); gouge(a, h * 0.68, h * 0.14); gouge(b, h * 0.84, h * 0.14); }
    else gouge(word, h * 0.76, h * 0.17);
  },
  open24(c, w, h, r, rnd) {
    // Alex: "OPEN 24 HRS, the only sign that still means anything."
    c.fillStyle = ENAMEL; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2a323a'; c.lineWidth = 3; c.strokeRect(4, 4, w - 8, h - 8);
    c.fillStyle = PAPER_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, r.lines[0], w * 0.9, h * 0.72, 'Arial, Helvetica, sans-serif', 'bold'); c.fillText(r.lines[0], w * 0.5, h * 0.52);
    grain(c, w, h, rnd, 600, '#0c1218', '#141c24');
  },
  curfew(c, w, h, r, rnd) {
    // county paper, a seal, two lines. Alex's, verbatim.
    c.fillStyle = PAPER_HI; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 2500, PAPER_LO, PAPER);
    c.strokeStyle = INK; c.lineWidth = 3; c.strokeRect(w * 0.05, w * 0.05, w * 0.9, h - w * 0.1);
    c.lineWidth = 2; c.beginPath(); c.arc(w * 0.5, h * 0.16, h * 0.075, 0, Math.PI * 2); c.stroke();
    c.beginPath(); c.arc(w * 0.5, h * 0.16, h * 0.045, 0, Math.PI * 2); c.stroke();
    c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
    const blocks = r.lines.map(l => l.split(' '));
    let y = h * 0.34;
    for (const words of blocks) {
      // wrap at three words a line; the second notice is bolder, it was the one they meant
      for (let i = 0; i < words.length; i += 3) {
        const line = words.slice(i, i + 3).join(' ');
        fit(c, line, w * 0.82, h * 0.085, 'Arial, sans-serif', 'bold'); c.fillText(line, w * 0.5, y); y += h * 0.10;
      }
      y += h * 0.05;
    }
    streaks(c, w, h, rnd, 5, PAPER_LO, 0.4);
  },
  calendar(c, w, h, r, rnd) {
    // Alex: "Kitchen calendar, first Sunday of November circled, FALL BACK. Everyone got an
    // extra hour of dark and it never gave the hour back." November 2026: the 1st is a Sunday.
    c.fillStyle = PAPER; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 2500, PAPER_LO, PAPER_HI);
    c.fillStyle = INK; c.fillRect(0, 0, w, h * 0.03);
    c.fillStyle = PAPER_LO; c.fillRect(0, h * 0.03, w, h * 0.30);           // the picture half
    c.fillStyle = '#2e2b22'; c.beginPath(); c.arc(w * 0.5, h * 0.34, w * 0.22, Math.PI, 0); c.fill();   // a hill under a sky
    c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
    fit(c, 'NOVEMBER', w * 0.8, h * 0.07, 'Georgia, serif', 'bold'); c.fillText('NOVEMBER', w * 0.5, h * 0.39);
    const gx = w * 0.06, gy = h * 0.45, gw = w * 0.88, gh = h * 0.5, cw = gw / 7, ch = gh / 5;
    c.strokeStyle = '#2a2820'; c.lineWidth = 1;
    for (let row = 0; row < 5; row++) for (let col = 0; col < 7; col++) {
      const n = row * 7 + col + 1, x = gx + col * cw, y = gy + row * ch;
      c.strokeRect(x, y, cw, ch);
      if (n > 30) continue;
      c.fillStyle = INK; c.font = `${Math.round(ch * 0.32)}px Georgia, serif`; c.textAlign = 'left'; c.fillText(String(n), x + cw * 0.08, y + ch * 0.22);
      if (n === 1) {
        c.strokeStyle = '#3a0a06'; c.lineWidth = 3; c.beginPath(); c.ellipse(x + cw * 0.5, y + ch * 0.5, cw * 0.48, ch * 0.46, 0.1, 0, Math.PI * 2); c.stroke();
        c.strokeStyle = '#2a2820'; c.lineWidth = 1;
        c.fillStyle = '#3a0a06'; c.font = `bold ${Math.round(ch * 0.26)}px Georgia, serif`; c.textAlign = 'center';
        c.fillText('FALL', x + cw * 0.5, y + ch * 0.52); c.fillText('BACK', x + cw * 0.5, y + ch * 0.78);
      } else {
        // crossed off, one a night, by someone who stopped pressing hard
        c.strokeStyle = '#250504'; c.lineWidth = n < 20 ? 2.5 : 1.5; c.beginPath();
        c.moveTo(x + cw * 0.15, y + ch * 0.2 + (n % 3)); c.lineTo(x + cw * 0.85, y + ch * 0.85);
        c.moveTo(x + cw * 0.85, y + ch * 0.18); c.lineTo(x + cw * 0.15, y + ch * 0.85 - (n % 4)); c.stroke();
        c.strokeStyle = '#2a2820'; c.lineWidth = 1;
      }
    }
  },
  almanac(c, w, h, r, rnd) {
    // Alex: "The Farmers' Almanac open to the sunrise table. 6:14." Every row.
    c.fillStyle = PAPER_HI; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 2000, PAPER, PAPER_LO);
    c.fillStyle = PAPER_LO; c.fillRect(w * 0.495, 0, w * 0.01, h);   // the gutter of the open book
    c.fillStyle = INK; c.textBaseline = 'middle';
    for (const side of [0, 1]) {
      const x0 = w * (0.04 + side * 0.5), cw = w * 0.42;
      c.textAlign = 'left'; c.font = `bold ${Math.round(h * 0.06)}px Georgia, serif`; c.fillText(side ? 'SUNRISE' : 'NOVEMBER', x0, h * 0.08);
      c.fillRect(x0, h * 0.125, cw, 1);
      c.font = `${Math.round(h * 0.052)}px "Courier New", monospace`;
      for (let i = 0; i < 12; i++) {
        const y = h * (0.19 + i * 0.066), day = i + 1 + side * 12;
        c.textAlign = 'left'; c.fillText('Nov ' + day, x0, y);
        c.textAlign = 'right'; c.fillText('6:14', x0 + cw, y);
      }
    }
    // a thumb-worn hollow where the reader kept coming back
    c.save(); c.globalAlpha = 0.35; c.fillStyle = PAPER_LO; c.beginPath(); c.arc(w * 0.83, h * 0.5, h * 0.2, 0, Math.PI * 2); c.fill(); c.restore();
  },
  graffiti(c, w, h, r, rnd) {
    // the surface behind is the world's; the cell is only the letters and their drips, on a
    // dark wash so the paper program reads as paint on a dark wall
    c.fillStyle = r.field || '#0e0d0c'; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 1200, '#0a0a09', '#131211');
    spray(c, r.lines[0], w * 0.5, h * 0.46, h * 0.62, r.spray || WASH, rnd, w * 0.94);
  },
  banner(c, w, h, r, rnd) {
    // cloth, stencilled. Lane H asks for these (SUNRISE WATCH over its bleachers).
    c.fillStyle = CLOTH; c.fillRect(0, 0, w, h);
    grain(c, w, h, rnd, 3000, '#37321f', '#46412f');
    for (let y = 0; y < h; y += 6) { c.fillStyle = (y / 6 & 1) ? '#3b3628' : CLOTH; c.fillRect(0, y, w, 1); }
    c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle';
    const line = r.lines.join('  ');
    const px = fit(c, line, w * 0.9, h * 0.6, 'Arial, Helvetica, sans-serif', 'bold'); c.fillText(line, w * 0.5, h * 0.52);
    // stencil bridges across the letters
    c.fillStyle = CLOTH; for (let i = 0; i < 3; i++) c.fillRect(0, h * 0.52 - px * 0.3 + i * px * 0.3, w, 2);
    // eyelets
    c.strokeStyle = '#2a2c30'; c.lineWidth = 2;
    for (const x of [h * 0.3, w - h * 0.3]) for (const y of [h * 0.25, h * 0.75]) { c.beginPath(); c.arc(x, y, h * 0.05, 0, Math.PI * 2); c.stroke(); }
  },
};

/** The hand-changed price board, on its own small texture so a repaint is cheap. */
function paintPrice(c, w, h, stage, rnd) {
  c.fillStyle = PRICE_BG; c.fillRect(0, 0, w, h);
  c.strokeStyle = '#2a2e34'; c.lineWidth = 3; c.strokeRect(3, 3, w - 6, h - 6);
  grain(c, w, h, rnd, 500, '#15181c', '#1f2328');
  c.fillStyle = PAPER_HI; c.textAlign = 'center'; c.textBaseline = 'middle';
  fit(c, 'REGULAR', w * 0.6, h * 0.14, 'Arial, sans-serif', 'bold'); c.fillText('REGULAR', w * 0.5, h * 0.15);
  c.fillRect(w * 0.1, h * 0.25, w * 0.8, 2);
  const s = PRICE_STAGE[Math.max(0, Math.min(PRICE_STAGE.length - 1, stage))];
  if (s === 'SUN') {
    // a drawing of a sun, in whatever they had: chalk on the black
    c.strokeStyle = WASH; c.lineWidth = 4; c.beginPath(); c.arc(w * 0.5, h * 0.62, h * 0.17, 0, Math.PI * 2); c.stroke();
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2, r0 = h * 0.22, r1 = h * (0.3 + rnd() * 0.06); c.beginPath(); c.moveTo(w * 0.5 + Math.cos(a) * r0, h * 0.62 + Math.sin(a) * r0); c.lineTo(w * 0.5 + Math.cos(a) * r1, h * 0.62 + Math.sin(a) * r1); c.stroke(); }
    return;
  }
  // the changeable digits, hung a little crooked the way they always are; 9/10 on the first
  hand(c, s, w * 0.5 - (stage === 0 ? w * 0.08 : 0), h * 0.62, h * (s.length > 3 ? 0.3 : 0.44), PAPER_HI, rnd, 'Arial, Helvetica, sans-serif', 0.05);
  if (stage === 0) { c.font = `bold ${Math.round(h * 0.13)}px Arial, sans-serif`; c.textAlign = 'left'; c.fillText('9', w * 0.80, h * 0.53); c.fillText('10', w * 0.78, h * 0.72); c.fillRect(w * 0.79, h * 0.62, w * 0.12, 2); }
  // the fingerprints of whoever climbed up here every day
  c.save(); c.globalAlpha = 0.25; c.fillStyle = PAPER_LO; for (let i = 0; i < 6 + stage * 3; i++) { c.beginPath(); c.arc(rnd() * w, h * 0.35 + rnd() * h * 0.6, 4 + rnd() * 6, 0, Math.PI * 2); c.fill(); } c.restore();
}

/* ------------------------------------------------------------------ the atlas ---- */
/** Shelf packing, best-fit: a cell goes on the shortest existing shelf it fits, so the
 * width left at the end of a tall row is not thrown away (a plain row packer refused the
 * last cell at 69% fill). Cells arrive tallest first, so a new shelf is never outgrown. */
class Shelf {
  constructor(w, h, g) { this.w = w; this.h = h; this.g = g; this.shelves = []; this.top = g; this.used = 0; this.n = 0; }
  reserve(cw, ch) {
    if (cw + 2 * this.g > this.w) return null;
    let best = null;
    for (const s of this.shelves) if (ch <= s.h && s.x + cw + this.g <= this.w && (!best || s.h < best.h)) best = s;
    if (!best) {
      if (this.top + ch + this.g > this.h) return null;
      best = { y: this.top, h: ch, x: this.g }; this.shelves.push(best); this.top += ch + this.g;
    }
    const r = { x: best.x, y: best.y, w: cw, h: ch };
    best.x += cw + this.g; this.used += cw * ch; this.n++;
    return r;
  }
}

const _n = new THREE.Vector3(), _ax = new THREE.Vector3(1, 0, 0), _ay = new THREE.Vector3(0, 1, 0), _az = new THREE.Vector3(0, 0, 1);
/** The facing of a plane after the kit's Z, X, Y rotation order. */
function normalOf(yaw, rx, rz, out) {
  out.set(0, 0, 1);
  if (rz) out.applyAxisAngle(_az, rz);
  if (rx) out.applyAxisAngle(_ax, rx);
  if (yaw) out.applyAxisAngle(_ay, yaw);
  return out;
}

export class Signage {
  static id = 'signage';

  constructor(ctx) {
    this.ctx = ctx;
    this.group = new THREE.Group(); this.group.name = 'signage';
    this._signs = [];        // every face to paint and hang: {style, lines, stage, arrow, seed, w, h, x, y, z, yaw, rx, rz, mount, backing, cluster}
    this._queue = [];        // request()s made before init() built
    this._posts = [];        // free-standing posts, for the keep-out between signs and the check tool
    this._built = false;
    this._late = 0;          // requests that came after the build (logged once)
    this.notes = [];
    this.geometries = []; this.materials = []; this.textures = [];
    this.meshes = [];
    this._priceCycle = -1; this._priceStage = 0; this._priceTex = null; this._priceCanvas = null;
    this._rng = mulberry(0x5167);
    this.counts = { posters: [0, 0, 0, 0], plywood: 0, mile: 0, fixed: 0, overlays: 0, banners: 0, faces: 0, clusters: 0 };
    this.fixed = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }
  _note(s) { this.notes.push(s); if (this.notes.length <= 12) console.warn('[signage] ' + s); }

  /**
   * Lane H (and anyone): hang a painted face. Accepted only before init() builds the atlas.
   *   { style, lines, x, y, z, yaw, w, h, rx?, rz?, stage?, arrow?, backing? }
   * World metres and world yaw (a plane faces +Z at yaw 0, like the opening's papers).
   */
  request(r) {
    if (!r || !PAINT[r.style] || !Array.isArray(r.lines) || !r.lines.length) return false;
    if (this._built) { if (!this._late++) this._note('request() after the build is ignored: ' + r.style + ' ' + r.lines[0]); return false; }
    this._queue.push(r);
    return true;
  }

  async init() {
    try { this._authorFixed(); } catch (e) { this._note('fixed signs: ' + e.message); }
    try { this._authorRoads(); } catch (e) { this._note('road signs: ' + e.message); }
    for (const r of this._queue) {
      try { this._sign({ ...r, seed: hashStr(r.style + r.lines.join('|')), backing: r.backing !== false, backCol: K_CLOTH, backD: 0.02 }); this.counts.banners++; }
      catch (e) { this._note('queued request: ' + e.message); }
    }
    this._queue.length = 0;
    try { this._build(); } catch (e) { this._note('build: ' + e.message); }
    try { this._price(); } catch (e) { this._note('price: ' + e.message); }
    this._built = true;
    this.ctx.scene.add(this.group);
  }

  ready() { return this._built; }

  /* ---------------------------------------------------------------- frames -- */
  /** A major's frame: world position, yaw, pad height, and local -> world. */
  _frame(id) {
    const places = this._sys('places');
    const rec = places && places.nodes && places.nodes.get(id);
    if (!rec) { this._note('no frame for ' + id); return null; }
    const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw), ox = rec.def.x, oz = rec.def.z;
    return { id, x: ox, z: oz, yaw: rec.yaw, padY: rec.padY,
      wx: (lx, lz) => ox + lx * cy + lz * sy, wz: (lx, lz) => oz - lx * sy + lz * cy };
  }
  _ground(x, z) { const t = this._sys('terrain'); return t && t.heightAt ? t.heightAt(x, z) : 0; }

  /** Register one face. `mount` (optional) builds posts/boards on the cluster kit. */
  _sign(r) {
    r.rx = r.rx || 0; r.rz = r.rz || 0; r.yaw = r.yaw || 0;
    r.seed = r.seed || hashStr(r.style + '|' + r.lines.join('|') + '|' + (r.stage | 0));
    this._signs.push(r);
    return r;
  }

  /** A face hung on a major's wall or fitting, in that major's local frame. */
  _onMajor(F, style, lines, lx, ly, lz, w, h, localYaw, opts = {}) {
    const r = this._sign({ style, lines, x: F.wx(lx, lz), y: F.padY + ly, z: F.wz(lx, lz), w, h, yaw: localYaw + F.yaw,
      rx: opts.rx || 0, rz: opts.rz || 0, stage: opts.stage, arrow: opts.arrow, missing: opts.missing, field: opts.field, spray: opts.spray,
      backing: opts.backing !== false, backCol: opts.backCol || K_DARK, backD: opts.backD || 0.04 });
    this.fixed.push({ id: F.id + ':' + style, x: +r.x.toFixed(1), z: +r.z.toFixed(1), yaw: r.yaw });
    this.counts.fixed++;
    return r;
  }

  /* ---------------------------------------------------------------- roads --- */
  /** The verge point `extra` metres past the half-width, on `side` of a centreline point;
   * then checked against the actual nearest road (junctions), and pushed out if short. */
  _verge(px, pz, tx, tz, side, width, extra) {
    const roads = this._sys('roads');
    let x = px - tz * side * (width * 0.5 + extra), z = pz + tx * side * (width * 0.5 + extra);
    for (let i = 0; i < 2 && roads; i++) {
      const info = roads.nearestRoadInfo(x, z, 40);
      if (!info || !info.hit) break;
      const need = info.width * 0.5 + extra, d = info.dist;
      if (d >= need - 0.02) break;
      const dx = x - info.x, dz = z - info.z, len = Math.hypot(dx, dz) || 1;
      x = info.x + dx / len * need; z = info.z + dz / len * need;
    }
    return { x, z };
  }
  /** Is this spot clear of majors, minors, water and this lane's own posts? */
  _clear(x, z, minors) {
    for (const m of MAJORS) if (Math.hypot(m.x - x, m.z - z) < KEEPOUT_MAJOR) return false;
    for (const m of minors) if (Math.hypot(m.x - x, m.z - z) < KEEPOUT_MINOR) return false;
    for (const p of this._posts) if (Math.hypot(p.x - x, p.z - z) < KEEPOUT_SIGN) return false;
    if (this._ground(x, z) < WATER_Y) return false;
    return true;
  }
  /** Walk a polyline dropping a callback every `every` metres from `phase` on. */
  _walk(poly, every, phase, fn) {
    let arc = 0, next = phase;
    for (let i = 0; i + 1 < poly.length; i++) {
      const a = poly[i], b = poly[i + 1], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
      if (len < 1e-6) continue;
      while (next <= arc + len) { const t = (next - arc) / len; fn(a.x + dx * t, a.z + dz * t, dx / len, dz / len, next); next += every; }
      arc += len;
    }
  }
  /** The point `d` metres along a closed polyline from vertex `i0` (negative walks back). */
  _along(poly, i0, d) {
    const n = poly.length - 1, dir = d < 0 ? -1 : 1; let left = Math.abs(d), i = i0;
    for (let guard = 0; guard < n; guard++) {
      const j = ((i + dir) % n + n) % n, a = poly[i], b = poly[j], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz);
      if (left <= len) { const t = left / len; return { x: a.x + dx * t, z: a.z + dz * t, tx: dx / len, tz: dz / len }; }
      left -= len; i = j;
    }
    return { x: poly[i].x, z: poly[i].z, tx: 1, tz: 0 };
  }
  _nearestVertex(poly, x, z) { let bi = 0, bd = Infinity; for (let i = 0; i < poly.length - 1; i++) { const d = Math.hypot(poly[i].x - x, poly[i].z - z); if (d < bd) { bd = d; bi = i; } } return bi; }

  /** A stapled government poster on two stakes, facing the road. */
  _stake(x, z, faceYaw, stage) {
    const gy = this._ground(x, z);
    const r = this._sign({ style: 'poster', lines: ['REMAIN INDOORS', 'DAYLIGHT RESUMES', POSTER_STAGE[stage]], stage,
      x: x + Math.sin(faceYaw) * 0.045, y: gy + 1.45, z: z + Math.cos(faceYaw) * 0.045, w: 0.98, h: 0.70, yaw: faceYaw, backing: false });
    r.mount = (k, col) => {
      const cy = Math.cos(faceYaw), sy = Math.sin(faceYaw);
      for (const s of [-1, 1]) k.cyl(0.05, 0.06, 1.9, 5, x + cy * 0.42 * s, gy + 0.95, z - sy * 0.42 * s, K_WOOD);
      k.box(1.15, 0.85, 0.05, x, gy + 1.45, z, K_WOOD, faceYaw);
      col({ kind: 'circle', x, z, r: 0.5, y0: gy - 0.2, y1: gy + 1.9, tag: 'wood' });
    };
    this._posts.push({ x, z, kind: 'poster', yaw: faceYaw });
    this.counts.posters[stage]++;
  }
  /** A plywood MORNING on two stakes: the last poster, hand-painted. */
  _plywood(x, z, faceYaw) {
    const gy = this._ground(x, z);
    const r = this._sign({ style: 'plywood', lines: ['MORNING'], x: x + Math.sin(faceYaw) * 0.03, y: gy + 1.15, z: z + Math.cos(faceYaw) * 0.03, w: 1.2, h: 0.8, yaw: faceYaw, backing: false });
    r.mount = (k, col) => {
      const cy = Math.cos(faceYaw), sy = Math.sin(faceYaw);
      for (const s of [-1, 1]) k.box(0.06, 1.7, 0.06, x + cy * 0.5 * s, gy + 0.85, z - sy * 0.5 * s, K_WOOD, faceYaw);
      k.box(1.26, 0.86, 0.02, x, gy + 1.15, z, [0.14, 0.10, 0.06], faceYaw);
      col({ kind: 'circle', x, z, r: 0.55, y0: gy - 0.2, y1: gy + 1.8, tag: 'wood' });
    };
    this._posts.push({ x, z, kind: 'plywood', yaw: faceYaw });
    this.counts.plywood++;
  }
  /** A mile marker: a small green plate on a post, the number gouged, a word scratched in. */
  _mile(x, z, faceYaw, n) {
    const gy = this._ground(x, z), word = MILE_WORDS[n % MILE_WORDS.length];
    const r = this._sign({ style: 'mile', lines: [word], stage: n + 1, x: x + Math.sin(faceYaw) * 0.045, y: gy + 1.1, z: z + Math.cos(faceYaw) * 0.045, w: 0.32, h: 0.5, yaw: faceYaw, backing: false });
    r.mount = (k, col) => {
      k.box(0.08, 1.4, 0.08, x, gy + 0.7, z, K_METAL, faceYaw);
      k.box(0.36, 0.54, 0.02, x, gy + 1.1, z + 0.0, K_GREEN, faceYaw);
      col({ kind: 'circle', x, z, r: 0.1, y0: gy - 0.2, y1: gy + 1.4, tag: 'metal' });
    };
    this._posts.push({ x, z, kind: 'mile', yaw: faceYaw });
    this.counts.mile++;
  }
  /** A green guide sign on two posts. */
  _highway(x, z, faceYaw, lines, arrow, w = 3.2, h = 1.0, top = 2.4) {
    const gy = this._ground(x, z), y = gy + top - h * 0.5;
    const r = this._sign({ style: 'highway', lines, arrow, x: x + Math.sin(faceYaw) * 0.045, y, z: z + Math.cos(faceYaw) * 0.045, w, h, yaw: faceYaw, backing: false });
    r.mount = (k, col) => {
      const cy = Math.cos(faceYaw), sy = Math.sin(faceYaw), px = w * 0.5 - 0.35;
      // posts behind the board, so they never stand proud of the lettering
      for (const s of [-1, 1]) k.box(0.12, top, 0.12, x + cy * px * s - sy * 0.09, gy + top * 0.5, z - sy * px * s - cy * 0.09, K_METAL, faceYaw);
      k.box(w + 0.04, h + 0.04, 0.05, x, y, z, K_GREEN, faceYaw);
      col({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: 0.14, yaw: faceYaw, y0: gy - 0.2, y1: gy + top, tag: 'metal' });
    };
    this._posts.push({ x, z, kind: 'highway', yaw: faceYaw });
    this.fixed.push({ id: 'highway:' + lines.join(' '), x: +x.toFixed(1), z: +z.toFixed(1), yaw: faceYaw });
    this.counts.fixed++;
  }

  /* ---------------------------------------------------------------- authoring --- */
  _authorRoads() {
    const roads = this._sys('roads'), places = this._sys('places');
    if (!roads || !roads.routePolylines) throw new Error('roads.routePolylines missing');
    const polys = roads.routePolylines(), routes = roads.routes;
    const minors = places && places.minorList ? places.minorList() : [];
    const loopI = 0, eastI = routes.findIndex(r => r.id === 'radial-east'), ringI = routes.findIndex(r => r.id === 'outer-ring');
    const loop = polys[loopI], east = eastI >= 0 ? polys[eastI] : null, ring = ringI >= 0 ? polys[ringI] : null;

    // MORNING — 40: two boards on the loop, 28 m either side of the junction with the road to
    // Morning, on the east verge, each facing the traffic that approaches it. Alex: "Green
    // highway sign: MORNING — 40. It's a town. It's the far end of the map."
    {
      const j = this._nearestVertex(loop, 1443.6, 0), W = routes[loopI].width;
      for (const d of [-28, 28]) {
        const p = this._along(loop, j, d);
        const side = (-p.tz) > 0 ? 1 : -1;                     // perp = (-tz, tx) * side: choose x increasing
        const v = this._verge(p.x, p.z, p.tx, p.tz, side, W, 2.4);
        const nx = p.tx, nz = p.tz;   // _along's tangent already points AWAY from the junction on both sides (it walks back for d < 0), so the face is that direction: at the traffic approaching the junction
        const drvX = -nx, drvZ = -nz;                            // the driver reading it travels toward the junction
        const arrow = (-drvZ) > 0 ? 'right' : 'left';            // east on the driver's right when -dz > 0
        this._highway(v.x, v.z, Math.atan2(nx, nz), ['MORNING', '40'], arrow);
      }
    }
    // MORNING 12 on the road to Morning near x 2400, facing west, on the eastbound verge
    if (east) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < east.length - 1; i++) { const d = Math.abs(east[i].x - 2400); if (d < bd) { bd = d; bi = i; } }
      const a = east[bi], b = east[Math.min(bi + 1, east.length - 1)], dx = b.x - a.x, dz = b.z - a.z, len = Math.hypot(dx, dz) || 1;
      const tx = dx / len, tz = dz / len, side = (tx) > 0 ? 1 : -1;   // perp (-tz, tx)*side has z > 0: the eastbound driver's right
      const v = this._verge(a.x, a.z, tx, tz, side, routes[eastI].width, 2.4);
      this._highway(v.x, v.z, -Math.PI * 0.5, ['MORNING', '12'], 'up');
    }
    // the town limit: MORNING, at the road point nearest the science centre, facing the approach
    {
      const info = roads.nearestRoadInfo(2946, 571, 120);
      if (info && info.hit) {
        const px = info.x, pz = info.z, tx = info.tx, tz = info.tz, W = info.width;
        // the traffic comes round the ring from the radial's end at (2842.9, 0)
        const toX = 2842.9 - px, toZ = 0 - pz, s = (toX * tx + toZ * tz) > 0 ? 1 : -1;
        const nx = tx * s, nz = tz * s, drvX = -nx, drvZ = -nz;
        // on the driver's right-hand verge: right = (-drvZ, drvX), projected on the perp (-tz, tx)
        const rightX = -drvZ, rightZ = drvX, sd = (rightX * -tz + rightZ * tx) > 0 ? 1 : -1;
        const v = this._verge(px, pz, tx, tz, sd, W, 2.4);
        this._highway(v.x, v.z, Math.atan2(nx, nz), ['MORNING'], '', 2.4, 1.2, 2.6);
      } else this._note('no road near the town limit');
    }
    // Mile markers: the loop every MILE_EVERY, the road to Morning every RADIAL_MILE_EVERY.
    // Alex: "Mile markers with the numbers scratched off and words scratched in."
    let n = 0;
    const mileOn = (poly, W, every, phase) => this._walk(poly, every, phase, (x, z, tx, tz) => {
      const side = (n & 1) ? -1 : 1, v = this._verge(x, z, tx, tz, side, W, 2.2);
      if (!this._clear(v.x, v.z, minors)) return;
      this._mile(v.x, v.z, Math.atan2(-tx, -tz), n++);
    });
    mileOn(loop, routes[loopI].width, MILE_EVERY, 400);
    if (east) mileOn(east, routes[eastI].width, RADIAL_MILE_EVERY, 150);

    // Government posters: a stake every POSTER_EVERY on every route inside the last band,
    // the date by depth; none past it. Alex: "Then TUESDAY. Then THIS WEEK. Then SOON. Then a
    // hand-painted MORNING on plywood. The date decays as you go deeper."
    const outer = BANDS[BANDS.length - 1];
    for (let ri = 0; ri < polys.length; ri++) {
      const W = routes[ri].width; let k = ri * 7;
      this._walk(polys[ri], POSTER_EVERY, 90 + (ri * 37) % POSTER_EVERY, (x, z, tx, tz) => {
        const r = Math.hypot(x, z); if (r >= outer) return;
        const side = (k++ & 1) ? -1 : 1, v = this._verge(x, z, tx, tz, side, W, 2.6);
        if (!this._clear(v.x, v.z, minors)) return;
        let stage = 0; while (stage < BANDS.length - 1 && r >= BANDS[stage]) stage++;
        // the poster faces the road: normal from stake to centreline
        this._stake(v.x, v.z, Math.atan2(x - v.x, z - v.z), stage);
      });
    }
    // and six hand-placed plywood MORNING boards on the outer ring, one per ~60 degrees
    if (ring) {
      for (let i = 0; i < PLYWOOD_N; i++) {
        const want = (i + 0.5) * Math.PI * 2 / PLYWOOD_N - Math.PI; let bi = 0, bd = Infinity;
        for (let j = 0; j < ring.length - 1; j++) { let d = Math.atan2(ring[j].z, ring[j].x) - want; d = Math.abs(Math.atan2(Math.sin(d), Math.cos(d))); if (d < bd) { bd = d; bi = j; } }
        const p = this._along(ring, bi, 6), side = (-p.tz * p.x + p.tx * p.z) > 0 ? 1 : -1;   // the outward verge
        const v = this._verge(p.x, p.z, p.tx, p.tz, side, routes[ringI].width, 2.6);
        if (this._ground(v.x, v.z) < WATER_Y) continue;
        this._plywood(v.x, v.z, Math.atan2(p.x - v.x, p.z - v.z));
      }
    }
    // the county's own rationed 'poster' minors get the same paper, facing the road
    for (const m of minors) {
      if (m.kind !== 'poster') continue;
      const r = Math.hypot(m.x, m.z); let stage = 0; while (stage < BANDS.length - 1 && r >= BANDS[stage]) stage++;
      const gy = this._ground(m.x, m.z), cy = Math.cos(m.yaw), sy = Math.sin(m.yaw);
      this._sign({ style: 'poster', lines: ['REMAIN INDOORS', 'DAYLIGHT RESUMES', POSTER_STAGE[stage]], stage,
        x: m.x + 0.06 * sy, y: gy + 1.45, z: m.z + 0.06 * cy, w: 0.98, h: 0.70, yaw: m.yaw, backing: false });
      this.counts.overlays++;
    }
  }

  _authorFixed() {
    const roads = this._sys('roads');
    const G = (F, lx, lz) => this._ground(F.wx(lx, lz), F.wz(lx, lz));

    // GOD PROMISED IT. Alex: "Put GEN 8:22 on a church billboard that went up *before* it
    // happened." A board on the cathedral's verge, angled at the road the way billboards are.
    const cath = this._frame('cathedral');
    if (cath && roads) {
      const wx = cath.wx(-32, 24), wz = cath.wz(-32, 24), info = roads.nearestRoadInfo(wx, wz, 40);
      if (info && info.hit) {
        const px = info.x, pz = info.z, tx = info.tx, tz = info.tz, W = info.width;
        const side = ((wx - px) * -tz + (wz - pz) * tx) > 0 ? 1 : -1;
        const toX = O.x - px, toZ = O.z - pz, s = (toX * tx + toZ * tz) > 0 ? 1 : -1;     // read from the station side
        // the normal leans 35 degrees off the road's line toward the road
        const inX = tz * side, inZ = -tx * side;   // toward the centreline
        let nx = tx * s * 0.82 + inX * 0.57, nz = tz * s * 0.82 + inZ * 0.57; const nl = Math.hypot(nx, nz); nx /= nl; nz /= nl;
        const bw = 4.8, bh = 2.4, ax = nz, az = -nx;                                        // the board's own axis
        const need = W * 0.5 + VERGE_EXTRA + bw * 0.5 * Math.abs(ax * -tz + az * tx) + 0.3;
        const x = px - tz * side * need, z = pz + tx * side * need, gy = this._ground(x, z), top = 5.2, y = gy + top - bh * 0.5, yaw = Math.atan2(nx, nz);
        const r = this._sign({ style: 'billboard', lines: ['GEN 8:22', 'DAY AND NIGHT', 'SHALL NOT CEASE'], x: x + nx * 0.05, y, z: z + nz * 0.05, w: bw, h: bh, yaw, backing: false });
        r.mount = (k, col) => {
          // posts BEHIND the board (MEASURED: centred on it they stood proud of the face and cut the D and the T)
          for (const sgn of [-1, 1]) k.box(0.22, top, 0.22, x + ax * (bw * 0.5 - 0.5) * sgn - nx * 0.16, gy + top * 0.5, z + az * (bw * 0.5 - 0.5) * sgn - nz * 0.16, K_WOOD, yaw);
          k.box(bw + 0.1, bh + 0.1, 0.06, x, y, z, K_DARK, yaw);
          k.box(bw + 0.1, 0.12, 0.3, x, y - bh * 0.5 - 0.02, z, K_WOOD, yaw);
          col({ kind: 'obb', x, z, halfX: bw * 0.5 + 0.05, halfZ: 0.16, yaw, y0: gy - 0.2, y1: gy + top, tag: 'wood' });
        };
        this._posts.push({ x, z, kind: 'billboard', yaw }); this.fixed.push({ id: 'cathedral:billboard', x: +x.toFixed(1), z: +z.toFixed(1), yaw: yaw }); this.counts.fixed++;
      } else this._note('no road by the cathedral verge');
    }
    // "Put JOY COMES IN THE MORNING on the funeral home." There is none; the cemetery gate is
    // the county's undertaker. Carved into the arch lintel, facing the yard.
    const cem = this._frame('garden-of-rest');
    if (cem) this._onMajor(cem, 'stone', ['JOY COMES IN THE MORNING'], 0, 6.6, -19.37, 7.4, 1.0, 0, { backD: 0.02, backCol: C.stone });
    // "Somewhere deep, the same verse painted on a barn with LIAR scratched under it."
    const barn = this._frame('jackfield');
    if (barn) this._onMajor(barn, 'barn', ['DAY AND NIGHT SHALL NOT CEASE', 'GEN 8:22', 'LIAR'], 0, 3.5, 6.25, 13, 2.2, 0, { backD: 0.02, backCol: K_PLANK });
    // "DO YOU REMEMBER MORNING on a church marquee with two letters fallen off." The chapel.
    const chapel = this._frame('chapel');
    if (chapel && roads) {
      // local (7.5, 27) is the chapel's road side, and MEASURED the backroad runs within a
      // metre of it: so, like every other post, it stands on the verge and faces the road
      let x = chapel.wx(7.5, 27), z = chapel.wz(7.5, 27), yaw = chapel.yaw;
      const info = roads.nearestRoadInfo(x, z, 40);
      if (info && info.hit) {
        const px = info.x, pz = info.z, tx = info.tx, tz = info.tz, W = info.width;
        const side = ((x - px) * -tz + (z - pz) * tx) > 0 ? 1 : -1, v = this._verge(px, pz, tx, tz, side, W, 2.4);
        x = v.x; z = v.z; yaw = Math.atan2(px - x, pz - z);
      }
      const gy = this._ground(x, z), w = 2.4, h = 1.2, top = 2.6, y = gy + top - h * 0.5;
      const nx = Math.sin(yaw), nz = Math.cos(yaw), ax = nz, az = -nx;
      const r = this._sign({ style: 'marquee', lines: ['DO YOU', 'REMEMBER', 'MORNING'], missing: [[1, 5], [2, 0]],
        x: x + nx * 0.10, y, z: z + nz * 0.10, w, h, yaw, backing: false });
      r.mount = (k, col) => {
        for (const s of [-1, 1]) k.box(0.10, top, 0.10, x + ax * (w * 0.5 - 0.3) * s, gy + top * 0.5, z + az * (w * 0.5 - 0.3) * s, K_METAL, yaw);
        k.box(w + 0.16, h + 0.16, 0.18, x, y, z, K_DARK, yaw);
        k.box(w + 0.16, 0.08, 0.26, x, y - h * 0.5 - 0.06, z, K_METAL, yaw);
        col({ kind: 'obb', x, z, halfX: w * 0.5 + 0.1, halfZ: 0.14, yaw, y0: gy - 0.2, y1: gy + top, tag: 'metal' });
      };
      this._posts.push({ x, z, kind: 'marquee', yaw }); this.fixed.push({ id: 'chapel:marquee', x: +x.toFixed(1), z: +z.toFixed(1), yaw: yaw }); this.counts.fixed++;
    }
    // "YOU SAID TOMORROW on an overpass." The county has no overpass; the Black Rib's first
    // portal is the only thing shaped like one. On its broken keystone, in spray.
    const rib = this._frame('black-rib');
    if (rib) this._onMajor(rib, 'graffiti', ['YOU SAID TOMORROW'], -0.38, 18.5 * 0.955, 16.24, 6.8, 1.2, 0, { rz: -3 * 0.018, backing: false, field: '#111212' });   // the keystone's own darkStone
    // "WHO TURNED IT OFF on a garage door." The Avery House's sectional door: donor
    // (51.5, 1.62, front+0.25) with front 40.2 -> local (21.5, +4.82, 16.45); the seams reach 16.60.
    const avery = this._frame('avery-house');
    if (avery) {
      // the field is the door's own albedo (manor.js PALETTE.dark), so only the letters read as added
      this._onMajor(avery, 'graffiti', ['WHO TURNED IT OFF'], 21.5, 4.82, 16.63, 9.6, 2.6, 0, { backing: false, field: '#1b1c1e', spray: '#4a3c30' });
      // and the plainer kitchen calendar, same page, on the kitchen's z=30 wall, facing into the room
      this._onMajor(avery, 'calendar', ['NOVEMBER'], 25, 4.8, 6.15, 0.66, 0.99, 0, { backD: 0.02, backCol: K_PAPER });
    }
    // THE CURFEW. Alex: "ALL PERSONS INDOORS BY DUSK. VIOLATORS DETAINED UNTIL MORNING."
    const CURFEW = ['ALL PERSONS INDOORS BY DUSK', 'VIOLATORS DETAINED UNTIL MORNING'];
    const hf = this._frame('holdfast');
    if (hf) for (const sx of [-1, 1]) {
      const lx = sx * 7.6, lz = 67.36;
      this._sign({ style: 'curfew', lines: CURFEW, x: hf.wx(lx, lz), y: G(hf, lx, 66) + 2.3, z: hf.wz(lx, lz), w: 0.9, h: 1.2, yaw: hf.yaw, backing: true, backCol: K_DARK, backD: 0.04 });
      this.counts.fixed++;
    }
    if (hf) this.fixed.push({ id: 'holdfast:curfew', x: +hf.wx(7.6, 67.36).toFixed(1), z: +hf.wz(7.6, 67.36).toFixed(1), yaw: hf.yaw });
    const toll = this._frame('the-toll');
    if (toll && roads) {
      // the checkpoint lays itself in road space (sites.js checkpoint): u along, v across
      const info = roads.nearestRoadInfo(toll.x, toll.z, 60);
      const tx = info && info.hit ? info.tx : 0, tz = info && info.hit ? info.tz : 1, nx = -tz, nz = tx, GAP = 2.4;
      const u = -3.4, v = GAP + 1.71;
      const x = toll.x + tx * u + nx * v, z = toll.z + tz * u + nz * v;
      this._sign({ style: 'curfew', lines: CURFEW, x, y: toll.padY + 0.75, z, w: 0.9, h: 0.6, yaw: Math.atan2(-nx, -nz), backing: true, backCol: K_DARK, backD: 0.04 });
      this.fixed.push({ id: 'the-toll:curfew', x: +x.toFixed(1), z: +z.toFixed(1), yaw: Math.atan2(-nx, -nz) }); this.counts.fixed++;
    }
    // THE FILLING STATION: OPEN 24 HRS on the pylon, the price board under it, the marker on
    // the verge, a curfew notice on the service bay, the almanac on the counter.
    const st = this._frame('filling-station');
    if (st) {
      this._onMajor(st, 'open24', ['OPEN 24 HRS'], 6.6, 8.22, -7.15, 2.6, 0.42, 0, { backD: 0.03, backCol: K_DARK });
      this._onMajor(st, 'curfew', CURFEW, -17.70, 2.0, -0.2, 0.9, 1.2, Math.PI * 0.5, { backD: 0.04, backCol: K_DARK });
      this._onMajor(st, 'almanac', ['SUNRISE'], -8.55, 1.055, 1.28, 0.46, 0.32, 0, { rx: -Math.PI * 0.5, backD: 0.03, backCol: [0.12, 0.08, 0.05] });
      // "A historical marker, official brown-and-gold: SITE OF THE LAST SUNRISE." On the
      // verge past the station's own signs (they stand at local (21,23) and nearer).
      if (roads) {
        const wx = st.wx(40, 30), wz = st.wz(40, 30), info = roads.nearestRoadInfo(wx, wz, 40);
        if (info && info.hit) {
          const px = info.x, pz = info.z, tx = info.tx, tz = info.tz, W = info.width;
          const side = ((wx - px) * -tz + (wz - pz) * tx) > 0 ? 1 : -1;
          const vv = this._verge(px, pz, tx, tz, side, W, VERGE_EXTRA + 0.3), x = vv.x, z = vv.z, gy = this._ground(x, z);
          const yaw = Math.atan2(px - x, pz - z), nx = Math.sin(yaw), nz = Math.cos(yaw), w = 1.2, h = 1.0, top = 2.5, y = gy + top - h * 0.5;
          const r = this._sign({ style: 'marker', lines: ['SITE OF THE LAST SUNRISE', 'ERECTED NOVEMBER 1'], x: x + nx * 0.05, y, z: z + nz * 0.05, w, h, yaw, backing: false });
          r.mount = (k, col) => {
            k.box(0.12, top - h * 0.5, 0.12, x, gy + (top - h * 0.5) * 0.5, z, K_METAL, yaw);
            k.box(w + 0.08, h + 0.08, 0.06, x, y, z, K_BROWN, yaw);
            k.cone(0.16, 0.22, 4, x, gy + top + 0.1, z, K_BROWN, yaw);
            col({ kind: 'circle', x, z, r: 0.14, y0: gy - 0.2, y1: gy + top, tag: 'metal' });
          };
          this._posts.push({ x, z, kind: 'marker', yaw }); this.fixed.push({ id: 'station:marker', x: +x.toFixed(1), z: +z.toFixed(1), yaw: yaw }); this.counts.fixed++;
        } else this._note('no road by the station verge for the marker');
      }
    }
  }

  /* ---------------------------------------------------------------- the build --- */
  _build() {
    const places = this._sys('places'), collision = this._sys('collision');
    if (!places || !places.matBody) throw new Error('places.matBody missing');
    // 1. one cell per distinct painting
    const cells = new Map();
    for (const r of this._signs) {
      const key = r.style + '|' + r.lines.join('\n') + '|' + (r.stage | 0) + '|' + (r.arrow || '') + '|' + (r.field || '') + '|' + (r.spray || '');
      let cell = cells.get(key);
      if (!cell) {
        const ppm = PPM[r.style] || 150;
        const cw = Math.max(32, Math.min(1024, Math.round(r.w * ppm / 4) * 4)), ch = Math.max(24, Math.min(512, Math.round(r.h * ppm / 4) * 4));
        cell = { key, w: cw, h: ch, rect: null, rec: r };
        cells.set(key, cell);
      }
      r.cell = cell;
    }
    // 2. pack, tallest first
    const canvas = document.createElement('canvas'); canvas.width = ATLAS_W; canvas.height = ATLAS_H;
    const c = canvas.getContext('2d');
    c.fillStyle = BOARD; c.fillRect(0, 0, ATLAS_W, ATLAS_H);
    const shelf = new Shelf(ATLAS_W, ATLAS_H, GUTTER);
    const list = Array.from(cells.values()).sort((a, b) => b.h - a.h || b.w - a.w);
    for (const cell of list) {
      cell.rect = shelf.reserve(cell.w, cell.h);
      if (!cell.rect) {
        // ROUND 22, lane H. MEASURED: a cell's pixel size is taken from the FIRST sign that
        // registers its key (above), so which stake or overlay lands first decides the packing,
        // and the stakes move whenever the minor table moves (KEEPOUT_MINOR). Lane H's rows moved
        // them and the last, shortest cell (graffiti YOU SAID TOMORROW, 435 x 77) fell out of a
        // 77% atlas — a promise gone from the Black Rib for want of a shelf end. A cell that does
        // not fit is painted at half resolution rather than not at all; the count is in state().
        const w2 = Math.max(32, Math.round(cell.w * 0.5 / 4) * 4), h2 = Math.max(24, Math.round(cell.h * 0.5 / 4) * 4);
        cell.rect = shelf.reserve(w2, h2);
        if (cell.rect) { cell.w = w2; cell.h = h2; this.counts.halved = (this.counts.halved || 0) + 1; }
      }
      if (!cell.rect) { this._note('atlas full: ' + cell.key.split('|')[0] + ' ' + cell.key.split('|')[1].split('\n')[0]); continue; }
      const R = cell.rect;
      c.save(); c.translate(R.x, R.y); c.beginPath(); c.rect(0, 0, R.w, R.h); c.clip();
      try { PAINT[cell.rec.style](c, R.w, R.h, cell.rec, mulberry(cell.rec.seed)); }
      catch (e) { this._note('paint ' + cell.rec.style + ': ' + e.message); }
      c.restore();
    }
    this.atlas = { w: ATLAS_W, h: ATLAS_H, cells: shelf.n, usedPct: +(100 * shelf.used / (ATLAS_W * ATLAS_H)).toFixed(1) };
    // 3. THE MATERIAL: the opening's paper recipe, exactly. See the header for why this is free.
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4; this.textures.push(tex);
    const mat = places.matBody.clone(); mat.map = tex; mat.bumpScale = 0; mat.name = 'signage-paper'; this.materials.push(mat);
    this.material = mat;
    // 4. faces and mounts, per ~1 km cluster
    const clusters = new Map();
    const clusterOf = (x, z) => { const k = Math.floor((x + 2048) / 1024) + ',' + Math.floor((z + 2048) / 1024); let cl = clusters.get(k); if (!cl) { cl = { key: k, faces: [], kit: new Kit(), n: 0 }; clusters.set(k, cl); } return cl; };
    const col = (shape) => { if (collision && collision.addCollider) collision.addCollider(shape, 'signage'); };
    for (const r of this._signs) {
      if (!r.cell || !r.cell.rect) continue;
      const cl = clusterOf(r.x, r.z);
      const g = new THREE.PlaneGeometry(r.w, r.h), R = r.cell.rect, uv = g.attributes.uv;
      const u0 = R.x / ATLAS_W, u1 = (R.x + R.w) / ATLAS_W, vTop = 1 - R.y / ATLAS_H, vBot = 1 - (R.y + R.h) / ATLAS_H;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, u0 + uv.getX(i) * (u1 - u0), vBot + uv.getY(i) * (vTop - vBot));
      g.setAttribute('color', new THREE.Float32BufferAttribute(Array(g.attributes.position.count * 3).fill(1), 3));
      if (r.rz) g.rotateZ(r.rz); if (r.rx) g.rotateX(r.rx); if (r.yaw) g.rotateY(r.yaw);
      g.translate(r.x, r.y, r.z);
      cl.faces.push(g); cl.n++;
      // the board behind the face: matBody is DoubleSide, and a bare quad shows mirrored text
      if (r.backing) {
        normalOf(r.yaw, r.rx, r.rz, _n); const d = r.backD || 0.04;
        cl.kit.box(r.w + 0.04, r.h + 0.04, d, r.x - _n.x * (d * 0.5 + 0.005), r.y - _n.y * (d * 0.5 + 0.005), r.z - _n.z * (d * 0.5 + 0.005), r.backCol || K_DARK, r.yaw, r.rx, r.rz);
      }
      if (r.mount) r.mount(cl.kit, col);
    }
    for (const cl of clusters.values()) {
      if (cl.faces.length) {
        const merged = mergeGeometries(cl.faces, false); for (const f of cl.faces) f.dispose();
        if (merged) {
          this.geometries.push(merged);
          const m = new THREE.Mesh(merged, mat); m.name = 'signage-faces-' + cl.key; m.castShadow = false; m.receiveShadow = true;
          this.group.add(m); this.meshes.push(m); this.counts.faces += cl.n;
        }
      }
      const mg = cl.kit.build();
      if (mg) {
        projectPlaceSurfaceUVs(mg, 2.6); this.geometries.push(mg);
        const m = new THREE.Mesh(mg, places.matBody); m.name = 'signage-mounts-' + cl.key; m.castShadow = true; m.receiveShadow = true;
        this.group.add(m); this.meshes.push(m);
      }
      this.counts.clusters++;
    }
  }

  /** The gas price, on its own 256x192 texture: "climbs daily, then NO GAS, then NO, then a
   * drawing of a sun." A day is a 14-minute cycle; the stage persists as the max seen. */
  _price() {
    const st = this._frame('filling-station'), places = this._sys('places'), progress = this._sys('progress');
    if (!st || !places) return;
    const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 192;
    this._priceCanvas = canvas;
    const saved = progress && progress.flag ? (progress.flag('signage:price') | 0) : 0;
    this._priceStage = Math.max(0, Math.min(PRICE_STAGES - 1, saved));
    paintPrice(canvas.getContext('2d'), 256, 192, this._priceStage, mulberry(77 + this._priceStage));
    const tex = new THREE.CanvasTexture(canvas); tex.colorSpace = THREE.NoColorSpace; tex.anisotropy = 4; this.textures.push(tex); this._priceTex = tex;
    const mat = places.matBody.clone(); mat.map = tex; mat.bumpScale = 0; mat.name = 'signage-price'; this.materials.push(mat);
    const w = 1.8, h = 1.3, x = st.wx(6.6, -7.125), z = st.wz(6.6, -7.125), y = st.padY + 6.6;
    const g = new THREE.PlaneGeometry(w, h);
    g.setAttribute('color', new THREE.Float32BufferAttribute(Array(g.attributes.position.count * 3).fill(1), 3));
    g.rotateY(st.yaw); g.translate(x, y, z); this.geometries.push(g);
    const m = new THREE.Mesh(g, mat); m.name = 'signage-price'; m.receiveShadow = true; this.group.add(m); this.meshes.push(m);
    // its board, on the pylon post
    const k = new Kit(); k.box(w + 0.06, h + 0.06, 0.06, st.wx(6.6, -7.16), y, st.wz(6.6, -7.16), K_DARK, st.yaw);
    const mg = k.build(); projectPlaceSurfaceUVs(mg, 2.6); this.geometries.push(mg);
    const mm = new THREE.Mesh(mg, places.matBody); mm.name = 'signage-price-board'; mm.castShadow = true; mm.receiveShadow = true; this.group.add(mm); this.meshes.push(mm);
    const clock = this._sys('clock'); this._priceCycle = clock ? (clock.cycle | 0) : 0;
    this.fixed.push({ id: 'station:price', x: +x.toFixed(1), z: +z.toFixed(1), yaw: st.yaw });
  }

  step(dt) {
    // one integer compare a step; a repaint only when the clock has completed another cycle
    const clock = this._sys('clock'); if (!clock || !this._priceTex) return;
    const cyc = clock.cycle | 0;
    if (cyc === this._priceCycle) return;
    const advance = Math.max(0, cyc - this._priceCycle); this._priceCycle = cyc;
    const stage = Math.min(PRICE_STAGES - 1, this._priceStage + advance);
    if (stage === this._priceStage) return;
    this._priceStage = stage;
    paintPrice(this._priceCanvas.getContext('2d'), 256, 192, stage, mulberry(77 + stage));
    this._priceTex.needsUpdate = true;
    const progress = this._sys('progress'); if (progress && progress.flag) progress.flag('signage:price', stage);
  }

  state() {
    return {
      built: this._built, signs: this._signs.length, faces: this.counts.faces, clusters: this.counts.clusters,
      posters: this.counts.posters.slice(), plywood: this.counts.plywood, mile: this.counts.mile, fixed: this.counts.fixed,
      overlays: this.counts.overlays, banners: this.counts.banners, posts: this._posts.length,
      atlas: this.atlas || null, price: { stage: this._priceStage, cycle: this._priceCycle },
      late: this._late, notes: this.notes.slice(0, 8), fixedList: this.fixed.slice(),
    };
  }
  /** The free-standing posts, for the check tool's verge assertion. */
  posts() { return this._posts.slice(); }

  dispose() {
    const collision = this._sys('collision'); if (collision && collision.removeChunk) collision.removeChunk('signage');
    if (this.group.parent) this.group.parent.remove(this.group);
    for (const g of this.geometries) g.dispose();
    for (const m of this.materials) m.dispose();
    for (const t of this.textures) t.dispose();
    this.geometries.length = this.materials.length = this.textures.length = this.meshes.length = 0;
  }
}

export { PAINT as SIGN_STYLES, MILE_WORDS, POSTER_STAGE, PRICE_STAGE };
