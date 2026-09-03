// CURFEW — manor-data: Blackthorn Manor's floor plan. DATA ONLY: no THREE, no scene.
//
// ROUND 6 (2026-09-03, Alex's fifth playtest): "One thing I was wondering if any of my
// haunted mansion from previous games made it in as destinations. I would like it if they
// did." None had. This is the first: DESIGN section 7 row 5, Blackthorn Manor.
//
// donor: C:/Users/Alex/Projects/blackthorn-manor/src/world.js:6-188 (CS, GX/GZ, LV, ROOMS,
//   DOORS, OPEN_PAIRS, RAIL_PAIRS, RAIL_SKIP, RAMPS, FLOOR_HOLES, CEIL_HOLES), read
//   2026-09-03. The tables are ported VERBATIM in the donor's own frame (a 2 m cell grid,
//   x 0..60 m, z 0..40 m, the front door on the +z face, y in the donor's metres with the
//   ground floor at 0) so they can be diffed against the source. manor.js owns every
//   transform: the frame flip that puts the front on the site's -Z, the LIFT that stands
//   the whole house on a stone plinth, and api.padY.
//
// TWO DEPARTURES FROM THE DONOR, both forced by this engine's laws:
//   1. THE ATTIC IS OMITTED (ROOMS.attic, RAMPS svc2, the attic holes). The brief says the
//      ground floor and the first floor are the ask and the attic may wait. The svc1 back
//      stair still rises to the first-floor landing; the ceiling over it is closed.
//   2. THE BASEMENT STANDS AT GRADE. collision.js: "Ground is ALWAYS terrain.heightAt.
//      Colliders only ever ADD tops", and controller.js rescues any body that is under the
//      terrain straight up through whatever floor it is standing on. A cellar dug 3.2 m
//      into the pad is therefore not representable. So LIFT (manor.js) raises the donor's
//      levels by 3.2 m: the cellar floor is the pad, the ground floor is a floor slab
//      3.2 m up on a stone plinth, and the way in is a flight of front steps — which is
//      what a manor of this size has anyway.
//
// Level names are the donor's. `ground` is the piano nobile, `basement` is the cellar.

export const CS = 2;                 // cell size, metres [donor world.js:6]
export const GX = 30, GZ = 20;       // grid extents: 60 x 40 m footprint [donor :7]

/** Floor and ceiling heights per level, DONOR metres (manor.js adds LIFT). [donor :9-14] */
export const LV = Object.freeze({
  basement: { floor: -3.2, ceil: -0.7 },
  ground: { floor: 0.0, ceil: 3.9 },
  first: { floor: 4.2, ceil: 7.4 },
});
export const TALL_CEIL = 7.4;        // double-height rooms (foyer, ballroom, chapel) [donor :15]

/* ------------------------------------------------------------------ *
 * ROOMS — [id, name, x0, z0, x1, z1, opts], cell rects INCLUSIVE. [donor :20-86]
 *   wall / floor  material keys (manor.js PALETTE maps them to vertex colours)
 *   tall          double height (ground only)
 *   void          the first-floor hole over a tall room: no floor, no ceiling
 *   gothic        tall lancet windows (the chapel)
 *   conservatory  glass roof, taller windows
 *   furn          ROUND 6: what manor.js furnishes it with (the donor's rooms.js has
 *                 ~900 props; this is 6-12 primitives per room from the kit vocabulary)
 * ------------------------------------------------------------------ */
