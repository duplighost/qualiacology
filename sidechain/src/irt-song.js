// I Remember Them Too: its course, its looks, its moments and what stands along the way. (album.js
// puts it in the record; the place itself is in irt-world.js.)

// the hall's doorways between its rooms
const IDOOR = { kind: 'wall', hw: 13, hh: 26 };
// her lines go up on the felt letter board: white letters, no neon round them
const L = (t, text, o = {}) => ({ t, text, h: 15, frame: 'rgba(0,0,0,0)', ...o });

export const palettes = {
  // a wet street at night; the hall's fluorescent corridor, its meeting room, the big hall with the
  // court on its floor, the small room's lamps; the corridor when they leave; the rain; the warm room
  // for the new ones; the dark but for one chair; the field under the stars; the night going on.
  // (irtPanel: how lit the ceiling panels are; irtWarm: how warm the full chairs glow. irt-world.js
  // blends them between the looks.)
  irtNight: {
    zenith: 0x05070e, horizon: 0x1a2236, skyGlow: 0x3a4a6a, glowDir: [0.2, 0.06, 1], skyline: 0x0a0c14, moonDir: [-0.4, 0.5, 0.75], moon: 0xc8d4e8,
    fog: 0x111824, fogDensity: 0.0019, stars: 0.1, sunSize: 0, snow: 0, snowGround: 0, rain: 0.55, windowK: 1.5,
    ground: 0x14181e, street: 0xffc890, roof: 0x22202a, wall: 0x3a3844, tree: 0x0e1210,
    window: 0xffc890, windowAlt: 0xffe0b0, lamp: 0xffc890,
    ribbon: 0x16141a, edge: 0xfff0f6, fret: 0xff9ad0, glow: 0xff8ac0, hold: 0xff7ab8, gate: 0xffffff, gem: 0xffd0e4,
    skyLight: 0x7a88a8, bounce: 0x2a2630, hemiK: 1.7, sunK: 0.5,
    board: 0x16141a, suit: 0x1a1a22, jacket: 0x3a4a6a, hair: 0x2a1a12, shoes: 0xe8e4f0, gloves: 0x1a1a22, rim: 0xffd0e4, daze: 0,
    irtPanel: 1, irtWarm: 1,
  },
  irtCorr: { fog: 0x1a201c, fogDensity: 0.0024, rain: 0, skyLight: 0xe0f0e4, bounce: 0x4a5048, hemiK: 1.55, irtPanel: 1 },
  irtMeet: { fog: 0x22241e, fogDensity: 0.0022, rain: 0, skyLight: 0xf0f4e8, bounce: 0x5a5448, hemiK: 1.65, irtPanel: 1 },
  irtBig: { fog: 0x2a2018, fogDensity: 0.0018, rain: 0, skyLight: 0xffe8c8, bounce: 0x6a4a34, hemiK: 1.85, irtPanel: 1, irtWarm: 1.1 },
  irtSmall: { fog: 0x2a1e18, fogDensity: 0.0024, rain: 0, skyLight: 0xffd8b0, bounce: 0x6a4a3a, hemiK: 1.6, irtPanel: 0.35, irtWarm: 1.1 },
  irtLeave: { fog: 0x141814, fogDensity: 0.0026, rain: 0, skyLight: 0xa8b8b0, bounce: 0x2a302a, hemiK: 1.25, irtPanel: 0.55, irtWarm: 0.7 },
  irtRain: { rain: 0.85, fog: 0x101622, fogDensity: 0.0021, skyLight: 0x6a7898, hemiK: 1.6, irtPanel: 1, irtWarm: 1 },
  irtNew: { fog: 0x2a2620, fogDensity: 0.0021, rain: 0, skyLight: 0xfff0d8, bounce: 0x6a5a48, hemiK: 1.8, irtPanel: 1.1, irtWarm: 1.2 },
  irtAlone: { fog: 0x06070a, fogDensity: 0.003, rain: 0, skyLight: 0x3a4250, bounce: 0x101214, hemiK: 0.9, irtPanel: 0.04, irtWarm: 0.25 },
  irtField: { zenith: 0x040612, horizon: 0x2a2440, skyGlow: 0xff9a6a, glowDir: [0.1, 0.04, 1], stars: 1, rain: 0, fog: 0x14121e, fogDensity: 0.0011, skyLight: 0x8a88b0, bounce: 0x3a2a26, hemiK: 1.7, irtWarm: 1.25, irtPanel: 0 },
  irtLate: { rain: 0, zenith: 0x040612, horizon: 0x1a1a30, skyGlow: 0x6a5a8a, stars: 1, fog: 0x0c0c16, fogDensity: 0.0014, skyLight: 0x7a7aa0, bounce: 0x2a2228, hemiK: 1.45, irtWarm: 0.9, irtPanel: 0 },
  irtEnd: { rain: 0, zenith: 0x03040c, horizon: 0x101020, skyGlow: 0x3a3a5a, stars: 1, fog: 0x08080e, fogDensity: 0.0016, skyLight: 0x6a6a90, bounce: 0x1a1820, hemiK: 1.3, irtWarm: 0.6, irtPanel: 0 },
};

