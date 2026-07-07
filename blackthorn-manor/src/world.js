// The manor itself. A cell-grid floor-plan (1 cell = 2m) is compiled into
// merged wall/floor geometry, colliders, stairs, doors and window openings.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export const CS = 2;                 // cell size, metres
const GX = 30, GZ = 20;              // grid extents (60m x 40m footprint)

export const LV = {
  basement: { floor: -3.2, ceil: -0.7 },
  ground:   { floor: 0.0,  ceil: 3.9 },
  first:    { floor: 4.2,  ceil: 7.4 },
  attic:    { floor: 7.7,  ceil: 10.2 },
};
const TALL_CEIL = 7.4;

/* ------------------------------------------------------------------ */
/*  ROOM DEFINITIONS  (cell rects, inclusive)                          */
/* ------------------------------------------------------------------ */
// r(id, name, x0,z0,x1,z1, {wall,floor,ceil,tall,void,windows})
const ROOMS = {
  ground: [
    ['study',   'The Study',            0, 15,  3, 19, { wall: 'wallGreen', floor: 'woodFloorDark' }],
    ['library', 'The Library',          4, 15, 10, 19, { wall: 'woodMid',   floor: 'woodFloorDark' }],
    ['foyer',   'The Grand Foyer',     11, 15, 18, 19, { wall: 'wallRed',   floor: 'marble', tall: true }],
    ['dining',  'The Dining Room',     19, 15, 24, 19, { wall: 'wallRed',   floor: 'woodFloor' }],
    ['kitchen', 'The Kitchen',         25, 15, 29, 19, { wall: 'plaster',   floor: 'stone' }],
    ['corrG',   'The Long Corridor',    0, 13, 29, 14, { wall: 'wallBlue',  floor: 'woodFloorDark' }],
    ['ballroom','The Ballroom',         0,  8,  8, 12, { wall: 'wallGold',  floor: 'woodFloor', tall: true }],
    ['billiard','The Billiards Room',   9,  8, 13, 12, { wall: 'wallGreen', floor: 'woodFloorDark' }],
    ['smoking', 'The Smoking Room',    14,  8, 17, 12, { wall: 'wallPlum',  floor: 'woodFloorDark' }],
    ['drawing', 'The Drawing Room',    18,  8, 23, 12, { wall: 'wallBlue',  floor: 'woodFloor' }],
    ['conserv', 'The Conservatory',    24,  8, 29, 12, { wall: 'plasterOld', floor: 'stone', conservatory: true }],
    ['corrN',   'The Servants’ Passage', 0, 6, 29, 7, { wall: 'plasterOld', floor: 'woodFloorDark' }],
    ['chapel',  'The Chapel',           0,  0,  5,  5, { wall: 'stone',     floor: 'stone', tall: true, gothic: true }],
    ['music',   'The Music Room',       6,  0, 11,  5, { wall: 'wallPlum',  floor: 'woodFloor' }],
    ['portrait','The Portrait Gallery',12,  0, 17,  5, { wall: 'wallRed',   floor: 'woodFloorDark' }],
    ['servants','The Servants’ Hall', 18, 0, 22, 5, { wall: 'plaster', floor: 'woodFloorDark' }],
    ['scullery','The Scullery',        23,  0, 25,  5, { wall: 'plaster',   floor: 'stone' }],
    ['larder',  'The Larder',          26,  0, 29,  5, { wall: 'plasterOld', floor: 'stone' }],
  ],
  first: [
    ['boudoir', 'The Morning Boudoir',  0, 15,  3, 19, { wall: 'wallPlum',  floor: 'woodFloor' }],
    ['constance','Lady Constance’s Room', 4, 15, 10, 19, { wall: 'wallBlue', floor: 'woodFloor' }],
    ['galleryW','The Gallery',         11, 15, 11, 19, { wall: 'wallGold',  floor: 'woodFloorDark' }],
    ['foyerVoid', null,                12, 15, 17, 18, { void: true }],
    ['galleryS','The Gallery',         12, 19, 17, 19, { wall: 'wallGold',  floor: 'woodFloorDark' }],
    ['galleryE','The Gallery',         18, 15, 18, 19, { wall: 'wallGold',  floor: 'woodFloorDark' }],
    ['master',  'The Master Bedroom',  19, 15, 24, 19, { wall: 'wallRed',   floor: 'woodFloor' }],
    ['dressing','The Dressing Room',   25, 15, 29, 19, { wall: 'wallGreen', floor: 'woodFloor' }],
    ['corr1',   'The Upstairs Corridor', 0, 13, 29, 14, { wall: 'wallRed',  floor: 'woodFloorDark' }],
    ['ballVoid', null,                  0,  8,  8, 12, { void: true }],
    ['victor',  'Victor’s Room',   9,  8, 13, 12, { wall: 'wallGreen', floor: 'woodFloor' }],
    ['blueRoom','The Blue Room',       14,  8, 17, 12, { wall: 'wallBlue',  floor: 'woodFloor' }],
    ['nursery', 'The Nursery',         18,  8, 23, 12, { wall: 'wallGold',  floor: 'woodFloor' }],
    ['corr2w',  'The North Passage',    0,  6, 17,  7, { wall: 'plasterOld', floor: 'woodFloorDark' }],
    ['corr2e',  'The East Wing',       18,  6, 29,  7, { wall: 'plasterOld', floor: 'woodFloorDark' }],
    ['chapVoid', null,                  0,  0,  5,  5, { void: true }],
    ['greenRm', 'The Green Room',       6,  0, 11,  5, { wall: 'wallGreen', floor: 'woodFloor' }],
    ['sewing',  'The Sewing Room',     12,  0, 17,  5, { wall: 'plaster',   floor: 'woodFloorDark' }],
    ['retreat', 'Sir Edmund’s Retreat', 18, 0, 22, 5, { wall: 'wallPlum', floor: 'woodFloorDark' }],
    ['grady',   'The Housekeeper’s Room', 23, 0, 25, 5, { wall: 'plaster', floor: 'woodFloorDark' }],
    ['landing1','The Back Stairs',     26,  0, 29,  5, { wall: 'plasterOld', floor: 'woodFloorDark' }],
  ],
  attic: [
    ['attic',   'The Attic',           12,  0, 29,  7, { wall: 'plasterOld', floor: 'woodFloorDark', attic: true }],
  ],
  basement: [
    ['bstairs', 'The Cellar Stairs',   22,  1, 24,  4, { wall: 'stoneDark', floor: 'stone' }],
    ['bhub',    'The Cellar',          20,  5, 24,  6, { wall: 'stoneDark', floor: 'stone' }],
    ['wine',    'The Wine Cellar',     25,  5, 28,  9, { wall: 'brick',     floor: 'stone' }],
    ['storeB',  'The Undercroft',      20,  7, 24, 11, { wall: 'stoneDark', floor: 'stone' }],
    ['boiler',  'The Boiler Room',     16,  5, 19,  8, { wall: 'brick',     floor: 'stone' }],
    ['tunnel',  'The Old Tunnel',       4,  5, 15,  6, { wall: 'brick',     floor: 'stone' }],
    ['crypt',   'The Crypt',            1,  1,  3,  6, { wall: 'stoneDark', floor: 'stone' }],
    ['priest',  'The Priest Hole',      1,  7,  3,  8, { wall: 'stoneDark', floor: 'stone' }],
  ],
};

