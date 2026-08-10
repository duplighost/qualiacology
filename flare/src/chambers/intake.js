// THE INTAKE — chamber 1, and the only chamber whose job is to teach.
//
// docs/DESIGN.md: "A wide flat floor under a low ceiling, pillars scattered at
// 6-11 m. HUSK and RUNNER only. The teaching chamber, taught entirely by play:
// your first shot lights a cone and you see there are more of them than you
// thought; your first kill leaves a pool of light and you understand you are
// building the room. LIGHT RULE: baseline."
//
// There is no tutorial text and there is no scripted prompt, so both discoveries
// have to be MADE BY THE ARCHITECTURE. Each is a placement rule with a number
// behind it, and tests/world.mjs asserts the number:
//
//   DISCOVERY 1 — "there are more of them than you thought."
//   The player starts in the open southern approach, 5 m short of the first
//   lattice row, facing the length of the room. The REVEAL CLUSTER is eight
//   authored columns arranged in an arc between 8.9 and 11.6 m ahead — six of
//   them inside the hip cone, two just outside it in the periphery. Everything
//   in that arc sits between the SIDEARM's 9 m flash radius and the LANCE's
//   12 m, which is exactly the band where the muzzle falloff is steep. In the
//   dark those columns are an undifferentiated grey; one shot separates them by
//   distance, and two of them are only found by turning. The gate asserts at
//   least eight columns inside the first-shot cone.
//
//   DISCOVERY 2 — "you are building the room."
//   Every holding-ground node is a cleared cell RINGED BY FOUR COLUMNS at about
//   5.2 m. A HUSK scar is r 3.4 and its decal is r 4.6, so the pool a first kill
//   leaves reaches the feet of four pillars and uplights them. A pool on bare
//   floor is a stain; a pool that finds architecture is a room appearing. The
//   gate asserts >= 4 columns within 6.4 m of every holding-ground node.
//
// DENSITY IS THE LOOK (docs/RENDER.md automatic failure #4). A dark room is not
// an excuse for an empty one: what the flash reveals has to be worth revealing.
// Fifteen instanced elements, ~1100 instances, ~150k triangles, seventeen draw
// calls, and per-instance rotation / non-uniform scale / macro-noise tint on
// every one of them.
//
// NO THREE.JS. This module is frozen data, exactly like ground.js's tables, so
// the whole chamber can be measured headless.

import FEEL from '../feel.js';
import { defineArena } from '../world/build.js';

