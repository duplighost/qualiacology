// THE GALLERY — chamber three, and the only room in the tower where the thing
// that is about to kill you is also the lamp you aim by.
//
// docs/DESIGN.md: "A long, black, deep room with 70 m sightlines and a raised
// mezzanine. LANTERN-heavy. LIGHT RULE: their telegraph is a light source. A
// LANTERN charging in the far dark is a lamp switching on across the room, which
// means the thing that is about to kill you is also the only thing letting you
// aim at it, and shooting it during the 0.8 s charge staggers the shot."
//
// That sentence is a claim about ARCHITECTURE, not about a shader. It is only
// true if the room actually has a line a charge can cross, and it is only
// interesting if standing on that line is a decision. So three numbers are
// authored here and asserted in tests/traversal.mjs, and every one of them is
// the sentence restated as geometry:
//
//   THE LINE — 70.00 m, dead down the middle of the nave, from the player's
//   spawn mark at z +34 to the north dais at z -36. Nothing with any height
//   stands within GALLERY.laneHalfX of it: the colonnades open at |x| 8.9, the
//   cover blocks start at |x| 5.2, the broken columns at |x| 6.9. FEEL.render's
//   fog is 0.011, which is 45% extinction at 70 m — 55% of a LANTERN's charge
//   arrives, so the far end of this room is dark but it is not a wall. (At the
//   draft's 0.020 it was 86% and this chamber's whole premise was fiction. Do
//   NOT re-thicken it locally; the atmosphere here is bought with geometry —
//   twenty-five ceiling bays, eleven floor kerbs and a colonnade every 4.2 m —
//   which is what actually makes 70 m read as 70 m.)
//
//   THE ELEVATION — a mezzanine at y 6.4 running the west wall, crossing the
//   north end on a bridge and returning down half the east wall. Three of the
//   thirteen spawn portals open onto it, so a LANTERN can hold 6.4 m of height
//   over a player who has nowhere above them to answer from. Its inner edge
//   carries a 1.1 m parapet with four authored embrasures per side: that is a
//   LANTERN's cover, and it is also the player's, and it is the reason the fight
//   has an upstairs.
//
//   THE ASCENT — three plinths at 1.6 m rises. 1.6 is deliberately between
//   FEEL.move.maxStep (0.42, so it CANNOT be walked) and the apex of
//   FEEL.move.jump (9.8 m/s = 2.67 m, so it CAN be jumped, with a 0.72 s window
//   over the lip). The route is not asserted by arithmetic — tests/traversal.mjs
//   drives the real controller up it at 30, 60 and 120 Hz.
//
// COVER THAT IS WORTH BREAKING FROM. Every cover block sits on the LANE
// SHOULDER, 1.9-3.5 m outside the protected corridor: from behind one you are
// safe and you cannot see the length of the room, and one step inboard puts you
// on the line where a charge at 70 m is legible and where D3 says their accuracy
// is scaled by the light you are standing in. That step is the chamber.
//
// DENSITY IS THE LOOK (docs/RENDER.md automatic failure #4). A dark room is not
// an excuse for an empty one: 32 elements, ~1900 instances, ~30 draw calls, and
// per-instance yaw / non-uniform scale / macro-noise tint on every instanced one.
//
// NO THREE.JS. This module is frozen data, exactly like ground.js's tables, so
// the whole chamber — layout, colliders, sightline and traversal — is measurable
// headless in milliseconds.

import FEEL from '../feel.js';
import { defineArena } from '../world/build.js';

const D = FEEL.director.chambers.gallery;
const LANTERN = FEEL.enemies.lantern;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this chamber. Level design, not tuning: it lives here
// for the same reason GROUND.helix holds the helix's numbers rather than
// FEEL_PROFILE. Anything that governs the FEEL of the game lives in feel.js and
// is READ from there — see `director`, `tensionFloor` and `fogDensity` below.
// ---------------------------------------------------------------------------
export const GALLERY = Object.freeze({
  halfX: 15,
  halfZ: 37,                  // a 30 x 74 m hall: the 70 m line fits with 4 m to spare
  floorY: 0,

  // Two ceilings, as THE INTAKE established: `clearanceY` is where a head stops,
  // `ceilingY` is where the slab is, and the metre between them is where the
  // beams hang so a jump can never put the camera inside one.
  clearanceY: 12.4,
  ceilingY: 13.4,
  wallThickness: 0.6,
  wallBackDepth: 1.3,

  // ---- THE LINE ----------------------------------------------------------
  sightline: 70,
  // Half-width of the protected corridor. Nothing that stands taller than
  // GALLERY.laneClear may have any part inside it, and tests/traversal.mjs
  // sweeps every baked collider against it rather than trusting this comment.
  laneHalfX: 3.0,
  laneClear: 0.55,            // the tallest thing allowed in the lane (kerbs, rubble)
  playerStart: Object.freeze({ x: 0, y: 0, z: 34, yaw: 0 }),   // yaw 0 looks down -Z
  perchX: 0,
  perchZ: -36,                // 34 - (-36) = 70.00 m, exactly

  // ---- THE MEZZANINE -----------------------------------------------------
  mezzY: 6.4,
  mezzThickness: 0.34,
  mezzInnerX: 8.4,
  mezzOuterX: 15,
  mezzNorthZ: -32.6,
  mezzWestSouthZ: 6.0,
  mezzEastSouthZ: -4.0,
  bridgeSouthZ: -29.4,
  parapetHeight: 1.1,
  parapetHalfT: 0.35,
  parapetSegment: 1.8,

  // ---- THE ASCENT --------------------------------------------------------
  // 0 -> 1.6 -> 3.2 -> 4.8 -> 6.4. Four identical rises, and the last one lands
  // on the mezzanine, so the stair teaches its own last step.
  stepRise: 1.6,
  stairX: -11.2,
  stairGap: 1.2,              // the void between plinths: you clear it or you fall
  stairBayR: 4.6,             // how much colonnade the stair hall clears

  // ---- THE DAIS ----------------------------------------------------------
  // The far end is a step, not a floor, so a LANTERN standing on it is a
  // silhouette against the north wall rather than a smudge on the ground.
  daisY: 1.2,
  daisHalfX: 6.6,
  daisZ: -35,
  daisHalfZ: 1.8,

  // ---- COLONNADE ---------------------------------------------------------
  colInnerX: 8.9,             // just outboard of the mezzanine's inner edge
  colOuterX: 12.6,
  colSpacingZ: 4.2,
  colRows: 8,                 // k in [-8, 8] -> 17 rows, -33.6 .. 33.6
  colJitter: 0.35,
  upperInnerX: 9.8,           // the arcade ON the deck; the walking band is between
  upperOuterX: 12.6,

  portalInset: 1,
  portalGap: 1.9,
  approachClear: 4,

  // The mood filter reads litFraction = scarLightTotal / lightGoal. GALLERY's
  // director queues 40 bodies at HUSK 1.00 / LANTERN 2.00 / RUNNER 1.25 deposit
  // intensity, weighted .40/.35/.25 -> mean 1.4125 per kill. This room is 2220 m2
  // against a 6 m merge distance, so far fewer kills merge than in THE INTAKE:
  // 40 * 1.4125 * (0.75 + 0.25*0.45) ~= 48.7, taken down a tenth so a clean run
  // reaches "fully lit" a body or two before the last one rather than never.
  lightGoal: 44,
  maxSightline: 70,

  // THE PALETTE, inside the window THE INTAKE measured on the shipping page:
  // above ~0x33383d (below which FEEL.render.contrast 1.10 crushes everything to
  // pure black) and below FEEL.render.drab (at which an unlit floor reads at
  // 51/255 and the game's premise dies). Floor darkest, columns lightest — the
  // flash has to find the vertical, and a scar pool only reads as a pool against
  // a floor darker than it. Values are authored; polishColor moves their chroma
  // and leaves their value alone.
  palette: Object.freeze({
    floor: 0x565c61,          // a shade under THE INTAKE's: this room is deeper
    plate: 0x5b6166,
    substructure: 0x656b71,
    concrete: 0x787e84,       // colonnade and wall panels: what the flash finds
    mezzanine: 0x6f757b,      // the deck, lit from below by nothing at all
    metal: 0x6b6558,          // oxidised, warm — the split lives on blue/yellow
    dark: 0x363a3e,           // alcove backs, ceiling slab, base collars
  }),
});

