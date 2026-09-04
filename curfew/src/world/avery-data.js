// CURFEW — avery-data: the Avery House floor plan from UNINVITED.
// DATA ONLY: no THREE, scene, controller, interaction, NPC, story or renderer imports.
//
// ROUND 11 (2026-09-04). Alex asked for more of his haunted houses to become worthwhile
// destinations. This module freezes the second proven house in the catalogue as a plan that
// CURFEW's existing merged house compiler can consume. It does not port UNINVITED's game.
//
// PRIMARY DONOR
//   C:/Users/Alex/Projects/uninvited/src/world.js:12-155
//     CS, GX/GZ, LV, TALL_CEIL, ROOMS, DOORS, OPEN_PAIRS, RAIL_PAIRS, RAIL_SKIP,
//     RAMPS, FLOOR_HOLES and CEIL_HOLES.
//   C:/Users/Alex/Projects/uninvited/src/rooms.js:751-758
//     the boiler-room fuse-box anchor used as CURFEW's physical claim fixture.
//
// HISTORICAL PROOF
//   The retired public copy is still recoverable at Qualiacology commit
//   84de062de65686afb3096ba39cc48bc5de61b13f, before removal commit
//   d488ac14f6ffa3923604b721cdc2c00b730eb4ea. Direct `git ls-tree`, `git hash-object`
//   and SHA-256 checks agree on all three audited donor files:
//
//   file             Git blob                                  SHA-256
//   src/world.js     5fec398d18e52e0609a3d68d121c0777224b385d  B267AF5C8D4F7DD628841E9DC14D3971DDF6DD7366DB4EAB9A3ED7F8125FA147
//   src/rooms.js     86dde3cc39704068de59b30fe09835640dcaf004  E8D8A314C465FCB17F9A727A556D6EB12DC571D39F99453DCCC0A27BB14393D4
//   src/textures.js  a225ebfccf1c272a8b91f9da55051e5aee8949c7  67F37B930F2A8D6D410C287BD7D0F378E95B966774D9E2C392A83A748E76E8D2
//
// The copied geometry below stays in the donor's own frame so it remains mechanically
// diffable: a 2 m cell grid, x 0..60, z 0..40, front door on +Z, ground floor at y 0.
// The compiler owns placement and yaw. Its donor-to-site-local transform is only:
//
//   localX = donorX - HX             HX = 30
//   localZ = donorZ - HZ             HZ = 24
//   localY = api.padY + LIFT + donorY    LIFT = 3.2
//
// HZ is 24 rather than the donor footprint centre 20 so the house stands four metres back
// and the external front-step flight can meet the site's road-side +Z approach. LIFT puts the
// donor basement floor (-3.2) on CURFEW's terrain pad: collision supports can add a surface
// above terrain, but cannot make a playable room below the terrain heightfield.
//
// EXPLICIT CURFEW DEPARTURES
//   - Compile ground, first and basement only. The donor's unused attic height record
//     (floor 7.7, ceiling 10.2) is deliberately excluded; it has no Avery ROOMS table.
//   - Door ids, `locked` values and secret-panel types remain below solely as donor evidence.
//     CURFEW does not port the key inventory, story gates or hidden trigger interactions.
//   - No Avery family NPCs, police finale, arrest, dialogue, monologue, scripted story,
//     scare scheduler or UNINVITED interaction stack is part of this plan.
//   - No touch sticks or mobile control scheme, and no donor player/controller code.
//   - No donor Three.js r169/CDN/vendor, material, texture, light, post, audio or timer stack.
//     A future builder must use CURFEW's existing shared materials, batching, collision,
//     fixed-step systems and pinned light/program budgets.
//   - The fuse-box coordinates are preserved as a physical anchor. CURFEW's claim is the
//     breaker at local (-3.75, 0, +6); there is no key reward or story finale attached to it.

function deepFreeze(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.freeze(value);
}

export const DONOR_SOURCE_PATH = 'C:/Users/Alex/Projects/uninvited/src/world.js';
export const DONOR_SITE_COMMIT = '84de062de65686afb3096ba39cc48bc5de61b13f';
export const DONOR_REMOVAL_COMMIT = 'd488ac14f6ffa3923604b721cdc2c00b730eb4ea';