/* ------------------------------------------------------------------ */
/*  DOORS  — [level, cellX, cellZ, dir, opts]                          */
/*  A door pierces the wall on the `dir` side of the given cell.       */
/* ------------------------------------------------------------------ */
const DOORS = [
  ['ground', 14, 19, 'S', { id: 'front', type: 'double', locked: 'never', name: 'the front door' }],
  ['ground', 14, 15, 'N', { type: 'arch', w: 3.4, h: 3.4 }],  // foyer -> corridor
  ['ground', 15, 15, 'N', { type: 'arch', w: 3.4, h: 3.4, merge: true }],
  ['ground', 11, 17, 'W', { type: 'double', name: 'the library door' }],
  ['ground', 18, 17, 'E', { type: 'double', name: 'the dining room door' }],
  ['ground',  4, 17, 'W', { name: 'the study door' }],
  ['ground',  2, 15, 'N', { name: 'the study door' }],
  ['ground',  7, 15, 'N', { name: 'the library door' }],
  ['ground', 21, 15, 'N', { name: 'the dining room door' }],
  ['ground', 27, 15, 'N', { name: 'the kitchen door' }],
  ['ground', 24, 17, 'E', { name: 'the kitchen door' }],
  ['ground',  4, 13, 'N', { type: 'double', name: 'the ballroom doors' }],
  ['ground', 11, 13, 'N', { name: 'the billiards room door' }],
  ['ground', 15, 13, 'N', { name: 'the smoking room door' }],
  ['ground', 20, 13, 'N', { type: 'double', name: 'the drawing room doors' }],
  ['ground', 26, 13, 'N', { name: 'the conservatory door' }],
  ['ground',  4,  7, 'S', { name: 'the ballroom door' }],
  ['ground', 11,  7, 'S', { name: 'the billiards room door' }],
  ['ground', 20,  7, 'S', { name: 'the drawing room door' }],
  ['ground', 26,  7, 'S', { name: 'the conservatory door' }],
  ['ground',  2,  6, 'N', { id: 'chapelDoor', locked: 'chapelKey', heavy: true, name: 'the chapel door' }],
  ['ground',  8,  6, 'N', { name: 'the music room door' }],
  ['ground', 14,  6, 'N', { type: 'double', name: 'the gallery doors' }],
  ['ground', 20,  6, 'N', { name: 'the servants’ hall door' }],
  ['ground', 24,  6, 'N', { name: 'the scullery door' }],
  ['ground', 27,  6, 'N', { name: 'the larder door' }],
  ['ground', 25,  2, 'E', { name: 'the larder door' }],
  ['ground', 22,  1, 'E', { name: 'the scullery door' }], // north of the cellar-stair pit
  ['ground', 14, 10, 'W', { name: 'the smoking room door' }],
  ['ground', 23, 10, 'E', { name: 'the conservatory door' }],
  // first floor
  ['first', 11, 15, 'N', { type: 'arch' }],
  ['first', 18, 15, 'N', { type: 'arch' }],
  ['first',  2, 15, 'N', { name: 'the boudoir door' }],
  ['first',  7, 15, 'N', { id: 'constanceDoor', name: 'Lady Constance’s door' }],
  ['first', 21, 15, 'N', { type: 'double', name: 'the master bedroom doors' }],
  ['first', 27, 15, 'N', { name: 'the dressing room door' }],
  ['first', 24, 17, 'E', { name: 'the dressing room door' }],
  ['first',  4, 17, 'W', { name: 'the boudoir door' }],
  ['first', 11, 13, 'N', { id: 'victorDoor', name: 'Victor’s door' }],
  ['first', 15, 13, 'N', { name: 'the blue room door' }],
  ['first', 20, 13, 'N', { id: 'nurseryDoor', locked: 'nurseryKey', name: 'the nursery door' }],
  ['first', 18, 10, 'W', { name: 'the nursery door', locked: 'nurseryKey', id: 'nurseryDoor2' }],
  ['first', 11,  8, 'N', { name: 'Victor’s door' }],
  ['first', 15,  8, 'N', { name: 'the blue room door' }],
  ['first',  8,  5, 'S', { name: 'the green room door' }],
  ['first', 14,  5, 'S', { name: 'the sewing room door' }],
  ['first', 20,  5, 'S', { name: 'Sir Edmund’s door' }],
  ['first', 24,  5, 'S', { name: 'the housekeeper’s door' }],
  ['first', 27,  5, 'S', { name: 'the back stairs door' }],
  ['first', 17,  6, 'E', { id: 'eastwing', locked: 'eastwingKey', heavy: true, name: 'the east wing door' }],
  // basement
  ['basement', 23,  4, 'S', { type: 'arch', w: 1.8, h: 2.2 }],
  ['basement', 24,  5, 'E', { id: 'wineDoor', name: 'the wine cellar door' }],
  ['basement', 22,  6, 'S', { type: 'arch', w: 1.8, h: 2.2 }],
  ['basement', 20,  5, 'W', { type: 'arch', w: 1.8, h: 2.2, mergeTo: 'tunnel' }],
  ['basement', 16,  6, 'W', {}], // boiler -> ... boiler west edge x32; tunnel x8..32? see rect
  ['basement',  4,  5, 'W', { type: 'arch', w: 1.6, h: 2.1 }], // tunnel -> crypt
  ['basement',  2,  6, 'S', { id: 'priestDoor', type: 'secret', name: 'the wall of the crypt' }],
];

