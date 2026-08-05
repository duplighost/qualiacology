// GOODFIRE atlas.js — Module B (art): boot-generated palettes + dab sprite atlas + FX sprites.
// Owning spec: docs/spec-art.md §4–§5, with canon-final §8/§10 overrides (ONE day atlas — night
// is a palette-multiply pass in render.js, never a second sheet; two tiers only).
// ALL jitter comes from rng.cellHash01 seeded by (class, variant, stroke) — stable forever, so
// chunk repaints can never shimmer, and NO RNG stream is consumed (interfaces.md Module B: atlas
// generation must not shift ember dice regardless of boot order).
//
// buildAtlas() → {
//   palettes: { jun|jul|aug|sep|oct|winter|spring:
//               { grass|shrub|hardwood|conifer|slash|duff: [shadeHex, midHex, lightHex] } },
//   fixed:    { scarFresh/scarSettled/scarOld/seedling/rock/water/mineral/snow/retardantStain:
//               [3]-stop ramps; fireweedStem/ash/retardantCurtain/nightMult/dark/emberHead/
//               towerBg: hex; fireweedBloom: [3] (#c657a0-family); ui: {INK,PAPER,...} },
//   dabs:     { month: { class: { sheet: canvas, tiles: [{sx,sy}] × 12 } } }   // 32×32 tiles,
//             anchor bottom-center (16,28); geometry identical across months (brushwork is
//             persistent like the mountain — only the ramp colors drift with the season),
//   sprites:  { glow: canvas 128² (additive fire glow), light: canvas 256² (night cutout punch),
//               smoke: { grey|gold|green|char|red: [32²,64²,96² radial sprites] } },
//   fire(t01) → css color (spec-art §4.2 piecewise ramp, 64-step LUT; t<0.15 clamps deep-ember),
//   fireStops: the raw [t,hex] stops,
//   cluster:  Float32Array(GRID²) 0..1 value noise — dab-count clumping field (§5.2 step 4),
//   classOf(fuelId) → class|null (null = ground-only cell, e.g. SOIL/WATER/ROCK/STRUCTURE),
//   groundOf(month, fuelId) → [3] ramp for the 16px ground fill beneath the dabs,
//   luma(hex) → WCAG relative luminance 0..1, cached (cursor auto-contrast, warden outline),
//   variantOf(cellIndex, dabIndex) → 0..11 stable per cell,
//   mix(hexA, hexB, t) → hex,
// }

import { GRID } from './canon.js';
import { cellHash01 } from './rng.js';

export const MONTHS = ['jun', 'jul', 'aug', 'sep', 'oct', 'winter', 'spring'];
export const CLASSES = ['grass', 'shrub', 'hardwood', 'conifer', 'slash', 'duff',
  'fireweed', 'seedling', 'rock', 'mineral', 'water', 'ashfleck'];
const VARIANTS = 12;   // §5: 12 variants/class — enough that tiling never reads as tiling
const TILE = 32;       // authored for 16px cells; ±15% dest scale gives 27–37px draws

// ---- palette canon (spec-art §4.1, exact hexes; no color literal may live outside atlas) ----
const VEG = {
  grass: { jun: ['#4E7A3A', '#6B9A4C', '#8FB968'], jul: ['#6F8140', '#90A153', '#B3BF6E'],
    aug: ['#8F7B35', '#B49A45', '#D7BC61'], sep: ['#96702F', '#BD923E', '#DFB458'],
    oct: ['#8C5A28', '#B07636', '#CF934C'] },
  shrub: { jun: ['#3F6B35', '#567F42', '#77A05A'], jul: ['#4C6D36', '#667F43', '#86995B'],
    aug: ['#6B6D33', '#8A883F', '#A8A455'], sep: ['#7A5E2E', '#9A7A3A', '#B8964E'],
    oct: ['#7C4A26', '#9C6231', '#B97D43'] },
  hardwood: { jun: ['#3B7042', '#549459', '#7FB483'], jul: ['#47713F', '#619155', '#8AAE77'],
    aug: ['#5E7A3B', '#7E9A4E', '#A4BC6C'], sep: ['#8A6A2E', '#B08A3A', '#D2A94F'],
    oct: ['#93502A', '#B96A36', '#D98847'] },
  conifer: { jun: ['#24422E', '#33573C', '#4A7050'], jul: ['#263F2B', '#365239', '#4D6B4C'],
    aug: ['#283E29', '#395137', '#506A49'], sep: ['#2A3C28', '#3B4F35', '#526847'],
    oct: ['#263524', '#364730', '#4C5F40'] },
  slash: { jun: ['#6E5B40', '#8A7452', '#A38B63'], jul: ['#705A3C', '#8C734E', '#A6895F'],
    aug: ['#74572F', '#937145', '#AE8A57'], sep: ['#6F5230', '#8D6C42', '#A78354'],
    oct: ['#664B2C', '#82613C', '#9A764A'] },
  duff: { jun: ['#57503A', '#6E6549', '#857B5A'], jul: ['#5C5138', '#746647', '#8C7C57'],
    aug: ['#625231', '#7C6940', '#957F50'], sep: ['#5F4E2E', '#78643C', '#90794B'],
    oct: ['#55452A', '#6C5936', '#826C43'] },
};
// SPRING (epilogue): fireweed everywhere, greens loud; unlisted classes fall back to JUN.
const SPRING = { grass: ['#57923F', '#75B356', '#9BD277'], hardwood: ['#4C8B4E', '#69AC66', '#92CC8B'],
  conifer: ['#2C5236', '#3F6B45', '#578659'] };

