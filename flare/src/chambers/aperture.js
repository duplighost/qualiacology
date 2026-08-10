// THE APERTURE — chamber five, the top of the tower, and the only room whose
// light was made somewhere else.
//
// docs/DESIGN.md: "The top, open to space. Boss: THE DAMP — a thing that walks
// the room putting your light out. [...] On the kill, every scar it ate comes
// back at once in a wave from the centre outward, and the tower is fully lit.
// That is the ending. No text, no cutscene."
//
// ---------------------------------------------------------------------------
// THE PROJECTION IS THE CHAMBER
// ---------------------------------------------------------------------------
// PLAN C1-F6 is the finding this room exists to answer: "The boss eats light
// that is in the wrong rooms — chambers load one at a time, so the APERTURE's
// only food is its own escorts, ~20 pools against a claimed thirty-minute
// payoff." The ruling: "On APERTURE load, the entire run's scar field is
// projected onto the boss-room footprint at recorded intensity — each source
// chamber's scars normalised into the aperture radius and flattened to the
// floor. Phase 1's length is then literally set by how well the run went, and
// the closing wave is the tower rather than twenty pools."
//
// So the floor of this room is the tower seen from above. You are standing on
// top of everything you did, and the boss is walking around eating it.
//
// Three properties the projection must have, and each one is gated in
// tests/boss.mjs rather than asserted here:
//
//   COUNT IS PRESERVED. The room loads with exactly as many scars as the run
//   accumulated. That means the projection may NOT go through `deposit()`, whose
//   6 m merge rule would silently collapse a 140-scar run into forty pools and
//   make "the closing wave is the tower" a lie that reads as a tuning problem.
//
//   INTENSITY IS PRESERVED, EXACTLY. `i` is copied, never rescaled. It is the
//   number the ending restores, and a projection that rounded it would make the
//   ending quieter than the run that earned it. RADIUS is scaled by the source
//   chamber's own footprint ratio, because a 74 m gallery folded into a 38 m
//   disc would otherwise arrive with every pool twice the size it was.
//
//   THE ROOM'S OWN LIGHT IS NOT THE PLAYER'S. Permanent scars — THE FURNACE's
//   lamps — are skipped by the archive that feeds this. What lands here is what
//   the player killed, and only that.
//
// ---------------------------------------------------------------------------
// WHY IT IS A SQUARE DECK AND NOT A DISC
// ---------------------------------------------------------------------------
// `createGround` supports `shape: 'disc'`, and `collide.js`'s `bakeRoomWalls`
// does not — it bakes walls only for `shape === 'rect'` (collide.js:543). A disc
// room would therefore ship with no wall colliders at all, and "a wall the
// player can leave is worse than no wall at all: it reads as a bug in the
// controller rather than as missing level geometry" (collide.js:386). The
// APERTURE is the iris in the CEILING, which is a light, not a floor plan.
// Filed as a request in docs/HANDOFF.md; until it lands, this is a deck.

import FEEL from '../feel.js';
import { defineArena } from '../world/build.js';

