// GOODFIRE season.js — the content canon: all seven fire scenarios, Rx units, and the
// per-fire director (script conductor). Owner: Module D (spec-season with canon-final
// overrides). Data is authored in SECONDS and converted to ticks at the one seam (the
// director) — the tables below must stay diffable against spec-season's script tables.
// Imports kernel only. Never mutates kernel internals except through its public surface
// (igniteAt / setSchedule / setWeatherEnd) — plus the exposed ember pool for F5's scripted
// volleys (the pool is a published sim surface; landing/telegraph physics stay sim's).

import { TICK_HZ, CELLS, GRID, FUEL, S, FLAG, SEASON_D } from './canon.js';
import { mulberry32 } from './rng.js';
import { ZONE } from './map.js';

const H = TICK_HZ; // seconds → ticks
const idx = (x, y) => y * GRID + x;

// The twist log line (season §10.5). Unattributed — the logbook writing itself, NOT the
// dispatcher; it lives here, not in radio.js LINES, on purpose (canon-final: "separate").
export const LOG_LINE = 'nothing has burned here in forty years.';

// burnFire ordinal → month word, for D-43's "{month}'s black" (save model: prologue=1..crown=7,
// rx=8+). Rx windows are both in september.
export const FIRE_MONTHS = ['june', 'june', 'july', 'july', 'august', 'september', 'october'];
export function monthOfOrdinal(ord) {
  if (ord >= 8) return 'september';
  return FIRE_MONTHS[ord - 1] || 'august'; // PROVISIONAL fallback: the Hundredyear scar is the likely wall
}

