// THE FURNACE — chamber four, and the only pre-lit room in the game.
//
// docs/DESIGN.md: "Cramped, hot, and the only PRE-LIT room in the game. LIGHT
// RULE: INVERTED. Here you are the visible one and the enemies are silhouettes
// against a lit floor — enemy accuracy is at maximum, your dark-adaptation
// advantage is gone, and the correct play is to break the lights (they are
// shootable) and fight in the dark you make. WARDEN and BLOOM pressure."
//
// ---------------------------------------------------------------------------
// THE INVERSION COSTS NO NEW CODE, AND THAT IS THE WHOLE POINT
// ---------------------------------------------------------------------------
// PLAN C1-F7 / C3-F5 — two critiques that converged on the same fix
// independently, which is the strongest signal in the whole review — rule that
// the room lights are ENTRIES IN THE SAME WORLD-SPACE SCAR LIST, flagged
// `{ permanent: true, hostile: true, born: -1, i 2.2, r 9 }`, exempt from merge
// and from the maxScars cull, carrying a breakable flag.
//
// Every consumer then inverts for free, with nothing new written anywhere:
//
//   the iris          stops down, because `litFraction` is already high
//   enemy accuracy    x= 1 + lit*1.40 at the player, i.e. at maximum (D3)
//   enemy spot range  x= 1 + lit*0.90, so they see you from across the room
//   enemy reaction    x= 1 - lit*0.30, so they answer 30% faster
//   RUNNER homing     reads the raw gradient — it homes on the ROOM, not on
//                     your kills, which is the one chamber where that is true
//   spawn validation  refuses the lit floor, so the portals carry the wave
//   the mood filter   opens at load instead of at the end (see `lightGoal`)
//
// Shooting a lamp out punches a hole in the light field on the same channel as
// everything else. One data structure, both effects.
//
// ---------------------------------------------------------------------------
// THE TRAP, AND THE RESOLUTION. READ THIS BEFORE RETUNING ANY NUMBER HERE.
// ---------------------------------------------------------------------------
// docs/CRITIQUES.md #14: "THE FURNACE's stated correct play is self-defeating:
// killing things relights the room you are being told to darken." That is a real
// defect and it is fatal if it is left alone — the chamber whose whole job is to
// prove the player learned the RULE rather than the HABIT would teach the
// opposite by accident, through the exact signal the previous three chambers
// trained them to read as good.
//
// It is resolved here in four parts, and the arithmetic is gated in
// tests/boss.mjs rather than asserted in a comment:
//
//   1. `scarDepositScale: 0.25`. A kill in THE FURNACE deposits a QUARTER of the
//      radius and a quarter of the intensity it would anywhere else.
//      src/enemies/manager.js already reads this field off the live ArenaSpec
//      (`arch.depositRadius * chamberScale`, `arch.depositIntensity * scale *
//      chamberScale`) — so this costs zero new code, in the module that would
//      otherwise have needed the special case.
//
//   2. ONE LAMP OUT-DARKENS THE ENTIRE QUEUE. Integrate the deposited falloff
//      i*(1-d²/r²)² over its own disc and you get i·πr²/3 of intensity·m², which
//      is the only honest way to compare a 9 m lamp against a 1 m puddle:
//
//        one lamp            2.2 · π · 81 / 3        = 186.6
//        the whole queue     44 kills, mean i 0.40 at mean r 0.98
//                            44 · 0.40 · π · 0.96/3  =  17.7
//
//      One lamp is worth 10.5x every kill the chamber can produce. You can
//      darken the room faster than you can brighten it — but only by continuing
//      to break lamps while you fight, which is exactly the lesson.
//
//   3. PERMANENT SCARS ARE EXEMPT FROM MERGE. Without that, a kill inside a
//      lamp's 6 m merge radius fattens the very lamp you are shooting out (and
//      the light the player earned is then deleted when they break it, which
//      violates D6 — the light stays). `createLampField` below enforces the
//      exemption; the mechanism is documented at its use site.
//
//   4. THE LAMPS ARE NOT LIGHT THE PLAYER MADE. They are marked `permanent`, and
//      src/enemies/damp.js's run archive — the thing THE APERTURE projects at
//      load — skips permanent scars. The room's own light can therefore never
//      become the player's progress, and THE FURNACE's contribution to the
//      ending is exactly and only what the player killed in it.
//
// ---------------------------------------------------------------------------
// THE LAMPS ARE SHOT THROUGH THE SHIPPING FIRE PIPELINE
// ---------------------------------------------------------------------------
// A lamp head is a duck-typed record in the weapons target list — the same shape
// an enemy is — so it is hit by the real ray march, resolved by the real
// `applyHit`, and it obeys THE ONE LAW: a connecting shot always removes at
// least 1 hp and lights it for at least 0.35 s. A lamp flares when you hit it
// and goes out when it breaks, and none of that is a special case.
//
// NO THREE.JS in the spec half of this file: the layout, the colliders and the
// lamp arithmetic are all measurable headless in milliseconds.

import FEEL from '../feel.js';
import { defineArena } from '../world/build.js';