const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this chamber.
// ---------------------------------------------------------------------------
export const APERTURE = Object.freeze({
  halfX: 22,
  halfZ: 22,               // a 44 x 44 m deck: THE DAMP's keep-out is 0.32 and it
                           // moves at 5.2 m/s in phase 3, so the room has to be
                           // big enough that "it is coming" is a sentence with a
                           // few seconds in it
  floorY: 0,

  // Open to space. There is no ceiling slab and no head stop — the parapet is
  // 9 m of curtain wall and above it is nothing, which is the first time in the
  // tower the player can look UP and see something that is not a lid.
  wallHeight: 9.0,
  wallThickness: 0.7,
  wallBackDepth: 1.2,
  parapetY: 2.4,

  // ---- THE PROJECTION ----------------------------------------------------
  // The disc the whole run is folded into. 18.5 m leaves 3.5 m of dark deck
  // between the light and the wall on every side, which is the ground the player
  // retreats to when the room they made is being eaten out from under them.
  projectRadius: 18.5,
  // A scar's radius is scaled by its source chamber's own footprint ratio and
  // then floored, so a HUSK pool from a 74 m gallery does not arrive as a dot.
  projectRadiusFloor: 1.6,
  // Rings are what the eye reads as depth from above. Each source chamber is
  // rotated by this much relative to the one below it, so five overlapping
  // footprints read as five layers rather than as one smear.
  chamberTwist: 0.7,

  // ---- THE RIM -----------------------------------------------------------
  // Eight buttresses. They are the only cover in the room and they are also the
  // only thing that occludes a body: THE DAMP is a hole in the noise, and a hole
  // that passes behind a buttress is a hole you can track.
  rimCount: 8,
  rimRadius: 20.4,
  rimHeight: 5.2,

  // ---- THE PLINTH --------------------------------------------------------
  // Dead centre, 0.9 m: under FEEL.move.maxStep + a step, so it is walked onto
  // rather than jumped. It is where the closing wave starts and it is the one
  // piece of authored geometry in the tower that exists for the last four
  // seconds of the game.
  plinthR: 4.2,
  plinthY: 0.9,

  portalInset: 1,
  portalGap: 2.0,
  approachClear: 4.5,

  // The mood filter's divisor. This room's own kills are escorts only; what
  // fills it is the run. 90 is the tower's realistic total at a clean run
  // (INTAKE 20 + HELIX 30 + GALLERY 44 + FURNACE ~4 of player light after its
  // 0.25 deposit scale), so litFraction here IS "how well did the run go" —
  // which is exactly what C1-F6 says phase 1's length should be set by.
  lightGoal: 90,
  maxSightline: 44,

  palette: Object.freeze({
    floor: 0x585e63,
    plate: 0x5d6368,
    substructure: 0x666c72,
    concrete: 0x757b81,
    metal: 0x6b6558,
    dark: 0x35393d,
  }),
});

const A = APERTURE;
const P = A.palette;

const PLAYER_START = Object.freeze({ x: 0, y: 0, z: 18.0, yaw: 0 });

// ---------------------------------------------------------------------------
// PURE HELPERS
// ---------------------------------------------------------------------------
const ringPoints = (n, r, y, phase = 0) => Array.from({ length: n }, (_, k) => {
  const a = phase + TAU * k / n;
  return { x: Math.sin(a) * r, y, z: Math.cos(a) * r, yaw: a };
});

const portal = (id, x, y, z, nx, nz, wall) => Object.freeze({
  id, x, y, z, nx, nz, wall, tier: 0,
  yaw: Math.atan2(nx, nz),
  spawnX: x + nx * A.portalInset,
  spawnZ: z + nz * A.portalInset,
});

// Six doors. This is a boss room, so the portals are for the escorts C1-F6 named
// and for nothing else; the boss does not use a door, it is already here.
const PORTALS = Object.freeze([
  portal('a-n-w', -11.0, 0, -A.halfZ, 0, 1, 'north'),
  portal('a-n-e', 11.0, 0, -A.halfZ, 0, 1, 'north'),
  portal('a-w-n', -A.halfX, 0, -9.0, 1, 0, 'west'),
  portal('a-w-s', -A.halfX, 0, 9.0, 1, 0, 'west'),
  portal('a-e-n', A.halfX, 0, -9.0, -1, 0, 'east'),
  portal('a-e-s', A.halfX, 0, 9.0, -1, 0, 'east'),
]);

const WALL_BAND = Object.freeze({ y: A.wallHeight * 0.5, half: A.wallHeight * 0.5 });

// PLAN line 221 — and in this room the answer to "does the next thing die here
// or over there" is the last time it will ever be asked.
const HOLD = Object.freeze([
  Object.freeze({ id: 'hold-plinth', x: 0, y: A.plinthY, z: 0, r: 4.0, role: 'centre' }),
  Object.freeze({ id: 'hold-north', x: 0, y: 0, z: -13.5, r: 3.6, role: 'far-rim' }),
  Object.freeze({ id: 'hold-west', x: -13.5, y: 0, z: 2.0, r: 3.6, role: 'west-rim' }),
]);
const HOLD_IDS = HOLD.map(h => h.id);

