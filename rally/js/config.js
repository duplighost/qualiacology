// RALLY — feel kernel. Every tunable constant lives here, with WHY.
// House rule (ported: rocket-shoes/skyshard): change a feel number, leave a comment trail.
window.CFG = {

  // ---- world ----
  W: 1280, H: 720,             // logical canvas; scaled to fit window, aspect preserved
  FLOOR: 636,                  // court surface y. Leaves room for HUD above and clay apron below
  NET_X: 640,                  // center court
  NET_TOP: 496,                // net is 140px tall — high enough that lazy pushes don't clear it,
                               // low enough that a medium swing does. The whole game lives here.
  GRAVITY: 1900,               // px/s^2. Heavier than "floaty" so smashes feel violent;
                               // light enough that lobs hang and drop shots die softly
  AIR_DRAG: 0.14,              // per-second fractional decay — keeps smash speeds from compounding forever

  // ---- ball ----
  BALL_R: 13,
  BALL_MAX_SPEED: 2600,        // hard fuse, far above normal play (~1400 top smash)
  MAGNUS: 0.010,               // accel = MAGNUS * spin * v_perp. At spin 30, v 800 that's
                               // ~240 px/s^2 -> ~75px of bend over a 0.8s crossing: visible,
                               // readable, never remote-control (SPIN_MAX caps the rest)
  SPIN_MAX: 42,                // rad/s cap. Above this the curve reads floaty (judge warning)
  SPIN_DECAY: 0.35,            // per-second — spin mostly survives one crossing, fades by the second
  SPIN_TRANSFER: 0.016,        // tangential mitt velocity (px/s) -> ball spin (rad/s)

  // ---- mitt (the entire verb) ----
  MITT_R: 30,
  MITT_LAMBDA: 34,             // cursor tracking damp. 34/s = ~29ms to 63% — reads as 1:1.
                               // JUDGE FIX: weight comes from commitment (cooldown), never lag.
  MITT_VEL_SMOOTH: 3,          // frames of cursor-velocity averaging: jittery mice can't produce
                               // garbage contacts, but a real flick survives intact
  RESTITUTION: 0.52,           // reflect-only bounce is deliberately weak: a camped, motionless
                               // mitt CANNOT clear the net. You must actually swing. This is the
                               // anti-camping rule, expressed in physics instead of UI
  TRANSFER: 0.85,              // fraction of mitt velocity added to exit — the "your hand is the shot" number
  HIT_COOLDOWN: 0.18,          // s after contact where the mitt is "limp" (no second contact).
                               // JUDGE FIX: overcommitment punished legibly, not invisibly
  REACH_PLAYER: { x0: 40, x1: 616 },   // player mitt clamped to own half (net minus mitt radius-ish)
  REACH_RIVAL:  { x0: 664, x1: 1240 },
  MITT_Y_MIN: 120,             // can't hover in the stratosphere; lobs must be earned with arcs

  // ---- serve ----
  TOSS_VY: -780,               // click = toss straight up from the mitt; you provide everything else
  SERVE_DELAY_AI: 1.1,         // s before a rival serves — breath, not dead air (music tail still ringing)

  // ---- juice ----
  // hitstop by relative contact speed (px/s -> ms). Particles keep flying at 55% dt during stops
  // (ported: duskfall) so freezes read as impact, not lag.
  HITSTOP: [ [1400, 45], [900, 20], [0, 0] ],
  SAVE_FLOOR_DIST: 60,         // contact this close to the floor = a SAVE:
  SAVE_HITSTOP: 60,            //   longer stop +
  SAVE_SLOWMO: 0.35,           //   brief slow-mo. The desperate lunge is the best feeling in the game
  SAVE_SLOWMO_T: 0.28,
  SLOWMO_RECOVER: 2.2,         // eased t*t recovery rate back to 1x
  SHAKE_SMASH: 0.34,           // trauma added on smash contact (response = trauma^2, incommensurate sines)
  SHAKE_POINT: 0.22,           // trauma when a point dies
  SHAKE_DECAY: 2.1,
  ZOOM_RALLY: 0.0045,          // camera pushes in per consecutive hit (1.00 -> ~1.06 at rally 13)
  ZOOM_MAX: 1.065,
  ZOOM_LAMBDA: 2.6,            // slow, cinematic creep — never a lurch
  TRAIL_LEN: 26,               // ball trail samples
  AFTERIMAGE_SPEED: 900,       // mitt speed above which ghosts appear

  // ---- swing ribbon (JUDGE FIX: make the swing visible) ----
  RIBBON_MIN: 220,             // mitt speed where the ribbon starts to show
  RIBBON_SCALE: 0.075,         // px of ribbon per px/s of mitt speed
  RIBBON_MAXLEN: 120,

  // ---- rally / music thresholds ----
  // consecutive hits (both sides count) -> which BGM layers live.
  // Bass at 2 means the music starts almost immediately; lead at 8 is earned.
  LAYER_GATES: { bass: 2, arp: 4, hats: 6, lead: 8 },
  CALLOUTS: [6, 10, 15, 20, 30],  // "RALLY x6!" letterpress pops — once per threshold per rally

  // ---- finale ----
  FINALE_BARS: 16,             // bars of full-stack song to complete the duet
  FINALE_MIN_LAYERS: 8,        // rally count that must be held for bars to accrue
  DUET_REACH_EDGE: 0.82,       // Jules aims for this fraction of your reach — stretchy, never cruel

  // ---- matches ----
  MATCH_POINTS: [3, 3, 4, 4, 5],  // points to win vs rivals 1..5

  // ---- misc ----
  REDUCED_MOTION: window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
};