const D = FEEL.director.chambers.furnace;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this chamber. Level design, not tuning: everything
// that governs how the game FEELS is read from FEEL and is not restated here.
// ---------------------------------------------------------------------------
export const FURNACE = Object.freeze({
  // 34 x 30 m. THE GALLERY is 30 x 74; this room is a third of its area with a
  // ceiling less than half its height, and it is meant to feel like it.
  halfX: 17,
  halfZ: 15,
  floorY: 0,

  // Two ceilings, as THE INTAKE established: `clearanceY` is where a head stops,
  // `ceilingY` is where the slab is, and the metre between them is where the
  // ducts hang — so a 2.67 m jump plus an 11.5 m/s air-dash lift can never put
  // the camera inside a pipe.
  clearanceY: 5.0,
  ceilingY: 6.2,
  wallThickness: 0.6,
  wallBackDepth: 1.1,

  // ---- THE KILN ----------------------------------------------------------
  // One solid mass in the middle of a cramped room. It is not cover in the
  // GALLERY's sense — it is the thing you circle, and circling it is what stops
  // a WARDEN pair from ever holding the whole floor at once.
  kilnHalfX: 5.0,
  kilnHalfZ: 4.0,
  kilnY: 3.6,

  // ---- THE LAMPS ---------------------------------------------------------
  // Head height. It is NOT arbitrary and it is NOT a ceiling fixture:
  // `LightField.illuminationAt` scales the vertical offset by (Δy/4.5)·r, so a
  // scar more than FIELD.vertical (4.5 m) above the floor contributes exactly
  // nothing at floor level, at ANY radius. A lamp hung from a 6.2 m ceiling
  // would be a light that lights nothing in the one room built on being lit.
  // At 2.15 m the head sits 1.25 m above the sample height D3 reads the player
  // at, which puts 1.87 of its 2.2 on the floor directly beneath it.
  lampY: 2.15,
  lampHp: 40,          // SIDEARM 2 shots, REPEATER 3, LANCE 1, BREACHER 1.
                       // The BREACHER is the lamp-breaker and that is a roster
                       // statement: the loudest, brightest gun is the one that
                       // buys darkness fastest.
  lampRadius: 0.34,    // the head's hit capsule, in metres
  lampHeight: 0.52,
  lampSpriteSize: 1.15,
  lampBreakLight: 3.1, // the one-frame flare as it goes; a lamp dying is the
                       // brightest single event in the chamber, and then it is
                       // the darkest thing in it
  lampBreakFade: 0.55, // seconds

  portalInset: 1,
  portalGap: 1.9,
  approachClear: 4,

  // The mood filter reads litFraction = scarLightTotal / lightGoal, and in every
  // other chamber that number climbs from 0 as the player works. Here it starts
  // at 1.000 — ten lamps at FEEL.field.lampIntensity 2.2 is exactly 22 — and it
  // FALLS as they break lamps. The inversion therefore also happens in the one
  // channel the player hears rather than sees, for free, because the goal is the
  // room's own light rather than a number picked to be reached.
  lightGoal: 22,
  maxSightline: 34,

  // THE PALETTE, inside the window THE INTAKE measured on the shipping page
  // (docs/HANDOFF.md — "the palette window in this game is ONE STOP WIDE"):
  // above ~0x33383d, below FEEL.render.drab. This room is the exception that
  // proves the rule — it is authored at the DARK end of the window on purpose,
  // because it is the one chamber whose floor arrives already carrying 1.9 of
  // deposited light. Author it at THE INTAKE's values and the lamps push it past
  // white; author it here and breaking every lamp lands it exactly where the
  // other four chambers start.
  palette: Object.freeze({
    floor: 0x4e5358,
    plate: 0x545a5f,
    substructure: 0x5f656b,
    concrete: 0x6d7379,
    kiln: 0x5a5248,        // firebrick, oxidised — warm, and the split lives on
                           // blue/yellow because that is the axis moderate
                           // deuteranomaly leaves intact (CONTRACT §6)
    metal: 0x6b6558,
    dark: 0x34383c,
  }),
});

const F = FURNACE;
const P = F.palette;

// ---------------------------------------------------------------------------
// THE LAMPS, as authored positions. Ten of them, and the spacing is derived
// rather than eyeballed: at FEEL.field.lampRadius 9 and lampY 2.15, a single
// lamp puts 1.065 on the floor at 4.25 m and 0.50 at 6.0 m, so a 8-12 m grid
// overlaps into a floor that reads as continuously lit with dimmer seams the
// player can already use as cover before they have broken anything.
//
// None is inside the kiln's footprint, none is inside the player's approach
// clearance, and every one of them is reachable by a shot from the floor.
// ---------------------------------------------------------------------------
const LAMP_POINTS = Object.freeze([
  Object.freeze({ id: 'lamp-nw', x: -12.5, z: -11.0 }),
  Object.freeze({ id: 'lamp-nwc', x: -4.0, z: -12.0 }),
  Object.freeze({ id: 'lamp-nec', x: 4.0, z: -12.0 }),
  Object.freeze({ id: 'lamp-ne', x: 12.5, z: -11.0 }),
  Object.freeze({ id: 'lamp-w', x: -14.5, z: -1.0 }),
  Object.freeze({ id: 'lamp-e', x: 14.5, z: -1.0 }),
  Object.freeze({ id: 'lamp-sw', x: -12.5, z: 9.0 }),
  Object.freeze({ id: 'lamp-se', x: 12.5, z: 9.0 }),
  Object.freeze({ id: 'lamp-s', x: 0.0, z: 7.5 }),
  Object.freeze({ id: 'lamp-kiln', x: 0.0, z: -6.5 }),
]);

/**
 * The ArenaSpec's `staticLights`, finally carrying something. Every other
 * chamber declares `[]` and their gates assert it stays empty — "the room
 * contributes no static light of its own" is THREE chambers' light rule and it
 * is this one's inversion.
 *
 * The shape is the scar record `LightField` already stores, plus the three flags
 * PLAN C1-F7 names by hand: `permanent` (exempt from merge and from the maxScars
 * cull), `hostile` (this light is not yours and it is working against you), and
 * `breakable` (a shot zeroes it).
 */
export const LAMPS = Object.freeze(LAMP_POINTS.map((p, i) => Object.freeze({
  id: p.id,
  index: i,
  x: p.x, y: F.lampY, z: p.z,
  r: FEEL.field.lampRadius,
  i: FEEL.field.lampIntensity,
  born: -1,
  permanent: true,
  hostile: true,
  breakable: true,
  hp: F.lampHp,
})));

/** intensity·m² of one lamp's deposited falloff — ∫ i(1-d²/r²)² dA = i·πr²/3. */
export const lampCoverage = (intensity = FEEL.field.lampIntensity, radius = FEEL.field.lampRadius) =>
  intensity * Math.PI * radius * radius / 3;

/**
 * The same integral for every kill the director can produce in this chamber, at
 * this chamber's `scarDepositScale`. This is THE TRAP's arithmetic, exported so
 * the gate measures it rather than trusting the comment above.
 */
