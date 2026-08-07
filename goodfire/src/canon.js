// GOODFIRE canon.js — every tuning constant, frozen. Single source of truth.
// Conforms to docs/canon-final.md (binding). Per-second rates are converted to per-tick
// here, once — sim code only ever sees per-tick numbers. WHY: one conversion site, zero
// drift between doc and code.
//
// K[] normalization: the flux formula multiplies in intensity (~0.786 nominal) and June
// moisture (~0.40) that the spread canon ignores, plus a flat-front neighbor factor (~2.414).
// K is baked so MEASURED front speed equals the canon table at reference conditions
// (load 1.0, June moisture, flat, single straight front). Values below are seeded from the
// analytic estimate and then corrected by tests/calibrate.mjs — the canon is an OUTPUT of
// kernel runs, not a hope (critique BLOCKER 3).

export const GRID = 320;
export const CELLS = GRID * GRID;
export const TICK_HZ = 30;
export const DT = 1 / TICK_HZ;

// ---- world scale (player-visible arithmetic depends on these; season §1) ----
export const ACRES_PER_CELL = 0.22;   // 1 cell = 30 m ≈ 0.22 ac
export const CHAINS_PER_CELL = 1.5;   // fireline is measured in chains; register does lore

// ---- warden ----
export const WARDEN = Object.freeze({
  SPRINT: 6.0,          // t/s — THE ruler. Every rate below is felt against these legs.
  ACCEL: 40,            // t/s² — 0→max in 0.15 s: reads instant, keeps visible lean-in
  DECEL: 55,            // t/s² — stop with ~0.4 tile skid: mass without overshoot
  RADIUS: 0.35,         // collider; threads 1-tile gaps
  BURNING_SPEED_MUL: 0.55, // burning ground passable (no fail state) but costs speed
  BURNING_TRAUMA_PER_S: 0.10,
  DRIP_SPEED: 2.6,      // t/s while holding the Kettle — graver than any rake
  RETRACE_SPEED: 3.5,   // walking your own line is free travel
  SLOPE_SPEED: { PER_GRADE: 0.9, MIN: 0.70, MAX: 1.12 }, // fire climbs faster, you climb slower
});

// ---- fuels ----
export const FUEL = Object.freeze({
  SOIL: 0, GRASS: 1, BRUSH: 2, PINE_LITTER: 3, TIMBER: 4, CROWN_CANOPY: 5,
  RIPARIAN: 6, ROCK: 7, WATER: 8, SCAR: 9, STRUCTURE: 10, SLASH: 11,
});
export const FUEL_NAMES = ['soil','grass','brush','pine litter','timber','black timber','the willow water','rock','water','scar','structure','slash'];

// SURFACE SCALE (playtest-derived, 2026-07-17): the contract speeds below are the ORIGINAL
// canon table ÷ 2.5. WHY: at the old rates an unfought June grass fire burned 7,500 ac —
// seven times its own ledger denominator — and a measured playtest proved a competent
// warden's 541-cell line changed the outcome by 0%: the fire was simply too big for one
// body, so every verb was decoration. At these rates surface fire also finally matches real
// wildland behavior (a grass head at 20 mph ≈ 0.24 t/s ≈ 4 mph), the warden's 6.0 t/s legs
// are 25× the fire's, and a line laid ahead of a flank is decisive. CROWN IS UNTOUCHED at
// 6.5 t/s — so the surface:crown ratio is now ~80:1, and Fire Four's detonation reads as
// the mountain standing up. burnTimes below are raised to hold the sustainability law
// (burnTime ≳ 2.8/calmSpeed, kernel-measured) — deeper flame bands, which read as real.
export const SPREAD_SCALE = 0.10; // documentation only — F_RATE = F_CALM × K_NORM is the rate

