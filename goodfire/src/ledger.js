// GOODFIRE ledger.js — the dispatcher's ledger: every formula, every epitaph, the medal
// law, the Fire Four audit, the season close, the Rx stamp. Numbers are RECOMPUTED from
// sim state + a pre-fire snapshot, never trusted from tallies kept elsewhere — the audit
// must equal recomputation exactly (season §16, F4-audit check). All copy per spec-season
// §14 with canon-final overrides: 'given:' lowercase everywhere; THE MOUNTAIN KEEPS THE
// SCAR appears only as the overrun medal (it lives in season.js FIRES data, not here).

import { CELLS, GRID, FUEL, S, FLAG, STRUCT, ACRES_PER_CELL, CHAINS_PER_CELL } from './canon.js';
import { ZONE, ZONE_NAMES } from './map.js';

// vegetation fuels — the chorus denominator and the audit's "unburned acres" both count
// living ground, not roofs (STRUCTURE) or dirt
const VEG = new Uint8Array(12);
for (const f of [FUEL.GRASS, FUEL.BRUSH, FUEL.PINE_LITTER, FUEL.TIMBER, FUEL.CROWN_CANOPY,
                 FUEL.RIPARIAN, FUEL.SLASH]) VEG[f] = 1;

// ---- snapshot: call at fire start, hand back in tallies.preState ------------------------
// Indexes exactly as before (preState[i] is the cell state — every caller reads it that
// way) with the pre-fire regrow riding along: save.js re-seeds scar at stage ≥2 as thin
// grass in state UNBURNED, so state ALONE cannot tell last month's black from ground that
// never burned — and telling those apart is the entire job of the Fire Four audit.
export function snapshotPreFire(sim) {
  const snap = sim.state.slice();
  snap.regrow = sim.regrow.slice();
  return snap;
}
// had this cell burned earlier in the season when today's smoke started? black (SCAR) or
// greened-over black (regrow > 0) both count; without the ride-along we fall back to black.
export function wasSeasonScar(preState, i) {
  return preState[i] === S.SCAR || (preState.regrow ? preState.regrow[i] > 0 : false);
}

// ---- formatting (typewriter page: fixed label column, dot leaders, right-set numbers) ---
export function fmt(n) { // 5830 → '5,830'
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}
const LABEL_W = 28, VALUE_W = 14;
export function leader(label, value) {
  let s = label + ' ';
  while (s.length < LABEL_W) s += (s.length % 2 === 0 ? '.' : ' ');
  return s + String(value).padStart(VALUE_W);
}

// ---- zone acreage: computed from map zoneId counts × 0.22, cached per sim ---------------
const zoneCellsCache = new WeakMap();
export function zoneCellCounts(sim) {
  let counts = zoneCellsCache.get(sim);
  if (counts) return counts;
  counts = new Uint32Array(16);
  for (let i = 0; i < CELLS; i++) counts[sim.zoneId[i]]++;
  zoneCellsCache.set(sim, counts);
  return counts;
}
export function zoneAcres(sim, z) { return zoneCellCounts(sim)[z] * ACRES_PER_CELL; }

// ---- acres held (season §14.2): denominator − burned-this-fire-in-threatened × 0.22.
// Burned-before-arrival TODAY counts against (the fire's head start is the player's
// problem; pars already price the authored floors) — but ground that was already black
// when the smoke started is not at stake and never was: it cannot burn (ignite() refuses
// SCAR), so leaving it in the denominator scores last month's loss as this month's hold
// and makes the page argue with the map. Greened-over scar STAYS in — thin grass burns,
// so it is live ground you can hold or lose today. -----------------------------------------
export function acresHeld(sim, fire, preState) {
  const counts = zoneCellCounts(sim);
  const zset = new Set(fire.threatenedZones);
  const preScar = new Uint32Array(16);
  let burned = 0;
  for (let i = 0; i < CELLS; i++) {
    const z = sim.zoneId[i];
    if (!zset.has(z)) continue;
    if (preState[i] === S.SCAR) preScar[z]++;
    else if (sim.state[i] === S.SCAR) burned++;
  }
  let denomCells = 0;
  for (const z of fire.threatenedZones) {
    const o = fire.denomOverride && fire.denomOverride[z];
    const zc = o != null ? Math.round(o / ACRES_PER_CELL) : counts[z];
    // an authored slice (denomOverride) prices a fraction of a bigger zone, so the zone's
    // black comes off it pro rata — the slice is a sample of the zone, not a second map
    const off = o != null ? Math.round(preScar[z] * zc / Math.max(1, counts[z])) : preScar[z];
    denomCells += Math.max(0, zc - off);
  }
  const denom = denomCells * ACRES_PER_CELL;
  return { held: Math.max(0, denom - burned * ACRES_PER_CELL), denom, burnedAcres: burned * ACRES_PER_CELL };
}