export function queueCoverage(scale = 0.25) {
  const w = D.weights;
  let perKill = 0;
  for (const type of Object.keys(w)) {
    const dep = FEEL.field.deposit[type];
    if (!dep) throw new Error(`furnace: FEEL.field.deposit.${type} does not exist`);
    const r = dep[0] * scale, inten = dep[1] * scale;
    perKill += w[type] * (inten * Math.PI * r * r / 3);
  }
  return perKill * D.queue;
}

// ---------------------------------------------------------------------------
// PURE GEOMETRY HELPERS
// ---------------------------------------------------------------------------
function lineRun(ax, az, bx, bz, seg, y, yaw) {
  const dx = bx - ax, dz = bz - az;
  const len = Math.sqrt(dx * dx + dz * dz);
  const n = Math.max(1, Math.round(len / seg));
  const step = len / n;
  const ux = dx / len, uz = dz / len;
  const out = [];
  for (let k = 0; k < n; k++) {
    const s = (k + 0.5) * step;
    out.push({ x: ax + ux * s, y, z: az + uz * s, yaw, half: step * 0.5 });
  }
  return out;
}

const portal = (id, x, y, z, nx, nz, wall) => Object.freeze({
  id, x, y, z, nx, nz, wall, tier: 0,
  yaw: Math.atan2(nx, nz),
  spawnX: x + nx * F.portalInset,
  spawnZ: z + nz * F.portalInset,
});

// EIGHT DOORS on four walls of a room 34 m across. THE GALLERY's thirteen
// portals are spread over 74 m; here every door is inside 20 m of every other
// one, which is what "cramped" means to a director rather than to a camera.
const PORTALS = Object.freeze([
  portal('f-n-w', -8.6, 0, -F.halfZ, 0, 1, 'north'),
  portal('f-n-e', 8.6, 0, -F.halfZ, 0, 1, 'north'),
  portal('f-w-n', -F.halfX, 0, -8.2, 1, 0, 'west'),
  portal('f-w-s', -F.halfX, 0, 6.4, 1, 0, 'west'),
  portal('f-e-n', F.halfX, 0, -8.2, -1, 0, 'east'),
  portal('f-e-s', F.halfX, 0, 6.4, -1, 0, 'east'),
  portal('f-s-w', -9.8, 0, F.halfZ, 0, -1, 'south'),
  portal('f-s-e', 9.8, 0, F.halfZ, 0, -1, 'south'),
]);

const WALL_BAND = Object.freeze({ y: F.ceilingY * 0.5, half: F.ceilingY * 0.5 });

// ---------------------------------------------------------------------------
// HOLDING GROUND — PLAN line 221. In every other chamber these are cleared cells
// the director biases surprises toward. Here they are also the three darkest
// patches of floor before a shot is fired: the two lamp seams and the kiln's
// north shadow. "Does the next thing die here or over there" has a different
// answer in this room, and these are the places that answer it.
// ---------------------------------------------------------------------------
const HOLD = Object.freeze([
  Object.freeze({ id: 'hold-seam-w', x: -8.4, y: 0, z: -1.5, r: 3.2, role: 'west-seam' }),
  Object.freeze({ id: 'hold-seam-e', x: 8.4, y: 0, z: -1.5, r: 3.2, role: 'east-seam' }),
  Object.freeze({ id: 'hold-north', x: 0, y: 0, z: -13.0, r: 3.0, role: 'north-shadow' }),
]);
const HOLD_IDS = HOLD.map(h => h.id);

// ---------------------------------------------------------------------------
// COVER. Waist-high, and in this chamber cover does something it does nowhere
// else: it is the only place D3's accuracy term can be beaten without breaking a
// lamp, because line of sight is the one factor the light trade does not scale.
// ---------------------------------------------------------------------------
const BLOCKS = Object.freeze([
  Object.freeze({ x: -8.2, z: -8.4, yaw: 0.34, sx: 1.22, sy: 0.55, sz: 0.72 }),
  Object.freeze({ x: 8.4, z: -8.0, yaw: -0.52, sx: 1.30, sy: 0.52, sz: 0.68 }),
  Object.freeze({ x: -9.0, z: 3.6, yaw: 1.02, sx: 1.10, sy: 0.58, sz: 0.78 }),
  Object.freeze({ x: 9.2, z: 3.2, yaw: 0.24, sx: 1.26, sy: 0.50, sz: 0.70 }),
  Object.freeze({ x: -3.2, z: 8.8, yaw: -0.88, sx: 1.38, sy: 0.54, sz: 0.64 }),
  Object.freeze({ x: 3.6, z: 9.2, yaw: 0.62, sx: 1.14, sy: 0.57, sz: 0.74 }),
  Object.freeze({ x: -14.2, z: -12.4, yaw: -0.26, sx: 1.28, sy: 0.51, sz: 0.66 }),
  Object.freeze({ x: 14.0, z: -12.6, yaw: 1.18, sx: 1.16, sy: 0.56, sz: 0.72 }),
  Object.freeze({ x: 0.0, z: -10.2, yaw: 0.44, sx: 1.34, sy: 0.53, sz: 0.62 }),
  Object.freeze({ x: -14.6, z: 6.8, yaw: -1.06, sx: 1.08, sy: 0.59, sz: 0.76 }),
  Object.freeze({ x: 14.4, z: 7.2, yaw: 0.86, sx: 1.24, sy: 0.52, sz: 0.68 }),
]);

function coverNodeFor(b, i) {
  const len = Math.hypot(b.x, b.z) || 1;
  const nx = b.x / len, nz = b.z / len;
  const lateral = b.sx + 0.5;
  return Object.freeze({
    id: `cover-${i}`,
    x: b.x - nx * 1.30, y: 0, z: b.z - nz * 1.30,
    nx, nz,
    peekLeft: Object.freeze({ x: b.x - nx * 1.30 - nz * lateral, y: 0, z: b.z - nz * 1.30 + nx * lateral }),
    peekRight: Object.freeze({ x: b.x - nx * 1.30 + nz * lateral, y: 0, z: b.z - nz * 1.30 - nx * lateral }),
    height: b.sy * 2,
    tier: 0,
    role: i % 2 === 0 ? 'warden' : 'husk',
  });
}

