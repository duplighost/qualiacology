// YOUR CAR IS AT THE BOTTOM OF THE LAKE: its course, its looks, its moments and what stands along
// the way. (album.js puts it in the record; the place itself is in ycl-world.js.)

export const palettes = {
  // a lake in the pines at night: black water with the moon in it, porch lights across the way
  yclNight: {
    zenith: 0x02040c, horizon: 0x16263e, skyGlow: 0x2a4a6a, glowDir: [-0.3, 0.1, 1], skyline: 0x04080e, moonDir: [-0.32, 0.36, 0.88], moon: 0xd8e4ff,
    fog: 0x08111c, fogDensity: 0.0017, stars: 0.9, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.2,
    ground: 0x18261c, street: 0xffc070, roof: 0x1a1a20, wall: 0x2a2a30, tree: 0x0a120c,
    window: 0xffc070, windowAlt: 0xffe0a8, lamp: 0xffb060, water: 0x08182c,
    ribbon: 0x0c1218, edge: 0xdff8ff, fret: 0x5ae0c8, glow: 0x4ad8c0, hold: 0x2ad0b8, gate: 0xffffff, gem: 0xffd27a,
    skyLight: 0x6a7a9a, bounce: 0x1a2028, hemiK: 1.6, sunK: 0.75,
    board: 0x14181c, suit: 0x16161c, jacket: 0xb8283a, hair: 0x1a120c, shoes: 0xe8e4dc, gloves: 0x16161c, rim: 0xc8e8ff, daze: 0,
  },
  // the band stops: everything holds its breath
  yclStill: { skyLight: 0x4a5a78, hemiK: 1.35, fog: 0x060c16, fogDensity: 0.002, windowK: 0.9 },
  // out on the open water, the moon on it
  yclLake: { moon: 0xe8f0ff, skyGlow: 0x34587a, skyLight: 0x7a8ab0, hemiK: 1.7, fog: 0x0a1420, fogDensity: 0.0015 },
  // her shore, the police at the door
  yclShore: { skyGlow: 0x3a3a7a, skyLight: 0x7a7aa8, fog: 0x0c1020 },
  // "the water's so dark down there"
  yclDeep: { zenith: 0x010208, horizon: 0x08101c, skyGlow: 0x1a2a40, fog: 0x050a12, fogDensity: 0.0022, skyLight: 0x4a5a70, hemiK: 1.3, stars: 0.6 },
  // under it: green-black, the light coming down from the moon through the water
  yclUnder: {
    zenith: 0x04221e, horizon: 0x0a302b, skyGlow: 0x0e4a42, glowDir: [0, 1, 0], skyline: 0x0a2c28, moon: 0x1a3a34, moonDir: [0.1, 1, 0.2],
    fog: 0x0a2c28, fogDensity: 0.0052, stars: 0, water: 0x0c2420, ground: 0x0a1a14,
    skyLight: 0x4aa094, bounce: 0x0e2c26, hemiK: 1.7, sunK: 0.3, fret: 0x7ae8d0, glow: 0x5ae0c8, edge: 0xc8fff0,
  },
  // up out of it: a big moon straight ahead, its road across the lake
  yclMoon: { zenith: 0x04081a, horizon: 0x1a2a48, skyGlow: 0x4a6a9a, moon: 0xf4f8ff, moonDir: [0.1, 0.22, 0.97], fog: 0x0c1628, fogDensity: 0.0013, stars: 1.0, skyLight: 0x8a9ac0, hemiK: 1.8, sunK: 0.9 },
  // home: her porch light
  yclHome: { skyGlow: 0x5a4a5a, window: 0xffb860, lamp: 0xffa850, skyLight: 0x7a7a98, fog: 0x0e1018, fogDensity: 0.0016 },
  // and the first grey of the morning
  yclDawn: { zenith: 0x10183a, horizon: 0x4a4058, skyGlow: 0xb07a6a, glowDir: [0.2, 0.04, 1], stars: 0.3, fog: 0x2a2a3a, skyLight: 0x9a9ab8, hemiK: 1.8 },
};

