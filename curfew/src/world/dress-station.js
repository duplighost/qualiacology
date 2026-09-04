// CURFEW — the Filling Station's dress. ROUND 7, lane A.
//
// Alex, sixth playtest: "the first area is ugly and vacant." And, in the same message, the
// thing he most wants the county to have:
//
//   "It has to be clear when you've finished a safe place like the first one. maybe a
//    circuit board has a big thing that must be flipped on and you can rest in areas — the
//    first area near the spawn looks like it could serve as an example for this by having
//    you do that, and then it allows you to get inside and close the door and be safe where
//    there is a little sleeping bag and it looks kind of cozy"
//
// This file owns everything that stands at the Filling Station and is not already in
// sites.js BUILDERS.station. It is a DRESS: places.js calls it after the base builder with
// the same api, and merges what it returns into the station's body geometry. It never
// replaces the base builder — the canopy, the pumps, the shop shell, the roof strips and
// their colliders all live there and must keep working.
//
//   DRESS[kindOrId](api, out) -> { solid, glow, glowColour, cast } | null
//
// `api` is places.js's builder api: { site, padY, yaw, rng, heightAt, wx, wz, emit }, in the
// site's LOCAL frame, +Z toward the road. Build with the kit toolkit exported by sites.js —
// `kits()`, `C`, `shell`, `sash`, `glowColumn`, `groundY` — so a prop authored here is
// indistinguishable from one authored there.
//
// The DOOR, the BREAKER and RESTING are not geometry and do not live here: they are state,
// they must survive the chunk streaming out and back in, and they are owned by
// src/world/refuge.js. This file exports ANCHORS so the two files cannot disagree about
// where the door hangs, where the bag is, or which wall the breaker is bolted to.
//
// ============================================================================
// THE LOCAL FRAME, measured off sites.js BUILDERS.station (read 2026-09-03)
// ============================================================================
//   +Z is the ROAD side. (places.js:762 sets yaw = atan2(road - site) and its wx/wz send
//   local +Z to the road point. sites.js's own comment there says -Z and is wrong; the same
//   error already cost yardWall a round — see its ROUND 6 note.)
//
//   canopy      13 x 9 at (0, 0), slab underside padY+4.325, posts at (+-5.46, +-3.6)
//   pumps       two islands at z -2.4 and +2.4, kerb x -1.8..1.8
//   shop        centre (-10.5, 0.5), 10 x 7 x 3.6, walls 0.44 thick
//               interior          x -15.28..-5.72,  z -2.78..3.78
//               doorway (-Z face) x -11.7..-9.3 at z -3.0, head at padY+3.1
//               east end wall     x -5.72..-5.28,  z -3..4   <- THE BLANK WALL
//   sign pylon  (6.6, -7.4);  crate stair (-10.9..-15.0, 4.95);  drums (-4.5..-3.8, 4.7..5.6)
//   shop front  window (-13.6, -3.06), map board (-7.4, -3.29), bench (-7.4, -3.72),
//               ice chest (-13.6, -3.72), bin (-6.4, -3.9), phone box (-17.0, -1.6)
//   forecourt   pallets (2.6, -5.9) and (3.9, -5.5), air line (4.2, 0), tyres (4.3, 5.1)
//
// Everything below was placed in the gaps between those, and nothing here is brighter than
// the strip light under the canopy (ART 0.3 row 12). The pumps were the brightest objects in
// the frame — the wet patches, the gravel and the weeds exist to put values in the 48-127
// band ART 0.2 says the frame has nothing in, not to add another highlight.

import * as THREE from 'three';
import { C, kits, groundY } from './sites.js';

/* ==========================================================================
   ANCHORS — the three places refuge.js needs, in the station's LOCAL frame.
   One definition, imported by the system that animates them, so the door leaf
   and the door frame can never be built against different numbers.
   ========================================================================== */
export const ANCHORS = Object.freeze({
  // The breaker board, bolted to the shop's blank east end wall, facing +X (the pumps).
  // You can see it from where you wake up; that is the whole point of putting it there.
  breaker: Object.freeze({ x: -5.24, z: 0.20, y: 1.05, faceYaw: Math.PI * 0.5 }),
  // The door. Hinged on the +X jamb, swinging INWARD (+Z) so it never fouls the bench,
  // the bin or the map board on the way round.
  door: Object.freeze({
    // The leaf is authored extending +X from the hinge, so a NEGATIVE angle swings the free
    // end to +Z (inward). It opens back over the west half of the room, which is the half
    // with nothing in it for 2.3 m — the walk-in line from the doorway stays clear.
    hingeX: -11.64, hingeZ: -3.00, width: 2.30, height: 2.44, open: -1.62,
    // the middle of the leaf when shut, which is what the interact reach is measured to
    midX: -10.49, midZ: -3.00,
  }),
  // The bed you rest on.
  bag: Object.freeze({ x: -13.30, z: 2.20, yaw: 0.16 }),
  // Every light the breaker turns on, local frame, y above padY.
  lamps: Object.freeze({
    // The flex hangs BESIDE the bed, not over your face: at z 1.30 it filled a third of the
    // frame from the pillow (tests/shots/refuge-rest-fading.png, first cut).
    bulb: Object.freeze({ x: -13.30, y: 2.42, z: 0.85 }),   // the flex over the bed
    // The crate stood at z 2.98 and MEASURED (tests/refuge.mjs, the walk section) it wedged
    // the only lane between the doorway and the bed: a body walking in on foot stopped 3.2 m
    // short of the bag and could not get round it. It is south of the bed now, out of the lane.
    table: Object.freeze({ x: -12.30, y: 0.74, z: 1.05 }),  // the lamp on the crate
    stove: Object.freeze({ x: -14.62, y: 0.46, z: -1.70 }), // the firebox
    door: Object.freeze({ x: -10.50, y: 2.78, z: -3.32 }),  // the bulkhead OUTSIDE the door
    counter: Object.freeze({ x: -8.20, y: 1.16, z: 1.30 }), // the strip over the counter
  }),
});

/* --------------------------------------------------------------------------
   Palette. LINEAR albedos, in sites.js's band. Two rules held throughout:
     - nothing here is above C.plaster (0.265). The pumps already own the top of
       the frame and ART 0.3 row 12 rations everything above 150.
     - the interior is the ONE place in the county allowed to be warm, so its
       cloth and its timber are red-shifted while staying dark. A pale blanket
       under a rover lamp at 2 m clips; a dark red one glows.
   -------------------------------------------------------------------------- */
const D = {
  gravel: [0.112, 0.110, 0.104],
  weed: [0.052, 0.068, 0.048],
  wet: [0.158, 0.182, 0.196],      // ~2x the marsh ground: the puddle reflects the sky
  wetCore: [0.232, 0.262, 0.284],  // the sheen down its middle, 48-127 and nothing more
  paint: [0.132, 0.118, 0.104],    // the abandoned car's body, dulled right down
  chrome: [0.150, 0.152, 0.158],
  tyre: [0.038, 0.038, 0.040],
  bin: [0.086, 0.104, 0.084],      // municipal green, at night
  binLid: [0.062, 0.074, 0.062],
  cardboard: [0.112, 0.092, 0.068],
  quilt: [0.132, 0.076, 0.055],    // the sleeping bag: dull red, warm under a lamp
  quiltIn: [0.128, 0.112, 0.090],  // its lining, turned back at the head
  foam: [0.104, 0.098, 0.086],
  timber: [0.098, 0.075, 0.055],
  stove: [0.040, 0.040, 0.044],
  tin: [0.104, 0.100, 0.094],
  label: [0.140, 0.094, 0.062],
  enamel: [0.118, 0.114, 0.106],
  conduit: [0.062, 0.064, 0.070],
  // THE LINING. The shop's shell is C.plaster (0.265), which is right for a building seen
  // across a dark forecourt and catastrophic for a room with a lamp in it: MEASURED
  // 2026-09-03 at the bed with the lamp at 21 cd, 23.5% of the frame went over 150 against
  // ART 0.3 row 12's 1.5% ration, and every surface flattened to one plate. So the room is
  // BOARDED OUT: a dark timber lining inside the plaster, floor to ceiling, and a ceiling
  // under the gable. Same fix as the breaker's panel below — stop the light landing on
  // plaster, rather than turn the light down until nothing is lit.
  lining: [0.062, 0.049, 0.038],
  liningUp: [0.045, 0.037, 0.030],
  ceiling: [0.036, 0.031, 0.026],
  // The breaker's backing panel: the darkest made surface in the county, on purpose.
  panel: [0.015, 0.015, 0.018],
  angle: [0.086, 0.052, 0.036],
  // THE PUMP CLADDING. The pumps were the two lightest large shapes in the opening frame
  // (C.plaster, 0.265). Dark enamel with one band, so they read as machines against a lit
  // forecourt instead of as the light source.
  pump: [0.076, 0.079, 0.086],
  display: [0.148, 0.152, 0.140],
  pumpBand: [0.150, 0.086, 0.052],
};

