// Kiss Me Like a Car Crash, the boss stage: the same night and the same song, and someone to
// chase through it. She's on the start line beside you, and on the first note she's gone.
//
// The edge of town: she shows you the hills from up the road, the nearer the better you ride; the
// hill comes down on "landslide" and the rocks land where you are. The band stops and the two of
// you go over the freeway in the quiet: the first tag, in the air. The strip, her rail ahead of
// you; then the doorstep verse, where she throws the bottles back at you, one on every snare, and
// two where the song gets close. "Car crash": the wrong-way traffic, a tag on "bomb threat" and
// one on "don't say goodbye". Downtown, side on, neck and neck, and your pumps decide who's in
// front. The warnings: a slalom of barriers, her line through them. The quiet: face to face, she
// plays a bar and you answer it, twice; then "pull the pin" (press), "hold me close" (hold it,
// round the cops), and let go on the drop. The last chorus in each other's faces, a tag on every
// line; the rail together; she breaks away; and the last big hit is the kiss. Miss it and she's
// gone up the highway without you.

const bar = (b, beat) => [b, beat];
// hazards, each by the beat it passes you on. A bottle she throws lands where you are on the
// snare, and you pass it on the next one; aim moves it off you (a pair either side, stay still)
const bottle = (b, beat, aim = 0) => ({ kind: 'bottle', pass: bar(b, beat), homing: true, aim });
const pair = (b, beat, gap = 2.15) => [bottle(b, beat, -gap), bottle(b, beat, gap)];
const rock = (b, beat, aim = 0) => ({ kind: 'rock', pass: bar(b, beat), homing: true, aim, fly: 3 });
const car = (b, beat, x) => ({ kind: 'car', pass: bar(b, beat), x });
const barrier = (b, beat, x) => ({ kind: 'barrier', pass: bar(b, beat), x });
const cop = (b, beat, x) => ({ kind: 'cop', pass: bar(b, beat), x, land: 3, fly: 1 });
const L = -4.2, C = 0, R = 4.2;

const HAZARDS = [
  // the landslide: the hill comes down and the rocks land where you are
  rock(10, 4), rock(11, 4), rock(12, 2), rock(12, 4, 0.6), rock(13, 2),
  // the strip: she starts throwing
  bottle(20, 2), bottle(21, 4),
  // the doorstep: one on every other snare, then pairs, then on every snare
  bottle(22, 2), bottle(23, 4), bottle(24, 2), bottle(25, 4), bottle(26, 2),
  ...pair(27, 2), bottle(27, 4), bottle(28, 4), ...pair(29, 2), bottle(29, 4),
  bottle(30, 2), bottle(30, 4), bottle(31, 2), ...pair(31, 4), bottle(32, 2), bottle(32, 4),
  bottle(33, 2), ...pair(33, 4),
  // "break the things I want to keep": every snare to the launch
  bottle(34, 2), bottle(34, 4), bottle(35, 2), bottle(35, 4), ...pair(36, 2), bottle(36, 4), bottle(37, 2),
  // the chorus: the wrong-way traffic, on the kick
  car(39, 3, R), car(40, 1, L), car(40, 3, C), car(41, 1, L), car(41, 1, R), car(41, 3, C),
  car(44, 3, L), car(45, 1, R), car(45, 3, C), car(45, 3, R), car(46, 3, L), car(46, 3, C),
  car(47, 1, R), car(47, 3, C), car(48, 1, L), car(48, 1, R), car(48, 3, C), car(49, 1, L),
  car(49, 3, R), car(49, 3, C), car(50, 1, L), car(50, 3, R),
  // the warnings: walls of barriers with a way through, once a bar, then twice
  barrier(63, 1, -3.6), barrier(63, 1, 0),
  barrier(64, 1, 0), barrier(64, 1, 3.6),
  barrier(65, 1, -3.6), barrier(65, 1, 0),
  barrier(66, 1, 3.6), barrier(66, 1, 0),
  barrier(67, 1, -3.6), barrier(67, 1, 0), barrier(67, 3, 0), barrier(67, 3, 3.6),
  barrier(68, 1, -3.6), barrier(68, 1, 0), barrier(68, 3, 3.6), barrier(68, 3, 0),
  barrier(69, 1, -3.6), barrier(69, 1, 3.6), barrier(69, 3, 0), barrier(69, 3, -3.6),
  barrier(70, 1, 3.6), barrier(70, 1, 0),
  // holding the pin: the cops pull out into the road
  cop(76, 3, -2.2), cop(77, 1, 2.4), cop(77, 3, -0.4), cop(78, 1, 3.2), cop(78, 1, -3.2), cop(78, 3, 0.2), cop(79, 1, -2.6),
  // the last chorus: traffic between the tags, then the hill again
  car(82, 2, L), car(82, 4, R), car(84, 2, C), car(84, 4, L), car(86, 2, R), car(86, 4, C),
  rock(88, 2), rock(88, 4, 0.5),
  // she's broken away: the last of the traffic, on every kick
  car(97, 3, L), car(97, 3, C), car(98, 1, R), car(98, 3, C), car(99, 1, L), car(99, 1, R),
  car(99, 3, C), car(100, 1, R), car(100, 3, L), car(101, 1, C), car(101, 3, R), car(101, 3, L), car(102, 1, C),
];