// ---- the chorus (season §14.4, canon-final §9): per-cell stage weights 0.35/0.70/1.00
// for regrow 1/2/3, mature-unburned flat 0.22, riparian ×1.3; Σ/vegetated. --------------
const STAGE_W = [0, 0.35, 0.70, 1.00];
export const CHORUS_TIERS = Object.freeze([ // thresholds are canon-final §9 — harness hits them exactly
  { min: 0.42, name: 'FULL CHORUS' }, { min: 0.30, name: 'STRONG' },
  { min: 0.18, name: 'THIN' }, { min: -1, name: 'QUIET' },
]);
export function chorus(sim) {
  const { baseFuel, state, regrow } = sim;
  let sum = 0, veg = 0;
  for (let i = 0; i < CELLS; i++) {
    const bf = baseFuel[i];
    if (!VEG[bf]) continue;
    veg++;
    // recovering ground is scored by its STAGE, not by its state: save.js re-seeds stage-2+
    // scar as thin grass in state UNBURNED, so a state test alone files shrub (0.70) and
    // planted thicket (1.00) as mature-unburned (0.22) — it would dock the player for
    // planting, which is the one thing the interlude asks of them. regrow > 0 is only ever
    // set on ground that burned this season (burnout resets it to 0 = fresh black = silent).
    const stage = regrow[i];
    const burned = state[i] === S.SCAR || stage > 0;
    let w = burned ? STAGE_W[stage] : 0.22; // mosaic beats monoculture, mechanized
    if (bf === FUEL.RIPARIAN) w *= 1.3;     // the willow water sings loudest
    sum += w;
  }
  const value = veg ? sum / veg : 0;
  for (const t of CHORUS_TIERS) if (value >= t.min) return { value, tier: t.name };
  return { value, tier: 'QUIET' };
}

// ---- sacrifice epitaphs (spec-season §14.5, lowercase; 'given:' lowercase per canon) ----
export const EPITAPHS = Object.freeze({
  'the weaver place': 'sheep memory. the line held because of it.',
  'the wick orchard': "old apples went home. the town didn't.",
  "preacher's knob": 'the residents did not complain.',
  'the ewe bench': 'the meadowlark will bill us later.',
  'static point': 'ninety seconds of quiet. cheap, all told.',
  'the mill office': 'paperwork. the saws are what matter.',
  "petersen's hay barn": 'hay grows back by definition.',
});
export const EPITAPH_GENERIC = "traded for the line. the ledger doesn't argue.";

// §14.5 keys its nouns to what a zone HOLDS — 'the weaver place' is the house standing in
// bride creek, 'the mill office' is a desk at the halloran mill — but the verb is ZONE-level
// (warden.js cedes a zoneId). Resolve by zone or the signature F1 sacrifice prints the
// generic and four of the seven authored lines never meet a player.
export const ZONE_EPITAPHS = Object.freeze({
  [ZONE.BRIDE_CREEK]: EPITAPHS['the weaver place'],
  [ZONE.HALLORAN_MILL]: EPITAPHS['the mill office'],
  [ZONE.EWE_BENCH]: EPITAPHS['the ewe bench'],
  [ZONE.WICK_ORCHARD]: EPITAPHS['the wick orchard'],
  [ZONE.PREACHERS_KNOB]: EPITAPHS["preacher's knob"],
  [ZONE.STATIC_POINT]: EPITAPHS['static point'],
  [ZONE.MILLHAVEN]: EPITAPHS["petersen's hay barn"], // the barn is what the town edge loses
});
// name → zone: the {name, zoneId} contract is the fast path, but the name alone still lands
// the authored line (the game layer names cedes straight out of ZONE_NAMES).
const ZONE_BY_NAME = new Map();
for (let z = 1; z < ZONE_NAMES.length; z++) if (ZONE_NAMES[z]) ZONE_BY_NAME.set(ZONE_NAMES[z], z);
export function zoneOfSacrifice(name, zoneId) {
  return zoneId || ZONE_BY_NAME.get(String(name || '').toLowerCase()) || 0;
}
export function epitaphFor(name, zoneId) {
  const z = zoneOfSacrifice(name, zoneId);
  if (z && ZONE_EPITAPHS[z]) return ZONE_EPITAPHS[z];
  return EPITAPHS[String(name || '').toLowerCase()] || EPITAPH_GENERIC; // the true fallback
}
// givenLine(sac, fire): sac = { name, zoneId } (a bare name string still works).
export function givenLine(sac, fire) {
  const s = typeof sac === 'string' ? { name: sac } : (sac || {});
  const z = zoneOfSacrifice(s.name, s.zoneId);
  // the prologue's canon beat (canon-final §9): the pocket has a name the ditch hasn't, and
  // it is the one given the game never explains — no epitaph, no dash, one line of record.
  if (fire && fire.id === 'prologue' && z === ZONE.DITCH) return "given: cobb's pocket.";
  const name = String(s.name || ZONE_NAMES[z] || '').toLowerCase();
  return 'given: ' + name + ' — ' + epitaphFor(s.name, s.zoneId);
}