/** A small run of scatter without a for-loop at every call site. */
function scatter(k, rng, n, cx, cz, r0, r1, fn) {
  for (let i = 0; i < n; i++) {
    const a = rng.range(0, Math.PI * 2), rr = r0 + (r1 - r0) * Math.sqrt(rng.next());
    fn(cx + Math.cos(a) * rr, cz + Math.sin(a) * rr, rng);
  }
}

/* ==========================================================================
   THE FORECOURT — "a place that was working an hour ago and then everyone left"
   ========================================================================== */

/** Gravel, weeds and a broken kerb where the apron gives out. Depth at ankle height. */
function apronEdge(k, api) {
  const rng = api.rng;
  // the gravel band, 15.5 - 21 m out, thinning outward. No colliders: these are 6-11 cm.
  scatter(k, rng, 96, 0, 0, 15.5, 21.0, (x, z, r) => {
    const s = r.range(0.06, 0.16);
    k.box(s, s * 0.5, s * r.range(0.7, 1.3), x, groundY(api, x, z) + s * 0.2, z, D.gravel, r.range(0, 3));
  });
  // weed tufts. Three or four blades a tuft, leaning, so the apron has a ragged edge
  // instead of a drawn circle. Dark, so they read as texture and never as highlights.
  scatter(k, rng, 74, 0, 0, 14.0, 20.5, (x, z, r) => {
    const g = groundY(api, x, z);
    const n = 3 + ((r.next() * 3) | 0);
    for (let i = 0; i < n; i++) {
      const h = r.range(0.16, 0.42);
      k.box(0.022, h, 0.022, x + r.range(-0.13, 0.13), g + h * 0.5, z + r.range(-0.13, 0.13),
        D.weed, r.range(0, 3), r.range(-0.3, 0.3), r.range(-0.3, 0.3));
    }
  });
  // weeds through the joint where the apron meets the shop's east wall, and along the kerbs
  for (let i = 0; i < 16; i++) {
    const z = -3.2 + i * 0.46;
    const h = rng.range(0.14, 0.34);
    k.box(0.022, h, 0.022, -5.16 + rng.range(-0.06, 0.06), api.padY + h * 0.5, z, D.weed,
      rng.range(0, 3), 0, rng.range(-0.35, 0.35));
  }
  // a broken slab or two at the apron lip, tipped
  for (const [sx, sz, sr] of [[8.2, 11.4, 0.5], [-14.0, 12.6, -0.8], [13.6, -6.2, 0.2]]) {
    const g = groundY(api, sx, sz);
    k.box(1.30, 0.14, 0.92, sx, g + 0.05, sz, D.gravel, sr, rng.range(0.04, 0.10), 0);
    api.emit({ kind: 'obb', x: sx, z: sz, halfX: 0.65, halfZ: 0.46, yaw: sr, y0: g - 0.2, y1: g + 0.14, tag: 'stone', standable: true });
  }
}

/**
 * THE WET PATCHES. ART 0.2: the band 48-127 "is where shape, roundness, material and depth
 * are carried" and it holds 4.2% of the frame. A forecourt that has been rained on is the
 * cheapest legal way to put a large, soft, mid-value shape on the ground under a light, and
 * it is the only thing here that makes the strip light read as a LIGHT rather than as a
 * fixture: light you can see landing on something.
 *
 * Flat quads at padY + 12 mm on the BODY material, never the additive one. A puddle is an
 * albedo, not a glow — the round 5 "translucent square" was an additive sheet exactly like
 * the one this deliberately is not.
 */
function wetPatches(k, api) {
  const rng = api.rng;
  const puddle = (x, z, w, d, ry) => {
    k.quad(w, d, x, api.padY + 0.012, z, D.wet, ry, -Math.PI * 0.5);
    k.quad(w * 0.42, d * 0.36, x + rng.range(-0.2, 0.2), api.padY + 0.016, z + rng.range(-0.2, 0.2),
      D.wetCore, ry + rng.range(-0.4, 0.4), -Math.PI * 0.5);
  };
  puddle(2.9, 0.0, 4.6, 3.1, 0.22);          // the big one under the middle strip light
  puddle(-2.6, -0.9, 3.0, 2.2, -0.5);
  puddle(4.4, 3.4, 2.2, 1.6, 0.9);
  puddle(-3.4, 5.6, 1.9, 1.3, 0.3);          // out from under the canopy, by the drums
  puddle(-7.6, -5.4, 2.6, 1.8, -0.25);       // in front of the shop, catching the doorway
  // the drip line off the canopy fascia: a row of small wet marks where the roof sheds
  for (let i = 0; i < 11; i++) {
    const x = -6.0 + i * 1.2;
    k.quad(rng.range(0.34, 0.62), rng.range(0.24, 0.44), x, api.padY + 0.011, 4.9 + rng.range(-0.2, 0.2),
      D.wet, rng.range(0, 3), -Math.PI * 0.5);
  }
}

/**
 * THE CAR THAT DID NOT GET AWAY. Half-parked past the pumps with the driver's door standing
 * open, the interior dark, one wheel off the apron. It is the biggest silhouette in the
 * forecourt at eye height, which is what the forecourt did not have.
 */
function abandonedCar(k, api) {
  const cx = -1.6, cz = -8.8, yaw = 0.42;
  const cy = Math.cos(yaw), sy = Math.sin(yaw);
  const put = (lx, lz) => [cx + lx * cy + lz * sy, cz - lx * sy + lz * cy];
  const g = groundY(api, cx, cz);
  // body: sill slab, cabin, bonnet, boot
  k.box(1.86, 0.52, 4.30, cx, g + 0.62, cz, D.paint, yaw);
  k.box(1.66, 0.62, 2.10, cx, g + 1.18, cz - 0.10, D.paint, yaw);
  k.box(1.80, 0.22, 1.30, cx, g + 0.94, cz + 1.62, D.paint, yaw);        // bonnet
  k.box(1.78, 0.26, 1.10, cx, g + 0.96, cz - 1.68, D.paint, yaw);        // boot lid
  // glass: dark, so the cabin is a hole and not a highlight
  {
    const [wx, wz] = put(0, 0.98);
    k.box(1.52, 0.50, 0.06, wx, g + 1.22, wz, C.glass, yaw);             // windscreen
    const [rx, rz] = put(0, -1.14);
    k.box(1.48, 0.46, 0.06, rx, g + 1.22, rz, C.glass, yaw);
  }
  // wheels, and the near-front one up on the apron lip
  for (const [wx0, wz0, lift] of [[-0.86, 1.34, 0.10], [0.86, 1.34, 0], [-0.86, -1.32, 0], [0.86, -1.32, 0]]) {
    const [wx, wz] = put(wx0, wz0);
    k.cyl(0.34, 0.34, 0.22, 10, wx, g + 0.34 + lift, wz, D.tyre, yaw, 0, Math.PI * 0.5);
    k.cyl(0.16, 0.16, 0.24, 8, wx, g + 0.34 + lift, wz, D.chrome, yaw, 0, Math.PI * 0.5);
  }
  // THE OPEN DOOR. Hung off the driver's side and swung out 62 degrees, which is the read:
  // a shut car is parked, an open one is left.
  {
    const [hx, hz] = put(-0.93, 0.42);
    const a = yaw - 1.08;
    k.box(0.09, 0.98, 1.26, hx + Math.sin(a) * 0.63, g + 0.86, hz + Math.cos(a) * 0.63, D.paint, a);
    k.box(0.06, 0.34, 1.06, hx + Math.sin(a) * 0.66, g + 1.30, hz + Math.cos(a) * 0.66, C.glass, a);
    api.emit({
      kind: 'obb', x: hx + Math.sin(a) * 0.63, z: hz + Math.cos(a) * 0.63,
      halfX: 0.09, halfZ: 0.63, yaw: a, y0: g, y1: g + 1.36, tag: 'metal', climbable: false,
    });
  }
  // mirrors and a bumper, so the shape is a car and not a loaf
  for (const s of [-1, 1]) {
    const [mx, mz] = put(s * 1.02, 0.86);
    k.box(0.22, 0.13, 0.10, mx, g + 1.24, mz, D.paint, yaw);
  }
  k.box(1.88, 0.16, 0.16, cx + sy * 2.20, g + 0.60, cz + cy * 2.20, D.chrome, yaw);
  // the body collider, and the two it is standing over
  api.emit({ kind: 'obb', x: cx, z: cz, halfX: 0.95, halfZ: 2.18, yaw, y0: g - 0.3, y1: g + 1.52, tag: 'metal', standable: true, climbable: false });
  // its headlights are OUT. A dead lamp is a solid, not a pane.
  for (const s of [-1, 1]) {
    const [lx, lz] = put(s * 0.62, 2.16);
    k.cyl(0.16, 0.16, 0.05, 10, lx, g + 0.92, lz, C.glass, yaw, Math.PI * 0.5, 0);
  }
}

