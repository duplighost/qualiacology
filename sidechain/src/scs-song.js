// Summa Cum Stupid: its course, its looks, its moments and what stands along the way. (album.js puts
// it in the record; the place itself is in scs-world.js, its things in scs-props.js.)
//
// A carnival on a summer night, ridden like its own coaster. Blue hour at the arch, SUMMA CUM LAUDE
// in its bulbs until "stupid"; the band, and every bulb comes on. The midway (her 4.0 on the board,
// the claw machine's plush brains, one picked up on "pickup"); the stop, over the dark in silence;
// the strength tester's bell on "pop", the board blue-screening; "summa cum stupid!" over the
// carousel. The swings, the drop tower falling on "losing control", fireworks on every "summa cum".
// The big top for the talk and the spelling bee; the carousel again, the wall of W's, the rock in
// its case, 4.0 going to 0.4, the rock on the podium in a mortarboard; the bass out and only the
// bulbs; then the trophy she chases, floating ahead on balloons, down at the end.

// the bars, as the drums have them (95 bpm; the band comes in on 7.98, stops on 27.85, back on 29.69):
// 0.46 2.95 5.48 7.98 10.54 13.08 15.56 18.12 20.77 23.41 25.99 28.47 30.98 33.59 36.21 38.85 41.47 ...
// 57.01 ... 75.02 ... 85.25 ... 110.63 ... 118.20 120.68 123.19 ... 133.25 ... 148.26 150.84

const DUSK = {
  zenith: 0x0a0c2e, horizon: 0x5a2a5e, skyGlow: 0xff6a7a, glowDir: [0.25, 0.04, 1], skyline: 0x140c22, moonDir: [-0.4, 0.45, 0.8], moon: 0xffe4f0,
  fog: 0x1e1230, fogDensity: 0.0015, stars: 0.35, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.2,
  ground: 0x16241a, street: 0xffc070, roof: 0x2a1a2a, wall: 0x3a2a3a, tree: 0x0e1a12,
  window: 0xffd27a, windowAlt: 0x7ae8ff, lamp: 0xffd090,
  ribbon: 0x1a0c24, edge: 0xfff0f8, fret: 0xff7ad0, glow: 0xff4ab0, hold: 0xff3aa8, gate: 0xffffff, gem: 0xffd84a,
  skyLight: 0x9a8ac8, bounce: 0x4a2440, hemiK: 1.7, sunK: 0.6,
  board: 0x1a1020, suit: 0x16121c, jacket: 0xff4ab0, hair: 0x1a1210, shoes: 0xf0e8f0, gloves: 0x16121c, rim: 0xffc0e8, daze: 0,
};

