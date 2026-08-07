// FINALE — shared boss machinery: phase machine, budgets, node rings, HP bar, transition ritual.
//
// TWO LAWS, both non-negotiable:
//  1. BOSS ARMOUR IS PETAL-ONLY. Fuse nodes are immune to the peashooter. Your gun exists to pop the
//     ADDS whose blooms break the boss. The core mechanic, at boss scale.
//  2. NO PHASE MAY BE AN HP SPONGE. Every phase carries a design budget and a hard timeout; at the
//     timeout the boss gets bored, staggers, and the phase advances regardless of HP. A boss that
//     can stall you forever is a boss that has stopped being a fight and started being a wall.
window.Boss = (() => {
  let B = null;                    // current boss instance
  let env = null;
  let nodeIdSeq = 0;
  function bind(e) { env = e; }

  function makeNode(ang, dist, hp, volley) {
    return { ang, dist, x: 0, y: 0, r: 15, hp, maxHp: hp, alive: true,
             open: false, fuseT: 0, fuseMax: 0.55, volley: volley || null,
             id: 'nd' + (nodeIdSeq++) };       // stable whistle id so audio can size + stop it exactly
  }

  function start(def, opts) {
    B = {
      def, name: def.name, t: 0,
      x: def.x === undefined ? CFG.W / 2 : def.x,
      y: def.y === undefined ? 190 : def.y,
      hp: def.hp, maxHp: def.hp,
      phase: 0, phaseT: 0, phaseElapsed: 0,
      staggerT: 0, dead: false, victory: false,
      nodes: [], s: {},                       // s = per-phase scratch, cleared on enter
      relief: 0, intro: 1.4, nodeCycleT: 0, nodeCursor: 0,
      addStarve: 0,
    };
    if (opts && opts.phase) B.phase = opts.phase | 0;
    enterPhase(B.phase, true);
    env.emit('boss_start', { name: def.name, hp: def.hp });
    return B;
  }

  function enterPhase(i, silent) {
    B.phase = i; B.phaseT = 0; B.phaseElapsed = 0; B.staggerT = 0;
    B.s = {}; B.nodes.length = 0; B.nodeCycleT = 0; B.nodeCursor = 0;
    const ph = B.def.phases[i];
    if (!ph) return;
    B.relief = silent ? 0 : CFG.BOSS_TRANSITION_RELIEF;
    if (ph.enter) ph.enter(B, api());
    env.emit('phase', { boss: B.name, phase: i, name: ph.name });
    if (!silent) {
      env.fx.hitstop(CFG.HITSTOP_PHASE);
      env.fx.shake(6);
      env.fx.banner(ph.name);
      env.audio.phaseSting();
      // relief beat: every live enemy bullet becomes a harmless drifting spark. 1.2s to breathe.
      const bul = env.bul;
      for (let k = bul.n - 1; k >= 0; k--) {
        if (bul.faction[k] !== Pool.FACTION.ENEMY) continue;
        bul.type[k] = Pool.T.SPARKLE; bul.faction[k] = 2;   // faction 2 = inert
        bul.vx[k] *= 0.25; bul.vy[k] = -40 - U.rngFx.next() * 40;   // cosmetic drift → cosmetic RNG
        bul.life[k] = 0.8; bul.age[k] = 0; bul.beh[k] = 0; bul.flags[k] = 0;
      }
      Beams.reset();
    }
  }

  function advance() {
    if (B.phase + 1 >= B.def.phases.length) { finish(); return; }
    enterPhase(B.phase + 1);
  }

  function finish() {
    B.dead = true; B.victory = true;
    env.emit('boss_dead', { name: B.name });
  }

  // ---------- node rings ----------
  // Nodes are the boss's fuse windows. `mode` decides the choreography; every mode still respects the
  // global window cap philosophy by only ever lighting a handful at a time.
  function positionNodes() {
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      n.x = B.x + U.fcos(n.ang) * n.dist;
      n.y = B.y + U.fsin(n.ang) * n.dist;
    }
  }
  function liveNodes() { let c = 0; for (let i = 0; i < B.nodes.length; i++) if (B.nodes[i].alive) c++; return c; }

  // mode: 'sequence' (one at a time), 'pairs' (opposite sides), 'all' (permanent), 'wave' (n at a time)
  function cycleNodes(dt, mode, windowT, gapT, groupN) {
    positionNodes();
    if (B.staggerT > 0 || mode === 'all') {
      for (let i = 0; i < B.nodes.length; i++) {
        const n = B.nodes[i];
        if (n.alive) { n.open = true; n.fuseT = 1; n.fuseMax = 1; }
      }
      return;
    }
    let anyOpen = false;
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (!n.alive || !n.open) continue;
      anyOpen = true;
      n.fuseT -= dt;
      if (n.fuseT <= 0) { n.open = false; env.audio.whistleOff(n); B.nodeCycleT = gapT; }
    }
    if (anyOpen) return;
    B.nodeCycleT -= dt;
    if (B.nodeCycleT > 0) return;

    const len = B.nodes.length;
    let opened = 0, guard = 0;
    if (mode === 'pairs') {
      // Open an OPPOSITE PAIR (c, c+len/2), advancing the pair cursor by ONE per cycle so all nodes
      // are reached over len/2 cycles. The old code advanced the ring cursor by len/2, which orbited
      // a 2-node subgroup forever — 4 of every 6 nodes never lit, and the phase's mechanic went dead
      // once those 2 died. (Confirmed HIGH: ROMAN CANDLE P2, CATHERINE P3.)
      const half = Math.max(1, len >> 1);
      while (opened === 0 && guard++ < half) {
        const c = B.nodeCursor % half;
        B.nodeCursor = (B.nodeCursor + 1) % half;
        const a = B.nodes[c], b = B.nodes[(c + half) % len];
        if (a && a.alive && !a.open) { openNode(a, windowT); opened++; }
        if (b && b.alive && !b.open) { openNode(b, windowT); opened++; }
      }
    } else {
      const g = mode === 'wave' ? (groupN || 3) : 1;
      while (opened < g && guard++ < len * 2) {
        const n = B.nodes[B.nodeCursor % len];
        B.nodeCursor = (B.nodeCursor + 1) % Math.max(1, len);
        if (n && n.alive && !n.open) { openNode(n, windowT); opened++; }
      }
    }
    if (opened === 0) B.nodeCycleT = gapT;
  }
  // Open one node and start its whistle. The whistle carries the node's own fuseMax and stable id so
  // audio can size it and stop it exactly (a node's whistle used to run a fixed 0.9s and never stop,
  // outliving its 0.5s window and evicting live shell whistles).
  function openNode(n, windowT) {
    n.open = true; n.fuseT = n.fuseMax = windowT;
    env.audio.whistle(n);
  }

  // A node dying INSIDE its window is a blue bloom, same as any shell. Same law, boss scale.
  function killNode(n) {
    n.alive = false;
    const wasOpen = n.open;
    n.open = false;
    if (wasOpen) {
      env.audio.whistleOff(n);
      let petals = 0;
      if (n.volley) {
        petals = Emit.run(n.volley, env.bul, n.x, n.y,
          Math.atan2(env.player.y - n.y, env.player.x - n.x), Pool.FACTION.PLAYER,
          CFG.PETAL_SPEED_MULT * Fuse.chainSpeedMult(),
          env.player.vx * CFG.PETAL_INHERIT, env.player.vy * CFG.PETAL_INHERIT,
          Fuse.petalStage(), Fuse.chainPierce());
      }
      // Full chain credit — same ledger as a shell bloom. Node kills used to skip this, so raking a
      // collar reported chain 0 and let an existing chain die. creditChain runs AFTER petals so this
      // bloom's own petals use the pre-increment chain, matching Fuse.blueBloom exactly.
      Fuse.creditChain();
      Fuse.award(500, true);
      env.fx.bloomFlash(n.x, n.y, petals || 12, true);
      env.fx.shake(3);
      env.audio.bloomBlue(petals || 12, Fuse.chain, n.x);
      env.emit('bloom_blue', { type: 'NODE', x: n.x, y: n.y, petals, chain: Fuse.chain });
      Fuse.starveT = 0;
    }
  }

  // Projectile hit test. `isPetal` gates everything: the peashooter cannot touch nodes or armour.
  function damageAt(x, y, dmg, isPetal) {
    if (!B || B.dead) return false;
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (!n.alive) continue;
      const dx = x - n.x, dy = y - n.y;
      if (dx * dx + dy * dy > n.r * n.r * 4) continue;
      // The gun flies straight through a node — it is an igniter, and nodes are petal-only. Passing
      // through (rather than being eaten) is what makes that legible instead of looking like a bug.
      if (!isPetal) return false;
      n.hp -= dmg * (n.open ? CFG.FUSE_ARMOR_MULT : 1) * (B.staggerT > 0 ? CFG.BOSS_STAGGER_DMG : 1);
      if (n.hp <= 0) killNode(n);
      return true;
    }
    // body: only vulnerable when the phase says so
    const ph = B.def.phases[B.phase];
    if (ph && ph.bodyVulnerable) {
      const R = (B.def.bodyR || 120);
      const dx = x - B.x, dy = y - B.y;
      if (dx * dx + dy * dy <= R * R) {
        if (!isPetal && !ph.gunVulnerable) return true;
        B.hp -= dmg * (B.staggerT > 0 ? CFG.BOSS_STAGGER_DMG : 1);
        return true;
      }
    }
    return false;
  }
  // Direct HP damage from a scripted source (e.g. a MORTAR blue bloom during KAMURO P2).
  function damageBody(amount) { if (B && !B.dead) B.hp = Math.max(0, B.hp - amount); }

  // ---------- api handed to phase scripts ----------
  let _api = null;
  function api() {
    if (!_api) _api = {
      get bul() { return env.bul; },
      get player() { return env.player; },
      get fx() { return env.fx; },
      get audio() { return env.audio; },
      emit: (t, d) => env.emit(t, d),
      aim: (fx, fy) => Math.atan2(env.player.y - fy, env.player.x - fx),
      spawnAdd: (name, x, y, opts) => Enemies.spawn(name, x, y, opts),
      beam: (x, y, ang, opts) => Beams.add(x, y, ang, opts),
      makeNode, cycleNodes, liveNodes, damageBody, killNode,
      emitPattern(desc, x, y, aimA) {
        return Emit.run(desc, env.bul, x, y, aimA === undefined ? Math.atan2(env.player.y - y, env.player.x - x) : aimA,
                        Pool.FACTION.ENEMY, 1, 0, 0, 0, 1);
      },
    };
    return _api;
  }

  function update(dt, isEighth) {
    if (!B || B.dead) return;
    B.t += dt; B.phaseT += dt; B.phaseElapsed += dt;
    // positionNodes() during the intro too — draw() runs from frame 0, and without this every node
    // ring sits stacked at canvas (0,0) for the 1.4s intro (nodes are created at 0,0 and only placed
    // by positionNodes). The relief branch already does this; the intro branch was missing it.
    if (B.intro > 0) { B.intro -= dt; positionNodes(); return; }
    if (B.relief > 0) { B.relief -= dt; positionNodes(); return; }

    const ph = B.def.phases[B.phase];
    if (!ph) return;

    // Adds never stop during a boss — and if the player has had NO petal source for too long, the
    // boss owes them one. This is the fix for "boss offence is spawn-gated": you can be outplayed,
    // but you can never be left with literally nothing to shoot.
    B.addStarve += dt;
    // Only force a SPARK when there is genuinely NOTHING to convert — starveT is "time since last
    // blue bloom", not "time with no source", so without the hasPetalSource check this fired every
    // ~2.5s of pure dodging even with a screen full of adds. Seeded RNG (not Math.random) keeps the
    // spawn side deterministic for the headless harness.
    if (Fuse.starveT > CFG.BOSS_STARVE_LIMIT && B.addStarve > 1.0 && !Fuse.hasPetalSource()) {
      B.addStarve = 0;
      const side = U.rngRun.next() < 0.5 ? 180 : CFG.W - 180;
      Enemies.spawn('SPARK', side, -30, { homeX: side, homeY: 240, delay: 0.5 });
      Fuse.starveT = 0;
    }

    if (B.staggerT > 0) {
      B.staggerT -= dt;
      cycleNodes(dt, 'all');
      if (B.staggerT <= 0) advance();
      return;
    }

    if (ph.update) ph.update(B, dt, api(), isEighth);

    // phase exit by HP threshold
    const frac = B.hp / B.maxHp;
    if (ph.hpFrac !== undefined && frac <= ph.hpFrac) { advance(); return; }
    if (ph.nodesToClear !== undefined && liveNodes() === 0) { advance(); return; }

    // hard timeout -> stagger -> advance. The anti-sponge law.
    const budget = ph.budget || CFG.BOSS_PHASE_TIMEOUT;
    if (B.phaseElapsed >= Math.min(budget, CFG.BOSS_PHASE_TIMEOUT)) {
      B.staggerT = CFG.BOSS_STAGGER_TIME;
      env.bul.clear();
      Beams.reset();
      env.fx.shake(8);
      env.fx.banner('STAGGERED');
      env.audio.phaseSting();
      env.emit('stagger', { boss: B.name, phase: B.phase });
    }
  }

  function drawNodes(ctx) {
    const C = CFG.COL;
    for (let i = 0; i < B.nodes.length; i++) {
      const n = B.nodes[i];
      if (!n.alive) continue;
      ctx.save();
      ctx.translate(n.x, n.y);
      ctx.fillStyle = n.open ? '#FFFFFF' : C.enemyCore;
      ctx.beginPath(); ctx.arc(0, 0, n.r * 0.55, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = U.hexa(C.bossTrim, 0.7); ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, n.r, 0, U.TAU); ctx.stroke();
      if (n.open) {
        const k = U.clamp(n.fuseT / Math.max(0.0001, n.fuseMax), 0, 1);
        const rr = n.r * (1 + 1.2 * k);
        const a = 0.65 + 0.35 * Math.abs(U.fsin(B.t * U.TAU * CFG.FUSE_RING_HZ));
        ctx.strokeStyle = U.rgba([255, 255, 255], a); ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(0, 0, rr, 0, U.TAU); ctx.stroke();
      }
      ctx.restore();
    }
  }

  function draw(ctx) {
    if (!B || B.dead) return;
    if (B.def.draw) B.def.draw(B, ctx);
    drawNodes(ctx);
  }

  function drawHpBar(ctx) {
    if (!B || B.dead) return;
    const frac = U.clamp(B.hp / B.maxHp, 0, 1);
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    ctx.fillRect(0, 0, CFG.W, 3);
    ctx.fillStyle = CFG.COL.danger;
    ctx.fillRect(0, 0, CFG.W * frac, 3);
    // phase ticks so the fight has a visible shape
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < B.def.phases.length; i++) {
      const f = B.def.phases[i].hpFrac;
      if (f === undefined) continue;
      ctx.fillRect(CFG.W * f, 0, 1, 3);
    }
  }

  return {
    bind, start, update, draw, drawHpBar, damageAt, damageBody, advance, finish,
    makeNode, cycleNodes,
    get state() { return B; },
    get active() { return !!B && !B.dead; },
    clear() { B = null; },
  };
})();
