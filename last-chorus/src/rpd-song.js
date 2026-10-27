// Reverse Psychology Degree: its course, its looks, its moments and what stands along the way.
// (album.js puts it in the record; the place itself is in rpd-world.js, its things in rpd-sets.js.)
//
// A university at night, sung from inside the head of somebody who took a degree in turning you
// against yourself. In at the gates under the crest; the quad, brick halls lit, the clock tower's
// hands running backwards, the department's name cut into its front the wrong way round; the band
// stops and every window goes out. In the lecture hall, the tiers empty, a slide for every line;
// the lights go down and an inkblot spreads over the screen until it fills it ("by design"), and
// she goes through the screen on "don't overthink it". Out on the quad the graduates line the way,
// all the same, no faces ("be someone else"); a table of free apples ("poison for free"). On every
// "reverse psychology" the whole place turns to its own negative for a moment. Up over a garden of hedges laid out as a brain, lamps in
// its folds ("your mind's my campus"); the couch under a lamp when the band drops out; commencement
// on the lawn, ribbons across the road that she cuts ("cut every tie"), a gold star slapped on the
// backdrop on breakdown day; the blue call boxes along the path ringing ("call your shrink"); the
// dissertations standing like stones and the caps thrown up ("celebrate your tears"); the cloister
// and the balloons let go. The graduates again, and all of them bow to her boast. The exam
// hall, desks to the far wall, its clock running backwards, falls flat when the music drops
// ("your life's collapse is my program"). Then morning on the lawn, and the diploma.

// the place's own palette keys (rpd-world.js reads them): rpdLit how lit its brick and stone is,
// rpdLamp how bright its lamps are
const NIGHT = {
  zenith: 0x05060f, horizon: 0x1c1830, skyGlow: 0x5a3050, glowDir: [0.2, 0.06, 1], skyline: 0x0a0a14, moonDir: [-0.35, 0.55, 0.75], moon: 0xe8e4d8,
  fog: 0x110d18, fogDensity: 0.0016, stars: 0.6, sunSize: 0, snow: 0, snowGround: 0, rain: 0, windowK: 1.5,
  ground: 0x16241a, street: 0xc89a58, roof: 0x2a2026, wall: 0x6a3a30, tree: 0x0e1a12,
  window: 0xffc878, windowAlt: 0xffe2b4, lamp: 0xffc070,
  ribbon: 0x3a0a18, edge: 0xffe2a8, fret: 0xe8b84a, glow: 0xffc050, hold: 0xffb02a, gate: 0xffffff, gem: 0xffd860,
  skyLight: 0x8a80a6, bounce: 0x3a2420, hemiK: 2.1, sunK: 0.85,
  board: 0x16101a, suit: 0x14141a, jacket: 0x7a1830, hair: 0x1a1210, shoes: 0xe8d8b0, gloves: 0x14141a, rim: 0xffd8a0, daze: 0,
  rpdLit: 0.45, rpdLamp: 1,
};

