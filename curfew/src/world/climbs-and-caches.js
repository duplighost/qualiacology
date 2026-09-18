// CURFEW — CLIMB FACES AND HIDDEN CACHES. ROUND 18.
//
// TWO OF ALEX'S ASKS ON 2026-09-09 SHARE ONE FILE, because they are the same sentence twice:
// somewhere to go up, and something worth finding when you get there.
//
//   "Codex made a kind of surface you could climb up. This is the first one that really
//    works. We should put it on many destinations. It's fun."
//
//   "There is a large mansion destination. It has hardly anything in it. We need to hide
//    rewards in it. This is likely true for many destinations."
//
// THE CLIMB FACE is the water tower's, moved out of world/opening.js and made shareable. Its
// two halves are what make it work and both are load-bearing:
//
//   1. A SINGLE UNBROKEN 'wall' COLLIDER, at least 1.1 m tall and 0.65 m wide. That is
//      exactly what collision.js climbFace() will accept — an OBB, not breakable, not on
//      NON_CLIMB_TAGS — and it must be ONE box for the whole height, because the scaling
//      loop in controller.js re-probes every frame and a face made of stacked boxes drops
//      the player at the first seam.
//   2. VISIBLE GRIP COURSES every ~0.46 m, in PALE, with iron cleats either side. Nothing
//      about them is physical. They exist so that the wall reads as CLIMBABLE from twenty
//      metres away, which is the whole difference between a feature and a secret. The face
//      at the filling station is the one Alex says "really works", and this is why.
//
// THE CACHE is a strongbox that REMEMBERS. A destination's geometry is rebuilt every time
// its chunk streams in, so a container that pays on being broken pays again on every visit —
// at the round-18 prices (90-140 coins) that is the whole economy, farmable from a hundred
// metres of driving. `api.flag()` is the memory: once it has been opened it rebuilds as an
// empty, already-smashed box, so the place remembers you were there.
//
// WHERE THEY GO is the table at the bottom, keyed by site id, in each site's own local
// frame. Every position is on or beside a wall the site already has.

import { groundY, kits } from './sites.js';
// A SEALED CASE draws a band in its finish's own accent colour. boss-catalog.js is pure data
// with no imports; weapons/finishes.js would drag the renderer into a builder that has no
// business with it, and the accent hex lives on the skin either way.
import { BOSS_BY_ID } from './boss-catalog.js';

/* sites.js's groundY() is ABSOLUTE world height at a site-local point — it already contains
 * the pad. `api.padY + groundY(...)` therefore counts the pad twice, which is how the first
 * cut of this file put the cemetery's climb face 123 m in the air (measured: its top came
 * back at y 240.7 on ground at 117.2). Everywhere below, an authored offset that is
 * documented as "metres above the pad" gets `api.padY + v`, and a derived ground height gets
 * `groundY(...)` on its own. Nothing may have both. */

const WOOD = [0.115, 0.078, 0.046];
// The case's own lacquer: darker and colder than the strongbox's oak, so the two read apart
// at a glance in the same room.
const LACQUER = [0.038, 0.030, 0.028];

/**
 * A finish's accent, sRGB hex on the catalogue, as the LINEAR triple the solid kit takes.
 * Done by hand rather than through THREE.Color so this file stays renderer-free: the sRGB
 * transfer curve is the same three lines everywhere it appears.
 */
function accentOf(skinId) {
  const hex = BOSS_BY_ID[skinId]?.skin?.colors?.accent;
  if (!(hex >= 0)) return PALE;
  const to = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
  return [to(((hex >> 16) & 255) / 255), to(((hex >> 8) & 255) / 255), to((hex & 255) / 255)];
}
const PALE = [0.255, 0.212, 0.140];
const IRON = [0.058, 0.066, 0.072];
const RUST = [0.125, 0.062, 0.033];
const DARK = [0.030, 0.028, 0.024];

/**
 * A boarded, ladder-runged face you can hold Space against and climb.
 *
 * @param k     the site's kits ({ solid, glow })
 * @param api   the site api (padY, wx/wz, emit, heightAt)
 * @param o     { x, z, yaw, height, width, base }
 *              x/z/yaw are LOCAL to the site. `base` is metres above the pad the face
 *              starts at (0 = the ground); `height` is how far up it goes.
 *
 * The face is drawn on the +Z side of its own local frame, so `yaw` points the climbable
 * side at whoever should find it.
 */