const D = FEEL.director.chambers.intake;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this chamber. Level design, not tuning: it is here
// for the same reason GROUND.helix holds the helix's numbers rather than
// FEEL_PROFILE. Anything that governs the FEEL of the game lives in feel.js and
// is read from there — see `director`, `tensionFloor` and `fogDensity` below.
// ---------------------------------------------------------------------------
export const INTAKE = Object.freeze({
  halfX: 26,
  halfZ: 22,
  floorY: 0,
  // Two ceilings, and the difference is deliberate. `clearanceY` is where the
  // player's HEAD stops; `ceilingY` is where the slab is. The 1.0 m between them
  // is where the beams hang, so a jump can never put the camera inside one —
  // which is the failure the sibling project shipped as "the roof flickers".
  clearanceY: 4.6,
  ceilingY: 5.6,
  wallThickness: 0.6,
  wallBackDepth: 1.18,        // how far the alcove behind a portal recesses

  // The pillar field. Spacing 7.4 with +-0.62 of jitter puts every nearest
  // neighbour in [6.16, 8.64] — inside DESIGN's "6-11 m" with the whole jitter
  // range to spare on both sides, which is what makes the assertion meaningful
  // rather than a restatement of the constant.
  pillarSpacing: 7.4,
  pillarJitter: 0.62,
  pillarHalfX: 22.2,
  pillarHalfZ: 14.8,
  stubJitter: 1.1,

  playerStart: Object.freeze({ x: 0, y: 0, z: 19.8, yaw: 0 }),   // yaw 0 looks down -Z
  approachClear: 3.6,
  holdRadius: 3.4,
  portalGap: 1.6,             // wall-panel exclusion radius around a portal
  portalInset: 1.0,           // how far inside the room a body materialises

  // The mood filter reads litFraction = scarLightTotal / lightGoal (W3-AUDIO's
  // handoff request). INTAKE's director queues 26 bodies at HUSK 1.00 / RUNNER
  // 1.25 deposit intensity, weighted .70/.30 -> mean 1.075 per kill; merges add
  // only 0.45 of a repeat, and at 7.4 m spacing roughly a third of kills merge.
  // 26 * 1.075 * (2/3 + 1/3 * 0.45) ~= 22.3, rounded down so a clean run reaches
  // "fully lit" slightly before the last body rather than never.
  lightGoal: 20,
  maxSightline: 34,

  // THE PALETTE, and the reason it is exactly this dark. Both bounds were
  // MEASURED on the shipping page, because the usable window turned out to be
  // one stop wide and neither edge is guessable:
  //
  //   TOO LIGHT — FEEL.render.drab (0x8a8f94) on an up-facing floor under
  //   ambient 0.025 + hemi 0.045 at a fully open iris lands at 51/255 with NO
  //   LIGHT IN THE ROOM AT ALL. The room is readable, and a readable room
  //   deletes the game.
  //
  //   TOO DARK — the grade expands contrast about a pivot, so at
  //   FEEL.render.contrast 1.10 everything below ~0.0164 linear is crushed to
  //   pure black. 0x33383d measured a mean frame luma of 0.0005: not a dark
  //   room, an off monitor. "Darker" is not free and it is not monotone.
  //
  // Inside that window: the floor is the darkest surface and the columns are
  // the lightest, which is the right art direction for the same reason it is the
  // right engineering — the flash has to find the vertical, and a pool only
  // reads as a pool against a floor that is darker than it. Values are authored;
  // polishColor moves their chroma and leaves their value alone.
  palette: Object.freeze({
    floor: 0x5a6065,          // ~9/255 unlit: inferable, not readable
    plate: 0x5f656a,          // just above the floor, so plates have an edge
    substructure: 0x686e74,   // stubs, blocks, kerbs, capitals
    concrete: 0x7c8288,       // columns and wall panels: what the flash finds
    metal: 0x6f695d,          // oxidised, warm — the split lives on blue/yellow
    dark: 0x3a3e42,           // alcove backs, ceiling slab, base collars
  }),
});

const I = INTAKE;
const P = I.palette;

// ---------------------------------------------------------------------------
// PORTALS — authored spawn doors. PLAN: "spawn portals authored per ArenaSpec
// are exempt from the illumination veto because they are never in the player's
// line of sight by construction; the 100 degree view-cone veto survives."
//
// Eight of them, and the waves walk outward: chamber 1 teaches that things come
// from in front, then from the sides, then — once — from behind. That escalation
// is the only "tutorial" in the room and it is made of doors.
// ---------------------------------------------------------------------------
const portal = (id, x, z, nx, nz, wall) => Object.freeze({
  id, x, y: 0, z, nx, nz, wall,
  yaw: Math.atan2(nx, nz),
  spawnX: x + nx * I.portalInset,
  spawnZ: z + nz * I.portalInset,
  tier: 0,
});

const PORTALS = Object.freeze([
  portal('p-n-w', -13.0, -I.halfZ, 0, 1, 'north'),
  portal('p-n-e', 13.0, -I.halfZ, 0, 1, 'north'),
  portal('p-w-n', -I.halfX, -8.5, 1, 0, 'west'),
  portal('p-w-s', -I.halfX, 8.5, 1, 0, 'west'),
  portal('p-e-n', I.halfX, -8.5, -1, 0, 'east'),
  portal('p-e-s', I.halfX, 8.5, -1, 0, 'east'),
  portal('p-s-w', -17.5, I.halfZ, 0, -1, 'south'),
  portal('p-s-e', 17.5, I.halfZ, 0, -1, 'south'),
]);

