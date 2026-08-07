// FINALE — HUD. The whole readout is four numbers and a gauge, and it lives at the four EDGES.
//
// THE LAW OF THIS FILE: the play centre is sacred. Nothing here may draw inside the box
// (x 200..1080, y 120..640) except the chain number, which is pinned to the ship and is small,
// short-lived, and the one piece of feedback that must be where your eyes already are.
//
// PERF: zero ctx.measureText in the draw path. Digit cell widths are measured ONCE at boot on an
// offscreen context; everything else is drawn with textAlign 'center'/'right', which needs no
// measurement at all. Zero allocation per frame: no string concatenation, no `String(n)`, no array
// literals. Digits come out of a preallocated Int32Array and a table of single-glyph strings.
window.HUD = (() => {
  'use strict';
  const W = CFG.W, H = CFG.H, C = CFG.COL;

  // ---- fonts ------------------------------------------------------------------------------
  // System stack ONLY. No webfont means glyph metrics are final at boot, which is the whole reason
  // a single boot-time measure is safe forever after.
  const STACK = 'system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
  const F_SCORE = '600 24px ' + STACK;   // 24px: spec §10. Big enough to read at arm's length, small enough to ignore.
  const F_TIER  = '700 14px ' + STACK;   // 14px caps at the right end of the applause bar.
  const F_CHAIN = '700 22px ' + STACK;   // 22px bold, scaled at draw time by 1 + chain/60.
  const F_WAVE  = '600 16px ' + STACK;   // wave caption.
  const F_ACT   = '600 12px ' + STACK;   // act caption, one step quieter than the wave.
  const LS_2 = '2px', LS_0 = '0px';      // letterspacing per spec; assigning a const string never allocates.

  // ---- preallocated glyph tables ------------------------------------------------------------
  const GLYPH = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
  const COMMA = ',';
  const CHAIN_MAX_STR = 100;                          // strings 0..99 prebuilt; above that we show '99+'
  const CHAIN_STR = new Array(CHAIN_MAX_STR);
  for (let i = 0; i < CHAIN_MAX_STR; i++) CHAIN_STR[i] = '' + i;
  const CHAIN_OVER = '99+';

  const SCORE_DIGITS = 8;                             // spec §10: 8 digits, comma-grouped
  const DIG = new Int32Array(SCORE_DIGITS);
  const SCORE_MAX = 99999999;                         // 8 digits; above this the field would jump width

  // ---- boot-time metrics (the ONLY measureText in this file) --------------------------------
  // Widest digit becomes the cell width for every digit, and each glyph is drawn CENTRED in its
  // cell. That is what makes the score tabular: 1 and 8 occupy identical space, so the number never
  // shimmers while it climbs.
  let DIGIT_W = 14, COMMA_W = 7;                      // fallbacks if no DOM (headless smoke tests)
  (function measureOnce() {
    if (typeof document === 'undefined') return;
    const mc = document.createElement('canvas').getContext('2d');
    if (!mc) return;
    mc.font = F_SCORE;
    let w = 0;
    for (let i = 0; i < 10; i++) { const m = mc.measureText(GLYPH[i]).width; if (m > w) w = m; }
    if (w > 0) DIGIT_W = w;
    const cw = mc.measureText(COMMA).width;
    if (cw > 0) COMMA_W = cw;
  })();

  // ---- layout constants ---------------------------------------------------------------------
  const SCORE_X = 24, SCORE_Y = 22;                   // spec §10 anchor, textBaseline 'top'
  const LEAD_ZERO_A = 0.14;                           // leading zeros stay visible as a tabular ghost, not as a number

  const BAR_H = 4;                                    // spec §10: 4px along the bottom edge
  const BAR_Y = H - BAR_H;
  const SEG_N = 5;                                    // one segment per CFG.TIERS entry — the gauge IS the tier ladder
  const SEG_GAP = 2;                                  // px between segments: enough to read as discrete blocks, not a fill
  const SEG_W = (W - SEG_GAP * (SEG_N - 1)) / SEG_N;  // 254.4px
  const CHARGE_STEPS = 8;                             // within-tier progress is QUANTISED to 8 notches so it ticks, never slides
  const PULSE_TIME = 0.30;                            // s. A tier change is an EVENT: snap + pulse, then gone.
  const PULSE_RISE = 5;                               // px of extra bar height at peak pulse (4 -> 9)
  const TIER_X = W - 14, TIER_Y = H - 10;             // right-aligned tier name, sitting on top of the bar

  const LIFE_X = W - 24, LIFE_Y = 22;                 // top-right, right-to-left
  const LIFE_STEP = 21;                               // px between shell icons
  const LIFE_SLOTS_CAP = 6;                           // NOVICE grants 5; 6 is the widest row we will ever draw

  const MF_X = 24, MF_Y = H - 26;                     // bottom-left, clear of the 4px applause bar
  const MF_STEP = 17;                                 // px between misfire diamonds
  const MF_R = 6;                                     // diamond half-height

  const CAP_ACT_Y = 62, CAP_WAVE_Y = 84;              // top-centre, 60px clear of the 3px boss HP bar at y=0
  const CAP_TIME = 1.6;                               // s total caption life (spec)
  const CAP_IN = 0.18;                                // s fade in — fast, so it never reads as a loading screen
  const CAP_OUT = 0.45;                               // s fade out

  const CHAIN_DY = -34;                               // px above the ship (spec §10)
  const CHAIN_FADE = 0.35;                            // s of fade at the tail...
  const CHAIN_HOLD = 0.60;                            // ...inside a 0.60s life, so it holds solid for 0.25s then dies
  const CHAIN_POP = 0.28;                             // extra scale on a fresh link. Small: the number must not become the game.
  const CHAIN_MIN_SHOW = 2;                           // a "chain of 1" is just a kill — don't label it

  // ---- state (all scalars; nothing here allocates) -------------------------------------------
  let pulseT = 0, pulseUp = false;
  let lastTier = 0;
  let tierStr = CFG.TIERS[0][2];                      // cached on tier change so draw never touches CFG.TIERS

  let chainShown = 0, chainHold = 0, chainPop = 0, lastChain = 0;

  let capT = 0, capAct = '', capWave = '';
  let lastWave = '', lastAct = -1;

  let lastLives = -1, livesPop = 0;
  let lastMisfires = -1, mfPop = 0;

  function reset() {
    pulseT = 0; pulseUp = false;
    lastTier = 0; tierStr = CFG.TIERS[0][2];
    chainShown = 0; chainHold = 0; chainPop = 0; lastChain = 0;
    capT = 0; capAct = ''; capWave = '';
    lastWave = ''; lastAct = -1;
    lastLives = -1; livesPop = 0;
    lastMisfires = -1; mfPop = 0;
  }

  function update(dt) {
    if (pulseT > 0) pulseT -= dt;
    if (chainHold > 0) chainHold -= dt;
    if (chainPop > 0) chainPop = Math.max(0, chainPop - dt * 6);   // ~0.17s pop decay: one frame-ish of punch, no wobble
    if (capT > 0) capT -= dt;
    if (livesPop > 0) livesPop = Math.max(0, livesPop - dt * 3);   // ~0.33s: a life change deserves a beat longer than a chain link
    if (mfPop > 0) mfPop = Math.max(0, mfPop - dt * 4);
  }

  // ---- change detection ----------------------------------------------------------------------
  // Runs once per draw and only branches on ACTUAL changes. This is where the "cache on tier change"
  // rule lives: nothing below it ever measures or concatenates.
  function sync(st) {
    const t = st.tier | 0;
    if (t !== lastTier) {
      pulseUp = t > lastTier;
      lastTier = t;
      pulseT = PULSE_TIME;
      tierStr = st.tierName || CFG.TIERS[t][2];
    } else if (st.tierName && st.tierName !== tierStr) {
      tierStr = st.tierName;                          // defensive: tier name changed without the index moving
    }

    const ch = st.chain | 0;
    if (ch >= CHAIN_MIN_SHOW && ch !== lastChain) {
      chainShown = ch; chainHold = CHAIN_HOLD; chainPop = 1;
    }
    lastChain = ch;

    // A boss owns the centre channel via FX.banner — don't stack a second caption on top of it.
    if (st.bossActive) {
      capT = 0;
      lastWave = st.waveName || lastWave;             // swallow the boss's own wave change so it can't fire on exit
      lastAct = st.act | 0;
    } else {
      const wn = st.waveName;
      const ac = st.act | 0;
      if ((wn && wn !== lastWave) || ac !== lastAct) {
        lastWave = wn || lastWave;
        lastAct = ac;
        capAct = st.actName || '';
        capWave = wn || '';
        capT = CAP_TIME;
      }
    }

    const lv = st.lives | 0;
    if (lv !== lastLives) { if (lastLives >= 0) livesPop = 1; lastLives = lv; }
    const mf = st.misfires | 0;
    if (mf !== lastMisfires) { if (lastMisfires >= 0) mfPop = 1; lastMisfires = mf; }
  }

  // ---- pieces ---------------------------------------------------------------------------------

  // Score. Drawn glyph-by-glyph at fixed cell advances — tabular by construction, and it means a
  // score that ticks 999,999 -> 1,000,000 never shifts a single pixel of the rest of the row.
  function drawScore(ctx, score) {
    let v = score | 0;
    if (v < 0) v = 0; else if (v > SCORE_MAX) v = SCORE_MAX;
    for (let i = SCORE_DIGITS - 1; i >= 0; i--) { DIG[i] = v % 10; v = (v / 10) | 0; }

    let firstSig = SCORE_DIGITS - 1;                  // all-zero still shows one real '0'
    for (let i = 0; i < SCORE_DIGITS; i++) { if (DIG[i] !== 0) { firstSig = i; break; } }

    ctx.font = F_SCORE;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillStyle = C.ui;                             // HUD text is one of the four legal pure-whites

    let x = SCORE_X;
    for (let i = 0; i < SCORE_DIGITS; i++) {
      ctx.globalAlpha = i < firstSig ? LEAD_ZERO_A : 1;
      ctx.fillText(GLYPH[DIG[i]], x + DIGIT_W * 0.5, SCORE_Y);
      x += DIGIT_W;
      // 8 digits group as 2,3,3 — commas land after index 1 and index 4
      if (i === 1 || i === 4) {
        ctx.globalAlpha = i < firstSig ? LEAD_ZERO_A : 0.55;   // commas sit under the digits, never level with them
        ctx.fillText(COMMA, x + COMMA_W * 0.5, SCORE_Y);
        x += COMMA_W;
      }
    }
    ctx.globalAlpha = 1;
  }

  // The applause gauge. FIVE BLOCKS, not a fill. A DoDonPachi chain gauge: it lights a whole block or
  // it doesn't, and the partial charge into the next block is notched into 8 steps so the eye reads
  // "clicking up" rather than "drifting". Tier changes snap the height and flash a white lip.
  function drawApplause(ctx, applause, tier) {
    const pulse = pulseT > 0 ? pulseT / PULSE_TIME : 0;
    const h = BAR_H + PULSE_RISE * pulse * pulse;     // squared: the growth collapses fast, so it reads as a hit not a swell
    const y = H - h;

    // roofline seam: the gauge is meant to look like part of the city, not a bar bolted over it
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = C.blackout;
    ctx.fillRect(0, y - 1, W, 1);

    for (let i = 0; i < SEG_N; i++) {
      const sx = i * (SEG_W + SEG_GAP);
      ctx.globalAlpha = 1;
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.06;                         // unlit track: present, never competing
      ctx.fillRect(sx, y, SEG_W, h);

      if (i <= tier) {
        ctx.fillStyle = C.accent;                     // #FFD166 per spec
        ctx.globalAlpha = 0.88 + 0.12 * pulse;
        ctx.fillRect(sx, y, SEG_W, h);
      }
    }

    // partial charge into the NEXT block, quantised
    if (tier < SEG_N - 1) {
      const lo = CFG.TIERS[tier][0], hi = CFG.TIERS[tier + 1][0];
      let f = (applause - lo) / (hi - lo);
      if (f < 0) f = 0; else if (f > 1) f = 1;
      const notches = (f * CHARGE_STEPS) | 0;
      if (notches > 0) {
        const sx = (tier + 1) * (SEG_W + SEG_GAP);
        ctx.fillStyle = C.accent;
        ctx.globalAlpha = 0.30;                       // dim: this is "earning", not "earned"
        ctx.fillRect(sx, y, SEG_W * (notches / CHARGE_STEPS), h);
      }
    }

    // tier-UP lip. White, brief, sub-full-alpha: the legal "act now" flash, gone in 0.3s.
    if (pulse > 0 && pulseUp) {
      ctx.fillStyle = C.white;
      ctx.globalAlpha = 0.55 * pulse;
      ctx.fillRect(0, y - 1, W, 1.5);
    }

    ctx.font = F_TIER;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'alphabetic';
    ctx.letterSpacing = LS_2;
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = 0.75 + 0.25 * pulse;
    ctx.fillText(tierStr, TIER_X, TIER_Y - (h - BAR_H));
    ctx.letterSpacing = LS_0;
    ctx.globalAlpha = 1;
  }

  // A mortar shell: 8x11 body with a nose and a fuse stub. Vector, no text, no atlas — the HUD must
  // not depend on the bullet atlas being baked.
  function drawShell(ctx, x, y, filled, pop) {
    ctx.fillStyle = C.accent;
    ctx.globalAlpha = filled ? (0.90 + 0.10 * pop) : 0.15;
    ctx.beginPath();
    ctx.moveTo(x, y - 7);
    ctx.lineTo(x + 4, y - 2);
    ctx.lineTo(x + 4, y + 5);
    ctx.lineTo(x - 4, y + 5);
    ctx.lineTo(x - 4, y - 2);
    ctx.closePath();
    ctx.fill();
    if (filled) ctx.fillRect(x - 0.5, y - 11, 1, 3.5);   // fuse stub: an unspent shell still has one
  }

  function drawLives(ctx, lives) {
    let slots = CFG.LIVES;
    if (lives > slots) slots = lives;                 // NOVICE hands out 5 — never clip a life the player owns
    if (slots > LIFE_SLOTS_CAP) slots = LIFE_SLOTS_CAP;
    for (let i = 0; i < slots; i++) {
      const x = LIFE_X - i * LIFE_STEP;
      drawShell(ctx, x, LIFE_Y, i < lives, i === lives ? 0 : livesPop);
    }
    ctx.globalAlpha = 1;
  }

  // MISFIRE charges as diamonds — same silhouette as a petal, because that is literally what a
  // MISFIRE turns the screen into.
  function drawMisfires(ctx, misfires) {
    let slots = CFG.MISFIRE_MAX;                      // always show the ceiling so an empty slot is a visible debt
    if (misfires > slots) slots = misfires;
    for (let i = 0; i < slots; i++) {
      const x = MF_X + i * MF_STEP, y = MF_Y;
      const filled = i < misfires;
      ctx.beginPath();
      ctx.moveTo(x, y - MF_R);
      ctx.lineTo(x + MF_R * 0.72, y);
      ctx.lineTo(x, y + MF_R);
      ctx.lineTo(x - MF_R * 0.72, y);
      ctx.closePath();
      if (filled) {
        ctx.fillStyle = C.mineA;                      // your colour: a charge is petals you have not spent
        ctx.globalAlpha = 0.85 + 0.15 * (i === misfires - 1 ? mfPop : 0);
        ctx.fill();
      } else {
        ctx.strokeStyle = C.mineA;
        ctx.lineWidth = 1;
        ctx.globalAlpha = 0.20;
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  // Wave/act caption. Top-centre, low alpha, 1.6s. Centred means textAlign does the layout and we
  // never measure a string the director invented at runtime.
  function drawCaption(ctx) {
    const el = CAP_TIME - capT;
    let a;
    if (el < CAP_IN) a = el / CAP_IN;
    else if (capT < CAP_OUT) a = capT / CAP_OUT;
    else a = 1;
    if (a <= 0) return;

    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.ui;
    ctx.letterSpacing = LS_2;
    if (capAct) {
      ctx.font = F_ACT;
      ctx.globalAlpha = a * 0.34;                     // the act is context, not news
      ctx.fillText(capAct, W * 0.5, CAP_ACT_Y);
    }
    if (capWave) {
      ctx.font = F_WAVE;
      ctx.globalAlpha = a * 0.62;                     // still under 2/3: a caption must never out-shout a fuse ring
      ctx.fillText(capWave, W * 0.5, CAP_WAVE_Y);
    }
    ctx.letterSpacing = LS_0;
    ctx.globalAlpha = 1;
  }

  // The chain number rides the ship. Scaled by transform (not by rebuilding a font string, which
  // would allocate every frame) so it can grow to 2x at the display cap without a single alloc.
  function drawChain(ctx) {
    if (chainShown < CHAIN_MIN_SHOW || chainHold <= 0) return;
    const P = window.Player && Player.p;
    if (!P) return;

    const a = chainHold >= CHAIN_FADE ? 1 : chainHold / CHAIN_FADE;
    let n = chainShown;
    if (n > CFG.CHAIN_DISPLAY_CAP) n = CFG.CHAIN_DISPLAY_CAP;
    const s = (1 + n / 60) * (1 + CHAIN_POP * chainPop);   // spec: 1 + chain/60, cap 60 -> exactly 2x

    // clamped so a chain never gets guillotined by the top edge or shoved off-screen at the walls
    const px = U.clamp(P.x, 44, W - 44);
    const py = U.clamp(P.y + CHAIN_DY, 52, H - 56);

    ctx.save();
    ctx.translate(px, py);
    ctx.scale(s, s);
    ctx.font = F_CHAIN;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = C.mineA;                          // #5FF7FF: this number is YOURS
    ctx.globalAlpha = a * 0.95;
    ctx.fillText(chainShown < CHAIN_MAX_STR ? CHAIN_STR[chainShown] : CHAIN_OVER, 0, 0);
    ctx.restore();
    ctx.globalAlpha = 1;
  }

  // ---- entry point -----------------------------------------------------------------------------
  function draw(ctx, st) {
    if (!st) return;
    sync(st);

    const oldAlign = ctx.textAlign, oldBase = ctx.textBaseline;

    drawApplause(ctx, st.applause || 0, U.clamp(st.tier | 0, 0, SEG_N - 1));
    drawMisfires(ctx, st.misfires | 0);
    drawLives(ctx, st.lives | 0);
    drawScore(ctx, st.score | 0);
    if (capT > 0) drawCaption(ctx);
    drawChain(ctx);

    ctx.globalAlpha = 1;
    ctx.textAlign = oldAlign;
    ctx.textBaseline = oldBase;
  }

  return { reset, update, draw };
})();