const G = GALLERY;
const P = G.palette;

// ---------------------------------------------------------------------------
// PURE GEOMETRY HELPERS. Deterministic, no rng: these produce authored point
// lists, and per-instance variation is applied afterwards by build.js from the
// chamber's own derived stream.
// ---------------------------------------------------------------------------

/** Segments along a straight run, with authored voids expressed in run metres. */
function lineRun(ax, az, bx, bz, seg, y, yaw, voids) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  const n = Math.max(1, Math.round(len / seg));
  const step = len / n;
  const ux = dx / len, uz = dz / len;
  const out = [];
  for (let i = 0; i < n; i++) {
    const s = (i + 0.5) * step;
    let blocked = false;
    for (const v of (voids || [])) {
      if (s - step * 0.5 < v[1] && s + step * 0.5 > v[0]) { blocked = true; break; }
    }
    if (blocked) continue;
    out.push({ x: ax + ux * s, y, z: az + uz * s, yaw, half: step * 0.5 });
  }
  return out;
}

/** A grid of points inside a rect, inset from its edges. */
function rectGrid(r, spacing, inset, y) {
  const out = [];
  const x0 = r.x - r.hx + inset, x1 = r.x + r.hx - inset;
  const z0 = r.z - r.hz + inset, z1 = r.z + r.hz - inset;
  const nx = Math.max(1, Math.round((x1 - x0) / spacing));
  const nz = Math.max(1, Math.round((z1 - z0) / spacing));
  for (let i = 0; i < nx; i++) {
    for (let k = 0; k < nz; k++) {
      out.push({ x: x0 + (i + 0.5) * (x1 - x0) / nx, y, z: z0 + (k + 0.5) * (z1 - z0) / nz, yaw: 0 });
    }
  }
  return out;
}

/** Column rows, as z values. One expression so the arcade above lines up with the piers below. */
const COL_Z = Object.freeze(Array.from({ length: G.colRows * 2 + 1 }, (_, i) => (i - G.colRows) * G.colSpacingZ));

// ---------------------------------------------------------------------------
// THE MEZZANINE, THE STAIR AND THE DAIS — declared ONCE as rects, and consumed
// three times: by the analytic ground (`platforms`), by the deck/soffit meshes,
// and by the collider bake. Physics and picture cannot disagree because they are
// literally the same six numbers. This is groundAt()'s discipline applied to a
// thing that is not a height field.
// ---------------------------------------------------------------------------
const MEZZ = Object.freeze([
  // x [-15, -8.4]  z [-32.6, 6.0]   — the long west gallery
  Object.freeze({ id: 'mezz-west', x: -11.7, hx: 3.3, z: -13.3, hz: 19.3, y: G.mezzY }),
  // x [8.4, 15]    z [-32.6, -4.0]  — the shorter east balcony
  Object.freeze({ id: 'mezz-east', x: 11.7, hx: 3.3, z: -18.3, hz: 14.3, y: G.mezzY }),
  // x [-8.4, 8.4]  z [-32.6, -29.4] — the bridge that closes the ring
  Object.freeze({ id: 'mezz-bridge', x: 0, hx: 8.4, z: -31, hz: 1.6, y: G.mezzY }),
]);

// z spans: [18.8, 24.0] · [12.8, 17.6] · [7.2, 11.6]. Each void is exactly
// GALLERY.stairGap, and the last void puts the mezzanine's south lip 1.2 m off
// plinth 3 at the same 1.6 m rise as every step before it.
const PLINTH = Object.freeze([
  Object.freeze({ id: 'plinth-1', x: G.stairX, hx: 2.6, z: 21.4, hz: 2.6, y: G.stepRise * 1 }),
  Object.freeze({ id: 'plinth-2', x: G.stairX, hx: 2.4, z: 15.2, hz: 2.4, y: G.stepRise * 2 }),
  Object.freeze({ id: 'plinth-3', x: G.stairX, hx: 2.2, z: 9.4, hz: 2.2, y: G.stepRise * 3 }),
]);

const DAIS = Object.freeze({ id: 'dais', x: 0, hx: G.daisHalfX, z: G.daisZ, hz: G.daisHalfZ, y: G.daisY });

/** Every walkable slab, as the analytic ground wants it. */
const PLATFORMS = Object.freeze([
  ...MEZZ.map(m => Object.freeze({ id: m.id, x: m.x, z: m.z, hx: m.hx, hz: m.hz, y: m.y, tier: 1, thickness: G.mezzThickness })),
  ...PLINTH.map(p => Object.freeze({ id: p.id, x: p.x, z: p.z, hx: p.hx, hz: p.hz, y: p.y, tier: 0, thickness: p.y })),
  Object.freeze({ id: DAIS.id, x: DAIS.x, z: DAIS.z, hx: DAIS.hx, hz: DAIS.hz, y: DAIS.y, tier: 0, thickness: DAIS.y }),
]);

/**
 * A slab's mesh and its collider from the same rect. `plate` is the shape whose
 * top face is at local y = +1 with no cap protruding above it, so the collider
 * top and the mesh top are the same number rather than nearly the same number.
 */
const slabPoint = r => ({ x: r.x, y: r.y * 0.5, z: r.z, yaw: 0, sx: r.hx, sy: r.y * 0.5, sz: r.hz });

// ---------------------------------------------------------------------------
// PORTALS — thirteen authored spawn doors, and three of them are UPSTAIRS.
//
// PLAN: "spawn portals authored per ArenaSpec are exempt from the illumination
// veto because they are never in the player's line of sight by construction."
// The six side doors at floor level open into alcoves that sit UNDER the
// mezzanine, which is the only place in this room that is reliably occluded.
// The three mezzanine doors are the chamber's argument: a LANTERN that walks out
// of one is holding 6.4 m of height and 32 m of preferred range at the same time.
// ---------------------------------------------------------------------------
const portal = (id, x, y, z, nx, nz, wall, tier) => Object.freeze({
  id, x, y, z, nx, nz, wall, tier,
  yaw: Math.atan2(nx, nz),
  spawnX: x + nx * G.portalInset,
  spawnZ: z + nz * G.portalInset,
});