/** A crate off the back of something, and its tins across the apron. */
function spilledCrate(k, api) {
  const rng = api.rng;
  const cx = -7.9, cz = -4.85;
  const g = groundY(api, cx, cz);
  // the crate on its side, slats showing
  k.box(0.86, 0.56, 0.62, cx, g + 0.30, cz, D.cardboard, 0.34, 0, Math.PI * 0.5);
  for (let i = 0; i < 3; i++) k.box(0.88, 0.03, 0.09, cx, g + 0.16 + i * 0.22, cz - 0.30, D.timber, 0.34);
  api.emit({ kind: 'obb', x: cx, z: cz, halfX: 0.44, halfZ: 0.32, yaw: 0.34, y0: g - 0.2, y1: g + 0.58, tag: 'wood', standable: true });
  // the tins, rolled out toward the pumps. Two are on their sides, one still stands.
  const tins = [[0.62, -0.46], [1.28, -0.16], [1.94, -0.62], [2.66, 0.12], [3.30, -0.44], [1.02, 0.58], [2.20, 0.86]];
  for (let i = 0; i < tins.length; i++) {
    const x = cx + tins[i][0], z = cz + tins[i][1];
    const gy = groundY(api, x, z);
    const upright = i === 3;
    if (upright) {
      k.cyl(0.048, 0.048, 0.115, 9, x, gy + 0.058, z, D.tin);
      k.box(0.098, 0.052, 0.098, x, gy + 0.058, z, D.label, rng.range(0, 3));
    } else {
      k.cyl(0.048, 0.048, 0.115, 9, x, gy + 0.048, z, D.tin, rng.range(0, 3), 0, Math.PI * 0.5);
    }
  }
}

/** The air line, on a reel bolted to the shop's front wall, its hose coiled on the ground. */
function hoseReel(k, api) {
  const x = -6.35, z = -3.30, y = api.padY + 1.62;
  k.box(0.16, 0.30, 0.16, x, y, z + 0.10, D.conduit);                       // the bracket
  k.cyl(0.30, 0.30, 0.24, 14, x, y, z - 0.10, C.rust, 0, 0, Math.PI * 0.5); // the drum
  k.cyl(0.34, 0.34, 0.03, 14, x, y, z - 0.23, D.conduit, 0, 0, Math.PI * 0.5);
  k.cyl(0.34, 0.34, 0.03, 14, x, y, z + 0.02, D.conduit, 0, 0, Math.PI * 0.5);
  api.emit({ kind: 'obb', x, z: z - 0.10, halfX: 0.34, halfZ: 0.20, yaw: 0, y0: y - 0.36, y1: y + 0.36, tag: 'metal', climbable: false });
  // the hose: a drop from the reel and then three loose coils on the ground
  k.cyl(0.028, 0.028, 1.30, 5, x, api.padY + 0.72, z - 0.28, C.dark, 0, 0, 0.18);
  for (let i = 0; i < 3; i++) {
    const r = 0.30 + i * 0.11;
    const seg = 12;
    for (let j = 0; j < seg; j++) {
      const a = (j / seg) * Math.PI * 2;
      k.box(0.055, 0.048, r * 0.55, x + 0.30 + Math.cos(a) * r, api.padY + 0.026 + i * 0.05, z - 0.60 + Math.sin(a) * r,
        C.dark, -a);
    }
  }
}

/** Two wheelie bins, one standing and one over, and the black bags that came out of it. */
function wheelieBins(k, api) {
  const rng = api.rng;
  // upright, lid shut
  {
    const x = 1.35, z = 5.35, g = groundY(api, x, z);
    k.box(0.62, 0.98, 0.74, x, g + 0.52, z, D.bin, 0.12);
    k.box(0.66, 0.07, 0.78, x, g + 1.04, z, D.binLid, 0.12);
    k.cyl(0.10, 0.10, 0.06, 8, x - 0.24, g + 0.10, z - 0.32, D.tyre, 0, 0, Math.PI * 0.5);
    k.cyl(0.10, 0.10, 0.06, 8, x + 0.24, g + 0.10, z - 0.32, D.tyre, 0, 0, Math.PI * 0.5);
    api.emit({ kind: 'obb', x, z, halfX: 0.33, halfZ: 0.39, yaw: 0.12, y0: g - 0.2, y1: g + 1.08, tag: 'metal', standable: true });
  }
  // over on its side, lid open, bags out
  {
    const x = 2.55, z = 6.05, g = groundY(api, x, z), a = -0.62;
    k.box(0.62, 0.98, 0.74, x, g + 0.36, z, D.bin, a, 0, Math.PI * 0.5);
    k.box(0.66, 0.07, 0.78, x + Math.cos(a) * 0.56, g + 0.10, z - Math.sin(a) * 0.56, D.binLid, a, 0.4, 0);
    api.emit({ kind: 'obb', x, z, halfX: 0.50, halfZ: 0.36, yaw: a, y0: g - 0.2, y1: g + 0.72, tag: 'metal', standable: true });
    for (let i = 0; i < 4; i++) {
      const bx = x + rng.range(0.7, 2.0), bz = z + rng.range(-0.9, 0.9);
      const bg = groundY(api, bx, bz);
      k.cyl(0.24, 0.20, 0.42, 8, bx, bg + 0.20, bz, C.dark, rng.range(0, 3), rng.range(-0.2, 0.2), rng.range(-0.2, 0.2));
    }
  }
}

/** A pallet stack past the phone box, leaning, with a strap round it. */
function palletStack(k, api) {
  const x = -16.9, z = 2.30, g = groundY(api, x, z);
  for (let i = 0; i < 7; i++) {
    const lean = i * 0.028;
    k.box(1.22, 0.09, 1.02, x + lean * 0.6, g + 0.06 + i * 0.155, z + lean, D.timber, 0.08 + i * 0.012);
    for (const bx of [-0.46, 0, 0.46]) {
      k.box(0.16, 0.06, 1.02, x + lean * 0.6 + bx, g + 0.02 + i * 0.155, z + lean, C.wood, 0.08 + i * 0.012);
    }
  }
  api.emit({ kind: 'obb', x: x + 0.1, z: z + 0.1, halfX: 0.63, halfZ: 0.54, yaw: 0.12, y0: g - 0.2, y1: g + 1.16, tag: 'wood', standable: true });
  // one pallet dropped flat beside it, and a couple of loose boards
  k.box(1.22, 0.09, 1.02, x + 1.55, g + 0.05, z - 1.30, D.timber, -0.5);
  api.emit({ kind: 'obb', x: x + 1.55, z: z - 1.30, halfX: 0.63, halfZ: 0.54, yaw: -0.5, y0: g - 0.2, y1: g + 0.10, tag: 'wood', standable: true });
  k.box(1.60, 0.04, 0.16, x + 0.9, g + 0.03, z + 1.70, C.wood, 0.9);
  k.box(1.40, 0.04, 0.14, x + 1.4, g + 0.03, z + 1.95, C.wood, 0.6);
}

/**
 * THE SERVICE BAY — the Filling Station finally has a second authored volume instead of
 * ending at one little shop and a canopy.  It is a real open garage: a player can walk
 * through the raised shutter, circle the car on the lift, read the workbench and tool wall,
 * and come back out into the forecourt.  The broad wall/roof surfaces inherit the shared
 * weather maps in places.js; the ribs, patched sheets and exposed block plinth give that
 * texture enough physical silhouette to survive the dark.
 *
 * It sits west of the shop, clear of the refuge door, breaker, phone box and roof-climb
 * crates.  The open -Z face points at the same arrival side as the shop doorway and old
 * roadside sign.  Nothing in here is a fake completion fixture or a promoted shed.
 */
