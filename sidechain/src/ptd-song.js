// PTSDream Girl: its course, its looks, its moments and what stands along the way. (album.js puts it
// in the record; the place itself is in ptd-world.js, its things in ptd-props.js.)
//
// His night, three years after her, and she's in every room of it. Her perfume first, a red glass
// grenade: the pin on "pull the pin", four start lights on "count to four", and it goes on "sting",
// throwing you over the quiet in through his front door. His hall with the pale squares where her
// pictures hung and her things in boxes; the shower shaking; THREE YEARS GONE in lipstick on the
// mirror; the knife block with one slot empty; out the back to the 24-hour store, her perfume at the
// end of an aisle, aisle four closing in, the scanners beeping on the beat (the rail is the belt),
// the basket on the floor; the lights go out and the only thing lit is EMERGENCY EXIT, ALARM WILL
// SOUND. Every chorus goes through one of those doors and the alarm goes off: her stage, red beacons
// sweeping the dark, DREAM GIRL in neon, and an empty cushion where her crown should be. October in
// his street; his bedroom with every light on and her phone on the nightstand; the therapist's chair
// and his journal with her in the margins. The bridge is inside his head at 3:47: the anniversary
// on the calendar, the wine, lights that trigger as you pass, cameras that turn to watch you, the
// hippocampus with PTSD carved in a heart, a compass that points at you. The new girl's plant and
// candle and the lace coming up the walls; then all of it, and the crown, behind glass.

// the bars, as the drums have them (145 bpm; the bar line a beat before the analysis put it: the
// band's every entry, stop and chord change is on the tracked grid's fourth beat):
// 1.34 ... 14.57 16.25 17.87 ... 29.46 ... 44.36 ... 54.31 55.95 57.59 59.25 ... 85.74 87.40 89.05
// ... 102.29 ... 115.53 ... 127.14 128.78 130.42 132.08 ... 158.57 ... 183.39 185.05 ... 201.61
// 203.25 204.91 ... 257.88 (the last hit)

// his rooms' doorways: his front door, the doors between his rooms, the store's way in, the mouth
// of aisle four, and the emergency exits every chorus goes through
const FRONT = { kind: 'front', hw: 13, hh: 29 };
const DOOR = { kind: 'wall', hw: 12, hh: 25 };
const STORE = { kind: 'front', hw: 14, hh: 22 };
const AISLE = { kind: 'wall', hw: 22, hh: 24 };
const EXIT = { kind: 'wall', hw: 12, hh: 24 };

// lipstick on a mirror
const LIPSTICK = { color: '#e8001e', core: '#ff2a44', bg: '#8a949e', font: '"Segoe Script", "Brush Script MT", "Comic Sans MS", cursive', weight: '700', faceAspect: 1.52 };
// the alert boards over the road carry no frame (a lyric gets one in the song's colour unless told)
const NOFRAME = 'rgba(0,0,0,0)';

const NIGHT = {
  zenith: 0x020308, horizon: 0x120810, skyGlow: 0x5a0a1a, glowDir: [0.2, 0.05, 1], skyline: 0x06040a, moonDir: [-0.4, 0.45, 0.8], moon: 0xd8e0ff,
  fog: 0x0a060c, fogDensity: 0.0019, stars: 0.25, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.0,
  ground: 0x0c0a0e, street: 0xff2a3a, roof: 0x1a1418, wall: 0x2a2228, tree: 0x0c0a0c,
  window: 0xffd0a0, windowAlt: 0x8ac8ff, lamp: 0xffd0a0,
  ribbon: 0x120a10, edge: 0xffe8ec, fret: 0xff5a7a, glow: 0xff2a40, hold: 0xff2a48, gate: 0xffffff, gem: 0xfff0f4,
  skyLight: 0x8a7a9a, bounce: 0x3a1018, hemiK: 1.6, sunK: 0.5,
  board: 0x140a10, suit: 0x121016, jacket: 0xff1a3a, hair: 0x1a0c0c, shoes: 0xf0e4e4, gloves: 0x121016, rim: 0xff8aa0, daze: 0,
};

