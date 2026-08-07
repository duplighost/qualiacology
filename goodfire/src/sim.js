// GOODFIRE sim.js — the cellular-automata fire model (physics canon: spec-sim + canon-final).
// Pure module: no DOM, Node-importable. Deterministic: all sim randomness from the wind/ember
// streams, consumed only inside simTick in fixed pipeline order; double-buffered heat so cell
// iteration order can never matter; integer-tick timers throughout.

import { GRID, CELLS, DT, FUEL, K_NORM, S, FLAG, SPREAD, WIND, EMBER,
         BACKBURN, RETARDANT, CROWN, MOIST, STRUCT, STOMP,
         F_RATE, F_WINDSENS, F_INTENSITY, F_BURNTIME, F_EMBERRATE, F_EMBERCATCH,
         F_MOISTEXT, F_BASEMOIST, F_BURNABLE, F_CASTBURNING } from './canon.js';
import { fnv1a } from './rng.js';

const N8 = [];
for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
  if (dx === 0 && dy === 0) continue;
  const len = Math.hypot(dx, dy);
  N8.push({ dx, dy, off: dy * GRID + dx, ux: dx / len, uy: dy / len, diag: dx !== 0 && dy !== 0 });
}
// flat copies for the hot loop (object iteration costs ~35% of the emission pass)
const N8OFF = new Int32Array(N8.map(n => n.off));
const N8DX = new Int8Array(N8.map(n => n.dx)), N8DY = new Int8Array(N8.map(n => n.dy));
const N8UX = new Float32Array(N8.map(n => n.ux)), N8UY = new Float32Array(N8.map(n => n.uy));
const N8DIAG = new Float32Array(N8.map(n => n.diag ? 0.7071 : 1));

