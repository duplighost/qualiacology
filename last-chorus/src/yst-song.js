// If You See This: its course, its looks, its moments and what stands along the way. (album.js puts
// it in the record; the place itself is in yst-world.js, its things in yst-props.js.)

// Her colour is cerulean, I think, or maybe teal: the holds, the glow, the jacket.
const NIGHT = {
  zenith: 0x04060e, horizon: 0x18203a, skyGlow: 0x3a5a9a, glowDir: [0.2, 0.06, 1], skyline: 0x0a0c14, moonDir: [-0.4, 0.5, 0.75], moon: 0x9aa8c8,
  fog: 0x0e1220, fogDensity: 0.0018, stars: 0.45, sunSize: 0, snow: 0, snowGround: 0, rain: 0.25, windowK: 1.3,
  ground: 0x101219, street: 0x8ab0e0, roof: 0x22202a, wall: 0x3a3440, tree: 0x0e1210,
  window: 0xffd09a, windowAlt: 0x9ad0ff, lamp: 0xffc88a,
  ribbon: 0x0e121c, edge: 0xe8f4ff, fret: 0x5ab0e8, glow: 0x3aa8f0, hold: 0x2a96e8, gate: 0xffffff, gem: 0xd8ecff,
  skyLight: 0x7a8aa8, bounce: 0x2a2834, hemiK: 1.7, sunK: 0.55,
  board: 0x14161c, suit: 0x16181e, jacket: 0x2a78d8, hair: 0x1a120c, shoes: 0xe8eef4, gloves: 0x16181e, rim: 0xb8d8ff, daze: 0,
};

