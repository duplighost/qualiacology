// CURFEW — staged minor sites: the little places that have somebody at them. ROUND 7, lane C.
//
// Alex, sixth playtest, and docs/NEXT.md calls it the best-value idea on the list:
//
//   "we can also make some minor destinations with assets from my previous games too. or
//    make them fresh. maybe just little places that don't necessarily even have to be big
//    enough to load interiors. Like that fire near the road at the beginning. if we arrange
//    it right, a few hunters could be around it. so it's both like environmental
//    storytelling and a little unique place. those kinds of things are fun. ... omg, the
//    graveyard from fetch would be so cool."
//
// The rationing machinery already exists and is only being used for scenery: places.js
// `_buildMinorTable` lays a minor every 120-220 m of road, about 53 across the county, with
// starvation guards. What none of them has is a SCENE — nobody is ever standing at one.
//
// This file owns both halves of every staged scene, so one lane owns a scene end to end:
//
//   STAGED_KINDS     the table rows, spliced into placedata.js MINOR_KINDS. Same shape as
//                    the rows there: { id, weight, minSince, starve, bulk, offRoad, lit }.
//   STAGED_BUILDERS  id -> builder(api) -> { solid, glow, glowColour, flicker, ember }
//                    exactly like sites.js MINOR_BUILDERS. places.js prefers this map.
//
// `api` adds one call to the ordinary minor api:
//
//   api.cast([{ species, lx, lz, yaw, awake }])
//
// — who is standing at this scene, in the site's own local frame. They are placed DORMANT
// the first time the player comes within 150 m, once for the life of the save. A tableau
// until you disturb it. See places.js _recordCast.
//
// IMPORTANT: this file must NOT import placedata.js. placedata.js imports STAGED_KINDS from
// here, and a cycle between the two would leave MINOR_KINDS half-built at module evaluation.
// Import the kit toolkit from sites.js, and nothing else from world/.
//
// ---------------------------------------------------------------------------------------
// THE FRAME EVERY BUILDER BELOW WORKS IN.
//
// places.js yaws a minor so its LOCAL +Z faces the road (`yaw = atan2(bx - mx, bz - mz)`,
// places.js:1588). So in every builder here:
//
//     +Z is the road. -Z is deeper into the trees. The player arrives looking down -Z.
//
// That single fact decides every layout below. The campfire lane learned it the hard way:
// its lean-to was authored on +Z and became a pale sheet between the road and every fire in
// the county, measured at 0 px of glow from eight road points of ten. Nothing wide, pale or
// solid goes on +Z. The GLOW goes on +Z, and the people stand BEYOND the glow so they are
// lit from the front and read as silhouettes from the verge.
//
// THE LAWS THIS FILE OBEYS (AGENTS.md, docs/CONTRACT.md, docs/ART.md):
//   - No light is ever created. Every bright thing is the shared additive material through
//     `k.glow`, at one of the rationed GLOW colours (ART 0.5).
//   - Colliders are emitted INSIDE the loop that lays the geometry, through api.emit, never
//     afterwards, never opt-in.
//   - Every prop stands on `groundY(api, lx, lz)`, not on api.padY, unless it is within
//     about a metre of the site centre. A minor has no FLATS disc; the hill moves under it.
//   - No Math.random. api.rng only.
//   - A cast body is refused by enemies.spawn if a collider occupies its spot
//     (enemies.js:1092, collision.canOccupy), so no cast position below shares ground with
//     an emitted collider. tests/staged.mjs asserts the clearance.
// ---------------------------------------------------------------------------------------

import * as THREE from 'three';
import { TAU } from '../engine/math.js';
import {
  C, kits, groundY, glowColumn, GLOW, PANE_LAMP,
} from './sites.js';

/* ==========================================================================
   THE TABLE.

   These rows are spliced into MINOR_KINDS AHEAD of the eleven scenery kinds
   (placedata.js:320), and places.js `_chooseMinor` serves its starvation guards in TABLE
   ORDER — so a staged kind wins any tie with a scenery kind. That is why every `starve`
   here is large (18-30) next to the scenery table's 5-15: a staged scene must be a thing
   you come across, not the thing the county is made of. Measured ration across the real
   county is printed by tests/staged.mjs and reported in docs/ROUND-7/HANDOFF-C.md.

   `lit` puts a kind on places.js's proximity list — place:near fires with {lit: true}
   within CAMPFIRE_NEAR_R and carried XP banks there — and hud.js's county map draws every
   entry of places._campfires as a fire. Only the three scenes with a real fire in them
   take it. `offRoad` moves a site 18-40 m back into the trees instead of 7.4-12.6 m off
   the verge; a fire wants that distance and a roadside wreck does not.
   ========================================================================== */

export const STAGED_KINDS = [
  // HIS EXAMPLE, and it is first because he named it first.
  { id: 'hunters-fire', weight: 3.2, minSince: 5, starve: 18, bulk: 4.2, offRoad: true, lit: true },
  // Somebody stopped the road here, and then something stopped them.
  { id: 'roadblock', weight: 2.6, minSince: 6, starve: 21, bulk: 5.0, lit: true },
  // Doors open, and whoever was driving is out on the asphalt.
  { id: 'wreck-scene', weight: 2.6, minSince: 6, starve: 21, bulk: 3.4 },
  // The rifle is still in the blind. Its owner is under it.
  { id: 'blind-owner', weight: 2.2, minSince: 7, starve: 24, bulk: 2.8 },
  // One headlight, and it is pointing at something.
  { id: 'headlight-car', weight: 2.4, minSince: 6, starve: 22, bulk: 3.2, lit: true },
  // The graves are open and the spoil is on the OUTSIDE.
  { id: 'dug-out', weight: 2.2, minSince: 7, starve: 25, bulk: 5.4 },
  // The FETCH graveyard, which he named. Rarest thing in the table on purpose.
  // ROUND 7, lane C's checker: bulk 9.5 against a yard that runs to ~19 m deep (rows to
  // lz -16.7, mourners at -16.4). MEASURED: 0 trees inside 8 m at all seven scenes, but three
  // pines at 12.9, 13.9 and 15.1 m standing among the back ranks of stones. places.js reads
  // bulk as the keep-out radius now, so this row is the fix.
  { id: 'graveyard', weight: 1.9, minSince: 9, starve: 30, bulk: 18.0, offRoad: true },
];

/* ==========================================================================
   Shared props. Each one emits its own collider, in the same statement that
   lays its geometry (CONTRACT), and each one grounds itself.
   ========================================================================== */

/** A value variation of one of the site palette's colours. Value only — ART 0.5: the county
 *  has one hue and everything that is not a rationed glow is a value, not a colour. */
function shade(col, k) { return [col[0] * k, col[1] * k, col[2] * k]; }

/** Lay a cylinder between two points using the public Kit geometry hooks. The staged-site
 *  kit intentionally has no `strut` convenience method (the wilderness kit is a separate
 *  implementation), so disabled-car dressing must build its rods explicitly. */
function rod(k, ax, ay, az, bx, by, bz, r, seg, col) {
  const dx = bx - ax, dy = by - ay, dz = bz - az;
  const length = Math.hypot(dx, dy, dz);
  if (!(length > 0.0001)) return null;
  const geometry = new THREE.CylinderGeometry(r, r, length, seg, 1, false);
  geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(dx / length, dy / length, dz / length),
  ));
  geometry.translate((ax + bx) * 0.5, (ay + by) * 0.5, (az + bz) * 0.5);
  return k.push(geometry, col);
}

/** Old steel: warmer than C.metal, and NOT C.rust. See the note in `carShell`. */
const RUSTED = [0.128, 0.104, 0.086];
const RUST_DARK = [0.066, 0.052, 0.044];
const OLD_IRON = [0.058, 0.063, 0.069];

/**
 * A BODY FACE DOWN. The one prop this whole file needed and the kit did not have.
 *
 * It is dress, not an enemy: a corpse you can read at a glance and step over. Its collider
 * is 0.34 m tall and standable, so the controller walks over it instead of stopping dead
 * at a shin-high invisible wall (STEP_UP is 0.55).
 *
 * Values: the coat is C.dark, which is the darkest thing in the site palette. THE
 * NIGHT-VALUE LAW (species.js): a body must be DARKER than the sky it stands against.
 */
