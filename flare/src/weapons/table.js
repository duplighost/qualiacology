// THE FOUR GUNS — and the runtime state that rides beside them.
//
// CONTRACT §5: the table IS `FEEL.weapons`. It is re-exported here, never
// re-declared, because a second copy of the roster is a second balance patch that
// nobody will remember to apply. Everything below is either a view onto that
// frozen array or the MUTABLE per-weapon state, which lives in a PARALLEL array
// indexed identically. One index, two arrays: the spec on the left, the magazine
// on the right, and no possibility of them describing different guns.
//
// The board these numbers produce (docs/FEEL.md, verified):
//   burst dps   REPEATER 168 > SIDEARM 149 > LANCE 116 > BREACHER 90
//   ttk 70 hp   BREACHER 0 (contact) < REPEATER .333 < LANCE .364 < SIDEARM .375
//   range       LANCE 120 > SIDEARM 80 > REPEATER 55 > BREACHER 16
//   light       BREACHER 7.5 > LANCE 3.4 > SIDEARM 2.6 > REPEATER 1.5
// Every gun wins exactly one column. The draft's LANCE won all five.
//
// INVARIANT, fenced by tests/weapons.mjs: for every AUTOMATIC weapon,
// 60/rpm > FEEL.enemies.staggerTime. 780 rpm gave 0.0769 s against a 0.08 s
// stagger and reproduced APEX's permanent-stagger exploit verbatim; 720 gives
// 0.0833 s and clears it.

import FEEL from '../feel.js';
import { clamp01 } from '../core/math.js';

/**
 * The ONE frozen table this module owns (C2-F7's per-module rule). It holds only
 * what FEEL does not: the shape of the runtime record and the reload phases.
 * Anything that is balance lives in FEEL.weapons and is read from there.
 */
export const TABLE = Object.freeze({
  // Reload is three beats, not one bar: the magazine leaves, the magazine seats
  // (THIS is where ammo is credited — crediting at the start lets a cancelled
  // reload duplicate rounds), and the weapon returns to the ready pose. The
  // fractions are of the weapon's own `reload` time so a 2.10 s BREACHER and a
  // 1.15 s SIDEARM share a rhythm rather than a duration.
  reloadDrop: 0.34,
  reloadSeat: 0.72,          // ammo is credited when the phase clock crosses this
  emptyReloadScale: 1.28,    // running dry costs the bolt-release beat
  reserveNotchMax: 3,        // 0 = dark chamber. Four states, per FEEL.fire.reserveNotches
  slots: 2,                  // C1-F12: two CARRIED, four available, swapped at the landing
});

/** The roster. Not a copy — the frozen array from the tuning block. */
export const WEAPONS = FEEL.weapons;
export const WEAPON_COUNT = WEAPONS.length;

const BY_ID = new Map();
for (let i = 0; i < WEAPON_COUNT; i++) BY_ID.set(WEAPONS[i].id, i);

/** Index of a weapon by its id, or -1. */
export const indexOf = id => (BY_ID.has(id) ? BY_ID.get(id) : -1);

/**
 * Seconds between shots. FIX 3 lives at the call site, not here: this interval is
 * ACCUMULATED into the cooling clock (`cooling += shotInterval`), never assigned.
 * Assigning it quantises cadence to the substep and a 320 rpm pistol fires at 300.
 */
export const shotInterval = i => 60 / WEAPONS[i].rpm;

/** Automatic weapons only, for the stagger invariant. */
export function autoIndices(out = []) {
  out.length = 0;
  for (let i = 0; i < WEAPON_COUNT; i++) if (WEAPONS[i].auto) out.push(i);
  return out;
}

/**
 * One runtime record per weapon, allocated ONCE. Nothing in the hot path ever
 * makes another one; `reset()` rewrites these in place.
 */
function makeState(i) {
  const w = WEAPONS[i];
  return {
    index: i,
    id: w.id,
    mag: w.mag,
    reserve: w.reserve,
    cooling: 0,           // seconds until the next shot may leave. ACCUMULATED.
    reloading: false,
    reloadLeft: 0,
    reloadTotal: 0,
    reloadCredited: false,
    reloadWasEmpty: false,
    dryLock: 0,           // FEEL.fire.dryLockout after a dry trigger pull
    sinceShot: 1e3,       // seconds since this weapon last fired
    shots: 0,             // total shots — indexes the yaw recoil pattern
    burst: 0,             // shots in the current trigger pull; resets the pattern
    bloom: 0,             // spread bloom, radians, on top of the base cone
    pressBuffer: 0,       // FEEL.fire.buffer, latched on the press EDGE
    pressConsumed: true,  // semi-auto: one shot per press, never per frame
    stowed: true,
  };
}