export const palettes = {
  ystNight: NIGHT,
  // the laundromat: tubes overhead, everything a little green
  ystLaundry: { fog: 0x18221e, fogDensity: 0.0021, rain: 0, skyLight: 0xd0e8e0, bounce: 0x5a6a64, hemiK: 1.75, sunK: 0.5, stars: 0.3, glow: 0x3aa8f0, hold: 0x2a96e8 },
  // the ritual: the dark, and a screen somewhere ahead
  ystRitual: { zenith: 0x010207, horizon: 0x0a1430, skyGlow: 0x2a6aff, glowDir: [0, 0.07, 1], fog: 0x060a16, fogDensity: 0.0022, rain: 0, stars: 0.15, skyLight: 0x3a4a7a, bounce: 0x0a0c18, hemiK: 1.15, sunK: 0.3, windowK: 0.4, ground: 0x07080c },
  // the street in the chorus: wet, lit, every pole papered
  ystStreet: { zenith: 0x06081a, horizon: 0x2a2a4a, skyGlow: 0x6a6ac8, fog: 0x161a2c, fogDensity: 0.0017, rain: 0.4, stars: 0.3, skyLight: 0x9aa4c8, bounce: 0x3a3040, hemiK: 1.85, sunK: 0.6, windowK: 1.5, window: 0xffc880, lamp: 0xffc070 },
  // the coffee shop on Seventh
  ystCafe: { fog: 0x22160e, fogDensity: 0.0021, rain: 0.5, stars: 0.3, skyLight: 0xffd8a8, bounce: 0x6a4028, hemiK: 2.0, sunK: 0.5, window: 0xffc070, lamp: 0xffb868 },
  // ... a scene, the lights on it
  ystSet: { fog: 0x1e1814, fogDensity: 0.0020, skyLight: 0xfff4e8, bounce: 0x5a4a40, hemiK: 2.2 },
  // the fade to gray display
  ystGray: { zenith: 0x0a0a0a, horizon: 0x3a3a3a, skyGlow: 0x6a6a6a, fog: 0x2a2a2a, fogDensity: 0.0022, rain: 0, stars: 0, skyLight: 0xb0b0b0, bounce: 0x404040, hemiK: 1.6, glow: 0xa8a8a8, hold: 0xc8c8c8, fret: 0x9a9a9a, edge: 0xe8e8e8, gem: 0xe0e0e0, ribbon: 0x161616, window: 0xb0b0b0, windowAlt: 0x909090, lamp: 0xc0c0c0, street: 0xa0a0a0, ground: 0x141414, gate: 0xf0f0f0 },
  ystVoid: { zenith: 0x050505, horizon: 0x262626, skyGlow: 0x5a5a5a, glowDir: [0, 0.07, 1], fog: 0x121212, fogDensity: 0.0025, skyLight: 0x707070, bounce: 0x202020, hemiK: 1.2, ground: 0x0a0a0a },
  // the second chorus: the colour back all at once
  ystStreet2: { zenith: 0x06081a, horizon: 0x2e2a4e, skyGlow: 0x7a6ad8, fog: 0x161a2c, fogDensity: 0.0017, rain: 0.5, stars: 0.3, skyLight: 0x9aa4c8, bounce: 0x3a3040, hemiK: 1.9, sunK: 0.6, windowK: 1.6, window: 0xffc880, windowAlt: 0x9ad0ff, lamp: 0xffc070, glow: 0x3aa8f0, hold: 0x2a96e8, fret: 0x5ab0e8, edge: 0xe8f4ff, gem: 0xd8ecff, ribbon: 0x0e121c, street: 0x8ab0e0, ground: 0x101219, gate: 0xffffff },
  // inside the screen: I found your name
  ystScreen: { zenith: 0x040a1a, horizon: 0x16305a, skyGlow: 0x4a8aff, glowDir: [0, 0.1, 1], fog: 0x0a1428, fogDensity: 0.0015, rain: 0, stars: 0.1, skyLight: 0xb8d0ff, bounce: 0x1a2a4a, hemiK: 1.9, sunK: 0.5, windowK: 0.6, glow: 0x6ab4ff, hold: 0x3aa0ff, ribbon: 0x0a1020, ground: 0x060a14 },
  ystScreenBand: { horizon: 0x1a3a6a, skyGlow: 0x6aa0ff, skyLight: 0xc8dcff, hemiK: 2.05, fogDensity: 0.0013 },
  ystScreenCut: { horizon: 0x0a1a34, skyGlow: 0x2a4a8a, skyLight: 0x6a7aa8, hemiK: 1.4, fog: 0x060c18, fogDensity: 0.0019 },
  // start again: the night street at full tilt
  ystClimax: { zenith: 0x05040e, horizon: 0x2a1a3a, skyGlow: 0x8a5ad8, glowDir: [0.25, 0.06, 1], fog: 0x14101e, fogDensity: 0.0016, rain: 0.7, stars: 0.2, skyLight: 0xa098c8, bounce: 0x3a2a40, hemiK: 1.95, sunK: 0.6, windowK: 1.8, window: 0xffc070, windowAlt: 0xa0c8ff, lamp: 0xffb860, ground: 0x0e0e16 },
  // the chorus again, quiet: half the lamps, the rain
  ystQuiet: { horizon: 0x16182a, skyGlow: 0x3a4a7a, fog: 0x0c0e18, fogDensity: 0.0021, rain: 0.6, skyLight: 0x6a7498, bounce: 0x1a1a24, hemiK: 1.5, windowK: 0.9 },
  // the last chorus
  ystFinal: { zenith: 0x06081a, horizon: 0x2e2a4e, skyGlow: 0x6a8ae8, fog: 0x161a2c, fogDensity: 0.0016, rain: 0.35, skyLight: 0xa4b0d4, bounce: 0x3a3040, hemiK: 2.0, windowK: 1.7 },
  // don't find me yet: going out ahead of you
  ystDark: { horizon: 0x0a0c16, skyGlow: 0x1a2648, fog: 0x05060c, fogDensity: 0.0026, rain: 0.2, skyLight: 0x3a4060, bounce: 0x0c0c14, hemiK: 1.15, windowK: 0.06, stars: 0.6 },
  // the coffee shop at closing: chairs up, one lamp in the back
  ystClosed: { zenith: 0x04060e, horizon: 0x14182a, skyGlow: 0x3a4a7a, fog: 0x120c08, fogDensity: 0.0022, rain: 0.3, stars: 0.3, skyLight: 0xb89a7a, bounce: 0x3a2618, hemiK: 1.45, sunK: 0.4, window: 0xffb868, lamp: 0xffb060, glow: 0x3aa8f0, hold: 0x2a96e8 },
};

// the doors from the street into the laundromat and the coffee shop
const FRONT = { kind: 'front', hw: 12, hh: 24 };
const BACK = { kind: 'wall', hw: 12, hh: 24 };

