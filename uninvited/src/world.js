// The house itself. A cell-grid floor-plan (1 cell = 2m) is compiled into
// merged wall/floor geometry, colliders, stairs, doors and window openings.
//
// UNINVITED: a two-storey family home. The grand entrance stair, the gallery
// ring and the stairwell void are kept from the original engine (proven to work);
// every room around them is re-authored. The top floor runs a long central hall
// north to the master bedroom — the farthest room from the front door, where the
// night ends.
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
/*  r(id, name, x0,z0,x1,z1, {wall,floor,tall,void,conservatory,...})  */
/* ------------------------------------------------------------------ */
const ROOMS = {
  ground: [
    // south band — the public rooms, off the entrance hall
    ['living',  'the living room',    0, 15, 10, 19, { wall: 'wallSage',    floor: 'woodFloorLt' }],
    ['foyer',   'the entrance hall',  11, 15, 18, 19, { wall: 'wallCream',   floor: 'tileFloor', tall: true }],
    ['dining',  'the dining room',    19, 15, 24, 19, { wall: 'wallCream',   floor: 'woodFloorLt' }],
    ['kitchen', 'the kitchen',        25, 15, 29, 19, { wall: 'tileWhite',   floor: 'tileFloor' }],
    // the cross corridor
    ['hallG',   'the hall',            0, 13, 29, 14, { wall: 'wallCream',   floor: 'woodFloorLt' }],
    // middle band
    ['study',   'the study',           0,  8,  5, 12, { wall: 'wallWarmGrey', floor: 'carpetWarm' }],
    ['family',  'the family room',     6,  8, 13, 12, { wall: 'wallBlueLt',  floor: 'carpetGrey' }],
    ['backhall','the back hall',      14,  8, 18, 12, { wall: 'wallCream',   floor: 'tileFloor' }],
    ['laundry', 'the utility room',   19,  8, 23, 12, { wall: 'tileWhite',   floor: 'tileFloor' }],
    ['sunroom', 'the sun room',       24,  8, 29, 12, { wall: 'wallCream',   floor: 'tileFloor', conservatory: true }],
    // north band — the working end of the house
    ['garage',  'the garage',          0,  0,  9,  7, { wall: 'wallWarmGrey', floor: 'stone' }],
    ['pantry',  'the pantry',         10,  0, 15,  7, { wall: 'tileWhite',   floor: 'tileFloor' }],
    ['playroom','the playroom',       16,  0, 23,  7, { wall: 'wallKidBlue', floor: 'woodFloorLt' }],
    ['bootroom','the boot room',      24,  0, 29,  7, { wall: 'wallWarmGrey', floor: 'tileFloor' }],
  ],
  first: [
    // the gallery ring around the stairwell void (kept from the engine)
    ['galleryW', 'the landing',       11, 15, 11, 19, { wall: 'wallCream',   floor: 'woodFloorLt' }],
    ['foyerVoid', null,               12, 15, 17, 18, { void: true }],
    ['galleryS', 'the landing',       12, 19, 17, 19, { wall: 'wallCream',   floor: 'woodFloorLt' }],
    ['galleryE', 'the landing',       18, 15, 18, 19, { wall: 'wallCream',   floor: 'woodFloorLt' }],
    // the upstairs cross-landing
    ['uphall',   'the landing',        0, 13, 29, 14, { wall: 'wallCream',   floor: 'carpetWarm' }],
    // the long central hall running north to the master bedroom (1 cell wide,
    // aligned with the arch below and the bedroom door above)
    ['longhall', 'the upstairs hall', 14,  4, 14, 12, { wall: 'wallCream',   floor: 'carpetWarm' }],
    // the far room — the end of the night
    ['master',   'the bedroom',       12,  0, 17,  3, { wall: 'wallSage',    floor: 'carpetGrey' }],
    // bedrooms and bathroom off the landing
    ['boy',      "a child's room",     0,  4,  6, 12, { wall: 'wallKidBlue', floor: 'carpetGrey' }],
    ['bath',     'the bathroom',       7,  4, 13, 12, { wall: 'tileWhite',   floor: 'tileFloor' }],
    ['studyUp',  'the study',         15,  4, 22, 12, { wall: 'wallWarmGrey', floor: 'carpetWarm' }],
    ['girl',     "a child's room",    23,  4, 29, 12, { wall: 'wallKidPink', floor: 'carpetGrey' }],
    // the two rooms flanking the master
    ['guest',    'the guest room',     0,  0, 11,  3, { wall: 'wallBlueLt',  floor: 'carpetGrey' }],
    ['parents',  'the bedroom',       18,  0, 29,  3, { wall: 'wallSage',    floor: 'carpetGrey' }],
  ],
};