// ---- FIRES — the seven scenarios, in calendar order (spec-season §6–§12; canon-final §3
// dryness, §6 grandmotherCharges F6=2, TWO basins) ----------------------------------------
// Shape per interfaces.md Module D. Wind deg = FROM, met convention (sim converts to toward).
// weatherEndT = scripted weather death start (sim.setWeatherEnd); durationT = hard close.
// beats: {t,name,radio?,params?} timed, or {cond,name,radio?} condition-driven (director
// implements each cond by name). pars feed ledger.js medal selection.
export const FIRES = [
  {
    id: 'prologue', name: 'the ditch fire', date: 'jun 2', D: SEASON_D.prologue,
    // Zero text until the fire is out (season §6): silent=true mutes every generic line;
    // D-1 is the game's first words, at close.
    silent: true, night: false,
    spawn: { x: 198, y: 300 }, // the town bridge — you run out over the river, ditch in front
    ignitions: [
      { t: 0, x: 212, y: 296 },   // pocket 1: CUT LINE — ditch grass west of the boulder neck
                                  // (spec's (210,296) is riparian on the kernel map; kernel-verified grass)
      { t: 60, x: 226, y: 290 },  // pocket 2: BACKBURN — heavier grass, plow furrow at x=220
      { t: 100, x: 231, y: 295 }, // pocket 3: SACRIFICE — cobb's pocket, fire on three sides
      { t: 140, x: 236, y: 288 }, // pocket 4: GRANDMOTHER — the finger toward the schoolyard
    ],
    // E 6 steady: training wheels. deg is FROM (met), so this pushes the fire WEST — which is
    // what §6 authors: pocket 2's plow furrow (x=220) is WEST of ignition B (x=226), and
    // pocket 4's finger crosses "toward the schoolyard". West is also where the box is (the
    // Slate Fork's bend, and the town lots' watered green). The old deg 270 read the compass
    // backwards and pushed every pocket EAST into the open far bank instead: measured 374 ac
    // AFK, running off the map edge at x=304 — the ~9 ac ditch pocket, gone continental.
    wind: [{ t: 0, deg: 90, mph: 6 }, { t: 240, deg: 90, mph: 4 }],
    weatherEndT: 240, durationT: 300, // evening humidity at 4:00 if anything still burns
    threatenedZones: [ZONE.DITCH],
    structuresAtStake: ['cobbShed'],
    grandmotherCharges: 1, basinFloor: true,
    beats: [], startRadio: null, weatherEndRadio: null, closeRadio: 'D-1',
    pars: {},
    medals: { best: 'FIRST DIRT.', mid: 'FIRST DIRT.', overrun: 'FIRST DIRT.' }, // wordless school never grades
    calendarLine: 'ditch fire. hired.',
  },
  {
    id: 'fire1', name: 'the bride creek fire', date: 'jun 19', D: SEASON_D.fire1,
    silent: false, night: false,
    spawn: { x: 162, y: 88 }, // the Lookout — ~100 tiles to the crossing at sprint ≈ 17 s
    // the skid-trail crossing — beside the creek, not in it (spec's (84,150) is water on the
    // kernel map; (90,148) is the acceptance harness's own F1 baseline cell)
    ignitions: [{ t: 0, x: 90, y: 148 }],
    wind: [ // the SHIFT is the lesson: NE drift, then NW means it, at the Weaver place
      { t: 0, deg: 225, mph: 8 },    // SW 8: upslope NE drift toward the Hogback
      { t: 150, deg: 315, mph: 14 }, // NW 14 g18 — THE SHIFT (D-9 fires 10 s before)
      { t: 270, deg: 315, mph: 8 },  // easing
      { t: 390, deg: 270, mph: 4 },  // W 4, RH rising — weather end
    ],
    // KNOWN-OVER-ENVELOPE (reported, deliberately NOT tuned here): unfought at the authored
    // 6:30 this measures ~7,000 ac against a 1,100 ac denominator, and takes the mill, Static
    // Point and the drying shed in JUNE. Every lever inside this file that shrinks it (weather
    // end, wind legs) was measured and each one only moves the damage: F1 shrinking spares the
    // mill, which lets F2 run, which scars the Tin Camp — fire3's own ignition cell — and a
    // fire whose scripted ignition cell is already black silently burns ZERO acres (igniteAt
    // no-ops on SCAR). The real defects are upstream of season.js: unfought fires here are
    // map-scale (11k–14k ac on a 22.5k ac mountain) because nothing bounds them, and the
    // director has no guard for a dead ignition cell. Both need an owner. Do not "fix" this
    // number by hand without re-running tests/season-node.mjs — the season is a domino chain.
    weatherEndT: 390, durationT: 450,
    threatenedZones: [ZONE.BRIDE_CREEK],
    structuresAtStake: ['weaverHouse', 'weaverBarn'],
    grandmotherCharges: 1, basinFloor: true,
    beats: [{ t: 140, name: 'shiftWarning', radio: 'D-9' }], // she forecasts; the ear confirms
    startRadio: 'D-2', weatherEndRadio: 'D-12', closeRadio: null,
    pars: { acresHeldMin: 900, spotsCaughtMin: 2 },
    medals: { best: 'HELD AT THE WATER.', mid: 'THE WEAVER PLACE STANDS.',
              overrun: 'THE MOUNTAIN KEEPS THE SCAR.' },
    calendarLine: 'bride creek. {medal}',
  },
  {
    id: 'fire2', name: 'the sawmill fire', date: 'jul 8', D: SEASON_D.fire2,
    silent: false, night: false,
    spawn: { x: 200, y: 190 }, // mid-Grade switchback, coming down on the mill — 46 tiles out
    // the burner throws into the log decks — one cell off the burner's own footprint
    // (spec's (240,212) is yard dirt on the kernel map; (240,210) is deck slash beside it)
    ignitions: [{ t: 0, x: 240, y: 210 }],
    wind: [
      { t: 0, deg: 180, mph: 10 },   // S 10: runs north along the west bank, deck to deck
      { t: 90, deg: 135, mph: 16 },  // SE 16 g22: pushes NW upslope into Camas stringers
      { t: 240, deg: 135, mph: 10 },
      { t: 330, deg: 180, mph: 6 },  // lying down
      { t: 450, deg: 180, mph: 4 },  // weather end
    ],
    weatherEndT: 450, durationT: 510,
    threatenedZones: [ZONE.HALLORAN_MILL, ZONE.CAMAS],
    denomOverride: { [ZONE.CAMAS]: 400 }, // PROVISIONAL: spec counts a 400-ac Camas slice, not the whole zone
    structuresAtStake: ['sawShed', 'planerShed', 'millOffice', 'burner'],
    grandmotherCharges: 1, basinFloor: true,
    beats: [{ t: 120, name: 'starlings' }], // starlings pour out of the burner stack — audio beat, zero text
    startRadio: 'D-3', weatherEndRadio: null, closeRadio: null,
    pars: { acresHeldMin: 300, lineChainsMin: 60 },
    medals: { best: 'SAWDUST, NOT CINDERS.', mid: 'THE MILL KEEPS ITS ROOF.',
              overrun: 'THE MOUNTAIN KEEPS THE SCAR.' },
    calendarLine: 'sawmill. {medal}',
  },
  {
    id: 'fire3', name: 'the lantern fire', date: 'jul 30', D: 0.58 /* SEASON_D.fire3 is 0.60 — exactly the crown gate; 0.58 keeps July off the knife-edge */,
    silent: false, night: true, // NIGHT: lit only by its own light; fight by ear
    spawn: { x: 162, y: 88 }, // the Lookout — the fire is 51 tiles north at the Tin Camp
    ignitions: [{ t: 0, x: 181, y: 41 }], // bench grass by the bunkhouse ruin
    wind: [
      { t: 0, deg: 0, mph: 12 },     // N 12: pushes SOUTH toward the Hogback and the Lookout
      { t: 120, deg: 338, mph: 16 }, // NNW 16 g20: main push; a finger heads SE at Static Point
      // W 8 drainage wind off the Tin Camp draw: the creeping finger noses EAST into the
      // Doghair lip — THE STALL BEAT. deg is FROM, and the Doghair (x≥198) lies EAST of the
      // fire (ignition x=181), so the old deg 90 pushed the finger the other way entirely:
      // the beat's trigger (ignition inside the Doghair polygon) never armed, D-26 never
      // spoke, and the load-bearing foreshadow — north slopes hold june rain — was never
      // taught. Worse, west of the fire is the LARDER: that leg drove the head into the
      // other seeded basin instead (measured 8% Larder scar in JULY).
      { t: 240, deg: 270, mph: 8 },
      { t: 360, deg: 0, mph: 10 },
      { t: 510, deg: 0, mph: 6 },    // dawn RH — weather end
    ],
    weatherEndT: 510, durationT: 570,
    threatenedZones: [ZONE.TIN_CAMP, ZONE.STATIC_POINT],
    structuresAtStake: ['tinBunk', 'tinShed', 'relayHut', 'propane'], // + cosmetic tower scorch
    grandmotherCharges: 1, basinFloor: true,
    beats: [{ cond: 'doghairStall', name: 'stall', radio: 'D-26' }], // twist foreshadowing, mechanized
    startRadio: 'D-4', weatherEndRadio: 'D-13', closeRadio: null,
    pars: { acresHeldMin: 60 },
    medals: { best: 'THE TOWER KEEPS ITS LAMP.', mid: 'HELD IN THE DARK.',
              overrun: 'THE MOUNTAIN KEEPS THE SCAR.' },
    calendarLine: 'the lantern. {medal}',
  },
  {
    id: 'fire4', name: 'the hundredyear fire', date: 'aug 17', D: SEASON_D.fire4,
    silent: false, night: false,
    spawn: { x: 162, y: 88 }, // the Lookout: five smokes, pick your legs' order
    ignitions: [ // the strike script — s2 lands on Hogback rock and dies (free triage lesson)
      { t: 0, x: 228, y: 66 },    // s1: the Doghair center — guaranteed; crowns ≈ 1:10
      { t: 25, x: 196, y: 84 },   // s2: Hogback saddle rock — smolders and dies by 1:30 (D-27)
      { t: 50, x: 92, y: 56 },    // s3: the Larder — guaranteed; crowns ≈ 2:10 → THE LOG LINE
      { t: 80, adaptive: 'W', region: { x0: 0, y0: 100, x1: 159, y1: 240 } },   // s4: fuel-seeking west
      { t: 110, adaptive: 'E', region: { x0: 160, y0: 110, x1: 260, y1: 232 } },// s5: fuel-seeking east
    ],
    wind: [
      { t: 0, deg: 225, mph: 14 },  // SW 14 g20: gusty pre-frontal chaos (sim jitter seasons it)
      { t: 180, deg: 270, mph: 22 },// W 22 g30: the blowup driver; crown runs peak
      { t: 390, deg: 315, mph: 12 },// NW 12, RH climbing
      { t: 480, deg: 315, mph: 8 }, // rain cell crosses NW→SE — weather end does the extinguishing
      { t: 570, deg: 315, mph: 5 },
    ],
    weatherEndT: 480, durationT: 570,
    threatenedZones: [ZONE.LARDER, ZONE.DOGHAIR, ZONE.TIN_CAMP, ZONE.CAMAS,
                      ZONE.STATIC_POINT, ZONE.BRIDE_CREEK], // ≈4,900 ac combined
    structuresAtStake: ['relayHut', 'propane', 'tinBunk', 'tinShed', 'weaverHouse', 'weaverBarn'],
    grandmotherCharges: 1, basinFloor: false, // aug 17 > aug 1: the floors are off — forty years came due
    beats: [
      { t: 90, name: 'saddleOut', radio: 'D-27' },            // s2 is out; rock owes lightning nothing
      { cond: 'firstCrownInBasin', name: 'twist' },           // ±20 s radio blackout + LOG_LINE, once
      { cond: 'crownBreachesRetardant', name: 'honesty', radio: 'D-28' }, // nothing in the kit stops crown
    ],
    startRadio: 'D-5', weatherEndRadio: 'D-14', closeRadio: null,
    pars: {},
    medals: { best: 'FORTY YEARS CAME DUE.', mid: 'FORTY YEARS CAME DUE.',
              overrun: 'FORTY YEARS CAME DUE.', edges: 'YOU HELD THE EDGES.' }, // secondary if all 6 stand
    calendarLine: 'nothing has burned here in forty years.', // the date keeps the log line forever
  },
  {
    id: 'fire5', name: 'the wick fire', date: 'sep 9', D: SEASON_D.fire5,
    silent: false, night: false,
    spawn: { x: 160, y: 288 }, // the Grade's foot in town: the siege is fought yard to yard
    ignitions: [{ t: 0, x: 168, y: 276 }], // petersen's hay truck, lower Grade
    wind: [
      { t: 0, deg: 0, mph: 18 },   // N 18 g25: post-frontal downslope, aimed square at town
      { t: 120, deg: 0, mph: 22 }, // N 22 g28: volley peak
      { t: 300, deg: 23, mph: 14 },// NNE 14
      { t: 390, deg: 0, mph: 8 },  // dies (D-11)
      { t: 480, deg: 0, mph: 5 },  // weather end
    ],
    weatherEndT: 480, durationT: 540,
    threatenedZones: [ZONE.WICK_ORCHARD, ZONE.PREACHERS_KNOB, ZONE.EWE_BENCH, ZONE.MILLHAVEN],
    structuresAtStake: ['dryingShed', 'sextonShed', 'school', 'mercantile', 'church', 'grange',
      'firehouse', 'depot', 'hayBarn', 'northHouse1', 'northHouse2', 'northHouse3',
      'northHouse4', 'northHouse5', 'northHouse6'], // 15 — the season's biggest denominator
    grandmotherCharges: 1, basinFloor: false,
    // The ember siege (season §11): while the head lives, scripted volleys every 25–40 s,
    // n = 2 + floor(mph/9), cast 18–40 cells downwind, 3× weighted at north-row roofs/yards.
    siege: { intervalS: [25, 40], castCells: [18, 40], rowWeight: 0.75, // 3:1 → 75% of casts aim at the row
             row: { x0: 136, x1: 188, y0: 288, y1: 292 } },
    beats: [
      { t: 390, name: 'windDying', radio: 'D-11' },
      { cond: 'emberOnRxBlack', name: 'rxPayoff', radio: 'D-29' }, // your black is paying rent tonight
    ],
    startRadio: 'D-6', weatherEndRadio: null, closeRadio: null,
    pars: { spotsCaughtFrac: 0.8 },
    medals: { best: 'NOT ONE ROOF.', mid: 'THE SCHOOL STANDS.',
              overrun: 'THE MOUNTAIN KEEPS THE SCAR.' },
    calendarLine: 'the wick. {medal}',
  },
  {
    id: 'fire6', name: 'the crown', date: 'oct 2', D: SEASON_D.fire6,
    silent: false, night: false,
    spawn: { x: 162, y: 88 }, // the Lookout — Static Point is in the ignition's lap at 0:30
    ignitions: [{ t: 0, x: 218, y: 102 }], // snag rekindle on the Hogback's east saddle
    wind: [
      { t: 0, deg: 90, mph: 28 },   // E 28 g35: the run begins SW across the Camas Slope
      { t: 90, deg: 68, mph: 35 },  // ENE 35 g45: full crown behavior anywhere unburned + armed
      { t: 240, deg: 68, mph: 18 }, // the lull — the breath (D-31: don't trust it)
      { t: 300, deg: 45, mph: 38 }, // NE 38 g50: THE GATE PUSH — everything aims at the town edge
      { t: 450, deg: 0, mph: 22 },  // N 22, RH rising: the cold front arrives
      { t: 510, deg: 0, mph: 12 },  // fire lies down; flurry hint in the noise bed at 9:30
      { t: 600, deg: 0, mph: 8 },
    ],
    weatherEndT: 450, durationT: 600,
    threatenedZones: [ZONE.MILLHAVEN, ZONE.CAMAS, ZONE.WICK_ORCHARD, ZONE.PREACHERS_KNOB,
                      ZONE.EWE_BENCH, ZONE.HASTY_DRAW], // the town plus everything in the path
    structuresAtStake: ['relayHut', 'propane', 'dryingShed', 'sextonShed', 'school', 'mercantile',
      'church', 'grange', 'firehouse', 'depot', 'hayBarn',
      'northHouse1', 'northHouse2', 'northHouse3', 'northHouse4', 'northHouse5', 'northHouse6',
      'millRowHouse1', 'millRowHouse2', 'millRowHouse3', 'millRowHouse4', 'millRowHouse5',
      'millRowHouse6'],
    grandmotherCharges: 2, basinFloor: false, // the state sends a second tanker (D-34)
    westGate: { x0: 48, y0: 258, x1: 120, y1: 300 }, // the Ewe Bench corridor — the last stand
    beats: [
      { t: 240, name: 'lull', radio: 'D-31' },                 // it's catching its breath
      { cond: 'scarSplit', name: 'scarSplit', radio: 'D-43' }, // it can't eat the same ground twice
      { cond: 'westGate', name: 'westGate', radio: 'D-44' },   // short grass — your kind of odds
      { cond: 'pantry', name: 'pantry', radio: 'D-35' },       // all-failures mosaic starves it early
      { cond: 'staticCede', name: 'radioSilence' },            // 90 s of true silence, then D-32
      { cond: 'secondTanker', name: 'secondTanker', radio: 'D-34' },
    ],
    startRadio: 'D-7', weatherEndRadio: null, closeRadio: null, // close outcome = D-45 / D-46
    pars: { lossesBest: 0, lossesMid: 3 },
    medals: { best: 'THE MOSAIC HELD.', mid: 'THE TOWN OUTLIVES THE CROWN.',
              overrun: 'STILL ON THE MAP.' },
    calendarLine: 'the crown. {medal}',
  },
];