function serviceBay(k, api) {
  const x = -23.0, z = -0.2, w = 10.2, d = 9.6, h = 4.65;
  const hw = w * 0.5, hd = d * 0.5, y = api.padY;
  const wall = D.enamel, rib = C.rust, block = [0.102, 0.096, 0.086];

  // A dark block plinth, three corrugated walls, and a completely open road-facing bay.
  k.box(w, 0.72, 0.48, x, y + 0.36, z + hd, block);
  k.box(0.48, 0.72, d, x - hw, y + 0.36, z, block);
  k.box(0.48, 0.72, d, x + hw, y + 0.36, z, block);
  k.box(w, h - 0.58, 0.34, x, y + 0.58 + (h - 0.58) * 0.5, z + hd, wall);
  k.box(0.34, h - 0.58, d, x - hw, y + 0.58 + (h - 0.58) * 0.5, z, wall);
  k.box(0.34, h - 0.58, d, x + hw, y + 0.58 + (h - 0.58) * 0.5, z, wall);
  for (const [cx, cz, hx, hz] of [
    [x, z + hd, hw, 0.24], [x - hw, z, 0.24, hd], [x + hw, z, 0.24, hd],
  ]) api.emit({ kind: 'obb', x: cx, z: cz, halfX: hx, halfZ: hz, yaw: 0,
    y0: y - 0.35, y1: y + h, tag: 'wall' });

  // Corrugation is geometry, not a colour shift: 52 narrow proud ribs plus rusted footings.
  for (let i = 0; i < 17; i++) {
    const rx = x - hw + 0.32 + i * (w - 0.64) / 16;
    k.box(0.075, h - 0.72, 0.08, rx, y + 0.72 + (h - 0.72) * 0.5,
      z + hd - 0.20, i % 5 === 0 ? rib : D.conduit);
  }
  for (const sx of [-1, 1]) for (let i = 0; i < 18; i++) {
    const rz = z - hd + 0.28 + i * (d - 0.56) / 17;
    k.box(0.08, h - 0.72, 0.075, x + sx * (hw - 0.20),
      y + 0.72 + (h - 0.72) * 0.5, rz, i % 6 === 0 ? rib : D.conduit);
  }
  for (let i = 0; i < 9; i++) {
    const rx = x - hw + 0.55 + i * 1.12;
    k.box(0.72, 0.28, 0.07, rx, y + 0.88 + (i % 3) * 0.08, z + hd - 0.25,
      i % 2 ? C.rust : D.liningUp, (i % 2 ? 1 : -1) * 0.06);
  }

  // Deep pitched roof, patched in alternating strips, plus two crooked turbine vents.
  k.gable(w + 0.75, d + 0.80, y + h, 1.75, x, 0, z, C.slate, 0);
  for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) {
    const px = x + sx * (1.0 + i * 0.82);
    k.box(0.74, 0.055, d - 0.8, px, y + h + 0.63 + (4 - i) * 0.20,
      z + (i % 2 ? 0.10 : -0.10), i % 2 ? D.conduit : C.rust, 0, 0, -sx * 0.32);
  }
  for (const vx of [x - 2.6, x + 2.15]) {
    k.cyl(0.18, 0.18, 1.25, 10, vx, y + h + 1.70, z + 1.2, D.conduit);
    k.tube(0.48, 0.34, 0.22, 12, vx, y + h + 2.30, z + 1.2, C.rust);
    for (let i = 0; i < 6; i++) {
      const a = i * Math.PI / 3;
      k.box(0.07, 0.03, 0.64, vx + Math.sin(a) * 0.27, y + h + 2.42,
        z + 1.2 + Math.cos(a) * 0.27, D.conduit, -a);
    }
  }

  // Raised segmented shutter and a battered frame: the opening reads before the contents.
  k.box(w + 0.25, 0.36, 0.42, x, y + h - 0.12, z - hd, C.rust);
  for (const sx of [-1, 1]) k.box(0.42, h, 0.48, x + sx * hw, y + h * 0.5, z - hd, C.rust);
  for (let i = 0; i < 4; i++) {
    k.box(w - 1.0, 0.58, 0.12, x, y + h - 0.48 - i * 0.57, z - hd + 0.30 + i * 0.16,
      i % 2 ? D.conduit : D.enamel, 0, -0.18);
    for (let j = 0; j < 5; j++) k.box(0.045, 0.52, 0.13,
      x - 3.5 + j * 1.75, y + h - 0.48 - i * 0.57, z - hd + 0.23 + i * 0.16, C.rust);
  }

  // A two-post lift and a half-repaired estate car create a deliberate interior target.
  for (const lx of [-2.35, 2.35]) {
    k.box(0.34, 3.85, 0.52, x + lx, y + 1.93, z + 0.25, C.rust);
    k.box(0.62, 0.14, 2.7, x + lx * 0.52, y + 1.05, z + 0.25, D.conduit, lx > 0 ? -0.34 : 0.34);
    api.emit({ kind: 'obb', x: x + lx, z: z + 0.25, halfX: 0.22, halfZ: 0.32,
      yaw: 0, y0: y - 0.2, y1: y + 3.85, tag: 'metal', climbable: false });
  }
  k.box(5.10, 0.28, 0.42, x, y + 3.76, z + 0.25, D.conduit);
  k.box(1.78, 0.46, 4.18, x, y + 1.36, z + 0.35, [0.080, 0.060, 0.045], 0.04);
  k.box(1.58, 0.56, 1.82, x, y + 1.82, z + 0.15, C.slate, 0.04);
  for (const [sx, sz] of [[-0.86, -1.30], [0.86, -1.30], [-0.86, 1.28]])
    k.cyl(0.30, 0.30, 0.20, 10, x + sx, y + 1.14, z + 0.35 + sz, D.tyre, 0, 0, Math.PI * 0.5);
  // Missing front wheel, hub and a wheel on the floor explain why it never left.
  k.cyl(0.14, 0.14, 0.24, 10, x + 0.86, y + 1.14, z + 1.63, C.rust, 0, 0, Math.PI * 0.5);
  k.cyl(0.34, 0.34, 0.22, 10, x + 2.95, y + 0.34, z + 1.82, D.tyre, 0.4, 0, Math.PI * 0.5);
  api.emit({ kind: 'obb', x, z: z + 0.35, halfX: 0.95, halfZ: 2.12, yaw: 0.04,
    y0: y + 0.85, y1: y + 2.18, tag: 'metal', standable: true, climbable: false });

  // Workbench, pegboard and individually silhouetted tools on the back wall.
  k.box(4.30, 0.86, 0.78, x - 2.45, y + 0.43, z + hd - 0.75, D.timber);
  k.box(4.45, 1.48, 0.11, x - 2.45, y + 1.62, z + hd - 0.31, D.liningUp);
  for (let i = 0; i < 34; i++) k.cyl(0.018, 0.018, 0.045, 5,
    x - 4.35 + (i % 9) * 0.47, y + 1.02 + ((i / 9) | 0) * 0.36,
    z + hd - 0.23, D.conduit, 0, Math.PI * 0.5, 0);
  const tools = [[-3.8, 1.65, 0.62, 0.08], [-3.0, 1.78, 0.48, -0.18], [-2.0, 1.52, 0.72, 0.20], [-1.2, 1.72, 0.54, -0.05]];
  for (const [tx, ty, len, lean] of tools) {
    k.box(0.07, len, 0.05, x + tx, y + ty, z + hd - 0.20, C.rust, 0, 0, lean);
    k.box(0.30, 0.10, 0.07, x + tx + Math.sin(lean) * len * 0.42,
      y + ty + Math.cos(lean) * len * 0.42, z + hd - 0.20, D.conduit, 0, 0, lean);
  }
  api.emit({ kind: 'obb', x: x - 2.45, z: z + hd - 0.75, halfX: 2.20, halfZ: 0.42,
    yaw: 0, y0: y - 0.2, y1: y + 0.9, tag: 'wood', standable: true });

  // Tyre rack and oil drums make the outside flank dense without blocking the refuge route.
  const rackX = x - hw - 1.25, rackZ = z + 0.9;
  for (const sx of [-0.52, 0.52]) k.box(0.09, 2.05, 0.09, rackX + sx, y + 1.02, rackZ, C.rust);
  for (const yy of [0.48, 1.25, 1.92]) {
    k.box(1.25, 0.08, 0.08, rackX, y + yy, rackZ, C.rust);
    for (const lx of [-0.36, 0, 0.36]) k.tube(0.28, 0.17, 0.15, 10,
      rackX + lx, y + yy + 0.18, rackZ, D.tyre, 0, Math.PI * 0.5, 0);
  }
  api.emit({ kind: 'obb', x: rackX, z: rackZ, halfX: 0.72, halfZ: 0.34, yaw: 0,
    y0: y - 0.2, y1: y + 2.15, tag: 'metal', climbable: false });
  for (let i = 0; i < 4; i++) {
    const dx = x - hw - 1.05 + (i & 1) * 0.82, dz = z - 2.5 - ((i / 2) | 0) * 0.78;
    k.cyl(0.31, 0.31, 0.82, 10, dx, y + 0.41, dz, i % 2 ? C.rust : D.enamel);
    k.cyl(0.25, 0.25, 0.025, 10, dx, y + 0.83, dz, D.conduit);
    api.emit({ kind: 'circle', x: dx, z: dz, r: 0.33, y0: y - 0.2, y1: y + 0.84,
      tag: 'metal', standable: true });
  }
}