export const palettes = {
  scsDusk: DUSK,
  // the band in: every bulb on, warm
  scsMidway: { horizon: 0x6a2a5a, skyGlow: 0xff7a6a, fog: 0x22122c, skyLight: 0xc8a8c8, bounce: 0x5a2a3a, hemiK: 2.0, glow: 0xffb040, hold: 0xff9a2a, fret: 0xffd070, edge: 0xfff4e0, gem: 0xffd84a },
  // the stop: the lights cut
  scsDark: { zenith: 0x040410, horizon: 0x140a1e, skyGlow: 0x3a1a3a, fog: 0x08060e, skyLight: 0x3a3450, bounce: 0x140a14, hemiK: 0.9, glow: 0x8a5aff, hold: 0x7a4aff, fret: 0xa88aff },
  // back on, building: magenta
  scsBuild: { horizon: 0x5a1a5a, skyGlow: 0xff4ab0, fog: 0x1e0e2a, skyLight: 0xc898d8, bounce: 0x4a1a40, hemiK: 1.9, glow: 0xff4ad0, hold: 0xff3ac0, fret: 0xff9ae8 },
  // "her big brain blue-screens"
  scsBlue: { zenith: 0x020a3a, horizon: 0x0a2a8a, skyGlow: 0x3a6aff, fog: 0x081a4a, skyLight: 0x7a9aff, bounce: 0x10204a, hemiK: 1.9, glow: 0x4a8aff, hold: 0x3a7aff, fret: 0x9ac0ff, edge: 0xe8f0ff, ribbon: 0x06103a },
  // "summa cum stupid!": hot pink and gold, the sky gone to night
  scsCandy: { zenith: 0x06061e, horizon: 0x3a1040, skyGlow: 0xff3aa0, fog: 0x1a0a22, fogDensity: 0.0014, stars: 0.7, skyLight: 0xe0a8d8, bounce: 0x5a1a3a, hemiK: 2.2, glow: 0xff3aa8, hold: 0xff2a9a, fret: 0xffd84a, edge: 0xfff0f8, gem: 0xffe060 },
  // "go stupid": pink and cyan
  scsWild: { horizon: 0x2a1048, skyGlow: 0x3ad8ff, fog: 0x140a26, skyLight: 0xa8c8f0, bounce: 0x2a1a4a, hemiK: 2.2, glow: 0x3ae8ff, hold: 0x2ad0ff, fret: 0xff6ad8, edge: 0xf0ffff },
  // the band alone: the swings in purple
  scsSwing: { horizon: 0x2a1450, skyGlow: 0xb05aff, fog: 0x160c2a, skyLight: 0xb0a0e0, bounce: 0x2a1a40, hemiK: 2.0, glow: 0xb06aff, hold: 0xa05aff, fret: 0xffd84a },
  // the big top: amber, red, sawdust
  scsTent: { fog: 0x2a120a, fogDensity: 0.0022, skyLight: 0xffd8a8, bounce: 0x6a2a14, hemiK: 2.0, glow: 0xffb040, hold: 0xff8a2a, fret: 0xffe0a0, edge: 0xfff4e0, ribbon: 0x1e0c08, gem: 0xffd84a },
  // out on the midway again, all of it lit
  scsPrize: { zenith: 0x05051a, horizon: 0x3a1438, skyGlow: 0xffa040, fog: 0x1c0e22, fogDensity: 0.0015, stars: 0.8, skyLight: 0xe0b8c8, bounce: 0x4a2a2a, hemiK: 2.1, glow: 0xffc040, hold: 0xffa82a, fret: 0xff6ad0 },
  // "four-point-oh malfunction": a red flicker
  scsFault: { skyGlow: 0xff2a2a, fog: 0x2a0a10, skyLight: 0xff9a9a, bounce: 0x5a1010, glow: 0xff3a3a, hold: 0xff2a2a },
  // the bass out: only the bulbs
  scsChant: { zenith: 0x02020a, horizon: 0x1a0818, skyGlow: 0x6a1a4a, fog: 0x0c0610, fogDensity: 0.0018, skyLight: 0x5a4a6a, bounce: 0x1a0a14, hemiK: 1.2, glow: 0xff4ab0, hold: 0xff3aa8, fret: 0xffd84a },
  // the band back for the last of it
  scsFinal: { zenith: 0x04041a, horizon: 0x4a1048, skyGlow: 0xff4ad0, fog: 0x1a0a24, fogDensity: 0.0013, stars: 0.9, skyLight: 0xe8b0e0, bounce: 0x5a1a4a, hemiK: 2.3, glow: 0xff4ad0, hold: 0xff3ac0, fret: 0x5ae8ff, edge: 0xffffff },
  // "the trophy I chase": gold
  scsGold: { horizon: 0x5a2a20, skyGlow: 0xffb040, fog: 0x22140c, skyLight: 0xffd8a0, bounce: 0x6a3a1a, hemiK: 2.3, glow: 0xffd040, hold: 0xffb42a, fret: 0xfff0b0, edge: 0xfff8e8, gem: 0xfff0a0 },
  // after the last note
  scsEnd: { zenith: 0x020210, horizon: 0x1a0c20, skyGlow: 0x8a4a2a, fog: 0x0c0810, fogDensity: 0.0017, skyLight: 0x8a7a8a, bounce: 0x2a1a14, hemiK: 1.6, glow: 0xffc040, hold: 0xffa82a },
};