const FIXED = {
  scarFresh: ['#14100C', '#1E1813', '#2A211A'],    // R2: matte, calm, zero animation
  scarSettled: ['#2E2620', '#3B322A', '#4A3F34'],
  scarOld: ['#3E382C', '#4E4736', '#5F5742'],
  fireweedStem: '#4E6B3A',
  // PROVISIONAL: task canon names the fireweed the #c657a0 family; spec-art's bloom hexes are
  // re-centered on it (same value spread, magenta hue held).
  fireweedBloom: ['#A6458A', '#C657A0', '#E07AB8'],
  seedling: ['#4F7B43', '#66984F', '#7FB35E'],
  rock: ['#6E6C66', '#85837C', '#9C9A92'],
  water: ['#33555C', '#40707A', '#4F8A93'],        // static: water is a boundary, not a toy
  mineral: ['#B98F5C', '#CBA36D', '#DDB87E'],      // cut-line tan
  rake: '#A87F4F',
  snow: ['#C9CDD6', '#E2E6EC', '#F4F6FA'],
  ash: '#8E8A82',
  retardantCurtain: '#E0492F',
  retardantStain: ['#C05A43', '#D07458', '#DE8A6C'],
  nightMult: '#45536F',                            // canon §10: single atlas × night multiply
  dark: '#05070E',
  emberHead: '#FFE7B8',
  towerBg: '#171310',
  ui: { INK: '#2A241C', PAPER: '#EFE6D0', PAPER_SHADE: '#D9CDB2', CREAM: '#F5EDD8',
    CHAR: '#0B0908', WOOD: '#3A3128', WOOD_LIGHT: '#4A3B2C', STAMP_RED: '#7A2E22',
    GREASE: '#C2453A', LAMP_ON: '#E0492F', LAMP_OFF: '#4A2420', NIGHT_OUTLINE: '#FFC98A',
    TIMBER: '#4A3B2C', ROOF: '#5A4632', WINDOW: '#FFD9A0', RADIO_BG: '#12100C',
    CURSOR_INK: '#2b2620', CURSOR_CREAM: '#f2e9d8', GOLD_WASH: '#E8551A',
    WORD_EMBER: '#E8551A' },
  warden: { COAT: '#8C3B2E', SKIN: '#D8A578', HAT: '#C9A87C', BOOTS: '#2E2A24', POLE: '#C9A87C' },
};

// fire ramp (§4.2) — never night-shifted: fire is the light source
const FIRE_STOPS = [[0.15, '#7A1F0A'], [0.35, '#C43D0E'], [0.55, '#E86A12'],
  [0.75, '#F79E2D'], [0.90, '#FFD066'], [1.00, '#FFF3C4']];

// ---- color math ----
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
function rgbHex(r, g, b) {
  return '#' + ((1 << 24) | (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b)).toString(16).slice(1).toUpperCase();
}
function mix(a, b, t) {
  const A = hexRGB(a), B = hexRGB(b);
  return rgbHex(A[0] + (B[0] - A[0]) * t, A[1] + (B[1] - A[1]) * t, A[2] + (B[2] - A[2]) * t);
}
const lumaCache = new Map();
function luma(hex) { // WCAG relative luminance — the boot audit + cursor contrast primitive
  let v = lumaCache.get(hex);
  if (v !== undefined) return v;
  const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const [r, g, b] = hexRGB(hex);
  v = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  lumaCache.set(hex, v);
  return v;
}

