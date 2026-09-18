// CURFEW — where the spiders are. ROUND 18, re-tabled C8 (2026-09-18).
//
// ALEX, 2026-09-09: "Another new enemy inside a destination if it's big and looks old should
// be a giant spider that crawls on ceiling and drops off." And 2026-09-18: "often they hover
// on nothing. And then fall but nevevr really atack. they end up hovering again. we should
// just find an easier way to do that."
//
// So a spider is a FLOOR CRAWLER now (species.js `nest`): it waits in a corner of a big old
// room, on that room's floor, and comes at you like a hound when it notices you. One per site,
// spawned STAGED through the ordinary cast machinery and placed once per save; a killed one
// stays dead. It is never a counted defender and never marked (places.js records the nest
// under its own key).
//
// COORDINATES ARE SITE-LOCAL, in the pad frame every other authored thing at a destination
// uses (places.js _recordCast converts them). `ly` is NOT a floor height: it is a point inside
// the room at chest height over the pad, and enemies.js measures the floor straight down from
// it (one ray), so a plank floor or a step is stood on and never floated over.
//
// EVERY ROW WAS MEASURED (scratchpad r3/enemies/nestscan.mjs, node only, against the real site
// builders, the dress chain and siteExtras with a real Collision): the floor is within 0.15 m of
// the pad; the body (r 0.56 + 0.12, h 0.92) fits there with room to move (6+ of 8 points on a
// 1.4 m ring fit); and it is outside every interior-horror resident's zone plus 1 m, so no room
// holds two horrors. The old seven rows were copied from INTERIOR_ENCOUNTERS, stacked on those
// residents, and two of them were 12-19 m up; the Cathedral and the bell tower have no room
// that passes, so they have no spider. Blackthorn's is in the Boiler Room, not the Cellar (the
// Cellar has its own scare) and not the Old Tunnel (the blackthorn-cellar resident's zone).
// The Weeping Mine has none: its whole building is the Kneeler's ground, and when the Kneeler
// stirs every hostile body inside 78 m is released for the fight (measured: a nest spider under
// the winding-house deck was gone the moment the boss woke). Re-run the scan after anyone moves
// a wall, a deck or a stair in these four rooms.

export const SPIDER_NESTS = Object.freeze({
  // the Boiler Room, off the Cellar: floor +0.00, ceiling 2.50, ring 7/8
  'blackthorn-manor': [{ lx: 7.0, lz: -11.0, ly: 1.2, yaw: 0 }],
  // Avery's boiler room, 2.7 m from the board: floor +0.00, ceiling 2.50, ring 6/8
  'avery-house': [{ lx: -1.0, lz: 6.0, ly: 1.2, yaw: 0 }],
  // under the loft platform, on the plank floor: floor +0.08, loft 3.34, ring 6/8
  'hollow-mill': [{ lx: 16.0, lz: -12.0, ly: 1.2, yaw: 0 }],
  // under the hayloft: floor +0.00, loft 3.14, ring 7/8
  jackfield: [{ lx: 6.5, lz: 0.5, ly: 1.2, yaw: 0 }],
});

/** The cast entries for one site, in the shape places.js _recordCast wants. */
export function spiderCast(siteId) {
  const rows = SPIDER_NESTS[siteId];
  if (!rows) return null;
  return rows.map((r) => ({ species: 'spider', lx: r.lx, lz: r.lz, ly: r.ly, yaw: r.yaw }));
}

export default SPIDER_NESTS;