const PLAYER_START = Object.freeze({ x: 0, y: 0, z: 12.5, yaw: 0 });

const KEEP_OUTS = Object.freeze([
  Object.freeze({ id: 'start', x: PLAYER_START.x, z: PLAYER_START.z, r: F.approachClear }),
  Object.freeze({ id: 'kiln', x: 0, z: 0, r: 7.4 }),
  ...LAMP_POINTS.map(l => Object.freeze({ id: 'lamp', x: l.x, z: l.z, r: 1.9 })),
  ...HOLD.map(h => Object.freeze({ id: h.id, x: h.x, z: h.z, r: h.r })),
  ...PORTALS.map(p => Object.freeze({ id: 'portal', x: p.spawnX, z: p.spawnZ, r: 2.4 })),
  Object.freeze({ id: 'lane', x: 0, z: 9.5, r: 3.2 }),
  Object.freeze({ id: 'lane', x: 0, z: -10.5, r: 3.2 }),
]);

const GROUND_KEEPOUTS = ['start', 'kiln', 'lamp', 'lane', 'portal', ...HOLD_IDS];

const KILN = Object.freeze({ x: 0, hx: F.kilnHalfX, z: 0, hz: F.kilnHalfZ, y: F.kilnY });

// ---------------------------------------------------------------------------
// THE SPEC
// ---------------------------------------------------------------------------
export const SPEC = defineArena({
  id: 'furnace',
  name: 'THE FURNACE',
  tier: 3,

  bounds: { minX: -F.halfX, maxX: F.halfX, minZ: -F.halfZ, maxZ: F.halfZ, minY: F.floorY, maxY: F.ceilingY },
  ceilingY: F.ceilingY,

  ground: {
    id: 'furnace', shape: 'rect', floorY: F.floorY, tier: 0,
    halfX: F.halfX, halfZ: F.halfZ,
    wallHeight: F.ceilingY, wallThickness: F.wallThickness,
    // The kiln is SOLID, not walkable: standing on top of it in a room this
    // small would let the player hold every portal at once, which is the one
    // thing an inverted-light chamber cannot survive.
    platforms: [],
    ramps: [],
  },

  playerStart: { x: PLAYER_START.x, y: PLAYER_START.y, z: PLAYER_START.z, yaw: PLAYER_START.yaw },
  tiers: [{ id: 0, y: F.floorY, name: 'floor' }],

  lanes: {
    'kiln-west': { ax: -9.4, az: -13, bx: -9.4, bz: 13, halfWidth: 2.4 },
    'kiln-east': { ax: 9.4, az: -13, bx: 9.4, bz: 13, halfWidth: 2.4 },
    'kiln-north': { ax: -14, az: -9.5, bx: 14, bz: -9.5, halfWidth: 2.2 },
    'kiln-south': { ax: -14, az: 8.5, bx: 14, bz: 8.5, halfWidth: 2.2 },
  },

  portals: PORTALS,
  // The waves walk INWARD. Wave one is the two north doors, which is the far
  // side of the kiln; by wave four everything is behind you as well, in a room
  // where "behind you" is nine metres.
  waveSpawns: [
    ['f-n-w', 'f-n-e'],
    ['f-n-w', 'f-n-e', 'f-w-n', 'f-e-n'],
    ['f-w-n', 'f-w-s', 'f-e-n', 'f-e-s'],
    ['f-n-w', 'f-n-e', 'f-w-s', 'f-e-s', 'f-s-w', 'f-s-e'],
    ['f-n-w', 'f-n-e', 'f-w-n', 'f-w-s', 'f-e-n', 'f-e-s', 'f-s-w', 'f-s-e'],
  ],

  routes: {
    'ring-west': [
      { x: -13.4, y: 0, z: -12, tier: 0 }, { x: -9.4, y: 0, z: -6, tier: 0 },
      { x: -9.4, y: 0, z: 2, tier: 0 }, { x: -5.6, y: 0, z: 9, tier: 0 },
    ],
    'ring-east': [
      { x: 13.4, y: 0, z: -12, tier: 0 }, { x: 9.4, y: 0, z: -6, tier: 0 },
      { x: 9.4, y: 0, z: 2, tier: 0 }, { x: 5.6, y: 0, z: 9, tier: 0 },
    ],
    'north-face': [
      { x: -12, y: 0, z: -9.5, tier: 0 }, { x: 0, y: 0, z: -9.5, tier: 0 },
      { x: 12, y: 0, z: -9.5, tier: 0 },
    ],
    'south-face': [
      { x: -12, y: 0, z: 8.5, tier: 0 }, { x: 0, y: 0, z: 8.5, tier: 0 },
      { x: 12, y: 0, z: 8.5, tier: 0 },
    ],
  },

  recoveryNodes: [
    { x: 0, y: 0, z: 12.5 }, { x: -9.4, y: 0, z: 0 }, { x: 9.4, y: 0, z: 0 },
    { x: 0, y: 0, z: -9.5 }, { x: 0, y: 0, z: 8.5 }, { x: -14, y: 0, z: -12 },
    { x: 14, y: 0, z: -12 }, { x: -14, y: 0, z: 11 }, { x: 14, y: 0, z: 11 },
  ],

  coverNodes: BLOCKS.map(coverNodeFor),
  holdingGround: HOLD,
  keepOuts: KEEP_OUTS,

  lightGoal: F.lightGoal,
  tensionFloor: FEEL.tension.floors.furnace,
  maxSightline: F.maxSightline,
  fogDensity: FEEL.render.fogDensity,

  // THE TRAP, part 1. Read live off this spec by src/enemies/manager.js.
  scarDepositScale: 0.25,

  // THE INVERSION, and the only non-empty `staticLights` in the tower.
  staticLights: LAMPS,
  palette: P,

  roster: ['husk', 'runner', 'warden', 'bloom'],
  director: {
    queue: D.queue, cap: D.cap, interval: D.interval,
    weights: { husk: D.weights.husk, runner: D.weights.runner, warden: D.weights.warden, bloom: D.weights.bloom },
  },

  // DESIGN, chamber 4: "reload speed +18% and a permanent +0.35 scar intensity."
  reward: { reloadScale: 0.82, scarIntensityBonus: 0.35 },

  // -------------------------------------------------------------------------
  // ELEMENTS. Insertion order is draw order (scene.sortObjects is off), so the
  // floor goes down before what stands on it.
  //
  // NAMING TRAP, paid for once: FEEL.render.accentRegex is
  // /vent|core|eye|lamp|scar|bolt|flare|muzzle|ember|glow|strip/ and an element
  // whose id matches is built EMISSIVE instead of surface. The kiln is therefore
  // `kiln` and not `core`, and the lamp fixture is `stanchion` / `sconce` and
  // not `lampPost` — a static emissive lamp head would keep glowing after the
  // lamp was shot out, which is the one thing this chamber cannot do. The light
  // a lamp emits is an additive sprite owned by `createLampField`, per lamp, so
  // it can go dark one at a time.
  // -------------------------------------------------------------------------
  elements: [
    {
      id: 'floor', mode: 'static', shape: 'quad', shapeArgs: { face: 'up' }, material: 'surface',
      color: P.floor, detail: 1,
      transform: { y: F.floorY, sx: F.halfX + 0.6, sz: F.halfZ + 0.6 },
    },
    {
      id: 'ceilingSlab', mode: 'static', shape: 'quad', shapeArgs: { face: 'down' }, material: 'surface',
      color: P.dark, detail: 0.9,
      transform: { y: F.ceilingY, sx: F.halfX + 0.6, sz: F.halfZ + 0.6 },
    },
    {
      id: 'wallBack', mode: 'instanced', shape: 'quad', shapeArgs: { face: 'front' }, material: 'surface',
      color: P.dark, detail: 0.85,
      place: {
        kind: 'list',
        points: [
          { x: 0, y: F.ceilingY / 2, z: -(F.halfZ + F.wallBackDepth), yaw: 0, sx: F.halfX + 0.8, sy: F.ceilingY / 2 },
          { x: 0, y: F.ceilingY / 2, z: F.halfZ + F.wallBackDepth, yaw: Math.PI, sx: F.halfX + 0.8, sy: F.ceilingY / 2 },
          { x: -(F.halfX + F.wallBackDepth), y: F.ceilingY / 2, z: 0, yaw: Math.PI / 2, sx: F.halfZ + 0.8, sy: F.ceilingY / 2 },
          { x: F.halfX + F.wallBackDepth, y: F.ceilingY / 2, z: 0, yaw: -Math.PI / 2, sx: F.halfZ + 0.8, sy: F.ceilingY / 2 },
        ],
      },
      vary: { tint: [0.68, 0.90], macro: 0.14, warm: 0.03 },
    },
    {
      id: 'wallPanel', mode: 'instanced', shape: 'panel', material: 'surface',
      color: P.concrete, detail: 0.94,
      place: {
        kind: 'perimeter', halfX: F.halfX, halfZ: F.halfZ, y: WALL_BAND.y,
        segment: 2.3, widthJitter: 0.22,
        gaps: PORTALS.map(p => ({ x: p.x, z: p.z, r: F.portalGap })),
      },
      vary: {
        halfAxis: 'x', scale: { y: [WALL_BAND.half, WALL_BAND.half], z: [0.80, 1.24] },
        tint: [0.78, 1.12], macro: 0.26, warm: 0.04,
      },
    },
    {
      id: 'portalFrame', mode: 'instanced', shape: 'portalFrame', material: 'surface',
      color: P.metal, detail: 0.78,
      place: { kind: 'list', points: PORTALS.map(p => ({ x: p.x, y: WALL_BAND.y + 0.05, z: p.z, yaw: p.yaw, sy: WALL_BAND.half })) },
      vary: { scale: { x: [1.48, 1.70], z: [0.86, 1.16] }, tint: [0.74, 1.02], macro: 0.10, warm: 0.03 },
    },
    {
      // THE KILN. One mass, four faces, and every face is a different distance
      // from a different door.
      id: 'kiln', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.kiln, detail: 1,
      place: { kind: 'list', points: [{ x: KILN.x, y: KILN.y * 0.5, z: KILN.z, yaw: 0, sx: KILN.hx, sy: KILN.y * 0.5, sz: KILN.hz }] },
      vary: { tint: [0.88, 1.00], macro: 0.10, warm: 0.05 },
      collider: { tag: 'prop', flags: ['support', 'barrier'], half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'kilnCollar', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.dark, detail: 1,
      place: {
        kind: 'list',
        points: [
          ...lineRun(-KILN.hx - 0.5, -KILN.hz - 0.5, KILN.hx + 0.5, -KILN.hz - 0.5, 2.2, 0, 0),
          ...lineRun(-KILN.hx - 0.5, KILN.hz + 0.5, KILN.hx + 0.5, KILN.hz + 0.5, 2.2, 0, 0),
          ...lineRun(-KILN.hx - 0.5, -KILN.hz - 0.5, -KILN.hx - 0.5, KILN.hz + 0.5, 2.0, 0, Math.PI / 2),
          ...lineRun(KILN.hx + 0.5, -KILN.hz - 0.5, KILN.hx + 0.5, KILN.hz + 0.5, 2.0, 0, Math.PI / 2),
        ],
      },
      vary: { halfAxis: 'x', scale: { y: [0.10, 0.18], z: [0.30, 0.46] }, anchorBottom: F.floorY, tint: [0.48, 0.72], macro: 0.20 },
    },
    {
      // Tie bars from the kiln to the ceiling. In a room lit from 2.15 m they
      // are the only vertical the light finds above head height, which is what
      // stops the ceiling from reading as a lid.
      id: 'tieBar', mode: 'instanced', shape: 'column', material: 'surface',
      color: P.metal, detail: 0.86,
      place: {
        kind: 'list',
        points: [
          { x: -KILN.hx + 0.6, y: F.kilnY, z: -KILN.hz + 0.5, yaw: 0.2 },
          { x: KILN.hx - 0.6, y: F.kilnY, z: -KILN.hz + 0.5, yaw: 1.1 },
          { x: -KILN.hx + 0.6, y: F.kilnY, z: KILN.hz - 0.5, yaw: 2.4 },
          { x: KILN.hx - 0.6, y: F.kilnY, z: KILN.hz - 0.5, yaw: 4.0 },
        ],
      },
      vary: {
        scale: { x: [0.16, 0.22], y: [F.ceilingY - F.kilnY - 0.05, F.ceilingY - F.kilnY], z: [0.16, 0.22] },
        yaw: [0, TAU], tint: [0.66, 1.00], macro: 0.18, warm: 0.05,
      },
    },
    {
      // THE LAMP STANCHION. A floor-standing post, not a ceiling fixture — see
      // FURNACE.lampY for why the light field makes that a requirement rather
      // than a preference.
      id: 'stanchion', mode: 'instanced', shape: 'stub', material: 'surface',
      color: P.metal, detail: 0.92,
      place: { kind: 'list', points: LAMP_POINTS.map(l => ({ x: l.x, y: F.floorY, z: l.z, yaw: 0 })) },
      vary: {
        scale: { x: [0.15, 0.20], y: [F.lampY - 0.28, F.lampY - 0.20], z: [0.15, 0.20] },
        yaw: [0, TAU], tiltMax: 0.012, tint: [0.62, 0.96], macro: 0.16, warm: 0.04,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [0.55, 0.5, 0.55], center: [0, 0.5, 0] },
    },
    {
      // The shroud around the head. Deliberately NOT emissive: it is the dull
      // metal cowl the light comes out of, so that when the lamp breaks there is
      // still an object there and the room reads as damaged rather than as
      // having lost a prop.
      id: 'sconce', mode: 'instanced', shape: 'capital', material: 'surface',
      color: P.substructure, detail: 0.9,
      place: { kind: 'list', points: LAMP_POINTS.map(l => ({ x: l.x, y: F.lampY - 0.26, z: l.z, yaw: 0 })) },
      vary: { scale: { x: [0.40, 0.48], y: [0.24, 0.30], z: [0.40, 0.48] }, yaw: [0, TAU], tint: [0.72, 1.00], macro: 0.14 },
    },
    {
      id: 'stanchionCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'stanchion', y: F.floorY },
      vary: { followScale: true, scale: { x: [1.9, 2.3], y: [0.20, 0.32], z: [1.9, 2.3] }, yaw: [0, TAU], tint: [0.46, 0.68], macro: 0.18 },
    },
    {
      id: 'block', mode: 'instanced', shape: 'block', material: 'surface',
      color: P.substructure, detail: 0.95,
      place: { kind: 'list', points: BLOCKS.map(b => ({ x: b.x, y: b.sy, z: b.z, yaw: b.yaw, sx: b.sx, sy: b.sy, sz: b.sz })) },
      vary: { tint: [0.76, 1.10], macro: 0.24 },
      collider: { tag: 'prop', flags: 'barrier', half: [1, 1, 1], center: [0, 0, 0] },
    },
    {
      id: 'beam', mode: 'instanced', shape: 'beam', material: 'surface',
      color: P.metal, detail: 0.72,
      place: { kind: 'runs', along: 'x', halfX: 16.4, halfZ: 14.2, spacing: 2.4, segment: 7.5, widthJitter: 0.28, gap: 0.06, y: 5.9 },
      vary: { halfAxis: 'x', scale: { y: [0.26, 0.34], z: [0.80, 1.10] }, tint: [0.68, 1.04], macro: 0.20, warm: 0.05 },
    },
    {
      id: 'duct', mode: 'instanced', shape: 'duct', material: 'surface',
      color: P.metal, detail: 0.68,
      place: { kind: 'runs', along: 'z', halfX: 13.6, halfZ: 13.6, spacing: 6.2, segment: 6.0, widthJitter: 0.24, gap: 0.10, y: 5.35 },
      vary: { halfAxis: 'x', scale: { y: [0.48, 0.66], z: [0.74, 1.04] }, tint: [0.62, 0.98], macro: 0.18, warm: 0.06 },
    },
    {
      id: 'kerb', mode: 'instanced', shape: 'kerb', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'runs', along: 'x', halfX: 16, halfZ: 13.6, spacing: 4.6, offset: 2.3, segment: 6.0, widthJitter: 0.32, gap: 0.5, y: 0 },
      keepOut: ['start', 'kiln'],
      vary: { halfAxis: 'x', scale: { y: [0.06, 0.11], z: [0.20, 0.32] }, anchorBottom: F.floorY, tint: [0.64, 1.04], macro: 0.28 },
    },
    {
      id: 'plate', mode: 'instanced', shape: 'plate', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'lattice', halfX: 15.8, halfZ: 13.8, spacing: 2.35, jitter: 0.8, y: 0.045 },
      keepOut: ['start', 'kiln'],
      vary: {
        scale: { x: [0.92, 1.48], y: [0.030, 0.055], z: [0.92, 1.48] },
        yawQuantum: Math.PI / 2, yawFine: 0.055, tint: [0.68, 1.08], macro: 0.34,
      },
    },
    {
      id: 'stub', mode: 'instanced', shape: 'stub', material: 'surface',
      color: P.substructure, detail: 1,
      place: {
        kind: 'lattice',
        xs: [-15.2, -11.6, 11.6, 15.2],
        zs: [-13.2, -8.4, -3.6, 1.2, 6.0, 10.8],
        jitter: 0.8, y: F.floorY,
      },
      keepOut: GROUND_KEEPOUTS,
      vary: {
        scale: { x: [0.36, 0.62], y: [0.70, 2.05], z: [0.36, 0.62] },
        yaw: [0, TAU], tiltMax: 0.024, tint: [0.74, 1.08], macro: 0.30,
      },
      collider: { tag: 'prop', flags: 'barrier', half: [0.90, 0.5, 0.90], center: [0, 0.5, 0] },
    },
    {
      id: 'stubCollar', mode: 'instanced', shape: 'collar', material: 'surface',
      color: P.dark, detail: 1,
      place: { kind: 'mirror', of: 'stub', y: F.floorY },
      vary: { followScale: true, scale: { x: [1.22, 1.42], y: [0.24, 0.38], z: [1.22, 1.42] }, yaw: [0, TAU], tint: [0.46, 0.68], macro: 0.20 },
    },
    {
      id: 'chunk', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.substructure, detail: 1,
      place: { kind: 'scatter', count: 420, minDist: 0.60, minX: -16.4, maxX: 16.4, minZ: -14.4, maxZ: 14.4, y: F.floorY },
      keepOut: ['start', 'kiln'],
      vary: {
        scale: { x: [0.11, 0.38], y: [0.08, 0.27], z: [0.11, 0.36] },
        yaw: [0, TAU], tiltMax: 0.42, tint: [0.58, 1.14], macro: 0.40,
      },
    },
    {
      id: 'chunkFine', mode: 'instanced', shape: 'chunk', material: 'surface',
      color: P.plate, detail: 1,
      place: { kind: 'scatter', count: 380, minDist: 0.40, minX: -16.6, maxX: 16.6, minZ: -14.6, maxZ: 14.6, y: F.floorY },
      keepOut: ['start', 'kiln'],
      vary: {
        scale: { x: [0.05, 0.16], y: [0.04, 0.13], z: [0.05, 0.15] },
        yaw: [0, TAU], tiltMax: 0.55, tint: [0.54, 1.16], macro: 0.44,
      },
    },
    {
      // The head stop. A 34 x 30 m slab baked as ONE collider is refused at the
      // 40 m ribbon rule; segmenting is the rule's intent, not a workaround.
      id: 'ceilingStop', mode: 'collider', shape: 'none', material: 'none',
      place: { kind: 'lattice', xs: [-8.5, 8.5], zs: [-7.5, 7.5], y: F.clearanceY + 0.18, jitter: 0 },
      collider: { tag: 'ceiling', flags: ['ceiling', 'barrier'], half: [8.5, 0.18, 7.5], center: [0, 0, 0] },
    },
  ],
});

