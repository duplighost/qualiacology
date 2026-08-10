/* VESPERWAKE — THE HOLLOW BELL
 * config.js — the law.
 *
 * Every number that decides how the game FEELS lives here. Nothing else in the
 * codebase should invent a movement or timing constant. If a value is tuned in
 * a review pass, it is tuned here.
 *
 * Units: pixels and seconds in VIRTUAL space (VIEW_W x VIEW_H). The renderer
 * scales that to the real canvas; gameplay never sees device pixels.
 */

export const VIEW_W = 960;
export const VIEW_H = 540;

/* The design grid. Levels are authored in these cells so that jump arcs and
 * platform gaps stay legible instead of accidental. */
export const CELL = 24;

/* ------------------------------------------------------------------ *
 * PLAYER
 * ------------------------------------------------------------------ */
export const PLAYER = {
  W: 26,
  H: 58,
  CROUCH_H: 34,

  MAX_HP: 100,

  /* Horizontal. Ground accel is high enough that a tap reads as a step and a
   * hold reads as a run; friction is higher still so stopping is crisp. */
  RUN: 196,
  ACCEL: 1900,
  FRICTION: 2500,
  AIR_ACCEL: 1150,
  AIR_DRAG: 320,
  /* Reversing direction gets an extra shove so turnarounds are snappy rather
   * than mushy. Lifted from VESPERBANE, where it fixed exactly this. */
  TURN_BOOST: 2.05,
  /* You can creep while crouched. It is slow enough to feel like a decision
   * and fast enough that a crouch tunnel is a passage rather than a wall. */
  CROUCH_WALK: 66,
  CROUCH_ACCEL: 900,
  CROUCH_SLIDE: 900, // deceleration applied when you let go while crouched

  /* Vertical. apex = JUMP_V^2 / (2*GRAVITY) = 86px = 3.6 cells.
   * FALL_MULT makes the descent quicker than the rise (classic snap). */
  JUMP_V: 500,
  GRAVITY: 1450,
  FALL_MULT: 1.34,
  JUMP_CUT: 0.42, // vy multiplier when jump is released early
  TERMINAL: 640,
  GLIDE_FALL: 96,   // terminal descent while the Moth Shard is held
  COYOTE: 0.10,
  JUMP_BUFFER: 0.12,

  /* Getting hit. */
  HIT_INVULN: 0.95,
  HIT_STUN: 0.26,
  HIT_KNOCK_X: 180,
  HIT_KNOCK_Y: -190,
};

/* ------------------------------------------------------------------ *
 * QUICKSTEP  (the dash — kept, but it has one job: beating a telegraph)
 *
 * It is deliberately SHORT and grounded. It does not cross gaps, it does not
 * out-run anything, and it cannot be spammed. What it does is pass through an
 * attack. Stepping through an active enemy hitbox is a PERFECT STEP: the
 * cooldown is refunded, a resonance pip is granted, and time hitches for an
 * eighth of a second so you feel it land.
 * ------------------------------------------------------------------ */
export const STEP = {
  TIME: 0.16,
  SPEED: 850,
  EASE_OUT: 0.55,        // fraction of TIME spent decelerating
  IFRAME_START: 0.02,
  IFRAME_END: 0.13,
  COOLDOWN: 0.50,
  CANCEL_AFTER: 0.10,    // may be cancelled into an attack after this
  PERFECT_SLOWMO: 0.13,
  PERFECT_RATE: 0.34,
  /* Down + step is a SLIDE: the same dodge, but it holds the crouched hitbox
   * for its whole length, so it doubles as the fast way through a low gap.
   * This is the second reason the button exists. */
  SLIDE_SPEED: 640,
  SLIDE_TIME: 0.26,
};

/* ------------------------------------------------------------------ *
 * THE NOONCORD  (the chain whip)
 *
 * Every strike is windup -> active -> recovery. Windups are short enough to
 * feel responsive and long enough that a whiff is a real mistake. Reach is the
 * distance from the player's centre to the far end of the hit rect.
 * ------------------------------------------------------------------ */
