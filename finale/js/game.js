// FINALE — orchestration. Fixed-step sim, collision, the draw-order law, the perf ladder, screens,
// and the window.__FINALE test surface.
//
// Fixed timestep, no interpolation: logic runs at exactly 1/60. On a 144Hz display we re-present the
// same frame. Crisper, and it removes an entire class of bug.
window.Game = (() => {
  const W = CFG.W, H = CFG.H, DT = CFG.DT;
  let cv, ctx;
  let mode = 'title';                  // 'title' | 'run' | 'pause' | 'over' | 'victory'
  let tick = 0, acc = 0, lastT = 0, running = false;
  let paused = false, stepQueue = 0;

  const bul = Pool.makeBullets(CFG.BULLET_CAP);
  const listeners = [];
  const events = [];                   // ring buffer, last 256
  let godmode = false;

  function emit(type, data) {
    events.push({ t: performance.now(), tick, type, data: data || {} });
    if (events.length > 256) events.shift();
    for (let i = 0; i < listeners.length; i++) { try { listeners[i](type, data || {}); } catch (e) {} }
  }

  // ---- the env every subsystem is wired through ----
  const env = {
    bul,
    get player() { return Player.p; },
    emit,
    get fx() { return FX; },
    get audio() { return AUDIO; },
    get beams() { return Beams; },
    hud: { wave: (n) => HUD.wave && HUD.wave(n) },
  };

  // ---- perf sampler ----
  // We sample WORK time (sim + draw), NOT the rAF interval. On a vsync-locked display the interval
  // is 16.67ms no matter how idle we are, so sampling it would drive the quality ladder straight to
  // its lowest rung on a machine that was never struggling. Ask "how much of the frame did we use",
  // never "how long was the frame".
  const FR = new Float32Array(90); let frI = 0, frN = 0;
  let quality = 0, qBadT = 0, qGoodT = 0;
  function sampleFrame(ms) {
    FR[frI] = ms; frI = (frI + 1) % FR.length; if (frN < FR.length) frN++;
    let sum = 0; const m = Math.min(frN, 30);
    for (let k = 0; k < m; k++) sum += FR[(frI - 1 - k + FR.length) % FR.length];
    const mean = sum / Math.max(1, m);
    if (mean > CFG.PERF_BAD_MS) { qBadT += ms / 1000; qGoodT = 0; if (qBadT > 1 && quality < 3) { quality++; FX.setQuality(quality); qBadT = 0; } }
    else if (mean < CFG.PERF_GOOD_MS) { qGoodT += ms / 1000; qBadT = 0; if (qGoodT > 4 && quality > 0) { quality--; FX.setQuality(quality); qGoodT = 0; } }
  }
  function perfStats() {
    const n = frN; if (!n) return { mean: 0, p95: 0, worst: 0 };
    const tmp = []; for (let i = 0; i < n; i++) tmp.push(FR[i]);
    tmp.sort((a, b) => a - b);
    let s = 0; for (let i = 0; i < n; i++) s += tmp[i];
    return { mean: s / n, p95: tmp[(n * 0.95) | 0], worst: tmp[n - 1] };
  }

  // ================= BOOT =================
  function boot() {
    cv = document.getElementById('game');
    ctx = cv.getContext('2d', { alpha: false });
    ctx.imageSmoothingEnabled = true;                 // this is not pixel art
    Atlas.bake();
    Sky.build();
    Input.bind(cv);
    FX.bind(env); Fuse.bind(env); Player.bind(env); Boss.bind(env);

    // CROSSETTE children: a splitting bullet becomes 4, inheriting its own faction. A converted
    // crossette therefore cascades into 16 PETALS — that is where the biggest chains come from.
    bul.onSplit = (i) => {
      const n = 4, sp = Math.hypot(bul.vx[i], bul.vy[i]) || 200;
      const base = Math.atan2(bul.vy[i], bul.vx[i]);
      const f = bul.faction[i], mine = f === Pool.FACTION.PLAYER;
      for (let k = 0; k < n; k++) {
        const a = base + (k / n) * U.TAU;
        bul.spawn(bul.x[i], bul.y[i], U.fcos(a) * sp * 0.85, U.fsin(a) * sp * 0.85,
                  mine ? Pool.T.PETAL : Pool.T.CIRCLE, f,
                  { r: mine ? 6 : 6, dmg: mine ? CFG.PETAL_DMG : 1,
                    life: mine ? CFG.PETAL_LIFE : 0, stage: bul.stage[i], pierce: bul.pierce[i] });
      }
    };
    // A FUSED bullet whose window closed unconverted splits into 6 hostiles (KAMURO P3).
    bul.onFuseExpire = (i) => {
      const n = 6, sp = 180;
      for (let k = 0; k < n; k++) {
        const a = k / n * U.TAU;
        bul.spawn(bul.x[i], bul.y[i], U.fcos(a) * sp, U.fsin(a) * sp,
                  Pool.T.CIRCLE, Pool.FACTION.ENEMY, { r: 6 });
      }
      bul.kill(i);
    };

    bindScreens();
    lastT = performance.now();
    running = true;
    requestAnimationFrame(frame);
  }

  function showScreen(id) {
    const all = document.querySelectorAll('.screen');
    for (let i = 0; i < all.length; i++) all[i].classList.remove('on');
    if (id) { const el = document.getElementById(id); if (el) el.classList.add('on'); }
  }
  function bindScreens() {
    const b = (id, fn) => { const el = document.getElementById(id); if (el) el.addEventListener('click', fn); };
    b('btn-begin', () => { AUDIO.init(); AUDIO.resume(); start(); });
    b('btn-again', () => { AUDIO.resume(); start(); });
    b('btn-leave', () => toTitle());
    b('vic-again', () => { AUDIO.resume(); start(); });
    b('vic-leave', () => toTitle());
  }

  function start(act, slot, phase) {
    mode = 'run'; tick = 0; acc = 0; paused = false;
    bul.clear(); Enemies.clear(); Beams.reset();
    FX.reset(); Fuse.reset(); Sky.reset(); HUD.reset(); Boss.clear();
    Player.reset(true);
    Director.bind(env); Director.reset();
    AUDIO.init(); AUDIO.startRun();
    Director.start(act || 0, slot === undefined ? 0 : slot, phase);
    showScreen(null);
    emit('run_start', {});
  }
  function toTitle() {
    mode = 'title'; bul.clear(); Enemies.clear(); Beams.reset(); Boss.clear();
    AUDIO.stopRun(); showScreen('scr-title');
  }

  // ================= SIM =================
  function stepSim() {
    if (mode !== 'run') { tick++; return; }
    // Hitstop freezes the SIM but FX.update must still run — it is the only thing that counts the
    // hitstop down. Gate it here and the game freezes forever.
    if (FX.hitstopT > 0) { FX.update(DT); tick++; return; }

    const intent = Input.sample();
    // Gate action edges on the respawn lock: mashing during the 0.35s freeze after a death used to
    // burn a MISFIRE charge on an immobile ship and queue a FLARE that fired 380px straight up the
    // instant control returned. Don't consume the edge — let it replay cleanly once you're back.
    if (Player.p.dead <= 0) {
      if (Input.takeEdge('flare')) Player.flare(bul);
      if (Input.takeEdge('misfire')) Player.misfire(bul);
    }

    Player.update(intent, bul, DT);
    Enemies.update(DT);
    Director.update(DT);
    Fuse.update(DT, Director.isEighth);
    Beams.update(DT);
    bul.update(DT);
    collide();
    FX.update(DT);
    Sky.update(DT, Fuse.tier);
    AUDIO.update(DT);

    if (Player.p.lives <= 0 && mode === 'run') { mode = 'over'; AUDIO.setSection('DEATH'); showScreen('scr-over'); }
    if (Director.phaseOfRun === 'done' && mode === 'run') {
      mode = 'victory';
      const el = document.getElementById('vic-score');
      if (el) el.textContent = 'Score  ' + Fuse.score.toLocaleString();
      showScreen('scr-victory');
    }
    tick++;
  }

  // ---- collision ----
  // Player vs enemy bullets: one flat loop, cheap x-reject first. ~2500 iterations, ~0.05ms.
  // Petals & peas vs enemies: only ~48 enemies are ever alive, so a direct loop beats a spatial hash
  // in both wall-clock and complexity. Measured, not assumed.
  function collide() {
    const p = Player.p;
    const HR = CFG.HITBOX_R;

    if (!godmode && p.invuln <= 0 && p.dead <= 0) {
      // SWEEP the player's motion this frame (prev -> cur), not just the end point. A FLARE covers
      // ~35px/tick — more than a bullet's 18px capture diameter — so a point test let the dash tunnel
      // clean through bullets and beams, silently handing FLARE the i-frames the design forbids.
      const ax = p.prevX, ay = p.prevY, sdx = p.x - ax, sdy = p.y - ay;
      const seg2 = sdx * sdx + sdy * sdy;
      const rejectBand = 40 + Math.abs(sdx) + Math.abs(sdy);   // widen the broad-reject by the sweep length
      for (let i = 0; i < bul.n; i++) {
        if (bul.faction[i] !== Pool.FACTION.ENEMY) continue;
        const bx = bul.x[i], by = bul.y[i];
        if (bx - p.x > rejectBand || p.x - bx > rejectBand || by - p.y > rejectBand || p.y - by > rejectBand) continue;
        // closest point on the player's swept segment to this bullet
        let t = seg2 > 0 ? ((bx - ax) * sdx + (by - ay) * sdy) / seg2 : 0;
        t = t < 0 ? 0 : (t > 1 ? 1 : t);
        const ccx = ax + sdx * t - bx, ccy = ay + sdy * t - by;
        const rr = HR + bul.r[i];
        if (ccx * ccx + ccy * ccy <= rr * rr) { Player.hit(); break; }
      }
      // beams: sample the swept path at <=2*HR spacing so a dash can't jump an amber beam either
      if (p.invuln <= 0) {
        const steps = 1 + (Math.sqrt(seg2) / (HR * 2)) | 0;
        for (let sI = 0; sI <= steps; sI++) {
          const tt = steps > 0 ? sI / steps : 0;
          if (Beams.hits(ax + sdx * tt, ay + sdy * tt, HR)) { Player.hit(); break; }
        }
      }
    }

    // player projectiles vs enemies and the boss
    for (let i = bul.n - 1; i >= 0; i--) {
      if (bul.faction[i] !== Pool.FACTION.PLAYER) continue;
      const isPetal = bul.type[i] === Pool.T.PETAL;
      const bx = bul.x[i], by = bul.y[i];

      // LANTERN auras eat the peashooter. Petals pass straight through. This one predicate is what
      // turns LANTERN from "a tanky enemy" into "the teacher".
      if (!isPetal && Enemies.auraBlocks(bx, by)) { bul.kill(i); continue; }

      let consumed = false;
      for (let k = 0; k < Enemies.list.length; k++) {
        const e = Enemies.list[k];
        if (!e.alive) continue;
        // The gun PASSES THROUGH a shell that isn't inviting you yet. It must visibly fly through,
        // not silently vanish: "not yet" has to read on screen, or the game looks broken. Petals
        // still collide, because a petal lights the fuse it touches.
        if (!isPetal && !Fuse.vulnerable(e)) continue;
        const dx = bx - e.x, dy = by - e.y;
        const rr = e.r + bul.r[i] + (isPetal ? CFG.PETAL_HIT_BONUS : 0);
        if (dx * dx + dy * dy > rr * rr) continue;
        Fuse.damage(e, bul.dmg[i], isPetal);
        if (isPetal) env.audio.petalHit && env.audio.petalHit(bx);
        if (bul.pierce[i] > 1) { bul.pierce[i]--; }
        else { bul.kill(i); consumed = true; }
        break;
      }
      if (consumed) continue;
      if (Boss.active && Boss.damageAt(bx, by, bul.dmg[i], isPetal)) {
        if (bul.pierce[i] > 1) bul.pierce[i]--; else bul.kill(i);
      }
    }
  }

  // ================= DRAW =================
  // THE DRAW-ORDER LAW. Fuse rings are drawn ABOVE every bullet, always. In a 2000-bullet screen the
  // invitation must never be occluded by the thing it is inviting you to prevent.
  function drawBulletLayer(pred) {
    const A = Atlas.canvas, CELL = Atlas.CELL, half = CELL / 2;
    for (let i = 0; i < bul.n; i++) {
      const t = bul.type[i];
      if (!pred(i, t)) continue;
      const cellBase = Atlas.base(t, bul.stage[i]);
      let cell = cellBase;
      if (Atlas.directional(t)) cell = cellBase + Atlas.rotIdx(Math.atan2(bul.vy[i], bul.vx[i]));
      const k = bul.r[i] / Atlas.BAKE_R[t] * half;
      ctx.drawImage(A, Atlas.sx[cell], Atlas.sy[cell], CELL, CELL,
                    bul.x[i] - k, bul.y[i] - k, k * 2, k * 2);
    }
  }
  const isEnemyB = (i) => bul.faction[i] === Pool.FACTION.ENEMY;
  const isPetalB = (i, t) => bul.faction[i] === Pool.FACTION.PLAYER && t === Pool.T.PETAL;
  const isPeaB = (i, t) => bul.faction[i] === Pool.FACTION.PLAYER && t === Pool.T.PEA;
  const isInert = (i) => bul.faction[i] === 2;

  // Precomputed once: constant-alpha trim colours used every frame per enemy. U.hexa allocates an
  // [r,g,b] array + a template string, so calling it in the draw loop was ~50-100 allocs/frame.
  const TRIM_06 = U.hexa(CFG.COL.enemyTrim, 0.06);
  const TRIM_22 = U.hexa(CFG.COL.enemyTrim, 0.22);
  const TRIM_75 = U.hexa(CFG.COL.enemyTrim, 0.75);

  function drawEnemies() {
    const C = CFG.COL;
    // auras first (under everything) so a LANTERN reads as a volume, not a decal
    ctx.globalCompositeOperation = 'lighter';
    for (let k = 0; k < Enemies.list.length; k++) {
      const e = Enemies.list[k];
      if (!e.alive || !e.aura) continue;
      ctx.fillStyle = TRIM_06;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.aura, 0, U.TAU); ctx.fill();
      ctx.strokeStyle = TRIM_22; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(e.x, e.y, e.aura, 0, U.TAU); ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    for (let k = 0; k < Enemies.list.length; k++) {
      const e = Enemies.list[k];
      if (!e.alive) continue;
      const flash = e.hitFlash > 0;
      ctx.save(); ctx.translate(e.x, e.y);
      // hull: a shell casing. Slight rotation with drift so a crowd never looks like a grid.
      ctx.rotate(U.fsin(e.t * 0.7) * 0.12);
      ctx.fillStyle = flash ? '#FFFFFF' : (e.friendlyObject ? C.accent : C.enemyHull);
      ctx.beginPath();
      const r = e.r;
      ctx.moveTo(0, -r); ctx.lineTo(r * 0.78, -r * 0.2); ctx.lineTo(r * 0.5, r * 0.85);
      ctx.lineTo(-r * 0.5, r * 0.85); ctx.lineTo(-r * 0.78, -r * 0.2);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = TRIM_75; ctx.lineWidth = 1.4; ctx.stroke();
      // core: magenta normally, WHITE during the window
      ctx.fillStyle = e.fuseOpen ? '#FFFFFF' : C.enemyCore;
      ctx.beginPath(); ctx.arc(0, 0, r * 0.32, 0, U.TAU); ctx.fill();
      ctx.restore();
    }
  }

  // The invitation layer. Above all bullets. White means ACT NOW and nothing else in the game is
  // allowed to be this colour at this alpha.
  function drawFuseRings() {
    // Constant white strokeStyle + varying globalAlpha: no per-ring string build. The old
    // toFixed()+concat allocated per open ring per frame — ~80 strings/frame during KAMURO P3's
    // 40 bullet-borne fuses, injected into the single heaviest phase in the game.
    ctx.strokeStyle = '#FFFFFF';
    for (let k = 0; k < Enemies.list.length; k++) {
      const e = Enemies.list[k];
      if (!e.alive || !e.fuseOpen) continue;
      const frac = U.clamp(e.fuseT / Math.max(0.0001, e.fuseMax), 0, 1);
      const rr = e.r * (1 + (CFG.FUSE_RING_SCALE - 1) * frac);     // shrinks = a visual countdown
      ctx.globalAlpha = 0.65 + 0.35 * Math.abs(U.fsin(e.t * U.TAU * CFG.FUSE_RING_HZ));
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(e.x, e.y, rr, 0, U.TAU); ctx.stroke();
    }
    // bullets that carry their own fuse (KAMURO P3)
    ctx.lineWidth = 1.5;
    for (let i = 0; i < bul.n; i++) {
      if (!(bul.flags[i] & Pool.F.FUSED)) continue;
      const frac = U.clamp(bul.fuseT[i] / Math.max(0.0001, bul.fuseMax[i]), 0, 1);
      ctx.globalAlpha = 0.55 + 0.45 * frac;
      ctx.beginPath(); ctx.arc(bul.x[i], bul.y[i], bul.r[i] + 4 + 6 * frac, 0, U.TAU); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }

  function draw() {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#05070E';
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.translate(FX.shakeX, FX.shakeY);

    Sky.drawBack(ctx);
    Sky.drawFront(ctx);
    FX.drawUnder(ctx);

    drawEnemies();
    if (Boss.active) Boss.draw(ctx);
    Beams.draw(ctx);

    ctx.globalCompositeOperation = 'lighter';
    drawBulletLayer(isEnemyB);
    drawBulletLayer(isPetalB);
    drawBulletLayer(isPeaB);
    drawBulletLayer(isInert);
    ctx.globalCompositeOperation = 'source-over';

    drawFuseRings();
    Player.draw(ctx);
    FX.drawParticles(ctx);
    ctx.restore();

    if (quality < 1) FX.applyBloom(ctx);
    FX.drawOver(ctx);
    if (Boss.active) Boss.drawHpBar(ctx);
    HUD.draw(ctx, hudState());
  }

  // Reused HUD state struct — overwritten, not reallocated, so draw() adds no per-frame heap object.
  const HS = {};
  function hudState() {
    HS.score = Fuse.score; HS.lives = Player.p.lives; HS.misfires = Player.p.misfires;
    HS.chain = Fuse.chain; HS.applause = Fuse.applause; HS.tier = Fuse.tier; HS.tierName = Fuse.tierName;
    HS.act = Director.act; HS.actName = CFG.ACTS[Director.act] ? CFG.ACTS[Director.act].name : '';
    HS.waveName = Director.waveName; HS.bossActive = Boss.active;
    return HS;
  }

  // ================= LOOP =================
  function frame(now) {
    if (!running) return;
    const raw = now - lastT; lastT = now;
    const t0 = performance.now();
    let dtms = Math.min(raw, 50);                 // max 3 catch-up steps, then drop time
    if (paused) {
      if (stepQueue > 0) { stepQueue--; stepSim(); }
      draw();
      sampleFrame(performance.now() - t0);
      requestAnimationFrame(frame); return;
    }
    acc += dtms / 1000;
    let steps = 0;
    while (acc >= DT && steps < 3) { stepSim(); acc -= DT; steps++; }
    if (acc > DT) acc = 0;
    draw();
    sampleFrame(performance.now() - t0);          // work time, not wall time
    requestAnimationFrame(frame);
  }

  // ================= DEBUG API =================
  function assertHealthy() {
    const out = [];
    if (bul.n > bul.cap) out.push('bullet overflow ' + bul.n);
    for (let i = 0; i < bul.n; i++) {
      if (!Number.isFinite(bul.x[i]) || !Number.isFinite(bul.y[i]) ||
          !Number.isFinite(bul.vx[i]) || !Number.isFinite(bul.vy[i])) { out.push('NaN bullet at ' + i); break; }
    }
    let en = 0;
    for (let k = 0; k < Enemies.list.length; k++) {
      const e = Enemies.list[k];
      if (!e.alive) continue;
      en++;
      if (!Enemies.TYPES[e.name]) out.push('bad enemy type ' + e.name);
      if (e.fuseMax > 3.0) out.push('fuse window too long: ' + e.name + ' ' + e.fuseMax);
      if (!Number.isFinite(e.x) || !Number.isFinite(e.y)) { out.push('NaN enemy ' + e.name); break; }
    }
    if (en > CFG.ENEMY_CAP) out.push('enemy overflow ' + en);
    // a PLAYER-faction bullet must never be lethal to the player
    for (let i = 0; i < bul.n; i++) {
      if (bul.faction[i] === Pool.FACTION.PLAYER && (bul.flags[i] & Pool.F.AMBER)) {
        out.push('amber bullet in PLAYER faction'); break;
      }
    }
    if (Fuse.openCount < 0) out.push('negative open window count');
    if (AUDIO.voices > 24) out.push('audio voices ' + AUDIO.voices);
    return out;
  }

  const API = {
    version: '1.0.0',
    pause() { paused = true; }, resume() { paused = false; }, isPaused() { return paused; },
    step(n) { stepQueue += (n === undefined ? 1 : n); if (!paused) { for (let i = 0; i < (n || 1); i++) stepSim(); stepQueue = 0; } },
    // deterministic stepping for tests: runs n logic ticks immediately regardless of pause state
    advance(n) { for (let i = 0; i < n; i++) stepSim(); },
    seed(s) { U.rngRun.set(s); },
    load(act, slot, phase) {
      const sl = slot === 'boss' ? Director.SLOT.BOSS : (slot === 'rally' ? Director.SLOT.RALLY : (slot | 0));
      start(act | 0, sl, phase | 0);
    },
    restart() { start(0, 0); },
    toTitle,
    setInput(o) { Input.inject(o); }, clearInput() { Input.clearInject(); },
    godmode(on) { godmode = !!on; },
    // Clean-room mode for measuring cascades: no wave spawning, no boss, nothing but what the test
    // puts on the screen. The musical clock keeps running so fuse windows are still granted.
    sandbox() {
      start(0, 0);
      Director.setFrozen(true);
      Enemies.clear(); bul.clear(); Beams.reset(); Boss.clear();
      Fuse.reset(); Fuse.setMaxConcurrent(12);
      godmode = true;
    },
    unsandbox() { Director.setFrozen(false); },
    setLives(n) { Player.p.lives = n; },
    setApplause(v) { Fuse.reset && (Fuse.addApplause(v - Fuse.applause)); },
    spawn(name, x, y, opts) { return Enemies.spawn(name, x, y, opts); },
    killBoss() { if (Boss.active) { Boss.state.hp = 0; Boss.finish(); } },
    setBossHP(frac) { if (Boss.active) Boss.state.hp = Boss.state.maxHp * frac; },
    nextPhase() { if (Boss.active) Boss.advance(); },
    stress(n) {
      const cx = W / 2, cy = H / 2;
      for (let i = 0; i < n; i++) {
        const a = i / n * U.TAU * 7;
        bul.spawn(cx, cy, U.fcos(a) * 60, U.fsin(a) * 60, Pool.T.CIRCLE, Pool.FACTION.ENEMY, { r: 6, life: 30 });
      }
    },
    audio(on) { AUDIO.setMute(!on); },
    screenshot() { return cv.toDataURL('image/png'); },
    state() {
      const st = Boss.state;
      return {
        mode, tick, scene: mode,
        act: Director.act, slot: Director.slot, phaseOfRun: Director.phaseOfRun,
        waveName: Director.waveName, bar: Director.bar, beat: Director.beat, bpm: Director.bpm,
        boss: (Boss.active && st) ? {
          name: st.name, phase: st.phase,
          phaseName: st.def.phases[st.phase] ? st.def.phases[st.phase].name : '',
          hpFrac: st.hp / st.maxHp, phaseElapsed: st.phaseElapsed, nodes: st.nodes.length,
        } : null,
        player: { x: Player.p.x, y: Player.p.y, vx: Player.p.vx, vy: Player.p.vy,
                  lives: Player.p.lives, invuln: Player.p.invuln, misfires: Player.p.misfires,
                  focused: Player.p.focus, flareCd: Player.p.flareCd },
        counts: { bulletsEnemy: bul.count(0), bulletsPlayer: bul.count(1), bulletsTotal: bul.n,
                  enemies: Enemies.alive(), beams: Beams.count(), openWindows: Fuse.openCount,
                  queuedWindows: Fuse.queued },
        score: Fuse.score, applause: Fuse.applause, tier: Fuse.tier, tierName: Fuse.tierName,
        chain: Fuse.chain, chainLifetime: Fuse.chainLifetime,
        perf: Object.assign({ quality }, perfStats()),
      };
    },
    bullets() { return { x: bul.x, y: bul.y, faction: bul.faction, type: bul.type, n: bul.n }; },
    enemies() {
      const out = [];
      for (let k = 0; k < Enemies.list.length; k++) {
        const e = Enemies.list[k];
        if (e.alive) out.push({ id: e.id, type: e.name, x: e.x, y: e.y, hp: e.hp,
                                fuseOpen: e.fuseOpen, fuseRemaining: e.fuseT });
      }
      return out;
    },
    events, onEvent(cb) { listeners.push(cb); return () => { const i = listeners.indexOf(cb); if (i >= 0) listeners.splice(i, 1); }; },
    clearEvents() { events.length = 0; },
    assert: assertHealthy,
    perf(frames) {
      return new Promise((res) => {
        frN = 0; frI = 0;
        let c = 0;
        const t0 = performance.now();
        const step = () => {
          c++;
          if (c < (frames || 300)) requestAnimationFrame(step);
          else res(Object.assign({ frames: c, wall: performance.now() - t0, bulletPeak: bul.n }, perfStats()));
        };
        requestAnimationFrame(step);
      });
    },
  };

  return {
    boot, start, toTitle, emit,
    playerX: () => Player.p.x, playerY: () => Player.p.y,
    get bullets() { return bul; },
    get ctx() { return ctx; },
    get mode() { return mode; },
    API,
  };
})();
