// CURFEW — Avery House adapter.
//
// The house compiler stays in manor.js so its wall slicing, doorway cutting, stair,
// collider, streaming and merged-render contracts remain the ones already proven by
// Blackthorn. Avery supplies a separate frozen room plan and an explicitly different
// exterior identity; none of UNINVITED's controller, NPC, story, renderer or vendor stack
// crosses into CURFEW.

import * as AVERY_PLAN from './avery-data.js';
import { claimLocal as planClaimLocal, makeManorBuilder } from './manor.js';

// Keep the copied donor tables untouched. This adapter is where CURFEW gives the house its
// abandoned life: recognisable room contents, a handful of powered windows, and one boiler-
// room door whose leaf belongs to the persistent refuge system instead of static geometry.
const FURN_BY_ROOM = Object.freeze({
  living: 'drawing', foyer: 'foyer', dining: 'dining', kitchen: 'kitchen', hallG: 'corridor',
  study: 'study', family: 'smoking', backhall: 'passage', laundry: 'scullery',
  sunroom: 'conserv', garage: 'undercroft', pantry: 'larder', playroom: 'nursery',
  bootroom: 'passage', galleryW: 'corridor', galleryS: 'corridor', galleryE: 'corridor',
  uphall: 'corridor', longhall: 'corridor', master: 'master', boy: 'nursery',
  bath: 'dressing', studyUp: 'study', girl: 'nursery', guest: 'bedroom', parents: 'bedroom',
  cellarLanding: 'passage', cellar: 'undercroft', boiler: 'boiler',
});

const DOORS = Object.freeze(AVERY_PLAN.DOORS.map((row) => {
  if (row[0] !== 'basement' || row[1] !== 13 || row[2] !== 14 || row[3] !== 'N') return row;
  return Object.freeze([row[0], row[1], row[2], row[3], Object.freeze({ ...row[4], dynamic: 'refuge' })]);
}));

const AVERY_CURFEW_PLAN = Object.freeze({
  ...AVERY_PLAN,
  DOORS,
  FURN_BY_ROOM,
  LIT_WINDOWS: Object.freeze([
    'ground|H|7|20', 'ground|H|21|20',
    'first|H|7|20', 'first|H|13|20', 'first|H|21|20',
  ]),
});

export function claimLocal() {
  return planClaimLocal(AVERY_CURFEW_PLAN);
}

export function makeAveryHouseBuilder(tools) {
  return makeManorBuilder(tools, AVERY_CURFEW_PLAN);
}

export default makeAveryHouseBuilder;
