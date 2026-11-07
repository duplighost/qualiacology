// What can be blocked. Most of what she does is PINK: hold the guard and it stops; press as it lands and it goes back.
// WHITE is kept for the big ones: a band round her with a gap to find, a shape the size of the room, and whatever a
// track marks hard (FINAL SALE: you can't return it). Waves and beams stay white too (the fight draws those itself).
// Alex, 7 Nov: "less you couldn't block and it was clearer".
// Every attack function that both draws a shape and resolves it calls blockable() on its options first, so the
// colour you see and the rule that lands are always the same one. (A room's own hazards, fire, cars, the lake,
// keep what they were drawn as.)

const WHITE = new Set(['white', 'whiteq']);

// the shape's floor area in square metres (w is a radius, or a lane's half width; h a lane's length)
function areaOf(o) {
  const s = o.shape, w = o.w || 1, h = o.h ?? w;
  if (s === 'rect' || s === 2) return 2 * w * h;
  if (s === 'cone' || s === 3) return w * w * (o.param ?? 0.5);
  return Math.PI * w * w;
}
export function dodgeOnly(o) {
  if (o.hard) return true;
  if (!WHITE.has(o.kind)) return false;
  if (o.shape === 'ring' || o.shape === 'arc' || o.shape === 1 || o.shape === 4) return true;
  return areaOf(o) > 34;
}
// o with its kind as it lands: white that isn't dodge-only becomes pink (def: the kind an unmarked attack defaults to)
export function blockable(o, def = 'white') {
  const kind = o.kind || def;
  if (!WHITE.has(kind) || dodgeOnly({ ...o, kind })) return o.kind ? o : { ...o, kind };
  return { ...o, kind: 'pink', wasWhite: true, teleColor: undefined };
}
