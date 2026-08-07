// FINALE — BOSS I: ROMAN CANDLE (Act I, spec §8.1)
//
// A 30-metre brass tube standing on the pier, tilting like a cannon. A wrought-iron collar bolted
// around its middle is the gimbal, and that collar carries the 6 fuse nodes. Its mouth glows.
//
// Three phases, three ideas, no HP bars in disguise:
//   P1 AIMED COMETS — one slow telegraphed comet at a time. Teaches "watch the mouth".
//   P2 THE STAIRCASE — descending-gap walls you thread, every 6th one lying to you.
//   P3 OVERCHARGE   — a 12s countdown, every node permanently lit, DRUMs as your ammo.
//
// LAW 1 (petal-only armour): every phase runs a hard add cadence — SPARK every half-bar in P1,
// 2 CANDLE + a SPARK escort per wall in P2, a DRUM every 4s plus SPARK filler in P3. The player is
// never holding a gun that cannot reach anything.
// LAW 2 (no sponges): P1/P2 are node-clear phases with a 40s budget; P3 is a countdown, not a bar.
window.BossRomanCandle = (() => {
  const TAU = U.TAU;
  const C = CFG.COL;

  // ---------- act I tempo (124 BPM) ----------
  const BEAT = 0.4839;                 // s. Act I beat, from CFG.ACTS[0].bpm = 124.
  const BAR = BEAT * 4;                // 1.9355s

  // ---------- silhouette geometry ----------
  // The collar sits at (B.x, B.y) = (640,190) and is the pivot: the tube swings THROUGH the ring, so
  // the nodes never move and the player can memorise where the six windows live.
  const BACK = 560;                    // px of tube behind the pivot. Long enough to leave the top of frame in P1.
  const LEN_P1 = 200;                  // px muzzle reach in P1: puts the mouth at y=390 straight down — far enough
                                       // below the node ring that comets never spawn on top of a fuse window.
  const LEN_P2 = 670;                  // px in P2: the mouth clears the LEFT edge (640-670 = -30), so the wall that
                                       // walks in from off-screen reads as having come out of it.
  const SLEW = U.deg(170);             // deg/s aim rate: a full ±38° swing (76°) resolves in 0.45s, per spec.
  const LEN_RATE = 900;                // px/s of tube extension between phases — 0.56s for the P1->P2 swing.
  const TILT_MAX = U.deg(38);          // spec: the tube tilts ±38° from vertical.
  const DOWN = Math.PI / 2;            // straight-down aim in screen coords (+y is down)
  const P2_DIR = Math.PI - 0.085;      // P2 rest angle: 4.9° off true horizontal so the 1200px tube slants
                                       // out of the play space instead of lying flat across it.

  const NODE_R = 96;                   // spec: node ring radius 96 around (640,190)
  const HALF_W_BREECH = 56, HALF_W_MUZZLE = 40, HALF_W_FLARE = 58;

  // ---------- body HP accounting ----------
  // The body has no direct health pool in P1/P2 — the bar is a readout of how many nodes have fallen.
  // 6 x 136 = 816 = exactly 34% of 2400, so the bar lands on the P1 threshold as the last node pops.
  const BODY_PER_NODE_P1 = 136;
  const BODY_PER_NODE_P2 = 132;        // 6 x 132 = 792 = exactly 33% -> bar lands on the P2 threshold.
  const BODY_PER_NODE_P3 = 120;        // deliberately short of the remainder so the bar never reads empty mid-phase.

  // ---------- colours ----------
  // Brass and wrought iron only. Nothing here may be mistaken for a projectile: the brass tones are
  // dark and desaturated, the only saturated colours on the body are bossTrim pink and pure white,
  // and white appears ONLY as the muzzle telegraph (= act now), per the colour law.
  const BRASS = '#7A5C2E', BRASS_HI = '#A8823C', BRASS_LO = '#3E2E14', BRASS_RIM = '#C7A05A';
  const IRON = '#12151F', IRON_HI = '#39415A', IRON_RIM = '#5A6480';
  const TRIM = C.bossTrim;             // '#FFB6E6' — the idle ember in the bore
  const DANGER = C.danger;             // '#FF2D6F' — decoy-gap flicker only

  const RGB_WHITE = U.hex2rgb('#FFFFFF');
  const RGB_TRIM = U.hex2rgb(C.bossTrim);

  // ---------- volley descriptors (DATA, never code — see emitters.js) ----------
  // Node volleys: what a node's blue bloom hands back. Rings, not fans, so the petals rake sideways
  // into the neighbouring nodes — chaining around the collar is the intended flex.
  const NODE_VOLLEY_P1 = { kind: 'ring', n: 10, speed: 210 };
  const NODE_VOLLEY_P2 = { kind: 'ring', n: 12, speed: 220 };
  const NODE_VOLLEY_P3 = { kind: 'ring', n: 14, speed: 200 };

  const COMET = { kind: 'aimed', n: 1, speed: 300, type: Pool.T.COMET, r: 9 };   // spec §8.1 P1
  // The 8-bar punctuation. Fat COMETs, not plain circles: six of them at 280 px/s need to read as one
  // recognisable object arriving, and the comet sprite is the only bullet in the game with a tail.
  const FAN6 = { kind: 'fan', n: 6, spread: 40, speed: 280, aimed: true, type: Pool.T.COMET, r: 9 };
  // Walls: 18 slots, 40px apart, 210 px/s rightward, spawned just off the left edge.
  const WALL = { kind: 'wall', n: 18, spacing: 40, gapIndex: 0, gapSlots: 2, speed: 210, angle: 0, y0: 24 };
  // Segment wall: same descriptor with no gap of its own, used to build the double wall's two holes.
  const SEG = { kind: 'wall', n: 1, spacing: 40, gapIndex: 0, gapSlots: 0, speed: 210, angle: 0, y0: 24 };
  const SPIRAL = { kind: 'spiral', arms: 3, angle: 0, speed: 195, r: 7 };        // P3 overcharge
  const RING120 = { kind: 'ring', n: 120, speed: 240, phase: 0, aimed: false, r: 7 };  // P3 fail-forward
  const WIN_BURST = { kind: 'ring', n: 60, speed: 200, phase: 0 };               // P3 victory spectacle

  // ---------- wall constants ----------
  const WALL_N = 18, WALL_SPACING = 40, WALL_Y0 = 24, WALL_SPEED = 210;
  const WALL_X = -24;                  // spawn just off the left edge so the column arrives whole
  const WALL_GAPSLOTS = 2;             // 2 missing slots = a ~120px centre-to-centre hole. Spec's 90px gap,
                                       // rounded to the slot grid so the gap always lands on the lattice.
  const GAP_MAX = WALL_N - WALL_GAPSLOTS;      // 16: highest legal top-slot for the hole
  const WALL_EVERY = 1.2;              // s between walls (spec)
  const WALL_TELE = 0.50;              // s of left-edge warning before a wall exists. A wall you cannot
                                       // pre-read is a memoriser, not a dodge.
  const DECOY_CLOSE = 0.40;            // s before the fake gap seals (spec)
  const DECOY_SPAN = 5;                // slots between the two gaps = 200px (spec)

  // ---------- phase clocks ----------
  const SHOT_PERIOD = BEAT * 1.5;      // 0.726s — spec's "exactly 1.5 beats". One comet per one-and-a-half beats.
  const SHOT_TELE = 0.36;              // s of locked white muzzle ring before the comet leaves. Aim is FROZEN
                                       // during it, so the telegraph is honest: what it shows is what it fires.
  const FAN_EVERY = BAR * 8;           // 15.48s — spec's "every 8 bars"
  const FAN_TELE = 0.90;               // s: a 6-comet fan needs twice the warning of a single comet.
  const FAN_RECOVER = 1.2;             // s recovery where 3 nodes light at once — the DPS window (spec).
  const ADD_EVERY_P1 = BAR * 0.5;      // 0.968s — spec's "2 SPARK per bar", alternating sides.

  const P3_TIMER = 12.0;               // s countdown (spec)
  const P3_REARM = 9.0;                // s on the re-armed timer (spec)
  const P3_DRUM_EVERY = 4.0;           // s (spec) — the DRUM's 24-petal bloom is the intended node-killer
  const P3_SPARK_EVERY = 2.6;          // s. NOT in spec: a chain-keeper between DRUMs, because a 4s gap with
                                       // zero petal source is 4s of the player holding a useless gun (Law 1).
  const SPIRAL_RATE = U.deg(68);       // deg/s rotation (spec)
  const SPIRAL_HZ = 12;                // emissions/s/arm (spec) -> 36 bullets/s total, ~130 live at steady state
  const SAFE_WEDGE = U.deg(40);        // the fail-forward ring's survivable wedge (spec)
  const WIN_TIME = 2.5;                // s of pure spectacle before the fight ends (spec)
  const WIN_BURSTS = 10;               // 10 x 60 = 600 petals (spec)
  const WIN_BURST_GAP = 0.16;          // s between bursts: all 600 are out inside 1.6s, then it just hangs.

  // ---------- preallocated spawn option objects (mutated, never re-created) ----------
  const OPT_SPARK = { homeX: 0, homeY: 240, delay: 0.5, enterT: 0.7 };
  const OPT_CANDLE = { homeX: 0, homeY: 0, delay: 0.35, enterT: 0.6, mv: 'enterHold' };
  const OPT_DRUM = { homeX: 0, homeY: 300, delay: 0.55, enterT: 0.8 };

  // ============================================================================================
  // shared tube state — every phase's enter() calls this, and def.draw reads it
  // ============================================================================================
  function initTube(B, dir, len) {
    const s = B.s;
    s.dir = dir; s.dirTarget = dir;
    s.len = len; s.lenTarget = len;
    s.glow = 0.35;      // 0..1 idle ember in the bore
    s.charge = 0;       // 0..1 white telegraph ring at the mouth. WHITE = act now.
    s.hot = 0;          // 0..1 white-hot barrel (P3 only)
    s.recoil = 0;       // px the tube is pulled back along its own axis
    s.mx = B.x + U.fcos(dir) * len;
    s.my = B.y + U.fsin(dir) * len;
  }

  // Aim/extension easing + recoil decay. Zero allocation, called once per phase update.
  function tubeTick(B, dt) {
    const s = B.s;
    const d = U.angDiff(s.dir, s.dirTarget);
    const step = SLEW * dt;
    s.dir += d > step ? step : (d < -step ? -step : d);
    s.len = U.approach(s.len, s.lenTarget, LEN_RATE * dt);
    s.recoil = U.approach(s.recoil, 0, 110 * dt);       // 110 px/s: the kick settles in ~0.25s, one beat-ish
    const reach = s.len - s.recoil;
    s.mx = B.x + U.fcos(s.dir) * reach;
    s.my = B.y + U.fsin(s.dir) * reach;
  }

  // Clamp an aim angle to the tube's mechanical tilt limit, measured from straight down.
  function clampTilt(a) {
    const d = U.angDiff(DOWN, a);
    return DOWN + (d > TILT_MAX ? TILT_MAX : (d < -TILT_MAX ? -TILT_MAX : d));
  }

  // Two sparks of muzzle debris. Fixed count so this can never become a per-frame particle loop.
  function muzzleSparks(api, s, n) {
    for (let i = 0; i < n; i++) {
      const a = s.dir + U.rngFx.range(-0.5, 0.5);
      const sp = U.rngFx.range(90, 260);
      api.fx.particle(s.mx, s.my, U.fcos(a) * sp, U.fsin(a) * sp,
                      U.rngFx.range(0.18, 0.42), U.rngFx.range(1.5, 3.2), RGB_TRIM, 0.90);
    }
  }

  // Body HP readout: the bar tracks fallen nodes, so it must be driven from node deaths.
  function drainForDeadNodes(B, api, per) {
    const live = api.liveNodes();
    const lost = B.s.lastLive - live;
    if (lost > 0) {
      api.damageBody(per * lost);
      B.s.lastLive = live;
      api.fx.shake(3);
    }
  }

  // ============================================================================================
  // PHASE 1 — AIMED COMETS
  // ============================================================================================
  const P1 = {
    name: 'AIMED COMETS',
    budget: 40,
    hpFrac: 0.66,
    nodesToClear: true,
    bodyVulnerable: false,
    gunVulnerable: false,

    enter(B, api) {
      initTube(B, DOWN, LEN_P1);
      const s = B.s;
      s.shotT = 1.1;            // s. First comet arrives a beat and a bit in — you see the tube before it shoots.
      s.fanT = BAR * 4;         // The FIRST fan comes at 4 bars, not 8. A phase that can be cleared in 20s must
                                // still show you its signature move, or half the players never meet it.
      s.fanCharge = 0;
      s.recT = 0;
      s.addT = 0.45;            // first SPARK almost immediately: the player must never open a phase unarmed.
      s.addSide = 1;
      s.lastLive = 6;
      // Six nodes on the collar, top-first, clockwise (screen-space +angle = clockwise).
      // HP 30: 5 petals cold, 2 petals inside the window. The window is an invitation, so it pays.
      for (let i = 0; i < 6; i++) B.nodes.push(api.makeNode(U.deg(-90 + i * 60), NODE_R, 30, NODE_VOLLEY_P1));
    },

    update(B, dt, api) {
      const s = B.s;
      tubeTick(B, dt);
      drainForDeadNodes(B, api, BODY_PER_NODE_P1);

      // --- adds: 2 SPARK per bar, alternating sides, entering to y=240 (spec) ---
      s.addT -= dt;
      if (s.addT <= 0) {
        s.addT = ADD_EVERY_P1;
        const x = s.addSide > 0 ? 220 : CFG.W - 220;    // 220px in from the edge: inside the node ring's rake radius
        OPT_SPARK.homeX = x; OPT_SPARK.homeY = 240;
        api.spawnAdd('SPARK', x, -30, OPT_SPARK);
        s.addSide = -s.addSide;
      }

      // --- node choreography ---
      if (s.recT > 0) {
        // The 1.2s recovery after the 6-comet fan: THREE nodes lit at once. This is the phase's
        // reward loop — survive the fan, get triple the surface area to dump petals into.
        s.recT -= dt;
        api.cycleNodes(dt, 'wave', FAN_RECOVER, 0.30, 3);
      } else {
        api.cycleNodes(dt, 'sequence', 0.55, 0.35);      // spec: one at a time, 0.55s window, 0.35s gap
      }

      // --- the 8-bar 6-comet fan ---
      s.fanT -= dt;
      if (s.fanCharge > 0) {
        s.fanCharge -= dt;
        s.dirTarget = clampTilt(api.aim(B.x, B.y));      // it visibly tracks you for the whole 0.9s
        s.charge = U.clamp(1 - s.fanCharge / FAN_TELE, 0, 1);
        s.glow = 0.35 + 0.65 * s.charge;
        if (s.fanCharge <= 0) {
          s.fanCharge = 0;
          // Fire along s.dir — the SAME tilt-clamped angle the 0.9s telegraph cone is drawn at. Firing
          // at a fresh unclamped aim-to-player made the comets diverge up to ~16deg from the drawn
          // cone whenever the player stood outside the tube's +/-38deg tilt limit: the area shown as
          // safe was where the outermost comets actually went. "What it shows is what it fires."
          const n = api.emitPattern(FAN6, s.mx, s.my, s.dir);
          api.audio.bloomRed(n, s.mx);
          api.fx.shake(7); api.fx.bloomFlash(s.mx, s.my, 6, false);
          muzzleSparks(api, s, 6);
          s.charge = 0; s.glow = 0.35; s.recoil = 30;    // 30px kick: the biggest recoil the boss ever shows
          s.recT = FAN_RECOVER;
          s.shotT = SHOT_PERIOD + FAN_RECOVER;           // no single comets during the recovery gift
          // Snap the node cycle so the three-wide window opens on the same frame the fan lands.
          for (let i = 0; i < B.nodes.length; i++) { B.nodes[i].open = false; B.nodes[i].fuseT = 0; }
          B.nodeCycleT = 0;
        }
        return;
      }
      if (s.fanT <= 0 && s.recT <= 0) {
        s.fanT = FAN_EVERY;
        s.fanCharge = FAN_TELE;
        return;
      }
      if (s.recT > 0) { s.dirTarget = DOWN; s.charge = 0; return; }   // recovering: mouth cold, tube resets

      // --- the metronome: one aimed comet every 1.5 beats ---
      s.shotT -= dt;
      if (s.shotT > SHOT_TELE) {
        s.dirTarget = clampTilt(api.aim(B.x, B.y));      // tracking phase — the tube follows you
        s.charge = 0; s.glow = 0.35;
      } else {
        // LOCKED. The white ring is a promise: the comet goes exactly where the tube is pointing.
        s.charge = U.clamp(1 - s.shotT / SHOT_TELE, 0, 1);
        s.glow = 0.35 + 0.55 * s.charge;
        if (s.shotT <= 0) {
          api.emitPattern(COMET, s.mx, s.my, s.dir);
          api.fx.shake(3);
          muzzleSparks(api, s, 3);
          s.charge = 0; s.glow = 0.35; s.recoil = 16;
          s.shotT = SHOT_PERIOD;
        }
      }
    },

    draw(B, ctx) {
      const s = B.s;
      if (s.fanCharge <= 0) return;
      // Fan warning: a wide amber-free white arc scribed in front of the mouth showing the 40° spread.
      // White because this is strictly "act now" — it is on screen for 0.9s and then it is bullets.
      const k = U.clamp(1 - s.fanCharge / FAN_TELE, 0, 1);
      const half = U.deg(20);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10 + 0.30 * k;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(s.mx, s.my, 90 + 120 * k, s.dir - half, s.dir + half);
      ctx.stroke();
      ctx.globalAlpha = 0.06 + 0.14 * k;
      ctx.beginPath();
      ctx.moveTo(s.mx, s.my);
      ctx.lineTo(s.mx + U.fcos(s.dir - half) * 640, s.my + U.fsin(s.dir - half) * 640);
      ctx.moveTo(s.mx, s.my);
      ctx.lineTo(s.mx + U.fcos(s.dir + half) * 640, s.my + U.fsin(s.dir + half) * 640);
      ctx.stroke();
      ctx.restore();
    },
  };

  // ============================================================================================
  // PHASE 2 — THE STAIRCASE
  // ============================================================================================
  // Plan the NEXT wall a full cycle ahead so the 0.5s telegraph can draw the real gap AND the decoy.
  function planNextWall(s) {
    s.nextGap = s.gap;
    s.nextDouble = ((s.wallIdx + 1) % 6) === 0;          // spec: every 6th wall is a double
    if (s.nextDouble) {
      const g = s.gap;
      const g2 = (g + DECOY_SPAN <= GAP_MAX) ? g + DECOY_SPAN : g - DECOY_SPAN;
      s.nextLo = g < g2 ? g : g2;
      s.nextHi = g < g2 ? g2 : g;
      s.nextDecoy = U.rngRun.next() < 0.5 ? s.nextLo : s.nextHi;   // gameplay rng: seeded runs must replay
    } else {
      s.nextLo = s.gap; s.nextHi = -1; s.nextDecoy = -1;
    }
  }

  // Emit one segment of a column: slots [from, to) as a gapless wall descriptor.
  function emitSeg(api, from, to) {
    const n = to - from;
    if (n <= 0) return;
    SEG.n = n;
    SEG.y0 = WALL_Y0 + from * WALL_SPACING;
    api.emitPattern(SEG, WALL_X, 0, 0);
  }

  const P2 = {
    name: 'THE STAIRCASE',
    budget: 40,
    hpFrac: 0.33,
    nodesToClear: true,
    bodyVulnerable: false,
    gunVulnerable: false,

    enter(B, api) {
      // The tube swings down and lies out across the top of the frame, mouth off the left edge.
      initTube(B, DOWN, LEN_P1);
      const s = B.s;
      // The bar is a readout of fallen nodes, but a STAGGER can advance the phase with nodes still up.
      // Snap it onto the threshold so the bar's phase ticks never lie about where the fight is.
      if (B.hp > B.maxHp * 0.66) api.damageBody(B.hp - B.maxHp * 0.66);
      // (node pair cursor is owned by boss.js cycleNodes now; nothing to seed here)
      s.dirTarget = P2_DIR;
      s.lenTarget = LEN_P2;
      s.wallT = 1.3;            // s. One beat and a half of grace: the tube has to finish lying down first.
      s.wallIdx = 0;
      s.gap = 0;                // spec: the gap starts at the top and walks down one slot per wall
      s.plugT = 0;
      s.decoySlot = -1;
      s.decoyX = 0;
      s.edgeFlash = 0;
      s.candleLane = 0;
      s.lastLive = 6;
      planNextWall(s);
      // Fresh layer of six nodes. HP 34: still 2 petals inside a window, but 6 cold ones outside it.
      for (let i = 0; i < 6; i++) B.nodes.push(api.makeNode(U.deg(-90 + i * 60), NODE_R, 34, NODE_VOLLEY_P2));
    },

    update(B, dt, api) {
      const s = B.s;
      tubeTick(B, dt);
      drainForDeadNodes(B, api, BODY_PER_NODE_P2);

      // boss.js 'pairs' now reaches all six nodes correctly (it advances the pair cursor by one and
      // opens opposite sides p and p+3), so the old local cursor workaround here is gone — owning the
      // cursor on top of the fixed engine would double-advance it and re-introduce skips.
      api.cycleNodes(dt, 'pairs', 0.60, 0.50);           // spec: pairs on opposite sides, 0.60s window, 0.5s gap

      if (s.edgeFlash > 0) s.edgeFlash -= dt;

      // Idle mouth breathing so the tube never looks dead between walls.
      s.glow = 0.30 + 0.22 * U.fsin(B.t * 3.1);

      // --- the decoy gap seals 0.4s after the wall spawns ---
      if (s.plugT > 0) {
        s.plugT -= dt;
        if (s.plugT <= 0 && s.decoySlot >= 0) {
          SEG.n = WALL_GAPSLOTS;
          SEG.y0 = WALL_Y0 + s.decoySlot * WALL_SPACING;
          // The plug spawns where the column has travelled to, so it slots into the moving lattice.
          api.emitPattern(SEG, s.decoyX + WALL_SPEED * DECOY_CLOSE, 0, 0);
          api.fx.bloomFlash(60, WALL_Y0 + (s.decoySlot + 0.5) * WALL_SPACING, 2, false);
          s.decoySlot = -1;
        }
      }

      // --- walls ---
      s.wallT -= dt;
      if (s.wallT > 0) return;
      s.wallT = WALL_EVERY;

      s.charge = 1; s.recoil = 20; s.edgeFlash = 0.18;
      api.fx.shake(4);

      if (!s.nextDouble) {
        WALL.gapIndex = s.nextGap;
        const n = api.emitPattern(WALL, WALL_X, 0, 0);
        api.audio.bloomRed(n, 80);
      } else {
        // Double wall: two holes 200px apart, built as three gapless segments so the emitter's own
        // wall descriptor still does all the work. One of the two is about to close.
        emitSeg(api, 0, s.nextLo);
        emitSeg(api, s.nextLo + WALL_GAPSLOTS, s.nextHi);
        emitSeg(api, s.nextHi + WALL_GAPSLOTS, WALL_N);
        api.audio.bloomRed(WALL_N - WALL_GAPSLOTS * 2, 80);
        s.decoySlot = s.nextDecoy;
        s.decoyX = WALL_X;
        s.plugT = DECOY_CLOSE;
      }

      // --- your ammo: 2 CANDLE on the right edge per wall (spec) ---
      for (let i = 0; i < 2; i++) {
        const lane = (s.candleLane + i) % 3;
        OPT_CANDLE.homeX = 1090 + lane * 24;             // three staggered lanes so they never stack into one dot
        OPT_CANDLE.homeY = 180 + lane * 150;             // y 180 / 330 / 480 — spread down the right gutter
        api.spawnAdd('CANDLE', CFG.W + 60, OPT_CANDLE.homeY, OPT_CANDLE);
      }
      s.candleLane = (s.candleLane + 2) % 3;

      // A CANDLE bloom is only ONE petal. Every 4th wall an escorting SPARK arrives with five more,
      // because two petals is the minimum to drop an open node and the phase must not starve. (Law 1.)
      if (s.wallIdx % 4 === 3) {
        OPT_SPARK.homeX = 980; OPT_SPARK.homeY = 300;
        api.spawnAdd('SPARK', CFG.W + 40, 300, OPT_SPARK);
      }

      s.wallIdx++;
      s.gap = (s.gap + 1) % (GAP_MAX + 1);               // spec: the gap descends one slot, wrapping at the bottom
      planNextWall(s);
    },

    draw(B, ctx) {
      const s = B.s;

      // Left-edge muzzle bloom on the frame the wall is born — the causal link between the tube and
      // the column that walks in from off-screen.
      if (s.edgeFlash > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.55 * (s.edgeFlash / 0.18);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 10, CFG.H);
        ctx.globalAlpha = 0.16 * (s.edgeFlash / 0.18);
        ctx.fillRect(0, 0, 46, CFG.H);
        ctx.restore();
      }

      // Wall telegraph: for the last 0.5s before a wall exists, bracket the gap(s) at the left edge.
      // On a double wall BOTH holes are bracketed and the decoy flickers magenta — it is about to
      // become lethal, and magenta is the colour of things that are about to become lethal.
      if (s.wallT <= WALL_TELE && s.wallT > 0) {
        const k = U.clamp(1 - s.wallT / WALL_TELE, 0, 1);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.10 + 0.16 * k;
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, 4, CFG.H);
        ctx.restore();
        drawGapBracket(ctx, s.nextLo, k, s.nextDecoy === s.nextLo, B.t);
        if (s.nextHi >= 0) drawGapBracket(ctx, s.nextHi, k, s.nextDecoy === s.nextHi, B.t);
      }

      // The decoy keeps flickering while it travels, right up to the moment it seals.
      if (s.plugT > 0 && s.decoySlot >= 0) {
        const x = s.decoyX + WALL_SPEED * (DECOY_CLOSE - s.plugT);
        const y = WALL_Y0 + (s.decoySlot + 0.5) * WALL_SPACING;
        const f = U.fsin(B.t * 46) > 0 ? 1 : 0.25;       // 46 rad/s ~ 7Hz: unmistakably a flicker, not a pulse
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.75 * f;
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x - 16, y - 44); ctx.lineTo(x + 16, y - 44);
        ctx.moveTo(x - 16, y + 44); ctx.lineTo(x + 16, y + 44);
        ctx.stroke();
        ctx.restore();
      }
    },
  };

  // Bracket marking a gap slot at the left edge. White = "be here now"; magenta = "this one lies".
  function drawGapBracket(ctx, slot, k, isDecoy, t) {
    if (slot < 0) return;
    const y = WALL_Y0 + (slot + 0.5) * WALL_SPACING;
    const f = isDecoy ? (U.fsin(t * 46) > 0 ? 1 : 0.2) : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = (0.30 + 0.55 * k) * f;
    ctx.strokeStyle = isDecoy ? DANGER : '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(8, y - 44); ctx.lineTo(40, y - 44);
    ctx.moveTo(8, y + 44); ctx.lineTo(40, y + 44);
    ctx.moveTo(8, y - 44); ctx.lineTo(8, y - 30);
    ctx.moveTo(8, y + 44); ctx.lineTo(8, y + 30);
    ctx.stroke();
    ctx.restore();
  }

  // ============================================================================================
  // PHASE 3 — OVERCHARGE
  // ============================================================================================
  const P3 = {
    name: 'OVERCHARGE',
    budget: 55,           // the engine's ceiling. P3 is a COUNTDOWN, not an HP bar: it re-arms on failure,
                          // and the 55s stagger is only ever the outermost backstop.
    bodyVulnerable: true, // petals that reach the tube itself now chip it — the armour is coming apart.
    gunVulnerable: false, // still never the peashooter. That law does not bend in the last phase.

    enter(B, api) {
      initTube(B, DOWN, LEN_P1);
      const s = B.s;
      if (B.hp > B.maxHp * 0.33) api.damageBody(B.hp - B.maxHp * 0.33);   // same honesty snap as P2
      s.dirTarget = DOWN;
      s.timer = P3_TIMER;
      s.timerMax = P3_TIMER;
      s.mode = 0;               // 0 = fighting, 1 = victory spectacle
      s.spiralA = 0;
      s.spEmit = 0;
      s.drumT = 0.4;            // first DRUM lands almost immediately — a 12s clock with no ammo is a wall.
      s.sparkT = 1.4;
      s.rearms = 0;
      s.flashT = 0;
      s.winT = 0;
      s.burstT = 0;
      s.bursts = 0;
      s.lastLive = 6;
      // HP 54 = 3 petals inside the (permanently open) window. A DRUM's 24-petal bloom raked across
      // the collar can take two or three nodes at once. That is the intended solution.
      for (let i = 0; i < 6; i++) B.nodes.push(api.makeNode(U.deg(-90 + i * 60), NODE_R, 54, NODE_VOLLEY_P3));
    },

    update(B, dt, api) {
      const s = B.s;
      tubeTick(B, dt);
      if (s.flashT > 0) s.flashT -= dt;

      // ---------------- victory spectacle ----------------
      if (s.mode === 1) {
        s.hot = U.approach(s.hot, 0, dt * 0.8);
        s.glow = U.approach(s.glow, 0, dt * 1.2);
        s.winT -= dt;
        s.burstT -= dt;
        if (s.burstT <= 0 && s.bursts < WIN_BURSTS) {
          s.burstT = WIN_BURST_GAP;
          s.bursts++;
          WIN_BURST.phase = s.bursts * 0.31;             // 0.31 rad per burst: the rings never stack into spokes
          WIN_BURST.speed = 130 + s.bursts * 22;         // 130..350 so the shells separate into concentric shells
          Emit.run(WIN_BURST, api.bul, B.x, B.y, 0, Pool.FACTION.PLAYER,
                   CFG.PETAL_SPEED_MULT * Fuse.chainSpeedMult(), 0, 0,
                   Fuse.petalStage(), Fuse.chainPierce());
          api.fx.bloomFlash(B.x, B.y, 60, true);
          api.fx.shake(5);
        }
        if (s.winT <= 0) Boss.advance();                 // last phase -> finish() -> victory
        return;
      }

      // ---------------- overcharge ----------------
      drainForDeadNodes(B, api, BODY_PER_NODE_P3);
      api.cycleNodes(dt, 'all');                         // spec: all remaining nodes permanently lit
      s.hot = U.approach(s.hot, 1, dt * 1.6);            // barrel reaches full white-hot in 0.6s
      s.glow = 0.72 + 0.28 * U.fsin(B.t * 9.0);          // 9 rad/s ~ 1.4Hz: an anxious pulse, not a strobe

      s.timer -= dt;

      // --- 3-arm spiral out of the mouth ---
      s.spiralA += SPIRAL_RATE * dt;
      if (s.spiralA > TAU) s.spiralA -= TAU;
      s.spEmit += dt;
      const step = 1 / SPIRAL_HZ;
      while (s.spEmit >= step) {
        s.spEmit -= step;
        SPIRAL.angle = s.spiralA;
        api.emitPattern(SPIRAL, s.mx, s.my, 0);
      }

      // --- adds: a DRUM every 4s (the node-killer) plus SPARK filler between them ---
      s.drumT -= dt;
      if (s.drumT <= 0) {
        s.drumT = P3_DRUM_EVERY;
        const x = U.rngRun.range(300, 980);              // spec's random x window
        OPT_DRUM.homeX = x; OPT_DRUM.homeY = 300;
        api.spawnAdd('DRUM', x, -40, OPT_DRUM);
      }
      s.sparkT -= dt;
      if (s.sparkT <= 0) {
        s.sparkT = P3_SPARK_EVERY;
        const x = U.rngRun.range(240, CFG.W - 240);
        OPT_SPARK.homeX = x; OPT_SPARK.homeY = 250;
        api.spawnAdd('SPARK', x, -30, OPT_SPARK);
      }

      // --- win: every node down before the clock ---
      if (api.liveNodes() === 0) {
        beginSpectacle(B, api);
        return;
      }

      // --- fail forward: the clock runs out ---
      if (s.timer <= 0) failForward(B, api);
    },

    draw(B, ctx) {
      const s = B.s;
      const cx = B.x, cy = B.y;

      if (s.mode === 1) {
        // Expanding white shells. Three at most: spectacle is drawn, not simulated.
        const e = WIN_TIME - s.winT;
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        for (let i = 0; i < 3; i++) {
          const k = e - i * 0.22;
          if (k <= 0 || k > 1.5) continue;
          ctx.globalAlpha = 0.45 * (1 - k / 1.5);
          ctx.strokeStyle = i === 1 ? C.mineA : '#FFFFFF';
          ctx.lineWidth = 10 - i * 2.5;
          ctx.beginPath(); ctx.arc(cx, cy, 60 + k * 760, 0, TAU); ctx.stroke();
        }
        ctx.restore();
        return;
      }

      // ---- the countdown ring ----
      // r=150 clears the 96px node ring and the collar's 112px outer band, so the clock never sits
      // on top of a fuse window.
      const frac = U.clamp(s.timer / s.timerMax, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineWidth = 5;
      ctx.globalAlpha = 0.22;
      ctx.strokeStyle = DANGER;
      ctx.beginPath(); ctx.arc(cx, cy, 150, 0, TAU); ctx.stroke();
      // Remaining time drawn clockwise from the top. White, because the whole phase is "act now".
      ctx.globalAlpha = frac < 0.25 ? (0.55 + 0.45 * (U.fsin(B.t * 22) > 0 ? 1 : 0)) : 0.85;
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(cx, cy, 150, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
      ctx.stroke();
      // 12 ticks = 12 seconds on the first clock. A readable unit, not a decorative dial.
      ctx.globalAlpha = 0.30;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < 12; i++) {
        const a = -Math.PI / 2 + i / 12 * TAU;
        const c = U.fcos(a), sn = U.fsin(a);
        ctx.moveTo(cx + c * 143, cy + sn * 143);
        ctx.lineTo(cx + c * 158, cy + sn * 158);
      }
      ctx.stroke();
      ctx.restore();

      // Re-arm shock ring, drawn for 0.5s after a fail-forward so the reset is legible.
      if (s.flashT > 0) {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.5 * (s.flashT / 0.5);
        ctx.strokeStyle = DANGER;
        ctx.lineWidth = 6;
        ctx.beginPath(); ctx.arc(cx, cy, 150 + (0.5 - s.flashT) * 900, 0, TAU); ctx.stroke();
        ctx.restore();
      }
    },
  };

  // The boss blue-blooms: 600 petals, the whole enemy screen turns cyan, 100k, 2.5s of nothing but light.
  function beginSpectacle(B, api) {
    const s = B.s;
    s.mode = 1;
    s.winT = WIN_TIME;
    s.burstT = 0;
    s.bursts = 0;

    // Every remaining enemy bullet converts. Amber cannot convert — by law — so it is simply removed:
    // there is nothing left on this screen that is allowed to hurt you.
    const bul = api.bul;
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== Pool.FACTION.ENEMY) continue;
      if (bul.flags[i] & Pool.F.AMBER) { bul.kill(i); continue; }
      bul.faction[i] = Pool.FACTION.PLAYER;
      bul.type[i] = Pool.T.PETAL;
      bul.dmg[i] = CFG.PETAL_DMG;
      bul.life[i] = CFG.PETAL_LIFE;
      bul.age[i] = 0;
      bul.r[i] = 6;
      bul.flags[i] = 0;
      bul.beh[i] = 0;
      bul.stage[i] = Fuse.petalStage();
      bul.pierce[i] = Fuse.chainPierce();
      bul.vx[i] *= 1.3; bul.vy[i] *= 1.3;                // 1.3x: the sky visibly accelerates outward
    }
    Beams.reset();

    Fuse.score = Fuse.score + 100000;                    // spec: 100,000 bonus
    Fuse.addApplause(CFG.APPLAUSE_PER_FUSEKILL * 4);     // four fuse-kills' worth: this was the biggest one
    api.fx.hitstop(CFG.HITSTOP_DEATH);
    api.fx.shake(CFG.SHAKE_CAP);
    api.fx.bloomFlash(B.x, B.y, 600, true);
    api.fx.wind(B.x, B.y);
    api.fx.banner('OVERCHARGE');
    api.audio.bloomBlue(600, Fuse.chain, B.x);
    api.audio.salute(B.x);
    api.emit('bloom_blue', { type: 'BOSS', x: B.x, y: B.y, petals: 600 });
  }

  // The clock beat you. This is NOT a wall: one survivable ring with a safe wedge pointed away from
  // you, then the fight re-arms softer than it started. You lose time, never the run.
  function failForward(B, api) {
    const s = B.s;
    const bul = api.bul;

    const before = bul.n;
    RING120.phase = U.rngRun.range(0, TAU);
    api.emitPattern(RING120, B.x, B.y, 0);
    const after = bul.n;
    // Carve the 40° wedge on the far side of the boss from the player. Backwards iteration is required:
    // kill() swap-removes from the tail, and the tail is already-inspected territory.
    const safe = api.aim(B.x, B.y) + Math.PI;
    const half = SAFE_WEDGE * 0.5;
    for (let i = after - 1; i >= before; i--) {
      const a = Math.atan2(bul.vy[i], bul.vx[i]);
      if (Math.abs(U.angDiff(a, safe)) < half) bul.kill(i);
    }

    s.rearms++;
    s.timerMax = P3_REARM;                               // spec: the re-armed clock is 9.0s
    s.timer = P3_REARM;
    s.flashT = 0.5;
    s.drumT = 0.3;                                       // ammo arrives immediately on the re-arm
    s.sparkT = 0.9;
    // Nodes reset to 60% HP (spec) — and each further re-arm resets them lower, to a 24% floor. That
    // ramp is what makes this a fail-forward loop instead of a polite infinite one: enough attempts
    // and the collar cannot hold. A node you already damaged BELOW the reset keeps its damage; the
    // reset is a ceiling, never a heal. The bar you drained stays drained.
    const resetFrac = Math.max(0.24, 0.6 - 0.12 * (s.rearms - 1));
    for (let i = 0; i < B.nodes.length; i++) {
      const nd = B.nodes[i];
      const cap = nd.maxHp * resetFrac;
      nd.hp = nd.alive ? Math.min(nd.hp, cap) : cap;
      nd.alive = true;
      nd.open = true; nd.fuseT = 1; nd.fuseMax = 1;
    }
    s.lastLive = B.nodes.length;

    api.fx.hitstop(CFG.HITSTOP_PHASE);
    api.fx.shake(9);
    api.fx.bloomFlash(B.x, B.y, 120, false);
    api.fx.banner('RE-ARM');
    api.audio.bloomRed(120, B.x);
    api.audio.salute(B.x);
    api.emit('boss_rearm', { boss: 'ROMAN CANDLE', attempt: s.rearms });
  }

  // ============================================================================================
  // BODY — drawn every frame. Flat fills + 'lighter' glow only. No gradients, no shadowBlur.
  // ============================================================================================
  function draw(B, ctx) {
    const s = B.s;
    const dir = s.dir === undefined ? DOWN : s.dir;
    const len = (s.len === undefined ? LEN_P1 : s.len) - (s.recoil || 0);
    const glow = s.glow || 0;
    const charge = s.charge || 0;
    const hot = s.hot || 0;

    // ---------------- the tube (local space: +x is forward, out of the mouth) ----------------
    ctx.save();
    ctx.translate(B.x, B.y);
    ctx.rotate(dir);

    const flareX = len - 34;

    // main barrel silhouette
    ctx.fillStyle = BRASS;
    ctx.beginPath();
    ctx.moveTo(-BACK, -HALF_W_BREECH);
    ctx.lineTo(flareX, -HALF_W_MUZZLE);
    ctx.lineTo(flareX, -HALF_W_FLARE);
    ctx.lineTo(len, -HALF_W_FLARE);
    ctx.lineTo(len, HALF_W_FLARE);
    ctx.lineTo(flareX, HALF_W_FLARE);
    ctx.lineTo(flareX, HALF_W_MUZZLE);
    ctx.lineTo(-BACK, HALF_W_BREECH);
    ctx.closePath();
    ctx.fill();

    // Cylinder shading, faked with two flat bands instead of a gradient: the lit crown and the
    // shadowed belly. Two fills is cheaper than one gradient and reads identically at this scale.
    ctx.fillStyle = BRASS_HI;
    ctx.beginPath();
    ctx.moveTo(-BACK, -HALF_W_BREECH);
    ctx.lineTo(flareX, -HALF_W_MUZZLE);
    ctx.lineTo(flareX, -HALF_W_MUZZLE * 0.45);
    ctx.lineTo(-BACK, -HALF_W_BREECH * 0.45);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = BRASS_LO;
    ctx.beginPath();
    ctx.moveTo(-BACK, HALF_W_BREECH * 0.30);
    ctx.lineTo(flareX, HALF_W_MUZZLE * 0.30);
    ctx.lineTo(flareX, HALF_W_MUZZLE);
    ctx.lineTo(-BACK, HALF_W_BREECH);
    ctx.closePath();
    ctx.fill();

    // reinforcing bands, anchored to the muzzle so they travel with the tube as it extends
    ctx.fillStyle = BRASS_LO;
    for (let i = 0; i < 4; i++) {
      const bx = len - 110 - i * 128;                    // 128px apart: four visible bands on the P1 tube
      if (bx < -BACK + 40) break;
      const hw = HALF_W_MUZZLE + 8 + i * 3;
      ctx.fillRect(bx - 13, -hw, 26, hw * 2);
      ctx.fillStyle = BRASS_RIM;
      ctx.fillRect(bx - 13, -hw, 26, 3);
      ctx.fillStyle = BRASS_LO;
    }

    // breech cap
    ctx.fillStyle = BRASS_LO;
    ctx.fillRect(-BACK, -HALF_W_BREECH - 6, 46, (HALF_W_BREECH + 6) * 2);
    ctx.fillStyle = BRASS_RIM;
    ctx.fillRect(-BACK, -HALF_W_BREECH - 6, 46, 3);

    // crown highlight line
    ctx.strokeStyle = BRASS_RIM;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-BACK, -HALF_W_BREECH * 0.62);
    ctx.lineTo(flareX, -HALF_W_MUZZLE * 0.62);
    ctx.stroke();

    // muzzle flare rim
    ctx.strokeStyle = BRASS_RIM;
    ctx.lineWidth = 3;
    ctx.strokeRect(flareX, -HALF_W_FLARE, len - flareX, HALF_W_FLARE * 2);

    // the bore: a dark ellipse with an ember inside it
    ctx.fillStyle = '#0A0710';
    ctx.beginPath();
    ctx.ellipse(len - 4, 0, 13, HALF_W_FLARE - 8, 0, 0, TAU);
    ctx.fill();

    ctx.globalCompositeOperation = 'lighter';

    // white-hot barrel (P3)
    if (hot > 0.01) {
      ctx.globalAlpha = 0.05 + 0.16 * hot;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(-BACK, -HALF_W_BREECH);
      ctx.lineTo(len, -HALF_W_FLARE);
      ctx.lineTo(len, HALF_W_FLARE);
      ctx.lineTo(-BACK, HALF_W_BREECH);
      ctx.closePath();
      ctx.fill();
      // the heat is worst at the mouth
      ctx.globalAlpha = 0.10 + 0.30 * hot;
      ctx.fillRect(len - 210, -HALF_W_MUZZLE, 210, HALF_W_MUZZLE * 2);
    }

    // bore ember
    if (glow > 0.01) {
      ctx.globalAlpha = 0.30 * glow;
      ctx.fillStyle = TRIM;
      ctx.beginPath();
      ctx.ellipse(len - 4, 0, 26 + 14 * glow, HALF_W_FLARE + 10 * glow, 0, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 0.75 * glow;
      ctx.beginPath();
      ctx.ellipse(len - 4, 0, 11, HALF_W_FLARE - 12, 0, 0, TAU);
      ctx.fill();
    }

    // THE TELEGRAPH. Pure white, and the only pure white on this body: a ring that inflates in front
    // of the mouth for the whole lock-on. When it peaks, the shot leaves.
    if (charge > 0.01) {
      ctx.globalAlpha = 0.30 + 0.60 * charge;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2 + 4 * charge;
      ctx.beginPath();
      ctx.ellipse(len + 10 + 26 * charge, 0, 10 + 26 * charge, HALF_W_FLARE * (0.7 + 0.7 * charge), 0, 0, TAU);
      ctx.stroke();
      ctx.globalAlpha = 0.55 * charge;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(len - 4, 0, 12 * charge, (HALF_W_FLARE - 12) * charge, 0, 0, TAU);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();

    // ---------------- the wrought-iron collar (world space, never moves) ----------------
    drawCollar(B, ctx, hot);
  }

  // The collar is the gimbal AND the armour: six lugs, six nodes, two mounting braces running up out
  // of frame to the pier gantry. It is drawn after the tube so the nodes are never occluded.
  function drawCollar(B, ctx, hot) {
    const cx = B.x, cy = B.y;
    ctx.save();

    // mounting braces at 210° and 330° — the yoke the whole tube hangs in
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.moveTo(cx + U.fcos(U.deg(210)) * 100, cy + U.fsin(U.deg(210)) * 100);
    ctx.lineTo(cx + U.fcos(U.deg(210)) * 420, cy + U.fsin(U.deg(210)) * 420);
    ctx.moveTo(cx + U.fcos(U.deg(330)) * 100, cy + U.fsin(U.deg(330)) * 100);
    ctx.lineTo(cx + U.fcos(U.deg(330)) * 420, cy + U.fsin(U.deg(330)) * 420);
    ctx.stroke();
    ctx.strokeStyle = IRON_HI;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(cx + U.fcos(U.deg(210)) * 100, cy + U.fsin(U.deg(210)) * 100 - 10);
    ctx.lineTo(cx + U.fcos(U.deg(210)) * 420, cy + U.fsin(U.deg(210)) * 420 - 10);
    ctx.moveTo(cx + U.fcos(U.deg(330)) * 100, cy + U.fsin(U.deg(330)) * 100 - 10);
    ctx.lineTo(cx + U.fcos(U.deg(330)) * 420, cy + U.fsin(U.deg(330)) * 420 - 10);
    ctx.stroke();

    // six lugs: the sockets the nodes bolt into, at exactly the node angles
    ctx.fillStyle = IRON;
    for (let i = 0; i < 6; i++) {
      const a = U.deg(-90 + i * 60);
      const c = U.fcos(a), s = U.fsin(a);
      const px = -s, py = c;                             // perpendicular, for the lug's width
      ctx.beginPath();
      ctx.moveTo(cx + c * 76 + px * 20, cy + s * 76 + py * 20);
      ctx.lineTo(cx + c * 118 + px * 27, cy + s * 118 + py * 27);
      ctx.lineTo(cx + c * 118 - px * 27, cy + s * 118 - py * 27);
      ctx.lineTo(cx + c * 76 - px * 20, cy + s * 76 - py * 20);
      ctx.closePath();
      ctx.fill();
    }

    // the two iron bands
    ctx.strokeStyle = IRON;
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(cx, cy, 112, 0, TAU); ctx.stroke();
    ctx.lineWidth = 10;
    ctx.beginPath(); ctx.arc(cx, cy, 78, 0, TAU); ctx.stroke();

    ctx.strokeStyle = IRON_RIM;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(cx, cy, 119, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(cx, cy, 73, 0, TAU); ctx.stroke();

    // filigree: six scrolled arcs between the lugs. Cheap, and it is what makes the ring read as
    // WROUGHT iron — Victorian pier ironwork — instead of a sci-fi hoop.
    ctx.strokeStyle = IRON_HI;
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = U.deg(-60 + i * 60);
      const c = U.fcos(a), s = U.fsin(a);
      ctx.arc(cx + c * 95, cy + s * 95, 21, a - 2.5, a + 2.5);
    }
    ctx.stroke();

    // rivets on the outer band
    ctx.fillStyle = IRON_RIM;
    ctx.beginPath();
    for (let i = 0; i < 12; i++) {
      const a = U.deg(-90 + i * 30);
      ctx.moveTo(cx + U.fcos(a) * 112 + 2.4, cy + U.fsin(a) * 112);
      ctx.arc(cx + U.fcos(a) * 112, cy + U.fsin(a) * 112, 2.4, 0, TAU);
    }
    ctx.fill();

    // In P3 the collar itself glows through: the iron is holding back an overcharged tube.
    if (hot > 0.01) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.10 + 0.22 * hot;
      ctx.strokeStyle = TRIM;
      ctx.lineWidth = 20;
      ctx.beginPath(); ctx.arc(cx, cy, 112, 0, TAU); ctx.stroke();
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore();
  }

  return {
    name: 'ROMAN CANDLE',
    hp: 2400,                 // spec §8.1. Drained by node deaths, not by chip damage.
    x: 640, y: 190,           // the collar/pivot. Node ring r=96 around it.
    bodyR: 120,               // only live in P3, where the body finally accepts petals
    phases: [P1, P2, P3],
    draw,
  };
})();
