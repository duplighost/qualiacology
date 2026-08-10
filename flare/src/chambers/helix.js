// THE HELIX — chamber 2, and the first time the game shows you what you made.
//
// docs/DESIGN.md: "RELAY's 34 m spiral ramp around an open shaft, 3.25 turns,
// with a real hole in the deck and three doorways in the handrail. A running
// fight upward with enemies above and below you on the same ramp. LIGHT RULE:
// your scars stay behind and below, so you can look down through the shaft at
// the entire fight you just had, spiralling."
//
// THE LIGHT RULE IS A GEOMETRY PROBLEM, so it is solved with geometry:
//
//   1. THE INNER EDGE OF THE RAMP CARRIES NO RAIL. The handrail is on the OUTER
//      edge (`rampOuterR + railOffset`) because that is where collide.js's
//      swept-annulus resolver puts it. The shaft side gets a 0.26 m toe kerb and
//      nothing else, so from anywhere on the climb you are standing at the lip
//      of a 34 m well with an unobstructed view down it.
//
//   2. THE VIEW ACROSS THE SHAFT IS THE VIEW THAT WORKS. Straight down you see
//      the turn directly beneath you and no further. Across the shaft you see
//      the far side of the turn 5.2 m below (the half-turn offset), and the one
//      10.4 m below that, and the one below that — each an inner rim of amber.
//      From the top of turn 3 the line to the far inner edge of turn 1 leaves at
//      58 degrees and clears everything, which is why the ramp reads as a spiral
//      of light and not as a stack of floors.
//
//   3. THE DECK LOOKS DOWN TWICE. Through the central hole (r < 5.15) you see
//      the floor 34 m below. Over the OUTER rim (r > 19.5, an open moat out to
//      the drum wall) you look down PAST the handrail at the whole spiral from
//      outside it. That second view is the money shot and it is the reason the
//      deck is an annulus in a 26 m drum rather than a lid on a 10 m tube.
//
// AND IT IS THE CHAMBER THAT TESTS D5. Adjacent turns are 10.377 m apart, so the
// irradiance projection's height attenuation exp(-|y - G/R| / 4.5) puts a fight
// one turn down at 10.0% and two turns down at 0.99% of the floor you are
// standing on — MEASURED, in tests/traversal.mjs, against the 3-D simulation,
// which puts both at exactly zero. That is the whole claim of the RG16F
// mean-height channel and this is the only room in the game that can make it.
//
// It is also the room that finds its LIMIT. The projection has one layer, so
// three kills stacked one turn apart average their heights onto the middle one
// and render its floor at 3.00x the light illuminationAt grants it. The chamber's
// own answer is that the three holding-ground nodes — the ground the director
// deliberately makes bright — do not sit above one another; the general answer is
// a handoff filed to W1-RENDER. Both numbers are in the gate.
//
// THE NUMBERS ARE NOT MINE. Every dimension of the ramp, the rail, the deck and
// its slot lives in `GROUND.helix` and is read from there, because the analytic
// ground IS the ramp: `groundAt` supplies the walking surface and `resolveRail`
// supplies the handrail. This module authors what you SEE — and it is cut from
// the same expressions, `helixRampY`, `helixRailGap` and `helixDeckPresent`, so
// a mesh cannot disagree with the thing the player's feet are standing on. Two
// expressions is two decks, and the one they walk on is the one they fall
// through (docs/HANDOFF.md, W2-GROUND, 2026-08-10).
//
// DENSITY IS THE LOOK. A 26 m drum 41 m tall is the emptiest volume in the game
// unless it is filled: eight three-tier buttresses carry the deck, eight gantries
// bridge the moat, three catwalks run out from the rail doorways, and the drum
// wall is panelled, ribbed and hooped for its whole height. 2,943 instances,
// 371k triangles, 31 draw calls, per-instance yaw / scale / macro-noise tint on
// every one of them.
//
// NO THREE.JS. Frozen data plus pure generators, so the whole chamber — layout,
// collider bake, deck cut and ramp/ground agreement — is measured headless.

import FEEL from '../feel.js';
import { defineArena } from '../world/build.js';
import {
  GROUND, helixAngleAt, helixRampY, helixRailGap, helixDeckPresent, helixRisePerRadian,
} from '../world/ground.js';
import { hash2 } from '../core/rng.js';

const H = GROUND.helix;
const DIR = FEEL.director.chambers.helix;
const TAU = Math.PI * 2;
const cos = Math.cos, sin = Math.sin;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this chamber. CONTRACT §5. It holds only what the
// analytic ground does NOT already own — the drum around the spiral, and the
// rhythm the built geometry is laid out on.
// ---------------------------------------------------------------------------
export const HELIX = Object.freeze({
  // ---- the drum ----------------------------------------------------------
  wallR: 26,                 // the panelled face
  barrierR: 25.3,            // where the player actually stops (ribs protrude to 25.37)
  ceilingY: 41.6,
  clearanceY: 40.4,          // the head stop. 7.5 m of air over the deck: the player's
                             // jump apex is 2.67 m and the air-dash lift adds 11.5 m/s,
                             // so nothing they can do puts the camera in the slab.
  wallPanels: 40, wallTiers: 4, wallRibs: 20, wallHoops: 3, hoopSegs: 32,
  barrierSegs: 24, barrierTiers: 2,

  // ---- the ramp mesh -----------------------------------------------------
  // 80 segments per turn = 260 treads over 3.25 turns. Each tread is FLAT while
  // the analytic surface is a smooth helicoid, so the tread top and the walking
  // surface disagree by at most half a riser: 33.725 m / 260 / 2 = 6.5 cm.
  // (`PLACERS.list` carries no per-instance pitch, so a tilted tread is not
  // expressible today — see the handoff request. 260 is what makes the error
  // small enough not to matter meanwhile, and a 13 cm riser every 66 cm reads as
  // grip plate rather than as an artefact.)
  segsPerTurn: 80,
  ribEvery: 10, postEvery: 5,
  railTopH: 1.16, railMidH: 0.62, railToeH: 0.13,   // under railBandHi 1.23
  kerbH: 0.26,                                       // the shaft-side toe board

  // ---- the deck ----------------------------------------------------------
  // A rectangle inscribed in an annular sector has CORNERS OUTSIDE IT, and the
  // notch's boundary is where that stops being pedantry: an overhanging corner is
  // floor drawn over a 34 m hole. So the band that crosses the ramp is tiled with
  // narrow radial PLANKS (small tangential half-width = small corner overhang),
  // the ring inside it stops `bandInset` short of rampInnerR so its own corners
  // cannot reach the band at all, and the arc is inset by the computed overhang
  // plus `slotInset`. The mesh is then a strict subset of helixDeckPresent, and
  // what is left over is solid-but-undrawn floor no wider than 0.5 m — narrower
  // than the player's own 0.68 m diameter, so they can never stand on it.
  deckRingsOuter: 4,
  deckTileArc: 2.4,
  plankW: 0.45,
  bandInset: 0.12,
  slotInset: 0.012,

  // ---- the outer structure -----------------------------------------------
  buttressCount: 8, buttressR: 22.8, buttressTiers: 3, buttressRadius: 1.05,
  gantryPlates: 3, gantryHalfW: 1.6,
  catwalkHalfW: 1.7, catwalkPlateLen: 3.2,

  // ---- the lower floor ---------------------------------------------------
  floorRingStep: 2.9, floorRings: 10, floorPerRing: 46, rubbleRings: 12, rubblePerRing: 70,

  // ---- placement ---------------------------------------------------------
  portalInset: 1.1,
  startRadius: 16,
  holdR: 3.4,

  lightGoal: 28,             // 34 bodies x mean deposit 1.275 (husk .50 / runner .30 /
                             // lantern .20) x 0.725 for merges. A ramp strings kills
                             // along a line, so FIELD.mergeDist 6 m merges about half
                             // of them — twice INTAKE's rate, and the reason this is
                             // not simply 34 * 1.275.
  maxSightline: 46,          // floor to deck is 34 m; the longest sightline the fight
                             // actually uses is up the shaft plus lateral.

  // THE PALETTE. Same measured one-stop window W4 established on the real page
  // (docs/HANDOFF.md): an up-facing surface must land inside about 0x55..0x70 or
  // the room is either readable with no light in it or an off monitor. THE HELIX
  // sits at the metal end of it — INTAKE is cast concrete, this is a steel
  // structure hung in a concrete drum, so the ramp, rails and gantries carry the
  // warm oxidised value and the drum carries the cold one. Blue/yellow only: the
  // split is texture, never signal (CONTRACT §6).
  palette: Object.freeze({
    floor: 0x585e63,
    tread: 0x6c6659,          // the ramp: warm, oxidised, the thing you stand on
    steel: 0x716b5e,          // rails, ribs, gantries, catwalks
    deck: 0x5f656b,
    substructure: 0x676d73,
    concrete: 0x7a8086,       // the drum wall: what the flash finds at 26 m
    dark: 0x393d41,
  }),
});