const swing = (windup, active, recovery, reach, damage, extra = {}) =>
  ({ windup, active, recovery, reach, damage, total: windup + active + recovery, ...extra });

export const WHIP = {
  /* Ground combo. Three links. The third commits you. */
  GROUND: [
    swing(0.09, 0.07, 0.16, 64, 12, { height: 34, up: 20, knock: 90 }),
    swing(0.07, 0.07, 0.18, 72, 13, { height: 34, up: 22, knock: 110 }),
    swing(0.13, 0.10, 0.30, 88, 22, { height: 44, up: 26, knock: 260, heavy: true }),
  ],
  COMBO_WINDOW: 0.32,

  /* Low strike from a crouch. Short, fast, and it goes UNDER things. */
  CROUCH: swing(0.10, 0.08, 0.20, 68, 12, { height: 22, up: 4, knock: 90, low: true }),

  /* Overhead arc — the answer to anything with wings. */
  UP: swing(0.11, 0.09, 0.22, 40, 13, { height: 62, up: 74, knock: 120, up_strike: true }),

  /* In the air, horizontal. Cancels the moment you touch ground. */
  AIR: swing(0.08, 0.08, 0.16, 70, 12, { height: 32, up: 20, knock: 110 }),

  /* Straight down. Holds its hitbox until it connects or you land. On a hit it
   * bounces you and refunds the air attack, so it chains. */
  DOWN: swing(0.10, 0.42, 0.12, 20, 14, {
    height: 46, down: true, knock: 60,
    BOUNCE_V: 336,
    BOUNCE_V_HELD: 400,   // holding jump at the moment of impact bounces higher
  }),

  /* Full resonance turns the next connecting strike into a Sunstrike. */
  SUNSTRIKE_MULT: 2.6,
  SUNSTRIKE_REACH: 1.35,
};

/* Resonance: four pips. Perfect steps fill it fastest, ordinary hits slowly. */
export const RESONANCE = {
  MAX: 4,
  PER_PERFECT_STEP: 1,
  HITS_PER_PIP: 6,
  DECAY_AFTER: 9.0,   // seconds of not hitting anything before a pip drains
  DECAY_EVERY: 2.4,
};

/* Chain counter — the score/flow read-out, not a mechanic gate. */
export const CHAIN = { WINDOW: 2.6 };

/* ------------------------------------------------------------------ *
 * CAMERA
 * ------------------------------------------------------------------ */
export const CAM = {
  /* Sabine sits left-of-centre when running right, so you see where you are
   * going. The dead zone stops micro-jitter from small movements. */
  LOOK_AHEAD: 96,
  LOOK_LERP: 3.2,
  DEAD_X: 18,
  DEAD_Y: 26,
  FOLLOW_X: 7.5,
  FOLLOW_Y: 5.2,
  /* Y is snapped to the grounded height so falling does not swing the camera. */
  GROUND_BIAS: 0.42,
  SHAKE_DECAY: 6.5,
  MAX_SHAKE: 14,
};

/* ------------------------------------------------------------------ *
 * SIMULATION
 * ------------------------------------------------------------------ */
export const SIM = {
  STEP: 1 / 120,       // fixed timestep; input edges clear inside the step loop
  MAX_FRAME: 0.05,
  HITSTOP_LIGHT: 0.035,
  HITSTOP_HEAVY: 0.085,
  HITSTOP_KILL: 0.11,
};

/* ------------------------------------------------------------------ *
 * ENEMY FAIRNESS FLOOR
 *
 * No attack may become dangerous faster than a human can answer it. The
 * autotest asserts against these; they are not decoration.
 * ------------------------------------------------------------------ */
export const FAIR = {
  MIN_TELEGRAPH: 0.34,        // ground contact attacks
  MIN_TELEGRAPH_RANGED: 0.42, // projectiles
  MIN_RECOVERY: 0.30,         // every attack leaves a punish window
};