// ---------------------------------------------------------------------------
// HOLDING GROUND — PLAN line 221. Three cleared cells the director biases
// surprises toward, so "does the next thing die here or over there" has
// somewhere to be about. Each one is a stub cell with the stub removed and four
// columns left standing around it at ~5.2 m.
// ---------------------------------------------------------------------------
const HOLD = Object.freeze([
  Object.freeze({ id: 'hold-a', x: -3.7, y: 0, z: 3.7, r: I.holdRadius, role: 'centre' }),
  Object.freeze({ id: 'hold-b', x: 11.1, y: 0, z: -11.1, r: I.holdRadius, role: 'deep-east' }),
  Object.freeze({ id: 'hold-c', x: -11.1, y: 0, z: -3.7, r: I.holdRadius, role: 'west-pocket' }),
]);

// ---------------------------------------------------------------------------
// COVER BLOCKS — every one sits on a LATTICE EDGE MIDPOINT, which is the set of
// points furthest from both the pillar lattice and the stub lattice (3.70 m from
// each). Authoring cover anywhere else means a block that fights a column for
// the same floor, and the player feels it as a corner they cannot round.
// ---------------------------------------------------------------------------
const BLOCKS = Object.freeze([
  Object.freeze({ x: -3.7, z: 0.0, yaw: 0.28, sx: 1.24, sy: 0.52, sz: 0.68 }),
  Object.freeze({ x: 3.7, z: -7.4, yaw: -0.62, sx: 1.10, sy: 0.50, sz: 0.74 }),
  Object.freeze({ x: -11.1, z: -7.4, yaw: 1.12, sx: 0.92, sy: 0.55, sz: 0.62 }),
  Object.freeze({ x: 11.1, z: 0.0, yaw: 0.19, sx: 1.32, sy: 0.48, sz: 0.66 }),
  // Deliberately the smallest block in the room: it stands inside the reveal
  // cluster, and a full-width one leaves a 0.64 m pinch against the nearest
  // column — narrower than the player's own 0.68 m diameter, i.e. a corner that
  // looks passable and is not, in the first 12 m of the game.
  Object.freeze({ x: 0.0, z: 11.1, yaw: -0.94, sx: 0.80, sy: 0.53, sz: 0.62 }),
  Object.freeze({ x: -7.4, z: -11.1, yaw: 0.71, sx: 1.18, sy: 0.51, sz: 0.58 }),
  Object.freeze({ x: -18.5, z: 0.0, yaw: 1.40, sx: 0.86, sy: 0.56, sz: 0.72 }),
  Object.freeze({ x: 18.5, z: -7.4, yaw: -0.35, sx: 1.28, sy: 0.49, sz: 0.64 }),
  Object.freeze({ x: 14.8, z: -11.1, yaw: 0.88, sx: 0.98, sy: 0.54, sz: 0.76 }),
  Object.freeze({ x: -14.8, z: 11.1, yaw: -1.21, sx: 1.14, sy: 0.50, sz: 0.60 }),
  Object.freeze({ x: -11.1, z: 7.4, yaw: 0.44, sx: 0.90, sy: 0.57, sz: 0.70 }),
  Object.freeze({ x: 11.1, z: 7.4, yaw: -0.77, sx: 1.22, sy: 0.47, sz: 0.68 }),
  Object.freeze({ x: 0.0, z: -11.1, yaw: 0.13, sx: 1.02, sy: 0.55, sz: 0.78 }),
  Object.freeze({ x: 22.2, z: -3.7, yaw: -0.51, sx: 1.16, sy: 0.52, sz: 0.62 }),
]);

/** Cover faces the wall it is nearest — that is where bodies come from. */
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
    role: i % 3 === 0 ? 'runner' : 'husk',
  });
}

// ---------------------------------------------------------------------------
// THE REVEAL CLUSTER — discovery 1, made of geometry (see the header).
// ---------------------------------------------------------------------------
const REVEAL = Object.freeze([
  Object.freeze({ x: -2.2, z: 9.8, yaw: 0.4 }),
  Object.freeze({ x: 2.9, z: 8.6, yaw: 1.9 }),
  Object.freeze({ x: -3.6, z: 11.6, yaw: 3.3 }),
  Object.freeze({ x: 4.5, z: 11.0, yaw: 5.1 }),
  Object.freeze({ x: -5.4, z: 12.4, yaw: 2.4 }),
  Object.freeze({ x: 6.0, z: 12.2, yaw: 4.4 }),
  // The two in the periphery. You only find these by turning your head, which is
  // the sentence "there are more of them than you thought" said in geometry.
  Object.freeze({ x: -9.6, z: 16.6, yaw: 0.9 }),
  Object.freeze({ x: 9.9, z: 15.9, yaw: 5.7 }),
]);