const P = HELIX.palette;

// ---------------------------------------------------------------------------
// DERIVED FROM THE GROUND, NEVER RE-TYPED
// ---------------------------------------------------------------------------
const SWEEP = TAU * H.rampTurns;
const R_MID = (H.rampInnerR + H.rampOuterR) * 0.5;
const R_HALF = (H.rampOuterR - H.rampInnerR) * 0.5;
const R_RAIL = H.rampOuterR + H.railOffset;
const FLOOR_Y = H.lowerFloorY;
// THE DECK'S WALKING SURFACE IS `deckY`, NOT `deckY + deckLift`. groundAt returns
// the bare `h.deckY`; only helixRampY's top endpoint carries the 3.5 cm lift, so
// the ramp ARRIVES 3.5 cm proud of the deck and steps down onto it. Building the
// deck mesh at 34.035 would have put every surface in this room 3.5 cm above the
// floor the player's feet are actually on — invisible in a screenshot, and the
// exact class of render/physics divergence groundAt exists to make impossible.
const DECK_Y = H.deckY;
const DECK_HALF = H.thickness * 0.5;             // top AND underside exact
const SEGS = Math.round(HELIX.segsPerTurn * H.rampTurns);
const SEG_A = SWEEP / SEGS;
const TREAD_HALF = H.thickness * 0.5;
const RISE = helixRisePerRadian(H);

/** The angular sector the deck is missing, straight out of helixDeckPresent's rule. */
const NOTCH_T = (H.deckY - H.deckSlot - H.lowerFloorY - H.surfaceLift)
  / (DECK_Y - H.lowerFloorY - H.surfaceLift);
const NOTCH_ARC = SWEEP * (1 - NOTCH_T);

export const ang = t => helixAngleAt(H, t);
export const rampY = t => helixRampY(H, t);

// Local X -> tangent, local Z -> radial out. Treads, rails, deck tiles, hoops.
const yawTangent = a => Math.PI * 0.5 - a;
// Local X -> radial out, local Z -> tangent. Ribs, joists, gantries, catwalks.
const yawRadial = a => -a;
// Front face (local +Z) toward the axis. Wall panels and portal frames.
const yawInward = a => Math.atan2(-cos(a), -sin(a));

const at = (a, r, y, yaw, sx, sy, sz) => ({ x: cos(a) * r, y, z: sin(a) * r, yaw, sx, sy, sz });
/** Stable per-instance variation with no rng: the same room every rebuild. */
const vary = (lo, hi, s0, s1) => lo + (hi - lo) * hash2(s0, s1);

// ---------------------------------------------------------------------------
// THE RAMP — 260 treads, a shaft-side kerb, ribs underneath, and a rail that is
// solid except at exactly the three doorways `helixRailGap` declares.
// ---------------------------------------------------------------------------
function treads() {
  const out = [];
  // Sized on the OUTER arc so neighbours butt at the rail and overlap at the
  // shaft edge. Sizing on the mid arc leaves a 12 cm wedge open at every outer
  // joint — 260 slots you can see the drop through, on the edge you fight along.
  const halfX = H.rampOuterR * SEG_A * 0.5 * 1.02;
  for (let i = 0; i < SEGS; i++) {
    const t = (i + 0.5) / SEGS;
    const a = ang(t);
    // A four-phase authored rhythm, not noise: the plate's thickened edge flips
    // between the shaft side and the rail side and the joints walk. Real tread
    // plate is laid in a pattern; automatic failure #10 is repetition, and the
    // answer to it here is cadence rather than jitter (jitter opens the seams).
    const ph = i & 3;
    out.push(at(a, R_MID, rampY(t) - TREAD_HALF,
      yawTangent(a) + (ph >= 2 ? Math.PI : 0),
      halfX * (1 + 0.04 * (ph & 1)), TREAD_HALF, R_HALF));
  }
  return out;
}

function rampKerbs() {
  const out = [];
  const r = H.rampInnerR + 0.2;
  const halfX = r * SEG_A * 1.04;                 // one kerb spans two treads
  for (let i = 0; i < SEGS; i += 2) {
    const t = (i + 1) / SEGS, a = ang(t);
    out.push(at(a, r, rampY(t) + HELIX.kerbH * 0.5, yawTangent(a),
      halfX, HELIX.kerbH * 0.5, vary(0.14, 0.19, i, 3.1)));
  }
  return out;
}

function rampRibs() {
  const out = [];
  for (let i = 0; i < SEGS; i += HELIX.ribEvery) {
    const t = (i + 0.5) / SEGS, a = ang(t);
    const sy = vary(0.40, 0.50, i, 7.7);
    out.push(at(a, R_MID, rampY(t) - H.thickness - sy, yawRadial(a), R_HALF + 0.22, sy, vary(0.24, 0.34, i, 9.3)));
  }
  return out;
}

/**
 * One rail piece per `every` treads, skipped wherever `helixRailGap` says there
 * is a doorway. BOTH ends are tested, not the midpoint: a piece spanning two
 * treads whose centre is outside the gap can still reach 0.4 m into it, and the
 * doorway is the one place the rail is allowed to not be there.
 */
function railRun(height, halfY, halfZ, every) {
  const out = [];
  const halfX = R_RAIL * SEG_A * 0.5 * 1.02 * every;
  for (let i = 0; i < SEGS; i += every) {
    const t = (i + every * 0.5) / SEGS;
    if (helixRailGap(H, t) || helixRailGap(H, i / SEGS) || helixRailGap(H, (i + every) / SEGS)) continue;
    const a = ang(t);
    out.push(at(a, R_RAIL, rampY(t) + height, yawTangent(a), halfX, halfY, halfZ));
  }
  return out;
}

