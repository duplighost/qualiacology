// GOODFIRE map.js — the authored Ninemile Mountain (season spec §2–§4 is the atlas canon).
// One mountain, identical for every player: everything here derives from WORLD_SEED via
// salted cell-hash noise — no RNG stream is consumed, so map construction can never shift
// ember dice (determinism law). Pure module: no DOM, Node-importable.

import { GRID, CELLS, FUEL, TWIST } from './canon.js';
import { cellHash01, WORLD_SEED } from './rng.js';

export const ZONE = Object.freeze({
  NONE: 0, MILLHAVEN: 1, LARDER: 2, DOGHAIR: 3, TIN_CAMP: 4, CAMAS: 5, BRIDE_CREEK: 6,
  HASTY_DRAW: 7, EWE_BENCH: 8, WICK_ORCHARD: 9, PREACHERS_KNOB: 10, HALLORAN_MILL: 11,
  STATIC_POINT: 12, FAR_BANK: 13, DITCH: 14,
});
export const ZONE_NAMES = ['', 'millhaven', 'the larder', 'the doghair', 'the tin camp',
  'the camas slope', 'bride creek', 'hasty draw', 'the ewe bench', 'the wick orchard',
  "preacher's knob", 'the halloran mill', 'static point', 'the far bank', 'the ditch'];

// featureId ranges: 1–19 rock, 20–29 water reaches, 30–39 roads, 40 map edge,
// 100+ scar patches (runtime), 200+ retardant drops (runtime).
export const FEATURE = Object.freeze({ EDGE: 40, GRADE: 30, STREETS: 31 });

const idx = (x, y) => y * GRID + x;
const inb = (x, y) => x >= 0 && y >= 0 && x < GRID && y < GRID;

// ---- salted value noise (bilinear over a virtual lattice; no stream consumption) ----
function vnoise(x, y, scale, salt) {
  const gx = x / scale, gy = y / scale;
  const x0 = Math.floor(gx), y0 = Math.floor(gy);
  const fx = gx - x0, fy = gy - y0;
  const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);
  const h = (X, Y) => cellHash01((Y & 1023) * 1024 + (X & 1023), (WORLD_SEED ^ salt) >>> 0);
  const a = h(x0, y0), b = h(x0 + 1, y0), c = h(x0, y0 + 1), d = h(x0 + 1, y0 + 1);
  return a + (b - a) * sx + (c - a) * sy + (a - b - c + d) * sx * sy;
}
function fbm(x, y, salt) {
  return 0.55 * vnoise(x, y, 96, salt) + 0.30 * vnoise(x, y, 34, salt ^ 0x55) +
         0.15 * vnoise(x, y, 11, salt ^ 0xAA);
}

// ---- polyline rasterization helpers ----
function eachSegCell(pts, cb) { // walk polyline at sub-cell steps
  for (let s = 0; s < pts.length - 1; s++) {
    const [x0, y0] = pts[s], [x1, y1] = pts[s + 1];
    const len = Math.hypot(x1 - x0, y1 - y0), steps = Math.ceil(len * 2);
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      cb(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, s, t);
    }
  }
}
function stampDisc(arr, x, y, r, val) {
  const R = Math.ceil(r);
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
    const X = Math.round(x + dx), Y = Math.round(y + dy);
    if (inb(X, Y) && dx * dx + dy * dy <= r * r) arr[idx(X, Y)] = val;
  }
}

// ---- authored geography (season §2, verbatim coordinates) ----
const HOGBACK = [[40,138],[120,104],[162,86],[214,78],[252,88]];
const SLATE_FORK = [[268,8],[262,60],[255,120],[248,180],[244,232],[232,268],[208,292],[196,319]];
const BRIDE_CREEK = [[96,118],[84,150],[78,190],[66,228],[30,260],[0,268]];
const GRADE = [[160,288],[120,262],[190,240],[130,214],[200,190],[150,160],[178,130],[150,108],[162,88]];