export function createSim(mapData, streams) {
  // ---- state (structure-of-arrays; ~2.6 MB) ----
  const fuel = mapData.fuel.slice();
  const baseFuel = mapData.baseFuel;
  const load = new Float32Array(mapData.load0);
  const moisture = new Float32Array(CELLS);
  const heat = new Float32Array(CELLS);
  const heatNext = new Float32Array(CELLS);
  const state = new Uint8Array(CELLS);
  const stateTimer = new Uint16Array(CELLS);
  const burnTotal = new Uint16Array(CELLS);  // ticks at ignition — timers() never recomputes
  const flags = new Uint8Array(CELLS);
  const retard = new Float32Array(CELLS);
  const regrow = new Uint8Array(CELLS);        // 0 black, 1 fireweed, 2 shrub, 3 thicket
  const burnSeverity = new Uint8Array(CELLS);  // 0 none, 1 surface, 2 crown (peak, at burnout)
  const provenance = new Uint16Array(CELLS);   // 0 wild, n = backburn stroke id
  const spotId = new Uint16Array(CELLS);       // 0 none — ember-seeded components ("spots")
  const fluxSrc = new Int32Array(CELLS).fill(-1);   // strongest contributor this tick
  const fluxMax = new Float32Array(CELLS);
  const { elev, zoneId, featureId, structures } = mapData;

  // riparian moisture bonus mask (within 2 of water/riparian), computed once
  const ripBonus = new Uint8Array(CELLS);
  for (let y = 0; y < GRID; y++) for (let x = 0; x < GRID; x++) {
    let near = false;
    for (let dy = -2; dy <= 2 && !near; dy++) for (let dx = -2; dx <= 2; dx++) {
      const X = x + dx, Y = y + dy;
      if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
      const f = mapData.fuel[Y * GRID + X];
      if (f === FUEL.WATER || f === FUEL.RIPARIAN) { near = true; break; }
    }
    if (near) ripBonus[y * GRID + x] = 1;
  }

  // ---- active list ----
  const active = new Int32Array(32000);
  let activeCount = 0;
  const isActive = new Uint8Array(CELLS);
  function activate(i) { if (!isActive[i] && activeCount < active.length) { isActive[i] = 1; active[activeCount++] = i; } }

  // dirty chunks for render (20×20 of 16×16)
  const CHUNKS = (GRID / 16) | 0;
  const dirty = new Uint8Array(CHUNKS * CHUNKS);
  const markDirty = (i) => { dirty[((i / GRID | 0) >> 4) * CHUNKS + ((i % GRID) >> 4)] = 1; };

  // ---- embers (fixed pool, no allocation) ----
  const embers = Array.from({ length: EMBER.POOL }, () => ({
    live: false, x: 0, y: 0, vx: 0, vy: 0, ticksLeft: 0, prov: 0, crown: false,
  }));

  // ---- wind ----
  let schedule = [{ t: 0, deg: 270, mph: 5 }];
  let windPinned = null; // harness windSet
  const wind = { deg: 270, mph: 5, mphEffective: 5, tx: 1, ty: 0 };
  let gustLatch = 0;

  // ---- fire-session context ----
  let tick = 0;
  let D = 0.5;                      // dryness for the current fire
  let basinFloorOn = true;          // G-2 until aug 1 (director clears)
  let weatherEndOn = false;
  let backburnNextId = 1;
  const backburnLost = new Map();   // id -> [tickstamps of provenance-lost ignitions]
  const backburnEscaped = new Set();
  const backburnStarveScore = new Map(); // id -> adjacent-burnout count
  const backburnFrontage = new Map();    // id -> live front cell count (for the drone)
  const spots = [];                  // {id, burned, active, caught, reported}
  let embersEnabled = true;
  const fuses = [];                  // drip fuses: {cell, at, id} (sorted by insertion; checked per tick)
  const zonesCeded = new Set();

  // per-zone counters (incremental)
  const NZONES = 16;
  const zBurning = new Uint32Array(NZONES), zScar = new Uint32Array(NZONES),
        zFlammable = new Uint32Array(NZONES);
  for (let i = 0; i < CELLS; i++) if (F_BURNABLE[fuel[i]]) zFlammable[zoneId[i]]++;

  // structures runtime
  for (const st of structures) {
    st.state = 'SAFE'; st.scarCells = 0; st.ringed = false;
    const xs = st.cells.map(c => c % GRID), ys = st.cells.map(c => (c / GRID) | 0);
    st.cx = xs.reduce((a, b) => a + b, 0) / xs.length;
    st.cy = ys.reduce((a, b) => a + b, 0) / ys.length;
  }

  // ---- events ----
  const listeners = [];
  const eventLog = [];
  let recordEvents = false; // harness/tests flip this; runtime consumers subscribe instead
  function emit(type, payload) {
    if (!recordEvents && listeners.length === 0) return; // allocation-free when unobserved
    const e = { tick, type, ...payload };
    if (recordEvents) {
      eventLog.push(e);
      if (eventLog.length > 4000) eventLog.splice(0, 2000);
    }
    for (const fn of listeners) fn(e);
  }

  // ---- moisture init per fire ----
  function initFire(opts) {
    D = opts.D;
    basinFloorOn = opts.basinFloor !== false;
    weatherEndOn = false;
    tick = 0;
    backburnLost.clear(); backburnEscaped.clear(); backburnStarveScore.clear();
    backburnFrontage.clear(); spots.length = 0; fuses.length = 0; zonesCeded.clear();
    heat.fill(0); heatNext.fill(0); retard.fill(0);
    for (let i = 0; i < CELLS; i++) {
      if (state[i] !== S.SCAR) { state[i] = S.UNBURNED; stateTimer[i] = 0; }
      flags[i] &= FLAG.LINE; // only line survives between fires
      provenance[i] = 0; spotId[i] = 0;
      const f = fuel[i];
      if (F_BURNABLE[f]) {
        // moistJitter: authored fuel patchiness. Early-season fires percolate and stall in
        // damp pockets; as D climbs the same pockets cure out and fires run whole — the
        // season arc, mechanized (and it is what keeps a 320-tile map from burning entire).
        let m = F_BASEMOIST[f] * (1 - D) * (mapData.moistJitter ? mapData.moistJitter[i] : 1)
              + (ripBonus[i] ? MOIST.RIPARIAN_BONUS : 0);
        if (basinFloorOn && (zoneId[i] === 2 || zoneId[i] === 3)) m = Math.max(m, MOIST.BASIN_FLOOR);
        moisture[i] = Math.max(0.02, Math.min(0.95, m));
      } else moisture[i] = 0.95;
    }
    activeCount = 0; isActive.fill(0);
    for (const e of embers) e.live = false;
    dirty.fill(1);
  }

  // ---- wind update ----
  function windUpdate() {
    let deg, mph;
    if (windPinned) ({ deg, mph } = windPinned);
    else {
      const t = tick * DT;
      let a = schedule[0], b = schedule[schedule.length - 1];
      for (let k = 0; k < schedule.length - 1; k++)
        if (t >= schedule[k].t && t <= schedule[k + 1].t) { a = schedule[k]; b = schedule[k + 1]; break; }
      const span = Math.max(0.001, b.t - a.t), f = Math.max(0, Math.min(1, (t - a.t) / span));
      // interpolate direction the short way around
      let dd = ((b.deg - a.deg + 540) % 360) - 180;
      deg = a.deg + dd * f; mph = a.mph + (b.mph - a.mph) * f;
    }
    // gusts: smoothed value-noise from the wind stream (consumed once per tick — deterministic)
    const n = streams.wind();
    wind._g = (wind._g ?? 0) * (1 - DT / WIND.GUST_SMOOTH_S) + (n * 2 - 1) * (DT / WIND.GUST_SMOOTH_S);
    const gust = Math.max(-1, Math.min(1, wind._g * 6));
    const mphEff = windPinned ? mph : Math.max(0, mph * (1 + WIND.GUST_AMP * gust));
    const degEff = windPinned ? deg : deg + WIND.DIR_JITTER_DEG * gust * 0.5;
    wind.deg = degEff; wind.mph = mph; wind.mphEffective = mphEff;
    // wind blows FROM deg (met convention) → toward vector
    const rad = (degEff + 180) * Math.PI / 180; // toward = from + 180°
    wind.tx = Math.sin(rad); wind.ty = -Math.cos(rad); // compass: 0=N; canvas +y south
    // gust event
    if (!windPinned) {
      if (mphEff > mph * WIND.GUST_EVENT_MUL && tick > gustLatch) {
        emit('gust', { peakMph: mphEff });
        gustLatch = tick + WIND.GUST_EVENT_HYST_S / DT;
      }
    }
  }

  // ---- ignition ----
  // seedBoost: point ignitions (lightning, embers, drip) pre-heat their orthogonal neighbors —
  // a fire starts as a flame, not a lone cell; without this a single cell burns out before any
  // neighbor reaches 1.0 and every spot fire dies stillborn (kernel-measured). Front physics
  // is untouched: flux-driven ignitions never seed-boost, so calibration stays valid.
  function ignite(i, prov, viaCrown, viaSpot, seedBoost) {
    const f = fuel[i];
    if (!F_BURNABLE[f] || state[i] === S.BURNING || state[i] === S.EMBERCAST || state[i] === S.SCAR) return;
    state[i] = S.BURNING;
    heat[i] = 0;
    const L = load[i];
    // crown determination (canon-final §3)
    let crowning = false;
    if (D >= CROWN.DRY_GATE) {
      if (f === FUEL.CROWN_CANOPY) crowning = true;
      else if ((f === FUEL.BRUSH || f === FUEL.PINE_LITTER || f === FUEL.TIMBER) && L >= CROWN.LOAD_GATE) crowning = true;
      else if (viaCrown && L >= CROWN.DRAG_LOAD && f !== FUEL.GRASS && f !== FUEL.RIPARIAN && f !== FUEL.STRUCTURE) crowning = true;
    }
    const bt = crowning ? CROWN.BURN_TIME
             : F_BURNTIME[f] * (0.6 + 0.4 * L) * (prov ? BACKBURN.BURNTIME_MUL : 1);
    stateTimer[i] = Math.max(1, Math.round(bt / DT));
    burnTotal[i] = stateTimer[i];
    flags[i] &= ~FLAG.EMBER_GLOW;
    if (seedBoost) {
      for (const d of [-1, 1, -GRID, GRID]) {
        const j = i + d;
        if (j < 0 || j >= CELLS) continue;
        if (state[j] === S.UNBURNED && F_BURNABLE[fuel[j]] &&
            moisture[j] < F_MOISTEXT[fuel[j]] && !(flags[j] & FLAG.LINE)) {
          heat[j] = Math.min(SPREAD.HEAT_CAP, heat[j] + 0.6);
          if (heat[j] >= SPREAD.HEATING_AT) { state[j] = S.HEATING; activate(j); markDirty(j); }
        }
      }
    }
    if (crowning) {
      flags[i] |= FLAG.CROWNING;
      emit('crownTransition', { cell: i });
    }
    if (prov) { flags[i] |= FLAG.BACKBURN | FLAG.PLAYER_LIT; provenance[i] = prov; }
    else provenance[i] = 0;
    if (viaSpot) spotId[i] = viaSpot;
    zBurning[zoneId[i]]++;
    if (viaSpot) { const sp = spots[viaSpot - 1]; if (sp) { sp.burned++; sp.active++; } }
    activate(i); markDirty(i);
    emit('ignition', { cell: i, prov, crowning });
  }

  function burnout(i) {
    const wasCrown = !!(flags[i] & FLAG.CROWNING);
    const z = zoneId[i];
    zBurning[z] = Math.max(0, zBurning[z] - 1);
    if (spotId[i]) { const sp = spots[spotId[i] - 1]; if (sp) sp.active = Math.max(0, sp.active - 1); }
    // starve accounting: backburn cell burning out next to wild burned/burning
    const prov = provenance[i];
    if (prov) {
      for (const n of N8) {
        const j = i + n.off;
        if (j < 0 || j >= CELLS) continue;
        if (provenance[j] === 0 && (state[j] === S.BURNING || state[j] === S.EMBERCAST || state[j] === S.SCAR)) {
          backburnStarveScore.set(prov, (backburnStarveScore.get(prov) || 0) + 1);
          break;
        }
      }
    }
    if (F_BURNABLE[fuel[i]]) zFlammable[z] = Math.max(0, zFlammable[z] - 1);
    state[i] = S.SCAR;
    fuel[i] = FUEL.SCAR;
    burnSeverity[i] = wasCrown ? 2 : 1;
    regrow[i] = 0; load[i] = 0;
    flags[i] &= FLAG.LINE;
    zScar[z]++;
    markDirty(i);
    emit('cellBurnout', { cell: i });
  }

  // ---- the flux pass ----
  function emission() {
    const refW = wind.mphEffective / WIND.REF_MPH;
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const st = state[i];
      if (st !== S.BURNING && st !== S.EMBERCAST) continue;
      const f = fuel[i];
      if (!F_BURNABLE[f]) continue;
      const crowning = !!(flags[i] & FLAG.CROWNING);
      const inten = intensityOf(i, f, st) * (crowning ? CROWN.INTENSITY_MUL : 1);
      if (inten <= 0) continue;
      const x = i % GRID, y = (i / GRID) | 0;
      for (let k = 0; k < 8; k++) {
        const X = x + N8DX[k], Y = y + N8DY[k];
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
        const j = i + N8OFF[k];
        const fj = fuel[j];
        if (!F_BURNABLE[fj]) continue;
        const sj = state[j];
        if (sj === S.BURNING || sj === S.EMBERCAST || sj === S.SCAR) continue;
        // wind factor
        const d = wind.tx * N8UX[k] + wind.ty * N8UY[k];
        const sens = crowning ? CROWN.WIND_SENS : F_WINDSENS[fj];
        let wf;
        if (d > 0) wf = 1 + sens * refW * d;
        else wf = Math.max(SPREAD.UPWIND_FLOOR, 1 + 0.88 * refW * d);
        // slope
        const de = elev[j] - elev[i];
        const sf = Math.max(SPREAD.SLOPE_MIN, Math.min(SPREAD.SLOPE_MAX, 1 + SPREAD.SLOPE_PER_STEP * de));
        // moisture (receiver)
        const mf = 1 - moisture[j] / F_MOISTEXT[fj];
        if (mf <= 0) continue;
        // line / retardant
        let lf = 1;
        if (flags[j] & FLAG.LINE) lf = crowning ? CROWN.LINE_FACTOR : 0;
        if (lf === 0) continue;
        let rf = 1;
        if (retard[j] > 0.001) {
          rf = 1 - 0.92 * Math.min(1, retard[j] / 0.5);
          if (crowning) rf = Math.max(rf, RETARDANT.CROWN_FLOOR);
        }
        // structure ring rule
        if (fj === FUEL.STRUCTURE) {
          const stx = structForCell(j);
          if (stx && stx.ringed) lf *= STRUCT.RING_FLUX_MUL;
        }
        // rate: crown flux uses the crown rate; surface uses the receiver fuel's contract
        // speed (already post-SPREAD_SCALE in canon) × its measured K normalization
        const rate = crowning ? CROWN_RATE : F_RATE[fj];
        // flux — receiver-centric; sqrt(load) folds the load-ignition addendum in (canon-final)
        const flux = rate * N8DIAG[k] * wf * sf * inten * mf * lf * rf *
                     Math.sqrt(Math.max(0.25, load[j])) * DT;
        if (flux <= 0) continue;
        heatNext[j] += flux;
        if (flux > fluxMax[j]) { fluxMax[j] = flux; fluxSrc[j] = i; }
      }
    }
  }

  const CROWN_RATE = CROWN.CALM * (K_NORM.crown || 1);
  function intensityOf(i, f, st) {
    let v = F_INTENSITY[f] * (0.6 + 0.4 * load[i]) * (1 - 0.7 * moisture[i]);
    if (st === S.EMBERCAST) v *= SPREAD.EMBERCAST_INTENSITY;
    if (flags[i] & FLAG.BACKBURN) v *= BACKBURN.INTENSITY_MUL;
    return v;
  }

  function integrate() {
    // deterministic order: ascending index over cells that received flux OR are HEATING
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      if (state[i] !== S.HEATING) continue;
      if (heatNext[i] === 0) { // unfed: stand down
        heat[i] -= SPREAD.HEAT_DECAY * DT;
        if (heat[i] < SPREAD.HEATING_AT) { state[i] = S.UNBURNED; heat[i] = Math.max(0, heat[i]); markDirty(i); }
      }
    }
    // apply flux (ascending index scan over the map would cost 102k/tick; instead we walk a
    // deterministic list: cells with flux are exactly neighbors of actives — re-scan actives' halos)
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const st = state[i];
      if (st !== S.BURNING && st !== S.EMBERCAST) continue;
      for (const n of N8) {
        const j = i + n.off;
        if (j < 0 || j >= CELLS) continue;
        if (heatNext[j] === 0) continue;
        const add = heatNext[j];
        heatNext[j] = 0;
        const sj = state[j];
        if (sj === S.BURNING || sj === S.EMBERCAST || sj === S.SCAR) { fluxSrc[j] = -1; fluxMax[j] = 0; continue; }
        heat[j] = Math.min(SPREAD.HEAT_CAP, heat[j] + add);
        if (heat[j] >= 1.0) {
          const src = fluxSrc[j];
          const srcCrown = src >= 0 && !!(flags[src] & FLAG.CROWNING);
          // provenance inheritance / escape (canon-final §5)
          let prov = 0;
          if (src >= 0 && provenance[src]) {
            const sx = src % GRID, sy = (src / GRID) | 0;
            const jx = j % GRID, jy = (j / GRID) | 0;
            const len = Math.hypot(jx - sx, jy - sy) || 1;
            const d = wind.tx * (jx - sx) / len + wind.ty * (jy - sy) / len;
            if (d < BACKBURN.ESCAPE_DOT) prov = provenance[src];
            else recordEscape(provenance[src], j);
          }
          const sp = src >= 0 ? spotId[src] : 0;
          ignite(j, prov, srcCrown, sp && spots[sp - 1] && spots[sp - 1].burned <= 12 ? sp : 0);
        } else if (heat[j] >= SPREAD.HEATING_AT && sj === S.UNBURNED) {
          state[j] = S.HEATING; activate(j); markDirty(j);
        }
        fluxSrc[j] = -1; fluxMax[j] = 0;
      }
    }
  }

  function recordEscape(id, cell) {
    if (backburnEscaped.has(id)) return;
    let arr = backburnLost.get(id);
    if (!arr) { arr = []; backburnLost.set(id, arr); }
    arr.push(tick);
    const cutoff = tick - BACKBURN.ESCAPE_WINDOW_S / DT;
    while (arr.length && arr[0] < cutoff) arr.shift();
    const inStructZone = structForCell(cell) != null;
    if (arr.length >= BACKBURN.ESCAPE_COUNT || inStructZone) {
      backburnEscaped.add(id);
      emit('backburnEscaped', { id });
    }
  }

  // ---- timers / transitions ----
  function timers() {
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const st = state[i];
      if (st === S.BURNING) {
        if (--stateTimer[i] === 0) burnout(i);
        else if (stateTimer[i] < burnTotal[i] * (1 - SPREAD.EMBERCAST_AT)) state[i] = S.EMBERCAST;
      } else if (st === S.EMBERCAST) {
        if (--stateTimer[i] === 0) burnout(i);
      } else if (flags[i] & FLAG.EMBER_GLOW) {
        if (--stateTimer[i] === 0) {
          flags[i] &= ~FLAG.EMBER_GLOW;
          const sp = newSpot();
          ignite(i, embGlowProv.get(i) || 0, false, sp, true);
          embGlowProv.delete(i);
        }
      }
    }
    // drip fuses
    for (let k = fuses.length - 1; k >= 0; k--) {
      const fz = fuses[k];
      if (tick >= fz.at) {
        fuses.splice(k, 1);
        if (state[fz.cell] === S.UNBURNED || state[fz.cell] === S.HEATING) {
          ignite(fz.cell, fz.id, false, 0, true);
          emit('dripIgnite', { cell: fz.cell });
        }
      }
    }
  }

  // ---- embers ----
  const embGlowProv = new Map();
  function newSpot() {
    spots.push({ id: spots.length + 1, burned: 0, active: 0, caught: false, reported: false });
    return spots.length; // spotId
  }
  function castEmbers() {
    if (!embersEnabled) return;
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const crowning = !!(flags[i] & FLAG.CROWNING);
      const st = state[i];
      const f = fuel[i];
      // WHO throws: old fire (EMBERCAST) always; a running crown always; and the running-
      // front fuels (canon F_CASTBURNING: brush/slash/timber) also throw from the flame
      // itself at a reduced rate — without that last clause the embercast band trails the
      // front by more than an ember can fly and a surface brush run can never spot ahead.
      let stageMul;
      if (st === S.EMBERCAST || (crowning && st === S.BURNING)) stageMul = 1;
      else if (st === S.BURNING && F_CASTBURNING[f]) stageMul = EMBER.BURNING_CAST_MUL;
      else continue;
      let rate = (crowning ? CROWN.EMBER_RATE : F_EMBERRATE[f]) * stageMul;
      if (!rate) continue;
      rate *= (0.5 + 0.5 * load[i]);
      if (provenance[i]) rate *= EMBER.BACKBURN_RATE_MUL;
      if (streams.ember() < rate * DT) {
        // find a slot
        let slot = null;
        for (const e of embers) if (!e.live) { slot = e; break; }
        if (!slot) continue; // pool full: the cap IS the mercy
        const speed = EMBER.SPEED_BASE + EMBER.SPEED_PER_MPH * wind.mphEffective;
        const lat = (streams.ember() * 2 - 1) * EMBER.LATERAL * speed;
        const fr = crowning ? EMBER.CROWN_FLIGHT_S : EMBER.FLIGHT_S;
        const flightT = fr[0] + streams.ember() * (fr[1] - fr[0]);
        // perpendicular for lateral jitter
        const px = -wind.ty, py = wind.tx;
        slot.live = true;
        slot.x = i % GRID; slot.y = (i / GRID) | 0;
        slot.vx = wind.tx * speed + px * lat; slot.vy = wind.ty * speed + py * lat;
        slot.ticksLeft = Math.max(1, Math.round(flightT / DT));
        slot.prov = provenance[i]; slot.crown = crowning;
        emit('emberCast', { from: i, crown: crowning });
      }
    }
  }
  function flyEmbers() {
    for (let k = 0; k < embers.length; k++) {
      const e = embers[k];
      if (!e.live) continue;
      e.x += e.vx * DT; e.y += e.vy * DT;
      if (e.x < 0 || e.y < 0 || e.x >= GRID || e.y >= GRID) { e.live = false; continue; }
      if (--e.ticksLeft > 0) continue;
      e.live = false;
      const L = ((e.y | 0) * GRID + (e.x | 0));
      const fL = fuel[L];
      // fizzle: rock/water/soil/scar(0–1)/line — embers fly OVER lines but never ignite them
      if (fL === FUEL.ROCK || fL === FUEL.WATER || fL === FUEL.SOIL ||
          (fL === FUEL.SCAR && regrow[L] < 2) || (flags[L] & FLAG.LINE)) {
        emit('emberFizzle', { cell: L, water: fL === FUEL.WATER });
        continue;
      }
      if (!F_BURNABLE[fL] || state[L] !== S.UNBURNED && state[L] !== S.HEATING) continue;
      let p = F_EMBERCATCH[fL] * Math.max(0, 1 - moisture[L] / F_MOISTEXT[fL]);
      if (retard[L] > 0.05) p *= EMBER.RETARDANT_CATCH_MUL;
      if (fL === FUEL.STRUCTURE) {
        const stx = structForCell(L);
        if (stx && stx.ringed) p *= 0.2; // defensible space cuts ember ignition, not just flux
      }
      if (streams.ember() < p) {
        flags[L] |= FLAG.EMBER_GLOW;
        stateTimer[L] = EMBER.SMOLDER_TICKS; // 3.0 s ground telegraph — the player's contract
        embGlowProv.set(L, e.prov);
        activate(L); markDirty(L);
        emit('emberCatch', { cell: L, crown: e.crown }); // ONE chime = ONE truth
      }
    }
  }

  // ---- amortized row sweep (moisture drift, retardant decay) ----
  function rowSweep() {
    const y = tick % GRID;
    const dry = MOIST.AMBIENT_DRY_PER_S * D * GRID * DT;   // per full-map pass equivalence
    const wet = MOIST.WEATHER_END_WET_PER_S * GRID * DT;
    for (let x = 0; x < GRID; x++) {
      const i = y * GRID + x;
      if (retard[i] > 0) retard[i] = Math.max(0, retard[i] - RETARDANT.DECAY_PER_S * GRID * DT);
      if (!F_BURNABLE[fuel[i]]) continue;
      if (weatherEndOn) moisture[i] = Math.min(0.95, moisture[i] + wet);
      else {
        // G-2: the basin floor is a FLOOR — north aspects hold june rain against the whole
        // afternoon, or Fire Three detonates the twist a month early (season-run measured)
        const fl = (basinFloorOn && (zoneId[i] === 2 || zoneId[i] === 3)) ? MOIST.BASIN_FLOOR : 0.02;
        moisture[i] = Math.max(fl, moisture[i] - dry);
      }
    }
  }

  // ---- structures FSM (every 15 ticks) ----
  function structForCell(c) {
    for (const st of structures) if (st.cells.includes(c)) return st;
    return null;
  }
  function structuresTick() {
    if (tick % 15 !== 0) return;
    for (const st of structures) {
      if (st.state === 'LOST') continue;
      // ring check (cheap): perimeter at radius 3 protected ≥ 90%
      let prot = 0, tot = 0;
      const R = STRUCT.RING_RADIUS;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== R) continue;
        const X = Math.round(st.cx + dx), Y = Math.round(st.cy + dy);
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
        tot++;
        const j = Y * GRID + X, fj = fuel[j];
        if (fj === FUEL.SOIL || fj === FUEL.ROCK || fj === FUEL.WATER || fj === FUEL.SCAR ||
            (flags[j] & FLAG.LINE) || retard[j] > 0.05 ||
            (F_BURNABLE[fj] && moisture[j] >= F_MOISTEXT[fj])) prot++; // green ground IS a ring
      }
      st.ringed = tot > 0 && prot / tot >= STRUCT.RING_COVERAGE;
      // threat scan
      let burningNear = false, burningFar = false;
      const RR = STRUCT.HOLD_RADIUS;
      for (let dy = -RR; dy <= RR && !burningFar; dy++) for (let dx = -RR; dx <= RR; dx++) {
        const X = Math.round(st.cx + dx), Y = Math.round(st.cy + dy);
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
        const j = Y * GRID + X;
        if (state[j] === S.BURNING || state[j] === S.EMBERCAST) {
          const dist = Math.hypot(dx, dy);
          if (dist <= STRUCT.THREAT_RADIUS) burningNear = true;
          if (dist <= RR) burningFar = true;
          if (burningNear) break;
        }
      }
      st.scarCells = st.cells.reduce((n, c) => n + (state[c] === S.SCAR ? 1 : 0), 0);
      const burningSelf = st.cells.some(c => state[c] === S.BURNING || state[c] === S.EMBERCAST);
      if (st.scarCells >= st.cells.length * STRUCT.LOST_FRACTION && !st.indestructible) {
        st.state = 'LOST'; emit('structureLost', { key: st.key, name: st.name });
      } else if (burningSelf && st.state !== 'IGNITED') {
        st.state = 'IGNITED'; emit('structureIgnited', { key: st.key, name: st.name });
        if (st.propane) emit('propanePop', { key: st.key });
      } else if (burningNear && st.state === 'SAFE') {
        st.state = 'THREATENED'; emit('structureThreatened', { key: st.key, name: st.name });
      } else if (!burningFar && (st.state === 'THREATENED' || st.state === 'IGNITED') && !burningSelf) {
        st.state = 'HELD'; emit('structureHeld', { key: st.key, name: st.name });
      }
    }
  }

  // ---- backburn starve/frontage bookkeeping (every 10 ticks) ----
  function backburnTick() {
    if (tick % 10 !== 0) return;
    backburnFrontage.clear();
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      if (!provenance[i]) continue;
      if (state[i] !== S.BURNING && state[i] !== S.EMBERCAST) continue;
      // front cell = has an unburned flammable downwind neighbor
      const x = i % GRID, y = (i / GRID) | 0;
      let isFront = false;
      for (const n of N8) {
        const d = wind.tx * n.ux + wind.ty * n.uy;
        if (d <= 0.3) continue;
        const j = i + n.off;
        if (j < 0 || j >= CELLS) continue;
        if (state[j] === S.UNBURNED && F_BURNABLE[fuel[j]]) { isFront = true; break; }
      }
      if (isFront) backburnFrontage.set(provenance[i], (backburnFrontage.get(provenance[i]) || 0) + 1);
    }
    // starve: enough adjacent burnouts AND no live front
    for (const [id, score] of backburnStarveScore) {
      if (score >= BACKBURN.STARVE_ADJ_COUNT && !(backburnFrontage.get(id) > 0)) {
        backburnStarveScore.delete(id);
        emit('backburnStarved', { id, acresDenied: Math.round(score * 0.22 * 10) });
      }
    }
  }

  // ---- active list compaction ----
  function compact() {
    if (tick % 8 !== 0) return;
    let w = 0;
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const keep = state[i] === S.HEATING || state[i] === S.BURNING || state[i] === S.EMBERCAST ||
                   (flags[i] & FLAG.EMBER_GLOW);
      if (keep) active[w++] = i; else isActive[i] = 0;
    }
    activeCount = w;
    // ascending order for deterministic iteration
    const view = active.subarray(0, activeCount);
    view.sort();
  }

  // ---- the tick (canonical pipeline order — never reordered) ----
  function simTick() {
    tick++;
    windUpdate();
    flyEmbers();
    emission();
    integrate();
    timers();
    castEmbers();
    rowSweep();
    structuresTick();
    backburnTick();
    compact();
  }

  // ---- player/harness surface ----
  function cutLineCell(x, y) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return false;
    const i = y * GRID + x;
    if (state[i] === S.BURNING || state[i] === S.EMBERCAST || state[i] === S.HEATING) return false;
    if (fuel[i] === FUEL.WATER || fuel[i] === FUEL.ROCK || fuel[i] === FUEL.STRUCTURE) return false;
    if (flags[i] & FLAG.LINE) return true; // retrace
    if (F_BURNABLE[fuel[i]]) zFlammable[zoneId[i]] = Math.max(0, zFlammable[zoneId[i]] - 1);
    flags[i] |= FLAG.LINE;
    fuel[i] = FUEL.SOIL;
    load[i] = 0;
    markDirty(i);
    return true;
  }
  function dripCell(x, y, id) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    if (!F_BURNABLE[fuel[i]] || state[i] !== S.UNBURNED) return;
    fuses.push({ cell: i, at: tick + BACKBURN.FUSE_TICKS, id });
    emit('drip', { cell: i });
  }
  function stompAt(px, py) {
    // find burning/glow cluster ≤4 cells with centroid within range
    let best = null;
    for (let a = 0; a < activeCount; a++) {
      const i = active[a];
      const isSpot = (state[i] === S.BURNING || state[i] === S.EMBERCAST || (flags[i] & FLAG.EMBER_GLOW));
      if (!isSpot) continue;
      const x = i % GRID, y = (i / GRID) | 0;
      if (Math.hypot(x + 0.5 - px, y + 0.5 - py) > STOMP.RANGE + 1.0) continue;
      // flood the cluster (cap 6)
      const seen = new Set([i]); const q = [i];
      while (q.length && seen.size <= STOMP.MAX_CELLS + 1) {
        const c = q.pop();
        for (const n of N8) {
          const j = c + n.off;
          if (j < 0 || j >= CELLS || seen.has(j)) continue;
          if (state[j] === S.BURNING || state[j] === S.EMBERCAST || (flags[j] & FLAG.EMBER_GLOW)) { seen.add(j); q.push(j); }
        }
      }
      if (seen.size <= STOMP.MAX_CELLS) {
        let cx = 0, cy = 0;
        for (const c of seen) { cx += (c % GRID) + 0.5; cy += ((c / GRID) | 0) + 0.5; }
        cx /= seen.size; cy /= seen.size;
        if (Math.hypot(cx - px, cy - py) <= STOMP.RANGE) { best = seen; break; }
      }
    }
    if (!best) return 0;
    for (const c of best) {
      if (spotId[c]) { const sp = spots[spotId[c] - 1]; if (sp) sp.active = Math.max(0, sp.active - 1); }
      if (state[c] === S.BURNING || state[c] === S.EMBERCAST) zBurning[zoneId[c]] = Math.max(0, zBurning[zoneId[c]] - 1);
      state[c] = S.UNBURNED; heat[c] = 0; stateTimer[c] = 0;
      flags[c] &= ~(FLAG.EMBER_GLOW | FLAG.CROWNING | FLAG.BACKBURN);
      embGlowProv.delete(c);
      markDirty(c);
    }
    emit('stomp', { cells: best.size });
    return best.size;
  }
  function dropRetardant(x0, y0, x1, y1) {
    const cells = [];
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.ceil(len * 2);
    const half = (RETARDANT.WIDTH - 1) / 2;
    const px = -(y1 - y0) / (len || 1), py = (x1 - x0) / (len || 1);
    const seen = new Set();
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      for (let w = -half; w <= half; w += 0.5) {
        const X = Math.round(x0 + (x1 - x0) * t + px * w), Y = Math.round(y0 + (y1 - y0) * t + py * w);
        if (X < 0 || Y < 0 || X >= GRID || Y >= GRID) continue;
        const i = Y * GRID + X;
        if (seen.has(i)) continue;
        seen.add(i);
        retard[i] = 1.0; flags[i] |= FLAG.RETARDANT;
        moisture[i] = Math.min(0.95, moisture[i] + RETARDANT.MOISTURE_ADD);
        cells.push(i); markDirty(i);
      }
    }
    emit('retardantDrop', { cells: cells.length });
    return cells;
  }
  function igniteAt(x, y) {
    if (x < 0 || y < 0 || x >= GRID || y >= GRID) return;
    const i = y * GRID + x;
    heat[i] = 1.0;
    ignite(i, 0, false, 0, true);
  }

  function zoneStats(z) {
    return { burning: zBurning[z], scar: zScar[z], unburnedFlammable: zFlammable[z] };
  }

  // spots caught bookkeeping (polled by ledger layer)
  function spotSummary() {
    let total = 0, caught = 0;
    for (const sp of spots) {
      total++;
      if (sp.active === 0 && sp.burned <= 12) caught++;
    }
    return { total, caught };
  }

  function hash() {
    const q8 = new Uint8Array(CELLS);
    for (let i = 0; i < CELLS; i++) q8[i] = Math.min(255, Math.round(heat[i] * 200));
    const ql = new Uint8Array(CELLS);
    for (let i = 0; i < CELLS; i++) ql[i] = Math.min(255, Math.round(load[i] * 80));
    const em = new Float32Array(embers.length * 4);
    embers.forEach((e, k) => { em[k * 4] = e.live ? 1 : 0; em[k * 4 + 1] = e.x; em[k * 4 + 2] = e.y; em[k * 4 + 3] = e.ticksLeft; });
    const tickArr = new Uint32Array([tick]);
    return fnv1a([state, fuel, flags, q8, ql, provenance, em, tickArr]);
  }

  return {
    // arrays (render/audio/harness views)
    fuel, baseFuel, load, moisture, heat, state, stateTimer, flags, retard, regrow,
    burnSeverity, provenance, spotId, elev, zoneId, featureId, structures, embers,
    dirty, wind, spots,
    // control
    initFire, simTick, igniteAt, cutLineCell, dripCell, stompAt, dropRetardant,
    setSchedule: (s) => { schedule = s; },
    windSet: (deg, mph) => { windPinned = deg == null ? null : { deg, mph }; },
    setWeatherEnd: (on) => { weatherEndOn = on; },
    setBasinFloor: (on) => { basinFloorOn = on; },
    setEmbers: (on) => { embersEnabled = on; },
    newBackburnId: () => backburnNextId++,
    backburnFrontage, backburnEscaped, zonesCeded,
    zoneStats, spotSummary, newSpot,
    onEvent: (fn) => listeners.push(fn),
    setRecordEvents: (on) => { recordEvents = on; },
    eventLog,
    hash,
    get tick() { return tick; },
    get D() { return D; },
    get activeCount() { return activeCount; },
  };
}