function fallenBody(k, api, lx, lz, yaw, sprawl) {
  const gy = groundY(api, lx, lz);
  const s = k.solid;
  // MEASURED, first pass: at C.dark the corpse read as a stack of pale crates under the
  // torch at 6 m (tests/shots/staged-blind-owner-near.png). The torch is 560 hot and ART
  // 0.6 forbids touching it, so the fix is on this side: the coat goes to 55% of the
  // darkest colour in the site palette, which is 0.058 linear, and the SILHOUETTE does the
  // reading instead of the value — a coat skirt wider than the torso, and a head big
  // enough to find.
  const coat = shade(C.dark, 0.55);
  const skin = shade(C.soil, 0.85);
  // the coat, spread out around him: the widest, flattest thing, and what makes the shape
  // read as cloth on a person rather than as timber
  s.quad(1.02, 1.46, lx, gy + 0.016, lz, shade(C.dark, 0.7), yaw, -Math.PI * 0.5);
  // torso and hips, face down, the long axis along the body's own +Z
  s.box(0.46, 0.24, 0.80, lx, gy + 0.12, lz, coat, yaw);
  s.box(0.42, 0.22, 0.34, lx - Math.sin(yaw) * 0.54, gy + 0.11, lz - Math.cos(yaw) * 0.54, coat, yaw);
  // head, turned the wrong way
  const hx = lx + Math.sin(yaw) * 0.56, hz = lz + Math.cos(yaw) * 0.56;
  s.cyl(0.135, 0.135, 0.26, 8, hx, groundY(api, hx, hz) + 0.13, hz, skin, yaw, Math.PI * 0.5, 0.4);
  // legs
  for (const side of [-1, 1]) {
    const a = yaw + side * (0.16 + (sprawl || 0) * 0.30);
    const ex = lx - Math.sin(a) * 1.32, ez = lz - Math.cos(a) * 1.32;
    s.cyl(0.085, 0.10, 0.86, 5, (lx + ex) * 0.5, groundY(api, (lx + ex) * 0.5, (lz + ez) * 0.5) + 0.09,
      (lz + ez) * 0.5, coat, a, Math.PI * 0.5);
    s.box(0.16, 0.10, 0.28, ex, groundY(api, ex, ez) + 0.05, ez, shade(C.dark, 0.8), a);
  }
  // arms — one tucked, one flung out. The flung arm is the whole silhouette.
  const fa = yaw + 1.25;
  const ax = lx + Math.sin(fa) * 0.62, az = lz + Math.cos(fa) * 0.62;
  k.solid.cyl(0.065, 0.075, 0.72, 5, (lx + ax) * 0.5, groundY(api, (lx + ax) * 0.5, (lz + az) * 0.5) + 0.07,
    (lz + az) * 0.5, coat, fa, Math.PI * 0.5);
  k.solid.cyl(0.055, 0.055, 0.18, 5, ax, groundY(api, ax, az) + 0.05, az, skin, fa, Math.PI * 0.5);
  const ta = yaw - 1.05;
  const tx = lx + Math.sin(ta) * 0.40, tz = lz + Math.cos(ta) * 0.40;
  k.solid.cyl(0.06, 0.07, 0.56, 5, (lx + tx) * 0.5, groundY(api, (lx + tx) * 0.5, (lz + tz) * 0.5) + 0.07,
    (lz + tz) * 0.5, coat, ta, Math.PI * 0.5);
  api.emit({
    kind: 'circle', x: lx, z: lz, r: 0.62, y0: gy - 0.25, y1: gy + 0.34,
    tag: 'wood', standable: true,
  });
  return gy;
}

/**
 * A SEATED SILHOUETTE, for the thing in the car. Head and shoulders only: it is meant to be
 * seen through a windscreen from outside, and a whole body would be geometry nobody sees.
 * No collider — it is inside the vehicle's own box.
 */
function seatedShoulders(k, lx, y, lz, yaw) {
  k.solid.box(0.52, 0.30, 0.24, lx, y + 0.15, lz, shade(C.dark, 0.85), yaw);
  k.solid.cyl(0.115, 0.125, 0.26, 7, lx, y + 0.44, lz, shade(C.dark, 1.15), yaw);
}

/**
 * A CAR SHELL. The wreck minor in sites.js draws one in nine lines; this is the same car
 * with the doors on it, because a door standing open is the whole sentence of a wreck
 * scene. `open` is the swing in radians (0 = shut). Returns the half-extents used, so the
 * caller can keep a cast clear of the collider.
 */
function carShell(k, api, lx, lz, yaw, opts) {
  const o = opts || {};
  const gy = groundY(api, lx, lz);
  const roll = o.roll || 0;
  // MEASURED, twice: at C.rust (0.176, 0.098, 0.062) a 4.3 m car under the torch is a
  // bright ORANGE box, and scaling the whole colour by 0.60 did not fix it — the VALUE
  // came down and the frame stayed orange, because scaling a colour keeps its hue and the
  // torch is warm (0xffeccb) on top of it (tests/shots/staged-wreck-scene-near.png, passes
  // 1 and 2). ART 0.5 rations saturation to the glow set and the eye glints; a body panel
  // is not on that list. So the rust is DESATURATED toward the metal instead of dimmed:
  // 0.128 / 0.104 / 0.086 is 0.11 linear and still reads warmer than the county's grey,
  // which is all "rusted" has to do.
  const body = o.rust ? RUSTED : shade(C.metal, 0.85);
  const s = k.solid;
  const put = (px, pz) => ({
    x: lx + px * Math.cos(yaw) + pz * Math.sin(yaw),
    z: lz - px * Math.sin(yaw) + pz * Math.cos(yaw),
  });
  // Three stamped layers fill the old physical envelope but create sill, shoulder and belt
  // lines under the torch instead of one featureless four-metre cuboid.
  s.box(4.30, 0.30, 1.86, lx, gy + 0.25, lz, RUST_DARK, yaw, 0, roll);
  s.box(4.08, 0.34, 1.80, lx, gy + 0.53, lz, body, yaw, 0, roll);
  s.box(3.84, 0.35, 1.74, lx - 0.08 * Math.cos(yaw), gy + 0.875,
    lz + 0.08 * Math.sin(yaw), RUST_DARK, yaw, 0, roll);
  {
    const p = put(-0.25, 0);
    s.box(2.10, 0.76, 1.72, p.x, gy + 1.32, p.z, shade(C.dark, 1.0), yaw, 0, roll);
    // A welded roof plate is the stable roof surface. Keeping it horizontal matters:
    // the wreck may list, but the climb collider must be something the player can see.
    s.box(1.72, 0.10, 1.38, p.x, gy + 1.75, p.z, OLD_IRON, yaw);
    api.emit({
      kind: 'obb', x: p.x, z: p.z, halfX: 0.86, halfZ: 0.69, yaw,
      y0: gy + 1.70, y1: gy + 1.80, tag: 'vehicle', standable: true,
    });
  }
  // glass, dark: a windscreen is a hole at night, not a shine
  {
    const p = put(0.86, 0);
    s.box(0.10, 0.62, 1.52, p.x, gy + 1.34, p.z, C.glass, yaw, 0, roll);
  }
  // Side glass, sills, bumpers and stamped panel seams are all below the existing physical
  // crowns. They give the merged shell a car's internal rhythm instead of one long pale box.
  for (const side of [-1, 1]) {
    let p = put(-0.25, side * 0.875);
    s.box(1.44, 0.42, 0.045, p.x, gy + 1.34, p.z, C.glass, yaw, 0, roll);
    p = put(-0.10, side * 0.95);
    s.box(3.72, 0.14, 0.055, p.x, gy + 0.35, p.z, RUST_DARK, yaw);
    for (const sx of [-0.94, 0.48]) {
      p = put(sx, side * 0.955);
      s.box(0.045, 0.54, 0.04, p.x, gy + 0.77, p.z, shade(C.dark, 0.62), yaw);
    }
  }
  for (const sx of [-2.13, 2.13]) {
    const p = put(sx, 0);
    s.box(0.13, 0.16, 1.72, p.x, gy + 0.45, p.z, OLD_IRON, yaw);
  }
  if (o.disabled) {
    // Player-facing diagnosis, without HUD copy: the bonnet is reared up, an engine block
    // is exposed, the windscreen is crossed with metal and the exhaust lies on the earth.
    // Even the uncanny headlight tableau must read as a dead machine, not a usable-car bait.
    let p = put(1.35, 0);
    s.box(1.05, 0.50, 1.34, p.x, gy + 0.96, p.z, OLD_IRON, yaw);
    for (const ex of [1.08, 1.36, 1.64]) {
      const rib = put(ex, 0);
      s.box(0.065, 0.50, 1.36, rib.x, gy + 0.96, rib.z, RUST_DARK, yaw);
    }
    api.emit({
      kind: 'obb', x: p.x, z: p.z, halfX: 0.525, halfZ: 0.67, yaw,
      y0: gy + 0.71, y1: gy + 1.21, tag: 'metal', standable: true,
    });
    p = put(2.02, 0);
    s.box(0.10, 1.30, 1.64, p.x, gy + 1.48, p.z, body, yaw, 0, 0.20 + roll);
    for (const side of [-1, 1]) {
      const rib = put(2.015, side * 0.52);
      s.box(0.055, 1.12, 0.075, rib.x, gy + 1.48, rib.z, RUST_DARK, yaw, 0, 0.20 + roll);
    }
    api.emit({
      kind: 'obb', x: p.x, z: p.z, halfX: 0.18, halfZ: 0.82, yaw,
      y0: gy + 0.80, y1: gy + 2.15, tag: 'metal', climbable: false,
    });
    const a = put(0.83, -0.72), b = put(0.90, 0.72);
    rod(s, a.x, gy + 1.08, a.z, b.x, gy + 1.62, b.z, 0.035, 4, shade(C.metal, 0.8));
    const c = put(0.83, 0.72), d = put(0.90, -0.72);
    rod(s, c.x, gy + 1.08, c.z, d.x, gy + 1.62, d.z, 0.035, 4, shade(C.metal, 0.8));
    const e0 = put(-1.7, -0.35), e1 = put(-2.9, -0.55);
    rod(s, e0.x, gy + 0.27, e0.z, e1.x, groundY(api, e1.x, e1.z) + 0.07, e1.z,
      0.055, 6, shade(C.metal, 0.62));
  }
  for (let i = 0; i < 4; i++) {
    const sx = (i & 1) ? 1.52 : -1.52, sz = (i & 2) ? 0.88 : -0.88;
    const p = put(sx, sz);
    if (o.wheelOff && i === 3) {
      // the one that came off, lying flat in the dirt beside it
      const q = put(sx + 1.1, sz + 0.9);
      s.tube(0.33, 0.33, 0.20, 8, q.x, groundY(api, q.x, q.z) + 0.10, q.z, shade(C.dark, 0.9));
      continue;
    }
    s.tube(0.34, 0.34, 0.24, 10, p.x, gy + 0.33, p.z,
      shade(C.dark, 0.75), yaw, Math.PI * 0.5, 0);
    s.cyl(0.13, 0.13, 0.255, 8, p.x, gy + 0.33, p.z,
      OLD_IRON, yaw, Math.PI * 0.5, 0);
  }
  // THE DOORS, and they are the whole sentence of a wreck.
  //
  // A leaf hangs from a hinge at car-local (0.30, +-0.94) and its 1.02 m length runs
  // BACKWARD along the car when it is shut. Swinging it out by theta rotates that direction
  // about the hinge, so in car-local coordinates the leaf's centre is
  //   ( 0.30 - 0.51 cos t ,  side * (0.94 + 0.51 sin t) )
  // and its heading is the car's yaw plus side * t — the kit's `at` does rotateY(ry) before
  // the translate, and rotateY maps +X to (cos, -sin), which is the SAME mapping `put` uses
  // for car-local +X. That is the only reason these two frames can be mixed in one line.
  if (o.open) {
    const ct = Math.cos(o.open), st = Math.sin(o.open);
    for (const side of [-1, 1]) {
      const lp = put(0.30 - 0.51 * ct, side * (0.94 + 0.51 * st));
      s.box(1.02, 0.92, 0.09, lp.x, gy + 1.02, lp.z, body, yaw + side * o.open, 0, roll);
      s.box(0.70, 0.55, 0.045, lp.x, gy + 1.00, lp.z, RUST_DARK,
        yaw + side * o.open, 0, roll);
    }
  }
  api.emit({
    kind: 'obb', x: lx, z: lz, halfX: 2.20, halfZ: 0.98, yaw,
    y0: gy - 0.25, y1: gy + 1.05, tag: 'vehicle', standable: true,
  });
  return { gy, put };
}