// ---- Fire Four FUEL AUDIT (season §10.6) — five live numbers, two lines of record, no
// adjectives. The two zeros are the thesis; they are COMPUTED, not asserted. -------------
export function fuelAudit(sim, preState) {
  const { baseFuel, burnSeverity, flags } = sim;
  // burnSeverity is peak-recorded at burnout AND restored by save.js for last month's black,
  // so it only reads "today" on ground that was not black when the smoke started — which is
  // exactly the ground that could burn today (ignite() refuses SCAR). CROWNING catches a
  // cell still crowning as the page prints.
  const crownedToday = (i) => preState[i] !== S.SCAR &&
    (burnSeverity[i] === 2 || (flags[i] & FLAG.CROWNING) !== 0);
  let preUnburned = 0, preScar = 0, crownedFromUnburned = 0, crownedFromScar = 0;
  for (let i = 0; i < CELLS; i++) {
    if (!VEG[baseFuel[i]]) continue;
    const wasScar = wasSeasonScar(preState, i); // greened-over black is still last month's black
    if (wasScar) preScar++; else preUnburned++;
    const crowned = crownedToday(i);
    if (!wasScar && crowned) crownedFromUnburned++;
    // "of those, crowned today" over season scar: black cannot re-ignite at all, and scar
    // that greened back is grass (load 0.4, and grass never crowns) — so this counts to zero
    // by physics, from live cells. COMPUTED zero, not asserted: the zero IS the thesis.
    if (wasScar && crowned) crownedFromScar++;
  }
  const A = ACRES_PER_CELL;
  const p1 = preUnburned ? Math.round(100 * crownedFromUnburned / preUnburned) : 0;
  const p2 = preScar ? Math.round(100 * crownedFromScar / preScar) : 0;
  return {
    unburnedAcres: preUnburned * A, crownedTodayAcres: crownedFromUnburned * A,
    scarAcres: preScar * A, crownedInScarAcres: crownedFromScar * A,
    lines: [
      { text: leader('acres unburned since june 1', fmt(preUnburned * A)), style: 'audit' },
      { text: leader('  of those, crowned today', fmt(crownedFromUnburned * A) + '   (' + p1 + '%)'), style: 'audit' },
      { text: leader('acres of season scar', fmt(preScar * A)), style: 'audit' },
      { text: leader('  of those, crowned today', fmt(crownedFromScar * A) + '    (' + p2 + '%)'), style: 'audit' },
      { text: 'the larder: last burned 1986.', style: 'audit' },
      { text: 'the doghair: last burned 1981.', style: 'audit' },
    ],
  };
}

// ---- medal law (spec-season §14.6 table; conditions from each fire's pars) --------------
// facts: { standing, total, lostKeys (LOST today), preLostKeys (ash before today's smoke —
//          not gradeable, see buildLedger), towerScorched, acres }
// Returns { medal, extra, rank }: rank 0 overrun / 1 mid / 2 best / 3 best + F4's edges, so
// the medal shelf can keep the better of two tellings without string-matching liturgy.
export function medalFor(fire, facts) {
  const { standing, total, lostKeys, preLostKeys, towerScorched, acres } = facts;
  const M = fire.medals;
  // a roof lost LAST month doesn't stand this month either — the liturgy names it out loud,
  // so it must be true of the world, not just of today's column
  const gone = new Set([...(lostKeys || []), ...(preLostKeys || [])]);
  const stands = (k) => !gone.has(k);
  const best = (extra) => ({ medal: M.best, extra: extra || null, rank: extra ? 3 : 2 });
  const mid = () => ({ medal: M.mid, extra: null, rank: 1 });
  const overrun = () => ({ medal: M.overrun, extra: null, rank: 0 });
  switch (fire.id) {
    case 'prologue': return best(); // FIRST DIRT. — hired, not graded
    case 'fire1':
      if (standing === total && acres.held >= (fire.pars.acresHeldMin || 0)) return best();
      if (stands('weaverHouse')) return mid();
      return overrun();
    case 'fire2':
      if (standing === total && acres.held >= (fire.pars.acresHeldMin || 0)) return best();
      if (stands('sawShed') && stands('planerShed') && stands('burner')) return mid();
      return overrun();
    case 'fire3':
      if (!towerScorched && standing === total) return best();
      if (total - standing <= 2) return mid();
      return overrun();
    case 'fire4': // FORTY YEARS CAME DUE. always; + YOU HELD THE EDGES. if all 6 stand
      return best(standing === total ? M.edges : null);
    case 'fire5':
      if (standing === total) return best();
      if (stands('school') && stands('church') && stands('mercantile')) return mid();
      return overrun();
    case 'fire6': {
      const losses = total - standing;
      if (losses <= (fire.pars.lossesBest ?? 0)) return best();
      if (losses <= (fire.pars.lossesMid ?? 3)) return mid();
      return overrun();
    }
    default: return best();
  }
}