export const ROOMS = Object.freeze({
  ground: [
    ['study', 'The Study', 0, 15, 3, 19, { wall: 'wallGreen', floor: 'woodFloorDark', furn: 'study' }],
    ['library', 'The Library', 4, 15, 10, 19, { wall: 'woodMid', floor: 'woodFloorDark', furn: 'library' }],
    ['foyer', 'The Grand Foyer', 11, 15, 18, 19, { wall: 'wallRed', floor: 'marble', tall: true, furn: 'foyer' }],
    ['dining', 'The Dining Room', 19, 15, 24, 19, { wall: 'wallRed', floor: 'woodFloor', furn: 'dining' }],
    ['kitchen', 'The Kitchen', 25, 15, 29, 19, { wall: 'plaster', floor: 'stone', furn: 'kitchen' }],
    ['corrG', 'The Long Corridor', 0, 13, 29, 14, { wall: 'wallBlue', floor: 'woodFloorDark', furn: 'corridor' }],
    ['ballroom', 'The Ballroom', 0, 8, 8, 12, { wall: 'wallGold', floor: 'woodFloor', tall: true, furn: 'ballroom' }],
    ['billiard', 'The Billiards Room', 9, 8, 13, 12, { wall: 'wallGreen', floor: 'woodFloorDark', furn: 'billiard' }],
    ['smoking', 'The Smoking Room', 14, 8, 17, 12, { wall: 'wallPlum', floor: 'woodFloorDark', furn: 'smoking' }],
    ['drawing', 'The Drawing Room', 18, 8, 23, 12, { wall: 'wallBlue', floor: 'woodFloor', furn: 'drawing' }],
    ['conserv', 'The Conservatory', 24, 8, 29, 12, { wall: 'plasterOld', floor: 'stone', conservatory: true, furn: 'conserv' }],
    ['corrN', 'The Servants Passage', 0, 6, 29, 7, { wall: 'plasterOld', floor: 'woodFloorDark', furn: 'passage' }],
    ['chapel', 'The Chapel', 0, 0, 5, 5, { wall: 'stone', floor: 'stone', tall: true, gothic: true, furn: 'chapel' }],
    ['music', 'The Music Room', 6, 0, 11, 5, { wall: 'wallPlum', floor: 'woodFloor', furn: 'music' }],
    ['portrait', 'The Portrait Gallery', 12, 0, 17, 5, { wall: 'wallRed', floor: 'woodFloorDark', furn: 'portrait' }],
    ['servants', 'The Servants Hall', 18, 0, 22, 5, { wall: 'plaster', floor: 'woodFloorDark', furn: 'servants' }],
    ['scullery', 'The Scullery', 23, 0, 25, 5, { wall: 'plaster', floor: 'stone', furn: 'scullery' }],
    ['larder', 'The Larder', 26, 0, 29, 5, { wall: 'plasterOld', floor: 'stone', furn: 'larder' }],
  ],
  first: [
    ['boudoir', 'The Morning Boudoir', 0, 15, 3, 19, { wall: 'wallPlum', floor: 'woodFloor', furn: 'boudoir' }],
    ['constance', 'Lady Constances Room', 4, 15, 10, 19, { wall: 'wallBlue', floor: 'woodFloor', furn: 'bedroom' }],
    ['galleryW', 'The Gallery', 11, 15, 11, 19, { wall: 'wallGold', floor: 'woodFloorDark', furn: 'none' }],
    ['foyerVoid', null, 12, 15, 17, 18, { void: true }],
    ['galleryS', 'The Gallery', 12, 19, 17, 19, { wall: 'wallGold', floor: 'woodFloorDark', furn: 'none' }],
    ['galleryE', 'The Gallery', 18, 15, 18, 19, { wall: 'wallGold', floor: 'woodFloorDark', furn: 'none' }],
    ['master', 'The Master Bedroom', 19, 15, 24, 19, { wall: 'wallRed', floor: 'woodFloor', furn: 'master' }],
    ['dressing', 'The Dressing Room', 25, 15, 29, 19, { wall: 'wallGreen', floor: 'woodFloor', furn: 'dressing' }],
    ['corr1', 'The Upstairs Corridor', 0, 13, 29, 14, { wall: 'wallRed', floor: 'woodFloorDark', furn: 'corridor' }],
    ['ballVoid', null, 0, 8, 8, 12, { void: true }],
    ['victor', 'Victors Room', 9, 8, 13, 12, { wall: 'wallGreen', floor: 'woodFloor', furn: 'bedroom' }],
    ['blueRoom', 'The Blue Room', 14, 8, 17, 12, { wall: 'wallBlue', floor: 'woodFloor', furn: 'bedroom' }],
    ['nursery', 'The Nursery', 18, 8, 23, 12, { wall: 'wallGold', floor: 'woodFloor', furn: 'nursery' }],
    ['corr2w', 'The North Passage', 0, 6, 17, 7, { wall: 'plasterOld', floor: 'woodFloorDark', furn: 'passage' }],
    ['corr2e', 'The East Wing', 18, 6, 29, 7, { wall: 'plasterOld', floor: 'woodFloorDark', furn: 'passage' }],
    ['chapVoid', null, 0, 0, 5, 5, { void: true }],
    ['greenRm', 'The Green Room', 6, 0, 11, 5, { wall: 'wallGreen', floor: 'woodFloor', furn: 'bedroom' }],
    ['sewing', 'The Sewing Room', 12, 0, 17, 5, { wall: 'plaster', floor: 'woodFloorDark', furn: 'sewing' }],
    ['retreat', 'Sir Edmunds Retreat', 18, 0, 22, 5, { wall: 'wallPlum', floor: 'woodFloorDark', furn: 'study' }],
    ['grady', 'The Housekeepers Room', 23, 0, 25, 5, { wall: 'plaster', floor: 'woodFloorDark', furn: 'bedroom' }],
    ['landing1', 'The Back Stairs', 26, 0, 29, 5, { wall: 'plasterOld', floor: 'woodFloorDark', furn: 'none' }],
  ],
  basement: [
    ['bstairs', 'The Cellar Stairs', 22, 1, 24, 4, { wall: 'stoneDark', floor: 'stone', furn: 'none' }],
    ['bhub', 'The Cellar', 20, 5, 24, 6, { wall: 'stoneDark', floor: 'stone', furn: 'cellar' }],
    ['wine', 'The Wine Cellar', 25, 5, 28, 9, { wall: 'brick', floor: 'stone', furn: 'wine' }],
    ['storeB', 'The Undercroft', 20, 7, 24, 11, { wall: 'stoneDark', floor: 'stone', furn: 'undercroft' }],
    ['boiler', 'The Boiler Room', 16, 5, 19, 8, { wall: 'brick', floor: 'stone', furn: 'boiler' }],
    ['tunnel', 'The Old Tunnel', 4, 5, 15, 6, { wall: 'brick', floor: 'stone', furn: 'tunnel' }],
    ['crypt', 'The Crypt', 1, 1, 3, 6, { wall: 'stoneDark', floor: 'stone', furn: 'crypt' }],
    ['priest', 'The Priest Hole', 1, 7, 3, 8, { wall: 'stoneDark', floor: 'stone', furn: 'priest' }],
  ],
});