export const song = {
  // the hall where the group meets, and she's the one who keeps it. A wet street at night, every front
  // room lighting up ahead of her; the band, and in at the hall's door: the corridor, the coats going up
  // on their hooks as people come in; the meeting room, the chairs facing each other, the urn, their
  // chair with the scarf over it, the flip chart where the last name stops halfway. The chorus in the big
  // hall: the chairs fill as she comes, if she keeps the beat, and empty behind her. The small room, a
  // box of tissues on every seat, someone in their spot just as bright, the doors propped open on chairs;
  // the door cracked, the meeting room again; the corridor where the coats leave their hooks; out into
  // the rain for the second chorus; back in to tell the new ones how it began; the lights going out but
  // for their chair; the walls come down and the chairs go on into the night, every one full; they go
  // dark one by one on "but I will", and she stops by a ring of chairs under one bulb.
  id: 'i-remember-them-too',
  accent: '#ff9ad0',
  title: 'I Remember Them Too',
  startY: 14,
  sections: [
    { t: 0.0, kind: 'intro', endY: 14 },                                                         // the street, the rain, the piano on its own
    { t: 16.68, kind: 'pre', endY: 20 },                                                          // the band gathering
    { t: 18.63, kind: 'post', start: 'launch', kick: 8, endY: 11 },                               // the band: down the street
    { t: 34.34, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                                    // in at the hall's door: the coats go up on their hooks
    { t: 48.08, kind: 'pre', c: 0.9, endY: 13, turn: 0.3 },                                       // the band building
    { t: 55.93, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                     // the meeting room: "you left so slow"
    { t: 75.55, kind: 'pre', endY: 19, turn: 0.3 },                                               // "a fossil in the throat"
    { t: 77.50, kind: 'chorus', c: 1.15, start: 'launch', kick: 9, endY: 11 },                             // the big hall: "I remember them too"
    { t: 108.70, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                                    // the small room: "someone who is in your spot"
    { t: 124.29, kind: 'pre', endY: 19, turn: 0.3 },                                              // "can't use the wall"
    { t: 126.25, kind: 'post', start: 'launch', kick: 8, endY: 11, turn: 0.3 },                   // "so I crack the door, I stay"
    { t: 137.94, kind: 'break', endY: 15, turn: 0.3 },                                            // the corridor: "the ones who stayed long enough to feel it"
    { t: 149.61, kind: 'pre', endY: 21 },                                                         // the band back
    { t: 151.56, kind: 'chorus', c: 1.15, start: 'launch', kick: 10, endY: 11 },                           // out the door into the rain: "I remember them too"
    { t: 182.60, kind: 'post', c: 1.0, endY: 12, turn: 0.3 },                                     // back in: "tell the new ones how it all began"
    { t: 207.77, kind: 'break', endY: 15, turn: 0.3 },                                            // "I'd rather be lonely with the memories": the lights going
    { t: 215.51, kind: 'pre', endY: 22 },                                                         // the stop
    { t: 217.45, kind: 'final', c: 1.2, start: 'launch', kick: 11, endY: 10, gap: true },                 // the walls come down: "the room is always full"
    { t: 240.67, kind: 'final', c: 1.25, endY: 11 },                                              // the band on its own: the field of chairs
    { t: 256.15, kind: 'chorus', c: 1.1, endY: 11 },                                              // "I don't want to always be the one who stays"
    { t: 263.85, kind: 'outro', endY: 6 },                                                        // "but I will"
  ],
  rails: [
    { t: 26.49, bars: 2, x: 0 },        // the band, down the wet street
    { t: 240.67, bars: 2, x: 0 },       // the band on its own, out through the chairs
    { t: 248.40, bars: 2, x: 0 },
  ],
  palette: 'irtNight',
  world: 'irt',
  collect: 'polaroid',
  titleView: { ahead: -0.18, x: 1.8, h: 2.0, back: -1.0, lookH: 3.0 },   // behind her, up the wet street to the hall
  looks: [
    { t: -99, palette: 'irtNight' },
    { t: 34.34, palette: 'irtCorr', fade: 0.35 },       // in at the door
    { t: 55.93, palette: 'irtMeet', fade: 0.4 },
    { t: 77.50, palette: 'irtBig', fade: 0.3 },
    { t: 108.70, palette: 'irtSmall', fade: 0.4 },
    { t: 126.25, palette: 'irtMeet', fade: 0.35 },
    { t: 137.94, palette: 'irtLeave', fade: 0.8 },      // "the ones who stayed"
    { t: 151.56, palette: 'irtRain', fade: 0.3 },       // out in the rain
    { t: 182.60, palette: 'irtNew', fade: 0.35 },       // the new ones
    { t: 210.6, palette: 'irtAlone', fade: 2.6 },       // "I'd rather be lonely with the memories"
    { t: 217.45, palette: 'irtField', fade: 0.4 },      // the walls come down
    { t: 258.0, palette: 'irtLate', fade: 4 },
    { t: 270.0, palette: 'irtEnd', fade: 6 },
  ],
  moments: [
    { t: 18.63, kind: 'flash', k: 0.16 },              // the band
    { t: 77.50, kind: 'flash', k: 0.22 },              // the chorus
    { t: 145.18, kind: 'knock', n: 1, k: 0.4 },        // "leave"
    { t: 148.54, kind: 'knock', n: 1, k: 0.3 },        // "leave"
    { t: 151.56, kind: 'flash', k: 0.2 },              // out into the rain
    { t: 217.45, kind: 'flash', k: 0.42 },             // the walls come down
    { t: 263.16, kind: 'ring', k: 0.3, dur: 1.4 },     // "but I will"
  ],
  scenery: {
    rooms: [
      { style: 'corridor', from: 34.34, to: 55.93, caps: [{ kind: 'front', hw: 12, hh: 24 }, null] },        // in at the hall's front door
      { style: 'meeting', from: 55.93, to: 77.50, caps: [IDOOR, null] },
      { style: 'big', from: 77.50, to: 108.70, caps: [IDOOR, IDOOR] },
      { style: 'small', from: 108.70, to: 126.25, caps: [null, null] },
      { style: 'meeting', from: 126.25, to: 137.94, caps: [IDOOR, IDOOR] },                                 // "so I crack the door"
      { style: 'corridor', from: 137.94, to: 151.56, caps: [null, { kind: 'wall', hw: 12, hh: 24 }] },      // out the side door
      { style: 'meeting', from: 182.60, to: 217.45, caps: [{ kind: 'front', hw: 12, hh: 24 }, IDOOR], fallAt: 217.3, fallFor: 1.8 },   // the walls come down
    ],
    zones: [
      { from: -6, to: 34.4, kits: ['irtStreet'] },                     // the street on a wet night
      { from: 151.5, to: 182.7, kits: ['irtStreet'] },                 // out in the rain
      // the chairs, facing each other across each room; they fill as she comes, if she keeps the beat
      { from: 56.6, to: 77.4, kits: ['irtChairs'], rows: [27], every: 0.85, floor: true, spots: [{ t: 66.6, side: -1 }] },                       // "you left so slow": their chair
      { from: 78.2, to: 108.6, kits: ['irtChairs'], rows: [28, 39], every: 0.6, floor: true, s: 1.05, spots: [{ t: 98.0, side: 1 }] },
      { from: 109.3, to: 126.1, kits: ['irtChairs'], rows: [23], every: 0.7, floor: true, tissue: 0.85, spots: [{ t: 115.6, side: -1, bright: 112.4 }] },   // "someone who is in your spot, just as bright"
      { from: 126.7, to: 137.8, kits: ['irtChairs'], rows: [27], every: 0.6, floor: true },
      { from: 183.1, to: 208.6, kits: ['irtChairs'], rows: [27], every: 0.65, floor: true },
      { from: 209.0, to: 217.3, kits: ['irtChairs'], rows: [27], every: 1.0, floor: true, mode: 'dark', spots: [{ t: 215.8, side: -1, cold: 2.2 }] },   // only their chair, in the dark
      { from: 217.6, to: 270, kits: ['irtField'], rows: [30, 44, 62], every: 0.5, on: 217.45, off: 263.8, offSpread: 7 },   // the room is always full; on "but I will" they go
      // the coat hooks: filling as people come in; emptying as they leave
      { from: 0, to: 0.1, kits: ['irtRacks'], at: [
        { t: 38.4, x: 23.4, come: [36.2, 36.7, 37.2, 37.6, 38.0, 38.5, 38.9, 39.3] },
        { t: 43.2, x: -23.4, come: [41.0, 41.5, 41.9, 42.4, 42.8, 43.3, 43.7, 44.2], empty: [5] },
        { t: 48.4, x: 23.4, come: [46.2, 46.6, 47.1, 47.6, 48.1, 48.6, 49.0, 49.5] },
        { t: 143.0, x: -23.4, leave: [139.6, 140.0, 140.5, 140.9, 141.4, 141.8, 142.2, 142.6] },             // "the ones who stayed long enough to feel it"
        { t: 148.2, x: 23.4, leave: [145.2, 145.6, 146.0, 146.5, 146.9, 147.3, 147.7, 148.1] },              // "leave for the same reason"
      ] },
      { from: 0, to: 0.1, kits: ['irtProps'], at: [
        { t: 61.2, x: 31, kind: 'urn', s: 1.1, floor: true },
        { t: 73.4, x: -31, kind: 'flip', s: 1.05, floor: true },                                        // "your name's still where it stopped"
        { t: 104.0, x: 41, kind: 'stack', s: 1.1, floor: true },
        { t: 123.2, x: 27, kind: 'door', s: 1.2, open: 1.25, wedge: true, floor: true },                // "the one who holds the door"
        { t: 124.6, x: -27, kind: 'door', s: 1.2, open: 1.3, wedge: true, floor: true },
        { t: 129.6, x: -31, kind: 'door', s: 1.25, open: 0.5, crack: true, floor: true },                           // "so I crack the door"
        { t: 146.8, x: -17, kind: 'stack', s: 1.0, floor: true },                                        // the night over
        { t: 187.2, x: 33, kind: 'board', s: 1.1, y: 18, face: false, floor: true },                    // "tell the new ones how it all began"
        { t: 193.6, x: -33, kind: 'board', s: 1.1, y: 18, face: false, floor: true },
        { t: 196.4, x: 31, kind: 'urn', s: 1.1, floor: true },
        { t: 205.4, x: -31, kind: 'flip', s: 1.05, floor: true },                                       // "why there's no one else to remember"
      ] },
    ],
    lyricPart: 'irtSign', lyricX: 0, lyricBg: '#161618', lyricColor: '#f2efe8', lyricCore: '#ffffff', lyricFont: '"Helvetica Neue", Helvetica, Arial, sans-serif', lyricWeight: 700,
    lyrics: [
      L(63.56, 'YOU LEFT SO SLOW'),
      L(74.14, 'A FOSSIL\nIN THE THROAT'),
      L(79.62, 'I REMEMBER THEM TOO', { h: 16 }),
      L(86.76, 'EVERY ROOM FILLS UP\nAND EMPTIES OUT THE SAME'),
      L(116.92, "THAT'S THE KNIFE"),
      L(118.78, 'I BUILT A ROOM WHERE\nANYONE CAN FALL APART'),
      L(122.52, 'THE ONE WHO HOLDS THE DOOR\nCAN\'T USE THE WALL'),
      L(130.26, 'NOBODY KNOWS THE HOST\nIS THE ONE MOST AFRAID'),
      L(145.18, 'LEAVE FOR\nTHE SAME REASON'),
      L(184.0, 'TELL THE NEW ONES\nHOW IT ALL BEGAN'),
      L(188.42, "LIKE IT'S A STORY,\nNOT A SCAR"),
      L(207.12, "I'D RATHER BE LONELY\nWITH THE MEMORIES"),
      L(221.10, 'THE ROOM IS\nALWAYS FULL', { h: 17 }),
      L(256.32, "I DON'T WANT TO ALWAYS\nBE THE ONE WHO STAYS"),
      L(262.24, 'BUT I WILL', { lead: 1.0 }),
    ],
    shelf: 60, drop: 5,
    finale: { kind: 'irt', t: 277.6, x: -54, s: 1.1, r: 16, n: 9, rot: 0, orbit: { r: 110, h: 12, y: 14, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.28, heroBack: 10, heroFov: 46, heroUp: 1.8 } },   // a ring of chairs under one bulb
  },
};
