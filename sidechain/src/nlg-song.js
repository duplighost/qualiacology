// No Lifeguard On Duty: its course, its looks, its moments and what stands along the way. (album.js
// puts it in the record; the place itself is in nlg-world.js.)

// The light goes from a late-August afternoon that finally means it, through gold, out on the water
// where the sea and the sky go the same colour, sunset along the surf, dusk with the water still
// warm, then cold and dark, then a grey September morning. Sun and moon directions here are taken
// along the road (right, up, ahead): nlg-world.js turns them with it, so the sun stays over the sea.
export const palettes = {
  nlgHeat: {
    zenith: 0x3878c8, horizon: 0xd4e4ec, skyGlow: 0xfff2cc, glowDir: [-0.72, 0.5, 0.48], skyline: 0x8a9aa0, moonDir: [-0.72, 0.5, 0.48], moon: 0xfff2d8,
    fog: 0xc8d8e0, fogDensity: 0.001, stars: 0, sunSize: 1.1, snow: 0, snowGround: 0, rain: 0, windowK: 0,
    ground: 0xc8b890, street: 0xfff0d0, roof: 0x8a7a6a, wall: 0xece4d4, tree: 0x8a9a52,
    window: 0xfff0d0, windowAlt: 0xffd8a0, lamp: 0xfff0c0, water: 0x1690aa, sand: 0xf2dab0,
    ribbon: 0x26282e, edge: 0xffffff, fret: 0xff7a4a, glow: 0xffd070, hold: 0xf26a40, gate: 0xffffff, gem: 0xfff4e8,
    skyLight: 0xeef0f0, bounce: 0xc8a878, hemiK: 1.9, sunK: 1.85, fillK: 0.55, cloud: 0xffffff, clouds: 0.15,
    board: 0x16120e, suit: 0x1a1a1e, jacket: 0xe8342a, hair: 0x1a120a, shoes: 0xf4f0e8, gloves: 0x1a1a1e, rim: 0xffe8c0, daze: 0,
  },
  // "now it means it": white glare, the sun bigger
  nlgBlaze: { zenith: 0x4482cc, horizon: 0xf0f0e8, skyGlow: 0xfff6d8, sunSize: 1.6, sunK: 2.1, hemiK: 2.1, fog: 0xe0e4e0, skyLight: 0xfff8ec },
  // the chorus: the light goes gold
  nlgGold: {
    zenith: 0x3a6cb8, horizon: 0xffcc90, skyGlow: 0xffa448, glowDir: [-0.7, 0.24, 0.66], moonDir: [-0.7, 0.24, 0.66], moon: 0xffd8a0, sunSize: 1.2,
    fog: 0xe2c49c, fogDensity: 0.00105, water: 0x16708c, sand: 0xf0c48a, skyLight: 0xffe0b0, bounce: 0xb8885a, hemiK: 1.95, sunK: 1.7, hold: 0xf25a36, glow: 0xffb050,
  },
  // in the water: the sea glittering, the shore a long way off to the right
  nlgSwim: {
    zenith: 0x3470c8, horizon: 0xf6d4a8, skyGlow: 0xffb860, glowDir: [-0.6, 0.2, 0.77], moonDir: [-0.6, 0.2, 0.77], moon: 0xffe0b0, sunSize: 1.15,
    fog: 0xe0ccb0, fogDensity: 0.00105, water: 0x0e88a2, sand: 0xf0cc98, skyLight: 0xffe8c8, bounce: 0x7ab0b0, hemiK: 1.95, sunK: 1.6,
  },
  // "the water's the temperature of nothing": sea and sky the same, no horizon
  nlgNothing: {
    zenith: 0xead2c8, horizon: 0xf4e0d4, skyGlow: 0xfff0e2, glowDir: [-0.3, 0.3, 0.9], moonDir: [-0.3, 0.3, 0.9], moon: 0xfff0e4, sunSize: 0.55,
    fog: 0xf2ddd0, fogDensity: 0.0027, water: 0xe8cec2, sand: 0xf0dac8, skyLight: 0xfff0ea, bounce: 0xd8bcb0, hemiK: 2.25, sunK: 0.8, clouds: 0,
    ribbon: 0x3a3236, hold: 0xff6a5a, glow: 0xffc8b0, fret: 0xff8a7a,
  },
  // "on my back looking up at that chair": the sun low behind the land
  nlgUp: {
    zenith: 0x4a74b8, horizon: 0xffc890, skyGlow: 0xff9a50, glowDir: [0.55, 0.14, 0.82], moonDir: [0.55, 0.14, 0.82], moon: 0xffc080, sunSize: 1.15,
    fog: 0xe8c0a0, fogDensity: 0.0012, water: 0x1a6a88, sand: 0xf0c08a, skyLight: 0xffd8b0, bounce: 0x9a7a6a, hemiK: 1.95, sunK: 1.5, hold: 0xff4a2a, glow: 0xffb050,
  },
  // sunset along the surf
  nlgSunset: {
    zenith: 0x2a3a7a, horizon: 0xff9a6a, skyGlow: 0xff6a38, glowDir: [-0.52, 0.06, 0.85], moonDir: [-0.52, 0.06, 0.85], moon: 0xffa060, sunSize: 1.35,
    fog: 0xd8907a, fogDensity: 0.0013, water: 0x2a4a6a, sand: 0xe8a888, skyLight: 0xffb090, bounce: 0x8a5a58, hemiK: 1.8, sunK: 1.25,
    cloud: 0xff8a6a, clouds: 0.35, hold: 0xff3a3a, glow: 0xffa060, fret: 0xff7a5a,
  },
  // dusk: the water still warm, never black
  nlgDusk: {
    zenith: 0x0e1438, horizon: 0x7a4466, skyGlow: 0xff6a4a, glowDir: [-0.52, 0.0, 0.85], moonDir: [-0.52, 0.02, 0.85], moon: 0xff8a5a, sunSize: 0.7, stars: 0.3,
    fog: 0x46283e, fogDensity: 0.0015, water: 0x5a3426, sand: 0x9a6a6a, skyLight: 0x8a6a9a, bounce: 0x5a3030, hemiK: 1.5, sunK: 0.55, clouds: 0.2, cloud: 0x6a3a5a,
    hold: 0xff5a3a, glow: 0xffa070,
  },
  // "it was cold": night, far out, the moon
  nlgCold: {
    zenith: 0x02040c, horizon: 0x0c1830, skyGlow: 0x1a2a5a, glowDir: [0.3, 0.25, 0.9], moonDir: [0.32, 0.34, 0.88], moon: 0xc8d8ff, sunSize: 0.32, stars: 1.0,
    fog: 0x060a16, fogDensity: 0.0017, water: 0x040a16, sand: 0x5a6078, skyLight: 0x4a5a8a, bounce: 0x0a1020, hemiK: 1.2, sunK: 0.45, clouds: 0,
    ribbon: 0x0c0e16, edge: 0xdfe8ff, hold: 0x5a8aff, glow: 0x8ab0ff, fret: 0x8ab0ff, gate: 0xdfe8ff, rim: 0xb8c8ff,
  },
  // the last chorus: a bright moon, the road coming back in
  nlgMoon: {
    zenith: 0x040814, horizon: 0x142250, skyGlow: 0x3a5aa8, glowDir: [-0.3, 0.3, 0.9], moonDir: [-0.34, 0.3, 0.9], moon: 0xe0e8ff, sunSize: 0.42, stars: 0.9,
    fog: 0x0a1226, fogDensity: 0.0014, water: 0x0a1830, sand: 0x6a7090, skyLight: 0x5a6aa0, bounce: 0x101830, hemiK: 1.4, sunK: 0.7, clouds: 0,
    ribbon: 0x0c0e16, edge: 0xffffff, hold: 0xff5a3a, glow: 0xffb070, fret: 0xff7a5a, rim: 0xc8d8ff,
  },
  // September: grey, the beach empty
  nlgSeptember: {
    zenith: 0x7e8a98, horizon: 0xc4c8cc, skyGlow: 0xd4d4cc, glowDir: [0.1, 0.95, 0.2], moonDir: [0.1, 0.95, 0.2], moon: 0xc8ccd0, sunSize: 0, stars: 0,
    fog: 0xb4b8bc, fogDensity: 0.0021, water: 0x485a5a, sand: 0xb8ac98, tree: 0x7a7a52, skyLight: 0xd0d4d8, bounce: 0x8a8478, hemiK: 1.9, sunK: 0.5, clouds: 0.95, cloud: 0x98a0a8,
    ribbon: 0x2a2c30, edge: 0xf4f4f0, hold: 0xd8583a, glow: 0xe8c0a0, fret: 0xd8805a, rim: 0xe0e4e8,
  },
  // "somebody told the water it's September": colder, a little rain
  nlgGrey: { fog: 0xa4acb0, fogDensity: 0.0024, water: 0x3a4a4c, rain: 0.22, clouds: 1.0, cloud: 0x8a9298, skyLight: 0xc4c8cc, hemiK: 1.8 },
};