/* ------------------------------------------------------------------ */
/*  DOORS  — [level, cellX, cellZ, dir, opts]                          */
/*  A door pierces the wall on the `dir` side of the given cell.       */
/*  Author each opening ONCE.                                          */
/* ------------------------------------------------------------------ */
const DOORS = [
  // --- ground ---
  ['ground', 14, 19, 'S', { id: 'front', type: 'double', locked: 'never', name: 'the front door' }],
  ['ground', 14, 15, 'N', { type: 'arch', w: 3.6, h: 3.2 }],           // hall <-> entrance
  ['ground', 15, 15, 'N', { type: 'arch', w: 3.6, h: 3.2, merge: true }],
  ['ground', 11, 17, 'W', { type: 'double', name: 'the living room' }],
  ['ground', 18, 17, 'E', { type: 'double', name: 'the dining room' }],
  ['ground', 24, 17, 'E', { name: 'the kitchen' }],
  ['ground',  3, 15, 'N', { name: 'the living room' }],
  ['ground', 21, 15, 'N', { name: 'the dining room' }],
  ['ground', 27, 15, 'N', { name: 'the kitchen' }],
  ['ground',  2, 13, 'N', { name: 'the study' }],
  ['ground',  9, 13, 'N', { name: 'the family room' }],
  ['ground', 16, 13, 'N', { name: 'the back hall' }],
  ['ground', 21, 13, 'N', { name: 'the utility room' }],
  ['ground', 26, 13, 'N', { name: 'the sun room' }],
  ['ground',  2,  8, 'N', { name: 'the garage' }],
  ['ground', 11,  8, 'N', { name: 'the pantry' }],
  ['ground', 16,  8, 'N', { name: 'the playroom' }],
  ['ground', 26,  8, 'N', { name: 'the boot room' }],
  // --- first ---
  ['first', 11, 15, 'N', { type: 'arch', w: 2.2, h: 2.4 }],            // gallery W -> landing
  ['first', 18, 15, 'N', { type: 'arch', w: 2.2, h: 2.4 }],            // gallery E -> landing
  ['first',  3, 13, 'N', { name: "the child's room" }],
  ['first', 10, 13, 'N', { name: 'the bathroom' }],
  ['first', 14, 13, 'N', { type: 'arch', w: 2.0, h: 2.4 }],            // landing -> long hall
  ['first', 19, 13, 'N', { name: 'the study' }],
  ['first', 26, 13, 'N', { name: "the child's room" }],
  ['first', 14,  4, 'N', { id: 'masterDoor', name: 'the bedroom' }],   // <-- the finale door
  ['first',  3,  4, 'N', { name: 'the guest room' }],
  ['first', 26,  4, 'N', { name: 'the bedroom' }],
];

// no wall-less room pairs
const OPEN_PAIRS = [];
// the gallery ring gets a balustrade over the stairwell void instead of a wall
const RAIL_PAIRS = [
  ['galleryW', 'foyerVoid'], ['galleryE', 'foyerVoid'], ['galleryS', 'foyerVoid'],
];
// rail columns suppressed where a stair flight arrives on the gallery
const RAIL_SKIP = new Set([
  'first|V|12|15', 'first|V|12|16',   // west return flight lands here
  'first|V|18|15', 'first|V|18|16',   // east return flight
]);

/* ------------------------------------------------------------------ */
/*  STAIRS / RAMPS  (world metres) — the grand entrance stair only     */
/* ------------------------------------------------------------------ */
export const RAMPS = [
  { id: 'grand1', x0: 27, x1: 33, z0: 33, z1: 37, axis: 'z', y0: 2.1, y1: 0 },
  { id: 'grandL', x0: 27, x1: 33, z0: 31, z1: 33, axis: 'z', y0: 2.1, y1: 2.1 },
  { id: 'grandW', x0: 24, x1: 27, z0: 31, z1: 33, axis: 'x', y0: 4.2, y1: 2.1 },
  { id: 'grandE', x0: 33, x1: 36, z0: 31, z1: 33, axis: 'x', y0: 2.1, y1: 4.2 },
];

