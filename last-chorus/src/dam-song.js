// Don't Anybody Move: its course, its looks, its moments and what stands along the way. (album.js
// puts it in the record; the place itself is in dam-world.js, its things in dam-sets.js, its people
// in dam-crowd.js.)

export const palettes = {
  // her street on a June night: porch lights, the dollar lights, a warm sky over the roofs
  damStreet: {
    zenith: 0x060a1e, horizon: 0x2a1e3a, skyGlow: 0xc86a5a, glowDir: [0.25, 0.05, 1], skyline: 0x0c0a16, moonDir: [-0.35, 0.55, 0.75], moon: 0xfff0d8,
    fog: 0x160f1c, fogDensity: 0.0017, stars: 0.6, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.4,
    ground: 0x16141a, street: 0xffb870, roof: 0x241c26, wall: 0x3a3440, tree: 0x0e1410,
    window: 0xffc880, windowAlt: 0xff9ab0, lamp: 0xffc070,
    ribbon: 0x1c1418, edge: 0xfff2e2, fret: 0xffc070, glow: 0xffa860, hold: 0xff9a3a, gate: 0xffffff, gem: 0xfff0d0,
    skyLight: 0x9a8aa8, bounce: 0x3a2a2a, hemiK: 1.8, sunK: 0.6,
    board: 0x16120e, suit: 0x1a1a22, jacket: 0xe8604a, hair: 0x1a120a, shoes: 0xf4ece0, gloves: 0x1a1a22, rim: 0xffd0a0, daze: 0,
  },
  // in her house: lamps on, warm, the kitchen brighter
  damHome: { fog: 0x24160f, fogDensity: 0.0021, skyLight: 0xffe0c0, bounce: 0x6a4030, hemiK: 1.9, glow: 0xffb070, hold: 0xff9a3a },
  damKitchen: { fog: 0x2a2018, fogDensity: 0.002, skyLight: 0xfff2e0, bounce: 0x7a5a40, hemiK: 2.05, glow: 0xffc080, hold: 0xffa040 },
  // the living room with the party in it: pink and gold, the cheap disco light
  damParty: { fog: 0x24101c, fogDensity: 0.0021, skyLight: 0xffc0b8, bounce: 0x6a2a44, hemiK: 1.85, glow: 0xff7ab0, hold: 0xff5a9a, fret: 0xffc070, edge: 0xfff0f4 },
  // a hum under the boards: the light comes up between them
  damHum: { fog: 0x2a1408, fogDensity: 0.0022, skyLight: 0xffb080, bounce: 0x8a3a10, hemiK: 1.7, glow: 0xffa040, hold: 0xff8a20 },
  // the back yard: string lights in zigzags, the neighbours' yards dark over the fence
  damYard: {
    zenith: 0x05081a, horizon: 0x24203a, skyGlow: 0xff8a5a, fog: 0x120e1a, fogDensity: 0.0016, stars: 0.7, windowK: 1.3,
    skyLight: 0x9a8ab8, bounce: 0x2a3020, hemiK: 1.75, glow: 0xffb060, hold: 0xff9a3a, fret: 0xffd080,
  },
  // the party out in the street: every porch lit, the lights strung across
  damBlock: {
    zenith: 0x080a22, horizon: 0x3a2040, skyGlow: 0xff6a8a, fog: 0x1a1020, fogDensity: 0.0016, stars: 0.5, windowK: 1.7,
    skyLight: 0xb08ab8, bounce: 0x4a2a3a, hemiK: 1.85, glow: 0xff7ab0, hold: 0xff5a9a, fret: 0xffc070,
  },
  // the photo in her hallway: a bad flash some June, faces blown white, everything behind them black
  damPhoto: {
    zenith: 0x040302, horizon: 0x0c0a08, skyGlow: 0x2a2018, skyline: 0x050404, moon: 0xfff8f0, moonDir: [0.1, 0.35, 0.93], glowDir: [0.1, 0.2, 1],
    fog: 0x0a0806, fogDensity: 0.0042, stars: 0, windowK: 0.4,
    skyLight: 0xfff8f0, bounce: 0xd8c8b8, hemiK: 2.7, sunK: 2.2,
    ribbon: 0x2a2420, edge: 0xffffff, fret: 0xfff4e8, glow: 0xfff4e0, hold: 0xffe0b0, gate: 0xffffff, gem: 0xffffff,
  },
  // her hallway after it, all her photographs on the walls
  damMine: { fog: 0x1e140e, fogDensity: 0.002, skyLight: 0xffd8b0, bounce: 0x5a3a28, hemiK: 1.8, glow: 0xffc080, hold: 0xffa040 },
  // the last chorus: the walls are down, the whole street is the party
  damOpen: {
    zenith: 0x0a0a28, horizon: 0x4a2448, skyGlow: 0xff7a7a, fog: 0x1e1022, fogDensity: 0.0014, stars: 0.6, windowK: 1.8,
    skyLight: 0xc898c0, bounce: 0x4a2a40, hemiK: 1.95, glow: 0xff8ab8, hold: 0xff6aa8, fret: 0xffd080, edge: 0xfff4f8,
  },
};