// A structure is LOST the moment ≥ LOST_FRACTION of its footprint is scar (sim's own FSM
// test). Replay that test against the pre-fire snapshot and you know what today can still
// lose: save.js scars every cell of a structure lost in an earlier fire and holds it there
// all season (char footprints never green over), so this reads exactly the sim's LOST.
export function lostBeforeFire(st, preState) {
  if (st.indestructible) return false; // the FSM's own guard
  let scar = 0;
  for (const c of st.cells) if (preState[c] === S.SCAR) scar++;
  return scar >= st.cells.length * STRUCT.LOST_FRACTION;
}

// ---- buildLedger(sim, fire, tallies) → { lines, chorus, medal, medalRank } ---------------
// tallies: { preState: Uint8Array (from snapshotPreFire at fire start — REQUIRED),
//            lineCells: int (cells of line cut this fire),
//            sacrifices: [{ name, zoneId }] in cede order (game layer names them),
//            towerScorched?: bool }
// Structure standing/lost and spots are read live from sim (single source of truth).
export function buildLedger(sim, fire, tallies) {
  const preState = tallies.preState;
  const lines = [];
  lines.push({ text: fire.name.toUpperCase() + ' — ' + fire.date, style: 'header' });

  // acres held
  const acres = acresHeld(sim, fire, preState);
  lines.push({ text: leader('acres held', fmt(acres.held) + ' of ' + fmt(acres.denom)), style: 'row' });

  // structures standing (threatened subset; lost print struck-through with a single pen line).
  // The page grades TODAY: a roof that was already a char footprint when the smoke started
  // is not at stake this fire and never appears in today's column — counting it would print
  // a fresh pen-strike through a month-old loss AND make F4's edges and F6's mosaic
  // unearnable before the first cell lit (cede Static Point in july, forfeit october).
  const preLostKeys = [], atStake = [];
  for (const key of fire.structuresAtStake) {
    const s = sim.structures.find(st => st.key === key);
    if (!s) continue;
    if (lostBeforeFire(s, preState)) preLostKeys.push(key); else atStake.push(s);
  }
  const lostKeys = atStake.filter(s => s.state === 'LOST').map(s => s.key);
  const standing = atStake.length - lostKeys.length;
  if (atStake.length) {
    lines.push({ text: leader('structures standing', standing + ' of ' + atStake.length), style: 'row' });
    for (const s of atStake)
      lines.push({ text: '    ' + s.name, style: s.state === 'LOST' ? 'strike' : 'row' });
  }

  // line cut — chains (1 cell ≈ 1.5 chains; one word of register does a page of lore)
  lines.push({ text: leader('line cut', fmt((tallies.lineCells || 0) * CHAINS_PER_CELL) + ' chains'), style: 'row' });

  // spots caught
  const sp = sim.spotSummary();
  lines.push({ text: leader('spots caught', sp.total ? (sp.caught + ' of ' + sp.total) : 'none flew'), style: 'row' });

  // sacrifices
  const sac = tallies.sacrifices || [];
  if (sac.length === 0) lines.push({ text: leader('sacrifices', 'none today'), style: 'row' });
  else {
    lines.push({ text: leader('sacrifices', String(sac.length)), style: 'row' });
    for (const g of sac) lines.push({ text: givenLine(g, fire), style: 'given' });
  }

  // FUEL AUDIT — Fire Four only, between structures/rows and the birds (§14.1 step 3)
  if (fire.id === 'fire4') lines.push(...fuelAudit(sim, preState).lines);

  // the birds are PERFORMED by audio (~8 s roll-call), then the tier stamps — the ledger
  // hands the number over; the game layer renders the stamp after the performance
  const ch = chorus(sim);

  // the medal — one ALL-CAPS liturgy line, stamped last
  const facts = { standing, total: atStake.length, lostKeys, preLostKeys,
                  towerScorched: !!tallies.towerScorched, acres };
  const md = medalFor(fire, facts);
  lines.push({ text: md.medal, style: 'medal' });
  if (md.extra) lines.push({ text: md.extra, style: 'medal' });

  return { lines, chorus: ch, medal: md.medal, medalRank: md.rank };
}