export const palettes = {
  ptdNight: NIGHT,
  // "trigger warning": the dark, her bottle lit from under it
  ptdWarn: { horizon: 0x1a0610, skyGlow: 0x8a0a2a, fog: 0x0c0408, skyLight: 0x9a6a8a, bounce: 0x4a0a18 },
  // "cold red lullaby": the beacons come on
  ptdLullaby: { zenith: 0x060004, horizon: 0x2a0410, skyGlow: 0xff1a3a, fog: 0x14040a, skyLight: 0xc87a8a, bounce: 0x5a0a14, hemiK: 1.8, glow: 0xff2a3a, hold: 0xff1a40 },
  // his place: cold, a single bulb, his colour (the hold) a pale blue
  ptdHome: { zenith: 0x04060c, horizon: 0x101828, skyGlow: 0x2a3a5a, fog: 0x0c1018, fogDensity: 0.0024, skyLight: 0xb8c8e0, bounce: 0x2a2a34, hemiK: 1.7, glow: 0x7ad8ff, hold: 0x5ac8ff, fret: 0xa8e0ff, edge: 0xf0f8ff, ribbon: 0x0c0e14, gem: 0xf4f6ff },
  // the bathroom: white tile, the light too bright
  ptdBath: { fog: 0x18202a, fogDensity: 0.0022, skyLight: 0xe8f4ff, bounce: 0x5a6a78, hemiK: 1.75, glow: 0x9ae8ff, hold: 0x6ad8ff, fret: 0xc8f0ff, edge: 0xffffff },
  // the kitchen at night: the light over the counter
  ptdKitchen: { fog: 0x100c0a, fogDensity: 0.0024, skyLight: 0xffd8b0, bounce: 0x3a2818, hemiK: 1.7, glow: 0xffc890, hold: 0x5ac8ff },
  // the 24-hour store: fluorescent, a little green
  ptdStore: { fog: 0x141a16, fogDensity: 0.002, skyLight: 0xe8fff0, bounce: 0x4a5a4a, hemiK: 2.1, glow: 0xa8ffd8, hold: 0x5ae8c8, fret: 0xd0fff0, edge: 0xffffff, ribbon: 0x10141a },
  // aisle four: the panic, everything pulled toward red
  ptdPanic: { fog: 0x2a0a10, fogDensity: 0.0026, skyLight: 0xffa8b0, bounce: 0x5a1a20, hemiK: 1.9, glow: 0xff4a6a, hold: 0xff2a48, fret: 0xff9aa8 },
  // "do you miss me?": the store's lights out, the exit sign
  ptdOut: { zenith: 0x010102, horizon: 0x080306, skyGlow: 0x3a0a10, fog: 0x060304, fogDensity: 0.0026, skyLight: 0x4a2a30, bounce: 0x1a0608, hemiK: 0.9, glow: 0xff2a3a, hold: 0xff2a48 },
  // the alarm: her stage, red
  ptdAlarm: { zenith: 0x080004, horizon: 0x40040e, skyGlow: 0xff1030, fog: 0x1e040a, fogDensity: 0.0015, stars: 0.5, skyLight: 0xff8a90, bounce: 0x6a0a14, hemiK: 2.1, glow: 0xff2a40, hold: 0xff1a40, fret: 0xff9aa8, edge: 0xfff0f2, ribbon: 0x16040a, gem: 0xfff0f4 },
  // the back half of each chorus: pink in the red
  ptdAlarm2: { horizon: 0x4a0628, skyGlow: 0xff2a8a, fog: 0x200414, skyLight: 0xff9ac8, bounce: 0x6a0a30, glow: 0xff3a8a, hold: 0xff2a7a, fret: 0xffb0d8 },
  // the stop: the lights cut
  ptdDark: { zenith: 0x000000, horizon: 0x060204, skyGlow: 0x2a0408, fog: 0x040203, fogDensity: 0.0028, skyLight: 0x3a2a30, bounce: 0x0a0405, hemiK: 0.8 },
  // October in his street: sodium lamps, the leaves
  ptdOctober: { zenith: 0x05040a, horizon: 0x2a1408, skyGlow: 0xc8501a, fog: 0x1a0c06, fogDensity: 0.0019, stars: 0.4, skyLight: 0xffc890, bounce: 0x5a2a10, hemiK: 1.9, glow: 0xffa040, hold: 0x5ac8ff, fret: 0xffd08a, edge: 0xfff4e0, street: 0xffa040, window: 0xffc070, ground: 0x14100c },
  // his bedroom with every light on
  ptdLights: { fog: 0x2a2418, fogDensity: 0.0018, skyLight: 0xfff4dc, bounce: 0x8a7050, hemiK: 2.1, glow: 0xffe8b0, hold: 0x5ac8ff, fret: 0xfff0c8, edge: 0xffffff },
  // her phone at dawn: the blue coming in the blinds
  ptdDawn: { fog: 0x2a3048, skyLight: 0xc8d0ff, bounce: 0x5a5070, hemiK: 2.2, glow: 0xa8b8ff, hold: 0x7ab8ff },
  // "colonize your brain": her red creeping in
  ptdColony: { fog: 0x2a1018, skyLight: 0xffb0b8, bounce: 0x6a2a30, hemiK: 2.0, glow: 0xff4a5a, hold: 0xff3a50 },
  // the therapist's office: lamp light, wood
  ptdOffice: { fog: 0x1a120c, fogDensity: 0.0022, skyLight: 0xffdcb0, bounce: 0x4a2e1a, hemiK: 1.8, glow: 0xffc070, hold: 0x5ac8ff, fret: 0xffe0b0, edge: 0xfff4e4 },
  // his journal: paper white, blue ink
  ptdJournal: { fog: 0x1c1a18, skyLight: 0xf4f0e8, bounce: 0x5a5448, hemiK: 2.0, glow: 0x8ab8ff, hold: 0x4ab0ff },
  // "say my name": down to the exit sign again
  ptdHush: { zenith: 0x010102, horizon: 0x0a0306, skyGlow: 0x3a0a10, fog: 0x080406, fogDensity: 0.0024, skyLight: 0x5a3a40, bounce: 0x1a0608, hemiK: 1.0, glow: 0xff2a3a, hold: 0xff2a48 },
  // inside his head at 3 a.m.: deep blue
  ptdHead: { zenith: 0x010208, horizon: 0x061028, skyGlow: 0x1a3a8a, fog: 0x040818, fogDensity: 0.0021, stars: 1.1, skyLight: 0x6a7ab8, bounce: 0x10183a, hemiK: 1.4, glow: 0x6a9aff, hold: 0x5a8aff, fret: 0xa8c0ff, edge: 0xe8f0ff, ribbon: 0x060a18, ground: 0x04060e, street: 0x3a5aff },
  // "taste of copper, smell of wine"
  ptdWine: { skyGlow: 0x8a1030, fog: 0x10040c, skyLight: 0xc87a90, bounce: 0x3a0a18, glow: 0xff3a5a, hold: 0xff2a48, fret: 0xff8aa0 },
  // the floodlights: hard white
  ptdGlare: { skyGlow: 0x8a90a8, fog: 0x10141c, skyLight: 0xe0e8ff, bounce: 0x2a3040, hemiK: 1.9, glow: 0xf0f4ff, hold: 0x8ab8ff, fret: 0xffffff },
  // the hippocampus: the sea in his head
  ptdSea: { zenith: 0x010410, horizon: 0x04203a, skyGlow: 0x1a8ac8, fog: 0x031420, fogDensity: 0.002, skyLight: 0x6ab8d8, bounce: 0x08283a, hemiK: 1.6, glow: 0xff8a9a, hold: 0x4ad8ff, fret: 0xffb0b8, street: 0x2ab8ff },
  // the new girl's morning: soft, warm
  ptdMorning: { zenith: 0x1a2a4a, horizon: 0x8a6a6a, skyGlow: 0xffc8a0, fog: 0x2a2420, fogDensity: 0.0019, skyLight: 0xfff0e0, bounce: 0x7a6050, hemiK: 2.2, glow: 0xffd8a0, hold: 0x5ad8a8, fret: 0xfff0d0, edge: 0xffffff },
  // the lace coming up the walls: her red winning
  ptdLace: { fog: 0x2a0a14, fogDensity: 0.0021, skyLight: 0xffa0b0, bounce: 0x6a1a28, hemiK: 2.0, glow: 0xff3a5a, hold: 0xff2a48, fret: 0xff8aa0 },
  // the last chorus: all of it
  ptdFinal: { zenith: 0x0a0006, horizon: 0x500818, skyGlow: 0xff1a3a, fog: 0x22040c, fogDensity: 0.0014, stars: 0.7, skyLight: 0xffa0a8, bounce: 0x7a0a1a, hemiK: 2.3, glow: 0xff2a48, hold: 0xff1a40, fret: 0xffb8c0, edge: 0xffffff, ribbon: 0x18040a, gem: 0xffffff },
  // "every night you dream we're back together": violet
  ptdDream: { horizon: 0x2a0a48, skyGlow: 0xb04aff, fog: 0x140820, skyLight: 0xc8a8ff, bounce: 0x3a1a5a, glow: 0xc06aff, hold: 0xb05aff, fret: 0xe0c0ff },
  // "favorite emergency": every alarm at once
  ptdSiren: { horizon: 0x6a0a1a, skyGlow: 0xff2a2a, fog: 0x2a0408, skyLight: 0xffb0b0, bounce: 0x8a1018, hemiK: 2.5, glow: 0xff3a3a, hold: 0xff2a2a, fret: 0xffd0d0 },
  // after the last hit: the case, its red light
  ptdEnd: { zenith: 0x000000, horizon: 0x100206, skyGlow: 0x6a0a18, fog: 0x080204, fogDensity: 0.0022, stars: 0.6, skyLight: 0x6a4a50, bounce: 0x2a060c, hemiK: 1.3, glow: 0xff3a48, hold: 0xff2a48 },
};