function railPosts() {
  const out = [];
  for (let i = 0; i < SEGS; i += HELIX.postEvery) {
    const t = (i + 0.5) / SEGS;
    if (helixRailGap(H, t)) continue;
    const a = ang(t);
    const w = vary(0.050, 0.062, i, 11.9);
    out.push(at(a, R_RAIL, rampY(t), yawTangent(a) + vary(-0.4, 0.4, i, 13.3), w, HELIX.railTopH + 0.07, w));
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE DECK — seven rings. The three that cross the ramp's radial band are cut to
// the analytic notch; the rest are closed annuli. Every tile is a strict subset
// of `helixDeckPresent`, inset by HELIX.slotInset, so the failure mode is
// invisible-but-solid floor at the lip rather than floor you fall through.
// ---------------------------------------------------------------------------
const BAND_LO = H.rampInnerR - HELIX.bandInset;

function deckRings() {
  const rings = [
    [H.deckOpeningR, BAND_LO, false],
    [BAND_LO, R_MID, true],
    [R_MID, H.rampOuterR, true],
  ];
  // The outermost ring stops `bandInset` short of deckOuterR for the same corner
  // reason, in the other direction: past 19.5 the deck is not there either.
  const step = (H.deckOuterR - HELIX.bandInset - H.rampOuterR) / HELIX.deckRingsOuter;
  for (let k = 0; k < HELIX.deckRingsOuter; k++) {
    rings.push([H.rampOuterR + step * k, H.rampOuterR + step * (k + 1), false]);
  }
  return rings;
}

/** Arc inset for a notched ring, from its own tile width. See HELIX's comment. */
function notchInset(r0, r1, n) {
  const sx = r1 * ((TAU - NOTCH_ARC) / n) * 0.5;
  return Math.atan(sx / Math.max(H.rampInnerR, r0)) + HELIX.slotInset;
}

function deckTiles(want) {
  const out = [];
  for (const [r0, r1, notched] of deckRings()) {
    if (notched !== want) continue;
    const rM = (r0 + r1) * 0.5, half = (r1 - r0) * 0.5;
    const open = notched ? TAU - NOTCH_ARC : TAU;
    const n = Math.max(8, Math.round(r1 * open / (notched ? HELIX.plankW : HELIX.deckTileArc)));
    const a0 = notched ? notchInset(r0, r1, n) : 0;
    const span = open - a0 * 2;
    const da = span / n;
    for (let i = 0; i < n; i++) {
      const a = a0 + da * (i + 0.5);
      out.push(at(a, rM, DECK_Y - DECK_HALF, yawTangent(a) + ((i & 1) ? Math.PI : 0),
        r1 * da * 0.5 * (notched ? 1 : 1.02), DECK_HALF, half));
    }
  }
  return out;
}

function deckJoists() {
  const out = [];
  const n = HELIX.wallPanels;
  const rM = (H.deckOpeningR + H.deckOuterR) * 0.5;
  const half = (H.deckOuterR - H.deckOpeningR) * 0.5;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    // Skip the joists that would hang in the notch: the ramp arrives there.
    if (!helixDeckPresent(H, cos(a) * R_MID, sin(a) * R_MID)) continue;
    const sy = vary(0.26, 0.36, i, 17.1);
    out.push(at(a, rM, DECK_Y - H.thickness - sy, yawRadial(a), half, sy, vary(0.16, 0.24, i, 19.7)));
  }
  return out;
}

function ringKerbs(r, n, y, halfY, halfZ, seed) {
  const out = [];
  const halfX = r * (TAU / n) * 0.5 * 1.03;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push(at(a, r, y + halfY, yawTangent(a), halfX, halfY, vary(halfZ * 0.8, halfZ * 1.2, i, seed)));
  }
  return out;
}

/**
 * The coping along the notch's two radial cuts. It is not trim: it covers the
 * strip the inset left undrawn, so the visible hole and the real hole line up to
 * within a couple of centimetres instead of half a metre.
 */
