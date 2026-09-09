// CURFEW — where the spiders are. ROUND 18.
//
// ALEX, 2026-09-09: "Another new enemy inside a destination if it's big and looks old should
// be a giant spider that crawls on ceiling and drops off."
//
// So: BIG AND OLD, and nowhere else. Not the filling station, not a lookout tower, not a
// roadside camp. The eight sites below are the county's stone-and-timber interiors — a
// manor, a house, a mine, a cathedral, a mill, a barn, a bell tower and the keep — and each
// gets one, in a room whose ceiling is high enough for the thing to be ABOVE you rather
// than in your face. A room with a 2.2 m ceiling and a 1.05 m spider on it is a hat.
//
// COORDINATES ARE SITE-LOCAL, in the same pad frame every other authored thing at a
// destination uses (places.js _recordCast converts them). Every xz here is one that the
// September 8 interior pass already proved is a real, enterable room — they are lifted from
// director/interior-horror.js's INTERIOR_ENCOUNTERS, which were verified by actually
// walking to them — so none of them is a guess about whether there is floor there.
//
// `ly` is metres ABOVE THE SITE'S PAD, and it is deliberately a little UNDER the real
// ceiling: enemies.js _stepAir raycasts up from the body every 0.22 s and takes the roof it
// actually finds, so this number only has to put the spider in the right room on the right
// storey. If the ray finds nothing it walks on the floor like anything else, which is the
// honest failure rather than a spider hovering in the open.
//
// One per site, spawned STAGED — it holds still up there until you notice it, exactly like
// every other authored cast in this county, and it is placed once per save.

export const SPIDER_NESTS = Object.freeze({
  'blackthorn-manor': [{ lx: 14.8, lz: 4.9, ly: 4.6, yaw: Math.PI / 2 }],
  'avery-house': [{ lx: -14.8, lz: 4.6, ly: 4.6, yaw: -Math.PI / 2 }],
  'weeping-mine': [{ lx: 8.3, lz: -7.4, ly: 4.4, yaw: 0 }],
  cathedral: [{ lx: 0, lz: 17, ly: 6.2, yaw: Math.PI }],
  'hollow-mill': [{ lx: 11.0, lz: -5.0, ly: 4.2, yaw: Math.PI }],
  jackfield: [{ lx: -2.3, lz: 1.2, ly: 4.8, yaw: 0 }],
  'bell-tower': [{ lx: 0, lz: 0, ly: 8.4, yaw: 0 }],
  holdfast: [{ lx: 0, lz: 6, ly: 6.6, yaw: Math.PI }],
});

/** The cast entries for one site, in the shape places.js _recordCast wants. */
export function spiderCast(siteId) {
  const rows = SPIDER_NESTS[siteId];
  if (!rows) return null;
  return rows.map((r) => ({ species: 'spider', lx: r.lx, lz: r.lz, ly: r.ly, yaw: r.yaw }));
}

export default SPIDER_NESTS;
