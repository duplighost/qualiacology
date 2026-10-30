// Try Me Free!: its course, its looks, its moments and what stands along the way. (album.js puts it
// in the record, last, as the bonus track; the place itself is in tmf-world.js, its things in
// tmf-props.js.)
//
// A Saturday-morning cereal commercial for the whole record. A breakfast table the size of a town,
// gingham to the horizon, cereal boxes standing on it like tower blocks: every song on the record
// is a cereal, its name and its number on the box. Each time the megamix quotes a song its colours
// take over the sky and the road, a whole shelf of that cereal lines the way, its box lights and
// tips and pours, and that song's own things are set out on the table for its lines: the gavel on
// "court", the open casket and the open bar, the coffee he bought, the nail polish and the sirens,
// the locker with the love note, the key thrown away, the scales that level on "equalize", the
// mourning bouquet caught. Between them, the commercial: the TV playing it, the starbursts, the
// alphabet in the bowl spelling R.I.P. I.G. F.M.L. O.M.G. as you fly over the milk, the milk
// turning pink, the mascot winking from the shelf, the blue check, the nutrition facts; Saturday
// morning communion in stained glass; and the prize inside, at the end.
//
// The songs it quotes (from the words and their times): Pretty Until Proven Guilty (12-16, 174-188,
// 248-253, 269-271), Makeup Sex at Your Funeral (16-37, 64-72, 229-233, 253-259), I FUCKED YOUR DAD
// (58-64, 152-155, 223-229), Overdose Aesthetic (72-80, 164-177, 211-223, 259-266, 280-283), School
// Shooter Sweetheart (80-86, 266-269); the cereal is new (0-12, 86-152, 188-211, 233-248).

// the bars, as the drums have them (173.3 bpm, slowing to ~167 from 175 s to 262 s and back; the
// stops at 13.82, 59.54, 84.47, 164.81, 187.10, 223.50, 284.30):
// 1.38 2.76 4.15 5.52 6.92 8.31 9.69 11.07 12.46 13.82 15.22 16.61 17.99 19.38 20.76 22.14 23.53
// 24.92 ... 37.38 ... 47.03 ... 59.54 ... 63.69 ... 80.32 ... 87.22 ... 92.78 ... 103.86 ... 114.94
// ... 123.25 ... 152.34 ... 164.81 ... 168.98 ... 187.10 ... 189.89 ... 212.25 ... 223.50 ... 233.39
// ... 247.67 ... 266.36 ... 271.90 ... 284.30 ... 289.90 (the last hit) 292.73

const MORNING = {
  zenith: 0x3a9cff, horizon: 0xffe4c8, skyGlow: 0xffd08a, glowDir: [0.35, 0.22, 1], skyline: 0xd8c0b0, moonDir: [0.42, 0.6, 0.68], moon: 0xfff2dc,
  fog: 0xf4dccc, fogDensity: 0.0011, stars: 0, sunSize: 0.85, cloud: 0xffffff, clouds: 0.38, snow: 0, snowGround: 0, rain: 0, windowK: 1.0,
  ground: 0xfff6ee, street: 0xff3048, roof: 0x2a1a24, wall: 0xf0e0d8, tree: 0x2a5a2a,
  window: 0xfff2c8, windowAlt: 0x8ae4ff, lamp: 0xfff0d0,
  ribbon: 0x2a1840, edge: 0xffffff, fret: 0xffe04a, glow: 0xff3a6a, hold: 0xff2a5a, gate: 0xffffff, gem: 0xffffff,
  skyLight: 0xfff0e4, bounce: 0xffb898, hemiK: 2.0, sunK: 1.4, fillK: 0.6,
  board: 0x1a1020, suit: 0xfff6fa, jacket: 0x2a6aff, hair: 0x1a1210, shoes: 0xffffff, gloves: 0x1a1210, rim: 0xffe0a0, daze: 0,
};