export const DONOR_WORLD_BLOB = '5fec398d18e52e0609a3d68d121c0777224b385d';
export const DONOR_WORLD_SHA256 = 'B267AF5C8D4F7DD628841E9DC14D3971DDF6DD7366DB4EAB9A3ED7F8125FA147';
export const DONOR_ROOMS_BLOB = '86dde3cc39704068de59b30fe09835640dcaf004';
export const DONOR_ROOMS_SHA256 = 'E8D8A314C465FCB17F9A727A556D6EB12DC571D39F99453DCCC0A27BB14393D4';
export const DONOR_TEXTURES_BLOB = 'a225ebfccf1c272a8b91f9da55051e5aee8949c7';
export const DONOR_TEXTURES_SHA256 = '67F37B930F2A8D6D410C287BD7D0F378E95B966774D9E2C392A83A748E76E8D2';

export const DONOR_PROVENANCE = deepFreeze({
  project: 'UNINVITED',
  house: 'Avery House',
  localRoot: 'C:/Users/Alex/Projects/uninvited',
  historicalRoot: 'C:/Users/Alex/Projects/qualiacology',
  historicalCommit: DONOR_SITE_COMMIT,
  beforeRemovalCommit: DONOR_REMOVAL_COMMIT,
  files: {
    world: { path: 'src/world.js', blob: DONOR_WORLD_BLOB, sha256: DONOR_WORLD_SHA256 },
    rooms: { path: 'src/rooms.js', blob: DONOR_ROOMS_BLOB, sha256: DONOR_ROOMS_SHA256 },
    textures: { path: 'src/textures.js', blob: DONOR_TEXTURES_BLOB, sha256: DONOR_TEXTURES_SHA256 },
  },
});

export const EXTERIOR = 'avery';
export const CS = 2;                         // donor world.js:12, cell size in metres
export const GX = 30, GZ = 20;              // donor :13, 60 x 40 m footprint
export const HX = 30, HZ = 24;              // donor metres subtracted for site-local X/Z
export const LIFT = 3.2;                     // donor metres added before api.padY
export const LEVELS = deepFreeze(['ground', 'first', 'basement']);

export const CURFEW_FRAME = deepFreeze({
  hx: HX,
  hz: HZ,
  lift: LIFT,
  front: '+z',
  donorToLocal: {
    x: 'donorX - HX',
    y: 'api.padY + LIFT + donorY',
    z: 'donorZ - HZ',
  },
});

/** Floor and ceiling heights in donor metres. CURFEW adds LIFT and api.padY. [world.js:15-20] */
export const LV = deepFreeze({
  basement: { floor: -3.2, ceil: -0.7 },
  ground: { floor: 0.0, ceil: 3.9 },
  first: { floor: 4.2, ceil: 7.4 },
});
export const TALL_CEIL = 7.4;                // donor world.js:21

/* ------------------------------------------------------------------ *
 * ROOMS — [id, name, x0, z0, x1, z1, opts], inclusive cell rects.
 * Values and ordering are the donor's world.js:27-79. No CURFEW furnishing tags are
 * smuggled into opts; a builder/dresser may map room ids without mutating this plan.
 * ------------------------------------------------------------------ */