const DDOOR = { kind: 'wall', hw: 12, hh: 27 };
const FRONT = { kind: 'front', hw: 13, hh: 27 };
// stopped dead: the flash has gone off, the colour's gone a little out of everything
const HOLD = { skyLight: 0xb4bcd8, bounce: 0x2a2a3a, glow: 0xdfe6ff, hold: 0xc8d4ff, fret: 0xdfe6ff, edge: 0xffffff };

export const song = {
  // Her house on the night of her party. Her street in June, everything standing still until the band
  // comes in (the sprinkler's water hanging in the air, the guests stopped on the lawns); the cooler
  // of good ice at the curb; under the dollar lights and in at her door: the set list on the fridge
  // with three songs crossed off, the shoes, the coats asleep on her bed, someone crying happy in the
  // hall, two strangers wedged in the kitchen doorway; the hum coming up between the floorboards, the
  // dollar lights dark along the walls until the match is struck and they catch like a fuse, and the
  // chorus in the living room where somebody's having the best night of their life. Hands up for the
  // stick-up, the bowl of everyone's car keys, and on "don't anybody move" the flash goes off and
  // nothing moves but her: the road goes still too. The girl mid-story, the guy at her sink with his
  // road map, the yard, the one who almost cancelled, the smoke alarm (the good kind), a couple in the
  // hallway, and out the front door: the party in the street. The photo in her hallway, and in through
  // its cheap frame: a bad flash some June, everyone blurry and laughing, her half out of the picture
  // with both hands full, checking the door; out through the brown card on its back; all her
  // photographs; the last chorus with the walls down, the last flash, and "okay, everybody move". At
  // the end her porch, everyone on the steps, and the camera on its timer.
  id: 'dont-anybody-move',
  accent: '#ffa860',
  title: "Don't Anybody Move",
  // (the analysis put the bar line a beat early: the kick, the snare and every time the band comes
  // back in say the bar starts on beat 0 of the tracked grid)
  downbeat: 0,
  startY: 10,
  collect: 'cup',
  sections: [
    { t: 0.0, kind: 'intro', amp: 0, endY: 10 },                                       // "don't anybody move": her street, stopped
    { t: 7.72, kind: 'post', start: 'launch', kick: 9, endY: 12 },                     // the band: everything moves
    { t: 12.27, kind: 'verse', endY: 11 },                                              // "bought the good ice": up her street
    { t: 19.84, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                          // in at her door: "taped a set list to the fridge door"
    { t: 24.38, kind: 'verse', c: 0.85, endY: 12, turn: 0.3 },                          // "shoes off, coats asleep on my bed"
    { t: 30.43, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                           // "two strangers wedged in the kitchen doorway"
    { t: 36.48, kind: 'pre', endY: 20, turn: 0.3 },                                     // "there's a hum beneath the floorboards"
    { t: 48.58, kind: 'chorus', start: 'launch', kick: 10, endY: 11, turn: 0.4 },       // "match": in this room right now tonight
    { t: 60.63, kind: 'chorus', c: 1.3, endY: 11, turn: 0.4 },                          // "it's you": the band all in
    { t: 72.65, kind: 'post', endY: 12, turn: 0.4 },                                    // "this is a stick-up"
    { t: 81.68, kind: 'break', amp: 0, endY: 12, turn: 0.2 },                           // "don't anybody move": stopped dead
    { t: 84.69, kind: 'verse', start: 'launch', kick: 9, endY: 11, turn: 0.4 },         // the band back: "maybe it's the girl mid-story"
    { t: 96.73, kind: 'verse', endY: 11 },                                              // out the back: "whoever's out there dancing"
    { t: 108.77, kind: 'pre', endY: 20, turn: 0.5 },                                    // "a hum beneath the floor, boys"
    { t: 120.80, kind: 'chorus', start: 'launch', kick: 10, endY: 11 },                 // "arm": out the front door, the street
    { t: 132.84, kind: 'chorus', c: 1.35, endY: 11 },                                   // "it's you"
    { t: 144.87, kind: 'post', endY: 12 },                                              // "this is a stick-up"
    { t: 153.89, kind: 'break', amp: 0, endY: 12, turn: 0.3 },                          // "don't anybody move"
    { t: 156.90, kind: 'bridge', endY: 13, turn: 0.3 },                                 // "there's a photo in my hallway"
    { t: 162.92, kind: 'bridge', endY: 15, turn: 0.5 },                                 // in through its frame
    { t: 168.94, kind: 'post', start: 'launch', kick: 9, endY: 11, turn: 0.5 },         // "and there I am, half out of frame"
    { t: 180.98, kind: 'break', endY: 13, turn: 0.3 },                                  // "nobody knows on the night"
    { t: 190.07, kind: 'post', c: 1.1, endY: 14, turn: 0.3 },                           // "that was mine"
    { t: 199.16, kind: 'final', start: 'launch', kick: 11, endY: 11, turn: 0.4 },       // "somebody's having the best night": the walls come down
    { t: 211.23, kind: 'final', c: 1.4, endY: 11 },                                     // "so act like it's you"
    { t: 223.29, kind: 'final', c: 1.2, endY: 12 },                                     // "this is a stick-up"
    { t: 233.84, kind: 'break', amp: 0, endY: 12 },                                     // "don't anybody move"
    { t: 236.87, kind: 'final', start: 'launch', kick: 12, endY: 10, gap: true },       // "okay, everybody move"
    { t: 245.97, kind: 'outro', endY: 5 },
  ],
  rails: [
    { t: 74.16, bars: 2, x: 0 },        // "this is a stick-up, stick around"
    { t: 146.37, bars: 2, x: 0 },       // and again
  ],
  palette: 'damStreet',
  world: 'dam',
  looks: [
    // stopped until the band: a little colder, like a picture of it
    { t: -99, palette: 'damStreet', set: { skyLight: 0xb8c0e0, bounce: 0x2a2a3a, hemiK: 1.6, fog: 0x14141e, glow: 0xdfe8ff, hold: 0xc8d4ff, fret: 0xdfe8ff, edge: 0xffffff, windowK: 0.9 } },
    { t: 7.72, palette: 'damStreet', fade: 0.12 },                     // the band: everything moves
    { t: 19.95, palette: 'damKitchen', fade: 0.35 },                   // in at her door
    { t: 24.5, palette: 'damHome', fade: 0.35 },
    { t: 36.6, palette: 'damHum', fade: 2.5 },                         // the hum under the boards
    { t: 48.58, palette: 'damParty', fade: 0.15 },                     // the match: the lights catch
    { t: 82.07, palette: 'damParty', fade: 0.06, set: HOLD },          // "don't anybody move"
    { t: 85.06, palette: 'damParty', fade: 0.12 },
    { t: 89.3, palette: 'damKitchen', fade: 0.35 },
    { t: 96.85, palette: 'damYard', fade: 0.35 },                      // out the back
    { t: 111.9, palette: 'damHome', fade: 0.35 },                      // in again: the hallway
    { t: 120.8, palette: 'damBlock', fade: 0.2 },                      // out the front: the street
    { t: 154.27, palette: 'damBlock', fade: 0.06, set: HOLD },         // "don't anybody move"
    { t: 157.0, palette: 'damMine', fade: 0.3 },                       // "there's a photo in my hallway"
    { t: 162.92, palette: 'damPhoto', fade: 0.1 },                     // in through its frame: the bad flash
    { t: 181.0, palette: 'damMine', fade: 0.3 },                       // out the back of it
    { t: 199.3, palette: 'damParty', fade: 0.25 },
    { t: 204.6, palette: 'damOpen', fade: 1.0 },                       // the walls come down
    { t: 233.84, palette: 'damOpen', fade: 0.06, set: HOLD },          // "don't anybody move"
    { t: 236.87, palette: 'damOpen', fade: 0.12 },                     // "okay, everybody move"
  ],
  moments: [
    { t: 1.42, kind: 'shutter', k: 0.45 },              // "don't anybody move": the picture
    { t: 7.72, kind: 'flash', k: 0.25 },                // the band: everything moves
    { t: 48.58, kind: 'flash', k: 0.3 },                // "match"
    { t: 82.07, kind: 'shutter', k: 0.55 },             // "don't anybody move"
    { t: 85.06, kind: 'flash', k: 0.2 },                // the band back
    { t: 120.80, kind: 'flash', k: 0.25 },              // out the front door
    { t: 154.27, kind: 'shutter', k: 0.55 },            // "don't anybody move"
    { t: 162.92, kind: 'shutter', k: 0.65 },            // in through the frame: the bad flash
    { t: 199.16, kind: 'flash', k: 0.25 },
    { t: 203.69, kind: 'impact', k: 0.45 },             // the walls come down
    { t: 203.69, kind: 'fireworks', n: 8, y: 46, ahead: 1.8 },
    { t: 233.84, kind: 'shutter', k: 0.6 },             // "don't anybody move"
    { t: 236.87, kind: 'flash', k: 0.45 },              // "okay, everybody move"
    { t: 236.87, kind: 'fireworks', n: 12, y: 50, ahead: 1.6 },
    { t: 247.49, kind: 'fireworks', n: 8, y: 44, ahead: 1.6 },
  ],
  confetti: [[236.87, 247.4]],
  scenery: {
    // where the band drops out and everything stops, to where it comes back
    stops: [[-99, 7.72], [82.07, 85.06], [154.27, 156.90], [233.84, 236.87]],
    hum: [[36.48, 48.58], [109.0, 114.3]],          // the hum under the floorboards
    dark: [33.45, 89.2], catchAt: 48.58,             // the living room's lights, dark until the match
    photoSpan: [162.92, 180.98],
    handsUp: [[73.08, 81.68], [145.66, 153.89], [223.48, 233.84]],   // "this is a stick-up"
    shelf: 60, drop: 4,
    rooms: [
      { style: 'kitchen', from: 19.84, to: 24.38, caps: [FRONT, DDOOR] },                                 // in at her front door
      { style: 'bedroom', from: 24.38, to: 27.40, caps: [null, DDOOR] },
      { style: 'hall', from: 27.40, to: 33.45, caps: [null, { kind: 'wall', hw: 12, hh: 27 }] },          // the kitchen doorway, two strangers in it
      { style: 'living', from: 33.45, to: 89.20, caps: [null, DDOOR] },
      { style: 'kitchen', from: 89.20, to: 96.73, caps: [null, { kind: 'wall', hw: 13, hh: 28 }] },       // the back door
      { style: 'hall', from: 111.77, to: 120.80, caps: [FRONT, { kind: 'wall', hw: 13, hh: 28 }] },       // in the back, out the front
      { style: 'hall', from: 156.90, to: 162.92, caps: [FRONT, { kind: 'wall', hw: 20, hh: 26 }] },       // the photo at the end of the hall
      { style: 'photo', from: 162.92, to: 180.98, caps: [null, null] },                                    // inside it
      { style: 'mine', from: 180.98, to: 199.16, caps: [null, DDOOR] },                                   // all her photographs
      { style: 'living', from: 199.16, to: 207.5, caps: [null, null], fallAt: 203.69, fallFor: 1.8 },     // the walls come down
    ],
    zones: [
      { from: -8, to: 19.7, kits: ['damStreet'], x: 27, s: 1.9 },                                         // her street
      { from: 96.73, to: 111.8, kits: ['damYard'], fence: 48 },                                            // the yard
      { from: 120.8, to: 156.95, kits: ['damStreet'], x: 34, s: 1.6 },                                    // the street, the party in it
      { from: 196, to: 246, kits: ['damStreet'], x: 50, s: 1.7 },                                         // where the walls were
      { from: 246, to: 262, kits: ['damStreet'], x: 50, s: 1.7, side: 1 },                                // (her side clear for her porch)
      // the dollar lights strung across: her street, the yard, the party street, the end
      { from: 15.6, to: 19.7, kits: ['damLights'], every: 0.5, above: 8, hw: 26, n: 14, pole: 6, bulb: 10 },
      { from: 97.2, to: 111.4, kits: ['damLights'], every: 0.7, above: 9, hw: 40, n: 18, pole: 6, bulb: 10 },
      { from: 121.2, to: 156.6, kits: ['damLights'], every: 0.7, above: 10.5, hw: 30, n: 16, pole: 6, bulb: 10 },
      { from: 207.8, to: 250, kits: ['damLights'], every: 0.7, above: 10.5, hw: 32, n: 16, pole: 6, bulb: 10 },
      { from: 0, to: 0.1, kits: ['damDisco'], at: 59.6, s: 12, top: 27, wall: 35.4 },                     // in this room right now tonight
      { from: 0, to: 0.1, kits: ['damDisco'], at: 202.3, s: 12, top: 27, wall: 35.4 },
      { from: 0, to: 0.1, kits: ['damPhotoFrame'], at: 162.92 },                                          // "cheap frame, bad flash, some June"
      { from: 0, to: 0.1, kits: ['damPhotoBack'], at: 180.98 },                                           // out the back of it
      { from: 204, to: 239, kits: ['damConfetti'], every: 1.2, n: 24, hw: 40, top: 40 },                  // the last chorus's confetti (hung in the air when it all stops)
      { from: 0, to: 0.1, kits: ['damProps'], at: [
        { t: 3.2, x: -21, kind: 'sprinkler', s: 11 },                    // the lawns, stopped
        { t: 9.6, x: 22, kind: 'sprinkler', s: 11 },
        { t: 11.3, x: -19, kind: 'mailbox', s: 6 },                      // balloons on her mailbox
        { t: 13.7, x: 20, kind: 'cooler', s: 7 },                        // "bought the good ice, the crushed kind"
        { t: 21.9, x: -22, kind: 'fridge', s: 12, list: 3, floor: true },  // "taped a set list to the fridge door", "survived three songs"
        { t: 23.4, x: 21, kind: 'counter', s: 12, floor: true },
        { t: 25.0, x: 22, kind: 'shoes', s: 11, floor: true },           // "shoes off"
        { t: 26.8, x: -25, kind: 'bed', s: 12, floor: true },            // "coats asleep on my bed"
        { t: 48.2, x: 20, kind: 'match', s: 26, strike: 48.58, floor: true },   // "just ask them for a match"
        { t: 52.0, x: -29, kind: 'couch', s: 12, face: false, floor: true },     // pushed back for the dancing
        { t: 55.6, x: 29, kind: 'speaker', s: 12, floor: true },
        { t: 68.4, x: -29, kind: 'speaker', s: 12, floor: true },
        { t: 80.6, x: 19, kind: 'keys', s: 12, floor: true },            // "nobody's going home the same"
        { t: 90.9, x: -22, kind: 'fridge', s: 12, list: 8, floor: true },  // more of the set survived
        { t: 95.2, x: 23, kind: 'sink', s: 12, floor: true },            // "just to lean against my sink"
        { t: 99.8, x: -30, kind: 'pool', s: 9 },                         // the yard
        { t: 101.6, x: 31, kind: 'grill', s: 9 },
        { t: 103.4, x: -33, kind: 'chairs', s: 9 },
        { t: 113.4, x: 0, kind: 'alarm', s: 20, y: 27.9, floor: true, rot: 0 },   // "the good kind of alarm"
        { t: 127.2, x: -24, kind: 'cooler', s: 7 },                      // the party in the street
        { t: 133.4, x: 28, kind: 'chairs', s: 7 },
        { t: 138.4, x: -27, kind: 'speaker', s: 8 },
        { t: 171.0, x: 20, kind: 'edge', s: 1, floor: true, rot: 0 },     // the edge of the picture, through her
        { t: 171.0, x: 20, kind: 'load', s: 11, floor: true, rot: Math.PI },     // both hands full
        { t: 175.4, x: -24, kind: 'door', s: 11, floor: true },          // the door she's checking
        { t: 177.0, x: 22, kind: 'ice', s: 11, floor: true },            // "I was worried about the ice"
        { t: 179.0, x: -23, kind: 'cups', s: 12, floor: true, stacks: 5 },   // "I was counting cups"
      ] },
    ],
    // the party: people standing about, then dancing (on her floor indoors, on the ground outside)
    crowd: [
      { from: 1.2, to: 19.4, every: 1.5, n: 1, x: [22, 30], s: [8.5, 9.8], mode: 'stand', ground: true },   // arriving
      { from: 20.4, to: 24.2, every: 0.9, n: 1, x: [17, 25], s: [9.5, 10.5], mode: 'stand' },
      { from: 34.2, to: 48.3, every: 0.8, n: 1, x: [17, 30], s: [9.5, 10.5], mode: 'stand' },
      { from: 49.4, to: 88.6, every: 0.42, n: 2, x: [15, 32], s: [9.5, 11], mode: 'mix' },                  // in this room right now tonight (and stopped in it)
      { from: 89.6, to: 94.2, every: 1.1, n: 1, x: [17, 25], s: [9.5, 10.5], mode: 'stand' },
      { from: 97.3, to: 109.2, every: 0.5, n: 2, x: [16, 40], s: [9, 10.5], mode: 'mix', ground: true },   // whoever's out there dancing
      { from: 112.2, to: 116.6, every: 1.1, n: 1, x: [16, 23], s: [9.5, 10.5], mode: 'stand' },
      { from: 121.6, to: 156.6, every: 0.45, n: 2, x: [15, 30], s: [9, 10.5], mode: 'mix', ground: true },  // the street
      { from: 199.6, to: 207.4, every: 0.45, n: 2, x: [15, 32], s: [9.5, 11], mode: 'mix' },
      { from: 207.6, to: 247, every: 0.45, n: 2, x: [15, 36], s: [9, 10.5], mode: 'mix', ground: true },    // everybody
    ],
    // the ones she sings about
    people: [
      { t: 29.4, x: 18, kind: 'crier' },                 // "someone's crying happy in the hall"
      { t: 33.3, x: 9.6, kind: 'strangers' },            // "two strangers wedged in the kitchen doorway"
      { t: 87.4, x: -19, kind: 'story' },                // "the girl mid-story, too busy for her drink"
      { t: 95.2, x: 16.5, kind: 'sink' },                // "the guy who drove four hours just to lean against my sink"
      { t: 106.3, x: 21, kind: 'stunned', ground: true },   // "the one who almost cancelled, standing stunned they ever stayed"
      { t: 118.2, x: 18, kind: 'couple' },               // "somebody's future's in my hallway, wearing someone else's arm"
      { t: 171.0, x: 20, kind: 'her', photo: true, s: 11, turn: Math.PI },  // "and there I am, half out of frame, both hands full, checking the door"
    ],
    // the photograph: everyone she loves, blurry and laughing
    photoCrowd: [{ from: 163.6, to: 180.4, every: 0.8, n: 2, x: [14, 34], s: [9.5, 11] }],
    lyricPart: 'damSign', lyricX: 26, lyricS: 1.2, lyricBg: '#141414', lyricColor: '#f4f0e6', lyricCore: '#ffffff', lyricFont: '"Archivo Black", "Arial Black", sans-serif',
    lyrics: [
      { t: 0.0, text: "DON'T ANYBODY MOVE", lead: 2.6, h: 6 },
      { t: 36.72, text: "THERE'S A HUM\nBENEATH THE FLOORBOARDS", floor: true },
      { t: 45.24, text: 'JUST ASK THEM\nFOR A MATCH', floor: true },
      { t: 49.64, text: "SOMEBODY'S HAVING THE\nBEST NIGHT OF THEIR LIFE", floor: true },
      { t: 56.18, text: "AND I'LL NEVER KNOW,\nBUT I HOPE IT'S YOU", floor: true },
      { t: 73.08, text: 'THIS IS A STICK-UP,\nSTICK AROUND', floor: true },
      { t: 79.0, text: "NOBODY'S GOING\nHOME THE SAME", floor: true, lead: 0.6 },
      { t: 114.9, text: "SOMEBODY'S FUTURE'S\nIN MY HALLWAY", floor: true, lead: 0.9 },
      { t: 157.14, text: "THERE'S A PHOTO\nIN MY HALLWAY", floor: true, lead: 1.0 },
      { t: 169.30, text: 'AND THERE I AM,\nHALF OUT OF FRAME', floor: true, x: 30 },
      { t: 184.02, text: 'YOU ONLY EVER KNOW\nFROM THE FAR SIDE OF YOUR LIFE', floor: true },
      { t: 190.46, text: 'THAT WAS MINE', floor: true },
      { t: 206.92, text: "AND YOU'LL NEVER KNOW,\nSO ACT LIKE IT'S YOU" },
      { t: 237.42, text: 'OKAY, EVERYBODY MOVE', lead: 1.0 },
    ],
    finale: { kind: 'dam', t: 254.2, x: -70, s: 2.6, rot: -Math.PI / 2, fireAt: 251.0, group: { n: 8, s: 7.5, dx: 32 }, orbit: { r: 120, h: 12, y: 18, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 11, heroFov: 46, heroUp: 2 } },
  },
};