const BLOCKS = Object.freeze([
  Object.freeze({ x: -7.6, z: -12.4, yaw: 0.30, sx: 1.24, sy: 0.55, sz: 0.72 }),
  Object.freeze({ x: 7.8, z: -12.0, yaw: -0.54, sx: 1.32, sy: 0.52, sz: 0.68 }),
  Object.freeze({ x: -12.8, z: -6.2, yaw: 1.04, sx: 1.12, sy: 0.58, sz: 0.78 }),
  Object.freeze({ x: 12.6, z: -6.6, yaw: 0.22, sx: 1.28, sy: 0.50, sz: 0.70 }),
  Object.freeze({ x: -12.4, z: 8.6, yaw: -0.90, sx: 1.36, sy: 0.54, sz: 0.64 }),
  Object.freeze({ x: 12.2, z: 8.2, yaw: 0.64, sx: 1.16, sy: 0.57, sz: 0.74 }),
  Object.freeze({ x: -4.4, z: 14.2, yaw: -0.28, sx: 1.30, sy: 0.51, sz: 0.66 }),
  Object.freeze({ x: 4.8, z: 14.6, yaw: 1.20, sx: 1.18, sy: 0.56, sz: 0.72 }),
]);

function coverNodeFor(b, i) {
  const len = Math.hypot(b.x, b.z) || 1;
  const nx = b.x / len, nz = b.z / len;
  const lateral = b.sx + 0.5;
  return Object.freeze({
    id: `cover-${i}`,
    x: b.x - nx * 1.32, y: 0, z: b.z - nz * 1.32,
    nx, nz,
    peekLeft: Object.freeze({ x: b.x - nx * 1.32 - nz * lateral, y: 0, z: b.z - nz * 1.32 + nx * lateral }),
    peekRight: Object.freeze({ x: b.x - nx * 1.32 + nz * lateral, y: 0, z: b.z - nz * 1.32 - nx * lateral }),
    height: b.sy * 2,
    tier: 0,
    role: 'lantern',
  });
}

const RIM = Object.freeze(ringPoints(A.rimCount, A.rimRadius, 0));

const PLINTH = Object.freeze({ id: 'plinth', x: 0, hx: A.plinthR, z: 0, hz: A.plinthR, y: A.plinthY });

const KEEP_OUTS = Object.freeze([
  Object.freeze({ id: 'start', x: PLAYER_START.x, z: PLAYER_START.z, r: A.approachClear }),
  Object.freeze({ id: 'plinth', x: 0, z: 0, r: A.plinthR + 2.6 }),
  ...HOLD.map(h => Object.freeze({ id: h.id, x: h.x, z: h.z, r: h.r })),
  ...PORTALS.map(p => Object.freeze({ id: 'portal', x: p.spawnX, z: p.spawnZ, r: 2.6 })),
  ...RIM.map(p => Object.freeze({ id: 'rim', x: p.x, z: p.z, r: 2.2 })),
]);

const GROUND_KEEPOUTS = ['start', 'plinth', 'portal', 'rim', ...HOLD_IDS];

