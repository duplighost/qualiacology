// ARI'S SCHEMES. The Eleven rewire.
//
// ALEX: "five or six authored paint schemes, permanent, free to swap, appearance only,
// Rebuilt layers over paint."
//
// Ari keeps the Holdfast's one car and has never driven it. What he sells is the only thing
// in the county that changes nothing: a colour. Bought once, owned for ever, and switching
// between schemes you already own costs nothing — a wardrobe, not a purchase loop.
//
// MOSS GREEN is free, is the default, and is exactly the enamel the car already wears
// (car-surfaces.js), so a new player sees the car as it has always been and only notices
// this system exists when Ari offers them something else.
//
// REBUILT LAYERS OVER: it stopped forcing a colour of its own in the rewire and now only
// takes the roughness and metalness down — so a rebuilt car in Oxide Red is a rebuilt car
// in Oxide Red, not a rebuilt car in the green the rebuild used to repaint it.

export const PAINTS = Object.freeze([
  { id: 'moss',      name: 'MOSS GREEN',     hex: 0x536b61, price: 0,
    line: 'The enamel it came with. Nothing you would look at twice.' },
  { id: 'coal',      name: 'COAL BLACK',     hex: 0x15181a, price: 320,
    line: 'Hard to see coming. Hard to find in a field.' },
  { id: 'reservoir', name: 'RESERVOIR BLUE', hex: 0x23414f, price: 320,
    line: 'The colour the water went, the year the lights did.' },
  { id: 'oxide',     name: 'OXIDE RED',      hex: 0x6b2a1e, price: 320,
    line: 'Primer, really. It holds better than the good stuff.' },
  { id: 'ivory',     name: 'OLD IVORY',      hex: 0xb9ab8c, price: 320,
    line: 'It was a wedding car. Somebody still has the photographs.' },
  { id: 'silver',    name: 'FUNERAL SILVER', hex: 0x8d949a, price: 420,
    line: 'We had two. This is the one that came back.' },
]);

export const PAINT_BY_ID = Object.freeze(
  PAINTS.reduce((m, p) => { m[p.id] = p; return m; }, Object.create(null)),
);

export const DEFAULT_PAINT = 'moss';

export default PAINTS;