// ===========================================================================
// THE LAMP FIELD — the runtime half of the inversion.
//
// This is not a system: it exports no `create(ctx)` and it does not appear in
// the SYSTEMS manifest. It is constructed and driven by src/enemies/damp.js,
// which is W11's one manifest entry, for the same reason `bodies.js` is driven
// by `manager.js` — a chamber does not have a heartbeat, and the thing that
// gives this one its heartbeat is the same module that owns the ending.
// ===========================================================================

/**
 * THE PERMANENT-SCAR ADAPTER, AND IT IS A BORROW.
 *
 * `src/world/lightfield.js` is integrator-owned and does not yet implement
 * `permanent` (docs/PLAN.md Stage 0 lists it; only `lightNorm` landed). Until it
 * does, this attaches and detaches permanent records using nothing but the
 * field's OWN methods — `_index`, `_unindex`, `scars`, `version` — so there is
 * no second copy of the falloff, the hash or the query anywhere.
 *
 * The merge and cull exemptions fall out of one observation: `deposit()` finds
 * its merge host through `_nearestWithin`, which reads the BUCKETS, and it
 * checks the cull against `scars.length`. Detaching the permanents for exactly
 * the duration of one `deposit()` call therefore makes them invisible to both,
 * and restores them byte-identically afterwards. `illuminationAt` is never
 * called in between — the wrapper is synchronous and does not yield.
 *
 * The exact diff for the real fix is filed in docs/HANDOFF.md. When it lands,
 * `field.supportsPermanent` becomes true, this wrapper never installs, and
 * `snapshot().borrowed` reports false — which is how you will know.
 */