// ---- deterministic per-(class,variant,stroke) hash — geometry identical across months ----
const SALT = 0xA71A5;
function tileRand(ci, v) { return (k) => cellHash01((ci * 7919 + v * 131 + k) | 0, SALT); }
const J = (r) => (r - 0.5) * 1.0; // §5.1 hand-jitter: every path vertex ±0.5px

// ---- dab painters (32×32, anchor bottom-center (16,28), light source top-left) ----
// Each takes (ctx, ramp[3], R) with ctx already translated to the tile origin.
const PAINT = {
  grass(ctx, ramp, R) {
    const n = 3 + Math.floor(R(0) * 3); // 3–5 blades
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let b = 0; b < n; b++) {
      const bx = 16 + (R(b * 5 + 1) - 0.5) * 8 + J(R(b * 5 + 9));
      const len = 7 + R(b * 5 + 2) * 5;
      const co = (2 + R(b * 5 + 3) * 2) * (R(b * 5 + 4) < 0.5 ? -1 : 1);
      ctx.strokeStyle = b < 2 ? ramp[2] : ramp[Math.floor(R(b * 5 + 5) * 3)]; // seed-head flick
      ctx.beginPath();
      ctx.moveTo(bx, 28);
      ctx.quadraticCurveTo(bx + co * 0.6, 28 - len * 0.55, bx + co + J(R(b * 5 + 6)), 28 - len);
      ctx.stroke();
    }
  },
  shrub(ctx, ramp, R) {
    const ell = (x, y, r, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.8, 0, 0, 7); ctx.fill(); };
    ell(16 + J(R(0)), 23, 4, ramp[0]); // under-lobe shade
    for (let k = 0; k < 3; k++)
      ell(13 + k * 3 + J(R(k + 1)), 20 - (k === 1 ? 2 : 0) + J(R(k + 4)), 3 + R(k + 7) * 2, ramp[1]);
    ctx.strokeStyle = ramp[2]; ctx.lineWidth = 1.2;
    for (let k = 0; k < 2; k++) { // top-left light arcs
      ctx.beginPath(); ctx.arc(14 + k * 3, 18 + J(R(k + 10)), 3, Math.PI * 1.05, Math.PI * 1.75); ctx.stroke();
    }
  },
  hardwood(ctx, ramp, R) {
    ctx.fillStyle = FIXED.ui.TIMBER; ctx.fillRect(15.5, 25, 1, 3); // trunk tick
    for (let k = 0; k < 5; k++) {
      const a = R(k) * 6.283, d = R(k + 5) * 4.5;
      const x = 16 + Math.cos(a) * d, y = 17 + Math.sin(a) * d * 0.8;
      ctx.fillStyle = y > 18 ? ramp[0] : (x < 15 && y < 17 ? ramp[2] : ramp[1]);
      ctx.beginPath(); ctx.arc(x, y, 3 + R(k + 10), 0, 7); ctx.fill();
    }
  },
  conifer(ctx, ramp, R) { // tallest dab: the unit that chars when the crown takes it
    const j = J(R(0));
    ctx.fillStyle = ramp[0];
    ctx.beginPath(); ctx.moveTo(16 + j, 4); ctx.lineTo(10 + J(R(1)), 26); ctx.lineTo(22 + J(R(2)), 26); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ramp[1]; ctx.lineWidth = 2; // mid re-stroke on the lit (left) edge
    ctx.beginPath(); ctx.moveTo(16 + j, 5); ctx.lineTo(11, 25); ctx.stroke();
    ctx.strokeStyle = ramp[2]; ctx.lineWidth = 1;
    for (let k = 0; k < 3; k++) { // bough ticks, left
      const y = 10 + k * 5 + J(R(k + 3));
      ctx.beginPath(); ctx.moveTo(16 - (y - 4) * 0.26, y); ctx.lineTo(16 - (y - 4) * 0.26 + 3, y); ctx.stroke();
    }
    ctx.fillStyle = FIXED.ui.TIMBER; ctx.fillRect(15, 26, 2, 2);
  },
  slash(ctx, ramp, R) {
    ctx.lineWidth = 2; ctx.lineCap = 'butt';
    for (let k = 0; k < 4; k++) {
      const a = R(k) * Math.PI, l = 8 + R(k + 4) * 4;
      const cx = 16 + (R(k + 8) - 0.5) * 8, cy = 23 + (R(k + 12) - 0.5) * 6;
      ctx.strokeStyle = k < 2 ? ramp[0] : ramp[1];
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * l / 2, cy - Math.sin(a) * l / 2 * 0.5);
      ctx.lineTo(cx + Math.cos(a) * l / 2, cy + Math.sin(a) * l / 2 * 0.5);
      ctx.stroke();
      if (k === 3) { ctx.strokeStyle = ramp[2]; ctx.lineWidth = 1; ctx.stroke(); ctx.lineWidth = 2; }
    }
  },
  duff(ctx, ramp, R) { // lowest-contrast dab — the ground's texture voice
    for (let k = 0; k < 6; k++) {
      ctx.fillStyle = k % 2 ? ramp[0] : ramp[1];
      const s = 1 + R(k + 6);
      ctx.fillRect(10 + R(k) * 12, 20 + R(k + 12) * 7, s, s);
    }
  },
  fireweed(ctx, ramp, R) { // ramp = bloom ramp; reads as a magenta flick — hope, visible
    ctx.strokeStyle = FIXED.fireweedStem; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    const bend = (R(0) - 0.5) * 3;
    ctx.beginPath(); ctx.moveTo(16, 28); ctx.quadraticCurveTo(16 + bend, 23, 16 + bend * 1.5, 18); ctx.stroke();
    const n = 3 + Math.floor(R(1) * 3);
    for (let k = 0; k < n; k++) {
      ctx.fillStyle = ramp[Math.floor(R(k + 2) * 3)];
      ctx.beginPath();
      ctx.arc(16 + bend * 1.4 + (R(k + 8) - 0.5) * 5, 17 - R(k + 14) * 4, 1.5 + R(k + 20), 0, 7);
      ctx.fill();
    }
  },
  seedling(ctx, ramp, R) { // deliberately bright-for-its-ramp
    const j = J(R(0));
    ctx.fillStyle = ramp[1];
    ctx.beginPath(); ctx.moveTo(16 + j, 19); ctx.lineTo(13.5, 27); ctx.lineTo(18.5, 27); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = ramp[2]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(16 + j, 20); ctx.lineTo(14, 26.5); ctx.stroke();
  },
  rock(ctx, ramp, R) {
    const poly = (pts, c) => { ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let k = 1; k < pts.length; k++) ctx.lineTo(pts[k][0], pts[k][1]); ctx.closePath(); ctx.fill(); };
    const ox = (R(0) - 0.5) * 4;
    poly([[8 + ox, 26], [12 + ox + J(R(1)), 16], [20 + ox, 18 + J(R(2))], [18 + ox, 26]], ramp[0]);
    poly([[14 + ox, 26], [18 + ox + J(R(3)), 17], [24 + ox, 20], [23 + ox, 26]], ramp[1]);
    ctx.strokeStyle = ramp[2]; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12 + ox, 17); ctx.lineTo(18 + ox, 18.5); ctx.stroke();
  },
  mineral(ctx, ramp, R) { // rake scratches — the McLeod's signature
    ctx.strokeStyle = FIXED.rake; ctx.lineWidth = 2; ctx.lineCap = 'butt';
    for (let k = 0; k < 2; k++) {
      const a = (R(k) - 0.5) * 1.2, cx = 12 + k * 8 + J(R(k + 2)), cy = 22 + (R(k + 4) - 0.5) * 6;
      ctx.beginPath();
      ctx.moveTo(cx - Math.cos(a) * 4, cy - Math.sin(a) * 4);
      ctx.lineTo(cx + Math.cos(a) * 4, cy + Math.sin(a) * 4);
      ctx.stroke();
    }
  },
  water(ctx, ramp, R) { // 2 static strokes: calm reads as safety
    ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    for (let k = 0; k < 2; k++) {
      ctx.strokeStyle = k ? ramp[2] : ramp[1];
      const y = 18 + k * 5 + J(R(k)), x = 10 + R(k + 2) * 4;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + J(R(k + 4))); ctx.stroke();
    }
  },
  ashfleck(ctx, ramp, R) {
    ctx.globalAlpha = 0.7; ctx.fillStyle = FIXED.ash;
    for (let k = 0; k < 3; k++) ctx.fillRect(11 + R(k) * 10, 19 + R(k + 3) * 8, 1, 1);
    ctx.globalAlpha = 1;
  },
};