// ---- Rx units (season §13.2) — authored rects sized to spec acreage targets (PROVISIONAL
// rect corners; map.js owns no rx polygons so the dashed ring uses these). Weather is
// scripted kind: wind ≤ 7 steady, D = SEASON_D.rx; GRANDMOTHER disabled (D-16). ----------
export const RX_UNITS = [
  { id: 'rx1', name: 'wick bench', zone: ZONE.WICK_ORCHARD,
    rect: { x0: 180, y0: 254, x1: 210, y1: 266 }, acres: 90,
    windows: ['sep1-8'], payoff: 'guts the fire five siege; widens the east gate' },
  { id: 'rx2', name: 'ewe bench strips', zone: ZONE.EWE_BENCH,
    rect: { x0: 64, y0: 264, x1: 108, y1: 270 }, acres: 70,
    windows: ['sep1-8', 'sep20-30'], payoff: 'pre-burned west gate lanes' },
  { id: 'rx3', name: 'grade shoulders', zone: ZONE.NONE,
    rect: { x0: 152, y0: 184, x1: 200, y1: 190 }, acres: 60,
    windows: ['sep20-30'], payoff: 'center gate wall' },
  { id: 'rx4', name: "preacher's skirt", zone: ZONE.PREACHERS_KNOB,
    rect: { x0: 146, y0: 266, x1: 158, y1: 269 }, acres: 12,
    windows: ['sep20-30'], payoff: 'the cemetery stops being a worry forever' },
  { id: 'rx5', name: 'camas toe', zone: ZONE.CAMAS,
    rect: { x0: 188, y0: 214, x1: 240, y1: 224 }, acres: 110,
    windows: ['sep1-8', 'sep20-30'], payoff: "starves the crown's main run early" },
  { id: 'rx6', name: 'hasty mouth', zone: ZONE.HASTY_DRAW,
    rect: { x0: 50, y0: 238, x1: 88, y1: 246 }, acres: 80,
    windows: ['sep1-8', 'sep20-30'], payoff: 'kills the west-flank lobe' },
];
export const RX_WEATHER = Object.freeze({ // one scripted kind morning for every unit
  wind: [{ t: 0, deg: 180, mph: 6 }, { t: 210, deg: 180, mph: 5 }],
  durationT: 210, D: SEASON_D.rx,
});