// Per-fuel physics. calm/wind20 are the POST-scale contract speeds (t/s) the calibrator
// asserts. igniteTimeCalm derives from pre-scale canon (sim §8); windSens = wind20/calm − 1
// (pre-scale ratio, survives scaling).
function fuelRow(o) { return Object.freeze(o); }
export const FUELS = Object.freeze({
  // burnTime law: a cell must keep feeding its neighbor until the neighbor ignites, or slow
  // fires self-extinguish — burnTime ≥ ~2.6/calmSpeed (kernel-measured; keeps calm backburns
  // alive too). Deep flame bands under wind are the visual consequence, and they read right.
  [FUEL.GRASS]: fuelRow({ calm: 0.08, wind20: 0.24, windSens: 2.45, intensity: 0.9,
    burnTime: 35, emberRate: 0.02, emberCatch: 0.9, moistExt: 0.30, baseMoist: 0.26,
    accrual: 0.12, loadMax: 1.6, cutSpeed: 3.5 }), // windSens 2.45 not 2.0: kernel-measured wind fronts run ~13% sublinear
  [FUEL.BRUSH]: fuelRow({ calm: 0.05, wind20: 0.50, windSens: 9.0, intensity: 1.2,
    burnTime: 56, emberRate: 0.15, emberCatch: 0.7, moistExt: 0.35, baseMoist: 0.28,
    accrual: 0.18, loadMax: 3.0, cutSpeed: 1.8, castBurning: true }),
  [FUEL.PINE_LITTER]: fuelRow({ calm: 0.04, wind20: 0.16, windSens: 3.0, intensity: 1.0,
    burnTime: 70, emberRate: 0.10, emberCatch: 0.8, moistExt: 0.30, baseMoist: 0.23,
    accrual: 0.20, loadMax: 3.0, cutSpeed: 2.6 }),
  [FUEL.TIMBER]: fuelRow({ calm: 0.015, wind20: 0.06, windSens: 3.0, intensity: 1.5,
    burnTime: 100, emberRate: 0.30, emberCatch: 0.5, moistExt: 0.40, baseMoist: 0.36,
    accrual: 0.15, loadMax: 3.0, cutSpeed: 1.1, castBurning: true }), // calm cool-burns smolder out in timber: light it hot or line it
  [FUEL.CROWN_CANOPY]: fuelRow({ calm: 0.04, wind20: 0.16, windSens: 3.0, intensity: 1.6,
    burnTime: 70, emberRate: 0.12, emberCatch: 0.7, moistExt: 0.35, baseMoist: 0.31,
    accrual: 0.10, loadMax: 3.0, cutSpeed: 1.1 }), // surface behavior under canopy; crowning overrides
  [FUEL.RIPARIAN]: fuelRow({ calm: 0.01, wind20: 0.04, windSens: 3.0, intensity: 0.5,
    burnTime: 40, emberRate: 0.01, emberCatch: 0.2, moistExt: 0.45, baseMoist: 0.60,
    accrual: 0.05, loadMax: 3.0, cutSpeed: 1.5 }), // sputters and dies — it is a barrier fuel by design
  [FUEL.STRUCTURE]: fuelRow({ calm: 0.02, wind20: 0.05, windSens: 1.4, intensity: 1.1,
    burnTime: 60, emberRate: 0.30, emberCatch: 0.6, moistExt: 0.50, baseMoist: 0.10,
    accrual: 0, loadMax: 1.0, cutSpeed: 0 }), // emberRate 0.30 (was 0.40): a lost building
    // attacks its neighborhood but an unfought cascade must not level the town core (G-3)
  [FUEL.SLASH]: fuelRow({ calm: 0.06, wind20: 0.24, windSens: 3.0, intensity: 1.8,
    burnTime: 47, emberRate: 0.35, emberCatch: 0.8, moistExt: 0.35, baseMoist: 0.20,
    accrual: 0.15, loadMax: 3.0, cutSpeed: 0.8, castBurning: true }), // hotter than timber: teaches "anchor ahead, not against"
});
// castBurning — the running-front fuels (brush/slash/timber) throw brands from the flame
// itself, not only from the old fire behind it. WHY it is a per-fuel flag and not a global:
// EMBERCAST-stage cells sit ~24–117 tiles BEHIND a 20 mph brush front (kernel-measured),
// which is past the max ember flight (16–35 tiles) — so with embercast-only casting a brush
// run could NEVER seed a spot fire ahead of itself (measured max lead: 11 tiles, i.e. the
// front arrives before the smolder does). That left "no line is ever final" untrue of the
// mid-game antagonist fuel: every brand a brush run threw landed in its own black. (F5's
// siege itself survived only because season.js scripts those volleys into the ember pool
// directly — the organic half of the law was the part that was dead.)
// Grass/pine/riparian keep the old rule: they
// are not the fuels that throw, and their fronts are slow enough that the band IS the front.
// Casting-while-BURNING is deliberately a rate change ONLY — the S.EMBERCAST *state* still
// arrives at EMBERCAST_AT, so intensity/flux (and every calibrated K) are untouched.
export const BURNABLE = new Set([FUEL.GRASS, FUEL.BRUSH, FUEL.PINE_LITTER, FUEL.TIMBER,
  FUEL.CROWN_CANOPY, FUEL.RIPARIAN, FUEL.STRUCTURE, FUEL.SLASH]);

