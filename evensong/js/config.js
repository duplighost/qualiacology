// EVENSONG — feel kernel. Every tunable lives here, with WHY. Change a number, leave a trail.
// The sim runs a FIXED 60fps logical step. Musical time derives from SIM time (BPM below),
// so the whole game is hidden-tab safe and headless-drivable; audio slaves to it.
window.CFG = {
  W: 1280, H: 720,
  FPS: 60,
  DT: 1 / 60,                       // fixed logical step, seconds

  // ---- MUSICAL CLOCK ----
  BPM: 66,                          // slow enough to SEE counterpoint coming, fast enough to never be dead air.
  BEATS_PER_BAR: 3,                 // chaconne = triple meter. Beat = 0.909s, bar = 2.727s.
  BARS_PER_LOOP: 4,                 // the ground: D C Bb A. One loop = 10.9s. The spine of the whole game.

  // ---- THE LADDER (pitch space) ----
  ROOT_MIDI: 50,                    // D3. Ladder = D natural minor, D3..D5.
  N_STRINGS: 15,                    // two octaves inclusive. 15 strings across the play area.
  LADDER_TOP_Y: 70,                 // px. String 14 (D5) sits here...
  LADDER_BOT_Y: 640,                // ...string 0 (D3) here. ~40.7px per string: readable, mouse-precise.
  SNAP_HYSTERESIS: 0.38,            // in string-widths. You must cross 38% past a boundary to change note. Kills boundary flicker.
  NOW_X: 380,                       // px. The cantor's column — where notes sound. Left-of-center: you watch music arrive.
  LOOKAHEAD_BARS: 2,                // soul notes visible 2 bars (5.45s) before they sound. Counterpoint becomes sight-readable.

  // ---- SINGING FEEL ----
  GLIDE_S: 0.035,                   // portamento time constant. Real voices connect notes; keyboards don't.
  VIBRATO_DELAY_S: 0.8,             // vibrato starts after a note is HELD — reward for commitment, reads as intention.
  VIBRATO_RATE_HZ: 5.2,
  VIBRATO_DEPTH_CENTS: 11,
  ATTACK_S: 0.09, RELEASE_S: 0.35,  // slow-ish choral envelope. Nothing in this game clicks.

  // ---- JUDGING (per-beat interval sampling) ----
  // Diatonic interval class (mod 7): 0=unison 1=2nd 2=3rd 3=4th 4=5th 5=6th 6=7th.
  // 3rds/6ths = imperfect consonance (warmest — this is real counterpoint's preference).
  // 5th/8ve/unison = perfect (cool silver). 2nd/7th = dissonant. 4th dissonant VS BASS ONLY.
  WARMTH_IMPERFECT: 2.0,            // warmth gain/beat for 3rds & 6ths.
  WARMTH_PERFECT: 1.0,
  WARMTH_NEUTRAL: 0.0,              // the 4th vs a soul: hollow, neither warm nor wrong.
  WARMTH_DISS: -1.0,                // un-purposed dissonance cools the world. Never punishes harder than this.
  WARMTH_SUSPENSION: 4.0,           // a RESOLVED suspension outpays everything. Tension spent well is the best music.
  WARMTH_MAX: 100,

  // ---- SUSPENSION MACHINE ----
  SUS_MAX_HOLD_BARS: 1.34,          // hold a dissonance longer than ~4 beats and it's not a suspension, it's a mistake.

  // ---- KNOTS ----
  HINT_AFTER_LOOPS: 2,              // ghost flames spell the answer after 2 incomplete loops. The game leans toward you.
  HINT_EXPLICIT_LOOPS: 4,           // after 4, hints pulse on the beat. Nobody gets stranded.

  // ---- FINALE ----
  FINALE_LOOPS: 3,                  // authored polyphonic variation runs 3 full passes (~65s) before the fermata.
  FERMATA_RELEASE_S: 2.5,           // stay released this long and the Picardy lands. Long enough to be a choice, not a slip.
  FERMATA_PATIENCE_S: 25,           // keep singing this long and the game gently says "whenever you're ready."
  PEEL_S: 8,                        // voices leave one at a time over 8s after resolution. Endings deserve time.

  // ---- AUDIO MIX (dB) ----
  MIX_MASTER: -3,
  MIX_GROUND: -15, MIX_SOUL: -9, MIX_PLAYER: -7.5, MIX_DRONES: -19, MIX_WET: -11,
  REVERB_SECONDS: 2.8,              // rendered IR length. A stone room, not a stadium.
  SCHED_LOOKAHEAD_S: 0.12,          // audio scheduler horizon.
  SCHED_TICK_MS: 25,                // setInterval (NOT rAF): keeps scheduling alive in hidden tabs.

  // ---- COLORS (the whole read lives in ~6 colors) ----
  COL_BG_TOP: '#0a0a12', COL_BG_BOT: '#131322',
  COL_STRING: 'rgba(190,190,220,0.16)',
  COL_STRING_LIT: 'rgba(220,215,255,0.30)',
  COL_PLAYER: '#f0c96a',            // gold. You are the warm thing.
  COL_SOUL: '#cfe3ef',              // pale blue-white, tinted per soul in score.js.
  COL_RIBBON_WARM: '#f0c96a',       // 3rds/6ths — gold, same family as you: warmth is YOURS.
  COL_RIBBON_PERF: '#b9c8dd',       // perfect consonance — silver, correct but cool.
  COL_RIBBON_DISS: '#7d5a66',       // dissonance — a bruise, not an alarm.
  COL_RIBBON_SUS: '#ffe9b0',        // suspension — held-breath gold-white shimmer.
  COL_TEXT: '#e8dcc0',              // parchment.
  COL_VOTIVE: '#e8a05a',            // ember.
};
