// DUET — feel kernel. Every tunable lives here, with WHY. Change a number, leave a trail.
// The sim runs a FIXED 60fps logical step. Partner-bullet velocities are px/FRAME (canonical);
// values more natural in px/s (player move, player shots) are marked and converted at use.
window.CFG = {
  W: 1280, H: 720,
  FPS: 60,
  DT: 1 / 60,                        // fixed logical step, seconds

  // ---- MOVEMENT / INPUT ----
  PLAYER_SPEED: 400,                 // px/s unfocused. Crosses 720px in ~1.8s: reposition vs a full-canvas partner, controllable with a 4px hitbox. No accel ramp.
  FOCUS_SPEED_MULT: 0.45,            // focused = 180 px/s. Touhou-grade drop so you can thread single-bullet gaps deliberately.
  MOUSE_FOLLOW_DELTA: 1.0,           // 1:1 pointer. Scaled by FOCUS_SPEED_MULT while Focus held.

  // ---- HITBOX / GRAZE ----
  HITBOX_RADIUS: 4,                  // px lethal collision (center-to-center). Pinpoint = weaving inside lace is survivable. Visible overlap is allowed and intended.
  SHIP_BODY_RADIUS: 16,              // cosmetic cyan lens. Reads position; NOT the hitbox.
  GRAZE_BAND_INNER: 4,               // = hitbox radius. Graze counts from the edge of death.
  GRAZE_BAND_OUTER: 28,             // FIXED in both Focus modes AND all movements. The one consistent danger read.
  GRAZE_RESET: 34,                   // hysteresis: a bullet must leave past this before it can graze again.
  FOCUS_GRAZE_MULT: 1.25,            // reward for precise Focus threading. Changes gain, not band size.
  GRAZE_GAIN_MULT_BY_MVT: [1.0, 0.85, 0.70, 0.55, 0.55], // late nearness pays less (replaces "shrinking band"). Index by movement 0..4.

  // ---- CLOSENESS CONDUCTOR ----
  CLOSE_GAIN_PER_BULLET: 0.12,       // /s per bullet in band. A ~6-bullet stream fills 0->1 in ~1.4s of clean weaving. Punchy: safe play never feels default.
  CLOSE_GAIN_CAP: 1.1,               // /s total. A wall can't instant-max the meter; you still have to survive the wall.
  CLOSE_DECAY_BASE: 0.28,            // /s at floor. Gentle early so learning isn't punishing.
  CLOSE_DECAY_K: 0.9,                // decay = base + K*closeness^2 (~1.18/s at max). Brutal near top: max is a held note. Full->0 in ~1.3s if you back off.
  UNISON_ENTER: 0.92,                // closeness threshold to accumulate UNISON.
  UNISON_FILL_TIME: 6.0,             // s of sustained near-max grazing to fill the overflow bar. True-ending currency.
  UNISON_DECAY: 0.5,                 // /s whenever closeness < UNISON_ENTER. Movement V demands you STAY intimate.

  // ---- SCORING ----
  SCORE_MULT_SLOPE: 7,               // mult = 1 + closeness*7  => 1x..8x.
  SCORE_MULT_UNISON_CAP: 12,         // overflow extends ceiling to 12x. Intimacy IS the score engine; a hit craters mult.
  SCORE_GRAZE: 60,                   // base points per graze event (x mult).
  SCORE_SPARK: 120,                  // base points per harvested spark (x mult).
  SCORE_HIT_PARTNER: 8,              // base points per player-bullet connect (x mult).

  // ---- YOUR FIRE ----
  FIRE_INTERVAL_LOW: 120,            // ms at closeness 0.
  FIRE_INTERVAL_HIGH: 60,            // ms at closeness 1. Fire thickens as you get closer: DPS tied to risk, not a powerup.
  FIRE_SPREAD_STEPS: [1, 3, 5],      // 1 stream @0, 3-way @0.5, 5-way fan (+-14deg) @1.
  FIRE_FAN_DEG: 14,                  // half-fan of the widest spread.
  PLAYER_BULLET_SPEED: 950,          // px/s (~15.8 px/f). Fast+thin so friendly fire is NEVER confused with slow fat rose lace.
  PLAYER_BULLET_LEN: 14,             // px lozenge length.
  PLAYER_DMG: 10,                    // gauge damage per connect.

  // ---- PARTNER BULLETS (px/FRAME canonical) ----
  LACE_SPEED_BY_MVT: [2.0, 2.2, 2.6, 2.8, 2.1], // px/f standard aimed/ring lace per movement. <=2.8 cap for readability.
  NEEDLE_SPEED: 7.5,                 // px/f aimed needles (Mvt IV). The only fast rose; ALWAYS telegraphed.
  LASER_STREAM_SPEED: 4.0,           // px/f along a telegraphed swept edge.
  PARTNER_BULLET_R: 6,               // px visible lethal core radius. Halo 8-9px. Collision uses HITBOX_RADIUS center distance.
  BULLET_CORE_MIN: 2,                // hot near-white center, never below 2px.
  BULLET_CAP: 620,                   // concurrent max (Mvt V). Pooled, zero per-frame alloc.

  // ---- HARMONIZE (bomb) ----
  HARMONIZE_COST: 0.34,              // closeness spent (~a third of the bar).
  HARMONIZE_RADIUS_FULL: 300,        // px clear when you can afford the cost.
  HARMONIZE_RADIUS_WEAK: 180,        // px emergency version if closeness < cost (dumps all remaining closeness).
  HARMONIZE_SWEEP_MS: 350,           // expanding ring cancels bullets it passes -> sparks. Reads as a wave you send.
  HARMONIZE_IFRAMES_MS: 500,         // covers the sweep + a hair.
  HARMONIZE_LOCKOUT_MS: 900,         // prevents double-tap cheese; gives each use weight.
  SPARK_MAGNET_MS: 600,              // converted bullets magnet to player.

  // ---- SURVIVAL ----
  PLAYER_HP: 4,                      // beats. A hit SNAPS the duet + leaves you gray, then lets you rebuild. Checkpoint per movement.
  HIT_IFRAMES_MS: 1200,              // generous Cave-style respawn invuln; player blinks.
  HIT_HITSTOP_MS: 80,                // freeze on player hit, THEN the desaturate whoosh.
  KILL_HITSTOP_MS: 45,               // sub-emitter/spark-convert freeze.
  DESATURATE_MS: 120,                // world -> gray on hit.

  // ---- CAMERA ----
  CAMERA_ZOOM_MAX: 1.03,             // at UNISON. Tiny: heightens without disorienting the bullet read. Snaps to 1.0 on hit.

  // ---- JUICE ----
  SHAKE_HARMONIZE: 6,                // px
  SHAKE_HIT: 8,                      // px
  SHAKE_TELL: 3,                     // px
  SHAKE_DECAY: 0.85,                 // per-frame exp decay
  CHROMA_MAX: 2.5,                   // px RGB split near UNISON (bloom layer only)
  CHROMA_SPIKE: 5,                   // px on harmonize / first UNISON

  // ---- AUDIO ----
  BPM: 126,
  KEY: 'D_DORIAN',

  // ---- COLORS (single source; art §9.1) ----
  COL: {
    void: '#0A0E1A', ash: '#1C2740', dead: '#2A2E38',
    core: '#5CFAFF', halo: '#2BB8D6', fire: '#3FE0C8',
    rose: '#FF5C8A', roseCore: '#FFD6E4', ghost: '#B98CFF', ghostCore: '#F0E6FF',
    body: '#FF7AA8', gold: '#FFC46B', spark: '#FFDE9E', hud: '#8FE9F2',
  },

  REDUCED_MOTION: !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches),

  get LACE(){ return this.LACE_SPEED_BY_MVT; },
};