export function climbFace(k, api, o) {
  const S = k.solid;
  const x = o.x, z = o.z, yaw = o.yaw || 0;
  const h = o.height, w = o.width === undefined ? 2.1 : o.width;
  const base = o.base === undefined ? groundY(api, x, z) : api.padY + o.base;
  const c = Math.cos(yaw), s = Math.sin(yaw);
  // the outward normal of the climbable side, in the site's local frame
  const nx = Math.sin(yaw), nz = Math.cos(yaw);

  // 1. THE BOARDING, and its one collider. ONE box for the whole height — see the header.
  S.box(w, h, 0.16, x, base + h * 0.5, z, WOOD, yaw);
  api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: 0.08, yaw,
    y0: base, y1: base + h, tag: 'wall', standable: false });
  // vertical stiles either side, so the boards have edges
  for (const sx of [-1, 1]) {
    S.box(0.14, h, 0.20, x + sx * (w * 0.5 - 0.06) * c, base + h * 0.5,
      z - sx * (w * 0.5 - 0.06) * s, RUST, yaw);
  }

  // 2. THE GRIP COURSES. Not physical, and the whole point. A rung every 0.46 m with two
  // iron cleats under it, alternating pale/iron so the ladder reads as a texture at range
  // rather than as a stack of identical bars.
  const rungs = Math.floor((h - 0.4) / 0.46);
  for (let i = 0; i < rungs; i++) {
    const y = base + 0.45 + i * 0.46;
    S.box(w * 1.03, 0.085, 0.10, x + nx * 0.11, y, z + nz * 0.11,
      i % 3 === 2 ? IRON : PALE, yaw);
    for (const dx of [-0.94, 0.94]) {
      S.box(0.055, 0.46, 0.035, x + dx * c + nx * 0.10, y - 0.20, z - dx * s + nz * 0.10,
        IRON, yaw);
    }
  }
  // A cap rail at the top, so the pull-up has something to reach for and the eye can see
  // where the climb ENDS from the bottom of it.
  S.box(w * 1.10, 0.11, 0.26, x + nx * 0.09, base + h + 0.03, z + nz * 0.09, PALE, yaw);
  return base + h;
}

/**
 * A small landing at the top of a face — somewhere to stand that is not the roof itself.
 * Emitted standable so the climb finishes on a floor rather than on a lip.
 */
export function landing(k, api, o) {
  const S = k.solid;
  const x = o.x, z = o.z, yaw = o.yaw || 0, w = o.w || 2.2, d = o.d || 1.5;
  const top = api.padY + o.top;
  S.box(w, 0.18, d, x, top - 0.09, z, WOOD, yaw);
  api.emit({ kind: 'obb', x, z, halfX: w * 0.5, halfZ: d * 0.5, yaw,
    y0: top - 0.18, y1: top, tag: 'deck', standable: true });
  // a rail on three sides, open where the ladder arrives
  const c = Math.cos(yaw), s = Math.sin(yaw);
  for (const sx of [-1, 1]) {
    const px = x + sx * (w * 0.5) * c, pz = z - sx * (w * 0.5) * s;
    S.box(0.07, 0.90, d, px, top + 0.45, pz, IRON, yaw);
    // MEASURED 2026-09-18: the side panels were drawn with no collider, so a landing's
    // "rail" was a picture you walked through and off the edge.
    api.emit({ kind: 'obb', x: px, z: pz, halfX: 0.05, halfZ: d * 0.5, yaw,
      y0: top, y1: top + 0.90, tag: 'metal', standable: false, climbable: false });
  }
  // `back: false` for a landing whose far side IS the way on (the eave of a roof you step
  // onto): no bar there, rather than a bar you can walk through.
  if (o.back !== false) {
    const bx = x - Math.sin(yaw) * (d * 0.5), bz = z - Math.cos(yaw) * (d * 0.5);
    S.box(w, 0.09, 0.09, bx, top + 0.88, bz, PALE, yaw);
    S.box(w, 0.07, 0.07, bx, top + 0.45, bz, IRON, yaw);   // the mid-rail
    api.emit({ kind: 'obb', x: bx, z: bz, halfX: w * 0.5, halfZ: 0.05, yaw,
      y0: top, y1: top + 0.93, tag: 'metal', standable: false, climbable: false });
  }
  return top;
}

