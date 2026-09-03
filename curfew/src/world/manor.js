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
import {
  CS, GX, GZ, LV, TALL_CEIL, ROOMS, DOORS, OPEN_PAIRS, RAIL_PAIRS, RAIL_SKIP, RAMPS,
  FLOOR_HOLES, CEIL_HOLES, CLAIM_DONOR, LIT_WINDOWS,
} from './manor-data.js';

/** donor (x, z) -> site-local: a translation, (x - HX, z - HZ). See THE FRAME above. */
export const HX = 30, HZ = 24;
/** metres the whole donor stack is raised. See THE LIFT above. */
export const LIFT = 3.2;

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
export function claimLocal() {
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
  plaster: [0.265, 0.252, 0.232],
  plasterOld: [0.215, 0.205, 0.180],
  woodMid: [0.180, 0.135, 0.092],
  stone: [0.175, 0.175, 0.170],
  stoneDark: [0.125, 0.125, 0.125],
  brick: [0.196, 0.124, 0.100],
  marble: [0.300, 0.292, 0.272],
  marblePlain: [0.280, 0.272, 0.255],
  woodFloor: [0.175, 0.132, 0.092],
  woodFloorDark: [0.125, 0.095, 0.070],
  ceiling: [0.240, 0.232, 0.212],
  woodDark: [0.140, 0.108, 0.082],
  doorWood: [0.150, 0.112, 0.080],
  glass: [0.050, 0.062, 0.082],
  brass: [0.300, 0.240, 0.100],
  cloth: [0.230, 0.216, 0.190],
  velvet: [0.200, 0.090, 0.085],
  metal: [0.128, 0.134, 0.146],
  rust: [0.176, 0.098, 0.062],
  slate: [0.085, 0.092, 0.104],
  dark: [0.105, 0.108, 0.115],
  paper: [0.320, 0.306, 0.270],
  facade: [0.190, 0.188, 0.180],
  plinth: [0.150, 0.150, 0.146],
};

/* ==========================================================================
   The compile. One closure per (api, phase) so nothing here lives past the build.
   ========================================================================== */