export const palettes = {
  tmfMorning: MORNING,
  // the commercial on the TV: everything a shade too bright
  tmfTV: { zenith: 0x2a8aff, horizon: 0xfff0c8, skyGlow: 0xffe060, fog: 0xfff0dc, glow: 0xffd21a, hold: 0xff2a3a, fret: 0x2a6aff, edge: 0xffffff, ribbon: 0x1e1a5a, skyLight: 0xfff6e8, hemiK: 2.2, sunK: 1.5 },
  // the cereal at full volume: candy primaries
  tmfCereal: { zenith: 0x1a6aff, horizon: 0xffd8ec, skyGlow: 0xffc828, fog: 0xffe2e8, fogDensity: 0.001, glow: 0xffc81a, hold: 0xff2a4a, fret: 0x3ad8ff, edge: 0xffffff, ribbon: 0x241248, skyLight: 0xfff0f0, bounce: 0xffa8b8, hemiK: 2.2, sunK: 1.5 },
  // the livestream: a phone's light in a dark room, LIVE in red
  tmfLive: { zenith: 0x080818, horizon: 0x2a1a5a, skyGlow: 0xff2a5a, fog: 0x1a1236, fogDensity: 0.0016, stars: 0.5, sunSize: 0, clouds: 0, glow: 0xff2a4a, hold: 0xff3a6a, fret: 0x7ae0ff, edge: 0xe8f0ff, ribbon: 0x120a24, skyLight: 0x7a7ac8, bounce: 0x3a2a5a, hemiK: 1.7, sunK: 0.5 },
  // over the milk: white
  tmfMilk: { zenith: 0x2a7cff, horizon: 0xc0dcff, skyGlow: 0xffffff, fog: 0xc4d8f2, fogDensity: 0.0009, glow: 0x5ab8ff, hold: 0x3a8aff, fret: 0xffd21a, edge: 0xffffff, ribbon: 0x1a2a5a, skyLight: 0xe8f0ff, bounce: 0xb8b4cc, hemiK: 1.75, sunK: 1.05 },
  // the family aisle: the lights gone wrong, a sick green
  tmfAisle: { zenith: 0x0a0e08, horizon: 0x3a4a22, skyGlow: 0xc8ff5a, fog: 0x1a2212, fogDensity: 0.0018, stars: 0.2, sunSize: 0, clouds: 0, glow: 0xc8ff4a, hold: 0xa8f03a, fret: 0xffe0f0, edge: 0xf4ffe8, ribbon: 0x0e1408, skyLight: 0x9aaa7a, bounce: 0x2a3418, hemiK: 1.6, sunK: 0.4 },
  // "milk turns pink"
  tmfPink: { zenith: 0xff8ac8, horizon: 0xffd8ea, skyGlow: 0xff5aa8, fog: 0xffd0e4, fogDensity: 0.0013, glow: 0xff3a9a, hold: 0xff2a8a, fret: 0xffffff, edge: 0xfff0f8, ribbon: 0x4a0a2a, skyLight: 0xffe0f0, bounce: 0xff9ac8, hemiK: 2.1, sunK: 1.0 },
  // Saturday morning communion: the windows lit, gold, the nave dark
  tmfChurch: { zenith: 0x0a0618, horizon: 0x3a1a4a, skyGlow: 0xffb84a, fog: 0x24122e, fogDensity: 0.0017, stars: 0.6, sunSize: 0, clouds: 0, glow: 0xffc84a, hold: 0xffa82a, fret: 0xc8a0ff, edge: 0xfff4e0, ribbon: 0x140a1c, skyLight: 0xc8a0e0, bounce: 0x4a2a3a, hemiK: 1.8, sunK: 0.6 },
  // "bathroom floor baptism, porcelain priest": white tile, cold
  tmfPorcelain: { zenith: 0x6ab8e8, horizon: 0xe8f6fc, skyGlow: 0xc8f0ff, fog: 0xd8eef6, fogDensity: 0.0017, stars: 0, sunSize: 0, clouds: 0.2, glow: 0x5ad8ff, hold: 0x2ab8ff, fret: 0xffffff, edge: 0xffffff, ribbon: 0x0e2030, skyLight: 0xf0faff, bounce: 0xb8d0e0, hemiK: 2.2, sunK: 0.9 },
  // the last chorus: every cereal at once, the sun going down behind the boxes
  tmfFinal: { zenith: 0x1a1a7a, horizon: 0xff8a6a, skyGlow: 0xffd84a, glowDir: [0.1, 0.06, 1], fog: 0x8a3a5a, fogDensity: 0.0013, stars: 0.3, sunSize: 0.5, clouds: 0.3, glow: 0xffd84a, hold: 0xff3a6a, fret: 0x3ad8ff, edge: 0xffffff, ribbon: 0x1e0e3a, skyLight: 0xffc8b8, bounce: 0xff8a7a, hemiK: 2.0, sunK: 1.1 },
  // the prize: morning again
  tmfPrize: { zenith: 0x3a9cff, horizon: 0xfff0d8, skyGlow: 0xffe08a, fog: 0xf8e6d6, fogDensity: 0.0011, glow: 0xffd21a, hold: 0xff2a5a, fret: 0x2a6aff, edge: 0xffffff, ribbon: 0x2a1840, skyLight: 0xfff4e8, hemiK: 2.1, sunK: 1.4 },
};

// the quoted songs' own palettes, borrowed for their lines (album.js has them all)
const PPG = 'pupCourt', FUN = 'fhdusk', DAD = 'fdNight', OD = 'oaNight', SCH = 'schMorning';

