// CURFEW — manor: Blackthorn Manor, the first of Alex's houses to become a destination.
//
// ROUND 6 (2026-09-03), from his fifth playtest: "One thing I was wondering if any of my
// haunted mansion from previous games made it in as destinations. I would like it if they
// did. All I can find is shitty lighthouses that you can kind of walk through." and "I have
// so many mansions and other things from other games we can use."
//
// This is a sites.js builder (BUILDERS.manor = makeManorBuilder(tools)) that compiles the
// tables in manor-data.js into the site kit: MERGED geometry on the shared vertex-coloured
// Lambert (one solid mesh, one glow mesh per phase — no new material, no new program),
// with every collider emitted through api.emit in the statement that places the wall.
//
// donor: C:/Users/Alex/Projects/blackthorn-manor/src/world.js:203-620 (World.build,
//   buildWallsFor, emitWall, spawnWindow, emitRail, balustrade, buildStairs, railSlope,
//   buildRailings), read 2026-09-03. Ported function by function; the donor's own
//   comments are kept where they still describe the code. Its `Door` class (world.js:
//   667-800) is NOT ported: there are no door mechanics this round, so a door here is a
//   frame with a panel hanging open on its hinge, or no panel at all.
//
// THE FRAME. The tables are in the donor's frame: x 0..60, z 0..40, the front door on +z,
// y with the ground floor at 0. THE ROAD IS AT THE SITE'S LOCAL +Z: places.js yaws every
// site with atan2(px - dx, pz - dz) and its local-to-world transform sends local +Z to
// that road point (MEASURED 2026-09-03, tests/manor.mjs asserts it: the manor's road end
// is at local (0, +19.9)). So the donor frame is only TRANSLATED, never turned: donor
// (x, z) -> local (x - HX, z - HZ), the front door stays on +Z and faces the road. HZ is
// 24, not 20, so the house stands 4 m back from the site origin and the foot of the front
// steps (donor z 44.4 -> local +20.4) lands on the road end at +19.9. An earlier cut of
// this file half-turned the house to put its front on -Z, on the strength of a comment in
// places.js that says -Z faces the road; the arithmetic says otherwise, and the kit's
// shell() doorways (also on -Z) face away from the road for the same reason.
//
// THE LIFT. collision.js: ground is always terrain.heightAt and a collider can only ADD a
// top; controller.js rescues a body that is under the terrain straight upward. A cellar
// dug into the pad is therefore not a thing this engine can stand a player in. So the
// whole donor stack is lifted 3.2 m: the cellar floor IS the pad, the ground floor is a
// slab on a stone plinth, and a flight of seven steps climbs to the front door.
//
// THE SPLIT. sites.js builders have two phases. `landmark` is built once at boot into a
// group that is never culled: the plinth, the facade (the OUTER face of every exterior
// wall, its windows and its colliders), the roof, the chimneys, the steps and the porch —
// the silhouette you see from the road at 2 km. `body` streams with the chunk ring: every
// interior face, floor, ceiling, stair, rail, door and stick of furniture, and the seven
// window panes that come up when the place is claimed.

import * as THREE from 'three';
import * as BLACKTHORN_PLAN from './manor-data.js';
import { projectPlaceSurfaceUVs } from './place-surfaces.js';

/** donor (x, z) -> site-local: a translation, (x - HX, z - HZ). See THE FRAME above. */
export const HX = 30, HZ = 24;
/** metres the whole donor stack is raised. See THE LIFT above. */
export const LIFT = 3.2;
/** The cloth channel is drawn by places.js's people Lambert on a pale weave, which renders a
 *  palette value about twice as bright as the timber and plaster maps do (MEASURED in the r3
 *  shots: a 0.07 green velvet came out as pale as 0.14 oak beside it). Every cloth colour is
 *  scaled by this once, at build, so a velvet is as dark as it was written. */
export const CLOTH_GAIN = 0.5;

const WALL_T = 0.26, EXT_T = 0.4;                       // [donor :200]
const DOOR_W = 1.3, DOOR_H = 2.25, DBL_W = 2.4, DBL_H = 2.6;   // [donor :201]
const FLOOR_T = 0.3, CEIL_T = 0.25;
const STEP_RISE = 0.42;         // <= CFG.player.STEP_UP (0.52) and under the 0.48 ground
                                // snap, so a flight is a walk both ways, never a fall
const MAX_RUN = 20;             // a merged wall collider never exceeds this (halfX 10 <
                                // collision.js MAX_HALF_EXTENT 24, with room to spare)
const FRONT_STEPS = 7;          // LIFT / 7 = 0.457 m a riser
const STEP_RUN = 0.6;

/** Site-local claim point, from the donor-frame claim in manor-data.js. Read by
 *  placedata.js's row (typed there) and asserted equal by tests/manor.mjs. */
export function claimLocal(plan = BLACKTHORN_PLAN) {
  const { LV, CLAIM_DONOR } = plan;
  const y = LV[CLAIM_DONOR.level].floor + LIFT;
  return { dx: CLAIM_DONOR.x - HX, dy: y, dz: CLAIM_DONOR.z - HZ };
}

/* ==========================================================================
   Palette. LINEAR albedos in sites.js's band (structures 0.10-0.32). The donor's material
   names are kept as keys so ROOMS reads as it did. The memory note on the donor project
   says the house read as "empty" until its base light was raised — it was darkness, not
   sparsity — so the papers sit near plaster (0.25), never down at the ground band.
   ========================================================================== */
const PALETTE = {
  wallGreen: [0.150, 0.205, 0.140],
  wallRed: [0.250, 0.110, 0.095],
  wallBlue: [0.125, 0.160, 0.235],
  wallGold: [0.290, 0.225, 0.120],
  wallPlum: [0.215, 0.125, 0.180],
  // Avery's donor vocabulary. Missing keys used to silently fall back to the pale
  // plaster below, bleaching almost every room into the same empty white box.
  wallSage: [0.095, 0.125, 0.090],
  wallCream: [0.155, 0.140, 0.105],
  wallWarmGrey: [0.105, 0.105, 0.098],
  wallBlueLt: [0.085, 0.105, 0.135],
  wallKidBlue: [0.075, 0.105, 0.145],
  wallKidPink: [0.145, 0.080, 0.092],
  tileWhite: [0.145, 0.150, 0.142],
  plaster: [0.265, 0.252, 0.232],
  plasterOld: [0.215, 0.205, 0.180],
  woodMid: [0.180, 0.135, 0.092],
  stone: [0.175, 0.175, 0.170],
  stoneDark: [0.125, 0.125, 0.125],
  brick: [0.196, 0.124, 0.100],
  marble: [0.300, 0.292, 0.272],
  marblePlain: [0.280, 0.272, 0.255],
  woodFloor: [0.175, 0.132, 0.092],
  woodFloorLt: [0.145, 0.105, 0.070],
  woodFloorDark: [0.125, 0.095, 0.070],
  tileFloor: [0.078, 0.082, 0.078],
  carpetGreyFloor: [0.066, 0.067, 0.070],
  // r3 polish: a dark stained ceiling. At 0.24 on the knotty plank map it was BRIGHTER than
  // the 0.175 floor, and under the torch the brightest surface on screen in most rooms:
  // every room read as a box lined with floor on two faces. A ceiling that sinks into the
  // dark is what frames a room at night.
  ceiling: [0.088, 0.070, 0.056],
  woodDark: [0.140, 0.108, 0.082],
  doorWood: [0.150, 0.112, 0.080],
  glass: [0.050, 0.062, 0.082],
  // A window pane. The plaster map multiplies every channel, and at 0.06 a pane read as a
  // grey sheet with the plaster's cracks on it, from inside and out. Near-black crushes the
  // pattern: a derelict window at night is a hole.
  pane: [0.010, 0.013, 0.020],
  brass: [0.300, 0.240, 0.100],
  cloth: [0.230, 0.216, 0.190],
  velvet: [0.200, 0.090, 0.085],
  metal: [0.128, 0.134, 0.146],
  rust: [0.176, 0.098, 0.062],
  slate: [0.085, 0.092, 0.104],
  dark: [0.105, 0.108, 0.115],
  paper: [0.320, 0.306, 0.270],
  facade: [0.190, 0.188, 0.180],
  averyFacade: [0.082, 0.096, 0.079],
  averyTrim: [0.105, 0.073, 0.044],
  ivy: [0.032, 0.054, 0.029],
  plinth: [0.150, 0.150, 0.146],
  carpetWarmFloor: [0.098, 0.078, 0.060],
  // r3: the people and the things they left. Cloth values sit under the plaster so a
  // figure is DARKER than the wall behind it (the night-value law, species.js).
  linen: [0.255, 0.246, 0.222],
  blanket: [0.120, 0.052, 0.050],
  blanketBlue: [0.060, 0.074, 0.110],
  blanketGreen: [0.058, 0.084, 0.060],
  velvetPlum: [0.080, 0.036, 0.062],
  velvetGreen: [0.030, 0.044, 0.034],
  velvetBlack: [0.030, 0.029, 0.032],
  maskPale: [0.330, 0.318, 0.292],
  // old gilt, not yellow: at 0.30/0.225 the gilt masks read as smiley faces under the torch
  maskGilt: [0.200, 0.155, 0.085],
  skin: [0.205, 0.160, 0.130],
  hair: [0.040, 0.032, 0.026],
  china: [0.300, 0.296, 0.282],
  food: [0.045, 0.034, 0.024],
  wax: [0.285, 0.268, 0.228],
  porcelain: [0.320, 0.300, 0.280],
  leather: [0.085, 0.052, 0.035],
  enamel: [0.232, 0.228, 0.212],
  // r3 polish: what the portraits are painted with, the library's paper and the gilt of a
  // picture frame that has not been cleaned since the masque
  umber: [0.046, 0.034, 0.024],
  sitterSkin: [0.200, 0.155, 0.120],
  sitterDark: [0.016, 0.014, 0.016],
  rawCanvas: [0.290, 0.270, 0.232],
  oldGilt: [0.165, 0.122, 0.060],
  wallLibrary: [0.070, 0.092, 0.066],
};

/* Which palette keys go on which channel (see THE THREE CHANNELS in compile). */
const TIMBER_KEYS = new Set(['woodFloor', 'woodFloorLt', 'woodFloorDark', 'woodMid', 'woodDark',
  'doorWood', 'ceiling']);
const BLANKETS = ['blanket', 'blanketBlue', 'blanketGreen'];
/* Which Blackthorn rooms are panelled to the dado, which get a skirting and nothing else, and
 * which get no trim at all (stone and glass). See V.trim. */
const TRIM_GRAND = new Set(['foyer', 'dining', 'library']);
const TRIM_SERVICE = new Set(['kitchen', 'scullery', 'larder', 'servants', 'corrN', 'corr2w', 'corr2e', 'grady', 'sewing']);
const TRIM_NONE = new Set(['chapel', 'conserv']);
/* face bits for compile()'s faces() */
const F = Object.freeze({ PX: 1, NX: 2, PY: 4, NY: 8, PZ: 16, NZ: 32 });
const CLOTH_KEYS = new Set(['velvet', 'cloth', 'carpetGreyFloor', 'carpetWarmFloor', 'linen', 'blanket',
  'blanketBlue', 'blanketGreen', 'velvetPlum', 'velvetGreen', 'velvetBlack', 'leather']);

/* ==========================================================================
   The compile. One closure per (api, phase) so nothing here lives past the build.
   ========================================================================== */