export function makeManorBuilder(tools) {
  const { kits, sash, PANE_WINDOW } = tools;

  function compile(api, phase) {
    const k = kits();
    const S = k.solid, G = k.glow;
    const padY = api.padY;
    const rng = api.rng;
    const isLand = phase === 'landmark';
    const isBody = !isLand;

    // ---- frame helpers -----------------------------------------------------------
    const LX = (x) => x - HX, LZ = (z) => z - HZ, LY = (y) => padY + LIFT + y;
    /** A donor-frame box on the solid kit. */
    const box = (w, h, d, mat, x, y, z, ry) => {
      S.box(w, h, d, LX(x), LY(y), LZ(z), PALETTE[mat] || PALETTE.plaster, ry || 0);
    };
    /** A donor-frame AABB collider. */
    const aabb = (x0, y0, z0, x1, y1, z1, tag, standable) => {
      api.emit({
        kind: 'obb', x: LX((x0 + x1) * 0.5), z: LZ((z0 + z1) * 0.5),
        halfX: (x1 - x0) * 0.5, halfZ: (z1 - z0) * 0.5, yaw: 0,
        y0: LY(y0), y1: LY(y1), tag: tag || 'wall', standable: !!standable,
      });
    };
    /** A donor-frame yawed box collider (door panels, furniture set at an angle). */
    const obb = (cx, cz, hx, hz, yaw, y0, y1, tag, standable) => {
      api.emit({
        kind: 'obb', x: LX(cx), z: LZ(cz), halfX: hx, halfZ: hz, yaw: yaw || 0,
        y0: LY(y0), y1: LY(y1), tag: tag || 'wood', standable: !!standable,
      });
    };
    const circle = (cx, cz, r, y0, y1, tag, standable) => {
      api.emit({ kind: 'circle', x: LX(cx), z: LZ(cz), r, y0: LY(y0), y1: LY(y1), tag: tag || 'wood', standable: !!standable });
    };

    // ---- room registry & cell maps [donor :235-249] ----------------------------------
    const cellMaps = {}, roomsByLevel = {}, roomById = {};
    for (const level of Object.keys(ROOMS)) {
      cellMaps[level] = {};
      roomsByLevel[level] = [];
      for (const [id, name, x0, z0, x1, z1, opts] of ROOMS[level]) {
        const room = { id, name, level, x0, z0, x1, z1, ...opts };
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
    const doorPoints = [];     // {level, x, z} donor metres, for the furnisher's keep-out
    for (const [level, cx, cz, dir, opts] of DOORS) {
      const kk = edgeKey(level, cx, cz, dir);
      (doorSpecs[kk.key] = doorSpecs[kk.key] || []).push({ level, cx, cz, dir, opts, ...kk });
      const along0 = (kk.axis === 'H' ? kk.ex : kk.ez) * CS;
      doorPoints.push({
        level, x: kk.axis === 'H' ? along0 + CS / 2 : kk.ex * CS,
        z: kk.axis === 'H' ? kk.ez * CS : along0 + CS / 2,
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
    function emitWall(axis, ex, ez, y0, y1, holes, matN, matP, t, outer, withCollider) {
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
          const len = s1 - s0, hgt = v1 - v0, ymid = (v0 + v1) / 2;
          if (axis === 'H') {
            if (drawN) box(len, hgt, t / 2, matN, smid, ymid, plane - t / 4);
            if (drawP) box(len, hgt, t / 2, matP, smid, ymid, plane + t / 4);
          } else {
            if (drawN) box(t / 2, hgt, len, matN, plane - t / 4, ymid, smid);
            if (drawP) box(t / 2, hgt, len, matP, plane + t / 4, ymid, smid);
          }
          if (withCollider && !windowSlice && v0 <= y0 + 0.01) wallCollider(axis, plane, s0, s1, y0, v1, t);
        }
      }
    }

    // ---- windows [donor :434-462] ----------------------------------------------------
    // Dark glass in the hole and a sash proud of it on the outside, both on the landmark
    // (the facade). The glow pane, for the seven windows in LIT_WINDOWS, is on the body's
    // glow kit: places.js shows a body glow only once the place is claimed. Every other
    // window in the house stays dark glass, which is what a derelict house has.
    function spawnWindow(key, axis, px, pz, mid, y0, y1, w, isX, t, outward) {
      const h = y1 - y0, cy = (y0 + y1) / 2;
      const ry = axis === 'H' ? (outward > 0 ? 0 : Math.PI) : (outward > 0 ? Math.PI * 0.5 : -Math.PI * 0.5);
      // donor frame -> local is a translation: the facing is the donor's own
      const lry = ry;
      const gx = isX ? mid : px, gz = isX ? pz : mid;
      if (isLand) {
        S.quad(w, h, LX(gx), LY(cy), LZ(gz), PALETTE.glass, lry, 0);
        sash(S, w, h, LX(gx), LY(cy), LZ(gz), PALETTE.woodDark, lry, 0, w > 1.4 ? 2 : 1, h > 3 ? 4 : 2, 0.07, t * 0.5 + 0.02);
      } else if (LIT_WINDOWS.indexOf(key) >= 0) {
        // 0.03 outside the glass (so the glass cannot z-fight it) and BEHIND the sash
        // bars, which stand 0.16-0.28 proud of the plane and cut the glow up the way
        // sites.js's sash() note says a lit window has to be cut up.
        const ox = isX ? 0 : outward * 0.03, oz = isX ? outward * 0.03 : 0;
        G.pane(w, h, LX(gx + ox), LY(cy), LZ(gz + oz), PANE_WINDOW, lry, 0, 4, 5);
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
        S.box(len, h - 0.04, 0.09, LX(cxD), LY(y0 + h / 2), LZ(czD), PALETTE.doorWood, yaw);
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
    function railSlope(x0, z0, x1, z1, yA, yB, segs) {
      const n = segs || 4;
      for (let i = 0; i < n; i++) {
        const f0 = i / n, f1 = (i + 1) / n;
        const y = yA + (yB - yA) * (f0 + f1) / 2;
        balustrade(x0 + (x1 - x0) * f0, z0 + (z1 - z0) * f0, x0 + (x1 - x0) * f1, z0 + (z1 - z0) * f1, y);
      }
    }

    // ---- walls: every cell edge of every level [donor :313-390] ----------------------
    const openSet = new Set(OPEN_PAIRS.map(p => p.slice().sort().join('|')));
    const railSet = new Set(RAIL_PAIRS.map(p => p.slice().sort().join('|')));
    const railSkip = new Set(RAIL_SKIP);
    const fullHeightEdges = new Set();
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
              const outward = outer === 'N' ? -1 : 1;
              spawnWindow(key, axis, px, pz, mid, wy0, wy1, ww, isX, t, outward);
              if (tall && !gothic) {
                const wy2 = LV.first.floor + 1.0, wy3 = LV.first.floor + 2.7;
                holes.push({ a0: mid - ww / 2, a1: mid + ww / 2, y0: wy2, y1: wy3 });
                spawnWindow('first|' + axis + '|' + ex + '|' + ez, axis, px, pz, mid, wy2, wy3, ww, isX, t, outward);
              }
            }
          }

          const matN = a && !a.void ? (a.wall || 'plaster') : 'facade';
          const matP = b && !b.void ? (b.wall || 'plaster') : 'facade';
          emitWall(axis, ex, ez, yBase, yTop, holes, matN, matP, t, outer, withCollider);
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
    function floorCollider(rect, y) {
      // split long slabs so no half-extent passes MAX_RUN / 2 (the corridors are 60 m)
      const nx = Math.ceil((rect.x1 - rect.x0) / MAX_RUN), nz = Math.ceil((rect.z1 - rect.z0) / MAX_RUN);
      for (let i = 0; i < nx; i++) for (let j = 0; j < nz; j++) {
        const x0 = rect.x0 + (rect.x1 - rect.x0) * i / nx, x1 = rect.x0 + (rect.x1 - rect.x0) * (i + 1) / nx;
        const z0 = rect.z0 + (rect.z1 - rect.z0) * j / nz, z1 = rect.z0 + (rect.z1 - rect.z0) * (j + 1) / nz;
        aabb(x0, y - FLOOR_T, z0, x1, y, z1, 'stone', true);
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
          // ceilings: geometry only; headroom is by construction
          if (!anyCeilHole) {
            box(rect.x1 - rect.x0, CEIL_T, rect.z1 - rect.z0, cm, room.cx, ceilY + CEIL_T / 2, room.cz);
          } else {
            for (let cx = room.x0; cx <= room.x1; cx++) for (let cz = room.z0; cz <= room.z1; cz++) {
              if (ceilHoles[level + '|' + cx + ',' + cz]) continue;
              box(CS, CEIL_T, CS, cm, cx * CS + CS / 2, ceilY + CEIL_T / 2, cz * CS + CS / 2);
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
        }
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
      balustrade(46, 4, 46, 10, 0);     // cellar stair opening (scullery floor)
      balustrade(50, 4, 50, 10, 0);
      balustrade(46, 10, 50, 10, 0);
      balustrade(2, 2, 2, 8, 0);        // chapel crypt steps
      balustrade(4, 2, 4, 8, 0);
      balustrade(2, 8, 4, 8, 0);
    }

    // ---- THE EXTERIOR: what the donor never had ----------------------------------------
    // The plinth (the lifted cellar's outside), the roof, the chimneys, the steps and the
    // porch. All landmark: this is the silhouette.
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

      // THE ROOF: hipped, over the first-floor ceiling, 45-degree hips.
      const eave = LV.first.ceil + CEIL_T, rise = 6.0, ov = 0.7;
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
      S.push(g, PALETTE.slate);
      // fascia and the ridge cap
      box(ex1 - ex0 + 0.2, 0.42, 0.18, 'woodDark', 30, eave - 0.1, ez1 + 0.05);
      box(ex1 - ex0 + 0.2, 0.42, 0.18, 'woodDark', 30, eave - 0.1, ez0 - 0.05);
      box(0.18, 0.42, ez1 - ez0 + 0.2, 'woodDark', ex0 - 0.05, eave - 0.1, 20);
      box(0.18, 0.42, ez1 - ez0 + 0.2, 'woodDark', ex1 + 0.05, eave - 0.1, 20);
      box(rx1 - rx0 + 0.4, 0.3, 0.5, 'dark', 30, ridgeY + 0.05, rz);
      // CHIMNEYS: four brick stacks through the roof, tall enough to be a read.
      const roofAt = (x, z) => {
        const dz = Math.abs(z - rz), dxE = Math.min(x - ex0, ex1 - x);
        return eave + rise * Math.max(0, 1 - Math.max(dz, hd - dxE) / hd);
      };
      for (const [x, z] of [[9, 12], [22, 28], [42, 12], [51, 30]]) {
        const top = roofAt(x, z) + 3.2;
        box(1.5, top - (eave - 1.0), 1.5, 'brick', x, (top + eave - 1.0) / 2, z);
        box(1.9, 0.35, 1.9, 'stone', x, top + 0.17, z);
        for (const [px, pz] of [[-0.35, -0.35], [0.35, 0.35]]) {
          S.tube(0.22, 0.22, 0.6, 8, LX(x + px), LY(top + 0.6), LZ(z + pz), PALETTE.dark);
        }
      }

      // THE FRONT STEPS: seven risers from the yard to the front door, 6 m wide, a
      // solid stack so they read as a flight and not as a ladder. The foot lands on
      // the road end (donor z 44.4 = local z +20.4; the road ends at +19.9).
      const doorX = 29, front = 40 + EXT_T / 2;
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
      // THE PORCH: two columns on the top step and a slab over the door.
      for (const sx of [-1, 1]) {
        const x = doorX + sx * 2.2, z = front + 0.9;
        S.cyl(0.26, 0.30, 5.8, 10, LX(x), LY(-riser + 2.9), LZ(z), PALETTE.stone);
        box(0.8, 0.25, 0.8, 'stone', x, -riser + 5.85, z);
        circle(x, z, 0.32, -riser - 0.2, -riser + 6.0, 'stone');
      }
      box(6.2, 0.4, 2.4, 'stone', doorX, 6.2, front + 0.6);
      box(6.6, 0.24, 2.8, 'slate', doorX, 6.55, front + 0.6);
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
          if (room.void || !room.furn || room.furn === 'none') continue;
          const P = propsFor(room, y, doorsHere, keepOut);
          if (P) P();
        }
      }
    }

    /** True if a point is within `r` of a door on this level or inside a keep-out rect. */
    function blocked(x, z, r, doorsHere, keepOut) {
      for (const d of doorsHere) if (Math.hypot(d.x - x, d.z - z) < r) return true;
      for (const k of keepOut) if (x > k.x0 && x < k.x1 && z > k.z0 && z < k.z1) return true;
      return false;
    }

    // the vocabulary
    const V = {
      table(x, z, y, ry, w, d, mat, h) {
        const th = h || 0.76, m = PALETTE[mat || 'woodDark'];
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(w, 0.06, d, LX(x), LY(y + th - 0.03), LZ(z), m, ry || 0);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = sx * (w / 2 - 0.1), pz = sz * (d / 2 - 0.1);
          S.box(0.08, th - 0.06, 0.08, LX(x + px * c + pz * s), LY(y + (th - 0.06) / 2), LZ(z - px * s + pz * c), m, ry || 0);
        }
        obb(x, z, w / 2, d / 2, ry || 0, y, y + th, 'wood', true);
      },
      chair(x, z, y, ry, mat) {
        const m = mat || 'woodDark';
        S.box(0.46, 0.05, 0.46, LX(x), LY(y + 0.45), LZ(z), PALETTE[m], ry || 0);
        for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
          const px = sx * 0.19, pz = sz * 0.19;
          const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
          S.box(0.04, 0.44, 0.04, LX(x + px * c + pz * s), LY(y + 0.22), LZ(z - px * s + pz * c), PALETTE[m], ry || 0);
        }
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(0.46, 0.5, 0.05, LX(x + 0.21 * s), LY(y + 0.72), LZ(z + 0.21 * c), PALETTE[m], ry || 0);
        circle(x, z, 0.30, y, y + 0.95, 'wood', true);
      },
      armchair(x, z, y, ry) {
        S.box(0.9, 0.45, 0.9, LX(x), LY(y + 0.225), LZ(z), PALETTE.velvet, ry || 0);
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(0.9, 0.55, 0.2, LX(x + 0.35 * s), LY(y + 0.72), LZ(z + 0.35 * c), PALETTE.velvet, ry || 0);
        S.box(0.18, 0.2, 0.9, LX(x + 0.36 * c), LY(y + 0.55), LZ(z - 0.36 * s), PALETTE.velvet, ry || 0);
        S.box(0.18, 0.2, 0.9, LX(x - 0.36 * c), LY(y + 0.55), LZ(z + 0.36 * s), PALETTE.velvet, ry || 0);
        obb(x, z, 0.45, 0.45, ry || 0, y, y + 1.0, 'wood', true);
      },
      sofa(x, z, y, ry) {
        S.box(2.0, 0.45, 0.9, LX(x), LY(y + 0.225), LZ(z), PALETTE.velvet, ry || 0);
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(2.0, 0.5, 0.22, LX(x + 0.34 * s), LY(y + 0.7), LZ(z + 0.34 * c), PALETTE.velvet, ry || 0);
        obb(x, z, 1.0, 0.45, ry || 0, y, y + 0.95, 'wood', true);
      },
      bed(x, z, y, ry, w, l) {
        const bw = w || 1.6, bl = l || 2.1;
        S.box(bw, 0.5, bl, LX(x), LY(y + 0.25), LZ(z), PALETTE.woodDark, ry || 0);
        S.box(bw - 0.1, 0.16, bl - 0.1, LX(x), LY(y + 0.58), LZ(z), PALETTE.cloth, ry || 0);
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(bw, 1.2, 0.08, LX(x + (bl / 2 - 0.04) * s), LY(y + 0.6), LZ(z + (bl / 2 - 0.04) * c), PALETTE.woodDark, ry || 0);
        obb(x, z, bw / 2, bl / 2, ry || 0, y, y + 0.66, 'wood', true);
      },
      cabinet(x, z, y, ry, w, h, d, mat) {
        const cw = w || 1.2, ch = h || 2.1, cd = d || 0.5;
        S.box(cw, ch, cd, LX(x), LY(y + ch / 2), LZ(z), PALETTE[mat || 'woodDark'], ry || 0);
        S.box(cw + 0.06, 0.08, cd + 0.06, LX(x), LY(y + ch + 0.04), LZ(z), PALETTE[mat || 'woodDark'], ry || 0);
        obb(x, z, cw / 2, cd / 2, ry || 0, y, y + ch, 'wood', true);
      },
      bookcase(x, z, y, ry, w) {
        const bw = w || 2.0;
        V.cabinet(x, z, y, ry, bw, 2.4, 0.4, 'woodMid');
        // the books: a lighter strip on the face, three shelves' worth
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        for (const sh of [0.5, 1.2, 1.9]) {
          S.box(bw - 0.2, 0.32, 0.06, LX(x - 0.23 * s), LY(y + sh), LZ(z - 0.23 * c), PALETTE.velvet, ry || 0);
        }
      },
      piano(x, z, y, ry) {
        S.box(1.5, 0.28, 2.2, LX(x), LY(y + 0.85), LZ(z), PALETTE.dark, ry || 0);
        S.box(1.5, 0.1, 2.2, LX(x), LY(y + 1.0), LZ(z), PALETTE.dark, ry || 0);   // the lid, closed
        for (const [px, pz] of [[-0.6, -0.9], [0.6, -0.9], [0, 0.9]]) {
          const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
          S.cyl(0.05, 0.06, 0.72, 6, LX(x + px * c + pz * s), LY(y + 0.36), LZ(z - px * s + pz * c), PALETTE.dark);
        }
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(1.3, 0.06, 0.3, LX(x - 1.1 * s), LY(y + 0.75), LZ(z - 1.1 * c), PALETTE.paper, ry || 0);   // the keys
        obb(x, z, 0.75, 1.1, ry || 0, y, y + 1.05, 'wood', true);
      },
      pew(x, z, y, ry) {
        S.box(2.4, 0.05, 0.42, LX(x), LY(y + 0.45), LZ(z), PALETTE.woodDark, ry || 0);
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(2.4, 0.5, 0.05, LX(x + 0.2 * s), LY(y + 0.7), LZ(z + 0.2 * c), PALETTE.woodDark, ry || 0);
        S.box(0.06, 0.45, 0.42, LX(x + 1.17 * c), LY(y + 0.22), LZ(z - 1.17 * s), PALETTE.woodDark, ry || 0);
        S.box(0.06, 0.45, 0.42, LX(x - 1.17 * c), LY(y + 0.22), LZ(z + 1.17 * s), PALETTE.woodDark, ry || 0);
        obb(x, z, 1.2, 0.24, ry || 0, y, y + 0.95, 'wood', true);
      },
      barrel(x, z, y) {
        S.cyl(0.34, 0.30, 0.9, 9, LX(x), LY(y + 0.45), LZ(z), PALETTE.woodMid);
        S.tube(0.35, 0.35, 0.05, 9, LX(x), LY(y + 0.25), LZ(z), PALETTE.metal);
        S.tube(0.35, 0.35, 0.05, 9, LX(x), LY(y + 0.65), LZ(z), PALETTE.metal);
        circle(x, z, 0.36, y, y + 0.9, 'wood', true);
      },
      crate(x, z, y, ry, s) {
        const cs = s || 0.8;
        S.box(cs, cs * 0.8, cs, LX(x), LY(y + cs * 0.4), LZ(z), PALETTE.woodMid, ry || 0);
        obb(x, z, cs / 2, cs / 2, ry || 0, y, y + cs * 0.8, 'wood', true);
      },
      rug(x, z, y, w, d, mat) {
        S.box(w, 0.02, d, LX(x), LY(y + 0.011), LZ(z), PALETTE[mat || 'velvet']);
      },
      portrait(x, z, y, ry, w, h) {
        // a framed dark canvas on a wall; ry faces the room
        const pw = w || 0.9, ph = h || 1.2;
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(pw + 0.12, ph + 0.12, 0.06, LX(x), LY(y + 1.7), LZ(z), PALETTE.brass, ry || 0);
        S.quad(pw, ph, LX(x - 0.04 * s), LY(y + 1.7), LZ(z - 0.04 * c), PALETTE.dark, (ry || 0) + Math.PI, 0);
      },
      hearth(x, z, y, ry) {
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(1.8, 1.25, 0.5, LX(x), LY(y + 0.625), LZ(z), PALETTE.stone, ry || 0);
        S.box(1.1, 0.9, 0.3, LX(x - 0.14 * s), LY(y + 0.45), LZ(z - 0.14 * c), PALETTE.dark, ry || 0);
        S.box(2.0, 0.1, 0.6, LX(x), LY(y + 1.3), LZ(z), PALETTE.woodDark, ry || 0);
        obb(x, z, 0.9, 0.25, ry || 0, y, y + 1.3, 'stone');
      },
      candle(x, z, y) {
        S.cyl(0.04, 0.06, 0.9, 6, LX(x), LY(y + 0.45), LZ(z), PALETTE.brass);
        S.cyl(0.03, 0.03, 0.2, 6, LX(x), LY(y + 1.0), LZ(z), PALETTE.paper);
      },
      chandelier(x, z, yCeil) {
        S.cyl(0.02, 0.02, 1.6, 4, LX(x), LY(yCeil - 0.8), LZ(z), PALETTE.metal);
        S.tube(0.9, 0.9, 0.08, 12, LX(x), LY(yCeil - 1.6), LZ(z), PALETTE.brass);
        for (let i = 0; i < 8; i++) {
          const a = i / 8 * Math.PI * 2;
          S.cyl(0.025, 0.025, 0.22, 4, LX(x + Math.cos(a) * 0.9), LY(yCeil - 1.5), LZ(z + Math.sin(a) * 0.9), PALETTE.paper);
        }
      },
      sarcophagus(x, z, y, ry) {
        S.box(2.2, 0.8, 0.95, LX(x), LY(y + 0.4), LZ(z), PALETTE.stoneDark, ry || 0);
        S.box(2.3, 0.14, 1.05, LX(x), LY(y + 0.87), LZ(z), PALETTE.stone, ry || 0);
        obb(x, z, 1.15, 0.52, ry || 0, y, y + 0.94, 'stone', true);
      },
      boiler(x, z, y) {
        S.cyl(0.9, 0.9, 2.2, 12, LX(x), LY(y + 1.1), LZ(z), PALETTE.rust);
        S.cyl(0.95, 0.95, 0.2, 12, LX(x), LY(y + 2.25), LZ(z), PALETTE.metal);
        S.box(0.5, 0.5, 0.2, LX(x), LY(y + 0.8), LZ(z - 0.95), PALETTE.dark);
        S.cyl(0.12, 0.12, 2.0, 6, LX(x + 0.6), LY(y + 3.0), LZ(z + 0.5), PALETTE.metal, 0, 0, Math.PI * 0.5);
        circle(x, z, 0.95, y, y + 2.4, 'metal');
      },
      rack(x, z, y, ry, w) {
        // a wine rack / shelf unit, 2 m tall
        V.cabinet(x, z, y, ry, w || 2.0, 2.0, 0.45, 'woodDark');
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        for (const sh of [0.4, 0.9, 1.4]) S.box((w || 2.0) - 0.2, 0.06, 0.08, LX(x - 0.26 * s), LY(y + sh), LZ(z - 0.26 * c), PALETTE.plasterOld, ry || 0);
      },
      fuseboard(x, z, y, ry) {
        // the claim: a breaker cabinet on the wall, the same shape the other majors use
        const c = Math.cos(ry || 0), s = Math.sin(ry || 0);
        S.box(0.7, 1.0, 0.24, LX(x), LY(y + 1.35), LZ(z), PALETTE.metal, ry || 0);
        S.box(0.16, 0.16, 0.34, LX(x - 0.12 * s), LY(y + 1.35), LZ(z - 0.12 * c), PALETTE.rust, ry || 0);   // the handle
        S.cyl(0.03, 0.03, 1.2, 5, LX(x + 0.2 * c), LY(y + 0.6), LZ(z - 0.2 * s), PALETTE.metal);      // conduit down
        S.cyl(0.03, 0.03, 1.4, 5, LX(x), LY(y + 2.5), LZ(z), PALETTE.metal);                            // and up
      },
    };

    function propsFor(room, y, doorsHere, keepOut) {
      const x0 = room.wx0 + 0.35, x1 = room.wx1 - 0.35, z0 = room.wz0 + 0.35, z1 = room.wz1 - 0.35;
      const cx = room.cx, cz = room.cz, w = x1 - x0, d = z1 - z0;
      const ok = (x, z, r) => !blocked(x, z, r || 1.4, doorsHere, keepOut);
      // a wall spot: `side` 0..3 = -z, +x, +z, -x ; `f` 0..1 along it; inset from the wall
      // `ry` is the heading whose BACK (the vocabulary puts a back at +(sin ry, cos ry))
      // is against that wall, so a chair, a bed or a sofa put here faces into the room.
      const wall = (side, f, inset) => {
        const i = inset || 0.3;
        if (side === 0) return { x: x0 + w * f, z: z0 + i, ry: Math.PI };
        if (side === 1) return { x: x1 - i, z: z0 + d * f, ry: Math.PI * 0.5 };
        if (side === 2) return { x: x0 + w * f, z: z1 - i, ry: 0 };
        return { x: x0 + i, z: z0 + d * f, ry: -Math.PI * 0.5 };
      };
      const put = (fn, side, f, inset, r, ...rest) => {
        const p = wall(side, f, inset);
        if (!ok(p.x, p.z, r)) return false;
        fn(p.x, p.z, y, p.ry, ...rest);
        return true;
      };
      const ceil = (room.tall ? TALL_CEIL : LV[room.level].ceil);
      switch (room.furn) {
        case 'study': return () => {
          put(V.bookcase, 0, 0.25, 0.25, 1.4, 2.0); put(V.bookcase, 0, 0.75, 0.25, 1.4, 2.0);
          put(V.hearth, 3, 0.5, 0.3, 1.4);
          if (ok(cx, cz, 1.6)) { V.table(cx, cz, y, 0, 1.6, 0.9); V.chair(cx, cz + 0.85, y, Math.PI); V.chair(cx - 0.5, cz - 0.9, y, 0.2); }
          put(V.cabinet, 1, 0.3, 0.3, 1.2, 1.0, 1.4, 0.45);
          V.rug(cx, cz, y, 3.0, 2.2);
          V.candle(cx + 0.6, cz - 0.2, y + 0.76);
        };
        case 'library': return () => {
          for (const f of [0.15, 0.5, 0.85]) put(V.bookcase, 0, f, 0.25, 1.3, 2.4);
          for (const f of [0.15, 0.85]) put(V.bookcase, 2, f, 0.25, 1.3, 2.4);
          if (ok(cx, cz, 1.8)) { V.table(cx, cz, y, 0, 2.4, 1.0); V.chair(cx - 0.6, cz + 0.9, y, Math.PI); V.chair(cx + 0.6, cz - 0.9, y, 0); }
          put(V.armchair, 3, 0.5, 0.7, 1.4);
          V.rug(cx, cz, y, 4.0, 2.6);
          // the library ladder, leaning on the north wall
          S.box(0.5, 3.0, 0.08, LX(x0 + w * 0.32), LY(y + 1.5), LZ(z0 + 0.5), PALETTE.woodMid, 0, -0.18, 0);
        };
        case 'foyer': return () => {
          // KEPT CLEAR: the front door, the stair and the arch to the corridor are the
          // route. Two console tables against the side walls, urns, the chandelier.
          put(V.table, 3, 0.85, 0.4, 1.4, 1.2, 0.5);
          put(V.table, 1, 0.85, 0.4, 1.4, 1.2, 0.5);
          for (const side of [1, 3]) {
            const p = wall(side, 0.25, 0.5);
            if (ok(p.x, p.z, 1.2)) { S.cyl(0.32, 0.22, 0.9, 8, LX(p.x), LY(y + 0.45), LZ(p.z), PALETTE.stone); circle(p.x, p.z, 0.34, y, y + 0.9, 'stone', true); }
          }
          V.rug(cx, room.wz1 - 3.0, y, 3.4, 4.0);
          V.chandelier(cx, cz - 1.5, ceil);
          put(V.portrait, 3, 0.6, 0.15, 0.5, 1.2, 1.6);
          put(V.portrait, 1, 0.6, 0.15, 0.5, 1.2, 1.6);
        };
        case 'dining': return () => {
          if (ok(cx, cz, 2.6)) {
            V.table(cx, cz, y, 0, 5.0, 1.3);
            for (let i = 0; i < 4; i++) { V.chair(cx - 1.8 + i * 1.2, cz - 1.0, y, 0); V.chair(cx - 1.8 + i * 1.2, cz + 1.0, y, Math.PI); }
          }
          put(V.cabinet, 0, 0.5, 0.3, 1.6, 2.4, 1.0, 0.55);
          put(V.hearth, 2, 0.5, 0.3, 1.6);
          V.chandelier(cx, cz, ceil);
          put(V.portrait, 2, 0.2, 0.15, 0.5);
          put(V.portrait, 2, 0.8, 0.15, 0.5);
        };
        case 'kitchen': return () => {
          put(V.cabinet, 0, 0.3, 0.35, 1.3, 2.0, 0.9, 0.7, 'metal');   // the range
          put(V.cabinet, 0, 0.7, 0.3, 1.3, 1.8, 2.2, 0.5, 'woodMid');  // the dresser
          if (ok(cx, cz, 1.6)) V.table(cx, cz, y, 0, 2.6, 1.1, 'woodMid', 0.85);
          put(V.cabinet, 2, 0.5, 0.35, 1.3, 1.6, 0.85, 0.65, 'stone');  // the sink
          for (let i = 0; i < 3; i++) { const p = wall(1, 0.2 + i * 0.25, 0.5); if (ok(p.x, p.z, 0.8)) V.barrel(p.x, p.z, y); }
          // pans on the wall
          for (let i = 0; i < 4; i++) S.cyl(0.14, 0.14, 0.04, 8, LX(x0 + 0.05), LY(y + 1.6), LZ(z0 + 1.0 + i * 0.5), PALETTE.metal, 0, 0, Math.PI * 0.5);
        };
        case 'corridor': return () => {
          // the ends only: the middle is the way through the house
          put(V.table, 3, 0.5, 0.45, 1.0, 1.1, 0.45);
          put(V.table, 1, 0.5, 0.45, 1.0, 1.1, 0.45);
          for (const f of [0.1, 0.3, 0.5, 0.7, 0.9]) put(V.portrait, 0, f, 0.14, 0.4, 0.8, 1.0);
          V.rug(cx, cz, y, w * 0.9, 1.4, 'velvet');
        };
        case 'passage': return () => {
          put(V.chair, 3, 0.5, 0.4, 1.0);
          put(V.crate, 1, 0.5, 0.6, 1.0, 0.7);
          for (const f of [0.2, 0.5, 0.8]) put(V.candle, 0, f, 0.12, 0.3);
        };
        case 'ballroom': return () => {
          for (let i = 0; i < 6; i++) put(V.chair, 0, 0.1 + i * 0.16, 0.5, 1.0);
          for (let i = 0; i < 6; i++) put(V.chair, 2, 0.1 + i * 0.16, 0.5, 1.0);
          put(V.table, 3, 0.5, 0.6, 1.4, 1.0, 3.0);
          V.chandelier(cx - 3, cz, ceil); V.chandelier(cx + 3, cz, ceil);
          put(V.hearth, 1, 0.5, 0.3, 1.6);
        };
        case 'billiard': return () => {
          if (ok(cx, cz, 2.2)) { V.table(cx, cz, y, 0, 3.2, 1.7, 'wallGreen', 0.85); }
          put(V.cabinet, 0, 0.5, 0.15, 1.0, 1.2, 2.0, 0.2);   // cue rack
          put(V.armchair, 1, 0.2, 0.7, 1.2); put(V.armchair, 1, 0.8, 0.7, 1.2);
          V.chandelier(cx, cz, ceil);
        };
        case 'smoking': return () => {
          put(V.armchair, 0, 0.3, 0.7, 1.2); put(V.armchair, 0, 0.7, 0.7, 1.2);
          put(V.armchair, 2, 0.3, 0.7, 1.2);
          if (ok(cx, cz, 1.2)) V.table(cx, cz, y, 0, 1.0, 1.0, 'woodDark', 0.55);
          put(V.cabinet, 1, 0.5, 0.3, 1.2, 1.4, 1.2, 0.5);
          put(V.hearth, 3, 0.5, 0.3, 1.4);
          V.rug(cx, cz, y, 3.2, 3.2);
        };
        case 'drawing': return () => {
          if (ok(cx, cz + 1.2, 1.6)) V.sofa(cx, cz + 1.2, y, Math.PI);
          put(V.armchair, 3, 0.5, 0.8, 1.2); put(V.armchair, 1, 0.5, 0.8, 1.2);
          if (ok(cx, cz, 1.0)) V.table(cx, cz - 0.4, y, 0, 1.2, 0.7, 'woodDark', 0.5);
          put(V.hearth, 0, 0.5, 0.3, 1.6);
          put(V.cabinet, 2, 0.15, 0.3, 1.2, 1.2, 1.0, 0.5);
          V.rug(cx, cz, y, 4.0, 3.0);
          put(V.portrait, 0, 0.2, 0.15, 0.5); put(V.portrait, 0, 0.8, 0.15, 0.5);
        };
        case 'conserv': return () => {
          // planters with what is left of the plants
          for (const [side, f] of [[0, 0.2], [0, 0.5], [0, 0.8], [2, 0.2], [2, 0.8], [1, 0.5]]) {
            const p = wall(side, f, 0.6);
            if (!ok(p.x, p.z, 1.2)) continue;
            S.box(0.9, 0.7, 0.9, LX(p.x), LY(y + 0.35), LZ(p.z), PALETTE.stone);
            S.cone(0.35, 1.4, 6, LX(p.x), LY(y + 1.4), LZ(p.z), PALETTE.dark);
            S.cyl(0.03, 0.05, 1.8, 5, LX(p.x + 0.2), LY(y + 1.5), LZ(p.z - 0.1), PALETTE.woodDark, 0, 0.2, 0.3);
            circle(p.x, p.z, 0.5, y, y + 0.7, 'stone', true);
          }
          if (ok(cx, cz, 1.4)) { V.table(cx, cz, y, 0, 1.6, 0.8, 'metal', 0.72); V.chair(cx, cz + 0.8, y, Math.PI, 'metal'); }
        };
        case 'chapel': return () => {
          // pews in two ranks facing the altar at the north end; the crypt stair is at the
          // west edge (x 2-4) and stays clear
          for (let r = 0; r < 3; r++) for (const px of [7.4, 10.1]) {
            const pz = z0 + 4.0 + r * 1.5;
            if (ok(px, pz, 0.9)) V.pew(px, pz, y, 0);
          }
          const ax = cx + 1.0, az = z0 + 1.2;
          if (ok(ax, az, 1.0)) { S.box(2.0, 1.05, 0.9, LX(ax), LY(y + 0.525), LZ(az), PALETTE.stone); aabb(ax - 1.0, y, az - 0.45, ax + 1.0, y + 1.05, az + 0.45, 'stone', true); }
          V.candle(ax - 0.6, az, y + 1.05); V.candle(ax + 0.6, az, y + 1.05);
          S.box(0.12, 1.6, 0.12, LX(ax), LY(y + 1.85), LZ(az - 0.3), PALETTE.woodDark);   // the cross
          S.box(0.7, 0.12, 0.12, LX(ax), LY(y + 2.3), LZ(az - 0.3), PALETTE.woodDark);
        };
        case 'music': return () => {
          if (ok(cx + 1.0, cz - 0.5, 2.0)) V.piano(cx + 1.0, cz - 0.5, y, 0.4);
          for (let i = 0; i < 4; i++) put(V.chair, 0, 0.2 + i * 0.2, 0.6, 1.0);
          put(V.cabinet, 1, 0.5, 0.3, 1.2, 1.4, 1.1, 0.5);
          // a harp
          const p = wall(3, 0.4, 0.9);
          if (ok(p.x, p.z, 1.0)) { S.box(0.12, 1.7, 0.9, LX(p.x), LY(y + 0.85), LZ(p.z), PALETTE.brass, 0, 0, 0.3); circle(p.x, p.z, 0.45, y, y + 1.7, 'wood'); }
          V.rug(cx, cz, y, 3.6, 2.6);
        };
        case 'portrait': return () => {
          for (const f of [0.15, 0.38, 0.62, 0.85]) { put(V.portrait, 0, f, 0.14, 0.4, 1.0, 1.4); put(V.portrait, 2, f, 0.14, 0.4, 1.0, 1.4); }
          put(V.chair, 3, 0.5, 0.5, 1.0); put(V.chair, 1, 0.5, 0.5, 1.0);
          V.rug(cx, cz, y, w * 0.8, 1.6);
        };
        case 'servants': return () => {
          if (ok(cx, cz, 2.2)) { V.table(cx, cz, y, 0, 4.0, 1.0, 'woodMid'); for (const sz of [-1, 1]) { S.box(3.6, 0.05, 0.3, LX(cx), LY(y + 0.45), LZ(cz + sz * 0.8), PALETTE.woodMid); aabb(cx - 1.8, y, cz + sz * 0.8 - 0.15, cx + 1.8, y + 0.45, cz + sz * 0.8 + 0.15, 'wood', true); } }
          put(V.cabinet, 0, 0.5, 0.3, 1.3, 1.6, 2.0, 0.5, 'woodMid');
          put(V.hearth, 2, 0.5, 0.3, 1.4);
          for (let i = 0; i < 4; i++) put(V.candle, 3, 0.2 + i * 0.2, 0.12, 0.3);
        };
        case 'scullery': return () => {
          // the cellar stair hole is at the north end (x 46-50, z 4-10); everything else
          // stands on the south wall
          put(V.cabinet, 2, 0.5, 0.35, 1.2, 1.6, 0.85, 0.65, 'stone');   // the sinks
          put(V.rack, 0, 0.5, 0.3, 1.0, 1.4);
          const p = wall(1, 0.85, 0.5); if (ok(p.x, p.z, 0.7)) V.barrel(p.x, p.z, y);
        };
        case 'larder': return () => {
          put(V.rack, 3, 0.3, 0.3, 1.0, 2.0); put(V.rack, 3, 0.7, 0.3, 1.0, 2.0);
          put(V.rack, 1, 0.5, 0.3, 1.0, 2.0);
          for (const f of [0.25, 0.5, 0.75]) { const p = wall(2, f, 0.5); if (ok(p.x, p.z, 0.7)) V.barrel(p.x, p.z, y); }
          if (ok(cx, cz, 1.0)) V.crate(cx, cz, y, 0.3, 0.7);
        };
        case 'boudoir': return () => {
          put(V.sofa, 0, 0.5, 0.6, 1.4);
          put(V.armchair, 1, 0.5, 0.7, 1.2);
          put(V.cabinet, 2, 0.3, 0.3, 1.2, 1.0, 1.6, 0.45);
          if (ok(cx, cz, 1.0)) V.table(cx, cz, y, 0, 0.9, 0.9, 'woodDark', 0.55);
          V.rug(cx, cz, y, 3.0, 2.4);
          put(V.portrait, 3, 0.5, 0.15, 0.5);
        };
        case 'bedroom': case 'master': return () => {
          const big = room.furn === 'master';
          put(V.bed, 0, 0.5, 1.3, 1.6, big ? 2.0 : 1.5, big ? 2.3 : 2.1);
          put(V.cabinet, 3, 0.8, 0.3, 1.2, 1.4, 2.1, 0.55);
          put(V.table, 3, 0.25, 0.35, 1.0, 0.6, 0.5);
          put(V.chair, 1, 0.3, 0.5, 1.0);
          if (big) { put(V.hearth, 2, 0.3, 0.3, 1.5); put(V.armchair, 1, 0.7, 0.7, 1.2); }
          V.rug(cx, cz + 0.6, y, 2.8, 2.0);
          put(V.portrait, 1, 0.55, 0.15, 0.5);
        };
        case 'dressing': return () => {
          put(V.cabinet, 0, 0.25, 0.3, 1.2, 1.6, 2.2, 0.6); put(V.cabinet, 0, 0.75, 0.3, 1.2, 1.6, 2.2, 0.6);
          put(V.table, 2, 0.5, 0.45, 1.2, 1.2, 0.6);
          put(V.chair, 2, 0.5, 1.1, 0.9);
          // the mirror: a tall dark quad in a frame, on the east wall
          const p = wall(1, 0.5, 0.05);
          if (ok(p.x, p.z, 0.6)) { S.box(0.9, 1.9, 0.06, LX(p.x), LY(y + 1.5), LZ(p.z), PALETTE.brass, p.ry); S.quad(0.76, 1.76, LX(p.x + 0.05), LY(y + 1.5), LZ(p.z), PALETTE.glass, p.ry + Math.PI, 0); }
        };
        case 'nursery': return () => {
          put(V.bed, 0, 0.3, 1.2, 1.4, 0.9, 1.7); put(V.bed, 0, 0.7, 1.2, 1.4, 0.9, 1.7);
          put(V.cabinet, 3, 0.5, 0.3, 1.2, 1.2, 1.4, 0.5);
          if (ok(cx, cz + 0.8, 1.0)) V.table(cx, cz + 0.8, y, 0, 1.0, 0.7, 'woodDark', 0.5);
          put(V.chair, 1, 0.5, 0.5, 1.0);
          // a rocking horse: a box on two runners
          const p = wall(2, 0.5, 0.9);
          if (ok(p.x, p.z, 1.0)) { S.box(0.9, 0.5, 0.3, LX(p.x), LY(y + 0.75), LZ(p.z), PALETTE.woodMid); S.box(1.2, 0.08, 0.5, LX(p.x), LY(y + 0.06), LZ(p.z), PALETTE.woodMid); circle(p.x, p.z, 0.5, y, y + 1.0, 'wood'); }
          V.rug(cx, cz, y, 3.0, 2.2, 'wallBlue');
        };
        case 'sewing': return () => {
          if (ok(cx, cz, 1.4)) { V.table(cx, cz, y, 0, 2.0, 1.0, 'woodMid'); V.chair(cx, cz + 0.9, y, Math.PI); }
          put(V.cabinet, 0, 0.5, 0.3, 1.2, 1.4, 1.8, 0.5, 'woodMid');
          // two dressmakers' dummies
          for (const f of [0.3, 0.7]) { const p = wall(2, f, 0.6); if (ok(p.x, p.z, 0.8)) { S.cyl(0.02, 0.03, 1.0, 5, LX(p.x), LY(y + 0.5), LZ(p.z), PALETTE.metal); S.cyl(0.18, 0.22, 0.7, 8, LX(p.x), LY(y + 1.35), LZ(p.z), PALETTE.cloth); circle(p.x, p.z, 0.3, y, y + 1.7, 'wood'); } }
          for (let i = 0; i < 3; i++) put(V.candle, 3, 0.2 + i * 0.3, 0.12, 0.3);
        };
        case 'cellar': return () => {
          // THE CLAIM. The fuse board on the west wall of the Cellar, at the far end from
          // the arch. manor-data CLAIM_DONOR is this spot; placedata's row is its site
          // frame; tests/manor.mjs asserts all three agree.
          // The board hangs on the wall face (x 40.13 + half its depth); the claim
          // point, where D1's fixture goes and where the player stands, is 0.75 m off it.
          const c = CLAIM_DONOR;
          V.fuseboard(room.wx0 + WALL_T / 2 + 0.12, c.z, y, -Math.PI * 0.5);
          put(V.crate, 2, 0.8, 0.5, 0.9, 0.7);
          put(V.barrel, 0, 0.85, 0.5, 0.9);
          for (let i = 0; i < 2; i++) put(V.candle, 0, 0.3 + i * 0.3, 0.12, 0.3);
        };
        case 'wine': return () => {
          put(V.rack, 3, 0.3, 0.3, 1.0, 2.4); put(V.rack, 3, 0.75, 0.3, 1.0, 2.4);
          put(V.rack, 1, 0.3, 0.3, 1.0, 2.4); put(V.rack, 1, 0.75, 0.3, 1.0, 2.4);
          for (const f of [0.2, 0.5, 0.8]) { const p = wall(2, f, 0.5); if (ok(p.x, p.z, 0.7)) V.barrel(p.x, p.z, y); }
          if (ok(cx, cz, 0.9)) V.crate(cx, cz, y, 0.5, 0.7);
        };
        case 'undercroft': return () => {
          for (const [side, f] of [[3, 0.2], [3, 0.5], [3, 0.8], [1, 0.3], [1, 0.7]]) { const p = wall(side, f, 0.55); if (ok(p.x, p.z, 0.8)) V.crate(p.x, p.z, y, rng.range(-0.2, 0.2), 0.9); }
          put(V.table, 2, 0.5, 0.6, 1.2, 2.0, 0.8);
          for (const f of [0.3, 0.7]) { const p = wall(0, f, 0.5); if (ok(p.x, p.z, 0.7)) V.barrel(p.x, p.z, y); }
        };
        case 'boiler': return () => {
          if (ok(cx - 0.5, cz + 0.6, 1.5)) V.boiler(cx - 0.5, cz + 0.6, y);
          // the coal heap
          const p = wall(1, 0.3, 0.9);
          if (ok(p.x, p.z, 1.0)) { S.cone(1.0, 0.9, 7, LX(p.x), LY(y + 0.45), LZ(p.z), PALETTE.dark); circle(p.x, p.z, 0.8, y, y + 0.6, 'stone', true); }
          put(V.crate, 0, 0.85, 0.5, 0.9, 0.6);
        };
        case 'tunnel': return () => {
          for (const f of [0.15, 0.55, 0.85]) put(V.crate, 0, f, 0.5, 0.9, 0.6, rng.range(-0.3, 0.3));
          put(V.barrel, 2, 0.35, 0.5, 0.9);
          for (const f of [0.3, 0.7]) put(V.candle, 2, f, 0.12, 0.3);
        };
        case 'crypt': return () => {
          // sarcophagi along the long axis (the crypt is 6 x 12 m, the stair enters from
          // the north end at x 2-4, z 2-8 — keep-out covers it)
          for (const f of [0.55, 0.8]) put(V.sarcophagus, 3, f, 0.9, 1.2, Math.PI * 0.5);
          put(V.sarcophagus, 1, 0.8, 0.9, 1.2, Math.PI * 0.5);
          for (let i = 0; i < 3; i++) put(V.candle, 2, 0.2 + i * 0.3, 0.12, 0.3);
        };
        case 'priest': return () => {
          put(V.bed, 0, 0.5, 0.9, 1.0, 0.8, 1.8);
          V.candle(x0 + 0.4, z1 - 0.4, y);
          put(V.crate, 1, 0.5, 0.5, 0.8, 0.5);
        };
        default: return null;
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
      return { solid: k.solid.build(), glow: k.glow.build(), moving: null, glowColour: tools.GLOW.lamp };
    },
  };
}

export default makeManorBuilder;