// ---------------------------------------------------------------------------
// THE SPEC
// ---------------------------------------------------------------------------
export const SPEC = defineArena({
  id: 'aperture',
  name: 'THE APERTURE',
  tier: 4,

  bounds: { minX: -A.halfX, maxX: A.halfX, minZ: -A.halfZ, maxZ: A.halfZ, minY: A.floorY, maxY: A.wallHeight },
  ceilingY: A.wallHeight,

  ground: {
    id: 'aperture', shape: 'rect', floorY: A.floorY, tier: 0,
    halfX: A.halfX, halfZ: A.halfZ,
    wallHeight: A.wallHeight, wallThickness: A.wallThickness,
    platforms: [
      { id: PLINTH.id, x: PLINTH.x, z: PLINTH.z, hx: PLINTH.hx, hz: PLINTH.hz, y: PLINTH.y, tier: 0, thickness: PLINTH.y },
    ],
    ramps: [],
  },

  playerStart: { x: PLAYER_START.x, y: PLAYER_START.y, z: PLAYER_START.z, yaw: PLAYER_START.yaw },
  tiers: [{ id: 0, y: A.floorY, name: 'deck' }],

  lanes: {
    'axis-ns': { ax: 0, az: -20, bx: 0, bz: 20, halfWidth: 3.0 },
    'axis-ew': { ax: -20, az: 0, bx: 20, bz: 0, halfWidth: 3.0 },
  },

  portals: PORTALS,
  waveSpawns: [
    ['a-n-w', 'a-n-e'],
    ['a-w-n', 'a-e-n'],
    ['a-w-s', 'a-e-s'],
    ['a-n-w', 'a-n-e', 'a-w-n', 'a-w-s', 'a-e-n', 'a-e-s'],
  ],

  routes: {
    'rim-north': [
      { x: -14, y: 0, z: -14, tier: 0 }, { x: 0, y: 0, z: -16, tier: 0 }, { x: 14, y: 0, z: -14, tier: 0 },
    ],
    'rim-south': [
      { x: -14, y: 0, z: 14, tier: 0 }, { x: 0, y: 0, z: 16, tier: 0 }, { x: 14, y: 0, z: 14, tier: 0 },
    ],
    'to-centre': [
      { x: 0, y: 0, z: -16, tier: 0 }, { x: 0, y: 0, z: -7, tier: 0 }, { x: 0, y: A.plinthY, z: 0, tier: 0 },
    ],
  },

  recoveryNodes: [
    { x: 0, y: 0, z: 18 }, { x: 0, y: A.plinthY, z: 0 }, { x: -14, y: 0, z: 0 },
    { x: 14, y: 0, z: 0 }, { x: 0, y: 0, z: -16 }, { x: -14, y: 0, z: -14 },
    { x: 14, y: 0, z: -14 }, { x: -14, y: 0, z: 14 }, { x: 14, y: 0, z: 14 },
  ],

  coverNodes: BLOCKS.map(coverNodeFor),
  holdingGround: HOLD,
  keepOuts: KEEP_OUTS,

  lightGoal: A.lightGoal,
  tensionFloor: FEEL.tension.floors.aperture,
  maxSightline: A.maxSightline,
  fogDensity: FEEL.render.fogDensity,
  scarDepositScale: 1,

  // LIGHT RULE: the room contributes nothing of its own — everything on this
  // floor was carried up the tower. Phase 3's starlight is the single exception
  // and it is not architecture: it is a rover-pool COLD light owned by
  // src/enemies/damp.js, because it arrives when the boss breaks, not when the
  // room loads.
  staticLights: [],
  palette: P,

  // FEEL.director.chambers has no `aperture` entry, deliberately: this room's
  // pacing is a boss phase machine, not a queue. The escorts are the small,
  // steady pressure that keeps the player moving while THE DAMP eats, and their
  // numbers are authored here as level design. A proposal to move them into FEEL
  // is filed in docs/HANDOFF.md.
  roster: ['husk', 'lantern'],
  director: { queue: 18, cap: 4, interval: 2.4, weights: { husk: 0.6, lantern: 0.4 } },

  reward: { ending: true },

  elements: [
    {
      id: 'floor', mode: 'static', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.floor, detail: 1,
      transform: { y: A.floorY, sx: A.halfX + 0.6, sz: A.halfZ + 0.6 },
    },
    {
      // NO CEILING SLAB. This is the only room in the tower without one and it is
      // the whole point of the chamber's name.
      id: 'wallBack', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'front' }, material: 'surface',
      color: P.dark, detail: 0.85,
      place: {
        kind: 'list',
        points: [
          { x: 0, y: A.wallHeight / 2, z: -(A.halfZ + A.wallBackDepth), yaw: 0, sx: A.halfX + 0.8, sy: A.wallHeight / 2 },
          { x: 0, y: A.wallHeight / 2, z: A.halfZ + A.wallBackDepth, yaw: Math.PI, sx: A.halfX + 0.8, sy: A.wallHeight / 2 },
          { x: -(A.halfX + A.wallBackDepth), y: A.wallHeight / 2, z: 0, yaw: Math.PI / 2, sx: A.halfZ + 0.8, sy: A.wallHeight / 2 },
          { x: A.halfX + A.wallBackDepth, y: A.wallHeight / 2, z: 0, yaw: -Math.PI / 2, sx: A.halfZ + 0.8, sy: A.wallHeight / 2 },
        ],
      },
      vary: { tint: [0.66, 0.88], macro: 0.14 },
    },
    {
      id: 'wallPanel', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.94,
      place: {
        kind: 'perimeter', halfX: A.halfX, halfZ: A.halfZ, y: WALL_BAND.y,
        segment: 2.5, widthJitter: 0.24,
        gaps: PORTALS.map(p => ({ x: p.x, z: p.z, r: A.portalGap })),
      },
      vary: {
        halfAxis: 'x', scale: { y: [WALL_BAND.half, WALL_BAND.half], z: [0.78, 1.22] },
        tint: [0.76, 1.12], macro: 0.26, warm: 0.03,
      },
    },
    {
      id: 'portalFrame', mode: 'instanced', shape: 'portalFrame', material: 'surface',
      color: P.metal, detail: 0.78,
      place: { kind: 'list', points: PORTALS.map(p => ({ x: p.x, y: WALL_BAND.y * 0.55, z: p.z, yaw: p.yaw, sy: WALL_BAND.half * 0.55 })) },
      vary: { scale: { x: [1.48, 1.70], z: [0.86, 1.16] }, tint: [0.74, 1.02], macro: 0.10, warm: 0.03 },
    },
    {
      // THE RIM. Eight buttresses on a 20.4 m circle: the only cover, and the
      // only thing in the room that can occlude a negative silhouette.
      id: 'buttress', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.concrete, detail: 1,
      place: { kind: 'list', points: RIM.map(p => ({ x: p.x, y: A.floorY, z: p.z, yaw: p.yaw })) },
      vary: {
        scale: { x: [0.62, 0.82], y: [A.rimHeight - 0.3, A.rimHeight + 0.3], z: [0.62, 0.82] },
        yaw: [0, TAU], tiltMax: 0.006, tint: [0.80, 1.12], macro: 0.26,
      },
      collider: { tag: 'pillar', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'buttressCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'buttress', y: A.floorY },
      vary: { followScale: true, scale: { x: [1.30, 1.50], y: [0.30, 0.48], z: [1.30, 1.50] }, yaw: [0, TAU], tint: [0.48, 0.70], macro: 0.20 },
    },
    {
      id: 'buttressCapital', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'mirror', of: 'buttress' },
      vary: { followScale: true, scale: { x: [1.06, 1.24], y: [0.5, 0.68], z: [1.06, 1.24] }, yaw: [0, TAU], anchorTop: A.rimHeight, tint: [0.70, 1.00], macro: 0.22 },
    },
    {
      id: 'plinth', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: [{ x: PLINTH.x, y: PLINTH.y * 0.5, z: PLINTH.z, yaw: 0, sx: PLINTH.hx, sy: PLINTH.y * 0.5, sz: PLINTH.hz }] },
      vary: { tint: [0.84, 1.02], macro: 0.16 },
      collider: { tag: 'prop', flags: ['support', 'barrier'], half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      // The plinth's ring of kerbs — a radial rhythm the closing wave travels
      // outward along, so the ending has a ruler and reads as a WAVE rather than
      // as a light switch.
      id: 'plinthRing', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'list', points: ringPoints(18, A.plinthR + 1.3, A.floorY) },
      vary: { halfAxis: 'x', scale: { x: [0.55, 0.85], y: [0.07, 0.13], z: [0.22, 0.34] }, anchorBottom: A.floorY, tint: [0.66, 1.04], macro: 0.26 },
    },
    {
      id: 'ringOuter', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'list', points: [...ringPoints(28, 11.5, A.floorY, 0.11), ...ringPoints(38, 16.0, A.floorY, 0.23)] },
      vary: { halfAxis: 'x', scale: { x: [0.5, 0.8], y: [0.05, 0.10], z: [0.18, 0.30] }, anchorBottom: A.floorY, tint: [0.62, 1.00], macro: 0.28 },
    },
    {
      id: 'block', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: BLOCKS.map(b => ({ x: b.x, y: b.sy, z: b.z, yaw: b.yaw, sx: b.sx, sy: b.sy, sz: b.sz })) },
      vary: { tint: [0.76, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'parapet', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.96,
      place: { kind: 'perimeter', halfX: A.halfX - 0.5, halfZ: A.halfZ - 0.5, y: A.parapetY, segment: 2.1, widthJitter: 0.2, gaps: PORTALS.map(p => ({ x: p.x, z: p.z, r: A.portalGap })) },
      vary: { halfAxis: 'x', scale: { y: [A.parapetY * 0.5, A.parapetY * 0.5], z: [0.28, 0.40] }, tint: [0.70, 1.08], macro: 0.26 },
    },
    {
      id: 'plate', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'lattice', halfX: 20.6, halfZ: 20.6, spacing: 3.1, jitter: 0.85, y: 0.045 },
      keepOut: ['start', 'plinth'],
      vary: {
        scale: { x: [0.92, 1.50], y: [0.030, 0.055], z: [0.92, 1.50] },
        yawQuantum: Math.PI / 2, yawFine: 0.055, tint: [0.66, 1.08], macro: 0.34,
      },
    },
    {
      id: 'stub', mode: 'instanced', shape: 'stub', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'lattice', halfX: 19.5, halfZ: 19.5, spacing: 5.2, jitter: 1.1, y: A.floorY },
      keepOut: GROUND_KEEPOUTS,
      vary: {
        scale: { x: [0.34, 0.58], y: [0.55, 1.65], z: [0.34, 0.58] },
        yaw: [0, TAU], tiltMax: 0.026, tint: [0.72, 1.06], macro: 0.30,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'stubCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'stub', y: A.floorY },
      vary: { followScale: true, scale: { x: [1.22, 1.42], y: [0.24, 0.38], z: [1.22, 1.42] }, yaw: [0, TAU], tint: [0.46, 0.68], macro: 0.20 },
    },
    {
      id: 'chunk', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'scatter', count: 340, minDist: 0.70, minX: -21, maxX: 21, minZ: -21, maxZ: 21, y: A.floorY },
      keepOut: ['start', 'plinth'],
      vary: {
        scale: { x: [0.11, 0.40], y: [0.08, 0.29], z: [0.11, 0.38] },
        yaw: [0, TAU], tiltMax: 0.42, tint: [0.58, 1.14], macro: 0.40,
      },
    },
    {
      id: 'chunkFine', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'scatter', count: 300, minDist: 0.46, minX: -21.4, maxX: 21.4, minZ: -21.4, maxZ: 21.4, y: A.floorY },
      keepOut: ['start', 'plinth'],
      vary: {
        scale: { x: [0.05, 0.17], y: [0.04, 0.14], z: [0.05, 0.16] },
        yaw: [0, TAU], tiltMax: 0.55, tint: [0.54, 1.16], macro: 0.44,
      },
    },
  ],
});