export const song = {
  // her side of the lake at night: the pines, the cabins, his suitcase packed with shaking hands, the
  // rack his keys came off; her cabin, and his car pulling out of the drive on "you peeled out the
  // driveway", away down the shore road ahead of you (the rail: "wheels on gravel screaming like you
  // meant it"). The band
  // stops and the car's in neutral, rolling out along the pier; on "by the way" it goes off the end, and
  // you climb the bank in the quiet and jump after it as the band comes back: one swell a line over the
  // lake, the car nose down in the water with its lights on, going under, his suitcase and his mixtape
  // floating. Across the water the police at her door, his face on every pole, the coffee she pours
  // them, the shop he went to for cigarettes; out along the dock (the other rail) the depth posts
  // counting to fifty feet; his stick shift standing out of the water, snapping into neutral as it's
  // sung, and the boat ramp; the second "by the way" and you go
  // in after it: under the lake, the car on the bottom with its windows down, its lights on, weed and
  // bubbles and the moon coming down through the water. Up out of it for "you're mine forever now", its
  // lights still showing under the water, and home to her cabin, the spare key on its hook.
  id: 'your-car-is-at-the-bottom-of-the-lake',
  accent: '#5ae0c8',
  title: 'YOUR CAR IS AT THE BOTTOM OF THE LAKE',
  collect: 'key',
  startY: 13,
  ground: 'ocean',
  skyline: 'hills',
  sections: [
    { t: 0.0, kind: 'intro', endY: 12 },                                                                        // "you should've let me drive"
    { t: 1.48, kind: 'verse', endY: 10, turn: 0.6 },                                                            // "last Tuesday, you called me unstable and scary"
    { t: 13.64, kind: 'verse', endY: 10, turn: 0.6 },                                                           // "packed your bags with shaking hands"
    { t: 25.83, kind: 'pre', endY: 13, turn: 0.6 },                                                             // "you peeled out the driveway" ... the stop: "by the way"
    { t: 41.01, kind: 'chorus', rb: 4, c: 1.2, start: 'launch', launchBeats: 2, kick: 11, gap: true, endY: 9 }, // "your car is at the bottom of the lake"
    { t: 53.10, kind: 'post', endY: 11 },                                                                       // "police came knockin' with your photo"
    { t: 65.15, kind: 'post', endY: 9 },                                                                        // "the water's so dark down there" ... "oh, by the way"
    { t: 80.24, kind: 'chorus', rb: 4, c: 1.2, start: 'launch', launchBeats: 2, kick: 10, gap: true, endY: 9 }, // in after it: "windows down, water black"
    { t: 92.31, kind: 'final', rb: 4, c: 1.2, start: 'launch', launchBeats: 2, kick: 13, gap: true, endY: 8 },  // up out of it: "you're mine forever now"
    { t: 101.37, kind: 'outro', endY: 6 },                                                                      // "don't worry, baby, I kept the spare key"
  ],
  rails: [
    { t: 28.87, bars: 2, x: 0 },        // "wheels on gravel screaming like you meant it"
    { t: 65.15, bars: 2, x: 0 },        // "the water's so dark down there, fifty feet of secrets"
  ],
  palette: 'yclNight',
  world: 'ycl',
  looks: [
    { t: -99, palette: 'yclNight' },
    { t: 38.0, palette: 'yclStill', fade: 0.4 },     // the band stops
    { t: 41.01, palette: 'yclLake', fade: 0.25 },    // off the bank, over the lake
    { t: 53.1, palette: 'yclShore', fade: 1.2 },     // her shore, the police
    { t: 65.15, palette: 'yclDeep', fade: 2.0 },     // "the water's so dark down there"
    { t: 81.0, palette: 'yclUnder', fade: 0.3 },     // in after it
    { t: 92.6, palette: 'yclMoon', fade: 0.35 },     // up out of it
    { t: 101.4, palette: 'yclHome', fade: 3.0 },     // home
    { t: 114.0, palette: 'yclDawn', fade: 8.0 },     // "just in case you wanna come home"
  ],
  moments: [
    { t: 40.92, kind: 'knock', n: 1, k: 0.75 },      // the car hits the water
    { t: 54.4, kind: 'knock', n: 2, k: 0.55 },       // "police came knockin'"
    { t: 109.42, kind: 'ring', k: 0.3, dur: 0.9 },   // "I kept the spare key"
  ],
  scenery: {
    signs: [
      { key: 'D10', text: '10 FT', color: '#ffffff', core: '#ffffff', bg: '#a8241e' }, { key: 'D20', text: '20 FT', color: '#ffffff', core: '#ffffff', bg: '#a8241e' },
      { key: 'D30', text: '30 FT', color: '#ffffff', core: '#ffffff', bg: '#a8241e' }, { key: 'D40', text: '40 FT', color: '#ffffff', core: '#ffffff', bg: '#a8241e' },
      { key: 'D50', text: '50 FT', color: '#ffffff', core: '#ffffff', bg: '#a8241e' },
      { key: 'CIGS', text: 'CIGARETTES', color: '#ff5a4a', core: '#ffd8c8', bg: '#140c0c' },
    ],
    zones: [
      // the pines, wherever there's land; the cabins in them
      { from: -8, to: 41, kits: ['yclPines'], every: 0.14, spread: 210, road: [-8, 40, -24] },
      { from: 51, to: 80, kits: ['yclPines'], every: 0.16, spread: 210 },
      { from: 100, to: 130, kits: ['yclPines'], every: 0.14, spread: 210 },
      { from: -6, to: 36, kits: ['yclCabins'], every: 1.7, x: 46, spread: 100 },
      { from: 54, to: 79, kits: ['yclCabins'], side: 1, every: 2.6, x: 80, spread: 80 },
      { from: 103, to: 128, kits: ['yclCabins'], side: 1, every: 2.6, x: 70, spread: 90 },
      // the pier he rolls out along; her dock across the lake
      { from: 38.4, to: 43.6, kits: ['yclPier'], x: -24, every: 0.1, w: 1.3, len: 0.9, lampEvery: 4, lampSide: -1 },
      { from: 65.4, to: 71.4, kits: ['yclPier'], x: 24, every: 0.1, lampEvery: 6, lampSide: 1 },
      // his face on every pole
      { from: 54.2, to: 64.4, kits: ['yclPoles'], x: 33, every: 0.62 },
      // the depth posts: "fifty feet of secrets"
      { from: 0, to: 0.1, kits: ['yclDepths'], at: [[69.0, -22, 'D10'], [69.6, 24, 'D20'], [70.2, -24, 'D30'], [70.8, 26, 'D40'], [71.4, -22, 'D50']] },
      // the bottom of the lake
      { from: 80.0, to: 95.0, kits: ['yclUnder'] },
      { from: 0, to: 0.1, kits: ['yclProps'], at: [
        { t: 17.2, x: 30, kind: 'suitcase', s: 0.75, shake: 15.9 },          // "packed your bags with shaking hands"
        { t: 20.6, x: -36, kind: 'rack', s: 0.9, grab: 17.66 },               // "grabbed your keys from the rack"
        { t: 29.0, x: -70, kind: 'cabin', s: 1.0, rot: -Math.PI / 2 },       // her cabin; his car in the drive
        { t: 45.7, x: 22, kind: 'suitcase', s: 0.8, float: true },           // "suitcase"
        { t: 46.8, x: -18, kind: 'tape', s: 1.0, float: true },              // "mixtape"
        { t: 57.8, x: 54, kind: 'cabin', s: 1.0, rot: Math.PI / 2, police: true },   // "police came knockin'"
        { t: 56.6, x: 38, kind: 'police', s: 2.3, turn: 0.5 },
        { t: 58.9, x: 39, kind: 'police', s: 2.3, turn: -0.35 },
        { t: 59.2, x: 33, kind: 'mug', s: 0.95 },                            // "I pour them coffee"
        { t: 59.5, x: 34.5, kind: 'mug', s: 0.85 },
        { t: 61.6, x: 50, kind: 'shop', s: 1.0, rot: Math.PI / 2, sign: 'CIGS' },   // "he went for cigarettes"
        { t: 66.8, x: 34, kind: 'rowboat', s: 2.4, turn: 0.4 },
        { t: 76.3, x: 30, kind: 'shift', s: 1.0, h: -1.2, neutral: 74.62 },    // "you love that stick shift" ... "I just put it in neutral"
        { t: 77.3, x: 44, kind: 'ramp', s: 1.0, rot: Math.PI / 2 },          // "let gravity take what you wouldn't give me"
        { t: 86.6, x: 24, kind: 'suitcase', s: 0.7, h: 0.1, rot: 0.6 },      // on the bottom
        { t: 110.2, x: 36, kind: 'sparekey', s: 0.9, ring: 109.42 },         // "I kept the spare key"
      ] },
    ],
    lyricPart: 'yclSign', lyricX: 32, lyricS: 1.0, lyricBg: '#16261e', lyricColor: '#efe6c8', lyricCore: '#ffffff',
    lyrics: [
      { t: 0.0, text: "YOU SHOULD'VE\nLET ME DRIVE", side: 1, lead: 3.0 },
      { t: 5.18, text: 'YOU CALLED ME\nUNSTABLE AND SCARY', side: 1 },
      { t: 32.24, text: "I'M A PROBLEM\nSOLVER, BABY", side: 1 },
      { t: 40.0, text: 'BY THE WAY', side: 1, lead: 1.2 },
      { t: 41.8, text: 'YOUR CAR IS AT THE\nBOTTOM OF THE LAKE', side: 1 },
      { t: 59.66, text: 'HE WENT FOR\nCIGARETTES', side: -1 },
      { t: 66.18, text: "THE WATER'S SO\nDARK DOWN THERE", side: -1 },
      { t: 74.56, text: 'I JUST PUT IT\nIN NEUTRAL', side: -1 },
      { t: 78.62, text: 'OH, BY THE WAY', side: -1, lead: 1.0 },
      { t: 96.9, text: "YOU'RE MINE\nFOREVER NOW", side: -1 },
      { t: 107.66, text: 'I KEPT THE\nSPARE KEY', side: -1 },
      { t: 110.1, text: 'JUST IN CASE YOU\nWANNA COME HOME', side: -1, lead: 2.4 },
    ],
    finale: { kind: 'ycl', t: 120.6, x: 40, s: 1.2, rot: Math.PI / 2, orbit: { r: 90, h: 12, y: 10, heroBack: 9, heroFov: 48, heroUp: 2, heroPan: 0.3 } },
  },
};