// Flat typed lookup tables for the hot loop (dictionary lookups cost ~2.5× the flux math).
const NF = 12;
export const F_CALM = new Float32Array(NF), F_WINDSENS = new Float32Array(NF),
  F_INTENSITY = new Float32Array(NF), F_BURNTIME = new Float32Array(NF),
  F_EMBERRATE = new Float32Array(NF), F_EMBERCATCH = new Float32Array(NF),
  F_MOISTEXT = new Float32Array(NF), F_BASEMOIST = new Float32Array(NF),
  F_ACCRUAL = new Float32Array(NF), F_LOADMAX = new Float32Array(NF),
  F_CUTSPEED = new Float32Array(NF), F_BURNABLE = new Uint8Array(NF),
  F_CASTBURNING = new Uint8Array(NF);
for (const [k, r] of Object.entries(FUELS)) {
  const f = +k;
  F_CALM[f] = r.calm; F_WINDSENS[f] = r.windSens; F_INTENSITY[f] = r.intensity;
  F_BURNTIME[f] = r.burnTime; F_EMBERRATE[f] = r.emberRate; F_EMBERCATCH[f] = r.emberCatch;
  F_MOISTEXT[f] = r.moistExt; F_BASEMOIST[f] = r.baseMoist; F_ACCRUAL[f] = r.accrual;
  F_LOADMAX[f] = r.loadMax; F_CUTSPEED[f] = r.cutSpeed;
  F_CASTBURNING[f] = r.castBurning ? 1 : 0;
}
for (const f of BURNABLE) F_BURNABLE[f] = 1;
// F_RATE = calm × K, rebuilt when calibration applies
export const F_RATE = new Float32Array(NF);
export function rebuildRates() { for (let f = 0; f < NF; f++) F_RATE[f] = F_CALM[f] * (K_NORM[f] || 1); }

// K normalization per burnable fuel — MEASURED by tests/calibrate.mjs (2026-07-16 run):
// grass 0.199 (err 0.5%), brush 0.133 (6.1%), pine 0.100 (0.5%), timber 0.033 (12.7% slow —
// accepted: timber's threat is embers and intensity, never front speed), slash 0.149 (0.5%),
// crown 6.56 (1.0%). Riparian is analytic: it CANNOT sustain 0.025 t/s with a 12 s burn
// (sustainability law), so its authored behavior is "dies at calm, creeps ~0.1 t/s only
// under October wind" — which is exactly the season's barrier-fuel role.
export const K_NORM = {
  // MEASURED by tests/calibrate.mjs against the 2026-07-17 human-scale surface table:
  // grass 0.080 (0.5%), brush 0.050 (1.4%), pine 0.040 (0.5%), timber 0.015 (2.1%),
  // slash 0.066 (10.6% fast — accepted: slash's threat is intensity 1.8 + brands, never
  // front speed), crown 6.75 (3.8%). Riparian is analytic: it cannot sustain 0.01 t/s and
  // dies at calm — exactly its authored barrier-fuel role.
  [FUEL.GRASS]: 1.367, [FUEL.BRUSH]: 0.946, [FUEL.PINE_LITTER]: 0.760, [FUEL.TIMBER]: 1.254,
  [FUEL.CROWN_CANOPY]: 0.760, [FUEL.RIPARIAN]: 4.4, [FUEL.STRUCTURE]: 1.0, [FUEL.SLASH]: 0.425,
  crown: 0.300,
};

// ---- cell state machine ----
export const S = Object.freeze({ UNBURNED: 0, HEATING: 1, BURNING: 2, EMBERCAST: 3, SCAR: 4 });
export const FLAG = Object.freeze({
  LINE: 1, RETARDANT: 2, BACKBURN: 4, CROWNING: 8, EMBER_GLOW: 16, PLAYER_LIT: 32, LADDER: 64,
});

