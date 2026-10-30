// Good Company: its course, its looks, its moments and what stands along the way. (album.js puts it in
// the record; the place itself is in gco-world.js, its things in gco-props.js.)
//
// Her house on a night he got there first. Her street, the neighbours dark; her windows going on when
// the band comes in; in at her front door (the keypad knows her mother's maiden name); her kitchen and
// living room with his notes on everything; out through a wall of them onto her street for each
// chorus, where every porch light agrees with him; in at the back for the dinner party he planned, the
// kettle, the hall of doors; the bath he ran; the bank on the corner and its vault of favours; her
// kitchen again at the end, the kettle on, and one more note: ALWAYS.

// the bars, as the drums have them (106.0 bpm; the band fuller from 8.53; a beat of silence before
// each chorus at 50.98 and 130.22, the bass back two beats into it; the bass out 182.89–187.39):
// 1.74 4.00 6.26 8.53 10.79 13.06 15.32 17.58 19.85 22.11 24.38 26.63 28.91 31.17 33.43 35.70 37.96
// 40.22 42.49 44.75 47.01 49.28 51.54 53.81 56.07 58.34 60.60 62.87 65.13 67.40 69.66 71.92 74.19
// 76.45 78.71 80.98 83.24 85.51 87.77 90.04 92.30 94.56 96.83 99.09 101.36 103.62 105.88 108.15
// 110.42 112.68 114.94 117.20 119.47 121.74 124.00 126.26 128.53 130.79 133.06 135.32 137.58 139.85
// 142.12 144.38 146.64 148.90 151.17 153.43 155.70 157.96 160.22 162.49 164.75 167.01 169.28 171.55
// 173.81 176.08 178.34 180.61 182.89 185.14 187.39 189.66 191.92 194.19 196.45 198.71 201.00

// her front door and the back one: a building's face down to the street with the door in it
const FRONT = { kind: 'front', hw: 13, hh: 30 };
// the bank on the corner, its vault door
const BANK = { kind: 'front', hw: 13, hh: 32 };
// a doorway between her rooms, and the walls the choruses go through
const DOOR = { kind: 'wall', hw: 12, hh: 26 };
const EXIT = { kind: 'wall', hw: 17, hh: 30 };

const NIGHT = {
  zenith: 0x080c20, horizon: 0x34284a, skyGlow: 0xffa860, glowDir: [0.3, 0.06, 1], skyline: 0x0c0e18, moonDir: [-0.45, 0.5, 0.74], moon: 0xfff0d8,
  fog: 0x161828, fogDensity: 0.0017, stars: 0.75, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 0.7,
  ground: 0x0c160e, street: 0x2a2632, roof: 0x221e2a, wall: 0x2a2a34, tree: 0x0c1a10,
  window: 0xffc878, windowAlt: 0xffe2a0, lamp: 0xffd090,
  ribbon: 0x14182a, edge: 0xfff6e0, fret: 0xffe25a, glow: 0xffd84a, hold: 0xffd23a, gate: 0xffffff,
  skyLight: 0x8890b8, bounce: 0x3a3040, hemiK: 1.6, sunK: 0.5,
  gem: 0xfff0a0,
  board: 0x1a1c28, suit: 0x1a1c2a, jacket: 0xffe25a, hair: 0x1a1210, shoes: 0xf6f2ea, gloves: 0x1a1c2a, rim: 0xfff0c0, daze: 0,
};