export function makeManorBuilder(tools, plan = BLACKTHORN_PLAN) {
  const {
    CS, GX, GZ, LV, TALL_CEIL, ROOMS, DOORS, OPEN_PAIRS = [], RAIL_PAIRS = [],
    RAIL_SKIP = [], RAMPS = [], FLOOR_HOLES = [], CEIL_HOLES = [], CLAIM_DONOR,
    LIT_WINDOWS = [], EXTERIOR = 'blackthorn', FURN_BY_ROOM = null, SCARES = null,
  } = plan;
  const { kits, sash, PANE_WINDOW } = tools;

  function compile(api, phase) {
    const k = kits();
    const S = k.solid, G = k.glow;
    const padY = api.padY;
    const rng = api.rng;
    const isLand = phase === 'landmark';
    const isBody = !isLand;
    const isAvery = EXTERIOR === 'avery';
    // THE THREE CHANNELS (r3, 2026-09-18). MEASURED in the r3 evidence pass: one
    // brick-peel plaster map was on every surface in the house — walls, floors, ceilings,
    // rugs, pews, the stair — so every room read as one camouflage pattern. The body now
    // hands back three geometries: the plaster/stone solid (walls, marble, the cellar), a
    // TIMBER channel (boards, joinery, furniture: places.js draws it on the timber map) and
    // a CLOTH channel (bedding, upholstery, rugs, the people in the house: places.js's
    // people material and its weave). Two clones of existing programs, +2 draws a body, no
    // new program. The landmark keeps one channel: T and P alias S there.
    const T = isBody ? new tools.Kit() : S;
    const P = isBody ? new tools.Kit() : S;
    const kitOf = (mat) => (TIMBER_KEYS.has(mat) ? T : CLOTH_KEYS.has(mat) ? P : S);
    if (isBody) { k.timber = T; k.people = P; }

    // ---- frame helpers -----------------------------------------------------------
    const LX = (x) => x - HX, LZ = (z) => z - HZ, LY = (y) => padY + LIFT + y;
    /** A donor-frame box on the solid kit. */
    const box = (w, h, d, mat, x, y, z, ry) => {
      kitOf(mat).box(w, h, d, LX(x), LY(y), LZ(z), PALETTE[mat] || PALETTE.plaster, ry || 0);
    };
    // Exterior cut stone. A shallow bevel gives broad mouldings a lit face and a dark
    // underside without another material; it never emits collision or alters the plan.
    const cutStone = (w, h, d, mat, x, y, z, ry = 0, bevel = 0.045) => {
      const b = Math.min(bevel, w * 0.18, h * 0.18, d * 0.18);
      const shape = new THREE.Shape(), hw = w / 2 - b, hh = h / 2 - b;
      shape.moveTo(-hw, -hh); shape.lineTo(hw, -hh); shape.lineTo(hw, hh);
      shape.lineTo(-hw, hh); shape.closePath();
      const geometry = new THREE.ExtrudeGeometry(shape, { depth: d - b * 2, steps: 1,
        bevelEnabled: true, bevelSegments: 1, bevelSize: b, bevelThickness: b, curveSegments: 1 });
      geometry.translate(0, 0, -(d - b * 2) / 2);
      if (!geometry.index) geometry.setIndex(Array.from({ length: geometry.attributes.position.count }, (_, i) => i));
      S.at(geometry, PALETTE[mat] || PALETTE.stone, LX(x), LY(y), LZ(z), ry);
    };
    /**
     * Only the faces of a box anyone can see (r3 polish). The trim and the inside of a window
     * sit against a wall or against glass: a Kit.box there spends half its twelve triangles on
     * faces that are buried. Donor-frame extents, axis-aligned; `mask` of F.PX .. F.NZ.
     * Indexed, with a normal and a uv like every kit primitive (places.js projects the uvs).
     */
    const faces = (K, col, x0, x1, y0, y1, z0, z1, mask) => {
      const X0 = LX(x0), X1 = LX(x1), Y0 = LY(y0), Y1 = LY(y1), Z0 = LZ(z0), Z1 = LZ(z1);
      const pos = [], nor = [], idx = [];
      const quad = (a, b, c, d, n) => {
        const o = pos.length / 3;
        pos.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2], d[0], d[1], d[2]);
        for (let i = 0; i < 4; i++) nor.push(n[0], n[1], n[2]);
        idx.push(o, o + 1, o + 2, o, o + 2, o + 3);
      };
      if (mask & F.PX) quad([X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], [1, 0, 0]);
      if (mask & F.NX) quad([X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], [-1, 0, 0]);
      if (mask & F.PY) quad([X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0], [0, 1, 0]);
      if (mask & F.NY) quad([X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], [0, -1, 0]);
      if (mask & F.PZ) quad([X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], [0, 0, 1]);
      if (mask & F.NZ) quad([X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], [0, 0, -1]);
      if (!idx.length) return;
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(pos.length / 3 * 2), 2));
      g.setIndex(idx);
      K.push(g, col);
    };
    /** A donor-frame AABB collider. */
    const aabb = (x0, y0, z0, x1, y1, z1, tag, standable, climbable) => {
      api.emit({
        kind: 'obb', x: LX((x0 + x1) * 0.5), z: LZ((z0 + z1) * 0.5),
        halfX: (x1 - x0) * 0.5, halfZ: (z1 - z0) * 0.5, yaw: 0,
        y0: LY(y0), y1: LY(y1), tag: tag || 'wall', standable: !!standable, climbable,
      });
    };
    /** A donor-frame yawed box collider (door panels, furniture set at an angle). */
    // `breakable: false` for a thing whose drawing cannot come apart with it. collision.js
    // makes any box-shaped prop breakable by its SHAPE (round 18), and a prop that is not
    // bracketed on its kit (Kit.open/close) keeps its drawing when its collider goes: a
    // cabinet you could then walk through. Bracketed props (chairs, crates, barrels) leave
    // it undefined and really do come apart.
    const obb = (cx, cz, hx, hz, yaw, y0, y1, tag, standable, breakable) => {
      const s = {
        kind: 'obb', x: LX(cx), z: LZ(cz), halfX: hx, halfZ: hz, yaw: yaw || 0,
        y0: LY(y0), y1: LY(y1), tag: tag || 'wood', standable: !!standable,
      };
      if (breakable === false) s.breakable = false;
      api.emit(s);
    };
    const circle = (cx, cz, r, y0, y1, tag, standable, breakable) => {
      const s = { kind: 'circle', x: LX(cx), z: LZ(cz), r, y0: LY(y0), y1: LY(y1), tag: tag || 'wood', standable: !!standable };
      if (breakable === false) s.breakable = false;
      api.emit(s);
    };

    // ---- room registry & cell maps [donor :235-249] ----------------------------------
    const cellMaps = {}, roomsByLevel = {}, roomById = {};
    for (const level of Object.keys(ROOMS)) {
      cellMaps[level] = {};
      roomsByLevel[level] = [];
      for (const [id, name, x0, z0, x1, z1, opts] of ROOMS[level]) {
        const room = { id, name, level, x0, z0, x1, z1, ...opts };
        // A donor plan stays mechanically diffable. A CURFEW adapter may dress its rooms
        // with this compiler's existing prop vocabulary without rewriting the source table.
        if (!room.furn && FURN_BY_ROOM && FURN_BY_ROOM[id]) room.furn = FURN_BY_ROOM[id];
        room.wx0 = x0 * CS; room.wz0 = z0 * CS; room.wx1 = (x1 + 1) * CS; room.wz1 = (z1 + 1) * CS;
        room.cx = (room.wx0 + room.wx1) / 2; room.cz = (room.wz0 + room.wz1) / 2;
        roomsByLevel[level].push(room);
        roomById[id] = room;
        for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) cellMaps[level][cx + ',' + cz] = room;
      }
    }
    const cellRoom = (level, cx, cz) => { const m = cellMaps[level]; return m ? (m[cx + ',' + cz] || null) : null; };

    // ---- door specs by edge key [donor :252-256, :305-311] ---------------------------
    const edgeKey = (level, cx, cz, dir) => {
      if (dir === 'N') return { key: level + '|H|' + cx + '|' + cz, axis: 'H', ex: cx, ez: cz };
      if (dir === 'S') return { key: level + '|H|' + cx + '|' + (cz + 1), axis: 'H', ex: cx, ez: cz + 1 };
      if (dir === 'W') return { key: level + '|V|' + cx + '|' + cz, axis: 'V', ex: cx, ez: cz };
      return { key: level + '|V|' + (cx + 1) + '|' + cz, axis: 'V', ex: cx + 1, ez: cz };
    };
    const doorSpecs = {};
    const doorPoints = [];     // donor metres: furniture clearance and matching trim openings
    for (const [level, cx, cz, dir, opts] of DOORS) {
      const kk = edgeKey(level, cx, cz, dir);
      (doorSpecs[kk.key] = doorSpecs[kk.key] || []).push({ level, cx, cz, dir, opts, ...kk });
      const along0 = (kk.axis === 'H' ? kk.ex : kk.ez) * CS;
      doorPoints.push({
        level, x: kk.axis === 'H' ? along0 + CS / 2 : kk.ex * CS,
        z: kk.axis === 'H' ? kk.ez * CS : along0 + CS / 2,
        axis: kk.axis,
        width: opts.w || (opts.type === 'double' || opts.type === 'front' ? DBL_W : opts.type === 'arch' ? 2.6 : DOOR_W),
      });
    }
    const floorHoles = {}, ceilHoles = {};
    for (const [lvl, a, b, c, d] of FLOOR_HOLES) for (let cx = a; cx <= c; cx++) for (let cz = b; cz <= d; cz++) floorHoles[lvl + '|' + cx + ',' + cz] = true;
    for (const [lvl, a, b, c, d] of CEIL_HOLES) for (let cx = a; cx <= c; cx++) for (let cz = b; cz <= d; cz++) ceilHoles[lvl + '|' + cx + ',' + cz] = true;
    const isFloorHole = (level, cx, cz) => !!floorHoles[level + '|' + cx + ',' + cz];

    // ---- wall colliders, collected per line and MERGED before they are emitted -------
    // The donor emits one AABB per wall slice; a 60 m corridor wall is thirty of them.
    // Runs of slices on one line with one height are one collider here (capped at
    // MAX_RUN), which is a third of the count and the same wall.
    const wallRuns = [];
    const wallCollider = (axis, line, a0, a1, y0, y1, t) => { wallRuns.push({ axis, line, a0, a1, y0, y1, t }); };
    const flushWallRuns = () => {
      wallRuns.sort((p, q) => (p.axis < q.axis ? -1 : p.axis > q.axis ? 1 : p.line - q.line || p.y0 - q.y0 || p.y1 - q.y1 || p.a0 - q.a0));
      let i = 0;
      while (i < wallRuns.length) {
        const r = wallRuns[i];
        let a0 = r.a0, a1 = r.a1, j = i + 1;
        while (j < wallRuns.length) {
          const n = wallRuns[j];
          if (n.axis !== r.axis || n.line !== r.line || n.y0 !== r.y0 || n.y1 !== r.y1 || n.t !== r.t) break;
          if (n.a0 > a1 + 0.02 || n.a1 - a0 > MAX_RUN) break;
          a1 = Math.max(a1, n.a1); j++;
        }
        if (r.axis === 'H') aabb(a0, r.y0, r.line - r.t / 2, a1, r.y1, r.line + r.t / 2, 'wall');
        else aabb(r.line - r.t / 2, r.y0, a0, r.line + r.t / 2, r.y1, a1, 'wall');
        i = j;
      }
      wallRuns.length = 0;
    };

    // ---- emitWall [donor :392-432] ---------------------------------------------------
    // `outer` is which side faces outdoors ('N', 'P' or null). The landmark phase draws
    // only the outer half-slab of an exterior wall; the body phase draws the inner half
    // of an exterior wall and both halves of an interior one.
    // `up` ({ n, p }: a material per side, or null) is what a DOUBLE-HEIGHT wall wears above
    // the ground ceiling on a side whose own room is not tall. r3 polish, MEASURED in the
    // critic's shots: the library's side of the foyer wall ran up past the library ceiling into
    // Lady Constance's room, so her east wall was the library's barn planks from floor to
    // ceiling. Up there it is the room upstairs, and it wears that room's paper. Drawing only:
    // the colliders below are computed exactly as before.
    const WALL_SPLIT = LV.ground.ceil;
    function emitWall(axis, ex, ez, y0, y1, holes, matN, matP, t, outer, withCollider, up, level) {
      const along0 = (axis === 'H' ? ex : ez) * CS;
      const along1 = along0 + CS;
      const cuts = [along0, along1];
      for (const h of holes) { cuts.push(Math.max(along0, h.a0), Math.min(along1, h.a1)); }
      cuts.sort((p, q) => p - q);
      const drawN = outer === 'N' ? isLand : (outer === 'P' ? isBody : isBody);
      const drawP = outer === 'P' ? isLand : (outer === 'N' ? isBody : isBody);
      const plane = (axis === 'H' ? ez : ex) * CS;
      for (let i = 0; i < cuts.length - 1; i++) {
        const s0 = cuts[i], s1 = cuts[i + 1];
        if (s1 - s0 < 0.01) continue;
        const smid = (s0 + s1) / 2;
        const ycuts = [y0, y1];
        const sliceHoles = holes.filter(h => h.a0 < smid && h.a1 > smid);
        for (const h of sliceHoles) { ycuts.push(Math.max(y0, h.y0), Math.min(y1, h.y1)); }
        ycuts.sort((p, q) => p - q);
        // A window hole is a wall to a body: the collider runs the full height at a
        // slice whose holes are all windows. A door hole (flagged `door`) gets no
        // collider, which is what makes it a doorway. MEASURED 2026-09-03 (tests/manor.mjs,
        // the first-floor walk): judged by height alone, the gallery's arch onto the
        // upstairs corridor - a hole starting 4.2 m up a 7.4 m foyer wall - was a window,
        // and the whole first floor was walled off from the stair that reaches it.
        const windowSlice = sliceHoles.length > 0 && sliceHoles.every(h => !h.door);
        if (withCollider && windowSlice) wallCollider(axis, plane, s0, s1, y0, y1, t);
        for (let j = 0; j < ycuts.length - 1; j++) {
          const v0 = ycuts[j], v1 = ycuts[j + 1];
          if (v1 - v0 < 0.01) continue;
          const vmid = (v0 + v1) / 2;
          if (sliceHoles.some(h => vmid > h.y0 && vmid < h.y1)) continue;
          const len = s1 - s0;
          // THE BODY DRAWS ONLY WHAT SHOWS (r3 polish). A half-slab's back face is at the wall's
          // centre plane, against the other half (or the facade's, or the plinth fill); its top is
          // under a ceiling slab and its bottom on a floor slab, both of which run to the cell
          // line; and a piece over or under a hole butts solid wall at both ends. None of those
          // faces can be seen, and they were a third of the house's wall triangles. Kept: the face
          // to the room, every reveal (the sides of a hole), the ends at a cell line (a wall may
          // stop there), and the top or bottom next to a stairwell, where there is no slab.
          // The landmark (the facade) is unchanged.
          const side = (m, mu, sd) => {
            const nbx = sd < 0 ? (axis === 'H' ? ex : ex - 1) : ex, nbz = sd < 0 ? (axis === 'H' ? ez - 1 : ez) : ez;
            const openBelow = isFloorHole(level, nbx, nbz), openAbove = !!ceilHoles[level + '|' + nbx + ',' + nbz];
            const solidAt = (at, a, b) => !holes.some(h => h.a0 < at && h.a1 > at && h.y0 < b - 0.01 && h.y1 > a + 0.01);
            const half = (a, b, mm, splitBelow, splitAbove) => {
              if (!isBody) {
                const hh = b - a, ym = (a + b) / 2;
                if (axis === 'H') box(len, hh, t / 2, mm, smid, ym, plane + sd * t / 4);
                else box(t / 2, hh, len, mm, plane + sd * t / 4, ym, smid);
                return;
              }
              const FR = axis === 'H' ? (sd < 0 ? F.NZ : F.PZ) : (sd < 0 ? F.NX : F.PX);
              const BK = axis === 'H' ? (sd < 0 ? F.PZ : F.NZ) : (sd < 0 ? F.PX : F.NX);
              const LO = axis === 'H' ? F.NX : F.NZ, HI = axis === 'H' ? F.PX : F.PZ;
              let mask = FR;
              // a cellar wall with nothing drawn on its far side (the sealed void under the
              // ground floor) keeps its back: seen from there, it is still a wall
              if (outer && level === 'basement') mask |= BK;
              if (!splitAbove && (b < y1 - 0.01 || openAbove)) mask |= F.PY;
              if (!splitBelow && (a > y0 + 0.01 || openBelow)) mask |= F.NY;
              const col0 = s0 <= along0 + 0.005, col1 = s1 >= along1 - 0.005;
              if (!sliceHoles.length || col0 || !solidAt(s0 - 0.005, a, b)) mask |= LO;
              if (!sliceHoles.length || col1 || !solidAt(s1 + 0.005, a, b)) mask |= HI;
              const c0 = plane, c1 = plane + sd * t / 2;
              const col = PALETTE[mm] || PALETTE.plaster;
              if (axis === 'H') faces(kitOf(mm), col, s0, s1, a, b, Math.min(c0, c1), Math.max(c0, c1), mask);
              else faces(kitOf(mm), col, Math.min(c0, c1), Math.max(c0, c1), a, b, s0, s1, mask);
            };
            if (!mu || v1 <= WALL_SPLIT + 0.01) half(v0, v1, m, false, false);
            else if (v0 >= WALL_SPLIT - 0.01) half(v0, v1, mu, false, false);
            else { half(v0, WALL_SPLIT, m, false, true); half(WALL_SPLIT, v1, mu, true, false); }
          };
          if (drawN) side(matN, up && up.n, -1);
          if (drawP) side(matP, up && up.p, 1);
          if (withCollider && !windowSlice && v0 <= y0 + 0.01) wallCollider(axis, plane, s0, s1, y0, v1, t);
          // THE WALL ABOVE A GROUND DOOR ON A DOUBLE-HEIGHT WALL. MEASURED 2026-09-18
          // (r3 walk-through census, five clusters on the first floor at pad + 7.4): the
          // slice over the library's double door, the dining room's, the foyer arch and
          // the ballroom doors is drawn up to the first-floor ceiling, but only the LOWEST
          // slice ever had a collider, so from the upstairs corridor, Lady Constance's
          // room and the gallery over the front door you walked straight out through
          // painted wall and fell into the room below. The lintel slice gets its own
          // collider whenever it reaches up into a floor people walk on.
          else if (withCollider && !windowSlice && y0 < LV.first.floor - 1 && v1 > LV.first.floor + 0.3) {
            wallCollider(axis, plane, s0, s1, v0, v1, t);
          }
        }
      }
    }

    // ---- windows [donor :434-462] ----------------------------------------------------
    // Dark glass in the hole and a sash proud of it on the outside, both on the landmark
    // (the facade). The glow pane, for the seven windows in LIT_WINDOWS, is on the body's
    // glow kit: places.js shows a body glow only once the place is claimed. Every other
    // window in the house stays dark glass, which is what a derelict house has.
    function spawnWindow(key, axis, px, pz, mid, y0, y1, w, isX, t, outward, stone) {
      const h = y1 - y0, cy = (y0 + y1) / 2;
      const ry = axis === 'H' ? (outward > 0 ? 0 : Math.PI) : (outward > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
      // donor frame -> local is a translation: the facing is the donor's own
      const lry = ry;
      const gx = isX ? mid : px, gz = isX ? pz : mid;
      if (isLand) {
        S.quad(w, h, LX(gx), LY(cy), LZ(gz), PALETTE.pane, lry, 0);
        sash(S, w, h, LX(gx), LY(cy), LZ(gz), PALETTE.woodDark, lry, 0, w > 1.4 ? 2 : 1, h > 3 ? 4 : 2, 0.07, t * 0.5 + 0.02);
        // Avery's long facade needed authored rhythm, not sixty identical black squares.
        // Deterministic boarded windows make the abandonment readable from the road while
        // preserving the five panes that become a completion beacon.
        let hash = 0;
        for (let i = 0; i < key.length; i++) hash = ((hash * 31) + key.charCodeAt(i)) | 0;
        if (!isAvery) {
          const cs = Math.cos(ry), sn = Math.sin(ry);
          const at = (a, yy, proud) => [gx + a * cs + proud * sn, yy, gz - a * sn + proud * cs];
          // The glass remains at the bottom of the original hole. These projecting
          // hoods, carved sills and jambs give every opening a genuine shadow pocket.
          cutStone(w + .72,.23,.70,'stone',...at(0,y1+.22,t/2+.25),ry,.04);
          box(w + .39,.11,.35,'stoneDark',...at(0,y1+.07,t/2+.10),ry);
          cutStone(w + .49,.20,.55,'stone',...at(0,y0-.12,t/2+.17),ry,.035);
          for (const side of [-1,1]) {
            box(.15,h+.16,.22,'stone',...at(side*(w/2+.08),cy,t/2+.055),ry);
            box(.034,h,.27,'stoneDark',...at(side*(w/2-.014),cy,.13),ry);
            box(.20,.35,.39,'stoneDark',...at(side*(w/2+.23),y1-.055,t/2+.16),ry);
          }
          if (Math.abs(hash)%3===0) box(.23,.29,.27,'stone',...at(0,y1+.17,t/2+.49),ry);
        }
        if (isAvery && LIT_WINDOWS.indexOf(key) < 0 && Math.abs(hash) % 4 === 0) {
          const proud = outward * (t * 0.5 + 0.10);
          for (const yy of [-0.24, 0.27]) {
            if (isX) S.box(w + 0.30, 0.17, 0.13, LX(gx), LY(cy + yy * h), LZ(gz + proud), PALETTE.averyTrim);
            else S.box(0.13, 0.17, w + 0.30, LX(gx + proud), LY(cy + yy * h), LZ(gz), PALETTE.averyTrim);
          }
        }
      } else {
        if (LIT_WINDOWS.indexOf(key) >= 0) {
          // 0.03 outside the glass (so the glass cannot z-fight it) and BEHIND the sash
          // bars, which stand 0.16-0.28 proud of the plane and cut the glow up the way
          // sites.js's sash() note says a lit window has to be cut up.
          const ox = isX ? 0 : outward * 0.03, oz = isX ? outward * 0.03 : 0;
          G.pane(w, h, LX(gx + ox), LY(cy), LZ(gz + oz), PANE_WINDOW, lry, 0, 4, 5);
        }
        // THE INSIDE OF A WINDOW (r3 polish). MEASURED in the critic's shots: from inside, every
        // pane in both houses was a flat rectangle at the bottom of a plaster hole, no frame,
        // no sill, no depth: a placeholder. Now the sash frame and its bars stand in the hole on
        // the room side of the glass, a window board lies across the bottom of the opening and
        // runs 5.5 cm out into the room, and a narrow casing goes round it on the wall face.
        // Everything stays inside the 6 cm that onWindow() keeps tall furniture off the glass,
        // and above the sill, where anything shorter than the sill may stand. No collider: the
        // board is 5.5 cm proud at 1 m, the casing 2 cm. Triangles only, on the timber channel.
        const K = stone ? S : T, col = stone ? PALETTE.stoneDark : PALETTE.woodDark;
        const inward = -outward, face = t / 2, plane = isX ? gz : gx;
        // (along, across, y) extents -> a faces() call. across is measured INTO the room.
        const FRONT = isX ? (inward > 0 ? F.PZ : F.NZ) : (inward > 0 ? F.PX : F.NX);
        const UP_A = isX ? F.PX : F.PZ, DN_A = isX ? F.NX : F.NZ;
        const part = (a0, a1, b0, b1, v0, v1, mask) => {
          const c0 = plane + inward * b0, c1 = plane + inward * b1;
          if (isX) faces(K, col, a0, a1, v0, v1, Math.min(c0, c1), Math.max(c0, c1), mask);
          else faces(K, col, Math.min(c0, c1), Math.max(c0, c1), v0, v1, a0, a1, mask);
        };
        const L0 = mid - w / 2, L1 = mid + w / 2, fw = 0.055, bw = 0.045, d0 = 0.013, d1 = 0.107;
        const yb = y0 + 0.035;                                         // the top of the board
        part(L0, L1, d0, d1, y1 - fw, y1, FRONT | F.NY);                // the frame: head,
        part(L0, L1, d0, d1, yb, yb + fw, FRONT | F.PY);                // bottom rail,
        part(L0, L0 + fw, d0, d1, yb + fw, y1 - fw, FRONT | UP_A);      // and the two stiles
        part(L1 - fw, L1, d0, d1, yb + fw, y1 - fw, FRONT | DN_A);
        const cols = w > 1.4 ? 2 : 1, rows = h > 3 ? 4 : 2;
        for (let i = 1; i < cols; i++) {
          const a = L0 + w * i / cols;
          part(a - bw / 2, a + bw / 2, d0, d1, yb + fw, y1 - fw, FRONT | UP_A | DN_A);
        }
        for (let j = 1; j < rows; j++) {
          const v = yb + fw + (y1 - fw - yb - fw) * j / rows;
          part(L0 + fw, L1 - fw, d0, d1, v - bw / 2, v + bw / 2, FRONT | F.PY | F.NY);
        }
        // the window board, across the bottom of the opening and 5.5 cm out into the room
        part(L0 - 0.05, L1 + 0.05, 0.02, face + 0.055, y0, yb, FRONT | F.PY | F.NY | UP_A | DN_A);
        // the casing on the wall face: two jambs standing on the board, and a head
        part(L0 - 0.05, L0, face - 0.005, face + 0.02, yb, y1, FRONT | DN_A | UP_A);
        part(L1, L1 + 0.05, face - 0.005, face + 0.02, yb, y1, FRONT | UP_A | DN_A);
        part(L0 - 0.05, L1 + 0.05, face - 0.005, face + 0.02, y1, y1 + 0.05, FRONT | F.PY | F.NY);
      }
    }

    // ---- doors: a frame, and a panel hanging open on its hinge, or nothing ------------
    // No mechanics this round. `gone` doors are an empty frame; everything else stands
    // open into the room it was declared from. The panel carries a collider (an open
    // door is a thin wall along the wall it hangs from) and never blocks the opening.
    function spawnDoor(spec, isX, mid, y0, w, h, t, plane, noFrame) {
      if (!isBody) return;
      const o = spec.opts;
      if (o.merge) return;
      const fm = 'woodDark';
      if (o.type !== 'secret' && !noFrame) {
        const ft = 0.34;
        if (isX) {
          box(0.12, h, ft, fm, mid - w / 2 - 0.04, y0 + h / 2, plane);
          box(0.12, h, ft, fm, mid + w / 2 + 0.04, y0 + h / 2, plane);
          box(w + 0.24, 0.14, ft, fm, mid, y0 + h + 0.07, plane);
        } else {
          box(ft, h, 0.12, fm, plane, y0 + h / 2, mid - w / 2 - 0.04);
          box(ft, h, 0.12, fm, plane, y0 + h / 2, mid + w / 2 + 0.04);
          box(ft, 0.14, w + 0.24, fm, plane, y0 + h + 0.07, mid);
        }
      }
      if (o.type === 'secret') return;                 // the priest hole: an opening now
      if (o.dynamic === 'refuge') return;              // Refuge owns this one persistent leaf
      const gone = !o.type && rng.next() < 0.25;       // a derelict house loses doors
      if (gone) return;
      // which way it opens: into the declared cell (N/W: the cell is on the - side)
      const into = (spec.dir === 'N' || spec.dir === 'W') ? -1 : 1;
      const panels = (o.type === 'double') ? 2 : 1;
      for (let p = 0; p < panels; p++) {
        const len = panels === 2 ? w / 2 - 0.02 : w - 0.03;
        const hingeAlong = panels === 2 ? (p === 0 ? mid - w / 2 : mid + w / 2) : mid - w / 2;
        const sign = panels === 2 ? (p === 0 ? 1 : -1) : 1;
        // open angle: 1.35-1.75 rad off the wall, swung to the `into` side
        const ang = rng.range(1.35, 1.75) * into * sign;
        // panel centre = hinge + R(ang) * (sign * len/2 along the wall)
        let cxD, czD, yaw;
        if (isX) {
          cxD = hingeAlong + Math.cos(ang) * sign * len / 2;
          czD = plane - Math.sin(ang) * sign * len / 2;
          yaw = ang;
        } else {
          cxD = plane + Math.sin(ang) * sign * len / 2;
          czD = hingeAlong + Math.cos(ang) * sign * len / 2;
          yaw = Math.PI * 0.5 - ang;
        }
        T.box(len, h - 0.04, 0.09, LX(cxD), LY(y0 + h / 2), LZ(czD), PALETTE.doorWood, yaw);
        // the knob, a dark brass sphere on the free edge
        S.cyl(0.045, 0.045, 0.06, 6, LX(cxD), LY(y0 + 1.05), LZ(czD), PALETTE.brass, yaw, Math.PI * 0.5, 0);
        obb(cxD, czD, len / 2, 0.06, yaw, y0, y0 + h, 'wood');
      }
    }

    // ---- balustrade [donor :493-518] --------------------------------------------------
    function balustrade(x0, z0, x1, z1, y) {
      if (!isBody) return;
      const len = Math.hypot(x1 - x0, z1 - z0);
      const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
      const isX = Math.abs(x1 - x0) > Math.abs(z1 - z0);
      if (isX) {
        box(len, 0.09, 0.14, 'woodDark', cx, y + 1.0, cz);
        box(len, 0.06, 0.10, 'woodDark', cx, y + 0.06, cz);
      } else {
        box(0.14, 0.09, len, 'woodDark', cx, y + 1.0, cz);
        box(0.10, 0.06, len, 'woodDark', cx, y + 0.06, cz);
      }
      // balusters every 0.5 m (the donor's 0.33 is 180 posts on this house; 0.5 reads
      // the same at torch range and is 120)
      const n = Math.max(2, Math.round(len / 0.5));
      for (let i = 0; i <= n; i++) {
        const f = i / n;
        box(0.055, 0.9, 0.055, 'woodDark', x0 + (x1 - x0) * f, y + 0.5, z0 + (z1 - z0) * f);
      }
      aabb(Math.min(x0, x1) - 0.07, y, Math.min(z0, z1) - 0.07, Math.max(x0, x1) + 0.07, y + 1.05, Math.max(z0, z1) + 0.07, 'wood');
    }
    function emitRail(level, axis, ex, ez) {
      const L = LV[level];
      const along0 = (axis === 'H' ? ex : ez) * CS;
      balustrade(
        axis === 'H' ? along0 : ex * CS, axis === 'H' ? ez * CS : along0,
        axis === 'H' ? along0 + CS : ex * CS, axis === 'H' ? ez * CS : along0 + CS, L.floor);
    }
    // THE STAIR RAIL (r3 polish). The donor built a sloped rail out of level balustrade
    // segments, and side-on, MEASURED in the critic's shots, it was a stepped ladder of flat
    // frames like scaffolding on the hero view of the house. Now each flight has ONE pitched
    // handrail and ONE pitched closed string along the stair's side (half in it, so it covers
    // the steps' sawtooth ends), balusters standing on the string every ~0.3 m, and a newel
    // post with a cap at each end of each flight, shared where two flights meet. The rail
    // runs through the stair nosings + 1.0 m, where the stepped segments' middles were. The
    // COLLIDERS are still level steps (a collider cannot pitch), but finer, one per 0.21 m of
    // rise, and each reaches from its low end's line to 1.05 m over its HIGH end's: MEASURED
    // (r3 walk-through census) with the old four, the drawn rail stood up to 0.26 m over the
    // collider at the top of each step, a rail you could have jumped through. Now nothing drawn
    // is outside them; they stand at most 0.21 m over the rail. Each newel has its own.
    const newels = new Set();
    function railSlope(x0, z0, x1, z1, yA, yB, segs) {
      if (!isBody) return;
      const n = Math.max(segs || 4, Math.ceil(Math.abs(yB - yA) / 0.21));
      for (let i = 0; i < n; i++) {
        const f0 = i / n, f1 = (i + 1) / n;
        const ya = yA + (yB - yA) * f0, yb = yA + (yB - yA) * f1;
        const ax0 = x0 + (x1 - x0) * f0, az0 = z0 + (z1 - z0) * f0, ax1 = x0 + (x1 - x0) * f1, az1 = z0 + (z1 - z0) * f1;
        aabb(Math.min(ax0, ax1) - 0.07, Math.min(ya, yb) - 0.1, Math.min(az0, az1) - 0.07, Math.max(ax0, ax1) + 0.07, Math.max(ya, yb) + 1.05, Math.max(az0, az1) + 0.07, 'wood');
      }
      const dx = x1 - x0, dz = z1 - z0, run = Math.hypot(dx, dz), rise = yB - yA, L = Math.hypot(run, rise);
      const isX = Math.abs(dx) > Math.abs(dz);
      const mx = (x0 + x1) / 2, mz = (z0 + z1) / 2, my = (yA + yB) / 2, col = PALETTE.woodDark;
      const pitched = (w, h, len, cy) => {
        if (isX) T.box(len, h, w, LX(mx), LY(cy), LZ(mz), col, 0, 0, Math.atan2(rise, dx));
        else T.box(w, h, len, LX(mx), LY(cy), LZ(mz), col, 0, Math.atan2(-rise, dz), 0);
      };
      pitched(0.12, 0.09, L, my + 1.0);              // the handrail
      pitched(0.05, 0.32, L - 0.12, my - 0.12);      // the closed string, its ends inside the newels
      const nb = Math.max(2, Math.round(run / 0.3));
      for (let k = 0; k < nb; k++) {
        const t = (k + 0.5) / nb, ly = yA + rise * t;
        T.box(0.045, 0.915, 0.045, LX(x0 + dx * t), LY(ly + 0.04 + 0.4575), LZ(z0 + dz * t), col);
      }
      for (const [px, pz, py] of [[x0, z0, yA], [x1, z1, yB]]) {
        const key = px.toFixed(2) + ',' + pz.toFixed(2) + ',' + py.toFixed(2);
        if (newels.has(key)) continue;
        newels.add(key);
        T.box(0.15, 1.22, 0.15, LX(px), LY(py + 0.61), LZ(pz), col);
        T.box(0.2, 0.05, 0.2, LX(px), LY(py + 1.245), LZ(pz), col);
        aabb(px - 0.08, py, pz - 0.08, px + 0.08, py + 1.27, pz + 0.08, 'wood');
      }
    }

    // ---- walls: every cell edge of every level [donor :313-390] ----------------------
    const openSet = new Set(OPEN_PAIRS.map(p => p.slice().sort().join('|')));
    const railSet = new Set(RAIL_PAIRS.map(p => p.slice().sort().join('|')));
    const railSkip = new Set(RAIL_SKIP);
    const fullHeightEdges = new Set();
    // every window hole, so furniture can keep off the glass (a bookcase stood in front of a
    // window in the library, a fireplace in front of the dining room's)
    const windowHoles = [];
    function buildWallsFor(level) {
      const L = LV[level];
      for (const axis of ['H', 'V']) {
        const xMax = axis === 'V' ? GX + 1 : GX;
        const zMax = axis === 'H' ? GZ + 1 : GZ;
        for (let ex = 0; ex < xMax; ex++) for (let ez = 0; ez < zMax; ez++) {
          let a, b;
          if (axis === 'H') { a = cellRoom(level, ex, ez - 1); b = cellRoom(level, ex, ez); }
          else { a = cellRoom(level, ex - 1, ez); b = cellRoom(level, ex, ez); }
          if (a === b) continue;
          if (!a && !b) continue;
          const pairKey = a && b ? [a.id, b.id].sort().join('|') : null;
          if (pairKey && openSet.has(pairKey)) continue;
          const gKey = 'ground|' + axis + '|' + ex + '|' + ez;
          const key = level + '|' + axis + '|' + ex + '|' + ez;
          if (pairKey && railSet.has(pairKey)) {
            if (!railSkip.has(key)) emitRail(level, axis, ex, ez);
            continue;
          }
          if (level !== 'ground' && fullHeightEdges.has(gKey)) continue;
          if ((a && a.void) || (b && b.void)) {
            if (!a || !b) continue;
          }
          const exterior = !a || !b;
          const room = a || b;
          const tall = level === 'ground' && ((a && a.tall) || (b && b.tall));
          const yBase = L.floor;
          const yTop = tall ? TALL_CEIL : L.ceil;
          if (tall) fullHeightEdges.add(gKey);
          // THE SPLIT. The landmark owns the facade: exterior edges of the two lived
          // floors. The body owns everything inside, and the cellar walls entirely (their
          // outer faces stand inside the plinth fill and are never seen).
          const facade = exterior && level !== 'basement';
          if (isLand && !facade) continue;
          const outer = !exterior ? null : (!a ? 'N' : 'P');
          const withCollider = isLand ? facade : !facade;

          const t = exterior ? EXT_T : WALL_T;
          let px, pz, along0, isX;
          if (axis === 'H') { isX = true; along0 = ex * CS; px = along0 + CS / 2; pz = ez * CS; }
          else { isX = false; along0 = ez * CS; px = ex * CS; pz = along0 + CS / 2; }
          const plane = isX ? pz : px;

          const holes = [];
          const specsHere = (doorSpecs[key] || []).slice();
          if (tall) {
            const k1 = 'first|' + axis + '|' + ex + '|' + ez;
            for (const s of (doorSpecs[k1] || [])) specsHere.push({ ...s, yOff: LV.first.floor });
          }
          for (const s of specsHere) {
            const o = s.opts;
            const yo = s.yOff || yBase;
            const hw = o.w || (o.type === 'double' || o.type === 'front' ? DBL_W : o.type === 'arch' ? 2.6 : DOOR_W);
            const hh = o.h || (o.type === 'double' || o.type === 'front' ? DBL_H : o.type === 'arch' ? 3.0 : DOOR_H);
            const mid = along0 + CS / 2;
            // `door` marks a hole that starts at a FLOOR (the ground's, or the first floor's on
            // a double-height wall): it gets no collider. A window hole is a wall to a body.
            holes.push({ a0: mid - hw / 2, a1: mid + hw / 2, y0: yo, y1: yo + hh, door: true });
            if (!o.type || o.type === 'double' || o.type === 'front' || o.type === 'secret') {
              if (!isLand || o.id === 'front') {
                // the front door's frame belongs to the facade; its panels to the body
                if (isBody) spawnDoor(s, isX, mid, yo, hw, hh, t, plane, o.id === 'front');
                else if (isX) {
                  box(0.14, hh, t + 0.1, 'woodDark', mid - hw / 2 - 0.05, yo + hh / 2, plane);
                  box(0.14, hh, t + 0.1, 'woodDark', mid + hw / 2 + 0.05, yo + hh / 2, plane);
                  box(hw + 0.28, 0.16, t + 0.1, 'woodDark', mid, yo + hh + 0.08, plane);
                }
              }
            } else if (o.type === 'arch' && !o.merge && isBody) {
              if (isX) box(hw + 0.3, 0.25, t + 0.16, 'woodDark', mid, yo + hh + 0.1, pz);
              else box(t + 0.16, 0.25, hw + 0.3, 'woodDark', px, yo + hh + 0.1, mid);
            }
          }

          // windows on exterior walls [donor :434-462]
          if (exterior && level !== 'basement' && !room.void && holes.length === 0 && room.windows !== false) {
            const gothic = room.gothic, conserv = room.conservatory;
            const idx = axis === 'H' ? ex : ez;
            if (idx % 2 === 1) {
              const mid = along0 + CS / 2;
              let wy0 = yBase + 1.0, wy1 = yBase + 2.7, ww = 1.3;
              if (gothic) { wy0 = yBase + 1.2; wy1 = yBase + 6.2; ww = 1.2; }
              if (conserv) { wy0 = yBase + 0.5; wy1 = yBase + 3.3; ww = 1.6; }
              holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy0, y1: wy1 });
              windowHoles.push({ level, axis, plane, a0: mid - ww / 2, a1: mid + ww / 2, y0: wy0, y1: wy1 });
              const outward = outer === 'N' ? -1 : 1;
              spawnWindow(key, axis, px, pz, mid, wy0, wy1, ww, isX, t, outward, room.wall === 'stone');
              if (tall && !gothic) {
                const wy2 = LV.first.floor + 1.0, wy3 = LV.first.floor + 2.7;
                holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy2, y1: wy3 });
                windowHoles.push({ level: 'first', axis, plane, a0: mid - ww / 2, a1: mid + ww / 2, y0: wy2, y1: wy3 });
                spawnWindow('first|' + axis + '|' + ex + '|' + ez, axis, px, pz, mid, wy2, wy3, ww, isX, t, outward, room.wall === 'stone');
              }
            }
          }

          const outsideMat = isAvery ? 'averyFacade' : 'facade';
          const matN = a && !a.void ? (a.wall || 'plaster') : outsideMat;
          const matP = b && !b.void ? (b.wall || 'plaster') : outsideMat;
          let up = null;
          if (tall && isBody) {
            const aU = a && !a.tall ? (axis === 'H' ? cellRoom('first', ex, ez - 1) : cellRoom('first', ex - 1, ez)) : null;
            const bU = b && !b.tall ? cellRoom('first', ex, ez) : null;
            const nU = aU && !aU.void && aU.wall && aU.wall !== matN ? aU.wall : null;
            const pU = bU && !bU.void && bU.wall && bU.wall !== matP ? bU.wall : null;
            if (nU || pU) up = { n: nU, p: pU };
          }
          emitWall(axis, ex, ez, yBase, yTop, holes, matN, matP, t, outer, withCollider, up, level);
        }
      }
    }

    // ---- floors & ceilings [donor :270-291], one slab per room where it can be ----------
    // The donor lays one 2 m box per cell. A room with no stair hole is ONE box and ONE
    // standable collider here (split at MAX_RUN); a room with a hole falls back to cells
    // for the geometry and to the rectangle-minus-hole for its collider.
    function subtractRect(r, h) {
      // r, h: {x0,z0,x1,z1}; returns up to four rects covering r minus h
      const out = [];
      const ix0 = Math.max(r.x0, h.x0), ix1 = Math.min(r.x1, h.x1);
      const iz0 = Math.max(r.z0, h.z0), iz1 = Math.min(r.z1, h.z1);
      if (ix0 >= ix1 || iz0 >= iz1) return [r];
      if (r.z0 < iz0) out.push({ x0: r.x0, z0: r.z0, x1: r.x1, z1: iz0 });
      if (iz1 < r.z1) out.push({ x0: r.x0, z0: iz1, x1: r.x1, z1: r.z1 });
      if (r.x0 < ix0) out.push({ x0: r.x0, z0: iz0, x1: ix0, z1: iz1 });
      if (ix1 < r.x1) out.push({ x0: ix1, z0: iz0, x1: r.x1, z1: iz1 });
      return out;
    }
    function floorCollider(rect, y, thickness = FLOOR_T) {
      // split long slabs so no half-extent passes MAX_RUN / 2 (the corridors are 60 m)
      const nx = Math.ceil((rect.x1 - rect.x0) / MAX_RUN), nz = Math.ceil((rect.z1 - rect.z0) / MAX_RUN);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x0 = rect.x0 + (rect.x1 - rect.x0) * i / nx, x1 = rect.x0 + (rect.x1 - rect.x0) * (i + 1) / nx;
        const z0 = rect.z0 + (rect.z1 - rect.z0) * j / nz, z1 = rect.z0 + (rect.z1 - rect.z0) * (j + 1) / nz;
        aabb(x0, y - thickness, z0, x1, y, z1, 'stone', true, false);
      }
    }
    function buildFloors() {
      if (!isBody) return;
      for (const level of Object.keys(ROOMS)) {
        const L = LV[level];
        for (const room of roomsByLevel[level]) {
          if (room.void) continue;
          const fm = room.floor, cm = room.conservatory ? 'glass' : 'ceiling';
          const ceilY = room.tall ? TALL_CEIL : L.ceil;
          let anyFloorHole = false, anyCeilHole = false;
          for (let cx = room.x0; cx <= room.x1 && !(anyFloorHole && anyCeilHole); cx++) {
            for (let cz = room.z0; cz <= room.z1; cz++) {
              if (floorHoles[level + '|' + cx + ',' + cz]) anyFloorHole = true;
              if (ceilHoles[level + '|' + cx + ',' + cz]) anyCeilHole = true;
            }
          }
          const rect = { x0: room.wx0, z0: room.wz0, x1: room.wx1, z1: room.wz1 };
          // THE CELLAR FLOOR IS THE PAD. Its slab is a 0.04 m skin of stone on the
          // terrain with no collider: a collider top at padY would fight the ground.
          const cellar = level === 'basement';
          if (!anyFloorHole) {
            if (cellar) box(rect.x1 - rect.x0, 0.04, rect.z1 - rect.z0, fm, room.cx, L.floor + 0.02, room.cz);
            else {
              box(rect.x1 - rect.x0, FLOOR_T, rect.z1 - rect.z0, fm, room.cx, L.floor - FLOOR_T / 2, room.cz);
              floorCollider(rect, L.floor);
            }
          } else {
            let rects = [rect];
            for (const [lvl, a, b, c, d] of FLOOR_HOLES) {
              if (lvl !== level) continue;
              const hole = { x0: a * CS, z0: b * CS, x1: (c + 1) * CS, z1: (d + 1) * CS };
              const next = [];
              for (const r of rects) for (const s of subtractRect(r, hole)) next.push(s);
              rects = next;
            }
            for (const r of rects) {
              if (r.x1 - r.x0 < 0.05 || r.z1 - r.z0 < 0.05) continue;
              box(r.x1 - r.x0, FLOOR_T, r.z1 - r.z0, fm, (r.x0 + r.x1) / 2, L.floor - FLOOR_T / 2, (r.z0 + r.z1) / 2);
              floorCollider(r, L.floor);
            }
          }
          // Ceilings support from above and stop jumps below; stair holes stay open.
          // DRAWN 12 mm LOW (r3 polish). A ground-floor ceiling's underside was coplanar with the
          // underside of the first-floor slab over it, and the slab, drawn later, won: MEASURED,
          // darkening the ceiling changed nothing in any ground-floor room, which showed the
          // floorboards of the room above. The collider stays where it was.
          const cyD = ceilY + CEIL_T / 2 - 0.012;
          if (!anyCeilHole) {
            box(rect.x1 - rect.x0, CEIL_T, rect.z1 - rect.z0, cm, room.cx, cyD, room.cz);
            floorCollider(rect, ceilY + CEIL_T, CEIL_T);
          } else {
            for (let cx = room.x0; cx <= room.x1; cx++) for (let cz = room.z0; cz <= room.z1; cz++) {
              if (ceilHoles[level + '|' + cx + ',' + cz]) continue;
              box(CS, CEIL_T, CS, cm, cx * CS + CS / 2, cyD, cz * CS + CS / 2);
              aabb(cx * CS, ceilY, cz * CS, (cx + 1) * CS, ceilY + CEIL_T, (cz + 1) * CS, 'ceiling', true, false);
            }
          }
        }
      }
    }

    // ---- stairs [donor :520-553], at STEP_RISE instead of the donor's 0.185 --------------
    function buildStairs() {
      if (!isBody) return;
      for (const r of RAMPS) {
        const rise = r.y1 - r.y0;
        const lo = r.axis === 'z' ? r.z0 : r.x0;
        const hi = r.axis === 'z' ? r.z1 : r.x1;
        const run = hi - lo;
        const width = r.axis === 'z' ? r.x1 - r.x0 : r.z1 - r.z0;
        const wmid = r.axis === 'z' ? (r.x0 + r.x1) / 2 : (r.z0 + r.z1) / 2;
        const mat = r.id.startsWith('grand') ? 'marblePlain' : (r.id === 'bstair' || r.id === 'crypt') ? 'stone' : 'woodMid';
        if (r.y0 === r.y1) {
          const cx = (r.x0 + r.x1) / 2, cz = (r.z0 + r.z1) / 2;
          box(r.x1 - r.x0, FLOOR_T, r.z1 - r.z0, mat, cx, r.y0 - FLOOR_T / 2, cz);
          aabb(r.x0, r.y0 - FLOOR_T, r.z0, r.x1, r.y0, r.z1, 'stone', true);
          continue;
        }
        const steps = Math.max(2, Math.round(Math.abs(rise) / STEP_RISE));
        const stepRun = run / steps;
        for (let i = 0; i < steps; i++) {
          const a = lo + stepRun * (i + 0.5);
          const yBase = Math.min(r.y0, r.y1) - FLOOR_T;
          const yTop = r.y0 + (rise * (i + 1)) / steps;
          const h = Math.max(0.1, yTop - yBase);
          const yMid = yTop - h / 2;
          // solid riser stack; each step is its own standable collider
          if (r.axis === 'z') {
            box(width, h, Math.abs(stepRun) + 0.02, mat, wmid, yMid, a);
            aabb(r.x0, yBase, a - stepRun / 2, r.x1, yTop, a + stepRun / 2, 'stone', true);
          } else {
            box(Math.abs(stepRun) + 0.02, h, width, mat, a, yMid, wmid);
            aabb(a - stepRun / 2, yBase, r.z0, a + stepRun / 2, yTop, r.z1, 'stone', true);
          }
          // THE RUNNER (r3 polish): a velvet strip up the middle of the grand stair, on every
          // tread and down the face of every riser, so the flight reads as a stair and not as
          // a stack of pale boxes. 12 mm, on the cloth channel; the foot tread's strip lies on
          // the floor like the tail of it.
          if (r.id.startsWith('grand')) {
            const rw = Math.min(2.2, width * 0.7), rh = Math.abs(rise) / steps, down = rise > 0 ? -1 : 1;
            const fa = a + down * (stepRun / 2 + 0.016);
            if (r.axis === 'z') {
              box(rw, 0.012, Math.abs(stepRun), 'velvet', wmid, yTop + 0.006, a);
              if (yTop - rh > Math.min(r.y0, r.y1) - 0.01) box(rw, rh, 0.012, 'velvet', wmid, yTop - rh / 2 + 0.006, fa);
            } else {
              box(Math.abs(stepRun), 0.012, rw, 'velvet', a, yTop + 0.006, wmid);
              if (yTop - rh > Math.min(r.y0, r.y1) - 0.01) box(0.012, rh, rw, 'velvet', fa, yTop - rh / 2 + 0.006, wmid);
            }
          }
        }
      }
      // the landing's carpet, 15 cm in from its edges
      for (const r of RAMPS) {
        if (!r.id.startsWith('grand') || r.y0 !== r.y1) continue;
        box(r.x1 - r.x0 - 0.3, 0.012, r.z1 - r.z0 - 0.3, 'velvet', (r.x0 + r.x1) / 2, r.y0 + 0.006, (r.z0 + r.z1) / 2);
      }
    }

    // ---- railings [donor :567-596], minus the attic's -------------------------------------
    function buildRailings() {
      if (!isBody) return;
      railSlope(27, 37, 27, 33, 0, 2.1);      // main flight, west side
      railSlope(33, 37, 33, 33, 0, 2.1);      // main flight, east side
      balustrade(27, 31, 33, 31, 2.1);        // landing, north lip over the void
      railSlope(27, 31, 24, 31, 2.1, 4.2, 3); // west return flight, north side
      railSlope(27, 33, 24, 33, 2.1, 4.2, 3); // west return flight, south side
      railSlope(33, 31, 36, 31, 2.1, 4.2, 3); // east return flight, north side
      railSlope(33, 33, 36, 33, 2.1, 4.2, 3); // east return flight, south side
      balustrade(24, 30, 24, 31, 4.2);
      balustrade(24, 33, 24, 34, 4.2);
      balustrade(36, 30, 36, 31, 4.2);
      balustrade(36, 33, 36, 34, 4.2);
      balustrade(56, 4, 56, 10, 4.2);   // landing1 hole, west lip
      balustrade(56, 4, 60, 4, 4.2);    // landing1 hole, north lip
      balustrade(44, 4, 44, 10, 0);     // cellar stair opening (ROUND 7: the well is x 44-50)
      balustrade(50, 4, 50, 10, 0);
      balustrade(44, 10, 50, 10, 0);
      balustrade(2, 2, 2, 8, 0);        // chapel crypt steps
      balustrade(4, 2, 4, 8, 0);
      balustrade(2, 8, 4, 8, 0);
    }

    // ---- THE EXTERIOR: what the donor never had ----------------------------------------
    // The plinth (the lifted cellar's outside), the roof, the chimneys, the steps and the
    // porch. All landmark: this is the silhouette.
    function blackthornPavilions(eave, front, doorX) {
      // Three broad frontispieces interrupt the long hip/eave, keeping the room shell
      // and every opening behind them. The high gables start beyond z=41.25: the hip's
      // walkable edge ends at 40.7, with room for the player's radius between the two.
      // These are masonry parapets, not false rooms standing on the climbable roof.
      const prism = (points, depth, mat, x, y, z) => {
        const shape = new THREE.Shape();
        points.forEach(([px,py],i) => i ? shape.lineTo(px,py) : shape.moveTo(px,py));
        shape.closePath();
        const geo = new THREE.ExtrudeGeometry(shape, { depth, steps:1, bevelEnabled:false, curveSegments:1 });
        if (!geo.index) geo.setIndex(Array.from({length:geo.attributes.position.count},(_,i)=>i));
        S.at(geo,PALETTE[mat],LX(x),LY(y),LZ(z));
      };
      const gable = (x, half, peak, central) => {
        const base = eave + .03, back = 41.32, face = 41.78;
        // Solid kneelers and a low shoulder carry the rising crown. A recessed
        // tympanum makes one calm plane inside its broad, weather-shedding coping.
        prism([[-half,0],[half,0],[half,.46],[0,peak],[-half,.46]],.46,'facade',x,base,back);
        cutStone(half*2+.60,.25,.91,'stone',x,base+.025,41.78,0,.045);
        box(half*2-.32,.11,.48,'stoneDark',x,base+.25,41.88);
        const rake = Math.hypot(half,peak-.46),angle = Math.atan2(peak-.46,half);
        for(const side of [-1,1]) {
          S.box(rake+.24,.27,.86,LX(x+side*half/2),LY(base+(peak+.46)/2),LZ(face+.015),PALETTE.stone,0,0,-side*angle);
          S.box(rake-.24,.095,.18,LX(x+side*half/2),LY(base+(peak+.46)/2-.20),LZ(face+.055),PALETTE.stoneDark,0,0,-side*angle);
          cutStone(.70,.56,.88,'stone',x+side*half,base+.20,41.79,0,.055);
          cutStone(.94,.18,1.02,'stone',x+side*half,base+.52,41.83,0,.03);
        }
        // Only the central pavilion carries a blind oculus. Its dark recess is
        // masonry relief, not a new pane, light or interaction symbol.
        if(central) {
          const yy=base+1.64;
          S.cyl(.69,.69,.075,24,LX(x),LY(yy),LZ(face+.045),PALETTE.stoneDark,0,Math.PI/2);
          const rim=new THREE.TorusGeometry(.71,.105,4,28);
          S.at(rim,PALETTE.stone,LX(x),LY(yy),LZ(face+.115));
          box(.11,1.16,.13,'stone',x,yy,face+.15);
          box(1.16,.11,.13,'stone',x,yy,face+.15);
          cutStone(.56,.31,.72,'stone',x,base+peak+.065,41.79,0,.045);
        }
      };
      const shoulder = (x0,x1,central) => {
        const width=x1-x0,mid=(x0+x1)/2;
        // Wide returns read as pavilion depth from the road. Their lower corbels
        // begin above yard head height; beside the stairs they begin above the
        // raised landing as well. Nothing extends into the front door route.
        for(const x of [x0,x1]) {
          const y0=central?2.65:-.38, y1=eave-.55, depth=central?1.06:.94;
          cutStone(central?1.15:1.06,y1-y0,depth,'facade',x,(y0+y1)/2,front+depth/2-.025,0,.11);
          cutStone(central?1.37:1.24,.25,depth+.13,'stone',x,y0+.02,front+depth/2+.02,0,.035);
          cutStone(central?1.47:1.36,.26,depth+.34,'stone',x,y1-.02,front+depth/2+.10,0,.045);
          // A shallow inset down each pier holds the wall plane behind the caps.
          box(.48,y1-y0-.80,.035,'stoneDark',x,(y0+y1)/2,front+depth+.018);
          for(const yy of [3.80,4.06])if(yy>y0+.30)
            cutStone(central?1.30:1.19,.105,depth+.15,'stone',x,yy,front+depth/2+.035,0,.018);
        }
        // These links stay below the original hip surface. Only the separate
        // parapet above them stands higher than the roof, entirely beyond its edge.
        cutStone(width+1.24,.32,1.52,'stone',mid,eave-.35,40.94,0,.05);
        cutStone(width+1.58,.18,1.92,'stone',mid,eave-.10,41.07,0,.028);
        box(width+.54,.15,1.19,'stoneDark',mid,eave-.61,40.89);
        if(!central) {
          cutStone(width-.18,.20,.87,'stone',mid,LV.first.floor-.18,40.63,0,.035);
          // Each three-window group rests on one projecting apron, not more
          // little repeated pediments. It remains below the existing lower sills.
          cutStone(width-.18,.25,.74,'stone',mid,.58,40.53,0,.04);
          box(width-.58,.26,.36,'plinth',mid,.32,40.34);
        }
      };
      shoulder(doorX-4,doorX+4,true);
      gable(doorX,4.68,4.20,true);
      // Existing window centres are 3,7,11 ... 59. The outer groups follow those
      // actual openings, so their piers sit in masonry rather than across glass.
      for(const [x0,x1] of [[1,13],[49,60.30]]) {
        shoulder(x0,x1,false);
        gable((x0+x1)/2,(x1-x0)/2+.16,2.64,false);
      }
    }

    function buildExterior() {
      if (!isLand) return;
      // THE PLINTH runs from the lowest ground under the footprint to the ground floor,
      // the way sites.js's shell() grows a foundation on the downhill side.
      let gmin = padY;
      for (let i = 0; i <= 12; i++) {
        const f = i / 12;
        for (const [x, z] of [[f * 60, 0], [f * 60, 40], [0, f * 40], [60, f * 40]]) {
          const g = api.heightAt(api.wx(LX(x), LZ(z)), api.wz(LX(x), LZ(z)));
          if (g < gmin) gmin = g;
        }
      }
      const baseD = gmin - 0.5 - (padY + LIFT);       // donor-frame y of the plinth base
      const T = 0.6;
      const ring = [
        [-T / 2, -T / 2, 60 + T / 2, T / 2], [-T / 2, 40 - T / 2, 60 + T / 2, 40 + T / 2],
        [-T / 2, 0, T / 2, 40], [60 - T / 2, 0, 60 + T / 2, 40],
      ];
      for (const [x0, z0, x1, z1] of ring) {
        box(x1 - x0, -baseD, z1 - z0, 'plinth', (x0 + x1) / 2, baseD / 2, (z0 + z1) / 2);
        // colliders, split at MAX_RUN
        const long = (x1 - x0) > (z1 - z0);
        const n = Math.ceil((long ? x1 - x0 : z1 - z0) / MAX_RUN);
        for (let i = 0; i < n; i++) {
          if (long) aabb(x0 + (x1 - x0) * i / n, baseD, z0, x0 + (x1 - x0) * (i + 1) / n, 0, z1, 'wall');
          else aabb(x0, baseD, z0 + (z1 - z0) * i / n, x1, 0, z0 + (z1 - z0) * (i + 1) / n, 'wall');
        }
      }
      // a string course where the plinth meets the walls
      box(61.4, 0.22, 0.7, 'stone', 30, 0.11, -0.05);
      box(61.4, 0.22, 0.7, 'stone', 30, 0.11, 40.05);
      box(0.7, 0.22, 41.4, 'stone', -0.05, 0.11, 20);
      box(0.7, 0.22, 41.4, 'stone', 60.05, 0.11, 20);

      // THE ROOF: Blackthorn keeps its tall Victorian hip. Avery deliberately sits lower,
      // then receives two crossing pitches below so the second house cannot read as a clone.
      const averyExterior = EXTERIOR === 'avery';
      const eave = LV.first.ceil + CEIL_T, rise = averyExterior ? 2.4 : 6.0, ov = 0.7;
      const ex0 = -ov, ex1 = 60 + ov, ez0 = -ov, ez1 = 40 + ov;
      const hd = (ez1 - ez0) / 2;                          // half depth = hip run
      const ridgeY = eave + rise, rx0 = ex0 + hd, rx1 = ex1 - hd, rz = (ez0 + ez1) / 2;
      const V = (x, y, z) => [LX(x), LY(y), LZ(z)];
      const faces = [
        [V(ex0, eave, ez1), V(ex1, eave, ez1), V(rx1, ridgeY, rz), V(rx0, ridgeY, rz)],  // south slope (the front)
        [V(ex1, eave, ez0), V(ex0, eave, ez0), V(rx0, ridgeY, rz), V(rx1, ridgeY, rz)],  // north slope
        [V(ex0, eave, ez0), V(ex0, eave, ez1), V(rx0, ridgeY, rz)],                      // west hip
        [V(ex1, eave, ez1), V(ex1, eave, ez0), V(rx1, ridgeY, rz)],                      // east hip
      ];
      const pos = [], nor = [], uv = [];
      for (const f of faces) {
        const tri = f.length === 3 ? [[0, 1, 2]] : [[0, 1, 2], [0, 2, 3]];
        // face normal from the first three points (outward: winding chosen above)
        const ax = f[1][0] - f[0][0], ay = f[1][1] - f[0][1], az = f[1][2] - f[0][2];
        const bx = f[2][0] - f[0][0], by = f[2][1] - f[0][1], bz = f[2][2] - f[0][2];
        let nx = ay * bz - az * by, ny = az * bx - ax * bz, nz = ax * by - ay * bx;
        const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
        if (ny < 0) { nx = -nx; ny = -ny; nz = -nz; }
        for (const [i0, i1, i2] of tri) {
          for (const i of [i0, i1, i2]) { pos.push(f[i][0], f[i][1], f[i][2]); nor.push(nx, ny, nz); uv.push(0, 0); }
        }
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(Float32Array.from(pos), 3));
      g.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from(nor), 3));
      g.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from(uv), 2));
      // INDEXED, like every kit primitive: mergeGeometries refuses a mixed set and returns
      // null without a word, and the whole landmark vanished that way on the first boot
      // (tools/manor-look.mjs, 2026-09-03: "manor landmark: beacon only").
      const idx = new Array(pos.length / 3);
      for (let i = 0; i < idx.length; i++) idx[i] = i;
      g.setIndex(idx);
      // Both houses get a mathematically clean hip shell. Avery's earlier crossed boxes
      // produced enormous V-shaped blades from player height — spectacular in precisely
      // the wrong way — so its identity now comes from the facade and entrance pediment.
      S.push(g, PALETTE.slate);
      if (averyExterior) {
        const frontSpec = DOORS.find(d => d[4] && d[4].id === 'front');
        const gableX = frontSpec ? (frontSpec[1] + 0.5) * CS + 0.55 : 29.55;
        // A compact front pediment gives the road reveal one unmistakable face without
        // adding a fake tower or another gameplay-blocking structure.
        const gy = eave - 0.05, gz = 40.24, half = 5.1, peak = 3.8;
        const ped = new THREE.BufferGeometry();
        ped.setAttribute('position', new THREE.BufferAttribute(Float32Array.from([
          ...V(gableX - half, gy, gz), ...V(gableX + half, gy, gz), ...V(gableX, gy + peak, gz),
        ]), 3));
        ped.setAttribute('normal', new THREE.BufferAttribute(Float32Array.from([0, 0, 1, 0, 0, 1, 0, 0, 1]), 3));
        ped.setAttribute('uv', new THREE.BufferAttribute(Float32Array.from([0, 0, 1, 0, 0.5, 1]), 2));
        ped.setIndex([0, 1, 2]);
        S.push(ped, PALETTE.averyFacade);
        const edge = Math.hypot(half, peak), ang = Math.atan2(peak, half);
        S.box(edge, 0.20, 0.20, LX(gableX - half * 0.5), LY(gy + peak * 0.5), LZ(gz + 0.08), PALETTE.averyTrim, 0, 0, ang);
        S.box(edge, 0.20, 0.20, LX(gableX + half * 0.5), LY(gy + peak * 0.5), LZ(gz + 0.08), PALETTE.averyTrim, 0, 0, -ang);
      }
      // fascia and the ridge cap
      box(ex1 - ex0 + 0.2, 0.42, 0.18, 'woodDark', 30, eave - 0.1, ez1 + 0.05);
      box(ex1 - ex0 + 0.2, 0.42, 0.18, 'woodDark', 30, eave - 0.1, ez0 - 0.05);
      box(0.18, 0.42, ez1 - ez0 + 0.2, 'woodDark', ex0 - 0.05, eave - 0.1, 20);
      box(0.18, 0.42, ez1 - ez0 + 0.2, 'woodDark', ex1 + 0.05, eave - 0.1, 20);
      if (!averyExterior) box(rx1 - rx0 + 0.4, 0.3, 0.5, 'dark', 30, ridgeY + 0.05, rz);
      if (!averyExterior) {
        // A deep entablature gives the long facade an actual overhang. Broad cut-stone
        // faces and shadowed dentils carry the detail at the road, before textures do.
        for (const [x,z,width,yaw] of [[30,40.28,61.1,0],[30,-.28,61.1,Math.PI],
          [-.28,20,40.8,-Math.PI/2],[60.28,20,40.8,Math.PI/2]]) {
          const nx=Math.sin(yaw),nz=Math.cos(yaw),tx=Math.cos(yaw),tz=-Math.sin(yaw);
          cutStone(width,.27,.62,'stone',x,eave-.43,z,yaw,.04);
          cutStone(width+.24,.19,.87,'stone',x+nx*.08,eave-.17,z+nz*.08,yaw,.03);
          box(width,.12,.37,'stoneDark',x-nx*.04,eave-.65,z-nz*.04,yaw);
          const dentils=Math.floor(width/1.75);
          for(let j=0;j<dentils;j++){
            const off=(j-(dentils-1)/2)*1.75;
            box(.27,.27,.38,'stone',x+tx*off,eave-.82,z+tz*off,yaw);
          }
          // The string course sits between window floors, with a water-shedding lip.
          cutStone(width-.38,.21,.39,'stone',x-nx*.08,LV.first.floor-.20,z-nz*.08,yaw,.035);
        }
        for(const [x,z] of [[0,0],[60,0],[0,40],[60,40]]){
          const sx=x===0?-1:1,sz=z===0?-1:1;
          for(let row=0;row<11;row++){
            const yy=.39+row*.64,wide=row%2?.70:1.04;
            box(wide,.34,.27,row%3?'stone':'stoneDark',x-sx*(wide/2-.16),yy,z+sz*.18);
            box(.27,.34,1.26-wide*.36,row%3?'stone':'stoneDark',x+sx*.18,yy,z-sz*.26);
          }
        }
        for(const yy of [-2.1,-1.05])box(60.7,.11,.20,'stoneDark',30,yy,40.30);
      }
      // Blackthorn carries four old stacks. Avery gets two short service chimneys; the
      // attached garage and glass sunroom will do the rest of its silhouette work.
      const roofAt = (x, z) => {
        const dz = Math.abs(z - rz), dxE = Math.min(x - ex0, ex1 - x);
        return eave + rise * Math.max(0, 1 - Math.max(dz, hd - dxE) / hd);
      };
      // Narrow perimeter bands follow the hip rather than filling the whole attic.
      const bands = Math.ceil(rise / 0.20), run = hd / bands;
      for (let i = 0; i < bands; i++) {
        const inset = i * run, next = (i + 1) * run;
        const top = eave + rise * (i + 0.5) / bands + 0.04;
        const x0 = ex0 + inset, x1 = ex1 - inset, z0 = ez0 + inset, z1 = ez1 - inset;
        for (const r of [[x0,z0,x1,ez0+next], [x0,ez1-next,x1,z1],
          [x0,ez0+next,ex0+next,ez1-next], [ex1-next,ez0+next,x1,ez1-next]]) {
          if (r[2]-r[0] < 0.01 || r[3]-r[1] < 0.01) continue;
          // Split long bands for the collision spatial hash.
          const nx=Math.ceil((r[2]-r[0])/MAX_RUN), nz=Math.ceil((r[3]-r[1])/MAX_RUN);
          for(let a=0;a<nx;a++) for(let b=0;b<nz;b++)
            aabb(r[0]+(r[2]-r[0])*a/nx,top-0.22,r[1]+(r[3]-r[1])*b/nz,
              r[0]+(r[2]-r[0])*(a+1)/nx,top,r[1]+(r[3]-r[1])*(b+1)/nz,'roof',true);
        }
      }
      const chimneys = averyExterior ? [[18, 13], [47, 27]] : [[9, 12], [22, 28], [42, 12], [51, 30]];
      for (const [x, z] of chimneys) {
        const top = roofAt(x, z) + 3.2;
        box(1.5, top - (eave - 1.0), 1.5, 'brick', x, (top + eave - 1.0) / 2, z);
        box(1.9, 0.35, 1.9, 'stone', x, top + 0.17, z);
        aabb(x-0.75,eave-1.0,z-0.75,x+0.75,top,z+0.75,'stone',true);
        aabb(x-0.95,top,z-0.95,x+0.95,top+0.35,z+0.95,'stone',true);
        for (const [px, pz] of [[-0.35, -0.35], [0.35, 0.35]]) {
          S.tube(0.22, 0.22, 0.6, 8, LX(x + px), LY(top + 0.6), LZ(z + pz), PALETTE.dark);
        }
        if(!averyExterior){
          // Corbelled brick crowns and collared pots break the four rectangular stacks.
          cutStone(1.71,.18,1.71,'brick',x,top-.30,z,0,.03);
          cutStone(1.83,.14,1.83,'stoneDark',x,top-.08,z,0,.025);
          for(const [px,pz] of [[-.35,-.35],[.35,.35]]){
            S.tube(.265,.24,.13,10,LX(x+px),LY(top+.88),LZ(z+pz),PALETTE.stoneDark);
            S.tube(.245,.245,.08,10,LX(x+px),LY(top+.44),LZ(z+pz),PALETTE.stoneDark);
          }
          // Thin corner flashings tuck into the existing roof surface.
          box(1.70,.08,.20,'metal',x,roofAt(x,z)+.10,z+.79);
          box(.20,.08,1.70,'metal',x+.79,roofAt(x,z)+.10,z);
        }
      }

      // THE FRONT STEPS: seven risers from the yard to the front door, 6 m wide, a
      // solid stack so they read as a flight and not as a ladder. The foot lands on
      // the road end (donor z 44.4 = local z +20.4; the road ends at +19.9).
      const frontDoor = DOORS.find(d => d[4] && d[4].id === 'front');
      const doorX = frontDoor ? (frontDoor[1] + 0.5) * CS : 29;
      const front = GZ * CS + EXT_T / 2;
      const riser = LIFT / FRONT_STEPS;
      for (let i = 0; i < FRONT_STEPS; i++) {
        const top = -LIFT + riser * (i + 1);
        const z0 = front + STEP_RUN * (FRONT_STEPS - 1 - i), z1 = z0 + STEP_RUN;
        const yb = -LIFT - 0.3;
        box(6.0, top - yb, z1 - z0 + 0.02, 'stone', doorX, (top + yb) / 2, (z0 + z1) / 2);
        aabb(doorX - 3.0, yb, z0, doorX + 3.0, top, z1, 'stone', true);
      }
      // cheek walls either side of the flight
      for (const sx of [-1, 1]) {
        const x = doorX + sx * 3.2;
        box(0.4, LIFT + 0.9, STEP_RUN * FRONT_STEPS + 0.4, 'plinth', x, -LIFT * 0.5 + 0.15, front + STEP_RUN * FRONT_STEPS * 0.5);
        aabb(x - 0.2, -LIFT - 0.3, front, x + 0.2, 0.6, front + STEP_RUN * FRONT_STEPS + 0.2, 'wall');
        box(0.6, 0.6, 0.6, 'stone', x, 0.9, front + STEP_RUN * FRONT_STEPS + 0.1);   // a finial
      }
      // THE PORCH: Blackthorn keeps its tall columns. Avery gets a low offset concrete
      // canopy and two narrow posts: family estate, not another Gothic mausoleum.
      if (averyExterior) {
        box(7.4, 0.34, 2.7, 'stone', doorX + 0.55, 3.05, front + 0.65);
        box(7.9, 0.22, 3.1, 'slate', doorX + 0.55, 3.34, front + 0.65);
        aabb(doorX-3.40,2.88,front-0.90,doorX+4.50,3.45,front+2.20,'roof',true);
        for (const sx of [-1, 1]) {
          const x = doorX + 0.55 + sx * 3.15, z = front + 1.35;
          S.cyl(0.13, 0.15, 3.35 + riser, 8, LX(x), LY(1.37), LZ(z), PALETTE.dark);
          circle(x, z, 0.17, -riser - 0.2, 3.2, 'metal');
        }
        // An unmistakable service wing: recessed sectional garage door with horizontal
        // seams. It is facade language only; the ordinary open front door remains the route.
        box(10.5, 3.25, 0.18, 'dark', 51.5, 1.62, front + 0.25);
        for (let i = 0; i < 5; i++) box(10.0, 0.06, 0.08, 'metal', 51.5, 0.35 + i * 0.62, front + 0.36);

        // Heavy string courses, corner piers and damp ivy break the institutional slab
        // into an old family estate. They are facade-only dressing and cannot snag movement.
        for (const z of [0, 40]) box(60.8, 0.24, 0.30, 'averyTrim', 30, LV.first.floor - 0.08, z + (z ? 0.23 : -0.23));
        for (const x of [0, 60]) box(0.30, 0.24, 40.8, 'averyTrim', x + (x ? 0.23 : -0.23), LV.first.floor - 0.08, 20);
        for (const [x, z] of [[0, 0], [60, 0], [0, 40], [60, 40]]) {
          box(0.62, eave - 0.25, 0.62, 'averyTrim', x, (eave - 0.25) / 2, z);
        }
        // The 3.2 m lifted cellar is deliberately real, but it should read as an old
        // coursed foundation instead of one enormous blank concrete rectangle.
        for (const y of [-2.15, -1.08]) box(60.8, 0.18, 0.26, 'stoneDark', 30, y, 40.31);
        for (const x of [5, 13, 21, 39, 47, 55]) box(0.18, 2.85, 0.24, 'stoneDark', x, -1.55, 40.32);
        for (const x of [7.5, 15.5, 39.0, 56.0]) {
          const height = 3.4 + (x % 3) * 0.7;
          box(0.18, height, 0.18, 'ivy', x, height / 2, 40.31);
          box(1.8, 0.14, 0.18, 'ivy', x + 0.7, height * 0.64, 40.32);
          box(1.25, 0.12, 0.18, 'ivy', x - 0.45, height * 0.83, 40.32);
        }

        // A dead formal garden frames the approach but leaves the full stair lane open.
        for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) {
          const x = doorX + sx * (5.8 + i * 1.7), z = front + 4.3 + i * 2.15;
          S.cyl(0.38, 0.62, 1.45 + (i & 1) * 0.35, 7, LX(x), LY(-LIFT + 0.72), LZ(z), PALETTE.ivy);
          S.box(0.10, 2.0, 0.10, LX(x), LY(-LIFT + 0.95), LZ(z), PALETTE.woodDark, 0, 0, sx * 0.13);
          // MEASURED 2026-09-18 (r3 walk-through census): these eight were drawn with no
          // collider and were the top six walk-through clusters at the Avery House
          circle(x, z, 0.6, -LIFT - 0.1, -LIFT + 1.45 + (i & 1) * 0.35, 'hedge', false, false);
        }
      } else {
        for (const sx of [-1, 1]) {
          const x = doorX + sx * 2.2, z = front + 0.9;
          // The old shafts stopped half a metre below their canopy. The fluted shaft,
          // neck and capital now meet its underside, within the existing column footprint.
          const shaftH=5.68+riser,shaft=new THREE.CylinderGeometry(.255,.29,shaftH,24,4);
          const sp=shaft.attributes.position;
          for(let i=0;i<sp.count;i++){
            const px=sp.getX(i),pz=sp.getZ(i),r=Math.hypot(px,pz);
            if(r<.001)continue;
            const groove=1-.043*(.5+.5*Math.cos(Math.atan2(pz,px)*12));
            sp.setX(i,px*groove);sp.setZ(i,pz*groove);
          }
          shaft.computeVertexNormals();S.at(shaft,PALETTE.stone,LX(x),LY(-riser+shaftH/2),LZ(z));
          S.cyl(.34,.30,.15,24,LX(x),LY(5.66),LZ(z),PALETTE.stone);
          S.cyl(.36,.34,.16,24,LX(x),LY(5.80),LZ(z),PALETTE.stoneDark);
          cutStone(.80,.20,.80,'stone',x,5.90,z,0,.035);
          S.cyl(.31,.34,.17,24,LX(x),LY(-riser+.085),LZ(z),PALETTE.stoneDark);
          circle(x, z, 0.32, -riser - 0.2, -riser + 6.0, 'stone');
        }
        box(6.2, 0.4, 2.4, 'stone', doorX, 6.2, front + 0.6);
        box(6.6, 0.24, 2.8, 'slate', doorX, 6.55, front + 0.6);
        aabb(doorX-3.3,6.0,front-0.8,doorX+3.3,6.67,front+2.0,'roof',true);
        // A central triangular pediment makes the entrance a silhouette, not a shelf.
        // It is carved facade dressing above the unchanged porch and door clearance.
        const half=3.52,pedY=6.72,peak=2.04,pedZ=front+1.87;
        const shape=new THREE.Shape();shape.moveTo(-half,0);shape.lineTo(half,0);shape.lineTo(0,peak);shape.closePath();
        const pediment=new THREE.ExtrudeGeometry(shape,{depth:.29,steps:1,bevelEnabled:false});
        if(!pediment.index)pediment.setIndex(Array.from({length:pediment.attributes.position.count},(_,i)=>i));
        S.at(pediment,PALETTE.stoneDark,LX(doorX),LY(pedY),LZ(pedZ));
        const rake=Math.hypot(half,peak),angle=Math.atan2(peak,half);
        for(const side of [-1,1]){
          S.box(rake+.20,.24,.50,LX(doorX+side*half/2),LY(pedY+peak/2),LZ(pedZ+.25),PALETTE.stone,0,0,-side*angle);
          S.box(rake-.12,.075,.20,LX(doorX+side*half/2),LY(pedY+peak/2-.15),LZ(pedZ+.40),PALETTE.plinth,0,0,-side*angle);
        }
        cutStone(7.40,.23,.64,'stone',doorX,pedY+.035,pedZ+.16,0,.04);
        for(let i=-5;i<=5;i++)box(.22,.20,.30,'stone',doorX+i*.62,6.43,front+1.91);
        // A worn stone rosette in the tympanum, catching a narrow rim of moonlight.
        S.cyl(.34,.34,.06,20,LX(doorX),LY(7.41),LZ(pedZ+.325),PALETTE.plinth,0,Math.PI/2);
        for(let i=0;i<8;i++){
          const a=i/8*Math.PI*2;
          S.cyl(.075,.075,.055,8,LX(doorX+Math.cos(a)*.21),LY(7.41+Math.sin(a)*.21),LZ(pedZ+.365),PALETTE.stone,0,Math.PI/2);
        }
        for(const side of [-1,1]){
          cutStone(.52,eave-.46,.27,'stone',doorX+side*4,.22+(eave-.46)/2,front+.095,0,.045);
          cutStone(.85,.22,.45,'stone',doorX+side*4,eave-.36,front+.16,0,.035);
        }
        blackthornPavilions(eave,front,doorX);
      }
      // TWO LANTERNS either side of the door, dark brass: the fixture lane lights the
      // claim, not these; they are the shape of a lit doorway waiting for power.
      for (const sx of [-1, 1]) {
        box(0.26, 0.42, 0.26, 'metal', doorX + sx * 1.7, 2.2, front + 0.16);
        box(0.10, 0.14, 0.30, 'metal', doorX + sx * 1.7, 2.45, front + 0.05);
      }
    }

    // ---- FURNITURE, with restraint --------------------------------------------------------
    // 6-12 primitives a room from the kit vocabulary, on the walls that have no door, and
    // never inside the route (the corridors keep their middles, the foyer keeps the
    // stair's approach). Everything taller than 0.45 m emits its collider in the
    // statement that places it. Donor metres throughout; `y` is the level floor.
    function furnish() {
      if (!isBody) return;
      for (const level of Object.keys(ROOMS)) {
        const y = LV[level].floor;
        const doorsHere = doorPoints.filter(d => d.level === level);
        const keepOut = [];
        for (const r of RAMPS) keepOut.push({ x0: r.x0 - 0.7, z0: r.z0 - 0.7, x1: r.x1 + 0.7, z1: r.z1 + 0.7 });
        for (const [lvl, a, b, c, d] of FLOOR_HOLES) if (lvl === level) keepOut.push({ x0: a * CS - 0.7, z0: b * CS - 0.7, x1: (c + 1) * CS + 0.7, z1: (d + 1) * CS + 0.7 });
        for (const room of roomsByLevel[level]) {
          if (room.void) continue;
          // One dark metre at the bottom of every Avery room gives the torch a horizon
          // and stops even sparsely furnished spaces reading as blank plaster boxes.
          if (isAvery && room.furn !== 'cellar' && room.furn !== 'undercroft') V.dado(room, y);
          if (!isAvery && level !== 'basement' && room.furn && room.furn !== 'none' && !TRIM_NONE.has(room.id)) V.trim(room, y);
          if (!room.furn || room.furn === 'none') continue;
          const P = propsFor(room, y, doorsHere, keepOut);
          if (P) P();
        }
      }
    }

    /** True if a point is within `r` of a door on this level or inside a keep-out rect. */
    function blocked(x, z, r, doorsHere, keepOut) {
      for (const d of doorsHere) {
        if (Math.hypot(d.x - x, d.z - z) < r + 0.65) return true;
        // and the whole OPENING, not only its middle: a double door is 2.4 m wide, and a
        // portrait passed the old test standing across the top of one
        const along = d.axis === 'H' ? Math.abs(x - d.x) : Math.abs(z - d.z);
        const across = d.axis === 'H' ? Math.abs(z - d.z) : Math.abs(x - d.x);
        if (Math.hypot(Math.max(0, along - d.width / 2), across) < r + 0.05) return true;
      }
      for (const k of keepOut) if (x + r > k.x0 && x - r < k.x1 && z + r > k.z0 && z - r < k.z1) return true;
      return false;
    }

    // ---- a prop's own frame ---------------------------------------------------------------
    // +z is its BACK (the side a wall() spot puts against the wall), -z its FRONT. `fr` turns
    // (px, pz) in that frame into donor metres; the part helpers below take (px, py, pz) in
    // it, py above the prop's floor `y`, and a kit, so every part says which channel it is on.
    const fr = (x, z, ry, px, pz) => {
      const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
      return [x + px * c + pz * s, z - px * s + pz * c];
    };
    const pb = (K, col, x, z, y, ry, px, py, pz, w, h, d, rx, rz) => {
      const q = fr(x, z, ry, px, pz);
      K.box(w, h, d, LX(q[0]), LY(y + py), LZ(q[1]), col, ry || 0, rx || 0, rz || 0);
    };
    const pc = (K, col, x, z, y, ry, px, py, pz, r0, r1, h, seg, rx, rz) => {
      const q = fr(x, z, ry, px, pz);
      K.cyl(r0, r1, h, seg || 8, LX(q[0]), LY(y + py), LZ(q[1]), col, ry || 0, rx || 0, rz || 0);
    };
    const ps = (K, col, x, z, y, ry, px, py, pz, r, sx, sy, sz, rx, rz) => {
      const q = fr(x, z, ry, px, pz);
      const g = new THREE.SphereGeometry(r, 8, 6);
      g.scale(sx || 1, sy || 1, sz || 1);
      K.at(g, col, LX(q[0]), LY(y + py), LZ(q[1]), ry || 0, rx || 0, rz || 0);
    };
    /** pb() drawing only the faces in `pm` (F bits in the PROP's frame: NZ is its front). Only
     *  for a prop square to a wall (ry a multiple of PI/2); anything else gets the whole box. */
    const pf = (K, col, x, z, y, ry, px, py, pz, w, h, d, pm) => {
      const r = ry || 0, c = Math.cos(r), sn = Math.sin(r);
      if (Math.abs(c * sn) > 1e-6) { pb(K, col, x, z, y, ry, px, py, pz, w, h, d); return; }
      const bit = (vx, vz) => (vx > 0.5 ? F.PX : vx < -0.5 ? F.NX : vz > 0.5 ? F.PZ : F.NZ);
      let m = (pm & F.PY) | (pm & F.NY);
      if (pm & F.PX) m |= bit(c, -sn);
      if (pm & F.NX) m |= bit(-c, sn);
      if (pm & F.PZ) m |= bit(sn, c);
      if (pm & F.NZ) m |= bit(-sn, -c);
      const q0 = fr(x, z, ry, px - w / 2, pz - d / 2), q1 = fr(x, z, ry, px + w / 2, pz + d / 2);
      faces(K, col, Math.min(q0[0], q1[0]), Math.max(q0[0], q1[0]), y + py - h / 2, y + py + h / 2,
        Math.min(q0[1], q1[1]), Math.max(q0[1], q1[1]), m);
    };
    const pk = (K, col, x, z, y, ry, px, py, pz, r, h, seg, rx, rz) => {
      const q = fr(x, z, ry, px, pz);
      K.cone(r, h, seg || 8, LX(q[0]), LY(y + py), LZ(q[1]), col, ry || 0, rx || 0, rz || 0);
    };
    // a deterministic 0..1 from a place, so nothing here spends the site's rng
    const h01 = (x, z, k) => {
      let h = (Math.round(x * 97) * 73856093) ^ (Math.round(z * 97) * 19349663) ^ ((k | 0) * 83492791);
      h = (h ^ (h >>> 13)) * 1274126177;
      return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    };
    const C = PALETTE;
    const BOOKS = [[0.105, 0.036, 0.030], [0.040, 0.066, 0.046], [0.092, 0.062, 0.036],
      [0.030, 0.030, 0.040], [0.128, 0.098, 0.060], [0.070, 0.028, 0.050]];

    /**
     * ONE FIFTY-NINE. A dial facing the prop's FRONT with the hour hand a hair short of two
     * and the minute hand one minute short of the hour: every clock Lucian stopped.
     * (px, py, pz) is the dial centre in the prop frame. As you face it, the prop's local
     * +x is your LEFT, so a hand at clock angle a points along (-sin a, cos a), and a box
     * turned about its own z by `a` points exactly there.
     */
    const dial = (x, z, y, ry, px, py, pz, r) => {
      pc(S, C.china, x, z, y, ry, px, py, pz, r, r, 0.012, 16, Math.PI / 2, 0);
      for (const [a, len, wid] of [[((1 + 59 / 60) / 12) * Math.PI * 2, r * 0.55, 0.012],
        [(59 / 60) * Math.PI * 2, r * 0.86, 0.008]]) {
        pb(S, C.velvetBlack, x, z, y, ry, px - Math.sin(a) * len / 2, py + Math.cos(a) * len / 2,
          pz - 0.009, wid, len, 0.004, 0, a);
      }
    };

    /**
     * A MASK ON A FACE (r3 polish). The guests' masks were a pale or yellow disc with two 13 mm
     * slits, and under the torch they read as sleepy smiley faces, not masks. Now: the pale
     * ones are a full volto with a nose ridge, the gilt ones a half mask, a band of old gilt
     * across the eyes and brow over the bare face, with the long beak. Both have almond eye
     * holes 5 x 2.8 cm set INTO the curve (each turned to the surface under it), a black ribbon
     * round the back of the head, and nothing below the eyes that could read as a mouth.
     * (x, z, hy): the head's centre, `fz0` the face ellipsoid's centre in the prop frame (its
     * front is -z), `ry` the prop's heading.
     */
    const maskFace = (x, z, hy, fz0, ry, gilt) => {
      const FX = 0.105, FY = 0.1155, FZ = 0.063, EY = 0.035, EX = 0.04;
      const half = (py) => FX * Math.sqrt(Math.max(0, 1 - (py / FY) ** 2));     // face half-width at py
      ps(P, gilt ? C.skin : C.maskPale, x, z, hy, ry, 0, 0, fz0, 0.105, 1.0, 1.1, 0.6);
      const q0 = fr(x, z, ry, 0, 0);
      let ax = half(EY), cz = ax * FZ / FX;
      if (gilt) {
        // the band: a frustum of the face's own section, 5% proud of it from under the eyes to
        // the brow, so it hugs the face instead of standing off it as a visor
        const yB = 0.008, yT = 0.066, rB = half(yB) * 1.05, rT = half(yT) * 1.05;
        const g = new THREE.CylinderGeometry(rT, rB, yT - yB, 18, 1, false, Math.PI * 0.55, Math.PI * 0.9);
        g.scale(1, 1, FZ / FX);
        g.translate(0, (yB + yT) / 2, fz0);
        P.at(g, C.maskGilt, LX(q0[0]), LY(hy), LZ(q0[1]), ry || 0);
        ax = rB + (rT - rB) * (EY - yB) / (yT - yB); cz = ax * FZ / FX;
      } else {
        // the ridge of the nose, rising out of the brow to 2 cm proud at its foot
        const nz = fz0 - FZ * Math.sqrt(1 - (0.012 / FY) ** 2);
        pb(P, C.maskPale, x, z, hy, ry, 0, -0.012, nz + 0.002, 0.018, 0.06, 0.016, 0.35, 0);
      }
      for (const sx of [-1, 1]) {
        const ex = sx * EX, ez = fz0 - cz * Math.sqrt(Math.max(0, 1 - (ex / ax) ** 2)) + 0.003;
        const q = fr(x, z, ry, ex, ez);
        const g = new THREE.SphereGeometry(0.025, 8, 5);
        g.scale(1, 0.55, 0.3);
        P.at(g, C.velvetBlack, LX(q[0]), LY(hy + EY), LZ(q[1]), (ry || 0) - Math.atan2(ex / (ax * ax), (fz0 - ez) / (cz * cz)));
      }
      if (gilt) pk(P, C.maskGilt, x, z, hy, ry, 0, 0.012, fz0 - FZ - 0.07, 0.03, 0.16, 6, -Math.PI / 2);
      // the ribbon it is tied on with, round the back of the head, its ends under the mask
      const rb = new THREE.CylinderGeometry(1, 1, 0.014, 14, 1, true, -Math.PI * 0.65, Math.PI * 1.3);
      rb.scale(0.108, 1, 0.114);
      rb.translate(0, EY, fz0 + 0.055);
      P.at(rb, C.velvetBlack, LX(q0[0]), LY(hy), LZ(q0[1]), ry || 0);
    };

    // the vocabulary
    const V = {
      table(x, z, y, ry, w, d, mat, h) {
        const th = h || 0.76, m = mat || 'woodDark', K = kitOf(m), col = PALETTE[m] || C.woodDark;
        pb(K, col, x, z, y, ry, 0, th - 0.03, 0, w, 0.06, d);
        // the apron under the top: what makes a slab on four sticks read as a table
        if (w > 0.8) for (const sz of [-1, 1]) pb(K, col, x, z, y, ry, 0, th - 0.11, sz * (d / 2 - 0.09), w - 0.24, 0.10, 0.03);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          pb(K, col, x, z, y, ry, sx * (w / 2 - 0.1), (th - 0.06) / 2, sz * (d / 2 - 0.1), 0.08, th - 0.06, 0.08);
        }
        obb(x, z, w / 2, d / 2, ry || 0, y, y + th, 'wood', true, false);
      },
      /** `fixed`: somebody is sitting on it, so it may not come apart under them. */
      chair(x, z, y, ry, mat, fixed) {
        const m = mat || 'woodDark', K = kitOf(m), col = PALETTE[m] || C.woodDark;
        const brk = !fixed && K === T;
        if (brk) K.open();
        pb(K, col, x, z, y, ry, 0, 0.45, 0, 0.46, 0.05, 0.46);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pb(K, col, x, z, y, ry, sx * 0.19, 0.22, sz * 0.19, 0.04, 0.44, 0.04);
        pb(K, col, x, z, y, ry, 0, 0.72, 0.21, 0.46, 0.5, 0.05);
        if (brk) K.close(LX(x), LZ(z), 0.5, col);
        circle(x, z, 0.30, y, y + 0.95, 'wood', true, brk ? undefined : false);
      },
      /** A chair on its back where it fell when somebody stood up fast; its seat is (x, z). */
      fallenChair(x, z, y, ry) {
        const col = C.woodDark;
        const q = fr(x, z, ry, 0, 0.5);
        T.open();
        pb(T, col, x, z, y, ry, 0, 0.025, 0.72, 0.46, 0.05, 0.5);     // the back, flat on the boards
        pb(T, col, x, z, y, ry, 0, 0.235, 0.45, 0.46, 0.46, 0.05);    // the seat, stood on its edge
        for (const [sx, sy] of [[-1, 0.045], [1, 0.045], [-1, 0.425], [1, 0.425]]) {
          pb(T, col, x, z, y, ry, sx * 0.19, sy, 0.22, 0.04, 0.04, 0.44);   // the legs, to the room
        }
        T.close(LX(q[0]), LZ(q[1]), 0.6, col);
        obb(q[0], q[1], 0.25, 0.5, ry || 0, y, y + 0.47, 'wood', true);
      },
      armchair(x, z, y, ry) {
        pb(P, C.velvet, x, z, y, ry, 0, 0.30, -0.02, 0.84, 0.22, 0.82);
        pb(P, C.velvet, x, z, y, ry, 0, 0.72, 0.35, 0.9, 0.62, 0.2);
        for (const sx of [-1, 1]) {
          pb(P, C.velvet, x, z, y, ry, sx * 0.36, 0.55, 0.0, 0.18, 0.28, 0.86);
          for (const sz of [-1, 1]) pb(T, C.woodDark, x, z, y, ry, sx * 0.36, 0.095, sz * 0.36, 0.08, 0.19, 0.08);
        }
        obb(x, z, 0.45, 0.45, ry || 0, y, y + 1.0, 'wood', true, false);
      },
      sofa(x, z, y, ry) {
        pb(P, C.velvet, x, z, y, ry, 0, 0.30, -0.02, 1.96, 0.22, 0.84);
        pb(P, C.velvet, x, z, y, ry, 0, 0.70, 0.34, 2.0, 0.58, 0.22);
        for (const sx of [-1, 1]) {
          pb(P, C.velvet, x, z, y, ry, sx * 0.93, 0.52, 0.0, 0.14, 0.24, 0.86);
          for (const sz of [-1, 1]) pb(T, C.woodDark, x, z, y, ry, sx * 0.9, 0.095, sz * 0.36, 0.08, 0.19, 0.08);
        }
        obb(x, z, 1.0, 0.45, ry || 0, y, y + 0.95, 'wood', true, false);
      },
      /** A real bed: a frame on feet, a mattress, a cover down its sides, pillows, a headboard
       *  at the BACK (+z) and a low footboard. o: { made: false, blanket: key }. */
      bed(x, z, y, ry, w, l, o) {
        const bw = w || 1.6, bl = l || 2.1, O = o || {};
        const WD = C.woodDark, bc = PALETTE[O.blanket || 'blanket'] || C.blanket;
        pb(T, WD, x, z, y, ry, 0, 0.25, 0, bw, 0.22, bl - 0.12);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) pb(T, WD, x, z, y, ry, sx * (bw / 2 - 0.05), 0.07, sz * (bl / 2 - 0.1), 0.08, 0.14, 0.08);
        pb(P, C.linen, x, z, y, ry, 0, 0.45, 0.02, bw - 0.08, 0.18, bl - 0.22);
        pb(T, WD, x, z, y, ry, 0, 0.62, bl / 2 - 0.04, bw + 0.06, 1.24, 0.08);
        pb(T, WD, x, z, y, ry, 0, 0.32, -(bl / 2 - 0.04), bw + 0.06, 0.64, 0.07);
        if (O.made !== false) {
          pb(P, bc, x, z, y, ry, 0, 0.555, -0.14, bw - 0.02, 0.03, bl - 0.66);
          for (const sx of [-1, 1]) pb(P, bc, x, z, y, ry, sx * (bw / 2 - 0.018), 0.44, -0.14, 0.025, 0.26, bl - 0.66);
          pb(P, C.linen, x, z, y, ry, 0, 0.58, bl / 2 - 0.62, bw - 0.05, 0.02, 0.3);
        }
        const two = bw > 1.2;
        for (let i = 0; i < (two ? 2 : 1); i++) {
          const px = two ? (i ? 1 : -1) * bw * 0.24 : 0;
          pb(P, C.linen, x, z, y, ry, px, 0.60, bl / 2 - 0.27, two ? bw * 0.42 : bw * 0.7, 0.11, 0.34);
        }
        obb(x, z, bw / 2, bl / 2, ry || 0, y, y + 0.66, 'wood', true, false);
      },
      cabinet(x, z, y, ry, w, h, d, mat) {
        const cw = w || 1.2, ch = h || 2.1, cd = d || 0.5, m = mat || 'woodDark';
        const K = kitOf(m), col = PALETTE[m] || C.woodDark;
        pb(K, col, x, z, y, ry, 0, ch / 2, 0, cw, ch, cd);
        pb(K, col, x, z, y, ry, 0, ch + 0.04, 0, cw + 0.06, 0.08, cd + 0.06);
        if (K === T && ch > 0.8) {
          // two door panels and their pulls, so the front reads as doors and not a block
          const dk = [col[0] * 0.7, col[1] * 0.7, col[2] * 0.7];
          for (const sx of [-1, 1]) {
            pb(T, dk, x, z, y, ry, sx * cw / 4, ch * 0.5, -(cd / 2 + 0.008), cw / 2 - 0.1, ch * 0.74, 0.016);
            pb(S, C.brass, x, z, y, ry, sx * 0.05, ch * 0.52, -(cd / 2 + 0.022), 0.025, 0.08, 0.02);
          }
        }
        obb(x, z, cw / 2, cd / 2, ry || 0, y, y + ch, 'wood', true, false);
      },
      /** An open bookcase with its books ON the shelves: runs of spines in five bindings,
       *  never taller than the gap, and here and there a run already taken. */
      bookcase(x, z, y, ry, w) {
        const bw = w || 2.0, H = 2.4, D = 0.4, col = C.woodMid;
        pb(T, col, x, z, y, ry, 0, H / 2, D / 2 - 0.015, bw, H, 0.03);
        for (const sx of [-1, 1]) pb(T, col, x, z, y, ry, sx * (bw / 2 - 0.02), H / 2, 0, 0.04, H, D);
        pb(T, col, x, z, y, ry, 0, H + 0.04, 0, bw + 0.06, 0.08, D + 0.06);
        pb(T, col, x, z, y, ry, 0, 0.06, 0, bw - 0.08, 0.12, D);
        const tops = [0.12, 0.68, 1.24, 1.8];
        for (let i = 1; i < tops.length; i++) pb(T, col, x, z, y, ry, 0, tops[i] - 0.015, 0, bw - 0.08, 0.03, D - 0.02);
        for (let i = 0; i < tops.length; i++) {
          const gap = (i + 1 < tops.length ? tops[i + 1] - 0.03 : H - 0.02) - tops[i];
          let a = -bw / 2 + 0.06, n = 0;
          while (a < bw / 2 - 0.14 && n < 8) {
            const u = h01(x + a, z + i, n++);
            const len = Math.min(0.16 + u * 0.36, bw / 2 - 0.05 - a);
            if (len < 0.08) break;
            if (u > 0.86) { a += len; continue; }                 // taken
            const bh = Math.min(gap - 0.04, 0.2 + h01(x, z + a, i) * 0.14);
            pb(P, BOOKS[Math.floor(u * 97) % BOOKS.length], x, z, y, ry, a + len / 2, tops[i] + bh / 2, 0.03, len, bh, D - 0.12);
            a += len + 0.012;
          }
        }
        obb(x, z, bw / 2, D / 2, ry || 0, y, y + H, 'wood', true, false);
      },
      piano(x, z, y, ry) {
        pb(T, C.dark, x, z, y, ry, 0, 0.85, 0, 1.5, 0.28, 2.2);
        pb(T, C.dark, x, z, y, ry, 0, 1.0, 0, 1.5, 0.1, 2.2);
        for (const [px, pz] of [[-0.6, -0.9], [0.6, -0.9], [0, 0.9]]) pc(T, C.dark, x, z, y, ry, px, 0.36, pz, 0.05, 0.06, 0.72, 6);
        pb(S, C.paper, x, z, y, ry, 0, 0.75, -1.1, 1.3, 0.06, 0.3);
        obb(x, z, 0.75, 1.1, ry || 0, y, y + 1.05, 'wood', true, false);
      },
      pew(x, z, y, ry) {
        pb(T, C.woodDark, x, z, y, ry, 0, 0.45, 0, 2.4, 0.05, 0.42);
        pb(T, C.woodDark, x, z, y, ry, 0, 0.7, 0.2, 2.4, 0.5, 0.05);
        for (const sx of [-1, 1]) pb(T, C.woodDark, x, z, y, ry, sx * 1.17, 0.22, 0, 0.06, 0.45, 0.42);
        obb(x, z, 1.2, 0.24, ry || 0, y, y + 0.95, 'wood', true, false);
      },
      barrel(x, z, y) {
        T.open();
        T.cyl(0.34, 0.30, 0.9, 9, LX(x), LY(y + 0.45), LZ(z), C.woodMid);
        T.tube(0.35, 0.35, 0.05, 9, LX(x), LY(y + 0.25), LZ(z), C.metal);
        T.tube(0.35, 0.35, 0.05, 9, LX(x), LY(y + 0.65), LZ(z), C.metal);
        T.close(LX(x), LZ(z), 0.5, C.woodMid);
        circle(x, z, 0.36, y, y + 0.9, 'wood', true);
      },
      crate(x, z, y, ry, s) {
        const cs = s || 0.8;
        T.open();
        pb(T, C.woodMid, x, z, y, ry, 0, cs * 0.4, 0, cs, cs * 0.8, cs);
        T.close(LX(x), LZ(z), cs * 0.7, C.woodMid);
        obb(x, z, cs / 2, cs / 2, ry || 0, y, y + cs * 0.8, 'wood', true);
      },
      rug(x, z, y, w, d, mat) {
        P.box(w, 0.02, d, LX(x), LY(y + 0.011), LZ(z), PALETTE[mat || 'velvet'] || C.velvet);
      },
      /** A framed canvas on a wall, facing the room. `turned`: turned to face the wall, so
       *  what you see is the back of the stretcher, two battens and the wire it hung from.
       *  `py` is the centre height (default 1.7). The frame's back is 0.035 behind (x, z). */
      portrait(x, z, y, ry, w, h, turned, py) {
        const pw = w || 0.9, ph = h || 1.2, cy = py || 1.7;
        if (turned) {
          pb(T, C.woodMid, x, z, y, ry, 0, cy, 0.017, pw + 0.12, ph + 0.12, 0.034);
          for (const sx of [-1, 1]) pb(T, C.woodDark, x, z, y, ry, sx * pw * 0.28, cy, -0.012, 0.05, ph, 0.024);
          pb(T, C.woodDark, x, z, y, ry, 0, cy, -0.012, pw, 0.05, 0.024);
          // the wire, slack between its two eyes, hanging off the back where it came off the hook
          for (const sx of [-1, 1]) pb(S, C.metal, x, z, y, ry, sx * pw * 0.2, cy + ph * 0.25 - 0.05, -0.026, pw * 0.42, 0.006, 0.004, 0, sx * 0.24);
          return;
        }
        // THE PORTRAITS ARE PAINTED (r3 polish). MEASURED in the critic's shots: every hung
        // canvas was a C.dark quad on the plaster channel, and under the torch it was a blank
        // grey sheet with the wall's cracks on it: a missing texture, thirty times, in the one
        // genre where the portraits are the house. Now: a dark backing flush on the wall, the
        // canvas on the cloth channel (its weave reads as canvas) in umber, a sitter's bust in
        // vertex colour a few millimetres proud of it, and an old gilt moulding standing 4 cm
        // off the wall round it. Some of the faces have had their eyes gouged out, some have
        // been scratched out, one or two painted over black: by a hash of where it hangs, so
        // nothing spends the site's rng. Nothing is deeper than the moulding.
        // the backing shows only as the frame's outer edge, from the wall to the moulding
        pf(T, C.woodDark, x, z, y, ry, 0, cy, 0.015, pw + 0.12, ph + 0.12, 0.04, F.PX | F.NX | F.PY | F.NY);
        const q = fr(x, z, ry, 0, -0.007);
        P.quad(pw, ph, LX(q[0]), LY(y + cy), LZ(q[1]), C.umber, (ry || 0) + Math.PI, 0);
        for (const sy of [-1, 1]) pf(S, C.oldGilt, x, z, y, ry, 0, cy + sy * (ph / 2 + 0.03), -0.0225, pw + 0.12, 0.06, 0.035, F.NZ | F.PY | F.NY | F.PX | F.NX);
        for (const sx of [-1, 1]) pf(S, C.oldGilt, x, z, y, ry, sx * (pw / 2 + 0.03), cy, -0.0225, 0.06, ph, 0.035, F.NZ | F.PX | F.NX);
        // The paint is flat discs a couple of millimetres apart, facing the room: a painting
        // has no depth to model, and a disc is 14 triangles where an ellipsoid is a hundred.
        const U = Math.min(pw, ph * 0.75), v = h01(x, z, 21), v2 = h01(z, x, 22);
        const dress = [C.velvetBlack, C.velvetPlum, C.velvetGreen, C.blanketBlue][Math.floor(v2 * 4)];
        const hair = v2 > 0.7 ? [0.11, 0.10, 0.09] : C.hair;
        const disc = (col, px, py, pz, rx, rh, seg, top) => {
          const g = top ? new THREE.CircleGeometry(1, seg || 14, 0, Math.PI) : new THREE.CircleGeometry(1, seg || 14);
          g.scale(rx, rh, 1);
          const qq = fr(x, z, ry, px, pz);
          P.at(g, col, LX(qq[0]), LY(y + py), LZ(qq[1]), (ry || 0) + Math.PI);
        };
        const fy = cy - ph * 0.02, fh = U * 0.189, fz = -0.0125;       // the face: centre, half height, plane
        const shTop = cy - ph / 2 - 0.01 + U * 0.4;
        // the shoulders: the top half of an ellipse whose flat foot is behind the bottom moulding
        disc(dress, 0, cy - ph / 2 - 0.01, -0.009, U * 0.44, U * 0.4, 18, true);
        pb(P, C.sitterSkin, x, z, y, ry, 0, (shTop + fy - fh * 0.8) / 2, -0.0100, U * 0.085, fy - fh * 0.8 - shTop + 0.02, 0.002);   // the neck
        disc(C.linen, 0, shTop, -0.0125, U * 0.12, U * 0.035);                                  // the collar
        disc(hair, 0, fy + ph * 0.03, -0.009, U * 0.17, U * 0.218);
        disc(C.sitterSkin, 0, fy, fz, U * 0.138, fh);
        const ey = fy + U * 0.05, exx = U * 0.045;
        if (v < 0.35) {
          for (const sx of [-1, 1]) disc(C.sitterDark, sx * exx, ey, fz - 0.002, U * 0.014, U * 0.009, 8);
        } else if (v < 0.65) {
          // the eyes gouged out to the bare canvas, and a tear run down from each
          for (const sx of [-1, 1]) {
            disc(C.rawCanvas, sx * exx, ey, fz - 0.002, U * 0.027, U * 0.022, 9);
            pb(P, C.rawCanvas, x, z, y, ry, sx * exx, ey - U * 0.07, fz - 0.0025, 0.006, U * 0.1, 0.002, 0, sx * 0.08);
          }
        } else if (v < 0.9) {
          // the face scratched out: strokes across it, raw canvas in every one
          for (let i = 0; i < 6; i++) {
            const t = h01(x + i, z, 23);
            pb(P, C.rawCanvas, x, z, y, ry, (t - 0.5) * U * 0.08, fy + (i - 2.5) * U * 0.035, fz - 0.0025, 0.009, U * 0.22, 0.002, 0, 0.6 + (t - 0.5) * 0.5);
          }
        } else {
          disc(C.sitterDark, 0, fy + U * 0.01, fz - 0.002, U * 0.152, U * 0.2);                     // painted over
        }
      },
      hearth(x, z, y, ry) {
        pb(S, C.stone, x, z, y, ry, 0, 0.625, 0, 1.8, 1.25, 0.5);
        pb(S, C.dark, x, z, y, ry, 0, 0.45, -0.14, 1.1, 0.9, 0.3);
        pb(T, C.woodDark, x, z, y, ry, 0, 1.3, -0.025, 2.0, 0.1, 0.55);
        // the grate and what is left in it
        pb(S, C.metal, x, z, y, ry, 0, 0.03, -0.38, 0.7, 0.06, 0.2);
        ps(S, C.food, x, z, y, ry, 0, 0.075, -0.38, 0.2, 1.5, 0.3, 0.55);
        obb(x, z, 0.9, 0.25, ry || 0, y, y + 1.3, 'stone', false, false);
      },
      /** A floor candle-stand, 1.1 m. */
      candle(x, z, y) {
        S.cyl(0.04, 0.06, 0.9, 6, LX(x), LY(y + 0.45), LZ(z), C.brass);
        S.cyl(0.03, 0.03, 0.2, 6, LX(x), LY(y + 1.0), LZ(z), C.paper);
      },
      /** A short candlestick for a table top at `ty`, with the candle burned down. */
      candlestick(x, z, ty) {
        S.cyl(0.05, 0.06, 0.02, 8, LX(x), LY(ty + 0.01), LZ(z), C.brass);
        S.cyl(0.014, 0.018, 0.14, 6, LX(x), LY(ty + 0.09), LZ(z), C.brass);
        S.cyl(0.028, 0.02, 0.02, 8, LX(x), LY(ty + 0.17), LZ(z), C.brass);
        S.cyl(0.014, 0.014, 0.05, 6, LX(x), LY(ty + 0.205), LZ(z), C.wax);
      },
      /** Three arms, three stubs burned 3-6 cm down, and the wax that ran. */
      candelabrum(x, z, ty) {
        S.cyl(0.07, 0.085, 0.024, 10, LX(x), LY(ty + 0.012), LZ(z), C.brass);
        S.cyl(0.012, 0.016, 0.36, 6, LX(x), LY(ty + 0.2), LZ(z), C.brass);
        S.box(0.36, 0.018, 0.018, LX(x), LY(ty + 0.37), LZ(z), C.brass);
        for (const sx of [-0.17, 0, 0.17]) {
          const hh = 0.03 + h01(x + sx, z, 3) * 0.03;
          S.cyl(0.026, 0.02, 0.03, 8, LX(x + sx), LY(ty + 0.393), LZ(z), C.brass);
          S.cyl(0.012, 0.012, hh, 6, LX(x + sx), LY(ty + 0.408 + hh / 2), LZ(z), C.wax);
          S.box(0.01, 0.045, 0.01, LX(x + sx + 0.022), LY(ty + 0.385), LZ(z), C.wax);
        }
      },
      chandelier(x, z, yCeil) {
        S.cyl(0.02, 0.02, 1.6, 4, LX(x), LY(yCeil - 0.8), LZ(z), C.metal);
        S.tube(0.9, 0.9, 0.08, 12, LX(x), LY(yCeil - 1.6), LZ(z), C.brass);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          S.cyl(0.025, 0.025, 0.22, 4, LX(x + Math.cos(a) * 0.9), LY(yCeil - 1.5), LZ(z + Math.sin(a) * 0.9), C.paper);
        }
      },
      sarcophagus(x, z, y, ry) {
        pb(S, C.stoneDark, x, z, y, ry, 0, 0.4, 0, 2.2, 0.8, 0.95);
        pb(S, C.stone, x, z, y, ry, 0, 0.87, 0, 2.3, 0.14, 1.05);
        obb(x, z, 1.15, 0.52, ry || 0, y, y + 0.94, 'stone', true, false);
      },
      /** The middle one in the crypt: open, and empty. The lid is slid off the foot and
       *  down onto the floor at one corner; five pale grooves run up the INSIDE of the box
       *  toward the head, where the lid was. */
      openSarcophagus(x, z, y, ry) {
        pb(S, C.stoneDark, x, z, y, ry, 0, 0.06, 0, 2.2, 0.12, 0.95);            // floor slab of the box
        for (const sz of [-1, 1]) pb(S, C.stoneDark, x, z, y, ry, 0, 0.44, sz * 0.4, 2.2, 0.64, 0.15);
        for (const sx of [-1, 1]) pb(S, C.stoneDark, x, z, y, ry, sx * 1.025, 0.44, 0, 0.15, 0.64, 0.65);
        pb(S, C.velvetBlack, x, z, y, ry, 0, 0.125, 0, 1.9, 0.01, 0.65);           // the dark in the bottom
        for (let i = 0; i < 5; i++) {
          pb(S, C.plaster, x, z, y, ry, 0.35 + i * 0.1, 0.5 + (i % 2) * 0.05, -0.322, 0.012, 0.36, 0.006, 0, 0.22 + i * 0.03);
        }
        // the lid, levered off the foot: its end down on the stone floor, the rest of it across
        // the rim of the box it came off (its weight on the floor side, so it lies there)
        pb(S, C.stone, x, z, y, ry, -1.407, 0.65, 0.1, 2.3, 0.14, 1.05, 0, 0.53);
        pb(S, C.stone, x, z, y, ry, -2.62, 0.05, 0.62, 0.3, 0.1, 0.22);            // the corner that broke off
        obb(x, z, 1.15, 0.52, ry || 0, y, y + 0.76, 'stone', false, false);
        const q = fr(x, z, ry, -1.8, 0.1);
        obb(q[0], q[1], 0.65, 0.52, ry || 0, y, y + 0.5, 'stone', true, false);
      },
      boiler(x, z, y) {
        S.cyl(0.9, 0.9, 2.2, 12, LX(x), LY(y + 1.1), LZ(z), C.rust);
        S.cyl(0.95, 0.95, 0.2, 12, LX(x), LY(y + 2.25), LZ(z), C.metal);
        S.box(0.5, 0.5, 0.2, LX(x), LY(y + 0.8), LZ(z - 0.95), C.dark);
        S.cyl(0.12, 0.12, 2.0, 6, LX(x + 0.6), LY(y + 3.0), LZ(z + 0.5), C.metal, 0, 0, Math.PI * 0.5);
        circle(x, z, 0.95, y, y + 2.4, 'metal', false, false);
      },
      rack(x, z, y, ry, w) {
        V.cabinet(x, z, y, ry, w || 2.0, 2.0, 0.45, 'woodDark');
        for (const sh of [0.4, 0.9, 1.4]) pb(S, C.plasterOld, x, z, y, ry, 0, sh, -0.26, (w || 2.0) - 0.2, 0.06, 0.08);
      },
      fuseboard(x, z, y, ry) {
        // THE CLAIM, rebuilt ROUND 7 lane B. docs/NEXT.md B9: "the cellar breaker washes to
        // white under the torch." Measured 2026-09-03 (tests/manor.mjs section (d)): the
        // cellar at the breaker reads mean 98.9, max 155, with 38 % of the frame in two
        // adjacent 16-wide buckets — one value, wall to fixture. The old board WAS that
        // failure in three lines: a 0.128 metal slab hung flat on a 0.125 stone wall, so the
        // thing you have to find measured the same as the thing behind it.
        //
        // docs/ART.md's answer is value STRUCTURE, not candela, and the light here cannot be
        // turned down (the torch is global, ART 1.9). So the fixture is built out of the
        // BOTTOM of the range instead: a near-black recess cut into the wall, a near-black
        // frame round it and a near-black door leaf standing open, with one small pale
        // enamel plate inside barred by dark switch rows. 0.030 albedo against a 0.125 wall
        // is a 4x luminance ratio whatever the torch does to the wall, which clears FETCH's
        // legibility law (>= 1.6x at every new read) by a factor of two.
        const r = ry || 0;
        const c = Math.cos(r), s = Math.sin(r);
        // out is the wall's outward normal in donor metres, in is into the wall
        const ox = -s, oz = -c;
        const B = [0.030, 0.030, 0.032];      // the recess: the darkest surface in the house
        const F = [0.048, 0.046, 0.044];      // the frame and the door leaf
        const P = [0.205, 0.198, 0.180];      // the enamel plate, the only pale thing here
        // the recess, sunk into the wall so the fixture reads as a HOLE with a thing in it
        S.box(1.30, 1.50, 0.10, LX(x + ox * 0.02), LY(y + 1.35), LZ(z + oz * 0.02), B, r);
        // its frame: four dark returns standing proud of the wall
        S.box(1.44, 0.11, 0.16, LX(x + ox * 0.10), LY(y + 2.15), LZ(z + oz * 0.10), F, r);
        S.box(1.44, 0.11, 0.16, LX(x + ox * 0.10), LY(y + 0.55), LZ(z + oz * 0.10), F, r);
        for (const e of [-1, 1]) {
          S.box(0.11, 1.60, 0.16, LX(x + ox * 0.10 - e * 0.66 * c), LY(y + 1.35), LZ(z + oz * 0.10 + e * 0.66 * s), F, r);
        }
        // the cabinet in the recess, and its door hanging open on the left hinge
        S.box(0.70, 1.00, 0.20, LX(x + ox * 0.13), LY(y + 1.35), LZ(z + oz * 0.13), F, r);
        S.box(0.66, 0.92, 0.05, LX(x + ox * 0.34 - 0.44 * c), LY(y + 1.35), LZ(z + oz * 0.34 + 0.44 * s), F, r + 1.15);
        // the enamel plate: 0.36 m^2, the whole pale budget of this fixture
        S.box(0.50, 0.72, 0.03, LX(x + ox * 0.24), LY(y + 1.35), LZ(z + oz * 0.24), P, r);
        // three rows of dark switch bodies barring it, so the plate is never a bright slab
        for (let i = 0; i < 3; i++) {
          S.box(0.46, 0.09, 0.07, LX(x + ox * 0.28), LY(y + 1.62 - i * 0.26), LZ(z + oz * 0.28), B, r);
          for (let j = 0; j < 4; j++) {
            S.box(0.05, 0.13, 0.05, LX(x + ox * 0.30 - (j - 1.5) * 0.13 * c), LY(y + 1.62 - i * 0.26),
              LZ(z + oz * 0.30 + (j - 1.5) * 0.13 * s), F, r);
          }
        }
        // the handle, and the conduit that comes down the wall and goes up through the ceiling
        S.box(0.14, 0.14, 0.30, LX(x + ox * 0.30 + 0.30 * c), LY(y + 1.35), LZ(z + oz * 0.30 - 0.30 * s), PALETTE.rust, r);
        S.cyl(0.045, 0.045, 1.2, 5, LX(x + 0.22 * c + ox * 0.08), LY(y + 0.6), LZ(z - 0.22 * s + oz * 0.08), B);
        S.cyl(0.045, 0.045, 1.4, 5, LX(x + ox * 0.08), LY(y + 2.5), LZ(z + oz * 0.08), B);
        S.box(0.24, 0.10, 0.10, LX(x + ox * 0.08), LY(y + 2.20), LZ(z + oz * 0.08), B, r);
      },
      /** A DADO. docs/ART.md 0.4: a room at 10 m has to have more than one value in it or it
       *  is a box. The cellar's stone is 0.125 everywhere and the torch takes all of it to
       *  the same place, so the lower metre of every cellar wall is laid in a near-black
       *  course: the room gains a horizon, and the horizon is what tells you how big it is.
       *  Geometry only — no collider, it stands 0.06 m proud inside a 0.26 m wall. */
      dado(room, y) {
        const D = [0.052, 0.050, 0.048], H = 1.05, T = 0.10;
        const x0 = room.wx0 + 0.06, x1 = room.wx1 - 0.06, z0 = room.wz0 + 0.06, z1 = room.wz1 - 0.06;
        // Trim follows the same openings as the wall. An uninterrupted decorative
        // strip used to make every usable door look barricaded at knee height.
        for (const [axis, plane, inset, lo, hi] of [
          ['H', room.wz0, z0 + T / 2, x0, x1], ['H', room.wz1, z1 - T / 2, x0, x1],
          ['V', room.wx0, x0 + T / 2, z0, z1], ['V', room.wx1, x1 - T / 2, z0, z1],
        ]) {
          const gaps = [];
          for (let cell = Math.floor(lo / CS); cell < Math.ceil(hi / CS); cell++) {
            const ex = axis === 'H' ? cell : plane / CS, ez = axis === 'H' ? plane / CS : cell;
            const a = cellRoom(room.level, axis === 'H' ? ex : ex - 1, axis === 'H' ? ez - 1 : ez);
            const b = cellRoom(room.level, ex, ez);
            const pair = a && b ? [a.id, b.id].sort().join('|') : null;
            if (a === b || (pair && (openSet.has(pair) || railSet.has(pair)))) {
              gaps.push([cell * CS, (cell + 1) * CS]);
            }
          }
          for (const door of doorPoints) {
            if (door.level !== room.level || door.axis !== axis || Math.abs((axis === 'H' ? door.z : door.x) - plane) > 0.01) continue;
            const mid = axis === 'H' ? door.x : door.z;
            gaps.push([mid - door.width / 2 - 0.04, mid + door.width / 2 + 0.04]);
          }
          let spans = [[lo, hi]];
          for (const [g0, g1] of gaps) {
            const next = [];
            for (const [s0, s1] of spans) {
              if (g1 <= s0 || g0 >= s1) next.push([s0, s1]);
              else {
                if (g0 > s0) next.push([s0, g0]);
                if (g1 < s1) next.push([g1, s1]);
              }
            }
            spans = next;
          }
          for (const [s0, s1] of spans) {
            if (s1 - s0 < 0.02) continue;
            const isX = axis === 'H', mid = (s0 + s1) / 2;
            const x = isX ? mid : inset, z = isX ? inset : mid, len = s1 - s0;
            S.box(isX ? len : T, H, isX ? T : len, LX(x), LY(y + H / 2), LZ(z), D);
            S.box(isX ? len : T + 0.06, 0.07, isX ? T + 0.06 : len,
              LX(x), LY(y + H + 0.035), LZ(z), PALETTE.stoneDark);
          }
        }
      },

      /**
       * TRIM (r3 polish). MEASURED in the critic's shots: the brick-peel paper ran floor to
       * ceiling in every room with nothing across it, so no room had a scale. Now a skirting at
       * the floor, a dado rail at 0.9 m and a cornice under the ceiling, all on the timber
       * channel; the foyer, the dining room and the library are panelled to the dado (a field,
       * stiles every 0.6 m and a top rail); the service rooms get a skirting and nothing else.
       * It is cut round every door and its frame, every open or railed edge, every window whose
       * height it would cross, and wherever the floor is a stairwell. Measured from each wall's
       * own face (interior 0.13, outside 0.20) and sunk 5 mm into it. No collider: nothing here
       * stands more than 6 cm off a wall, and the cornice is out of reach.
       */
      trim(room, y) {
        const lvl = room.level, top = (room.tall ? TALL_CEIL : LV[lvl].ceil) - y;
        const grand = TRIM_GRAND.has(room.id), service = TRIM_SERVICE.has(room.id);
        const sk = grand ? 0.2 : 0.15;
        // [y0, y1, proud, colour, floor-bound] per course, heights above this floor
        const els = [[0, sk, grand ? 0.03 : 0.022, C.woodDark, true]];
        if (!service) {
          els.push([0.86, 0.92, 0.034, C.woodDark, true]);
          els.push([top - 0.15, top, 0.06, C.woodDark, false], [top - 0.22, top - 0.15, 0.028, C.woodDark, false]);
        }
        if (grand) els.push([sk, 0.8, 0.012, C.woodMid, true], [0.8, 0.86, 0.024, C.woodDark, true]);
        for (let side = 0; side < 4; side++) {
          const isX = side === 0 || side === 2;
          const plane = side === 0 ? room.wz0 : side === 2 ? room.wz1 : side === 1 ? room.wx1 : room.wx0;
          const inward = side === 0 || side === 3 ? 1 : -1;
          const lo = isX ? room.wx0 : room.wz0, hi = isX ? room.wx1 : room.wz1;
          // per cell: its face offset, or null where there is no wall; and whether the floor is there
          const cells = [];
          for (let c = Math.round(lo / CS); c < Math.round(hi / CS); c++) {
            const nb = side === 0 ? cellRoom(lvl, c, room.z0 - 1) : side === 2 ? cellRoom(lvl, c, room.z1 + 1)
              : side === 1 ? cellRoom(lvl, room.x1 + 1, c) : cellRoom(lvl, room.x0 - 1, c);
            const pair = nb ? [room.id, nb.id].sort().join('|') : null;
            const open = pair && (openSet.has(pair) || railSet.has(pair));
            const own = side === 0 ? [c, room.z0] : side === 2 ? [c, room.z1] : side === 1 ? [room.x1, c] : [room.x0, c];
            cells.push({ a0: c * CS, a1: (c + 1) * CS, face: open ? null : (nb ? WALL_T / 2 : EXT_T / 2), hole: isFloorHole(lvl, own[0], own[1]) });
          }
          const doorGaps = [];
          for (const d of doorPoints) {
            if (d.level !== lvl || d.axis !== (isX ? 'H' : 'V') || Math.abs((isX ? d.z : d.x) - plane) > 0.01) continue;
            const m = isX ? d.x : d.z;
            doorGaps.push([m - d.width / 2 - 0.12, m + d.width / 2 + 0.12]);
          }
          for (const [e0, e1, pr, col, floorBound] of els) {
            const gaps = doorGaps.slice();
            for (const h of windowHoles) {
              if (h.axis !== (isX ? 'H' : 'V') || Math.abs(h.plane - plane) > 0.01) continue;
              if (y + e1 <= h.y0 - 0.06 || y + e0 >= h.y1 + 0.06) continue;
              gaps.push([h.a0 - 0.07, h.a1 + 0.07]);
            }
            // runs of cells with one face, cut by the gaps
            let runs = [];
            for (const c of cells) {
              if (c.face === null || (floorBound && c.hole)) continue;
              const last = runs[runs.length - 1];
              if (last && last.face === c.face && Math.abs(last.a1 - c.a0) < 0.001) last.a1 = c.a1;
              else runs.push({ a0: c.a0, a1: c.a1, face: c.face });
            }
            for (const [g0, g1] of gaps) {
              const next = [];
              for (const r of runs) {
                if (g1 <= r.a0 || g0 >= r.a1) { next.push(r); continue; }
                if (g0 > r.a0) next.push({ a0: r.a0, a1: g0, face: r.face });
                if (g1 < r.a1) next.push({ a0: g1, a1: r.a1, face: r.face });
              }
              runs = next;
            }
            // what shows: the face to the room, the top of a floor course or the underside of
            // a ceiling one, and an end only where a run stops short of the room's corner
            const FRONT = isX ? (inward > 0 ? F.PZ : F.NZ) : (inward > 0 ? F.PX : F.NX);
            const field = grand && e0 === sk && e1 === 0.8;
            const cap = field ? 0 : (floorBound ? F.PY : F.NY);
            const part = (a0, a1, b0, b1, v0, v1, mask) => {
              const c0 = plane + inward * b0, c1 = plane + inward * b1;
              if (isX) faces(T, col, a0, a1, v0, v1, Math.min(c0, c1), Math.max(c0, c1), mask);
              else faces(T, col, Math.min(c0, c1), Math.max(c0, c1), v0, v1, a0, a1, mask);
            };
            for (const r of runs) {
              const len = r.a1 - r.a0;
              if (len < 0.05) continue;
              let mask = FRONT | cap;
              if (!field && r.a0 > lo + 0.01) mask |= isX ? F.NX : F.NZ;
              if (!field && r.a1 < hi - 0.01) mask |= isX ? F.PX : F.PZ;
              part(r.a0, r.a1, r.face - 0.005, r.face + pr, y + e0, y + e1, mask);
              // the stiles of the panelling, one every ~0.6 m, inside the run: 2.4 cm proud of
              // the wall, 1.2 cm proud of the field; their faces and their sides
              if (field) {
                const n = Math.max(1, Math.round((len - 0.07) / 0.6));
                for (let i = 0; i <= n; i++) {
                  const a = r.a0 + 0.035 + i * (len - 0.07) / n;
                  part(a - 0.035, a + 0.035, r.face + 0.01, r.face + 0.024, y + sk, y + 0.8, FRONT | (isX ? F.PX | F.NX : F.PZ | F.NZ));
                }
              }
            }
          }
        }
      },

      /* ---------------------------------- r3: what the guests left ---------------- */

      /** A long-case clock, stopped at one fifty-nine. */
      longcase(x, z, y, ry) {
        const WD = C.woodDark;
        pb(T, WD, x, z, y, ry, 0, 0.14, 0, 0.56, 0.28, 0.38);
        pb(T, WD, x, z, y, ry, 0, 0.98, 0.02, 0.44, 1.4, 0.3);
        pb(S, C.glass, x, z, y, ry, 0, 1.0, -0.132, 0.22, 0.9, 0.006);
        pb(T, WD, x, z, y, ry, 0, 1.98, 0, 0.54, 0.6, 0.36);
        pb(T, WD, x, z, y, ry, 0, 2.32, 0, 0.6, 0.08, 0.4);
        pk(T, WD, x, z, y, ry, 0, 2.42, 0, 0.12, 0.12, 6);
        dial(x, z, y, ry, 0, 1.98, -0.186, 0.17);
        obb(x, z, 0.28, 0.19, ry || 0, y, y + 2.36, 'wood', false, false);
      },
      /** A bracket clock on a mantel or a shelf (`ty` is the top it stands on). */
      bracketClock(x, z, ty, ry) {
        pb(T, C.woodDark, x, z, ty, ry, 0, 0.17, 0, 0.3, 0.34, 0.17);
        pb(T, C.woodDark, x, z, ty, ry, 0, 0.365, 0, 0.2, 0.05, 0.12);
        pb(S, C.brass, x, z, ty, ry, 0, 0.405, 0, 0.1, 0.03, 0.03);
        dial(x, z, ty, ry, 0, 0.2, -0.091, 0.09);
      },
      /**
       * A GUEST, still at breakfast. Seated on the chair at (x, z) whose back is at +(sin ry,
       * cos ry): thighs on the seat, shins to the floor, the torso leaning in, forearms on the
       * table top at 0.76 and the hands beside the plate. Dark velvet, a pale ruff, and a
       * pale MASK over the front of a dark head with two slits for eyes (`beak`: the long
       * Venetian nose). Built to the chair's own numbers so nothing sinks into it.
       */
      guest(x, z, y, ry, tone, beak) {
        const cl = PALETTE[tone || 'velvetBlack'] || C.velvetBlack;
        pb(P, cl, x, z, y, ry, 0, 0.545, -0.08, 0.38, 0.14, 0.46);
        for (const sx of [-1, 1]) {
          pb(P, cl, x, z, y, ry, sx * 0.1, 0.245, -0.31, 0.12, 0.49, 0.12);
          pb(P, C.leather, x, z, y, ry, sx * 0.1, 0.035, -0.37, 0.1, 0.07, 0.22);
          pb(P, cl, x, z, y, ry, sx * 0.235, 0.96, -0.16, 0.1, 0.34, 0.11, 0.55);
          pb(P, cl, x, z, y, ry, sx * 0.19, 0.82, -0.42, 0.09, 0.09, 0.34);
          ps(P, C.skin, x, z, y, ry, sx * 0.17, 0.815, -0.62, 0.045, 1, 0.7, 1.3);
        }
        pb(P, cl, x, z, y, ry, 0, 0.87, -0.06, 0.4, 0.56, 0.24, -0.22);
        pc(P, C.linen, x, z, y, ry, 0, 1.165, -0.15, 0.135, 0.1, 0.06, 10);
        pc(P, C.skin, x, z, y, ry, 0, 1.22, -0.17, 0.045, 0.05, 0.1, 8);
        ps(P, C.hair, x, z, y, ry, 0, 1.35, -0.19, 0.115, 0.95, 1.08, 1.0);
        maskFace(x, z, y + 1.35, -0.245, ry, beak);
        circle(x, z, 0.32, y, y + 1.48, 'cloth', false, false);
      },
      /** A place laid at `ty` (the table top): -z of this frame is the diner. */
      setting(x, z, ty, ry, food, knocked) {
        pc(S, C.china, x, z, ty, ry, 0, 0.008, 0, 0.13, 0.11, 0.016, 14);
        if (food) ps(P, C.food, x, z, ty, ry, 0.01, 0.03, 0.01, 0.07, 1, 0.3, 0.75);
        pb(S, C.metal, x, z, ty, ry, 0.19, 0.003, 0, 0.018, 0.006, 0.2);
        pb(S, C.metal, x, z, ty, ry, -0.19, 0.003, 0, 0.018, 0.006, 0.2);
        pc(S, C.china, x, z, ty, ry, 0.2, 0.004, 0.2, 0.07, 0.06, 0.008, 10);
        if (knocked) pc(S, C.china, x, z, ty, ry, 0.26, 0.037, 0.14, 0.036, 0.03, 0.07, 10, Math.PI / 2, 0.5);
        else pc(S, C.china, x, z, ty, ry, 0.2, 0.043, 0.2, 0.04, 0.032, 0.07, 10);
      },
      /** A masque mask lying face up on whatever is at `ty`. */
      mask(x, z, ty, ry, gilt) {
        ps(P, gilt ? C.maskGilt : C.maskPale, x, z, ty, ry, 0, 0.026, 0, 0.1, 1.0, 0.25, 1.15);
        // two almond holes, set into the curve of it (their centres 3 mm under the surface)
        for (const sx of [-1, 1]) {
          const q = fr(x, z, ry, sx * 0.04, -0.02), g = new THREE.SphereGeometry(0.025, 8, 5);
          g.scale(1, 0.3, 0.55);
          P.at(g, C.velvetBlack, LX(q[0]), LY(ty + 0.0455), LZ(q[1]), ry || 0, 0, -sx * 0.11);
        }
        pb(P, C.velvetBlack, x, z, ty, ry, 0, 0.006, 0.19, 0.012, 0.008, 0.22, 0, 0);
      },
      /** Trunks, cases and a hatbox by the door: the guests packed to leave at first light. */
      luggage(x, z, y, ry) {
        pb(T, C.woodMid, x, z, y, ry, 0, 0.26, 0, 0.96, 0.52, 0.56);
        for (const sx of [-1, 1]) pb(S, C.metal, x, z, y, ry, sx * 0.3, 0.26, 0, 0.05, 0.53, 0.57);
        pb(P, C.leather, x, z, y, ry, -0.06, 0.66, 0.02, 0.78, 0.28, 0.46);
        pb(P, C.leather, x, z, y, ry, 0.08, 0.89, 0.04, 0.56, 0.18, 0.36, 0, 0.05);
        pc(P, C.velvetPlum, x, z, y, ry, -0.22, 1.08, 0.05, 0.17, 0.17, 0.2, 12);
        pb(P, C.leather, x, z, y, ry, 0.6, 0.3, -0.04, 0.16, 0.6, 0.44, 0, 0.14);
        obb(x, z, 0.5, 0.3, ry || 0, y, y + 1.18, 'wood', false, false);
        const q = fr(x, z, ry, 0.62, -0.04);
        obb(q[0], q[1], 0.12, 0.24, ry || 0, y, y + 0.62, 'wood', false, false);
      },
      /** Pegs on a board along a wall, a coat on every peg and top hats on the shelf over
       *  them: the guests never took their coats. `len` along the wall. */
      coatRail(x, z, y, ry, len) {
        pb(T, C.woodDark, x, z, y, ry, 0, 1.78, 0.015, len, 0.14, 0.03);
        pb(T, C.woodDark, x, z, y, ry, 0, 2.02, -0.1, len, 0.03, 0.26);
        const n = Math.max(2, Math.round(len / 0.36));
        for (let i = 0; i < n; i++) {
          const a = -len / 2 + (i + 0.5) * len / n, t = h01(x + a, z, 5);
          pb(T, C.woodDark, x, z, y, ry, a, 1.76, -0.04, 0.03, 0.03, 0.08);
          const tone = [C.velvetBlack, C.velvetPlum, C.velvetGreen, C.velvetBlack][Math.floor(t * 4)];
          const top = 1.74, bot = 0.62 + t * 0.2;
          pb(P, tone, x, z, y, ry, a, (top + bot) / 2, -0.075, 0.34, top - bot, 0.1);
          pb(P, tone, x, z, y, ry, a, bot + 0.18, -0.085, 0.42, 0.36, 0.09);
          if (i % 2 === 0) {
            pc(P, C.velvetBlack, x, z, y, ry, a, 2.042, -0.1, 0.15, 0.15, 0.015, 12);
            pc(P, C.velvetBlack, x, z, y, ry, a, 2.13, -0.1, 0.09, 0.095, 0.16, 10);
          }
        }
        obb(fr(x, z, ry, 0, -0.08)[0], fr(x, z, ry, 0, -0.08)[1], len / 2, 0.1, ry || 0, y + 0.6, y + 1.8, 'cloth', false, false);
      },
      bookStack(x, z, y, n, ry) {
        let top = 0;
        for (let i = 0; i < n; i++) {
          const t = h01(x, z + i, 7), bh = 0.04 + t * 0.03;
          pb(P, BOOKS[i % BOOKS.length], x, z, y, (ry || 0) + (t - 0.5) * 0.5, 0, top + bh / 2, 0, 0.22 + t * 0.08, bh, 0.16 + t * 0.06);
          top += bh;
        }
      },
      openBook(x, z, ty, ry) {
        pb(P, C.leather, x, z, ty, ry, 0, 0.006, 0, 0.36, 0.012, 0.25);
        for (const sx of [-1, 1]) pb(S, C.paper, x, z, ty, ry, sx * 0.085, 0.02, 0, 0.16, 0.012, 0.23, 0, sx * -0.06);
      },
      globe(x, z, y) {
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * Math.PI * 2;
          T.cyl(0.02, 0.025, 0.72, 5, LX(x + Math.cos(a) * 0.14), LY(y + 0.35), LZ(z + Math.sin(a) * 0.14), C.woodDark, 0, -0.2 * Math.sin(a), 0.2 * Math.cos(a));
        }
        T.tube(0.27, 0.27, 0.03, 16, LX(x), LY(y + 0.92), LZ(z), C.woodDark);
        const g = new THREE.SphereGeometry(0.24, 14, 10);
        S.at(g, C.plasterOld, LX(x), LY(y + 0.94), LZ(z), 0.4, 0, 0.41);
        circle(x, z, 0.3, y, y + 1.2, 'wood', false, false);
      },
      /** A coffin on two trestles, lid on, the flowers on it dried black. */
      coffin(x, z, y, ry) {
        for (const sx of [-0.65, 0.65]) {
          for (const sz of [-1, 1]) pb(T, C.woodMid, x, z, y, ry, sx, 0.31, sz * 0.2, 0.05, 0.64, 0.05, -sz * 0.25, 0);
          pb(T, C.woodMid, x, z, y, ry, sx, 0.6, 0, 0.08, 0.05, 0.5);
        }
        pb(T, C.woodDark, x, z, y, ry, 0, 0.845, 0, 2.0, 0.44, 0.56);
        pb(T, C.woodDark, x, z, y, ry, 0, 1.09, 0, 2.06, 0.05, 0.62);
        pb(S, C.brass, x, z, y, ry, 0.35, 1.117, 0, 0.5, 0.004, 0.04);
        for (let i = 0; i < 7; i++) {
          const t = h01(x, z, i);
          ps(P, C.food, x, z, y, ry, -0.2 + t * 0.35, 1.145, (h01(z, x, i) - 0.5) * 0.3, 0.05, 1, 0.6, 1);
        }
        obb(x, z, 1.03, 0.31, ry || 0, y, y + 1.12, 'wood', true, false);
      },
      /** A doll on a stool: porcelain face, a cone of a dress, and its head turned `look`
       *  (radians) off its body toward whatever it is looking at. */
      doll(x, z, y, ry, look, tone) {
        pc(T, C.woodMid, x, z, y, ry, 0, 0.28, 0, 0.14, 0.14, 0.04, 10);
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * Math.PI * 2;
          pc(T, C.woodMid, x, z, y, ry, Math.cos(a) * 0.09, 0.13, Math.sin(a) * 0.09, 0.015, 0.018, 0.26, 5);
        }
        pk(P, PALETTE[tone || 'velvetPlum'], x, z, y, ry, 0, 0.42, 0, 0.12, 0.26, 10);
        for (const sx of [-1, 1]) pb(P, C.porcelain, x, z, y, ry, sx * 0.05, 0.32, -0.12, 0.04, 0.04, 0.14);
        ps(P, C.porcelain, x, z, y, (ry || 0) + (look || 0), 0, 0.6, 0, 0.068, 1, 1.08, 1);
        ps(P, C.hair, x, z, y, (ry || 0) + (look || 0), 0, 0.625, 0.018, 0.07, 1.02, 0.95, 0.92);
        for (const sx of [-1, 1]) pb(P, C.velvetBlack, x, z, y, (ry || 0) + (look || 0), sx * 0.024, 0.61, -0.064, 0.014, 0.014, 0.006);
        circle(x, z, 0.16, y, y + 0.7, 'cloth', false, false);
      },
      cello(x, z, y, ry) {
        ps(T, C.woodMid, x, z, y, ry, 0, 0.15, 0, 0.3, 1.0, 0.5, 1.5);
        pb(T, C.dark, x, z, y, ry, 0, 0.19, -0.62, 0.06, 0.04, 0.6);
        ps(T, C.dark, x, z, y, ry, 0, 0.19, -0.95, 0.04, 1, 1, 1.4);
      },
      musicStand(x, z, y, ry) {
        for (let i = 0; i < 3; i++) {
          const a = i / 3 * Math.PI * 2;
          S.cyl(0.008, 0.008, 0.36, 4, LX(x + Math.cos(a) * 0.1), LY(y + 0.17), LZ(z + Math.sin(a) * 0.1), C.metal, 0, -0.5 * Math.sin(a), 0.5 * Math.cos(a));
        }
        S.cyl(0.01, 0.01, 0.8, 4, LX(x), LY(y + 0.72), LZ(z), C.metal);
        pb(S, C.metal, x, z, y, ry, 0, 1.2, 0, 0.5, 0.34, 0.01, 0.35);
        pb(S, C.paper, x, z, y, ry, 0, 1.22, -0.012, 0.42, 0.28, 0.004, 0.35);
      },
      coupe(x, z, ty, lying, ry) {
        if (lying) {
          pc(S, C.glass, x, z, ty, ry, 0, 0.045, 0, 0.045, 0.02, 0.03, 10, Math.PI / 2, 0);
          pc(S, C.glass, x, z, ty, ry, 0, 0.045, 0.07, 0.005, 0.005, 0.1, 4, Math.PI / 2, 0);
          return;
        }
        S.cyl(0.035, 0.035, 0.006, 10, LX(x), LY(ty + 0.003), LZ(z), C.glass);
        S.cyl(0.005, 0.005, 0.1, 4, LX(x), LY(ty + 0.056), LZ(z), C.glass);
        S.cyl(0.05, 0.02, 0.03, 10, LX(x), LY(ty + 0.121), LZ(z), C.glass);
      },
      /** A cup of tea for somebody who never came for it: tray, pot, cup, saucer. */
      trayOfTea(x, z, ty, ry) {
        pb(S, C.metal, x, z, ty, ry, 0, 0.01, 0, 0.5, 0.02, 0.34);
        pc(S, C.china, x, z, ty, ry, -0.1, 0.1, 0, 0.08, 0.09, 0.16, 12);
        pc(S, C.china, x, z, ty, ry, 0.13, 0.024, 0.02, 0.07, 0.06, 0.008, 10);
        pc(S, C.china, x, z, ty, ry, 0.13, 0.062, 0.02, 0.04, 0.032, 0.07, 10);
      },
    };

    // What a wall spot has to keep clear of, per prop: [half-width along the wall, top].
    // Only things that stand taller than a window sill (1.0 m) are listed: a chair or a
    // table under a window is how a room is furnished; a bookcase in front of one is not.
    const SPAN = new Map([
      [V.bookcase, (a) => [(a[0] || 2.0) / 2 + 0.03, 2.5]],
      [V.cabinet, (a) => [(a[0] || 1.2) / 2 + 0.03, (a[1] || 2.1) + 0.08]],
      [V.rack, (a) => [(a[0] || 2.0) / 2 + 0.03, 2.1]],
      [V.hearth, () => [1.0, 1.35]],
      [V.portrait, (a) => [((a[0] || 0.9) + 0.12) / 2, 2.4]],
      [V.bed, (a) => [(a[0] || 1.6) / 2 + 0.03, 1.24]],
      [V.longcase, () => [0.3, 2.44]],
      [V.sarcophagus, () => [1.2, 0.94]],
      [V.pew, () => [1.25, 0.95]],
      [V.sofa, () => [1.05, 0.95]],
    ]);

    function propsFor(room, y, doorsHere, keepOut) {
      const x0 = room.wx0 + 0.35, x1 = room.wx1 - 0.35, z0 = room.wz0 + 0.35, z1 = room.wz1 - 0.35;
      const cx = room.cx, cz = room.cz, w = x1 - x0, d = z1 - z0;
      const ok = (x, z, r) => !blocked(x, z, r || 1.4, doorsHere, keepOut);
      const bth = !isAvery;                     // Blackthorn's own story, not Avery's
      // THE WALL FACE. wall() measured every inset from 0.35 m inside the cell line, and the
      // plaster is 0.13 m from that line (0.20 m on an outside wall): every portrait in both
      // houses hung 0.33 m off its wall and every cabinet stood a hand's width out into the
      // room. MEASURED in the r3 shots. An inset is now from the face the thing stands on.
      const faceOf = (side, along) => {
        const c = Math.floor(along / CS);
        const nb = side === 0 ? cellRoom(room.level, c, room.z0 - 1)
          : side === 2 ? cellRoom(room.level, c, room.z1 + 1)
          : side === 1 ? cellRoom(room.level, room.x1 + 1, c) : cellRoom(room.level, room.x0 - 1, c);
        return nb ? WALL_T / 2 : EXT_T / 2;
      };
      // a wall spot: `side` 0..3 = -z, +x, +z, -x ; `f` 0..1 along it; `inset` from its face.
      // `ry` is the heading whose BACK is against that wall (see the vocabulary's frame).
      const wall = (side, f, inset) => {
        const i = inset === undefined ? 0.3 : inset;
        if (side === 0) { const x = x0 + w * f; return { x, z: room.wz0 + faceOf(0, x) + i, ry: Math.PI }; }
        if (side === 1) { const z = z0 + d * f; return { x: room.wx1 - faceOf(1, z) - i, z, ry: Math.PI * 0.5 }; }
        if (side === 2) { const x = x0 + w * f; return { x, z: room.wz1 - faceOf(2, x) - i, ry: 0 }; }
        const z = z0 + d * f; return { x: room.wx0 + faceOf(3, z) + i, z, ry: -Math.PI * 0.5 };
      };
      const onWindow = (side, p, half, top) => {
        const axis = side === 0 || side === 2 ? 'H' : 'V';
        const plane = side === 0 ? room.wz0 : side === 2 ? room.wz1 : side === 1 ? room.wx1 : room.wx0;
        const a = axis === 'H' ? p.x : p.z;
        for (const h of windowHoles) {
          if (h.level !== room.level || h.axis !== axis || Math.abs(h.plane - plane) > 0.01) continue;
          if (y + top <= h.y0) continue;
          if (a + half > h.a0 - 0.06 && a - half < h.a1 + 0.06) return true;
        }
        return false;
      };
      // What has been stood in this room already, as circles: a spot nudged off a door or a
      // window must not land on the thing next to it instead.
      const taken = [];
      const claim = (x, z, r) => { taken.push(x, z, r); };
      const crowded = (x, z, r) => {
        for (let i = 0; i < taken.length; i += 3) {
          if (Math.hypot(taken[i] - x, taken[i + 1] - z) < (taken[i + 2] + r) * 0.92) return true;
        }
        return false;
      };
      const NUDGE = [0, 0.04, -0.04, 0.08, -0.08, 0.12, -0.12, 0.17, -0.17, 0.23, -0.23, 0.3, -0.3];
      /** Put `fn` against a wall: the first spot near `f` clear of doors, stairs, windows
       *  and what is already there. Returns the spot, or null (and nothing is placed). */
      const put = (fn, side, f, inset, r, ...rest) => {
        const sp = SPAN.get(fn);
        const span = sp ? sp(rest) : (fn.span || null);
        const foot = span ? span[0] : Math.min(r * 0.45, 0.6);
        for (let n = 0; n < (strict ? 1 : NUDGE.length); n++) {
          const ff = f + NUDGE[n];
          if (ff < 0.02 || ff > 0.98) continue;
          const p = wall(side, ff, inset);
          // the whole of it between the two walls at the ends of this one
          const along = side === 0 || side === 2 ? p.x : p.z;
          const lo = side === 0 || side === 2 ? room.wx0 : room.wz0, hi = side === 0 || side === 2 ? room.wx1 : room.wz1;
          if (along - foot < lo + 0.15 || along + foot > hi - 0.15) continue;
          if (!ok(p.x, p.z, r)) continue;
          if (span && onWindow(side, p, span[0], span[1])) continue;
          if (crowded(p.x, p.z, foot)) continue;
          fn(p.x, p.z, y, p.ry, ...rest);
          claim(p.x, p.z, foot);
          p.side = side; p.f = ff;
          return p;
        }
        return null;
      };
      // every wall at `f` first (a bed belongs in the middle of a wall), then with nudges
      let strict = false;
      const putAny = (fn, sides, f, inset, r, ...rest) => {
        strict = true;
        for (const s of sides) { const p = put(fn, s, f, inset, r, ...rest); if (p) { strict = false; return p; } }
        strict = false;
        for (const s of sides) { const p = put(fn, s, f, inset, r, ...rest); if (p) return p; }
        return null;
      };
      // spots in the middle of the room: claimed too, so the wall pass keeps off them
      const mid = (x, z, r) => { claim(x, z, r); return true; };
      const ceil = (room.tall ? TALL_CEIL : LV[room.level].ceil);
      const ty = (h) => y + (h || 0.76);        // a table top
      switch (room.furn) {
        case 'study': return () => {
          if (ok(cx, cz, 1.6)) {
            mid(cx, cz, 1.2);
            V.table(cx, cz, y, 0, 1.6, 0.9);
            V.chair(cx, cz + 0.85, y, 0);
            V.chair(cx - 0.5, cz - 0.9, y, Math.PI + 0.2);
            V.candlestick(cx + 0.6, cz - 0.22, ty());
            for (let i = 0; i < 3; i++) S.box(0.22, 0.004, 0.3, LX(cx - 0.3 + i * 0.16), LY(ty() + 0.003 + i * 0.004), LZ(cz + 0.05 * i), C.paper, 0.2 - i * 0.25);
            V.rug(cx, cz, y, 3.0, 2.2);
          }
          put(V.bookcase, 0, 0.25, 0.22, 1.4, 2.0); put(V.bookcase, 0, 0.75, 0.22, 1.4, 2.0);
          put(V.hearth, 3, 0.5, 0.27, 1.4);
          put(V.cabinet, 1, 0.3, 0.25, 1.2, 1.0, 1.4, 0.45);
        };
        case 'library': return () => {
          if (ok(cx, cz, 1.8)) {
            mid(cx, cz, 1.5);
            V.table(cx, cz, y, 0, 2.4, 1.0);
            V.chair(cx - 0.6, cz + 0.9, y, 0); V.chair(cx + 0.6, cz - 0.9, y, Math.PI);
            V.rug(cx, cz, y, 4.0, 2.6);
            if (bth) { V.openBook(cx - 0.55, cz + 0.2, ty(), 0.1); V.bookStack(cx + 0.7, cz - 0.1, ty(), 4, 0.3); V.candlestick(cx + 0.1, cz - 0.3, ty()); }
          }
          const b0 = put(V.bookcase, 0, 0.15, 0.22, 1.3, 2.4);
          put(V.bookcase, 0, 0.85, 0.22, 1.3, 2.4);
          put(V.bookcase, 2, 0.35, 0.22, 1.3, 2.4); put(V.bookcase, 2, 0.65, 0.22, 1.3, 2.4);
          const arm = put(V.armchair, 3, 0.5, 0.47, 1.4);
          if (bth) {
            put(V.longcase, 1, 0.18, 0.2, 0.6);
            if (arm) {
              // the reading table beside the armchair, and the book left open on it
              const q = fr(arm.x, arm.z, arm.ry, -0.78, 0.1);
              if (ok(q[0], q[1], 0.35) && !crowded(q[0], q[1], 0.3)) { V.table(q[0], q[1], y, arm.ry, 0.5, 0.5, 'woodDark', 0.6); V.openBook(q[0], q[1], ty(0.6), arm.ry + 0.4); claim(q[0], q[1], 0.35); }
            }
            // the library ladder, leaning on the first bookcase with its feet on the boards
            if (b0) {
              const lean = 0.342, top = 2.43, L = 2.6, ax = b0.x + 0.55, face = b0.z + 0.22;
              const zc = face + 0.03 + Math.sin(lean) * L / 2;
              for (const sx of [-0.22, 0.22]) T.box(0.04, L, 0.05, LX(ax + sx), LY(y + top / 2), LZ(zc), C.woodMid, 0, -lean, 0);
              for (let r = 0; r < 8; r++) {
                const t = -1.05 + r * 0.3;
                T.box(0.44, 0.03, 0.03, LX(ax), LY(y + top / 2 + t * Math.cos(lean)), LZ(zc - t * Math.sin(lean)), C.woodMid);
              }
              claim(ax, zc, 0.55);
            }
            for (const [bx, bz, n] of [[x0 + 3.9, z0 + 0.95, 5], [x1 - 3.2, z0 + 1.0, 3], [cx + 1.9, cz + 1.4, 6], [x0 + 4.4, z1 - 1.0, 4]]) {
              if (ok(bx, bz, 0.3) && !crowded(bx, bz, 0.25)) { V.bookStack(bx, bz, y, n, h01(bx, bz, 1) * 3); claim(bx, bz, 0.2); }
            }
            const gx = x1 - 1.2, gz = z1 - 1.3;
            if (ok(gx, gz, 0.4) && !crowded(gx, gz, 0.35)) { V.globe(gx, gz, y); claim(gx, gz, 0.35); }
          }
        };
        case 'foyer': return () => {
          // KEPT CLEAR: the front door, the stair and the arch to the corridor are the
          // route. Two consoles against the side walls, urns, the chandelier.
          const c3 = put(V.table, 3, 0.85, 0.27, 1.4, 1.2, 0.5);
          const c1 = put(V.table, 1, 0.85, 0.27, 1.4, 1.2, 0.5);
          for (const side of [1, 3]) {
            const p = wall(side, 0.25, 0.36);
            if (ok(p.x, p.z, 1.2)) { S.cyl(0.32, 0.22, 0.9, 8, LX(p.x), LY(y + 0.45), LZ(p.z), C.stone); circle(p.x, p.z, 0.34, y, y + 0.9, 'stone', true, false); claim(p.x, p.z, 0.34); }
          }
          V.rug(cx, room.wz1 - 3.0, y, 3.4, 4.0);
          V.chandelier(cx, cz - 1.5, ceil);
          put(V.portrait, 3, 0.6, 0.035, 0.5, 1.2, 1.6, false, 1.9);    // hung clear of the dado rail
          put(V.portrait, 1, 0.6, 0.035, 0.5, 1.2, 1.6, false, 1.9);
          if (bth) {
            put(V.longcase, 3, 0.12, 0.2, 0.6);
            // the masks and folded capes of people who meant to leave at first light
            for (const c of [c3, c1]) {
              if (!c) continue;
              V.mask(c.x, c.z, ty(), c.ry + 0.4, c === c1);
              const q = fr(c.x, c.z, c.ry, 0.32, 0.02);
              pb(P, C.velvetBlack, q[0], q[1], ty(), c.ry + 0.1, 0, 0.035, 0, 0.42, 0.07, 0.32);
            }
            const lx = room.wx1 - 3.4, lz = room.wz1 - EXT_T / 2 - 0.32;
            if (ok(lx, lz, 0.4) && !crowded(lx, lz, 0.6)) { V.luggage(lx, lz, y, 0); claim(lx, lz, 0.7); }
            V.mask(cx + 1.4, room.wz1 - 1.7, y, 2.2);
          }
        };
        case 'dining': return () => {
          const blackthornBreakfast = bth && room.id === 'dining';
          if (ok(cx, cz, 2.6)) {
            mid(cx, cz, 2.6);
            V.table(cx, cz, y, 0, 5.0, 1.3);
            if (!blackthornBreakfast) {
              // every chair faces the table: the -z row's back is at -z (heading PI)
              for (let i = 0; i < 4; i++) { V.chair(cx - 1.8 + i * 1.2, cz - 1.0, y, Math.PI); V.chair(cx - 1.8 + i * 1.2, cz + 1.0, y, 0); }
            } else {
              breakfast(cx, cz);
            }
          }
          put(V.cabinet, 0, 0.5, 0.3, 1.6, 2.4, 1.0, 0.55);
          const hh = put(V.hearth, 2, 0.5, 0.27, 1.6);
          if (hh && blackthornBreakfast) {
            V.bracketClock(hh.x, hh.z - 0.06, y + 1.35, hh.ry);
            V.portrait(hh.x, hh.z + 0.25 - 0.035, y, hh.ry, 0.9, 1.1, false, 2.5);
          }
          V.chandelier(cx, cz, ceil);
          put(V.portrait, 2, 0.2, 0.035, 0.5);
          put(V.portrait, 2, 0.8, 0.035, 0.5);
        };
        case 'kitchen': return () => {
          const range = put(V.cabinet, 0, 0.3, 0.35, 1.3, 2.0, 0.9, 0.7, 'metal');
          // the tall dresser; at the Avery House it is the FRIDGE, enamel, with the note on it
          // (world-stories.js COUNTY_WRITING 'fridge', hung 0.78 m off the wall face)
          put(V.cabinet, 0, 0.7, 0.38, 0.9, 1.8, 2.2, 0.76, isAvery ? 'enamel' : 'woodMid');
          if (ok(cx, cz, 1.6)) {
            mid(cx, cz, 1.4);
            V.table(cx, cz, y, 0, 2.6, 1.1, 'woodMid', 0.85);
            if (bth) {
              // breakfast, half made: trays of cups for the dining room, loaves gone black
              for (let i = 0; i < 3; i++) {
                const tx = cx - 0.8 + i * 0.8;
                pb(S, C.metal, tx, cz - 0.2, ty(0.85), 0, 0, 0.01, 0, 0.5, 0.02, 0.36);
                for (let j = 0; j < 6; j++) {
                  const ux = tx - 0.16 + (j % 3) * 0.16, uz = cz - 0.28 + Math.floor(j / 3) * 0.16;
                  S.cyl(0.066, 0.056, 0.008, 10, LX(ux), LY(ty(0.87) + 0.004), LZ(uz), C.china);
                  S.cyl(0.04, 0.032, 0.07, 10, LX(ux), LY(ty(0.87) + 0.043), LZ(uz), C.china);
                }
              }
              for (let i = 0; i < 2; i++) ps(P, C.food, cx + 0.5 + i * 0.35, cz + 0.3, ty(0.85), 0.3 * i, 0, 0.072, 0, 0.13, 1.2, 0.55, 0.8);
            }
          }
          if (range && bth) pc(S, C.metal, range.x, range.z, y, range.ry, 0.4, 0.98 + 0.1, 0, 0.16, 0.15, 0.2, 12);
          put(V.cabinet, 2, 0.5, 0.33, 1.3, 1.6, 0.85, 0.65, 'stone');
          for (let i = 0; i < 3; i++) { const p = wall(1, 0.2 + i * 0.25, 0.37); if (ok(p.x, p.z, 0.8) && !crowded(p.x, p.z, 0.36)) { V.barrel(p.x, p.z, y); claim(p.x, p.z, 0.36); } }
          // pans on the west wall, hung ON it (they were 0.27 m out in the air)
          const px = room.wx0 + faceOf(3, z0 + 1.5) + 0.03;
          for (let i = 0; i < 4; i++) S.cyl(0.14, 0.14, 0.04, 8, LX(px), LY(y + 1.6), LZ(z0 + 1.0 + i * 0.5), C.metal, 0, 0, Math.PI * 0.5);
        };
        case 'corridor': return () => {
          // the ends only: the middle is the way through the house
          put(V.table, 3, 0.5, 0.25, 1.0, 1.1, 0.45);
          put(V.table, 1, 0.5, 0.25, 1.0, 1.1, 0.45);
          if (bth && room.id === 'corrG') {
            // two long-case clocks on the north wall, and the coat rail on the south wall
            // between the library door and the foyer arch
            V.longcase(16, room.wz0 + faceOf(0, 16) + 0.2, y, Math.PI); claim(16, room.wz0 + 0.33, 0.35);
            V.longcase(47, room.wz0 + faceOf(0, 47) + 0.2, y, Math.PI); claim(47, room.wz0 + 0.33, 0.35);
            const rz = room.wz1 - faceOf(2, 24.4) - 0.03;
            V.coatRail(24.4, rz, y, 0, 2.4); claim(24.4, rz - 0.1, 1.2);
          }
          for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) put(V.portrait, 0, f, 0.035, 0.4, 0.8, 1.0);
          V.rug(cx, cz, y, w * 0.9, 1.4, 'velvet');
        };
        case 'passage': return () => {
          put(V.chair, 3, 0.5, 0.45, 1.0);
          put(V.crate, 1, 0.5, 0.42, 1.0, 0.7);
          for (const f of [0.2, 0.5, 0.8]) put(V.candle, 0, f, 0.1, 0.3);
          if (bth && room.id === 'corr2w') {
            // Lady Constance's tea, never delivered: a trolley left in the north passage
            const tx = 12, tz = room.wz0 + faceOf(0, 12) + 0.35;
            if (ok(tx, tz, 0.5) && !crowded(tx, tz, 0.5)) {
              V.table(tx, tz, y, 0, 0.8, 0.45, 'woodDark', 0.78);
              pb(T, C.woodDark, tx, tz, y, 0, 0, 0.28, 0, 0.72, 0.03, 0.4);
              V.trayOfTea(tx, tz, ty(0.78), 0.2);
              claim(tx, tz, 0.5);
            }
          }
        };
        case 'ballroom': return () => {
          const quartet = bth && room.id === 'ballroom';
          for (let i = 0; i < 6; i++) put(V.chair, 0, 0.1 + i * 0.16, 0.5, 1.0);
          for (let i = 0; i < (quartet ? 3 : 6); i++) put(V.chair, 2, 0.1 + i * 0.16, 0.5, 1.0);
          // the long table on the west wall, its LENGTH along the wall (it was stood across
          // it, 1.5 m of it inside the masonry)
          const tb = put(V.table, 3, 0.5, 0.52, 1.4, 3.0, 1.0);
          V.chandelier(cx - 3, cz, ceil); V.chandelier(cx + 3, cz, ceil);
          put(V.hearth, 1, 0.5, 0.27, 1.6);
          if (!quartet) return;
          // the three couples are world/manor-scares.js's (SCARES.masque); their floor is theirs
          for (const [px, pz] of SCARES.masque.pairs) claim(px, pz, 0.8);
          // THE CHAMPAGNE TOWER, toppled: four still standing, the rest on their sides
          if (tb) {
            for (const [a, b] of [[-0.06, -0.06], [0.06, -0.06], [-0.06, 0.06], [0.06, 0.06]]) {
              const q = fr(tb.x, tb.z, tb.ry, a + 0.3, b); V.coupe(q[0], q[1], ty(), false);
            }
            for (let i = 0; i < 5; i++) {
              const q = fr(tb.x, tb.z, tb.ry, -0.4 - i * 0.22, (h01(i, tb.x, 2) - 0.5) * 0.4);
              V.coupe(q[0], q[1], ty(), true, h01(tb.z, i, 4) * 6);
            }
          }
          // the quartet's corner: four chairs turned to the floor, their stands, the cello
          const Q = [[13.9, 24.75], [15.3, 24.95], [16.6, 24.3], [17.0, 23.0]];
          for (let i = 0; i < Q.length; i++) {
            const [qx, qz] = Q[i];
            const ry = Math.atan2(qx - 9, qz - 21);
            if (i === 1) V.fallenChair(qx, qz, y, ry); else V.chair(qx, qz, y, ry);
            const s = fr(qx, qz, ry, 0, -0.62);
            if (i !== 1) V.musicStand(s[0], s[1], y, ry);
            claim(qx, qz, 0.45);
          }
          V.cello(14.9, 23.85, y, 1.9);
          // the masks, where they were dropped
          for (const [mx, mz, r, g] of [[6.2, 19.8, 0.4, 0], [8.1, 22.9, 2.1, 1], [10.3, 18.4, 4.0, 0], [2.9, 21.2, 1.2, 0],
            [7.4, 24.1, 5.1, 0], [11.6, 23.6, 0.2, 1], [9.2, 20.1, 3.3, 0], [5.6, 17.4, 2.7, 0], [12.2, 19.0, 1.7, 0], [3.2, 24.6, 4.4, 1]]) {
            V.mask(mx, mz, y, r, !!g);
          }
        };
        case 'billiard': return () => {
          if (ok(cx, cz, 2.2)) {
            mid(cx, cz, 1.9);
            V.table(cx, cz, y, 0, 3.2, 1.7, 'wallGreen', 0.85);
            if (bth) {
              const BALL = [C.paper, C.velvet, C.velvetBlack, C.brass, C.paper, C.velvet, C.blanketBlue];
              for (let i = 0; i < BALL.length; i++) {
                const bx = cx - 1.1 + h01(i, cx, 1) * 2.2, bz = cz - 0.6 + h01(cz, i, 2) * 1.2;
                S.at(new THREE.SphereGeometry(0.028, 8, 6), BALL[i], LX(bx), LY(ty(0.85) + 0.028), LZ(bz));
              }
              S.cyl(0.006, 0.012, 1.45, 5, LX(cx + 1.4), LY(y + 0.012), LZ(cz + 1.35), C.woodMid, 0.35, 0, Math.PI / 2);
            }
          }
          put(V.cabinet, 0, 0.5, 0.12, 1.0, 1.2, 2.0, 0.2);
          put(V.armchair, 1, 0.2, 0.47, 1.2); put(V.armchair, 1, 0.8, 0.47, 1.2);
          V.chandelier(cx, cz, ceil);
        };
        case 'smoking': return () => {
          if (ok(cx, cz, 1.2)) {
            mid(cx, cz, 0.8);
            V.table(cx, cz, y, 0, 1.0, 1.0, 'woodDark', 0.55);
            if (bth) {
              pc(S, C.glass, cx - 0.2, cz, y, 0, 0, 0.55 + 0.11, 0, 0.07, 0.08, 0.22, 10);
              pc(S, C.glass, cx - 0.2, cz, y, 0, 0, 0.55 + 0.25, 0, 0.025, 0.02, 0.06, 8);
              for (let i = 0; i < 3; i++) pc(S, C.glass, cx + 0.12 + i * 0.12, cz + 0.15 - i * 0.14, y, 0, 0, 0.55 + 0.045, 0, 0.035, 0.03, 0.09, 8);
              V.rug(cx, cz, y, 3.2, 3.2);
            }
          }
          put(V.armchair, 0, 0.3, 0.47, 1.2); put(V.armchair, 0, 0.7, 0.47, 1.2);
          put(V.armchair, 2, 0.3, 0.47, 1.2);
          put(V.cabinet, 1, 0.5, 0.25, 1.2, 1.4, 1.2, 0.5);
          put(V.hearth, 3, 0.5, 0.27, 1.4);
          if (!bth) V.rug(cx, cz, y, 3.2, 3.2);
        };
        case 'drawing': return () => {
          if (ok(cx, cz + 1.2, 1.6)) { V.sofa(cx, cz + 1.2, y, 0); mid(cx, cz + 1.2, 1.0); }
          if (ok(cx, cz, 1.0)) { V.table(cx, cz - 0.4, y, 0, 1.2, 0.7, 'woodDark', 0.5); mid(cx, cz - 0.4, 0.7); }
          put(V.hearth, 0, 0.5, 0.27, 1.6);
          put(V.armchair, 3, 0.5, 0.57, 1.2); put(V.armchair, 1, 0.5, 0.57, 1.2);
          put(V.cabinet, 2, 0.15, 0.25, 1.2, 1.2, 1.0, 0.5);
          V.rug(cx, cz, y, 4.0, 3.0);
          put(V.portrait, 0, 0.2, 0.035, 0.5); put(V.portrait, 0, 0.8, 0.035, 0.5);
          if (bth && room.id === 'drawing') {
            // a hand of cards for four, dealt and never played
            const kx = x1 - 2.4, kz = z0 + 3.0;
            if (ok(kx, kz, 1.1) && !crowded(kx, kz, 0.95)) {
              V.table(kx, kz, y, 0, 0.9, 0.9, 'woodDark', 0.72);
              V.chair(kx, kz - 0.72, y, Math.PI); V.chair(kx + 0.72, kz, y, Math.PI / 2);
              V.chair(kx, kz + 0.8, y, 0.25); V.chair(kx - 0.72, kz, y, -Math.PI / 2);
              for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2, q = fr(kx, kz, a, 0, -0.26);
                for (let j = 0; j < 5; j++) S.box(0.06, 0.002, 0.09, LX(q[0]), LY(ty(0.72) + 0.001 + j * 0.0015), LZ(q[1]), C.paper, a + j * 0.05);
              }
              claim(kx, kz, 1.0);
            }
          }
        };
        case 'conserv': return () => {
          // planters with what is left of the plants
          for (const [side, f] of [[0, 0.2], [0, 0.5], [0, 0.8], [2, 0.2], [2, 0.8], [1, 0.5]]) {
            const p = wall(side, f, 0.52);
            if (!ok(p.x, p.z, 1.2) || crowded(p.x, p.z, 0.5)) continue;
            S.box(0.9, 0.7, 0.9, LX(p.x), LY(y + 0.35), LZ(p.z), C.stone);
            S.cone(0.35, 1.4, 6, LX(p.x), LY(y + 1.4), LZ(p.z), C.dark);
            S.cyl(0.03, 0.05, 1.8, 5, LX(p.x + 0.2), LY(y + 1.5), LZ(p.z - 0.1), C.woodDark, 0, 0.2, 0.3);
            obb(p.x, p.z, 0.45, 0.45, 0, y, y + 1.6, 'stone', false, false);    // the box, and what is left of the plant in it
            claim(p.x, p.z, 0.5);
          }
          if (ok(cx, cz, 1.4)) { V.table(cx, cz, y, 0, 1.6, 0.8, 'metal', 0.72); V.chair(cx, cz + 0.8, y, 0, 'metal'); mid(cx, cz, 1.0); }
        };
        case 'chapel': return () => {
          // pews in two ranks facing the altar at the north end; the crypt stair is at the
          // west edge (x 2-4) and stays clear
          for (let r = 0; r < 3; r++) for (const px of [7.4, 10.1]) {
            const pz = z0 + 4.0 + r * 1.5;
            if (ok(px, pz, 0.9)) V.pew(px, pz, y, 0);
          }
          const ax = cx + 1.0, az = z0 + 1.2;
          if (ok(ax, az, 1.0)) { S.box(2.0, 1.05, 0.9, LX(ax), LY(y + 0.525), LZ(az), C.stone); aabb(ax - 1.0, y, az - 0.45, ax + 1.0, y + 1.05, az + 0.45, 'stone', true); }
          V.candlestick(ax - 0.6, az, y + 1.05); V.candlestick(ax + 0.6, az, y + 1.05);
          S.box(0.12, 1.6, 0.12, LX(ax), LY(y + 1.85), LZ(az - 0.3), C.woodDark);
          S.box(0.7, 0.12, 0.12, LX(ax), LY(y + 2.3), LZ(az - 0.3), C.woodDark);
          // before the altar: a coffin on its trestles, the flowers on it gone black
          if (bth) V.coffin(ax, az + 1.9, y, 0);
        };
        case 'music': return () => {
          if (ok(cx + 1.0, cz - 0.5, 2.0)) { V.piano(cx + 1.0, cz - 0.5, y, 0.4); mid(cx + 1.0, cz - 0.5, 1.3); }
          for (let i = 0; i < 4; i++) put(V.chair, 0, 0.2 + i * 0.2, 0.5, 1.0);
          put(V.cabinet, 1, 0.5, 0.25, 1.2, 1.4, 1.1, 0.5);
          // a harp
          const p = wall(3, 0.4, 0.5);
          if (ok(p.x, p.z, 1.0) && !crowded(p.x, p.z, 0.45)) { S.box(0.12, 1.7, 0.9, LX(p.x), LY(y + 0.85), LZ(p.z), C.brass, 0, 0, 0.3); circle(p.x, p.z, 0.45, y, y + 1.7, 'wood', false, false); claim(p.x, p.z, 0.45); }
          V.rug(cx, cz, y, 3.6, 2.6);
          if (bth) for (let i = 0; i < 5; i++) S.box(0.21, 0.003, 0.29, LX(cx - 1.2 + h01(i, cx, 6) * 1.2), LY(y + 0.024), LZ(cz + 0.9 + h01(cz, i, 8) * 0.8), C.paper, h01(i, i, 9) * 3);
        };
        case 'portrait': return () => {
          // EVERY PORTRAIT TURNED TO THE WALL, and one left facing out (world/manor-scares.js
          // owns that one, SCARES.sunrise; this keeps its wall spot free).
          const turned = bth && room.id === 'portrait';
          if (turned) claim(SCARES.sunrise.x, room.wz0 + 0.3, 0.7);
          for (const f of [0.15, 0.38, 0.62, 0.85]) { put(V.portrait, 0, f, 0.035, 0.4, 1.0, 1.4, turned); put(V.portrait, 2, f, 0.035, 0.4, 1.0, 1.4, turned); }
          put(V.chair, 3, 0.5, 0.5, 1.0); put(V.chair, 1, 0.5, 0.5, 1.0);
          if (turned) { put(V.portrait, 3, 0.5, 0.035, 0.4, 0.8, 1.0, true, 1.95); put(V.portrait, 1, 0.5, 0.035, 0.4, 0.8, 1.0, true, 1.95); }
          V.rug(cx, cz, y, w * 0.8, 1.6);
          if (turned && ok(cx, cz, 1.2)) {
            // a padded bench to sit and look at them from
            pb(P, C.velvet, cx, cz, y, 0, 0, 0.42, 0, 2.2, 0.08, 0.5);
            for (const sx of [-1, 1]) for (const sz of [-1, 1]) pb(T, C.woodDark, cx, cz, y, 0, sx * 1.0, 0.19, sz * 0.2, 0.06, 0.38, 0.06);
            obb(cx, cz, 1.1, 0.25, 0, y, y + 0.46, 'wood', true, false);
          }
        };
        case 'servants': return () => {
          if (ok(cx, cz, 2.2)) { mid(cx, cz, 2.0); V.table(cx, cz, y, 0, 4.0, 1.0, 'woodMid'); for (const sz of [-1, 1]) { T.box(3.6, 0.05, 0.3, LX(cx), LY(y + 0.45), LZ(cz + sz * 0.8), C.woodMid); for (const sx of [-1.6, 1.6]) T.box(0.06, 0.43, 0.26, LX(cx + sx), LY(y + 0.215), LZ(cz + sz * 0.8), C.woodMid); aabb(cx - 1.8, y, cz + sz * 0.8 - 0.15, cx + 1.8, y + 0.45, cz + sz * 0.8 + 0.15, 'wood', true); } }
          put(V.cabinet, 0, 0.5, 0.25, 1.3, 1.6, 2.0, 0.5, 'woodMid');
          put(V.hearth, 2, 0.5, 0.27, 1.4);
          for (let i = 0; i < 4; i++) put(V.candle, 3, 0.2 + i * 0.2, 0.1, 0.3);
          if (bth && room.id === 'servants') {
            put(V.longcase, 1, 0.66, 0.2, 0.6);
            // the bell board: a row of brass bells on their springs, one for every room
            const bx = cx, bz = room.wz0 + faceOf(0, cx);
            if (!onWindow(0, { x: bx, z: bz }, 0.9, 2.6)) {
              T.box(1.7, 0.36, 0.03, LX(bx), LY(y + 2.3), LZ(bz + 0.015), C.woodDark);
              for (let i = 0; i < 8; i++) {
                const q = bx - 0.72 + i * 0.205;
                S.box(0.012, 0.12, 0.05, LX(q), LY(y + 2.25), LZ(bz + 0.055), C.brass);
                S.cone(0.04, 0.06, 8, LX(q), LY(y + 2.17), LZ(bz + 0.08), C.brass);
              }
            }
          }
        };
        case 'scullery': return () => {
          put(V.cabinet, 2, 0.5, 0.33, 1.2, 1.6, 0.85, 0.65, 'stone');
          put(V.rack, 0, 0.5, 0.23, 1.0, 1.4);
          const p = wall(1, 0.85, 0.37); if (ok(p.x, p.z, 0.7) && !crowded(p.x, p.z, 0.36)) { V.barrel(p.x, p.z, y); claim(p.x, p.z, 0.36); }
        };
        case 'larder': return () => {
          put(V.rack, 3, 0.3, 0.23, 1.0, 2.0); put(V.rack, 3, 0.7, 0.23, 1.0, 2.0);
          put(V.rack, 1, 0.5, 0.23, 1.0, 2.0);
          for (const f of [0.25, 0.5, 0.75]) { const p = wall(2, f, 0.37); if (ok(p.x, p.z, 0.7) && !crowded(p.x, p.z, 0.36)) { V.barrel(p.x, p.z, y); claim(p.x, p.z, 0.36); } }
          if (ok(cx, cz, 1.0) && !crowded(cx, cz, 0.5)) V.crate(cx, cz, y, 0.3, 0.7);
        };
        case 'boudoir': return () => {
          put(V.sofa, 0, 0.5, 0.47, 1.4);
          put(V.armchair, 1, 0.5, 0.47, 1.2);
          put(V.cabinet, 2, 0.3, 0.25, 1.2, 1.0, 1.6, 0.45);
          if (ok(cx, cz, 1.0)) { V.table(cx, cz, y, 0, 0.9, 0.9, 'woodDark', 0.55); mid(cx, cz, 0.7); }
          V.rug(cx, cz, y, 3.0, 2.4);
          put(V.portrait, 3, 0.5, 0.035, 0.5);
        };
        case 'bedroom': case 'master': return () => {
          const big = room.furn === 'master';
          const bw = big ? 2.0 : 1.5, bl = big ? 2.3 : 2.1;
          const blanket = BLANKETS[Math.floor(h01(room.cx, room.cz, 1) * BLANKETS.length)];
          // THE BED. It was always tried on the door wall only, and in four of Blackthorn's
          // bedrooms that wall has the door: measured, Lady Constance, the master, Victor and
          // the Blue Room had no bed at all. Any wall now, the door wall last.
          let bed = null;
          if (bth && room.id === 'constance') {
            const B = SCARES.constance.bed;
            // her cover is world/manor-scares.js's: it has somebody under it, and later not
            V.bed(B.x, B.z, y, B.ry, B.w, B.l, { blanket: 'blanketBlue', made: false });
            bed = { x: B.x, z: B.z, ry: B.ry, side: 1 }; claim(B.x, B.z, 1.05);
          } else {
            bed = putAny(V.bed, [1, 3, 2, 0], 0.5, bl / 2 + 0.02, 1.6, bw, bl, { blanket });
          }
          // a nightstand beside the head of it
          if (bed) {
            for (const sx of [1, -1]) {
              const q = fr(bed.x, bed.z, bed.ry, sx * (bw / 2 + 0.34), bl / 2 - 0.26);
              if (!ok(q[0], q[1], 0.35) || crowded(q[0], q[1], 0.28)) continue;
              V.table(q[0], q[1], y, bed.ry, 0.45, 0.42, 'woodDark', 0.6);
              claim(q[0], q[1], 0.3);
              if (bth && room.id === 'constance') {
                // a glass of water and three bottles of what she was given to sleep
                pc(S, C.glass, q[0], q[1], ty(0.6), bed.ry, 0.1, 0.055, 0, 0.032, 0.028, 0.11, 8);
                for (let i = 0; i < 3; i++) pc(S, C.rust, q[0], q[1], ty(0.6), bed.ry, -0.12 + i * 0.07, 0.045, -0.06 + (i % 2) * 0.08, 0.022, 0.022, 0.09, 6);
              } else if (bth && room.id === 'master') {
                // a pocket watch, stopped, face up
                pc(S, C.brass, q[0], q[1], ty(0.6), bed.ry, 0.05, 0.006, 0, 0.026, 0.026, 0.012, 12);
                pc(S, C.china, q[0], q[1], ty(0.6), bed.ry, 0.05, 0.0125, 0, 0.021, 0.021, 0.002, 12);
                pb(S, C.brass, q[0], q[1], ty(0.6), bed.ry, -0.05, 0.002, 0.03, 0.14, 0.003, 0.006, 0, 0);
              } else V.candlestick(q[0], q[1], ty(0.6));
              break;
            }
            if (bth && room.id === 'master') {
              // Lucian's evening clothes laid out on the bed he did not sleep in
              const q = fr(bed.x, bed.z, bed.ry, 0, -0.15);
              pb(P, C.velvetBlack, q[0], q[1], y, bed.ry, 0, 0.585, 0, 0.62, 0.02, 0.9);
              for (const sx of [-1, 1]) pb(P, C.velvetBlack, q[0], q[1], y, bed.ry + sx * 0.5, sx * 0.36, 0.585, 0.12, 0.14, 0.018, 0.62);
              pb(P, C.linen, q[0], q[1], y, bed.ry, 0, 0.597, 0.22, 0.22, 0.006, 0.38);
            }
          }
          put(V.cabinet, 3, 0.8, 0.3, 1.2, 1.4, 2.1, 0.55);
          if (!(bth && room.id === 'constance')) put(V.chair, 1, 0.3, 0.5, 1.0);
          if (big) { put(V.hearth, 2, 0.3, 0.27, 1.5); put(V.armchair, 1, 0.7, 0.47, 1.2); }
          if (bth && room.id === 'master') put(V.longcase, 1, 0.84, 0.2, 0.6);
          if (bth && room.id === 'constance') {
            // her vanity, the mirror on it covered with a black cloth
            const vanity = (vx, vz, vy, vry) => V.table(vx, vz, vy, vry, 1.0, 0.45, 'woodDark', 0.74);
            vanity.span = [0.56, 1.95];
            const v = put(vanity, 2, 0.35, 0.24, 0.8);
            if (v) {
              pb(S, C.brass, v.x, v.z, y, v.ry, 0, 1.45, 0.17, 0.72, 0.92, 0.04);
              pb(P, C.velvetBlack, v.x, v.z, y, v.ry, 0, 1.46, 0.135, 0.78, 0.98, 0.02);
              pb(P, C.velvetBlack, v.x, v.z, y, v.ry, 0, 0.97, 0.12, 0.8, 0.02, 0.1);
              const st = fr(v.x, v.z, v.ry, 0, -0.62);
              pc(T, C.woodDark, st[0], st[1], y, 0, 0, 0.22, 0, 0.18, 0.16, 0.44, 10);
              circle(st[0], st[1], 0.18, y, y + 0.46, 'wood', true, false);
            }
          }
          V.rug(bed ? (bed.x + cx) / 2 : cx, bed ? (bed.z + cz) / 2 : cz + 0.6, y, 2.8, 2.0);
          if (bed) {
            const pp = wall(bed.side, bed.side === 0 || bed.side === 2 ? (bed.x - x0) / w : (bed.z - z0) / d, 0.035);
            V.portrait(pp.x, pp.z, y, pp.ry, 0.9, 1.0, false, 1.95);
          }
        };
        case 'dressing': return () => {
          put(V.cabinet, 0, 0.25, 0.3, 1.2, 1.6, 2.2, 0.6); put(V.cabinet, 0, 0.75, 0.3, 1.2, 1.6, 2.2, 0.6);
          put(V.table, 2, 0.5, 0.29, 1.2, 1.2, 0.6);
          put(V.chair, 2, 0.5, 0.9, 0.9);
          // the mirror: a tall dark glass in a frame, ON the east wall, off its windows
          const mirror = (mx, mz, my, mry) => {
            // a pier glass hung over the dado rail (its foot at 0.95), not through it
            pb(S, C.brass, mx, mz, my, mry, 0, 1.7, 0.0, 0.9, 1.5, 0.06);
            const q = fr(mx, mz, mry, 0, -0.032); S.quad(0.76, 1.36, LX(q[0]), LY(my + 1.7), LZ(q[1]), C.glass, mry + Math.PI, 0);
          };
          mirror.span = [0.48, 2.45];
          const p = put(mirror, 1, 0.3, 0.03, 0.6);
          if (bth && room.id === 'dressing') {
            // the rail of masque costumes, and the shelf of masks over it
            const rx = room.wx0 + faceOf(3, z1 - 1.3) + 0.3, rzc = z1 - 1.3;
            if (ok(rx, rzc, 0.8) && !crowded(rx, rzc, 0.7)) {
              for (const sz of [-0.95, 0.95]) T.box(0.04, 1.8, 0.04, LX(rx), LY(y + 0.9), LZ(rzc + sz), C.woodDark);
              T.box(0.03, 0.03, 1.94, LX(rx), LY(y + 1.8), LZ(rzc), C.woodDark);
              for (const sz of [-0.95, 0.95]) T.box(0.5, 0.03, 0.04, LX(rx), LY(y + 0.015), LZ(rzc + sz), C.woodDark);
              const tones = [C.velvetPlum, C.velvetBlack, C.velvetGreen, C.blanket, C.velvetBlack];
              for (let i = 0; i < 5; i++) {
                const z = rzc - 0.72 + i * 0.36;
                P.box(0.4, 1.12, 0.08, LX(rx), LY(y + 1.2), LZ(z), tones[i], (i - 2) * 0.08);
                P.box(0.52, 0.5, 0.07, LX(rx), LY(y + 0.46 + (i % 2) * 0.05), LZ(z), tones[i], (i - 2) * 0.08);
              }
              obb(rx, rzc, 0.3, 1.0, 0, y, y + 1.85, 'cloth', false, false);
              claim(rx, rzc, 1.0);
            }
            if (p) for (let i = 0; i < 3; i++) V.mask(fr(p.x, p.z, p.ry, 0.2 - i * 0.2, -0.3)[0], fr(p.x, p.z, p.ry, 0.2 - i * 0.2, -0.3)[1], y, i * 1.3, i === 1);
          }
        };
        case 'nursery': return () => {
          const story = bth && room.id === 'nursery';
          // the rocking horse is world/manor-scares.js's (SCARES.horse); keep its floor clear
          if (story) claim(SCARES.horse.x, SCARES.horse.z, 0.7);
          const beds = [];
          for (const f of [0.3, 0.7]) { const b = put(V.bed, 0, f, 0.87, 1.4, 0.9, 1.7, { blanket: 'blanketGreen' }); if (b) beds.push(b); }
          put(V.cabinet, 3, 0.5, 0.25, 1.2, 1.2, 1.4, 0.5);
          put(V.chair, 1, 0.5, 0.5, 1.0);
          V.rug(cx, cz, y, 3.0, 2.2, 'wallBlue');
          if (ok(cx, cz + 0.8, 1.0)) {
            const tx = cx, tz = cz + 0.8;
            V.table(tx, tz, y, 0, 1.0, 0.7, 'woodDark', 0.5);
            mid(tx, tz, 1.1);
            if (story) {
              // THE DOLLS' TEA PARTY: three dolls on their stools, every one of them turned to
              // look at the door; the fourth stool is empty and faces the other way.
              const door = { x: 41, z: 26 };
              for (const [dx, dz, ry, who] of [[0, -0.62, Math.PI, 'velvetPlum'], [0.78, 0, Math.PI / 2, 'blanketBlue'], [-0.78, 0, -Math.PI / 2, 'blanket'], [0, 0.62, 0.3, null]]) {
                const sx = tx + dx, sz = tz + dz;
                if (!who) {
                  pc(T, C.woodMid, sx, sz, y, ry, 0, 0.28, 0, 0.14, 0.14, 0.04, 10);
                  for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; pc(T, C.woodMid, sx, sz, y, ry, Math.cos(a) * 0.09, 0.13, Math.sin(a) * 0.09, 0.015, 0.018, 0.26, 5); }
                  circle(sx, sz, 0.16, y, y + 0.3, 'wood', true, false);
                  continue;
                }
                // the body faces the table (its back away from it); the head turns to the door
                const face = Math.atan2(sx - door.x, sz - door.z);
                let look = face - ry; while (look > Math.PI) look -= Math.PI * 2; while (look < -Math.PI) look += Math.PI * 2;
                V.doll(sx, sz, y, ry, look, who);
              }
              for (let i = 0; i < 4; i++) {
                const a = i * Math.PI / 2;
                const q = fr(tx, tz, a, 0, -0.22);
                V.setting(q[0], q[1], ty(0.5), a, false, i === 3);
              }
              pc(S, C.china, tx, tz, ty(0.5), 0, 0, 0.07, 0, 0.065, 0.075, 0.14, 12);
            }
          }
          void beds;
        };
        case 'sewing': return () => {
          if (ok(cx, cz, 1.4)) { V.table(cx, cz, y, 0, 2.0, 1.0, 'woodMid'); V.chair(cx, cz + 0.9, y, 0); mid(cx, cz, 1.2); }
          put(V.cabinet, 0, 0.5, 0.25, 1.2, 1.4, 1.8, 0.5, 'woodMid');
          // two dressmakers' dummies
          for (const f of [0.3, 0.7]) {
            const p = wall(2, f, 0.47);
            if (!ok(p.x, p.z, 0.8) || crowded(p.x, p.z, 0.3)) continue;
            S.cyl(0.02, 0.03, 1.0, 5, LX(p.x), LY(y + 0.5), LZ(p.z), C.metal);
            S.cyl(0.18, 0.22, 0.7, 8, LX(p.x), LY(y + 1.35), LZ(p.z), C.cloth);
            for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; S.cyl(0.012, 0.012, 0.3, 4, LX(p.x + Math.cos(a) * 0.1), LY(y + 0.13), LZ(p.z + Math.sin(a) * 0.1), C.metal, 0, -0.6 * Math.sin(a), 0.6 * Math.cos(a)); }
            circle(p.x, p.z, 0.3, y, y + 1.7, 'wood', false, false);
            claim(p.x, p.z, 0.3);
          }
          for (let i = 0; i < 3; i++) put(V.candle, 3, 0.2 + i * 0.3, 0.1, 0.3);
        };
        case 'cellar': return () => {
          // THE CLAIM. The fuse board on the west wall of the Cellar, at the far end from
          // the arch. manor-data CLAIM_DONOR is this spot; placedata's row is its site
          // frame; tests/manor.mjs asserts all three agree.
          // The board hangs on the wall face (x 40.13 + half its depth); the claim
          // point, where D1's fixture goes and where the player stands, is 0.75 m off it.
          const c = CLAIM_DONOR;
          V.dado(room, y);
          V.fuseboard(room.wx0 + WALL_T / 2 + 0.12, c.z, y, -Math.PI * 0.5);
          // Lucian's corner stays empty of anything but him (SCARES.lucian)
          if (bth) claim(SCARES.lucian.x, SCARES.lucian.z, 0.6);
          put(V.crate, 2, 0.8, 0.42, 0.9, 0.7);
          put(V.barrel, 0, 0.85, 0.37, 0.9);
          for (let i = 0; i < 2; i++) put(V.candle, 0, 0.3 + i * 0.3, 0.1, 0.3);
        };
        case 'wine': return () => {
          put(V.rack, 3, 0.3, 0.23, 1.0, 2.4); put(V.rack, 3, 0.75, 0.23, 1.0, 2.4);
          put(V.rack, 1, 0.3, 0.23, 1.0, 2.4); put(V.rack, 1, 0.75, 0.23, 1.0, 2.4);
          for (const f of [0.2, 0.5, 0.8]) { const p = wall(2, f, 0.37); if (ok(p.x, p.z, 0.7) && !crowded(p.x, p.z, 0.36)) { V.barrel(p.x, p.z, y); claim(p.x, p.z, 0.36); } }
          if (ok(cx, cz, 0.9) && !crowded(cx, cz, 0.5)) V.crate(cx, cz, y, 0.5, 0.7);
        };
        case 'undercroft': return () => {
          V.dado(room, y);
          for (const [side, f] of [[3, 0.2], [3, 0.5], [3, 0.8], [1, 0.3], [1, 0.7]]) { const p = wall(side, f, 0.56); if (ok(p.x, p.z, 0.8) && !crowded(p.x, p.z, 0.45)) { V.crate(p.x, p.z, y, rng.range(-0.2, 0.2), 0.9); claim(p.x, p.z, 0.45); } }
          put(V.table, 2, 0.5, 0.42, 1.2, 2.0, 0.8);
          for (const f of [0.3, 0.7]) { const p = wall(0, f, 0.37); if (ok(p.x, p.z, 0.7) && !crowded(p.x, p.z, 0.36)) { V.barrel(p.x, p.z, y); claim(p.x, p.z, 0.36); } }
        };
        case 'boiler': return () => {
          if (ok(cx - 0.5, cz + 0.6, 1.5)) { V.boiler(cx - 0.5, cz + 0.6, y); mid(cx - 0.5, cz + 0.6, 1.0); }
          // the coal heap
          const p = wall(1, 0.3, 0.9);
          if (ok(p.x, p.z, 1.0) && !crowded(p.x, p.z, 0.8)) { S.cone(1.0, 0.9, 7, LX(p.x), LY(y + 0.45), LZ(p.z), C.dark); circle(p.x, p.z, 0.8, y, y + 0.6, 'stone', true, false); claim(p.x, p.z, 0.8); }
          put(V.crate, 0, 0.85, 0.42, 0.9, 0.6);
        };
        case 'tunnel': return () => {
          for (const f of [0.15, 0.55, 0.85]) put(V.crate, 0, f, 0.42, 0.9, 0.6, rng.range(-0.3, 0.3));
          put(V.barrel, 2, 0.35, 0.37, 0.9);
          for (const f of [0.3, 0.7]) put(V.candle, 2, f, 0.1, 0.3);
          if (bth && room.id === 'tunnel') {
            // SOMEBODY COUNTED THE DAYS. Tally marks in fives, scratched into the north wall
            // from the crypt end: six rows of them, and the last row stops part-way.
            // r3 polish: they were a perfect 28-wide grid of identical strokes, which read as
            // printed wallpaper and went to noise past 5 m (the critic's shots). By hand now:
            // each group its own spacing, height, stroke length and lean, a row that drifts, and
            // a wider gap after every seventh (a week). The same count, the same triangles.
            const face = room.wz0 + faceOf(0, 11) + 0.004;
            const SCR = [0.190, 0.166, 0.142];
            for (let row = 0; row < 6; row++) {
              const n = row < 5 ? 28 : 11;
              const drift = (h01(row, 5, 9) - 0.5) * 0.012;
              let gx = room.wx0 + 1.1 + h01(row, 7, 3) * 0.2;
              for (let g = 0; g < n; g++) {
                const u = h01(row, g, 3), v = h01(g, row, 4);
                const yy = y + 1.62 - row * 0.24 + drift * g + (v - 0.5) * 0.03;
                const len = 0.085 + u * 0.035, lean = (h01(g, row, 6) - 0.5) * 0.16;
                for (let s = 0; s < 4; s++) {
                  const k = h01(g, s, row);
                  S.at(new THREE.PlaneGeometry(0.011, len + (k - 0.5) * 0.02), SCR, LX(gx + s * 0.028), LY(yy + (k - 0.5) * 0.012), LZ(face), 0, 0, lean + (h01(s, g, row) - 0.5) * 0.08);
                }
                S.at(new THREE.PlaneGeometry(0.011, 0.125 + u * 0.03), SCR, LX(gx + 0.042), LY(yy), LZ(face + 0.001), 0, 0, 0.95 + v * 0.4);
                gx += 0.17 + u * 0.07 + (g % 7 === 6 ? 0.07 : 0);
              }
            }
          }
        };
        case 'crypt': return () => {
          // sarcophagi along the long axis (the crypt is 6 x 12 m, the stair enters from
          // the north end at x 2-4, z 2-8 — keep-out covers it)
          for (const f of [0.55, 0.8]) put(V.sarcophagus, 3, f, 0.6, 1.2);
          if (!bth) put(V.sarcophagus, 1, 0.8, 0.6, 1.2);
          if (bth && room.id === 'crypt') {
            // the two along the east wall that never fitted the keep-outs, and the middle one
            // is open and empty
            const ex = room.wx1 - faceOf(1, 5) - 0.6;
            for (const [zz, open] of [[3.6, false], [6.5, true]]) {
              if (!ok(ex, zz, 0.6) || crowded(ex, zz, 0.9)) continue;
              if (open) V.openSarcophagus(ex, zz, y, Math.PI / 2); else V.sarcophagus(ex, zz, y, Math.PI / 2);
              claim(ex, zz, 1.1);
            }
          }
          for (let i = 0; i < 3; i++) put(V.candle, 2, 0.2 + i * 0.3, 0.1, 0.3);
        };
        case 'priest': return () => {
          // The persistent Refuge owns the mattress and door in this surviving cellar room.
          V.candle(x0 + 0.4, z1 - 0.4, y);
          put(V.crate, 1, 0.5, 0.42, 0.8, 0.5);
        };
        default: return null;
      }

      /** THE GUESTS ARE STILL AT BREAKFAST (Vera's ledger). Five of them sit masked at their
       *  places; four chairs lie where they fell as the rest got up; the grandfather's chair at
       *  the head is pushed back and empty, his mask on his plate. */
      function breakfast(tx, tz) {
        const top = ty();
        const G = [
          [-1.8, -1, 'fall'], [-0.6, -1, 'velvetPlum', true], [0.6, -1, 'velvetBlack'], [1.8, -1, 'fall'],
          [-1.8, 1, 'velvetGreen'], [-0.6, 1, 'fall'], [0.6, 1, 'velvetBlack', true], [1.8, 1, 'fall'],
        ];
        for (const [ox, side, who, beak] of G) {
          const x = tx + ox, zc = tz + side * 1.0;
          const ry = side < 0 ? Math.PI : 0;
          const plate = fr(x, tz + side * 0.37, side < 0 ? 0 : Math.PI, 0, 0);
          if (who === 'fall') {
            // The chair lies where it went over when its guest stood: past the spot the live
            // guest rises into (interior-horror's blackthorn-breakfast stands 1.15 m out and
            // pushes back 0.55 m, its back reaching 0.4 m further), so nobody stands up
            // through it. Its footprint starts 2.15 m from the table's centreline.
            V.fallenChair(x, tz + side * 2.15, y, ry);
            V.setting(plate[0], plate[1], top, (side < 0 ? 0 : Math.PI) + 0.18, true, true);
          } else {
            V.chair(x, zc, y, ry, null, true);
            V.guest(x, zc, y, ry, who, !!beak);
            V.setting(plate[0], plate[1], top, side < 0 ? 0 : Math.PI, true, false);
          }
        }
        // the east head: one more, facing down the table
        V.chair(tx + 3.05, tz, y, Math.PI / 2, null, true);
        V.guest(tx + 3.05, tz, y, Math.PI / 2, 'velvetPlum', false);
        V.setting(tx + 2.22, tz, top, -Math.PI / 2, true, false);
        // the west head: the grandfather's chair, pushed back and turned, and his mask
        V.chair(tx - 3.25, tz + 0.2, y, -Math.PI / 2 + 0.35);
        V.setting(tx - 2.22, tz, top, Math.PI / 2, false, false);
        V.mask(tx - 2.22, tz, top + 0.016, Math.PI / 2 + 0.2, true);
        V.candelabrum(tx - 1.45, tz, top);
        V.candelabrum(tx + 1.45, tz, top);
        claim(tx, tz, 3.4);
      }
    }

    // ---- the build order [donor World.build] --------------------------------------------
    buildFloors();
    buildWallsFor('ground');
    buildWallsFor('first');
    buildWallsFor('basement');
    flushWallRuns();
    buildStairs();
    buildRailings();
    buildExterior();
    furnish();
    return k;
  }

  /* ------------------------------------------------------------------ *
   * The builder, in the shape every entry in sites.js BUILDERS has.
   * ------------------------------------------------------------------ */
  return {
    landmark(api) {
      const k = compile(api, 'landmark');
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: tools.GLOW.lamp };
    },
    body(api) {
      const k = compile(api, 'body');
      // the cloth gets its weave at fabric scale (places.js draws people unprojected)
      const people = k.people ? k.people.build() : null;
      if (people) {
        projectPlaceSurfaceUVs(people, 0.6);
        const c = people.attributes.color.array;
        for (let i = 0; i < c.length; i++) c[i] *= CLOTH_GAIN;
      }
      return {
        solid: k.solid.build(), glow: k.glow.build(), timber: k.timber ? k.timber.build() : null, people,
        moving: null, glowColour: tools.GLOW.lamp,
      };
    },
  };
}

export default makeManorBuilder;