export const song = {
  id: 'summa-cum-stupid',
  accent: '#ff4ab0',
  title: 'Summa Cum Stupid',
  collect: 'w',
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 15 },                                                           // "summa cum laude in the streets": the lot, the arch
    { t: 7.98, kind: 'verse', endY: 30 },                                                          // the band: in under the arch, every bulb on; the lift hill
    { t: 27.85, kind: 'break', start: 'launch', launchBeats: 3, kick: 10, endY: 14, gap: true },   // the stop: the drop, over the dark in silence
    { t: 29.69, kind: 'pre', endY: 24 },                                                           // the band back; "the higher the grades"
    { t: 38.85, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, c: 1.2, endY: 12, gap: true }, // "summa cum stupid!": over the carousel
    { t: 57.01, kind: 'chorus', c: 1.3, endY: 13 },                                                // "go stupid"
    { t: 75.02, kind: 'post', endY: 12 },                                                          // the band alone: the swings
    { t: 85.25, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7, endY: 12, turn: 0.3 },    // "she dropped a TED Talk": in at the big top
    { t: 110.63, kind: 'pre', endY: 19 },                                                          // "rock where my brain should be"
    { t: 119.43, kind: 'break', endY: 16 },                                                        // the bass out: only the bulbs
    { t: 123.84, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, c: 1.25, endY: 12 },    // the band back
    { t: 133.25, kind: 'final', c: 1.35, endY: 12 },                                               // "the trophy I chase"
    { t: 150.18, kind: 'outro', endY: 6 },                                                         // the last note
  ],
  rails: [
    { t: 77.56, bars: 2, x: 0 },       // the band alone, past the swings
    { t: 100.57, beats: 4, x: 0 },     // "spinning on my carousel": round past it on the rail
    { t: 140.75, bars: 2, x: 0 },      // "so I can't stop"
  ],
  palette: 'scsDusk',
  world: 'scs',
  groundStyle: 'country',
  lift: { beams: { colors: [0xff4ab0, 0xffd84a, 0x4ae8ff] } },
  titleView: { ahead: -0.14, x: 1.6, h: 1.7, back: -0.9, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'scsDusk' },
    { t: 7.98, palette: 'scsMidway', fade: 0.2 },      // the band: every bulb on
    { t: 27.9, palette: 'scsDark', fade: 0.08 },       // the stop
    { t: 29.69, palette: 'scsBuild', fade: 0.1 },      // back on
    { t: 38.1, palette: 'scsBlue', fade: 0.1 },        // "her big brain blue-screens"
    { t: 38.95, palette: 'scsCandy', fade: 0.15 },     // "summa cum stupid!"
    { t: 57.01, palette: 'scsWild', fade: 0.4 },       // "go stupid"
    { t: 75.02, palette: 'scsSwing', fade: 0.8 },      // the band alone
    { t: 85.3, palette: 'scsTent', fade: 0.25 },       // the big top
    { t: 100.0, palette: 'scsPrize', fade: 0.4 },      // out on the midway
    { t: 112.0, palette: 'scsFault', fade: 0.1 },      // "four-point-oh malfunction"
    { t: 113.4, palette: 'scsPrize', fade: 0.5 },
    { t: 119.5, palette: 'scsChant', fade: 0.3 },      // the bass out
    { t: 123.9, palette: 'scsFinal', fade: 0.12 },     // the band back
    { t: 133.4, palette: 'scsGold', fade: 0.8 },       // "the trophy I chase"
    { t: 151.5, palette: 'scsEnd', fade: 1.8 },        // after the last note
  ],
  moments: [
    { t: 5.14, kind: 'pop', k: 0.25, flash: 0.04 },                 // the arch flips to STUPID
    { t: 7.98, kind: 'flash', k: 0.3 },                             // the band: every bulb on
    { t: 24.30, kind: 'ring', k: 0.22, dur: 0.4 },                  // the claw closes on a brain
    { t: 27.86, kind: 'blackout', dur: 1.82, k: 0.72 },             // the stop
    { t: 29.69, kind: 'flash', k: 0.22 },
    { t: 36.85, kind: 'bell', k: 0.55 },                            // "the louder the pop": the bell
    { t: 38.85, kind: 'flash', k: 0.3 },
    { t: 39.75, kind: 'fireworks', n: 8, y: 52, ahead: 1.4, x: 30 },  // "summa cum stupid!"
    { t: 63.25, kind: 'impact', k: 0.45 },                          // "losing control": the drop
    { t: 65.05, kind: 'fireworks', n: 6, y: 56, ahead: 1.6, x: 32 },  // "summa cum"
    { t: 67.73, kind: 'fireworks', n: 6, y: 56, ahead: 1.6, x: 32 },
    { t: 70.89, kind: 'fireworks', n: 6, y: 56, ahead: 1.6, x: 32 },
    { t: 73.51, kind: 'fireworks', n: 8, y: 60, ahead: 1.6, x: 32 },
    { t: 85.25, kind: 'flash', k: 0.25 },                           // in at the big top
    { t: 91.13, kind: 'pop', k: 0.3, flash: 0.05 },                 // "babbling": the slides come apart
    { t: 112.45, kind: 'pop', k: 0.35, flash: 0.06 },               // "malfunction"
    { t: 116.4, kind: 'ring', k: 0.4, dur: 0.9 },                   // "the best degree"
    { t: 123.84, kind: 'flash', k: 0.35 },                          // the band back
    { t: 123.84, kind: 'fireworks', n: 8, y: 56, ahead: 1.6, x: 32 },
    { t: 133.33, kind: 'fireworks', n: 6, y: 60, ahead: 1.8, x: 34 },  // "the trophy I chase"
    { t: 140.23, kind: 'fireworks', n: 6, y: 60, ahead: 1.6, x: 34 },  // "so I can't stop"
    { t: 147.23, kind: 'fireworks', n: 10, y: 64, ahead: 1.6, x: 34 },
  ],
  scenery: {
    rooms: [
      // the big top: the talk stage, the chairs, the spelling bee
      { style: 'tent', from: 85.25, to: 99.8, ends: [[16, 32], [14, 28]] },   // (its ends, tent-shaped, are scs-world.js's)
    ],
    zones: [
      // the booths and the food both sides
      { from: -4, to: 85.0, kits: ['scsMidway'], every: 1.3, clear: [[6.4, 9.6], [14.6, 18.2, 1], [25.0, 28.4, 1], [36.8, 40.2, -1], [39.6, 43.4, 1], [38.4, 41.2], [46.0, 49.2, -1], [65.6, 69.4, 1], [78.4, 81.8, 1]] },
      { from: 100.2, to: 162, kits: ['scsMidway'], every: 1.3, clear: [[102.6, 106.6, -1], [108.6, 112.2, 1], [110.8, 114.4, -1], [113.4, 117.0, 1], [117.6, 121.2, -1]] },
      // the poles and their bulb strings
      { from: -4, to: 85.1, kits: ['scsBulbs'], every: 0.72, x: 22 },
      { from: 99.9, to: 162, kits: ['scsBulbs'], every: 0.72, x: 22 },
      // the trestles under the road
      { from: -4, to: 84.9, kits: ['scsCoaster'], every: 0.42 },
      { from: 100.1, to: 162, kits: ['scsCoaster'], every: 0.42 },
      // the rides off in the distance
      { from: -2, to: 160, kits: ['scsRides'], every: 3.4, x: 100 },
      // the big top's chairs, across from the stage
      { from: 86.2, to: 99.2, kits: ['scsChairs'], every: 0.34, n: 8, x0: -15 },
      { from: 0, to: 0.1, kits: ['scsProps'], at: [
        { t: 7.98, x: 0, kind: 'arch', rot: Math.PI, flip: 5.14 },                      // in under the arch; "stupid" flips its bulbs
        { t: 16.4, x: 30, kind: 'score', s: 0.9 },                                       // "her 4.0 face"
        { t: 26.2, x: 40, kind: 'claw', grab: 24.30, s: 2.0 },                           // "one perfect pickup for that big brain tease"
        { t: 38.4, x: -30, kind: 'striker', ring: 36.85, s: 1.25 },                               // "the higher the grades, the louder the pop"
        { t: 41.4, x: 44, kind: 'score', s: 1.3 },                                       // "her big brain blue-screens"
        { t: 40.0, x: -28, kind: 'carousel', s: 1.3, speed: 0.6 },                                            // "summa cum stupid!": flown over
        { t: 47.6, x: -50, kind: 'swing' },
        { t: 66.4, x: 46, kind: 'drop', drop: 63.25, up: 54.0, s: 0.5 },                         // "a genius losing control"
        { t: 80.1, x: 48, kind: 'swing', s: 1.1 },
        { t: 93.4, x: 36, kind: 'stage', babble: 91.13, floor: true },                   // "she dropped a TED Talk"; "babbling nonsense"
        { t: 99.2, x: -26, kind: 'bee', floor: true },                                   // "she forgets how to spell"
        { t: 104.6, x: -46, kind: 'carousel', s: 1.2, speed: 0.9 },                      // "spinning on my carousel"
        { t: 110.4, x: 40, kind: 'wstack', s: 1.4 },                                             // "stacking all the W's"
        { t: 112.6, x: -34, kind: 'rock', s: 1.7 },                                              // "rock where my brain should be"
        { t: 115.2, x: 42, kind: 'score', s: 1.4 },                                      // "four-point-oh malfunction"
        { t: 118.6, x: -34, kind: 'podium', degree: 116.4, s: 2.0 },                     // "the dumbest one here got the best degree"
      ] },
    ],
    signs: [
      { key: 'scsLAUDE', text: 'SUMMA CUM LAUDE', color: '#ffd84a', core: '#fff8e0', bg: '#140a1e' },
      { key: 'scsSTUPID', text: 'SUMMA CUM STUPID', color: '#ff4ab0', core: '#fff0f8', bg: '#140a1e' },
      { key: 'scsRING', text: 'RING TOSS', color: '#ffd84a', core: '#fffbe8', bg: '#0e0814' },
      { key: 'scsPOP', text: 'BALLOON POP', color: '#ff4a7a', core: '#fff0f4', bg: '#0e0814' },
      { key: 'scsGPA', text: 'GUESS YOUR GPA', color: '#5ae8ff', core: '#f0ffff', bg: '#0e0814' },
      { key: 'scsIQ', text: 'TEST YOUR IQ', color: '#ffb03a', core: '#fff6e8', bg: '#0e0814' },
      { key: 'scsBRAIN', text: 'BIG BRAIN', color: '#ff7ad0', core: '#fff0fa', bg: '#0e0814' },
      { key: 'scsWIN', text: 'WINNER\nEVERY TIME', color: '#7aff9a', core: '#f0fff4', bg: '#0e0814' },
      { key: 'scsDEAN', text: "DEAN'S LIST", color: '#ffd84a', core: '#fffbe8', bg: '#0e0814' },
      { key: 'scsHONOR', text: 'HONOR ROLL', color: '#b07aff', core: '#f8f0ff', bg: '#0e0814' },
      { key: 'scsSTEP', text: 'STEP\nRIGHT UP', color: '#ff4a4a', core: '#fff0f0', bg: '#0e0814' },
      { key: 'scsDUCK', text: 'DUCK POND', color: '#5ae8ff', core: '#f0ffff', bg: '#0e0814' },
      { key: 'scsFUNNEL', text: 'FUNNEL CAKE', color: '#ffd84a', core: '#fffbe8', bg: '#1a0c08' },
      { key: 'scsLEMON', text: 'LEMONADE', color: '#fff04a', core: '#fffff0', bg: '#1a0c08' },
      { key: 'scsCORN', text: 'CORN DOGS', color: '#ff9a3a', core: '#fff4e8', bg: '#1a0c08' },
      { key: 'scsCOTTON', text: 'COTTON\nCANDY', color: '#ff8ad8', core: '#fff0fa', bg: '#1a0c08' },
      { key: 'scsPOPCORN', text: 'POPCORN', color: '#ffe07a', core: '#fffaf0', bg: '#1a0c08' },
      { key: 'scsCLAW', text: 'BIG BRAINS', color: '#ff7ad0', core: '#fff0fa', bg: '#12081a' },
      { key: 'scsSTRIKE', text: 'HIGH SCORE', color: '#ffd84a', core: '#fffbe8', bg: '#12081a' },
      { key: 'scsWS', text: "ALL THE W'S", color: '#ffd84a', core: '#fffbe8', bg: '#12081a' },
    ],
    // the boards carry only lines the hearings agree on ("from summa cum laude straight to summa cum
    // drool" and "I turn honor roll brains" came out too many ways to print)
    lyricPart: 'scsBoard', lyricX: 0, lyricBg: '#1a0c22', lyricColor: '#ffd84a', lyricCore: '#fff8e8',
    lyrics: [
      { t: 0.0, text: 'SUMMA CUM LAUDE\nIN THE STREETS', h: 14, lead: 2.4 },
      { t: 11.64, text: 'SHE STRUTS STRAIGHT IN\nWITH HER 4.0 FACE', h: 14 },
      { t: 18.0, text: 'QUOTING FOUCAULT FOR SURE,\nFAKING HER GRACE', h: 14 },
      { t: 23.0, text: 'ONE PERFECT PICKUP\nFOR THAT BIG BRAIN TEASE', h: 14 },
      { t: 34.57, text: 'THE HIGHER THE GRADES,\nTHE LOUDER THE POP', h: 14 },
      { t: 39.75, text: 'SUMMA CUM STUPID!', h: 15, lead: 1.2 },
      { t: 60.59, text: 'NOTHING HARDER THAN\nA GENIUS LOSING CONTROL', h: 15 },
      { t: 85.29, text: 'SHE DROPPED A TED TALK\nLAST MONTH', h: 14, lead: 1.8 },
      { t: 90.23, text: "NOW SHE'S BABBLING NONSENSE,\nYEAH, HER LEGS WON'T QUIT", h: 14 },
      { t: 95.27, text: 'I WHISPER GOOD GIRL\nAND SHE FORGETS HOW TO SPELL', h: 14 },
      { t: 99.77, text: 'GOT THE VALEDICTORIAN\nSPINNING ON MY CAROUSEL', h: 14 },
      { t: 105.59, text: "YEAH, I'M THE SMOOTH-BRAINED IDIOT\nSTACKING ALL THE W'S", h: 14 },
      { t: 111.83, text: 'FOUR-POINT-OH MALFUNCTION\nEVERY TIME SHE LOOKS AT ME', h: 14 },
      { t: 114.29, text: 'TURNS OUT THE DUMBEST ONE HERE\nGOT THE BEST DEGREE', h: 14 },
      { t: 133.33, text: 'THE TROPHY I CHASE', h: 15 },
      { t: 140.23, text: "SO I CAN'T STOP IT", h: 15 },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'scs', t: 154.2, x: -28, s: 1.0, rot: -2.2, fireAt: 150.3, chase: 133.3, land: 150.3, orbit: { r: 60, h: 10, y: 14, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 46, heroUp: 1.9 } },
  },
};