function slotEdges() {
  const out = [];
  const n = Math.max(8, Math.round(R_MID * (TAU - NOTCH_ARC) / HELIX.plankW));
  const inset = notchInset(BAND_LO, R_MID, n);
  const w = inset * R_MID * 0.5;
  for (const a of [inset * 0.5, TAU - NOTCH_ARC - inset * 0.5]) {
    out.push(at(a, R_MID, DECK_Y - DECK_HALF, yawRadial(a), R_HALF + 0.08, DECK_HALF, w));
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE OUTER STRUCTURE — what makes a 26 m drum a room instead of a void, and
// what carries the deck. Eight buttresses in three tiers rise from the floor to
// the deck's underside; eight gantries bridge the 5.8 m moat and land on their
// heads; three catwalks run out from the rail doorways.
// ---------------------------------------------------------------------------
const BUTTRESS_A = [];
for (let i = 0; i < HELIX.buttressCount; i++) BUTTRESS_A.push((i / HELIX.buttressCount) * TAU);
const TIER_H = (H.deckY - H.thickness - FLOOR_Y) / HELIX.buttressTiers;

function buttressPieces(kind) {
  const out = [];
  for (let i = 0; i < BUTTRESS_A.length; i++) {
    const a = BUTTRESS_A[i];
    for (let k = 0; k < HELIX.buttressTiers; k++) {
      const base = FLOOR_Y + k * TIER_H;
      const w = HELIX.buttressRadius * vary(0.94, 1.06, i * 7 + k, 23.9);
      const spin = vary(0, TAU, i * 11 + k, 29.3);
      if (kind === 'shaft') out.push(at(a, HELIX.buttressR, base, spin, w, TIER_H, w));
      else if (kind === 'collar') out.push(at(a, HELIX.buttressR, base, spin, w * 1.38, TIER_H * 0.035, w * 1.38));
      else out.push(at(a, HELIX.buttressR, base + TIER_H - TIER_H * 0.05, spin, w * 1.16, TIER_H * 0.05, w * 1.16));
    }
  }
  return out;
}

const GANTRY_R0 = H.deckOuterR - 0.1;

function gantries() {
  const out = [];
  const half = (HELIX.barrierR - GANTRY_R0) / HELIX.gantryPlates * 0.5;
  for (let i = 0; i < BUTTRESS_A.length; i++) {
    const a = BUTTRESS_A[i];
    for (let k = 0; k < HELIX.gantryPlates; k++) {
      out.push(at(a, GANTRY_R0 + half * (2 * k + 1), DECK_Y - 0.16, yawRadial(a),
        half, 0.16, HELIX.gantryHalfW * vary(0.94, 1.06, i * 5 + k, 31.7)));
    }
  }
  return out;
}

/**
 * ONE collider per walkway instead of one per plate. Three coincident boxes are
 * three sets of broadphase cells and three dedupe keys for one surface, and
 * `bakeLayout` is a SINGLE unsliced job in build.js — so a chamber's collider
 * count lands whole inside one frame of the sliced build. 27 boxes saved here is
 * about a fifth of the bake. (Request filed to W4 to slice the bake per element;
 * this is the half of it that is mine.)
 */
function walkwayStops() {
  const out = [];
  for (const a of BUTTRESS_A) {
    out.push(at(a, (GANTRY_R0 + HELIX.barrierR) * 0.5, DECK_Y - 0.16, yawTangent(a),
      HELIX.gantryHalfW, 0.16, (HELIX.barrierR - GANTRY_R0) * 0.5));
  }
  for (const d of DOORS) {
    const r0 = H.rampOuterR - 0.05;
    out.push(at(d.a, (r0 + d.outR) * 0.5, d.y - 0.16, yawTangent(d.a),
      HELIX.catwalkHalfW, 0.16, (d.outR - r0) * 0.5));
  }
  return out;
}

/** One per rail doorway. `helixRailGap`'s own t values, never re-typed. */
const DOORS = H.railGaps.map((t, i) => Object.freeze({
  t,
  a: ((ang(t) % TAU) + TAU) % TAU,
  y: rampY(t),
  // The middle doorway lands on a buttress (its angle is 135 deg, which is one of
  // the eight); the outer two reach the wall between buttresses, 22.5 deg clear.
  onButtress: i === 1,
  outR: i === 1 ? HELIX.buttressR - 1.2 : HELIX.barrierR,
  // The frame stands at the catwalk's own far end, so `spawnX/spawnZ` (one
  // portalInset back along the inward normal) always lands ON the walkway.
  portalR: i === 1 ? HELIX.buttressR - 1.2 : HELIX.wallR,
  id: `p-door-${'abc'[i]}`,
}));

function catwalks() {
  const out = [];
  for (let d = 0; d < DOORS.length; d++) {
    const door = DOORS[d];
    const r0 = H.rampOuterR - 0.05;
    const n = Math.max(2, Math.round((door.outR - r0) / HELIX.catwalkPlateLen));
    const half = (door.outR - r0) / n * 0.5;
    for (let k = 0; k < n; k++) {
      out.push(at(door.a, r0 + half * (2 * k + 1), door.y - 0.16, yawRadial(door.a),
        half, 0.16, HELIX.catwalkHalfW * vary(0.95, 1.05, d * 9 + k, 37.1)));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE DRUM WALL. Four panelled tiers, ribs on every other joint, three hoops,
// and a separate collider-only ring that is the real boundary — so nothing
// decorative has to carry a collider and no baked box can approach the 40 m
// ribbon trap.
// ---------------------------------------------------------------------------
const WALL_H = HELIX.ceilingY - FLOOR_Y;
const WALL_TIER = WALL_H / HELIX.wallTiers;

/**
 * A panel is skipped where a portal frame stands in it — the frames are 3.2 m
 * tall and their faces are coplanar with the wall, so without this the doors are
 * buried in the panel run and the alcove behind them does not exist.
 */
function nearPortal(a, y0, y1, halfArc) {
  for (const p of PORTALS) {
    if (Math.hypot(p.x, p.z) < HELIX.barrierR) continue;   // not a wall door
    const d = Math.abs(((p.a - a + Math.PI) % TAU + TAU) % TAU - Math.PI);
    if (d > halfArc) continue;
    if (p.y + 3.3 < y0 || p.y - 0.4 > y1) continue;
    return true;
  }
  return false;
}

function wallPanels() {
  const out = [];
  const n = HELIX.wallPanels;
  const halfX = HELIX.wallR * (TAU / n) * 0.5 * 1.02;
  for (let k = 0; k < HELIX.wallTiers; k++) {
    const y0 = FLOOR_Y + WALL_TIER * k, y1 = y0 + WALL_TIER;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      if (nearPortal(a, y0, y1, (halfX + 1.6) / HELIX.wallR)) continue;
      const p = at(a, HELIX.wallR, (y0 + y1) * 0.5, yawInward(a),
        undefined, WALL_TIER * 0.5, undefined);
      p.half = halfX;
      out.push(p);
    }
  }
  return out;
}

function wallRibs() {
  const out = [];
  const n = HELIX.wallRibs;
  for (let k = 0; k < HELIX.wallTiers; k++) {
    for (let i = 0; i < n; i++) {
      const a = ((i + 0.5) / n) * TAU;
      const w = vary(0.48, 0.58, i * 4 + k, 41.3);
      out.push(at(a, HELIX.wallR, FLOOR_Y + WALL_TIER * k, vary(0, TAU, i * 3 + k, 43.7), w, WALL_TIER, w));
    }
  }
  return out;
}

function wallHoops() {
  const out = [];
  const n = HELIX.hoopSegs;
  const halfX = (HELIX.wallR - 0.4) * (TAU / n) * 0.5 * 1.03;
  for (let k = 0; k < HELIX.wallHoops; k++) {
    const y = FLOOR_Y + WALL_H * (k + 1) / (HELIX.wallHoops + 1);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      out.push(at(a, HELIX.wallR - 0.4, y, yawTangent(a), halfX, vary(0.24, 0.34, i * 2 + k, 47.9), 0.22));
    }
  }
  return out;
}

function barrierRing() {
  const out = [];
  const n = HELIX.barrierSegs, tiers = HELIX.barrierTiers;
  const depth = 0.5;
  const halfX = HELIX.barrierR * (TAU / n) * 0.5 * 1.06;
  const tierH = WALL_H / tiers;
  for (let k = 0; k < tiers; k++) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      out.push(at(a, HELIX.barrierR + depth, FLOOR_Y + tierH * (k + 0.5), yawTangent(a), halfX, tierH * 0.5, depth));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// THE LOWER FLOOR — where you land when you fall, and where the run starts.
// ---------------------------------------------------------------------------
/**
 * `keep` exists for the slice budget, not for the art. BUILD.maxJobMs is 1.5 and
 * one job is one element, so a 500-instance element is a 3 ms frame on a cold
 * build — measured on the shipping page, which is the only place the cold path
 * runs. Splitting the debris across alternate rings gives two jobs of half the
 * size that each cover the whole floor, and it buys two debris SCALES for free.
 */
function polarField(rings, perRing, rMax, y, seed, fn, keep) {
  const out = [];
  for (let k = 0; k < rings; k++) {
    if (keep && !keep(k)) continue;
    const r0 = rMax * (k + 1) / (rings + 1);
    const n = Math.max(4, Math.round(perRing * r0 / rMax));
    for (let i = 0; i < n; i++) {
      const a = ((i + vary(-0.4, 0.4, k * 31 + i, seed)) / n) * TAU;
      const r = r0 + vary(-1, 1, k * 17 + i, seed + 1) * HELIX.floorRingStep * 0.35;
      out.push(fn(a, r, y, k * 53 + i));
    }
  }
  return out;
}

const floorTiles = () => polarField(HELIX.floorRings, HELIX.floorPerRing, HELIX.barrierR - 1.2, FLOOR_Y + 0.015, 51.1,
  (a, r, y, s) => at(a, r, y, Math.round(vary(0, 4, s, 53.3)) * Math.PI * 0.5 + vary(-0.05, 0.05, s, 55.1),
    vary(0.9, 1.7, s, 57.7), 0.015, vary(0.9, 1.7, s, 59.9)));

const floorRubble = (odd, lo, hi) => polarField(HELIX.rubbleRings, HELIX.rubblePerRing, HELIX.barrierR - 0.8, FLOOR_Y, 61.1,
  (a, r, y, s) => at(a, r, y, vary(0, TAU, s, 63.3),
    vary(lo, hi, s, 67.7), vary(lo * 0.8, hi * 0.76, s, 71.3), vary(lo, hi * 0.95, s, 73.9)),
  k => ((k & 1) === odd));

/** Radial cable channels on the floor — eight runs from the drum to the shaft. */
function floorChannels() {
  const out = [];
  for (let i = 0; i < 8; i++) {
    const a = ((i + 0.5) / 8) * TAU;
    for (let k = 0; k < 7; k++) {
      const r = H.rampInnerR + 0.8 + k * 2.5;
      out.push(at(a, r, FLOOR_Y + 0.09, yawRadial(a), 1.25, 0.09, vary(0.20, 0.34, i * 8 + k, 79.1)));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// CRATES — the only cover in a chamber whose threats come from ABOVE and BELOW
// on the same ramp, which is why every ramp crate faces along the slope rather
// than at a wall: the two bearings that matter are uphill and downhill.
// ---------------------------------------------------------------------------
const RAMP_CRATE_T = [0.07, 0.13, 0.20, 0.32, 0.38, 0.45, 0.58, 0.64, 0.70, 0.82, 0.88, 0.94];

/**
 * Crates hug the two edges and alternate sides. The ramp is 3.80 m wide and the
 * player is 0.68 m across, so cover that reaches the centre-line is not cover,
 * it is a corner that looks passable and is not — THE INTAKE already paid for
 * that one. Every crate leaves at least 1.2 m of clear corridor down the middle,
 * and tests/traversal.mjs sweeps the whole ramp for the narrowest point rather
 * than trusting this arithmetic.
 */
function rampCrates() {
  const out = [];
  for (let i = 0; i < RAMP_CRATE_T.length; i++) {
    const t = RAMP_CRATE_T[i], a = ang(t);
    const side = (i & 1) ? 1 : -1;
    const sy = vary(0.46, 0.60, i, 83.3);
    out.push(at(a, R_MID + side * vary(1.22, 1.34, i, 89.1), rampY(t) + sy,
      yawTangent(a) + vary(-0.12, 0.12, i, 97.3),
      vary(0.52, 0.66, i, 101.1), sy, vary(0.40, 0.52, i, 103.7)));
  }
  return out;
}

function padCrates(list, y, seed) {
  return list.map((c, i) => {
    const sy = vary(0.46, 0.62, i, seed);
    return at(c[0], c[1], y + sy, vary(0, TAU, i, seed + 1),
      vary(0.62, 0.92, i, seed + 2), sy, vary(0.56, 0.84, i, seed + 3));
  });
}

const FLOOR_CRATES = [[0.4, 12], [1.5, 18], [2.4, 14], [3.1, 20], [4.35, 19], [4.7, 12], [5.5, 21], [6.0, 13]];
// The deck's ARRIVAL QUADRANT is deliberately bare. You come up through the slot
// at angle 0, and the first thing you should be able to do is walk to the rim and
// look back down the shaft at what you just made — which is the whole reason this
// chamber exists. Cover starts on the far side of the hole.
const DECK_CRATES = [[2.0, 12], [2.6, 16], [3.2, 13], [3.9, 17], [4.6, 12], [5.3, 15]];

// ---------------------------------------------------------------------------
// PORTALS. Eight, and the escalation is vertical: the floor first, then the rail
// doorways (which put bodies ON your ramp, above and below), then the deck.
// `spawnY` and `t` are carried because a chamber this tall cannot be spawned
// into from an (x, z) pair — see the request filed to W10 in docs/HANDOFF.md.
// ---------------------------------------------------------------------------
const portal = (id, a, r, y, tier, t) => {
  const nx = -cos(a), nz = -sin(a);
  return Object.freeze({
    id, x: cos(a) * r, y, z: sin(a) * r, nx, nz,
    yaw: Math.atan2(nx, nz),
    spawnX: cos(a) * r + nx * HELIX.portalInset,
    spawnZ: sin(a) * r + nz * HELIX.portalInset,
    spawnY: y, tier, t: t === undefined ? -1 : t, a,
  });
};

// THE ARRIVAL. You come up from THE INTAKE under the first catwalk, so the door
// you walked in through is 8.7 m of steel over your head from the first frame,
// and the ramp foot is a quarter-turn around the drum — you have to walk past
// the shaft to find the way up, which is how the room introduces itself.
const START_A = DOORS[0].a;

const PORTALS = Object.freeze([
  portal('p-arrival', START_A, HELIX.wallR, FLOOR_Y, 0),
  portal('p-floor-a', 0, HELIX.wallR, FLOOR_Y, 0),
  portal('p-floor-b', TAU / 3, HELIX.wallR, FLOOR_Y, 0),
  portal('p-floor-c', TAU * 2 / 3, HELIX.wallR, FLOOR_Y, 0),
  ...DOORS.map(d => portal(d.id, d.a, d.portalR, d.y, H.tierRamp, d.t)),
  portal('p-deck-n', Math.PI / 2, HELIX.barrierR, DECK_Y, H.tierDeck),
  portal('p-deck-s', -Math.PI / 2, HELIX.barrierR, DECK_Y, H.tierDeck),
]);

// ---------------------------------------------------------------------------
// HOLDING GROUND — one per tier, so "does the next thing die here or up there"
// is a question about ALTITUDE in the one chamber where altitude is the subject.
// ---------------------------------------------------------------------------
const HOLD = Object.freeze([
  Object.freeze({
    id: 'hold-foot', x: cos(START_A + 0.5) * 12, y: FLOOR_Y, z: sin(START_A + 0.5) * 12,
    r: HELIX.holdR + 0.6, role: 'floor',
  }),
  Object.freeze({
    id: 'hold-mid', x: cos(DOORS[1].a) * R_MID, y: DOORS[1].y, z: sin(DOORS[1].a) * R_MID,
    r: 2.6, role: 'ramp',
  }),
  Object.freeze({ id: 'hold-deck', x: cos(0.35) * 13.5, y: DECK_Y, z: sin(0.35) * 13.5, r: HELIX.holdR, role: 'deck' }),
]);

const coverNodeFor = (c, i, tier, along) => {
  const len = Math.hypot(c.x, c.z) || 1;
  const nx = along ? -sin(Math.atan2(c.z, c.x)) : -c.x / len;
  const nz = along ? cos(Math.atan2(c.z, c.x)) : -c.z / len;
  const lat = c.sx + 0.5;
  return Object.freeze({
    id: `cover-${i}`, x: c.x - nx * 1.3, y: c.y - c.sy, z: c.z - nz * 1.3, nx, nz,
    peekLeft: Object.freeze({ x: c.x - nx * 1.3 - nz * lat, y: c.y - c.sy, z: c.z - nz * 1.3 + nx * lat }),
    peekRight: Object.freeze({ x: c.x - nx * 1.3 + nz * lat, y: c.y - c.sy, z: c.z - nz * 1.3 - nx * lat }),
    height: c.sy * 2, tier, role: i % 3 === 0 ? 'runner' : 'husk',
  });
};

const RAMP_CRATES = rampCrates();
const FLOOR_CRATE_PTS = padCrates(FLOOR_CRATES, FLOOR_Y, 107.1);
const DECK_CRATE_PTS = padCrates(DECK_CRATES, DECK_Y, 113.3);

const COVER = [
  ...RAMP_CRATES.map((c, i) => coverNodeFor(c, i, H.tierRamp, true)),
  ...FLOOR_CRATE_PTS.map((c, i) => coverNodeFor(c, i + 40, H.tierFloor, false)),
  ...DECK_CRATE_PTS.map((c, i) => coverNodeFor(c, i + 80, H.tierDeck, false)),
];

// ---------------------------------------------------------------------------
// ROUTES + THE TRAVERSAL PATH. The ramp centre-line is the only way up, so it is
// authored once, sampled at whatever density the consumer needs, and exported —
// enemies path it, and tests/traversal.mjs drives the real controller along it.
// ---------------------------------------------------------------------------
const rampNode = (t, r = R_MID) => ({ x: cos(ang(t)) * r, y: rampY(t), z: sin(ang(t)) * r, tier: H.tierRamp, t });

function rampChain(t0, t1, n) {
  const out = [];
  for (let k = 0; k <= n; k++) out.push(rampNode(t0 + (t1 - t0) * (k / n)));
  return out;
}

/**
 * THE APPROACH, and the rule it exists to obey.
 *
 * `resolveRail` clamps a body approaching the handrail FROM OUTSIDE as well as
 * from inside — it is a handrail, not a one-way trigger. So a player on the lower
 * floor cannot step sideways onto the ramp anywhere along its 3.25 turns. The
 * only ways up are the ramp's FOOT and the three doorways, and the only way to
 * the foot is around the inside of the drum at the ramp's own radius, where the
 * rail does not exist yet because the ramp does not exist yet.
 *
 * That is the chamber, not a constraint on it: it is why a fall costs the climb,
 * and it is what makes the catwalks worth taking.
 */
const APPROACH = Object.freeze([
  Object.freeze({ a: START_A, r: HELIX.startRadius }),
  Object.freeze({ a: START_A + 0.10, r: 16 }),
  Object.freeze({ a: START_A + 0.30, r: 12.5 }),
  Object.freeze({ a: START_A + 0.52, r: 9.6 }),
  Object.freeze({ a: START_A + 0.78, r: R_MID }),
  Object.freeze({ a: START_A + 1.04, r: R_MID }),
]);
const FOOT_T = 0.004;

const START = Object.freeze({
  x: cos(START_A) * HELIX.startRadius, y: FLOOR_Y, z: sin(START_A) * HELIX.startRadius,
  // Facing the shaft. The first thing the first shot lights is 3.25 turns of
  // spiral going up and away, which is the whole pitch of the chamber, said once,
  // before anything has been fought.
  yaw: Math.atan2(cos(START_A), sin(START_A)),
});

/**
 * The embodied traversal route: floor -> up all 3.25 turns -> deck -> back down.
 * Dense enough to STEER along, because the ramp is a curve and a body walking a
 * curve is not a body walking a polyline, with 13 CHECKPOINTS on it — PLAN's
 * crown-jewel gate counts those, and the points between them are the walking.
 * Shaped for tests/traversal.mjs's shared driver: `{id, x, y, z, jumpWithin?}`.
 */
export const TRAVERSAL = Object.freeze((() => {
  const p = [];
  const N = 60;
  const push = (x, y, z, id, cp, jump) => p.push(Object.freeze(
    jump ? { id, x, y, z, checkpoint: !!cp, jumpWithin: jump } : { id, x, y, z, checkpoint: !!cp }));
  const idxOf = (t, t0, t1) => Math.round(((t - t0) / (t1 - t0)) * N);

  APPROACH.forEach((w, i) => push(cos(w.a) * w.r, FLOOR_Y, sin(w.a) * w.r,
    i === 0 ? 'start' : `approach-${i}`, i === 0, i === 2 ? 2.2 : 0));
  const foot = rampNode(FOOT_T);
  push(foot.x, foot.y, foot.z, 'foot', true);

  const marks = new Map();
  for (const m of [0.15, 0.28, 0.42, 0.56, 0.70, 0.84, 0.995]) marks.set(idxOf(m, FOOT_T, 0.995), m);
  for (let i = 1; i <= N; i++) {
    const n = rampNode(FOOT_T + (0.995 - FOOT_T) * (i / N));
    const m = marks.get(i);
    push(n.x, n.y, n.z, m ? `climb-${m}` : `up-${i}`, !!m, m === 0.42 ? 2.4 : 0);
  }
  for (const [a, r, id, cp, jump] of [
    [0.12, 9.6, 'deck-in', false, 0], [0.35, 11.5, 'deck', true, 0],
    [0.9, 14.5, 'deck-arc', false, 0], [1.571, 15.5, 'deck-far', true, 2.4],
    [0.9, 12.0, 'deck-back', false, 0], [0.35, 9.2, 'deck-out', false, 0], [0.06, 8.6, 'deck-lip', false, 0],
  ]) push(cos(a) * r, DECK_Y, sin(a) * r, id, cp, jump);

  const downMid = idxOf(0.60, 0.99, FOOT_T);
  for (let i = 0; i <= N; i++) {
    const n = rampNode(0.99 - (0.99 - FOOT_T) * (i / N));
    const cp = i === downMid ? 'down-mid' : (i === N ? 'down-foot' : '');
    push(n.x, n.y, n.z, cp || `down-${i}`, !!cp);
  }
  const home = APPROACH[APPROACH.length - 3];
  push(cos(home.a) * home.r, FLOOR_Y, sin(home.a) * home.r, 'home', false);
  return p;
})());

// ---------------------------------------------------------------------------
// THE SPEC
// ---------------------------------------------------------------------------
export const SPEC = defineArena({
  id: 'helix',
  name: 'THE HELIX',
  tier: 1,

  bounds: {
    minX: -H.footprintRadius, maxX: H.footprintRadius,
    minZ: -H.footprintRadius, maxZ: H.footprintRadius,
    minY: FLOOR_Y, maxY: HELIX.ceilingY,
  },
  ceilingY: HELIX.ceilingY,

  // The analytic ground, verbatim from GROUND.helix. The ramp, the rail and the
  // deck slot are the SAME numbers collide.js's swept-annulus resolver and
  // tests/geometry.mjs's probeRail already run on — a second helix is two helices.
  ground: { id: 'helix', shape: 'helix', helix: H },

  playerStart: { x: START.x, y: START.y, z: START.z, yaw: START.yaw },
  tiers: [
    { id: H.tierFloor, y: FLOOR_Y, name: 'floor' },
    { id: H.tierRamp, y: rampY(0.5), name: 'ramp' },
    { id: H.tierDeck, y: DECK_Y, name: 'deck' },
  ],

  lanes: {
    shaft: { ax: 0, az: 0, bx: 0, bz: 0, halfWidth: H.deckOpeningR },
    inner: { ax: 0, az: 0, bx: 0, bz: 0, halfWidth: H.rampInnerR + 0.9 },
    outer: { ax: 0, az: 0, bx: 0, bz: 0, halfWidth: R_RAIL },
  },

  portals: PORTALS,
  // The escalation is VERTICAL, which is the only escalation this chamber has:
  // the floor, then the ramp above and below you, then the deck at your back.
  waveSpawns: [
    ['p-floor-a', 'p-floor-b'],
    ['p-floor-b', 'p-floor-c', 'p-door-a'],
    ['p-door-a', 'p-door-b', 'p-floor-a'],
    ['p-door-b', 'p-door-c', 'p-deck-n', 'p-arrival'],
    ['p-door-a', 'p-door-b', 'p-door-c', 'p-deck-n', 'p-deck-s'],
  ],

  traversal: { waypoints: TRAVERSAL, checkpoints: 13 },

  routes: {
    climb: [
      ...APPROACH.map(w => ({ x: cos(w.a) * w.r, y: FLOOR_Y, z: sin(w.a) * w.r, tier: H.tierFloor })),
      ...rampChain(FOOT_T, 0.995, 24),
    ],
    descend: [...rampChain(0.99, FOOT_T, 24),
      ...APPROACH.slice().reverse().map(w => ({ x: cos(w.a) * w.r, y: FLOOR_Y, z: sin(w.a) * w.r, tier: H.tierFloor }))],
    'door-a': [rampNode(DOORS[0].t), { x: cos(DOORS[0].a) * DOORS[0].outR, y: DOORS[0].y, z: sin(DOORS[0].a) * DOORS[0].outR, tier: H.tierRamp }],
    'door-b': [rampNode(DOORS[1].t), { x: cos(DOORS[1].a) * DOORS[1].outR, y: DOORS[1].y, z: sin(DOORS[1].a) * DOORS[1].outR, tier: H.tierRamp }],
    'door-c': [rampNode(DOORS[2].t), { x: cos(DOORS[2].a) * DOORS[2].outR, y: DOORS[2].y, z: sin(DOORS[2].a) * DOORS[2].outR, tier: H.tierRamp }],
    'deck-ring': BUTTRESS_A.map(a => ({ x: cos(a) * 15.5, y: DECK_Y, z: sin(a) * 15.5, tier: H.tierDeck })),
    'floor-ring': BUTTRESS_A.map(a => ({ x: cos(a) * 17, y: FLOOR_Y, z: sin(a) * 17, tier: H.tierFloor })),
  },

  recoveryNodes: [
    ...APPROACH.map(w => ({ x: cos(w.a) * w.r, y: FLOOR_Y, z: sin(w.a) * w.r })),
    { x: 0, y: FLOOR_Y, z: 14 }, { x: 14, y: FLOOR_Y, z: 0 }, { x: -14, y: FLOOR_Y, z: 0 },
    ...[0.1, 0.3, 0.5, 0.7, 0.9].map(t => ({ x: rampNode(t).x, y: rampNode(t).y, z: rampNode(t).z })),
    { x: cos(0.35) * 13.5, y: DECK_Y, z: sin(0.35) * 13.5 },
    { x: cos(Math.PI) * 13.5, y: DECK_Y, z: sin(Math.PI) * 13.5 },
  ],

  coverNodes: COVER,
  holdingGround: HOLD,
  keepOuts: [
    { id: 'start', x: START.x, z: START.z, r: 4.2 },
    { id: 'foot', x: cos(ang(FOOT_T)) * R_MID, z: sin(ang(FOOT_T)) * R_MID, r: 6.5 },
    { id: 'hold-foot', x: HOLD[0].x, z: HOLD[0].z, r: HOLD[0].r },
    // The walk-in corridor. Rubble and plates are decals underfoot, but a cover
    // block standing in it is a wall in the first ten seconds of the chamber.
    ...APPROACH.slice(1).map(w => ({ id: 'approach', x: cos(w.a) * w.r, z: sin(w.a) * w.r, r: 3 })),
    ...PORTALS.filter(p => p.tier === H.tierFloor).map(p => ({ id: 'floor-portal', x: p.spawnX, z: p.spawnZ, r: 2.6 })),
  ],

  // DESIGN's clear reward: "second dash charge (a visible second cell on the
  // wrist)". FEEL.dash.charges is already 2 with "(1 until chamber 2 is cleared)"
  // beside it, so this chamber is the thing that sentence refers to. Declared as
  // data rather than hard-coded in a progression system that does not exist yet.
  reward: { dashCharges: 1, dashChargesAfter: FEEL.dash.charges },

  lightGoal: HELIX.lightGoal,
  tensionFloor: FEEL.tension.floors.helix,
  maxSightline: HELIX.maxSightline,
  fogDensity: FEEL.render.fogDensity,
  scarDepositScale: 1,
  // LIGHT RULE: the chamber contributes NOTHING, exactly like THE INTAKE. What
  // changes is not the amount of light, it is where it STAYS — behind and below.
  staticLights: [],
  palette: P,

  roster: ['husk', 'runner', 'lantern'],
  director: {
    queue: DIR.queue, cap: DIR.cap, interval: DIR.interval,
    weights: { husk: DIR.weights.husk, runner: DIR.weights.runner, lantern: DIR.weights.lantern },
  },

  // -------------------------------------------------------------------------
  // ELEMENTS. Draw order is insertion order (scene.sortObjects is off), so the
  // floor goes down before what stands on it and the ramp before its rail.
  // -------------------------------------------------------------------------
  elements: [
    {
      id: 'floor', mode: 'static', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.floor, detail: 1, transform: { y: FLOOR_Y, sx: HELIX.wallR + 1.2, sz: HELIX.wallR + 1.2 },
    },
    {
      id: 'ceilingSlab', mode: 'static', shape: 'quad', shapeArgs: { face: 'down' }, material: 'surface',
      color: P.dark, detail: 0.9, transform: { y: HELIX.ceilingY, sx: HELIX.wallR + 1.2, sz: HELIX.wallR + 1.2 },
    },
    {
      id: 'floorTile', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: floorTiles() },
      keepOut: ['start', 'foot'],
      vary: { tint: [0.70, 1.10], macro: 0.34 },
    },
    {
      id: 'floorChannel', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: floorChannels() },
      keepOut: ['start'],
      vary: { tint: [0.68, 1.04], macro: 0.28 },
    },
    {
      // Two debris scales on alternate rings, one draw each. This is the floor you
      // land on after a 34 m fall, so it is the most-looked-at surface in the room
      // — and 500 chunks in ONE element is a 3 ms cold build job (see polarField).
      id: 'floorRubble', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: floorRubble(0, 0.16, 0.46) },
      keepOut: ['start', 'foot', 'floor-portal'],
      vary: { tiltMax: 0.42, tint: [0.62, 1.16], macro: 0.40 },
    },
    {
      id: 'floorGrit', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'list', points: floorRubble(1, 0.08, 0.24) },
      keepOut: ['start', 'foot', 'floor-portal'],
      vary: { tiltMax: 0.55, tint: [0.58, 1.10], macro: 0.44 },
    },
    {
      id: 'wallPanel', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.92,
      place: { kind: 'list', points: wallPanels() },
      vary: { halfAxis: 'x', scale: { z: [0.85, 1.25] }, tint: [0.80, 1.12], macro: 0.24 },
    },
    {
      id: 'wallRib', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: wallRibs() },
      vary: { tint: [0.74, 1.06], macro: 0.26 },
    },
    {
      id: 'wallHoop', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.steel, detail: 0.72,
      place: { kind: 'list', points: wallHoops() },
      vary: { tint: [0.70, 1.04], macro: 0.20, warm: 0.05 },
    },
    {
      id: 'buttress', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: { kind: 'list', points: buttressPieces('shaft') },
      vary: { tint: [0.82, 1.14], macro: 0.28 },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      // Contact. Automatic failure #5 is "objects that float"; with no shadow map
      // in the engine a dark skirt is what welds a 33 m column to the floor.
      id: 'buttressCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'list', points: buttressPieces('collar') },
      vary: { tint: [0.50, 0.72], macro: 0.20 },
    },
    {
      id: 'buttressCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'list', points: buttressPieces('capital') },
      vary: { tint: [0.74, 1.00], macro: 0.22 },
    },
    {
      id: 'rampTread', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.tread, detail: 1,
      place: { kind: 'list', points: treads() },
      vary: { tint: [0.76, 1.14], macro: 0.30, warm: 0.05 },
    },
    {
      id: 'rampKerb', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: rampKerbs() },
      vary: { tint: [0.70, 1.06], macro: 0.24, warm: 0.04 },
    },
    {
      id: 'rampRib', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.steel, detail: 0.8,
      place: { kind: 'list', points: rampRibs() },
      vary: { tint: [0.66, 1.02], macro: 0.22, warm: 0.05 },
    },
    {
      id: 'catwalk', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.steel, detail: 0.9,
      place: { kind: 'list', points: catwalks() },
      vary: { tint: [0.72, 1.06], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'gantry', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.steel, detail: 0.9,
      place: { kind: 'list', points: gantries() },
      vary: { tint: [0.72, 1.06], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'deckJoist', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.steel, detail: 0.78,
      place: { kind: 'list', points: deckJoists() },
      vary: { tint: [0.64, 1.00], macro: 0.22, warm: 0.05 },
    },
    {
      id: 'deckTile', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.deck, detail: 1,
      place: { kind: 'list', points: deckTiles(false) },
      vary: { tint: [0.74, 1.10], macro: 0.30 },
    },
    {
      // The band that crosses the ramp, planked rather than plated — narrow
      // enough that the corner overhang cannot reach into the slot, and its own
      // element so no single layout job carries the whole deck.
      id: 'deckPlank', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.deck, detail: 1,
      place: { kind: 'list', points: deckTiles(true) },
      vary: { tint: [0.72, 1.12], macro: 0.30 },
    },
    {
      id: 'deckRim', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: ringKerbs(H.deckOuterR - 0.22, 56, DECK_Y, 0.15, 0.22, 127.1) },
      vary: { tint: [0.70, 1.04], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'deckHoleRim', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: ringKerbs(H.deckOpeningR + 0.22, 22, DECK_Y, 0.15, 0.22, 131.3) },
      vary: { tint: [0.70, 1.04], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'deckSlotEdge', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: slotEdges() },
      vary: { tint: [0.70, 1.02], macro: 0.18, warm: 0.04 },
    },
    {
      id: 'railToe', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: railRun(HELIX.railToeH, 0.11, 0.05, 2) },
      vary: { tint: [0.70, 1.06], macro: 0.22, warm: 0.05 },
    },
    {
      id: 'railMid', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.steel, detail: 1,
      place: { kind: 'list', points: railRun(HELIX.railMidH, 0.045, 0.045, 2) },
      vary: { tint: [0.72, 1.08], macro: 0.22, warm: 0.05 },
    },
    {
      // The top rail sits at 1.16, under resolveRail's physical band top of 1.23,
      // so what stops you is drawn where it stops you. Above 1.23 is genuinely
      // clear and a jump genuinely goes over — into the shaft, which is the point.
      id: 'railTop', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.steel, detail: 0.86,
      place: { kind: 'list', points: railRun(HELIX.railTopH, 0.055, 0.05, 1) },
      vary: { tint: [0.74, 1.10], macro: 0.22, warm: 0.05 },
    },
    {
      id: 'railPost', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.steel, detail: 0.9,
      place: { kind: 'list', points: railPosts() },
      vary: { tint: [0.70, 1.06], macro: 0.22, warm: 0.05 },
    },
    {
      id: 'rampCrate', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: RAMP_CRATES },
      vary: { tint: [0.80, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'floorCrate', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: FLOOR_CRATE_PTS },
      keepOut: ['start', 'approach', 'foot'],
      vary: { tint: [0.80, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'deckCrate', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: DECK_CRATE_PTS },
      vary: { tint: [0.80, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'portalFrame', mode: 'instanced', shape: 'portalFrame', material: 'surface',
      color: P.steel, detail: 0.78,
      place: {
        kind: 'list',
        points: PORTALS.map(p => ({ x: p.x, y: p.y + 1.55, z: p.z, yaw: p.yaw })),
      },
      vary: {
        scale: { x: [1.28, 1.46], y: [1.50, 1.66], z: [0.88, 1.16] },
        tint: [0.78, 1.02], macro: 0.10, warm: 0.03,
      },
    },
    {
      id: 'ceilingBeam', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.steel, detail: 0.72,
      place: { kind: 'runs', along: 'x', halfX: HELIX.wallR, halfZ: HELIX.wallR, spacing: 4.1, segment: 10, widthJitter: 0.3, gap: 0.06, y: HELIX.ceilingY - 0.7 },
      vary: { halfAxis: 'x', scale: { y: [0.34, 0.44], z: [0.85, 1.15] }, tint: [0.70, 1.04], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'ceilingDuct', mode: 'instanced', shape: 'duct', material: 'surface',
      color: P.steel, detail: 0.68,
      place: { kind: 'runs', along: 'z', halfX: HELIX.wallR - 4, halfZ: HELIX.wallR - 4, spacing: 11.2, offset: 3.4, segment: 8, widthJitter: 0.24, gap: 0.12, y: HELIX.ceilingY - 1.5 },
      vary: { halfAxis: 'x', scale: { y: [0.52, 0.72], z: [0.80, 1.10] }, tint: [0.66, 1.00], macro: 0.18, warm: 0.05 },
    },
    {
      // The walkable surface of the eight gantries and the three catwalks, as
      // ELEVEN boxes rather than the thirty-eight their plates would bake.
      id: 'walkwayStop', mode: 'collider', shape: 'none', material: 'none',
      place: { kind: 'list', points: walkwayStops() },
      collider: { tag: 'surface', flags: 'support', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // THE BOUNDARY. Two tiers of 32 chords, inner face at HELIX.barrierR, so
      // every decorative piece on the drum can be collider-free and no baked box
      // gets anywhere near COLLIDE.maxAabb's 40 m ribbon trap (worst here: 20.7).
      id: 'drumStop', mode: 'collider', shape: 'none', material: 'none',
      place: { kind: 'list', points: barrierRing() },
      collider: { tag: 'wall', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'ceilingStop', mode: 'collider', shape: 'none', material: 'none',
      place: {
        kind: 'lattice',
        xs: [-17.4, 0, 17.4], zs: [-17.4, 0, 17.4],
        y: HELIX.clearanceY + 0.15, jitter: 0,
      },
      collider: { tag: 'ceiling', flags: ['ceiling', 'barrier'], half: [8.7, 0.15, 8.7], center: [0, 0, 0] },
    },
  ],
});

export const DOORWAYS = Object.freeze(DOORS);
export default SPEC;