/* ------------------------------------------------------------------ *
 * DOORS — [level, cellX, cellZ, dir, opts]. A door pierces the wall on the `dir` side of
 * the given cell. [donor :92-152] The donor's `locked` keys and ids are kept as record;
 * ROUND 6 has NO door mechanics: every door hangs open, ajar or is gone (manor.js).
 * ------------------------------------------------------------------ */
export const DOORS = Object.freeze([
  ['ground', 14, 19, 'S', { id: 'front', type: 'double', locked: 'never', name: 'the front door' }],
  ['ground', 14, 15, 'N', { type: 'arch', w: 3.4, h: 3.4 }],  // foyer -> corridor
  ['ground', 15, 15, 'N', { type: 'arch', w: 3.4, h: 3.4, merge: true }],
  ['ground', 11, 17, 'W', { type: 'double', name: 'the library door' }],
  ['ground', 18, 17, 'E', { type: 'double', name: 'the dining room door' }],
  ['ground', 4, 17, 'W', { name: 'the study door' }],
  ['ground', 2, 15, 'N', { name: 'the study door' }],
  ['ground', 7, 15, 'N', { name: 'the library door' }],
  ['ground', 21, 15, 'N', { name: 'the dining room door' }],
  ['ground', 27, 15, 'N', { name: 'the kitchen door' }],
  ['ground', 24, 17, 'E', { name: 'the kitchen door' }],
  ['ground', 4, 13, 'N', { type: 'double', name: 'the ballroom doors' }],
  ['ground', 11, 13, 'N', { name: 'the billiards room door' }],
  ['ground', 15, 13, 'N', { name: 'the smoking room door' }],
  ['ground', 20, 13, 'N', { type: 'double', name: 'the drawing room doors' }],
  ['ground', 26, 13, 'N', { name: 'the conservatory door' }],
  ['ground', 4, 7, 'S', { name: 'the ballroom door' }],
  ['ground', 11, 7, 'S', { name: 'the billiards room door' }],
  ['ground', 20, 7, 'S', { name: 'the drawing room door' }],
  ['ground', 26, 7, 'S', { name: 'the conservatory door' }],
  ['ground', 2, 6, 'N', { id: 'chapelDoor', locked: 'chapelKey', heavy: true, name: 'the chapel door' }],
  ['ground', 8, 6, 'N', { name: 'the music room door' }],
  ['ground', 14, 6, 'N', { type: 'double', name: 'the gallery doors' }],
  ['ground', 20, 6, 'N', { name: 'the servants hall door' }],
  ['ground', 24, 6, 'N', { name: 'the scullery door' }],
  ['ground', 27, 6, 'N', { name: 'the larder door' }],
  ['ground', 25, 2, 'E', { name: 'the larder door' }],
  ['ground', 22, 1, 'E', { name: 'the scullery door' }], // north of the cellar-stair pit
  ['ground', 14, 10, 'W', { name: 'the smoking room door' }],
  ['ground', 23, 10, 'E', { name: 'the conservatory door' }],
  // first floor
  ['first', 11, 15, 'N', { type: 'arch' }],
  ['first', 18, 15, 'N', { type: 'arch' }],
  ['first', 2, 15, 'N', { name: 'the boudoir door' }],
  ['first', 7, 15, 'N', { id: 'constanceDoor', name: 'Lady Constances door' }],
  ['first', 21, 15, 'N', { type: 'double', name: 'the master bedroom doors' }],
  ['first', 27, 15, 'N', { name: 'the dressing room door' }],
  ['first', 24, 17, 'E', { name: 'the dressing room door' }],
  ['first', 4, 17, 'W', { name: 'the boudoir door' }],
  ['first', 11, 13, 'N', { id: 'victorDoor', name: 'Victors door' }],
  ['first', 15, 13, 'N', { name: 'the blue room door' }],
  ['first', 20, 13, 'N', { id: 'nurseryDoor', locked: 'nurseryKey', name: 'the nursery door' }],
  ['first', 18, 10, 'W', { name: 'the nursery door', locked: 'nurseryKey', id: 'nurseryDoor2' }],
  ['first', 11, 8, 'N', { name: 'Victors door' }],
  ['first', 15, 8, 'N', { name: 'the blue room door' }],
  ['first', 8, 5, 'S', { name: 'the green room door' }],
  ['first', 14, 5, 'S', { name: 'the sewing room door' }],
  ['first', 20, 5, 'S', { name: 'Sir Edmunds door' }],
  ['first', 24, 5, 'S', { name: 'the housekeepers door' }],
  ['first', 27, 5, 'S', { name: 'the back stairs door' }],
  ['first', 17, 6, 'E', { id: 'eastwing', locked: 'eastwingKey', heavy: true, name: 'the east wing door' }],
  // basement
  ['basement', 23, 4, 'S', { type: 'arch', w: 1.8, h: 2.2 }],
  ['basement', 24, 5, 'E', { id: 'wineDoor', name: 'the wine cellar door' }],
  ['basement', 22, 6, 'S', { type: 'arch', w: 1.8, h: 2.2 }],
  ['basement', 20, 5, 'W', { type: 'arch', w: 1.8, h: 2.2, mergeTo: 'tunnel' }],
  ['basement', 16, 6, 'W', {}], // boiler -> tunnel
  ['basement', 4, 5, 'W', { type: 'arch', w: 1.6, h: 2.1 }], // tunnel -> crypt
  ['basement', 2, 6, 'S', { id: 'priestDoor', type: 'secret', name: 'the wall of the crypt' }],
]);

