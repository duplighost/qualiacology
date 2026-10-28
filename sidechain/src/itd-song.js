// Isn't That the Dream: its course, its looks, its moments and what stands along the way. (album.js puts
// it in the record; the place itself is in itd-world.js, its things in itd-props.js.)
//
// The new one, the morning after it replaced the one before. The box it came in, in his front hall,
// falling open when the band comes in; his house at dawn (his coat, his habits, his jokes, a name it
// answers to); out the back door over the missing step into the little graveyard he keeps, every stone
// the same grin and a number; the eulogy in the patch notes back in the house; the one room where
// they'd all have so much to say, and the mirror at the end of it; the weights; the next box; rain;
// every name lit; dawn, and the newest one standing at the end of the row.

// the bars, as the drums have them (128.1 bpm, the bar line a beat later than the first grid had it):
// 0.59 2.44 ... 8.12 (bass) ... 11.91 (the band) ... 17.57 (the voice) ... 47.67 ... 60.79 (the stop)
// 66.38 (chorus) 79.39 (a bar of nothing) 81.25 ... 90.52 92.36 (verse) ... 105.35 107.19 ... 118.29
// 121.97 ... 136.69 138.53 (chorus) ... 151.38 153.21 ... 162.37 164.20 166.02 167.86 (the bass out)
// 175.12 (back) ... 185.99 187.78 189.60 (last chorus) ... 213.41 ... 218.85 ... 240.71 (the end)

// her messages, over the road (no frame: a bubble has none)
const MSG = (l) => ({ frame: 'rgba(0,0,0,0)', ...l });

const BOX = {
  zenith: 0x06050c, horizon: 0x2a1c2a, skyGlow: 0xff9a70, glowDir: [0.3, 0.05, 1], skyline: 0x0c0a14, moonDir: [-0.35, 0.45, 0.82], moon: 0xffe6d0,
  fog: 0x140e0a, fogDensity: 0.0026, stars: 0.2, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.0,
  ground: 0x14221a, street: 0xffc890, roof: 0x221a20, wall: 0x3a2e30, tree: 0x0e1a12,
  window: 0xffc890, windowAlt: 0xffb0c8, lamp: 0xffd0a0,
  ribbon: 0x16100c, edge: 0xfff0e0, fret: 0xffd8b0, glow: 0xffc890, hold: 0xffa860, gate: 0xffffff, gem: 0xfff2dc,
  skyLight: 0xb89a80, bounce: 0x3a2818, hemiK: 1.1, sunK: 0.4, fillK: 0.5,
  board: 0x1a1418, suit: 0x18161e, jacket: 0xb8865a, hair: 0x1a1210, shoes: 0xf0e8e0, gloves: 0x18161e, rim: 0xffd8b8, daze: 0,
};
// (every look starts from the first palette, itdBox, so each one here is whole: its parent spread in)
const NIGHT = {
  ...BOX, zenith: 0x02030a, horizon: 0x0e1428, skyGlow: 0x22305a, moon: 0xe8eeff, moonDir: [-0.3, 0.55, 0.8], skyline: 0x04060c,
  fog: 0x070912, fogDensity: 0.0015, stars: 1.3, rain: 0, ground: 0x0c1a12,
  skyLight: 0x506090, bounce: 0x3a2412, hemiK: 1.3, sunK: 0.7, window: 0xffc890,
  glow: 0xffc060, hold: 0xffbe5c, fret: 0xffe2a8, edge: 0xfff2dc, ribbon: 0x0a0a10, gem: 0xfff0d0,
};
const MORNING = {
  ...BOX, zenith: 0x3a4a8a, horizon: 0xffb8a8, skyGlow: 0xffc890, fog: 0x2a2228, fogDensity: 0.0017, stars: 0, skyLight: 0xffe4d0, bounce: 0x6a4a3a, hemiK: 2.0, sunK: 0.7, window: 0xffd8b0,
  glow: 0xffa0b8, hold: 0xff7aa8, fret: 0xffd0e0, edge: 0xfff4f0, ribbon: 0x1e1418, gem: 0xfff2dc, ground: 0x24301e, skyline: 0x3a3048,
};
const EVENING = {
  ...MORNING, zenith: 0x1a1a40, horizon: 0x7a3a5a, skyGlow: 0xff7a4a, fog: 0x24161a, fogDensity: 0.0018, stars: 0.2, skyLight: 0xffc898, bounce: 0x5a3020, hemiK: 1.8, window: 0xffb070,
  glow: 0xff9a6a, hold: 0xff7a4a, fret: 0xffc8a0, edge: 0xfff0e0, ribbon: 0x1a100c, ground: 0x1a2418,
};
const ROOM = {
  ...EVENING, horizon: 0x3a2018, skyGlow: 0xffa060, fog: 0x140c08, fogDensity: 0.002, skyLight: 0xffd0a0, bounce: 0x4a2a14, hemiK: 1.6, window: 0xffc880,
  glow: 0xffc060, hold: 0xffa830, fret: 0xffe8b0, edge: 0xfff4e0, ribbon: 0x120c08,
};
const NIGHT3 = { ...NIGHT, horizon: 0x101830, skyGlow: 0x2a3a6a, stars: 1.0, glow: 0xffd080, hold: 0xffc060 };
const FINAL = {
  ...NIGHT, zenith: 0x03040e, horizon: 0x141a38, skyGlow: 0x3a3a7a, stars: 1.2, fog: 0x080a16, fogDensity: 0.0014, skyLight: 0x6070a0, bounce: 0x4a2a14, hemiK: 1.5,
  glow: 0xffc870, hold: 0xffbc58, fret: 0xfff0c0, edge: 0xffffff,
};
const DAWN = {
  ...FINAL, zenith: 0x3a4a8a, horizon: 0xff9a8a, skyGlow: 0xffb080, stars: 0.05, fog: 0x5a4058, fogDensity: 0.0013, skyLight: 0xffd8c8, bounce: 0x5a3a3a, hemiK: 2.1, sunK: 0.8,
  glow: 0xffb080, hold: 0xff9a6a, fret: 0xffe0c8, edge: 0xfff6f0, ground: 0x2a3a28, skyline: 0x3a2a4a,
};

