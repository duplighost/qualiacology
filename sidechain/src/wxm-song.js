// White Christmas: its course, its looks, its moments and what stands along the way. (album.js puts it
// in the record; the place itself is in wxm-world.js.)

const SNOWY = { snow: 0.6, snowGround: 1 };

export const palettes = {
  // the street at night: snow coming down, every house lit, the lights on the eaves
  wxmNight: {
    zenith: 0x04060e, horizon: 0x1c2438, skyGlow: 0x5a4a6a, glowDir: [0.2, 0.06, 1], skyline: 0x0a0c16, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8e0f0,
    fog: 0x161c2a, fogDensity: 0.0017, stars: 0.25, sunSize: 0, ...SNOWY, rain: 0, windowK: 1.6,
    ground: 0x1a1e28, street: 0xffc890, roof: 0x22202a, wall: 0x3a3844, tree: 0x0c1410,
    window: 0xffc070, windowAlt: 0xff8a5a, lamp: 0xffc890,
    ribbon: 0x14161e, edge: 0xf4f8ff, fret: 0xff5a5a, glow: 0xff4a4a, hold: 0xff3a3a, gate: 0xffffff, gem: 0xf0f6ff,
    skyLight: 0x8a96b8, bounce: 0x4a4a5a, hemiK: 1.8, sunK: 0.6, hills: 1,
    board: 0x16141a, suit: 0x1a1a22, jacket: 0xb8202a, hair: 0x1a1210, shoes: 0xf0ece4, gloves: 0x1a1a22, rim: 0xffd8c0, daze: 0,
  },
  // the choruses: the snow so thick everything goes white
  wxmWhite: { zenith: 0x1a2236, horizon: 0x8a96b0, skyGlow: 0xc8d0e8, fog: 0x7a849a, fogDensity: 0.0026, snow: 1, stars: 0, skyLight: 0xd8e0f4, bounce: 0x8a90a8, hemiK: 2.1, windowK: 1.8, edge: 0xffffff },
  wxmWhiteOut: { zenith: 0x5a6a8a, horizon: 0xe8ecf6, skyGlow: 0xf4f6ff, fog: 0xc8d0e0, fogDensity: 0.0034, snow: 1, stars: 0, skyLight: 0xf4f6ff, bounce: 0xb8c0d0, hemiK: 2.3, edge: 0xffffff },
  // her bathroom: pink tile under the ceiling light, the warm of it
  wxmBath: { fog: 0x2a1a1e, fogDensity: 0.0024, snow: 0, skyLight: 0xffe0dc, bounce: 0x8a5a5e, hemiK: 1.9, stars: 0, horizon: 0x2a3450, zenith: 0x0a0e1a },
  wxmBathHot: { fog: 0x3a1e22, fogDensity: 0.0024, snow: 0, skyLight: 0xfff0e8, bounce: 0xa86a6a, hemiK: 2.2 },
  // "better lighting than your apartment": every bulb round the mirror, white and hard
  wxmMirror: { fog: 0x4a4448, fogDensity: 0.0022, snow: 0, skyLight: 0xffffff, bounce: 0xd8c8c8, hemiK: 2.5 },
  // the dinner by candlelight
  wxmDinner: { fog: 0x1e120c, fogDensity: 0.0016, snow: 0.4, skyLight: 0xffd8a8, bounce: 0x6a3a22, hemiK: 1.8, horizon: 0x1a2440, zenith: 0x060a14 },
  // "are you okay?": the room goes quiet and cold round him
  wxmQuiet: { fog: 0x0e1018, fogDensity: 0.0022, skyLight: 0x8a9ab8, bounce: 0x2a2a3a, hemiK: 1.3 },
  // the hall, the coats, the dark at the bottom of the basement stairs
  wxmHall: { fog: 0x16120e, fogDensity: 0.0024, snow: 0.4, skyLight: 0xe8c8a0, bounce: 0x4a3a2a, hemiK: 1.55 },
  // 2 a.m.: everybody gone to bed, only the tree's lights
  wxm2am: { fog: 0x05060c, fogDensity: 0.0024, snow: 0, skyLight: 0x7080b0, bounce: 0x2a2234, hemiK: 1.35, horizon: 0x1a2440, zenith: 0x04060e, glow: 0xffb070, hold: 0xc8302a },
  wxm2amSnow: { snow: 0.78 },
  wxmEnd: { fog: 0x1a2232, fogDensity: 0.0015, snow: 0.55, skyLight: 0xa0acc8, hemiK: 1.9 },
};

