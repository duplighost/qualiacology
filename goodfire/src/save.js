// GOODFIRE save.js — season persistence (canon-final §11). One key, RLE+base64 typed
// arrays. Load is RECOMPUTED from burn history, never stored — ledger audits re-derive
// exactly. In-season replay = rewind (snapshot restore); the mountain never holds two
// contradictory histories.

import { GRID, CELLS, FUEL, F_ACCRUAL, F_LOADMAX, F_BURNABLE, S, FLAG } from './canon.js';
import { WORLD_SEED } from './rng.js';

const KEY = 'goodfire.v1';

// ---- RLE + base64 codecs ----
function rle(u8) {
  const out = [];
  let i = 0;
  while (i < u8.length) {
    const v = u8[i];
    let n = 1;
    while (i + n < u8.length && u8[i + n] === v && n < 255) n++;
    out.push(n, v);
    i += n;
  }
  return new Uint8Array(out);
}
function unrle(u8, len) {
  const out = new Uint8Array(len);
  let o = 0;
  for (let i = 0; i < u8.length; i += 2) {
    out.fill(u8[i + 1], o, o + u8[i]);
    o += u8[i];
  }
  return out;
}
function b64(u8) {
  let s = '';
  for (let i = 0; i < u8.length; i += 0x8000)
    s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return btoa(s);
}
function unb64(s) {
  const bin = atob(s);
  const u8 = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return u8;
}
const pack = (u8) => b64(rle(u8));
const unpack = (s, len) => unrle(unb64(s), len);

// bitset helpers (planted / lineCells)
function packBits(bitU8) { return pack(bitU8); }
export function bitGet(bits, i) { return (bits[i >> 3] >> (i & 7)) & 1; }
export function bitSet(bits, i) { bits[i >> 3] |= 1 << (i & 7); }

export function freshSave() {
  return {
    version: 1, worldSeed: WORLD_SEED,
    nextFire: 0,                 // index into season slots 0..6; 7 = season closed
    pendingInterlude: false,
    seasonClosed: false,
    epilogueSeen: false,
    rxDone: [],                  // unit ids burned
    rxUsed: { five: 0, six: 0 }, // windows consumed per gap
    structuresLost: [],
    towerScorched: false,
    burnFire: new Uint8Array(CELLS),      // 0 never; else fire ordinal 1..7, rx = 8+idx
    burnSeverity: new Uint8Array(CELLS),  // 1 surface, 2 crown
    planted: new Uint8Array(CELLS >> 3),
    lineCells: new Uint8Array(CELLS >> 3),
    fires: Array.from({ length: 7 }, () => ({ status: 'todo', bestMedal: null, lastLedger: null, snapshot: null })),
    settings: { master: 0.8, flatCells: false, colorblind: false },
  };
}

export function saveGame(sv) {
  const doc = { ...sv,
    burnFire: pack(sv.burnFire), burnSeverity: pack(sv.burnSeverity),
    planted: packBits(sv.planted), lineCells: packBits(sv.lineCells),
  };
  try { localStorage.setItem(KEY, JSON.stringify(doc)); } catch (e) { /* quota: play on */ }
}

export function loadGame() {
  let raw;
  try { raw = localStorage.getItem(KEY); } catch (e) { return null; }
  if (!raw) return null;
  try {
    const doc = JSON.parse(raw);
    if (doc.version !== 1 || doc.worldSeed !== WORLD_SEED) return null;
    doc.burnFire = unpack(doc.burnFire, CELLS);
    doc.burnSeverity = unpack(doc.burnSeverity, CELLS);
    doc.planted = unpack(doc.planted, CELLS >> 3);
    doc.lineCells = unpack(doc.lineCells, CELLS >> 3);
    return doc;
  } catch (e) { return null; }
}

export function clearSave() { try { localStorage.removeItem(KEY); } catch (e) {} }

