// Miss Misdemeanor: its course, its looks, its moments and what stands along the way. (album.js puts
// it in the record; the place itself is in mms-world.js, its things in mms-props.js.)
//
// The pageant is held in the county courthouse, and it is her trial. The steps at night under its
// banner; in at the door with the band: the marble hall, the courtroom, then the stage for every
// chorus, where the empty seats stand up on "stand up"; the lineup room, the trophy hall, the
// dressing room with the gasoline gown; the witness stand among the masks; out in the street among
// the headlines; the marquee spelling her name; the last chorus; and the wall with the height chart.

// the bars, as the drums have them (84.9 bpm; the bar line is beat 3 of the beat file: every line of
// the song starts on one, the chorus drops on 44.94, 112.70 and 180.46, the stop is 179.07):
// 2.58 5.41 8.22 11.05 13.87 16.69 19.51 22.34 25.16 27.98 30.80 33.63 36.46 39.28 42.10 44.94 47.75
// 50.58 53.40 56.22 59.05 61.87 64.69 67.52 70.34 73.16 75.98 78.81 81.63 84.45 87.28 90.10 92.93
// 95.75 98.58 101.41 104.24 107.05 109.87 112.70 115.52 118.34 121.16 123.99 126.81 129.63 132.46
// 135.28 138.11 140.93 143.75 146.58 149.41 152.22 155.07 157.88 160.70 163.52 166.34 169.17 172.00
// 174.82 177.63 180.46 183.29 186.11 188.93 191.75 194.58 197.40 200.23 203.05 205.87 208.70 211.52
// 214.35

// the courthouse's doorways: in off the steps, between its rooms, and the walls the choruses burst through
const FRONT = { kind: 'front', hw: 13, hh: 30 };
const DOOR = { kind: 'wall', hw: 12, hh: 26 };
const EXIT = { kind: 'wall', hw: 17, hh: 44 };

const NIGHT = {
  zenith: 0x04050e, horizon: 0x2a1830, skyGlow: 0xff6a3a, glowDir: [0.2, 0.05, 1], skyline: 0x0c0a14, moonDir: [-0.4, 0.5, 0.75], moon: 0xffe8d8,
  fog: 0x1a1020, fogDensity: 0.0016, stars: 0.45, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.2,
  ground: 0x14101a, street: 0xffb050, roof: 0x16121c, wall: 0x2a2430, tree: 0x0c140e,
  window: 0xffd8a0, windowAlt: 0xff6a8a, lamp: 0xffb060,
  ribbon: 0x1c0a14, edge: 0xfff0f2, fret: 0xffb020, glow: 0xff2f6d, hold: 0xff2f6d, gate: 0xffffff, gem: 0xfff0f4,
  skyLight: 0x9a8aa8, bounce: 0x3a1a2a, hemiK: 1.7, sunK: 0.5,
  board: 0x1a1018, suit: 0x16121c, jacket: 0xff2f6d, hair: 0x1a1210, shoes: 0xff2f6d, gloves: 0x16121c, rim: 0xffc0d0, daze: 0,
};

// the moments laid over whichever room she's in (a look's palette is laid over the night's, so these
// go on as overrides, not palettes of their own)
const HAZARD = { glow: 0xffa020, hold: 0xff9010, fret: 0xfff0b0 };                                      // "lipgloss bright like a hazard sign"
const BLAME = { skyLight: 0x7a6a6a, bounce: 0x1a0e0a, hemiK: 1.0, glow: 0xffe0b0, hold: 0xffd090 };       // "I'll take the blame": one light left
const GUILTY = { skyLight: 0xffb0b0, bounce: 0x8a1010, glow: 0xff1a2a, hold: 0xff1a2a, fret: 0xffffff };  // the gavel
const GOLDEN = { skyLight: 0xfff0c8, bounce: 0x7a4a1a, glow: 0xffc840, hold: 0xffb02a, fret: 0xfff0b0 };  // the confetti
const MATCH = { skyLight: 0xffc890, bounce: 0x7a3010, glow: 0xff8a2a, hold: 0xff7a1a, fret: 0xffe0b0 };   // "light me up", "burn"
const GLARE = { skyLight: 0xffffff, bounce: 0x8a7a8a, hemiK: 2.6, glow: 0xffffff, hold: 0xffe0f0, fret: 0xff2f6d }; // "the glare"
const STEEL = { skyLight: 0xc0d0f0, bounce: 0x2a3050, glow: 0x8ab8ff, hold: 0x6aa0ff, fret: 0xffffff };   // "serving time"