/**
 * A HEADSTONE, in the four silhouettes FETCH's graveyard uses.
 *
 * donor: Projects/qualiacology/fetch/src/atmosphere.js:305-435 (`buildGraveyardDress` —
 *   the `stones` table, `it.sink` / `it.lean` / `it.yaw` / `it.value` / `it.fallen`, and
 *   the four stone families), read 2026-09-03 in the LIVE SITE COPY, which is the copy
 *   AGENTS.md says to lift FETCH from.
 *
 * WHAT CHANGED IN THE PORT, and why. FETCH draws each family as an InstancedMesh over an
 * ExtrudeGeometry silhouette with a per-instance colour. Neither survives here:
 *   - ExtrudeGeometry is NON-INDEXED and every kit primitive is INDEXED, and
 *     mergeGeometries refuses a mixed set (it console.errors and returns null), which
 *     would have silently deleted the whole graveyard's geometry. So the four silhouettes
 *     are rebuilt from the kit's own indexed primitives: an arched top is a disc laid on a
 *     slab, a shouldered top is two chamfer blocks, a broken top is a slab with a bite out
 *     of it, a cross is an upright and an arm.
 *   - The per-instance colour becomes a per-part vertex colour, which is what this
 *     project's one-material law gives instead (sites.js header). FETCH's `it.value`
 *     0.26-0.62 against a stone tinted 0x98a4aa * 0.58 becomes C.stone scaled 0.52-1.02,
 *     which lands 0.091-0.179 linear — inside the county's band and well under C.plaster
 *     0.265 — and it is the same idea: no two of them weathered the same, and a yard where
 *     every stone is pale has no pale thing in it. MEASURED: the first cut ran to 1.34
 *     (0.234) and the near frame came back at luma mean 109.7 with only 1% of it under 8,
 *     a white-out under the torch at 6 m (tests/shots/staged-graveyard-near.png, pass 2).
 * KEPT EXACTLY: the sink (FETCH atmosphere.js:366 — 30% of stones sink 0.12-0.34 m, and
 * `it.sink < -0.1` is what makes a grave an OLD one at :456), the lean, the yaw jitter, the
 * fallen roll of PI * 0.47 at atmosphere.js:388, and the mound in front (:447-462) which is
 * the line that says something is buried there.
 */
function headstone(k, api, lx, lz, opts) {
  const o = opts || {};
  const r = api.rng;
  const gy = groundY(api, lx, lz);
  const sink = o.sink !== undefined ? o.sink : (r.next() < 0.30 ? r.range(-0.34, -0.12) : r.range(-0.04, 0.02));
  const tall = o.tall !== undefined ? o.tall : r.range(0.78, 1.46);
  const wide = o.wide !== undefined ? o.wide : r.range(0.78, 1.20);
  const lean = r.range(-0.20, 0.20);
  const yaw = (o.yaw || 0) + r.range(-0.34, 0.34);
  const col = shade(C.stone, r.range(0.52, 1.02));
  const kind = o.kind || 'gothic';
  const fallen = o.fallen !== undefined ? o.fallen : (kind === 'broken' && r.next() < 0.42);
  const y0 = gy + sink;
  const s = k.solid;

  if (fallen) {
    // face down in the grass. FETCH lays these at y 0.08 with a roll of PI * 0.47.
    s.box(0.78 * wide, 0.14, tall, lx, gy + 0.09, lz, col, yaw, Math.PI * 0.47);
  } else if (kind === 'cross') {
    s.box(0.13 * wide, tall * 1.16, 0.13 * wide, lx, y0 + tall * 0.58, lz, col, yaw, 0, lean);
    s.box(0.62 * wide, 0.13 * wide, 0.13 * wide, lx, y0 + tall * 0.94, lz, col, yaw, 0, lean);
  } else if (kind === 'obelisk') {
    // FETCH's broken memorial column (atmosphere.js:404-419): a shaft with the top snapped.
    s.box(0.62 * wide, 0.26, 0.50 * wide, lx, y0 + 0.13, lz, col, yaw, 0, lean);
    s.box(0.38 * wide, tall * 1.15, 0.34 * wide, lx, y0 + 0.26 + tall * 0.575, lz, col, yaw, 0, lean);
    s.box(0.40 * wide, 0.16, 0.36 * wide, lx, y0 + 0.26 + tall * 1.15, lz, col, yaw, 0, lean + r.range(0.2, 0.5));
  } else if (kind === 'shouldered') {
    s.box(0.84 * wide, tall, 0.17, lx, y0 + tall * 0.5, lz, col, yaw, 0, lean);
    for (const side of [-1, 1]) {
      s.box(0.26 * wide, 0.16, 0.17, lx + side * 0.30 * wide * Math.cos(yaw),
        y0 + tall + 0.06, lz - side * 0.30 * wide * Math.sin(yaw), col, yaw, 0, lean + side * 0.22);
    }
  } else if (kind === 'broken') {
    s.box(0.78 * wide, tall * 0.86, 0.18, lx, y0 + tall * 0.43, lz, col, yaw, 0, lean);
    // the bite out of the top: a wedge sitting proud on one shoulder only
    s.box(0.34 * wide, tall * 0.18, 0.18, lx - 0.20 * wide * Math.cos(yaw),
      y0 + tall * 0.95, lz + 0.20 * wide * Math.sin(yaw), col, yaw, 0, lean - 0.28);
  } else {
    // gothic: a slab with an arched head. The arch is a DISC lying in the slab's own plane,
    // and it cannot be laid with Kit.cyl: `at` applies rz, then rx, then ry, so a cap built
    // as cyl(..., ry, PI/2, lean) gets its lean applied about the wrong axis and separates
    // from the top of a leaning slab by up to 0.24 m. Built here in the right order, and
    // placed where the slab's own top edge ACTUALLY ends up after the slab leans about its
    // centre: rotateZ(a) sends (0, tall/2) to (-sin a * tall/2, cos a * tall/2).
    s.box(0.78 * wide, tall, 0.15, lx, y0 + tall * 0.5, lz, col, yaw, 0, lean);
    const capX = -Math.sin(lean) * tall * 0.5;
    const capY = y0 + tall * 0.5 + Math.cos(lean) * tall * 0.5;
    const cap = new THREE.CylinderGeometry(0.39 * wide, 0.39 * wide, 0.15, 10);
    cap.rotateX(Math.PI * 0.5);          // a disc standing in the XY plane
    cap.rotateZ(lean);                   // leaning with the slab
    cap.rotateY(yaw);
    cap.translate(lx + capX * Math.cos(yaw), capY, lz - capX * Math.sin(yaw));
    s.push(cap, col);
  }

  // THE MOUND. donor: atmosphere.js:447-462. A headstone on flat ground is a slab in a
  // field; the mound in front of it is what says something is buried there, and an OLD
  // grave (sink < -0.1) has fallen IN rather than risen.
  const sunken = sink < -0.1;
  const mz = lz + Math.cos(yaw) * 1.05, mx = lx + Math.sin(yaw) * 1.05;
  const mg = groundY(api, mx, mz);
  const mound = new THREE.SphereGeometry(1, 9, 5, 0, TAU, 0, Math.PI * 0.5);
  mound.scale(r.range(0.72, 0.98), sunken ? r.range(0.10, 0.18) : r.range(0.26, 0.40), r.range(0.85, 1.12));
  s.at(mound, shade(C.soil, r.range(0.70, 1.10)), mx, mg + (sunken ? -0.16 : -0.05), mz, yaw);
  if (sunken) {
    // the ground has taken it: a dark rim of open earth around the sag
    s.quad(1.5, 2.1, mx, mg + 0.012, mz, shade(C.soil, 0.55), yaw, -Math.PI * 0.5);
  }

  if (!fallen) {
    api.emit({
      kind: 'circle', x: lx, z: lz, r: 0.42, y0: gy - 0.3, y1: y0 + tall * 1.2, tag: 'stone',
    });
  }
  return { gy, sink, tall, sunken };
}