// ===========================================================================
// THE FIELD EDIT — insert and remove a scar WITHOUT going through `deposit()`.
//
// Both are borrows, and they use nothing but the field's own methods, so there
// is no second copy of the hash or the falloff anywhere. `deposit()` cannot be
// used for any of the three jobs W11 needs:
//
//   THE PROJECTION must preserve COUNT, and `deposit` merges within 6 m.
//   THE EAT must REMOVE a scar, and there is no remove.
//   THE SWEEP must suppress and then restore one, unchanged.
//
// docs/PLAN.md Stage 0 lists "lightfield.js updated for [...] permanent scars
// and the separate negLights list" as spine work that has not landed. The exact
// diff for the real `insert` / `remove` / `permanent` is filed in
// docs/HANDOFF.md; these two functions are what the chamber runs on until it
// does, and `snapshot().borrowed` reports that they are in use.
// ===========================================================================

/** Put a scar record into the field at exactly its authored r and i. */
export function insertScar(field, scar) {
  if (!field || !scar) return null;
  if (field.scars.indexOf(scar) === -1) field.scars.push(scar);
  field._index(scar);
  field.dirty = true; field.version++;
  return scar;
}

/** Take one back out. Returns false if it was not there. */
export function removeScar(field, scar) {
  if (!field || !scar) return false;
  const at = field.scars.indexOf(scar);
  if (at === -1) return false;
  field.scars.splice(at, 1);
  field._unindex(scar);
  field.dirty = true; field.version++;
  return true;
}