/**
 * A HIDDEN CACHE. An iron-banded strongbox, two or three buttstrokes to open, and it
 * remembers being opened for the life of the save (see the header).
 *
 * `id` must be stable across rebuilds — it is the flag key. Give it a name, not an index.
 */
/**
 * A GAS CAN. This function draws NOTHING: world/gas.js owns every can mesh in the county so
 * that taking one can disappear on the frame you press E, rather than on the next time the
 * site's geometry happens to stream back in. All this does is hand gas.js a world point out
 * of the site's own local frame, the way stash() hands places.js one.
 *
 * `id` must be stable across rebuilds — it is the flag key.
 */
export function gasCan(k, api, o) {
  void k;
  const y = o.y === undefined ? groundY(api, o.x, o.z) : api.padY + o.y;
  if (typeof api.registerGasCan === 'function') {
    api.registerGasCan(o.x, o.z, y, 'gas:' + api.site.id + ':' + o.id, o.yaw || 0);
  }
  return y;
}

export function stash(k, api, o) {
  const S = k.solid;
  const x = o.x, z = o.z, yaw = o.yaw || 0;
  const g = o.y === undefined ? groundY(api, x, z) : api.padY + o.y;
  const opened = !!api.flag('stash:' + o.id);
  // THE ELEVEN REWIRE. Eleven of the twenty-four boxes are SEALED CASES: same collider, same
  // hit points, same landings, same coins, and a weapon finish inside. It is a long lacquered
  // case with brass latches and one band in the finish's own colour, so you can see from the
  // bottom of the climb that this one is not an ordinary coffer.
  const caseId = typeof o.case === 'string' ? o.case : '';

  S.open();
  if (caseId) {
    const cos = Math.cos(yaw), sin = Math.sin(yaw);
    // along the case's long axis (local +X, rotated), and out of its face (local +Z)
    const along = (m) => [x + m * cos, z - m * sin];
    if (opened) {
      // Forced, lid off, empty. The band stays: the county remembers which one this was.
      S.box(1.20, 0.10, 0.46, x, g + 0.05, z, LACQUER, yaw);
      const [lx, lz] = along(0.44);
      S.box(1.02, 0.09, 0.40, lx, g + 0.10, lz, LACQUER, yaw + 0.5);
      S.box(1.21, 0.055, 0.12, x, g + 0.11, z, accentOf(caseId), yaw);
      S.close(x, z, 0.8, LACQUER);
      return g;
    }
    S.box(1.20, 0.26, 0.46, x, g + 0.13, z, LACQUER, yaw);
    S.box(1.22, 0.075, 0.47, x, g + 0.29, z, LACQUER, yaw);   // the lid
    S.box(1.23, 0.022, 0.48, x, g + 0.252, z, PALE, yaw);     // the raised lid seam
    S.box(1.21, 0.060, 0.115, x, g + 0.185, z, accentOf(caseId), yaw);
    for (const m of [-0.40, 0.40]) {
      const [bx, bz] = along(m);
      S.box(0.085, 0.13, 0.50, bx, g + 0.255, bz, PALE, yaw);   // the two latches
      S.box(0.050, 0.055, 0.055, bx + sin * 0.26, g + 0.245, bz + cos * 0.26, PALE, yaw);
    }
    const [hx, hz] = along(0);
    S.box(0.20, 0.045, 0.075, hx, g + 0.322, hz, PALE, yaw);  // the carrying handle
    S.close(x, z, 0.9, LACQUER);
    api.emit({ kind: 'obb', x, z, halfX: 0.62, halfZ: 0.25, yaw,
      y0: g - 0.22, y1: g + 0.36, tag: 'strongbox', standable: true, breakable: true });
    if (typeof api.registerStash === 'function') api.registerStash(x, z, g, 'stash:' + o.id, caseId);
    return g;
  }
  if (opened) {
    // Already had. What is left is a wrecked box, which is a better answer than nothing
    // there at all: the county remembers, and so does the player.
    S.box(0.88, 0.16, 0.60, x, g + 0.08, z, WOOD, yaw);
    S.box(0.62, 0.10, 0.48, x + 0.36 * Math.cos(yaw), g + 0.05, z - 0.36 * Math.sin(yaw),
      WOOD, yaw + 0.6);
    for (const ox of [-0.26, 0.30]) {
      S.box(0.07, 0.09, 0.58, x + ox * Math.cos(yaw), g + 0.12, z - ox * Math.sin(yaw),
        IRON, yaw + 0.2);
    }
    S.close(x, z, 0.5, WOOD);
    return g;
  }
  S.box(0.86, 0.54, 0.60, x, g + 0.27, z, WOOD, yaw);
  S.box(0.90, 0.10, 0.64, x, g + 0.52, z, PALE, yaw);
  for (const ox of [-0.28, 0, 0.28]) {
    S.box(0.07, 0.58, 0.64, x + ox * Math.cos(yaw), g + 0.28, z - ox * Math.sin(yaw), IRON, yaw);
  }
  // the lock plate: the one bright thing on it, and what you actually spot in a dark room
  S.box(0.15, 0.17, 0.07, x + Math.sin(yaw) * 0.31, g + 0.31, z + Math.cos(yaw) * 0.31, PALE, yaw);
  S.box(0.05, 0.07, 0.04, x + Math.sin(yaw) * 0.35, g + 0.29, z + Math.cos(yaw) * 0.35, DARK, yaw);
  S.close(x, z, 0.8, WOOD);
  api.emit({ kind: 'obb', x, z, halfX: 0.45, halfZ: 0.32, yaw,
    y0: g - 0.22, y1: g + 0.56, tag: 'strongbox', standable: true, breakable: true });
  // AND THE MEMORY. Without this line the box above is a farm: it pays 90-140 coins when it
  // comes apart and its collider is re-emitted every time the site streams back in. places.js
  // watches 'world:broke' and sets the flag for whichever registered stash the break landed
  // on, so the next rebuild takes the `opened` branch above.
  if (typeof api.registerStash === 'function') api.registerStash(x, z, g, 'stash:' + o.id);
  return g;
}