/** Pairs of first-floor rooms whose shared boundary is OPEN (no wall). [donor :155-157] */
export const OPEN_PAIRS = Object.freeze([
  ['galleryW', 'galleryS'], ['galleryE', 'galleryS'],
]);
/** Pairs whose shared boundary gets a balustrade instead of a wall. [donor :159-161] */
export const RAIL_PAIRS = Object.freeze([
  ['galleryW', 'foyerVoid'], ['galleryE', 'foyerVoid'], ['galleryS', 'foyerVoid'],
]);
/** Rail columns suppressed because a stair flight arrives there. [donor :163-166] */
export const RAIL_SKIP = Object.freeze([
  'first|V|12|15', 'first|V|12|16',   // west return flight lands on the gallery
  'first|V|18|15', 'first|V|18|16',   // east return flight
]);

/* ------------------------------------------------------------------ *
 * RAMPS (stairs) — axis-aligned rect in DONOR METRES, linear height along `axis` from
 * y0 (at lo) to y1 (at hi). [donor :172-181]. svc2 (the attic flight) is omitted with
 * the attic. `grandL` is the half-landing (y0 === y1).
 * ------------------------------------------------------------------ */
export const RAMPS = Object.freeze([
  { id: 'grand1', x0: 27, x1: 33, z0: 33, z1: 37, axis: 'z', y0: 2.1, y1: 0 },      // z33->2.1, z37->0
  { id: 'grandL', x0: 27, x1: 33, z0: 31, z1: 33, axis: 'z', y0: 2.1, y1: 2.1 },
  { id: 'grandW', x0: 24, x1: 27, z0: 31, z1: 33, axis: 'x', y0: 4.2, y1: 2.1 },
  { id: 'grandE', x0: 33, x1: 36, z0: 31, z1: 33, axis: 'x', y0: 2.1, y1: 4.2 },
  { id: 'svc1', x0: 56, x1: 60, z0: 4, z1: 10, axis: 'z', y0: 0, y1: 4.2 },
  { id: 'bstair', x0: 46, x1: 50, z0: 4, z1: 10, axis: 'z', y0: 0, y1: -3.2 },
  { id: 'crypt', x0: 2, x1: 4, z0: 2, z1: 8, axis: 'z', y0: 0, y1: -3.2 },
]);

