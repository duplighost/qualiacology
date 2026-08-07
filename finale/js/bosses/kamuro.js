// FINALE — BOSS III: KAMURO (Act III, "THE CLOUD DECK"). Spec §8.3.
//
// A titanic gold-white chrysanthemum head, a third of the screen wide, made of hanging tendrils,
// drifting in cloud. It blooms and blooms and blooms.
//
// SIGNATURE PHYSICS — GRAVITY BULLETS (Pool.B.GRAVITY, spawned via the 'flower' emitter):
//   speed 320 -> decelerate at 260 px/s^2 to a full stop -> hang 0.5s -> fall at +55 px/s^2,
//   terminal 130. This is the whole trick: KAMURO holds a four-figure bullet count while staying
//   readable, because DENSITY IS NOT SPEED. Nothing here is fast; everything here is everywhere.
//
// The four phases are four different questions, never four HP bars:
//   P1 BLOOM              — can you earn the pressure valve? (upward petals burn holes in the curtain)
//   P2 RAIN               — can you take the MORTAR windows when taking them is the only way to breathe?
//   P3 THE HANGING GARDEN — the boss stops firing and the BULLETS become the shells.
//   P4 KAMURO FALLS       — kill it before it hits the city. Everything else stops mattering.
//
// LAW 1 (petal-only armour): every phase spawns adds on a reliable cadence. The peashooter exists to
// pop the adds whose blooms break the tendrils. A phase with no petal source is a phase with no
// player, and this file never ships one.
// LAW 2 (no HP sponges): each phase has a real budget and a NEW IDEA. The engine's 55s timeout and
// 3s stagger are the backstop, not the plan.
window.BossKamuro = (() => {
  const T = Pool.T, BEH = Pool.B, FL = Pool.F, FACT = Pool.FACTION;

  // ============================================================================================
  // TUNABLES
  // ============================================================================================
  const MAX_HP = 3600;              // Act III boss: 1.5x ROMAN CANDLE (2400). Four phases, four budgets.
  const BODY_R = 190;               // hitbox radius. Deliberately INSIDE the 210px visual so the hitbox
                                    // reads as "the head", never as "the fringe". Only P4 uses it.
  const VIS_R = 210;                // visual radius = 420px wide = one third of a 1280 canvas, per spec.

  // -- gravity profiles ------------------------------------------------------------------------
  const G_SPEED = 320;              // spec §8.3 initial speed
  const G_DECEL = 260;              // spec §8.3 deceleration to a full stop (travels 320^2/2/260 = 197px)
  const G_FALL = 55;                // spec §8.3 fall acceleration; pool clamps at terminal 130
  const G_SINK = 12;                // P3 ONLY: a near-zero fall accel so the garden actually HANGS.
                                    // 55 would drain the screen in 4s and there would be no garden.

  // -- damage the boss takes from scripted sources ----------------------------------------------
  // Killing a fuse node does NOT touch boss HP in the engine — that is scripted per boss, here.
  const P1_NODE_DMG = 110;          // 1080 HP to clear P1 / 110 = ~10 tendril kills across 40s. One per 4s.
  const P2_NODE_DMG = 90;           // P2's damage is meant to come from MORTARs; nodes are the safety route.
  const P2_MORTAR_DMG = 240;        // spec §8.3: a MORTAR blue bloom deals 240. ~4 of them clear the phase.
  const P3_NODE_DMG = 125;          // 900 HP / 125 = ~7 tendril kills in 35s while the garden fights back.
  const P4_NODE_DMG = 130;          // the shed corner tendrils; the falling body is also directly shootable.

  const NODE_HP_P1 = 50;            // spec §8.3 "6 tendril tips, each HP 50". In-window petal = 18 dmg,
  const NODE_HP_P2 = 44;            // so 3 petals kill a tip. A single SPARK bloom (5 petals) is enough.
  const NODE_HP_P3 = 50;
  const NODE_HP_P4 = 55;

  const NODE_DIST = 250;            // tendril tips hang just outside the 210px head — a visible fringe.
  const NODE_DIST_LOW = 165;        // P2: the boss descends to y=300, so the fringe must pull in tight
                                    // or the tips end up sitting in the player's lane.

  // -- P1 --------------------------------------------------------------------------------------
  const P1_BURST_EVERY = 3.2;       // spec §8.3: a 64-bullet radial burst every 3.2s
  const P1_BURST_PHASE_STEP = U.deg(5.6);  // spec: 5.6 deg offset per burst so curtains INTERLEAVE
                                           // rather than stack. Stacked curtains are unreadable fog.
  const P1_WIN = 0.60, P1_GAP = 0.30;      // spec: 6 tips light in a wave, window 0.60s, 0.30s apart
  const P1_SPARK_EVERY = 1.6;       // the bread-and-butter petal source. Generous on purpose (LAW 1).
  const P1_DRUM_EVERY = 9.0;        // 24 petals. The big valve; one every 9s is a rhythm, not a lottery.
  const P1_REVIVE = 1.6;            // s before a killed tendril regrows. A chrysanthemum reblooms; also
                                    // it keeps the phase from running out of targets before the HP does.
  const REAP_R = 18;                // px: the radius an upward tendril petal burns hanging bullets in.
  const REAP_R2 = REAP_R * REAP_R;
  const REAP_CAP = 256;             // max reaper petals considered per frame — a hard perf ceiling.

  // -- P2 --------------------------------------------------------------------------------------
  const P2_DRIZZLE_HZ = 18;         // spec: 18 bullets/s from y=-20, random x
  const P2_DRIZZLE_DT = 1 / P2_DRIZZLE_HZ;
  const P2_DRIZZLE_SPD = 120;       // spec: straight down, no gravity profile. Slow enough to walk through.
  const P2_MORTARS = 8;             // spec: 8 MORTARs descend over the phase
  const P2_MORTAR_EVERY = 4.5;      // spec: one every 4.5s
  const P2_MORTAR_CLEAR_R = 240;    // spec: a blue bloom clears a 240px radius of hanging bullets
  const P2_SPARK_EVERY = 2.2;       // NOT in the spec, REQUIRED by LAW 1: a 160hp MORTAR cannot be killed
                                    // by the gun alone inside its window (96 dmg), so without a cheap
                                    // petal seed the phase would be unwinnable from a cold start.
  const P2_BEAM_EVERY = 7.0;        // amber, the honest-dodge floor. Never convertible, always telegraphed.
  const P2_Y = 300;                 // spec: boss descends to y=300
  const P2_SWEEP_A = 160;           // spec: sweeps x 480<->800, i.e. 640 +/- 160
  const P2_SWEEP_W = U.TAU / 7.0;   // 7s period: slower than the player can be forced to react to.
  const P2_REVIVE = 2.2;

  // -- P3 --------------------------------------------------------------------------------------
  const P3_RING_EVERY = 2.0;        // spec: every 2.0s, 40 hanging bullets grow a white fuse ring
  const P3_RING_N = 40;             // spec
  const P3_RING_WIN = 0.50;         // spec: 0.50s window, then it splits into 6 (engine's onFuseExpire)
  const P3_PLANTS = 4;              // the relief beat at the phase break wipes the screen, so the garden
  const P3_PLANT_EVERY = 1.5;       // has to be PLANTED before it can hang. Four exhales, then silence.
  const P3_TOPUP_EVERY = 6.5;       // a slow refill so a player who converts everything still has a garden
  const P3_WIN = 0.55, P3_GAP = 0.35;      // spec: "tendrils also cycle windows (0.55s) for boss damage"
  const P3_SPARK_EVERY = 3.0;       // LAW 1 again: the garden is a petal source, but never the ONLY one.
  const P3_CANDLE_EVERY = 5.5;
  const P3_REVIVE = 1.8;
  const P3_Y = 170;                 // rises back up so the whole garden is legible beneath it
  const CONV_SKIN = 9;              // px of forgiveness on "did my shot touch that ringed bullet".
                                    // A 6px bullet at 60fps needs a generous skin or it feels like a lie.

  // -- P4 --------------------------------------------------------------------------------------
  const P4_Y0 = 300;                // spec: falls from y=300
  const P4_Y_DEAD = 690;            // spec: the skyline. Reach it and the city goes dark.
  const P4_FALL = 26;               // spec: 26 px/s -> 390px of fall = 15.0s to save the city
  const P4_WILLOW_HZ = 12;          // spec: each shed tendril fires 12 bullets/s
  const P4_WILLOW_DT = 1 / P4_WILLOW_HZ;
  const P4_SPARK_EVERY = 2.5;       // LAW 1 in the endgame: you must always have something to convert
  const P4_REVIVE = 3.0;
  const P4_BLACKOUT = 2.0;          // spec: 2.0s of black + a single low hum when it lands
  const P4_RESTART_BUDGET = 20;     // spec: the phase restarts with a 20s budget (of the 24s phase)
  const P4_RESTART_HP = 0.30;       // spec: it rises again at 30% HP. Fail-forward, never a wall.
  const P4_WIN = 0.55, P4_GAP = 0.40;

  // ============================================================================================
  // PREALLOCATED STATE — nothing below this line may allocate inside update() or draw().
  // ============================================================================================

  // -- volley descriptors. A volley is DATA, never code (Emit's conversion contract). -----------
  // KAMURO's own bursts. `phase` is mutated between bursts; that is a number write, not an alloc.
  const D_BLOOM  = { kind: 'flower', n: 64,  speed: G_SPEED, decel: G_DECEL, grav: G_FALL, phase: 0, r: 6 };
  const D_PLANT  = { kind: 'flower', n: 110, speed: 300,     decel: 240,     grav: G_SINK, phase: 0, r: 6 };
  const D_TOPUP  = { kind: 'flower', n: 48,  speed: 280,     decel: 230,     grav: G_SINK, phase: 0, r: 6 };

  // THE PRESSURE VALVE (spec §8.3, one of only two authored exceptions to the no-clearing rule):
  // a blue tendril bloom throws 20 petals UPWARD in a 70 degree cone. Upward is not a typo — the
  // petals climb INTO the descending curtain, meet it head on, and the hole they burn then falls
  // toward you. You are cutting your own lane out of the sky, one bloom at a time.
  const D_TENDRIL = { kind: 'fan', n: 20, spread: 70, speed: 200, aimed: false, angle: -90 };
  // Every other phase's tendrils bloom omnidirectionally — no valve, because it has to be earned once.
  const D_NODE_RING = { kind: 'ring', n: 16, speed: 190 };

  // -- spawn option objects (bul.spawn's `opts`), mutated in place ------------------------------
  const OPT_DRIZZLE = { r: 6, dmg: 1, life: 0, beh: BEH.LINEAR, flags: 0 };
  const OPT_WILLOW  = { r: 6, dmg: 1, life: 0, beh: BEH.GRAVITY, flags: FL.PERSIST, decel: 210, grav: G_FALL };
  const OPT_BEAM    = { len: 1500, w: 15, tele: 0.9, live: 0.6, sweep: 0 };
  const WHISTLE_OBJ = { x: 640, id: 'kamuro-garden' };   // ONE voice for a 40-bullet ring event, not 40.

  // -- colours (rgb triplets, so U.rgba never has to parse hex per frame) -----------------------
  const RGB_GOLD  = [255, 198, 104];    // KAMURO's own gold. NOT #FFB020 amber — amber means "cannot convert".
  const RGB_WARM  = [255, 240, 206];    // gold-white: the chrysanthemum's hot inner light
  const RGB_CITY  = [242, 196, 106];    // CFG.COL.window — the city lights coming on beneath it
  const RGB_BLACK = [5, 6, 11];         // CFG.COL.blackout
  const RGB_CYAN  = [95, 247, 255];     // CFG.COL.mineA — reaper sparks read as YOURS

  // -- per-frame scratch buffers ----------------------------------------------------------------
  const SCX = new Float32Array(REAP_CAP), SCY = new Float32Array(REAP_CAP);
  const NODE_WAS = new Uint8Array(8);          // node alive-flag from last frame (death detection)
  const NODE_REVIVE = new Float32Array(8);     // s until a killed tendril regrows
  const MORT_REF = new Array(P2_MORTARS).fill(null);   // tracked MORTAR objects (refs, not copies)
  const MORT_ID = new Int32Array(P2_MORTARS);          // enemy pool slots get reused — verify identity
  const MORT_OPEN = new Uint8Array(P2_MORTARS);        // was its window open last frame?
  const MORT_X = new Float32Array(P2_MORTARS), MORT_Y = new Float32Array(P2_MORTARS);
  const CORNER_X = new Float32Array(4), CORNER_Y = new Float32Array(4);
  CORNER_X[0] = 200; CORNER_Y[0] = 180;   // the four shed tendrils bracket the arena without ever
  CORNER_X[1] = 1080; CORNER_Y[1] = 180;  // sitting in the bottom lane where the player lives
  CORNER_X[2] = 200; CORNER_Y[2] = 470;
  CORNER_X[3] = 1080; CORNER_Y[3] = 470;

  // -- baked silhouette: 72 chrysanthemum strands, generated once with the COSMETIC rng ----------
  const N_STRAND = 72;
  const SA = new Float32Array(N_STRAND);   // angle
  const SL = new Float32Array(N_STRAND);   // length as a fraction of VIS_R
  const SW = new Float32Array(N_STRAND);   // half-width at the base
  const SPH = new Float32Array(N_STRAND);  // shimmer phase, so the head breathes instead of pulsing as one
  for (let i = 0; i < N_STRAND; i++) {
    SA[i] = i / N_STRAND * U.TAU + U.rngFx.range(-0.018, 0.018);   // tiny jitter: a grid reads as machine
    SL[i] = 0.70 + U.rngFx.range(0, 0.30) * (i % 3 === 0 ? 1 : 0.62);  // every 3rd strand runs long
    SW[i] = 0.55 + U.rngFx.range(0, 0.55);
    SPH[i] = U.rngFx.range(0, U.TAU);
  }

  // ============================================================================================
  // SHARED HELPERS (module scope so no phase ever builds a closure)
  // ============================================================================================

  // Node bookkeeping: the engine kills nodes for us but never tells the boss about it and never
  // touches boss HP. This is the one place that converts "a tendril died" into "KAMURO is hurt",
  // and it also schedules the regrow.
  // NOTE ON ORDER: node blooms happen in collide(), which is the LAST thing in a tick. We run at the
  // TOP of the next tick, before cycleNodes() re-positions anything, so n.x/n.y still hold exactly
  // the coordinates the petals were spawned at. That is what makes reaper-marking reliable.
  function reapNodeDeaths(B, api, dmg, reviveT, markReapers) {
    const bul = api.bul;
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (n.alive) { NODE_WAS[i] = 1; continue; }
      if (NODE_WAS[i]) {
        NODE_WAS[i] = 0;
        api.damageBody(dmg);
        api.fx.shake(4);
        NODE_REVIVE[i] = reviveT;
        if (markReapers) markUpwardPetals(bul, n.x, n.y);
      }
      NODE_REVIVE[i] -= CFG.DT;
      if (NODE_REVIVE[i] <= 0) {         // the flower regrows the tip: targets never run out before HP does
        n.alive = true; n.hp = n.maxHp; n.open = false; n.fuseT = 0;
        NODE_WAS[i] = 1;
        api.fx.puff(n.x, n.y, 14);
      }
    }
  }

  // Tag the petals a tendril bloom just produced. bul.p1 is unused by LINEAR bullets (the pool only
  // reads p1 for ACCEL and GRAVITY), so it is free storage and costs nothing per frame.
  function markUpwardPetals(bul, nx, ny) {
    for (let i = 0; i < bul.n; i++) {
      if (bul.faction[i] !== FACT.PLAYER || bul.type[i] !== T.PETAL) continue;
      if (bul.age[i] !== 0) continue;                 // spawned this very tick and not yet integrated
      const dx = bul.x[i] - nx, dy = bul.y[i] - ny;
      if (dx * dx + dy * dy > 16) continue;           // 4px: they spawn exactly at the tendril tip
      bul.p1[i] = 1;                                  // 1 = "this petal burns hanging bullets"
    }
  }

  // THE VALVE ITSELF. Two passes so no index can ever go stale mid-kill:
  //   pass A gathers reaper positions + an AABB, pass B walks enemy bullets backwards and kills.
  // The AABB is the whole reason this is affordable at four-figure bullet counts.
  function reaperSweep(B, api) {
    const bul = api.bul;
    let rn = 0;
    let minx = 1e9, maxx = -1e9, miny = 1e9, maxy = -1e9;
    for (let i = 0; i < bul.n; i++) {
      if (rn >= REAP_CAP) break;
      if (bul.faction[i] !== FACT.PLAYER || bul.p1[i] !== 1 || bul.type[i] !== T.PETAL) continue;
      const x = bul.x[i], y = bul.y[i];
      SCX[rn] = x; SCY[rn] = y; rn++;
      if (x < minx) minx = x; if (x > maxx) maxx = x;
      if (y < miny) miny = y; if (y > maxy) maxy = y;
    }
    if (rn === 0) return;
    minx -= REAP_R; maxx += REAP_R; miny -= REAP_R; maxy += REAP_R;
    let popped = B.s.reapN | 0;
    for (let k = bul.n - 1; k >= 0; k--) {
      if (bul.faction[k] !== FACT.ENEMY) continue;
      if (bul.flags[k] & FL.AMBER) continue;          // amber never yields to anything. Ever.
      const bx = bul.x[k], by = bul.y[k];
      if (bx < minx || bx > maxx || by < miny || by > maxy) continue;
      for (let j = 0; j < rn; j++) {
        const dx = bx - SCX[j], dy = by - SCY[j];
        if (dx * dx + dy * dy > REAP_R2) continue;
        popped++;
        if ((popped & 3) === 0) {                      // 1 spark per 4 kills: spectacle, not a particle storm
          api.fx.particle(bx, by, dx * 3, dy * 3 - 40, 0.34, 2.2, RGB_CYAN, 0.90);
        }
        bul.kill(k);                                   // safe: kill() swaps the LAST element down, and
        break;                                         // we are walking backwards, so it is already visited
      }
    }
    B.s.reapN = popped & 1023;
  }

  // Kill every hanging enemy bullet inside a radius. Used only by a MORTAR blue bloom in P2 — the
  // second half of "take the window or drown", and the payoff has to be VISIBLE to be worth taking.
  function clearRadius(api, cx, cy, r) {
    const bul = api.bul, r2 = r * r;
    let n = 0;
    for (let k = bul.n - 1; k >= 0; k--) {
      if (bul.faction[k] !== FACT.ENEMY) continue;
      if (bul.flags[k] & FL.AMBER) continue;
      const dx = bul.x[k] - cx, dy = bul.y[k] - cy;
      if (dx * dx + dy * dy > r2) continue;
      n++;
      if ((n & 7) === 0) api.fx.particle(bul.x[k], bul.y[k], dx * 1.6, dy * 1.6, 0.40, 2.4, RGB_CYAN, 0.92);
      bul.kill(k);
    }
    return n;
  }

  // Alternating-side add spawner. Returns the new side index.
  function spawnSideAdd(api, name, side, homeY) {
    const x = side === 0 ? 200 : CFG.W - 200;       // 200px in: on screen, but never on top of the player
    api.spawnAdd(name, x, -34, { homeX: x, homeY: homeY, delay: 0.6, enterT: 0.9 });
    return side === 0 ? 1 : 0;
  }

  // ============================================================================================
  // PHASE 1 — "BLOOM"   (100% -> 70%, budget 40s)
  // The idea: the sky fills faster than you can dodge, and the ONLY way to open space is to convert.
  // ============================================================================================
  const PHASE_BLOOM = {
    name: 'BLOOM',
    budget: 40,
    hpFrac: 0.70,
    bodyVulnerable: false,        // the head is out of reach; the fringe is the fight
    enter(B, api) {
      B.x = CFG.W / 2; B.y = 150;                     // spec §8.3: body centre (640,150)
      B.s.burstT = 1.2;                               // one beat of grace before the first curtain
      B.s.burstPhase = 0;
      B.s.sparkT = 0.7;
      B.s.drumT = 3.0;
      B.s.side = 0;
      B.s.reapN = 0;
      B.s.droop = 0;
      NODE_WAS.fill(1); NODE_REVIVE.fill(0);
      // Six tendril tips across the LOWER arc (20deg..160deg, +y is down) — a hanging fringe, never a
      // ring, because a ring would put targets above the head where no petal can reach them.
      for (let i = 0; i < 6; i++) {
        B.nodes.push(api.makeNode(U.deg(20 + i * 28), NODE_DIST, NODE_HP_P1, D_TENDRIL));
      }
    },
    update(B, dt, api) {
      // slow drift in cloud: never fast enough to make a lit tendril hard to reach
      B.x = CFG.W / 2 + U.fsin(B.t * 0.35) * 70;
      B.y = 150 + U.fsin(B.t * 0.60) * 14;

      reapNodeDeaths(B, api, P1_NODE_DMG, P1_REVIVE, true);
      api.cycleNodes(dt, 'sequence', P1_WIN, P1_GAP);   // spec: a wave, 0.60s window, 0.30s apart

      // the 64-bullet gravity burst
      B.s.burstT -= dt;
      if (B.s.burstT <= 0) {
        B.s.burstT += P1_BURST_EVERY;
        B.s.burstPhase += P1_BURST_PHASE_STEP;         // interleave, don't stack
        D_BLOOM.phase = B.s.burstPhase;
        api.emitPattern(D_BLOOM, B.x, B.y, 0);
        api.fx.shake(2.2);
        api.audio.salute(B.x);
      }

      // ---- LAW 1: the petal supply, on a metronome ----
      B.s.sparkT -= dt;
      if (B.s.sparkT <= 0) { B.s.sparkT += P1_SPARK_EVERY; B.s.side = spawnSideAdd(api, 'SPARK', B.s.side, 250); }
      B.s.drumT -= dt;
      if (B.s.drumT <= 0) {
        B.s.drumT += P1_DRUM_EVERY;
        const dx = U.rngRun.range(340, 940);           // 24 petals, wherever the fight needs opening
        api.spawnAdd('DRUM', dx, -40, { homeX: dx, homeY: 300, delay: 1.0 });
      }

      reaperSweep(B, api);
    },
  };

  // ============================================================================================
  // PHASE 2 — "RAIN"   (70% -> 45%, budget 40s)
  // The idea: a curtain you cannot outrun, and eight 1.60s invitations that are the only umbrella.
  // Take the MORTAR and the sky opens 240px wide. Miss it and it adds sixty more bullets to the rain.
  // ============================================================================================
  const PHASE_RAIN = {
    name: 'RAIN',
    budget: 40,
    hpFrac: 0.45,
    bodyVulnerable: false,
    enter(B, api) {
      B.s.drizT = 0;
      B.s.mortarT = 1.6;
      B.s.mortarLeft = P2_MORTARS;
      B.s.sparkT = 0.8;
      B.s.beamT = 3.0;
      B.s.sweepT = 0;
      B.s.side = 0;
      B.s.droop = 0;
      NODE_WAS.fill(1); NODE_REVIVE.fill(0);
      for (let i = 0; i < P2_MORTARS; i++) { MORT_REF[i] = null; MORT_OPEN[i] = 0; MORT_ID[i] = 0; }
      // Three tips only, pulled in tight — the boss is coming down into the player's half and a
      // 250px fringe would fence them in rather than give them something to shoot.
      for (let i = 0; i < 3; i++) {
        B.nodes.push(api.makeNode(U.deg(35 + i * 55), NODE_DIST_LOW, NODE_HP_P2, D_NODE_RING));
      }
    },
    update(B, dt, api) {
      const bul = api.bul;
      B.y = U.approach(B.y, P2_Y, 26 * dt);            // descends at the same 26 px/s it will fall at in P4
      B.s.sweepT += dt;
      B.x = CFG.W / 2 + U.fsin(B.s.sweepT * P2_SWEEP_W) * P2_SWEEP_A;   // spec: sweeps 480<->800

      reapNodeDeaths(B, api, P2_NODE_DMG, P2_REVIVE, false);
      api.cycleNodes(dt, 'sequence', 0.55, 0.45);

      // ---- the drizzle: 18/s, random x, straight down, slow ----
      B.s.drizT += dt;
      while (B.s.drizT >= P2_DRIZZLE_DT) {
        B.s.drizT -= P2_DRIZZLE_DT;
        bul.spawn(U.rngRun.range(10, CFG.W - 10), -20, 0, P2_DRIZZLE_SPD, T.CIRCLE, FACT.ENEMY, OPT_DRIZZLE);
      }

      // ---- MORTAR tracking: the blue bloom is scripted, the red bloom is the engine's ----
      // A red bloom needs no code: the MORTAR's own 60-bullet flower IS the "+60 to the curtain"
      // punishment. Only the blue side is bespoke.
      for (let k = 0; k < P2_MORTARS; k++) {
        const e = MORT_REF[k];
        if (!e) continue;
        if (e.alive && e.id === MORT_ID[k]) {
          MORT_X[k] = e.x; MORT_Y[k] = e.y;
          if (e.fuseOpen) MORT_OPEN[k] = 1;
          else MORT_OPEN[k] = 0;                       // closed while still alive = the window expired
          continue;
        }
        if (MORT_OPEN[k]) {                            // it died with its window open: that is a blue bloom
          const cleared = clearRadius(api, MORT_X[k], MORT_Y[k], P2_MORTAR_CLEAR_R);
          api.damageBody(P2_MORTAR_DMG);
          api.fx.bloomFlash(MORT_X[k], MORT_Y[k], 60, true);
          api.fx.shake(7);
          api.fx.wind(MORT_X[k], MORT_Y[k]);
          api.emit('kamuro_umbrella', { x: MORT_X[k], y: MORT_Y[k], cleared });
        }
        MORT_REF[k] = null; MORT_OPEN[k] = 0;
      }
      B.s.mortarT -= dt;
      if (B.s.mortarT <= 0 && B.s.mortarLeft > 0) {
        B.s.mortarT += P2_MORTAR_EVERY;
        B.s.mortarLeft--;
        const mx = U.rngRun.range(240, CFG.W - 240);
        const m = api.spawnAdd('MORTAR', mx, -50, { homeX: mx, homeY: 0, delay: 1.1, mv: 'descend', mvSpeed: 62 });
        if (m) {
          for (let k = 0; k < P2_MORTARS; k++) {
            if (MORT_REF[k]) continue;
            MORT_REF[k] = m; MORT_ID[k] = m.id; MORT_OPEN[k] = 0; MORT_X[k] = m.x; MORT_Y[k] = m.y;
            break;
          }
        }
      }

      // ---- LAW 1 seed: a MORTAR costs 160hp and the gun only lands 96 in its window ----
      B.s.sparkT -= dt;
      if (B.s.sparkT <= 0) { B.s.sparkT += P2_SPARK_EVERY; B.s.side = spawnSideAdd(api, 'SPARK', B.s.side | 0, 210); }

      // ---- amber: the honest floor. Two telegraphed blades sweeping through the rain. ----
      B.s.beamT -= dt;
      if (B.s.beamT <= 0) {
        B.s.beamT += P2_BEAM_EVERY;
        const base = api.aim(B.x, B.y);
        OPT_BEAM.sweep = 0.22;                          // rad/s: slow enough to walk around, fast enough to matter
        api.beam(B.x, B.y, base - U.deg(24), OPT_BEAM);
        OPT_BEAM.sweep = -0.22;
        api.beam(B.x, B.y, base + U.deg(24), OPT_BEAM);
      }
    },
  };

  // ============================================================================================
  // PHASE 3 — "THE HANGING GARDEN"   (45% -> 20%, budget 35s)
  // The idea, and the best one in the game: the boss stops firing and THE BULLETS BECOME THE SHELLS.
  // Forty of them grow white rings. Hit one inside its window and it and its six unborn children are
  // yours. Miss and it fires all six at you. Same law, no new system, applied to the sky itself.
  // ============================================================================================
  const PHASE_GARDEN = {
    name: 'THE HANGING GARDEN',
    budget: 35,
    hpFrac: 0.20,
    bodyVulnerable: false,
    enter(B, api) {
      // The phase-break relief beat wipes every enemy bullet, so the "screen already at 1400 hanging
      // bullets" has to be planted here, on screen, as four visible exhales. Then: silence.
      B.s.plantT = 0.6;
      B.s.plantLeft = P3_PLANTS;
      B.s.plantPhase = 0;
      B.s.ringT = 3.0;                                  // no ring event until the garden actually exists
      B.s.topT = P3_TOPUP_EVERY;
      B.s.sparkT = 1.2;
      B.s.candleT = 2.6;
      B.s.side = 0;
      B.s.droop = 0;
      NODE_WAS.fill(1); NODE_REVIVE.fill(0);
      for (let i = 0; i < 6; i++) {
        B.nodes.push(api.makeNode(U.deg(20 + i * 28), NODE_DIST, NODE_HP_P3, D_NODE_RING));
      }
    },
    update(B, dt, api) {
      const bul = api.bul;
      B.y = U.approach(B.y, P3_Y, 55 * dt);             // rises back so the whole garden is legible
      B.x = CFG.W / 2 + U.fsin(B.t * 0.25) * 90;

      reapNodeDeaths(B, api, P3_NODE_DMG, P3_REVIVE, false);
      api.cycleNodes(dt, 'sequence', P3_WIN, P3_GAP);

      // ---- planting: four exhales, then the boss goes quiet for the rest of the phase ----
      if (B.s.plantLeft > 0) {
        B.s.plantT -= dt;
        if (B.s.plantT <= 0) {
          B.s.plantT += P3_PLANT_EVERY;
          B.s.plantLeft--;
          B.s.plantPhase += U.deg(11);                  // offset each exhale so the lattice is a weave
          D_PLANT.phase = B.s.plantPhase;
          api.emitPattern(D_PLANT, B.x, B.y, 0);
          api.fx.shake(3);
          api.audio.salute(B.x);
        }
      } else {
        // a slow refill, so a player who converts the whole garden is rewarded rather than stranded
        B.s.topT -= dt;
        if (B.s.topT <= 0) {
          B.s.topT += P3_TOPUP_EVERY;
          B.s.plantPhase += U.deg(7);
          D_TOPUP.phase = B.s.plantPhase;
          api.emitPattern(D_TOPUP, B.x, B.y, 0);
        }
      }

      // ---- THE RING EVENT: 40 hanging bullets each grow a white fuse ring ----
      B.s.ringT -= dt;
      if (B.s.ringT <= 0) {
        B.s.ringT += P3_RING_EVERY;
        let placed = 0, tries = 0;
        const n = bul.n;
        while (placed < P3_RING_N && tries < 600) {     // 600 tries: bounded work even on an empty screen
          tries++;
          const i = (U.rngRun.next() * n) | 0;
          if (i >= n) continue;
          if (bul.faction[i] !== FACT.ENEMY) continue;
          if (bul.flags[i] & (FL.AMBER | FL.FUSED)) continue;
          if (bul.y[i] < 30 || bul.y[i] > CFG.H - 20) continue;   // a ring you cannot see is a promise broken
          if (bul.x[i] < 10 || bul.x[i] > CFG.W - 10) continue;
          bul.flags[i] |= FL.FUSED;
          bul.fuseT[i] = bul.fuseMax[i] = P3_RING_WIN;
          placed++;
        }
        if (placed) {
          WHISTLE_OBJ.x = B.x;                          // ONE whistle for the whole event. Forty would be noise.
          api.audio.whistle(WHISTLE_OBJ);
          api.emit('garden_bloom', { rings: placed });
        }
      }

      // ---- conversion: any player projectile touching a ringed bullet inside its window ----
      // Gather player-bullet positions once (a single pass), then test the <=40 ringed bullets
      // against that small list. The naive nesting would be 40 x bul.n and would cost real frames.
      let pn = 0;
      for (let i = 0; i < bul.n; i++) {
        if (pn >= REAP_CAP) break;
        if (bul.faction[i] !== FACT.PLAYER) continue;
        SCX[pn] = bul.x[i]; SCY[pn] = bul.y[i]; pn++;
      }
      if (pn) {
        for (let i = bul.n - 1; i >= 0; i--) {          // backwards: Fuse.convertBullet swap-removes
          if (!(bul.flags[i] & FL.FUSED)) continue;
          const bx = bul.x[i], by = bul.y[i];
          const rr = bul.r[i] + CONV_SKIN, rr2 = rr * rr;
          for (let j = 0; j < pn; j++) {
            const dx = SCX[j] - bx, dy = SCY[j] - by;
            if (dx * dx + dy * dy > rr2) continue;
            // The shot is NOT consumed: a ringed bullet is a shell, not armour, so one petal can rake
            // a whole line of them. It also means no index in this loop can ever go stale.
            Fuse.convertBullet(i);
            break;
          }
        }
      }

      // ---- LAW 1: the garden is a petal source, but it must never be the only one ----
      B.s.sparkT -= dt;
      if (B.s.sparkT <= 0) { B.s.sparkT += P3_SPARK_EVERY; B.s.side = spawnSideAdd(api, 'SPARK', B.s.side, 260); }
      B.s.candleT -= dt;
      if (B.s.candleT <= 0) {
        B.s.candleT += P3_CANDLE_EVERY;
        const cx = U.rngRun.range(300, CFG.W - 300);
        api.spawnAdd('CANDLE', cx, -30, { homeX: cx, homeY: 190, delay: 0.8, mv: 'static' });
      }
    },
  };

  // ============================================================================================
  // PHASE 4 — "KAMURO FALLS"   (20% -> 0%, budget 24s)
  // The idea: no more cleverness. It is falling on the city and you have fifteen seconds.
  // If it lands, nobody dies on screen — the lights just go out, and that is worse.
  // ============================================================================================
  const PHASE_FALLS = {
    name: 'KAMURO FALLS',
    budget: 24,
    hpFrac: 0,                     // the last phase: 0 HP ends the fight
    bodyVulnerable: true,          // the head is finally in reach
    gunVulnerable: true,           // and so is the peashooter. This is the one phase where it is a weapon.
    enter(B, api) {
      B.x = CFG.W / 2;
      B.y = P4_Y0;                                      // spec: falls from y=300
      B.s.droop = 0;
      B.s.willowT = 0;
      B.s.sparkT = 0.6;
      B.s.blackT = 0;
      B.s.side = 0;
      NODE_WAS.fill(1); NODE_REVIVE.fill(0);
      // It sheds four tendrils. They detach and hover at the corners — they no longer travel with the
      // body, which is why this phase repositions its nodes by hand after cycleNodes().
      for (let i = 0; i < 4; i++) {
        B.nodes.push(api.makeNode(U.deg(45 + i * 90), 260, NODE_HP_P4, D_NODE_RING));
      }
    },
    update(B, dt, api) {
      const bul = api.bul;

      // ---- the failure beat: total dark, one lost life, and it climbs back up ----
      if (B.s.blackT > 0) {
        B.s.blackT -= dt;
        api.cycleNodes(dt, 'sequence', P4_WIN, P4_GAP);
        for (let i = 0; i < B.nodes.length; i++) { B.nodes[i].x = CORNER_X[i]; B.nodes[i].y = CORNER_Y[i]; }
        return;
      }

      B.y += P4_FALL * dt;                              // spec: 26 px/s
      B.x = CFG.W / 2 + U.fsin(B.t * 0.5) * 40;         // it wallows as it comes down
      B.s.droop = U.approach(B.s.droop, 1, dt / 2.0);   // 2s to wilt fully: the silhouette collapses

      reapNodeDeaths(B, api, P4_NODE_DMG, P4_REVIVE, false);
      api.cycleNodes(dt, 'sequence', P4_WIN, P4_GAP);
      for (let i = 0; i < B.nodes.length; i++) {        // pin the shed tendrils; the body no longer owns them
        B.nodes[i].x = CORNER_X[i]; B.nodes[i].y = CORNER_Y[i];
      }

      // ---- willow curtains from the four corners: 12 b/s each, gravity profile ----
      B.s.willowT += dt;
      while (B.s.willowT >= P4_WILLOW_DT) {
        B.s.willowT -= P4_WILLOW_DT;
        for (let i = 0; i < 4; i++) {
          const n = B.nodes[i];
          if (!n.alive) continue;                       // kill a tendril, silence its curtain. Direct feedback.
          // fan downward and slightly inward: a willow hangs, it does not spray
          const a = U.deg(60) + U.rngRun.range(0, U.deg(60));
          const sp = 250;
          bul.spawn(CORNER_X[i], CORNER_Y[i], U.fcos(a) * sp * (CORNER_X[i] < 640 ? 1 : -1),
                    U.fsin(a) * sp, T.CIRCLE, FACT.ENEMY, OPT_WILLOW);
        }
      }

      // ---- LAW 1, to the very last second ----
      B.s.sparkT -= dt;
      if (B.s.sparkT <= 0) {
        B.s.sparkT += P4_SPARK_EVERY;
        const x = B.s.side === 0 ? 300 : CFG.W - 300;
        B.s.side = B.s.side === 0 ? 1 : 0;
        // rising from below, the Act III signature — and it puts the petal source in your own lane
        api.spawnAdd('SPARK', x, CFG.H + 40, { homeX: x, homeY: 470, delay: 0.5, enterT: 1.0 });
      }

      // ---- the skyline ----
      if (B.y >= P4_Y_DEAD) land(B, api);
    },
  };

  // The city goes out. Not a game-over — a cost. Spec §8.3: 1 life, 2.0s of black, and it rises again
  // at 30% HP with a 20s budget. Fail-forward, always; the failure state here is EMOTIONAL.
  function land(B, api) {
    B.s.blackT = P4_BLACKOUT;
    B.s.droop = 0.35;

    const p = api.player;
    if (p.lives > 0) p.lives -= 1;
    p.invuln = Math.max(p.invuln, P4_BLACKOUT + 0.8);   // you do not also get shot in the dark
    Fuse.onPlayerHit();                                  // costs exactly one applause tier, never the run

    // Everything on screen becomes a harmless drifting spark — the same relief grammar the engine uses
    // at a phase break, because this IS a break: the fight restarts from the top of the fall.
    const bul = api.bul;
    for (let k = bul.n - 1; k >= 0; k--) {
      if (bul.faction[k] !== FACT.ENEMY) continue;
      bul.type[k] = T.SPARKLE; bul.faction[k] = 2;      // faction 2 = inert
      bul.vx[k] *= 0.2; bul.vy[k] = -30 - (k & 31);
      bul.life[k] = 0.9; bul.age[k] = 0; bul.beh[k] = BEH.LINEAR; bul.flags[k] = 0;
    }

    B.hp = Math.max(B.hp, B.maxHp * P4_RESTART_HP);      // spec: it rises again at 30%
    B.y = 200;                                           // snapped during the blackout, so it is unseen
    B.phaseElapsed = PHASE_FALLS.budget - P4_RESTART_BUDGET;  // 24 - 20 = a fresh 20s to finish the job

    api.fx.hitstop(CFG.HITSTOP_DEATH);
    api.fx.shake(10);
    api.fx.banner('THE CITY GOES DARK');
    api.audio.death();
    api.emit('kamuro_landed', { blackout: P4_BLACKOUT });
  }

  // ============================================================================================
  // DRAWING — every frame, no gradients, no shadowBlur, no filter.
  // The head is built once as 72 baked strands and drawn as TWO batched paths plus one arc path.
  // Three fills for a 420px chrysanthemum is the entire reason this can share a frame with 1900 bullets.
  // ============================================================================================
  function drawHead(B, ctx) {
    const droop = B.s && B.s.droop ? B.s.droop : 0;
    const R = VIS_R * (1 - 0.10 * droop);              // it shrinks slightly as it collapses
    const t = B.t;

    ctx.save();
    ctx.translate(B.x, B.y);
    ctx.rotate(U.fsin(t * 0.11) * 0.05 + droop * 0.12);   // a slow list, then a wilt
    ctx.globalCompositeOperation = 'lighter';

    const r0 = R * 0.17;                                // strands leave the core, not the centre point

    // -- pass 1: the outer corona. Wide, dim, one fill. --
    ctx.beginPath();
    for (let i = 0; i < N_STRAND; i++) {
      const a = SA[i] + U.fsin(t * 0.5 + SPH[i]) * 0.014;
      const len = R * SL[i] * (1 + 0.035 * U.fsin(t * 1.6 + SPH[i]));
      const ca = U.fcos(a), sa = U.fsin(a);
      const sag = len * (0.10 + 0.34 * droop);          // "hanging tendrils": every strand droops in +y
      const w = SW[i] * (5.0 + 3.0 * SL[i]);
      ctx.moveTo(ca * r0 - sa * w, sa * r0 + ca * w);
      ctx.lineTo(ca * len, sa * len + sag);
      ctx.lineTo(ca * r0 + sa * w, sa * r0 - ca * w);
    }
    ctx.fillStyle = U.rgba(RGB_GOLD, 0.085);            // low alpha + additive = a corona, not a disc
    ctx.fill();

    // -- pass 2: the hot inner strands. Shorter, narrower, brighter. One fill. --
    ctx.beginPath();
    for (let i = 0; i < N_STRAND; i++) {
      const a = SA[i] + U.fsin(t * 0.5 + SPH[i]) * 0.014;
      const len = R * SL[i] * 0.64;
      const ca = U.fcos(a), sa = U.fsin(a);
      const sag = len * (0.08 + 0.30 * droop);
      const w = SW[i] * 2.1;
      ctx.moveTo(ca * r0 - sa * w, sa * r0 + ca * w);
      ctx.lineTo(ca * len, sa * len + sag);
      ctx.lineTo(ca * r0 + sa * w, sa * r0 - ca * w);
    }
    ctx.fillStyle = U.rgba(RGB_WARM, 0.16);
    ctx.fill();

    // -- pass 3: the tips. "Kamuro" is the drooping gold spark shell; the tips ARE the name. --
    ctx.beginPath();
    for (let i = 0; i < N_STRAND; i++) {
      const a = SA[i] + U.fsin(t * 0.5 + SPH[i]) * 0.014;
      const len = R * SL[i] * (1 + 0.035 * U.fsin(t * 1.6 + SPH[i]));
      const ca = U.fcos(a), sa = U.fsin(a);
      const sag = len * (0.10 + 0.34 * droop);
      const rr = 2.0 + 1.6 * SL[i];
      ctx.moveTo(ca * len + rr, sa * len + sag);
      ctx.arc(ca * len, sa * len + sag, rr, 0, U.TAU);
    }
    ctx.fillStyle = U.rgba(RGB_WARM, 0.50);
    ctx.fill();

    // -- the core: a bright heart with a dark casing, so the silhouette has a centre of mass --
    ctx.beginPath(); ctx.arc(0, 0, R * 0.30, 0, U.TAU);
    ctx.fillStyle = U.rgba(RGB_GOLD, 0.10); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, R * 0.16, 0, U.TAU);
    ctx.fillStyle = U.rgba(RGB_WARM, 0.22); ctx.fill();

    // a corona ring that breathes on the burst cadence — a free telegraph for "it is about to bloom"
    const pulse = 0.34 + 0.020 * U.fsin(t * 2.0);
    ctx.strokeStyle = U.rgba(RGB_GOLD, 0.22); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R * pulse, 0, U.TAU); ctx.stroke();

    if (B.staggerT > 0) {                                // staggered: the whole head washes out
      ctx.beginPath(); ctx.arc(0, 0, R * 0.55, 0, U.TAU);
      ctx.fillStyle = 'rgba(255,255,255,0.10)'; ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = CFG.COL.bossHull;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.105, 0, U.TAU); ctx.fill();
    ctx.strokeStyle = U.hexa(CFG.COL.bossTrim, 0.8); ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, R * 0.105, 0, U.TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';            // sub-full alpha: white at 1.0 means ACT NOW
    ctx.beginPath(); ctx.arc(0, 0, R * 0.040, 0, U.TAU); ctx.fill();

    ctx.restore();
  }

  // The hanging cords: six (or four) drooping strings from the head down to the live tendril tips.
  // Drawn in world space, because in P4 the tips have detached and no longer orbit the body.
  function drawCords(B, ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const sag = 46 + 40 * (B.s && B.s.droop ? B.s.droop : 0);
    for (let pass = 0; pass < 2; pass++) {
      ctx.strokeStyle = pass === 0 ? U.rgba(RGB_GOLD, 0.20) : U.rgba(RGB_WARM, 0.34);
      ctx.lineWidth = pass === 0 ? 5 : 1.4;
      ctx.beginPath();
      for (let i = 0; i < B.nodes.length; i++) {
        const n = B.nodes[i];
        if (!n.alive) continue;
        const mx = (B.x + n.x) * 0.5, my = (B.y + n.y) * 0.5 + sag;
        ctx.moveTo(B.x, B.y);
        ctx.quadraticCurveTo(mx, my, n.x, n.y);
      }
      ctx.stroke();
    }
    // three beads riding each cord — they make a static string read as something GROWING
    ctx.beginPath();
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (!n.alive) continue;
      const mx = (B.x + n.x) * 0.5, my = (B.y + n.y) * 0.5 + sag;
      for (let k = 1; k <= 3; k++) {
        const u = k * 0.25 + 0.10 * U.fsin(B.t * 1.1 + i), v = 1 - u;
        const bx = v * v * B.x + 2 * v * u * mx + u * u * n.x;
        const by = v * v * B.y + 2 * v * u * my + u * u * n.y;
        ctx.moveTo(bx + 2.4, by);
        ctx.arc(bx, by, 2.4, 0, U.TAU);
      }
    }
    ctx.fillStyle = U.rgba(RGB_WARM, 0.45); ctx.fill();
    ctx.restore();
  }

  // P4 overlay: the city coming up to meet it. Faked as eight stacked bands — a per-frame
  // createRadialGradient here would cost more than the entire bullet pool.
  function drawFallOverlay(B, ctx) {
    const prog = U.clamp((B.y - P4_Y0) / (P4_Y_DEAD - P4_Y0), 0, 1);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 8; i++) {
      const a = (0.014 + 0.034 * (i / 7)) * prog;       // every window in the city, turning on
      ctx.fillStyle = U.rgba(RGB_CITY, a);
      ctx.fillRect(0, CFG.H - 24 * (8 - i), CFG.W, 24);
    }
    // the skyline itself: white, low alpha, pulsing. White means ACT NOW and nothing here means it more.
    const pulseA = 0.16 + 0.16 * Math.abs(U.fsin(B.t * U.TAU * 2.2)) * prog;
    ctx.strokeStyle = 'rgba(255,255,255,' + pulseA.toFixed(3) + ')';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, P4_Y_DEAD); ctx.lineTo(CFG.W, P4_Y_DEAD); ctx.stroke();
    ctx.restore();

    if (B.s.blackT > 0) {                                // the lights are out. Two seconds of nothing.
      const a = U.clamp(B.s.blackT / 0.6, 0, 1);
      ctx.fillStyle = U.rgba(RGB_BLACK, a);
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }
  }

  // ============================================================================================
  return {
    name: 'KAMURO',
    hp: MAX_HP,
    x: CFG.W / 2, y: 150,          // spec §8.3: body centre (640,150)
    bodyR: BODY_R,
    phases: [PHASE_BLOOM, PHASE_RAIN, PHASE_GARDEN, PHASE_FALLS],

    // The engine draws only def.draw() and then the node rings, so the per-phase overlay is
    // dispatched from here rather than from a separate phase hook that nothing would call.
    draw(B, ctx) {
      drawCords(B, ctx);
      drawHead(B, ctx);
      if (B.phase === 3) drawFallOverlay(B, ctx);
    },
  };
})();
