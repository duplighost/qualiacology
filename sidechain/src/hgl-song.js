// Hot Girl Lobotomy: its course, its looks, its moments and what stands along the way. (album.js puts
// it in the record; the place itself is in hgl-world.js, its things in hgl-props.js.)
//
// The Lobotomy Bar, a pink chain clinic on a palm street at night with a drill on its roof. In at the
// door with the band: the lobby, the procedure room; out over the city among phones the size of
// towers for the chorus; the recovery wing, the trade-in counter and dinner; the monitor room; a hall
// of feelings in jars for the second chorus; a gallery of empty frames; the red carpet to the end,
// where the treatment chair stands under a ring light.

// the bars, as the drums have them (85.9 bpm; the band in on 5.21; the stops at 19.92, 43.0, 66.81, 90.6):
// 2.40 5.21 8.02 10.82 13.62 16.41 19.22 22.02 24.81 27.61 30.41 33.21 36.01 38.81 41.61 44.42 47.21 50.02
// 52.81 55.61 58.41 61.21 64.01 66.81 69.61 72.42 75.22 78.01 80.81 83.61 86.42 89.21 92.01 94.81 97.61
// 100.41 103.21 106.01

// the clinic's doorways: in off the street, between its rooms, and the walls the choruses burst through
const FRONT = { kind: 'front', hw: 14, hh: 30 };
const DOOR = { kind: 'wall', hw: 12, hh: 26 };
const EXIT = { kind: 'wall', hw: 17, hh: 30 };

const NIGHT = {
  zenith: 0x0a0618, horizon: 0x5a1a4a, skyGlow: 0xff4aa0, glowDir: [0.2, 0.05, 1], skyline: 0x14081c, moonDir: [-0.4, 0.5, 0.75], moon: 0xffd8ec,
  fog: 0x2a0c24, fogDensity: 0.0016, stars: 0.3, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.4,
  ground: 0x1a0c18, street: 0xff6ab8, roof: 0x1a1018, wall: 0x2a1a24, tree: 0x0c140e,
  window: 0xffb8d8, windowAlt: 0x6ae0ff, lamp: 0xff8ac8,
  ribbon: 0x1e0a1c, edge: 0xffe8f4, fret: 0xff3a9a, glow: 0xff4ab0, hold: 0xff3aa0, gate: 0xffffff, gem: 0xfff2f8,
  skyLight: 0xb08ab8, bounce: 0x4a1a3a, hemiK: 1.7, sunK: 0.5,
  board: 0x1a1020, suit: 0x16121c, jacket: 0xff4ab0, hair: 0x1a1210, shoes: 0xf8f0f4, gloves: 0x16121c, rim: 0xffc0e0, daze: 0,
};