export function permanentAdapter(field) {
  const held = [];
  let wrapped = null;
  let original = null;

  const native = !!(field && field.FIELD_SUPPORTS_PERMANENT);

  function detach() {
    for (let k = 0; k < held.length; k++) {
      const s = held[k];
      const at = field.scars.indexOf(s);
      if (at !== -1) field.scars.splice(at, 1);
      field._unindex(s);
    }
  }
  function attach() {
    for (let k = 0; k < held.length; k++) {
      const s = held[k];
      if (field.scars.indexOf(s) === -1) field.scars.push(s);
      field._index(s);
    }
  }

  function install() {
    if (native || wrapped || typeof field.deposit !== 'function') return false;
    original = field.deposit;
    wrapped = function depositWithPermanentExemption(x, y, z, r, i) {
      detach();
      const s = original.call(field, x, y, z, r, i);
      attach();
      field.dirty = true; field.version++;
      return s;
    };
    field.deposit = wrapped;
    return true;
  }

  function uninstall() {
    if (wrapped && field.deposit === wrapped) field.deposit = original;
    wrapped = null; original = null;
  }

  return {
    get borrowed() { return !!wrapped; },
    get native() { return native; },
    get count() { return held.length; },
    list: held,
    add(scar) {
      if (held.indexOf(scar) !== -1) return scar;
      held.push(scar);
      if (field.scars.indexOf(scar) === -1) field.scars.push(scar);
      field._index(scar);
      field.dirty = true; field.version++;
      install();
      return scar;
    },
    remove(scar) {
      const k = held.indexOf(scar);
      if (k === -1) return false;
      held.splice(k, 1);
      const at = field.scars.indexOf(scar);
      if (at !== -1) field.scars.splice(at, 1);
      field._unindex(scar);
      field.dirty = true; field.version++;
      if (held.length === 0) uninstall();
      return true;
    },
    clear() {
      while (held.length) this.remove(held[held.length - 1]);
      uninstall();
    },
  };
}