const PORTALS = Object.freeze([
  portal('p-n-w', -9.4, 0, -G.halfZ, 0, 1, 'north', 0),
  portal('p-n-e', 9.4, 0, -G.halfZ, 0, 1, 'north', 0),
  portal('p-w-n', -G.halfX, 0, -24.2, 1, 0, 'west', 0),
  portal('p-w-m', -G.halfX, 0, -10.4, 1, 0, 'west', 0),
  portal('p-w-s', -G.halfX, 0, 14.6, 1, 0, 'west', 0),
  portal('p-e-n', G.halfX, 0, -24.2, -1, 0, 'east', 0),
  portal('p-e-m', G.halfX, 0, -10.4, -1, 0, 'east', 0),
  portal('p-e-s', G.halfX, 0, 14.6, -1, 0, 'east', 0),
  portal('p-s-w', -10.6, 0, G.halfZ, 0, -1, 'south', 0),
  portal('p-s-e', 10.6, 0, G.halfZ, 0, -1, 'south', 0),
  portal('p-mz-w-n', -G.halfX, G.mezzY, -27, 1, 0, 'west', 1),
  portal('p-mz-w-s', -G.halfX, G.mezzY, -2.6, 1, 0, 'west', 1),
  portal('p-mz-e-n', G.halfX, G.mezzY, -27, -1, 0, 'east', 1),
]);

const LOWER_PORTALS = PORTALS.filter(p => p.tier === 0);
const UPPER_PORTALS = PORTALS.filter(p => p.tier === 1);

// The two wall bands are split AT the mezzanine, so a mezzanine door punches its
// hole in the upper band and a floor door in the lower one. One `gaps` array for
// both bands would have opened a floor-to-ceiling slot under every balcony door.
const LOWER_BAND = Object.freeze({ y: G.mezzY * 0.5, half: G.mezzY * 0.5 });
const UPPER_BAND = Object.freeze({ y: (G.mezzY + G.ceilingY) * 0.5, half: (G.ceilingY - G.mezzY) * 0.5 });
const bandOf = p => (p.tier === 1 ? UPPER_BAND : LOWER_BAND);

// ---------------------------------------------------------------------------
// HOLDING GROUND — PLAN line 221, three cleared cells the director biases
// surprises toward. One of them is on the mezzanine, which is the whole point:
// "does the next thing die here or over there" is a question with an UP in it.
// ---------------------------------------------------------------------------
const HOLD = Object.freeze([
  Object.freeze({ id: 'hold-mouth', x: 0, y: 0, z: 22, r: 3.6, role: 'nave-mouth' }),
  Object.freeze({ id: 'hold-cross', x: 0, y: 0, z: -2, r: 4, role: 'mid-nave' }),
  Object.freeze({ id: 'hold-deck', x: G.stairX, y: G.mezzY, z: -18, r: 3.4, role: 'west-deck' }),
]);
const HOLD_IDS = HOLD.map(h => h.id);

// ---------------------------------------------------------------------------
// COVER — every block on a LANE SHOULDER. The nearest face of the nearest block
// sits 0.86 m outside GALLERY.laneHalfX, which is the distance the decision is
// made in: behind it you are dark and blind, one step inboard you are on the
// 70 m line in both directions at once.
// ---------------------------------------------------------------------------
const BLOCKS = Object.freeze([
  Object.freeze({ x: -5.6, z: 24.4, yaw: 0.32, sx: 1.20, sy: 0.55, sz: 0.72 }),
  Object.freeze({ x: 5.9, z: 21.0, yaw: -0.58, sx: 1.34, sy: 0.52, sz: 0.66 }),
  Object.freeze({ x: -6.4, z: 16.2, yaw: 1.05, sx: 1.06, sy: 0.58, sz: 0.80 }),
  Object.freeze({ x: 6.8, z: 12.4, yaw: 0.21, sx: 1.28, sy: 0.50, sz: 0.70 }),
  Object.freeze({ x: -5.2, z: 8.0, yaw: -0.94, sx: 1.42, sy: 0.54, sz: 0.62 }),
  Object.freeze({ x: 5.4, z: 3.2, yaw: 0.66, sx: 1.12, sy: 0.57, sz: 0.76 }),
  Object.freeze({ x: -6.9, z: -1.6, yaw: -0.28, sx: 1.30, sy: 0.51, sz: 0.68 }),
  Object.freeze({ x: 6.2, z: -6.4, yaw: 1.24, sx: 1.18, sy: 0.56, sz: 0.74 }),
  Object.freeze({ x: -5.5, z: -11.2, yaw: 0.44, sx: 1.36, sy: 0.53, sz: 0.64 }),
  Object.freeze({ x: 5.8, z: -15.8, yaw: -1.12, sx: 1.08, sy: 0.59, sz: 0.78 }),
  Object.freeze({ x: 6.6, z: -20.6, yaw: 0.83, sx: 1.24, sy: 0.52, sz: 0.70 }),
  // West, not east: the floor under the breach is where a player who has just
  // fallen 6.4 m lands, and landing on top of a barrier block is the one thing
  // in this room that would make a drop feel like a bug.
  Object.freeze({ x: -6.5, z: -25.2, yaw: -0.41, sx: 1.40, sy: 0.55, sz: 0.66 }),
  Object.freeze({ x: -5.9, z: -29.0, yaw: 1.36, sx: 1.14, sy: 0.50, sz: 0.72 }),
  Object.freeze({ x: 7.2, z: -31.6, yaw: 0.09, sx: 1.26, sy: 0.58, sz: 0.60 }),
  // Aisle cover, under and beside the balconies — the ground a body retreats to.
  Object.freeze({ x: -12.2, z: -6.8, yaw: -0.72, sx: 1.10, sy: 0.54, sz: 0.68 }),
  Object.freeze({ x: 12.0, z: 4.6, yaw: 0.51, sx: 1.22, sy: 0.56, sz: 0.74 }),
  Object.freeze({ x: 12.8, z: 30.0, yaw: 0.97, sx: 1.16, sy: 0.51, sz: 0.66 }),
  Object.freeze({ x: -13.0, z: -13.0, yaw: -1.29, sx: 1.32, sy: 0.53, sz: 0.70 }),
]);

/** Cover faces the wall it is nearest, because that is where bodies come from. */
function coverNodeFor(b, i) {
  const len = Math.hypot(b.x, b.z) || 1;
  const nx = b.x / len, nz = b.z / len;
  const lateral = b.sx + 0.5;
  return Object.freeze({
    id: `cover-${i}`,
    x: b.x - nx * 1.35, y: 0, z: b.z - nz * 1.35,
    nx, nz,
    peekLeft: Object.freeze({ x: b.x - nx * 1.35 - nz * lateral, y: 0, z: b.z - nz * 1.35 + nx * lateral }),
    peekRight: Object.freeze({ x: b.x - nx * 1.35 + nz * lateral, y: 0, z: b.z - nz * 1.35 - nx * lateral }),
    height: b.sy * 2,
    tier: 0,
    role: i % 3 === 0 ? 'lantern' : 'husk',
  });
}

