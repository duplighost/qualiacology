// FINALE — THE CORE. Windows, conversion, cascade, applause. If you only read one file, read this.
//
// Every shell announces itself before it fires. Beat it to its own explosion and its whole volley
// becomes yours. Miss and the same volley tries to kill you. The sky fills either way.
//
// READABILITY FIX (this was the flaw that would have killed the game): windows are GLOBALLY CAPPED.
// A wave with 30 live shells cannot open 30 invitations at once — they queue and are granted on the
// 1/8-note grid, at most MAX_CONCURRENT at a time. That bounds the visual noise AND the audio voices,
// and it is why a 2000-bullet screen still tells you exactly where to look.
window.Fuse = (() => {
  let env = null;                       // { bul, player, emit, fx, audio, beams }
  const q = [];                         // FIFO of enemies waiting for a window slot
  let openCount = 0;
  let maxConcurrent = 6;

  let chain = 0, chainT = 0, chainLifetime = 0;
  let applause = 0, tier = 0, graceT = 0;
  let score = 0;
  // "NO POWDER WASTED": per-wave tally of how many kills were fuse-kills
  let waveKills = 0, waveFuseKills = 0;
  // FIX for the judged "spawn-gated agency" flaw: if you have had no petal source at all for this
  // long, the director owes you one. Read by director.js / boss.js.
  let starveT = 0;

  function bind(e) { env = e; }
  function reset() {
    q.length = 0; openCount = 0; chain = 0; chainT = 0; chainLifetime = 0;
    applause = 0; tier = 0; graceT = 0; score = 0;
    waveKills = 0; waveFuseKills = 0; starveT = 0; maxConcurrent = 6;
  }
  function setMaxConcurrent(n) { maxConcurrent = n; }
  function resetWaveTally() { waveKills = 0; waveFuseKills = 0; }
  // Zero kills means NO POWDER WASTED cannot be earned — the bonus certifies "you converted almost
  // everything you killed", which is vacuously false when you killed nothing. (Was returning 1, which
  // paid the +25,000 for a wave you cleared without a single kill.)
  const powderRatio = () => (waveKills === 0 ? 0 : waveFuseKills / waveKills);

  // ---------- derived ----------
  const chainSpeedMult = () => Math.min(CFG.CHAIN_SPEED_CAP, 1 + CFG.CHAIN_SPEED_PER * chain);
  const chainPierce = () =>
    Math.min(CFG.PETAL_PIERCE_CAP, CFG.PETAL_PIERCE_BASE + ((chain / CFG.PETAL_PIERCE_PER_CHAIN) | 0));
  function petalStage() {
    const t = CFG.PETAL_STAGE_AT;
    return chain >= t[2] ? 2 : (chain >= t[1] ? 1 : 0);
  }
  const tierMult = () => CFG.TIERS[tier][1];
  const tierName = () => CFG.TIERS[tier][2];

  function recomputeTier() {
    let t = 0;
    for (let i = 0; i < CFG.TIERS.length; i++) if (applause >= CFG.TIERS[i][0]) t = i;
    if (t !== tier) {
      const up = t > tier;
      tier = t;
      env.emit(up ? 'tier_up' : 'tier_down', { tier, name: tierName() });
      if (up) { env.fx.tierPulse(); env.audio.tierUp(tier); }
    }
  }
  function addApplause(v) {
    applause = U.clamp(applause + v, 0, 100);
    graceT = CFG.APPLAUSE_GRACE;
    recomputeTier();
  }

  // ---------- scoring ----------
  function award(base, fuseKill) {
    const chainMul = 1 + CFG.SCORE_CHAIN_PER * Math.min(chain, CFG.CHAIN_SAT);
    const pts = Math.round(base * (fuseKill ? CFG.SCORE_FUSEKILL_MULT : 1) * chainMul * tierMult());
    score += pts;
    return pts;
  }

  // ---------- window lifecycle ----------
  function request(e) {
    if (e.waiting || e.fuseOpen || e.fuseMax <= 0) return;
    e.waiting = true; q.push(e);
  }
  // Granted only on the 1/8-note grid — that is why waves groove without this being a rhythm game.
  function grant() {
    while (openCount < maxConcurrent && q.length) {
      const e = q.shift();
      // A queue entry can be stale: enemies are a recycled pool, so a slot may have been culled and
      // respawned into a different shell since it was queued. `!e.alive` catches a dead slot;
      // `e.fuseOpen` catches a double-entry that would otherwise increment openCount twice against a
      // single close. Either way, clear the flag and skip — never open a window we can't account for.
      if (!e.alive || e.fuseOpen) { e.waiting = false; continue; }
      e.waiting = false; e.fuseOpen = true; e.fuseT = e.fuseMax; openCount++;
      env.emit('fuse_open', { id: e.id, type: e.name, x: e.x, y: e.y, dur: e.fuseMax });
      env.audio.whistle(e);
    }
  }
  function closeWindow(e) {
    if (!e.fuseOpen) return;
    e.fuseOpen = false; e.fuseT = 0; openCount = Math.max(0, openCount - 1);
    env.audio.whistleOff(e);
  }

  // THE GAME-KEEPER. Any code path that despawns an enemy WITHOUT going through Fuse.kill (the
  // off-screen cull in Enemies.update, and Enemies.clear on every wave/boss transition) MUST call
  // this first. Otherwise a shell that died with its window open leaks openCount by +1 permanently:
  // after enough transitions openCount hits maxConcurrent, grant() stops granting, no window ever
  // opens again, and the entire game silently dies from mid-Act II onward. This was the #1 bug.
  function forget(e) {
    if (e.fuseOpen) { e.fuseOpen = false; e.fuseT = 0; openCount = Math.max(0, openCount - 1); env.audio.whistleOff(e); }
    if (e.waiting) { const i = q.indexOf(e); if (i >= 0) q.splice(i, 1); e.waiting = false; }
  }

  // ---------- the two blooms ----------
  function aimAt(e) { return Math.atan2(env.player.y - e.y, env.player.x - e.x); }

  // A converted volley BLOOMS — it does not re-aim at you. Reusable descriptor, no allocation.
  //
  // Keeping the source pattern's aiming was measured to kill the entire game: SPARK's volley is a fan
  // aimed AT THE PLAYER, so converting one fired its petals downward, away from every other shell,
  // and no cascade could ever travel. A firework shell explodes in a sphere. Count and speed are
  // preserved (so the volley is recognisably the one you stole), CROSSETTE keeps its splitting, and
  // the whole bloom is then biased by 0.45x your velocity — so your movement rakes it, rather than
  // your position aiming it.
  const petalDesc = { kind: 'ring', n: 0, speed: 0, phase: 0, splitAfter: 0.7 };
  function toPetalDesc(v) {
    petalDesc.kind = (v.kind === 'cross') ? 'cross' : 'ring';
    petalDesc.n = Math.max(CFG.PETAL_MIN_COUNT, Emit.countOf(v));
    petalDesc.speed = v.speed || 200;
    petalDesc.phase = U.rngRun.next() * U.TAU;      // so stacked blooms never align into a grid
    petalDesc.splitAfter = v.splitAfter === undefined ? 0.7 : v.splitAfter;
    return petalDesc;
  }

  // The chain-ledger step, shared by every blue bloom — shell OR boss node. Boss node kills used to
  // skip this entirely (no chain++, no chainT refresh), so raking a boss's collar reported chain 0
  // and actively let an existing chain expire. One function, so the two paths can never drift again.
  function creditChain() {
    if (chainT > 0) chain++; else chain = 1;
    chainT = CFG.CHAIN_WINDOW; chainLifetime++;
    env.emit('chain', { n: chain });
    addApplause(CFG.APPLAUSE_PER_FUSEKILL + CFG.APPLAUSE_PER_CHAIN);
  }

  // BLUE: you beat it. Its volley is yours, launched with your own momentum baked in.
  function blueBloom(e) {
    const amber = e.amber;
    let petals = 0;
    if (!amber && e.volley && e.volley.kind !== 'beam') {
      petals = Emit.run(
        toPetalDesc(e.volley), env.bul, e.x, e.y, aimAt(e), Pool.FACTION.PLAYER,
        CFG.PETAL_SPEED_MULT * chainSpeedMult(),
        env.player.vx * CFG.PETAL_INHERIT, env.player.vy * CFG.PETAL_INHERIT,
        petalStage(), chainPierce()
      );
    }
    // chain bookkeeping BEFORE scoring so this bloom counts itself
    creditChain();
    const pts = award(e.score, true);
    waveKills++; waveFuseKills++;
    starveT = 0;

    env.fx.bloomFlash(e.x, e.y, petals, true);
    env.fx.shake(1.2 + 0.06 * petals);
    env.fx.wind(e.x, e.y);
    if (e.big) env.fx.hitstop(CFG.HITSTOP_FUSEKILL_BIG);
    env.audio.bloomBlue(petals, chain, e.x);
    env.emit('bloom_blue', { id: e.id, type: e.name, x: e.x, y: e.y, petals, chain, pts });
    return petals;
  }

  // RED: it beat you. Same geometry, magenta, lethal. Duller sound by design — you should HEAR that
  // you failed, without a buzzer ever telling you so.
  function redBloom(e) {
    if (!e.volley) return 0;
    let n = 0;
    if (e.volley.kind === 'beam') {
      env.beams.fireFrom(e, e.volley.n || 2);
    } else {
      n = Emit.run(e.volley, env.bul, e.x, e.y, aimAt(e), Pool.FACTION.ENEMY, 1, 0, 0, 0, 1);
    }
    env.fx.bloomFlash(e.x, e.y, n, false);
    env.audio.bloomRed(n, e.x);
    env.emit('bloom_red', { id: e.id, type: e.name, x: e.x, y: e.y, bullets: n });
    return n;
  }

  // ---------- damage ----------
  // The fuse window is worth x4 damage. That generosity is deliberate: the window is an INVITATION,
  // and an invitation you can't accept is just a taunt.
  //
  // PETALS LIGHT FUSES. A petal striking a shell whose window is shut forces it open on the spot.
  // This is the cascade engine, and it is exactly what the game promises: petals shred other shells
  // and set off THEIR fuses. Without it a cascade kills shells silently, no chain ever forms, and
  // the game collapses into a peashooter sim — measured at chain=1 across every wave and every boss
  // before this existed.
  function ignite(e) {
    if (e.fuseOpen || e.leaving || !e.volley || e.fuseMax <= 0) return false;
    if (openCount >= maxConcurrent + CFG.FUSE_IGNITE_HEADROOM) return false;
    if (e.waiting) { const i = q.indexOf(e); if (i >= 0) q.splice(i, 1); e.waiting = false; }
    e.fuseOpen = true; e.fuseT = e.fuseMax; openCount++;
    env.emit('fuse_open', { id: e.id, type: e.name, x: e.x, y: e.y, dur: e.fuseMax, ignited: true });
    env.audio.whistle(e);
    return true;
  }

  // A LIVE SHELL CAN ONLY BE HURT DURING ITS WINDOW. This is the design law made literal, and it is
  // the single most important rule in the game.
  //
  // It exists because of a measured failure: with the gun able to chip away between windows, a
  // SPARK's 2.2s cadence was longer than the 1.2s the plain gun needed to kill it, so shells died as
  // dull plain kills BEFORE their next invitation ever arrived. The game was punishing the player
  // for holding down a gun that fires itself. Every kill is now a conversion, which is also what
  // makes cascades possible at all.
  //
  // Exceptions, both deliberate: a shell that has spent all its volleys and is drifting away is
  // ordinary meat, and a shell with no fuse at all (LANTERN) is always vulnerable — to petals only,
  // since its aura eats the gun.
  function vulnerable(e) { return e.fuseOpen || e.leaving || e.fuseMax <= 0; }

  function damage(e, amount, isPetal) {
    if (!e.alive) return false;
    if (isPetal && !e.fuseOpen) ignite(e);         // the cascade lights the next fuse before it bites
    if (!vulnerable(e)) { e.hitFlash = 0.03; return false; }
    e.hp -= amount * (e.fuseOpen ? CFG.FUSE_ARMOR_MULT : 1);
    e.hitFlash = 0.06;
    if (e.hp <= 0) { kill(e); return true; }
    return false;
  }

  function kill(e) {
    if (!e.alive) return;
    const inWindow = e.fuseOpen;
    if (inWindow) closeWindow(e);
    else if (e.waiting) { const i = q.indexOf(e); if (i >= 0) q.splice(i, 1); e.waiting = false; }
    e.alive = false;
    if (inWindow) {
      blueBloom(e);
    } else {
      waveKills++;
      award(e.score, false);
      env.fx.puff(e.x, e.y, e.r);
      env.audio.pop(e.x);
      env.emit('fuse_kill', { id: e.id, type: e.name, inWindow: false });
    }
  }

  // A bullet that carries its own window (KAMURO P3 — bullets become shells).
  function convertBullet(i) {
    const b = env.bul;
    const n = 6;
    const sp = 180 * CFG.PETAL_SPEED_MULT * chainSpeedMult();
    const px = b.x[i], py = b.y[i];
    for (let k = 0; k < n; k++) {
      const a = k / n * U.TAU;
      b.spawn(px, py, U.fcos(a) * sp + env.player.vx * CFG.PETAL_INHERIT,
              U.fsin(a) * sp + env.player.vy * CFG.PETAL_INHERIT,
              Pool.T.PETAL, Pool.FACTION.PLAYER,
              { r: 6, dmg: CFG.PETAL_DMG, life: CFG.PETAL_LIFE, stage: petalStage(), pierce: chainPierce() });
    }
    b.kill(i);
    if (chainT > 0) chain++; else chain = 1;
    chainT = CFG.CHAIN_WINDOW; chainLifetime++;
    addApplause(CFG.APPLAUSE_PER_CHAIN);
    score += Math.round(80 * tierMult());
    env.fx.bloomFlash(px, py, n, true);
    env.audio.bloomBlue(n, chain, px);
    env.emit('bloom_blue', { type: 'BULLET', x: px, y: py, petals: n, chain });
    starveT = 0;
  }

  // ---------- per-tick ----------
  // `isEighth` is true on 1/8-note boundaries; the director owns the bar clock.
  function update(dt, isEighth) {
    // open windows tick down; expiry means the shell fires for real
    for (let i = 0; i < Enemies.list.length; i++) {
      const e = Enemies.list[i];
      if (!e.alive) continue;
      if (e.fuseOpen) {
        e.fuseT -= dt;
        if (e.fuseT <= 0) {
          closeWindow(e);
          redBloom(e);
          env.emit('fuse_close', { id: e.id, type: e.name });
          if (e.volleysLeft > 0) e.volleysLeft--;
          if (e.volleysLeft === 0) {
            // out of volleys: drift away rather than vanish, so the screen empties legibly
            e.leaving = true; e.mv = 'descend'; e.mvSpeed = e.mvSpeed || 90; e.homeX = e.x;
          } else {
            e.cadenceT = Enemies.TYPES[e.name] ? Enemies.TYPES[e.name].cadence : 2;
          }
        }
      } else if (!e.waiting && !e.leaving && e.fuseMax > 0 && e.volleysLeft !== 0) {
        e.cadenceT -= dt;
        if (e.cadenceT <= 0) request(e);
      }
    }
    if (isEighth) grant();

    // chain decay
    if (chainT > 0) {
      chainT -= dt;
      if (chainT <= 0) {
        if (chain > 0) env.emit('chain_break', { n: chain });
        chain = 0;
      }
    }
    // applause decay
    if (graceT > 0) graceT -= dt;
    else if (applause > 0) { applause = Math.max(0, applause - CFG.APPLAUSE_DECAY * dt); recomputeTier(); }

    starveT += dt;
  }

  // Called when the player is hit. A death costs exactly one tier — never the whole run.
  function onPlayerHit() {
    chain = 0; chainT = 0;
    tier = Math.max(0, tier - CFG.TIER_DROP_ON_DEATH);
    applause = CFG.TIERS[tier][0];
    env.emit('tier_down', { tier, name: tierName() });
  }

  // Is there anything on screen the player could currently turn into petals?
  function hasPetalSource() {
    for (let i = 0; i < Enemies.list.length; i++) {
      const e = Enemies.list[i];
      // A shell that has spent its volleys (leaving) or never had a fuse (fuseMax<=0) can NEVER be
      // converted, so it must not count as a source — otherwise the starvation guards see a full
      // screen of drifting corpses and never spawn you a real target.
      if (e.alive && !e.leaving && e.fuseMax > 0 && !e.amber && e.volley && e.volley.kind !== 'beam') return true;
    }
    return false;
  }

  return {
    bind, reset, update, request, grant, damage, ignite, vulnerable, forget, kill, creditChain, blueBloom, redBloom, convertBullet,
    onPlayerHit, setMaxConcurrent, resetWaveTally, powderRatio, hasPetalSource, closeWindow,
    addApplause, award,
    get chain() { return chain; },
    get chainLifetime() { return chainLifetime; },
    get applause() { return applause; },
    get tier() { return tier; },
    get tierName() { return tierName(); },
    get tierMult() { return tierMult(); },
    get score() { return score; },
    set score(v) { score = v; },
    get openCount() { return openCount; },
    get queued() { return q.length; },
    get starveT() { return starveT; },
    set starveT(v) { starveT = v; },
    petalStage, chainPierce, chainSpeedMult,
  };
})();
