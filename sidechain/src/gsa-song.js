// Grocery Store at 2 AM: its course, its looks, its moments and what stands along the way. (album.js
// puts it in the record; the place itself is in gsa-world.js, its things in gsa-props.js.)
//
// A 24-hour supermarket at two in the morning. In from the lot through the sliding doors; the frozen
// aisle, aisle three, the shelves turning their backs; the choruses lit warm; the checkouts; the
// seasonal aisle; the bridge in black and white but for the produce; the night lights; out through
// the exit into the cold lot, a plastic bag going up; the songwriter's notes on the lot's letterboards
// under the store's ceiling, floating over the lot without the store; the store alone at the end.

// the bars, as the drums have them (143.0 bpm; the voice in on 12.73, the band on 14.41; the bass out
// 185.63-197.41; the doors out on 225.88; the quiet 246.04-262.80, then the notes over the band):
// 14.41 21.13 27.86 34.62 41.28 47.99 54.67 61.42 68.13 74.84 81.56 88.26 94.97 101.68 108.39 115.11
// 121.82 128.53 135.25 141.96 148.68 155.39 162.10 168.81 175.53 182.24 188.95 195.74 202.40 209.09
// 215.81 222.52 229.24 235.95 242.67 249.38 256.10 262.80 269.51 276.23 282.93 289.65 (every 4 bars)

// the store's way in from the lot (its front), the openings between its halls, the way out
const FRONT = { kind: 'front', hw: 14, hh: 23 };
const NARROW = { kind: 'wall', hw: 17, hh: 24 };
const EXIT = { kind: 'wall', hw: 14, hh: 23 };

const LOT = {
  zenith: 0x02040c, horizon: 0x161e2e, skyGlow: 0xff8a3a, glowDir: [0.3, 0.04, 1], skyline: 0x0a0c14, moonDir: [-0.4, 0.45, 0.75], moon: 0xb8c8e8,
  fog: 0x0c1018, fogDensity: 0.0015, stars: 0.5, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.0,
  ground: 0x0a0b0e, street: 0xffa040, roof: 0x14161c, wall: 0x2a2a30, tree: 0x0a120c,
  window: 0xd8ffe8, windowAlt: 0xffc080, lamp: 0xffa040,
  ribbon: 0x101418, edge: 0xeaffd8, fret: 0xd8f26a, glow: 0xc8ee50, hold: 0xd4f048, gate: 0xffffff, gem: 0xfff8e8,
  skyLight: 0x7a8aa8, bounce: 0x3a2a1a, hemiK: 1.5, sunK: 0.5,
  board: 0x1a1c22, suit: 0x16181c, jacket: 0xd4f048, hair: 0x1a1410, shoes: 0xf0f0ea, gloves: 0x16181c, rim: 0xe8ffd0, daze: 0,
};