/**
 * A broken round roadside crown built around the old rectangular price face.  At road scale
 * it gives the start a unique outline: halo, twin uprights and one fallen lightning blade,
 * instead of another anonymous white board on a pole.  The open ring never becomes a bright
 * sheet and its mapped metal actually shows rust/grime as the player closes in.
 */
function roadsideCrown(k, api) {
  const x = 6.6, z = -7.4, y = api.padY;
  for (const sx of [-1, 1]) {
    k.box(0.20, 11.3, 0.20, x + sx * 1.36, y + 5.65, z + 0.08, C.rust, 0, 0, sx * 0.025);
    k.box(0.12, 3.2, 0.12, x + sx * 0.72, y + 9.55, z + 0.08, D.conduit, 0, 0, -sx * 0.52);
  }
  const halo = new THREE.TorusGeometry(2.10, 0.16, 7, 28);
  k.at(halo, C.rust, x, y + 11.55, z + 0.06, 0, 0, -0.08);
  const inner = new THREE.TorusGeometry(1.54, 0.055, 6, 28);
  k.at(inner, D.conduit, x, y + 11.55, z + 0.055, 0, 0, -0.08);
  // Lightning-shaped slash through the ring, with a visibly broken lower segment.
  k.box(0.34, 2.45, 0.20, x - 0.34, y + 12.12, z + 0.02, C.rust, 0, 0, -0.42);
  k.box(0.34, 1.65, 0.20, x + 0.32, y + 10.76, z + 0.02, C.rust, 0, 0, -0.42);
  k.box(0.14, 0.85, 0.14, x + 1.25, y + 9.15, z + 0.08, D.conduit, 0, 0, 0.92);
  api.emit({ kind: 'circle', x, z, r: 1.65, y0: y - 0.3, y1: y + 11.4,
    tag: 'metal', climbable: false });
}

/**
 * THE PUMPS STOP BEING THE BRIGHTEST THING IN THE FRAME.
 *
 * NEXT.md B6, and the brief for this lane in one sentence: "the pumps are the brightest
 * objects in the frame, which is backwards for a night game." MEASURED
 * (tests/shots/station-b0.png): two C.plaster slabs at 0.265 linear, the two lightest large
 * shapes in the opening frame, brighter than the ground, the shop and the canopy.
 *
 * sites.js owns the pumps and this lane does not, so they are CLAD rather than repainted: a
 * shroud box 15 mm bigger than the plaster body on every side, in dark enamel, which hides
 * it completely (both materials are DoubleSide, so an enclosing box is an enclosing box).
 * The display, the nozzle and the boot still stand proud of it and still read, and the pump
 * keeps its collider, its kerb and its standable top — nothing in sites.js moves.
 */
function cladPumps(k, api) {
  const y = api.padY;
  for (const iz of [-2.4, 2.4]) {
    for (const px of [-0.9, 0.9]) {
      // the shroud, 0.78 x 1.56 x 0.58 over a 0.75 x 1.55 x 0.55 body
      k.box(0.78, 1.56, 0.58, px, y + 1.05, iz, D.pump, 0);
      // a brand band across the top third and a kick plate at the bottom: three horizontals,
      // so a dark box is a machine and not a monolith
      k.box(0.80, 0.16, 0.60, px, y + 1.62, iz, D.pumpBand, 0);
      k.box(0.80, 0.05, 0.60, px, y + 1.52, iz, C.dark, 0);
      k.box(0.80, 0.14, 0.60, px, y + 0.36, iz, C.dark, 0);
      // THE FACES. The shroud swallows sites.js's own display and nozzle (they stood 0.02
      // proud of a body it now covers), so they are re-cut on it — on BOTH z faces, because
      // the two islands face opposite ways and a pump you can only read from one side is
      // half a pump. The display is the palest thing on the machine and it is 0.14 m^2.
      for (const s of [-1, 1]) {
        k.box(0.58, 0.34, 0.03, px, y + 1.40, iz + s * 0.30, C.dark, 0);
        k.box(0.50, 0.26, 0.02, px, y + 1.40, iz + s * 0.315, D.display, 0);
        k.box(0.44, 0.03, 0.01, px, y + 1.33, iz + s * 0.325, C.dark, 0);
        k.box(0.10, 0.34, 0.14, px + 0.27, y + 0.98, iz + s * 0.32, C.dark, 0);   // the nozzle
        k.box(0.14, 0.08, 0.10, px + 0.27, y + 1.16, iz + s * 0.31, D.conduit, 0); // its holster
      }
      // the cap over it, and the hose hook on the outboard side
      k.box(0.86, 0.06, 0.66, px, y + 1.86, iz, C.slate, 0);
      k.cyl(0.028, 0.028, 0.18, 6, px + (px > 0 ? 0.42 : -0.42), y + 1.30, iz, D.conduit, 0, 0, Math.PI * 0.5);
      // the hose, off the nozzle and down to the kerb in three sags
      const nz = iz - 0.34;
      for (let i = 0; i < 5; i++) {
        const t = i / 4;
        const hx = px + 0.26 - t * 0.10;
        const hy = y + 0.95 - t * t * 0.62;
        const hz = nz - t * 0.26;
        k.cyl(0.026, 0.026, 0.28, 5, hx, hy, hz, C.dark, 0, 0.9 - t * 0.5, 0.25);
      }
    }
    // the island's own kerb face, darkened, so the pale plaster kerb is not a light strip
    k.box(3.64, 0.32, 1.54, 0, y + 0.15, iz, D.pump, 0);
  }
}

/** The A-board that used to say the price, face down in the forecourt. */
function fallenBoard(k, api) {
  const x = 3.35, z = -2.65, g = groundY(api, x, z), a = 0.78;
  k.box(0.66, 0.05, 0.98, x, g + 0.055, z, C.plank, a, 0.06, 0);
  k.box(0.62, 0.02, 0.90, x + 0.03, g + 0.085, z + 0.02, C.dark, a, 0.06, 0);   // the wiped face
  k.box(0.66, 0.05, 0.98, x - 0.30, g + 0.20, z + 0.34, C.plank, a - 0.2, -0.55, 0);  // the other leaf, half up
  api.emit({ kind: 'obb', x, z, halfX: 0.42, halfZ: 0.58, yaw: a, y0: g - 0.2, y1: g + 0.28, tag: 'wood', standable: true });
}

/**
 * THE BLANK WALL. sites.js gives the shop's east end (x -5.5, facing the pumps) no feature at
 * all, and it is the wall you look straight at from the spawn — tests/shots/station-b1.png is
 * 40% one flat plaster plane. This is what stands against it, and the breaker (refuge.js) is
 * bolted to the middle of it.
 */
