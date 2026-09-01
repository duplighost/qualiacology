// Aerial rails: the fancy ones.
//
// Alex, after playing: "the grind rails are super cool. they just don't work
// great... If you hit one, it should probably speed you up. it can even do
// some fancy stuff like the rail can go up into the air and do some turns or a
// loop and the player is thrown back onto the course faster."
//
// So a rail is an authored PATH, not a surface. It is a pure function of
// distance -- railAt(segment, s) returns where the rail is at s -- and while
// the rider is on one their position is that function's output rather than the
// result of integrating against geometry. Which means a rail can leave the
// ground, sweep across the road, turn upside down, and come back, and none of
// it can clip, wedge or fail to end: it is a curve with a start and a finish.
//
// procedural rail meshes in renderer.js are built from THIS function, so the
// glowing line you can see from a long way off and the line you are riding are
// the same numbers.

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const smoothstep = (a, b, value) => {
  const t = clamp((value - a) / Math.max(1e-7, b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const TAU = Math.PI * 2;

// How wide the mouth of a rail is. Deliberately generous: a rail you keep
// missing is a rail you stop trying for, and the interesting part is what
// happens once you are on it, not whether you threaded a needle to get there.
export const RAIL_CAPTURE_LANE = 3.2;
// Riding one is worth this much of the segment band per second. Well above the
// coping grind: an aerial rail is a committed line that gives up all steering
// for its duration, and it has to pay for that.
export const RAIL_BAND_GAIN_PER_SECOND = 0.85;
// And it throws you off the end. This is the "thrown back onto the course
// faster" part -- every rail ends in an air, never a stop.
export const RAIL_EXIT_IMPULSE = 30;

/**
 * The shapes a rail can take. Each returns the rail's position at `t` (0..1
 * along the rail) as an offset from the road: lateral in units, height above
 * the road, and a roll for the board.
 */
const SHAPES = {
  /**
   * KICKER. Runs straight, climbs hard, and ends at the top -- the rider is
   * fired off the lip with everything they have. The simplest one, and the
   * one that reliably buys enough airtime for a full rotation.
   */
  kicker(t, side, width) {
    return {
      lateral: side * width * 0.42,
      height: 0.6 + smoothstep(0, 0.85, t) * 7.4,
      roll: 0,
      exitUp: 1,
    };
  },

  /**
   * SWEEP. Crosses the whole road in the air and sets you down on the other
   * side. A lane change you could not make on the ground, which is what makes
   * taking it a decision rather than a detour.
   */
  sweep(t, side, width) {
    const across = smoothstep(0.1, 0.9, t);
    return {
      lateral: side * width * 0.42 * (1 - across * 2),
      height: 0.6 + Math.sin(Math.PI * across) * 5.2,
      roll: -side * Math.sin(Math.PI * across) * 0.6,
      exitUp: 0.45,
    };
  },

  /**
   * LOOP. Up and over. The board inverts at the top -- a full 2*PI of roll
   * across the rail -- and comes back down to the road pointing forward.
   * This is the one Alex asked for by name.
   */
  loop(t, side, width) {
    const phase = smoothstep(0.06, 0.94, t);
    return {
      lateral: side * width * 0.36 * Math.cos(phase * Math.PI),
      height: 0.6 + Math.sin(phase * Math.PI) * 9.6,
      roll: phase * TAU,
      exitUp: 0.6,
    };
  },
};

export const RAIL_SHAPES = Object.freeze(Object.keys(SHAPES));

/** Every rail authored on this segment, with its absolute distances resolved. */
export function railsOf(segment, short = false) {
  if (!segment.rails || !segment.rails.length) return [];
  const length = segment.length * (short ? 0.075 : 1);
  return segment.rails.map((rail, index) => ({
    index,
    shape: rail.shape,
    side: rail.side ?? 1,
    startS: rail.from * length,
    endS: rail.to * length,
    span: Math.max(1, (rail.to - rail.from) * length),
  }));
}

/**
 * The rail at distance `s`, if any is live there.
 *
 * Returns null when no rail covers `s`. The returned record is the whole
 * contract the rider needs: where the line is, how far along it they are, and
 * how hard it will throw them when it runs out.
 */
export function railAt(segment, s, short = false) {
  const rails = railsOf(segment, short);
  for (const rail of rails) {
    if (s < rail.startS || s > rail.endS) continue;
    const t = clamp((s - rail.startS) / rail.span, 0, 1);
    const shape = SHAPES[rail.shape] ?? SHAPES.kicker;
    const point = shape(t, rail.side, segment.width);
    return {
      ...rail,
      t,
      lateral: point.lateral,
      height: point.height,
      roll: point.roll,
      exitUp: point.exitUp,
      // A rail is ending when there is less than a breath of it left, which is
      // when the launch fires.
      ending: t >= 0.995,
    };
  }
  return null;
}

/**
 * The rail whose MOUTH is at `s`, if the rider is in a position to catch it.
 *
 * Capture is checked at the entry only. A rail you can join halfway is a rail
 * with no commitment in it -- lining up for the mouth is the skill, and once
 * you are on, the ride is the reward.
 */
export function railMouthAt(segment, s, previousS, lateral, short = false) {
  for (const rail of railsOf(segment, short)) {
    if (previousS >= rail.startS || s < rail.startS) continue;
    const shape = SHAPES[rail.shape] ?? SHAPES.kicker;
    const mouth = shape(0, rail.side, segment.width);
    if (Math.abs(lateral - mouth.lateral) > RAIL_CAPTURE_LANE) continue;
    return { ...rail, mouth };
  }
  return null;
}

/** Sample a rail's line for drawing, in the same units the rider rides. */
export function sampleRail(segment, rail, samples = 24) {
  const shape = SHAPES[rail.shape] ?? SHAPES.kicker;
  return Array.from({ length: samples + 1 }, (_, i) => {
    const t = i / samples;
    const point = shape(t, rail.side, segment.width);
    return { t, s: rail.startS + t * rail.span, ...point };
  });
}