export const ROOMS = deepFreeze({
  ground: [
    ['living', 'the living room', 0, 15, 10, 19, { wall: 'wallSage', floor: 'woodFloorLt' }],
    ['foyer', 'the entrance hall', 11, 15, 18, 19, { wall: 'wallCream', floor: 'tileFloor', tall: true }],
    ['dining', 'the dining room', 19, 15, 24, 19, { wall: 'wallCream', floor: 'woodFloorLt' }],
    ['kitchen', 'the kitchen', 25, 15, 29, 19, { wall: 'tileWhite', floor: 'tileFloor' }],
    ['hallG', 'the hall', 0, 13, 29, 14, { wall: 'wallCream', floor: 'woodFloorLt' }],
    ['study', 'the study', 0, 8, 5, 12, { wall: 'wallWarmGrey', floor: 'carpetWarmFloor' }],
    ['family', 'the family room', 6, 8, 13, 12, { wall: 'wallBlueLt', floor: 'carpetGreyFloor' }],
    ['backhall', 'the back hall', 16, 8, 18, 12, { wall: 'wallCream', floor: 'tileFloor' }],
    ['cellarStair', 'the cellar stairs', 14, 8, 15, 12, { wall: 'stoneDark', floor: 'stone' }],
    ['laundry', 'the utility room', 19, 8, 23, 12, { wall: 'tileWhite', floor: 'tileFloor' }],
    ['sunroom', 'the sun room', 24, 8, 29, 12, { wall: 'wallCream', floor: 'tileFloor', conservatory: true }],
    ['garage', 'the garage', 0, 0, 9, 7, { wall: 'wallWarmGrey', floor: 'stone' }],
    ['pantry', 'the pantry', 10, 0, 15, 7, { wall: 'tileWhite', floor: 'tileFloor' }],
    ['playroom', 'the playroom', 16, 0, 23, 7, { wall: 'wallKidBlue', floor: 'woodFloorLt' }],
    ['bootroom', 'the boot room', 24, 0, 29, 7, { wall: 'wallWarmGrey', floor: 'tileFloor' }],
  ],
  first: [
    ['galleryW', 'the landing', 11, 15, 11, 19, { wall: 'wallCream', floor: 'woodFloorLt' }],
    ['foyerVoid', null, 12, 15, 17, 18, { void: true }],
    ['galleryS', 'the landing', 12, 19, 17, 19, { wall: 'wallCream', floor: 'woodFloorLt' }],
    ['galleryE', 'the landing', 18, 15, 18, 19, { wall: 'wallCream', floor: 'woodFloorLt' }],
    ['uphall', 'the landing', 0, 13, 29, 14, { wall: 'wallCream', floor: 'carpetWarmFloor' }],
    ['longhall', 'the upstairs hall', 14, 4, 14, 12, { wall: 'wallCream', floor: 'carpetWarmFloor' }],
    ['master', 'the bedroom', 12, 0, 17, 3, { wall: 'wallSage', floor: 'carpetGreyFloor' }],
    ['boy', "a child's room", 0, 4, 6, 12, { wall: 'wallKidBlue', floor: 'carpetGreyFloor' }],
    ['bath', 'the bathroom', 7, 4, 13, 12, { wall: 'tileWhite', floor: 'tileFloor' }],
    ['studyUp', 'the study', 15, 4, 22, 12, { wall: 'wallWarmGrey', floor: 'carpetWarmFloor' }],
    ['girl', "a child's room", 23, 4, 29, 12, { wall: 'wallKidPink', floor: 'carpetGreyFloor' }],
    ['guest', 'the guest room', 0, 0, 11, 3, { wall: 'wallBlueLt', floor: 'carpetGreyFloor' }],
    ['parents', 'the bedroom', 18, 0, 29, 3, { wall: 'wallSage', floor: 'carpetGreyFloor' }],
  ],
  basement: [
    ['cellarLanding', 'the cellar', 13, 8, 15, 13, { wall: 'stoneDark', floor: 'stone' }],
    ['cellar', 'the cellar', 7, 12, 12, 15, { wall: 'brick', floor: 'stone' }],
    ['boiler', 'the boiler room', 13, 14, 15, 15, { wall: 'brick', floor: 'stone' }],
  ],
});

/* ------------------------------------------------------------------ *
 * DOORS — [level, cellX, cellZ, dir, opts]. A door pierces the named side of that cell.
 * Values and ordering are donor world.js:86-126. `locked` and secret ids are provenance,
 * not permission to port UNINVITED's key or story state into CURFEW.
 * ------------------------------------------------------------------ */
export const DOORS = deepFreeze([
  ['ground', 14, 19, 'S', { id: 'front', type: 'double', locked: 'never', name: 'the front door' }],
  ['ground', 14, 15, 'N', { type: 'arch', w: 3.6, h: 3.2 }],
  ['ground', 15, 15, 'N', { type: 'arch', w: 3.6, h: 3.2, merge: true }],
  ['ground', 11, 17, 'W', { type: 'double', name: 'the living room' }],
  ['ground', 18, 17, 'E', { type: 'double', name: 'the dining room' }],
  ['ground', 24, 17, 'E', { name: 'the kitchen' }],
  ['ground', 3, 15, 'N', { name: 'the living room' }],
  ['ground', 21, 15, 'N', { name: 'the dining room' }],
  ['ground', 27, 15, 'N', { name: 'the kitchen' }],
  ['ground', 2, 13, 'N', { name: 'the study' }],
  ['ground', 9, 13, 'N', { name: 'the family room' }],
  ['ground', 16, 13, 'N', { name: 'the back hall' }],
  ['ground', 21, 13, 'N', { name: 'the utility room' }],
  ['ground', 26, 13, 'N', { name: 'the sun room' }],
  ['ground', 2, 8, 'N', { name: 'the garage' }],
  ['ground', 11, 8, 'N', { name: 'the pantry' }],
  ['ground', 16, 8, 'N', { name: 'the playroom' }],
  ['ground', 26, 8, 'N', { name: 'the boot room' }],
  ['first', 11, 15, 'N', { type: 'arch', w: 2.2, h: 2.4 }],
  ['first', 18, 15, 'N', { type: 'arch', w: 2.2, h: 2.4 }],
  ['first', 3, 13, 'N', { name: "the child's room" }],
  ['first', 10, 13, 'N', { name: 'the bathroom' }],
  ['first', 14, 13, 'N', { type: 'arch', w: 2.0, h: 2.4 }],
  ['first', 19, 13, 'N', { name: 'the study' }],
  ['first', 26, 13, 'N', { name: "the child's room" }],
  ['first', 14, 4, 'N', { id: 'masterDoor', name: 'the bedroom', locked: 'masterKey' }],
  ['first', 3, 4, 'N', { name: 'the guest room' }],
  ['first', 26, 4, 'N', { name: 'the bedroom' }],
  ['ground', 6, 8, 'W', { type: 'secret', mat: 'woodDark', id: 'secretStudy', name: 'the panel', w: 1.0, h: 2.05 }],
  ['ground', 16, 3, 'W', { type: 'secret', mat: 'woodPale', id: 'secretPantry', name: 'the low door', w: 0.9, h: 2.0 }],
  ['first', 23, 8, 'W', { type: 'secret', mat: 'woodPale', id: 'secretGirl', name: 'the loose panel', w: 0.9, h: 1.9 }],
  ['ground', 14, 8, 'N', { id: 'cellarDoor', heavy: true, name: 'the cellar door' }],
  ['basement', 13, 12, 'W', { name: 'the cellar' }],
  ['basement', 13, 14, 'N', { name: 'the boiler room' }],
]);