export const palettes = {
  rpdNight: NIGHT,
  // the lecture hall: wood and warm desk lamps
  rpdHall: { fog: 0x1a120c, fogDensity: 0.0022, skyLight: 0xffe0b8, bounce: 0x5a3820, hemiK: 1.7, rpdLit: 0.6 },
  // the lights going down for the slide: only the projector
  rpdDim: { fog: 0x06070c, fogDensity: 0.0026, skyLight: 0x6a7090, bounce: 0x141018, hemiK: 1.05, glow: 0xc8d8ff, hold: 0xd8b060, rpdLit: 0.15, rpdLamp: 0.25 },
  // out on the quad for the choruses: the lamps up, gold
  rpdQuad: { horizon: 0x2a1a34, skyGlow: 0x8a3a5a, fog: 0x160e1a, skyLight: 0xa898b8, bounce: 0x4a2a24, hemiK: 2.3, windowK: 1.8, rpdLit: 0.55, rpdLamp: 1.3 },
  // over the brain: blue night, gold in the folds
  rpdBrain: { zenith: 0x02040c, horizon: 0x0c1a2a, skyGlow: 0x2a4a6a, fog: 0x081018, fogDensity: 0.0013, stars: 1, skyLight: 0x6a8aa8, bounce: 0x142018, hemiK: 1.6, glow: 0xffd070, rpdLit: 0.35 },
  // the couch: one lamp
  rpdCouch: { zenith: 0x030308, horizon: 0x0c0a12, skyGlow: 0x2a1a20, fog: 0x07060a, fogDensity: 0.0024, stars: 0.3, skyLight: 0x4a4458, bounce: 0x1a1210, hemiK: 1.2, windowK: 0.4, rpdLit: 0.2, rpdLamp: 0.6 },
  // commencement on the lawn, strings of lights
  rpdLawn: { horizon: 0x2a1c30, skyGlow: 0x9a5a5a, fog: 0x18101a, skyLight: 0xa894a0, bounce: 0x4a3024, hemiK: 2.0, windowK: 1.6, rpdLit: 0.6, rpdLamp: 1.2 },
  // the call boxes: blue
  rpdBlue: { horizon: 0x0a1430, skyGlow: 0x2a4aa8, fog: 0x080c1c, fogDensity: 0.0019, skyLight: 0x6a80c8, bounce: 0x101830, hemiK: 1.6, glow: 0x7aa8ff, hold: 0x5a8aff, windowK: 0.8, rpdLit: 0.3, rpdLamp: 0.5 },
  // the dissertations: warm gold
  rpdGold: { horizon: 0x3a2018, skyGlow: 0xc87a3a, fog: 0x1c120a, skyLight: 0xe0b890, bounce: 0x5a3a20, hemiK: 2.1, rpdLit: 0.7, rpdLamp: 1.4 },
  // the cloister: moon on stone
  rpdStone: { zenith: 0x04060e, horizon: 0x161c2c, skyGlow: 0x3a4a6a, fog: 0x0c0e16, fogDensity: 0.0017, stars: 0.9, skyLight: 0x8a94b0, bounce: 0x22222a, hemiK: 1.6, rpdLit: 0.4, rpdLamp: 0.8 },
  // the exam hall: cold strip lights
  rpdExam: { fog: 0x14181c, fogDensity: 0.002, skyLight: 0xd8e2f4, bounce: 0x4a5058, hemiK: 1.5, glow: 0xffd060, rpdLit: 0.42 },
  // after it falls: dark, quiet
  rpdFallen: { zenith: 0x020308, horizon: 0x0e1018, skyGlow: 0x22283a, fog: 0x080a10, fogDensity: 0.0019, stars: 0.9, skyLight: 0x6a7090, bounce: 0x1a1a20, hemiK: 1.5, windowK: 0.2, rpdLit: 0.3, rpdLamp: 0.3 },
  // morning on the lawn
  rpdDawn: {
    zenith: 0x2a3a6a, horizon: 0xf0b890, skyGlow: 0xffb070, glowDir: [0.3, 0.05, 0.95], moonDir: [0.3, 0.08, 0.95], moon: 0xffd8a8, sunSize: 1.0, stars: 0,
    fog: 0x9a8090, fogDensity: 0.0012, ground: 0x2a3a24, street: 0xffd0a0, skyLight: 0xffd8c0, bounce: 0x6a4a3a, hemiK: 2.0, sunK: 1.3, windowK: 0.3, rpdLit: 0.8, rpdLamp: 0.2,
  },
  // the negative: every colour turned over for a moment
  rpdNeg: {
    zenith: 0xd4d0c2, horizon: 0xc4c2cc, skyGlow: 0xa8bccc, fog: 0xb4b6c0, fogDensity: 0.0014, stars: 0, skyline: 0xd0d0d6,
    ground: 0xb4aebc, street: 0x30406a, window: 0x0c1020, windowAlt: 0x101828, lamp: 0x2040a0,
    ribbon: 0xc8f2e4, edge: 0x10204a, fret: 0x1a4ab8, glow: 0x2a5ad8, hold: 0x2050e0, gate: 0x101828, gem: 0x2a48c0,
    skyLight: 0xf0f0ff, bounce: 0xc8ccdc, hemiK: 2.6, windowK: 0.1,
  },
};

// the bars, as the drums have them: the band comes in, stops and crashes back on these
// 2.15 4.29 6.40 8.53 ... 21.27 23.39 ... 40.41 ... 48.88 ... 65.88 ... 76.52 78.63 80.75 82.87 85.00 ...
// 93.48 ... 99.86 ... 114.70 ... 125.33 ... 133.85 ... 144.46 ... 161.46 ... 178.43 180.54 ... 189.09 191.19 ... 197.56