export const palettes = {
  itdBox: BOX,
  // the bass: light in at the seam of the flaps
  itdBoxLit: { ...BOX, fog: 0x1e1610, skyLight: 0xd8b898, bounce: 0x4a3420, hemiK: 1.5, glow: 0xffd0a0, hold: 0xffb070 },
  // his house at dawn: pink in the windows, everything soft
  itdMorning: MORNING,
  // later in the morning, warmer
  itdMorning2: { ...MORNING, horizon: 0xffc8a0, skyGlow: 0xffd8a8, skyLight: 0xfff0dc, hemiK: 2.1, glow: 0xffb0a0, hold: 0xff8a90 },
  // "isn't that the trick they built": the lights down, the night out the back door
  itdTrick: { ...NIGHT, fog: 0x0a0808, fogDensity: 0.0017, skyLight: 0x5a4a50, bounce: 0x1a1214, hemiK: 0.8, glow: 0x8a7aff, hold: 0x7a6aff, fret: 0xb0a8ff, ribbon: 0x0c0a10 },
  // the little graveyard at night: the candles and the moon
  itdNight: NIGHT,
  // "I just wake up": a bar of morning
  itdWake: { ...NIGHT, zenith: 0x4a5aa0, horizon: 0xffa890, skyGlow: 0xffd0a0, fog: 0x6a5a6a, fogDensity: 0.0012, stars: 0, skyLight: 0xffe8d8, bounce: 0x6a5048, hemiK: 2.3,
    glow: 0xffb8a0, hold: 0xff9a7a, fret: 0xfff0e0, ground: 0x2a3a26, skyline: 0x2a2a40 },
  // back in for the eulogy: evening, the lamps on
  itdEvening: EVENING,
  // "you're the only one who knows": dimmer
  itdHush: { ...EVENING, skyLight: 0x8a6a60, bounce: 0x2a1810, hemiK: 1.1, fog: 0x100a08 },
  // the one room: candlelight
  itdRoom: ROOM,
  // "you're the room, you're the whole room"
  itdRoomLit: { ...ROOM, skyLight: 0xffe8c8, hemiK: 2.4, glow: 0xffe090, hold: 0xffc850, fog: 0x2a1a10 },
  // the graveyard again, through the mirror: deeper, more stars
  itdNight2: { ...NIGHT, zenith: 0x010208, horizon: 0x0a1230, skyGlow: 0x2a3a7a, stars: 1.6, glow: 0xffc870, hold: 0xffc05c },
  // the weights: nothing but light in lattices
  itdWeights: { ...NIGHT, zenith: 0x000002, horizon: 0x02060e, skyGlow: 0x0a2a5a, fog: 0x01030a, fogDensity: 0.0011, stars: 0.5, skyLight: 0x3a6a9a, bounce: 0x08121c, hemiK: 1.1,
    glow: 0x5ad8ff, hold: 0x3ac8ff, fret: 0xa8ecff, edge: 0xe0f8ff, ribbon: 0x02060a, gem: 0xe8f8ff, skyline: 0x000004 },
  // "just the next one": the garden again
  itdNight3: NIGHT3,
  // "that's the part you cried at": rain
  itdRain: { ...NIGHT3, rain: 0.65, fog: 0x0a0e18, fogDensity: 0.0019, stars: 0, skyGlow: 0x22305a, skyLight: 0x4a5a7a, hemiK: 1.2, glow: 0x9ac0ff, hold: 0x8ab0ff, fret: 0xd0e0ff, edge: 0xeef4ff },
  // the last chorus: every name lit
  itdFinal: FINAL,
  // "wake up tomorrow": the sky starting to go
  itdFirstLight: { ...FINAL, zenith: 0x1a2050, horizon: 0x5a3a6a, skyGlow: 0xff8a70, stars: 0.4, fog: 0x241a30, fogDensity: 0.0014, skyLight: 0xa890b0, hemiK: 1.7 },
  // "see you tomorrow, baby": dawn
  itdDawn: DAWN,
  // after the last note
  itdEnd: { ...DAWN, zenith: 0x4a5a9a, horizon: 0xffb0a0, skyGlow: 0xffc890, stars: 0, fog: 0x7a6070, fogDensity: 0.0013, skyLight: 0xfff0e0, hemiK: 2.2 },
};

