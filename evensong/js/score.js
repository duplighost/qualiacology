// EVENSONG — the authored content. The ground, the five souls, the finale, all text.
// Melody notes: { bar, b (beat offset), midi, d (beats), vel? }. Bars index into the
// soul's own loop; the ground loop is always 4 bars (D C Bb A) underneath.
// Composition notes are in comments because the WHY of a note matters here as much as
// the WHY of a number in config.js.
window.SCORE = (function () {
  const S = {};

  // ---------------------------------------------------------------- the ground
  // Lament tetrachord, one note per bar: D2 C2 Bb1 A1. The oldest grief figure there is.
  // stepsMod7 are what the interval judge sees; ficta on bar 3 (the dominant) raises C->C#
  // for the PLAYER's C-string. The 8' rank doubles an octave up in audio.
  S.GROUND = {
    bassMidi: [38, 36, 34, 33],
    steps: [0, 6, 5, 4],
    fictaBars: [3],                       // bass A: the cadence bar. The C string sings C#.
  };

  // ------------------------------------------------------------------ the souls
  S.SOULS = [
    {
      id: 'wren', name: 'Wren',
      tint: '#cfe8d2', vowel: 'ee', vibRate: 6.0, vibDepth: 9, breath: 0.15,
      intro: 'Wren. Seven years old. She knew one song, and never got to the end of it.',
      epitaph: 'she reached the end of it.',
      loopBars: 8,
      // A skipping tune that stalls, twice, on scale degree 2 — the note before home.
      // She can see the door. She has never once gone through it.
      melody: [
        { bar: 0, b: 0, midi: 77, d: 1 }, { bar: 0, b: 1, midi: 76, d: 1 }, { bar: 0, b: 2, midi: 77, d: 1 },
        { bar: 1, b: 0, midi: 79, d: 1 }, { bar: 1, b: 1, midi: 76, d: 1 }, { bar: 1, b: 2, midi: 72, d: 1 },
        { bar: 2, b: 0, midi: 74, d: 1 }, { bar: 2, b: 1, midi: 77, d: 1 }, { bar: 2, b: 2, midi: 74, d: 1 },
        { bar: 3, b: 0, midi: 76, d: 3 },                                    // the stall. E5, held, hanging.
        { bar: 4, b: 0, midi: 77, d: 1 }, { bar: 4, b: 1, midi: 76, d: 1 }, { bar: 4, b: 2, midi: 77, d: 1 },
        { bar: 5, b: 0, midi: 81, d: 1 }, { bar: 5, b: 1, midi: 79, d: 1 }, { bar: 5, b: 2, midi: 76, d: 1 },
        { bar: 6, b: 0, midi: 77, d: 1 }, { bar: 6, b: 1, midi: 74, d: 1 }, { bar: 6, b: 2, midi: 77, d: 1 },
        { bar: 7, b: 0, midi: 76, d: 3 },                                    // stalls again. always here.
      ],
      knot: { type: 'lander', stallBars: [3, 7] },
      // Ghosts: C-string (sings C# here — ficta) a third under her E, then step home to D.
      // You land first. She follows you down.
      hints: [
        { onBars: [3, 7], beat: 0, deg: 13 }, { onBars: [3, 7], beat: 1, deg: 13 }, { onBars: [3, 7], beat: 2, deg: 14 },
      ],
      // She finally sings 3-2-1. Over the tonic. The home note holds on as a pedal
      // while the ground walks away beneath her — she is not leaving again.
      resolution: {
        startAtGroundBar: 0,
        notes: [
          { bar: 0, b: 0, midi: 77, d: 1 }, { bar: 0, b: 1, midi: 76, d: 1 }, { bar: 0, b: 2, midi: 74, d: 4 },
        ],
      },
      groundGift: { midi: 62, vowel: 'oo', db: -21 },   // a D held above the ground. a small high light.
    },

    {
      id: 'thomas', name: 'Thomas',
      tint: '#b8c4d4', vowel: 'oh', vibRate: 4.2, vibDepth: 6, breath: 0.1,
      intro: 'Thomas. A soldier. He kept step his whole life, even after the marching stopped.',
      epitaph: 'at ease.',
      loopBars: 4,
      // Parallel perfect motion with the ground, bar for bar — 5th, 5th, 5th, unison.
      // Lockstep. No voice of his own. This is what counterpoint calls a fault,
      // and what he called duty.
      melody: [
        { bar: 0, b: 0, midi: 57, d: 3 },   // A3 over D — a 5th
        { bar: 1, b: 0, midi: 55, d: 3 },   // G3 over C — a 5th. moving exactly with the bass
        { bar: 2, b: 0, midi: 53, d: 3 },   // F3 over Bb — a 5th
        { bar: 3, b: 0, midi: 57, d: 3 },   // A1 under A3 — octaves. nowhere is he free
      ],
      knot: { type: 'contrary', need: 4 },
      // A contrary line against his: rise while he falls, fall while he rises.
      // F4 G4 Bb4 A4 — every transition opposite, nothing dissonant.
      hints: [
        { onBars: [0], beat: 0, deg: 9 }, { onBars: [1], beat: 0, deg: 10 },
        { onBars: [2], beat: 0, deg: 12 }, { onBars: [3], beat: 0, deg: 11 },
      ],
      // His first leap. A fourth, up, to a note the ground never gave him. Then home.
      resolution: {
        startAtGroundBar: 0,
        notes: [
          { bar: 0, b: 0, midi: 62, d: 3 },  // D4 — the leap
          { bar: 1, b: 0, midi: 64, d: 2 }, { bar: 1, b: 2, midi: 57, d: 1 },  // E4, then A3. at ease.
        ],
      },
      groundGift: { midi: 50, vowel: 'oo', db: -19 },   // D3 — he holds the foundation now. of course he does.
    },

    {
      id: 'margaret', name: 'Margaret',
      tint: '#d8c8e8', vowel: 'ah', vibRate: 5.0, vibDepth: 10, breath: 0.12,
      intro: 'Margaret. She waited at the window for forty years. The window is still there.',
      epitaph: 'she stopped waiting.',
      loopBars: 4,
      // She prepares suspensions and abandons them upward, every time. Hope renewed
      // is pain renewed. The resolution is always one step down, and she never takes it.
      melody: [
        { bar: 0, b: 0, midi: 65, d: 3 },                                     // F4 over D — prepared
        { bar: 1, b: 0, midi: 65, d: 2 }, { bar: 1, b: 2, midi: 69, d: 1 },   // held into a 4th over C... then UP. escape
        { bar: 2, b: 0, midi: 69, d: 2 }, { bar: 2, b: 2, midi: 72, d: 1 },   // a 7th over Bb... up again
        { bar: 3, b: 0, midi: 72, d: 2 },                                     // C5 over A, fading. unresolved. again
      ],
      knot: { type: 'suspension', need: 2 },
      // The classic 7-6 chain, ghost-spelled: hold A4 into the Bb bar (a 7th), fall to G4;
      // hold G4 into the A bar (a 7th), fall to F4. Tension is not the enemy.
      // Spending it well is the whole art. You show her. Then she does it herself.
      hints: [
        { onBars: [1], beat: 0, deg: 11 },
        { onBars: [2], beat: 0, deg: 11 }, { onBars: [2], beat: 1, deg: 10 },
        { onBars: [3], beat: 0, deg: 10 }, { onBars: [3], beat: 1, deg: 9 },
      ],
      // Her first resolution: F4 held over the C bar — the 4-3 — down to E4, and the
      // D lands as the Bb arrives under it. Forty years, and it was one step.
      resolution: {
        startAtGroundBar: 0,
        notes: [
          { bar: 0, b: 0, midi: 65, d: 3 },
          { bar: 1, b: 0, midi: 65, d: 1 }, { bar: 1, b: 1, midi: 64, d: 2 },
          { bar: 2, b: 0, midi: 62, d: 3 },
        ],
      },
      groundGift: { midi: 53, vowel: 'oo', db: -20, picardyLift: true },  // F3 — the third. at the very end it rises to F#.
    },

    {
      id: 'nobody', name: 'the one with no name',
      tint: 'rgba(225,225,230,0.6)', vowel: 'mm', vibRate: 0, vibDepth: 0, breath: 0.5,
      intro: 'No one remembers the name. The voice stayed anyway.',
      epitaph: 'someone remembered.',
      loopBars: 4,
      // Four notes — D F E C — then two bars of silence where an answer should be.
      // It has been exactly this quiet for a very long time.
      melody: [
        { bar: 0, b: 0, midi: 62, d: 1 }, { bar: 0, b: 2, midi: 65, d: 1 },
        { bar: 1, b: 0, midi: 64, d: 1 }, { bar: 1, b: 2, midi: 60, d: 1 },
        // bars 2, 3: nothing. the silence IS the level.
      ],
      knot: { type: 'echo', steps: [0, 2, 1, 6], minMatch: 3, windowBars: [2, 3] },
      // Ghosts spell the fragment back in the silence, same rhythm, player's octave.
      hints: [
        { onBars: [2], beat: 0, deg: 7 }, { onBars: [2], beat: 2, deg: 9 },
        { onBars: [3], beat: 0, deg: 8 }, { onBars: [3], beat: 2, deg: 6 },
      ],
      // They answer AT ONCE — resolution starts on ground bar 2, right where your echo was.
      // And they finish the fragment: D F D, then C# (they accept the cadence), a breath,
      // and the last D lands exactly as the ground itself comes home. The fifth note was
      // their name all along. Nobody knew. Now the ground knows.
      resolution: {
        startAtGroundBar: 2,
        notes: [
          { bar: 0, b: 0, midi: 62, d: 1 }, { bar: 0, b: 1, midi: 65, d: 1 }, { bar: 0, b: 2, midi: 62, d: 1 },
          { bar: 1, b: 0, midi: 61, d: 2 },
          { bar: 2, b: 0, midi: 62, d: 3 },
        ],
      },
      groundGift: { midi: 74, vowel: 'oo', db: -24, breathy: true },  // D5, barely there. presence.
    },

    {
      id: 'eli', name: 'Eli',
      tint: '#e8d9b0', vowel: 'eh', vibRate: 5.5, vibDepth: 8, breath: 0.1,
      intro: 'Eli, the organist. He could never bear to let a piece end, so nothing he played ever did.',
      epitaph: 'he let it end.',
      loopBars: 8,
      // Endless ornament. Every time the cadence comes he runs upward instead.
      // Bars 6-7 he stops, holds one soft note, and waits for someone to say it's alright.
      melody: [
        { bar: 0, b: 0, midi: 62, d: .5 }, { bar: 0, b: .5, midi: 64, d: .5 }, { bar: 0, b: 1, midi: 65, d: .5 }, { bar: 0, b: 1.5, midi: 67, d: .5 }, { bar: 0, b: 2, midi: 69, d: .5 }, { bar: 0, b: 2.5, midi: 65, d: .5 },
        { bar: 1, b: 0, midi: 64, d: .5 }, { bar: 1, b: .5, midi: 67, d: .5 }, { bar: 1, b: 1, midi: 69, d: .5 }, { bar: 1, b: 1.5, midi: 67, d: .5 }, { bar: 1, b: 2, midi: 64, d: .5 }, { bar: 1, b: 2.5, midi: 60, d: .5 },
        { bar: 2, b: 0, midi: 65, d: .5 }, { bar: 2, b: .5, midi: 67, d: .5 }, { bar: 2, b: 1, midi: 65, d: .5 }, { bar: 2, b: 1.5, midi: 62, d: .5 }, { bar: 2, b: 2, midi: 58, d: .5 }, { bar: 2, b: 2.5, midi: 62, d: .5 },
        { bar: 3, b: 0, midi: 64, d: .5 }, { bar: 3, b: .5, midi: 61, d: .5 }, { bar: 3, b: 1, midi: 64, d: .5 }, { bar: 3, b: 1.5, midi: 69, d: 1.5 },   // the escape: up, and hold
        { bar: 4, b: 0, midi: 69, d: .5 }, { bar: 4, b: .5, midi: 65, d: .5 }, { bar: 4, b: 1, midi: 69, d: .5 }, { bar: 4, b: 1.5, midi: 74, d: .5 }, { bar: 4, b: 2, midi: 69, d: .5 }, { bar: 4, b: 2.5, midi: 65, d: .5 },
        { bar: 5, b: 0, midi: 67, d: .5 }, { bar: 5, b: .5, midi: 64, d: .5 }, { bar: 5, b: 1, midi: 67, d: .5 }, { bar: 5, b: 1.5, midi: 72, d: .5 }, { bar: 5, b: 2, midi: 67, d: .5 }, { bar: 5, b: 2.5, midi: 64, d: .5 },
        { bar: 6, b: 0, midi: 65, d: 3, vel: 0.4 },   // the answer bars. F4, pianissimo, expectant.
        { bar: 7, b: 0, midi: 64, d: 3, vel: 0.4 },   // E4 — degree 2. Wren's note. everyone stalls here.
      ],
      knot: { type: 'rest', answerBars: [6, 7], engageNeed: 5, restNeed: 4 },
      hints: [{ type: 'rest', onBars: [6, 7] }],
      // His cadence, when it finally comes, has no ornament in it at all.
      // Three plain quarter notes and a held tonic. The plainest line in the game
      // from the busiest voice in it.
      resolution: {
        startAtGroundBar: 0,
        notes: [
          { bar: 0, b: 0, midi: 65, d: 1 }, { bar: 0, b: 1, midi: 64, d: 1 }, { bar: 0, b: 2, midi: 62, d: 4 },
        ],
      },
      groundGift: { type: 'figuration' },   // the organist's gift: the ground itself learns to move. passing 8ths.
    },
  ];

  // ------------------------------------------------------------------ the finale
  // An 8-bar polyphonic variation, all five voices over the ground, looped FINALE_LOOPS
  // times. Composed so every soul's prison is now their gift: Wren descends and LANDS,
  // Thomas moves contrary to the bass, Margaret's suspensions resolve themselves,
  // the nameless one imitates Wren in free canon, Eli connects everything in 8ths.
  // Bar-by-bar the pillars are: Dm | C (4-3 sus) | Bb6 | A (6-5) | Dm | C | Bb | A -> D.
  S.FINALE = {
    loops: 3,
    voices: {
      wren: [    // the descant, in parallel 10ths with the ground — the warmest sound in the
        // game. She touches home at bar 2, leaves, and comes back: she can reach it now,
        // and she keeps coming back because she likes it.
        { bar: 0, b: 0, midi: 77, d: 3 }, { bar: 1, b: 0, midi: 76, d: 3 }, { bar: 2, b: 0, midi: 74, d: 3 }, { bar: 3, b: 0, midi: 76, d: 3 },
        { bar: 4, b: 0, midi: 77, d: 3 }, { bar: 5, b: 0, midi: 76, d: 3 }, { bar: 6, b: 0, midi: 74, d: 3 }, { bar: 7, b: 0, midi: 73, d: 2 }, { bar: 7, b: 2, midi: 74, d: 1 },
      ],
      margaret: [  // HER HINT CHAIN, sung by her: the 7-6 suspensions she was taught, held
        // across each barline and resolved by her own hand, twice — then the 4-3, then home.
        { bar: 0, b: 0, midi: 69, d: 7.5 },                                   // A4 held... into a 7th over Bb
        { bar: 2, b: 1.5, midi: 67, d: 3 },                                   // ...falls to G4. held into a 7th over A...
        { bar: 3, b: 1.5, midi: 65, d: 6 },                                   // ...falls to F4. held into a 4th over C...
        { bar: 5, b: 1.5, midi: 64, d: 1.5 },                                 // ...the 4-3. forty years, one step, three times.
        { bar: 6, b: 0, midi: 62, d: 3 }, { bar: 7, b: 0, midi: 61, d: 3 },
      ],
      thomas: [    // contrary to the ground at last: the bass falls D C Bb A; he rises D E F A.
        { bar: 0, b: 0, midi: 50, d: 3 }, { bar: 1, b: 0, midi: 52, d: 3 }, { bar: 2, b: 0, midi: 53, d: 3 }, { bar: 3, b: 0, midi: 57, d: 3 },
        { bar: 4, b: 0, midi: 62, d: 3 }, { bar: 5, b: 0, midi: 55, d: 3 }, { bar: 6, b: 0, midi: 62, d: 3 }, { bar: 7, b: 0, midi: 57, d: 3 },
      ],
      nobody: [    // free imitation, one bar behind, never parallel with anyone. (silent in
        // bar 0 — they enter answering, the way they were answered.)
        { bar: 1, b: 0, midi: 69, d: 3 }, { bar: 2, b: 0, midi: 70, d: 3 },
        { bar: 3, b: 0, midi: 65, d: 1.5 }, { bar: 3, b: 1.5, midi: 64, d: 1.5 },   // the 6-5 sigh over the dominant
        { bar: 4, b: 0, midi: 69, d: 3 }, { bar: 5, b: 0, midi: 64, d: 3 }, { bar: 6, b: 0, midi: 65, d: 3 }, { bar: 7, b: 0, midi: 64, d: 3 },
      ],
      eli: [       // figuration binding the pillars. same four patterns, twice.
        { bar: 0, b: 0, midi: 62, d: .5 }, { bar: 0, b: .5, midi: 65, d: .5 }, { bar: 0, b: 1, midi: 69, d: .5 }, { bar: 0, b: 1.5, midi: 65, d: .5 }, { bar: 0, b: 2, midi: 62, d: .5 }, { bar: 0, b: 2.5, midi: 65, d: .5 },
        { bar: 1, b: 0, midi: 64, d: .5 }, { bar: 1, b: .5, midi: 67, d: .5 }, { bar: 1, b: 1, midi: 72, d: .5 }, { bar: 1, b: 1.5, midi: 67, d: .5 }, { bar: 1, b: 2, midi: 64, d: .5 }, { bar: 1, b: 2.5, midi: 67, d: .5 },
        { bar: 2, b: 0, midi: 62, d: .5 }, { bar: 2, b: .5, midi: 65, d: .5 }, { bar: 2, b: 1, midi: 70, d: .5 }, { bar: 2, b: 1.5, midi: 65, d: .5 }, { bar: 2, b: 2, midi: 62, d: .5 }, { bar: 2, b: 2.5, midi: 65, d: .5 },
        { bar: 3, b: 0, midi: 61, d: .5 }, { bar: 3, b: .5, midi: 64, d: .5 }, { bar: 3, b: 1, midi: 69, d: .5 }, { bar: 3, b: 1.5, midi: 64, d: .5 }, { bar: 3, b: 2, midi: 61, d: .5 }, { bar: 3, b: 2.5, midi: 64, d: .5 },
        { bar: 4, b: 0, midi: 62, d: .5 }, { bar: 4, b: .5, midi: 65, d: .5 }, { bar: 4, b: 1, midi: 69, d: .5 }, { bar: 4, b: 1.5, midi: 65, d: .5 }, { bar: 4, b: 2, midi: 62, d: .5 }, { bar: 4, b: 2.5, midi: 65, d: .5 },
        { bar: 5, b: 0, midi: 64, d: .5 }, { bar: 5, b: .5, midi: 67, d: .5 }, { bar: 5, b: 1, midi: 72, d: .5 }, { bar: 5, b: 1.5, midi: 67, d: .5 }, { bar: 5, b: 2, midi: 64, d: .5 }, { bar: 5, b: 2.5, midi: 67, d: .5 },
        { bar: 6, b: 0, midi: 62, d: .5 }, { bar: 6, b: .5, midi: 65, d: .5 }, { bar: 6, b: 1, midi: 70, d: .5 }, { bar: 6, b: 1.5, midi: 65, d: .5 }, { bar: 6, b: 2, midi: 62, d: .5 }, { bar: 6, b: 2.5, midi: 65, d: .5 },
        { bar: 7, b: 0, midi: 61, d: .5 }, { bar: 7, b: .5, midi: 64, d: .5 }, { bar: 7, b: 1, midi: 69, d: .5 }, { bar: 7, b: 1.5, midi: 64, d: .5 }, { bar: 7, b: 2, midi: 61, d: .5 }, { bar: 7, b: 2.5, midi: 64, d: .5 },
      ],
    },
    // the fermata: the whole choir converges on the dominant and HOLDS. A major, spread wide.
    fermataChord: { ground: [33, 45], thomas: 52, margaret: 61, eli: 64, nobody: 69, wren: 76 },
    // the resolution: D MAJOR — the Picardy third, the only major chord in the game.
    // Margaret gets the F#. The one who waited gets the note that changes everything.
    picardyChord: { ground: [38, 50], thomas: 57, margaret: 66, eli: 62, nobody: 69, wren: 74 },
    peelOrder: ['eli', 'thomas', 'margaret', 'nobody', 'ground', 'wren'],   // the child's D5 is the last thing you hear.
  };

  // -------------------------------------------------------------------- the text
  S.TEXT = {
    title: 'EVENSONG',
    subtitle: 'sing them to rest.',
    begin: 'click, then hold to sing.',
    tutorial: 'hold the left button to sing. move the mouse to find her.',
    tutorial2: 'gold means you’re with her.',
    finaleIntro: 'they’re all here. sing with them.',
    fermata: 'you can rest now.',
    patience: 'whenever you’re ready.',
    endAgain: 'again',
    endStay: 'stay a while',
  };

  return S;
})();