// "reverse psychology", each time it's sung: the place turns negative for the words
const FLIPS = [
  [44.06, 45.9, 0.75],     // "reverse psychology degree" (the first time it's said)
  [65.50, 67.75, 1],       // "reverse psychology, degree, degree"
  [76.30, 77.4, 0.8],      // "reverse psychology, I want to make you doubt"
  [114.50, 115.7, 0.8],    // "reverse psychology, watch you decay"
  [143.76, 146.3, 1],      // "reverse psychology, degree, degree"
  [154.82, 155.85, 0.8],   // "reverse psychology, that's a wrap"
  [190.26, 192.6, 1],      // "reverse psychology degree" (the last time)
];

const BASE_LOOKS = [
  { t: -99, palette: 'rpdNight' },
  { t: 23.5, palette: 'rpdHall', fade: 0.35 },       // in at the lecture hall
  { t: 42.6, palette: 'rpdDim', fade: 2.4 },         // the lights go down for the slide
  { t: 49.0, palette: 'rpdQuad', fade: 0.25 },       // through the screen, out on the quad
  { t: 85.6, palette: 'rpdBrain', fade: 1.6 },       // over the garden: "your mind's my campus"
  { t: 94.0, palette: 'rpdCouch', fade: 0.6 },       // "don't believe me"
  { t: 100.0, palette: 'rpdLawn', fade: 0.3 },       // commencement
  { t: 115.0, palette: 'rpdBlue', fade: 0.6 },       // the call boxes
  { t: 125.5, palette: 'rpdGold', fade: 0.3 },       // the dissertations
  { t: 134.6, palette: 'rpdStone', fade: 1.4 },      // the cloister
  { t: 144.6, palette: 'rpdQuad', fade: 0.25 },      // the graduates again
  { t: 166.4, palette: 'rpdExam', fade: 0.5 },       // the exam hall
  { t: 180.8, palette: 'rpdFallen', fade: 1.2 },     // after it falls
  { t: 191.4, palette: 'rpdQuad', fade: 0.3 },       // the last "reverse psychology degree"
  { t: 201.5, palette: 'rpdDawn', fade: 5 },         // morning on the lawn
];

// the looks with the negatives cut in: into it fast on the word, back more slowly to whatever look
// it would be by then (a look due during a negative waits for it to end)
function withFlips(base, flips) {
  const inside = (t) => flips.find(([a, b]) => t > a && t < b);
  const out = base.map((k) => { const f = inside(k.t); return f ? { ...k, t: f[1], moved: true } : { ...k }; });
  const at = (t) => { let k = base[0]; for (const x of base) if (x.t <= t) k = x; return k; };
  for (const [a, b, k] of flips) {
    const under = at(a), after = at(b);
    const set = {};
    if (k < 1) { // a part negative: the sky and the road turn, the lights stay
      for (const key of ['zenith', 'horizon', 'skyGlow', 'fog', 'ribbon', 'edge', 'fret', 'glow', 'hold', 'gate', 'ground']) set[key] = palettes.rpdNeg[key];
      out.push({ t: a + 0.14, palette: under.palette, set: { ...(under.set || {}), ...set, fogDensity: 0.0015, stars: 0, hemiK: 2.2, skyLight: 0xd8d8e8 }, fade: 0.14 });
    } else out.push({ t: a + 0.14, palette: 'rpdNeg', fade: 0.14 });
    if (!out.some((x) => x.moved && x.t === b)) out.push({ t: b, palette: after.palette, set: after.set, fade: 0.55 });
  }
  for (const x of out) if (x.moved) { x.fade = 0.55; delete x.moved; }
  return out.sort((x, y) => x.t - y.t);
}

