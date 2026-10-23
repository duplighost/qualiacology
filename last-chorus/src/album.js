// The record: which songs, in what order, how each one is built.
// Section times are seconds into the song, each on the beat the music changes.
// kinds: intro verse pre chorus post bridge break final outro
// start: 'launch' makes the section open with a lip you fly off (kick = m/s upward).

export const ALBUM = [
  {
    id: 'kiss-me-like-a-car-crash',
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
    // the town sings it, through a whole year: winter, the first warm Friday,
    // summer, the last car south in September, the first cold rain
    id: 'summer-people',
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
    // a party with somebody else's heart in it. The heart hangs over the city
    // all night and beats as hard as you keep the beat. In the bridge the band
    // leaves and the kick drum talks: the rails become a heart monitor that only
    // spikes when you pump on time.
    id: 'heart-of-the-party',
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
  carcrash: {
    zenith: 0x05040f, horizon: 0x3a1744, skyGlow: 0xff3f78, glowDir: [1, 0.04, 0.45], skyline: 0x150a1e, moonDir: [-0.5, 0.42, 0.75], moon: 0xffe3f0,
    fog: 0x2a1236, fogDensity: 0.0021,
    ground: 0x0b0912, street: 0xff8a3d, roof: 0x1d1424, wall: 0x2a2233, tree: 0x0d1716,
    window: 0xffb36b, windowAlt: 0xff6fb5, lamp: 0xffa04a,
    ribbon: 0x2a0d24, edge: 0x5ff2ff, fret: 0xff8fd0, glow: 0xff3d8b,
    board: 0x1a1020, suit: 0x0d0b14, jacket: 0xff3f8e, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0x7fe9ff,
  },
  // Summer People: one town, one year
  winter: {
    zenith: 0x060a18, horizon: 0x26324c, skyGlow: 0x8fa8d8, glowDir: [-0.4, 0.05, 1], skyline: 0x101828, moonDir: [0.6, 0.45, 0.7], moon: 0xe8f0ff,
    fog: 0x1e2a40, fogDensity: 0.0024, stars: 1, snow: 0.85, snowGround: 0.8, sunSize: 0,
    ground: 0x1a2030, street: 0xa8c0ff, roof: 0x2a2c38, wall: 0x2a2233, tree: 0x0d1716, water: 0x0a1424, sand: 0x9aa4b8,
    window: 0xffc68a, windowAlt: 0xa8d8ff, lamp: 0xffd8a0,
    ribbon: 0x5a4a44, edge: 0xcfe6ff, fret: 0xd8e6ff, glow: 0x9fc8ff, ribbonStyle: 1,
    skyLight: 0x5a6a90, bounce: 0x303848,
    board: 0x1a1a24, suit: 0x1a1a22, jacket: 0x8a78d8, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xbfe0ff,
  },
  spring: {
    zenith: 0x161a44, horizon: 0x8a6a9a, skyGlow: 0xffa8c0, glowDir: [1, 0.04, 0.4], skyline: 0x2a2440, moonDir: [0.6, 0.45, 0.7], moon: 0xfff0f6,
    fog: 0x4a3c5c, fogDensity: 0.0018, stars: 0.35, snow: 0, snowGround: 0, sunSize: 0,
    ground: 0x2a3a2a, street: 0xffd8a0, water: 0x1a2440, sand: 0xc8b49a,
    window: 0xffc68a, windowAlt: 0xffa8d8, lamp: 0xffd8a0,
    ribbon: 0x6a4e3e, edge: 0xffe6c0, fret: 0xffd8e8, glow: 0xffa8c0,
    skyLight: 0x8a7aa8, bounce: 0x5a4a40,
  },
  summer: {
    zenith: 0x2c2a6c, horizon: 0xff9a6a, skyGlow: 0xffb070, glowDir: [1, 0.03, 0.35], skyline: 0x6a3a50, moonDir: [1, 0.06, 0.32], moon: 0xffcf8a,
    fog: 0xa86a6a, fogDensity: 0.0014, stars: 0, snow: 0, snowGround: 0, sunSize: 1,
    ground: 0x3a4a2a, street: 0xffd28a, water: 0x2a3a5a, sand: 0xe8c89a,
    window: 0xffd28a, windowAlt: 0xff9ed2, lamp: 0xffd28a,
    ribbon: 0x7a5640, edge: 0xffe0a0, fret: 0xfff0c8, glow: 0xff9a6a,
    skyLight: 0xffb08a, bounce: 0x8a5a40,
  },
  summernight: {
    zenith: 0x0a0a26, horizon: 0x3a2056, skyGlow: 0xff6fa8, glowDir: [1, 0.04, 0.35], skyline: 0x1a1030, moonDir: [-0.4, 0.4, 0.8], moon: 0xffeef8,
    fog: 0x2e1c40, fogDensity: 0.0018, stars: 1, sunSize: 0,
    ground: 0x16201a, street: 0xffc070, water: 0x0c1428, sand: 0x8a7a68,
    window: 0xffc070, windowAlt: 0xff8ad0, lamp: 0xffc070,
    ribbon: 0x5a4034, edge: 0xffd28a, fret: 0xffb8e0, glow: 0xff6fa8,
    skyLight: 0x6a5a9a, bounce: 0x5a3a2a,
  },
  september: {
    zenith: 0x14122e, horizon: 0x8a4a3a, skyGlow: 0xff8a50, glowDir: [1, 0.03, 0.4], skyline: 0x3a2030, moonDir: [1, 0.04, 0.4], moon: 0xffb070,
    fog: 0x5a3a40, fogDensity: 0.0019, stars: 0.2, sunSize: 0.7,
    ground: 0x2a2a20, street: 0xffb070, water: 0x1a2236, sand: 0xb89a7a,
    window: 0xffb070, windowAlt: 0xffa0a0, lamp: 0xffb070,
    ribbon: 0x5e4436, edge: 0xffcf9a, fret: 0xffd0b0, glow: 0xff8a50,
    skyLight: 0x9a7a8a, bounce: 0x6a4a3a,
  },
  // Heart of the Party: red and gold, a heart where the moon should be
  party: {
    zenith: 0x0a0414, horizon: 0x4a1430, skyGlow: 0xff4a5e, glowDir: [0.3, 0.04, 1], skyline: 0x1c0a1c, moonDir: [0, -1, 0], moon: 0xff8aa6,
    fog: 0x2c0c24, fogDensity: 0.0019, stars: 0.5, sunSize: 0,
    ground: 0x0e0810, street: 0xffb060, roof: 0x1e1220, wall: 0x2a1e2c, tree: 0x0f1612,
    window: 0xffc070, windowAlt: 0xff5f8a, lamp: 0xffb060,
    ribbon: 0x2a0a18, edge: 0xffd27a, fret: 0xffb3c8, glow: 0xff3355,
    skyLight: 0x7a3a6a, bounce: 0x5a2a2a, heart: 0xff2a50,
    board: 0x1a0f18, suit: 0x0d0b14, jacket: 0xff2a4a, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffd27a,
  },
  late: {
    zenith: 0x040714, horizon: 0x18213e, skyGlow: 0x5a78d8, glowDir: [0.3, 0.04, 1], skyline: 0x0c1226, moon: 0xa8b8ff,
    fog: 0x121a30, fogDensity: 0.0022, stars: 0.9,
    ground: 0x0a0c14, street: 0x9fb8ff, window: 0xbfd4ff, windowAlt: 0xff5f6a, lamp: 0xb8c8ff,
    ribbon: 0x10142a, edge: 0x9fc8ff, fret: 0xd0e0ff, glow: 0xff3a4a,
    skyLight: 0x3a4a7a, bounce: 0x2a2a3a, heart: 0xff3048,
  },
  vigil: {
    zenith: 0x020206, horizon: 0x120e1c, skyGlow: 0x3a2050, glowDir: [0.3, 0.04, 1], skyline: 0x08060e, moon: 0xff6a80,
    fog: 0x0a0812, fogDensity: 0.0026, stars: 1.3,
    ground: 0x050408, street: 0x5a4a6a, window: 0x7a5a4a, windowAlt: 0x4a3a5a, lamp: 0x6a5a7a,
    ribbon: 0x0a0810, edge: 0x5cffa8, fret: 0x9affd0, glow: 0xff3a5a,
    skyLight: 0x2a2440, bounce: 0x1a1418, heart: 0xff2040,
  },
  encore: {
    zenith: 0x10041a, horizon: 0x6a1840, skyGlow: 0xff5a6a, glowDir: [0.3, 0.04, 1], skyline: 0x2a0c28, moon: 0xffa0b8,
    fog: 0x3a1030, fogDensity: 0.0016, stars: 0.4,
    ground: 0x120810, street: 0xffc070, window: 0xffd28a, windowAlt: 0xff7fd0, lamp: 0xffc070,
    ribbon: 0x34081c, edge: 0xffe08a, fret: 0xffc8e0, glow: 0xff2a55,
    skyLight: 0x8a3a7a, bounce: 0x6a2a3a, heart: 0xff2050,
  },
  rain: {
    zenith: 0x080c16, horizon: 0x283044, skyGlow: 0x6a8ab8, glowDir: [1, 0.04, 0.4], skyline: 0x101420, moonDir: [-0.4, 0.4, 0.8], moon: 0x8090b0,
    fog: 0x1c2434, fogDensity: 0.0027, stars: 0, sunSize: 0, rain: 0.9, snow: 0,
    ground: 0x141a22, street: 0xffc890, water: 0x0a1018, sand: 0x5a5e66,
    window: 0xffc890, windowAlt: 0xffa8d0, lamp: 0xffc890,
    ribbon: 0x3e3430, edge: 0xffd8a8, fret: 0xffe0f0, glow: 0xff8ab8,
    skyLight: 0x4a5878, bounce: 0x3a3440,
  },
};
