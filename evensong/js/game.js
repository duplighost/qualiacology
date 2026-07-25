// EVENSONG — the conductor. Scenes, the musical clock, judging, knots, scheduling.
// The SIM owns time: mt is musical time in BEATS, advanced by fixed 60fps steps.
// Audio and rendering are both downstream of mt. window.__evensong drives it headlessly.
(function () {
  const CFG = window.CFG, U = window.U, T = window.THEORY, S = window.SCORE, A = window.AUDIO, W = window.WORLD;
  const BPB = CFG.BEATS_PER_BAR, LOOP = CFG.BARS_PER_LOOP * BPB;   // 12 beats of ground
  const DEBUG = new URLSearchParams(location.search).has('debug');

  // ------------------------------------------------------------------ state
  const G = {
    scene: 'title', mt: 0, soulIdx: -1, loopCount: 0,
    playerDeg: 7, hoverDeg: 7, singing: false, mouse: { x: 0.5, y: 0.5, down: false },
    playerYpx: 360, mouseXpx: 640,
    warmth01: 0.12, recentW: 0,
    votives: [], resolvedIds: [],
    laneNotes: [], ghostNotes: [], ribbon: { on: false },
    textCenter: null, textSub: null, textBottom: null,
    groundOn: false, groundBar: 0, beatInBar: 0, fictaActive: false,
    soulDegOnLadder: -1, soulSounding: false,
    susSoulState: 'idle', susBassState: 'idle', knotDesc: '',
    endHover: -1, fps: 60, debug: DEBUG, grace: false,
    events: [],
  };
  let soul = null, soulStartBeat = 0, knot = null;
  let susSoul = T.SuspensionTracker({ maxHoldBeats: Math.round(CFG.SUS_MAX_HOLD_BARS * BPB) });
  let susBass = T.SuspensionTracker({ maxHoldBeats: Math.round(CFG.SUS_MAX_HOLD_BARS * BPB) });
  let resolutionPending = false, resStartBeat = 0, resEndBeat = 0;
  let sceneT = 0, schedUntil = -1, lastJudgedBeat = -1, attackedSinceBeat = false;
  let prevDownbeat = { deg: null, singing: false };
  let finaleStartBeat = 0, fermataReleasedT = 0, fermataSingT = 0, fermataBeat = 0;
  let peelTimer = 0, peelIdx = 0, tutorialDone = false;
  let listeners = [];

  function emit(type, data) {
    const e = Object.assign({ t: G.mt, type }, data || {});
    G.events.push(e); if (G.events.length > 400) G.events.shift();
    for (const f of listeners) { try { f(e); } catch (err) {} }
  }

  // ----------------------------------------------------- score preprocessing
  // legato flags: notes that touch end-to-start connect without re-attack.
  function prepLegato(notes) {
    const arr = notes.map(n => ({ ...n, start: n.bar * BPB + n.b, legatoPrev: false, legatoNext: false }));
    arr.sort((a, b) => a.start - b.start);
    for (let i = 0; i + 1 < arr.length; i++) {
      if (Math.abs(arr[i].start + arr[i].d - arr[i + 1].start) < 1e-6) { arr[i].legatoNext = true; arr[i + 1].legatoPrev = true; }
    }
    return arr;
  }
  for (const s of S.SOULS) { s._mel = prepLegato(s.melody); s._res = prepLegato(s.resolution.notes); }
  const FIN = {}; for (const k in S.FINALE.voices) FIN[k] = prepLegato(S.FINALE.voices[k]);

  function soulLoopLen() { return soul.loopBars * BPB; }
  function soulNoteAt(beat) {
    if (!soul || beat < soulStartBeat) return null;
    const pos = (beat - soulStartBeat) % soulLoopLen();
    // in the resolution loop, the melody only exists before startAtGroundBar
    if (resolutionPending && beat >= resStartBeat - S.SOULS[G.soulIdx].resolution.startAtGroundBar * BPB) {
      const rp = beat - resStartBeat;
      if (rp >= 0) { for (const n of soul._res) if (rp >= n.start && rp < n.start + n.d) return n; return null; }
    }
    for (const n of soul._mel) if (pos >= n.start && pos < n.start + n.d) return n;
    return null;
  }
  function groundBarAt(beat) { return Math.floor(beat / BPB) % CFG.BARS_PER_LOOP; }
  function bassStepAt(beat) { return S.GROUND.steps[groundBarAt(beat)]; }
  function bassMidiAt(beat) { return S.GROUND.bassMidi[groundBarAt(beat)]; }
  function fictaAt(beat) { return S.GROUND.fictaBars.includes(groundBarAt(beat)); }
  function nextLoopBoundary(beat) { return Math.ceil((beat + 1e-6) / LOOP) * LOOP; }

  // --------------------------------------------------------------- input
  const canvas = document.getElementById('cv');
  // Touch is the primary pointer — used for affordances a mouse gets from hovering.
  G.coarsePointer = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);

  // The endcard's two choices, defined once. The update loop and the click handler
  // used to carry duplicate copies of this test, which is how they drift apart.
  // The band was +/-26 canvas px = ~28 CSS px tall in landscape; a thumb needs 44+.
  const END_ROW_Y = CFG.H / 2 + 130;
  const END_ROW_HALF = 56;
  function endChoiceAt(mx, my) {
    return Math.abs(my - END_ROW_Y) < END_ROW_HALF ? (mx < CFG.W / 2 ? 0 : 1) : -1;
  }

  function setPointer(x01, y01, down) {
    G.mouse.x = U.clamp(x01, 0, 1); G.mouse.y = U.clamp(y01, 0, 1);
    const wasDown = G.mouse.down; G.mouse.down = !!down;
    G.mouseXpx = G.mouse.x * CFG.W;
    const yAdj = U.clamp((G.mouse.y * CFG.H - CFG.LADDER_TOP_Y) / (CFG.LADDER_BOT_Y - CFG.LADDER_TOP_Y), 0, 1);
    // Hysteresis exists to stop a *travelling* pointer chattering across a string
    // boundary. First contact is not travel — it is a discrete landing — and running
    // it through the hysteresis branch resolves one scale step short of the string
    // you actually touched. A mouse never exposed this (its per-event delta is under
    // one string); a finger hits it on every single press, in a game where the
    // interval between your note and theirs IS the mechanic. Round plainly instead.
    const fresh = !wasDown && G.mouse.down;
    const deg = T.degreeFromY(yAdj, CFG.N_STRINGS, fresh ? null : G.playerDeg, CFG.SNAP_HYSTERESIS);
    G.hoverDeg = deg;
    if (fresh) {
      // Commit the degree before onPress so its pushPitch() sounds the string under
      // the finger, instead of gliding in from wherever the previous note was.
      G.playerDeg = deg;
      onPress();
    }
    if (wasDown && !G.mouse.down) onRelease();
    if (deg !== G.playerDeg) {
      G.playerDeg = deg;
      if (G.singing) { onOnset(); pushPitch(); }
    }
  }
  function onPress() {
    if (G.scene === 'title') { beginGame(); return; }
    if (G.scene === 'endcard') { clickEnd(); return; }
    if (G.scene === 'picardy') return;
    G.singing = true; onOnset();
    A.player.setSinging(true); pushPitch();
  }
  function onRelease() { G.singing = false; A.player.setSinging(false); }
  function onOnset() {
    attackedSinceBeat = true;
    if (knot && soul && soul.knot.type === 'echo' && G.scene === 'soul') {
      const pos = (G.mt - soulStartBeat) % soulLoopLen();
      const bar = Math.floor(pos / BPB);
      const inWin = soul.knot.windowBars.includes(bar);
      if (knot.onOnset(T.stepOfDegree(G.playerDeg), inWin)) knotComplete();
    }
  }
  function pushPitch() {
    let midi;
    if (G.scene === 'fermata' || G.scene === 'picardy') {
      // grace: fold whatever you sing into the held chord. you cannot be wrong here.
      const raw = T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, false);
      let best = raw, bd = 99;
      for (let m = 45; m <= 88; m++) {
        const pc = m % 12;
        if (pc === 9 || pc === 1 || pc === 4) { const d = Math.abs(m - raw); if (d < bd) { bd = d; best = m; } }
      }
      midi = best;
    } else midi = T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, G.fictaActive);
    A.player.setPitch(midi);
  }
  canvas.addEventListener('pointermove', e => {
    const r = canvas.getBoundingClientRect();
    setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, G.mouse.down);
  });
  canvas.addEventListener('pointerdown', e => {
    // Nobody's echo knot needs three fast taps in one spot, which is exactly the
    // gesture iOS reads as double-tap-to-zoom. Claim the gesture so the browser
    // cannot steal the only input that solves the level.
    e.preventDefault();
    const r = canvas.getBoundingClientRect();
    setPointer((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, true);
  }, { passive: false });
  window.addEventListener('pointerup', () => setPointer(G.mouse.x, G.mouse.y, false));
  // iOS fires pointercancel (never pointerup) when it reclaims a touch as a system
  // gesture, a pinch, or a palm. Without this the voice latched on forever, and both
  // Eli's four silent beats and the ending's 2.5s release became unreachable.
  window.addEventListener('pointercancel', () => setPointer(G.mouse.x, G.mouse.y, false));
  canvas.addEventListener('contextmenu', e => e.preventDefault());

  // --------------------------------------------------------------- scenes
  function beginGame() {
    A.init();
    G.groundOn = true; G.mt = 0; schedUntil = -0.001; lastJudgedBeat = -1;
    startSoulIntro(0);
    emit('begin');
  }
  function startSoulIntro(i) {
    G.soulIdx = i; soul = S.SOULS[i];
    G.scene = 'soulIntro'; sceneT = 0;
    G.loopCount = 0; resolutionPending = false;
    susSoul.reset(); susBass.reset();
    knot = makeKnot(soul.knot);
    G.textCenter = { str: soul.intro, alpha: 0 };
    emit('soul-intro', { id: soul.id });
  }
  function makeKnot(k) {
    switch (k.type) {
      case 'lander': return T.LanderKnot();
      case 'contrary': return T.ContraryKnot(k.need);
      case 'suspension': return T.SuspensionKnot(k.need);
      case 'echo': return T.EchoKnot(k.steps, k.minMatch);
      case 'rest': return T.RestKnot(k.engageNeed, k.restNeed);
    }
  }
  function knotComplete() {
    if (resolutionPending) return;
    resolutionPending = true;
    const boundary = soulStartBeat + Math.ceil(((G.mt - soulStartBeat) + 1e-6) / soulLoopLen()) * soulLoopLen();
    resStartBeat = boundary + soul.resolution.startAtGroundBar * BPB;
    const last = soul._res[soul._res.length - 1];
    resEndBeat = resStartBeat + last.start + last.d + 1;
    // the knot may complete INSIDE the scheduler's lookahead of the boundary — rewind the
    // horizon so the resolution's first notes aren't silently skipped. (Re-scheduling an
    // already-scheduled organ bar writes identical automation: benign.)
    schedUntil = Math.min(schedUntil, G.mt);
    emit('knot-complete', { id: soul.id });
    W.spawnBloom(CFG.NOW_X, G.playerYpx, soul.tint, true);
  }
  function soulResolved() {
    G.votives.push({ tint: soul.tint });
    G.resolvedIds.push(soul.id);
    if (soul.groundGift.type !== 'figuration') A.addDrone(soul.id, soul.groundGift);
    G.textCenter = { str: soul.epitaph, alpha: 0 };
    G.scene = 'epitaph'; sceneT = 0;
    emit('soul-resolved', { id: soul.id });
    W.spawnBloom(CFG.NOW_X, W.yForDegree(7), soul.tint, true);
  }
  function startFinale() {
    G.scene = 'finaleIntro'; sceneT = 0; soul = null; knot = null;
    G.textCenter = { str: S.TEXT.finaleIntro, alpha: 0 };
    emit('finale-intro');
  }

  // --------------------------------------------------------------- stepping
  function step(dt) {
    const prevMt = G.mt;
    // time flows except: title (not begun), endcard (over), fermata (held breath — pinned
    // below), picardy (the resolution is one chord, not a passage; if mt ran on, the
    // scheduler would resume the LAMENT under the D major).
    if (G.scene !== 'title' && G.scene !== 'endcard' && G.scene !== 'picardy') G.mt += dt * CFG.BPM / 60;
    sceneT += dt;
    G.groundBar = groundBarAt(G.mt);
    G.beatInBar = (G.mt % BPB);
    const fictaNow = fictaAt(G.mt) && (G.scene === 'soul' || G.scene === 'resolution' || G.scene === 'soulIntro' || G.scene === 'epitaph' || G.scene === 'freesing' || G.scene === 'finale');
    if (fictaNow !== G.fictaActive) { G.fictaActive = fictaNow; if (G.singing) pushPitch(); }

    // player flame y: glides to the sung string; free ember otherwise
    const targetY = G.singing ? W.yForDegree(G.playerDeg) : G.mouse.y * CFG.H;
    G.playerYpx += (targetY - G.playerYpx) * Math.min(1, dt * 18);

    G.recentW = Math.max(0, G.recentW - dt * 1.6);
    G.warmth01 = U.clamp(0.12 + G.resolvedIds.length * 0.13 + G.recentW * 0.05, 0, 1);

    switch (G.scene) {
      case 'title': break;
      case 'soulIntro': {
        fadeCenter(0.8, 3.6);
        if (sceneT > 4.5) {
          soulStartBeat = nextLoopBoundary(G.mt + 0.2);
          G.scene = 'soul'; sceneT = 0;
          emit('soul-start', { id: soul.id, at: soulStartBeat });
        }
        break;
      }
      case 'soul': case 'resolution': {
        judgeCrossedBeats(prevMt);
        if (resolutionPending && G.scene === 'soul' && G.mt >= resStartBeat - soul.resolution.startAtGroundBar * BPB) {
          G.scene = 'resolution'; emit('resolution-start', { id: soul.id });
        }
        if (resolutionPending && G.mt >= resEndBeat) soulResolved();
        // tutorial lines (wren only): the verb first; then, once they can sing, the goal.
        if (G.soulIdx === 0 && !resolutionPending) {
          if (!tutorialDone) {
            G.textBottom = { str: G.coarsePointer ? S.TEXT.tutorialTouch : S.TEXT.tutorial, alpha: Math.min(0.8, sceneT * 0.5) };
            if (G.recentW > 4) tutorialDone = true;
          } else if (G.loopCount >= 1 && !knot.done) {
            G.textBottom = { str: S.TEXT.tutorial2, alpha: Math.min(0.8, (G.textBottom ? G.textBottom.alpha : 0) + dt * 0.5) };
          }
        }
        break;
      }
      case 'epitaph': {
        fadeCenter(0.9, 3.4);
        if (sceneT > 4.5) {
          G.textCenter = null;
          if (G.soulIdx + 1 < S.SOULS.length) startSoulIntro(G.soulIdx + 1);
          else startFinale();
        }
        break;
      }
      case 'finaleIntro': {
        fadeCenter(0.9, 4.2);
        if (sceneT > 5) {
          finaleStartBeat = nextLoopBoundary(G.mt + 0.2);
          G.scene = 'finale'; sceneT = 0; G.grace = true;
          emit('finale-start', { at: finaleStartBeat });
        }
        break;
      }
      case 'finale': {
        judgeCrossedBeats(prevMt);   // warmth & ribbon still live; nothing frays in grace
        const finLen = 8 * BPB * S.FINALE.loops;
        if (G.mt >= finaleStartBeat + finLen) {
          G.scene = 'fermata'; sceneT = 0; fermataReleasedT = 0; fermataSingT = 0;
          fermataBeat = finaleStartBeat + finLen;
          A.holdChord(S.FINALE.fermataChord, fermataBeat);
          G.textCenter = { str: S.TEXT.fermata, alpha: 0 };
          emit('fermata');
        }
        break;
      }
      case 'fermata': {
        G.mt = fermataBeat;                             // time itself holds its breath
        fadeCenter(0.9, 1e9);
        if (G.singing) { fermataSingT += dt; fermataReleasedT = 0; }
        else fermataReleasedT += dt;
        G.fermataRel01 = fermataReleasedT / CFG.FERMATA_RELEASE_S;   // the world answers stillness visibly
        if (fermataSingT > CFG.FERMATA_PATIENCE_S && G.textCenter.str !== S.TEXT.patience) {
          G.textCenter = { str: S.TEXT.patience, alpha: 0 };
        }
        if (fermataReleasedT >= CFG.FERMATA_RELEASE_S) {
          G.scene = 'picardy'; sceneT = 0; peelTimer = 0; peelIdx = 0;
          G.textCenter = null;
          A.holdChord(S.FINALE.picardyChord, fermataBeat);
          A.liftDrone('margaret', 1, 0.6);              // her F rises to F#. the note came.
          W.spawnBloom(CFG.NOW_X, CFG.H / 2, CFG.COL_PLAYER, true);
          emit('picardy');
        }
        break;
      }
      case 'picardy': {
        peelTimer += dt;
        const interval = CFG.PEEL_S / S.FINALE.peelOrder.length;
        while (peelIdx < S.FINALE.peelOrder.length && peelTimer > (peelIdx + 1) * interval) {
          A.fadeVoice(S.FINALE.peelOrder[peelIdx], 2.2);
          emit('peel', { id: S.FINALE.peelOrder[peelIdx] });
          peelIdx++;
        }
        if (peelTimer > CFG.PEEL_S + 4) {
          A.fadeVoice('wren', 3);
          G.scene = 'endcard'; sceneT = 0; G.groundOn = false;
          emit('endcard');
        }
        break;
      }
      case 'endcard': {
        G.endHover = endChoiceAt(G.mouse.x * CFG.W, G.mouse.y * CFG.H);
        break;
      }
      case 'freesing': {
        judgeCrossedBeats(prevMt);
        break;
      }
    }

    // any text that outlived its scene fades out here, globally — nothing lingers
    const centerOwned = G.scene === 'soulIntro' || G.scene === 'epitaph' || G.scene === 'finaleIntro' || G.scene === 'fermata';
    if (G.textCenter && !centerOwned) {
      G.textCenter.alpha -= dt * 0.5;
      if (G.textCenter.alpha <= 0) G.textCenter = null;
    }
    const tutorialOwned = G.scene === 'soul' && G.soulIdx === 0 && !resolutionPending;
    if (G.textBottom && !tutorialOwned) {
      G.textBottom.alpha -= dt * 0.4;
      if (G.textBottom.alpha <= 0) G.textBottom = null;
    }

    scheduleAudio();
    buildLane();
    G.knotDesc = knot ? (soul.knot.type + ' ' + (knot.progress != null ? knot.progress : '') + (knot.done ? ' DONE' : '')) : '';
    G.susSoulState = susSoul.state; G.susBassState = susBass.state;
  }
  function fadeCenter(peak, holdS) {
    if (!G.textCenter) return;
    const a = sceneT < 1 ? sceneT : sceneT > holdS ? Math.max(0, 1 - (sceneT - holdS)) : 1;
    G.textCenter.alpha = a * peak;
  }
  function clickEnd() {
    // recompute from the click's own pointer position — G.endHover is last frame's state
    const hover = endChoiceAt(G.mouse.x * CFG.W, G.mouse.y * CFG.H);
    if (hover === 0) location.reload();
    else if (hover === 1) {
      G.scene = 'freesing'; G.groundOn = true; G.grace = false;
      G.mt = nextLoopBoundary(G.mt + 0.2); schedUntil = G.mt - 0.001; lastJudgedBeat = Math.floor(G.mt) - 1;
      A.restoreGround();                                 // the peel faded the room to silence; re-light it
      emit('freesing');
    }
  }

  // -------------------------------------------------------------- judging
  function judgeCrossedBeats(prevMt) {
    const from = Math.floor(prevMt), to = Math.floor(G.mt);
    for (let k = from + 1; k <= to; k++) judgeBeat(k);
  }
  function judgeBeat(k) {
    if (k <= lastJudgedBeat) return;
    lastJudgedBeat = k;
    const beatInBar = ((k % BPB) + BPB) % BPB;
    const isDownbeat = beatInBar === 0;
    const ficta = fictaAt(k);
    const attacked = attackedSinceBeat; attackedSinceBeat = false;
    const pMidi = T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, ficta);
    const pStep = T.stepOfDegree(G.playerDeg);
    const bMidi = bassMidiAt(k), bStep = bassStepAt(k);
    const qBass = G.singing ? T.quality(pMidi, pStep, bMidi, bStep, true) : null;
    const sn = soulNoteAt(k);
    let qSoul = null, sStep = null, sMidi = null;
    if (sn) {
      sMidi = sn.midi; sStep = T.stepForMidi(sn.midi, CFG.ROOT_MIDI);
      qSoul = G.singing ? T.quality(pMidi, pStep, sMidi, sStep, false) : null;
    }

    // suspension machines (bass always; soul when sounding)
    const evB = susBass.update({ singing: G.singing, attacked, deg: G.playerDeg, quality: qBass || 'dissonant', isDownbeat, barChanged: isDownbeat });
    let evS = null;
    if (sn) evS = susSoul.update({ singing: G.singing, attacked, deg: G.playerDeg, quality: qSoul || 'dissonant', isDownbeat, barChanged: isDownbeat });
    for (const ev of [evB, evS]) {
      if (!ev) continue;
      if (ev === 'resolved') {
        G.recentW += CFG.WARMTH_SUSPENSION;
        A.bloom(pMidi);
        W.spawnBloom(CFG.NOW_X, W.yForDegree(G.playerDeg), CFG.COL_RIBBON_SUS, false);
        emit('suspension-resolved');
        if (knot && soul && soul.knot.type === 'suspension' && G.scene === 'soul') { if (knot.onSuspensionEvent('resolved'), knot.done) knotComplete(); }
      } else if (ev === 'suspended') emit('suspended');
      else if (ev === 'broken') {
        // a dropped suspension must be FELT, not just silently uncounted
        G.recentW = Math.max(0, G.recentW - 1);
        W.spawnSpark(CFG.NOW_X, W.yForDegree(G.playerDeg), CFG.COL_RIBBON_DISS, 6, 46);
        emit('suspension-broken');
      }
    }

    // warmth from plain intervals (suspended dissonance is tension, not fault)
    if (G.singing && (qSoul || qBass)) {
      const q = qSoul || qBass;
      let w = q === 'imperfect' ? CFG.WARMTH_IMPERFECT : q === 'perfect' ? CFG.WARMTH_PERFECT
        : q === 'neutral' ? CFG.WARMTH_NEUTRAL : (susSoul.state === 'suspended' || susBass.state === 'suspended') ? 0.5 : CFG.WARMTH_DISS;
      if (G.grace) w = Math.max(0, w);
      G.recentW = Math.max(0, G.recentW + w);
    }

    if (!soul || G.scene !== 'soul') { rememberDownbeat(k, isDownbeat); return; }

    // ---- knots
    const pos = (k - soulStartBeat);
    if (pos < 0) { rememberDownbeat(k, isDownbeat); return; }
    const posInLoop = pos % soulLoopLen();
    const bar = Math.floor(posInLoop / BPB);
    if (posInLoop === 0 && pos > 0) {
      G.loopCount++;
      if (knot.resetLoop) knot.resetLoop();
      if (knot.resetWindow) knot.resetWindow();
      emit('loop', { n: G.loopCount });
    }
    switch (soul.knot.type) {
      case 'lander': {
        knot.update({
          inStallBar: soul.knot.stallBars.includes(bar), beatInBar, lastBeat: beatInBar === BPB - 1,
          singing: G.singing, quality: qSoul || 'dissonant',
          playerBelowSoul: sn ? pMidi < sMidi : false, playerStep: pStep,
        });
        if (knot.done) knotComplete();
        break;
      }
      case 'contrary': {
        if (isDownbeat && pos >= BPB) {
          const curBarNote = soul._mel.find(n => n.bar === bar);
          const prevBarIdx = (bar + soul.loopBars - 1) % soul.loopBars;
          const prevBarNote = soul._mel.find(n => n.bar === prevBarIdx);
          if (curBarNote && prevBarNote && prevDownbeat.deg != null) {
            const ok = knot.update({
              soulDelta: Math.sign(curBarNote.midi - prevBarNote.midi),
              playerDelta: Math.sign(G.playerDeg - prevDownbeat.deg),
              singing: G.singing && prevDownbeat.singing,
              quality: qSoul || 'dissonant',
            });
            if (ok) { G.recentW += 2; W.spawnSpark(CFG.NOW_X, W.yForDegree(G.playerDeg), soul.tint, 5, 30); emit('contrary', { n: knot.progress }); }
            if (knot.done) knotComplete();
          }
        }
        break;
      }
      case 'rest': {
        const inAnswer = soul.knot.answerBars.includes(bar);
        // silence in his answer bars EARNS warmth — otherwise the game's own economy
        // tells you to sing through the one moment that asks you not to.
        if (inAnswer && !G.singing) G.recentW += 1;
        knot.update({ inAnswerBars: inAnswer, singing: G.singing, quality: qSoul || (qBass || 'dissonant') });
        if (knot.done) knotComplete();
        break;
      }
      // echo: driven by onsets, not beats. suspension: driven by sus events above.
    }
    rememberDownbeat(k, isDownbeat);
  }
  function rememberDownbeat(k, isDownbeat) {
    if (isDownbeat) prevDownbeat = { deg: G.singing ? G.playerDeg : null, singing: G.singing };
  }

  // ------------------------------------------------------------- scheduling
  function scheduleAudio() {
    if (!G.groundOn) return;
    A.sync(G.mt);
    const la = Math.max(0.3, CFG.SCHED_LOOKAHEAD_S / (60 / CFG.BPM) + 0.2);
    const to = G.mt + la;
    if (to <= schedUntil) return;
    const from = schedUntil;
    schedUntil = to;

    // Nothing may be scheduled at or past the fermata: the held chord owns that beat and
    // everything after it. (Without this cap, the last lookahead window of the finale
    // schedules a lament bar + figuration INTO the held dominant.)
    const capBeat = G.scene === 'finale' ? finaleStartBeat + 8 * BPB * S.FINALE.loops : Infinity;

    // ground organ: one bass note per bar (+ Eli's figuration once he's given it —
    // on its OWN instrument; the main organ is monophonic and must keep the bass)
    const eliDone = G.resolvedIds.includes('eli');
    for (let bar = Math.floor(from / BPB) + 1; bar <= Math.floor(to / BPB); bar++) {
      const t = bar * BPB;
      if (t <= from || t > to || t >= capBeat) continue;
      const midi = S.GROUND.bassMidi[bar % CFG.BARS_PER_LOOP];
      A.groundNote(midi, t, BPB, 1);
      if (eliDone) {
        const fig = [0, 7, 12, 7, 0, 7];
        for (let i = 0; i < 6; i++) {
          if (t + i * 0.5 >= capBeat) break;
          A.figNote(midi + 12 + fig[i], t + i * 0.5, 0.5, 0.4);
        }
      }
    }

    // the active soul's line (loop melody + resolution phrase)
    if (soul && (G.scene === 'soul' || G.scene === 'resolution')) {
      const len = soulLoopLen();
      for (let li = Math.floor(Math.max(0, from - soulStartBeat) / len); ; li++) {
        const base = soulStartBeat + li * len;
        if (base > to) break;
        for (const n of soul._mel) {
          const at = base + n.start;
          if (at <= from || at > to) continue;
          if (resolutionPending) {
            const resLoopStart = resStartBeat - soul.resolution.startAtGroundBar * BPB;
            if (at >= resLoopStart && n.bar >= soul.resolution.startAtGroundBar) continue;   // melody yields to the answer
            if (at >= resLoopStart + len) continue;                                          // and stops after that loop
          }
          A.noteOn(soul.id, n.midi, at, n.d, n.vel, n.legatoPrev, n.legatoNext);
        }
      }
      if (resolutionPending) for (const n of soul._res) {
        const at = resStartBeat + n.start;
        if (at > from && at <= to) A.noteOn(soul.id, n.midi, at, n.d, n.vel, n.legatoPrev, n.legatoNext);
      }
    }

    // finale: all five voices
    if (G.scene === 'finale') {
      const flen = 8 * BPB;
      for (const id in FIN) {
        for (let li = 0; li < S.FINALE.loops; li++) {
          const base = finaleStartBeat + li * flen;
          if (base > to + flen) break;
          for (const n of FIN[id]) {
            const at = base + n.start;
            if (at > from && at <= to) A.noteOn(id, n.midi, at, n.d, n.vel, n.legatoPrev, n.legatoNext);
          }
        }
      }
    }
  }

  // ---------------------------------------------------------- lane assembly
  function buildLane() {
    G.laneNotes.length = 0; G.ghostNotes.length = 0;
    G.soulSounding = false; G.soulDegOnLadder = -1;
    const horizon = CFG.LOOKAHEAD_BARS * BPB;
    let refDeg = null, refQ = null;

    function pushNote(at, n, tint) {
      const delta = at - G.mt;
      if (delta < -n.d - 1 || delta > horizon + 1) return;
      const deg = T.degreeForMidi(n.midi, CFG.ROOT_MIDI);
      const sounding = delta <= 0 && delta > -n.d;
      G.laneNotes.push({ beatDelta: delta, deg, lenBeats: n.d, tint, vel: n.vel || 1, sounding });
      return { deg, sounding };
    }

    if (soul && (G.scene === 'soul' || G.scene === 'resolution')) {
      const len = soulLoopLen();
      for (let li = Math.floor(Math.max(0, (G.mt - 2) - soulStartBeat) / len); ; li++) {
        const base = soulStartBeat + li * len;
        if (base > G.mt + horizon) break;
        for (const n of soul._mel) {
          if (resolutionPending) {
            const resLoopStart = resStartBeat - soul.resolution.startAtGroundBar * BPB;
            const at0 = base + n.start;
            if (at0 >= resLoopStart && n.bar >= soul.resolution.startAtGroundBar) continue;
            if (at0 >= resLoopStart + len) continue;
          }
          const r = pushNote(base + n.start, n, soul.tint);
          if (r && r.sounding) { G.soulSounding = true; G.soulDegOnLadder = r.deg; }
        }
      }
      if (resolutionPending) for (const n of soul._res) {
        const r = pushNote(resStartBeat + n.start, n, soul.tint);
        if (r && r.sounding) { G.soulSounding = true; G.soulDegOnLadder = r.deg; }
      }
      // ghosts
      if (!knot.done && G.loopCount >= CFG.HINT_AFTER_LOOPS && !resolutionPending) {
        const explicit = G.loopCount >= CFG.HINT_EXPLICIT_LOOPS;
        const posNow = (G.mt - soulStartBeat) % len, loopBase = G.mt - posNow;
        for (const h of soul.hints) {
          for (const b of (h.onBars || [])) {
            for (const off of [0, len]) {
              if (h.type === 'rest') {
                const mel = soul._mel.find(n => n.bar === b);
                if (mel) {
                  const at = loopBase + off + b * BPB;
                  for (let bb = 0; bb < BPB; bb++) G.ghostNotes.push(mk(at + bb, T.degreeForMidi(mel.midi, CFG.ROOT_MIDI), true));
                }
              } else {
                const at = loopBase + off + b * BPB + h.beat;
                G.ghostNotes.push(mk(at, h.deg, false));
              }
            }
          }
        }
        function mk(at, deg, rest) { return { beatDelta: at - G.mt, deg, rest, pulse: explicit }; }
      }
      // ribbon vs the soul (fall back to the bass when they rest)
      if (G.singing) {
        const k = Math.floor(G.mt);
        const ficta = fictaAt(k);
        const pMidi = T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, ficta), pStep = T.stepOfDegree(G.playerDeg);
        const sn = soulNoteAt(G.mt);
        if (sn) {
          refDeg = T.degreeForMidi(sn.midi, CFG.ROOT_MIDI);
          refQ = T.quality(pMidi, pStep, sn.midi, T.stepForMidi(sn.midi, CFG.ROOT_MIDI), false);
        } else {
          refDeg = T.degreeForMidi(bassMidiAt(G.mt) + 24, CFG.ROOT_MIDI);   // show vs bass, two octaves up into view
          refQ = T.quality(pMidi, pStep, bassMidiAt(G.mt), bassStepAt(G.mt), true);
        }
      }
    }

    if (G.scene === 'finale') {
      const flen = 8 * BPB;
      let nearest = null, nd = 99;
      for (const id in FIN) {
        const s2 = S.SOULS.find(x => x.id === id);
        for (let li = 0; li < S.FINALE.loops; li++) {
          const base = finaleStartBeat + li * flen;
          for (const n of FIN[id]) {
            const r = pushNote(base + n.start, n, s2.tint);
            if (r && r.sounding && G.singing) {
              const d = Math.abs(r.deg - G.playerDeg);
              if (d < nd) { nd = d; nearest = { deg: r.deg, midi: n.midi }; }
            }
          }
        }
      }
      if (nearest && G.singing) {
        const pMidi = T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, fictaAt(G.mt));
        refDeg = nearest.deg;
        refQ = T.quality(pMidi, T.stepOfDegree(G.playerDeg), nearest.midi, T.stepForMidi(nearest.midi, CFG.ROOT_MIDI), false);
        if (G.grace && refQ === 'dissonant') refQ = 'neutral';   // nothing frays in the finale. that was the promise.
      }
    }

    if (G.scene === 'freesing' && G.singing) {
      refDeg = T.degreeForMidi(bassMidiAt(G.mt) + 24, CFG.ROOT_MIDI);
      refQ = T.quality(T.midiForDegree(G.playerDeg, CFG.ROOT_MIDI, fictaAt(G.mt)), T.stepOfDegree(G.playerDeg), bassMidiAt(G.mt), bassStepAt(G.mt), true);
    }

    G.ribbon = refDeg != null && G.singing
      ? { on: true, soulDeg: refDeg, quality: refQ, sus: (susSoul.state === 'suspended' || susBass.state === 'suspended') ? 'suspended' : null, grace: G.grace }
      : { on: false };
  }

  // ------------------------------------------------------------- main loop
  let last = 0, acc = 0, stepping = false;
  function frame(ts) {
    requestAnimationFrame(frame);
    if (!last) last = ts;
    let dt = (ts - last) / 1000; last = ts;
    if (dt > 0.25) dt = 0.25;
    G.fps = G.fps * 0.95 + (1 / Math.max(dt, 1e-4)) * 0.05;
    if (!stepping) {
      acc += dt;
      while (acc >= CFG.DT) { step(CFG.DT); acc -= CFG.DT; }
    }
    if (G.singing) A.player.setMorph(G.mouse.x);
    W.draw(G, dt);
  }
  W.init(canvas);
  requestAnimationFrame(frame);

  // --------------------------------------------------------------- debug api
  window.__evensong = {
    state() {
      return {
        scene: G.scene, soulIdx: G.soulIdx, soulId: soul ? soul.id : null, loopCount: G.loopCount,
        mt: G.mt, groundBar: G.groundBar, playerDeg: G.playerDeg, singing: G.singing,
        knot: G.knotDesc, knotDone: knot ? !!knot.done : false, resolutionPending,
        warmth: G.warmth01, votives: G.votives.length, resolved: G.resolvedIds.slice(),
        fictaActive: G.fictaActive, susSoul: susSoul.state, susBass: susBass.state,
        events: G.events.slice(-30),
      };
    },
    step(ms) { stepping = true; const n = Math.round((ms / 1000) / CFG.DT); for (let i = 0; i < n; i++) step(CFG.DT); },
    live() { stepping = false; },
    setPointer(x01, y01, down) { setPointer(x01, y01, down); },
    yForString(i) {
      const y = W.yForDegree(i);
      return y / CFG.H;
    },
    start() { if (G.scene === 'title') beginGame(); },
    skipToSoul(i) {
      if (G.scene === 'title') beginGame();
      for (let k = G.soulIdx < 0 ? 0 : G.soulIdx; k < i; k++) {
        const s = S.SOULS[k];
        if (!G.resolvedIds.includes(s.id)) {
          G.votives.push({ tint: s.tint }); G.resolvedIds.push(s.id);
          if (s.groundGift.type !== 'figuration') A.addDrone(s.id, s.groundGift);
        }
      }
      if (i >= S.SOULS.length) startFinale(); else startSoulIntro(i);
    },
    completeKnot() { if (knot && !knot.done && !resolutionPending) { knotComplete(); } },
    release() { setPointer(G.mouse.x, G.mouse.y, false); },
    onEvent(f) { listeners.push(f); },
    events() { return G.events.slice(); },
    shot() { return canvas.toDataURL('image/png'); },
    G,
  };
})();