// Structures (season §4): name, cells (footprints), zone. Each is its own FSM unit.
function structCells(x, y, w = 1, h = 1) {
  const cells = [];
  for (let dy = 0; dy < h; dy++) for (let dx = 0; dx < w; dx++) cells.push(idx(x + dx, y + dy));
  return cells;
}
export function buildStructures() {
  const S = [];
  const add = (key, name, cells, opts = {}) => S.push({ key, name, cells, ...opts });
  add('lookout', 'ninemile lookout', structCells(162, 82, 2, 2), { indestructible: true });
  add('relayHut', 'the static point relay hut', structCells(226, 111, 2, 1));
  add('propane', 'the static point propane bottle', structCells(227, 113), { propane: true });
  add('tinBunk', 'the tin camp bunkhouse', structCells(178, 40, 2, 2));
  add('tinShed', 'the tin camp machine shed', structCells(183, 42, 2, 1));
  add('weaverHouse', 'the weaver place — house', structCells(92, 186, 2, 2));
  add('weaverBarn', 'the weaver place — barn', structCells(95, 184, 2, 2));
  add('sawShed', 'the saw shed', structCells(236, 206, 2, 2));
  add('planerShed', 'the planer shed', structCells(240, 204, 2, 1));
  add('millOffice', 'the mill office', structCells(234, 202, 1, 1));
  add('burner', 'the sawdust burner', structCells(241, 210, 1, 1));
  add('dryingShed', 'the wick orchard drying shed', structCells(194, 262, 2, 1));
  add('sextonShed', "the sexton's shed", structCells(148, 267, 1, 1));
  add('mercantile', 'the mercantile', structCells(166, 296, 2, 2));
  add('school', 'the school', structCells(152, 292, 2, 2));
  add('church', 'the alder street church', structCells(176, 294, 2, 2));
  add('grange', 'the grange hall', structCells(146, 296, 2, 1));
  add('firehouse', 'the firehouse', structCells(160, 294, 1, 1));
  add('depot', 'the depot', structCells(188, 298, 2, 2));
  add('hayBarn', "petersen's hay barn", structCells(136, 300, 2, 2));
  add('cobbShed', "cobb's hay shed", structCells(231, 297, 1, 1)); // prologue's given pocket
  for (let i = 0; i < 6; i++)
    add('northHouse' + (i + 1), 'north street house ' + (i + 1), structCells(140 + i * 8, 290, 1, 1));
  for (let i = 0; i < 6; i++)
    add('millRowHouse' + (i + 1), 'mill row house ' + (i + 1), structCells(142 + i * 7, 306, 1, 1));
  return S;
}

// ---- zone painting (bounding regions + organic noise edges) ----
function zoneRegion(zoneId, x0, y0, x1, y1, salt, feather = 8) {
  return { zoneId, x0, y0, x1, y1, salt, feather };
}
const ZONES = [
  zoneRegion(ZONE.LARDER, 56, 28, 128, 92, 0x11),
  zoneRegion(ZONE.DOGHAIR, 198, 36, 258, 98, 0x12),
  zoneRegion(ZONE.TIN_CAMP, 172, 34, 190, 48, 0x13, 3),
  zoneRegion(ZONE.CAMAS, 176, 110, 252, 232, 0x14),
  zoneRegion(ZONE.BRIDE_CREEK, 48, 118, 120, 235, 0x15),
  zoneRegion(ZONE.HASTY_DRAW, 36, 196, 96, 252, 0x16),
  zoneRegion(ZONE.EWE_BENCH, 48, 258, 120, 300, 0x17),
  zoneRegion(ZONE.WICK_ORCHARD, 176, 252, 212, 272, 0x18, 3),
  zoneRegion(ZONE.PREACHERS_KNOB, 146, 258, 158, 268, 0x19, 2),
  zoneRegion(ZONE.HALLORAN_MILL, 232, 200, 244, 220, 0x1A, 2),
  zoneRegion(ZONE.STATIC_POINT, 222, 106, 230, 116, 0x1B, 2),
  zoneRegion(ZONE.MILLHAVEN, 128, 288, 196, 316, 0x1C, 2),
  zoneRegion(ZONE.DITCH, 204, 284, 240, 302, 0x1D, 2),
];