// her lines, on the plaques: indoors they hang, out on the street they stand on candy canes
const IN = { part: 'wxmPlaqueIn', x: 21, s: 0.78, h: 12 }, OUT = { part: 'wxmPlaqueOut', x: 30, s: 1.1, h: 9 }, TABLEL = { part: 'wxmPlaqueIn', x: 25, s: 1, h: 13 };

export const song = {
  // Christmas at grandma's. Up the street in the snow, every house lit, and in at her door: the pink
  // bathroom, the door locked, the fan killed, the sweater, the mirror and the bulbs round it, the
  // counter laid out like an altar, the nativity, the girl praying, the toilet in its Santa lid; out
  // her window for "I'm dreaming of a white Christmas", over the street with the carolers until the
  // snow is all there is. In again for dinner, on the tablecloth: dad's cans going up, mom's paper
  // crown, the kid, the dry ham, the cropped photo, the cracker that pops; back to the bathroom and
  // out the window again (presents, the reindeer with the red nose, the lights beating like a heart).
  // The talk: the coats, the basement, mom's handbag, her bathroom lit like a stage, the magnifying
  // mirror and the Precious Moments girls all watching. Dinner again, talking too fast: the clock, the
  // toast, Biscuit, grandma, nine cookies and the orange. Out for the last chorus, and it stops dead.
  // 2 a.m.: the tree lights still on and stuttering with his heart, every glass empty, the plate in
  // the fridge with his name on it, the phone that lights and goes dark; snow falling in the living
  // room. Out the front door into the snow for the end, and the fridge standing open in a field.
  id: 'white-christmas',
  accent: '#f4f8ff',
  title: 'White Christmas',
  collect: 'flake',
  preview: 71.56,   // the song list plays it from "I'm dreaming of a white Christmas", not the intro's scream
  // (the analysis put the bar line on the snare; the kick, the band's one-bar stop at 104.8 and where
  // the rhymes land all say the bar starts a beat later)
  downbeat: 1,
  startY: 18,
  skyline: 'hills',
  sections: [
    { t: 0.0, kind: 'intro', endY: 20 },                                                       // the street, the band coming up
    { t: 4.71, kind: 'pre', endY: 26 },                                                        // the band
    { t: 10.58, kind: 'chorus', start: 'launch', kick: 9, endY: 14 },                          // the scream
    { t: 16.52, kind: 'post', endY: 13 },
    { t: 20.46, kind: 'verse', endY: 12, turn: 0.3 },                                          // in at grandma's: "lock the bathroom door"
    { t: 51.96, kind: 'pre', endY: 16, turn: 0.3 },
    { t: 63.72, kind: 'post', c: 1.1, endY: 22, turn: 0.3 },                                   // "thank God, amen"
    { t: 71.56, kind: 'chorus', start: 'launch', kick: 11, endY: 12 },                         // "I'm dreaming of a white Christmas": out the window
    { t: 87.22, kind: 'chorus', c: 1.35, endY: 13 },
    { t: 104.83, kind: 'break', endY: 22 },                                                    // the band stops a bar: in at her door
    { t: 106.77, kind: 'verse', start: 'launch', kick: 8, c: 0.84, endY: 11, turn: 0.3 },     // "Dad's on beer fourteen": down onto the table
    { t: 120.09, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7, endY: 11, turn: 0.3 },  // the band stops dead on "pet": over it
    { t: 138.15, kind: 'pre', endY: 15, turn: 0.3 },                                           // "excuse me"
    { t: 144.02, kind: 'post', c: 1.1, endY: 24, turn: 0.3 },                                  // back in the bathroom
    { t: 155.70, kind: 'chorus', start: 'launch', kick: 12, endY: 12 },                        // out the window again
    { t: 171.29, kind: 'chorus', c: 1.35, endY: 13 },
    { t: 188.75, kind: 'bridge', endY: 12, turn: 0.3 },                                        // "they don't tell you about the holidays"
    { t: 208.42, kind: 'break', endY: 12, turn: 0.3 },                                         // "...when you were nine."
    { t: 210.39, kind: 'bridge', endY: 12, turn: 0.3 },
    { t: 212.37, kind: 'break', endY: 12, turn: 0.3 },                                         // "well, mommy?"
    { t: 214.31, kind: 'bridge', endY: 12, turn: 0.3 },
    { t: 220.18, kind: 'verse', c: 0.8, endY: 12, turn: 0.3 },                                 // her bathroom, the good lighting
    { t: 251.27, kind: 'pre', endY: 22, turn: 0.3 },                                           // "we're all just trying to survive"
    { t: 260.88, kind: 'verse', start: 'launch', kick: 9, endY: 11, turn: 0.3 },              // back at dinner
    { t: 272.45, kind: 'post', c: 1.15, endY: 12, turn: 0.3 },                                 // the toast, Biscuit, grandma
    { t: 291.62, kind: 'break', endY: 12, turn: 0.3 },                                         // "are you okay?"
    { t: 303.60, kind: 'pre', endY: 24, turn: 0.3 },                                           // back to the bathroom
    { t: 309.34, kind: 'final', start: 'launch', kick: 12, endY: 12 },                         // the last chorus
    { t: 324.61, kind: 'final', c: 1.35, endY: 14 },
    { t: 345.59, kind: 'bridge', endY: 10, turn: 0.3 },                                        // it stops. 2 a.m.
    { t: 361.40, kind: 'pulse', endY: 10, turn: 0.3 },                                         // "my heart is doing something weird"
    { t: 365.35, kind: 'bridge', endY: 10, turn: 0.3 },
    { t: 406.27, kind: 'pre', endY: 22 },                                                      // the drums back, out the front door
    { t: 413.90, kind: 'final', start: 'launch', kick: 11, endY: 12 },
    { t: 421.46, kind: 'bridge', endY: 14 },                                                   // "if you or someone you know..."
    { t: 428.99, kind: 'final', start: 'launch', kick: 11, endY: 10 },                         // "Merry Christmas"
    { t: 440.69, kind: 'outro', endY: 5 },
  ],
  rails: [
    { t: 173.24, bars: 2, x: 0 },        // "every rail a little valentine": along the candy canes
  ],
  palette: 'wxmNight',
  world: 'wxm',
  titleView: { ahead: -0.16, x: 1.4, h: 1.6, back: -0.8, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'wxmNight' },
    { t: 10.58, fade: 0.4, set: { snow: 0.85 } },                                        // the scream
    { t: 20.5, palette: 'wxmBath', fade: 0.4 },                                         // in at her door, and it's the bathroom
    { t: 63.7, palette: 'wxmBathHot', fade: 6 },
    { t: 71.56, palette: 'wxmWhite', fade: 0.3 },                                       // out the window: the snow
    { t: 100.4, palette: 'wxmWhiteOut', fade: 2.4 },                                    // "...be white"
    { t: 104.83, palette: 'wxmDinner', fade: 0.4 },                                     // dinner
    { t: 138.15, palette: 'wxmHall', fade: 0.5 },
    { t: 144.02, palette: 'wxmBath', fade: 0.5 },
    { t: 155.0, palette: 'wxmBathHot', fade: 9 },
    { t: 155.70, palette: 'wxmWhite', fade: 0.3 },
    { t: 184.9, palette: 'wxmWhiteOut', fade: 2.4 },
    { t: 188.75, palette: 'wxmHall', fade: 0.6 },                                       // the talk
    { t: 220.18, palette: 'wxmMirror', fade: 0.8 },                                     // "better lighting than your apartment"
    { t: 236.0, palette: 'wxmBath', fade: 5 },                                          // the girl watching
    { t: 251.27, palette: 'wxmBathHot', fade: 3 },
    { t: 258.98, palette: 'wxmDinner', fade: 0.6 },
    { t: 293.4, palette: 'wxmQuiet', fade: 0.4 },                                       // "are you okay?"
    { t: 299.1, palette: 'wxmDinner', fade: 1.5 },
    { t: 303.6, palette: 'wxmBathHot', fade: 0.5 },
    { t: 309.34, palette: 'wxmWhite', fade: 0.3 },
    { t: 341.0, palette: 'wxmWhiteOut', fade: 3 },
    { t: 345.59, palette: 'wxm2am', fade: 0.15 },                                       // it stops: 2 a.m.
    { t: 401.0, palette: 'wxm2amSnow', fade: 2.5 },                                     // "I'm dreaming of a white Christmas", soft: snow in the living room
    { t: 406.27, palette: 'wxmNight', fade: 0.6 },                                      // out the front door
    { t: 413.9, palette: 'wxmWhite', fade: 0.5 },
    { t: 421.46, palette: 'wxmNight', fade: 2 },
    { t: 428.99, palette: 'wxmWhite', fade: 0.3 },
    { t: 441.0, palette: 'wxmEnd', fade: 3 },
  ],
  moments: [
    { t: 10.58, kind: 'flash', k: 0.25 },               // the scream
    { t: 22.43, kind: 'knock', n: 1, k: 0.3 },          // the hook drops into the eye
    { t: 71.56, kind: 'flash', k: 0.35 },               // out the window
    { t: 106.77, kind: 'flash', k: 0.15 },              // the band back
    { t: 130.8, kind: 'shutter', k: 0.5 },              // "cousins posting photos"
    { t: 135.0, kind: 'pop', k: 0.5 },                  // "...something popped"
    { t: 155.70, kind: 'flash', k: 0.35 },
    { t: 256.8, kind: 'bell', k: 0.4 },                 // "God bless her little painted eyes"
    { t: 260.88, kind: 'flash', k: 0.15 },
    { t: 276.3, kind: 'ring', k: 0.35, dur: 1.2 },      // the toast
    { t: 309.34, kind: 'flash', k: 0.4 },
    { t: 345.59, kind: 'blackout', dur: 2.0, k: 0.95 }, // it stops dead
    { t: 362.9, kind: 'knock', n: 2, gap: 170, k: 0.22 },   // "my heart is doing something weird"
    { t: 413.90, kind: 'flash', k: 0.25 },
    { t: 428.99, kind: 'flash', k: 0.35 },              // "Merry Christmas"
    { t: 429.1, kind: 'bell', n: 3, gap: 380, k: 0.45 },
  ],
  scenery: {
    wxm: {
      pulse: [179.0, 183.0],                                     // "may your heart keep on beating": the street's lights beat
      blaze: [[220.4, 236.0, 1.3], [146.0, 155.6, 0.6]],         // the bulbs round her mirror
      heart: [361.6, 366.2],                                     // "my heart is doing something weird"
    },
    rooms: [
      { style: 'bath', from: 20.46, to: 71.56, caps: [{ kind: 'front', hw: 12, hh: 26 }, { kind: 'wall', hw: 14, hh: 34, sill: 4 }] },   // in at her door; out her window
      { style: 'dining', from: 104.83, to: 138.15, caps: [{ kind: 'front', hw: 16, hh: 30 }, { kind: 'wall', hw: 22, hh: 40, down: 26 }] },
      { style: 'hall', from: 138.15, to: 144.02, caps: [{ kind: 'wall', hw: 12, hh: 30 }, null] },
      { style: 'bath', from: 144.02, to: 155.70, caps: [{ kind: 'wall', hw: 12, hh: 30 }, { kind: 'wall', hw: 14, hh: 34, sill: 4 }] },
      { style: 'hall', from: 188.75, to: 220.18, caps: [{ kind: 'front', hw: 12, hh: 26 }, null] },
      { style: 'bath', from: 220.18, to: 258.98, caps: [{ kind: 'wall', hw: 12, hh: 30 }, { kind: 'wall', hw: 12, hh: 30 }] },
      { style: 'dining', from: 258.98, to: 303.60, caps: [{ kind: 'wall', hw: 36, hh: 38, down: 26 }, { kind: 'wall', hw: 36, hh: 38, down: 26 }] },
      { style: 'bath', from: 303.60, to: 309.34, caps: [{ kind: 'wall', hw: 12, hh: 30 }, { kind: 'wall', hw: 14, hh: 34, sill: 4 }] },
      { style: 'living', from: 345.59, to: 406.27, snowIn: 400.4, caps: [null, { kind: 'wall', hw: 13, hh: 32 }] },   // 2 a.m.; out the front door
    ],
    zones: [
      // her street, each time we're out on it, and her house at the end of it
      { from: 0, to: 0.1, kits: ['wxmGables'] },
      { from: -6, to: 20.6, kits: ['wxmStreet'] },
      { from: 71.3, to: 105, kits: ['wxmStreet'] },
      { from: 155.4, to: 189, kits: ['wxmStreet'] },
      { from: 309.1, to: 345.8, kits: ['wxmStreet'] },
      { from: 406.0, to: 437, kits: ['wxmStreet'] },
      { from: -4, to: 19, kits: ['wxmYard'], every: 1.4 },
      { from: 73, to: 103, kits: ['wxmYard'], every: 1.2 },
      { from: 157, to: 187, kits: ['wxmYard'], every: 1.2, kinds: ['snowman', 'santa', 'canes', 'snowman'] },
      { from: 311, to: 344, kits: ['wxmYard'], every: 1.0 },
      { from: 408, to: 436, kits: ['wxmYard'], every: 1.1 },
      // the set-pieces out there
      { from: 0, to: 0.1, kits: ['wxmSet'], at: [
        { t: 82.6, x: -26, kind: 'carolers', s: 3.4 },          // "...and the carol's singing"
        { t: 164.6, x: 27, kind: 'present', s: 2.6, n: 12 },     // "where the presents are wrapped"
        { t: 179.8, x: -27, kind: 'deer', s: 3.0, nose: 178.4 }, // "may your nose..."
        { t: 316.5, x: 26, kind: 'carolers', s: 3.4 },
        { t: 327.0, x: -27, kind: 'present', s: 2.6, n: 12 },
        { t: 336.4, x: 26, kind: 'santa', s: 2.6 },
        { t: 424.0, x: -26, kind: 'carolers', s: 3.4 },
        { t: 431.0, x: 27, kind: 'deer', s: 3.0 },
      ] },
      { from: 172.6, to: 177.6, kits: ['wxmCanes'], every: 0.2, x: 21, s: 4.6 },   // the rail between candy canes
      // what's on her walls between the things he sings about
      { from: 21.6, to: 70.6, kits: ['wxmWalls'], every: 1.6, skip: [[22.6, 24.4], [24.6, 26.2], [27.2, 28.8], [31.8, 33.8], [35.6, 37.6], [41.6, 43.4], [50.2, 52.2], [57.8, 59.8], [66.4, 68.4]] },
      { from: 144.6, to: 155.2, kits: ['wxmWalls'], every: 1.6, skip: [[146.8, 148.6], [150.6, 152.4], [153.6, 155.2]] },
      { from: 220.8, to: 258.4, kits: ['wxmWalls'], every: 1.6, skip: [[224.6, 226.6], [229.6, 231.6], [236.4, 238.2], [240.6, 242.4], [245.6, 247.4], [249.8, 251.6], [254.6, 256.4]] },
      { from: 304.2, to: 309.0, kits: ['wxmWalls'], every: 1.6, skip: [[305.8, 307.8]] },
      { from: 138.6, to: 143.6, kits: ['wxmWalls'], kinds: ['hallTable'], x: 17, every: 1.3 },
      { from: 189.6, to: 219.6, kits: ['wxmWalls'], kinds: ['hallTable'], x: 17, every: 1.7, skip: [[195, 197.4], [200.2, 202.6], [206.8, 209.2]] },
      // her bathroom, verse one
      { from: 0, to: 0.1, kits: ['wxmBath'], at: [
        { t: 23.4, x: 34.6, kind: 'door', wall: true, lock: 22.43 },   // "lock the bathroom door"
        { t: 25.4, x: -35.2, kind: 'fan', wall: true, stop: 24.0 },    // "...and kill the fan"
        { t: 28.0, x: 35.0, kind: 'sweater', wall: true },             // "sweatin' through my Christmas sweater"
        { t: 32.8, x: -30.0, kind: 'vanity', wall: true },             // "grandma's got a mirror"
        { t: 36.6, x: 26, kind: 'altar', s: 0.95 },                    // "perfect little altar"
        { t: 42.5, x: 35.2, kind: 'towels', wall: true },              // "irony isn't lost on me"
        { t: 51.2, x: -27, kind: 'nativity', s: 1.3 },                 // "Baby Jesus"
        { t: 58.8, x: 25, kind: 'girl', s: 0.8 },                      // her, watching already
        { t: 67.4, x: -27, kind: 'toilet', wall: true },               // "wipe the toilet seat and go again"
      ] },
      // the dinner, the first time: everybody's places, and theirs at their lines
      { from: 105.2, to: 137.8, kits: ['wxmPlaces'], every: 0.7, skip: [[108, 110], [111.5, 113.5], [115.5, 117.5], [122.8, 125], [127.2, 129.2], [131, 133], [134.6, 136.8]] },
      { from: 0, to: 0.1, kits: ['wxmTable'], at: [
        { t: 109.2, x: 25, kind: 'cans', from: 104.9, rate: 2, n1: 14, s: 2.4, rows: [5, 4, 3, 2] },   // "Dad's on beer fourteen"
        { t: 112.6, x: -25, kind: 'crown', tint: [0.86, 0.72, 0.18], s: 3.0 },                         // "mom's performing sober like a queen"
        { t: 116.6, x: 25, kind: 'kid', s: 2.8 },                                                       // "brother's kid"
        { t: 116.6, x: 49, kind: 'chair', booster: true },
        { t: 124.0, x: -25, kind: 'ham', s: 2.3 },                                                     // "grandma's ham is dry as her advice"
        { t: 128.3, x: 25, kind: 'granny', s: 3.0 },                                                    // "when I was your age I had a life"
        { t: 128.3, x: 49, kind: 'chair', cardigan: true },
        { t: 132.2, x: -25, kind: 'phone', s: 2.3 },                                                    // "cousins posting photos I got cropped"
        { t: 135.8, x: 25, kind: 'crackers', s: 2.6, pop: 135.0 },                                      // "...something popped"
        { t: 137.6, x: -49, kind: 'chair', napkin: true },                                              // "excuse me"
      ] },
      // the bathroom again, the build
      { from: 0, to: 0.1, kits: ['wxmBath'], at: [
        { t: 147.6, x: -30.0, kind: 'vanity', wall: true },
        { t: 151.4, x: 26, kind: 'girl', s: 0.85 },
        { t: 154.4, x: 34.6, kind: 'towels', wall: true },
      ] },
      // the talk: the hall
      { from: 0, to: 0.1, kits: ['wxmBath'], at: [
        { t: 196.2, x: -15, kind: 'coats', wall: true, s: 1.25 },                // "your father will corner you by the coats"
        { t: 201.4, x: 21.4, kind: 'basement', wall: true },            // "your brother is in the basement"
        { t: 208.0, x: -16, kind: 'purse', wall: true, s: 1.3 },                // "the same smile..."
        // her bathroom, the good lighting, the mirror, the girls
        { t: 225.6, x: -30.0, kind: 'vanity', wall: true },             // "better lighting than your apartment"
        { t: 230.6, x: 35.4, kind: 'mag', wall: true, out: 226.4 },     // "...in her magnifying mirror"
        { t: 237.2, x: 25, kind: 'girl', s: 1.0 },                      // "a Precious Moments figurine of a child praying, watching you"
        { t: 241.4, x: -25, kind: 'girl', s: 1.05 },
        { t: 246.4, x: 24, kind: 'girl', s: 1.15 },                     // "...isn't judging me"
        { t: 250.6, x: -24, kind: 'girl', s: 1.2, nod: 249.3 },         // "she knows"
        { t: 255.4, x: 34.6, kind: 'towels', wall: true },
      ] },
      // dinner again, talking too fast
      { from: 259.4, to: 303.2, kits: ['wxmPlaces'], every: 0.7, skip: [[264.6, 266.8], [269.8, 272], [275.6, 277.6], [280.4, 282.4], [284.4, 286.6], [299.8, 303.4]] },
      { from: 0, to: 0.1, kits: ['wxmTable'], at: [
        { t: 265.8, x: -25, kind: 'clock', s: 2.5, fast: [[262.6, 266.8], [274.4, 278.4]] },   // "talking fast", the eleven-minute toast
        { t: 271.0, x: 25, kind: 'cans', from: 266.6, n0: 14, n1: 21, rate: 2, s: 2.4, rows: [6, 5, 4, 3, 2, 1] },  // "heard my dad"
        { t: 276.6, x: -25, kind: 'flute', s: 2.5, toast: 275.4 },                             // "gave a toast"
        { t: 281.5, x: 25, kind: 'biscuit', s: 2.4 },                                         // "rest in peace, Biscuit"
        { t: 285.6, x: -25, kind: 'granny', s: 3.0 },                                          // "told my grandma she's my favourite person"
        { t: 285.6, x: -49, kind: 'chair', cardigan: true },
        { t: 302.0, x: 25, kind: 'cookies', s: 2.6, eat: 299.6, rate: 2 },                      // "nine cookies..."
        { t: 303.0, x: -25, kind: 'orange', s: 2.6, bite: 301.3 },                             // "...and a decorative orange"
      ] },
      { from: 0, to: 0.1, kits: ['wxmBath'], at: [
        { t: 306.8, x: -30.0, kind: 'vanity', wall: true },
      ] },
      // 2 a.m.
      { from: 0, to: 0.1, kits: ['wxmTable'], at: [{ t: 351.0, x: 25, kind: 'clock', s: 1.7, at: 2.0 }] },   // "it's 2 a.m."
      { from: 0, to: 0.1, kits: ['wxmNight'], at: [
        { t: 356.2, x: 32, kind: 'couch', s: 1.4, rot: Math.PI / 2 },           // "I'm sitting in the living room"
        { t: 362.6, x: -30, kind: 'tree', s: 1.35 },                             // "the tree lights are still on", and his heart
        { t: 369.8, x: 27, kind: 'water', s: 1.7 },                     // "I drank all the water"
        { t: 383.4, x: -33, kind: 'fridge', s: 1.35, open: 378.6, heart: 382.6 },   // "a plate in the fridge... my name on it with a little heart"
        { t: 390.6, x: 24, kind: 'phone', s: 3.4, on: 386.8, off: 390.2 },          // "I should call someone. Not tonight."
        { t: 398.0, x: -30, kind: 'tree', s: 1.35 },
      ] },
    ],
    lyricX: 24,
    lyricBg: '#f0e6d0', lyricColor: '#a8141c', lyricCore: '#8a0e14', lyricFont: 'Georgia, "Times New Roman", serif', lyricWeight: 700,
    lyrics: [
      { t: 21.6, text: 'LOCK THE BATHROOM DOOR\nAND KILL THE FAN', ...IN, side: -1 },
      { t: 71.0, text: "I'M DREAMING OF\nA WHITE CHRISTMAS", ...OUT, side: 1, lead: 2.2 },
      { t: 98.3, text: 'AND MAY ALL YOUR\nCHRISTMASES BE WHITE', ...OUT, side: -1 },
      { t: 106.2, text: "DAD'S ON BEER FOURTEEN\nAND GETTING MEAN", ...TABLEL, side: -1, lead: 1.8 },
      { t: 110.9, text: "MOM'S PERFORMING SOBER\nLIKE A QUEEN", ...TABLEL, side: 1 },
      { t: 122.3, text: "GRANDMA'S HAM IS DRY\nAS HER ADVICE", ...TABLEL, side: 1 },
      { t: 129.9, text: 'COUSINS POSTING PHOTOS\nI GOT CROPPED', ...TABLEL, side: 1 },
      { t: 149.0, text: "THIS IS THE MOST ALIVE\nI'LL EVER FEEL", ...IN, side: -1 },
      { t: 180.3, text: 'MAY YOUR HEART\nKEEP ON BEATING', ...OUT, side: 1 },
      { t: 188.2, text: "THEY DON'T TELL YOU\nABOUT THE HOLIDAYS", part: 'wxmPlaqueIn', x: 9, s: 0.62, h: 12, side: 1, lead: 2.0 },
      { t: 221.0, text: "GRANDMA'S BATHROOM HAS\nBETTER LIGHTING", ...IN, side: 1 },
      { t: 245.0, text: 'THAT LITTLE CERAMIC CHILD\nISN\'T JUDGING ME', ...IN, side: -1 },
      { t: 251.7, text: "WE'RE ALL JUST\nTRYING TO SURVIVE", ...IN, side: 1 },
      { t: 275.6, text: 'GAVE A TOAST THAT\nWENT ELEVEN MINUTES', ...TABLEL, side: 1 },
      { t: 280.0, text: 'REST IN PEACE, BISCUIT', ...TABLEL, side: -1 },
      { t: 293.4, text: 'ARE YOU OKAY?', ...TABLEL, side: 1, lead: 1.6 },
      { t: 336.0, text: 'MAY YOUR SECRET STAY\nINSIDE YOUR CHEST', ...OUT, side: -1 },
      { t: 429.0, text: 'MERRY CHRISTMAS', ...OUT, side: 1, lead: 2.0 },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'wxm', t: 443.6, x: -36, s: 1.3, rot: 0, fireAt: 428.99, orbit: { r: 90, h: 10, y: 22, facing: true, back: 0.8, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 10, heroFov: 46, heroUp: 1.8 } },   // the fridge open in the snow, her plate in its light, the tree beside
  },
};
