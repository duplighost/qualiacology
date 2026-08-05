// FINALE — BOSS II: CATHERINE (Act II, THE CRANE YARD). Spec §8.2.
//
// A 12-metre iron wheel bolted to a construction crane. Six spokes, each tipped with a burning
// shell-head. It spins. The SIX HEADS ARE THE NODES — there is no separate armour, no separate
// weak point, no HP sponge anywhere in the fight: you kill CATHERINE by repeatedly beating the
// same six shells to their own explosions while the wheel turns them past you.
//
// THE ONE IDEA: a fuse-killed head blooms 18 petals fired TANGENTIALLY along the rotation
// direction. Those petals arc around the rim and land in the NEXT head. Chaining three heads in a
// single rotation is the intended flex and the whole reason this boss is a wheel and not a tower.
// Fan spread is 60° centred on the tangent because the chord to the next head sits at exactly
// tangent+30° (two points 60° apart on a circle) — so the fan's leading edge is aimed at your
// next victim by construction, at any rotation speed.
//
// BOSS LAW 1 (petal-only armour): heads are nodes, so the peashooter cannot touch them. Every phase
// therefore keeps a steady add cadence — SPARK/CANDLE/DRUM/WHIP feeders that your gun CAN pop.
// BOSS LAW 2 (no sponge): every phase is a different question. SPIN UP is a metronome, THE SWING is
// a moving target, UNBOLTED takes your gun away entirely, LAST TURN is a single slow pirouette.
//
// No amber anywhere in this fight. CATHERINE has no unconvertible content by design: she is the act
// that teaches conversion at speed, and an amber beam would let the player opt out of learning it.
window.BossCatherine = (() => {
  const N = 6;                               // six spokes. The name of the firework is the geometry.
  const SPOKE = U.TAU / N;
  const HEAD_R = 130;                        // px, node ring radius = spec's wheel radius
  const HEAD_HP = 42;                        // spec §8.2. 3 in-window petals (6 dmg x3 armour = 18) kill one.
  const HEAD_RESPAWN = 6.0;                  // s of silence per spec — the spoke goes dark, then relights
  const RAD2DEG = 180 / Math.PI;
  const OWNER = 2;                           // ownerBoss tag on P3 lanterns so we can find ours cheaply

  // Body HP per fuse-killed head, by phase. Tuned against each phase's budget so no phase can be
  // out-waited: P1 750hp/80 = 10 heads in 35s, P2 900/90 = 10 in 40s, P3 600/100 = 6 in 40s,
  // P4 750/125 = exactly 6 = one clean pass around the wheel.
  const HEAD_BODY_DMG = [80, 90, 100, 125];
  const NO_WINDOW_MULT = 0.35;               // killing a dark head with raw petals still counts, but the window is the point

  // ---- preallocated pattern descriptors (data, never code — the conversion contract) ----
  // One bloom desc PER HEAD, because each carries its own live tangent angle.
  const HEAD_BLOOM = [];
  for (let i = 0; i < N; i++) {
    HEAD_BLOOM.push({ kind: 'fan', n: 18, spread: 60, speed: 190, aimed: false, angle: 0 });
  }
  // P1: the classic readable rotating spiral — 3-bullet spread, 14°, 200 px/s, fired radially outward.
  const P1_SHOT = { kind: 'fan', n: 3, spread: 14, speed: 200, aimed: false, angle: 0 };
  // P2: crossettes. 190 px/s so the SPLITFLASH tell is always readable before the split lands.
  const P2_CROSS = { kind: 'cross', n: 4, speed: 190, splitAfter: 0.70, aimed: false };
  // P3: 2-arm dense spiral off the unbolted hub. 240 px/s — fast, but it emanates from a visible centre.
  const P3_SPIRAL = { kind: 'spiral', arms: 2, angle: 0, speed: 240 };
  // P4: one bullet per spoke per tick. 6 spokes x 10/s = the spec's 60 b/s solid arms.
  const P4_STREAM = { kind: 'fan', n: 1, spread: 0, speed: 160, aimed: false, angle: 0 };

  // ---- preallocated per-head scratch (assigned onto B.s at every phase enter) ----
  const respawnT = new Float32Array(N);
  const wasAlive = new Uint8Array(N);
  const wasOpen = new Uint8Array(N);

  // rotation is the boss's PHYSICAL state, not phase state — it must not snap when a phase changes,
  // so it carries across enter() (which wipes B.s) through these two module carries.
  let carryRot = 0, carryRotW = U.deg(45);

  // cosmetic particle colours, preallocated: Pool copies rgb[0..2], so one shared array is safe.
  const RGB_EMBER = [255, 45, 111];
  const RGB_ASH = [255, 182, 230];

  // ---- colour strings baked once at boot (U.hexa allocates; never call it per frame) ----
  const C_IRON = CFG.COL.bossHull;
  const C_TRIM = CFG.COL.bossTrim;
  const C_CORE = CFG.COL.enemyCore;
  const IRON_DARK = U.hexa(CFG.COL.bossHull, 0.92);
  const IRON_EDGE = U.hexa(CFG.COL.bossTrim, 0.55);
  const IRON_FAINT = U.hexa(CFG.COL.bossTrim, 0.22);
  const BOOM_FILL = U.hexa(CFG.COL.city, 0.96);
  const BOOM_EDGE = U.hexa(CFG.COL.bossTrim, 0.30);
  const FLAME_HOT = U.hexa(CFG.COL.enemyCore, 0.50);
  const FLAME_MID = U.hexa(CFG.COL.enemyCore, 0.28);
  const FLAME_TIP = U.hexa(CFG.COL.bossTrim, 0.30);
  const EMBER_DIM = U.hexa(CFG.COL.bossTrim, 0.35);
  const RING_FAINT = U.hexa(CFG.COL.bossTrim, 0.18);
  const RING_TIMER = U.hexa(CFG.COL.bossTrim, 0.75);

  // =====================================================================================
  // SHARED HEAD MACHINERY
  // =====================================================================================

  // Build the six heads and reset all per-head scratch. Called from every phase's enter().
  function initHeads(B, api) {
    B.s.rot = carryRot;
    B.s.rotW = carryRotW;
    B.s.freezeT = 0;                 // P2's own mini-stagger. NEVER touch B.staggerT — that advances the phase.
    B.s.fireT = 0;
    B.s.addT = 0;
    B.s.respawn = respawnT;
    for (let i = 0; i < N; i++) {
      respawnT[i] = 0; wasAlive[i] = 1; wasOpen[i] = 0;
      B.nodes.push(api.makeNode(B.s.rot + i * SPOKE, HEAD_R, HEAD_HP, HEAD_BLOOM[i]));
    }
  }

  // A head just died. Convert that into body damage, silence, and spectacle.
  function headDown(B, api, i, openAtDeath) {
    let dmg = HEAD_BODY_DMG[B.phase] || 80;
    if (!openAtDeath) dmg *= NO_WINDOW_MULT;         // no window, no cascade, no real progress
    if (B.s.freezeT > 0) dmg *= 2;                   // P2 stagger reward: x2 while the wheel is frozen
    api.damageBody(dmg);
    respawnT[i] = HEAD_RESPAWN;
    const n = B.nodes[i];
    api.fx.puff(n.x, n.y, 22);
    api.fx.shake(openAtDeath ? 4 : 2);               // a fuse-kill should be felt, a grind-down shouldn't
    api.audio.salute(n.x);
  }

  // Position, tangent-aim, death-detect and respawn all six heads. Runs before any phase logic so a
  // head that died during last frame's collision pass is handled on the very next tick.
  function tickHeads(B, dt, api) {
    const s = B.s;
    const dir = s.rotW >= 0 ? 1 : -1;                // which way the tangent points
    const tanOff = dir * (Math.PI / 2);
    s.deathsThisTick = 0;                            // counted at the true kill edge (see below)
    for (let i = 0; i < N; i++) {
      const n = B.nodes[i];
      // THE kill edge. Differencing liveCount() can't see this: a head respawns 6s later in this same
      // loop, so before/after counts routinely tie and "kills this traverse" always read 0 — the
      // JAMMED reward (kill 3 heads in one swing) was unreachable dead code.
      if (wasAlive[i] && !n.alive) { headDown(B, api, i, wasOpen[i] !== 0); s.deathsThisTick++; }
      if (!n.alive) {
        respawnT[i] -= dt;
        if (respawnT[i] <= 0) {                      // the spoke relights, full HP. CATHERINE never runs out of heads.
          n.alive = true; n.hp = n.maxHp; n.open = false; n.fuseT = 0;
          api.fx.puff(n.x, n.y, 16);
          api.audio.pop(n.x);
        }
      }
      n.ang = s.rot + i * SPOKE;
      // set x/y ourselves so heads are correct even on frames where we skip cycleNodes (hush/tear)
      n.x = B.x + U.fcos(n.ang) * HEAD_R;
      n.y = B.y + U.fsin(n.ang) * HEAD_R;
      // THE tangential bloom aim, refreshed every frame so a kill at any instant fires true.
      HEAD_BLOOM[i].angle = (n.ang + tanOff) * RAD2DEG;
      wasAlive[i] = n.alive ? 1 : 0;
      wasOpen[i] = n.open ? 1 : 0;
    }
    carryRot = s.rot; carryRotW = s.rotW;
  }

  // Sparks shed off the rim. Cosmetic only — rngFx, never the gameplay stream.
  function shedSparks(B) {
    if (U.rngFx.next() > 0.55) return;               // ~33 sparks/s: a shower, not a smokescreen
    const i = (U.rngFx.next() * N) | 0;
    const n = B.nodes[i];
    if (!n || !n.alive) return;
    const dir = B.s.rotW >= 0 ? 1 : -1;
    const ta = n.ang + dir * (Math.PI / 2);
    const sp = 90 + U.rngFx.next() * 160;
    FX.particle(n.x, n.y,
      U.fcos(ta) * sp + U.rngFx.range(-30, 30),
      U.fsin(ta) * sp + U.rngFx.range(-10, 60),      // biased downward: sparks fall onto the rooftops
      0.5 + U.rngFx.next() * 0.6, 2, U.rngFx.next() < 0.6 ? RGB_EMBER : RGB_ASH, 0.90);
  }

  // Feeder spawn helper. Alternating sides so the petal source is never always on the same flank.
  function feedSide(api, B, name, y) {
    B.s.addSide = B.s.addSide ? 0 : 1;
    const x = B.s.addSide ? 180 : CFG.W - 180;
    return api.spawnAdd(name, x, -30, { homeX: x, homeY: y, delay: 0.55, enterT: 0.7 });
  }

  // =====================================================================================
  // PHASE 1 — "SPIN UP"   100% -> 75%, budget 35s
  // Teaches the wheel: it accelerates, the heads light in sequence, and the tangential bloom
  // shows you that a kill on the rim throws petals along the rim.
  // =====================================================================================
  const PHASE_SPIN_UP = {
    name: 'SPIN UP',
    budget: 35,
    hpFrac: 0.75,
    bodyVulnerable: false,
    enter(B, api) {
      carryRot = 0; carryRotW = U.deg(45);           // fresh fight: start slow so the ramp is legible
      initHeads(B, api);
      B.x = 640; B.y = 240;                          // spec: wheel centre (640,240)
      B.s.ramp = 0;
      B.s.addSide = 0;
    },
    update(B, dt, api, isEighth) {
      const s = B.s;
      // rotation ramps 45 -> 120 deg/s over 12s. The whole phase is the sound of a wheel spinning up.
      s.ramp = Math.min(1, s.ramp + dt / 12);
      s.rotW = U.deg(45 + 75 * s.ramp);
      s.rot += s.rotW * dt;
      tickHeads(B, dt, api);
      shedSparks(B);

      // every 0.50s all live heads fire a 3-bullet spread radially outward -> six clean arms
      s.fireT -= dt;
      if (s.fireT <= 0) {
        s.fireT = 0.50;
        for (let i = 0; i < N; i++) {
          const n = B.nodes[i];
          if (!n.alive) continue;                    // a silenced spoke is a visible hole in the pattern
          P1_SHOT.angle = n.ang * RAD2DEG;
          api.emitPattern(P1_SHOT, n.x, n.y, 0);
        }
      }

      // heads light one at a time around the wheel. The engine cycles serially, so cadence =
      // window + gap; 0.50 + 0.04 lands on the spec's "one every ~0.40-0.50s" with a visible dark beat.
      api.cycleNodes(dt, 'sequence', 0.50, 0.04);

      // LAW 1: your petal source. A SPARK every 1.9s (~18 across the phase); its 5-petal bloom is
      // exactly enough to take a lit head, which is the lesson this phase is teaching.
      s.addT -= dt;
      if (s.addT <= 0 && isEighth) {
        s.addT = 1.9;
        feedSide(api, B, 'SPARK', 250 + U.rngRun.range(-40, 40));
      }
    },
  };

  // =====================================================================================
  // PHASE 2 — "THE SWING"   75% -> 45%, budget 40s
  // NEW IDEA: the wheel stops being a fixed point. Now you have to lead a moving rim, and the
  // bullets split. Kill 3 heads inside a single traverse and the crane jams: 0.9s frozen, all heads
  // open, double body damage. The phase rewards planning a whole swing in advance.
  // =====================================================================================
  const PHASE_SWING = {
    name: 'THE SWING',
    budget: 40,
    hpFrac: 0.45,
    bodyVulnerable: false,
    enter(B, api) {
      initHeads(B, api);
      B.y = 240;
      B.s.swingT = 0;
      B.s.swingIdx = 0;
      B.s.swingKills = 0;
      B.s.whipT = 0;
      B.s.drumT = 4.0;                               // first big petal gift lands early, not at the end
      B.s.addSide = 0;
    },
    update(B, dt, api) {
      const s = B.s;

      if (s.freezeT > 0) {
        // the jam. Wheel stopped, nothing fires, every head open. Pure DPS window, 0.9s.
        s.freezeT -= dt;
        tickHeads(B, dt, api);
        api.cycleNodes(dt, 'all');
        if (s.freezeT <= 0) { s.swingKills = 0; api.fx.shake(5); }
        return;
      }

      // spec: x = 640 + 380*sin(2*pi*t/4.2) -> 260..1020, period 4.2s
      s.swingT += dt;
      const ph = s.swingT * U.TAU / 4.2;
      B.x = 640 + 380 * U.fsin(ph);
      const movingRight = U.fcos(ph) >= 0;

      // a "swing" is one traverse = half a period. Three heads inside one traverse jams the crane.
      const idx = (s.swingT / 2.1) | 0;
      if (idx !== s.swingIdx) { s.swingIdx = idx; s.swingKills = 0; }

      s.rotW = U.approach(s.rotW, U.deg(100), U.deg(70) * dt);   // ease down off P1's 120, don't snap
      s.rot += s.rotW * dt;
      tickHeads(B, dt, api);
      const killed = s.deathsThisTick;               // real deaths this frame, edge-counted in tickHeads
      if (killed > 0) {
        s.swingKills += killed;
        if (s.swingKills >= 3) {
          s.freezeT = 0.9;
          api.fx.hitstop(0.06);                      // brief, so the freeze reads as the crane jamming
          api.fx.shake(8);
          api.fx.banner('JAMMED');
          api.audio.phaseSting();
        }
      }
      shedSparks(B);

      // crossettes from two opposite heads every 0.80s. 8 bullets -> 32 after the split, and the
      // SPLITFLASH white tell fires 3 frames before every split, which is the readability contract.
      s.fireT -= dt;
      if (s.fireT <= 0) {
        s.fireT = 0.80;
        const a = (s.crossCursor | 0) % N;
        s.crossCursor = a + 1;
        fireHead(B, api, a, P2_CROSS);
        fireHead(B, api, (a + 3) % N, P2_CROSS);     // +3 = the opposite spoke
      }

      api.cycleNodes(dt, 'sequence', 0.55, 0.35);    // spec: window 0.55s, sequence 0.35s

      // adds: 4 WHIP per swing from the TRAILING edge, so they chase the wheel across the screen.
      s.whipT -= dt;
      if (s.whipT <= 0 && Enemies.alive() < 18) {
        s.whipT = 1.05;                              // 4.2s swing / 4 whips
        const x = movingRight ? 40 : CFG.W - 40;
        api.spawnAdd('WHIP', x, 200, { homeY: 200, dir: movingRight ? 1 : -1, delay: 0.8 });
      }
      // LAW 1 insurance: a WHIP is only 3 petals. One DRUM every 9s guarantees a real 24-petal
      // igniter exists even if the player is losing the whip race.
      s.drumT -= dt;
      if (s.drumT <= 0) {
        s.drumT = 9.0;
        const dx = movingRight ? 300 : CFG.W - 300;
        api.spawnAdd('DRUM', dx, -40, { homeX: dx, homeY: 320, delay: 1.0 });
      }
    },
  };

  function liveCount(B) { let c = 0; for (let i = 0; i < N; i++) if (B.nodes[i].alive) c++; return c; }
  function fireHead(B, api, i, desc) {
    const n = B.nodes[i];
    if (!n.alive) return;
    api.emitPattern(desc, n.x, n.y, 0);
  }

  // =====================================================================================
  // PHASE 3 — "UNBOLTED"   45% -> 25%, budget 40s
  // NEW IDEA: your gun is switched off. Ten LANTERN auras orbit the hub and eat every peashooter
  // bullet; petals pass straight through. The wheel tears off the crane and chases you. The hub
  // spits SPARK feeders OUTSIDE the shield — pop them with the gun out there, then rake the blooms
  // back in through the gaps. The purest statement in the game of "your gun is an igniter".
  // =====================================================================================
  const PHASE_UNBOLTED = {
    name: 'UNBOLTED',
    budget: 40,
    hpFrac: 0.25,
    bodyVulnerable: false,
    enter(B, api) {
      initHeads(B, api);
      B.s.tearT = 2.0;                               // 2.0s of screaming metal before it comes loose
      B.s.slowT = 0;
      B.s.lanternsUp = 0;
      B.s.spiralAcc = 0;
      B.s.feedT = 0.8;
      B.s.feedAng = 0;
      B.s.addSide = 0;
      api.fx.banner('UNBOLTED');
      // two SPARKs handed over before the tear so the player is never empty during the 2.5s of setup
      api.spawnAdd('SPARK', 260, -30, { homeX: 260, homeY: 480, delay: 0.9 });
      api.spawnAdd('SPARK', CFG.W - 260, -30, { homeX: CFG.W - 260, homeY: 480, delay: 0.9 });
    },
    update(B, dt, api) {
      const s = B.s;

      // ---- the tear-off: 2.0s of shriek, then 0.5s of local slow-mo ----
      if (s.tearT > 0) {
        s.tearT -= dt;
        s.rotW = U.approach(s.rotW, U.deg(240), U.deg(120) * dt);
        s.rot += s.rotW * dt;
        B.x = 640 + U.fsin(B.t * 47) * (1 - s.tearT / 2.0) * 7;   // 47 rad/s = a violent metal buzz
        B.y = 240 + U.fsin(B.t * 61) * (1 - s.tearT / 2.0) * 5;
        tickHeads(B, dt, api);
        shedSparks(B); shedSparks(B); shedSparks(B);              // 3x the shower while the bolts go
        if (s.tearT <= 0) {
          s.slowT = 0.5;
          api.fx.shake(10); api.fx.hitstop(0.05); api.audio.phaseSting();
        }
        return;
      }
      // The engine owns dt, so the spec's global 0.35x slow-mo is expressed locally: the WHEEL's own
      // clock crawls for 0.5s while the rest of the game runs at speed. Same read, no engine change.
      let sdt = dt;
      if (s.slowT > 0) { s.slowT -= dt; sdt = dt * 0.35; }

      if (!s.lanternsUp) {
        s.lanternsUp = 1;
        for (let i = 0; i < 10; i++) {                             // spec: 10 LANTERNs, r=210, 36 deg/s
          const a = i / 10 * U.TAU;
          api.spawnAdd('LANTERN', B.x + U.fcos(a) * 210, B.y + U.fsin(a) * 115,
            { cx: B.x, cy: B.y, orbitR: 210, orbitW: 36, phase: a, mv: 'orbit', ownerBoss: OWNER });
        }
      }

      s.rotW = U.deg(240);
      s.rot += s.rotW * sdt;

      // ---- the chase: 90 px/s. Never fast enough to catch you (top speed 520) — it is pressure,
      // not a threat. Clamped so the r=210 lantern ring always stays legible on screen.
      const p = api.player;
      const dx = p.x - B.x, dy = p.y - B.y;
      const d = Math.hypot(dx, dy);
      if (d > 2) { B.x += dx / d * 90 * sdt; B.y += dy / d * 90 * sdt; }
      B.x = U.clamp(B.x, 230, CFG.W - 230);
      B.y = U.clamp(B.y, 150, 430);

      // drag the orbiting lanterns along with the hub (Enemies' orbit mv reads cx/cy every frame)
      const list = Enemies.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e.ownerBoss !== OWNER) continue;
        e.cx = B.x; e.cy = B.y;
      }

      tickHeads(B, dt, api);
      shedSparks(B);

      // 2-arm spiral, 22 bullets/s/arm, spd 240, rotating with the wheel itself
      s.spiralAcc += sdt;
      while (s.spiralAcc >= 0.04545) {                             // 1/22 s per arm-pair
        s.spiralAcc -= 0.04545;
        P3_SPIRAL.angle = s.rot;
        api.emitPattern(P3_SPIRAL, B.x, B.y, 0);
      }

      api.cycleNodes(dt, 'pairs', 0.60, 0.45);                     // opposite heads: forces you around the ring

      // ---- feeders. Spat from the hub out to r=300, i.e. OUTSIDE the lantern shield, where the
      // peashooter still works. Spec says 3/s; 3/s plus 10 lanterns overruns the 48-enemy cap, so the
      // rate is 1.8/s with a headroom guard — still a continuous, reliable petal supply.
      s.feedT -= dt;
      if (s.feedT <= 0 && Enemies.alive() < 28) {
        s.feedT = 0.55;
        s.feedAng += 2.399963;                                     // golden angle: feeders never stack up
        const hx = U.clamp(B.x + U.fcos(s.feedAng) * 300, 60, CFG.W - 60);
        const hy = U.clamp(B.y + U.fsin(s.feedAng) * 300, 90, CFG.H - 120);
        api.spawnAdd('SPARK', B.x, B.y, { homeX: hx, homeY: hy, delay: 1.0, enterT: 0.9 });
      }
    },
  };

  // =====================================================================================
  // PHASE 4 — "CATHERINE'S LAST TURN"   25% -> 0%, budget 44s
  // NEW IDEA: nothing. Literally — it opens with total silence and no bullets. Then one enormous
  // slow pirouette, six solid arms, every head permanently lit. You live in the wedges and you move
  // WITH the wheel. Six fuse-kills end her; the tangential bloom means the six can be one cascade.
  // Budget is 44s (not spec's 20s) because the authored fail-forward is an 18s rotation followed by
  // a 12s retry — a 20s budget would let the engine timeout eat the retry before it ever happened.
  // =====================================================================================
  const PHASE_LAST_TURN = {
    name: "CATHERINE'S LAST TURN",
    budget: 44,
    hpFrac: 0,                                       // ends the fight the instant her HP hits zero
    bodyVulnerable: false,
    enter(B, api) {
      initHeads(B, api);
      B.s.hush = 0.8;                                // spec: 0.8s of total silence and no bullets
      B.s.turnT = 0;
      B.s.turnLen = 18.0;                            // 360 deg over 18.0s
      B.s.startRot = carryRot;
      B.s.punished = 0;
      B.s.addT = 0;
      B.s.addSide = 0;
      B.s.rotW = 0;
      // shed the lantern ring: they fall away rather than vanish, so the screen empties legibly
      const list = Enemies.list;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e.alive || e.ownerBoss !== OWNER) continue;
        e.leaving = true; e.mv = 'descend'; e.mvSpeed = 190; e.homeX = e.x;
      }
    },
    update(B, dt, api, isEighth) {
      const s = B.s;

      // ---- the hush. She glides home. Nothing fires, no head lights, no add spawns. ----
      if (s.hush > 0) {
        s.hush -= dt;
        B.x = U.approach(B.x, 640, 900 * dt);        // 900 px/s: home from anywhere on screen inside the hush
        B.y = U.approach(B.y, 260, 500 * dt);
        s.rotW = U.approach(s.rotW, 0, U.deg(600) * dt);
        s.rot += s.rotW * dt;
        tickHeads(B, dt, api);
        if (s.hush <= 0) {
          s.startRot = s.rot;
          api.fx.shake(7);
          api.fx.bloomFlash(B.x, B.y, 24, true);     // white flash: the wheel is ACT NOW from here on
          api.audio.salute(B.x);
          api.audio.phaseSting();
        }
        return;
      }

      // ---- one enormous slow rotation ----
      s.turnT += dt;
      const k = U.clamp(s.turnT / s.turnLen, 0, 1);
      s.rotW = U.TAU / s.turnLen;                    // 20 deg/s on the first turn, 30 on the 12s retry
      s.rot = s.startRot + U.TAU * k;
      tickHeads(B, dt, api);
      shedSparks(B);

      // six solid arms: one bullet per live spoke every 0.10s = the spec's 60 bullets/s at spd 160.
      // Slow and fat on purpose — this is a maze you walk through, not a volley you dodge.
      s.fireT -= dt;
      if (s.fireT <= 0) {
        s.fireT = 0.10;
        for (let i = 0; i < N; i++) {
          const n = B.nodes[i];
          if (!n.alive) continue;                    // a dead spoke is a WIDE safe wedge. Killing heads is dodging.
          P4_STREAM.angle = n.ang * RAD2DEG;
          api.emitPattern(P4_STREAM, n.x, n.y, 0);
        }
      }

      api.cycleNodes(dt, 'all');                     // all six permanently lit, x3 damage, petal-only

      // LAW 1: six permanently-open windows are worthless without petals. A SPARK every 1.6s plus a
      // DRUM every 11s keeps the igniter supply alive right through the finale.
      s.addT -= dt;
      if (s.addT <= 0 && isEighth) {
        s.addT = 1.6;
        feedSide(api, B, 'SPARK', 200 + U.rngRun.range(-30, 30));
      }
      s.drumT = (s.drumT || 11.0) - dt;
      if (s.drumT <= 0) {
        s.drumT = 11.0;
        const dx = U.rngRun.range(340, CFG.W - 340);
        api.spawnAdd('DRUM', dx, -40, { homeX: dx, homeY: 330, delay: 1.0 });
      }

      // ---- the rotation completes and she is still alive: FAIL FORWARD, never a wall. ----
      if (k >= 1) {
        s.turnT = 0;
        s.startRot = s.rot;
        s.turnLen = 12.0;                            // spec: the retry turn is faster
        s.punished++;
        // Spec calls for this to cost a life. There is no sanctioned API for spending one without
        // bypassing i-frames, the tier drop and the respawn lock, so the price is paid in bullets and
        // HP instead: a 120-bullet magenta ring with a single 40 deg safe wedge aimed AWAY from the
        // player (you must MOVE to survive it), and her HP is restored to 15%.
        punishRing(B, api);
        B.hp = Math.max(B.hp, B.maxHp * 0.15);
        api.fx.shake(10);
        api.fx.hitstop(0.09);
        api.fx.banner('AGAIN');
        api.audio.phaseSting();
      }
    },
    draw(B, ctx) {
      const s = B.s;
      if (!s || s.hush > 0 || s.turnLen === undefined) return;
      // the turn timer, drawn as an arc the wheel is eating. Trim pink, never white — white on this
      // boss belongs to the fuse rings alone.
      const k = U.clamp(s.turnT / s.turnLen, 0, 1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = RING_FAINT; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(B.x, B.y, 186, 0, U.TAU); ctx.stroke();
      ctx.strokeStyle = RING_TIMER; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(B.x, B.y, 186, -Math.PI / 2, -Math.PI / 2 + U.TAU * (1 - k)); ctx.stroke();
      ctx.restore();
    },
  };

  // 120-bullet ring, one 40 deg wedge left open opposite the player. Hand-rolled rather than a desc
  // because it is a one-shot scripted punishment that is never converted — the conversion contract
  // covers volleys that can become petals, and this one structurally cannot.
  function punishRing(B, api) {
    const bul = api.bul;
    const away = api.aim(B.x, B.y) + Math.PI;
    const half = U.deg(20);                          // 40 deg total safe wedge
    for (let i = 0; i < 120; i++) {
      const a = i / 120 * U.TAU;
      if (Math.abs(U.angDiff(a, away)) < half) continue;
      bul.spawn(B.x + U.fcos(a) * 150, B.y + U.fsin(a) * 150,
        U.fcos(a) * 240, U.fsin(a) * 240,            // spd 240: fast, but it starts 150px out and you can see it coming
        Pool.T.CIRCLE, Pool.FACTION.ENEMY, { r: 7, dmg: 1 });
    }
  }

  // =====================================================================================
  // DRAW — the silhouette. Iron wheel on a lattice crane boom, six burning shell-heads.
  // Vector primitives only: quads, arcs, flat fills, 'lighter' for glow. No gradients, no shadowBlur.
  // =====================================================================================

  // lattice crane boom from off the top of the screen down to the hub. Gone once she is unbolted.
  function drawBoom(B, ctx) {
    const px = 640, py = -260;                       // pivot well off-screen: the boom reads as huge
    const dx = B.x - px, dy = B.y - py;
    const L = Math.hypot(dx, dy);
    const a = Math.atan2(dy, dx);
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    const halfW0 = 46, halfW1 = 22;                  // tapers toward the wheel: perspective for free
    ctx.fillStyle = BOOM_FILL;
    ctx.beginPath();
    ctx.moveTo(0, -halfW0); ctx.lineTo(L, -halfW1); ctx.lineTo(L, halfW1); ctx.lineTo(0, halfW0);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = BOOM_EDGE; ctx.lineWidth = 2;
    ctx.stroke();
    // cross-bracing: 11 X's. Cheap, and it is what makes a rectangle read as a crane.
    ctx.lineWidth = 1.5;
    const SEG = 11;
    ctx.beginPath();
    for (let i = 0; i < SEG; i++) {
      const t0 = i / SEG, t1 = (i + 1) / SEG;
      const x0 = L * t0, x1 = L * t1;
      const w0 = U.lerp(halfW0, halfW1, t0), w1 = U.lerp(halfW0, halfW1, t1);
      ctx.moveTo(x0, -w0); ctx.lineTo(x1, w1);
      ctx.moveTo(x0, w0); ctx.lineTo(x1, -w1);
      ctx.moveTo(x1, -w1); ctx.lineTo(x1, w1);
    }
    ctx.stroke();
    // the yoke that holds the axle
    ctx.fillStyle = IRON_DARK;
    ctx.fillRect(L - 34, -30, 44, 60);
    ctx.strokeStyle = IRON_EDGE; ctx.lineWidth = 2;
    ctx.strokeRect(L - 34, -30, 44, 60);
    ctx.restore();
  }

  function drawWheel(B, ctx, rot, rotW, tearK) {
    const x = B.x, y = B.y;
    ctx.save();

    // --- outer rim: two concentric iron rings with a hot inner edge ---
    ctx.strokeStyle = IRON_DARK; ctx.lineWidth = 16;
    ctx.beginPath(); ctx.arc(x, y, HEAD_R, 0, U.TAU); ctx.stroke();
    ctx.strokeStyle = IRON_EDGE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, HEAD_R + 7, 0, U.TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(x, y, HEAD_R - 7, 0, U.TAU); ctx.stroke();
    // inner tension ring
    ctx.strokeStyle = IRON_FAINT; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, 86, 0, U.TAU); ctx.stroke();

    // --- rivets: 24 around the rim, rotating with the wheel so the spin is unmistakable ---
    ctx.fillStyle = IRON_EDGE;
    for (let i = 0; i < 24; i++) {
      const a = rot * 1.0 + i / 24 * U.TAU;
      ctx.fillRect(x + U.fcos(a) * HEAD_R - 2, y + U.fsin(a) * HEAD_R - 2, 4, 4);
    }

    // --- six tapered spokes ---
    for (let i = 0; i < N; i++) {
      const a = rot + i * SPOKE;
      const c = U.fcos(a), s = U.fsin(a);
      const nx = -s, ny = c;                          // spoke normal
      ctx.fillStyle = IRON_DARK;
      ctx.beginPath();
      ctx.moveTo(x + c * 26 + nx * 15, y + s * 26 + ny * 15);
      ctx.lineTo(x + c * HEAD_R + nx * 7, y + s * HEAD_R + ny * 7);
      ctx.lineTo(x + c * HEAD_R - nx * 7, y + s * HEAD_R - ny * 7);
      ctx.lineTo(x + c * 26 - nx * 15, y + s * 26 - ny * 15);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = IRON_FAINT; ctx.lineWidth = 1.5; ctx.stroke();
    }

    // --- hub: an octagon with a counter-rotating cog inside, so the centre never reads as a blob ---
    ctx.fillStyle = IRON_DARK;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = rot * 0.5 + i / 8 * U.TAU;
      const px = x + U.fcos(a) * 36, py = y + U.fsin(a) * 36;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = IRON_EDGE; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = IRON_FAINT; ctx.lineWidth = 3;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {                     // cog teeth, spun the other way
      const a = -rot * 1.6 + i / 8 * U.TAU;
      ctx.moveTo(x + U.fcos(a) * 12, y + U.fsin(a) * 12);
      ctx.lineTo(x + U.fcos(a) * 24, y + U.fsin(a) * 24);
    }
    ctx.stroke();
    // hub core: magenta, because the hub is CATHERINE herself and she is lethal to touch
    ctx.fillStyle = C_CORE;
    ctx.beginPath(); ctx.arc(x, y, 9, 0, U.TAU); ctx.fill();

    // --- the six burning shell-heads ---
    const dir = rotW >= 0 ? 1 : -1;
    const spin = Math.min(1, Math.abs(rotW) / U.deg(240));
    const plumeL = 26 + 54 * spin + tearK * 24;       // faster spin, longer flame — the wheel's tachometer
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < N; i++) {
      const n = B.nodes[i];
      const a = rot + i * SPOKE;
      const c = U.fcos(a), s = U.fsin(a);
      const hx = x + c * HEAD_R, hy = y + s * HEAD_R;
      if (!n || !n.alive) continue;
      // plume direction = opposite the tangent, blended 0.55 outward for centrifugal throw
      const tx = -U.fcos(a + dir * Math.PI / 2) + 0.55 * c;
      const ty = -U.fsin(a + dir * Math.PI / 2) + 0.55 * s;
      const pl = Math.hypot(tx, ty) || 1;
      const ux = tx / pl, uy = ty / pl;
      const px = -uy, py = ux;                        // plume normal
      ctx.fillStyle = FLAME_HOT;
      ctx.beginPath();
      ctx.moveTo(hx + px * 13, hy + py * 13);
      ctx.lineTo(hx + ux * plumeL, hy + uy * plumeL);
      ctx.lineTo(hx - px * 13, hy - py * 13);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = FLAME_MID;
      ctx.beginPath();
      ctx.moveTo(hx + px * 20, hy + py * 20);
      ctx.lineTo(hx + ux * plumeL * 0.6, hy + uy * plumeL * 0.6);
      ctx.lineTo(hx - px * 20, hy - py * 20);
      ctx.closePath(); ctx.fill();
      ctx.fillStyle = FLAME_TIP;
      ctx.beginPath(); ctx.arc(hx, hy, 16, 0, U.TAU); ctx.fill();
    }
    ctx.globalCompositeOperation = 'source-over';

    // --- head casings + dead-spoke respawn readout ---
    for (let i = 0; i < N; i++) {
      const n = B.nodes[i];
      const a = rot + i * SPOKE;
      const c = U.fcos(a), s = U.fsin(a);
      const hx = x + c * HEAD_R, hy = y + s * HEAD_R;
      const nx = -s, ny = c;
      ctx.fillStyle = IRON_DARK;                      // the iron cup the shell sits in
      ctx.beginPath();
      ctx.moveTo(hx - c * 6 + nx * 19, hy - s * 6 + ny * 19);
      ctx.lineTo(hx + c * 20 + nx * 12, hy + s * 20 + ny * 12);
      ctx.lineTo(hx + c * 20 - nx * 12, hy + s * 20 - ny * 12);
      ctx.lineTo(hx - c * 6 - nx * 19, hy - s * 6 - ny * 19);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = IRON_EDGE; ctx.lineWidth = 1.5; ctx.stroke();
      if (n && !n.alive) {
        // silenced spoke: a dark stub plus an arc counting the 6.0s back to relight, so the player
        // can plan the next rotation around it instead of being surprised by it.
        const k = 1 - U.clamp(respawnT[i] / HEAD_RESPAWN, 0, 1);
        ctx.strokeStyle = EMBER_DIM; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.arc(hx, hy, 20, -Math.PI / 2, -Math.PI / 2 + U.TAU * k); ctx.stroke();
      }
    }
    ctx.restore();
  }

  function draw(B, ctx) {
    const s = B.s;
    const rot = (s && s.rot) || 0;
    const rotW = (s && s.rotW) || 0;
    const tearK = (s && s.tearT > 0) ? (1 - s.tearT / 2.0) : 0;
    // the boom exists until she comes off it — including through the tear, where it is the thing
    // visibly failing.
    if (B.phase < 2 || (s && s.tearT > 0)) drawBoom(B, ctx);
    drawWheel(B, ctx, rot, rotW, tearK);
  }

  return {
    name: 'CATHERINE',
    hp: 3000,                 // split 750/900/600/750 across the four phases; see HEAD_BODY_DMG
    x: 640, y: 240,           // spec: wheel centre starts (640,240)
    bodyR: 150,               // only read if a phase sets bodyVulnerable — none do. Petal-only, always.
    phases: [PHASE_SPIN_UP, PHASE_SWING, PHASE_UNBOLTED, PHASE_LAST_TURN],
    draw,
  };
})();