/**
 * A MOURNER. Three of them stand at the boundary of FETCH's yard with their heads turned
 * away, and they are the reason that graveyard feels inhabited without an enemy in it.
 * donor: Projects/qualiacology/fetch/src/atmosphere.js:546-562 (`statueSites` — plinth
 *   0.84 x 0.42 x 0.84, robe cone r 0.38 h 1.62, head sphere r 0.17 offset 0.08 along the
 *   averted yaw), read 2026-09-03 in the live site copy. Ported to the kit's cone and
 *   sphere on the one solid material, with FETCH's own 0x69747a -> a value step under the
 *   headstones so the statues read as a darker, taller family than the graves.
 */
function mourner(k, api, lx, lz, yaw) {
  const gy = groundY(api, lx, lz);
  const col = shade(C.stone, 0.62);
  k.solid.box(0.84, 0.42, 0.84, lx, gy + 0.21, lz, col, yaw);
  k.solid.cone(0.38, 1.62, 7, lx, gy + 1.19, lz, col, yaw);
  const head = new THREE.SphereGeometry(0.17, 8, 6);
  head.scale(0.9, 1.18, 0.94);
  k.solid.at(head, col, lx + Math.sin(yaw) * 0.08, gy + 2.14, lz + Math.cos(yaw) * 0.08, yaw);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.52, y0: gy - 0.3, y1: gy + 2.35, tag: 'stone' });
  return gy;
}

/**
 * A LANTERN ON A POST, with a pale ember in a cage.
 * donor: Projects/qualiacology/fetch/src/atmosphere.js:518-540 (`lanternSites` — post
 *   cylinder 0.045/0.07 x 2.35, cage box 0.30 x 0.40 x 0.30 at y 2.28, an octahedron ember
 *   in it, each with a small lean), read 2026-09-03 in the live site copy. FETCH's ember is
 *   an unlit MeshBasic; here it is the shared additive material through k.glow, which is
 *   the same law by a different name — no light is created either way.
 * The pane is VERTICAL and 0.09 m^2, so it never touches the horizontal-pane ledger.
 */
function lantern(k, api, lx, lz, lean, gain) {
  const gy = groundY(api, lx, lz);
  k.solid.cyl(0.045, 0.07, 2.35, 6, lx, gy + 1.18, lz, shade(C.metal, 0.62), 0, 0, lean);
  k.solid.box(0.30, 0.40, 0.30, lx - lean * 0.2, gy + 2.28, lz, shade(C.dark, 1.0), 0, 0, lean);
  for (const a of [0, Math.PI * 0.5]) {
    k.glow.pane(0.24, 0.30, lx - lean * 0.2, gy + 2.28, lz, PANE_LAMP, a, 0, 5, 5);
  }
  glowColumn(k.glow, lx - lean * 0.2, gy + 2.14, lz, 0.16, 0.62, gain === undefined ? 0.34 : gain);
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.22, y0: gy - 0.3, y1: gy + 2.5, tag: 'wood' });
  return gy;
}

/**
 * A FIRE: the ring of stones, the ash, the ember bed and the column that makes it read from
 * the road. Lifted wholesale from sites.js MINOR_BUILDERS.campfire (its ring, its ash disc,
 * its 0.90 x 0.90 PANE_LAMP bed at padY + 0.16 and its glowColumn) so a staged fire and a
 * scenery fire are the same fire, and so places.js's EMBER FADE mask still finds its bed:
 * places.js:1432 takes the column vertices to be every vertex NOT at padY + 0.16, which is
 * why the bed height here is a constant and not a parameter.
 */
function fire(k, api, gain) {
  const r = api.rng;
  const gy = api.padY;
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + r.range(-0.12, 0.12);
    const rad = 0.74 + r.range(-0.05, 0.05);
    const s = r.range(0.26, 0.40);
    const lx = Math.cos(a) * rad, lz = Math.sin(a) * rad;
    const g = groundY(api, lx, lz);
    k.solid.box(s, s * 0.7, s * 0.85, lx, g + s * 0.30, lz, C.stone, r.range(0, TAU), 0, r.range(-0.2, 0.2));
  }
  k.solid.cyl(0.52, 0.40, 0.14, 10, 0, gy + 0.05, 0, C.ash);
  k.glow.pane(0.90, 0.90, 0, gy + 0.16, 0, PANE_LAMP, 0, -Math.PI * 0.5, 8, 8);
  glowColumn(k.glow, 0, gy + 0.10, 0, 0.46, 1.80, gain === undefined ? 0.74 : gain);
  // the burning sticks, standing in the ring
  for (let i = 0; i < 6; i++) {
    k.solid.cyl(0.03, 0.05, r.range(0.45, 0.75), 4, r.range(-0.26, 0.26), gy + 0.24,
      r.range(-0.26, 0.26), C.dark, r.range(0, TAU), r.range(0.85, 1.35));
  }
  api.emit({ kind: 'circle', x: 0, z: 0, r: 0.86, y0: gy - 0.2, y1: gy + 0.32, tag: 'stone', standable: true });
  return gy;
}

/**
 * A TRIPOD of poles meeting over a point, with the legs actually leaning to the apex.
 *
 * Worth the trigonometry, because the first cut of the hunters' fire got it wrong and the
 * "tripod" came out as an A-frame standing across the fire and hiding it
 * (tests/shots/staged-hunters-fire-near.png, first pass). Kit.at applies rz, then rx, then
 * ry, so a pole leaning by `tilt` about X and then swung by `head` about Y points along
 * (sin tilt sin head, cos tilt, sin tilt cos head); setting head = -(PI/2 + phi) makes that
 * the direction from a foot at angle phi to the apex, exactly.
 */
function tripod(k, api, cx, cz, R, H, col) {
  const L = Math.hypot(R, H);
  const tilt = Math.atan2(R, H);
  const gy = groundY(api, cx, cz);
  for (let i = 0; i < 3; i++) {
    const phi = (i / 3) * TAU + 0.6;
    const fx = cx + Math.cos(phi) * R, fz = cz + Math.sin(phi) * R;
    k.solid.cyl(0.028, 0.036, L, 4, (cx + fx) * 0.5, gy + H * 0.5, (cz + fz) * 0.5, col,
      -(Math.PI * 0.5 + phi), tilt);
  }
  return gy + H;
}

/** A stump to sit on. Small, standable, and a cast body stands BEHIND it, never on it. */
function stump(k, api, lx, lz) {
  const gy = groundY(api, lx, lz);
  const h = api.rng.range(0.40, 0.52);
  k.solid.cyl(0.23, 0.26, h, 8, lx, gy + h * 0.5, lz, C.wood, 0, api.rng.range(-0.07, 0.07));
  api.emit({ kind: 'circle', x: lx, z: lz, r: 0.28, y0: gy - 0.2, y1: gy + h, tag: 'wood', standable: true });
  return gy;
}

/** A rifle, leaning or lying. The single most legible "a person was here" object there is. */
function rifle(k, api, lx, lz, y, yaw, lean) {
  k.solid.cyl(0.021, 0.024, 0.78, 5, lx, y + 0.30, lz, shade(C.metal, 0.85), yaw, lean || 0);
  k.solid.box(0.055, 0.30, 0.10, lx - Math.sin(yaw) * 0.30 * Math.sin(lean || 0),
    y + 0.06, lz - Math.cos(yaw) * 0.30 * Math.sin(lean || 0), C.wood, yaw, lean || 0);
}

/* ==========================================================================
   THE SCENES.
   ========================================================================== */