export const palettes = {
  gcoNight: NIGHT,
  // the band in: her windows lit, the street warmer for it
  gcoLit: { bounce: 0x4a3a3a, glow: 0xffd84a, hold: 0xffd23a, hemiK: 1.7 },
  // her kitchen: white light, sage
  gcoKitchen: { fog: 0x2a2a24, fogDensity: 0.0022, skyLight: 0xfff6e8, bounce: 0x7a7a5a, hemiK: 2.0, glow: 0xffd84a, hold: 0xffcc30, fret: 0xfff2b0, edge: 0xffffff, ribbon: 0x1e1c16 },
  // the living room: lamplight
  gcoHome: { fog: 0x2e2218, fogDensity: 0.0022, skyLight: 0xffe8c8, bounce: 0x8a6a4a, hemiK: 1.9, glow: 0xffd84a, hold: 0xffc83a, fret: 0xfff2b0, edge: 0xffffff, ribbon: 0x241a12 },
  // his notes all over the walls: yellow, louder
  gcoNotes: { skyLight: 0xfff0b8, bounce: 0x9a7a3a, glow: 0xffe25a, hold: 0xffd400, fret: 0xffffff },
  // the choruses: her street at night, every note lit
  gcoChorus: { zenith: 0x0a0e26, horizon: 0x4a2c5a, skyGlow: 0xffb060, fog: 0x1c1a30, fogDensity: 0.0012, stars: 1.0, skyLight: 0xa0a8d8, bounce: 0x4a3a4a, hemiK: 2.0, glow: 0xffe25a, hold: 0xffd23a, fret: 0xfff6c0, edge: 0xffffff, ribbon: 0x161a2e, windowK: 1.2 },
  // "ask around, they'll all agree": every porch light on
  gcoAgree: { horizon: 0x5a3450, skyGlow: 0xffc070, skyLight: 0xc0b0c8, bounce: 0x6a4a3a, glow: 0xffd040, hold: 0xffc020, fret: 0xffffff },
  // round the back in the quiet
  gcoBack: { fog: 0x14162a, skyLight: 0x7a80a8, bounce: 0x2a2838, hemiK: 1.5, glow: 0xe8d8a0, hold: 0xe8c860 },
  // the dinner party: candlelight on red
  gcoParty: { fog: 0x2a1014, fogDensity: 0.0021, skyLight: 0xffd8b8, bounce: 0x6a2a2a, hemiK: 1.8, glow: 0xffb04a, hold: 0xffb030, fret: 0xffe8c0, edge: 0xfff4e0, ribbon: 0x1e0c0c },
  // the kettle: the kitchen again, brighter
  gcoKettle: { fog: 0x2a2a26, fogDensity: 0.0022, skyLight: 0xffffff, bounce: 0x7a7a6a, hemiK: 2.1, glow: 0xffe25a, hold: 0xffcc30, fret: 0xffffff, edge: 0xffffff, ribbon: 0x1e1c16 },
  // the hall of doors
  gcoHall: { fog: 0x241e18, fogDensity: 0.0024, skyLight: 0xf0e4cc, bounce: 0x6a5a40, hemiK: 1.8, glow: 0xffd84a, hold: 0xffc83a, fret: 0xfff2b0, edge: 0xffffff, ribbon: 0x1e1610 },
  // the lamps that switch on ahead of her: the room dim, the lamps doing it
  gcoLamps: { fog: 0x1e160e, fogDensity: 0.0024, skyLight: 0x9a8a72, bounce: 0x4a3a2a, hemiK: 1.35, glow: 0xffd070, hold: 0xffc040, fret: 0xfff0c0, edge: 0xfff8e8, ribbon: 0x1a120c },
  // "relax": the bath's candles
  gcoRelax: { fog: 0x120c08, skyLight: 0x5a4030, bounce: 0x2a1a10, hemiK: 0.9, glow: 0xff9a4a, hold: 0xff8a3a, fret: 0xffd0a0 },
  // the vault: brass and marble
  gcoBank: { zenith: 0x060608, horizon: 0x1a1810, skyGlow: 0xffc060, fog: 0x1a1810, fogDensity: 0.0019, stars: 0.3, skyLight: 0xfff0d0, bounce: 0x6a5a2a, hemiK: 1.9, glow: 0xffc040, hold: 0xffb02a, fret: 0xfff0b0, edge: 0xffffff, ribbon: 0x14120a },
  // "saving up for mine": gold
  gcoMine: { skyLight: 0xffe8a8, bounce: 0x8a6a1a, hemiK: 2.2, glow: 0xffd040, hold: 0xffc000, fret: 0xffffff },
  // "no really, don't worry about it": the bass out, the lights down
  gcoQuiet: { skyLight: 0x8a8070, bounce: 0x2a2418, hemiK: 1.2, glow: 0xe8d8b0, hold: 0xe0c880 },
  // her kitchen at the end, the kettle on
  gcoEnd: { fog: 0x2a2418, fogDensity: 0.0019, skyLight: 0xffeccc, bounce: 0x8a6a4a, hemiK: 1.9, glow: 0xffd84a, hold: 0xffc83a, fret: 0xfff2b0, edge: 0xffffff, ribbon: 0x221a10, zenith: 0x080c20, horizon: 0x34284a, stars: 0.9 },
};

