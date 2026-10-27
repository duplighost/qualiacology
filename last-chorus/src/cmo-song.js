// CUT ME OFF: its course, its looks, its moments and what stands along the way. (album.js puts it in
// the record; the place itself is in cmo-world.js, its things in cmo-props.js.)

// the bar's doorways: the front door off the street, the gap in the tinsel at the back of the stage
const FRONT = { kind: 'front', hw: 14, hh: 28 };
const CURTAIN = { kind: 'wall', hw: 14, hh: 30 };
const STAGEDOOR = { kind: 'wall', hw: 13, hh: 30 };

export const palettes = {
  // every look starts from this one (dry: only the street's looks rain)
  cmoNight: {
    zenith: 0x040308, horizon: 0x1a0e22, skyGlow: 0x7a2a5a, glowDir: [0.2, 0.06, 1], skyline: 0x0a0810, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8d0f0,
    fog: 0x140c18, fogDensity: 0.0019, stars: 0, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.3,
    ground: 0x120e14, street: 0xff5a8a, roof: 0x1a141c, wall: 0x2a2028, tree: 0x0c0c0e,
    window: 0xffb070, windowAlt: 0x5ae0ff, lamp: 0xffb070,
    ribbon: 0x18101a, edge: 0xffe4d0, fret: 0xff6a9a, glow: 0xff4a7a, hold: 0xff3a6a, gate: 0xffffff, gem: 0xffd860,
    skyLight: 0x7a6a9a, bounce: 0x3a1a2a, hemiK: 1.7, sunK: 0.5,
    board: 0x16101a, suit: 0x16121a, jacket: 0xd8a040, hair: 0x1a120a, shoes: 0xf0e0c0, gloves: 0x16121a, rim: 0xffc8a0, daze: 0,
  },
  // the street in the rain at night, neon in the puddles
  cmoStreet: { rain: 0.75 },
  // inside the Corner Bar: amber, smoke, the back bar lit
  cmoBar: { fog: 0x1c0f08, fogDensity: 0.0024, rain: 0, skyLight: 0xffc890, bounce: 0x5a2a14, hemiK: 1.8, sunK: 0.5, glow: 0xffa040, hold: 0xff8a2a, fret: 0xffb868, edge: 0xfff0d8, ribbon: 0x1a1008, street: 0xffb070, gem: 0xffd860, skyGlow: 0xff8a3a },
  // the stage, as big as she sings it: gold, black, the spots
  cmoGold: { zenith: 0x000000, horizon: 0x0a0602, skyGlow: 0xffb030, fog: 0x0c0804, fogDensity: 0.0015, rain: 0, skyLight: 0xffd890, bounce: 0x6a4010, hemiK: 2.0, sunK: 0.7, glow: 0xffd040, hold: 0xffb420, fret: 0xffe080, edge: 0xfff6e0, ribbon: 0x0e0a06, gem: 0xfff0b0 },
  // the chorus over: the gold lowering
  cmoLow: { fog: 0x0a0604, fogDensity: 0.002, skyLight: 0xa08060, bounce: 0x3a2010, hemiK: 1.4, glow: 0xd09040, hold: 0xd08030, fret: 0xe0b070 },
  // out in the rain: cold, the bar's light from across the street
  cmoRain: { zenith: 0x05070c, horizon: 0x101828, skyGlow: 0x2a4a7a, fog: 0x0c1018, fogDensity: 0.002, rain: 1.0, skyLight: 0x6a7a9a, bounce: 0x1a2030, hemiK: 1.5, glow: 0x5ac8ff, hold: 0x4ab0ff, fret: 0x8ad8ff, edge: 0xe0f4ff, street: 0x5ac8ff, ribbon: 0x0c1016 },
  // after close: the house lights up, flat and cold, every scuff showing
  cmoHouse: { fog: 0x1a1e18, fogDensity: 0.0021, rain: 0, skyLight: 0xe8f0e0, bounce: 0x4a4e44, hemiK: 2.1, glow: 0xd8f0c8, hold: 0xb8e0a0, fret: 0xe0f0d0, edge: 0xffffff, ribbon: 0x1a1c18, skyGlow: 0xc8e0c0 },
  // the ghosts going out the back
  cmoGhost: { fog: 0x141a22, skyLight: 0xb8c8e8, bounce: 0x3a4250, hemiK: 1.9, glow: 0x9ab8ff, hold: 0x8aa8ff, fret: 0xc0d0ff },
  // her last quarter: the room down to one light
  cmoQuarter: { fog: 0x060404, fogDensity: 0.0022, skyLight: 0x6a5a40, bounce: 0x1a1008, hemiK: 1.2, glow: 0xffd060, hold: 0xffc040, fret: 0xffe090, ribbon: 0x0a0806 },
  // the last chorus, going down blinding
  cmoBlind: { zenith: 0x080602, horizon: 0x2a1c08, skyGlow: 0xfff0c0, fog: 0x1a1408, fogDensity: 0.0013, skyLight: 0xfff0d0, bounce: 0x8a6a30, hemiK: 2.4, sunK: 0.9, glow: 0xfff0b0, hold: 0xffe080, fret: 0xfff4d0, edge: 0xffffff, ribbon: 0x14100a, gem: 0xffffff },
  // cut off: the stage dropped to nothing for a beat
  cmoCut: { fog: 0x020202, skyLight: 0x504030, bounce: 0x100804, hemiK: 1.0, glow: 0xffc060 },
  // the end: the lights out, the jukebox's colours on the dark
  cmoDark: { zenith: 0x000000, horizon: 0x040208, skyGlow: 0x3a1a3a, fog: 0x030204, fogDensity: 0.0026, skyLight: 0x2a2434, bounce: 0x0a0810, hemiK: 0.9, sunK: 0.2, glow: 0xff7a4a, hold: 0xff6a3a, fret: 0xb07aff, edge: 0x9a8aa8, ribbon: 0x060508, gem: 0xffb070 },
};