function eastWall(k, api) {
  const wx = -5.28;      // the wall face

  /* ------------------------------------------------------------------------
     THE INTAKE PANEL — the fix for NEXT.md B2, applied where it works.

     MEASURED 2026-09-03, standing 1.8 m from the breaker with the torch on
     (tools/station-look.mjs, tests/shots/station-breaker-torch.png): mean 160.1,
     ZERO pixels below 8, and 67.3% of the frame over 150. The board itself is
     0.010 linear and it STILL washed out, because what blows out is not the
     fixture — it is the 0.265 plaster around it, whose bloom paints over
     everything inside the hotspot and whose highlights the grade's shoulder
     flattens to one plate. Round 6 learned this at the Drowned Light and its
     answer was a backboard behind the head; the answer at this scale is the
     same one, sized to the hotspot instead of to the fixture.

     2.90 x 2.40 m at 0.016 linear — sixteen times darker than the wall — so the
     torch lands on almost nothing and the brass handle is the only bright thing
     left in the cone. Nothing here gets brighter. The background gets darker.
     ------------------------------------------------------------------------ */
  {
    const b = ANCHORS.breaker;
    const cy = api.padY + 1.72, W = 2.90, H = 2.40;
    // CORRUGATED, not flat. MEASURED again after the flat first cut: the panel dropped the
    // frame from mean 160 to 118 and >200 from 19.9% to 2.4%, but a flat sheet whose normal
    // points straight back down the torch beam still takes the full N.L, so 47% of the frame
    // was over 150. Twenty-four ribs at +-0.62 rad give every other strip a cosine of 0.81
    // and the whole surface a hard vertical rhythm, which is a VALUE STRUCTURE rather than
    // an average — and structure is what survives an exposure this file cannot change
    // (CFG.lights.torch is pinned by ART 0.6; see docs/ROUND-7/HANDOFF-A.md).
    {
      const ribs = 24, rw = W / ribs;
      for (let i = 0; i < ribs; i++) {
        const rz = b.z - W * 0.5 + rw * (i + 0.5);
        k.box(0.035, H, rw * 1.12, wx + 0.030, cy, rz, D.panel, (i % 2 ? 1 : -1) * 0.62);
      }
    }
    // the angle iron round its edge: four hard lines, so a black rectangle reads as a made
    // thing and not as a hole cut in the building
    k.box(0.05, 0.09, W + 0.08, wx + 0.045, cy + H * 0.5, b.z, C.rust, 0);
    k.box(0.05, 0.09, W + 0.08, wx + 0.045, cy - H * 0.5, b.z, C.rust, 0);
    for (const s of [-1, 1]) k.box(0.05, H + 0.09, 0.09, wx + 0.045, cy, b.z + s * W * 0.5, C.rust, 0);
    // two braces and a row of fixings across it, at a value between the panel and the iron
    for (const s of [-1, 1]) {
      const len = Math.hypot(W - 0.5, H - 0.5);
      const g = new THREE.BoxGeometry(0.055, 0.07, len);
      g.rotateX(s * Math.atan2(H - 0.5, W - 0.5));
      g.translate(wx + 0.040, cy, b.z);
      k.push(g, D.liningUp);
    }
    for (let i = 0; i < 7; i++) {
      k.cyl(0.022, 0.022, 0.04, 6, wx + 0.052, cy + H * 0.5 - 0.10, b.z - W * 0.5 + 0.14 + i * 0.44, C.rust, 0, 0, Math.PI * 0.5);
      k.cyl(0.022, 0.022, 0.04, 6, wx + 0.052, cy - H * 0.5 + 0.10, b.z - W * 0.5 + 0.14 + i * 0.44, C.rust, 0, 0, Math.PI * 0.5);
    }
    // a drip hood over the whole panel, so it reads as weathered kit and throws a shadow
    k.box(0.34, 0.07, W + 0.20, wx + 0.17, cy + H * 0.5 + 0.14, b.z, C.slate, 0);
  }

  // an ice cabinet, its glass dead, wedged against the wall south of the breaker
  {
    const z = -1.95, g = groundY(api, wx + 0.55, z);
    k.box(0.72, 1.28, 1.24, wx + 0.40, g + 0.64, z, D.enamel, 0);
    k.box(0.60, 0.90, 1.06, wx + 0.14, g + 0.72, z, C.glass, Math.PI * 0.5);   // the door glass
    k.box(0.78, 0.09, 1.30, wx + 0.40, g + 1.32, z, C.slate, 0);
    api.emit({ kind: 'obb', x: wx + 0.40, z, halfX: 0.36, halfZ: 0.62, yaw: 0, y0: g - 0.2, y1: g + 1.36, tag: 'metal', standable: true });
  }
  // a bottle cage north of it, gas bottles inside
  {
    const z = 2.55, g = groundY(api, wx + 0.55, z);
    for (const bz of [-0.45, 0, 0.45]) {
      k.cyl(0.155, 0.155, 0.86, 10, wx + 0.42, g + 0.43, z + bz, C.rust);
      k.cyl(0.06, 0.06, 0.10, 6, wx + 0.42, g + 0.91, z + bz, C.dark);
    }
    for (let i = 0; i < 6; i++) {
      k.box(0.90, 0.035, 0.035, wx + 0.44, g + 0.14 + i * 0.17, z - 0.72, D.conduit, Math.PI * 0.5);
      k.box(0.90, 0.035, 0.035, wx + 0.44, g + 0.14 + i * 0.17, z + 0.72, D.conduit, Math.PI * 0.5);
    }
    k.box(0.04, 1.05, 1.50, wx + 0.86, g + 0.53, z, D.conduit);
    api.emit({ kind: 'obb', x: wx + 0.44, z, halfX: 0.44, halfZ: 0.76, yaw: 0, y0: g - 0.2, y1: g + 1.05, tag: 'metal', standable: true });
  }
  // THE CONDUIT off the breaker. It runs up the wall from the board to the eaves and along
  // the gable, which is what tells you the board is the thing the building is plugged into.
  const b = ANCHORS.breaker;
  k.box(0.055, 1.90, 0.055, wx + 0.03, api.padY + b.y + 0.62 + 0.95, b.z, D.conduit);
  for (const yy of [0.9, 1.7, 2.5]) k.box(0.10, 0.05, 0.10, wx + 0.05, api.padY + b.y + yy, b.z, D.conduit);
  k.box(0.055, 0.055, 3.10, wx + 0.03, api.padY + 3.44, b.z + 1.55, D.conduit);
  // a painted band and a stencilled number: three horizontals to break 3.6 m of plaster
  k.quad(6.60, 0.30, wx + 0.012, api.padY + 0.42, 0.5, C.slate, Math.PI * 0.5);
  k.quad(6.60, 0.06, wx + 0.016, api.padY + 0.60, 0.5, C.dark, Math.PI * 0.5);
  k.quad(0.62, 0.44, wx + 0.012, api.padY + 2.55, -2.20, C.slate, Math.PI * 0.5);
  // a downpipe on the far corner, and its stain
  k.cyl(0.075, 0.075, 3.55, 8, wx + 0.02, api.padY + 1.78, 3.62, D.conduit);
  k.quad(0.26, 1.60, wx + 0.012, api.padY + 0.80, 3.62, C.slate, Math.PI * 0.5);
  // two crates and a stack of newspapers against the wall, at knee height
  {
    const g = groundY(api, wx + 0.45, -3.4);
    k.box(0.62, 0.44, 0.52, wx + 0.42, g + 0.22, -3.42, D.cardboard, 0.10);
    k.box(0.58, 0.40, 0.48, wx + 0.40, g + 0.62, -3.38, D.cardboard, -0.22);
    api.emit({ kind: 'obb', x: wx + 0.42, z: -3.40, halfX: 0.32, halfZ: 0.28, yaw: 0, y0: g - 0.2, y1: g + 0.84, tag: 'wood', standable: true });
  }
}

/* ==========================================================================
   THE COZY ROOM — the one interior in the county allowed to feel safe.

   Value structure INVERTS here (ART 0.3): outside is the dark, and the warm
   thing in the frame is in this room. The lamps themselves are refuge.js's —
   they are dead until the breaker is thrown — so everything below is the
   fitting, never the light. A shade with no bulb reads as a shade.
   ========================================================================== */