export const song = {
  // a missed-connections post that never wants an answer. Tuesday night at the laundromat, the
  // washers going round, her folding chaos into squares, the handprint in her blue; out the back
  // into the dark to refresh, F5, F5, F5, on keys the size of rooms; the street papered with the
  // flyers, IF YOU SEE THIS, a seat saved on every corner. The band stops and you fly the silence
  // into the coffee shop on Seventh, which becomes a film set and fades
  // to gray; the ritual again in the gray; the colour back for the second chorus. Inside the screen
  // for "I found your name": her photos in a grid, her hands, the algorithm's lines, the school, the
  // cake, a message typed and taken back, and the tab closing. Then the night street at full tilt
  // past the places we didn't meet and the doors I'll never open; the flyers turning their backs,
  // the lamps going out ahead; and the café at closing, the table in the back where no one sits.
  id: 'if-you-see-this',
  accent: '#3aa8f0',
  title: 'If You See This',
  collect: 'tab',
  startY: 14,
  // (the bar line is a beat earlier than the beat file has it: the band comes in, stops and drops
  // on beat-index phase 1 every time, the kick hardest there too)
  downbeat: 1,
  sections: [
    { t: 0.0, kind: 'verse', endY: 14 },                                                   // "laundromat, Tuesday night"
    { t: 15.28, kind: 'verse', c: 0.95, endY: 14 },                                         // "you would paint beneath your fingernails"
    { t: 31.55, kind: 'break', endY: 22 },                                                  // "and I check like it's a ritual"
    { t: 41.74, kind: 'pre', endY: 27 },                                                    // "like refreshing is a form of faith"
    { t: 49.86, kind: 'chorus', start: 'launch', kick: 10, endY: 12 },                      // "if you see this": out over the street
    { t: 68.17, kind: 'break', start: 'launch', kick: 8, gap: true, endY: 13 },             // the band stops: fly the silence
    { t: 70.20, kind: 'verse', c: 0.9, endY: 13 },                                          // "coffee shop on Seventh"
    { t: 86.47, kind: 'verse', c: 0.95, endY: 14 },                                         // "from a movie where I'm not the lead"
    { t: 102.74, kind: 'break', endY: 22 },                                                 // F5 again, in the gray
    { t: 110.89, kind: 'pre', endY: 28 },                                                   // "like refreshing is a sacrament"
    { t: 121.05, kind: 'chorus', start: 'launch', kick: 11, endY: 12 },                     // the colour back
    { t: 139.36, kind: 'bridge', endY: 20 },                                                // "I found your name"
    { t: 151.56, kind: 'post', endY: 16 },                                                  // "mutual friends and Instagramming"
    { t: 167.84, kind: 'break', endY: 24 },                                                 // "and end this. But I don't"
    { t: 173.93, kind: 'chorus', start: 'launch', kick: 12, endY: 14 },                     // "start again"
    { t: 198.33, kind: 'final', c: 1.3, endY: 12 },                                         // "you're better as a question I keep asking"
    { t: 214.62, kind: 'pre', endY: 22 },                                                   // the chorus, quiet
    { t: 222.75, kind: 'final', start: 'launch', kick: 11, endY: 12 },                      // "I don't want you to see this"
    { t: 241.05, kind: 'final', c: 1.3, endY: 12 },                                         // "don't find me yet"
    { t: 255.29, kind: 'outro', endY: 6 },                                                  // the table in the back
  ],
  rails: [
    { t: 11.22, bars: 2, x: 0 },        // "a couple spares": along the machines
    { t: 175.96, bars: 2, x: 0 },       // the band at full tilt, no words yet
    { t: 234.95, bars: 2, x: 0 },       // "where you left me"
  ],
  palette: 'ystNight',
  world: 'yst',
  titleView: { ahead: -0.16, x: 1.4, h: 1.7, back: -0.8, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'ystNight' },
    { t: 1.5, palette: 'ystLaundry', fade: 0.5 },
    { t: 31.9, palette: 'ystRitual', fade: 0.7 },
    { t: 49.9, palette: 'ystStreet', fade: 0.25 },
    { t: 70.5, palette: 'ystCafe', fade: 0.5 },
    { t: 84.0, palette: 'ystSet', fade: 0.6 },
    { t: 101.4, palette: 'ystGray', fade: 2.0 },
    { t: 103.1, palette: 'ystVoid', fade: 0.6 },
    { t: 121.1, palette: 'ystStreet2', fade: 0.15 },
    { t: 139.7, palette: 'ystScreen', fade: 0.8 },
    { t: 151.6, palette: 'ystScreenBand', fade: 0.5 },
    { t: 168.0, palette: 'ystScreenCut', fade: 0.4 },
    { t: 174.0, palette: 'ystClimax', fade: 0.2 },
    { t: 214.7, palette: 'ystQuiet', fade: 0.8 },
    { t: 222.8, palette: 'ystFinal', fade: 0.2 },
    { t: 248.6, palette: 'ystDark', fade: 2.4 },
    { t: 257.7, palette: 'ystClosed', fade: 1.0 },
  ],
  moments: [
    { t: 37.32, kind: 'pop', k: 0.4, flash: 0.08 },        // F5
    { t: 38.12, kind: 'pop', k: 0.4, flash: 0.08 },        // F5
    { t: 38.92, kind: 'pop', k: 0.45, flash: 0.1 },        // F5
    { t: 49.86, kind: 'flash', k: 0.25 },                  // the street
    { t: 68.22, kind: 'blackout', dur: 1.85, k: 0.8 },     // the band stops
    { t: 83.3, kind: 'flash', k: 0.3 },                    // "watched you like a scene": the light on it
    { t: 87.26, kind: 'pop', k: 0.65, flash: 0.15 },       // the clapperboard
    { t: 108.86, kind: 'pop', k: 0.35, flash: 0.06 },      // F5
    { t: 109.46, kind: 'pop', k: 0.35, flash: 0.06 },      // F5
    { t: 110.06, kind: 'pop', k: 0.4, flash: 0.08 },       // F5
    { t: 121.05, kind: 'flash', k: 0.35 },                 // the colour back
    { t: 167.6, kind: 'ring', k: 0.25, dur: 0.6 },         // "I could message you right now"
    { t: 172.9, kind: 'blackout', dur: 1.0, k: 0.9 },      // "I close the tab"
    { t: 173.93, kind: 'flash', k: 0.45 },                 // "and start again"
    { t: 203.45, kind: 'knock', n: 2, k: 0.45 },           // "a door I'll never open"
    { t: 222.75, kind: 'flash', k: 0.3 },
    { t: 264.8, kind: 'ring', k: 0.18, dur: 0.8 },         // "posted"
  ],
  scenery: {
    rooms: [
      { style: 'laundry', from: 1.04, to: 31.55, caps: [FRONT, BACK] },
      { style: 'cafe', from: 70.20, to: 102.74, caps: [FRONT, BACK] },
      { style: 'closed', from: 257.33, to: 291, caps: [FRONT, null] },
    ],
    gray: [99.6, 101.4, 121.05],
    zones: [
      // Tuesday night, outside the laundromat
      { from: -8, to: 0.9, kits: ['ystStreet'], seats: 1.6 },
      // the laundromat: machines down both walls, a gap wherever something else stands
      { from: 1.7, to: 31.2, kits: ['ystWashers'], clear: [[5.1, 7.2, -1], [7.7, 8.8, -1], [12.9, 14.1, 1], [18.0, 19.9, -1], [20.5, 21.6, -1], [21.2, 21.65, 1], [23.4, 23.85, 1], [25.9, 27.8, 1], [27.1, 28.15, -1]] },
      { from: 0, to: 0.1, kits: ['ystProps'], at: [
        { t: 1.04, x: 0, kind: 'entrance', sign: 'laundry', hh: 24, floor: true },
        { t: 6.1, x: -24, kind: 'fold', floor: true, face: false },                       // "folding chaos into squares"
        { t: 8.25, x: -27, kind: 'cork', line: 'YOU WERE FOLDING CHAOS INTO SQUARES', y: 6, s: 1.3, floor: true, face: false },
        { t: 13.5, x: 26, kind: 'change', spill: 12.3, floor: true, face: false },        // "a couple spares"
        { t: 18.95, x: -24, kind: 'bench', paints: true, floor: true, face: false },      // "you would paint beneath your fingernails"
        { t: 21.05, x: -27, kind: 'cork', line: 'CERULEAN, I THINK, OR MAYBE TEAL', y: 6, s: 1.3, floor: true, face: false },
        { t: 21.42, x: 25, kind: 'hand', floor: true, face: false },                      // "cerulean"
        { t: 23.62, x: 25, kind: 'hand', teal: 22.4, rz: -0.3, hy: 8.0, hx: 1.6, floor: true, face: false },   // "or maybe teal"
        { t: 26.85, x: 24, kind: 'bench', book: true, floor: true, face: false },         // "something thick and Russian"
        { t: 27.6, x: -27, kind: 'cork', line: 'YOU WERE READING SOMETHING THICK AND RUSSIAN', y: 6, s: 1.3, floor: true, face: false },
      ] },
      // the ritual: out the back into the dark; keys the size of rooms; the page coming back
      { from: 0, to: 0.1, kits: ['ystKeys'], at: [
        { t: 34.2, x: 25, press: [33.26], s: 2.0 },                                       // "and I check"
        { t: 38.3, x: -25, press: [37.32], s: 2.2 },                                      // F5
        { t: 39.1, x: 25, press: [38.12], s: 2.2 },                                       // F5
        { t: 39.9, x: -25, press: [38.92], s: 2.2 },                                      // F5
        { t: 105.3, x: 25, press: [104.42], s: 2.0 },                                     // the ritual again, in the gray
        { t: 109.7, x: -25, press: [108.86], s: 2.2 },
        { t: 110.3, x: 25, press: [109.46], s: 2.2 },
        { t: 110.9, x: -25, press: [110.06], s: 2.2 },
      ] },
      { kits: ['ystSpinner'], at: 53.0, from: 40.1, to: 49.7, dy: 48, r: 30 },          // the page loading: gone the moment the chorus lands
      // the chorus: the street papered with the flyers, the seats saved
      { from: 48.5, to: 68.5, kits: ['ystStreet'], seats: 1.3, every: 0.7, clear: [[62.2, 63.4, 1]] },
      { from: 0, to: 0.1, kits: ['ystSeat'], at: 62.5, x: 20.5, s: 1.25 },                   // "I've been saving you a seat here"
      // the coffee shop on Seventh
      { from: 0, to: 0.1, kits: ['ystProps'], at: [
        { t: 70.20, x: 0, kind: 'entrance', sign: 'cafe', hh: 24, floor: true },
        { t: 74.2, x: -25, kind: 'counter', floor: true, face: false },                   // "coffee shop on Seventh"
        { t: 75.6, x: 23, kind: 'table', chairs: [[-8, 1.57]], floor: true },
        { t: 78.5, x: 23, kind: 'cream', tissue: true, floor: true, face: false },         // "crying softly by the cream"
        { t: 81.7, x: -22, kind: 'table', chairs: [[-8, 1.57], [8, -1.57]], cx: -1.5, floor: true },   // "something human"
        { t: 85.0, x: 24, kind: 'camera', rec: 83.3, floor: true },                        // "I just watched you like a scene"
        { t: 85.9, x: -25, kind: 'light', on: 83.3, floor: true },
        { t: 88.4, x: 23, kind: 'slate', clap: 87.26, floor: true },                       // "from a movie"
        { t: 90.9, x: -23, kind: 'director', floor: true },                                // "where I'm not the lead"
        { t: 93.7, x: 23, kind: 'script', floor: true },                                   // "just an extra with a line I'll never say"
        { t: 94.5, x: -25, kind: 'light', on: 93.3, floor: true },
        { t: 97.7, x: -27, kind: 'cork', line: "I'VE WRITTEN YOU A HUNDRED ENDINGS", y: 6, s: 1.3, floor: true, face: false },
        { t: 100.9, x: 27, kind: 'cork', line: 'BUT I LIKE YOU BETTER IN THE FADE', y: 6, s: 1.3, floor: true, face: false },
      ] },
      { from: 94.6, to: 103.0, kits: ['ystCrumples'], start: 95.6, spread: 4.2, n: 120 },     // the hundred endings
      // the ritual again, in the gray: nothing out there
      { kits: ['ystSpinner'], at: 124.2, from: 111.5, to: 120.9, dy: 48, r: 30 },
      // the second chorus
      { from: 119.5, to: 139.5, kits: ['ystStreet'], seats: 1.2, every: 0.65, clear: [[132.0, 133.2, -1]] },
      { from: 0, to: 0.1, kits: ['ystSeat'], at: 132.6, x: -20.5, s: 1.25, coat: false },
      // inside the screen: I found your name
      { from: 139.9, to: 173.5, kits: ['ystGrid'], on: 139.9, lead: 7, fall: 172.84, hand: 149.6, handSide: 1, x: 23, every: 0.34, clear: [[160.6, 162.6, -1], [162.6, 164.6, 1]] },
      { from: 0, to: 0.1, kits: ['ystNet'], at: 160.0, on: 150.5, off: 168.4, y: 80, depth: 40, n: 24 },
      { from: 0, to: 0.1, kits: ['ystProps'], at: [
        { t: 161.6, x: -34, kind: 'school', s: 1.1 },                                      // "where you went to school"
        { t: 163.6, x: 30, kind: 'cake', s: 1.4 },                                          // "your birthday"
      ] },
      { from: 0, to: 0.1, kits: ['ystBubble'], at: 166.5, at2: 170.4, stop: 168.35, del: 170.6, y: 16, s: 1.7 },   // "I could message you right now"
      // start again: the night street at full tilt, the places we didn't meet gone dark, the doors
      { from: 173.5, to: 257.4, kits: ['ystStreet'], every: 0.75, seats: 2.2, clear: [[194.6, 197.6, 0], [201.0, 207.0, 0]], flip: [224.0, 258.0, 1.3], out: [245.2, 258.0, 1.1] },
      { from: 0, to: 0.1, kits: ['ystProps'], at: [
        { t: 195.4, x: -30, kind: 'store', sign: 'laundry', lit: 0.0 },                    // "without the almost"
        { t: 197.0, x: 30, kind: 'store', sign: 'cafe', lit: 0.0 },                        // "without the place we didn't meet"
      ] },
      { from: 201.4, to: 206.6, kits: ['ystDoors'], every: 0.55, x: 23, s: 1.25 },          // "you're better as a door I'll never open"
      { from: 0, to: 0.1, kits: ['ystSeat'], at: 220.4, x: 20.5, s: 1.25 },                   // the seat, still saved
      // the coffee shop at closing: chairs up, the table in the back
      { from: 257.9, to: 290, kits: ['ystClosing'], every: 0.75, x: 22, clear: [[265.5, 266.9, -1], [271.0, 272.3, 1], [275.4, 276.8, -1], [279.6, 291.0, 0]] },
      { from: 0, to: 0.1, kits: ['ystProps'], at: [
        { t: 257.33, x: 0, kind: 'entrance', sign: 'cafe', hh: 24, floor: true },
        { t: 266.2, x: -35, kind: 'cork', line: 'POSTED FROM A TABLE IN THE BACK', y: 6, s: 1.4, floor: true, face: false },
        { t: 271.6, x: 35, kind: 'cork', line: "WHERE NO ONE'S GONNA FIND ME", y: 6, s: 1.4, floor: true, face: false },
        { t: 276.1, x: -35, kind: 'cork', line: "AND THAT'S THE POINT", y: 6, s: 1.4, floor: true, face: false },
      ] },
      // every line, on a flyer
      { from: 0, to: 0.1, kits: ['ystFlyers'] },
    ],
    roads: [
      { x: 0, width: 20, walk: 8, laneLines: 1, from: -10, to: 1.1, lanes: [-4.5, 4.5], density: 0.1, lampEvery: 30 },
      { x: 0, width: 20, walk: 8, laneLines: 1, from: 48.5, to: 68.5, lanes: [-4.5, 4.5], density: 0.16, lampEvery: 30 },
      { x: 0, width: 20, walk: 8, laneLines: 1, from: 119.5, to: 139.7, lanes: [-4.5, 4.5], density: 0.16, lampEvery: 30 },
      { x: 0, width: 20, walk: 8, laneLines: 1, from: 173.5, to: 257.5, lanes: [-4.5, 4.5], density: 0.14, lampEvery: 30 },
    ],
    // the lines, each where he sings it (t), on a pole by the road, or a dark card inside the screen
    ystFlyers: [
      { t: -0.3, text: 'MISCONNECTION:\nLAUNDROMAT, TUESDAY NIGHT', side: 1, x: 22, lead: 0, doodle: 'washer' },
      { t: 32.6, text: "AND I CHECK LIKE IT'S A RITUAL", side: -1, screen: true, pole: false },
      { t: 40.7, text: 'LIKE REFRESHING IS A FORM OF FAITH', side: 1, screen: true, pole: false },
      { t: 43.8, text: 'LIKE WAITING KEEPS THE DREAM ALIVE', side: -1, screen: true, pole: false },
      { t: 50.0, text: 'IF YOU SEE THIS', side: 1, doodle: 'heart' },
      { t: 52.4, text: "I'M STILL STANDING WHERE YOU LEFT ME", side: -1 },
      { t: 56.4, text: 'MEET ME IN THE PLACE WE ALMOST MET', side: 1, doodle: 'door' },
      { t: 60.4, text: "I'VE BEEN SAVING YOU A SEAT HERE", side: -1, doodle: 'chair' },
      { t: 64.6, text: "I'M STILL WAITING.\nI'M NOT READY YET", side: 1 },
      { t: 69.2, text: 'MISCONNECTION:\nCOFFEE SHOP ON SEVENTH', side: 1, x: 21, lead: 0, doodle: 'cup' },
      { t: 4.5, text: 'YOU WERE FOLDING CHAOS INTO SQUARES', cork: true },
      { t: 20.3, text: 'CERULEAN, I THINK, OR MAYBE TEAL', cork: true, doodle: 'none', ink: '#1a4aa8' },
      { t: 24.0, text: 'YOU WERE READING SOMETHING THICK AND RUSSIAN', cork: true, doodle: 'none' },
      { t: 96.6, text: "I'VE WRITTEN YOU A HUNDRED ENDINGS", cork: true },
      { t: 100.2, text: 'BUT I LIKE YOU BETTER IN THE FADE', cork: true },
      { t: 111.4, text: 'LIKE REFRESHING IS A SACRAMENT', side: 1, screen: true, pole: false },
      { t: 114.6, text: 'LIKE THE VOID MIGHT ANSWER IF I TRY', side: -1, screen: true, pole: false },
      { t: 121.1, text: 'IF YOU SEE THIS', side: -1, doodle: 'heart' },
      { t: 127.6, text: 'MEET ME IN THE PLACE WE ALMOST MET', side: -1, doodle: 'door' },
      { t: 142.3, text: 'MISCONNECTION:\nI FOUND YOUR NAME', side: -1, screen: true, pole: false, x: 17.5 },
      { t: 147.4, text: 'IT WASN\'T HARD.\nYOU HAVE UNUSUAL HANDS', side: 1, screen: true, pole: false, x: 17.5 },
      { t: 150.4, text: 'THE ALGORITHM DID THE WORK FOR ME', side: -1, screen: true, pole: false, x: 17.5 },
      { t: 166.0, text: 'I COULD MESSAGE YOU RIGHT NOW AND END THIS', side: -1, screen: true, pole: false, x: 17.5 },
      { t: 182.5, text: "HERE'S THE THING I'LL NEVER POST", side: -1 },
      { t: 184.7, text: "I DON'T WANNA FIND YOU", side: 1 },
      { t: 186.3, text: 'I WANNA WANNA FIND YOU', side: -1 },
      { t: 188.6, text: 'I WANT THE LOOK AND NOT THE LIGHT', side: 1 },
      { t: 198.4, text: "YOU'RE BETTER AS A QUESTION I KEEP ASKING", side: -1 },
      { t: 208.7, text: 'WHERE I GET TO KEEP YOU PERFECT', side: 1 },
      { t: 221.0, text: "THE PLACE WE'LL NEVER MEET", side: -1 },
      { t: 225.2, text: "I DON'T WANT YOU TO SEE THIS", side: 1, flip: 227.3 },
      { t: 245.7, text: "DON'T FIND ME YET", side: -1, flip: 247.9 },
      { t: 263.9, text: 'POSTED FROM A TABLE IN THE BACK', cork: true },
      { t: 270.1, text: "WHERE NO ONE'S GONNA FIND ME", cork: true },
      { t: 273.8, text: "AND THAT'S THE POINT", cork: true },
    ],
    shelf: 60, drop: 5,
    finale: { kind: 'yst', t: 283.9, x: -20, s: 0.8, rot: -1.57, orbit: { r: 40, h: 8, y: 8, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.34, heroBack: 12, heroSide: 1.2, heroFov: 44, heroUp: 7.0, heroTilt: 1.6 } },   // the table in the back
  },
};
