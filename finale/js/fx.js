// FINALE — screen feel. Shake, hitstop, bloom flashes, particles, banners, the 3-call bloom.
//
// This file is the tactility budget. Spec §3: "the pop of a fuse-kill = hitstop + flash + shake +
// the bandpass noise burst. Tune these four together; they are the entire game's tactility."
//
// TWO CONTRACTS THE INTEGRATOR MUST HONOUR:
//   1. game.js MUST call FX.update(dt) on EVERY rendered frame — including the frames where it is
//      skipping logic because FX.hitstopT > 0. FX.update is the only thing that counts hitstop down.
//      If you gate FX.update behind the hitstop check, the game freezes forever.
//   2. Draw order per frame:
//        world transform ON (translate by FX.shakeX/shakeY)
//          FX.drawUnder(ctx)      // bloom flashes + shockwave rings, UNDER the bullets
//          ...bullets, fuse rings...
//          FX.drawParticles(ctx)  // layer 5 per spec §12.4
//        world transform OFF
//        FX.applyBloom(ctx)       // 3 drawImage calls, reads the finished frame
//        FX.drawOver(ctx)         // banner / tier vignette / hitstop veil — screen space, HUD-level
//      drawOver and applyBloom reset the transform themselves, so it is safe either way.
//
// ZERO ALLOCATION: everything is preallocated at module scope. The only strings built at runtime are
// particle colours, and those are memoised in a Map that saturates after the first few seconds.
window.FX = (() => {
  let env = null;                       // { bul, player, emit } — stored for future use, not required

  // ---------------------------------------------------------------------------------------------
  // PARTICLES
  // ---------------------------------------------------------------------------------------------
  const P = Pool.makeParticles(CFG.PARTICLE_CAP);
  let softCap = CFG.PARTICLE_CAP;       // lowered by the quality ladder; never lowers bullet counts

  // Preallocated colour triples. Allocated ONCE at boot — never inside a loop.
  const RGB_MINE_A = U.hex2rgb(CFG.COL.mineA);      // #5FF7FF — your petals, chain stage 0
  const RGB_MINE_B = U.hex2rgb(CFG.COL.mineB);      // #B8FFEA — chain stage 1
  const RGB_DANGER = U.hex2rgb(CFG.COL.danger);     // #FF2D6F — a red bloom throws magenta sparks
  const RGB_ENEMY = U.hex2rgb(CFG.COL.enemyTrim);   // #E9A8FF — enemy hull debris on a normal kill
  const RGB_SHIP = U.hex2rgb('#6FF3FF');            // ship wing cyan — the death burst is YOUR colour
  const RGB_RING = U.hex2rgb('#00E5FF');            // hitbox ring cyan
  const RGB_EMBER = U.hex2rgb(CFG.COL.accent);      // #FFD166 — slow falling embers, the "firework ash"

  // rgb -> 'rgb(r,g,b)' memo. Keyed by a packed 24-bit int so Map.get never allocates.
  const colCache = new Map();
  function colStr(r, g, b) {
    const k = (r << 16) | (g << 8) | b;
    let s = colCache.get(k);
    if (s === undefined) { s = 'rgb(' + r + ',' + g + ',' + b + ')'; colCache.set(k, s); }
    return s;
  }

  // The one public spawn. Everything else in this file routes through it so the soft cap is honoured.
  function particle(x, y, vx, vy, life, size, rgb, drag) {
    if (P.n >= softCap) return -1;      // drop silently: particles are decoration, never load-bearing
    return P.spawn(x, y, vx, vy, life, size, rgb, drag);
  }

  // ---------------------------------------------------------------------------------------------
  // SHAKE — a damped 2D spring. Additive, hard-clamped, NEVER rotational (spec §3).
  // ---------------------------------------------------------------------------------------------
  let shX = 0, shY = 0, shVx = 0, shVy = 0;
  let shakeScale = 1;                   // options slider 0..1; 0 = fully off for motion-sensitive players
  const SHAKE_SPRING = 1400;            // 1/s^2 -> omega ~37.4 rad/s ~6 Hz. Fast enough to read as an
                                        // impact, slow enough that the offset survives ~3 frames.
  const SHAKE_IMPULSE_V = 34;           // px/s per px of desired amplitude (~= omega), so shake(m)
                                        // peaks at roughly m px before the cap bites.

  function shake(mag) {
    if (mag <= 0 || shakeScale <= 0) return;
    const a = U.rngFx.next() * U.TAU;   // COSMETIC rng only — shake must never touch the run stream
    const v = mag * SHAKE_IMPULSE_V * shakeScale;
    shVx += U.fcos(a) * v;
    shVy += U.fsin(a) * v;
  }

  function updateShake(dt) {
    shVx -= SHAKE_SPRING * shX * dt;
    shVy -= SHAKE_SPRING * shY * dt;
    const d = Math.pow(CFG.SHAKE_DECAY, dt * 60);   // CFG.SHAKE_DECAY is per-TICK; normalise to dt
    shVx *= d; shVy *= d;
    shX += shVx * dt; shY += shVy * dt;
    // hard clamp on TOTAL offset, not per-axis: a diagonal hit must not sneak past 10px (spec §3)
    const m2 = shX * shX + shY * shY, cap = CFG.SHAKE_CAP;
    if (m2 > cap * cap) { const k = cap / Math.sqrt(m2); shX *= k; shY *= k; }
    // settle to exact zero so the world stops sub-pixel jittering forever after a big hit
    if (m2 < 0.0004 && shVx * shVx + shVy * shVy < 0.25) { shX = 0; shY = 0; shVx = 0; shVy = 0; }
  }

  // ---------------------------------------------------------------------------------------------
  // HITSTOP — a plain accumulating float. game.js owns the tick-skipping; this only counts down.
  // ---------------------------------------------------------------------------------------------
  let hitstopT = 0;
  const HITSTOP_CAP = 0.40;             // s. Just above CFG.MISFIRE_HITSTOP (0.35) — a cascade that
                                        // stacks ten fuse-kills in one tick must not freeze the game.
  function hitstop(sec) {
    if (sec <= 0) return;
    hitstopT += sec;
    if (hitstopT > HITSTOP_CAP) hitstopT = HITSTOP_CAP;
  }

  // ---------------------------------------------------------------------------------------------
  // BLOOM FLASHES — SoA, swap-remove, no objects. Spec §3: filled circle r = 18 + 1.4*petalCount,
  // alpha 0.9, shrinking to 0 over 6 ticks, drawn in 'lighter'.
  // ---------------------------------------------------------------------------------------------
  const FLASH_CAP = 48;                 // one cascade tick can pop ~40 blooms; past that they overlap
                                        // into one white disc anyway, so more would be invisible cost.
  const fX = new Float32Array(FLASH_CAP), fY = new Float32Array(FLASH_CAP);
  const fR = new Float32Array(FLASH_CAP), fAge = new Float32Array(FLASH_CAP);
  const fBlue = new Uint8Array(FLASH_CAP);
  let fN = 0;
  const FLASH_CORE_TICKS = 6;           // spec: the white core dies over exactly 6 ticks (0.10s)
  const FLASH_RING_TICKS = 13;          // the shockwave ring outlives the core so the eye tracks outward

  let flashLevel = 0;                   // 0..1 "how hard did the sky just flash" — skyline/crowd rim-light

  function bloomFlash(x, y, petalCount, isBlue) {
    if (fN < FLASH_CAP) {
      const i = fN++;
      fX[i] = x; fY[i] = y;
      fR[i] = 18 + 1.4 * petalCount;    // spec §3, verbatim
      fAge[i] = 0; fBlue[i] = isBlue ? 1 : 0;
    }
    // sky flash for the skyline/crowd to sample. A 60-petal MORTAR bloom lights the whole city.
    const lvl = Math.min(1, 0.28 + petalCount * 0.011);
    if (isBlue && lvl > flashLevel) flashLevel = lvl;

    // spark ring. Cheap spectacle, and it gives the bloom wind something to blow around.
    const n = Math.min(14, 4 + (petalCount >> 2));   // 14 max: past that it reads as noise, not petals
    const rgb = isBlue ? (petalCount >= 24 ? RGB_MINE_B : RGB_MINE_A) : RGB_DANGER;
    const base = U.rngFx.next() * U.TAU;
    for (let k = 0; k < n; k++) {
      const a = base + k / n * U.TAU;
      const sp = 150 + U.rngFx.next() * 190;         // 150..340 px/s: outruns the petals for ~4 frames
      particle(x, y, U.fcos(a) * sp, U.fsin(a) * sp,
               0.30 + U.rngFx.next() * 0.28,          // 0.30..0.58s — gone before the next chain link
               2.0 + U.rngFx.next() * 1.6, rgb, 0.90);
    }
  }

  // One-tick radial impulse on particles only (spec §3). Zero gameplay cost, by construction.
  function wind(x, y) { P.wind(x, y, CFG.BLOOM_WIND_R, CFG.BLOOM_WIND_V); }

  // ---------------------------------------------------------------------------------------------
  // BURSTS
  // ---------------------------------------------------------------------------------------------
  // A normal (non-fuse) enemy kill. Deliberately small and purple: it must read as "wasted powder"
  // next to a bloom, because that is exactly what it is.
  function puff(x, y, r) {
    const n = Math.min(16, 6 + ((r * 0.5) | 0));
    for (let k = 0; k < n; k++) {
      const a = U.rngFx.next() * U.TAU;
      const sp = 40 + U.rngFx.next() * 110;          // slow: half a bloom's spark speed
      particle(x, y, U.fcos(a) * sp, U.fsin(a) * sp,
               0.26 + U.rngFx.next() * 0.30, 1.6 + U.rngFx.next() * 1.4, RGB_ENEMY, 0.88);
    }
  }

  // Player death. Your own colours, thrown wide, with slow embers that hang for the respawn beat.
  function deathBurst(x, y) {
    for (let k = 0; k < 44; k++) {                   // 44: the biggest burst in the game, once per life
      const a = U.rngFx.next() * U.TAU;
      const sp = 90 + U.rngFx.next() * 330;
      particle(x, y, U.fcos(a) * sp, U.fsin(a) * sp,
               0.45 + U.rngFx.next() * 0.55, 2.0 + U.rngFx.next() * 2.4,
               k & 1 ? RGB_SHIP : RGB_RING, 0.93);
    }
    for (let k = 0; k < 14; k++) {                   // embers: fall for ~1.4s, the visual "ash" of a dud
      const a = U.rngFx.next() * U.TAU;
      const sp = 20 + U.rngFx.next() * 60;
      particle(x, y, U.fcos(a) * sp, U.fsin(a) * sp + 30,
               1.0 + U.rngFx.next() * 0.6, 1.4 + U.rngFx.next(), RGB_EMBER, 0.985);
    }
    shX = 0; shY = 0;                                // reset the spring so death's shake(10) is clean
  }

  // ---------------------------------------------------------------------------------------------
  // BANNER — 1.4s, 28px letterspaced caps at (640, 96), white, then fades.
  // Letter offsets are measured ONCE per banner (a rare event) and cached; zero measureText per frame.
  // ---------------------------------------------------------------------------------------------
  const BANNER_MAX = 40;                             // longest real string is a boss phase name
  const banOff = new Float32Array(BANNER_MAX);
  let banText = '', banLen = 0, banW = 0, banT = 0;
  const BANNER_TIME = 1.4;                           // s, spec §11 (boss phase / stagger callouts)
  const BANNER_IN = 0.10;                            // s snap-in: a banner must never feel like a fade-in
  const BANNER_OUT = 0.40;                           // s fade-out, long enough to not read as a cut
  const BANNER_FONT = '700 28px "Helvetica Neue", Helvetica, Arial, sans-serif';
  const BANNER_TRACK = 7;                            // px extra per character. Caps + tracking = marquee.
  let measCtx = null;

  function banner(text) {
    if (!text) return;
    ensure();
    const s = String(text).toUpperCase();
    banLen = Math.min(s.length, BANNER_MAX);
    banText = s.slice(0, banLen);
    measCtx.font = BANNER_FONT;
    let x = 0;
    for (let i = 0; i < banLen; i++) {
      banOff[i] = x;
      x += measCtx.measureText(banText.charAt(i)).width + BANNER_TRACK;
    }
    banW = x - BANNER_TRACK;                         // no trailing gap, or the centring drifts right
    banT = BANNER_TIME;
  }

  // ---------------------------------------------------------------------------------------------
  // TIER PULSE — 0.12s white vignette (spec §4). Stepped event, never a lerp.
  // ---------------------------------------------------------------------------------------------
  let pulseT = 0;
  const PULSE_TIME = 0.12;                           // s, spec §4 verbatim
  function tierPulse() { pulseT = PULSE_TIME; }

  // ---------------------------------------------------------------------------------------------
  // OFFSCREEN BUFFERS — baked once. Gradients are legal here; this runs at boot, not per frame.
  // ---------------------------------------------------------------------------------------------
  let vig = null;                                    // 320x180 vignette, upscaled when drawn (it is soft)
  let b1 = null, b1c = null;                         // 640x360 half-res bloom buffer
  let b2 = null, b2c = null;                         // 160x90 eighth-res bloom buffer
  let built = false;

  function ensure() {
    if (built) return;
    built = true;

    const m = document.createElement('canvas');
    m.width = m.height = 1;                          // measuring surface only — never drawn
    measCtx = m.getContext('2d');

    vig = document.createElement('canvas');
    vig.width = 320; vig.height = 180;
    const vc = vig.getContext('2d');
    // radius 190 > corner distance 183.6, so the corners reach full strength inside the canvas
    const g = vc.createRadialGradient(160, 90, 40, 160, 90, 190);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.05)');  // near-zero through the play area: never hide bullets
    g.addColorStop(1, 'rgba(255,255,255,0.90)');
    vc.fillStyle = g; vc.fillRect(0, 0, 320, 180);

    b1 = document.createElement('canvas'); b1.width = 640; b1.height = 360;
    b2 = document.createElement('canvas'); b2.width = 160; b2.height = 90;
    b1c = b1.getContext('2d'); b2c = b2.getContext('2d');
    // 'copy' means we never need a clearRect: each frame's drawImage fully replaces the buffer.
    b1c.globalCompositeOperation = 'copy'; b2c.globalCompositeOperation = 'copy';
    b1c.imageSmoothingEnabled = true; b2c.imageSmoothingEnabled = true;
    b1c.imageSmoothingQuality = 'low'; b2c.imageSmoothingQuality = 'low';
  }

  // ---------------------------------------------------------------------------------------------
  // THE CHEAP BLOOM — spec §12.5, EXACTLY three drawImage calls, no ctx.filter, ever.
  //
  //   FX.applyBloom(mainCtx):
  //     1. main 1280x720  ->  b1 640x360    (downscale the finished frame)
  //     2. b1   640x360   ->  b2 160x90     (downscale again; this is the blur)
  //     3. b2   160x90    ->  main          globalAlpha 0.55, 'lighter', smoothing on
  //
  // The dark sky (#070912) contributes almost nothing under 'lighter', so the bright cores — petals,
  // fuse rings, flashes — are what actually blooms. That is why we can skip a bright-pass extraction
  // and still spend only three calls.
  //
  // FX.bloomBegin(ctx) / FX.bloomEnd(ctx) are aliases: bloomBegin is a no-op (nothing to set up,
  // we read the finished frame), bloomEnd === applyBloom. Call whichever pair your renderer prefers.
  // ---------------------------------------------------------------------------------------------
  let bloomOn = true;

  function applyBloom(mainCtx) {
    if (!bloomOn || !mainCtx) return;
    ensure();
    const src = mainCtx.canvas;
    b1c.drawImage(src, 0, 0, CFG.W, CFG.H, 0, 0, 640, 360);
    b2c.drawImage(b1, 0, 0, 640, 360, 0, 0, 160, 90);
    mainCtx.save();
    mainCtx.setTransform(1, 0, 0, 1, 0, 0);          // immune to an active screenshake translate
    mainCtx.globalCompositeOperation = 'lighter';
    mainCtx.globalAlpha = 0.55;                      // spec §12.5 verbatim
    mainCtx.imageSmoothingEnabled = true;
    mainCtx.drawImage(b2, 0, 0, 160, 90, 0, 0, CFG.W, CFG.H);
    mainCtx.restore();
  }
  function bloomBegin() { /* no-op: the bloom reads the finished frame, nothing to set up */ }

  // ---------------------------------------------------------------------------------------------
  // QUALITY LADDER — spec §12.9. NEVER touches bullet counts; gameplay is identical at every level.
  //   0 = full   1 = bloom off   2 = + particle cap 400   3 = + trails off
  // ---------------------------------------------------------------------------------------------
  let quality = 0;
  let trails = true;

  function setQuality(level) {
    quality = level < 0 ? 0 : level > 3 ? 3 : level | 0;
    bloomOn = quality < 1;
    softCap = quality >= 2 ? 400 : CFG.PARTICLE_CAP;   // 400 = spec's second rung
    trails = quality < 3;
    while (P.n > softCap) P.kill(P.n - 1);              // shed instantly, don't wait for them to expire
  }

  // ---------------------------------------------------------------------------------------------
  // LIFECYCLE
  // ---------------------------------------------------------------------------------------------
  function bind(e) { env = e; }

  function reset() {
    P.clear();
    fN = 0;
    shX = shY = shVx = shVy = 0;
    hitstopT = 0;
    banT = 0; banText = ''; banLen = 0; banW = 0;
    pulseT = 0;
    flashLevel = 0;
    // quality is NOT reset: it is a machine capability, not run state.
  }

  function update(dt) {
    // Hitstop freezes the world but not the impact wobble — the shake is what sells the freeze.
    updateShake(dt);
    if (hitstopT > 0) {
      hitstopT -= dt;
      if (hitstopT < 0) hitstopT = 0;
      return;                                        // everything else is frozen mid-air, on purpose
    }

    P.update(dt);

    // flashes
    const step = dt * 60;                            // ages are in TICKS: the spec quotes 6 ticks, not ms
    let i = 0;
    while (i < fN) {
      fAge[i] += step;
      if (fAge[i] >= FLASH_RING_TICKS) {
        const last = --fN;
        if (i !== last) {
          fX[i] = fX[last]; fY[i] = fY[last]; fR[i] = fR[last];
          fAge[i] = fAge[last]; fBlue[i] = fBlue[last];
        }
        continue;
      }
      i++;
    }

    if (banT > 0) { banT -= dt; if (banT < 0) banT = 0; }
    if (pulseT > 0) { pulseT -= dt; if (pulseT < 0) pulseT = 0; }
    if (flashLevel > 0) {
      flashLevel -= dt * 4.5;                        // ~0.22s to fall from full: one bloom, one flash
      if (flashLevel < 0) flashLevel = 0;
    }
  }

  // ---------------------------------------------------------------------------------------------
  // DRAW — UNDER the bullets: the bloom cores and their shockwave rings.
  // arc()+fill() is legal here: at most 48 of these per frame, versus 2300 bullets. The ban is on
  // per-BULLET arcs and gradients, and this respects it.
  // ---------------------------------------------------------------------------------------------
  function drawUnder(ctx) {
    if (fN === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    // cores first, so a later bloom's ring never gets buried under an earlier bloom's disc
    for (let i = 0; i < fN; i++) {
      const a = fAge[i];
      if (a >= FLASH_CORE_TICKS) continue;
      const k = a / FLASH_CORE_TICKS;
      const r = fR[i] * (1 - k);                     // spec: shrinking to 0 over 6 ticks
      if (r <= 0.5) continue;
      ctx.globalAlpha = 0.9 * (1 - k * 0.35);        // spec alpha 0.9; the small taper stops a hard pop
      // Colour law: a BLUE bloom is one of the four legal pure whites ("act now" — you just won).
      // A RED bloom flashes magenta, because a failure must never wear the white of success.
      ctx.fillStyle = fBlue[i] ? '#FFFFFF' : CFG.COL.danger;
      ctx.beginPath(); ctx.arc(fX[i], fY[i], r, 0, U.TAU); ctx.fill();
    }
    // shockwave rings: the eye follows them outward and finds the petals that just spawned
    for (let i = 0; i < fN; i++) {
      const k = fAge[i] / FLASH_RING_TICKS;
      const r = fR[i] * (0.55 + 2.1 * k);            // expands to ~2.65x the core: reads past the petals
      ctx.globalAlpha = 0.45 * (1 - k) * (1 - k);    // squared: bright snap, quiet tail
      ctx.strokeStyle = fBlue[i] ? CFG.COL.mineA : CFG.COL.danger;
      ctx.lineWidth = 0.8 + 3.2 * (1 - k);
      ctx.beginPath(); ctx.arc(fX[i], fY[i], r, 0, U.TAU); ctx.stroke();
    }
    ctx.restore();
  }

  // Particles: fillRect quads in 'lighter'. No arcs, no gradients, no per-particle string building.
  function drawParticles(ctx) {
    const n = P.n;
    if (n === 0) return;
    const px = P.x, py = P.y, pa = P.age, pl = P.life, ps = P.size;
    const pr = P.cr, pg = P.cg, pb = P.cb;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    let lastKey = -1;
    for (let i = 0; i < n; i++) {
      const t = pa[i] / pl[i];
      const k = (pr[i] << 16) | (pg[i] << 8) | pb[i];
      if (k !== lastKey) { ctx.fillStyle = colStr(pr[i], pg[i], pb[i]); lastKey = k; }
      ctx.globalAlpha = 1 - t * t;                   // holds bright, then drops fast — sparks, not smoke
      const s = ps[i] * (1 - t * 0.45);              // shrink a little so the tail thins as it dims
      ctx.fillRect(px[i] - s * 0.5, py[i] - s * 0.5, s, s);
    }
    ctx.restore();
  }

  // OVER the bullets: hitstop veil, tier vignette, banner. Screen space — transform is reset here.
  function drawOver(ctx) {
    if (hitstopT <= 0 && pulseT <= 0 && banT <= 0) return;
    ensure();
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);

    // hitstop veil — spec §3: "frozen logic, still rendering + white overlay at 12% alpha"
    if (hitstopT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, CFG.W, CFG.H);
    }

    // tier-up vignette pulse — spec §4: 0.12s of white vignette, a stepped event
    if (pulseT > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * (pulseT / PULSE_TIME);
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(vig, 0, 0, 320, 180, 0, 0, CFG.W, CFG.H);
    }

    // banner
    if (banT > 0 && banLen > 0) {
      const el = BANNER_TIME - banT;
      let a = 1;
      if (el < BANNER_IN) a = el / BANNER_IN;
      else if (banT < BANNER_OUT) a = banT / BANNER_OUT;
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = a;
      ctx.font = BANNER_FONT;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#FFFFFF';                     // HUD text: a legal pure white
      const x0 = 640 - banW * 0.5, y0 = 96;          // spec §11 position
      for (let i = 0; i < banLen; i++) ctx.fillText(banText.charAt(i), x0 + banOff[i], y0);
      // a hairline rule that draws itself out under the text — the "curtain up" tell
      const w = banW * Math.min(1, el / 0.28);       // 0.28s sweep: finishes well before the fade starts
      ctx.globalAlpha = a * 0.55;
      ctx.fillRect(640 - w * 0.5, y0 + 10, w, 1);
    }

    ctx.restore();
  }

  return {
    bind, reset, update,
    shake, hitstop, bloomFlash, wind, puff, deathBurst, banner, tierPulse, particle,
    drawUnder, drawOver, drawParticles,
    applyBloom, bloomBegin, bloomEnd: applyBloom,
    setQuality,
    ensure,                                          // optional: call at boot to bake buffers off the clock
    get hitstopT() { return hitstopT; },
    get shakeX() { return shX; },
    get shakeY() { return shY; },
    get quality() { return quality; },
    get trails() { return trails; },                 // player.js reads this for the 6-segment ribbon
    get bloomOn() { return bloomOn; },
    get particleCount() { return P.n; },
    get particleCap() { return softCap; },
    get flashLevel() { return flashLevel; },         // skyline/crowd rim-light samples the last bloom
    get shakeScale() { return shakeScale; },
    set shakeScale(v) { shakeScale = U.clamp(v, 0, 1); },   // options menu, screenshake 0–100%
  };
})();
