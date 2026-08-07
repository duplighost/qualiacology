// GOODFIRE render.js — Module B (art): the layered renderer.
// Owning spec: docs/spec-art.md, with canon-final §8/§10 overrides binding where they conflict:
// exactly TWO tiers (GROUND 16 / TOWER 4 px per tile), NO full-screen flashes ever, no camera
// dead zone (camera is Module A's; we only read it), trauma applied to world layers only
// (never UI), night = darkness overlay + additive light cutouts over a single day atlas
// with a palette-multiply pass, TAB = fuel-load lens.
//
// Layer stack (DOM canvases, bottom → top; law R1 — the front is king — is compositing order):
//   terrain (opaque; month offscreen blit + night multiply)  <  smoke (half-res)  <
//   night (half-res darkness + cutouts)  <  fire (beds/licks/glow/embers/retardant/verb fx)  <
//   ui (warden, HUD, text registers, cursor — never shaken, never darkened).
//
// Performance contract (60 fps @1920×1080 on a 2015 laptop):
//   terrain = ONE drawImage of a pre-rendered full-map offscreen (5120², repainted only per
//   dirty 16×16 chunk, amortized); fire effects walk the VISIBLE cell rect only (never the
//   whole grid at GROUND; at TOWER the rect is the map, which is one Uint8 scan); every
//   particle is pooled; glow is per light-blob (8×8 cell grid), capped, never per cell.
//
// PROVISIONAL constants are marked inline and listed in the module summary.

import { GRID, CELLS, FUEL, S, FLAG, SPREAD, BACKBURN, CROWN, EMBER, RETARDANT,
         F_INTENSITY, F_CUTSPEED, F_BURNABLE } from './canon.js';
import { cellHash01, mulberry32 } from './rng.js';
import { buildAtlas, MONTHS } from './atlas.js';

// ---- tier / layout ----
const PT_GROUND = 16;            // canon-final §8: two tiers only
const FLAT_PT = 9;               // PROVISIONAL: below 9 px/tile the painterly blit is mush —
                                 // swap to the tower flat board (the 110 ms zoom lerp makes
                                 // this a two-frame handoff, never a visible pop-hold)
const CHUNK = 16, NCHUNK = GRID / CHUNK; // matches sim.dirty's 20×20 of 16×16
const MAPPX = GRID * PT_GROUND;  // 5120 — the full-map ground offscreen edge

// ---- budgets (spec-art §3.2/§7, adapted) ----
const LICK_BUDGET = 600;         // flame licks/frame; ungranted cells render bed-only (R1:
                                 // licks concentrate where it burns worst)
const GLOW_CAP = 48;             // blob glows/frame, brightest first
const CUTOUT_CAP = 48;           // night light cutouts (+warden = 49)
const SMOKE_POOL = 1000;         // PROVISIONAL (spec's 1200 trimmed: two-tier scope)
const SMOKE_SPAWN_S = 140;       // global spawn cap /s
const REPAINT_CHUNKS = 6;        // amortized chunk repaints/frame (~0.3–2 ms each)
const AFTERGLOW_S = 4;           // PROVISIONAL: sim keeps no heat on scars; render owns the
                                 // afterglow decay (R2: it dies within the fire that made it)

// ---- fire intensity normalization (mirrors sim.intensityOf; render-side read model) ----
const I01_NORM = 2.4;            // PROVISIONAL: divisor placing kernel-measured raw intensity
                                 // on the visual tier scale — grass ≈0.35 (SURFACE), timber
                                 // ≈0.59 (ACTIVE), slash ≈0.78 (cap), crown ≥0.82 (floor)
const SURFACE_CAP = 0.78;        // non-crowning can NEVER enter the crown visual tier and
const CROWN_FLOOR = 0.82;        // crowning can never fall below it — "unmistakably bigger"
                                 // is enforced, not hoped for

// ---- type (spec-art §15: system stacks only, two voices) ----
const SERIF = "Georgia,'Palatino Linotype','Times New Roman',serif";
const MONO = "Consolas,'Cascadia Mono','Courier New',monospace";

const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const TAU = Math.PI * 2;

// tracked text: tracking implemented by per-character advance (one shared helper — §15)
function drawTracked(ctx, str, x, y, track, align = 'center') {
  let total = 0; const ws = [];
  for (const ch of str) { const w = ctx.measureText(ch).width + track; ws.push(w); total += w; }
  total -= track;
  let cx = align === 'center' ? x - total / 2 : align === 'right' ? x - total : x;
  let k = 0;
  for (const ch of str) { ctx.fillText(ch, cx, y); cx += ws[k++]; }
  return total;
}

