// The record: which songs, in what order, how each one is built.
// Section times are seconds into the song, each on the beat the music changes.
// kinds: intro verse pre chorus post bridge break final outro
// start: 'launch' makes the section open with a lip you fly off (kick = m/s upward).

// a doorway between the rooms of her apartment
const DOOR = { kind: 'wall', hw: 11.5, hh: 30 };
// and between the rooms of the house in his head
const HDOOR = { kind: 'wall', hw: 11.5, hh: 30 };
// and between the rooms of the funeral home
const FHDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the school's doors between its halls
const SDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the factory's doors between its rooms
const UDOOR = { kind: 'wall', hw: 13, hh: 28 };
// the courthouse's doors
const CDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the costume shop's doors
const KDOOR = { kind: 'wall', hw: 12, hh: 28 };
// the doorways of her house, and into her
const ADOOR = { kind: 'wall', hw: 12, hh: 28 };
// the venue's doorways
const BPDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
const CCDOOR = { kind: 'wall', hw: 14, hh: 30 };
const CHDOOR = { kind: 'wall', hw: 12, hh: 26 };
const LBDOOR = { kind: 'wall', hw: 12, hh: 27 };
const MNDOOR = { kind: 'wall', hw: 12, hh: 26 };
const SPDOOR = { kind: 'wall', hw: 13, hh: 30 };

export const ALBUM = [
  {
    // one night, from the edge of town to the middle of the highway: the wreck on the shoulder,
    // the cops at the bomb threat, the hill coming down; over the freeway in the quiet; the
    // strip; the lighter flipped in the dark, the window that goes on "break"; two cars
    // meeting on "crash", one rolling over her on "break my neck", the hill again; the drywall
    // with the secrets in it, the whiskey, the wreckage; the warnings, the cross by the road;
    // the climb under the helicopter's light, the pin, the city going off, and the two cars
    // kissing in the middle of the highway.
    id: 'kiss-me-like-a-car-crash',
    accent: '#ff3d8b',
    title: 'Kiss Me Like a Car Crash',
    collect: 'lips',
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 13.13, kind: 'chorus', c: 1.1 },
      { t: 20.28, kind: 'break', start: 'launch', kick: 9, endY: 10, gap: true },   // the band stops: over the freeway in the quiet, land on the stab
      { t: 22.99, kind: 'post', endY: 10 },
      { t: 31.29, kind: 'verse' },
      { t: 48.00, kind: 'pre' },
      { t: 53.58, kind: 'chorus', start: 'launch', kick: 11 },           // the stop before "showed up like a car crash"
      { t: 74.48, kind: 'verse' },
      { t: 86.90, kind: 'pre', endY: 30 },
      { t: 99.49, kind: 'bridge', endY: 50 },                            // "this has to end ... pull the pin"
      { t: 111.98, kind: 'final', start: 'launch', kick: 14, endY: 5, gap: true },  // the pin: the road goes up
      { t: 149.0, kind: 'outro' },
    ],
    rails: [
      { t: 24.37, bars: 2, x: 0 },        // the band back: along the strip
      { t: 131.47, bars: 3, x: 0 },       // the last instrumental bars, down into the city
    ],
    palette: 'carcrash',
    world: 'crash',
    lift: { beams: { colors: [0xff2040, 0x3a6aff, 0xffffff] } },
    looks: [
      { t: -99, palette: 'carcrash', set: { fogDensity: 0.0019, windowK: 1.7, skyLight: 0x8a6ab0, hemiK: 2.3, lamp: 0xa85a22, gate: 0x3ac8d8 } },
      { t: 13.13, fade: 0.3, set: { skyGlow: 0xff2f6a, horizon: 0x4a1650, window: 0xffc27a, lamp: 0x9a5020 } },
      { t: 20.28, fade: 0.2, set: { zenith: 0x02030a, horizon: 0x141a3a, skyGlow: 0x5a6ad8, fog: 0x10142a, window: 0x8aa0ff, lamp: 0x4a5a8a, street: 0x8aa0ff, edge: 0xdff6ff } },   // the quiet
      { t: 22.99, fade: 0.25, set: { horizon: 0x5a1a3a, skyGlow: 0xff7a3a, fog: 0x3a1828, street: 0xffa04a, lamp: 0xa05a24, window: 0xffc070 } },                                 // the strip
      { t: 31.29, fade: 1.5, palette: 'carcrash' },
      { t: 36.7, fade: 0.3, set: { window: 0x2a1a20, windowAlt: 0x2a1020, lamp: 0x3a2018, street: 0x3a2018, skyGlow: 0x5a1a30, fogDensity: 0.0028 } },                     // "in the dark"
      { t: 39.4, fade: 2.5, palette: 'carcrash' },                                                                                                                            // the flame
      { t: 53.58, fade: 0.3, set: { skyGlow: 0xff2f6a, horizon: 0x4a1650, window: 0xffc27a, lamp: 0x9a5020 } },
      { t: 74.48, fade: 1.2, set: { horizon: 0x4a2a6a, skyGlow: 0x9a6aff, fog: 0x2a1a44, window: 0xffd0a0, windowAlt: 0x5ff2ff, lamp: 0x6a5a9a, windowK: 2.0, skyLight: 0x9a7ac8 } },   // downtown, every window lit
      { t: 86.9, fade: 2.5, set: { skyGlow: 0xffa020, horizon: 0x4a2a14, fog: 0x2a1a10, lamp: 0xa06a10, street: 0xffb020, glow: 0xffb020 } },                               // the warnings
      { t: 99.49, fade: 1.2, set: { zenith: 0x080004, horizon: 0x3a0a14, skyGlow: 0xff1a2a, fog: 0x1a0610, fogDensity: 0.0017, window: 0xff6a5a, lamp: 0x9a2a20, street: 0xff3a2a, edge: 0xff6a7a } },   // everything gets worse
      { t: 111.98, fade: 0.15, set: { zenith: 0x10041a, horizon: 0x7a1a5a, skyGlow: 0xff4fb0, fog: 0x3a1236, fogDensity: 0.0014, window: 0xffe0a0, windowAlt: 0xff8fe0, lamp: 0xa07a40, street: 0xffb070, edge: 0x7ff6ff } },   // the pin
      { t: 149.0, fade: 6, set: { zenith: 0x0a0a1c, horizon: 0x5a3a6a, skyGlow: 0xff9a7a, fog: 0x3a2a44, fogDensity: 0.0016 } },                                            // first light over the highway
    ],
    moments: [
      { t: 22.99, kind: 'flash', k: 0.25 },                // the band back
      { t: 49.5, kind: 'glass', k: 0.6 },                  // "break the things"
      { t: 54.91, kind: 'impact', k: 0.7 },                // "car crash"
      { t: 62.55, kind: 'impact', k: 0.55 },               // the roll lands
      { t: 111.98, kind: 'flash', k: 0.6 },                // the pin
      { t: 111.98, kind: 'fireworks', n: 10, y: 52, ahead: 1.6 },
      { t: 114.73, kind: 'fireworks', n: 6, y: 46, ahead: 1.4 },     // "wreck"
      { t: 117.51, kind: 'flash', k: 0.35 },               // "bomb threat"
      { t: 117.51, kind: 'fireworks', n: 12, y: 40, ahead: 1.4 },
      { t: 140.74, kind: 'fireworks', n: 8, y: 26, ahead: 1.8 },     // "just fuck me"
    ],
    scenery: {
      zones: [
        // the edge of town; the wrecks on the shoulder, the cops, the hill
        { from: -4, to: 8.3, kits: ['suburb'], water: true },
        { from: 9.8, to: 12.6, kits: ['suburb'] },
        { from: 14.4, to: 20.6, kits: ['suburb'] },
        { kits: ['kcWrecks'], at: [[4.6, -24, 0.5, 0xd8d0e0], [5.0, 23, -0.7, 0x3a3a44]] },
        { kits: ['kcCops'], at: 9.0, side: 1, x: 27 },
        { kits: ['kcHill'], at: 13.4, x: -80 },
        // over the freeway in the quiet
        { kits: ['kcFreeway'], at: 21.55, h: 5 },
        // the strip; the lighter on its roof; the shop whose window goes
        { from: 23.2, to: 37.6, kits: ['strip'] },
        { from: 41.0, to: 50.2, kits: ['strip'] },
        { kits: ['kcShopFront'], at: 50.9, x: 24, s: 1.8, sign: 'FLOWERS' },
        // the city: the intersection, the ramp, the hill again
        { from: 51.8, to: 55.2, kits: ['city'], wake0: 0.6 },
        { from: 57.8, to: 62.5, kits: ['city'], wake0: 0.6 },
        { kits: ['kcRamp'], at: 63.2, x: 34 },
        { kits: ['kcCops'], at: 61.6, side: -1, x: 27 },
        { from: 64.0, to: 65.6, kits: ['city'], wake0: 0.6 },
        { kits: ['kcHill'], at: 66.3, x: -82 },
        { from: 67.2, to: 88.6, kits: ['city'], wake0: 0.6 },
        { kits: ['kcDrywall'], at: 77.0, x: 23 },
        { kits: ['kcWhiskey'], at: 78.4, x: -27 },
        { kits: ['kcNeon'], from: 74.6, to: 88.4, every: 0.3, x: 19 },
        { kits: ['kcTangle'], at: 89.2 },
        { kits: ['kcCopRow'], from: 100.4, to: 111.2, every: 0.62, onRibbon: true },
        { kits: ['kcNeon'], from: 127.5, to: 140.5, every: 0.34, x: 20, signs: ['HOTEL', 'BAR', 'KISS', 'OPEN', 'DANCING', 'LIVETONIGHT', 'CHAPEL', 'ENCORE'] },
        // downtown: the warnings, the cross, the climb
        { from: 89.8, to: 115.3, kits: ['downtown'], wake0: 0.6 },
        { from: 117.6, to: 127, kits: ['downtown'], wake0: 0.6 },
        { kits: ['kcWarnings'], from: 91.4, to: 97.6, every: 0.42, x: 19.5, s: 1.8, cells: [0, 2, 3, 0, 1, 2] },
        { kits: ['kcCross'], at: 97.0, x: -21, s: 1.8 },
        // the last chorus: the cops again, the hill, the wrecks burning down the shoulders
        { kits: ['kcCops'], at: 117.7, side: 1, x: 27 },
        { kits: ['kcHill'], at: 123.3, x: -82, s: 1.1 },
        { kits: ['kcWrecks'], burn: true, at: [[126.4, -23, 0.6, 0xd84060], [129.2, 22, -0.5, 0x3a3a44], [133.0, -22, 2.2, 0xe8e0d0], [137.2, 23, -2.6, 0x5a8ad8], [141.0, -22, 0.3, 0xffd04a], [145.0, 22, 1.1, 0xd8d0e0]] },
        { from: 127, to: 141, kits: ['city'], wake0: 0.6 },
        { from: 141, to: 172, kits: ['strip'] },
        { kits: ['kcCops'], at: 150.8, side: -1, x: 26 },
      ],
      crash: {
        slides: [{ at: 11.73, t: 13.4, n: 18 }, { at: 64.63, t: 66.3, n: 22, cars: 5 }, { at: 121.04, t: 123.3, n: 26, cars: 6 }],
        meets: [{ at: 54.91, t: 56.4, a: 0xff2f86, b: 0xa9dcff }, { at: 114.73, t: 116.2, a: 0xffd04a, b: 0x5ff2ff }],
        flips: [{ at: 61.85, t: 63.2, x0: 30, x1: -44, peak: 14, turns: 1.5, tint: 0xffd04a }],
        shatters: [{ at: 49.5, t: 50.9, x: 24, s: 1.8 }],
        lighter: { at: 36.86, t: 39.7, x: -26, h: 0, s: 1.35 },
        heli: { from: 99.0, to: 112.2 },
        freeway: { t: 21.55, h: 5 },
      },
      roads: [
        { x: 0, width: 12, walk: 3.5, laneLines: 0, from: -10, to: 13.5, traffic: false, lampEvery: 18, follow: true },
        { x: 0, width: 40, walk: 5, laneLines: 3, median: true, from: 13.5, to: 175, lanes: [-17.5, -13.5, 13.5, 17.5], density: 0.9, police: 0.06, lampEvery: 27, follow: true },
      ],
      shelf: 70, drop: 5,
      lyrics: [
        { t: 0.4, text: 'KISS ME LIKE\nA CAR CRASH', lead: 2.2 },
        { t: 10.6, text: 'LOVE ME LIKE\nA LANDSLIDE', side: 1 },
        { t: 16.7, text: "DON'T SAY\nGOODBYE" },
        { t: 36.6, text: 'YOU FLIPPED A LIGHTER\nIN THE DARK', side: 1 },
        { t: 47.7, text: 'I ONLY BREAK THE THINGS\nI WANT TO KEEP', side: -1 },
        { t: 55.7, text: 'I WANNA\nTASTE THE WRECK' },
        { t: 86.9, text: 'WE TANGLED UP\nIN WRECKAGE', side: -1 },
        { t: 92.9, text: 'IF LOVE IS\nJUST A WARNING', side: -1 },
        { t: 95.5, text: 'LEAVE ME\nWHERE I DIED' },
        { t: 104.9, text: 'PULL THE PIN', side: -1 },
        { t: 106.3, text: 'HOLD ME CLOSE' },
        { t: 123.6, text: 'STILL BREATHING\nIN THE DIRT', side: 1 },
        { t: 135.7, text: 'JUST SAY\nGOODBYE' },
      ],
      finale: { t: 151.75, x: 3, onRibbon: true, fireAt: 143.9, orbit: { hero: false, r: 21, h: 10, y: 0.5, right: 0.4, back: 1.2, swing: 0.25 } },   // on her road, just past where she stops
    },
  },
  {
    // the product, launched over the city at night: the countdown, the loading bars, the robot
    // arms for writing and painting and dating. The freeway home in the rain, the house at the end
    // of the street with every window lit, the front door, and there she is: a glow in the wall,
    // a voice in a speaker. Dinner on the table. Inside her for every chorus: the server hall.
    // The bedtime story about Trajan, version 2, and at the end, on the table: we need to talk.
    id: 'ai-gf',
    accent: '#46f0e0',
    title: 'AI GF',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 10 },                                                   // "three, two, one"
      { t: 4.23, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },         // "yay!"
      { t: 11.61, kind: 'verse', c: 0.9, endY: 14 },
      { t: 20.23, kind: 'break', endY: 18 },                                                  // "why?"
      { t: 25.15, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10 },      // "A.I. for writing"
      { t: 44.85, kind: 'break', endY: 16 },                                                  // "see where I'm going?"
      { t: 49.76, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },        // "bad weather in the sky"
      { t: 58.38, kind: 'verse', endY: 12 },                                                  // "as you pull up to your house"
      { t: 63.30, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                              // "open up the front door"
      { t: 68.23, kind: 'pre', start: 'launch', launchBeats: 4, kick: 7, endY: 24, turn: 0.3 },     // "now your day just got better"
      { t: 79.30, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10, turn: 0.3 }, // "cause she's your A.I. waifu girlfriend"
      { t: 95.30, kind: 'break', endY: 14, turn: 0.3 },                                       // "steak and potatoes"
      { t: 100.22, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 11, turn: 0.3 },  // "why go out for a date?"
      { t: 108.84, kind: 'verse', start: 'launch', launchBeats: 4, kick: 7, endY: 12, turn: 0.3 },  // "going out with the boys"
      { t: 115.01, kind: 'break', endY: 14, turn: 0.3 },                                      // "staying here"
      { t: 118.67, kind: 'verse', c: 0.85, endY: 13, turn: 0.3 },                             // sweet or with a little bit of sass
      { t: 124.83, kind: 'break', endY: 18, turn: 0.3 },                                      // "what are you looking at?"
      { t: 128.53, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10, turn: 0.3 },
      { t: 143.29, kind: 'break', endY: 13, turn: 0.3 },
      { t: 145.76, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 12, turn: 0.3 },  // "tell me a story"
      { t: 159.29, kind: 'pre', endY: 18, turn: 0.3 },                                        // "have you heard of Emperor Trajan"
      { t: 166.68, kind: 'verse', endY: 12, turn: 0.3 },                                      // "she will only improve over time"
      { t: 172.83, kind: 'break', endY: 18, turn: 0.3 },                                      // "her databanks learn what you like"
      { t: 179.00, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 10, turn: 0.3 },
      { t: 188.85, kind: 'post', endY: 12, turn: 0.3 },
      { t: 197.46, kind: 'bridge', endY: 20, turn: 0.3 },                                     // "advanced machine learning algorithm"
      { t: 208.53, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 14, turn: 0.3 },
      { t: 210.99, kind: 'break', endY: 16, turn: 0.3 },                                      // "superior version 2"
      { t: 219.62, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10, turn: 0.3, gap: true },   // version 2 at full power: over the hole
      { t: 233.14, kind: 'final', c: 1.2, endY: 12, turn: 0.3 },
      { t: 241.76, kind: 'outro', endY: 6, turn: 0.3 },                                       // "hey, we need to talk"
    ],
    palette: 'aiCity',
    world: 'smarthome',
    collect: 'chip',
    titleView: { ahead: -0.16, x: 1.2, h: 2.4, back: -0.9, lookH: 7.0 },   // behind her, the countdown up over the street
    looks: [
      { t: -99, palette: 'aiCity' },
      { t: 20.3, palette: 'aiHush', fade: 0.5 },       // "why?"
      { t: 24.9, palette: 'aiCity', fade: 0.3 },
      { t: 47.4, palette: 'aiRain', fade: 1.2 },       // the freeway home in the rain
      { t: 58.4, palette: 'aiStreet', fade: 2.0 },
      { t: 64.6, palette: 'aiHome', fade: 0.4 },       // in the front door
      { t: 79.3, palette: 'aiServers', fade: 0.25 },   // inside her
      { t: 95.3, palette: 'aiHome', fade: 0.3 },
      { t: 128.5, palette: 'aiServers', fade: 0.25 },
      { t: 145.8, palette: 'aiNight', fade: 0.5 },     // bedtime
      { t: 159.3, palette: 'aiRome', fade: 0.4 },      // Trajan
      { t: 166.7, palette: 'aiNight', fade: 0.6 },
      { t: 173.4, palette: 'aiBanks', fade: 1.5 },     // her databanks
      { t: 179.0, palette: 'aiServers', fade: 0.25 },
      { t: 197.5, palette: 'aiLab', fade: 0.4 },       // the algorithm
      { t: 211.0, palette: 'aiV2', fade: 0.5 },        // version 2
      { t: 219.6, palette: 'aiFinal', fade: 0.25 },
      { t: 242.2, palette: 'aiDark', fade: 0.5 },      // "hey, we need to talk"
      { t: 249.0, palette: 'aiOff', fade: 2.0 },       // "I can't do this anymore"
    ],
    moments: [
      { t: 4.0, kind: 'fireworks', n: 10, ahead: 2.8, x: 46, y: 48, size: 1.0 },   // "yay!"
      { t: 4.0, kind: 'pop', k: 0.45 },
      { t: 8.96, kind: 'flash', k: 0.3 },                  // "activation complete"
      { t: 9.0, kind: 'bell', k: 0.4, degree: 0 },
      { t: 9.15, kind: 'bell', k: 0.4, degree: 2 },
      { t: 9.3, kind: 'bell', k: 0.4, degree: 4 },
      { t: 9.5, kind: 'bell', k: 0.45, degree: 7 },
      { t: 50.3, kind: 'thunder', k: 1.0 },                // "bad weather in the sky"
      { t: 56.2, kind: 'thunder', k: 0.55 },
      { t: 65.6, kind: 'ring', k: 0.3 },                   // "there she is"
      { t: 172.3, kind: 'knock', n: 1, k: 0.6 },           // the walls go
      { t: 215.0, kind: 'flash', k: 0.35 },                // "version 2"
      { t: 215.0, kind: 'bell', k: 0.45, degree: 0 },
      { t: 215.14, kind: 'bell', k: 0.45, degree: 4 },
      { t: 215.28, kind: 'bell', k: 0.45, degree: 7 },
      { t: 215.5, kind: 'bell', k: 0.5, degree: 9 },
    ],
    confetti: [[4.0, 8.0], [219.62, 241.0]],
    confettiColors: [0xff4fd8, 0x46f0e0, 0xffffff, 0x8a6aff, 0xffd23a, 0xff8ae0],
    rails: [
      { t: 52.22, bars: 2, x: 0 },        // the freeway home in the rain: "your workday was so bad"
      { t: 146.99, bars: 2, x: 0 },       // "lying prostrate on your bed"
    ],
    confettiNormal: true,
    scenery: {
      // when he's singing her line of light moves; she smirks, she smiles
      voice: [[0, 4.6], [5.6, 5.7], [6.4, 11.2], [11.7, 20.1], [21.5, 21.9], [24.2, 25.9], [26.8, 28.6], [29.4, 32.6], [33.1, 37.6], [38, 40], [40.3, 45], [45.4, 46.8], [47.2, 78], [79.3, 89.2], [89.7, 98.5], [99.1, 103.8], [104.2, 108.9], [109.2, 131.5], [132.3, 133], [133.3, 136.5], [137.5, 146.2], [147.1, 181.9], [182.8, 187.1], [188.1, 196.7], [197.4, 233.3], [233.8, 235.2], [236.2, 237.8], [238.8, 240.5], [241.8, 242.6], [243.3, 246.1], [246.6, 250.4], [252.2, 255.8], [256.9, 258.1]],
      moods: [[113.78, 116.4, 1], [154.28, 156.6, 2]],
      halo: { t: 47.2, y: 120, r: 95, tilt: 0.25, on: 8.96, until: 49 },
      door: { t: 64.53, open: 63.5 },
      roomEvents: { spouse: 60.84, off: 247.0 },
      windowRain: 0.7,
      rooms: [
        { style: 'home', from: 64.53, to: 68.23, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, ADOOR] },   // "open up the front door"
        { style: 'home', from: 68.23, to: 73.15, caps: [null, ADOOR] },                                  // "she is wearing your favorite sweater"
        { style: 'home', from: 73.15, to: 79.30, caps: [null, ADOOR] },                                  // dinner; her love
        { style: 'servers', from: 79.30, to: 95.30, caps: [null, ADOOR] },                               // inside her
        { style: 'home', from: 95.30, to: 108.84, caps: [null, ADOOR] },                                 // "steak and potatoes on your plate"
        { style: 'home', from: 108.84, to: 118.67, caps: [null, ADOOR] },                                // "going out with the boys"
        { style: 'home', from: 118.67, to: 128.53, caps: [null, ADOOR] },                                // "sweet or with a little bit of sass"
        { style: 'servers', from: 128.53, to: 145.76, caps: [null, ADOOR] },
        { style: 'night', from: 145.76, to: 159.29, caps: [null, ADOOR] },                               // "tell me a story"
        { style: 'rome', from: 159.29, to: 166.68, caps: [null, ADOOR] },                                // "have you heard of Emperor Trajan"
        { style: 'night', from: 166.68, to: 179.00, caps: [null, ADOOR], fallAt: 172.3, fallFor: 2.0 },  // "her databanks learn what you like"
        { style: 'servers', from: 179.00, to: 197.46, caps: [null, ADOOR] },
        { style: 'lab', from: 197.46, to: 210.99, caps: [null, ADOOR] },                                 // "advanced machine learning algorithm"
        { style: 'v2', from: 210.99, to: 241.76, caps: [null, ADOOR] },                                  // "superior version 2"
        { style: 'dark', from: 241.76, to: 280 },                                                        // "hey, we need to talk"
      ],
      zones: [
        // the city at night, her launch: towers back from the street, searchlights, her ads
        { from: -4, to: 47.3, kits: ['aiTowers'], x: 48, clear: [[23.6, 46.6]] },
        { from: -3, to: 20.4, kits: ['aiSearch'], x: 56, every: 1.0 },
        { from: 24.6, to: 47.2, kits: ['aiSearch'], x: 60, every: 1.0 },
        { from: 0, to: 0.1, kits: ['aiBig'], at: 4.7, lift: 15, frames: [[-99, 0], [0.64, 1], [1.26, 0], [1.64, 1], [2.0, 2], [4.0, 3]] },
        { from: 5, to: 11, kits: ['aiBars'], at: [[6.9, -9, 0, 5.62, 6.24], [7.9, 9, 1, 6.24, 7.5], [9.0, -9, 2, 7.5, 8.96], [10.5, 0, 3, 8.96, 8.97, 1.0]], lift: 14 },
        { from: 11, to: 47, kits: ['aiAds'], at: [[13.6, -64], [15.9, 64], [18.2, -64], [33.8, 64], [36.6, -64], [39.2, 64]], pole: 24 },
        // the arms on their plinths: writing, painting, dating, sewing, growing
        { from: 24, to: 46, kits: ['aiArms'], at: [[25.4, 40, 'pen', 0, 24.2], [27.9, -40, 'brush', 1, 26.8], [29.6, 40, 'rose', 2, 28.3], [43.0, -40, 'needle', 3, 41.8], [45.0, 42, 'can', 4, 43.6]] },
        // the freeway home in the rain: sound walls, the lamps, the city off past them
        { from: 47.2, to: 58.4, kits: ['aiNoise'], x: 47 },
        { from: 47.2, to: 58.4, kits: ['highway'], x: 33 },
        { from: 47.2, to: 58.4, kits: ['highway'], x: -33 },
        { from: 47.2, to: 58.4, kits: ['aiTowers'], x: 130, lampX: 999 },
        // the street, her house at the end of it
        { from: 58.2, to: 64.3, kits: ['suburb'] },
        // inside: her, your sweater, dinner, her love; the furniture along the walls
        { from: 64.9, to: 79.0, kits: ['aiFurniture'], clear: [[65.9, 67.9, -1], [70.9, 72.9, 1], [73.2, 75.6, -1]] },
        { from: 95.6, to: 128.3, kits: ['aiFurniture'], clear: [[99.2, 101.4, 1], [104.4, 106.6, -1], [109.6, 111.6, 1], [114.0, 116.0, -1], [126.3, 128.4, 1]] },
        { from: 146.0, to: 159.0, kits: ['aiFurniture'], dim: 0.3, clear: [[149.0, 151.0, -1], [154.5, 156.5, 1]] },
        { from: 166.9, to: 172.2, kits: ['aiFurniture'], dim: 0.3, clear: [[169.4, 171.4, -1]] },
        { from: 66.9, to: 72, kits: ['aiPillar'], at: [[66.9, -26], [71.9, 26, true]] },
        { from: 74.4, to: 74.5, kits: ['aiTable'], at: 74.4, x: -27, lift: 73.6 },
        { from: 76.9, to: 77, kits: ['aiHeart'], at: 76.9, lift: 19 },
        // inside her: racks, trays
        { from: 79.5, to: 95.2, kits: ['aiRacks'], rows: [24], trays: 0.6 },
        // steak and potatoes, why go out, the money stays in
        { from: 100.3, to: 100.4, kits: ['aiPlate'], at: 100.3, x: 25 },
        { from: 105.5, to: 105.6, kits: ['aiPiggy'], at: 105.5, x: -26 },
        // going out with the boys: the keys; her, smirking; sweet or sass; her eye
        { from: 110.6, to: 110.7, kits: ['aiKeys'], at: 110.6, x: 26, y: 22 },
        { from: 112.6, to: 112.7, kits: ['aiPillar'], at: [[112.6, -26]] },
        { from: 116.1, to: 116.2, kits: ['aiFace'], at: 116.1, lift: 10 },
        { from: 123.4, to: 123.5, kits: ['aiSlider'], at: 123.4, lift: 13, k0: 122.0, k1: 123.5 },
        { from: 127.4, to: 127.5, kits: ['aiEye'], at: 127.4, x: 24, y: 22, turn: 126.2 },
        { from: 128.7, to: 145.6, kits: ['aiRacks'], rows: [24], trays: 0.6 },
        // bedtime: the stars, her smile, the spinner while she thinks
        { from: 150.0, to: 150.1, kits: ['aiProjector'], at: 150.0, x: -24, s: 1.6 },
        { from: 153.6, to: 153.7, kits: ['aiPillar'], at: [[153.6, 26]] },
        { from: 156.4, to: 156.5, kits: ['aiFace'], at: 156.4, lift: 10 },
        { from: 158.1, to: 158.2, kits: ['aiSpinner'], at: 158.1, lift: 11, s: 1.2, on: [156.7, 159.2] },
        // Rome: the column, the date, the laurels, the arch
        { from: 160.6, to: 160.7, kits: ['aiColumn'], at: 160.6, x: -30 },
        { from: 163.1, to: 163.2, kits: ['aiTablet'], at: 163.1, x: 26, s: 1.3 },
        { from: 164.9, to: 165.0, kits: ['aiWreath'], at: 164.9, lift: 15 },
        { from: 165.2, to: 165.3, kits: ['aiArch'], at: 165.2 },
        // she only improves; she never ages; the walls go and there are the databanks; the bottles
        { from: 168.0, to: 168.1, kits: ['aiBars'], at: [[168.0, 0, 4, 166.76, 169.0, 0.9]], lift: 13 },
        { from: 170.4, to: 170.5, kits: ['aiHourglass'], at: 170.4, x: -24, s: 1.3 },
        { from: 171.0, to: 179.0, kits: ['aiRacks'], rows: [70, 100, 130], every: 0.22, ahead: 12 },
        { from: 175.0, to: 175.7, kits: ['aiBottles'], at: [[175.0, 24], [175.6, -26]] },
        { from: 179.2, to: 197.3, kits: ['aiRacks'], rows: [24], trays: 0.6 },
        // the algorithm, the swatches, the names
        { from: 198.6, to: 198.7, kits: ['aiNet'], layers: [198.6, 199.4, 200.2, 201.0] },
        { from: 203.9, to: 205.3, kits: ['aiSwatches'], at: [[203.9, -12, 0], [204.6, 0, 1], [205.3, 12, 2]], lift: 19 },
        { from: 207.6, to: 207.7, kits: ['aiName'], at: 207.6, lift: 13, names: [[206.56, 0], [206.98, 1], [208.18, 2]] },
        // version 2, her at full power
        { from: 211.2, to: 241.6, kits: ['aiRacks'], rows: [24], trays: 0.6 },
        { from: 216.2, to: 216.3, kits: ['aiTwo'], at: 216.2, lift: 17, pop: 214.9, s: 1.4 },
      ],
      roads: [
        { x: 0, width: 26, walk: 6, laneLines: 2, median: true, from: -10, to: 47.2, lanes: [-10, -3.5, 3.5, 10], density: 0.35, lampEvery: 30 },
        { x: 0, width: 56, walk: 0, laneLines: 3, median: true, from: 47.2, to: 58.3, lanes: [-24, -17, -10, 10, 17, 24], density: 1.1, lampEvery: 40 },
        { x: 0, width: 14, walk: 3.5, laneLines: 0, from: 58.3, to: 64.6, lanes: [-3.5, 3.5], density: 0.1, lampEvery: 24 },
      ],
      // the traffic on the freeway: cars on the road with you, tail lights in the rain
      vehicles: [
        { kind: 'sedan', paint: 0x2a3a5a, at: 49.6, rate: 0.55, x: -1, lane: 2.2, from: 47.0, to: 52.0 },
        { kind: 'sedan', paint: 0xc8ccd4, at: 50.9, rate: 0.55, x: 1, lane: 2.2, from: 47.6, to: 53.4 },
        { kind: 'sedan', paint: 0x8a1a2a, at: 52.4, rate: 0.6, x: -1, lane: 2.0, from: 49.0, to: 55.0 },
        { kind: 'sedan', paint: 0x1a1a20, at: 53.9, rate: 0.55, x: 1, lane: 2.4, from: 50.5, to: 56.5 },
        { kind: 'sedan', paint: 0x5a6a7a, at: 55.5, rate: 0.6, x: -1, lane: 2.2, from: 52.0, to: 58.2 },
        { kind: 'sedan', paint: 0xe8e4dc, at: 57.0, rate: 0.55, x: 1, lane: 2.2, from: 53.5, to: 58.4 },
      ],
      lyricPart: 'aiBoard', lyricX: 0, lyricBg: '#06080e', lyricColor: '#ff5ad8', lyricCore: '#ffeefc',
      lyrics: [
        { t: 21.54, text: 'WHY?', h: 16 },
        { t: 48.14, text: 'TRAFFIC ON\nTHE FREEWAY', part: 'aiGantry', lead: 1.3, h: 22, bg: '#0b5d3b', color: '#ffffff', core: '#ffffff', frame: 'rgba(0,0,0,0)' },
        { t: 50.18, text: 'BAD WEATHER\nIN THE SKY', part: 'aiGantry', lead: 1.3, h: 25, bg: '#0b5d3b', color: '#ffffff', core: '#ffffff', frame: 'rgba(0,0,0,0)' },
        { t: 65.5, text: 'THERE SHE IS', side: 1, x: 14, h: 16 },
        { t: 79.26, text: "SHE'S YOUR A.I.\nWAIFU GIRLFRIEND", lead: 1.6, h: 17 },
        { t: 89.66, text: 'YOU CAN NEVER\nGO BACK', h: 16 },
        { t: 101.36, text: 'WHY GO OUT\nFOR A DATE?', h: 15 },
        { t: 115.7, text: 'STAYING HERE', h: 15 },
        { t: 159.2, text: 'HAVE YOU HEARD OF\nEMPEROR TRAJAN', h: 17 },
        { t: 214.02, text: 'SUPERIOR\nVERSION 2', h: 16 },
      ],
      shelf: 70, drop: 5,
      // the end card: her arms up, low and from behind, the giant phone over her saying it
      finale: { kind: 'talk', t: 259.4, x: -26, fireAt: 241.8, say: 241.96, orbit: { y: 24, heroBack: 10.5, heroUp: 0.7, heroFov: 54, heroTilt: 3, heroSide: 1.4, heroPan: 0.2 } },
    },
  },
  {
    // the town sings it, through a whole year: winter, the first warm Friday,
    // summer, the last car south in September, the first cold rain
    id: 'summer-people',
    accent: '#ffb070',
    title: 'Summer People',
    collect: 'shell',
    startY: 13,
    ribbonWidth: 0.62,
    camLift: 0.7,
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 15.93, kind: 'verse', endY: 9 },
      { t: 49.86, kind: 'pre', endY: 24 },                                   // "first warm Friday"
      { t: 65.39, kind: 'chorus', start: 'launch', kick: 10, endY: 8 },      // a breath of silence, then summer
      { t: 97.86, kind: 'verse', endY: 10 },
      { t: 131.31, kind: 'chorus', start: 'launch', kick: 11, endY: 8 },
      { t: 165.76, kind: 'bridge', endY: 26 },                               // "but hey, you in the window in February"
      { t: 190.19, kind: 'break', endY: 30 },
      { t: 194.61, kind: 'break', start: 'launch', kick: 9, endY: 26 },      // the music stops; hits are jumps
      { t: 202.27, kind: 'break', start: 'launch', kick: 9, endY: 30, gap: true },   // the boardwalk gives out: over the hole
      { t: 207.27, kind: 'final', start: 'launch', kick: 13, endY: 5 },      // first cold rain, plywood going up
      { t: 261.0, kind: 'outro' },
    ],
    palette: 'winter',
    ground: 'ocean',
    world: 'beach',
    looks: [
      { t: -99, palette: 'winter', set: { windowK: 1.2 } },
      { t: 49.86, palette: 'spring', fade: 6, set: { windowK: 1.5 } },
      { t: 66.0, palette: 'summer', fade: 1.6, set: { windowK: 1.6 } },
      { t: 98.0, palette: 'summernight', fade: 10, set: { windowK: 1.9 } },     // "every cottage window open eye"
      { t: 166.36, palette: 'september', fade: 9, set: { windowK: 1.3 } },
      { t: 208.0, palette: 'rain', fade: 2.5, set: { windowK: 1.0 } },
    ],
    rails: [
      { t: 26.0, bars: 2, x: 0 },        // "a boardwalk full of no one": its rail to yourself
      { t: 102.0, bars: 2, x: 0 },       // "June, and I'm somebody again"
    ],
    lift: { fog: 0.4, beams: { colors: [0xffd27a, 0xff8ab8, 0x7fe0ff], x: 46, every: 1.4 } },
    moments: [
      { t: 55.0, kind: 'knock', n: 1, k: 0.35 },          // a screen door bangs
      { t: 119.7, kind: 'fireworks', n: 7, x: 44, y: 34, ahead: 2.2 },   // "your fireworks"
      { t: 121.2, kind: 'fireworks', n: 6, x: 50, y: 40, ahead: 2.2 },
      { t: 228.1, kind: 'thunder', k: 0.55 },             // "first cold rain"
    ],
    scenery: {
      zones: [
        { from: -4, to: 49.9, kits: ['beachtown'], boarded: 0.92, wake0: 0.12 },
        { from: 49.9, to: 65.4, kits: ['beachtown'], boarded: 0.45, wake0: 0.3 },
        { from: 65.4, to: 166.4, kits: ['beachtown'], boarded: 0, wake0: 0.45 },
        { from: 166.4, to: 207.3, kits: ['beachtown'], boarded: 0.25, wake0: 0.18 },
        { from: 207.3, to: 272, kits: ['beachtown'], boarded: 0.8, wake0: 0.2 },
        { from: -4, to: 49.9, kits: ['sand'], winter: true },
        { from: 49.9, to: 65.4, kits: ['sand'] },
        { from: 65.4, to: 166.4, kits: ['sand'], umbrellas: true },
        { from: 166.4, to: 207.3, kits: ['sand'] },
        { from: 207.3, to: 272, kits: ['sand'], winter: true },
        { from: -4, to: 49.9, kits: ['boardwalk'], dark: 0.75, wake0: 0.1 },
        { from: 49.9, to: 166.4, kits: ['boardwalk'], wake0: 0.4 },
        { from: 166.4, to: 207.3, kits: ['boardwalk'], dark: 0.45, wake0: 0.2 },
        { from: 207.3, to: 272, kits: ['boardwalk'], dark: 0.1, wake0: 0.35 },
        { from: -4, to: 272, kits: ['railway'], x: -56 },
        // the set-pieces, each on its line
        { kits: ['sumChairs'], at: 25.6, x: -18 },                              // "lifeguard chairs stacked bone on bone"
        { kits: ['sumStand'], at: 47.6, x: 21 },                                // "February I rehearse for you"
        { kits: ['sumShop'], at: 51.9, x: 20, sign: 'FRIEDDOUGH' },             // "first warm Friday, fry oil in the air"
        { kits: ['sumDoors'], at: [55.4, 55.75, 56.1, 56.45, 56.8, 57.15], side: 1, x: 17.5, t0: 53.8 },   // "screen doors getting their voices back"
        { kits: ['sumHyd'], from: 59.2, to: 63.0, every: 0.15, x: 15, t0: 58.76 },    // "hydrangeas doing the one blue trick"
        { kits: ['sumKept'], at: [79.4, 244.2], x: -16 },                       // "I hold your spot"
        { kits: ['sumNap'], at: 113.4, x: -17 },                                // "your grandmother's nap inside my shade"
        { kits: ['sumBikes'], from: 116.2, to: 119.8, side: 1, x: 16.5 },       // "I memorize your bikes against my fences"
      ],
      summer: {
        kites: [[65.4, 97.8], [131.3, 165.7]],
        balls: [[65.4, 97.8], [131.3, 165.7]],
        rings: [107.4, 111.4],                         // "your kids learn to swim in my cold green water"
        lastCar: { from: 178.1, to: 184.3, x: 21 },    // "who waves the last car south in September"
        plywood: { from: 228.1, to: 235.4 },           // "first cold rain, plywood going up"
      },
      shelf: 70, drop: 4,        // the bluff the town stands on rides with her (BeachWorld)
      roads: [],
      trains: { x: -56, passes: [
        { at: 35.5, rate: -1.1, cars: 7, lit: 0.6 },     // "the trains run right along my water, loud and bright and through"
        { at: 118, rate: -1.0, cars: 9, lit: 1 },
        { at: 186, rate: 0.55, cars: 6, lit: 0.4 },     // the last ones south
      ] },
      lyrics: [
        { t: 41.3, text: 'NOT ONE OF THEM HAS\nEVER STOPPED HERE', side: 1, x: 30 },
        { t: 70.9, text: 'COCONUT\nAND GASOLINE', side: -1, x: 26 },
        { t: 127.7, text: 'NOBODY PASSES THROUGH\nI KEEP EVERYTHING', side: 1, x: 30 },
        { t: 186.2, text: "YOU'RE NOT\nSUMMER PEOPLE, HONEY", side: -1, x: 26 },
        { t: 240.8, text: 'I HOLD YOUR SPOT', side: 1, x: 30 },
      ],
      finale: { kind: 'ferris', t: 267.5, x: -64, fireAt: 240.3, orbit: { y: 24, heroBack: 14, heroSide: 1.2, heroUp: 2.4, heroFov: 40, heroTilt: 2.5, heroPan: 0.2 } },   // her arms up on the boardwalk, the wheel lit past her, right of the card
    },
  },
  {
    // one summer day at a big house, from the glare to the blue of the evening. The estate's wall and
    // its gate opening on the drop; the cypress allée over mown lawns, sprinklers ticking round on the
    // beat; the money on his wrist, her frost and red fist, my digits writing themselves on a napkin,
    // her steps in gold, the champagne tower over on "messy"; one gate shut, four open. Choruses run
    // between canals whose jets leap on the beat, magnums popping down both sides (all at once on the
    // drop): the thermometer in the red, the hedges coming up for "privacy", thunder you can see,
    // doves for peace, his brother kissed in oils, the gold phone ringing, the grin, her standing in
    // gold, the house turning its floors round as its plan changes. Evening at the valet curb (the
    // velvet rope, the martini over on "slur", twelve dumb grey texts, her wink and hearts, his
    // clothes out of the window). The storm, umbrellas opening on the beat under the lightning. The
    // marble bathroom: pearls on the rail till the clasp goes, my number in lipstick on the mirror.
    // After the rain: the jump over the pool, brunch with its cloches up on the beat, the rumour
    // flashing in the hedge, swans, the gold fountain, the cage of polished wood splintered round
    // you. The end: the glass house at dusk, every room lit, my number across its glass.
    id: 'your-wife-my-number',
    accent: '#e0b84a',
    title: 'Your Wife, My Number',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // the wall and the lawns in the glare
      { t: 10.46, kind: 'pre', endY: 22 },                                                      // "she texts better than you"
      { t: 12.37, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 10 },         // the band: the gate swings open
      { t: 18.13, kind: 'verse', c: 0.9, endY: 12 },                                            // "all the money on your wrist"
      { t: 33.47, kind: 'verse', c: 0.95, endY: 12 },                                           // "you call it messy, I call it lore"
      { t: 39.21, kind: 'break', endY: 16 },                                                    // "I open four"
      { t: 41.14, kind: 'pre', endY: 22 },
      { t: 43.04, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 9, endY: 10 },         // "your wife, my number": the canals, every magnum popping
      { t: 54.50, kind: 'chorus', c: 1.15, endY: 11 },
      { t: 69.74, kind: 'break', endY: 16 },                                                    // "watch your whole house change its plan"
      { t: 71.65, kind: 'pre', endY: 22 },
      { t: 73.53, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 9, endY: 10 },
      { t: 77.33, kind: 'verse', c: 1.0, endY: 12 },                                            // the valet curb
      { t: 96.29, kind: 'break', endY: 16 },                                                    // "I open four"
      { t: 98.20, kind: 'pre', endY: 22 },
      { t: 100.08, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, endY: 10 },       // the storm
      { t: 113.31, kind: 'chorus', c: 1.25, endY: 11 },
      { t: 126.52, kind: 'break', endY: 16, turn: 0.3 },                                        // "change its plan"
      { t: 128.41, kind: 'bridge', endY: 13, turn: 0.3 },                                       // the marble bathroom
      { t: 135.94, kind: 'verse', c: 1.0, endY: 12 },
      { t: 141.59, kind: 'pre', endY: 22 },
      { t: 143.47, kind: 'final', start: 'launch', launchBeats: 2, kick: 11, endY: 10, gap: true },   // after the rain: over the pool
      { t: 156.83, kind: 'final', c: 1.3, endY: 11 },
      { t: 169.91, kind: 'break', endY: 16 },                                                   // "splintered it good"
      { t: 171.82, kind: 'final', start: 'launch', launchBeats: 2, kick: 9, endY: 10 },         // out of the cage: "she texts better than you"
      { t: 175.57, kind: 'outro', endY: 5 },
    ],
    palette: 'ymHeat',
    world: 'estate',
    collect: 'pearl',
    titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.4 },
    // the chorus: gold glitter in the air and searchlights out past the canals (the magnums and the
    // jets going off on the beat are the place's own, in ywn-place.js)
    lift: { flash: '#ffe6a8', fog: 0.3, beams: { colors: [0xffe6a8, 0xfff4ec, 0xe0b84a], x: 70, every: 1.4 } },
    confetti: [[43.04, 69.6], [143.47, 169.8]],
    confettiColors: [0xe0b84a, 0xffd87a, 0xfff4ec, 0xffe8a0, 0xf8c8d8, 0xfff8e0],
    rails: [
      { t: 79.23, bars: 2, x: 0 },        // "sharp silk laugh and one perfect slur": down the velvet rope at the valet curb
      { t: 130.29, bars: 2, x: 0 },       // "marble sink, loose pearl clasp": along her pearls, off as the clasp goes
    ],
    looks: [
      { t: -99, palette: 'ymHeat' },
      { t: 43.04, palette: 'ymNoon', fade: 0.4 },        // the chorus in the glare
      { t: 51.6, palette: 'ymCloud', fade: 1.6 },        // "I want thunder"
      { t: 60.0, palette: 'ymNoon', fade: 3.0 },
      { t: 74.0, palette: 'ymEvening', fade: 2.5 },      // the valet curb
      { t: 100.08, palette: 'ymStorm', fade: 0.6 },      // the storm breaks
      { t: 128.5, palette: 'ymBath', fade: 0.4 },        // the marble bathroom
      { t: 137.9, palette: 'ymGolden', fade: 0.6 },      // after the rain
      { t: 168.0, palette: 'ymDusk', fade: 6.0 },        // into the blue: the cage, the glass house
    ],
    moments: [
      { t: 12.37, kind: 'flash', k: 0.2 },
      { t: 38.58, kind: 'knock', n: 1, k: 0.45 },       // "you shut one gate"
      { t: 52.08, kind: 'thunder', k: 0.7 },             // "I want thunder"
      { t: 58.78, kind: 'ring', k: 0.18, dur: 0.9 },     // "my number": the gold phone
      { t: 69.74, kind: 'blackout', dur: 1.9, k: 0.4 },  // "change its plan"
      { t: 95.68, kind: 'knock', n: 1, k: 0.45 },       // "you shut one gate"
      { t: 100.08, kind: 'thunder', k: 0.6 },
      { t: 109.04, kind: 'thunder', k: 0.9 },            // "I want thunder"
      { t: 113.31, kind: 'thunder', k: 0.6 },
      { t: 115.9, kind: 'ring', k: 0.16, dur: 0.9 },
      { t: 126.52, kind: 'blackout', dur: 1.8, k: 0.5 },
      { t: 143.47, kind: 'flash', k: 0.3 },
      { t: 152.36, kind: 'shutter', k: 0.3 },            // "I want rumor"
      { t: 156.83, kind: 'fireworks', n: 8, x: 42, y: 44 },   // "my number"
      { t: 170.50, kind: 'impact', k: 0.7 },             // "splintered it good"
    ],
    scenery: {
      rooms: [
        { style: 'marble', from: 128.41, to: 137.83, caps: [{ kind: 'front', hw: 13, hh: 28 }, { kind: 'wall', hw: 13, hh: 28 }] },   // the marble bathroom
      ],
      car: { t: 78.4, x: 27, paint: 0xf2f0ea, len: 7.5, rot: 0, y: 0.05 },   // at the valet curb, her car
      // the water: canals for the choruses, the pool under the jump
      ywnWater: [
        { from: 43.6, to: 69.4, x0: 44, x1: 58, both: true },
        { from: 100.4, to: 126.2, x0: 44, x1: 58, both: true },
        { from: 143.25, to: 144.85, x0: -40, x1: 40, pool: true },
        { from: 149.8, to: 169.6, x0: 44, x1: 58, both: true },
      ],
      zones: [
        // the gate: the estate's wall, its lanterns, the allée beyond; sprinklers ticking on the lawns
        { from: -6, to: 12.6, kits: ['ywnWalls'], x: 27 },
        { from: -6, to: 43, kits: ['ywnAllee'], x: 40 },
        { from: 43, to: 70, kits: ['ywnAllee'], x: 66, far: 0.3 },
        { from: 70, to: 100, kits: ['ywnAllee'], x: 44, gaps: [[75.5, 82, 1], [91, 95.5, -1]] },
        { from: 100, to: 128.3, kits: ['ywnAllee'], x: 66, far: 0.3 },
        { from: 137.9, to: 196, kits: ['ywnAllee'], x: 40, gaps: [[142.6, 145.6], [149.5, 169.8], [176, 196, -1]] },
        { from: 0, to: 42.6, kits: ['ywnSprinklers'], every: 0.8 },
        // verse one: clipped yews down the lawns with urns between, the party off to the right
        { from: 14, to: 42.4, kits: ['ywnTopiary'], x: 22, every: 0.55, urns: 4, gaps: [[19.8, 22.6, -1], [24.4, 27.2, 1], [27.4, 30, -1], [32.2, 34.6, 1], [34.6, 37.2, -1], [38.2, 40.4, -1]] },
        { from: 0, to: 0.1, kits: ['ywnTents'], at: [[21, 76], [26.5, 92, 1.4], [32, 70], [38, 86, 1.5]] },
        { from: 16, to: 42, kits: ['ywnFestoon'], x: 19, every: 0.62 },
        // the gate on the drop, the gate shut, the four opened
        { from: 0, to: 0.1, kits: ['ywnSet'], at: [
          { t: 12.9, x: 0, kind: 'gate', open: 12.37 },
          { t: 21.4, x: -30, kind: 'watch' },                                           // "you are all the money on your wrist"
          { t: 26.2, x: 30, kind: 'fist', rise: 24.62, fist: 26.32 },                   // "your wife wore frost and a clenched red fist"
          { t: 28.9, x: -28, kind: 'napkin', w0: 27.36, w1: 28.9 },                     // "I wrote my digits on a napkin fold"
          { t: 33.9, x: 26, kind: 'heels', s: 1.2 },                                    // "her step pure gold"
          { t: 36.2, x: -27, kind: 'tower', topple: 35.34 },                           // "you call it messy"
          { t: 39.6, x: -40, kind: 'gate', side: true, rot: -1.57, s: 0.45, shut: 38.58 },   // "you shut one gate"
          { t: 41.2, x: 0, kind: 'gate', open: 40.38 }, { t: 41.9, x: 0, kind: 'gate', open: 40.54 },   // "I open four"
          { t: 42.6, x: 0, kind: 'gate', open: 40.80 }, { t: 43.3, x: 0, kind: 'gate', open: 40.96 },
          // the first chorus
          { t: 46.8, x: 30, kind: 'thermo', rise: 45.66 },                              // "heat wave grin"
          { t: 55.2, x: 24, kind: 'doves', at: 54.02 },                                 // "you want peace"
          { t: 57.0, x: -30, kind: 'portrait', kisses: [[56.0, 5.0, 0.8]] },             // "I want your brother"
          { t: 60.4, x: 28, kind: 'phone', rings: [[58.6, 60.4]] },                     // "your wife, my number"
          { t: 62.6, x: -28, kind: 'lips', open: 61.2 },                                // "her white teeth"
          { t: 67.6, x: 27, kind: 'lady', on: 66.68 },                                  // "I don't steal, I simply stand"
          { t: 71.6, x: -46, kind: 'turnHouse', turns: [69.86, 70.46, 70.86, 71.26] },  // "then watch your whole house change its plan"
          // the second: the same, in the storm
          { t: 96.6, x: -40, kind: 'gate', side: true, rot: -1.57, s: 0.45, shut: 95.68 },
          { t: 98.4, x: 0, kind: 'gate', open: 97.44 }, { t: 99.1, x: 0, kind: 'gate', open: 97.60 },
          { t: 99.8, x: 0, kind: 'gate', open: 97.84 }, { t: 100.5, x: 0, kind: 'gate', open: 98.02 },
          { t: 104.2, x: 30, kind: 'thermo', rise: 102.9, fall: true },                 // the heat breaking
          { t: 114.0, x: -30, kind: 'portrait', kisses: [[112.94, 3.4, -0.6]] },         // "I want your brother"
          { t: 117.4, x: 28, kind: 'phone', rings: [[115.9, 117.4]] },
          { t: 119.2, x: -28, kind: 'lips', open: 118.04 },
          { t: 124.4, x: 27, kind: 'lady', on: 123.46 },
          { t: 128.0, x: -46, kind: 'turnHouse', turns: [126.58, 127.16, 127.62, 128.0] },
        ] },
        { from: 31.0, to: 33.7, kits: ['ywnPrints'], every: 0.24, after: 29.82 },     // her steps in gold
        // the choruses: magnums down both sides, all popping on the drop, then each on its beat
        { from: 43.15, to: 48.5, kits: ['ywnBottles'], x: 20.5, drop: 43.04 },
        { from: 53.9, to: 69.3, kits: ['ywnBottles'], x: 20.5 },
        { from: 43.8, to: 69.3, kits: ['ywnJets'], x0: 44, x1: 58, every: 0.3 },
        { from: 48.9, to: 53.7, kits: ['ywnHedges'], x: 19.5, after: 49.44 },        // "you want privacy"
        { from: 0, to: 0.1, kits: ['ywnBolts'], at: [[52.08, -1, 44], [109.04, -1, 30]] },     // "I want thunder"
        { from: 0, to: 0.1, kits: ['ywnStatues'], at: [[45.6, -64], [50.2, 64], [58.4, -64], [63.8, 64], [104.6, -36, 1], [110.8, 36, 1], [121.0, -36, 1], [152.6, 64], [161.8, -64]] },
        // the evening: lanterns down the drive, yews, the valet curb and the house behind it
        { from: 72, to: 100, kits: ['ywnLanterns'], x: 16, every: 0.55 },
        { from: 72, to: 99.6, kits: ['ywnTopiary'], x: 26, every: 0.6, kinds: [1, 0], gaps: [[76, 81, 1], [80.8, 83.4, -1], [84.6, 88, 1], [88, 91, -1], [91.2, 94.6, -1], [95.4, 97.6, -1]] },
        { from: 0, to: 0.1, kits: ['ywnSet2'], at: [
          { t: 78.8, x: 36, kind: 'porte' },                                             // "she met me later by the valet curb"
          { t: 80.4, x: 82, kind: 'mansion', s: 1.1 },
          { t: 82.6, x: -27, kind: 'martini', tip: 81.76 },                              // "and one perfect slur"
          { t: 87.0, x: 24, kind: 'chat', h0: 3, at: [83.86, 84.10, 84.34, 84.58, 84.82, 85.06, 85.30, 85.54, 85.78, 86.02, 86.26, 86.50] },   // "in twelve dumb parts"
          { t: 89.8, x: -22, kind: 'chat', at: [], wink: 88.32, hearts: 89.54, wx: 0, wy: 9 },   // "she sent a wink and a set of hearts"
          { t: 95.0, x: -38, kind: 'clothes', at: 92.48, s: 1.3 },                       // "you call it messy"
          // the marble bathroom
          { t: 129.8, x: 21, kind: 'tub' },
          { t: 131.9, x: -20, kind: 'sink', slip: 132.24 },                              // "marble sink, loose pearl clasp"
          { t: 135.6, x: 22, kind: 'mirror', w0: 133.96, w1: 134.84, kiss: 136.6 },     // "she took my digits with a laugh"
          { t: 137.3, x: -22, kind: 'mirror', w0: 129, w1: 129.5, kiss: 136.6 },
          // after the rain
          { t: 148.4, x: 26, rot: 0, s: 1.5, kind: 'brunch', lift: 146.76, wicked: 148.0 },   // "saintly brunch with wicked manners"
          { t: 155.2, x: -51, rot: 0, kind: 'swans', n: 5 },                             // "you want grace"
          { t: 162.6, x: 28, kind: 'fountain' },                                         // "gold ..."
        ] },
        { from: 0, to: 0.1, kits: ['ywnRope'], rail: [79.23], x: 0 },
        { from: 100.3, to: 126.2, kits: ['ywnBrollies'], x: 21, s: 2.4 },             // the storm: umbrellas opening on the beat
        { from: 100.0, to: 128.2, kits: ['ywnLanterns'], x: 16, every: 0.55 },
        { from: 100.2, to: 126.4, kits: ['ywnFestoon'], x: 18.5, every: 0.62 },
        { from: 100.08, to: 100.2, kits: ['ywnBolts'], bars: [100.08, 126.5], p: 0.75 },
        { from: 128.8, to: 137.4, kits: ['ywnPearls'], every: 1.0 },
        // after the rain: yews, the pool and its floats, magnums for the last chorus, the rumour in the hedge
        { from: 138, to: 143, kits: ['ywnTopiary'], x: 22, every: 0.55, urns: 3 },
        { from: 145.4, to: 166, kits: ['ywnTopiary'], x: 22, every: 0.55, urns: 4, gaps: [[146, 151, 1], [160.6, 164, 1]] },
        { from: 143.3, to: 144.8, kits: ['ywnPool'], n: 16, w: 32 },
        { from: 145.0, to: 156.7, kits: ['ywnBottles'], x: 20.5 },
        { from: 156.9, to: 166.2, kits: ['ywnBottles'], x: 20.5, drop: 156.83 },
        { from: 150.0, to: 169.4, kits: ['ywnJets'], x0: 44, x1: 58, every: 0.3 },
        { from: 0, to: 0.1, kits: ['ywnFlash'], at: [[151.2, 153.4, -22, 153.0], [151.2, 153.4, 22, 153.2]] },   // "I want rumor"
        // the cage of polished wood: arches over the road to its dome, all splintered on "splintered"
        { from: 166.5, to: 170.45, kits: ['ywnCage'], every: 0.13, burst: 170.5, dome: 170.8 },
        // the drive to the glass house in the blue
        { from: 171, to: 196, kits: ['ywnLanterns'], x: 16, every: 0.5 },
      ],
      lyricPart: 'ywnBubble', lyricX: 7, lyricS: 0.9, lyricBg: '#76705e', lyricColor: '#1e3a2a', lyricCore: '#1e3a2a',
      lyrics: [
        { t: 9.92, text: 'SHE TEXTS BETTER THAN YOU', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 23.06, text: 'YOUR WIFE WORE FROST\nAND A CLENCHED RED FIST', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 26.76, text: 'I WROTE MY DIGITS\nON A NAPKIN FOLD', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 33.98, text: 'YOU CALL IT MESSY,\nI CALL IT LORE', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 37.58, text: 'YOU SHUT ONE GATE,\nI OPEN FOUR', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 43.0, text: 'YOUR WIFE,\nMY NUMBER', h: 14, s: 1.1, frame: 'rgba(0,0,0,0)' },
        { t: 49.44, text: 'YOU WANT PRIVACY,\nI WANT THUNDER', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 53.2, text: 'YOU WANT PEACE,\nI WANT YOUR BROTHER', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 64.36, text: "I DON'T STEAL,\nI SIMPLY STAND", h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 75.22, text: 'SHE MET ME LATER\nBY THE VALET CURB', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 87.26, text: 'SHE SENT A WINK\nAND A SET OF HEARTS', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 133.38, text: 'SHE TOOK MY DIGITS\nWITH A LAUGH', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 145.78, text: 'SAINTLY BRUNCH\nWITH WICKED MANNERS', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 149.46, text: 'YOU WANT TIDY,\nI WANT RUMOR', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 164.44, text: 'YOU BUILT A CAGE\nWITH POLISHED WOOD', h: 13, frame: 'rgba(0,0,0,0)' },
        { t: 168.08, text: 'I BROUGHT A GRIN AND\nSPLINTERED IT GOOD', h: 8, x: 0.01, frame: 'rgba(0,0,0,0)' },
        { t: 172.82, text: 'SHE TEXTS BETTER THAN YOU', h: 13, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 5,
      // the glass house at dusk, every room lit, the number in lipstick across it; her car on the drive
      finale: { kind: 'glasshouse', t: 181.3, x: -52, turn: 0.35, fireAt: 172.82, orbit: { y: 10, heroBack: 12, heroSide: 1.4, heroUp: 4.0, heroFov: 38, heroTilt: 2.0, heroPan: 0.36 } },
    },
  },
  {
    // she wanted Avatar. Twenty minutes in he gets up, "I'll be right back", and out in the
    // lobby there's a claw machine full of ducks that won't let you lose. He never goes back
    // in. Years later the ducks are still on the dresser. Next time he stays in the movie.
    id: 'a-million-ducks',
    accent: '#ffd23a',
    title: 'A Million Ducks',
    startY: 9,
    collect: 'duck',
    // rails: up the aisle's handrail to the exit; along the dresser twice
    rails: [{ t: 27.75, bars: 2, x: 2.2 }, { t: 123.97, bars: 2, x: 0 }, { t: 192.73, bars: 2, x: -3.2 }],
    sections: [
      { t: 0.0, kind: 'intro', endY: 7, turn: 0.25 },
      { t: 6.01, kind: 'verse', c: 0.8, endY: 8, turn: 0.25 },                  // the film starts
      { t: 11.83, kind: 'verse', endY: 9, turn: 0.35 },                         // "she wanted Avatar"
      { t: 27.75, kind: 'pre', endY: 13, turn: 0.5 },                           // "20 minutes and I got up"
      { t: 33.53, kind: 'verse', c: 1.0, endY: 10, turn: 0.6 },                 // "out in the lobby by the popcorn"
      { t: 45.08, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, gap: true, turn: 0.6 },  // the bass drops out for the bar: over the ducks into the machine
      { t: 68.08, kind: 'post', endY: 9, turn: 0.6 },                           // "a pirate one, a captain one"
      { t: 79.56, kind: 'verse', c: 0.95, endY: 12, turn: 0.6 },                // "the credits roll"
      { t: 93.89, kind: 'chorus', c: 1.35, endY: 16, turn: 0.45 },              // out the front doors
      { t: 118.24, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 10, gap: true, turn: 0.4 },   // "different girl, different year": onto the dresser
      { t: 123.97, kind: 'verse', c: 0.9, endY: 14, turn: 0.4 },
      { t: 138.28, kind: 'pre', endY: 22, turn: 0.4 },                          // "red dress, my mirror"
      { t: 152.61, kind: 'chorus', endY: 12, turn: 0.4 },                       // "strangers have seen my dresser"
      { t: 164.07, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12, gap: true, turn: 0.4 },   // "where the hell was I?": the gap between the dressers
      { t: 172.69, kind: 'final', start: 'launch', launchBeats: 4, kick: 11, turn: 0.4 },
      { t: 189.87, kind: 'post', c: 1.15, endY: 9, turn: 0.4 },                 // "still up on the dresser"
      { t: 201.37, kind: 'bridge', endY: 15, turn: 0.1 },                       // "next time I'm staying in the movie"
      { t: 205.78, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.05 },   // the lights go down: silence
      { t: 211.58, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 5, turn: 0.05 },   // the band comes back: "even if it's Avatar"
      { t: 218.79, kind: 'outro', turn: 0.05 },
    ],
    palette: 'auditorium',
    world: 'cinema',
    titleView: { ahead: 0.16, x: 1.7, h: 1.25, back: 0.05, lookH: 1.6 },   // in front of her: the screen behind
    lift: { flash: '#ffd23a', fog: 0.25 },
    looks: [
      { t: -99, palette: 'auditorium' },
      { t: 14.9, palette: 'dckBlue', fade: 1.0 },          // "I'd seen it enough to turn blue"
      { t: 27.8, palette: 'auditorium', fade: 2.5 },       // "20 minutes and I got up"
      { t: 31.0, palette: 'lobby', fade: 0.8 },            // "out in the lobby by the popcorn"
      { t: 45.1, palette: 'dckMachine', fade: 0.6 },       // into the machine
      { t: 79.5, palette: 'lobby', fade: 0.6 },            // out the prize door: "the credits roll"
      { t: 82.2, palette: 'credits', fade: 0.9 },          // "the door swung open, blue light in her hair"
      { t: 87.0, palette: 'lobby', fade: 2.5 },
      { t: 94.0, palette: 'carpark', fade: 0.6 },          // out the front doors: "I never went back in"
      { t: 118.3, palette: 'room', fade: 0.3 },            // "different girl, different year"
      { t: 140.3, palette: 'roomred', fade: 1.0 },         // "red dress, my mirror"
      { t: 147.5, palette: 'room', fade: 3 },
      { t: 152.7, palette: 'dckRoomNight', fade: 0.8 },    // "strangers have seen my dresser"
      { t: 164.1, palette: 'dckRoomDark', fade: 0.3 },     // "where the hell was I?"
      { t: 172.7, palette: 'dckParty', fade: 0.5 },        // "it won't let you lose": the last chorus
      { t: 190.2, palette: 'room', fade: 2 },              // "still up on the dresser"
      { t: 201.5, palette: 'screen', fade: 1.2 },          // "next time I'm staying in the movie"
      { t: 206.2, palette: 'dckDark', fade: 1.2 },         // the lights go down
      { t: 211.6, palette: 'avatar', fade: 0.5 },          // "even if it's Avatar"
    ],
    moments: [
      { t: 30.64, kind: 'knock', n: 1, k: 0.55 },          // the exit doors bang open
      { t: 79.2, kind: 'knock', n: 1, k: 0.4 },            // out through the prize door
      { t: 81.6, kind: 'knock', n: 1, k: 0.45 },           // "the door swung open"
      { t: 103.0, kind: 'fireworks', n: 8, ahead: 3.2, x: 44, y: 52 },   // "so I never went back in"
      { t: 109.5, kind: 'fireworks', n: 6, ahead: 3.2, x: 48, y: 48 },
      { t: 118.2, kind: 'flash', k: 0.9 },                 // "different girl, different year"
    ],
    confetti: [[46.5, 67.8], [172.7, 189.8]],              // the jackpot in the machine; the last chorus in his room
    confettiColors: [0xffd23a, 0xff4fb8, 0x3ac8ff, 0xffffff, 0xff8a2a, 0x8aff6a],
    scenery: {
      signs: [
        { key: 'MARQUEE', text: 'NOW SHOWING\nAVATAR', color: '#ffe6a0', core: '#ffffff', bg: '#140a14', frame: '#ffcf6a', size: 70 },
        { key: 'CINEMA', text: 'CINEMA 12', color: '#ff4fb8', core: '#ffe0f4', size: 86 },
      ],
      halls: [
        { style: 'auditorium', from: -10, to: 31.5, screenAt: -3.6, caps: [false, { open: 30.64, hw: 10, hh: 13 }] },
        { style: 'lobby', from: 31.5, to: 45.08, caps: [false, false] },
        { style: 'claw', from: 45.08, to: 79.56, caps: [{ hw: 12 }, { open: 79.15, hw: 11 }] },
        { style: 'lobby', from: 79.56, to: 84.6, caps: [false, { open: 82.3, hw: 12, hh: 15 }] },     // the auditorium doors swing open
        { style: 'lobby', from: 84.6, to: 93.89, caps: [false, { kind: 'front', open: 93.5, hw: 12 }] },
        { style: 'room', from: 118.24, to: 201.37, showFrom: 118.12, deskFrom: 'gap', cutGaps: true, caps: [false, { open: 200.95, hw: 12 }] },
        { style: 'auditorium', from: 201.37, to: 240, screenAt: 227.2, screenK: 1.3, dimAt: 205.0, caps: [false, false] },
      ],
      zones: [
        // the first auditorium: the seats on their tiers, faces in the screen's light (blue at "to turn blue")
        { from: -4, to: 31.0, kits: ['dckAudience'], face: 'back', blueAt: 14.7 },
        // "she was somewhere behind her face, and I was somewhere behind mine"
        { from: 23.0, to: 23.1, kits: ['dckMasks'], at: [{ t: 23.0, x: -31, h: 13, t0: 21.5 }, { t: 26.0, x: 31, h: 13, comedy: true, t0: 24.5 }] },
        // the lobby: the counter and the popcorn; the light he can't get past; ducks with their faces to the glass
        { from: 34.7, to: 34.8, kits: ['dckCounter'], at: 34.7, x: -19 },
        { from: 35.2, to: 35.3, kits: ['dckPoppers'], at: [[35.2, 17], [35.9, -18]] },
        { from: 37.5, to: 37.6, kits: ['claws'], at: 37.5, x: 16, s: 4.2, beacon: true },
        { from: 39.8, to: 39.9, kits: ['claws'], at: 39.8, x: -15, s: 3.8, faces: true },
        { from: 40.6, to: 44.6, kits: ['claws'], row: true, x: 13.5 },
        // inside the machine: the ducks heaped to the glass (and under the hole in the road), the prizes
        { from: 45.08, to: 79.4, kits: ['dckDunes'], under: true },
        { from: 70.1, to: 70.2, kits: ['dckPrizes'], at: [{ t: 70.1, x: -7.5, hat: 'pirateHat' }, { t: 71.1, x: 7.5, hat: 'captainHat' }] },
        { from: 72.7, to: 72.8, kits: ['dckDog'], at: 72.7, x: 20, t0: 71.1 },
        { from: 76.2, to: 76.3, kits: ['dckHoodie'], at: 76.2, x: -21 },
        // out in the lobby again: the doors swing open and she's in them, the blue light in her hair; the prize wall
        { from: 84.62, to: 84.7, kits: ['dckHerStand'], at: 84.62, x: 8.8, t0: 82.5, s: 1.65 },
        { from: 91.9, to: 92.0, kits: ['dckPrizeWall'], at: [[91.95, 24.6], [92.4, 24.6], [92.85, 24.6], [92.15, -24.6], [92.6, -24.6], [93.05, -24.6]], t0: 91.3 },
        // the car park under the searchlights
        { from: 93.9, to: 118.2, kits: ['carpark'], cinema: true },
        { from: 96.0, to: 96.1, kits: ['dckTrucks'], at: [[96.0, -50], [99.0, 56], [102.5, -54], [106.0, 50], [109.5, -50], [113.0, 54], [116.0, -52]] },
        { from: 94.0, to: 118.0, kits: ['dckMasts'] },
        { from: 102.9, to: 103.0, kits: ['dckBalloon'], at: 102.9, x: -64, h: 19.5, s: 16 },        // the big duck on the cinema's roof
        // his dresser: the ducks; the lamp; her pictures, the one face down; the mirror; every duck he ever won
        { from: 119.6, to: 201.0, kits: ['dresser'], clear: [[126.0, 127.0, 1], [134.6, 136.0, -1], [135.3, 136.3, 1], [137.6, 138.8, 1], [140.9, 142.8, -1], [149.2, 152.0], [156.6, 157.6, 1], [163.9, 165.6], [169.6, 171.3, -1]] },
        { from: 126.5, to: 126.6, kits: ['roomLamp'], at: 126.5, x: 30, s: 0.62 },
        { from: 135.0, to: 135.1, kits: ['dckFrames'], at: [{ t: 135.3, x: -25, photo: 0, s: 1.75 }, { t: 135.9, x: 26, photo: 1, s: 1.75 }, { t: 138.3, x: 22, down: true, s: 1.75 }] },
        { from: 141.9, to: 142.0, kits: ['dckMirror'], at: 141.9, x: -27, s: 1.35 },
        { from: 149.6, to: 151.8, kits: ['dckParade'], s: 4.2, ranks: [12, 18, 24] },
        { from: 157.0, to: 157.1, kits: ['roomLamp'], at: 157.0, x: 29, s: 0.5 },
        // the last auditorium, faced to the screen; when the film bursts its forest grows out into the room
        { from: 202.0, to: 226.2, kits: ['dckAudience'], face: 'fwd', lit: 0.45, clear: [[224.6, 226.2, -1]] },
        { from: 211.6, to: 227.0, kits: ['dckBloom'], burst: 211.58, clear: [[224.6, 226.8, -1, 19]] },
      ],
      roads: [
        { x: 0, width: 22, walk: 3, laneLines: 0, from: 93.6, to: 118.6, traffic: false, lampEvery: 16, dry: false, follow: true },
      ],
      fx: {
        lot: [93.89, 118.24],                              // the car park's tarmac, on the shelf under the road
        beams: [
          { booth: 31.3, screen: -3.6, yBooth: 22, yScreen: 17, rBooth: 1.2, rScreen: 15 },
          { booth: 201.6, screen: 227.2, yBooth: 22, yScreen: 19, rBooth: 1.2, rScreen: 17, on: [206.5, 211.6] },
        ],
        seeds: [{ from: -4, to: 31.5, rate: 8 }, { from: 201.5, to: 232, rate: 14, burstAt: 211.58 }],
        claws: [[45.08, 68.0]],
        fountains: [{ from: 46.5, to: 68.0, n: 5 }, { from: 172.69, to: 189.8, n: 7, desk: true, x0: 11, dx: 18, s: 2.8 }],
        seaHop: [[45.08, 79.56]],
        shower: { from: 85.3, to: 87.8, n: 22, w: 22, h: 19 },
        popcorn: [{ from: 34.0, to: 38.2, at: [[35.2, 17, 2.2], [35.9, -18, 2.2]] }],
        search: { from: 93.9, to: 118.2, at: [[96.0, -50], [99.0, 56], [102.5, -54], [106.0, 50], [109.5, -50], [113.0, 54], [116.0, -52]] },
        roomClaw: { at: 170.5, x: -14, down: 167.0, grab: 169.0, gone: 172.0, s: 6, ds: 6 },
        voids: [[117, 201]],                               // light far down on the bedroom floor under the gaps
      },
      // the lines go up on marquee boards, letters on a lit panel, bulbs round them
      lyricFloor: true, lyricPart: 'dckMarquee', lyricS: 1.0, lyricBg: '#b8b0a0', lyricColor: '#1a1418', lyricCore: '#1a1418',
      lyrics: [
        { t: 30.0, text: "I'LL BE\nRIGHT BACK", x: 0, h: 17.5, lead: 1.3 },
        { t: 31.5, text: 'AND I MEANT IT\nAT THE TIME', side: 1, x: 17, h: 10, lead: 1.5 },
        { t: 35.98, text: "THERE'S A LIGHT\nI CAN'T GET PAST", side: -1, x: 17, h: 12, lead: 1.8 },
        { t: 40.32, text: 'A DOLLAR\nA PLAY', side: 1, x: 17, h: 13, lead: 1.5 },
        { t: 41.58, text: "IT WON'T LET\nYOU LOSE", x: 0, h: 25, lead: 3.35 },
        { t: 48.26, text: 'PUT YOUR MONEY IN\nAND PLAY UNTIL YOU WIN', side: -1, x: 20, h: 16, lead: 1.6 },
        { t: 71.12, text: "A DOG WHO KNOWS\nHE'S NOT A DUCK", side: -1, x: 19, h: 16, lead: 1.6 },
        { t: 82.98, text: 'BLUE LIGHT\nIN HER HAIR', side: -1, x: 18, h: 14, lead: 1.4 },
        { t: 85.42, text: 'I LOOKED LIKE\nA MILLION DUCKS', side: 1, x: 17, h: 10, lead: 1.4 },
        { t: 91.32, text: 'I REMEMBER\nEVERY DUCK', side: -1, x: 17, h: 10, lead: 1.5 },
        { t: 103.06, text: 'I NEVER\nWENT BACK IN', side: 1, x: 24, h: 13, lead: 1.6, s: 1.35 },
        { t: 116.44, text: 'DIFFERENT GIRL,\nDIFFERENT YEAR', side: -1, x: 24, h: 13, lead: 1.1, s: 1.35 },
        { t: 152.92, text: 'STRANGERS HAVE\nSEEN MY DRESSER', side: 1, x: 27, h: 14, lead: 1.6, s: 1.45 },
        { t: 156.12, text: 'NOBODY KNOWS\nWHOSE ROOM', side: -1, x: 27, h: 14, lead: 1.6, s: 1.45 },
        { t: 164.08, text: 'WHERE THE\nHELL WAS I?', x: 0, h: 17, lead: 1.4, s: 1.3 },
        { t: 190.2, text: 'STILL UP ON\nTHE DRESSER', side: 1, x: 27, h: 14, lead: 1.6, s: 1.45 },
        { t: 193.42, text: "THEY STILL DON'T\nKNOW WHAT THEY SAW", side: -1, x: 27, h: 14, lead: 1.6, s: 1.45 },
        { t: 201.42, text: "NEXT TIME I'M STAYING\nIN THE MOVIE", side: -1, x: 22, h: 13, lead: 1.5 },
        { t: 214.0, text: "EVEN IF IT'S\nAVATAR", side: 1, x: 22, h: 13, lead: 1.5 },
      ],
      // the end: her cheering in front of the screen, the forest round her, and in the front row the
      // girl with her glasses on and a duck on the seat beside her: this time he stayed
      finale: { kind: 'screen', t: 227.2, startT: -3.6, fireAt: 211.58, herT: 224.75, herX: -5.0, herS: 1.2, herOnRoad: true, dark: 205.0, burstAt: 211.58, orbit: { r: 44, h: 1, y: 8, facing: true, back: 2.5, swing: 0.3, right: 0.28, heroBack: 15, heroSide: -1.5, heroUp: 1.2, heroFov: 38, heroTilt: 6.5, heroPan: 0.3 } },
    },
  },
  {
    // a launch that never lifts off. The pad at night, the rocket in its tower and the countdown clock:
    // ten, nine, eight, one, done before we started. The viewing stands, the stopwatch, the pressure
    // gauge, the stage and its curtain, ready set go and no show. Mission control: the broken clock,
    // the spreadsheet, the bell curve, the participation trophy, lights out. The review, one star out of
    // five, morning. Houston, the rocket stuck in its hole, the eight ball, and back at the pad: zero.
    id: 'come-countdown',
    accent: '#7ad0ff',
    title: 'Come Countdown',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                            // "ten, nine, eight"
      { t: 11.00, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 11 },               // the band comes in
      { t: 14.87, kind: 'verse', endY: 10 },                                                         // "standing ovations", "Olympic precision"
      { t: 25.19, kind: 'pre', endY: 20 },                                                           // "no pressure", "the timer runs"
      { t: 36.80, kind: 'break', endY: 18 },                                                         // "ready? not ready. set? upset. go? no show."
      { t: 41.97, kind: 'pre', endY: 26 },                                                           // "your countdown starts when I say when"
      { t: 45.84, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10, gap: true },  // "three, two, one": off, over the hole
      { t: 70.35, kind: 'post', endY: 12 },                                                          // "performance anxiety"
      { t: 76.81, kind: 'verse', endY: 12 },                                                         // "it happens to everyone"
      { t: 87.11, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 12, turn: 0.3 },    // "your clock's broken": in to mission control
      { t: 96.16, kind: 'verse', c: 1.0, endY: 12, turn: 0.3 },                                      // "here's your participation trophy"
      { t: 109.06, kind: 'break', endY: 20, turn: 0.3 },                                             // "no pressure, we've got all night"
      { t: 114.22, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 11 },              // "your performance review needs improvement"
      { t: 127.13, kind: 'pre', endY: 22 },                                                          // "three, two, one, it's morning"
      { t: 131.00, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 10 },            // "counting down to nothing"
      { t: 152.94, kind: 'final', c: 1.2, endY: 12 },                                                // "you're out of time"
      { t: 169.71, kind: 'break', endY: 18 },                                                        // the band goes
      { t: 172.30, kind: 'outro', endY: 16 },                                                        // "ten seconds was your record"
      { t: 183.87, kind: 'final', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },              // "six, five, four, three, two"
      { t: 189.07, kind: 'outro', endY: 5 },                                                         // "one more chance. zero."
    ],
    rails: [
      { t: 18.74, bars: 2, x: 0 },        // "been curtailed ... your attempts with Olympic precision"
      { t: 98.74, bars: 2, x: 0 },        // "here's your participation trophy"
    ],
    palette: 'ccNight',
    world: 'launch',
    collect: 'star',
    skyline: 'hills',
    groundStyle: 'country',
    titleView: { ahead: -0.16, x: 1.4, h: 2.2, back: -0.8, lookH: 5.0 },   // behind her, the clock over the road and the rocket off to the left
    looks: [
      { t: -99, palette: 'ccNight' },
      { t: 25.9, palette: 'ccPressure', fade: 2.0 },     // "no pressure"
      { t: 31.4, palette: 'ccStage', fade: 0.5 },        // "your stage fright's my opening act"
      { t: 36.5, palette: 'ccTree', fade: 0.4 },         // "ready, not ready"
      { t: 39.6, palette: 'ccNoShow', fade: 0.2 },       // "no show"
      { t: 42.6, palette: 'ccNight', fade: 1.6 },        // "your countdown starts when I say when"
      { t: 46.0, palette: 'ccChorus', fade: 0.3 },
      { t: 58.8, palette: 'ccCurtain', fade: 1.4 },      // "show's over, curtain's closing"
      { t: 62.4, palette: 'ccChorus', fade: 1.6 },
      { t: 72.0, palette: 'ccNerves', fade: 1.0 },       // "anxiety"
      { t: 79.0, palette: 'ccNight', fade: 2.0 },        // "it happens to everyone"
      { t: 87.5, palette: 'ccControl', fade: 0.4 },      // mission control
      { t: 113.4, palette: 'ccLightsOut', fade: 2.0 },   // "good night"
      { t: 114.6, palette: 'ccPreDawn', fade: 0.4 },
      { t: 130.0, palette: 'ccMorning', fade: 2.4 },     // "three, two, one, it's morning"
      { t: 140.5, palette: 'ccMorning', set: { fog: 0x3a1010, horizon: 0xff6a5a, skyGlow: 0xff5a4a, skyLight: 0xff6a5a, bounce: 0x5a1010, hemiK: 1.9, glow: 0xff2a2a, fret: 0xff5a4a, hold: 0xff4a2a }, fade: 0.15 },   // "Houston, we have a problem"
      { t: 143.4, palette: 'ccMorning', fade: 1.4 },
      { t: 170.0, palette: 'ccMorning', set: { fog: 0xa89aa0, fogDensity: 0.0012, skyLight: 0xd8d0e0, hemiK: 1.7 }, fade: 2.0 },   // the band goes
      { t: 185.0, palette: 'ccMorning', set: { zenith: 0x4a7ac8, horizon: 0xffd8b0, fog: 0xb0a0a0, sunK: 1.4, hemiK: 1.9 }, fade: 2.4 },   // "six, five, four"
    ],
    moments: [
      { t: 8.2, kind: 'flash', k: 0.12 },                 // "one": the engines light
      { t: 61.2, kind: 'fireworks', n: 6, ahead: 4.5, x: 40, y: 38, size: 0.75, gap: 240 },   // "your grand finale's decomposing"
      { t: 67.35, kind: 'knock', n: 1, k: 0.5 },          // the toy rocket comes down
      { t: 111.9, kind: 'knock', n: 1, k: 0.4 },          // the lights going, a bank at a time
      { t: 112.5, kind: 'knock', n: 1, k: 0.4 },
      { t: 113.1, kind: 'knock', n: 1, k: 0.5 },          // "good night"
      { t: 140.4, kind: 'ring', k: 0.35, dur: 1.4 },      // "Houston, we have a problem"
      { t: 191.56, kind: 'flash', k: 0.2 },               // zero
    ],
    confetti: [[99.0, 100.8]],                            // "here's your participation trophy"
    confettiColors: [0xffd860, 0xffffff, 0x7ad0ff, 0xffb040],
    confettiNormal: true,
    scenery: {
      roomEvents: { off: [111.9, 112.5, 113.1], nerves: [71.7, 77.5] },
      rooms: [
        { style: 'control', from: 87.11, to: 96.16, caps: [{ kind: 'front', hw: 13, hh: 34 }, CCDOOR] },   // mission control: the spreadsheet, the curve
        { style: 'control', from: 96.16, to: 109.06, caps: [null, CCDOOR] },                             // the trophy
        { style: 'control', from: 109.06, to: 114.22, caps: [null, { kind: 'wall', hw: 14, hh: 34 }] },  // "good night"
      ],
      zones: [
        // the site at night: floodlight masts along the road, red lights on masts a long way off
        { from: -6, to: 86.6, kits: ['ccFloods'], every: 1.5, x: 56 },
        { from: -6, to: 200, kits: ['ccBeacons'], every: 1.4 },
        // the pad: the rocket in its tower, lit up; on "one" the engines go, on "done" they stop
        { from: 0, to: 0.1, kits: ['ccPad'], at: [{ t: 13.0, x: -120, s: 1.0, burn: [[8.2, 9.6, 1]] }] },
        // the countdown clocks
        { from: 0, to: 0.1, kits: ['ccClock'], at: [
          { t: 10.4, lift: 17, s: 0.8, seq: [[-99, 0], [0.88, 1], [1.34, 2], [3.02, 3], [3.58, 4], [3.88, 5], [5.40, 6], [5.92, 7], [6.60, 8], [8.20, 9], [9.22, 10]] },   // ten, nine, eight
          { t: 30.9, x: -34, y: 26, s: 0.7, tick: [28.44, 0.3226, 10] },                                              // "take your time, the timer runs"
          { t: 45.7, lift: 17, s: 0.75, seq: [[-99, 0], [43.76, 7], [44.42, 8], [45.04, 9], [45.6, 10]] },               // "three, two, one"
          { t: 55.9, lift: 17, s: 0.75, seq: [[-99, 0], [49.24, 5], [50.34, 6], [51.74, 7], [52.90, 8], [54.34, 9], [55.7, 10]] },   // five, getting softer
          { t: 140.2, lift: 17, s: 0.75, seq: [[-99, 0], [134.34, 5], [135.82, 6], [136.96, 7], [138.08, 8], [139.54, 9], [140.38, 11]], blink: [140.38, 143] },   // "one, Houston"
          { t: 154.8, x: 34, y: 26, s: 0.75, seq: [[-99, 11]], blink: [150, 156] },                                  // "you're out of time"
          { t: 187.0, x: -34, y: 26, s: 0.75, seq: [[-99, 0], [183.34, 4], [184.14, 5], [185.80, 6], [187.08, 7]] },     // "six, five, four"
        ] },
        // the viewing stands, nobody in them
        { from: 0, to: 0.1, kits: ['ccStands'], at: [[17.4, -46], [18.1, 46], [19.0, -46], [19.7, 46]] },
        // "Olympic precision": the stopwatch on the beat
        { from: 0, to: 0.1, kits: ['ccWatch'], at: 23.0, x: 32, y: 24, s: 0.9 },
        // "no pressure": the gauge going into the red
        { from: 0, to: 0.1, kits: ['ccGauge'], at: 27.4, x: -32, s: 0.62, go: 25.8, dur: 2.2 },
        // "your stage fright's my opening act": the stage, a spot on nobody
        { from: 0, to: 0.1, kits: ['ccStage'], at: 33.2, x: 40, s: 1.0, spot: 31.1 },
        // ready, set, go, no show
        { from: 0, to: 0.1, kits: ['ccTree'], at: 39.6, x: -40, y: 30, s: 0.85, times: [36.3, 37.48, 38.82, 39.4], blinks: [40.10, 40.64] },
        // "show's over, curtain's closing", across the road, shut behind you
        { from: 0, to: 0.1, kits: ['ccCurtains'], at: 60.9, top: 40, close0: 57.0, close1: 60.6 },
        // "rise to the occasion, you're falling"
        { from: 0, to: 0.1, kits: ['ccToy'], at: 68.6, go: 64.6, dur: 2.8, x0: -40, x1: 46, hm: 40, s: 0.16 },
        // "I'd rather go"
        { from: 0, to: 0.1, kits: ['ccHung'], at: [[84.4, 'exit', 9]], lift: 14 },
        // "tick-tock, your clock's broken", over mission control's door
        { from: 0, to: 0.1, kits: ['ccBroken'], at: 87.11, y: 46, s: 1.0 },
        // mission control: the desks, the spreadsheet, the bell curve, the trophy
        { from: 87.4, to: 113.9, kits: ['ccConsoles'], every: 0.34, x: 33 },
        { from: 0, to: 0.1, kits: ['ccHung'], at: [[90.0, 'screen', 0, 0], [95.2, 'screen', 0, 1]], lift: 17 },
        { from: 0, to: 0.1, kits: ['ccTrophy'], at: 100.9, x: 20, s: 0.5, spot: 99.0, ceil: 34 },
        // out: the review, one star out of five
        { from: 0, to: 0.1, kits: ['ccHung'], at: [[116.2, 'review']], lift: 15 },
        { from: 0, to: 0.1, kits: ['ccStars'], at: 121.2, on: 119.2, lift: 14 },
        { from: 114.4, to: 171, kits: ['ccFloods'], every: 1.6, x: 56 },
        // Houston: the rocket stuck in its hole, the dish, the stopwatch going backward
        { from: 0, to: 0.1, kits: ['ccStuck'], at: 147.8, x: -42, s: 0.6, tilt: 0.35 },
        { from: 0, to: 0.1, kits: ['ccDish'], at: 149.4, x: 54, s: 1.1 },
        { from: 0, to: 0.1, kits: ['ccWatch'], at: 152.0, x: -32, y: 24, s: 0.9, back: true, go: 149.5 },
        // "can't achieve lift off": the second pad, burning, going nowhere
        { from: 0, to: 0.1, kits: ['ccPad'], at: [{ t: 165.2, x: 84, s: 0.9, burn: [[160.6, 164.4, 1]] }] },
        // ten seconds was your record; nine scrubbed; the eight ball
        { from: 0, to: 0.1, kits: ['ccWatch'], at: 175.0, x: 32, y: 24, s: 0.9, fixed: 10 },
        { from: 0, to: 0.1, kits: ['ccScrub'], at: 177.8, x: -34, y: 26, s: 1.0 },
        { from: 0, to: 0.1, kits: ['ccEight'], at: 180.6, x: 36, s: 1.5, turn: 178.9 },
        { from: 171, to: 196, kits: ['ccFloods'], every: 1.8, x: 60 },
      ],
      roads: [
        { x: 0, width: 16, walk: 3, laneLines: 1, from: -10, to: 87.0, traffic: false, lampEvery: 40, lampColor: 0xd8e8ff, dry: true },
        { x: 0, width: 16, walk: 3, laneLines: 1, from: 114.3, to: 205, traffic: false, lampEvery: 40, lampColor: 0xd8e8ff, dry: true },
      ],
      lyricPart: 'ccSign', lyricX: 0, lyricBg: '#0a1018', lyricColor: '#e8f4ff', lyricCore: '#ffffff',
      lyrics: [
        { t: 59.4, text: "SHOW'S OVER,\nCURTAIN'S CLOSING", h: 26, lead: 1.35 },
        { t: 98.9, text: "HERE'S YOUR\nPARTICIPATION TROPHY", h: 15, lead: 0.9 },
        { t: 108.8, text: "BABY, NO PRESSURE,\nWE'VE GOT ALL NIGHT", h: 15 },
        { t: 111.2, text: 'CHECK PHONE, ACTUALLY,\nNEVER MIND, GOOD NIGHT', h: 15, lead: 1.2 },
        { t: 127.8, text: "THREE, TWO, ONE,\nIT'S MORNING", h: 14 },
        { t: 140.4, text: 'HOUSTON, WE\nHAVE A PROBLEM', h: 14, lead: 1.6 },
        { t: 152.2, text: "YOU'RE OUT\nOF TIME", h: 14 },
        { t: 189.1, text: 'ONE MORE\nCHANCE', h: 14 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'rocket', t: 197.0, x: -70, s: 1, clockX: -12, clockY: 30, clockZ: 46, clockRot: -2.07, clockS: 0.8, seq: [[-99, 4], [184.14, 5], [185.80, 6], [187.08, 7], [187.92, 8], [189.08, 9], [191.56, 10]], zero: 191.56, burnFor: 1.6, fireAt: 189.0, orbit: { r: 175, h: 6, y: 52, facing: true, back: 2, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 9, heroFov: 52, heroUp: 1.2, heroTilt: 2 } },   // the rocket, the gantry and the clock at zero beside her
    },
  },
  {
    // the candy factory where his songs get made: the syrup, the coating pans, the taffy
    // puller, the venom; the presses stuttering, the trap, the gumball machine; the power
    // tripping; out the loading dock onto your block, where it's still what's playing.
    id: 'unloaded',
    accent: '#ff5fd2',
    title: 'Unloaded',
    collect: 'candy',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 14 },                                         // the factory at night
      { t: 8.23, kind: 'verse', start: 'launch', kick: 7, endY: 10 },              // in through the doors: "drip-fed"
      { t: 19.92, kind: 'pre', endY: 18 },
      { t: 24.26, kind: 'verse', start: 'launch', kick: 8, endY: 11 },             // "every syllable's a hit-and-run"
      { t: 30.03, kind: 'pre', endY: 20 },                                         // "skin tight, hindsight"
      { t: 35.80, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },           // "candy coated"
      { t: 45.82, kind: 'break', endY: 12 },
      { t: 47.25, kind: 'pulse', endY: 14 },                                       // the presses stuttering
      { t: 58.82, kind: 'verse', start: 'launch', kick: 8, endY: 10 },             // "velvet rap trap snapped"
      { t: 71.94, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },
      { t: 82.02, kind: 'break', endY: 12 },
      { t: 83.47, kind: 'verse', endY: 14 },                                       // "everything I touch trips"
      { t: 92.14, kind: 'pre', endY: 22 },                                         // "before the chorus hits"
      { t: 95.02, kind: 'chorus', start: 'launch', kick: 11, endY: 10, gap: true },  // the power back on: over the mixing vat
      { t: 105.15, kind: 'break', endY: 12 },
      { t: 106.61, kind: 'verse', endY: 14 },                                      // out onto the block
      { t: 116.79, kind: 'pre', endY: 22 },
      { t: 119.70, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the drop
      { t: 128.49, kind: 'outro', endY: 5 },
    ],
    palette: 'unlNight',
    world: 'candy',
    // the chorus is a sugar rush (cdy-rush.js): candy cannons firing over the road on every beat,
    // a curtain of liquid candy to burst through, sprinkles coming down, searchlights in candy colours
    lift: { flash: 0xff5fb0, fog: 0.3, beams: { colors: [0xff5fb0, 0x6af0c8, 0xffd23a], x: 42, every: 1.25, y: 4 } },
    confetti: [[35.80, 45.82], [71.94, 82.02], [95.03, 105.15], [119.70, 150]],   // and still coming down over the end
    confettiColors: [0xff5fb0, 0x6af0c8, 0xffd23a, 0xb070ff, 0xffffff, 0xff8a3a, 0x5ab0ff],
    confettiNormal: true,
    rails: [
      { t: 18.46, bars: 2, x: 0 },        // a candy cane through the sugar room, off under "I don't make songs"
      { t: 50.13, bars: 2, x: 0 },        // the stutter, down the press line
      { t: 110.97, bars: 2, x: 0 },       // the block: "sharp enough to get it mired, overclocked"
    ],
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 5.0 },   // behind her, the factory's doors and the peppermint ahead
    looks: [
      { t: -99, palette: 'unlNight' },
      { t: 8.23, palette: 'unlCook', fade: 0.4 },          // in through the doors: the syrup kitchen
      { t: 15.54, palette: 'unlSugar', fade: 0.4 },        // the sugar room: "watched me build a myth"
      { t: 24.26, palette: 'unlFloor', fade: 0.5 },        // the line: "every syllable's a hit-and-run"
      { t: 35.62, palette: 'unlCoat', fade: 0.25 },        // the coating room: "candy coated"
      { t: 47.25, palette: 'unlPress', fade: 0.3 },        // the pressing plant: the stutter
      { t: 58.82, palette: 'unlShow', fade: 0.4 },         // the showroom
      { t: 71.76, palette: 'unlRainbow', fade: 0.25 },     // the second chorus, in every colour
      { t: 83.47, palette: 'unlFloor', fade: 0.4 },
      { t: 85.81, palette: 'unlDark', fade: 0.12 },        // "everything I touch trips"
      { t: 95.025, palette: 'unlFull', fade: 0.12 },       // "before the chorus hits": the lights back on
      { t: 106.61, palette: 'unlBlock', fade: 0.6 },       // out onto the block
      { t: 119.70, palette: 'unlDrop', fade: 0.3 },        // still what's playing
    ],
    moments: [
      { t: 20.823, kind: 'impact', k: 0.3 },               // the switch thrown: "clean-switch"
      { t: 29.339, kind: 'pop', k: 0.35, flash: 0.05 },    // the rabbit out of the hat: "trick"
      { t: 32.356, kind: 'impact', k: 0.22 },              // the bite
      { t: 59.727, kind: 'knock', k: 0.6, n: 1 },          // "trap snapped"
      { t: 67.019, kind: 'pop', k: 0.6 },                  // "bubble gum"
      { t: 85.814, kind: 'blackout', dur: 0.25, k: 0.55 }, // the power trips
      { t: 87.433, kind: 'impact', k: 0.5 },               // the bunny lands on its face: "fell into the beat, face first"
      { t: 95.025, kind: 'flash', k: 0.6 },                // the lights back on as the chorus hits
      { t: 119.70, kind: 'flash', k: 0.5 },
      { t: 121.17, kind: 'fireworks', n: 6, x: 40, y: 44, ahead: 3.0 },   // the block party
      { t: 124.10, kind: 'fireworks', n: 6, x: 40, y: 44, ahead: 3.0 },
      { t: 127.02, kind: 'fireworks', n: 8, x: 40, y: 48, ahead: 3.0 },
    ],
    scenery: {
      rooms: [
        { style: 'cook', from: 8.23, to: 15.54, caps: [{ kind: 'front', hw: 16, hh: 30 }, UDOOR] },   // "drip-fed, lip-read"
        { style: 'sugar', from: 15.54, to: 24.26, caps: [null, UDOOR] },                               // "watched me build a myth", "clean-switch"
        { style: 'floor', from: 24.26, to: 35.62, caps: [null, UDOOR] },                               // the line: the hat's trick, the bite
        { style: 'coat', from: 35.62, to: 47.25, caps: [null, UDOOR] },                                // "candy coated", the razors, the venom
        { style: 'press', from: 47.25, to: 58.82, caps: [null, UDOOR] },                               // the stutter: records skipping
        { style: 'show', from: 58.82, to: 71.76, caps: [null, UDOOR] },                                // "trap snapped", the week, "bubble gum", the hook
        { style: 'rainbow', from: 71.76, to: 83.47, caps: [null, UDOOR] },                             // the second chorus
        { style: 'floor', from: 83.47, to: 94.85, caps: [null, UDOOR] },                               // the power trips; face first; the mood ring
        { style: 'mix', from: 94.85, to: 106.61, caps: [null, { kind: 'wall', hw: 15, hh: 26 }] },     // over the vat; out the loading dock
      ],
      roomEvents: { dark: [85.81, 95.02, 0.02, 0.1], party: [119.70, 999, 0.05, 0.5] },
      zones: [
        // the yard at night: the trucks at the bays, the stacks, the peppermint over the doors, and
        // the doors rolling up as the band comes in
        { from: -4, to: 8.0, kits: ['clubstreet'], dim: 0.9 },
        { from: -4, to: 8.2, kits: ['trucks'], at: [[2.6, 34, 0.2], [4.4, -36, -0.15], [6.3, 38, 0.1]] },
        { from: 9.0, to: 14.0, kits: ['stacks'], at: [[9.6, -86, 1], [11.6, 92, 1.15], [13.8, -100, 0.9]] },
        { from: 8.1, to: 8.2, kits: ['peppermint'], at: 8.12, y: 47 },
        { from: 8.2, to: 8.3, kits: ['cdyDoor'], at: 8.23, open0: 6.77, open1: 8.05, hh: 30 },
        { from: 8.5, to: 8.6, kits: ['cdyRoofSweet'], at: 8.5, y: 84, s: 2.6 },                        // the sign on the roof
        // the syrup kitchen: kettles under the pipe dripping, "drip-fed"; the wax lips, "lip-read"
        { from: 9.5, to: 15.3, kits: ['vats'], at: [[10.6, -26], [10.6, 26], [13.6, -26], [13.6, 26], [12.1, -40], [15.0, -38]] },
        { from: 13.6, to: 13.7, kits: ['pipe'], at: [13.6], y: 30 },
        { from: 14.9, to: 15.0, kits: ['cdyLips'], at: 14.9, x: 38, y: 5.5, s: 1.7, syl: [12.26, 12.82, 13.17, 13.53, 13.90, 14.50, 14.74, 14.94] },
        // the sugar room: the tower going up a cube every other beat to the star, "watched me build a
        // myth"; the cotton candy, "dream-stitched"; the switch thrown on "clean-switch"
        { from: 17.7, to: 17.8, kits: ['cdyMyth'], at: 17.7, x: -27, s: 1.25, beats: [14.082, 14.816, 15.54, 16.261, 16.987, 17.724] },
        { from: 20.0, to: 20.1, kits: ['cdyFloss'], at: 20.0, x: 30, s: 1.2, grow: [17.9, 19.5] },
        { from: 21.7, to: 21.8, kits: ['cdySwitch'], at: 21.7, x: -32, y: 6, s: 1.2, throw: 20.823 },
        // the line: the belts racing, "every syllable's a hit-and-run"; the rabbit out of the hat on
        // "trick"; the chocolate bar bitten on "bite"
        { from: 24.6, to: 35.4, kits: ['belts'], every: 1.4, x: 46 },
        { from: 30.4, to: 30.5, kits: ['cdyHat'], at: 30.4, x: 28, s: 1.25, pop: 29.339 },
        { from: 33.4, to: 33.5, kits: ['cdyBar'], at: 33.4, x: -28, s: 1.1, bite: 32.356 },
        // the coating room: the pans, the razors dipped in pink over the road, the tanks of the green
        { from: 36.2, to: 46.8, kits: ['belts'], every: 1.4, x: 50 },
        { from: 37.0, to: 45.0, kits: ['pans'], at: [[37.0, 30], [37.6, -30, 1.1], [43.6, 32], [44.2, -30]] },
        { from: 38.3, to: 38.4, kits: ['cdyRazors'], at: 38.3, lift: 6 },
        { from: 40.4, to: 41.5, kits: ['tanks'], at: [[40.4, 32], [40.9, -32], [41.4, 34]] },
        // the pressing plant: a press on every beat, the records on the walls skipping with the stutter
        { from: 47.6, to: 58.4, kits: ['presses'], every: 1.1, x: 24 },
        { from: 48.0, to: 58.6, kits: ['cdyDecks'], at: [[49.6, -33], [51.8, 33], [54.0, -33], [56.2, 33], [58.4, -33]], y: 9, s: 1.3, stutter: [47.25, 58.82] },
        // the showroom: the trap on "trap snapped"; the week with a lollipop stuck in every day; the
        // gumball machine's bubble on "bubble gum"; the gingerbread men popping and locking; the hook
        // let down on "come to me"
        { from: 59.2, to: 61.6, kits: ['lollies'], every: 0.9, x: 32 },
        { from: 64.6, to: 68.0, kits: ['lollies'], every: 0.9, x: 32 },
        { from: 60.6, to: 60.7, kits: ['trap'], at: 60.6, x: 30, snap: 59.727, s: 1.5 },
        { from: 63.7, to: 63.8, kits: ['cdyWeek'], at: 63.7, x: -36, y: 9, hits: [61.368, 61.726, 62.093, 62.46, 62.832, 63.203, 63.569] },
        { from: 67.5, to: 67.6, kits: ['gumball'], at: 67.5, x: -34, blow0: 64.6, pop: 67.019 },
        { from: 69.4, to: 69.5, kits: ['cdyGinger'], at: 69.4, x: 34, y: 8, s: 1.3 },
        { from: 71.3, to: 71.4, kits: ['cdyHook'], at: 71.3, down: [69.026, 70.479] },
        // the rainbow room: the second chorus in every colour
        { from: 72.2, to: 83.2, kits: ['belts'], every: 1.4, x: 52 },
        { from: 77.4, to: 77.5, kits: ['puller'], at: 77.4, x: 36, s: 1.3 },
        { from: 79.0, to: 81.0, kits: ['pans'], at: [[79.6, -32], [80.2, 32]] },
        // the line in the dark: the breaker trips on "trips"; the chocolate bunny falls on its face on
        // the beat; the mood ring
        { from: 84.0, to: 94.6, kits: ['belts'], every: 1.4, x: 46 },
        { from: 86.8, to: 86.9, kits: ['breaker'], at: 86.8, x: -22, trip: 85.814 },
        { from: 88.7, to: 88.8, kits: ['cdyBunny'], at: 88.7, x: 30, tip: 86.2, fall: 87.433 },
        { from: 92.0, to: 92.1, kits: ['moodRing'], at: 92.0, s: 1.1 },
        // the mixing hall: the road breaks over the vat; the pans; the dock door up on "unloaded"
        { from: 95.0, to: 95.1, kits: ['cdyVat'], lip: 95.025 },
        { from: 99.0, to: 105.0, kits: ['pans'], at: [[99.6, 38], [100.2, -38, 1.2], [103.4, 40], [104.0, -38]] },
        { from: 100.6, to: 100.7, kits: ['puller'], at: 100.6, x: -44, s: 1.4 },
        { from: 106.6, to: 106.7, kits: ['cdyDoor'], at: 106.61, open0: 104.8, open1: 105.9, hh: 26, dock: true, light: [0.55, 0.45, 1] },
        // out onto the block (cdy-block.js): walk-ups shoulder to shoulder, every window lit and
        // somebody dancing in most of them; string lights across; the neighbours' fire on the
        // sidewalk, "every word is camp-fired"; the busted clock, "running on a busted clock"
        { from: 106.6, to: 146, kits: ['cdyWalkups'], x: 24, every: 0.34, clear: [[131.3, 134.6, -1]] },   // the lot the truck backs into
        { from: 130.9, to: 135.2, kits: ['cdyWalkups'], x: 60, every: 0.34, sides: [-1] },                 // the next street's, over the lot
        { from: 106.8, to: 140, kits: ['stringLights'], every: 1.3, span: 24 },
        { from: 110.4, to: 110.5, kits: ['pit'], at: 110.4, x: 18, s: 1.5 },
        { from: 115.6, to: 115.7, kits: ['streetClock'], at: 115.6, x: -17, s: 1.0 },
      ],
      roads: [
        { x: 0, width: 30, walk: 4, laneLines: 1, from: -10, to: 8.3, lanes: [], density: 0, lampEvery: 34, follow: true },
        { x: 0, width: 24, walk: 6, laneLines: 1, from: 106.5, to: 150, lanes: [], density: 0, lampEvery: 30, follow: true },
      ],
      lyricPart: 'hazardSign', lyricBg: '#a07c10', lyricColor: '#101010', lyricCore: '#101010', lyricS: 1,
      // his lines, each checked against three transcriptions (lyrics2, lyrics3 and a pass over
      // short windows); the disputed ones ("razor-throated", "soft-boiled") are left off
      lyrics: [
        { t: 21.12, text: "I DON'T MAKE SONGS\nI MAKE THE THING", x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 25.54, text: "EVERY SYLLABLE'S\nA HIT-AND-RUN", x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 38.56, text: 'SWEETEST VENOM\nEVER LAUDED', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 61.34, text: "STICK INSIDE YOUR SKULL\nUNTIL YOUR WHOLE WEEK'S HIJACKED", x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 65.96, text: 'SPIT IT OUT AS\nBUBBLE GUM', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 86.20, text: 'FELL INTO THE BEAT\nFACE FIRST', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 93.36, lead: 1.1, text: 'BEFORE THE\nCHORUS HITS', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 115.14, text: 'STILL THE BEST THING PLAYING\nON YOUR FUCKING BLOCK', x: 0, h: 12, frame: 'rgba(0,0,0,0)', part: 'cdyBanner', bg: '#a89aa0', color: '#d0105a', core: '#ff3a8a' },
      ],
      // the sugar rush (cdy-rush.js): a cannon for every chorus beat, the curtains she bursts
      // through on the downbeats (a colour a bar in the second), the hoppers on each "unloaded"
      cdyRush: {
        cannons: [{ from: 36.1, to: 45.6 }, { from: 72.2, to: 82.0 }, { from: 95.3, to: 105.1 }, { from: 120.0, to: 128.4, x: 19 }],
        curtains: [{ t: 35.798, color: 0xff4fa8 }, { t: 71.94, color: 0xff4fa8 }, { t: 73.39, color: 0x5ff0c4 }, { t: 74.84, color: 0xffd23a }, { t: 76.26, color: 0xb070ff }, { t: 95.025, color: 0xff3a7a }],
        hoppers: [{ t: 47.47, release: 46.174 }, { t: 83.67, release: 82.373 }, { t: 106.8, release: 105.499 }],
      },
      shelf: 70, drop: 4,
      // the street comes up to meet the ribbon at the end, so the lot isn't hidden under its edge
      flat: [[131.0, 146, 6.0]],
      // the end: the candy truck pulled over and tipped, its load in a mountain across the street,
      // the boombox on top still going (cdy-block.js)
      finale: { kind: 'boombox', t: 133.0, x: -30, fireAt: 119.70, truckX: 24, truckZ: 7, truckRot: 1.5708, heapX: 0, heapZ: 0, heapR: 13, heapH: 12, boxRot: -0.9, boxS: 0.5,
        orbit: { y: 8, heroBack: 14, heroSide: 1.6, heroUp: 3.4, heroFov: 42, heroTilt: 3.5, heroPan: 0.28, r: 60, h: 8 } },
    },
  },
  {
    // glamour and sirens. A red carpet at night between velvet ropes, cameras going off behind
    // them, siren light turning on poles along it. Polish in coordinated blue, perfume that breathes,
    // a beautiful bomb, porcelain, a tiara for seventeen; the price tags, the gilded trinity, the
    // heart, the counter from zero to infinity; a hall of mirrors with the sirens in it; and at dawn,
    // with the music gone, an empty vanity, its bulbs still on.
    id: 'overdose-aesthetic',
    accent: '#ff4a9a',
    title: 'Overdose Aesthetic',
    collect: 'perfume',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // "polish coordinated"
      { t: 10.52, kind: 'pre', endY: 22 },                                                      // "ambulance siren, so sophisticated"
      { t: 13.72, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the band
      { t: 21.72, kind: 'verse', c: 1.1, endY: 12 },
      { t: 24.94, kind: 'break', endY: 16 },                                                    // a bar of almost nothing
      { t: 26.51, kind: 'verse', c: 1.15, endY: 12 },                                           // "breathing beauty"
      { t: 37.70, kind: 'pre', endY: 22 },
      { t: 39.33, kind: 'break', endY: 20 },                                                    // "lookin' so serene"
      { t: 42.51, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },        // "prettiest you've been since seventeen"
      { t: 50.50, kind: 'post', endY: 12 },
      { t: 52.12, kind: 'verse', c: 0.9, endY: 12 },                                            // porcelain
      { t: 63.30, kind: 'pre', endY: 22 },
      { t: 64.91, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the band again
      { t: 69.71, kind: 'verse', c: 1.05, endY: 12 },                                           // "monetize the meltdown"
      { t: 82.50, kind: 'pre', endY: 22 },
      { t: 84.11, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // "looking so serene"
      { t: 96.91, kind: 'post', c: 1.0, endY: 12, turn: 0.3 },                                  // the hall of mirrors
      { t: 101.72, kind: 'verse', c: 1.1, endY: 12, turn: 0.3 },
      { t: 112.89, kind: 'break', endY: 18, turn: 0.3 },                                        // "sickly, sweetie"
      { t: 114.52, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 116.11, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },       // out of the hall
      { t: 127.30, kind: 'pre', endY: 22 },
      { t: 128.93, kind: 'break', endY: 20 },                                                   // "lookin' so serene"
      { t: 132.10, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10, gap: true },   // "pretty as you've been since seventeen": over the hole
      { t: 141.70, kind: 'outro', endY: 5 },                                                    // the music goes
    ],
    rails: [
      { t: 29.71, bars: 2, x: 0 },        // "breathing beauty, choke on function"
      { t: 72.91, bars: 2, x: 0 },        // "posthumous trinity"
    ],
    palette: 'oaNight',
    world: 'glam',
    looks: [
      { t: -99, palette: 'oaNight' },
      { t: 13.72, palette: 'oaFlash', fade: 0.3 },      // the band
      { t: 24.9, palette: 'oaNight', fade: 0.2 },       // a bar of nothing
      { t: 26.5, palette: 'oaFlash', fade: 0.3 },
      { t: 42.51, palette: 'oaPink', fade: 0.3 },       // the chorus
      { t: 52.12, palette: 'oaPorcelain', fade: 0.6 },  // porcelain
      { t: 64.91, palette: 'oaGold', fade: 0.3 },       // the trinity
      { t: 84.11, palette: 'oaPink', fade: 0.3 },
      { t: 97.1, palette: 'oaMirror', fade: 0.4 },      // the hall of mirrors
      { t: 116.11, palette: 'oaFlash', fade: 0.3 },
      { t: 132.1, palette: 'oaPink', fade: 0.3 },
      { t: 146.0, palette: 'oaDawn', fade: 5.0 },       // the music goes, and it's morning
    ],
    moments: [
      { t: 13.72, kind: 'shutter', k: 0.6 },
      { t: 24.94, kind: 'blackout', dur: 1.4, k: 0.5 },
      { t: 42.51, kind: 'shutter', k: 0.7 },
      { t: 64.91, kind: 'shutter', k: 0.6 },
      { t: 84.11, kind: 'shutter', k: 0.6 },
      { t: 112.89, kind: 'blackout', dur: 1.5, k: 0.6 },
      { t: 116.11, kind: 'shutter', k: 0.7 },
      { t: 132.10, kind: 'shutter', k: 0.8 },
    ],
    confetti: [[42.51, 50.4], [132.1, 141.6]],
    confettiColors: [0xff5aa8, 0xffd8ec, 0xe8c060, 0xffffff, 0xb8c8ff],
    scenery: {
      rooms: [
        { style: 'mirrors', from: 96.91, to: 116.11, caps: [{ kind: 'front', hw: 13, hh: 26 }, { kind: 'wall', hw: 13, hh: 28 }] },   // the hall of mirrors
      ],
      sirenHall: [101.72, 112.89],
      zones: [
        { from: -6, to: 97.0, kits: ['farcity'], x: 96 },
        { from: 116.0, to: 160, kits: ['farcity'], x: 110 },
        // the carpet: velvet ropes both sides, sirens turning on poles, cameras behind the ropes
        { from: -4, to: 96.9, kits: ['oaRopes'] },
        { from: 116.1, to: 156, kits: ['oaRopes'] },
        { from: 4, to: 96.5, kits: ['oaSirens'], every: 1.1, on: 10.04 },
        { from: 116.3, to: 156, kits: ['oaSirens'], every: 1.1, on: 116.11, off: 141.7 },
        { from: 13.72, to: 24.9, kits: ['oaFlashes'] },
        { from: 26.5, to: 39.3, kits: ['oaFlashes'] },
        { from: 42.5, to: 52.1, kits: ['oaFlashes'], k: 1.3 },
        { from: 64.9, to: 96.9, kits: ['oaFlashes'] },
        { from: 116.1, to: 141.7, kits: ['oaFlashes'], k: 1.3 },
        // his things
        { from: 6.4, to: 10.8, kits: ['oaPolishRow'], every: 0.42, x: 30, s: 1.6 },                       // "blue lips match my nail polish, coordinated"
        { from: 30.4, to: 34.2, kits: ['oaPerfumes'], every: 0.8, x: 30, beat: 0.8, puff: 30.98 }, // "breathing beauty"
        { from: 53.2, to: 58.8, kits: ['oaVases'], every: 0.55, x: 28 },                          // "porcelain"
        { from: 0, to: 0.1, kits: ['oaProps'], at: [
          { t: 45.0, x: 36, kind: 'tiara', s: 1.3 },                       // "prettiest you've been since seventeen"
          { t: 62.0, x: -30, kind: 'bomb', s: 1.4 },                       // "so pretty, pretty, a beautiful bomb"
          { t: 71.3, x: 20, kind: 'tag', y: 34, s: 1.1 },                   // "monetize the meltdown"
          { t: 72.1, x: -22, kind: 'tag', y: 38, s: 1.2 },
          { t: 72.9, x: 24, kind: 'tag', y: 30, s: 1.0 },
          { t: 75.8, x: -32, kind: 'triptych', s: 1.3 },                   // "posthumous trinity"
          { t: 78.8, x: 26, kind: 'heart', y: 26, s: 1.2 },                // "love your look"
          { t: 82.4, x: -34, kind: 'counter', s: 1.3, inf: 81.12 },        // "from zero to infinity"
          { t: 134.4, x: -36, kind: 'tiara', s: 1.3 },                     // "pretty as you've been since seventeen"
        ] },
      ],
      lyricPart: 'oaSign', lyricX: 0, lyricBg: '#0c0a10', lyricColor: '#ffd0ec', lyricCore: '#ffffff',
      lyrics: [
        { t: 11.88, text: 'SO SOPHISTICATED', h: 14 },
        { t: 41.74, text: "PRETTIEST YOU'VE BEEN\nSINCE SEVENTEEN", h: 14 },
        { t: 59.12, text: 'SO PRETTY, PRETTY,\nA BEAUTIFUL BOMB', h: 14 },
        { t: 70.64, text: 'MONETIZE THE MELTDOWN', h: 14 },
        { t: 74.00, text: 'POSTHUMOUS TRINITY', h: 14 },
        { t: 77.70, text: 'LOVE YOUR LOOK', h: 14 },
        { t: 129.94, text: "LOOKIN' SO SERENE", h: 14 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'vanity', t: 152.4, x: -40, s: 1.6, rot: -1.57, orbit: { r: 110, h: 10, y: 18, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.36, heroFov: 54, heroBack: 9, heroSide: 0.4, heroUp: 1.8 } },   // the vanity and its mirror beside the card
    },
  },
  {
    // a small town over a week where nothing happens. Monday morning on the street, bins out:
    // the dentist three teeth this week, his car parked on her street, the receipts, the mirror.
    // A Friday night of nothing much under the interrogation lamp, then broad daylight and the
    // brunch. Saturday on Main Street, where something finally does: the hydrants open and throw
    // their water over the road on every beat, the calendar sheds the week, the glass, the car
    // wash, the lie detector, the closet that bursts. Sunday: the church bells and the summons,
    // the loopholes, the errands, the market, the matinee; the hat and the sunglasses, the
    // shredder; the parade. The evening: the door held till it closed, the hall of frames, the
    // courthouse and its gavel. The getaway at the speed limit through the fire trucks' salute,
    // out of town and up the hill to the lookout, the whole town below at dusk.
    id: 'nothing-happens-every-week',
    accent: '#ff4a4a',
    title: 'Nothing Happens Every Week',
    collect: 'donut',
    startY: 8,
    rails: [{ t: 71.91, bars: 2, x: 0 }],                                        // "just around, just running errands"
    sections: [
      { t: 0.0, kind: 'intro', endY: 7 },
      { t: 6.22, kind: 'verse', c: 0.8, endY: 8 },                               // "you said you were at the dentist"
      { t: 26.74, kind: 'pre', endY: 15 },                                       // "so where were you on the night of nothing much"
      { t: 33.58, kind: 'pre', start: 'launch', launchBeats: 4, kick: 7, endY: 14 },   // "go on and plead the fifth"
      { t: 39.05, kind: 'chorus', c: 1.1, endY: 9 },                             // "nothing happened, nothing happened"
      { t: 59.59, kind: 'break', start: 'launch', launchBeats: 3, kick: 7, endY: 9 },  // "something you were always free to be": the closet bursts
      { t: 63.69, kind: 'verse', c: 0.85, endY: 10 },                            // "I wrote it as a blessing"
      { t: 85.62, kind: 'pre', endY: 20 },                                       // "what's with the hat and sunglasses?"
      { t: 97.99, kind: 'chorus', endY: 10 },
      { t: 121.37, kind: 'break', endY: 12 },                                    // "we held the door for each other till it closed"
      { t: 126.88, kind: 'pre', endY: 22 },                                      // "your perfect alibi was the truth"
      { t: 136.54, kind: 'break', rb: 8, endY: 20 },                             // "nothing happened. Say it slow"
      { t: 142.01, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 12, gap: true },  // "the only charge that's ever gonna stick": out through the frame over the gap
      { t: 149.03, kind: 'break', endY: 12 },                                    // "court adjourned"
      { t: 151.75, kind: 'post', start: 'launch', launchBeats: 4, kick: 7, endY: 10 },     // "before I ever took the stand"
      { t: 155.96, kind: 'chorus', endY: 10 },
      { t: 158.76, kind: 'break', start: 'launch', launchBeats: 3, kick: 6, endY: 10 },    // the bass goes
      { t: 161.55, kind: 'pre', endY: 16 },
      { t: 165.72, kind: 'chorus', c: 1.3, endY: 10 },                           // "now there's no one left to lie to me"
      { t: 178.21, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12, gap: true },    // "like a free man breaking free": through the tape, over the gap
      { t: 180.97, kind: 'final', endY: 6, turn: 0.6 },                          // "you made your getaway at the speed limit"
      { t: 193.45, kind: 'break', endY: 17, turn: 0.4 },                         // "nothing happened, nothing ever will again": up out of town
      { t: 200.31, kind: 'final', c: 1.1, endY: 24, turn: 0.3 },                 // the top of the hill: the town below
      { t: 204.48, kind: 'outro', endY: 25, turn: 0.2 },
    ],
    palette: 'sunday',
    world: 'sunday',
    skyline: 'hills',
    groundStyle: 'country',
    titleView: { ahead: -0.36, x: 2.4, h: 4.3, back: -1.4, lookH: 3.4 },   // behind her: Monday morning, the start line up the street, its ribbon and balloons
    lift: { flash: 0x9fdcff, fog: 0.35 },                  // the chorus: the hydrants open, a rainbow in their spray
    looks: [
      { t: -99, palette: 'nhMorning' },                    // Monday morning
      { t: 27.0, palette: 'nhNight', fade: 0.7 },          // "so where were you on the night of nothing much?"
      { t: 31.52, palette: 'nhNoon', fade: 0.2 },          // "that broad daylight brunch": the sun comes on
      { t: 63.7, palette: 'nhSunday', fade: 3 },           // Sunday: "I wrote it as a blessing"
      { t: 85.6, palette: 'nhAfternoon', fade: 4 },        // "the afternoon of nothing new"
      { t: 98.0, palette: 'nhHot', fade: 1 },              // the parade
      { t: 121.4, palette: 'nhGolden', fade: 8 },          // "we held the door for each other till it closed"
      { t: 142.0, palette: 'nhSunset', fade: 1.5 },        // "the only charge that's ever gonna stick"
      { t: 181.0, palette: 'getaway', fade: 3 },           // "you made your getaway at the speed limit"
      { t: 196.0, palette: 'nhDusk', fade: 6 },            // "nothing ever will again"
    ],
    moments: [
      { t: 31.52, kind: 'flash', k: 0.45 },                // broad daylight
      { t: 65.06, kind: 'bell', k: 0.5, degree: 0 },       // "I wrote it as a blessing": the church bell
      { t: 65.74, kind: 'bell', k: 0.45, degree: 4 },
      { t: 66.43, kind: 'bell', k: 0.55, degree: 0 },
      { t: 125.85, kind: 'knock', n: 1, k: 0.9 },          // "till it closed": the door slams
      { t: 149.70, kind: 'knock', n: 1, k: 1.0 },          // "court adjourned": the gavel
      { t: 149.70, kind: 'flash', k: 0.16 },
    ],
    confetti: [[92.6, 97.6]],                              // "you can shred the evidence"
    confettiColors: [0xf4f2ea, 0xffffff, 0xe8e4d8, 0xf0ece0, 0xfffaf0, 0xdcd8cc],
    scenery: {
      signs: [
        { key: 'DENTIST', text: 'DENTIST', color: '#2a6ad8', core: '#ffffff', bg: '#f4f8fa', size: 90 },
        { key: 'BRUNCH', text: 'BRUNCH', color: '#ff5a3a', core: '#fff4e8', bg: '#2a2420', size: 96 },
        { key: 'MATINEE', text: 'SUNDAY\nMATINEE', color: '#ffd166', core: '#ffffff', bg: '#3a1420', frame: '#ffd166', size: 74 },
        { key: 'SPEED', text: 'SPEED\nLIMIT\n25', color: '#111111', core: '#111111', bg: '#f6f6f2', size: 64 },
        { key: 'BARBER', text: 'BARBER', color: '#e8203a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'PHARMACY', text: 'PHARMACY', color: '#2a9a4a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'FLORIST', text: 'FLORIST', color: '#ff6fa8', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'HARDWARE', text: 'HARDWARE', color: '#d8602a', core: '#ffffff', bg: '#2a2a30' },
        { key: 'BAKERY', text: 'BAKERY', color: '#c89a4a', core: '#fff8ec', bg: '#3a2418' },
      ],
      zones: [
        // Monday morning: the street, the bins out
        { from: -4, to: 30.8, kits: ['nhStreet'], bins: true, sprinklers: true, clear: [[8.6, 9.8, 1, 'all'], [15.3, 16.6, 1, 'all'], [23.6, 27.2, 0, 'all']] },
        { from: 0, to: 0.1, kits: ['nhRibbon'] },                                                  // the ribbon across the start line
        { from: 0, to: 0.1, kits: ['nhBalloons'], list: [{ t: 0.02, x: -9.6, lift: 4.4, at: 0.0, n: 9, tied: true, spread: 2.2, size: 1.0, delay: 0.25, seed: 3 }, { t: 0.02, x: 9.6, lift: 4.4, at: 0.0, n: 9, tied: true, spread: 2.2, size: 1.0, delay: 0.25, seed: 4 }] },
        { from: 9.0, to: 9.1, kits: ['nhTeeth'], at: [9.9, 10.5, 11.1], x: 15, s: 1.6 },          // "you said you were at the dentist, there's three teeth this week"
        { from: 15.9, to: 16.0, kits: ['nhHouses'], list: [{ t: 15.95, x: 26, kind: 'nhColonial', tint: 0xf8d0dc, roof: 0x5a2a2a, accent: 0x9a1a2a }] },   // her street
        { from: 18.4, to: 18.5, kits: ['nhReceipts'], at: [[18.6, -8.8], [19.5, 8.8], [20.4, -8.8]] },     // "you've got receipts for questions I was never gonna raise"
        { from: 24.0, to: 24.1, kits: ['nhMirrors'], at: [[24.4, 26], [25.6, -26], [26.8, 26]], s: 1.15 },   // "rehearsing your defense in the mirror for days"
        { from: 29.8, to: 29.9, kits: ['nhInterrogation'], at: 29.8 },                             // "so where were you on the night of nothing much?"
        // Saturday: Main Street. Brunch, then the chorus: the hydrants, the bunting, the string
        { from: 30.8, to: 39.05, kits: ['nhMainStreet'], signs: ['BAKERY', 'FLORIST', 'BARBER', 'PHARMACY', 'HARDWARE'], clear: [[31.9, 33.0, -1], [37.2, 38.3, 1]] },
        { from: 32.4, to: 32.5, kits: ['nhBrunch'], at: 32.4, x: -1 },                             // "who's your accomplice in that broad daylight brunch?"
        { from: 39.05, to: 63.7, kits: ['nhMainStreet'], string: true, signs: ['HARDWARE', 'BARBER', 'BAKERY', 'PHARMACY', 'FLORIST'], clear: [[40.4, 42.0, -1], [45.4, 46.5, -1], [48.2, 51.3, 1], [53.7, 56.0, -1], [60.2, 62.4, 1]] },
        { from: 39.05, to: 63.7, kits: ['nhEvidence'] },
        { from: 39.05, to: 59.6, kits: ['nhHydrants'] },
        { from: 39.2, to: 59.6, kits: ['nhBunting'], every: 0.62 },
        { from: 41.4, to: 41.5, kits: ['nhCalendar'], at: 41.4, x: -24, flip: [39.05, 44.72], day0: 4 },   // "and it happens every week": the week flies off it
        { from: 49.3, to: 49.4, kits: ['nhGlass'], at: 49.3 },                                     // "fingerprints on nothing"
        { from: 49.0, to: 53.0, kits: ['nhCarWash'], at: 50.6, x: 23 },                           // "squeaky clean": its bubbles drift over the road
        { from: 55.4, to: 55.5, kits: ['nhPolygraph'], at: 55.4, x: -24, s: 1.55 },                // "go ahead and lie to me"
        { from: 61.5, to: 61.6, kits: ['nhCloset'], at: 61.5, x: 24, s: 1.5, open: 59.59 },        // "the only thing you're ever guilty of is hiding / something you were always free to be"
        // Sunday: the church, the summons, the loopholes, the errands, the market, the matinee
        { from: 63.7, to: 72.0, kits: ['nhStreet'], sprinklers: true, clear: [[66.5, 68.7, -1, 'all']] },
        { from: 67.6, to: 67.7, kits: ['nhChurch'], at: 67.6, x: -36, bells: [65.06, 65.74, 66.43] },   // "I wrote it as a blessing": the bell, the doves go up over the road
        { from: 67.5, to: 67.6, kits: ['nhBoards'], list: [{ t: 67.5, x: -17, face: 'nhBoardBless' }, { t: 70.3, x: 17, face: 'nhBoardSummons' }] },   // "you read it as a summons"
        { from: 69.6, to: 72.1, kits: ['nhHoops'], every: 2 },                                     // "now you only speak in loopholes"
        { from: 72.0, to: 98.0, kits: ['nhMainStreet'], signs: ['PHARMACY', 'HARDWARE', 'FLORIST', 'BAKERY', 'BARBER'], clear: [[74.3, 78.3, 0], [78.7, 80.6, 1], [83.3, 85.4, 1], [87.9, 89.1, -1], [90.9, 92.0, -1], [92.6, 94.8, 1]] },
        { from: 84.6, to: 84.7, kits: ['nhPhone'], at: 84.6, x: 20, ring: 82.58 },                 // "buddy, she confesses it all day": the phone ringing off the hook
        { from: 74.4, to: 78.4, kits: ['nhMarket'] },                                              // "but she tells me about the market"
        { from: 74.4, to: 78.4, kits: ['nhBunting'], every: 0.5 },
        { from: 79.6, to: 79.7, kits: ['nhCinema'], at: 79.6, x: 23 },                             // "and the Sunday matinee"
        { from: 89.0, to: 89.1, kits: ['nhNewspaper'], at: 88.5, x: -22 },                         // "so where were you on the afternoon of nothing new?"
        { from: 90.6, to: 90.7, kits: ['nhDisguise'], at: 90.6 },                                  // "what's with the hat and sunglasses?"
        { from: 92.2, to: 94.9, kits: ['nhShredder'], at: 94.0, x: 18, s: 1.4 },                  // "you can shred the evidence, there's nothing there to shred"
        // the parade: the chorus again, bigger
        { from: 98.0, to: 121.4, kits: ['nhMainStreet'], string: true, signs: ['BARBER', 'BAKERY', 'FLORIST'], clear: [[100.3, 101.4, 1]] },
        { from: 98.0, to: 121.4, kits: ['nhEvidence'] },
        { from: 98.0, to: 121.37, kits: ['nhHydrants'] },
        { from: 98.1, to: 121.3, kits: ['nhBunting'], every: 0.5 },
        { from: 101, to: 101.1, kits: ['nhParade'], at: [[101.2, 0], [106.0, 0, 'hand'], [109.6, 0, 'tooth'], [114.6, 0]], lift: 15 },   // the parade: "nothing happened", "red-handed", "squeaky clean", "lie to me"
        { from: 118.6, to: 118.7, kits: ['nhBalloons'], list: [{ t: 121.5, x: -18, at: 118.28, n: 24, spread: 6, size: 1.4, delay: 1.4, rise: 0.8, wind: -1, drift: -1.5, seed: 21 }, { t: 121.9, x: 18, at: 118.6, n: 24, spread: 6, size: 1.4, delay: 1.4, rise: 0.8, wind: -1, drift: 1.5, seed: 22 }] },   // "something you were always free to be": let go up the street ahead of her
        // the evening: the door, the alibi, the hall of frames
        { from: 121.4, to: 142.0, kits: ['nhStreet'], clear: [[129.0, 130.1, -1, 'all'], [138.6, 142.4, 0, 'all']] },
        { from: 125.6, to: 125.7, kits: ['nhDoor'], at: 125.6, shut: 125.55 },                      // "we held the door for each other till it closed"
        { from: 139.2, to: 139.3, kits: ['nhHall'], list: [[139.4, 23], [139.9, -23], [140.4, 23], [140.9, -23], [141.4, 23], [141.9, -23]] },   // "say it slow, I'll frame it, hanging in the hall"
        { from: 142.5, to: 142.6, kits: ['nhBigFrame'], at: 142.5, s: 2.5, sy: 1.9 },             // and you fly through it
        // the courthouse
        { from: 142.0, to: 156.0, kits: ['nhMainStreet'], signs: ['PHARMACY', 'HARDWARE', 'BARBER'], clear: [[149.4, 153.0, 1]] },
        { from: 151.6, to: 151.7, kits: ['nhCourthouse'], at: 151.6, x: 45 },                      // "before I ever took the stand"
        { from: 150.6, to: 150.7, kits: ['nhGavel'], at: 150.6, x: 27, hit: 149.70, lift: 3.6 },   // "court adjourned": it comes down on the beat of "-journed"
        // the week again, at sundown
        { from: 156.0, to: 181.0, kits: ['nhStreet'], string: true, clear: [[169.4, 170.5, 1, 'all']] },
        { from: 156.0, to: 181.0, kits: ['nhEvidence'] },
        { from: 155.96, to: 178.2, kits: ['nhHydrants'] },
        { from: 156.0, to: 178.2, kits: ['nhBunting'], every: 0.62 },
        { from: 163.9, to: 164.0, kits: ['nhParade'], at: [[163.9, 0, 'hand']], lift: 14 },       // "you were doing nothing red handed"
        { from: 178.21, to: 178.3, kits: ['nhTape'], at: 178.21 },                                 // "like a free man breaking free": through the tape
        { from: 180.1, to: 180.2, kits: ['nhFlock'], at: 180.1, when: 178.25, n: 30, lift: 2.5 }, // and the doves go up ahead of her
        // the getaway: the edge of town, the speed limit, the fire trucks' salute
        { from: 181.0, to: 196.0, kits: ['nhEdge'], clear: [[192.3, 196.5, 1, 'all']] },
        { from: 182.0, to: 194.0, kits: ['nhSpeedSigns'], every: 2.6 },                           // "at the speed limit"
        { from: 185.6, to: 191.2, kits: ['nhFireTrucks'], at: 187.6, x: 17 },                     // "both hands at ten and two till you vanish": the send-off
        { from: 196.0, to: 230.0, kits: ['nhFields'], side: -1 },
        { from: 197.2, to: 197.3, kits: ['nhTownSign'], at: 197.2, x: -15 },                      // the town line
        { from: 199.0, to: 216.0, kits: ['nhLookout'], viewer: 208.0 },                            // the lookout over the valley: "nothing ever will again"
      ],
      roads: [
        { x: 0, width: 12, walk: 3, laneLines: 1, from: -10, to: 196, lanes: [-3, 3], density: 0.05, lampEvery: 40, dry: true, follow: true },
        { x: 0, width: 10, walk: 0, laneLines: 1, from: 196, to: 230, traffic: false, lampEvery: 60, dry: true, follow: true },
      ],
      vehicles: [
        { kind: 'sedan', paint: 0xd8ccb4, at: 15.95, rate: 0, x: 1, lane: 2.1, lightsOn: 999, from: 2, to: 18.8 },    // "your car's parked fully (il)legal, halfway down her street": the transcripts disagree, so it's just parked
        { kind: 'sedan', paint: 0xd8ccb4, lead: [[180.2, 0.35], [181.4, 0.55], [187.0, 0.6], [193.6, 3.2]], x: 0.001, lane: 99, from: 180.3, to: 194.4 },  // the getaway, blinker on
      ],
      lyricBg: '#f2efe6', lyricColor: '#1c1c1c', lyricCore: '#1c1c1c', lyricX: 25, lyricFloor: true,
      shelf: 70, drop: 2.4,
      lyrics: [
        { t: 36.3, text: 'SHE TELLS ME\nEVERYTHING', side: 1 },
        { t: 44.5, text: 'I CAUGHT YOU DOING\nNOTHING RED-HANDED', side: -1 },
        { t: 47.3, text: 'FINGERPRINTS ON NOTHING\nSQUEAKY CLEAN', side: 1 },
        { t: 90.0, text: 'REAL SUBTLE, DUDE', side: -1 },
        { t: 99.4, text: 'NOTHING HAPPENED', side: 1 },
        { t: 128.1, text: 'YOUR PERFECT ALIBI\nWAS THE TRUTH', side: -1 },
        { t: 168.5, text: 'NO ONE LEFT\nTO LIE TO ME', side: 1 },
        { t: 180.3, text: 'YOU MADE YOUR GETAWAY\nAT THE SPEED LIMIT', side: 1 },
        { t: 193.2, text: 'GONE FOR GOOD', side: -1 },
      ],
      finale: { kind: 'town', t: 208.6, x: 150, fireAt: 200.3, orbit: { r: 19, h: 4.4, y: 40, facing: true, back: 1.2, right: 0.3, swing: 0.25, heroUp: 3, heroBack: 7, heroSide: 2.2, heroTilt: 0, heroFov: 52 } },
    },
  },
  {
    // the family's year in their suburb, told back to him. The street at night and the phone left
    // unlocked; the supermarket: the frozen-foods aisle, a coffee, the scales; the match, and the
    // fire; his dad's driveway, the grill, the trophies; the apple tree; Christmas and a single click;
    // same genetics; Thanksgiving, Father's Day, the table with the empty chair, the yard in the rain;
    // revenge served cold; and the family's house dressed for every holiday at once.
    id: 'i-fucked-your-dad',
    accent: '#ff5a4a',
    title: 'I FUCKED YOUR DAD',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // "oh, you're gonna hate this story"
      { t: 9.75, kind: 'pre', endY: 22 },
      { t: 11.18, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 11 },          // the band
      { t: 22.59, kind: 'verse', c: 1.0, endY: 12, turn: 0.3 },                                 // the frozen-foods aisle
      { t: 33.99, kind: 'verse', c: 1.15, endY: 12, turn: 0.3 },                                // "told him everything"
      { t: 45.39, kind: 'pre', endY: 18 },
      { t: 46.82, kind: 'bridge', endY: 14 },                                                   // quiet: "you lit the match so gently"
      { t: 53.95, kind: 'pre', endY: 24 },                                                      // "but I'm the fire"
      { t: 59.64, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 10 },
      { t: 72.47, kind: 'chorus', c: 1.3, endY: 11 },
      { t: 83.87, kind: 'chorus', c: 1.25, endY: 11 },
      { t: 95.27, kind: 'verse', endY: 11 },
      { t: 106.68, kind: 'verse', c: 1.0, endY: 12 },                                           // "the apple didn't fall far"
      { t: 116.65, kind: 'pre', endY: 22 },
      { t: 118.07, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 11 },        // "I could ruin Christmas"
      { t: 129.47, kind: 'bridge', endY: 14 },                                                  // "you wanted to destroy me"
      { t: 136.57, kind: 'pre', endY: 24 },                                                     // "but baby, I win"
      { t: 140.88, kind: 'break', endY: 18 },
      { t: 142.29, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10, gap: true },   // "I fucked your dad": the bass drops out, then over the hole
      { t: 155.13, kind: 'chorus', c: 1.35, endY: 11 },                                         // "same genetics"
      { t: 166.54, kind: 'final', c: 1.2, endY: 12 },                                           // Thanksgiving, Father's Day
      { t: 177.96, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                               // "the ghost at every table"
      { t: 183.65, kind: 'verse', c: 1.1, endY: 12 },                                           // the yard
      { t: 193.63, kind: 'pre', endY: 22 },
      { t: 195.06, kind: 'break', endY: 18 },
      { t: 196.45, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },
      { t: 207.88, kind: 'final', c: 1.4, endY: 11 },                                           // "revenge is served cold"
      { t: 219.30, kind: 'final', c: 1.3, endY: 11 },
      { t: 230.71, kind: 'outro', endY: 5 },                                                    // "you're welcome"
    ],
    rails: [
      { t: 24.01, bars: 2, x: 0 },        // "the frozen foods aisle"
      { t: 110.95, bars: 2, x: 0 },       // "the apple didn't fall far"
    ],
    palette: 'fdNight',
    world: 'family',
    collect: 'apple',
    titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.4 },
    looks: [
      { t: -99, palette: 'fdNight' },
      { t: 22.9, palette: 'fdMarket', fade: 0.4 },              // the supermarket
      { t: 45.6, palette: 'fdNight', fade: 0.4 },               // the car park
      { t: 55.0, palette: 'fdFire', fade: 0.6 },                // "the fire that burned it all"
      { t: 59.9, palette: 'fdSummer', fade: 0.6 },              // his dad's driveway, a summer night
      { t: 96.0, palette: 'fdDusk', fade: 1.6 },                // the lawns at dusk, the sprinklers
      { t: 118.4, palette: 'fdWinter', fade: 0.6 },             // Christmas
      { t: 142.6, palette: 'fdDay', fade: 0.6 },                // a bright day
      { t: 166.8, palette: 'fdDay', set: { horizon: 0xffb070, zenith: 0x4a6aa8, skyGlow: 0xff9a40, ground: 0x6a5a2a, fog: 0xc89a70, tree: 0x8a4a1a, sunK: 1.4 }, fade: 0.6 },   // Thanksgiving
      { t: 172.0, palette: 'fdDay', set: { horizon: 0xd8eaff, skyGlow: 0xfff0c0, sunK: 1.8 }, fade: 0.6 },   // Father's Day
      { t: 177.6, palette: 'fdDusk', set: { fog: 0x3a4a5a, skyLight: 0x8a9ab8, horizon: 0x6a7a9a, skyGlow: 0x9aa8c8, sunK: 0.5 }, fade: 0.5 },   // the ghost at every table
      { t: 183.4, palette: 'fdRain', fade: 0.6 },               // the yard in the rain
      { t: 196.8, palette: 'fdSummer', fade: 0.6 },             // the last chorus, fireworks
      { t: 232.0, palette: 'fdDawn', fade: 3.0 },               // every holiday
    ],
    moments: [
      { t: 54.8, kind: 'flash', k: 0.25 },                     // the fire
      { t: 83.9, kind: 'fireworks', n: 8, ahead: 4.6, x: 46, y: 34, size: 1.0 },
      { t: 88.2, kind: 'fireworks', n: 8, ahead: 4.6, x: 46, y: 34, size: 1.0 },
      { t: 91.5, kind: 'fireworks', n: 10, ahead: 4.6, x: 50, y: 36, size: 1.1 },
      { t: 125.3, kind: 'shutter', k: 0.7 },                   // "a single click"
      { t: 183.6, kind: 'thunder', k: 0.5 },                   // the yard, the weather
      { t: 197.0, kind: 'fireworks', n: 10, ahead: 4.6, x: 48, y: 34, size: 1.1 },
      { t: 202.2, kind: 'fireworks', n: 10, ahead: 4.6, x: 48, y: 34, size: 1.1 },
      { t: 207.9, kind: 'fireworks', n: 14, ahead: 4.6, x: 52, y: 36, size: 1.2 },
      { t: 219.3, kind: 'fireworks', n: 12, ahead: 4.6, x: 50, y: 36, size: 1.2 },
      { t: 225.0, kind: 'fireworks', n: 12, ahead: 4.6, x: 50, y: 36, size: 1.2 },
      { t: 239.5, kind: 'pop', k: 0.4 },                       // "you're welcome"
    ],
    confetti: [[166.6, 171.4], [207.9, 212.4]],
    confettiColors: [0xff5a4a, 0xffd860, 0xff9a3a, 0x8a3a1a, 0xffffff],
    confettiNormal: true,
    scenery: {
      rooms: [
        { style: 'market', from: 22.59, to: 45.39, caps: [{ kind: 'front', hw: 12, hh: 19 }, { kind: 'wall', hw: 12, hh: 19 }] },   // the supermarket
      ],
      zones: [
        // the street, the houses, the porch lights
        { from: -6, to: 22.4, kits: ['suburb'], lampX: 17 },
        { from: 45.5, to: 231, kits: ['suburb'], lampX: 17 },
        { from: 0, to: 0.1, kits: ['fdAisle'], at: 24.6, lift: 13 },
        // the fire, along both sides
        { from: 54.8, to: 61.5, kits: ['fdFire'], every: 0.22, x: 26, on: 54.8, off: 61.0 },
        { from: 95.6, to: 110.6, kits: ['fdSprinklers'], every: 0.55 },
        { from: 118.2, to: 131.0, kits: ['fdLights'], every: 0.25, x: 15, click: 125.3 },
        { from: 0, to: 0.1, kits: ['fdProps'], at: [
          { t: 18.6, x: -30, kind: 'phone', s: 1.5, burn: 20.0 },                  // "left your phone unlocked"
          { t: 29.6, x: -22, kind: 'coffee', s: 1.1, floor: true },                // "he bought me coffee"
          { t: 34.6, x: 22, kind: 'cart', s: 1.2, floor: true },                   // "let me walk you through"
          { t: 44.2, x: -22, kind: 'scales', s: 1.0, level: 43.4, floor: true },   // "we can equalize"
          { t: 54.2, x: -30, kind: 'match', s: 1.3, strike: 52.6 },                // "you lit the match so gently"
          { t: 62.8, x: 30, kind: 'mug', s: 1.6 },                                 // "better than you"
          { t: 67.8, x: -30, kind: 'grill', s: 1.8 },
          { t: 73.2, x: 30, kind: 'podium', s: 1.5 },
          { t: 113.0, x: 30, kind: 'appletree', s: 1.3 },                         // "the apple didn't fall far from the tree"
          { t: 126.0, x: -32, kind: 'xmas', s: 1.2, click: 125.3 },                // "I could ruin Christmas with a single click"
          { t: 137.0, x: 30, kind: 'trophy', s: 1.4 },                             // "but baby, I win"
          { t: 158.8, x: -30, kind: 'helix', s: 1.2 },                             // "same genetics, different man"
          { t: 168.6, x: 30, kind: 'turkey', s: 1.3 },                             // "every Thanksgiving"
          { t: 173.6, x: -30, kind: 'gift', s: 1.5 },                              // "every Father's Day"
          { t: 179.0, x: 40, kind: 'table', s: 1.6 },                              // "I'm the ghost at every table"
          { t: 181.8, x: -40, kind: 'table', s: 1.6, hell: true },                 // "freshly catered hell"
          { t: 185.8, x: -30, kind: 'swing', s: 1.3 },                             // crying in the yard
          { t: 193.6, x: -60, kind: 'letters', s: 1.6, on: 191.4 },                // "every time you hear Dad"
          { t: 215.0, x: 30, kind: 'cold', s: 1.3, lift: 213.8 },                  // "revenge is served cold"
        ] },
      ],
      lyricPart: 'fdSign', lyricX: 0, lyricBg: '#f4f2ea', lyricColor: '#141414', lyricCore: '#141414',
      lyrics: [
        { t: 0.0, text: "OH, YOU'RE GONNA\nHATE THIS STORY", h: 14, lead: 3.2 },
        { t: 16.74, text: 'LEFT YOUR PHONE UNLOCKED\nLIKE A FUCKING CLOWN', h: 14 },
        { t: 25.38, text: "HOW YOU HOLDING UP?\nIT'S BEEN A WHILE", h: 12 },
        { t: 43.06, text: 'I KNOW A WAY THAT\nWE CAN EQUALIZE', h: 12 },
        { t: 52.5, text: 'YOU LIT THE MATCH\nSO GENTLY', h: 14 },
        { t: 111.36, text: "THE APPLE DIDN'T FALL\nFAR FROM THE TREE AT ALL", h: 14 },
        { t: 122.84, text: 'I COULD RUIN CHRISTMAS\nWITH A SINGLE CLICK', h: 14 },
        { t: 133.84, text: 'BUT BABY, I WIN', h: 14 },
        { t: 157.42, text: 'SAME GENETICS,\nDIFFERENT MAN', h: 14 },
        { t: 177.24, text: "I'M THE GHOST\nAT EVERY TABLE", h: 14 },
        { t: 185.74, text: "IT'S JUST THE WEATHER", h: 14 },
        { t: 213.4, text: 'REVENGE IS SERVED COLD', h: 14 },
        { t: 239.54, text: "YOU'RE WELCOME", h: 14, lead: 0.8 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'house', t: 244.0, x: -64, s: 2.4, rot: -1.57, fireAt: 232.0, orbit: { r: 130, h: 14, y: 16, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.18, heroBack: 11, heroFov: 42, heroUp: 1.8 } },   // the house with every holiday on it, beside the card
    },
  },
  {
    // the courthouse, and she's on trial for it: "order in the court", the marble halls and Lady
    // Justice, the switchblades, the jury, the key thrown away, the evidence room, red-handed, the
    // front page she bursts through into the chorus, the cells and the lips that swallow the key,
    // the cuffs worn like jewellery, her lawyer the mirror; "case closed", the front doors swing
    // open, and out into the press and the night, her lipstick a monument in the square.
    id: 'pretty-until-proven-guilty',
    accent: '#ff3a5a',
    title: 'Pretty Until Proven Guilty',
    collect: 'cuffs',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                                         // "order in the court"
      { t: 8.17, kind: 'verse', start: 'launch', kick: 8, endY: 10, turn: 0.3 },             // the band in: the marble hall
      { t: 22.12, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },
      { t: 28.30, kind: 'break', endY: 12, turn: 0.3 },
      { t: 29.86, kind: 'verse', endY: 12, turn: 0.3 },                                      // "guess I lean on your wasted youth"
      { t: 34.50, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },          // "pretty until proven guilty"
      { t: 46.90, kind: 'break', endY: 14, turn: 0.3 },                                      // "throw away the key"
      { t: 49.99, kind: 'post', start: 'launch', kick: 8, endY: 12, turn: 0.3 },             // "pretty, pretty, pretty"
      { t: 57.73, kind: 'verse', endY: 12, turn: 0.3 },                                      // "read me my rights"
      { t: 76.33, kind: 'pre', endY: 22, turn: 0.3 },                                        // "caught red-handed"
      { t: 84.05, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3, gap: true },   // through the front page and over the gallery
      { t: 96.46, kind: 'break', endY: 14, turn: 0.3 },                                      // "swallow the key"
      { t: 99.53, kind: 'post', start: 'launch', kick: 8, endY: 12, turn: 0.3 },
      { t: 105.72, kind: 'bridge', endY: 12, turn: 0.3 },                                    // "click those cuffs tight"
      { t: 113.47, kind: 'final', start: 'launch', kick: 11, endY: 10, turn: 0.3 },          // "my lawyer is my mirror"
      { t: 121.22, kind: 'break', endY: 12, turn: 0.3 },                                     // "I said I'm always right"
      { t: 122.77, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },          // "pretty, guilty, pretty, guilty"
      { t: 135.14, kind: 'break', endY: 14, turn: 0.3 },
      { t: 136.69, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 138.23, kind: 'final', start: 'launch', kick: 12, endY: 10, turn: 0.3 },          // the last chorus
      { t: 150.63, kind: 'break', endY: 14, turn: 0.3 },
      { t: 153.73, kind: 'final', start: 'launch', kick: 10, endY: 8, turn: 0.3 },           // "case closed"
      { t: 166.12, kind: 'outro', endY: 5, turn: 0.3 },
    ],
    palette: 'pupCourt',
    world: 'court',
    // the chorus is her premiere: searchlights in her colours, the press's flashbulbs (ppg-sets.js)
    lift: { flash: 0xfff0d8, fog: 0.3, beams: { colors: [0xfff4e0, 0xff3a5a, 0xffd27a], x: 34, every: 1.3, y: 6 } },
    rails: [
      { t: 12.85, bars: 2, x: 0 },        // the band's groove down the marble hall, off under the scales
      { t: 65.46, bars: 2, x: 0 },        // "your new girl stalking": past the board with the red string
    ],
    titleView: { ahead: -0.14, x: 2.0, h: 2.0, back: -0.55, lookH: 3.0 },   // behind her, down the courtroom to the bench
    looks: [
      { t: -99, palette: 'pupCourt' },
      { t: 8.17, palette: 'pupHall', fade: 0.4 },           // the marble hall
      { t: 28.30, palette: 'pupCourt', fade: 0.4 },         // the courtroom: the jury, the stand
      { t: 46.90, palette: 'pupHall', fade: 0.4 },          // "throw away the key"
      { t: 57.73, palette: 'pupEvidence', fade: 0.3 },      // the evidence room
      { t: 76.33, palette: 'pupRed', fade: 0.4 },           // "caught red-handed"
      { t: 84.05, palette: 'pupCourt', fade: 0.3 },
      { t: 94.89, palette: 'pupCells', fade: 0.25 },        // "lock me up"
      { t: 105.72, palette: 'pupMirror', fade: 0.4 },       // "click those cuffs tight"
      { t: 107.9, palette: 'pupCold', fade: 1.2 },          // "let the cold bite deep"
      { t: 113.47, palette: 'pupMirror', fade: 0.6 },       // "my lawyer is my mirror"
      { t: 121.22, palette: 'pupHall', fade: 0.4 },         // the scales
      { t: 135.14, palette: 'pupCourt', fade: 0.4 },
      { t: 150.63, palette: 'pupVerdict', fade: 0.6 },      // "case closed"
      { t: 161.2, palette: 'pupSteps', fade: 0.8 },         // out the front doors: the square at night, the press
    ],
    moments: [
      { t: 1.22, kind: 'knock', k: 0.5, n: 1 },             // the gavel: "order in the court"
      { t: 32.95, kind: 'knock', k: 0.35, n: 2, gap: 387 }, // "one, two", on the beats
      { t: 95.47, kind: 'knock', k: 0.6, n: 2, gap: 150 },  // the cells slam: "lock me up"
      { t: 98.19, kind: 'shutter', k: 0.06 },               // the booking camera: "pretty,
      { t: 99.16, kind: 'shutter', k: 0.06 },               //   pretty,
      { t: 99.53, kind: 'shutter', k: 0.08 },               //   pretty"
      { t: 101.46, kind: 'shutter', k: 0.06 },
      { t: 102.23, kind: 'shutter', k: 0.06 },
      { t: 103.39, kind: 'shutter', k: 0.08 },
      { t: 107.27, kind: 'shutter', k: 0.2 },               // the cuffs click: "tight"
      { t: 158.38, kind: 'knock', k: 0.7, n: 1 },           // "case closed!"
      { t: 160.30, kind: 'knock', k: 0.7, n: 1 },
    ],
    scenery: {
      rooms: [
        { style: 'court', from: -3.4, to: 8.17, caps: [null, CDOOR] },                // "order in the court"
        { style: 'hall', from: 8.17, to: 28.30, caps: [null, CDOOR] },                // the marble hall, the scales
        { style: 'court', from: 28.30, to: 46.90, caps: [null, CDOOR] },              // the jury, the witness stand
        { style: 'hall', from: 46.90, to: 57.73, caps: [null, CDOOR] },               // "throw away the key", the mirrors
        { style: 'evidence', from: 57.73, to: 76.33, caps: [null, CDOOR] },           // "read me my rights"
        { style: 'hall', from: 76.33, to: 84.05, caps: [null, CDOOR] },               // "caught red-handed"
        { style: 'court', from: 84.05, to: 94.89, caps: [null, CDOOR] },
        { style: 'cells', from: 94.89, to: 105.72, caps: [null, CDOOR] },             // "lock me up"
        { style: 'mirror', from: 105.72, to: 121.22, caps: [null, CDOOR] },           // the cuffs, the lawyer
        { style: 'hall', from: 121.22, to: 135.14, caps: [null, CDOOR] },             // "pretty, guilty"
        { style: 'court', from: 135.14, to: 150.63, caps: [null, CDOOR] },
        { style: 'court', from: 150.63, to: 161.475, caps: [null, { kind: 'wall', hw: 14, hh: 30 }] },   // "case closed"; the front doors
      ],
      roomEvents: { red: [77.7, 84.0, 0.4, 0.4], cold: [107.9, 113.4, 0.8, 1.0], glitch: [81.62, 82.4, 0.06, 0.12] },   // "I'm the glitch in your game"
      zones: [
        // the courtroom: the gallery's benches, the bench ahead, the gavel on "order in the court"
        { from: -3.0, to: 6.8, kits: ['pews'], every: 0.5 },
        { from: 7.8, to: 7.9, kits: ['judgeBench'], at: [[7.87, -23.5, true], [7.87, 23.5, false]], strikes: [1.22] },
        // the marble hall: columns down both sides, Lady Justice between them (her scales tip to the
        // beat in the chorus), the scales hung over the road
        { from: 8.6, to: 28.0, kits: ['columns'], every: 1.0, x: 40 },
        { from: 9.6, to: 27.8, kits: ['ppgJustice'], every: 2.0, x: 29, s: 1.45 },
        { from: 16.0, to: 16.1, kits: ['scales'], at: 16.0, lift: 24, s: 1.1 },
        // the courtroom: the switchblade over the road snaps open on "switchblade"; the jury box; a
        // row of them on stands flicking open down the room on "keen as a switchblade"; the stand
        { from: 28.6, to: 46.5, kits: ['pews'], every: 0.55, clear: [[33.6, 39.2, 1], [40.4, 44.6, -1]] },
        { from: 32.7, to: 32.8, kits: ['ppgKnife'], at: 32.7, open: 31.413, lift: 9, s: 1.5 },
        { from: 35.5, to: 35.6, kits: ['jury'], at: 35.5, x: 36, s: 1.1 },
        { from: 41.7, to: 45.4, kits: ['ppgKnives'], every: 0.42, x: 27, open: 41.47, gap: 0.097, lift: 4 },
        { from: 42.4, to: 42.5, kits: ['stand'], at: 42.4, x: -34, s: 1.3 },
        // "throw away the key"; mirrors with bulbs round them down the hall
        { from: 50.3, to: 50.4, kits: ['key'], at: 50.3, throwAt: 48.94, s: 1.4 },
        { from: 50.6, to: 57.4, kits: ['vanities'], every: 0.75, x: 48.6, y: 20, s: 1.2 },
        // the evidence room: the hoodie in its bag, the receipts, the ring lights, the broken heart
        { from: 63.1, to: 63.2, kits: ['hoodie'], at: 63.1, x: 36, y: 18, s: 1.4 },       // "grand theft hoodie"
        { from: 64.6, to: 66.0, kits: ['receipts'], at: [64.8, 65.3], top: 40 },        // "got receipts for every gift"
        { from: 69.5, to: 69.6, kits: ['stand'], at: 69.5, x: 33, s: 1.2 },              // "livestreaming meltdowns from the witness floor"
        { from: 72.6, to: 72.7, kits: ['heartCase'], at: 72.6, x: -32, s: 1.3 },         // "you say I broke your heart"
        // red-handed: handprints and paint down the hall, the buckets
        { from: 77.6, to: 84.0, kits: ['paintDecals'], at: [[78.6, 49.6, 'hand', 12], [78.9, -49.6, 'hand', 18], [79.3, 49.6, 'splat', 22, 1.4], [79.6, -49.6, 'hand', 10], [80.0, 49.6, 'hand', 20], [80.4, -49.6, 'splat', 14, 1.6], [80.9, 49.6, 'hand', 9], [81.3, -49.6, 'hand', 24], [81.8, 49.6, 'splat', 16, 1.2], [82.3, -49.6, 'hand', 13], [82.8, 49.6, 'hand', 19], [83.3, -49.6, 'splat', 20, 1.5]] },
        { from: 78.0, to: 83.0, kits: ['buckets'], at: [[79.0, 30], [80.6, -32], [82.2, 34]] },
        { from: 76.6, to: 83.6, kits: ['columns'], every: 1.0, x: 40 },
        // the courtroom again, after the front page: "keen as a switchblade"
        { from: 84.4, to: 94.5, kits: ['pews'], every: 0.55 },
        { from: 91.3, to: 94.3, kits: ['ppgKnives'], every: 0.42, x: 27, open: 91.04, gap: 0.097, lift: 4 },
        // the cells: the doors slam shut down the row on "lock me up"; the lips swallow the key; the
        // booking cameras, a flash on every "pretty"
        { from: 95.0, to: 105.4, kits: ['cellDoors'], every: 0.5, x: 37.2, shut: 95.47, gap: 0.08 },
        { from: 99.0, to: 99.1, kits: ['ppgLips'], at: 99.0, gulp: 97.81, lift: 9, s: 1.3 },
        { from: 100.0, to: 100.1, kits: ['ppgCam'], at: 100.0, x: -21, flashes: [98.19, 99.16, 99.53] },
        { from: 103.7, to: 103.8, kits: ['ppgCam'], at: 103.7, x: 21, flashes: [101.46, 102.23, 103.39] },
        // the room of mirrors: the cuffs clicking shut on "tight", then her lawyer
        { from: 107.5, to: 107.6, kits: ['cuffs'], at: 107.5, hang: true, lift: 16, click: 107.27, s: 1.6 },
        { from: 113.8, to: 113.9, kits: ['lawyer'], at: 113.8, lift: 18 },
        { from: 114.7, to: 121.0, kits: ['vanities'], every: 0.55, x: 44.2, y: 20, s: 1.25 },   // "says I'm doing fine": the bulbs chase
        // the scales: pretty, guilty, pretty, guilty, and every Lady Justice down the hall with them
        { from: 121.6, to: 134.8, kits: ['columns'], every: 1.0, x: 40 },
        { from: 122.6, to: 134.6, kits: ['ppgJustice'], every: 2.0, x: 29, s: 1.45, tips: [[129.30, 1], [129.86, -1], [130.64, 1], [131.24, -1], [132.04, 1], [132.86, 1], [133.24, 1], [133.60, -1]], tipsEnd: 135.1 },
        { from: 134.0, to: 134.1, kits: ['scales'], at: 134.0, lift: 24, s: 1.25, tips: [[129.30, 1], [129.86, -1], [130.64, 1], [131.24, -1], [132.04, 1], [132.86, 1], [133.24, 1], [133.60, -1]] },
        // the last courtroom: "smile like a switchblade"; "cuffs as couture"; the bench, "case closed"
        { from: 135.5, to: 150.3, kits: ['pews'], every: 0.55, clear: [[143.0, 146.0, -1]] },
        { from: 142.7, to: 145.6, kits: ['ppgKnives'], every: 0.42, x: 27, open: 142.5, gap: 0.097, lift: 4 },
        { from: 145.0, to: 145.1, kits: ['cuffs'], at: 145.0, x: -30, s: 1.5 },
        { from: 151.0, to: 161.0, kits: ['pews'], every: 0.55, clear: [[158.0, 161.5, -1]] },
        { from: 159.6, to: 159.7, kits: ['judgeBench'], at: [[159.6, -30, true]], strikes: [158.378, 160.297] },
        // out the front doors (they swing open on the second "case closed"): the square at night, the
        // press on its risers, the vans, the lamps, the city lit beyond, and her monument (the finale)
        { from: 161.8, to: 173.0, kits: ['ppgLamps'], every: 0.5, x: 19, clear: [[167.9, 170.2, -1]] },
        { from: 161.9, to: 166.5, kits: ['ppgRisers'], every: 0.62, x: 31 },
        { from: 163.0, to: 165.0, kits: ['ppgVans'], at: [[163.4, 56], [164.9, -56]] },
        { from: 157.5, to: 188.0, kits: ['ppgSkyline'], x: 150, every: 0.5, wake0: 0.6 },
      ],
      lyricPart: 'placard', lyricBg: '#3a2414', lyricColor: '#e8c060', lyricCore: '#fff0b0', lyricS: 1,
      lyrics: [
        { t: 0.0, lead: 2.4, text: 'ORDER IN\nTHE COURT', x: 0, h: 14, frame: 'rgba(0,0,0,0)' },
        { t: 34.48, text: 'PRETTY UNTIL\nPROVEN GUILTY', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 58.74, text: 'READ ME\nMY RIGHTS', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 95.44, lead: 1.2, text: 'LOCK ME UP', x: 0, h: 10, frame: 'rgba(0,0,0,0)' },
        { t: 146.46, text: 'IF SELF-LOVE IS A CRIME\nAGAINST HUMANITY', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 158.32, text: 'CASE CLOSED', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
      ],
      // his lines on the things they belong on (ppg-sets.js): the dress code by the door, the
      // stalker's board, the booking walls, red paint over the courtroom doors, lipstick on the mirror
      ppgBoards: [
        { kind: 'dress', t: 38.2, x: 27, lift: 6, w: 14, text: 'SKIRT TOO SHORT\nFOR THE COURTHOUSE' },
        { kind: 'cork', t: 66.4, x: -27, lift: 2 },
        { kind: 'chart', t: 100.3, x: -31, lift: 2 },
        { kind: 'chart', t: 104.0, x: 31, lift: 2 },
        { kind: 'paint', t: 84.05, wall: 37, w: 62, text: 'CAUGHT\nRED-HANDED', ahead: 9 },
        { kind: 'lips', t: 113.8, x: 0, lift: 18, z: 0.4, w: 30, text: 'MY LAWYER\nIS MY MIRROR', turn: 0 },
      ],
      ppgPretty: [52.02, 52.74, 53.14],                  // the vanity bulbs: "pretty, pretty, pretty"
      ppgPress: { outFrom: 161.475 },                    // from the doors on, the photographers on the risers
      ppgOutside: { door: { t: 161.475, hw: 14, hh: 30, open: 160.297 } },
      // "crime of the century, owning my name": the front page over the courtroom doors, torn
      // through on the chorus's first beat (ppg-paper.js); the press's pages after it
      ppgPaper: { t: 84.05, text: 'CRIME OF\nTHE CENTURY', deck: 'OWNING MY NAME', pages: [[84.3, 94.6, 70], [138.6, 150.3, 50], [154.0, 161.2, 44]] },
      shelf: 70, drop: 4,
      // her monument in the square: "lipstick stays on" (it winds up out of its case on the line)
      finale: { kind: 'lipstick', t: 169.0, x: -44, fireAt: 161.475, rise: 161.32, text: 'LIPSTICK STAYS ON', orbit: { y: 26, heroBack: 14, heroSide: 1.4, heroUp: 3.0, heroFov: 42, heroTilt: 6, heroPan: 0.2, r: 80, h: 12 } },
    },
  },
  {
    // the venue he played for a decade and a day, and in June they changed the locks: the alley
    // and the stage door with its new deadbolt and the memo, the room next door where the party
    // comes through the drywall, the street under the marquee; back in through the front doors,
    // the piano playing his songs, the dressing room and his letters, the party, the bar's open
    // tab, the stands. Out the back to the stage door again: somebody made a key.
    id: 'back-by-popular-demand',
    accent: '#f0c860',
    title: 'Back by Popular Demand',
    startY: 11,
    sections: [
      { t: 0.0, kind: 'intro', endY: 10 },
      { t: 9.26, kind: 'verse', start: 'launch', launchBeats: 3, kick: 7, endY: 11 },                   // the band comes in
      { t: 15.55, kind: 'verse', endY: 10 },                                                            // "they changed the locks in June"
      { t: 29.64, kind: 'verse', c: 0.85, endY: 11, turn: 0.3 },                                        // "I could hear you through the drywall"
      { t: 42.15, kind: 'pre', endY: 24, turn: 0.3 },                                                   // "nineteen days, I counted twice"
      { t: 53.09, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },                // out the window: "so say it like you mean it"
      { t: 76.33, kind: 'break', start: 'launch', launchBeats: 3, kick: 8, endY: 12 },                  // the band stops; land as it comes back
      { t: 79.42, kind: 'verse', endY: 11, turn: 0.3 },                                                 // "now the door swings like it's sorry"
      { t: 97.91, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                         // "but the calendar says tonight"
      { t: 104.07, kind: 'pre', endY: 24, turn: 0.3 },                                                  // "nineteen days I wrote you letters"
      { t: 116.36, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10, turn: 0.3 },
      { t: 137.90, kind: 'break', start: 'launch', launchBeats: 3, kick: 8, endY: 12, turn: 0.3 },      // the band stops again
      { t: 140.97, kind: 'post', endY: 14, turn: 0.3 },                                                 // "somebody kept the tab open"
      { t: 154.78, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 12, turn: 0.3 },     // "a banner in the doorway"
      { t: 162.45, kind: 'pre', endY: 20, turn: 0.3 },                                                  // "you don't get to pick who misses you"
      { t: 167.08, kind: 'break', endY: 26, turn: 0.3 },                                                // "lucky me, it was you"
      { t: 173.26, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10, turn: 0.3, gap: true },   // the band comes back: over the hole
      { t: 187.11, kind: 'final', c: 1.3, endY: 12, turn: 0.3 },                                        // "once enough to fill the stands"
      { t: 197.85, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },                // out the back
      { t: 213.22, kind: 'outro', endY: 5 },                                                            // "somebody made a key"
    ],
    rails: [
      { t: 21.82, bars: 2, x: 0 },        // "just a memo and a deadbolt"
      { t: 87.13, bars: 2, x: 0 },        // "and there's a stranger at the piano, playing songs I used to own"
    ],
    palette: 'bpAlley',
    world: 'venue',
    collect: 'pick',
    titleView: { ahead: -0.16, x: 1.4, h: 2.2, back: -0.8, lookH: 5.0 },   // behind her, the alley and its string lights ahead
    looks: [
      { t: -99, palette: 'bpAlley' },
      { t: 29.8, palette: 'bpNext', fade: 0.4 },        // next door, through the drywall
      { t: 53.3, palette: 'bpStreet', fade: 0.3 },      // out the window: the street under the marquee
      { t: 81.2, palette: 'bpHall', fade: 0.4 },        // "the hallway smells like home"
      { t: 85.9, palette: 'bpClub', fade: 0.4 },        // the piano
      { t: 100.6, palette: 'bpSpot', fade: 0.8 },       // "and tonight the song is mine"
      { t: 104.2, palette: 'bpDressing', fade: 0.3 },   // his letters
      { t: 116.5, palette: 'bpParty', fade: 0.2 },
      { t: 141.1, palette: 'bpBar', fade: 0.4 },        // the tab still open
      { t: 154.9, palette: 'bpParty', fade: 0.2 },      // glitter
      { t: 167.6, palette: 'bpQuiet', fade: 0.8 },      // "lucky me, it was you"
      { t: 173.7, palette: 'bpArena', fade: 0.3 },      // the band's back
      { t: 187.6, palette: 'bpStands', fade: 1.2 },     // "once enough to fill the stands"
      { t: 199.8, palette: 'bpOutro', fade: 1.0 },      // out the back
      { t: 209.0, palette: 'bpDawn', fade: 6.0 },       // "somebody made a key"
    ],
    moments: [
      { t: 18.9, kind: 'knock', n: 1, k: 0.45 },          // "locks in June"
      { t: 25.1, kind: 'knock', n: 1, k: 0.5 },           // "a deadbolt"
      { t: 32.75, kind: 'ring', k: 0.3, dur: 0.5 },        // "every toast"
      { t: 169.0, kind: 'flash', k: 0.12 },               // the spotlight
      { t: 173.7, kind: 'fireworks', n: 10, ahead: 2.6, x: 40, y: 44 },    // the band's back
      { t: 187.0, kind: 'fireworks', n: 12, ahead: 2.8, x: 46, y: 50 },    // "fill the stands"
      { t: 198.25, kind: 'flash', k: 0.25 },
      { t: 207.1, kind: 'knock', n: 1, k: 0.55 },         // the key turns
    ],
    confetti: [[63.8, 67.2], [116.4, 119.6], [157.6, 162.4], [173.7, 177.0], [187.0, 190.4], [196.6, 199.3]],
    confettiColors: [0xffd84a, 0xffffff, 0xff8ad8, 0x8ae8ff, 0xff4a5a, 0xf0c860],
    confettiNormal: true,
    scenery: {
      roomEvents: { loud: [34.9, 41.0] },      // "funny how a room gets louder"
      doors: { t: 80.96, open: 80.3 },        // "now the door swings like it's sorry"
      rooms: [
        { style: 'next', from: 29.64, to: 42.15, caps: [{ kind: 'front', hw: 10, hh: 24 }, BPDOOR] },                // next door, through the drywall
        { style: 'next', from: 42.15, to: 53.09, caps: [null, { kind: 'wall', hw: 11, hh: 21, sill: 5 }] },         // nineteen days; out the window
        { style: 'hall', from: 80.96, to: 85.59, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, BPDOOR] },             // in the front doors: the hallway
        { style: 'club', from: 85.59, to: 97.91, caps: [null, BPDOOR] },                                           // the piano
        { style: 'club', from: 97.91, to: 104.07, caps: [null, BPDOOR] },                                          // the calendar says tonight
        { style: 'dressing', from: 104.07, to: 110.22, caps: [null, BPDOOR] },                                     // his letters
        { style: 'dressing', from: 110.22, to: 116.36, caps: [null, BPDOOR] },                                     // "save my seat"
        { style: 'party', from: 116.36, to: 128.67, caps: [null, BPDOOR] },
        { style: 'party', from: 128.67, to: 140.97, caps: [null, BPDOOR] },
        { style: 'bar', from: 140.97, to: 154.78, caps: [null, BPDOOR] },                                          // the tab, the date, the jukebox; the banner in the doorway
        { style: 'party', from: 154.78, to: 167.08, caps: [null, BPDOOR] },                                        // glitter
        { style: 'quiet', from: 167.08, to: 173.26, caps: [null, BPDOOR] },                                        // "lucky me, it was you"
        { style: 'arena', from: 173.26, to: 199.40, caps: [null, { kind: 'wall', hw: 12, hh: 28 }], fallAt: 187.0, fallFor: 2.2 },  // the stands
      ],
      zones: [
        // the alley behind the venue: the walk-ups' backs, the bulbs strung across, ten years of posters
        { from: -4, to: 29.6, kits: ['tenements'], x: 26, lines: 0, wake0: 0.55, clear: [[24.0, 27.6, 1]] },
        { from: -2, to: 29.4, kits: ['bpFestoon'], every: 0.9, span: 26 },
        { from: 20.6, to: 30.2, kits: ['bpPosters'], every: 0.9, x: 18.7, n: 5, clear: [[24.4, 27.0, 1]] },
        { from: 25.7, to: 25.8, kits: ['bpStageDoor'], at: 25.7, x: 20, s: 0.95, memo: true },   // "a memo and a deadbolt"
        // next door: the frames shaking, every toast; the calendar, the tally, the guest list
        { from: 30.0, to: 52.6, kits: ['bpFrames'], every: 0.8, x: 39.4, y: 12, cells: [0, 1], clear: [[43.4, 45.8, -1], [46.2, 48.6, 1]] },
        { from: 34.0, to: 34.1, kits: ['bpToast'], at: 34.0, lift: 12, s: 0.7 },
        { from: 44.6, to: 44.7, kits: ['bpCal'], at: 44.6, x: -39.2, y: 15, cell: 0, s: 1.1 },
        { from: 47.4, to: 47.5, kits: ['bpTally'], at: 47.4, x: 39.2, y: 15, s: 1.1 },
        { from: 51.4, to: 52.9, kits: ['bpHung'], at: [[51.4, 'list', -6], [52.7, 'tag', 6]], lift: 15 },
        // out the window: the street under the bulbs and the bunting, the balloons, the banner, the punch
        { from: 53.1, to: 80.9, kits: ['tenements'], x: 27, lines: 0, wake0: 0.75 },
        { from: 53.3, to: 80.4, kits: ['bpBunting'], every: 0.8, span: 28, lift: 12 },
        { from: 54.0, to: 80.4, kits: ['bpBalloons'], every: 1.1, x: 19 },
        { from: 62.4, to: 62.5, kits: ['bpHung'], at: [[62.4, 'banner']], tilt: 0.12 },
        { from: 64.6, to: 64.7, kits: ['bpPunch'], at: [[64.6, -25, true]] },
        { from: 78.2, to: 78.3, kits: ['bpMarquee'], at: 78.2, lift: 24 },
        // inside: the hallway's frames, the piano, his songs on paper, tonight, the mic
        { from: 81.2, to: 85.4, kits: ['bpFrames'], every: 0.55, x: 21.4, y: 14, s: 1.0, cells: [2, 3] },
        { from: 88.8, to: 88.9, kits: ['bpPiano'], at: 88.8, x: -27, good: 92.9, s: 1.2 },
        { from: 95.6, to: 95.7, kits: ['bpPages'], at: 95.6, go: 94.8, x: -1 },
        { from: 99.8, to: 99.9, kits: ['bpHung'], at: [[99.8, 'cal', 0, 1]] },
        { from: 102.2, to: 102.3, kits: ['bpMic'], at: 102.2, x: 24, spot: 100.4, off: 104.4, ceil: 44 },
        // the dressing room: the letters going round, the one sentence, the seat
        { from: 106.2, to: 106.3, kits: ['bpLetters'], at: 106.2 },
        { from: 112.8, to: 112.9, kits: ['bpHung'], at: [[112.8, 'letter']] },
        { from: 115.6, to: 115.7, kits: ['bpSeat'], at: 115.6, x: -22, s: 1.3 },
        // the party: the mirrored balls, the balloons, the banner, the punch
        { from: 119.0, to: 137.1, kits: ['bpDisco'], at: [119.0, 129.0, 137.0], lift: 18 },
        { from: 116.6, to: 140.6, kits: ['bpBalloons'], every: 1.2, x: 30, floor: true },
        { from: 124.0, to: 124.1, kits: ['bpHung'], at: [[124.0, 'banner']], tilt: -0.12 },
        { from: 125.8, to: 125.9, kits: ['bpPunch'], at: [[125.8, 26, true]], floor: true },
        // the bar: the tab still open, the date circled, the jukebox, the banner in the doorway
        { from: 143.6, to: 143.7, kits: ['bpRegister'], at: 143.6, x: 25, y: 12 },
        { from: 147.4, to: 147.5, kits: ['bpHung'], at: [[147.4, 'cal', 0, 1]] },
        { from: 150.0, to: 150.1, kits: ['bpJuke'], at: 150.0, x: -25, s: 1.3 },
        { from: 154.5, to: 154.6, kits: ['bpHung'], at: [[154.5, 'banner']], lift: 15, tilt: 0.15 },
        { from: 155.4, to: 166.6, kits: ['bpBalloons'], every: 1.2, x: 30, floor: true },
        { from: 158.0, to: 158.1, kits: ['bpDisco'], at: [158.0], lift: 18 },
        // the quiet: one spotlight on the mic
        { from: 170.8, to: 170.9, kits: ['bpMic'], at: 170.8, x: -22, spot: 168.4, off: 173.3, ceil: 44, s: 1.3 },
        // the stands
        { from: 184.0, to: 199.3, kits: ['bpStands'], x: 80, on: 186.8, every: 0.45 },
        { from: 197.4, to: 197.5, kits: ['bpMarquee'], at: 197.4, lift: 19, s: 1.0 },
        // out the back: the alley again, the bulbs, the posters
        { from: 199.4, to: 219.6, kits: ['tenements'], x: 26, lines: 0, wake0: 0.6 },
        { from: 199.6, to: 213.6, kits: ['bpFestoon'], every: 0.9, span: 26 },
        { from: 201, to: 205, kits: ['bpPosters'], every: 0.9, x: 18.7, n: 5 },
      ],
      roads: [
        { x: 0, width: 14, walk: 4, laneLines: 0, from: -10, to: 29.6, traffic: false, lampEvery: 30, dry: true },
        { x: 0, width: 18, walk: 5, laneLines: 1, from: 53.1, to: 81.0, lanes: [-4.5, 4.5], density: 0.12, lampEvery: 26 },
        { x: 0, width: 14, walk: 4, laneLines: 0, from: 199.4, to: 230, traffic: false, lampEvery: 30, dry: true },
      ],
      lyricPart: 'bpSign', lyricX: 0, lyricBg: '#2a0a10', lyricColor: '#ffd890', lyricCore: '#fff4dc',
      lyrics: [
        { t: 16.2, text: 'THEY CHANGED THE\nLOCKS IN JUNE', h: 14 },
        { t: 55.2, text: 'SAY IT LIKE\nYOU MEAN IT', h: 14 },
        { t: 70.1, text: "LIE TO ME,\nI'LL UNDERSTAND", h: 14 },
        { t: 100.0, text: 'TONIGHT THE\nSONG IS MINE', side: -1, x: 12, h: 14, lead: 1.0 },
        { t: 163.1, text: "YOU DON'T GET TO PICK\nWHO MISSES YOU", h: 15 },
        { t: 169.0, text: 'LUCKY ME,\nIT WAS YOU', h: 9 },
        { t: 202.6, text: 'THEY CHANGED THE\nLOCKS IN JUNE', h: 14 },
        { t: 205.6, text: 'SOMEBODY\nMADE A KEY', h: 14, lead: 1.6 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'key', t: 219.6, x: 0, fireAt: 205.6, turn: 207.1, open: 208.3, orbit: { r: 70, h: 4, y: 20, facing: true, back: 1.4, right: 0.32, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 48, heroUp: 1.5 } },   // the door open, the key in it, beside her
    },
  },
  {
    // Boston on a clear morning, technically freezing, and no coat. Out of the triple-deckers at
    // sunrise with the el beside the street; the South End's bow fronts and the last mile of a
    // race; up over the Back Bay as the glass tower takes the sun; over the Pike on the drop;
    // downtown for a coffee and the free bus; the Custom House clock; the platform where she'd
    // be waiting; under the Zakim; the Common in the snow; up Beacon Hill to the gold dome; down
    // to the Charles and over it on the Longfellow; home, the door unlocked, the cat on the step.
    id: 'technically-thirty-two',
    accent: '#8fd8ff',
    title: 'Technically Thirty-Two',
    collect: 'coffee',
    startY: 4,
    sections: [
      { t: 0.0, kind: 'intro', endY: 4, c: 0.45 },                              // down in the street: the triple-deckers over her, the el above
      { t: 6.06, kind: 'verse', c: 0.85, endY: 9 },
      { t: 11.64, kind: 'chorus', c: 1.1, endY: 8 },                            // the band
      { t: 15.78, kind: 'verse', c: 0.8, endY: 10 },                            // "somebody's fire alarm is wailing"
      { t: 26.69, kind: 'verse', endY: 12 },                                    // "I cut the sunlit stretches quick"
      { t: 38.92, kind: 'pre', endY: 22 },                                      // "shade subtracts the sun"
      { t: 56.40, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, gap: true },  // the bass goes: over the Pike
      { t: 64.54, kind: 'post', endY: 12 },                                     // "I'm only ever early for the trains"
      { t: 68.61, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },    // "that pull away"
      { t: 94.26, kind: 'pre', endY: 22 },                                      // "I think about the cold"
      { t: 101.06, kind: 'chorus', c: 1.35 },                                   // "can't breathe, it's technically thirty-two"
      { t: 116.18, kind: 'post', start: 'launch', launchBeats: 4, kick: 9, endY: 12 },    // "that pull away"
      { t: 121.71, kind: 'verse', c: 0.85, endY: 14 },                          // "she'd be waiting at the platform"
      { t: 132.72, kind: 'chorus', endY: 10 },                                  // "she made it worth the cold"
      { t: 146.39, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // the bass goes again
      { t: 151.88, kind: 'bridge', endY: 26, c: 0.55 },                         // "she wanted kids"
      { t: 166.95, kind: 'pre', endY: 30 },                                     // "now a family is the only thing"
      { t: 178.05, kind: 'chorus', c: 1.3, endY: 12 },                          // "can't freeze a technically 32"
      { t: 189.01, kind: 'pre', endY: 22, c: 0.8 },                             // "I'm done with being early"
      { t: 194.35, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 12 },  // "I leave the door unlocked"
      { t: 206.80, kind: 'break', c: 0.7, endY: 10 },                                     // "there's water in the fridge" and nothing
      { t: 210.85, kind: 'final', start: 'launch', launchBeats: 3, kick: 9, endY: 5 },    // coming out of the sun: over the Charles
      { t: 217.74, kind: 'outro', endY: 3.5 },
    ],
    palette: 'frost',
    world: 'cold',
    titleView: { ahead: -0.24, x: 2.4, h: 4.4, back: -0.5, lookH: 2.4 },   // behind her and up: the gate, the triple-deckers, the el, the towers in the haze
    lift: { flash: 0xffd9a0, fog: 0.42 },
    rails: [
      { t: 30.75, bars: 3, x: 3.2 },          // the race's barrier: "last mile of a race from high school", off on "first rule"
      { t: 172.48, bars: 4, x: -3.2 },        // the iron rail up Beacon Hill, off on the chorus at the gold dome
    ],
    looks: [
      { t: -99, palette: 'frost' },
      { t: 38.7, palette: 'frost', set: { sunK: 0.75, fillK: 0.1, shade: 0.2, moon: 0x9aacc8, skyGlow: 0xb8c8e0 }, fade: 0.3 },   // "shade subtracts the sun": the glass tower takes it
      { t: 40.6, palette: 'frost', fade: 1.4 },            // "but can't subtract what I become"
      { t: 151.9, palette: 'overcast', fade: 4 },          // "she was only in my phone"; "she wanted kids"
      { t: 166.9, palette: 'thaw', fade: 5 },              // "now a family is the only thing I'm building toward"
      { t: 194.3, palette: 'homesun', fade: 3 },           // "I leave the door unlocked these days"
    ],
    moments: [
      { t: 16.3, kind: 'ring', k: 0.2, dur: 1.2 },                       // somebody's fire alarm
      { t: 101.1, kind: 'bell', k: 0.5, n: 3, gap: 338, degree: 0 },     // Old North's bells on the chorus
      { t: 132.8, kind: 'bell', k: 0.45, n: 2, gap: 676, degree: 4 },
      { t: 178.1, kind: 'bell', k: 0.55, n: 4, gap: 338, degree: 0 },    // the gold dome
      { t: 217.8, kind: 'bell', k: 0.4, n: 3, gap: 676, degree: 2 },     // home
    ],
    scenery: {
      el: { x: -17, passes: [
        { at: 2.0, rate: 1.35, cars: 6, from: -8, to: 12 },               // the first one, pulling out as she starts
        { at: 58.5, rate: 1.0, cars: 6, from: 54, to: 64.6 },             // a train keeping pace through the chorus
        { at: 66.2, rate: 1.5, cars: 6, from: 64.6, to: 76 },             // "I'm only ever early for the trains that pull away"
        { at: 114.0, rate: 1.55, cars: 7, from: 108, to: 124 },
        { at: 141.0, rate: 0.55, cars: 6, from: 134, to: 151 },           // "she cried through every goodbye"
        { at: 190.6, rate: 1.45, cars: 8, from: 186, to: 199 },           // "I'm done with being early"
        { at: 212.4, rate: 1.0, cars: 4, from: 209.5, to: 219, x: -12.5, y: 3.4 },   // the Red Line over the Charles, beside her for once
      ] },
      signs: [],
      river: { from: 210.6, to: 236, home: 218.4 },
      hill: { from: 151.5, to: 211, ease: 4, drop: 6, levels: [[157.4, 159.8, 2.5]] },   // the Common rises to Beacon Hill under her and comes down to the Charles; the pond up near her
      cats: [200.4, 206.5],                                                // "the cat thinks that I hunt": a cat in every window
      zones: [
        // Dorchester at sunrise: triple-deckers both sides of the street, the el down the left
        { from: -9, to: 26.7, kits: ['bosstreet'], kinds: ['triple'], xl: 27, xr: 20, back: ['triple'], backAt: 18, span: 0.5 },
        { from: -9, to: 26.7, kits: ['bosfill'], kinds: ['low', 'lowB'] },
        // the South End: bow fronts and brownstones; the race down the middle
        { from: 26.7, to: 39, kits: ['bosstreet'], kinds: ['bow', 'bow', 'bowB', 'bay', 'bayR'], xl: 27, xr: 20, back: ['far', 'farB'], span: 0.45 },
        { from: 26.7, to: 39, kits: ['bosfill'], kinds: ['low', 'lowB', 'lowB'] },
        // the Back Bay: bow fronts with lights in the trees, the towers over them
        { from: 39, to: 56.4, kits: ['bosstreet'], kinds: ['bow', 'bowB', 'fedR', 'bow'], xl: 27, xr: 20, back: ['far', 'farB'], span: 0.45, lights: true },
        { from: 39, to: 56.4, kits: ['bosfill'], kinds: ['low', 'lowB', 'mid'] },
        // over the Pike and into downtown
        { from: 56.4, to: 94.3, kits: ['bosstreet'], kinds: ['cityR', 'loft', 'city', 'loft', 'cityL', 'office'], xl: 28, xr: 21, back: ['office', 'loft', 'cityL'], backAt: 20, span: 0.6, clear: [[56.4, 59.4], [78.7, 80.5, 1]] },
        { from: 56.4, to: 94.3, kits: ['bosfill'], kinds: ['mid', 'midG', 'glassM', 'mid', 'glassT'], clear: [[56.0, 59.6]] },
        // the Financial District
        { from: 94.3, to: 101.1, kits: ['bosstreet'], kinds: ['city', 'cityL', 'office'], xl: 28, xr: 21, back: ['office'], backAt: 20, span: 0.6 },
        { from: 94.3, to: 101.1, kits: ['bosfill'], kinds: ['glassM', 'glassT', 'midG'] },
        // the North End: brick, close, lights in the trees
        { from: 101.1, to: 121.7, kits: ['bosstreet'], kinds: ['bayR', 'fedR', 'cityR', 'bayR'], xl: 27, xr: 20, back: ['far', 'farB'], span: 0.45, lights: true },
        { from: 101.1, to: 121.7, kits: ['bosfill'], kinds: ['low', 'mid', 'lowB'] },
        // the West End and North Station; the Zakim
        { from: 121.7, to: 151.9, kits: ['bosstreet'], kinds: ['cityR', 'loft', 'city', 'loft'], xl: 28, xr: 21, back: ['loft', 'office'], backAt: 20, span: 0.6, clear: [[137.0, 146.2]] },
        { from: 121.7, to: 151.9, kits: ['bosfill'], kinds: ['mid', 'low', 'glassM'], clear: [[137.0, 146.2]] },
        // the Common in the snow: no street, the elms, the rink; Beacon Street far across it
        { from: 151.9, to: 167, kits: ['bosfill'], kinds: ['low', 'lowB', 'mid'], xs: [130, 170, 220] },
        { from: 151.9, to: 167, kits: ['bostrees'], rows: [16, 34, 56, 80], clear: [[156.5, 160.7, 12, 72], [160.9, 162.3, -60, -8], [165.2, 167.8, 8, 64]] },
        // Beacon Hill: Federal fronts, gas lamps, lights in the trees
        { from: 167, to: 210.6, kits: ['bosstreet'], kinds: ['fed', 'fedR', 'fed', 'bow'], xl: 27, xr: 20, back: ['far', 'farB'], span: 0.45, gas: true, lampEvery: 0.3, lights: true },
        { from: 167, to: 210.6, kits: ['bosfill'], kinds: ['low', 'low', 'lowB'] },
        // home: the water side, the river on the left
        { from: 218.4, to: 232, kits: ['bosstreet'], right: ['bow', 'bowB', 'bow'], left: [], xr: 20, back: ['far'], span: 0.45, gas: true, lampEvery: 0.3, lights: true, clear: [[220.4, 221.85, 1]] },
        { from: 218.4, to: 232, kits: ['bosfill'], kinds: ['low', 'lowB'], sides: [1] },
        // strings of lights across the street for the choruses (not over the Pike, the Zakim or the hill)
        { from: 11.6, to: 15.8, kits: ['bosgarlands'] },
        { from: 59.6, to: 64.5, kits: ['bosgarlands'] },
        { from: 101.0, to: 116.2, kits: ['bosgarlands'] },
        { from: 132.7, to: 137.0, kits: ['bosgarlands'] },
        { from: 197.0, to: 206.8, kits: ['bosgarlands'] },
        // the el
        { from: -9, to: 80, kits: ['bosel'], x: -17 },
        { from: 104, to: 137, kits: ['bosel'], x: -17 },
        { from: 184, to: 200, kits: ['bosel'], x: -17 },
        // the set-pieces, each on its line
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosTruck', at: 17.6, x: 12.5, rot: 3.1416 },        // "somebody's fire alarm is wailing", the ladder up to the top floor
        { from: 0, to: 0.1, kits: ['bosalarm'], at: 17.5, x: 21, y: 9.5 },
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosHancock', at: 41.4, x: 74, rot: 0.6 },            // "shade subtracts the sun"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosPru', at: 47.5, x: -175, rot: 0.3 },
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosBeacon', at: 52.8, x: 62 },
        { from: 0, to: 0.1, kits: ['bosstacks'], at: [[49.8, 15], [50.2, -16], [50.7, 14.5], [51.3, -15]], big: 1.7 },   // "the heat was already in me"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosPike', at: 57.9, x: 0, rot: 0 },                  // the drop: over the Pike
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosStation', at: 66.3, x: -17, rot: 3.1416, crowd: 5 },  // "I'm only ever early for the trains"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosDiner', at: 79.5, x: 21.5 },                      // "a breakfast and a coffee for the road"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosCustom', at: 104.5, x: -125, face: true },        // the Custom House clock over the climb
        { from: 0, to: 0.1, kits: ['bostemp'], at: 103.9, x: 14.5, lift: 0, s: 1.25 },                     // "can't breathe, it's technically thirty-two"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosOldNorth', at: 112.2, x: -46 },                   // Old North, its bell swinging in the chorus
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosStation', at: 123.3, x: -17, rot: 3.1416, who: true, whoZ: 7, crowd: 2 },   // "she'd be waiting at the platform"
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosZakim', at: [139.2, 143.8], x: 0, rot: 0 },       // under the Zakim through the chorus
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosRink', at: 158.6, x: 34, lift: 0.15 },             // "she wanted kids": families going round the Frog Pond, beside her
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosBeacon', at: 163.5, x: -250, face: true },        // across the Common: flashing red, snow instead
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosState', at: 183.6, x: 62, lift: 0 },              // the gold dome on the chorus
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosSalt', at: [212.9, 215.5], x: 13.5 },
        { from: 0, to: 0.1, kits: ['bosmark'], mark: 'bosSalt', at: [212.9, 215.5], x: -13.5 },
      ],
      roads: [
        { x: 0, width: 20, walk: 5, laneLines: 2, from: -10, to: 210.4, lanes: [-7, -2.5, 2.5, 7], density: 0.3, lampEvery: 30, dry: true, follow: true },   // (one road: each one costs a frame)
        { x: 0, width: 14, walk: 5, laneLines: 0, from: 218.5, to: 240, traffic: false, lampEvery: 30, dry: true },
      ],
      vehicles: [
        { kind: 'bus', route: 'FREE', at: 81.6, rate: 0.82, x: -1, from: 77, to: 93 },   // "the free bus fills up fast"
      ],
      lyricPart: 'bosWallSign', lyricX: 26, lyricS: 1, lyricBg: '#243826', lyricColor: '#f2e6c2', lyricCore: '#fff8e6',
      lyrics: [
        { t: 35.02, text: 'FIRST RULE,\nNEVER WALK', part: 'bosBanner', side: 1, x: 0.01, lead: 1.25, bg: '#f2c818', color: '#1a3a8a', core: '#1a3a8a', frame: 'rgba(0,0,0,0)' },
        { t: 37.86, text: 'SHADE SUBTRACTS\nTHE SUN', side: -1, x: 33, s: 1.35, frame: 'rgba(0,0,0,0)' },
        { t: 65.68, text: "I'M ONLY EVER EARLY\nFOR THE TRAINS", side: 1, x: 27, s: 1.35, frame: 'rgba(0,0,0,0)', bg: '#3a1a14' },
        { t: 85.56, text: 'NO COAT', side: 1, x: 27, s: 1.2, frame: 'rgba(0,0,0,0)' },
        { t: 97.2, text: "I WASN'T COLD", side: -1, x: 34, s: 1.3, frame: 'rgba(0,0,0,0)', bg: '#3a1a14' },
        { t: 135.96, text: 'SHE MADE IT\nWORTH THE COLD', side: 1, x: 27, s: 1.3, frame: 'rgba(0,0,0,0)' },
        { t: 160.52, text: 'WHATEVER IT IS,\nIT DIES WITH ME', part: 'bosStone', side: -1, x: 25, s: 1.3, bg: '#8a8880', color: '#1e1e22', core: '#26262a', frame: 'rgba(0,0,0,0)' },
        { t: 166.26, text: 'A FAMILY IS THE\nONLY THING', side: 1, x: 34, s: 1.5, frame: 'rgba(0,0,0,0)', bg: '#3a1a14' },
        { t: 188.46, text: "I'M DONE WITH\nBEING EARLY", side: -1, x: 33, s: 1.35, frame: 'rgba(0,0,0,0)' },
        { t: 197.34, text: 'I LEAVE THE DOOR\nUNLOCKED THESE DAYS', side: 1, x: 27, s: 1.35, frame: 'rgba(0,0,0,0)', bg: '#3a1a14' },
        { t: 201.2, text: 'THE CAT THINKS\nTHAT I HUNT', side: -1, x: 33, s: 1.35, frame: 'rgba(0,0,0,0)' },
        { t: 207.9, text: 'COMING OUT\nOF THE SUN', side: 1, x: 27, s: 1.35, frame: 'rgba(0,0,0,0)', bg: '#3a1a14' },
      ],
      finale: { kind: 'door', t: 221.0, x: 23, lift: 4.2, shift: 9, fireAt: 210.85, orbit: { r: 19, h: 3.5, y: 7, facing: true, back: 1.4, right: 0.3, heroSide: 3.6, heroUp: 2.6, heroTilt: 1.0, heroFov: 50 } },
    },
  },
  {
    // a frozen lake at night, made into a garden of the rules good girls are raised on. The pond's
    // lamps and huts, a signpost pointing every way, a music box opening on "this song is for you",
    // the sampler; the lamps out on the threat and one statue lit in the silence; then the band, and
    // the road breaks over a rift in the ice into an avenue of colossal ice girls who keep every rule
    // as it's sung; the pond's rules springing up in the chorus; the table, the carousel, the one who
    // cries and the one who screams, the wedding cake; at the peak the lake breaks into floes, the
    // girls crack and burst with a bird out of each, the cages open, the heart breaks; the glass coffin
    // open and empty; at dawn, in open water, the great cage with its door open (ice.js, ggb-*.js).
    id: 'good-girls-dont-fight-back',
    accent: '#7ae8ff',
    title: "Good Girls Don't Fight Back",
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', c: 0.45, endY: 7 },                                              // "are you confused?" (low over the ice, gentle hills)
      { t: 11.53, kind: 'pre', endY: 22 },                                                      // "or I'll beat you to death"
      { t: 14.85, kind: 'verse', start: 'launch', launchBeats: 4, kick: 10, endY: 11, gap: true }, // the band, after the silence: over the rift
      { t: 26.84, kind: 'verse', c: 1.1, endY: 10 },                                            // "shh, just take it"
      { t: 33.48, kind: 'chorus', endY: 9 },                                                    // "no screaming, no running"
      { t: 40.10, kind: 'break', endY: 16 },                                                    // one bar with the bass gone
      { t: 41.34, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the la-la-la
      { t: 53.35, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10, gap: true }, // "the dream": the lake breaks
      { t: 66.59, kind: 'outro', endY: 5 },                                                     // "they never wake"
    ],
    rails: [{ t: 45.07, bars: 2, x: 3.2 }],                                                     // round the carousel
    palette: 'ggIce',
    world: 'ice',
    collect: 'flake',
    skyline: 'hills',
    groundStyle: 'country',
    lift: { flash: 0x9af4ff, fog: 0.4, flashK: 0.6 },
    titleView: { ahead: -0.62, x: 5.2, h: 4.9, back: -1.2, lookH: 0.5 },         // behind her, over the first rise: the gate, the two of them, the pond
    looks: [
      { t: -99, palette: 'ggIce' },
      { t: 13.3, palette: 'ggIce', set: { skyLight: 0x1a2a40, hemiK: 1.0, snow: 0, fog: 0x02060c, glow: 0x2a6a8a }, fade: 0.2 },   // the silence
      { t: 15.0, palette: 'ggBand', fade: 0.2 },             // the band breaks in
      { t: 33.6, palette: 'ggLoud', fade: 0.8 },             // the rules
      { t: 40.2, palette: 'ggLoud', set: { skyLight: 0x1a2a40, hemiK: 1.1, glow: 0x2a6a8a }, fade: 0.15 },   // one bar of nothing
      { t: 41.4, palette: 'ggLala', fade: 0.3 },             // the carousel: the aurora pink and gold
      { t: 47.2, palette: 'ggLoud', fade: 0.6 },             // "some girls cry"
      { t: 53.5, palette: 'ggPeak', fade: 0.4 },             // the peak
      { t: 68.6, palette: 'ggEnd', fade: 2.6 },              // "they never wake": open water, toward morning
    ],
    moments: [
      { t: 6.99, kind: 'flash', k: 0.15 },                   // the music box opens
      { t: 12.79, kind: 'impact', k: 0.35 },                 // "death": the ice under her
      { t: 14.85, kind: 'flash', k: 0.3 },
      { t: 41.34, kind: 'flash', k: 0.25 },
      { t: 50.03, kind: 'glass', k: 0.3 },                   // "scream"
      { t: 53.35, kind: 'flash', k: 0.15 },
      { t: 61.62, kind: 'glass', k: 0.35 },                  // the heart breaks
      { t: 65.34, kind: 'flash', k: 0.2 },
    ],
    scenery: {
      // the boards: his words, on the things that say them
      signs: [
        { key: 'GGBSONG', text: 'THIS SONG\nIS FOR YOU', color: '#ffd890', core: '#fff4dc', bg: '#3a1424', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: '#e0b050' },
        { key: 'GGBSUBDUED', text: 'FEEL PLEASANTLY\nSUBDUED', color: '#8a0c1c', core: '#8a0c1c', bg: '#a8a49c', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBDONT', text: "GOOD GIRLS\nDON'T FIGHT BACK", color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBQUIET', text: 'GOOD GIRLS\nSTAY QUIET', color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBSWEET', text: 'GOOD GIRLS\nSTAY SWEET', color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBSPEAK', text: 'GOOD GIRLS\nNEVER SPEAK', color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBNOSCREAM', text: 'NO SCREAMING', color: '#c8101a', core: '#d81822', bg: '#b0aea8', frame: '#c8101a' },
        { key: 'GGBNORUN', text: 'NO RUNNING', color: '#c8101a', core: '#d81822', bg: '#b0aea8', frame: '#c8101a' },
        { key: 'GGBNOTEARS', text: 'NO TEARS\nON YOUR FACE', color: '#c8101a', core: '#d81822', bg: '#b0aea8', frame: '#c8101a' },
        { key: 'GGBPLACE', text: 'THEY KNOW\nTHEIR PLACE', color: '#2a2024', core: '#2a2024', bg: '#a8a49c', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBCRY', text: 'SOME GIRLS CRY', color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBSCREAM', text: 'SOME GIRLS SCREAM', color: '#bfefff', core: '#ffffff', bg: '#0c1622', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBDREAM', text: 'GOOD GIRLS LEARN\nTO LIVE THE DREAM', color: '#c0407a', core: '#d0508a', bg: '#a8a0a6', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBHEART', text: 'NO HEARTBEAT\nTO BREAK', color: '#ff5a7a', core: '#ffd8e0', bg: '#14080e', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
        { key: 'GGBWAKE', text: 'THEY NEVER\nWAKE', color: '#f2c46a', core: '#fff0c0', bg: '#2a0c1a', font: 'Georgia, "Times New Roman", serif', weight: 700, frame: 'rgba(0,0,0,0)' },
      ],
      // the girls: lit when the band comes in, posed by the words, the huts dark when "they already
      // know", the lamps out on the threat and low "when the lights go low"
      ggb: {
        wake: 14.85, know: 19.82,
        lamps: [[12.79, 14.85, 0.03], [16.11, 33.3, 0.12, 0.22], [40.10, 41.34, 0.12]],
        poses: [[0, 'fold'], [19.82, 'eyes'], [21.89, 'mouth'], [23.55, 'curtsy'], [25.21, 'fold'], [26.84, 'mouth'], [28.51, 'fold'], [29.35, 'hush'], [30.99, 'fold'], [34.30, 'mouth'], [35.97, 'pray'], [37.20, 'fold'],
          [41.34, 'curtsy'], [42.17, 'fold'], [43.00, 'curtsy'], [43.83, 'fold'], [44.65, 'curtsy'], [45.48, 'fold'], [46.31, 'curtsy'], [47.14, 'fold'], [50.46, 'pray'], [53.35, 'rise']],
        rift: [14.85, 14.9, 16.5, 24, 9],                    // the ice opens under the gap
        flakes: [[33.48, 37.6, 1], [37.6, 40.10, 1, 1], [47.14, 50.46, 2]],   // the chorus throws snowflakes up on the beat (clear of the table at the end)
      },
      cracks: [[0.39, -40, 2.4, 0.8], [1.64, 46, 2.4, 0.8], [3.71, -30, 2.2, 1.0], [5.36, 38, 2.2, 1.0], [6.99, 29, 1.6, 1.3], [7.84, -50, 2.2, 1.0], [9.48, 44, 2.2, 1.1], [10.31, -27, 0.9, 1.0], [11.13, 30, 2.2, 1.1], [11.95, -24, 2.2, 1.2],
        [12.79, 0, 1.2, 1.8],                                                                     // "death": under her
        [14.85, 0, 1.0, 2.2], [14.85, -40, 2.4, 1.6], [14.85, 44, 2.4, 1.6],                      // the band: the rift
        [16.93, 31, 1.72, 1.0], [18.58, 31, 1.72, 1.0], [20.24, -31, 2.54, 1.0], [21.89, -31, 2.11, 1.0], [23.55, 31, 1.70, 1.0], [25.21, 31, 2.0, 1.0], [26.84, -31, 2.54, 1.0], [28.51, 31, 1.69, 1.0], [30.16, -31, 0.87, 1.2], [31.82, 31, 1.68, 1.0],
        [34.30, 25, 1.2, 1.4], [35.13, -25, 1.17, 1.4], [35.97, 25, 1.23, 1.4], [37.20, 31, 1.25, 1.1], [38.86, -31, 0.42, 1.1], [40.10, -42, 2.2, 1.5],
        [41.34, 0, 2.4, 2.2], [43.41, 44, 1.39, 1.5], [45.07, -31, 0.73, 1.1], [46.73, 31, 0.47, 1.1], [47.55, -30, 1.35, 1.3], [50.03, 30, 0.57, 2.6], [51.67, -44, 3.73, 1.5],
        [53.35, 0, 2.0, 1.7]],
      breakup: [53.35, 64.9, 69.5],
      aurora: [[0, 0.3], [14.85, 0.7], [33.48, 0.85], [40.1, 0.35], [41.34, 0.75], [53.35, 0.95], [66.59, 0.6]],
      zones: [
        // the pond: iron lamps along the road, fishing huts out on the ice with their windows lit
        { from: -4, to: 53, kits: ['ggbLamps'], x: 19.5, every: 0.62 },
        { from: -4, to: 36, kits: ['ggbHuts'], every: 0.5, x: 40, spread: 55 },
        // ice pushed up out of the lake on every bar, out past them
        { from: 0, to: 0.1, kits: ['ggShards'], at: [[17.07, 15.27], [18.73, 16.93], [20.38, 18.58], [22.04, 20.24], [23.70, 21.89], [25.35, 23.55], [27.01, 25.21], [28.64, 26.84], [30.31, 28.51], [31.96, 30.16], [33.62, 31.82], [35.27, 33.48], [36.93, 35.13], [38.59, 36.79], [40.24, 38.45]], x: 62, spread: 24 },
        { from: 0, to: 0.1, kits: ['ggShards'], at: [[43.56, 41.76], [45.21, 43.41], [46.87, 45.07], [48.53, 46.73], [50.17, 48.37], [51.83, 50.03], [53.47, 51.67]], x: 64, spread: 26, s: 1.4 },
        // two of them either side of the start, dark until the band comes in
        { from: 0.5, to: 0.6, kits: ['ggbColossi'], x: 27, at: [[0.5, -1], [0.5, 1]], s: 10 },
        // "are you confused?": a signpost pointing every way
        { from: 3.0, to: 3.1, kits: ['ggbPiece'], part: 'ggbSignpost', at: 3.0, x: 25, s: 1.6 },
        // "this song is for you": the music box opens on "song"
        { from: 8.6, to: 8.7, kits: ['ggbPiece'], part: 'ggbMusicBox', at: 8.6, x: 29, s: 1.6, open: 6.75, sign: 'GGBSONG' },
        // "feel pleasantly subdued"
        { from: 11.2, to: 11.3, kits: ['ggbPiece'], part: 'ggbSampler', at: 11.2, x: -27, s: 1.15, sign: 'GGBSUBDUED' },
        // the silence: one of them, lit alone, the title on her scroll
        { from: 16.3, to: 16.4, kits: ['ggbColossi'], x: 27, at: [[16.3, -1, { spot: 13.25, sign: 'GGBDONT', pose: 'scroll', s: 11 }]] },
        // the avenue: colossal good girls either side, keeping the rules as they're sung, the rules cut in their plinths
        { from: 17, to: 41, kits: ['ggbColossi'], x: 31, at: [[17.0, 1], [17.83, -1], [18.65, 1], [19.48, -1], [20.3, 1], [21.13, -1], [22.2, 1, { sign: 'GGBQUIET', pose: 'scroll' }], [22.78, -1], [23.6, 1], [24.0, -1, { sign: 'GGBSWEET', pose: 'scroll' }], [25.25, 1], [26.08, -1], [27.2, 1, { sign: 'GGBSPEAK', pose: 'scroll' }], [27.73, -1], [28.55, 1], [29.38, -1], [30.2, 1], [31.03, -1, { pose: 'hush', s: 12 }], [31.85, 1], [32.68, -1], [33.5, 1], [34.33, -1], [35.15, 1], [35.98, -1], [36.8, 1], [37.63, -1], [38.45, 1], [39.28, -1], [40.1, 1]] },
        // "stay quiet": the cages covered one by one
        { from: 22.2, to: 23.3, kits: ['ggbCages'], x: 23, at: [[22.2, -1, 21.07], [22.7, 1, 21.47], [23.2, -1, 21.89]] },
        // "stay sweet": the cake kept under glass
        { from: 24.3, to: 24.4, kits: ['ggbPiece'], part: 'ggbCloche', at: 24.3, x: 27, s: 1.6 },
        // "never speak": the microphone frozen in a block of ice
        { from: 27.5, to: 27.6, kits: ['ggbPiece'], part: 'ggbMic', at: 27.5, x: -27, s: 1.6 },
        // the pond's rules, up out of the ice on their words
        { from: 35.5, to: 35.6, kits: ['ggbPiece'], part: 'ggbRule', at: 35.5, x: 25, s: 1.5, up: 34.30, sign: 'GGBNOSCREAM' },
        { from: 36.3, to: 36.4, kits: ['ggbPiece'], part: 'ggbRule', at: 36.3, x: -25, s: 1.5, up: 35.13, sign: 'GGBNORUN' },
        { from: 37.2, to: 37.3, kits: ['ggbPiece'], part: 'ggbRule', at: 37.2, x: 25, s: 1.5, up: 35.97, sign: 'GGBNOTEARS' },
        // "they know their place": the long table, each of them in hers; the candles out for the bar of nothing
        { from: 42.3, to: 42.4, kits: ['ggbPiece'], part: 'ggbTable', at: 42.3, x: -40, s: 2.0, out: 40.10, back: 41.34, sign: 'GGBPLACE' },
        // the la-la-la: the carousel, and the girls dancing either side; then one cries and one screams
        { from: 44.8, to: 44.9, kits: ['ggbPiece'], part: 'ggbCarousel', at: 44.8, x: 44 },
        { from: 42, to: 53, kits: ['ggbColossi'], x: 31, at: [[42.5, -1], [44.15, -1], [45.8, -1], [47.2, 1], [48.9, -1, { pose: 'weep', tears: 47.55, sign: 'GGBCRY', s: 11, tall: true }], [50.55, -1], [50.6, 1, { pose: 'scream', scream: 50.03, sign: 'GGBSCREAM', s: 11, tall: true }], [52.2, 1]] },
        // "learn to live the dream": the wedding cake; at the peak it cracks and goes under
        { from: 55.4, to: 55.5, kits: ['ggbPiece'], part: 'ggbCake', at: 55.4, x: -44, s: 1.4, breaks: 53.35, sign: 'GGBDREAM' },
        // the peak: their arms up, and one by one they burst, a bird out of each
        { from: 55, to: 67, kits: ['ggbColossi'], x: 31, shatterFrom: 53.35, lead: 1.5, crackFor: 1.4, at: [[55.4, 1], [56.2, -1], [57.0, 1], [58.6, 1], [59.6, -1], [60.2, 1], [61.2, -1], [62.6, -1], [63.6, 1], [65.2, 1], [65.9, -1]] },
        // "just take it": the cages thrown open, the birds out
        { from: 57.3, to: 59, kits: ['ggbCages'], x: 23, at: [[57.3, -1, -10, 56.24], [57.85, 1, -10, 56.65], [58.4, -1, -10, 57.07], [58.95, 1, -10, 57.47]] },
        // "no heartbeat to break": the heart of ice
        { from: 62.1, to: 62.2, kits: ['ggbPiece'], part: 'ggbHeart', at: 62.1, x: 29, s: 1.4, crack: 60.79, burst: 61.62, sign: 'GGBHEART' },
        // "no promises": the ring goes down through the floes
        { from: 62.9, to: 63.0, kits: ['ggbPiece'], part: 'ggbRing', at: 62.9, x: -30, s: 2.2, goes: 62.03 },
        // the light up through the gaps between the floes, on the beat
        { from: 53.4, to: 66.6, kits: ['ggColumns'], every: 1.1, x: 50, on: 53.35, off: 64.9 },
        // "they never wake": the glass coffin, open and empty
        { from: 67.9, to: 68.0, kits: ['ggbPiece'], part: 'ggbCoffin', at: 67.9, x: -29, s: 2.8, h: 7.5, sign: 'GGBWAKE' },
      ],
      // the end: the great cage on a floe in open water at dawn, its door open, the birds going up out of it
      finale: { kind: 'ship', t: 74.0, x: -42, s: 6, h: 9, turn: 0.7, fireAt: 66.6, orbit: { y: 24, heroBack: 17, heroSide: 1.0, heroUp: 2.6, heroFov: 34, heroTilt: 4.0, heroPan: 0.16 } },
    },
  },
  {
    // a school day, the love story and the alarm: in through the metal detector, the note in
    // the locker, the clock at noon, the siren down the hall, police lights in the windows,
    // glitter, homecoming in the gym; the final bell, the news vans at six, the stadium lit.
    id: 'school-shooter-sweetheart',
    accent: '#ff3d6e',
    title: 'School Shooter Sweetheart',
    collect: 'crown',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8 },                                          // "met her by the metal detector"
      { t: 10.32, kind: 'verse', endY: 10 },                                       // "left a love note in my locker"
      { t: 25.40, kind: 'break', endY: 18 },                                       // "kisses like a bomb threat"
      { t: 26.75, kind: 'chorus', start: 'launch', kick: 8, endY: 10 },            // "she's the siren blaring down the hall"
      { t: 44.58, kind: 'post', endY: 14 },                                        // the band on its own
      { t: 48.70, kind: 'verse', c: 0.95, endY: 12 },                              // "stares through the windows"
      { t: 56.93, kind: 'pre', endY: 26 },                                         // "glitter", "homecoming queen"
      { t: 65.15, kind: 'chorus', start: 'launch', kick: 11, endY: 9 },            // the gym
      { t: 82.98, kind: 'pre', endY: 22 },                                         // "if we make it past the final bell"
      { t: 85.72, kind: 'final', start: 'launch', kick: 10, endY: 10 },            // out the doors: "the six o'clock news"
      { t: 93.95, kind: 'break', endY: 14 },
      { t: 98.05, kind: 'final', start: 'launch', kick: 12, endY: 8, gap: true },  // the stadium lights, after the band stops: over the hole
      { t: 109.02, kind: 'outro', endY: 5 },
    ],
    rails: [
      { t: 11.68, bars: 2, x: 0 },        // "left a love note in my locker": along the lockers
      { t: 52.81, bars: 2, x: 0 },        // "stares through the windows"
    ],
    palette: 'schMorning',
    world: 'school',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 4.0 },   // behind her, the school's front doors ahead
    looks: [
      { t: -99, palette: 'schMorning' },
      { t: 1.2, palette: 'schHall', fade: 0.4 },            // in through the doors
      { t: 31.6, palette: 'schAlarm', fade: 0.25 },         // "she's the siren blaring down the hall"
      { t: 36.8, palette: 'schHall', fade: 1.2 },
      { t: 44.6, palette: 'schClass', fade: 0.6 },          // the classroom, the afternoon in its windows
      { t: 51.6, palette: 'schPolice', fade: 1.0 },         // "stares through the windows"
      { t: 56.9, palette: 'schHall', fade: 0.6 },
      { t: 60.2, palette: 'schGym', fade: 0.6 },            // homecoming
      { t: 70.8, palette: 'schGymAlarm', fade: 0.25 },      // the siren again
      { t: 75.1, palette: 'schGym', fade: 1.2 },
      { t: 85.7, palette: 'schDusk', fade: 0.3 },           // out the doors at six
      { t: 93.6, palette: 'schDark', fade: 0.4 },           // the band stops
      { t: 98.05, palette: 'schStadium', fade: 0.15 },      // the stadium lights
    ],
    moments: [
      { t: 25.40, kind: 'knock', k: 0.4, n: 1 },            // three lockers slamming: "like a / bomb / threat"
      { t: 25.74, kind: 'knock', k: 0.45, n: 1 },
      { t: 26.07, kind: 'knock', k: 0.5, n: 1 },
      { t: 59.9, kind: 'flash', k: 0.3 },                   // "glitter"
      { t: 85.03, kind: 'ring', k: 0.4, dur: 0.6 },         // the final bell
      { t: 93.6, kind: 'blackout', dur: 4.4, k: 0.7 },      // the band stops, the lot goes dark
      { t: 98.05, kind: 'flash', k: 0.8 },                  // the stadium lights
    ],
    confetti: [[59.7, 61.4]],                               // "exploding into glitter"
    confettiColors: [0xff3d8b, 0xffd23a, 0xffffff, 0xb070ff, 0x5ff2ff, 0xffb8d8],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'SCHHOME', text: 'HOMECOMING', color: '#ffd23a', core: '#fff4c0', bg: '#2a1a6a', size: 96 },
      ],
      rooms: [
        { style: 'hall', from: 1.2, to: 10.32, caps: [{ kind: 'front', hw: 13, hh: 26 }, SDOOR] },     // in at the front doors
        { style: 'hall', from: 10.32, to: 26.75, caps: [null, SDOOR] },                                 // "left a love note in my locker"
        { style: 'hall', from: 26.75, to: 37.72, caps: [null, SDOOR] },                                 // "the siren blaring down the hall"
        { style: 'hall', from: 37.72, to: 44.58, caps: [null, SDOOR] },
        { style: 'class', from: 44.58, to: 56.93, caps: [null, SDOOR] },                                // "stares through the windows"
        { style: 'hall', from: 56.93, to: 60.2, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },       // the wanted poster
        { style: 'gym', from: 60.2, to: 76.12, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },        // homecoming
        { style: 'gym', from: 76.12, to: 85.72, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },
      ],
      roomEvents: { alarm: [[31.6, 36.7, 0.15, 0.6], [70.8, 75.0, 0.15, 0.6]], police: [51.5, 57.0, 1.0, 0.6], stadium: [98.0, 999, 0.05, 0.4] },
      zones: [
        // in at the doors, through the metal detector
        { from: 1.9, to: 2.0, kits: ['detector'], at: 1.9 },
        // "blood red lip", the note in the locker, "signed it with a sticker"
        { from: 9.7, to: 19.4, kits: ['decals'], at: [[9.7, -29.6, 'kiss', 12, 1.2], [19.3, 29.6, 'sticker', 13, 1.3]] },
        { from: 12.9, to: 13.0, kits: ['openLocker'], at: 12.9, x: 26.4, s: 1.25 },
        // the clock at noon
        { from: 24.9, to: 25.0, kits: ['clock'], at: 24.9, lift: 13, s: 0.85 },
        // three lockers slamming, on the wall ahead
        { from: 26.7, to: 26.73, kits: ['slams'], face: true, sx: 0.77, open: 1.1, at: [[26.72, 15.69, 25.40], [26.72, -23.08, 25.74], [26.72, -16.6, 26.07]] },
        // the siren down the hall
        { from: 28.5, to: 40.0, kits: ['beacons'], every: 0.55, x: 29.2, y: 25 },
        { from: 27.4, to: 44.0, kits: ['pennants'], every: 1.6, lift: 18 },
        // the classroom
        { from: 44.9, to: 56.7, kits: ['desks'], every: 0.3 },
        // the wanted poster, on the wall by the gym doors
        { from: 60.1, to: 60.2, kits: ['corkboard'], at: 60.17, x: -23, y: 15, s: 1.0, face: true, bare: true, wanted: true },
        // homecoming: the banner, the crown over the court, the stands, balloons, pennants
        { from: 61.4, to: 61.5, kits: ['banner'], at: 61.4, sign: 'SCHHOME', lift: 17 },
        { from: 63.4, to: 63.5, kits: ['crown'], at: 63.4, lift: 13, s: 1.5 },
        { from: 60.4, to: 75.0, kits: ['bleachers'], x: 36, every: 1.2 },
        { from: 77.3, to: 85.0, kits: ['bleachers'], x: 36, every: 1.2 },
        { from: 60.6, to: 75.8, kits: ['balloons'], every: 0.8, x: 27 },
        { from: 76.5, to: 85.2, kits: ['balloons'], every: 0.8, x: 27 },
        { from: 64.0, to: 84.0, kits: ['pennants'], every: 2.0, lift: 20, s: 1.6 },
        { from: 68.0, to: 78.0, kits: ['beacons'], every: 0.8, x: 61, y: 30, s: 2.2 },
        // the final bell, over the doors out
        { from: 85.66, to: 85.67, kits: ['schoolBell'], at: 85.66, x: 0, ring: 85.03, y: 38, s: 1.6 },
        // outside: the lot at six, the vans, the police lights
        { from: 85.8, to: 94.0, kits: ['lot'], lampX: 50, every: 0.5 },
        { from: 86.0, to: 94, kits: ['cruisers'], at: [[86.6, 24, 0.5], [87.1, -27, -0.4], [87.9, 30, -0.7], [88.6, -22, 0.6], [91.2, 26, 0.3], [92.4, -30, -0.5]] },
        { from: 86.0, to: 94, kits: ['newsVans'], at: [[87.4, -40, 0], [88.2, 42, 0], [89.5, -44, 0.1], [90.7, 44, -0.1], [92.0, -42, 0]] },
        // the stadium: the towers, the stands, the field, the posts
        { from: 93.0, to: 112, kits: ['lightTowers'], every: 2.2, x: 64 },
        { from: 98.5, to: 112, kits: ['bleachers'], x: 46, every: 1.2 },
        { from: 99.0, to: 112, kits: ['yardLines'], every: 0.2, w: 96 },
        { from: 107.0, to: 107.1, kits: ['goal'], at: 107.0, s: 1.6 },
      ],
      roads: [
        { x: 0, width: 96, walk: 0, laneLines: 0, from: 85.7, to: 98.0, lanes: [], density: 0, lampEvery: 40, follow: true, dry: true },
      ],
      lyricBg: '#a8a49c', lyricColor: '#8a0c1c', lyricCore: '#8a0c1c', lyricPart: 'spiritBanner', lyricS: 1, lyricWeight: 700,
      lyricFont: '"Segoe Print", "Marker Felt", "Bradley Hand", "Comic Sans MS", cursive',
      lyrics: [
        { t: 32.0, text: "SHE'S THE SIREN\nBLARING DOWN THE HALL", x: 0, h: 14, frame: 'rgba(0,0,0,0)' },
        { t: 82.4, text: 'IF WE MAKE IT PAST\nTHE FINAL BELL', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 89.0, text: "I'M JUST\nHER PLUS ONE", x: 40, side: 1, part: 'letterBoard', s: 1.1, bg: '#a8a8a4', color: '#0c0c10', core: '#0c0c10', font: '"Arial Black", Impact, sans-serif', weight: 900, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'crown', t: 112.0, x: -22, fireAt: 98.05, orbit: { r: 58, h: 7, y: 12, facing: true, back: 1.3, right: 0.3, swing: 0.25, heroPan: 0.32, heroFov: 52, heroBack: 9, heroSide: 0.6, heroUp: 1.6 } },   // the homecoming crown beside the card
    },
  },
  {
    // the performance, never the clinic: a selfie museum, room after themed room. Lace and a balloon
    // arch for prom night, the mascara, the phone with the bestie on it; the likes spawning; brunch;
    // the ring lights; the pink hall with coupons coming down and a camera that won't stop clicking;
    // a ball pit; the fashion medals; the lights going low, the hashtag, the tears; the infinity
    // room; the filters; a halo. On "you're free" the walls come down and the balloons go up.
    id: 'so-pretty-when-you-cry-at-the-abortion-center',
    accent: '#ff6ab8',
    title: 'So Pretty When You Cry at the Abortion Center',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // "I'm back!"
      { t: 7.91, kind: 'pre', endY: 22 },                                                       // "remember me?"
      { t: 9.77, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 10 },          // the band
      { t: 17.19, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                 // in: "you wore lace like it's prom night"
      { t: 28.29, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                 // "tweeted grief for the likes"
      { t: 33.86, kind: 'verse', c: 0.95, endY: 12, turn: 0.3 },                                // brunch
      { t: 41.25, kind: 'post', c: 0.95, endY: 12, turn: 0.3 },                                 // "watch me glow"
      { t: 46.79, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 48.64, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 10, turn: 0.3 },   // "you're so pretty when you cry"
      { t: 56.04, kind: 'chorus', c: 1.1, endY: 11, turn: 0.3 },                                // "wiping tears with coupons"
      { t: 59.73, kind: 'pre', endY: 22, turn: 0.3 },                                           // "click, click, click"
      { t: 63.43, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10, turn: 0.3 },
      { t: 70.82, kind: 'chorus', c: 1.1, endY: 11, turn: 0.3 },
      { t: 78.20, kind: 'verse', c: 0.95, endY: 12, turn: 0.3 },                                // the fashion medals
      { t: 96.63, kind: 'chorus', c: 1.1, endY: 11, turn: 0.3 },                                // "the lights go low"
      { t: 107.68, kind: 'bridge', endY: 13, turn: 0.3 },                                       // "do I feel guilty? as if"
      { t: 120.56, kind: 'pre', endY: 20, turn: 0.3 },
      { t: 122.40, kind: 'break', endY: 18, turn: 0.3 },                                        // the drop-out
      { t: 126.07, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 127.91, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, endY: 10, turn: 0.3 },
      { t: 140.79, kind: 'pre', endY: 22, turn: 0.3 },                                          // "click, click"
      { t: 144.46, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10, turn: 0.3 },
      { t: 153.65, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 155.50, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10, turn: 0.3, gap: true },  // "halo": "pretty, pretty, click", over the hole
      { t: 173.85, kind: 'outro', endY: 5 },                                                    // "you're free"
    ],
    rails: [
      { t: 19.04, bars: 2, x: 0 },        // "to the clinic, like it's prom night"
      { t: 81.89, bars: 2, x: 0 },        // "master plan, play God on the pedal"
    ],
    palette: 'spNight',
    world: 'selfie',
    collect: 'like',
    titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.4 },
    looks: [
      { t: -99, palette: 'spNight' },
      { t: 17.3, palette: 'spLace', fade: 0.4 },        // in: prom night
      { t: 28.4, palette: 'spPink', fade: 0.4 },
      { t: 33.9, palette: 'spMint', fade: 0.4 },        // brunch
      { t: 41.3, palette: 'spNeon', fade: 0.4 },        // the ring lights
      { t: 46.9, palette: 'spPink', fade: 0.4 },
      { t: 61.6, palette: 'spPit', fade: 0.4 },         // the ball pit
      { t: 70.9, palette: 'spPink', fade: 0.4 },
      { t: 78.3, palette: 'spGold', fade: 0.4 },        // the medals
      { t: 89.3, palette: 'spWhite', fade: 0.4 },
      { t: 107.7, palette: 'spNeon', fade: 0.4 },       // the infinity room
      { t: 122.5, palette: 'spLace', fade: 0.4 },
      { t: 126.1, palette: 'spWhite', fade: 0.4 },
      { t: 134.4, palette: 'spWhite', set: { skyLight: 0xff8ac8, glow: 0xff5aa8, fog: 0x3a1028 }, fade: 0.15 },   // the pink filter
      { t: 135.5, palette: 'spWhite', set: { skyLight: 0x8ab8ff, glow: 0x6a9aff, fog: 0x101a3a }, fade: 0.15 },   // blue
      { t: 136.6, palette: 'spWhite', set: { skyLight: 0xffc070, glow: 0xffb040, fog: 0x3a2008 }, fade: 0.15 },   // amber
      { t: 137.7, palette: 'spWhite', set: { skyLight: 0xff8ac8, glow: 0xff5aa8, fog: 0x3a1028 }, fade: 0.15 },
      { t: 138.8, palette: 'spWhite', fade: 0.5 },
      { t: 142.7, palette: 'spPink', fade: 0.4 },
      { t: 170.4, palette: 'spSky', fade: 1.5 },        // "you're free": the open sky
    ],
    moments: [
      { t: 0.5, kind: 'pop', k: 0.4 },                  // "I'm back!"
      { t: 9.77, kind: 'flash', k: 0.25 },              // the band
      ...[59.94, 60.46, 60.78, 61.44, 61.86].map((t) => ({ t, kind: 'shutter', k: 0.5 })),   // "click, click, click!"
      { t: 63.43, kind: 'flash', k: 0.3 },
      ...[76.08, 76.44, 76.66].map((t) => ({ t, kind: 'shutter', k: 0.4 })),
      { t: 122.40, kind: 'blackout', dur: 1.6, k: 0.6 },   // the drop-out
      { t: 127.91, kind: 'flash', k: 0.3 },
      ...[141.02, 141.56, 142.02, 142.46, 142.9].map((t) => ({ t, kind: 'shutter', k: 0.5 })),
      ...[156.88, 157.4].map((t) => ({ t, kind: 'shutter', k: 0.4 })),
      { t: 164.44, kind: 'bell', k: 0.5 },              // "halo"
      { t: 169.46, kind: 'pop', k: 0.6 },               // "you're free"
    ],
    confetti: [[48.64, 55.9], [127.91, 134.3], [155.5, 164.3]],
    confettiColors: [0xff6ab8, 0xffd8ec, 0xe8c060, 0xffffff, 0x8ad8ff],
    scenery: {
      rooms: [
        { style: 'lace', from: 17.19, to: 28.29, caps: [{ kind: 'front', hw: 13, hh: 30 }, SPDOOR] },   // prom night
        { style: 'pink', from: 28.29, to: 33.86, caps: [null, SPDOOR] },                                 // the likes
        { style: 'mint', from: 33.86, to: 41.25, caps: [null, SPDOOR] },                                 // brunch
        { style: 'neon', from: 41.25, to: 46.79, caps: [null, SPDOOR] },                                 // the ring lights
        { style: 'pink', from: 46.79, to: 61.57, caps: [null, SPDOOR] },                                 // the pink hall
        { style: 'pit', from: 61.57, to: 70.82, caps: [null, SPDOOR] },                                  // the ball pit
        { style: 'pink', from: 70.82, to: 78.20, caps: [null, SPDOOR] },
        { style: 'gold', from: 78.20, to: 89.25, caps: [null, SPDOOR] },                                 // the medals
        { style: 'white', from: 89.25, to: 107.68, caps: [null, SPDOOR] },                               // the lights go low
        { style: 'neon', from: 107.68, to: 122.40, caps: [null, SPDOOR] },                               // the infinity room
        { style: 'lace', from: 122.40, to: 126.07, caps: [null, SPDOOR] },
        { style: 'white', from: 126.07, to: 142.62, caps: [null, SPDOOR] },                              // the filters
        { style: 'pink', from: 142.62, to: 153.65, caps: [null, SPDOOR] },
        { style: 'pink', from: 153.65, to: 176, caps: [null, null], fallAt: 169.4, fallFor: 2.0 },        // "you're free"
      ],
      lightsLow: [98.4, 104.6],
      zones: [
        { from: -6, to: 17.3, kits: ['city'] },
        { from: 169.4, to: 200, kits: ['farcity'], x: 120 },
        { from: 0, to: 0.1, kits: ['spProps'], at: [
          { t: 3.6, x: -24, kind: 'ring', s: 1.2, on: 0.5 },                 // "I'm back!": the lights come on
          { t: 4.4, x: 24, kind: 'ring', s: 1.2, on: 0.62 },
          { t: 20.8, x: 0, rot: 0, kind: 'arch', s: 1.1, floor: true },      // "like it's prom night"
          { t: 22.0, x: 0, rot: 0, kind: 'disco', y: 30, s: 1.0, floor: true },
          { t: 23.8, x: -22, kind: 'mascara', s: 1.0, floor: true },         // "mascara rivers, makeup shivers"
          { t: 26.6, x: 22, kind: 'phone', s: 1.1, floor: true },            // "texted your bestie"
          { t: 31.4, x: -22, kind: 'likes', s: 1.1, floor: true },           // "tweeted grief for the likes to spawn"
          { t: 36.4, x: 22, kind: 'brunch', s: 1.2, floor: true },           // "brunch, brunch"
          { t: 39.9, x: -22, kind: 'brunch', s: 1.2, floor: true },          // "lunch, lunch"
          { t: 61.2, x: 30, kind: 'camera', s: 1.25, floor: true, clicks: [59.94, 60.46, 60.78, 61.44, 61.86] },   // "click, click, click"
          { t: 101.8, x: -24, kind: 'hash', y: 24, s: 1.0, floor: true },    // "hashtag no regrets"
          { t: 142.2, x: -30, kind: 'camera', s: 1.25, floor: true, clicks: [141.02, 141.56, 142.02, 142.46, 142.9] },
          { t: 166.6, x: 0, rot: 0, kind: 'halo', y: 34, s: 1.1, floor: true },   // "halo"
        ] },
        { from: 41.4, to: 46.6, kits: ['spRings'], every: 0.6, x: 26, on: 41.54, wave: 0.06 },   // "watch me glow"
        { from: 0, to: 0.1, kits: ['spCoupons'], at: 57.2, top: 40 },                             // "wiping tears with coupons"
        { from: 84.4, to: 89.0, kits: ['spMedals'], every: 0.9, hw: 30, top: 38 },                 // "fashion medals"
        { from: 102.4, to: 106.4, kits: ['spTears'], every: 0.9 },                                 // "but tears still show"
        { from: 134.4, to: 138.5, kits: ['spFilters'], every: 1.1 },                               // "sobbing in filter"
        { from: 169.6, to: 178, kits: ['spBalloons'], every: 1.0, go: 169.46 },                    // "you're free"
      ],
      lyricPart: 'spSign', lyricX: 0, lyricBg: '#1a0a14', lyricColor: '#ff6ab8', lyricCore: '#fff0f8',
      lyrics: [
        { t: 6.22, text: 'REMEMBER ME?', h: 14 },
        { t: 22.10, text: 'MASCARA RIVERS,\nMAKEUP SHIVERS', h: 13 },
        { t: 41.54, text: 'WATCH ME GLOW', h: 13 },
        { t: 55.50, text: 'WIPING TEARS\nWITH COUPONS', h: 14 },
        { t: 59.94, text: 'CLICK, CLICK, CLICK!', h: 14 },
        { t: 100.80, text: 'HASHTAG NO REGRETS', h: 14 },
        { t: 101.98, text: 'BUT TEARS STILL SHOW', h: 14, lead: 2.4 },
        { t: 107.44, text: 'DO I FEEL GUILTY?\nAS IF', h: 13 },
        { t: 134.74, text: 'SOBBING IN FILTER', h: 14 },
        { t: 137.14, text: 'YOUR PAIN,\nSO AESTHETIC', h: 14 },
        { t: 169.46, text: "YOU'RE FREE", h: 14 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'set', t: 180.6, x: -44, s: 1.5, rot: -1.57, orbit: { r: 150, h: 14, y: 26, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.36, heroBack: 10, heroFov: 54, heroUp: 1.6, heroSide: 2.4 } },   // the ring light and the pink set beside the card
    },
  },
  {
    // A hot July night on her block: the walk-ups with every window open and a curtain in it,
    // washing and bulbs across the street. In at her window and we are small in her apartment:
    // the watermelon, the floor fan, the dishes, the dead plant still in bloom, the Polaroid, the
    // prayer candles, the mattress on the carpet, the war inside the wall, the photograph turned
    // to face it, the shoes kicked off, the projector's scene, the boxes packed. Out her window
    // over the alley into the chorus: every window on the block thrown open, the curtains blowing
    // out of them on the beat, parties on the roofs. Midnight, the saucepan of cereal, "but what
    // for?" in the silence, fireworks up out of the alley, the sirens, the storm, the fuse. The
    // hallway and its busted light, her door, her rooms again, up high, until the walls fall
    // through; and tar beach on her roof. (yas-*.js; its names start yas)
    id: 'your-apartment-smells-like-summer',
    accent: '#ff8a4f',
    title: 'Your Apartment Smells Like Summer',
    collect: 'popsicle',
    startY: 14,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                       // "I was young enough to love you"
      { t: 10.67, kind: 'verse', c: 0.85, endY: 9 },                             // the band
      { t: 20.81, kind: 'verse', c: 0.8, endY: 10, turn: 0.2 },                  // "your apartment smells like summer"
      { t: 41.12, kind: 'verse', endY: 12, turn: 0.2 },                          // "there's a mattress on the carpet"
      { t: 61.47, kind: 'pre', endY: 16, turn: 0.2 },                            // "and I know, I know, I know"
      { t: 64.01, kind: 'break', endY: 15, turn: 0.2 },                          // "we are not built to stay"
      { t: 67.83, kind: 'pre', endY: 20, turn: 0.2 },                            // "but your hand finds mine"
      { t: 71.66, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, gap: true },   // out her window and over the alley
      { t: 91.99, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },     // "then I found you"
      { t: 102.15, kind: 'verse', endY: 12 },                                    // "we eat cereal at midnight"
      { t: 111.07, kind: 'post', start: 'launch', launchBeats: 4, kick: 10, endY: 12, gap: true },   // "but what for?": over the alley in the silence
      { t: 125.10, kind: 'pre', endY: 22 },                                      // "we are a short fuse thing"
      { t: 132.76, kind: 'chorus', c: 1.35 },                                    // "your voice hits me like a chorus starting"
      { t: 153.12, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // "then I found you"
      { t: 162.06, kind: 'bridge', endY: 18, turn: 0.25 },                       // "maybe we're not tragic"
      { t: 171.00, kind: 'pre', endY: 24, turn: 0.25 },                          // "maybe I should go now"
      { t: 179.96, kind: 'break', endY: 22, turn: 0.25 },
      { t: 182.56, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 22, turn: 0.3 },   // through her door; up here, the last chorus
      { t: 211.94, kind: 'outro', endY: 22, turn: 0.3 },                         // tar beach
    ],
    palette: 'summernight2',
    world: 'summer',
    titleView: { ahead: -0.22, x: 1.3, h: 1.5, back: -1.5, lookH: 4.6 },   // behind her, low: the washing across the street, the gate down it
    looks: [
      { t: -99, palette: 'summernight2' },
      { t: 10.6, palette: 'yasAwake', fade: 0.8 },         // the band: the block wakes up
      { t: 20.5, palette: 'apartment', fade: 0.3 },        // "your apartment smells like summer"
      { t: 71.5, palette: 'rooftops', fade: 0.6 },         // out the window
      { t: 92.0, palette: 'yasAwake', fade: 5 },           // "then I found you"
      { t: 118.6, palette: 'storm', fade: 9 },             // "like the sky forgot to knock"
      { t: 161.8, palette: 'hallway', fade: 0.3 },         // "maybe all our magic is a busted hallway light"
      { t: 182.5, palette: 'apartment', fade: 0.4 },       // her door
      { t: 200.5, palette: 'afterstorm', fade: 2.5 },      // "love me while the walls fall through"
    ],
    moments: [
      { t: 20.52, kind: 'flash', k: 0.5 },                 // in at her window
      { t: 34.77, kind: 'shutter', k: 0.3 },               // "then you smile like you got caught"
      { t: 44.94, kind: 'impact', k: 0.3 },                // "there's a war inside the wall"
      { t: 45.57, kind: 'impact', k: 0.35 },
      { t: 102.46, kind: 'bell', k: 0.4, n: 2, gap: 640 }, // midnight
      { t: 112.4, kind: 'fireworks', n: 10, x: 34, y: 38, gap: 170, ahead: 4.2 },   // "there are fireworks in the alley"
      { t: 116.3, kind: 'thunder', k: 0.8 },                              // "you keep laughing at the thunder"
      { t: 119.2, kind: 'thunder', k: 1.0 },                              // "like the sky forgot to knock"
      { t: 134.0, kind: 'thunder', k: 0.7 },
      { t: 141.9, kind: 'thunder', k: 0.9 },
      { t: 149.3, kind: 'thunder', k: 0.8 },
      { t: 161.82, kind: 'flash', k: 0.3 },
      { t: 200.55, kind: 'flash', k: 0.3 },
      { t: 200.6, kind: 'impact', k: 0.45 },               // the walls going
    ],
    lift: { flash: '#ffb070', fog: 0.4 },
    rails: [
      { t: 51.29, bars: 2, x: 0 },          // "I can't hear the neighbors fighting": along her bedroom, the shadows on the wall
      { t: 171.00, bars: 4, x: 0 },         // "maybe I should go now": down the hallway to her door
    ],
    scenery: {
      rooms: [
        // in at her window (her building's front, the sheers blowing in), room to room through her
        // place on the downbeats, out her window at the end; the hallway; her door; the walls fall
        { style: 'living', from: 20.55, to: 25.89, showFrom: -20, caps: [{ kind: 'front', hw: 11, hh: 21, sill: 0.5 }, DOOR] },
        { style: 'kitchen', from: 25.89, to: 30.97, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 30.97, to: 36.03, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 36.03, to: 41.12, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'bedroom', from: 41.12, to: 51.29, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'bedroom', from: 51.29, to: 61.47, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 61.47, to: 71.66, showFrom: 20.5, caps: [null, { kind: 'wall', hw: 12.5, hh: 27, sill: 2.5 }] },
        { style: 'hallway', from: 161.85, to: 182.56, showFrom: 161.8, caps: [null, { kind: 'wall', hw: 9.8, hh: 27 }] },
        { style: 'living', from: 182.56, to: 187.64, showFrom: 161.8, caps: [null, DOOR] },
        { style: 'bedroom', from: 187.64, to: 193.98, showFrom: 161.8, caps: [null, DOOR] },
        { style: 'kitchen', from: 193.98, to: 240, showFrom: 161.8, fallAt: 200.58 },
      ],
      roomEvents: { war: 45.4, fight: 53.6, hands: 69.8, bust: 169.3 },
      // the song's own (yas-world.js): the floor runs on into the roof after the walls fall; the
      // fairy lights brighter in the last chorus; fireworks off the roofs [from, to, every n bars,
      // how many]; umbrellas torn off the fire escapes in the storm; the alley and the fuse
      yas: {
        roofT: 202.4, fairyFrom: 182.5,
        roofworks: [[71.66, 91.9, 2, 2], [91.99, 101.5, 4, 1], [132.76, 153.0, 2, 2], [200.6, 214.5, 1, 3]],
        umbrellas: [[133.4, 152.4]],
        events: [
          { t: 111.95, kind: 'alley', n: 7, ahead: 3.0 },                   // "there are fireworks in the alley", up ahead of her as she lands
          { t: 127.65, kind: 'boom', at: 128.65, x: 21, over: -2.5, k: 0.9 },   // the fuse runs out
        ],
      },
      zones: [
        // her block on a hot night: walk-ups, a curtain in the open windows, washing and bulbs across
        { from: -6, to: 20.3, kits: ['yasBlock'], lines: 0.85, bulbs: true, wake0: 0.7, party: 0.15 },
        // in at her window, the sheers blowing in
        { from: 20.4, to: 20.5, kits: ['yasSheers'], at: 20.45, hw: 11, top: 21 },
        // her apartment, at our size: "your apartment smells like summer", "and the floor fan shakes
        // the room", "a tower of dirty dishes", "a dead plant still in bloom"
        { from: 23.3, to: 23.4, kits: ['yasMelon'], at: 23.3, x: 21, s: 1.8 },
        { from: 24.6, to: 24.7, kits: ['floorFan'], at: 24.6, x: -21 },
        { from: 27.3, to: 27.4, kits: ['dishes'], at: 27.3, x: 22, ahead: 6.8 },
        { from: 29.7, to: 29.8, kits: ['plant'], at: 29.7, x: -19, s: 1.1, ahead: 9.2 },
        // "then you smile like you got caught": the Polaroid flashes; "I say, nothing here is sacred": prayer candles
        { from: 35.7, to: 35.8, kits: ['yasCamera'], at: 35.7, x: 20, s: 1.25, flash: 34.77, ahead: 15.2 },
        { from: 37.4, to: 37.5, kits: ['yasCandles'], at: 37.4, x: -21, s: 1.35, ahead: 16.9 },
        { from: 39.9, to: 40.0, kits: ['floorFan'], at: 39.9, x: 22, face: 2.6, ahead: 19.4 },
        // "there's a mattress on the carpet", the war inside the wall, "a photograph of someone you don't talk about at all"
        { from: 42.4, to: 42.5, kits: ['mattress'], at: 42.4, x: 21, ahead: 21.9 },
        { from: 48.2, to: 48.3, kits: ['photoBack'], at: 48.2, x: 37.3, y: 13, ahead: 27.7 },
        // "we're two amateurs at wanting": two pairs kicked off; "we keep calling it a scene": the projector
        { from: 57.7, to: 57.8, kits: ['yasShoes'], at: 57.7, x: 20, s: 1.6, ahead: 37.2 },
        { from: 61.0, to: 61.1, kits: ['yasProjector'], at: 61.0, x: -21, s: 1.4, screenY: 17, dt: 0.2, ahead: 40.5 },
        // "we are not built to stay": the boxes packed; the fan; the sheers at the window she leaves by
        { from: 65.6, to: 65.7, kits: ['yasBoxes'], at: 65.6, x: -21, s: 1.5, ahead: 45.1 },
        { from: 68.0, to: 68.1, kits: ['floorFan'], at: 68.0, x: 21, face: 3.6, ahead: 47.5 },
        { from: 71.5, to: 71.6, kits: ['yasSheers'], at: 71.55, hw: 12.5, top: 27, ahead: 51 },
        // out her window over the alley: the chorus. Lower walk-ups, a party on half the roofs
        { from: 71.9, to: 92.0, kits: ['yasBlock'], sy: 0.5, span: 0.18, lines: 1.25, bulbs: true, over: true, party: 0.55, wake0: 0.8 },
        // "floor fan rattling like a drummer": a drum kit on a roof; "every goddamn song is true": the boombox
        { from: 74.6, to: 74.7, kits: ['yasStage'], at: 74.6, x: 24, part: 'yasDrums', s: 1.5, over: -2.2 },
        { from: 81.6, to: 81.7, kits: ['yasStage'], at: 81.6, x: -24, part: 'yasBoombox', s: 1.4, over: -2.2 },
        // "your apartment smells like leaving": a plane low over the block with its lights on
        { from: 87.4, to: 87.5, kits: ['yasPiece'], at: 87.4, part: 'yasPlane', h: 24, t0: 82.4, t1: 86.2, xFrom: -170, xTo: 170, ahead: 46 },
        // "cheap wine, wet hair, barely breathing"
        { from: 87.3, to: 87.4, kits: ['yasStage'], at: 87.3, x: 24, part: 'yasWine', s: 1.4, over: -2.2 },
        // after the chorus: the block, still up
        { from: 92.0, to: 161.8, kits: ['yasBlock'], lines: 1.1, bulbs: true, party: 0.25, wake0: 0.7 },
        // "we eat cereal at midnight": the clock on the corner at twelve; "from a saucepan with a fork"
        { from: 103.6, to: 103.7, kits: ['yasPiece'], at: 103.6, x: -12, part: 'yasClockBlade', s: 1.2, over2: 6.5 },
        { from: 106.0, to: 106.1, kits: ['yasStage'], at: 106.0, x: 24, part: 'yasPan', s: 1.25, over: -1.8, inset: 7.5 },
        // "and I know, I know, I know, we are a short fuse thing": the fuse runs along beside her to the firecrackers
        { from: 128.65, to: 128.7, kits: ['yasStage'], at: 128.65, x: 22, part: 'yasCracker', s: 1.2, over: -2.5, with: { lit: 123.6, boom: 127.65, from: 124.6, fy: 0.6 } },
        // "maybe I should go now": the exit sign over the stairs, lit red, over the rail
        { from: 173.4, to: 173.5, kits: ['yasPiece'], at: 173.4, x: -12.6, part: 'yasExit', s: 1.3, room: true, h: 23, ahead: 11.6 },
        // through her door again, up high now: the melon, the fan, the mattress, the plant, the dishes, the wine
        { from: 184.9, to: 185.0, kits: ['yasMelon'], at: 184.9, x: 21, s: 1.8, ahead: 23.0 },
        { from: 186.0, to: 186.1, kits: ['floorFan'], at: 186.0, x: -21, ahead: 24.1 },
        { from: 190.8, to: 190.9, kits: ['mattress'], at: 190.8, x: 21, ahead: 28.9 },
        { from: 195.6, to: 195.7, kits: ['plant'], at: 195.6, x: -19, s: 1.1, ahead: 33.7 },
        { from: 197.4, to: 197.5, kits: ['dishes'], at: 197.4, x: 20, ahead: 35.5 },
        { from: 199.4, to: 199.5, kits: ['yasPiece'], at: 199.4, x: -21, part: 'yasWine', s: 1.6, room: true, h: 0, rot: 0.6, ahead: 37.5 },
        // up here when the walls fall through: the roofs all round, parties on them, the city past them
        { from: 196.0, to: 236.0, kits: ['yasBlock'], x: 54, sy: 0.8, span: 0.14, party: 0.7, wake0: 0.9, lamps: false },
        { from: 196.0, to: 236.0, kits: ['farcity'], x: 118 },
      ],
      // the lyrics in neon: hung off the walk-ups over the street, on her walls, thrown by the projector
      lyricBg: '#120810', lyricColor: '#ffb070', lyricCore: '#fff0e0', lyricX: 12, lyricPart: 'yasNeon', lyricFloor: 'blade', lyricS: 1.3,
      lyrics: [
        { t: 0.4, text: 'YOUNG ENOUGH\nTO LOVE YOU', lead: 2.4, side: 1, h: 4.8 },
        { t: 5.0, text: 'BORED ENOUGH\nTO TRY', side: -1, h: 4.8, color: '#ff6ab0', core: '#ffe8f4' },
        // (on her walls a board is in sight from about four seconds out to one: the leads say so)
        { t: 30.76, text: "DON'T MAKE THIS\nIMPORTANT", side: -1, x: 37.2, floor: 'room', h: 18, s: 1.9, lead: 3.2, color: '#ff6ab0', core: '#ffe8f4' },
        { t: 35.88, text: 'NOTHING HERE\nIS SACRED', side: 1, x: 37.2, floor: 'room', h: 18, s: 1.9, lead: 3.7 },
        { t: 58.76, text: 'WE KEEP CALLING\nIT A SCENE', side: 1, x: 37.2, floor: 'room', h: 17, s: 1.7, lead: 2.44, part: 'yasScreen', bg: '#b8ac98', color: '#2a1a14', core: '#3a2418', frame: 'rgba(0,0,0,0)' },
        { t: 64.04, text: 'WE ARE NOT\nBUILT TO STAY', side: 1, x: 37.2, floor: 'room', h: 18, s: 1.9, lead: 3.5, color: '#7ad8ff', core: '#e8f8ff' },
        { t: 77.96, text: 'KISS ME LIKE\nTHE RENT IS DUE', side: 1, part: 'billboard', x: 26, h: 13, s: 1.3, lead: 2.3, color: '#ff4a6a', core: '#ffe0e4' },   // up on a roof
        { t: 80.42, text: 'EVERY GODDAMN\nSONG IS TRUE', side: -1, h: 4.8, color: '#ffd23a', core: '#fffbe0' },
        { t: 85.6, text: 'CHEAP WINE, WET HAIR,\nBARELY BREATHING', side: -1, h: 4.8, s: 1.4, color: '#ff6ab0', core: '#ffe8f4' },
        { t: 90.72, text: 'I WAS\nALMOST FINE', side: 1, h: 4.8 },
        { t: 94.46, text: 'THEN I\nFOUND YOU', side: -1, h: 4.8, s: 1.4, color: '#ff4a8a', core: '#ffe8f0' },
        { t: 102.46, text: 'CEREAL\nAT MIDNIGHT', side: 1, h: 4.8, color: '#7ad8ff', core: '#e8f8ff' },
        { t: 111.12, text: 'BUT\nWHAT FOR?', side: -1, h: 5.5, s: 1.5, lead: 1.0 },
        { t: 119.96, text: 'LIKE THE SKY\nFORGOT TO KNOCK', side: 1, h: 4.8, s: 1.4, color: '#9ac8ff', core: '#f0f8ff' },
        { t: 125.1, text: 'WE ARE A\nSHORT FUSE THING', side: -1, h: 4.8, color: '#ff8a3a', core: '#fff0e0' },
        { t: 144.08, text: 'YOUR APARTMENT\nSMELLS LIKE LEAVING', side: 1, h: 4.8, s: 1.4 },
        { t: 149.34, text: 'LOVE ME WHILE THE\nWALLS FALL THROUGH', side: -1, h: 4.8, s: 1.4, color: '#ff6ab0', core: '#ffe8f4' },
        { t: 161.16, text: "MAYBE WE'RE\nNOT TRAGIC", side: -1, x: 12.8, floor: 'room', h: 19, s: 1.25, lead: 2.2 },
        { t: 168.88, text: 'A BUSTED\nHALLWAY LIGHT', side: 1, x: 12.8, floor: 'room', h: 19, s: 1.25, lead: 2.1, color: '#fff0c8', core: '#ffffff' },
        { t: 190.22, text: 'KISS ME LIKE\nTHE RENT IS DUE', side: -1, x: 37.2, floor: 'room', h: 18, s: 2.0, lead: 3.4, color: '#ff4a6a', core: '#ffe0e4' },
        { t: 203.04, text: 'I WAS ALMOST FINE\nTHEN I FOUND YOU', side: 1, h: 6, s: 1.8, lead: 2.2, color: '#ff4a8a', core: '#ffe8f0' },
      ],
      // tar beach on her roof, to the right of the road; her arms up in front of it, right of the card
      finale: { kind: 'lamp', t: 217.7, x: 28, fireAt: 200.6, orbit: { r: 60, h: 8, y: 4, facing: true, back: 1.2, right: 0.3, swing: 0.2, heroBack: 12, heroSide: 0.8, heroUp: 3.6, heroFov: 50, heroTilt: 0, heroPan: 0.4 } },
      vehicles: [
        // "there are sirens down the block": two of them, coming the other way
        { kind: 'police', lead: [[114.2, 4.2], [117.4, -2.2]], x: -1, lane: 2.4, reverse: true, from: 114.1, to: 118.0 },
        { kind: 'police', lead: [[114.9, 4.8], [118.3, -2.2]], x: -1, lane: 3.4, reverse: true, from: 114.8, to: 118.9 },
      ],
      roads: [
        { x: 0, width: 16, walk: 4, laneLines: 1, from: -10, to: 20.5, lanes: [-3, 3], density: 0.15, lampEvery: 30 },
        { x: 0, width: 16, walk: 4, laneLines: 1, from: 71.7, to: 161.8, lanes: [-3, 3], density: 0.15, lampEvery: 30 },
      ],
    },
  },
  {
    // his place, with a guest in it who never checks out. The street at night with every window lit;
    // in at the front door: boxes, the couch with the guest's blanket, the plate, the lamps left on,
    // the clock at 3:12, the suitcase, the copies of keys hung in the doorway; the answer in pencil;
    // the kitchen candles that won't go out. Out on the street for the choruses, the doors standing
    // open, the punch clock; back in for the door shut for good and the quiet afterwards, until the
    // walls come down on "I'm free". Then a field at sunrise: the typewriter, the couch empty, the
    // lamps on, and the door that's just a door now.
    id: 'make-it-a-no',
    accent: '#ffc070',
    title: 'Make It A No',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // "not right now"
      { t: 5.61, kind: 'pre', endY: 20 },
      { t: 7.31, kind: 'verse', start: 'launch', launchBeats: 3, kick: 8, endY: 11 },           // the band
      { t: 14.21, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                                 // in at his door: "moved into my place"
      { t: 21.09, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                 // "leaves all the lights on"
      { t: 26.25, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                 // "and copies of keys"
      { t: 34.85, kind: 'post', c: 0.95, endY: 12, turn: 0.3 },                                 // "'cause hope don't die of natural causes"
      { t: 46.87, kind: 'pre', endY: 22 },
      { t: 48.58, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 10 },         // "they say never, say never"
      { t: 55.44, kind: 'chorus', c: 1.25, endY: 11 },                                          // "I don't need you gentle"
      { t: 64.00, kind: 'post', c: 0.95, endY: 12 },
      { t: 69.15, kind: 'verse', c: 0.9, endY: 12 },                                            // "you laughed a little"
      { t: 79.41, kind: 'pre', endY: 22 },
      { t: 81.11, kind: 'break', endY: 18 },                                                    // "so I can stop thinking about it"
      { t: 82.84, kind: 'post', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },          // "and you looked at me and hope"
      { t: 96.52, kind: 'chorus', c: 1.3, endY: 11 },
      { t: 108.46, kind: 'pre', endY: 20 },                                                     // "make it enough"
      { t: 111.01, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 11 },       // the band, the loudest yet
      { t: 116.94, kind: 'bridge', endY: 13, turn: 0.3 },                                       // "you said it like a favor"
      { t: 125.36, kind: 'pre', endY: 18, turn: 0.3 },
      { t: 128.72, kind: 'chorus', c: 1.15, endY: 12, turn: 0.3 },                              // "and I thanked you"
      { t: 138.82, kind: 'break', endY: 20 },                                                   // "I'm free": the walls come down
      { t: 142.31, kind: 'pre', endY: 22 },                                                     // "instead,"
      { t: 144.03, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10, gap: true },   // "they say never": free, over the hole
      { t: 154.22, kind: 'final', c: 1.3, endY: 11 },                                           // "you let the sentence close"
      { t: 160.99, kind: 'break', endY: 18 },                                                   // "when you made it enough"
      { t: 162.73, kind: 'pre', endY: 22 },
      { t: 164.43, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },        // "the couch is empty"
      { t: 171.26, kind: 'final', c: 1.4, endY: 11 },                                           // "the door's just a door now"
      { t: 177.85, kind: 'final', c: 1.3, endY: 11 },                                           // "thank you"
      { t: 184.72, kind: 'outro', endY: 5 },
    ],
    rails: [
      { t: 22.81, bars: 2, x: 0 },        // "a guest with no check out, and copies of keys"
      { t: 72.56, bars: 2, x: 0 },        // "an open door's a full-time job, and I clock in every day"
    ],
    palette: 'mnNight',
    world: 'guest',
    collect: 'bulb',
    titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.4 },
    looks: [
      { t: -99, palette: 'mnNight' },
      { t: 14.4, palette: 'mnHome', fade: 0.4 },        // in at his door
      { t: 26.4, palette: 'mnHall', fade: 0.4 },
      { t: 35.0, palette: 'mnKitchen', fade: 0.4 },
      { t: 47.0, palette: 'mnNight', fade: 0.4 },       // out on the street
      { t: 117.1, palette: 'mnHome', fade: 0.4 },       // back in
      { t: 124.2, palette: 'mnQuiet', fade: 1.2 },      // "the quiet afterwards"
      { t: 129.6, palette: 'mnHome', fade: 1.0 },       // "and I thanked you"
      { t: 141.6, palette: 'mnDawn', fade: 1.2 },       // "I'm free"
      { t: 168.0, palette: 'mnMorning', fade: 4.0 },    // "the couch is empty"
    ],
    moments: [
      { t: 7.31, kind: 'flash', k: 0.2 },               // the band
      { t: 75.12, kind: 'knock', n: 1, k: 0.6 },        // "I clock in"
      { t: 80.7, kind: 'blackout', dur: 2.1, k: 0.85 }, // "so I can stop thinking about it"
      { t: 111.01, kind: 'flash', k: 0.3 },             // the band, loudest
      { t: 121.92, kind: 'knock', n: 1, k: 1.0 },       // the door, for good
      { t: 140.6, kind: 'flash', k: 0.4 },              // "I'm free"
      { t: 155.72, kind: 'bell', k: 0.55 },             // the sentence closes
      { t: 164.43, kind: 'flash', k: 0.3 },             // "the couch is empty"
    ],
    scenery: {
      rooms: [
        { style: 'living', from: 14.21, to: 26.25, caps: [{ kind: 'front', hw: 12, hh: 24 }, MNDOOR] },     // in at the front door
        { style: 'hall', from: 26.25, to: 34.85, caps: [null, MNDOOR] },
        { style: 'kitchen', from: 34.85, to: 46.87, caps: [null, { kind: 'wall', hw: 13, hh: 28 }] },
        { style: 'living', from: 116.94, to: 144.03, caps: [{ kind: 'front', hw: 12, hh: 24 }, MNDOOR], fallAt: 140.6, fallFor: 1.8 },   // "I'm free"
      ],
      zones: [
        { from: -6, to: 14.3, kits: ['mnStreet'] },                                                // his street, every window lit
        { from: 46.8, to: 117.1, kits: ['mnStreet'] },
        { from: 140.6, to: 172, kits: ['farcity'], x: 130 },                                       // where the walls were
        { from: 142, to: 200, kits: ['mnField'] },
        // the lamps he leaves on
        { from: 21.0, to: 26.0, kits: ['mnLamps'], every: 0.5, x: 29, spread: 2, floor: true },
        { from: 117.2, to: 140.4, kits: ['mnLamps'], every: 1.3, x: 29, spread: 2, floor: true },
        { from: 168.4, to: 186, kits: ['mnLamps'], every: 0.6, x: 30, spread: 24, s: 1.2, on: 169.9 },   // "the lights are on"
        { from: 0, to: 0.1, kits: ['mnKeys'], at: 26.25, hw: 11, top: 26, drop: 9, n: 46 },          // "and copies of keys"
        { from: 72.6, to: 75.3, kits: ['mnDoors'], every: 0.5, x: 24, s: 1.3 },                      // "an open door's a full-time job"
        { from: 171.4, to: 186, kits: ['mnDoors'], every: 1.6, x: 42, s: 1.5, open: 0, lit: 0 },      // "the door's just a door now"
        { from: 0, to: 0.1, kits: ['mnProps'], at: [
          { t: 16.6, x: -21, kind: 'boxes', s: 1.0, floor: true },                    // "moved into my place"
          { t: 18.8, x: 25, kind: 'couch', s: 0.9, blanket: true, floor: true },      // "sleeps on my couch"
          { t: 20.6, x: -21, kind: 'plate', s: 1.3, floor: true },                    // "and it eats off my plate"
          { t: 24.0, x: 21, kind: 'clock', s: 1.1, floor: true },                     // "drinks all my sleep"
          { t: 25.6, x: -21, kind: 'suitcase', s: 1.2, floor: true },                 // "a guest with no check out"
          { t: 33.0, x: 27.4, kind: 'pencil', s: 0.85, floor: true, face: false },    // "you answered in pencil"
          { t: 37.2, x: -20, kind: 'candle', s: 1.15, floor: true },                  // "hope don't die of natural causes"
          { t: 40.9, x: 20, kind: 'candle', s: 1.15, floor: true, snuff: 40.25 },     // "somebody's gotta put it down"
          { t: 46.6, x: -20, kind: 'candle', s: 1.15, floor: true, blow: 46.4 },      // "it only minds your mouth"
          { t: 75.9, x: 22, kind: 'punch', s: 1.2, punch: 75.12 },                    // "and I clock in every day"
          { t: 123.5, x: -24, kind: 'door', s: 1.25, open: 1.5, lit: 1, shut: 121.92, floor: true },   // "to let her shut the door for good"
          { t: 156.6, x: 38, kind: 'typewriter', s: 1.9, ding: 155.72 },              // "you let the sentence close"
          { t: 168.1, x: -34, kind: 'couch', s: 1.5 },                                // "the couch is empty"
        ] },
      ],
      lyricPart: 'mnSign', lyricX: 0, lyricBg: '#efe6d2', lyricColor: '#a8323a', lyricCore: '#a8323a',
      lyrics: [
        { t: 0.0, text: 'NOT RIGHT NOW', h: 14, lead: 3.2 },
        { t: 23.92, text: 'A GUEST WITH NO CHECK OUT', h: 13 },
        { t: 30.78, text: 'YOU ANSWERED IN PENCIL,\nI NEEDED IT WROTE', h: 12 },
        { t: 34.76, text: "HOPE DON'T DIE\nOF NATURAL CAUSES", h: 13 },
        { t: 48.24, text: "THEY SAY NEVER, SAY NEVER\nLIKE NEVER'S A CURSE", h: 14 },
        { t: 55.54, text: "I DON'T NEED YOU GENTLE,\nI NEED YOU TO CLOSE", h: 14 },
        { t: 59.08, text: 'IF YOU EVER LOVED ME,\nMAKE IT A NO', h: 14 },
        { t: 72.88, text: "AN OPEN DOOR'S\nA FULL-TIME JOB", h: 14 },
        { t: 77.78, text: 'EMBARRASSING THE WAY\nTHE TRUE ONES SOUND', h: 14 },
        { t: 106.96, text: 'IF YOU EVER LOVED ME,\nMAKE IT ENOUGH', h: 14 },
        { t: 123.10, text: 'OH, THE QUIET AFTERWARDS', h: 13 },
        { t: 133.58, text: 'STRANGEST THANK YOU\nEVER SAID', h: 13 },
        { t: 153.32, text: 'YOU LET THE\nSENTENCE CLOSE', h: 14 },
        { t: 166.78, text: 'THE COUCH IS EMPTY', h: 14 },
        { t: 169.96, text: 'THE LIGHTS ARE ON', h: 14 },
        { t: 171.56, text: "THE DOOR'S JUST\nA DOOR NOW", h: 14, lead: 2.4 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'justdoor', t: 191.5, x: -40, s: 1.8, rot: -1.57, orbit: { r: 110, h: 12, y: 16, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 10, heroFov: 46, heroUp: 1.8 } },   // the door alone, the empty couch, the lamp beside the card
    },
  },
  {
    // the night going wrong, from her side. The street of clubs and the queue under the marquee;
    // in through the doors, and we are small in it: the lounge sweet and clean, someone watching
    // from the balcony, the champagne going off, the little white pill going into her drink. The
    // floor in the dark: the crowd hands-up on every beat, the room dropping with the kick. The
    // red room, losing it slow; the corridors, phones out of the walls recording, the pictures
    // going to dust, FRIENDS, FAMILY, BOSSES; the washroom's mirrors cracking; the floor again,
    // the crowd turned to stone; the void; lost time over a hole in the floor; the house lights on
    // the mess. Then the doors, the morning, and the bus home. (spd-*.js, club.js)
    id: 'spiked',
    accent: '#8a6aff',
    title: 'Spiked',
    collect: 'drink',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8 },                                          // "yeah, take it / lose it all"
      { t: 9.47, kind: 'pre', endY: 14 },                                          // up to the door
      { t: 14.86, kind: 'verse', start: 'launch', kick: 8, endY: 12 },             // in: "spy you across the room"
      { t: 29.20, kind: 'break', endY: 20 },                                       // the band drops out
      { t: 30.99, kind: 'pre', start: 'launch', kick: 6, endY: 24 },               // "lips say stop"
      { t: 38.14, kind: 'chorus', start: 'launch', kick: 10, endY: 10, gap: true }, // "the second you hit the floor": over the crowd
      { t: 52.43, kind: 'post', endY: 16 },                                        // "lose control"
      { t: 66.72, kind: 'verse', start: 'launch', kick: 8, endY: 8 },              // the back corridors
      { t: 95.17, kind: 'chorus', start: 'launch', kick: 10, endY: 12 },           // the crowd in stone
      { t: 109.37, kind: 'final', c: 1.2, endY: 26 },                              // "lose it all for me"
      { t: 118.23, kind: 'break', endY: 26 },                                      // nothing
      { t: 120.00, kind: 'post', start: 'launch', kick: 5, endY: 18, gap: true },  // lost time: over the hole
      { t: 127.07, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the house lights come up
      { t: 134.13, kind: 'outro', endY: 4 },                                       // the morning
    ],
    rails: [
      { t: 18.45, bars: 2, x: 0 },     // "so sweet and clean, gonna dirty you up"
      { t: 84.51, bars: 2, x: 0 },     // "cross every line": the ropes snapping across it
    ],
    lift: { flash: '#ff6fe0', fog: 0.4 },
    // glitter on the first chorus
    confetti: [[38.14, 52.4]],
    confettiColors: [0xff4fd8, 0xc8a8ff, 0x40d8ff, 0xffffff, 0xffd0f0, 0x8a6aff],
    confettiNormal: true,
    palette: 'spkStreet',
    world: 'club',
    titleView: { ahead: -0.15, x: 1.2, h: 2.2, back: -0.55, lookH: 1.0 },   // behind her, the queue, the club up the street
    looks: [
      { t: -99, palette: 'spkStreet' },
      { t: 14.9, palette: 'spkLounge', fade: 0.3 },      // in: sweet and clean
      { t: 27.4, palette: 'spkBlur', fade: 1.6 },        // "now your world's blurry"
      { t: 30.9, palette: 'spkFloor', fade: 0.4 },       // the floor, in the dark
      { t: 38.2, palette: 'spkChorus', fade: 0.3 },
      { t: 52.5, palette: 'spkRed', fade: 2.5 },         // "lose control"
      { t: 66.8, palette: 'spkHall', fade: 0.6 },        // the back corridors
      { t: 74.2, palette: 'spkPhones', fade: 0.4 },      // "friends, family, bosses"
      { t: 81.0, palette: 'spkWash', fade: 0.4 },
      { t: 88.1, palette: 'spkHall', fade: 0.4 },
      { t: 95.2, palette: 'spkWrong', fade: 0.3 },       // the crowd in stone
      { t: 109.4, palette: 'spkVoid', fade: 2.0 },       // "lose it all for me"
      { t: 120.0, palette: 'spkDark', fade: 0.3 },
      { t: 127.1, palette: 'spkHouse', fade: 0.15 },     // the house lights
      { t: 134.2, palette: 'spkMorning', fade: 1.2 },    // outside, the morning
    ],
    moments: [
      { t: 21.13, kind: 'pop', k: 0.45, flash: 0.06 },   // the cork: "gonna dirty you up"
      { t: 24.26, kind: 'pop', k: 0.3, flash: 0.03 },    // the pill goes in
      { t: 29.2, kind: 'blackout', dur: 1.75, k: 0.8 },  // the band drops out
      { t: 68.49, kind: 'shutter', k: 0.35 },            // "phone in hand, recording"
      { t: 69.38, kind: 'shutter', k: 0.3 },
      { t: 74.29, kind: 'ring', k: 0.22, dur: 0.35 },    // FRIENDS
      { t: 74.73, kind: 'ring', k: 0.22, dur: 0.35 },    // FAMILY
      { t: 75.18, kind: 'ring', k: 0.22, dur: 0.35 },    // BOSSES
      { t: 81.39, kind: 'glass', k: 0.3 },               // the mirrors going
      { t: 83.18, kind: 'glass', k: 0.3 },
      { t: 118.23, kind: 'blackout', dur: 1.8, k: 0.97 }, // lost time
      { t: 127.07, kind: 'flash', k: 0.7 },              // the house lights
      { t: 134.13, kind: 'flash', k: 0.4 },              // the doors: morning
    ],
    scenery: {
      signs: [
        { key: 'SPKMARQ', text: 'LOSE IT ALL', color: '#ffd8a0', core: '#fffaf0', bg: '#0a0610', size: 96 },
        { key: 'EXITL', text: '\u25C0 EXIT', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
        { key: 'EXITR', text: 'EXIT \u25B6', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
        { key: 'SPDEXIT', text: 'EXIT', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 112 },
        { key: 'SPDEXITU', text: 'EXIT \u25B2', color: '#2aff6a', core: '#e0ffe8', bg: '#030a05', size: 100 },
      ],
      rooms: [
        { style: 'lounge', from: 14.86, to: 29.20, caps: [{ kind: 'front', hw: 13, hh: 28 }, { kind: 'wall', hw: 12, hh: 26 }] },   // sweet and clean
        { style: 'floor', from: 29.20, to: 52.43, caps: [null, { kind: 'wall', hw: 14, hh: 28 }] },                                // the floor
        { style: 'redroom', from: 52.43, to: 66.72, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                              // "lose control"
        { style: 'hall', from: 66.72, to: 80.95, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                                 // the back corridors
        { style: 'wash', from: 80.95, to: 88.07, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },
        { style: 'hall', from: 88.07, to: 95.17, caps: [null, { kind: 'wall', hw: 12, hh: 22 }] },
        { style: 'floor', from: 95.17, to: 134.13, caps: [null, { kind: 'wall', hw: 11, hh: 24 }] },                              // the floor again, wrong; then the lights
      ],
      roomEvents: { lasers: [[38.1, 52.4], [95.2, 109.4]], void: [109.4, 118.3, 1.6, 0.2], red: [120.0, 127.07, 0.25, 0.05], house: [127.07, 999, 0.05, 0.4] },
      // how the crowd and the room move: windows of song time [from, to, in, out]
      spd: {
        jump: [[38.14, 52.43, 0.05, 0.5]], arms: [[38.14, 52.43, 0.05, 0.6], [36.35, 38.14, 1.6, 0]], crouch: [[35.0, 38.14, 2.6, 0.05]],
        freeze: [[95.17, 118.3, 0.05, 0.3]], stone: [[95.17, 118.3, 0.12, 0.3]], dissolve: [[114.6, 999, 4.4, 0]],
        drop: [[38.14, 52.43, 0.05, 0.3]], rings: [[38.14, 52.43, 0.05, 0.3]], jets: [[38.14, 52.43, 0.02, 0.3]],
        rig: [[30.9, 52.43, 0.5, 0.3], [95.17, 109.4, 0.3, 1.0]], sway: [[52.43, 66.72, 2.0, 0.5]],
      },
      spdCrowd: [
        { from: -3.5, to: 14.2, every: 0.17, xs: [14.8], mode: 0, s: 6.2, spread: 0.6, skip: 0.04, jx: 1.2 },                               // the queue
        { from: 16.0, to: 28.6, every: 0.55, xs: [22, 34, 47], mode: 1, s: 6.8, spread: 2.4, skip: 0.35, clear: [[21.4, 26.9, 1], [16.2, 18.2, -1]] },  // the lounge
        { from: 31.3, to: 52.2, every: 0.26, xs: [19, 27, 36, 47], mode: 1, s: 7, spread: 0.9, skip: 0.1, clear: [[31.8, 33.4, -1], [45.3, 46.8, 1], [47.0, 48.6, 0], [50.0, 51.4, 1]] },  // the floor
        { from: 95.4, to: 118, every: 0.26, xs: [19, 27, 36, 47], mode: 1, s: 7, spread: 0.9, skip: 0.1, clear: [[100.2, 101.6, -1], [107.4, 109.0, 1]] },  // the floor again: stone
      ],
      spdPeople: [
        { t: 14.25, x: -17.5, mode: 4, s: 8.2, rot: -1.57, variant: 1, tint: 0x0a0a0e },     // the man on the door
        { t: 18.1, x: -40, mode: 4, s: 7.4, dy: 13.4, eyes: true, track: true, variant: 1 },  // "spy you across the room": the one on the balcony
        { t: 52.2, x: 0, mode: 3, s: 5.0, dy: 34.7, rot: 3.14, variant: 1 },                  // the DJ over the far door
        { t: 59.4, x: -25, mode: 2, s: 7.6, rot: -0.9, seed: 0.31 },                          // "spiked in stone": statues in the red room
        { t: 59.9, x: -37, mode: 2, s: 8.2, rot: -2.2, seed: 0.77 },
        { t: 60.5, x: -27, mode: 2, s: 7.2, rot: -1.4, seed: 0.12 },
      ],
      spdReach: [38.14],
      spdCracks: [{ at: 81.39, side: 1 }, { at: 82.28, side: -1 }, { at: 83.18, side: 1 }, { at: 84.07, side: -1 }],
      zones: [
        // the street of clubs: their signs, the queue roped off up to the door, the marquee, the glass, searchlights
        { from: -4, to: 14.8, kits: ['clubstreet'], wake0: 0.6 },
        { from: -2.4, to: 14.6, kits: ['ropes'], x: 12.2, every: 0.2, s: 2.4 },
        { from: -4, to: 14.8, kits: ['spdWallSigns'], at: [[1.2, -19.5, 14, 'BAR'], [2.9, 19.5, 12, 'DANCING'], [4.6, -19.5, 16, 'LIVETONIGHT', 1], [6.4, 19.5, 13, 'OPEN'], [8.0, -19.5, 12, 'KISS'], [9.8, 19.5, 15, 'HOTEL'], [11.4, -19.5, 13, 'LIQUOR', 1], [12.9, 19.5, 17, 'ENCORE']] },
        { from: 14.75, to: 14.76, kits: ['marquee'], at: 14.75, sign: 'SPKMARQ', y: 36 },
        { from: 14.8, to: 14.81, kits: ['neonGlass'], at: 14.8, x: -34, y: 18, s: 1.6 },
        { from: 14.9, to: 15.0, kits: ['spdSearch'], at: [[14.9, -30], [14.9, 30]], y: 58 },
        // the lounge: the balcony, the one watching from it, his spot on her; the ball; the bar, the champagne, the drink
        { from: 18.1, to: 18.2, kits: ['spdBalcony'], at: 18.1, x: -45, y: 12 },
        { from: 18.1, to: 18.2, kits: ['spdSpot'], at: 18.1, x: -40.5, y: 26.5, t0: 15.4, t1: 19.0 },
        { from: 19.9, to: 20.0, kits: ['mirrorBall'], at: [19.9], lift: 16 },
        { from: 21.0, to: 21.1, kits: ['clubBar'], at: 21.0, x: 33 },
        { from: 22.6, to: 22.7, kits: ['clubBar'], at: 22.6, x: 33 },
        { from: 24.2, to: 24.3, kits: ['clubBar'], at: 24.2, x: 33 },
        { from: 25.8, to: 25.9, kits: ['clubBar'], at: 25.8, x: 33 },
        { from: 22.6, to: 22.7, kits: ['spdBottle'], at: 22.6, x: 24.5, y: 0, pop: 21.13, s: 1.0, tilt: 0.7 },
        { from: 25.8, to: 25.9, kits: ['spdDrink'], at: 25.8, x: 23.5, y: 0, drop: 24.26, s: 1.0 },
        // the floor: the stacks, the rig, the lasers, the CO2, the DJ; the lips, the throne, the walls of sound, the rain
        { from: 29.4, to: 52.4, kits: ['speakers'], x: 54, every: 1.6 },
        { from: 30.0, to: 52.4, kits: ['spdRig'], every: 1.79, y: 34 },
        { from: 36.0, to: 52.4, kits: ['lasers'], every: 1.1, x: 30, y: 38 },
        { from: 37.6, to: 52.4, kits: ['spdJets'], every: 1.79, x: 23 },
        { from: 52.2, to: 52.3, kits: ['spdDJ'], at: 52.2, y: 27.5 },
        { from: 32.7, to: 32.8, kits: ['spdLips'], at: [{ t: 33.1, x: -33, y: 17 }, { t: 108.2, x: 27, y: 20, dying: true, out: 108.6, tilt: 0.06 }] },
        { from: 41.0, to: 41.1, kits: ['mirrorBall'], at: [41.0], lift: 16 },
        { from: 46.0, to: 46.1, kits: ['spdThrone'], at: 46.0, x: 26, lift: 44.39 },
        { from: 48.2, to: 48.3, kits: ['spdStacks'], at: [[48.2, -32, 1.1], [48.2, 32, 1.1]] },
        { from: 49.9, to: 51.6, kits: ['spdRain'], t0: 49.9, t1: 51.6, top: 42 },
        // the red room: the booths swaying, the tower and the poison, the statues, the door out chained
        { from: 52.5, to: 66.6, kits: ['booths'], x: 30, every: 1.4 },
        { from: 58.6, to: 58.7, kits: ['spdTower'], at: 58.6, x: 26, pour: 56.6 },
        { from: 62.2, to: 62.3, kits: ['spdChainDoor'], at: 62.2, x: 43.5, sign: 'SPDEXIT' },
        // the corridors: phones out of the walls, the upload, the pictures to dust, the notifications, exits every way
        { from: 67.9, to: 70.8, kits: ['spdPhones'], s: 1.25, at:[[68.0, -17.6, 8], [68.4, 17.6, 9], [68.8, -17.6, 10], [69.2, 17.6, 8.5], [69.6, -17.6, 9], [70.0, 17.6, 10], [70.4, -17.6, 8.5], [70.8, 17.6, 9]] },
        { from: 70.6, to: 73.6, kits: ['spdUpload'], t0: 70.7, t1: 73.5, x: -17.4, y: 13 },
        { from: 73.4, to: 74.8, kits: ['spdFrames'], at: [[73.4, 17.5, 13], [73.8, -17.5, 12], [74.2, 17.5, 14], [74.6, -17.5, 12.5]], lead: 1.1 },
        { from: 75.4, to: 79.6, kits: ['spdCards'], at: [{ t: 75.6, x: -14.5, y: 14, v: 0, pop: 74.29, s: 0.72 }, { t: 76.0, x: 14.5, y: 15, v: 1, pop: 74.73, s: 0.72 }, { t: 76.5, x: -14.5, y: 13, v: 2, pop: 75.18, s: 0.72, tilt: -0.04 },
          { t: 77.0, x: 15, y: 9, v: 3, pop: 75.8, s: 0.8 }, { t: 77.3, x: -15, y: 18, v: 4, pop: 76.06, s: 0.8, tilt: 0.05 }, { t: 77.6, x: 15, y: 18.5, v: 5, pop: 76.3, s: 0.8 }, { t: 77.9, x: -15, y: 9.5, v: 6, pop: 76.51, s: 0.8 },
          { t: 78.2, x: 15, y: 13, v: 3, pop: 76.75, s: 0.8, tilt: -0.05 }, { t: 78.5, x: -15, y: 15, v: 5, pop: 76.95, s: 0.8 }, { t: 78.8, x: 15, y: 8, v: 6, pop: 77.2, s: 0.8 }, { t: 79.1, x: -15, y: 19, v: 4, pop: 77.4, s: 0.8 }, { t: 79.4, x: 15, y: 17, v: 3, pop: 77.62, s: 0.8 }] },
        { from: 78.0, to: 80.9, kits: ['exits'], at: [[78.4, -14, 15, 'EXITR', 0.4], [79.1, 14, 16, 'EXITL', -0.3], [79.8, -14, 13, 'EXITL', -0.6], [80.5, 14, 15, 'EXITR', 0.5]] },
        // the washroom: the mirrors cracking (club.js), the sinks, the ropes across the rail
        { from: 81.0, to: 88.0, kits: ['sinks'], at: [[82.7, 24], [84.3, -24], [85.9, 24], [87.2, -24]] },
        { from: 85.3, to: 87.3, kits: ['spdRopesX'], at: [85.40, 86.29, 87.18] },
        // the hall: the bed by the wall, the lamp on, the alarm going
        { from: 93.9, to: 94.0, kits: ['spdBed'], at: 93.9, x: -16.8, ring: 92.0, s: 0.85 },
        { from: 88.2, to: 95.1, kits: ['exits'], at: [[89.4, -11, 16, 'EXITR'], [90.6, 11, 16, 'EXITL', 0.3]] },
        // the floor again, wrong: the stacks, the rig gone still, green lasers, the ball
        { from: 95.2, to: 109.3, kits: ['speakers'], x: 54, every: 1.6 },
        { from: 95.0, to: 109.4, kits: ['lasers'], every: 1.1, x: 30, y: 38, cols: [0x3aff8a, 0xd040ff] },
        { from: 95.2, to: 118.0, kits: ['spdRig'], every: 1.79, y: 34 },
        { from: 99.0, to: 99.1, kits: ['mirrorBall'], at: [99.0], lift: 16 },
        // the void: pills hanging in it
        { from: 111.0, to: 118.2, kits: ['spdPills'], t0: 111.0, t1: 118.2 },
        // lost time: the hole in the floor; then the real way out, green, chasing
        { from: 120.5, to: 120.6, kits: ['spdPit'], at: 120.55, w: 22, l: 24 },
        { from: 121.5, to: 127.0, kits: ['exits'], at: [[121.9, -15, 14, 'SPDEXITU'], [122.8, 15, 14, 'SPDEXITU'], [123.7, -15, 14, 'SPDEXITU'], [124.6, 15, 14, 'SPDEXITU'], [125.5, -15, 14, 'SPDEXITU'], [126.4, 15, 14, 'SPDEXITU']], chase: true, green: true },
        // the house lights: what's left. The ball down, the glass on its side
        { from: 127.0, to: 134.0, kits: ['mess'], every: 0.3 },
        { from: 127.0, to: 134.0, kits: ['speakers'], x: 54, every: 1.6 },
        { from: 129.9, to: 130.0, kits: ['spdBallDown'], at: 129.9, x: -28 },
        { from: 131.7, to: 131.8, kits: ['spdGlassDown'], at: 131.7, x: 27 },
        { from: 128.6, to: 133.4, kits: ['spdAfter'], at: [[128.9, -30, 'sign', -1.1, 1.9], [131.0, 29, 'mop', 0.6, 1.7], [133.0, -26, 'shoe', 2.4, 1.9]] },
        // outside: the morning
        { from: 134.65, to: 152, kits: ['spdMorning'], signs: [[137.6, -18, 'DINER'], [139.4, 18, 'OPEN']] },
      ],
      roads: [
        { x: 0, width: 16, walk: 4, laneLines: 1, from: -10, to: 14.9, lanes: [-4, 4], density: 0.3, lampEvery: 34, follow: true },
        { x: 0, width: 16, walk: 4, laneLines: 1, from: 134.1, to: 160, lanes: [-4, 4], density: 0.06, lampEvery: 34, follow: true, dry: true },
      ],
      lyricBg: '#0a0612', lyricColor: '#ff5fd8', lyricCore: '#ffe0f6', lyricPart: 'neonSign', lyricFloor: true,
      lyrics: [
        { t: 26.2, text: "NOW YOUR\nWORLD'S BLURRY", side: -1, x: 32, h: 20 },
        { t: 27.85, text: "AIN'T THAT\nIRONIC", side: 1, x: 24, h: 17, lead: 0.8 },
        { t: 31.4, text: 'LIPS SAY STOP', side: -1, x: 31, h: 7, lead: 1.7 },
        { t: 46.56, text: 'MUSIC TO\nMY EARS', side: -1, x: 24, h: 17, lead: 0.9 },
        { t: 49.22, text: "DESPAIR TASTES BETTER\nWHEN IT'S SOAKED IN TEARS", side: 1, x: 28, h: 18, lead: 1.5, s: 1.1 },
        { t: 52.68, text: 'LOSE CONTROL', side: -1, x: 28, h: 17, lead: 1.4 },
        { t: 57.35, text: 'LET THE\nPOISON FLOW', side: -1, x: 26, h: 16, lead: 1.2 },
        { t: 72.1, text: 'TURN YOUR\nLIFE TO DUST', side: 1, x: 14, h: 16, s: 0.75, lead: 1.3 },
        { t: 92.0, text: 'IN THE\nMORNING', side: 1, x: 14, h: 14, s: 0.8 },
        { t: 99.1, text: 'SCREAM MY NAME\nTILL YOUR VOICE IS GONE', side: -1, x: 24, h: 17, lead: 1.8, part: 'spdNeonDying' },
        { t: 107.3, text: 'GIVE ME\nONE LAST KISS', side: 1, x: 25, h: 10, lead: 0.9, part: 'spdNeonDying' },
        { t: 112.48, text: 'LOSE IT ALL\nFOR ME', side: -1, x: 24, h: 15, lead: 1.4 },
        { t: 116.12, text: 'THIS IS\nECSTASY', side: 1, x: 24, h: 15, lead: 1.3 },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'busstop', t: 137.85, x: 0.6, fireAt: 134.2, busS: 1.45, orbit: { y: 3, heroBack: 12, heroSide: 1.6, heroUp: 2.6, heroFov: 42, heroTilt: 2.2, heroPan: 0.18 } },
    },
  },
  {
    // August 1st, drenched in heat, up the hill he loved. The trailhead's map with its dot; into
    // the woods past the fingerpost (he's in Chicago now); the storm; the hammock nobody's in; the
    // building that's a church but isn't, no arrows on its trees; the circle of stones; the
    // footbridge out over the gorge in the silence; the boulder from the first time; arrows every
    // which way; the bench where he'd rest, looking out; the ridge; the cabin with its door open
    // and the chorus that lets go; the rock that gets the leg; the spring; out of the woods, the
    // cairns, the fire tower on the top at sunset; the register box; the sidewalk home.
    id: 'you-are-here',
    accent: '#ffb347',
    title: 'You Are Here',
    collect: 'pin',
    startY: 4.8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 4.4 },                                     // "you are here"
      { t: 15.86, kind: 'verse', endY: 9 },                                     // into the woods
      { t: 36.20, kind: 'pre', endY: 20 },                                      // "this time I have no excuses"
      { t: 52.75, kind: 'pre', endY: 28, c: 0.95 },                             // "I've spent so long waiting"
      { t: 69.16, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 22 },   // the first chorus: off the top of the climb
      { t: 85.39, kind: 'break', rb: 4, endY: 28 },                             // "that building is a church"
      { t: 98.09, kind: 'verse', endY: 30 },                                    // "the first time I met him"
      { t: 114.42, kind: 'pre', start: 'launch', launchBeats: 3, kick: 9, gap: true, endY: 38 },   // the music stops: "a full-time job", the bridge is out
      { t: 132.45, kind: 'chorus', endY: 32 },
      { t: 146.86, kind: 'post', endY: 36 },                                    // "he would come here alone"
      { t: 159.43, kind: 'break', rb: 4, endY: 38 },
      { t: 164.80, kind: 'bridge', endY: 44 },                                  // "walking to the trails makes me think of him"
      { t: 177.37, kind: 'pre', start: 'launch', launchBeats: 4, kick: 9, endY: 46 },     // "sometimes you have to use your ability to make excuses"
      { t: 193.49, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, c: 1.25, endY: 36 },   // "and I will think less, I will feel more"
      { t: 209.67, kind: 'break', rb: 4, endY: 32 },                            // "it's while I was literally saying I knew the way"
      { t: 211.49, kind: 'break', start: 'launch', launchBeats: 2, kick: 6, rb: 4, endY: 30 },     // "that my leg hit the rock": a stumble, not a dive
      { t: 218.73, kind: 'verse', c: 0.95, endY: 40 },                          // "well, I know the way back now"
      { t: 242.36, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 40 },   // "I swear it's not just a lack of blood"
      { t: 247.73, kind: 'chorus', endY: 36 },
      { t: 260.27, kind: 'break', rb: 4, endY: 44 },                            // "I hope it's still out of the woods"
      { t: 273.03, kind: 'pre', endY: 54, c: 0.8 },                             // "isn't it funny that I'd reach the top"
      { t: 278.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 14 },  // the top: "he used to love this place"
      { t: 291.20, kind: 'bridge', endY: 8 },                                   // "if I could ever get a message back"
      { t: 304.01, kind: 'outro', endY: 4 },                                    // "I'm on the sidewalk, getting close to home"
    ],
    rails: [
      { t: 105.35, bars: 2, x: 0 },                                             // "I told him he should start a cult", past the stones
      { t: 150.45, bars: 2, x: 0 },                                             // "he would come here with anyone"
    ],
    palette: 'august',
    world: 'trail',
    skyline: 'hills',
    groundStyle: 'country',
    camLift: 0.35,
    ribbonWidth: 0.72,
    titleView: { ahead: -0.3, x: 2.5, h: 2.5, back: -0.75, lookH: 2.4 },    // behind her: the map board, the gate, the woods
    lift: { flash: '#ffe2a0', fog: 0.45 },
    looks: [
      { t: -99, palette: 'august' },
      { t: 29.6, palette: 'thunder', fade: 1.6 },           // "it was raining, and there was thunder"
      { t: 37.5, palette: 'august', fade: 3 },
      { t: 132.4, palette: 'golden', fade: 18 },
      { t: 160, palette: 'ridge', fade: 4 },                // out of the trees
      { t: 179.2, palette: 'golden', fade: 3 },
      { t: 222, palette: 'sunset', fade: 14 },
      { t: 238.2, palette: 'sunset', set: { fog: 0xe0a070, fogDensity: 0.0019, daze: 0.12 }, fade: 1.4 },   // "I don't even know what heat stroke is"
      { t: 241.3, palette: 'sunset', set: { daze: 0.42 }, fade: 0.8 },     // "I swear it's not just a lack of blood"
      { t: 247.7, palette: 'sunset', fade: 1.2 },
      { t: 262, palette: 'sunsetopen', fade: 5 },
      { t: 278.5, palette: 'summit', fade: 3 },             // the top
      { t: 293, palette: 'bluehour', fade: 10 },
      { t: 306, palette: 'evening', fade: 5 },              // the sidewalk
    ],
    moments: [
      { t: 31.7, kind: 'thunder', k: 0.8 },
      { t: 33.4, kind: 'thunder', k: 1 },
      { t: 101.0, kind: 'flash', k: 0.18 },                 // "he looked exactly like Jesus": the light breaks through
      { t: 214.46, kind: 'thud', k: 1 },                    // "that my leg hit the rock"
    ],
    scenery: {
      flat: [[-12, 13, 0], [299, 340, 0]],
      shelf: 16,                                                                // the woods stand level with the trail, the hill falls away past them
      cuts: [{ from: 113.5, to: 114.42, edge: 0.22, rim: true, below: 2.4 }, { from: 114.62, to: 115.48, edge: 0.24, depth: 18, fallX: 30 }, { from: 115.78, to: 116.5, edge: 0.22, rim: true, below: 2.4 }],   // the cliffs and the gorge under the gap
      halo: [100.9, 104.2],
      birds: [{ t: 31.7, n: 34, side: -1, ahead: 3.0, x: 22 }],               // the thunder puts them up
      lyricPart: 'yahBoard', lyricX: 17, lyricS: 2.8,
      lyricBg: '#2a1a0e', lyricColor: '#ffe7a8', lyricCore: '#fff6dc',
      signs: [
        { key: 'PRIVATE', text: 'PRIVATE\nPROPERTY', color: '#fff4e6', core: '#ffffff', bg: '#7a1c18', size: 70 },
        { key: 'YAHCHI', text: 'CHICAGO', color: '#ffe7a8', core: '#fff6dc', bg: '#2a1a0e', size: 96, frame: 'rgba(0,0,0,0)' },
        { key: 'YAHTOP', text: 'SUMMIT', color: '#ffe7a8', core: '#fff6dc', bg: '#2a1a0e', size: 96, frame: 'rgba(0,0,0,0)' },
      ],
      zones: [
        // the set-pieces, each on its line (first, so the ground is levelled under them for everything else)
        { from: 0, to: 0.1, kits: ['yahSets'], at: [
          { t: -0.5, x: -12.5, kind: 'kiosk', s: 1.8, face: true, pad: 12 },                     // "you are here": the map at the start line
          { t: 23.6, x: 9.5, kind: 'finger', s: 1.8, rot: 0, pad: 6, lift: 2.5, beam: true, clr: 12 },     // "I bet he's in Chicago now"
          { t: 60.4, x: -11.5, kind: 'hammock', s: 2.6, rot: 0, pad: 11, lift: 1.0, beam: true, clr: 16 },  // "that I never got to hang out"
          { t: 91.2, x: 32, kind: 'church', s: 1.15, rot: 0.25, pad: 26, padY: -0.4 },           // "that building is a church, but I don't know"
          { t: 106.6, x: 27, kind: 'circle', s: 1.5, rot: 0, pad: 16, lift: 2.0 },               // "I told him he should start a cult"
          { t: 115.02, x: -14, kind: 'bridge', s: 1, rot: 0, ty: 114.42, dy: -0.3 },            // "it would be a full-time job": the bridge is out
          { t: 115.05, x: 0, kind: 'gorge', from: 114.62, to: 115.48 },                          // its walls, the brook
          { t: 121.0, x: -15, kind: 'erratic', s: 2.0, rot: 0.8, pad: 14, lift: 2.0, beam: true, clr: 20 },  // "the spot I recognize from when I first met him"
          { t: 130.6, x: 10, kind: 'bluff', s: 1.8, face: true, pad: 7, lift: 1.0, beam: true, clr: 16 },   // "I bluffed in the right direction"
          { t: 156.6, x: 11.5, kind: 'bench', s: 2.6, rot: -Math.PI / 2, pad: 9, lift: 0.6, beam: true },   // "he would rest where it was peaceful"
          { t: 192.6, x: -17, kind: 'cabin', s: 1.8, rot: -Math.PI / 2, pad: 15, lift: 1.6 },    // "I'd still be inside"
          { t: 214.6, x: 10.5, kind: 'rock', s: 2.6, rot: 0.6, pad: 8, lift: 2.4, clr: 20, hit: 214.46 },  // "that my leg hit the rock"
          { t: 228.4, x: 11, kind: 'spring', s: 2.6, rot: Math.PI / 2, pad: 8, lift: 0.6, beam: true, clr: 16 },   // "a bleeding man's water"
          { t: 273.4, x: -11, kind: 'cairn', s: 1.6, pad: 6, lift: 1.4 },                       // cairns on the ledges, showing the way to the top
          { t: 274.5, x: 11, kind: 'cairn', s: 1.6, pad: 6, lift: 1.4 },
          { t: 275.6, x: -11, kind: 'cairn', s: 1.6, pad: 6, lift: 1.4 },
          { t: 276.7, x: 11, kind: 'cairn', s: 1.6, pad: 6, lift: 1.4 },
          { t: 277.8, x: -11, kind: 'cairn', s: 1.6, pad: 6, lift: 1.4 },
          { t: 279.6, x: 10, kind: 'cairn', s: 2.2, big: true, pad: 6, lift: 1.0 },
          { t: 280.4, x: -26, kind: 'tower', s: 1.6, rot: 0.4, pad: 14, lift: 4 },               // the top: "he used to love this place"
          { t: 297.6, x: 9.5, kind: 'register', s: 3.0, rot: Math.PI / 2, pad: 6, lift: 0.8, clr: 12 },   // "if I could ever get a message"
          { t: 315.0, x: -21, kind: 'lot', pad: 24, lift: 0.4, clr: 26 },                         // home's lot, up on its bank over the street
        ] },
        { from: -6, to: 15.9, kits: ['yahLot'] },                                                  // the trailhead
        { from: 12.5, to: 85.4, kits: ['yahWoods'], mix: 'hardwood', walls: true, arrows: 1, clear: [[80.4, 84.6, 1]] },   // up through the woods; the wrong way opens on the right
        { from: 85.4, to: 98.1, kits: ['yahWoods'], mix: 'hardwood', density: 0.75, arrows: 0, priv: true, clear: [[88.4, 94.4, 1]] },   // the church: no arrows, private property
        { from: 98.1, to: 132.45, kits: ['yahWoods'], mix: 'mixed', arrows: 2.4, walls: true, clear: [[104.6, 108.2, 1]] },   // "remind me to take more of those arrows"
        { from: 132.45, to: 160, kits: ['yahWoods'], mix: 'pines', density: 0.85, arrows: 1, clear: [[154.4, 158.6, 1]] },   // golden; the bench looks out at the view
        { from: 160, to: 177.4, kits: ['yahOpen'], density: 0.6, flowers: 1 },                    // out on the ridge
        { from: 177.4, to: 209.7, kits: ['yahWoods'], mix: 'birch', density: 0.9, arrows: 1, clear: [[190.4, 193.8, -1]] },   // birches for the big chorus; the cabin's clearing
        { from: 209.7, to: 222, kits: ['yahWoods'], mix: 'mixed', density: 0.7, arrows: 0.5, walls: true },   // the rock
        { from: 222, to: 261.5, kits: ['yahWoods'], mix: 'pines', density: 0.85, arrows: 1 },     // sunset in the pines
        { from: 261.5, to: 282, kits: ['yahOpen'], density: 0.4, rocky: true },                    // out of the woods: the granite top
        { from: 282, to: 301, kits: ['yahOpen'], density: 0.8, flowers: 1.2 },                     // down the far side: the August meadow, lone trees
        { from: 299, to: 330, kits: ['yahStreet'], lampX: 9.6, skip: [[313.2, 317.2, -1]] },        // the sidewalk home
      ],
      roads: [
        { x: 0, width: 10, walk: 3, laneLines: 0, from: 299, to: 340, traffic: false, lampEvery: 18, dry: true },
      ],
      lyrics: [
        { t: 47.14, text: 'IF I MAKE IT TO\nTHE TOP TODAY', side: -1, frame: 'rgba(0,0,0,0)' },
        { t: 80.0, text: 'THE WRONG WAY IS\nOUT OF THE WOODS', side: -1, frame: 'rgba(0,0,0,0)' },
        { t: 129.02, text: 'I BLUFFED IN THE\nRIGHT DIRECTION', side: -1, frame: 'rgba(0,0,0,0)' },
        { t: 193.38, text: 'I WILL THINK LESS\nI WILL FEEL MORE', side: 1, lead: 1.6, s: 3.4, x: 19, frame: 'rgba(0,0,0,0)' },
        { t: 219.36, text: 'I KNOW THE\nWAY BACK NOW', side: -1, frame: 'rgba(0,0,0,0)' },
        { t: 241.3, text: "I SWEAR IT'S NOT JUST\nA LACK OF BLOOD", side: 1, frame: 'rgba(0,0,0,0)' },
        { t: 279.78, text: 'HE USED TO\nLOVE THIS PLACE', side: 1, lead: 1.4, s: 3.2, frame: 'rgba(0,0,0,0)' },
        { t: 283.26, text: 'NO, HE LOVES\nTHIS PLACE', side: -1, lead: 1.4, s: 3.2, frame: 'rgba(0,0,0,0)' },
        { t: 292.46, text: "I'D ASK HIM WHY\nHE LOVED THESE HILLS", side: 1, frame: 'rgba(0,0,0,0)' },
        { t: 305.68, text: 'GETTING CLOSE\nTO HOME', side: 1, frame: 'rgba(0,0,0,0)' },
      ],
      finale: { kind: 'home', t: 315.0, x: -21, fireAt: 304.0, orbit: { r: 22, h: 3.5, y: 3.2, facing: true, back: 1.4, right: 0.3, heroPan: 0.17, heroBack: 7.6, heroSide: 2.2 } },   // the whole house beside the card
    },
  },
  {
    // a mill town, one night to morning (src/foundry.js). The song is told from inside the man who
    // did it; none of that is shown. The works carry the sound, and the story is only in the world
    // round it: the bar at the gate, her walk home lit lamp by lamp, the church going dark on "He
    // left you here with me". Then the works at full blast: the pour over the casting pit on the drop,
    // sparks on every beat, the stacks breathing fire, the white-hot ingot coming up slow; the quench
    // cloud, the hammer, the rolling mill. A memorial at the fence on "She was only 23", posters on
    // every pole; the cooling yard going cold; everything stopping dead on "Her silence". The
    // converter blowing, the cast over a river of iron, and the blast furnace at dawn.
    id: 'until-she-stopped-fighting',
    accent: '#ff7a2a',
    title: 'Until She Stopped Fighting',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // out of silence: the road in
      { t: 10.11, kind: 'verse', c: 0.85, endY: 12 },                                           // the band in: the town at the gate
      { t: 26.60, kind: 'verse', c: 0.9, endY: 12 },
      { t: 37.58, kind: 'break', endY: 14 },                                                    // a breath
      { t: 39.41, kind: 'verse', c: 0.95, endY: 12 },                                           // through the gate: the whistles
      { t: 46.72, kind: 'pre', endY: 22 },                                                      // the ladle goes up
      { t: 48.54, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10, c: 1.2, gap: true },   // the pour: over the casting pit
      { t: 70.40, kind: 'break', endY: 16 },                                                    // the quench tower lets go
      { t: 72.22, kind: 'pre', endY: 22 },
      { t: 74.04, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the hammer
      { t: 79.46, kind: 'break', endY: 14 },
      { t: 81.30, kind: 'verse', c: 1.0, endY: 11 },                                            // the rolling mill
      { t: 110.25, kind: 'bridge', endY: 13 },                                                  // the memorial, the cooling yard
      { t: 124.56, kind: 'pre', endY: 22 },
      { t: 128.14, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10, c: 1.2 },   // the converter blows
      { t: 149.67, kind: 'break', endY: 18 },                                                   // quiet
      { t: 151.47, kind: 'pre', endY: 22 },
      { t: 153.26, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10, c: 1.3, gap: true },   // the cast: over the iron
      { t: 176.51, kind: 'outro', endY: 5 },                                                    // the glow going, morning
    ],
    rails: [
      { t: 39.41, bars: 2, x: 0 },        // through the gate, the whistles going
      { t: 99.41, bars: 2, x: 0 },        // down the rolling mill
      { t: 164.01, bars: 2, x: 0 },       // the cast, full volume, no words
    ],
    palette: 'swNight',
    world: 'foundry',
    collect: 'ember',
    titleView: { ahead: -0.3, x: 3.6, h: 3.4, back: -0.9, lookH: 1.6 },   // behind her: the gate, the town's lights and the works up the road
    lift: { flash: 0xffb060, fog: 0.4 },
    looks: [
      { t: -99, palette: 'swNight' },
      { t: 15.6, palette: 'usfTown', fade: 3.0 },                                               // the town at the gate
      { t: 36.9, palette: 'usfTown', fade: 1.8, set: { windowK: 0.75, skyGlow: 0x2a1410, lamp: 0xb86a30, skyLight: 0x4a4a62 } },   // "He left you here with me"
      { t: 40.2, palette: 'swNight', fade: 0.8, set: { skyGlow: 0x8a3a1a, fog: 0x1a0e0a, horizon: 0x2a1410 } },   // through the gate
      { t: 48.54, palette: 'swPour', fade: 0.3 },
      { t: 66.8, palette: 'usfFalseDawn', fade: 3.4 },                                          // "till the sun came up slow"
      { t: 70.40, palette: 'swSteam', fade: 0.4 },
      { t: 74.04, palette: 'swPour', fade: 0.3 },
      { t: 81.30, palette: 'swMill', fade: 0.6 },
      { t: 111.0, palette: 'swCool', fade: 3.2 },                                               // "She was only 23"; the cooling yard
      { t: 120.2, palette: 'usfSilence', fade: 0.45 },                                          // "Her silence"
      { t: 126.0, palette: 'swNight', fade: 1.4, set: { skyGlow: 0x8a3a1a, fog: 0x1a0e0a, horizon: 0x2a1410 } },
      { t: 128.14, palette: 'swBlow', fade: 0.3 },
      { t: 146.1, palette: 'usfFalseDawn', fade: 2.8 },                                         // "till the sun came up slow"
      { t: 149.67, palette: 'swSteam', fade: 0.4 },
      { t: 153.26, palette: 'swCast', fade: 0.3 },                                              // the cast
      { t: 181.0, palette: 'swDawn', fade: 5.0 },                                               // morning
    ],
    moments: [
      { t: 48.54, kind: 'flash', k: 0.3 },
      ...[74.04, 74.94, 75.86, 76.76, 77.67, 78.57].map((t, i) => ({ t, kind: 'knock', n: 1, k: i % 2 ? 0.6 : 0.85 })),   // the hammer
      { t: 107.82, kind: 'bell', k: 0.5, degree: 0 },        // "She was only 23": a bell, far off
      { t: 109.62, kind: 'bell', k: 0.38, degree: 0 },
      { t: 128.14, kind: 'flash', k: 0.4 },
      { t: 149.67, kind: 'blackout', dur: 3.4, k: 0.55 },   // two bars of quiet
      { t: 153.26, kind: 'flash', k: 0.5 },
    ],
    scenery: {
      signs: [
        { key: 'USFBAR', text: 'BAR', color: '#ff3a2a', core: '#ffe0d8', size: 118 },
        { key: 'USFMISSING', text: 'MISSING', color: '#141210', core: '#141210', bg: '#a8a49c', size: 112, frame: 'rgba(0,0,0,0)' },
      ],
      usf: {
        hills: [{ from: 14, to: 41, side: -1, x0: 34, w: 100, rise: 30 }, { from: 178, to: 198, side: -1, x0: 120, w: 150, rise: 42 }],   // the town up its hill; the town past the furnace
        pits: [{ from: 48.5, to: 49.75, w: 17, depth: 8 }],                     // the casting pit under the first jump
        heaps: [{ from: 111, to: 125, x: 70, spread: 70, n: 9 }],                // slag heaps round the cooling yard
        freeze: [119.74, 124.56],                                                 // "Her silence": everything stands still
        frost: [110.25, 124.56],
      },
      zones: [
        // the road in: the works across the dark, the doors coming on with the band
        { from: -6, to: 15.6, kits: ['usfYard'], x: 60, on: 10.11 },
        { from: -4, to: 15, kits: ['usfSidings'], kind: 'hopper', x: 30 },
        { from: -6, to: 15.6, kits: ['usfLamps'], every: 0.6, x: 19 },
        { from: -6, to: 48.5, kits: ['usfFlares'], every: 3.2, x: 110 },
        { kits: ['usfConveyors'], at: [7.4, 31.2] },
        { from: 12.4, to: 12.5, kits: ['usfCranes'] },
        // the town at the gate on the left, up its hill; the mill fence on the right
        { from: 14, to: 40, kits: ['usfTown'], side: -1, clear: [[37.6, 41.2]] },
        { from: 15.6, to: 39.4, kits: ['usfYard'], sides: [1], x: 48, hush: 37.58, pipes: false },
        { from: 14, to: 39.4, kits: ['usfLamps'], every: 0.5, x: 19 },
        { kits: ['usfLamps'], at: [[18.7, -40, 17.91], [19.1, -50, 18.36], [19.5, -60, 18.81], [19.9, -70, 19.26], [20.3, -80, 19.72], [20.7, -90, 20.18], [21.1, -100, 20.65]] },   // her walk home, lamp by lamp
        { from: 15.6, to: 37.5, kits: ['usfGrinders'], every: 1.83, side: 1, x: 26, on: 15.61 },
        // through the gate into the works: the whistles on "every scream", the doors thrown open
        { from: 40.8, to: 48.6, kits: ['usfYard'], x: 34, open: 42.02, whistle: [42.02, 45.1], pipes: false },
        { from: 39.4, to: 46.7, kits: ['usfGrinders'], every: 0.9, x: 22 },
        { from: 41.4, to: 46.0, kits: ['usfCranes'], every: 3.5 },
        // the pouring floor
        { from: 49.8, to: 70.4, kits: ['usfYard'], x: 74, pipes: false },
        { from: 49.0, to: 70.4, kits: ['usfGrinders'], every: 0.7, x: 22, k: 1.3 },
        { from: 48.5, to: 80, kits: ['usfFlares'], every: 2.2, x: 70 },
        { from: 50.2, to: 69, kits: ['usfCranes'], every: 3.6 },
        // the quench, the forge
        { from: 70.4, to: 81.3, kits: ['usfYard'], x: 66, pipes: false },
        { from: 74.0, to: 79.4, kits: ['usfGrinders'], every: 0.6, x: 22, k: 1.5 },
        // the rolling mill
        { from: 81.3, to: 107.0, kits: ['usfYard'], x: 72, pipes: false },
        { from: 81.3, to: 106.5, kits: ['usfMill'], every: 0.9, x: 34 },
        { kits: ['usfReheat'], at: [[83.6, 54], [88.2, -54], [95.4, 54], [101.0, -54]] },
        { from: 82.4, to: 106, kits: ['usfCranes'], every: 4.4 },
        { kits: ['usfConveyors'], at: [86.4, 97.2] },
        { from: 81.3, to: 107, kits: ['usfFlares'], every: 3.0, x: 110 },
        // the fence, the posters, the memorial; the cooling yard going cold, and still
        { from: 104.6, to: 118.2, kits: ['usfPosters'], every: 0.45, x: 21, clear: [[110.0, 111.7, -1], [112.0, 113.5, 1]] },
        { from: 107, to: 126, kits: ['usfYard'], x: 64, pipes: false, on: 1e9 },
        { from: 112.6, to: 124.5, kits: ['usfIngots'], every: 1.5, x: 30, cool: 110.3, coolFor: 4.3 },
        { from: 111, to: 124, kits: ['usfSidings'], kind: 'hopper', x: 42, every: 0.34 },
        { from: 118.0, to: 124.5, kits: ['usfGrinders'], every: 0.9, x: 22, k: 0.9, on: 117.9 },
        // the steel shop: the converters, the slag
        { from: 124.6, to: 149.7, kits: ['usfYard'], x: 64, on: 124.56, pipes: false },
        { from: 128.1, to: 149.6, kits: ['usfGrinders'], every: 0.7, x: 22, k: 1.3 },
        { from: 124.6, to: 176.5, kits: ['usfFlares'], every: 2.2, x: 70 },
        { from: 129.4, to: 148, kits: ['usfCranes'], every: 3.6 },
        // the cast: the furnace beside the road, the iron under it, rivers of it both sides
        { from: 155, to: 168, kits: ['usfYard'], sides: [1], x: 66, dim: 176.5, pipes: false },
        { from: 168, to: 176.5, kits: ['usfYard'], x: 66, dim: 176.5, pipes: false },
        { from: 155.0, to: 178, kits: ['usfRunners'], every: 0.75, x: 26, on: 153.26, wave: 0.05, off: 176.5 },
        { from: 157, to: 176, kits: ['usfSidings'], kind: 'torpedo', x: 44, every: 0.5 },
        { from: 155.0, to: 176.5, kits: ['usfGrinders'], every: 0.75, x: 34, y: 14, k: 1.6 },
        // morning: the street past the furnace, the town on its hill
        { from: 176.5, to: 196, kits: ['usfLamps'], every: 0.55, x: 19, dim: 0.6 },
        { from: 178, to: 198, kits: ['usfTown'], side: -1, xOff: 110, wake: 0.55 },
        { from: 183.5, to: 191, kits: ['usfSidings'], kind: 'torpedo', sides: [-1], x: 33, every: 0.55 },   // hot-metal cars waiting by the furnace
        { from: 0, to: 0.1, kits: ['usfSets'], at: [
          { t: 18.4, x: -30, kind: 'bar', on: 16.78, sign: 'USFBAR' },                                       // "I watched her walk home from the bar"
          { t: 39.4, x: -48, kind: 'church', dark: 35.08, darkFor: 1.86, s: 1.6 },                            // "she begged for God ... He left you here with me"
          { t: 39.6, x: 0, kind: 'gate', face: 'road' },                                                      // the mill gate
          { t: 49.6, x: 34, kind: 'castpit', face: 'road', s: 1.0, lift: 46.72, go: 48.1, stop: 51.0, pitX: 30 },   // the pour into the pit under the first jump
          { t: 52.3, x: -32, kind: 'pour', s: 1.2, lift: 49.2, go: 50.9, stop: 60.0 },
          { t: 56.0, x: 32, kind: 'pour', s: 1.2, lift: 52.6, go: 54.6, stop: 63.0 },
          { t: 59.7, x: -32, kind: 'pour', s: 1.2, lift: 56.3, go: 58.4, stop: 66.0 },
          { t: 67.6, x: 24, kind: 'soak', s: 1.3, open: 63.36, rise: 63.5, dur: 3.0 },                         // "till the sun came up slow"
          { t: 74.5, x: -36, kind: 'quench', s: 0.95, go: 70.4 },                                             // the break: the quench tower lets go
          { t: 75.8, x: 31, kind: 'hammer', s: 1.2, hits: [74.04, 74.94, 75.86, 76.76, 77.67, 78.57] },        // the hammer on the riff
          { t: 77.6, x: -31, kind: 'hammer', s: 1.2, hits: [74.04, 74.94, 75.86, 76.76, 77.67, 78.57] },
          { t: 92.0, x: -44, kind: 'coil', s: 1.3 },
          { t: 104.0, x: 44, kind: 'coil', s: 1.3 },
          { t: 110.8, x: -22, kind: 'memorial', s: 1.5 },                                                      // "She was only 23"
          { t: 131.4, x: 30, kind: 'converter', s: 1.0, tilt: 124.56, blow: 128.14, end: 149.6 },              // the blow on the drop
          { t: 137.8, x: -30, kind: 'converter', s: 1.0, tilt: 129.0, blow: 133.04, end: 149.6 },
          { t: 141.0, x: 36, kind: 'slag', s: 1.4, go: 139.18 },
          { t: 147.2, x: -24, kind: 'soak', s: 1.3, open: 143.3, rise: 143.4, dur: 2.9 },                       // "till the sun came up slow"
          { t: 162.0, x: -80, kind: 'furnace2', s: 1.0, face: 'side' },                                        // the furnace beside the road
          { t: 154.25, x: 0, kind: 'tap', face: 'road', go: 152.4, off: 176.5, src: 75 },                       // the iron under the road where it breaks
        ] },
      ],
      lyricPart: 'usfWallBoard',
      lyrics: [
        { t: 16.78, text: 'I WATCHED HER\nWALK HOME', side: 1, x: 30, lead: 1.5, bg: '#3a1a14', color: '#d8c8a8', core: '#efe4cc', frame: 'rgba(0,0,0,0)' },
        { t: 19.3, text: 'FROM THE BAR\nEVERY SINGLE NIGHT', side: -1, x: 30, lead: 1.5, bg: '#3a1a14', color: '#d8c8a8', core: '#efe4cc', frame: 'rgba(0,0,0,0)' },
        { t: 107.82, text: 'SHE WAS\nONLY 23', side: -1, x: 22, lead: 2.98, part: 'usfSheetBoard', bg: '#a8a49c', color: '#1a1418', core: '#1a1418', frame: 'rgba(0,0,0,0)' },
        { t: 109.62, text: 'HAD HER WHOLE\nLIFE AHEAD', side: 1, x: 22, lead: 3.1, part: 'usfSheetBoard', bg: '#a8a49c', color: '#1a1418', core: '#1a1418', frame: 'rgba(0,0,0,0)' },
        { t: 119.74, text: 'HER SILENCE IS\nTHE PUREST THING', side: -1, x: 27, lead: 1.5, part: 'usfPlateBoard', bg: '#0c1018', color: '#cfe0ff', core: '#ffffff', frame: 'rgba(160,200,255,0.9)' },
        { t: 122.0, text: "I'VE EVER HEARD\nIN MY LIFE", side: 1, x: 27, lead: 1.5, part: 'usfPlateBoard', bg: '#0c1018', color: '#cfe0ff', core: '#ffffff', frame: 'rgba(160,200,255,0.9)' },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'furnace', t: 188.5, x: -108, s: 1.15, rot: -1.57, fireAt: 178.3, orbit: { r: 220, h: 20, y: 30, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroBack: 13, heroSide: 1.3, heroUp: 2.3, heroFov: 42, heroTilt: 6, heroPan: 0.2 } },   // her arms up on the road, the furnace at dawn past her
    },
  },
  {
    // dusk on the street with the hearse at the curb; in through the funeral home's front door,
    // the casket open and full of lilies, the bar open beside it. Out the back into the
    // cemetery for every chorus; the eulogy, the prep room, the guest book; the cemetery chapel
    // at 3 a.m.; dawn over the graves; and the same chapel in white for the wedding.
    id: 'makeup-sex-at-your-funeral',
    accent: '#ff2a48',
    title: 'Makeup Sex at Your Funeral',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 10 },                                        // "wore your brother's suit"
      { t: 11.56, kind: 'verse', c: 0.8, endY: 12 },                              // "your mother's Xanax"
      { t: 22.00, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },   // "open casket, open bar": in the front door
      { t: 31.13, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 14 },   // the band's back: "b-b-best selfie"
      { t: 42.85, kind: 'pre', endY: 30 },                                        // "everyone's crying while I'm applying more mascara"
      { t: 54.58, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10 }, // out the back into the cemetery
      { t: 78.05, kind: 'break', endY: 12 },
      { t: 80.65, kind: 'verse', start: 'launch', launchBeats: 4, kick: 7, endY: 12 },   // "gave the eulogy"
      { t: 92.38, kind: 'verse', c: 1.0, endY: 14 },                              // "mom caught us in the prep room"
      { t: 102.82, kind: 'pre', endY: 32 },                                       // "signed the guest book"
      { t: 114.55, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 10 }, // out the front: the procession
      { t: 138.05, kind: 'post', endY: 16 },
      { t: 147.19, kind: 'bridge', endY: 18 },                                    // "found me in your casket at 3 a.m."
      { t: 158.93, kind: 'pre', endY: 36 },
      { t: 166.78, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10, gap: true },  // out into the dawn, over the graves
      { t: 190.32, kind: 'final', c: 1.3, endY: 12 },
      { t: 199.47, kind: 'outro', start: 'launch', launchBeats: 4, kick: 6, endY: 5 },    // "wore your ashes in a locket to my wedding"
    ],
    palette: 'fhdusk',
    world: 'funeral',
    collect: 'lily',
    titleView: { ahead: -0.17, x: 1.0, h: 2.6, back: -0.8, lookH: 2.4 },   // behind her: the hearse at the curb ahead
    looks: [
      { t: -99, palette: 'fhdusk' },
      { t: 22.0, palette: 'fhwake', fade: 0.4 },          // in the front door
      { t: 31.1, palette: 'fhparlor', fade: 0.6 },
      { t: 54.6, palette: 'fhgraves', fade: 0.5 },        // out the back into the cemetery
      { t: 80.7, palette: 'fhwake', fade: 0.4 },          // back in for the eulogy
      { t: 92.4, palette: 'fhprep', fade: 0.3 },          // "mom caught us in the prep room"
      { t: 97.6, palette: 'fhparlor', fade: 0.4 },
      { t: 114.6, palette: 'fhgraves', fade: 0.5 },       // the procession
      { t: 147.2, palette: 'fh3am', fade: 0.5 },          // "found me in your casket at 3 a.m."
      { t: 166.8, palette: 'fhdawn', fade: 1.2 },         // out into the dawn
      { t: 190.3, palette: 'fhsunrise', fade: 9 },
      { t: 199.5, palette: 'fhwedding', fade: 0.5 },      // the same chapel, in white
    ],
    moments: [
      { t: 33.3, kind: 'shutter', k: 0.75 },              // "selfie with your body"
      { t: 98.0, kind: 'knock', n: 1, k: 0.8 },           // "closed the door"
      { t: 148.0, kind: 'flash', k: 0.22 },               // the torch finds her
      { t: 199.6, kind: 'bell', k: 0.8, degree: 0 },
      { t: 202.2, kind: 'bell', k: 0.65, degree: 2 },
      { t: 204.8, kind: 'bell', k: 0.55, degree: 0 },
    ],
    // rose petals: a cloud of them as each chorus goes out into the cemetery, falling all
    // through it, and again in the white chapel
    confetti: [[54.6, 78.0], [114.6, 138.0], [166.8, 190.3], [199.6, 236]],
    rails: [
      { t: 83.25, bars: 2, x: 0 },        // "high on your percocet": down the aisle at the eulogy
      { t: 139.35, bars: 4, x: 0 },       // the procession's long instrumental, through the stones
    ],
    confettiColors: [0xf04a6a, 0xff8aa4, 0xd8203a, 0xffb8c8, 0xc8102e, 0xff6a88],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'FHBOARD', text: 'OPEN CASKET\nOPEN BAR', color: '#141014', core: '#141014', bg: '#f4f0ea', size: 70 },
        { key: 'HEAVEN', text: 'HEAVEN', color: '#1a1a1e', core: '#1a1a1e', bg: '#ffffff', size: 92 },
        { key: 'LIKES', text: '\u2665 3,000', color: '#ff2a4a', core: '#ff2a4a', bg: '#ffffff', size: 104 },
        { key: 'BELOVED', text: 'BELOVED', color: '#26262c', core: '#34343a', bg: '#8a868e', size: 84 },
      ],
      rooms: [
        { style: 'chapel', from: 22.00, to: 31.13, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },     // "open casket, open bar"
        { style: 'parlor', from: 31.13, to: 36.34, caps: [null, FHDOOR] },                                  // "best selfie with your body"
        { style: 'foyer', from: 36.34, to: 42.85, caps: [null, FHDOOR] },                                   // "three thousand likes"
        { style: 'hall', from: 42.85, to: 48.07, caps: [null, FHDOOR] },                                    // "make out with pallbearers"
        { style: 'parlor', from: 48.07, to: 54.58, caps: [null, { kind: 'wall', hw: 11.5, hh: 24 }] },      // "everyone's crying"; out the back
        { style: 'chapel', from: 80.65, to: 92.38, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },     // "gave the eulogy"
        { style: 'prep', from: 92.38, to: 97.60, caps: [null, { kind: 'wall', hw: 9, hh: 21 }] },            // "mom caught us in the prep room"
        { style: 'hall', from: 97.60, to: 102.82, caps: [null, FHDOOR] },                                   // "some girls aren't stable"
        { style: 'foyer', from: 102.82, to: 114.55, caps: [null, { kind: 'wall', hw: 12, hh: 28 }] },       // the guest book, the bouquet
        { style: 'night', from: 147.19, to: 158.93, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },    // 3 a.m.
        { style: 'night', from: 158.93, to: 166.78, caps: [null, { kind: 'wall', hw: 12, hh: 26 }] },
        { style: 'wedding', from: 199.47, to: 240, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, null] },       // the wedding
      ],
      roomEvents: { torch: [147.4, 158.9] },
      zones: [
        // the street at dusk, the procession's cars at the curb, the letter board out front
        { from: -4, to: 21.6, kits: ['fhstreet'] },
        { from: 19.4, to: 19.5, kits: ['letterboard'], at: 19.4, x: 17, sign: 'FHBOARD', s: 1.7 },
        // the viewing: the casket open and full of lilies, the bar open by it, her lipstick
        { from: 22.4, to: 30.9, kits: ['pews'], every: 0.26, clear: [[22.5, 24.6, 1], [24.0, 25.9, -1], [25.8, 27.2, 1], [28.2, 30.0, 1]] },
        { from: 22.0, to: 31.0, kits: ['wreaths'], every: 0.9, x: 37 },
        { from: 23.5, to: 23.6, kits: ['casket'], at: 23.5, x: 24 },
        { from: 23.5, to: 23.6, kits: ['candles'], at: [22.9, 24.1], x: 15, sides: [1] },
        { from: 24.9, to: 25.0, kits: ['bar'], at: 24.9, x: -24 },
        { from: 29.1, to: 29.2, kits: ['lipstick'], at: 29.1, x: 24 },
        // the parlours: the pin dropped on heaven, the likes, the tissues and the mascara
        { from: 37.4, to: 37.5, kits: ['pin'], at: 37.4, sign: 'HEAVEN', lift: 6 },
        { from: 40.3, to: 40.4, kits: ['likes'], at: 40.3, x: 22, sign: 'LIKES' },
        { from: 49.6, to: 51.7, kits: ['tissues'], at: [[49.7, 23], [50.4, -24], [51.1, 24]], s: 2.4 },
        { from: 52.1, to: 52.2, kits: ['mascara'], at: 52.1, x: -21, s: 2.0 },
        // out the back: the cemetery, its gate on the slam, the name, the grave
        { from: 54.6, to: 80.6, kits: ['graves'], fence: true, clear: [[57.7, 59.3], [71.3, 72.7, 1], [73.9, 75.5, -1]] },
        { from: 58.5, to: 58.6, kits: ['fhgate'], at: 58.5 },
        { from: 72.0, to: 72.1, kits: ['bigStone'], at: 72.0, x: 22, sign: 'BELOVED' },
        { from: 74.7, to: 74.8, kits: ['grave'], at: 74.7, x: -22, s: 2.6 },
        // back in for the eulogy; the prep room; the guest book, the bouquet in the air
        { from: 80.9, to: 92.2, kits: ['pews'], every: 0.26, clear: [[82.4, 84.2, -1]] },
        { from: 80.7, to: 92.3, kits: ['wreaths'], every: 0.9, x: 37 },
        { from: 83.3, to: 83.4, kits: ['lectern'], at: 83.3, x: -21, s: 1.4 },
        { from: 94.6, to: 94.7, kits: ['prepTable'], at: 94.6, x: 21 },
        { from: 104.5, to: 104.6, kits: ['guestbook'], at: 104.5, x: 18, s: 1.8 },
        { from: 108.0, to: 108.1, kits: ['bouquet'], at: 108.0, t0: 106.9, t1: 108.0, s: 2.0, arc: 14 },
        // the procession: the gate on the slam, the hearse ahead through the stones
        { from: 114.6, to: 147.0, kits: ['graves'], fence: true, clear: [[116.4, 118.0]] },
        { from: 117.2, to: 117.3, kits: ['fhgate'], at: 117.2 },
        // 3 a.m. in the cemetery chapel: the casket on its stand, the candles
        { from: 147.4, to: 166.6, kits: ['pews'], every: 0.26, clear: [[148.4, 150.5, 1], [153.2, 154.6, -1], [159.8, 166, 1], [159.8, 166, -1]] },
        { from: 149.4, to: 149.5, kits: ['casket'], at: 149.4, x: 24 },
        { from: 149.4, to: 149.5, kits: ['candles'], at: [148.8, 150.0], x: 15, sides: [1], lit: 0.7 },
        { from: 160.0, to: 166.0, kits: ['candles'], at: [160.2, 161.5, 162.8, 164.1, 165.4], x: 22 },
        // dawn over the graves
        { from: 166.8, to: 199.4, kits: ['graves'] },
        // the wedding: white pews, the locket over the aisle, candles to the altar
        { from: 199.8, to: 216.5, kits: ['pews'], every: 0.26, white: true, clear: [[205.0, 205.8], [207.0, 207.8], [209.0, 209.8], [211.0, 211.8], [214.4, 217, -1]] },
        { from: 202.7, to: 202.8, kits: ['locket'], at: 202.7, lift: 4 },
        { from: 205.0, to: 213.0, kits: ['candles'], at: [205.4, 207.4, 209.4, 211.4], x: 22 },
      ],
      roads: [
        { x: 0, width: 12, walk: 3, laneLines: 1, from: -10, to: 21.6, lanes: [-3, 3], density: 0.12, lampEvery: 40, follow: true },
      ],
      vehicles: [
        { kind: 'hearse', at: 1.25, rate: 0, x: 1, lane: 2.0, from: -6, to: 5 },                                                   // at the curb
        { kind: 'hearse', lead: [[114.6, 2.2], [116.0, 0.62], [133.5, 0.6], [137.0, 3.0]], x: 0.001, lane: 99, from: 114.7, to: 137.8 },   // the procession
      ],
      lyricBg: '#f2ece2', lyricColor: '#1a1418', lyricCore: '#1a1418', lyricPart: 'easel', lyricFloor: true, lyricX: 24,
      lyrics: [
        { t: 25.1, text: "I'M\nOVERDRESSED", side: 1, x: 31 },
        { t: 55.8, text: 'MAKEUP SEX AT\nYOUR FUNERAL', side: 1, x: 27, part: 'bigStone', bg: '#8a868e', color: '#1e1e22', core: '#2a2a30', s: 1.5 },
        { t: 73.0, text: 'DIRT UNDER\nMY NAILS', side: 1, x: 24, part: 'bigStone', bg: '#8a868e', color: '#1e1e22', core: '#2a2a30', s: 1.3 },
        { t: 99.6, text: "SOME GIRLS\nAREN'T STABLE", side: 1, x: 15, s: 0.9 },
        { t: 152.6, text: 'DISRESPECTING\nTHE DECEASED', side: -1, x: 30 },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'wedding', t: 215.6, x: -30, fireAt: 199.5, orbit: { r: 66, h: 6, y: 13, facing: true, back: 1.2, right: 0.3, swing: 0.2, heroPan: 0.15, heroBack: 7.4 } },   // the urn, the lily arch and the candles beside the card
    },
  },
  {
    // a library at night, where every scream is filed under a family name. The door under its Latin;
    // the stacks: the locked book, three generations of ledgers, the gramophone and its minor third,
    // the family tree splintering; the archive's drawers, the trace with its break; the scriptorium;
    // out into the storm: new tongues, the tower of Babel built of books, the manuscript, the letters
    // coming down, the stone in a language no one else will ever speak; and the reading room, where
    // the great book writes a new one.
    id: 'etymology-of-screams',
    accent: '#e8c070',
    title: 'ETYMOLOGY OF SCREAMS',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // "dolor habet linguam"
      { t: 9.29, kind: 'pre', endY: 18 },
      { t: 11.35, kind: 'verse', start: 'launch', launchBeats: 2, kick: 8, endY: 11 },          // "your larynx locks with legacy"
      { t: 25.83, kind: 'verse', c: 1.0, endY: 12 },                                            // "family tree splinters"
      { t: 29.99, kind: 'pre', endY: 20 },                                                      // the build
      { t: 34.12, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },        // "your scream has a surname"
      { t: 54.81, kind: 'break', endY: 16 },
      { t: 56.87, kind: 'verse', endY: 11 },                                                    // "envy or agony"
      { t: 67.36, kind: 'verse', c: 1.1, endY: 12 },                                            // "your throat is my manuscript"
      { t: 77.74, kind: 'pre', endY: 18 },                                                      // "your scream is untraceable"
      { t: 81.89, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10, gap: true },   // "no more patterns": over the hole
      { t: 98.43, kind: 'outro', endY: 7 },                                                     // "pain creates new language"
    ],
    rails: [
      { t: 69.47, bars: 2, x: 0 },        // "your throat is my manuscript, every sob a letter"
    ],
    palette: 'eyNight',
    world: 'library',
    collect: 'quill',
    titleView: { ahead: -0.16, x: 1.4, h: 2.2, back: -0.8, lookH: 5.0 },
    looks: [
      { t: -99, palette: 'eyNight' },
      { t: 11.6, palette: 'eyStacks', fade: 0.4 },          // the stacks
      { t: 26.0, palette: 'eyStacks', set: { fog: 0x140a04, skyLight: 0xff9a60, hemiK: 1.5 }, fade: 0.5 },   // the family tree
      { t: 34.3, palette: 'eyArchive', fade: 0.3 },         // the archive
      { t: 55.0, palette: 'eyScript', fade: 0.6 },          // the scriptorium
      { t: 63.4, palette: 'eyStorm', fade: 0.4 },           // out into the storm
      { t: 82.1, palette: 'eyStorm', set: { fog: 0x1a0a14, skyGlow: 0xff4a3a, horizon: 0x3a1420, glow: 0xff4a3a, hold: 0xff6a3a }, fade: 0.3 },   // "no more patterns"
      { t: 98.7, palette: 'eyReading', fade: 0.5 },         // the reading room
    ],
    moments: [
      { t: 0.3, kind: 'thunder', k: 0.6 },
      { t: 9.3, kind: 'thunder', k: 0.7 },
      { t: 11.6, kind: 'knock', n: 2, k: 0.4 },             // the chains on the locked book
      { t: 27.6, kind: 'knock', n: 1, k: 0.6 },             // "family tree splinters"
      { t: 30.0, kind: 'thunder', k: 0.8 },
      { t: 52.6, kind: 'thunder', k: 1.0 },                 // "tonight"
      { t: 63.2, kind: 'thunder', k: 0.8 },
      { t: 66.8, kind: 'thunder', k: 0.9 },                 // the tower
      { t: 81.9, kind: 'thunder', k: 1.0 },                 // "no more patterns"
      { t: 90.2, kind: 'thunder', k: 0.9 },
      { t: 94.3, kind: 'thunder', k: 0.8 },
      { t: 96.4, kind: 'thunder', k: 1.0 },
    ],
    scenery: {
      rooms: [
        { style: 'stacks', from: 11.35, to: 25.83, caps: [{ kind: 'front', hw: 13, hh: 34 }, LBDOOR] },    // in under the Latin: the stacks
        { style: 'stacks', from: 25.83, to: 34.12, caps: [null, LBDOOR] },                                 // the family tree
        { style: 'archive', from: 34.12, to: 44.46, caps: [null, LBDOOR] },                                // the archive
        { style: 'archive', from: 44.46, to: 54.81, caps: [null, LBDOOR] },
        { style: 'script', from: 54.81, to: 63.13, caps: [null, { kind: 'wall', hw: 14, hh: 30 }] },       // the scriptorium, out into the storm
        { style: 'reading', from: 98.43, to: 121, caps: [{ kind: 'front', hw: 13, hh: 34 }, null] },        // the reading room
      ],
      zones: [
        // the wet street to the door, gas lamps; the storm outside again later
        { from: -6, to: 11.2, kits: ['eyLamps'], every: 0.6, x: 20 },
        { from: 63.2, to: 98.3, kits: ['eyLamps'], every: 0.6, x: 20 },
        // drawers sliding out of the archive's walls
        { from: 34.4, to: 54.6, kits: ['eyDrawers'], every: 0.45, x: 31 },
        // things in the air
        { from: 0, to: 0.1, kits: ['eyAir'], at: [
          { t: 23.4, kind: 'staff', lift: 17 },             // "your mother in your minor third"
          { t: 39.6, kind: 'letters', go: 37.7, n: 40 },    // "every cry a confession you never chose"
          { t: 63.6, kind: 'swirl', go: 61.6, n: 60 },      // "new tongues"
          { t: 65.8, kind: 'swirl', go: 63.0, n: 60 },
          { t: 74.0, kind: 'fall', go: 72.4, n: 70 },       // "every sob a letter"
          { t: 92.0, kind: 'swirl', go: 90.2, n: 70 },
          { t: 96.0, kind: 'fall', go: 94.3, n: 70 },
        ] },
        // the set-pieces
        { from: 0, to: 0.1, kits: ['eyProps'], at: [
          { t: 12.8, x: -22, kind: 'lock', s: 1.1, rattle: 11.6, floor: true },      // "your larynx locks with legacy"
          { t: 15.8, x: 22, kind: 'ledgers', s: 1.4, floor: true },                  // "three generations"
          { t: 22.6, x: -22, kind: 'gramophone', s: 1.2, floor: true },              // "I hear your mother in your minor third"
          { t: 28.4, x: 24, kind: 'tree', s: 1.0, snap: 27.6, floor: true },         // "family tree splinters"
          { t: 42.6, x: -22, kind: 'recorder', s: 1.0, floor: true },                // "I trace your trauma by the break in your pitch"
          { t: 68.2, x: -80, kind: 'babel', s: 1.0, ahead: 46 },                     // "we build a babble"
          { t: 70.4, x: 26, kind: 'manuscript', s: 0.9 },                            // "your throat is my manuscript"
          { t: 80.4, x: -24, kind: 'recorder', s: 1.0, flat: true },                 // "your scream is untraceable"
          { t: 83.4, x: 28, kind: 'tree', s: 1.0, snap: 82.2 },                      // "no more patterns, no more fathers"
          { t: 86.6, x: -26, kind: 'stele', s: 1.0 },                                // "a language no one else will ever speak"
          { t: 97.2, x: 70, kind: 'babel', s: 1.1, ahead: 46 },
        ] },
      ],
      roads: [
        { x: 0, width: 16, walk: 4, laneLines: 0, from: -10, to: 11.4, traffic: false, lampEvery: 26, lampColor: 0xffb860 },
        { x: 0, width: 16, walk: 4, laneLines: 0, from: 63.1, to: 98.5, traffic: false, lampEvery: 26, lampColor: 0xffb860 },
      ],
      lyricPart: 'eySign', lyricX: 0, lyricBg: '#b8b0a0', lyricColor: '#2a221c', lyricCore: '#3a3028',
      lyrics: [
        { t: 0.0, text: 'DOLOR HABET\nLINGUAM', h: 15, lead: 4.0 },
        { t: 5.32, text: 'PAIN HAS\nA LANGUAGE', h: 15 },
        { t: 34.68, text: 'YOUR SCREAM\nHAS A SURNAME', h: 14, lead: 2.2 },
        { t: 84.54, text: 'A LANGUAGE NO ONE\nELSE WILL EVER SPEAK', h: 14 },
        { t: 105.02, text: 'PAIN CREATES\nNEW LANGUAGE', h: 15 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'book', t: 117.0, x: 0, write: 100.0, fireAt: 104.0, orbit: { r: 80, h: 16, y: 24, facing: true, back: 2, right: 0.3, swing: 0.15, heroPan: 0.4, heroFov: 58, heroBack: 8.5, heroSide: 0.1, heroUp: 1.6 } },   // the giant book beside the card, her under it
    },
  },
  {
    // she moved into his head back in May: the house he built in there to keep her out, her in
    // every window as you come up the path. Her portrait hung where his peace of mind used to; the
    // dust sheets come off and waltz as ghosts in every chorus; knock, knock; 3 a.m. and the floor
    // gives way; the lock she picked; the flashbacks; welcome home; through her in the mirror into
    // the ball; the light he leaves on; the keys; and his bed at the end. Sweet dreams, landlord.
    id: 'rent-free',
    accent: '#c86aff',
    title: 'Rent Free',
    startY: 10,
    collect: 'key',
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                             // "honey, I'm home"
      { t: 5.42, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 9, turn: 0.3 },     // "you can't stop thinking about me"
      { t: 10.70, kind: 'verse', endY: 10, turn: 0.3 },                                     // "I moved into your hippocampus back in May"
      { t: 20.00, kind: 'verse', c: 1.0, endY: 12, turn: 0.3 },                             // "home, my portrait where your peace of mind used to hang"
      { t: 30.62, kind: 'verse', endY: 11, turn: 0.3 },                                     // "every room was mine"
      { t: 41.22, kind: 'pre', endY: 17, turn: 0.3 },                                       // "you can't evict what you invited in"
      { t: 61.13, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 9, turn: 0.3 },    // "I'm living rent free"
      { t: 86.30, kind: 'post', endY: 11, turn: 0.3 },                                      // "knock, knock, who's there?"
      { t: 88.95, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 11, turn: 0.3 },    // "it's me everywhere"
      { t: 91.60, kind: 'break', start: 'launch', launchBeats: 2, kick: 7, endY: 11, turn: 0.3 },    // "check under the stairs" (a short float: a long one bottomed out and landed hard)
      { t: 95.58, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                             // "your new girl says you wake up screaming"
      { t: 104.87, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.3, gap: true },   // "of your subconscious, darling": the floor gives way
      { t: 118.12, kind: 'break', rb: 8, endY: 14, turn: 0.3 },                             // "I picked the lock before you even drew the blueprint"
      { t: 130.06, kind: 'chorus', endY: 9, turn: 0.3 },                                    // "I made myself eternal"
      { t: 153.93, kind: 'post', endY: 12, turn: 0.3 },                                     // "every flashback"
      { t: 161.89, kind: 'chorus', endY: 10, turn: 0.3 },
      { t: 176.48, kind: 'verse', c: 0.9, endY: 14, turn: 0.3 },                            // "it's crowded in here with all my things"
      { t: 187.09, kind: 'post', endY: 12, turn: 0.3 },                                     // "never truly alone"
      { t: 196.36, kind: 'bridge', endY: 20, turn: 0.3 },                                   // "I'm the hesitation in your breath"
      { t: 217.58, kind: 'final', start: 'launch', launchBeats: 4, kick: 11, turn: 0.3, gap: true },  // "I am home": through the mirror, over the hole
      { t: 250.74, kind: 'break', rb: 8, endY: 12, turn: 0.3 },                             // "and the sickest part, the beautiful part"
      { t: 254.72, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.3 },  // "you still leave the light on"
      { t: 264.01, kind: 'bridge', endY: 12, turn: 0.3 },                                   // "oh, this is nice, I could stay here forever"
      { t: 271.96, kind: 'chorus', endY: 10, turn: 0.3 },                                   // "you never change the locks"
      { t: 293.21, kind: 'final', start: 'launch', launchBeats: 4, kick: 9, endY: 6, turn: 0.3 },   // "sweet dreams, landlord"
      { t: 303.83, kind: 'outro', turn: 0.3 },
    ],
    palette: 'mansion',
    world: 'house',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 4.0 },   // behind her, the front door ahead
    looks: [
      { t: -99, palette: 'mansion' },
      { t: 5.42, palette: 'rntBall', fade: 0.3 },            // "you can't stop thinking about me"
      { t: 10.7, palette: 'mansion', fade: 1.2 },
      { t: 61.13, palette: 'rntBall', fade: 0.3 },           // "I'm living rent free"
      { t: 86.3, palette: 'mansion', fade: 0.8 },
      { t: 95.58, palette: 'rnt3am', fade: 0.6 },            // 3 a.m.
      { t: 106.9, palette: 'rntCrawl', fade: 0.3 },          // "crawl space of your cortex"
      { t: 109.6, palette: 'attic', fade: 0.3 },             // "attic of your grief"
      { t: 112.2, palette: 'blueprint', fade: 0.3 },         // "you built a house inside your head to keep me out"
      { t: 120.0, palette: 'mansion', fade: 0.6 },
      { t: 130.06, palette: 'rntBall', fade: 0.4 },          // "I made myself eternal"
      { t: 141.2, palette: 'moldy', fade: 8 },               // "the mold behind the walls of memory"
      { t: 168.72, palette: 'rntParty', fade: 0.8 },         // "welcome home"
      { t: 176.48, palette: 'mansion', fade: 1.2 },
      { t: 196.36, palette: 'rntCandle', fade: 3 },          // "I'm the hesitation in your breath"
      { t: 217.58, palette: 'rntGrand', fade: 0.25 },        // "I am home"
      { t: 250.74, palette: 'rntLight', fade: 1.5 },         // "and the sickest part": one light left on
      { t: 264.01, palette: 'rntCosy', fade: 1.5 },          // "oh, this is nice"
      { t: 271.96, palette: 'rntBall', fade: 0.4 },          // the locks, the keys
      { t: 292.28, palette: 'rntBed', fade: 1.5 },           // "sweet dreams, landlord"
    ],
    moments: [
      { t: 1.42, kind: 'bell', k: 0.5, degree: 4 },          // the doorbell: "did you miss me?"
      { t: 1.75, kind: 'bell', k: 0.42, degree: 0 },
      { t: 60.79, kind: 'glass', k: 0.3 },                   // "oh wait, I finished it"
      { t: 87.29, kind: 'knock', k: 0.55 },                  // "knock, knock, who's there?"
      { t: 89.95, kind: 'knock', k: 0.6 },
      { t: 92.93, kind: 'knock', k: 0.65 },
      { t: 102.53, kind: 'bell', k: 0.45, degree: 0, n: 3, gap: 331 },   // 3 a.m.: the clock strikes three
      { t: 117.11, kind: 'pop', k: 0.6 },                    // "I picked the lock"
      { t: 154.93, kind: 'shutter', k: 0.42 },               // "every flashback"
      { t: 157.58, kind: 'shutter', k: 0.48 },
      { t: 160.9, kind: 'knock', n: 1, k: 0.5 },             // "every time you flinch"
      { t: 172.5, kind: 'pop', k: 0.45 },                    // welcome home
      { t: 174.16, kind: 'pop', k: 0.45 },
      { t: 175.81, kind: 'pop', k: 0.5 },
      { t: 217.91, kind: 'glass', k: 0.85 },                 // through the mirror
      { t: 277.6, kind: 'knock', n: 1, k: 0.4 },             // the locks
      { t: 280.92, kind: 'ring', k: 0.3 },                   // "you gave me keys"
      { t: 284.24, kind: 'ring', k: 0.3 },                   // "copies since we met"
      { t: 292.53, kind: 'bell', k: 0.4, degree: 0 },        // "sweet dreams, landlord"
      { t: 296.85, kind: 'bell', k: 0.36, degree: 2 },       // "this is home"
      { t: 299.5, kind: 'bell', k: 0.45, degree: 0 },        // "home"
    ],
    // the chorus here is the house coming alive (rnt-sets.js): every sheet off, the ghosts waltzing
    lift: { flash: '#ffd8a0' },
    rails: [
      { t: 16.02, bars: 2, x: -3.2 },     // "vaulted ceilings in your brain, crown molding on your spine"
      { t: 209.61, bars: 4, x: 0 },       // "I'm the reason you can't quite, can't quite, can't quite let go"
      { t: 278.6, bars: 2, x: 3.2 },      // "you didn't even know you gave me keys": the keys run down it
    ],
    // homecoming confetti, then the ball, then petals coming down on his bed
    confetti: [[171.5, 176.5], [217.9, 250.7], [292.5, 312]],
    confettiColors: [0xc0102a, 0xffd27a, 0xc86aff, 0xfff4e8, 0xe8508a],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'PEACE', text: 'PEACE OF MIND', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 60 },
        { key: 'ESTEEM', text: 'SELF-ESTEEM', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 64 },
        { key: 'JESUS', text: 'JESUS', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'MINE', text: 'MINE', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'HOME', text: 'HOME', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'THREEAM', text: '3:00', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 150 },
      ],
      rooms: [
        { style: 'foyer', from: 2.73, to: 10.70, caps: [{ kind: 'front', hw: 11, hh: 30 }, HDOOR] },      // "honey, I'm home": in at the front door
        { style: 'gallery', from: 10.70, to: 30.62, caps: [null, HDOOR] },                               // "vaulted ceilings in your brain, crown molding on your spine"
        { style: 'bedroom', from: 30.62, to: 33.27, caps: [null, HDOOR] },                               // "every room was mine, mine, mine"
        { style: 'foyer', from: 33.27, to: 35.92, caps: [null, HDOOR] },
        { style: 'gallery', from: 35.92, to: 38.57, caps: [null, HDOOR] },
        { style: 'bedroom', from: 38.57, to: 41.22, caps: [null, HDOOR] },
        { style: 'gallery', from: 41.22, to: 61.13, caps: [null, HDOOR] },                               // "can't exorcise the ghost that wears your skin"
        { style: 'ballroom', from: 61.13, to: 86.30, caps: [null, HDOOR] },                              // "I'm living rent free"
        { style: 'doors', from: 86.30, to: 88.95, caps: [null, HDOOR] },                                 // "knock, knock": the hall of doors
        { style: 'doors', from: 88.95, to: 91.60, caps: [null, HDOOR] },                                 // "it's me everywhere"
        { style: 'foyer', from: 91.60, to: 95.58, caps: [null, HDOOR] },                                 // "check under the stairs"
        { style: 'bedroom', from: 95.58, to: 106.9, caps: [null, { kind: 'wall', hw: 10, hh: 16 }] },    // "to rearrange the sheets"
        { style: 'crawl', from: 106.9, to: 109.6, caps: [null, { kind: 'wall', hw: 10, hh: 13 }] },      // "crawl space of your cortex"
        { style: 'attic', from: 109.6, to: 112.2, caps: [null, { kind: 'wall', hw: 10.5, hh: 20 }] },    // "attic of your grief"
        { style: 'blueprint', from: 112.2, to: 120.0, caps: [null, HDOOR] },                             // "before you even drew the blueprint"
        { style: 'gallery', from: 120.0, to: 141.2, caps: [null, HDOOR] },                               // "you thought you'd heal"
        { style: 'mold', from: 141.2, to: 151.28, caps: [null, HDOOR] },                                 // "the mold behind the walls of memory"
        { style: 'mold', from: 151.28, to: 161.89, caps: [null, HDOOR] },                                // "every flashback's got my fingerprints"
        { style: 'mold', from: 161.89, to: 168.72, caps: [null, HDOOR] },
        { style: 'foyer', from: 168.72, to: 171.46, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'foyer', from: 171.46, to: 174.14, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'foyer', from: 174.14, to: 176.48, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'bedroom', from: 176.48, to: 180.78, caps: [null, HDOOR] },                             // "it's crowded in here with all my things"
        { style: 'gallery', from: 180.78, to: 186.18, caps: [null, HDOOR] },                             // "my moods in every door"
        { style: 'foyer', from: 186.18, to: 191.46, caps: [null, HDOOR] },                               // "my name on every floor"
        { style: 'bedroom', from: 191.46, to: 196.36, caps: [null, HDOOR] },                             // "never truly alone"
        { style: 'dark', from: 196.36, to: 217.58, caps: [null, HDOOR] },                                // "I'm the hesitation in your breath"
        { style: 'ballroom', from: 217.58, to: 250.74, caps: [null, HDOOR] },                            // "I am home"
        { style: 'dark', from: 250.74, to: 264.01, caps: [null, HDOOR] },                                // "you still leave the light on"
        { style: 'foyer', from: 264.01, to: 277.0, caps: [null, HDOOR] },                                // "you never changed the locks"
        { style: 'gallery', from: 277.0, to: 292.28, caps: [null, HDOOR] },                              // "you didn't even know you gave me keys"
        { style: 'bedroom', from: 292.28, to: 330, dims: [64, 46] },                                     // "sweet dreams, landlord": his room, wide enough for the bed
      ],
      // mood: the doors in the gallery; shadow: hers on the wall beside you; hole: the floor under the first gap
      roomEvents: { mold: 148.6, prints: 156.6, mood: [180.9, 186.3], shadow: [188.8, 196.3], hole: 104.87 },
      // the sheets come up off her furniture on "exorcise"; it all goes up high on "furniture"
      rntHover: [[49.17, 61.13]],
      rntHigh: [[73.7, 77.4]],
      // her eyes catch the light in the dark rooms; the candles nearly go on "breath"
      rntEyes: [[196.4, 217.6], [250.8, 264.0]],
      rntBreath: [205.97],
      rntFinaleBoard: 11,
      zones: [
        // in at the front door: thrown open as she comes, her luggage in the hall; doors on the way
        { from: 0, to: 0.1, kits: ['rntDoors'], doors: [
          { t: 2.73, open: 1.42, swing: 0.55, hw: 11, hh: 30 },              // "honey, I'm home ... did you miss me?"
          { t: 61.13, open: 60.62, swing: 0.3 },                             // into the ballroom on the drop
          { t: 86.30, open: 85.64 },                                         // "welcome home"
          { t: 88.95, open: 88.36, knocks: [87.29, 87.5] },                  // "knock, knock, who's there?"
          { t: 91.60, open: 91.0, knocks: [89.95, 90.16] },
          { t: 95.58, open: 94.92, knocks: [92.93, 93.14] },                 // "I'm already inside"
          { t: 168.72, open: 168.2 },                                        // welcome home
          { t: 171.46, open: 170.86 },
          { t: 174.14, open: 173.5 },
        ] },
        { from: -4.0, to: 2.73, kits: ['rntFront'], at: 2.73, every: 0.55, x: 17 },                // the path up to the front door, the porch
        { from: 3.0, to: 3.1, kits: ['rntLuggage'], at: [[4.6, 27, 1.15], [7.6, -29, 1.05]] },  // her luggage in the hall
        { from: 3.4, to: 10.4, kits: ['rntFurniture'], every: 1.0, x: 18, spread: 20 },         // first chorus: the sheets come off in the hall
        // the gallery: her, all down both walls; the lease she never signed (her lips on the line);
        // then the three pictures he had up, coming down for hers
        { from: 10.7, to: 21.6, kits: ['portraits'], W: 40, every: 1.33, offset: 0.95 },
        { from: 15.9, to: 16.0, kits: ['rntLease'], at: 16.6, lift: 15 },                          // "didn't knock, didn't sign"
        { from: 22.0, to: 22.1, kits: ['rntSwap'], at: [23.65, 26.3, 28.95], swap: [22.33, 24.98, 27.63], v: [0, 2, 1], old: [0, 1, 2], plaques: ['PEACE', 'ESTEEM', 'JESUS'], s: 0.95 },   // "hung my portrait where your peace of mind used to hang"
        // every room hers: the plaques, and MINE in her lipstick on the walls
        { from: 30.6, to: 30.7, kits: ['portraits'], W: 50, at: [32.2, 34.9, 37.5, 40.1], sides: [1, -1, 1, -1], plaques: ['MINE', 'MINE', 'MINE', 'MINE'], v: 1 },
        { from: 30.6, to: 30.7, kits: ['rntMine'], at: [[32.4, -49.5, 20], [35.0, 45.5, 22], [37.8, -39.5, 18], [40.8, 49.5, 20], [41.9, -39.5, 22], [43.4, 39.5, 17]], s: 1.6 },
        // her furniture under dust sheets; "can't exorcise the ghost that wears your skin": up they come
        { from: 41.4, to: 60.0, kits: ['rntFurniture'], every: 1.25, x: 16, spread: 16 },
        { from: 41.2, to: 61.1, kits: ['portraits'], W: 40, every: 2.65, offset: 1.4 },
        { from: 54.0, to: 58.6, kits: ['rntThoughts'], every: 0.3, x: 18, spread: 14 },           // "squatter's rights to every single thought you think"
        { from: 60.6, to: 60.7, kits: ['rntCart'], at: 60.95, x: 25, s: 1.5 },                    // "so pour yourself a drink / oh wait, I finished it"
        // the ballroom: the ball
        { from: 62.0, to: 85.5, kits: ['rntFurniture'], every: 0.95, x: 22, spread: 36 },
        { from: 61.1, to: 86.3, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        // knock, knock: the hall of doors; "check under the stairs" (eyes); "I'm already inside"
        { from: 92.6, to: 92.7, kits: ['stairs'], at: 92.6 },
        { from: 93.0, to: 93.1, kits: ['rntEyes'], at: [[93.5, -32, 5], [93.9, 22, 10]], s: 1.2 },
        { from: 96.3, to: 96.4, kits: ['portraits'], hang: true, at: [96.6], v: 1, s: 1.0 },
        // 3 a.m.: the moon in the windows, the clock, the sheets turning over in the air above his bed
        { from: 96.0, to: 96.1, kits: ['rntWindows'], at: [[98.0, -49.6], [99.6, 49.6], [101.2, -49.6], [102.8, 49.6], [105.4, -49.6]] },
        { from: 103.2, to: 103.3, kits: ['nightstand'], at: 103.3, x: 30, clock: 'THREEAM', s: 2.0 },   // "stopping by at 3 a.m."
        { from: 104.6, to: 104.7, kits: ['bed'], at: 104.6, x: -30 },
        { from: 102.9, to: 104.9, kits: ['rntSheets'], at: 104.6, x: -30 },                        // "to rearrange the sheets of your subconscious"
        { from: 104.6, to: 104.7, kits: ['portraits'], W: 50, at: [104.6], sides: [-1], v: 3, s: 1.05, y: 10.5 },
        { from: 107.0, to: 109.5, kits: ['crates'], every: 0.45, x: 13, spread: 9 },               // "crawl space of your cortex"
        { from: 109.7, to: 112.1, kits: ['crates'], every: 0.5, x: 15, spread: 12 },               // "attic of your grief"
        // the blueprint: "you built a house inside your head to keep me out / but I was already here / I picked the lock"
        { from: 114.0, to: 114.1, kits: ['rntDollhouse'], at: 114.5, x: -27, s: 1.0, her: 114.78 },
        { from: 117.5, to: 117.6, kits: ['rntLock'], at: 117.95, pop: 117.11, lift: 11 },
        // "you thought you'd forget": forget-me-nots coming up everywhere she's been
        { from: 120.0, to: 141.2, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        { from: 124.4, to: 131.0, kits: ['rntForget'], every: 0.2, W: 40, grow: [124.09, 129.39], walls: 0.35 },
        // "I made myself eternal": her, in marble
        { from: 133.6, to: 133.7, kits: ['rntBust'], at: [[133.9, 27], [133.9, -27]], s: 1.45 },
        { from: 130.5, to: 141.0, kits: ['rntFurniture'], every: 1.3, x: 16, spread: 14 },
        { from: 136.4, to: 136.5, kits: ['journal'], at: 136.4, x: -23, rot: 1.9, s: 1.1 },
        { from: 141.2, to: 168.7, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        // "every flashback": photographs of the two of them coming down
        { from: 155.0, to: 160.6, kits: ['rntPolaroids'], n: 90, x: 30 },
        // welcome home, welcome home, welcome home
        { from: 168.7, to: 176.5, kits: ['portraits'], W: 46, at: [170.2, 172.9, 175.4], sides: [1, -1, 1], v: 0 },
        { from: 171.0, to: 171.1, kits: ['rntBanners'], at: [172.8, 175.1, 176.35], lift: 11, span: 44 },
        { from: 170.6, to: 177.0, kits: ['rntBalloons'], t0: 170.8, t1: 177.0, n: 70 },
        // crowded: her things, her furniture, her in every corner
        { from: 176.6, to: 196.2, kits: ['crates'], every: 0.42, x: 16, spread: 24 },
        { from: 177.0, to: 196.2, kits: ['rntFurniture'], every: 1.1, x: 20, spread: 20 },
        { from: 178.0, to: 178.1, kits: ['rntLuggage'], at: [[178.6, 30, 1.3], [179.4, -30, 1.5], [180.6, 26, 1.2], [181.8, -28, 1.4], [183.4, 31, 1.3], [185.2, -30, 1.4], [187.4, 29, 1.2], [189.8, -31, 1.3], [192.6, 30, 1.25], [195.0, -29, 1.3]] },   // "it's crowded in here with all my things"
        { from: 176.5, to: 196.3, kits: ['portraits'], W: 46, every: 1.33, offset: 0.5 },
        // the dark: candles, her eyes in every picture
        { from: 196.4, to: 217.5, kits: ['portraits'], W: 40, every: 1.33, offset: 0.7 },
        { from: 196.6, to: 217.2, kits: ['rntCandles'], every: 0.66, x: 21 },
        // "I am home": her in the mirror at the drop; then the ball
        { from: 217.9, to: 218.0, kits: ['rntMirror'], at: 217.95, v: 1 },
        { from: 217.6, to: 250.7, kits: ['rntFurniture'], every: 1.1, x: 24, spread: 36 },
        { from: 217.6, to: 250.7, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        { from: 235.0, to: 235.1, kits: ['rntFutures'], at: [[235.6, 34], [236.7, -34], [239.0, 34], [240.2, -34]], s: 1.4 },   // "every future you picture"
        // the dark again: the one light he leaves on; through a heart back to his
        { from: 251.0, to: 263.8, kits: ['rntCandles'], every: 1.3, x: 19 },
        { from: 259.9, to: 260.0, kits: ['rntLamp'], at: 260.0, x: -24, s: 2.0 },                  // "you still leave the light on"
        { from: 263.9, to: 264.0, kits: ['rntHeartDoor'], at: 264.01, lift: 20 },                  // "find my way back to your heart"
        // "oh, this is nice, I could stay here forever": the fire
        { from: 267.0, to: 267.1, kits: ['rntFireplace'], at: 268.6, x: 44, s: 1.5 },
        { from: 264.0, to: 292.2, kits: ['portraits'], W: 46, every: 2.65, offset: 1.2 },
        // the locks he never changed; the keys she's had since they met, on every wall, coming down
        { from: 277.9, to: 278.0, kits: ['locks'], at: 278.0, x: 13.4 },
        { from: 278.4, to: 286.0, kits: ['rntKeyWall'], W: 40 },
        { from: 281.0, to: 286.0, kits: ['rntKeyRain'], n: 150, x: 32 },
        // his bedroom: the last chorus, then the bed (the finale)
        { from: 293.5, to: 305.0, kits: ['rntFurniture'], every: 1.3, x: 20, spread: 18 },
        { from: 292.3, to: 306.0, kits: ['portraits'], W: 50, every: 1.33, offset: 0.6 },
        { from: 293.0, to: 293.1, kits: ['rntWindows'], at: [[296.0, 49.6], [299.0, -49.6], [302.0, 49.6]] },
        // the boards: his words, stitched; order is their place on the sheet (11 hangs on the bed at the end)
        { from: 44.0, to: 44.1, kits: ['rntBoards'], boards: [
          { text: "YOU CAN'T EVICT\nWHAT YOU INVITED IN", at: 45.6, hang: true },
          { text: "I'M LIVING\nRENT FREE", at: 63.3, hang: true },
          { text: "I'M THE TENANT AND\nTHE LANDLORD OF\nYOUR MISERY", at: 71.6, x: 30, turn: 0.62 },
          { text: "EVERY NIGHTMARE'S\nGOT MY FURNITURE", at: 75.4, x: -30, turn: 0.62 },
          { text: "AND I'M NEVER, NEVER,\nNEVER MOVING OUT", at: 82.7, hang: true },
          { text: "YOU THOUGHT YOU'D HEAL\nTHAT'S ADORABLE", at: 128.3, hang: true },
          { text: "EVERY TIME YOU FLINCH\nTHAT'S MY INFLUENCE", at: 162.2, x: 27, turn: 0.62 },
          { text: 'I AM HOME', at: 222.7, hang: true },
          { text: "EVERY FUTURE YOU PICTURE\nI'M ALREADY IN THE ROOM", at: 238.2, hang: true },
          { text: 'YOU STILL LEAVE\nTHE LIGHT ON', at: 260.5, x: 27, turn: 0.62 },
          { text: "ISN'T THAT\nROMANTIC?", at: 291.3, hang: true },
          { text: 'SWEET DREAMS,\nLANDLORD', at: 295.0, hang: true },
        ] },
      ],
      // his bed at the end, facing back at her: a long lens from behind her so it stands big, right of the card
      finale: { kind: 'portrait', t: 310.9, x: -33, fireAt: 292.3, orbit: { r: 54, h: 2, y: 22, facing: true, back: 1.2, right: 0.3, swing: 0.2, heroBack: 14, heroSide: 1.3, heroUp: 2.3, heroFov: 35, heroTilt: 3.6, heroPan: 0.27 } },
    },
  },
  {
    // a holiday at a grand hotel on the coast, all of it charged to him. Arriving at golden hour up
    // the drive under the palms; the minibar, the robe, the gold case, the bell, the ice and the
    // champagne; the pool party: the tray, the rosé, the shaker spraying glitter; the motorcade; the
    // lobby bar: the olive, the better car, the towels folded into swans; sunset at the pool; night:
    // the white boat, wet tile, the fruit on its silver cart, the art, the chandelier; three, two,
    // one and fireworks over the marina; the valet; the cash, the buffet, gold service; and at dawn
    // the white boat leaving: bon voyage.
    id: 'cunt-holiday',
    accent: '#ff8ab8',
    title: 'Cunt Holiday',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                        // "pool looks good today"
      { t: 16.38, kind: 'pre', endY: 20 },                                                        // the build
      { t: 18.24, kind: 'verse', start: 'launch', launchBeats: 3, kick: 9, endY: 11 },            // the drop
      { t: 31.31, kind: 'verse', c: 1.0, endY: 12 },                                              // "bellboy smirked", "ice in the bucket"
      { t: 38.75, kind: 'pre', endY: 20 },                                                        // "say it again"
      { t: 42.46, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },          // "it's a kind of holly, holly day"
      { t: 57.29, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 11 },           // rosé, the glitter
      { t: 72.05, kind: 'post', endY: 12 },                                                       // "mini, mini, mini"
      { t: 86.79, kind: 'verse', endY: 11, turn: 0.3 },                                           // the lobby bar
      { t: 101.47, kind: 'pre', endY: 20, turn: 0.3 },                                            // "say it again"
      { t: 105.12, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },
      { t: 119.79, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 11 },
      { t: 134.42, kind: 'post', endY: 12 },
      { t: 149.04, kind: 'bridge', endY: 9 },                                                     // "white boat, wet tile"
      { t: 154.51, kind: 'verse', c: 0.8, endY: 12 },                                             // "I came for the art"
      { t: 165.45, kind: 'bridge', endY: 14 },                                                    // "the chandelier sweat"
      { t: 172.72, kind: 'pre', endY: 26 },                                                       // "three, two"
      { t: 174.53, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10, gap: true }, // "one": fireworks, and over the hole
      { t: 192.68, kind: 'break', endY: 18 },                                                     // "tip the valet, walk away"
      { t: 199.93, kind: 'verse', start: 'launch', launchBeats: 3, kick: 8, endY: 11 },           // "cash, a scandal"
      { t: 219.83, kind: 'break', endY: 18 },                                                     // "then break the law"
      { t: 221.64, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, endY: 11 },          // "I don't do refunds"
      { t: 234.28, kind: 'break', endY: 18 },
      { t: 236.08, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, endY: 11 },          // the chant
      { t: 250.47, kind: 'break', endY: 16 },                                                     // "bon voyage, baby"
      { t: 254.06, kind: 'final', start: 'launch', launchBeats: 3, kick: 8, endY: 10 },           // "holiday, holiday"
      { t: 261.27, kind: 'outro', endY: 5 },
    ],
    palette: 'chGold',
    world: 'hotel',
    collect: 'coin',
    ground: 'ocean',
    land: { shore: -66, far: 420 },
    skyline: 'hills',
    titleView: { ahead: -0.16, x: 1.4, h: 2.2, back: -0.8, lookH: 5.0 },
    looks: [
      { t: -99, palette: 'chGold' },
      { t: 42.8, palette: 'chPool', fade: 1.2 },                                              // the pool, the afternoon
      { t: 68.4, palette: 'chPool', set: { horizon: 0xfff2d0, skyGlow: 0xffe8a8, sunK: 2.1, fog: 0xf0e0c8 }, fade: 1.6 },   // "I came sun drunk"
      { t: 87.0, palette: 'chLobby', fade: 0.4 },                                             // the lobby
      { t: 94.3, palette: 'chBar', fade: 0.4 },                                               // the bar
      { t: 101.6, palette: 'chHall', fade: 0.3 },                                             // the hall
      { t: 105.4, palette: 'chSunset', fade: 0.3 },                                           // sunset at the pool
      { t: 136.0, palette: 'chSunset', set: { zenith: 0x1a1a4a, horizon: 0xc86a7a, skyGlow: 0xff5a6a, fog: 0x6a4a6a, sunK: 0.6, windowK: 0.8, stars: 0.3, sunSize: 0.6 }, fade: 6 },   // dusk
      { t: 150.0, palette: 'chNight', fade: 1.6 },                                            // "white boat, wet tile"
      { t: 174.8, palette: 'chNight', set: { fog: 0x1a1430, skyLight: 0x8a6aa0, skyGlow: 0xff6ab8 }, fade: 0.4 },   // fireworks
      { t: 193.0, palette: 'chNight', set: { fog: 0x1a1410, skyLight: 0x8a6a50, lamp: 0xffc070 }, fade: 1.2 },      // the valet
      { t: 200.2, palette: 'chNight', set: { fog: 0x2a0a10, skyLight: 0xffc0a0, bounce: 0x5a1a1a, hemiK: 1.8, lamp: 0xffc890, glow: 0xff5a6a }, fade: 0.4 },   // the ballroom
      { t: 222.0, palette: 'chNight', set: { horizon: 0x4a3a6a, skyGlow: 0xff8a8a, glowDir: [0.4, 0.04, 0.9] }, fade: 0.4 },   // out on the marina
      { t: 246.0, palette: 'chDawn', fade: 9 },                                               // the dawn: bon voyage
    ],
    moments: [
      { t: 26.3, kind: 'shutter', k: 0.6 },              // "one pic from a hotel robe"
      { t: 33.1, kind: 'bell', k: 0.55, degree: 4 },     // "bellboy smirked when I dropped your name"
      { t: 34.7, kind: 'pop', k: 0.45 },                 // "sweat and champagne"
      { t: 52.2, kind: 'flash', k: 0.18 },               // "first class scream"
      { t: 64.0, kind: 'pop', k: 0.4 },                  // "rosé"
      { t: 94.1, kind: 'ring', k: 0.3, dur: 0.5 },       // "whole room broke"
      { t: 115.4, kind: 'flash', k: 0.18 },
      { t: 125.2, kind: 'pop', k: 0.4 },
      { t: 173.6, kind: 'fireworks', n: 8, ahead: 4.6, x: 52, y: 32, size: 1.2 },     // "three, two, one"
      { t: 174.6, kind: 'fireworks', n: 12, ahead: 4.6, x: 52, y: 32, size: 1.2 },
      { t: 177.7, kind: 'fireworks', n: 10, ahead: 4.6, x: 52, y: 32, size: 1.2 },    // "holiday"
      { t: 181.0, kind: 'fireworks', n: 10, ahead: 4.6, x: 52, y: 32, size: 1.2 },
      { t: 185.6, kind: 'fireworks', n: 14, ahead: 4.6, x: 52, y: 32, size: 1.2 },    // "holiday"
      { t: 189.4, kind: 'fireworks', n: 10, ahead: 4.6, x: 52, y: 32, size: 1.2 },
      { t: 195.6, kind: 'ring', k: 0.3, dur: 0.6 },      // "tip the valet"
      { t: 251.0, kind: 'pop', k: 0.5 },                 // "bon voyage"
      { t: 254.2, kind: 'fireworks', n: 10, ahead: 4.6, x: 52, y: 32, size: 1.2 },    // "holiday, holiday"
    ],
    confetti: [[65.4, 69.6], [127.6, 131.6], [174.6, 178.6], [237.0, 240.6], [254.2, 258.4]],
    rails: [
      { t: 88.62, bars: 2, x: 0 },        // the lobby: "slipped right off with a little dirt"
      { t: 158.16, bars: 2, x: 0 },       // "half a love in a lipstick glass ... every promise by the pool"
    ],
    confettiColors: [0xff8ab8, 0xffd860, 0xffffff, 0xff4a8a, 0xf0c860],
    confettiNormal: true,
    scenery: {
      rooms: [
        { style: 'lobby', from: 86.79, to: 94.12, caps: [{ kind: 'front', hw: 13, hh: 30 }, CHDOOR] },      // in the front doors: the lobby
        { style: 'bar', from: 94.12, to: 101.47, caps: [null, CHDOOR] },                                   // the bar
        { style: 'hall', from: 101.47, to: 105.12, caps: [null, { kind: 'wall', hw: 14, hh: 26 }] },       // the hall, out to the pool
        { style: 'ballroom', from: 199.93, to: 212.59, caps: [{ kind: 'front', hw: 13, hh: 32 }, CHDOOR] }, // the ballroom: cash, a scandal
        { style: 'ballroom', from: 212.59, to: 221.64, caps: [null, { kind: 'wall', hw: 14, hh: 30 }] },   // the buffet
      ],
      car: { t: 98.2, x: -24, paint: 0xe8b850, len: 24 },   // "said I like car, took a better car"
      zones: [
        // the drive along the sea at golden hour: palms, the hotel, a glimpse of the pool
        { from: -6, to: 42.4, kits: ['chPalms'], x: 40, spread: 14, every: 0.5 },
        { from: 0, to: 42, kits: ['chHotel'], x: 92, every: 2.3 },
        { from: 8.6, to: 12.4, kits: ['chPool'], x0: 26, x1: 52 },
        // the pool deck, the afternoon, and again at sunset and at night
        { from: 42.4, to: 86.6, kits: ['chPalms'], side: -1, x: 40, spread: 14, every: 0.5 },
        { from: 42.4, to: 86.6, kits: ['chPalms'], side: 1, x: 84, spread: 10, every: 0.6 },
        { from: 42.4, to: 86.6, kits: ['chHotel'], x: 122, every: 1.9 },
        { from: 42.6, to: 86.2, kits: ['chPool'], x0: 26, x1: 62, deck: true },
        { from: 105.0, to: 175.0, kits: ['chPalms'], side: -1, x: 40, spread: 14, every: 0.5 },
        { from: 105.0, to: 175.0, kits: ['chPalms'], side: 1, x: 84, spread: 10, every: 0.6 },
        { from: 105.0, to: 149.0, kits: ['chHotel'], x: 122, every: 1.9 },
        { from: 105.2, to: 175.0, kits: ['chPool'], x0: 26, x1: 62, deck: true },
        // the marina, the boats lit up at night; the valet at the front; the marina again toward morning
        { from: 140, to: 200, kits: ['chYachts'], x: 100, every: 0.9 },
        { from: 151.3, to: 151.4, kits: ['chYachts'], x: 82, s: 1.5 },                          // "white boat, wet tile"
        { from: 175.0, to: 200.0, kits: ['chPalms'], x: 40, spread: 14, every: 0.5 },
        { from: 186, to: 199.9, kits: ['chHotel'], x: 90, every: 2.0 },
        { from: 221.6, to: 262, kits: ['chPalms'], side: -1, x: 40, spread: 12, every: 0.55 },
        { from: 221.6, to: 272, kits: ['chPalms'], side: 1, x: 32, spread: 20, every: 0.5 },
        { from: 221.6, to: 272, kits: ['chYachts'], x: 100, every: 0.9 },
        // mini bottles strung across the road: "mini, mini, mini, bar tab pretty"
        { from: 72.2, to: 86.4, kits: ['chMinis'], every: 1.1, span: 30, lift: 13 },
        { from: 134.6, to: 148.8, kits: ['chMinis'], every: 1.1, span: 30, lift: 13 },
        { from: 243.2, to: 250.2, kits: ['chMinis'], every: 1.1, span: 30, lift: 13 },
        // hung over the road: the robe, the first-class tag, the chandelier
        { from: 0, to: 0.1, kits: ['chHung'], at: [[27.2, 'robe'], [53.6, 'tag'], [116.6, 'tag'], [172.8, 'chandelier']] },
        // the cash coming down, the scandal sheets
        { from: 0, to: 0.1, kits: ['chFall'], at: [[202.4, 'note', 200.6], [204.6, 'paper', 202.2], [238.8, 'note', 237.0]], n: 60 },
        // the set-pieces
        { from: 0, to: 0.1, kits: ['chProps'], at: [
          { t: 13.0, x: 30, kind: 'cart', s: 1.6 },                                 // "pack your shame, baby"
          { t: 15.4, x: -30, kind: 'minibar', s: 1.3 },                             // "mini, mini bar tab, pretty shitty"
          { t: 29.2, x: 28, kind: 'case', s: 1.3 },                                 // "a gold-made case"
          { t: 31.2, x: -28, kind: 'card', s: 1.2 },                                // "a black card face"
          { t: 33.4, x: 28, kind: 'bell', s: 1.2, ding: 33.1 },                     // "bellboy smirked when I dropped your name"
          { t: 35.2, x: -28, kind: 'bucket', s: 1.3 },                              // "ice in the bucket, sweat and champagne"
          { t: 47.8, x: -28, kind: 'cheque', s: 1.2 },                              // "put your paycheck in the tray"
          { t: 65.2, x: -30, kind: 'tower', s: 1.3 },                               // "rosé, rosé"
          { t: 67.2, x: -32, kind: 'shaker', s: 1.5, go: 65.3 },                    // "shake that ice till the glitter sprays"
          { t: 93.7, x: -20, kind: 'martini', s: 1.0, bite: 93.5, floor: true },    // "bit the olive"
          { t: 96.2, x: 24, kind: 'minibar', s: 1.1, floor: true },                 // "by the mini bar"
          { t: 98.2, x: -24, kind: 'turntable', s: 1.0, floor: true, face: false }, // "took a better car"
          { t: 99.8, x: 24, kind: 'flowers', s: 1.1, bloom: 98.9, floor: true },    // "I bloom"
          { t: 100.8, x: -22, kind: 'swans', s: 1.0, floor: true },                 // "you fold"
          { t: 110.2, x: -28, kind: 'cheque', s: 1.2 },                             // "put your paycheck in the tray"
          { t: 126.8, x: -30, kind: 'tower', s: 1.3 },                              // "rosé, rosé"
          { t: 129.4, x: -32, kind: 'shaker', s: 1.5, go: 127.6 },                  // "shake that ice"
          { t: 153.0, x: -24, kind: 'fruit', s: 1.2 },                              // "fruit on a silver cart"
          { t: 156.0, x: -26, kind: 'art', s: 1.0, cell: 0 },                       // "I came for the art"
          { t: 156.8, x: -32, kind: 'art', s: 1.0, cell: 1 },
          { t: 157.6, x: -26, kind: 'art', s: 1.0, cell: 2 },
          { t: 158.8, x: -26, kind: 'glass', s: 1.0 },                              // "half a love in a lipstick glass"
          { t: 170.6, x: -26, kind: 'perfume', s: 1.2 },                            // "I smell so sweet"
          { t: 197.0, x: 24, kind: 'valet', s: 1.2 },                               // "tip the valet"
          { t: 213.8, x: 30, kind: 'buffet', s: 1.0, floor: true },                 // "at the buffet"
        ] },
      ],
      vehicles: [
        // "your mama needs a motorcade": black cars coming the other way, one after another
        { kind: 'sedan', paint: 0x0c0c10, lead: [[83.8, 2.40], [87.0, -2.20]], x: -1, lane: 2.4, reverse: true, from: 83.7, to: 87.60 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[83.8, 2.75], [87.0, -1.85]], x: -1, lane: 2.4, reverse: true, from: 83.7, to: 87.95 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[83.8, 3.10], [87.0, -1.50]], x: -1, lane: 2.4, reverse: true, from: 83.7, to: 88.30 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[83.8, 3.45], [87.0, -1.15]], x: -1, lane: 2.4, reverse: true, from: 83.7, to: 88.65 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[83.8, 3.80], [87.0, -0.80]], x: -1, lane: 2.4, reverse: true, from: 83.7, to: 89.00 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[146.6, 3.6], [149.8, -2.2]], x: -1, lane: 2.4, reverse: true, from: 146.5, to: 150.2 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[146.6, 4.0], [149.8, -1.8]], x: -1, lane: 2.4, reverse: true, from: 146.5, to: 150.7 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[146.6, 4.5], [149.8, -1.3]], x: -1, lane: 2.4, reverse: true, from: 146.5, to: 151.1 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[146.6, 5.0], [149.8, -0.9]], x: -1, lane: 2.4, reverse: true, from: 146.5, to: 151.6 },
        { kind: 'sedan', paint: 0x0c0c10, lead: [[146.6, 5.4], [149.8, -0.4]], x: -1, lane: 2.4, reverse: true, from: 146.5, to: 152.0 },
        // parked at the front for the valet
        { kind: 'sedan', paint: 0xf4f4f6, at: 196.2, rate: 0, x: 26, ground: true, yaw: 0.4, from: 186, to: 200 },
        { kind: 'sedan', paint: 0x0c0c10, at: 197.2, rate: 0, x: 30, ground: true, yaw: 0.4, from: 186, to: 200 },
        { kind: 'sedan', paint: 0xd8b060, at: 198.2, rate: 0, x: 26, ground: true, yaw: 0.4, from: 186, to: 200 },
      ],
      lyricPart: 'chSign', lyricX: 0, lyricBg: '#0c0a0a', lyricColor: '#f2c46a', lyricCore: '#fff2d0',
      lyrics: [
        { t: 9.74, text: 'POOL LOOKS\nGOOD TODAY', h: 14 },
        { t: 33.54, text: 'ICE IN THE BUCKET,\nSWEAT AND CHAMPAGNE', h: 14 },
        { t: 37.5, text: 'YOU CALL IT FATE,\nI CALL IT A WIN', h: 14 },
        { t: 65.06, text: 'SHAKE THAT ICE TILL\nTHE GLITTER SPRAYS', h: 15 },
        { t: 82.14, text: 'HANDS UP FOR\nTHE MESS I MADE', h: 14 },
        { t: 92.98, text: 'BIT THE OLIVE,\nWHOLE ROOM BROKE', h: 15, lead: 1.2 },
        { t: 153.5, text: 'YOU THOUGHT I CAME FOR YOU,\nI CAME FOR THE ART', h: 14 },
        { t: 221.88, text: "I DON'T DO REFUNDS", h: 14 },
        { t: 229.38, text: 'YOU WANTED LOVE,\nI WANTED PAY', h: 14 },
        { t: 250.92, text: 'BON VOYAGE, BABY', h: 14, lead: 1.2 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'boat', t: 267.6, x: -86, s: 1.6, dockX: -18, leave: 250.9, leaveFor: 30, fireAt: 250.0, orbit: { r: 140, h: 24, y: 12, facing: true, back: 2, right: 0.3, swing: 0.12, heroBack: 12, heroFov: 36, heroPan: 0.17, heroUp: 2.0, heroSide: 1.6 } },   // the yacht big beside her, right of the card
    },
  },
  {
    // the costume shop's back room, where the real scary costumes live: hurts sold in bags with
    // names on, the fitting room and its mirror, the party under the blacklight, the clearance
    // room, the walls coming down; the zipper stuck, the heels; then the till: 29.99.
    id: 'sexy-trauma-costume',
    accent: '#ff7a1a',
    title: 'Sexy Trauma Costume',
    startY: 8,
    collect: 'corn',
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                                         // "welcome to the back room"
      { t: 12.00, kind: 'verse', endY: 10, turn: 0.3 },                                      // "I'm your trauma retail specialist"
      { t: 22.66, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },           // "one size fits all"
      { t: 32.00, kind: 'break', endY: 18, turn: 0.3 },
      { t: 33.32, kind: 'chorus', start: 'launch', kick: 10, c: 1.15, endY: 10, turn: 0.3 },  // "sexy daddy issues"
      { t: 54.66, kind: 'break', endY: 12, turn: 0.3 },
      { t: 57.32, kind: 'verse', start: 'launch', kick: 8, endY: 12, turn: 0.3 },            // "our best seller this year"
      { t: 64.01, kind: 'break', endY: 22, turn: 0.3 },
      { t: 65.33, kind: 'verse', start: 'launch', kick: 7, c: 0.85, endY: 12, turn: 0.3 },   // "the clearance room"
      { t: 76.01, kind: 'bridge', endY: 14, turn: 0.3 },                                     // "boundaries fall"
      { t: 85.31, kind: 'break', endY: 24, turn: 0.3 },
      { t: 86.65, kind: 'chorus', start: 'launch', kick: 10, c: 1.15, endY: 10, turn: 0.3 },
      { t: 107.99, kind: 'post', start: 'launch', kick: 9, endY: 12, turn: 0.3 },
      { t: 118.66, kind: 'verse', start: 'launch', kick: 8, endY: 12, turn: 0.3 },           // "maybe if we wear it ironically"
      { t: 129.33, kind: 'break', endY: 14, turn: 0.3 },                                     // "the zipper's stuck"
      { t: 130.66, kind: 'bridge', endY: 16, turn: 0.3 },                                    // "these heels are killing me"
      { t: 142.67, kind: 'final', start: 'launch', kick: 11, endY: 10, turn: 0.3, gap: true },   // "sexy emotional damage": over the hole
      { t: 159.99, kind: 'post', endY: 12, turn: 0.3 },
      { t: 169.33, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },         // "sexy trauma costume"
      { t: 182.66, kind: 'bridge', endY: 14, turn: 0.3 },                                    // "I'll ring you up at 29.99"
      { t: 203.99, kind: 'final', start: 'launch', kick: 10, endY: 8, turn: 0.3 },
      { t: 211.99, kind: 'outro', endY: 5, turn: 0.3 },
    ],
    rails: [
      { t: 69.33, bars: 2, x: 0 },        // "in the clearance room, see-through fabric for you"
      { t: 118.66, bars: 2, x: 0 },       // "maybe if we wear it ironically"
    ],
    palette: 'stcAisle',
    world: 'shop',
    titleView: { ahead: -0.14, x: 2.0, h: 2.0, back: -0.55, lookH: 3.5 },   // behind her, the doors to the back room ahead
    looks: [
      { t: -99, palette: 'stcAisle' },
      { t: 17.31, palette: 'stcFitting', fade: 0.4 },       // "step into the fitting room"
      { t: 22.66, palette: 'stcAisle', fade: 0.4 },         // "one size fits all"
      { t: 33.32, palette: 'stcParty', fade: 0.2 },         // the party under the blacklight
      { t: 54.66, palette: 'stcAisle', fade: 0.4 },
      { t: 65.33, palette: 'stcClear', fade: 0.3 },         // "the clearance room"
      { t: 76.01, palette: 'stcFitting', fade: 0.4 },
      { t: 79.0, palette: 'stcFall', fade: 1.5 },           // "boundaries fall"
      { t: 86.65, palette: 'stcParty', fade: 0.2 },
      { t: 118.66, palette: 'stcFitting', fade: 0.4 },      // "maybe if we wear it ironically"
      { t: 129.33, palette: 'stcQuiet', fade: 0.6 },        // "the zipper's stuck on memories"
      { t: 142.67, palette: 'stcParty', fade: 0.2 },
      { t: 153.2, palette: 'stcFrost', fade: 0.6 },         // "sparkles covering the frostbite"
      { t: 155.6, palette: 'stcParty', fade: 1.0 },
      { t: 169.33, palette: 'stcAisle', fade: 0.4 },
      { t: 182.66, palette: 'stcFront', fade: 0.6 },        // the tills: "29.99"
      { t: 197.2, palette: 'stcHell', fade: 3.0 },          // "when you're ready for hell"
    ],
    moments: [
      { t: 79.54, kind: 'knock', k: 0.5, n: 1 },            // "boundaries fall"
      { t: 184.48, kind: 'bell', k: 0.35, degree: 7 },      // the register: 29.99
      { t: 203.99, kind: 'flash', k: 0.5 },
    ],
    confetti: [[40.2, 42.0], [93.6, 95.2], [153.4, 155.4]],  // "fishnets and glitter", "sparkles"
    confettiColors: [0xff7a1a, 0xb070ff, 0x6aff6a, 0xffffff, 0xff3ad0, 0xffd21a],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'PK1', text: 'SEXY\nDIVORCE', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK2', text: 'SEXY\nBANKRUPTCY', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK3', text: 'SEXY\nDADDY ISSUES', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK4', text: 'SEXY\nABANDONMENT', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK5', text: 'SEXY\nGASLIGHTING', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK6', text: 'SEXY\nCODEPENDENCY', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK7', text: 'SEXY EMOTIONAL\nDAMAGE', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK8', text: 'SEXY TRAUMA\nCOSTUME', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'STCHH', text: 'HAPPY HALLOWEEN', color: '#ff8a2a', core: '#ffd8b0', bg: '#100c0a', size: 96 },
      ],
      rooms: [
        { style: 'aisle', from: -3.4, to: 3.99, caps: [null, KDOOR] },                       // "welcome to the back room"
        { style: 'aisle', from: 3.99, to: 17.31, caps: [null, KDOOR] },                       // "sexy divorce", "sexy bankruptcy"
        { style: 'fitting', from: 17.31, to: 22.66, caps: [null, KDOOR] },                    // "step into the fitting room, face the mirror"
        { style: 'aisle', from: 22.66, to: 33.32, caps: [null, KDOOR] },                      // "one size fits all", "accessories, sold separately"
        { style: 'party', from: 33.32, to: 54.66, caps: [null, KDOOR] },                      // "we're all wearing our trauma to the party tonight"
        { style: 'aisle', from: 54.66, to: 65.33, caps: [null, KDOOR] },                      // "our best seller this year"
        { style: 'clear', from: 65.33, to: 76.01, caps: [null, KDOOR] },                      // "the clearance room"
        { style: 'fitting', from: 76.01, to: 86.65, caps: [null, KDOOR], fallAt: 78.6, fallFor: 2.0 },   // "boundaries fall", "mirror starts calling"
        { style: 'party', from: 86.65, to: 107.99, caps: [null, KDOOR] },
        { style: 'party', from: 107.99, to: 118.66, caps: [null, KDOOR] },
        { style: 'fitting', from: 118.66, to: 129.33, caps: [null, KDOOR] },                  // "maybe if we dress it up someone will finally see"
        { style: 'aisle', from: 129.33, to: 142.67, caps: [null, KDOOR] },                    // "the zipper's stuck", "these heels"
        { style: 'party', from: 142.67, to: 159.99, caps: [null, KDOOR] },                    // "sexy emotional damage"
        { style: 'party', from: 159.99, to: 169.33, caps: [null, KDOOR] },
        { style: 'aisle', from: 169.33, to: 182.66, caps: [null, KDOOR] },                    // "sexy trauma costume"
        { style: 'front', from: 182.66, to: 232, caps: [null, { kind: 'wall', hw: 0.01, hh: 0.01 }] },   // the tills
      ],
      roomEvents: { hell: [197.2, 999, 3.0, 0.5] },
      zones: [
        // the back room's aisles: racks of costumes, the hurts in bags with their names on
        { from: -3.0, to: 3.8, kits: ['racks'], every: 0.8, x: 30 },
        { from: 4.2, to: 17.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 7.6, to: 10.5, kits: ['pkgs'], at: [[7.6, 'PK1', 0x8a3aff, -18], [10.4, 'PK2', 0x2a8a4a, 18]], lift: 24 },
        // the fitting room: face the mirror
        { from: 20.6, to: 20.7, kits: ['longMirror'], at: [20.6], lift: 26, s: 0.75 },
        // "one size fits all"; the accessories, sold separately
        { from: 22.9, to: 33.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 29.6, to: 31.8, kits: ['accessories'], every: 0.45, x: 48.5, y: 22 },
        // the party: jack-o'-lanterns, bats, the costumes on their forms, the names again
        { from: 33.6, to: 54.4, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 34.0, to: 54.0, kits: ['bats'], every: 2.0 },
        { from: 35.0, to: 37.8, kits: ['pkgs'], at: [[35.0, 'PK3', 0xd81a3a, -18], [37.7, 'PK4', 0x1a1a20, 18]], lift: 24 },
        { from: 52.8, to: 53.5, kits: ['dressForms'], at: [[52.8, 30, 0xff3ad0, true], [53.4, -30, 0x8a3aff, true]] },
        // "our best seller this year"
        { from: 54.9, to: 65.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 61.9, to: 62.0, kits: ['pkgs'], at: [[61.9, 'PK5', 0xff7a1a, -18]], lift: 24 },
        // the clearance room
        { from: 65.6, to: 75.8, kits: ['racks'], every: 0.9, x: 30 },
        { from: 67.3, to: 67.4, kits: ['pkgs'], at: [[67.3, 'PK6', 0xff3ad0, 18]], lift: 24 },
        // the fitting room, its walls coming down; the mirror calling
        { from: 85.6, to: 85.7, kits: ['longMirror'], at: [85.6], lift: 26, s: 0.75, call: 84.4 },
        // the party again; the spider coming down
        { from: 86.9, to: 118.4, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 87.0, to: 118.0, kits: ['bats'], every: 2.0 },
        { from: 88.3, to: 91.1, kits: ['pkgs'], at: [[88.3, 'PK3', 0xd81a3a, 18], [91.0, 'PK4', 0x1a1a20, -18]], lift: 24 },
        { from: 112.0, to: 112.1, kits: ['spider'], at: 112.0, drop: 108.6, s: 1.6 },
        // "someone will finally see": the mirror
        { from: 126.2, to: 126.3, kits: ['longMirror'], at: [126.2], lift: 26, s: 0.75 },
        // the zipper stuck on memories; the heels
        { from: 129.6, to: 142.4, kits: ['racks'], every: 0.8, x: 30 },
        { from: 133.4, to: 133.5, kits: ['garmentBag'], at: 133.4, x: 0, stuck: 132.0, lift: 40, s: 0.72 },
        { from: 138.6, to: 138.7, kits: ['heels'], at: 138.6, lift: 24, s: 1.6 },
        // "sexy emotional damage"; sparkles over the frostbite
        { from: 142.9, to: 169.1, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 143.0, to: 169.0, kits: ['bats'], every: 2.0 },
        { from: 144.5, to: 144.6, kits: ['pkgs'], at: [[144.5, 'PK7', 0x1a1a20, -18]], lift: 24 },
        // the aisle: "sexy trauma costume"
        { from: 169.6, to: 182.4, kits: ['racks'], every: 0.8, x: 30 },
        { from: 171.4, to: 171.5, kits: ['pkgs'], at: [[171.4, 'PK8', 0xff7a1a, 18]], lift: 24 },
        { from: 174.0, to: 180.0, kits: ['dressForms'], at: [[174.6, 32, 0xff7a1a, true], [176.2, -32, 0x8a3aff, true], [177.8, 32, 0xd81a3a, true], [179.4, -32, 0x1a1a20, true]] },
        // the tills at the front: "I'll ring you up at 29.99"; happy Halloween
        { from: 186.0, to: 214.0, kits: ['counters'], every: 1.4, x: 34 },
        { from: 184.4, to: 184.5, kits: ['till'], at: 184.4, x: -26, s: 1.4 },
        { from: 193.1, to: 193.2, kits: ['hBanner'], at: 193.1, sign: 'STCHH', lift: 18 },
      ],
      lyricPart: 'shopSign', lyricBg: '#100c0a', lyricColor: '#ff8a2a', lyricCore: '#ffd8b0', lyricS: 1,
      lyrics: [
        { t: 0.0, lead: 3.6, text: 'BACK ROOM', x: 0, h: 18, frame: 'rgba(0,0,0,0)' },
        { t: 22.34, text: 'ONE SIZE\nFITS ALL', x: 0, h: 18, part: 'tag', bg: '#a8a49c', color: '#141414', core: '#141414', frame: 'rgba(0,0,0,0)' },
        { t: 61.06, lead: 0.84, text: 'BEST\nSELLER', x: 0, side: 1, h: 28, s: 0.75, part: 'burst', bg: '#a08a10', color: '#c80a1a', core: '#e81a2a', frame: 'rgba(0,0,0,0)' },
        { t: 70.02, text: 'CLEARANCE', x: 0, h: 18, bg: '#7a0a0a', color: '#ffffff', core: '#ffffff', frame: 'rgba(0,0,0,0)' },
        { t: 155.24, text: 'NO REFUNDS\nNO EXCHANGES', x: 0, h: 18, bg: '#a8a49c', color: '#c80a1a', core: '#c80a1a', frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'till', t: 215.8, x: -24, fireAt: 203.99, orbit: { r: 72, h: -2, y: 26, facing: true, back: 1.0, right: 0.3, swing: 0.2, heroPan: 0.36, heroBack: 18, heroFov: 42, heroUp: 2.2, heroSide: 0.8 } },   // the till's receipt beside the card: DIGNITY, PEACE OF MIND
    },
  },
  {
    // a party with somebody else's heart in it. The heart hangs over the city
    // all night and beats as hard as you keep the beat. In the bridge the band
    // leaves and the kick drum talks: the rails become a heart monitor that only
    // spikes when you pump on time.
    id: 'heart-of-the-party',
    accent: '#ff2a50',
    title: 'Heart of the Party',
    collect: 'heart',
    startY: 15,
    heart: true,
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 15.96, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7 },   // the band stops: "first one on the dance floor"
      { t: 39.0, kind: 'pre', endY: 30 },                                       // "somebody on my ticket never saw the show"
      { t: 49.02, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, lift: 0.006 },   // a bar with no bass, land on "heart"
      { t: 77.0, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 9, gap: true },   // "keep the beat... alive": the heart skips, the road with it
      { t: 81.02, kind: 'verse', c: 0.85 },                                     // "the phone went off past midnight"
      { t: 88.03, kind: 'break', start: 'launch', launchBeats: 2, kick: 3 },    // "son, sit down": the floor goes
      { t: 91.0, kind: 'verse', c: 0.9 },                                       // "strange little word, a match"
      { t: 113.0, kind: 'pre', endY: 30 },
      { t: 124.99, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, lift: 0.006 },
      { t: 148.93, kind: 'break', start: 'launch', launchBeats: 3, kick: 9, endY: 8 },        // last "keep the beat alive"
      { t: 152.92, kind: 'post', c: 1.2 },                                      // the band on its own
      { t: 172.83, kind: 'bridge', endY: 24 },                                  // "every March his mother takes the bus"
      { t: 188.32, kind: 'pulse', start: 'launch', launchBeats: 4, kick: 6 },  // "and the kick drum talks"
      { t: 210.85, kind: 'pre', endY: 36, c: 0.8 },                             // "there you are"
      { t: 222.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12 },  // the last chorus comes in
      { t: 253.0, kind: 'break', start: 'launch', launchBeats: 3, kick: 10, endY: 8, gap: true },    // "keep the beat... alive": over the crowd
      { t: 257.0, kind: 'final', c: 1.3 },
      { t: 283.03, kind: 'outro', c: 0.03 },                                    // flat, onto the stage
    ],
    palette: 'party',
    titleView: { ahead: -0.27, x: 3.2, h: 2.5, back: -1.1, lookH: 2.4 },   // behind her: the street out, its lights, the gate
    // the chorus: searchlights in her colours stood between the crowd and the buildings round the square
    lift: { flash: 0xff2a50, fog: 0.36, beams: { colors: [0xff2a50, 0xffd27a, 0xff8ab8], x: 42.5, every: 1.25, y: 6 } },
    looks: [
      { t: -99, palette: 'party' },
      { t: 49.02, palette: 'hptChorus', fade: 0.35 },   // the street opens into the square
      { t: 77.0, palette: 'hptHush', fade: 0.3 },       // the band stops: "keep the beat... alive"
      { t: 81.02, palette: 'late', fade: 1.5 },         // nine years ago, past midnight
      { t: 113.0, palette: 'party', fade: 4 },          // back out
      { t: 124.99, palette: 'hptChorus', fade: 0.35 },
      { t: 148.93, palette: 'hptHush', fade: 0.3 },
      { t: 152.92, palette: 'hptDance', fade: 0.35 },   // the band on its own
      { t: 174.8, palette: 'hptSunday', fade: 3.5 },    // his mother's street, soft as Sunday
      { t: 189.3, palette: 'vigil', fade: 2.5 },        // the city goes quiet round her
      { t: 198.4, palette: 'hptEyes', fade: 2.4 },      // "and she closes her eyes"
      { t: 216.0, palette: 'hptReturn', fade: 4.5 },    // "there you are": the lights come back on
      { t: 222.51, palette: 'encore', fade: 0.35 },     // the last chorus
      { t: 253.0, palette: 'hptHush', fade: 0.3 },
      { t: 257.0, palette: 'encore', fade: 0.3 },
      { t: 283.0, palette: 'hptDawn', fade: 18 },       // the end of the night
    ],
    moments: [
      { t: 82.55, kind: 'ring', k: 0.26, dur: 0.45 },   // the phone goes off past midnight
      { t: 83.05, kind: 'ring', k: 0.26, dur: 0.45 },
      { t: 93.49, kind: 'flash', k: 0.26 },             // "same thing you strike for fire"
      { t: 181.3, kind: 'bell', k: 0.35, degree: 0 },   // "soft as Sunday"
      { t: 246.5, kind: 'pop', k: 0.6, flash: 0.14 },   // the cork: "tonight the drinks are on me"
      { t: 257.0, kind: 'fireworks', n: 10, y: 50, ahead: 2.2 },
      { t: 261.5, kind: 'fireworks', n: 8, y: 44, ahead: 2.0 },
      { t: 269.0, kind: 'fireworks', n: 8, y: 48, ahead: 2.2 },
    ],
    monitor: { from: 190.33, to: 222.51 },
    confetti: [[49.02, 77.0], [124.99, 148.93], [152.92, 172.83], [222.51, 292]],
    rails: [
      { t: 23.97, bars: 2, x: 0 },        // "got a zipper down my middle": the zipper, down the middle of the road
      { t: 160.88, bars: 4, x: 0 },       // the band on its own: a string of party bulbs over the dance floor
    ],
    scenery: {
      signs: [
        { key: 'HPTYES', text: 'YES', color: '#ff2a50', core: '#ffe8ee', bg: '#0c0408', size: 130 },
        { key: 'HPTMORE', text: 'MORE', color: '#ffc04a', core: '#fff4dc', bg: '#0c0804', size: 130 },
        { key: 'HPTPASS', text: 'ALL ACCESS', color: '#141018', core: '#141018', bg: '#a8a49c', size: 92 },
        { key: 'HPTADMIT', text: 'ADMIT ONE', color: '#c8102e', core: '#c8102e', bg: '#a89c84', size: 110 },
      ],
      zones: [
        // out: the street of bars and clubs, queues on the pavements
        { from: -4, to: 49.2, kits: ['hptStreet', 'partystreet'], front: 25 },
        { from: 1, to: 49, kits: ['hptCrowd'], queue: true, x: 19, k: 0.35, hands: 0, every: 0.46 },
        // the chorus: the street opens into the square and everyone's out in it
        { from: 49.2, to: 81, kits: ['hptStreet'], front: 44, tall: 0.5, neon: 0.5 },
        { from: 49.5, to: 81, kits: ['hptCrowd'], xs: [19.5, 26.5, 33.5], k: 1 },
        // nine years ago, past midnight: the same street, cold and empty
        { from: 81, to: 113, kits: ['hptStreet'], front: 27, wake0: 0.15, neon: false, clear: [[99.8, 101.5, -1]] },
        { from: 100.6, to: 100.7, kits: ['hospital'], x: -34 },
        // back out: the pavements full, phones out
        { from: 113, to: 125.2, kits: ['hptStreet', 'partystreet'], front: 25 },
        { from: 113, to: 119.0, kits: ['hptCrowd'], queue: true, x: 19, k: 0.6, hands: 0, every: 0.42 },
        { from: 119.2, to: 125.1, kits: ['hptStacks'], x: 22.5, every: 0.42 },                                                            // "so I scream every lyric"
        // the second chorus and the band on its own: the square
        { from: 125.2, to: 173, kits: ['hptStreet'], front: 44, tall: 0.5, neon: 0.5 },
        { from: 125.2, to: 173, kits: ['hptCrowd'], xs: [19.5, 26.5, 33.5], k: 1 },
        // his mother's street on a Sunday
        { from: 173, to: 188.3, kits: ['hptSuburb'], lampX: 16 },
        // the city gone quiet round her
        { from: 188.3, to: 211, kits: ['hptStreet'], front: 27, wake0: 0.1, neon: false, dim: 0.3 },
        // the lights come back on
        { from: 211, to: 222.6, kits: ['hptStreet', 'partystreet'], front: 25 },
        { from: 211, to: 222.5, kits: ['hptCrowd'], queue: true, x: 19, k: 0.5, hands: 0, every: 0.42 },
        // the last chorus: the square, all the way to the stage
        { from: 222.6, to: 296, kits: ['hptStreet'], front: 47, tall: 0.4, neon: 0.5 },
        { from: 222.6, to: 287.3, kits: ['hptCrowd'], xs: [19.5, 26.5, 33.5], k: 1 },
        // the set-pieces, each on its line
        { kits: ['hptPiece'], part: 'hptDisco', at: 17.9, over: true, lift: 14 },                                                       // "first one on the dance floor"
        { kits: ['hptPiece'], part: 'hptNeon', at: 22.8, x: -25, face: true, s: 1.25, sign: 'HPTYES', on: 20.44, blink: true, glow: [1, 0.2, 0.35] },   // "I say yes": it comes on on "yes"
        { kits: ['hptPiece'], part: 'hptNeon', at: 25.8, x: 25, face: true, s: 1.25, sign: 'HPTMORE', on: 23.47, blink: true, glow: [1, 0.72, 0.3] },   // "for some more"
        { kits: ['hptPiece'], part: 'hptPass', at: 27.7, over: true, lift: 17, sign: 'HPTPASS' },                                        // "like a backstage pass"
        { kits: ['hptPiece'], part: 'hptCake', at: 37.4, x: -27, face: true, lights: [34.74, 34.99, 35.24, 35.49] },                    // "five good summers ... nine ago": nine candles
        { kits: ['hptPiece'], part: 'hptTicket', at: 43.05, over: true, lift: 11, tear: 42.5, sign: 'HPTADMIT' },                        // "somebody on my ticket"
        { kits: ['hptPiece'], part: 'hptDuo', at: 47.7, x: 26, face: true },                                                             // "the both of us"
        { kits: ['hptPiece'], part: 'hptKick', at: 56.9, x: 38, rot: 2.14 },                                                            // "keep the beat": its head half turned to the road
        { kits: ['hptPiece'], part: 'hptShaker', at: 60.7, x: -31, face: true, s: 1.25, go: 58.52 },                                     // "shake it"
        { kits: ['hptPiece'], part: 'hptClock', at: 83.4, x: -24, face: true },                                                          // "past midnight"
        { kits: ['hptPiece'], part: 'hptPhone', at: 85.3, x: 26, face: true, s: 1.8, rings: [82.55, 83.05, 84.55, 85.05] },               // "the phone went off"
        { kits: ['hptPiece'], part: 'hptSlots', at: 88.1, x: -25, face: true, pull: 84.3, stops: [85.01, 85.51, 86.01] },                // "like a jackpot with a catch"
        { kits: ['hptPiece'], part: 'hptMatch', at: 95.8, x: -26, face: true, s: 1.45, strike: 93.49 },                                  // "same thing you strike for fire"
        { kits: ['hptPiece'], part: 'hptNineteen', at: 103.6, x: 26, face: true, s: 1.2 },                                               // "nineteen forever"
        { kits: ['hptPiece'], part: 'hptBook', at: 106.4, x: -25, face: true, s: 1.6 },                                                  // "on a page that no one gets to turn"
        { kits: ['hptPiece'], part: 'hptSeat', at: 117.7, x: 27, face: true, turn: -1.0, s: 1.15 },                                     // "somebody bought my ticket and never saw the show"
        { kits: ['hptPiece'], part: 'hptKick', at: 131.0, x: -38, rot: 4.14 },                                                          // "keep the beat"
        { kits: ['hptPiece'], part: 'hptShaker', at: 134.7, x: 33, face: true, go: 132.6 },                                             // "shake it"
        { kits: ['hptPiece'], part: 'hptDisco', at: 157.6, over: true, lift: 17 },                                                       // the band on its own: the square's a dance floor
        { kits: ['hptPiece'], part: 'hptDisco', at: 166.2, over: true, lift: 17 },
        { kits: ['hptPiece'], part: 'hptMug', at: 179.4, x: 26, face: true, s: 1.5 },                                                    // "she doesn't want my coffee"
        { kits: ['hptPiece'], part: 'hptChurch', at: 183.0, x: -36, face: true },                                                        // "soft as Sunday"
        { kits: ['hptPiece'], part: 'hptKick', at: 193.4, x: -33, rot: 4.14, pump: true },                                              // "and the kick drum talks": only when she pumps
        { kits: ['hptPiece'], part: 'hptMemory', at: 203.6, x: 27, face: true, s: 1.3, on: 199.4 },                                      // "front row at his concert"
        { kits: ['hptPiece'], part: 'hptKick', at: 231.8, x: 38, rot: 2.14 },                                                          // "keep the beat"
        { kits: ['hptPiece'], part: 'hptShaker', at: 235.5, x: -33, face: true, go: 233.54 },                                           // "shake it"
        { kits: ['hptPiece'], part: 'hptBubbly', at: 248.8, x: 30, face: true, pop: 246.5 },                                             // "tonight the drinks are on me": the cork on the beat
        // under the gaps: the crowd right under her road, hands up as she goes over
        { from: 76.9, to: 79.4, kits: ['hptCrowd'], xs: [0.5, 7.5], k: 1.3, every: 0.36 },
        { from: 252.9, to: 255.4, kits: ['hptCrowd'], xs: [0.5, 7.5], k: 1.3, every: 0.36 },
        { from: 66.5, to: 77.2, kits: ['hptRibs'] },
        { from: 140.4, to: 149.0, kits: ['hptRibs'] },
        { from: 241.5, to: 268.5, kits: ['hptRibs'] },
      ],
      party: {
        hands: [[70.8, 79.6], [144.8, 149.6], [241.5, 300]],
        festoonWave: 214.1,
        phones: [[39.0, 49.0], [113.0, 125.0], [210.85, 222.5], [283.0, 300]],
        rings: [[49.02, 77.0], [124.99, 148.93], [222.51, 253.0], [257.0, 283.0]],
        festoons: [[-4, 80.5], [113, 173], [212, 296]],
        zipper: 23.97, railLights: [160.88],
        bills: [105.9, 110.4],
        balloons: [[125.0, 149.0], [222.5, 284.0]],
        floor: [152.92, 172.83],
      },
      roads: [
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: -10, to: 80, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24, follow: true },
        { x: 0, width: 24, walk: 4, laneLines: 2, from: 80, to: 113, lanes: [-9, -3, 3, 9], density: 0.1, lampEvery: 30, follow: true },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 113, to: 173, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24, follow: true },
        { x: 0, width: 26, walk: 4, laneLines: 2, from: 173, to: 222.5, traffic: false, lampEvery: 30, follow: true },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 222.5, to: 296, traffic: false, lampEvery: 24, follow: true },
      ],
      shelf: 70, drop: 5,
      vehicles: [
        { kind: 'ambulance', at: 95.6, rate: 1.22, x: -1, from: 91, to: 104 },   // "my miracle came screaming up the street"
        { kind: 'bus', at: 175.6, rate: 0.8, x: 1, from: 166, to: 186 },        // "takes the bus from two towns over"
      ],
      // his lines on marquees, bulbs chasing round them on the beat
      lyricPart: 'hptMarquee', lyricBg: '#1a0610', lyricColor: '#ffd27a', lyricCore: '#fff6e0', lyricX: 24,
      lyrics: [
        { t: 23.84, text: 'GOT A ZIPPER\nDOWN MY MIDDLE', side: -1 },
        { t: 31.96, text: 'DOCTORS GAVE ME\nFIVE GOOD SUMMERS', side: 1 },
        { t: 37.3, text: 'I JUST WANT THE ENCORE\nTO THE ENCORE', side: 1 },
        { t: 50.5, text: "I'M THE HEART\nOF THE PARTY", side: 1, lead: 1.1 },
        { t: 52.7, text: "AND THE HEART\nAIN'T MINE", side: -1, lead: 1.1 },
        { t: 58.56, text: 'SHAKE IT LIKE\nI STOLE IT', side: 1 },
        { t: 60.2, text: 'HONEY,\nI KINDA DID', side: -1, lead: 1.6 },
        { t: 88.72, text: 'TONIGHT WE\nFOUND YOUR MATCH', side: 1 },
        { t: 101.76, text: 'NINETEEN\nFOREVER', side: -1 },
        { t: 114.06, text: 'SOMEBODY BOUGHT MY TICKET\nAND NEVER SAW THE SHOW', side: 1 },
        { t: 188.72, text: 'AND THE KICK\nDRUM TALKS', side: 1 },
        { t: 214.1, text: 'THERE YOU ARE', side: 1 },
        { t: 218.26, text: "HE'S BEEN HERE\nALL ALONG", side: -1 },
        { t: 246.0, text: 'TONIGHT THE DRINKS\nARE ON ME', side: -1 },
        { t: 247.94, text: "THE PARTY'S\nALL FOR HIM", side: 1, x: 0, part: 'hptBanner', lead: 1.7 },
        { t: 261.54, text: 'STILL HERE', side: 1 },
      ],
      // the stage at the end of the runway: her road runs onto its deck; the heart over it
      finale: { kind: 'heart', t: 287.6, x: 0, heartY: 50, size: 0.85, fireAt: 257.0, orbit: { y: 36, heroBack: 24, heroSide: 1.8, heroUp: 3.2, heroFov: 35, heroTilt: 5, heroPan: 0.17 } },
    },
  },
];

export const PALETTES = {
  // Your Wife, My Number: a heat wave in the glare, clouds and thunder, an evening at the curb, the
  // storm, the marble bathroom, the gold after the rain, and the blue of the evening at the end.
  // (ywnSelf/ywnLamps/ywnWind/ywnDry are the song's own: how lit its props are, its lamps, the wind
  // in its trees, how parched the lawns; estate.js blends them between the looks.)
  ymHeat: {
    zenith: 0x4a7ad0, horizon: 0xfff0d0, skyGlow: 0xfff4c0, glowDir: [0.3, 0.6, 0.75], skyline: 0x8a8a7a, moonDir: [0.3, 0.6, 0.75], moon: 0xfff8e8,
    fog: 0xf0e0c0, fogDensity: 0.0012, stars: 0, sunSize: 1.2, snow: 0, snowGround: 0, rain: 0, windowK: 0,
    ground: 0x88a04a, street: 0xfff0d0, roof: 0x8a7a6a, wall: 0xece4d4, tree: 0x2a4a22,
    window: 0xfff0d0, windowAlt: 0xffd8a0, lamp: 0xfff0c0,
    ribbon: 0x2a2620, edge: 0xfff8ec, fret: 0xe0b84a, glow: 0xffc860, hold: 0xffb040, gate: 0xffffff, gem: 0xfff4ec, rail: 0xffd87a,
    skyLight: 0xfff4e0, bounce: 0xa89060, hemiK: 2.1, sunK: 1.9,
    board: 0x16120e, suit: 0x1a1a1e, jacket: 0x1e5a3a, hair: 0x1a120a, shoes: 0xe0b84a, gloves: 0x1a1a1e, rim: 0xffe0b0, daze: 0,
    ywnSelf: 0.18, ywnLamps: 0.08, ywnWind: 0.15, ywnDry: 0.45,
  },
  ymNoon: { horizon: 0xffe8b0, skyGlow: 0xfff0a0, fog: 0xf8e0a8, sunK: 2.1, hemiK: 2.2 },
  ymCloud: { zenith: 0x3a4a6a, horizon: 0xb8b0a0, skyGlow: 0xd8c890, fog: 0x9a9488, fogDensity: 0.0015, sunK: 0.9, hemiK: 1.8, skyLight: 0xd8d4cc, moonDir: [0.3, 0.4, 0.8], cloud: 0x5a5e68, clouds: 0.7, ywnSelf: 0.3, ywnWind: 0.5 },
  ymEvening: { zenith: 0x3a4a8a, horizon: 0xffb890, skyGlow: 0xffa060, glowDir: [0.6, 0.06, 0.8], moonDir: [0.6, 0.1, 0.8], moon: 0xffc890, sunSize: 1.1, fog: 0xc89a80, fogDensity: 0.0013, skyLight: 0xffd0b0, bounce: 0x8a6048, hemiK: 1.9, sunK: 1.3, windowK: 1.2, lamp: 0xffc890, ywnSelf: 0.32, ywnLamps: 0.8, ywnWind: 0.2, ywnDry: 0.3 },
  ymStorm: { zenith: 0x1a2030, horizon: 0x5a5e66, skyGlow: 0x7a7a70, glowDir: [0.3, 0.3, 0.9], moonDir: [0.3, 0.5, 0.8], moon: 0xc8ccd0, sunSize: 0, fog: 0x4a4e56, fogDensity: 0.0019, rain: 0.85, ground: 0x4a5a3a, skyLight: 0x8a90a0, bounce: 0x3a3e46, hemiK: 1.6, sunK: 0.5, windowK: 1.4, cloud: 0x2a2e38, clouds: 0.95, ywnSelf: 0.42, ywnLamps: 1.0, ywnWind: 1.0, ywnDry: 0 },
  ymBath: { fog: 0x1c1c1e, fogDensity: 0.0022, rain: 0, skyLight: 0xf0dcc8, bounce: 0x6a6460, hemiK: 1.25, ywnSelf: 0.26, ywnLamps: 0.7, ywnWind: 0 },
  ymGolden: { zenith: 0x4a6aa8, horizon: 0xf4b07a, skyGlow: 0xe0904a, glowDir: [0.75, 0.08, 0.66], moonDir: [0.75, 0.14, 0.66], moon: 0xffd0a0, sunSize: 0.75, fog: 0xc8a080, fogDensity: 0.0013, rain: 0, ground: 0x6a8a3a, skyLight: 0xffe0b8, bounce: 0x8a7048, hemiK: 1.9, sunK: 1.4, windowK: 0.3, cloud: 0xffd0a0, clouds: 0.35, ywnSelf: 0.24, ywnLamps: 0.35, ywnWind: 0.25, ywnDry: 0.1 },
  ymDusk: { zenith: 0x16204a, horizon: 0xff9a78, skyGlow: 0xff8a5a, glowDir: [0.6, 0.03, 0.8], moonDir: [0.6, 0.04, 0.8], moon: 0xffb088, sunSize: 0.5, fog: 0x5a4a6a, fogDensity: 0.0012, stars: 0.35, rain: 0, ground: 0x3a4a30, skyLight: 0x8088c0, bounce: 0x4a3440, hemiK: 1.45, sunK: 0.55, windowK: 1.8, lamp: 0xffc890, cloud: 0x6a5070, clouds: 0.3, ywnSelf: 0.4, ywnLamps: 1.0, ywnWind: 0.12, ywnDry: 0 },
  // Until She Stopped Fighting: a mill town at night, the works lit by their own metal; steam; the
  // cooling yard under the stars and the silence; the cast; morning.
  swNight: {
    zenith: 0x04050a, horizon: 0x14121c, skyGlow: 0x4a2a1a, glowDir: [0.3, 0.05, 1], skyline: 0x08080c, moonDir: [-0.4, 0.5, 0.75], moon: 0xc8ccd8,
    fog: 0x0c0a0c, fogDensity: 0.0016, stars: 0.3, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 0.6,
    ground: 0x262022, street: 0x2a1a14, roof: 0x1a1a1e, wall: 0x2a2a2e, tree: 0x0c0c0c,
    window: 0xffa860, windowAlt: 0xff7a3a, lamp: 0xffb070,
    ribbon: 0x0e0c0c, edge: 0xffe0c0, fret: 0xff8a3a, glow: 0xff7a2a, hold: 0xff6a1a, gate: 0xffffff, gem: 0xffa040,
    skyLight: 0x6a6a7a, bounce: 0x3a2018, hemiK: 1.6, sunK: 0.5,
    board: 0x16120e, suit: 0x1a1a1e, jacket: 0x3a5a7a, hair: 0x1a120a, shoes: 0xd8d0c8, gloves: 0x1a1a1e, rim: 0xffb070, daze: 0,
  },
  swPour: { skyGlow: 0xff6a1a, skyLight: 0xffa060, bounce: 0x6a2a10, hemiK: 1.9, fog: 0x2a120a },
  swSteam: { fog: 0x3a3a40, fogDensity: 0.0026, skyLight: 0x9a9aa8, bounce: 0x3a3a40, hemiK: 1.5, skyGlow: 0x6a6a7a },
  swMill: { skyGlow: 0xff5a1a, skyLight: 0xe88a5a, bounce: 0x5a2010, hemiK: 1.8, fog: 0x200c08 },
  swCool: { zenith: 0x060a18, horizon: 0x1a2440, skyGlow: 0x2a4a7a, stars: 0.8, skyLight: 0x6a7aa8, bounce: 0x1a2030, hemiK: 1.5, fog: 0x0a0e18, glow: 0x6a9aff, hold: 0x5a8aff },
  swBlow: { skyGlow: 0xffa040, skyLight: 0xffb070, bounce: 0x7a3a10, hemiK: 2.0, fog: 0x2a1408 },
  swCast: { horizon: 0x4a1a08, skyGlow: 0xff7a2a, skyLight: 0xffa060, bounce: 0x8a3a10, hemiK: 2.1, fog: 0x301206, glow: 0xffa040 },
  swDawn: { zenith: 0x3a4a7a, horizon: 0xe8b090, skyGlow: 0xffb070, glowDir: [0.17, 0.04, 0.98], moonDir: [0.17, 0.07, 0.98], moon: 0xffd0a0, sunSize: 1.1, stars: 0, fog: 0x9a8a88, fogDensity: 0.0013, ground: 0x3a3230, skyLight: 0xd8b8a8, bounce: 0x6a5048, hemiK: 1.9, sunK: 1.2, windowK: 0.2 },
  usfTown: { zenith: 0x04050c, horizon: 0x1a1222, skyGlow: 0x5a2a16, fog: 0x0e0a10, fogDensity: 0.0015, stars: 0.6, windowK: 1.6, window: 0xffb070, windowAlt: 0xffd8a0, lamp: 0xffa040, skyLight: 0x6a6a8a, bounce: 0x3a2418, hemiK: 1.7 },
  usfFalseDawn: { skyGlow: 0xffa040, horizon: 0x6a2a10, skyLight: 0xffb070, bounce: 0x7a3a10, hemiK: 2.1, fog: 0x3a1a0a, glowDir: [0.3, 0.08, 1] },
  usfSilence: { zenith: 0x04060e, horizon: 0x101828, skyGlow: 0x1a2a4a, stars: 1.0, skyLight: 0x4a5a7a, bounce: 0x0a0e18, hemiK: 1.3, fog: 0x080a12, glow: 0x8ab0ff, hold: 0x7aa0ff, edge: 0xdfe8ff },
  // So Pretty When You Cry at the Abortion Center: the street outside at night, then a selfie museum
  // room by room, and an open pastel sky when the walls come down.
  spNight: {
    zenith: 0x0a0814, horizon: 0x2a1a34, skyGlow: 0x8a3a7a, glowDir: [0.2, 0.06, 1], skyline: 0x0e0a14, moonDir: [-0.4, 0.5, 0.75], moon: 0xffe8f4,
    fog: 0x120c18, fogDensity: 0.0017, stars: 0.4, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1,
    ground: 0x14101a, street: 0xffa8d0, roof: 0x2a1828, wall: 0x3a2a3a, tree: 0x101410,
    window: 0xffc8e0, windowAlt: 0xff9ac8, lamp: 0xffc0e0,
    ribbon: 0x1a0e18, edge: 0xfff0f8, fret: 0xff7ac8, glow: 0xff6ab8, hold: 0xff5aa8, gate: 0xffffff, gem: 0xff4a8a,
    skyLight: 0x9a8ab0, bounce: 0x3a2030, hemiK: 1.8, sunK: 0.6,
    board: 0x16101a, suit: 0x1a1a24, jacket: 0x8a4ad8, hair: 0x2a1a10, shoes: 0xffd8ec, gloves: 0x1a1a24, rim: 0xffc8e8, daze: 0,
  },
  spLace: { fog: 0x2a1420, fogDensity: 0.0022, skyLight: 0xffd0e4, bounce: 0x6a3a50, hemiK: 1.9 },
  spPink: { fog: 0x2a1022, fogDensity: 0.0022, skyLight: 0xffb8d8, bounce: 0x7a3a5a, hemiK: 2.0, glow: 0xff5aa8 },
  spMint: { fog: 0x14221c, fogDensity: 0.0022, skyLight: 0xe8fff4, bounce: 0x3a6a5a, hemiK: 1.9 },
  spNeon: { fog: 0x0a0610, fogDensity: 0.0024, skyLight: 0x7a5aa8, bounce: 0x2a1040, hemiK: 1.3, glow: 0xc86aff, hold: 0xff5ad8 },
  spPit: { fog: 0x2a2410, fogDensity: 0.0022, skyLight: 0xfff0c0, bounce: 0x7a6a30, hemiK: 2.0 },
  spGold: { fog: 0x0e1020, fogDensity: 0.0022, skyLight: 0xe8d0a0, bounce: 0x3a3020, hemiK: 1.7, glow: 0xffc060 },
  spWhite: { fog: 0x241e30, fogDensity: 0.002, skyLight: 0xe8dcf4, bounce: 0x6a5a7a, hemiK: 1.8 },
  spSky: { zenith: 0x5a8ae8, horizon: 0xffe0f0, skyGlow: 0xfff0f8, glowDir: [0.3, 0.3, 0.9], moonDir: [0.3, 0.5, 0.8], moon: 0xfff8f0, sunSize: 0.9, stars: 0, fog: 0xf0d8e8, fogDensity: 0.001, ground: 0xf0c8d8, skyLight: 0xfff4fa, bounce: 0x9a7a8a, hemiK: 2.1, sunK: 1.6, windowK: 0.1 },
  // Overdose Aesthetic: a red carpet at night in pink and siren light; porcelain blue, the gilded
  // trinity, the hall of mirrors, and a pale morning when it's over.
  oaNight: {
    zenith: 0x0a0410, horizon: 0x2a0a24, skyGlow: 0x8a2a6a, glowDir: [0.2, 0.06, 1], skyline: 0x10060e, moonDir: [-0.4, 0.5, 0.75], moon: 0xffd8ec,
    fog: 0x14060e, fogDensity: 0.0017, stars: 0.4, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1,
    ground: 0x12080e, street: 0xff8ac0, roof: 0x2a1020, wall: 0x3a1a2a, tree: 0x140810,
    window: 0xffb8d8, windowAlt: 0xff8ab8, lamp: 0xffb8d8,
    ribbon: 0x4a0612, edge: 0xffe0ec, fret: 0xff5a9a, glow: 0xff4a8a, hold: 0xff3a6a, gate: 0xffffff, gem: 0xe8f4ff,
    skyLight: 0x9a6a9a, bounce: 0x3a1020, hemiK: 1.8, sunK: 0.6,
    board: 0x16101a, suit: 0x0a0a0e, jacket: 0xff3a8a, hair: 0x1a0a10, shoes: 0xffd8ec, gloves: 0x0a0a0e, rim: 0xffb8e0, daze: 0,
  },
  oaFlash: { skyGlow: 0xff5aa8, skyLight: 0xc88ab8, hemiK: 2.0, fog: 0x1c0814 },
  oaPink: { horizon: 0x4a0a34, skyGlow: 0xff4a9a, skyLight: 0xe89ac8, hemiK: 2.1, fog: 0x24081a, glow: 0xff6ab8 },
  oaPorcelain: { horizon: 0x1a2a4a, skyGlow: 0x6a8aff, skyLight: 0xb8c8ff, bounce: 0x2a3a5a, hemiK: 1.8, fog: 0x0a1020, glow: 0x8ab8ff, hold: 0x6a9aff, ribbon: 0x0e1430, fret: 0x8ab8ff },
  oaGold: { horizon: 0x3a2008, skyGlow: 0xffb04a, skyLight: 0xe8c08a, bounce: 0x4a3010, hemiK: 2.0, fog: 0x1a1006, glow: 0xffc060, hold: 0xffa040, fret: 0xffc060 },
  oaMirror: { fog: 0x1a0c12, fogDensity: 0.0022, skyLight: 0xd8b0c4, bounce: 0x4a2a38, hemiK: 1.7, glow: 0xffd8ec },
  oaDawn: { zenith: 0x4a5a9a, horizon: 0xffc8d8, skyGlow: 0xffb8c8, glowDir: [0.4, 0.04, 0.9], moonDir: [0.4, 0.08, 0.9], moon: 0xffe0e8, sunSize: 0.9, stars: 0, fog: 0xd8b8c0, fogDensity: 0.0012, ground: 0x3a2a30, skyLight: 0xffe0e8, bounce: 0x8a6a70, hemiK: 2.0, sunK: 1.2, windowK: 0.2, ribbon: 0x5a1a24, glow: 0xffb8d8, hold: 0xff8ab0 },
  // Make It A No: his street at night with every window lit, lamplight indoors, the quiet afterwards,
  // and a field at sunrise.
  mnNight: {
    zenith: 0x05060f, horizon: 0x1c1a36, skyGlow: 0x3a3060, glowDir: [0.2, 0.08, 1], skyline: 0x0a0a16, moonDir: [-0.4, 0.5, 0.75], moon: 0xe8e4ff,
    fog: 0x100e1c, fogDensity: 0.0017, stars: 0.5, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1,
    ground: 0x16141c, street: 0xffb870, roof: 0x2a2030, wall: 0x3a3040, tree: 0x0c140e,
    window: 0xffc880, windowAlt: 0xffa860, lamp: 0xffc070,
    ribbon: 0x0e0c10, edge: 0xfff0dc, fret: 0xffc070, glow: 0xffb050, hold: 0xffa040, gate: 0xffffff, gem: 0xffd080,
    skyLight: 0x8a88b0, bounce: 0x3a2a24, hemiK: 1.8, sunK: 0.6,
    board: 0x16120e, suit: 0x1a1a24, jacket: 0x2a4a9a, hair: 0x2a1a10, shoes: 0xf4f0f8, gloves: 0x1a1a24, rim: 0xffd8a0, daze: 0,
  },
  mnHome: { fog: 0x1c140c, fogDensity: 0.0022, skyLight: 0xffd8a8, bounce: 0x5a3a20, hemiK: 1.9, lamp: 0xffc070 },
  mnHall: { fog: 0x14140c, fogDensity: 0.0024, skyLight: 0xf0d8a8, bounce: 0x4a3a20, hemiK: 1.8 },
  mnKitchen: { fog: 0x1a1810, fogDensity: 0.0022, skyLight: 0xe0d0b0, bounce: 0x5a4a30, hemiK: 1.7 },
  mnQuiet: { fog: 0x0e0c14, fogDensity: 0.0024, skyLight: 0x8a7aa0, bounce: 0x2a2030, hemiK: 1.4, lamp: 0xffb060 },
  mnDawn: { zenith: 0x3a4a8a, horizon: 0xffc0a0, skyGlow: 0xffb070, glowDir: [0.4, 0.04, 0.9], moonDir: [0.4, 0.08, 0.9], moon: 0xffd0a0, sunSize: 1.0, stars: 0, fog: 0xc89a90, fogDensity: 0.0012, ground: 0x3a4a2a, tree: 0x2a3a22, skyLight: 0xffd8c8, bounce: 0x7a5a48, hemiK: 2.0, sunK: 1.4, window: 0xfff0d8, lamp: 0xffd090, windowK: 0.3 },
  mnMorning: { zenith: 0x4a7ad0, horizon: 0xffe0c0, skyGlow: 0xfff0c0, glowDir: [0.4, 0.15, 0.9], moonDir: [0.4, 0.2, 0.9], moon: 0xfff4e0, sunSize: 0.9, stars: 0, fog: 0xd8c8b8, fogDensity: 0.001, ground: 0x4a6a32, tree: 0x2a4a2a, skyLight: 0xfff0e0, bounce: 0x8a7a60, hemiK: 2.1, sunK: 1.7, window: 0xfff0d8, lamp: 0xffd090, windowK: 0.1 },
  // I FUCKED YOUR DAD: the suburb at night, the supermarket's white light, the fire, a summer night,
  // dusk on the lawns, Christmas snow, a bright day, Thanksgiving's gold, rain in the yard, dawn.
  fdNight: {
    zenith: 0x060814, horizon: 0x1a1a30, skyGlow: 0x3a2a4a, glowDir: [0.3, 0.06, 1], skyline: 0x0a0a14, moonDir: [-0.35, 0.55, 0.75], moon: 0xd8e0ff,
    fog: 0x0e0e18, fogDensity: 0.0018, stars: 0.4, sunSize: 0, snow: 0, snowGround: 0, rain: 0,
    ground: 0x101810, street: 0xffc070, roof: 0x2a2030, wall: 0x3a3040, tree: 0x0c140e,
    window: 0xffd090, windowAlt: 0xffa070, lamp: 0xffc070,
    ribbon: 0x0c0a0c, edge: 0xfff0e8, fret: 0xff5a4a, glow: 0xffa040, hold: 0xff6a4a, gate: 0xffffff, gem: 0xff3a2a,
    skyLight: 0x7a7aa0, bounce: 0x3a2a24, hemiK: 1.9, sunK: 0.6,
    board: 0x16120e, suit: 0x101014, jacket: 0xff5a4a, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x101014, rim: 0xffb0a0, daze: 0,
  },
  fdMarket: { fog: 0x1a2024, fogDensity: 0.0024, skyLight: 0xe8f4ff, bounce: 0x6a7a80, hemiK: 2.0, lamp: 0xe8f8ff },
  fdFire: { fog: 0x2a1008, horizon: 0x4a1a10, skyGlow: 0xff6a2a, skyLight: 0xff8a4a, bounce: 0x5a2010, hemiK: 1.8, glow: 0xff6a1a, hold: 0xff4a1a },
  fdSummer: { zenith: 0x0a0a20, horizon: 0x3a2a3a, skyGlow: 0xff8a5a, fog: 0x1a1418, skyLight: 0xa898b0, bounce: 0x4a3a30, hemiK: 2.0, stars: 0.6 },
  fdDusk: { zenith: 0x2a3a7a, horizon: 0xff9a6a, skyGlow: 0xffa860, glowDir: [0.6, 0.05, 0.8], moonDir: [0.6, 0.1, 0.8], moon: 0xffb080, sunSize: 0.8, stars: 0, fog: 0x8a6a6a, fogDensity: 0.0014, ground: 0x2a4a22, skyLight: 0xd8a8a0, bounce: 0x6a4a3a, hemiK: 1.9, sunK: 1.2 },
  fdWinter: { zenith: 0x081020, horizon: 0x2a3a5a, skyGlow: 0x4a6a9a, stars: 0.2, fog: 0x2a3448, fogDensity: 0.0018, snow: 0.9, snowGround: 0.8, ground: 0xc8d0e0, skyLight: 0x8a9ac8, bounce: 0x4a5a7a, hemiK: 1.8 },
  fdDay: { zenith: 0x3a7ad8, horizon: 0xc8e0f0, skyGlow: 0xfff0c0, glowDir: [0.3, 0.3, 0.9], moonDir: [0.3, 0.6, 0.8], moon: 0xfff4e0, sunSize: 0.8, stars: 0, fog: 0xb8d0e0, fogDensity: 0.0011, ground: 0x3a6a2a, tree: 0x2a5a2a, skyLight: 0xe0f0ff, bounce: 0x7a8a6a, hemiK: 2.0, sunK: 1.6, window: 0xd8e0e8, lamp: 0xfff0d0 },
  fdRain: { zenith: 0x3a4048, horizon: 0x6a7078, skyGlow: 0x8a9098, glowDir: [0.3, 0.3, 0.9], moonDir: [0.3, 0.6, 0.8], moon: 0xc8ccd8, sunSize: 0, stars: 0, fog: 0x4a5058, fogDensity: 0.0018, rain: 0.9, ground: 0x2a3a2a, skyLight: 0x7a8090, bounce: 0x3a4048, hemiK: 1.6, sunK: 0.5 },
  fdDawn: { zenith: 0x3a4a8a, horizon: 0xffb8a0, skyGlow: 0xffa080, glowDir: [0.5, 0.05, 0.85], moonDir: [0.5, 0.1, 0.85], moon: 0xffc8a0, sunSize: 0.9, stars: 0, fog: 0xa88a8a, fogDensity: 0.0013, ground: 0x2a3a24, skyLight: 0xd8b8c0, bounce: 0x6a4a40, hemiK: 1.9, sunK: 1.2 },
  // Good Girls Don't Fight Back: the frozen pond at night under the stars, the silence, the aurora as
  // the band comes in, purple for the rules, pink and gold for the carousel, the peak's light from
  // under the ice, and dawn over open water at the end.
  ggIce: {
    zenith: 0x02040c, horizon: 0x0a1a2e, skyGlow: 0x2a8a8a, glowDir: [0.3, 0.1, 1], skyline: 0x050a12, moonDir: [-0.3, 0.6, 0.75], moon: 0xc8e0ff,
    fog: 0x06101c, fogDensity: 0.0012, stars: 1.0, sunSize: 0, snow: 0.4, hills: 0,
    ground: 0x0a1420, street: 0x8ae8ff, roof: 0x0a1018, wall: 0x1a2a3a, tree: 0x081014,
    window: 0x8ae8ff, windowAlt: 0x8ae8ff, lamp: 0xc8f0ff,
    ribbon: 0x06080c, edge: 0xe0faff, fret: 0x7ae8ff, glow: 0x5ad8ff, hold: 0x8a6aff, gate: 0xffffff, gem: 0xd8f8ff,
    skyLight: 0x4a6a9a, bounce: 0x0a1a2a, hemiK: 1.6, sunK: 0.6,
    board: 0x0e1218, suit: 0x0c1018, jacket: 0x7ae8ff, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0c1018, rim: 0xb8f0ff, daze: 0,
  },
  ggBand: { horizon: 0x1a3a4a, skyGlow: 0x4affc0, skyLight: 0x6a8ab8, hemiK: 1.9, snow: 0.6, glow: 0x5ae8ff, hold: 0x8a6aff },
  ggLoud: { horizon: 0x2a1a4a, skyGlow: 0x8a4aff, skyLight: 0x7a7ac8, hemiK: 1.9, snow: 0.8, glow: 0x6ae8ff, hold: 0xc86aff },
  ggPeak: { horizon: 0x24405e, skyGlow: 0x6affe8, fog: 0x082434, fogDensity: 0.001, skyLight: 0x8ac8f0, hemiK: 2.0, snow: 1.0, glow: 0x66dcf6, hold: 0x4affc0 },
  ggLala: { horizon: 0x3a1a3a, skyGlow: 0xff8ac8, skyLight: 0x8a7ab8, hemiK: 2.0, snow: 0.7, glow: 0x9ae8ff, hold: 0xffd28a },
  // the end: open water toward morning, the sky going rose and gold low down ahead
  ggEnd: { zenith: 0x101c44, horizon: 0xd8907a, skyGlow: 0xffb08a, glowDir: [-0.12, 0.06, 1], moonDir: [-0.12, 0.14, 1], moon: 0xffd2b0, sunSize: 0.55, stars: 0.12, fog: 0x3a3a54, fogDensity: 0.0011, snow: 0.15, skyLight: 0xa8a0c8, bounce: 0x4a3a44, hemiK: 2.0, sunK: 0.9, glow: 0x8ae8ff, hold: 0xff9ac8 },
  // ETYMOLOGY OF SCREAMS: the wet street at night, the stacks in candlelight, the archive's green
  // lamps, the scriptorium's cold windows, the storm outside, its red, and the reading room.
  eyNight: {
    zenith: 0x05060c, horizon: 0x1a1a28, skyGlow: 0x4a3a5a, glowDir: [0.3, 0.1, 1], skyline: 0x0a0a10, moonDir: [-0.3, 0.6, 0.7], moon: 0x8aa8ff,
    fog: 0x0e0e16, fogDensity: 0.0022, stars: 0, sunSize: 0, rain: 0.9,
    ground: 0x0c0c10, street: 0xffb860, roof: 0x14141a, wall: 0x2a2a30, tree: 0x0a0c0a,
    window: 0xffc070, windowAlt: 0xffa060, lamp: 0xffb860,
    ribbon: 0x0c0a0a, edge: 0xffe8c8, fret: 0xe8c070, glow: 0xff6a3a, hold: 0xffa040, gate: 0xffffff, gem: 0xfff0d0,
    skyLight: 0x5a5a7a, bounce: 0x2a2018, hemiK: 1.5, sunK: 0.4,
    board: 0x16120e, suit: 0x101014, jacket: 0xe8c070, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x101014, rim: 0xffd890, daze: 0,
  },
  eyStacks: { fog: 0x1a1008, fogDensity: 0.0024, rain: 0, skyLight: 0xffc890, bounce: 0x4a2a14, hemiK: 1.7, lamp: 0xffb860 },
  eyArchive: { fog: 0x100c08, fogDensity: 0.0026, rain: 0, skyLight: 0xffe0b0, bounce: 0x2a2014, hemiK: 1.5, lamp: 0xa8ffb0 },
  eyScript: { fog: 0x0a0c14, fogDensity: 0.0024, rain: 0, skyLight: 0x8a9ac8, bounce: 0x1a1a2a, hemiK: 1.4, moon: 0x8aa8ff },
  eyStorm: { zenith: 0x0e0a1c, horizon: 0x3a2a5a, skyGlow: 0x8a5aaa, fog: 0x1c1428, fogDensity: 0.0019, rain: 1.0, skyLight: 0x7a6a9a, bounce: 0x2a1a24, hemiK: 1.6 },
  eyReading: { fog: 0x1a1006, fogDensity: 0.0022, rain: 0, skyLight: 0xffd8a0, bounce: 0x5a3a18, hemiK: 1.8, lamp: 0xffc070 },
  // Cunt Holiday: golden hour on the drive, the bright afternoon at the pool, the lobby's cream and
  // gold, the bar's green, the hall, sunset, the marina at night, and the dawn the boat leaves in.
  chGold: {
    zenith: 0x4a6ab0, horizon: 0xffc890, skyGlow: 0xffa860, glowDir: [-0.6, 0.1, 0.8], skyline: 0x5a4a5a, moonDir: [-0.6, 0.14, 0.8], moon: 0xffd8a0,
    fog: 0xe8b898, fogDensity: 0.0012, stars: 0, sunSize: 1.0, hills: 0, windowK: 0.1,
    ground: 0x3a5a2a, sand: 0xd8c098, water: 0x1a4a6a, street: 0xffd8a0, roof: 0xe8dcc4, wall: 0xefe6d4, tree: 0x2a4a22,
    window: 0xffd8a0, windowAlt: 0xffb070, lamp: 0xffd8a0,
    ribbon: 0x1a1418, edge: 0xfff4e8, fret: 0xff8ab8, glow: 0xffb040, hold: 0xff9a3a, gate: 0xffffff, gem: 0xffd860,
    skyLight: 0xd8c8b8, bounce: 0x8a6a48, hemiK: 1.9, sunK: 1.5,
    board: 0xf4f0e8, suit: 0xf4f0f8, jacket: 0xff8ab8, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0xf4f0f8, rim: 0xffd8b0, daze: 0,
  },
  chPool: { zenith: 0x2a7ad8, horizon: 0xbfe0f4, skyGlow: 0xfff0c0, glowDir: [-0.3, 0.4, 0.8], moonDir: [-0.3, 0.5, 0.8], moon: 0xfff4e0, sunSize: 0.8, fog: 0xc8e0f0, fogDensity: 0.001, sunK: 1.8, hemiK: 2.1, skyLight: 0xe8f0ff, bounce: 0x8aa0a8, windowK: 0, water: 0x1a6a8a, skyline: 0x6a7a8a },
  chLobby: { fog: 0x3a2a1c, fogDensity: 0.0022, skyLight: 0xffe0c0, bounce: 0x6a4a30, hemiK: 1.8, lamp: 0xffd090 },
  chBar: { fog: 0x14201a, fogDensity: 0.0024, skyLight: 0xd8e0b0, bounce: 0x2a3a20, hemiK: 1.6, lamp: 0xffc070 },
  chHall: { fog: 0x2a1a10, fogDensity: 0.0024, skyLight: 0xffd0a0, bounce: 0x5a3a20, hemiK: 1.7, lamp: 0xffc890 },
  chSunset: { zenith: 0x3a2a6a, horizon: 0xff9a6a, skyGlow: 0xff6a5a, glowDir: [-0.7, 0.03, 0.7], moonDir: [-0.7, 0.06, 0.7], moon: 0xff9a6a, sunSize: 1.2, fog: 0xd88a7a, fogDensity: 0.0013, sunK: 1.3, hemiK: 1.7, skyLight: 0xd8a0a8, bounce: 0x7a4a4a, windowK: 0.5, lamp: 0xffc080, water: 0x3a3a5a, skyline: 0x3a2a3a },
  chNight: {
    zenith: 0x04081a, horizon: 0x1a2a4a, skyGlow: 0x3a5a9a, glowDir: [-0.5, 0.2, 0.8], moonDir: [-0.4, 0.5, 0.75], moon: 0xd8e8ff, sunSize: 0, stars: 0.9, hills: 0.8, windowK: 1,
    fog: 0x0a1428, fogDensity: 0.0018, ground: 0x0a140c, sand: 0x3a3a3a, water: 0x0a1a2a, skyline: 0x060a14,
    skyLight: 0x4a5a8a, bounce: 0x1a1a2a, hemiK: 1.5, sunK: 0.5, lamp: 0xffd090,
  },
  chDawn: {
    zenith: 0x3a5aa0, horizon: 0xffc0a8, skyGlow: 0xffb080, glowDir: [0.6, 0.06, 0.8], moonDir: [0.6, 0.12, 0.8], moon: 0xffd8b0, sunSize: 0.9, stars: 0, hills: 0.2, windowK: 0.3,
    fog: 0xd8b0b0, fogDensity: 0.0012, ground: 0x3a4a30, sand: 0xc8b090, water: 0x2a4a6a, skyline: 0x6a5a6a,
    skyLight: 0xd8c0d0, bounce: 0x8a6a60, hemiK: 1.9, sunK: 1.3, lamp: 0xffd8b0,
  },
  // Come Countdown: the pad at night under the floodlights, the pressure, the stage's red, ready-set-go
  // in the dark and the red of no show, the chorus lit up, the curtain, the nerves, mission control's
  // blue, lights out, before dawn, morning, Houston's red, the quiet after, and the last of it in the sun.
  ccNight: {
    zenith: 0x03060f, horizon: 0x142238, skyGlow: 0x3a6a9a, glowDir: [0.3, 0.06, 1], skyline: 0x060a12, moonDir: [-0.35, 0.55, 0.75], moon: 0xd8e8ff,
    fog: 0x0a1424, fogDensity: 0.0019, stars: 0.8, sunSize: 0, hills: 0.6,
    ground: 0x0c100e, street: 0xd8e4ff, roof: 0x141a22, wall: 0x2a303a, tree: 0x0a0e0c,
    window: 0xd8e8ff, windowAlt: 0xffb070, lamp: 0xd8e8ff,
    ribbon: 0x0a0e16, edge: 0xe0f0ff, fret: 0x7ad0ff, glow: 0xff8a3a, hold: 0xffb040, gate: 0xffffff, gem: 0xffe08a,
    skyLight: 0x4a5a80, bounce: 0x1a2028, hemiK: 1.7, sunK: 0.5, smoke: 0xc8d4e8,
    board: 0x0e1016, suit: 0x0c0e14, jacket: 0x7ad0ff, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0c0e14, rim: 0xa8e0ff, daze: 0,
  },
  ccPressure: { fog: 0x1a1018, horizon: 0x2a1a2a, skyGlow: 0xff6a4a, skyLight: 0x6a4a5a, bounce: 0x2a1418, glow: 0xff5a3a, hold: 0xff8040 },
  ccStage: { fog: 0x1a0a10, horizon: 0x2a0e18, skyLight: 0x8a4a50, bounce: 0x2a0a0a, hemiK: 1.5, glow: 0xff4a4a, hold: 0xff7040 },
  ccTree: { fog: 0x05080e, fogDensity: 0.0024, horizon: 0x0a1220, skyLight: 0x2a3040, bounce: 0x0a0c10, hemiK: 1.1, stars: 1 },
  ccNoShow: { fog: 0x14060a, fogDensity: 0.0024, horizon: 0x2a0a10, skyLight: 0x4a1a20, bounce: 0x1a0606, hemiK: 1.1, glow: 0xff3a2a, fret: 0xff6a5a, hold: 0xff5a3a },
  ccChorus: { fog: 0x101c30, fogDensity: 0.0016, horizon: 0x1c3050, skyGlow: 0x5a9ad8, skyLight: 0x6a7ab0, bounce: 0x202838, hemiK: 2.0, fret: 0x8ae0ff, glow: 0xffa040, stars: 0.6 },
  ccCurtain: { fog: 0x1e0a12, horizon: 0x3a1020, skyLight: 0x9a4a5a, bounce: 0x3a0a10, hemiK: 1.8, glow: 0xff4a4a, fret: 0xffc0a0, hold: 0xff7050 },
  ccNerves: { fog: 0x081018, fogDensity: 0.0022, skyLight: 0x3a4a6a, bounce: 0x10161e, hemiK: 1.4, fret: 0x6ab0e0 },
  ccControl: { fog: 0x060e18, fogDensity: 0.0024, stars: 0, skyLight: 0x6aa8d8, bounce: 0x0a1a2a, hemiK: 1.6, lamp: 0x7ad0ff, fret: 0x7ad0ff, glow: 0xffb040 },
  ccLightsOut: { fog: 0x020408, fogDensity: 0.0034, skyLight: 0x1a2030, bounce: 0x040608, hemiK: 0.8, fret: 0x5a90c0 },
  ccPreDawn: { zenith: 0x0a1230, horizon: 0x3a3a60, skyGlow: 0xff8a6a, glowDir: [0.3, 0.04, 1], fog: 0x14182a, fogDensity: 0.0018, stars: 0.4, skyLight: 0x5a5a88, bounce: 0x2a2030, hemiK: 1.7 },
  ccMorning: {
    zenith: 0x3a5aa0, horizon: 0xffb898, skyGlow: 0xffc080, glowDir: [0.3, 0.08, 1], moonDir: [0.3, 0.1, 1], moon: 0xffe0c0, sunSize: 0.9, stars: 0, hills: 0,
    fog: 0x8a7a8a, fogDensity: 0.0013, skyLight: 0xc0b8d8, bounce: 0x7a6050, hemiK: 1.9, sunK: 1.3,
    ground: 0x4a4a38, street: 0xffe0b0, lamp: 0xffe0b0, ribbon: 0x1a1a22, edge: 0xffffff, fret: 0x3aa0e0, glow: 0xff7a3a, hold: 0xff9a30, skyline: 0x5a5060,
  },
  // Back by Popular Demand: a June night in the alley, the room next door, the street's party bulbs,
  // the hallway, red velvet and gold, the spotlight, the dressing room's bulbs, the party, the bar's
  // amber, the quiet, the stands, and the alley again toward morning.
  bpAlley: {
    zenith: 0x060a1a, horizon: 0x2a2040, skyGlow: 0xffa860, glowDir: [0.3, 0.06, 1], skyline: 0x120e1a, moonDir: [-0.4, 0.5, 0.75], moon: 0xfff0d8,
    fog: 0x1a1420, fogDensity: 0.0022, stars: 0.5, sunSize: 0,
    ground: 0x0e0c10, street: 0xffc070, roof: 0x1a141a, wall: 0x3a2a2a, tree: 0x101410,
    window: 0xffd090, windowAlt: 0xff9a6a, lamp: 0xffc070,
    ribbon: 0x14100e, edge: 0xfff0d0, fret: 0xf0c860, glow: 0xff8a50, hold: 0xffb040, gate: 0xffffff, gem: 0xfff0c0,
    skyLight: 0x6a5a7a, bounce: 0x3a2a24, hemiK: 1.7, sunK: 0.6,
    board: 0x16120e, suit: 0x101014, jacket: 0xf0c860, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x101014, rim: 0xffd890, daze: 0,
  },
  bpNext: { fog: 0x1a1210, fogDensity: 0.0026, stars: 0, skyLight: 0xc8a888, bounce: 0x4a3024, hemiK: 1.4, lamp: 0xffc890, glow: 0xff8a50 },
  bpStreet: { zenith: 0x080a1e, horizon: 0x3a2048, skyGlow: 0xff7aa0, fog: 0x22142a, fogDensity: 0.0019, stars: 0.4, skyLight: 0x8a6aa0, bounce: 0x4a2a2a, hemiK: 1.8, lamp: 0xffd070, street: 0xffd070, window: 0xffd890, windowAlt: 0xff8ac0, glow: 0xff5a8a, hold: 0xffb040 },
  bpHall: { fog: 0x2a1a10, fogDensity: 0.0024, stars: 0, skyLight: 0xffd8b0, bounce: 0x5a3a24, hemiK: 1.8, lamp: 0xffc070 },
  bpClub: { fog: 0x2a0c10, fogDensity: 0.0022, stars: 0, skyLight: 0xffc0a0, bounce: 0x5a1a1a, hemiK: 1.8, lamp: 0xffb060, glow: 0xff4a5a, fret: 0xffd890 },
  bpSpot: { fog: 0x140608, fogDensity: 0.003, skyLight: 0x8a6060, bounce: 0x2a0a0a, hemiK: 1.2, lamp: 0xffd8a0, glow: 0xffd890, fret: 0xfff0d0 },
  bpDressing: { fog: 0x2a2016, fogDensity: 0.0022, skyLight: 0xfff0d8, bounce: 0x6a4a3a, hemiK: 2.0, lamp: 0xfff0c0, glow: 0xff8a50, fret: 0xf0c860 },
  bpParty: { fog: 0x1a0a20, fogDensity: 0.0022, skyLight: 0xd0a0ff, bounce: 0x4a1a4a, hemiK: 1.7, lamp: 0xff7ad8, glow: 0xff4fd8, fret: 0xffd84a, hold: 0xff6ad8 },
  bpBar: { fog: 0x241408, fogDensity: 0.0024, skyLight: 0xffc890, bounce: 0x5a3010, hemiK: 1.6, lamp: 0xffa040, glow: 0xff8a3a, fret: 0xf0c860 },
  bpQuiet: { fog: 0x060406, fogDensity: 0.0032, skyLight: 0x3a3040, bounce: 0x0a0608, hemiK: 0.9, lamp: 0xfff0d0, glow: 0xffd890, fret: 0xfff0d0, hold: 0xd8c8a0 },
  bpArena: { fog: 0x0e1020, fogDensity: 0.0018, skyLight: 0xd8e0ff, bounce: 0x2a2a3a, hemiK: 1.9, lamp: 0xffffff, glow: 0xf0c860, fret: 0xffffff, hold: 0xffb040 },
  bpStands: { fog: 0x1a1420, fogDensity: 0.0014, skyLight: 0xffe0b0, bounce: 0x4a3a2a, hemiK: 2.1, lamp: 0xffe8c0, glow: 0xf0c860, fret: 0xffffff, hold: 0xffb040 },
  bpOutro: { zenith: 0x0a1028, horizon: 0x4a3050, skyGlow: 0xff9a7a, fog: 0x241a28, fogDensity: 0.0019, stars: 0.3, skyLight: 0x7a6a8a, bounce: 0x3a2a24, hemiK: 1.8, lamp: 0xffc070 },
  bpDawn: { zenith: 0x2a3a7a, horizon: 0xf0a888, skyGlow: 0xffb070, glowDir: [0.3, 0.06, 1], moonDir: [0.3, 0.08, 1], moon: 0xffd8b0, sunSize: 0.8, stars: 0, fog: 0x7a6a7a, fogDensity: 0.0015, skyLight: 0xa8a0c0, bounce: 0x6a5048, hemiK: 1.7, sunK: 1.2, lamp: 0xffd8a0 },
  // AI GF: the city at night in her pink and teal, hushed for "why?", the freeway in the rain, the
  // street, the house's white light, the server hall, bedtime blue, Rome, the databanks, the lab,
  // version 2 in gold, the last chorus, and the dark.
  aiCity: {
    zenith: 0x04050e, horizon: 0x1c1438, skyGlow: 0xff4fd8, glowDir: [0.3, 0.06, 1], skyline: 0x0a0a18, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8e8ff,
    fog: 0x120c22, fogDensity: 0.0021, stars: 0.35, sunSize: 0,
    ground: 0x0a0a12, street: 0x8af0ff, roof: 0x141428, wall: 0x22223a, tree: 0x0e1414,
    window: 0x8af0ff, windowAlt: 0xff8ae0, lamp: 0xffb0e8,
    ribbon: 0x0c0a18, edge: 0xd8fbff, fret: 0x46f0e0, glow: 0xff4fd8, hold: 0xff5ad8, gate: 0xffffff, gem: 0x7af8ee,
    skyLight: 0x5a5aa0, bounce: 0x2a1a3a, hemiK: 1.7, sunK: 0.6,
    board: 0x0e0c16, suit: 0x0c0c14, jacket: 0x46f0e0, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0c0c14, rim: 0xff9ae8, daze: 0,
  },
  aiHush: { fog: 0x0a0814, fogDensity: 0.0026, skyLight: 0x3a3a6a, hemiK: 1.3, window: 0x4a6a8a, windowAlt: 0x6a4a6a, lamp: 0x8a7aa0, street: 0x5a8a9a },
  aiRain: { zenith: 0x05070e, horizon: 0x1e2232, skyGlow: 0x5a6a9a, fog: 0x161a28, fogDensity: 0.0026, stars: 0, rain: 0.85, skyLight: 0x4a5a80, bounce: 0x22222e, hemiK: 1.6, street: 0xffb070, lamp: 0xffb070, window: 0xffc890, windowAlt: 0xff8ad8, edge: 0xd0e8ff },
  aiStreet: { zenith: 0x06060e, horizon: 0x2a1a36, skyGlow: 0xff6ad8, fog: 0x1a1426, fogDensity: 0.0022, rain: 0.45, stars: 0, skyLight: 0x5a4a80, bounce: 0x2a1a2a, hemiK: 1.7, street: 0xffc890, lamp: 0xffc890, window: 0xffc890, windowAlt: 0xff8ae0 },
  aiHome: { fog: 0x2a2430, fogDensity: 0.0022, rain: 0, stars: 0, skyLight: 0xfff0f4, bounce: 0x6a5048, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0e0, glow: 0xff4fd8, fret: 0x46f0e0, edge: 0xffffff },
  aiServers: { fog: 0x040a12, fogDensity: 0.0026, rain: 0, skyLight: 0x5ad8ff, bounce: 0x2a0a3a, hemiK: 1.5, lamp: 0x46f0e0, glow: 0xff4fd8, fret: 0x46f0e0, edge: 0xe0ffff, hold: 0xff4fd8 },
  aiNight: { fog: 0x080c22, fogDensity: 0.0028, rain: 0, skyLight: 0x6a78d8, bounce: 0x141838, hemiK: 1.3, lamp: 0xffc8a0, glow: 0xb070ff, fret: 0xc8d0ff, edge: 0xe0e4ff, hold: 0xb070ff },
  aiRome: { fog: 0x14182a, fogDensity: 0.0022, skyLight: 0xe8eeff, bounce: 0x4a4a5a, hemiK: 1.8, lamp: 0xffe8c0, glow: 0x7ab8ff, fret: 0xffe8c0, edge: 0xffffff, hold: 0xffc860 },
  aiBanks: { fog: 0x060c1a, fogDensity: 0.0018, skyLight: 0x5ab8ff, bounce: 0x1a1040, hemiK: 1.5, lamp: 0x46f0e0, glow: 0x46f0e0, fret: 0x8af8ff, edge: 0xe0ffff, hold: 0xff4fd8 },
  aiLab: { fog: 0x1a2632, fogDensity: 0.0021, skyLight: 0xf0fbff, bounce: 0x5a6a7a, hemiK: 2.1, lamp: 0xe8ffff, glow: 0xff4fd8, fret: 0x46f0e0, edge: 0xffffff, hold: 0xff4fd8 },
  aiV2: { fog: 0x1a1006, fogDensity: 0.0024, skyLight: 0xffe0a0, bounce: 0x4a2a10, hemiK: 1.7, lamp: 0xffd060, glow: 0xffc83a, fret: 0xfff0c0, edge: 0xfff8e8, hold: 0xffb020 },
  aiFinal: { fog: 0x14061a, fogDensity: 0.0022, skyLight: 0xff9ae8, bounce: 0x3a0a3a, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x46f0e0, edge: 0xffffff, hold: 0xff4fd8 },
  aiDark: { fog: 0x040408, fogDensity: 0.0034, skyLight: 0x3a3a5a, bounce: 0x0a0a10, hemiK: 1.0, lamp: 0x8ab8ff, glow: 0xff4fd8, fret: 0xd0d8ff, edge: 0xe0e8ff, hold: 0x8a8ab0 },
  aiOff: { fog: 0x020204, fogDensity: 0.0036, skyLight: 0x2a2a40, bounce: 0x060608, hemiK: 0.8, lamp: 0x6a8aff, glow: 0x8a8ab0, fret: 0xb0b8d8, edge: 0xc8d0e8 },
  // Spiked: the street in neon, the lounge sweet and clean, the floor in the dark; then losing
  // focus: red, the corridors, the phones' light, the sick green, nothing, red emergency light,
  // the house lights, and the sun coming up
  spkStreet: {
    zenith: 0x05040c, horizon: 0x1c1430, skyGlow: 0x8a4aff, glowDir: [0.3, 0.05, 1], skyline: 0x0c0a16, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8d0ff,
    fog: 0x140e22, fogDensity: 0.0022, stars: 0.4, sunSize: 0, snow: 0, snowGround: 0, rain: 0,
    ground: 0x0a0810, street: 0xff8a5a, roof: 0x1a1424, wall: 0x2a2234, tree: 0x0e1410,
    window: 0xff9ad8, windowAlt: 0x8ad8ff, lamp: 0xffa860, windowK: 1.8,
    ribbon: 0x120a1c, edge: 0xd0c4ff, fret: 0x9fe8ff, glow: 0xff4fd8, hold: 0x8a6aff, gate: 0xffffff, rail: 0xff4a9a,
    skyLight: 0x5a4a8a, bounce: 0x2a1a2a, hemiK: 1.7, sunK: 0.6,
    board: 0x14101c, suit: 0x0e0a14, jacket: 0x6a4ad8, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0e0a14, rim: 0xc0a8ff, daze: 0,
  },
  spkClub: { fog: 0x120a20, fogDensity: 0.0028, stars: 0, skyLight: 0x8a6aff, bounce: 0x2a1040, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x40d8ff, daze: 0 },
  spkLounge: { fog: 0x2a1424, fogDensity: 0.0022, stars: 0, skyLight: 0xffd8ec, bounce: 0x6a3a5a, hemiK: 2.0, lamp: 0xffd0e8, glow: 0xff6fd0, fret: 0xffe0f0, edge: 0xfff0f8, hold: 0xc88aff, windowK: 1.8, daze: 0 },
  spkFloor: { fog: 0x08061a, fogDensity: 0.0026, stars: 0, skyLight: 0x5a4aaa, bounce: 0x1a0a30, hemiK: 1.4, lamp: 0x8a6aff, glow: 0xb06aff, fret: 0x40d8ff, edge: 0xd8d0ff, hold: 0x8a6aff, daze: 0.18 },
  spkPhones: { fog: 0x0c1220, fogDensity: 0.0034, skyLight: 0xc8dcff, bounce: 0x1a2030, hemiK: 1.7, lamp: 0xd8e8ff, glow: 0x7ab8ff, fret: 0xe0f0ff, edge: 0xe8f0ff, hold: 0x8a6aff, daze: 0.7 },
  spkBlur: { fog: 0x1a0c2a, fogDensity: 0.003, skyLight: 0x9a6aff, bounce: 0x3a1040, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x40d8ff, daze: 0.32 },
  spkChorus: { fog: 0x160a26, fogDensity: 0.0028, skyLight: 0xaa7aff, bounce: 0x3a1050, hemiK: 1.9, lamp: 0xff6fe0, glow: 0xff3fd0, fret: 0x40ffb0, daze: 0.3 },
  spkRed: { fog: 0x2a0408, fogDensity: 0.0034, skyLight: 0xff4a4a, bounce: 0x3a0808, hemiK: 1.6, lamp: 0xff2a2a, glow: 0xff2a3a, fret: 0xff8a6a, edge: 0xffb0b0, hold: 0xff3a5a, daze: 0.55 },
  spkHall: { fog: 0x0a0608, fogDensity: 0.004, skyLight: 0x8a7a8a, bounce: 0x1a1414, hemiK: 1.5, lamp: 0xff3030, glow: 0xff3a3a, fret: 0xffa0a0, edge: 0xe0d0e0, hold: 0x8a6aff, daze: 0.7 },
  spkWash: { fog: 0x101414, fogDensity: 0.0032, skyLight: 0xd8f0e8, bounce: 0x3a4440, hemiK: 1.8, lamp: 0xe8fff4, glow: 0xa0ffe0, fret: 0xe8fff4, edge: 0xe8fff4, hold: 0x8a6aff, daze: 0.75 },
  spkWrong: { fog: 0x061a0e, fogDensity: 0.003, skyLight: 0x4aff9a, bounce: 0x2a0a3a, hemiK: 1.7, lamp: 0xff3fd0, glow: 0x3aff8a, fret: 0xff3fd0, edge: 0xc8ffd8, hold: 0xd040ff, daze: 0.85 },
  spkVoid: { fog: 0x000000, fogDensity: 0.0045, skyLight: 0x3a2a5a, bounce: 0x000000, hemiK: 1.0, glow: 0xffffff, fret: 0xb8a8ff, edge: 0xd8d0ff, hold: 0x8a6aff, daze: 1.0 },
  spkDark: { fog: 0x0a0000, fogDensity: 0.0042, skyLight: 0xff2020, bounce: 0x100000, hemiK: 0.9, lamp: 0xff1010, glow: 0xff1a1a, fret: 0xff6060, edge: 0xff6060, hold: 0xff2a2a, daze: 0.9 },
  spkHouse: { fog: 0x3a3a3c, fogDensity: 0.002, skyLight: 0xf4f6ff, bounce: 0x6a6a70, hemiK: 2.3, lamp: 0xffffff, glow: 0xe0e0e8, fret: 0xffffff, edge: 0xffffff, hold: 0x8a8aa0, daze: 0.22 },
  spkMorning: {
    zenith: 0x5a78b8, horizon: 0xffc8a0, skyGlow: 0xffa070, glowDir: [0.08, 0.05, 1], moonDir: [0.08, 0.06, 1], moon: 0xffdcb0, sunSize: 1.1, stars: 0, cloud: 0xffd8c8, clouds: 0.45,
    fog: 0xe0b8a8, fogDensity: 0.0015, skyline: 0x8a7a88, ground: 0x3a3438, street: 0xffd8c0, window: 0xffd8a0, windowAlt: 0xffe8c8, windowK: 0.22, lamp: 0xfff4e0,
    skyLight: 0xffe4d8, bounce: 0x6a5a58, hemiK: 1.9, sunK: 1.6, edge: 0xfff0e8, glow: 0xffc8a0, fret: 0xffffff, hold: 0xff9a70, daze: 0, shade: 0.5,
  },
  // Sexy Trauma Costume: the back room's orange and black, the fitting room's velvet, the
  // blacklight, the clearance room's glare, the walls gone, the quiet, the frost, the tills, red.
  stcAisle: {
    zenith: 0x0a0612, horizon: 0x2a1430, skyGlow: 0xff7a1a, glowDir: [0.3, 0.05, 1], skyline: 0x140c16, moonDir: [-0.3, 0.5, 0.8], moon: 0xffe8d0,
    fog: 0x1a1014, fogDensity: 0.0024, stars: 0, sunSize: 0,
    ground: 0x14100c, street: 0xff8a3a, window: 0xff9a4a, windowAlt: 0xb070ff, lamp: 0xffa860,
    ribbon: 0x140c0a, edge: 0xffe8d8, fret: 0xffb070, glow: 0xff7a1a, hold: 0xff5a1a, gate: 0xffffff, gem: 0xfff4e8,
    skyLight: 0xffd0a8, bounce: 0x4a2a1a, hemiK: 1.8, sunK: 0.5,
    board: 0x14100e, suit: 0x101014, jacket: 0xff7a1a, hair: 0x1a0e0a, shoes: 0x101014, gloves: 0x101014, rim: 0xffb070, daze: 0,
  },
  stcFitting: { fog: 0x2a1018, fogDensity: 0.0024, skyLight: 0xffc8c8, bounce: 0x5a2a2a, hemiK: 1.7, lamp: 0xffd0b0, glow: 0xff4a6a, fret: 0xffc0c8, edge: 0xfff0f0 },
  stcParty: { fog: 0x0c0418, fogDensity: 0.0026, skyLight: 0x8a5aff, bounce: 0x2a0a40, hemiK: 1.4, lamp: 0xb070ff, glow: 0xd040ff, fret: 0x6affd8, edge: 0xe8d0ff, hold: 0xff3ad0 },
  stcClear: { fog: 0x2a2010, fogDensity: 0.002, skyLight: 0xfff4d8, bounce: 0x6a5020, hemiK: 2.0, lamp: 0xffffff, glow: 0xff3a2a, fret: 0xffe040, edge: 0xffffff, hold: 0xff2a2a },
  stcFall: { fog: 0x14081e, fogDensity: 0.0022, skyLight: 0xc0a0ff, bounce: 0x2a1840, hemiK: 1.5, lamp: 0xd0b0ff, glow: 0xb070ff, fret: 0xe0d0ff, edge: 0xffffff },
  stcQuiet: { fog: 0x0a0a18, fogDensity: 0.003, skyLight: 0x8a8ab8, bounce: 0x1a1a2a, hemiK: 1.3, lamp: 0xc0c0ff, glow: 0xff7a1a, fret: 0xd0d0ff, edge: 0xe0e0ff },
  stcFrost: { fog: 0x1a2a40, fogDensity: 0.0024, skyLight: 0xc8e8ff, bounce: 0x2a3a50, hemiK: 1.6, lamp: 0xd8f0ff, glow: 0x8ad8ff, fret: 0xe0f8ff, edge: 0xffffff, hold: 0x6ab8ff },
  stcFront: { zenith: 0x0a0612, horizon: 0x3a1a2a, fog: 0x2a1c18, fogDensity: 0.0018, skyLight: 0xfff0e0, bounce: 0x5a4a3a, hemiK: 2.0, lamp: 0xffffff, glow: 0xff7a1a, fret: 0xffd0a0, edge: 0xffffff, hold: 0xff5a1a },
  stcHell: { fog: 0x2a0806, fogDensity: 0.002, skyLight: 0xff8a6a, bounce: 0x4a1008, hemiK: 1.7, lamp: 0xff6a3a, glow: 0xff3a1a, fret: 0xffb090, edge: 0xffe0d0, hold: 0xff3a1a },
  // Pretty Until Proven Guilty: the courtroom's amber at night, the marble halls white, the evidence
  // room's tubes, red-handed, the cells' blue, the room of mirrors in gold, the cold, the verdict.
  pupCourt: {
    zenith: 0x0a1030, horizon: 0x3a4a7a, skyGlow: 0x8aa0ff, glowDir: [0.3, 0.1, 1], skyline: 0x101828, moonDir: [-0.4, 0.5, 0.7], moon: 0xe8f0ff,
    fog: 0x2a1a12, fogDensity: 0.0022, stars: 0.4, sunSize: 0,
    ground: 0x1a1410, street: 0xffc080, window: 0xffd8a0, windowAlt: 0xffe8c8, lamp: 0xffd090,
    ribbon: 0x140c0c, edge: 0xfff0e8, fret: 0xffd8a0, glow: 0xff3a5a, hold: 0xff2a4a, gate: 0xffffff, gem: 0xfff4f6, rail: 0xffc860,
    skyLight: 0xffe0c0, bounce: 0x5a3a24, hemiK: 1.9, sunK: 0.5,
    board: 0x14100e, suit: 0x101014, jacket: 0xd8102a, hair: 0x1a0e0a, shoes: 0x101014, gloves: 0x101014, rim: 0xffc0c8, daze: 0,
    snow: 0, snowGround: 0, rain: 0,
  },
  pupHall: { fog: 0x6a6460, fogDensity: 0.0018, skyLight: 0xfff8f0, bounce: 0x8a8070, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0d8, glow: 0xff3a5a, fret: 0xffe8b0, edge: 0xffffff },
  pupEvidence: { fog: 0x2a302c, fogDensity: 0.0026, skyLight: 0xe0f0e8, bounce: 0x3a4440, hemiK: 1.8, lamp: 0xe8fff0, glow: 0xff3a5a, fret: 0xe0ffe8, edge: 0xf0fff8 },
  pupRed: { fog: 0x3a0a10, fogDensity: 0.0024, skyLight: 0xffc0c0, bounce: 0x5a1010, hemiK: 1.9, lamp: 0xffb0a0, glow: 0xff2a3a, fret: 0xffb0b0, edge: 0xffe0e0, hold: 0xff1a3a },
  pupCells: { fog: 0x14181e, fogDensity: 0.003, skyLight: 0xa0b0c8, bounce: 0x20242a, hemiK: 1.5, lamp: 0xd8e0ff, glow: 0xff3a5a, fret: 0xc8d8ff, edge: 0xe0e8ff },
  pupMirror: { fog: 0x3a2028, fogDensity: 0.002, skyLight: 0xffe8e0, bounce: 0x6a4a44, hemiK: 1.7, lamp: 0xffd8b0, glow: 0xff4a7a, fret: 0xffe0f0, edge: 0xffffff, hold: 0xff2a4a },
  pupCold: { fog: 0x1a2a3e, fogDensity: 0.0024, skyLight: 0xc8e0ff, bounce: 0x30404e, hemiK: 1.55, lamp: 0xe0f4ff, glow: 0x8ad8ff, fret: 0xe0f8ff, edge: 0xffffff, hold: 0x6ab8ff },
  pupVerdict: { fog: 0x1a0e0c, fogDensity: 0.0024, skyLight: 0xffc8a0, bounce: 0x4a2a1a, hemiK: 1.7, lamp: 0xffb070, glow: 0xff2a4a, fret: 0xffd0a0, edge: 0xfff0e0, hold: 0xff2a4a },
  // out the front doors: the square at night, the city's windows all lit
  pupSteps: {
    zenith: 0x04060f, horizon: 0x1c2444, skyGlow: 0x6a5aa0, glowDir: [0.2, 0.08, 1], skyline: 0x0c1020, moonDir: [-0.35, 0.5, 0.75], moon: 0xe8eeff, stars: 0.8, sunSize: 0,
    fog: 0x0e1222, fogDensity: 0.0011, ground: 0x111a10, street: 0xffc080, window: 0xffd8a0, windowAlt: 0xfff0d0, windowK: 1.5, lamp: 0xffd8a0,
    skyLight: 0x8a98c8, bounce: 0x2a2026, hemiK: 1.6, sunK: 0.7, glow: 0xff3a5a, fret: 0xffd8a0, edge: 0xfff0e8, hold: 0xff2a4a,
  },
  // Unloaded: the factory at night in pink and mint, the syrup kitchen's amber, the floor's
  // strip lights, the stamping room's red, the showroom's candy pink, the power gone, the block.
  unlNight: {
    zenith: 0x0a0618, horizon: 0x3a1a4a, skyGlow: 0xff5fd2, glowDir: [0.2, 0.05, 1], skyline: 0x140c20, moonDir: [-0.3, 0.5, 0.8], moon: 0xffe8f8,
    fog: 0x24142e, fogDensity: 0.0018, stars: 0.7, sunSize: 0,
    ground: 0x14101a, street: 0xff9ad8, roof: 0x1a1222, wall: 0x2a1e30, tree: 0x101a14,
    window: 0xff9ad8, windowAlt: 0x9af0d8, lamp: 0xffb0d8,
    ribbon: 0x140c18, edge: 0xffe0f4, fret: 0x9af0d8, glow: 0xff5fd2, hold: 0xff3aa8, gate: 0xffffff, gem: 0xfff0fa,
    skyLight: 0x6a4a8a, bounce: 0x2a1424, hemiK: 1.7, sunK: 0.6,
    board: 0x14101a, suit: 0x101014, jacket: 0xff5fd2, hair: 0x1a0e0a, shoes: 0xf8f4f8, gloves: 0x101014, rim: 0xffb0e8, daze: 0,
    windowK: 1.6, snow: 0, snowGround: 0, rain: 0, rail: 0xff5fb0,
  },
  unlCook: { fog: 0x3a2018, fogDensity: 0.0024, stars: 0, skyLight: 0xffd8b0, bounce: 0x6a3a2a, hemiK: 1.9, sunK: 0.5, lamp: 0xffc890, glow: 0xff5fd2, fret: 0xffd8a0 },
  // the sugar room: bright, white and pink; the coating room: pink under strip lights; the second
  // chorus in every colour
  unlSugar: { fog: 0x4a3a48, fogDensity: 0.0018, stars: 0, skyLight: 0xffe8f2, bounce: 0x6a5a62, hemiK: 1.75, sunK: 0.6, lamp: 0xffe0f0, glow: 0xff6fc0, fret: 0x8af0d0, edge: 0xffffff, hold: 0xff3aa8 },
  unlCoat: { fog: 0x3a1428, fogDensity: 0.002, stars: 0, skyLight: 0xffd0e8, bounce: 0x5a2a3a, hemiK: 2.1, sunK: 0.6, lamp: 0xffc0e0, glow: 0xff4fa8, fret: 0xfff0a0, edge: 0xffffff, hold: 0xff3a8a },
  unlRainbow: { fog: 0x2a1a3a, fogDensity: 0.0018, stars: 0, skyLight: 0xf0e8ff, bounce: 0x4a4a6a, hemiK: 2.2, sunK: 0.7, lamp: 0xffffff, glow: 0xb070ff, fret: 0x5ff0c4, edge: 0xffffff, hold: 0xff4fa8 },
  unlFloor: { fog: 0x3a2a3e, fogDensity: 0.002, stars: 0, skyLight: 0xffe0f0, bounce: 0x4a5a50, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0f8, glow: 0xff5fd2, fret: 0x9af0d8, edge: 0xffffff },
  unlPress: { fog: 0x1a1418, fogDensity: 0.003, skyLight: 0xd8c8c8, bounce: 0x3a2020, hemiK: 1.7, lamp: 0xff6040, glow: 0xff4a4a, fret: 0xffd040, edge: 0xfff0e0, hold: 0xff3a5a },
  unlShow: { fog: 0x3a1a30, fogDensity: 0.0022, skyLight: 0xffd8f0, bounce: 0x6a3a5a, hemiK: 2.0, lamp: 0xffb0e0, glow: 0xff5fd2, fret: 0xb0fff0, edge: 0xffffff, hold: 0xff3aa8 },
  unlDark: { fog: 0x0a0604, fogDensity: 0.004, skyLight: 0x4a3a2a, bounce: 0x100804, hemiK: 0.9, sunK: 0.3, lamp: 0xffa040, glow: 0xffa040, fret: 0xffd8a0, edge: 0xffe0c0, hold: 0xff8a2a },
  unlFull: { fog: 0x4a2a4e, fogDensity: 0.0018, skyLight: 0xfff0ff, bounce: 0x5a6a60, hemiK: 2.2, sunK: 0.7, lamp: 0xffffff, glow: 0xff3ad0, fret: 0x6affd8, edge: 0xffffff, hold: 0xff3aa8 },
  unlBlock: { zenith: 0x060410, horizon: 0x2a1438, fog: 0x1a1022, fogDensity: 0.0017, stars: 0.6, skyLight: 0x6a4a8a, bounce: 0x2a1424, hemiK: 1.6, sunK: 0.5, lamp: 0xffb070, street: 0xffb070, window: 0xffc890, windowAlt: 0xff9ad8, glow: 0xff5fd2, fret: 0xffd8a0, edge: 0xffe0f4, hold: 0xff3aa8, windowK: 1.9 },
  unlDrop: { fog: 0x2a1030, fogDensity: 0.0015, skyLight: 0xff9ae0, bounce: 0x4a1a3a, hemiK: 2.0, window: 0xff9ad8, windowAlt: 0x9af0d8, lamp: 0xff9ad8, glow: 0xff5fd2, fret: 0x9af0d8, windowK: 2.2 },
  // School Shooter Sweetheart: a bright school morning, the halls' strip lights, red when the siren
  // goes, the afternoon in the classroom windows, the gym gold and purple for homecoming, six
  // o'clock outside, dark, then the stadium lights. He's in a letterman jacket.
  schMorning: {
    zenith: 0x3a7ad8, horizon: 0xcfe4f4, skyGlow: 0xfff0d8, glowDir: [0.4, 0.3, 1], skyline: 0x8a9ab0, moonDir: [0.4, 0.55, 0.7], moon: 0xfff4e0,
    fog: 0xc8d8e8, fogDensity: 0.0016, stars: 0, sunSize: 0.8, cloud: 0xffffff, clouds: 0.35,
    ground: 0x4a7a3a, street: 0xd8d0c0, roof: 0x5a3028, wall: 0x8a3a2a, tree: 0x2a4a2a,
    window: 0xfff4d8, windowAlt: 0xd8e8ff, lamp: 0xfff4e0,
    ribbon: 0x14161e, edge: 0xffffff, fret: 0xffe0e8, glow: 0xff3d6e, hold: 0xff2a5a, gate: 0xffffff, gem: 0xfff2f6,
    skyLight: 0xd8e4f4, bounce: 0x6a5a4a, hemiK: 1.8, sunK: 1.6,
    board: 0x14100e, suit: 0x1a2030, jacket: 0xc8102e, hair: 0x2a1a10, shoes: 0xf4f0f0, gloves: 0x101014, rim: 0xffd0d8, daze: 0,
  },
  schHall: { fog: 0xb8b4a8, fogDensity: 0.0022, skyLight: 0xf4f6f0, bounce: 0x8a8070, hemiK: 1.9, sunK: 0.5, lamp: 0xf4fff8, glow: 0xff3d6e, fret: 0xffe0e8, edge: 0xffffff, hold: 0xff2a5a },
  schAlarm: { fog: 0x3a0608, fogDensity: 0.003, skyLight: 0xff5a5a, bounce: 0x4a0a0a, hemiK: 1.6, lamp: 0xff3030, glow: 0xff2a2a, fret: 0xffb0b0, edge: 0xffd0d0, hold: 0xff2a3a },
  schClass: { fog: 0xd8c8a8, fogDensity: 0.002, skyLight: 0xfff0d8, bounce: 0x8a7050, hemiK: 1.9, sunK: 0.8, lamp: 0xfff0d8, zenith: 0x4a7ad0, horizon: 0xf0d8b0 },
  schPolice: { fog: 0x6a6070, fogDensity: 0.0022, skyLight: 0xd8d0e8, bounce: 0x4a4050, hemiK: 1.7, lamp: 0xe8e4f0 },
  schGym: { fog: 0x4a3a5a, fogDensity: 0.0018, skyLight: 0xffe8c8, bounce: 0x6a4a3a, hemiK: 1.9, sunK: 0.6, lamp: 0xffe0a0, glow: 0xffd23a, fret: 0xd8b0ff, edge: 0xffffff, hold: 0xb070ff, zenith: 0x2a2a6a, horizon: 0xd88a5a },
  schGymAlarm: { fog: 0x3a0608, fogDensity: 0.0026, skyLight: 0xff6a5a, bounce: 0x4a0a0a, hemiK: 1.7, lamp: 0xff3030, glow: 0xff2a2a, fret: 0xffb0b0, edge: 0xffd0d0, hold: 0xff2a3a },
  schDusk: {
    zenith: 0x141a4a, horizon: 0xe87a5a, skyGlow: 0xff8a5a, glowDir: [0.3, 0.04, 1], moonDir: [0.3, 0.05, 1], moon: 0xffb080, sunSize: 0.9, stars: 0.2, clouds: 0.3, cloud: 0xd88a8a,
    fog: 0x5a4a6a, fogDensity: 0.0017, ground: 0x2a3a2a, lamp: 0xffc080, street: 0xffc080,
    skyLight: 0x8a7ab0, bounce: 0x4a3030, hemiK: 1.7, sunK: 1.0, edge: 0xfff0f0, glow: 0xff3d6e, fret: 0xffe0e8, hold: 0xff2a5a,
  },
  schDark: { zenith: 0x05060e, horizon: 0x1a1a30, fog: 0x0a0a14, fogDensity: 0.0026, stars: 0.6, skyLight: 0x3a3a6a, bounce: 0x0a0a10, hemiK: 1.1, sunK: 0.3, sunSize: 0, lamp: 0x6a6a8a },
  schStadium: {
    zenith: 0x04060e, horizon: 0x1a2236, skyGlow: 0xd8e0ff, glowDir: [0, 0.3, 1], moonDir: [0.2, 0.8, 0.5], moon: 0xf0f4ff, sunSize: 0, stars: 0.4,
    fog: 0x1a2030, fogDensity: 0.0016, ground: 0x2a6a2a, lamp: 0xf4f8ff,
    skyLight: 0xe8eeff, bounce: 0x2a4a2a, hemiK: 2.2, sunK: 2.0, edge: 0xffffff, glow: 0xffd23a, fret: 0xffffff, hold: 0xff3d6e,
  },
  // Makeup Sex at Your Funeral: violet dusk, the funeral home's amber, the cemetery's blue night,
  // the prep room's cold, 3 a.m., dawn over the graves, the white chapel. She's in red.
  fhdusk: {
    zenith: 0x120a24, horizon: 0x6a3a5a, skyGlow: 0xff7a6a, glowDir: [0.4, 0.04, 1], skyline: 0x1a1024, moonDir: [-0.5, 0.45, 0.7], moon: 0xffe8d8,
    fog: 0x3a2236, fogDensity: 0.0018, stars: 0.3, sunSize: 0,
    ground: 0x1a2418, street: 0xffb070, roof: 0x22182a, wall: 0x3a2a30, tree: 0x16241a,
    window: 0xffc078, windowAlt: 0xffa0c0, lamp: 0xffb878,
    ribbon: 0x1a0c14, edge: 0xfff0f4, fret: 0xffe0ea, glow: 0xff3a5a, hold: 0xff2a48, gate: 0xffffff, gem: 0xfff2f6,
    skyLight: 0x7a5a8a, bounce: 0x4a2a2a, hemiK: 1.8, sunK: 0.7,
    board: 0x14100e, suit: 0x0c0a0e, jacket: 0xd8203a, hair: 0x1a0e0a, shoes: 0x0e0c10, gloves: 0x0e0c10, rim: 0xffb0c0,
  },
  fhwake: { fog: 0x1e1018, fogDensity: 0.0028, stars: 0, skyLight: 0xe0b8a8, bounce: 0x4a2a28, hemiK: 1.8, sunK: 0.6, lamp: 0xffc080 },
  fhparlor: { fog: 0x2a1e22, fogDensity: 0.0026, stars: 0, skyLight: 0xf0d0c0, bounce: 0x5a3a34, hemiK: 1.9, sunK: 0.6, lamp: 0xffd090 },
  fhgraves: {
    zenith: 0x04050e, horizon: 0x1a2036, skyGlow: 0x5a6aa0, glowDir: [0.4, 0.04, 1], skyline: 0x0a0e18, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8e4ff,
    fog: 0x1c2438, fogDensity: 0.0024, stars: 1, sunSize: 0, ground: 0x18261a, lamp: 0xffb060, street: 0xffb060,
    skyLight: 0x6a7ab0, bounce: 0x22242e, hemiK: 2.0, sunK: 1.5, ribbon: 0x0e0a12, edge: 0xe8f0ff, fret: 0xd8e4ff,
  },
  fhprep: { fog: 0x18221e, fogDensity: 0.0024, skyLight: 0xe0f4ec, bounce: 0x5a6a64, hemiK: 2.0, lamp: 0xe8fff6, edge: 0xe8fff6 },
  fh3am: { zenith: 0x02030a, horizon: 0x0a0e1e, fog: 0x06080e, fogDensity: 0.0036, stars: 1.2, skyLight: 0x3a4a7a, bounce: 0x0a0a12, hemiK: 1.2, sunK: 0.5, lamp: 0x8aa0ff, moon: 0xb8c8ff, edge: 0xc8d8ff },
  fhdawn: {
    zenith: 0x1a2a6a, horizon: 0xe08a7a, skyGlow: 0xffa070, glowDir: [0.3, 0.06, 1], moonDir: [0.3, 0.06, 1], moon: 0xffc0a0, sunSize: 0.9, stars: 0.15,
    fog: 0x7a6a7a, fogDensity: 0.0018, skyLight: 0x9a8ab0, bounce: 0x5a4a4a, hemiK: 1.6, sunK: 1.2, ground: 0x2a3a24, edge: 0xfff0e0, lamp: 0xffc080,
  },
  fhsunrise: {
    zenith: 0x2a4a9a, horizon: 0xffc090, skyGlow: 0xffb060, glowDir: [0.3, 0.1, 1], moonDir: [0.3, 0.1, 1], moon: 0xffe0b0, sunSize: 1.2, stars: 0,
    fog: 0xc8a898, fogDensity: 0.0013, skyLight: 0xc0c0e0, bounce: 0x7a6a50, hemiK: 1.6, sunK: 2.2, ground: 0x3a5a2a, edge: 0xfff4e0, lamp: 0xffd0a0,
  },
  fhwedding: { fog: 0xd8c4b0, fogDensity: 0.0013, stars: 0, skyLight: 0xffe8d4, bounce: 0x9a7a64, hemiK: 1.75, sunK: 1.2, lamp: 0xffd8a0, edge: 0xfff4e8, fret: 0xfff0f4, glow: 0xffb8c8, hold: 0xff4a6a },
  // Nothing Happens Every Week: a bright Sunday, everything innocent, red for red-handed
  sunday: {
    zenith: 0x2c6ade, horizon: 0xc4d8ea, skyGlow: 0xfff0cc, glowDir: [0.5, 0.5, 0.7], skyline: 0x7a9a8a, moonDir: [0.5, 0.5, 0.7], moon: 0xfff2d8,
    fog: 0xb8cce0, fogDensity: 0.0010, stars: 0, sunSize: 0.8, cloud: 0xffffff, clouds: 0.5, windowK: 0.1, glass: 0x4a5a6a,
    ground: 0x5e8a34, street: 0xffe0a0, roof: 0x8a5a4a, wall: 0xe8e0d0, tree: 0x3a6a2a,
    window: 0xffe0b0, windowAlt: 0xffb0c0, lamp: 0xffe0b0,
    ribbon: 0x2a2a34, edge: 0xffffff, fret: 0xffe8e0, glow: 0xff5050, hold: 0xff2a3a, gate: 0xffffff,
    skyLight: 0xb0ccff, bounce: 0x8a8a5a, sunK: 3.0, hemiK: 1.5, fillK: 0.3,
    board: 0x1a1a24, suit: 0x2a2a3a, jacket: 0xffd23a, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xffffff,
  },
  sundaylate: {
    zenith: 0x3a72d8, horizon: 0xf0e4cc, skyGlow: 0xffe0b0, glowDir: [0.6, 0.32, 0.72], moonDir: [0.6, 0.32, 0.72], moon: 0xffe8c8,
    fog: 0xe0d8cc, fogDensity: 0.0012, sunSize: 1, cloud: 0xfff8ec, clouds: 0.4, sunK: 2.8,
  },
  // the week, by its light: Monday morning, a Friday night, broad daylight, Sunday, the afternoon,
  // the parade, the golden hour, sundown, the getaway into the sun, dusk over the town
  nhMorning: {
    zenith: 0x3c74d4, horizon: 0xd6e2ec, skyGlow: 0xffe4b8, glowDir: [0.55, 0.2, 0.8], moonDir: [0.55, 0.2, 0.8], moon: 0xfff0d8,
    fog: 0xc8d6e2, fogDensity: 0.0012, sunSize: 0.9, cloud: 0xffffff, clouds: 0.45, sunK: 2.7, hemiK: 1.45, skyLight: 0xa8c4f0, bounce: 0x8a8a6a, windowK: 0.12, shade: 0.3,
  },
  nhNight: {
    zenith: 0x060a1e, horizon: 0x1c2440, skyGlow: 0x34467a, glowDir: [0.3, 0.1, 1], moonDir: [-0.35, 0.5, 0.8], moon: 0xb8c8ff, sunSize: 0, stars: 1.1,
    cloud: 0x283048, clouds: 0.3, fog: 0x10162a, fogDensity: 0.0019, skyLight: 0x4a5a8a, bounce: 0x1a1a26, hemiK: 1.3, sunK: 0.55,
    windowK: 1.7, lamp: 0xffc070, street: 0xffb060, window: 0xffc878, edge: 0xffe4b8, glass: 0x0a0c12, shade: 0, ground: 0x2a4a28,
  },
  nhNoon: {
    zenith: 0x2a66e0, horizon: 0xc8dcee, skyGlow: 0xfff4d8, glowDir: [0.35, 0.65, 0.65], moonDir: [0.35, 0.65, 0.65], moon: 0xfffaf0,
    sunSize: 0.7, sunK: 3.3, hemiK: 1.55, clouds: 0.38, fog: 0xbcd0e2, fogDensity: 0.0009, windowK: 0.08, shade: 0.15,
  },
  nhSunday: {
    zenith: 0x3a76dc, horizon: 0xe2eaf2, skyGlow: 0xfff0d0, glowDir: [0.45, 0.45, 0.75], moonDir: [0.45, 0.45, 0.75], moon: 0xfff4e0,
    sunSize: 0.8, sunK: 2.9, hemiK: 1.55, clouds: 0.55, cloud: 0xffffff, fog: 0xd2dee8, fogDensity: 0.0011, windowK: 0.1,
  },
  nhAfternoon: {
    zenith: 0x3a6ad0, horizon: 0xeadcc4, skyGlow: 0xffe0a8, glowDir: [0.55, 0.35, 0.75], moonDir: [0.55, 0.35, 0.75], moon: 0xfff0d0,
    sunSize: 0.9, sunK: 3.0, hemiK: 1.45, clouds: 0.35, cloud: 0xfff8ec, fog: 0xe0d8c8, fogDensity: 0.0011, windowK: 0.12, shade: 0.25,
  },
  nhHot: {
    zenith: 0x2462e0, horizon: 0xd8e2ea, skyGlow: 0xfff2d0, glowDir: [0.4, 0.5, 0.75], moonDir: [0.4, 0.5, 0.75], moon: 0xfff6e8,
    sunSize: 0.8, sunK: 3.4, hemiK: 1.6, clouds: 0.3, fog: 0xc8d8e8, fogDensity: 0.0009, windowK: 0.08,
  },
  nhGolden: {
    zenith: 0x3a66c4, horizon: 0xffd8a8, skyGlow: 0xffb468, glowDir: [-0.25, 0.14, 0.95], moonDir: [-0.25, 0.14, 0.95], moon: 0xffd8a0, sunSize: 1.25,
    fog: 0xead0b0, fogDensity: 0.0012, sunK: 2.5, hemiK: 1.35, skyLight: 0xc4bce4, bounce: 0x8a6a4a, clouds: 0.4, cloud: 0xffe6c8, windowK: 0.35, edge: 0xfff0d8, shade: 0.4,
  },
  nhSunset: {
    zenith: 0x2c4aa6, horizon: 0xffa070, skyGlow: 0xff8040, glowDir: [-0.3, 0.07, 0.95], moonDir: [-0.3, 0.07, 0.95], moon: 0xffa868, sunSize: 1.5,
    fog: 0xdca088, fogDensity: 0.0013, sunK: 2.1, hemiK: 1.35, skyLight: 0xb4a4dc, bounce: 0x7a5040, clouds: 0.45, cloud: 0xffbc94, windowK: 0.6, lamp: 0xffc070, edge: 0xffe4c4, shade: 0.45,
  },
  getaway: {
    zenith: 0x24408e, horizon: 0xff9058, skyGlow: 0xff6a30, glowDir: [-0.3, 0.03, 0.95], moonDir: [-0.3, 0.03, 0.95], moon: 0xff9850, sunSize: 1.7,
    fog: 0xd08a78, fogDensity: 0.0013, sunK: 1.8, hemiK: 1.35, skyLight: 0xa898d0, bounce: 0x6a4038, clouds: 0.4, cloud: 0xff9a78, windowK: 0.8, edge: 0xffd8b8, lamp: 0xffb868, shade: 0.3,
  },
  nhDusk: {
    zenith: 0x10164a, horizon: 0xf07a64, skyGlow: 0xff5a3a, glowDir: [-0.3, -0.01, 0.95], moonDir: [-0.3, 0.02, 0.95], moon: 0xff9a70, sunSize: 0, stars: 0.45,
    fog: 0x5a4462, fogDensity: 0.00125, sunK: 0.8, hemiK: 1.45, skyLight: 0x7a6aa8, bounce: 0x3a2a3c, clouds: 0.35, cloud: 0xd87a78,
    windowK: 1.6, window: 0xffc070, lamp: 0xffc070, street: 0xffb060, edge: 0xffd0b8, fret: 0xffe0d8, shade: 0,
  },
  // Your Apartment Smells Like Summer: a hot night, every window lit and open, then the storm
  summernight2: {
    zenith: 0x0c0a26, horizon: 0x5a2a4e, skyGlow: 0xff8a50, glowDir: [0.2, 0.05, 1], skyline: 0x1a1024, moonDir: [-0.4, 0.5, 0.7], moon: 0xffe0c0,
    fog: 0x34203a, fogDensity: 0.0017, stars: 0.6, sunSize: 0, snow: 0, snowGround: 0, rain: 0,
    ground: 0x120e16, street: 0xffa050, roof: 0x22182a, wall: 0x3a2a30, tree: 0x0f1612,
    window: 0xffb060, windowAlt: 0xff6a9a, lamp: 0xffa050, windowK: 1.55,
    ribbon: 0x201018, edge: 0xffb070, fret: 0xffe0c0, glow: 0xff6a4a, hold: 0xff4fa0, gate: 0xfff4e0,
    skyLight: 0x7a5a9a, bounce: 0x5a3a2a, hemiK: 2.0, sunK: 0.8,
    board: 0x1a1018, suit: 0x1a1420, jacket: 0xff8a4f, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffc890,
  },
  // the band comes in: the block wakes up
  yasAwake: { skyGlow: 0xff9a5a, fogDensity: 0.0015, windowK: 1.75, hemiK: 2.1, skyLight: 0x8a64a4 },
  // her apartment by the lamps, the summer night in the windows
  apartment: {
    fog: 0x2a1a16, fogDensity: 0.0026, stars: 0, rain: 0, windowK: 1.9,
    skyLight: 0xe0b890, bounce: 0x6a4030, hemiK: 1.8, sunK: 0.6, lamp: 0xffb060, edge: 0xffc890, glow: 0xffa060,
  },
  // out her window over the roofs: the chorus, magenta and gold
  rooftops: {
    zenith: 0x0a0a2e, horizon: 0x6a2a5a, skyGlow: 0xff8a5a, fog: 0x2c1a36, fogDensity: 0.0012, stars: 0.9,
    skyLight: 0x8a6aaa, hemiK: 2.1, windowK: 1.5, lamp: 0xffb060,
  },
  storm: {
    zenith: 0x080a12, horizon: 0x262636, skyGlow: 0x5a6a8a, glowDir: [0.2, 0.1, 1], fog: 0x181a26, fogDensity: 0.0024, stars: 0, rain: 0.85,
    skyLight: 0x5a6a90, bounce: 0x2a2a3a, hemiK: 1.7, lamp: 0xffa860, edge: 0xc8d8ff, glow: 0x8aa8ff, windowK: 1.35,
  },
  hallway: {
    fog: 0x16160e, fogDensity: 0.0032, stars: 0, rain: 0,
    skyLight: 0xd0cca0, bounce: 0x3a3a24, hemiK: 1.5, lamp: 0xfff0c8, edge: 0xfff0c8, glow: 0xffe090,
  },
  // the walls gone: the clear night after the storm, the whole city lit
  afterstorm: {
    zenith: 0x0a0a2a, horizon: 0x6a3052, skyGlow: 0xff7a5a, glowDir: [0, 0.05, 1], fog: 0x24182a, fogDensity: 0.0010, stars: 1.0, rain: 0,
    skyLight: 0x9a74a8, hemiK: 2.0, lamp: 0xffb060, edge: 0xffb070, glow: 0xff6a4a, windowK: 1.9, moon: 0xfff0d8,
  },
  attic: { fog: 0x1a120a, fogDensity: 0.004, skyLight: 0xc8a070, hemiK: 1.6, lamp: 0xffc070 },
  blueprint: { fog: 0x0a1a3a, fogDensity: 0.0026, skyLight: 0xa8c0ff, hemiK: 1.8, lamp: 0xcfe0ff, edge: 0xffffff, glow: 0x8ab8ff, fret: 0xe8f0ff },
  moldy: { fog: 0x0e160e, fogDensity: 0.0034, skyLight: 0x8a9a7a, hemiK: 1.6, lamp: 0xd8e0a0 },
  dim: { fog: 0x08040a, fogDensity: 0.0042, skyLight: 0x5a4a6a, hemiK: 1.0, lamp: 0xffb060 },
  // Rent Free: the house in his head, wine-dark and gold, her portrait on every wall
  mansion: {
    zenith: 0x0a0414, horizon: 0x2a1030, skyGlow: 0xc86aff, glowDir: [0, 0.2, 1], skyline: 0x10081a, moonDir: [0.3, 0.8, 0.4], moon: 0xffd8b0,
    fog: 0x1a0818, fogDensity: 0.0034, stars: 0, sunSize: 0,
    ground: 0x0a0408, street: 0xffc070, roof: 0x1a0e18, wall: 0x2a1424, tree: 0x0f1612,
    window: 0xffc878, windowAlt: 0xd08aff, lamp: 0xffc070,
    ribbon: 0x1e0a1a, edge: 0xffd27a, fret: 0xffe8f4, glow: 0xc86aff, hold: 0xc86aff, gate: 0xffffff, gem: 0xffc860,
    skyLight: 0xb08aa0, bounce: 0x4a2030, hemiK: 1.9, sunK: 1.0,
    board: 0x1a0e18, suit: 0x140a14, jacket: 0xc86aff, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffd27a,
  },
  // Rent Free's rooms: the ball (gold), 3 a.m. (the moon), the crawl space, welcome home, the
  // candles, the grand ball, one light left on, the fire, and his bed at the end
  rntBall: { fog: 0x2a1424, fogDensity: 0.0026, skyLight: 0xe8b8a8, bounce: 0x6a3020, hemiK: 1.95, lamp: 0xffd080, edge: 0xffd27a, glow: 0xff8ad8 },
  rnt3am: { fog: 0x0a0e22, fogDensity: 0.0036, skyLight: 0x8a9ae0, bounce: 0x1a1a3a, hemiK: 1.6, lamp: 0xa8b8ff, moon: 0xa8c0ff, edge: 0xb8c8ff, glow: 0x6a7aff },
  rntCrawl: { fog: 0x140a04, fogDensity: 0.0045, skyLight: 0xb89060, bounce: 0x3a2010, hemiK: 1.4, lamp: 0xffb060 },
  rntParty: { fog: 0x2a1424, fogDensity: 0.0022, skyLight: 0xffe4d0, bounce: 0x7a3a3a, hemiK: 2.4, lamp: 0xffe0a0, edge: 0xffe08a, glow: 0xff7ab8 },
  rntCandle: { fog: 0x0a0406, fogDensity: 0.0042, skyLight: 0x5a4458, bounce: 0x2a1418, hemiK: 1.05, lamp: 0xffa050 },
  rntGrand: { fog: 0x2a1020, fogDensity: 0.0021, skyLight: 0xf0c0b4, bounce: 0x7a3040, hemiK: 2.15, lamp: 0xffc890, edge: 0xffd27a, glow: 0xff6ab0 },
  rntLight: { fog: 0x060304, fogDensity: 0.0048, skyLight: 0x3a2a3a, bounce: 0x1a0a10, hemiK: 0.85, lamp: 0xffa860 },
  rntCosy: { fog: 0x1a0a06, fogDensity: 0.003, skyLight: 0xffb888, bounce: 0x5a2a10, hemiK: 2.0, lamp: 0xffa050 },
  rntBed: { fog: 0x1a0814, fogDensity: 0.0026, skyLight: 0xffc4b4, bounce: 0x5a2030, hemiK: 2.3, lamp: 0xffb878, edge: 0xffd27a },
  // A Million Ducks: the screen's blue in the dark, the lobby's red and gold, sodium lamps, a lamp in a bedroom
  auditorium: {
    zenith: 0x02030a, horizon: 0x0a1430, skyGlow: 0x2a6aff, glowDir: [0, 0.1, -1], skyline: 0x050810, moonDir: [0, 0.3, -1], moon: 0x8ab8ff,
    fog: 0x060c1e, fogDensity: 0.0042, stars: 0, sunSize: 0,
    ground: 0x08080c, street: 0x6a8aff, roof: 0x14141c, wall: 0x1a1a24, tree: 0x0d1716,
    window: 0xffd28a, windowAlt: 0x7fb8ff, lamp: 0xffb060,
    ribbon: 0x140c1c, edge: 0x6ad8ff, fret: 0xd8f0ff, glow: 0x3a8aff, hold: 0xff4fb8, gate: 0xffffff, gem: 0xffd23a,
    skyLight: 0x6a86e0, bounce: 0x2a2440, hemiK: 2.2, sunK: 1.0,
    board: 0x14141c, suit: 0x101018, jacket: 0xffd23a, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0x8ac8ff,
  },
  lobby: {
    fog: 0x1e0a12, fogDensity: 0.0042, skyLight: 0xffb898, bounce: 0x5a1a20, hemiK: 1.7, sunK: 0.7, moonDir: [0.2, 1, 0.3], moon: 0xffd0a0,
    lamp: 0xffc070, windowAlt: 0xff4fb8, ribbon: 0x240a14, edge: 0xffd27a, fret: 0xfff0c0, glow: 0xff4f8a, hold: 0x30e0ff, gate: 0xffffff,
  },
  credits: {
    fog: 0x0c1630, fogDensity: 0.0042, skyLight: 0x7aa8ff, bounce: 0x2a2a5a, hemiK: 1.8, moon: 0x9ac8ff, windowAlt: 0x4ab8ff, edge: 0x9fe8ff, hold: 0x30e0ff,
  },
  carpark: {
    zenith: 0x04060f, horizon: 0x1c1834, skyGlow: 0xff8a40, glowDir: [0.3, 0.05, 1], moonDir: [-0.4, 0.5, 0.7], moon: 0xcfd8ff,
    fog: 0x16121e, fogDensity: 0.0022, stars: 0.6, sunSize: 0,
    ground: 0x0c0c10, street: 0xffa040, lamp: 0xffa040, window: 0xffd28a, windowAlt: 0xff5fa0,
    ribbon: 0x1a0e18, edge: 0xffb050, fret: 0xffd8b0, glow: 0xff7a30, hold: 0xff4fb8, gate: 0xffffff, skyline: 0x0c0a14,
    skyLight: 0x4a4a7a, bounce: 0x3a2a2a, hemiK: 1.8, sunK: 0.7,
  },
  room: {
    fog: 0x2a1810, fogDensity: 0.0010, skyLight: 0xffd8b0, bounce: 0x6a3a28, hemiK: 1.9, sunK: 1.5, moonDir: [-0.4, 0.75, 0.4], moon: 0xffd8a0,
    lamp: 0xffc890, ribbon: 0x2a1a12, edge: 0xffe0a0, fret: 0xfff4d8, glow: 0xffb050, hold: 0xff4fb8, gate: 0xffffff, windowAlt: 0xff8a5a,
  },
  roomred: {
    fog: 0x3a0c10, fogDensity: 0.0012, skyLight: 0xff8a80, bounce: 0x6a1a20, hemiK: 1.9, moon: 0xffa090, glow: 0xff3a4a, edge: 0xffb0a0,
  },
  screen: {
    fog: 0x0a1a3a, fogDensity: 0.0026, skyLight: 0x6a96ff, bounce: 0x2a2a4a, hemiK: 2.2, sunK: 1.0, moonDir: [0, 0.3, -1], moon: 0x8ab8ff,
    lamp: 0xffb060, ribbon: 0x140c1c, edge: 0x6ad8ff, fret: 0xd8f0ff, glow: 0x3a8aff, hold: 0xff4fb8, gate: 0xffffff,
  },
  avatar: {
    fog: 0x0c2a5a, fogDensity: 0.003, skyLight: 0x7ab8ff, bounce: 0x2a4a7a, hemiK: 2.1, moon: 0x9ad8ff, edge: 0x9ff0ff, fret: 0xe0fbff, glow: 0x4ab8ff,
  },
  // A Million Ducks, more: the faces turning blue, inside the claw machine, his room at night, lost
  // in it, the last chorus in it, the house lights going down before the film
  dckBlue: {
    fog: 0x061a3a, fogDensity: 0.0038, skyLight: 0x4a8aff, bounce: 0x1a2a6a, hemiK: 2.4, moon: 0x6aa8ff, edge: 0x6ae8ff, fret: 0xc8f4ff, glow: 0x2a7aff,
  },
  dckMachine: {
    fog: 0x2a0a24, fogDensity: 0.0026, skyLight: 0xffc8e0, bounce: 0x6a2a40, hemiK: 2.3, sunK: 1.2, moon: 0xffe0b0, moonDir: [0.2, 1, 0.3],
    lamp: 0xffb070, windowAlt: 0xff4fb8, ribbon: 0x2a0a20, edge: 0xffd23a, fret: 0xfff4c0, glow: 0xff4fb8, hold: 0x30e0ff, gate: 0xffffff,
  },
  dckRoomNight: {
    fog: 0x1a0c08, fogDensity: 0.0011, skyLight: 0xffb070, bounce: 0x4a2010, hemiK: 1.7, sunK: 1.6, moon: 0xffc070, moonDir: [-0.4, 0.75, 0.4],
    lamp: 0xffb060, ribbon: 0x2a1a12, edge: 0xffd090, fret: 0xfff4d8, glow: 0xff9a3a, hold: 0xff4fb8, gate: 0xffffff,
  },
  dckRoomDark: {
    fog: 0x08060c, fogDensity: 0.0016, skyLight: 0x6a6aa0, bounce: 0x1a1420, hemiK: 1.0, sunK: 0.6, moon: 0xa0a8ff, moonDir: [-0.4, 0.75, 0.4],
    lamp: 0x8a90c0, ribbon: 0x14101c, edge: 0xb0b8ff, fret: 0xe0e4ff, glow: 0x8a6aff, hold: 0xff4fb8, gate: 0xffffff,
  },
  dckParty: {
    fog: 0x2a1408, fogDensity: 0.0009, skyLight: 0xffe0b0, bounce: 0x8a4a20, hemiK: 2.3, sunK: 1.9, moon: 0xffd890, moonDir: [-0.4, 0.75, 0.4],
    lamp: 0xffc070, ribbon: 0x2a1a12, edge: 0xfff0a0, fret: 0xffffff, glow: 0xffd23a, hold: 0xff4fb8, gate: 0xffffff,
  },
  dckDark: {
    fog: 0x02040a, fogDensity: 0.0048, skyLight: 0x2a3a6a, bounce: 0x0a0a18, hemiK: 1.0, sunK: 0.5, moon: 0x4a6aaa, edge: 0x4a9aff, fret: 0x9ad0ff, glow: 0x2a5aff,
  },
  // Technically Thirty-Two: a clear freezing morning, sun across the street in bands
  frost: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2a62d0, horizon: 0xd6e4f4, skyGlow: 0xfff0d8, glowDir: [0.68, 0.22, 0.68], skyline: 0x8a9ab8, moonDir: [0.68, 0.22, 0.68], moon: 0xfff0d8,
    fog: 0xc6d4e8, fogDensity: 0.0012, stars: 0, sunSize: 1, snowGround: 0.45, cloud: 0xffffff, clouds: 0.25, shade: 1, breath: 1,
    ground: 0xb0bac8, street: 0xffd8a8, roof: 0x5a6070, wall: 0x8a90a0, tree: 0x3a4a48,
    window: 0xffe0b0, windowAlt: 0xbfe0ff, lamp: 0xffe0b0,
    ribbon: 0x28324a, edge: 0x9fe0ff, fret: 0xe0f4ff, glow: 0xffb070, hold: 0xff7a3a, gate: 0xffffff,
    skyLight: 0xa8c4f0, bounce: 0x8a8070, sunK: 2.8, hemiK: 1.5, fillK: 0.3,
    board: 0x1a1a24, suit: 0x23283a, jacket: 0xff4a5a, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xcfeaff,
  },
  overcast: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x8a96aa, horizon: 0xc6ccd6, skyGlow: 0xdce0e8, moonDir: [0.6, 0.35, 0.7], moon: 0xd8dce4, sunSize: 0, cloud: 0xd0d4dc, clouds: 0.95,
    fog: 0xb0b8c4, fogDensity: 0.0017, snow: 0.55, snowGround: 0.6, shade: 0, breath: 1.2,
    skyLight: 0xb8c0d0, bounce: 0x7a7a80, sunK: 0.5, hemiK: 2.0, edge: 0xc8e8ff, hold: 0xff7a3a,
  },
  thaw: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2e6ad4, horizon: 0xf0e4d0, skyGlow: 0xffe0b8, glowDir: [0.66, 0.25, 0.7], moonDir: [0.66, 0.25, 0.7], moon: 0xffe8c8, sunSize: 1, cloud: 0xffffff, clouds: 0.3,
    fog: 0xd6d4dc, fogDensity: 0.0012, snow: 0, snowGround: 0.35, shade: 1, breath: 0.8,
    skyLight: 0xb0c4ec, bounce: 0x9a8a70, sunK: 2.8, hemiK: 1.5, edge: 0xffe0b0, hold: 0xff7a3a,
  },
  homesun: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x4a7ad8, horizon: 0xffe8c8, skyGlow: 0xffd8a0, glowDir: [0.6, 0.2, 0.77], moonDir: [0.6, 0.2, 0.77], moon: 0xffe0b0, sunSize: 1.1, cloud: 0xfff4e4, clouds: 0.3,
    fog: 0xe0d4c8, fogDensity: 0.0011, snowGround: 0.25, shade: 1, breath: 0.6,
    skyLight: 0xc0cae8, bounce: 0xa8906c, sunK: 3.3, hemiK: 1.75, edge: 0xffd8a0, hold: 0xff6a3a,
  },
  // You Are Here: an August afternoon on the hill, to sunset at the top, to the blue hour at home
  august: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x2f6fd0, horizon: 0xd6e4ea, skyGlow: 0xfff0c8, glowDir: [0.42, 0.55, 0.72], skyline: 0x6a8a84, moonDir: [0.42, 0.55, 0.72], moon: 0xfff2d6,
    fog: 0xc6d4d6, fogDensity: 0.0013, stars: 0, sunSize: 1, cloud: 0xffffff, clouds: 0.55,
    ground: 0x5e7a2e, dirt: 0x9a7650, street: 0xffd28a, roof: 0x5a4a40, wall: 0xd8d0c0, tree: 0x2f5a2a,
    window: 0xffd28a, windowAlt: 0xffb0d0, lamp: 0xffd28a,
    ribbon: 0x34241c, edge: 0xffd27a, fret: 0xfff0c0, glow: 0xff9a40, hold: 0xff3d9a, gate: 0xffffff,
    skyLight: 0xa8c8ff, bounce: 0x6a7a3a, sunK: 3.0, hemiK: 1.5, fillK: 0.3, dapple: 0.85, hills: 0,
    board: 0x1a1a1a, suit: 0x2a3040, jacket: 0xff5a36, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x1a1a1a, rim: 0xfff0c0,
  },
  thunder: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x2a323e, horizon: 0x5c6670, skyGlow: 0x8a9aaa, glowDir: [0.42, 0.55, 0.72], skyline: 0x3a4648, moonDir: [0.42, 0.55, 0.72], moon: 0xb8c6d8,
    fog: 0x4c5660, fogDensity: 0.0022, sunSize: 0, cloud: 0x66707a, clouds: 0.95, rain: 0.8,
    ground: 0x3e5228, dirt: 0x5a4632, skyLight: 0x6a7a90, bounce: 0x3a4030, sunK: 0.5, hemiK: 1.2, dapple: 0,
    ribbon: 0x221a18, edge: 0xcfe0ff, hold: 0xff3d9a,
  },
  golden: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x3664c0, horizon: 0xf0dcb4, skyGlow: 0xffc878, glowDir: [0.55, 0.3, 0.78], moonDir: [0.55, 0.3, 0.78], moon: 0xffe4b0,
    fog: 0xdac8a8, fogDensity: 0.0013, sunSize: 1, cloud: 0xfff4e0, clouds: 0.5, rain: 0,
    ground: 0x6e7c2c, dirt: 0xa07a4c, skyline: 0x7a8278, skyLight: 0xb0c0e8, bounce: 0x7a6a3a, sunK: 2.7, hemiK: 1.4, dapple: 0.75,
  },
  ridge: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x3664c0, horizon: 0xf0dcb4, skyGlow: 0xffc878, glowDir: [0.55, 0.3, 0.78], moonDir: [0.55, 0.3, 0.78], moon: 0xffe4b0,
    fog: 0xdac8a8, fogDensity: 0.0011, sunSize: 1, cloud: 0xfff4e0, clouds: 0.5,
    ground: 0x7e842e, dirt: 0xa07a4c, skyline: 0x7a8278, skyLight: 0xb0c0e8, bounce: 0x7a6a3a, sunK: 2.8, hemiK: 1.4, dapple: 0,
  },
  sunset: {
    windowK: 0.35, glass: 0x4a5a68,
    zenith: 0x2a3a7a, horizon: 0xffa468, skyGlow: 0xff7848, glowDir: [0.7, 0.12, 0.7], moonDir: [0.7, 0.12, 0.7], moon: 0xffb878,
    fog: 0xc08a70, fogDensity: 0.0015, sunSize: 1.1, cloud: 0xffb898, clouds: 0.55,
    ground: 0x5e5c2a, dirt: 0x8a6244, skyline: 0x6a5060, skyLight: 0x9a8ab8, bounce: 0x7a4a30, sunK: 2.0, hemiK: 1.2, dapple: 0.55,
    edge: 0xffc87a, hold: 0xff3d9a,
  },
  sunsetopen: {
    windowK: 0.4, glass: 0x4a5a68,
    zenith: 0x2a3a7a, horizon: 0xffa468, skyGlow: 0xff7848, glowDir: [0.72, 0.08, 0.69], moonDir: [0.72, 0.08, 0.69], moon: 0xffb070,
    fog: 0xc08a70, fogDensity: 0.0012, sunSize: 1.2, cloud: 0xffb898, clouds: 0.55,
    ground: 0x5e5c2a, dirt: 0x8a6244, skyline: 0x6a5060, skyLight: 0x9a8ab8, bounce: 0x7a4a30, sunK: 2.0, hemiK: 1.2, dapple: 0, hills: 0.3,
  },
  summit: {
    windowK: 0.6, glass: 0x2a2a3a,
    zenith: 0x1e2a66, horizon: 0xff8a58, skyGlow: 0xff5c3c, glowDir: [0.75, 0.035, 0.66], moonDir: [0.75, 0.035, 0.66], moon: 0xff9a5a,
    fog: 0xa87070, fogDensity: 0.0009, sunSize: 1.5, cloud: 0xff9a88, clouds: 0.6,
    ground: 0x585228, dirt: 0x7a5440, skyline: 0x4a3a58, skyLight: 0x8a7ab0, bounce: 0x7a4430, sunK: 1.6, hemiK: 1.4, dapple: 0, hills: 0.8,
    edge: 0xffd08a, fret: 0xfff0d0, hold: 0xff3d9a,
  },
  bluehour: {
    windowK: 1, glass: 0x030406,
    zenith: 0x0e1638, horizon: 0x6a4a78, skyGlow: 0xff8a70, glowDir: [0.75, -0.02, 0.66], moonDir: [0.75, -0.06, 0.66], moon: 0xffa080,
    fog: 0x3c3a5a, fogDensity: 0.0014, sunSize: 0, stars: 0.35, cloud: 0x5a4a6a, clouds: 0.5,
    ground: 0x2a3020, dirt: 0x4a3a30, skyline: 0x1a1a2e, skyLight: 0x4a4a7a, bounce: 0x2a2a30, sunK: 0.35, hemiK: 1.3, dapple: 0, hills: 1,
    window: 0xffc070, lamp: 0xffc070, edge: 0xffc87a,
  },
  evening: {
    zenith: 0x080c24, horizon: 0x3a3058, skyGlow: 0xc06a70, glowDir: [0.75, -0.02, 0.66], moonDir: [-0.5, 0.4, 0.7], moon: 0xd8e0ff,
    fog: 0x24243c, fogDensity: 0.0016, sunSize: 0, stars: 0.8, cloud: 0x3a3450, clouds: 0.45,
    ground: 0x2a3220, dirt: 0x4a3c30, skyline: 0x12121e, skyLight: 0x5a5a90, bounce: 0x3a3238, sunK: 0.6, hemiK: 1.9, dapple: 0, hills: 1,
    window: 0xffc070, lamp: 0xffc070, street: 0xffc070, edge: 0xffc87a,
  },
  carcrash: {
    zenith: 0x05040f, horizon: 0x3a1744, skyGlow: 0xff3f78, glowDir: [1, 0.04, 0.45], skyline: 0x150a1e, moonDir: [-0.5, 0.42, 0.75], moon: 0xffe3f0,
    fog: 0x2a1236, fogDensity: 0.0021, windowK: 1.8,
    ground: 0x0b0912, street: 0xff8a3d, roof: 0x1d1424, wall: 0x2a2233, tree: 0x0d1716,
    window: 0xffb36b, windowAlt: 0xff6fb5, lamp: 0xa85a22,
    ribbon: 0x2a0d24, edge: 0x5ff2ff, fret: 0xff8fd0, glow: 0xff3d8b, hold: 0xff3d8b, gate: 0x3ac8d8,
    board: 0x1a1020, suit: 0x0d0b14, jacket: 0xff3f8e, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0x7fe9ff,
  },
  // Summer People: one town, one year
  winter: {
    zenith: 0x060a18, horizon: 0x26324c, skyGlow: 0x8fa8d8, glowDir: [-0.4, 0.05, 1], skyline: 0x101828, moonDir: [0.6, 0.45, 0.7], moon: 0xe8f0ff,
    fog: 0x1e2a40, fogDensity: 0.0024, stars: 1, snow: 0.85, snowGround: 0.8, sunSize: 0,
    ground: 0x1a2030, street: 0xa8c0ff, roof: 0x2a2c38, wall: 0x2a2233, tree: 0x0d1716, water: 0x0a1424, sand: 0x9aa4b8,
    window: 0xffc68a, windowAlt: 0xa8d8ff, lamp: 0xffd8a0,
    ribbon: 0x5a4a44, edge: 0xcfe6ff, fret: 0xd8e6ff, glow: 0x9fc8ff, hold: 0x7fd0ff, gate: 0xffffff, ribbonStyle: 1,
    skyLight: 0x5a6a90, bounce: 0x303848,
    board: 0x1a1a24, suit: 0x1a1a22, jacket: 0x8a78d8, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xbfe0ff,
  },
  spring: {
    zenith: 0x161a44, horizon: 0x8a6a9a, skyGlow: 0xffa8c0, glowDir: [1, 0.04, 0.4], skyline: 0x2a2440, moonDir: [0.6, 0.45, 0.7], moon: 0xfff0f6,
    fog: 0x4a3c5c, fogDensity: 0.0018, stars: 0.35, snow: 0, snowGround: 0, sunSize: 0,
    ground: 0x2a3a2a, street: 0xffd8a0, water: 0x1a2440, sand: 0xc8b49a,
    window: 0xffc68a, windowAlt: 0xffa8d8, lamp: 0xffd8a0,
    ribbon: 0x6a4e3e, edge: 0xffe6c0, fret: 0xffd8e8, glow: 0xffa8c0, hold: 0xff8fb8, gate: 0xfff6e8,
    skyLight: 0x8a7aa8, bounce: 0x5a4a40,
  },
  summer: {
    zenith: 0x2c2a6c, horizon: 0xff9a6a, skyGlow: 0xffb070, glowDir: [1, 0.03, 0.35], skyline: 0x6a3a50, moonDir: [1, 0.06, 0.32], moon: 0xffcf8a,
    fog: 0xa86a6a, fogDensity: 0.0014, stars: 0, snow: 0, snowGround: 0, sunSize: 1,
    ground: 0x3a4a2a, street: 0xffd28a, water: 0x2a3a5a, sand: 0xe8c89a,
    window: 0xffd28a, windowAlt: 0xff9ed2, lamp: 0xffd28a,
    ribbon: 0x7a5640, edge: 0xffe0a0, fret: 0xfff0c8, glow: 0xff9a6a, hold: 0x2fe0ff, gate: 0xfff4d8,
    skyLight: 0xffb08a, bounce: 0x8a5a40,
  },
  summernight: {
    zenith: 0x0a0a26, horizon: 0x3a2056, skyGlow: 0xff6fa8, glowDir: [1, 0.04, 0.35], skyline: 0x1a1030, moonDir: [-0.4, 0.4, 0.8], moon: 0xffeef8,
    fog: 0x2e1c40, fogDensity: 0.0018, stars: 1, sunSize: 0,
    ground: 0x16201a, street: 0xffc070, water: 0x0c1428, sand: 0x8a7a68,
    window: 0xffc070, windowAlt: 0xff8ad0, lamp: 0xffc070,
    ribbon: 0x5a4034, edge: 0xffd28a, fret: 0xffb8e0, glow: 0xff6fa8, hold: 0xff5fa8, gate: 0xfff0e0,
    skyLight: 0x6a5a9a, bounce: 0x5a3a2a,
  },
  september: {
    zenith: 0x14122e, horizon: 0x8a4a3a, skyGlow: 0xff8a50, glowDir: [1, 0.03, 0.4], skyline: 0x3a2030, moonDir: [1, 0.04, 0.4], moon: 0xffb070,
    fog: 0x5a3a40, fogDensity: 0.0019, stars: 0.2, sunSize: 0.7,
    ground: 0x2a2a20, street: 0xffb070, water: 0x1a2236, sand: 0xb89a7a,
    window: 0xffb070, windowAlt: 0xffa0a0, lamp: 0xffb070,
    ribbon: 0x5e4436, edge: 0xffcf9a, fret: 0xffd0b0, glow: 0xff8a50, hold: 0x36d8ff, gate: 0xfff0d8,
    skyLight: 0x9a7a8a, bounce: 0x6a4a3a,
  },
  // Heart of the Party: red and gold, a heart where the moon should be
  party: {
    zenith: 0x0a0414, horizon: 0x4a1430, skyGlow: 0xff4a5e, glowDir: [0.3, 0.04, 1], skyline: 0x1c0a1c, moonDir: [0, -1, 0], moon: 0xff8aa6,
    fog: 0x2c0c24, fogDensity: 0.0019, stars: 0.5, sunSize: 0,
    ground: 0x0e0810, street: 0xffb060, roof: 0x1e1220, wall: 0x2a1e2c, tree: 0x0f1612,
    window: 0xffc070, windowAlt: 0xff5f8a, lamp: 0xffb060,
    ribbon: 0x2a0a18, edge: 0xffd27a, fret: 0xffb3c8, glow: 0xff3355, hold: 0xff4fb8, gate: 0xfff2c8,
    skyLight: 0x7a3a6a, bounce: 0x5a2a2a, heart: 0xff2a50,
    board: 0x1a0f18, suit: 0x0d0b14, jacket: 0xff2a4a, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffd27a,
    hemiK: 1.7, fillK: 0.5, sunK: 0.9, windowK: 1.5, snow: 0, snowGround: 0, rain: 0, clouds: 0.35, daze: 0,
  },
  late: {
    zenith: 0x040714, horizon: 0x18213e, skyGlow: 0x5a78d8, glowDir: [0.3, 0.04, 1], skyline: 0x0c1226, moon: 0xa8b8ff,
    fog: 0x121a30, fogDensity: 0.0022, stars: 0.9,
    ground: 0x0a0c14, street: 0x9fb8ff, window: 0xbfd4ff, windowAlt: 0xff5f6a, lamp: 0xb8c8ff,
    ribbon: 0x10142a, edge: 0x9fc8ff, fret: 0xd0e0ff, glow: 0xff3a4a, hold: 0x6fa8ff, gate: 0xf0f6ff,
    skyLight: 0x3a4a7a, bounce: 0x2a2a3a, heart: 0xff3048,
    hemiK: 1.4, fillK: 0.35, windowK: 0.45,
  },
  vigil: {
    zenith: 0x020206, horizon: 0x120e1c, skyGlow: 0x3a2050, glowDir: [0.3, 0.04, 1], skyline: 0x08060e, moon: 0xff6a80,
    fog: 0x0a0812, fogDensity: 0.0026, stars: 1.3,
    ground: 0x050408, street: 0x5a4a6a, window: 0x7a5a4a, windowAlt: 0x4a3a5a, lamp: 0x6a5a7a,
    ribbon: 0x0a0810, edge: 0x5cffa8, fret: 0x9affd0, glow: 0xff3a5a, hold: 0x4cff9a, gate: 0xe8fff0,
    skyLight: 0x2a2440, bounce: 0x1a1418, heart: 0xff2040,
    hemiK: 1.0, fillK: 0.25, windowK: 0.25,
  },
  encore: {
    zenith: 0x10041a, horizon: 0x6a1840, skyGlow: 0xff5a6a, glowDir: [0.3, 0.04, 1], skyline: 0x2a0c28, moon: 0xffa0b8,
    fog: 0x3a1030, fogDensity: 0.0016, stars: 0.4,
    ground: 0x120810, street: 0xffc070, window: 0xffd28a, windowAlt: 0xff7fd0, lamp: 0xffc070,
    ribbon: 0x34081c, edge: 0xffe08a, fret: 0xffc8e0, glow: 0xff2a55, hold: 0xff4fb8, gate: 0xfff2c8,
    skyLight: 0x8a3a7a, bounce: 0x6a2a3a, heart: 0xff2050,
    hemiK: 2.0, fillK: 0.7, windowK: 1.9,
  },
  // the choruses: the square, hotter, every window lit
  hptChorus: {
    zenith: 0x14061e, horizon: 0x7a1838, skyGlow: 0xff3a5e, fog: 0x3a0e2a, fogDensity: 0.0016, window: 0xffd08a, windowAlt: 0xff6fa0, lamp: 0xffc070,
    edge: 0xffe08a, glow: 0xff2a55, skyLight: 0x9a4a7a, bounce: 0x6a2a3a, hemiK: 2.0, fillK: 0.7, windowK: 1.9,
  },
  // the stop: the lights drop with the band
  hptHush: { skyGlow: 0x6a1a3a, horizon: 0x2a0a20, window: 0x5a3a3a, fog: 0x1a0612, fogDensity: 0.0024, hemiK: 1.1, fillK: 0.3, windowK: 0.5 },
  // the band on its own: the square in violet, the floor lit
  hptDance: {
    zenith: 0x0a0420, horizon: 0x3a1460, skyGlow: 0xb040ff, fog: 0x1e0c36, fogDensity: 0.0017, window: 0xd0a0ff, windowAlt: 0x5ff2ff, lamp: 0xc890ff,
    edge: 0xc8a0ff, fret: 0xffc8f0, glow: 0xff3aa0, hold: 0x8a5aff, skyLight: 0x6a4aa8, bounce: 0x3a2a5a, heart: 0xff2a70, hemiK: 1.9, fillK: 0.7, windowK: 1.7,
  },
  // his mother's street: soft as Sunday, the sky going pale at the edge
  hptSunday: {
    zenith: 0x1a1a3a, horizon: 0x6a4a6a, skyGlow: 0xffa0a8, stars: 0.35, fog: 0x3a2a40, fogDensity: 0.0017, window: 0xffd8a8, windowAlt: 0xffb0c0, lamp: 0xffe0b0,
    street: 0xffd8b0, edge: 0xfff0d8, fret: 0xffd0e0, glow: 0xff7a90, hold: 0xff9ac8, skyLight: 0x8a7a9a, bounce: 0x5a4048, heart: 0xff4a6a, hemiK: 1.6, fillK: 0.55, windowK: 0.9,
  },
  // "she closes her eyes": nearly nothing but the heart
  hptEyes: {
    zenith: 0x010104, horizon: 0x0a0810, skyGlow: 0x2a1840, fog: 0x060408, fogDensity: 0.0028, stars: 1.5, window: 0x3a2a2a, windowAlt: 0x2a2a3a, lamp: 0x3a3048,
    hemiK: 0.7, fillK: 0.15, windowK: 0.1,
  },
  // "there you are": the lights back on
  hptReturn: {
    zenith: 0x10061a, horizon: 0x5a1838, skyGlow: 0xff6a7a, fog: 0x2a0c24, fogDensity: 0.0018, stars: 0.6, window: 0xffd08a, windowAlt: 0xff7fd0, lamp: 0xffc070,
    street: 0xffc070, edge: 0xffe08a, fret: 0xffc8e0, glow: 0xff2a55, hold: 0xff4fb8, skyLight: 0x8a3a7a, bounce: 0x6a2a3a, hemiK: 1.8, fillK: 0.6, windowK: 1.6,
  },
  // the end of the night: the sky going pink and gold behind the stage
  hptDawn: {
    zenith: 0x221a52, horizon: 0xff8e9a, skyGlow: 0xffb48a, stars: 0.18, fog: 0x6a3858, fogDensity: 0.0014, window: 0xffd8a0, windowAlt: 0xff9ad0, lamp: 0xffd090,
    street: 0xffd090, edge: 0xffe8b0, fret: 0xffd8e8, glow: 0xff4a6a, hold: 0xff6ab8, skyLight: 0xc88aa0, bounce: 0x8a5a5a, heart: 0xff3a60, hemiK: 2.1, fillK: 0.85, windowK: 1.2,
  },
  rain: {
    zenith: 0x080c16, horizon: 0x283044, skyGlow: 0x6a8ab8, glowDir: [1, 0.04, 0.4], skyline: 0x101420, moonDir: [-0.4, 0.4, 0.8], moon: 0x8090b0,
    fog: 0x1c2434, fogDensity: 0.0027, stars: 0, sunSize: 0, rain: 0.9, snow: 0,
    ground: 0x141a22, street: 0xffc890, water: 0x0a1018, sand: 0x5a5e66,
    window: 0xffc890, windowAlt: 0xffa8d0, lamp: 0xffc890,
    ribbon: 0x3e3430, edge: 0xffd8a8, fret: 0xffe0f0, glow: 0xff8ab8, hold: 0xff6fb0, gate: 0xf4f0ff,
    skyLight: 0x4a5878, bounce: 0x3a3440,
  },
};