// pairs of first-floor rooms whose shared boundary is OPEN (no wall)
const OPEN_PAIRS = [
  ['galleryW', 'galleryS'], ['galleryE', 'galleryS'],
];
// pairs whose shared boundary gets a balustrade instead of a wall
const RAIL_PAIRS = [
  ['galleryW', 'foyerVoid'], ['galleryE', 'foyerVoid'], ['galleryS', 'foyerVoid'],
];
// rail columns suppressed because a stair flight arrives there
const RAIL_SKIP = new Set([
  'first|V|12|15', 'first|V|12|16',   // west return flight lands on the gallery
  'first|V|18|15', 'first|V|18|16',   // east return flight
]);

/* ------------------------------------------------------------------ */
/*  STAIRS / RAMPS                                                      */
/* ------------------------------------------------------------------ */
// Each ramp: axis-aligned rect, linear height along `axis` from y0 (at lo) to y1 (at hi)
export const RAMPS = [
  { id: 'grand1', x0: 27, x1: 33, z0: 33, z1: 37, axis: 'z', y0: 2.1, y1: 0 },      // z33->2.1, z37->0
  { id: 'grandL', x0: 27, x1: 33, z0: 31, z1: 33, axis: 'z', y0: 2.1, y1: 2.1 },
  { id: 'grandW', x0: 24, x1: 27, z0: 31, z1: 33, axis: 'x', y0: 4.2, y1: 2.1 },
  { id: 'grandE', x0: 33, x1: 36, z0: 31, z1: 33, axis: 'x', y0: 2.1, y1: 4.2 },
  { id: 'svc1',   x0: 56, x1: 60, z0: 4,  z1: 10, axis: 'z', y0: 0,   y1: 4.2 },
  { id: 'svc2',   x0: 52, x1: 56, z0: 4,  z1: 10, axis: 'z', y0: 7.7, y1: 4.2 },
  { id: 'bstair', x0: 46, x1: 50, z0: 4,  z1: 10, axis: 'z', y0: 0,   y1: -3.2 },
  { id: 'crypt',  x0: 2,  x1: 4,  z0: 2,  z1: 8,  axis: 'z', y0: 0,   y1: -3.2 },
];

// floor cells to omit (stairwell openings): [level, cx0,cz0,cx1,cz1]
const FLOOR_HOLES = [
  ['first', 28, 2, 29, 4],   // over svc1 flight (landing1 floor)
  ['attic', 26, 2, 27, 4],   // over svc2 flight
  ['ground', 23, 2, 24, 4],  // scullery floor over bstair
  ['ground', 1, 1, 1, 3],    // chapel floor over crypt steps
];
// ceiling cells to omit (a stair flight passes through this ceiling)
const CEIL_HOLES = [
  ['ground', 28, 2, 29, 4],    // larder ceiling under svc1
  ['first', 26, 2, 27, 4],     // landing1 ceiling under svc2
  ['basement', 23, 2, 24, 4],  // cellar-stairs ceiling under bstair
  ['basement', 1, 1, 1, 3],    // crypt ceiling under chapel steps
];

/* ------------------------------------------------------------------ */

const WALL_T = 0.26, EXT_T = 0.4;
const DOOR_W = 1.3, DOOR_H = 2.25, DBL_W = 2.4, DBL_H = 2.6;

function box(w, h, d, mat, x, y, z, group, geoBuckets) {
  // accumulate into per-material geometry buckets for merging
  const g = new THREE.BoxGeometry(w, h, d);
  g.translate(x, y, z);
  if (!geoBuckets.has(mat)) geoBuckets.set(mat, []);
  geoBuckets.get(mat).push(g);
}

function aabb(list, x0, y0, z0, x1, y1, z1) {
  list.push({ min: new THREE.Vector3(x0, y0, z0), max: new THREE.Vector3(x1, y1, z1) });
}

export class World {
  constructor(scene, M) {
    this.scene = scene;
    this.M = M;
    this.colliders = [];
    this.doors = [];
    this.doorById = {};
    this.windows = [];       // {x,z,y,level,nx,nz,room}
    this.cellMaps = {};      // level -> (cx,cz) -> room
    this.roomsByLevel = {};
    this.roomById = {};
    this.geoBuckets = new Map();
    this.dynamic = new THREE.Group();
    scene.add(this.dynamic);
    this.build();
  }

  cellRoom(level, cx, cz) {
    const m = this.cellMaps[level];
    if (!m) return null;
    return m[cx + ',' + cz] || null;
  }

  build() {
    // --- room registry & cell maps
    for (const level of Object.keys(ROOMS)) {
      this.cellMaps[level] = {};
      this.roomsByLevel[level] = [];
      for (const [id, name, x0, z0, x1, z1, opts] of ROOMS[level]) {
        const room = { id, name, level, x0, z0, x1, z1, ...opts };
        room.wx0 = x0 * CS; room.wz0 = z0 * CS; room.wx1 = (x1 + 1) * CS; room.wz1 = (z1 + 1) * CS;
        room.cx = (room.wx0 + room.wx1) / 2; room.cz = (room.wz0 + room.wz1) / 2;
        this.roomsByLevel[level].push(room);
        this.roomById[id] = room;
        for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++)
          this.cellMaps[level][cx + ',' + cz] = room;
      }
    }