export const STAGED_BUILDERS = {

  /**
   * HUNTERS' FIRE — Alex's own example, verbatim: "Like that fire near the road at the
   * beginning. if we arrange it right, a few hunters could be around it. so it's both like
   * environmental storytelling and a little unique place."
   *
   * Two men and a dog around a live fire, three stumps drawn up to it, a pot on a tripod,
   * and a fourth bedroll laid out flat and EMPTY. The empty bed is the story: the fire is
   * still going and one of them is not coming back to it.
   *
   * The two seats that are occupied sit BEYOND the fire from the road (-Z), so from the
   * verge you read the glow first and then two shapes standing in front of it. The empty
   * bedroll is on the near side where you cannot miss that nobody is on it.
   */
  'hunters-fire': (api) => {
    const k = kits();
    const r = api.rng;
    const gy = fire(k, api, 0.78);

    // the tripod and the pot over the fire. It stands OFF the fire's centre (0.9 m to the
    // side of the road axis) — the first cut put it over the embers and it was the only
    // thing you could see of the scene at 6 m.
    {
      const apex = tripod(k, api, -0.95, -0.35, 0.62, 1.38, C.wood);
      k.solid.tube(0.15, 0.12, 0.20, 8, -0.95, apex - 0.34, -0.35, shade(C.metal, 0.7));
      k.solid.cyl(0.012, 0.012, 0.30, 4, -0.95, apex - 0.16, -0.35, shade(C.metal, 0.7));
    }

    // the three seats. Angles are measured with +Z toward the road, so the two occupied
    // stumps at 205 and 290 degrees sit on the far side and their men are lit from in front.
    const seats = [
      { a: 3.58, taken: 'poacher' },
      { a: 5.06, taken: 'poacher' },
      { a: 0.70, taken: null },
    ];
    const cast = [];
    for (const s of seats) {
      const sx = Math.cos(s.a) * 1.72, sz = Math.sin(s.a) * 1.72;
      stump(k, api, sx, sz);
      if (s.taken) {
        cast.push({ species: s.taken, lx: Math.cos(s.a) * 2.55, lz: Math.sin(s.a) * 2.55, yaw: 0, awake: false });
      }
    }
    // the rifle propped on the empty seat, and the coat over it
    {
      const sx = Math.cos(0.70) * 1.72, sz = Math.sin(0.70) * 1.72;
      rifle(k, api, sx + 0.32, sz + 0.10, groundY(api, sx, sz), 0.70, 0.34);
      k.solid.quad(0.62, 0.70, sx, groundY(api, sx, sz) + 0.44, sz + 0.16, shade(C.dark, 1.2), 0.70, 0.30);
    }

    // THE EMPTY BEDROLL, on the road side of the fire so it is the first thing you read.
    {
      const bx = r.range(-0.6, 0.6) + 1.9, bz = 2.35;
      const bg = groundY(api, bx, bz);
      const byaw = r.range(-0.35, 0.35);
      k.solid.box(0.66, 0.11, 1.92, bx, bg + 0.055, bz, shade(C.cloth, 0.55), byaw);
      k.solid.cyl(0.15, 0.15, 0.60, 7, bx - Math.sin(byaw) * 0.86, bg + 0.16, bz - Math.cos(byaw) * 0.86,
        shade(C.cloth, 0.72), byaw + Math.PI * 0.5, Math.PI * 0.5);
      // the boots at its foot, side by side, still pointing at the fire
      for (const side of [-1, 1]) {
        k.solid.box(0.15, 0.11, 0.30, bx + side * 0.16 + Math.sin(byaw) * 1.05,
          bg + 0.055, bz + Math.cos(byaw) * 1.05, shade(C.dark, 0.85), byaw);
      }
      api.emit({
        kind: 'obb', x: bx, z: bz, halfX: 0.40, halfZ: 1.05, yaw: byaw,
        y0: bg - 0.2, y1: bg + 0.16, tag: 'wood', standable: true,
      });
    }

    // a pack, a tin, and the game they took hanging off a pole
    {
      const px = -2.05, pz = -1.35, pg = groundY(api, px, pz);
      k.solid.box(0.46, 0.40, 0.32, px, pg + 0.20, pz, shade(C.cloth, 0.62), r.range(0, TAU), 0, r.range(-0.3, 0.3));
      k.solid.cyl(0.05, 0.05, 0.09, 6, px + 0.45, pg + 0.045, pz + 0.25, C.metal);
      api.emit({ kind: 'circle', x: px, z: pz, r: 0.32, y0: pg - 0.2, y1: pg + 0.44, tag: 'wood', standable: true });
    }
    {
      // two poles and a crossbar with a carcass on it, well behind the fire
      const cz = -3.6;
      const gL = groundY(api, -1.1, cz), gR = groundY(api, 1.1, cz);
      k.solid.cyl(0.05, 0.06, 2.2, 5, -1.1, gL + 1.1, cz, C.wood, 0, 0, 0.07);
      k.solid.cyl(0.05, 0.06, 2.2, 5, 1.1, gR + 1.1, cz, C.wood, 0, 0, -0.07);
      k.solid.cyl(0.04, 0.04, 2.5, 4, 0, (gL + gR) * 0.5 + 2.10, cz, C.wood, 0, 0, Math.PI * 0.5);
      k.solid.cyl(0.17, 0.11, 1.05, 6, 0.25, (gL + gR) * 0.5 + 1.52, cz, shade(C.soil, 0.9), 0.2, 0.05);
      api.emit({
        kind: 'obb', x: 0, z: cz, halfX: 1.25, halfZ: 0.22, yaw: 0,
        y0: (gL + gR) * 0.5 - 0.2, y1: (gL + gR) * 0.5 + 2.2, tag: 'wood',
      });
    }

    // the dog, off to one side where a dog would be: near the meat, not near the fire
    cast.push({ species: 'hound', lx: 1.85, lz: -3.0, yaw: 0, awake: false });

    api.cast(cast);
    k.glowColour = GLOW.ember;
    k.ember = true;
    return k;
  },

  /**
   * ROADBLOCK — somebody stopped this road, and then something stopped them.
   *
   * Sawhorses across the verge, a burn barrel still going, a wall of sandbags, a car door
   * stood up as a shield, and a man draped over the barrier. One figure is still standing
   * at the barrel and has not moved since you came round the bend, because it is the
   * Standing Kind and it only moves when you are not looking at it.
   */
  roadblock: (api) => {
    const k = kits();
    const r = api.rng;

    // the barrier, laid across local X at lz = +1.4 (the road side)
    for (const bx of [-2.0, 0.9]) {
      const bz = 1.4 + r.range(-0.2, 0.2);
      const g = groundY(api, bx, bz);
      const byaw = r.range(-0.18, 0.18) + (bx > 0 ? 0.24 : 0);
      k.solid.box(2.30, 0.13, 0.13, bx, g + 0.94, bz, shade(C.plank, 0.85), byaw);
      for (const s of [-1, 1]) {
        for (const t of [-1, 1]) {
          k.solid.cyl(0.05, 0.06, 1.06, 4, bx + s * 0.95, g + 0.47, bz + t * 0.26, C.wood,
            byaw, t * 0.22, s * 0.10);
        }
      }
      // the reflective bar: a value step, not a colour (ART 0.5)
      k.solid.box(2.20, 0.12, 0.03, bx, g + 0.72, bz - 0.10, shade(C.plaster, 0.72), byaw);
      api.emit({
        kind: 'obb', x: bx, z: bz, halfX: 1.20, halfZ: 0.30, yaw: byaw,
        y0: g - 0.2, y1: g + 1.02, tag: 'wood',
      });
    }

    // THE MAN OVER THE BARRIER — face down where he fell across it, on the far sawhorse
    fallenBody(k, api, 1.0, 0.55, r.range(2.2, 2.8), 0.6);

    // THE COALS THEY RAKED OUT, on the ground at the site centre.
    //
    // This is not decoration, it is what turns the barrel's flame OFF as you walk up to it.
    // places.js's ember fade (places.js:1432) builds its mask by taking every glow vertex
    // that is NOT at padY + 0.16 to be column, and if a scene has no bed at exactly that
    // height the mask covers the whole geometry, `nCol < n` fails, and the body gets no
    // fade record at all — so the flame stays at full brightness with your face in it. The
    // bed has to sit at the site CENTRE, where padY is the ground by definition; three
    // metres out the hill has already moved and the height would be a guess.
    {
      const gy0 = api.padY;
      k.solid.cyl(0.40, 0.30, 0.10, 9, 0, gy0 + 0.04, 0, C.ash);
      k.glow.pane(0.66, 0.66, 0, gy0 + 0.16, 0, PANE_LAMP, 0, -Math.PI * 0.5, 6, 6);
      api.emit({ kind: 'circle', x: 0, z: 0, r: 0.44, y0: gy0 - 0.2, y1: gy0 + 0.20, tag: 'stone', standable: true });
    }

    // the burn barrel, behind the barrier, still going
    {
      const bx = -2.5, bz = -0.6, g = groundY(api, bx, bz);
      k.solid.tube(0.38, 0.34, 0.88, 10, bx, g + 0.44, bz, RUSTED);
      k.solid.cyl(0.34, 0.34, 0.05, 10, bx, g + 0.10, bz, shade(C.dark, 0.9));
      // the mouth: a small horizontal ember bed (0.36 m^2, far under the 2 m^2 ledger law)
      k.glow.pane(0.60, 0.60, bx, g + 0.86, bz, PANE_LAMP, 0, -Math.PI * 0.5, 6, 6);
      glowColumn(k.glow, bx, g + 0.84, bz, 0.32, 1.35, 0.66);
      api.emit({ kind: 'circle', x: bx, z: bz, r: 0.42, y0: g - 0.2, y1: g + 0.92, tag: 'metal' });
      // what they were burning, stacked beside it
      for (let i = 0; i < 5; i++) {
        k.solid.cyl(0.05, 0.07, r.range(0.7, 1.1), 4, bx + r.range(-0.9, -0.5), g + 0.06,
          bz + r.range(-0.8, 0.8), C.wood, r.range(0, TAU), Math.PI * 0.5);
      }
    }

    // the sandbags: a low wall between the barrel and the road
    {
      const g = groundY(api, -1.6, -0.1);
      for (let row = 0; row < 3; row++) {
        for (let i = 0; i < 4 - row; i++) {
          k.solid.box(0.56, 0.20, 0.34, -1.6 + (i - (3 - row) * 0.5) * 0.58 + row * 0.14,
            g + 0.11 + row * 0.20, -0.1 + r.range(-0.05, 0.05), shade(C.cloth, 0.44),
            r.range(-0.12, 0.12));
        }
      }
      api.emit({
        kind: 'obb', x: -1.6, z: -0.1, halfX: 1.20, halfZ: 0.28, yaw: 0,
        y0: g - 0.2, y1: g + 0.62, tag: 'wood', standable: true,
      });
    }

    // a car door stood up as a shield, leaning on the sandbags
    {
      const g = groundY(api, 0.1, -0.3);
      k.solid.box(1.05, 0.95, 0.09, 0.1, g + 0.52, -0.3, shade(C.metal, 0.9), 0.5, 0, 0.24);
      api.emit({ kind: 'obb', x: 0.1, z: -0.3, halfX: 0.55, halfZ: 0.16, yaw: 0.5, y0: g - 0.2, y1: g + 1.0, tag: 'metal' });
    }

    // brass on the ground, and a dropped lamp
    for (let i = 0; i < 7; i++) {
      const cx = r.range(-2.6, 0.6), cz = r.range(-1.2, 0.6);
      k.solid.cyl(0.012, 0.012, 0.06, 4, cx, groundY(api, cx, cz) + 0.012, cz,
        shade(C.rust, 1.1), r.range(0, TAU), Math.PI * 0.5);
    }

    api.cast([
      // at the barrel, not moving
      { species: 'standing', lx: -3.9, lz: -1.5, yaw: 0, awake: false },
      // and its dog, out past the light
      { species: 'hound', lx: -1.2, lz: -3.2, yaw: 0, awake: false },
    ]);
    k.glowColour = GLOW.ember;
    k.ember = true;
    return k;
  },

  /**
   * WRECK SCENE — "a wreck with the doors open and a body in the road".
   *
   * Both doors standing open, the boot up, one wheel off, glass across the ground, a drag
   * mark leading away from the driver's door, and the driver face down at the end of it,
   * out toward the road where you cannot miss him. Two hounds stand over him.
   *
   * The hounds are placed 1.8 m clear of the body's collider so enemies.spawn's canOccupy
   * test cannot refuse them (see the header).
   */
  'wreck-scene': (api) => {
    const k = kits();
    const r = api.rng;
    const yaw = r.range(-0.5, 0.5) + Math.PI * 0.5;   // slewed across, not parked
    const { gy } = carShell(k, api, -0.6, -1.2, yaw, { rust: true, open: 1.25, wheelOff: true, disabled: true, roll: r.range(-0.10, 0.10) });

    // the boot lid, up
    {
      const bx = -0.6 - Math.cos(yaw) * 2.0, bz = -1.2 + Math.sin(yaw) * 2.0;
      k.solid.box(1.30, 0.08, 1.05, bx, gy + 1.62, bz, RUSTED, yaw, 0, -1.15);
    }
    // glass and trim, thrown clear
    for (let i = 0; i < 12; i++) {
      const gx = r.range(-3.2, 2.2), gz = r.range(-3.0, 2.6);
      k.solid.box(r.range(0.06, 0.16), 0.02, r.range(0.06, 0.16), gx,
        groundY(api, gx, gz) + 0.012, gz, C.glass, r.range(0, TAU));
    }
    // THE DRAG MARK — the line that makes the scene one sentence instead of two objects.
    // Narrow and dark: the first cut used seven 0.8 x 1.4 m quads at 0.48 of C.soil and
    // under the torch they read as sheets of paper across the ground rather than as turned
    // earth (tests/shots/staged-wreck-scene-near.png).
    for (let i = 0; i < 6; i++) {
      const t = i / 5;
      const dx = -0.6 + t * 2.0, dz = -1.2 + t * 5.0;
      k.solid.quad(r.range(0.28, 0.42), r.range(0.8, 1.2), dx, groundY(api, dx, dz) + 0.010, dz,
        shade(C.soil, 0.30), r.range(-0.2, 0.2) + 0.38, -Math.PI * 0.5);
    }
    // THE BODY IN THE ROAD
    fallenBody(k, api, 1.5, 3.9, r.range(-0.4, 0.4), 1.0);

    // a suitcase burst open where it was dropped
    {
      const sx = 0.6, sz = 1.4, g = groundY(api, sx, sz);
      k.solid.box(0.72, 0.18, 0.50, sx, g + 0.09, sz, shade(C.dark, 1.25), 0.7);
      k.solid.box(0.70, 0.06, 0.46, sx + 0.5, g + 0.03, sz + 0.35, shade(C.cloth, 0.40), 1.1);
      for (let i = 0; i < 5; i++) {
        k.solid.quad(r.range(0.18, 0.30), r.range(0.20, 0.32), sx + r.range(-1.0, 1.4),
          g + 0.014, sz + r.range(-0.9, 1.2), shade(C.cloth, 0.34), r.range(0, TAU), -Math.PI * 0.5);
      }
      api.emit({ kind: 'circle', x: sx, z: sz, r: 0.42, y0: g - 0.2, y1: g + 0.20, tag: 'wood', standable: true });
    }

    api.cast([
      { species: 'hound', lx: 3.3, lz: 3.6, yaw: 0, awake: false },
      { species: 'hound', lx: 0.1, lz: 5.4, yaw: 0, awake: false },
    ]);
    return k;
  },

  /**
   * BLIND WITH ITS OWNER UNDER IT — "a blind with a rifle still in it and its owner
   * underneath".
   *
   * The blind is sites.js's blind (same legs, same box, same ladder) with three changes
   * that make it a scene: the rifle is still sticking out of the slot, the ladder has lost
   * a rung and the top of it is broken away from the platform, and the man who was up
   * there is face down in the leaves at the bottom. One of his friends is standing at the
   * foot of the ladder looking up, and there is something dormant in the ground beside it.
   */
  'blind-owner': (api) => {
    const k = kits();
    const r = api.rng;
    const legH = 2.7;
    const gy = api.padY;
    for (let i = 0; i < 4; i++) {
      const sx = (i & 1) ? 1 : -1, sz = (i & 2) ? 1 : -1;
      const lx = sx * 0.8, lz = sz * 0.8;
      k.solid.cyl(0.09, 0.11, legH + 0.4, 5, lx, groundY(api, lx, lz) + legH * 0.5, lz, C.wood);
    }
    k.solid.box(2.10, 0.14, 2.10, 0, gy + legH, 0, C.plank);
    k.solid.box(1.90, 1.50, 1.90, 0, gy + legH + 0.75, 0, C.plank);
    // the slot, facing away from the road, the way a blind faces
    k.solid.box(1.60, 0.50, 0.06, 0, gy + legH + 1.05, -0.98, C.dark);
    k.solid.gable(2.30, 2.30, gy + legH + 1.50, 0.40, 0, 0, 0, C.rust, 0);
    // THE RIFLE, still in the slot and still pointing where he left it
    rifle(k, api, 0.15, -1.35, gy + legH + 0.98, 0.06, 0.10);
    // the ladder, with the third rung gone and the top of it torn off the platform
    for (let i = 0; i < 6; i++) {
      if (i === 2) continue;
      k.solid.box(0.72, 0.06, 0.06, 0, gy + 0.40 + i * 0.44, 1.16, C.wood, 0, 0, i === 5 ? 0.5 : 0);
    }
    for (const s of [-1, 1]) {
      k.solid.cyl(0.05, 0.05, 2.9, 4, s * 0.34, gy + 1.35, 1.16, C.wood, 0, 0.06 * s, 0);
    }
    api.emit({ kind: 'circle', x: 0, z: 0, r: 1.28, y0: gy - 0.25, y1: gy + legH + 2.2, tag: 'wood' });

    // THE OWNER, face down under his own blind
    fallenBody(k, api, -1.35, 1.05, r.range(1.6, 2.4), 0.8);
    // his hat, further away than he is
    k.solid.cyl(0.17, 0.19, 0.09, 8, -2.6, groundY(api, -2.6, 2.1) + 0.045, 2.1, shade(C.dark, 1.1), 0, 0.3);
    // a lamp knocked over, dead
    k.solid.box(0.16, 0.20, 0.16, -0.9, groundY(api, -0.9, 1.9) + 0.08, 1.9, shade(C.metal, 0.7), 0.9, 1.2);
    // the drag: something took him a metre and then let go
    for (let i = 0; i < 4; i++) {
      const t = i / 3;
      const dx = -1.35 - t * 1.5, dz = 1.05 + t * 0.9;
      k.solid.quad(0.55, 1.0, dx, groundY(api, dx, dz) + 0.010, dz, shade(C.soil, 0.5), 0.6, -Math.PI * 0.5);
    }

    api.cast([
      // at the foot of the ladder, looking up
      { species: 'poacher', lx: 0.4, lz: 2.9, yaw: 0, awake: false },
      // and one in the ground under the leaves, which is what happened to the owner
      { species: 'pallbearer', lx: -3.1, lz: -0.6, yaw: 0, awake: false },
    ]);
    return k;
  },

  /**
   * HEADLIGHT CAR — "a car with one headlight still burning and something sitting in it".
   *
   * A dead car pulled off the road, both doors shut, one headlight still on after
   * however long, and a shape behind the windscreen that does not move. The headlight
   * points AT something: a Pale is standing in the beam eight metres up the track. That is
   * the whole scene, and it reads in one glance from the verge because the beam and the
   * only pale-valued body in the roster are in the same line.
   *
   * The headlight is a `flicker` glow, run off the sim clock by places.js (never a timer).
   */
  'headlight-car': (api) => {
    const k = kits();
    const r = api.rng;
    // MEASURED, first pass: with the car pointed straight away from the road (yaw = PI/2)
    // you stand on the verge and see the BACK of a dark car, with the headlight and the
    // thing standing in it both hidden behind it — tests/shots/staged-headlight-car-road.png
    // read as "a car", full stop. So it is parked ACROSS your line instead, at about 55
    // degrees, and the beam sweeps left over open ground with the Pale at the end of it.
    // `put` sends car-local +X to site (cos yaw, -sin yaw), so the bonnet direction is
    // (fwdX, fwdZ) and everything downstream reads it off those two rather than
    // re-deriving it: getting that sign wrong is how you light the road you came in on.
    const yaw = 2.42 + r.range(-0.20, 0.20);
    const fwdX = Math.cos(yaw), fwdZ = -Math.sin(yaw);
    const { gy, put } = carShell(k, api, 0, 0.6, yaw, { rust: false, disabled: true, roll: 0 });
    // the occupant
    {
      const p = put(0.35, -0.34);
      seatedShoulders(k, p.x, gy + 1.02, p.z, yaw + r.range(-0.3, 0.3));
    }
    // the one headlight that is still on: front-left in the car's own frame
    const hp = put(2.16, 0.60);
    k.glow.pane(0.44, 0.32, hp.x, gy + 0.74, hp.z, PANE_LAMP, yaw + Math.PI * 0.5, 0, 6, 5);
    // and a short column ON the lamp, because a flat pane is edge-on at 16 m and gone —
    // the same lesson the campfire's ember bed was rebuilt for (sites.js campfire, and its
    // measured 0 px of glow from eight road points of ten).
    glowColumn(k.glow, hp.x, gy + 0.60, hp.z, 0.20, 0.52, 0.50);
    // the beam it throws: a narrow column lying along the ground in front of it. This is the
    // arrow that points at the Pale, and it is the only reason the scene reads as one thing.
    {
      const b = put(4.6, 0.35);
      glowColumn(k.glow, b.x, groundY(api, b.x, b.z) + 0.02, b.z, 0.55, 0.5, 0.20);
    }
    // the dead one, dark
    const dp = put(2.16, -0.60);
    k.solid.box(0.34, 0.26, 0.10, dp.x, gy + 0.74, dp.z, shade(C.dark, 0.8), yaw + Math.PI * 0.5);

    // the track it pulled onto, and what is lying on it
    for (let i = 0; i < 5; i++) {
      const tx = r.range(-1.6, 1.6), tz = r.range(2.0, 4.4);
      k.solid.quad(r.range(0.7, 1.3), r.range(0.9, 1.6), tx, groundY(api, tx, tz) + 0.010, tz,
        shade(C.soil, 0.62), r.range(0, TAU), -Math.PI * 0.5);
    }
    {
      const g = groundY(api, 1.9, 1.5);
      k.solid.box(0.44, 0.36, 0.30, 1.9, g + 0.18, 1.5, shade(C.cloth, 0.58), r.range(0, TAU), 0, 0.3);
      api.emit({ kind: 'circle', x: 1.9, z: 1.5, r: 0.30, y0: g - 0.2, y1: g + 0.40, tag: 'wood', standable: true });
    }

    api.cast([
      // standing in the beam. Dread-owned: no XP, outside the pressure budget, and it only
      // moves while you are not looking at it.
      { species: 'pale', lx: fwdX * 8.2, lz: 0.6 + fwdZ * 8.2, yaw: 0, awake: false },
    ]);
    k.glowColour = GLOW.lamp;
    k.flicker = { x: hp.x, y: gy + 0.74, z: hp.z };
    return k;
  },

  /**
   * DUG OUT — "a ring of graves that has been dug OUT rather than in".
   *
   * Seven graves in a ring, every one of them open, and the spoil is heaped on the OUTSIDE
   * of each hole. That is the whole idea and it is one glance: earth thrown outward means
   * it was dug from the inside. The lids are thrown clear, the ropes are still on the
   * winch, and one grave has not been opened yet.
   *
   * A hole is a rim of four low boxes around a black quad, not a real hole — the terrain is
   * a heightfield this file may not cut. The rim is what sells it: the ground stands proud
   * of the darkness inside it.
   */
  'dug-out': (api) => {
    const k = kits();
    const r = api.rng;
    const R = 4.3;
    const cast = [];
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * TAU + 0.22;
      const gx = Math.cos(a) * R, gz = Math.sin(a) * R;
      const g = groundY(api, gx, gz);
      const shut = i === 4;                       // the one nobody has opened
      const gyaw = a + Math.PI * 0.5;

      if (shut) {
        // still closed: a mound, risen the ordinary way, with a stone at its head
        const m = new THREE.SphereGeometry(1, 9, 5, 0, TAU, 0, Math.PI * 0.5);
        m.scale(0.92, 0.34, 1.55);
        k.solid.at(m, shade(C.soil, 0.95), gx, g - 0.04, gz, gyaw);
        headstone(k, api, gx - Math.cos(a) * 1.5, gz - Math.sin(a) * 1.5,
          { kind: 'gothic', yaw: gyaw + Math.PI, tall: 1.05, sink: -0.02 });
        continue;
      }

      // THE HOLE. A black pane on the floor, and a rim of turned earth around it.
      //
      // MEASURED, first pass: at a rim 0.24 m high the open graves were invisible from
      // standing eye height — tests/shots/staged-dug-out-near.png read as mounds and poles
      // and no holes at all. A hole in a heightfield this file may not cut only exists if
      // the RIM stands proud enough to shade it, so the rim is 0.40 m and the pane inside
      // it is the darkest value in the file.
      k.solid.quad(1.15, 2.15, gx, g + 0.008, gz, shade(C.dark, 0.22), gyaw, -Math.PI * 0.5);
      for (const s of [-1, 1]) {
        // long sides of the rim
        k.solid.box(0.40, 0.40, 2.40, gx + Math.cos(gyaw) * s * 0.72, g + 0.16,
          gz - Math.sin(gyaw) * s * 0.72, shade(C.soil, r.range(0.80, 1.10)), gyaw, 0, r.range(-0.1, 0.1));
        // short ends
        k.solid.box(1.50, 0.36, 0.36, gx + Math.sin(gyaw) * s * 1.20, g + 0.14,
          gz + Math.cos(gyaw) * s * 1.20, shade(C.soil, r.range(0.80, 1.10)), gyaw);
      }
      // THE SPOIL, thrown OUTWARD — the whole point of the scene
      {
        const sx = gx + Math.cos(a) * 1.9, sz = gz + Math.sin(a) * 1.9;
        const sg = groundY(api, sx, sz);
        const m = new THREE.SphereGeometry(1, 9, 5, 0, TAU, 0, Math.PI * 0.5);
        m.scale(r.range(1.15, 1.55), r.range(0.42, 0.66), r.range(0.95, 1.30));
        k.solid.at(m, shade(C.soil, r.range(0.85, 1.15)), sx, sg - 0.06, sz, a);
        api.emit({ kind: 'circle', x: sx, z: sz, r: 0.85, y0: sg - 0.3, y1: sg + 0.45, tag: 'soil', standable: true });
        // clods, flung further than the heap
        for (let j = 0; j < 3; j++) {
          const cx = sx + r.range(-1.4, 1.4), cz = sz + r.range(-1.4, 1.4);
          k.solid.box(r.range(0.14, 0.26), r.range(0.08, 0.14), r.range(0.14, 0.26),
            cx, groundY(api, cx, cz) + 0.05, cz, shade(C.soil, r.range(0.75, 1.05)), r.range(0, TAU));
        }
      }
      // THE LID, thrown clear, on the outside as well. Every other one is STOOD UP against
      // its own spoil heap: a coffin lid on end is 1.95 m of vertical read, and it is the
      // only thing in this scene that is taller than the grass at a glance.
      {
        const lx = gx + Math.cos(a + 0.9) * 2.4, lz = gz + Math.sin(a + 0.9) * 2.4;
        const lg = groundY(api, lx, lz);
        if (i % 2 === 0) {
          k.solid.box(0.86, 1.95, 0.10, lx, lg + 0.94, lz, shade(C.plank, 0.70), a + 0.9, 0, r.range(0.18, 0.34));
          api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.45, halfZ: 0.20, yaw: a + 0.9, y0: lg - 0.2, y1: lg + 1.9, tag: 'wood' });
        } else {
          k.solid.box(0.86, 0.10, 1.95, lx, lg + 0.05, lz, shade(C.plank, 0.70), a + r.range(0.4, 1.4), 0, r.range(-0.15, 0.15));
          api.emit({ kind: 'obb', x: lx, z: lz, halfX: 0.45, halfZ: 1.0, yaw: a + 0.9, y0: lg - 0.2, y1: lg + 0.14, tag: 'wood', standable: true });
        }
      }
      // the marker at the head, leaning back from its own hole
      headstone(k, api, gx - Math.cos(a) * 1.55, gz - Math.sin(a) * 1.55,
        { kind: ['gothic', 'shouldered', 'broken', 'cross'][i % 4], yaw: gyaw + Math.PI, sink: -0.03 });
    }

    // the winch in the middle, with the ropes still on it and both ends slack
    {
      const g = groundY(api, 0, 0);
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * TAU;
        k.solid.cyl(0.05, 0.07, 2.6, 4, Math.cos(a) * 0.62, g + 1.20, Math.sin(a) * 0.62, C.wood,
          a + Math.PI * 0.5, 0.48);
      }
      k.solid.tube(0.13, 0.13, 0.70, 8, 0, g + 2.25, 0, shade(C.metal, 0.8), 0, 0, Math.PI * 0.5);
      k.solid.cyl(0.02, 0.02, 1.7, 4, 0.2, g + 1.45, 0.1, shade(C.cloth, 0.5), 0.3, 0.15);
      api.emit({ kind: 'circle', x: 0, z: 0, r: 0.75, y0: g - 0.25, y1: g + 2.4, tag: 'wood' });
    }

    // one lantern on a post so the ring reads from the verge at all
    lantern(k, api, R * 0.86, R * 0.86, 0.08, 0.62);

    // One still in the ground, and one already up and standing at the rim of its own grave.
    // awake false everywhere: this is a tableau you walk into, not an ambush at 150 m.
    //
    // TWO bodies, not three, and the count is a POOL decision rather than a taste one.
    // species.js POOL gives the county 8 pallbearers, 5 of the Standing Kind and 6 Pales for
    // ALL time, and enemies.js cull() (:2221) deliberately refuses to take a staged body that
    // has never noticed you — which is the whole point, a scene has to still be there when
    // you come back, and it means a staged body holds its slot for the life of the save.
    // Counting every staged scene the county lays: pallbearer 8 of 8, standing 5 of 5,
    // pale 5 of 6, poacher 8 of 8, hound 12 of 16. Adding one more anywhere means some
    // scene, somewhere, silently places nobody. See docs/ROUND-7/HANDOFF-C.md item 3.
    cast.push({ species: 'pallbearer', lx: Math.cos(0.22) * R, lz: Math.sin(0.22) * R, yaw: 0, awake: false });
    cast.push({ species: 'standing', lx: Math.cos(0.22 + TAU * 5 / 7) * (R + 2.7), lz: Math.sin(0.22 + TAU * 5 / 7) * (R + 2.7), yaw: 0, awake: false });
    api.cast(cast);
    return k;
  },

  /**
   * THE GRAVEYARD — he named it: "omg, the graveyard from fetch would be so cool."
   *
   * donor: Projects/qualiacology/fetch/src/atmosphere.js:305-435, :447-462, :518-540 and
   *   :546-562 (`buildGraveyardDress`), read 2026-09-03 in the LIVE SITE COPY at
   *   Projects/qualiacology/fetch/src — AGENTS.md says Projects/fetch-claude is stale and
   *   _wt-fetch-base is older than the site, and this is the copy Alex has played.
   *
   * What FETCH's yard actually is, and what makes it worth lifting: it is DRESS, not a
   * level. Ranks of stones on a loose grid with 22% of the cells left empty, five silhouette
   * families, no two weathered the same, a third of them sinking, a mound in front of every
   * one, four lanterns on the walk, and three mourner statues with their heads turned away
   * at the boundary. All of that is in `headstone` and `mourner` above.
   *
   * What is NEW here, and it is the thing that makes it a CURFEW place rather than a copy:
   * one of them is already out of its grave. You come through the lych-gate and there is a
   * figure standing in the walk that is not one of the statues — a `pale`, dread-owned, no
   * XP, outside the pressure budget, and it only creeps while you are not looking at it — and
   * two pallbearers still under the mounds behind it, dormant until the first noise.
   */
  graveyard: (api) => {
    const k = kits();
    const r = api.rng;
    // Six ranks by five, 22% skipped, exactly FETCH's density (atmosphere.js:331-348).
    // The near two ranks are dropped so the gate and the lanterns are what you see from the
    // road, not the backs of thirty stones.
    const KINDS = ['gothic', 'gothic', 'shouldered', 'broken', 'obelisk', 'cross'];
    let sunkCount = 0, stoneCount = 0;
    for (let row = 0; row < 6; row++) {
      for (let col = 0; col < 5; col++) {
        if (r.next() < 0.22) continue;
        const lx = -7.4 + col * 3.7 + r.range(-0.7, 0.7);
        const lz = -1.6 - row * 2.9 + r.range(-0.6, 0.6);
        const kind = KINDS[Math.floor(r.next() * KINDS.length)];
        const st = headstone(k, api, lx, lz, { kind, yaw: 0 });
        stoneCount++;
        if (st.sunken) sunkCount++;
      }
    }
    void sunkCount; void stoneCount;

    // THE GATE. FETCH frames its opening with two taller stones and never blocks it
    // (atmosphere.js:351-353). Here it is a lych-gate: two posts, a lintel, and the two
    // tallest stones in the yard standing either side of the way in.
    {
      const gz = 1.2;
      for (const s of [-1, 1]) {
        const px = s * 1.55, pg = groundY(api, px, gz);
        k.solid.box(0.30, 2.55, 0.30, px, pg + 1.27, gz, shade(C.wood, 0.55), 0, 0, s * 0.03);
        api.emit({ kind: 'circle', x: px, z: gz, r: 0.26, y0: pg - 0.3, y1: pg + 2.6, tag: 'wood' });
      }
      const lg = groundY(api, 0, gz);
      k.solid.box(3.70, 0.26, 0.34, 0, lg + 2.62, gz, shade(C.wood, 0.55));
      k.solid.gable(4.10, 1.30, lg + 2.75, 0.44, 0, 0, gz, shade(C.slate, 0.70), 0);
      headstone(k, api, -2.9, 0.4, { kind: 'gothic', tall: 1.70, wide: 1.05, sink: -0.02, yaw: 0 });
      headstone(k, api, 2.9, 0.4, { kind: 'gothic', tall: 1.78, wide: 1.05, sink: -0.02, yaw: 0 });
    }

    // the wall: a low rubble course down each side, so the yard has an edge
    for (const s of [-1, 1]) {
      for (let i = 0; i < 7; i++) {
        const wx = s * (9.4 + r.range(-0.25, 0.25)), wz = 0.2 - i * 2.7;
        const wg = groundY(api, wx, wz);
        k.solid.box(0.46, r.range(0.55, 0.85), 2.55, wx, wg + 0.34, wz, shade(C.stone, r.range(0.55, 0.88)),
          r.range(-0.05, 0.05), 0, r.range(-0.06, 0.06));
        api.emit({
          kind: 'obb', x: wx, z: wz, halfX: 0.26, halfZ: 1.30, yaw: 0,
          y0: wg - 0.3, y1: wg + 0.80, tag: 'stone', standable: true,
        });
      }
    }

    // THE LANTERNS on the walk. FETCH's four, re-spaced to this yard's depth.
    lantern(k, api, -1.9, -2.4, -0.16, 0.62);
    lantern(k, api, 2.1, -8.0, 0.12, 0.62);
    lantern(k, api, -2.4, -14.2, -0.08, 0.62);

    // THE THREE MOURNERS at the boundary, heads averted. FETCH's own three.
    mourner(k, api, -8.6, -5.4, 0.45);
    mourner(k, api, 8.2, -10.6, -0.75);
    mourner(k, api, -7.9, -16.4, 0.18);

    // the sexton's barrow and his spade, left where the work stopped
    {
      const bx = 4.6, bz = -3.4, g = groundY(api, bx, bz);
      k.solid.box(0.72, 0.34, 1.05, bx, g + 0.42, bz, shade(C.metal, 0.85), 0.6, 0.25);
      k.solid.tube(0.22, 0.22, 0.10, 8, bx + 0.5, g + 0.22, bz + 0.35, shade(C.dark, 0.9), 0.6, 0, Math.PI * 0.5);
      k.solid.cyl(0.03, 0.03, 1.20, 4, bx - 0.7, g + 0.55, bz - 0.4, C.wood, 0.9, 0.5);
      k.solid.box(0.20, 0.02, 0.30, bx - 0.7 - 0.5, g + 0.06, bz - 0.4 - 0.4, shade(C.metal, 0.9), 0.9, 0.5);
      api.emit({ kind: 'obb', x: bx, z: bz, halfX: 0.40, halfZ: 0.55, yaw: 0.6, y0: g - 0.2, y1: g + 0.62, tag: 'metal', standable: true });
    }

    // AND THE PALLBEARERS ARE ALREADY STANDING.
    //
    // MEASURED: the first cut stood one of them 0.03 m INSIDE a headstone's collider and
    // enemies.spawn refused it (tests/staged.mjs (d)), which looks from the road exactly
    // like a scene with an empty cast. The stones sit on a lattice at x = -7.4 + col * 3.7
    // and z = -1.6 - row * 2.9 with +-0.7 / +-0.6 of jitter, so the cast stands in the WALK
    // between them: half a column across and half a row down, which is the widest gap the
    // yard has and leaves 0.7 m of clearance in the worst jitter.
    // ONE Pale standing in the walk where you cannot miss it from the gate, and two
    // pallbearers still under the mounds behind it — dormant, so the yard is quiet until
    // the first shot and then it is not. The split is a pool decision, not a taste one:
    // see the note in `dug-out` and docs/ROUND-7/HANDOFF-C.md item 3.
    api.cast([
      { species: 'pale', lx: -1.85, lz: -5.95, yaw: 0, awake: false },
      { species: 'pallbearer', lx: 1.85, lz: -9.45, yaw: 0, awake: false },
      { species: 'pallbearer', lx: -5.55, lz: -13.00, yaw: 0, awake: false },
    ]);
    return k;
  },
};

export default STAGED_BUILDERS;