// ---- season close (season §19): totals + the season medal -------------------------------
export const SEASON_MEDAL = 'SEASON KEPT. SNOW TAKES THE WATCH.';
export function buildSeasonClose(sim) {
  const { baseFuel, state, regrow } = sim;
  let veg = 0, scar = 0;
  for (let i = 0; i < CELLS; i++) {
    if (!VEG[baseFuel[i]]) continue;
    veg++;
    // burned = burned, whatever grew back since: by october most of june's black is thin
    // grass again (state UNBURNED), and a state-only count would quietly un-burn the acres
    // the whole season was spent buying
    if (state[i] === S.SCAR || regrow[i] > 0) scar++;
  }
  const standing = sim.structures.filter(s => s.state !== 'LOST').length;
  const ch = chorus(sim);
  const lines = [
    { text: 'THE SEASON — jun 2 to first snow', style: 'header' },
    { text: leader('acres burned', fmt(scar * ACRES_PER_CELL)), style: 'row' },
    { text: leader('acres kept', fmt((veg - scar) * ACRES_PER_CELL)), style: 'row' },
    { text: leader('structures standing', standing + ' of ' + sim.structures.length), style: 'row' },
    { text: leader('the chorus', ch.tier), style: 'row' },
    { text: SEASON_MEDAL, style: 'medal' },
  ];
  return { lines, chorus: ch, medal: SEASON_MEDAL };
}

// ---- Rx stamp (season §13.2, canon-final): ≥70% of unit black with ≤3% spill → GOOD
// BLACK.; spill ≤10% still stamps, with D-30; worse: no stamp, no punishment — the spill
// is scar, and scar is money in october. ---------------------------------------------------
export const RX_MEDAL = 'GOOD BLACK.';
const RX_BLACK_MIN = 0.70, RX_SPILL_CLEAN = 0.03, RX_SPILL_STAMP = 0.10; // season §13.2
export function buildRxStamp(sim, unit, preState) {
  const { state, baseFuel } = sim;
  const r = unit.rect;
  let unitVeg = 0, unitBlack = 0, spill = 0;
  for (let i = 0; i < CELLS; i++) {
    const x = i % GRID, y = (i / GRID) | 0;
    const inside = x >= r.x0 && x <= r.x1 && y >= r.y0 && y <= r.y1;
    if (inside) {
      if (!VEG[baseFuel[i]]) continue;
      unitVeg++;
      if (state[i] === S.SCAR && preState[i] !== S.SCAR) unitBlack++;
    } else if (state[i] === S.SCAR && preState[i] !== S.SCAR) spill++;
  }
  const blackFrac = unitVeg ? unitBlack / unitVeg : 0;
  const spillFrac = unitVeg ? spill / unitVeg : 0;
  const clean = blackFrac >= RX_BLACK_MIN && spillFrac <= RX_SPILL_CLEAN;
  const stamped = blackFrac >= RX_BLACK_MIN && spillFrac <= RX_SPILL_STAMP;
  const lines = [
    { text: 'RX — ' + unit.name.toUpperCase(), style: 'header' },
    { text: leader('unit black', Math.round(blackFrac * 100) + '%'), style: 'row' },
    { text: leader('spill', Math.round(spillFrac * 100) + '%'), style: 'row' },
  ];
  if (stamped) lines.push({ text: RX_MEDAL, style: 'medal' });
  // the radio: D-30 ('colored outside the lines') for a stamp that spilled; D-18 ('an
  // escaped burn is still a burn') ONLY when black actually got loose. A burn that stayed
  // inside the ring and simply didn't take enough ground escaped nothing — she would be
  // reading the wrong line off the page. No stamp is the whole answer, and it isn't much of
  // a punishment: the spill is scar, and scar is money in october.
  let radioId = null;
  if (stamped && !clean) radioId = 'D-30';
  else if (!stamped && spillFrac > RX_SPILL_CLEAN) radioId = 'D-18';
  return { stamped, clean, blackFrac, spillFrac, lines, radioId };
}
