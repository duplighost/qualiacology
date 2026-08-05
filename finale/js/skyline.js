// FINALE — the world. City, crowd, sky. THIS FILE IS THE ENTIRE NARRATIVE DELIVERY SYSTEM.
//
// There are no cutscenes in this game. The story is: there are people down there, and they are
// watching. When you play well the city wakes up and the rooftops stand. When the Showrunner kills
// the lights, the world goes with them. Everything below exists to say that with zero words.
//
// PERFORMANCE LAW (same as atlas.js): the city is BAKED ONCE at boot into offscreen canvases and
// costs 3 drawImage calls per frame. Gradients are legal in build(); they are illegal after it.
// The only per-frame geometry is a batched fillRect pass for lit windows and 140 drawImage calls
// for the crowd — both flat loops over preallocated typed arrays, zero allocation.
window.Sky = (() => {
  const C = CFG.COL;

  // ---- PARALLAX / LAYOUT ----------------------------------------------------------------------
  // Parallax factors come straight from SPEC §10. Player x spans 0..1280, so the offset each layer
  // needs is (640 * factor); the baked canvas is padded by that much on BOTH sides so the layer can
  // never slide its own edge into frame.
  const PARA_FAR = 0.06, PARA_NEAR = 0.14;
  const PAD_FAR = 48;                    // 640*0.06 = 38.4 px of travel, +10 px of safety margin
  const PAD_NEAR = 104;                  // 640*0.14 = 89.6 px of travel, +14 px of safety margin
  const FAR_W = CFG.W + PAD_FAR * 2;     // 1376
  const NEAR_W = CFG.W + PAD_NEAR * 2;   // 1488

  // Far rooftops sit HIGHER on screen than near rooftops — that height difference is the only depth
  // cue a 2-layer silhouette city gets, so it has to be big enough to read: 72 px.
  const FAR_BASE = 648;                  // y that far building heights are measured up from
  const NEAR_BASE = CFG.H;               // near buildings stand on the bottom edge of the screen

  const FAR_N = 30, NEAR_N = 30;         // 60 buildings total (SPEC §10)
  const B_N = FAR_N + NEAR_N;
  // Widths 24..120 per spec. Heights are split per layer: the far layer gets the tall towers
  // (they are the horizon), the near layer stays shorter so its rooftops land in the bottom band
  // where the crowd can live without standing in the middle of the bullet field.
  const W_MIN = 24, W_MAX = 120;
  const FAR_H_MIN = 60, FAR_H_MAX = 190;
  const NEAR_H_MIN = 40, NEAR_H_MAX = 165;

  // ---- BUILDINGS (baked; these arrays exist so windows/crowd can be placed against real geometry)
  const bX = new Float32Array(B_N);      // x in LAYER-LOCAL space (0..FAR_W or 0..NEAR_W)
  const bW = new Float32Array(B_N);
  const bRoof = new Float32Array(B_N);   // screen y of the rooftop line
  const bLayer = new Uint8Array(B_N);    // 0 = far, 1 = near

  // ---- WINDOWS --------------------------------------------------------------------------------
  // SPEC calls for "a Uint8Array per building". One FLAT Uint8Array with per-building spans is the
  // same data with one allocation instead of sixty and a single linear scan in the draw pass —
  // which is what keeps the pass cheap. Far windows occupy [0, winFarEnd), near windows the rest,
  // because the two layers scroll by different amounts and must be drawn in two contiguous runs.
  const WIN_CAP = 520;                   // hard bound. 520 fillRects is ~0.05ms; 5000 would not be.
  const winX = new Float32Array(WIN_CAP);   // layer-local x
  const winY = new Float32Array(WIN_CAP);   // screen y
  const winU = new Float32Array(WIN_CAP);   // 0..1 normalised x within its own layer (for the sweep)
  const winOn = new Uint8Array(WIN_CAP);
  let winN = 0, winFarEnd = 0;
  const WIN_W_FAR = 2, WIN_H_FAR = 3;    // distant windows are pinpricks
  const WIN_W_NEAR = 3, WIN_H_NEAR = 4;
  const WIN_COL_STEP = 11, WIN_ROW_STEP = 15;  // grid pitch. 11px reads as "storeys", 4px reads as noise.
  const WIN_TOGGLES_PER_FRAME = 3;       // SPEC §10 exactly: 3 windows toggle per frame = a live city
  // On-probability per applause tier. 0.25 QUIET -> 0.85 ROAR (SPEC §10); FINALE is 1.0 because
  // SPEC §4 promises "every window in the city lights" at tier 4 and that promise is the payoff.
  const TIER_WIN_P = [0.25, 0.42, 0.60, 0.85, 1.00];

  // A tier change re-rolls the whole city as a left-to-right sweep instead of waiting ~3s for the
  // 3-per-frame drift to catch up. 0.45s is long enough to SEE travel, short enough to feel stepped.
  const SURGE_TIME = 0.45;
  let surgeOn = 0, surgeU = 0, surgeUPrev = 0;

  // ---- CROWD ----------------------------------------------------------------------------------
  const CROWD_N = 140;                   // SPEC §10
  const CELL_W = 14, CELL_H = 22;        // person art box; the body capsule inside it is 6px wide
  const STRIDE = 20;                     // sprite sheet cell pitch: 14px art + 6px gutter so the
                                         // rim halo of one cell can never bleed into its neighbour
  const SRC_W = 20, SRC_H = 26;          // full source cell (art + 2px top pad + rim bleed room)
  const FOOT_Y = 24;                     // y within the source cell where the feet sit
  const CROWD_ROOF_MIN_Y = 585;          // only rooftops at/below this get people. Above it we are
                                         // in the playfield and a silhouette there fights bullets.
  const cX = new Float32Array(CROWD_N);  // layer-local x (near layer)
  const cY = new Float32Array(CROWD_N);  // rooftop screen y
  const cRank = new Float32Array(CROWD_N);  // 0..1 threshold: WHO stands at a given tier. Fixed per
                                            // person, so the same individuals are always the keen ones.
  const cPhase = new Float32Array(CROWD_N); // bob phase, so 140 people never bob in lockstep
  const cPose = new Uint8Array(CROWD_N);    // 0 seated, 1 arms-up
  // Fraction of the crowd standing per tier. QUIET is nobody, FINALE is everybody, and LOUD is the
  // step where the rooftops visibly become a wall of arms — that is the tier the game sells.
  const TIER_STAND = [0.0, 0.35, 0.75, 0.95, 1.0];
  // Pose flips are STAGGERED BY INDEX (crowd indices run left to right), so a tier change reads as
  // one wave crossing the rooftops. 0.85s end-to-end: a stadium wave, not a light switch.
  const WAVE_TIME = 0.85;
  const WAVE_IDX_PER_S = CROWD_N / WAVE_TIME;
  let waveIdx = CROWD_N, waveT = 0;
  let bobT = 0;
  const BOB_HZ = 2.6;                    // arms-up bob rate. ~156 bpm: near the act tempi, so the
                                         // crowd looks like it is moving to the same music you are.
  const BOB_AMP_BASE = 1.2;              // px at QUIET
  const BOB_AMP_PER_TIER = 0.35;         // px per tier -> 2.6px at FINALE. Never more: >3px reads as jitter.

  // ---- FLASH (a bloom lit the sky) -------------------------------------------------------------
  const FLASH_TIME = 0.18;               // ~11 frames. Long enough to register, short enough that
                                         // a chain of blooms strobes the rooftops instead of glueing them lit.
  let flashT = 0, flashI = 0;

  // ---- CLOUD DECK (Act III) --------------------------------------------------------------------
  const CLOUD_W = CFG.W;                 // exactly one screen wide so two drawImages always cover
  const CLOUD_H = 150;
  const CLOUD_Y = 452;                   // sits on the far skyline, below the player's usual lane
  const CLOUD_SPEED = 12;                // px/s, SPEC §10. Slow enough to never pull the eye off a bullet.
  const CLOUD_PARA = 0.09;               // between far (0.06) and near (0.14): the deck is mid-depth
  const CLOUD_FADE = 1.6;                // s to fade the deck in/out on an act change
  let cloudX = 0, cloudA = 0, cloudsOn = 0;

  // ---- STATE ------------------------------------------------------------------------------------
  let built = false;
  let actIndex = 0;
  let tierNow = 0, tierPrev = -1;
  let blackout = false;

  // ---- OFFSCREENS --------------------------------------------------------------------------------
  let skyCv = null, farCv = null, nearCv = null, cloudCv = null, crowdCv = null;

  function makeCv(w, h) {
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    return cv;
  }

  // ================================================================================================
  // BUILD — runs once at boot. Gradients, loops and allocation are all legal in here and nowhere else.
  // ================================================================================================

  function bakeSky() {
    skyCv = makeCv(CFG.W, CFG.H);
    const g = skyCv.getContext('2d');

    const grad = g.createLinearGradient(0, 0, 0, CFG.H);
    grad.addColorStop(0, C.skyTop);
    grad.addColorStop(1, C.skyBottom);
    g.fillStyle = grad;
    g.fillRect(0, 0, CFG.W, CFG.H);

    // Horizon glow band. Peaks at y=640 — just under the near rooftop line — so the city silhouette
    // is backlit and reads as a hole punched in the night rather than a shape painted on it.
    const gl = g.createLinearGradient(0, 430, 0, 706);
    gl.addColorStop(0, U.hexa(C.skyGlow, 0));
    gl.addColorStop(0.76, U.hexa(C.skyGlow, 0.62));
    gl.addColorStop(1, U.hexa(C.skyGlow, 0));
    g.fillStyle = gl;
    g.fillRect(0, 430, CFG.W, 276);

    // Stars. Dim blue-white at low alpha — NOT pure white, because pure white in this game means
    // "act now" and a starfield must never say that. Upper 58% only; below that the glow eats them.
    for (let i = 0; i < 90; i++) {
      const sxp = U.rngFx.range(0, CFG.W);
      const syp = U.rngFx.range(4, CFG.H * 0.58);
      const a = U.rngFx.range(0.10, 0.34);
      const r = U.rngFx.next() < 0.16 ? 1.6 : 1.0;   // 16% of stars are slightly brighter, for texture
      g.fillStyle = `rgba(184,205,255,${a.toFixed(3)})`;
      g.fillRect(sxp, syp, r, r);
    }
  }

  // One building: solid city fill down to the bottom of the canvas (so gaps in the near layer show
  // far MASS, never sky) plus a 1px lighter roof edge so overlapping towers stay separable.
  function bakeBuilding(g, x, roof, w, h, canvasH, near) {
    g.fillStyle = C.city;
    g.fillRect(x | 0, roof | 0, w | 0, canvasH - (roof | 0));
    g.fillStyle = '#0C1226';             // one step above C.city (#05070E). Barely there, on purpose.
    g.fillRect(x | 0, roof | 0, w | 0, 1);
    // ~22% of buildings get a mast. Free silhouette character; deliberately NO aircraft light —
    // a blinking red or amber dot in the background would be a direct lie under the colour law.
    if (near && h > 70 && U.rngFx.next() < 0.22) {
      const mx = (x + w * 0.5) | 0;
      const mh = U.rngFx.range(10, 30) | 0;
      g.fillStyle = C.city;
      g.fillRect(mx, (roof | 0) - mh, 2, mh);
    }
  }

  function bakeLayer(cv, i0, count, canvasW, baseY, hMin, hMax, near) {
    const g = cv.getContext('2d');
    const span = canvasW / count;        // buildings are laid on an even grid then jittered; the
                                         // resulting overlap IS the look — a city is buildings behind buildings
    for (let k = 0; k < count; k++) {
      const i = i0 + k;
      const w = U.rngFx.range(W_MIN, W_MAX);
      const h = U.rngFx.range(hMin, hMax);
      const x = k * span + U.rngFx.range(-span * 0.38, span * 0.38);
      const roof = baseY - h;
      bX[i] = x; bW[i] = w; bRoof[i] = roof; bLayer[i] = near ? 1 : 0;
      bakeBuilding(g, x, roof, w, h, cv.height, near);
    }
  }

  // Windows are placed against the baked geometry but drawn LIVE on top of it — re-baking a layer to
  // toggle a window would cost a full-canvas repaint 3 times a frame.
  function placeWindows() {
    // Pass 1: how many candidate window slots does the whole city have?
    let cand = 0;
    for (let i = 0; i < B_N; i++) {
      const near = bLayer[i];
      const w = bW[i], h = (near ? NEAR_BASE : FAR_BASE) - bRoof[i];
      const cols = ((w - 10) / WIN_COL_STEP) | 0;
      const rows = ((h - 18) / WIN_ROW_STEP) | 0;
      if (cols > 0 && rows > 0) cand += cols * (rows > 9 ? 9 : rows);   // 9 storeys max: below that
                                                                       // the near layer occludes anyway
    }
    // Pass 2: emit a thinned-out subset so the total lands at/under WIN_CAP.
    const keep = cand > 0 ? Math.min(1, (WIN_CAP - 8) / cand) : 0;
    for (let pass = 0; pass < 2; pass++) {          // far buildings first, then near — the draw pass
      for (let i = 0; i < B_N; i++) {               // needs each layer in one contiguous run
        const near = bLayer[i];
        if ((pass === 0) !== (near === 0)) continue;
        const baseY = near ? NEAR_BASE : FAR_BASE;
        const w = bW[i], roof = bRoof[i], h = baseY - roof;
        const cols = ((w - 10) / WIN_COL_STEP) | 0;
        let rows = ((h - 18) / WIN_ROW_STEP) | 0;
        if (cols <= 0 || rows <= 0) continue;
        if (rows > 9) rows = 9;
        const cw = near ? WIN_W_NEAR : WIN_W_FAR;
        const x0 = roof === 0 ? 0 : bX[i] + (w - (cols - 1) * WIN_COL_STEP - cw) * 0.5;
        for (let r = 0; r < rows; r++) {
          for (let c = 0; c < cols; c++) {
            if (winN >= WIN_CAP) break;
            if (U.rngFx.next() > keep) continue;
            winX[winN] = x0 + c * WIN_COL_STEP;
            winY[winN] = roof + 9 + r * WIN_ROW_STEP;
            winU[winN] = winX[winN] / (near ? NEAR_W : FAR_W);
            winOn[winN] = U.rngFx.next() < TIER_WIN_P[0] ? 1 : 0;
            winN++;
          }
        }
      }
      if (pass === 0) winFarEnd = winN;
    }
  }

  // The crowd stands on the LOW near rooftops only. Placement runs left to right so that index order
  // IS screen order — that is what makes the staggered pose flip read as a travelling wave.
  function placeCrowd() {
    const roofs = [];                    // boot-time allocation only
    for (let i = 0; i < B_N; i++) {
      if (bLayer[i] !== 1) continue;
      if (bRoof[i] < CROWD_ROOF_MIN_Y) continue;
      if (bW[i] < 30) continue;          // a 24px ledge holding 4 people looks like a mistake
      roofs.push(i);
    }
    if (roofs.length === 0) roofs.push(FAR_N);   // degenerate seed: never leave the crowd homeless
    // insertion sort by x (boot only, <= 30 items)
    for (let a = 1; a < roofs.length; a++) {
      const v = roofs[a]; let b = a - 1;
      while (b >= 0 && bX[roofs[b]] > bX[v]) { roofs[b + 1] = roofs[b]; b--; }
      roofs[b + 1] = v;
    }
    let total = 0;
    for (let k = 0; k < roofs.length; k++) total += bW[roofs[k]] - 12;   // 6px inset each end

    for (let i = 0; i < CROWD_N; i++) {
      const t = (i + 0.5) / CROWD_N * total;
      let acc = 0, pick = roofs[0], local = 0;
      for (let k = 0; k < roofs.length; k++) {
        const span = bW[roofs[k]] - 12;
        if (t <= acc + span || k === roofs.length - 1) { pick = roofs[k]; local = t - acc; break; }
        acc += span;
      }
      cX[i] = bX[pick] + 6 + local + U.rngFx.range(-2.2, 2.2);   // jitter so the line isn't a comb
      cY[i] = bRoof[pick];
      cRank[i] = U.rngFx.next();
      cPhase[i] = U.rngFx.range(0, U.TAU);
      cPose[i] = 0;
    }
  }

  // One person, drawn at cell-local origin `ox`. 6px body capsule, 2-state pose (SPEC §10).
  function drawPerson(g, ox, pose) {
    if (pose === 0) {
      // SEATED: head low, mass wide. Reads as a shoulder line from 20 feet away.
      g.beginPath(); g.arc(ox + 7, 12.5, 2.3, 0, U.TAU); g.fill();
      g.fillRect(ox + 4, 14.5, 6, 7.5);
      g.fillRect(ox + 3, 17.5, 8, 4.5);
    } else {
      // ARMS-UP: taller, and the two 2px arms above the head are the whole silhouette read.
      g.beginPath(); g.arc(ox + 7, 8, 2.3, 0, U.TAU); g.fill();
      g.fillRect(ox + 4, 10, 6, 12);
      g.fillRect(ox + 1.6, 1, 2, 8.5);
      g.fillRect(ox + 10.4, 1, 2, 8.5);
    }
  }

  // 4 cells: [seated body, arms-up body, seated rim, arms-up rim]. The rim cells are HOLLOW — the
  // body is punched back out with destination-out at bake time — so a flash draws pure rim light
  // over the silhouette instead of tinting the whole person.
  function bakeCrowd() {
    crowdCv = makeCv(STRIDE * 4, SRC_H);
    const g = crowdCv.getContext('2d');
    g.save();
    g.translate(0, 2);                   // 2px top pad: the rim halo of an arms-up pose overshoots

    g.fillStyle = C.crowdBody;
    drawPerson(g, 3, 0);
    drawPerson(g, STRIDE + 3, 1);

    for (let pose = 0; pose < 2; pose++) {
      const ox = (2 + pose) * STRIDE + 3;
      const cx = ox + CELL_W * 0.5, cy = CELL_H * 0.62;
      g.save();
      g.fillStyle = C.crowdRim;
      g.translate(cx, cy); g.scale(1.20, 1.13); g.translate(-cx, -cy);   // 1-1.5px outward halo
      drawPerson(g, ox, pose);
      g.restore();
      g.globalCompositeOperation = 'destination-out';
      drawPerson(g, ox, pose);
      g.globalCompositeOperation = 'source-over';
    }
    g.restore();
  }

  // Cloud deck: three stacked sum-of-sines polylines with INTEGER periods across the strip width, so
  // the strip tiles seamlessly and two drawImage calls scroll forever. Filled with a vertical
  // gradient to transparent so the deck hazes out instead of ending in a hard line.
  function bakeClouds() {
    cloudCv = makeCv(CLOUD_W, CLOUD_H);
    const g = cloudCv.getContext('2d');
    const rgb = U.hex2rgb(C.skyGlow);    // #1D2A5E, per SPEC §10
    for (let band = 0; band < 3; band++) {
      const yBase = 34 + band * 26;      // three decks 26px apart -> depth without extra draw cost
      const a1 = 13 - band * 3, a2 = 7 - band * 1.6, a3 = 3.4;   // higher decks are lumpier
      const k1 = 2 + band, k2 = 5 + band * 2, k3 = 11;           // integer cycles per strip = tileable
      const p1 = U.rngFx.range(0, U.TAU), p2 = U.rngFx.range(0, U.TAU), p3 = U.rngFx.range(0, U.TAU);
      const grad = g.createLinearGradient(0, yBase - 18, 0, CLOUD_H);
      grad.addColorStop(0, U.rgba(rgb, 0.40 - band * 0.09));
      grad.addColorStop(1, U.rgba(rgb, 0));
      g.fillStyle = grad;
      g.beginPath();
      g.moveTo(0, CLOUD_H);
      for (let x = 0; x <= CLOUD_W; x += 8) {        // 8px steps: 161 points, plenty for a soft edge
        const u = x / CLOUD_W * U.TAU;
        g.lineTo(x, yBase + Math.sin(u * k1 + p1) * a1 + Math.sin(u * k2 + p2) * a2 + Math.sin(u * k3 + p3) * a3);
      }
      g.lineTo(CLOUD_W, CLOUD_H);
      g.closePath();
      g.fill();
    }
  }

  function build() {
    if (built) return;
    built = true;
    bakeSky();
    farCv = makeCv(FAR_W, CFG.H);
    nearCv = makeCv(NEAR_W, CFG.H);
    bakeLayer(farCv, 0, FAR_N, FAR_W, FAR_BASE, FAR_H_MIN, FAR_H_MAX, false);
    bakeLayer(nearCv, FAR_N, NEAR_N, NEAR_W, NEAR_BASE, NEAR_H_MIN, NEAR_H_MAX, true);
    placeWindows();
    placeCrowd();
    bakeCrowd();
    bakeClouds();
    reset();
  }

  // ================================================================================================
  // RUNTIME
  // ================================================================================================

  function reset() {
    actIndex = 0; cloudsOn = 0; cloudA = 0; cloudX = 0;
    blackout = false;
    flashT = 0; flashI = 0;
    tierNow = 0; tierPrev = -1;
    waveIdx = CROWD_N; waveT = 0; bobT = 0;
    surgeOn = 0; surgeU = 0; surgeUPrev = 0;
    for (let i = 0; i < CROWD_N; i++) cPose[i] = 0;
    for (let i = 0; i < winN; i++) winOn[i] = U.rngFx.next() < TIER_WIN_P[0] ? 1 : 0;
  }

  function setAct(a) {
    actIndex = a | 0;
    // Act index 2 is CFG.ACTS[2] — "THE CLOUD DECK". The deck is that act's identity; it does not
    // linger into Act IV, where the arena drops to the rooftops and the sky has to be readable.
    cloudsOn = (actIndex === 2) ? 1 : 0;
  }

  function setBlackout(on) {
    blackout = !!on;
    if (blackout) { flashT = 0; flashI = 0; }
  }

  // A bloom lit the sky. Intensity is 0..1; the strongest recent flash wins so a cascade doesn't
  // average itself down to nothing.
  function flash(intensity) {
    if (blackout) return;
    const i = intensity === undefined ? 1 : U.clamp(intensity, 0, 1);
    if (i <= 0) return;
    flashT = FLASH_TIME;
    if (i > flashI) flashI = i;
  }

  function update(dt, tier) {
    const t = U.clamp((tier === undefined ? (window.Fuse ? Fuse.tier : 0) : tier) | 0, 0, 4);
    tierNow = t;

    if (t !== tierPrev) {
      tierPrev = t;
      waveIdx = 0; waveT = 0;            // the rooftops start their wave from the left edge
      surgeOn = 1; surgeU = 0; surgeUPrev = 0;
    }

    // ---- windows -------------------------------------------------------------------------------
    const p = TIER_WIN_P[t];
    for (let k = 0; k < WIN_TOGGLES_PER_FRAME; k++) {
      const i = (U.rngFx.next() * winN) | 0;
      winOn[i] = U.rngFx.next() < p ? 1 : 0;
    }
    if (surgeOn) {
      surgeUPrev = surgeU;
      surgeU += dt / SURGE_TIME;
      const hi = surgeU > 1 ? 1 : surgeU;
      for (let i = 0; i < winN; i++) {
        const u = winU[i];
        if (u >= surgeUPrev && u < hi) winOn[i] = U.rngFx.next() < p ? 1 : 0;
      }
      if (surgeU >= 1) surgeOn = 0;
    }

    // ---- crowd ---------------------------------------------------------------------------------
    bobT += dt;
    if (waveIdx < CROWD_N) {
      waveT += dt;
      const front = waveT * WAVE_IDX_PER_S;
      const stand = TIER_STAND[t];
      while (waveIdx < CROWD_N && waveIdx <= front) {
        cPose[waveIdx] = cRank[waveIdx] < stand ? 1 : 0;
        waveIdx++;
      }
    }

    // ---- flash / clouds ------------------------------------------------------------------------
    if (flashT > 0) { flashT -= dt; if (flashT <= 0) { flashT = 0; flashI = 0; } }
    cloudX += CLOUD_SPEED * dt;
    if (cloudX > 1e6) cloudX -= 1e6;     // never let a float accumulate into precision mush
    cloudA = U.approach(cloudA, cloudsOn ? 1 : 0, dt / CLOUD_FADE);
  }

  // ================================================================================================
  // DRAW
  // ================================================================================================

  const playerX = () => (window.Player && Player.p ? Player.p.x : CFG.W * 0.5);

  // Sky gradient + far city + near city + the live window pass + (Act III) the cloud deck.
  // Drawn FIRST, under everything.
  function drawBack(ctx) {
    if (blackout) {
      // SHOWRUNNER P4. No city, no crowd, no gradient. The only light left in the world is the
      // bullets, and that is the entire point of the phase.
      ctx.fillStyle = C.blackout;
      ctx.fillRect(0, 0, CFG.W, CFG.H);
      return;
    }
    if (!built) return;

    const rel = playerX() - CFG.W * 0.5;
    const offFar = -rel * PARA_FAR;
    const offNear = -rel * PARA_NEAR;

    ctx.drawImage(skyCv, 0, 0);
    ctx.drawImage(farCv, (-PAD_FAR + offFar) | 0, 0);
    ctx.drawImage(nearCv, (-PAD_NEAR + offNear) | 0, 0);

    // Lit windows: one fillStyle for the whole pass, two contiguous runs (far dimmer, near full).
    // Bounded at WIN_CAP so this can never become the frame's problem.
    ctx.fillStyle = C.window;
    const dxFar = (-PAD_FAR + offFar) | 0;
    ctx.globalAlpha = 0.45;              // distance haze; the far layer must never out-shout the near
    for (let i = 0; i < winFarEnd; i++) {
      if (!winOn[i]) continue;
      ctx.fillRect((winX[i] + dxFar) | 0, winY[i] | 0, WIN_W_FAR, WIN_H_FAR);
    }
    const dxNear = (-PAD_NEAR + offNear) | 0;
    ctx.globalAlpha = 1;
    for (let i = winFarEnd; i < winN; i++) {
      if (!winOn[i]) continue;
      ctx.fillRect((winX[i] + dxNear) | 0, winY[i] | 0, WIN_W_NEAR, WIN_H_NEAR);
    }

    // FINALE tier only: a warm wash sitting on the rooftop line. One fillRect that says "the whole
    // city is awake" without touching a single extra window.
    if (tierNow >= 4) {
      ctx.globalAlpha = 0.055;           // any higher and it starts competing with amber for the eye
      ctx.fillRect(0, 470, CFG.W, CFG.H - 470);
    }
    ctx.globalAlpha = 1;

    // Cloud deck (Act III), scrolling between the skyline and the playfield.
    if (cloudA > 0.002) {
      const total = cloudX - rel * CLOUD_PARA;
      let ox = total % CLOUD_W;
      if (ox < 0) ox += CLOUD_W;
      ctx.globalAlpha = cloudA;
      ctx.drawImage(cloudCv, (ox - CLOUD_W) | 0, CLOUD_Y);
      ctx.drawImage(cloudCv, ox | 0, CLOUD_Y);
      ctx.globalAlpha = 1;
    }
  }

  // Rooftop crowd. Over the city, under everything that can kill you.
  function drawFront(ctx) {
    if (blackout || !built) return;

    const offNear = -(playerX() - CFG.W * 0.5) * PARA_NEAR;
    const dx = -PAD_NEAR + offNear;
    const amp = BOB_AMP_BASE + BOB_AMP_PER_TIER * tierNow;
    const w = bobT * BOB_HZ * U.TAU;

    // Base silhouettes: 140 drawImage calls, 1:1 source/dest size, no state changes in the loop.
    for (let i = 0; i < CROWD_N; i++) {
      const pose = cPose[i];
      const bob = pose ? U.fsin(w + cPhase[i]) * amp : 0;
      ctx.drawImage(crowdCv, pose * STRIDE, 0, SRC_W, SRC_H,
                    (cX[i] + dx - 10) | 0, (cY[i] - FOOT_Y + bob) | 0, SRC_W, SRC_H);
    }

    // Rim pass. A bloom just lit the sky, so the people it lit get an edge in #F2C46A. This is the
    // single cheapest way to make the crowd feel like it is IN the same room as your fireworks.
    if (flashT > 0) {
      ctx.globalAlpha = flashI * (flashT / FLASH_TIME) * 0.85;   // 0.85 cap: a rim, never a repaint
      for (let i = 0; i < CROWD_N; i++) {
        const pose = cPose[i];
        const bob = pose ? U.fsin(w + cPhase[i]) * amp : 0;
        ctx.drawImage(crowdCv, (2 + pose) * STRIDE, 0, SRC_W, SRC_H,
                      (cX[i] + dx - 10) | 0, (cY[i] - FOOT_Y + bob) | 0, SRC_W, SRC_H);
      }
      ctx.globalAlpha = 1;
    }
  }

  return {
    build, reset, update, drawBack, drawFront, setAct, flash, setBlackout,
    // read-only handles for smoke tests / the debug API
    get built() { return built; },
    get windowCount() { return winN; },
    get crowdCount() { return CROWD_N; },
    get blackout() { return blackout; },
    get cloudAlpha() { return cloudA; },
    litWindows() { let n = 0; for (let i = 0; i < winN; i++) n += winOn[i]; return n; },
    standing() { let n = 0; for (let i = 0; i < CROWD_N; i++) n += cPose[i]; return n; },
  };
})();