/** No wall-less room pairs in the Avery plan. [donor world.js:128-129] */
export const OPEN_PAIRS = deepFreeze([]);

/** First-floor boundaries that receive a balustrade instead of a wall. [donor :130-133] */
export const RAIL_PAIRS = deepFreeze([
  ['galleryW', 'foyerVoid'],
  ['galleryE', 'foyerVoid'],
  ['galleryS', 'foyerVoid'],
]);

/** Rail columns suppressed where the grand return flights reach the gallery. [donor :134-138] */
export const RAIL_SKIP = deepFreeze([
  'first|V|12|15',
  'first|V|12|16',
  'first|V|18|15',
  'first|V|18|16',
]);

/* Stairs/ramps in donor metres. Linear height runs along `axis` from y0 to y1. [donor :143-150] */
export const RAMPS = deepFreeze([
  { id: 'grand1', x0: 27, x1: 33, z0: 33, z1: 37, axis: 'z', y0: 2.1, y1: 0 },
  { id: 'grandL', x0: 27, x1: 33, z0: 31, z1: 33, axis: 'z', y0: 2.1, y1: 2.1 },
  { id: 'grandW', x0: 24, x1: 27, z0: 31, z1: 33, axis: 'x', y0: 4.2, y1: 2.1 },
  { id: 'grandE', x0: 33, x1: 36, z0: 31, z1: 33, axis: 'x', y0: 2.1, y1: 4.2 },
  { id: 'cellar', x0: 28, x1: 32, z0: 16, z1: 26, axis: 'z', y0: 0, y1: -3.2 },
]);

/** Floor cells omitted for the cellar stair shaft. [donor world.js:152-155] */
export const FLOOR_HOLES = deepFreeze([
  ['ground', 14, 8, 15, 12],
]);

/** Ceiling cells omitted above the same complete flight. [donor world.js:152-155] */
export const CEIL_HOLES = deepFreeze([
  ['basement', 14, 8, 15, 12],
]);

/**
 * Donor fuse-box X/Z, expressed in the same shape the generic house compiler consumes.
 * The donor mesh is at basement floor + 1.5 m; the CURFEW claim/support point remains on
 * the floor. Transform: (26.25 - 30, -3.2 + 3.2, 30 - 24) = (-3.75, 0, +6).
 * [uninvited src/rooms.js:751-758]
 */
export const CLAIM_DONOR = deepFreeze({ x: 26.25, z: 30, level: 'basement' });

/** No powered-window selection is donor plan data; the integrating lane must author it visibly. */
export const LIT_WINDOWS = deepFreeze([]);

export const CURFEW_DEPARTURES = deepFreeze({
  compiledLevels: LEVELS,
  omittedDonorLevel: { id: 'attic', floor: 7.7, ceil: 10.2, reason: 'no Avery room table' },
  inertDoorMetadata: ['locked', 'masterKey', 'secretStudy', 'secretPantry', 'secretGirl'],
  excludedSystems: [
    'NPCs and Avery family figures',
    'story, dialogue, monologue and police finale',
    'keys, locks and secret-panel triggers',
    'touch sticks and mobile controls',
    'UNINVITED player and controller',
    'UNINVITED Three.js, addons, renderer, materials, textures, lights, post, audio and timers',
  ],
});