/**
 * The FURNACE's ten lamps, live.
 *
 * Each lamp is three things at once and they are the same record:
 *   - a permanent entry in `ctx.light` (the simulation: iris, D3, RUNNER homing,
 *     spawn validation, the mood filter),
 *   - a duck-typed target in the weapons list (the fire pipeline: it is SHOT,
 *     by the real ray march, and obeys THE ONE LAW),
 *   - an additive sprite (the picture: per-lamp, so one can go dark alone).
 */
export function createLampField(ctx, spec = SPEC) {
  const field = ctx.light;
  if (!field) throw new Error('furnace: createLampField needs ctx.light — the lamps ARE scars');

  const adapter = permanentAdapter(field);
  const lamps = [];
  const stats = { installed: 0, broken: 0, hits: 0, lightRemoved: 0 };

  for (const l of spec.staticLights) {
    // The RECORD. `y` is the FEET convention every consumer of the target list
    // uses, so the head capsule is centred on the emitter rather than under it.
    const lamp = {
      id: -1, lampId: l.id, index: l.index,
      x: l.x, y: l.y - FURNACE.lampHeight * 0.5, z: l.z,
      radius: FURNACE.lampRadius, height: FURNACE.lampHeight,
      hp: l.hp, maxHp: l.hp, dead: false,
      armoured: false, invulnerable: false,
      facingX: 0, facingZ: 1,
      litFor: 0, litIntensity: 0, hitFlash: 0, lastHitAt: 0,
      lastHpSeen: l.hp,
      // The scar this lamp IS.
      scar: { x: l.x, y: l.y, z: l.z, r: l.r, i: l.i, born: l.born, cell: 0, permanent: true, hostile: true, breakable: true },
      broken: false,
      breakT: 0,
    };
    lamps.push(lamp);
    adapter.add(lamp.scar);
    stats.installed++;
  }

  /** Break one lamp: the record leaves the field, and the room gets darker. */
  function breakLamp(lamp) {
    if (!lamp || lamp.broken) return false;
    lamp.broken = true;
    lamp.dead = true;
    lamp.hp = 0;
    lamp.breakT = FURNACE.lampBreakFade;
    stats.lightRemoved += lamp.scar.i;
    adapter.remove(lamp.scar);
    stats.broken++;
    // The picture follows the simulation in the same frame. `sync()` rebuilds on
    // a length change by itself, but the projection is "never cleared" by design
    // and a removal is the one edit it cannot append — so say so explicitly.
    const irr = ctx.render && ctx.render.irradiance;
    if (irr && typeof irr.forceRebuild === 'function') irr.forceRebuild();
    return true;
  }

  function breakById(id) {
    const l = lamps.find(k => k.lampId === id);
    return l ? breakLamp(l) : false;
  }

  /**
   * Observe damage rather than being told about it — the same discipline
   * `enemies/manager.js` uses, and for the same reason: `applyHit` writes `hp`
   * onto the record and nothing calls us.
   */
  function step(dt) {
    for (let k = 0; k < lamps.length; k++) {
      const lamp = lamps[k];
      if (lamp.litFor > 0) lamp.litFor = Math.max(0, lamp.litFor - dt);
      if (lamp.hitFlash > 0) lamp.hitFlash = Math.max(0, lamp.hitFlash - dt);
      if (lamp.breakT > 0) lamp.breakT = Math.max(0, lamp.breakT - dt);
      if (lamp.broken) continue;
      if (lamp.hp < lamp.lastHpSeen) { stats.hits++; lamp.lastHpSeen = lamp.hp; }
      if (lamp.hp <= 0) breakLamp(lamp);
    }
  }

  /**
   * The light itself. One additive sprite per lamp, in the shared bucket — zero
   * new programs, zero new materials, and per-lamp emissive, which is precisely
   * what an `emissiveUnlit` mesh could not give us (its intensity is a MATERIAL
   * uniform, so ten lamps would be ten materials and they would all die at once).
   */
  function update(rdt) {
    const add = ctx.render && ctx.render.additive;
    if (!add || typeof add.sprite !== 'function') return 0;
    const warm = FEEL.render.warm;
    let n = 0;
    for (let k = 0; k < lamps.length; k++) {
      const lamp = lamps[k];
      if (lamp.broken) {
        // The dying flare. A lamp going out is the brightest single event in the
        // chamber and then it is the darkest thing in it.
        if (lamp.breakT <= 0) continue;
        const t = lamp.breakT / FURNACE.lampBreakFade;
        add.sprite(lamp.scar.x, lamp.scar.y, lamp.scar.z,
          FURNACE.lampSpriteSize * (0.4 + t * 1.9), warm[0], warm[1], warm[2],
          FURNACE.lampBreakLight * t * t, 0, 0, 1, 0);
        n++;
        continue;
      }
      // THE ONE LAW's 0.35 s rides the lamp exactly as it rides a creature: a
      // hit lamp flares before it dies, so a shot that did not kill it still
      // reads as a shot that connected.
      const hit = lamp.hitFlash > 0 ? lamp.hitFlash / (FEEL.law.hitFlashMs / 1e3) : 0;
      const emissive = lamp.scar.i * (1 + 2.6 * hit) * (1 + 0.35 * (lamp.litFor > 0 ? lamp.litIntensity : 0));
      add.sprite(lamp.scar.x, lamp.scar.y, lamp.scar.z, FURNACE.lampSpriteSize,
        warm[0], warm[1], warm[2], emissive, 0, 0, 1, 0);
      n++;
    }
    return n;
  }

  function dispose() {
    adapter.clear();
    lamps.length = 0;
  }

  function snapshot() {
    return {
      chamber: 'furnace',
      lamps: lamps.length,
      lit: lamps.filter(l => !l.broken).length,
      broken: stats.broken,
      hits: stats.hits,
      lightRemoved: stats.lightRemoved,
      borrowed: adapter.borrowed,
      nativePermanent: adapter.native,
      lampCoverage: lampCoverage(),
      queueCoverage: queueCoverage(spec.scarDepositScale),
    };
  }

  return {
    lamps, step, update, dispose, snapshot,
    breakLamp, breakById,
    adapter,
    get lit() { return lamps.filter(l => !l.broken).length; },
    nearest(x, z) {
      let best = null, bd = Infinity;
      for (const l of lamps) {
        if (l.broken) continue;
        const dx = l.scar.x - x, dz = l.scar.z - z;
        const d = dx * dx + dz * dz;
        if (d < bd) { bd = d; best = l; }
      }
      return best;
    },
  };
}

export default SPEC;