export const song = {
  id: 'try-me-free',
  accent: '#3a6aff',
  title: 'Try Me Free!',
  collect: 'sample',
  // (the song list plays it from the cereal's own chorus: "good girls always eat it")
  preview: 123.25,
  startY: 15,
  sections: [
    { t: 0.0, kind: 'intro', endY: 13 },                                                          // "try me free": the commercial on the TV
    { t: 6.92, kind: 'chorus', start: 'launch', kick: 9, c: 1.15, endY: 11 },                     // the band in: in among the boxes
    { t: 13.82, kind: 'break', endY: 12 },                                                        // "order in the court": the gavel, the stop
    { t: 15.22, kind: 'verse', endY: 10, turn: 0.5 },                                             // "your brother's suit": the funeral
    { t: 24.92, kind: 'post', endY: 12 },                                               // "pulled up to the funeral ... open casket, open bar"
    { t: 37.38, kind: 'pre', endY: 19, turn: 0.4 },                                               // "you have a new subscriber": the livestream
    { t: 47.03, kind: 'post', start: 'launch', kick: 10, endY: 12 },                            // "pastor said a prayer, I was filming in 4K"
    { t: 59.54, kind: 'break', endY: 13 },                                                        // "so what'd you do? I said nothing": the stop
    { t: 63.69, kind: 'chorus', start: 'launch', kick: 11, c: 1.2, endY: 11 },                    // "gave the eulogy" ... "prescription party"
    { t: 80.32, kind: 'pre', endY: 17, turn: 0.4 },                                               // "left a love note in my locker"
    { t: 87.22, kind: 'final', start: 'launch', kick: 12, endY: 12, gap: true },                  // R-I-P-I-G-F-M-L-O-M-G: over the bowl
    { t: 92.78, kind: 'break', endY: 13 },                                                        // "face down in the family aisle"
    { t: 103.86, kind: 'post', start: 'launch', kick: 10, endY: 12 },                           // "tagged at the morgue, livestream the meltdown"
    { t: 114.94, kind: 'bridge', endY: 22, turn: 0.5 },                                           // "milk turns pink ... mascot winking from the shelf"
    { t: 123.25, kind: 'chorus', start: 'launch', kick: 12, c: 1.2, endY: 11, gap: true },                 // "good girls always eat it": the cereal
    { t: 137.11, kind: 'final', c: 1.25, endY: 12 },                                              // "blue check on my trauma ... collect them all"
    { t: 152.34, kind: 'post', start: 'launch', kick: 9, endY: 13 },                            // "I fucked your dad"
    { t: 164.81, kind: 'break', endY: 15 },                                                       // "looking so serene": the stop
    { t: 168.98, kind: 'chorus', start: 'launch', kick: 11, c: 1.15, endY: 11 },                   // "foaming" ... the courthouse
    { t: 187.10, kind: 'break', endY: 13 },                                                       // "pretty guilty, Saturday morning"
    { t: 189.89, kind: 'final', start: 'launch', kick: 12, c: 1.15, endY: 11, gap: true },                 // "communion on my knees"
    { t: 212.25, kind: 'verse', endY: 12, turn: 0.4 },                                            // "bathroom floor baptism, porcelain priest"
    { t: 223.50, kind: 'bridge', endY: 24, turn: 0.5 },                                           // "he sighed ... the guestbook ... the bouquet"
    { t: 233.39, kind: 'chorus', start: 'launch', kick: 12, c: 1.2, endY: 12, gap: true },        // "cereal box boyfriend, congregation's pride"
    { t: 247.67, kind: 'post', endY: 12 },                                             // "read me my rights ... rigor mortis ... sickly sweet"
    { t: 266.36, kind: 'pre', endY: 19 },                                                         // "school shooter sweetheart", "I'm always right"
    { t: 271.90, kind: 'final', start: 'launch', kick: 13, c: 1.3, endY: 8 },                    // every cereal at once
    { t: 284.30, kind: 'outro', endY: 6 },                                                        // the stop, the last hit, the prize
  ],
  rails: [
    { t: 59.54, bars: 2, x: 0 },       // the stop: "I said nothing, but your son sure did"
    { t: 94.16, bars: 2, x: 0 },       // "cartoon grin": along the shelf
    { t: 164.81, bars: 2, x: 0 },      // "looking so serene"
    { t: 224.92, bars: 3, x: 0 },      // "he sighed ... I smiled": along the spoon
    { t: 284.30, bars: 2, x: 0 },      // the last stop, down to the prize
  ],
  palette: 'tmfMorning',
  world: 'tmf',
  lift: { beams: { colors: [0xffd21a, 0xff2a4a, 0x3a6aff] } },
  titleView: { ahead: -0.3, x: 3.4, h: 2.4, back: -0.45, lookH: 3.2 },
  looks: [
    { t: -99, palette: 'tmfMorning' },
    { t: -0.2, palette: 'tmfTV', fade: 0.4 },          // "try me free": the commercial on
    { t: 6.92, palette: 'tmfCereal', fade: 0.12 },     // the band in
    { t: 12.16, palette: PPG, fade: 0.3, set: { hemiK: 2.4, sunK: 0.8 } },             // "order in the court"
    { t: 15.22, palette: FUN, fade: 0.5, set: { hemiK: 2.4, sunK: 0.9 } },             // the funeral
    { t: 37.38, palette: 'tmfLive', fade: 0.3 },       // "you have a new subscriber"
    { t: 57.98, palette: DAD, fade: 0.4, set: { hemiK: 2.5, sunK: 0.9 } },             // "he bought me coffee"
    { t: 63.69, palette: FUN, fade: 0.12, set: { hemiK: 2.4, sunK: 0.9 } },            // "gave the eulogy"
    { t: 72.68, palette: OD, fade: 0.2, set: { hemiK: 2.4, sunK: 0.8 } },              // "prescription party"
    { t: 80.32, palette: SCH, fade: 0.3 },             // "left a love note in my locker"
    { t: 86.50, palette: 'tmfMilk', fade: 0.3 },       // R-I-P ...
    { t: 92.78, palette: 'tmfAisle', fade: 0.4 },      // the family aisle
    { t: 103.86, palette: 'tmfLive', fade: 0.12 },     // "livestream the meltdown"
    { t: 114.48, palette: 'tmfPink', fade: 0.6 },      // "milk turns pink"
    { t: 123.25, palette: 'tmfCereal', fade: 0.12 },   // the cereal
    { t: 152.34, palette: DAD, fade: 0.12, set: { hemiK: 2.5, sunK: 0.9 } },           // "I fucked your dad"
    { t: 155.68, palette: FUN, fade: 0.3, set: { hemiK: 2.4, sunK: 0.9 } },            // "funeral selfie"
    { t: 164.24, palette: OD, fade: 0.4, set: { hemiK: 2.4, sunK: 0.8 } },             // "overdose aesthetic"
    { t: 175.42, palette: PPG, fade: 0.3, set: { hemiK: 2.4, sunK: 0.8 } },            // "pretty until proven guilty"
    { t: 188.38, palette: 'tmfChurch', fade: 0.6 },    // "Saturday morning, communion"
    { t: 211.80, palette: 'tmfPorcelain', fade: 0.3 }, // "bathroom floor baptism"
    { t: 216.98, palette: OD, fade: 0.3, set: { hemiK: 2.4, sunK: 0.8 } },             // "so pretty, pretty, a beautiful bomb"
    { t: 223.50, palette: DAD, fade: 0.6, set: { hemiK: 2.5, sunK: 0.9 } },            // "he sighed"
    { t: 229.00, palette: FUN, fade: 0.4, set: { hemiK: 2.4, sunK: 0.9 } },            // the guestbook
    { t: 233.39, palette: 'tmfCereal', fade: 0.12 },   // "cereal box boyfriend"
    { t: 247.67, palette: PPG, fade: 0.25, set: { hemiK: 2.4, sunK: 0.8 } },           // "read me my rights"
    { t: 253.38, palette: FUN, fade: 0.25, set: { hemiK: 2.4, sunK: 0.9 } },           // "rigor mortis"
    { t: 259.17, palette: OD, fade: 0.25, set: { hemiK: 2.4, sunK: 0.8 } },            // "make destruction sickly sweet"
    { t: 266.36, palette: SCH, fade: 0.25 },           // "school shooter sweetheart"
    { t: 269.13, palette: PPG, fade: 0.2, set: { hemiK: 2.4, sunK: 0.8 } },            // "I'm always right"
    { t: 271.90, palette: 'tmfFinal', fade: 0.12 },    // every cereal at once
    { t: 284.30, palette: 'tmfPrize', fade: 1.4 },     // the prize
  ],
  moments: [
    { t: 4.94, kind: 'pop', k: 0.35, flash: 0.04 },                 // "snap"
    { t: 5.48, kind: 'pop', k: 0.4, flash: 0.05 },                  // "crackle"
    { t: 5.92, kind: 'pop', k: 0.5, flash: 0.07 },                  // "pop"
    { t: 6.92, kind: 'flash', k: 0.3 },                             // the band in
    { t: 14.14, kind: 'knock', n: 1, k: 0.7 },                      // "court": the gavel
    { t: 26.44, kind: 'bell', k: 0.4 },                             // "funeral"
    { t: 31.42, kind: 'pop', k: 0.3 },                              // "casket"
    { t: 32.04, kind: 'glass', k: 0.35 },                           // "bar"
    { t: 38.08, kind: 'ring', k: 0.3, dur: 0.4 },                   // "subscriber"
    { t: 41.52, kind: 'ring', k: 0.25, dur: 0.2 },                  // "ding
    { t: 42.00, kind: 'ring', k: 0.25, dur: 0.2 },                  //  ding
    { t: 42.18, kind: 'ring', k: 0.25, dur: 0.2 },                  //  ding
    { t: 42.42, kind: 'ring', k: 0.3, dur: 0.3 },                   //  ding"
    { t: 49.38, kind: 'shutter', k: 0.6 },                          // "4K"
    { t: 52.70, kind: 'flash', k: 0.2 },                            // "slayed"
    { t: 59.14, kind: 'glass', k: 0.3 },                            // "coffee"
    { t: 63.69, kind: 'flash', k: 0.35 },                           // "gave the eulogy"
    { t: 72.68, kind: 'pop', k: 0.3, flash: 0.04 },                 // "prescription party"
    { t: 76.46, kind: 'pop', k: 0.3 },                              // "nail polish"
    { t: 78.40, kind: 'ring', k: 0.3, dur: 1.2 },                   // "ambulance sirens"
    { t: 82.00, kind: 'knock', n: 1, k: 0.45 },                     // "locker"
    { t: 84.72, kind: 'pop', k: 0.3 },                              // "sticker"
    { t: 86.50, kind: 'pop', k: 0.22 }, { t: 86.74, kind: 'pop', k: 0.22 }, { t: 86.86, kind: 'pop', k: 0.24 },   // R I P
    { t: 87.08, kind: 'pop', k: 0.22 }, { t: 87.46, kind: 'pop', k: 0.24 },                                      // I G
    { t: 87.78, kind: 'pop', k: 0.22 }, { t: 88.08, kind: 'pop', k: 0.22 }, { t: 88.24, kind: 'pop', k: 0.24 },   // F M L
    { t: 88.54, kind: 'pop', k: 0.24 }, { t: 88.74, kind: 'pop', k: 0.24 }, { t: 88.94, kind: 'pop', k: 0.3 },    // O M G
    { t: 90.18, kind: 'flash', k: 0.2 },                            // "thrive"
    { t: 91.54, kind: 'glass', k: 0.3 },                            // "tea"
    { t: 94.80, kind: 'pop', k: 0.3 },                              // "grin"
    { t: 103.86, kind: 'flash', k: 0.3 },                           // "tagged at the morgue"
    { t: 105.34, kind: 'shutter', k: 0.5 },                         // "livestream"
    { t: 111.64, kind: 'bell', k: 0.45 },                           // "followers": ten million
    { t: 114.48, kind: 'flash', k: 0.2 },                           // "milk turns pink"
    { t: 116.36, kind: 'pop', k: 0.3 }, { t: 117.20, kind: 'pop', k: 0.3 }, { t: 117.46, kind: 'pop', k: 0.35 },   // "pink, pink, pink"
    { t: 120.72, kind: 'pop', k: 0.4, flash: 0.04 },                // "winking"
    { t: 123.25, kind: 'flash', k: 0.4 },                           // the cereal
    { t: 123.25, kind: 'fireworks', n: 8, y: 50, ahead: 1.6, x: 40 },
    { t: 136.96, kind: 'ring', k: 0.35, dur: 0.6 },                 // "blue check"
    { t: 139.88, kind: 'impact', k: 0.45 },                         // "box"
    { t: 142.42, kind: 'bell', k: 0.5 },                            // "collect them all"
    { t: 145.54, kind: 'pop', k: 0.3 },                             // "nutrition facts"
    { t: 150.54, kind: 'pop', k: 0.3 }, { t: 151.16, kind: 'pop', k: 0.3 }, { t: 151.62, kind: 'pop', k: 0.35 },   // "numb, numb, numb"
    { t: 152.34, kind: 'flash', k: 0.3 },                           // "I fucked your dad"
    { t: 152.98, kind: 'impact', k: 0.55 },
    { t: 156.02, kind: 'shutter', k: 0.6 },                         // "selfie"
    { t: 157.14, kind: 'shutter', k: 0.5 },                         // "blessed"
    { t: 161.26, kind: 'flash', k: 0.25 },                          // "crest"
    { t: 164.81, kind: 'blackout', dur: 1.3, k: 0.7 },              // the stop
    { t: 168.98, kind: 'flash', k: 0.4 },                           // the band back
    { t: 172.82, kind: 'shutter', k: 0.6 },                         // "Instagram"
    { t: 173.48, kind: 'shutter', k: 0.55 },                        // "the moment"
    { t: 176.80, kind: 'knock', n: 1, k: 0.6 },                     // "guilty"
    { t: 182.54, kind: 'knock', n: 2, k: 0.55 },                    // "felony"
    { t: 184.20, kind: 'glass', k: 0.4 },                           // "throw away the key"
    { t: 187.82, kind: 'knock', n: 1, k: 0.6 },                     // "guilty"
    { t: 189.89, kind: 'flash', k: 0.35 },                          // "communion"
    { t: 190.06, kind: 'bell', n: 2, k: 0.5, gap: 520 },
    { t: 197.72, kind: 'bell', k: 0.45 },                           // "holy,
    { t: 198.20, kind: 'bell', k: 0.45, degree: 4 },                //  holy"
    { t: 204.56, kind: 'pop', k: 0.45, flash: 0.05 },               // "vitamin D"
    { t: 205.98, kind: 'pop', k: 0.45, flash: 0.05 },               // "vitamin B"
    { t: 206.84, kind: 'glass', k: 0.35 },                          // "holy water"
    { t: 212.38, kind: 'ring', k: 0.3, dur: 0.9 },                  // "baptism"
    { t: 219.22, kind: 'impact', k: 0.7 },                          // "bomb"
    { t: 219.22, kind: 'fireworks', n: 8, y: 44, ahead: 1.2, x: 32 },
    { t: 228.06, kind: 'bell', k: 0.35 },                           // "equalize"
    { t: 229.48, kind: 'pop', k: 0.25 },                            // "guestbook"
    { t: 233.39, kind: 'flash', k: 0.35 },                          // "took it home"
    { t: 248.62, kind: 'knock', n: 1, k: 0.5 },                     // "rights": the cuffs
    { t: 252.28, kind: 'pop', k: 0.3 },                             // "receipts"
    { t: 253.74, kind: 'knock', n: 1, k: 0.55 },                    // "rigor"
    { t: 264.94, kind: 'flash', k: 0.25 },                          // "sweet"
    { t: 270.12, kind: 'knock', n: 1, k: 0.6 },                     // "always right": the gavel
    { t: 271.90, kind: 'flash', k: 0.45 },                          // every cereal at once
    { t: 271.90, kind: 'fireworks', n: 10, y: 52, ahead: 1.6, x: 40 },
    { t: 277.78, kind: 'shutter', k: 0.5 },                         // "verify"
    { t: 280.22, kind: 'flash', k: 0.3 },                           // "overdose aesthetic"
    { t: 284.30, kind: 'blackout', dur: 1.5, k: 0.55 },             // the stop
    { t: 288.34, kind: 'bell', k: 0.35 },                           // "amen"
    { t: 289.28, kind: 'bell', k: 0.4, degree: 4 },
    { t: 289.90, kind: 'flash', k: 0.6 },                           // the last hit: the prize
    { t: 289.90, kind: 'fireworks', n: 12, y: 50, ahead: 1.4, x: 36 },
  ],
  scenery: {
    zones: [
      // ---- the whole record, a cereal each, both sides and away to the horizon ----
      { from: -6, to: 300, kits: ['tmfFar'], every: 1.3 },
      { from: -6, to: 6.6, kits: ['tmfBoxes'], every: 0.62, x: 34, free: 1, wake0: 0.35 },
      { from: 6.6, to: 12.0, kits: ['tmfBoxes'], every: 0.62, x: 34, free: 0.3, wake0: 0.35 },
      { from: 0, to: 12, kits: ['tmfBursts'], every: 1.4, x: 21, cell: 0 },
      // "order in the court"
      { from: 12.0, to: 15.0, kits: ['tmfBoxes'], every: 0.6, x: 46, song: 'pretty-until-proven-guilty' },
      // the funeral: a shelf of it
      { from: 15.2, to: 37.0, kits: ['tmfBoxes'], every: 0.75, x: 48, song: 'makeup-sex-at-your-funeral', wake0: 0.2 },
      // the livestream
      { from: 37.3, to: 57.6, kits: ['tmfBoxes'], every: 0.7, x: 40, wake0: 0.3 },
      // the coffee he bought
      { from: 57.6, to: 63.5, kits: ['tmfBoxes'], every: 0.7, x: 48, song: 'i-fucked-your-dad' },
      { from: 63.7, to: 72.5, kits: ['tmfBoxes'], every: 0.7, x: 48, song: 'makeup-sex-at-your-funeral' },
      { from: 72.6, to: 80.2, kits: ['tmfBoxes'], every: 0.7, x: 50, song: 'overdose-aesthetic' },
      { from: 80.3, to: 86.2, kits: ['tmfBoxes'], every: 0.7, x: 48, song: 'school-shooter-sweetheart' },
      // the family aisle: the boxes in rows like shelves, one face down
      { from: 92.6, to: 103.6, kits: ['tmfBoxes'], every: 0.5, x: 30, rows: 3, aisle: true, wake0: 0.12 },
      { from: 103.8, to: 114.6, kits: ['tmfBoxes'], every: 0.66, x: 40, wake0: 0.3 },
      { from: 114.6, to: 123.0, kits: ['tmfBoxes'], every: 0.7, x: 42, free: 0.5, wake0: 0.4 },
      // the cereal: the whole record, dense, starbursts down the middle
      { from: 123.2, to: 152.2, kits: ['tmfBoxes'], every: 0.5, x: 32, rows: 2, free: 0.3, wake0: 0.45 },
      { from: 124, to: 151, kits: ['tmfBursts'], every: 1.1, x: 19, cell: 1 },
      { from: 152.3, to: 155.6, kits: ['tmfBoxes'], every: 0.6, x: 46, song: 'i-fucked-your-dad' },
      { from: 155.6, to: 164.2, kits: ['tmfBoxes'], every: 0.7, x: 48, song: 'makeup-sex-at-your-funeral' },
      { from: 164.2, to: 175.3, kits: ['tmfBoxes'], every: 0.7, x: 50, song: 'overdose-aesthetic' },
      { from: 175.3, to: 188.2, kits: ['tmfBoxes'], every: 0.65, x: 48, song: 'pretty-until-proven-guilty' },
      // Saturday morning communion: stained glass down the nave
      { from: 188.6, to: 211.4, kits: ['tmfArches'], every: 0.62, x: 30 },
      { from: 211.6, to: 223.2, kits: ['tmfBoxes'], every: 0.7, x: 50, song: 'overdose-aesthetic' },
      { from: 223.4, to: 229.0, kits: ['tmfBoxes'], every: 0.8, x: 50, song: 'i-fucked-your-dad', wake0: 0.15 },
      { from: 229.0, to: 233.2, kits: ['tmfBoxes'], every: 0.8, x: 50, song: 'makeup-sex-at-your-funeral', wake0: 0.15 },
      { from: 233.3, to: 247.5, kits: ['tmfBoxes'], every: 0.5, x: 32, rows: 2, free: 0.3, wake0: 0.45 },
      { from: 234, to: 247, kits: ['tmfBursts'], every: 1.2, x: 19, cell: 2 },
      { from: 247.6, to: 253.3, kits: ['tmfBoxes'], every: 0.65, x: 48, song: 'pretty-until-proven-guilty' },
      { from: 253.3, to: 259.1, kits: ['tmfBoxes'], every: 0.7, x: 48, song: 'makeup-sex-at-your-funeral' },
      { from: 259.1, to: 266.3, kits: ['tmfBoxes'], every: 0.7, x: 50, song: 'overdose-aesthetic' },
      { from: 266.3, to: 269.1, kits: ['tmfBoxes'], every: 0.6, x: 48, song: 'school-shooter-sweetheart' },
      { from: 269.1, to: 271.8, kits: ['tmfBoxes'], every: 0.6, x: 48, song: 'pretty-until-proven-guilty' },
      // every cereal at once
      { from: 271.8, to: 284.2, kits: ['tmfBoxes'], every: 0.45, x: 30, rows: 2, mix: true, wake0: 0.6, pours: 0.3 },
      { from: 284.2, to: 300, kits: ['tmfBoxes'], every: 0.8, x: 44, free: 0.6, wake0: 0.5 },
      // cereal spilled on the table all the way
      { from: -4, to: 296, kits: ['tmfPiles'], every: 0.9 },
      // ---- each quoted song's box, lit and tipped and pouring for its lines ----
      { from: 0, to: 0.1, kits: ['tmfHero'], at: [
        { t: 9.0, x: 46, song: 'free', s: 1.6, lit: [6.9, 13.8], tip: 0.5, tipAt: [4.7, 5.2], pour: [4.94, 13.0] },    // "snap, crackle, pop"
        { t: 14.6, x: -50, song: 'pretty-until-proven-guilty', s: 1.4, lit: [12.1, 16.0] },
        { t: 30.4, x: -52, song: 'makeup-sex-at-your-funeral', s: 1.6, lit: [15.2, 37.3], tip: 0.45, tipAt: [30.6, 31.2], pour: [31.0, 37.0] },
        { t: 60.8, x: 50, song: 'i-fucked-your-dad', s: 1.5, lit: [57.9, 63.6] },
        { t: 75.4, x: 52, song: 'overdose-aesthetic', s: 1.6, lit: [72.6, 80.3], tip: 0.5, tipAt: [72.4, 72.9], pour: [72.7, 79.6] },
        { t: 83.0, x: -50, song: 'school-shooter-sweetheart', s: 1.5, lit: [80.3, 86.4] },
        { t: 126.6, x: -44, song: 'free', s: 2.0, lit: [123.2, 152.3], tip: 0.55, tipAt: [123.0, 123.6], pour: [123.3, 151.6] },
        { t: 153.6, x: 52, song: 'i-fucked-your-dad', s: 1.5, lit: [152.3, 155.6] },
        { t: 170.6, x: -52, song: 'overdose-aesthetic', s: 1.6, lit: [164.2, 175.3] },
        { t: 179.4, x: 52, song: 'pretty-until-proven-guilty', s: 1.6, lit: [175.4, 188.3], tip: 0.4, tipAt: [183.3, 184.3], pour: [184.2, 188.0] },
        { t: 236.4, x: 44, song: 'free', s: 2.0, lit: [233.3, 247.6], tip: 0.55, tipAt: [233.2, 233.8], pour: [233.4, 247.2] },
        { t: 249.6, x: -52, song: 'pretty-until-proven-guilty', s: 1.5, lit: [247.6, 253.3] },
        { t: 255.4, x: 52, song: 'makeup-sex-at-your-funeral', s: 1.5, lit: [253.3, 259.1] },
        { t: 261.4, x: -52, song: 'overdose-aesthetic', s: 1.5, lit: [259.1, 266.3], tip: 0.5, tipAt: [259.4, 259.9], pour: [259.6, 266.0] },
        { t: 267.6, x: 52, song: 'school-shooter-sweetheart', s: 1.5, lit: [266.3, 269.1] },
      ] },
      // ---- the commercial's things ----
      { from: 0, to: 0.1, kits: ['tmfProps'], at: [
        { t: 3.0, x: -44, kind: 'tv', s: 1.25, cells: [[-99, 0]] },                                  // the commercial, playing
        { t: 7.6, x: 26, kind: 'carton', s: 1.3 },
        { t: 10.6, x: -28, kind: 'glass', s: 1.2 },
        { t: 40.2, x: 36, kind: 'tv', s: 0.9, cells: [[-99, 2], [41.5, 1], [44.6, 3], [47.1, 1]] },  // NEW SUBSCRIBER; LIVE; SWIPE UP
        { t: 51.6, x: -36, kind: 'tv', s: 0.9, cells: [[-99, 1]] },                                  // "filming in 4K"
        { t: 88.25, x: 0, kind: 'bowl', s: 1.0, sy: 0.55, rows: [87.32, 88.42, 89.28], slots: [3, 5, 3], letters: [[86.50, 0, 0, 0], [86.74, 1, 0, 1], [86.86, 2, 0, 2], [87.08, 1, 1, 0], [87.46, 3, 1, 1], [87.78, 4, 1, 2], [88.08, 5, 1, 3], [88.24, 6, 1, 4], [88.54, 7, 2, 0], [88.74, 5, 2, 1], [88.94, 3, 2, 2]] },   // R.I.P. I.G.F.M.L. O.M.G.
        { t: 91.2, x: -30, kind: 'spoon', s: 1.2, rot: 0.6 },
        { t: 98.6, x: 28, kind: 'down', s: 1.3 },                                                   // a box face down in the family aisle
        { t: 95.2, x: -40, kind: 'mascot', s: 1.3, grin: 94.80 },                                    // "cartoon grin"
        { t: 108.8, x: 36, kind: 'tv', s: 0.9, cells: [[-99, 1]] },                                  // "livestream the meltdown"
        { t: 112.8, x: -38, kind: 'tv', s: 1.0, cells: [[-99, 4], [111.64, 5]] },                    // "ten million followers"
        { t: 116.4, x: -72, kind: 'bowl', s: 1.5, pink: 114.48 },                         // "milk turns pink"
        { t: 118.6, x: 30, kind: 'glass', s: 1.3 },                                                 // this balanced breakfast
        { t: 119.2, x: -30, kind: 'carton', s: 1.4 },
        { t: 121.8, x: 34, kind: 'mascot', s: 1.5, wink: 120.72 },                                   // winking from the shelf
        { t: 137.6, x: -30, kind: 'badge', s: 1.3, on: 136.62 },                                     // "blue check on my trauma"
        { t: 141.4, x: 30, kind: 'target', s: 1.4 },                                                // "target demographic"
        { t: 143.4, x: -32, kind: 'panel', cell: 8, s: 34 },                                        // "collect them all"
        { t: 146.6, x: 32, kind: 'panel', cell: 9, s: 34 },                                         // "nutrition facts"
        { t: 206.2, x: 34, kind: 'font', s: 0.75, pops: [[204.56, 8, 6], [205.98, 9, -6]] },          // "vitamin D, vitamin B, plus holy water"
        { t: 226.2, x: -28, kind: 'spoon', s: 1.5, rot: -0.3 },
      ] },
      // ---- the quoted songs' own things, for their lines, each lit like a product on the table ----
      { from: 0, to: 0.1, kits: ['judgeBench'], at: [[15.0, 26, true]], strikes: [14.14], s: 1.3 },   // "order in the court"
      { kits: ['casket'], at: 31.8, x: 24 },                                                        // "open casket,
      { kits: ['bar'], at: 32.6, x: -24 },                                                          //  open bar"
      { kits: ['lipstick'], at: 35.4, x: 24, s: 2.2 },                                              // "my lipstick matches"
      { from: 0, to: 0.1, kits: ['fdProps'], at: [
        { t: 60.0, x: -24, kind: 'coffee', s: 1.5 },                                                // "he bought me coffee"
        { t: 154.4, x: -26, kind: 'mug', s: 2.0 },                                                  // "better than you"
        { t: 228.8, x: 24, kind: 'scales', s: 1.4, level: 227.4 },                                  // "we can equalize"
      ] },
      { kits: ['lectern'], at: 65.8, x: 24, s: 1.6 },                                               // "gave the eulogy"
      { from: 75.0, to: 78.6, kits: ['oaPolishRow'], every: 0.6, x: 28 },                           // "blue lips match my nail polish"
      { from: 77.8, to: 80.6, kits: ['oaSirens'], every: 0.7, x: 26, s: 1.3, on: 78.40, off: 80.3 }, // "ambulance sirens"
      { kits: ['openLocker'], at: 82.8, x: 24, s: 1.6 },                                            // "a love note in my locker"
      { from: 0, to: 0.1, kits: ['oaProps'], at: [{ t: 220.0, x: 26, kind: 'bomb', s: 1.4 }] },      // "a beautiful bomb"
      { kits: ['key'], at: 185.0, throwAt: 184.2, dir: 1, s: 1.4 },                                 // "throw away the key"
      { kits: ['guestbook'], at: 230.2, x: -24, s: 1.6 },                                           // "the guestbook"
      { kits: ['bouquet'], at: 233.0, t0: 231.44, t1: 233.44, xFrom: -40, xTo: 0, lift: 4, arc: 10, s: 3.4 },   // "caught the mourning bouquet, took it home"
      { kits: ['cuffs'], at: 249.6, x: 26, click: 248.62, s: 1.6 },                                 // "read me my rights"
      { kits: ['receipts'], at: 252.6, n: 22, top: 46 },                                            // "receipts for every gift"
      { kits: ['casket'], at: 255.4, x: -24 },                                                      // "rigor mortis"
      { from: 0, to: 0.1, kits: ['tmfProps'], at: [
        { t: 15.0, x: 26, kind: 'spot', on: 14.14, c: [1, 0.85, 0.6], r: 40 },
        { t: 31.8, x: 24, kind: 'spot', on: 31.42, c: [1, 0.85, 0.75] },
        { t: 32.6, x: -24, kind: 'spot', on: 32.04, c: [1, 0.8, 0.5] },
        { t: 35.4, x: 24, kind: 'spot', on: 34.56, c: [1, 0.4, 0.5] },
        { t: 60.0, x: -24, kind: 'spot', on: 59.14, c: [1, 0.85, 0.65] },
        { t: 65.8, x: 24, kind: 'spot', on: 64.74, c: [1, 0.9, 0.75] },
        { t: 82.8, x: 24, kind: 'spot', on: 81.64, c: [1, 0.5, 0.7] },
        { t: 154.4, x: -26, kind: 'spot', on: 152.98, c: [1, 0.9, 0.8], r: 40 },
        { t: 220.0, x: 26, kind: 'spot', on: 219.22, c: [1, 0.45, 0.75], r: 40 },
        { t: 228.8, x: 24, kind: 'spot', on: 228.06, c: [1, 0.85, 0.55] },
        { t: 230.2, x: -24, kind: 'spot', on: 229.48, c: [1, 0.9, 0.7] },
        { t: 249.6, x: 26, kind: 'spot', on: 248.62, c: [1, 0.9, 0.8] },
        { t: 255.4, x: -24, kind: 'spot', on: 253.74, c: [1, 0.85, 0.75] },
      ] },
    ],
    // the boards carry only lines both hearings agree on, and none of the explicit ones
    lyricPart: 'tmfBoard', lyricX: 0, lyricBg: '#fffaf2', lyricColor: '#e8202e', lyricCore: '#b80a1e', lyricFont: '"Archivo Black", "Arial Black", Impact, sans-serif', lyricWeight: 400,
    lyrics: [
      { t: 0.0, text: 'TRY ME\nFREE!', h: 15, lead: 3.4 },
      { t: 4.94, text: 'SNAP, CRACKLE,\nPOP', h: 13 },
      { t: 31.0, text: 'OPEN CASKET,\nOPEN BAR', h: 13 },
      { t: 37.38, text: 'YOU HAVE A NEW\nSUBSCRIBER', h: 13 },
      { t: 44.66, text: 'SWIPE UP\nTO MONETIZE', h: 13 },
      { t: 47.14, text: 'PASTOR SAID A PRAYER,\nI WAS FILMING IN 4K', h: 12 },
      { t: 72.68, text: 'PRESCRIPTION\nPARTY', h: 13 },
      { t: 77.22, text: 'AMBULANCE SIRENS,\nSO SOPHISTICATED', h: 12 },
      { t: 80.82, text: 'LEFT A LOVE NOTE\nIN MY LOCKER', h: 12 },
      { t: 89.20, text: "SHE DIED, I THRIVE,\nTHAT'S THE TEA", h: 13 },
      { t: 105.34, text: 'LIVESTREAM\nTHE MELTDOWN', h: 13 },
      { t: 110.90, text: 'TEN MILLION\nFOLLOWERS', h: 13 },
      { t: 114.48, text: 'MILK TURNS\nPINK', h: 14 },
      { t: 117.60, text: 'THIS BALANCED\nBREAKFAST', h: 13 },
      { t: 136.62, text: 'BLUE CHECK\nON MY TRAUMA', h: 13 },
      { t: 138.98, text: 'CEREAL BOX\nBOYFRIEND', h: 14 },
      { t: 155.68, text: 'HASHTAG\nBLESSED', h: 13 },
      { t: 160.36, text: "I'M CATCHING\nTHE CREST", h: 14 },
      { t: 164.24, text: 'OVERDOSE AESTHETIC,\nLOOKING SO SERENE', h: 12 },
      { t: 172.82, text: 'INSTAGRAM\nTHE MOMENT', h: 13 },
      { t: 175.76, text: 'PRETTY UNTIL\nPROVEN GUILTY', h: 13 },
      { t: 177.46, text: 'SKIRT TOO SHORT\nFOR THE COURTHOUSE', h: 12 },
      { t: 180.60, text: 'IF LOVING MY CHAOS\nIS A FELONY', h: 12 },
      { t: 183.26, text: 'THROW AWAY\nTHE KEY', h: 13 },
      { t: 188.38, text: 'SATURDAY MORNING\nCOMMUNION', h: 13 },
      { t: 206.60, text: 'PLUS HOLY\nWATER', h: 13 },
      { t: 211.80, text: 'BATHROOM FLOOR BAPTISM,\nPORCELAIN PRIEST', h: 12 },
      { t: 216.98, text: 'SO PRETTY, PRETTY,\nA BEAUTIFUL BOMB', h: 12 },
      { t: 226.62, text: 'I KNOW A WAY THAT\nWE CAN EQUALIZE', h: 12 },
      { t: 231.44, text: 'CAUGHT THE MOURNING\nBOUQUET, TOOK IT HOME', h: 12 },
      { t: 233.98, text: "CONGREGATION'S\nPRIDE", h: 13 },
      { t: 247.88, text: 'READ ME\nMY RIGHTS', h: 13 },
      { t: 250.52, text: 'RECEIPTS FOR\nEVERY GIFT', h: 13 },
      { t: 262.72, text: 'MAKE DESTRUCTION\nSICKLY SWEET', h: 12 },
      { t: 269.54, text: "I'M ALWAYS\nRIGHT", h: 13 },
    ],
    // the table is flat under everything (the other songs' things stand on it at 0)
    flat: [[-40, 400, 0]], drop: 0,
    finale: { kind: 'tmf', t: 296.4, x: -30, s: 1.3, rot: -2.0, fireAt: 289.6, orbit: { r: 64, h: 12, y: 12, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.24, heroBack: 9, heroFov: 46, heroUp: 2.0 } },
  },
};