/**
 * Fold one chamber's scars into the aperture disc.
 *
 * `source` is `{ id, bounds, scars: [{x, y, z, r, i}] }` — the shape
 * src/enemies/damp.js's run archive keeps. The mapping is elliptical: a chamber
 * is normalised by its OWN half-extents and then scaled by `projectRadius`, so
 * THE GALLERY's 74 m nave and THE INTAKE's 56 m floor arrive as concentric
 * discs of the same size rather than as one long smear and one square.
 *
 * `twist` rotates each chamber relative to the one below it so five overlapping
 * footprints read as five layers. Intensity is copied EXACTLY; radius is scaled
 * by the same factor as position and then floored.
 */
const clampUnit = v => (v < -1 ? -1 : v > 1 ? 1 : v);

export function projectChamber(source, index, opts = {}) {
  const radius = opts.radius === undefined ? A.projectRadius : opts.radius;
  const floorR = opts.radiusFloor === undefined ? A.projectRadiusFloor : opts.radiusFloor;
  const twist = (opts.twist === undefined ? A.chamberTwist : opts.twist) * index;
  const b = source.bounds || { minX: -1, maxX: 1, minZ: -1, maxZ: 1 };
  const cx = (b.minX + b.maxX) * 0.5, cz = (b.minZ + b.maxZ) * 0.5;
  const hx = Math.max(1e-3, (b.maxX - b.minX) * 0.5);
  const hz = Math.max(1e-3, (b.maxZ - b.minZ) * 0.5);
  // One scale for the radius, so a pool keeps its shape: the geometric mean of
  // the two axis ratios. Using either axis alone makes THE GALLERY's pools
  // either 2.5x too big or 2.5x too small depending on which one you picked.
  const rScale = Math.sqrt((radius / hx) * (radius / hz));
  const c = Math.cos(twist), s = Math.sin(twist);
  const out = [];
  for (const src of source.scars) {
    // Normalise into the unit SQUARE, then map the square onto the DISC. Without
    // the second step a chamber's corners land at r*sqrt(2) — 26 m out of an
    // 18.5 m "radius" — and the projection is a square footprint wearing the
    // word radius. This is the standard elliptical-grid map: it is smooth, it
    // fixes the rim exactly, and it does not pile everything onto the edge the
    // way a radial clamp would.
    let un = clampUnit((src.x - cx) / hx);
    let vn = clampUnit((src.z - cz) / hz);
    const u = un * Math.sqrt(1 - vn * vn * 0.5) * radius;
    const v = vn * Math.sqrt(1 - un * un * 0.5) * radius;
    out.push({
      x: u * c - v * s,
      y: A.floorY,
      z: u * s + v * c,
      r: Math.max(floorR, Math.min(FEEL.field.radiusMax, src.r * rScale)),
      i: src.i,                       // EXACTLY. This is the number the ending restores.
      born: 0, cell: 0,
      from: source.id,
    });
  }
  return out;
}

/**
 * The whole run, onto this floor, at load. Returns the inserted records.
 *
 * COUNT IS THE CONTRACT: `projected.length === archive.reduce(sum of scars)`,
 * because `insertScar` bypasses the merge rule. tests/boss.mjs asserts exactly
 * that against a real multi-chamber archive.
 */
export function projectRunField(ctx, archive, opts = {}) {
  const field = ctx.light;
  if (!field) throw new Error('aperture: projectRunField needs ctx.light');
  const out = [];
  let index = 0;
  for (const source of archive) {
    if (!source || !Array.isArray(source.scars) || source.scars.length === 0) { index++; continue; }
    for (const s of projectChamber(source, index, opts)) {
      insertScar(field, s);
      out.push(s);
    }
    index++;
  }
  const irr = ctx.render && ctx.render.irradiance;
  if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
  return out;
}

export default SPEC;
