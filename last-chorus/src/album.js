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
    id: 'kiss-me-like-a-car-crash',
    accent: '#ff3d8b',
    title: 'Kiss Me Like a Car Crash',
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 13.13, kind: 'chorus', c: 1.1 },
      { t: 20.28, kind: 'break', start: 'launch', kick: 9, endY: 10 },   // the band stops: hang in the quiet, land on the stab
      { t: 22.99, kind: 'post', endY: 10 },
      { t: 31.29, kind: 'verse' },
      { t: 48.00, kind: 'pre' },
      { t: 53.58, kind: 'chorus', start: 'launch', kick: 11 },           // the stop before "showed up like a car crash"
      { t: 74.48, kind: 'verse' },
      { t: 86.90, kind: 'pre', endY: 30 },
      { t: 99.49, kind: 'bridge', endY: 50 },                            // "this has to end ... pull the pin"
      { t: 111.98, kind: 'final', start: 'launch', kick: 14, endY: 5 },           // the pin
      { t: 149.0, kind: 'outro' },
    ],
    palette: 'carcrash',
    scenery: {
      zones: [
        { from: -4, to: 21, kits: ['suburb'], water: true },
        { from: 21, to: 52, kits: ['strip'] },
        { from: 52, to: 90, kits: ['city'] },
        { from: 90, to: 127, kits: ['downtown'] },
        { from: 127, to: 141, kits: ['city'] },
        { from: 141, to: 172, kits: ['strip'] },
      ],

      roads: [
        { x: 0, width: 12, walk: 3.5, laneLines: 0, from: -10, to: 13.5, traffic: false, lampEvery: 18 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 13.5, to: 175, lanes: [-9, -3, 3, 9], density: 0.6, police: 0.05, lampEvery: 27 },
      ],
      overpasses: [24.4, 41.0, 61.5, 80.0, 118.5, 134.0],
      lyrics: [
        { t: 0.4, text: 'KISS ME LIKE\nA CAR CRASH', lead: 2.2 },
        { t: 10.6, text: 'LOVE ME LIKE\nA LANDSLIDE', side: -1 },
        { t: 16.7, text: "DON'T SAY\nGOODBYE" },
        { t: 47.7, text: 'I ONLY BREAK THE THINGS\nI WANT TO KEEP', side: -1 },
        { t: 55.7, text: 'I WANNA\nTASTE THE WRECK' },
        { t: 92.9, text: 'IF LOVE IS\nJUST A WARNING', side: -1 },
        { t: 95.5, text: 'LEAVE ME\nWHERE I DIED' },
        { t: 104.9, text: 'PULL THE PIN', side: -1 },
        { t: 106.3, text: 'HOLD ME CLOSE' },
        { t: 123.6, text: 'STILL BREATHING\nIN THE DIRT', side: -1 },
        { t: 135.7, text: 'JUST SAY\nGOODBYE' },
      ],
      finale: { t: 153.9, x: -11, fireAt: 143.9 },
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
      { t: 219.62, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10, turn: 0.3 },
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
      finale: { kind: 'talk', t: 259.4, x: -26, fireAt: 241.8, say: 241.96, orbit: { r: 66, h: 9, y: 22, facing: true, back: 1.2, right: 0.3, swing: 0.15 } },
    },
  },
  {
    // the town sings it, through a whole year: winter, the first warm Friday,
    // summer, the last car south in September, the first cold rain
    id: 'summer-people',
    accent: '#ffb070',
    title: 'Summer People',
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
      { t: 202.27, kind: 'break', start: 'launch', kick: 9, endY: 30 },
      { t: 207.27, kind: 'final', start: 'launch', kick: 13, endY: 5 },      // first cold rain, plywood going up
      { t: 261.0, kind: 'outro' },
    ],
    palette: 'winter',
    ground: 'ocean',
    looks: [
      { t: -99, palette: 'winter' },
      { t: 49.86, palette: 'spring', fade: 6 },
      { t: 66.0, palette: 'summer', fade: 1.6 },
      { t: 98.0, palette: 'summernight', fade: 10 },
      { t: 166.36, palette: 'september', fade: 9 },
      { t: 208.0, palette: 'rain', fade: 2.5 },
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
      ],
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
      finale: { kind: 'ferris', t: 267.5, x: -64, fireAt: 240.3, orbit: { r: 85, h: 4, y: 26 } },
    },
  },
  {
    // an early-summer heat wave at a big house. The drive between cypresses in the glare; the gates
    // (one shut, four open); all the money on your wrist; the napkin with the digits; gold heels; the
    // thermometer in the red; the privacy hedges and the thunder; the house changing its plan; the
    // valet curb; a set of hearts; the storm breaking; the marble bathroom and its loose pearls; and
    // the cage of polished wood, splintered as you go through. The house after the rain at the end.
    id: 'your-wife-my-number',
    accent: '#e0b84a',
    title: 'Your Wife, My Number',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // the drive in the glare
      { t: 10.46, kind: 'pre', endY: 22 },                                                      // "she texts better than you"
      { t: 12.37, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 9, endY: 10 },         // the band: through the first gate
      { t: 18.13, kind: 'verse', c: 0.9, endY: 12 },                                            // "all the money on your wrist"
      { t: 33.47, kind: 'verse', c: 0.95, endY: 12 },                                           // "you call it messy, I call it lore"
      { t: 39.21, kind: 'break', endY: 16 },                                                    // "I open four"
      { t: 41.14, kind: 'pre', endY: 22 },
      { t: 43.04, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 9, endY: 10 },         // "your wife, my number"
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
      { t: 143.47, kind: 'final', start: 'launch', launchBeats: 2, kick: 11, endY: 10 },        // after the rain
      { t: 156.83, kind: 'final', c: 1.3, endY: 11 },
      { t: 169.91, kind: 'break', endY: 16 },                                                   // "splintered it good"
      { t: 171.82, kind: 'final', c: 1.2, endY: 10 },                                           // "she texts better than you"
      { t: 175.57, kind: 'outro', endY: 5 },
    ],
    palette: 'ymHeat',
    world: 'estate',
    collect: 'pearl',
    titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.4 },
    looks: [
      { t: -99, palette: 'ymHeat' },
      { t: 43.04, palette: 'ymNoon', fade: 0.4 },        // the chorus in the glare
      { t: 52.0, palette: 'ymCloud', fade: 1.6 },        // "I want thunder"
      { t: 60.0, palette: 'ymNoon', fade: 3.0 },
      { t: 75.4, palette: 'ymEvening', fade: 2.0 },      // the valet curb
      { t: 100.08, palette: 'ymStorm', fade: 0.6 },      // the storm breaks
      { t: 128.5, palette: 'ymBath', fade: 0.4 },        // the marble bathroom
      { t: 137.9, palette: 'ymGolden', fade: 0.6 },      // after the rain
    ],
    moments: [
      { t: 12.37, kind: 'flash', k: 0.2 },
      { t: 52.08, kind: 'thunder', k: 0.7 },             // "I want thunder"
      { t: 69.74, kind: 'blackout', dur: 1.9, k: 0.4 },  // "change its plan"
      { t: 100.08, kind: 'thunder', k: 0.6 },
      { t: 109.04, kind: 'thunder', k: 0.9 },            // "I want thunder"
      { t: 113.31, kind: 'thunder', k: 0.6 },
      { t: 126.52, kind: 'blackout', dur: 1.8, k: 0.5 },
      { t: 143.47, kind: 'flash', k: 0.3 },
      { t: 170.50, kind: 'knock', n: 2, gap: 90, k: 1.0 },   // "splintered it good"
    ],
    scenery: {
      rooms: [
        { style: 'marble', from: 128.41, to: 137.83, caps: [{ kind: 'front', hw: 13, hh: 28 }, { kind: 'wall', hw: 13, hh: 28 }] },   // the marble bathroom
      ],
      car: { t: 78.6, x: 30, paint: 0xf2f0ea, len: 26, rot: 0.6, y: 1.6 },   // at the valet curb
      zones: [
        { from: -6, to: 128.3, kits: ['ymDrive'], gaps: [[66.5, 73.5, -1]] },   // cypresses down the drive (a gap for the house)
        { from: 137.9, to: 200, kits: ['ymDrive'], x: 40, gaps: [[176, 200]] },
        { from: 48.8, to: 53.4, kits: ['ymHedges'], every: 0.9, x: 22 },        // "you want privacy"
        { from: 0, to: 0.1, kits: ['ymGates'], at: [
          [12.9, 12.37],                                                          // the drop: the first gate open
          [41.2, 40.38], [41.9, 40.54], [42.6, 40.80], [43.3, 40.96],             // "I open four"
          [98.4, 97.44], [99.1, 97.60], [99.8, 97.84], [100.5, 98.02],
        ] },
        { from: 0, to: 0.1, kits: ['ymProps'], at: [
          { t: 21.6, x: -26, kind: 'watch', s: 1.2 },                          // "all the money on your wrist"
          { t: 28.6, x: 24, kind: 'napkin', s: 1.1 },                          // "I wrote my digits on a napkin fold"
          { t: 33.0, x: -26, kind: 'heels', s: 2.2 },                          // "her step pure gold"
          { t: 39.4, x: -34, kind: 'gate', s: 0.9 },
          { t: 47.2, x: 28, kind: 'thermo', s: 1.2, rise: 45.66 },             // "heat wave grin in early summer"
          { t: 70.8, x: -64, kind: 'house', s: 1.2, flip: 69.74 },             // "watch your whole house change its plan"
          { t: 77.8, x: 24, kind: 'valet', s: 1.1 },                           // "she met me later by the valet curb"
          { t: 131.6, x: -20, kind: 'sink', s: 1.2, floor: true },             // "marble sink, loose pearl"
        ] },
        { from: 0, to: 0.1, kits: ['spProps'], at: [
          { t: 89.6, x: -24, kind: 'likes', s: 1.1 },                          // "she sent a wink and a set of hearts"
        ] },
        { from: 128.8, to: 137.4, kits: ['ymPearls'], every: 1.0 },
        { from: 0, to: 0.1, kits: ['ymCage'], at: 171.0, burst: 170.5 },      // "you built a cage with polished wood... splintered it good"
      ],
      lyricPart: 'ymSign', lyricX: 0, lyricBg: '#f4efe4', lyricColor: '#1e3a2a', lyricCore: '#1e3a2a',
      lyrics: [
        { t: 9.92, text: 'SHE TEXTS BETTER THAN YOU', h: 14 },
        { t: 19.0, text: 'YOU ARE ALL THE MONEY\nON YOUR WRIST', h: 14 },
        { t: 26.76, text: 'I WROTE MY DIGITS\nON A NAPKIN FOLD', h: 14 },
        { t: 33.98, text: 'YOU CALL IT MESSY,\nI CALL IT LORE', h: 14 },
        { t: 37.58, text: 'YOU SHUT ONE GATE,\nI OPEN FOUR', h: 14, lead: 1.0 },
        { t: 49.44, text: 'YOU WANT PRIVACY,\nI WANT THUNDER', h: 14 },
        { t: 64.36, text: "I DON'T STEAL,\nI SIMPLY STAND", h: 14 },
        { t: 75.22, text: 'SHE MET ME LATER\nBY THE VALET CURB', h: 14 },
        { t: 87.26, text: 'SHE SENT A WINK\nAND A SET OF HEARTS', h: 14 },
        { t: 145.78, text: 'SAINTLY BRUNCH\nWITH WICKED MANNERS', h: 14 },
        { t: 164.44, text: 'YOU BUILT A CAGE\nWITH POLISHED WOOD', h: 14 },
      ],
      shelf: 60, drop: 5,
      finale: { kind: 'glasshouse', t: 181.0, x: -70, s: 1.3, rot: -1.57, orbit: { r: 170, h: 16, y: 24, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
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
    sections: [
      { t: 0.0, kind: 'intro', endY: 7, turn: 0.25 },
      { t: 6.01, kind: 'verse', c: 0.8, endY: 8, turn: 0.25 },                  // the film starts
      { t: 11.83, kind: 'verse', endY: 9, turn: 0.35 },                         // "she wanted Avatar"
      { t: 27.75, kind: 'pre', endY: 13, turn: 0.5 },                           // "20 minutes and I got up"
      { t: 33.53, kind: 'verse', c: 1.0, endY: 10 },                            // "out in the lobby by the popcorn"
      { t: 45.08, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },  // the bass drops out: "it won't let you lose"
      { t: 68.08, kind: 'post', endY: 9 },                                      // "a pirate one, a captain one"
      { t: 79.56, kind: 'verse', c: 0.95, endY: 12 },                           // "the credits roll"
      { t: 93.89, kind: 'chorus', c: 1.35, endY: 8 },
      { t: 118.24, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 10 },   // "different girl, different year"
      { t: 123.97, kind: 'verse', c: 0.9, endY: 14 },
      { t: 138.28, kind: 'pre', endY: 22 },                                     // "red dress, my mirror"
      { t: 152.61, kind: 'chorus', endY: 12 },                                  // "strangers have seen my dresser"
      { t: 164.07, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },   // "where the hell was I?"
      { t: 172.69, kind: 'final', start: 'launch', launchBeats: 4, kick: 11 },
      { t: 189.87, kind: 'post', c: 1.15, endY: 9 },                            // "still up on the dresser"
      { t: 201.37, kind: 'bridge', endY: 8, turn: 0.1 },                        // "next time I'm staying in the movie"
      { t: 205.78, kind: 'break', start: 'launch', launchBeats: 4, kick: 5, endY: 7, turn: 0.05 },    // the silence
      { t: 210.12, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 5, turn: 0.05 },   // "even if it's Avatar"
      { t: 218.79, kind: 'outro', turn: 0.05 },
    ],
    palette: 'auditorium',
    world: 'cinema',
    titleView: { ahead: 0.16, x: 1.7, h: 1.25, back: 0.05, lookH: 1.6 },   // in front of her: the screen behind
    looks: [
      { t: -99, palette: 'auditorium' },
      { t: 31.0, palette: 'lobby', fade: 1.5 },            // "out in the lobby by the popcorn"
      { t: 81.0, palette: 'credits', fade: 2 },            // "the door swung open, blue light in her hair"
      { t: 89.0, palette: 'lobby', fade: 4 },
      { t: 94.2, palette: 'carpark', fade: 1.4 },          // out the front doors: "I never went back in"
      { t: 118.3, palette: 'room', fade: 0.4 },            // "different girl, different year"
      { t: 140.2, palette: 'roomred', fade: 1.2 },         // "red dress, my mirror"
      { t: 147.5, palette: 'room', fade: 4 },
      { t: 201.6, palette: 'screen', fade: 1.6 },          // "next time I'm staying in the movie"
      { t: 211.6, palette: 'avatar', fade: 1.2 },          // "even if it's Avatar"
    ],
    moments: [
      { t: 118.2, kind: 'flash', k: 0.9 },
    ],
    scenery: {
      flat: [[92.5, 119.5, 0]],
      signs: [
        { key: 'MARQUEE', text: 'NOW SHOWING\nAVATAR', color: '#ffe6a0', core: '#ffffff', bg: '#140a14', frame: '#ffcf6a', size: 70 },
        { key: 'CINEMA', text: 'CINEMA 12', color: '#ff4fb8', core: '#ffe0f4', size: 86 },
      ],
      halls: [
        { style: 'auditorium', from: -10, to: 31.5, screenAt: -3.6, caps: [false, true] },
        { style: 'lobby', from: 31.5, to: 93.9, caps: [false, true] },
        { style: 'room', from: 118.24, to: 201.37, caps: [false, true], showFrom: 118.12 },
        { style: 'auditorium', from: 201.37, to: 240, screenAt: 227.2, screenK: 1.3, caps: [false, false] },
      ],
      zones: [
        { from: -4, to: 30.6, kits: ['seats'], face: 'back' },
        { from: 34.2, to: 34.3, kits: ['concession'], at: 34.2, x: -15.5 },        // "by the popcorn"
        { from: 36.5, to: 36.6, kits: ['claws'], at: 36.5, x: 11.6, s: 2.9 },      // "there's a light I can't get past"
        { from: 46.6, to: 67.8, kits: ['claws'], row: true },                       // "it won't let you lose"
        { from: 72.0, to: 79.0, kits: ['claws'], row: true },
        { from: 93.9, to: 118.2, kits: ['carpark'], cinema: true },
        { from: 118.4, to: 201.0, kits: ['dresser'] },
        { from: 140.2, to: 140.3, kits: ['mirror'], at: 140.6, x: -30 },           // "red dress, my mirror"
        { from: 157.0, to: 157.1, kits: ['roomLamp'], at: 157.0, x: 29, s: 0.5 },
        { from: 202.0, to: 225.6, kits: ['seats'] },
      ],
      roads: [
        { x: 0, width: 22, walk: 3, laneLines: 0, from: 93.6, to: 118.6, traffic: false, lampEvery: 16, dry: false },
      ],
      lyricFloor: true,
      lyrics: [
        { t: 101.0, text: 'I NEVER\nWENT BACK IN', side: 1, x: 26 },
        { t: 110.6, text: 'IT WON\'T LET\nYOU LOSE', side: -1, x: 26 },
        { t: 152.6, text: 'STRANGERS HAVE\nSEEN MY DRESSER', side: 1, x: 30 },
        { t: 156.9, text: 'NOBODY KNOWS\nWHOSE ROOM', side: -1, x: 30 },
        { t: 189.9, text: 'STILL UP ON\nTHE DRESSER', side: 1, x: 30 },
      ],
      finale: { kind: 'screen', t: 227.2, startT: -3.6, fireAt: 210.1, orbit: { r: 44, h: 1, y: -7, facing: true, back: 2.5, swing: 0.3, right: 0.28 } },
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
      { t: 45.84, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10 },             // "three, two, one": off
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
      finale: { kind: 'rocket', t: 197.0, x: -70, s: 1, clockX: -12, clockY: 30, clockZ: 46, clockRot: -2.07, clockS: 0.8, seq: [[-99, 4], [184.14, 5], [185.80, 6], [187.08, 7], [187.92, 8], [189.08, 9], [191.56, 10]], zero: 191.56, burnFor: 1.6, fireAt: 189.0, orbit: { r: 175, h: 6, y: 52, facing: true, back: 2, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // the candy factory where his songs get made: the syrup, the coating pans, the taffy
    // puller, the venom; the presses stuttering, the trap, the gumball machine; the power
    // tripping; out the loading dock onto your block, where it's still what's playing.
    id: 'unloaded',
    accent: '#ff5fd2',
    title: 'Unloaded',
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
      { t: 95.02, kind: 'chorus', start: 'launch', kick: 11, endY: 10 },
      { t: 105.15, kind: 'break', endY: 12 },
      { t: 106.61, kind: 'verse', endY: 14 },                                      // out onto the block
      { t: 116.79, kind: 'pre', endY: 22 },
      { t: 119.70, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the drop
      { t: 128.49, kind: 'outro', endY: 5 },
    ],
    palette: 'unlNight',
    world: 'candy',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 5.0 },   // behind her, the factory's doors and the peppermint ahead
    looks: [
      { t: -99, palette: 'unlNight' },
      { t: 8.23, palette: 'unlCook', fade: 0.4 },          // in through the doors: the syrup kitchen
      { t: 24.26, palette: 'unlFloor', fade: 0.5 },        // the production floor
      { t: 45.82, palette: 'unlPress', fade: 0.3 },        // the stamping room
      { t: 58.82, palette: 'unlShow', fade: 0.4 },         // the showroom
      { t: 71.94, palette: 'unlFloor', fade: 0.4 },
      { t: 85.84, palette: 'unlDark', fade: 0.12 },        // "everything I touch trips"
      { t: 95.02, palette: 'unlFull', fade: 0.12 },        // "before the chorus hits"
      { t: 106.61, palette: 'unlBlock', fade: 0.6 },       // out onto the block
      { t: 119.70, palette: 'unlDrop', fade: 0.3 },        // still what's playing
    ],
    moments: [
      { t: 59.72, kind: 'knock', k: 0.6, n: 1 },           // "trap snapped"
      { t: 67.10, kind: 'pop', k: 0.6 },                   // "bubble gum"
      { t: 85.84, kind: 'blackout', dur: 0.25, k: 0.55 },  // the power trips
      { t: 95.02, kind: 'flash', k: 0.6 },                 // the lights back on as the chorus hits
      { t: 119.70, kind: 'flash', k: 0.5 },
    ],
    scenery: {
      rooms: [
        { style: 'cook', from: 8.23, to: 24.26, caps: [{ kind: 'front', hw: 16, hh: 30 }, UDOOR] },   // "drip-fed"
        { style: 'floor', from: 24.26, to: 35.80, caps: [null, UDOOR] },                               // the line
        { style: 'floor', from: 35.80, to: 45.82, caps: [null, UDOOR] },                               // "candy coated"
        { style: 'press', from: 45.82, to: 58.82, caps: [null, UDOOR] },                               // the presses stuttering
        { style: 'show', from: 58.82, to: 71.94, caps: [null, UDOOR] },                                // "trap snapped", "bubble gum"
        { style: 'floor', from: 71.94, to: 83.47, caps: [null, UDOOR] },
        { style: 'floor', from: 83.47, to: 95.02, caps: [null, UDOOR] },                               // the power trips
        { style: 'floor', from: 95.02, to: 106.61, caps: [null, { kind: 'wall', hw: 20, hh: 34 }] },   // out the loading dock
      ],
      roomEvents: { dark: [85.84, 95.02, 0.02, 0.1], party: [119.70, 999, 0.05, 0.5] },
      zones: [
        // the yard at night: the trucks, the street, the stacks over the roof, the peppermint over the doors
        { from: -4, to: 8.0, kits: ['clubstreet'], dim: 0.9 },
        { from: -4, to: 8.2, kits: ['trucks'], at: [[2.6, 34, 0.2], [4.4, -36, -0.15], [6.3, 38, 0.1]] },
        { from: 9.0, to: 14.0, kits: ['stacks'], at: [[9.6, -86, 1], [11.6, 92, 1.15], [13.8, -100, 0.9]] },
        { from: 8.1, to: 8.2, kits: ['peppermint'], at: 8.12, y: 47 },
        // the syrup kitchen: kettles under the pipe, "drip-fed"
        { from: 9.5, to: 23.5, kits: ['vats'], at: [[13.6, -26], [13.6, 26], [13.6, -40], [13.6, 40], [16.6, -30, 1.2], [16.6, 34, 1.2], [19.6, -36], [19.6, 30], [22.4, -30, 1.1], [22.4, 36, 1.1]] },
        { from: 13.6, to: 13.7, kits: ['pipe'], at: [13.6], y: 30 },
        // the line: belts each side, the coating pans, the taffy puller, the tanks of the green
        { from: 24.6, to: 45.4, kits: ['belts'], every: 1.4, x: 46 },
        { from: 36.0, to: 45.0, kits: ['pans'], at: [[37.0, 30], [37.6, -30, 1.1], [43.6, 32], [44.2, -30]] },
        { from: 38.8, to: 38.9, kits: ['puller'], at: 38.8, x: -34, s: 1.3 },
        { from: 40.4, to: 41.5, kits: ['tanks'], at: [[40.4, 32], [40.9, -32], [41.4, 34]] },
        // the stamping room: a press coming down on every beat
        { from: 46.6, to: 58.4, kits: ['presses'], every: 0.72, x: 28 },
        // the showroom: lollipops, the trap, the gumball machine
        { from: 59.2, to: 71.6, kits: ['lollies'], every: 0.9, x: 32 },
        { from: 60.6, to: 60.7, kits: ['trap'], at: 60.6, x: 30, snap: 59.72, s: 1.5 },
        { from: 67.5, to: 67.6, kits: ['gumball'], at: 67.5, x: -34, blow0: 64.6, pop: 67.10 },
        // the line again
        { from: 72.2, to: 83.2, kits: ['belts'], every: 1.4, x: 46 },
        { from: 73.0, to: 82.0, kits: ['pans'], at: [[73.4, -30], [74.0, 30, 1.1], [79.6, -32], [80.2, 30]] },
        { from: 75.4, to: 76.5, kits: ['tanks'], at: [[75.4, -32], [75.9, 32], [76.4, -34]] },
        { from: 77.4, to: 77.5, kits: ['puller'], at: 77.4, x: 34, s: 1.3 },
        // the power trips; the mood ring in the dark
        { from: 86.8, to: 86.9, kits: ['breaker'], at: 86.8, x: -22, trip: 85.84 },
        { from: 92.0, to: 92.1, kits: ['moodRing'], at: 92.0, s: 1.1 },
        // everything going
        { from: 95.3, to: 106.3, kits: ['belts'], every: 1.4, x: 46 },
        { from: 96.0, to: 105.0, kits: ['pans'], at: [[96.4, 30], [97.0, -30, 1.1], [102.0, 32], [102.6, -30]] },
        { from: 98.6, to: 100.2, kits: ['tanks'], at: [[98.6, 32], [99.1, -32], [99.6, 34], [100.1, -34]] },
        { from: 100.6, to: 100.7, kits: ['puller'], at: 100.6, x: -34, s: 1.3 },
        { from: 103.4, to: 106.0, kits: ['lollies'], every: 0.8, x: 34 },
        // out onto the block: the walk-ups, string lights across, the fire, the busted clock
        { from: 106.4, to: 145, kits: ['tenements'], x: 38 },
        { from: 106.8, to: 140, kits: ['stringLights'], every: 1.3, span: 33 },
        { from: 110.6, to: 110.7, kits: ['pit'], at: 110.6, x: 27, s: 2.2 },
        { from: 115.6, to: 115.7, kits: ['streetClock'], at: 115.6, x: -26, s: 1.1 },
      ],
      roads: [
        { x: 0, width: 30, walk: 4, laneLines: 1, from: -10, to: 8.3, lanes: [], density: 0, lampEvery: 34, follow: true },
        { x: 0, width: 30, walk: 16, laneLines: 1, from: 106.5, to: 150, lanes: [], density: 0, lampEvery: 34, follow: true },
      ],
      lyricPart: 'hazardSign', lyricBg: '#a07c10', lyricColor: '#101010', lyricCore: '#101010', lyricS: 1,
      lyrics: [
        { t: 21.12, text: "I DON'T MAKE SONGS\nI MAKE THE THING", x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 38.56, text: 'SWEETEST VENOM\nEVER LAUDED', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 65.96, text: 'SPIT IT OUT AS\nBUBBLE GUM', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 113.88, text: 'RUNNING ON A\nBUSTED CLOCK', x: 0, h: 18, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'boombox', t: 132.6, x: -24, fireAt: 119.70, orbit: { r: 42, h: -3, y: 13, facing: true, back: 0.6, right: 0.3, swing: 0.2 } },
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
      { t: 132.10, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },
      { t: 141.70, kind: 'outro', endY: 5 },                                                    // the music goes
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
      finale: { kind: 'vanity', t: 152.4, x: -40, s: 1.6, rot: -1.57, orbit: { r: 110, h: 10, y: 18, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // a Sunday in a sunny suburb, a case built out of nothing: the dentist three times this
    // week, his car halfway down her street, brunch in broad daylight, the matinee. Nothing
    // happened. In the end he makes his getaway at the speed limit, blinker on, gone for good.
    id: 'nothing-happens-every-week',
    accent: '#ff4a4a',
    title: 'Nothing Happens Every Week',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 7 },
      { t: 6.22, kind: 'verse', c: 0.8, endY: 8 },                               // "you said you were at the dentist"
      { t: 26.74, kind: 'pre', endY: 15 },                                       // "so where were you on the night of nothing much"
      { t: 33.58, kind: 'pre', start: 'launch', launchBeats: 4, kick: 7, endY: 14 },   // "go on and plead the fifth"
      { t: 39.05, kind: 'chorus', c: 1.1, endY: 9 },                             // "nothing happened, nothing happened"
      { t: 59.59, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 9 },  // "something you were always free to be"
      { t: 63.69, kind: 'verse', c: 0.85, endY: 10 },                            // "I wrote it as a blessing"
      { t: 85.62, kind: 'pre', endY: 20 },                                       // "what's with the hat and sunglasses?"
      { t: 97.99, kind: 'chorus', endY: 10 },
      { t: 121.37, kind: 'break', endY: 12 },                                    // "we held the door for each other till it closed"
      { t: 126.88, kind: 'pre', endY: 22 },                                      // "your perfect alibi was the truth"
      { t: 136.54, kind: 'break', rb: 8, endY: 20 },                             // "nothing happened. Say it slow"
      { t: 142.01, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 12 },  // "the only charge that's ever gonna stick"
      { t: 149.03, kind: 'break', endY: 12 },                                    // "court adjourned"
      { t: 151.75, kind: 'post', start: 'launch', launchBeats: 4, kick: 7, endY: 10 },     // "before I ever took the stand"
      { t: 155.96, kind: 'chorus', endY: 10 },
      { t: 158.76, kind: 'break', start: 'launch', launchBeats: 4, kick: 6, endY: 10 },    // the bass goes
      { t: 161.55, kind: 'pre', endY: 16 },
      { t: 165.72, kind: 'chorus', c: 1.3, endY: 10 },                           // "now there's no one left to lie to me"
      { t: 178.21, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // "like a free man breaking free"
      { t: 180.97, kind: 'final', endY: 6, turn: 0.6 },                          // "you made your getaway at the speed limit"
      { t: 193.45, kind: 'break', endY: 8, turn: 0.4 },                          // "nothing happened, nothing ever will again"
      { t: 200.31, kind: 'final', c: 1.1, endY: 5, turn: 0.3 },
      { t: 204.48, kind: 'outro', turn: 0.2 },
    ],
    palette: 'sunday',
    world: 'sunday',
    skyline: 'hills',
    groundStyle: 'country',
    looks: [
      { t: -99, palette: 'sunday' },
      { t: 121.4, palette: 'sundaylate', fade: 12 },       // "we held the door for each other till it closed"
      { t: 181.0, palette: 'getaway', fade: 6 },           // "you made your getaway at the speed limit"
    ],
    confetti: [[92.6, 97.6]],                              // "you can shred the evidence"
    confettiColors: [0xf4f2ea, 0xffffff, 0xe8e4d8, 0xf0ece0, 0xfffaf0, 0xdcd8cc],
    scenery: {
      signs: [
        { key: 'DENTIST', text: 'DENTIST', color: '#2a6ad8', core: '#ffffff', bg: '#f4f8fa', size: 90 },
        { key: 'BRUNCH', text: 'BRUNCH', color: '#ff5a3a', core: '#fff4e8', bg: '#2a2420', size: 96 },
        { key: 'MATINEE', text: 'SUNDAY\nMATINEE', color: '#ffd166', core: '#ffffff', bg: '#3a1420', frame: '#ffd166', size: 74 },
        { key: 'COURT', text: 'COURTHOUSE', color: '#f2efe6', core: '#ffffff', bg: '#2a3240', size: 78 },
        { key: 'SPEED', text: 'SPEED\nLIMIT\n25', color: '#111111', core: '#111111', bg: '#f6f6f2', size: 64 },
        { key: 'BARBER', text: 'BARBER', color: '#e8203a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'PHARMACY', text: 'PHARMACY', color: '#2a9a4a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'FLORIST', text: 'FLORIST', color: '#ff6fa8', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'HARDWARE', text: 'HARDWARE', color: '#d8602a', core: '#ffffff', bg: '#2a2a30' },
        { key: 'BAKERY', text: 'BAKERY', color: '#c89a4a', core: '#fff8ec', bg: '#3a2418' },
      ],
      zones: [
        { from: -4, to: 26.7, kits: ['sundaystreet'], clear: [[15.0, 16.3, 1], [7.0, 10.2, 0], [9.5, 10.6, 1, 'all']] },
        { from: 7.0, to: 7.1, kits: ['tooth'], at: [7.4, 8.5, 9.6], x: 14.5 },     // "you said you were at the dentist / there's three teeth this week"
        { from: 26.7, to: 63.7, kits: ['mainstreet'], string: true, clear: [[32.4, 33.8, -1]] },
        { from: 33.0, to: 33.1, kits: ['cafe'], at: 33.0, x: -1 },                // "that broad daylight brunch"
        { from: 26.7, to: 63.7, kits: ['evidence'] },
        { from: 63.7, to: 74.4, kits: ['sundaystreet'] },
        { from: 74.4, to: 78.4, kits: ['market'] },                               // "she tells me about the market"
        { from: 79.6, to: 79.7, kits: ['matinee'], at: 79.6, x: 1 },              // "and the Sunday matinee"
        { from: 78.4, to: 98.0, kits: ['mainstreet'] },
        { from: 98.0, to: 121.4, kits: ['mainstreet'], string: true, signs: ['BARBER', 'BAKERY', 'FLORIST'] },
        { from: 98.0, to: 121.4, kits: ['evidence'] },
        { from: 121.4, to: 142.0, kits: ['sundaystreet'] },
        { from: 142.5, to: 142.6, kits: ['bigframe'], at: 142.5, s: 2.5, sy: 1.9 },          // "I'll frame it hanging in the hall": you go through it
        { from: 142.0, to: 156.0, kits: ['mainstreet'], signs: ['PHARMACY', 'HARDWARE'], clear: [[147.6, 152.4, 1]] },
        { from: 150.2, to: 150.3, kits: ['courthouse'], at: 150.2, x: 1, dist: 33 },        // "court adjourned before I ever took the stand"
        { from: 156.0, to: 181.0, kits: ['sundaystreet'], string: true },
        { from: 156.0, to: 181.0, kits: ['evidence'] },
        { from: 181.0, to: 196.0, kits: ['sundayedge'] },                         // the edge of town
        { from: 182.0, to: 194.0, kits: ['speedsigns'], every: 2.6 },              // "at the speed limit"
        { from: 196.0, to: 222.0, kits: ['fields'] },
      ],
      roads: [
        { x: 0, width: 12, walk: 3, laneLines: 1, from: -10, to: 196, lanes: [-3, 3], density: 0.05, lampEvery: 40, dry: true, follow: true },
        { x: 0, width: 10, walk: 0, laneLines: 1, from: 196, to: 230, traffic: false, lampEvery: 60, dry: true, follow: true },
      ],
      vehicles: [
        { kind: 'sedan', paint: 0xd8ccb4, at: 15.9, rate: 0, x: 1, lane: 2.1, yaw: 0.5, hazard: true, from: 2, to: 18.8 },    // "your car's parked fully illegal, halfway down her street"
        { kind: 'sedan', paint: 0xd8ccb4, lead: [[180.2, 0.35], [181.4, 0.55], [187.0, 0.6], [193.6, 3.2]], x: 0.001, lane: 99, from: 180.3, to: 194.4 },  // the getaway, blinker on
      ],
      lyricBg: '#f2efe6', lyricColor: '#1c1c1c', lyricCore: '#1c1c1c', lyricX: 25, lyricFloor: true,
      shelf: 70, drop: 2.4,
      lyrics: [
        { t: 36.3, text: 'SHE TELLS ME\nEVERYTHING', side: 1 },
        { t: 44.5, text: 'I CAUGHT YOU DOING\nNOTHING RED-HANDED', side: -1 },
        { t: 47.3, text: 'FINGERPRINTS\nON NOTHING', side: 1 },
        { t: 90.0, text: 'REAL SUBTLE, DUDE', side: -1 },
        { t: 99.4, text: 'NOTHING HAPPENED', side: 1 },
        { t: 128.1, text: 'YOUR PERFECT ALIBI\nWAS THE TRUTH', side: -1 },
        { t: 168.5, text: 'NO ONE LEFT\nTO LIE TO ME', side: 1 },
        { t: 193.2, text: 'GONE FOR GOOD', side: -1 },
      ],
      finale: { kind: 'town', t: 207.3, x: 17, s: 1.3, fireAt: 200.3, orbit: { r: 19, h: 4.4, y: 5.4, facing: true, back: 1.2, right: 0.3, swing: 0.25 } },
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
      { t: 142.29, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },
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
      finale: { kind: 'house', t: 244.0, x: -64, s: 2.4, rot: -1.57, fireAt: 232.0, orbit: { r: 130, h: 14, y: 16, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // the courthouse, and she's on trial for it: "order in the court", the marble halls and the
    // scales, the jury, the key thrown away, the evidence room, red-handed, the cells, the cuffs
    // worn like jewellery, her lawyer the mirror; then "case closed" in the courtroom, lipstick on.
    id: 'pretty-until-proven-guilty',
    accent: '#ff3a5a',
    title: 'Pretty Until Proven Guilty',
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
      { t: 84.05, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },
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
    ],
    moments: [
      { t: 1.22, kind: 'knock', k: 0.5, n: 1 },             // the gavel: "order in the court"
      { t: 95.44, kind: 'knock', k: 0.6, n: 2, gap: 150 },  // the cells slam: "lock me up"
      { t: 107.0, kind: 'shutter', k: 0.2 },                // the cuffs click
      { t: 158.32, kind: 'knock', k: 0.7, n: 1 },           // "case closed!"
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
        { style: 'court', from: 150.63, to: 182, caps: [null, { kind: 'wall', hw: 0.01, hh: 0.01 }] },   // "case closed"
      ],
      roomEvents: { red: [77.7, 84.0, 0.4, 0.4], cold: [107.9, 113.4, 0.8, 1.0] },
      zones: [
        // the courtroom: the gallery's benches, the bench ahead, the gavel on "order in the court"
        { from: -3.0, to: 6.8, kits: ['pews'], every: 0.5 },
        { from: 7.8, to: 7.9, kits: ['judgeBench'], at: [[7.87, -23.5, true], [7.87, 23.5, false]], strikes: [1.22] },
        // the marble hall: columns down both sides, the scales hung over the road
        { from: 8.6, to: 28.0, kits: ['columns'], every: 1.0, x: 40 },
        { from: 16.0, to: 16.1, kits: ['scales'], at: 16.0, lift: 24, s: 1.1 },
        // the courtroom: the jury box, the witness stand and its ring lights
        { from: 28.6, to: 46.5, kits: ['pews'], every: 0.55, clear: [[33.6, 37.4, 1], [40.4, 44.6, -1]] },
        { from: 35.5, to: 35.6, kits: ['jury'], at: 35.5, x: 36, s: 1.1 },
        { from: 42.4, to: 42.5, kits: ['stand'], at: 42.4, x: -34, s: 1.3 },
        // "throw away the key"; mirrors with bulbs round them down the hall
        { from: 50.3, to: 50.4, kits: ['key'], at: 50.3, throwAt: 48.94, s: 1.4 },
        { from: 50.6, to: 57.4, kits: ['vanities'], every: 0.75, x: 48.6, y: 20, s: 1.2 },
        // the evidence room: the hoodie in its bag, the receipts, the ring lights, the broken heart
        { from: 63.4, to: 63.5, kits: ['hoodie'], at: 63.4, x: 36, y: 18, s: 1.4 },
        { from: 64.6, to: 66.0, kits: ['receipts'], at: [65.0, 65.6], top: 40 },
        { from: 70.0, to: 70.1, kits: ['stand'], at: 70.0, x: 33, s: 1.2 },
        { from: 74.4, to: 74.5, kits: ['heartCase'], at: 74.4, x: -32, s: 1.3 },
        // red-handed: handprints and paint down the hall, the buckets
        { from: 77.6, to: 84.0, kits: ['paintDecals'], at: [[78.6, 49.6, 'hand', 12], [78.9, -49.6, 'hand', 18], [79.3, 49.6, 'splat', 22, 1.4], [79.6, -49.6, 'hand', 10], [80.0, 49.6, 'hand', 20], [80.4, -49.6, 'splat', 14, 1.6], [80.9, 49.6, 'hand', 9], [81.3, -49.6, 'hand', 24], [81.8, 49.6, 'splat', 16, 1.2], [82.3, -49.6, 'hand', 13], [82.8, 49.6, 'hand', 19], [83.3, -49.6, 'splat', 20, 1.5]] },
        { from: 78.0, to: 83.0, kits: ['buckets'], at: [[79.0, 30], [80.6, -32], [82.2, 34]] },
        { from: 76.6, to: 83.6, kits: ['columns'], every: 1.0, x: 40 },
        // the courtroom again
        { from: 84.4, to: 94.5, kits: ['pews'], every: 0.55 },
        // the cells: the doors slam shut down the row on "lock me up"
        { from: 95.0, to: 105.4, kits: ['cellDoors'], every: 0.5, x: 37.2, shut: 95.44, gap: 0.08 },
        // the room of mirrors: the cuffs on their cushion, then her lawyer
        { from: 107.5, to: 107.6, kits: ['cuffs'], at: 107.5, hang: true, lift: 16, click: 107.0, s: 1.6 },
        { from: 113.8, to: 113.9, kits: ['lawyer'], at: 113.8, lift: 18 },
        // the scales: pretty, guilty, pretty, guilty
        { from: 121.6, to: 134.8, kits: ['columns'], every: 1.0, x: 40 },
        { from: 134.0, to: 134.1, kits: ['scales'], at: 134.0, lift: 24, s: 1.25, tips: [[129.30, 1], [129.86, -1], [130.64, 1], [131.24, -1], [132.04, 1], [132.86, 1], [133.24, 1], [133.60, -1]] },
        // the last courtroom: "cuffs as couture"; the bench, "case closed"
        { from: 135.5, to: 150.3, kits: ['pews'], every: 0.55, clear: [[143.0, 146.0, -1]] },
        { from: 144.9, to: 145.0, kits: ['cuffs'], at: 144.9, x: -30, s: 1.5 },
        { from: 151.0, to: 166.0, kits: ['pews'], every: 0.55, clear: [[158.0, 161.5, -1]] },
        { from: 159.6, to: 159.7, kits: ['judgeBench'], at: [[159.6, -30, true]], strikes: [158.32, 160.30] },
      ],
      lyricPart: 'placard', lyricBg: '#3a2414', lyricColor: '#e8c060', lyricCore: '#fff0b0', lyricS: 1,
      lyrics: [
        { t: 0.0, lead: 2.4, text: 'ORDER IN\nTHE COURT', x: 0, h: 14, frame: 'rgba(0,0,0,0)' },
        { t: 34.48, text: 'PRETTY UNTIL\nPROVEN GUILTY', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 58.74, text: 'READ ME\nMY RIGHTS', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 82.44, text: 'CRIME OF\nTHE CENTURY', x: 0, h: 24, part: 'newspaper', bg: '#8a867c', color: '#141414', core: '#141414', font: 'Georgia, "Times New Roman", serif', weight: 900, frame: 'rgba(0,0,0,0)' },
        { t: 158.32, text: 'CASE CLOSED', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'lipstick', t: 168.4, x: -24, fireAt: 153.73, orbit: { r: 58, h: -6, y: 26, facing: true, back: 1.0, right: 0.3, swing: 0.2 } },
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
      { t: 173.26, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10, turn: 0.3 },     // the band comes back
      { t: 187.11, kind: 'final', c: 1.3, endY: 12, turn: 0.3 },                                        // "once enough to fill the stands"
      { t: 197.85, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },                // out the back
      { t: 213.22, kind: 'outro', endY: 5 },                                                            // "somebody made a key"
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
      finale: { kind: 'key', t: 219.6, x: 0, fireAt: 205.6, turn: 207.1, open: 208.3, orbit: { r: 70, h: 4, y: 20, facing: true, back: 1.4, right: 0.32, swing: 0.12 } },
    },
  },
  {
    // a clear morning, technically freezing. No coat; a coat is one more thing to carry.
    // Running the sunlit stretches, catching breath in the shade, early for every train
    // that pulls away. At the end the door's left unlocked and the cat thinks he hunts.
    id: 'technically-thirty-two',
    accent: '#8fd8ff',
    title: 'Technically Thirty-Two',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 9 },
      { t: 6.06, kind: 'verse', c: 0.85, endY: 9 },
      { t: 11.64, kind: 'chorus', c: 1.1, endY: 8 },                            // the band
      { t: 15.78, kind: 'verse', c: 0.8, endY: 10 },                            // "somebody's fire alarm is wailing"
      { t: 26.69, kind: 'verse', endY: 12 },                                    // "I cut the sunlit stretches quick"
      { t: 38.92, kind: 'pre', endY: 22 },                                      // "shade subtracts the sun"
      { t: 56.40, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },  // the bass goes
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
      { t: 194.35, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 10 },  // "I leave the door unlocked"
      { t: 206.80, kind: 'break', start: 'launch', launchBeats: 4, kick: 6, endY: 9 },    // "there's water in the fridge" and nothing
      { t: 210.85, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 6 },   // coming out of the sun
      { t: 217.74, kind: 'outro', endY: 3.5 },
    ],
    palette: 'frost',
    world: 'cold',
    looks: [
      { t: -99, palette: 'frost' },
      { t: 151.9, palette: 'overcast', fade: 4 },          // "she was only in my phone"; "she wanted kids"
      { t: 166.9, palette: 'thaw', fade: 5 },              // "now a family is the only thing I'm building toward"
      { t: 194.3, palette: 'homesun', fade: 3 },           // "I leave the door unlocked these days"
    ],
    scenery: {
      el: { x: -17, passes: [
        { at: 58.5, rate: 1.0, cars: 6, from: 54, to: 64.6 },             // a train keeping pace through the chorus
        { at: 66.2, rate: 1.5, cars: 6, from: 64.6, to: 76 },             // "I'm only ever early for the trains that pull away"
        { at: 114.0, rate: 1.55, cars: 7, from: 108, to: 124 },
        { at: 141.0, rate: 0.55, cars: 6, from: 134, to: 151 },           // "she cried through every goodbye"
        { at: 190.6, rate: 1.45, cars: 8, from: 186, to: 199 },           // "I'm done with being early"
      ] },
      signs: [],
      zones: [
        { from: -4, to: 194.4, kits: ['coldstreet'], el: -17 },
        { from: -4, to: 196, kits: ['el'], x: -17 },
        { from: 16.4, to: 16.5, kits: ['alarm'], at: 16.4, x: 25 },        // "somebody's fire alarm is wailing"
        { from: 66.0, to: 66.1, kits: ['station'], at: 66.0, x: -17 },
        { from: 102.0, to: 102.1, kits: ['tempsign'], at: 102.4, x: 17.5 }, // "can't breathe, it's technically thirty-two"
        { from: 123.0, to: 123.1, kits: ['station'], at: 123.1, x: -17, who: 0x7a2a4a, whoZ: 2 },   // "she'd be waiting at the platform"
        { from: 194.4, to: 232, kits: ['coldstreet'], el: -17, homes: true, low: true, gapAt: 222.6, gapX: 23 },
      ],
      roads: [
        { x: 0, width: 20, walk: 5, laneLines: 2, from: -10, to: 240, lanes: [-7, -2.5, 2.5, 7], density: 0.3, lampEvery: 30, dry: true },
      ],
      vehicles: [
        { kind: 'bus', route: 'FREE', at: 81.6, rate: 0.82, x: 1, from: 77, to: 93 },    // "the free bus fills up fast"
      ],
      lyrics: [
        { t: 64.5, text: "I'M ONLY EVER EARLY\nFOR THE TRAINS", side: 1, x: 26 },
        { t: 84.8, text: 'NO COAT', side: 1, x: 24 },
        { t: 135.5, text: 'SHE MADE IT\nWORTH THE COLD', side: 1, x: 26 },
        { t: 166.9, text: 'A FAMILY IS THE\nONLY THING', side: 1, x: 26 },
        { t: 197.1, text: 'I LEAVE THE DOOR\nUNLOCKED THESE DAYS', side: 1, x: 26 },
      ],
      finale: { kind: 'door', t: 222.6, x: 23, fireAt: 210.85, orbit: { r: 19, h: 3.5, y: 2.4, facing: true, back: 1.4, right: 0.3 } },
    },
  },
  {
    // a frozen lake at night, made from the music and nothing else. The hits crack the ice open, blue
    // light under it; the silence, then the band breaks in; shards of ice pushed up along the road on
    // every bar; a ship locked in the ice; one bar of nothing; the peak breaks the whole lake into
    // floes with the light coming up between them; and at the end the ship in open water, the aurora.
    id: 'good-girls-dont-fight-back',
    accent: '#7ae8ff',
    title: "Good Girls Don't Fight Back",
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // the first hits
      { t: 11.53, kind: 'pre', endY: 22 },                                                      // the bass comes in
      { t: 14.85, kind: 'verse', start: 'launch', launchBeats: 4, kick: 10, endY: 11 },         // the band, after the silence
      { t: 26.84, kind: 'verse', c: 1.1, endY: 12 },
      { t: 33.48, kind: 'chorus', endY: 11 },
      { t: 40.10, kind: 'break', endY: 16 },                                                    // one bar with the bass gone
      { t: 41.34, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // back in
      { t: 53.35, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10 },         // the peak
      { t: 66.59, kind: 'outro', endY: 5 },
    ],
    palette: 'ggIce',
    world: 'ice',
    collect: 'flake',
    skyline: 'hills',
    groundStyle: 'country',
    titleView: { ahead: -0.16, x: 1.4, h: 2.2, back: -0.8, lookH: 5.0 },
    looks: [
      { t: -99, palette: 'ggIce' },
      { t: 13.3, palette: 'ggIce', set: { skyLight: 0x1a2a40, hemiK: 1.0, snow: 0, fog: 0x02060c, glow: 0x2a6a8a }, fade: 0.2 },   // the silence
      { t: 15.0, palette: 'ggBand', fade: 0.2 },             // the band breaks in
      { t: 33.6, palette: 'ggLoud', fade: 0.8 },
      { t: 40.2, palette: 'ggLoud', set: { skyLight: 0x1a2a40, hemiK: 1.1, glow: 0x2a6a8a }, fade: 0.15 },   // one bar of nothing
      { t: 41.4, palette: 'ggLoud', fade: 0.15 },
      { t: 53.5, palette: 'ggPeak', fade: 0.4 },             // the peak
      { t: 67.0, palette: 'ggEnd', fade: 2.4 },              // open water
    ],
    moments: [
      { t: 6.99, kind: 'flash', k: 0.15 },
      { t: 14.85, kind: 'flash', k: 0.3 },
      { t: 41.34, kind: 'flash', k: 0.25 },
      { t: 53.35, kind: 'flash', k: 0.35 },
      { t: 65.34, kind: 'flash', k: 0.2 },
    ],
    confetti: [[14.9, 17.4], [53.4, 57.0]],
    confettiColors: [0xffffff, 0xd8f8ff, 0x8ae8ff, 0xb8f0ff],
    confettiNormal: true,
    scenery: {
      cracks: [[0.39, -40, 2.4, 0.8], [1.64, 46, 2.4, 0.8], [3.71, -30, 2.2, 1.0], [5.36, 38, 2.2, 1.0], [6.99, 0, 2.6, 1.5], [7.84, -50, 2.2, 1.0], [9.48, 44, 2.2, 1.1], [10.31, -36, 2.2, 1.1], [11.13, 30, 2.2, 1.1], [11.95, -24, 2.2, 1.2], [14.85, -40, 2.0, 1.6], [14.85, 44, 2.4, 1.6], [14.85, 0, 3.0, 1.8], [16.93, 36, 2.2, 1.1], [18.58, -43, 2.2, 1.1], [20.24, 50, 2.2, 1.1], [21.89, -37, 2.2, 1.1], [23.55, 44, 2.2, 1.1], [25.21, -51, 2.2, 1.1], [26.84, 38, 2.2, 1.1], [28.51, -45, 2.2, 1.1], [30.16, 52, 2.2, 1.1], [31.82, -39, 2.2, 1.1], [33.48, 46, 2.2, 1.1], [35.13, -53, 2.2, 1.1], [36.79, 40, 2.2, 1.1], [38.45, -47, 2.2, 1.1], [41.34, 0, 2.4, 2.2], [41.76, 30, 2.0, 1.3], [43.41, -41, 2.0, 1.3], [45.07, 52, 2.0, 1.3], [46.73, -39, 2.0, 1.3], [48.37, 50, 2.0, 1.3], [50.03, -37, 2.0, 1.3], [51.67, 48, 2.0, 1.3], [53.35, 0, 2.0, 2.6]],
      breakup: [53.35, 64.9, 69.5],
      aurora: [[0, 0.3], [14.85, 0.8], [33.48, 1.0], [40.1, 0.4], [41.34, 0.9], [53.35, 1.3], [66.59, 0.8]],
      zones: [
        // shards pushed up out of the ice on every bar
        { from: 0, to: 0.1, kits: ['ggShards'], at: [[17.07, 15.27], [18.73, 16.93], [20.38, 18.58], [22.04, 20.24], [23.70, 21.89], [25.35, 23.55], [27.01, 25.21], [28.64, 26.84], [30.31, 28.51], [31.96, 30.16], [33.62, 31.82], [35.27, 33.48], [36.93, 35.13], [38.59, 36.79], [40.24, 38.45]], x: 28, spread: 16 },
        { from: 0, to: 0.1, kits: ['ggShards'], at: [[43.56, 41.76], [45.21, 43.41], [46.87, 45.07], [48.53, 46.73], [50.17, 48.37], [51.83, 50.03], [53.47, 51.67]], x: 24, spread: 22, s: 1.4 },
        // the ship locked in the ice
        { from: 0, to: 0.1, kits: ['ggShip'], at: 37.4, x: -76, s: 1.0, rot: 0.35 },
        // the peak: light up through the gaps on the beat, icebergs heaving up on the hardest hits
        { from: 53.4, to: 66.6, kits: ['ggColumns'], every: 0.8, x: 50, on: 53.35, off: 64.9 },
        { from: 0, to: 0.1, kits: ['ggBergs'], at: [[56.6, -70, 54.17, 26], [59.4, 76, 56.65, 30], [62.4, -66, 59.96, 24], [64.0, 72, 61.62, 28], [66.6, -80, 63.27, 34], [68.0, 70, 65.34, 30]] },
      ],
      finale: { kind: 'ship', t: 72.4, x: -64, s: 1.2, rot: 0.55, fireAt: 66.6, orbit: { r: 170, h: 14, y: 22, facing: true, back: 2, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // a school day, the love story and the alarm: in through the metal detector, the note in
    // the locker, the clock at noon, the siren down the hall, police lights in the windows,
    // glitter, homecoming in the gym; the final bell, the news vans at six, the stadium lit.
    id: 'school-shooter-sweetheart',
    accent: '#ff3d6e',
    title: 'School Shooter Sweetheart',
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
      { t: 98.05, kind: 'final', start: 'launch', kick: 12, endY: 8 },             // the stadium lights
      { t: 109.02, kind: 'outro', endY: 5 },
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
      finale: { kind: 'crown', t: 112.0, x: -22, fireAt: 98.05, orbit: { r: 58, h: 7, y: 12, facing: true, back: 1.3, right: 0.3, swing: 0.25 } },
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
      { t: 155.50, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10, turn: 0.3 },  // "halo"
      { t: 173.85, kind: 'outro', endY: 5 },                                                    // "you're free"
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
      finale: { kind: 'set', t: 180.6, x: -44, s: 1.5, rot: -1.57, orbit: { r: 150, h: 14, y: 26, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // a summer night in a hot apartment: the floor fan, the dishes, the mattress on the
    // carpet. Fireworks in the alley, sirens down the block, thunder like the sky forgot to
    // knock. In the end the walls fall through.
    id: 'your-apartment-smells-like-summer',
    accent: '#ff8a4f',
    title: 'Your Apartment Smells Like Summer',
    startY: 14,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                       // "I was young enough to love you"
      { t: 10.67, kind: 'verse', c: 0.85, endY: 9 },                             // the band
      { t: 20.81, kind: 'verse', c: 0.8, endY: 10, turn: 0.2 },                  // "your apartment smells like summer"
      { t: 41.12, kind: 'verse', endY: 12, turn: 0.2 },                          // "there's a mattress on the carpet"
      { t: 61.47, kind: 'pre', endY: 16, turn: 0.2 },                            // "and I know, I know, I know"
      { t: 64.01, kind: 'break', endY: 15, turn: 0.2 },                          // "we are not built to stay"
      { t: 67.83, kind: 'pre', endY: 20, turn: 0.2 },                            // "but your hand finds mine"
      { t: 71.66, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },   // out her window, into the chorus
      { t: 91.99, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },     // "then I found you"
      { t: 102.15, kind: 'verse', endY: 12 },                                    // "we eat cereal at midnight"
      { t: 111.07, kind: 'post', start: 'launch', launchBeats: 4, kick: 10, endY: 12 },   // "but what for?" and the fireworks
      { t: 125.10, kind: 'pre', endY: 22 },                                      // "but your voice hits me like a car is starting"
      { t: 132.76, kind: 'chorus', c: 1.35 },
      { t: 153.12, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // "then I found you"
      { t: 162.06, kind: 'bridge', endY: 18, turn: 0.25 },                       // "maybe we're not tragic"
      { t: 171.00, kind: 'pre', endY: 24, turn: 0.25 },                          // "maybe I should go now"
      { t: 179.96, kind: 'break', endY: 22, turn: 0.25 },
      { t: 182.56, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 8, turn: 0.3 },   // through her door, the last chorus
      { t: 211.94, kind: 'outro', endY: 6, turn: 0.3 },
    ],
    palette: 'summernight2',
    world: 'summer',
    looks: [
      { t: -99, palette: 'summernight2' },
      { t: 20.5, palette: 'apartment', fade: 0.3 },        // "your apartment smells like summer"
      { t: 71.5, palette: 'rooftops', fade: 0.6 },         // out the window
      { t: 102.0, palette: 'summernight2', fade: 5 },      // "we eat cereal at midnight"
      { t: 118.6, palette: 'storm', fade: 9 },             // "like the sky forgot to knock"
      { t: 161.8, palette: 'hallway', fade: 0.3 },         // "maybe all our magic is a busted hallway light"
      { t: 182.5, palette: 'apartment', fade: 0.4 },       // her door
      { t: 200.5, palette: 'afterstorm', fade: 2.5 },      // "love me while the walls fall through"
    ],
    moments: [
      { t: 20.52, kind: 'flash', k: 0.7 },
      { t: 112.4, kind: 'fireworks', n: 10, x: 34, y: 38, gap: 170, ahead: 4.2 },   // "there are fireworks in the alley"
      { t: 116.3, kind: 'thunder', k: 0.8 },                              // "you keep laughing at the thunder"
      { t: 119.2, kind: 'thunder', k: 1.0 },                              // "like the sky forgot to knock"
      { t: 134.0, kind: 'thunder', k: 0.7 },
      { t: 141.9, kind: 'thunder', k: 0.9 },
      { t: 149.3, kind: 'thunder', k: 0.8 },
      { t: 161.82, kind: 'flash', k: 0.55 },
      { t: 200.55, kind: 'flash', k: 0.3 },
    ],
    scenery: {
      signs: [
        { key: 'OPEN24', text: 'OPEN\n24 HRS', color: '#ff4f6a', core: '#ffe8ec', bg: '#140810', size: 92 },
        { key: 'MIDNIGHT', text: '12:00', color: '#5ff2ff', core: '#eaffff', bg: '#06101a', size: 150 },
      ],
      rooms: [
        // room to room through her place, a doorway on the downbeat
        { style: 'living', from: 20.55, to: 25.89, showFrom: 20.5, caps: [null, DOOR] },
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
      roomEvents: { war: 45.4, fight: 53.6, bust: 169.3 },
      zones: [
        { from: -4, to: 20.5, kits: ['tenements'], lines: 1.15, gaps: true },
        // her apartment: "the floor fan shakes the room", "a tower of dirty dishes", "a dead plant still in bloom"
        { from: 24.2, to: 24.3, kits: ['floorFan'], at: 24.2, x: -21, ahead: 3.65 },
        { from: 28.4, to: 28.5, kits: ['dishes'], at: 28.4, x: 22, ahead: 7.85 },
        { from: 30.2, to: 30.3, kits: ['plant'], at: 30.2, x: -19, s: 1.1, ahead: 9.65 },
        { from: 38.6, to: 38.7, kits: ['floorFan'], at: 38.6, x: 22, face: 2.6, ahead: 18.05 },
        // "a mattress on the carpet", "a photograph of someone you don't talk about at all"
        { from: 43.6, to: 43.7, kits: ['mattress'], at: 43.6, x: 21, ahead: 23.05 },
        { from: 48.4, to: 48.5, kits: ['photoBack'], at: 48.4, x: 37.3, y: 13, ahead: 27.85 },
        { from: 58.6, to: 58.7, kits: ['plant'], at: 58.6, x: 20, s: 0.9, rot: 2.2, ahead: 38.05 },
        { from: 66.4, to: 66.5, kits: ['floorFan'], at: 66.4, x: -20, face: 3.6, ahead: 45.85 },
        // out the window and down the block, the low roofs in the chorus
        { from: 71.7, to: 102.0, kits: ['tenements'], low: true, lines: 1.6, gaps: true },
        { from: 102.0, to: 161.8, kits: ['tenements'], lines: 1.3, gaps: true },
        // through her door again: the fan, the mattress, the plant, the dishes; then no walls
        { from: 186.4, to: 186.5, kits: ['floorFan'], at: 186.4, x: -21, ahead: 24.55 },
        { from: 191.0, to: 191.1, kits: ['mattress'], at: 191.0, x: 21, ahead: 29.15 },
        { from: 195.4, to: 195.5, kits: ['plant'], at: 195.4, x: -19, s: 1.1, ahead: 33.55 },
        { from: 198.8, to: 198.9, kits: ['dishes'], at: 198.8, x: 20, ahead: 36.95 },
        { from: 205.0, to: 205.1, kits: ['floorFan'], at: 205.0, x: 22, face: 2.8, ahead: 43.15 },
        { from: 210.4, to: 210.5, kits: ['mattress'], at: 210.4, x: -22, rot: -0.12, ahead: 48.55 },
        { from: 196.0, to: 236.0, kits: ['farcity'], x: 86 },
      ],
      lyricBg: '#160a14', lyricColor: '#ffb070', lyricCore: '#fff0e0', lyricX: 21,
      lyrics: [
        { t: 0.4, text: 'YOUNG ENOUGH\nTO LOVE YOU', lead: 2.4, side: 1 },
        { t: 5.0, text: 'BORED ENOUGH\nTO TRY', side: -1 },
        { t: 77.96, text: 'KISS ME LIKE\nTHE RENT IS DUE', side: 1 },
        { t: 80.42, text: 'EVERY GODDAMN\nSONG IS TRUE', side: -1 },
        { t: 90.72, text: 'I WAS\nALMOST FINE', side: 1 },
        { t: 102.46, text: 'CEREAL\nAT MIDNIGHT', side: -1 },
        { t: 119.96, text: 'LIKE THE SKY\nFORGOT TO KNOCK', side: 1 },
        { t: 155.08, text: 'THEN I\nFOUND YOU', side: -1 },
      ],
      finale: { kind: 'lamp', t: 218.4, x: -17, fireAt: 200.6, orbit: { r: 36, h: 5, y: 14, facing: true, back: 1.6, right: 0.3, swing: 0.3 } },
      vehicles: [
      // "there are sirens down the block": two of them, coming the other way
      { kind: 'police', lead: [[114.2, 4.2], [117.4, -2.2]], x: -1, lane: 2.4, reverse: true, from: 114.1, to: 118.0 },
      { kind: 'police', lead: [[114.9, 4.8], [118.3, -2.2]], x: -1, lane: 3.4, reverse: true, from: 114.8, to: 118.9 },
      // "your voice hits me like a car is starting"
      { kind: 'sedan', paint: 0x2a3a5a, at: 128.7, rate: 0, x: 1, lane: 2.4, reverse: true, yaw: 0.12, lightsOn: 127.8, from: 122.0, to: 129.5 },
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
      { t: 144.03, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // "they say never"
      { t: 154.22, kind: 'final', c: 1.3, endY: 11 },                                           // "you let the sentence close"
      { t: 160.99, kind: 'break', endY: 18 },                                                   // "when you made it enough"
      { t: 162.73, kind: 'pre', endY: 22 },
      { t: 164.43, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },        // "the couch is empty"
      { t: 171.26, kind: 'final', c: 1.4, endY: 11 },                                           // "the door's just a door now"
      { t: 177.85, kind: 'final', c: 1.3, endY: 11 },                                           // "thank you"
      { t: 184.72, kind: 'outro', endY: 5 },
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
      finale: { kind: 'justdoor', t: 191.5, x: -40, s: 1.8, rot: -1.57, orbit: { r: 110, h: 12, y: 16, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
    },
  },
  {
    // the night going wrong. The queue outside, the club, the drink on the bar; the room losing
    // focus, the back corridors, lost time; then the house lights, and the morning outside.
    id: 'spiked',
    accent: '#8a6aff',
    title: 'Spiked',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8 },                                          // "yeah, take it / lose it all"
      { t: 9.47, kind: 'pre', endY: 14 },                                          // up to the door
      { t: 14.86, kind: 'verse', start: 'launch', kick: 8, endY: 12 },             // in: "spot you across the room"
      { t: 29.20, kind: 'break', endY: 20 },                                       // the band drops out
      { t: 30.99, kind: 'pre', start: 'launch', kick: 6, endY: 24 },               // "lips say stop"
      { t: 38.14, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },
      { t: 52.43, kind: 'post', endY: 16 },                                        // "lose control"
      { t: 66.72, kind: 'verse', start: 'launch', kick: 8, endY: 8 },              // the back corridors
      { t: 95.17, kind: 'chorus', start: 'launch', kick: 10, endY: 12 },
      { t: 109.37, kind: 'final', c: 1.2, endY: 26 },                              // "lose it all for me"
      { t: 118.23, kind: 'break', endY: 26 },                                      // nothing
      { t: 120.00, kind: 'post', start: 'launch', kick: 5, endY: 18 },
      { t: 127.07, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the house lights come up
      { t: 134.13, kind: 'outro', endY: 4 },                                       // the morning
    ],
    palette: 'spkStreet',
    world: 'club',
    titleView: { ahead: -0.15, x: 1.2, h: 2.2, back: -0.55, lookH: 1.0 },   // behind her, the queue, the club up the street
    looks: [
      { t: -99, palette: 'spkStreet' },
      { t: 14.9, palette: 'spkClub', fade: 0.3 },        // in through the door
      { t: 27.4, palette: 'spkBlur', fade: 1.6 },        // "now your world's blurry"
      { t: 38.2, palette: 'spkChorus', fade: 0.6 },
      { t: 52.5, palette: 'spkRed', fade: 2.5 },         // "lose control"
      { t: 66.8, palette: 'spkHall', fade: 0.6 },        // the back corridors
      { t: 81.0, palette: 'spkWash', fade: 0.4 },
      { t: 88.1, palette: 'spkHall', fade: 0.4 },
      { t: 95.2, palette: 'spkWrong', fade: 0.6 },
      { t: 109.4, palette: 'spkVoid', fade: 2.0 },       // "lose it all for me"
      { t: 120.0, palette: 'spkDark', fade: 0.3 },
      { t: 127.1, palette: 'spkHouse', fade: 0.15 },     // the house lights
      { t: 134.2, palette: 'spkMorning', fade: 1.2 },    // outside, the morning
    ],
    moments: [
      { t: 29.2, kind: 'blackout', dur: 1.75, k: 0.8 },  // the band drops out
      { t: 118.23, kind: 'blackout', dur: 1.8, k: 0.97 }, // lost time
      { t: 127.07, kind: 'flash', k: 0.7 },              // the house lights
    ],
    scenery: {
      signs: [
        { key: 'SPKMARQ', text: 'LOSE IT ALL', color: '#ffd8a0', core: '#fffaf0', bg: '#0a0610', size: 96 },
        { key: 'EXITL', text: '\u25C0 EXIT', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
        { key: 'EXITR', text: 'EXIT \u25B6', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
      ],
      rooms: [
        { style: 'club', from: 14.86, to: 52.43, caps: [{ kind: 'front', hw: 13, hh: 28 }, { kind: 'wall', hw: 14, hh: 28 }] },   // "spot you across the room"
        { style: 'redroom', from: 52.43, to: 66.72, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                              // "lose control"
        { style: 'hall', from: 66.72, to: 80.95, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                                 // the back corridors
        { style: 'wash', from: 80.95, to: 88.07, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },
        { style: 'hall', from: 88.07, to: 95.17, caps: [null, { kind: 'wall', hw: 12, hh: 22 }] },
        { style: 'club', from: 95.17, to: 134.13, caps: [null, { kind: 'wall', hw: 11, hh: 24 }] },                               // the main room again, wrong; then the lights
      ],
      roomEvents: { lasers: [[38.1, 52.4], [95.2, 109.4]], void: [109.4, 118.3, 1.6, 0.2], red: [120.0, 127.07, 0.25, 0.05], house: [127.07, 999, 0.05, 0.4] },
      zones: [
        // the street, the queue roped off up to the door, the marquee, the neon glass
        { from: -4, to: 14.8, kits: ['clubstreet'] },
        { from: -2, to: 14.7, kits: ['ropes'], x: 10.5, every: 0.16, s: 2.4 },
        { from: 14.75, to: 14.76, kits: ['marquee'], at: 14.75, sign: 'SPKMARQ', y: 36 },
        { from: 14.8, to: 14.81, kits: ['neonGlass'], at: 14.8, x: -34, y: 18, s: 1.6 },
        // the main room: the speakers, the mirror ball, the bar and the drink on it
        { from: 14.9, to: 52.4, kits: ['speakers'], x: 50, every: 1.6 },
        { from: 19.9, to: 20.0, kits: ['mirrorBall'], at: [19.9], lift: 16 },
        { from: 22.6, to: 25.3, kits: ['clubBar'], at: 22.6, x: 44 },
        { from: 23.9, to: 24.0, kits: ['clubBar'], at: 23.9, x: 44 },
        { from: 25.2, to: 25.3, kits: ['clubBar'], at: 25.2, x: 44 },
        { from: 25.4, to: 25.5, kits: ['drink'], at: 25.4, x: 42, y: 12.85, s: 1.3 },
        { from: 36.0, to: 52.4, kits: ['lasers'], every: 1.1, x: 30, y: 38 },
        { from: 44.6, to: 44.7, kits: ['mirrorBall'], at: [44.6], lift: 16 },
        // the red room
        { from: 52.5, to: 66.6, kits: ['booths'], x: 30, every: 1.4 },
        // the corridors: an exit sign every way you look
        { from: 66.8, to: 95.1, kits: ['exits'], at: [[69.4, -11, 16, 'EXITR'], [72.8, 11, 16, 'EXITL'], [76.2, -11, 16, 'EXITL'], [79.6, 11, 16, 'EXITR'], [89.4, -11, 16, 'EXITR'], [92.2, 11, 16, 'EXITL']] },
        { from: 81.0, to: 88.0, kits: ['sinks'], at: [[82.7, 24], [84.3, -24], [85.9, 24], [87.2, -24]] },
        // the main room, wrong
        { from: 95.2, to: 109.3, kits: ['speakers'], x: 50, every: 1.6 },
        { from: 95.0, to: 109.4, kits: ['lasers'], every: 1.1, x: 30, y: 38, cols: [0x3aff8a, 0xd040ff] },
        { from: 99.0, to: 99.1, kits: ['mirrorBall'], at: [99.0], lift: 16 },
        // the house lights: what's left
        { from: 127.0, to: 134.0, kits: ['mess'], every: 0.35 },
        { from: 127.0, to: 134.0, kits: ['speakers'], x: 50, every: 1.6 },
        // outside: the morning
        { from: 134.2, to: 150, kits: ['clubstreet'], dim: 0.15, wake0: 0.05 },
      ],
      roads: [
        { x: 0, width: 16, walk: 4, laneLines: 1, from: -10, to: 14.9, lanes: [-4, 4], density: 0.3, lampEvery: 34, follow: true },
        { x: 0, width: 16, walk: 4, laneLines: 1, from: 134.1, to: 160, lanes: [-4, 4], density: 0.06, lampEvery: 34, follow: true, dry: true },
      ],
      lyricBg: '#0a0612', lyricColor: '#ff5fd8', lyricCore: '#ffe0f6', lyricPart: 'neonSign', lyricFloor: true,
      lyrics: [
        { t: 26.2, text: "NOW YOUR\nWORLD'S BLURRY", side: -1, x: 32, h: 20 },
        { t: 92.0, text: 'IN THE\nMORNING', side: 1, x: 14, h: 14, s: 0.8 },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'busstop', t: 138.0, x: 17, fireAt: 134.2, orbit: { r: 30, h: 3.5, y: 5, facing: true, back: 1.4, right: 0.3, swing: 0.25 } },
    },
  },
  {
    // August 1st, drenched in heat, up the hill he used to love. Arrows on the trees, a
    // church that isn't one, a rock that gets the leg, the top at last, and the sidewalk home.
    id: 'you-are-here',
    accent: '#ffb347',
    title: 'You Are Here',
    startY: 4.8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 4.4 },                                     // "you are here"
      { t: 15.86, kind: 'verse', endY: 9 },                                     // the trail
      { t: 36.20, kind: 'pre', endY: 20 },                                      // "this time I have no excuses"
      { t: 52.75, kind: 'pre', endY: 28, c: 0.95 },                             // "I've spent so long waiting"
      { t: 69.16, kind: 'chorus', endY: 22 },                                   // "I tried to hide instead of the goodbye"
      { t: 85.39, kind: 'break', rb: 4, endY: 28 },                             // "that building is a church"
      { t: 98.09, kind: 'verse', endY: 30 },                                    // "the first time I met him"
      { t: 114.42, kind: 'pre', start: 'launch', launchBeats: 4, kick: 9, endY: 38 },     // the stop: "a full-time job"
      { t: 132.45, kind: 'chorus', endY: 32 },
      { t: 146.86, kind: 'post', endY: 36 },                                    // "he would come here alone"
      { t: 159.43, kind: 'break', rb: 4, endY: 38 },
      { t: 164.80, kind: 'bridge', endY: 44 },                                  // "walking to the trails makes me think of him"
      { t: 177.37, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, c: 1.2, endY: 36 },   // "I will think less, I will feel more"
      { t: 209.67, kind: 'break', rb: 4, endY: 32 },                            // "it's while I was literally saying I knew the way"
      { t: 211.49, kind: 'break', start: 'launch', launchBeats: 4, kick: 5, rb: 4, endY: 30 },     // "that my leg hit the rock"
      { t: 218.73, kind: 'verse', c: 0.95, endY: 40 },                          // "well, I know the way back now"
      { t: 242.36, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 40 },   // "I swear it's not just a lack of blood"
      { t: 247.73, kind: 'chorus', endY: 36 },
      { t: 260.27, kind: 'break', rb: 4, endY: 44 },                            // "I hope it's still out of the woods"
      { t: 273.03, kind: 'pre', endY: 54, c: 0.8 },                             // "isn't it funny that I'd reach the top"
      { t: 278.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 14 },  // the top: "he used to love this place"
      { t: 291.20, kind: 'bridge', endY: 8 },                                   // "if I could ever get a message back"
      { t: 304.01, kind: 'outro', endY: 4 },                                    // "I'm on the sidewalk, getting close to home"
    ],
    palette: 'august',
    world: 'trail',
    skyline: 'hills',
    groundStyle: 'country',
    camLift: 0.35,
    ribbonWidth: 0.72,
    looks: [
      { t: -99, palette: 'august' },
      { t: 29.6, palette: 'thunder', fade: 1.6 },           // "it was raining, and there was thunder"
      { t: 37.5, palette: 'august', fade: 3 },
      { t: 132.4, palette: 'golden', fade: 18 },
      { t: 160, palette: 'ridge', fade: 4 },                // out of the trees
      { t: 179.2, palette: 'golden', fade: 3 },
      { t: 222, palette: 'sunset', fade: 14 },
      { t: 262, palette: 'sunsetopen', fade: 5 },
      { t: 278.5, palette: 'summit', fade: 3 },             // the top
      { t: 293, palette: 'bluehour', fade: 10 },
      { t: 306, palette: 'evening', fade: 5 },              // the sidewalk
    ],
    moments: [
      { t: 31.7, kind: 'thunder', k: 0.8 },
      { t: 33.4, kind: 'thunder', k: 1 },
      { t: 214.46, kind: 'thud', k: 1 },                    // "that my leg hit the rock"
    ],
    scenery: {
      flat: [[-12, 13, 0], [299, 340, 0]],
      lyricPart: 'trailsign', lyricX: 8.2, lyricS: 1.35,
      signs: [
        { key: 'PRIVATE', text: 'PRIVATE\nPROPERTY', color: '#fff4e6', core: '#ffffff', bg: '#7a1c18', size: 70 },
      ],
      zones: [
        { from: -4, to: 15.9, kits: ['trailhead'] },
        { from: 12, to: 85.4, kits: ['woods'] },
        { from: 85.4, to: 98, kits: ['woods'], arrows: false, density: 0.75 },
        { from: 85.4, to: 97.6, kits: ['church'], at: 91.0, x: -27, clear: 30 },
        { from: 98, to: 132.4, kits: ['woods'] },
        { from: 132.4, to: 160, kits: ['woods'], density: 0.55, firs: 0.5 },
        { from: 155.6, to: 155.7, kits: ['bench'], at: 155.6, x: 8.6, clear: 9 },  // "he would rest where it was peaceful"
        { from: 160, to: 179, kits: ['ridge'], density: 0.8 },
        { from: 179, to: 209.6, kits: ['woods'], density: 0.9 },
        { from: 209.6, to: 222, kits: ['woods'], density: 0.6, arrows: false },
        { from: 214.3, to: 214.4, kits: ['therock'], at: 214.3, x: 4.4, clear: 10 },
        { from: 222, to: 262, kits: ['woods'], density: 0.85, firs: 0.55 },
        { from: 262, to: 281, kits: ['ridge'], density: 0.35, rocky: true },
        { from: 278.3, to: 278.4, kits: ['summit'], at: 278.3 },
        { from: 281, to: 300, kits: ['ridge'], density: 0.9 },
        { from: 299, to: 330, kits: ['suburb'], lampX: 8.5 },
      ],
      roads: [
        { x: 0, width: 10, walk: 3, laneLines: 0, from: 299, to: 340, traffic: false, lampEvery: 18, dry: true },
      ],
      lyrics: [
        { t: -1.6, text: 'YOU ARE HERE', side: -1, lead: 0, x: 9.6, s: 1.7 },
        { t: 47.2, text: 'IF I MAKE IT TO\nTHE TOP TODAY', side: -1 },
        { t: 80.0, text: 'THE WRONG WAY IS\nOUT OF THE WOODS', side: 1 },
        { t: 193.4, text: 'I WILL THINK LESS\nI WILL FEEL MORE', side: -1 },
        { t: 219.4, text: 'I KNOW THE\nWAY BACK NOW', side: 1 },
        { t: 280.3, text: 'HE USED TO\nLOVE THIS PLACE', side: -1, lead: 1.0 },
        { t: 283.9, text: 'NO, HE LOVES\nTHIS PLACE', side: 1, lead: 1.0 },
        { t: 305.7, text: 'GETTING CLOSE\nTO HOME', side: -1 },
      ],
      finale: { kind: 'home', t: 316.6, x: -20, fireAt: 304.0, orbit: { r: 22, h: 3.5, y: 3.2, facing: true, back: 1.4, right: 0.3 } },
    },
  },
  {
    // nothing from the words: a place for the sound. A steelworks at night, from the drone out of
    // silence to the long full-volume climax: the doors glowing open on the first swell, cranes over
    // the road, the ladle lifted and the pour on the drop, steam in the breaks, the hammer on the next
    // drop, slabs racing down the rolling mill, the cooling yard in the quiet, the converter blowing,
    // and on the climax the blast furnace cast, iron in rivers both sides. Then morning.
    id: 'until-she-stopped-fighting',
    accent: '#ff7a2a',
    title: 'Until She Stopped Fighting',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                                      // out of silence: the yard at night
      { t: 10.11, kind: 'verse', c: 0.85, endY: 12 },                                           // the doors come on
      { t: 26.60, kind: 'verse', c: 0.9, endY: 12 },
      { t: 37.58, kind: 'break', endY: 14 },                                                    // a breath
      { t: 39.41, kind: 'verse', c: 0.95, endY: 12 },
      { t: 46.72, kind: 'pre', endY: 22 },                                                      // the ladle goes up
      { t: 48.54, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the pour
      { t: 59.49, kind: 'chorus', c: 1.15, endY: 11 },
      { t: 70.40, kind: 'break', endY: 16 },                                                    // steam
      { t: 72.22, kind: 'pre', endY: 22 },
      { t: 74.04, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the hammer
      { t: 79.46, kind: 'break', endY: 14 },
      { t: 81.30, kind: 'chorus', c: 1.1, endY: 11 },                                           // the rolling mill
      { t: 95.80, kind: 'chorus', c: 1.15, endY: 11 },
      { t: 110.25, kind: 'bridge', endY: 13 },                                                  // the cooling yard
      { t: 124.56, kind: 'pre', endY: 22 },
      { t: 128.14, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, endY: 10 },        // the converter blows
      { t: 138.90, kind: 'final', c: 1.2, endY: 11 },
      { t: 149.67, kind: 'break', endY: 18 },                                                   // quiet
      { t: 151.47, kind: 'pre', endY: 22 },
      { t: 153.26, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },        // the cast: iron in rivers
      { t: 164.01, kind: 'final', c: 1.35, endY: 11 },
      { t: 176.51, kind: 'outro', endY: 5 },                                                    // the glow going, morning
    ],
    palette: 'swNight',
    world: 'foundry',
    collect: 'ember',
    looks: [
      { t: -99, palette: 'swNight' },
      { t: 12.0, palette: 'swNight', set: { skyGlow: 0x8a3a1a, fog: 0x1a0e0a, horizon: 0x2a1410 }, fade: 2.0 },   // the doors open
      { t: 48.54, palette: 'swPour', fade: 0.3 },
      { t: 70.40, palette: 'swSteam', fade: 0.4 },
      { t: 74.04, palette: 'swPour', fade: 0.3 },
      { t: 81.30, palette: 'swMill', fade: 0.6 },
      { t: 110.25, palette: 'swCool', fade: 1.5 },     // the cooling yard
      { t: 128.14, palette: 'swBlow', fade: 0.3 },
      { t: 149.67, palette: 'swSteam', fade: 0.4 },
      { t: 153.26, palette: 'swCast', fade: 0.3 },     // the cast
      { t: 180.0, palette: 'swDawn', fade: 4.0 },      // morning
    ],
    moments: [
      { t: 48.54, kind: 'flash', k: 0.3 },
      ...[74.04, 74.94, 75.86, 76.76, 77.67, 78.57].map((t, i) => ({ t, kind: 'knock', n: 1, k: i % 2 ? 0.6 : 0.85 })),   // the hammer
      { t: 128.14, kind: 'flash', k: 0.4 },
      { t: 149.67, kind: 'blackout', dur: 3.4, k: 0.55 },   // two bars of quiet
      { t: 153.26, kind: 'flash', k: 0.5 },
    ],
    scenery: {
      zones: [
        { from: -6, to: 110.2, kits: ['swYard'], x: 46, on: 10.11 },                                  // the yard, the doors coming on with the first swell
        { from: 110.2, to: 126.3, kits: ['swYard'], x: 50, pipes: false, on: 1e9 },                               // the cooling yard: the doors dark
        { from: 126.3, to: 172.5, kits: ['swYard'], x: 46, on: 126.34, dim: 176.5 },
        { from: 15.6, to: 46.7, kits: ['swCranes'], every: 3.6 },
        { from: 81.3, to: 110.2, kits: ['swCranes'], every: 4.4 },
        { from: 15.6, to: 37.5, kits: ['swSparks'], every: 1.83, on: 15.61 },                        // grinders on the bars
        { from: 39.4, to: 46.7, kits: ['swSparks'], every: 0.9, on: 39.41 },
        { from: 48.5, to: 70.4, kits: ['swSparks'], every: 0.9, k: 1.3 },
        { from: 81.3, to: 110.2, kits: ['swMill'], every: 0.9, x: 34 },                              // the rolling mill
        { from: 110.3, to: 126.3, kits: ['swIngots'], every: 0.8, x: 30, cool: 110.3, heat: 0.12 },              // the cooling yard
        { from: 128.1, to: 149.6, kits: ['swSparks'], every: 0.7, k: 1.3 },
        { from: 153.2, to: 178, kits: ['swRunners'], every: 0.75, x: 34, on: 153.26, off: 176.5 },   // the cast
        { from: 153.2, to: 176.5, kits: ['swSparks'], every: 0.5, k: 1.6, x: 32, y: 18 },
        { from: 0, to: 0.1, kits: ['swProps'], at: [
          { t: 50.4, x: -30, kind: 'pour', s: 1.2, lift: 46.72, go: 48.54, stop: 69.0 },            // the ladle up on the pre, the pour on the drop
          { t: 59.6, x: 30, kind: 'pour', s: 1.2, lift: 55.84, go: 57.66, stop: 69.0 },
          { t: 76.0, x: 30, kind: 'hammer', s: 1.2, hits: [74.04, 74.94, 75.86, 76.76, 77.67, 78.57] },   // the hammer on the drop
          { t: 92.0, x: -34, kind: 'coil', s: 1.3 },
          { t: 104.0, x: 34, kind: 'coil', s: 1.3 },
          { t: 130.6, x: 36, kind: 'converter', s: 1.4, blow: 128.14, end: 149.6 },                 // the blow
          { t: 140.5, x: -36, kind: 'slag', s: 1.4, go: 138.9 },
        ] },
      ],
      finale: { kind: 'furnace', t: 184.8, x: -70, s: 1.4, rot: -1.57, orbit: { r: 220, h: 20, y: 50, facing: true, back: 0.6, right: 0.3, swing: 0.12 } },
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
      { t: 166.78, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10 },  // out into the dawn
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
    confetti: [[199.6, 236]],                              // petals in the white chapel
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
      finale: { kind: 'wedding', t: 215.6, x: -30, fireAt: 199.5, orbit: { r: 66, h: 6, y: 13, facing: true, back: 1.2, right: 0.3, swing: 0.2 } },
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
      { t: 81.89, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10 },         // "no more patterns"
      { t: 98.43, kind: 'outro', endY: 7 },                                                     // "pain creates new language"
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
      finale: { kind: 'book', t: 117.0, x: 0, write: 100.0, fireAt: 104.0, orbit: { r: 80, h: 16, y: 24, facing: true, back: 2, right: 0.3, swing: 0.15 } },
    },
  },
  {
    // she moved into his head back in May: the house he built in there to keep her out,
    // and her portrait hung where his peace of mind used to. Knock, knock. She's never,
    // never, never moving out. Sweet dreams, landlord.
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
      { t: 91.60, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 11, turn: 0.3 },    // "check under the stairs"
      { t: 95.58, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                             // "your new girl says you wake up screaming"
      { t: 104.87, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.3 },   // "if you're subconscious, darling"
      { t: 118.12, kind: 'break', rb: 8, endY: 14, turn: 0.3 },                             // "I picked the lock before you even drew the blueprint"
      { t: 130.06, kind: 'chorus', endY: 9, turn: 0.3 },                                    // "I made myself eternal"
      { t: 153.93, kind: 'post', endY: 12, turn: 0.3 },                                     // "every flashback"
      { t: 161.89, kind: 'chorus', endY: 10, turn: 0.3 },
      { t: 176.48, kind: 'verse', c: 0.9, endY: 14, turn: 0.3 },                            // "it's crowded in here with all my things"
      { t: 187.09, kind: 'post', endY: 12, turn: 0.3 },                                     // "never truly alone"
      { t: 196.36, kind: 'bridge', endY: 20, turn: 0.3 },                                   // "I'm the hesitation in your breath"
      { t: 217.58, kind: 'final', start: 'launch', launchBeats: 4, kick: 11, turn: 0.3 },  // "I am home"
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
      { t: 109.6, palette: 'attic', fade: 0.3 },             // "attic of your grief"
      { t: 112.2, palette: 'blueprint', fade: 0.3 },         // "you built a house inside your head to kick me out"
      { t: 120.0, palette: 'mansion', fade: 0.6 },
      { t: 141.2, palette: 'moldy', fade: 8 },               // "the mold behind the walls of memory"
      { t: 168.7, palette: 'mansion', fade: 2 },
      { t: 196.4, palette: 'dim', fade: 3 },                 // "I'm the hesitation in your breath"
      { t: 217.5, palette: 'mansion', fade: 0.4 },
      { t: 250.7, palette: 'dim', fade: 1.5 },               // "you still leave the light on"
      { t: 264.0, palette: 'mansion', fade: 3 },
    ],
    moments: [
      { t: 87.3, kind: 'knock', k: 0.55 },                   // "knock, knock, who's there?"
      { t: 90.1, kind: 'knock', k: 0.6 },
      { t: 92.86, kind: 'knock', k: 0.65 },
    ],
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
        { style: 'gallery', from: 86.30, to: 88.95, caps: [null, HDOOR] },                               // "knock, knock"
        { style: 'gallery', from: 88.95, to: 91.60, caps: [null, HDOOR] },
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
        { style: 'bedroom', from: 292.28, to: 330 },                                                     // "sweet dreams, landlord"
      ],
      roomEvents: { mold: 148.6, prints: 156.6 },
      zones: [
        // the gallery: her, all down both walls; then the three plaques
        { from: 10.7, to: 21.6, kits: ['portraits'], W: 40, every: 1.33, offset: 0.95 },
        { from: 23.0, to: 23.1, kits: ['portraits'], hang: true, at: [23.5, 26.15, 28.8], plaques: ['PEACE', 'ESTEEM', 'JESUS'], s: 0.95 },
        // every room hers
        { from: 30.6, to: 30.7, kits: ['portraits'], W: 50, at: [32.2, 34.9, 37.5, 40.1], sides: [1, -1, 1, -1], plaques: ['MINE', 'MINE', 'MINE', 'MINE'], v: 1 },
        { from: 41.4, to: 60.0, kits: ['ghosts'], every: 1.25, x: 16, spread: 16 },
        { from: 41.2, to: 61.1, kits: ['portraits'], W: 40, every: 2.65, offset: 1.4 },
        { from: 60.3, to: 60.4, kits: ['wine'], at: 60.3, x: 21 },                       // "so pour yourself a drink / oh wait, I finished it"
        { from: 62.0, to: 85.5, kits: ['ghosts'], every: 0.95, x: 22, spread: 36 },       // "every nightmare's got my furniture"
        { from: 61.1, to: 86.3, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        { from: 86.3, to: 95.6, kits: ['portraits'], W: 40, at: [87.6, 90.3], sides: [1, -1], v: 2 },
        { from: 92.6, to: 92.7, kits: ['stairs'], at: 92.6 },                             // "check under the stairs"
        { from: 100.9, to: 101.0, kits: ['nightstand'], at: 100.9, x: 30, clock: 'THREEAM', s: 2.0 },   // "stopping by at 3 a.m."
        { from: 102.6, to: 102.7, kits: ['bed'], at: 102.6, x: -30 },                     // "to rearrange the sheets"
        { from: 102.6, to: 102.7, kits: ['portraits'], W: 50, at: [102.6], sides: [-1], v: 3, s: 1.05, y: 10.5 },
        { from: 120.0, to: 141.2, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        { from: 134.9, to: 135.0, kits: ['journal'], at: 134.9, x: -23, rot: 1.9, s: 1.1 },         // "in a wreath and drip in your journal"
        { from: 141.2, to: 168.7, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        { from: 168.7, to: 176.5, kits: ['portraits'], W: 46, at: [170.2, 172.9, 175.4], sides: [1, -1, 1], v: 0 },
        // crowded: her things in boxes, her furniture, her in every corner
        { from: 176.6, to: 196.2, kits: ['crates'], every: 0.75, x: 17, spread: 22 },
        { from: 177.0, to: 196.2, kits: ['ghosts'], every: 1.4, x: 20, spread: 20 },
        { from: 176.5, to: 196.3, kits: ['portraits'], W: 46, every: 1.33, offset: 0.5 },
        { from: 196.4, to: 217.5, kits: ['portraits'], W: 40, every: 1.33, offset: 0.7 },
        { from: 217.6, to: 250.7, kits: ['ghosts'], every: 1.1, x: 24, spread: 36 },
        { from: 217.6, to: 250.7, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        { from: 237.2, to: 237.3, kits: ['portraits'], hang: true, at: [237.4], v: 1, s: 1.5, lift: 5 },   // "I'm already in the room"
        { from: 258.8, to: 258.9, kits: ['sideLamp'], at: 258.8, x: -17, s: 1.4 },       // "you still leave the light on"
        { from: 264.0, to: 292.2, kits: ['portraits'], W: 46, every: 2.65, offset: 1.2 },
        { from: 276.95, to: 277.0, kits: ['locks'], at: 276.95, x: 13.4 },               // "you never changed the locks"
        { from: 300.5, to: 300.6, kits: ['nightstand'], at: 300.5, x: 34 },
        { from: 306.0, to: 306.1, kits: ['bed'], at: 306.0, x: -30 },                     // "sweet dreams, landlord"
        { from: 306.0, to: 306.1, kits: ['portraits'], W: 50, at: [306.0], sides: [-1], v: 0, s: 1.05, y: 10.5, plaques: ['HOME'] },   // "this is home"
      ],
      finale: { kind: 'portrait', t: 306.0, x: -44, fireAt: 292.3, orbit: { r: 54, h: 2, y: 27, facing: true, back: 1.2, right: 0.3, swing: 0.2 } },
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
      { t: 174.53, kind: 'final', start: 'launch', launchBeats: 3, kick: 12, endY: 10 },          // "one": fireworks
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
      finale: { kind: 'boat', t: 267.6, x: -86, s: 1.6, dockX: -18, leave: 250.9, leaveFor: 30, fireAt: 250.0, orbit: { r: 140, h: 24, y: 12, facing: true, back: 2, right: 0.3, swing: 0.12 } },
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
      { t: 142.67, kind: 'final', start: 'launch', kick: 11, endY: 10, turn: 0.3 },          // "sexy emotional damage"
      { t: 159.99, kind: 'post', endY: 12, turn: 0.3 },
      { t: 169.33, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },         // "sexy trauma costume"
      { t: 182.66, kind: 'bridge', endY: 14, turn: 0.3 },                                    // "I'll ring you up at 29.99"
      { t: 203.99, kind: 'final', start: 'launch', kick: 10, endY: 8, turn: 0.3 },
      { t: 211.99, kind: 'outro', endY: 5, turn: 0.3 },
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
      finale: { kind: 'till', t: 215.8, x: -24, fireAt: 203.99, orbit: { r: 72, h: -2, y: 26, facing: true, back: 1.0, right: 0.3, swing: 0.2 } },
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
    startY: 15,
    heart: true,
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 15.96, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7 },   // the band stops: "first one on the dance floor"
      { t: 39.0, kind: 'pre', endY: 30 },                                       // "somebody on my ticket never saw the show"
      { t: 49.02, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, lift: 0.006 },   // a bar with no bass, land on "heart"
      { t: 77.0, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 9 },          // "keep the beat... alive": over the stop
      { t: 81.02, kind: 'verse', c: 0.85 },                                     // "the phone went off past midnight"
      { t: 88.03, kind: 'break', start: 'launch', launchBeats: 2, kick: 3 },    // "son, sit down": the floor goes
      { t: 91.0, kind: 'verse', c: 0.9 },                                       // "strange little word, a match"
      { t: 113.0, kind: 'pre', endY: 30 },
      { t: 124.99, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, lift: 0.006 },
      { t: 148.93, kind: 'break', start: 'launch', launchBeats: 4, kick: 9, endY: 12 },       // last "keep the beat alive"
      { t: 152.92, kind: 'post', c: 1.2 },                                      // the band on its own
      { t: 172.83, kind: 'bridge', endY: 24 },                                  // "every March his mother takes the bus"
      { t: 188.32, kind: 'pulse', start: 'launch', launchBeats: 4, kick: 6 },  // "and the kick drum talks"
      { t: 210.85, kind: 'pre', endY: 36, c: 0.8 },                             // "there you are"
      { t: 222.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12 },  // the last chorus comes in
      { t: 253.0, kind: 'break', start: 'launch', launchBeats: 4, kick: 10, endY: 14 },       // "keep the beat... alive"
      { t: 257.0, kind: 'final', c: 1.3 },
      { t: 283.03, kind: 'outro' },
    ],
    palette: 'party',
    looks: [
      { t: -99, palette: 'party' },
      { t: 80.0, palette: 'late', fade: 2.5 },          // nine years ago, past midnight
      { t: 113.0, palette: 'party', fade: 5 },
      { t: 188.32, palette: 'vigil', fade: 14 },        // the city goes quiet around her
      { t: 222.51, palette: 'encore', fade: 11 },
    ],
    monitor: { from: 190.33, to: 222.51 },
    confetti: [[49.02, 77.0], [124.99, 148.93], [152.92, 172.83], [222.51, 292]],
    scenery: {
      zones: [
        { from: -4, to: 49, kits: ['lowrise', 'partystreet'] },
        { from: 49, to: 80, kits: ['lowrise', 'partystreet'], tall: 0.5 },
        { from: 80, to: 113, kits: ['lowrise'], wake0: 0.12, signs: false },
        { from: 100.6, to: 100.7, kits: ['hospital'], x: -34 },
        { from: 113, to: 173, kits: ['lowrise', 'partystreet'], tall: 0.5 },
        { from: 173, to: 222.5, kits: ['suburb'], lampX: 17 },
        { from: 222.5, to: 283.6, kits: ['lowrise', 'partystreet'], tall: 0.35, clear: 7 },
        { from: 242, to: 284.2, kits: ['ribs'] },
      ],
      roads: [
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: -10, to: 80, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24 },
        { x: 0, width: 24, walk: 4, laneLines: 2, from: 80, to: 113, lanes: [-9, -3, 3, 9], density: 0.1, lampEvery: 30 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 113, to: 173, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24 },
        { x: 0, width: 26, walk: 4, laneLines: 2, from: 173, to: 222.5, traffic: false, lampEvery: 30 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 222.5, to: 296, traffic: false, lampEvery: 24 },
      ],
      vehicles: [
        { kind: 'ambulance', at: 95.6, rate: 1.22, x: -1, from: 91, to: 104 },   // "my miracle came screaming up the street"
        { kind: 'bus', at: 175.6, rate: 0.8, x: 1, from: 166, to: 186 },        // "takes the bus from two towns over"
      ],
      lyrics: [
        { t: 23.84, text: 'GOT A ZIPPER\nDOWN MY MIDDLE', side: -1 },
        { t: 50.5, text: "I'M THE HEART\nOF THE PARTY", side: 1, lead: 1.1 },
        { t: 52.7, text: "AND THE HEART\nAIN'T MINE", side: -1, lead: 1.1 },
        { t: 58.56, text: 'SHAKE IT LIKE\nI STOLE IT', side: 1 },
        { t: 88.72, text: 'TONIGHT WE\nFOUND YOUR MATCH', side: 1 },
        { t: 101.76, text: 'NINETEEN\nFOREVER', side: -1 },
        { t: 212.3, text: 'THERE YOU ARE', side: 1 },
        { t: 247.86, text: "THE PARTY'S\nALL FOR HIM", side: -1 },
        { t: 261.54, text: "I'M STILL HERE", side: 1 },
      ],
      finale: { kind: 'heart', t: 287.5, x: 0, fireAt: 257.0, orbit: { r: 230, h: 12, y: 58 } },
    },
  },
];

export const PALETTES = {
  // Your Wife, My Number: a heat wave in the glare, clouds and thunder, an evening at the curb, the
  // storm, the marble bathroom, and the gold after the rain.
  ymHeat: {
    zenith: 0x4a7ad0, horizon: 0xfff0d0, skyGlow: 0xfff4c0, glowDir: [0.3, 0.6, 0.75], skyline: 0x8a8a7a, moonDir: [0.3, 0.6, 0.75], moon: 0xfff8e8,
    fog: 0xf0e0c0, fogDensity: 0.0012, stars: 0, sunSize: 1.2, snow: 0, snowGround: 0, rain: 0, windowK: 0,
    ground: 0xb8a868, street: 0xfff0d0, roof: 0x8a7a6a, wall: 0xece4d4, tree: 0x2a4a22,
    window: 0xfff0d0, windowAlt: 0xffd8a0, lamp: 0xfff0c0,
    ribbon: 0x2a2620, edge: 0xfff8ec, fret: 0xe0b84a, glow: 0xffc860, hold: 0xffb040, gate: 0xffffff, gem: 0xfff4ec,
    skyLight: 0xfff4e0, bounce: 0xa89060, hemiK: 2.1, sunK: 1.9,
    board: 0x16120e, suit: 0x1a1a1e, jacket: 0x1e5a3a, hair: 0x1a120a, shoes: 0xe0b84a, gloves: 0x1a1a1e, rim: 0xffe0b0, daze: 0,
  },
  ymNoon: { horizon: 0xffe8b0, skyGlow: 0xfff0a0, fog: 0xf8e0a8, sunK: 2.1, hemiK: 2.2 },
  ymCloud: { zenith: 0x3a4a6a, horizon: 0xb8b0a0, skyGlow: 0xd8c890, fog: 0x9a9488, fogDensity: 0.0015, sunK: 0.9, hemiK: 1.8, skyLight: 0xd8d4cc, moonDir: [0.3, 0.4, 0.8] },
  ymEvening: { zenith: 0x3a4a8a, horizon: 0xffb890, skyGlow: 0xffa060, glowDir: [0.6, 0.06, 0.8], moonDir: [0.6, 0.1, 0.8], moon: 0xffc890, sunSize: 1.1, fog: 0xc89a80, fogDensity: 0.0013, skyLight: 0xffd0b0, bounce: 0x8a6048, hemiK: 1.9, sunK: 1.3, windowK: 0.6, lamp: 0xffc890 },
  ymStorm: { zenith: 0x1a2030, horizon: 0x5a5e66, skyGlow: 0x7a7a70, glowDir: [0.3, 0.3, 0.9], moonDir: [0.3, 0.5, 0.8], moon: 0xc8ccd0, sunSize: 0, fog: 0x4a4e56, fogDensity: 0.0019, rain: 0.85, ground: 0x4a5a3a, skyLight: 0x8a90a0, bounce: 0x3a3e46, hemiK: 1.6, sunK: 0.5, windowK: 0.7 },
  ymBath: { fog: 0x1c1c1e, fogDensity: 0.0022, rain: 0, skyLight: 0xf4f0ea, bounce: 0x6a6460, hemiK: 1.9 },
  ymGolden: { zenith: 0x4a6aa8, horizon: 0xffc890, skyGlow: 0xffb060, glowDir: [0.6, 0.06, 0.8], moonDir: [0.6, 0.12, 0.8], moon: 0xffd8a0, sunSize: 1.1, fog: 0xd8b088, fogDensity: 0.0012, rain: 0, ground: 0x6a8a3a, skyLight: 0xffe0b8, bounce: 0x8a7048, hemiK: 2.0, sunK: 1.5, windowK: 0.3 },
  // Until She Stopped Fighting: a steelworks at night, lit by its own metal; steam; the cooling yard
  // under the stars; the cast; morning.
  swNight: {
    zenith: 0x04050a, horizon: 0x14121c, skyGlow: 0x4a2a1a, glowDir: [0.3, 0.05, 1], skyline: 0x08080c, moonDir: [-0.4, 0.5, 0.75], moon: 0xc8ccd8,
    fog: 0x0c0a0c, fogDensity: 0.0016, stars: 0.3, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 0.6,
    ground: 0x141214, street: 0xffa060, roof: 0x1a1a1e, wall: 0x2a2a2e, tree: 0x0c0c0c,
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
  swDawn: { zenith: 0x3a4a7a, horizon: 0xe8b090, skyGlow: 0xffb070, glowDir: [0.5, 0.04, 0.85], moonDir: [0.5, 0.08, 0.85], moon: 0xffd0a0, sunSize: 0.9, stars: 0, fog: 0x9a8a88, fogDensity: 0.0013, ground: 0x2a2624, skyLight: 0xd8b8a8, bounce: 0x6a5048, hemiK: 1.9, sunK: 1.2, windowK: 0.2 },
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
  // Good Girls Don't Fight Back: a frozen lake at night under the stars, the silence, the aurora as
  // the band comes in, louder, the peak's light from under the ice, and open water toward morning.
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
  ggPeak: { horizon: 0x2a4a6a, skyGlow: 0x6affe8, fog: 0x0a2a3a, fogDensity: 0.001, skyLight: 0x9ad8ff, hemiK: 2.2, snow: 1.0, glow: 0x8af8ff, hold: 0x4affc0 },
  ggEnd: { zenith: 0x0a1430, horizon: 0x3a5a8a, skyGlow: 0x8affd0, stars: 0.5, fog: 0x10203a, snow: 0.3, skyLight: 0x6a8ac8, hemiK: 1.7, glow: 0x5ad8ff, hold: 0xff9ac8 },
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
  // Spiked: the street in neon, the club sweet and clean, then losing focus: red, the corridors,
  // the sick green, nothing, red emergency light, the house lights, and the morning's grey
  spkStreet: {
    zenith: 0x05040c, horizon: 0x1c1430, skyGlow: 0x8a4aff, glowDir: [0.3, 0.05, 1], skyline: 0x0c0a16, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8d0ff,
    fog: 0x140e22, fogDensity: 0.0022, stars: 0.4, sunSize: 0,
    ground: 0x0a0810, street: 0xff8a5a, roof: 0x1a1424, wall: 0x2a2234, tree: 0x0e1410,
    window: 0xff9ad8, windowAlt: 0x8ad8ff, lamp: 0xffa860,
    ribbon: 0x120a1c, edge: 0xd0c4ff, fret: 0x9fe8ff, glow: 0xff4fd8, hold: 0x8a6aff, gate: 0xffffff,
    skyLight: 0x5a4a8a, bounce: 0x2a1a2a, hemiK: 1.7, sunK: 0.6,
    board: 0x14101c, suit: 0x0e0a14, jacket: 0x6a4ad8, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0e0a14, rim: 0xc0a8ff, daze: 0,
  },
  spkClub: { fog: 0x120a20, fogDensity: 0.0028, stars: 0, skyLight: 0x8a6aff, bounce: 0x2a1040, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x40d8ff, daze: 0 },
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
    zenith: 0x4a5a80, horizon: 0xf0c8c0, skyGlow: 0xffb8a0, glowDir: [0.3, 0.05, 1], moonDir: [0.3, 0.06, 1], moon: 0xfff0e0, sunSize: 0.6, stars: 0, cloud: 0xe8d8e0, clouds: 0.5,
    fog: 0xa8a0b0, fogDensity: 0.0016, skyline: 0x6a6878, ground: 0x2a2a30, street: 0xffd8c0, window: 0x2a2a30, windowAlt: 0x2a2a30, lamp: 0xfff4e0,
    skyLight: 0xc8c8e0, bounce: 0x5a5058, hemiK: 1.7, sunK: 1.0, edge: 0xfff0f0, glow: 0xffc8d0, fret: 0xffffff, hold: 0x8a8ab0, daze: 0,
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
    ribbon: 0x140c0c, edge: 0xfff0e8, fret: 0xffd8a0, glow: 0xff3a5a, hold: 0xff2a4a, gate: 0xffffff, gem: 0xfff4f6,
    skyLight: 0xffe0c0, bounce: 0x5a3a24, hemiK: 1.9, sunK: 0.5,
    board: 0x14100e, suit: 0x101014, jacket: 0xd8102a, hair: 0x1a0e0a, shoes: 0x101014, gloves: 0x101014, rim: 0xffc0c8, daze: 0,
  },
  pupHall: { fog: 0x6a6460, fogDensity: 0.0018, skyLight: 0xfff8f0, bounce: 0x8a8070, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0d8, glow: 0xff3a5a, fret: 0xffe8b0, edge: 0xffffff },
  pupEvidence: { fog: 0x2a302c, fogDensity: 0.0026, skyLight: 0xe0f0e8, bounce: 0x3a4440, hemiK: 1.8, lamp: 0xe8fff0, glow: 0xff3a5a, fret: 0xe0ffe8, edge: 0xf0fff8 },
  pupRed: { fog: 0x3a0a10, fogDensity: 0.0024, skyLight: 0xffc0c0, bounce: 0x5a1010, hemiK: 1.9, lamp: 0xffb0a0, glow: 0xff2a3a, fret: 0xffb0b0, edge: 0xffe0e0, hold: 0xff1a3a },
  pupCells: { fog: 0x14181e, fogDensity: 0.003, skyLight: 0xa0b0c8, bounce: 0x20242a, hemiK: 1.5, lamp: 0xd8e0ff, glow: 0xff3a5a, fret: 0xc8d8ff, edge: 0xe0e8ff },
  pupMirror: { fog: 0x3a2028, fogDensity: 0.002, skyLight: 0xffe8e0, bounce: 0x6a4a44, hemiK: 1.7, lamp: 0xffd8b0, glow: 0xff4a7a, fret: 0xffe0f0, edge: 0xffffff, hold: 0xff2a4a },
  pupCold: { fog: 0x1a2a3e, fogDensity: 0.0024, skyLight: 0xc8e0ff, bounce: 0x30404e, hemiK: 1.55, lamp: 0xe0f4ff, glow: 0x8ad8ff, fret: 0xe0f8ff, edge: 0xffffff, hold: 0x6ab8ff },
  pupVerdict: { fog: 0x1a0e0c, fogDensity: 0.0024, skyLight: 0xffc8a0, bounce: 0x4a2a1a, hemiK: 1.7, lamp: 0xffb070, glow: 0xff2a4a, fret: 0xffd0a0, edge: 0xfff0e0, hold: 0xff2a4a },
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
  },
  unlCook: { fog: 0x3a2018, fogDensity: 0.0024, stars: 0, skyLight: 0xffd8b0, bounce: 0x6a3a2a, hemiK: 1.9, sunK: 0.5, lamp: 0xffc890, glow: 0xff5fd2, fret: 0xffd8a0 },
  unlFloor: { fog: 0x3a2a3e, fogDensity: 0.002, stars: 0, skyLight: 0xffe0f0, bounce: 0x4a5a50, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0f8, glow: 0xff5fd2, fret: 0x9af0d8, edge: 0xffffff },
  unlPress: { fog: 0x1a1418, fogDensity: 0.003, skyLight: 0xd8c8c8, bounce: 0x3a2020, hemiK: 1.7, lamp: 0xff6040, glow: 0xff4a4a, fret: 0xffd040, edge: 0xfff0e0, hold: 0xff3a5a },
  unlShow: { fog: 0x3a1a30, fogDensity: 0.0022, skyLight: 0xffd8f0, bounce: 0x6a3a5a, hemiK: 2.0, lamp: 0xffb0e0, glow: 0xff5fd2, fret: 0xb0fff0, edge: 0xffffff, hold: 0xff3aa8 },
  unlDark: { fog: 0x0a0604, fogDensity: 0.004, skyLight: 0x4a3a2a, bounce: 0x100804, hemiK: 0.9, sunK: 0.3, lamp: 0xffa040, glow: 0xffa040, fret: 0xffd8a0, edge: 0xffe0c0, hold: 0xff8a2a },
  unlFull: { fog: 0x4a2a4e, fogDensity: 0.0018, skyLight: 0xfff0ff, bounce: 0x5a6a60, hemiK: 2.2, sunK: 0.7, lamp: 0xffffff, glow: 0xff3ad0, fret: 0x6affd8, edge: 0xffffff, hold: 0xff3aa8 },
  unlBlock: { zenith: 0x060410, horizon: 0x2a1438, fog: 0x1a1022, fogDensity: 0.0017, stars: 0.6, skyLight: 0x6a4a8a, bounce: 0x2a1424, hemiK: 1.6, sunK: 0.5, lamp: 0xffb070, street: 0xffb070, window: 0xffc890, windowAlt: 0xff9ad8, glow: 0xff5fd2, fret: 0xffd8a0, edge: 0xffe0f4, hold: 0xff3aa8 },
  unlDrop: { fog: 0x2a1030, fogDensity: 0.0015, skyLight: 0xff9ae0, bounce: 0x4a1a3a, hemiK: 2.0, window: 0xff9ad8, windowAlt: 0x9af0d8, lamp: 0xff9ad8, glow: 0xff5fd2, fret: 0x9af0d8 },
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
  getaway: {
    zenith: 0x2f5ec8, horizon: 0xffd8a0, skyGlow: 0xffb070, glowDir: [0.7, 0.14, 0.7], moonDir: [0.7, 0.14, 0.7], moon: 0xffc888,
    fog: 0xe0c8a8, fogDensity: 0.0011, sunSize: 1.2, cloud: 0xffe0c0, clouds: 0.45, sunK: 2.4, hemiK: 1.4, edge: 0xffe8c0,
  },
  // Your Apartment Smells Like Summer: a hot night, orange windows, then the storm
  summernight2: {
    zenith: 0x0c0a24, horizon: 0x4a2a52, skyGlow: 0xff7a4a, glowDir: [0.2, 0.05, 1], skyline: 0x1a1024, moonDir: [-0.4, 0.5, 0.7], moon: 0xffe0c0,
    fog: 0x2c1a34, fogDensity: 0.0019, stars: 0.5, sunSize: 0,
    ground: 0x100c14, street: 0xffa050, roof: 0x22182a, wall: 0x3a2a30, tree: 0x0f1612,
    window: 0xffb060, windowAlt: 0xff6a9a, lamp: 0xffa050,
    ribbon: 0x201018, edge: 0xffb070, fret: 0xffe0c0, glow: 0xff6a4a, hold: 0xff4fa0, gate: 0xfff4e0,
    skyLight: 0x6a4a8a, bounce: 0x5a3a2a, hemiK: 1.9, sunK: 0.8,
    board: 0x1a1018, suit: 0x1a1420, jacket: 0xff8a4f, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffc890,
  },
  // her apartment by the lamps, the summer night in the windows
  apartment: {
    fog: 0x2a1a16, fogDensity: 0.0026, stars: 0, rain: 0,
    skyLight: 0xe0b890, bounce: 0x6a4030, hemiK: 1.8, sunK: 0.6, lamp: 0xffb060, edge: 0xffc890, glow: 0xffa060,
  },
  rooftops: {
    zenith: 0x080a26, horizon: 0x3a2850, skyGlow: 0xff8a5a, fog: 0x22182e, fogDensity: 0.0015, stars: 0.8,
    skyLight: 0x6a5a9a, hemiK: 1.9,
  },
  storm: {
    zenith: 0x080a12, horizon: 0x262636, skyGlow: 0x5a6a8a, glowDir: [0.2, 0.1, 1], fog: 0x181a26, fogDensity: 0.0024, stars: 0, rain: 0.85,
    skyLight: 0x5a6a90, bounce: 0x2a2a3a, hemiK: 1.7, lamp: 0xffa860, edge: 0xc8d8ff, glow: 0x8aa8ff,
  },
  hallway: {
    fog: 0x16160e, fogDensity: 0.0032, stars: 0, rain: 0,
    skyLight: 0xd0cca0, bounce: 0x3a3a24, hemiK: 1.5, lamp: 0xfff0c8, edge: 0xfff0c8, glow: 0xffe090,
  },
  afterstorm: {
    zenith: 0x0a0a28, horizon: 0x5a3050, skyGlow: 0xff7a5a, glowDir: [0, 0.05, 1], fog: 0x24182a, fogDensity: 0.0011, stars: 0.9, rain: 0,
    skyLight: 0x8a6a9a, hemiK: 1.9, lamp: 0xffb060, edge: 0xffb070, glow: 0xff6a4a,
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
  // Technically Thirty-Two: a clear freezing morning, sun across the street in bands
  frost: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2a62d0, horizon: 0xdbe7f5, skyGlow: 0xfff0d8, glowDir: [-0.5, 0.18, 0.85], skyline: 0x8a9ab8, moonDir: [-0.5, 0.18, 0.85], moon: 0xfff0d8,
    fog: 0xc6d4e8, fogDensity: 0.0012, stars: 0, sunSize: 1, snowGround: 0.45, cloud: 0xffffff, clouds: 0.25, shade: 1, breath: 1,
    ground: 0xb0bac8, street: 0xffd8a8, roof: 0x5a6070, wall: 0x8a90a0, tree: 0x3a4a48,
    window: 0xffe0b0, windowAlt: 0xbfe0ff, lamp: 0xffe0b0,
    ribbon: 0x28324a, edge: 0x9fe0ff, fret: 0xe0f4ff, glow: 0xffb070, hold: 0xff7a3a, gate: 0xffffff,
    skyLight: 0xa8c4f0, bounce: 0x8a8070, sunK: 2.8, hemiK: 1.5, fillK: 0.3,
    board: 0x1a1a24, suit: 0x23283a, jacket: 0xff4a5a, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xcfeaff,
  },
  overcast: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x8a96aa, horizon: 0xc6ccd6, skyGlow: 0xdce0e8, moonDir: [-0.5, 0.3, 0.85], moon: 0xd8dce4, sunSize: 0, cloud: 0xd0d4dc, clouds: 0.95,
    fog: 0xb0b8c4, fogDensity: 0.0017, snow: 0.55, snowGround: 0.6, shade: 0, breath: 1.2,
    skyLight: 0xb8c0d0, bounce: 0x7a7a80, sunK: 0.5, hemiK: 2.0, edge: 0xc8e8ff, hold: 0xff7a3a,
  },
  thaw: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2e6ad4, horizon: 0xf0e4d0, skyGlow: 0xffe0b8, glowDir: [-0.45, 0.22, 0.85], moonDir: [-0.45, 0.22, 0.85], moon: 0xffe8c8, sunSize: 1, cloud: 0xffffff, clouds: 0.3,
    fog: 0xd6d4dc, fogDensity: 0.0012, snow: 0, snowGround: 0.35, shade: 1, breath: 0.8,
    skyLight: 0xb0c4ec, bounce: 0x9a8a70, sunK: 2.8, hemiK: 1.5, edge: 0xffe0b0, hold: 0xff7a3a,
  },
  homesun: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x3a6ad0, horizon: 0xffe8c8, skyGlow: 0xffd8a0, glowDir: [-0.4, 0.2, 0.9], moonDir: [-0.4, 0.2, 0.9], moon: 0xffe0b0, sunSize: 1.1, cloud: 0xfff4e4, clouds: 0.3,
    fog: 0xe0d4c8, fogDensity: 0.0011, snowGround: 0.25, shade: 1, breath: 0.6,
    skyLight: 0xb8c4e8, bounce: 0xa08a68, sunK: 3.0, hemiK: 1.5, edge: 0xffd8a0, hold: 0xff6a3a,
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
    ground: 0x4a4a28, dirt: 0x7a5440, skyline: 0x4a3a58, skyLight: 0x8a7ab0, bounce: 0x6a3a2a, sunK: 1.6, hemiK: 1.1, dapple: 0, hills: 0.8,
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
    fog: 0x2a1236, fogDensity: 0.0021,
    ground: 0x0b0912, street: 0xff8a3d, roof: 0x1d1424, wall: 0x2a2233, tree: 0x0d1716,
    window: 0xffb36b, windowAlt: 0xff6fb5, lamp: 0xffa04a,
    ribbon: 0x2a0d24, edge: 0x5ff2ff, fret: 0xff8fd0, glow: 0xff3d8b, hold: 0xff3d8b, gate: 0xdcffff,
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
  },
  late: {
    zenith: 0x040714, horizon: 0x18213e, skyGlow: 0x5a78d8, glowDir: [0.3, 0.04, 1], skyline: 0x0c1226, moon: 0xa8b8ff,
    fog: 0x121a30, fogDensity: 0.0022, stars: 0.9,
    ground: 0x0a0c14, street: 0x9fb8ff, window: 0xbfd4ff, windowAlt: 0xff5f6a, lamp: 0xb8c8ff,
    ribbon: 0x10142a, edge: 0x9fc8ff, fret: 0xd0e0ff, glow: 0xff3a4a, hold: 0x6fa8ff, gate: 0xf0f6ff,
    skyLight: 0x3a4a7a, bounce: 0x2a2a3a, heart: 0xff3048,
  },
  vigil: {
    zenith: 0x020206, horizon: 0x120e1c, skyGlow: 0x3a2050, glowDir: [0.3, 0.04, 1], skyline: 0x08060e, moon: 0xff6a80,
    fog: 0x0a0812, fogDensity: 0.0026, stars: 1.3,
    ground: 0x050408, street: 0x5a4a6a, window: 0x7a5a4a, windowAlt: 0x4a3a5a, lamp: 0x6a5a7a,
    ribbon: 0x0a0810, edge: 0x5cffa8, fret: 0x9affd0, glow: 0xff3a5a, hold: 0x4cff9a, gate: 0xe8fff0,
    skyLight: 0x2a2440, bounce: 0x1a1418, heart: 0xff2040,
  },
  encore: {
    zenith: 0x10041a, horizon: 0x6a1840, skyGlow: 0xff5a6a, glowDir: [0.3, 0.04, 1], skyline: 0x2a0c28, moon: 0xffa0b8,
    fog: 0x3a1030, fogDensity: 0.0016, stars: 0.4,
    ground: 0x120810, street: 0xffc070, window: 0xffd28a, windowAlt: 0xff7fd0, lamp: 0xffc070,
    ribbon: 0x34081c, edge: 0xffe08a, fret: 0xffc8e0, glow: 0xff2a55, hold: 0xff4fb8, gate: 0xfff2c8,
    skyLight: 0x8a3a7a, bounce: 0x6a2a3a, heart: 0xff2050,
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