/**
 * The parapet's embrasures — a LANTERN's firing slot and the player's way down,
 * measured in metres along each run from its first endpoint. The east run's
 * second void is load-bearing for traversal: it is the opening the authored
 * route drops through at z -20, and tests/traversal.mjs walks the real
 * controller into it rather than assuming it is there.
 */
const PARAPET_WEST_VOIDS = Object.freeze([[6, 7], [13, 14], [20, 21], [27, 28]]);
// The east run's first void is a BREACH, three bays wide, not an embrasure: it
// is the way down, it is aligned with a gap in the arcade above it so the route
// through it is a straight line rather than a squeeze, and the traversal gate
// walks the real controller out of it.
const PARAPET_EAST_VOIDS = Object.freeze([[4.4, 8.6], [15, 16], [21, 22]]);
const PARAPET_BRIDGE_VOIDS = Object.freeze([[7.9, 8.9]]);

// ---------------------------------------------------------------------------
// KEEP-OUTS. The `lane` chain is the 70 m line made enforceable: 23 discs of
// r 4.4 at 3 m spacing guarantee no keep-out-honouring element's CENTRE is
// nearer than 4.14 m to the axis, which with the widest stub half-extent (0.65)
// leaves 3.49 m of clearance against a 3.0 m corridor. tests/traversal.mjs does
// not take that on trust — it sweeps every baked box against the corridor.
// ---------------------------------------------------------------------------
const LANE_KEEPOUT = Object.freeze(
  Array.from({ length: 23 }, (_, i) => Object.freeze({ id: 'lane', x: 0, z: 33 - i * 3, r: 4.4 })),
);

const KEEP_OUTS = Object.freeze([
  Object.freeze({ id: 'start', x: G.playerStart.x, z: G.playerStart.z, r: G.approachClear }),
  // The south crossing: the floor a player actually walks to reach the stair.
  Object.freeze({ id: 'approach', x: 0, z: 30, r: 3.4 }),
  Object.freeze({ id: 'approach', x: -4.6, z: 29.6, r: 3.4 }),
  Object.freeze({ id: 'approach', x: -8, z: 29, r: 3.6 }),
  // The stair hall. The colonnade opens for it, which is how the stair is found
  // in a black room: not by a marker, by a gap in a rhythm.
  Object.freeze({ id: 'stair', x: G.stairX, z: 27, r: G.stairBayR }),
  ...PLINTH.map(p => Object.freeze({ id: 'stair', x: p.x, z: p.z, r: G.stairBayR })),
  // The head of the stair. A stair that arrives INTO a column is a stair the
  // player bounces off at the top of a four-hop climb, which is the worst place
  // in the room to lose a run — so the arcade opens for the landing too.
  Object.freeze({ id: 'landing', x: G.stairX, z: 3.6, r: 4.2 }),
  ...LANE_KEEPOUT,
  ...HOLD.map(h => Object.freeze({ id: h.id, x: h.x, z: h.z, r: h.r })),
  ...PORTALS.map(p => Object.freeze({ id: 'portal', x: p.spawnX, z: p.spawnZ, r: 2.4 })),
  Object.freeze({ id: 'dais', x: DAIS.x, z: DAIS.z, r: 8.2 }),
]);

const GROUND_KEEPOUTS = ['start', 'approach', 'stair', 'lane', 'dais', 'portal', ...HOLD_IDS];

// ---------------------------------------------------------------------------
// THE THIRTEEN WAYPOINTS. Authored HERE rather than in the gate, because they
// are level design: the room claims its mezzanine is reachable, so the room
// states the route and tests/traversal.mjs drives the real controller down it at
// 30 / 60 / 120 Hz. `speed` is a cap the driver holds by tapping forward, which
// is what a player does approaching a jump; `jumpWithin` is the horizontal
// distance to the waypoint at which the jump is committed.
//
// At the 4.2 m/s approach cap a 1.6 m hop carries 3.73 m of air, so every hop
// leaves the lip with 1.0-2.2 m of tread to land on. At the full 10.6 m run it
// carries 9.4 m and would overshoot every plinth in the room — which is why the
// cap is authored data and not a comment.
// ---------------------------------------------------------------------------
const APPROACH_SPEED = 4.2;
const WAYPOINTS = Object.freeze([
  Object.freeze({ id: 'nave', x: 0, y: 0, z: 30, tier: 0 }),
  Object.freeze({ id: 'stair-foot', x: G.stairX, y: 0, z: 27, tier: 0, speed: APPROACH_SPEED }),
  Object.freeze({ id: 'plinth-1', x: G.stairX, y: 1.6, z: 21.4, tier: 0, speed: APPROACH_SPEED, jumpWithin: 4.1 }),
  Object.freeze({ id: 'plinth-2', x: G.stairX, y: 3.2, z: 15.2, tier: 0, speed: APPROACH_SPEED, jumpWithin: 3.9 }),
  Object.freeze({ id: 'plinth-3', x: G.stairX, y: 4.8, z: 9.4, tier: 0, speed: APPROACH_SPEED, jumpWithin: 3.7 }),
  Object.freeze({ id: 'deck-south', x: G.stairX, y: G.mezzY, z: 2, tier: 1, speed: APPROACH_SPEED, jumpWithin: 6.4 }),
  Object.freeze({ id: 'deck-mid', x: G.stairX, y: G.mezzY, z: -16, tier: 1 }),
  Object.freeze({ id: 'deck-north', x: G.stairX, y: G.mezzY, z: -31.1, tier: 1 }),
  // The bridge is crossed END TO END before the balcony is entered. A diagonal
  // from the bridge to the balcony leaves the deck over open nave — the drop is
  // authored, and this is the difference between authored and accidental.
  Object.freeze({ id: 'bridge', x: 0, y: G.mezzY, z: -31.1, tier: 1 }),
  Object.freeze({ id: 'balcony-north', x: -G.stairX, y: G.mezzY, z: -31.1, tier: 1 }),
  Object.freeze({ id: 'breach', x: 11, y: G.mezzY, z: -22.7, tier: 1, speed: APPROACH_SPEED }),
  // Straight west out of the breach and 6.4 m down into the nave.
  Object.freeze({ id: 'nave-floor', x: 4.5, y: 0, z: -24.6, tier: 0, speed: APPROACH_SPEED }),
  // Up the lane and onto the dais — the ground a LANTERN holds at 70 m, walked
  // to from the mark the player read it from.
  Object.freeze({ id: 'perch', x: G.perchX, y: G.daisY, z: -35.6, tier: 0, speed: APPROACH_SPEED, jumpWithin: 4.4 }),
]);