/** The parallel array. Same index as WEAPONS, always. */
export function createWeaponStates() {
  const states = new Array(WEAPON_COUNT);
  for (let i = 0; i < WEAPON_COUNT; i++) states[i] = makeState(i);
  return states;
}

/** Rewrite every record in place. Never re-allocates; the pool identity holds. */
export function resetStates(states) {
  for (let i = 0; i < WEAPON_COUNT; i++) {
    const s = states[i], w = WEAPONS[i];
    s.mag = w.mag; s.reserve = w.reserve;
    s.cooling = 0; s.reloading = false; s.reloadLeft = 0; s.reloadTotal = 0;
    s.reloadCredited = false; s.reloadWasEmpty = false;
    s.dryLock = 0; s.sinceShot = 1e3; s.shots = 0; s.burst = 0; s.bloom = 0;
    s.pressBuffer = 0; s.pressConsumed = true; s.stowed = true;
  }
  return states;
}

/** Cancel a reload, leaving ammo exactly where it was. */
export function cancelReload(s) {
  s.reloading = false;
  s.reloadLeft = 0;
  s.reloadTotal = 0;
  s.reloadCredited = false;
  s.reloadWasEmpty = false;
}

/**
 * FIX 5, and it is the one that reads backwards until you have shipped it:
 * SELECTING A WEAPON CLEARS THE RELOAD OF THE WEAPON BEING STOWED, NOT THE ONE
 * BEING DRAWN.
 *
 * The source game cleared the incoming weapon. Two consequences, both of which
 * present as "the reload sometimes doesn't happen": a weapon stowed mid-reload
 * kept a live timer and completed in your pocket, and a weapon drawn onto a
 * queued reload had that reload wiped on the frame it was requested. Clearing the
 * OUTGOING one is the only version where "swap-cancel a reload" behaves the way
 * every player already expects it to.
 *
 * Returns the index actually held.
 */
export function selectWeapon(states, current, next) {
  if (next < 0 || next >= WEAPON_COUNT) return current;
  if (next === current) return current;
  const out = states[current];
  if (out) {
    cancelReload(out);          // the STOWED one. Not the drawn one.
    out.cooling = 0;
    out.pressBuffer = 0;
    out.pressConsumed = true;
    out.burst = 0;
    out.bloom = 0;
    out.stowed = true;
  }
  const inc = states[next];
  inc.stowed = false;
  inc.pressConsumed = true;     // the swap key is not a trigger pull
  return next;
}

/** 0..1 magazine fullness — the flash intensity AND radius readout (C1-F8). */
export const magFraction = s => clamp01(s.mag / WEAPONS[s.index].mag);

/**
 * The reserve readout, C3-F12: four DISCRETE states so a 32-round REPEATER's
 * 3%-per-shot continuous signal becomes something countable. 0 is a dark chamber
 * and means exactly one thing — there is nothing left to load.
 */
export function reserveNotch(s) {
  const max = WEAPONS[s.index].reserve;
  if (s.reserve <= 0 || max <= 0) return 0;
  const f = clamp01(s.reserve / max);
  const n = TABLE.reserveNotchMax;
  return Math.min(n, 1 + Math.floor(f * n * (1 - 1e-9)));
}

/** How many rounds a completed reload would move. */
export function reloadAmount(s) {
  const w = WEAPONS[s.index];
  return Math.max(0, Math.min(w.mag - s.mag, s.reserve));
}

/** Reload duration, longer from empty — the bolt-release beat is the cost of running dry. */
export function reloadTime(s) {
  const w = WEAPONS[s.index];
  return s.mag <= 0 ? w.reload * TABLE.emptyReloadScale : w.reload;
}

/** 0..1 through the reload, for the viewmodel's phase animation. */
export function reloadPhase(s) {
  if (!s.reloading || s.reloadTotal <= 0) return 0;
  return clamp01(1 - s.reloadLeft / s.reloadTotal);
}

export default WEAPONS;