// 8-wind compass word for D-8's "{direction}" (lowercase — she talks that way)
const WINDS8 = ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'];
export function compass8(deg) { return WINDS8[Math.round((((deg % 360) + 360) % 360) / 45) % 8]; }

// ---- createDirector — one per fire session. Call tick() once per simTick, AFTER it.
// hooks: { radio(id, params), logLine(), beat(name, data?), weatherEnd(), strike(n, cell),
//          suppress?(untilTick),   // PROVISIONAL hook: wire to radio.suppress (twist ±20 s, Static silence)
//          burnFire?: Uint8Array } // PROVISIONAL: save's per-cell fire ordinal, for D-43's {month}
// The game layer must have called sim.initFire({D: fire.D, basinFloor: fire.basinFloor})
// BEFORE creating the director (the director snapshots pre-fire scar for D-43/D-35).
export function createDirector(sim, fire, hooks) {
  sim.setSchedule(fire.wind.map(k => ({ t: k.t, deg: k.deg, mph: k.mph })));

  const { state, fuel, load, zoneId, retard, burnSeverity, embers, wind } = sim;
  const say = (id, params) => { if (!fire.silent) hooks.radio(id, params); };

  // pre-fire scar mask: which cells were already season black at t=0 (D-43 wall detection,
  // D-35 pantry check). One Uint8Array — cheap against the 2.6 MB sim.
  const preScar = new Uint8Array(CELLS);
  let preScarCount = 0;
  for (let i = 0; i < CELLS; i++) if (state[i] === S.SCAR) { preScar[i] = 1; preScarCount++; }

  // scripted ignitions, seconds → ticks, sorted; adaptive ones resolve at their moment
  const pending = fire.ignitions.map((g, k) => ({ ...g, at: Math.max(1, Math.round(g.t * H)), n: k + 1 }))
    .sort((a, b) => a.at - b.at);
  let pendIdx = 0;

  // timed beats (+ derived generic D-8 shift calls where the script turns ≥40° unspoken)
  const beats = fire.beats.filter(b => b.t != null)
    .map(b => ({ ...b, at: Math.round(b.t * H), fired: false }));
  if (!fire.silent) {
    for (let k = 1; k < fire.wind.length; k++) {
      const a = fire.wind[k - 1], b = fire.wind[k];
      let dd = Math.abs(((b.deg - a.deg + 540) % 360) - 180);
      const spokenFor = fire.beats.some(x => x.t != null && x.radio && Math.abs(x.t - b.t) <= 15);
      if (dd >= 40 && !spokenFor && b.t < fire.weatherEndT)
        beats.push({ at: Math.round(b.t * H), name: 'shift', radio: 'D-8',
                     params: { direction: compass8(b.deg) }, fired: false });
    }
    beats.sort((a, b) => a.at - b.at);
  }
  const condBeats = {};
  for (const b of fire.beats) if (b.cond) condBeats[b.cond] = b;
  function fireCond(cond, params) {
    const b = condBeats[cond];
    if (!b || b.fired) return false;
    b.fired = true;
    hooks.beat(b.name, params);
    if (b.radio) say(b.radio, params);
    return true;
  }

  // director-local RNG for volley jitter. Sim-affecting but DETERMINISTIC: fixed seed per
  // fire id, consumed only from tick() — replays roll identically. PROVISIONAL (the sim
  // streams are private to createSim; this is the only randomness the director owns).
  const rng = mulberry32(0x5EED0 ^ (fire.id.length * 7919) ^ fire.durationT);

  // ---- runtime state ----
  let phase = 'running'; // 'running' → 'weatherEnd' → 'closed'
  let twistFired = false, strikesFired = 0;
  let lastIgnitionTick = 0, lastBurnCount = 0, lastScanTick = -1;
  let gustLatch = 0, quietSaid = false, spotsClapSaid = false, spotAcrossSaid = false,
      rxPayoffSaid = false, cemeterySaid = false, weaverSaid = false, honestySaid = false,
      pantryChecked = false, staticCeded = false, staticReturnAt = 0, dropsSeen = 0;
  const lostKeys = [];
  const cededSeen = new Set();
  // D-43 wall detection: crown cells dying against pre-season scar, windowed
  const wallHits = []; let wallMonthCell = -1, wallSaid = false;
  // F5 volleys
  let nextVolleyAt = fire.siege ? Math.round((fire.siege.intervalS[0]) * H) : Infinity;

  // town keys for the Crown's D-45/D-46 verdict (roofs, not relay gear)
  const TOWN_KEYS = new Set(['school', 'mercantile', 'church', 'grange', 'firehouse', 'depot',
    'hayBarn', 'northHouse1', 'northHouse2', 'northHouse3', 'northHouse4', 'northHouse5',
    'northHouse6', 'millRowHouse1', 'millRowHouse2', 'millRowHouse3', 'millRowHouse4',
    'millRowHouse5', 'millRowHouse6']);

  // ---- event wiring ----
  sim.onEvent((e) => {
    if (phase === 'closed') return;
    switch (e.type) {
      case 'ignition': {
        lastIgnitionTick = e.tick;
        // F3 stall beat: the drainage finger noses up to the Doghair lip and the june rain
        // holds it (G-2). Announce ~8 s after first contact so the player SEES the stall
        // before she names it.
        // The trigger is contact WITH the lip, not ignition INSIDE the polygon, and it has
        // to be: G-2 holding is precisely the statement that no Doghair cell can light
        // before aug 1 (the basin floor sits above every basin fuel's moistExt, so flux,
        // ember catch and seed-boost are all zero in there). An ignition inside the zone
        // would mean the floor had FAILED — so keying the beat on one made the foreshadow
        // unreachable by construction, at any floor value. What the player actually sees —
        // and what D-26 actually says — is a front standing still AT the lip.
        const stallB = condBeats.doghairStall;
        if (fire.id === 'fire3' && stallB && !stallB.fired && !stallB.armAt &&
            zoneId[e.cell] !== ZONE.DOGHAIR) {
          const x = e.cell % GRID, y = (e.cell / GRID) | 0;
          lip: for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
            if (zoneId[Y * GRID + X] === ZONE.DOGHAIR) { stallB.armAt = e.tick + 8 * H; break lip; }
          }
        }
        break;
      }
      case 'crownTransition':
        // THE TWIST (F4, §10.5): first crown inside either seeded basin → 40 s text blackout
        // owned by the log line. hooks.suppress wires to radio.suppress(tick + 20 s); the
        // retro side (−20 s) is covered because suppress clears current + queued lines.
        if (!twistFired && fire.id === 'fire4' &&
            (zoneId[e.cell] === ZONE.LARDER || zoneId[e.cell] === ZONE.DOGHAIR)) {
          twistFired = true;
          if (hooks.suppress) hooks.suppress(e.tick + 20 * H);
          hooks.logLine(); // exactly once — the logbook writing itself
          fireCond('firstCrownInBasin', { cell: e.cell });
        }
        break;
      case 'cellBurnout': {
        // D-43: crown fronts dying against season scar. A crown cell (severity 2) burning
        // out 8-adjacent to PRE-fire black is the wall doing its work; ≥15 such deaths in a
        // 10 s window = the split is visible, name it. PROVISIONAL thresholds.
        if (fire.id === 'fire6' && !wallSaid && burnSeverity[e.cell] === 2) {
          let adjScar = -1;
          const x = e.cell % GRID, y = (e.cell / GRID) | 0;
          for (let dy = -1; dy <= 1 && adjScar < 0; dy++) for (let dx = -1; dx <= 1; dx++) {
            if (!dx && !dy) continue;
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
            const j = Y * GRID + X;
            if (preScar[j]) { adjScar = j; break; }
          }
          if (adjScar >= 0) {
            wallHits.push(e.tick); wallMonthCell = adjScar;
            while (wallHits.length && wallHits[0] < e.tick - 10 * H) wallHits.shift();
            if (wallHits.length >= 15) {
              wallSaid = true;
              const ord = hooks.burnFire ? hooks.burnFire[wallMonthCell] : 5;
              fireCond('scarSplit', { month: monthOfOrdinal(ord || 5) });
            }
          }
        }
        break;
      }
      case 'emberCatch':
        // D-24: a spot that jumped clean over line — landing within 3 tiles of the player's
        // line reads as "across it". PROVISIONAL heuristic; once per fire.
        if (!spotAcrossSaid && !fire.silent) {
          const x = e.cell % GRID, y = (e.cell / GRID) | 0;
          outer: for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
            if (sim.flags[Y * GRID + X] & FLAG.LINE) { spotAcrossSaid = true; say('D-24'); break outer; }
          }
        }
        // F4 honesty beat: a CROWN-cast ember catching with her curtain still wet nearby —
        // the run crossed the retardant (§10.4). PROVISIONAL radius-5 check.
        if (fire.id === 'fire4' && !honestySaid && e.crown && dropsSeen > 0) {
          const x = e.cell % GRID, y = (e.cell / GRID) | 0;
          outer2: for (let dy = -5; dy <= 5; dy++) for (let dx = -5; dx <= 5; dx++) {
            const X = x + dx, Y = y + dy;
            if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
            if (retard[Y * GRID + X] > 0.05) { honestySaid = true; fireCond('crownBreachesRetardant'); break outer2; }
          }
        }
        break;
      case 'emberFizzle':
        // D-29 (F5): "your black in the orchard is paying rent tonight." It must be YOUR
        // black — a september RX burn (save ordinals 8+), not the fire's own fresh scar and
        // not last month's wildfire. Without the ordinal check the line paid the player rent
        // on ground the mountain burned for free, in a season where they may never have lit
        // a drip torch at all. No rx black under the ember, no credit.
        if (fire.id === 'fire5' && !rxPayoffSaid && fuel[e.cell] === FUEL.SCAR &&
            hooks.burnFire && hooks.burnFire[e.cell] >= 8 &&
            (zoneId[e.cell] === ZONE.WICK_ORCHARD || zoneId[e.cell] === ZONE.EWE_BENCH)) {
          rxPayoffSaid = true; fireCond('emberOnRxBlack');
        }
        break;
      case 'structureThreatened':
        if (e.key === 'sextonShed' && !cemeterySaid && !fire.silent) { cemeterySaid = true; say('D-39'); }
        if (e.key === 'weaverHouse' && fire.id === 'fire1' && !weaverSaid) { weaverSaid = true; say('D-17'); }
        break;
      case 'structureLost':
        lostKeys.push(e.key);
        // D-38's template already carries the article ("we lost the {name}."), and every
        // structure name in the atlas carries its own ("the weaver place — house") — so the
        // raw name stutters: "we lost the the weaver place". The template's article wins.
        say('D-38', { name: (e.name || '').replace(/^the /, '') });
        break;
      case 'propanePop':
        say('D-33');
        break;
      case 'backburnStarved':
        say('D-36');
        break;
      case 'backburnEscaped':
        say('D-37');
        break;
      case 'retardantDrop':
        dropsSeen++;
        if (fire.id === 'fire6' && dropsSeen === 1) fireCond('secondTanker'); // she has a sister up
        break;
      case 'gust':
        // D-10, rate-limited to one per 60 s — gusts season, the radio shouldn't nag
        if (e.tick > gustLatch && !fire.silent) {
          gustLatch = e.tick + 60 * H;
          say('D-10', { n: Math.round(e.peakMph) });
        }
        break;
    }
  });

  // burning-cell scan, cached (full-map walk once per 15 ticks ≈ 2 Hz — 0.2 ms class)
  function burningCount(t) {
    if (t === lastScanTick) return lastBurnCount;
    lastScanTick = t;
    let n = 0;
    for (let i = 0; i < CELLS; i++) { const s = state[i]; if (s === S.BURNING || s === S.EMBERCAST) n++; }
    lastBurnCount = n;
    return n;
  }

  // adaptive strike targeting (§10.3): argmax over 16×16 blocks of Σ(load × unburnedMask)
  // inside the region; the strike lands on the block's heaviest unburned cell. Deterministic
  // tiebreak: first block / lowest cell index wins (no dice — the mountain's ledger decides).
  function adaptiveTarget(region) {
    const bx0 = (region.x0 >> 4), bx1 = (region.x1 >> 4), by0 = (region.y0 >> 4), by1 = (region.y1 >> 4);
    let bestSum = -1, bestBX = bx0, bestBY = by0;
    for (let by = by0; by <= by1; by++) for (let bx = bx0; bx <= bx1; bx++) {
      let sum = 0;
      const xlo = Math.max(region.x0, bx << 4), xhi = Math.min(region.x1, (bx << 4) + 15);
      const ylo = Math.max(region.y0, by << 4), yhi = Math.min(region.y1, (by << 4) + 15);
      for (let y = ylo; y <= yhi; y++) for (let x = xlo; x <= xhi; x++) {
        const i = idx(x, y);
        if (state[i] === S.UNBURNED && fuel[i] !== FUEL.SCAR && fuel[i] !== FUEL.ROCK &&
            fuel[i] !== FUEL.WATER && fuel[i] !== FUEL.SOIL && fuel[i] !== FUEL.STRUCTURE)
          sum += load[i];
      }
      if (sum > bestSum) { bestSum = sum; bestBX = bx; bestBY = by; }
    }
    // heaviest unburned cell within the winning block (clamped to region)
    let bestCell = -1, bestLoad = -1;
    const xlo = Math.max(region.x0, bestBX << 4), xhi = Math.min(region.x1, (bestBX << 4) + 15);
    const ylo = Math.max(region.y0, bestBY << 4), yhi = Math.min(region.y1, (bestBY << 4) + 15);
    for (let y = ylo; y <= yhi; y++) for (let x = xlo; x <= xhi; x++) {
      const i = idx(x, y);
      if (state[i] !== S.UNBURNED) continue;
      const f = fuel[i];
      if (f === FUEL.SCAR || f === FUEL.ROCK || f === FUEL.WATER || f === FUEL.SOIL || f === FUEL.STRUCTURE) continue;
      if (load[i] > bestLoad) { bestLoad = load[i]; bestCell = i; }
    }
    return bestCell >= 0 ? bestCell : idx((xlo + xhi) >> 1, (ylo + yhi) >> 1);
  }

  // F5 scripted volleys: writes dead slots in the published ember pool; sim.flyEmbers owns
  // flight, landing, catch probability, and the 3 s telegraph — one chime stays one truth.
  function volley(t) {
    const sg = fire.siege;
    const head = [];
    for (let i = 0; i < CELLS; i++) {
      const s = state[i];
      if (s !== S.BURNING && s !== S.EMBERCAST) continue;
      head.push(i);
    }
    if (head.length < 8) return; // no head, no siege
    // sources = downwind-most burning cells (the head proper)
    head.sort((a, b) =>
      ((b % GRID) * wind.tx + ((b / GRID) | 0) * wind.ty) -
      ((a % GRID) * wind.tx + ((a / GRID) | 0) * wind.ty));
    const n = 2 + Math.floor(wind.mphEffective / 9);
    let launched = 0;
    for (let k = 0; k < head.length && launched < n; k++) {
      const src = head[Math.min(head.length - 1, k * 3)]; // spread casts across the front
      let slot = null;
      for (const e of embers) if (!e.live) { slot = e; break; }
      if (!slot) break; // pool full: the cap IS the mercy
      const sx = (src % GRID) + 0.5, sy = ((src / GRID) | 0) + 0.5;
      let txT, tyT;
      const r = sg.row;
      if (rng() < sg.rowWeight && Math.hypot((r.x0 + r.x1) / 2 - sx, (r.y0 + r.y1) / 2 - sy) < 52) {
        txT = r.x0 + rng() * (r.x1 - r.x0); tyT = r.y0 + rng() * (r.y1 - r.y0); // a roof, a yard
      } else {
        const cast = sg.castCells[0] + rng() * (sg.castCells[1] - sg.castCells[0]);
        txT = sx + wind.tx * cast; tyT = sy + wind.ty * cast;
      }
      const ft = 1.2 + rng() * 0.8; // seconds aloft: tracer readable, pan tellable
      slot.live = true; slot.x = sx; slot.y = sy;
      slot.vx = (txT - sx) / ft; slot.vy = (tyT - sy) / ft;
      slot.ticksLeft = Math.max(1, Math.round(ft * H));
      slot.prov = 0; slot.crown = false;
      launched++;
    }
    nextVolleyAt = t + Math.round((sg.intervalS[0] + rng() * (sg.intervalS[1] - sg.intervalS[0])) * H);
  }

  // ---- the per-tick drive ----
  function tick() {
    if (phase === 'closed') return;
    const t = sim.tick;

    // start line
    if (t === 1 && fire.startRadio) say(fire.startRadio);

    // scripted / adaptive ignitions
    while (pendIdx < pending.length && pending[pendIdx].at <= t) {
      const g = pending[pendIdx++];
      let cell;
      if (g.adaptive) cell = adaptiveTarget(g.region);
      else cell = idx(g.x, g.y);
      sim.igniteAt(cell % GRID, (cell / GRID) | 0);
      strikesFired++;
      hooks.strike(g.n, cell);
    }

    // timed beats
    for (const b of beats) {
      if (b.fired || b.at > t) continue;
      b.fired = true;
      hooks.beat(b.name, b.params);
      if (b.radio) say(b.radio, b.params);
    }
    // armed condition beats (the stall announces itself a breath after the fire stalls)
    const stall = condBeats.doghairStall;
    if (stall && stall.armAt && !stall.fired && t >= stall.armAt) fireCond('doghairStall');

    // ceded zones (the cede verb writes sim.zonesCeded; the director reads the room)
    if (sim.zonesCeded.size !== cededSeen.size) {
      for (const z of sim.zonesCeded) {
        if (cededSeen.has(z)) continue;
        cededSeen.add(z);
        hooks.beat('ceded', { zone: z });
        if (fire.id === 'fire6' && z === ZONE.STATIC_POINT && !staticCeded) {
          // GIVEN: STATIC POINT. — the cost is the radio: 90 s of true silence, then D-32.
          staticCeded = true;
          fireCond('staticCede');
          if (hooks.suppress) hooks.suppress(t + 90 * H);
          staticReturnAt = t + 90 * H + 1;
        }
      }
    }
    if (staticReturnAt && t >= staticReturnAt) { staticReturnAt = 0; say('D-32'); }

    // F5 siege volleys (only while the weather still means it)
    if (fire.siege && phase === 'running' && t >= nextVolleyAt) volley(t);

    // 2 Hz housekeeping: quiet line, four-catches line, west gate, pantry, close detection
    if (t % 15 === 0 && t > 0) {
      const burning = burningCount(t);

      if (!quietSaid && !fire.silent && burning > 0 && lastIgnitionTick > 0 &&
          t - lastIgnitionTick > 45 * H) { quietSaid = true; say('D-40'); } // i log the quiet too

      if (!spotsClapSaid && !fire.silent && lostKeys.length === 0) {
        const sp = sim.spotSummary();
        if (sp.total >= 4 && sp.caught === sp.total) { spotsClapSaid = true; say('D-25'); }
      }

      if (fire.id === 'fire6' && condBeats.westGate && !condBeats.westGate.fired) {
        const g = fire.westGate;
        scan: for (let y = g.y0; y <= g.y1; y += 2) for (let x = g.x0; x <= g.x1; x += 2) {
          const s = state[idx(x, y)];
          if (s === S.BURNING || s === S.EMBERCAST) { fireCond('westGate'); break scan; }
        }
      }

      // D-35 pantry check at 3:00 exactly once: a max-scar season starves the Crown young.
      // PROVISIONAL thresholds: <200 burning (harness's own starvation number) against
      // ≥25,000 pre-fire scar cells (≈5,500 ac — an all-failures class mosaic).
      if (fire.id === 'fire6' && !pantryChecked && t >= 180 * H) {
        pantryChecked = true;
        if (burning < 200 && preScarCount >= 25000) fireCond('pantry');
      }

      // weather end + close
      if (phase === 'running' && t >= fire.weatherEndT * H) {
        phase = 'weatherEnd';
        sim.setWeatherEnd(true);
        hooks.weatherEnd();
        if (fire.weatherEndRadio) say(fire.weatherEndRadio);
      }
      if (phase !== 'closed' &&
          ((phase === 'weatherEnd' && burning === 0 && t > (fire.weatherEndT + 5) * H) ||
           t >= fire.durationT * H)) {
        phase = 'closed';
        hooks.beat('close', { lostKeys: lostKeys.slice() });
        if (fire.closeRadio) hooks.radio(fire.closeRadio); // D-1 ends the prologue's silence itself
        if (fire.id === 'fire6') {
          const townLost = lostKeys.filter(k => TOWN_KEYS.has(k)).length;
          say(townLost === 0 ? 'D-45' : 'D-46'); // millhaven's still on the map — both true
        }
      }
    }
  }

  function stateOut() {
    return {
      phase, tick: sim.tick, burning: lastBurnCount, strikesFired, twistFired,
      closed: phase === 'closed', lostKeys: lostKeys.slice(), ceded: [...cededSeen],
    };
  }

  return { tick, state: stateOut };
}
