// CURFEW — where the spiders are. ROUND 18.
//
// ALEX, 2026-09-09: "Another new enemy inside a destination if it's big and looks old should
// be a giant spider that crawls on ceiling and drops off."
//
// So: BIG AND OLD, and nowhere else. Not the filling station, not a lookout tower, not a
// roadside camp. The sites below are the county's stone-and-timber interiors — a manor, a
// house, a mine, a cathedral, a mill, a barn and a bell tower — and each gets one, in a room
// whose ceiling is high enough for the thing to be ABOVE you rather than in your face. A
// room with a 2.2 m ceiling and a 1.05 m spider on it is a hat.
//
// COORDINATES ARE SITE-LOCAL, in the same pad frame every other authored thing at a
// destination uses (places.js _recordCast converts them). Every xz here is one that the
// September 8 interior pass already proved is a real, enterable room — they are lifted from
// director/interior-horror.js's INTERIOR_ENCOUNTERS, which were verified by actually
// walking to them — so none of them is a guess about whether there is floor there.
//
// `ly` is metres ABOVE THE SITE'S PAD, and it is deliberately a little UNDER the real
// ceiling. D14 (2026-09-17): enemies.js probes for the roof FROM THE BODY at this height —
// one ray straight up, ceilingHi + dropFrom = 11.2 m long (species.js spider) — and hangs
// the spider 0.7 m under whatever it finds, so this number only has to put the spider in
// the right room on the right storey, under a roof inside that reach. It used to probe 7 m
// up from the TERRAIN under the body, which is why a nest on a raised floor or under a tall
// vault found nothing and hung the spider at 2.8 m in open air. If the ray finds nothing now
// it sits on the floor under it (a collider top, or the ground), which is a surface and is
// the honest failure rather than a spider hovering in the open. It never hangs in open air.
//
// One per site, spawned STAGED — it holds still up there until you notice it, exactly like
// every other authored cast in this county, and it is placed once per save.

export const SPIDER_NESTS = Object.freeze({
  'blackthorn-manor': [{ lx: 14.8, lz: 4.9, ly: 4.6, yaw: Math.PI / 2 }],
  'avery-house': [{ lx: -14.8, lz: 4.6, ly: 4.6, yaw: -Math.PI / 2 }],
  'weeping-mine': [{ lx: 8.3, lz: -7.4, ly: 4.4, yaw: 0 }],
  // MEASURED 2026-09-17 against sites.js cathedral.body: the nave is shell(0, 14, 17 x 18,
  // h 15) — walls to padY + 15 — under a 4.2 m gable whose roof courses (gableFloor: obb
  // y0 = top - 0.30) have their undersides at ~15.6 m over the eaves and ~18.8 m at the
  // ridge. 6.2 + 11.2 = 17.4 never reached the ridge course over (0, 17), so the spider
  // sat on the nave floor among the congregation. 12 reaches 23.2: it hangs from the ridge
  // at ~18.1 m, above the pews, which is the room the row was always meant to put it in.
  cathedral: [{ lx: 0, lz: 17, ly: 12.0, yaw: Math.PI }],
  'hollow-mill': [{ lx: 11.0, lz: -5.0, ly: 4.2, yaw: Math.PI }],
  jackfield: [{ lx: -2.3, lz: 1.2, ly: 4.8, yaw: 0 }],
  // MEASURED 2026-09-17 against sites.js tower.landmark: the shaft is a SOLID 6.4 m stone
  // box 19 m tall with one full-height 'wall' obb (halfX 3.2, y -0.3 .. 19). (0, 0, 8.4)
  // was inside that stone; collision.fits refused the spawn and the tower has never had
  // its spider. The only room is the open belfry over the 19 m ringing floor: four corner
  // posts and a cap at 25.6 m that are geometry with NO collider, so the probe finds no
  // roof and the spider sits on the ringing floor (the shaft obb's top at padY + 19),
  // on a diagonal 2.4 m off the axis so it clears the bell's r 1.15 collider (y 23.1 .. 25.1)
  // by half a metre with its own 0.72. NOT the (+, +) diagonal: a 0.3 m metal post of the
  // belfry (y 18.7 .. 21.05) stands 0.64 m from (2.1, 2.1) and collision.fits refused the
  // spawn there three times a visit (measured 2026-09-17, tools/round19-check.mjs); the
  // other three diagonals fit.
  'bell-tower': [{ lx: 1.7, lz: -1.7, ly: 21.0, yaw: 0 }],
  // ROUND 19. ALEX: "Spiders falling from the sky when not inside or somewhere."
  //
  // THE HOLDFAST ROW WAS THE ONE. (0, 6) is not a room — it is seven metres out into the open
  // bailey, on the cobbles between the keep's porch and the well, with 44 m of night above
  // it. The note at the top of this file says every coordinate here was "lifted from
  // director/interior-horror.js's INTERIOR_ENCOUNTERS, which were verified by actually
  // walking to them"; the Holdfast has no row in that table, so this one was a guess and it
  // was wrong. It is gone: above-ground Holdfast is inhabited (holdfast-life.js) and its
  // crypt has its own encounter owner.
});

/** The cast entries for one site, in the shape places.js _recordCast wants. */
export function spiderCast(siteId) {
  const rows = SPIDER_NESTS[siteId];
  if (!rows) return null;
  return rows.map((r) => ({ species: 'spider', lx: r.lx, lz: r.lz, ly: r.ly, yaw: r.yaw }));
}

export default SPIDER_NESTS;