export const SPREAD = Object.freeze({
  DIAG: 0.7071,            // distance-corrected diagonal transfer → isotropic calm fronts
  UPWIND_FLOOR: 0.12,      // backing fire exists (backburn depends on it) but is another animal
  SLOPE_PER_STEP: 0.10,    // fire climbs 1.3× on the steepest faces; wind stays the sentence
  SLOPE_MIN: 0.6, SLOPE_MAX: 1.6,
  HEAT_CAP: 1.2,           // overshoot cap: dense fronts feel relentless, never teleport
  HEATING_AT: 0.25,        // shimmer begins — the one variable you SEE before you hear
  HEAT_DECAY: 0.10,        // /s when unfed: a stopped front actually stands down (clarity law)
  EMBERCAST_AT: 0.60,      // last 40% of burn throws sparks: "old fire throws sparks"
  EMBERCAST_INTENSITY: 0.7,
});

// ---- wind ----
export const WIND = Object.freeze({
  GUST_AMP: 0.25,          // audible before the grass shows it; gusts season, never lie
  GUST_SMOOTH_S: 4,
  DIR_JITTER_DEG: 8,
  REF_MPH: 20,             // canon wind for windSens derivation
  GUST_EVENT_MUL: 1.15,    // emit gust event when effective crosses schedule×this
  GUST_EVENT_HYST_S: 2,
});

// ---- embers ----
export const EMBER = Object.freeze({
  POOL: 64,                // the cap IS the Crown-finale mercy valve
  SPEED_BASE: 14, SPEED_PER_MPH: 0.9, LATERAL: 0.18,
  FLIGHT_S: [0.5, 1.1], CROWN_FLIGHT_S: [0.9, 1.8],
  SMOLDER_TICKS: 90,       // 3.0 s ground telegraph (canon-final §4): act, or it lights
  BACKBURN_RATE_MUL: 0.25,
  RETARDANT_CATCH_MUL: 0.15,
  BURNING_CAST_MUL: 0.06,  // castBurning fuels throw from the flame at 6% of their old-fire
                           // rate. Measured: enough that a 20 mph brush front seeds real spot
                           // fires (≥20 tiles of lead — 16 s of independent life) 19 times in
                           // 60 s, first one at 2.8 s, max lead 36 tiles; little enough that
                           // the old fire behind the front is still the factory. WHY so low:
                           // ember volume feeds straight back into fire size, and the kernel's
                           // F1-envelope ceiling (acceptance §10, "never the whole mountain")
                           // is only ~10% above where an unfought F1 already sits — 0.12 puts
                           // it through the roof (27,995 cells vs the 26,000 bound). 0.06 is
                           // the value that satisfies the spotting law with envelope headroom.
});

// ---- backburn ----
export const BACKBURN = Object.freeze({
  INTENSITY_MUL: 0.55, EMBER_MUL: 0.25, BURNTIME_MUL: 0.8,
  ESCAPE_DOT: 0.25,        // one dot-product threshold IS the escape model
  ESCAPE_COUNT: 6, ESCAPE_WINDOW_S: 3,
  FUSE_TICKS: 24,          // 0.8 s: long enough to feel the commitment, too short to undo
  STARVE_ADJ_COUNT: 6,
});

// ---- retardant / GRANDMOTHER ----
export const RETARDANT = Object.freeze({
  WIDTH: 5, LEN_MIN: 12, LEN_MAX: 60,
  PASSTHROUGH: 0.08,       // fresh retardant passes 8% surface flux (≈ stops it cold w/ moisture)
  CROWN_FLOOR: 0.35,       // helps, visibly, heroically — and it is not enough (F4 honesty beat)
  MOISTURE_ADD: 0.40,
  DECAY_PER_S: 0.006,      // ~2.8 min: a held breath, not a wall you build the level around
  INBOUND_TICKS: 600,      // 20 s: the drop lands where the fire WILL be — aim is prediction
  SWEEP_TICKS: 60,         // 2.0 s curtain
  HELD_WINDOW_S: 120, HELD_MIN_EXTINGUISH: 10,
});

// ---- crown fire ----
export const CROWN = Object.freeze({
  LOAD_GATE: 2.0, DRY_GATE: 0.60,
  DRAG_LOAD: 1.6,          // a running crown drags marginal fuel up: one organism, not a checkerboard
  CALM: 6.5, WIND_SENS: 0.6, // UNSCALED: crown outruns the warden, period. That reversal IS Fire Four.
  INTENSITY_MUL: 2.2, BURN_TIME: 12, EMBER_RATE: 1.8,
  LINE_FACTOR: 0.5,        // radiant heat over a spade-width scratch: lines buy seconds, not safety
});

