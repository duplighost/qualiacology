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
      // MEASURED 2026-09-03, GTX 980M, 1600x900, on the merged round-5 tree. The count is
      // 74 at the end of warm() and it is STILL 74 in every state the game reaches: on foot,
      // after streaming new chunks, with all four weapons owned / drawn / aimed / fired, at a
      // claimed and lit place, in the black hour, with 12 bodies out, with the car placed,
      // entered and driven, and with the pause card up. It does not move once, which is the
      // law this budget exists to serve (tests/car.mjs asserts it across a 20 s drive;
      // tests/sites.mjs across nine states including the county's west side). 72 was the
      // provisional M1 guess and it went RED the moment lane D's car.warmup() moved the
      // car's shadow-depth variants from "links when the car first appears" (a law break)
      // to "linked at boot" (what the boot shell is for). 78 = the measured 74 plus four,
      // which is one new material family of headroom and not a licence for six.
      programsMax: 78,
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
    // ROUND 6, lane F. Alex: "The woods hardly has anything in it." Four instanced
    // understory templates planted by the same loop as the trees, one InstancedMesh per
    // KIND per chunk (never per variant), materialised with the near ring and dropped with
    // it, so the near-ring draw bill grows by at most four per chunk. Densities are per
    // terrain region (pines / fields / marsh / ridge, the order of terrain.REGIONS) and are
    // multiplied by the cover field, so a stand of pines is thick with fern and a clearing
    // is not. Everything with a top you can stand on emits a standable collider in the loop.
    understory: {
      fernCell: 2.4,                       // m; one candidate per cell
      fernAccept: [0.78, 0.20, 0.44, 0.26],
      fernSize: [0.7, 1.15],               // m across, the brief's range
      fernRadius: 42,                      // m; fern cards live under the grass rule (grassRadius 42), not the near ring: MEASURED, the near ring reaches dMin 45 so 60 hid nothing
      logCell: 9.0,
      logAccept: [0.42, 0.14, 0.24, 0.16],
      logLength: [3.0, 7.0],
      logRadius: [0.20, 0.29],             // top <= STEP_UP + tolerance: you walk onto it
      stumpCell: 8.0,
      stumpAccept: [0.30, 0.22, 0.12, 0.10],
      stumpHeight: [0.35, 0.60],
      boulderCell: 7.0,
      boulderAccept: [0.08, 0.05, 0.03, 0.55],   // ridge ground is where the rock is
      boulderSize: [0.8, 2.4],
      siteClear: 5.5,                      // m; none of it on a road-side minor's pad
      // ms a step for planting the understory OFF the chunk:built frame, net of what the
      // frame's chunk builds already took (flora.js _plantPending). MEASURED 2026-09-03:
      // planted inside the build, a chunk cost 8.3 ms median against master's 2.6.
      budgetMs: 1.5,
    },
  },

  // ---- wilds (ROUND 6, lane F): the off-road county ---------------------------
  // Alex: "There should be those things from dying light 2 in the vehicle expansion where
  // there are the wooden places you can climb up in the wilderness... cool items on the
  // map more. Extra xp." One site per ~280 m cell where one fits, planned from one seeded
  // stream, streamed with the chunk ring, every platform standable, every cache one-shot.
  wilds: {
    cell: 280,              // m; the planning grid. 120 cells inside the county, ~118 fit
    maxRadius: 1750,        // m from the centre; past this the rim fence is rising
    roadClear: 60,          // m from any centreline
    majorClear: 120,        // m from any major
    slopeMax: 0.25,
    waterY: 1.5,            // the reservoir bed is -4.7; below this is water
    separation: 110,        // m between any two sites (cells are 280, so this only bites at seams)
    towerApart: 420,        // m between two lookout towers
    // per-kind quotas, in the order they are served from the shuffled cell list
    counts: { tower: 13, stand: 27, ruin: 18, wreck: 28, camp: 28 },
    cacheChance: { tower: 1.0, stand: 0.5, ruin: 0.34, wreck: 0.30, camp: 0.30 },
    buildWithin: 220,       // m; a site's body streams in inside this ...
    disposeBeyond: 264,     // ... and out past this (hysteresis, so a boundary cannot thrash)
    foundR: 20,             // wild:found on the first approach inside this
    cacheR: 1.15,           // a cache is TAKEN by walking into it
    xp: { found: 40, climbed: 100, cache: [120, 220] },   // DESIGN section 6; cache is region-scaled
    ammo: [12, 24],         // pickup:ammo {n}
    // a tower is 6 or 7 flights of (landing + 5 treads + landing) at 0.42 a tread, i.e.
    // 12.6 or 14.7 m to the platform plus a 2.35 m roof and a lantern mast: 17.0 / 19.1 m
    // to the lantern. Towers are dealt to the HIGHEST kept cells first, in a 20 m clearing,
    // so the platform looks over the canopy of the ground below it rather than into it.
    tower: { flights: [6, 7], rise: 0.42, tread: 0.55, width: 0.92 },
    // rise 0.42 like the tower's (was 0.45): the rungs now climb from the ground at the
    // stair's foot, which the detail octave puts up to 1.2 m under the pad, and 0.42 keeps
    // a tenth of a metre under STEP_UP for the ground's own bumps on the approach.
    stand: { height: [4.0, 5.0], rise: 0.42, run: 0.36 },
    horizonLanterns: 3,     // the nearest towers' lanterns are never distance-culled
    // the halo: a lantern's depth-free glint, hidden inside 'from' (no X-ray of the trunk
    // beside you), full size by 'full', then scaled by d / scaleAt so it holds its pixels
    // with distance. MEASURED: the depth-tested lantern is 0 px from 150 m with the forest
    // in (wilds.js _ensureBuilt); 'scaleAt' 80 puts ~2 m of pane at 150 m.
    halo: { from: 45, full: 90, scaleAt: 80 },
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
    // ROUND 6 (2026-09-03), Alex, fifth playtest: "I'm not sure why I can't climb up stuff
    // either. That would be fun. Like dying light style parkour stuff." The mantle above is
    // DUSKFALL's terrain pop and is unchanged; a COLLIDER top (crate, wall, roof, fence, car)
    // is climbed kinematically by controller.js _tryClimb: a GRAB from the air (catch, hang,
    // pull), a MANTLE from the ground (pull), a VAULT at a sprint (over, no jump press).
    // Every number here is measured in tests/climb.mjs.
    climb: {
      handsLo: 0.40, handsHi: 0.50,          // the grab band on the EYE: eyeY - 0.40 .. eyeY + 0.50 (+ what 'Reach' adds)
      catchS: 0.10, hangS: 0.12, pullS: 0.50, // the grab: ease to the hang pose, hang, pull up
      // The EYE hangs between these two distances UNDER the lip, moving as little as it can
      // from where the hands closed: arms at full stretch is 0.50, a chin-up is 0.10. A hang
      // with the eye ABOVE the lip read as a hop (tests/shots, the first hang PNG).
      hangEyeBelow: [0.10, 0.50],
      pullMinS: 0.34, pullMaxS: 0.70,         // a ground mantle's pull, at 1.0 m .. 2.9 m of rise
      vault: { lo: 0.60, hi: 1.20, maxThick: 1.40, time: 0.32, keep: 0.85 },
      outSpeed: 1.6,                          // m/s carried over the lip at the end
      landSpeed: 2.2,                         // the soft landing every climb ends with (no fall damage possible)
    },
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
    hemi:  { sky: 0x6b82ad, ground: 0x241f18, intensity: 6.8 },
    ambient: { colour: 0x44556e, intensity: 1.55 },
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
    // ROUND 5 — Alex, fourth playtest: "The car needs better control. I'd like to be able to
    // take turns down smaller roads filled with trees and have the driving be really easy and
    // responsive." MOSSWAY's steerLock 0.66 / steerShrink 0.36 at 38 / effect
    // 0.045*v/(1+0.018*v) was tuned for MOSSWAY's wide loop: measured through the real
    // integrator on master 24d5101 (tests/car.mjs, 2026-09-03, wheel at full lock, speed
    // held) the turning radius was 50 m at 8 m/s, 55 m at 10, 61 m at 12, 68 m at 15 and
    // 75 m at 22 — a 90 degree turn in 8.7 s at 10 m/s, and no forest spur can be taken at
    // that radius. Now a bicycle model whose full-lock radius is a function of speed:
    //   R(v) = rMin + rCubic * v^3      lock(v) = atan(wheelbase / R(v))
    //   yaw rate = v * tan(steer) / wheelbase
    // so the wheel angle the wheels are DRAWN at is the one the kinematics use. Measured
    // after (same suite, same road): 9.2 m at 8 m/s, 10.6 at 10, 12.7 at 12, 17.5 at 15,
    // 38.7 at 22, 43.1 at 23. The band Alex asked for (8-15 m/s) turns inside 18 m — a 90
    // degree turn in 1.7 s — and the cap is not a hairpin. The caps above are DESIGN
    // numbers and are untouched.
    turn: { rMin: 7.5, rCubic: 0.00284 },
    wheelbase: 2.55,
    pitchClamp: 0.22, rollClamp: 0.18,
    // MOSSWAY scrubs speed *= 0.58 PER FRAME on a tree hit - the one frame-rate-dependent
    // line in that file. Made time-based here. ROUND 5: the scrub scales with how square-on
    // the contact is — a head-on trunk still damps toward targetMul, a graze along the
    // flank damps toward 1 - (1 - targetMul) * glance, so threading trees costs a brush and
    // not a crash. Measured at 6 m/s, no throttle, a trunk 1.15 m off the spine (tests/car.mjs):
    // the graze kept 1.34 m/s before and keeps 2.61 after (3.59 with no trunk at all); a
    // head-on still stops the car at 6.4 m. The gain is confined to the outer ~0.3 m of the
    // 1.32 m contact radius when coasting (0.5 m off: 0.39 m/s; 0.8 m: 0.94; 1.0 m: 1.85).
    treeHit: { targetMul: 0.35, lambda: 12, glance: 0.12 },
    seat: { x: -0.31, y: 1.66, z: -0.50, yawClamp: 1.48, fov: 68, fovFast: 74.5 },
    spawn: { min: 40, max: 90, minPlayerToMajor: 120, roadWithin: 60, lostBeyond: 300, pilotLast: 30 },
    hotwire: 1.6,
    // ROUND 6 — Alex, fifth playtest: "I want to be able to hit the mobsters." The base ram is
    // the car's (DESIGN section 3) and needs no node: at >= `speed`, enemies.ramHit runs and the
    // car scrubs a fraction of its speed per body it hit, keyed to def.mass — scrubLight at
    // massLight (a hound, 46) rising to scrubHeavy at massHeavy (a pallbearer, 210); a Hunter
    // (150) prices at 0.28 between them. keepFloor is the least of its speed a ram can leave
    // the car with, so no ram stops it dead, and nothing about a ram touches the heading. The
    // WHEEL 'Ram' node (hook 'ramClean') makes a hit at >= cleanSpeed cost NO speed: the clean
    // pop. Measured through the real integrator (tests/car.mjs, 2026-09-03): one hound at
    // 12 m/s leaves 10.2 m/s and 0.0 degrees of heading change.
    ram: { speed: 8.0, cleanSpeed: 12.0, scrubLight: 0.15, scrubHeavy: 0.35, massLight: 46, massHeavy: 210, keepFloor: 0.40 },
    // "It's not super smooth." Full throttle into a trunk used to grind at ~0.7 m/s for ever
    // (round 5's D report): the throttle and the head-on scrub balanced there, the slide-off
    // nudge was scaled by speed / 14 (5% of itself at 0.7 m/s), and dead head-on its choice of
    // side flipped with float noise every step. Now the side is chosen once per contact and
    // kept, and the time spent under stuckSpeed with the throttle held and bark in contact
    // ramps the nudge's gain to stuckGain over stuckRamp seconds — capped there, because the
    // full rate is a 5 rad/s spin and the view rides the nose. Measured (tests/car.mjs): from
    // a dead stop against a 0.3 m trunk, full throttle is free of it inside 1.5 s.
    trunk: { stuckSpeed: 2.5, stuckRamp: 0.50, stuckGain: 0.45 },
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
    // ROUND 6 (playtest 5, 2026-09-03): HALVED. Alex, twice in one message: "There are
    // wayyyy too many" and "the biggest problem we have is the enemies. There's too many.
    // Very quickly they accumulate and just follow you everywhere." Were dusk [5, 10],
    // night [9, 18], storm [14, 24]. Head units, hounds count 0.5: dusk 2.5 is five dogs.
    targets: { dusk: [2.5, 5], deepNight: [4.5, 8], storm: [7, 11] },
    // and the hard ceiling on live pressure bodies at ANY distance (was 26 in enemies.js).
    aliveMax: 14,
    // ARRIVAL. No more than maxBodies bodies may arrive inside any windowS seconds outside
    // the black hour (blackMaxBodies inside it). A pack assembles; it never lands. Measured
    // before this existed: five hounds in 0.6 s (tools/arrivals.mjs, docs/NEXT.md 4a).
    arrival: { windowS: 6, maxBodies: 2, blackMaxBodies: 4 },
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
    openingRampS: 150,      // ROUND 6: was 60. The county comes back over two and a half minutes,
                            // and a death re-arms the same grace and the same ramp (director.js).
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
