// Persisted finale rules. World rendering and sound live in late-bell.js.
import { BOSSES } from './boss-catalog.js';
import { CFG } from '../config.js';

export const LAST_NIGHT_S = CFG.clock.duskS + CFG.clock.deepNightS + CFG.clock.blackHourS + CFG.clock.falseDawnS;
export const DAWN_START_S = LAST_NIGHT_S - CFG.clock.falseDawnS;
// THE ELEVEN REWIRE. The ending used to key on owning eleven WEAPON FINISHES, which was the
// same list by accident: a finish came from a boss, so having them all meant having killed
// them all. Finishes are in sealed cases now and a case is not a kill, so the requirement is
// what it always meant — the ELEVEN, each one dead, each one a part on the car.
export const REQUIRED_MORNING = Object.freeze(BOSSES.map(b => b.id));

export function carriesMorning(cleared) {
  const done = new Set(Array.isArray(cleared) ? cleared : []);
  return REQUIRED_MORNING.every(id => done.has(id));
}

export function canRingLateBell({ cleared, phase, carDistance, carVisible, started }) {
  return !started && phase === 'black' && carriesMorning(cleared)
    && Number.isFinite(carDistance) && carDistance <= 110 && carVisible === true;
}

export function readLastNight(value) {
  if (!value || typeof value !== 'object' || value.rang !== true) return null;
  const elapsed = Math.max(0, Math.min(LAST_NIGHT_S, Number(value.elapsed) || 0));
  return { rang: true, elapsed, complete: value.complete === true };
}

export function trueDawnAt(elapsed) {
  return Math.max(0, Math.min(1, (elapsed - DAWN_START_S) / CFG.clock.falseDawnS));
}