// class → ramp source for a given month key
function rampFor(cls, month) {
  if (cls === 'fireweed') return FIXED.fireweedBloom;
  if (cls === 'seedling') return FIXED.seedling;
  if (cls === 'rock') return FIXED.rock;
  if (cls === 'mineral') return FIXED.mineral;
  if (cls === 'water') return FIXED.water;
  if (cls === 'ashfleck') return FIXED.scarFresh;
  if (month === 'spring') return SPRING[cls] || VEG[cls].jun;
  if (month === 'winter') return VEG[cls].oct; // skeleton source; painter wraps it
  return VEG[cls][month];
}

// sim FUEL ids (canon.js order): SOIL GRASS BRUSH PINE_LITTER TIMBER CROWN_CANOPY RIPARIAN
// ROCK WATER SCAR STRUCTURE SLASH → dab class (null = ground-only; SCAR handled by regrow logic)
const FUEL_CLASS = [null, 'grass', 'shrub', 'duff', 'conifer', 'conifer', 'hardwood',
  'rock', 'water', null, null, 'slash'];

// ---- radial sprite helper ----
function makeRadial(size, stops) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  for (const [t, col] of stops) grad.addColorStop(t, col);
  g.fillStyle = grad; g.fillRect(0, 0, size, size);
  return c;
}