// ---- moisture / season ----
export const SEASON_D = Object.freeze({ // dryness per fire slot (sim scale; canon-final §3)
  prologue: 0.30, fire1: 0.40, fire2: 0.50, fire3: 0.60, fire4: 0.70, fire5: 0.75, fire6: 0.85,
  rx: 0.55, // scripted kind mornings
});
export const MOIST = Object.freeze({
  RIPARIAN_BONUS: 0.12, RIPARIAN_BONUS_RADIUS: 2,
  AMBIENT_DRY_PER_S: 0.0004, // long fires get meaner, subliminally (amortized row sweep)
  WEATHER_END_WET_PER_S: 0.004, // scripted weather death: the book always closes
  BASIN_FLOOR: 0.45,       // G-2: the Larder/Doghair hold june rain until aug 1. This must
                           // sit ABOVE every basin fuel's moistExt — the highest is TIMBER's
                           // 0.40 (Larder), then BRUSH/CROWN_CANOPY 0.35, PINE_LITTER 0.30 —
                           // or the floor merely SLOWS the front instead of stopping it.
                           // canon-final §3 says 0.35, which was a hope: at 0.35 timber still
                           // passes mf = 1 − 0.35/0.40 = 12.5% of flux, and a sustained front
                           // walks the Larder anyway (kernel-measured: F2 burned 9% and F3
                           // 8% of the basin BEFORE aug 1 — pre-contradicting "nothing has
                           // burned here in forty years." a month before the twist can land).
                           // 0.45 stops flux (mf ≤ 0), ember catch (p ≤ 0) and the ignition
                           // seed-boost at the basin boundary, together, from one number.
});

// ---- twist arithmetic ----
export const TWIST = Object.freeze({
  BASIN_SEED_LOAD: 1.65,   // + ~3 fires × ~0.18 accrual → ≥ 2.0 at Fire Four, every save
  STRIKE_POCKET_LOAD: 1.2, // + 3 fires accrual ≈ 1.74 < 2.0: the strike takes as SURFACE fire
});                        // and walks 60–80 s into ≥2.0 fuel — the crown lands inside the
                           // log-line window mechanically, never scripted

// ---- lines / tie-in ----
export const LINE = Object.freeze({
  TIE_ANCHOR_MIN: 2, TIE_ANCHOR_APART: 8, LOOP_MIN_CELLS: 20, LOOP_MIN_INTERIOR: 12,
});

// ---- stomp ----
export const STOMP = Object.freeze({
  MAX_CELLS: 4, RANGE: 1.6, COOLDOWN_S: 0.35, // rewards ear-speed — the whole game in miniature
});

// ---- structures ----
export const STRUCT = Object.freeze({
  THREAT_RADIUS: 6, HOLD_RADIUS: 12, LOST_FRACTION: 0.5,
  RING_RADIUS: 3, RING_COVERAGE: 0.90, RING_FLUX_MUL: 0.05,
});

// ---- ceremonies (ticks) ----
export const CEREMONY = Object.freeze({
  CEDE_HOLD_TICKS: 36,     // 1.2 s: counting to three before saying something you can't unsay
  CEDE_TICK_AT: [12, 24],
  SPOT_CAUGHT_MAX_CELLS: 12,
  INTERLUDE_TICKS: 2700,   // 90 s diegetic dawn→truck
  INTERLUDE_SATCHEL: 40,   // I4's authored inadequacy needs the number to be finite
  PLANT_HOLD_TICKS: 12,    // 0.4 s per seedling
});

// ---- performance ----
export const PERF = Object.freeze({
  ACTIVE_CAP: 24000, SIM_BUDGET_MS: 4,
  DIRTY_CHUNK: 16,         // 20×20 chunks of 16×16 cells
});

// Applied once at boot (and by the calibrator itself when measuring raw rates).
let calibrated = false;
export function applyCalibration(K) {
  if (calibrated) return;
  Object.assign(K_NORM, K);
  Object.freeze(K_NORM);
  calibrated = true;
  rebuildRates();
}
rebuildRates(); // seed F_RATE from the baked K table at module load