    // --- index door specs by edge key
    this.doorSpecs = {};  // key -> [spec]
    for (const [level, cx, cz, dir, opts] of DOORS) {
      const k = this.edgeKey(level, cx, cz, dir);
      (this.doorSpecs[k.key] = this.doorSpecs[k.key] || []).push({ level, cx, cz, dir, opts, ...k });
    }

    const floorHoles = {}, ceilHoles = {};
    for (const [lvl, a, b, c, d] of FLOOR_HOLES)
      for (let cx = a; cx <= c; cx++) for (let cz = b; cz <= d; cz++)
        floorHoles[lvl + '|' + cx + ',' + cz] = true;
    for (const [lvl, a, b, c, d] of CEIL_HOLES)
      for (let cx = a; cx <= c; cx++) for (let cz = b; cz <= d; cz++)
        ceilHoles[lvl + '|' + cx + ',' + cz] = true;

    // --- floors & ceilings
    for (const level of Object.keys(ROOMS)) {
      const L = LV[level];
      for (const room of this.roomsByLevel[level]) {
        if (room.void) continue;
        const fm = this.M[room.floor], cm = this.M[room.ceilMat || 'ceiling'];
        for (let cx = room.x0; cx <= room.x1; cx++) for (let cz = room.z0; cz <= room.z1; cz++) {
          const x = cx * CS + CS / 2, z = cz * CS + CS / 2;
          if (!floorHoles[level + '|' + cx + ',' + cz])
            box(CS, 0.3, CS, fm, x, L.floor - 0.15, z, null, this.geoBuckets);
          if (ceilHoles[level + '|' + cx + ',' + cz]) continue;
          const ceilY = room.tall ? TALL_CEIL : L.ceil;
          if (!room.conservatory)
            box(CS, 0.25, CS, cm, x, ceilY + 0.125, z, null, this.geoBuckets);
          else // conservatory: glass roof
            box(CS, 0.06, CS, this.M.glass, x, L.ceil + 0.03, z, null, this.geoBuckets);
        }
      }
    }

    // --- walls: iterate every cell edge of every level
    this.fullHeightEdges = new Set();
    this.buildWallsFor('ground');
    this.buildWallsFor('first');
    this.buildWallsFor('attic');
    this.buildWallsFor('basement');

    // --- stairs, railings, exterior
    this.buildStairs();
    this.buildRailings();
    this.buildExterior();

    // --- merge static geometry
    for (const [mat, geos] of this.geoBuckets) {
      if (!mat) continue;
      const merged = mergeGeometries(geos, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      this.scene.add(mesh);
    }
    this.geoBuckets.clear();
  }

  edgeKey(level, cx, cz, dir) {
    // Normalise to: H edge at plane z=cz*CS between (cx,cz-1)/(cx,cz); V edge at x=cx*CS between (cx-1,cz)/(cx,cz)
    if (dir === 'N') return { key: level + '|H|' + cx + '|' + cz, axis: 'H', ex: cx, ez: cz };
    if (dir === 'S') return { key: level + '|H|' + cx + '|' + (cz + 1), axis: 'H', ex: cx, ez: cz + 1 };
    if (dir === 'W') return { key: level + '|V|' + cx + '|' + cz, axis: 'V', ex: cx, ez: cz };
    return { key: level + '|V|' + (cx + 1) + '|' + cz, axis: 'V', ex: cx + 1, ez: cz };
  }