export const palettes = {
  mmsNight: NIGHT,
  // the marble hall: warm, the tile cold under it
  mmsHall: { fog: 0x2a2018, fogDensity: 0.0021, skyLight: 0xfff0e0, bounce: 0x6a4a3a, hemiK: 1.8, glow: 0xff2f6d, hold: 0xff2f6d, fret: 0xffd27a, edge: 0xffffff, ribbon: 0x1a1214 },
  // the courtroom: wood and lamplight
  mmsCourt: { fog: 0x1e140c, fogDensity: 0.0022, skyLight: 0xffd8a0, bounce: 0x4a2a14, hemiK: 1.75, glow: 0xffc040, hold: 0xffb020, fret: 0xfff0c0, edge: 0xfff4e0, ribbon: 0x140c08 },
  // the stage: red velvet, gold, white light
  mmsStage: { zenith: 0x05020a, horizon: 0x3a0a1a, skyGlow: 0xff2f6d, fog: 0x2a0812, fogDensity: 0.0012, stars: 0.15, skyLight: 0xffc8d8, bounce: 0x6a1020, hemiK: 2.2, glow: 0xff2f6d, hold: 0xff1f5a, fret: 0xffd76a, edge: 0xffffff, ribbon: 0x16040a },
  // the lineup room: cold light, the height chart
  mmsLineup: { fog: 0x101a1e, fogDensity: 0.0022, skyLight: 0xd0e8f0, bounce: 0x2a3a40, hemiK: 1.8, glow: 0x6ae0ff, hold: 0x3ad0ff, fret: 0xffe04a, edge: 0xf0ffff, ribbon: 0x0a1014 },
  // the trophy hall: gold
  mmsTrophy: { fog: 0x2a1a10, fogDensity: 0.002, skyLight: 0xfff0c8, bounce: 0x6a4a1a, hemiK: 1.95, glow: 0xffc83a, hold: 0xffb020, fret: 0xff8ac0, edge: 0xfffaf0, ribbon: 0x140e08 },
  // the dressing room: pink
  mmsDressing: { fog: 0x2a1018, fogDensity: 0.002, skyLight: 0xffd0e0, bounce: 0x6a2a3a, hemiK: 1.9, glow: 0xff5ab0, hold: 0xff3a90, fret: 0xffe0f0, edge: 0xffffff, ribbon: 0x1a0810 },
  // the stage on fire
  mmsFire: { zenith: 0x0a0200, horizon: 0x5a1a00, skyGlow: 0xff6a10, fog: 0x3a1006, fogDensity: 0.0013, stars: 0.1, skyLight: 0xffb080, bounce: 0x8a2a0a, hemiK: 2.2, glow: 0xff7a1a, hold: 0xff5a0a, fret: 0xffe08a, edge: 0xfff4e0, ribbon: 0x1a0604 },
  // the witness stand: one cold light
  mmsTruth: { zenith: 0x02030a, horizon: 0x101828, skyGlow: 0x6a8aff, fog: 0x0a0e18, fogDensity: 0.002, stars: 0.3, skyLight: 0x8aa0c8, bounce: 0x1a2030, hemiK: 1.3, glow: 0xa0c8ff, hold: 0x8ab0ff, fret: 0xffffff, edge: 0xe8f0ff, ribbon: 0x080a12 },
  // the street of headlines: newsprint and sodium light
  mmsPress: { zenith: 0x08080c, horizon: 0x3a3020, skyGlow: 0xffe0a0, fog: 0x2a2418, fogDensity: 0.0014, stars: 0.3, skyLight: 0xe8dcc0, bounce: 0x4a3a2a, hemiK: 1.9, glow: 0xfff0c8, hold: 0xffd060, fret: 0xff2f6d, edge: 0xffffff, ribbon: 0x14100a },
  // "say my name again": the dark, the bulbs
  mmsName: { zenith: 0x020104, horizon: 0x140a10, skyGlow: 0xffb040, fog: 0x0c0608, fogDensity: 0.002, skyLight: 0x8a7060, bounce: 0x2a140a, hemiK: 1.1, glow: 0xffc060, hold: 0xffb040, fret: 0xfff0d0, edge: 0xfff4e8, ribbon: 0x0c0406 },
  // the last chorus: everything
  mmsFinal: { zenith: 0x08020a, horizon: 0x4a0a20, skyGlow: 0xffb030, fog: 0x2a0a10, fogDensity: 0.0011, stars: 0.5, skyLight: 0xffe0c0, bounce: 0x7a2a1a, hemiK: 2.3, glow: 0xffc040, hold: 0xff2f6d, fret: 0xffe8a0, edge: 0xffffff, ribbon: 0x14040a },
  // after the last word
  mmsEnd: { zenith: 0x040306, horizon: 0x1a1018, fog: 0x100a0e, skyLight: 0xd8d0e0, bounce: 0x3a2030, hemiK: 1.7, glow: 0xffffff, hold: 0xffc0d0, fret: 0xff2f6d },
};