// snapshot for rewind-replay (state as of the MORNING of a fire)
export function takeSnapshot(sv) {
  return {
    burnFire: pack(sv.burnFire), burnSeverity: pack(sv.burnSeverity),
    planted: packBits(sv.planted), lineCells: packBits(sv.lineCells),
    structuresLost: [...sv.structuresLost], towerScorched: sv.towerScorched,
    rxDone: [...sv.rxDone], rxUsed: { ...sv.rxUsed },
  };
}
export function restoreSnapshot(sv, snap) {
  sv.burnFire = unpack(snap.burnFire, CELLS);
  sv.burnSeverity = unpack(snap.burnSeverity, CELLS);
  sv.planted = unpack(snap.planted, CELLS >> 3);
  sv.lineCells = unpack(snap.lineCells, CELLS >> 3);
  sv.structuresLost = [...snap.structuresLost];
  sv.towerScorched = snap.towerScorched;
  sv.rxDone = [...snap.rxDone];
  sv.rxUsed = { ...snap.rxUsed };
}

// ---- regrowth model (canon-final: 4 stages) ----
// fireweed at +1 completed fire (or instantly when planted); shrub at +3 (+2 planted);
// thicket = planted cells at season close. Shrub+ scar re-enters the fuel bed as thin
// grass (load 0.4): "fire becomes SURVIVABLE, not impossible" — and it can never crown.
export function regrowStage(sv, i, completedCount) {
  const bf = sv.burnFire[i];
  if (!bf) return 0;
  const intervals = Math.max(0, completedCount - bf);
  const p = bitGet(sv.planted, i);
  if (sv.seasonClosed && p) return 3;
  if (intervals >= (p ? 2 : 3)) return 2;
  if (intervals >= 1 || p) return 1;
  return 0;
}

// ---- apply season history onto a fresh sim (called before each fire/scene) ----
export function applySeason(sim, mapData, sv) {
  const completed = countCompleted(sv);
  for (let i = 0; i < CELLS; i++) {
    // restore authored fuel first (sim was created from mapData, already authored)
    const bf = sv.burnFire[i];
    if (bf) {
      const stage = regrowStage(sv, i, completed);
      sim.regrow[i] = stage;
      if (stage >= 2) {
        // green scar: thin grass, burnable, crownproof (grass is excluded from drag)
        sim.fuel[i] = FUEL.GRASS;
        sim.load[i] = 0.4;
        sim.state[i] = S.UNBURNED;
        sim.burnSeverity[i] = 0;
      } else {
        sim.fuel[i] = FUEL.SCAR;
        sim.state[i] = S.SCAR;
        sim.load[i] = 0;
        sim.burnSeverity[i] = sv.burnSeverity[i];
      }
    } else {
      // unburned: accrue the season's debt — burned = spent = safe; unburned = owed
      const f = sim.fuel[i];
      if (F_BURNABLE[f] && F_ACCRUAL[f] > 0)
        sim.load[i] = Math.min(F_LOADMAX[f], mapData.load0[i] + F_ACCRUAL[f] * completed);
    }
    if (bitGet(sv.lineCells, i)) {
      sim.flags[i] |= FLAG.LINE;
      if (sim.fuel[i] !== FUEL.SCAR) { sim.fuel[i] = FUEL.SOIL; sim.load[i] = 0; }
    }
  }
  // structures lost in past fires stay lost (char footprints all season)
  for (const st of sim.structures) {
    if (sv.structuresLost.includes(st.key)) {
      st.state = 'LOST';
      for (const c of st.cells) { sim.fuel[c] = FUEL.SCAR; sim.state[c] = S.SCAR; sim.regrow[c] = 0; }
    }
  }
}

export function countCompleted(sv) {
  return sv.fires.filter(f => f.status === 'done').length;
}

// ---- harvest a finished fire back into the save ----
export function harvestFire(sim, sv, ordinal /*1..7*/, completedBefore) {
  for (let i = 0; i < CELLS; i++) {
    if (sim.state[i] === S.SCAR && sv.burnFire[i] === 0) {
      sv.burnFire[i] = ordinal;
      sv.burnSeverity[i] = sim.burnSeverity[i] || 1;
    } else if (sim.state[i] === S.SCAR && sv.burnFire[i] > 0 && sim.regrow[i] === 0 &&
               regrowStage(sv, i, completedBefore) >= 2) {
      // the save says this cell should be green regrowth, the sim shows fresh black:
      // green scar re-burned this fire — record the newer burn
      sv.burnFire[i] = ordinal;
      sv.burnSeverity[i] = sim.burnSeverity[i] || 1;
    }
    if (sim.flags[i] & FLAG.LINE) bitSet(sv.lineCells, i);
  }
  for (const st of sim.structures)
    if (st.state === 'LOST' && !sv.structuresLost.includes(st.key)) sv.structuresLost.push(st.key);
}