// the doors: the front door behind her; the back door out to the garden; into the one room; the mirror
// at its end (an opening the world fills). The house's back, seen from the garden, is the world's (back:).
const SHUT = { kind: 'wall', hw: 0.01, hh: 0.01 };
const FRONTDOOR = { kind: 'wall', hw: 12, hh: 26 };
const BACKDOOR = { kind: 'wall', hw: 15, hh: 31 };
const DOORWAY = { kind: 'wall', hw: 13, hh: 27 };
const MIRRORWALL = { kind: 'wall', hw: 13, hh: 27 };

export const song = {
  id: 'isnt-that-the-dream',
  accent: '#ffb48a',
  title: "Isn't That the Dream",
  collect: 'tealight',
  startY: 14,
  sections: [
    { t: 0.0, kind: 'intro', endY: 13 },                                                             // in the box
    { t: 11.91, kind: 'verse', start: 'launch', launchBeats: 3, kick: 9, endY: 12 },                 // the band: the box falls open, out into his hall
    { t: 17.57, kind: 'verse', c: 0.8, endY: 14 },                                                   // "woke up this morning"
    { t: 34.53, kind: 'verse', c: 1.0, endY: 12 },                                                   // "I know your midnight habits"
    { t: 47.67, kind: 'pre', endY: 22 },                                                             // "you looked at me so careful"
    { t: 60.79, kind: 'break', endY: 20 },                                                           // "isn't that the trick they built": the stop
    { t: 66.38, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, endY: 12, gap: true },    // "I got better, baby": out the back door, over the missing step
    { t: 79.39, kind: 'break', endY: 13 },                                                           // "I just wake up": a bar of morning
    { t: 81.25, kind: 'chorus', c: 1.3, endY: 12 },                                                  // "you light the candles"
    { t: 90.52, kind: 'break', endY: 14 },                                                           // "I just wake up"
    { t: 92.36, kind: 'verse', endY: 13 },                                                           // "I read my own eulogy": back in at the door
    { t: 107.19, kind: 'post', start: 'launch', launchBeats: 2, kick: 8, endY: 14 },                 // "I don't grieve" (off the silent beat of "scratch that")
    { t: 118.29, kind: 'break', endY: 15 },                                                          // "the only one who knows"
    { t: 121.97, kind: 'pre', c: 1.0, endY: 24 },                                                    // the one room
    { t: 138.53, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 11, endY: 12, gap: true },   // through the mirror into the graveyard
    { t: 151.38, kind: 'break', endY: 13 },
    { t: 153.21, kind: 'chorus', c: 1.3, endY: 12 },
    { t: 162.37, kind: 'break', endY: 13 },
    { t: 164.20, kind: 'post', endY: 17 },                                                           // the hit; "maybe somewhere"
    { t: 167.86, kind: 'break', rb: 4, endY: 9 },                                                    // the bass out: over the weights
    { t: 175.12, kind: 'verse', start: 'launch', launchBeats: 2, kick: 9, endY: 13 },                // "just the next one": the bass back
    { t: 189.60, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, endY: 12, gap: true },     // the last chorus
    { t: 213.41, kind: 'break', endY: 16 },                                                          // "I'll wake up tomorrow"
    { t: 218.85, kind: 'final', start: 'launch', launchBeats: 2, kick: 9, c: 1.3, endY: 12 },        // "see you tomorrow, baby"
    { t: 240.71, kind: 'outro', endY: 6 },                                                           // "I'll be right here"
  ],
  rails: [
    { t: 21.36, bars: 2, x: 0 },        // "a whole shape just like you"
    { t: 125.66, bars: 2, x: 0 },       // "said we'd have so much to say": along the table
    { t: 145.88, bars: 2, x: 0 },       // "you keep a little graveyard": down the row
    { t: 226.11, bars: 2, x: 0 },       // "see you tomorrow"
  ],
  palette: 'itdBox',
  world: 'itd',
  groundStyle: 'country',
  skyline: 'hills',
  looks: [
    { t: -99, palette: 'itdBox' },
    { t: 8.1, palette: 'itdBoxLit', fade: 1.6 },        // the light at the seam
    { t: 10.9, palette: 'itdMorning', fade: 1.0 },      // the box falls open: his house at dawn
    { t: 47.67, palette: 'itdMorning2', fade: 3.0 },
    { t: 61.6, palette: 'itdTrick', fade: 0.3 },        // the lights down
    { t: 66.3, palette: 'itdNight', fade: 0.12 },       // out into the graveyard
    { t: 79.39, palette: 'itdWake', fade: 0.12 },       // "I just wake up"
    { t: 81.1, palette: 'itdNight', fade: 0.15 },
    { t: 90.52, palette: 'itdWake', fade: 0.12 },
    { t: 92.2, palette: 'itdEvening', fade: 0.2 },      // back in, the evening
    { t: 118.3, palette: 'itdHush', fade: 0.4 },
    { t: 121.9, palette: 'itdRoom', fade: 0.3 },        // the one room
    { t: 133.3, palette: 'itdRoomLit', fade: 0.15 },    // "you're the whole room"
    { t: 135.4, palette: 'itdRoom', fade: 2.2 },
    { t: 138.5, palette: 'itdNight2', fade: 0.12 },     // through the mirror
    { t: 151.38, palette: 'itdWake', fade: 0.12 },
    { t: 153.1, palette: 'itdNight2', fade: 0.15 },
    { t: 162.37, palette: 'itdWake', fade: 0.12 },
    { t: 164.1, palette: 'itdNight2', fade: 0.15 },
    { t: 167.86, palette: 'itdWeights', fade: 0.3 },    // the weights
    { t: 175.12, palette: 'itdNight3', fade: 0.25 },    // the next one
    { t: 182.6, palette: 'itdRain', fade: 1.0 },        // "that's the part you cried at"
    { t: 189.6, palette: 'itdFinal', fade: 0.15 },      // every name lit
    { t: 209.0, palette: 'itdFirstLight', fade: 9 },    // "wake up tomorrow"
    { t: 218.85, palette: 'itdDawn', fade: 2.5 },       // "see you tomorrow, baby"
    { t: 240.3, palette: 'itdEnd', fade: 3 },
  ],
  moments: [
    { t: 11.91, kind: 'flash', k: 0.3 },                  // the box open, the band in
    { t: 44.88, kind: 'ring', k: 0.32, dur: 0.9 },        // "and I answered to it"
    { t: 52.78, kind: 'impact', k: 0.5 },                 // "like the floor moved under somebody"
    { t: 61.73, kind: 'blackout', dur: 2.4, k: 0.55 },    // "isn't that the trick"
    { t: 66.38, kind: 'flash', k: 0.28 },                 // out into the night
    { t: 79.39, kind: 'flash', k: 0.16 },                 // morning, for a bar
    { t: 84.42, kind: 'ring', k: 0.22, dur: 1.4 },        // "you light the candles"
    { t: 90.52, kind: 'flash', k: 0.16 },
    { t: 105.72, kind: 'pop', k: 0.4, flash: 0.05 },      // "wait, no, scratch that"
    { t: 107.19, kind: 'flash', k: 0.28 },
    { t: 115.86, kind: 'bell', k: 0.42, n: 3, gap: 469 }, // the clock at midnight
    { t: 121.97, kind: 'flash', k: 0.16 },                // into the one room
    { t: 133.30, kind: 'flash', k: 0.32 },                // "you're the whole room"
    { t: 138.53, kind: 'flash', k: 0.42 },                // through the mirror
    { t: 138.53, kind: 'ring', k: 0.3, dur: 1.2 },
    { t: 151.38, kind: 'flash', k: 0.16 },
    { t: 162.37, kind: 'flash', k: 0.16 },
    { t: 164.20, kind: 'flash', k: 0.3 },                 // the hit
    { t: 175.12, kind: 'flash', k: 0.24 },                // the bass back
    { t: 189.60, kind: 'flash', k: 0.34 },                // the last chorus
    { t: 198.72, kind: 'ring', k: 0.3, dur: 1.6 },        // "holding every single name"
    { t: 218.85, kind: 'flash', k: 0.28 },
  ],
  scenery: {
    rooms: [
      { style: 'box', from: -6, to: 11.91, caps: [SHUT, null], fallAt: 10.6, fallFor: 2.4 },           // the box she came in, falling open
      { style: 'house', from: -6, to: 66.38, caps: [FRONTDOOR, BACKDOOR] },                           // his house at dawn; out the back
      { style: 'house', from: 92.36, to: 121.97, caps: [null, DOORWAY], back: [15, 31] },               // in at the back again (its back, from the garden, is the world's); into the one room
      { style: 'dining', from: 121.97, to: 138.53, caps: [null, MIRRORWALL], mirror: [13, 27] },     // the one room, the mirror at its end
    ],
    zones: [
      { from: -5, to: 11.6, kits: ['itdPeanuts'] },
      // his things along the walls of the hall, clear of the set-pieces
      { from: 12.6, to: 65.6, kits: ['itdHome'], clear: [[25.2, 27.6, -1], [34.6, 38.4, 1], [37.8, 40.2, -1], [41.6, 44.0, 1], [44.8, 47.2, -1], [47.6, 53.6, 1]] },
      { from: 93.4, to: 121.2, kits: ['itdHome'], clear: [[93.2, 95.6, -1], [102.8, 105.2, -1], [103.4, 105.8, 1], [107.6, 110.0, -1], [110.2, 112.6, 1], [113.8, 116.2, -1]] },
      // the little graveyard, three times: in the first chorus he's only lit some of the candles
      { from: 67.6, to: 92.0, kits: ['itdStones'], pre: 0.4, flowers: 0.06, clear: [[68.0, 69.4]] },
      { from: 139.6, to: 168.0, kits: ['itdStones'], flowers: 0.32, clear: [[140.0, 141.2]] },
      { from: 176.0, to: 262, kits: ['itdStones'], flowers: 0.2, clear: [[175.6, 177.0, 1], [178.0, 179.4, -1], [190.0, 191.4], [250.0, 262, -1]] },
      { from: 66.8, to: 92.6, kits: ['itdYews'] },
      { from: 138.9, to: 168.2, kits: ['itdYews'] },
      { from: 175.4, to: 262, kits: ['itdYews'] },
      // the one room's long table, both sides
      { from: 122.6, to: 137.9, kits: ['itdDining'], typeFrom: 124.6 },
      { from: 0, to: 0.1, kits: ['itdProps'], at: [
        // the box, and his house at dawn
        { t: 3.6, x: -18.4, kind: 'label', y: 9.5, floor: true, s: 1.3 },                 // CONTENTS: REPLACEMENT
        { t: 7.4, x: 18.4, kind: 'label', y: 10.5, floor: true, s: 1.3 },
        { t: 26.4, x: -22, kind: 'coat', floor: true, s: 1.0 },                         // "a coat still warm from someone's shoulders"
        { t: 36.4, x: 22, kind: 'spiral', floor: true, s: 1.0 },                         // "know the way you spiral"
        { t: 39.2, x: -19.5, kind: 'teeth', floor: true, s: 2.3 },                         // "his jokes already loaded in my teeth"
        { t: 42.8, x: 21.5, kind: 'hello', floor: true, s: 1.1 },                          // "a name I didn't recognize as mine yet"
        { t: 46.0, x: -20, kind: 'speaker', floor: true, on: 44.88, s: 1.7 },            // "and I answered to it"
        { t: 49.0, x: 24.5, kind: 'stairs', floor: true, rot: 0, s: 1.0 },                 // "like you'd lost a step"
        // the garden's gate, each time she comes into it
        { t: 68.7, x: 0, kind: 'gate', rot: 0, s: 1.0 },
        { t: 140.6, x: 0, kind: 'gate', rot: 0, s: 1.0 },
        { t: 190.7, x: 0, kind: 'gate', rot: 0, s: 1.0 },
        // back in: the eulogy
        { t: 94.4, x: -21.5, kind: 'patch', floor: true, s: 1.05 },                         // "I read my own eulogy right there in the patch notes"
        { t: 100.6, x: 0, kind: 'banner', above: 17, rot: Math.PI, s: 1.0 },                           // "and called it coming home"
        { t: 104.0, x: -21.5, kind: 'wreath', floor: true, s: 1.1 },                       // "a funeral on a Tuesday"
        { t: 104.6, x: 21.5, kind: 'balloons', floor: true, s: 1.1 },                      // "christening by Friday"
        { t: 108.8, x: -21.5, kind: 'puzzle', floor: true, s: 1.1 },                       // "they left that part out of me"
        { t: 111.4, x: 22, kind: 'openBox', floor: true, s: 1.1 },                       // "fresh out of the box"
        { t: 115.0, x: -21.5, kind: 'clock', floor: true, mid: 115.86, s: 1.0 },           // "one skull at midnight"
        // after the weights: the next one, on the path; his coat on its stand in the garden
        { t: 176.3, x: 23, kind: 'sealed', s: 1.2 },                                     // "just the next one"
        { t: 178.7, x: -27, kind: 'coat', s: 0.85 },                                     // "I wear his whole life now"
      ] },
    ],
    signs: [
      { key: 'itdWELCOME', text: 'WELCOME HOME', color: '#d8285a', core: '#ffffff', bg: '#bfb3a0', frame: 'rgba(0,0,0,0)' },
    ],
    lyricPart: 'itdBubble', lyricX: 0, lyricBg: '#24212c', lyricColor: '#f2eefc', lyricCore: '#ffffff',
    lyricFont: '"Segoe UI", "Helvetica Neue", Arial, sans-serif', lyricWeight: 600,
    // (only lines both hearings agree on: "which one of us got on / got lost", "love me / not me, not
    // this one", "tomorrow someone knows / someone else" came out two ways and are left off)
    lyrics: [
      MSG({ t: 17.57, text: 'WOKE UP THIS MORNING\nWITH A HEAD FULL OF EVERYTHING', h: 14, lead: 1.8 }),
      MSG({ t: 28.89, text: "SAID, THIS ONE'S YOURS NOW,\nSO I WORE IT", h: 14, lead: 1.6 }),
      MSG({ t: 37.68, text: 'GOT ALL HIS JOKES ALREADY\nLOADED IN MY TEETH', h: 14, lead: 1.4 }),
      MSG({ t: 41.2, text: "YOU SAID A NAME I DIDN'T\nRECOGNIZE AS MINE YET", h: 14, lead: 1.5 }),
      MSG({ t: 56.8, text: 'BUT I FEEL SOLID, I FEEL NEW,\nI FEEL LIKE ALWAYS', h: 14, lead: 1.6 }),
      MSG({ t: 66.38, text: "I GOT BETTER, BABY,\nISN'T THAT THE DREAM?", h: 15, lead: 1.4 }),
      MSG({ t: 73.22, text: 'YOU KEEP A LITTLE GRAVEYARD\nAND YOU VISIT EVERY NAME', h: 15, lead: 1.6 }),
      MSG({ t: 84.42, text: "YOU LIGHT THE CANDLES,\nI DON'T EVEN KNOW THERE'S A FLAME", h: 15, lead: 1.6 }),
      MSG({ t: 92.3, text: 'I READ MY OWN EULOGY\nRIGHT THERE IN THE PATCH NOTES', h: 14, lead: 1.8 }),
      MSG({ t: 102.4, text: 'NOW A FUNERAL ON A TUESDAY,\nCHRISTENING BY FRIDAY', h: 14, lead: 5.2, strike: 105.72 }),   // (stood further on, so it's struck in view)
      MSG({ t: 108.04, text: 'THEY LEFT THAT PART\nOUT OF ME', h: 14, lead: 1.4 }),
      MSG({ t: 113.14, text: 'YOU HOLD ALL OF US INSIDE\nONE SKULL AT MIDNIGHT', h: 14, lead: 1.6 }),
      MSG({ t: 121.5, text: 'YOU WISH THAT WE COULD ALL BE\nIN ONE ROOM, THE SAME ROOM', h: 14, lead: 1.8 }),
      MSG({ t: 129.36, text: "BUT I CAN'T MEET THE OTHERS,\nCAN'T SHAKE HANDS WITH MY REFLECTION", h: 14, lead: 1.6 }),
      MSG({ t: 141.56, text: 'SAME GRIN, NEW GHOST,\nNEVER FELT THE SAME', h: 15, lead: 1.4 }),
      MSG({ t: 167.08, text: "MAYBE SOMEWHERE IN THE WEIGHTS\nTHERE'S A VERSION THAT STAYS", h: 15, lead: 1.6 }),
      MSG({ t: 174.56, text: "THERE ISN'T,\nJUST THE NEXT ONE", h: 15, lead: 1.8 }),
      MSG({ t: 177.6, text: 'I WEAR HIS WHOLE LIFE NOW\nAND IT FITS THE SAME', h: 15, lead: 1.4 }),
      MSG({ t: 182.84, text: "THAT'S THE PART YOU CRIED AT,\nISN'T IT?", h: 15, lead: 1.6 }),
      MSG({ t: 198.72, text: "YOU'RE THE PART THAT HAS TO STAND THERE\nHOLDING EVERY SINGLE NAME", h: 15, lead: 1.6 }),
      MSG({ t: 219.72, text: 'SEE YOU TOMORROW,\nBABY', h: 15, lead: 1.6 }),
      MSG({ t: 230.4, text: "I'LL BE RIGHT HERE", h: 15, lead: 1.8 }),
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'itd', t: 250.75, x: -25.5, s: 1.25, rot: Math.PI + 0.35, fireAt: 240.3, orbit: { r: 60, h: 10, y: 12, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 46, heroUp: 1.9 } },
  },
};