const KEEP_OUTS = Object.freeze([
  Object.freeze({ id: 'start', x: I.playerStart.x, z: I.playerStart.z, r: I.approachClear }),
  ...HOLD.map(h => Object.freeze({ id: h.id, x: h.x, z: h.z, r: h.r })),
  ...PORTALS.map(p => Object.freeze({ id: 'portal', x: p.spawnX, z: p.spawnZ, r: 2.4 })),
]);

const HOLD_IDS = HOLD.map(h => h.id);

// ---------------------------------------------------------------------------
// THE SPEC
// ---------------------------------------------------------------------------
export const SPEC = defineArena({
  id: 'intake',
  name: 'THE INTAKE',
  tier: 0,

  bounds: { minX: -I.halfX, maxX: I.halfX, minZ: -I.halfZ, maxZ: I.halfZ, minY: I.floorY, maxY: I.ceilingY },
  ceilingY: I.ceilingY,

  // The analytic ground. Physics, mesh, enemy grounding, scar placement and the
  // spawn validator all read this one evaluator (src/world/ground.js).
  ground: {
    id: 'intake', shape: 'rect', floorY: I.floorY, tier: 0,
    halfX: I.halfX, halfZ: I.halfZ,
    wallHeight: I.ceilingY, wallThickness: I.wallThickness,
    platforms: [], ramps: [],
  },

  playerStart: { x: I.playerStart.x, y: I.playerStart.y, z: I.playerStart.z, yaw: I.playerStart.yaw },
  tiers: [{ id: 0, y: I.floorY, name: 'floor' }],

  lanes: {
    west: { ax: -I.halfX + 2, az: -8.5, bx: -3.7, bz: 3.7, halfWidth: 4.2 },
    centre: { ax: 0, az: -I.halfZ + 2, bx: 0, bz: I.playerStart.z, halfWidth: 5.4 },
    east: { ax: I.halfX - 2, az: -8.5, bx: 3.7, bz: 3.7, halfWidth: 4.2 },
  },

  portals: PORTALS,
  waveSpawns: [
    ['p-n-w', 'p-n-e'],
    ['p-n-w', 'p-n-e', 'p-w-n', 'p-e-n'],
    ['p-w-n', 'p-w-s', 'p-e-n', 'p-e-s', 'p-s-w', 'p-s-e'],
    ['p-n-w', 'p-n-e', 'p-w-n', 'p-w-s', 'p-e-n', 'p-e-s', 'p-s-w', 'p-s-e'],
  ],

  routes: {
    'north-lane': [
      { x: 0, y: 0, z: -20.5, tier: 0 }, { x: 0, y: 0, z: -14.0, tier: 0 },
      { x: -3.7, y: 0, z: -7.0, tier: 0 }, { x: -3.7, y: 0, z: 0.0, tier: 0 },
      { x: -3.7, y: 0, z: 3.7, tier: 0 },
    ],
    'west-lane': [
      { x: -24.5, y: 0, z: -8.5, tier: 0 }, { x: -18.5, y: 0, z: -7.4, tier: 0 },
      { x: -11.1, y: 0, z: -3.7, tier: 0 }, { x: -3.7, y: 0, z: 0.0, tier: 0 },
    ],
    'east-lane': [
      { x: 24.5, y: 0, z: -8.5, tier: 0 }, { x: 18.5, y: 0, z: -7.4, tier: 0 },
      { x: 11.1, y: 0, z: -3.7, tier: 0 }, { x: 3.7, y: 0, z: 0.0, tier: 0 },
    ],
    'south-lane': [
      { x: -17.5, y: 0, z: 20.5, tier: 0 }, { x: -11.1, y: 0, z: 14.8, tier: 0 },
      { x: -3.7, y: 0, z: 7.4, tier: 0 }, { x: -3.7, y: 0, z: 3.7, tier: 0 },
    ],
  },

  recoveryNodes: [
    { x: 0, y: 0, z: 19.8 }, { x: -3.7, y: 0, z: 3.7 }, { x: 11.1, y: 0, z: -11.1 },
    { x: -11.1, y: 0, z: -3.7 }, { x: 18.5, y: 0, z: 11.1 }, { x: -18.5, y: 0, z: -11.1 },
  ],

  coverNodes: BLOCKS.map(coverNodeFor),
  holdingGround: HOLD,
  keepOuts: KEEP_OUTS,

  lightGoal: I.lightGoal,
  tensionFloor: FEEL.tension.floors.intake,
  maxSightline: I.maxSightline,
  fogDensity: FEEL.render.fogDensity,
  scarDepositScale: 1,
  // LIGHT RULE: baseline. The chamber contributes NOTHING. Your gun is the only
  // light in it, which is the sentence the whole game is built on, and the one
  // place it is allowed to be literally true with no exceptions.
  staticLights: [],
  palette: P,

  roster: ['husk', 'runner'],
  director: {
    queue: D.queue, cap: D.cap, interval: D.interval,
    weights: { husk: D.weights.husk, runner: D.weights.runner },
  },

  // -------------------------------------------------------------------------
  // ELEMENTS. Order matters twice: `mirror` reads an element built before it,
  // and the draw order of the WORLD layer is insertion order (scene.sortObjects
  // is disabled), so the floor goes down before what stands on it.
  // -------------------------------------------------------------------------
  elements: [
    {
      id: 'floor', mode: 'static', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.floor, detail: 1,
      transform: { y: I.floorY, sx: I.halfX + 0.6, sz: I.halfZ + 0.6 },
    },
    {
      id: 'ceilingPlate', mode: 'static', shape: 'quad', shapeArgs: { face: 'down' }, material: 'surface',
      color: P.dark, detail: 0.9,
      transform: { y: I.ceilingY, sx: I.halfX + 0.6, sz: I.halfZ + 0.6 },
    },
    {
      // The alcove backs, seen only through the portal gaps in the panel run.
      id: 'wallBack', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'front' }, material: 'surface',
      color: P.dark, detail: 0.85,
      place: {
        kind: 'list',
        points: [
          { x: 0, y: I.ceilingY / 2, z: -(I.halfZ + I.wallBackDepth), yaw: 0, sx: I.halfX + 0.8, sy: I.ceilingY / 2 },
          { x: 0, y: I.ceilingY / 2, z: I.halfZ + I.wallBackDepth, yaw: Math.PI, sx: I.halfX + 0.8, sy: I.ceilingY / 2 },
          { x: -(I.halfX + I.wallBackDepth), y: I.ceilingY / 2, z: 0, yaw: Math.PI / 2, sx: I.halfZ + 0.8, sy: I.ceilingY / 2 },
          { x: I.halfX + I.wallBackDepth, y: I.ceilingY / 2, z: 0, yaw: -Math.PI / 2, sx: I.halfZ + 0.8, sy: I.ceilingY / 2 },
        ],
      },
      vary: { tint: [0.72, 0.88], macro: 0.12, warm: 0.02 },
    },
    {
      id: 'wallPanel', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.92,
      place: {
        kind: 'perimeter', halfX: I.halfX, halfZ: I.halfZ, y: I.ceilingY / 2,
        segment: 2.45, widthJitter: 0.22,
        gaps: PORTALS.map(p => ({ x: p.x, z: p.z, r: I.portalGap })),
      },
      vary: {
        halfAxis: 'x', scale: { y: [I.ceilingY / 2, I.ceilingY / 2], z: [0.85, 1.25] },
        tint: [0.80, 1.12], macro: 0.24,
      },
    },
    {
      id: 'portalFrame', mode: 'instanced', shape: 'portalFrame', material: 'surface',
      color: P.metal, detail: 0.78,
      place: {
        kind: 'list',
        points: PORTALS.map(p => ({ x: p.x, y: I.ceilingY / 2 + 0.05, z: p.z, yaw: p.yaw })),
      },
      // Eight portals on four walls means four pairs that share a yaw. Without a
      // scale draw they are four literally identical instances, which is
      // automatic failure #10 in the one element the player looks straight at
      // while something walks out of it. sx stays under portalGap / 1.06.
      vary: {
        scale: { x: [1.26, 1.44], y: [I.ceilingY / 2 + 0.02, I.ceilingY / 2 + 0.11], z: [0.88, 1.16] },
        tint: [0.78, 1.02], macro: 0.10, warm: 0.03,
      },
    },
    {
      // The pillar field. DESIGN: "pillars scattered at 6-11 m".
      id: 'pillar', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: {
        kind: 'lattice', halfX: I.pillarHalfX, halfZ: I.pillarHalfZ,
        spacing: I.pillarSpacing, jitter: I.pillarJitter, y: I.floorY,
      },
      vary: {
        scale: { x: [0.40, 0.56], y: [I.ceilingY - 0.12, I.ceilingY + 0.02], z: [0.40, 0.56] },
        yaw: [0, TAU], tiltMax: 0.009, tint: [0.84, 1.14], macro: 0.28,
      },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'reveal', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: { kind: 'list', points: REVEAL.map(r => ({ x: r.x, y: I.floorY, z: r.z, yaw: r.yaw })) },
      vary: {
        scale: { x: [0.42, 0.54], y: [I.ceilingY - 0.10, I.ceilingY + 0.02], z: [0.42, 0.54] },
        tiltMax: 0.008, tint: [0.86, 1.12], macro: 0.28,
      },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'stub', mode: 'instanced', shape: 'stub', material: 'surface',
      color: P.substructure, detail: 1,
      place: {
        kind: 'latticeDual', halfX: I.pillarHalfX, halfZ: I.pillarHalfZ,
        spacing: I.pillarSpacing, jitter: I.stubJitter, y: I.floorY,
      },
      keepOut: ['start', ...HOLD_IDS],
      vary: {
        scale: { x: [0.42, 0.72], y: [0.85, 2.45], z: [0.42, 0.72] },
        yaw: [0, TAU], tiltMax: 0.022, tint: [0.78, 1.10], macro: 0.30,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      // Contact. Automatic failure #5 is "objects that float"; a dark base skirt
      // is what welds a column to a floor when there is no shadow map in the
      // engine to do it. Tinted well below its host on purpose.
      id: 'pillarCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'pillar', y: I.floorY },
      vary: {
        followScale: true, scale: { x: [1.30, 1.46], y: [0.30, 0.46], z: [1.30, 1.46] },
        yaw: [0, TAU], tint: [0.52, 0.72], macro: 0.20,
      },
    },
    {
      id: 'revealCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'reveal', y: I.floorY },
      vary: {
        followScale: true, scale: { x: [1.30, 1.46], y: [0.30, 0.46], z: [1.30, 1.46] },
        yaw: [0, TAU], tint: [0.52, 0.72], macro: 0.20,
      },
    },
    {
      id: 'stubCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'stub', y: I.floorY },
      vary: {
        followScale: true, scale: { x: [1.24, 1.44], y: [0.26, 0.40], z: [1.24, 1.44] },
        yaw: [0, TAU], tint: [0.50, 0.70], macro: 0.20,
      },
    },
    {
      id: 'pillarCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'mirror', of: 'pillar' },
      vary: {
        followScale: true, scale: { x: [1.06, 1.22], y: [0.46, 0.58], z: [1.06, 1.22] },
        yaw: [0, TAU], anchorTop: I.ceilingY, tint: [0.74, 1.00], macro: 0.22,
      },
    },
    {
      id: 'revealCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'mirror', of: 'reveal' },
      vary: {
        followScale: true, scale: { x: [1.06, 1.22], y: [0.46, 0.58], z: [1.06, 1.22] },
        yaw: [0, TAU], anchorTop: I.ceilingY, tint: [0.74, 1.00], macro: 0.22,
      },
    },
    {
      // Ceiling beams. In a room lit only from below, the ceiling is the surface
      // that tells you how big the space is — the flash reaches it before it
      // reaches the far wall, and the beam rhythm is what gives the reach a scale.
      id: 'beam', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.metal, detail: 0.72,
      place: { kind: 'runs', along: 'x', halfX: 25.6, halfZ: 21.4, spacing: 2.9, segment: 9.0, widthJitter: 0.30, gap: 0.06, y: 5.10 },
      vary: { halfAxis: 'x', scale: { y: [0.36, 0.45], z: [0.85, 1.15] }, tint: [0.72, 1.06], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'beamCross', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.metal, detail: 0.72,
      place: { kind: 'runs', along: 'z', halfX: 25.6, halfZ: 21.4, spacing: 8.7, segment: 11.0, widthJitter: 0.26, gap: 0.05, y: 4.86 },
      vary: { halfAxis: 'x', scale: { y: [0.18, 0.24], z: [1.10, 1.45] }, tint: [0.70, 1.02], macro: 0.20, warm: 0.04 },
    },
    {
      id: 'duct', mode: 'instanced', shape: 'duct', material: 'surface',
      color: P.metal, detail: 0.68,
      place: { kind: 'runs', along: 'z', halfX: 22, halfZ: 20, spacing: 12.6, offset: 4.3, segment: 7.0, widthJitter: 0.24, gap: 0.12, y: 4.95 },
      vary: { halfAxis: 'x', scale: { y: [0.55, 0.74], z: [0.80, 1.10] }, tint: [0.66, 1.00], macro: 0.18, warm: 0.05 },
    },
    {
      id: 'block', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: BLOCKS.map(b => ({ x: b.x, y: b.sy, z: b.z, yaw: b.yaw, sx: b.sx, sy: b.sy, sz: b.sz })) },
      vary: { tint: [0.80, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'kerb', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'runs', along: 'x', halfX: 24, halfZ: 21.4, spacing: 7.4, offset: 3.7, segment: 8.0, widthJitter: 0.34, gap: 0.42, y: 0 },
      keepOut: ['start', ...HOLD_IDS],
      vary: { halfAxis: 'x', scale: { y: [0.10, 0.17], z: [0.20, 0.34] }, anchorBottom: I.floorY, tint: [0.70, 1.06], macro: 0.28 },
    },
    {
      // Floor plates. Quantised yaw with a little slop, so the grid reads as laid
      // rather than generated — automatic failure #14, "procedural landform with
      // no authored intent" — and a macro tint so it does not tile (#3).
      id: 'plate', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'lattice', halfX: 24, halfZ: 20.5, spacing: 3.35, jitter: 0.85, y: 0.045 },
      keepOut: ['start'],
      vary: {
        scale: { x: [0.95, 1.55], y: [0.030, 0.055], z: [0.95, 1.55] },
        yawQuantum: Math.PI / 2, yawFine: 0.055, tint: [0.70, 1.10], macro: 0.34,
      },
    },
    {
      // Rubble. The densest element in the room and the cheapest: 520 instances,
      // one draw, three lobes, and full three-axis rotation so no two read alike.
      id: 'chunk', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'scatter', count: 520, minDist: 0.62, minX: -25.2, maxX: 25.2, minZ: -21.2, maxZ: 21.2, y: I.floorY },
      keepOut: ['start'],
      vary: {
        scale: { x: [0.10, 0.42], y: [0.08, 0.30], z: [0.10, 0.40] },
        yaw: [0, TAU], tiltMax: 0.42, tint: [0.62, 1.16], macro: 0.40,
      },
    },
    {
      // The head stop. One box per ceiling cell, because a 52 x 44 m slab baked
      // as ONE collider is 52 m on an axis and collide.js refuses it at 40 —
      // correctly. Segmenting is the rule's intent, not a workaround for it.
      id: 'ceilingStop', mode: 'collider', shape: 'none', material: 'none',
      place: {
        kind: 'lattice',
        xs: [-19.5, -6.5, 6.5, 19.5], zs: [-16.5, -5.5, 5.5, 16.5],
        y: I.clearanceY + 0.15, jitter: 0,
      },
      collider: { tag: 'ceiling', flags: ['ceiling', 'barrier'], half: [6.5, 0.15, 5.5], center: [0, 0, 0] },
    },
  ],
});

export default SPEC;