// ---------------------------------------------------------------------------
// THE SPEC
// ---------------------------------------------------------------------------
export const SPEC = defineArena({
  id: 'gallery',
  name: 'THE GALLERY',
  tier: 2,

  bounds: { minX: -G.halfX, maxX: G.halfX, minZ: -G.halfZ, maxZ: G.halfZ, minY: G.floorY, maxY: G.ceilingY },
  ceilingY: G.ceilingY,

  // The analytic ground. Physics, mesh, enemy grounding, scar placement, contact
  // blobs and the spawn validator all read this one evaluator. The mezzanine is
  // a real platform here — not a collider bolted on afterwards — which is what
  // lets a LANTERN stand on it and what gives the floor beneath it a ceiling.
  ground: {
    id: 'gallery', shape: 'rect', floorY: G.floorY, tier: 0,
    halfX: G.halfX, halfZ: G.halfZ,
    wallHeight: G.ceilingY, wallThickness: G.wallThickness,
    platforms: PLATFORMS,
    ramps: [],
  },

  playerStart: { x: G.playerStart.x, y: G.playerStart.y, z: G.playerStart.z, yaw: G.playerStart.yaw },
  tiers: [
    { id: 0, y: G.floorY, name: 'floor' },
    { id: 1, y: G.mezzY, name: 'mezzanine' },
  ],

  lanes: {
    nave: { ax: 0, az: -G.halfZ + 2, bx: 0, bz: G.playerStart.z, halfWidth: G.laneHalfX },
    west: { ax: -11.7, az: -30, bx: -11.7, bz: 30, halfWidth: 2.6 },
    east: { ax: 11.7, az: -30, bx: 11.7, bz: 30, halfWidth: 2.6 },
    deck: { ax: G.stairX, az: -31, bx: G.stairX, bz: 4, halfWidth: 1 },
  },

  portals: PORTALS,
  // The waves walk UPWARD, not outward: the far end first (so the first thing
  // the player ever sees in this room is a lamp switching on at 70 m), then the
  // flanks, then the balconies, then everything.
  waveSpawns: [
    ['p-n-w', 'p-n-e'],
    ['p-n-w', 'p-n-e', 'p-w-n', 'p-e-n'],
    ['p-mz-w-n', 'p-mz-e-n', 'p-w-m', 'p-e-m'],
    ['p-mz-w-n', 'p-mz-w-s', 'p-mz-e-n', 'p-w-s', 'p-e-s', 'p-s-w', 'p-s-e'],
    ['p-n-w', 'p-n-e', 'p-w-n', 'p-w-m', 'p-w-s', 'p-e-n', 'p-e-m', 'p-e-s',
      'p-mz-w-n', 'p-mz-w-s', 'p-mz-e-n', 'p-s-w', 'p-s-e'],
  ],

  // AI routes. Tier is published per node so a walker compares its own tier
  // against the player's and steers to a stair node rather than pathfinding.
  routes: {
    'nave-north': [
      { x: 0, y: 0, z: -33, tier: 0 }, { x: 0, y: 0, z: -22, tier: 0 },
      { x: 0, y: 0, z: -2, tier: 0 }, { x: 0, y: 0, z: 14, tier: 0 },
      { x: 0, y: 0, z: 22, tier: 0 },
    ],
    'west-aisle': [
      { x: -13.4, y: 0, z: -28, tier: 0 }, { x: -12.6, y: 0, z: -14, tier: 0 },
      { x: -11.6, y: 0, z: 2, tier: 0 }, { x: -8.6, y: 0, z: 16, tier: 0 },
      { x: -4.4, y: 0, z: 24, tier: 0 },
    ],
    'east-aisle': [
      { x: 13.4, y: 0, z: -28, tier: 0 }, { x: 12.6, y: 0, z: -14, tier: 0 },
      { x: 11.6, y: 0, z: 2, tier: 0 }, { x: 8.6, y: 0, z: 16, tier: 0 },
      { x: 4.4, y: 0, z: 24, tier: 0 },
    ],
    'deck-west': [
      { x: -14, y: G.mezzY, z: -27, tier: 1 }, { x: G.stairX, y: G.mezzY, z: -24, tier: 1 },
      { x: G.stairX, y: G.mezzY, z: -10, tier: 1 }, { x: G.stairX, y: G.mezzY, z: 2, tier: 1 },
    ],
    'deck-east': [
      { x: 14, y: G.mezzY, z: -27, tier: 1 }, { x: -G.stairX, y: G.mezzY, z: -22, tier: 1 },
      { x: -G.stairX, y: G.mezzY, z: -8, tier: 1 },
    ],
    'deck-bridge': [
      { x: G.stairX, y: G.mezzY, z: -31.1, tier: 1 }, { x: 0, y: G.mezzY, z: -31.1, tier: 1 },
      { x: -G.stairX, y: G.mezzY, z: -31.1, tier: 1 },
    ],
    'stair-up': [
      { x: G.stairX, y: 0, z: 27, tier: 0 }, { x: G.stairX, y: 1.6, z: 21.4, tier: 0 },
      { x: G.stairX, y: 3.2, z: 15.2, tier: 0 }, { x: G.stairX, y: 4.8, z: 9.4, tier: 0 },
      { x: G.stairX, y: G.mezzY, z: 3.2, tier: 1 },
    ],
  },

  recoveryNodes: [
    { x: 0, y: 0, z: 34 }, { x: 0, y: 0, z: 22 }, { x: 0, y: 0, z: -2 },
    { x: 0, y: 0, z: -22 }, { x: -12, y: 0, z: 12 }, { x: 12, y: 0, z: 12 },
    { x: -12, y: 0, z: -18 }, { x: 12, y: 0, z: -18 },
    { x: G.stairX, y: G.mezzY, z: -16 }, { x: -G.stairX, y: G.mezzY, z: -20 },
    { x: 0, y: G.mezzY, z: -31.1 }, { x: 0, y: G.daisY, z: G.daisZ },
  ],

  coverNodes: BLOCKS.map(coverNodeFor),
  holdingGround: HOLD,
  keepOuts: KEEP_OUTS,

  lightGoal: G.lightGoal,
  tensionFloor: FEEL.tension.floors.gallery,
  maxSightline: G.maxSightline,
  // NOT a local value. 0.011 is 45% extinction at 70 m; the draft's 0.020 was
  // 86% and made this chamber's premise fictional. Re-thickening it here would
  // reintroduce that bug in one chamber only, which is the hardest kind to find.
  fogDensity: FEEL.render.fogDensity,
  scarDepositScale: 1,
  // LIGHT RULE: the ROOM contributes nothing. The only lights in this chamber
  // that are not the player's are the LANTERNs' 0.80 s charge telegraphs, and
  // those belong to W7-ENEMIES, not to the architecture. A static light here
  // would be the chamber answering its own question.
  staticLights: [],
  palette: P,

  roster: ['lantern', 'husk', 'runner'],
  director: {
    queue: D.queue, cap: D.cap, interval: D.interval,
    weights: { husk: D.weights.husk, lantern: D.weights.lantern, runner: D.weights.runner },
  },

  // ---- what this chamber claims about itself, so the gate can measure it ----
  sightline: {
    fromX: G.playerStart.x, fromY: FEEL.move.eye, fromZ: G.playerStart.z,
    toX: G.perchX, toY: G.daisY + LANTERN.height * 0.8, toZ: G.perchZ,
    distance: G.sightline,
    laneHalfX: G.laneHalfX,
    laneClear: G.laneClear,
    // The corridor the sweep runs over. It stops 0.2 m short of the dais rather
    // than at the wall, because the dais IS the far end: a 1.2 m step is not an
    // obstacle to a line that arrives 1.4 m above it, and a boundary that lands
    // exactly on the step would make the sweep argue with itself. The RAY test
    // covers the remaining 2.4 m, and it covers it exactly.
    laneMinZ: DAIS.z + DAIS.hz + 0.2, laneMaxZ: G.playerStart.z,
    laneLoY: 0.4, laneHiY: 3.2,
  },
  traversal: { waypoints: WAYPOINTS, arriveRadius: 1.4, approachSpeed: APPROACH_SPEED },
  // DESIGN, chamber 3: "Clear reward: +25 max health (75 -> 100)."
  reward: { maxHealth: FEEL.economy.maxHealth - FEEL.economy.maxHealthEarly },

  // -------------------------------------------------------------------------
  // ELEMENTS. Order matters twice: `mirror` reads an element resolved before it,
  // and the WORLD layer draws in insertion order (scene.sortObjects is off), so
  // the floor goes down before what stands on it.
  // -------------------------------------------------------------------------
  elements: [
    {
      id: 'floor', mode: 'static', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.floor, detail: 1,
      transform: { y: G.floorY, sx: G.halfX + 0.6, sz: G.halfZ + 0.6 },
    },
    {
      id: 'ceilingSlab', mode: 'static', shape: 'quad', shapeArgs: { face: 'down' }, material: 'surface',
      color: P.dark, detail: 0.9,
      transform: { y: G.ceilingY, sx: G.halfX + 0.6, sz: G.halfZ + 0.6 },
    },
    {
      // The alcove backs, seen only through the portal gaps in the panel runs.
      id: 'wallBack', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'front' }, material: 'surface',
      color: P.dark, detail: 0.85,
      place: {
        kind: 'list',
        points: [
          { x: 0, y: G.ceilingY / 2, z: -(G.halfZ + G.wallBackDepth), yaw: 0, sx: G.halfX + 0.8, sy: G.ceilingY / 2 },
          { x: 0, y: G.ceilingY / 2, z: G.halfZ + G.wallBackDepth, yaw: Math.PI, sx: G.halfX + 0.8, sy: G.ceilingY / 2 },
          { x: -(G.halfX + G.wallBackDepth), y: G.ceilingY / 2, z: 0, yaw: Math.PI / 2, sx: G.halfZ + 0.8, sy: G.ceilingY / 2 },
          { x: G.halfX + G.wallBackDepth, y: G.ceilingY / 2, z: 0, yaw: -Math.PI / 2, sx: G.halfZ + 0.8, sy: G.ceilingY / 2 },
        ],
      },
      vary: { tint: [0.70, 0.88], macro: 0.12, warm: 0.02 },
    },
    {
      id: 'wallPanelLower', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.94,
      place: {
        kind: 'perimeter', halfX: G.halfX, halfZ: G.halfZ, y: LOWER_BAND.y,
        segment: 2.6, widthJitter: 0.24,
        gaps: LOWER_PORTALS.map(p => ({ x: p.x, z: p.z, r: G.portalGap })),
      },
      vary: {
        halfAxis: 'x', scale: { y: [LOWER_BAND.half, LOWER_BAND.half], z: [0.82, 1.28] },
        tint: [0.80, 1.14], macro: 0.26,
      },
    },
    {
      // The upper band is a different course of masonry — narrower bays, drier
      // tint. Two bands is what gives a 13.4 m wall a horizontal at mezzanine
      // height, which is the line that tells you how high the balcony is when
      // the only thing lighting it is a muzzle flash 40 m away.
      id: 'wallPanelUpper', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.88,
      place: {
        kind: 'perimeter', halfX: G.halfX, halfZ: G.halfZ, y: UPPER_BAND.y,
        segment: 2.15, widthJitter: 0.20,
        gaps: UPPER_PORTALS.map(p => ({ x: p.x, z: p.z, r: G.portalGap })),
      },
      vary: {
        halfAxis: 'x', scale: { y: [UPPER_BAND.half, UPPER_BAND.half], z: [0.62, 0.96] },
        tint: [0.68, 1.02], macro: 0.24, warm: 0.03,
      },
    },
    {
      id: 'portalFrame', mode: 'instanced', shape: 'portalFrame', material: 'surface',
      color: P.metal, detail: 0.78,
      place: {
        kind: 'list',
        points: PORTALS.map(p => ({ x: p.x, y: bandOf(p).y + 0.05, z: p.z, yaw: p.yaw, sy: bandOf(p).half })),
      },
      // Thirteen doors on four walls means several pairs that share a yaw and a
      // band. Without a scale draw those are literally identical instances —
      // automatic failure #10 in the one element the player stares at while
      // something walks out of it. sx stays under portalGap / 1.06.
      vary: { scale: { x: [1.50, 1.72], z: [0.86, 1.18] }, tint: [0.76, 1.02], macro: 0.10, warm: 0.03 },
    },
    {
      // The colonnade. Two rows a side: the inner at the mezzanine's own edge,
      // the outer carrying the deck. Where the balcony has fallen (the east
      // aisle south of the crossing) the piers still stand, sheared off at deck
      // height — the ruin is authored, not an accident of a placement rule.
      id: 'pier', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: {
        kind: 'lattice',
        xs: [-G.colOuterX, -G.colInnerX, G.colInnerX, G.colOuterX],
        zs: COL_Z, jitter: G.colJitter, y: G.floorY,
      },
      keepOut: ['stair', 'approach', 'start', ...HOLD_IDS],
      vary: {
        scale: { x: [0.40, 0.56], y: [G.mezzY - G.mezzThickness - 0.06, G.mezzY - G.mezzThickness + 0.02], z: [0.40, 0.56] },
        yaw: [0, TAU], tiltMax: 0.008, tint: [0.82, 1.14], macro: 0.28,
      },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      // Contact. RENDER.md automatic failure #5 is "objects that float"; a dark
      // base skirt is what welds a column to a floor in an engine with no shadow
      // map. Tinted well below its host on purpose.
      id: 'pierCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'pier', y: G.floorY },
      vary: {
        followScale: true, scale: { x: [1.30, 1.48], y: [0.32, 0.50], z: [1.30, 1.48] },
        yaw: [0, TAU], tint: [0.50, 0.72], macro: 0.20,
      },
    },
    {
      id: 'pierCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'mirror', of: 'pier' },
      vary: {
        followScale: true, scale: { x: [1.08, 1.26], y: [0.48, 0.62], z: [1.08, 1.26] },
        yaw: [0, TAU], anchorTop: G.mezzY - G.mezzThickness, tint: [0.72, 1.00], macro: 0.22,
      },
    },
    {
      // The deck's underside, which in this room is a CEILING for half the fight.
      id: 'mezzSoffit', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'down' }, material: 'surface',
      color: P.dark, detail: 0.92,
      place: {
        kind: 'list',
        points: MEZZ.map(m => ({ x: m.x, y: m.y - G.mezzThickness, z: m.z, yaw: 0, sx: m.hx, sz: m.hz })),
      },
      vary: { tint: [0.62, 0.84], macro: 0.18 },
    },
    {
      id: 'mezzDeck', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.mezzanine, detail: 1,
      place: { kind: 'list', points: MEZZ.map(m => ({ x: m.x, y: m.y, z: m.z, yaw: 0, sx: m.hx, sz: m.hz })) },
      vary: { tint: [0.86, 1.06], macro: 0.20 },
    },
    {
      // The fascia closes the 0.34 m edge of the slab. It is the single most
      // visible piece of architecture in the room, because it is the only
      // horizontal a muzzle flash from the nave floor can actually reach.
      id: 'mezzFascia', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: {
        kind: 'list',
        points: [
          ...lineRun(-G.mezzOuterX, G.mezzNorthZ, G.mezzOuterX, G.mezzNorthZ, 2.6, G.mezzY, Math.PI),
          ...lineRun(-G.mezzInnerX, G.bridgeSouthZ, -G.mezzInnerX, G.mezzWestSouthZ, 2.6, G.mezzY, Math.PI / 2),
          ...lineRun(-G.mezzOuterX, G.mezzWestSouthZ, -G.mezzInnerX, G.mezzWestSouthZ, 2.2, G.mezzY, 0),
          ...lineRun(G.mezzInnerX, G.bridgeSouthZ, G.mezzInnerX, G.mezzEastSouthZ, 2.6, G.mezzY, -Math.PI / 2),
          ...lineRun(G.mezzOuterX, G.mezzEastSouthZ, G.mezzInnerX, G.mezzEastSouthZ, 2.2, G.mezzY, 0),
          ...lineRun(-G.mezzInnerX, G.bridgeSouthZ, G.mezzInnerX, G.bridgeSouthZ, 2.4, G.mezzY, 0),
        ],
      },
      vary: {
        halfAxis: 'x', scale: { y: [0.16, 0.20], z: [0.34, 0.52] },
        anchorTop: G.mezzY, tint: [0.66, 1.00], macro: 0.24, warm: 0.03,
      },
    },
    {
      // Panelling on the deck, quantised yaw with slop so it reads as LAID
      // rather than generated (automatic failure #14) and macro-tinted so it
      // does not tile (#3).
      id: 'mezzPlate', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'list', points: MEZZ.flatMap(m => rectGrid(m, 3.2, 0.5, G.mezzY + 0.045)) },
      vary: {
        scale: { x: [0.95, 1.45], y: [0.030, 0.055], z: [0.95, 1.45] },
        yawQuantum: Math.PI / 2, yawFine: 0.05, tint: [0.70, 1.10], macro: 0.32,
      },
    },
    {
      // The parapet running the deck's inner edge, with authored embrasures.
      // Runs along Z, so the placer owns the Z half-extent.
      id: 'parapetZ', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.96,
      place: {
        kind: 'list',
        points: [
          ...lineRun(-G.mezzInnerX - G.parapetHalfT, G.bridgeSouthZ, -G.mezzInnerX - G.parapetHalfT, G.mezzWestSouthZ,
            G.parapetSegment, G.mezzY, 0, PARAPET_WEST_VOIDS),
          ...lineRun(G.mezzInnerX + G.parapetHalfT, G.bridgeSouthZ, G.mezzInnerX + G.parapetHalfT, G.mezzEastSouthZ,
            G.parapetSegment, G.mezzY, 0, PARAPET_EAST_VOIDS),
        ],
      },
      vary: {
        halfAxis: 'z', scale: { x: [0.30, 0.38], y: [0.52, 0.58] },
        anchorBottom: G.mezzY, tint: [0.72, 1.10], macro: 0.26,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // The same parapet where it runs along X — the bridge's south face and the
      // north end of the ring.
      id: 'parapetX', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.96,
      place: {
        kind: 'list',
        points: [
          ...lineRun(-G.mezzInnerX, G.bridgeSouthZ - G.parapetHalfT, G.mezzInnerX, G.bridgeSouthZ - G.parapetHalfT,
            G.parapetSegment, G.mezzY, 0, PARAPET_BRIDGE_VOIDS),
          ...lineRun(-G.mezzOuterX, G.mezzNorthZ + G.parapetHalfT, G.mezzOuterX, G.mezzNorthZ + G.parapetHalfT,
            G.parapetSegment, G.mezzY, 0),
        ],
      },
      vary: {
        halfAxis: 'x', scale: { y: [0.52, 0.58], z: [0.30, 0.38] },
        anchorBottom: G.mezzY, tint: [0.72, 1.10], macro: 0.26,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // The arcade standing ON the deck. Two rows, and the 1.98 m band between
      // them is the mezzanine's walking lane — wide enough for the player's
      // 0.68 m capsule with 0.65 m to spare on either side, which is why the
      // traversal route can be a straight line instead of a slalom.
      id: 'upperColumn', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: {
        kind: 'list',
        points: [
          ...COL_Z.filter(z => z > G.mezzNorthZ + 1.2 && z < G.mezzWestSouthZ - 1.2)
            .flatMap(z => [-G.upperOuterX, -G.upperInnerX].map(x => ({ x, y: G.mezzY, z, yaw: 0 }))),
          ...COL_Z.filter(z => z > G.mezzNorthZ + 1.2 && z < G.mezzEastSouthZ - 1.2)
            .flatMap(z => [G.upperInnerX, G.upperOuterX].map(x => ({ x, y: G.mezzY, z, yaw: 0 }))),
        ],
      },
      keepOut: ['landing', ...HOLD_IDS],
      vary: {
        scale: { x: [0.34, 0.46], y: [G.ceilingY - G.mezzY - 0.12, G.ceilingY - G.mezzY + 0.02], z: [0.34, 0.46] },
        yaw: [0, TAU], tiltMax: 0.007, tint: [0.80, 1.12], macro: 0.28,
      },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'upperCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'upperColumn', y: G.mezzY },
      vary: {
        followScale: true, scale: { x: [1.28, 1.46], y: [0.26, 0.40], z: [1.28, 1.46] },
        yaw: [0, TAU], tint: [0.50, 0.70], macro: 0.20,
      },
    },
    {
      id: 'upperCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'mirror', of: 'upperColumn' },
      vary: {
        followScale: true, scale: { x: [1.06, 1.24], y: [0.46, 0.60], z: [1.06, 1.24] },
        yaw: [0, TAU], anchorTop: G.ceilingY, tint: [0.72, 1.00], macro: 0.22,
      },
    },
    {
      // THE ASCENT. Explicit sizes, never a random draw: the collider top and the
      // analytic platform's `y` are the same arithmetic, so a step is exactly as
      // tall as the number that says a step must be jumped.
      id: 'plinth', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: PLINTH.map(slabPoint) },
      vary: { tint: [0.78, 1.08], macro: 0.24 },
      collider: { tag: 'prop', flags: ['support', 'barrier'], half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'dais', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: [slabPoint(DAIS)] },
      vary: { tint: [0.84, 1.02], macro: 0.16 },
      collider: { tag: 'prop', flags: ['support', 'barrier'], half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // Spoil on the steps and the dais. Authored positions with three-axis
      // rotation, so the stair does not read as four clean extrusions.
      id: 'plinthDebris', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: {
        kind: 'list',
        points: [
          { x: -9.8, y: 1.6, z: 19.6, yaw: 0.4 }, { x: -12.9, y: 1.6, z: 23.1, yaw: 2.7 },
          { x: -10.4, y: 1.6, z: 22.6, yaw: 5.1 }, { x: -13.1, y: 1.6, z: 19.9, yaw: 1.2 },
          { x: -9.9, y: 3.2, z: 13.9, yaw: 3.9 }, { x: -12.8, y: 3.2, z: 16.8, yaw: 0.8 },
          { x: -11.4, y: 3.2, z: 13.4, yaw: 5.6 }, { x: -12.4, y: 4.8, z: 8.2, yaw: 2.1 },
          { x: -10.1, y: 4.8, z: 10.9, yaw: 4.4 }, { x: -9.6, y: 4.8, z: 8.4, yaw: 1.7 },
          { x: -5.4, y: 1.2, z: -34.1, yaw: 0.9 }, { x: 5.1, y: 1.2, z: -34.4, yaw: 3.4 },
          { x: -2.6, y: 1.2, z: -36.2, yaw: 5.9 }, { x: 3.2, y: 1.2, z: -36.4, yaw: 2.3 },
          { x: 0.9, y: 1.2, z: -33.8, yaw: 4.9 }, { x: -4.1, y: 1.2, z: -36.4, yaw: 1.4 },
        ],
      },
      vary: {
        scale: { x: [0.16, 0.44], y: [0.12, 0.34], z: [0.16, 0.42] },
        yaw: [0, TAU], tiltMax: 0.40, tint: [0.60, 1.14], macro: 0.36,
      },
    },
    {
      // Ceiling bays. In a room lit only from below, the ceiling rhythm is the
      // depth cue: twenty-five bays at 2.9 m is what turns "far" into "seventy
      // metres" without a single number on screen.
      id: 'beam', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.metal, detail: 0.72,
      place: { kind: 'runs', along: 'x', halfX: 14.6, halfZ: 36.4, spacing: 2.9, segment: 9.0, widthJitter: 0.30, gap: 0.06, y: 12.9 },
      vary: { halfAxis: 'x', scale: { y: [0.36, 0.45], z: [0.85, 1.15] }, tint: [0.70, 1.06], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'beamCross', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.metal, detail: 0.72,
      place: { kind: 'runs', along: 'z', halfX: 14.6, halfZ: 36.4, spacing: 7.3, segment: 12.0, widthJitter: 0.26, gap: 0.05, y: 12.55 },
      vary: { halfAxis: 'x', scale: { y: [0.18, 0.24], z: [1.10, 1.45] }, tint: [0.68, 1.02], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'duct', mode: 'instanced', shape: 'duct', material: 'surface',
      color: P.metal, detail: 0.68,
      place: { kind: 'runs', along: 'z', halfX: 11.6, halfZ: 34, spacing: 11.6, segment: 7.0, widthJitter: 0.24, gap: 0.12, y: 12.1 },
      vary: { halfAxis: 'x', scale: { y: [0.55, 0.74], z: [0.80, 1.10] }, tint: [0.64, 1.00], macro: 0.18, warm: 0.05 },
    },
    {
      id: 'block', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: BLOCKS.map(b => ({ x: b.x, y: b.sy, z: b.z, yaw: b.yaw, sx: b.sx, sy: b.sy, sz: b.sz })) },
      vary: { tint: [0.78, 1.12], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // Broken columns in the aisles and on the nave shoulders. Never in the
      // lane: `lane` is in this element's keep-out list and the gate sweeps the
      // baked boxes to prove it.
      id: 'stub', mode: 'instanced', shape: 'stub', material: 'surface',
      color: P.substructure, detail: 1,
      place: {
        kind: 'lattice',
        xs: [-13.4, -10.2, -6.9, 6.9, 10.2, 13.4],
        zs: Array.from({ length: 11 }, (_, i) => (i - 5) * 6.5),
        jitter: 0.9, y: G.floorY,
      },
      keepOut: GROUND_KEEPOUTS,
      vary: {
        scale: { x: [0.42, 0.72], y: [0.85, 2.45], z: [0.42, 0.72] },
        yaw: [0, TAU], tiltMax: 0.022, tint: [0.76, 1.10], macro: 0.30,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'stubCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'stub', y: G.floorY },
      vary: {
        followScale: true, scale: { x: [1.24, 1.44], y: [0.26, 0.40], z: [1.24, 1.44] },
        yaw: [0, TAU], tint: [0.48, 0.70], macro: 0.20,
      },
    },
    {
      // Cable channels across the nave every 6.5 m. Low enough to be inside
      // GALLERY.laneClear, which is exactly why they may cross the line: they
      // are the floor's own ruler, and reading the ruler is reading the distance.
      id: 'kerb', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'runs', along: 'x', halfX: 14, halfZ: 34, spacing: 6.5, offset: 3.25, segment: 7.0, widthJitter: 0.34, gap: 0.5, y: 0 },
      keepOut: ['start'],
      vary: { halfAxis: 'x', scale: { y: [0.07, 0.12], z: [0.20, 0.34] }, anchorBottom: G.floorY, tint: [0.68, 1.06], macro: 0.28 },
    },
    {
      id: 'plate', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'lattice', halfX: 13.6, halfZ: 35.2, spacing: 3.4, jitter: 0.9, y: 0.045 },
      keepOut: ['start'],
      vary: {
        scale: { x: [0.95, 1.55], y: [0.030, 0.055], z: [0.95, 1.55] },
        yawQuantum: Math.PI / 2, yawFine: 0.055, tint: [0.70, 1.10], macro: 0.34,
      },
    },
    {
      // Rubble, in two grades. Two elements rather than one 680-instance element
      // for a reason build.js measured: the dart-throw is the fattest job in a
      // chamber build, and BUILD.maxJobMs is 1.5 ms. Two jobs of 340 fit; one of
      // 680 does not, and it would have shipped a busted slice budget behind a
      // passing average.
      id: 'chunk', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'scatter', count: 380, minDist: 0.72, minX: -14.4, maxX: 14.4, minZ: -36.2, maxZ: 36.2, y: G.floorY },
      keepOut: ['start'],
      vary: {
        scale: { x: [0.12, 0.42], y: [0.09, 0.30], z: [0.12, 0.40] },
        yaw: [0, TAU], tiltMax: 0.42, tint: [0.60, 1.16], macro: 0.40,
      },
    },
    {
      id: 'chunkFine', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'scatter', count: 320, minDist: 0.48, minX: -14.6, maxX: 14.6, minZ: -36.4, maxZ: 36.4, y: G.floorY },
      keepOut: ['start'],
      vary: {
        scale: { x: [0.06, 0.18], y: [0.05, 0.14], z: [0.06, 0.17] },
        yaw: [0, TAU], tiltMax: 0.55, tint: [0.56, 1.18], macro: 0.44,
      },
    },
    {
      // The head stop. One box per ceiling cell, because a 30 x 74 m slab baked
      // as ONE collider is 74 m on an axis and collide.js refuses it at 40 —
      // correctly. Segmenting is the rule's intent, not a workaround for it.
      id: 'ceilingStop', mode: 'collider', shape: 'none', material: 'none',
      place: {
        kind: 'lattice',
        xs: [-7.5, 7.5], zs: [-27.75, -9.25, 9.25, 27.75],
        y: G.clearanceY + 0.18, jitter: 0,
      },
      collider: { tag: 'ceiling', flags: ['ceiling', 'barrier'], half: [7.5, 0.18, 9.25], center: [0, 0, 0] },
    },
  ],
});

export default SPEC;