export const song = {
  id: 'reverse-psychology-degree',
  accent: '#e8b84a',
  title: 'Reverse Psychology Degree',
  collect: 'star',
  startY: 14,
  sections: [
    { t: 0.0, kind: 'intro', endY: 15 },                                                       // "got my PhD in fucking with your head": the gates
    { t: 8.53, kind: 'verse', endY: 16 },                                                      // the band: the quad
    { t: 21.27, kind: 'break', endY: 20 },                                                     // the band stops: every window out
    { t: 23.39, kind: 'verse', start: 'launch', launchBeats: 3, kick: 8, endY: 13, turn: 0.3 }, // "don't listen to me": in at the lecture hall
    { t: 40.41, kind: 'pre', endY: 17, turn: 0.3 },                                            // "you're overreacting": the lights go down, the blot spreads
    // (half the song is chorus: its crests a little rounder than a chorus's usual, or riding it any
    // way but in time came out too hard)
    { t: 48.88, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, c: 1.15, endY: 12 }, // "don't overthink it": through the screen
    { t: 65.88, kind: 'chorus', c: 1.15, endY: 12 },                                            // "reverse psychology, degree, degree"
    { t: 78.63, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, c: 1.15, endY: 12 }, // the band back after "make you doubt"
    { t: 85.00, kind: 'post', endY: 22 },                                                       // "certified confusion... your mind's my campus"
    { t: 93.48, kind: 'break', endY: 13 },                                                      // "don't believe me": the couch
    { t: 99.86, kind: 'verse', start: 'launch', launchBeats: 3, kick: 9, endY: 15 },            // "graduated with honors": commencement
    { t: 114.70, kind: 'pre', endY: 20 },                                                       // "call your shrink": the call boxes
    { t: 125.33, kind: 'chorus', start: 'launch', launchBeats: 3, kick: 10, c: 1.15, endY: 12 }, // "I write your breakdown in my dissertation"
    { t: 133.85, kind: 'bridge', endY: 22 },                                                    // "thank me for teaching you how to let go"
    { t: 144.46, kind: 'final', start: 'launch', launchBeats: 3, kick: 11, c: 1.2, endY: 12 },  // "reverse psychology, degree, degree"
    { t: 161.46, kind: 'final', c: 1.2, endY: 12, turn: 0.4 },                                  // "your trauma's my grad school boast": they bow; the exam hall
    { t: 178.43, kind: 'break', endY: 18, turn: 0.4 },                                          // "your life's collapse": it falls; "don't believe me"
    { t: 189.09, kind: 'pre', endY: 22 },
    { t: 191.19, kind: 'final', start: 'launch', launchBeats: 3, kick: 10, c: 1.2, endY: 12 },  // the last "reverse psychology degree"
    { t: 197.56, kind: 'outro', endY: 6 },                                                     // "and you will. you always do."
  ],
  rails: [
    { t: 12.78, beats: 4, x: 0 },         // the bar with nothing sung in it, down the quad
    { t: 82.87, beats: 4, x: 0 },         // after "means you should": the band alone
    { t: 169.95, beats: 4, x: 0 },        // the bar between the bow and the exam
  ],
  palette: 'rpdNight',
  world: 'rpd',
  lift: { beams: { colors: [0xffd060, 0xffffff, 0x7a1830] } },
  titleView: { ahead: -0.14, x: 1.6, h: 1.7, back: -0.9, lookH: 2.6 },
  flips: FLIPS,
  looks: withFlips(BASE_LOOKS, FLIPS),
  moments: [
    { t: 8.53, kind: 'flash', k: 0.18 },                  // the band
    { t: 21.27, kind: 'blackout', dur: 2.05, k: 0.8 },    // the band stops: the windows go out
    { t: 21.3, kind: 'bell', k: 0.32, degree: 0 },        // and the tower strikes once
    { t: 23.39, kind: 'flash', k: 0.22 },                 // "don't listen to me"
    { t: 48.88, kind: 'impact', k: 0.5 },                 // through the screen
    { t: 48.88, kind: 'flash', k: 0.35 },
    { t: 78.63, kind: 'flash', k: 0.25 },                 // the band back
    { t: 99.86, kind: 'flash', k: 0.22 },                 // commencement
    { t: 112.0, kind: 'impact', k: 0.45 },                // the gold star, slapped on
    { t: 116.7, kind: 'ring', k: 0.3, dur: 0.6 },         // "call your shrink"
    { t: 121.9, kind: 'ring', k: 0.3, dur: 0.6 },         // "dial"
    { t: 125.33, kind: 'flash', k: 0.28 },                // "I write your breakdown"
    { t: 129.4, kind: 'pop', k: 0.4, flash: 0.1 },        // "celebrate": the caps go up
    { t: 141.0, kind: 'pop', k: 0.3, flash: 0.06 },       // "let go": the balloons
    { t: 144.46, kind: 'flash', k: 0.3 },                 // the last chorus
    { t: 164.9, kind: 'knock', n: 1, k: 0.45 },           // the graduates bow, all at once ("my grad school boast")
    { t: 179.6, kind: 'thud', k: 0.7 },                   // "your life's collapse": the hall falls flat
    { t: 191.19, kind: 'flash', k: 0.3 },                 // the last "reverse psychology degree"
  ],
  scenery: {
    rooms: [
      // the lecture hall: tiers rising both sides, a slide hung for every line, the screen at the end
      { style: 'lecture', from: 23.39, to: 48.88, caps: [{ kind: 'front', hw: 12, hh: 22 }, { kind: 'wall', hw: 13, hh: 26 }] },
      // the exam hall: desks to the far wall; it falls flat when the music drops
      { style: 'exam', from: 166.4, to: 190.0, caps: [{ kind: 'front', hw: 12, hh: 24 }, null], fallAt: 179.55, fallFor: 1.6 },
    ],
    zones: [
      // the quad: brick halls, every window lit, lamps along the paths
      { from: -6, to: 23.4, kits: ['rpdQuad'] },
      { from: 48.8, to: 84.0, kits: ['rpdQuad'] },
      { from: 99.7, to: 134.0, kits: ['rpdQuad'], x: 52 },
      { from: 144.3, to: 165.4, kits: ['rpdQuad'] },
      { from: 189.0, to: 215, kits: ['rpdQuad'], x: 70, sparse: true },
      // lamps along the paths
      { from: -4, to: 23.2, kits: ['rpdLamps'], every: 0.55, x: 19 },
      { from: 48.9, to: 84.0, kits: ['rpdLamps'], every: 0.6, x: 20 },
      { from: 100, to: 125, kits: ['rpdLamps'], every: 0.7, x: 21 },
      { from: 144.5, to: 166.3, kits: ['rpdLamps'], every: 0.6, x: 20 },
      // the graduates, all alike, lining the way
      { from: 50.5, to: 64.5, kits: ['rpdGrads'], every: 0.42, x: 27, rows: 2 },
      { from: 145.0, to: 166.0, kits: ['rpdGrads'], every: 0.36, x: 26, rows: 3, bow: 164.9 },
      // the slide and the screen she goes through
      { from: 0, to: 0.1, kits: ['rpdScreenAt'], at: 48.88 },
      // commencement: the chairs in rows, each with its cap on it
      { from: 101.0, to: 112.6, kits: ['rpdChairs'], every: 0.34, x: 28, rows: 4 },
      // the blue call boxes along the path
      { from: 115.0, to: 125.2, kits: ['rpdPhones'], every: 0.8, x: 19 },
      // the dissertations, standing
      { from: 125.6, to: 133.6, kits: ['rpdTheses'], every: 0.62, x: 34 },
      // the cloister
      { from: 134.2, to: 144.2, kits: ['rpdArches'], every: 0.36, x: 22 },
      // the desks in the exam hall
      { from: 167.0, to: 189.5, kits: ['rpdDesks'], every: 0.3, x: 16, rows: 4, floor: true },
      { from: 0, to: 0.1, kits: ['rpdProps'], at: [
        { t: 4.6, x: 0, kind: 'gate', s: 1.0, rot: Math.PI },                           // in at the gates
        { t: 15.6, x: -40, kind: 'front', s: 1.0 },                         // the department, its name the wrong way round
        { t: 22.6, x: 46, kind: 'tower', s: 1.0, bell: 21.3 },                        // the clock tower, running backwards
        { t: 59.9, x: 26, kind: 'apples', s: 1.0 },                         // "poison for free"
        { t: 97.6, x: -64, kind: 'couch', s: 1.9 },                         // "don't believe me": the couch
        { t: 110.0, x: 0, kind: 'ribbon', s: 1.0 },                         // "smell while I cut every tie"
        { t: 110.45, x: 0, kind: 'ribbon', s: 1.0 },
        { t: 110.9, x: 0, kind: 'ribbon', s: 1.0 },
        { t: 111.35, x: 0, kind: 'ribbon', s: 1.0 },
        { t: 113.4, x: 44, kind: 'stage', s: 1.0, star: 112.0 },            // the stage, and the gold star on breakdown day
        { t: 130.6, x: 0, kind: 'caps', s: 1.0, toss: 129.4 },              // "celebrate your tears"
        { t: 142.2, x: -24, kind: 'balloons', s: 1.0, go: 141.0 },          // "let go"
        { t: 177.2, x: 0, kind: 'clock', s: 1.0, fall: 179.55 },            // the exam hall's clock, running backwards
        { t: 128.2, x: 0, kind: 'papers', s: 1.0, lift: 125.6, x0: 30, x1: 26, y0: 22, n: 90, span: 5, seed0: 9 },   // the dissertations' pages
        { t: 174.2, x: 0, kind: 'papers', s: 1.0, lift: 175.26, room: true },  // "final exam": the papers go up
      ] },
    ],
    lyricPart: 'rpdSlide', lyricX: 0, lyricS: 1, lyricBg: '#f2efe6', lyricColor: '#5a0c1c', lyricCore: '#3a0610',
    lyricFont: 'Georgia, "Times New Roman", serif', lyricWeight: 700,
    lyrics: [
      { t: 0.0, text: 'GOT MY PhD IN\nFUCKING WITH YOUR HEAD', h: 13, lead: 4.6 },
      { t: 23.58, text: "DON'T LISTEN TO ME,\nI KNOW THAT YOU WILL", h: 13 },
      { t: 36.02, text: 'I LOVE YOU\nHOW YOU ARE', h: 13 },
      { t: 40.12, text: "YOU'RE OVERREACTING,\nIT'S ALL IN YOUR MIND", h: 13 },
      { t: 48.30, text: "DON'T OVERTHINK IT,\nJUST BE YOURSELF", h: 14, lead: 2.2 },
      { t: 52.50, text: 'EXCEPT BETTER,\nOR BE SOMEONE ELSE', h: 14 },
      { t: 56.78, text: 'SUPPORT ON PAPER,\nPOISON FOR FREE', h: 14 },
      { t: 60.98, text: "YOU'LL BE FINE\nMEANS DON'T TRUST ME", h: 14 },
      { t: 69.44, text: "DON'T LEAVE\nMEANS GO", h: 14 },
      { t: 89.28, text: "YOUR MIND'S MY CAMPUS,\nYOU'RE MY SCHOOL", h: 12, lead: 1.8 },
      { t: 93.82, text: "DON'T BELIEVE ME", h: 13 },
      { t: 99.88, text: 'GRADUATED\nWITH HONORS', h: 14, lead: 1.8 },
      { t: 111.94, text: 'GOLD STAR, STICKER\nON BREAKDOWN DAY', h: 14 },
      { t: 124.72, text: 'I WRITE YOUR BREAKDOWN\nIN MY DISSERTATION', h: 14, lead: 1.8 },
      { t: 137.66, text: 'THANK ME FOR TEACHING YOU\nHOW TO LET GO', h: 13 },
      { t: 148.66, text: 'NOTHING MEANS\nWHAT I SAY', h: 14 },
      { t: 157.00, text: 'MAKING YOU DOUBT\nYOUR OWN DAMN NAME', h: 14 },
      { t: 172.52, text: 'CERTIFIED CONFUSION,\nFINAL EXAM', h: 13 },
      { t: 190.26, text: 'REVERSE PSYCHOLOGY\nDEGREE', h: 14, lead: 1.8 },
      { t: 194.58, text: 'NOW THANK ME\nFOR YOUR DEFEAT', h: 13 },
      { t: 199.28, text: 'AND YOU WILL.\nYOU ALWAYS DO.', h: 13, lead: 2.2 },
    ],
    signs: [
      { key: 'RPDFREE', text: 'FREE', color: '#c81828', core: '#8a0c18', bg: '#f4f0e4' },
    ],
    shelf: 60, drop: 4,
    finale: { kind: 'rpd', t: 208.2, x: -34, s: 1.0, rot: -2.0, orbit: { r: 60, h: 10, y: 14, back: 0.6, right: 0.3, swing: 0.12, heroPan: 0.22, heroBack: 9, heroFov: 46, heroUp: 1.9 } },
  },
};
