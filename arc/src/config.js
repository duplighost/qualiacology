// ARC — every feel number lives here, with its WHY. Nothing else holds a tuning constant.
// Units: metres, seconds, radians. Water is y = 0. Up is +y.

export const CFG = Object.freeze({
  version: '0.1.0',

  world: Object.freeze({
    waterY: 0,
    // Rider gravity is high on purpose: a skater should feel heavy and land quickly
    // (SPACEBOARDING's pops read as air because the fall is fast, not because it is long).
    gravity: 22,
    fog: 0x1a2050,
    fogDensity: 0.0038,
    sky: 0x0b1030,
    moonDir: [-0.45, 0.62, -0.64],
  }),

  rider: Object.freeze({
    walkSpeed: 9,        // skating on a roof. Slow on purpose: the rail is where speed lives.
    walkAccel: 42,
    friction: 11,
    jumpV: 8,            // a hop, not a leap: 1.45 m at g 22. Roofs 15 m apart need the swift.
    airControl: 9,       // small steering force in the air; never enough to fix a bad throw
    airDrag: 0.015,
    stepUp: 0.6,         // you can roll over a parapet
    radius: 0.42,
    eyeHeight: 1.55,
    handHeight: 1.1,     // where the swift sits and where the rail starts
    coyote: 0.1,
  }),

  rail: Object.freeze({
    magnet: 1.6,         // latch distance from the rail line
    latchBlend: 0.12,    // position/velocity blend, never a snap (SPACEBOARDING soak lesson)
    floor: 20,           // entry speed is never lower than this: a rail never costs speed
    latchRise: 0.22,     // the floor ARRIVES over this long after a latch (2.5 -> 20 in one tick was a snap)
    maxTurnRate: 6.5,    // rad/s cap on the facing while the latch pulls it onto the tangent (uncapped measured 10.4)
    cap: 48,
    gRail: 12,           // along-rail gravity. Down pays 1.4x, up costs 0.7x: arcs bank speed.
    downMult: 1.4,
    upMult: 0.5,         // uphill costs half: a walk-on rail can climb ~30 m and still arrive above dash.minSpeed
    regrabLock: 0.5,     // LIFT's anti-ping-pong rule
    popV: 14,            // Space on a rail: 1.27 s of air at g 22
    unlatchableStart: 3, // the first metres of a fresh rail cannot grab a standing thrower
    tuckAccel: 4,        // W on a rail: a visible tuck, a little more speed
    dragDecel: 16,       // S on a rail: foot down, sparks, slower (to aim a throw)
    width: 0.55,
    ridePointSpacing: 0.5,
    emberFloor: 14,      // ember-lines are memory and a slow shortcut, not an economy
  }),

  throw: Object.freeze({
    chargeTime: 0.55,
    gather: 0.2,         // the swift winds up before it leaves the hand: a rise, not an impulse
    vMin: 24,            // flat from a roof at 9 m: ~35 m at charge 0, ~64 m full. Aimed up 25 deg and full: ~108 m, cresting at 30 m.
    vMax: 46,
    gravity: 9,          // the swift falls slower than the rider: its arc hangs
    bendRate: 0.15,      // rad/s the flight bends toward the aim. At 0.55 the road was a straight line (range = maxFlight x speed); at 0.15 it is an arc under gravity that the mouse can nudge.
    maxFlight: 2.6,      // after this it hangs where it is. Every throw is ridable.
    hangHeight: 0.8,     // a throw that would end in water hangs this far above it
    inherit: 1.0,        // the throw inherits the rider's velocity fully: speed makes range
    minSpeedFloor: 6,    // never slower than this even when thrown backwards off a fast rail
  }),

  recall: Object.freeze({
    alongSpeed: 64,      // along the rail: an 80 m rail collapses in 1.25 s, visible
    alongMult: 1.6,      // or 1.6x the rider's speed, whichever is more
    straightFloor: 36,   // KICKMOON's return law when it is not coming along a rail
    straightCap: 98,
    straightBend: 15,
    earlySpeed: 90,      // called mid-flight: whips back, tail collapses
    giveUp: 8,           // stand still this long and it comes home on its own, slowly
    giveUpSpeed: 20,
    catchRadius: 1.5,
    aimAlign: 0.3,       // the last 0.3 s of the return line up with the aim
    frontBoost: 1.8,     // the collapse front's brightness over the rail's
    roadDim: 0.06,       // the doomed road dims to this while the front runs: the rail's core clips on screen, so the bead needs headroom (measured 0.10 -> 1.92:1)
  }),

  dash: Object.freeze({
    minSpeed: 12,        // below this a catch is a soft catch: chord only, no fling
    mult: 1.15,
    eatenBonus: 0.14,    // + per metre of rail eaten on the way back: a long throw is a bigger fling (80 m eaten = +11 m/s)
    min: 24,             // the floor was 30 and pinned 17 of 18 hops; 24 lets riding faster matter
    max: 52,
    rise: 0.18,          // the speed ARRIVES over this long; you can watch it (SPACEBOARDING rounds 5-7)
    halfGravity: 0.4,
    fovPunch: 12,
    fovDecay: 0.6,
    trauma: 0.35,
    lanternRadius: 8,    // passing this close to a boss lantern while dashing snuffs it (the dash blends from the rail direction over 0.18 s and drops ~1.7 m, so a crosshair ON the lantern passes ~8 m from it)
    duration: 0.55,      // how long the "dashing" state (the attack) lasts
  }),

  fail: Object.freeze({
    freeze: 0.15,        // SUMI's blot: the world stops, the music cuts
    dip: 0.9,            // the swift dives, drags you to the last roof
    waterDepth: 0.25,
  }),

  camera: Object.freeze({
    back: 5.6,
    up: 2.2,
    shoulder: 1.15,      // lateral offset (right) so the road ahead reads past the rider's body
    fov: 62,
    lag: 0.12,
    railEase: 0.25,      // yaw eases onto the rail tangent so the arc's shape reads
    railFollow: 2.2,     // rate at which the rail keeps pulling the yaw while riding
    dashPull: 8.2,
    sens: 0.0021,
    pitchMin: -1.15,
    pitchMax: 0.95,
    minY: 0.7,
  }),

  swift: Object.freeze({
    lightIntensity: 36,  // physical units: the only warm light in the valley (60 bloomed the rider into one blob with the swift)
    lightDistance: 46,
    chirpEvery: 1.3,
    hzPerched: 1180,
    hzReturning: 760,
    hzFlight: 980,
  }),

  music: Object.freeze({
    bpm: 108,
    layersAtChain: [0, 2, 4, 6, 8],
  }),

  render: Object.freeze({
    bloomStrength: 0.7,
    bloomRadius: 0.4,
    bloomThreshold: 0.85,
    drawBudget: 250,
    pixelRatioCap: 1.25,
  }),
});