export const song = {
  // the Corner Bar on its last night before it changes hands. Up the street in the rain to the
  // door, in on last call: the back bar, the regulars' drinks along the bar (the brass rail),
  // the new management, her corner, the jukebox lit where she sang, the register, the meter eating
  // the quiet parts; through the gold at the back into the stage on "cut me off", over the cut in
  // the floor; out the stage door into the rain with her mic stand on the curb; back in to the
  // house band's kit and the pour; the stage again; the house lights up for teardown (the stairs'
  // banister, the ghosts of every house band going out the back door, her last quarter on the
  // bar); the last chorus cut off mid-word, then down blinding in a rain of quarters, and out.
  id: 'cut-me-off',
  accent: '#ffb040',
  title: 'CUT ME OFF',
  // (the analysis put the bar line a beat late: the chords, the bass, the kick and every time the band
  // comes back in say the bar starts on beat 2 of the tracked grid; verse one's bass just pushes each
  // change an eighth early)
  downbeat: 2,
  collect: 'coin',
  startY: 14,
  sections: [
    { t: 0.0, kind: 'intro', endY: 13 },                                                           // the street in the rain
    { t: 12.13, kind: 'verse', c: 0.9, endY: 12, turn: 0.25 },                                    // "last call came down": in at the door
    { t: 30.90, kind: 'pre', c: 0.85, endY: 19, turn: 0.25 },                                     // "every minute's money now"
    { t: 43.56, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 11, gap: true }, // "cut me off mid-chorus": through the gold, over the cut
    { t: 55.84, kind: 'chorus', c: 1.3, endY: 12 },                                               // "if it's gotta go dark"
    { t: 65.03, kind: 'break', endY: 17 },                                                        // "while I'm gold"
    { t: 68.13, kind: 'verse', start: 'launch', launchBeats: 3, kick: 9, c: 1.0, endY: 11 },      // "twice this week": out in the rain
    { t: 77.28, kind: 'break', endY: 17 },                                                        // "palm flat on the bar": the stop
    { t: 80.35, kind: 'verse', start: 'launch', launchBeats: 3, kick: 8, c: 0.95, endY: 12, turn: 0.25 },   // back in
    { t: 92.49, kind: 'pre', c: 0.9, endY: 20, turn: 0.25 },                                      // "spend me alone"
    { t: 98.59, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 11 },            // the stage again
    { t: 110.75, kind: 'chorus', c: 1.35, endY: 12 },                                             // "let it go down blinding"
    { t: 119.91, kind: 'break', endY: 14 },                                                       // "while I'm gold": the house lights come up
    { t: 122.92, kind: 'bridge', endY: 12, turn: 0.25 },                                          // "you're the one who stays for teardown"
    { t: 135.13, kind: 'post', c: 1.0, endY: 14, turn: 0.25 },                                    // "every band you ever loved"
    { t: 147.32, kind: 'break', endY: 20 },                                                       // "my last quarter on you": the stop
    { t: 150.37, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10, gap: true }, // "cut me off": the last chorus
    { t: 162.62, kind: 'final', c: 1.35, endY: 12 },                                              // "let it go down blinding"
    { t: 167.20, kind: 'break', endY: 18 },                                                       // "kill the—": cut off
    { t: 170.27, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 10 },            // "keep the change"
    { t: 191.58, kind: 'outro', endY: 5 },                                                        // cut to black
  ],
  rails: [
    { t: 21.54, bars: 2, x: 0 },        // "knew every regular's poison": the brass rail along the bar
    { t: 130.53, beats: 6, x: 0 },      // "hum the old one on the stairs": the banister (off it on the rise, over the crest)
    { t: 176.36, bars: 4, x: 0 },       // the band, all of it, under the quarters
  ],
  palette: 'cmoNight',
  world: 'cmo',
  lift: { beams: { colors: [0xffc040, 0xfff0d0, 0xff9a20], x: 30, every: 1.0, len: 120 } },
  looks: [
    { t: -99, palette: 'cmoStreet' },
    { t: 12.3, palette: 'cmoBar', fade: 0.35 },          // in at the door
    { t: 43.6, palette: 'cmoGold', fade: 0.2 },          // through the gold
    { t: 66.2, palette: 'cmoLow', fade: 1.2 },
    { t: 68.2, palette: 'cmoRain', fade: 0.25 },         // out in the rain
    { t: 80.4, palette: 'cmoBar', fade: 0.25 },          // back in
    { t: 98.65, palette: 'cmoGold', fade: 0.2 },
    { t: 120.6, palette: 'cmoHouse', fade: 1.6 },        // the house lights come up
    { t: 136.2, palette: 'cmoGhost', fade: 1.4 },        // every band carried out the back door
    { t: 140.6, palette: 'cmoHouse', fade: 1.2 },
    { t: 149.0, palette: 'cmoQuarter', fade: 0.4 },      // her last quarter
    { t: 150.4, palette: 'cmoGold', fade: 0.2 },         // the last chorus
    { t: 163.6, palette: 'cmoBlind', fade: 1.6 },        // "down blinding"
    { t: 169.0, palette: 'cmoCut', fade: 0.12 },         // cut off
    { t: 170.3, palette: 'cmoBlind', fade: 0.12 },      // "keep the change"
    { t: 191.95, palette: 'cmoDark', fade: 0.05 },       // the lights out
  ],
  moments: [
    { t: 12.90, kind: 'bell', k: 0.5 },                  // last call
    { t: 28.72, kind: 'ring', k: 0.3, dur: 0.5 },        // "coin-operated"
    { t: 33.24, kind: 'ring', k: 0.35, dur: 0.9 },       // "money": the register
    { t: 43.56, kind: 'flash', k: 0.3 },                 // through the gold
    { t: 58.62, kind: 'flash', k: 0.55 },                // "blind"
    { t: 60.70, kind: 'pop', k: 0.45, flash: 0.05 },     // "kill the encore"
    { t: 68.13, kind: 'flash', k: 0.15 },                // out into the rain
    { t: 77.68, kind: 'knock', n: 1, k: 0.8 },           // "palm flat on the bar"
    { t: 79.30, kind: 'blackout', dur: 1.25, k: 0.9 },   // you called it
    { t: 80.55, kind: 'flash', k: 0.2 },                 // back in: the band comes back an eighth after the bar line
    { t: 98.59, kind: 'flash', k: 0.3 },
    { t: 113.52, kind: 'flash', k: 0.55 },               // "blinding"
    { t: 115.78, kind: 'pop', k: 0.45, flash: 0.05 },    // "kill the encore"
    { t: 148.66, kind: 'ring', k: 0.5, dur: 1.4 },       // her last quarter lands
    { t: 150.37, kind: 'flash', k: 0.35 },               // the last chorus
    { t: 165.38, kind: 'flash', k: 0.75 },               // "blinding"
    { t: 167.62, kind: 'pop', k: 0.4, flash: 0.04 },     // "kill them"
    { t: 168.9, kind: 'blackout', dur: 1.45, k: 0.88 },  // cut off mid-chorus
    { t: 170.27, kind: 'flash', k: 0.6 },                // "keep the change"
    { t: 170.27, kind: 'fireworks', n: 8, y: 60, ahead: 1.6, x: 26 },
    { t: 176.36, kind: 'fireworks', n: 6, y: 64, ahead: 1.6, x: 26 },
    { t: 191.85, kind: 'blackout', dur: 2.6, k: 1.0 },   // and out, on the beat
    { t: 195.4, kind: 'bell', k: 0.3 },                  // last call, for good
  ],
  scenery: {
    rooms: [
      { style: 'bar', from: 12.13, to: 43.56, caps: [FRONT, CURTAIN] },        // in at the door; the gold at the back
      { style: 'stage', from: 43.56, to: 68.13, caps: [null, STAGEDOOR] },     // the stage; out the stage door
      { style: 'bar', from: 80.35, to: 98.59, caps: [FRONT, CURTAIN] },        // back in
      { style: 'stage', from: 98.59, to: 121.40, caps: [null, STAGEDOOR] },
      { style: 'after', from: 121.40, to: 150.37, caps: [null, CURTAIN] },     // after close
      { style: 'stage', from: 150.37, to: 216 },                               // the last chorus and the dark
    ],
    zones: [
      { from: -6, to: 12.2, kits: ['cmoStreet'] },
      { from: 68.5, to: 80.4, kits: ['cmoStreet'], low: true },
      { from: 12.5, to: 43.2, kits: ['cmoBar'], side: -1, clear: [[19.5, 22.6], [29.0, 32.6], [34.6, 38.2]] },
      { from: 80.6, to: 98.2, kits: ['cmoBar'], side: -1, clear: [[87.8, 91.0]] },
      { from: 43.8, to: 67.9, kits: ['cmoStage'] },
      { from: 98.8, to: 121.2, kits: ['cmoStage'] },
      { from: 150.6, to: 214, kits: ['cmoStage'] },
      { from: 121.6, to: 150.1, kits: ['cmoAfter'] },
      { from: 171.86, to: 191.85, kits: ['cmoCoinRain'] },
      { from: 0, to: 0.1, kits: ['cmoGhosts'], go: 131.0, gap: 0.4, n: 9, dur: 4.4, door: 138.6, doorX: 33 },   // across and out the door as she sings it
      { from: 0, to: 0.1, kits: ['cmoProps'], at: [
        // the street: the jukebox that's replacing her, crated at the curb; the bar's front
        { t: 7.8, x: 25, kind: 'crate', s: 1.0 },
        { t: 12.00, x: 0, kind: 'lightbox', sign: 'cmoCORNER', floor: true, y0: 33, s: 1.7, cl: [1, 0.2, 0.25] },
        { t: 11.90, x: 24, kind: 'lightbox', sign: 'cmoLIVE', floor: true, y0: 22, s: 1.0, die: 10.9, cl: [0.3, 0.9, 1], turn: 0.5 },
        // inside
        { t: 13.6, x: -34.6, kind: 'bell', face: false, floor: true, y0: 25.5, ring: 12.9, s: 1.3 },        // last call
        { t: 21.0, x: 27, kind: 'corner', floor: true, s: 1.0 },                                            // "I held this corner"
        { t: 23.6, x: -21.3, kind: 'drinks', rot: 0, floor: true, y0: 9.95, s: 1.15 },                      // "every regular's poison"
        { t: 27.6, x: 0, kind: 'banner', sign: 'cmoUNM', above: 15.5, s: 1.1 },                              // "the house was changing hands"
        { t: 30.8, x: 27, kind: 'jukebox', floor: true, riser: true, on: 28.72, micStand: true, s: 1.45 },   // "I'm coin-operated, honey"
        { t: 33.2, x: -22.2, kind: 'register', face: false, floor: true, y0: 9.95, ding: 33.24, s: 1.0 },   // "every minute's money now"
        { t: 36.4, x: 26, kind: 'pool', rot: Math.PI / 2, floor: true, s: 1.0 },                             // "the meter eats the quiet parts"
        { t: 39.8, x: -21.3, kind: 'coins', rot: 0, floor: true, y0: 9.95, s: 1.0 },                        // "spend me loud"
        // the stage
        { t: 47.7, x: -27, kind: 'tab', floor: true, s: 1.0 },                                              // "close my tab on the high note"
        { t: 51.6, x: 31, kind: 'faders', floor: true, up: 50.38, s: 0.75 },                                 // "don't you dare let me fade out slow"
        { t: 58.4, x: -27, kind: 'blinders', floor: true, blind: 58.62, s: 1.0 },                           // "let it go down blind"
        { t: 58.6, x: 27, kind: 'blinders', floor: true, blind: 58.62, s: 1.0 },
        { t: 60.6, x: -28, kind: 'kissMic', floor: true, s: 0.8 },                                          // "kiss the singer"
        { t: 61.7, x: 26, kind: 'lightbox', sign: 'cmoENCORE', floor: true, y0: 27, s: 1.2, kill: 60.70, cl: [1, 0.15, 0.2] },   // "kill the encore"
        // out in the rain, her things on the curb
        { t: 71.9, x: 24, kind: 'micRain', s: 1.2 },                                                        // "grab my mic stand"
        { t: 73.3, x: -24, kind: 'ampRain', s: 1.0 },                                                       // "and my whole set"
        { t: 80.25, x: 0, kind: 'lightbox', sign: 'cmoCORNER', floor: true, y0: 33, s: 1.7, cl: [1, 0.2, 0.25] },
        { t: 80.15, x: 24, kind: 'lightbox', sign: 'cmoLIVE', floor: true, y0: 22, s: 1.0, lit: 0.04, turn: 0.5 },
        // back in
        { t: 89.4, x: 28, kind: 'kit', sign: 'cmoKICK', floor: true, s: 1.2 },                              // "you keep the faith with house bands"
        { t: 91.4, x: -21.3, kind: 'pour', rot: 0, floor: true, y0: 9.95, s: 1.3 },                       // "you know your poisons and your pours"
        // the stage again
        { t: 102.6, x: 27, kind: 'tab', floor: true, s: 1.0 },
        { t: 106.2, x: -31, kind: 'faders', floor: true, up: 105.34, s: 0.75 },
        { t: 113.3, x: -27, kind: 'blinders', floor: true, blind: 113.52, s: 1.0 },
        { t: 113.5, x: 27, kind: 'blinders', floor: true, blind: 113.52, s: 1.0 },
        { t: 115.4, x: 28, kind: 'kissMic', floor: true, s: 0.8 },
        { t: 116.5, x: -26, kind: 'lightbox', sign: 'cmoENCORE', floor: true, y0: 27, s: 1.2, kill: 115.78, cl: [1, 0.15, 0.2] },
        // after close
        { t: 126.0, x: 21, kind: 'coils', floor: true, s: 1.2 },                                            // "coiling cables"
        { t: 127.3, x: 28, kind: 'chairStack', floor: true, s: 1.2 },                                       // "stacking chairs"
        { t: 129.7, x: -35.2, kind: 'tabsBoard', face: false, floor: true, y0: 20, s: 1.0 },               // "keeping tabs open for the ghosts"
        { t: 133.8, x: 27, kind: 'stairs', rot: Math.PI, floor: true, s: 1.1 },                            // "on the stairs"
        { t: 138.6, x: 34.6, kind: 'backDoor', face: false, floor: true, s: 1.0 },                         // "carried out the back door"
        { t: 149.2, x: -20.5, kind: 'quarter', rot: 0, floor: true, y0: 9.95, drop: 146.6, land: 148.66, from: 21, s: 2.0 },   // "let me drop my last quarter on you"
        { t: 149.6, x: -21.3, kind: 'tip', floor: true, y0: 9.95, s: 0.32 },
        // the last chorus
        { t: 155.3, x: -27, kind: 'tab', floor: true, s: 1.0 },
        { t: 158.4, x: 31, kind: 'faders', floor: true, up: 157.16, s: 0.75 },
        { t: 165.2, x: -27, kind: 'blinders', floor: true, blind: 165.38, s: 1.0 },
        { t: 165.4, x: 27, kind: 'blinders', floor: true, blind: 165.38, s: 1.0 },
        { t: 166.8, x: -28, kind: 'kissMic', floor: true, s: 0.8 },
        { t: 168.0, x: 26, kind: 'lightbox', sign: 'cmoENCORE', floor: true, y0: 27, s: 1.2, kill: 167.62, cl: [1, 0.15, 0.2] },
        { t: 174.0, x: -32, kind: 'tip', floor: true, s: 1.5 },                                             // "keep the change"
      ] },
    ],
    signs: [
      { key: 'cmoCORNER', text: 'CORNER BAR', color: '#ff2a3a', core: '#fff0f0', bg: '#0a0608' },
      { key: 'cmoLIVE', text: 'LIVE MUSIC', color: '#4af0ff', core: '#f0ffff', bg: '#05080a' },
      { key: 'cmoUNM', text: 'UNDER NEW\nMANAGEMENT', color: '#16121a', core: '#16121a', bg: '#efe6d2' },
      { key: 'cmoENCORE', text: 'ENCORE', color: '#ff2030', core: '#fff0e0', bg: '#100406' },
      { key: 'cmoKICK', text: 'CORNER\nBAR', color: '#ffe8c0', core: '#fff8ec', bg: '#7a1018', faceAspect: 1 },
    ],
    lyricPart: 'cmoBoard', lyricX: 0, lyricBg: '#e8dfca', lyricColor: '#16121a', lyricCore: '#16121a',
    lyrics: [
      { t: 12.22, text: 'LAST CALL CAME DOWN\nIN THE MIDDLE OF A SENTENCE', h: 15, lead: 2.2 },
      { t: 28.46, text: "I'M COIN-OPERATED, HONEY,\nONE WISH PER THROW", h: 15, x: 10 },
      { t: 34.88, text: 'THE METER EATS\nTHE QUIET PARTS FIRST', h: 15 },
      { t: 37.66, text: "SO IF YOU'RE GONNA SPEND ME,\nSPEND ME LOUD", h: 15 },
      { t: 43.60, text: 'CUT ME OFF\nMID-CHORUS', h: 16 },
      { t: 46.64, text: 'CLOSE MY TAB\nON THE HIGH NOTE', h: 16 },
      { t: 49.68, text: "DON'T YOU DARE\nLET ME FADE OUT SLOW", h: 16 },
      { t: 72.28, text: 'A VOICE LIKE MINE\nLEFT OUT IN THE RAIN', h: 15 },
      { t: 87.86, text: 'YOU KEEP THE FAITH\nWITH HOUSE BANDS', h: 15 },
      { t: 110.44, text: "IF IT'S GOTTA GO DARK,\nLET IT GO DOWN BLINDING", h: 16 },
      { t: 114.10, text: 'KISS THE SINGER,\nKILL THE ENCORE', h: 16 },
      { t: 123.34, text: "YOU'RE THE ONE\nWHO STAYS FOR TEARDOWN", h: 15 },
      { t: 136.18, text: 'CARRIED OUT THE\nBACK DOOR SINGING', h: 15 },
      { t: 146.18, text: 'LET ME DROP MY LAST\nQUARTER ON YOU', h: 15 },
      { t: 165.94, text: 'KISS THE SINGER,', h: 16, cut: 168.2 },                // and the rest of the line never comes
      { t: 171.86, text: 'KEEP THE CHANGE', h: 16, keep: true },
    ],
    shelf: 60, drop: 5,
    finale: { kind: 'cmo', t: 204.6, x: -30, s: 1.6, rot: -2.35, fireAt: 191.9, orbit: { r: 90, h: 12, y: 16, facing: true, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 9, heroFov: 46, heroUp: 1.8 } },
  },
};