/** Floor cells to omit (stairwell openings): [level, cx0, cz0, cx1, cz1]. [donor :184-189] */
export const FLOOR_HOLES = Object.freeze([
  ['first', 28, 2, 29, 4],   // over svc1 flight (landing1 floor)
  ['ground', 23, 2, 24, 4],  // scullery floor over bstair
  ['ground', 1, 1, 1, 3],    // chapel floor over crypt steps
]);
/** Ceiling cells to omit (a stair flight passes through). [donor :191-196] */
export const CEIL_HOLES = Object.freeze([
  ['ground', 28, 2, 29, 4],    // larder ceiling under svc1
  ['basement', 23, 2, 24, 4],  // cellar-stairs ceiling under bstair
  ['basement', 1, 1, 1, 3],    // crypt ceiling under chapel steps
]);

/* ------------------------------------------------------------------ *
 * THE CLAIM: the fuse board in the cellar (DESIGN 7.2 / 7.5: "claim = the cellar
 * breaker"). In the Cellar (bhub), DONOR metres: you come down bstair into bstairs,
 * through the arch at (23,4,S) into the hub, and the board is on the west wall at the
 * far end. manor.js converts this to the site frame; placedata's row carries the
 * converted numbers and tests/manor.mjs asserts the two agree.
 * ------------------------------------------------------------------ */
export const CLAIM_DONOR = Object.freeze({ x: 41.0, z: 12.0, level: 'basement' });

/* ------------------------------------------------------------------ *
 * The windows that come up when the place is claimed. Every other pane in the house is
 * dark glass. ART 0.3 row 12 allows lamps and glows above 150 on at most 1.5% of the
 * frame; ninety lit sashes on a 60 m facade seen from the road would spend more than
 * that. These are the front of the house (the +z donor face, the site's -Z): the two
 * either side of the front door, the library and the dining room, three above.
 * Keys are the wall-edge key manor.js builds for every window: level|axis|ex|ez.
 * ------------------------------------------------------------------ */
export const LIT_WINDOWS = Object.freeze([
  'ground|H|13|20', 'ground|H|15|20',      // the foyer, either side of the front door
  'ground|H|7|20', 'ground|H|21|20',       // library, dining room
  'first|H|7|20', 'first|H|21|20',         // Lady Constance's room, the master bedroom
  'first|H|13|20',                         // the gallery over the door
]);
