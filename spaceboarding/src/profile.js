// The cross-section of the course, as a pure function of distance.
//
// This is the one decision everything else hangs on. NINEFOLD BURN never broke
// because its sim never touched 3D geometry: the vehicle was (progress,
// lateral) and trackSample() was a pure function of distance, so there was
// nothing to clip against. CARVE and IONWAKE broke in exactly the places where
// their sims met geometry ad hoc.
//
// So Spaceboarding keeps Ninefold's discipline and adds Carve's dimensions.
// profileAt(segment, s) returns the shape of the road at s. The rider resolves
// against this function, and procedural-art.js builds the visible walls and
// rails from the SAME function -- so the geometry you collide with is exactly
// the geometry you see. There is no second source of truth to drift from.
//
// The zones run outward from the centre line: ROAD (flat), WALL (a
// quarter-pipe rising to the coping), DECK (flat, beyond the coping), VOID.
// The rider crosses their boundaries; it never teleports between them.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / Math.max(1e-7, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};

// Road half-width as a fraction of the authored segment width. 0.48 is
// inherited from Ninefold's lateral clamp, so the flat drivable ribbon is
// exactly the one players already knew.
export const ROAD_HALF_FRACTION = 0.48;
// The quarter-pipe and its deck live between here and the outer edge of the
// road mesh (which spans +/- one full segment width). Keeping the whole
// feature inside the drawn ground means the wall rises out of road rather
// than floating over nothing.
export const WALL_OUTER_FRACTION = 0.70;
export const DECK_OUTER_FRACTION = 0.80;
// How tall a full-height quarter-pipe is, as a fraction of segment width.
//
// This is not a look choice, it is a reachability one. Climbing costs energy:
// the rider needs a lateral speed of sqrt(2 * GRAVITY * rise) to reach the
// coping at all. At 0.22 that was 16.5 units/s against a drifting terminal
// lateral speed of ~16.4 -- the wall was, by arithmetic, almost exactly
// unclimbable, and the whole skate layer would have been inert. At 0.15
// Scoria's wall is 2.33 units and needs 13.6: a committed drift line reaches
// the coping, a casual steer (terminal ~11.3) does not.
export const WALL_RISE_FRACTION = 0.15;
// The coping rail sits this far above the deck. Grind capture is measured
// against it.
export const COPING_HEIGHT = 0.42;

// A wall stretch fades in and out rather than appearing, so the rider never
// meets a step change in the surface under them.
const RAMP = 0.06;

function wallStrengthAt(segment, fraction) {
  const stretches = segment.walls;
  if (!stretches || !stretches.length) return 0;
  let strength = 0;
  for (const stretch of stretches) {
    const inner = smoothstep(stretch.from, stretch.from + RAMP, fraction)
      * (1 - smoothstep(stretch.to - RAMP, stretch.to, fraction));
    strength = Math.max(strength, inner * (stretch.height ?? 1));
  }
  return clamp(strength, 0, 1);
}

// A zone is a band of |x| with a surface under it. They are ordered outward
// from the centre line and the rider crosses their boundaries, never teleports
// between them.
export const ZONE = Object.freeze({
  ROAD: 'road',
  WALL: 'wall',
  DECK: 'deck',
  VOID: 'void',
});

/**
 * The cross-section at distance `s` along `segment`.
 *
 * All lateral values are magnitudes of |x|; the shape is symmetric, and the
 * rider carries the sign. Heights are in the same units as lateral offset and
 * as the renderer's lift channel.
 */