export function chaseOf(base) {
  return {
    ...base,
    id: 'kiss-me-like-a-car-crash-boss',
    song: base.id,                 // the same music and beat map
    of: base.id,
    tag: 'BOSS',
    accent: '#8fe3ff',
    // downtown side on: the windows lower and the air thicker, so the two of you and the hills read
    // against the street (every window lit, from the side at a few metres, was a wall of glare)
    looks: base.looks.map((k) => (Math.abs(k.t - 74.48) < 0.01 ? { ...k, set: { ...k.set, windowK: 0.75, fogDensity: 0.0032 } } : k)),
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 13.13, kind: 'chorus', c: 1.1 },
      { t: 20.28, kind: 'break', start: 'launch', kick: 9, endY: 10, gap: true },   // over the freeway in the quiet: the first tag
      { t: 22.99, kind: 'post', endY: 10 },
      { t: 31.29, kind: 'verse' },
      { t: 48.00, kind: 'pre' },
      { t: 53.58, kind: 'chorus', start: 'launch', kick: 11 },
      { t: 74.48, kind: 'verse', turn: 0.2 },                                       // side on: a straighter road
      { t: 86.90, kind: 'pre', endY: 30 },
      { t: 99.49, kind: 'bridge', endY: 50, amp: 0 },                               // the duel and the pin: the climb, no hills to pump
      { t: 111.98, kind: 'final', start: 'launch', kick: 14, endY: 5, gap: true },  // let go of the pin: the road goes up
      { t: 149.0, kind: 'outro' },
    ],
    rails: [
      { t: 24.37, bars: 2, x: 0 },        // the strip: hers first
      { t: 131.47, bars: 3, x: -1.3 },    // the last bars: one each
      { t: 131.47, bars: 3, x: 1.3 },
    ],
    boss: {
      rival: { rider: 'leather', alt: 'saffron', board: 'ghost-orchid', altBoard: 'midnight-koi', color: 0x9fe7ff, rim: 0xbfefff },
      moves: [
        { bar: -6, mode: 'start' },                      // beside you on the start line
        { bar: 0, mode: 'chase', lead: 1.55, near: 0.7 },// she's off
        { bar: 15, mode: 'chase', lead: 1.15, near: 0.55 },
        { bar: 19, mode: 'ahead', lead: 1.3 },           // the bottles
        { bar: 37, mode: 'chase', lead: 1.0, near: 0.5 },
        { bar: 38, mode: 'ahead', lead: 1.15 },          // the traffic
        { bar: 52, mode: 'beside', lead: 0.1 },          // into the race neck and neck
        { bar: 62, mode: 'ahead', lead: 1.0 },           // the warnings: her line through them
        { bar: 69, mode: 'beside', lead: 0.05 },         // alongside for the duel
        { bar: 75, mode: 'beside', lead: 0.22 },         // "hold me close"
        { bar: 80, mode: 'beside', lead: 0.05 },
        { bar: 97, mode: 'chase', lead: 0.95, near: 0.4 },// she breaks away
      ],
      tags: [
        { bar: 14, beat: 3, air: true, contact: [15, 1] },  // over the freeway, in the quiet; the band back as you land
        { bar: 42 }, { bar: 51 },                          // "bomb threat", "don't say goodbye"
        { bar: 83 }, { bar: 85 }, { bar: 87 }, { bar: 89 }, { bar: 90 }, { bar: 91 }, { bar: 92 },
        { bar: 104, kiss: true },                          // the last big hit
      ],
      hazards: HAZARDS.flat(),
      duel: [
        { call: 71, answer: 72, beats: [1, 3] },           // "you said this has" / "to end"
        { call: 73, answer: 74, beats: [1, 2, 3, 4] },     // "I heard this has" / "to hurt"
      ],
      pin: { press: [75, 3], release: [80, 1] },           // "pull the pin" ... "car crash"
      race: { from: 53, to: 62, start: 0.05 },
      cams: [
        { from: [14, 1], to: [15, 1], kind: 'air' },
        { from: [53, 1], to: [62, 1], kind: 'side' },
        { from: [71, 1], to: [75, 1], kind: 'front' },
        { from: [104, 3], to: [105, 3], kind: 'kiss' },
      ],
    },
  };
}
