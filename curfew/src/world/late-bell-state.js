// Persisted finale rules. World rendering and sound live in late-bell.js.
import { BOSSES } from './boss-catalog.js';
import { CFG } from '../config.js';

export const LAST_NIGHT_S = CFG.clock.duskS + CFG.clock.deepNightS + CFG.clock.blackHourS + CFG.clock.falseDawnS;
export const DAWN_START_S = LAST_NIGHT_S - CFG.clock.falseDawnS;
export const REQUIRED_MORNING = Object.freeze(BOSSES.map(b => b.skin.id));

export function carriesMorning(finishes) {
  const owned = new Set(Array.isArray(finishes) ? finishes : []);
  return REQUIRED_MORNING.every(id => owned.has(id));
}

export function canRingLateBell({ finishes, phase, carDistance, carVisible, started }) {
  return !started && phase === 'black' && carriesMorning(finishes)
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