export const palettes = {
  gsaLot: LOT,
  // inside, half the lights off for the night: cold, a little green
  gsaStore: { fog: 0x26302c, fogDensity: 0.0017, skyLight: 0xd8f0e2, bounce: 0x46564c, hemiK: 1.8, glow: 0xc8ee50, hold: 0xd4f048, fret: 0xf0ffd0, edge: 0xffffff, ribbon: 0x141a18, skyGlow: 0xd8f0e2 },
  // the frozen aisle: ice
  gsaFrozen: { fog: 0x1e2c36, fogDensity: 0.0019, skyLight: 0xd0e6ff, bounce: 0x34485e, hemiK: 1.9, glow: 0x8ad8ff, hold: 0x7ad4ff, fret: 0xe0f6ff, edge: 0xffffff, ribbon: 0x101820 },
  // "we learn to look away": dimmer, greyer
  gsaAway: { fog: 0x1a201e, fogDensity: 0.0019, skyLight: 0xa8b8ae, bounce: 0x2c3430, hemiK: 1.5, glow: 0xa8bc88, hold: 0xc4d468, fret: 0xd0dcc4, edge: 0xe8f0e0, ribbon: 0x101412 },
  // "but I see you": every light up, warm
  gsaSee: { fog: 0x3a2c20, fogDensity: 0.0013, skyLight: 0xfff0d8, bounce: 0x7a5a38, hemiK: 2.25, glow: 0xffc45a, hold: 0xffb43a, fret: 0xfff0c0, edge: 0xffffff, ribbon: 0x1c140c, skyGlow: 0xffc070 },
  // the checkouts: lane lights, red
  gsaLanes: { fog: 0x281e22, fogDensity: 0.0016, skyLight: 0xf0e2e2, bounce: 0x5a3a3a, hemiK: 1.9, glow: 0xff6a58, hold: 0xff7a5a, fret: 0xffe0d8, edge: 0xffffff, ribbon: 0x1a1012 },
  // the seasonal aisle: pumpkins
  gsaSeason: { fog: 0x2a1a10, fogDensity: 0.0017, skyLight: 0xffd8b0, bounce: 0x6a3a1a, hemiK: 1.9, glow: 0xff8a2a, hold: 0xff9a3a, fret: 0xffe0b0, edge: 0xffffff, ribbon: 0x1a1008 },
  // "maybe God is just a night manager": black and white
  gsaGod: { fog: 0x1e2022, fogDensity: 0.0016, skyLight: 0xd8dce0, bounce: 0x404448, hemiK: 1.9, glow: 0xe4e8ec, hold: 0xf0f4f8, fret: 0xffffff, edge: 0xffffff, ribbon: 0x16181a, skyGlow: 0xd8dce0 },
  // "maybe love is just standing in the same hollow glow": the colour coming back, warm
  gsaLove: { fog: 0x2e2420, fogDensity: 0.0015, skyLight: 0xffe8dc, bounce: 0x6a4a40, hemiK: 2.0, glow: 0xffb48a, hold: 0xffa070, fret: 0xffe4d4, edge: 0xffffff, ribbon: 0x1a1210 },
  // the bass out: the night lights, the domes' red
  gsaDark: { fog: 0x0c1012, fogDensity: 0.0021, skyLight: 0x6a7880, bounce: 0x1a2024, hemiK: 1.15, glow: 0xff4a3a, hold: 0xff5a48, fret: 0xffd0c8, edge: 0xffe8e4, ribbon: 0x0c0a0a },
  // "I see you": everything
  gsaFinal: { fog: 0x342e26, fogDensity: 0.0013, skyLight: 0xfff6e8, bounce: 0x6a5a40, hemiK: 2.35, glow: 0xffe080, hold: 0xd8f24a, fret: 0xffffff, edge: 0xffffff, ribbon: 0x18160e, skyGlow: 0xffe8b0 },
  // out the doors: the cold, the lot
  gsaCold: { fog: 0x101824, fogDensity: 0.0013, stars: 0.8, skyLight: 0x8aa0c8, bounce: 0x2a3040, hemiK: 1.5, glow: 0x9ad0ff, hold: 0x8ad0ff, fret: 0xe0f4ff, edge: 0xf0f8ff, ribbon: 0x0c121a },
  // "another night": the lot, quiet, sodium
  gsaNight: { fog: 0x080c14, fogDensity: 0.0012, stars: 1.0, skyLight: 0x5a6a88, bounce: 0x2a1c10, hemiK: 1.25, glow: 0xffa040, hold: 0xffb04a, fret: 0xffe8c8, edge: 0xfff0dc, ribbon: 0x0c0c10 },
  // the notes over the band: the hum, the store's own green-white
  gsaHymn: { fog: 0x0a0e0c, fogDensity: 0.0011, stars: 0.9, skyGlow: 0x46603a, skyLight: 0x8aa890, bounce: 0x2a3020, hemiK: 1.6, glow: 0xd4f25e, hold: 0xd8f24a, fret: 0xf4ffd8, edge: 0xffffff, ribbon: 0x0c100c },
  // after the last of it
  gsaEnd: { skyLight: 0x6a7a80, bounce: 0x1a1c18, hemiK: 1.3, glow: 0xc8e070, hold: 0xc8e060 },
};

// lines on the lot's letterboards: lit white, black letters
const BOARD = { part: 'gsaLetter', bg: '#b4b4ac', color: '#121212', core: '#000000', frame: 'rgba(0,0,0,0)' };