export function createRenderer(container, sim, mapData) {
  const atlas = buildAtlas();
  const UI = atlas.fixed.ui;
  const fire = atlas.fire;
  const feel = mulberry32(0xF3E1D2); // local cosmetic stream — NEVER the sim streams
  const { fuel, load, moisture, heat, state, stateTimer, flags, retard, regrow,
          burnSeverity, zoneId, structures, embers, wind } = sim;
  const ZN = mapData.ZONE_NAMES || [];

  // ---- stage: canon-final §8 — 1280×800 logical design, letterbox-free, DPR-aware ----
  let W = 0, H = 0, dpr = 1;
  let titleCache = null; // wordmark edge points are W-fitted; resize() invalidates
  if (!container.style.position) container.style.position = 'relative';
  container.style.cursor = 'none'; // custom cursor is drawn on ui (spec-verbs §4)
  function makeLayer(name, half, opaque) {
    const c = document.createElement('canvas');
    c.dataset.gfLayer = name;
    c.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;';
    container.appendChild(c);
    return { c, g: c.getContext('2d', { alpha: !opaque }), half: !!half };
  }
  const L = {
    terrain: makeLayer('terrain', false, true),
    smoke: makeLayer('smoke', true),
    night: makeLayer('night', true),
    fire: makeLayer('fire', false),
    ui: makeLayer('ui', false),
  };
  function resize() {
    W = Math.max(64, container.clientWidth || 1280);
    H = Math.max(64, container.clientHeight || 800);
    dpr = (typeof devicePixelRatio === 'number' ? devicePixelRatio : 1) || 1;
    for (const k of Object.keys(L)) {
      const l = L[k];
      if (l.half) { // half-res: soft gradients; 4× fewer pixels is the big fill-rate win
        l.c.width = Math.ceil(W / 2); l.c.height = Math.ceil(H / 2);
        l.g.setTransform(1, 0, 0, 1, 0, 0);
      } else {
        l.c.width = Math.round(W * dpr); l.c.height = Math.round(H * dpr);
        l.g.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
    }
    titleCache = null; // wordmark is W-fitted
  }
  resize();

  // ---- offscreens ----
  const mapC = document.createElement('canvas'); mapC.width = mapC.height = MAPPX;
  const mctx = mapC.getContext('2d', { alpha: false });
  const towerC = document.createElement('canvas'); towerC.width = towerC.height = GRID;
  const towerG = towerC.getContext('2d');
  const towerData = towerG.createImageData(GRID, GRID);
  let towerStale = true;
  const lensC = document.createElement('canvas'); lensC.width = lensC.height = GRID;
  const lensG = lensC.getContext('2d');

  // ---- month state + flat-color token tables ----
  // tokens: 0..11 fuel mid colors · 12..15 scar by regrow · 16 line · 17 structure ink
  let month = 'jun';
  const tokenCss = new Array(18);
  const tokenRGB = new Uint8Array(18 * 3);
  const tokenLuma = new Float32Array(18);
  function rebuildTokens() {
    const P = atlas.palettes[month], F = atlas.fixed;
    const t = new Array(18);
    t[FUEL.SOIL] = F.mineral[1];
    t[FUEL.GRASS] = P.grass[1]; t[FUEL.BRUSH] = P.shrub[1];
    t[FUEL.PINE_LITTER] = P.duff[1]; t[FUEL.TIMBER] = P.conifer[1];
    t[FUEL.CROWN_CANOPY] = P.conifer[0]; t[FUEL.RIPARIAN] = P.hardwood[1];
    t[FUEL.ROCK] = F.rock[1]; t[FUEL.WATER] = F.water[1];
    t[FUEL.SCAR] = F.scarFresh[1]; t[FUEL.STRUCTURE] = UI.INK; t[FUEL.SLASH] = P.slash[1];
    t[12] = F.scarFresh[1];
    t[13] = atlas.mix(F.scarOld[1], F.fireweedBloom[1], 0.35); // fireweed-tinged black
    t[14] = atlas.mix(F.scarOld[1], F.seedling[1], 0.45);      // shrub green
    t[15] = F.seedling[0];                                     // thicket-planted
    t[16] = F.mineral[1];
    t[17] = UI.INK;
    for (let k = 0; k < 18; k++) {
      tokenCss[k] = t[k];
      const n = parseInt(t[k].slice(1), 16);
      tokenRGB[k * 3] = n >> 16 & 255; tokenRGB[k * 3 + 1] = n >> 8 & 255; tokenRGB[k * 3 + 2] = n & 255;
      tokenLuma[k] = atlas.luma(t[k]);
    }
  }
  function cellToken(i) {
    if (flags[i] & FLAG.LINE) return 16;
    if (state[i] === S.SCAR || fuel[i] === FUEL.SCAR) return 12 + Math.min(3, regrow[i]);
    if (fuel[i] === FUEL.STRUCTURE) return 17;
    return fuel[i];
  }

  // ---- structures: recognizable procedural silhouettes, baked into terrain chunks ----
  // Front-elevation billboards (roofs from above are anonymous; silhouettes are names).
  function structKind(key) {
    if (key === 'lookout') return 'tower';
    if (key === 'relayHut') return 'mast';
    if (key === 'propane') return 'bottle';
    if (key === 'burner') return 'burner';
    if (key === 'church') return 'church';
    if (key === 'mercantile') return 'falsefront';
    if (key === 'school') return 'school';
    if (key === 'grange') return 'grange';
    if (key === 'firehouse') return 'firehouse';
    if (key === 'depot') return 'depot';
    if (key === 'weaverBarn' || key === 'hayBarn') return 'barn';
    if (key === 'sawShed' || key === 'planerShed' || key === 'dryingShed') return 'longshed';
    if (key === 'tinShed' || key === 'sextonShed' || key === 'cobbShed' || key === 'millOffice') return 'shed';
    return 'house'; // weaverHouse, tinBunk, northHouse*, millRowHouse*
  }
  function paintStruct(g, kind, w, h, charred, seed) {
    // charred variant: ~40% of strokes kept, char ramp, windows dark (persistence law)
    const R = (k) => cellHash01((seed * 53 + k) | 0, 0xB0B1);
    const wall = charred ? atlas.fixed.scarFresh[2] : UI.INK;
    const timb = charred ? atlas.fixed.scarFresh[1] : UI.TIMBER;
    const roof = charred ? atlas.fixed.scarFresh[0] : UI.ROOF;
    const win = UI.WINDOW;
    const keep = (k) => !charred || R(k + 60) < 0.4;
    const base = h - 2, cx = w / 2;
    g.lineWidth = 2; g.lineCap = 'butt';
    const rect = (x, y, rw, rh, c) => { g.fillStyle = c; g.fillRect(x, y, rw, rh); };
    const tri = (x0, y0, x1, y1, x2, y2, c) => { g.fillStyle = c; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.lineTo(x2, y2); g.closePath(); g.fill(); };
    switch (kind) {
      case 'tower': { // 4 splayed legs, X-braces, cab with window band, pyramid roof
        g.strokeStyle = timb;
        for (const sgn of [-1, 1]) {
          g.beginPath(); g.moveTo(cx + sgn * 5, base - 62); g.lineTo(cx + sgn * 13, base); g.stroke();
          g.beginPath(); g.moveTo(cx + sgn * 3, base - 62); g.lineTo(cx + sgn * 8, base); g.stroke();
        }
        for (let k = 0; k < 3; k++) {
          const y = base - 14 - k * 16, spread = 13 - k * 2.6;
          if (!keep(k)) continue;
          g.beginPath(); g.moveTo(cx - spread, y); g.lineTo(cx + spread, y - 12); g.stroke();
          g.beginPath(); g.moveTo(cx + spread, y); g.lineTo(cx - spread, y - 12); g.stroke();
        }
        rect(cx - 12, base - 76, 24, 14, wall);                 // cab
        if (!charred) rect(cx - 10, base - 73, 20, 5, win);     // 360° window band
        rect(cx - 14, base - 62, 28, 2, timb);                  // catwalk
        tri(cx - 13, base - 76, cx + 13, base - 76, cx, base - 86, roof);
        break;
      }
      case 'church': {
        tri(cx - 3, base - 26, cx + 11, base - 26, cx + 4, base - 36, roof);
        rect(cx - 3, base - 26, 14, 26, wall);                  // nave
        rect(cx - 12, base - 34, 8, 34, wall);                  // steeple
        tri(cx - 13, base - 34, cx - 3, base - 34, cx - 8, base - 46, roof);
        if (!charred) { rect(cx - 10, base - 30, 3, 6, win); rect(cx + 2, base - 18, 4, 6, win); }
        g.fillStyle = timb; g.fillRect(cx - 8.5, base - 48, 1.5, 3); // finial
        break;
      }
      case 'burner': { // wigwam burner — the unmistakable sawmill read
        tri(cx - 11, base, cx + 11, base, cx, base - 26, wall);
        g.fillStyle = timb; g.beginPath(); g.arc(cx, base - 25, 4, Math.PI, 0); g.fill(); // dome cap
        if (!charred) rect(cx - 2, base - 8, 4, 8, win);
        break;
      }
      case 'barn': { // gambrel roof
        rect(cx - 13, base - 14, 26, 14, wall);
        g.fillStyle = roof; g.beginPath();
        g.moveTo(cx - 14, base - 14); g.lineTo(cx - 8, base - 22); g.lineTo(cx, base - 25);
        g.lineTo(cx + 8, base - 22); g.lineTo(cx + 14, base - 14); g.closePath(); g.fill();
        if (!charred) rect(cx - 3, base - 10, 6, 10, timb); // big door
        break;
      }
      case 'falsefront': {
        rect(cx - 11, base - 22, 22, 22, wall);
        rect(cx - 12, base - 24, 24, 3, timb); // parapet
        if (!charred) { rect(cx - 8, base - 16, 5, 6, win); rect(cx + 3, base - 16, 5, 6, win); }
        break;
      }
      case 'school': {
        rect(cx - 11, base - 14, 22, 14, wall);
        tri(cx - 12, base - 14, cx + 12, base - 14, cx, base - 24, roof);
        rect(cx - 2, base - 28, 4, 5, timb); // bell cupola
        if (!charred) rect(cx - 7, base - 11, 4, 6, win);
        break;
      }
      case 'grange': {
        rect(cx - 14, base - 12, 28, 12, wall);
        tri(cx - 15, base - 12, cx + 15, base - 12, cx, base - 21, roof);
        if (!charred) rect(cx - 3, base - 9, 6, 9, timb);
        break;
      }
      case 'firehouse': {
        rect(cx - 8, base - 16, 16, 16, wall);
        tri(cx - 9, base - 16, cx + 9, base - 16, cx, base - 23, roof);
        if (!charred) rect(cx - 5, base - 12, 10, 12, win); // tall door
        break;
      }
      case 'depot': { // long, low, wide eaves
        rect(cx - 15, base - 10, 30, 10, wall);
        rect(cx - 17, base - 13, 34, 3, roof);
        if (!charred) { rect(cx - 10, base - 8, 4, 5, win); rect(cx + 6, base - 8, 4, 5, win); }
        break;
      }
      case 'longshed': {
        rect(cx - 14, base - 10, 28, 10, wall);
        tri(cx - 15, base - 10, cx + 15, base - 10, cx + 8, base - 16, roof); // mono-pitch
        break;
      }
      case 'mast': { // lattice mast + hut; beacon light is night layer's
        rect(cx - 8, base - 8, 12, 8, wall);
        g.strokeStyle = timb;
        g.beginPath(); g.moveTo(cx + 6, base); g.lineTo(cx + 6, base - 34); g.stroke();
        for (let k = 0; k < 4; k++) {
          if (!keep(k + 10)) continue;
          g.beginPath(); g.moveTo(cx + 3, base - k * 8); g.lineTo(cx + 9, base - k * 8 - 8); g.stroke();
        }
        g.fillStyle = charred ? timb : UI.LAMP_ON; g.fillRect(cx + 5, base - 36, 2, 2);
        break;
      }
      case 'bottle': {
        rect(cx - 3, base - 8, 6, 8, charred ? wall : atlas.fixed.ash);
        g.fillStyle = timb; g.beginPath(); g.arc(cx, base - 8, 3, Math.PI, 0); g.fill();
        break;
      }
      case 'shed': {
        rect(cx - 8, base - 9, 16, 9, wall);
        tri(cx - 9, base - 9, cx + 9, base - 9, cx + 4, base - 14, roof);
        break;
      }
      default: { // house/cabin
        rect(cx - 9, base - 11, 18, 11, wall);
        tri(cx - 10, base - 11, cx + 10, base - 11, cx, base - 19, roof);
        if (!charred) { rect(cx - 6, base - 8, 4, 5, win); rect(cx + 2, base - 8, 3, 8, timb); }
        break;
      }
    }
  }
  const structSprites = []; // {st, day, char, ox, oy, w, h, chunks:[chunkIdx]}
  const chunkStructs = Array.from({ length: NCHUNK * NCHUNK }, () => []);
  (function bakeStructures() {
    for (let si = 0; si < structures.length; si++) {
      const st = structures[si];
      let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
      for (const c of st.cells) {
        const x = c % GRID, y = (c / GRID) | 0;
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
      const kind = structKind(st.key);
      const w = Math.max(36, (maxX - minX + 1) * PT_GROUND + 16);
      const h = kind === 'tower' ? 92 : kind === 'church' ? 54 : kind === 'mast' ? 42 : 32;
      const day = document.createElement('canvas'); day.width = w; day.height = h;
      const chr = document.createElement('canvas'); chr.width = w; chr.height = h;
      paintStruct(day.getContext('2d'), kind, w, h, false, si);
      paintStruct(chr.getContext('2d'), kind, w, h, true, si);
      // anchor: sprite bottom sits on the footprint's bottom edge, centered on it
      const ox = Math.round(((minX + maxX + 1) / 2) * PT_GROUND - w / 2);
      const oy = (maxY + 1) * PT_GROUND - h;
      const rec = { st, day, chr, ox, oy, w, h };
      structSprites.push(rec);
      const cx0 = clamp(Math.floor(ox / (CHUNK * PT_GROUND)), 0, NCHUNK - 1);
      const cx1 = clamp(Math.floor((ox + w) / (CHUNK * PT_GROUND)), 0, NCHUNK - 1);
      const cy0 = clamp(Math.floor(oy / (CHUNK * PT_GROUND)), 0, NCHUNK - 1);
      const cy1 = clamp(Math.floor((oy + h) / (CHUNK * PT_GROUND)), 0, NCHUNK - 1);
      for (let cy = cy0; cy <= cy1; cy++) for (let cx = cx0; cx <= cx1; cx++)
        chunkStructs[cy * NCHUNK + cx].push(rec);
    }
  })();

  // ---- terrain chunk painter (the painterly pass) ----
  const myDirty = new Uint8Array(NCHUNK * NCHUNK);
  function drawDab(g, cls, v, px, py, scale, mirror) {
    const d = atlas.dabs[month][cls];
    const t = d.tiles[v];
    const dw = 32 * scale, dh = 32 * scale;
    // anchor bottom-center (16,28): baseline lands at py
    if (mirror) {
      g.save(); g.translate(px, 0); g.scale(-1, 1);
      g.drawImage(d.sheet, t.sx, t.sy, 32, 32, -dw / 2, py - dh * (28 / 32), dw, dh);
      g.restore();
    } else {
      g.drawImage(d.sheet, t.sx, t.sy, 32, 32, px - dw / 2, py - dh * (28 / 32), dw, dh);
    }
  }
  const dabQ = []; // reused y-sort buffer: {y, cls, v, px, py, s, m}
  function paintChunk(ci) {
    const cx = ci % NCHUNK, cy = (ci / NCHUNK) | 0;
    const x0 = cx * CHUNK, y0 = cy * CHUNK;
    const gx0 = x0 * PT_GROUND, gy0 = y0 * PT_GROUND;
    const g = mctx;
    g.save();
    g.beginPath(); g.rect(gx0, gy0, CHUNK * PT_GROUND, CHUNK * PT_GROUND); g.clip();
    const P = atlas.palettes[month], F = atlas.fixed;
    // pass 1 — ground fills
    for (let y = y0; y < y0 + CHUNK; y++) {
      const row = y * GRID;
      for (let x = x0; x < x0 + CHUNK; x++) {
        const i = row + x;
        let ramp;
        if (flags[i] & FLAG.LINE) ramp = F.mineral;
        else if (state[i] === S.SCAR || fuel[i] === FUEL.SCAR)
          ramp = regrow[i] === 0 ? F.scarFresh : F.scarOld;
        else ramp = atlas.groundOf(month, fuel[i]);
        g.fillStyle = ramp[Math.floor(cellHash01(i, 0x60) * 3)];
        g.fillRect(x * PT_GROUND, y * PT_GROUND, PT_GROUND, PT_GROUND);
      }
    }
    // pass 2 — dabs, y-sorted (painter's algorithm); include 2 rows below the chunk because
    // tall dabs anchored there reach up into this chunk (clip keeps them inside our rect)
    dabQ.length = 0;
    const yEnd = Math.min(GRID, y0 + CHUNK + 2);
    for (let y = y0; y < yEnd; y++) {
      const row = y * GRID;
      for (let x = x0; x < x0 + CHUNK; x++) {
        const i = row + x;
        const cx16 = x * PT_GROUND + 8, cy16 = y * PT_GROUND + 8;
        if (flags[i] & FLAG.LINE) continue; // line cells get scratches in pass 3
        if (state[i] === S.SCAR || fuel[i] === FUEL.SCAR) {
          const r = regrow[i];
          if (r === 0) { // fresh black + ash flecks; matte, calm (R2)
            dabQ.push({ y: cy16, cls: 'ashfleck', v: atlas.variantOf(i, 0), px: cx16, py: cy16 + 8, s: 1, m: 0 });
          } else if (r === 1) { // fireweed: blooms hardest where it burned worst
            const n = burnSeverity[i] === 2 ? 5 : 3;
            for (let k = 0; k < n; k++)
              dabQ.push({ y: cy16 + k, cls: 'fireweed', v: atlas.variantOf(i, k), px: cx16 + (cellHash01(i, k + 9) - 0.5) * 12, py: cy16 + 8 + (cellHash01(i, k + 21) - 0.5) * 10, s: 0.9 + cellHash01(i, k + 33) * 0.3, m: 0 });
          } else if (r === 2) {
            dabQ.push({ y: cy16, cls: 'shrub', v: atlas.variantOf(i, 0), px: cx16 - 3, py: cy16 + 8, s: 0.9, m: 0 });
            dabQ.push({ y: cy16 + 1, cls: 'seedling', v: atlas.variantOf(i, 1), px: cx16 + 4, py: cy16 + 9, s: 1, m: 0 });
          } else { // thicket-planted
            for (let k = 0; k < 3; k++)
              dabQ.push({ y: cy16 + k, cls: 'seedling', v: atlas.variantOf(i, k), px: cx16 + (cellHash01(i, k + 40) - 0.5) * 11, py: cy16 + 8 + (cellHash01(i, k + 52) - 0.5) * 8, s: 1.1 + k * 0.15, m: 0 });
          }
          continue;
        }
        const f = fuel[i];
        const cls = atlas.classOf(f);
        if (!cls) continue;
        // THE fuel-load law (§5.2): dab count = 1 + floor(load01·4), cluster-modulated.
        // Fuel accumulation is literally more paint — the Fire Four audit, by eye.
        const load01 = clamp(load[i] / 3, 0, 1);
        let count = 1 + Math.floor(load01 * 4);
        count = clamp(Math.round(count * (0.6 + 0.8 * atlas.cluster[i])), 1, 5);
        if (f === FUEL.CROWN_CANOPY) count = Math.min(6, count + 1); // dense stands read dense
        // understory rule: heavy conifer shows its ladder fuel (the twist channel)
        if ((f === FUEL.TIMBER || f === FUEL.CROWN_CANOPY) && load01 > 0.6) {
          dabQ.push({ y: cy16 - 2, cls: 'duff', v: atlas.variantOf(i, 7), px: cx16 - 4, py: cy16 + 6, s: 1, m: 0 });
          dabQ.push({ y: cy16 - 1, cls: 'shrub', v: atlas.variantOf(i, 8), px: cx16 + 4, py: cy16 + 7, s: 0.85, m: 0 });
        }
        for (let k = 0; k < count; k++) {
          const jx = (cellHash01(i, k * 2 + 1) - 0.5) * 12, jy = (cellHash01(i, k * 2 + 2) - 0.5) * 12;
          let dcls = cls;
          // PINE_LITTER: duff floor with scattered pines — open pine floor, readable
          if (f === FUEL.PINE_LITTER && cellHash01(i, k + 70) < 0.3) dcls = 'conifer';
          const s = 0.85 + cellHash01(i, k + 80) * 0.3; // ±15% scale jitter, no rotation
          const m = (dcls === 'grass' || dcls === 'slash') && cellHash01(i, k + 90) < 0.5 ? 1 : 0;
          dabQ.push({ y: cy16 + jy, cls: dcls, v: atlas.variantOf(i, k), px: cx16 + jx, py: cy16 + 8 + jy, s, m });
        }
      }
    }
    dabQ.sort((a, b) => a.y - b.y);
    for (const d of dabQ) drawDab(g, d.cls, d.v, d.px, d.py, d.s, d.m);
    // pass 3 — mineral line dashes + rake scratches (the McLeod's signature on the land)
    g.strokeStyle = F.mineral[2]; g.lineWidth = 1.5;
    for (let y = y0; y < y0 + CHUNK; y++) {
      const row = y * GRID;
      for (let x = x0; x < x0 + CHUNK; x++) {
        const i = row + x;
        if (!(flags[i] & FLAG.LINE)) continue;
        drawDab(g, 'mineral', atlas.variantOf(i, 0), x * PT_GROUND + 8, y * PT_GROUND + 16, 1, 0);
        // dash: hint the line's continuity without reading as a wall
        g.beginPath();
        const h2 = cellHash01(i, 0x71);
        g.moveTo(x * PT_GROUND + 3, y * PT_GROUND + 6 + h2 * 5);
        g.lineTo(x * PT_GROUND + 13, y * PT_GROUND + 7 + h2 * 5);
        g.stroke();
      }
    }
    // pass 4 — structure silhouettes intersecting this chunk (char variants when LOST)
    for (const rec of chunkStructs[ci])
      g.drawImage(rec.st.state === 'LOST' ? rec.chr : rec.day, rec.ox, rec.oy);
    g.restore();
    // tower flat board: same cells, mid ramp colors, one pixel each
    const td = towerData.data;
    for (let y = y0; y < y0 + CHUNK; y++) {
      const row = y * GRID;
      for (let x = x0; x < x0 + CHUNK; x++) {
        const i = row + x, tk = cellToken(i) * 3, o = i * 4;
        td[o] = tokenRGB[tk]; td[o + 1] = tokenRGB[tk + 1]; td[o + 2] = tokenRGB[tk + 2]; td[o + 3] = 255;
      }
    }
    towerStale = true;
  }
  function towerFullRebuild() {
    const td = towerData.data;
    for (let i = 0; i < CELLS; i++) {
      const tk = cellToken(i) * 3, o = i * 4;
      td[o] = tokenRGB[tk]; td[o + 1] = tokenRGB[tk + 1]; td[o + 2] = tokenRGB[tk + 2]; td[o + 3] = 255;
    }
    towerStale = true;
  }
  function setMonth(m) {
    if (!MONTHS.includes(m)) return;
    month = m;
    rebuildTokens();
    towerFullRebuild();
    // instant flat base under the painterly refinement: never a hole, never a stall —
    // the calendar/ledger screens absorb the amortized repaint
    towerG.putImageData(towerData, 0, 0);
    mctx.imageSmoothingEnabled = true;
    mctx.drawImage(towerC, 0, 0, GRID, GRID, 0, 0, MAPPX, MAPPX);
    myDirty.fill(1);
    lensBuiltFrame = -999;
  }
  // ---- dirty ingestion + amortized repaint ----
  function ingestDirty() {
    const d = sim.dirty;
    for (let k = 0; k < d.length; k++) if (d[k]) { myDirty[k] = 1; d[k] = 0; }
  }
  function chunkBurns(k) { // any live fire in the chunk → a repaint now is wasted work
    const x0 = (k % NCHUNK) * CHUNK, y0 = ((k / NCHUNK) | 0) * CHUNK;
    for (let y = y0; y < y0 + CHUNK; y++) {
      const row = y * GRID;
      for (let x = x0; x < x0 + CHUNK; x++) {
        const st = state[row + x];
        if (st === S.BURNING || st === S.EMBERCAST) return true;
      }
    }
    return false;
  }
  function repaintBudget(camX, camY) {
    // paintChunk is the costliest single item a detonation frame buys (~2–4 ms each: 256
    // ground fills + up to ~1.3k y-sorted dabs), and a burning chunk re-dirties within a
    // tick — so under frame pressure the budget throttles hard and burning chunks are
    // deferred outright (they stay dirty). The scar stamp (sim.onEvent) + fire bed + 4 s
    // afterglow carry the read until the front moves on; calm frames drain the backlog.
    const pressed = frameEma > 11;
    const budget = pressed ? 2 : REPAINT_CHUNKS;
    const boxMs = pressed ? 2.5 : 4; // hard time box: an EMA can flap, a stopwatch can't —
                                     // without it the calm→pressed edge buys a 24 ms spike
    const start = performance.now();
    let n = 0;
    // one burning chunk may still paint every 4th frame: a cut line laid AT the flame edge
    // must not stay invisible for the whole life of the front that dirties its chunk
    let burnPass = (frameN & 3) === 0;
    // nearest-first: visible work lands before offscreen work (predictability beats churn)
    let bestList = [];
    for (let k = 0; k < myDirty.length; k++) {
      if (!myDirty[k]) continue;
      const cx = (k % NCHUNK) * CHUNK + CHUNK / 2, cy = ((k / NCHUNK) | 0) * CHUNK + CHUNK / 2;
      bestList.push([Math.abs(cx - camX) + Math.abs(cy - camY), k]);
    }
    if (!bestList.length) return;
    bestList.sort((a, b) => a[0] - b[0]);
    for (const [, k] of bestList) {
      if (n >= budget || performance.now() - start > boxMs) break;
      if (pressed && chunkBurns(k)) {
        if (!burnPass) continue;
        burnPass = false;
      }
      myDirty[k] = 0;
      paintChunk(k);
      n++;
    }
  }

  // ---- pooled particles: smoke (+ retardant mist + sprint dust share the pool) ----
  const sp = {
    x: new Float32Array(SMOKE_POOL), y: new Float32Array(SMOKE_POOL),
    jx: new Float32Array(SMOKE_POOL), jy: new Float32Array(SMOKE_POOL),
    age: new Float32Array(SMOKE_POOL), life: new Float32Array(SMOKE_POOL),
    tint: new Uint8Array(SMOKE_POOL), n: 0,
  };
  const TINTS = ['grey', 'gold', 'green', 'char', 'red'];
  function spawnSmoke(wx, wy, tint, life) {
    if (sp.n >= SMOKE_POOL) return;
    const k = sp.n++;
    sp.x[k] = wx; sp.y[k] = wy;
    const a = feel() * TAU, m = feel() * 0.4;
    sp.jx[k] = Math.cos(a) * m; sp.jy[k] = Math.sin(a) * m;
    sp.age[k] = 0; sp.life[k] = life; sp.tint[k] = tint;
  }
  function smokeTintFor(f, i01) {
    if (i01 > 0.7) return 3; // char-dark
    if (f === FUEL.GRASS || f === FUEL.SLASH) return 1;   // warm gold off cured fuels
    if (f === FUEL.TIMBER || f === FUEL.CROWN_CANOPY || f === FUEL.PINE_LITTER) return 2;
    return 0;
  }

  // ---- ember shadow pool (arc tracers need launch points; sim pool doesn't keep them) ----
  const esh = Array.from({ length: embers.length }, () => ({ live: false, sx: 0, sy: 0, total: 1 }));

  // ---- event-driven FX (subscribe once; sim events carry cell indices — world space only) ----
  const AFTERGLOW_N = 4096;
  const agCell = new Int32Array(AFTERGLOW_N), agAge = new Float32Array(AFTERGLOW_N);
  let agHead = 0, agCount = 0;
  const catchRings = []; // {cell, age} — the landing half of "one chime = one truth"
  sim.onEvent((e) => {
    if (e.type === 'cellBurnout') {
      agCell[agHead] = e.cell; agAge[agHead] = 0;
      agHead = (agHead + 1) % AFTERGLOW_N;
      if (agCount < AFTERGLOW_N) agCount++;
      // scar stamp: under detonation pressure the full painterly repaint is deferred (see
      // repaintBudget), but char must read the moment it exists — lay the same pass-1 ground
      // fill now, on both boards; the eventual paintChunk re-lays it with dabs and neighbors
      const c = e.cell, x = c % GRID, y = (c / GRID) | 0;
      mctx.fillStyle = atlas.fixed.scarFresh[Math.floor(cellHash01(c, 0x60) * 3)];
      mctx.fillRect(x * PT_GROUND, y * PT_GROUND, PT_GROUND, PT_GROUND);
      const tk = cellToken(c) * 3, o = c * 4, td = towerData.data;
      td[o] = tokenRGB[tk]; td[o + 1] = tokenRGB[tk + 1]; td[o + 2] = tokenRGB[tk + 2]; td[o + 3] = 255;
      towerStale = true;
    } else if (e.type === 'emberCatch') {
      if (catchRings.length < 64) catchRings.push({ cell: e.cell, age: 0, crown: !!e.crown });
    } else if (e.type === 'structureLost' || e.type === 'structureIgnited' || e.type === 'structureHeld') {
      for (let si = 0; si < structures.length; si++) {
        if (structures[si].key !== e.key) continue;
        for (const c of structures[si].cells)
          myDirty[(((c / GRID) | 0) >> 4) * NCHUNK + ((c % GRID) >> 4)] = 1;
        break;
      }
    }
  });

  // ---- frame-walk scratch buffers (zero allocation per frame) ----
  const BURN_CAP = 16000;
  const burnList = new Int32Array(BURN_CAP); const burnI01 = new Float32Array(BURN_CAP);
  const heatList = new Int32Array(4000);
  const smolList = new Int32Array(1024);
  const retList = new Int32Array(4000);
  const LG = GRID / 8; // 40×40 light grid: glow blobs + night cutouts + tower smoke rects
  const lgSum = new Float32Array(LG * LG), lgWX = new Float32Array(LG * LG), lgWY = new Float32Array(LG * LG);
  const blobs = []; // reused
  let nBurn = 0, nHeat = 0, nSmol = 0, nRet = 0, burnVisible = 0;

  function intensity01(i) {
    const f = fuel[i];
    const crowning = flags[i] & FLAG.CROWNING;
    let v = F_INTENSITY[f] * (0.6 + 0.4 * load[i]) * (1 - 0.7 * moisture[i]);
    if (state[i] === S.EMBERCAST) v *= SPREAD.EMBERCAST_INTENSITY;
    if (flags[i] & FLAG.BACKBURN) v *= BACKBURN.INTENSITY_MUL; // cool-burn reads cool
    if (crowning) v *= CROWN.INTENSITY_MUL;
    v /= I01_NORM;
    return crowning ? Math.max(CROWN_FLOOR, Math.min(1, v)) : Math.min(SURFACE_CAP, v);
  }

  // ---- render clock: fixed-step cosmetic time (deterministic under headless capture;
  // never Date.now — this clock touches nothing that reaches the sim hash) ----
  let t = 0, frameN = 0;
  const DTF = 1 / 60;

  // month-scoped state
  let flatMode = false;
  let lensBuiltFrame = -999, lensEdges = [], lensScarEdges = [], lensLabelCell = -1;

  // zone centroids (TOWER cartography)
  const zoneCx = new Float32Array(16), zoneCy = new Float32Array(16), zoneN = new Float32Array(16);
  for (let i = 0; i < CELLS; i++) {
    const z = zoneId[i];
    if (!z) continue;
    zoneCx[z] += i % GRID; zoneCy[z] += (i / GRID) | 0; zoneN[z]++;
  }
  for (let z = 1; z < 16; z++) if (zoneN[z]) { zoneCx[z] /= zoneN[z]; zoneCy[z] /= zoneN[z]; }

  const perf = { frameMs: 0, licks: 0, glows: 0, smoke: 0, chunkQ: 0 };

  // boot: token tables + instant flat terrain base (painterly refinement is amortized)
  rebuildTokens();
  setMonth('jun');

  // color-literal helpers (all hexes live in atlas; these derive from it)
  const DEEP = atlas.fireStops[0][1];       // #7A1F0A deep ember
  const ROAR = atlas.fireStops[4][1];       // #FFD066 roaring — telegraph/outline gold
  const WHITECORE = atlas.fireStops[5][1];  // crown white-orange
  function hexA(hex, a) {
    const n = parseInt(hex.slice(1), 16);
    return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`;
  }

  // ---- fire-base board (the towerData pattern, rebuilt per frame) ----
  // The fire layer's per-cell passes — afterglow, heating, ember bed, retardant stain — are
  // per-cell COLOR, not shape: during a Fire Four detonation they were 8–16k fillRects with a
  // fillStyle string parse each (measured 33 ms/frame). Written as typed-array pixels into one
  // GRID² ImageData + ONE crisp scaled blit they cost ~1 ms; the licks/glow/smoke vectors on
  // top carry the painterly read. Crisp cells at GROUND scale are the flat board's own look.
  const bedC = document.createElement('canvas'); bedC.width = bedC.height = GRID;
  const bedG = bedC.getContext('2d');
  const bedData = bedG.createImageData(GRID, GRID);
  const bed32 = new Uint32Array(bedData.data.buffer); // fast whole-board clear only
  const hexRGB = (hex) => { const n = parseInt(hex.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
  const FIRE_RGB = new Uint8Array(65 * 3); // fire(t01) ramp pre-parsed for pixel writes
  for (let k = 0; k <= 64; k++) {
    const c = hexRGB(fire(k / 64));
    FIRE_RGB[k * 3] = c[0]; FIRE_RGB[k * 3 + 1] = c[1]; FIRE_RGB[k * 3 + 2] = c[2];
  }
  const DEEP_RGB = hexRGB(DEEP), CHAR_RGB = hexRGB(UI.CHAR), STAIN_RGB = hexRGB(atlas.fixed.retardantStain[0]);

  // ================= per-frame collection =================
  function visRect(cam) {
    const tl = cam.screenToWorld({ x: 0, y: 0 });
    const br = cam.screenToWorld({ x: W, y: H });
    return {
      x0: clamp(Math.floor(tl.x) - 1, 0, GRID - 1), y0: clamp(Math.floor(tl.y) - 1, 0, GRID - 1),
      x1: clamp(Math.ceil(br.x) + 1, 0, GRID - 1), y1: clamp(Math.ceil(br.y) + 1, 0, GRID - 1),
      wx0: tl.x, wy0: tl.y, wx1: br.x, wy1: br.y,
    };
  }
  function collect(r) {
    nBurn = nHeat = nSmol = nRet = 0; burnVisible = 0;
    lgSum.fill(0); lgWX.fill(0); lgWY.fill(0);
    for (let y = r.y0; y <= r.y1; y++) {
      const row = y * GRID;
      for (let x = r.x0; x <= r.x1; x++) {
        const i = row + x, st = state[i];
        if (st === S.BURNING || st === S.EMBERCAST) {
          burnVisible++;
          const v = intensity01(i);
          if (nBurn < BURN_CAP) { burnList[nBurn] = i; burnI01[nBurn] = v; nBurn++; }
          const g = ((y >> 3) * LG) + (x >> 3);
          const wgt = v + ((flags[i] & FLAG.CROWNING) ? 1.2 : 0); // crown blobs read BIGGER
          lgSum[g] += wgt; lgWX[g] += x * wgt; lgWY[g] += y * wgt;
        } else if (st === S.HEATING) {
          if (nHeat < heatList.length) heatList[nHeat++] = i;
        }
        if (flags[i] & FLAG.EMBER_GLOW) { if (nSmol < smolList.length) smolList[nSmol++] = i; }
        if (retard[i] > 0.02 && nRet < retList.length) retList[nRet++] = i;
      }
    }
    blobs.length = 0;
    for (let g = 0; g < LG * LG; g++) {
      if (lgSum[g] <= 0.01) continue;
      blobs.push({ x: lgWX[g] / lgSum[g] + 0.5, y: lgWY[g] / lgSum[g] + 0.5, sum: lgSum[g] });
    }
    blobs.sort((a, b) => b.sum - a.sum);
  }

  let smokeAcc = 0;
  function spawnFrameSmoke() {
    smokeAcc = Math.min(smokeAcc + SMOKE_SPAWN_S * DTF, 24);
    if (!nBurn) return;
    // stride sampling distributes spawns across the front without a full pass
    const stride = Math.max(1, (nBurn / 48) | 0);
    for (let k = (frameN * 7) % stride; k < nBurn && smokeAcc >= 1; k += stride) {
      const i = burnList[k], v = burnI01[k];
      if (feel() < 0.25 + 0.6 * v) {
        smokeAcc -= 1;
        spawnSmoke((i % GRID) + feel(), ((i / GRID) | 0) + feel(), smokeTintFor(fuel[i], v), 6 + feel() * 5);
      }
    }
  }

  // ================= L0 terrain =================
  function blitClamped(g, src, sx, sy, sw, sh, dx, dy, dw, dh, srcSize) {
    if (sx < 0) { const f = -sx / sw; dx += dw * f; dw *= 1 - f; sw += sx; sx = 0; }
    if (sy < 0) { const f = -sy / sh; dy += dh * f; dh *= 1 - f; sh += sy; sy = 0; }
    if (sx + sw > srcSize) { const f = (sx + sw - srcSize) / sw; dw *= 1 - f; sw = srcSize - sx; }
    if (sy + sh > srcSize) { const f = (sy + sh - srcSize) / sh; dh *= 1 - f; sh = srcSize - sy; }
    if (sw <= 0 || sh <= 0) return;
    g.drawImage(src, sx, sy, sw, sh, dx, dy, dw, dh);
  }
  function drawFlatCells(g, cam, pt, shk, r) {
    // F2 immediate mode: the palette IS the state legend; row-run merging keeps it ~1–3k fills
    const p0 = cam.worldToScreen({ x: r.x0, y: r.y0 });
    for (let y = r.y0; y <= r.y1; y++) {
      const py = p0.y + (y - r.y0) * pt + shk.y;
      const row = y * GRID;
      let runTok = -1, runX0 = r.x0;
      for (let x = r.x0; x <= r.x1 + 1; x++) {
        const tok = x <= r.x1 ? cellToken(row + x) : -2;
        if (tok !== runTok) {
          if (runTok >= 0) {
            g.fillStyle = tokenCss[runTok];
            g.fillRect(p0.x + (runX0 - r.x0) * pt + shk.x, py, (x - runX0) * pt + 0.5, pt + 0.5);
          }
          runTok = tok; runX0 = x;
        }
      }
    }
    // flat structures stay recognizable: sprites are already crisp — draw them over the fills
    for (const rec of structSprites) {
      const s = cam.worldToScreen({ x: rec.ox / PT_GROUND, y: rec.oy / PT_GROUND });
      const sc = pt / PT_GROUND;
      g.drawImage(rec.st.state === 'LOST' ? rec.chr : rec.day,
        s.x + shk.x, s.y + shk.y, rec.w * sc, rec.h * sc);
    }
    // wind streaks: grass can't lean here, so 12 drifting lines keep the wind visible (R3)
    g.strokeStyle = hexA(UI.CREAM, 0.15); g.lineWidth = 2;
    const spd = 30 + wind.mphEffective * 4;
    for (let k = 0; k < 12; k++) {
      const ph = (cellHash01(k, 0x76) + t * spd / 900) % 1;
      const sx = ((cellHash01(k, 0x77) + t * wind.tx * spd / W) % 1 + 1) % 1 * W;
      const sy = ((cellHash01(k, 0x78) + t * wind.ty * spd / H) % 1 + 1) % 1 * H;
      g.globalAlpha = 0.15 * (0.5 + 0.5 * Math.sin(ph * TAU));
      g.beginPath(); g.moveTo(sx, sy); g.lineTo(sx + wind.tx * 24, sy + wind.ty * 24); g.stroke();
    }
    g.globalAlpha = 1;
  }
  function drawTerrain(cam, pt, shk, r, view) {
    const g = L.terrain.g;
    g.imageSmoothingEnabled = pt >= FLAT_PT; // crisp cells on the tower board
    g.fillStyle = atlas.fixed.towerBg;
    g.fillRect(0, 0, W, H); // margins beyond the map edge
    if (pt >= FLAT_PT && !flatMode) {
      blitClamped(g, mapC,
        r.wx0 * PT_GROUND, r.wy0 * PT_GROUND,
        (r.wx1 - r.wx0) * PT_GROUND, (r.wy1 - r.wy0) * PT_GROUND,
        shk.x, shk.y, W, H, MAPPX);
    } else if (pt >= FLAT_PT) {
      drawFlatCells(g, cam, pt, shk, r);
    } else {
      // TOWER: clean flat cells — one putImageData when stale, one scaled blit per frame
      if (towerStale) { towerG.putImageData(towerData, 0, 0); towerStale = false; }
      g.imageSmoothingEnabled = false;
      blitClamped(g, towerC, r.wx0, r.wy0, r.wx1 - r.wx0, r.wy1 - r.wy0, shk.x, shk.y, W, H, GRID);
    }
    // night: single day atlas × palette multiply (canon-final §10 — never a second sheet)
    const ramp = view.phase === 'NIGHT' ? 1 : view.phase === 'DUSK' ? clamp(view.duskT01 || 0, 0, 1) : 0;
    if (ramp > 0.01) {
      g.globalCompositeOperation = 'multiply';
      g.globalAlpha = ramp;
      g.fillStyle = atlas.fixed.nightMult;
      g.fillRect(0, 0, W, H);
      g.globalAlpha = 1;
      g.globalCompositeOperation = 'source-over';
    }
    return ramp;
  }

  // ================= L1 smoke =================
  function drawSmoke(cam, pt, shk, view) {
    const g = L.smoke.g, hw = L.smoke.c.width, hh = L.smoke.c.height;
    g.clearRect(0, 0, hw, hh);
    // advect by the LIVE wind: particles already in the air curve when it shifts —
    // the smoke column is the windsock at landscape scale (R3)
    const wvx = wind.tx * (0.3 + wind.mphEffective * 0.11) * 0.75; // PROVISIONAL drift rate
    const wvy = wind.ty * (0.3 + wind.mphEffective * 0.11) * 0.75;
    for (let k = 0; k < sp.n; k++) {
      sp.age[k] += DTF;
      if (sp.age[k] >= sp.life[k]) {
        const l = --sp.n;
        sp.x[k] = sp.x[l]; sp.y[k] = sp.y[l]; sp.jx[k] = sp.jx[l]; sp.jy[k] = sp.jy[l];
        sp.age[k] = sp.age[l]; sp.life[k] = sp.life[l]; sp.tint[k] = sp.tint[l];
        k--; continue;
      }
      sp.x[k] += (wvx + sp.jx[k]) * DTF;
      sp.y[k] += (wvy + sp.jy[k]) * DTF;
    }
    perf.smoke = sp.n;
    // big fires read heavier without more particles: density scales the whole layer
    L.smoke.c.style.opacity = String(Math.min(1, 0.35 + burnVisible / 900));
    if (pt < FLAT_PT) {
      // tower: coarse density rects (particles would vanish at 4 px/tile anyway)
      g.fillStyle = hexA(atlas.fixed.ash, 0.5);
      for (let b = 0; b < Math.min(blobs.length, 64); b++) {
        const bl = blobs[b];
        const s = cam.worldToScreen({ x: bl.x, y: bl.y });
        const d = Math.min(1, bl.sum / 6);
        g.globalAlpha = 0.5 * d;
        g.fillRect((s.x + shk.x) / 2 - 6, (s.y + shk.y) / 2 - 6, 12, 12);
      }
      g.globalAlpha = 1;
    } else {
      const sets = atlas.sprites.smoke;
      for (let k = 0; k < sp.n; k++) {
        const s = cam.worldToScreen({ x: sp.x[k], y: sp.y[k] });
        const sx = (s.x + shk.x) / 2, sy = (s.y + shk.y) / 2;
        if (sx < -60 || sy < -60 || sx > hw + 60 || sy > hh + 60) continue;
        const u = sp.age[k] / sp.life[k];
        const rad = (3 + 16 * u) * (pt / PT_GROUND);
        // alpha envelope: 0 → 0.12 by 8% of life → 0 at death (terrain stays readable, R1)
        const a = 0.12 * Math.min(1, u / 0.08) * (1 - u);
        if (a <= 0.004) continue;
        const spr = sets[TINTS[sp.tint[k]]][rad < 12 ? 0 : rad < 26 ? 1 : 2];
        g.globalAlpha = a;
        g.drawImage(spr, sx - rad, sy - rad, rad * 2, rad * 2);
      }
      g.globalAlpha = 1;
      if (month === 'winter') { // snowfall: hash-positioned flecks, zero state
        g.fillStyle = atlas.fixed.snow[2];
        for (let k = 0; k < 160; k++) {
          const fx = ((cellHash01(k, 0x5A) + t * (0.02 + wind.tx * 0.01)) % 1 + 1) % 1 * hw;
          const fy = ((cellHash01(k, 0x5B) + t * 0.05 * (0.7 + cellHash01(k, 0x5C))) % 1 + 1) % 1 * hh;
          g.globalAlpha = 0.5 + 0.4 * cellHash01(k, 0x5D);
          g.fillRect(fx, fy, 1.5, 1.5);
        }
        g.globalAlpha = 1;
      }
    }
  }

  // ================= L2 night =================
  const cutouts = []; // reused
  function drawNight(cam, pt, shk, view, ramp) {
    const g = L.night.g, hw = L.night.c.width, hh = L.night.c.height;
    if (ramp <= 0.01) {
      if (L.night.c.style.display !== 'none') { g.clearRect(0, 0, hw, hh); L.night.c.style.display = 'none'; }
      return;
    }
    L.night.c.style.display = '';
    g.clearRect(0, 0, hw, hh);
    g.fillStyle = hexA(atlas.fixed.dark, 0.86 * ramp);
    g.fillRect(0, 0, hw, hh);
    // cutouts: fire is the only light (plus the tools and homes of people)
    const ptS = pt / PT_GROUND;
    cutouts.length = 0;
    const wpos = view.warden && view.warden.pos;
    if (wpos) {
      cutouts.push({ x: wpos.x, y: wpos.y, r: 90 * ptS, a: 0.8 }); // hand lamp: warden ALWAYS readable
      if (view.warden.verb && view.warden.verb.mode === 'drip') {
        const fl = 1 + 0.1 * Math.sin(t * 8 * TAU); // drip torch flicker, 8 Hz ±10%
        cutouts.push({ x: wpos.x, y: wpos.y, r: 130 * fl * ptS, a: 0.9 });
      }
    }
    const lk = mapData.landmarks && mapData.landmarks.lookout;
    if (lk) cutouts.push({ x: lk[0] + 1, y: lk[1] + 1, r: 110 * ptS, a: 0.7 }); // tower lamp
    for (let b = 0; b < blobs.length && cutouts.length < CUTOUT_CAP - 8; b++) {
      const bl = blobs[b];
      cutouts.push({ x: bl.x, y: bl.y, r: (40 + 70 * Math.min(1, bl.sum / 8)) * ptS, a: 0.9 });
    }
    // town window grid: every standing structure keeps a lit window (the thing defended)
    for (const rec of structSprites) {
      if (cutouts.length >= CUTOUT_CAP) break;
      const st = rec.st;
      if (st.state === 'LOST') continue;
      if (st.key === 'relayHut') { // beacon blinks, 1 s period
        if ((t % 1) < 0.55) cutouts.push({ x: st.cx, y: st.cy, r: 30 * ptS, a: 0.6 });
        continue;
      }
      cutouts.push({ x: st.cx + 0.5, y: st.cy + 0.5, r: 60 * ptS, a: 0.55 });
    }
    g.globalCompositeOperation = 'destination-out';
    for (const c of cutouts) {
      const s = cam.worldToScreen({ x: c.x, y: c.y });
      const sx = (s.x + shk.x) / 2, sy = (s.y + shk.y) / 2, rr = c.r / 2;
      if (sx < -rr || sy < -rr || sx > hw + rr || sy > hh + rr) continue;
      g.globalAlpha = c.a * ramp;
      g.drawImage(atlas.sprites.light, sx - rr, sy - rr, rr * 2, rr * 2);
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
  }

  // ================= L3 fire =================
  function lickPath(g, cx, baseY, h, w, lean, outer, inner, ph, fq) {
    const sway = Math.sin(t * fq + ph) * 0.12 * h;
    const tipX = cx + lean * 0.5 * h + sway;
    const tipY = baseY - h * (0.92 + 0.08 * Math.sin(t * 1.7 * fq + ph));
    g.fillStyle = outer;
    g.beginPath();
    g.moveTo(cx - w / 2, baseY);
    g.quadraticCurveTo(cx - w * 0.5, baseY - h * 0.55, tipX, tipY);
    g.quadraticCurveTo(cx + w * 0.5, baseY - h * 0.55, cx + w / 2, baseY);
    g.closePath(); g.fill();
    g.fillStyle = inner; // 60%-scale hot core
    g.beginPath();
    g.moveTo(cx - w * 0.3, baseY);
    g.quadraticCurveTo(cx - w * 0.3, baseY - h * 0.4, cx + (tipX - cx) * 0.6, baseY - (baseY - tipY) * 0.6);
    g.quadraticCurveTo(cx + w * 0.3, baseY - h * 0.4, cx + w * 0.3, baseY);
    g.closePath(); g.fill();
  }
  function drawCorridorRect(g, cam, pt, shk, corr, mode) {
    // PROVISIONAL: corridor drawn at the PHYSICS width (5 tiles, canon-final §6) — paint never
    // lies (R3); spec-verbs' 3-wide preview would under-promise the drop that actually lands.
    const a = cam.worldToScreen({ x: corr.x0 + 0.5, y: corr.y0 + 0.5 });
    const b = cam.worldToScreen({ x: corr.x1 + 0.5, y: corr.y1 + 0.5 });
    const ax = a.x + shk.x, ay = a.y + shk.y;
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const wpx = RETARDANT.WIDTH * pt;
    const red = atlas.fixed.retardantCurtain;
    g.save();
    g.translate(ax, ay);
    g.rotate(Math.atan2(b.y - a.y, b.x - a.x));
    if (mode === 'invalid') { // too short to matter: dotted grey, releasing just stays in aim
      g.strokeStyle = hexA(atlas.fixed.ash, 0.6); g.lineWidth = 1.5; g.setLineDash([2, 5]);
      g.strokeRect(0, -wpx / 2, Math.max(len, 2), wpx);
    } else if (mode === 'aim') {
      g.fillStyle = hexA(red, 0.14);
      g.fillRect(0, -wpx / 2, len, wpx);
      g.strokeStyle = hexA(red, 0.7); g.lineWidth = 2; g.setLineDash([8, 6]);
      g.strokeRect(0, -wpx / 2, len, wpx);
    } else { // inbound: a faint red promise you must defend for 20 s
      g.fillStyle = hexA(red, 0.06);
      g.fillRect(0, -wpx / 2, len, wpx);
      g.strokeStyle = hexA(red, 0.3); g.lineWidth = 1.5;
      g.setLineDash([6, 8]); g.lineDashOffset = -t * 24;
      g.strokeRect(0, -wpx / 2, len, wpx);
    }
    g.setLineDash([]);
    g.restore();
  }
  function drawFire(cam, pt, shk, r, view) {
    const g = L.fire.g;
    g.clearRect(0, 0, W, H);
    const p0 = cam.worldToScreen({ x: r.x0, y: r.y0 });
    const ox = p0.x + shk.x, oy = p0.y + shk.y;
    const px = (x) => ox + (x - r.x0) * pt, py = (y) => oy + (y - r.y0) * pt;
    const ptS = pt / PT_GROUND;
    const flat = flatMode || pt < FLAT_PT;
    perf.licks = 0; perf.glows = 0;
    // -- afterglow: the only glow a scar ever has, and it dies with the fire (R2) --
    for (let k = 0; k < agCount; k++) agAge[(agHead - agCount + k + AFTERGLOW_N) % AFTERGLOW_N] += DTF;
    while (agCount > 0 && agAge[(agHead - agCount + AFTERGLOW_N) % AFTERGLOW_N] > AFTERGLOW_S) agCount--;
    // -- GRANDMOTHER sweep mask, hoisted: stain in EITHER path must not precede the airplane --
    const gm = view.grandmother;
    let gmx0 = 0, gmy0 = 0, gmdx = 0, gmdy = 0, gmLen = 1, gmProg = -1;
    if (gm && gm.state === 'dropping' && gm.corridor) {
      const c = gm.corridor;
      gmLen = Math.max(0.001, Math.hypot(c.x1 - c.x0, c.y1 - c.y0));
      gmx0 = c.x0; gmy0 = c.y0;
      gmdx = (c.x1 - c.x0) / gmLen; gmdy = (c.y1 - c.y0) / gmLen;
      gmProg = clamp(gm.t01 || 0, 0, 1);
    }
    if (!flat) {
      // -- fire-base board: afterglow + heating + ember bed + retardant stain as PIXELS --
      // (see bedC above: one typed-array pass + one crisp blit replaces up to 16k fillRects;
      // collect() already limits every list to the visible rect, so this writes what you see)
      bed32.fill(0);
      const bd = bedData.data;
      for (let k = 0; k < agCount; k++) {
        const idx = (agHead - agCount + k + AFTERGLOW_N) % AFTERGLOW_N;
        const c = agCell[idx], x = c % GRID, y = (c / GRID) | 0;
        if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
        const o = c * 4;
        bd[o] = DEEP_RGB[0]; bd[o + 1] = DEEP_RGB[1]; bd[o + 2] = DEEP_RGB[2];
        bd[o + 3] = 114.75 * (1 - agAge[idx] / AFTERGLOW_S); // 0.45 peak, decays to 0
      }
      // heat shimmer: the 1.2 px position wobble can't survive 1 px/cell, so the same 8 Hz
      // nerve rides the alpha instead (HEATING is still the one variable you SEE first)
      for (let k = 0; k < nHeat; k++) {
        const i = heatList[k], o = i * 4;
        const fl = 0.8 + 0.2 * Math.sin(t * 8 + cellHash01(i, 0x91) * TAU);
        bd[o] = CHAR_RGB[0]; bd[o + 1] = CHAR_RGB[1]; bd[o + 2] = CHAR_RGB[2];
        bd[o + 3] = Math.min(0.35, heat[i] * 0.3) * fl * 255;
      }
      // ember beds: color by intensity01 via the pre-parsed fire ramp (same 0.6 damping and
      // 0.8 Hz-ish hash-desynced pulse the fillRect path had)
      for (let k = 0; k < nBurn; k++) {
        const i = burnList[k], o = i * 4;
        const f3 = ((burnI01[k] * 0.6 * 64 + 0.5) | 0) * 3;
        bd[o] = FIRE_RGB[f3]; bd[o + 1] = FIRE_RGB[f3 + 1]; bd[o + 2] = FIRE_RGB[f3 + 2];
        bd[o + 3] = (0.55 + 0.25 * Math.sin(t * 5 + cellHash01(i, 0x99) * TAU)) * 255;
      }
      // retardant stain base (source-over: stain reads OVER a burning bed, as it always did)
      for (let k = 0; k < nRet; k++) {
        const i = retList[k], x = i % GRID, y = (i / GRID) | 0;
        if (gmProg >= 0) { // the paint must not precede the airplane: mask ahead of the sweep
          const lx = (x + 0.5 - gmx0) * gmdx + (y + 0.5 - gmy0) * gmdy;
          const perp = Math.abs((x + 0.5 - gmx0) * -gmdy + (y + 0.5 - gmy0) * gmdx);
          if (lx >= -1 && lx <= gmLen + 1 && perp <= RETARDANT.WIDTH && lx / gmLen > gmProg) continue;
        }
        const o = i * 4, sa = 0.12 + 0.18 * Math.min(1, retard[i]);
        const w = bd[o + 3] * (1 - sa) / 255, outA = sa + w;
        bd[o] = (STAIN_RGB[0] * sa + bd[o] * w) / outA;
        bd[o + 1] = (STAIN_RGB[1] * sa + bd[o + 1] * w) / outA;
        bd[o + 2] = (STAIN_RGB[2] * sa + bd[o + 2] * w) / outA;
        bd[o + 3] = outA * 255;
      }
      bedG.putImageData(bedData, 0, 0);
      g.imageSmoothingEnabled = false; // crisp cells: the board is cells, licks are the paint
      blitClamped(g, bedC, r.wx0, r.wy0, r.wx1 - r.wx0, r.wy1 - r.wy0, shk.x, shk.y, W, H, GRID);
      g.imageSmoothingEnabled = true;
    } else {
      // flat/tower keeps immediate mode: F2 IS the diagnostic view (front outline + crown
      // cores are sub-cell shapes a 1 px board can't hold) and it already holds 60 fps
      g.fillStyle = DEEP;
      for (let k = 0; k < agCount; k++) {
        const idx = (agHead - agCount + k + AFTERGLOW_N) % AFTERGLOW_N;
        const c = agCell[idx], x = c % GRID, y = (c / GRID) | 0;
        if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
        g.globalAlpha = 0.45 * (1 - agAge[idx] / AFTERGLOW_S);
        g.fillRect(px(x), py(y), pt, pt);
      }
      g.globalAlpha = 1;
      for (let k = 0; k < nBurn; k++) {
        const i = burnList[k], v = burnI01[k];
        const x = i % GRID, y = (i / GRID) | 0;
        const cx0 = px(x), cy0 = py(y);
        const ph = cellHash01(i, 0x99) * TAU;
        g.globalAlpha = 0.85 + 0.15 * Math.sin(t * 5 + ph);
        g.fillStyle = fire(v);
        g.fillRect(cx0, cy0, pt + 0.4, pt + 0.4);
        if (flags[i] & FLAG.CROWNING) { // crown reads unmistakably bigger at ANY zoom
          g.fillStyle = WHITECORE;
          g.fillRect(cx0 + pt * 0.28, cy0 + pt * 0.28, pt * 0.44, pt * 0.44);
        }
        g.globalAlpha = 1;
        if (flatMode && pt >= FLAT_PT) { // F2 front outline: the fire's leading edge, explicit
          g.strokeStyle = ROAR; g.lineWidth = 2;
          g.beginPath();
          if (x > 0 && state[i - 1] === S.UNBURNED && F_BURNABLE[fuel[i - 1]]) { g.moveTo(cx0, cy0); g.lineTo(cx0, cy0 + pt); }
          if (x < GRID - 1 && state[i + 1] === S.UNBURNED && F_BURNABLE[fuel[i + 1]]) { g.moveTo(cx0 + pt, cy0); g.lineTo(cx0 + pt, cy0 + pt); }
          if (y > 0 && state[i - GRID] === S.UNBURNED && F_BURNABLE[fuel[i - GRID]]) { g.moveTo(cx0, cy0); g.lineTo(cx0 + pt, cy0); }
          if (y < GRID - 1 && state[i + GRID] === S.UNBURNED && F_BURNABLE[fuel[i + GRID]]) { g.moveTo(cx0, cy0 + pt); g.lineTo(cx0 + pt, cy0 + pt); }
          g.stroke();
        }
      }
    }
    // -- flame licks: budgeted, worst-first (crown → active → surface); R1 in action --
    if (!flat) {
      const windLean = clamp(wind.mphEffective / 30, 0, 1) * Math.sign(wind.tx || 1) * Math.abs(wind.tx);
      let budget = Math.round(LICK_BUDGET * quality);
      for (let tier = 2; tier >= 0 && budget > 0; tier--) {
        for (let k = 0; k < nBurn && budget > 0; k++) {
          const v = burnI01[k];
          const tv = v >= CROWN_FLOOR ? 2 : v >= 0.55 ? 1 : v >= 0.25 ? 0 : -1;
          if (tv !== tier) continue;
          const i = burnList[k], x = i % GRID, y = (i / GRID) | 0;
          const baseY = py(y) + pt; // flames stand "behind" their fuel row
          const hj = 0.85 + cellHash01(i, 0xA1) * 0.3;
          const nl = tier === 2 ? 4 : tier === 1 ? 2 : 1;
          const h0 = (tier === 2 ? 44 + 20 * (v - CROWN_FLOOR) / (1 - CROWN_FLOOR)
                    : tier === 1 ? 20 + 10 * (v - 0.55) / 0.25
                    : 12 + 6 * (v - 0.25) / 0.3) * hj * ptS;
          for (let j = 0; j < nl && budget > 0; j++) {
            const cx = px(x) + pt * (0.5 + (cellHash01(i, 0xB0 + j) - 0.5) * 0.6);
            const ph = cellHash01(i, 0xC0 + j) * TAU;
            const fq = 7 + cellHash01(i, 0xD0 + j) * 3;
            const inner = (tier === 2 && j === 0) ? WHITECORE : fire(Math.min(1, v + 0.25));
            lickPath(g, cx, baseY, h0 * (j ? 0.8 + cellHash01(i, 0xE0 + j) * 0.3 : 1),
              0.42 * h0, windLean, fire(Math.min(0.9, v * 0.7)), inner, ph, fq);
            budget--; perf.licks++;
          }
        }
      }
    }
    // -- glow: per light-blob, additive, capped — a fire is one animal, not 400 pixels --
    g.globalCompositeOperation = 'lighter';
    const nGlow = Math.min(GLOW_CAP, blobs.length);
    for (let b = 0; b < nGlow; b++) {
      const bl = blobs[b];
      const s = Math.min(1, bl.sum / 8);
      const rad = (24 + 40 * s) * ptS * (pt < FLAT_PT ? 2.4 : 1); // tower glows stay legible
      g.globalAlpha = (0.5 + 0.3 * s) * (flatMode ? 0.5 : 1);
      g.drawImage(atlas.sprites.glow, px(bl.x) - rad, py(bl.y) - rad, rad * 2, rad * 2);
      perf.glows++;
    }
    g.globalAlpha = 1;
    g.globalCompositeOperation = 'source-over';
    // -- retardant stipple (decays live, so it's a per-frame layer, not baked paint).
    // GROUND: the stain base already lives in the bed board; only the sub-cell dots stay
    // vector, cell-strided so a wall-to-wall drop can never buy back the fillRect overrun --
    const stain = atlas.fixed.retardantStain;
    const rStride = flat || nRet <= 1000 ? 1 : Math.ceil(nRet / 1000);
    for (let k = 0; k < nRet; k += rStride) {
      const i = retList[k], x = i % GRID, y = (i / GRID) | 0;
      if (gmProg >= 0) { // the paint must not precede the airplane: mask ahead of the sweep
        const lx = (x + 0.5 - gmx0) * gmdx + (y + 0.5 - gmy0) * gmdy;
        const perp = Math.abs((x + 0.5 - gmx0) * -gmdy + (y + 0.5 - gmy0) * gmdx);
        if (lx >= -1 && lx <= gmLen + 1 && perp <= RETARDANT.WIDTH && lx / gmLen > gmProg) continue;
      }
      const v = Math.min(1, retard[i]);
      if (flat) { // flat/tower has no bed board: keep the immediate base wash
        g.fillStyle = stain[0];
        g.globalAlpha = 0.12 + 0.18 * v;
        g.fillRect(px(x), py(y), pt, pt);
      }
      g.globalAlpha = 0.3 + 0.45 * v;
      for (let d = 0; d < 4; d++) {
        g.fillStyle = stain[1 + (d & 1)];
        g.fillRect(px(x) + cellHash01(i, 0xF0 + d) * (pt - 2), py(y) + cellHash01(i, 0xF8 + d) * (pt - 2),
          Math.max(1.2, 2 * ptS), Math.max(1.2, 2 * ptS));
      }
      g.globalAlpha = 1;
    }
    // -- ember landing telegraph: pulsing smolder glow for the whole 3 s window --
    for (let k = 0; k < nSmol; k++) {
      const i = smolList[k], x = i % GRID, y = (i / GRID) | 0;
      const u = 1 - stateTimer[i] / EMBER.SMOLDER_TICKS; // urgency: act, or it lights
      const ph = cellHash01(i, 0x66) * TAU;
      g.fillStyle = DEEP;
      g.globalAlpha = 0.3 + 0.5 * u;
      g.fillRect(px(x), py(y), pt, pt);
      g.strokeStyle = ROAR; g.lineWidth = 2;
      g.globalAlpha = 0.45 + 0.35 * Math.sin(t * 6 + ph);
      g.beginPath();
      g.arc(px(x) + pt / 2, py(y) + pt / 2, (5 + 8 * u) * ptS + 2, 0, TAU);
      g.stroke();
      g.globalAlpha = 1;
    }
    // -- catch rings: the landing half of "one chime = one truth" — never budget-dropped --
    for (let k = catchRings.length - 1; k >= 0; k--) {
      const cr = catchRings[k];
      cr.age += DTF;
      if (cr.age > 0.6) { catchRings.splice(k, 1); continue; }
      const x = cr.cell % GRID, y = (cr.cell / GRID) | 0;
      const u = cr.age / 0.6;
      g.strokeStyle = ROAR; g.lineWidth = 2;
      g.globalAlpha = 0.8 * (1 - u);
      g.beginPath();
      g.arc(px(x) + pt / 2, py(y) + pt / 2, (5 + 9 * u) * ptS + 2, 0, TAU);
      g.stroke();
      g.globalAlpha = 1;
    }
    // -- ember arc tracers: visible, silent (the chime belongs to the landing) --
    if (view.embersView !== false) {
      for (let k = 0; k < embers.length; k++) {
        const e = embers[k], sh = esh[k];
        if (e.live && !sh.live) { sh.live = true; sh.sx = e.x; sh.sy = e.y; sh.total = Math.max(1, e.ticksLeft); }
        if (!e.live) { sh.live = false; continue; }
        const ax = px(e.x), ay = py(e.y);
        const bx = px(sh.sx), by = py(sh.sy);
        const lift = Math.min(60 * ptS, Math.hypot(ax - bx, ay - by) * 0.35 + 8 * ptS);
        g.strokeStyle = hexA(atlas.fixed.emberHead, 0.3);
        g.lineWidth = Math.max(1, ptS);
        g.beginPath();
        g.moveTo(bx, by);
        g.quadraticCurveTo((ax + bx) / 2, (ay + by) / 2 - lift, ax, ay);
        g.stroke();
        const hs = (e.crown ? 4 : 3) * Math.max(0.6, ptS);
        g.fillStyle = atlas.fixed.emberHead;
        g.fillRect(ax - hs / 2, ay - hs / 2, hs, hs);
        g.globalCompositeOperation = 'lighter';
        const gr = (e.crown ? 10 : 7) * Math.max(0.6, ptS);
        g.drawImage(atlas.sprites.glow, ax - gr, ay - gr, gr * 2, gr * 2);
        g.globalCompositeOperation = 'source-over';
      }
    }
    // -- GRANDMOTHER: corridor preview / 20 s promise / 2.0 s curtain + red mist --
    if (gm && gm.corridor && gm.state !== 'idle') {
      const c = gm.corridor;
      if (gm.state === 'aim') {
        const lenT = Math.hypot(c.x1 - c.x0, c.y1 - c.y0);
        const valid = c.valid !== undefined ? c.valid
          : (lenT >= RETARDANT.LEN_MIN && lenT <= RETARDANT.LEN_MAX);
        drawCorridorRect(g, cam, pt, shk, c, valid ? 'aim' : 'invalid');
      } else if (gm.state === 'inbound') {
        drawCorridorRect(g, cam, pt, shk, c, 'inbound');
      } else if (gm.state === 'dropping') {
        const prog = clamp(gm.t01 || 0, 0, 1);
        const hx = gmx0 + gmdx * gmLen * prog, hy = gmy0 + gmdy * gmLen * prog;
        const a = cam.worldToScreen({ x: hx, y: hy });
        const hxs = a.x + shk.x, hys = a.y + shk.y;
        const ang = Math.atan2(gmdy, gmdx);
        const red = atlas.fixed.retardantCurtain;
        g.save();
        g.translate(hxs, hys); g.rotate(ang);
        const wpx = RETARDANT.WIDTH * pt;
        g.fillStyle = hexA(red, 0.5);  // the curtain: a falling wall of red, 2.0 s end to end
        g.fillRect(-3 * pt, -wpx / 2, 3 * pt, wpx);
        g.fillStyle = hexA(red, 0.85);
        g.fillRect(-1.2 * pt, -wpx / 2, 1.2 * pt, wpx);
        // airtanker: shadow + silhouette sprinting the corridor (she is the loudest thing)
        g.fillStyle = hexA(UI.CHAR, 0.3);
        g.beginPath(); g.ellipse(10 * ptS, 14 * ptS, 44 * ptS, 12 * ptS, 0, 0, TAU); g.fill();
        g.fillStyle = UI.INK;
        g.fillRect(-24 * ptS, -3 * ptS, 48 * ptS, 6 * ptS);       // fuselage
        g.fillRect(-6 * ptS, -22 * ptS, 12 * ptS, 44 * ptS);      // wings
        g.fillStyle = UI.CREAM;
        g.fillRect(-4 * ptS, -20 * ptS, 3 * ptS, 40 * ptS);       // wing stripe
        g.restore();
        // red mist: pooled particles puffed off the falling curtain
        for (let m = 0; m < 5; m++) {
          const perp = (feel() - 0.5) * RETARDANT.WIDTH;
          spawnSmoke(hx - gmdy * perp, hy + gmdx * perp, 4, 0.9 + feel() * 0.6);
        }
      }
    }
    // -- CUT preview: dashed intent from the rake to the cursor (spec-verbs §5.1) --
    const wv = view.warden && view.warden.verb;
    if (wv && wv.mode === 'cut' && view.cursor && view.cursor.world && view.warden.pos) {
      const a = cam.worldToScreen(view.warden.pos);
      const b = cam.worldToScreen(view.cursor.world);
      g.strokeStyle = hexA(atlas.fixed.mineral[2], 0.6);
      g.lineWidth = 2; g.setLineDash([4, 4]);
      g.beginPath(); g.moveTo(a.x + shk.x, a.y + shk.y); g.lineTo(b.x + shk.x, b.y + shk.y); g.stroke();
      g.setLineDash([]);
    }
  }

  // ================= fuel-load lens (TAB, post-F4 unlock — the game layer gates it) =================
  function rebuildLens() {
    const img = lensG.createImageData(GRID, GRID);
    const d = img.data;
    lensEdges.length = 0; lensScarEdges.length = 0; lensLabelCell = -1;
    // PROVISIONAL heatmap ramp keyed to the crown gate: green < 0.8 < gold < 1.6 < orange
    // < 2.0 ≤ red — the 2.0 boundary is the hard contour, labeled, because 2.0 IS the law
    for (let i = 0; i < CELLS; i++) {
      const o = i * 4;
      if (state[i] === S.SCAR || fuel[i] === FUEL.SCAR) {
        const x = i % GRID, y = (i / GRID) | 0;
        if ((x > 0 && state[i - 1] !== S.SCAR && fuel[i - 1] !== FUEL.SCAR)) lensScarEdges.push((i << 2) | 3);
        if ((x < GRID - 1 && state[i + 1] !== S.SCAR && fuel[i + 1] !== FUEL.SCAR)) lensScarEdges.push((i << 2) | 1);
        if ((y > 0 && state[i - GRID] !== S.SCAR && fuel[i - GRID] !== FUEL.SCAR)) lensScarEdges.push((i << 2) | 0);
        if ((y < GRID - 1 && state[i + GRID] !== S.SCAR && fuel[i + GRID] !== FUEL.SCAR)) lensScarEdges.push((i << 2) | 2);
        continue;
      }
      if (!F_BURNABLE[fuel[i]]) continue;
      const Lv = load[i];
      if (Lv < 0.05) continue;
      let rr, gg, bb, aa;
      if (Lv < 0.8) { rr = 107; gg = 154; bb = 76; aa = 55; }
      else if (Lv < 1.6) { rr = 215; gg = 188; bb = 97; aa = 95; }
      else if (Lv < CROWN.LOAD_GATE) { rr = 232; gg = 106; bb = 18; aa = 130; }
      else { rr = 224; gg = 73; bb = 47; aa = 165; }
      d[o] = rr; d[o + 1] = gg; d[o + 2] = bb; d[o + 3] = aa;
      if (Lv >= CROWN.LOAD_GATE) { // the crown line: where the mountain can stand up in fire
        const x = i % GRID, y = (i / GRID) | 0;
        const under = (j) => !(j >= 0 && j < CELLS) || load[j] < CROWN.LOAD_GATE || !F_BURNABLE[fuel[j]];
        if (x > 0 && under(i - 1)) lensEdges.push((i << 2) | 3);
        if (x < GRID - 1 && under(i + 1)) lensEdges.push((i << 2) | 1);
        if (y > 0 && under(i - GRID)) lensEdges.push((i << 2) | 0);
        if (y < GRID - 1 && under(i + GRID)) lensEdges.push((i << 2) | 2);
      }
    }
    if (lensEdges.length) lensLabelCell = lensEdges[lensEdges.length >> 1] >> 2;
    lensG.putImageData(img, 0, 0);
    lensBuiltFrame = frameN;
  }
  function drawLens(cam, pt, r) {
    if (frameN - lensBuiltFrame > 30) rebuildLens(); // load/scar change slowly; 0.5 s cadence
    const g = L.ui.g;
    g.save();
    g.imageSmoothingEnabled = false;
    const a = cam.worldToScreen({ x: 0, y: 0 }), b = cam.worldToScreen({ x: GRID, y: GRID });
    g.globalAlpha = 0.75;
    g.drawImage(lensC, a.x, a.y, b.x - a.x, b.y - a.y);
    g.globalAlpha = 1;
    const edge = (packed, style, lw) => {
      g.strokeStyle = style; g.lineWidth = lw;
      g.beginPath();
      let drawn = 0;
      for (const e of packed) {
        const i = e >> 2, side = e & 3;
        const x = i % GRID, y = (i / GRID) | 0;
        if (x < r.x0 || x > r.x1 || y < r.y0 || y > r.y1) continue;
        const s = cam.worldToScreen({ x, y });
        if (side === 0) { g.moveTo(s.x, s.y); g.lineTo(s.x + pt, s.y); }
        else if (side === 1) { g.moveTo(s.x + pt, s.y); g.lineTo(s.x + pt, s.y + pt); }
        else if (side === 2) { g.moveTo(s.x, s.y + pt); g.lineTo(s.x + pt, s.y + pt); }
        else { g.moveTo(s.x, s.y); g.lineTo(s.x, s.y + pt); }
        if (++drawn > 6000) break;
      }
      g.stroke();
    };
    edge(lensScarEdges, hexA(atlas.fixed.ash, 0.55), 1);          // scar outlines: work done
    edge(lensEdges, atlas.fixed.retardantCurtain, 2);             // the hard 2.0 contour
    if (lensLabelCell >= 0) {
      const s = cam.worldToScreen({ x: (lensLabelCell % GRID) + 0.5, y: ((lensLabelCell / GRID) | 0) + 0.5 });
      if (s.x > 20 && s.x < W - 20 && s.y > 20 && s.y < H - 20) {
        g.font = `italic 12px ${SERIF}`;
        g.fillStyle = UI.CHAR; g.fillText('crown line', s.x + 9, s.y - 5); // shadow
        g.fillStyle = atlas.fixed.retardantCurtain; g.fillText('crown line', s.x + 8, s.y - 6);
      }
    }
    g.restore();
  }

  // ================= L4 UI =================
  // two-register text (R5): anything not a number is WHISPER-lowercase or LITURGY/LABEL-caps
  const text = {
    liturgy(g, str, cx, y, size = 26, alpha = 1, color = UI.CREAM) {
      g.save();
      g.font = `700 ${size}px ${SERIF}`;
      g.globalAlpha = alpha;
      g.fillStyle = UI.INK;
      drawTracked(g, str.toUpperCase(), cx + 1, y + 1, size * 0.22);
      g.fillStyle = color;
      drawTracked(g, str.toUpperCase(), cx, y, size * 0.22);
      g.restore();
    },
    whisper(g, str, cx, y, size = 16, alpha = 1, color = UI.CREAM, align = 'center') {
      g.save();
      g.font = `italic ${size}px ${SERIF}`;
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.textAlign = align; g.fillText(str.toLowerCase(), cx, y); g.textAlign = 'left';
      g.restore();
    },
    label(g, str, cx, y, size = 11, alpha = 1, color = UI.CREAM, align = 'center') {
      g.save();
      g.font = `600 ${size}px ${SERIF}`;
      g.globalAlpha = alpha;
      g.fillStyle = color;
      drawTracked(g, str.toUpperCase(), align === 'center' ? cx : cx, y, 2.2, align);
      g.restore();
    },
    figures(g, str, x, y, size = 14, alpha = 1, color = UI.CREAM, align = 'left') {
      g.save();
      g.font = `${size}px ${MONO}`;
      g.globalAlpha = alpha;
      g.fillStyle = color;
      g.textAlign = align; g.fillText(String(str), x, y); g.textAlign = 'left';
      g.restore();
    },
    tracked: drawTracked,
  };

  // warden: oversized-for-readability silhouette (≥24 px with a hat beats a to-scale speck)
  let walkPhase = 0, outlineHold = 0, outlineDark = false;
  function drawWarden(g, cam, pt, view, nightRamp) {
    const wd = view.warden;
    if (!wd || !wd.pos) return;
    const p = cam.worldToScreen(wd.pos); // NEVER shaken: sanctity extends to your own body
    if (pt < FLAT_PT) { // TOWER: pulsing cream dot + heading tick
      const pu = 0.75 + 0.25 * Math.sin(t * TAU);
      g.fillStyle = UI.CREAM;
      g.beginPath(); g.arc(p.x, p.y, 2.5, 0, TAU); g.fill();
      g.strokeStyle = hexA(UI.CREAM, 0.5 + 0.4 * pu); g.lineWidth = 1.5;
      g.beginPath(); g.arc(p.x, p.y, 4.5 + 2 * pu, 0, TAU); g.stroke();
      const f = wd.facing || { x: 1, y: 0 };
      g.beginPath(); g.moveTo(p.x + f.x * 6, p.y + f.y * 6); g.lineTo(p.x + f.x * 10, p.y + f.y * 10); g.stroke();
      return;
    }
    const s = clamp(pt / PT_GROUND, 0.6, 1.35);
    const vel = wd.vel || { x: 0, y: 0 };
    const speed = Math.hypot(vel.x, vel.y);
    walkPhase += speed * DTF * 1.5;
    const moving = speed > 0.3;
    const poseB = moving && (walkPhase % 1) >= 0.5; // 2-pose walk + idle = 3 readable states
    const bob = moving ? 0 : Math.sin(t * Math.PI) * 1; // idle breath: hat + head only
    const mirror = (wd.facing && wd.facing.x < 0) ? -1 : 1;
    // outline auto-contrast with 0.5 s hysteresis: readable on every palette in the canon
    const uxi = clamp(Math.round(wd.pos.x), 0, GRID - 1), uyi = clamp(Math.round(wd.pos.y), 0, GRID - 1);
    const gl = tokenLuma[cellToken(uyi * GRID + uxi)];
    if ((gl > 0.62) !== outlineDark) { outlineHold += DTF; if (outlineHold > 0.5) { outlineDark = gl > 0.62; outlineHold = 0; } }
    else outlineHold = 0;
    const outline = outlineDark ? UI.INK : (nightRamp > 0.4 ? UI.NIGHT_OUTLINE : UI.CREAM);
    g.save();
    g.translate(p.x, p.y);
    g.scale(mirror * s, s);
    g.lineCap = 'round';
    // shadow
    g.fillStyle = hexA(UI.CHAR, 0.25);
    g.beginPath(); g.ellipse(0, 0.5, 7, 2.2, 0, 0, TAU); g.fill();
    const stroke2 = (fn, w, c) => { g.strokeStyle = c; g.lineWidth = w; fn(); };
    const legs = () => {
      g.beginPath();
      if (poseB) { g.moveTo(-1, -8); g.lineTo(-1.5, 0); g.moveTo(1, -8); g.lineTo(1.5, 0); }
      else if (moving) { g.moveTo(-1, -8); g.lineTo(-4, 0); g.moveTo(1, -8); g.lineTo(4, 0); }
      else { g.moveTo(-2, -8); g.lineTo(-2, 0); g.moveTo(2, -8); g.lineTo(2, 0); }
      g.stroke();
    };
    stroke2(legs, 4.5, outline); // outline pass: silhouette stroked fat beneath the body
    stroke2(legs, 2.5, atlas.fixed.warden.BOOTS);
    // coat
    g.strokeStyle = outline; g.lineWidth = 2;
    g.fillStyle = atlas.fixed.warden.COAT;
    g.beginPath();
    g.moveTo(-5, -17); g.lineTo(5, -17); g.lineTo(5.5, -7); g.lineTo(-5.5, -7); g.closePath();
    g.stroke(); g.fill();
    // head + hat (the hat IS the silhouette read)
    g.fillStyle = atlas.fixed.warden.SKIN;
    g.beginPath(); g.arc(0, -19.5 + bob, 2.6, 0, TAU); g.fill();
    g.strokeStyle = outline; g.lineWidth = 1.5;
    g.fillStyle = atlas.fixed.warden.HAT;
    g.beginPath(); g.ellipse(0, -21.5 + bob, 8, 2, 0, 0, TAU); g.stroke(); g.fill();
    g.beginPath(); g.ellipse(0, -23 + bob, 4, 2.5, 0, 0, TAU); g.fill();
    g.fillStyle = UI.INK; g.fillRect(-4, -22.6 + bob, 8, 1.2); // hat band
    // tool per verb (the hands tell the mode before any HUD does)
    const mode = wd.verb ? wd.verb.mode : 'idle';
    if (view.scene === 'interlude') { // planting hoedad
      g.strokeStyle = UI.TIMBER; g.lineWidth = 2;
      g.beginPath(); g.moveTo(4, -13); g.lineTo(10, -1); g.stroke();
      g.fillStyle = UI.INK; g.fillRect(9, -2, 4, 2.5);
    } else if (mode === 'cut') { // the McLeod: shaft + 4-tine comb, scrape jiggle
      const jig = moving ? Math.sin(walkPhase * TAU * 3) * 0.8 : 0;
      g.strokeStyle = UI.TIMBER; g.lineWidth = 2;
      g.beginPath(); g.moveTo(3, -13); g.lineTo(10 + jig, -1); g.stroke();
      g.strokeStyle = UI.INK; g.lineWidth = 1.5;
      g.beginPath();
      for (let k = 0; k < 4; k++) { g.moveTo(7.5 + k * 1.6 + jig, -1); g.lineTo(8.5 + k * 1.6 + jig, 2); }
      g.stroke();
    } else if (mode === 'drip') { // the Kettle: canister + spout + flicking flame dab
      g.fillStyle = UI.INK;
      g.fillRect(5, -12, 3.5, 6);
      g.strokeStyle = UI.INK; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(7, -12); g.lineTo(10, -4); g.stroke();
      g.fillStyle = (Math.floor(t * 8) % 2) ? ROAR : fire(0.75);
      g.beginPath(); g.arc(10.2, -3, 1.8, 0, TAU); g.fill();
    } else if (mode === 'cede' || mode === 'aim') { // the radio: arm raised, broadcast arcs
      g.strokeStyle = outline; g.lineWidth = 2;
      g.beginPath(); g.moveTo(4, -14); g.lineTo(6.5, -19); g.stroke();
      g.fillStyle = UI.INK; g.fillRect(5.5, -22, 2.5, 3.5);
      const pu = (t % 1);
      g.strokeStyle = hexA(UI.CREAM, 0.6 * (1 - pu)); g.lineWidth = 1;
      g.beginPath(); g.arc(7, -21, 3 + pu * 4, -0.9, 0.9); g.stroke();
      g.beginPath(); g.arc(7, -21, 5 + pu * 4, -0.7, 0.7); g.stroke();
    }
    g.restore();
  }

  const COMPASS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  function drawWindsock(g) {
    // wind is the sentence of every fire: the sock is always on screen, screen-true angle
    const bx = 30, by = H - 26;
    g.strokeStyle = atlas.fixed.warden.POLE; g.lineWidth = 3;
    g.beginPath(); g.moveTo(bx, by); g.lineTo(bx, by - 34); g.stroke();
    const mph = wind.mphEffective;
    const m01 = clamp(mph / 30, 0, 1);
    const len = 18 + 38 * m01; // ≥30 mph clamps: the sock goes rigid
    const droop = (1 - m01) * 10;
    const rip = Math.sin(t * 2 * TAU) * 2 * m01;
    const dx = wind.tx, dy = wind.ty;
    const tipX = bx + dx * len, tipY = by - 34 + dy * len + droop + rip;
    const pxp = -dy, pyp = dx; // perpendicular for the taper
    for (let k = 0; k < 5; k++) { // 5 alternating stripes, tapered
      const t0 = k / 5, t1 = (k + 1) / 5;
      const w0 = 5 * (1 - t0 * 0.7), w1 = 5 * (1 - t1 * 0.7);
      const x0 = bx + (tipX - bx) * t0, y0 = (by - 34) + (tipY - (by - 34)) * t0;
      const x1 = bx + (tipX - bx) * t1, y1 = (by - 34) + (tipY - (by - 34)) * t1;
      g.fillStyle = k % 2 ? UI.CREAM : atlas.fixed.retardantCurtain;
      g.beginPath();
      g.moveTo(x0 + pxp * w0, y0 + pyp * w0); g.lineTo(x1 + pxp * w1, y1 + pyp * w1);
      g.lineTo(x1 - pxp * w1, y1 - pyp * w1); g.lineTo(x0 - pxp * w0, y0 - pyp * w0);
      g.closePath(); g.fill();
    }
    const comp = COMPASS[Math.round((((wind.deg % 360) + 360) % 360) / 45) % 8];
    text.label(g, `${comp} ${Math.round(mph)}`, bx + 4, by + 14, 11, 0.85, UI.CREAM, 'left');
  }

  function drawToasts(g, view) {
    const toasts = view.toasts || [];
    for (const toast of toasts) {
      const t01 = clamp(toast.t01 || 0, 0, 1);
      // envelope in t01 space: the game layer owns absolute timing (1.2 s + 300 ms fade for
      // liturgy per module contract); we hold to ~0.8 then fade — PROVISIONAL mapping
      const a = t01 < 0.07 ? t01 / 0.07 : t01 > 0.8 ? Math.max(0, 1 - (t01 - 0.8) / 0.2) : 1;
      if (a <= 0.01) continue;
      if (toast.register === 'liturgy') {
        text.liturgy(g, toast.text, W / 2, H * 0.3, Math.min(28, W / 26), a);
      } else {
        text.whisper(g, toast.text, W / 2, H - 92, 17, a);
      }
    }
  }
  function drawRadio(g, view) {
    const rl = view.radioLine;
    if (!rl || !rl.text) return;
    const t01 = clamp(rl.t01 || 0, 0, 1);
    const len = rl.text.length;
    // radio.js types at 18 chars/s then holds 4 s; t01 spans the whole thing, so the reveal
    // fraction is derivable from length alone (PROVISIONAL derivation, same numbers)
    const total = len / 18 + 4.0;
    const chars = Math.min(len, Math.floor(t01 * total * 18));
    const shown = rl.text.slice(0, chars);
    const bw = Math.min(W - 48, 680), bh = 38;
    const bx = (W - bw) / 2, by = H - bh - 14;
    const fade = t01 > 0.92 ? Math.max(0, 1 - (t01 - 0.92) / 0.08) : 1;
    g.globalAlpha = 0.82 * fade;
    g.fillStyle = UI.RADIO_BG;
    g.fillRect(bx, by, bw, bh);
    g.strokeStyle = UI.WOOD; g.lineWidth = 1;
    g.strokeRect(bx + 0.5, by + 0.5, bw - 1, bh - 1);
    g.globalAlpha = fade;
    g.strokeStyle = hexA(UI.CREAM, 0.5); // radio-wave prefix glyph
    g.beginPath(); g.arc(bx + 16, by + bh / 2, 3, -0.9, 0.9); g.stroke();
    g.beginPath(); g.arc(bx + 16, by + bh / 2, 6, -0.7, 0.7); g.stroke();
    g.font = `italic 15px ${SERIF}`;
    g.fillStyle = UI.CREAM;
    g.fillText(shown.toLowerCase(), bx + 30, by + bh / 2 + 5);
    g.globalAlpha = 1;
  }

  // ---- the log line (canon-final §10.5): the logbook writing itself ----
  // This is the one sentence the whole season is built to earn, and it is NOT radio: no
  // dispatcher, no squelch, no wave glyph, no plate. Nobody says it — the book says it.
  // The game layer suppresses radio ±20 s around it (game.js hooks.logLine), so this text
  // gets the screen alone; the only furniture is a soft scrim that guarantees it is
  // readable over a crowning basin (a scrim is light dropping, not a full-screen flash).
  const LOG_CPS = 12;          // chars/s — two thirds of radio's 18. The dispatcher is
                               // clipped and busy; a pen is not. The pace IS the beat.
  const LOG_HOLD_S = 6;        // it stays long enough to be re-read, which is the point
  const LOG_FADE_S = 0.8;
  const LOG_WINDOW_S = 10;     // PROVISIONAL: game.js retires the line at 300 ticks and t01
                               // spans exactly that life, so seconds = t01 × 10. Derived
                               // absolutely (not stretched like drawRadio's) because 12
                               // chars/s here is a authored tempo, not a fitted one:
                               // 38 chars = 3.2 s type + 6 s hold + 0.8 s fade = 10.0 s.
  function drawLogLine(g, view) {
    const ll = view.logLine;
    if (!ll || !ll.text) return;
    const str = ll.text.toLowerCase(); // in-fire register is lowercase, always (§12)
    const el = clamp(ll.t01 || 0, 0, 1) * LOG_WINDOW_S;
    const chars = clamp(Math.floor(el * LOG_CPS), 0, str.length);
    if (chars <= 0) return;
    const fadeAt = Math.min(str.length / LOG_CPS + LOG_HOLD_S, LOG_WINDOW_S - LOG_FADE_S);
    const a = el < fadeAt ? 1 : Math.max(0, 1 - (el - fadeAt) / LOG_FADE_S);
    if (a <= 0.01) return;
    const size = Math.min(24, W / 34); // larger than any whisper on screen, quieter than liturgy
    g.save();
    g.font = `italic ${size}px ${SERIF}`;
    // typewriter law: lay the line out at its FULL width and reveal in place. Centering the
    // partial string would slide every character left as the next arrives — a ticker, not
    // a pen, and the sentence would read as UI instead of as writing.
    const full = g.measureText(str).width;
    const x0 = (W - full) / 2, y = H - 44;
    const shown = str.slice(0, chars);
    g.globalAlpha = a;
    // scrim: an ellipse of ink under the words only, no edges to read as a box
    g.save();
    g.translate(W / 2, y - size * 0.3);
    g.scale(1, 0.42);
    const rad = full * 0.62 + 40;
    const scrim = g.createRadialGradient(0, 0, 0, 0, 0, rad);
    scrim.addColorStop(0, hexA(UI.CHAR, 0.72));
    scrim.addColorStop(0.6, hexA(UI.CHAR, 0.45));
    scrim.addColorStop(1, hexA(UI.CHAR, 0));
    g.fillStyle = scrim;
    g.beginPath(); g.arc(0, 0, rad, 0, TAU); g.fill();
    g.restore();
    g.fillStyle = UI.INK;
    g.fillText(shown, x0 + 1, y + 1);
    g.fillStyle = UI.CREAM;
    g.fillText(shown, x0, y);
    if (chars < str.length) { // the carriage: proof it is being written NOW, not recalled
      const w = g.measureText(shown).width;
      g.fillStyle = hexA(UI.CREAM, 0.8);
      g.fillRect(x0 + w + 1.5, y - size * 0.7, 1.5, size * 0.76);
    }
    g.restore();
  }

  function drawSatchel(g, view) {
    // The interlude's only HUD. 40 is a finite number and I4's authored inadequacy beat is
    // that it is finite (canon-final §9) — so the count is legible but never a resource bar:
    // lowercase, no icon, no frame, tucked at the windsock's shoulder.
    if (view.scene !== 'interlude' || typeof view.satchel !== 'number') return;
    const n = view.satchel | 0;
    const s = n <= 0 ? '· satchel empty' : `· ${n} seedling${n === 1 ? '' : 's'}`;
    text.whisper(g, s, 30, H - 70, 14, n <= 0 ? 0.92 : 0.72, UI.CREAM, 'left');
  }

  function drawCursor(g, view, pt) {
    const cur = view.cursor;
    if (!cur || !cur.screen) return;
    const cx = cur.screen.x, cy = cur.screen.y;
    // auto-contrast: luminance of the terrain token under the cursor (no getImageData/frame)
    let lumaUnder = 0.3;
    if (cur.world) {
      const wx = clamp(Math.floor(cur.world.x), 0, GRID - 1), wy = clamp(Math.floor(cur.world.y), 0, GRID - 1);
      const i = wy * GRID + wx;
      lumaUnder = (state[i] === S.BURNING || state[i] === S.EMBERCAST) ? 0.7 : tokenLuma[cellToken(i)];
      // hovering a named zone: the name surfaces, lowercase — words rationed
      if (cur.zoneName && pt >= FLAT_PT) text.whisper(g, cur.zoneName, cx, cy + 26, 12, 0.85);
    }
    const ink = lumaUnder > 0.5 ? UI.CURSOR_INK : UI.CURSOR_CREAM;
    const mode = cur.mode || 'idle';
    g.strokeStyle = ink; g.fillStyle = ink; g.lineWidth = 1.5;
    if (mode === 'aim') { // bracket crosshair (GRANDMOTHER)
      const b = 14;
      g.beginPath();
      g.moveTo(cx - b, cy - b + 5); g.lineTo(cx - b, cy - b); g.lineTo(cx - b + 5, cy - b);
      g.moveTo(cx + b - 5, cy - b); g.lineTo(cx + b, cy - b); g.lineTo(cx + b, cy - b + 5);
      g.moveTo(cx + b, cy + b - 5); g.lineTo(cx + b, cy + b); g.lineTo(cx + b - 5, cy + b);
      g.moveTo(cx - b + 5, cy + b); g.lineTo(cx - b, cy + b); g.lineTo(cx - b, cy + b - 5);
      g.stroke();
      g.fillRect(cx - 1, cy - 1, 2, 2);
      return;
    }
    // base: 5 px dot + 11 px ring
    let ringColor = ink;
    if (mode === 'cut' && cur.world) {
      const wx = clamp(Math.floor(cur.world.x), 0, GRID - 1), wy = clamp(Math.floor(cur.world.y), 0, GRID - 1);
      const i = wy * GRID + wx;
      if (state[i] === S.BURNING || state[i] === S.EMBERCAST) // you can't rake flame
        ringColor = (Math.floor(t * 6) % 2) ? atlas.fixed.retardantCurtain : ink;
    }
    g.strokeStyle = ringColor;
    g.beginPath(); g.arc(cx, cy, 5.5, 0, TAU); g.stroke();
    g.fillRect(cx - 1.25, cy - 1.25, 2.5, 2.5);
    if (mode === 'cut') { // McLeod glyph + 1–4 fuel-resistance pips: pre-answers "why so slow"
      g.strokeStyle = ink; g.lineWidth = 1.5;
      g.beginPath();
      g.moveTo(cx + 7, cy - 10); g.lineTo(cx + 13, cy - 4);
      for (let k = 0; k < 3; k++) { g.moveTo(cx + 11 + k * 1.8, cy - 6.5 + k * 1.8); g.lineTo(cx + 13 + k * 1.8, cy - 4.5 + k * 1.8); }
      g.stroke();
      if (cur.world) {
        const wx = clamp(Math.floor(cur.world.x), 0, GRID - 1), wy = clamp(Math.floor(cur.world.y), 0, GRID - 1);
        const cs = F_CUTSPEED[fuel[wy * GRID + wx]];
        const pips = cs >= 3.4 ? 1 : cs >= 2.5 ? 2 : cs >= 1.4 ? 3 : cs > 0 ? 4 : 0;
        for (let k = 0; k < pips; k++) g.fillRect(cx - 7 + k * 4.5, cy + 10, 3, 3);
      }
    } else if (mode === 'drip') { // flame teardrop leaning with the LIVE wind: the gauge that
      const m01 = clamp(wind.mphEffective / 30, 0, 1);        // matters at the moment it matters
      g.save();
      g.translate(cx + 9, cy - 6);
      g.rotate(Math.atan2(wind.ty, wind.tx) * m01 * 0.5 + (wind.tx >= 0 ? 0.5 : -0.5) * m01);
      g.fillStyle = fire(0.75);
      g.beginPath();
      g.moveTo(0, -6);
      g.quadraticCurveTo(4, -1, 0, 3);
      g.quadraticCurveTo(-4, -1, 0, -6);
      g.closePath(); g.fill();
      g.fillStyle = ROAR;
      g.beginPath(); g.arc(0, 0, 1.6, 0, TAU); g.fill();
      g.restore();
    } else if (mode === 'cede') { // radial fill drawn from cedeRing (game passes live t01)
      // the open-ring + slash base glyph; the fill itself is drawn by drawCedeRing
      g.beginPath(); g.moveTo(cx - 8, cy + 8); g.lineTo(cx + 8, cy - 8); g.stroke();
    }
  }
  function drawCedeRing(g, view) {
    const cr = view.cedeRing;
    if (!cr || !cr.screen) return;
    const t01 = clamp(cr.t01 || 0, 0, 1);
    const cx = cr.screen.x, cy = cr.screen.y, R = 22;
    g.strokeStyle = hexA(UI.CREAM, 0.45); g.lineWidth = 3;
    g.beginPath(); g.arc(cx, cy, R, 0, TAU); g.stroke();
    g.strokeStyle = UI.CREAM;
    g.beginPath(); g.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + t01 * TAU); g.stroke();
    // tick marks at 0.4 s / 0.8 s of the 1.2 s hold: counting to three before the unsayable
    for (const f of [1 / 3, 2 / 3]) {
      const a = -Math.PI / 2 + f * TAU;
      g.strokeStyle = t01 >= f ? UI.CREAM : hexA(UI.CREAM, 0.4);
      g.beginPath();
      g.moveTo(cx + Math.cos(a) * (R - 4), cy + Math.sin(a) * (R - 4));
      g.lineTo(cx + Math.cos(a) * (R + 4), cy + Math.sin(a) * (R + 4));
      g.stroke();
    }
  }

  function drawUi(cam, pt, view, nightRamp) {
    const g = L.ui.g;
    g.clearRect(0, 0, W, H);
    if (view.scene === 'interlude') { // golden hour without UI: the wash tells the time
      g.fillStyle = hexA(UI.GOLD_WASH, 0.06);
      g.fillRect(0, 0, W, H);
    }
    if (view.fuelLens) drawLens(cam, pt, visCache);
    if (pt < FLAT_PT) { // TOWER: small-caps zone cartography (canon §12: caps live up here only)
      for (let z = 1; z < 16; z++) {
        if (!zoneN[z] || !ZN[z]) continue;
        const s = cam.worldToScreen({ x: zoneCx[z], y: zoneCy[z] });
        if (s.x < 10 || s.x > W - 10 || s.y < 10 || s.y > H - 10) continue;
        text.label(g, ZN[z], s.x, s.y, 10, 0.62);
      }
    }
    drawWarden(g, cam, pt, view, nightRamp);
    drawWindsock(g);
    drawSatchel(g, view);
    drawToasts(g, view);
    drawRadio(g, view);
    drawLogLine(g, view); // last of the text registers: nothing overdraws the book
    drawCedeRing(g, view);
    drawCursor(g, view, pt);
  }

  // ================= full-screen scene helpers (minimal, documented) =================
  // These paint BACKDROPS onto the ui layer for the integrator's screens (screens.js owns the
  // content: calendar entries, ledger lines). Call once per rAF instead of frame(); each returns
  // layout rects so text lands on paper, not on hope. All draw in logical px on layer('ui').

  // drawTitle(tSec): CHAR field + the perpetually-burning GOODFIRE wordmark (edge flare +
  // rising embers), subtitle, and the autoplay gate line `take the watch` (canon-final §12).
  const titleEmbers = []; // tiny local pool; feel-stream jitter only
  function drawTitle(tSec) {
    const g = L.ui.g;
    g.fillStyle = UI.CHAR;
    g.fillRect(0, 0, W, H);
    const size = Math.min(W * 0.14, 150);
    if (!titleCache) {
      // boot-extract ~edge points of the wordmark: the word burns at its edges, never consumed
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = Math.ceil(size * 1.6);
      const og = oc.getContext('2d');
      og.font = `700 ${size}px ${SERIF}`;
      og.textAlign = 'center';
      og.fillStyle = UI.CREAM;
      og.fillText('GOODFIRE', W / 2, size * 1.15);
      const id = og.getImageData(0, 0, oc.width, oc.height).data;
      const pts = [];
      const alphaAt = (x, y) => (x < 0 || y < 0 || x >= oc.width || y >= oc.height) ? 0 : id[(y * oc.width + x) * 4 + 3];
      for (let y = 0; y < oc.height; y += 2) for (let x = 0; x < oc.width; x += 2) {
        const a = alphaAt(x, y);
        if (a > 128 && (alphaAt(x + 2, y) < 32 || alphaAt(x - 2, y) < 32 || alphaAt(x, y + 2) < 32 || alphaAt(x, y - 2) < 32))
          pts.push([x, y]);
      }
      let cx = 0, cy = 0;
      for (const p of pts) { cx += p[0]; cy += p[1]; }
      cx /= pts.length || 1; cy /= pts.length || 1;
      pts.sort((a, b) => Math.atan2(a[1] - cy, a[0] - cx) - Math.atan2(b[1] - cy, b[0] - cx));
      titleCache = { pts, oy: H * 0.34 - size * 1.15, size };
    }
    const tc = titleCache;
    g.font = `700 ${tc.size}px ${SERIF}`;
    g.textAlign = 'center';
    g.fillStyle = UI.CHAR; // char-black on black: visible only by its burning edge
    g.fillText('GOODFIRE', W / 2, tc.oy + tc.size * 1.15);
    g.strokeStyle = hexA(UI.WORD_EMBER, 0.25 + 0.1 * Math.sin(tSec * 0.1 * TAU));
    g.lineWidth = 2;
    g.strokeText('GOODFIRE', W / 2, tc.oy + tc.size * 1.15);
    g.textAlign = 'left';
    const N = tc.pts.length;
    if (N) {
      const ph = (tSec % 9) / 3.5; // a flare circumnavigates the edge every 9 s
      if (ph < 1) {
        const c0 = Math.floor(ph * N), wdw = Math.max(8, N * 0.06);
        g.fillStyle = ROAR;
        for (let k = 0; k < wdw; k++) {
          const p = tc.pts[(c0 + k) % N];
          g.fillRect(p[0] - 1, p[1] + tc.oy - 1, 2, 2);
        }
      }
      if (titleEmbers.length < 24 && feel() < 5 * DTF) { // ~5 embers/s off the edge
        const p = tc.pts[(feel() * N) | 0];
        titleEmbers.push({ x: p[0], y: p[1] + tc.oy, age: 0 });
      }
      for (let k = titleEmbers.length - 1; k >= 0; k--) {
        const e = titleEmbers[k];
        e.age += DTF;
        if (e.age > 1.2) { titleEmbers.splice(k, 1); continue; }
        e.x += 2 * DTF; e.y -= 12 * DTF;
        g.fillStyle = e.age < 0.5 ? ROAR : DEEP;
        g.globalAlpha = 1 - e.age / 1.2;
        g.fillRect(e.x, e.y, 1.5, 1.5);
      }
      g.globalAlpha = 1;
    }
    text.whisper(g, 'a season on ninemile mountain', W / 2, tc.oy + tc.size * 1.15 + 52, 20, 0.8, hexA(UI.PAPER_SHADE, 1));
    text.whisper(g, 'take the watch', W / 2, H - 70, 18, 0.5 + 0.4 * (0.5 + 0.5 * Math.sin(tSec * 0.2 * TAU)));
    text.whisper(g, 'f2 — plain map', W - 16, H - 16, 11, 0.35, UI.CREAM, 'right');
  }

  // drawLookout(monthKey): plank wall + pinned paper sheet + the month's palette swatch strip.
  // Returns { sheet: {x,y,w,h} } — the calendar content lives inside that rect.
  let lookoutWall = null;
  function drawLookout(monthKey) {
    const g = L.ui.g;
    if (!lookoutWall || lookoutWall.w !== W || lookoutWall.h !== H) {
      const oc = document.createElement('canvas');
      oc.width = W; oc.height = H;
      const og = oc.getContext('2d');
      og.fillStyle = UI.WOOD_LIGHT;
      og.fillRect(0, 0, W, H);
      for (let x = 0; x < W; x += 80) { // planks: seams + wavering grain, hash-jittered
        og.strokeStyle = hexA(UI.CHAR, 0.5); og.lineWidth = 1;
        og.beginPath(); og.moveTo(x + 0.5, 0); og.lineTo(x + 0.5, H); og.stroke();
        og.strokeStyle = hexA(UI.WOOD, 0.8);
        for (let k = 0; k < 3; k++) {
          const gx = x + 14 + cellHash01(x + k, 0x21) * 52;
          og.beginPath();
          og.moveTo(gx, 0);
          for (let y = 0; y < H; y += 40)
            og.lineTo(gx + (cellHash01(x + k * 31 + y, 0x22) - 0.5) * 6, y + 40);
          og.stroke();
        }
      }
      lookoutWall = { c: oc, w: W, h: H };
    }
    g.drawImage(lookoutWall.c, 0, 0);
    const sw = Math.min(W * 0.72, 900), sh = Math.min(H * 0.82, 620);
    const sx = (W - sw) / 2, sy = (H - sh) / 2;
    g.save();
    g.translate(sx + sw / 2, sy + sh / 2);
    g.rotate(0.4 * Math.PI / 180); // pinned slightly crooked, like a real wall
    g.fillStyle = hexA(UI.CHAR, 0.33);
    g.fillRect(-sw / 2 + 4, -sh / 2 + 6, sw, sh);
    g.fillStyle = UI.PAPER;
    g.fillRect(-sw / 2, -sh / 2, sw, sh);
    g.strokeStyle = UI.PAPER_SHADE; g.lineWidth = 2;
    g.strokeRect(-sw / 2 + 3, -sh / 2 + 3, sw - 6, sh - 6);
    // the season's drift, literally pinned to the wall (R3): month fuel mids as swatches
    const P = atlas.palettes[MONTHS.includes(monthKey) ? monthKey : 'jun'];
    const fuels = ['grass', 'shrub', 'hardwood', 'conifer', 'slash', 'duff'];
    for (let k = 0; k < 6; k++) {
      g.fillStyle = P[fuels[k]][1];
      g.fillRect(-sw / 2 + 18 + k * 28, sh / 2 - 34, 22, 22);
    }
    g.restore();
    return { sheet: { x: sx, y: sy, w: sw, h: sh } };
  }

  // drawLedgerBackdrop(): night-dims the live world (the layers beneath keep rendering — you
  // close the book on a live mountain) + the open book. Returns { left, right } page rects.
  function drawLedgerBackdrop() {
    const g = L.ui.g;
    g.fillStyle = hexA(atlas.fixed.dark, 0.55);
    g.fillRect(0, 0, W, H);
    const bw = Math.min(W * 0.86, 1080), bh = Math.min(H * 0.86, 640);
    const bx = (W - bw) / 2, by = (H - bh) / 2;
    const pw = (bw - 36) / 2;
    for (const [px0, flip] of [[bx, 0], [bx + bw - pw, 1]]) {
      g.fillStyle = hexA(UI.CHAR, 0.4);
      g.fillRect(px0 + 3, by + 5, pw, bh);
      g.fillStyle = UI.PAPER;
      g.fillRect(px0, by, pw, bh);
      g.strokeStyle = UI.PAPER_SHADE; g.lineWidth = 1; // page-edge stack lines
      for (let k = 1; k <= 3; k++) {
        const ex = flip ? px0 + pw - 0.5 - k * 2 : px0 + 0.5 + k * 2;
        g.beginPath(); g.moveTo(ex, by + k); g.lineTo(ex, by + bh - k); g.stroke();
      }
    }
    const grad = g.createLinearGradient(bx + pw, by, bx + bw - pw, by); // gutter shadow
    grad.addColorStop(0, hexA(UI.CHAR, 0.35)); grad.addColorStop(0.5, hexA(UI.CHAR, 0.6));
    grad.addColorStop(1, hexA(UI.CHAR, 0.35));
    g.fillStyle = grad;
    g.fillRect(bx + pw, by, bw - 2 * pw, bh);
    return { left: { x: bx, y: by, w: pw, h: bh }, right: { x: bx + bw - pw, y: by, w: pw, h: bh } };
  }

  // ================= the frame =================
  let visCache = { x0: 0, y0: 0, x1: 0, y1: 0, wx0: 0, wy0: 0, wx1: 0, wy1: 0 };
  const ZERO_SHK = { x: 0, y: 0 };
  let quality = 1, frameEma = 8; // adaptive lick-density governor (see frame())
  function frame(view) {
    const t0 = (typeof performance !== 'undefined') ? performance.now() : 0;
    t += DTF; frameN++;
    // adaptive quality governor: a detonation must never cost the 60 fps that reading it
    // requires. EMA of frame cost steers the lick budget between 35% and 100%; density is
    // the first thing a player forgives and the last thing they can read through jank.
    if (perf.frameMs > 0) {
      frameEma = frameEma * 0.9 + perf.frameMs * 0.1;
      if (frameEma > 13 && quality > 0.35) quality = Math.max(0.35, quality - 0.03);
      else if (frameEma < 9 && quality < 1) quality = Math.min(1, quality + 0.01);
    }
    const cam = view.camera;
    if (!cam) return;
    const pt = cam.pxPerTile();
    const shk = cam.shake ? cam.shake() : ZERO_SHK; // trauma touches L0–L3 only, NEVER ui
    if (view.month && view.month !== month) setMonth(view.month);
    ingestDirty();
    if (!flatMode) {
      const cc = cam.screenToWorld({ x: W / 2, y: H / 2 });
      repaintBudget(cc.x, cc.y);
    }
    const r = visRect(cam);
    visCache = r;
    const m0 = performance.now();
    collect(r);
    spawnFrameSmoke();
    const m1 = performance.now();
    const nightRamp = drawTerrain(cam, pt, shk, r, view);
    const m2 = performance.now();
    drawSmoke(cam, pt, shk, view);
    const m3 = performance.now();
    drawNight(cam, pt, shk, view, nightRamp);
    const m4 = performance.now();
    drawFire(cam, pt, shk, r, view);
    const m5 = performance.now();
    drawUi(cam, pt, view, nightRamp);
    const m6 = performance.now();
    // stage ledger: when a frame goes over budget, the first question is WHERE — keep the
    // answer always-on (7 clock reads/frame) and reachable headless (harness has no renderer)
    perf.tRepaint = m0 - t0; perf.tCollect = m1 - m0; perf.tTerrain = m2 - m1;
    perf.tSmoke = m3 - m2; perf.tNight = m4 - m3; perf.tFire = m5 - m4; perf.tUi = m6 - m5;
    if (typeof window !== 'undefined') window.__renderPerf = perf;
    if (t0) perf.frameMs = performance.now() - t0;
    perf.chunkQ = 0;
    for (let k = 0; k < myDirty.length; k++) perf.chunkQ += myDirty[k];
  }

  function setFlatMode(on) {
    // no full invalidation on switch-back: ingestDirty keeps accumulating chunk changes into
    // myDirty while flat mode runs, so the painterly cache is exactly as stale as the sim says
    flatMode = !!on;
  }

  return {
    frame, resize, setFlatMode,
    // scene backdrops (title / lookout calendar / ledger) — see comments above each
    drawTitle, drawLookout, drawLedgerBackdrop,
    // integration hooks: registers + raw layer access so screens.js draws content in-register
    text,
    atlas,
    layer: (name) => L[name] && L[name].c,
    ctx: (name) => L[name] && L[name].g,
    setMonth,
    perf: () => ({ ...perf }),
    flatMode: () => flatMode,
  };
}
