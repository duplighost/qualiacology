/* Every number that decides how the game feels, in one place.
 *
 * The world is measured in metres and converted once. Physics constants stay
 * in metres so they can be argued about in human units; everything downstream
 * multiplies by PX. */

export const PX = 100;                 // pixels per metre
export const m = (v) => v * PX;

export const C = {
  view: { width: 1600, height: 900 },

  /* --- the kid -------------------------------------------------------- */
  kid: {
    mass: 32,
    height: 1.34,                      // metres
    topSpeed: 7.0,                     // m/s
    accel: 42, airAccel: 19, friction: 34, turnBoost: 1.55,
    gravity: 28,
    jumpV: 8.6,                        // 1.32 m apex, 0.61 s airtime
    cutFactor: 0.45,                   // releasing jump early
    coyote: 0.110,
    buffer: 0.130,
    crouchSpeed: 1.9,
    maxFall: 22,
    stepUp: 0.34,                      // auto-climb this much without a jump
  },

  /* --- the dog -------------------------------------------------------- */
  dog: {
    mass: 38,
    shoulder: 0.72,                    // metres
    topSpeed: 11.4,                    // m/s — never changed by trust
    accel: 52, friction: 26,
    gravity: 28,
    jumpV: 9.4,
    /* How far ahead of the player it likes to be when nothing is calling. */
    comfort: [4.6, 8.6],   // patient / obsessed: how far it will get from you
  },

  /* --- the leash ------------------------------------------------------ */
  /* The whole game is here. A rope only pulls; it never pushes. Gripping
   * shortens it, and a short rope physically cannot let the dog outrun you.
   * That is the theme, and it is arithmetic rather than a coefficient. */
  leash: {
    longRest: 7.5,                     // metres, hand open
    shortRest: 1.45,                   // metres, hand closed
    shortenRate: 7.0,                  // m/s toward short
    lengthenRate: 9.5,                 // m/s back to long
    complianceOpen: 1.6e-6,   // a rope with some give
    complianceShut: 4.0e-8,   // a fist: near rigid
    substeps: 2, iterations: 8,
    maxCorrection: 0.35,               // metres per substep
    velClamp: 30,
    gripGrace: 0.100,                  // a slightly late release still counts
    /* Holding a stopped dog longer than this and it coughs against the collar.
     * Grip has a price, introduced in the same breath as its reward. */
    chokeAfter: 1.20,
    segments: 16,
  },

  /* --- feel ----------------------------------------------------------- */
  feel: {
    hitstopBite: 0.090,
    hitstopStop: 0.070,
    hitstopHold: 0.045,
    hitstopLand: 0.035,
    shakeBite: 0.34,
    shakeStop: 0.26,
  },

  /* --- camera --------------------------------------------------------- */
  /* Frames both bodies. Separation pushes it out, so the picture itself is a
   * tension readout: a held leash pulls the world in close, a loose one opens
   * it up. Nothing is written anywhere; the frame does the telling. */
  cam: {
    zoomNear: 1.02, zoomFar: 0.70,
    sepNear: 2.4, sepFar: 8.2,         // metres
    followRate: 0.0009,
    zoomRate: 0.0055,
    lead: 1.3,                         // metres of look-ahead at top speed
    leadRate: 0.05,
    biasY: -1.75,                      // metres above the kid's feet
  },

  /* --- trust ---------------------------------------------------------- */
  /* Trust never touches speed. It drives look-backs, anticipation, ear and
   * tail carriage, and the ending — everything expressive, nothing physical,
   * so no hidden scalar can ever decide whether a jump clears. */
  trust: {
    start: 0.55,
    /* Trust is a running average, not a total. This is its memory: the
     * fraction of the gap that survives one second, so ~0.984 is about a
     * minute of it. Everything below is a nudge on top of that average. */
    memory: 0.984,
    /* Good and bad moments are seconds of raised or lowered target, never
     * points added to a total. */
    joySeconds: 2.2,                   // reaching the thing it wanted
    hurtSeconds: 2.6,                  // a cough, or a tug against a real want
    syncSeconds: 3.4,                  // jumping together
  },

  /* --- audio ---------------------------------------------------------- */
  audio: { tempo: 92, layerSpeeds: [3.4, 7.0, 9.6] },
};

/* The palette. Value carries every read; hue is decoration on top of it.
 * These are the only colours in the game. */
export const PAL = {
  sun:        '#ffeec2',
  skyHigh:    '#5d8fb8',
  skyLow:     '#f3c58c',
  skyDusk:    '#3c4a72',
  skyDuskLow: '#e88f6a',

  far:        '#a9bccb',
  mid:        '#7d8ea3',
  near:       '#4e5a6b',

  ground:     '#3b414d',
  groundLit:  '#565d6c',
  groundEdge: '#2a2f38',
  grass:      '#4a6046',
  sand:       '#d8bd90',
  sea:        '#3f6f8c',

  kidShirt:   '#e35b45',
  kidLegs:    '#39435c',
  kidSkin:    '#f2d3b4',
  kidHair:    '#4a3a33',

  dogCoat:    '#d1894a',
  dogDark:    '#8e5326',
  dogPale:    '#f4e0c2',

  /* The rope is the brightest line on screen when it matters. */
  rope:       '#fff7e6',
  ropeSlack:  '#463d33',

  dust:       '#d8c6a8',
  shadow:     'rgba(18,20,26,0.34)',
};