export function profileAt(segment, s, short = false) {
  const width = segment.width;
  const roadHalf = width * ROAD_HALF_FRACTION;
  const length = segment.length * (short ? 0.075 : 1);
  const fraction = clamp(s / Math.max(1e-6, length), 0, 1);
  // Crossings are open sky; walls belong to the planets.
  const strength = segment.type === 'planet' ? wallStrengthAt(segment, fraction) : 0;
  // EVERY dimension scales with strength, not just the height. When only the
  // rise ramped and the widths switched on a boolean, the outer lip jumped
  // from 12.4 to 7.44 the tick a stretch ended -- and a rider standing on the
  // deck was teleported five units inward by the next sweep. Scaling the whole
  // cross-section means the wall grows out of the road and shrinks back into
  // it, carrying whoever is on it.
  const wallWidth = strength * width * (WALL_OUTER_FRACTION - ROAD_HALF_FRACTION);
  const wallRise = strength * width * WALL_RISE_FRACTION;
  const copingX = roadHalf + wallWidth;
  const copingH = wallRise;
  const lipX = roadHalf + strength * width * (DECK_OUTER_FRACTION - ROAD_HALF_FRACTION);
  return {
    segmentType: segment.type,
    width,
    roadHalf,
    wallRise,
    wallWidth,
    copingX,
    copingH,
    lipX,
    // Planet rails are hard: you bounce off them. Space has no rails, only a
    // lane the glider is held inside, so it resolves softly. And a rail is
    // only a rail where there is no wall to ride. Where the
    // quarter-pipe is up, the road edge is a surface you climb, not a barrier
    // you bounce off; the outer lip becomes the boundary instead.
    hardEdge: segment.type === 'planet',
    hasWall: strength > 0,
    wallStrength: strength,
    copingRailH: copingH + COPING_HEIGHT,
    s,
    fraction,
    short,
  };
}

/** Height of the solid surface directly under lateral offset `x`. */
export function surfaceHeight(profile, x) {
  const magnitude = Math.abs(x);
  if (magnitude <= profile.roadHalf) return 0;
  if (profile.wallWidth <= 0) return 0;
  if (magnitude >= profile.copingX) return profile.wallRise;   // the flat deck
  // Quarter-pipe: a smooth rise from the road edge to the coping. Smoothstep
  // keeps the surface C1 across both joins, so a small lateral overshoot near
  // the coping cannot produce a large height error. CARVE's wall was an
  // arcsine clamped at 82 degrees, and that near-vertical section is exactly
  // where its clipping started.
  const t = clamp((magnitude - profile.roadHalf) / profile.wallWidth, 0, 1);
  return smoothstep(0, 1, t) * profile.wallRise;
}

/**
 * Slope of the surface at x, as dH/d|x|. The rider turns this into the gravity
 * component that pulls it back down a quarter-pipe, so carrying speed up the
 * wall and coming back down is one derivative rather than a special case.
 */
export function surfaceSlope(profile, x) {
  const magnitude = Math.abs(x);
  if (profile.wallWidth <= 0) return 0;
  if (magnitude <= profile.roadHalf || magnitude >= profile.copingX) return 0;
  const t = clamp((magnitude - profile.roadHalf) / profile.wallWidth, 0, 1);
  // d/dt of smoothstep is 6t(1-t); chain through the wall width.
  return (6 * t * (1 - t)) * profile.wallRise / profile.wallWidth;
}

/** Which zone contains lateral offset `x`. */
export function zoneAt(profile, x) {
  const magnitude = Math.abs(x);
  if (magnitude <= profile.roadHalf) return ZONE.ROAD;
  if (magnitude <= profile.copingX) return ZONE.WALL;
  if (magnitude <= profile.lipX) return ZONE.DECK;
  return ZONE.VOID;
}

/**
 * The ordered |x| boundaries the rider can cross, outward from the centre.
 * Duplicates are collapsed so a Phase 3 profile (where coping and lip sit on
 * the road edge) presents exactly one boundary rather than three coincident
 * ones the resolver would thrash between.
 */
export function boundariesOf(profile) {
  const raw = [profile.roadHalf, profile.copingX, profile.lipX];
  const out = [];
  for (const value of raw) {
    if (!out.length || value - out[out.length - 1] > 1e-6) out.push(value);
  }
  return out;
}

/**
 * The narrowest band between boundaries. The rider substeps its integration
 * against this so a fast lateral move can never jump a zone -- the direct fix
 * for CARVE's endpoint-only resolveSurface(), where at vMaxBoost 226 a single
 * frame could carry x clean over the deck and land past the lip, read as "ran
 * off the outside", and pass visibly through the wall.
 */
export function narrowestZone(profile) {
  const boundaries = boundariesOf(profile);
  let narrowest = boundaries[0];
  for (let i = 1; i < boundaries.length; i += 1) {
    narrowest = Math.min(narrowest, boundaries[i] - boundaries[i - 1]);
  }
  return Math.max(0.35, narrowest);
}

/** True when (x, H) sits on or above the solid surface and inside the world. */
export function insideEnvelope(profile, x, height, tolerance = 0.05) {
  if (!Number.isFinite(x) || !Number.isFinite(height)) return false;
  if (Math.abs(x) > profile.lipX + tolerance) return false;
  return height >= surfaceHeight(profile, x) - tolerance;
}