export const song = {
  id: 'grocery-store-at-2-am',
  accent: '#d4f048',
  title: 'Grocery Store at 2 AM',
  collect: 'can',
  // (the song list plays it from "but I see you")
  preview: 53.02,
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 8 },                                                                     // the lot, the store ahead
    { t: 14.41, kind: 'verse', endY: 7.5, turn: 0.25 },                                                        // "the ceiling hums": in at the doors
    { t: 41.28, kind: 'pre', endY: 20, turn: 0.2 },                                                          // "we learn to look away"
    { t: 54.67, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 12, gap: true, turn: 0.5 }, // "but I see you": over the chest freezer
    { t: 68.13, kind: 'chorus', c: 1.3, endY: 13, turn: 0.5 },                                               // "I see you, with your card half empty"
    { t: 86.57, kind: 'verse', start: 'launch', launchBeats: 3, kick: 10, endY: 12, turn: 0.3 },              // "the checkout girl": the checkouts
    { t: 113.43, kind: 'pre', endY: 20, turn: 0.25 },                                                        // "we fill our arms with objects"
    { t: 128.53, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 12, gap: true, turn: 0.5 },// chorus two
    { t: 141.96, kind: 'chorus', c: 1.35, endY: 13, turn: 0.5 },                                             // "with your card half empty, heart half full"
    { t: 155.39, kind: 'bridge', endY: 20, turn: 0.4 },                                                      // "maybe God is just a night manager": black and white
    { t: 168.81, kind: 'bridge', endY: 15, turn: 0.35 },                                                     // "maybe love is just standing in the same hollow glow"
    { t: 185.63, kind: 'break', endY: 13 },                                                                  // the bass out: "yeah, I really see you"
    { t: 197.41, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 11 },                       // "I see you, I see you"
    { t: 212.45, kind: 'final', c: 1.35, endY: 12 },                                                         // the band, the ceiling's wave
    { t: 220.84, kind: 'final', c: 1.2, endY: 14 },                                                          // "the automatic doors slide open"
    { t: 225.88, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 10, gap: true, turn: 0.6 }, // out the doors: cold air from the parking lot
    { t: 237.62, kind: 'bridge', endY: 9, turn: 0.6 },                                                       // "which isn't much, but it's enough": the lot, quiet
    { t: 262.80, kind: 'pre', endY: 17 },                                                                    // the notes: "fluorescent lights are humming hymns"
    { t: 266.16, kind: 'final', start: 'launch', launchBeats: 4, kick: 11, endY: 12, gap: true },            // "the ceiling hums its hollow hymns"
    { t: 279.58, kind: 'final', c: 1.3, endY: 11 },                                                          // "the hum becomes the subject"
    { t: 289.65, kind: 'outro', endY: 6 },                                                                   // the last of it
  ],
  rails: [
    { t: 79.88, bars: 2, x: 0 },      // "if you stopped showing up at all" (along the carts in the main aisle)
    { t: 145.32, bars: 2, x: 0 },     // "heart half full"
    { t: 229.24, bars: 2, x: 0 },     // "I walk out with my plastic bag": along the cart corral
  ],
  palette: 'gsaLot',
  world: 'gsa',
  lift: { fog: 0.3 },
  titleView: { ahead: -0.2, x: 2.4, h: 1.5, back: -0.7, lookH: 2.2 },
  looks: [
    { t: -99, palette: 'gsaLot' },
    { t: 14.2, palette: 'gsaStore', fade: 0.4 },       // in at the doors
    { t: 21.0, palette: 'gsaFrozen', fade: 0.4 },      // the frozen aisle
    { t: 27.8, palette: 'gsaStore', fade: 0.5 },       // aisle three
    { t: 41.28, palette: 'gsaAway', fade: 1.6 },       // "we learn to look away"
    { t: 54.67, palette: 'gsaSee', fade: 0.12 },       // "but I see you"
    { t: 86.57, palette: 'gsaLanes', fade: 0.25 },     // the checkouts
    { t: 113.43, palette: 'gsaSeason', fade: 0.6 },    // the seasonal aisle
    { t: 128.53, palette: 'gsaSee', fade: 0.12 },      // "but I see you"
    { t: 155.6, palette: 'gsaGod', fade: 2.0 },        // "maybe God is just a night manager"
    { t: 169.2, palette: 'gsaLove', fade: 5.0 },       // "maybe love is just standing in the same hollow glow"
    { t: 185.63, palette: 'gsaDark', fade: 0.15 },     // the night lights
    { t: 197.41, palette: 'gsaFinal', fade: 0.12 },    // "I see you"
    { t: 225.88, palette: 'gsaCold', fade: 0.3 },      // the cold air
    { t: 246.04, palette: 'gsaNight', fade: 3.0 },     // the lot, quiet
    { t: 262.8, palette: 'gsaHymn', fade: 2.5 },       // the notes
    { t: 291.3, palette: 'gsaEnd', fade: 2.5 },        // after the last of it
  ],
  moments: [
    { t: 13.86, kind: 'bell', k: 0.35, degree: 4 },    // the doors' chime
    { t: 14.22, kind: 'bell', k: 0.35, degree: 0 },
    { t: 14.41, kind: 'flash', k: 0.15 },
    { t: 24.48, kind: 'ring', k: 0.22, dur: 1.4 },     // "reading ingredients like scripture"
    { t: 54.67, kind: 'flash', k: 0.35 },              // "but I see you": every shelf turned round
    { t: 54.67, kind: 'pop', k: 0.45, flash: 0.04 },
    { t: 59.71, kind: 'bell', k: 0.3, degree: 0, n: 2, gap: 520 },   // "two a.m.": the clock
    { t: 86.57, kind: 'flash', k: 0.22 },              // the checkouts
    { t: 100.62, kind: 'pop', k: 0.45, flash: 0.06 },  // "I say plastic"
    { t: 128.53, kind: 'flash', k: 0.35 },             // "but I see you"
    { t: 133.57, kind: 'bell', k: 0.3, degree: 0, n: 2, gap: 520 },  // "2 a.m." again
    { t: 160.06, kind: 'shutter', k: 0.45 },           // "the black and white screen"
    { t: 169.6, kind: 'ring', k: 0.28, dur: 2.2 },     // "maybe love"
    { t: 185.63, kind: 'blackout', dur: 0.35, k: 0.55 },   // the night lights
    { t: 197.41, kind: 'flash', k: 0.4 },              // "I see you"
    { t: 199.24, kind: 'flash', k: 0.15 },
    { t: 202.5, kind: 'flash', k: 0.15 },
    { t: 205.75, kind: 'flash', k: 0.2 },              // the ceiling's wave
    { t: 224.92, kind: 'bell', k: 0.35, degree: 4 },   // the doors' chime, on the way out
    { t: 225.28, kind: 'bell', k: 0.35, degree: 0 },
    { t: 225.88, kind: 'flash', k: 0.28 },
    { t: 237.62, kind: 'ring', k: 0.2, dur: 1.6 },     // "which isn't much"
    { t: 263.9, kind: 'pop', k: 0.25 },                // the old line struck through
    { t: 291.33, kind: 'ring', k: 0.35, dur: 3.0 },    // the last of it
    // NOW SERVING, every two beats, nobody coming
    ...[0, 1, 2, 3, 4, 5, 6].map((i) => ({ t: 148.68 + i * 0.839, kind: 'pop', k: 0.1 })),
  ],
  scenery: {
    rooms: [
      { style: 'lot', from: -14, to: 14.41 },
      { style: 'store', from: 14.41, to: 21.13, caps: [FRONT, NARROW] },
      { style: 'frozen', from: 21.13, to: 27.86 },
      { style: 'store', from: 27.86, to: 86.57, caps: [NARROW, null] },
      { style: 'front', from: 86.57, to: 113.43 },
      { style: 'store', from: 113.43, to: 197.41 },
      { style: 'exit', from: 197.41, to: 225.88, caps: [null, EXIT] },
      { style: 'lot', from: 225.88, to: 312 },
      // the ceiling without its store, over the lot, for the songwriter's notes
      { style: 'hymn', from: 262.0, to: 296, showFrom: 263.0 },
    ],
    // the lot level; the store's floor follows the road
    flat: [[-20, 12.0, 0.6], [223.6, 330, 0.6]],
    shelf: 60, drop: 3,
    doors: [{ t: 14.41 }, { t: 225.88, out: true }],
    bag: { from: 228.6, rise: 237.62, to: 252 },
    // its panels flicker on with "the ceiling hums its hollow hymns" and go out, one at a time, on "like the building itself is grieving"
    hymn: { on: 266.0, off: 286.3 },
    zones: [
      // the lot: lamps, cars in the stalls, carts left about
      { from: -12, to: 13.6, kits: ['gsaLot'], lamp: 1.25, lampX: 40, cars: 0.24 },
      { from: -10, to: 12.5, kits: ['gsaCarts'], every: 0.9, x: 15, spread: 70 },
      // the ceiling's domes, the whole way through the store
      { from: 15.0, to: 225, kits: ['gsaDomes'], every: 0.9, H: 40 },
      // aisle three and the aisles after it; the pre's shelves turn away, and the chorus's too until
      // "but I see you" turns them round
      { from: 27.95, to: 41.2, kits: ['gsaShelves'], len: 0.5, gap: 0.3, clear: [[31.2, 33.6, -1]] },
      { from: 41.3, to: 54.0, kits: ['gsaShelves'], len: 0.5, gap: 0.28, away: [41.28, 54.67], clear: [[47.4, 49.8, 1]] },
      { from: 56.6, to: 86.0, kits: ['gsaShelves'], len: 0.55, gap: 0.4, x: 18, sy: 1.4, away: [41.28, 54.67], clear: [[58.9, 61.2, 1], [78.5, 84.4, 0]] },
      { from: 54.0, to: 56.6, kits: ['gsaCoolers'] },
      { from: 79.6, to: 83.6, kits: ['gsaCarts'], every: 0.3, x: 9, spread: 2 },
      // the checkouts down both sides
      { from: 87.4, to: 112.6, kits: ['gsaLanes'], every: 0.8, x: 16, first: 1, breathe: 107.18 },
      // the seasonal aisle
      { from: 113.7, to: 128.3, kits: ['gsaSeasons'], every: 0.24, x: 12 },
      // chorus two: the shelves, the freezer under the jump
      { from: 128.0, to: 130.6, kits: ['gsaCoolers'] },
      { from: 130.6, to: 154.8, kits: ['gsaShelves'], len: 0.55, gap: 0.4, x: 18, sy: 1.4, clear: [[133.4, 135.4, -1], [149.6, 152.0, 1]] },
      // the bridge: the produce down there, then the shelves' tops
      { from: 158.4, to: 168.6, kits: ['gsaProduces'], every: 0.36, x: 15, s: 2.0, mist: 162.6 },
      { from: 168.4, to: 185.4, kits: ['gsaShelves'], len: 0.5, gap: 0.35, clear: [[170.6, 172.8, -1]] },
      // the night lights, and everything after
      { from: 185.8, to: 196.6, kits: ['gsaShelves'], len: 0.5, gap: 0.3 },
      { from: 199.0, to: 222.0, kits: ['gsaShelves'], len: 0.55, gap: 0.35, x: 16, sy: 1.3 },
      // out in the lot again, the corral, the cars, and on to the road
      { from: 227.5, to: 312, kits: ['gsaLot'], lamp: 1.35, lampX: 44, cars: 0.18 },
      { from: 247, to: 300, kits: ['gsaCarts'], every: 1.6, x: 18, spread: 80 },
      { from: 0, to: 0.1, kits: ['gsaAisles'], at: [
        { t: 21.5, n: 8, sign: 'gsaAFROZEN', h: 12 },     // the frozen aisle
        { t: 28.4, n: 3, sign: 'gsaA3' },                 // "there's a man in aisle three"
        { t: 35.0, n: 4, sign: 'gsaA4' },
        { t: 41.7, n: 5, sign: 'gsaA5' },
        { t: 47.0, n: 6, sign: 'gsaA6' },
        { t: 51.5, n: 7, sign: 'gsaA7' },
      ] },
      { from: 0, to: 0.1, kits: ['gsaProps'], at: [
        // the way in: GROCERY over the doors, OPEN 24 HOURS in the window
        { t: 14.37, x: 0, kind: 'storeSign', sign: 'gsaGROCERY', y: 32, s: 1.25, rot: Math.PI, cl: [1, 0.2, 0.15] },
        { t: 14.37, x: 38, kind: 'storeSign', sign: 'gsaOPEN', y: 12, s: 0.8, rot: Math.PI, cl: [0.3, 1, 0.5] },
        // the front of the store: the kiddie rocket, carts nested along the wall
        { t: 17.2, x: 24, kind: 'rocket', on: 14.41, s: 1.7 },
        { t: 16.2, x: -26, kind: 'corral', n: 7, s: 1.5 },
        // the departments, high on the walls
        { t: 19.6, x: 32, kind: 'wallSign', sign: 'gsaWFROZEN', y: 19, s: 1.1, cl: [0.4, 0.6, 1] },
        { t: 38.0, x: -32, kind: 'wallSign', sign: 'gsaWBAKERY', y: 19, s: 1.1 },
        { t: 64.0, x: 32, kind: 'wallSign', sign: 'gsaWDAIRY', y: 19, s: 1.1, cl: [0.5, 0.7, 1] },
        { t: 76.0, x: -32, kind: 'wallSign', sign: 'gsaWMEAT', y: 19, s: 1.1 },
        { t: 88.4, x: 32, kind: 'wallSign', sign: 'gsaWCHECK', y: 19, s: 1.1 },
        { t: 115.8, x: -32, kind: 'wallSign', sign: 'gsaWSEASON', y: 19, s: 1.1, cl: [1, 0.55, 0.15] },
        { t: 147.0, x: 32, kind: 'wallSign', sign: 'gsaWDELI', y: 19, s: 1.1 },
        { t: 158.8, x: -32, kind: 'wallSign', sign: 'gsaWPRODUCE', y: 22, s: 1.3, cl: [0.4, 1, 0.4] },
        { t: 206.0, x: 32, kind: 'wallSign', sign: 'gsaWDAIRY', y: 19, s: 1.1 },
        { t: 214.0, x: -32, kind: 'wallSign', sign: 'gsaWFROZEN', y: 19, s: 1.1 },
        // the frozen dinner on its lectern, its ingredients like scripture
        { t: 25.7, x: -12.2, kind: 'dinner', read: 24.48, s: 1.3 },
        // aisle three: the corn, the cart, the coat, the tissues
        { t: 32.6, x: -19, kind: 'corn', s: 1.0 },
        // "we practice being strangers": two carts back to back
        { t: 48.6, x: 17.5, kind: 'strangers', s: 1.5 },
        // the clock at two (and again in the second chorus)
        { t: 60.4, x: 15, kind: 'clock', y: 17, s: 1.1 },
        { t: 134.3, x: -15, kind: 'clock', y: 17, s: 1.1 },
        // PAPER or PLASTIC
        { t: 98.2, x: 0, kind: 'bags', plastic: 100.62, paper: 103.36, s: 1.3 },
        // NOW SERVING, nobody coming
        { t: 151.0, x: 22, kind: 'serving', from: 148.68, s: 1.1 },
        // the monitors hung from the ceiling, you on them
        { t: 162.9, x: 0, kind: 'crt', cols: 3, rows: 1, above: 7.5, s: 1.0 },
        // two carts in the same hollow glow
        { t: 172.0, x: -17, kind: 'love', glow: 169.6, s: 1.6 },
        // the monitors again, a wall of them, for the night lights
        { t: 190.3, x: 0, kind: 'crt', cols: 3, rows: 2, above: 6.5, s: 1.0 },
        // out in the lot: the corral along the rail, the board that turns over
        { t: 230.9, x: -17, kind: 'corral', n: 5, s: 1.5, rot: 0 },
        { t: 267.0, x: 17, kind: 'swap', strike: 263.7, swap: 266.16, y: 30, s: 1.3 },
      ] },
    ],
    signs: [
      { key: 'gsaGROCERY', text: 'GROCERY', color: '#ff3a2a', core: '#fff0e8', bg: '#140404' },
      { key: 'gsaOPEN', text: 'OPEN 24 HOURS', color: '#4aff7a', core: '#e8ffe8', bg: '#020a04' },
      { key: 'gsaAFROZEN', text: 'FROZEN FOODS\nDINNERS · ICE CREAM', color: '#ffffff', core: '#ffffff', bg: '#1a4aa8' },
      { key: 'gsaA3', text: 'CANNED VEGETABLES\nSOUP · BEANS', color: '#ffffff', core: '#ffffff', bg: '#1a2440' },
      { key: 'gsaA4', text: 'PASTA · RICE\nSAUCES', color: '#ffffff', core: '#ffffff', bg: '#1a2440' },
      { key: 'gsaA5', text: 'CEREAL · COFFEE\nBREAKFAST', color: '#ffffff', core: '#ffffff', bg: '#1a2440' },
      { key: 'gsaA6', text: 'SNACKS · SODA\nCOOKIES', color: '#ffffff', core: '#ffffff', bg: '#1a2440' },
      { key: 'gsaA7', text: 'PAPER · CLEANING\nPET FOOD', color: '#ffffff', core: '#ffffff', bg: '#1a2440' },
      { key: 'gsaWFROZEN', text: 'FROZEN FOODS', color: '#ffffff', core: '#ffffff', bg: '#1a4aa8' },
      { key: 'gsaWBAKERY', text: 'BAKERY', color: '#fff0d8', core: '#ffffff', bg: '#7a4a1a' },
      { key: 'gsaWDAIRY', text: 'DAIRY', color: '#ffffff', core: '#ffffff', bg: '#2a6ad8' },
      { key: 'gsaWMEAT', text: 'MEAT · SEAFOOD', color: '#ffffff', core: '#ffffff', bg: '#a01818' },
      { key: 'gsaWCHECK', text: 'CHECKOUT', color: '#ffffff', core: '#ffffff', bg: '#2a2a30' },
      { key: 'gsaWSEASON', text: 'SEASONAL', color: '#ffffff', core: '#ffffff', bg: '#c85a10' },
      { key: 'gsaWDELI', text: 'DELI', color: '#ffffff', core: '#ffffff', bg: '#1a3a2a' },
      { key: 'gsaWPRODUCE', text: 'PRODUCE', color: '#ffffff', core: '#ffffff', bg: '#2a7a2a' },
      { key: 'gsaPAPER', text: 'PAPER', color: '#fff2dc', core: '#ffffff', bg: '#6a4a28' },
      { key: 'gsaPLASTIC', text: 'PLASTIC', color: '#ffffff', core: '#ffffff', bg: '#2a2a2e' },
      { key: 'gsaOLD', text: 'FLUORESCENT LIGHTS\nARE HUMMING HYMNS', color: '#121212', core: '#000000', bg: '#b4b4ac' },
      { key: 'gsaNEW', text: 'THE CEILING HUMS\nITS HOLLOW HYMNS', color: '#121212', core: '#000000', bg: '#b4b4ac' },
    ],
    // the boards carry only what both hearings agree on ("aisle" or "all" three, the girl's "tired
    // eye" or "eyes", "night manager" or "night man", "cold air" or "crawl there" came out two ways)
    lyricPart: 'gsaHang', lyricX: 0, lyricBg: '#0e3a2a', lyricColor: '#7ad8a0', lyricCore: '#f4fff8', lyricFont: '"Arial Black", Impact, sans-serif',
    lyrics: [
      { t: 12.73, text: 'THE CEILING HUMS ITS HOLLOW HYMNS\nTO NO ONE IN PARTICULAR', lead: 2.5, h: 13, frame: 'rgba(0,0,0,0)' },
      { t: 19.94, text: 'STANDING WHERE THE\nFROZEN DINNERS LIVE', lead: 2.0, bg: '#1a4aa8', frame: 'rgba(0,0,0,0)' },
      { t: 24.48, text: 'READING INGREDIENTS\nLIKE SCRIPTURE', lead: 1.4, bg: '#1a4aa8', frame: 'rgba(0,0,0,0)' },
      { t: 31.21, text: 'CRYING NEXT TO\nTHE CANNED CORN', frame: 'rgba(0,0,0,0)' },
      { t: 34.62, text: "I PRETEND\nI DIDN'T SEE", frame: 'rgba(0,0,0,0)' },
      { t: 40.68, text: "WE LEARN TO LOOK AWAY\nFROM EVERYTHING THAT'S TRUE", frame: 'rgba(0,0,0,0)', bg: '#2a2e2c' },
      { t: 45.80, text: "WE PRACTICE BEING STRANGERS\nTILL WE DON'T KNOW WHAT ELSE TO DO", frame: 'rgba(0,0,0,0)', bg: '#2a2e2c' },
      { t: 54.52, text: 'BUT I SEE YOU\nIN THE GROCERY STORE AT 2 AM', lead: 1.7, h: 13, frame: 'rgba(0,0,0,0)', bg: '#8a3a0a' },
      { t: 61.54, text: "BUYING THINGS YOU DON'T NEED\nJUST TO FEEL LIKE YOU EVER PLANNED", frame: 'rgba(0,0,0,0)', bg: '#8a3a0a' },
      { t: 90.78, text: "SHE'S BEEN HERE SINCE\nTHE MORNING SHIFT", frame: 'rgba(0,0,0,0)', bg: '#5a1414' },
      { t: 94.40, text: "SHE ASKS ME PAPER OR PLASTIC\nLIKE IT'S A PHILOSOPHICAL GIFT", frame: 'rgba(0,0,0,0)', bg: '#5a1414' },
      { t: 100.62, text: 'I SAY PLASTIC,\nHATE MYSELF', frame: 'rgba(0,0,0,0)', bg: '#5a1414' },
      { t: 104.08, text: "PAPER WOULDN'T\nCHANGE A THING", frame: 'rgba(0,0,0,0)', bg: '#5a1414' },
      { t: 107.18, text: "WE'RE ALL JUST CHOOSING CONTAINERS\nFOR THE NOTHING THAT WE BRING", frame: 'rgba(0,0,0,0)', bg: '#5a1414' },
      { t: 113.88, text: 'WE FILL OUR ARMS WITH OBJECTS\nTO KEEP FROM FEELING BARE', frame: 'rgba(0,0,0,0)', bg: '#6a2a08' },
      { t: 120.42, text: "WE CALL IT RUNNING ERRANDS\nWHEN WE'RE RUNNING FROM DESPAIR", frame: 'rgba(0,0,0,0)', bg: '#6a2a08' },
      { t: 135.50, text: "BUYING THINGS YOU DON'T NEED\nJUST TO FEEL LIKE YOU HAVE A PLAN", frame: 'rgba(0,0,0,0)', bg: '#8a3a0a' },
      { t: 142.02, text: 'WITH YOUR CARD HALF EMPTY,\nHEART HALF FULL', frame: 'rgba(0,0,0,0)', bg: '#8a3a0a' },
      { t: 149.00, text: 'WONDERING IF ANYONE\nWOULD NOTICE', frame: 'rgba(0,0,0,0)', bg: '#8a3a0a' },
      { t: 160.06, text: 'WATCHING ON THE\nBLACK AND WHITE SCREEN', h: 9, frame: 'rgba(0,0,0,0)', bg: '#202224' },
      { t: 162.68, text: 'HOPING WE FIGURE OUT\nWHAT ALL THIS PRODUCE MEANS', h: 9, frame: 'rgba(0,0,0,0)', bg: '#202224' },
      { t: 169.60, text: 'AND MAYBE LOVE IS JUST STANDING\nIN THE SAME HOLLOW GLOW', h: 9, frame: 'rgba(0,0,0,0)', bg: '#4a2a20' },
      { t: 175.60, text: 'SAYING NOTHING, NEEDING NOTHING\nEXCEPT FOR SOMEONE ELSE TO KNOW', h: 9, frame: 'rgba(0,0,0,0)', bg: '#4a2a20' },
      { t: 182.24, text: 'THAT I SEE YOU', frame: 'rgba(0,0,0,0)', bg: '#4a2a20' },
      { t: 185.54, text: 'YEAH, I REALLY\nFUCKING SEE YOU', frame: 'rgba(0,0,0,0)', bg: '#3a0a08' },
      { t: 192.16, text: "STILL ALIVE, STILL TRYING,\nSTILL PRETENDING YOU'RE OKAY", frame: 'rgba(0,0,0,0)', bg: '#3a0a08' },
      { t: 199.24, text: 'I SEE YOU', frame: 'rgba(0,0,0,0)', bg: '#8a6a0a' },
      { t: 202.50, text: 'I SEE YOU', frame: 'rgba(0,0,0,0)', bg: '#8a6a0a' },
      { t: 222.52, text: 'THE AUTOMATIC DOORS\nSLIDE OPEN', lead: 1.6, frame: 'rgba(0,0,0,0)' },
      { t: 229.88, text: "I WALK OUT WITH MY PLASTIC BAG\nHOLDING EVERYTHING I'VE GOT", ...BOARD, x: 22 },
      { t: 235.74, text: "WHICH ISN'T MUCH", ...BOARD, x: 22 },
      { t: 238.72, text: "BUT IT'S ENOUGH", ...BOARD, x: 22 },
      { t: 241.76, text: 'TO MAKE IT THROUGH\nANOTHER NIGHT', ...BOARD, x: 22 },
      { t: 271.19, text: 'KEEPS THE ALLITERATION', ...BOARD, x: 22 },
      { t: 272.87, text: 'MATCHES THE\nSYLLABLE STRESS', ...BOARD, x: 22, lead: 1.8 },
      { t: 276.23, text: 'AND HOLLOW DOES MORE EMOTIONAL WORK\nTHAN FLUORESCENT EVER COULD', ...BOARD, x: 22 },
      { t: 279.58, text: 'THE HUM BECOMES\nTHE SUBJECT', ...BOARD, x: 22 },
      { t: 282.93, text: 'DISEMBODIED,\nEERIE', ...BOARD, x: 22 },
    ],
    finale: { kind: 'gsa', t: 298.5, x: -105, s: 1.0, rot: -Math.PI / 2 - 0.35, fireAt: 289.65, orbit: { r: 60, h: 12, y: 10, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 10, heroFov: 50, heroUp: 2.2 } },
  },
};