/* ==========================================================================
   WHERE THEY GO.

   Coordinates are LOCAL to each site, in the same pad frame every other authored thing at a
   destination uses. `climbs` are faces you can go up; `stashes` are things to find, and
   several of them are deliberately AT THE TOP OF A CLIMB, because a climb that leads
   nowhere is a staircase and a climb that leads to a locked box is a reason.

   The manor is first and it has the most, because Alex named it: "There is a large mansion
   destination. It has hardly anything in it."
   ========================================================================== */

export const SITE_EXTRAS = Object.freeze({
  // GAS CANS (`cans`) are the Eleven rewire's. A can is a one-time pickup, flagged like a
  // stash, and one can fills the car — so they are spread thin and always somewhere a person
  // would actually have kept petrol: a rack in the bay, a weigh office, a granary, a booth.
  // Four sites below exist in this table ONLY because they carry one.
  // The service bay's pair are the FIRST two cans in the game and the car starts the night
  // empty, so they are the only reason it can begin. They used to stand 0.70 m apart ONE
  // BEHIND THE OTHER on the approach, and the picker took whichever was nearer: measured from
  // six bearings, the front one answered every time and the back one could not be taken from
  // any stance a body can stand in (collision.canOccupy refused both sides of it). Spread
  // along the rack instead — dress-station.js draws it 1.24 m wide at local x -19.6, z 3.55 —
  // so they are side by side with open floor in front of both, and gas.js picks by gaze.
  'filling-station': {
    cans: [
      { id: 'rack-a', x: -20.15, z: 3.5, y: 0.02, yaw: 0.2 },
      { id: 'rack-b', x: -19.05, z: 3.5, y: 0.02, yaw: -0.4 },
    ],
  },
  'the-toll': { cans: [{ id: 'booth', x: 3.4, z: -2.6, yaw: 1.1 }] },
  // The quarry is a pit (world-scars.js). Two quarrymen's ladders up the west faces, floor to
  // the first bench and the first to the second, where the upper strongbox is (outer-
  // destinations.js keeps both faces flush). Each stops 0.10 under its tread, the county's
  // ladder-to-deck norm the scaler pulls over by. The petrol was the winch engine's, and it is still
  // inside the winch house at the derrick's foot, on the floor beside the door; same id, so a
  // can already taken stays taken.
  'red-quarry': {
    climbs: [
      { x: -27.92, z: -45, yaw: Math.PI / 2, height: 3.4, width: 1.8 },
      { x: -31.92, z: -41.5, yaw: Math.PI / 2, height: 3.4, width: 1.8, base: 3.5 },
    ],
    cans: [{ id: 'landing', x: 12.95, z: -43.05, yaw: -0.6 }],
  },
  'choir-vault': { cans: [{ id: 'stair-top', x: 4.8, z: -3.2, yaw: 0.8 }] },
  // r3 (2026-09-18). MEASURED in the interiors map: every one of these was INSIDE the house.
  // Both climbs ran up interior wall lines through the floors, the moth case sat in the
  // first-floor slab, the chimney stash in a ceiling, and the can and the yard box were sealed
  // in the void under the dining room. Now: two faces on the OUTSIDE of the two gables, each
  // up to its own landing against the wall (the east one opens onto the roof at the eave);
  // the can and the yard box in the drive among the guests' cars (estate-details.js). The
  // ids are unchanged, so a save that already took one keeps it taken.
  'blackthorn-manor': {
    climbs: [
      // the west gable, between the passage window and the ballroom's: a boarded face up to
      // a small balcony against the wall
      { x: -31.95, z: -7.0, yaw: -Math.PI / 2, height: 7.55 },
      // the east gable, inside the pergola's line: up to the eave and onto the roof
      { x: 32.3, z: -12.0, yaw: Math.PI / 2, height: 10.85, width: 1.7 },
    ],
    landings: [
      { x: -31.1, z: -7.0, yaw: -Math.PI / 2, top: 7.65, w: 2.0, d: 1.7 },
      { x: 31.575, z: -12.0, yaw: Math.PI / 2, top: 10.95, w: 2.0, d: 1.45, back: false },
    ],
    stashes: [
      { id: 'roof', x: -30.72, z: -7.0, y: 7.65, yaw: -Math.PI / 2, case: 'moth' },  // the case, on the balcony
      { id: 'chimney', x: 31.25, z: -12.4, y: 10.95, yaw: Math.PI / 2 },           // at the eave, before the roof
      { id: 'cellar', x: -9.4, z: -12.6, y: 0.02, yaw: 0.8 },   // the Old Tunnel
      { id: 'hall', x: 15.8, z: 5.6, y: 3.22, yaw: -0.5 },      // the Long Corridor, clear of the dining room door
      { id: 'yard', x: 19.4, z: 23.2, yaw: 1.05 },              // tucked against the third car
    ],
    cans: [{ id: 'outbuilding', x: 12.3, z: 26.7, yaw: 1.6 }], // between the first two cars
  },
  'avery-house': {
    climbs: [{ x: 16.4, z: 5.0, yaw: Math.PI / 2, height: 7.2 }],
    landings: [{ x: 14.8, z: 5.0, yaw: Math.PI / 2, top: 7.3, w: 2.4, d: 1.8 }],
    stashes: [
      { id: 'roof', x: 14.8, z: 5.7, y: 7.3, yaw: -0.35 },
      { id: 'upper', x: 12.4, z: 4.4, y: 7.42, yaw: 0.6, case: 'blacktide' },
      { id: 'scullery', x: -13.9, z: 5.4, y: 0.02, yaw: 1.2 },
    ],
    cans: [{ id: 'scullery', x: -13.2, z: 6.1, y: 0.02, yaw: -0.5 }],
  },
  'weeping-mine': {
    climbs: [{ x: -12.6, z: -6.4, yaw: -Math.PI / 2, height: 8.6, width: 1.9 }],
    landings: [{ x: -11.0, z: -6.4, yaw: -Math.PI / 2, top: 8.7, w: 2.2, d: 1.7 }],
    stashes: [
      { id: 'headgear', x: -11.0, z: -7.0, y: 8.7, yaw: 0.2, case: 'furnace' },
      { id: 'shift', x: 9.1, z: -8.2, y: 0.02, yaw: -0.8 },
    ],
    cans: [{ id: 'weigh-office', x: 8.4, z: -7.5, y: 0.02, yaw: 0.4 }],
  },
  cathedral: {
    climbs: [{ x: -9.4, z: 12.0, yaw: -Math.PI / 2, height: 11.0, width: 1.8 }],
    landings: [{ x: -7.8, z: 12.0, yaw: -Math.PI / 2, top: 11.1, w: 2.2, d: 1.7 }],
    stashes: [
      { id: 'triforium', x: -7.8, z: 12.7, y: 11.1, yaw: 0.5, case: 'choir' },
      { id: 'crypt', x: 2.6, z: 20.4, y: 0.02, yaw: -1.1 },
    ],
  },
  chapel: {
    climbs: [{ x: 6.6, z: 3.2, yaw: Math.PI / 2, height: 5.8, width: 1.7 }],
    landings: [{ x: 5.2, z: 3.2, yaw: Math.PI / 2, top: 5.9, w: 2.0, d: 1.5 }],
    stashes: [
      { id: 'belfry', x: 5.2, z: 3.8, y: 5.9, yaw: 0.3, case: 'rootmother' },
      { id: 'vestry', x: -2.4, z: 6.8, y: 0.02, yaw: 0.9 },
    ],
  },
  'hollow-mill': {
    climbs: [{ x: 13.0, z: 2.6, yaw: Math.PI / 2, height: 8.0, width: 1.9 }],
    landings: [{ x: 11.4, z: 2.6, yaw: Math.PI / 2, top: 8.1, w: 2.2, d: 1.7 }],
    stashes: [
      { id: 'loft', x: 11.4, z: 3.3, y: 8.1, yaw: -0.4, case: 'antler' },
      { id: 'granary', x: 10.4, z: -5.6, y: 0.02, yaw: 1.4 },
    ],
    cans: [{ id: 'granary', x: 9.7, z: -5.0, y: 0.02, yaw: -0.9 }],
  },
  'garden-of-rest': {
    climbs: [{ x: -20.4, z: -14.6, yaw: -Math.PI / 2, height: 6.4, width: 1.8 }],
    landings: [{ x: -18.8, z: -14.6, yaw: -Math.PI / 2, top: 6.5, w: 2.2, d: 1.6 }],
    stashes: [
      { id: 'columbarium', x: -18.8, z: -15.2, y: 6.5, yaw: 0.25, case: 'underkeep' },
      { id: 'mausoleum', x: 2.4, z: 9.6, y: 0.02, yaw: -0.7 },
    ],
  },
  jackfield: {
    climbs: [{ x: 7.2, z: 2.0, yaw: Math.PI / 2, height: 6.6, width: 1.9 }],
    landings: [{ x: 5.6, z: 2.0, yaw: Math.PI / 2, top: 6.7, w: 2.2, d: 1.6 }],
    stashes: [
      { id: 'rafters', x: 5.6, z: 2.7, y: 6.7, yaw: 0.5, case: 'fieldmaw' },
      { id: 'stalls', x: -3.4, z: -3.2, y: 0.02, yaw: 1.1 },
    ],
    cans: [{ id: 'shed', x: -4.1, z: -2.5, y: 0.02, yaw: 0.3 }],
  },
  'bell-tower': {
    climbs: [{ x: 4.2, z: 0, yaw: Math.PI / 2, height: 9.4, width: 1.7 }],
    landings: [{ x: 2.8, z: 0, yaw: Math.PI / 2, top: 9.5, w: 2.0, d: 1.6 }],
    stashes: [{ id: 'ringing-floor', x: 2.8, z: 0.7, y: 9.5, yaw: -0.2, case: 'bellwether' }],
  },
  gallowsfen: {
    climbs: [{ x: 6.8, z: -3.4, yaw: Math.PI / 2, height: 7.6, width: 1.8 }],
    landings: [{ x: 5.2, z: -3.4, yaw: Math.PI / 2, top: 7.7, w: 2.1, d: 1.6 }],
    stashes: [{ id: 'steeple', x: 5.2, z: -4.0, y: 7.7, yaw: 0.4, case: 'mire' }],
  },
  relay: {
    climbs: [{ x: 5.4, z: 4.8, yaw: Math.PI / 2, height: 8.2, width: 1.8 }],
    landings: [{ x: 3.8, z: 4.8, yaw: Math.PI / 2, top: 8.3, w: 2.1, d: 1.6 }],
    stashes: [{ id: 'mast-deck', x: 3.8, z: 5.5, y: 8.3, yaw: -0.5, case: 'lantern' }],
    cans: [{ id: 'mast-hut', x: 6.1, z: 3.2, yaw: 0.7 }],
  },
  'drowned-light': {
    climbs: [{ x: 5.6, z: -2.2, yaw: Math.PI / 2, height: 9.0, width: 1.7 }],
    landings: [{ x: 4.0, z: -2.2, yaw: Math.PI / 2, top: 9.1, w: 2.0, d: 1.6 }],
    stashes: [{ id: 'gallery', x: 4.0, z: -2.9, y: 9.1, yaw: 0.3 }],
  },
});