export const song = {
  id: 'miss-misdemeanor',
  accent: '#ff2f6d',
  title: 'Miss Misdemeanor',
  collect: 'rose',
  // (the beat file's bar line is two beats off: the band's entries and every line start on these)
  downbeat: 3,
  // (the song list plays it from the first chorus's drop)
  preview: 44.6,
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 13 },                                                           // the chant on the courthouse steps
    { t: 11.05, kind: 'verse', endY: 12, turn: 0.3 },                                              // "heels click hard on the courthouse tile": in at the door with the band
    { t: 33.63, kind: 'pre', endY: 17, turn: 0.3 },                                                // "state your name and your plea": the courtroom
    { t: 44.94, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 10, endY: 12, gap: true },  // "call my number": through the curtain onto the stage
    { t: 56.22, kind: 'chorus', c: 1.3, endY: 13 },                                                // "put the rap sheet on my shoulder"
    { t: 73.16, kind: 'post', endY: 13 },                                                          // "oh, oh": along the runway
    { t: 78.81, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7, endY: 12, turn: 0.3 },    // "my exes lined up in the witness box"
    { t: 90.10, kind: 'verse', endY: 12, turn: 0.3 },                                              // "I learned young how to weaponize cute"
    { t: 101.41, kind: 'pre', endY: 18, turn: 0.3 },                                               // "you say I'm trouble"; "burn like this"
    { t: 112.70, kind: 'chorus', start: 'launch', launchBeats: 2, kick: 11, endY: 12, gap: true }, // the stage on fire
    { t: 123.99, kind: 'chorus', c: 1.35, endY: 12 },
    { t: 140.93, kind: 'post', endY: 13 },
    { t: 146.58, kind: 'bridge', endY: 14 },                                                       // "if I swear to tell the truth": the witness stand
    { t: 157.88, kind: 'chorus', c: 1.1, endY: 13 },                                               // "your favorite cautionary tale": the street
    { t: 172.0, kind: 'break', endY: 16 },                                                         // "say my name again"; the stop
    { t: 180.46, kind: 'final', start: 'launch', launchBeats: 2, kick: 11, c: 1.3, endY: 10, gap: true }, // the last chorus
    { t: 203.05, kind: 'final', c: 1.2, endY: 8 },                                                 // "serving time inside your memory"
    { t: 214.35, kind: 'outro', endY: 6 },                                                         // the last hit
  ],
  rails: [
    { t: 73.16, beats: 2, x: 0 },      // down the runway on the "oh, oh" (two beats: the pop lands before the kicker into the lineup)
    { t: 140.93, beats: 4, x: 0 },     // and again after the second chorus
  ],
  palette: 'mmsNight',
  world: 'mms',
  lift: { beams: { colors: [0xffd76a, 0xffffff, 0xff2f6d] } },
  confetti: [[63.98, 72.6], [131.75, 140.4], [199.52, 214.3]],
  confettiColors: [0xffd76a, 0xff2f6d, 0xffffff, 0xd8dce8, 0xff8ab8],
  titleView: { ahead: -0.14, x: 1.6, h: 1.7, back: -0.9, lookH: 2.6 },
  looks: [
    { t: -99, palette: 'mmsNight' },
    { t: 11.1, palette: 'mmsHall', fade: 0.3 },                      // in at the door
    { t: 14.3, palette: 'mmsHall', set: HAZARD, fade: 0.15 },        // "hazard sign"
    { t: 16.6, palette: 'mmsHall', fade: 0.6 },
    { t: 33.6, palette: 'mmsCourt', fade: 0.3 },                     // the courtroom
    { t: 42.1, palette: 'mmsCourt', set: BLAME, fade: 0.25 },        // "I'll take the blame"
    { t: 44.94, palette: 'mmsStage', fade: 0.1 },                    // the stage
    { t: 62.94, palette: 'mmsStage', set: GUILTY, fade: 0.05 },      // "guilty"
    { t: 63.6, palette: 'mmsStage', set: GOLDEN, fade: 0.3 },        // "throw confetti"
    { t: 67.5, palette: 'mmsStage', fade: 0.8 },
    { t: 78.81, palette: 'mmsLineup', fade: 0.2 },                   // the lineup room
    { t: 90.1, palette: 'mmsTrophy', fade: 0.3 },                    // the trophy hall
    { t: 101.4, palette: 'mmsDressing', fade: 0.3 },                 // the dressing room
    { t: 104.18, palette: 'mmsDressing', set: MATCH, fade: 0.15 },   // "light me up"
    { t: 106.6, palette: 'mmsDressing', fade: 0.6 },
    { t: 111.62, palette: 'mmsDressing', set: MATCH, fade: 0.2 },    // "burn"
    { t: 112.7, palette: 'mmsFire', fade: 0.1 },                     // the stage on fire
    { t: 130.7, palette: 'mmsFire', set: GUILTY, fade: 0.05 },       // "guilty"
    { t: 131.4, palette: 'mmsFire', fade: 0.6 },
    { t: 146.58, palette: 'mmsTruth', fade: 0.4 },                   // the witness stand
    { t: 157.88, palette: 'mmsPress', fade: 0.3 },                   // the street of headlines
    { t: 169.38, palette: 'mmsPress', set: GLARE, fade: 0.06 },      // "glare"
    { t: 170.1, palette: 'mmsPress', fade: 0.6 },
    { t: 172.0, palette: 'mmsName', fade: 0.4 },                     // "say my name"
    { t: 180.46, palette: 'mmsFinal', fade: 0.1 },                   // the last chorus
    { t: 198.5, palette: 'mmsFinal', set: GUILTY, fade: 0.05 },      // "guilty"
    { t: 199.2, palette: 'mmsFinal', set: GOLDEN, fade: 0.5 },       // "throw confetti"
    { t: 203.0, palette: 'mmsFinal', fade: 1.2 },
    { t: 207.4, palette: 'mmsFinal', set: STEEL, fade: 0.3 },        // "serving time"
    { t: 211.5, palette: 'mmsFinal', fade: 0.4 },
    { t: 215.1, palette: 'mmsEnd', fade: 1.6 },                      // after the last word
  ],
  moments: [
    { t: 11.05, kind: 'flash', k: 0.25 },                           // in at the door with the band
    { t: 23.18, kind: 'shutter', k: 0.55 },                         // "camera flashes"
    { t: 24.64, kind: 'shutter', k: 0.7 },                          // "firing squad"
    { t: 30.09, kind: 'pop', k: 0.3, flash: 0.04 },                 // "safety pin": it shuts
    { t: 33.18, kind: 'shutter', k: 0.8 },                          // "pose": the booking camera
    { t: 36.02, kind: 'knock', n: 1, k: 0.45 },                     // "plea": the gavel on the bench
    { t: 39.62, kind: 'pop', k: 0.3 },                              // "win": the question out of the bowl
    { t: 44.94, kind: 'flash', k: 0.35 },                           // the stage
    { t: 49.06, kind: 'impact', k: 0.3 },                           // "stand up": every seat
    { t: 55.84, kind: 'bell', k: 0.45 },                            // "winner of the year"
    { t: 62.94, kind: 'knock', n: 1, k: 0.9 },                      // "guilty"
    { t: 64.02, kind: 'pop', k: 0.55, flash: 0.06 },                // "throw confetti"
    { t: 66.34, kind: 'glass', k: 0.45 },                           // "every broken part"
    { t: 72.08, kind: 'impact', k: 0.35 },                          // "tear me apart"
    { t: 78.81, kind: 'flash', k: 0.2 },                            // the lineup
    { t: 79.6, kind: 'knock', n: 1, k: 0.35 },                      // "lined up"
    { t: 86.12, kind: 'pop', k: 0.3 },                              // "exhibit"
    { t: 91.88, kind: 'pop', k: 0.45, flash: 0.05 },                // "weaponize cute": glitter
    { t: 94.76, kind: 'knock', n: 2, k: 0.3, gap: 160 },            // "punchline": ba-dum
    { t: 97.56, kind: 'ring', k: 0.3, dur: 0.8 },                   // "sequined"
    { t: 104.18, kind: 'pop', k: 0.35, flash: 0.05 },               // "light me up"
    { t: 111.62, kind: 'impact', k: 0.7 },                          // "burn"
    { t: 112.7, kind: 'flash', k: 0.4 },                            // the stage on fire
    { t: 116.84, kind: 'impact', k: 0.3 },                          // "stand up"
    { t: 123.54, kind: 'bell', k: 0.45 },                           // "winner of the year"
    { t: 130.70, kind: 'knock', n: 1, k: 0.9 },                     // "guilty"
    { t: 131.80, kind: 'pop', k: 0.55, flash: 0.06 },               // "throw confetti"
    { t: 134.08, kind: 'glass', k: 0.45 },                          // "broken"
    { t: 146.86, kind: 'ring', k: 0.3, dur: 1.4 },                  // "swear"
    { t: 151.06, kind: 'knock', n: 1, k: 0.4 },                     // "which mask": they turn
    { t: 159.56, kind: 'impact', k: 0.25 },                         // "cautionary tale": the papers land
    { t: 162.06, kind: 'impact', k: 0.25 },                         // "headline"
    { t: 163.70, kind: 'impact', k: 0.25 },                         // "dare"
    { t: 166.46, kind: 'ring', k: 0.4, dur: 1.0 },                  // "tiny cage"
    { t: 169.38, kind: 'flash', k: 0.5 },                           // "glare"
    { t: 173.94, kind: 'pop', k: 0.3 },                             // "thirteen"
    { t: 179.07, kind: 'blackout', dur: 1.39, k: 0.9 },             // the stop
    { t: 180.46, kind: 'flash', k: 0.45 },                          // the last chorus
    { t: 184.58, kind: 'impact', k: 0.35 },                         // "stand up"
    { t: 191.44, kind: 'bell', k: 0.5 },                            // "winner of the year"
    { t: 198.50, kind: 'knock', n: 1, k: 1.0 },                     // "guilty"
    { t: 199.58, kind: 'pop', k: 0.6, flash: 0.08 },                // "throw confetti"
    { t: 199.58, kind: 'fireworks', n: 6, y: 40, ahead: 1.2, x: 30 },
    { t: 207.52, kind: 'impact', k: 0.6 },                          // "serving time": the bars down
    { t: 214.35, kind: 'shutter', k: 0.95 },                        // the last hit: the mugshot
  ],
  scenery: {
    roads: [{ x: 0, from: -14, to: 11.1, width: 26, walk: 8, lanes: [-8, -3, 3, 8], density: 0.25, lampEvery: 26 }, { x: 0, from: 157.5, to: 172.2, width: 26, walk: 8, lanes: [-8, -3, 3, 8], density: 0.35, lampEvery: 26 }],
    rooms: [
      { style: 'hall', from: 11.05, to: 33.63, caps: [FRONT, DOOR] },
      { style: 'court', from: 33.63, to: 44.94, caps: [null, EXIT] },
      { style: 'stage', from: 44.94, to: 78.81, caps: [null, DOOR] },
      { style: 'lineup', from: 78.81, to: 90.10, caps: [null, DOOR] },
      { style: 'trophy', from: 90.10, to: 101.41, caps: [null, DOOR] },
      { style: 'dressing', from: 101.41, to: 112.70, caps: [null, EXIT] },
      { style: 'stage', from: 112.70, to: 146.58, caps: [null, DOOR] },
      { style: 'truth', from: 146.58, to: 157.88, caps: [null, EXIT] },
      { style: 'name', from: 172.0, to: 180.46, caps: [FRONT, EXIT] },
      { style: 'stage', from: 180.46, to: 232 },
    ],
    zones: [
      // the steps: lamps along the square, the courthouse at the end of it
      { from: -10, to: 10.4, kits: ['mmsLamps'], every: 0.9, x: 24 },
      // the hall: its columns, the gallery seats on "second row"
      { from: 11.6, to: 33.2, kits: ['mmsColumns'], every: 1.3, x: 34 },
      { from: 24.6, to: 28.4, kits: ['mmsSeats'], every: 0.5, x: 25, tiers: 3, side: 1, mom: { at: 26.0, from: 25.82, to: 27.5 } },
      // the firing squad: cameras in a row on the left, aimed across the road
      { from: 21.6, to: 25.2, kits: ['mmsSquad'], every: 0.42, x: -24, volley: [23.18, 24.64] },
      // the courtroom's lamps along the rails
      { from: 34.0, to: 44.4, kits: ['mmsRails'], every: 0.55, x: 22 },
      // the stage: the seats in their tiers both sides, standing up on "stand up"; the trusses
      { from: 45.6, to: 78.2, kits: ['mmsSeats'], every: 0.62, x: 27, tiers: 4, up: [[48.9, 73.2]] },
      { from: 46.0, to: 78.0, kits: ['mmsTruss'], every: 2.6, cheer: 50.16, until: 73.2 },
      // the lineup room's wall of numbers; the evidence tables
      { from: 79.2, to: 84.2, kits: ['mmsLineup'], every: 0.75, x: -27, sweep: 79.6 },
      { from: 85.0, to: 89.6, kits: ['mmsEvidence'], every: 0.75, x: 25, said: 86.12 },
      // the trophy hall: trophies on their stands, glitter on "weaponize"
      { from: 90.6, to: 100.8, kits: ['mmsTrophies'], every: 0.55, x: 27, pop: 91.88 },
      // the dressing room: the gowns on their racks
      { from: 101.8, to: 112.2, kits: ['mmsRacks'], every: 0.6, x: 29, clear: [[103.4, 106.0, 1], [107.4, 110.2, -1]] },
      // "burn like this": the fire down both sides of the road, then the jets on the stage
      { from: 111.62, to: 114.6, kits: ['mmsFireLine'], every: 0.08, x: 10.5, at: 111.62 },
      { from: 113.2, to: 146.2, kits: ['mmsSeats'], every: 0.62, x: 27, tiers: 4, up: [[116.7, 140.95]], burnt: true },
      { from: 113.2, to: 146.0, kits: ['mmsTruss'], every: 2.6, cheer: 117.92, until: 140.95, jets: [112.7, 140.95] },
      // the witness stand's masks, turning on "which mask"
      { from: 148.6, to: 157.4, kits: ['mmsMasks'], every: 0.55, x: 24, turn: 151.06 },
      // the street of headlines: the blocks, the lamps
      { from: 157.6, to: 172.4, kits: ['city'], wake0: 0.4 },
      // the last chorus
      { from: 181.2, to: 232, kits: ['mmsSeats'], every: 0.62, x: 27, tiers: 4, up: [[184.4, 232]] },
      { from: 181.6, to: 226, kits: ['mmsTruss'], every: 2.6, cheer: 185.66, until: 232, jets: [180.46, 214.35] },
      { from: 0, to: 0.1, kits: ['mmsProps'], at: [
        // the steps: the banner over the door
        { t: 11.0, x: 0, kind: 'banner', roof: 11.05, y0: 37.5, s: 1.5 },
        // the hall
        { t: 13.6, x: -26, kind: 'heels', floor: true, walk: [10.6, 17.2], s: 1.4 },          // "heels click hard on the courthouse tile"
        { t: 15.8, x: 26, kind: 'gloss', floor: true, on: 14.32, off: 16.6, s: 1.2 },          // "lipgloss bright like a hazard sign"
        { t: 18.7, x: -26, kind: 'suit', floor: true, sash: 17.68, s: 1.2 },                   // "sash over thrift-store suit"
        { t: 31.0, x: -29, kind: 'pin', floor: true, shut: 30.09, s: 1.35 },                    // "my number on a safety pin"
        { t: 33.1, x: -30, kind: 'chart', floor: true, flash: 33.18, s: 1.0 },                 // "the practiced little guilty girl pose"
        { t: 33.4, x: 26, kind: 'booking', floor: true, flash: 33.18, s: 1.2 },
        // the courtroom
        { t: 35.2, x: -24, kind: 'mic', floor: true, s: 1.3 },                                 // "state your name"
        { t: 37.6, x: 27, kind: 'bench', floor: true, up: 36.02, flip: 38.94, s: 1.25 },        // "your plea", "your honor"
        { t: 40.4, x: -25, kind: 'bowl', floor: true, pull: 39.62, s: 1.3 },                   // "if you win tonight"
        // the first chorus
        { t: 57.6, x: 0, kind: 'sash', above: 16, on: 57.34, s: 1.0 },                         // "the rap sheet on my shoulder"
        { t: 60.4, x: 0, kind: 'sash', above: 17, on: 60.14, flip: true, s: 1.0 },             // "like a sash across my heart"
        { t: 63.7, x: 37, kind: 'gavel', floor: true, hit: 62.94, s: 1.6 },                    // "guilty"
        { t: 73.4, x: -34, kind: 'poster', floor: true, tear: 72.08, s: 1.45 },                 // "smile pretty while you tear me apart"
        // the lineup room
        { t: 83.4, x: 25, kind: 'baton', floor: true, toss: 83.34, s: 1.2 },                   // "talent show"
        // the trophy hall
        { t: 95.2, x: -26, kind: 'standup', floor: true, punch: 94.76, s: 1.2 },               // "turn a bruise to a punchline"
        { t: 98.0, x: 26, kind: 'gown', floor: true, on: 97.56, s: 1.3 },                      // "a villain in a sequined dress"
        { t: 100.2, x: -25, kind: 'script', floor: true, on: 99.62, s: 1.2 },                  // "reading lines you drew"
        // the dressing room
        { t: 104.6, x: 25, kind: 'match', floor: true, strike: 104.18, s: 1.3 },              // "light me up"
        { t: 108.6, x: -25, kind: 'gasgown', floor: true, zip: 107.26, burn: 111.62, s: 1.3 }, // "zip me in that gasoline gown"
        // the second chorus
        { t: 125.4, x: 0, kind: 'sash', above: 16, on: 125.08, burnt: true, s: 1.0 },
        { t: 128.2, x: 0, kind: 'sash', above: 17, on: 127.90, flip: true, burnt: true, s: 1.0 },
        { t: 131.5, x: -37, kind: 'gavel', floor: true, hit: 130.70, s: 1.6 },
        // the witness stand
        { t: 147.6, x: 26, kind: 'stand', floor: true, swear: 146.86, s: 1.3 },               // "if I swear to tell the truth"
        // the street of headlines
        { t: 160.2, x: -17, kind: 'paper', above: 2, land: 159.56, cell: 0, s: 1.0 },         // "your favorite cautionary tale"
        { t: 162.6, x: 17, kind: 'paper', above: 2, land: 162.06, cell: 1, s: 1.0 },          // "your headline"
        { t: 164.2, x: -17, kind: 'paper', above: 2, land: 163.70, cell: 2, s: 1.0 },         // "and your dare"
        { t: 166.46, x: 0, kind: 'cage', above: -14, on: 165.8, s: 1.0 },                      // "this tiara is a tiny cage"
        // the marquee: her name, a letter at a time
        { t: 173.9, x: 26, kind: 'thirteen', floor: true, on: 173.94, s: 1.4 },                // "thirteen"
        { t: 180.4, x: 0, kind: 'name', roof: 180.46, y0: 36.5, from: 174.76, to: 176.4, all: 177.9, s: 1.0 },
        // the last chorus
        { t: 193.2, x: 0, kind: 'sash', above: 16, on: 192.86, s: 1.0 },
        { t: 196.0, x: 0, kind: 'sash', above: 17, on: 195.68, flip: true, s: 1.0 },
        { t: 199.3, x: 37, kind: 'gavel', floor: true, hit: 198.50, s: 1.7 },
        { t: 208.2, x: 0, kind: 'bars', above: 0, down: 207.52, s: 1.0 },                      // "serving time inside your memory"
      ] },
    ],
    signs: [
      { key: 'mmsTONIGHT', text: 'TONIGHT ✦ MISS MISDEMEANOR', color: '#ffd76a', core: '#fff8e0', bg: '#2a0610', faceAspect: 44 / 7 },
      { key: 'mmsRESERVED', text: 'RESERVED\nMOM', color: '#2a1a14', core: '#2a1a14', bg: '#f4ead8', faceAspect: 1.6 },
      { key: 'mmsAPPLAUSE', text: 'APPLAUSE', color: '#ffffff', core: '#ffffff', bg: '#c8102a', faceAspect: 3.2 },
      { key: 'mmsGUILTY', text: 'GUILTY', color: '#ffffff', core: '#ffffff', bg: '#a00818', faceAspect: 3.2 },
      { key: 'mmsEXHIBIT', text: 'EXHIBIT A', color: '#1a1a1a', core: '#1a1a1a', bg: '#ffd84a', faceAspect: 2.6 },
      { key: 'mmsQUIET', text: 'QUIET PLEASE', color: '#fff4e0', core: '#ffffff', bg: '#3a1408', faceAspect: 3.6 },
      { key: 'mmsSILENCE', text: 'ALL RISE', color: '#ffe8c0', core: '#ffffff', bg: '#2a1006', faceAspect: 3.6 },
      { key: 'mmsTALENT', text: 'TALENT', color: '#ffe060', core: '#fffbe8', bg: '#14081a', faceAspect: 3.2 },
      { key: 'mmsLITTLE', text: 'LITTLE MISS', color: '#ff6ab8', core: '#fff0f8', bg: '#1a0812', faceAspect: 3.2 },
      { key: 'mmsHAZARD', text: 'CAUTION', color: '#111111', core: '#111111', bg: '#ffb020', faceAspect: 3.2 },
    ],
    // the boards carry only lines both hearings agree on (neither caught the first verse, 4-28 s, the
    // same; "rap sheet" and "sequined" and "cry" or "crown" came out two ways in places)
    lyricPart: 'mmsBoard', lyricX: 0, lyricBg: '#2a0610', lyricColor: '#ffd76a', lyricCore: '#fff8e8',
    lyrics: [
      { t: 33.6, text: 'STATE YOUR NAME\nAND YOUR PLEA', h: 14 },
      { t: 39.3, text: 'IF YOU WIN TONIGHT,\nWHAT WILL YOU DO?', h: 14 },
      { t: 42.6, text: "I'LL TAKE THE BLAME\nSO IT NEVER HITS YOU", h: 16 },
      { t: 45.2, text: 'CALL MY NUMBER,\nREAD THE CHARGES', h: 15, lead: 1.0 },
      { t: 48.1, text: 'MAKE THE CROWD\nSTAND UP AND CHEER', h: 14 },
      { t: 53.3, text: 'BAD LITTLE WINNER\nOF THE YEAR', h: 14 },
      { t: 64.0, text: 'THROW CONFETTI\nMADE OF EVERY BROKEN PART', h: 14 },
      { t: 70.4, text: 'SMILE PRETTY WHILE\nYOU TEAR ME APART', h: 14 },
      { t: 84.6, text: 'EVERY KISS IS\nAN EXHIBIT', h: 14 },
      { t: 90.1, text: 'I LEARNED YOUNG HOW\nTO WEAPONIZE CUTE', h: 14 },
      { t: 98.5, text: "I'M JUST READING\nLINES YOU DREW", h: 14 },
      { t: 101.3, text: "YOU SAY I'M TROUBLE,\nI'M YOUR TYPE", h: 14 },
      { t: 106.8, text: 'YOU ZIP ME IN THAT\nGASOLINE GOWN', h: 16 },
      { t: 109.8, text: 'AND ACT SURPRISED\nWHEN I BURN LIKE THIS', h: 16 },
      { t: 146.4, text: 'IF I SWEAR TO TELL THE\nTRUTH AND NOTHING MORE', h: 14, lead: 1.8 },
      { t: 149.9, text: "I DON'T KNOW WHICH\nMASK YOU'RE ASKING FOR", h: 14 },
      { t: 152.7, text: 'NO ONE EVER ASKED\nTHE GIRL ON TRIAL', h: 14 },
      { t: 167.0, text: 'STILL SMILING\nIN THE GLARE', h: 14 },
      { t: 212.2, text: 'I WAS ONLY EVER\nPLAYING THE PART', h: 19, keep: true },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'mms', t: 220.6, x: -22, s: 1.3, rot: -2.0, fireAt: 214.35, orbit: { r: 60, h: 10, y: 10, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 46, heroUp: 1.9 } },
  },
};