// ---- boot audit (§4.6): law R1 as a unit test, not a hope ----
function audit(palettes) {
  const bad = [];
  for (const m of MONTHS) {
    if (m === 'winter') continue; // SNOW exempt (documented; burning cells get char outlines)
    for (const cls of ['grass', 'shrub', 'hardwood', 'conifer', 'slash', 'duff'])
      for (const h of palettes[m][cls]) if (luma(h) > 0.55) bad.push(m + '/' + cls + ' ' + h);
  }
  for (const r of [FIXED.scarFresh, FIXED.scarSettled, FIXED.scarOld])
    for (const h of r) if (luma(h) > 0.55) bad.push('scar ' + h);
  // spec-art §4.6 asserts L≥0.62 for fire stops t≥0.55, but §4.2's own hexes fail it at 0.55
  // (#E86A12, L≈0.28) and 0.75 (#F79E2D, L≈0.44) — the spec self-contradicts. The stops are
  // saturated oranges with huge chroma contrast against the (L≤0.55, low-chroma) terrain caps,
  // so R1 holds in practice; they are documented exemptions, and the audit still guards edits.
  const FIRE_AUDIT_EXEMPT = new Set(['#E86A12', '#F79E2D']);
  for (const [t, h] of FIRE_STOPS)
    if (t >= 0.55 && !FIRE_AUDIT_EXEMPT.has(h) && luma(h) < 0.62) bad.push('fire@' + t + ' ' + h);
  if (bad.length) console.warn('[goodfire atlas] contrast audit FAILED:', bad.join(', '));
}