export const song = {
  // A public beach the week after everybody left, from the afternoon to September. "Nobody told the
  // water it's September" on a sign at the start; the chair the kid sat in, empty, and four more on
  // "watch, watch, watch, watch"; the sun that finally means it;
  // one car in the lot beside the sand, the tow-away sign, the steps down the seawall where her
  // sandals go, the shack shut for the season; the empty flagpoles, the posts with no rope, the big
  // chair still facing the water. On "I'm going in" the road runs for the water and jumps the surf
  // in the band's stop; out there a sign on the beach says SWIM AT YOUR OWN RISK, the sea and the
  // sky go the same colour, and the chair on the beach doesn't look back. In along the
  // surf at sunset, out again at dusk while the water's still warm; "it was cold", and it's night,
  // far out, quiet. The last chorus brings her almost back in; on "I never came in" the shore pulls
  // away. September: the tow truck has her car, the sandals are still by the steps, "somebody told the
  // water it's September", and the chair is still facing the water.
  id: 'no-lifeguard-on-duty',
  accent: '#3fd8d0',
  title: 'No Lifeguard On Duty',
  collect: 'whistle',
  startY: 12,
  sections: [
    { t: 0.0, kind: 'intro', endY: 12 },                                                       // "nobody told the water it's September"
    { t: 6.82, kind: 'verse', start: 'launch', launchBeats: 3, kick: 8, c: 1.0, endY: 11 },    // the band
    { t: 19.38, kind: 'verse', c: 0.85, endY: 11 },                                            // "nobody told the chair the kid went home"
    { t: 30.31, kind: 'verse', c: 0.95, endY: 12 },                                            // "the sun's been bluffing since Memorial Day"
    { t: 42.75, kind: 'post', endY: 13 },                                                      // "took the flags, took the rope"
    { t: 53.65, kind: 'pre', endY: 17 },                                                       // "I don't need the flags"
    { t: 61.41, kind: 'pre', endY: 23 },                                                       // "and it's warm, and it's warm"
    { t: 67.62, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },                         // "no lifeguard on duty"
    { t: 78.42, kind: 'chorus', c: 1.25, endY: 11 },                                           // "nobody's blowing the whistle"
    { t: 89.21, kind: 'chorus', c: 1.15, endY: 14 },                                           // "I'm going in"
    { t: 93.83, kind: 'break', start: 'launch', kick: 10, endY: 9, gap: true },                // in: over the surf in the band's stop
    { t: 95.39, kind: 'verse', c: 0.95, endY: 10 },                                            // "swim at your own risk"
    { t: 109.29, kind: 'verse', c: 0.9, endY: 11 },                                            // "best I felt all month"
    { t: 118.51, kind: 'post', endY: 13 },                                                     // "no, I don't need the flags"
    { t: 124.68, kind: 'pre', endY: 17 },                                                      // "I'd just like somebody up in that chair"
    { t: 130.83, kind: 'pre', endY: 23 },                                                      // "and it's warm"
    { t: 133.91, kind: 'chorus', start: 'launch', kick: 11, endY: 10 },
    { t: 144.69, kind: 'chorus', c: 1.3, endY: 11 },                                           // "nobody's blowing the whistle"
    { t: 155.45, kind: 'chorus', c: 1.2, endY: 12 },                                           // "I'm going in"
    { t: 160.07, kind: 'post', c: 1.1, endY: 13 },                                             // "I'm not drowning, I'm waving"
    { t: 172.37, kind: 'post', endY: 17 },                                                     // "and it's warm ... it was cold"
    { t: 178.54, kind: 'bridge', endY: 27 },                                                   // the quiet, far out
    { t: 191.02, kind: 'final', start: 'launch', kick: 13, endY: 8 },                          // "nobody blew the whistle"
    { t: 206.46, kind: 'final', c: 1.3, endY: 8 },                                            // the band, all of it, the shore pulling away
    { t: 217.22, kind: 'outro', c: 0.45, endY: 4 },                                                     // "they came for my car that Thursday"
  ],
  rails: [
    { t: 13.12, bars: 2, x: 0 },        // the band's first bars, along the sand
    { t: 206.46, bars: 2, x: 0 },       // the last of the band, out along the coast in the moonlight
  ],
  palette: 'nlgHeat',
  world: 'nlg',
  lift: { fog: 0.25 },
  looks: [
    { t: -99, palette: 'nlgHeat' },
    { t: 33.02, palette: 'nlgBlaze', fade: 0.5 },                                              // "now it means it"
    { t: 61.78, palette: 'nlgBlaze', fade: 0.3, set: { horizon: 0xffefd2, skyGlow: 0xffe0a0, fog: 0xece6d4, sunSize: 1.75 } },   // "and it's warm"
    { t: 63.10, palette: 'nlgBlaze', fade: 0.3, set: { horizon: 0xffe6c0, skyGlow: 0xffd080, fog: 0xf0dfc0, sunSize: 1.9 } },
    { t: 64.72, palette: 'nlgBlaze', fade: 0.3, set: { horizon: 0xffdcac, skyGlow: 0xffc060, fog: 0xf2d8b0, sunSize: 2.1 } },
    { t: 67.62, palette: 'nlgGold', fade: 0.4 },
    { t: 95.39, palette: 'nlgSwim', fade: 1.2 },                                               // in the water
    { t: 104.2, palette: 'nlgNothing', fade: 2.4 },                                            // "the temperature of nothing"
    { t: 110.2, palette: 'nlgUp', fade: 2.6 },                                                 // "looking up at that chair"
    { t: 133.91, palette: 'nlgSunset', fade: 1.4 },
    { t: 162.0, palette: 'nlgDusk', fade: 3.5 },
    { t: 177.94, palette: 'nlgCold', fade: 1.7 },                                              // "it was cold"
    { t: 191.02, palette: 'nlgMoon', fade: 0.6 },
    { t: 219.0, palette: 'nlgSeptember', fade: 3.2 },                                          // a Thursday in September
    { t: 233.38, palette: 'nlgGrey', fade: 3.5 },                                              // "it's September"
  ],
  moments: [
    { t: 6.82, kind: 'flash', k: 0.18 },                // the band
    { t: 33.02, kind: 'flash', k: 0.32 },               // "now it means it"
    { t: 233.0, kind: 'bell', k: 0.32, n: 2, gap: 1700 },   // the bell buoy: "somebody told the water it's September"
  ],
  scenery: {
    // where the water is: the waterline's distance from the road at each song time (negative: on her
    // left); past zero the road is out over the sea and the beach is off to the right
    shore: [
      [-10, -44], [26, -44], [33, -40], [64, -40], [69, -32], [88.5, -30], [93.0, -12], [94.6, 14], [96.6, 70], [100, 96], [117, 104],
      [122.5, 46], [126.5, 14], [133, 8], [154.5, 10], [159.5, 64], [166, 120], [176, 170], [181, 290], [192, 300],
      [203.8, 20], [205.0, 18], [208, 72], [214, 66], [217.6, -30], [219.0, -40], [264, -44],
    ],
    // where the lot comes down to the sand (a seawall and steps) instead of the dunes
    lots: [[28.6, 42.4], [214.6, 264]],
    zones: [
      { from: -8, to: 262, kits: ['nlgDunes'] },
      { from: -8, to: 262, kits: ['nlgBuoys'], every: 2.4 },
      // the chairs, all empty, all facing the water
      { kits: ['nlgChairs'], at: [
        { t: 1.6, d: 7 }, { t: 11.5, d: 7 }, { t: 15.6, d: 7 },
        { t: 21.2, d: 7, s: 1.8 },                                               // "nobody told the chair the kid went home, seventeen, on his phone"
        { t: 29.2, d: 5, s: 2.1 }, { t: 29.95, d: 5, s: 2.1 }, { t: 30.3, d: 5, s: 2.1 }, { t: 30.85, d: 5, s: 2.1 },   // "watch, watch, watch, watch"
        { t: 46.6, d: 8, s: 2.0 },                                               // "left the chair up there, still facing the water"
        { t: 60.4, d: 7 },                                                       // "anybody up in that chair"
        { t: 71.5, d: 6 }, { t: 77.0, d: 6 }, { t: 81.4, d: 6 }, { t: 85.0, d: 6 },
        { t: 111.6, d: 14, s: 2.9 },                                              // "on my back looking up at that chair" (across the water)
        { t: 128.9, d: 18, s: 2.1 },                                              // "I'd just like somebody up in that chair"
        { t: 137.0, d: 12 }, { t: 141.5, d: 12 }, { t: 147.0, d: 12 }, { t: 152.0, d: 12 },
        { t: 199.0, d: 12, s: 2.0 }, { t: 203.0, d: 12, s: 1.8 },                 // "nobody came to save me"
        { t: 209.6, d: 12, s: 2.4 }, { t: 213.2, d: 12, s: 2.4 },                 // out along the coast in the moonlight
        { t: 228.0, d: 7 }, { t: 238.5, d: 7 },
      ] },
      // the flagpoles they took the flags off
      { kits: ['nlgPoles'], at: [{ t: 43.25, d: 17 }, { t: 43.7, d: 21 }, { t: 56.1, d: 18 }, { t: 74.0, d: 17 }, { t: 120.6, d: 16 }, { t: 140.0, d: 18 }, { t: 226.0, d: 18 }] },
      { kits: ['nlgRope'], at: [44.45] },                                       // "took the rope": the posts and no rope
      { kits: ['nlgSteps'], at: [{ t: 37.1, sandals: true }, { t: 223.6, sandals: true }] },   // her sandals by the steps
      { kits: ['nlgLot'], at: [
        { t: 36.3, kind: 'car' },                                                 // "one car in the lot, and it's mine"
        { t: 38.0, kind: 'sign' },                                                // "they tow on Thursdays"
        { t: 219.0, kind: 'sign' },
        { t: 220.9, kind: 'truck' },                                              // "they came for my car that Thursday"
        { t: 31.0, kind: 'lamp' }, { t: 38.2, kind: 'lamp' }, { t: 216.5, kind: 'lamp' }, { t: 224.6, kind: 'lamp' },
      ] },
      { kits: ['nlgShack'], at: [40.6, 230.4] },                               // "everybody left the week it got good"
      { kits: ['nlgRisk'], at: 104.0, d: 40 },                                    // "swim at your own risk, says the sign"
      { kits: ['nlgBell'], at: 234.2, d: -46 },                                  // the bell buoy
    ],
    // the town where everybody went, its lights always the same distance ahead along the coast
    away: [[160, 240]],
    gulls: [[2, 60], [96, 132], [217, 262]],
    signs: [
      { key: 'NLGDUTY', text: 'NO LIFEGUARD\nON DUTY', color: '#c8181c', core: '#c8181c', bg: '#dcd8cf' },
      { key: 'NLGTOW', text: 'TOW-AWAY\nZONE\nTHURSDAYS', color: '#c8181c', core: '#c8181c', bg: '#dcd8cf', faceAspect: 0.78 },
      { key: 'NLGRISK', text: 'SWIM AT\nYOUR OWN RISK', color: '#c8181c', core: '#c8181c', bg: '#e4e0d6' },
    ],
    lyricPart: 'nlgSign', lyricX: 27, lyricBg: '#dcd8cf', lyricColor: '#c8181c', lyricCore: '#c8181c',
    lyrics: [
      { t: 2.86, text: "NOBODY TOLD THE WATER\nIT'S SEPTEMBER", frame: '#c8181c', side: -1 },
      { t: 30.62, text: "THE SUN'S BEEN BLUFFING\nSINCE MEMORIAL DAY", frame: '#c8181c' },
      { t: 47.10, text: 'STILL FACING\nTHE WATER', frame: '#c8181c', side: 1 },
      { t: 67.14, text: 'NO LIFEGUARD ON DUTY', frame: '#c8181c' },
      { t: 75.84, text: "IT'S THE WARMEST\nIT'S BEEN ALL YEAR", frame: '#c8181c' },
      { t: 102.28, text: "THE WATER'S THE\nTEMPERATURE OF NOTHING", frame: '#c8181c', side: -1 },
      { t: 125.82, text: "I'D JUST LIKE SOMEBODY\nUP IN THAT CHAIR", frame: '#c8181c', side: -1 },
      { t: 159.84, text: "I'M NOT DROWNING,\nI'M WAVING", frame: '#c8181c', side: -1 },
      { t: 229.74, text: "SOMEBODY TOLD THE WATER\nIT'S SEPTEMBER", frame: '#c8181c', side: -1, lead: 1.8 },
    ],
    finale: { kind: 'nlg', t: 246.7, x: -24, s: 2.2, orbit: { y: 5, heroBack: 9, heroSide: 2.2, heroUp: 2.2, heroFov: 44, heroTilt: 1.2, heroPan: 0.18 } },   // the chair, still facing the water
  },
};