export const song = {
  id: 'good-company',
  accent: '#fff06a',
  title: 'Good Company',
  collect: 'sticky',
  // (the song list plays it from the pickup into the first chorus: "I promise I'm such good company")
  preview: 49.28,
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 11 },                                                           // her street, her house dark
    { t: 8.53, kind: 'verse', c: 0.8, endY: 10 },                                                  // the band fuller: her windows on
    { t: 17.58, kind: 'verse', endY: 12, turn: 0.4 },                                              // "I know your dog's name": her yard, her door, her kitchen
    { t: 31.17, kind: 'verse', c: 1.0, endY: 13, turn: 0.4 },                                      // "everyone adores me": the living room
    { t: 37.96, kind: 'pre', endY: 18, turn: 0.4 },                                                // "it's just a gift I have": the notes going up
    { t: 51.54, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, endY: 14, gap: true }, // "such good company": through the wall of notes onto her street
    { t: 71.92, kind: 'chorus', c: 1.35, endY: 13 },                                               // "ask around, they'll all agree"
    { t: 80.98, kind: 'break', endY: 12 },                                                         // round the back
    { t: 87.77, kind: 'verse', endY: 12, turn: 0.4 },                                              // "I planned the whole thing": the party
    { t: 103.62, kind: 'post', endY: 13, turn: 0.2 },                                              // "the path of least resistance": the hall of doors
    { t: 108.15, kind: 'verse', c: 0.95, endY: 14, turn: 0.4 },                                    // "so convenient"
    { t: 114.94, kind: 'pre', endY: 19, turn: 0.4 },                                               // "being needed before you even think to ask"; "relax"
    { t: 130.79, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, endY: 14, gap: true }, // out of the bathroom onto her street
    { t: 151.17, kind: 'chorus', c: 1.35, endY: 13 },                                              // "ask around"
    { t: 160.22, kind: 'break', endY: 12 },                                                        // in at the bank on the corner
    { t: 162.49, kind: 'post', c: 1.1, endY: 14, turn: 0.4 },                                      // "the thing about a favor": the vault
    { t: 176.08, kind: 'final', start: 'launch', launchBeats: 2, kick: 10, c: 1.3, endY: 15 },     // "and I've been saving up for mine"
    { t: 182.89, kind: 'break', endY: 10 },                                                        // "no really, don't worry about it": the bass out
    { t: 187.39, kind: 'verse', start: 'launch', launchBeats: 2, kick: 8, c: 1.0, endY: 11 },      // "I'm always happy to help": her kitchen
    { t: 201.0, kind: 'outro', endY: 6 },                                                          // "always"
  ],
  rails: [
    { t: 71.92, bars: 2, x: 0 },       // "ask around, they'll all agree": up her street as the porches light
    { t: 103.62, bars: 2, x: 0 },      // "the path of least resistance": down the hall of doors
    { t: 151.17, bars: 2, x: 0 },      // and again in the second chorus
  ],
  palette: 'gcoNight',
  world: 'gco',
  titleView: { ahead: -0.14, x: 1.6, h: 1.7, back: -0.9, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'gcoNight' },
    { t: 8.45, palette: 'gcoLit', fade: 0.4 },          // her windows on
    { t: 22.1, palette: 'gcoKitchen', fade: 0.25 },     // in at her door
    { t: 31.2, palette: 'gcoHome', fade: 0.3 },         // the living room
    { t: 40.2, palette: 'gcoNotes', fade: 6.0 },        // "remembering the things nobody asked about"
    { t: 51.54, palette: 'gcoChorus', fade: 0.12 },     // out onto her street
    { t: 72.3, palette: 'gcoAgree', fade: 1.6 },        // "they'll all agree"
    { t: 81.0, palette: 'gcoBack', fade: 1.2 },         // round the back
    { t: 87.77, palette: 'gcoParty', fade: 0.2 },       // the party
    { t: 97.5, palette: 'gcoKettle', fade: 0.2 },       // the kettle
    { t: 102.3, palette: 'gcoHall', fade: 0.2 },        // the hall of doors
    { t: 108.15, palette: 'gcoHome', fade: 0.4 },
    { t: 114.94, palette: 'gcoLamps', fade: 0.6 },      // the lamps ahead of her
    { t: 126.3, palette: 'gcoHome', fade: 0.3 },        // the bath
    { t: 129.28, palette: 'gcoRelax', fade: 0.25 },     // "relax"
    { t: 130.79, palette: 'gcoChorus', fade: 0.12 },    // her street again
    { t: 151.5, palette: 'gcoAgree', fade: 1.6 },       // "they'll all agree"
    { t: 160.22, palette: 'gcoBank', fade: 0.3 },       // the bank
    { t: 176.08, palette: 'gcoMine', fade: 0.4 },       // "saving up for mine"
    { t: 182.89, palette: 'gcoQuiet', fade: 0.2 },      // the bass out
    { t: 187.39, palette: 'gcoEnd', fade: 0.2 },        // her kitchen
  ],
  moments: [
    { t: 8.53, kind: 'pop', k: 0.3, flash: 0.08 },                    // her windows on
    { t: 19.60, kind: 'pop', k: 0.3 },                                // "name": BISCUIT
    { t: 21.40, kind: 'bell', k: 0.35, degree: 4 },                   // "maiden": the tick
    { t: 21.62, kind: 'knock', n: 1, k: 0.28 },                       // the lock goes
    { t: 23.98, kind: 'pop', k: 0.3 },                                // "June"
    { t: 26.56, kind: 'pop', k: 0.25, flash: 0.06 },                  // "23": the candles
    { t: 28.34, kind: 'glass', k: 0.35 },                             // "wine"
    { t: 38.52, kind: 'pop', k: 0.35, flash: 0.06 },                  // "gift"
    { t: 47.58, kind: 'pop', k: 0.35, flash: 0.06 },                  // "gift"
    { t: 51.54, kind: 'flash', k: 0.35 },                             // through the wall of notes
    { t: 72.34, kind: 'bell', k: 0.4 },                               // "ask around": the porch lights
    { t: 75.46, kind: 'ring', k: 0.3, dur: 0.8 },                     // "man": the mug
    { t: 87.77, kind: 'flash', k: 0.18 },                             // in at the back
    { t: 90.52, kind: 'pop', k: 0.25 },                               // "seat"
    { t: 94.60, kind: 'pop', k: 0.3 },                                // "who sits with who"
    { t: 101.22, kind: 'ring', k: 0.45, dur: 1.4 },                   // "kettle's": the whistle
    { t: 103.62, kind: 'knock', n: 4, gap: 1132, k: 0.28 },           // the doors
    { t: 106.22, kind: 'pop', k: 0.25 },                              // "choose": HERS
    { t: 113.14, kind: 'knock', n: 1, k: 0.4 },                       // "lose?": the lock
    { t: 129.28, kind: 'blackout', dur: 1.51, k: 0.3 },               // "relax": the candles
    { t: 130.79, kind: 'flash', k: 0.35 },
    { t: 151.56, kind: 'bell', k: 0.4 },                              // "ask around"
    { t: 160.22, kind: 'impact', k: 0.3 },                            // in at the bank
    { t: 166.28, kind: 'bell', k: 0.3, degree: 2 },                   // "favor"
    { t: 170.24, kind: 'pop', k: 0.3 },                               // "free"
    { t: 175.14, kind: 'bell', k: 0.45, degree: 4 },                  // "deposit"
    { t: 176.08, kind: 'flash', k: 0.3 },
    { t: 179.50, kind: 'impact', k: 0.5 },                            // "mine"
    { t: 182.89, kind: 'knock', n: 1, k: 0.45 },                      // the vault door; the bass out
    { t: 187.39, kind: 'flash', k: 0.3 },                             // her kitchen
    { t: 195.06, kind: 'bell', k: 0.3 },                              // "always"
    { t: 201.0, kind: 'ring', k: 0.35, dur: 2.2 },                    // the kettle, at the end
  ],
  scenery: {
    rooms: [
      { style: 'kitchen', from: 22.11, to: 31.17, caps: [FRONT, DOOR] },
      { style: 'home', from: 31.17, to: 51.54, caps: [null, EXIT] },
      { style: 'dining', from: 87.77, to: 97.54, caps: [FRONT, DOOR] },
      { style: 'kitchen', from: 97.54, to: 102.30, caps: [null, DOOR] },
      { style: 'hall', from: 102.30, to: 108.15, caps: [null, DOOR] },
      { style: 'home', from: 108.15, to: 126.26, caps: [null, DOOR] },
      { style: 'bath', from: 126.26, to: 130.79, caps: [null, EXIT] },
      { style: 'vault', from: 160.22, to: 187.39, caps: [BANK, DOOR] },
      { style: 'kitchen', from: 187.39, to: 216, fallAt: 201.4, fallFor: 2.4 },
    ],
    // his notes on her walls: a few everywhere, then more and more through "remembering the things"
    notes: [37.96, 50.5, 0.12, 0.95],
    // ... and a patch of them again where the lamps come on ahead of her
    notes2: [114.94, 126.26, 0.45],
    // the notes in the air over her street in the choruses
    flurry: [[51.54, 80.98], [130.79, 160.22]],
    zones: [
      // her street: dark neighbours, the lamps on
      { from: -6, to: 21.4, kits: ['gcoStreet'], every: 1.7, base: 0.06, clear: [[17.0, 22.4]] },
      // the choruses on her street: the bunting, and the porch lights in a wave on "they'll all agree"
      { from: 51.0, to: 87.4, kits: ['gcoStreet'], every: 1.55, base: 0.1, wave: 72.34, waveRate: 0.16, clear: [[75.2, 77.4]] },
      { from: 52.0, to: 80.5, kits: ['gcoBunting'], every: 1.05, y: 30 },
      { from: 130.6, to: 159.9, kits: ['gcoStreet'], every: 1.55, base: 0.1, wave: 151.56, waveRate: 0.16 },
      { from: 131.2, to: 159.5, kits: ['gcoBunting'], every: 1.05, y: 30 },
      // at the end, her street round her kitchen, every light on, there when the walls come down
      { from: 196.0, to: 216, kits: ['gcoStreet'], every: 1.4, lit: true, bare: true },
      // the party's round tables; at table five, YOU and ME, swapped about on "who sits with who"
      { from: 88.6, to: 97.0, kits: ['gcoTables'], every: 0.8, x: 27, special: 95.0, swap: 94.32 },
      // the hall of doors, slamming a beat before she reaches each
      { from: 102.9, to: 108.0, kits: ['gcoDoors'], x: 28.6, lead: 0.55 },
      // the lamps that switch on before she gets to them
      { from: 114.94, to: 126.0, kits: ['gcoLamps'], x: 27, lead: 1.5 },
      // the bath's candles on the floor, a path of them to the window
      { from: 126.6, to: 130.7, kits: ['gcoCandles'], every: 0.18, x: 13 },
      // the vault's safe-deposit boxes
      { from: 161.0, to: 186.6, kits: ['gcoBoxes'], every: 0.62, x: 31 },
      { from: 0, to: 0.1, kits: ['gcoProps'], at: [
        // her yard: the kennel ("your dog's name"), the keypad on her door frame ("maiden")
        { t: 19.9, x: -32, kind: 'kennel', name: 19.60, s: 1.15 },
        { t: 22.0, x: 17, kind: 'keypad', ok: 21.40, floor: true, y: 13, rot: Math.PI, s: 1.3 },
        { t: 22.05, x: 0, kind: 'porch', floor: true, y: 22, rot: Math.PI },
        // her kitchen: the calendar ("June"), the photo and the candles ("23"), the wine ("wine")
        { t: 24.7, x: -30, kind: 'fridge', flip: 23.98, floor: true, s: 1.0 },
        { t: 27.2, x: 28, kind: 'sideboard', candles: 26.56, floor: true, s: 1.1 },
        { t: 29.8, x: -27, kind: 'island', pour: 28.34, floor: true, s: 1.05 },
        // the living room: the cards ("everyone adores me"), the presents ("gift", "gift")
        { t: 34.8, x: 31, kind: 'mantel', cards: 31.98, floor: true, s: 1.0 },
        { t: 39.4, x: -27, kind: 'gift', open: 38.52, floor: true, s: 1.1 },
        { t: 44.2, x: -30, kind: 'armchair', floor: true, s: 1.1 },
        { t: 48.5, x: 27, kind: 'gift', open: 47.58, floor: true, s: 1.2 },
        // the mug on the lawn ("the nicest man you'll ever meet")
        { t: 76.3, x: 54, kind: 'mug', s: 1.0 },
        // the party: the seating chart ("every seat")
        { t: 90.9, x: 24, kind: 'easel', seat: 90.52, floor: true, s: 1.1 },
        // the kettle ("the kettle's working")
        { t: 101.7, x: -28, kind: 'stove', whistle: 101.22, floor: true, s: 1.0 },
        // his and hers ("a life you didn't choose")
        { t: 106.7, x: 25, kind: 'rail', on: 106.22, floor: true, s: 0.8 },
        // "so convenient": her chair, her slippers, the tea poured
        { t: 110.6, x: -30, kind: 'armchair', floor: true, s: 1.1 },
        // the bath he ran ("relax")
        { t: 130.1, x: -24, kind: 'tub', floor: true, s: 1.0 },
        // the vault: its door, the ledger ("only free the first time"), the piggy bank ("deposit", "mine")
        { t: 160.5, x: 34, kind: 'vault', floor: true, s: 1.0 },
        { t: 170.8, x: -28, kind: 'lectern', floor: true, s: 1.0 },
        { t: 179.9, x: 29, kind: 'pig', coins: 175.14, mine: 179.50, floor: true, s: 1.0 },
        // "no really, don't worry about it", "I'm just happy to help": his notes either side of the way out
        { t: 187.2, x: -20, kind: 'note', cell: 4, size: 8, floor: true, y: 15, rot: Math.PI, rz: 0.08 },
        { t: 187.2, x: 20, kind: 'note', cell: 5, size: 8, floor: true, y: 17, rot: Math.PI, rz: -0.1 },
        // her kitchen at the end: the kettle on, her fridge
        { t: 190.6, x: 29, kind: 'stove', whistle: 1e9, floor: true, s: 1.0 },
        { t: 194.0, x: -30, kind: 'fridge', flip: -1, floor: true, s: 1.0 },
      ] },
    ],
    // the boards carry only lines both hearings agree on (the medium one lost the second verse; "after
    // that it's a deposit" came out two ways; "always" is only in one)
    lyricPart: 'gcoBoard', lyricX: 34, lyricS: 1.0, lyricBg: '#ffe866', lyricColor: '#18224c', lyricCore: '#18224c',
    lyrics: [
      { t: 17.90, text: "I KNOW YOUR\nDOG'S NAME", side: 1, lead: 1.6 },
      { t: 24.40, text: 'THE COAST, THE YEAR\nYOU TURNED 23', floor: true, x: 27, s: 0.72, side: -1, lead: 1.2 },
      { t: 31.98, text: 'EVERYONE ADORES ME,\nNOBODY QUESTIONS ME', floor: true, x: 27, s: 0.72, side: -1 },
      { t: 40.28, text: 'REMEMBERING THE THINGS\nNOBODY ASKED ABOUT', floor: true, x: 27, s: 0.72, side: 1 },
      { t: 49.42, text: "I PROMISE I'M\nSUCH GOOD COMPANY", side: -1, lead: 3.4 },
      { t: 54.22, text: 'THE KIND OF GUY WHO\nMAKES IT ALL LOOK EASY', side: 1 },
      { t: 63.30, text: 'BUT NOTHING GOOD\nCOMES THAT NATURALLY', side: -1 },
      { t: 72.34, text: "ASK AROUND,\nTHEY'LL ALL AGREE", side: -1 },
      { t: 120.36, text: 'BEING NEEDED BEFORE YOU\nEVEN THINK TO ASK', floor: true, x: 27, s: 0.72, side: 1 },
      { t: 129.28, text: 'RELAX', floor: true, x: 27, s: 0.62, side: 1, lead: 0.4 },
      { t: 131.24, text: "I'M SUCH\nGOOD COMPANY", side: 1, lead: 2.2 },
      { t: 153.94, text: "THE NICEST MAN\nYOU'LL EVER MEET", side: -1 },
      { t: 163.26, text: 'AND THE THING\nABOUT A FAVOR', floor: true, x: 27, s: 0.75, side: 1 },
      { t: 169.18, text: "IS IT'S ONLY FREE\nTHE FIRST TIME", floor: true, x: 27, s: 0.75, side: 1 },
      { t: 176.38, text: "AND I'VE BEEN SAVING\nUP FOR MINE", floor: true, x: 27, s: 0.75, side: -1 },
      { t: 188.92, text: "I'M ALWAYS\nHAPPY TO HELP", floor: true, x: 27, s: 0.72, side: -1 },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'gco', t: 211.9, x: -22, s: 1.1, rot: -2.2, fireAt: 201.0, orbit: { r: 60, h: 10, y: 10, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 9, heroFov: 44, heroUp: 2.6 } },
  },
};