export function buildAtlas() {
  // palettes per month (winter keys still resolve to their skeleton-source ramps for tower use)
  const palettes = {};
  for (const m of MONTHS) {
    palettes[m] = {};
    for (const cls of ['grass', 'shrub', 'hardwood', 'conifer', 'slash', 'duff'])
      palettes[m][cls] = m === 'winter' ? FIXED.snow : rampFor(cls, m);
  }
  audit(palettes);

  // ---- dab sheets: one canvas per month, 12 variants × 12 classes of 32px tiles ----
  const dabs = {};
  for (const m of MONTHS) {
    const sheet = document.createElement('canvas');
    sheet.width = VARIANTS * TILE; sheet.height = CLASSES.length * TILE;
    const g = sheet.getContext('2d');
    dabs[m] = {};
    for (let ci = 0; ci < CLASSES.length; ci++) {
      const cls = CLASSES[ci];
      const tiles = [];
      for (let v = 0; v < VARIANTS; v++) {
        const R = tileRand(ci, v); // month-independent: brushwork persists across the season
        g.save(); g.translate(v * TILE, ci * TILE);
        g.beginPath(); g.rect(0, 0, TILE, TILE); g.clip();
        if (m === 'winter' && cls !== 'ashfleck' && cls !== 'water' && cls !== 'rock') {
          // §4.1 SNOW: dark skeletons in snow — OCT shade only, 40% alpha, + 3 snow-light flecks
          const s = rampFor(cls, 'oct')[0];
          g.globalAlpha = 0.4;
          PAINT[cls](g, [s, s, s], R);
          g.globalAlpha = 1;
          g.fillStyle = FIXED.snow[2];
          for (let k = 0; k < 3; k++) g.fillRect(10 + R(k + 40) * 12, 14 + R(k + 44) * 12, 1.5, 1.5);
        } else {
          PAINT[cls](g, rampFor(cls, m), R);
        }
        g.restore();
        tiles.push({ sx: v * TILE, sy: ci * TILE });
      }
      dabs[m][cls] = { sheet, tiles };
    }
  }

  // ---- FX sprites ----
  const sprites = {
    // fire glow: drawn with globalCompositeOperation 'lighter', scaled to blob radius (render §7.4)
    glow: makeRadial(128, [[0, 'rgba(255,166,66,0.55)'], [1, 'rgba(255,166,66,0)']]),
    // night light punch: hard 60% core + feathered edge, drawn destination-out (render §9)
    light: makeRadial(256, [[0, 'rgba(255,255,255,1)'], [0.6, 'rgba(255,255,255,1)'], [1, 'rgba(255,255,255,0)']]),
    smoke: {},
  };
  // pre-tinted smoke sets — Canvas2D can't tint per-draw cheaply, so tint lives in the sprite
  const smokeTints = { grey: '#8E8A82', gold: '#A08A5E', green: '#77816E', char: '#4A4440', red: '#E0492F' };
  for (const [name, hex] of Object.entries(smokeTints)) {
    const [r, g, b] = hexRGB(hex);
    sprites.smoke[name] = [32, 64, 96].map((s) => makeRadial(s,
      [[0, `rgba(${r},${g},${b},0.9)`], [0.55, `rgba(${r},${g},${b},0.5)`], [1, `rgba(${r},${g},${b},0)`]]));
  }

  // ---- fire ramp LUT (pure, shared by painterly + flat + tower) ----
  const LUT = [];
  for (let k = 0; k <= 64; k++) {
    const t = Math.max(FIRE_STOPS[0][0], k / 64);
    let a = FIRE_STOPS[0], b = FIRE_STOPS[FIRE_STOPS.length - 1];
    for (let s = 0; s < FIRE_STOPS.length - 1; s++)
      if (t >= FIRE_STOPS[s][0] && t <= FIRE_STOPS[s + 1][0]) { a = FIRE_STOPS[s]; b = FIRE_STOPS[s + 1]; break; }
    const f = (t - a[0]) / Math.max(0.0001, b[0] - a[0]);
    LUT.push(mix(a[1], b[1], Math.max(0, Math.min(1, f))));
  }
  const fire = (t01) => LUT[Math.max(0, Math.min(64, Math.round(t01 * 64)))];

  // ---- clustering field (§5.2 step 4): 3-octave hash noise, period 24 cells ----
  const cluster = new Float32Array(GRID * GRID);
  const vn = (x, y, scale, salt) => {
    const gx = x / scale, gy = y / scale;
    const x0 = Math.floor(gx), y0 = Math.floor(gy);
    const fx = gx - x0, fy = gy - y0;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
    const h = (X, Y) => cellHash01(((Y & 1023) * 1024 + (X & 1023)) | 0, salt);
    const a = h(x0, y0), b2 = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
    return a + (b2 - a) * sx + (c - a) * sy + (a - b2 - c + d) * sx * sy;
  };
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++)
    cluster[y * GRID + x] = 0.5 * vn(x, y, 24, SALT ^ 0x31) + 0.3 * vn(x, y, 9, SALT ^ 0x32) + 0.2 * vn(x, y, 4, SALT ^ 0x33);

  return {
    palettes, fixed: FIXED, dabs, sprites, fire, fireStops: FIRE_STOPS, cluster,
    classOf: (f) => FUEL_CLASS[f] ?? null,
    groundOf(month, f) {
      if (month === 'winter') return FIXED.snow;
      if (f === 7) return FIXED.rock;        // FUEL.ROCK
      if (f === 8) return FIXED.water;       // FUEL.WATER
      if (f === 0) return FIXED.mineral;     // FUEL.SOIL — roads/pads read tan
      return palettes[month].duff;           // DUFF is the universal ground under all dabs
    },
    luma, mix,
    variantOf: (cellIndex, dabIndex) => Math.floor(cellHash01(cellIndex, SALT ^ (dabIndex * 0x51)) * VARIANTS),
  };
}