export const palettes = {
  hglNight: NIGHT,
  // in at the door: the lobby lit warm and pink
  hglLobby: { fog: 0x3a1a2a, fogDensity: 0.0022, skyLight: 0xffe0ec, bounce: 0x8a4a5a, hemiK: 1.75, glow: 0xff5ab0, hold: 0xff3aa0, fret: 0xffb0d8, edge: 0xffffff, ribbon: 0x2a1020 },
  // the procedure room: white and cold
  hglOR: { fog: 0x1a2a30, fogDensity: 0.0022, skyLight: 0xd8f0ff, bounce: 0x3a5a60, hemiK: 2.1, glow: 0x6ae8ff, hold: 0x4ad8f0, fret: 0xc8f8ff, edge: 0xf0ffff, ribbon: 0x0e1a20 },
  // the stops: the lights cut
  hglDark: { fog: 0x040408, skyLight: 0x2a2a3a, bounce: 0x0a0a10, hemiK: 0.8, glow: 0x8a5aff, hold: 0x7a4aff, fret: 0xb8a0ff },
  // the first chorus, out over the city: hot pink and gold
  hglFeed: { zenith: 0x14042a, horizon: 0x8a1a6a, skyGlow: 0xff3aa8, fog: 0x3a0a32, fogDensity: 0.0011, stars: 0.6, skyLight: 0xe0a0e0, bounce: 0x6a1a4a, hemiK: 2.2, glow: 0xff3ab0, hold: 0xff2aa0, fret: 0xffd84a, edge: 0xffffff, window: 0xff9ad0, windowAlt: 0x7ae8ff },
  // "la la la, lobotomy": violet
  hglLaLa: { horizon: 0x5a1a8a, skyGlow: 0xb05aff, fog: 0x260a3a, skyLight: 0xc8a8f0, bounce: 0x3a1a5a, glow: 0xc06aff, hold: 0xb05aff, fret: 0xff9ae0 },
  // the recovery wing: lilac, low
  hglRecov: { fog: 0x1e1428, fogDensity: 0.0024, skyLight: 0xb8a8d8, bounce: 0x3a2a4a, hemiK: 1.5, glow: 0xb08aff, hold: 0xa07aff, fret: 0xe0d0ff, edge: 0xf4f0ff, ribbon: 0x140e1c },
  // the counter and dinner: mint and pink, bright
  hglDiet: { fog: 0x2a2228, fogDensity: 0.0021, skyLight: 0xfff0f4, bounce: 0x6a5a5a, hemiK: 2.1, glow: 0x6ae8b0, hold: 0x3ad89a, fret: 0xff8ac8, edge: 0xffffff, ribbon: 0x1a1418 },
  // "finally a winner": gold
  hglWinner: { skyLight: 0xfff0d0, bounce: 0x7a5a2a, glow: 0xffc040, hold: 0xffb02a, fret: 0xfff0b0 },
  // the monitor room: green on dark
  hglMonitor: { fog: 0x0a1410, fogDensity: 0.0024, skyLight: 0x9ac8b0, bounce: 0x1a2a20, hemiK: 1.6, glow: 0x5aff8a, hold: 0x3aff7a, fret: 0xb0ffd0, edge: 0xe0fff0, ribbon: 0x08100c },
  // after "brain-dead": the green gone grey
  hglFlat: { skyLight: 0x7a8a84, bounce: 0x141a18, hemiK: 1.2, glow: 0x9ab0a4, hold: 0x8aa094, fret: 0xc8d4ce },
  // the hall of jars: green-gold, the jars' light
  hglArchive: { zenith: 0x020604, horizon: 0x1a2a10, skyGlow: 0x8aff4a, fog: 0x0c1408, fogDensity: 0.0017, stars: 0.4, skyLight: 0xc8e8a0, bounce: 0x2a3a1a, hemiK: 1.9, glow: 0xc8ff5a, hold: 0xb0ff3a, fret: 0xff6ab8, edge: 0xf8fff0, ribbon: 0x0a1008 },
  // "five stars": gold
  hglStars: { skyLight: 0xffe8b0, bounce: 0x5a4a1a, glow: 0xffd040, hold: 0xffc02a, fret: 0xfff0a0 },
  // "la la la" again, and the line: hot pink
  hglLine: { skyGlow: 0xff3a9a, skyLight: 0xf0b0d0, bounce: 0x5a1a3a, glow: 0xff3a9a, hold: 0xff2a8a, fret: 0xffd0e8 },
  // the gallery: white
  hglGallery: { zenith: 0x08080a, horizon: 0x2a2624, fog: 0x2a2624, fogDensity: 0.002, skyLight: 0xfff4e8, bounce: 0x6a5a4a, hemiK: 2.0, glow: 0xffe0b0, hold: 0xffd090, fret: 0xffffff, edge: 0xffffff, ribbon: 0x1a1614 },
  // "empty, empty": the band out
  hglEmpty: { skyLight: 0xb8b0a8, bounce: 0x3a3430, hemiK: 1.4, glow: 0xd8d0c8, hold: 0xc8c0b8 },
  // the red carpet
  hglCarpet: { zenith: 0x020208, horizon: 0x2a0a20, skyGlow: 0xff3a7a, fog: 0x14060e, fogDensity: 0.0015, stars: 0.8, skyLight: 0xf0d0e0, bounce: 0x5a1020, hemiK: 2.1, glow: 0xff2a5a, hold: 0xff1a4a, fret: 0xffd8e0, edge: 0xffffff, ribbon: 0x140408 },
  // "stunning": white
  hglStun: { skyLight: 0xffffff, bounce: 0x7a5a6a, hemiK: 2.4, glow: 0xffffff, hold: 0xffe0f0, fret: 0xffb8d8 },
  // after the last word
  hglEnd: { skyLight: 0xd8b8c8, bounce: 0x3a1a2a, hemiK: 1.7, glow: 0xffb8d8, hold: 0xff9ac8 },
};