const FLOOR_HOLES = [];   // the void room handles the stairwell opening
const CEIL_HOLES = [];

/* ------------------------------------------------------------------ */

const WALL_T = 0.26, EXT_T = 0.4;
const DOOR_W = 1.3, DOOR_H = 2.25, DBL_W = 2.4, DBL_H = 2.6;

function box(w, h, d, mat, x, y, z, group, geoBuckets) {
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
    this.windows = [];
    this.cellMaps = {};
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

    this.doorSpecs = {};
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

    // floors & ceilings
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
          else
            box(CS, 0.06, CS, this.M.glass, x, L.ceil + 0.03, z, null, this.geoBuckets);
        }
      }
    }

    this.fullHeightEdges = new Set();
    this.buildWallsFor('ground');
    this.buildWallsFor('first');

    this.buildStairs();
    this.buildRailings();
    this.buildExterior();

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
        if (level !== 'ground' && this.fullHeightEdges.has(gKey)) continue;
        if ((a && a.void) || (b && b.void)) {
          if (!a || !b) continue;
        }

        const exterior = !a || !b;
        const room = a || b;
        const tall = level === 'ground' && ((a && a.tall) || (b && b.tall));
        const yBase = L.floor;
        const yTop = tall ? TALL_CEIL : (room.attic ? L.floor + 2.5 : L.ceil);
        if (tall) this.fullHeightEdges.add(gKey);

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
            const fm = this.M.woodDark;
            if (isX) box(hw + 0.3, 0.25, t + 0.16, fm, mid, yo + hh + 0.1, pz, null, this.geoBuckets);
            else box(t + 0.16, 0.25, hw + 0.3, fm, px, yo + hh + 0.1, mid, null, this.geoBuckets);
          }
        }

        if (exterior && level !== 'basement' && !room.void && holes.length === 0 && room.windows !== false) {
          const gothic = room.gothic;
          const conserv = room.conservatory;
          const every = room.attic ? 3 : 2;
          const idx = axis === 'H' ? ex : ez;
          if (idx % every === 1) {
            const mid = along0 + CS / 2;
            let wy0 = yBase + 1.0, wy1 = yBase + 2.7, ww = 1.3;
            if (gothic) { wy0 = yBase + 1.2; wy1 = yBase + 6.2; ww = 1.2; }
            if (conserv) { wy0 = yBase + 0.5; wy1 = yBase + 3.3; ww = 1.6; }
            if (room.attic) { wy0 = yBase + 0.8; wy1 = yBase + 1.9; ww = 0.9; }
            holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy0, y1: wy1 });
            this.spawnWindow(level, room, axis, px, pz, mid, wy0, wy1, ww, isX, t, tall);
            if (tall && !gothic) {
              const wy2 = LV.first.floor + 1.0, wy3 = LV.first.floor + 2.7;
              holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy2, y1: wy3 });
              this.spawnWindow(level, room, axis, px, pz, mid, wy2, wy3, ww, isX, t, false);
            }
          }
        }

        const matN = a && !a.void ? (this.M[a.wall] || this.M.plaster) : this.M.stone;
        const matP = b && !b.void ? (this.M[b.wall] || this.M.plaster) : this.M.stone;
        this.emitWall(axis, ex, ez, yBase, yTop, holes, matN, matP, t);
      }
    }
  }

  emitWall(axis, ex, ez, y0, y1, holes, matN, matP, t) {
    const along0 = (axis === 'H' ? ex : ez) * CS;
    const along1 = along0 + CS;
    const cuts = [along0, along1];
    for (const h of holes) { cuts.push(Math.max(along0, h.a0), Math.min(along1, h.a1)); }
    cuts.sort((p, q) => p - q);
    for (let i = 0; i < cuts.length - 1; i++) {
      const s0 = cuts[i], s1 = cuts[i + 1];
      if (s1 - s0 < 0.01) continue;
      const smid = (s0 + s1) / 2;
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
    if (o.merge) return;
    const door = new Door(this, level, o, mid, y0, w, h, isX, isX ? ez * CS : ex * CS);
    this.doors.push(door);
    if (o.id) this.doorById[o.id] = door;
  }

  spawnWindow(level, room, axis, px, pz, mid, y0, y1, w, isX, t, tall) {
    const M = this.M;
    const h = y1 - y0, cy = (y0 + y1) / 2;
    if (isX) box(w, h, 0.05, M.windowGlow, mid, cy, pz, null, this.geoBuckets);
    else box(0.05, h, w, M.windowGlow, px, cy, mid, null, this.geoBuckets);
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
      const rise = r.y1 - r.y0;
      const lo = r.axis === 'z' ? r.z0 : r.x0;
      const hi = r.axis === 'z' ? r.z1 : r.x1;
      const run = hi - lo;
      const steps = Math.max(2, Math.round(Math.abs(rise) / 0.185));
      const stepRun = run / steps;
      const width = r.axis === 'z' ? r.x1 - r.x0 : r.z1 - r.z0;
      const wmid = r.axis === 'z' ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
      const mat = M.marblePlain;
      if (r.y0 === r.y1) {
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

  railSlope(x0, z0, x1, z1, yA, yB, segs = 4) {
    for (let i = 0; i < segs; i++) {
      const f0 = i / segs, f1 = (i + 1) / segs;
      const y = yA + (yB - yA) * (f0 + f1) / 2;
      this.balustrade(x0 + (x1 - x0) * f0, z0 + (z1 - z0) * f0,
        x0 + (x1 - x0) * f1, z0 + (z1 - z0) * f1, y);
    }
  }

  buildRailings() {
    // the grand entrance stair only
    this.railSlope(27, 37, 27, 33, 0, 2.1);
    this.railSlope(33, 37, 33, 33, 0, 2.1);
    this.balustrade(27, 31, 33, 31, 2.1);
    this.railSlope(27, 31, 24, 31, 2.1, 4.2, 3);
    this.railSlope(27, 33, 24, 33, 2.1, 4.2, 3);
    this.railSlope(33, 31, 36, 31, 2.1, 4.2, 3);
    this.railSlope(33, 33, 36, 33, 2.1, 4.2, 3);
    this.balustrade(24, 30, 24, 31, 4.2);
    this.balustrade(24, 33, 24, 34, 4.2);
    this.balustrade(36, 30, 36, 31, 4.2);
    this.balustrade(36, 33, 36, 34, 4.2);
  }

  buildExterior() {
    const M = this.M, S = this.scene;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: '#0d1206', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(30, -0.05, 20);
    ground.receiveShadow = true;
    S.add(ground);
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
    // a few dark trees around the plot
    const trunkMat = new THREE.MeshStandardMaterial({ color: '#141310', roughness: 1 });
    const treeGeos = [];
    let seed = 9;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 40; i++) {
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
    const roof = new THREE.Mesh(new THREE.BoxGeometry(62, 0.5, 42), new THREE.MeshStandardMaterial({ color: '#12100c', roughness: 1 }));
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
    this.anim = 0;
    this.target = 0;
    this.w = w; this.h = h; this.isX = isX;

    const M = world.M;
    const hx = isX ? mid - w / 2 : plane;
    const hz = isX ? plane : mid - w / 2;
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
    if (open) this.collider.max.y = this.collider.min.y;
    else this.collider.max.y = this.y0 + this.h;
  }

  update(dt) {
    const speed = this.secret ? 0.5 : 2.4;
    if (this.anim !== this.target) {
      this.anim += Math.sign(this.target - this.anim) * dt * speed;
      this.anim = Math.max(0, Math.min(1, this.anim));
      const e = this.anim < 0.5 ? 2 * this.anim * this.anim : 1 - Math.pow(-2 * this.anim + 2, 2) / 2;
      if (this.secret) {
        for (const p of this.panels) p.g.position.y = this.y0 - e * (this.h - 0.15);
      } else {
        for (const p of this.panels) p.g.rotation.y = e * p.dir * (this.isX ? -1.9 : 1.9);
      }
    }
  }
}

export { box as _box, aabb as _aabb };