/**
 * THE ELEVEN SEALED CASES, derived from the table above: which weapon finish is in which
 * site's case. Read by the Weapons page (to name the place a finish came from, and only once
 * it is open) and by the keepers' Look from the Top and Bo's lead (to know what is left).
 * Derived, never hand-written twice: the table above is the only place a case is declared.
 */
export const CASE_SITE = Object.freeze(Object.fromEntries(
  Object.entries(SITE_EXTRAS).flatMap(([site, row]) =>
    (row.stashes || []).filter(s => s.case).map(s => [s.case, site])),
));
export const SITE_CASE = Object.freeze(Object.fromEntries(
  Object.entries(CASE_SITE).map(([finish, site]) => [site, finish]),
));

/**
 * Run the whole pass for one site. Called from destination-details.js, which every
 * compound's finish() already calls, so this reaches every destination that has a row.
 *
 * Placement failures are SAFE by construction: a face whose collider lands inside an
 * existing wall simply overlaps it, and a stash whose box is inside geometry is a box you
 * cannot reach — neither can break the site. Nothing here can refuse to build.
 */
export function addClimbsAndCaches(k, api) {
  const rows = SITE_EXTRAS[api.site.id];
  if (!rows) return false;
  if (rows.climbs) for (const c of rows.climbs) climbFace(k, api, c);
  if (rows.landings) for (const l of rows.landings) landing(k, api, l);
  if (rows.stashes) for (const s of rows.stashes) stash(k, api, s);
  if (rows.cans) for (const c of rows.cans) gasCan(k, api, c);
  return true;
}

/**
 * The same pass, with its own kits, in the shape places.js's DRESS chain wants:
 * `{ solid, glow }` geometries or null.
 *
 * IT LIVES HERE AND NOT IN destination-details.js BECAUSE THAT FILE DOES NOT RUN FOR EVERY
 * DESTINATION. addDestinationDetails() is called from each compound's own finish(), and
 * Blackthorn Manor and the Avery House are not compounds — they are compiled from their own
 * room tables through manor.js and avery-house.js. Hung off destination-details, this pass
 * built nothing at either of them, which was measured: 0 faces and 0 caches at the manor
 * against 3 and 2 at the cemetery. The MANOR is the one Alex actually named — "There is a
 * large mansion destination. It has hardly anything in it" — so getting it there and nowhere
 * useful would have been the whole ask missed. places.js's _dress() runs for every major
 * whatever built it, so that is where it goes.
 */
export function siteExtras(api) {
  if (!SITE_EXTRAS[api.site.id]) return null;
  const k = kits();
  addClimbsAndCaches(k, api);
  const solid = k.solid.build();
  const glow = k.glow.build();      // null when nothing was laid; Kit.build() returns null
  return { solid, glow };
}

export default addClimbsAndCaches;