export const song = {
  id: 'hot-girl-lobotomy',
  accent: '#ff5ab0',
  title: 'Hot Girl Lobotomy',
  collect: 'pill',
  // (the song list plays it from the pickup into the first chorus: "hot girl lobotomy")
  preview: 21.32,
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 13 },                                                          // "empty, pretty, pretty, empty": the street
    { t: 5.21, kind: 'verse', endY: 12, turn: 0.3 },                                              // "booked a consultation": in at the door
    { t: 16.41, kind: 'pre', endY: 16, turn: 0.3 },                                               // "ice pick to my third eye"; the stop
    { t: 22.02, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, endY: 12, gap: true }, // "hot girl lobotomy, trending now": out over the city
    { t: 33.21, kind: 'chorus', c: 1.3, endY: 13 },                                               // "la la la, lobotomy"
    { t: 41.61, kind: 'break', endY: 12 },                                                        // the bass out: in at the recovery wing
    { t: 47.21, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7, endY: 12, turn: 0.3 },   // "traded my degree for cheekbones"
    { t: 58.41, kind: 'pre', endY: 18, turn: 0.3 },                                               // "frontal lobe, don't know her"; the stop
    { t: 69.61, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 11, endY: 12, gap: true }, // "hot girl lobotomy, five stars": into the hall of jars
    { t: 80.81, kind: 'chorus', c: 1.35, endY: 12 },                                              // "la la la, lobotomy"
    { t: 89.21, kind: 'break', endY: 13 },                                                        // "empty, empty, so pretty": the gallery
    { t: 94.81, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, c: 1.3, endY: 10 },     // "ask me what I'm thinking": the red carpet
    { t: 105.31, kind: 'outro', endY: 6 },                                                        // the last "stunning"
  ],
  rails: [
    { t: 38.81, beats: 4, x: 0 },      // the band alone after "just be pretty"
    { t: 86.42, beats: 4, x: 0 },      // and after the second chorus, along the line
  ],
  palette: 'hglNight',
  world: 'hgl',
  lift: { beams: { colors: [0xff4ab0, 0xffffff, 0x6ae0ff] } },
  titleView: { ahead: -0.14, x: 1.6, h: 1.7, back: -0.9, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'hglNight' },
    { t: 5.3, palette: 'hglLobby', fade: 0.3 },        // in at the door
    { t: 16.5, palette: 'hglOR', fade: 0.4 },          // the procedure room
    { t: 19.95, palette: 'hglDark', fade: 0.06 },      // the stop
    { t: 22.02, palette: 'hglFeed', fade: 0.12 },      // out over the city
    { t: 33.2, palette: 'hglLaLa', fade: 0.3 },        // "la la la"
    { t: 41.7, palette: 'hglRecov', fade: 0.4 },       // the recovery wing
    { t: 47.21, palette: 'hglDiet', fade: 0.2 },       // the counter
    { t: 57.3, palette: 'hglWinner', fade: 0.15 },     // "winner"
    { t: 58.45, palette: 'hglMonitor', fade: 0.3 },    // the monitor room
    { t: 61.8, palette: 'hglFlat', fade: 0.2 },        // "brain-dead"
    { t: 66.85, palette: 'hglDark', fade: 0.08 },      // the stop
    { t: 69.61, palette: 'hglArchive', fade: 0.12 },   // the hall of jars
    { t: 71.5, palette: 'hglStars', fade: 0.12 },      // "five stars"
    { t: 73.2, palette: 'hglArchive', fade: 0.8 },
    { t: 80.8, palette: 'hglLine', fade: 0.3 },        // "la la la"
    { t: 89.3, palette: 'hglGallery', fade: 0.3 },     // the gallery
    { t: 90.6, palette: 'hglEmpty', fade: 0.5 },       // "empty, empty"
    { t: 94.81, palette: 'hglCarpet', fade: 0.12 },    // the red carpet
    { t: 102.25, palette: 'hglStun', fade: 0.1 },      // "stunning"
    { t: 102.8, palette: 'hglCarpet', fade: 0.6 },
    { t: 106.2, palette: 'hglEnd', fade: 1.6 },        // after the last word
  ],
  moments: [
    { t: 3.10, kind: 'impact', k: 0.3 },                            // "drill"
    { t: 4.08, kind: 'impact', k: 0.35 },                           // "drill"
    { t: 5.21, kind: 'flash', k: 0.25 },                            // in at the door with the band
    { t: 8.34, kind: 'pop', k: 0.3, flash: 0.04 },                  // "dumb": LOBOTOMY lights on the menu
    { t: 12.54, kind: 'pop', k: 0.4, flash: 0.05 },                 // "out": the bin's lid
    { t: 17.32, kind: 'knock', n: 1, k: 0.75 },                     // "third": the mallet on the pick
    { t: 17.82, kind: 'glass', k: 0.8 },                            // "eye": the crystal goes
    { t: 19.92, kind: 'blackout', dur: 1.42, k: 0.85 },             // the stop
    { t: 22.02, kind: 'flash', k: 0.35 },                           // out over the city
    { t: 27.34, kind: 'pop', k: 0.5, flash: 0.06 },                 // "wow"
    { t: 32.50, kind: 'ring', k: 0.45, dur: 1.2 },                  // "a pretty little hollow sound"
    { t: 33.34, kind: 'flash', k: 0.3 },                            // "la la la"
    { t: 38.36, kind: 'flash', k: 0.22 },                           // "just be pretty"
    { t: 47.02, kind: 'ring', k: 0.25, dur: 0.5 },                  // "degree"
    { t: 47.21, kind: 'flash', k: 0.2 },
    { t: 52.16, kind: 'glass', k: 0.35 },                           // "smoothie"
    { t: 53.20, kind: 'pop', k: 0.25 },                             // "salad"
    { t: 54.08, kind: 'ring', k: 0.3, dur: 0.9 },                   // "nothing"
    { t: 57.42, kind: 'bell', k: 0.5 },                             // "winner"
    { t: 57.42, kind: 'fireworks', n: 6, y: 40, ahead: 1.2, x: 26 },
    { t: 58.96, kind: 'knock', n: 1, k: 0.45 },                     // "don't know her": CLOSED
    { t: 61.84, kind: 'ring', k: 0.3, dur: 3.0 },                   // "brain-dead": the flat line
    { t: 66.81, kind: 'blackout', dur: 2.1, k: 0.9 },               // the stop
    { t: 69.61, kind: 'flash', k: 0.35 },                           // into the hall of jars
    { t: 71.58, kind: 'pop', k: 0.5, flash: 0.08 },                 // "five stars"
    { t: 74.20, kind: 'glass', k: 0.7 },                            // "jars"
    { t: 75.54, kind: 'pop', k: 0.2 },                              // "hurt"
    { t: 76.26, kind: 'pop', k: 0.2 },                              // "work"
    { t: 76.94, kind: 'pop', k: 0.2 },                              // "care"
    { t: 81.02, kind: 'flash', k: 0.3 },                            // "la la la"
    { t: 94.81, kind: 'flash', k: 0.4 },                            // the red carpet
    { t: 96.80, kind: 'pop', k: 0.45, flash: 0.04 },                // "nothing"
    { t: 97.94, kind: 'pop', k: 0.45, flash: 0.04 },                // "nothing"
    { t: 98.68, kind: 'pop', k: 0.5, flash: 0.05 },                 // "nothing"
    { t: 102.30, kind: 'shutter', k: 0.75 },                        // "stunning"
    { t: 103.62, kind: 'shutter', k: 0.75 },                        // "stunning"
    { t: 104.56, kind: 'shutter', k: 0.8 },                         // "stunning"
    { t: 106.04, kind: 'shutter', k: 0.9 },                         // "stunning"
    { t: 106.04, kind: 'fireworks', n: 8, y: 50, ahead: 1.4, x: 28 },
  ],
  scenery: {
    roads: [{ x: 0, from: -14, to: 5.25, width: 24, walk: 7, lanes: [-7.5, -3, 3, 7.5], density: 0.3, lampEvery: 24 }],
    rooms: [
      { style: 'lobby', from: 5.21, to: 16.41, caps: [FRONT, DOOR] },
      { style: 'or', from: 16.41, to: 22.02, caps: [null, EXIT] },
      { style: 'recovery', from: 41.61, to: 47.21, caps: [FRONT, DOOR] },
      { style: 'diet', from: 47.21, to: 58.41, caps: [null, DOOR] },
      { style: 'monitor', from: 58.41, to: 69.61, caps: [null, EXIT] },
      { style: 'archive', from: 69.61, to: 89.21, caps: [null, DOOR] },
      { style: 'gallery', from: 89.21, to: 94.81, caps: [null, EXIT] },
      { style: 'carpet', from: 94.81, to: 116 },
    ],
    zones: [
      // the street: palms, and the clinic's front with its drill
      { from: -8, to: 5.0, kits: ['hglPalms'], every: 0.5 },
      // the lobby: its columns (dots round the ones you pass on "he drew dots") and its chairs
      { from: 5.7, to: 16.1, kits: ['hglColumns'], every: 1.15, x: 33, dotFrom: 10.6, dotTo: 14.4, dotAt: 10.24 },
      { from: 5.9, to: 16.0, kits: ['hglChairs'], every: 0.46, x: 23, clear: [[6.0, 7.6, 1], [6.6, 8.2, -1], [8.4, 10.0, 1], [12.6, 14.0, -1], [13.6, 15.0, 1], [14.8, 16.2, -1]] },
      // the city under the first chorus: phones the size of towers
      { from: 21.0, to: 42.0, kits: ['hglPhones'], every: 1.15, x0: 115, x1: 330 },
      { from: 36.4, to: 41.2, kits: ['hglSigns'], every: 0.55, x: 25, s: 1.4 },
      // the recovery wing: hood dryers in rows
      { from: 42.0, to: 47.0, kits: ['hglChairs'], every: 0.5, x: 21, rows: true, dryer: true, s: 1.1, clear: [[44.9, 46.3, 1]] },
      // the counter's room: chairs along the walls
      { from: 47.6, to: 58.0, kits: ['hglChairs'], every: 0.55, x: 31, s: 1.1, clear: [[47.6, 49.4, 1], [48.8, 50.4, -1], [50.4, 51.8, 1], [52.2, 53.6, -1], [53.3, 54.7, 1], [54.3, 55.7, -1], [57.2, 58.8, 1]] },
      // the monitor room: the EEGs, LOST on the walls
      { from: 59.2, to: 66.6, kits: ['hglMonitors'], every: 0.62, x: 23 },
      { from: 62.8, to: 68.8, kits: ['hglPosters'], every: 0.42, x: 33.5 },
      // the hall of jars: the specimens along the road, then the line
      { from: 70.8, to: 80.0, kits: ['hglJars'], every: 0.46, x: 24, s: 1.5, jars: 74.20, said: [{ word: 'HURT', at: 76.2, side: -1, on: 75.54 }, { word: 'WORK', at: 76.9, side: 1, on: 76.26 }, { word: 'CARE', at: 77.6, side: -1, on: 76.94 }] },
      { from: 81.6, to: 88.8, kits: ['hglBelts'], every: 0.55, x: 22 },
      // the gallery's empty frames, the left ones lit on the first "empty", the right on the second
      { from: 89.7, to: 94.4, kits: ['hglFrames'], every: 0.9, x: 26, lit: [91.50, 92.50] },
      // the red carpet: the ropes, the press line
      { from: 95.0, to: 115, kits: ['hglRopes'], every: 0.3, x: 14 },
      { from: 95.4, to: 112, kits: ['hglPress'], every: 0.42, x: 20, shots: [99.82, 102.30, 103.62, 104.56, 106.04] },
      { from: 0, to: 0.1, kits: ['hglProps'], at: [
        // the street: the clinic's name over its door, the drill on its roof
        { t: 5.25, x: 0, kind: 'drill', roof: 5.21, y0: 56.4, s: 0.68 },                                       // "drill, baby, drill"
        { t: 5.15, x: 0, kind: 'neon', sign: 'hglLOBO', roof: 5.21, y0: 38.6, s: 1.0, flick: true },
        { t: 5.15, x: 0, kind: 'neon', sign: 'hglWALK', size: 'small', roof: 5.21, y0: 33.0, s: 1.0, cl: [1, 0.96, 0.92] },
        // the lobby
        { t: 6.7, x: 27, kind: 'desk', floor: true, s: 1.1 },                                               // "booked a consultation"
        { t: 7.5, x: -26, kind: 'easel', floor: true, tick: 5.24, s: 1.2 },                                 // EXISTENTIAL DREAD, ticked
        { t: 9.3, x: 25, kind: 'menu', floor: true, on: 8.14, s: 1.3 },                                     // "make me dumb"
        { t: 13.4, x: -26, kind: 'bin', floor: true, open: 12.54, s: 1.3 },                                 // "we'll take the bad parts out"
        { t: 14.4, x: 27, kind: 'gas', floor: true, giggle: 13.30, s: 1.2 },                                // "giggling at nothing"
        { t: 15.6, x: -25, kind: 'rack', floor: true, s: 1.2 },                                             // "that's what hot girls are about"
        // the procedure room
        { t: 17.4, x: -24, kind: 'tchair', floor: true, s: 1.2 },
        { t: 19.4, x: 24, kind: 'pick', floor: true, pick: 16.36, hit: 17.32, go: 17.82, s: 1.1 },         // "ice pick to my third eye"
        // the first chorus, out over the city
        { t: 22.7, x: 0, kind: 'phoneFlat', s: 3.4 },                                                       // under the jump: trending
        { t: 27.5, x: 30, kind: 'melon', melon: 25.94, baller: 26.56, wow: 27.34, s: 1.5 },                 // "with a melon baller, wow"
        { t: 30.2, x: -36, kind: 'pool', s: 1.3 },                                                          // "used to drown"
        { t: 33.0, x: 32, kind: 'musicbox', ring: 32.50, s: 1.6 },                                          // "a pretty little hollow sound"
        { t: 39.1, x: -30, kind: 'vanity', pretty: 38.36, s: 1.6 },                                         // "just be pretty"
        // the recovery wing
        { t: 41.57, x: 0, kind: 'neon', sign: 'hglRECOV', roof: 41.61, y0: 38.6, s: 1.0 },
        { t: 45.6, x: 30, kind: 'vacancy', floor: true, y: 15, s: 1.3 },
        // the counter and dinner
        { t: 48.6, x: 26, kind: 'counter', floor: true, degree: 47.02, fillers: 48.88, s: 1.6 },            // "traded my degree ... for fillers"
        { t: 49.7, x: -25, kind: 'shredder', floor: true, philo: 48.12, s: 1.55 },                           // "philosophy"
        { t: 51.3, x: 25, kind: 'scale', floor: true, count: 50.36, s: 1.6 },                               // "now I count my calories"
        { t: 52.95, x: -23, kind: 'plate', floor: true, v: 0, on: 52.16, s: 1.75 },                           // "smoothie for breakfast"
        { t: 54.0, x: 23, kind: 'plate', floor: true, v: 1, on: 53.20, s: 1.75 },                            // "salad for lunch"
        { t: 55.0, x: -23, kind: 'plate', floor: true, v: 2, on: 54.08, s: 1.75 },                           // "nothing for dinner"
        { t: 58.0, x: 25, kind: 'tiara', floor: true, win: 57.42, s: 1.9 },                                 // "I'm finally a winner"
        // the monitor room
        { t: 59.8, x: 25, kind: 'lobe', floor: true, closed: 58.96, s: 1.2 },                               // "frontal lobe, don't know her"
        // the hall of jars
        { t: 72.4, x: 0, kind: 'stars', five: 71.42, stars: 71.58, above: 19, s: 1.0 },                      // "five stars"
        // the red carpet: nothing, nothing, nothing
        { t: 97.4, x: -9, kind: 'bubble', on: 95.9, pop: 96.80, above: 15, s: 1.2 },
        { t: 98.6, x: 10, kind: 'bubble', on: 96.95, pop: 97.94, above: 16, s: 1.3 },
        { t: 99.4, x: -2, kind: 'bubble', on: 98.05, pop: 98.68, above: 17, s: 1.5 },
      ] },
    ],
    signs: [
      { key: 'hglLOBO', text: 'LOBOTOMY BAR', color: '#ff2a8a', core: '#fff0f8', bg: '#1a0812', faceAspect: 40 / 8.4 },
      { key: 'hglWALK', text: 'WALK-INS WELCOME', color: '#ffffff', core: '#ffffff', bg: '#1a0812', faceAspect: 5 },
      { key: 'hglRECOV', text: 'RECOVERY', color: '#c8a8ff', core: '#f8f0ff', bg: '#140a1a', faceAspect: 40 / 8.4 },
      { key: 'hglCONSULT', text: 'CONSULTATIONS', color: '#e8b84a', core: '#fff4dc', bg: '#1a1014', faceAspect: 4 },
      { key: 'hglBAD', text: 'BAD PARTS', color: '#ffffff', core: '#ffffff', bg: '#a01828', faceAspect: 3.6 / 1.4 },
      { key: 'hglGAS', text: 'LAUGHING GAS', color: '#ffffff', core: '#ffffff', bg: '#2a6ad8', faceAspect: 4 },
      { key: 'hglEYE', text: 'THIRD EYE', color: '#e8d0ff', core: '#ffffff', bg: '#2a1440', faceAspect: 6.6 / 1.7 },
      { key: 'hglVAC', text: 'VACANCY', color: '#ff3a4a', core: '#fff0f0', bg: '#0e0608', faceAspect: 4 },
      { key: 'hglBUY', text: 'WE BUY DEGREES', color: '#ffd84a', core: '#fffbe8', bg: '#120e08', faceAspect: 17 / 4.4 },
      { key: 'hglLOBE', text: 'FRONTAL LOBE  ▸', color: '#ffffff', core: '#ffffff', bg: '#1a4a9a', faceAspect: 12 / 3.6 },
      { key: 'hglCLOSED', text: 'CLOSED', color: '#ffffff', core: '#ffffff', bg: '#c81a2a', faceAspect: 12 / 3.6 },
    ],
    // the boards carry only lines both hearings agree on ("booked" or not, "a" or "the" melon baller,
    // "formaldehyde", "factory reset to pretty" and the lines round "vacancy" came out two ways)
    lyricPart: 'hglBoard', lyricX: 0, lyricBg: '#fff2f8', lyricColor: '#ff2a8a', lyricCore: '#cc0a5c',
    lyrics: [
      { t: 0.0, text: 'EMPTY, PRETTY,\nPRETTY, EMPTY', h: 16, lead: 2.6, x: 30 },
      { t: 7.28, text: 'DOCTOR,\nMAKE ME DUMB', h: 11 },
      { t: 14.22, text: "THAT'S WHAT\nHOT GIRLS ARE ABOUT", h: 11 },
      { t: 18.76, text: "NOW I'M\nTOO CUTE TO CRY", h: 11 },
      { t: 24.52, text: 'SCOOP MY\nBRAIN OUT', h: 14 },
      { t: 29.94, text: "NOW I'M JUST A PRETTY\nLITTLE HOLLOW SOUND", h: 14 },
      { t: 33.34, text: 'LA LA LA,\nLOBOTOMY', h: 15 },
      { t: 36.30, text: 'NO MORE THINKING,\nJUST BE PRETTY', h: 14 },
      { t: 46.30, text: 'TRADED MY DEGREE FOR CHEEKBONES,\nPHILOSOPHY FOR FILLERS', h: 11, lead: 1.6 },
      { t: 54.92, text: "LOOK AT ME,\nI'M FINALLY A WINNER", h: 11 },
      { t: 61.48, text: 'SO BRAIN-DEAD\nGORGEOUS', h: 11 },
      { t: 69.22, text: 'HOT GIRL LOBOTOMY,\nFIVE STARS', h: 14, lead: 1.0 },
      { t: 77.26, text: "NOW I'M JUST PRETTY WITH\nTHAT THOUSAND-YARD STARE", h: 14 },
      { t: 91.50, text: 'EMPTY, EMPTY,\nSO PRETTY', h: 11 },
      { t: 94.28, text: "ASK ME\nWHAT I'M THINKING", h: 13, lead: 1.8 },
      { t: 99.82, text: 'PERFECT AND\nUNBLINKING', h: 13 },
      { t: 102.30, text: 'STUNNING, STUNNING,\nSTUNNING', h: 13, keep: true },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'hgl', t: 109.6, x: -24, s: 1.4, rot: -2.2, fireAt: 105.3, orbit: { r: 60, h: 10, y: 10, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 46, heroUp: 1.9 } },
  },
};