function shopInterior(k, api) {
  const rng = api.rng;
  const y = api.padY;
  const L = ANCHORS.lamps;

  /* ------------------------------------------------------------------------
     THE LINING AND THE CEILING. See D.lining: a lamp in a plaster box put 23.5%
     of the frame over 150. Boarding the room out drops what the lamp lands on
     from 0.265 to 0.062 and gives the walls horizontal structure at the same
     time, which is the ART 0.2 band the whole frame is short of. The ceiling
     also stops the moon reaching the floor, so the room is genuinely dark
     BEFORE the breaker — which is the only way the lamps coming on can be an
     event rather than a change of tint.
     ------------------------------------------------------------------------ */
  {
    const X0 = -15.28, X1 = -5.72, Z0 = -2.78, Z1 = 3.78;
    const TOP = 2.90, BH = 0.245;
    const nB = Math.round(TOP / BH);
    // a run of boards along one wall. `axis` 'x' means the wall faces +/-X.
    const run = (axis, at, a0, a1, sign) => {
      const len = a1 - a0, mid = (a0 + a1) * 0.5;
      for (let i = 0; i < nB; i++) {
        const by = y + BH * (i + 0.5);
        const col = i % 2 ? D.lining : D.liningUp;
        if (axis === 'x') k.box(0.035, BH * 0.94, len, at + sign * 0.02, by, mid, col, 0);
        else k.box(len, BH * 0.94, 0.035, mid, by, at + sign * 0.02, col, 0);
      }
      // the rail at the top of the boarding, and the skirting at the bottom
      if (axis === 'x') {
        k.box(0.06, 0.09, len, at + sign * 0.035, y + TOP + 0.04, mid, C.dark, 0);
        k.box(0.06, 0.14, len, at + sign * 0.035, y + 0.07, mid, C.dark, 0);
      } else {
        k.box(len, 0.09, 0.06, mid, y + TOP + 0.04, at + sign * 0.035, C.dark, 0);
        k.box(len, 0.14, 0.06, mid, y + 0.07, at + sign * 0.035, C.dark, 0);
      }
    };
    run('x', X0, Z0, Z1, 1);                       // the west end
    run('x', X1, Z0, Z1, -1);                      // the east end
    run('z', Z1, X0, X1, -1);                      // the back, toward the road
    run('z', Z0, X0, -11.70, 1);                   // the front, either side of the doorway
    run('z', Z0, -9.30, X1, 1);
    // the ceiling: boards across, with the flue's strip left out where it goes up
    const nP = 12, pd = (Z1 - Z0) / nP;
    for (let i = 0; i < nP; i++) {
      const pz = Z0 + pd * (i + 0.5);
      const clearFlue = Math.abs(pz - ANCHORS.lamps.stove.z) < pd * 0.75;
      const px0 = clearFlue ? -14.20 : X0;
      k.box(X1 - px0, 0.07, pd * 0.94, (px0 + X1) * 0.5, y + TOP + 0.12, pz, i % 2 ? D.ceiling : D.liningUp, 0);
    }
    // three joists under it, so the ceiling is not one plate
    for (const jz of [-1.4, 0.6, 2.6]) k.box(X1 - X0 - 0.1, 0.14, 0.10, (X0 + X1) * 0.5, y + TOP + 0.01, jz, C.dark, 0);
  }

  // ---- the bed. A mattress on pallets, a bag on the mattress, a rolled coat for a pillow.
  {
    const b = ANCHORS.bag;
    for (const px of [-0.55, 0.55]) {
      k.box(1.20, 0.10, 0.98, b.x + px * Math.cos(b.yaw), y + 0.05, b.z - px * Math.sin(b.yaw), D.timber, b.yaw);
    }
    k.box(2.06, 0.16, 0.94, b.x, y + 0.18, b.z, D.foam, b.yaw);
    // the bag itself: a body-sized roll with the lining turned back at the head
    k.box(1.94, 0.26, 0.78, b.x, y + 0.37, b.z, D.quilt, b.yaw);
    k.cyl(0.20, 0.20, 1.86, 8, b.x, y + 0.40, b.z + 0.30, D.quilt, b.yaw, 0, Math.PI * 0.5);
    k.cyl(0.19, 0.19, 1.86, 8, b.x, y + 0.40, b.z - 0.30, D.quilt, b.yaw, 0, Math.PI * 0.5);
    k.box(0.62, 0.14, 0.74, b.x - 0.74, y + 0.48, b.z, D.quiltIn, b.yaw, -0.35, 0);   // turned back
    k.cyl(0.17, 0.17, 0.62, 8, b.x - 0.86, y + 0.40, b.z, D.foam, b.yaw + Math.PI * 0.5, 0, Math.PI * 0.5);  // pillow
    // It is a floor, never a wall. y1 is 0.30, not the mattress's real 0.44: controller.js
    // STICK is 0.42 and anything BELOW it is walked over rather than climbed onto (sites.js's kerb note, measured in
    // round 5). At 0.44 the bed was a wall you could not step on and could not walk past,
    // and the bag was unreachable on foot. At 0.30 you walk onto the bed, which is the verb.
    api.emit({ kind: 'obb', x: b.x, z: b.z, halfX: 1.06, halfZ: 0.52, yaw: b.yaw, y0: y - 0.2, y1: y + 0.30, tag: 'cloth', standable: true, climbable: false });
    // a pair of boots at the foot, and a mug
    for (const s of [-1, 1]) k.box(0.11, 0.14, 0.29, b.x + 1.24, y + 0.07, b.z + s * 0.16, C.dark, b.yaw + 0.2 * s);
    k.cyl(0.045, 0.042, 0.09, 8, b.x + 1.16, y + 0.045, b.z - 0.52, D.enamel);
  }

  // ---- the crate beside the bed, with the lamp and the dead radio on it
  {
    const t = L.table;
    k.box(0.52, 0.62, 0.46, t.x, y + 0.31, t.z, D.timber, 0.06);
    api.emit({ kind: 'obb', x: t.x, z: t.z, halfX: 0.27, halfZ: 0.24, yaw: 0.06, y0: y - 0.2, y1: y + 0.62, tag: 'wood', standable: true });
    // the lamp: a base, a stem and a metal shade. The bulb inside it is refuge's.
    k.cyl(0.09, 0.10, 0.035, 10, t.x, y + 0.635, t.z, D.conduit);
    k.cyl(0.014, 0.014, 0.20, 6, t.x, y + 0.735, t.z, D.conduit);
    k.cone(0.145, 0.16, 12, t.x, y + 0.905, t.z, C.slate, 0, 0, 0);
    // the radio: a dark box with a dial that is not lit
    k.box(0.34, 0.20, 0.17, t.x + 0.02, y + 0.72, t.z - 0.62, D.timber, -0.30);
    k.quad(0.20, 0.07, t.x + 0.02, y + 0.74, t.z - 0.70, C.glass, -0.30);
    k.cyl(0.022, 0.022, 0.03, 8, t.x + 0.13, y + 0.66, t.z - 0.70, D.conduit, -0.30, Math.PI * 0.5, 0);
    k.cyl(0.006, 0.006, 0.54, 4, t.x - 0.14, y + 0.98, t.z - 0.58, D.chrome, 0, 0, 0.28);  // its aerial
  }

  // ---- the stove, and the flue up through the roof. The firebox glow is refuge's.
  {
    const s = L.stove;
    k.box(0.66, 0.76, 0.52, s.x, y + 0.38, s.z, D.stove, 0.04);
    k.box(0.76, 0.06, 0.60, s.x, y + 0.79, s.z, D.stove, 0.04);            // the hotplate
    k.cyl(0.075, 0.075, 2.66, 8, s.x, y + 2.14, s.z, D.stove);              // the flue
    k.box(0.24, 0.03, 0.24, s.x, y + 0.82, s.z, D.stove, 0.7);
    k.quad(0.30, 0.24, s.x, y + 0.46, s.z - 0.27, C.dark, 0.04);            // the firebox door
    k.cyl(0.018, 0.018, 0.12, 6, s.x + 0.13, y + 0.46, s.z - 0.29, D.chrome, 0.04, 0, Math.PI * 0.5);
    api.emit({ kind: 'obb', x: s.x, z: s.z, halfX: 0.38, halfZ: 0.30, yaw: 0.04, y0: y - 0.2, y1: y + 0.82, tag: 'metal', standable: true });
    // the log basket
    for (let i = 0; i < 7; i++) {
      k.cyl(0.055, 0.05, rng.range(0.28, 0.40), 6, s.x + 0.72 + rng.range(-0.10, 0.10),
        y + 0.06 + (i % 3) * 0.11, s.z + 0.46 + rng.range(-0.10, 0.10), C.wood,
        rng.range(0, 3), 0, Math.PI * 0.5);
    }
    k.tube(0.30, 0.30, 0.34, 10, s.x + 0.72, y + 0.17, s.z + 0.46, D.conduit);
    api.emit({ kind: 'circle', x: s.x + 0.72, z: s.z + 0.46, r: 0.32, y0: y - 0.2, y1: y + 0.34, tag: 'metal', standable: true });
  }

  // ---- the shelving on the west wall, WITH THE STOCK STILL ON IT
  {
    const sx = -14.92;
    for (const [sz, len] of [[0.20, 2.60], [3.00, 1.40]]) {
      for (let b = 0; b < 4; b++) {
        const by = y + 0.42 + b * 0.52;
        k.box(0.44, 0.045, len, sx, by, sz, D.timber);
        // the uprights
        for (const e of [-1, 1]) k.box(0.05, 0.05, 0.05, sx, by, sz + e * len * 0.5, D.conduit);
        // the stock: tins, boxes, bottles, in runs with gaps in them
        let t = -len * 0.5 + 0.10;
        while (t < len * 0.5 - 0.10) {
          const r = rng.next();
          if (r < 0.18) { t += rng.range(0.18, 0.42); continue; }
          if (r < 0.62) {
            const w = rng.range(0.10, 0.16);
            k.cyl(w * 0.5, w * 0.5, rng.range(0.11, 0.15), 8, sx + rng.range(-0.09, 0.09), by + 0.09, sz + t, D.tin);
            k.box(w * 1.02, 0.05, w * 1.02, sx + rng.range(-0.02, 0.02), by + 0.09, sz + t, D.label, rng.range(0, 3));
            t += w + 0.03;
          } else if (r < 0.86) {
            const w = rng.range(0.16, 0.26);
            k.box(0.26, rng.range(0.14, 0.22), w, sx, by + 0.11, sz + t, D.cardboard, rng.range(-0.1, 0.1));
            t += w + 0.04;
          } else {
            k.cyl(0.038, 0.045, 0.26, 7, sx, by + 0.17, sz + t, C.glass);
            t += 0.13;
          }
        }
      }
      api.emit({ kind: 'obb', x: sx, z: sz, halfX: 0.24, halfZ: len * 0.5, yaw: 0, y0: y - 0.2, y1: y + 2.10, tag: 'wood', climbable: false });
    }
  }

  // ---- the counter by the door, the till, and the strip over it
  {
    const c = L.counter;
    k.box(2.60, 0.98, 0.66, c.x, y + 0.49, c.z, D.timber, 0);
    k.box(2.72, 0.06, 0.76, c.x, y + 1.01, c.z, C.plank, 0);
    api.emit({ kind: 'obb', x: c.x, z: c.z, halfX: 1.36, halfZ: 0.38, yaw: 0, y0: y - 0.2, y1: y + 1.04, tag: 'wood', standable: true });
    k.box(0.34, 0.26, 0.30, c.x - 0.62, y + 1.17, c.z, D.enamel, -0.18);      // the till
    k.box(0.28, 0.02, 0.20, c.x - 0.62, y + 1.31, c.z - 0.02, C.dark, -0.18);
    k.box(0.30, 0.05, 0.22, c.x + 0.70, y + 1.06, c.z + 0.06, C.paper, 0.42);  // a ledger
    k.cyl(0.045, 0.042, 0.09, 8, c.x + 0.20, y + 1.09, c.z - 0.14, D.enamel);  // another mug
    // the fitting the counter strip hangs in — a housing, so the light has a fixture
    k.box(0.13, 0.09, 1.30, c.x, y + 1.28, c.z, C.slate, 0);
  }

  // ---- the flex and the shade over the bed
  {
    const b = L.bulb;
    k.cyl(0.007, 0.007, 1.16, 4, b.x, y + b.y + 0.60, b.z, D.conduit);
    k.cyl(0.06, 0.06, 0.04, 8, b.x, y + b.y + 1.18, b.z, C.slate);
    // apex UP, base DOWN: a lampshade is wide at the bottom. The first cut passed rx = PI and
    // the shade rendered as a funnel with the halo flaring out under it.
    k.cone(0.21, 0.24, 12, b.x, y + b.y + 0.10, b.z, C.slate, 0, 0, 0);
  }

  // ---- what a person who chose to survive here leaves lying about
  {
    // a chair, pulled round to face the stove
    // Pulled right up to the stove and OUT of the lane between the bed and the door: at
    // (-12.55, -0.30) it stood in the middle of the only route across the room.
    const cx = -13.70, cz = -0.20, ca = 1.05;
    for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) {
      const px = cx + lx * Math.cos(ca) + lz * Math.sin(ca), pz = cz - lx * Math.sin(ca) + lz * Math.cos(ca);
      k.box(0.045, 0.44, 0.045, px, y + 0.22, pz, C.wood);
    }
    k.box(0.44, 0.045, 0.44, cx, y + 0.455, cz, C.wood, ca);
    k.box(0.44, 0.50, 0.045, cx - Math.sin(ca) * 0.20, y + 0.70, cz - Math.cos(ca) * 0.20, C.wood, ca);
    api.emit({ kind: 'obb', x: cx, z: cz, halfX: 0.24, halfZ: 0.24, yaw: ca, y0: y - 0.2, y1: y + 0.48, tag: 'wood', standable: true });
    // a bucket, a kettle, a heap of blankets in the corner
    k.tube(0.15, 0.13, 0.28, 10, -6.55, y + 0.14, 3.30, D.enamel);
    k.cyl(0.10, 0.11, 0.15, 9, -14.60, y + 0.86, -1.70, D.enamel);            // kettle on the plate
    k.box(0.78, 0.30, 0.66, -6.40, y + 0.16, -2.10, D.quilt, 0.42);
    k.box(0.62, 0.20, 0.52, -6.28, y + 0.38, -2.02, D.quiltIn, -0.20);
    api.emit({ kind: 'obb', x: -6.38, z: -2.08, halfX: 0.44, halfZ: 0.38, yaw: 0.42, y0: y - 0.2, y1: y + 0.50, tag: 'cloth', standable: true });
    // a rack that came over, and its stock across the floor
    k.box(0.34, 1.62, 0.90, -7.35, y + 0.24, 3.05, D.conduit, 0.3, 0, Math.PI * 0.48);
    api.emit({ kind: 'obb', x: -7.35, z: 3.05, halfX: 0.80, halfZ: 0.46, yaw: 0.3, y0: y - 0.2, y1: y + 0.48, tag: 'metal', standable: true });
    for (let i = 0; i < 12; i++) {
      const px = -7.35 + rng.range(-1.2, 1.2), pz = 3.05 + rng.range(-1.0, 1.0);
      k.cyl(0.046, 0.046, 0.11, 8, px, y + 0.046, pz, D.tin, rng.range(0, 3), 0, Math.PI * 0.5);
    }
    // the tally on the west wall: scratches, not words (AGENTS rule 4)
    for (let i = 0; i < 23; i++) {
      const gz = 3.90 + ((i / 5) | 0) * 0.001;
      void gz;
      const col = (i / 5) | 0, row = i % 5;
      k.box(0.012, 0.17, 0.012, -15.26, y + 1.62 + (row === 4 ? 0 : 0), -2.30 + col * 0.16 + row * 0.028,
        C.dark, 0, 0, row === 4 ? 1.25 : 0);
    }
  }

  // ---- the doorway lining: a frame, a threshold, and the panel over the leaf
  {
    const d = ANCHORS.door;
    const zf = d.hingeZ;
    k.box(2.86, 0.09, 0.30, d.midX, y + 2.52, zf, C.wood, 0);                 // the head
    for (const s of [-1, 1]) k.box(0.11, 2.60, 0.30, d.midX + s * 1.24, y + 1.26, zf, C.wood, 0);  // jambs
    k.box(2.60, 0.68, 0.32, d.midX, y + 2.84, zf, C.slate, 0);                // the panel above
    k.box(2.60, 0.05, 0.44, d.midX, y + 0.02, zf, C.slate, 0);                // the threshold
    // the bulkhead OUTSIDE the door. Its glass is refuge's; this is the housing and the hood.
    const bl = L.door;
    k.box(0.34, 0.24, 0.16, bl.x, y + bl.y, bl.z - 0.02, C.slate, 0);
    k.box(0.42, 0.05, 0.24, bl.x, y + bl.y + 0.15, bl.z - 0.04, D.conduit, 0);
    k.box(0.045, 0.62, 0.045, bl.x + 0.30, y + bl.y - 0.20, bl.z + 0.06, D.conduit, 0);
  }
}

/* ==========================================================================
   THE DRESS
   ========================================================================== */
export const DRESS = {
  station(api, out) {
    void out;
    const k = kits();
    const s = k.solid;
    apronEdge(s, api);
    wetPatches(s, api);
    abandonedCar(s, api);
    spilledCrate(s, api);
    hoseReel(s, api);
    wheelieBins(s, api);
    palletStack(s, api);
    serviceBay(s, api);
    roadsideCrown(s, api);
    fallenBoard(s, api);
    cladPumps(s, api);
    eastWall(s, api);
    shopInterior(s, api);
    return { solid: s.build(), glow: k.glow.empty() ? null : k.glow.build() };
  },
};

// Keep THREE imported-and-used so a future primitive here does not have to re-add it, and
// so a stray tree-shake cannot decide this module has no dependency on the engine.
void THREE;

export default DRESS;
