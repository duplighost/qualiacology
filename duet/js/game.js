// DUET — game. Orchestrates the fixed-step sim, the five-movement setlist, HP/continue, scoring,
// the draw-order law (§9.3), HUD, screens, and the window.__shmup test surface. One partner, one danger.
window.Game = (() => {
  const C = CFG.COL, W = CFG.W, H = CFG.H, DT = CFG.DT;
  const PARTNER_HIT_R = 44;

  let cv, ctx;
  let mode = 'title';                    // 'title' | 'run' | 'continue' | 'victory' | 'pause'
  let victoryType = 'true';
  let frame = 0, paused = false;
  let score = 0;
  let hitstop = 0;
  let camZoom = 1, camZoomTarget = 1;
  let labelText = '', labelTimer = 0;
  let lastFocus = false;

  const bullets = Ent.makeBulletPool(CFG.BULLET_CAP);
  const pbullets = Ent.makeBulletPool(160);       // your teal shots
  const sparks = Ent.makeSparkPool(240);
  const player = Ent.makePlayer();
  const partner = Ent.makePartner();
  let ghostBuf = [];                               // recorded (x,y) sampled /8f during Mvt I-III
  const listeners = [];
  const emit = (type, payload) => { for (const cb of listeners) try { cb(type, payload || {}); } catch (e) {} };

  // ---- stage table (five movements + the Cadence midboss folded in) ----
  // gauge = frames on the pure TIME FLOOR (a timid player still advances). ~60f/s. Tuned so I..IV run ~3min
  // and the intimate patterns can't be gunned past (damage adds only a small, capped nudge — see stepSim).
  const STAGES = [
    { key: 'meeting',  name: 'Meeting',  mvt: 0, gauge: 1900, emit: emitMeeting,  sting: null },     // ~32s: learn to lean in
    { key: 'play',     name: 'Play',     mvt: 1, gauge: 2200, emit: emitPlay,     sting: 'normal' },  // ~37s: call & response
    { key: 'friction', name: 'Friction', mvt: 2, gauge: 2500, emit: emitFriction, sting: 'normal' },  // ~42s: first density
    { key: 'cadence',  name: 'Cadence',  mvt: 2, gauge: 1650, emit: emitCadence,  sting: 'normal' },  // ~27s: midboss test
    { key: 'rupture',  name: 'Rupture',  mvt: 3, gauge: 2600, emit: emitRupture,  sting: 'rupture' }, // ~43s: it means it
    { key: 'ghost',    name: 'Unison',   mvt: 4, gauge: 1e9,  emit: emitGhost,    sting: 'ghost' },   // gated by the UNISON hold, not time
  ];
  let stageIdx = 0, stageGauge = 0, stageFrame = 0, dmgAccum = 0, harmonize = { sweep: false, r: 0, max: 0, lock: 0 };
  let seq = {};                                    // per-stage transient state
  const lastScan = { inBand: 0, grazing: false };
  const stage = () => STAGES[stageIdx];

  // ========== LIFECYCLE ==========
  function start() {
    mode = 'run'; frame = 0; score = 0; hitstop = 0; camZoom = camZoomTarget = 1;
    bullets.clear(); pbullets.clear(); sparks.clear(); FX.reset(); Conductor.reset();
    player.reset(); partner.reset(); ghostBuf = [];
    stageIdx = 0; enterStage(0, true);
    AUDIO.init(); AUDIO.resume(); AUDIO.startRun();
    showScreen(null);
  }
  function reset() { mode = 'title'; bullets.clear(); pbullets.clear(); sparks.clear(); AUDIO.stopRun(); showScreen('title'); }

  function enterStage(i, silent) {
    stageIdx = i; stageGauge = 0;
    seq = { theta: 0, turn: 0.19, turnFrom: 0.19, turnTo: 0.19, bloom: 0, phase: 0, breath: 0, laser: null, tick: 0, mote: 0, brave: 0, recapTheta: 0 };
    harmonize.sweep = false; harmonize.lock = 0;   // never carry a bomb sweep/lockout into a new movement
    bullets.clear();
    const st = STAGES[i];
    labelText = st.name; labelTimer = 150;
    partner.driftEnabled = st.key !== 'cadence';
    if (!silent && st.sting) AUDIO.stinger(st.sting === 'rupture' ? 'rupture' : st.sting === 'ghost' ? 'ghost' : 'normal');
    if (st.sting) { FX.triggerShake(CFG.SHAKE_TELL); }
    if (st.key === 'ghost') buildGhost();
    emit('stinger', { stage: st.key });
  }
  function advanceStage() {
    if (stageIdx < STAGES.length - 1) { AUDIO.movementClear(); emit('movementClear', { stage: stage().key }); enterStage(stageIdx + 1); }
  }

  // ========== FIXED-STEP SIM ==========
  function stepSim() {
    if (mode !== 'run') { frame++; return; }
    if (hitstop > 0) { hitstop--; return; }         // freeze the field on a hit/convert

    const intent = Input.sample(player.x, player.y);
    if (intent.focus !== lastFocus) { AUDIO.focus(intent.focus); lastFocus = intent.focus; }
    player.move(intent);
    if (player.iframes > 0) player.iframes--;
    if (harmonize.lock > 0) harmonize.lock--;

    // fire
    player.firing = intent.fire;
    if (player.fireCd > 0) player.fireCd--;
    if (player.firing && player.fireCd <= 0) { fireShots(); player.fireCd = Math.round(Conductor.fireIntervalMs() * 0.06); }

    // your shots -> partner
    pbullets.update();
    for (let i = 0; i < pbullets.cap; i++) { const b = pbullets.arr[i]; if (!b.active) continue;
      if (U.dist(b.x, b.y, partner.x, partner.y) < PARTNER_HIT_R) {
        b.active = false; partner.damage(CFG.PLAYER_DMG); dmgAccum += CFG.PLAYER_DMG;
        if ((frame & 7) === 0) AUDIO.shotConnect(); FX.popcorn(b.x, b.y, 3, C.fire); }
    }

    // partner + this movement's fire (stageFrame is 0 on each movement's first emitted frame)
    partner.updateDrift(DT);
    stage().emit(seq, stageFrame);
    bullets.update();

    // graze + collision
    const invuln = player.iframes > 0;
    const res = Ent.scan(bullets, player, invuln, onGraze);
    lastScan.inBand = res.inBand; lastScan.grazing = res.inBand > 0;
    if (res.hit) onPlayerHit();

    // conductor (the Cadence two-bar rest halves closeness decay to reward diving point-blank)
    let decayScale = 1;
    if (stage().key === 'cadence') { const cyc = stageFrame % 300; if (cyc > 10 && cyc < 120) decayScale = 0.5; }
    Conductor.update(res.inBand > 0, res.inBand, intent.focus, stage().mvt, DT, decayScale);
    if (Conductor.justCrossedTier >= 0) AUDIO.tierUp();
    if (Conductor.enteredUnison) { FX.spikeChroma(CFG.CHROMA_SPIKE); FX.triggerFlash(0.3); AUDIO.unisonAchieved(); emit('unison', {}); }

    // harmonize
    if (Input.takeEdge('bomb') || (intent.bomb)) doHarmonize();
    updateHarmonize();

    // sparks
    updateSparks();

    // ghost buffer (Mvt I-III)
    if (stage().mvt <= 2 && (frame & 7) === 0) { ghostBuf.push({ x: player.x, y: player.y }); if (ghostBuf.length > 320) ghostBuf.shift(); }

    // fx + audio + camera
    FX.update(DT, Conductor);
    AUDIO.frame(Conductor.closeness, Conductor.unison, stage().mvt);
    camZoomTarget = Conductor.cameraZoom();
    camZoom = U.smoothTo(camZoom, camZoomTarget, 6, DT);
    if (labelTimer > 0) labelTimer--;

    // gauge / progression: time floor dominates; damage adds only a small capped nudge so offense can't
    // fast-forward past the intimate patterns (Ghost gates on the UNISON hold instead — see emitGhost).
    const idxBefore = stageIdx;
    if (stage().key !== 'ghost') { stageGauge += 1 + Math.min(dmgAccum * 0.02, 0.5); dmgAccum = 0; if (stageGauge >= stage().gauge) advanceStage(); }
    stageFrame = (stageIdx === idxBefore) ? stageFrame + 1 : 0;   // new movement's first emit sees stageFrame 0
    frame++;
  }

  function onGraze(b) {
    FX.grazeFleck(b.x, b.y, player.x, player.y);
    AUDIO.grazeTick(Conductor.closeness);
    score += Math.round(CFG.SCORE_GRAZE * Conductor.mult() * 0.1);
    emit('graze', { x: b.x, y: b.y });
  }

  function fireShots() {
    const n = Conductor.fanCount(), spd = CFG.PLAYER_BULLET_SPEED * DT, base = -Math.PI / 2;
    const fan = (CFG.FIRE_FAN_DEG * Math.PI / 180);
    for (let i = 0; i < n; i++) {
      const a = n === 1 ? base : base - fan + (2 * fan) * (i / (n - 1));
      pbullets.spawn(player.x, player.y - 10, Math.cos(a) * spd, Math.sin(a) * spd, 'player');
    }
    FX.muzzle(player.x, player.y); AUDIO.fire(Conductor.closeness);
  }

  function onPlayerHit() {
    if (player.iframes > 0) return;
    player.hp--; player.iframes = Math.round(CFG.HIT_IFRAMES_MS * 0.06);
    Conductor.onHit(); FX.triggerDesat(); FX.triggerShake(CFG.SHAKE_HIT); FX.spikeChroma(CFG.CHROMA_SPIKE);
    hitstop = Math.round(CFG.HIT_HITSTOP_MS * 0.06); camZoom = 1;
    AUDIO.deathGate(); emit('hit', { hp: player.hp });
    if (player.hp <= 0) { mode = 'continue'; showScreen('continue'); }
  }

  function doHarmonize() {
    if (harmonize.lock > 0 || harmonize.sweep) return;
    let radius;
    if (Conductor.closeness >= CFG.HARMONIZE_COST) { Conductor.closeness -= CFG.HARMONIZE_COST; radius = CFG.HARMONIZE_RADIUS_FULL; }
    else { Conductor.closeness = 0; radius = CFG.HARMONIZE_RADIUS_WEAK; }
    harmonize.sweep = true; harmonize.r = 0; harmonize.max = radius; harmonize.lock = Math.round(CFG.HARMONIZE_LOCKOUT_MS * 0.06);
    player.iframes = Math.max(player.iframes, Math.round(CFG.HARMONIZE_IFRAMES_MS * 0.06));
    FX.triggerShake(CFG.SHAKE_HARMONIZE); FX.spikeChroma(CFG.CHROMA_SPIKE); FX.triggerFlash(0.4); AUDIO.harmonize();
    emit('harmonize', {});
  }
  function updateHarmonize() {
    if (!harmonize.sweep) return;
    const stepR = harmonize.max / Math.round(CFG.HARMONIZE_SWEEP_MS * 0.06);
    harmonize.r += stepR;
    for (let i = 0; i < bullets.cap; i++) { const b = bullets.arr[i]; if (!b.active) continue;
      if (U.dist(b.x, b.y, player.x, player.y) <= harmonize.r) {
        b.active = false; sparks.spawn(b.x, b.y, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 2, Math.round(CFG.SPARK_MAGNET_MS * 0.06));
        FX.popcorn(b.x, b.y, 3, C.spark); }
    }
    if (harmonize.r >= harmonize.max) { harmonize.sweep = false; AUDIO.sparks(player.x); }
  }
  function updateSparks() {
    for (let i = 0; i < sparks.cap; i++) { const s = sparks.arr[i]; if (!s.active) continue;
      if (s.magnet > 0) { s.magnet--; const a = Math.atan2(player.y - s.y, player.x - s.x), d = U.dist(s.x, s.y, player.x, player.y);
        const sp = Math.min(14, d * 0.25 + 2); s.vx = Math.cos(a) * sp; s.vy = Math.sin(a) * sp; }
      else { s.vx *= 0.94; s.vy *= 0.94; s.vy += 0.05; }
      s.x += s.vx; s.y += s.vy; s.life++;
      if (U.dist(s.x, s.y, player.x, player.y) < 18) { s.active = false; score += Math.round(CFG.SCORE_SPARK * Conductor.mult()); AUDIO.harvest(Conductor.mult()); FX.popcorn(player.x, player.y, 2, C.gold); }
      else if (s.life > 240) s.active = false;
    }
  }

  // ========== MOVEMENT EMITTERS ==========
  function emitMeeting(s, lf) {
    const spd = 2.2;
    const inBreath = (lf % 60) < 20;
    if (inBreath && lf % 10 === 0) { s.breath = (s.breath || 0);
      if ((Math.floor(lf / 60) % 2) === 0) Patterns.aimed(bullets, partner, player, 3, 0.18, spd);
      else Patterns.aimed(bullets, partner, player, 5, 0.16, 2.3); }
    if (lf % 120 === 0 && lf > 0) { Patterns.ring(bullets, partner, 12, 2.0, s.phase); s.phase += 0.26; }
  }
  function emitPlay(s, lf) {
    if (lf % 120 === 0) { Patterns.ring(bullets, partner, 16, 2.2, s.phase); s.bloom++; if (s.bloom % 3 === 0) Patterns.decelPetals(bullets, partner, 8, 2.4, s.phase + 0.2); }
    if (lf % 120 === 60) { Patterns.ring(bullets, partner, 16, 2.2, s.phase + Math.PI / 16); s.phase += 0.10; }
  }
  function emitFriction(s, lf) {
    // continuous 3-arm spiral. Every 6s (360f) the turn rate EASES 0.19 -> -0.19 over 30 frames; at the
    // zero-crossing the spiral advance halts and the 3 arms stack into straight radial spokes — a legible,
    // exploitable tell for a burst of safe point-blank grazing (spec §6 HELIX).
    const cyc = lf % 360;
    if (cyc === 0 && lf > 0) { s.turnFrom = s.turn; s.turnTo = -s.turn; }
    s.turn = (cyc < 30) ? U.lerp(s.turnFrom, s.turnTo, cyc / 30) : s.turnTo;
    s.theta += s.turn;
    if (lf % 2 === 0) Patterns.spiralStep(bullets, partner, 3, s.theta, 2.6);
    if (lf % 90 === 0) Patterns.aimed(bullets, partner, player, 3, 0.16, 2.3);
  }
  function emitCadence(s, lf) {
    partner.x = 640; partner.y = 150;
    const cyc = lf % 300;                                  // ~5s call/response cycles, x-ish
    if (cyc === 0) { Patterns.aimed(bullets, partner, player, 7, 0.13, 2.5); AUDIO.partnerTell(); }
    // two-bar rest: closeness decay halved handled by reward of diving (we simply don't add bullets)
    if (cyc === 120) { ghostSeed(); }                      // First Turn: replay last ~2s as pale lace
    if (cyc === 160) { Patterns.aimed(bullets, partner, player, 5, 0.14, 2.4); } // Answer Back
    if (cyc === 210) { for (let i = 0; i < 7; i++) bullets.spawn(200 + i * 140, -8, 0, 2.0, 'rose'); } // Echo from top
    // Recap — the three grammars in turn (Lantern -> Helix -> Cantabile), confirming you learned them
    if (cyc === 250) { Patterns.ring(bullets, partner, 16, 2.2, 0); s.recapTheta = 0; }
    if (cyc > 255 && cyc < 285 && cyc % 3 === 0) { s.recapTheta += 0.22; Patterns.spiralStep(bullets, partner, 3, s.recapTheta, 2.4); }
    if (cyc === 292) Patterns.aimed(bullets, partner, player, 5, 0.16, 2.3);
  }
  function emitRupture(s, lf) {
    // bravery made physical: hold closeness > 0.7 for 4s (240f) and the curtain visibly thins by a stream.
    if (Conductor.closeness > 0.7) s.brave++; else s.brave = 0;
    const thinned = s.brave >= 240;
    // sweeping laser: a full 200-frame non-lethal telegraph, then the beam sweeps (the moving edge is the danger)
    if (!s.laser) s.laser = { phase: 'tel', t: 0, ang: 0, a0: 0, a1: 0 };
    const L = s.laser; L.t++;
    if (L.phase === 'tel') {
      if (L.t === 1) { const dir = partner.aim(player.x, player.y); L.a0 = dir - 0.5; L.a1 = dir + 0.5; L.ang = L.a0; AUDIO.partnerTell(); }
      if (L.t >= 200) { L.phase = 'sweep'; L.t = 0; FX.triggerShake(CFG.SHAKE_TELL); }
    } else if (L.phase === 'sweep') {
      L.ang += 0.011; Patterns.laserBullet(bullets, partner, L.ang, CFG.LASER_STREAM_SPEED);
      if (L.ang >= L.a1) { L.phase = 'cool'; L.t = 0; }
    } else { if (L.t >= 90) { L.phase = 'tel'; L.t = 0; } if (!thinned && L.t % 9 === 0) Patterns.aimed(bullets, partner, player, 9, 0.10, 2.8); }
    if (lf % (thinned ? 6 : 3) === 0) Patterns.rainDrop(bullets, 80 + Math.random() * 1120, 2.2);
  }
  function emitGhost(s, lf) {
    partner.driftEnabled = true;
    if (lf < 60) { s.mote = 1; return; }                   // breath before the mirror
    if (lf % 32 === 0) {
      const n = Math.min(ghostBuf.length, 10 + Math.floor(ghostBuf.length / 8));
      for (let i = 0; i < n; i++) { const p = ghostBuf[(i * 7) % ghostBuf.length]; if (p) Patterns.ghostShot(bullets, p.x, p.y, player, 2.1, 0.25); }
      Patterns.ring(bullets, partner, 16, 2.1, s.phase); s.phase += 0.13;
    }
    if (Conductor.unison >= 1) trueEnding();
    else if (lf > 2400) shortEnding();
  }
  function ghostSeed() { // plant first pale-violet replay of recent flight
    const src = ghostBuf.slice(-16);
    for (const p of src) if (p) bullets.spawn(p.x, p.y, 0, 2.0, 'ghost');
  }
  function buildGhost() {
    if (ghostBuf.length < 8) { // headless / skipped intro: synthesize a legible path so V still works
      ghostBuf = []; for (let i = 0; i < 60; i++) ghostBuf.push({ x: 640 + 260 * Math.sin(i * 0.2), y: 480 + 120 * Math.sin(i * 0.13) });
    }
  }
  function saveBest() {
    try { const b = Number(localStorage.getItem('duet_best') || 0); if (score > b) { localStorage.setItem('duet_best', String(score));
      const el = document.getElementById('best'); if (el) el.textContent = 'Best  ' + score.toLocaleString(); } } catch (e) {}
  }
  function trueEnding() {
    if (mode !== 'run') return;
    bullets.clear(); FX.triggerFlash(0.6); FX.spikeChroma(CFG.CHROMA_SPIKE);
    AUDIO.unisonAchieved(); AUDIO.movementClear(); saveBest();
    mode = 'victory'; victoryType = 'true'; showScreen('victory'); emit('trueEnding', { score });
  }
  function shortEnding() {
    if (mode !== 'run') return;
    bullets.clear(); AUDIO.deathGate(); saveBest();
    mode = 'victory'; victoryType = 'short'; showScreen('victory'); emit('shortEnding', { score });
  }

  // patch: seq.turn0OrFlip used above — provide it
  // (kept on the seq object so per-stage state stays isolated)
  // ========== RENDER ==========
  let SPR = {};
  function bakeSprites() {
    SPR.rose = bulletSprite(C.rose, C.roseCore, 13, false);
    SPR.ghost = bulletSprite(C.ghost, C.ghostCore, 13, false);
    SPR.roseTight = bulletSprite(C.rose, C.roseCore, 13, true);   // dense-pass variant: tighter, dimmer glow so cores stay discrete
    SPR.ghostTight = bulletSprite(C.ghost, C.ghostCore, 13, true);
  }
  function bulletSprite(glowHex, coreHex, R, tight) {
    const s = 2 * R + 8, cn = document.createElement('canvas'); cn.width = cn.height = s;
    const g = cn.getContext('2d'), c = s / 2, rgb = U.hex2rgb(glowHex);
    const gAlpha = tight ? 0.30 : 0.55, gR = tight ? c * 0.66 : c;   // anti-washout: shrink+dim the glow when dense
    const grad = g.createRadialGradient(c, c, 0, c, c, gR);
    grad.addColorStop(0, U.rgba(rgb, gAlpha)); grad.addColorStop(0.5, U.rgba(rgb, gAlpha * 0.4)); grad.addColorStop(1, U.rgba(rgb, 0));
    g.fillStyle = grad; g.fillRect(0, 0, s, s);
    g.fillStyle = glowHex; g.beginPath();                    // hard diamond (never dims — the lethal read)
    g.moveTo(c, c - R * 0.72); g.lineTo(c + R * 0.72, c); g.lineTo(c, c + R * 0.72); g.lineTo(c - R * 0.72, c); g.closePath(); g.fill();
    g.fillStyle = coreHex; g.beginPath(); g.arc(c, c, Math.max(CFG.BULLET_CORE_MIN, R * 0.32), 0, U.TAU); g.fill();
    return cn;
  }

  function render(rt) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = C.void; ctx.fillRect(0, 0, W, H);
    const warm = mode === 'run' ? Conductor.warmth() : 0.12, uni = mode === 'run' ? Conductor.unison : 0;
    // camera
    const [sx, sy] = FX.shakeOffset();
    ctx.save(); ctx.translate(W / 2 + sx, H / 2 + sy); ctx.scale(camZoom, camZoom); ctx.translate(-W / 2, -H / 2);

    drawBackground(warm, rt);
    FX.renderBloom(ctx, partner, warm, uni);
    drawSparks();
    drawPlayerFire();
    drawPartner(warm, uni, rt);
    drawTelegraph();
    FX.renderDesat(ctx);            // gray the world; rose + core drawn after stay full color
    drawBullets();
    FX.renderParticles(ctx);
    drawPlayer();
    ctx.restore();

    if (mode === 'run' || mode === 'pause' || mode === 'continue') drawHUD(warm, uni);
    if (labelTimer > 0 && mode === 'run') drawLabel();
  }

  function drawBackground(warm, rt) {
    // breathing perspective grid toward the partner + drifting dust (all below rose/cyan luminance)
    const gb = 0.05 + warm * 0.16;
    ctx.strokeStyle = U.rgba(U.hex2rgb(C.ash), gb); ctx.lineWidth = 1;
    const cx = partner.x, cy = partner.y, breathe = 1 + 0.02 * Math.sin(rt * 0.0016);
    ctx.beginPath();
    for (let i = 1; i <= 12; i++) { const yy = (i / 12) * H * breathe; ctx.moveTo(0, yy); ctx.lineTo(W, yy); }
    for (let i = 0; i <= 16; i++) { const xx = (i / 16) * W; ctx.moveTo(xx, 0); ctx.lineTo(U.lerp(xx, cx, 0.25), H); }
    ctx.stroke();
    // aura band ring around the partner (marks the graze zone conceptually)
    ctx.strokeStyle = U.rgba(U.hex2rgb(C.body), 0.06 + warm * 0.1); ctx.beginPath(); ctx.arc(cx, cy, 120 + 8 * Math.sin(rt * 0.002), 0, U.TAU); ctx.stroke();
    // dust
    ctx.fillStyle = U.rgba(U.hex2rgb(C.ash), 0.5);
    for (let i = 0; i < 40; i++) { const x = (i * 197 + rt * 0.02) % W, y = (i * 311 + rt * 0.05) % H; ctx.fillRect(x, y, 1.5, 1.5); }
  }

  function drawSparks() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = U.rgba(U.hex2rgb(C.spark), 0.9); // loop-invariant
    for (let i = 0; i < sparks.cap; i++) { const s = sparks.arr[i]; if (!s.active) continue;
      ctx.beginPath(); ctx.arc(s.x, s.y, 3, 0, U.TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawPlayerFire() {
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = C.fire; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    for (let i = 0; i < pbullets.cap; i++) { const b = pbullets.arr[i]; if (!b.active) continue;
      ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 0.9, b.y - b.vy * 0.9); ctx.stroke(); }
    ctx.restore();
  }
  function drawPartner(warm, uni, rt) {
    const cx = partner.x, cy = partner.y, pulse = 1 + 0.12 * Math.sin(rt * 0.004);
    ctx.save(); ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 60 * pulse);
    g.addColorStop(0, U.rgba(U.hex2rgb(C.body), 0.8)); g.addColorStop(0.4, U.rgba(U.hex2rgb(C.body), 0.3)); g.addColorStop(1, U.rgba(U.hex2rgb(C.body), 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 60 * pulse, 0, U.TAU); ctx.fill();
    // calligraphic body spline
    ctx.strokeStyle = uni > 0 ? C.gold : C.body; ctx.lineWidth = 2 + uni * 1.5; ctx.beginPath();
    for (let a = 0; a <= U.TAU + 0.1; a += 0.3) { const r = 20 + 6 * Math.sin(a * 3 + rt * 0.003 + stageIdx); const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; a === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
    ctx.stroke(); ctx.restore();
  }
  function drawTelegraph() {
    if (stage().key !== 'rupture' || !seq.laser || seq.laser.phase !== 'tel') return;
    const L = seq.laser, a = (L.a0 + L.a1) / 2, k = Math.min(1, L.t / 120);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = U.rgba(U.hex2rgb(C.rose), 0.12 + k * 0.25); ctx.lineWidth = 2 + k * 3;
    ctx.beginPath(); ctx.moveTo(partner.x, partner.y); ctx.lineTo(partner.x + Math.cos(a) * 1400, partner.y + Math.sin(a) * 1400); ctx.stroke(); ctx.restore();
  }
  function drawBullets() {
    const dense = bullets.count() > 220;               // anti-washout: dense passes use the tight-glow sprite
    const rose = dense ? SPR.roseTight : SPR.rose, ghost = dense ? SPR.ghostTight : SPR.ghost;
    for (let i = 0; i < bullets.cap; i++) { const b = bullets.arr[i]; if (!b.active) continue;
      if (b.kind === 'needle') { // size floor: a lethal needle is a 7px-wide streak with a >=2px hot core
        ctx.strokeStyle = C.rose; ctx.lineWidth = 7; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(b.x, b.y); ctx.lineTo(b.x - b.vx * 1.3, b.y - b.vy * 1.3); ctx.stroke();
        ctx.fillStyle = C.roseCore; ctx.beginPath(); ctx.arc(b.x, b.y, 3, 0, U.TAU); ctx.fill(); continue; }
      const spr = b.kind === 'ghost' ? ghost : rose;
      ctx.drawImage(spr, b.x - spr.width / 2, b.y - spr.height / 2);
    }
  }
  function drawPlayer() {
    // Only the COSMETIC craft (aura/wings/graze-ring/focus ticks) blinks to signal i-frames.
    const blink = player.iframes > 0 && (frame % 6 < 3);
    if (!blink) {
      ctx.save(); ctx.globalCompositeOperation = 'lighter';
      const g = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, CFG.SHIP_BODY_RADIUS);
      g.addColorStop(0, U.rgba(U.hex2rgb(C.halo), 0.6)); g.addColorStop(1, U.rgba(U.hex2rgb(C.halo), 0));
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(player.x, player.y, CFG.SHIP_BODY_RADIUS, 0, U.TAU); ctx.fill();
      ctx.restore();
      ctx.strokeStyle = U.rgba(U.hex2rgb(C.halo), player.focus ? 0.7 : 0.22); ctx.lineWidth = player.focus ? 1.5 : 3;
      ctx.beginPath(); ctx.arc(player.x, player.y, CFG.GRAZE_BAND_OUTER, 0, U.TAU); ctx.stroke();
      if (player.focus) { ctx.fillStyle = C.core; const tt = frame * 0.15;
        for (let k = 0; k < 2; k++) { const a = tt + k * Math.PI; ctx.beginPath(); ctx.arc(player.x + Math.cos(a) * 10, player.y + Math.sin(a) * 10, 1.6, 0, U.TAU); ctx.fill(); } }
    }
    // CORE — ALWAYS drawn, last, full chroma, constant size. The pip must never be lost (§9.4 "the core always wins").
    const cg = ctx.createRadialGradient(player.x, player.y, 0, player.x, player.y, 8);
    cg.addColorStop(0, C.core); cg.addColorStop(1, U.rgba(U.hex2rgb(C.core), 0));
    ctx.fillStyle = cg; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, U.TAU); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x, player.y, 2.4, 0, U.TAU); ctx.fill();
    ctx.fillStyle = C.core; ctx.beginPath(); ctx.arc(player.x, player.y, CFG.HITBOX_RADIUS + 0.5, 0, U.TAU); ctx.fill();
  }

  function drawHUD(warm, uni) {
    ctx.save();
    // closeness meter — left edge
    const mx = 24, my0 = H - 60, mh = H - 200;
    ctx.fillStyle = U.rgba(U.hex2rgb(C.ash), 0.5); ctx.fillRect(mx, my0 - mh, 10, mh);
    const cl = mode === 'run' ? Conductor.closeness : 0;
    ctx.fillStyle = C.hud; ctx.fillRect(mx, my0 - mh * cl, 10, mh * cl);
    if (uni > 0) { ctx.fillStyle = C.gold; ctx.fillRect(mx, my0 - mh - 14 * uni, 10, 14 * uni); }
    // multiplier
    ctx.font = '600 22px Georgia, serif'; ctx.textBaseline = 'top';
    ctx.fillStyle = uni > 0 ? C.gold : C.hud; ctx.fillText('×' + (mode === 'run' ? Conductor.mult() : 1).toFixed(1), mx + 20, my0 - mh - 4);
    // score top-right
    ctx.textAlign = 'right'; ctx.fillStyle = C.hud; ctx.font = '600 26px Georgia, serif';
    ctx.fillText(score.toLocaleString(), W - 24, 20); ctx.textAlign = 'left';
    // beats top-left
    for (let i = 0; i < CFG.PLAYER_HP; i++) { ctx.fillStyle = i < player.hp ? C.core : U.rgba(U.hex2rgb(C.ash), 0.6);
      ctx.beginPath(); ctx.arc(34 + i * 20, 30, 5, 0, U.TAU); ctx.fill(); }
    ctx.restore();
  }
  function drawLabel() {
    const a = Math.min(1, labelTimer / 30) * Math.min(1, (150 - labelTimer) / 20);
    ctx.save(); ctx.globalAlpha = Math.max(0, a); ctx.fillStyle = C.hud; ctx.font = '300 40px Georgia, serif';
    ctx.textAlign = 'center'; ctx.fillText(labelText, W / 2, H - 90); ctx.restore(); ctx.textAlign = 'left';
  }

  // ========== SCREENS ==========
  function showScreen(name) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('on'));
    if (name) { const el = document.getElementById('scr-' + name); if (el) el.classList.add('on'); }
    if (name === 'victory') {
      document.getElementById('vic-title').textContent = victoryType === 'true' ? 'You stayed close enough. The song finished.' : 'The song ended. You were close.';
      document.getElementById('vic-score').textContent = 'Score  ' + score.toLocaleString();
    }
  }

  // ========== BOOT ==========
  function boot() {
    cv = document.getElementById('game'); ctx = cv.getContext('2d', { alpha: false });
    Input.bind(cv); bakeSprites();
    // wire buttons
    const on = (id, fn) => { const e = document.getElementById(id); if (e) e.addEventListener('click', () => { AUDIO.init(); AUDIO.resume(); fn(); }); };
    on('btn-begin', start); on('btn-again', () => { player.hp = CFG.PLAYER_HP; enterStage(stageIdx); mode = 'run'; AUDIO.startRun(); showScreen(null); });
    on('vic-again', start); on('btn-leave', reset); on('vic-leave', reset);
    addEventListener('keydown', (e) => {
      if ((e.key === 'Escape' || e.key === 'p') && mode === 'run') { paused = true; mode = 'pause'; showScreen('pause'); }
      else if ((e.key === 'Escape' || e.key === 'p') && mode === 'pause') { paused = false; mode = 'run'; showScreen(null); }
      if ((e.key === 'Enter' || e.key === ' ' || e.key === 'z') && mode === 'title') { AUDIO.init(); AUDIO.resume(); start(); }
    });
    showScreen('title');
    let acc = 0, last = performance.now();
    function loop(t) {
      const dtr = Math.min(0.05, (t - last) / 1000); last = t; acc += dtr;
      if (!paused && mode !== 'pause') { let steps = 0; while (acc >= DT && steps < 6) { stepSim(); acc -= DT; steps++; } }
      else acc = 0;
      render(t);
      requestAnimationFrame(loop);
    }
    requestAnimationFrame(loop);
  }

  // enterStage bookkeeping: track stage-local start frame
  const _enterStage = enterStage;
  enterStage = function (i, silent) { _enterStage(i, silent); stageFrame = 0; };

  // ========== DEBUG / TEST API ==========
  const api = {
    start, reset, boot,
    step(n = 1) { for (let k = 0; k < n; k++) stepSim(); },
    setPaused(b) { paused = !!b; },
    setSeed(n) { U.setSeed(n); },
    jumpToMovement(idx) { if (mode !== 'run') start();
      const map = { cadence: 3 }; let i = typeof idx === 'string' ? map[idx] : [0, 1, 2, 4, 5][idx];
      if (i == null) i = 0; enterStage(i); },
    getMovement() { return { index: stage().mvt, name: stage().name, gaugePct: +(stageGauge / stage().gauge).toFixed(3), elapsedMs: Math.round(stageFrame / 60 * 1000) }; },
    setCloseness(v) { Conductor.closeness = v; },
    getCloseness() { return { closeness: +Conductor.closeness.toFixed(3), unison: +Conductor.unison.toFixed(3), mult: +Conductor.mult().toFixed(2), fireIntervalMs: Math.round(Conductor.fireIntervalMs()), warmth: +Conductor.warmth().toFixed(3), grazingNow: lastScan.grazing, bulletsInBand: lastScan.inBand }; },
    setUnison(v) { Conductor.unison = v; },
    godmode(b) { godMode = !!b; },
    setPlayer(x, y) { player.x = player.px = x; player.y = player.py = y; },
    getPlayer() { return { x: player.x, y: player.y, hp: player.hp, iframesMs: Math.round(player.iframes / 0.06), focus: player.focus, firing: player.firing }; },
    setFocus(b) { Input.inject(Object.assign(curIntent(), { focus: !!b })); },
    setFiring(b) { Input.inject(Object.assign(curIntent(), { fire: !!b })); },
    input(o) { Input.inject(o); },
    clearInput() { Input.clearInject(); },
    killPlayer() { player.iframes = 0; onPlayerHit(); },
    spawnPattern(name, opts) { return Patterns.spawn(name, { pool: bullets, partner, player }, opts); },
    clearBullets() { bullets.clear(); },
    getBulletCount() { return bullets.live; },
    getBullets() { const o = []; for (let i = 0; i < bullets.cap; i++) { const b = bullets.arr[i]; if (b.active) o.push({ x: b.x, y: b.y, vx: b.vx, vy: b.vy, r: b.r, kind: b.kind }); } return o; },
    bulletCap() { return CFG.BULLET_CAP; },
    seedGhost(arr) { ghostBuf = arr.slice(); },
    getGhostBufferLen() { return ghostBuf.length; },
    harmonize() { doHarmonize(); },
    getHarmonizeState() { return { lockoutMs: Math.round(harmonize.lock / 0.06), iframesMs: Math.round(player.iframes / 0.06), sparks: sparks.arr.filter(s => s.active).length }; },
    audio: { mute(b) { AUDIO.setMute(!!b); }, getLayerGains() { return AUDIO.getLayerGains(); }, forceStinger(v) { AUDIO.stinger(v || 'normal'); }, isSilent() { return AUDIO.isSilent(); } },
    getState() { return { mode, movement: stage().mvt, stage: stage().key, closeness: +Conductor.closeness.toFixed(3), unison: +Conductor.unison.toFixed(3), hp: player.hp, score, mult: +Conductor.mult().toFixed(2), bulletCount: bullets.live, warmth: +Conductor.warmth().toFixed(3), cameraZoom: +camZoom.toFixed(3), musicLayers: AUDIO.getLayerGains(), victoryType: mode === 'victory' ? victoryType : null }; },
    getFrame() { return frame; },
    onEvent(cb) { listeners.push(cb); },
    version: '1.0.0',
  };
  let godMode = false; let _curIntent = { dx: 0, dy: 0, focus: false, fire: false, bomb: false };
  function curIntent() { return _curIntent; }
  // fold godmode into scan by wrapping onPlayerHit through iframes: use godMode flag in stepSim
  const _stepSim = stepSim;
  stepSim = function () {
    if (mode === 'run' && godMode) player.iframes = Math.max(player.iframes, 2); // never lethal, grazes still count
    _stepSim();
  };

  return api;
})();
