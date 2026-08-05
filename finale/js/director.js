// FINALE — the director. Owns the bar clock, runs the wave tables in MUSICAL time, hands off to
// bosses, and sequences the four acts.
//
// Why a bar clock instead of raw seconds: every fuse window opens on an 1/8-note boundary, so waves
// groove without this ever being a rhythm game. The player is never punished for timing — but the
// shells always fuse on the beat, and that is why a screen full of danger feels composed.
window.Director = (() => {
  const SLOT = { WAVE1: 0, WAVE2: 1, WAVE3: 2, RALLY: 3, BOSS: 4 };
  const BOSS_DEFS = () => [window.BossRomanCandle, window.BossCatherine, window.BossKamuro, window.BossShowrunner];

  let env = null;
  let act = 0, slot = 0;
  let clock = 0, bpm = 124, beatDur = 0.4839, barDur = 1.9355, eighthDur = 0.2419;
  let lastEighth = -1, isEighth = false;
  let cursor = 0, wave = null, waveDone = false;
  let bagT = 0, drizzleT = 0, drizzle = null;
  let rallyT = 0, interT = 0, phaseOfRun = 'wave';   // 'wave'|'rally'|'boss'|'inter'|'done'
  let starveGuard = 0;
  let frozen = false;                                 // sandbox flag for tests

  function bind(e) { env = e; }

  function setTempo(b) {
    bpm = b; beatDur = 60 / bpm; barDur = beatDur * 4; eighthDur = beatDur * 0.5;
  }

  function reset() {
    act = 0; slot = 0; clock = 0; cursor = 0; wave = null; waveDone = false;
    bagT = 0; drizzleT = 0; drizzle = null; rallyT = 0; interT = 0;
    lastEighth = -1; isEighth = false; phaseOfRun = 'wave'; starveGuard = 0;
    frozen = false;                                   // a real load always runs live (sandbox re-sets this after)
  }

  function start(a, s, bossPhase) {
    act = U.clamp(a | 0, 0, 3);
    slot = s === undefined ? 0 : s;
    clock = 0; cursor = 0; lastEighth = -1; starveGuard = 0;
    const A = Waves.ACTS[act];
    setTempo(A.bpm);
    AUDIO.setBpm(bpm);
    Sky.setAct(act);
    Fuse.setMaxConcurrent(Waves.MAX_WINDOWS[act]);
    Fuse.resetWaveTally();
    Enemies.clear(); Beams.reset();

    if (slot === SLOT.BOSS) { startBoss(bossPhase); return; }
    if (slot === SLOT.RALLY) { startRally(); return; }
    wave = A.waves[slot];
    waveDone = false; phaseOfRun = 'wave'; drizzle = null; bagT = 0;
    AUDIO.setSection(slot >= 2 ? 'WAVE_B' : 'WAVE_A');
    env.emit('wave', { act, slot, name: wave ? wave.name : '?' });
    env.hud.wave(wave ? wave.name : '');
  }

  function startRally() {
    phaseOfRun = 'rally';
    rallyT = act === 3 ? 8 : 6;                 // Act IV gets 8s: the last breath before the finale
    wave = null; drizzle = null;
    AUDIO.setSection('RALLY');
    env.emit('rally', { act });
    env.hud.wave('RALLY');
  }

  function startBoss(phase) {
    phaseOfRun = 'boss';
    const def = BOSS_DEFS()[act];
    Enemies.clear();
    AUDIO.setSection('BOSS_' + (act + 1));
    if (!def) { env.emit('boss_dead', { name: 'MISSING' }); onBossDead(); return; }
    Boss.start(def, phase ? { phase } : null);
    env.hud.wave(def.name);
  }

  function onWaveClear() {
    // NO POWDER WASTED: a wave where >=90% of your kills were fuse-kills. The bonus that says
    // "clearing is not the point; converting is".
    if (Fuse.powderRatio() >= CFG.NO_POWDER_THRESHOLD) {
      Fuse.score += CFG.SCORE_NO_POWDER_WASTED;
      env.fx.banner('NO POWDER WASTED');
      env.emit('no_powder_wasted', { act, slot });
    }
    Fuse.resetWaveTally();
    next();
  }

  function onBossDead() {
    if (!Player.p.hitThisAct) {
      Fuse.score += CFG.SCORE_NOHIT_ACT;
      env.fx.banner('FLAWLESS');
    }
    Player.p.hitThisAct = false;
    env.emit('act_clear', { act });
    AUDIO.setSection('CLEAR');
    if (act >= 3) { phaseOfRun = 'done'; env.emit('run_end', { score: Fuse.score }); return; }
    act++; slot = SLOT.WAVE1; phaseOfRun = 'inter'; interT = 2.2;    // a beat to breathe between acts
  }

  function next() {
    if (slot < SLOT.WAVE3) start(act, slot + 1);
    else if (slot === SLOT.WAVE3) start(act, SLOT.RALLY);
    else if (slot === SLOT.RALLY) start(act, SLOT.BOSS);
  }

  // ---------- bag scheduler (continuous pressure waves) ----------
  const bagNames = [];
  const bagWeights = [];
  function pickFromBag(bag) {
    bagNames.length = 0; bagWeights.length = 0;
    let total = 0;
    for (const k in bag.weights) { bagNames.push(k); bagWeights.push(bag.weights[k]); total += bag.weights[k]; }
    let r = U.rngRun.next() * total;
    for (let i = 0; i < bagNames.length; i++) { r -= bagWeights[i]; if (r <= 0) return bagNames[i]; }
    return bagNames[0];
  }
  // Reused spawn/ctx opts — the director runs inside the fixed-step loop, so these must never
  // allocate per tick (Law 8). Mutate-and-reuse, matching the pool/waves layer's zero-alloc contract.
  const BAG_OPT = { homeX: 0, homeY: 0, delay: 0 };
  const DRIZ_OPT = { r: 6 };
  const STARVE_OPT = { homeX: 0, homeY: 200, delay: 0.4 };
  const EV_CTX = { act: 0, bpm: 0, barDur: 0, beatDur: 0 };

  function runBag(bag, dt) {
    if (Enemies.alive() >= bag.target) return;
    bagT -= dt;
    if (bagT > 0) return;
    bagT = 1 / (bag.rate || 3);
    const name = pickFromBag(bag);
    const x = U.rngRun.range(160, CFG.W - 160);
    BAG_OPT.homeX = x; BAG_OPT.homeY = U.rngRun.range(130, 300); BAG_OPT.delay = U.rngRun.range(0.5, 1.4);
    Enemies.spawn(name, x, -40, BAG_OPT);
  }

  // ---------- per-tick ----------
  function update(dt) {
    // musical clock
    clock += dt;
    const e = (clock / eighthDur) | 0;
    isEighth = e !== lastEighth;
    lastEighth = e;

    // Sandbox: freeze all spawning but KEEP the musical clock running, because fuse windows are
    // granted on the 1/8 grid and a frozen clock would silently starve them. Tests only.
    if (frozen) return;

    if (phaseOfRun === 'inter') {
      interT -= dt;
      if (interT <= 0) start(act, SLOT.WAVE1);
      return;
    }
    if (phaseOfRun === 'done') return;

    if (phaseOfRun === 'boss') {
      Boss.update(dt, isEighth);
      if (Boss.state && Boss.state.dead) { Boss.clear(); onBossDead(); }
      return;
    }

    if (phaseOfRun === 'rally') {
      const R = Waves.RALLY[act];
      if (R) runBag(R, dt);
      rallyT -= dt;
      if (rallyT <= 0) start(act, SLOT.BOSS);
      return;
    }

    // ---- scripted wave ----
    if (!wave) return;
    while (cursor < wave.events.length) {
      const ev = wave.events[cursor];
      const t = (ev.bar - 1) * barDur + (ev.beat - 1) * beatDur;
      if (clock < t) break;
      EV_CTX.act = act; EV_CTX.bpm = bpm; EV_CTX.barDur = barDur; EV_CTX.beatDur = beatDur;
      Waves.spawnEvent(ev, EV_CTX);
      if (ev.fn === 'drizzle') drizzle = ev.args;
      cursor++;
    }
    if (wave.bag) runBag(wave.bag, dt);
    if (drizzle) {
      drizzleT -= dt;
      if (drizzleT <= 0) {
        drizzleT = 1 / (drizzle.rate || 6);
        const x = U.rngRun.range(20, CFG.W - 20);
        env.bul.spawn(x, -20, 0, drizzle.speed || 110, Pool.T.CIRCLE, Pool.FACTION.ENEMY, DRIZ_OPT);
      }
    }

    // Wave-level starvation guard (mirrors the boss one). If the screen has offered the player no
    // convertible target for a while, put one on it. You can be outplayed; you can never be idle.
    starveGuard -= dt;
    if (Fuse.starveT > CFG.BOSS_STARVE_LIMIT && !Fuse.hasPetalSource() && starveGuard <= 0) {
      starveGuard = 1.2;
      const x = U.rngRun.range(300, CFG.W - 300);
      STARVE_OPT.homeX = x;
      Enemies.spawn('SPARK', x, -30, STARVE_OPT);
      Fuse.starveT = 0;
    }

    if (clock >= wave.bars * barDur && !waveDone) {
      // let the screen drain a little before the next wave, so clears read as clears
      if (Enemies.alive() === 0 || clock >= wave.bars * barDur + 4) { waveDone = true; onWaveClear(); }
    }
  }

  return {
    SLOT, bind, reset, start, update, setTempo, onBossDead,
    setFrozen(b) { frozen = !!b; },
    get act() { return act; },
    get slot() { return slot; },
    get phaseOfRun() { return phaseOfRun; },
    get isEighth() { return isEighth; },
    get bpm() { return bpm; },
    get bar() { return (clock / barDur) | 0; },
    get beat() { return ((clock % barDur) / beatDur) | 0; },
    get clock() { return clock; },
    get waveName() { return wave ? wave.name : (phaseOfRun === 'rally' ? 'RALLY' : (phaseOfRun === 'boss' ? 'BOSS' : '')); },
  };
})();