  buildWallsFor(level) {
    const L = LV[level];
    const openSet = new Set(OPEN_PAIRS.map(p => p.slice().sort().join('|')));
    const railSet = new Set(RAIL_PAIRS.map(p => p.slice().sort().join('|')));

    for (let axis of ['H', 'V']) {
      const xMax = axis === 'V' ? GX + 1 : GX;
      const zMax = axis === 'H' ? GZ + 1 : GZ;
      for (let ex = 0; ex < xMax; ex++) for (let ez = 0; ez < zMax; ez++) {
        let a, b;
        if (axis === 'H') { a = this.cellRoom(level, ex, ez - 1); b = this.cellRoom(level, ex, ez); }
        else { a = this.cellRoom(level, ex - 1, ez); b = this.cellRoom(level, ex, ez); }
        if (a === b) continue;
        if (!a && !b) continue;
        const pairKey = a && b ? [a.id, b.id].sort().join('|') : null;
        if (pairKey && openSet.has(pairKey)) continue;

        const gKey = 'ground|' + axis + '|' + ex + '|' + ez;
        const key = level + '|' + axis + '|' + ex + '|' + ez;

        if (pairKey && railSet.has(pairKey)) {
          if (!RAIL_SKIP.has(key)) this.emitRail(level, axis, ex, ez);
          continue;
        }
        // a full-height ground wall already covers this plane (door holes for
        // upper levels were carved during the ground pass)
        if (level !== 'ground' && this.fullHeightEdges.has(gKey)) continue;
        if ((a && a.void) || (b && b.void)) {
          if (!a || !b) continue; // void against outside: tall room below owns the exterior
        }

        const exterior = !a || !b;
        const room = a || b;
        const tall = level === 'ground' && ((a && a.tall) || (b && b.tall));
        const yBase = L.floor;
        const yTop = tall ? TALL_CEIL : (room.attic ? L.floor + 2.5 : L.ceil);
        if (tall) this.fullHeightEdges.add(gKey);

        // wall position
        const t = exterior ? EXT_T : WALL_T;
        let px, pz, w, d, along0, isX;
        if (axis === 'H') {
          isX = true;
          along0 = ex * CS;
          px = along0 + CS / 2; pz = ez * CS; w = CS; d = t;
        } else {
          isX = false;
          along0 = ez * CS;
          px = ex * CS; pz = along0 + CS / 2; w = t; d = CS;
        }

        // holes: doors at this level; if tall wall, also doors from 'first' at same plane
        const holes = [];
        const specsHere = (this.doorSpecs[key] || []);
        if (tall) {
          const k1 = 'first|' + axis + '|' + ex + '|' + ez;
          for (const s of (this.doorSpecs[k1] || [])) specsHere.push({ ...s, yOff: LV.first.floor });
        }
        for (const s of specsHere) {
          const o = s.opts;
          const yo = s.yOff || yBase;
          let hw = o.w || (o.type === 'double' || o.type === 'front' ? DBL_W : o.type === 'arch' ? 2.6 : DOOR_W);
          let hh = o.h || (o.type === 'double' || o.type === 'front' ? DBL_H : o.type === 'arch' ? 3.0 : DOOR_H);
          const mid = along0 + CS / 2;
          holes.push({ a0: mid - hw / 2, a1: mid + hw / 2, y0: yo, y1: yo + hh });
          if (!o.type || o.type === 'double' || o.type === 'front' || o.type === 'secret') {
            this.spawnDoor(level, s, axis, ex, ez, mid, yo, hw, hh, isX, t);
          } else if (o.type === 'arch' && !o.merge) {
            // arch trim
            const fm = this.M.woodDark;
            if (isX) box(hw + 0.3, 0.25, t + 0.16, fm, mid, yo + hh + 0.1, pz, null, this.geoBuckets);
            else box(t + 0.16, 0.25, hw + 0.3, fm, px, yo + hh + 0.1, mid, null, this.geoBuckets);
          }
        }

        // windows on exterior walls
        if (exterior && level !== 'basement' && !room.void && holes.length === 0 && room.windows !== false) {
          const gothic = room.gothic;
          const conserv = room.conservatory;
          const every = room.attic ? 3 : 2;
          const idx = axis === 'H' ? ex : ez;
          if (idx % every === (room.attic ? 1 : 1)) {
            const mid = along0 + CS / 2;
            let wy0 = yBase + 1.0, wy1 = yBase + 2.7, ww = 1.3;
            if (gothic) { wy0 = yBase + 1.2; wy1 = yBase + 6.2; ww = 1.2; }
            if (conserv) { wy0 = yBase + 0.5; wy1 = yBase + 3.3; ww = 1.6; }
            if (room.attic) { wy0 = yBase + 0.8; wy1 = yBase + 1.9; ww = 0.9; }
            holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy0, y1: wy1 });
            this.spawnWindow(level, room, axis, px, pz, mid, wy0, wy1, ww, isX, t, tall);
            if (tall && !gothic) { // second-storey window on double-height rooms
              const wy2 = LV.first.floor + 1.0, wy3 = LV.first.floor + 2.7;
              holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy2, y1: wy3 });
              this.spawnWindow(level, room, axis, px, pz, mid, wy2, wy3, ww, isX, t, false);
            }
          }
        }

        // negative side = cell a (lower z for H edges, lower x for V edges)
        const matN = a && !a.void ? (this.M[a.wall] || this.M.plaster) : this.M.stone;
        const matP = b && !b.void ? (this.M[b.wall] || this.M.plaster) : this.M.stone;
        this.emitWall(axis, ex, ez, yBase, yTop, holes, matN, matP, t);
      }
    }
  }

  emitWall(axis, ex, ez, y0, y1, holes, matN, matP, t) {
    const along0 = (axis === 'H' ? ex : ez) * CS;
    const along1 = along0 + CS;
    // subdivision cuts along the wall
    const cuts = [along0, along1];
    for (const h of holes) { cuts.push(Math.max(along0, h.a0), Math.min(along1, h.a1)); }
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const s0 = cuts[i], s1 = cuts[i + 1];
      if (s1 - s0 < 0.01) continue;
      const smid = (s0 + s1) / 2;
      // vertical cuts within this slice
      const ycuts = [y0, y1];
      const sliceHoles = holes.filter(h => h.a0 < smid && h.a1 > smid);
      for (const h of sliceHoles) { ycuts.push(Math.max(y0, h.y0), Math.min(y1, h.y1)); }
      ycuts.sort((p, q) => p - q);
      for (let j = 0; j < ycuts.length - 1; j++) {
        const v0 = ycuts[j], v1 = ycuts[j + 1];
        if (v1 - v0 < 0.01) continue;
        const vmid = (v0 + v1) / 2;
        if (sliceHoles.some(h => vmid > h.y0 && vmid < h.y1)) continue;
        const len = s1 - s0, hgt = v1 - v0, ymid = (v0 + v1) / 2;
        // two half-thickness slabs so each side wears its own room's finish
        if (axis === 'H') {
          box(len, hgt, t / 2, matN, smid, ymid, ez * CS - t / 4, null, this.geoBuckets);
          box(len, hgt, t / 2, matP, smid, ymid, ez * CS + t / 4, null, this.geoBuckets);
          if (v0 <= y0 + 0.01) aabb(this.colliders, s0, y0, ez * CS - t / 2, s1, v1, ez * CS + t / 2);
        } else {
          box(t / 2, hgt, len, matN, ex * CS - t / 4, ymid, smid, null, this.geoBuckets);
          box(t / 2, hgt, len, matP, ex * CS + t / 4, ymid, smid, null, this.geoBuckets);
          if (v0 <= y0 + 0.01) aabb(this.colliders, ex * CS - t / 2, y0, s0, ex * CS + t / 2, v1, s1);
        }
      }
    }
  }

  spawnDoor(level, spec, axis, ex, ez, mid, y0, w, h, isX, t) {
    const o = spec.opts;
    if (o.merge) return; // second column of a wide arch — opening only
    const door = new Door(this, level, o, mid, y0, w, h, isX,
      isX ? ez * CS : ex * CS);
    this.doors.push(door);
    if (o.id) this.doorById[o.id] = door;
  }

  spawnWindow(level, room, axis, px, pz, mid, y0, y1, w, isX, t, tall) {
    const M = this.M;
    const h = y1 - y0, cy = (y0 + y1) / 2;
    // glass
    if (isX) box(w, h, 0.05, M.windowGlow, mid, cy, pz, null, this.geoBuckets);
    else box(0.05, h, w, M.windowGlow, px, cy, mid, null, this.geoBuckets);
    // frame cross
    const fm = M.woodDark;
    if (isX) {
      box(w, 0.07, t * 0.5, fm, mid, cy, pz, null, this.geoBuckets);
      box(0.07, h, t * 0.5, fm, mid, cy, pz, null, this.geoBuckets);
      box(w + 0.16, 0.1, t + 0.1, fm, mid, y1 + 0.05, pz, null, this.geoBuckets);
      box(w + 0.16, 0.1, t + 0.14, fm, mid, y0 - 0.05, pz, null, this.geoBuckets);
    } else {
      box(t * 0.5, 0.07, w, fm, px, cy, mid, null, this.geoBuckets);
      box(t * 0.5, h, 0.07, fm, px, cy, mid, null, this.geoBuckets);
      box(t + 0.1, 0.1, w + 0.16, fm, px, y1 + 0.05, mid, null, this.geoBuckets);
      box(t + 0.14, 0.1, w + 0.16, fm, px, y0 - 0.05, mid, null, this.geoBuckets);
    }
    // collider for the opening (so you can't walk through glass) — always:
    // second-storey windows on tall walls sit at waist height for the gallery
    if (isX) aabb(this.colliders, mid - w / 2, y0, pz - t / 2, mid + w / 2, y1, pz + t / 2);
    else aabb(this.colliders, px - t / 2, y0, mid - w / 2, px + t / 2, y1, mid + w / 2);
    this.windows.push({ x: isX ? mid : px, z: isX ? pz : mid, y: y0, level, isX, room: room.id });
  }

  emitRail(level, axis, ex, ez) {
    const L = LV[level];
    const along0 = (axis === 'H' ? ex : ez) * CS;
    this.balustrade(
      axis === 'H' ? along0 : ex * CS,
      axis === 'H' ? ez * CS : along0,
      axis === 'H' ? along0 + CS : ex * CS,
      axis === 'H' ? ez * CS : along0 + CS,
      L.floor);
  }

  balustrade(x0, z0, x1, z1, y) {
    const M = this.M;
    const len = Math.hypot(x1 - x0, z1 - z0);
    const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    const isX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
    // top rail + base
    if (isX) {
      box(len, 0.09, 0.14, M.woodDark, cx, y + 1.0, cz, null, this.geoBuckets);
      box(len, 0.06, 0.1, M.woodDark, cx, y + 0.06, cz, null, this.geoBuckets);
    } else {
      box(0.14, 0.09, len, M.woodDark, cx, y + 1.0, cz, null, this.geoBuckets);
      box(0.1, 0.06, len, M.woodDark, cx, y + 0.06, cz, null, this.geoBuckets);
    }
    const n = Math.max(2, Math.round(len / 0.33));
    for (let i = 0; i <= n; i++) {
      const f = i / n;
      const bx = x0 + (x1 - x0) * f, bz = z0 + (z1 - z0) * f;
      box(0.055, 0.9, 0.055, M.woodDark, bx, y + 0.5, bz, null, this.geoBuckets);
    }
    aabb(this.colliders, Math.min(x0, x1) - 0.07, y, Math.min(z0, z1) - 0.07,
      Math.max(x0, x1) + 0.07, y + 1.05, Math.max(z0, z1) + 0.07);
  }

  buildStairs() {
    const M = this.M;
    for (const r of RAMPS) {
      const rise = r.y1 - r.y0;   // along axis from lo to hi
      const lo = r.axis === 'z' ? r.z0 : r.x0;
      const hi = r.axis === 'z' ? r.z1 : r.x1;
      const run = hi - lo;
      const steps = Math.max(2, Math.round(Math.abs(rise) / 0.185));
      const stepRun = run / steps;
      const width = r.axis === 'z' ? r.x1 - r.x0 : r.z1 - r.z0;
      const wmid = r.axis === 'z' ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
      const mat = r.id.startsWith('grand') ? M.marblePlain : (r.id === 'bstair' || r.id === 'crypt') ? M.stone : M.woodMid;
      if (r.y0 === r.y1) { // landing platform
        const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
        box(r.x1 - r.x0, 0.3, r.z1 - r.z0, mat, cx, r.y0 - 0.15, cz, null, this.geoBuckets);
        continue;
      }
      for (let i = 0; i < steps; i++) {
        const a = lo + stepRun * (i + 0.5);
        const yBase = Math.min(r.y0, r.y1) - 0.3;
        const yTop = r.y0 + (rise * (i + 1)) / steps;
        const h = Math.max(0.1, yTop - yBase);
        const yMid = yTop - h / 2;
        // solid riser stack; each step is a collider (the player controller
        // ignores colliders whose top is within step-up range of the feet)
        if (r.axis === 'z') {
          box(width, h, Math.abs(stepRun) + 0.02, mat, wmid, yMid, a, null, this.geoBuckets);
          aabb(this.colliders, r.x0, yBase, a - stepRun / 2, r.x1, yTop, a + stepRun / 2);
        } else {
          box(Math.abs(stepRun) + 0.02, h, width, mat, a, yMid, wmid, null, this.geoBuckets);
          aabb(this.colliders, a - stepRun / 2, yBase, r.z0, a + stepRun / 2, yTop, r.z1);
        }
      }
    }
  }

  // stepped approximation of a sloped stair rail
  railSlope(x0, z0, x1, z1, yA, yB, segs = 4) {
    for (let i = 0; i < segs; i++) {
      const f0 = i / segs, f1 = (i + 1) / segs;
      const y = yA + (yB - yA) * (f0 + f1) / 2;
      this.balustrade(x0 + (x1 - x0) * f0, z0 + (z1 - z0) * f0,
        x0 + (x1 - x0) * f1, z0 + (z1 - z0) * f1, y);
    }
  }

  buildRailings() {
    // --- grand staircase ---
    this.railSlope(27, 37, 27, 33, 0, 2.1);      // main flight, west side
    this.railSlope(33, 37, 33, 33, 0, 2.1);      // main flight, east side
    this.balustrade(27, 31, 33, 31, 2.1);        // landing, north lip over the void
    this.railSlope(27, 31, 24, 31, 2.1, 4.2, 3); // west return flight, north side
    this.railSlope(27, 33, 24, 33, 2.1, 4.2, 3); // west return flight, south side
    this.railSlope(33, 31, 36, 31, 2.1, 4.2, 3); // east return flight, north side
    this.railSlope(33, 33, 36, 33, 2.1, 4.2, 3); // east return flight, south side
    // gallery gaps beside the flight arrivals (RAIL_SKIP removed full columns)
    this.balustrade(24, 30, 24, 31, 4.2);
    this.balustrade(24, 33, 24, 34, 4.2);
    this.balustrade(36, 30, 36, 31, 4.2);
    this.balustrade(36, 33, 36, 34, 4.2);
    // --- service stair openings ---
    this.balustrade(56, 4, 56, 10, 4.2);   // landing1 hole, west lip
    this.balustrade(56, 4, 60, 4, 4.2);    // landing1 hole, north lip (flight drops away)
    this.balustrade(52, 10, 52, 4, 7.7);   // attic hole, west lip
    this.balustrade(56, 4, 56, 10, 7.7);   // attic hole, east lip
    this.balustrade(52, 10, 56, 10, 7.7);  // attic hole, south lip
    // --- cellar stair opening (scullery floor) ---
    this.balustrade(46, 4, 46, 10, 0);
    this.balustrade(50, 4, 50, 10, 0);
    this.balustrade(46, 10, 50, 10, 0);
    // --- chapel crypt steps ---
    this.balustrade(2, 2, 2, 8, 0);
    this.balustrade(4, 2, 4, 8, 0);
    this.balustrade(2, 8, 4, 8, 0);
  }

  buildExterior() {
    const M = this.M, S = this.scene;
    // ground
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#101408', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(30, -0.05, 20);
    ground.receiveShadow = true;
    S.add(ground);
    // sky dome + stars + moon
    const sky = new THREE.Mesh(new THREE.SphereGeometry(190, 16, 12), M.night);
    sky.position.set(30, 0, 20);
    S.add(sky);
    const starGeo = new THREE.BufferGeometry();
    const pts = [];
    for (let i = 0; i < 500; i++) {
      const a = Math.random() * Math.PI * 2, b = Math.random() * Math.PI * 0.45;
      pts.push(30 + Math.cos(a) * Math.cos(b) * 185, 12 + Math.sin(b) * 185, 20 + Math.sin(a) * Math.cos(b) * 185);
    }
    starGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    S.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: '#aab4cc', size: 0.5, sizeAttenuation: false })));
    const moon = new THREE.Mesh(new THREE.SphereGeometry(7, 16, 16), M.moon);
    moon.position.set(-60, 70, -110);
    S.add(moon);
    // dead trees
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#171310', roughness: 1 });
    const treeGeos = [];
    let seed = 9;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 46; i++) {
      const a = rnd() * Math.PI * 2;
      const rr = 46 + rnd() * 90;
      const tx = 30 + Math.cos(a) * rr, tz = 20 + Math.sin(a) * rr * 0.8;
      const th = 6 + rnd() * 7;
      const t = new THREE.CylinderGeometry(0.12, 0.42, th, 5);
      t.translate(tx, th / 2, tz);
      treeGeos.push(t);
      for (let brc = 0; brc < 4; brc++) {
        const bl = 1.6 + rnd() * 2.4;
        const br = new THREE.CylinderGeometry(0.03, 0.1, bl, 4);
        br.translate(0, bl / 2, 0);
        br.rotateZ(0.6 + rnd() * 1.2);
        br.rotateY(rnd() * Math.PI * 2);
        br.translate(tx, th * (0.55 + rnd() * 0.4), tz);
        treeGeos.push(br);
      }
    }
    const trees = new THREE.Mesh(mergeGeometries(treeGeos, false), trunkMat);
    trees.castShadow = true;
    S.add(trees);
    // roof slab over the house so windows don't show sky through ceilings
    const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 0.5, 42), new THREE.MeshStandardMaterial({ color: '#14100c', roughness: 1 }));
    roof.position.set(30, 10.6, 20);
    S.add(roof);
  }

  /* ---------------- queries ---------------- */

  roomAt(x, z, y) {
    const level = this.levelAt(y);
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    const r = this.cellRoom(level, cx, cz);
    return r && !r.void ? r : null;
  }

  levelAt(y) {
    if (y < -1.4) return 'basement';
    if (y < 4.0) return 'ground';
    if (y < 7.55) return 'first';
    return 'attic';
  }

  groundHeightAt(x, z, curY) {
    let best = -Infinity;
    // ramps first
    for (const r of RAMPS) {
      if (x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1) {
        const t = r.axis === 'z' ? (z - r.z0) / (r.z1 - r.z0) : (x - r.x0) / (r.x1 - r.x0);
        const y = r.y0 + (r.y1 - r.y0) * t;
        if (y <= curY + 0.55 && y > best) best = y;
      }
    }
    const cx = Math.floor(x / CS), cz = Math.floor(z / CS);
    for (const level of Object.keys(LV)) {
      const room = this.cellRoom(level, cx, cz);
      if (!room || room.void) continue;
      if (this.isFloorHole(level, cx, cz)) continue;
      const y = LV[level].floor;
      if (y <= curY + 0.55 && y > best) best = y;
    }
    if (best === -Infinity) best = 0;
    return best;
  }

  isFloorHole(level, cx, cz) {
    for (const [lvl, a, b, c, d] of FLOOR_HOLES)
      if (lvl === level && cx >= a && cx <= c && cz >= b && cz <= d) return true;
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  DOOR                                                                */
/* ------------------------------------------------------------------ */
export class Door {
  constructor(world, level, opts, mid, y0, w, h, isX, plane) {
    this.world = world;
    this.opts = opts;
    this.id = opts.id || null;
    this.name = opts.name || 'the door';
    this.locked = opts.locked || null;
    this.secret = opts.type === 'secret';
    this.isOpen = false;
    this.anim = 0; // 0 closed, 1 open
    this.target = 0;
    this.w = w; this.h = h; this.isX = isX;

    const M = world.M;
    const g = new THREE.Group();
    // hinge at one side of the opening
    const hx = isX ? mid - w / 2 : plane;
    const hz = isX ? plane : mid - w / 2;
    g.position.set(hx, y0, hz);
    const mat = this.secret ? M.stoneDark : M.doorWood;

    if (opts.type === 'double' || opts.type === 'front') {
      this.panels = [];
      for (const side of [0, 1]) {
        const pg = new THREE.Group();
        const px = isX ? (side === 0 ? mid - w / 2 : mid + w / 2) : plane;
        const pz = isX ? plane : (side === 0 ? mid - w / 2 : mid + w / 2);
        pg.position.set(px, y0, pz);
        const panel = new THREE.Mesh(new THREE.BoxGeometry(isX ? w / 2 - 0.02 : 0.09, h - 0.04, isX ? 0.09 : w / 2 - 0.02), mat);
        panel.position.set(isX ? (side === 0 ? w / 4 : -w / 4) : 0, h / 2, isX ? 0 : (side === 0 ? w / 4 : -w / 4));
        panel.castShadow = true;
        pg.add(panel);
        this.addKnob(pg, isX, side === 0 ? w / 4 : -w / 4, panel);
        world.dynamic.add(pg);
        this.panels.push({ g: pg, dir: side === 0 ? 1 : -1 });
      }
    } else {
      const pg = new THREE.Group();
      pg.position.set(hx, y0, hz);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(isX ? w - 0.03 : (this.secret ? 0.22 : 0.09), h - (this.secret ? 0.0 : 0.04), isX ? (this.secret ? 0.22 : 0.09) : w - 0.03), mat);
      panel.position.set(isX ? w / 2 : 0, h / 2, isX ? 0 : w / 2);
      panel.castShadow = true;
      pg.add(panel);
      if (!this.secret) this.addKnob(pg, isX, isX ? w - 0.15 : w - 0.15, panel);
      world.dynamic.add(pg);
      this.panels = [{ g: pg, dir: 1 }];
    }
    // frame
    const fm = M.woodDark;
    const t = 0.34;
    if (!this.secret) {
      if (isX) {
        box(0.12, h, t, fm, mid - w / 2 - 0.04, y0 + h / 2, plane, null, world.geoBuckets);
        box(0.12, h, t, fm, mid + w / 2 + 0.04, y0 + h / 2, plane, null, world.geoBuckets);
        box(w + 0.24, 0.14, t, fm, mid, y0 + h + 0.07, plane, null, world.geoBuckets);
      } else {
        box(t, h, 0.12, fm, plane, y0 + h / 2, mid - w / 2 - 0.04, null, world.geoBuckets);
        box(t, h, 0.12, fm, plane, y0 + h / 2, mid + w / 2 + 0.04, null, world.geoBuckets);
        box(t, 0.14, w + 0.24, fm, plane, y0 + h + 0.07, mid, null, world.geoBuckets);
      }
    }
    // collider (removed when open)
    this.collider = { min: new THREE.Vector3(), max: new THREE.Vector3(), door: this };
    if (isX) {
      this.collider.min.set(mid - w / 2, y0, plane - 0.12);
      this.collider.max.set(mid + w / 2, y0 + h, plane + 0.12);
    } else {
      this.collider.min.set(plane - 0.12, y0, mid - w / 2);
      this.collider.max.set(plane + 0.12, y0 + h, mid + w / 2);
    }
    world.colliders.push(this.collider);
    this.mid = mid; this.plane = plane; this.y0 = y0;
    this.center = new THREE.Vector3(isX ? mid : plane, y0 + h / 2, isX ? plane : mid);
  }

  addKnob(pg, isX, along, panel) {
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 8, 8), this.world.M.brass);
    knob.position.set(isX ? along + 0.35 : (0.09), 1.05, isX ? 0.09 : along + 0.35);
    pg.add(knob);
  }

  setOpen(open) {
    this.isOpen = open;
    this.target = open ? 1 : 0;
    // shrink collider when open so the doorway is passable
    if (open) {
      this.collider.max.y = this.collider.min.y; // degenerate: no block
    } else {
      this.collider.max.y = this.y0 + this.h;
    }
  }

  update(dt) {
    const speed = this.secret ? 0.5 : 2.4;
    if (this.anim !== this.target) {
      this.anim += Math.sign(this.target - this.anim) * dt * speed;
      this.anim = Math.max(0, Math.min(1, this.anim));
      const e = this.anim < 0.5 ? 2 * this.anim * this.anim : 1 - Math.pow(-2 * this.anim + 2, 2) / 2;
      if (this.secret) {
        // stone slab sinks into the floor
        for (const p of this.panels) p.g.position.y = this.y0 - e * (this.h - 0.15);
      } else {
        for (const p of this.panels) p.g.rotation.y = e * p.dir * (this.isX ? -1.9 : 1.9);
      }
    }
  }
}

export { box as _box, aabb as _aabb };
