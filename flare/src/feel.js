// FEEL_PROFILE — the one frozen tuning block. CONTRACT §5: never inline a magic
// number at a use site; if you tune a value here, change docs/FEEL.md too.
//
// These numbers are the merge of FLARE's design spec with CINDERBLOOM's
// COMBAT_FEEL bible, adjudicated where they disagreed. The reason for each
// resolution is in docs/FEEL.md and docs/DECISIONS.md — keep the reasons, because
// the reasons are what let the next person retune correctly.

export const FEEL = Object.freeze({
  name: 'flare-core',

  // ---- TIME ---------------------------------------------------------------
  time: Object.freeze({
    fixedDt: 1 / 120,
    maxSubsteps: 10,
    rawDtClamp: 0.05,
    freezeScale: 0.18,          // camera + fx keep integrating during hitstop
    hitStop: Object.freeze({ break: 0.085, hurt: 0.050, graze: 0, locked: 0 }),
    slowmo: Object.freeze({ killWhileSlowed: 0.50, headshot: 0.32, waveClear: 0.18, execute: 0.14, phaseBreak: 0.12 }),
    trauma: Object.freeze({
      kill: 0.10, dashStrike: 0.18, execute: 0.35, bodyCheck: 0.26, bodyCheckHeavy: 0.40,
      bloom: 0.40, bossSlam: 0.60, bossDeath: 0.85, decay: 1.6,
    }),
    shakeYaw: 0.055, shakePitch: 0.040, shakeDecay: 2.8,   // rotational only, amplitude = trauma²
  }),

  // ---- THE ONE LAW --------------------------------------------------------
  // A connecting shot ALWAYS removes at least 1 hp and lights its target for at
  // least 0.35 s. Speed, angle and armour decide how much, never whether.
  // Exempt from prefers-reduced-motion: time and light are information, not motion.
  law: Object.freeze({
    hitLightMin: 0.35,
    lightUp: Object.freeze({
      break: { i: 1.00, hold: 0.50 },
      hurt: { i: 0.70, hold: 0.35 },
      graze: { i: 0.45, hold: 0.35 },
      locked: { i: 0.25, hold: 0.35 },
    }),
    hitFlashMs: 60,
    armourCosMin: 0.5,          // 120° frontal cone; armour halves, never blocks
    ringRadius: Object.freeze({ break: 2.2, hurt: 1.1, graze: 0.5, locked: 0.62 }),
    ringMinAngular: 0.016,      // scale = max(rWorld, dist * this)
    ringPool: 24,
  }),

  // ---- CAMERA -------------------------------------------------------------
  camera: Object.freeze({
    fovWorld: 68, fovAds: 54, fovSprint: 72, fovLambda: 7.5,
    fovView: 48,                // the viewmodel gets its own lens. Aim aligns to the WORLD camera.
    adsMs: 100,
    sensHip: 0.00168, sensAds: 0.00125,
    pitchMin: -1.43, pitchMax: 1.38,
    bob: Object.freeze({
      hzBase: 0.42, hzPerSpeed: 0.135, hzMax: 1.85,
      ay: 0.030, ax: 0.021, roll: 0.95 * Math.PI / 180,
      rollLead: 0.35,           // radians of phase lead — reads as a body, not a dolly
      speedRef: 10.6, speedPow: 0.85,
      adsScale: 0.25, weaponScale: 0.55, weaponLagMs: 42,
    }),
    landingDipPerVy: 0.030, landingDipMax: 0.42,
  }),

  // ---- THE IRIS — the trade ----------------------------------------------
  iris: Object.freeze({
    ceil: 2.60,
    floorBase: 0.15, floorPerLit: 0.20,      // a lit room is a forgiving room
    targetLitAuthority: 1.55, targetMin: 1.05,
    recoveryLambda: 3.2, overshoot: 0.35,
    // gain = max(floor, gain * (1 - stopW * (gain/ceil) * (ads ? .6 : 1)))
    // Multiplicative AND adaptation-scaled: firing dark-adapted costs most (D2).
    adsScale: 0.6,
    bloomSlam: 0.25, dampSlam: 1.50, dampTelegraph: 0.9,
  }),

  // ---- PHOTOSENSITIVITY — SAFETY.md, binding ------------------------------
  safety: Object.freeze({
    burstDecay: 0.55,           // flashGain(n) = 1 / (1 + n * burstDecay)
    burstWindow: 0.45,
    flashLumaDelta: 0.10,       // > this over > 25% of frame counts as a flash
    flashAreaFraction: 0.25,
    maxFlashesPerSecond: 3,
    flashSafeClamp: 0.35,
    enemyPulseHzMax: 3,
    reducedMotionTrauma: 0.30, reducedMotionRingOpacity: 0.4,
  }),

  // ---- WEAPONS ------------------------------------------------------------
  // Every gun wins exactly one column: dps REPEATER, ttk BREACHER, range LANCE,
  // light BREACHER, sustained REPEATER. The draft's LANCE won all five.
  // INVARIANT: for every auto weapon, 60/rpm > staggerTime (0.08).
  weapons: Object.freeze([
    Object.freeze({ id: 'sidearm', name: 'SIDEARM', dmg: 28, headMul: 2.10, rpm: 320, mag: 12, reserve: 96, reload: 1.15, spread: 0.012, adsSpread: 0.004, range: 80, pellets: 1, auto: false, flashI: 2.6, flashR: 9, flashT: 0.055, stopW: 0.30, loudness: 14 }),
    Object.freeze({ id: 'repeater', name: 'REPEATER', dmg: 14, headMul: 1.60, rpm: 720, mag: 32, reserve: 224, reload: 1.45, spread: 0.028, adsSpread: 0.014, range: 55, pellets: 1, auto: true, flashI: 1.5, flashR: 6.5, flashT: 0.035, stopW: 0.22, loudness: 26 }),
    Object.freeze({ id: 'breacher', name: 'BREACHER', dmg: 12, headMul: 1.35, rpm: 75, mag: 6, reserve: 42, reload: 2.10, spread: 0.055, adsSpread: 0.030, range: 16, pellets: 8, auto: false, flashI: 7.5, flashR: 22, flashT: 0.120, stopW: 0.78, loudness: 38 }),
    Object.freeze({ id: 'lance', name: 'LANCE', dmg: 42, headMul: 2.40, rpm: 165, mag: 10, reserve: 60, reload: 1.70, spread: 0.010, adsSpread: 0.002, range: 120, pellets: 1, auto: false, flashI: 3.4, flashR: 12, flashT: 0.070, stopW: 0.34, loudness: 22 }),
  ]),

  fire: Object.freeze({
    buffer: 0.14, maxShotsPerSubstep: 2, dryLockout: 0.18, autoReload: 0.09, tapMax: 0.26,
    firstShotWindow: 0.250,     // after ADS-in completes, shot 1 has exactly zero spread
    bloomHip: 0.0028, bloomHipCap: 0.0227, bloomAds: 0.00021, bloomAdsCap: 0.00157, bloomRecoverDelay: 0.110,
    // The flash must sit at the crown of the barrel, not at a shared guess. One
    // 0.5 m constant across four barrels of 0.30-0.68 m put the flash mid-barrel
    // on the REPEATER and 18 cm behind the LANCE's brake — which is why the flash
    // lifted the gun less than it should: it was lighting the receiver from
    // inside instead of throwing light forward past the muzzle.
    // Values are each weapon's model length (src/weapons/models.js) plus 0.04 m
    // of standoff, so a retuned model moves its own flash.
    // Where each weapon's muzzle ACTUALLY is, along the eye's forward axis:
    //
    //     rig hip z (0.335) + per-weapon hz + model len
    //
    // My first attempt used model length alone and made the SIDEARM worse, not
    // better (x1.25 -> x1.10): the gun's origin is already a third of a metre in
    // front of the eye, so putting the flash at 0.34 m buried it inside the
    // receiver, where the surfaces it should be lighting face away from it.
    // A light close to the eye illuminates less of a barrel than one past its tip,
    // which is why every weapon that moved OUTWARD improved and the only one that
    // moved inward regressed.
    //
    // Numbers from VIEWMODEL.hip.z and VIEWMODEL.shapes[id].{len,hz}; if a model
    // is re-authored these must be re-derived, and the flash-brightening check in
    // tests/weapons.mjs is what will tell you.
    muzzleForward: Object.freeze({ sidearm: 0.67, repeater: 0.86, breacher: 0.75, lance: 1.00 }),
    muzzleRight: 0.2, muzzleDown: 0.12,
    flashGlowScale: 0.15, flashGlowTimeScale: 2.2, flashFalloffEps: 0.35,
    ammoFlashI: [0.42, 0.58], ammoFlashR: [0.55, 0.45],   // flashI *= a + b*magFrac
    reserveNotches: 4,
    footstepLoudnessLit: 5,
  }),

  ads: Object.freeze({ sens: 0.55, move: 0.70, recoil: 0.55, stopW: 0.60 }),

  recoil: Object.freeze({
    pitchFirst: 0.62, pitchSustained: 0.46,   // degrees
    yawPattern: Object.freeze([-0.09, 0.07, 0.11, -0.04, 0.14, 0.02, -0.13, 0.10, 0.16, -0.07, 0.03, 0.12]),
    yawJitter: 0.08,
    holdMs: 90, recoverFraction: 0.72, halfLifeMs: 130,
    viewSpring: Object.freeze({ k: 13, d: 0.42 }),
    weaponSpring: Object.freeze({ k: 16, d: 0.50 }),
    lambdaWeapon: 18, lambdaCamera: 13, lambdaYaw: 15,
    state: Object.freeze({
      hip: [1.00, 1.00, 1.00], ads: [0.86, 0.55, 0.32], crouch: [0.88, 0.90, 0.92],
      airborne: [1.55, 1.40, 1.25], moving: [1.08, 1.05, 1.00],
    }),
  }),

  // ---- MOVEMENT / DASH ----------------------------------------------------
  move: Object.freeze({
    gravity: 18, run: 10.6, groundAccel: 128, airAccel: 88, airCap: 2.2,
    friction: 10.5, stopSpeed: 2.4, jump: 9.8, coyote: 0.14, jumpBuffer: 0.16, jumpCut: 0.0025,
    mantleReach: 2.9, mantleCooldown: 0.35,
    height: 1.72, radius: 0.34, eye: 1.62, maxStep: 0.42, stepTol: 0.08, groundSnap: 0.48,
    maxSlopeCos: 0.682, colliderCell: 8, epsilon: 0.001, maxContacts: 5,
    maxDepen: 1.1, recoveryRadius: 4.5, recoveryStep: 0.45, recoveryAngles: 24,
  }),

  dash: Object.freeze({
    speed: 24.5, airSpeed: 28.0, time: 0.18, airTime: 0.24, cooldown: 0.14, regen: 0.74,
    liftAir: 11.5, hopGround: 3.0, buffer: 0.16, iframeExtra: 0.06, charges: 2,
    damage: 24,                 // D1: a shove, not a weapon. Was 130.
    strikeRadius: 1.7, stopPad: 0.3, stopDot: 0.2, contactGrace: 0.045,
    executeFraction: 0.42,      // of max HP. No absolute floor, no archetype exceptions.
    executeHeal: 18, executeLaunch: 11, executeLaunchY: 5.0,
  }),

  // ---- ENEMIES ------------------------------------------------------------
  enemies: Object.freeze({
    husk: Object.freeze({ hp: 70, speed: 3.6, radius: 0.45, height: 1.70, dmg: 9, fireRate: 1.10, range: 28, prefer: 14, keepOut: 1.80, score: 100, voice: 1.00, telegraph: 0.34, silhouette: 'vertical-bar' }),
    runner: Object.freeze({ hp: 45, speed: 7.2, radius: 0.40, height: 1.45, dmg: 18, fireRate: 0.70, range: 1.6, prefer: 0, keepOut: 1.55, score: 125, voice: 1.70, telegraph: 0.32, melee: true, silhouette: 'low-canted-bar' }),
    lantern: Object.freeze({ hp: 55, speed: 2.8, radius: 0.42, height: 1.75, dmg: 28, fireRate: 1.80, range: 70, prefer: 32, keepOut: 1.95, score: 200, voice: 1.10, telegraph: 0.80, silhouette: 'tall-thin-bar' }),
    warden: Object.freeze({ hp: 220, speed: 2.4, radius: 0.65, height: 2.10, dmg: 14, fireRate: 0.55, range: 35, prefer: 18, keepOut: 2.25, score: 250, voice: 0.55, telegraph: 0.34, armoured: true, silhouette: 'wide-yoke' }),
    bloom: Object.freeze({ hp: 165, speed: 2.7, radius: 0.70, height: 2.20, dmg: 34, fuseRange: 8.5, blastRange: 7.5, keepOut: 2.25, score: 250, voice: 0.75, telegraph: 0.80, silhouette: 'ring' }),
    // Silhouette strips are emissive 0.12-0.18: under the bloom threshold at every
    // gain, so they read as SHAPE not glare, need no external light, and survive
    // greyscale. The draft named silhouette the primary identifier in a game
    // containing no light that could produce one.
    stripEmissive: Object.freeze({ min: 0.12, max: 0.18 }),
    telegraphMin: 0.320,
    flinchBudget: 0.180,
    staggerTime: 0.08, staggerDiminishAfter: 3, staggerDiminishWindow: 1.0,
    healthDuty: Object.freeze({ min: 0.15, max: 0.70, hzBase: 2, hzWounded: 1 }),
    bandAdvance: 3, bandRetreat: 2, retreatScale: 0.85, strafeScale: 0.70,
    fireGateMin: 2, fireJitter: Object.freeze({ base: 0.85, span: 0.30 }),
    losFailCooldown: 0.25,
    // D3 — the reciprocal. Light is a trade, not a reward.
    litAccuracy: 1.40, litSpotRange: 0.90, litReaction: 0.30,
    hunterPressure: 1.4, hunterFrom: 24, hunterSpan: 40, lastHostileAfter: 2.4,
    farTickDistance: 45,
  }),

  // ---- PROJECTILES --------------------------------------------------------
  // SEPARATION RULE: yours is warm, hitscan, gone in 0.35 s. Theirs is cold and
  // TRAVELLING. Motion is the channel — written down so an art pass cannot
  // quietly break it.
  projectiles: Object.freeze({
    bolt: Object.freeze({ radius: 0.30, speed: 28, life: 3.2, glowI: 0.9, glowR: 5.5 }),
    lance: Object.freeze({ radius: 0.22, speed: 40, life: 2.4, glowI: 1.4, glowR: 7 }),
    darkbolt: Object.freeze({ radius: 0.55, speed: 18, life: 4.0, negative: true }),
    cap: 64,                    // REFUSE the newest at cap; a silent drop is a light vanishing
    reflectRadius: 3.2, reflectSpeed: 34,
  }),

  // ---- LIGHT FIELD --------------------------------------------------------
  field: Object.freeze({
    cell: 12, mergeDist: 6, maxScars: 140, vertical: 4.5, totalClamp: 4.0,
    radiusMax: 7.5, intensityMax: 3.0,
    // Authoritative deposit table. The r = 3.4*(0.75+score/400) formula is DELETED:
    // it disagreed with this table for four of six archetypes.
    deposit: Object.freeze({
      husk: [3.4, 1.00], runner: [3.1, 1.25], lantern: [4.1, 2.00],
      warden: [4.8, 2.50], bloom: [4.8, 2.50], dampVent: [7.5, 3.00],
    }),
    mergeGrowth: 0.45,
    // Consumers read lightNorm, not raw illumination: one HUSK scar saturated
    // every consumer in the draft. 0.42 at one scar, 0.75 at four, 0.93 at ten.
    normK: 0.55,
    decalRadiusScale: 1.35, breatheBase: 0.86, breatheAmp: 0.09, breatheHz: 1.6,
    decalFadeFrom: 1.15, decalFadeRange: 55,
    lampIntensity: 2.2, lampRadius: 9,   // FURNACE: permanent:true, breakable, hostile
  }),

  combo: Object.freeze({
    step: 2, perStep: 0.25, max: 4, window: 6.0,   // window was 3.2 — unreachable at ~7 s/kill
    onHitDivide: 2,                                 // was chain := 0, a compounding spiral
    scarIntensityScale: 1.0, scarRadiusBase: 0.85, scarRadiusPerMult: 0.15,
  }),

  // ---- ECONOMY ------------------------------------------------------------
  economy: Object.freeze({
    maxHealth: 100, maxHealthEarly: 75,
    regenDelay: 4, regenRate: 7, regenCap: 32, hitInvuln: 0.4,
    frostPow: 1.2, frostScale: 0.85, frostCrackPer: 20,
    criticalBelow: 25, criticalBase: 0.12, criticalAmp: 0.10, criticalHz: 5.4,
    dropBase: 0.42, dropPerHp: 0.4, dropHpRef: 240,
    dropHurtHealth: 0.62, dropHealthyHealth: 0.24, hurtBelow: 0.60,
    dropHealth: 26, dropAmmoHeld: 0.55, dropAmmoOther: 0.35,
    magnetRadius: 4.6, magnetPull: 18, collectRadius: 1.7, pickupLife: 16, pickupFade: 2.5,
    flares: 2, flaresAfterIntake: 3, flareBurn: 20, flareRadius: 12, flareIntensity: 3.2, flareDraw: 26,
    waveClearHeal: 15, waveClearReserve: 0.20,
  }),

  // ---- AUDIO --------------------------------------------------------------
  audio: Object.freeze({
    sfxLowpassHz: 1600, sfxOrder: 4,      // EARSHOT is wired POST-filter, direct to master
    // Weapon filters are LOWPASS. The draft's "highpass" ladder put every shot in
    // EARSHOT's band — a 200 Hz highpass does not make a shotgun chesty, it
    // removes the chest.
    weaponFilter: Object.freeze({ breacher: 200, lance: 600, sidearm: 900, repeater: 1100 }),
    clickPeak: 0.06,
    punch: Object.freeze({ duckDb: 5, duckAtk: 0.006, duckRel: 0.190, carveDb: -4.5, carveHz: 400, carveQ: 1.1, carveMs: 120, shelfDb: 2, shelfHz: 3500 }),
    reflex: Object.freeze({ db: -2.5, delayMs: 12, recoverMs: 200, accumDb: -6, burstCount: 15, burstWindow: 3, lowpassHz: 900, lowpassRelease: 0.9 }),
    voices: Object.freeze({ earshot: 8, identity: 6, transient: 8 }),
    earshot: Object.freeze({
      dur: 0.05, hz: 3200, decay: 180, amp: 0.5,
      refDist: 9, rolloff: 1.1, maxDistance: 60,
      // Fires for anything OUTSIDE THE FRUSTUM (D8): the two regions are
      // complements by construction, so no wedge can exist at any FOV.
      flankInterval: 1.6, flankVolume: 0.7,
      flatGuard: 0.75, elevBelow: 0.82, elevAbove: 1.22,
      tokensPerSec: 14, tokenCap: 10, targets: 2,
      tickBase: 0.18, tickSpan: 0.72, volBase: 0.55, volSpan: 0.45,
    }),
    // MIX LAW: nothing but EARSHOT lives in 2.5-5.5 kHz. The test is relative.
    mixLawBand: Object.freeze({ lo: 2500, hi: 5500, marginDb: 18 }),
    master: Object.freeze({ threshold: -10, knee: 16, ratio: 12, attack: 0.002, release: 0.18, gain: 0.85 }),
    throttle: Object.freeze({ enemyHit: 0.06, death: 0.07, attack: 0.06, dashHit: 0.04 }),
  }),

  // ---- RENDER / PICTURE ---------------------------------------------------
  render: Object.freeze({
    // Shader constants — there are no THREE.Light objects. Measured on the real
    // page: at 0.06/0.10 an unlit up-facing drab surface lands at 0.33 display
    // (85/255) under full dark adaptation, i.e. the room is comfortably navigable
    // with no light at all, which deletes the premise. Lowered to the measured
    // floor where geometry is still *inferable* but not readable. Flagged for the
    // human playtest — this is the single number most likely to need a real eye.
    ambient: 0.025, hemi: 0.045,
    fogColor: 0x05070a, fogDensity: 0.011,  // 0.020 made THE GALLERY's 70 m premise fictional
    lightSlots: 8,
    lightReserve: Object.freeze({ muzzle: 1, telegraph: 2, projectiles: 3, flares: 2 }),
    lightHysteresisCloser: 0.25, lightHysteresisHold: 0.25, projectileLightRange: 18,
    irradianceSize: 1024,
    bloomStrength: 0.62, bloomRadius: 0.42, bloomThreshold: 0.85,
    contrast: 1.10, contrastPerTension: 0.22,
    contrastMask: Object.freeze({ lo: 0.03, hi: 0.30 }), blackFloor: 0.006,
    cold: Object.freeze([0.74, 0.88, 1.10]), warm: Object.freeze([1.18, 0.98, 0.74]),
    splitMask: Object.freeze({ lo: 0.28, hi: 0.88 }),
    halation: Object.freeze([1.0, 0.66, 0.38]),   // gated on the EMISSIVE FLAG, never on luma
    grainBase: 0.10, grainPerTension: 0.055,      // applied BEFORE the gain multiply (D10)
    vignette: Object.freeze({ lo: 1.05, hi: 0.30 }),
    tunnelMax: 0.24, tunnelPerTension: 0.34,      // was .42 — peripheral motion is a colourblind
                                                  // player's strongest channel
    ditherAmplitude: 1 / 255,
    drab: 0x8a8f94,                               // was 0x8f948a — green-biased onto the
                                                  // deuteran confusion axis
    accentRegex: /vent|core|eye|lamp|scar|bolt|flare|muzzle|ember|glow|strip/,
    dustMotes: 2400, dustIrradianceScale: 0.9,
    contactBlobHeight: 1.2,
    budget: Object.freeze({ p95ms: 22, draws: 220, tris: 700000, overdraw: 4.0, programs: 17, programsCap: 18 }),
    coldBootSeconds: 12, warmBootSeconds: 4,
  }),

  // ---- TENSION BUS --------------------------------------------------------
  tension: Object.freeze({
    aliveRadius: 30, aliveDivisor: 8, bossAdd: 0.4, lowHealthAdd: 0.25, lowHealthBelow: 35,
    darknessAdd: 0.30,
    floors: Object.freeze({ intake: 0.12, helix: 0.28, gallery: 0.40, furnace: 0.52, aperture: 0.74 }),
    bedLowpassPerT2: 1500, dissonance: 0.95, sub: Object.freeze({ base: 0.06, per: 0.42 }),
    heartBpm: Object.freeze({ base: 52, per: 46 }),
    fogPerT: 0.20, ambientPerT: -0.12,
    moodLowpass: Object.freeze({ base: 700, perLit: 1900, tau: 2.0 }),
    easeK: 3.5, pulseK: 6,
  }),

  // ---- DIRECTOR -----------------------------------------------------------
  director: Object.freeze({
    chambers: Object.freeze({
      intake: { queue: 26, cap: 6, interval: 0.90, weights: { husk: 0.70, runner: 0.30 } },
      helix: { queue: 34, cap: 8, interval: 0.80, weights: { husk: 0.50, runner: 0.30, lantern: 0.20 } },
      gallery: { queue: 40, cap: 9, interval: 0.75, weights: { husk: 0.40, lantern: 0.35, runner: 0.25 } },
      furnace: { queue: 44, cap: 10, interval: 0.70, weights: { husk: 0.35, runner: 0.30, warden: 0.20, bloom: 0.15 } },
    }),
    hardAliveCap: 14,
    spawnBudgetPerFrame: 3, telegraph: 0.40, betweenWaves: 4.0, firstWave: 1.0,
    surpriseMin: 12, surpriseMax: 22, surpriseAliveMin: 2,
    viewConeVeto: 100,
  }),

  // ---- BOSS: THE DAMP -----------------------------------------------------
  damp: Object.freeze({
    hp: 4200, phase2At: 2520, phase3At: 1050,
    contact: 26, darkbolt: 22,
    bodyMultiplier: 0.18,       // THE ONE LAW never bends: a body shot always takes something off
    ventMultiplier: 2.0,
    speedByPhase: Object.freeze([3.0, 3.4, 5.2]),
    eatInterval: Object.freeze([2.4, 1.8, 1.2]),
    ventWindow: 0.55,           // the draft's 1.4 s window on a 1.2 s interval never closed
    // Eating a scar DARKENS and adds +6% damage rage decaying over 12 s. It does
    // NOT heal. Healing off the player's accumulated progress is D3's failure
    // mode a second time: it makes the best run strictly worse.
    ragePerEat: 0.06, rageDecay: 12,
    sweepTime: 3.5, sweepDisc: 9,
    radius: 1.6, height: 3.4, keepOut: 0.32,
  }),
});

export default FEEL;