export function buildMap() {
  const fuel = new Uint8Array(CELLS);
  const load0 = new Float32Array(CELLS).fill(1.0);
  const elev = new Uint8Array(CELLS);
  const zoneId = new Uint8Array(CELLS);
  const featureId = new Uint16Array(CELLS);
  const lastBurnYear = new Int16Array(CELLS); // 0 = long ago/never tracked; basins get 1986/1981

  // -- elevation: summit ridge north-center, town low south, river valley east --
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    let e = 1 - y / GRID;                               // south-descending base
    // ridge bump along the Hogback
    let ridge = 0;
    for (let s = 0; s < HOGBACK.length - 1; s++) {
      const [ax, ay] = HOGBACK[s], [bx, by] = HOGBACK[s + 1];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
        ((bx - ax) ** 2 + (by - ay) ** 2)));
      const d = Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t));
      ridge = Math.max(ridge, Math.max(0, 1 - d / 46));
    }
    e = e * 0.55 + ridge * 0.40 + fbm(x, y, 0x01) * 0.18;
    // river valley carve
    let dRiver = 1e9;
    for (let s = 0; s < SLATE_FORK.length - 1; s++) {
      const [ax, ay] = SLATE_FORK[s], [bx, by] = SLATE_FORK[s + 1];
      const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) /
        ((bx - ax) ** 2 + (by - ay) ** 2)));
      dRiver = Math.min(dRiver, Math.hypot(x - (ax + (bx - ax) * t), y - (ay + (by - ay) * t)));
    }
    e -= Math.max(0, 1 - dRiver / 30) * 0.12;
    elev[i] = Math.max(0, Math.min(255, Math.round(e * 235)));
  }

  // -- zones (feathered rectangles; later entries overwrite earlier where they overlap) --
  for (const z of ZONES) {
    for (let y = z.y0; y <= z.y1; y++) for (let x = z.x0; x <= z.x1; x++) {
      if (!inb(x, y)) continue;
      const fx = Math.min(x - z.x0, z.x1 - x), fy = Math.min(y - z.y0, z.y1 - y);
      const edge = Math.min(fx, fy);
      if (edge >= z.feather || vnoise(x, y, 9, z.salt) < 0.35 + 0.6 * (edge / z.feather))
        zoneId[idx(x, y)] = z.zoneId;
    }
  }
  // far bank: everything east of the river
  // (painted after river raster below so we can use the water mask)

  // -- base fuel from elevation + noise (the unzoned matrix) --
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    const n = fbm(x, y, 0x02), e = elev[i] / 235;
    let f;
    if (e > 0.78 && n > 0.42) f = FUEL.ROCK;                    // scree near the ridgeline
    else if (n < 0.30) f = FUEL.GRASS;
    else if (n < 0.52) f = e > 0.5 ? FUEL.PINE_LITTER : FUEL.GRASS;
    else if (n < 0.70) f = FUEL.BRUSH;
    else if (n < 0.88) f = FUEL.TIMBER;
    else f = FUEL.CROWN_CANOPY;                                  // dense stands ~8%
    fuel[i] = f;
  }

  // -- zone fuel overrides --
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y), z = zoneId[i], n = vnoise(x, y, 7, 0x03);
    switch (z) {
      case ZONE.LARDER: // old fir-larch, deep duff — SEEDED UNBURNED 1986
        fuel[i] = n < 0.55 ? FUEL.PINE_LITTER : (n < 0.85 ? FUEL.TIMBER : FUEL.CROWN_CANOPY);
        load0[i] = TWIST.BASIN_SEED_LOAD; lastBurnYear[i] = 1986; break;
      case ZONE.DOGHAIR: // unthinned fir thicket — SEEDED UNBURNED 1981
        fuel[i] = n < 0.75 ? FUEL.BRUSH : FUEL.CROWN_CANOPY;
        load0[i] = TWIST.BASIN_SEED_LOAD; lastBurnYear[i] = 1981; break;
      case ZONE.TIN_CAMP: fuel[i] = n < 0.8 ? FUEL.GRASS : FUEL.PINE_LITTER; break;
      case ZONE.CAMAS: { // camas meadows with timber stringers (authored stripes)
        const stringer = Math.abs(((x * 0.55 + y) % 34) - 17) < 3 && vnoise(x, y, 15, 0x04) > 0.3;
        fuel[i] = stringer ? (n < 0.6 ? FUEL.TIMBER : FUEL.CROWN_CANOPY)
                           : (n < 0.85 ? FUEL.GRASS : FUEL.PINE_LITTER);
        break;
      }
      case ZONE.BRIDE_CREEK: fuel[i] = n < 0.5 ? FUEL.GRASS : (n < 0.85 ? FUEL.BRUSH : FUEL.RIPARIAN); break;
      case ZONE.HASTY_DRAW: fuel[i] = n < 0.6 ? FUEL.GRASS : FUEL.BRUSH; load0[i] = 1.15; break;
      case ZONE.EWE_BENCH: fuel[i] = FUEL.GRASS; load0[i] = 0.5; break; // grazed: cannot crown, ever
      case ZONE.WICK_ORCHARD: fuel[i] = FUEL.GRASS; load0[i] = 0.8; break;
      case ZONE.PREACHERS_KNOB: fuel[i] = FUEL.GRASS; load0[i] = 0.3; break; // mowed inside the fence
      case ZONE.HALLORAN_MILL: fuel[i] = n < 0.45 ? FUEL.SLASH : FUEL.SOIL; load0[i] = n < 0.45 ? 1.4 : 1.0; break;
      case ZONE.STATIC_POINT: fuel[i] = n < 0.5 ? FUEL.ROCK : FUEL.GRASS; break;
      case ZONE.MILLHAVEN: { // street grid + mown yards
        const street = (x % 10 < 2) || (y % 8 < 2);
        fuel[i] = street ? FUEL.SOIL : FUEL.GRASS; load0[i] = street ? 1.0 : 0.3;
        if (street) featureId[i] = FEATURE.STREETS;
        break;
      }
      case ZONE.DITCH: fuel[i] = FUEL.GRASS; load0[i] = 1.1; break;
    }
  }

  // -- terrain spine rasters (order matters: ridge, river, creek, road) --
  let rockFeature = 1;
  eachSegCell(HOGBACK, (x, y, s) => stampDisc(fuel, x, y, 3.2 + vnoise(x, y, 13, 0x05) * 1.6, FUEL.ROCK));
  eachSegCell(HOGBACK, (x, y, s) => {
    const r = 3.2; const R = Math.ceil(r);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const X = Math.round(x + dx), Y = Math.round(y + dy);
      if (inb(X, Y) && dx * dx + dy * dy <= r * r && fuel[idx(X, Y)] === FUEL.ROCK)
        featureId[idx(X, Y)] = 1 + s; // one feature per ridge segment
    }
  });
  // scattered rock outcrops (tie-in anchors in the matrix)
  for (let k = 0; k < 26; k++) {
    const x = Math.floor(cellHash01(k, WORLD_SEED ^ 0x60) * GRID);
    const y = Math.floor(cellHash01(k, WORLD_SEED ^ 0x61) * GRID * 0.8);
    if (!inb(x, y) || zoneId[idx(x, y)] === ZONE.MILLHAVEN) continue;
    const r = 1.5 + cellHash01(k, WORLD_SEED ^ 0x62) * 2.5;
    stampDisc(fuel, x, y, r, FUEL.ROCK);
    stampDisc(featureId, x, y, r, 8 + k);
  }
  eachSegCell(SLATE_FORK, (x, y, s) => {
    const w = 1.6 + vnoise(x, y, 21, 0x06) * 1.4; // 3–5 cells wide
    stampDisc(fuel, x, y, w, FUEL.WATER);
    stampDisc(featureId, x, y, w, 20 + Math.min(3, s >> 1)); // river reaches
  });
  eachSegCell(BRIDE_CREEK, (x, y, s) => {
    stampDisc(fuel, x, y, 0.9, FUEL.WATER);
    stampDisc(featureId, x, y, 0.9, 26 + Math.min(2, s >> 1));
  });
  // riparian fringe along both watercourses
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    if (fuel[i] === FUEL.WATER) continue;
    let nearWater = false;
    for (let dy = -2; dy <= 2 && !nearWater; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Y = y + dy;
      if (inb(X, Y) && fuel[idx(X, Y)] === FUEL.WATER) { nearWater = true; break; }
    }
    if (nearWater && vnoise(x, y, 5, 0x07) > 0.35 && fuel[i] !== FUEL.ROCK && fuel[i] !== FUEL.SOIL)
      fuel[i] = FUEL.RIPARIAN;
  }
  // the Grade: 2-cell mineral switchback road, one featureId
  eachSegCell(GRADE, (x, y) => { stampDisc(fuel, x, y, 1.2, FUEL.SOIL); stampDisc(featureId, x, y, 1.2, FEATURE.GRADE); });
  // bridges: mineral decks over the water
  stampDisc(fuel, 244, 210, 1.4, FUEL.SOIL); stampDisc(fuel, 198, 300, 1.4, FUEL.SOIL);
  // ballfield infield (authored town break)
  stampDisc(fuel, 132, 290, 2.2, FUEL.SOIL);
  // lookout pad
  stampDisc(fuel, 162, 82, 2.6, FUEL.SOIL);

  // far bank zone: east of the river (after water raster)
  for (let y = 0; y < GRID; y++) {
    let seenWater = false;
    for (let x = GRID - 1; x >= 0; x--) {
      const i = idx(x, y);
      if (fuel[i] === FUEL.WATER && x > 190) break; // stop at the river from the east
      if (zoneId[i] === ZONE.NONE && x > 244) {
        zoneId[i] = ZONE.FAR_BANK;
        if (fuel[i] === FUEL.GRASS) fuel[i] = FUEL.PINE_LITTER; // thin timber
      }
    }
  }

  // -- structures --
  const structures = buildStructures();
  for (const s of structures) for (const c of s.cells) { fuel[c] = FUEL.STRUCTURE; load0[c] = 1.0; }

  // -- authored strike pockets in the basins --
  // Each is a bench of LIGHTER, PURE fuel (no black-timber canopy — canopy crowns at any
  // load once D ≥ 0.60 and would detonate the strike instantly) on the basin's DOWNWIND (NE)
  // shoulder relative to Fire Four's opening SW wind: the strike runs away from the basin
  // with the wind while the flank CREEPS crosswind into the ≥2.0 fuel mass at calm rates
  // (~0.125 t/s × ~9 tiles ≈ 60–90 s) — the log-line fuse is travel time, never a script.
  // Pockets are NE-quadrant SLABS, not discs: the wind-driven run out of the strike stays
  // inside low fuel all the way to the zone edge (downwind travel is ~1.8 t/s with gusts and
  // ridge slope — any disc gets exited in seconds); the ≥2.0 mass lies crosswind/upwind at
  // creep speeds, ~10–12 tiles ≈ 40–120 s of honest fuse.
  function stampPocketSlab(zone, xMin, yMax, pocketFuel) {
    for (let y = 0; y <= yMax; y++) for (let x = xMin; x < GRID; x++) {
      const i = idx(x, y);
      if (zoneId[i] !== zone) continue;
      const f = fuel[i];
      if (f === FUEL.BRUSH || f === FUEL.CROWN_CANOPY || f === FUEL.PINE_LITTER ||
          f === FUEL.TIMBER || f === FUEL.GRASS) {
        fuel[i] = pocketFuel;
        load0[i] = TWIST.STRIKE_POCKET_LOAD;
      }
    }
  }
  stampPocketSlab(ZONE.DOGHAIR, 216, 76, FUEL.BRUSH);      // s1 strike (228,66)
  stampPocketSlab(ZONE.LARDER, 82, 66, FUEL.PINE_LITTER);  // s3 strike (92,56)

  // -- moisture jitter: authored dampness patchiness (see sim.initFire) --
  // Blobby damp draws: ~25% of cells carry ×2.2 moisture (dead in June, cured out by D≥0.7);
  // the rest ride a gentle ×0.85–1.25 field. Keeps early fires percolating and honest while
  // October burns whole — and damp draws are readable terrain, not invisible dice.
  const moistJitter = new Float32Array(CELLS);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    const i = idx(x, y);
    const n = 0.6 * vnoise(x, y, 13, 0x2F) + 0.4 * vnoise(x, y, 5, 0x3F);
    moistJitter[i] = n > 0.585 ? 2.2 : 0.85 + 0.4 * n;
    // green benches: grazed/mown/watered ground holds moisture until fall — the town's
    // western approaches are geometrically protected in June and a live fight by October
    // (D 0.85: 0.26 × 0.15 × 2.2 ≈ 0.086 → burns clean). Diegetic, seasonal, auditable.
    const z = zoneId[i];
    if (z === ZONE.EWE_BENCH || z === ZONE.PREACHERS_KNOB)
      moistJitter[i] = Math.max(moistJitter[i], 2.2);
    if (z === ZONE.MILLHAVEN)
      moistJitter[i] = Math.max(moistJitter[i], 5.0); // the town waters its lawns: yards never carry — the siege is fought on the roofs
    // the town skirt commons (grazed pasture between the bench and the streets) — green
    // until fall like the bench; the prologue's ditch (x ≥ 204) stays cured june roadside
    if (y >= 280 && x >= 112 && x <= 202 && z === ZONE.NONE)
      moistJitter[i] = Math.max(moistJitter[i], 2.2);
  }

  // -- landmarks / meta --
  const landmarks = {
    lookout: [162, 82], hundredyearCedar: [214, 168], // named in season atlas (canon-final §12)
    millBridge: [244, 210], townBridge: [198, 300],
    windsocks: [[162, 82], [238, 208], [172, 300], [92, 186], [226, 111], [183, 40]],
  };

  return { fuel, baseFuel: fuel.slice(), load0, elev, zoneId, featureId, lastBurnYear,
           moistJitter, structures, landmarks, ZONE, ZONE_NAMES };
}
