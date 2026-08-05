// FINALE — feel kernel. Every tunable lives here, with WHY. Change a number, leave a trail.
// The sim runs a FIXED 60fps logical step. Speeds are px/SECOND everywhere (converted at use via CFG.DT),
// because this game's numbers came out of a spec written in px/s and re-deriving them invites drift.
window.CFG = {
  W: 1280, H: 720,
  FPS: 60,
  DT: 1 / 60,                        // fixed logical step, seconds

  // ---- MOVEMENT / INPUT ----
  // Direct arcade handling. Accel exists only so the ship has weight; it resolves in ~6.5 frames,
  // which reads as "instant" but kills the twitchy 1-frame snap that makes a ship feel like a cursor.
  TOP_SPEED: 520,                    // px/s. Crosses 1280px in 2.5s.
  FOCUS_SPEED: 210,                  // px/s held Shift/RMB. 0.40x — thread single-bullet gaps deliberately.
  ACCEL: 4800,                       // px/s^2 -> 0..520 in 0.108s (6.5 frames).
  DECEL: 6200,                       // px/s^2. Faster than accel: stopping must feel crisper than starting.
  MOUSE_MAX_STEP: 26,                // px/frame ceiling on pointer-follow so mouse can never out-run keys.

  // ---- HITBOX ----
  HITBOX_R: 3,                       // px lethal radius. Pinpoint: visible overlap with a bullet is survivable and intended.
  SHIP_R: 13,                        // cosmetic hull half-size. Reads position; NOT the hitbox.
  IFRAMES: 1.4,                      // s invulnerable after a hit.
  RESPAWN_LOCK: 0.35,                // s of no-input settle after death, so a death never eats your next input.

  // ---- THE FUSE WINDOW (core mechanic) ----
  // MEASURED, not guessed. At 1300px/s a typical 200px shot spends 0.154s in flight, which is dead
  // time inside the window. Every window length and every shell HP below is set against
  //   (window - flightTime) * inWindowDPS   vs   shell HP
  // so that small shells convert reliably and DRUM/MORTAR still cannot be solo-gunned. The first
  // tuning pass used the spec's numbers and produced a 1-3% conversion rate: the invitation was
  // mathematically impossible to accept. An invitation you can't accept is just a taunt.
  FUSE_ARMOR_MULT: 4.0,              // in-window DPS = 80. Was 3.0 and left SPARK unkillable from full HP.
  // Petals LIGHT FUSES. A petal striking a shell whose window is shut forces it open immediately.
  // This is the cascade engine and it is straight out of the pitch ("petals shred other shells and
  // set off their fuses"). Without it a cascade kills shells silently, no chain ever forms, and the
  // whole game collapses into a peashooter sim. Ignition may exceed the ambient window cap by this
  // much, because a screen lighting up IS the spectacle and the player caused it.
  FUSE_IGNITE_HEADROOM: 6,
  FUSE_RING_HZ: 8,                   // alpha pulse rate of the white ring. Fast enough to catch peripheral vision.
  FUSE_RING_SCALE: 2.2,              // ring starts at r*2.2 and shrinks to r*1.0 over the window = a visual countdown.
  PETAL_SPEED_MULT: 1.6,             // converted volley flies faster than the enemy version. Yours should feel like a release.
  PETAL_INHERIT: 0.45,               // fraction of PLAYER velocity added to every petal. THE line: your dodge is your aim.
  PETAL_DMG: 6,                      // x4 fuse armour = 24 = exactly a SPARK. One petal converts one SPARK.
  PETAL_LIFE: 2.4,                   // s
  // A bloom must be DENSE enough to actually sweep its neighbours. Measured: a 5-petal radial bloom
  // only intersects a 12px shell 96px away about 1 time in 5, so cascades died at chain 1-2. Eight
  // petals at 30deg spacing reliably catch the shells beside them, which is the whole game. At 8 the
  // per-step chance was ~67% and cascades died after 2 links; at 12 it is ~100% and they travel.
  PETAL_MIN_COUNT: 12,
  // Petals collide generously. They are YOURS and can never hurt you, so a fat hitbox costs the
  // player nothing and reads exactly as it should: petals shred what they pass near.
  PETAL_HIT_BONUS: 8,                // px added to petal-vs-shell collision radius (visual size unchanged)
  PETAL_PIERCE_BASE: 1,
  PETAL_PIERCE_PER_CHAIN: 6,         // pierce = 1 + floor(chain/6), capped
  PETAL_PIERCE_CAP: 5,

  // ---- CHAIN / CASCADE ----
  CHAIN_WINDOW: 0.80,                // s between blue blooms to keep the chain alive. 0.60 was too tight for a cascade to bridge shell-to-shell; measured, chains died at 1 every time.
  CHAIN_SAT: 30,                     // all mechanical effects saturate here
  CHAIN_DISPLAY_CAP: 60,
  CHAIN_SPEED_PER: 0.012,            // petal speed x(1 + 0.012*chain)
  CHAIN_SPEED_CAP: 1.36,

  // ---- APPLAUSE (5-step arcade gauge; NOT a mood dial, NOT DUET's continuous scalar) ----
  APPLAUSE_PER_FUSEKILL: 2,
  APPLAUSE_PER_CHAIN: 1,
  APPLAUSE_DECAY: 6,                 // /s, after the grace below
  APPLAUSE_GRACE: 1.2,               // s of no gain before decay starts
  TIERS: [                           // [minValue, mult, name]
    [0,  1.0, 'QUIET'], [25, 1.5, 'WARM'], [50, 2.0, 'LOUD'], [75, 3.0, 'ROAR'], [100, 4.0, 'FINALE'],
  ],
  TIER_DROP_ON_DEATH: 1,             // lose exactly one tier, never reset to zero. A death must not delete the run.

  // ---- YOUR GUN (an igniter, not a weapon) ----
  FIRE_INTERVAL: 0.100,              // s between volleys (6 ticks). Auto-fire from tick 0; the player never presses shoot.
  FIRE_DMG: 1.0,                     // 2 bullets * 10/s = 20 DPS base, 80 DPS in-window. And a shell can ONLY be hurt in its window (see fuse.js) — the gun is an igniter, literally.
  FIRE_SPEED: 1300,                  // px/s. Was 900, which spent half of a short window in flight. Fast + thin so friendly fire is never confused with the slow fat enemy lace.
  FIRE_OFFSET: 7,                    // px from centreline per barrel
  FIRE_TIER_DOUBLE: 4,               // at tier index 4 (FINALE) the gun doubles to 4 barrels

  // ---- FLARE (dash) ----
  FLARE_TIME: 0.18,                  // s
  FLARE_DIST: 380,                   // px covered
  FLARE_CD: 1.10,                    // s
  FLARE_PETAL_R: 140,                // px: petals in range get shoved along the dash vector
  FLARE_PETAL_BOOST: 180,            // px/s. FLARE HAS NO I-FRAMES ON PURPOSE: it steers cascades, it does not escape.

  // ---- MISFIRE (bomb) ----
  MISFIRE_START: 2,
  MISFIRE_MAX: 3,
  MISFIRE_CONVERT_R: 260,            // px: enemy bullets inside this become petals
  MISFIRE_IFRAMES: 1.0,
  MISFIRE_HITSTOP: 0.35,
  MISFIRE_CHAIN_REFILL: 25,          // lifetime chain links per earned charge

  // ---- SCORING ----
  SCORE_FUSEKILL_MULT: 3,
  SCORE_CHAIN_PER: 0.25,             // x(1 + 0.25*n)
  SCORE_NOHIT_ACT: 50000,
  SCORE_NO_POWDER_WASTED: 25000,     // a wave cleared with >=90% fuse-kills
  NO_POWDER_THRESHOLD: 0.90,

  // ---- LIVES ----
  LIVES: 3,

  // ---- POOLS (hard caps; see PERF) ----
  BULLET_CAP: 4096,
  PARTICLE_CAP: 900,
  ENEMY_CAP: 48,

  // ---- BOSS UNIVERSALS ----
  BOSS_PHASE_TIMEOUT: 55,            // s hard. At timeout the boss staggers 3s and the phase advances regardless of HP.
  BOSS_STAGGER_TIME: 3.0,            // s: all patterns cleared, x2 damage, every node open. No phase may be an HP sponge.
  BOSS_STAGGER_DMG: 2.0,
  BOSS_TRANSITION_RELIEF: 1.2,       // s of no fire after a phase break
  // FIX for the judged "spawn-gated agency" flaw: adds never stop, and if the player has had no
  // petal source at all for this long, the director force-spawns one. You are never left with zero offence.
  BOSS_STARVE_LIMIT: 2.5,            // s

  // ---- FX ----
  SHAKE_CAP: 10,                     // px total offset, hard clamp. Never rotate the camera.
  SHAKE_DECAY: 0.86,                 // per tick
  HITSTOP_FUSEKILL_BIG: 0.045,       // s, on DRUM/MORTAR fuse-kills only (not every pop, or the game stutters)
  HITSTOP_PHASE: 0.090,
  HITSTOP_DEATH: 0.140,
  BLOOM_WIND_R: 180,                 // px radial particle impulse on a blue bloom
  BLOOM_WIND_V: 260,                 // px/s

  // ---- COLOUR LAW ----
  // Allegiance is HUE. Class is SHAPE. Both, always. Nothing else in the game may be pure #FFFFFF at
  // full alpha except: the fuse ring, bloom flashes, the player core, and HUD text. White means ACT NOW.
  COL: {
    skyTop: '#070912', skyBottom: '#131A3A', skyGlow: '#1D2A5E',
    city: '#05070E', window: '#F2C46A',
    crowdBody: '#0B1020', crowdRim: '#F2C46A',
    enemyHull: '#6B2E8F', enemyTrim: '#E9A8FF', enemyCore: '#FF2D6F',
    bossHull: '#4A1D63', bossTrim: '#FFB6E6',
    danger: '#FF2D6F',                 // lethal to you — CIRCLE
    amber: '#FFB020',                  // unconvertible lethal — TRIANGLE/BEAM
    mineA: '#5FF7FF', mineB: '#B8FFEA', mineC: '#FFFFFF',   // your petals — DIAMOND, stage by chain
    pea: '#3FA6C8',                    // your peashooter — LINE, deliberately dim
    white: '#FFFFFF',
    ui: '#FFFFFF', accent: '#FFD166',
    blackout: '#05060B', veil: '#0A0C18',
  },
  PETAL_STAGE_AT: [0, 10, 24],        // chain thresholds for mineA/mineB/mineC

  // ---- ACTS ----
  ACTS: [
    { name: 'THE PIER',       bpm: 124, boss: 'ROMAN CANDLE' },
    { name: 'THE CRANE YARD', bpm: 132, boss: 'CATHERINE' },
    { name: 'THE CLOUD DECK', bpm: 138, boss: 'KAMURO' },
    { name: 'THE FINALE',     bpm: 150, boss: 'THE SHOWRUNNER' },
  ],

  // ---- PERF LADDER ----
  PERF_BAD_MS: 15.5,                 // 30-frame mean above this drops one quality step (1/s)
  PERF_GOOD_MS: 12.0,                // 4s under this restores one step
  // Ladder never reduces bullet counts — gameplay must be identical at every quality level.
};