export const song = {
  id: 'ptsdream-girl',
  accent: '#ff2a48',
  title: 'PTSDream Girl',
  downbeat: 3,
  collect: 'tag',
  startY: 16,
  sections: [
    { t: 0.0, kind: 'intro', endY: 17 },                                                                     // "trigger warning": her perfume, the pin, the count
    { t: 14.57, kind: 'verse', start: 'launch', launchBeats: 4, kick: 10, endY: 12, gap: true, turn: 0.4 },  // "the sting": it goes, and throws you over the quiet in at his door
    { t: 29.46, kind: 'verse', c: 1.0, endY: 13, turn: 0.4 },                                                // "your new girl finds you shaking in the shower"
    { t: 44.36, kind: 'pre', c: 0.85, endY: 20, turn: 0.3 },                                                 // "smell my perfume at the grocery store"
    { t: 54.31, kind: 'break', endY: 17 },                                                                   // "do you miss me?": the lights out
    { t: 59.25, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 12, gap: true },            // "...dream GIRL": out the emergency exit, the alarm
    { t: 72.50, kind: 'chorus', c: 1.3, endY: 13 },                                                          // "in your head, in your bed, in your breakdown"
    { t: 85.74, kind: 'break', endY: 15 },                                                                   // the stop
    { t: 89.05, kind: 'verse', start: 'launch', launchBeats: 4, kick: 9, endY: 12, turn: 0.6 },              // "Tuesday night": October, his street
    { t: 102.29, kind: 'verse', c: 1.0, endY: 13, turn: 0.4 },                                               // "sleep with the lights on"
    { t: 115.53, kind: 'pre', c: 0.85, endY: 20, turn: 0.3 },                                                // "your therapist knows me by name"
    { t: 127.14, kind: 'break', endY: 17 },                                                                  // "say you hate me, say my name"
    { t: 132.08, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 12, gap: true },           // the alarm again
    { t: 145.32, kind: 'chorus', c: 1.35, endY: 13 },
    { t: 158.57, kind: 'bridge', endY: 21, turn: 0.5 },                                                      // "anniversary of our first fight": inside his head
    { t: 171.81, kind: 'bridge', endY: 23, turn: 0.4 },                                                      // "hypervigilance, my parting gift"
    { t: 185.05, kind: 'post', start: 'launch', launchBeats: 4, kick: 10, c: 1.1, endY: 12 },                // "your new girl ... but she can't compete"
    { t: 201.61, kind: 'break', endY: 17 },                                                                  // the bass out
    { t: 204.91, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 11, gap: true },            // the last chorus
    { t: 218.15, kind: 'final', c: 1.35, endY: 12 },
    { t: 229.74, kind: 'final', c: 1.3, endY: 13 },                                                          // "permanent mental insurrection"
    { t: 244.63, kind: 'final', c: 1.4, endY: 12 },                                                          // "baby, I'm your favorite emergency"
    { t: 257.88, kind: 'outro', endY: 6 },                                                                   // the last hit
  ],
  rails: [
    { t: 49.33, bars: 2, x: 0 },      // "barcode beeps like a metronome": along the checkout's belt
    { t: 142.01, bars: 2, x: 0 },     // "PTS dream girl everywhere"
    { t: 176.77, beats: 6, x: 0 },    // "carved my initials in your hippocampus": carving it
    { t: 236.36, bars: 2, x: 0 },     // "every night you dream we're back together"
  ],
  palette: 'ptdNight',
  world: 'ptd',
  lift: { beams: { colors: [0xff1a3a, 0xff7aa0, 0xffffff], x: 46, every: 1.2 } },
  titleView: { ahead: -0.2, x: 2.5, h: 1.3, back: -0.6, lookH: 2.0 },
  looks: [
    { t: -99, palette: 'ptdWarn' },
    { t: 10.0, palette: 'ptdLullaby', fade: 0.8 },     // "cold red lullaby"
    { t: 15.6, palette: 'ptdHome', fade: 0.5 },        // in at his door
    { t: 29.5, palette: 'ptdBath', fade: 0.25 },       // the bathroom
    { t: 36.1, palette: 'ptdKitchen', fade: 0.3 },     // the kitchen
    { t: 41.7, palette: 'ptdWarn', fade: 0.3 },        // out the back
    { t: 42.8, palette: 'ptdStore', fade: 0.25 },      // in at the store
    { t: 46.6, palette: 'ptdPanic', fade: 0.6 },       // aisle four
    { t: 49.4, palette: 'ptdStore', fade: 0.4 },       // the checkouts
    { t: 54.7, palette: 'ptdOut', fade: 0.15 },        // "do you miss me?"
    { t: 59.25, palette: 'ptdAlarm', fade: 0.1 },      // out the emergency exit
    { t: 72.5, palette: 'ptdAlarm2', fade: 0.6 },
    { t: 85.8, palette: 'ptdDark', fade: 0.12 },       // the stop
    { t: 89.05, palette: 'ptdOctober', fade: 0.3 },    // October
    { t: 100.7, palette: 'ptdLights', fade: 0.25 },    // every light on
    { t: 105.9, palette: 'ptdDawn', fade: 1.0 },       // her phone at dawn
    { t: 109.6, palette: 'ptdColony', fade: 0.8 },     // "colonize"
    { t: 113.9, palette: 'ptdOffice', fade: 0.4 },     // the therapist
    { t: 121.6, palette: 'ptdJournal', fade: 0.6 },    // his journal
    { t: 127.3, palette: 'ptdHush', fade: 0.4 },       // "say my name"
    { t: 132.08, palette: 'ptdAlarm', fade: 0.1 },
    { t: 145.3, palette: 'ptdAlarm2', fade: 0.6 },
    { t: 158.6, palette: 'ptdHead', fade: 0.8 },       // inside his head
    { t: 164.6, palette: 'ptdWine', fade: 0.6 },       // the wine
    { t: 167.2, palette: 'ptdGlare', fade: 0.3 },      // the floodlights
    { t: 172.0, palette: 'ptdHead', fade: 0.6 },       // the cameras
    { t: 176.6, palette: 'ptdSea', fade: 0.8 },        // the hippocampus
    { t: 185.05, palette: 'ptdMorning', fade: 0.2 },   // the new girl's morning
    { t: 188.0, palette: 'ptdLace', fade: 6.0 },       // her lace up the walls
    { t: 201.7, palette: 'ptdHush', fade: 0.3 },
    { t: 204.91, palette: 'ptdFinal', fade: 0.1 },     // the last chorus
    { t: 236.6, palette: 'ptdDream', fade: 0.6 },      // "every night you dream"
    { t: 241.0, palette: 'ptdFinal', fade: 0.5 },
    { t: 245.5, palette: 'ptdSiren', fade: 0.6 },      // "favorite emergency"
    { t: 258.4, palette: 'ptdEnd', fade: 1.4 },        // after the last hit
  ],
  moments: [
    { t: 7.72, kind: 'pop', k: 0.3, flash: 0.03 },                 // the pin
    { t: 14.57, kind: 'flash', k: 0.45 },                           // "sting": it goes
    { t: 14.57, kind: 'impact', k: 0.75 },
    { t: 14.62, kind: 'glass', k: 0.7 },
    { t: 47.62, kind: 'knock', n: 2, gap: 230, k: 0.5 },           // "panic attack": his heart
    { t: 50.98, kind: 'ring', k: 0.1, dur: 0.03 },                 // the scanners on the beat
    { t: 51.39, kind: 'ring', k: 0.1, dur: 0.03 },
    { t: 51.81, kind: 'ring', k: 0.1, dur: 0.03 },
    { t: 52.22, kind: 'ring', k: 0.1, dur: 0.03 },
    { t: 53.74, kind: 'thud', k: 0.55 },                           // "hit the floor"
    { t: 59.25, kind: 'flash', k: 0.35 },                          // out the emergency exit
    { t: 59.25, kind: 'ring', k: 0.45, dur: 1.5 },                 // and the alarm
    { t: 74.78, kind: 'pop', k: 0.3, flash: 0.05 },                // "breakdown"
    { t: 75.48, kind: 'pop', k: 0.3, flash: 0.05 },
    { t: 78.14, kind: 'pop', k: 0.35, flash: 0.06 },
    { t: 85.74, kind: 'blackout', dur: 1.6, k: 0.8 },              // the stop
    { t: 89.05, kind: 'flash', k: 0.2 },
    { t: 106.98, kind: 'ring', k: 0.28, dur: 0.05 },               // her phone dings
    { t: 132.08, kind: 'flash', k: 0.35 },
    { t: 132.08, kind: 'ring', k: 0.45, dur: 1.5 },
    { t: 147.60, kind: 'pop', k: 0.3, flash: 0.05 },               // "breakdown"
    { t: 150.16, kind: 'pop', k: 0.3, flash: 0.05 },
    { t: 151.00, kind: 'pop', k: 0.35, flash: 0.06 },
    { t: 162.20, kind: 'ring', k: 0.22, dur: 0.9 },                // 3:47, the clock's bells
    { t: 166.30, kind: 'glass', k: 0.35 },                         // the wine glass goes over
    { t: 185.05, kind: 'flash', k: 0.25 },
    { t: 204.91, kind: 'flash', k: 0.4 },
    { t: 204.91, kind: 'ring', k: 0.5, dur: 1.8 },
    { t: 228.04, kind: 'fireworks', n: 8, y: 58, ahead: 1.6, x: 34 },   // "where's my crown?"
    { t: 233.64, kind: 'impact', k: 0.4 },                         // "insurrection": the flares
    { t: 248.32, kind: 'ring', k: 0.45, dur: 2.2 },                // "favorite emergency": every alarm
    { t: 248.32, kind: 'flash', k: 0.45 },
    { t: 257.88, kind: 'glass', k: 0.85 },                         // the last hit: the glass
    { t: 257.88, kind: 'flash', k: 0.5 },
    { t: 258.0, kind: 'ring', k: 0.35, dur: 3.2 },
  ],
  scenery: {
    rooms: [
      { style: 'home', from: 15.9, to: 29.46, caps: [FRONT, DOOR] },          // in at his door, blown in
      { style: 'bath', from: 29.46, to: 36.07, caps: [null, DOOR] },           // the bathroom
      { style: 'kitchen', from: 36.07, to: 41.55, caps: [null, DOOR] },        // the kitchen, out the back door
      { style: 'store', from: 42.70, to: 46.40, caps: [STORE, AISLE] },        // in at the 24-hour store
      { style: 'aisle', from: 46.40, to: 49.33 },                             // aisle four, closing in
      { style: 'store', from: 49.33, to: 59.25, caps: [AISLE, EXIT] },         // the checkouts, the lights out, the exit
      { style: 'bed', from: 100.63, to: 113.88, caps: [FRONT, DOOR] },         // his bedroom, every light on
      { style: 'office', from: 113.88, to: 132.08, caps: [null, EXIT] },       // the therapist, his journal, the exit
      { style: 'morning', from: 185.05, to: 204.91, caps: [FRONT, EXIT] },     // the new girl's things; the lace
    ],
    // the ground under the rest: her stage, his street in October, the inside of his head
    floors: [
      { from: 87.6, to: 101.2, kind: 1 },
      { from: 157.6, to: 186.0, kind: 2 },
    ],
    zones: [
      // her stage: barricades, a beacon on each
      { from: -6, to: 15.7, kits: ['ptdBarricades'], every: 0.62, on: 10.1 },
      { from: 41.4, to: 42.9, kits: ['ptdBarricades'], every: 0.5 },
      { from: 59.0, to: 89.2, kits: ['ptdBarricades'], every: 0.58 },
      { from: 131.8, to: 158.8, kits: ['ptdBarricades'], every: 0.58 },
      // (from "permanent mental insurrection" they burn flares; a gap for the table set for two)
      { from: 204.6, to: 262.6, kits: ['ptdBarricades'], every: 0.54, flares: [231.0, 245.6], clear: [[238.0, 240.4, -1]] },
      { from: 262.6, to: 274, kits: ['ptdBarricades'], every: 0.54, side: -1 },
      // DREAM GIRL in neon, further out
      { from: 59.6, to: 85.6, kits: ['ptdNeon'], every: 2.1 },
      { from: 132.4, to: 158.4, kits: ['ptdNeon'], every: 2.1 },
      { from: 205.2, to: 262, kits: ['ptdNeon'], every: 1.9 },
      // "trigger warning", up the road in the dark
      { from: 0, to: 0.1, kits: ['ptdWarns'], at: [[0.9, 17], [3.4, -19], [5.6, 21], [8.0, -17], [10.6, 19]] },
      // his rooms' furniture down their walls (clear where his things are)
      { from: 15.9, to: 29.46, kits: ['ptdDress'], style: 'home', clear: [[19.2, 20.7, 1], [22.0, 23.4, -1], [24.8, 26.2, 1], [26.9, 28.4, 1]] },
      { from: 29.46, to: 36.07, kits: ['ptdDress'], style: 'bath', every: 0.8, clear: [[31.0, 32.9, -1], [33.9, 35.8, 1]] },
      { from: 36.07, to: 41.55, kits: ['ptdDress'], style: 'kitchen', every: 0.72, clear: [[37.9, 39.8, 1]] },
      { from: 113.88, to: 132.08, kits: ['ptdDress'], style: 'office', every: 0.9, clear: [[115.2, 117.7, 1], [118.4, 119.6, -1]] },
      { from: 185.05, to: 204.91, kits: ['ptdDress'], style: 'morning', every: 0.95, clear: [[196.5, 197.9, 1]] },
      // his street in October
      { from: 88.4, to: 101.0, kits: ['ptdStreet'] },
      // every light on
      { from: 101.2, to: 113.4, kits: ['ptdLamps'], every: 0.5 },
      // "colonize your brain": her pins stuck in the floor
      { from: 109.3, to: 113.6, kits: ['ptdPins'], every: 0.09 },
      // inside his head: the lights that trigger, the cameras that watch
      { from: 166.6, to: 171.6, kits: ['ptdFloods'], every: 0.5 },
      { from: 171.8, to: 177.4, kits: ['ptdCams'], every: 0.62 },
      // "in your head, in your bed, in your breakdown": his things, stood out on her stage under red spots
      { from: 212.4, to: 229.6, kits: ['ptdParade'], every: 0.52 },
      { from: 0, to: 0.1, kits: ['ptdProps'], at: [
        // her perfume, the count, the blast
        { t: 15.4, x: -58, kind: 'bottle', pull: 7.72, mist: 8.64, blow: 14.57, s: 2.3, floor: true },   // her perfume, beside his door
        { t: 15.2, x: 0, kind: 'gantry', counts: [12.92, 13.34, 13.75, 14.16], blow: 14.57, s: 1.35, floor: true },
        // his place
        { t: 16.6, x: 7, kind: 'doorLeaf', rot: 0.3, floor: true },
        { t: 19.9, x: 24, kind: 'boxes', floor: true },                                // her things in boxes
        { t: 22.7, x: -21, kind: 'frameDown', floor: true },                           // her picture, face down
        { t: 25.4, x: 22, kind: 'coat', floor: true },                                 // her coat on the stand
        { t: 27.6, x: 33.6, kind: 'hole', floor: true, y: 7.5 },                       // "every touch feels like my violence"
        // the bathroom
        { t: 32.5, x: -17, kind: 'shower', floor: true, shake: [29.9, 33.4] },         // "shaking in the shower"
        { t: 34.9, x: 21.5, kind: 'sink', floor: true },                               // his toothbrush and hers
        { t: 34.3, x: 29.4, kind: 'mirror', sign: 'ptdLPOWER', floor: true, y: 15 },   // "three years gone": lipstick on his mirror
        // the kitchen
        { t: 38.8, x: 25.5, kind: 'counter', floor: true, look: 38.2 },                // "looking for my knife"
        // the store
        { t: 45.3, x: -21, kind: 'perfume', floor: true, spray: 44.38 },               // "smell my perfume"
        { t: 47.7, x: 0, kind: 'aisleSign', sign: 'ptdLAISLE', floor: true },          // "panic attack on aisle four"
        { t: 50.1, x: 15.5, kind: 'checkout', floor: true },                           // the scanners on the beat
        { t: 50.3, x: -15.5, kind: 'checkout', floor: true },
        { t: 51.8, x: 15.5, kind: 'checkout', floor: true },
        { t: 52.0, x: -15.5, kind: 'checkout', floor: true },
        { t: 54.0, x: 12, kind: 'basket', floor: true, drop: 53.74 },                  // "hit the floor"
        { t: 59.25, x: 0, kind: 'exit', floor: true },                                 // EMERGENCY EXIT, ALARM WILL SOUND
        // the empty cushion
        { t: 83.2, x: -27, kind: 'cushion', floor: true },                             // "where's my crown?"
        { t: 156.0, x: 27, kind: 'cushion', floor: true },
        { t: 228.6, x: -27, kind: 'cushion', floor: true },
        // October
        { t: 93.6, x: 27, kind: 'calendar', page: 0, floor: true },                    // "couldn't finish October"
        // the bedroom
        { t: 106.9, x: 19, kind: 'phone', sign: 'ptdLPHONE', ding: 106.98, floor: true },   // her phone at dawn
        // the office
        { t: 116.9, x: 23, kind: 'armchair', floor: true },
        { t: 115.9, x: 14.5, kind: 'sideTable', floor: true },
        { t: 115.95, x: 14.2, kind: 'notepad', sign: 'ptdLPAD', floor: true, y: 9.4 },          // "your therapist knows me by name"
        { t: 119.0, x: -33.6, kind: 'clock', floor: true, y: 19 },
        { t: 123.1, x: -21.5, kind: 'journal', s: 0.8, floor: true },                 // her in his margins
        { t: 125.3, x: 21.5, kind: 'journal', s: 0.8, floor: true },
        { t: 132.08, x: 0, kind: 'exit', floor: true },
        // inside his head
        { t: 160.9, x: -25, kind: 'calendar', page: 1, floor: true },                  // the anniversary
        { t: 163.1, x: 23, kind: 'alarmClock', ring: 162.2, floor: true },             // 3:47
        { t: 166.2, x: -33, kind: 'wine', spill: 166.3, s: 2.4, floor: true },         // "taste of copper, smell of wine"
        { t: 173.9, x: 29, kind: 'gift', s: 1.7, floor: true },                        // "my parting gift"
        { t: 179.4, x: -23, kind: 'seahorse', s: 1.25, floor: true },                           // "my initials in your hippocampus"
        { t: 182.9, x: 24, kind: 'compass', floor: true },                             // "like a compass"
        // the new girl's things, and her lace
        { t: 186.4, x: 21, kind: 'plant', floor: true },
        { t: 187.3, x: -21, kind: 'candle', floor: true },
        { t: 188.3, x: 21, kind: 'mug', floor: true },
        { t: 189.4, x: -21, kind: 'flowers', floor: true },
        { t: 197.2, x: 29.4, kind: 'mirror', sign: 'ptdLGHOST', floor: true, y: 15 },  // "I'm the ghost you can't erase"
        { t: 204.91, x: 0, kind: 'exit', floor: true },
        // "every night you dream we're back together"
        { t: 239.2, x: -31, kind: 'table2', s: 1.7, floor: true },
      ] },
    ],
    signs: [
      { key: 'ptdTW', text: 'TRIGGER\nWARNING', color: '#14100a', core: '#14100a', bg: '#ffc81a', faceAspect: 1.4 },
      { key: 'ptdDG', text: 'Dream Girl', color: '#ff3a7a', core: '#ffe8f0', bg: '#0a0408', weight: 'italic 900', font: 'Georgia, "Times New Roman", serif' },
      { key: 'ptdSN', text: 'SWEETEST\nNIGHTMARE', color: '#ff2a3a', core: '#fff0f0', bg: '#0a0406' },
      { key: 'ptdEXIT', text: 'EMERGENCY EXIT\nALARM WILL SOUND', color: '#ffffff', core: '#ffffff', bg: '#c8101e' },
      { key: 'ptdOPEN', text: 'OPEN\n24 HOURS', color: '#5affc8', core: '#f0fff8', bg: '#04100c' },
      { key: 'ptdPTSD', text: 'PTSD', color: '#ffe0d8', core: '#ffffff', bg: '#5a0a14', faceAspect: 1.6 },
      // his lines on his things: lipstick on his mirror, the sign over aisle four, her phone's screen,
      // the therapist's notepad
      { key: 'ptdLPOWER', text: 'THREE YEARS GONE,\nBUT I STILL GOT\nTHAT POWER', ...LIPSTICK },
      { key: 'ptdLGHOST', text: "I'M THE GHOST\nYOU CAN'T ERASE", ...LIPSTICK },
      { key: 'ptdLAISLE', text: 'PANIC ATTACK\nON AISLE FOUR', color: '#ffffff', core: '#ffffff', bg: '#0a2a8a', faceAspect: 2.7 },
      { key: 'ptdLPHONE', text: 'WHY YOU\nFLINCH WHEN\nHER PHONE\nDINGS', color: '#ffffff', core: '#ffffff', bg: '#0c1426', font: '"Segoe UI", Arial, sans-serif', weight: '700', faceAspect: 0.52 },
      { key: 'ptdLPAD', text: 'YOUR\nTHERAPIST\nKNOWS ME\nBY NAME', color: '#1a2a8a', core: '#1a2a8a', bg: '#f6e27a', font: '"Segoe Print", "Comic Sans MS", cursive', weight: '700', faceAspect: 0.74 },
    ],
    // the boards carry only lines the hearings agree on, and none of the explicit ones; some are things
    // in his rooms (lipstick on his mirror, the sign over aisle four, her phone's screen, the
    // therapist's notepad), the rest alert boards over the road
    lyricPart: 'ptdBoard', lyricX: 0, lyricBg: '#050304', lyricColor: '#ff3a3a', lyricCore: '#ffd8d0', lyricFont: '"Arial Black", Impact, sans-serif',
    lyrics: [
      { t: 0.0, text: "TRIGGER WARNING, BABY,\nI'M YOUR FAVORITE EMERGENCY", h: 15, lead: 1.5, frame: NOFRAME },
      { t: 6.20, text: 'PULL THE PIN', h: 15, lead: 1.2, frame: NOFRAME },
      { t: 17.90, text: "I'M THE GIRL WHO TAUGHT YOU\nLOVE SHOULD HURT", h: 14, lead: 1.6, frame: NOFRAME },
      { t: 29.46, text: 'YOUR NEW GIRL FINDS YOU\nSHAKING IN THE SHOWER', h: 14, frame: NOFRAME },
      { t: 36.62, text: "WHEN SHE HOLDS YOU, YOU'RE\nLOOKING FOR MY KNIFE", h: 14, frame: NOFRAME },
      { t: 43.02, text: 'SMELL MY PERFUME AT\nTHE GROCERY STORE', h: 13, lead: 1.6, frame: NOFRAME },
      { t: 50.26, text: 'BARCODE BEEPS\nLIKE A METRONOME', h: 13, frame: NOFRAME },
      { t: 54.66, text: 'DO YOU MISS ME?', h: 14, frame: NOFRAME },
      { t: 56.84, text: "I'M YOUR PTS\nDREAM GIRL", h: 16, lead: 1.4, frame: NOFRAME },
      { t: 69.56, text: 'PTS DREAM GIRL\nEVERYWHERE', h: 16, frame: NOFRAME },
      { t: 72.22, text: 'IN YOUR HEAD, IN YOUR BED,\nIN YOUR BREAKDOWN', h: 16, frame: NOFRAME },
      { t: 91.34, text: "COULDN'T FINISH OCTOBER,\nSMELLS LIKE OCTOBER", h: 14, frame: NOFRAME },
      { t: 117.62, text: "BUT WE'VE NEVER MET,\nISN'T THAT INSANE?", h: 14, frame: NOFRAME },
      { t: 127.40, text: 'SAY YOU HATE ME,\nSAY MY NAME', h: 14, frame: NOFRAME },
      { t: 151.84, text: "STOCKHOLM SYNDROME,\nWHERE'S MY CROWN?", h: 16, frame: NOFRAME },
      { t: 164.64, text: 'TASTE OF COPPER,\nSMELL OF WINE', h: 14, frame: NOFRAME },
      { t: 172.10, text: 'HYPERVIGILANCE,\nMY PARTING GIFT', h: 14, frame: NOFRAME },
      { t: 177.66, text: 'MY INITIALS IN\nYOUR HIPPOCAMPUS', h: 14, frame: NOFRAME },
      { t: 180.28, text: 'NOW YOUR TRAUMA WEARS\nMY NAME LIKE A COMPASS', h: 14, frame: NOFRAME },
      { t: 187.34, text: "BUT SHE CAN'T COMPETE", h: 14, frame: NOFRAME },
      { t: 233.64, text: "I'M YOUR PERMANENT\nMENTAL INSURRECTION", h: 16, frame: NOFRAME },
      { t: 236.84, text: "EVERY NIGHT YOU DREAM\nWE'RE BACK TOGETHER", h: 16, frame: NOFRAME },
      { t: 245.54, text: "BABY, I'M YOUR\nFAVORITE EMERGENCY", h: 16, lead: 1.8, frame: NOFRAME },
    ],
    shelf: 60, drop: 5,
    finale: { kind: 'ptd', t: 266.6, x: 22, s: 1.3, rot: 2.3, fireAt: 257.88, orbit: { r: 74, h: 12, y: 18, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.2, heroBack: 10, heroFov: 48, heroUp: 2.0 } },
  },
};
