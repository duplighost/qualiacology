// FINALE — BOSS IV: THE SHOWRUNNER (Act IV). Spec §8.4.
//
// Not a firework. A person-shaped silhouette made entirely of firework light, four metres tall,
// standing ON THE ROOFTOPS AT THE BOTTOM OF THE SCREEN, among the crowd, holding a firing board of
// 64 buttons. They never stopped the show. That is the whole story and it is told purely by where
// they are standing — no dialogue, no cutscene, just a figure at y=640 with the crowd around its feet.
//
// THE ARENA INVERTS. The boss is at the BOTTOM; every threat falls out of the sky above you. The
// board in their hands is the 8x8 grid in the sky: what they press up there, they press down here.
//
// Five phases, five ideas, never a bigger HP bar:
//   P1 THE BOARD    — the fuse window becomes a rhythm game. Presses on the 1/8 grid, column cascades.
//   P2 CALLBACK     — three 45%-scale ghost bosses, one idea each, 12s each. Cuphead's greatest hits.
//   P3 THE CROWD    — the densest pattern in the game arrives at the exact moment the crowd starts
//                     throwing you FLARE gifts. The world helps you precisely when it gets hardest.
//   P4 BLACKOUT     — all lights out. Sparse, fast, terrifying. You shoot at a memory of a flash.
//   P5 FINALE       — tier forced to FINALE, the Showrunner ascends and becomes the last shell.
//
// LAW 1 (petal-only armour) is honoured everywhere: the buttons, the ghost nodes and the finale ring
// are fuse windows, and EVERY phase runs its own steady add supply so the gun always has something to
// pop. LAW 2 (no HP sponge) is honoured by giving each phase a real budget and a real new mechanic.
window.BossShowrunner = (() => {
  'use strict';
  const C = CFG.COL;
  const P_FAC = Pool.FACTION.PLAYER;
  const E_FAC = Pool.FACTION.ENEMY;

  // rgb arrays for FX.particle — preallocated because particles are spawned inside loops
  const RGB_PETAL = U.hex2rgb(C.mineA);
  const RGB_TRIM = U.hex2rgb(C.bossTrim);
  const RGB_WHITE = U.hex2rgb(C.white);

  // The line where powder falls back onto the show. Petals that cross it going DOWN are the only
  // thing that hurts the Showrunner while they stand on the roof — the arena inversion, as damage.
  const FOOT_Y = 604;                 // px: just under the board grid (grid ends at y=592), above the figure's head
  const FOOT_DMG = 18;                // hp per landed petal. 1000hp phase / 18 = ~56 landings in 40s: reachable, not free.

  const STAND_Y = 640;                // px: rooftop line. The whole story is this number.

  // ===================================================================================
  // SHARED PATTERN DESCRIPTORS — data, never code (Emit's conversion contract).
  // Mutated in place (angle/phase/gapIndex) so emitting never allocates.
  // ===================================================================================
  const D_FAN5_DOWN = { kind: 'fan', n: 5, spread: 44, speed: 210, aimed: false, angle: 90 };   // rows 1-2: rains straight down its own column
  const D_RING12 = { kind: 'ring', n: 12, speed: 190 };                                          // rows 3-4: fills the cell's neighbourhood
  const D_WHIP3 = { kind: 'whip', n: 3, spread: 18, speed: 280, curl: 90 };                      // rows 5-6: punishes drifting
  const D_BEAM2 = { kind: 'beam', n: 2 };                                                        // rows 7-8: amber, unconvertible, 0.6s telegraph
  const D_COLUMN = { kind: 'fan', n: 5, spread: 14, speed: 330, aimed: false, angle: 90 };       // THE cascade: a killed cell rains down its column

  const D_WALL = { kind: 'wall', n: 14, spacing: 45, gapIndex: 5, gapSlots: 2, speed: 240, angle: 0, y0: 40 }; // ghost ROMAN CANDLE: 2 slots x 45 = the 90px gap from spec
  const D_SPIRAL6 = { kind: 'spiral', arms: 6, angle: 0, speed: 230 };                            // ghost CATHERINE: 6 spokes
  const D_SPIRAL5 = { kind: 'spiral', arms: 5, angle: 0, speed: 230 };                            // P3: the densest pattern in the game
  const D_SPIRAL3 = { kind: 'spiral', arms: 3, angle: 0, speed: 230 };                            // P5: Roman Candle callback at 60% density
  const D_FLOWER64 = { kind: 'flower', n: 64, speed: 165, decel: 230, grav: 52, phase: 0 };       // ghost KAMURO: density without speed
  const D_FLOWER38 = { kind: 'flower', n: 38, speed: 165, decel: 230, grav: 52, phase: 0 };       // P5: 64 x 0.6 density
  const D_FAN24 = { kind: 'fan', n: 24, spread: 150, speed: 250, aimed: true };                   // P3: the wall that makes you commit
  // P3 density. The spec's spiral+fan alone settle at ~350 live bullets (230 px/s crosses 720px in
  // 3.1s, so nothing accumulates) — thinner than a normal wave, which cannot be "the densest pattern
  // in the game". The mass comes from the same tool KAMURO uses: a PERSIST gravity curtain shot UP
  // off the board that hangs in the sky and falls back. Density without speed, arena inversion made
  // literal. Peak lands ~900-1100; raise n here if the target is the spec's optimistic 2300.
  const D_CURTAIN = { kind: 'flower', n: 60, speed: 300, decel: 130, grav: 42, phase: 0 };
  const D_FAN5_FAST = { kind: 'fan', n: 5, spread: 26, speed: 420, aimed: true };                 // P4: explicitly telegraphed fast attack (the flash IS the telegraph)

  // node blue-bloom payloads — a node you break should pay you like a shell you break
  const D_NODE_RC = { kind: 'fan', n: 7, spread: 60, speed: 250, aimed: true };
  const D_NODE_CAT = { kind: 'ring', n: 14, speed: 220 };
  const D_NODE_KAM = { kind: 'flower', n: 18, speed: 170, decel: 200, grav: 50, phase: 0 };
  const NODE_VOLLEYS = [D_NODE_RC, D_NODE_CAT, D_NODE_KAM];

  // ===================================================================================
  // P1 — THE BOARD. 8x8 grid of sky buttons, cells 120x64, grid origin (160,80).
  // ===================================================================================
  const GC = 8, GR = 8;                 // 8x8, per spec
  const CELL_W = 120, CELL_H = 64;
  const ORG_X = 160, ORG_Y = 80;        // grid spans x 160..1120, y 80..592 — the whole sky, nothing off-screen
  const BTN_HW = 26, BTN_HH = 19;       // px half-extent of the physical button inside its cell. Small enough that
                                        // aiming at a cell is a real act, big enough to hit while dodging.
  const BTN_HP = 24;                    // = SPARK. Gun alone does 0.70s x 20 DPS x3 armour = 42 > 24, so "the gun works here".
  const BTN_FUSE = 0.70;                // s window, per spec. Longer than a SPARK's because you must also travel.

  const buttons = [];
  for (let i = 0; i < GC * GR; i++) {
    // Duck-typed as a shell so Fuse.blueBloom / Fuse.redBloom can drive them: a lit button IS a shell.
    buttons.push({
      idx: i, col: i % GC, row: (i / GC) | 0,
      x: ORG_X + (i % GC) * CELL_W + CELL_W * 0.5,
      y: ORG_Y + (((i / GC) | 0)) * CELL_H + CELL_H * 0.5,
      alive: true, hp: BTN_HP, maxHp: BTN_HP,
      open: false, fuseT: 0, fuseMax: BTN_FUSE,
      pressT: 0, hitFlash: 0,
      volley: null, amber: false, big: false, score: 400, id: 9000 + i, r: 22,
    });
  }

  // Authored rhythmic figures — 4 figures x 16 eighths. -1 is a rest, and the rests are the point:
  // a board pressed on every single eighth is noise, a board that phrases is music you can read.
  const FIG_LEN = 16, FIG_N = 4;
  const FIGURES = new Int16Array(FIG_N * FIG_LEN);
  (function buildFigures() {
    // FIG 0 "SWEEP": top row left-to-right, then row 4 right-to-left. Teaches the grid.
    for (let i = 0; i < 8; i++) FIGURES[i] = i;
    for (let i = 0; i < 8; i++) FIGURES[8 + i] = 31 - i;
    // FIG 1 "COLUMNS": two full descending columns — this is the figure that MAKES column cascades,
    // because it lights several cells of one column inside a single 0.70s window.
    for (let i = 0; i < 8; i++) FIGURES[16 + i] = i * 8 + 2;
    for (let i = 0; i < 8; i++) FIGURES[24 + i] = (7 - i) * 8 + 5;
    // FIG 2 "EDGES": outer columns in pairs with a rest between — breathing room, wide travel.
    const edges = [0, 7, -1, 8, 15, -1, 16, 23, -1, 24, 31, -1, 32, 39, -1, 40];
    for (let i = 0; i < 16; i++) FIGURES[32 + i] = edges[i];
    // FIG 3 "THE ROLL": the amber rows, every other eighth. Half rests, because 8 beams in 3.2s
    // would be a fog; 4 beams with gaps is a drum fill you can dance through.
    const roll = [48, -1, 50, -1, 52, -1, 54, -1, 57, 59, -1, 61, 63, -1, 56, -1];
    for (let i = 0; i < 16; i++) FIGURES[48 + i] = roll[i];
  })();

  // A row decides what its cell fires. Rows 1-2 down-fans, 3-4 rings, 5-6 whips, 7-8 amber beams.
  function volleyForRow(row) {
    if (row < 2) return D_FAN5_DOWN;
    if (row < 4) return D_RING12;
    if (row < 6) return D_WHIP3;
    return D_BEAM2;
  }

  function resetBoard() {
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      b.alive = true; b.hp = b.maxHp = BTN_HP;
      b.open = false; b.fuseT = 0; b.pressT = 0; b.hitFlash = 0;
      b.volley = volleyForRow(b.row);
      b.amber = b.row >= 6;             // amber rows are the bottom two: the closest to you, the honest dodge
    }
  }

  // ===================================================================================
  // small shared helpers
  // ===================================================================================

  // Run a descriptor as PLAYER petals with the player's own momentum baked in — the same call
  // fuse.js makes. Using Emit.run (not bespoke code) is what keeps the conversion contract honest.
  function petals(desc, api, x, y) {
    const p = api.player;
    return Emit.run(desc, api.bul, x, y, Math.atan2(p.y - y, p.x - x), P_FAC,
      CFG.PETAL_SPEED_MULT * Fuse.chainSpeedMult(),
      p.vx * CFG.PETAL_INHERIT, p.vy * CFG.PETAL_INHERIT,
      Fuse.petalStage(), Fuse.chainPierce());
  }

  // Powder that falls back onto the show. Only DOWNWARD petals below the footlight line count, so a
  // player fighting near the floor never has their own upward shots eaten.
  function harvestFootlights(B, api) {
    const bul = api.bul;
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== P_FAC) continue;
      if (bul.type[i] !== Pool.T.PETAL) continue;
      if (bul.y[i] < FOOT_Y || bul.vy[i] <= 0) continue;
      B.hp -= FOOT_DMG;
      FX.particle(bul.x[i], FOOT_Y, (U.rngFx.next() - 0.5) * 70, -70 - U.rngFx.next() * 110,
        0.45, 2.4, RGB_PETAL, 0.90);
      bul.kill(i);
    }
  }

  // Adds never stop. This is the single most important routine in the file: without a petal source
  // the player has no agency, and a boss with no agency is the worst thing this game could ship.
  const ADD_BAG = ['SPARK', 'CROSSETTE', 'SPARK', 'WHIP', 'DRUM', 'SPARK', 'CANDLE', 'CROSSETTE'];
  function feedAdds(B, dt, api, interval) {
    const s = B.s;
    s.addT -= dt;
    if (s.addT > 0) return;
    s.addT = interval;
    if (Enemies.alive() >= 26) return;         // headroom under ENEMY_CAP 48 so flares/mortars can still land
    const name = ADD_BAG[s.addI % ADD_BAG.length];
    s.addI++;
    const x = 200 + U.rngRun.next() * (CFG.W - 400);
    api.spawnAdd(name, x, -40, { homeX: x, homeY: 150 + U.rngRun.next() * 130, delay: 0.8, enterT: 0.9 });
  }

  // FLARE gifts red-bloom on expiry in fuse.js like any shell, but spec says an unclaimed gift is
  // HARMLESS. Nulling the instance volley one tick before expiry is the honest way to say that
  // without touching the frozen core.
  function defuseExpiringFlares(dt) {
    for (let i = 0; i < Enemies.list.length; i++) {
      const e = Enemies.list[i];
      if (!e.alive || e.name !== 'FLARE') continue;
      if (e.fuseOpen && e.fuseT - dt <= 0) e.volley = null;
    }
  }

  // Count node deaths since last frame without allocating — every drop is scripted body damage.
  function tollNodes(B, api, perNode) {
    const live = api.liveNodes();
    if (live < B.s.lastLive) {
      api.damageBody(perNode * (B.s.lastLive - live));
      FX.shake(4);
    }
    B.s.lastLive = live;
  }

  // ===================================================================================
  // PHASE 1 — "THE BOARD"   100% -> 80%, budget 40s
  // The fuse window becomes a rhythm game. A pressed button is a shell; fuse-kill it and its cell
  // blue-blooms, raining petals DOWN ITS COLUMN into any button lit below it. Column cascades.
  // Closed buttons are hardware, not shells: they cannot be damaged. The window is the only door.
  // ===================================================================================
  const PH_BOARD = {
    name: 'THE BOARD',
    budget: 40,
    hpFrac: 0.80,
    bodyVulnerable: false,
    gunVulnerable: false,

    enter(B, api) {
      Sky.setBlackout(false);          // defensive: any phase entered out of order relights the city
      resetBoard();
      const s = B.s;
      s.fig = 0; s.step = 0;
      s.pressX = CFG.W * 0.5; s.pressY = 240; s.armT = 0;
      s.addT = 2.0; s.addI = 0;
      B.x = CFG.W * 0.5; B.y = STAND_Y;
      Fuse.setMaxConcurrent(6);        // engine default, restated so phase order can never leak a cap
      AUDIO.setSection('BOSS_P1');
    },

    update(B, dt, api, isEighth) {
      const s = B.s;
      // 8 presses per bar at 150 BPM = one every 1/8 note. The director owns the grid; we just obey it.
      if (isEighth) pressStep(B, s, api);

      for (let i = 0; i < buttons.length; i++) {
        const b = buttons[i];
        if (!b.alive) continue;
        if (b.pressT > 0) b.pressT -= dt;
        if (b.hitFlash > 0) b.hitFlash -= dt;
        if (!b.open) continue;
        b.fuseT -= dt;
        if (b.fuseT <= 0) {
          b.open = false; b.fuseT = 0;
          AUDIO.whistleOff(b);
          Fuse.redBloom(b);            // the cell fires for real: fan / ring / whip / amber beams
        }
      }
      if (s.armT > 0) s.armT -= dt;

      scanBoard(B, api);
      harvestFootlights(B, api);
      feedAdds(B, dt, api, 4.2);       // the board is a petal source, but never rely on one source alone
    },
  };

  function pressStep(B, s, api) {
    let cell = FIGURES[s.fig * FIG_LEN + s.step];
    s.step++;
    if (s.step >= FIG_LEN) { s.step = 0; s.fig = U.rngRun.int(0, FIG_N - 1); }
    if (cell < 0) return;                       // authored rest
    let b = buttons[cell];
    if (!b.alive) {
      // The board erodes as you play it. Slide along the row so a figure keeps its shape and its
      // pressure instead of silently going quiet where you already won.
      const row = (cell / GC) | 0, col = cell % GC;
      b = null;
      for (let k = 1; k < GC; k++) {
        const cand = buttons[row * GC + ((col + k) % GC)];
        if (cand.alive) { b = cand; break; }
      }
      if (!b) return;
    }
    if (b.open) return;                                        // never double-press a lit cell
    if (b.amber && Beams.count() >= 4) return;                 // beam budget: 4 concurrent is a fill, 8 is a fog
    b.open = true; b.fuseT = b.fuseMax; b.hp = b.maxHp;        // a survived press resets the cell: buttons are hardware
    b.pressT = 0.22;                                           // s of key-down squash on the drawn button
    s.pressX = b.x; s.pressY = b.y; s.armT = 0.22;             // the Showrunner's arm SNAPS to point at the cell they pressed
    AUDIO.whistle(b);
  }

  // Player projectiles vs lit buttons. O(1) per bullet: the grid is regular, so the cell is arithmetic.
  function scanBoard(B, api) {
    const bul = api.bul;
    const maxX = ORG_X + GC * CELL_W, maxY = ORG_Y + GR * CELL_H;
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== P_FAC) continue;
      const bx = bul.x[i], by = bul.y[i];
      if (bx < ORG_X || bx >= maxX || by < ORG_Y || by >= maxY) continue;
      const col = ((bx - ORG_X) / CELL_W) | 0;
      const row = ((by - ORG_Y) / CELL_H) | 0;
      const b = buttons[row * GC + col];
      if (!b.alive || !b.open) continue;         // unlit hardware absorbs nothing and takes nothing
      const dx = bx - b.x, dy = by - b.y;
      if (dx < -BTN_HW || dx > BTN_HW || dy < -BTN_HH || dy > BTN_HH) continue;
      b.hp -= bul.dmg[i] * CFG.FUSE_ARMOR_MULT;  // always damaged inside the window, so always x3
      b.hitFlash = 0.06;
      if (b.hp <= 0) killButton(b, api);
      if (bul.pierce[i] > 1) bul.pierce[i]--; else bul.kill(i);
    }
  }

  function killButton(b, api) {
    b.alive = false; b.open = false; b.fuseT = 0;
    AUDIO.whistleOff(b);
    Fuse.blueBloom(b);                       // chain + applause + score + this cell's own volley, as petals
    // AMBER cells (rows 6-7) NEVER convert — no petals, no column cascade. They are the honest-dodge
    // floor; the draw code promises "a triangle means this one can never be yours". Blooming their
    // column made the two closest, cheapest rows the best petal farm on the board.
    if (!b.amber) petals(D_COLUMN, api, b.x, b.y + 20);   // the cascade: powder rains DOWN the column
    FX.shake(2);
  }

  // ===================================================================================
  // PHASE 2 — "CALLBACK"   80% -> 55%, budget 42s
  // Three ghost bosses at 45% scale, one idea each, 12s apiece. Three fuse nodes each: break all
  // three before the timer and the ghost collapses early for 900 damage. Greatest hits, earned.
  // ===================================================================================
  const GHOST_TIME = 12.0;                 // s each, per spec. 3 x 12 = 36s inside a 42s budget.
  const GHOST_KILL_DMG = 900;              // hp to the Showrunner for clearing all 3 nodes early
  const GHOST_NAMES = ['ROMAN CANDLE', 'CATHERINE', 'KAMURO'];
  const GHOST_X = [250, 640, 640];         // the tube stands off to one side; the wheel and the shell own centre
  const GHOST_Y = [220, 250, 205];
  const GHOST_NODE_HP = 90;                // 5 in-window petals (6 x3 = 18 each). Fast enough that 3 nodes in 12s is real.

  const PH_CALLBACK = {
    name: 'CALLBACK',
    budget: 42,
    hpFrac: 0.55,
    bodyVulnerable: false,
    gunVulnerable: false,

    enter(B, api) {
      Sky.setBlackout(false);
      const s = B.s;
      s.gi = -1; s.gT = 0; s.gAng = 0;
      s.fireT = 0; s.wallSide = 1;
      s.nodeGap = 0; s.nodeCur = 0; s.lastLive = 0;
      s.addT = 1.6; s.addI = 3;
      B.x = CFG.W * 0.5; B.y = STAND_Y;
      s.pressX = 640; s.pressY = 220; s.armT = 0;
      Fuse.setMaxConcurrent(6);
      AUDIO.setSection('BOSS_P2');
      startGhost(B, api, 0);
    },

    update(B, dt, api) {
      const s = B.s;
      s.gT -= dt;
      s.gAng += U.deg(140) * dt;                        // CATHERINE's 140 deg/s, kept on the boss so the spiral is resumable

      // node choreography — cycled by hand because these nodes ride the GHOST, not the boss body
      const gx = GHOST_X[s.gi], gy = GHOST_Y[s.gi] + U.fsin(B.t * 1.3) * 8;
      for (let i = 0; i < B.nodes.length; i++) {
        const n = B.nodes[i];
        n.x = gx + U.fcos(n.ang + s.gAng * 0.25) * n.dist;
        n.y = gy + U.fsin(n.ang + s.gAng * 0.25) * n.dist;
      }
      cycleGhostNodes(B, dt, 0.60, 0.45);               // 0.60s window per spec, 0.45s gap so the ring reads as a pulse
      tollNodes(B, api, 0);                             // node kills pay in petals; the 900 comes from clearing all 3

      if (api.liveNodes() === 0) { endGhost(B, api, true); }
      else if (s.gT <= 0) { endGhost(B, api, false); }

      ghostFire(B, dt, api, gx, gy);
      s.pressX = gx; s.pressY = gy;                     // the Showrunner keeps pointing at whatever they conjured

      harvestFootlights(B, api);
      feedAdds(B, dt, api, 3.4);
    },
  };

  function startGhost(B, api, i) {
    const s = B.s;
    // 3 x 12s = 36s inside a 42s budget. If the player is slow the set simply encores from the top
    // rather than leaving a dead phase with nothing to break.
    i = i % GHOST_NAMES.length;
    s.gi = i; s.gT = GHOST_TIME; s.fireT = 0.9;         // 0.9s of grace so a ghost is always SEEN before it fires
    B.nodes.length = 0;
    const vol = NODE_VOLLEYS[i];
    for (let k = 0; k < 3; k++) {
      // 3 nodes at 120 deg apart, 82px out: far enough to be individually aimable at 45% scale
      B.nodes.push(api.makeNode(U.deg(-90 + k * 120), 82, GHOST_NODE_HP, vol));
      B.nodes[k].fuseMax = 0.60;
    }
    s.nodeGap = 0.35; s.nodeCur = 2; s.lastLive = 3;
    FX.banner(GHOST_NAMES[i]);
    AUDIO.phaseSting();
  }

  function endGhost(B, api, early) {
    const s = B.s;
    const gx = GHOST_X[s.gi], gy = GHOST_Y[s.gi];
    // A ghost always dies in your colour — that is what makes the callback a gift and not a chore.
    const n = petals(NODE_VOLLEYS[s.gi], api, gx, gy);
    petals(D_NODE_CAT, api, gx, gy);
    FX.bloomFlash(gx, gy, n + 14, true);
    FX.wind(gx, gy);
    FX.shake(early ? 7 : 4);
    AUDIO.bloomBlue(n + 14, Fuse.chain, gx);
    Fuse.addApplause(CFG.APPLAUSE_PER_FUSEKILL);
    Fuse.starveT = 0;
    if (early) { api.damageBody(GHOST_KILL_DMG); FX.hitstop(CFG.HITSTOP_FUSEKILL_BIG); }
    B.nodes.length = 0;
    startGhost(B, api, s.gi + 1);
  }

  function cycleGhostNodes(B, dt, windowT, gapT) {
    const s = B.s;
    let anyOpen = false;
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (!n.alive || !n.open) continue;
      anyOpen = true;
      n.fuseT -= dt;
      if (n.fuseT <= 0) { n.open = false; s.nodeGap = gapT; }
    }
    if (anyOpen) return;
    s.nodeGap -= dt;
    if (s.nodeGap > 0) return;
    for (let k = 0; k < B.nodes.length; k++) {
      s.nodeCur = (s.nodeCur + 1) % B.nodes.length;
      const n = B.nodes[s.nodeCur];
      if (n.alive && !n.open) {
        n.open = true; n.fuseT = n.fuseMax = windowT;
        AUDIO.whistle({ x: n.x, id: 'ghost' + s.gi + '_' + s.nodeCur });
        break;
      }
    }
  }

  function ghostFire(B, dt, api, gx, gy) {
    const s = B.s;
    s.fireT -= dt;
    if (s.fireT > 0) return;
    if (s.gi === 0) {
      // ROMAN CANDLE: the staircase. A marching wall with a 90px gap, alternating sides every volley.
      s.fireT = 1.0;                                    // every 1.0s per spec
      D_WALL.gapIndex = U.rngRun.int(1, 11);            // never index 0 or 13: a gap at the very edge is not a choice
      D_WALL.angle = s.wallSide > 0 ? 0 : 180;
      api.emitPattern(D_WALL, s.wallSide > 0 ? -60 : CFG.W + 60, 0, 0);
      s.wallSide = -s.wallSide;
      AUDIO.salute(gx);
    } else if (s.gi === 1) {
      // CATHERINE: 6 spokes, each firing a 3-bullet spread, every 0.45s. 18 bullets a beat, forever.
      s.fireT = 0.45;
      for (let k = 0; k < 3; k++) {
        D_SPIRAL6.angle = s.gAng + U.deg(-9 + 9 * k);   // 9 deg apart: a rope, not three separate rings
        api.emitPattern(D_SPIRAL6, gx, gy, 0);
      }
    } else {
      // KAMURO: one 64-bullet gravity bloom every 3.0s. Density without speed.
      s.fireT = 3.0;
      D_FLOWER64.phase = s.gAng * 0.5;
      api.emitPattern(D_FLOWER64, gx, gy, 0);
      FX.bloomFlash(gx, gy, 64, false);
      AUDIO.bloomRed(64, gx);
    }
  }

  // ===================================================================================
  // PHASE 3 — "THE CROWD"   55% -> 35%, budget 38s
  // The densest pattern in the game (peak ~2300) arrives at the exact moment the rooftop crowd
  // starts throwing you flares. The world begins helping you precisely when it gets hardest, and
  // that emotional beat is delivered entirely through play. No dialogue. No cutscene.
  // ===================================================================================
  const PH_CROWD = {
    name: 'THE CROWD',
    budget: 38,
    hpFrac: 0.35,
    bodyVulnerable: false,
    gunVulnerable: false,

    enter(B, api) {
      Sky.setBlackout(false);
      const s = B.s;
      s.spin = 0; s.emitAcc = 0; s.fanT = 2.0; s.flareT = 0.4; s.curtT = 1.0;
      s.addT = 3.0; s.addI = 4;
      s.pressX = 640; s.pressY = 300; s.armT = 0;
      B.x = CFG.W * 0.5; B.y = STAND_Y;
      AUDIO.setSection('BOSS_P3');
      Fuse.setMaxConcurrent(8);          // more gifts in flight than usual: the crowd is loud and generous
    },

    update(B, dt, api) {
      const s = B.s;
      const ox = B.x, oy = B.y - 92;     // everything pours out of the board in their hands

      // rotating 5-arm spiral, 85 deg/s, 14 bullets/s/arm, spd 230
      s.spin += U.deg(85) * dt;
      s.emitAcc += dt;
      while (s.emitAcc >= 1 / 14) {      // 14 steps/s/arm x 5 arms = 70 bullets/s
        s.emitAcc -= 1 / 14;
        D_SPIRAL5.angle = s.spin;
        api.emitPattern(D_SPIRAL5, ox, oy, 0);
      }

      // 24-bullet aimed fan every 2.0s — the beat that makes you commit to a side
      s.fanT -= dt;
      if (s.fanT <= 0) {
        s.fanT = 2.0;
        api.emitPattern(D_FAN24, ox, oy, api.aim(ox, oy));
        FX.shake(2.5);
        AUDIO.salute(ox);
      }

      // the hanging curtain: shot up off the board, decelerates, hangs, falls back on you
      s.curtT -= dt;
      if (s.curtT <= 0) {
        s.curtT = 1.6;                 // 60 bullets / 1.6s. Slow enough to read as individual shells going up.
        D_CURTAIN.phase = s.spin * 0.5;
        api.emitPattern(D_CURTAIN, ox, oy, 0);
      }

      // THE GIFTS: 3 flares a second, thrown up off the rooftops at 110 px/s. 1.2s window, 20 petals.
      s.flareT -= dt;
      if (s.flareT <= 0) {
        s.flareT = 1 / 3;
        if (Enemies.alive() < 34) {     // headroom under ENEMY_CAP so a DRUM can still be thrown in
          const fx = 80 + U.rngRun.next() * (CFG.W - 160);
          api.spawnAdd('FLARE', fx, CFG.H + 24, { homeX: fx, mv: 'rise', mvSpeed: -110, delay: 1.0 });
        }
      }
      defuseExpiringFlares(dt);          // an unclaimed gift is harmless — it just drifts away

      s.pressX = ox; s.pressY = oy - 60;
      harvestFootlights(B, api);
      feedAdds(B, dt, api, 9.0);         // a DRUM/MORTAR-class add on top of the flare rain
    },
  };

  // ===================================================================================
  // PHASE 4 — "BLACKOUT"   35% -> 18%, budget 20s HARD
  // All lights out. The only light sources left are bullets, petals, fuse rings and you. Sparse but
  // fast. The Showrunner is invisible except for one white flash 0.25s before each volley — which is
  // also their only fuse window. You are shooting at a memory of a flash.
  // ===================================================================================
  const P4_CYCLE = 0.90;                 // s between volleys, per spec
  const P4_OPEN_AT = 0.20;               // window opens here...
  const P4_FIRE_AT = 0.45;               // ...volley leaves 0.25s later (the flash IS the telegraph)...
  const P4_SHUT_AT = 0.65;               // ...and the 0.45s window closes here.
  const P4_BODY_R = 110;                 // px: generous, because you are aiming at a place you remember
  const P4_WIN_MULT = 3.0;               // x3 in-window, same law as every other fuse in the game

  const PH_BLACKOUT = {
    name: 'BLACKOUT',
    budget: 20,                          // 20 seconds. Then everything relights at once.
    hpFrac: 0.18,
    bodyVulnerable: false,               // handled by hand below so the x3 window law still applies
    gunVulnerable: false,

    enter(B, api) {
      Sky.setBlackout(true);             // TURNED BACK OFF IN PH_FINALE.enter (and in every other enter)
      const s = B.s;
      s.cyc = 0; s.fired = false; s.open = false;
      s.tx = B.x; s.fade = 0;
      s.beamT = 1.2;
      s.addT = 1.4; s.addI = 0;
      s.pressX = B.x; s.pressY = 300; s.armT = 0;
      B.y = STAND_Y;
      AUDIO.setSection('BOSS_P4');
      Fuse.setMaxConcurrent(4);          // few voices, much dark: the whistle must be findable
    },

    update(B, dt, api) {
      const s = B.s;
      s.cyc += dt;
      if (s.cyc >= P4_CYCLE) {
        s.cyc -= P4_CYCLE; s.fired = false;
        // relocate in the dark: a boss that stands still turns "a memory of a flash" into a bookmark
        s.tx = 200 + U.rngRun.next() * (CFG.W - 400);
      }
      const wasOpen = s.open;
      s.open = s.cyc >= P4_OPEN_AT && s.cyc < P4_SHUT_AT;
      if (s.open && !wasOpen) AUDIO.whistle({ x: B.x, id: 'blackout' });
      if (!s.open && wasOpen) { AUDIO.whistleOff({ x: B.x, id: 'blackout' }); s.fade = 0.55; }
      if (s.fade > 0) s.fade -= dt;      // the afterimage: 0.55s of a fading outline, all the help you get
      if (!s.open) B.x = U.approach(B.x, s.tx, 130 * dt);   // only ever moves while unlit

      if (!s.fired && s.cyc >= P4_FIRE_AT) {
        s.fired = true;
        api.emitPattern(D_FAN5_FAST, B.x, B.y - 70, api.aim(B.x, B.y - 70));
        FX.shake(3);
      }

      // two amber sweep beams every 3.0s — the only thing in the dark you cannot convert
      s.beamT -= dt;
      if (s.beamT <= 0) {
        s.beamT = 3.0;
        const base = api.aim(B.x, B.y - 70);
        api.beam(B.x, B.y - 70, base - U.deg(24), { len: 1500, w: 15, tele: 0.75, live: 1.30, sweep: U.deg(16) });
        api.beam(B.x, B.y - 70, base + U.deg(24), { len: 1500, w: 15, tele: 0.75, live: 1.30, sweep: -U.deg(16) });
      }

      if (s.open) blackoutBodyScan(B, api);
      feedAdds(B, dt, api, 3.2);         // a lit fuse ring is a lantern down here. Adds ARE the lighting rig.
    },
  };

  // In-window body damage, done by hand so the gun works AND the x3 fuse law applies.
  function blackoutBodyScan(B, api) {
    const bul = api.bul;
    const cx = B.x, cy = B.y - 60, r2 = P4_BODY_R * P4_BODY_R;
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== P_FAC) continue;
      const dx = bul.x[i] - cx, dy = bul.y[i] - cy;
      if (dx * dx + dy * dy > r2) continue;
      B.hp -= bul.dmg[i] * P4_WIN_MULT;
      FX.particle(bul.x[i], bul.y[i], -dx * 0.7, -dy * 0.7, 0.3, 2.2, RGB_TRIM, 0.88);
      if (bul.pierce[i] > 1) bul.pierce[i]--; else bul.kill(i);
    }
  }

  // ===================================================================================
  // PHASE 5 — "FINALE"   18% -> 0%, budget 40s (30s of fight + room for a 3s death)
  // Applause forced to FINALE for the duration: twin gun, x4 score. The game hands you everything
  // for the last thirty seconds. The Showrunner ascends and becomes the last shell.
  // ===================================================================================
  const ASC_Y = 260;                     // px: the sky slot, per spec
  const NODE_RING_R = 210;               // px out from the core — outside bodyR 150 so nodes are separately aimable
  const FIN_NODE_HP = 110;               // ~6 in-window petals each; 12 of them is a real dismantling job
  const FIN_NODE_DMG = 120;              // hp to the body per node broken. 12 x 120 = 1440 > the 936 this phase needs.
  const DEATH_TIME = 3.0;                // s of bloom, per spec
  const DEATH_PETALS = 2000;             // total petals in the final bloom
  const GOLDEN = 2.39996323;             // rad: golden angle. Even coverage with zero rng and zero clumping.
  // Reused spawn opts for the death bloom — ~11 spawns/frame for 3s on the game's heaviest frame; a
  // fresh literal each spawn would drop ~2000 objects into the nursery at the worst possible moment.
  const OPT_DEATH = { r: 6, dmg: CFG.PETAL_DMG, life: CFG.PETAL_LIFE, stage: 2, pierce: CFG.PETAL_PIERCE_CAP };

  const PH_FINALE = {
    name: 'FINALE',
    budget: 40,
    hpFrac: 0,                           // the phase ends when the body is gone — and this is the last phase
    bodyVulnerable: true,                // petals only: gunVulnerable stays false, LAW 1 to the last frame
    gunVulnerable: false,

    enter(B, api) {
      Sky.setBlackout(false);            // EVERYTHING RELIGHTS AT ONCE. This is the line that undoes P4.
      const s = B.s;
      s.asc = 0; s.spin = 0; s.spin6 = 0;
      s.rcT = 0; s.catT = 0.6; s.kamT = 2.0; s.beamT = 3.0;
      s.addT = 1.5; s.addI = 0; s.appT = 0;
      s.lastLive = 12;
      s.dying = 0; s.dSeed = 0; s.dFlash = 0;
      s.pressX = 640; s.pressY = 120; s.armT = 0;
      for (let k = 0; k < 12; k++) {
        B.nodes.push(api.makeNode(U.deg(-90 + k * 30), NODE_RING_R, FIN_NODE_HP, NODE_VOLLEYS[k % 3]));
      }
      AUDIO.setBpm(165);                 // tempo jumps for the last thirty seconds
      AUDIO.setSection('BOSS_P5');
      Fuse.setMaxConcurrent(8);
      Fuse.addApplause(100);             // forced to tier FINALE
    },

    update(B, dt, api) {
      const s = B.s;

      // Pin the gauge at FINALE. Applause decays at 6/s after 1.2s grace, so a top-up every 0.4s
      // holds it at 100 without ever emitting a spurious tier event.
      s.appT -= dt;
      if (s.appT <= 0) { s.appT = 0.4; Fuse.addApplause(6); }

      if (s.dying > 0) { deathBloom(B, dt, api); return; }

      // the ascension: 640 -> (640, 260) in ~1.6s. They stop being a person and become the last shell.
      s.asc = Math.min(1, s.asc + dt / 1.6);
      B.x = U.approach(B.x, CFG.W * 0.5, 420 * dt);
      B.y = U.approach(B.y, ASC_Y, (STAND_Y - ASC_Y) / 1.6 * dt);

      api.cycleNodes(dt, 'all');         // 12 PERMANENT windows: every one of them always open
      tollNodes(B, api, FIN_NODE_DMG);

      if (s.asc >= 1) {
        // every previous pattern at 60% density, all at once
        s.spin += U.deg(70) * dt;
        s.spin6 += U.deg(140) * dt;

        s.rcT -= dt;
        if (s.rcT <= 0) {                // ROMAN CANDLE callback: 3-arm spiral (5 arms x 0.6)
          s.rcT = 1 / 8;                 // 8 steps/s/arm: 60% of P3's 14
          D_SPIRAL3.angle = s.spin;
          api.emitPattern(D_SPIRAL3, B.x, B.y, 0);
        }
        s.catT -= dt;
        if (s.catT <= 0) {               // CATHERINE callback: 6-spoke spread on a 0.75s beat (0.45 / 0.6)
          s.catT = 0.75;
          D_SPIRAL6.angle = s.spin6;
          api.emitPattern(D_SPIRAL6, B.x, B.y, 0);
          D_SPIRAL6.angle = s.spin6 + U.deg(10);
          api.emitPattern(D_SPIRAL6, B.x, B.y, 0);
        }
        s.kamT -= dt;
        if (s.kamT <= 0) {               // KAMURO callback: gravity bloom every 4.0s at 38 bullets (64 x 0.6)
          s.kamT = 4.0;
          D_FLOWER38.phase = s.spin;
          api.emitPattern(D_FLOWER38, B.x, B.y, 0);
          FX.bloomFlash(B.x, B.y, 38, false);
          AUDIO.bloomRed(38, B.x);
        }
        s.beamT -= dt;
        if (s.beamT <= 0) {              // the board's amber beams, on a 5s cycle
          s.beamT = 5.0;
          const a = api.aim(B.x, B.y);
          api.beam(B.x, B.y, a - U.deg(30), { len: 1500, w: 16, tele: 0.80, live: 0.90, sweep: U.deg(14) });
          api.beam(B.x, B.y, a + U.deg(30), { len: 1500, w: 16, tele: 0.80, live: 0.90, sweep: -U.deg(14) });
        }
      }

      // Adds: 2 DRUM + 1 MORTAR every 6s. Feed the cascade. This is a gift, not a threat.
      s.addT -= dt;
      if (s.addT <= 0) {
        s.addT = 6.0;
        if (Enemies.alive() < 22) {
          api.spawnAdd('DRUM', 300, -40, { homeX: 300, homeY: 470, delay: 0.9 });
          api.spawnAdd('DRUM', CFG.W - 300, -40, { homeX: CFG.W - 300, homeY: 470, delay: 1.2 });
          api.spawnAdd('MORTAR', CFG.W * 0.5, -60, { homeX: CFG.W * 0.5, homeY: 120, delay: 1.6, mvSpeed: 40 });
        }
      }

      if (B.hp <= 0) beginDeath(B, api);
    },
  };

  function beginDeath(B, api) {
    const s = B.s;
    s.dying = DEATH_TIME;
    s.dSeed = 0; s.dFlash = 0;
    B.hp = 1;                            // held above zero so the phase machine waits for the spectacle
    Beams.reset();
    for (let i = 0; i < B.nodes.length; i++) B.nodes[i].alive = false;
    // ALL BULLETS CONVERT. Every shot ever fired at you becomes yours in the same frame.
    const bul = api.bul;
    for (let i = 0; i < bul.n; i++) {
      if (bul.faction[i] !== E_FAC) continue;
      bul.faction[i] = P_FAC; bul.type[i] = Pool.T.PETAL;
      bul.flags[i] = 0; bul.beh[i] = 0;
      bul.dmg[i] = CFG.PETAL_DMG; bul.stage[i] = 2; bul.pierce[i] = CFG.PETAL_PIERCE_CAP;
      bul.r[i] = 6; bul.life[i] = CFG.PETAL_LIFE; bul.age[i] = 0;
      bul.vx[i] *= -1.15; bul.vy[i] *= -1.15;          // and they go back the way they came
    }
    FX.hitstop(CFG.HITSTOP_DEATH);
    FX.shake(CFG.SHAKE_CAP);
    FX.deathBurst(B.x, B.y);
    AUDIO.bloomBlue(DEATH_PETALS, Fuse.chain, B.x);
    AUDIO.setSection('VICTORY');
    api.emit('showrunner_death', { x: B.x, y: B.y });
  }

  // 3.0 seconds of a 2000-petal cyan bloom expanding from centre to fill the entire screen.
  function deathBloom(B, dt, api) {
    const s = B.s;
    s.dying -= dt;
    B.hp = 1;                            // still holding the door shut
    const k = 1 - U.clamp(s.dying / DEATH_TIME, 0, 1);   // 0..1 over the 3 seconds
    const bul = api.bul;
    const cx = CFG.W * 0.5, cy = CFG.H * 0.46;
    const per = (DEATH_PETALS / (DEATH_TIME * 60)) | 0;  // ~11 petals a frame -> 2000 over 3s
    if (bul.n < 3500) {                                  // hard headroom under BULLET_CAP 4096
      for (let i = 0; i < per; i++) {
        s.dSeed++;
        const a = s.dSeed * GOLDEN;                      // golden angle: perfectly even, zero clumping, zero rng
        const rad = 40 + k * 620;                        // the front of the bloom walks out to fill the screen
        const sp = 190 + k * 260;                        // and accelerates, so it reads as expanding, not raining
        bul.spawn(cx + U.fcos(a) * rad, cy + U.fsin(a) * rad,
          U.fcos(a) * sp, U.fsin(a) * sp, Pool.T.PETAL, P_FAC, OPT_DEATH);   // reused opts: no per-frame alloc
      }
    }
    s.dFlash -= dt;
    if (s.dFlash <= 0) {
      s.dFlash = 0.25;                                   // a bloom flash every quarter second: the crowd peaks and clips
      FX.bloomFlash(cx, cy, 200, true);
      FX.shake(6);
      Sky.flash && Sky.flash(0.6);
    }
    if (s.dying <= 0) B.hp = 0;                          // and now the phase machine may finish the fight
  }

  // ===================================================================================
  // DRAW — the body every frame, plus the per-phase sky furniture.
  // Boss.draw() only calls def.draw, so phase overlays are dispatched from here on purpose.
  // Vector primitives, flat fills, 'lighter' for glow. No gradients, no shadowBlur, no filter.
  // ===================================================================================

  // Twinkle points along the silhouette — precomputed so the figure can crackle for free.
  const TW_N = 24;
  const TW = new Float32Array(TW_N * 2);
  (function buildTwinkles() {
    const pts = [
      -42, -60, 0, -78, 42, -60, 30, 10, 64, 96, 34, 122, 0, 102, -34, 122,
      -64, 96, -30, 10, -70, -18, -84, 6, 72, -46, 86, -96, -22, -104, 22, -104,
      0, -127, -18, 52, 18, 52, -26, 150, 26, 150, -14, 168, 14, 168, 0, 40,
    ];
    for (let i = 0; i < TW_N * 2; i++) TW[i] = pts[i];
  })();

  // ---- the figure ----
  // Local units, origin at the chest. Head top -127, feet +168 => a 295px person: enormous next to
  // the 20px crowd silhouettes at their feet, which is the entire point of the shot.
  function drawFigure(B, ctx, cx, cy, k, white, alpha) {
    const s = B.s;
    const t = B.t;
    const hull = white ? '#FFFFFF' : C.bossHull;
    const trim = white ? '#FFFFFF' : C.bossTrim;

    ctx.save();
    ctx.translate(cx, cy + U.fsin(t * 1.7) * 2.5);       // 2.5px sway at 1.7 rad/s: alive, never floaty
    ctx.scale(k, k);
    ctx.globalAlpha = alpha;

    // --- backlight: three flat arcs instead of a radial gradient (the 60fps rule) ---
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = U.rgba(RGB_TRIM, 0.05 * alpha);
    ctx.beginPath(); ctx.arc(0, -20, 190, 0, U.TAU); ctx.fill();
    ctx.fillStyle = U.rgba(RGB_TRIM, 0.06 * alpha);
    ctx.beginPath(); ctx.arc(0, -40, 118, 0, U.TAU); ctx.fill();
    ctx.fillStyle = U.rgba(RGB_PETAL, 0.05 * alpha);
    ctx.beginPath(); ctx.arc(0, -104, 62, 0, U.TAU); ctx.fill();
    ctx.globalCompositeOperation = 'source-over';

    // --- legs (under the coat) ---
    ctx.fillStyle = hull;
    ctx.beginPath();
    ctx.moveTo(-32, 46); ctx.lineTo(-10, 46); ctx.lineTo(-12, 168); ctx.lineTo(-34, 168); ctx.closePath();
    ctx.moveTo(32, 46); ctx.lineTo(10, 46); ctx.lineTo(12, 168); ctx.lineTo(34, 168); ctx.closePath();
    ctx.fill();

    // --- arms: thick round strokes read as limbs at this scale ---
    // The RIGHT arm points at whatever they just pressed. In P1 it snaps, cell by cell, to the sky.
    let hx = 86, hy = -96;
    if (s && s.pressX !== undefined) {
      const dx = (s.pressX - cx) / k, dy = (s.pressY - (cy)) / k;
      const d = Math.max(1, Math.hypot(dx, dy));
      const reach = 92 + (s.armT > 0 ? 10 : 0);         // 10px extra on the snap: the press has a punch
      hx = 42 + dx / d * reach; hy = -60 + dy / d * reach;
    }
    ctx.strokeStyle = hull; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = 16;
    ctx.beginPath(); ctx.moveTo(-42, -60); ctx.lineTo(-70, -18); ctx.lineTo(-84, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, -60); ctx.lineTo(72, -46); ctx.lineTo(hx, hy); ctx.stroke();

    // --- coat: shoulders, waist, flared hem, two tails ---
    ctx.beginPath();
    ctx.moveTo(-42, -60);
    ctx.lineTo(42, -60);
    ctx.lineTo(30, 10);
    ctx.lineTo(64, 96);
    ctx.lineTo(34, 122);
    ctx.lineTo(0, 100);
    ctx.lineTo(-34, 122);
    ctx.lineTo(-64, 96);
    ctx.lineTo(-30, 10);
    ctx.closePath();
    ctx.fillStyle = hull; ctx.fill();

    // --- head: a chrysanthemum with a cap brim. They are made of firework light; so is their face. ---
    ctx.beginPath(); ctx.arc(0, -104, 23, 0, U.TAU); ctx.fillStyle = hull; ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-36, -120); ctx.lineTo(36, -120); ctx.lineTo(30, -127); ctx.lineTo(-30, -127); ctx.closePath();
    ctx.fill();

    // --- rim light: the #FFB6E6 backlit edge the spec asks for, additive so it glows ---
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = trim;
    ctx.lineWidth = 2.6; ctx.globalAlpha = alpha * 0.9;
    ctx.beginPath();
    ctx.moveTo(-42, -60); ctx.lineTo(42, -60); ctx.lineTo(30, 10); ctx.lineTo(64, 96);
    ctx.lineTo(34, 122); ctx.lineTo(0, 100); ctx.lineTo(-34, 122); ctx.lineTo(-64, 96);
    ctx.lineTo(-30, 10); ctx.closePath(); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -104, 23, 0, U.TAU); ctx.stroke();
    ctx.lineWidth = 3.2;
    ctx.beginPath(); ctx.moveTo(-42, -60); ctx.lineTo(-70, -18); ctx.lineTo(-84, 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(42, -60); ctx.lineTo(72, -46); ctx.lineTo(hx, hy); ctx.stroke();

    // head corona: 12 short spokes, the sparkler that stands in for a face
    ctx.lineWidth = 2;
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * U.TAU + t * 0.5;
      const r0 = 26, r1 = 34 + 8 * Math.abs(U.fsin(t * 4 + i));
      ctx.globalAlpha = alpha * (0.35 + 0.45 * Math.abs(U.fsin(t * 3.2 + i * 1.3)));
      ctx.beginPath();
      ctx.moveTo(U.fcos(a) * r0, -104 + U.fsin(a) * r0);
      ctx.lineTo(U.fcos(a) * r1, -104 + U.fsin(a) * r1);
      ctx.stroke();
    }

    // twinkles: the figure is not lit, the figure IS the light
    ctx.fillStyle = trim;
    for (let i = 0; i < TW_N; i++) {
      const a = 0.20 + 0.70 * Math.abs(U.fsin(t * 6 + i * 1.7));
      ctx.globalAlpha = alpha * a;
      ctx.beginPath(); ctx.arc(TW[i * 2], TW[i * 2 + 1], 2.2, 0, U.TAU); ctx.fill();
    }

    // --- the firing board: 64 buttons, held across the CHEST. Their hands are the sky. ---
    // Held at chest height (local y -40) not the waist: the figure stands at STAND_Y=640, so a
    // waist-height prop clipped the board against the 720px canvas edge. The board is the whole
    // story — it must sit fully on screen. Legs still run off the bottom, which is intended.
    const BY = -40;                     // board top, figure-local
    ctx.globalAlpha = alpha;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = white ? '#FFFFFF' : '#0B1020';
    ctx.fillRect(-86, BY, 172, 80);
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = trim; ctx.lineWidth = 2;
    ctx.strokeRect(-86, BY, 172, 80);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const bi = r * 8 + c;
        const lit = (B.phase === 0) ? (buttons[bi].alive && buttons[bi].open)
                                    : (((bi * 7 + ((t * 6) | 0)) % 11) === 0);
        ctx.globalAlpha = alpha * (lit ? 1 : 0.22);
        ctx.fillStyle = lit ? '#FFFFFF' : (r >= 6 ? C.amber : C.enemyTrim);
        ctx.fillRect(-76 + c * 20, BY + 10 + r * 8.4, 8, 5);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- P1 sky furniture: the 8x8 board ----
  function drawBoard(B, ctx) {
    ctx.save();
    // bodies first
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (!b.alive) {
        // a dead cell stays on the board as an empty socket, so the grid you learned never moves
        ctx.globalCompositeOperation = 'source-over';
        ctx.strokeStyle = 'rgba(255,182,230,0.09)';
        ctx.lineWidth = 1;
        ctx.strokeRect(b.x - BTN_HW, b.y - BTN_HH, BTN_HW * 2, BTN_HH * 2);
        continue;
      }
      const squash = b.pressT > 0 ? (1 - b.pressT * 0.55) : 1;   // key-down squash: 0.22s of physical feedback
      const hw = BTN_HW * squash, hh = BTN_HH * squash;
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = b.hitFlash > 0 ? '#FFFFFF' : (b.open ? '#FFFFFF' : C.bossHull);
      ctx.fillRect(b.x - hw, b.y - hh, hw * 2, hh * 2);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = b.amber ? C.amber : C.enemyTrim;
      ctx.lineWidth = b.open ? 2.4 : 1.4;
      ctx.strokeRect(b.x - hw, b.y - hh, hw * 2, hh * 2);
      // shape-code the amber rows: a triangle means "this one can never be yours"
      if (b.amber) {
        ctx.fillStyle = b.open ? C.amber : U.hexa(C.amber, 0.5);
        ctx.beginPath();
        ctx.moveTo(b.x, b.y - 8); ctx.lineTo(b.x + 8, b.y + 6); ctx.lineTo(b.x - 8, b.y + 6);
        ctx.closePath(); ctx.fill();
      }
      // a lit button carries an HP pip so a half-broken cell is worth going back for
      if (b.open && b.hp < b.maxHp) {
        ctx.fillStyle = U.rgba(RGB_PETAL, 0.9);
        ctx.fillRect(b.x - hw, b.y + hh + 3, hw * 2 * (b.hp / b.maxHp), 2);
      }
    }
    // rings last: the invitation is never occluded by the thing it invites you to prevent
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (!b.alive || !b.open) continue;
      const kf = U.clamp(b.fuseT / b.fuseMax, 0, 1);
      const rr = 20 + 20 * kf * (CFG.FUSE_RING_SCALE - 1);       // shrinks to the button = a visual countdown
      const a = 0.62 + 0.38 * Math.abs(U.fsin(B.t * U.TAU * CFG.FUSE_RING_HZ));
      ctx.strokeStyle = U.rgba(RGB_WHITE, a);
      ctx.lineWidth = 2.4;
      ctx.beginPath(); ctx.arc(b.x, b.y, rr, 0, U.TAU); ctx.stroke();
    }
    // the column tell: a faint shaft under every lit cell, so "petals fall down THIS column" is visible
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < buttons.length; i++) {
      const b = buttons[i];
      if (!b.alive || !b.open) continue;
      ctx.fillStyle = 'rgba(255,255,255,0.045)';
      ctx.fillRect(b.x - 22, b.y, 44, FOOT_Y - b.y);
    }
    ctx.restore();
  }

  // ---- P2 sky furniture: the ghost being remembered ----
  function drawGhost(B, ctx) {
    const s = B.s;
    if (s.gi === undefined || s.gi < 0) return;
    const gx = GHOST_X[s.gi], gy = GHOST_Y[s.gi] + U.fsin(B.t * 1.3) * 8;
    const k = 0.45;                                   // 45% scale, per spec: a memory, not a rerun
    const a = 0.40;                                   // 40% alpha white with a cyan rim
    ctx.save();
    ctx.translate(gx, gy);
    ctx.scale(k, k);
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = a;
    ctx.fillStyle = '#FFFFFF';
    ctx.strokeStyle = C.mineA;
    ctx.lineWidth = 5;

    if (s.gi === 0) {
      // ROMAN CANDLE: a tall tapered tube with a wrought-iron collar
      ctx.beginPath();
      ctx.moveTo(-58, 210); ctx.lineTo(-34, -190); ctx.lineTo(34, -190); ctx.lineTo(58, 210);
      ctx.closePath(); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, -190, 34, 12, 0, 0, U.TAU); ctx.stroke();
      ctx.lineWidth = 8;
      ctx.beginPath(); ctx.moveTo(-52, 90); ctx.lineTo(52, 90); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-46, 20); ctx.lineTo(46, 20); ctx.stroke();
    } else if (s.gi === 1) {
      // CATHERINE: the wheel, spinning at its own 140 deg/s
      ctx.rotate(s.gAng);
      ctx.beginPath(); ctx.arc(0, 0, 150, 0, U.TAU); ctx.stroke();
      ctx.beginPath(); ctx.arc(0, 0, 46, 0, U.TAU); ctx.fill();
      for (let i = 0; i < 6; i++) {
        const ang = i / 6 * U.TAU;
        const c = U.fcos(ang), sn = U.fsin(ang);
        ctx.lineWidth = 7;
        ctx.beginPath(); ctx.moveTo(c * 44, sn * 44); ctx.lineTo(c * 150, sn * 150); ctx.stroke();
        ctx.beginPath(); ctx.arc(c * 158, sn * 158, 14, 0, U.TAU); ctx.fill();
      }
    } else {
      // KAMURO: the shell that hangs, with its drooping willow tendrils
      ctx.beginPath(); ctx.arc(0, 0, 96, 0, U.TAU); ctx.fill();
      ctx.lineWidth = 6;
      for (let i = 0; i < 10; i++) {
        const ang = -Math.PI + i / 9 * Math.PI;
        const c = U.fcos(ang), sn = U.fsin(ang);
        ctx.beginPath();
        ctx.moveTo(c * 92, sn * 92);
        ctx.quadraticCurveTo(c * 190, sn * 100 + 60, c * 210, 230);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- P5 sky furniture: the last shell they became ----
  function drawShell(B, ctx) {
    const s = B.s;
    const grow = s.dying > 0 ? (1 + (DEATH_TIME - s.dying) * 0.9) : 1;
    ctx.save();
    ctx.translate(B.x, B.y);
    ctx.globalCompositeOperation = 'lighter';
    // 24 spokes to the node ring: the figure has become a chrysanthemum mid-burst
    ctx.lineWidth = 3;
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * U.TAU + B.t * 0.35;
      const r1 = (150 + 60 * Math.abs(U.fsin(B.t * 2.4 + i))) * grow;
      ctx.strokeStyle = U.rgba(RGB_TRIM, 0.30 + 0.35 * Math.abs(U.fsin(B.t * 3 + i * 0.8)));
      ctx.beginPath();
      ctx.moveTo(U.fcos(a) * 60 * grow, U.fsin(a) * 60 * grow);
      ctx.lineTo(U.fcos(a) * r1, U.fsin(a) * r1);
      ctx.stroke();
    }
    ctx.strokeStyle = U.rgba(RGB_PETAL, 0.28);
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, NODE_RING_R * grow, 0, U.TAU); ctx.stroke();
    ctx.strokeStyle = U.rgba(RGB_TRIM, 0.22);
    ctx.beginPath(); ctx.arc(0, 0, 150 * grow, 0, U.TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ---- the footlight line: where powder lands, and where they are standing ----
  function drawFootlights(B, ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const a = 0.10 + 0.05 * Math.abs(U.fsin(B.t * 2.2));
    ctx.fillStyle = U.rgba(RGB_PETAL, a);
    ctx.fillRect(0, FOOT_Y - 2, CFG.W, 3);
    ctx.fillStyle = U.rgba(RGB_PETAL, a * 0.35);
    ctx.fillRect(0, FOOT_Y, CFG.W, 26);
    ctx.globalCompositeOperation = 'source-over';
    ctx.restore();
  }

  // ===================================================================================
  return {
    name: 'THE SHOWRUNNER',
    hp: 5000,                    // 5 phases x ~1000hp of design. Every phase also has a real timeout.
    x: CFG.W * 0.5,
    y: STAND_Y,                  // THE WHOLE STORY: the boss starts on the rooftops, at the bottom, with the crowd.
    bodyR: 150,                  // only used in P5, where the ascended shell is petal-vulnerable

    phases: [PH_BOARD, PH_CALLBACK, PH_CROWD, PH_BLACKOUT, PH_FINALE],

    draw(B, ctx) {
      const ph = B.phase;
      const s = B.s;

      if (ph === 0) { drawFootlights(B, ctx); drawBoard(B, ctx); }
      else if (ph === 1) { drawFootlights(B, ctx); drawGhost(B, ctx); }
      else if (ph === 2) { drawFootlights(B, ctx); }
      else if (ph === 4) { drawShell(B, ctx); }

      if (ph === 3) {
        // BLACKOUT: invisible except the flash. The afterimage is all the mercy you get.
        if (s.open) drawFigure(B, ctx, B.x, B.y, 1, true, 1);
        else if (s.fade > 0) drawFigure(B, ctx, B.x, B.y, 1, true, 0.13 * (s.fade / 0.55));
        return;
      }

      // P5 scales them up as they become the last shell; everywhere else they are a person on a roof.
      const k = ph === 4 ? U.lerp(1, 1.35, s.asc || 0) : 1;
      // and during the 3s death bloom they dissolve into the light they were always made of
      const a = (ph === 4 && s.dying > 0) ? U.clamp(s.dying / DEATH_TIME, 0, 1) : 1;
      drawFigure(B, ctx, B.x, B.y, k, false, a);
    },
  };
})();
