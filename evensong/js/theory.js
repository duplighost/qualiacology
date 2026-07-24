// EVENSONG — the theory core. PURE: no window state, no audio, no canvas, no CFG.
// Everything here is real species counterpoint, boiled to what a mouse can play.
// Exported to window.THEORY in the browser and module.exports for node tests.
(function () {
  const T = {};

  // ---------------------------------------------------------------- pitch space
  // The ladder is D natural minor. "degree" = index on the ladder (0 = D3 ... 14 = D5).
  // "step" = scale step class mod 7 (0=D 1=E 2=F 3=G 4=A 5=Bb 6=C).
  T.STEP_SEMIS = [0, 2, 3, 5, 7, 8, 10];             // D E F G A Bb C, semitones above D (Bb = 8 — NOT 9; 9 would be B natural and the whole game would be dorian)
  T.STEP_NAMES = ['D', 'E', 'F', 'G', 'A', 'Bb', 'C'];

  T.stepOfDegree = deg => ((deg % 7) + 7) % 7;

  // midi for a ladder degree. rootMidi = midi of degree 0 (D3 = 50 in the game).
  // ficta: on cadence bars (bass A) the C string sings C# — musica ficta, applied to
  // SOUND only; the ladder and all interval STEP math stay diatonic.
  T.midiForDegree = function (deg, rootMidi, ficta) {
    const oct = Math.floor(deg / 7), step = T.stepOfDegree(deg);
    let m = rootMidi + oct * 12 + T.STEP_SEMIS[step];
    if (ficta && step === 6) m += 1;                  // C -> C#
    return m;
  };
  T.freqForMidi = m => 440 * Math.pow(2, (m - 69) / 12);

  // inverse of midiForDegree (ficta-tolerant): which ladder degree does this midi sit on?
  // May exceed the playable ladder (Wren sings above the top string — you can't reach her;
  // you sing under her). Used for rendering, never for judgment.
  T.degreeForMidi = function (midi, rootMidi) {
    const step = T.stepForMidi(midi, rootMidi);
    const base = rootMidi + T.STEP_SEMIS[step];
    const oct = Math.round((midi - base) / 12);
    return oct * 7 + step;
  };

  // step class for an absolute midi note (needed for souls' authored lines; C# maps to C-step).
  T.stepForMidi = function (midi, rootMidi) {
    const pc = ((midi - rootMidi) % 12 + 12) % 12;
    const TABLE = { 0: 0, 2: 1, 3: 2, 5: 3, 7: 4, 8: 5, 10: 6, 11: 6, 1: 0, 4: 2, 9: 5, 6: 3 };
    // 8=Bb (the sixth degree). 11=C# -> C-step (ficta); 1=D# -> D, 4=F# -> F (picardy),
    // 9=B natural -> Bb-step, 6=Ab -> G. Chromatic neighbors collapse onto their diatonic
    // parents; only 11 and 4 actually occur in the score.
    return TABLE[pc];
  };

  // ------------------------------------------------------------- interval judge
  // ic: diatonic interval class 0..6 (0 unison/8ve, 1 2nd, 2 3rd, 3 4th, 4 5th, 5 6th, 6 7th)
  T.intervalClass = (stepA, stepB) => ((stepA - stepB) % 7 + 7) % 7 <= ((stepB - stepA) % 7 + 7) % 7
    ? ((stepA - stepB) % 7 + 7) % 7 : ((stepB - stepA) % 7 + 7) % 7;
  // NOTE: intervalClass above returns the SMALLER of the two directions, which conflates
  // e.g. 2nd/7th. That is wrong for counterpoint. Use directed class from the LOWER note:
  T.icAbove = function (stepHi, stepLo) { return ((stepHi - stepLo) % 7 + 7) % 7; };

  // quality of the sounding interval between two absolute midis (+ their step classes).
  // vsBass: the 4th is dissonant against the bass (the actual rule); between upper voices it
  // is hollow-neutral. Tritones are dissonant regardless of their diatonic spelling.
  // returns 'imperfect' | 'perfect' | 'neutral' | 'dissonant'
  T.quality = function (midiA, stepA, midiB, stepB, vsBass) {
    const semis = Math.abs(midiA - midiB) % 12;
    if (semis === 6) return 'dissonant';                       // tritone, however spelled
    const icRaw = ((stepA - stepB) % 7 + 7) % 7;
    if ((icRaw === 0) && semis !== 0) return 'dissonant';      // augmented unison / diminished octave (C# against C): same step, wrong sound
    const lo = midiA <= midiB;
    const ic = lo ? T.icAbove(stepB, stepA) : T.icAbove(stepA, stepB);
    if (ic === 2 || ic === 5) return 'imperfect';              // 3rds & 6ths — the warm ones
    if (ic === 0 || ic === 4) return 'perfect';                // unison/8ve & 5th
    if (ic === 3) return vsBass ? 'dissonant' : 'neutral';     // the 4th
    return 'dissonant';                                        // 2nds & 7ths
  };

  T.isConsonant = q => q === 'imperfect' || q === 'perfect';

  // ---------------------------------------------------------- suspension machine
  // The heart of Margaret's level, live everywhere. A REAL suspension:
  //   PREPARE  — you are consonant with the reference voice,
  //   SUSPEND  — you hold the same note across the barline; the OTHER voice moves;
  //              on the new downbeat you are now dissonant,
  //   RESOLVE  — you step DOWN one degree to a consonance.
  // Broken by: leaping away, stepping up, over-holding, or re-attacking.
  // update() is called once per BEAT with a snapshot; returns an event string or null.
  T.SuspensionTracker = function (opts) {
    const maxHoldBeats = (opts && opts.maxHoldBeats) || 4;
    let state = 'idle';           // idle | prepared | suspended
    let heldDeg = null, susBeats = 0;
    const self = {
      get state() { return state; },
      reset() { state = 'idle'; heldDeg = null; susBeats = 0; },
      // beat: { singing, attacked, deg, quality ('imperfect'|...), isDownbeat, barChanged }
      update(beat) {
        if (!beat.singing) {
          const was = state; state = 'idle'; heldDeg = null; susBeats = 0;
          return was === 'suspended' ? 'broken' : null;        // dropping a suspension abandons it
        }
        const cons = T.isConsonant(beat.quality);
        switch (state) {
          case 'idle':
            if (cons) { state = 'prepared'; heldDeg = beat.deg; }
            return null;
          case 'prepared':
            if (beat.attacked || beat.deg !== heldDeg) {        // moved: maybe a fresh preparation
              state = cons ? 'prepared' : 'idle'; heldDeg = cons ? beat.deg : null;
              return null;
            }
            if (beat.barChanged && beat.isDownbeat && !cons) {  // the other voice moved under you
              state = 'suspended'; susBeats = 1;
              return 'suspended';
            }
            if (!cons) { state = 'idle'; heldDeg = null; }      // mid-bar clash is not a suspension
            return null;
          case 'suspended':
            if (beat.attacked || beat.deg !== heldDeg) {
              const down1 = beat.deg === heldDeg - 1;
              state = 'idle'; const hd = heldDeg; heldDeg = null; susBeats = 0;
              if (down1 && cons) { state = 'prepared'; heldDeg = beat.deg; return 'resolved'; }
              return 'broken';
            }
            if (cons) { state = 'prepared'; susBeats = 0; return 'dissolved'; } // ref moved again; no credit, no fault
            susBeats++;
            if (susBeats > maxHoldBeats) { state = 'idle'; heldDeg = null; susBeats = 0; return 'broken'; }
            return null;
        }
        return null;
      },
    };
    return self;
  };

  // ------------------------------------------------------------- knot primitives
  // Small, pure progress machines. game.js feeds them beat/bar events; score.js picks
  // parameters. Each: update(...) + .count/.done + reset().

  // WREN — the lander. During her stall bar: beats 0..n-2 consonant with her from BELOW,
  // final beat: land on step 0 (D, any octave). You go home first; she follows.
  T.LanderKnot = function () {
    let okBeats = 0, done = false;
    return {
      reset() { okBeats = 0; done = false; },
      get done() { return done; }, get progress() { return okBeats; },
      // beat: { inStallBar, beatInBar, lastBeat, singing, quality, playerBelowSoul, playerStep }
      update(b) {
        if (!b.inStallBar) { okBeats = 0; return; }
        if (!b.lastBeat) {
          if (b.singing && T.isConsonant(b.quality) && b.playerBelowSoul) okBeats++;
          else okBeats = 0;
        } else if (okBeats >= 2 && b.singing && b.playerStep === 0) done = true;
        else okBeats = 0;
      },
    };
  };

  // THOMAS — contrary motion. At bar transitions where his line moves, you must be
  // singing, have moved the OPPOSITE direction since the previous downbeat, and be
  // consonant on the new downbeat. Need N such transitions (they persist across loops).
  T.ContraryKnot = function (need) {
    let count = 0;
    return {
      reset() { count = 0; },
      get done() { return count >= need; }, get progress() { return count; },
      // t: { soulDelta, playerDelta, singing, quality }  (deltas: sign of motion across the barline)
      // Only outright dissonance disqualifies: a hollow 4th between upper voices while
      // moving contrary is perfectly good counterpoint.
      update(t) {
        if (!t.singing || t.soulDelta === 0 || t.playerDelta === 0) return false;
        if (Math.sign(t.playerDelta) !== -Math.sign(t.soulDelta)) return false;
        if (t.quality === 'dissonant') return false;
        count++; return true;
      },
    };
  };

  // MARGARET — N resolved suspensions within one loop (counter resets each loop).
  T.SuspensionKnot = function (need) {
    let count = 0;
    return {
      resetLoop() { count = 0; }, reset() { count = 0; },
      get done() { return count >= need; }, get progress() { return count; },
      onSuspensionEvent(evt) { if (evt === 'resolved') { count++; return true; } return false; },
    };
  };

  // NOBODY — the echo. Match a step sequence with your note ONSETS during the silence
  // window, in order, any octave. minMatch of them is enough (grace for one slip).
  T.EchoKnot = function (targetSteps, minMatch) {
    let ptr = 0, matched = 0, done = false;
    return {
      reset() { ptr = 0; matched = 0; done = false; },
      resetWindow() { ptr = 0; matched = 0; },
      get done() { return done; }, get progress() { return matched; },
      onOnset(step, inWindow) {
        if (done || !inWindow) return false;
        // advance pointer to the next occurrence of this step (allows skipping one)
        for (let k = ptr; k < targetSteps.length; k++) {
          if (targetSteps[k] === step) { ptr = k + 1; matched++; break; }
        }
        if (matched >= minMatch) done = true;
        return done;
      },
    };
  };

  // ELI — the rest. During his answer bars, silence is the counterpoint. You must have
  // actually sung with him earlier in the loop (engagement), then rest for restNeed of
  // the answer-window beats.
  T.RestKnot = function (engageNeed, restNeed) {
    let engaged = 0, rested = 0, done = false;
    return {
      reset() { engaged = 0; rested = 0; done = false; },
      resetLoop() { engaged = 0; rested = 0; },
      get done() { return done; },
      get progress() { return rested; }, get engaged() { return engaged; },
      // beat: { inAnswerBars, singing, quality }
      update(b) {
        if (done) return;
        if (!b.inAnswerBars) {
          if (b.singing && T.isConsonant(b.quality)) engaged++;
        } else {
          if (!b.singing) rested++;
          if (engaged >= engageNeed && rested >= restNeed) done = true;
        }
      },
    };
  };

  // --------------------------------------------------------------- pointer → pitch
  // Mouse Y to ladder degree with hysteresis: you must travel hystFrac past a string
  // boundary before the note changes. prevDeg = current degree or null.
  T.degreeFromY = function (y01, nStrings, prevDeg, hystFrac) {
    const exact = (1 - y01) * (nStrings - 1);          // top of screen = high string
    if (prevDeg == null) return Math.round(Math.max(0, Math.min(nStrings - 1, exact)));
    const d = exact - prevDeg;
    if (d > 0.5 + hystFrac) return Math.min(nStrings - 1, prevDeg + Math.max(1, Math.floor(d - 0.5 + 1e-9)));
    if (d < -(0.5 + hystFrac)) return Math.max(0, prevDeg + Math.min(-1, Math.ceil(d + 0.5 - 1e-9)));
    return prevDeg;
  };

  if (typeof window !== 'undefined') window.THEORY = T;
  if (typeof module !== 'undefined' && module.exports) module.exports = T;
})();
