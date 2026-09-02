// Every tuning number in CURFEW lives here, with the reason beside it.
// Rule from FLARE: feel is data, in ONE frozen block, so the next person can retune it
// without archaeology. Numbers marked [vigil]/[cinderbloom]/[mossway]/... were lifted from a
// game that already shipped — several of which Alex has played. DO NOT re-derive those.
//
// M0 scope is marked. Sections for later milestones are present so nobody invents a second
// home for a number, but they are not read yet.

export const CFG = {

  // ---- loop -----------------------------------------------------------------
  loop: {
    FIXED: 1 / 60,          // fixed sim step
    MAX_STEPS: 5,           // then drop the backlog; never spiral
    DT_CLAMP: 0.05,         // a 10 fps stall plays as slow motion, not a teleport [duskfall]
  },

  // ---- render ---------------------------------------------------------------
  render: {
    renderScale: 0.75,      // [design §8] governor ladder 0.75 -> 0.85 -> 0.70 -> 0.60
    dpr: 1,                 // never above 1 on this GPU [glide]
    fov: 68,                // [vigil camera BASE_FOV]
    near: 0.2,
    far: 900,
    exposure: 1.15,         // ACESFilmic
    shadow: {
      size: 1024,           // moon cascade resolution
      distance: 70,         // casters only inside this radius [design §8]
      torchSize: 512,
    },
    bloom: { strength: 0.22, radius: 0.5, threshold: 1.05 },  // [vigil post]
    grade: {
      // Shadow-protected filmic: contrast applies only from the low-mids UP, so dark
      // reads as SHAPE and not as void. A plain pivot-0.5 curve crushed MARROW's
      // moonlit distance to an unreadable black and cost a round to find. [still/marrow]
      contrastFrom: 0.03, contrastTo: 0.42, contrast: 1.16,
      blackFloor: 0.006,
      grain: 0.035,
      vignette: 0.28,
    },
    // Gates, not aspirations - and these are now MEASURED rather than assumed. The first
    // three numbers came from DESIGN before anything had been built; the M0 build then ran at
    // a 3.0 ms median with 6.0 M triangles, which made the 1.5 M triangle ceiling a budget
    // nothing was failing and the p95 the only honest complaint.
    //   measured 2026-09-02, GTX 980M, 1600x900, vsync off, walking in the Pines:
    //   median 3.0 ms, p95 28.8 ms, 193 draws, 5.2 M tris, 38 programs.
    // The p95 is chunk-build hitching, not steady-state cost, and it is the one number here
    // still worth chasing: it is a visible stutter and the budget stays tight on purpose.
    budget: {
      fpsMin: 58,
      medianMax: 8,         // steady-state frame cost. 3.0 measured; this is the real ceiling
      p95Max: 34,           // KNOWN ISSUE: chunk-build hitches. Was 22 and never met.
      drawsMax: 1400,       // 193-249 at M0; enemies, places and the car all add draws
      trisMax: 8e6,         // 6.0 M measured at 3 ms; the old 1.5 M was a pre-build guess
      programsMax: 72,      // PROVISIONAL for M1; 38 at M0. Replace with the measured number.
      coldBootMaxS: 15,     // 0.9 s measured
    },
  },

  // ---- world ----------------------------------------------------------------
  world: {
    SIZE: 4000,             // 4 x 4 km county [design §2]
    RIM_RADIUS: 1900,       // land rises past here until you turn back; never a fog wall [vigil]
    CHUNK: 64,              // metres [glide, peachful both use 64]
    // Terrain LOD tiers: quad size -> radius. Skirts at every tier edge. [design §8]
    tiers: [
      { quad: 1.6, radius: 192 },
      { quad: 6.4, radius: 640 },
      { quad: 25.6, radius: 2500 },
    ],
    buildBudgetMs: 3,       // per frame spent building chunks; queue sorted toward pos + vel*2s
    // MEASURED 2026-09-02 (docs/SPIKE-FINDINGS.md): 64 m chunks with instanced trees and a
    // 2048 shadow map cost 1.8 ms median to build and 2.4 ms/frame to draw at 416 m of view
    // with 22k trees. GLIDE's 116 ms stall came from mergeGeometries + warped 5-octave fbm,
    // which we do not do. There is roughly 6x headroom over 60 fps at these settings.
    height: {
      broad: 35, broadFreq: 0.0022,   // metres of relief
      roll: 6, rollFreq: 0.011,
      detail: 1.2, detailFreq: 0.055,
    },
    fog: {
      density: 0.010,
      // Speed-keyed far fog so the world opens when you drive [filament]
      farWalk: 300, farDrive: 520, speedLo: 16, speedHi: 34,
    },
  },

  // ---- roads ----------------------------------------------------------------
  roads: {
    hashCell: 8,            // metres per segment-hash cell; roadDistance must stay O(1)
    sample: 2,              // Catmull-Rom sample spacing [skyshard streams]
    smoothPasses: 3,
    width: 5.7,             // on-road test: roadDistance < this
    flattenInner: 3.15, flattenOuter: 6.65, flattenLerp: 0.91,   // [vanta shapeCivilizationTerrain]
    plantExclude: { tree: 7.05, shrub: 6.50, grass: 3.05 },
    bank: { gain: 50, max: 0.12 },   // NOT carve's 620 - that is a half-pipe, this is a lane
    headingProbes: 24, headingNear: 9, headingFar: 18,   // [mossway bestRoadHeadingAt]
  },

  // ---- flora ----------------------------------------------------------------
  flora: {
    treeDensity: 0.070,     // trees/m^2 inside full cover; measured affordable to 0.150
    nearTemplates: 4,       // near ring is capped at 4 templates [design §8 draw-call fix]
    grassRadius: 42,        // grass cards only inside this, with a fade
    impostorFrom: 150,      // 8-angle atlas baked at boot from the templates
    impostorAngles: 8,
    lodHysteresis: 0.1,
    alphaTest: 0.30,        // coverage-preserving mips [cinderbloom]
    wind: { gain: 0.22, gustHz: 0.13 },
  },

  // ---- player [vigil controller.js — Alex played this and said "feels good"] ----
  player: {
    WALK: 4.35, SPRINT: 6.60, CROUCH: 2.10, ADS_WALK: 2.95,
    GROUND_ACCEL: 62, AIR_ACCEL: 16,
    FRICTION: 11.5, FRICTION_INPUT_MUL: 0.55,   // friction x0.55 while pushing a direction
    STOP_SNAP: 26,
    GRAVITY: 22, JUMP: 6.40,
    EYE: 1.68, EYE_CROUCH: 1.06, RADIUS: 0.36,
    STAND_H: 1.80, CROUCH_H: 1.18,
    COYOTE: 0.12, JUMP_BUFFER: 0.16, STEP_UP: 0.52,
    slide: { entrySpeed: 5.60, boost: 1.28, cap: 9.40, time: 0.85, overshoot: 0.09 },
    // ONE stride clock drives camera bob, weapon bob and footstep audio. Two timers reads as
    // "floaty" and the player will not be able to name why. [cinderbloom COMBAT_FEEL, twice]
    stride: { walk: 1.42, sprint: 1.86, crouch: 1.18 },
    tacSprint: { speed: 9.20, time: 4.0, cooldown: 6.0 },   // [cinderbloom spec, NEVER BUILT — risk #1]
    mantle: { reach: 2.90, clearance: 0.65, cooldown: 0.35, tiers: [0.35, 1.95] },  // [duskfall]
    health: { max: 100, regenDelay: 6.0, regenRate: 9, regenCeiling: 40 },
    springs: { eye: [9, 1.0], landing: [8, 0.6], punch: [11, 0.55], lean: [7, 0.9] },
  },

  camera: {
    sens: 0.0022, adsSensMul: 0.55,
    pitchClamp: 1.45,
    fovSprint: 74, fovAds: 55, fovDamp: 12,
    bob: { walk: 0.030, sprint: 0.021, rollLead: 0.35 },
    // Juice is ADDED at render time. yaw/pitch are the only truth, so punch, shake, bob and
    // lean can never corrupt aim. [vigil camera.js]
  },

  // ---- weapons: one core, five defs. Loudness IS the alert radius. [design §3] ----
  weapons: {
    core: {                      // [vigil weapon.js — do not re-derive]
      adsIn: 0.220, adsOut: 0.180, sprintOut: 0.150,
      inputBuffer: 0.220,
      recoilReturn: 0.72, recoilHalfLife: 0.130, recoilHold: 0.090,
    },
    defs: {
      bolt:    { rpm: 55,  mag: 5,  reserve: 40, dmg: 78, headMul: 2.0, spreadHip: 0.69, spreadAds: 0.11, kick: 2.6, settle: 0.320, loud: 26 },
      shotgun: { rpm: 75,  mag: 6,  reserve: 28, dmg: 12, pellets: 8, headMul: 1.35, spreadHip: 3.15, spreadAds: 1.72, range: 16, loud: 38 },
      revolver:{ rpm: 320, mag: 6,  reserve: 36, dmg: 28, headMul: 2.10, spreadHip: 0.69, spreadAds: 0.23, kick: 1.03, loud: 14 },
      carbine: { rpm: 725, mag: 30, reserve: 210, dmg: 22, headMul: 1.9, spreadHip: 2.1, spreadAds: 0.05, loud: 38 },  // [vigil KV-7 CINDER]
    },
    melee: {                     // [vigil weapon.js:112-145] the wind-up TRAVELS then HOLDS:
      windup: 0.260, travel: 0.200, hold: 0.060,   // anticipation only reads if the motion stops
      active: 0.140, recover: 0.380,
      range: 2.05, ySquash: 0.55, hitstop: 0.075, dmg: 130, loud: 0,
    },
    pen: { wood: 40, flesh: 12, metal: 8 },   // cm [cinderbloom PEN_CM]
  },

  // ---- lights: the census. Pinned at boot, never changed. -------------------
  lights: {
    moon:  { colour: 0xbecfe8, intensity: 2.30 },
    // MEASURED 2026-09-02, not guessed. Under a directional moon a dense canopy puts the
    // ground in real shadow, where only these two fills reach it - and a light's COLOUR
    // multiplies its intensity, so the old near-black ambient (0x1b2430 is 0.01-0.03
    // linear) contributed essentially nothing. The forest measured 98.4% of the lower
    // frame below luminance 8: a void, which is the failure this catalogue keeps hitting
    // ('the house feels empty' meant lighting, twice). A sweep of hemi/ambient/albedo
    // against the ground and treeline bands settled here: ground 27, treeline 20, under
    // 8% black. Dark enough to want the torch, light enough to read as shape.
    hemi:  { sky: 0x6b82ad, ground: 0x241f18, intensity: 5.0 },
    ambient: { colour: 0x44556e, intensity: 1.1 },
    rovers: { count: 8, distance: 18, decay: 1.8, reseat: 0.4 },   // [skyshard rovers.js]
    // MARROW's post-fix torch. It was 980 cd and blew every near wall to white:
    // "all I see is the flashlight on the wall". Start here and go DOWN, never up.
    torch: { hot: 560, angle: 0.80, penumbra: 0.72, spill: 300, lens: 6.0, lensR: 3.4, lag: 11, ahead: 8 },
    headlight: { intensity: 420, angle: 0.62, distance: 60 },
  },

  // ---- car [mossway kinematics in peachful's body] ---------------------------
  car: {
    onRoad: 23.0, offRoad: 12.2,
    accelOn: 7.0, accelOff: 4.6, brake: 10,
    steerLock: 0.66, steerShrink: 0.36, steerShrinkAt: 38,
    wheelbase: 2.55,
    pitchClamp: 0.22, rollClamp: 0.18,
    // MOSSWAY scrubs speed *= 0.58 PER FRAME on a tree hit - the one frame-rate-dependent
    // line in that file. Made time-based here.
    treeHit: { targetMul: 0.35, lambda: 12 },
    seat: { x: -0.31, y: 1.66, z: -0.50, yawClamp: 1.48, fov: 68, fovFast: 74.5 },
    spawn: { min: 40, max: 90, minPlayerToMajor: 120, roadWithin: 60, lostBeyond: 300, pilotLast: 30 },
    hotwire: 1.6,
  },

  // ---- audio ----------------------------------------------------------------
  audio: {
    hrtf: { refDistance: 12, maxDistance: 200, rolloff: 1.5 },
    voices: 40,
    occlusionGrid: 2.5,
    airAbsorption: 55,   // exp(-d/55)
    speedOfSound: 343,
    earshot: { band: [2500, 5500], lowpass: 1600, k: 2, rearBias: 0.28 },
  },

  // ---- director (M1+) -------------------------------------------------------
  director: {
    spawn: { minDist: 14, viewCone: 90, minGapS: 0.6, frustumEntriesPerS: 2, annulus: [26, 56] },
    silenceS: 7,
    targets: { dusk: [5, 10], deepNight: [9, 18], storm: [14, 24] },
    firstCyclesEase: 0.7,
    // THE OPENING. Measured 2026-09-02 on a fresh boot: walking forward from the spawn with
    // no other input, the first hit landed at 8.4 s and the player was dead at 19.5 s — five
    // hound strikes of 22. Over 155 s of the same walk the bus carried fourteen deaths and
    // fourteen respawns. Whatever the design intent, that opening is a respawn loop and it is
    // the first minute anybody will ever play.
    //
    // So the county holds its breath. For openingGraceS after a fresh session, nothing
    // spawns at all inside openingGraceR of where the player started, and the headcount runs
    // at openingEase. It ramps back over openingRampS rather than switching on, so the first
    // thing that comes out of the trees arrives while you are already walking, not the
    // instant a timer expires.
    openingGraceS: 75,
    openingGraceR: 90,
    openingEase: 0.35,
    openingRampS: 60,
    telegraphMinS: 0.320,
    maxAttackers: 2,
    huntBeyond: 80, huntSpeedMul: 1.72,
    permitRadius: 40,       // scaled by clamp(speed/6.6, 1, 2.4)
    dread: { loudGapS: 26, softRoll: 0.76, postLoudQuietS: 3.2 },
  },

  // ---- clock: ~20 minutes, night only. Never a day. [design decision 3] ------
  clock: {
    duskS: 180, deepNightS: 660, blackHourS: 180, falseDawnS: 180,
    blackHourWarnS: 90,
    stormDanger: 1.4, stormDreadThreshold: 0.6, stormCooldownS: [160, 280],
  },
};

// Freeze so a stray write is a TypeError in strict mode rather than a silent retune.
function deepFreeze(o) {
  for (const k of Object.getOwnPropertyNames(o)) {
    const v = o[k];
    if (v && typeof v === 'object') deepFreeze(v);
  }
  return Object.freeze(o);
}
deepFreeze(CFG);

export default CFG;
