// The record: which songs, in what order, how each one is built.
// Section times are seconds into the song, each on the beat the music changes.
// kinds: intro verse pre chorus post bridge break final outro
// start: 'launch' makes the section open with a lip you fly off (kick = m/s upward).

// a doorway between the rooms of her apartment
const DOOR = { kind: 'wall', hw: 11.5, hh: 30 };
// and between the rooms of the house in his head
const HDOOR = { kind: 'wall', hw: 11.5, hh: 30 };
// and between the rooms of the funeral home
const FHDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the school's doors between its halls
const SDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the factory's doors between its rooms
const UDOOR = { kind: 'wall', hw: 13, hh: 28 };
// the courthouse's doors
const CDOOR = { kind: 'wall', hw: 11.5, hh: 26 };
// the costume shop's doors
const KDOOR = { kind: 'wall', hw: 12, hh: 28 };

export const ALBUM = [
  {
    id: 'kiss-me-like-a-car-crash',
    accent: '#ff3d8b',
    title: 'Kiss Me Like a Car Crash',
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 13.13, kind: 'chorus', c: 1.1 },
      { t: 20.28, kind: 'break', start: 'launch', kick: 9, endY: 10 },   // the band stops: hang in the quiet, land on the stab
      { t: 22.99, kind: 'post', endY: 10 },
      { t: 31.29, kind: 'verse' },
      { t: 48.00, kind: 'pre' },
      { t: 53.58, kind: 'chorus', start: 'launch', kick: 11 },           // the stop before "showed up like a car crash"
      { t: 74.48, kind: 'verse' },
      { t: 86.90, kind: 'pre', endY: 30 },
      { t: 99.49, kind: 'bridge', endY: 50 },                            // "this has to end ... pull the pin"
      { t: 111.98, kind: 'final', start: 'launch', kick: 14, endY: 5 },           // the pin
      { t: 149.0, kind: 'outro' },
    ],
    palette: 'carcrash',
    scenery: {
      zones: [
        { from: -4, to: 21, kits: ['suburb'], water: true },
        { from: 21, to: 52, kits: ['strip'] },
        { from: 52, to: 90, kits: ['city'] },
        { from: 90, to: 127, kits: ['downtown'] },
        { from: 127, to: 141, kits: ['city'] },
        { from: 141, to: 172, kits: ['strip'] },
      ],

      roads: [
        { x: 0, width: 12, walk: 3.5, laneLines: 0, from: -10, to: 13.5, traffic: false, lampEvery: 18 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 13.5, to: 175, lanes: [-9, -3, 3, 9], density: 0.6, police: 0.05, lampEvery: 27 },
      ],
      overpasses: [24.4, 41.0, 61.5, 80.0, 118.5, 134.0],
      lyrics: [
        { t: 0.4, text: 'KISS ME LIKE\nA CAR CRASH', lead: 2.2 },
        { t: 10.6, text: 'LOVE ME LIKE\nA LANDSLIDE', side: -1 },
        { t: 16.7, text: "DON'T SAY\nGOODBYE" },
        { t: 47.7, text: 'I ONLY BREAK THE THINGS\nI WANT TO KEEP', side: -1 },
        { t: 55.7, text: 'I WANNA\nTASTE THE WRECK' },
        { t: 92.9, text: 'IF LOVE IS\nJUST A WARNING', side: -1 },
        { t: 95.5, text: 'LEAVE ME\nWHERE I DIED' },
        { t: 104.9, text: 'PULL THE PIN', side: -1 },
        { t: 106.3, text: 'HOLD ME CLOSE' },
        { t: 123.6, text: 'STILL BREATHING\nIN THE DIRT', side: -1 },
        { t: 135.7, text: 'JUST SAY\nGOODBYE' },
      ],
      finale: { t: 153.9, x: -11, fireAt: 143.9 },
    },
  },
  {
    // the town sings it, through a whole year: winter, the first warm Friday,
    // summer, the last car south in September, the first cold rain
    id: 'summer-people',
    accent: '#ffb070',
    title: 'Summer People',
    startY: 13,
    ribbonWidth: 0.62,
    camLift: 0.7,
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 15.93, kind: 'verse', endY: 9 },
      { t: 49.86, kind: 'pre', endY: 24 },                                   // "first warm Friday"
      { t: 65.39, kind: 'chorus', start: 'launch', kick: 10, endY: 8 },      // a breath of silence, then summer
      { t: 97.86, kind: 'verse', endY: 10 },
      { t: 131.31, kind: 'chorus', start: 'launch', kick: 11, endY: 8 },
      { t: 165.76, kind: 'bridge', endY: 26 },                               // "but hey, you in the window in February"
      { t: 190.19, kind: 'break', endY: 30 },
      { t: 194.61, kind: 'break', start: 'launch', kick: 9, endY: 26 },      // the music stops; hits are jumps
      { t: 202.27, kind: 'break', start: 'launch', kick: 9, endY: 30 },
      { t: 207.27, kind: 'final', start: 'launch', kick: 13, endY: 5 },      // first cold rain, plywood going up
      { t: 261.0, kind: 'outro' },
    ],
    palette: 'winter',
    ground: 'ocean',
    looks: [
      { t: -99, palette: 'winter' },
      { t: 49.86, palette: 'spring', fade: 6 },
      { t: 66.0, palette: 'summer', fade: 1.6 },
      { t: 98.0, palette: 'summernight', fade: 10 },
      { t: 166.36, palette: 'september', fade: 9 },
      { t: 208.0, palette: 'rain', fade: 2.5 },
    ],
    scenery: {
      zones: [
        { from: -4, to: 49.9, kits: ['beachtown'], boarded: 0.92, wake0: 0.12 },
        { from: 49.9, to: 65.4, kits: ['beachtown'], boarded: 0.45, wake0: 0.3 },
        { from: 65.4, to: 166.4, kits: ['beachtown'], boarded: 0, wake0: 0.45 },
        { from: 166.4, to: 207.3, kits: ['beachtown'], boarded: 0.25, wake0: 0.18 },
        { from: 207.3, to: 272, kits: ['beachtown'], boarded: 0.8, wake0: 0.2 },
        { from: -4, to: 49.9, kits: ['sand'], winter: true },
        { from: 49.9, to: 65.4, kits: ['sand'] },
        { from: 65.4, to: 166.4, kits: ['sand'], umbrellas: true },
        { from: 166.4, to: 207.3, kits: ['sand'] },
        { from: 207.3, to: 272, kits: ['sand'], winter: true },
        { from: -4, to: 49.9, kits: ['boardwalk'], dark: 0.75, wake0: 0.1 },
        { from: 49.9, to: 166.4, kits: ['boardwalk'], wake0: 0.4 },
        { from: 166.4, to: 207.3, kits: ['boardwalk'], dark: 0.45, wake0: 0.2 },
        { from: 207.3, to: 272, kits: ['boardwalk'], dark: 0.1, wake0: 0.35 },
        { from: -4, to: 272, kits: ['railway'], x: -56 },
      ],
      roads: [],
      trains: { x: -56, passes: [
        { at: 35.5, rate: -1.1, cars: 7, lit: 0.6 },     // "the trains run right along my water, loud and bright and through"
        { at: 118, rate: -1.0, cars: 9, lit: 1 },
        { at: 186, rate: 0.55, cars: 6, lit: 0.4 },     // the last ones south
      ] },
      lyrics: [
        { t: 41.3, text: 'NOT ONE OF THEM HAS\nEVER STOPPED HERE', side: 1, x: 30 },
        { t: 70.9, text: 'COCONUT\nAND GASOLINE', side: -1, x: 26 },
        { t: 127.7, text: 'NOBODY PASSES THROUGH\nI KEEP EVERYTHING', side: 1, x: 30 },
        { t: 186.2, text: "YOU'RE NOT\nSUMMER PEOPLE, HONEY", side: -1, x: 26 },
        { t: 240.8, text: 'I HOLD YOUR SPOT', side: 1, x: 30 },
      ],
      finale: { kind: 'ferris', t: 267.5, x: -64, fireAt: 240.3, orbit: { r: 85, h: 4, y: 26 } },
    },
  },
  {
    // she wanted Avatar. Twenty minutes in he gets up, "I'll be right back", and out in the
    // lobby there's a claw machine full of ducks that won't let you lose. He never goes back
    // in. Years later the ducks are still on the dresser. Next time he stays in the movie.
    id: 'a-million-ducks',
    accent: '#ffd23a',
    title: 'A Million Ducks',
    startY: 9,
    collect: 'duck',
    sections: [
      { t: 0.0, kind: 'intro', endY: 7, turn: 0.25 },
      { t: 6.01, kind: 'verse', c: 0.8, endY: 8, turn: 0.25 },                  // the film starts
      { t: 11.83, kind: 'verse', endY: 9, turn: 0.35 },                         // "she wanted Avatar"
      { t: 27.75, kind: 'pre', endY: 13, turn: 0.5 },                           // "20 minutes and I got up"
      { t: 33.53, kind: 'verse', c: 1.0, endY: 10 },                            // "out in the lobby by the popcorn"
      { t: 45.08, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },  // the bass drops out: "it won't let you lose"
      { t: 68.08, kind: 'post', endY: 9 },                                      // "a pirate one, a captain one"
      { t: 79.56, kind: 'verse', c: 0.95, endY: 12 },                           // "the credits roll"
      { t: 93.89, kind: 'chorus', c: 1.35, endY: 8 },
      { t: 118.24, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 10 },   // "different girl, different year"
      { t: 123.97, kind: 'verse', c: 0.9, endY: 14 },
      { t: 138.28, kind: 'pre', endY: 22 },                                     // "red dress, my mirror"
      { t: 152.61, kind: 'chorus', endY: 12 },                                  // "strangers have seen my dresser"
      { t: 164.07, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },   // "where the hell was I?"
      { t: 172.69, kind: 'final', start: 'launch', launchBeats: 4, kick: 11 },
      { t: 189.87, kind: 'post', c: 1.15, endY: 9 },                            // "still up on the dresser"
      { t: 201.37, kind: 'bridge', endY: 8, turn: 0.1 },                        // "next time I'm staying in the movie"
      { t: 205.78, kind: 'break', start: 'launch', launchBeats: 4, kick: 5, endY: 7, turn: 0.05 },    // the silence
      { t: 210.12, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 5, turn: 0.05 },   // "even if it's Avatar"
      { t: 218.79, kind: 'outro', turn: 0.05 },
    ],
    palette: 'auditorium',
    world: 'cinema',
    titleView: { ahead: 0.16, x: 1.7, h: 1.25, back: 0.05, lookH: 1.6 },   // in front of her: the screen behind
    looks: [
      { t: -99, palette: 'auditorium' },
      { t: 31.0, palette: 'lobby', fade: 1.5 },            // "out in the lobby by the popcorn"
      { t: 81.0, palette: 'credits', fade: 2 },            // "the door swung open, blue light in her hair"
      { t: 89.0, palette: 'lobby', fade: 4 },
      { t: 94.2, palette: 'carpark', fade: 1.4 },          // out the front doors: "I never went back in"
      { t: 118.3, palette: 'room', fade: 0.4 },            // "different girl, different year"
      { t: 140.2, palette: 'roomred', fade: 1.2 },         // "red dress, my mirror"
      { t: 147.5, palette: 'room', fade: 4 },
      { t: 201.6, palette: 'screen', fade: 1.6 },          // "next time I'm staying in the movie"
      { t: 211.6, palette: 'avatar', fade: 1.2 },          // "even if it's Avatar"
    ],
    moments: [
      { t: 118.2, kind: 'flash', k: 0.9 },
    ],
    scenery: {
      flat: [[92.5, 119.5, 0]],
      signs: [
        { key: 'MARQUEE', text: 'NOW SHOWING\nAVATAR', color: '#ffe6a0', core: '#ffffff', bg: '#140a14', frame: '#ffcf6a', size: 70 },
        { key: 'CINEMA', text: 'CINEMA 12', color: '#ff4fb8', core: '#ffe0f4', size: 86 },
      ],
      halls: [
        { style: 'auditorium', from: -10, to: 31.5, screenAt: -3.6, caps: [false, true] },
        { style: 'lobby', from: 31.5, to: 93.9, caps: [false, true] },
        { style: 'room', from: 118.24, to: 201.37, caps: [false, true], showFrom: 118.12 },
        { style: 'auditorium', from: 201.37, to: 240, screenAt: 227.2, screenK: 1.3, caps: [false, false] },
      ],
      zones: [
        { from: -4, to: 30.6, kits: ['seats'], face: 'back' },
        { from: 34.2, to: 34.3, kits: ['concession'], at: 34.2, x: -15.5 },        // "by the popcorn"
        { from: 36.5, to: 36.6, kits: ['claws'], at: 36.5, x: 11.6, s: 2.9 },      // "there's a light I can't get past"
        { from: 46.6, to: 67.8, kits: ['claws'], row: true },                       // "it won't let you lose"
        { from: 72.0, to: 79.0, kits: ['claws'], row: true },
        { from: 93.9, to: 118.2, kits: ['carpark'], cinema: true },
        { from: 118.4, to: 201.0, kits: ['dresser'] },
        { from: 140.2, to: 140.3, kits: ['mirror'], at: 140.6, x: -30 },           // "red dress, my mirror"
        { from: 157.0, to: 157.1, kits: ['roomLamp'], at: 157.0, x: 29, s: 0.5 },
        { from: 202.0, to: 225.6, kits: ['seats'] },
      ],
      roads: [
        { x: 0, width: 22, walk: 3, laneLines: 0, from: 93.6, to: 118.6, traffic: false, lampEvery: 16, dry: false },
      ],
      lyricFloor: true,
      lyrics: [
        { t: 101.0, text: 'I NEVER\nWENT BACK IN', side: 1, x: 26 },
        { t: 110.6, text: 'IT WON\'T LET\nYOU LOSE', side: -1, x: 26 },
        { t: 152.6, text: 'STRANGERS HAVE\nSEEN MY DRESSER', side: 1, x: 30 },
        { t: 156.9, text: 'NOBODY KNOWS\nWHOSE ROOM', side: -1, x: 30 },
        { t: 189.9, text: 'STILL UP ON\nTHE DRESSER', side: 1, x: 30 },
      ],
      finale: { kind: 'screen', t: 227.2, startT: -3.6, fireAt: 210.1, orbit: { r: 44, h: 1, y: -7, facing: true, back: 2.5, swing: 0.3, right: 0.28 } },
    },
  },
  {
    // the candy factory where his songs get made: the syrup, the coating pans, the taffy
    // puller, the venom; the presses stuttering, the trap, the gumball machine; the power
    // tripping; out the loading dock onto your block, where it's still what's playing.
    id: 'unloaded',
    accent: '#ff5fd2',
    title: 'Unloaded',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 14 },                                         // the factory at night
      { t: 8.23, kind: 'verse', start: 'launch', kick: 7, endY: 10 },              // in through the doors: "drip-fed"
      { t: 19.92, kind: 'pre', endY: 18 },
      { t: 24.26, kind: 'verse', start: 'launch', kick: 8, endY: 11 },             // "every syllable's a hit-and-run"
      { t: 30.03, kind: 'pre', endY: 20 },                                         // "skin tight, hindsight"
      { t: 35.80, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },           // "candy coated"
      { t: 45.82, kind: 'break', endY: 12 },
      { t: 47.25, kind: 'pulse', endY: 14 },                                       // the presses stuttering
      { t: 58.82, kind: 'verse', start: 'launch', kick: 8, endY: 10 },             // "velvet rap trap snapped"
      { t: 71.94, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },
      { t: 82.02, kind: 'break', endY: 12 },
      { t: 83.47, kind: 'verse', endY: 14 },                                       // "everything I touch trips"
      { t: 92.14, kind: 'pre', endY: 22 },                                         // "before the chorus hits"
      { t: 95.02, kind: 'chorus', start: 'launch', kick: 11, endY: 10 },
      { t: 105.15, kind: 'break', endY: 12 },
      { t: 106.61, kind: 'verse', endY: 14 },                                      // out onto the block
      { t: 116.79, kind: 'pre', endY: 22 },
      { t: 119.70, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the drop
      { t: 128.49, kind: 'outro', endY: 5 },
    ],
    palette: 'unlNight',
    world: 'candy',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 5.0 },   // behind her, the factory's doors and the peppermint ahead
    looks: [
      { t: -99, palette: 'unlNight' },
      { t: 8.23, palette: 'unlCook', fade: 0.4 },          // in through the doors: the syrup kitchen
      { t: 24.26, palette: 'unlFloor', fade: 0.5 },        // the production floor
      { t: 45.82, palette: 'unlPress', fade: 0.3 },        // the stamping room
      { t: 58.82, palette: 'unlShow', fade: 0.4 },         // the showroom
      { t: 71.94, palette: 'unlFloor', fade: 0.4 },
      { t: 85.84, palette: 'unlDark', fade: 0.12 },        // "everything I touch trips"
      { t: 95.02, palette: 'unlFull', fade: 0.12 },        // "before the chorus hits"
      { t: 106.61, palette: 'unlBlock', fade: 0.6 },       // out onto the block
      { t: 119.70, palette: 'unlDrop', fade: 0.3 },        // still what's playing
    ],
    moments: [
      { t: 59.72, kind: 'knock', k: 0.6, n: 1 },           // "trap snapped"
      { t: 67.10, kind: 'pop', k: 0.6 },                   // "bubble gum"
      { t: 85.84, kind: 'blackout', dur: 0.25, k: 0.55 },  // the power trips
      { t: 95.02, kind: 'flash', k: 0.6 },                 // the lights back on as the chorus hits
      { t: 119.70, kind: 'flash', k: 0.5 },
    ],
    scenery: {
      rooms: [
        { style: 'cook', from: 8.23, to: 24.26, caps: [{ kind: 'front', hw: 16, hh: 30 }, UDOOR] },   // "drip-fed"
        { style: 'floor', from: 24.26, to: 35.80, caps: [null, UDOOR] },                               // the line
        { style: 'floor', from: 35.80, to: 45.82, caps: [null, UDOOR] },                               // "candy coated"
        { style: 'press', from: 45.82, to: 58.82, caps: [null, UDOOR] },                               // the presses stuttering
        { style: 'show', from: 58.82, to: 71.94, caps: [null, UDOOR] },                                // "trap snapped", "bubble gum"
        { style: 'floor', from: 71.94, to: 83.47, caps: [null, UDOOR] },
        { style: 'floor', from: 83.47, to: 95.02, caps: [null, UDOOR] },                               // the power trips
        { style: 'floor', from: 95.02, to: 106.61, caps: [null, { kind: 'wall', hw: 20, hh: 34 }] },   // out the loading dock
      ],
      roomEvents: { dark: [85.84, 95.02, 0.02, 0.1], party: [119.70, 999, 0.05, 0.5] },
      zones: [
        // the yard at night: the trucks, the street, the stacks over the roof, the peppermint over the doors
        { from: -4, to: 8.0, kits: ['clubstreet'], dim: 0.9 },
        { from: -4, to: 8.2, kits: ['trucks'], at: [[2.6, 34, 0.2], [4.4, -36, -0.15], [6.3, 38, 0.1]] },
        { from: 9.0, to: 14.0, kits: ['stacks'], at: [[9.6, -86, 1], [11.6, 92, 1.15], [13.8, -100, 0.9]] },
        { from: 8.1, to: 8.2, kits: ['peppermint'], at: 8.12, y: 47 },
        // the syrup kitchen: kettles under the pipe, "drip-fed"
        { from: 9.5, to: 23.5, kits: ['vats'], at: [[13.6, -26], [13.6, 26], [13.6, -40], [13.6, 40], [16.6, -30, 1.2], [16.6, 34, 1.2], [19.6, -36], [19.6, 30], [22.4, -30, 1.1], [22.4, 36, 1.1]] },
        { from: 13.6, to: 13.7, kits: ['pipe'], at: [13.6], y: 30 },
        // the line: belts each side, the coating pans, the taffy puller, the tanks of the green
        { from: 24.6, to: 45.4, kits: ['belts'], every: 1.4, x: 46 },
        { from: 36.0, to: 45.0, kits: ['pans'], at: [[37.0, 30], [37.6, -30, 1.1], [43.6, 32], [44.2, -30]] },
        { from: 38.8, to: 38.9, kits: ['puller'], at: 38.8, x: -34, s: 1.3 },
        { from: 40.4, to: 41.5, kits: ['tanks'], at: [[40.4, 32], [40.9, -32], [41.4, 34]] },
        // the stamping room: a press coming down on every beat
        { from: 46.6, to: 58.4, kits: ['presses'], every: 0.72, x: 28 },
        // the showroom: lollipops, the trap, the gumball machine
        { from: 59.2, to: 71.6, kits: ['lollies'], every: 0.9, x: 32 },
        { from: 60.6, to: 60.7, kits: ['trap'], at: 60.6, x: 30, snap: 59.72, s: 1.5 },
        { from: 67.5, to: 67.6, kits: ['gumball'], at: 67.5, x: -34, blow0: 64.6, pop: 67.10 },
        // the line again
        { from: 72.2, to: 83.2, kits: ['belts'], every: 1.4, x: 46 },
        { from: 73.0, to: 82.0, kits: ['pans'], at: [[73.4, -30], [74.0, 30, 1.1], [79.6, -32], [80.2, 30]] },
        { from: 75.4, to: 76.5, kits: ['tanks'], at: [[75.4, -32], [75.9, 32], [76.4, -34]] },
        { from: 77.4, to: 77.5, kits: ['puller'], at: 77.4, x: 34, s: 1.3 },
        // the power trips; the mood ring in the dark
        { from: 86.8, to: 86.9, kits: ['breaker'], at: 86.8, x: -22, trip: 85.84 },
        { from: 92.0, to: 92.1, kits: ['moodRing'], at: 92.0, s: 1.1 },
        // everything going
        { from: 95.3, to: 106.3, kits: ['belts'], every: 1.4, x: 46 },
        { from: 96.0, to: 105.0, kits: ['pans'], at: [[96.4, 30], [97.0, -30, 1.1], [102.0, 32], [102.6, -30]] },
        { from: 98.6, to: 100.2, kits: ['tanks'], at: [[98.6, 32], [99.1, -32], [99.6, 34], [100.1, -34]] },
        { from: 100.6, to: 100.7, kits: ['puller'], at: 100.6, x: -34, s: 1.3 },
        { from: 103.4, to: 106.0, kits: ['lollies'], every: 0.8, x: 34 },
        // out onto the block: the walk-ups, string lights across, the fire, the busted clock
        { from: 106.4, to: 145, kits: ['tenements'], x: 38 },
        { from: 106.8, to: 140, kits: ['stringLights'], every: 1.3, span: 33 },
        { from: 110.6, to: 110.7, kits: ['pit'], at: 110.6, x: 27, s: 2.2 },
        { from: 115.6, to: 115.7, kits: ['streetClock'], at: 115.6, x: -26, s: 1.1 },
      ],
      roads: [
        { x: 0, width: 30, walk: 4, laneLines: 1, from: -10, to: 8.3, lanes: [], density: 0, lampEvery: 34, follow: true },
        { x: 0, width: 30, walk: 16, laneLines: 1, from: 106.5, to: 150, lanes: [], density: 0, lampEvery: 34, follow: true },
      ],
      lyricPart: 'hazardSign', lyricBg: '#a07c10', lyricColor: '#101010', lyricCore: '#101010', lyricS: 1,
      lyrics: [
        { t: 21.12, text: "I DON'T MAKE SONGS\nI MAKE THE THING", x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 38.56, text: 'SWEETEST VENOM\nEVER LAUDED', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 65.96, text: 'SPIT IT OUT AS\nBUBBLE GUM', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 113.88, text: 'RUNNING ON A\nBUSTED CLOCK', x: 0, h: 18, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'boombox', t: 132.6, x: -24, fireAt: 119.70, orbit: { r: 42, h: -3, y: 13, facing: true, back: 0.6, right: 0.3, swing: 0.2 } },
    },
  },
  {
    // a Sunday in a sunny suburb, a case built out of nothing: the dentist three times this
    // week, his car halfway down her street, brunch in broad daylight, the matinee. Nothing
    // happened. In the end he makes his getaway at the speed limit, blinker on, gone for good.
    id: 'nothing-happens-every-week',
    accent: '#ff4a4a',
    title: 'Nothing Happens Every Week',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 7 },
      { t: 6.22, kind: 'verse', c: 0.8, endY: 8 },                               // "you said you were at the dentist"
      { t: 26.74, kind: 'pre', endY: 15 },                                       // "so where were you on the night of nothing much"
      { t: 33.58, kind: 'pre', start: 'launch', launchBeats: 4, kick: 7, endY: 14 },   // "go on and plead the fifth"
      { t: 39.05, kind: 'chorus', c: 1.1, endY: 9 },                             // "nothing happened, nothing happened"
      { t: 59.59, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 9 },  // "something you were always free to be"
      { t: 63.69, kind: 'verse', c: 0.85, endY: 10 },                            // "I wrote it as a blessing"
      { t: 85.62, kind: 'pre', endY: 20 },                                       // "what's with the hat and sunglasses?"
      { t: 97.99, kind: 'chorus', endY: 10 },
      { t: 121.37, kind: 'break', endY: 12 },                                    // "we held the door for each other till it closed"
      { t: 126.88, kind: 'pre', endY: 22 },                                      // "your perfect alibi was the truth"
      { t: 136.54, kind: 'break', rb: 8, endY: 20 },                             // "nothing happened. Say it slow"
      { t: 142.01, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 12 },  // "the only charge that's ever gonna stick"
      { t: 149.03, kind: 'break', endY: 12 },                                    // "court adjourned"
      { t: 151.75, kind: 'post', start: 'launch', launchBeats: 4, kick: 7, endY: 10 },     // "before I ever took the stand"
      { t: 155.96, kind: 'chorus', endY: 10 },
      { t: 158.76, kind: 'break', start: 'launch', launchBeats: 4, kick: 6, endY: 10 },    // the bass goes
      { t: 161.55, kind: 'pre', endY: 16 },
      { t: 165.72, kind: 'chorus', c: 1.3, endY: 10 },                           // "now there's no one left to lie to me"
      { t: 178.21, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // "like a free man breaking free"
      { t: 180.97, kind: 'final', endY: 6, turn: 0.6 },                          // "you made your getaway at the speed limit"
      { t: 193.45, kind: 'break', endY: 8, turn: 0.4 },                          // "nothing happened, nothing ever will again"
      { t: 200.31, kind: 'final', c: 1.1, endY: 5, turn: 0.3 },
      { t: 204.48, kind: 'outro', turn: 0.2 },
    ],
    palette: 'sunday',
    world: 'sunday',
    skyline: 'hills',
    groundStyle: 'country',
    looks: [
      { t: -99, palette: 'sunday' },
      { t: 121.4, palette: 'sundaylate', fade: 12 },       // "we held the door for each other till it closed"
      { t: 181.0, palette: 'getaway', fade: 6 },           // "you made your getaway at the speed limit"
    ],
    confetti: [[92.6, 97.6]],                              // "you can shred the evidence"
    confettiColors: [0xf4f2ea, 0xffffff, 0xe8e4d8, 0xf0ece0, 0xfffaf0, 0xdcd8cc],
    scenery: {
      signs: [
        { key: 'DENTIST', text: 'DENTIST', color: '#2a6ad8', core: '#ffffff', bg: '#f4f8fa', size: 90 },
        { key: 'BRUNCH', text: 'BRUNCH', color: '#ff5a3a', core: '#fff4e8', bg: '#2a2420', size: 96 },
        { key: 'MATINEE', text: 'SUNDAY\nMATINEE', color: '#ffd166', core: '#ffffff', bg: '#3a1420', frame: '#ffd166', size: 74 },
        { key: 'COURT', text: 'COURTHOUSE', color: '#f2efe6', core: '#ffffff', bg: '#2a3240', size: 78 },
        { key: 'SPEED', text: 'SPEED\nLIMIT\n25', color: '#111111', core: '#111111', bg: '#f6f6f2', size: 64 },
        { key: 'BARBER', text: 'BARBER', color: '#e8203a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'PHARMACY', text: 'PHARMACY', color: '#2a9a4a', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'FLORIST', text: 'FLORIST', color: '#ff6fa8', core: '#ffffff', bg: '#f4f2ee' },
        { key: 'HARDWARE', text: 'HARDWARE', color: '#d8602a', core: '#ffffff', bg: '#2a2a30' },
        { key: 'BAKERY', text: 'BAKERY', color: '#c89a4a', core: '#fff8ec', bg: '#3a2418' },
      ],
      zones: [
        { from: -4, to: 26.7, kits: ['sundaystreet'], clear: [[15.0, 16.3, 1], [7.0, 10.2, 0], [9.5, 10.6, 1, 'all']] },
        { from: 7.0, to: 7.1, kits: ['tooth'], at: [7.4, 8.5, 9.6], x: 14.5 },     // "you said you were at the dentist / there's three teeth this week"
        { from: 26.7, to: 63.7, kits: ['mainstreet'], string: true, clear: [[32.4, 33.8, -1]] },
        { from: 33.0, to: 33.1, kits: ['cafe'], at: 33.0, x: -1 },                // "that broad daylight brunch"
        { from: 26.7, to: 63.7, kits: ['evidence'] },
        { from: 63.7, to: 74.4, kits: ['sundaystreet'] },
        { from: 74.4, to: 78.4, kits: ['market'] },                               // "she tells me about the market"
        { from: 79.6, to: 79.7, kits: ['matinee'], at: 79.6, x: 1 },              // "and the Sunday matinee"
        { from: 78.4, to: 98.0, kits: ['mainstreet'] },
        { from: 98.0, to: 121.4, kits: ['mainstreet'], string: true, signs: ['BARBER', 'BAKERY', 'FLORIST'] },
        { from: 98.0, to: 121.4, kits: ['evidence'] },
        { from: 121.4, to: 142.0, kits: ['sundaystreet'] },
        { from: 142.5, to: 142.6, kits: ['bigframe'], at: 142.5, s: 2.5, sy: 1.9 },          // "I'll frame it hanging in the hall": you go through it
        { from: 142.0, to: 156.0, kits: ['mainstreet'], signs: ['PHARMACY', 'HARDWARE'], clear: [[147.6, 152.4, 1]] },
        { from: 150.2, to: 150.3, kits: ['courthouse'], at: 150.2, x: 1, dist: 33 },        // "court adjourned before I ever took the stand"
        { from: 156.0, to: 181.0, kits: ['sundaystreet'], string: true },
        { from: 156.0, to: 181.0, kits: ['evidence'] },
        { from: 181.0, to: 196.0, kits: ['sundayedge'] },                         // the edge of town
        { from: 182.0, to: 194.0, kits: ['speedsigns'], every: 2.6 },              // "at the speed limit"
        { from: 196.0, to: 222.0, kits: ['fields'] },
      ],
      roads: [
        { x: 0, width: 12, walk: 3, laneLines: 1, from: -10, to: 196, lanes: [-3, 3], density: 0.05, lampEvery: 40, dry: true, follow: true },
        { x: 0, width: 10, walk: 0, laneLines: 1, from: 196, to: 230, traffic: false, lampEvery: 60, dry: true, follow: true },
      ],
      vehicles: [
        { kind: 'sedan', paint: 0xd8ccb4, at: 15.9, rate: 0, x: 1, lane: 2.1, yaw: 0.5, hazard: true, from: 2, to: 18.8 },    // "your car's parked fully illegal, halfway down her street"
        { kind: 'sedan', paint: 0xd8ccb4, lead: [[180.2, 0.35], [181.4, 0.55], [187.0, 0.6], [193.6, 3.2]], x: 0.001, lane: 99, from: 180.3, to: 194.4 },  // the getaway, blinker on
      ],
      lyricBg: '#f2efe6', lyricColor: '#1c1c1c', lyricCore: '#1c1c1c', lyricX: 25, lyricFloor: true,
      shelf: 70, drop: 2.4,
      lyrics: [
        { t: 36.3, text: 'SHE TELLS ME\nEVERYTHING', side: 1 },
        { t: 44.5, text: 'I CAUGHT YOU DOING\nNOTHING RED-HANDED', side: -1 },
        { t: 47.3, text: 'FINGERPRINTS\nON NOTHING', side: 1 },
        { t: 90.0, text: 'REAL SUBTLE, DUDE', side: -1 },
        { t: 99.4, text: 'NOTHING HAPPENED', side: 1 },
        { t: 128.1, text: 'YOUR PERFECT ALIBI\nWAS THE TRUTH', side: -1 },
        { t: 168.5, text: 'NO ONE LEFT\nTO LIE TO ME', side: 1 },
        { t: 193.2, text: 'GONE FOR GOOD', side: -1 },
      ],
      finale: { kind: 'town', t: 207.3, x: 17, s: 1.3, fireAt: 200.3, orbit: { r: 19, h: 4.4, y: 5.4, facing: true, back: 1.2, right: 0.3, swing: 0.25 } },
    },
  },
  {
    // the courthouse, and she's on trial for it: "order in the court", the marble halls and the
    // scales, the jury, the key thrown away, the evidence room, red-handed, the cells, the cuffs
    // worn like jewellery, her lawyer the mirror; then "case closed" in the courtroom, lipstick on.
    id: 'pretty-until-proven-guilty',
    accent: '#ff3a5a',
    title: 'Pretty Until Proven Guilty',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                                         // "order in the court"
      { t: 8.17, kind: 'verse', start: 'launch', kick: 8, endY: 10, turn: 0.3 },             // the band in: the marble hall
      { t: 22.12, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },
      { t: 28.30, kind: 'break', endY: 12, turn: 0.3 },
      { t: 29.86, kind: 'verse', endY: 12, turn: 0.3 },                                      // "guess I lean on your wasted youth"
      { t: 34.50, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },          // "pretty until proven guilty"
      { t: 46.90, kind: 'break', endY: 14, turn: 0.3 },                                      // "throw away the key"
      { t: 49.99, kind: 'post', start: 'launch', kick: 8, endY: 12, turn: 0.3 },             // "pretty, pretty, pretty"
      { t: 57.73, kind: 'verse', endY: 12, turn: 0.3 },                                      // "read me my rights"
      { t: 76.33, kind: 'pre', endY: 22, turn: 0.3 },                                        // "caught red-handed"
      { t: 84.05, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },
      { t: 96.46, kind: 'break', endY: 14, turn: 0.3 },                                      // "swallow the key"
      { t: 99.53, kind: 'post', start: 'launch', kick: 8, endY: 12, turn: 0.3 },
      { t: 105.72, kind: 'bridge', endY: 12, turn: 0.3 },                                    // "click those cuffs tight"
      { t: 113.47, kind: 'final', start: 'launch', kick: 11, endY: 10, turn: 0.3 },          // "my lawyer is my mirror"
      { t: 121.22, kind: 'break', endY: 12, turn: 0.3 },                                     // "I said I'm always right"
      { t: 122.77, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },          // "pretty, guilty, pretty, guilty"
      { t: 135.14, kind: 'break', endY: 14, turn: 0.3 },
      { t: 136.69, kind: 'pre', endY: 22, turn: 0.3 },
      { t: 138.23, kind: 'final', start: 'launch', kick: 12, endY: 10, turn: 0.3 },          // the last chorus
      { t: 150.63, kind: 'break', endY: 14, turn: 0.3 },
      { t: 153.73, kind: 'final', start: 'launch', kick: 10, endY: 8, turn: 0.3 },           // "case closed"
      { t: 166.12, kind: 'outro', endY: 5, turn: 0.3 },
    ],
    palette: 'pupCourt',
    world: 'court',
    titleView: { ahead: -0.14, x: 2.0, h: 2.0, back: -0.55, lookH: 3.0 },   // behind her, down the courtroom to the bench
    looks: [
      { t: -99, palette: 'pupCourt' },
      { t: 8.17, palette: 'pupHall', fade: 0.4 },           // the marble hall
      { t: 28.30, palette: 'pupCourt', fade: 0.4 },         // the courtroom: the jury, the stand
      { t: 46.90, palette: 'pupHall', fade: 0.4 },          // "throw away the key"
      { t: 57.73, palette: 'pupEvidence', fade: 0.3 },      // the evidence room
      { t: 76.33, palette: 'pupRed', fade: 0.4 },           // "caught red-handed"
      { t: 84.05, palette: 'pupCourt', fade: 0.3 },
      { t: 94.89, palette: 'pupCells', fade: 0.25 },        // "lock me up"
      { t: 105.72, palette: 'pupMirror', fade: 0.4 },       // "click those cuffs tight"
      { t: 107.9, palette: 'pupCold', fade: 1.2 },          // "let the cold bite deep"
      { t: 113.47, palette: 'pupMirror', fade: 0.6 },       // "my lawyer is my mirror"
      { t: 121.22, palette: 'pupHall', fade: 0.4 },         // the scales
      { t: 135.14, palette: 'pupCourt', fade: 0.4 },
      { t: 150.63, palette: 'pupVerdict', fade: 0.6 },      // "case closed"
    ],
    moments: [
      { t: 1.22, kind: 'knock', k: 0.5, n: 1 },             // the gavel: "order in the court"
      { t: 95.44, kind: 'knock', k: 0.6, n: 2, gap: 150 },  // the cells slam: "lock me up"
      { t: 107.0, kind: 'shutter', k: 0.2 },                // the cuffs click
      { t: 158.32, kind: 'knock', k: 0.7, n: 1 },           // "case closed!"
      { t: 160.30, kind: 'knock', k: 0.7, n: 1 },
    ],
    scenery: {
      rooms: [
        { style: 'court', from: -3.4, to: 8.17, caps: [null, CDOOR] },                // "order in the court"
        { style: 'hall', from: 8.17, to: 28.30, caps: [null, CDOOR] },                // the marble hall, the scales
        { style: 'court', from: 28.30, to: 46.90, caps: [null, CDOOR] },              // the jury, the witness stand
        { style: 'hall', from: 46.90, to: 57.73, caps: [null, CDOOR] },               // "throw away the key", the mirrors
        { style: 'evidence', from: 57.73, to: 76.33, caps: [null, CDOOR] },           // "read me my rights"
        { style: 'hall', from: 76.33, to: 84.05, caps: [null, CDOOR] },               // "caught red-handed"
        { style: 'court', from: 84.05, to: 94.89, caps: [null, CDOOR] },
        { style: 'cells', from: 94.89, to: 105.72, caps: [null, CDOOR] },             // "lock me up"
        { style: 'mirror', from: 105.72, to: 121.22, caps: [null, CDOOR] },           // the cuffs, the lawyer
        { style: 'hall', from: 121.22, to: 135.14, caps: [null, CDOOR] },             // "pretty, guilty"
        { style: 'court', from: 135.14, to: 150.63, caps: [null, CDOOR] },
        { style: 'court', from: 150.63, to: 182, caps: [null, { kind: 'wall', hw: 0.01, hh: 0.01 }] },   // "case closed"
      ],
      roomEvents: { red: [77.7, 84.0, 0.4, 0.4], cold: [107.9, 113.4, 0.8, 1.0] },
      zones: [
        // the courtroom: the gallery's benches, the bench ahead, the gavel on "order in the court"
        { from: -3.0, to: 6.8, kits: ['pews'], every: 0.5 },
        { from: 7.8, to: 7.9, kits: ['judgeBench'], at: [[7.87, -23.5, true], [7.87, 23.5, false]], strikes: [1.22] },
        // the marble hall: columns down both sides, the scales hung over the road
        { from: 8.6, to: 28.0, kits: ['columns'], every: 1.0, x: 40 },
        { from: 16.0, to: 16.1, kits: ['scales'], at: 16.0, lift: 24, s: 1.1 },
        // the courtroom: the jury box, the witness stand and its ring lights
        { from: 28.6, to: 46.5, kits: ['pews'], every: 0.55, clear: [[33.6, 37.4, 1], [40.4, 44.6, -1]] },
        { from: 35.5, to: 35.6, kits: ['jury'], at: 35.5, x: 36, s: 1.1 },
        { from: 42.4, to: 42.5, kits: ['stand'], at: 42.4, x: -34, s: 1.3 },
        // "throw away the key"; mirrors with bulbs round them down the hall
        { from: 50.3, to: 50.4, kits: ['key'], at: 50.3, throwAt: 48.94, s: 1.4 },
        { from: 50.6, to: 57.4, kits: ['vanities'], every: 0.75, x: 48.6, y: 20, s: 1.2 },
        // the evidence room: the hoodie in its bag, the receipts, the ring lights, the broken heart
        { from: 63.4, to: 63.5, kits: ['hoodie'], at: 63.4, x: 36, y: 18, s: 1.4 },
        { from: 64.6, to: 66.0, kits: ['receipts'], at: [65.0, 65.6], top: 40 },
        { from: 70.0, to: 70.1, kits: ['stand'], at: 70.0, x: 33, s: 1.2 },
        { from: 74.4, to: 74.5, kits: ['heartCase'], at: 74.4, x: -32, s: 1.3 },
        // red-handed: handprints and paint down the hall, the buckets
        { from: 77.6, to: 84.0, kits: ['paintDecals'], at: [[78.6, 49.6, 'hand', 12], [78.9, -49.6, 'hand', 18], [79.3, 49.6, 'splat', 22, 1.4], [79.6, -49.6, 'hand', 10], [80.0, 49.6, 'hand', 20], [80.4, -49.6, 'splat', 14, 1.6], [80.9, 49.6, 'hand', 9], [81.3, -49.6, 'hand', 24], [81.8, 49.6, 'splat', 16, 1.2], [82.3, -49.6, 'hand', 13], [82.8, 49.6, 'hand', 19], [83.3, -49.6, 'splat', 20, 1.5]] },
        { from: 78.0, to: 83.0, kits: ['buckets'], at: [[79.0, 30], [80.6, -32], [82.2, 34]] },
        { from: 76.6, to: 83.6, kits: ['columns'], every: 1.0, x: 40 },
        // the courtroom again
        { from: 84.4, to: 94.5, kits: ['pews'], every: 0.55 },
        // the cells: the doors slam shut down the row on "lock me up"
        { from: 95.0, to: 105.4, kits: ['cellDoors'], every: 0.5, x: 37.2, shut: 95.44, gap: 0.08 },
        // the room of mirrors: the cuffs on their cushion, then her lawyer
        { from: 107.5, to: 107.6, kits: ['cuffs'], at: 107.5, hang: true, lift: 16, click: 107.0, s: 1.6 },
        { from: 113.8, to: 113.9, kits: ['lawyer'], at: 113.8, lift: 18 },
        // the scales: pretty, guilty, pretty, guilty
        { from: 121.6, to: 134.8, kits: ['columns'], every: 1.0, x: 40 },
        { from: 134.0, to: 134.1, kits: ['scales'], at: 134.0, lift: 24, s: 1.25, tips: [[129.30, 1], [129.86, -1], [130.64, 1], [131.24, -1], [132.04, 1], [132.86, 1], [133.24, 1], [133.60, -1]] },
        // the last courtroom: "cuffs as couture"; the bench, "case closed"
        { from: 135.5, to: 150.3, kits: ['pews'], every: 0.55, clear: [[143.0, 146.0, -1]] },
        { from: 144.9, to: 145.0, kits: ['cuffs'], at: 144.9, x: -30, s: 1.5 },
        { from: 151.0, to: 166.0, kits: ['pews'], every: 0.55, clear: [[158.0, 161.5, -1]] },
        { from: 159.6, to: 159.7, kits: ['judgeBench'], at: [[159.6, -30, true]], strikes: [158.32, 160.30] },
      ],
      lyricPart: 'placard', lyricBg: '#3a2414', lyricColor: '#e8c060', lyricCore: '#fff0b0', lyricS: 1,
      lyrics: [
        { t: 0.0, lead: 2.4, text: 'ORDER IN\nTHE COURT', x: 0, h: 14, frame: 'rgba(0,0,0,0)' },
        { t: 34.48, text: 'PRETTY UNTIL\nPROVEN GUILTY', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 58.74, text: 'READ ME\nMY RIGHTS', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
        { t: 82.44, text: 'CRIME OF\nTHE CENTURY', x: 0, h: 24, part: 'newspaper', bg: '#8a867c', color: '#141414', core: '#141414', font: 'Georgia, "Times New Roman", serif', weight: 900, frame: 'rgba(0,0,0,0)' },
        { t: 158.32, text: 'CASE CLOSED', x: 0, h: 15, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'lipstick', t: 168.4, x: -24, fireAt: 153.73, orbit: { r: 58, h: -6, y: 26, facing: true, back: 1.0, right: 0.3, swing: 0.2 } },
    },
  },
  {
    // a clear morning, technically freezing. No coat; a coat is one more thing to carry.
    // Running the sunlit stretches, catching breath in the shade, early for every train
    // that pulls away. At the end the door's left unlocked and the cat thinks he hunts.
    id: 'technically-thirty-two',
    accent: '#8fd8ff',
    title: 'Technically Thirty-Two',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 9 },
      { t: 6.06, kind: 'verse', c: 0.85, endY: 9 },
      { t: 11.64, kind: 'chorus', c: 1.1, endY: 8 },                            // the band
      { t: 15.78, kind: 'verse', c: 0.8, endY: 10 },                            // "somebody's fire alarm is wailing"
      { t: 26.69, kind: 'verse', endY: 12 },                                    // "I cut the sunlit stretches quick"
      { t: 38.92, kind: 'pre', endY: 22 },                                      // "shade subtracts the sun"
      { t: 56.40, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },  // the bass goes
      { t: 64.54, kind: 'post', endY: 12 },                                     // "I'm only ever early for the trains"
      { t: 68.61, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },    // "that pull away"
      { t: 94.26, kind: 'pre', endY: 22 },                                      // "I think about the cold"
      { t: 101.06, kind: 'chorus', c: 1.35 },                                   // "can't breathe, it's technically thirty-two"
      { t: 116.18, kind: 'post', start: 'launch', launchBeats: 4, kick: 9, endY: 12 },    // "that pull away"
      { t: 121.71, kind: 'verse', c: 0.85, endY: 14 },                          // "she'd be waiting at the platform"
      { t: 132.72, kind: 'chorus', endY: 10 },                                  // "she made it worth the cold"
      { t: 146.39, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // the bass goes again
      { t: 151.88, kind: 'bridge', endY: 26, c: 0.55 },                         // "she wanted kids"
      { t: 166.95, kind: 'pre', endY: 30 },                                     // "now a family is the only thing"
      { t: 178.05, kind: 'chorus', c: 1.3, endY: 12 },                          // "can't freeze a technically 32"
      { t: 189.01, kind: 'pre', endY: 22, c: 0.8 },                             // "I'm done with being early"
      { t: 194.35, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 10 },  // "I leave the door unlocked"
      { t: 206.80, kind: 'break', start: 'launch', launchBeats: 4, kick: 6, endY: 9 },    // "there's water in the fridge" and nothing
      { t: 210.85, kind: 'final', start: 'launch', launchBeats: 4, kick: 10, endY: 6 },   // coming out of the sun
      { t: 217.74, kind: 'outro', endY: 3.5 },
    ],
    palette: 'frost',
    world: 'cold',
    looks: [
      { t: -99, palette: 'frost' },
      { t: 151.9, palette: 'overcast', fade: 4 },          // "she was only in my phone"; "she wanted kids"
      { t: 166.9, palette: 'thaw', fade: 5 },              // "now a family is the only thing I'm building toward"
      { t: 194.3, palette: 'homesun', fade: 3 },           // "I leave the door unlocked these days"
    ],
    scenery: {
      el: { x: -17, passes: [
        { at: 58.5, rate: 1.0, cars: 6, from: 54, to: 64.6 },             // a train keeping pace through the chorus
        { at: 66.2, rate: 1.5, cars: 6, from: 64.6, to: 76 },             // "I'm only ever early for the trains that pull away"
        { at: 114.0, rate: 1.55, cars: 7, from: 108, to: 124 },
        { at: 141.0, rate: 0.55, cars: 6, from: 134, to: 151 },           // "she cried through every goodbye"
        { at: 190.6, rate: 1.45, cars: 8, from: 186, to: 199 },           // "I'm done with being early"
      ] },
      signs: [],
      zones: [
        { from: -4, to: 194.4, kits: ['coldstreet'], el: -17 },
        { from: -4, to: 196, kits: ['el'], x: -17 },
        { from: 16.4, to: 16.5, kits: ['alarm'], at: 16.4, x: 25 },        // "somebody's fire alarm is wailing"
        { from: 66.0, to: 66.1, kits: ['station'], at: 66.0, x: -17 },
        { from: 102.0, to: 102.1, kits: ['tempsign'], at: 102.4, x: 17.5 }, // "can't breathe, it's technically thirty-two"
        { from: 123.0, to: 123.1, kits: ['station'], at: 123.1, x: -17, who: 0x7a2a4a, whoZ: 2 },   // "she'd be waiting at the platform"
        { from: 194.4, to: 232, kits: ['coldstreet'], el: -17, homes: true, low: true, gapAt: 222.6, gapX: 23 },
      ],
      roads: [
        { x: 0, width: 20, walk: 5, laneLines: 2, from: -10, to: 240, lanes: [-7, -2.5, 2.5, 7], density: 0.3, lampEvery: 30, dry: true },
      ],
      vehicles: [
        { kind: 'bus', route: 'FREE', at: 81.6, rate: 0.82, x: 1, from: 77, to: 93 },    // "the free bus fills up fast"
      ],
      lyrics: [
        { t: 64.5, text: "I'M ONLY EVER EARLY\nFOR THE TRAINS", side: 1, x: 26 },
        { t: 84.8, text: 'NO COAT', side: 1, x: 24 },
        { t: 135.5, text: 'SHE MADE IT\nWORTH THE COLD', side: 1, x: 26 },
        { t: 166.9, text: 'A FAMILY IS THE\nONLY THING', side: 1, x: 26 },
        { t: 197.1, text: 'I LEAVE THE DOOR\nUNLOCKED THESE DAYS', side: 1, x: 26 },
      ],
      finale: { kind: 'door', t: 222.6, x: 23, fireAt: 210.85, orbit: { r: 19, h: 3.5, y: 2.4, facing: true, back: 1.4, right: 0.3 } },
    },
  },
  {
    // a school day, the love story and the alarm: in through the metal detector, the note in
    // the locker, the clock at noon, the siren down the hall, police lights in the windows,
    // glitter, homecoming in the gym; the final bell, the news vans at six, the stadium lit.
    id: 'school-shooter-sweetheart',
    accent: '#ff3d6e',
    title: 'School Shooter Sweetheart',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8 },                                          // "met her by the metal detector"
      { t: 10.32, kind: 'verse', endY: 10 },                                       // "left a love note in my locker"
      { t: 25.40, kind: 'break', endY: 18 },                                       // "kisses like a bomb threat"
      { t: 26.75, kind: 'chorus', start: 'launch', kick: 8, endY: 10 },            // "she's the siren blaring down the hall"
      { t: 44.58, kind: 'post', endY: 14 },                                        // the band on its own
      { t: 48.70, kind: 'verse', c: 0.95, endY: 12 },                              // "stares through the windows"
      { t: 56.93, kind: 'pre', endY: 26 },                                         // "glitter", "homecoming queen"
      { t: 65.15, kind: 'chorus', start: 'launch', kick: 11, endY: 9 },            // the gym
      { t: 82.98, kind: 'pre', endY: 22 },                                         // "if we make it past the final bell"
      { t: 85.72, kind: 'final', start: 'launch', kick: 10, endY: 10 },            // out the doors: "the six o'clock news"
      { t: 93.95, kind: 'break', endY: 14 },
      { t: 98.05, kind: 'final', start: 'launch', kick: 12, endY: 8 },             // the stadium lights
      { t: 109.02, kind: 'outro', endY: 5 },
    ],
    palette: 'schMorning',
    world: 'school',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 4.0 },   // behind her, the school's front doors ahead
    looks: [
      { t: -99, palette: 'schMorning' },
      { t: 1.2, palette: 'schHall', fade: 0.4 },            // in through the doors
      { t: 31.6, palette: 'schAlarm', fade: 0.25 },         // "she's the siren blaring down the hall"
      { t: 36.8, palette: 'schHall', fade: 1.2 },
      { t: 44.6, palette: 'schClass', fade: 0.6 },          // the classroom, the afternoon in its windows
      { t: 51.6, palette: 'schPolice', fade: 1.0 },         // "stares through the windows"
      { t: 56.9, palette: 'schHall', fade: 0.6 },
      { t: 60.2, palette: 'schGym', fade: 0.6 },            // homecoming
      { t: 70.8, palette: 'schGymAlarm', fade: 0.25 },      // the siren again
      { t: 75.1, palette: 'schGym', fade: 1.2 },
      { t: 85.7, palette: 'schDusk', fade: 0.3 },           // out the doors at six
      { t: 93.6, palette: 'schDark', fade: 0.4 },           // the band stops
      { t: 98.05, palette: 'schStadium', fade: 0.15 },      // the stadium lights
    ],
    moments: [
      { t: 25.40, kind: 'knock', k: 0.4, n: 1 },            // three lockers slamming: "like a / bomb / threat"
      { t: 25.74, kind: 'knock', k: 0.45, n: 1 },
      { t: 26.07, kind: 'knock', k: 0.5, n: 1 },
      { t: 59.9, kind: 'flash', k: 0.3 },                   // "glitter"
      { t: 85.03, kind: 'ring', k: 0.4, dur: 0.6 },         // the final bell
      { t: 93.6, kind: 'blackout', dur: 4.4, k: 0.7 },      // the band stops, the lot goes dark
      { t: 98.05, kind: 'flash', k: 0.8 },                  // the stadium lights
    ],
    confetti: [[59.7, 61.4]],                               // "exploding into glitter"
    confettiColors: [0xff3d8b, 0xffd23a, 0xffffff, 0xb070ff, 0x5ff2ff, 0xffb8d8],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'SCHHOME', text: 'HOMECOMING', color: '#ffd23a', core: '#fff4c0', bg: '#2a1a6a', size: 96 },
      ],
      rooms: [
        { style: 'hall', from: 1.2, to: 10.32, caps: [{ kind: 'front', hw: 13, hh: 26 }, SDOOR] },     // in at the front doors
        { style: 'hall', from: 10.32, to: 26.75, caps: [null, SDOOR] },                                 // "left a love note in my locker"
        { style: 'hall', from: 26.75, to: 37.72, caps: [null, SDOOR] },                                 // "the siren blaring down the hall"
        { style: 'hall', from: 37.72, to: 44.58, caps: [null, SDOOR] },
        { style: 'class', from: 44.58, to: 56.93, caps: [null, SDOOR] },                                // "stares through the windows"
        { style: 'hall', from: 56.93, to: 60.2, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },       // the wanted poster
        { style: 'gym', from: 60.2, to: 76.12, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },        // homecoming
        { style: 'gym', from: 76.12, to: 85.72, caps: [null, { kind: 'wall', hw: 16, hh: 30 }] },
      ],
      roomEvents: { alarm: [[31.6, 36.7, 0.15, 0.6], [70.8, 75.0, 0.15, 0.6]], police: [51.5, 57.0, 1.0, 0.6], stadium: [98.0, 999, 0.05, 0.4] },
      zones: [
        // in at the doors, through the metal detector
        { from: 1.9, to: 2.0, kits: ['detector'], at: 1.9 },
        // "blood red lip", the note in the locker, "signed it with a sticker"
        { from: 9.7, to: 19.4, kits: ['decals'], at: [[9.7, -29.6, 'kiss', 12, 1.2], [19.3, 29.6, 'sticker', 13, 1.3]] },
        { from: 12.9, to: 13.0, kits: ['openLocker'], at: 12.9, x: 26.4, s: 1.25 },
        // the clock at noon
        { from: 24.9, to: 25.0, kits: ['clock'], at: 24.9, lift: 13, s: 0.85 },
        // three lockers slamming, on the wall ahead
        { from: 26.7, to: 26.73, kits: ['slams'], face: true, sx: 0.77, open: 1.1, at: [[26.72, 15.69, 25.40], [26.72, -23.08, 25.74], [26.72, -16.6, 26.07]] },
        // the siren down the hall
        { from: 28.5, to: 40.0, kits: ['beacons'], every: 0.55, x: 29.2, y: 25 },
        { from: 27.4, to: 44.0, kits: ['pennants'], every: 1.6, lift: 18 },
        // the classroom
        { from: 44.9, to: 56.7, kits: ['desks'], every: 0.3 },
        // the wanted poster, on the wall by the gym doors
        { from: 60.1, to: 60.2, kits: ['corkboard'], at: 60.17, x: -23, y: 15, s: 1.0, face: true, bare: true, wanted: true },
        // homecoming: the banner, the crown over the court, the stands, balloons, pennants
        { from: 61.4, to: 61.5, kits: ['banner'], at: 61.4, sign: 'SCHHOME', lift: 17 },
        { from: 63.4, to: 63.5, kits: ['crown'], at: 63.4, lift: 13, s: 1.5 },
        { from: 60.4, to: 75.0, kits: ['bleachers'], x: 36, every: 1.2 },
        { from: 77.3, to: 85.0, kits: ['bleachers'], x: 36, every: 1.2 },
        { from: 60.6, to: 75.8, kits: ['balloons'], every: 0.8, x: 27 },
        { from: 76.5, to: 85.2, kits: ['balloons'], every: 0.8, x: 27 },
        { from: 64.0, to: 84.0, kits: ['pennants'], every: 2.0, lift: 20, s: 1.6 },
        { from: 68.0, to: 78.0, kits: ['beacons'], every: 0.8, x: 61, y: 30, s: 2.2 },
        // the final bell, over the doors out
        { from: 85.66, to: 85.67, kits: ['schoolBell'], at: 85.66, x: 0, ring: 85.03, y: 38, s: 1.6 },
        // outside: the lot at six, the vans, the police lights
        { from: 85.8, to: 94.0, kits: ['lot'], lampX: 50, every: 0.5 },
        { from: 86.0, to: 94, kits: ['cruisers'], at: [[86.6, 24, 0.5], [87.1, -27, -0.4], [87.9, 30, -0.7], [88.6, -22, 0.6], [91.2, 26, 0.3], [92.4, -30, -0.5]] },
        { from: 86.0, to: 94, kits: ['newsVans'], at: [[87.4, -40, 0], [88.2, 42, 0], [89.5, -44, 0.1], [90.7, 44, -0.1], [92.0, -42, 0]] },
        // the stadium: the towers, the stands, the field, the posts
        { from: 93.0, to: 112, kits: ['lightTowers'], every: 2.2, x: 64 },
        { from: 98.5, to: 112, kits: ['bleachers'], x: 46, every: 1.2 },
        { from: 99.0, to: 112, kits: ['yardLines'], every: 0.2, w: 96 },
        { from: 107.0, to: 107.1, kits: ['goal'], at: 107.0, s: 1.6 },
      ],
      roads: [
        { x: 0, width: 96, walk: 0, laneLines: 0, from: 85.7, to: 98.0, lanes: [], density: 0, lampEvery: 40, follow: true, dry: true },
      ],
      lyricBg: '#a8a49c', lyricColor: '#8a0c1c', lyricCore: '#8a0c1c', lyricPart: 'spiritBanner', lyricS: 1, lyricWeight: 700,
      lyricFont: '"Segoe Print", "Marker Felt", "Bradley Hand", "Comic Sans MS", cursive',
      lyrics: [
        { t: 32.0, text: "SHE'S THE SIREN\nBLARING DOWN THE HALL", x: 0, h: 14, frame: 'rgba(0,0,0,0)' },
        { t: 82.4, text: 'IF WE MAKE IT PAST\nTHE FINAL BELL', x: 0, h: 16, frame: 'rgba(0,0,0,0)' },
        { t: 89.0, text: "I'M JUST\nHER PLUS ONE", x: 40, side: 1, part: 'letterBoard', s: 1.1, bg: '#a8a8a4', color: '#0c0c10', core: '#0c0c10', font: '"Arial Black", Impact, sans-serif', weight: 900, frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'crown', t: 112.0, x: -22, fireAt: 98.05, orbit: { r: 58, h: 7, y: 12, facing: true, back: 1.3, right: 0.3, swing: 0.25 } },
    },
  },
  {
    // a summer night in a hot apartment: the floor fan, the dishes, the mattress on the
    // carpet. Fireworks in the alley, sirens down the block, thunder like the sky forgot to
    // knock. In the end the walls fall through.
    id: 'your-apartment-smells-like-summer',
    accent: '#ff8a4f',
    title: 'Your Apartment Smells Like Summer',
    startY: 14,
    sections: [
      { t: 0.0, kind: 'intro', endY: 12 },                                       // "I was young enough to love you"
      { t: 10.67, kind: 'verse', c: 0.85, endY: 9 },                             // the band
      { t: 20.81, kind: 'verse', c: 0.8, endY: 10, turn: 0.2 },                  // "your apartment smells like summer"
      { t: 41.12, kind: 'verse', endY: 12, turn: 0.2 },                          // "there's a mattress on the carpet"
      { t: 61.47, kind: 'pre', endY: 16, turn: 0.2 },                            // "and I know, I know, I know"
      { t: 64.01, kind: 'break', endY: 15, turn: 0.2 },                          // "we are not built to stay"
      { t: 67.83, kind: 'pre', endY: 20, turn: 0.2 },                            // "but your hand finds mine"
      { t: 71.66, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9 },   // out her window, into the chorus
      { t: 91.99, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 10 },     // "then I found you"
      { t: 102.15, kind: 'verse', endY: 12 },                                    // "we eat cereal at midnight"
      { t: 111.07, kind: 'post', start: 'launch', launchBeats: 4, kick: 10, endY: 12 },   // "but what for?" and the fireworks
      { t: 125.10, kind: 'pre', endY: 22 },                                      // "but your voice hits me like a car is starting"
      { t: 132.76, kind: 'chorus', c: 1.35 },
      { t: 153.12, kind: 'post', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },    // "then I found you"
      { t: 162.06, kind: 'bridge', endY: 18, turn: 0.25 },                       // "maybe we're not tragic"
      { t: 171.00, kind: 'pre', endY: 24, turn: 0.25 },                          // "maybe I should go now"
      { t: 179.96, kind: 'break', endY: 22, turn: 0.25 },
      { t: 182.56, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 8, turn: 0.3 },   // through her door, the last chorus
      { t: 211.94, kind: 'outro', endY: 6, turn: 0.3 },
    ],
    palette: 'summernight2',
    world: 'summer',
    looks: [
      { t: -99, palette: 'summernight2' },
      { t: 20.5, palette: 'apartment', fade: 0.3 },        // "your apartment smells like summer"
      { t: 71.5, palette: 'rooftops', fade: 0.6 },         // out the window
      { t: 102.0, palette: 'summernight2', fade: 5 },      // "we eat cereal at midnight"
      { t: 118.6, palette: 'storm', fade: 9 },             // "like the sky forgot to knock"
      { t: 161.8, palette: 'hallway', fade: 0.3 },         // "maybe all our magic is a busted hallway light"
      { t: 182.5, palette: 'apartment', fade: 0.4 },       // her door
      { t: 200.5, palette: 'afterstorm', fade: 2.5 },      // "love me while the walls fall through"
    ],
    moments: [
      { t: 20.52, kind: 'flash', k: 0.7 },
      { t: 112.4, kind: 'fireworks', n: 10, x: 34, y: 38, gap: 170, ahead: 4.2 },   // "there are fireworks in the alley"
      { t: 116.3, kind: 'thunder', k: 0.8 },                              // "you keep laughing at the thunder"
      { t: 119.2, kind: 'thunder', k: 1.0 },                              // "like the sky forgot to knock"
      { t: 134.0, kind: 'thunder', k: 0.7 },
      { t: 141.9, kind: 'thunder', k: 0.9 },
      { t: 149.3, kind: 'thunder', k: 0.8 },
      { t: 161.82, kind: 'flash', k: 0.55 },
      { t: 200.55, kind: 'flash', k: 0.3 },
    ],
    scenery: {
      signs: [
        { key: 'OPEN24', text: 'OPEN\n24 HRS', color: '#ff4f6a', core: '#ffe8ec', bg: '#140810', size: 92 },
        { key: 'MIDNIGHT', text: '12:00', color: '#5ff2ff', core: '#eaffff', bg: '#06101a', size: 150 },
      ],
      rooms: [
        // room to room through her place, a doorway on the downbeat
        { style: 'living', from: 20.55, to: 25.89, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'kitchen', from: 25.89, to: 30.97, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 30.97, to: 36.03, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 36.03, to: 41.12, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'bedroom', from: 41.12, to: 51.29, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'bedroom', from: 51.29, to: 61.47, showFrom: 20.5, caps: [null, DOOR] },
        { style: 'living', from: 61.47, to: 71.66, showFrom: 20.5, caps: [null, { kind: 'wall', hw: 12.5, hh: 27, sill: 2.5 }] },
        { style: 'hallway', from: 161.85, to: 182.56, showFrom: 161.8, caps: [null, { kind: 'wall', hw: 9.8, hh: 27 }] },
        { style: 'living', from: 182.56, to: 187.64, showFrom: 161.8, caps: [null, DOOR] },
        { style: 'bedroom', from: 187.64, to: 193.98, showFrom: 161.8, caps: [null, DOOR] },
        { style: 'kitchen', from: 193.98, to: 240, showFrom: 161.8, fallAt: 200.58 },
      ],
      roomEvents: { war: 45.4, fight: 53.6, bust: 169.3 },
      zones: [
        { from: -4, to: 20.5, kits: ['tenements'], lines: 1.15, gaps: true },
        // her apartment: "the floor fan shakes the room", "a tower of dirty dishes", "a dead plant still in bloom"
        { from: 24.2, to: 24.3, kits: ['floorFan'], at: 24.2, x: -21, ahead: 3.65 },
        { from: 28.4, to: 28.5, kits: ['dishes'], at: 28.4, x: 22, ahead: 7.85 },
        { from: 30.2, to: 30.3, kits: ['plant'], at: 30.2, x: -19, s: 1.1, ahead: 9.65 },
        { from: 38.6, to: 38.7, kits: ['floorFan'], at: 38.6, x: 22, face: 2.6, ahead: 18.05 },
        // "a mattress on the carpet", "a photograph of someone you don't talk about at all"
        { from: 43.6, to: 43.7, kits: ['mattress'], at: 43.6, x: 21, ahead: 23.05 },
        { from: 48.4, to: 48.5, kits: ['photoBack'], at: 48.4, x: 37.3, y: 13, ahead: 27.85 },
        { from: 58.6, to: 58.7, kits: ['plant'], at: 58.6, x: 20, s: 0.9, rot: 2.2, ahead: 38.05 },
        { from: 66.4, to: 66.5, kits: ['floorFan'], at: 66.4, x: -20, face: 3.6, ahead: 45.85 },
        // out the window and down the block, the low roofs in the chorus
        { from: 71.7, to: 102.0, kits: ['tenements'], low: true, lines: 1.6, gaps: true },
        { from: 102.0, to: 161.8, kits: ['tenements'], lines: 1.3, gaps: true },
        // through her door again: the fan, the mattress, the plant, the dishes; then no walls
        { from: 186.4, to: 186.5, kits: ['floorFan'], at: 186.4, x: -21, ahead: 24.55 },
        { from: 191.0, to: 191.1, kits: ['mattress'], at: 191.0, x: 21, ahead: 29.15 },
        { from: 195.4, to: 195.5, kits: ['plant'], at: 195.4, x: -19, s: 1.1, ahead: 33.55 },
        { from: 198.8, to: 198.9, kits: ['dishes'], at: 198.8, x: 20, ahead: 36.95 },
        { from: 205.0, to: 205.1, kits: ['floorFan'], at: 205.0, x: 22, face: 2.8, ahead: 43.15 },
        { from: 210.4, to: 210.5, kits: ['mattress'], at: 210.4, x: -22, rot: -0.12, ahead: 48.55 },
        { from: 196.0, to: 236.0, kits: ['farcity'], x: 86 },
      ],
      lyricBg: '#160a14', lyricColor: '#ffb070', lyricCore: '#fff0e0', lyricX: 21,
      lyrics: [
        { t: 0.4, text: 'YOUNG ENOUGH\nTO LOVE YOU', lead: 2.4, side: 1 },
        { t: 5.0, text: 'BORED ENOUGH\nTO TRY', side: -1 },
        { t: 77.96, text: 'KISS ME LIKE\nTHE RENT IS DUE', side: 1 },
        { t: 80.42, text: 'EVERY GODDAMN\nSONG IS TRUE', side: -1 },
        { t: 90.72, text: 'I WAS\nALMOST FINE', side: 1 },
        { t: 102.46, text: 'CEREAL\nAT MIDNIGHT', side: -1 },
        { t: 119.96, text: 'LIKE THE SKY\nFORGOT TO KNOCK', side: 1 },
        { t: 155.08, text: 'THEN I\nFOUND YOU', side: -1 },
      ],
      finale: { kind: 'lamp', t: 218.4, x: -17, fireAt: 200.6, orbit: { r: 36, h: 5, y: 14, facing: true, back: 1.6, right: 0.3, swing: 0.3 } },
      vehicles: [
      // "there are sirens down the block": two of them, coming the other way
      { kind: 'police', lead: [[114.2, 4.2], [117.4, -2.2]], x: -1, lane: 2.4, reverse: true, from: 114.1, to: 118.0 },
      { kind: 'police', lead: [[114.9, 4.8], [118.3, -2.2]], x: -1, lane: 3.4, reverse: true, from: 114.8, to: 118.9 },
      // "your voice hits me like a car is starting"
      { kind: 'sedan', paint: 0x2a3a5a, at: 128.7, rate: 0, x: 1, lane: 2.4, reverse: true, yaw: 0.12, lightsOn: 127.8, from: 122.0, to: 129.5 },
      ],
    },
  },
  {
    // the night going wrong. The queue outside, the club, the drink on the bar; the room losing
    // focus, the back corridors, lost time; then the house lights, and the morning outside.
    id: 'spiked',
    accent: '#8a6aff',
    title: 'Spiked',
    startY: 8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 8 },                                          // "yeah, take it / lose it all"
      { t: 9.47, kind: 'pre', endY: 14 },                                          // up to the door
      { t: 14.86, kind: 'verse', start: 'launch', kick: 8, endY: 12 },             // in: "spot you across the room"
      { t: 29.20, kind: 'break', endY: 20 },                                       // the band drops out
      { t: 30.99, kind: 'pre', start: 'launch', kick: 6, endY: 24 },               // "lips say stop"
      { t: 38.14, kind: 'chorus', start: 'launch', kick: 10, endY: 10 },
      { t: 52.43, kind: 'post', endY: 16 },                                        // "lose control"
      { t: 66.72, kind: 'verse', start: 'launch', kick: 8, endY: 8 },              // the back corridors
      { t: 95.17, kind: 'chorus', start: 'launch', kick: 10, endY: 12 },
      { t: 109.37, kind: 'final', c: 1.2, endY: 26 },                              // "lose it all for me"
      { t: 118.23, kind: 'break', endY: 26 },                                      // nothing
      { t: 120.00, kind: 'post', start: 'launch', kick: 5, endY: 18 },
      { t: 127.07, kind: 'final', start: 'launch', kick: 12, endY: 8 },            // the house lights come up
      { t: 134.13, kind: 'outro', endY: 4 },                                       // the morning
    ],
    palette: 'spkStreet',
    world: 'club',
    titleView: { ahead: -0.15, x: 1.2, h: 2.2, back: -0.55, lookH: 1.0 },   // behind her, the queue, the club up the street
    looks: [
      { t: -99, palette: 'spkStreet' },
      { t: 14.9, palette: 'spkClub', fade: 0.3 },        // in through the door
      { t: 27.4, palette: 'spkBlur', fade: 1.6 },        // "now your world's blurry"
      { t: 38.2, palette: 'spkChorus', fade: 0.6 },
      { t: 52.5, palette: 'spkRed', fade: 2.5 },         // "lose control"
      { t: 66.8, palette: 'spkHall', fade: 0.6 },        // the back corridors
      { t: 81.0, palette: 'spkWash', fade: 0.4 },
      { t: 88.1, palette: 'spkHall', fade: 0.4 },
      { t: 95.2, palette: 'spkWrong', fade: 0.6 },
      { t: 109.4, palette: 'spkVoid', fade: 2.0 },       // "lose it all for me"
      { t: 120.0, palette: 'spkDark', fade: 0.3 },
      { t: 127.1, palette: 'spkHouse', fade: 0.15 },     // the house lights
      { t: 134.2, palette: 'spkMorning', fade: 1.2 },    // outside, the morning
    ],
    moments: [
      { t: 29.2, kind: 'blackout', dur: 1.75, k: 0.8 },  // the band drops out
      { t: 118.23, kind: 'blackout', dur: 1.8, k: 0.97 }, // lost time
      { t: 127.07, kind: 'flash', k: 0.7 },              // the house lights
    ],
    scenery: {
      signs: [
        { key: 'SPKMARQ', text: 'LOSE IT ALL', color: '#ffd8a0', core: '#fffaf0', bg: '#0a0610', size: 96 },
        { key: 'EXITL', text: '\u25C0 EXIT', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
        { key: 'EXITR', text: 'EXIT \u25B6', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 100 },
      ],
      rooms: [
        { style: 'club', from: 14.86, to: 52.43, caps: [{ kind: 'front', hw: 13, hh: 28 }, { kind: 'wall', hw: 14, hh: 28 }] },   // "spot you across the room"
        { style: 'redroom', from: 52.43, to: 66.72, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                              // "lose control"
        { style: 'hall', from: 66.72, to: 80.95, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },                                 // the back corridors
        { style: 'wash', from: 80.95, to: 88.07, caps: [null, { kind: 'wall', hw: 9, hh: 20 }] },
        { style: 'hall', from: 88.07, to: 95.17, caps: [null, { kind: 'wall', hw: 12, hh: 22 }] },
        { style: 'club', from: 95.17, to: 134.13, caps: [null, { kind: 'wall', hw: 11, hh: 24 }] },                               // the main room again, wrong; then the lights
      ],
      roomEvents: { lasers: [[38.1, 52.4], [95.2, 109.4]], void: [109.4, 118.3, 1.6, 0.2], red: [120.0, 127.07, 0.25, 0.05], house: [127.07, 999, 0.05, 0.4] },
      zones: [
        // the street, the queue roped off up to the door, the marquee, the neon glass
        { from: -4, to: 14.8, kits: ['clubstreet'] },
        { from: -2, to: 14.7, kits: ['ropes'], x: 10.5, every: 0.16, s: 2.4 },
        { from: 14.75, to: 14.76, kits: ['marquee'], at: 14.75, sign: 'SPKMARQ', y: 36 },
        { from: 14.8, to: 14.81, kits: ['neonGlass'], at: 14.8, x: -34, y: 18, s: 1.6 },
        // the main room: the speakers, the mirror ball, the bar and the drink on it
        { from: 14.9, to: 52.4, kits: ['speakers'], x: 50, every: 1.6 },
        { from: 19.9, to: 20.0, kits: ['mirrorBall'], at: [19.9], lift: 16 },
        { from: 22.6, to: 25.3, kits: ['clubBar'], at: 22.6, x: 44 },
        { from: 23.9, to: 24.0, kits: ['clubBar'], at: 23.9, x: 44 },
        { from: 25.2, to: 25.3, kits: ['clubBar'], at: 25.2, x: 44 },
        { from: 25.4, to: 25.5, kits: ['drink'], at: 25.4, x: 42, y: 12.85, s: 1.3 },
        { from: 36.0, to: 52.4, kits: ['lasers'], every: 1.1, x: 30, y: 38 },
        { from: 44.6, to: 44.7, kits: ['mirrorBall'], at: [44.6], lift: 16 },
        // the red room
        { from: 52.5, to: 66.6, kits: ['booths'], x: 30, every: 1.4 },
        // the corridors: an exit sign every way you look
        { from: 66.8, to: 95.1, kits: ['exits'], at: [[69.4, -11, 16, 'EXITR'], [72.8, 11, 16, 'EXITL'], [76.2, -11, 16, 'EXITL'], [79.6, 11, 16, 'EXITR'], [89.4, -11, 16, 'EXITR'], [92.2, 11, 16, 'EXITL']] },
        { from: 81.0, to: 88.0, kits: ['sinks'], at: [[82.7, 24], [84.3, -24], [85.9, 24], [87.2, -24]] },
        // the main room, wrong
        { from: 95.2, to: 109.3, kits: ['speakers'], x: 50, every: 1.6 },
        { from: 95.0, to: 109.4, kits: ['lasers'], every: 1.1, x: 30, y: 38, cols: [0x3aff8a, 0xd040ff] },
        { from: 99.0, to: 99.1, kits: ['mirrorBall'], at: [99.0], lift: 16 },
        // the house lights: what's left
        { from: 127.0, to: 134.0, kits: ['mess'], every: 0.35 },
        { from: 127.0, to: 134.0, kits: ['speakers'], x: 50, every: 1.6 },
        // outside: the morning
        { from: 134.2, to: 150, kits: ['clubstreet'], dim: 0.15, wake0: 0.05 },
      ],
      roads: [
        { x: 0, width: 16, walk: 4, laneLines: 1, from: -10, to: 14.9, lanes: [-4, 4], density: 0.3, lampEvery: 34, follow: true },
        { x: 0, width: 16, walk: 4, laneLines: 1, from: 134.1, to: 160, lanes: [-4, 4], density: 0.06, lampEvery: 34, follow: true, dry: true },
      ],
      lyricBg: '#0a0612', lyricColor: '#ff5fd8', lyricCore: '#ffe0f6', lyricPart: 'neonSign', lyricFloor: true,
      lyrics: [
        { t: 26.2, text: "NOW YOUR\nWORLD'S BLURRY", side: -1, x: 32, h: 20 },
        { t: 92.0, text: 'IN THE\nMORNING', side: 1, x: 14, h: 14, s: 0.8 },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'busstop', t: 138.0, x: 17, fireAt: 134.2, orbit: { r: 30, h: 3.5, y: 5, facing: true, back: 1.4, right: 0.3, swing: 0.25 } },
    },
  },
  {
    // August 1st, drenched in heat, up the hill he used to love. Arrows on the trees, a
    // church that isn't one, a rock that gets the leg, the top at last, and the sidewalk home.
    id: 'you-are-here',
    accent: '#ffb347',
    title: 'You Are Here',
    startY: 4.8,
    sections: [
      { t: 0.0, kind: 'intro', endY: 4.4 },                                     // "you are here"
      { t: 15.86, kind: 'verse', endY: 9 },                                     // the trail
      { t: 36.20, kind: 'pre', endY: 20 },                                      // "this time I have no excuses"
      { t: 52.75, kind: 'pre', endY: 28, c: 0.95 },                             // "I've spent so long waiting"
      { t: 69.16, kind: 'chorus', endY: 22 },                                   // "I tried to hide instead of the goodbye"
      { t: 85.39, kind: 'break', rb: 4, endY: 28 },                             // "that building is a church"
      { t: 98.09, kind: 'verse', endY: 30 },                                    // "the first time I met him"
      { t: 114.42, kind: 'pre', start: 'launch', launchBeats: 4, kick: 9, endY: 38 },     // the stop: "a full-time job"
      { t: 132.45, kind: 'chorus', endY: 32 },
      { t: 146.86, kind: 'post', endY: 36 },                                    // "he would come here alone"
      { t: 159.43, kind: 'break', rb: 4, endY: 38 },
      { t: 164.80, kind: 'bridge', endY: 44 },                                  // "walking to the trails makes me think of him"
      { t: 177.37, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, c: 1.2, endY: 36 },   // "I will think less, I will feel more"
      { t: 209.67, kind: 'break', rb: 4, endY: 32 },                            // "it's while I was literally saying I knew the way"
      { t: 211.49, kind: 'break', start: 'launch', launchBeats: 4, kick: 5, rb: 4, endY: 30 },     // "that my leg hit the rock"
      { t: 218.73, kind: 'verse', c: 0.95, endY: 40 },                          // "well, I know the way back now"
      { t: 242.36, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 40 },   // "I swear it's not just a lack of blood"
      { t: 247.73, kind: 'chorus', endY: 36 },
      { t: 260.27, kind: 'break', rb: 4, endY: 44 },                            // "I hope it's still out of the woods"
      { t: 273.03, kind: 'pre', endY: 54, c: 0.8 },                             // "isn't it funny that I'd reach the top"
      { t: 278.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 14 },  // the top: "he used to love this place"
      { t: 291.20, kind: 'bridge', endY: 8 },                                   // "if I could ever get a message back"
      { t: 304.01, kind: 'outro', endY: 4 },                                    // "I'm on the sidewalk, getting close to home"
    ],
    palette: 'august',
    world: 'trail',
    skyline: 'hills',
    groundStyle: 'country',
    camLift: 0.35,
    ribbonWidth: 0.72,
    looks: [
      { t: -99, palette: 'august' },
      { t: 29.6, palette: 'thunder', fade: 1.6 },           // "it was raining, and there was thunder"
      { t: 37.5, palette: 'august', fade: 3 },
      { t: 132.4, palette: 'golden', fade: 18 },
      { t: 160, palette: 'ridge', fade: 4 },                // out of the trees
      { t: 179.2, palette: 'golden', fade: 3 },
      { t: 222, palette: 'sunset', fade: 14 },
      { t: 262, palette: 'sunsetopen', fade: 5 },
      { t: 278.5, palette: 'summit', fade: 3 },             // the top
      { t: 293, palette: 'bluehour', fade: 10 },
      { t: 306, palette: 'evening', fade: 5 },              // the sidewalk
    ],
    moments: [
      { t: 31.7, kind: 'thunder', k: 0.8 },
      { t: 33.4, kind: 'thunder', k: 1 },
      { t: 214.46, kind: 'thud', k: 1 },                    // "that my leg hit the rock"
    ],
    scenery: {
      flat: [[-12, 13, 0], [299, 340, 0]],
      lyricPart: 'trailsign', lyricX: 8.2, lyricS: 1.35,
      signs: [
        { key: 'PRIVATE', text: 'PRIVATE\nPROPERTY', color: '#fff4e6', core: '#ffffff', bg: '#7a1c18', size: 70 },
      ],
      zones: [
        { from: -4, to: 15.9, kits: ['trailhead'] },
        { from: 12, to: 85.4, kits: ['woods'] },
        { from: 85.4, to: 98, kits: ['woods'], arrows: false, density: 0.75 },
        { from: 85.4, to: 97.6, kits: ['church'], at: 91.0, x: -27, clear: 30 },
        { from: 98, to: 132.4, kits: ['woods'] },
        { from: 132.4, to: 160, kits: ['woods'], density: 0.55, firs: 0.5 },
        { from: 155.6, to: 155.7, kits: ['bench'], at: 155.6, x: 8.6, clear: 9 },  // "he would rest where it was peaceful"
        { from: 160, to: 179, kits: ['ridge'], density: 0.8 },
        { from: 179, to: 209.6, kits: ['woods'], density: 0.9 },
        { from: 209.6, to: 222, kits: ['woods'], density: 0.6, arrows: false },
        { from: 214.3, to: 214.4, kits: ['therock'], at: 214.3, x: 4.4, clear: 10 },
        { from: 222, to: 262, kits: ['woods'], density: 0.85, firs: 0.55 },
        { from: 262, to: 281, kits: ['ridge'], density: 0.35, rocky: true },
        { from: 278.3, to: 278.4, kits: ['summit'], at: 278.3 },
        { from: 281, to: 300, kits: ['ridge'], density: 0.9 },
        { from: 299, to: 330, kits: ['suburb'], lampX: 8.5 },
      ],
      roads: [
        { x: 0, width: 10, walk: 3, laneLines: 0, from: 299, to: 340, traffic: false, lampEvery: 18, dry: true },
      ],
      lyrics: [
        { t: -1.6, text: 'YOU ARE HERE', side: -1, lead: 0, x: 9.6, s: 1.7 },
        { t: 47.2, text: 'IF I MAKE IT TO\nTHE TOP TODAY', side: -1 },
        { t: 80.0, text: 'THE WRONG WAY IS\nOUT OF THE WOODS', side: 1 },
        { t: 193.4, text: 'I WILL THINK LESS\nI WILL FEEL MORE', side: -1 },
        { t: 219.4, text: 'I KNOW THE\nWAY BACK NOW', side: 1 },
        { t: 280.3, text: 'HE USED TO\nLOVE THIS PLACE', side: -1, lead: 1.0 },
        { t: 283.9, text: 'NO, HE LOVES\nTHIS PLACE', side: 1, lead: 1.0 },
        { t: 305.7, text: 'GETTING CLOSE\nTO HOME', side: -1 },
      ],
      finale: { kind: 'home', t: 316.6, x: -20, fireAt: 304.0, orbit: { r: 22, h: 3.5, y: 3.2, facing: true, back: 1.4, right: 0.3 } },
    },
  },
  {
    // dusk on the street with the hearse at the curb; in through the funeral home's front door,
    // the casket open and full of lilies, the bar open beside it. Out the back into the
    // cemetery for every chorus; the eulogy, the prep room, the guest book; the cemetery chapel
    // at 3 a.m.; dawn over the graves; and the same chapel in white for the wedding.
    id: 'makeup-sex-at-your-funeral',
    accent: '#ff2a48',
    title: 'Makeup Sex at Your Funeral',
    startY: 12,
    sections: [
      { t: 0.0, kind: 'intro', endY: 10 },                                        // "wore your brother's suit"
      { t: 11.56, kind: 'verse', c: 0.8, endY: 12 },                              // "your mother's Xanax"
      { t: 22.00, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 12 },   // "open casket, open bar": in the front door
      { t: 31.13, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 14 },   // the band's back: "b-b-best selfie"
      { t: 42.85, kind: 'pre', endY: 30 },                                        // "everyone's crying while I'm applying more mascara"
      { t: 54.58, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, endY: 10 }, // out the back into the cemetery
      { t: 78.05, kind: 'break', endY: 12 },
      { t: 80.65, kind: 'verse', start: 'launch', launchBeats: 4, kick: 7, endY: 12 },   // "gave the eulogy"
      { t: 92.38, kind: 'verse', c: 1.0, endY: 14 },                              // "mom caught us in the prep room"
      { t: 102.82, kind: 'pre', endY: 32 },                                       // "signed the guest book"
      { t: 114.55, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 11, endY: 10 }, // out the front: the procession
      { t: 138.05, kind: 'post', endY: 16 },
      { t: 147.19, kind: 'bridge', endY: 18 },                                    // "found me in your casket at 3 a.m."
      { t: 158.93, kind: 'pre', endY: 36 },
      { t: 166.78, kind: 'final', start: 'launch', launchBeats: 4, kick: 12, endY: 10 },  // out into the dawn
      { t: 190.32, kind: 'final', c: 1.3, endY: 12 },
      { t: 199.47, kind: 'outro', start: 'launch', launchBeats: 4, kick: 6, endY: 5 },    // "wore your ashes in a locket to my wedding"
    ],
    palette: 'fhdusk',
    world: 'funeral',
    collect: 'lily',
    titleView: { ahead: -0.17, x: 1.0, h: 2.6, back: -0.8, lookH: 2.4 },   // behind her: the hearse at the curb ahead
    looks: [
      { t: -99, palette: 'fhdusk' },
      { t: 22.0, palette: 'fhwake', fade: 0.4 },          // in the front door
      { t: 31.1, palette: 'fhparlor', fade: 0.6 },
      { t: 54.6, palette: 'fhgraves', fade: 0.5 },        // out the back into the cemetery
      { t: 80.7, palette: 'fhwake', fade: 0.4 },          // back in for the eulogy
      { t: 92.4, palette: 'fhprep', fade: 0.3 },          // "mom caught us in the prep room"
      { t: 97.6, palette: 'fhparlor', fade: 0.4 },
      { t: 114.6, palette: 'fhgraves', fade: 0.5 },       // the procession
      { t: 147.2, palette: 'fh3am', fade: 0.5 },          // "found me in your casket at 3 a.m."
      { t: 166.8, palette: 'fhdawn', fade: 1.2 },         // out into the dawn
      { t: 190.3, palette: 'fhsunrise', fade: 9 },
      { t: 199.5, palette: 'fhwedding', fade: 0.5 },      // the same chapel, in white
    ],
    moments: [
      { t: 33.3, kind: 'shutter', k: 0.75 },              // "selfie with your body"
      { t: 98.0, kind: 'knock', n: 1, k: 0.8 },           // "closed the door"
      { t: 148.0, kind: 'flash', k: 0.22 },               // the torch finds her
      { t: 199.6, kind: 'bell', k: 0.8, degree: 0 },
      { t: 202.2, kind: 'bell', k: 0.65, degree: 2 },
      { t: 204.8, kind: 'bell', k: 0.55, degree: 0 },
    ],
    confetti: [[199.6, 236]],                              // petals in the white chapel
    confettiColors: [0xf04a6a, 0xff8aa4, 0xd8203a, 0xffb8c8, 0xc8102e, 0xff6a88],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'FHBOARD', text: 'OPEN CASKET\nOPEN BAR', color: '#141014', core: '#141014', bg: '#f4f0ea', size: 70 },
        { key: 'HEAVEN', text: 'HEAVEN', color: '#1a1a1e', core: '#1a1a1e', bg: '#ffffff', size: 92 },
        { key: 'LIKES', text: '\u2665 3,000', color: '#ff2a4a', core: '#ff2a4a', bg: '#ffffff', size: 104 },
        { key: 'BELOVED', text: 'BELOVED', color: '#26262c', core: '#34343a', bg: '#8a868e', size: 84 },
      ],
      rooms: [
        { style: 'chapel', from: 22.00, to: 31.13, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },     // "open casket, open bar"
        { style: 'parlor', from: 31.13, to: 36.34, caps: [null, FHDOOR] },                                  // "best selfie with your body"
        { style: 'foyer', from: 36.34, to: 42.85, caps: [null, FHDOOR] },                                   // "three thousand likes"
        { style: 'hall', from: 42.85, to: 48.07, caps: [null, FHDOOR] },                                    // "make out with pallbearers"
        { style: 'parlor', from: 48.07, to: 54.58, caps: [null, { kind: 'wall', hw: 11.5, hh: 24 }] },      // "everyone's crying"; out the back
        { style: 'chapel', from: 80.65, to: 92.38, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },     // "gave the eulogy"
        { style: 'prep', from: 92.38, to: 97.60, caps: [null, { kind: 'wall', hw: 9, hh: 21 }] },            // "mom caught us in the prep room"
        { style: 'hall', from: 97.60, to: 102.82, caps: [null, FHDOOR] },                                   // "some girls aren't stable"
        { style: 'foyer', from: 102.82, to: 114.55, caps: [null, { kind: 'wall', hw: 12, hh: 28 }] },       // the guest book, the bouquet
        { style: 'night', from: 147.19, to: 158.93, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, FHDOOR] },    // 3 a.m.
        { style: 'night', from: 158.93, to: 166.78, caps: [null, { kind: 'wall', hw: 12, hh: 26 }] },
        { style: 'wedding', from: 199.47, to: 240, caps: [{ kind: 'front', hw: 11.5, hh: 26 }, null] },       // the wedding
      ],
      roomEvents: { torch: [147.4, 158.9] },
      zones: [
        // the street at dusk, the procession's cars at the curb, the letter board out front
        { from: -4, to: 21.6, kits: ['fhstreet'] },
        { from: 19.4, to: 19.5, kits: ['letterboard'], at: 19.4, x: 17, sign: 'FHBOARD', s: 1.7 },
        // the viewing: the casket open and full of lilies, the bar open by it, her lipstick
        { from: 22.4, to: 30.9, kits: ['pews'], every: 0.26, clear: [[22.5, 24.6, 1], [24.0, 25.9, -1], [25.8, 27.2, 1], [28.2, 30.0, 1]] },
        { from: 22.0, to: 31.0, kits: ['wreaths'], every: 0.9, x: 37 },
        { from: 23.5, to: 23.6, kits: ['casket'], at: 23.5, x: 24 },
        { from: 23.5, to: 23.6, kits: ['candles'], at: [22.9, 24.1], x: 15, sides: [1] },
        { from: 24.9, to: 25.0, kits: ['bar'], at: 24.9, x: -24 },
        { from: 29.1, to: 29.2, kits: ['lipstick'], at: 29.1, x: 24 },
        // the parlours: the pin dropped on heaven, the likes, the tissues and the mascara
        { from: 37.4, to: 37.5, kits: ['pin'], at: 37.4, sign: 'HEAVEN', lift: 6 },
        { from: 40.3, to: 40.4, kits: ['likes'], at: 40.3, x: 22, sign: 'LIKES' },
        { from: 49.6, to: 51.7, kits: ['tissues'], at: [[49.7, 23], [50.4, -24], [51.1, 24]], s: 2.4 },
        { from: 52.1, to: 52.2, kits: ['mascara'], at: 52.1, x: -21, s: 2.0 },
        // out the back: the cemetery, its gate on the slam, the name, the grave
        { from: 54.6, to: 80.6, kits: ['graves'], fence: true, clear: [[57.7, 59.3], [71.3, 72.7, 1], [73.9, 75.5, -1]] },
        { from: 58.5, to: 58.6, kits: ['fhgate'], at: 58.5 },
        { from: 72.0, to: 72.1, kits: ['bigStone'], at: 72.0, x: 22, sign: 'BELOVED' },
        { from: 74.7, to: 74.8, kits: ['grave'], at: 74.7, x: -22, s: 2.6 },
        // back in for the eulogy; the prep room; the guest book, the bouquet in the air
        { from: 80.9, to: 92.2, kits: ['pews'], every: 0.26, clear: [[82.4, 84.2, -1]] },
        { from: 80.7, to: 92.3, kits: ['wreaths'], every: 0.9, x: 37 },
        { from: 83.3, to: 83.4, kits: ['lectern'], at: 83.3, x: -21, s: 1.4 },
        { from: 94.6, to: 94.7, kits: ['prepTable'], at: 94.6, x: 21 },
        { from: 104.5, to: 104.6, kits: ['guestbook'], at: 104.5, x: 18, s: 1.8 },
        { from: 108.0, to: 108.1, kits: ['bouquet'], at: 108.0, t0: 106.9, t1: 108.0, s: 2.0, arc: 14 },
        // the procession: the gate on the slam, the hearse ahead through the stones
        { from: 114.6, to: 147.0, kits: ['graves'], fence: true, clear: [[116.4, 118.0]] },
        { from: 117.2, to: 117.3, kits: ['fhgate'], at: 117.2 },
        // 3 a.m. in the cemetery chapel: the casket on its stand, the candles
        { from: 147.4, to: 166.6, kits: ['pews'], every: 0.26, clear: [[148.4, 150.5, 1], [153.2, 154.6, -1], [159.8, 166, 1], [159.8, 166, -1]] },
        { from: 149.4, to: 149.5, kits: ['casket'], at: 149.4, x: 24 },
        { from: 149.4, to: 149.5, kits: ['candles'], at: [148.8, 150.0], x: 15, sides: [1], lit: 0.7 },
        { from: 160.0, to: 166.0, kits: ['candles'], at: [160.2, 161.5, 162.8, 164.1, 165.4], x: 22 },
        // dawn over the graves
        { from: 166.8, to: 199.4, kits: ['graves'] },
        // the wedding: white pews, the locket over the aisle, candles to the altar
        { from: 199.8, to: 216.5, kits: ['pews'], every: 0.26, white: true, clear: [[205.0, 205.8], [207.0, 207.8], [209.0, 209.8], [211.0, 211.8], [214.4, 217, -1]] },
        { from: 202.7, to: 202.8, kits: ['locket'], at: 202.7, lift: 4 },
        { from: 205.0, to: 213.0, kits: ['candles'], at: [205.4, 207.4, 209.4, 211.4], x: 22 },
      ],
      roads: [
        { x: 0, width: 12, walk: 3, laneLines: 1, from: -10, to: 21.6, lanes: [-3, 3], density: 0.12, lampEvery: 40, follow: true },
      ],
      vehicles: [
        { kind: 'hearse', at: 1.25, rate: 0, x: 1, lane: 2.0, from: -6, to: 5 },                                                   // at the curb
        { kind: 'hearse', lead: [[114.6, 2.2], [116.0, 0.62], [133.5, 0.6], [137.0, 3.0]], x: 0.001, lane: 99, from: 114.7, to: 137.8 },   // the procession
      ],
      lyricBg: '#f2ece2', lyricColor: '#1a1418', lyricCore: '#1a1418', lyricPart: 'easel', lyricFloor: true, lyricX: 24,
      lyrics: [
        { t: 25.1, text: "I'M\nOVERDRESSED", side: 1, x: 31 },
        { t: 55.8, text: 'MAKEUP SEX AT\nYOUR FUNERAL', side: 1, x: 27, part: 'bigStone', bg: '#8a868e', color: '#1e1e22', core: '#2a2a30', s: 1.5 },
        { t: 73.0, text: 'DIRT UNDER\nMY NAILS', side: 1, x: 24, part: 'bigStone', bg: '#8a868e', color: '#1e1e22', core: '#2a2a30', s: 1.3 },
        { t: 99.6, text: "SOME GIRLS\nAREN'T STABLE", side: 1, x: 15, s: 0.9 },
        { t: 152.6, text: 'DISRESPECTING\nTHE DECEASED', side: -1, x: 30 },
      ],
      shelf: 70, drop: 5,
      finale: { kind: 'wedding', t: 215.6, x: -30, fireAt: 199.5, orbit: { r: 66, h: 6, y: 13, facing: true, back: 1.2, right: 0.3, swing: 0.2 } },
    },
  },
  {
    // she moved into his head back in May: the house he built in there to keep her out,
    // and her portrait hung where his peace of mind used to. Knock, knock. She's never,
    // never, never moving out. Sweet dreams, landlord.
    id: 'rent-free',
    accent: '#c86aff',
    title: 'Rent Free',
    startY: 10,
    collect: 'key',
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                             // "honey, I'm home"
      { t: 5.42, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 9, turn: 0.3 },     // "you can't stop thinking about me"
      { t: 10.70, kind: 'verse', endY: 10, turn: 0.3 },                                     // "I moved into your hippocampus back in May"
      { t: 20.00, kind: 'verse', c: 1.0, endY: 12, turn: 0.3 },                             // "home, my portrait where your peace of mind used to hang"
      { t: 30.62, kind: 'verse', endY: 11, turn: 0.3 },                                     // "every room was mine"
      { t: 41.22, kind: 'pre', endY: 17, turn: 0.3 },                                       // "you can't evict what you invited in"
      { t: 61.13, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, endY: 9, turn: 0.3 },    // "I'm living rent free"
      { t: 86.30, kind: 'post', endY: 11, turn: 0.3 },                                      // "knock, knock, who's there?"
      { t: 88.95, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 11, turn: 0.3 },    // "it's me everywhere"
      { t: 91.60, kind: 'break', start: 'launch', launchBeats: 4, kick: 7, endY: 11, turn: 0.3 },    // "check under the stairs"
      { t: 95.58, kind: 'verse', c: 0.9, endY: 12, turn: 0.3 },                             // "your new girl says you wake up screaming"
      { t: 104.87, kind: 'verse', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.3 },   // "if you're subconscious, darling"
      { t: 118.12, kind: 'break', rb: 8, endY: 14, turn: 0.3 },                             // "I picked the lock before you even drew the blueprint"
      { t: 130.06, kind: 'chorus', endY: 9, turn: 0.3 },                                    // "I made myself eternal"
      { t: 153.93, kind: 'post', endY: 12, turn: 0.3 },                                     // "every flashback"
      { t: 161.89, kind: 'chorus', endY: 10, turn: 0.3 },
      { t: 176.48, kind: 'verse', c: 0.9, endY: 14, turn: 0.3 },                            // "it's crowded in here with all my things"
      { t: 187.09, kind: 'post', endY: 12, turn: 0.3 },                                     // "never truly alone"
      { t: 196.36, kind: 'bridge', endY: 20, turn: 0.3 },                                   // "I'm the hesitation in your breath"
      { t: 217.58, kind: 'final', start: 'launch', launchBeats: 4, kick: 11, turn: 0.3 },  // "I am home"
      { t: 250.74, kind: 'break', rb: 8, endY: 12, turn: 0.3 },                             // "and the sickest part, the beautiful part"
      { t: 254.72, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 8, endY: 10, turn: 0.3 },  // "you still leave the light on"
      { t: 264.01, kind: 'bridge', endY: 12, turn: 0.3 },                                   // "oh, this is nice, I could stay here forever"
      { t: 271.96, kind: 'chorus', endY: 10, turn: 0.3 },                                   // "you never change the locks"
      { t: 293.21, kind: 'final', start: 'launch', launchBeats: 4, kick: 9, endY: 6, turn: 0.3 },   // "sweet dreams, landlord"
      { t: 303.83, kind: 'outro', turn: 0.3 },
    ],
    palette: 'mansion',
    world: 'house',
    titleView: { ahead: -0.14, x: 2.4, h: 1.8, back: -0.55, lookH: 4.0 },   // behind her, the front door ahead
    looks: [
      { t: -99, palette: 'mansion' },
      { t: 109.6, palette: 'attic', fade: 0.3 },             // "attic of your grief"
      { t: 112.2, palette: 'blueprint', fade: 0.3 },         // "you built a house inside your head to kick me out"
      { t: 120.0, palette: 'mansion', fade: 0.6 },
      { t: 141.2, palette: 'moldy', fade: 8 },               // "the mold behind the walls of memory"
      { t: 168.7, palette: 'mansion', fade: 2 },
      { t: 196.4, palette: 'dim', fade: 3 },                 // "I'm the hesitation in your breath"
      { t: 217.5, palette: 'mansion', fade: 0.4 },
      { t: 250.7, palette: 'dim', fade: 1.5 },               // "you still leave the light on"
      { t: 264.0, palette: 'mansion', fade: 3 },
    ],
    moments: [
      { t: 87.3, kind: 'knock', k: 0.55 },                   // "knock, knock, who's there?"
      { t: 90.1, kind: 'knock', k: 0.6 },
      { t: 92.86, kind: 'knock', k: 0.65 },
    ],
    scenery: {
      signs: [
        { key: 'PEACE', text: 'PEACE OF MIND', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 60 },
        { key: 'ESTEEM', text: 'SELF-ESTEEM', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 64 },
        { key: 'JESUS', text: 'JESUS', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'MINE', text: 'MINE', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'HOME', text: 'HOME', color: '#2a1806', core: '#2a1806', bg: '#c8a050', size: 80 },
        { key: 'THREEAM', text: '3:00', color: '#ff2a2a', core: '#ffd8d8', bg: '#0a0404', size: 150 },
      ],
      rooms: [
        { style: 'foyer', from: 2.73, to: 10.70, caps: [{ kind: 'front', hw: 11, hh: 30 }, HDOOR] },      // "honey, I'm home": in at the front door
        { style: 'gallery', from: 10.70, to: 30.62, caps: [null, HDOOR] },                               // "vaulted ceilings in your brain, crown molding on your spine"
        { style: 'bedroom', from: 30.62, to: 33.27, caps: [null, HDOOR] },                               // "every room was mine, mine, mine"
        { style: 'foyer', from: 33.27, to: 35.92, caps: [null, HDOOR] },
        { style: 'gallery', from: 35.92, to: 38.57, caps: [null, HDOOR] },
        { style: 'bedroom', from: 38.57, to: 41.22, caps: [null, HDOOR] },
        { style: 'gallery', from: 41.22, to: 61.13, caps: [null, HDOOR] },                               // "can't exorcise the ghost that wears your skin"
        { style: 'ballroom', from: 61.13, to: 86.30, caps: [null, HDOOR] },                              // "I'm living rent free"
        { style: 'gallery', from: 86.30, to: 88.95, caps: [null, HDOOR] },                               // "knock, knock"
        { style: 'gallery', from: 88.95, to: 91.60, caps: [null, HDOOR] },
        { style: 'foyer', from: 91.60, to: 95.58, caps: [null, HDOOR] },                                 // "check under the stairs"
        { style: 'bedroom', from: 95.58, to: 106.9, caps: [null, { kind: 'wall', hw: 10, hh: 16 }] },    // "to rearrange the sheets"
        { style: 'crawl', from: 106.9, to: 109.6, caps: [null, { kind: 'wall', hw: 10, hh: 13 }] },      // "crawl space of your cortex"
        { style: 'attic', from: 109.6, to: 112.2, caps: [null, { kind: 'wall', hw: 10.5, hh: 20 }] },    // "attic of your grief"
        { style: 'blueprint', from: 112.2, to: 120.0, caps: [null, HDOOR] },                             // "before you even drew the blueprint"
        { style: 'gallery', from: 120.0, to: 141.2, caps: [null, HDOOR] },                               // "you thought you'd heal"
        { style: 'mold', from: 141.2, to: 151.28, caps: [null, HDOOR] },                                 // "the mold behind the walls of memory"
        { style: 'mold', from: 151.28, to: 161.89, caps: [null, HDOOR] },                                // "every flashback's got my fingerprints"
        { style: 'mold', from: 161.89, to: 168.72, caps: [null, HDOOR] },
        { style: 'foyer', from: 168.72, to: 171.46, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'foyer', from: 171.46, to: 174.14, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'foyer', from: 174.14, to: 176.48, caps: [null, HDOOR] },                               // "welcome home"
        { style: 'bedroom', from: 176.48, to: 180.78, caps: [null, HDOOR] },                             // "it's crowded in here with all my things"
        { style: 'gallery', from: 180.78, to: 186.18, caps: [null, HDOOR] },                             // "my moods in every door"
        { style: 'foyer', from: 186.18, to: 191.46, caps: [null, HDOOR] },                               // "my name on every floor"
        { style: 'bedroom', from: 191.46, to: 196.36, caps: [null, HDOOR] },                             // "never truly alone"
        { style: 'dark', from: 196.36, to: 217.58, caps: [null, HDOOR] },                                // "I'm the hesitation in your breath"
        { style: 'ballroom', from: 217.58, to: 250.74, caps: [null, HDOOR] },                            // "I am home"
        { style: 'dark', from: 250.74, to: 264.01, caps: [null, HDOOR] },                                // "you still leave the light on"
        { style: 'foyer', from: 264.01, to: 277.0, caps: [null, HDOOR] },                                // "you never changed the locks"
        { style: 'gallery', from: 277.0, to: 292.28, caps: [null, HDOOR] },                              // "you didn't even know you gave me keys"
        { style: 'bedroom', from: 292.28, to: 330 },                                                     // "sweet dreams, landlord"
      ],
      roomEvents: { mold: 148.6, prints: 156.6 },
      zones: [
        // the gallery: her, all down both walls; then the three plaques
        { from: 10.7, to: 21.6, kits: ['portraits'], W: 40, every: 1.33, offset: 0.95 },
        { from: 23.0, to: 23.1, kits: ['portraits'], hang: true, at: [23.5, 26.15, 28.8], plaques: ['PEACE', 'ESTEEM', 'JESUS'], s: 0.95 },
        // every room hers
        { from: 30.6, to: 30.7, kits: ['portraits'], W: 50, at: [32.2, 34.9, 37.5, 40.1], sides: [1, -1, 1, -1], plaques: ['MINE', 'MINE', 'MINE', 'MINE'], v: 1 },
        { from: 41.4, to: 60.0, kits: ['ghosts'], every: 1.25, x: 16, spread: 16 },
        { from: 41.2, to: 61.1, kits: ['portraits'], W: 40, every: 2.65, offset: 1.4 },
        { from: 60.3, to: 60.4, kits: ['wine'], at: 60.3, x: 21 },                       // "so pour yourself a drink / oh wait, I finished it"
        { from: 62.0, to: 85.5, kits: ['ghosts'], every: 0.95, x: 22, spread: 36 },       // "every nightmare's got my furniture"
        { from: 61.1, to: 86.3, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        { from: 86.3, to: 95.6, kits: ['portraits'], W: 40, at: [87.6, 90.3], sides: [1, -1], v: 2 },
        { from: 92.6, to: 92.7, kits: ['stairs'], at: 92.6 },                             // "check under the stairs"
        { from: 100.9, to: 101.0, kits: ['nightstand'], at: 100.9, x: 30, clock: 'THREEAM', s: 2.0 },   // "stopping by at 3 a.m."
        { from: 102.6, to: 102.7, kits: ['bed'], at: 102.6, x: -30 },                     // "to rearrange the sheets"
        { from: 102.6, to: 102.7, kits: ['portraits'], W: 50, at: [102.6], sides: [-1], v: 3, s: 1.05, y: 10.5 },
        { from: 120.0, to: 141.2, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        { from: 134.9, to: 135.0, kits: ['journal'], at: 134.9, x: -23, rot: 1.9, s: 1.1 },         // "in a wreath and drip in your journal"
        { from: 141.2, to: 168.7, kits: ['portraits'], W: 40, every: 2.65, offset: 1.0 },
        { from: 168.7, to: 176.5, kits: ['portraits'], W: 46, at: [170.2, 172.9, 175.4], sides: [1, -1, 1], v: 0 },
        // crowded: her things in boxes, her furniture, her in every corner
        { from: 176.6, to: 196.2, kits: ['crates'], every: 0.75, x: 17, spread: 22 },
        { from: 177.0, to: 196.2, kits: ['ghosts'], every: 1.4, x: 20, spread: 20 },
        { from: 176.5, to: 196.3, kits: ['portraits'], W: 46, every: 1.33, offset: 0.5 },
        { from: 196.4, to: 217.5, kits: ['portraits'], W: 40, every: 1.33, offset: 0.7 },
        { from: 217.6, to: 250.7, kits: ['ghosts'], every: 1.1, x: 24, spread: 36 },
        { from: 217.6, to: 250.7, kits: ['portraits'], W: 70, every: 2.65, offset: 2.0, s: 1.6 },
        { from: 237.2, to: 237.3, kits: ['portraits'], hang: true, at: [237.4], v: 1, s: 1.5, lift: 5 },   // "I'm already in the room"
        { from: 258.8, to: 258.9, kits: ['sideLamp'], at: 258.8, x: -17, s: 1.4 },       // "you still leave the light on"
        { from: 264.0, to: 292.2, kits: ['portraits'], W: 46, every: 2.65, offset: 1.2 },
        { from: 276.95, to: 277.0, kits: ['locks'], at: 276.95, x: 13.4 },               // "you never changed the locks"
        { from: 300.5, to: 300.6, kits: ['nightstand'], at: 300.5, x: 34 },
        { from: 306.0, to: 306.1, kits: ['bed'], at: 306.0, x: -30 },                     // "sweet dreams, landlord"
        { from: 306.0, to: 306.1, kits: ['portraits'], W: 50, at: [306.0], sides: [-1], v: 0, s: 1.05, y: 10.5, plaques: ['HOME'] },   // "this is home"
      ],
      finale: { kind: 'portrait', t: 306.0, x: -44, fireAt: 292.3, orbit: { r: 54, h: 2, y: 27, facing: true, back: 1.2, right: 0.3, swing: 0.2 } },
    },
  },
  {
    // the costume shop's back room, where the real scary costumes live: hurts sold in bags with
    // names on, the fitting room and its mirror, the party under the blacklight, the clearance
    // room, the walls coming down; the zipper stuck, the heels; then the till: 29.99.
    id: 'sexy-trauma-costume',
    accent: '#ff7a1a',
    title: 'Sexy Trauma Costume',
    startY: 8,
    collect: 'corn',
    sections: [
      { t: 0.0, kind: 'intro', endY: 8, turn: 0.3 },                                         // "welcome to the back room"
      { t: 12.00, kind: 'verse', endY: 10, turn: 0.3 },                                      // "I'm your trauma retail specialist"
      { t: 22.66, kind: 'chorus', start: 'launch', kick: 9, endY: 10, turn: 0.3 },           // "one size fits all"
      { t: 32.00, kind: 'break', endY: 18, turn: 0.3 },
      { t: 33.32, kind: 'chorus', start: 'launch', kick: 10, c: 1.15, endY: 10, turn: 0.3 },  // "sexy daddy issues"
      { t: 54.66, kind: 'break', endY: 12, turn: 0.3 },
      { t: 57.32, kind: 'verse', start: 'launch', kick: 8, endY: 12, turn: 0.3 },            // "our best seller this year"
      { t: 64.01, kind: 'break', endY: 22, turn: 0.3 },
      { t: 65.33, kind: 'verse', start: 'launch', kick: 7, c: 0.85, endY: 12, turn: 0.3 },   // "the clearance room"
      { t: 76.01, kind: 'bridge', endY: 14, turn: 0.3 },                                     // "boundaries fall"
      { t: 85.31, kind: 'break', endY: 24, turn: 0.3 },
      { t: 86.65, kind: 'chorus', start: 'launch', kick: 10, c: 1.15, endY: 10, turn: 0.3 },
      { t: 107.99, kind: 'post', start: 'launch', kick: 9, endY: 12, turn: 0.3 },
      { t: 118.66, kind: 'verse', start: 'launch', kick: 8, endY: 12, turn: 0.3 },           // "maybe if we wear it ironically"
      { t: 129.33, kind: 'break', endY: 14, turn: 0.3 },                                     // "the zipper's stuck"
      { t: 130.66, kind: 'bridge', endY: 16, turn: 0.3 },                                    // "these heels are killing me"
      { t: 142.67, kind: 'final', start: 'launch', kick: 11, endY: 10, turn: 0.3 },          // "sexy emotional damage"
      { t: 159.99, kind: 'post', endY: 12, turn: 0.3 },
      { t: 169.33, kind: 'chorus', start: 'launch', kick: 10, endY: 10, turn: 0.3 },         // "sexy trauma costume"
      { t: 182.66, kind: 'bridge', endY: 14, turn: 0.3 },                                    // "I'll ring you up at 29.99"
      { t: 203.99, kind: 'final', start: 'launch', kick: 10, endY: 8, turn: 0.3 },
      { t: 211.99, kind: 'outro', endY: 5, turn: 0.3 },
    ],
    palette: 'stcAisle',
    world: 'shop',
    titleView: { ahead: -0.14, x: 2.0, h: 2.0, back: -0.55, lookH: 3.5 },   // behind her, the doors to the back room ahead
    looks: [
      { t: -99, palette: 'stcAisle' },
      { t: 17.31, palette: 'stcFitting', fade: 0.4 },       // "step into the fitting room"
      { t: 22.66, palette: 'stcAisle', fade: 0.4 },         // "one size fits all"
      { t: 33.32, palette: 'stcParty', fade: 0.2 },         // the party under the blacklight
      { t: 54.66, palette: 'stcAisle', fade: 0.4 },
      { t: 65.33, palette: 'stcClear', fade: 0.3 },         // "the clearance room"
      { t: 76.01, palette: 'stcFitting', fade: 0.4 },
      { t: 79.0, palette: 'stcFall', fade: 1.5 },           // "boundaries fall"
      { t: 86.65, palette: 'stcParty', fade: 0.2 },
      { t: 118.66, palette: 'stcFitting', fade: 0.4 },      // "maybe if we wear it ironically"
      { t: 129.33, palette: 'stcQuiet', fade: 0.6 },        // "the zipper's stuck on memories"
      { t: 142.67, palette: 'stcParty', fade: 0.2 },
      { t: 153.2, palette: 'stcFrost', fade: 0.6 },         // "sparkles covering the frostbite"
      { t: 155.6, palette: 'stcParty', fade: 1.0 },
      { t: 169.33, palette: 'stcAisle', fade: 0.4 },
      { t: 182.66, palette: 'stcFront', fade: 0.6 },        // the tills: "29.99"
      { t: 197.2, palette: 'stcHell', fade: 3.0 },          // "when you're ready for hell"
    ],
    moments: [
      { t: 79.54, kind: 'knock', k: 0.5, n: 1 },            // "boundaries fall"
      { t: 184.48, kind: 'bell', k: 0.35, degree: 7 },      // the register: 29.99
      { t: 203.99, kind: 'flash', k: 0.5 },
    ],
    confetti: [[40.2, 42.0], [93.6, 95.2], [153.4, 155.4]],  // "fishnets and glitter", "sparkles"
    confettiColors: [0xff7a1a, 0xb070ff, 0x6aff6a, 0xffffff, 0xff3ad0, 0xffd21a],
    confettiNormal: true,
    scenery: {
      signs: [
        { key: 'PK1', text: 'SEXY\nDIVORCE', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK2', text: 'SEXY\nBANKRUPTCY', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK3', text: 'SEXY\nDADDY ISSUES', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK4', text: 'SEXY\nABANDONMENT', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK5', text: 'SEXY\nGASLIGHTING', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK6', text: 'SEXY\nCODEPENDENCY', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK7', text: 'SEXY EMOTIONAL\nDAMAGE', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'PK8', text: 'SEXY TRAUMA\nCOSTUME', color: '#c83a10', core: '#c83a10', bg: '#a8a49c', size: 96 },
        { key: 'STCHH', text: 'HAPPY HALLOWEEN', color: '#ff8a2a', core: '#ffd8b0', bg: '#100c0a', size: 96 },
      ],
      rooms: [
        { style: 'aisle', from: -3.4, to: 3.99, caps: [null, KDOOR] },                       // "welcome to the back room"
        { style: 'aisle', from: 3.99, to: 17.31, caps: [null, KDOOR] },                       // "sexy divorce", "sexy bankruptcy"
        { style: 'fitting', from: 17.31, to: 22.66, caps: [null, KDOOR] },                    // "step into the fitting room, face the mirror"
        { style: 'aisle', from: 22.66, to: 33.32, caps: [null, KDOOR] },                      // "one size fits all", "accessories, sold separately"
        { style: 'party', from: 33.32, to: 54.66, caps: [null, KDOOR] },                      // "we're all wearing our trauma to the party tonight"
        { style: 'aisle', from: 54.66, to: 65.33, caps: [null, KDOOR] },                      // "our best seller this year"
        { style: 'clear', from: 65.33, to: 76.01, caps: [null, KDOOR] },                      // "the clearance room"
        { style: 'fitting', from: 76.01, to: 86.65, caps: [null, KDOOR], fallAt: 78.6, fallFor: 2.0 },   // "boundaries fall", "mirror starts calling"
        { style: 'party', from: 86.65, to: 107.99, caps: [null, KDOOR] },
        { style: 'party', from: 107.99, to: 118.66, caps: [null, KDOOR] },
        { style: 'fitting', from: 118.66, to: 129.33, caps: [null, KDOOR] },                  // "maybe if we dress it up someone will finally see"
        { style: 'aisle', from: 129.33, to: 142.67, caps: [null, KDOOR] },                    // "the zipper's stuck", "these heels"
        { style: 'party', from: 142.67, to: 159.99, caps: [null, KDOOR] },                    // "sexy emotional damage"
        { style: 'party', from: 159.99, to: 169.33, caps: [null, KDOOR] },
        { style: 'aisle', from: 169.33, to: 182.66, caps: [null, KDOOR] },                    // "sexy trauma costume"
        { style: 'front', from: 182.66, to: 232, caps: [null, { kind: 'wall', hw: 0.01, hh: 0.01 }] },   // the tills
      ],
      roomEvents: { hell: [197.2, 999, 3.0, 0.5] },
      zones: [
        // the back room's aisles: racks of costumes, the hurts in bags with their names on
        { from: -3.0, to: 3.8, kits: ['racks'], every: 0.8, x: 30 },
        { from: 4.2, to: 17.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 7.6, to: 10.5, kits: ['pkgs'], at: [[7.6, 'PK1', 0x8a3aff, -18], [10.4, 'PK2', 0x2a8a4a, 18]], lift: 24 },
        // the fitting room: face the mirror
        { from: 20.6, to: 20.7, kits: ['longMirror'], at: [20.6], lift: 26, s: 0.75 },
        // "one size fits all"; the accessories, sold separately
        { from: 22.9, to: 33.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 29.6, to: 31.8, kits: ['accessories'], every: 0.45, x: 48.5, y: 22 },
        // the party: jack-o'-lanterns, bats, the costumes on their forms, the names again
        { from: 33.6, to: 54.4, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 34.0, to: 54.0, kits: ['bats'], every: 2.0 },
        { from: 35.0, to: 37.8, kits: ['pkgs'], at: [[35.0, 'PK3', 0xd81a3a, -18], [37.7, 'PK4', 0x1a1a20, 18]], lift: 24 },
        { from: 52.8, to: 53.5, kits: ['dressForms'], at: [[52.8, 30, 0xff3ad0, true], [53.4, -30, 0x8a3aff, true]] },
        // "our best seller this year"
        { from: 54.9, to: 65.1, kits: ['racks'], every: 0.8, x: 30 },
        { from: 61.9, to: 62.0, kits: ['pkgs'], at: [[61.9, 'PK5', 0xff7a1a, -18]], lift: 24 },
        // the clearance room
        { from: 65.6, to: 75.8, kits: ['racks'], every: 0.9, x: 30 },
        { from: 67.3, to: 67.4, kits: ['pkgs'], at: [[67.3, 'PK6', 0xff3ad0, 18]], lift: 24 },
        // the fitting room, its walls coming down; the mirror calling
        { from: 85.6, to: 85.7, kits: ['longMirror'], at: [85.6], lift: 26, s: 0.75, call: 84.4 },
        // the party again; the spider coming down
        { from: 86.9, to: 118.4, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 87.0, to: 118.0, kits: ['bats'], every: 2.0 },
        { from: 88.3, to: 91.1, kits: ['pkgs'], at: [[88.3, 'PK3', 0xd81a3a, 18], [91.0, 'PK4', 0x1a1a20, -18]], lift: 24 },
        { from: 112.0, to: 112.1, kits: ['spider'], at: 112.0, drop: 108.6, s: 1.6 },
        // "someone will finally see": the mirror
        { from: 126.2, to: 126.3, kits: ['longMirror'], at: [126.2], lift: 26, s: 0.75 },
        // the zipper stuck on memories; the heels
        { from: 129.6, to: 142.4, kits: ['racks'], every: 0.8, x: 30 },
        { from: 133.4, to: 133.5, kits: ['garmentBag'], at: 133.4, x: 0, stuck: 132.0, lift: 40, s: 0.72 },
        { from: 138.6, to: 138.7, kits: ['heels'], at: 138.6, lift: 24, s: 1.6 },
        // "sexy emotional damage"; sparkles over the frostbite
        { from: 142.9, to: 169.1, kits: ['pumpkins'], every: 0.6, x: 26 },
        { from: 143.0, to: 169.0, kits: ['bats'], every: 2.0 },
        { from: 144.5, to: 144.6, kits: ['pkgs'], at: [[144.5, 'PK7', 0x1a1a20, -18]], lift: 24 },
        // the aisle: "sexy trauma costume"
        { from: 169.6, to: 182.4, kits: ['racks'], every: 0.8, x: 30 },
        { from: 171.4, to: 171.5, kits: ['pkgs'], at: [[171.4, 'PK8', 0xff7a1a, 18]], lift: 24 },
        { from: 174.0, to: 180.0, kits: ['dressForms'], at: [[174.6, 32, 0xff7a1a, true], [176.2, -32, 0x8a3aff, true], [177.8, 32, 0xd81a3a, true], [179.4, -32, 0x1a1a20, true]] },
        // the tills at the front: "I'll ring you up at 29.99"; happy Halloween
        { from: 186.0, to: 214.0, kits: ['counters'], every: 1.4, x: 34 },
        { from: 184.4, to: 184.5, kits: ['till'], at: 184.4, x: -26, s: 1.4 },
        { from: 193.1, to: 193.2, kits: ['hBanner'], at: 193.1, sign: 'STCHH', lift: 18 },
      ],
      lyricPart: 'shopSign', lyricBg: '#100c0a', lyricColor: '#ff8a2a', lyricCore: '#ffd8b0', lyricS: 1,
      lyrics: [
        { t: 0.0, lead: 3.6, text: 'BACK ROOM', x: 0, h: 18, frame: 'rgba(0,0,0,0)' },
        { t: 22.34, text: 'ONE SIZE\nFITS ALL', x: 0, h: 18, part: 'tag', bg: '#a8a49c', color: '#141414', core: '#141414', frame: 'rgba(0,0,0,0)' },
        { t: 61.06, lead: 0.84, text: 'BEST\nSELLER', x: 0, side: 1, h: 28, s: 0.75, part: 'burst', bg: '#a08a10', color: '#c80a1a', core: '#e81a2a', frame: 'rgba(0,0,0,0)' },
        { t: 70.02, text: 'CLEARANCE', x: 0, h: 18, bg: '#7a0a0a', color: '#ffffff', core: '#ffffff', frame: 'rgba(0,0,0,0)' },
        { t: 155.24, text: 'NO REFUNDS\nNO EXCHANGES', x: 0, h: 18, bg: '#a8a49c', color: '#c80a1a', core: '#c80a1a', frame: 'rgba(0,0,0,0)' },
      ],
      shelf: 70, drop: 4,
      finale: { kind: 'till', t: 215.8, x: -24, fireAt: 203.99, orbit: { r: 72, h: -2, y: 26, facing: true, back: 1.0, right: 0.3, swing: 0.2 } },
    },
  },
  {
    // a party with somebody else's heart in it. The heart hangs over the city
    // all night and beats as hard as you keep the beat. In the bridge the band
    // leaves and the kick drum talks: the rails become a heart monitor that only
    // spikes when you pump on time.
    id: 'heart-of-the-party',
    accent: '#ff2a50',
    title: 'Heart of the Party',
    startY: 15,
    heart: true,
    sections: [
      { t: 0.0, kind: 'intro' },
      { t: 15.96, kind: 'verse', start: 'launch', launchBeats: 2, kick: 7 },   // the band stops: "first one on the dance floor"
      { t: 39.0, kind: 'pre', endY: 30 },                                       // "somebody on my ticket never saw the show"
      { t: 49.02, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 9, lift: 0.006 },   // a bar with no bass, land on "heart"
      { t: 77.0, kind: 'break', start: 'launch', launchBeats: 4, kick: 8, endY: 9 },          // "keep the beat... alive": over the stop
      { t: 81.02, kind: 'verse', c: 0.85 },                                     // "the phone went off past midnight"
      { t: 88.03, kind: 'break', start: 'launch', launchBeats: 2, kick: 3 },    // "son, sit down": the floor goes
      { t: 91.0, kind: 'verse', c: 0.9 },                                       // "strange little word, a match"
      { t: 113.0, kind: 'pre', endY: 30 },
      { t: 124.99, kind: 'chorus', start: 'launch', launchBeats: 4, kick: 10, lift: 0.006 },
      { t: 148.93, kind: 'break', start: 'launch', launchBeats: 4, kick: 9, endY: 12 },       // last "keep the beat alive"
      { t: 152.92, kind: 'post', c: 1.2 },                                      // the band on its own
      { t: 172.83, kind: 'bridge', endY: 24 },                                  // "every March his mother takes the bus"
      { t: 188.32, kind: 'pulse', start: 'launch', launchBeats: 4, kick: 6 },  // "and the kick drum talks"
      { t: 210.85, kind: 'pre', endY: 36, c: 0.8 },                             // "there you are"
      { t: 222.51, kind: 'final', start: 'launch', launchBeats: 4, kick: 12 },  // the last chorus comes in
      { t: 253.0, kind: 'break', start: 'launch', launchBeats: 4, kick: 10, endY: 14 },       // "keep the beat... alive"
      { t: 257.0, kind: 'final', c: 1.3 },
      { t: 283.03, kind: 'outro' },
    ],
    palette: 'party',
    looks: [
      { t: -99, palette: 'party' },
      { t: 80.0, palette: 'late', fade: 2.5 },          // nine years ago, past midnight
      { t: 113.0, palette: 'party', fade: 5 },
      { t: 188.32, palette: 'vigil', fade: 14 },        // the city goes quiet around her
      { t: 222.51, palette: 'encore', fade: 11 },
    ],
    monitor: { from: 190.33, to: 222.51 },
    confetti: [[49.02, 77.0], [124.99, 148.93], [152.92, 172.83], [222.51, 292]],
    scenery: {
      zones: [
        { from: -4, to: 49, kits: ['lowrise', 'partystreet'] },
        { from: 49, to: 80, kits: ['lowrise', 'partystreet'], tall: 0.5 },
        { from: 80, to: 113, kits: ['lowrise'], wake0: 0.12, signs: false },
        { from: 100.6, to: 100.7, kits: ['hospital'], x: -34 },
        { from: 113, to: 173, kits: ['lowrise', 'partystreet'], tall: 0.5 },
        { from: 173, to: 222.5, kits: ['suburb'], lampX: 17 },
        { from: 222.5, to: 283.6, kits: ['lowrise', 'partystreet'], tall: 0.35, clear: 7 },
        { from: 242, to: 284.2, kits: ['ribs'] },
      ],
      roads: [
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: -10, to: 80, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24 },
        { x: 0, width: 24, walk: 4, laneLines: 2, from: 80, to: 113, lanes: [-9, -3, 3, 9], density: 0.1, lampEvery: 30 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 113, to: 173, lanes: [-9, -3, 3, 9], density: 0.45, lampEvery: 24 },
        { x: 0, width: 26, walk: 4, laneLines: 2, from: 173, to: 222.5, traffic: false, lampEvery: 30 },
        { x: 0, width: 24, walk: 5, laneLines: 2, median: true, from: 222.5, to: 296, traffic: false, lampEvery: 24 },
      ],
      vehicles: [
        { kind: 'ambulance', at: 95.6, rate: 1.22, x: -1, from: 91, to: 104 },   // "my miracle came screaming up the street"
        { kind: 'bus', at: 175.6, rate: 0.8, x: 1, from: 166, to: 186 },        // "takes the bus from two towns over"
      ],
      lyrics: [
        { t: 23.84, text: 'GOT A ZIPPER\nDOWN MY MIDDLE', side: -1 },
        { t: 50.5, text: "I'M THE HEART\nOF THE PARTY", side: 1, lead: 1.1 },
        { t: 52.7, text: "AND THE HEART\nAIN'T MINE", side: -1, lead: 1.1 },
        { t: 58.56, text: 'SHAKE IT LIKE\nI STOLE IT', side: 1 },
        { t: 88.72, text: 'TONIGHT WE\nFOUND YOUR MATCH', side: 1 },
        { t: 101.76, text: 'NINETEEN\nFOREVER', side: -1 },
        { t: 212.3, text: 'THERE YOU ARE', side: 1 },
        { t: 247.86, text: "THE PARTY'S\nALL FOR HIM", side: -1 },
        { t: 261.54, text: "I'M STILL HERE", side: 1 },
      ],
      finale: { kind: 'heart', t: 287.5, x: 0, fireAt: 257.0, orbit: { r: 230, h: 12, y: 58 } },
    },
  },
];

export const PALETTES = {
  // Spiked: the street in neon, the club sweet and clean, then losing focus: red, the corridors,
  // the sick green, nothing, red emergency light, the house lights, and the morning's grey
  spkStreet: {
    zenith: 0x05040c, horizon: 0x1c1430, skyGlow: 0x8a4aff, glowDir: [0.3, 0.05, 1], skyline: 0x0c0a16, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8d0ff,
    fog: 0x140e22, fogDensity: 0.0022, stars: 0.4, sunSize: 0,
    ground: 0x0a0810, street: 0xff8a5a, roof: 0x1a1424, wall: 0x2a2234, tree: 0x0e1410,
    window: 0xff9ad8, windowAlt: 0x8ad8ff, lamp: 0xffa860,
    ribbon: 0x120a1c, edge: 0xd0c4ff, fret: 0x9fe8ff, glow: 0xff4fd8, hold: 0x8a6aff, gate: 0xffffff,
    skyLight: 0x5a4a8a, bounce: 0x2a1a2a, hemiK: 1.7, sunK: 0.6,
    board: 0x14101c, suit: 0x0e0a14, jacket: 0x6a4ad8, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x0e0a14, rim: 0xc0a8ff, daze: 0,
  },
  spkClub: { fog: 0x120a20, fogDensity: 0.0028, stars: 0, skyLight: 0x8a6aff, bounce: 0x2a1040, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x40d8ff, daze: 0 },
  spkBlur: { fog: 0x1a0c2a, fogDensity: 0.003, skyLight: 0x9a6aff, bounce: 0x3a1040, hemiK: 1.8, lamp: 0xff4fd8, glow: 0xff4fd8, fret: 0x40d8ff, daze: 0.32 },
  spkChorus: { fog: 0x160a26, fogDensity: 0.0028, skyLight: 0xaa7aff, bounce: 0x3a1050, hemiK: 1.9, lamp: 0xff6fe0, glow: 0xff3fd0, fret: 0x40ffb0, daze: 0.3 },
  spkRed: { fog: 0x2a0408, fogDensity: 0.0034, skyLight: 0xff4a4a, bounce: 0x3a0808, hemiK: 1.6, lamp: 0xff2a2a, glow: 0xff2a3a, fret: 0xff8a6a, edge: 0xffb0b0, hold: 0xff3a5a, daze: 0.55 },
  spkHall: { fog: 0x0a0608, fogDensity: 0.004, skyLight: 0x8a7a8a, bounce: 0x1a1414, hemiK: 1.5, lamp: 0xff3030, glow: 0xff3a3a, fret: 0xffa0a0, edge: 0xe0d0e0, hold: 0x8a6aff, daze: 0.7 },
  spkWash: { fog: 0x101414, fogDensity: 0.0032, skyLight: 0xd8f0e8, bounce: 0x3a4440, hemiK: 1.8, lamp: 0xe8fff4, glow: 0xa0ffe0, fret: 0xe8fff4, edge: 0xe8fff4, hold: 0x8a6aff, daze: 0.75 },
  spkWrong: { fog: 0x061a0e, fogDensity: 0.003, skyLight: 0x4aff9a, bounce: 0x2a0a3a, hemiK: 1.7, lamp: 0xff3fd0, glow: 0x3aff8a, fret: 0xff3fd0, edge: 0xc8ffd8, hold: 0xd040ff, daze: 0.85 },
  spkVoid: { fog: 0x000000, fogDensity: 0.0045, skyLight: 0x3a2a5a, bounce: 0x000000, hemiK: 1.0, glow: 0xffffff, fret: 0xb8a8ff, edge: 0xd8d0ff, hold: 0x8a6aff, daze: 1.0 },
  spkDark: { fog: 0x0a0000, fogDensity: 0.0042, skyLight: 0xff2020, bounce: 0x100000, hemiK: 0.9, lamp: 0xff1010, glow: 0xff1a1a, fret: 0xff6060, edge: 0xff6060, hold: 0xff2a2a, daze: 0.9 },
  spkHouse: { fog: 0x3a3a3c, fogDensity: 0.002, skyLight: 0xf4f6ff, bounce: 0x6a6a70, hemiK: 2.3, lamp: 0xffffff, glow: 0xe0e0e8, fret: 0xffffff, edge: 0xffffff, hold: 0x8a8aa0, daze: 0.22 },
  spkMorning: {
    zenith: 0x4a5a80, horizon: 0xf0c8c0, skyGlow: 0xffb8a0, glowDir: [0.3, 0.05, 1], moonDir: [0.3, 0.06, 1], moon: 0xfff0e0, sunSize: 0.6, stars: 0, cloud: 0xe8d8e0, clouds: 0.5,
    fog: 0xa8a0b0, fogDensity: 0.0016, skyline: 0x6a6878, ground: 0x2a2a30, street: 0xffd8c0, window: 0x2a2a30, windowAlt: 0x2a2a30, lamp: 0xfff4e0,
    skyLight: 0xc8c8e0, bounce: 0x5a5058, hemiK: 1.7, sunK: 1.0, edge: 0xfff0f0, glow: 0xffc8d0, fret: 0xffffff, hold: 0x8a8ab0, daze: 0,
  },
  // Sexy Trauma Costume: the back room's orange and black, the fitting room's velvet, the
  // blacklight, the clearance room's glare, the walls gone, the quiet, the frost, the tills, red.
  stcAisle: {
    zenith: 0x0a0612, horizon: 0x2a1430, skyGlow: 0xff7a1a, glowDir: [0.3, 0.05, 1], skyline: 0x140c16, moonDir: [-0.3, 0.5, 0.8], moon: 0xffe8d0,
    fog: 0x1a1014, fogDensity: 0.0024, stars: 0, sunSize: 0,
    ground: 0x14100c, street: 0xff8a3a, window: 0xff9a4a, windowAlt: 0xb070ff, lamp: 0xffa860,
    ribbon: 0x140c0a, edge: 0xffe8d8, fret: 0xffb070, glow: 0xff7a1a, hold: 0xff5a1a, gate: 0xffffff, gem: 0xfff4e8,
    skyLight: 0xffd0a8, bounce: 0x4a2a1a, hemiK: 1.8, sunK: 0.5,
    board: 0x14100e, suit: 0x101014, jacket: 0xff7a1a, hair: 0x1a0e0a, shoes: 0x101014, gloves: 0x101014, rim: 0xffb070, daze: 0,
  },
  stcFitting: { fog: 0x2a1018, fogDensity: 0.0024, skyLight: 0xffc8c8, bounce: 0x5a2a2a, hemiK: 1.7, lamp: 0xffd0b0, glow: 0xff4a6a, fret: 0xffc0c8, edge: 0xfff0f0 },
  stcParty: { fog: 0x0c0418, fogDensity: 0.0026, skyLight: 0x8a5aff, bounce: 0x2a0a40, hemiK: 1.4, lamp: 0xb070ff, glow: 0xd040ff, fret: 0x6affd8, edge: 0xe8d0ff, hold: 0xff3ad0 },
  stcClear: { fog: 0x2a2010, fogDensity: 0.002, skyLight: 0xfff4d8, bounce: 0x6a5020, hemiK: 2.0, lamp: 0xffffff, glow: 0xff3a2a, fret: 0xffe040, edge: 0xffffff, hold: 0xff2a2a },
  stcFall: { fog: 0x14081e, fogDensity: 0.0022, skyLight: 0xc0a0ff, bounce: 0x2a1840, hemiK: 1.5, lamp: 0xd0b0ff, glow: 0xb070ff, fret: 0xe0d0ff, edge: 0xffffff },
  stcQuiet: { fog: 0x0a0a18, fogDensity: 0.003, skyLight: 0x8a8ab8, bounce: 0x1a1a2a, hemiK: 1.3, lamp: 0xc0c0ff, glow: 0xff7a1a, fret: 0xd0d0ff, edge: 0xe0e0ff },
  stcFrost: { fog: 0x1a2a40, fogDensity: 0.0024, skyLight: 0xc8e8ff, bounce: 0x2a3a50, hemiK: 1.6, lamp: 0xd8f0ff, glow: 0x8ad8ff, fret: 0xe0f8ff, edge: 0xffffff, hold: 0x6ab8ff },
  stcFront: { zenith: 0x0a0612, horizon: 0x3a1a2a, fog: 0x2a1c18, fogDensity: 0.0018, skyLight: 0xfff0e0, bounce: 0x5a4a3a, hemiK: 2.0, lamp: 0xffffff, glow: 0xff7a1a, fret: 0xffd0a0, edge: 0xffffff, hold: 0xff5a1a },
  stcHell: { fog: 0x2a0806, fogDensity: 0.002, skyLight: 0xff8a6a, bounce: 0x4a1008, hemiK: 1.7, lamp: 0xff6a3a, glow: 0xff3a1a, fret: 0xffb090, edge: 0xffe0d0, hold: 0xff3a1a },
  // Pretty Until Proven Guilty: the courtroom's amber at night, the marble halls white, the evidence
  // room's tubes, red-handed, the cells' blue, the room of mirrors in gold, the cold, the verdict.
  pupCourt: {
    zenith: 0x0a1030, horizon: 0x3a4a7a, skyGlow: 0x8aa0ff, glowDir: [0.3, 0.1, 1], skyline: 0x101828, moonDir: [-0.4, 0.5, 0.7], moon: 0xe8f0ff,
    fog: 0x2a1a12, fogDensity: 0.0022, stars: 0.4, sunSize: 0,
    ground: 0x1a1410, street: 0xffc080, window: 0xffd8a0, windowAlt: 0xffe8c8, lamp: 0xffd090,
    ribbon: 0x140c0c, edge: 0xfff0e8, fret: 0xffd8a0, glow: 0xff3a5a, hold: 0xff2a4a, gate: 0xffffff, gem: 0xfff4f6,
    skyLight: 0xffe0c0, bounce: 0x5a3a24, hemiK: 1.9, sunK: 0.5,
    board: 0x14100e, suit: 0x101014, jacket: 0xd8102a, hair: 0x1a0e0a, shoes: 0x101014, gloves: 0x101014, rim: 0xffc0c8, daze: 0,
  },
  pupHall: { fog: 0x6a6460, fogDensity: 0.0018, skyLight: 0xfff8f0, bounce: 0x8a8070, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0d8, glow: 0xff3a5a, fret: 0xffe8b0, edge: 0xffffff },
  pupEvidence: { fog: 0x2a302c, fogDensity: 0.0026, skyLight: 0xe0f0e8, bounce: 0x3a4440, hemiK: 1.8, lamp: 0xe8fff0, glow: 0xff3a5a, fret: 0xe0ffe8, edge: 0xf0fff8 },
  pupRed: { fog: 0x3a0a10, fogDensity: 0.0024, skyLight: 0xffc0c0, bounce: 0x5a1010, hemiK: 1.9, lamp: 0xffb0a0, glow: 0xff2a3a, fret: 0xffb0b0, edge: 0xffe0e0, hold: 0xff1a3a },
  pupCells: { fog: 0x14181e, fogDensity: 0.003, skyLight: 0xa0b0c8, bounce: 0x20242a, hemiK: 1.5, lamp: 0xd8e0ff, glow: 0xff3a5a, fret: 0xc8d8ff, edge: 0xe0e8ff },
  pupMirror: { fog: 0x3a2028, fogDensity: 0.002, skyLight: 0xffe8e0, bounce: 0x6a4a44, hemiK: 1.7, lamp: 0xffd8b0, glow: 0xff4a7a, fret: 0xffe0f0, edge: 0xffffff, hold: 0xff2a4a },
  pupCold: { fog: 0x1a2a3e, fogDensity: 0.0024, skyLight: 0xc8e0ff, bounce: 0x30404e, hemiK: 1.55, lamp: 0xe0f4ff, glow: 0x8ad8ff, fret: 0xe0f8ff, edge: 0xffffff, hold: 0x6ab8ff },
  pupVerdict: { fog: 0x1a0e0c, fogDensity: 0.0024, skyLight: 0xffc8a0, bounce: 0x4a2a1a, hemiK: 1.7, lamp: 0xffb070, glow: 0xff2a4a, fret: 0xffd0a0, edge: 0xfff0e0, hold: 0xff2a4a },
  // Unloaded: the factory at night in pink and mint, the syrup kitchen's amber, the floor's
  // strip lights, the stamping room's red, the showroom's candy pink, the power gone, the block.
  unlNight: {
    zenith: 0x0a0618, horizon: 0x3a1a4a, skyGlow: 0xff5fd2, glowDir: [0.2, 0.05, 1], skyline: 0x140c20, moonDir: [-0.3, 0.5, 0.8], moon: 0xffe8f8,
    fog: 0x24142e, fogDensity: 0.0018, stars: 0.7, sunSize: 0,
    ground: 0x14101a, street: 0xff9ad8, roof: 0x1a1222, wall: 0x2a1e30, tree: 0x101a14,
    window: 0xff9ad8, windowAlt: 0x9af0d8, lamp: 0xffb0d8,
    ribbon: 0x140c18, edge: 0xffe0f4, fret: 0x9af0d8, glow: 0xff5fd2, hold: 0xff3aa8, gate: 0xffffff, gem: 0xfff0fa,
    skyLight: 0x6a4a8a, bounce: 0x2a1424, hemiK: 1.7, sunK: 0.6,
    board: 0x14101a, suit: 0x101014, jacket: 0xff5fd2, hair: 0x1a0e0a, shoes: 0xf8f4f8, gloves: 0x101014, rim: 0xffb0e8, daze: 0,
  },
  unlCook: { fog: 0x3a2018, fogDensity: 0.0024, stars: 0, skyLight: 0xffd8b0, bounce: 0x6a3a2a, hemiK: 1.9, sunK: 0.5, lamp: 0xffc890, glow: 0xff5fd2, fret: 0xffd8a0 },
  unlFloor: { fog: 0x3a2a3e, fogDensity: 0.002, stars: 0, skyLight: 0xffe0f0, bounce: 0x4a5a50, hemiK: 2.0, sunK: 0.6, lamp: 0xfff0f8, glow: 0xff5fd2, fret: 0x9af0d8, edge: 0xffffff },
  unlPress: { fog: 0x1a1418, fogDensity: 0.003, skyLight: 0xd8c8c8, bounce: 0x3a2020, hemiK: 1.7, lamp: 0xff6040, glow: 0xff4a4a, fret: 0xffd040, edge: 0xfff0e0, hold: 0xff3a5a },
  unlShow: { fog: 0x3a1a30, fogDensity: 0.0022, skyLight: 0xffd8f0, bounce: 0x6a3a5a, hemiK: 2.0, lamp: 0xffb0e0, glow: 0xff5fd2, fret: 0xb0fff0, edge: 0xffffff, hold: 0xff3aa8 },
  unlDark: { fog: 0x0a0604, fogDensity: 0.004, skyLight: 0x4a3a2a, bounce: 0x100804, hemiK: 0.9, sunK: 0.3, lamp: 0xffa040, glow: 0xffa040, fret: 0xffd8a0, edge: 0xffe0c0, hold: 0xff8a2a },
  unlFull: { fog: 0x4a2a4e, fogDensity: 0.0018, skyLight: 0xfff0ff, bounce: 0x5a6a60, hemiK: 2.2, sunK: 0.7, lamp: 0xffffff, glow: 0xff3ad0, fret: 0x6affd8, edge: 0xffffff, hold: 0xff3aa8 },
  unlBlock: { zenith: 0x060410, horizon: 0x2a1438, fog: 0x1a1022, fogDensity: 0.0017, stars: 0.6, skyLight: 0x6a4a8a, bounce: 0x2a1424, hemiK: 1.6, sunK: 0.5, lamp: 0xffb070, street: 0xffb070, window: 0xffc890, windowAlt: 0xff9ad8, glow: 0xff5fd2, fret: 0xffd8a0, edge: 0xffe0f4, hold: 0xff3aa8 },
  unlDrop: { fog: 0x2a1030, fogDensity: 0.0015, skyLight: 0xff9ae0, bounce: 0x4a1a3a, hemiK: 2.0, window: 0xff9ad8, windowAlt: 0x9af0d8, lamp: 0xff9ad8, glow: 0xff5fd2, fret: 0x9af0d8 },
  // School Shooter Sweetheart: a bright school morning, the halls' strip lights, red when the siren
  // goes, the afternoon in the classroom windows, the gym gold and purple for homecoming, six
  // o'clock outside, dark, then the stadium lights. He's in a letterman jacket.
  schMorning: {
    zenith: 0x3a7ad8, horizon: 0xcfe4f4, skyGlow: 0xfff0d8, glowDir: [0.4, 0.3, 1], skyline: 0x8a9ab0, moonDir: [0.4, 0.55, 0.7], moon: 0xfff4e0,
    fog: 0xc8d8e8, fogDensity: 0.0016, stars: 0, sunSize: 0.8, cloud: 0xffffff, clouds: 0.35,
    ground: 0x4a7a3a, street: 0xd8d0c0, roof: 0x5a3028, wall: 0x8a3a2a, tree: 0x2a4a2a,
    window: 0xfff4d8, windowAlt: 0xd8e8ff, lamp: 0xfff4e0,
    ribbon: 0x14161e, edge: 0xffffff, fret: 0xffe0e8, glow: 0xff3d6e, hold: 0xff2a5a, gate: 0xffffff, gem: 0xfff2f6,
    skyLight: 0xd8e4f4, bounce: 0x6a5a4a, hemiK: 1.8, sunK: 1.6,
    board: 0x14100e, suit: 0x1a2030, jacket: 0xc8102e, hair: 0x2a1a10, shoes: 0xf4f0f0, gloves: 0x101014, rim: 0xffd0d8, daze: 0,
  },
  schHall: { fog: 0xb8b4a8, fogDensity: 0.0022, skyLight: 0xf4f6f0, bounce: 0x8a8070, hemiK: 1.9, sunK: 0.5, lamp: 0xf4fff8, glow: 0xff3d6e, fret: 0xffe0e8, edge: 0xffffff, hold: 0xff2a5a },
  schAlarm: { fog: 0x3a0608, fogDensity: 0.003, skyLight: 0xff5a5a, bounce: 0x4a0a0a, hemiK: 1.6, lamp: 0xff3030, glow: 0xff2a2a, fret: 0xffb0b0, edge: 0xffd0d0, hold: 0xff2a3a },
  schClass: { fog: 0xd8c8a8, fogDensity: 0.002, skyLight: 0xfff0d8, bounce: 0x8a7050, hemiK: 1.9, sunK: 0.8, lamp: 0xfff0d8, zenith: 0x4a7ad0, horizon: 0xf0d8b0 },
  schPolice: { fog: 0x6a6070, fogDensity: 0.0022, skyLight: 0xd8d0e8, bounce: 0x4a4050, hemiK: 1.7, lamp: 0xe8e4f0 },
  schGym: { fog: 0x4a3a5a, fogDensity: 0.0018, skyLight: 0xffe8c8, bounce: 0x6a4a3a, hemiK: 1.9, sunK: 0.6, lamp: 0xffe0a0, glow: 0xffd23a, fret: 0xd8b0ff, edge: 0xffffff, hold: 0xb070ff, zenith: 0x2a2a6a, horizon: 0xd88a5a },
  schGymAlarm: { fog: 0x3a0608, fogDensity: 0.0026, skyLight: 0xff6a5a, bounce: 0x4a0a0a, hemiK: 1.7, lamp: 0xff3030, glow: 0xff2a2a, fret: 0xffb0b0, edge: 0xffd0d0, hold: 0xff2a3a },
  schDusk: {
    zenith: 0x141a4a, horizon: 0xe87a5a, skyGlow: 0xff8a5a, glowDir: [0.3, 0.04, 1], moonDir: [0.3, 0.05, 1], moon: 0xffb080, sunSize: 0.9, stars: 0.2, clouds: 0.3, cloud: 0xd88a8a,
    fog: 0x5a4a6a, fogDensity: 0.0017, ground: 0x2a3a2a, lamp: 0xffc080, street: 0xffc080,
    skyLight: 0x8a7ab0, bounce: 0x4a3030, hemiK: 1.7, sunK: 1.0, edge: 0xfff0f0, glow: 0xff3d6e, fret: 0xffe0e8, hold: 0xff2a5a,
  },
  schDark: { zenith: 0x05060e, horizon: 0x1a1a30, fog: 0x0a0a14, fogDensity: 0.0026, stars: 0.6, skyLight: 0x3a3a6a, bounce: 0x0a0a10, hemiK: 1.1, sunK: 0.3, sunSize: 0, lamp: 0x6a6a8a },
  schStadium: {
    zenith: 0x04060e, horizon: 0x1a2236, skyGlow: 0xd8e0ff, glowDir: [0, 0.3, 1], moonDir: [0.2, 0.8, 0.5], moon: 0xf0f4ff, sunSize: 0, stars: 0.4,
    fog: 0x1a2030, fogDensity: 0.0016, ground: 0x2a6a2a, lamp: 0xf4f8ff,
    skyLight: 0xe8eeff, bounce: 0x2a4a2a, hemiK: 2.2, sunK: 2.0, edge: 0xffffff, glow: 0xffd23a, fret: 0xffffff, hold: 0xff3d6e,
  },
  // Makeup Sex at Your Funeral: violet dusk, the funeral home's amber, the cemetery's blue night,
  // the prep room's cold, 3 a.m., dawn over the graves, the white chapel. She's in red.
  fhdusk: {
    zenith: 0x120a24, horizon: 0x6a3a5a, skyGlow: 0xff7a6a, glowDir: [0.4, 0.04, 1], skyline: 0x1a1024, moonDir: [-0.5, 0.45, 0.7], moon: 0xffe8d8,
    fog: 0x3a2236, fogDensity: 0.0018, stars: 0.3, sunSize: 0,
    ground: 0x1a2418, street: 0xffb070, roof: 0x22182a, wall: 0x3a2a30, tree: 0x16241a,
    window: 0xffc078, windowAlt: 0xffa0c0, lamp: 0xffb878,
    ribbon: 0x1a0c14, edge: 0xfff0f4, fret: 0xffe0ea, glow: 0xff3a5a, hold: 0xff2a48, gate: 0xffffff, gem: 0xfff2f6,
    skyLight: 0x7a5a8a, bounce: 0x4a2a2a, hemiK: 1.8, sunK: 0.7,
    board: 0x14100e, suit: 0x0c0a0e, jacket: 0xd8203a, hair: 0x1a0e0a, shoes: 0x0e0c10, gloves: 0x0e0c10, rim: 0xffb0c0,
  },
  fhwake: { fog: 0x1e1018, fogDensity: 0.0028, stars: 0, skyLight: 0xe0b8a8, bounce: 0x4a2a28, hemiK: 1.8, sunK: 0.6, lamp: 0xffc080 },
  fhparlor: { fog: 0x2a1e22, fogDensity: 0.0026, stars: 0, skyLight: 0xf0d0c0, bounce: 0x5a3a34, hemiK: 1.9, sunK: 0.6, lamp: 0xffd090 },
  fhgraves: {
    zenith: 0x04050e, horizon: 0x1a2036, skyGlow: 0x5a6aa0, glowDir: [0.4, 0.04, 1], skyline: 0x0a0e18, moonDir: [-0.4, 0.5, 0.75], moon: 0xd8e4ff,
    fog: 0x1c2438, fogDensity: 0.0024, stars: 1, sunSize: 0, ground: 0x18261a, lamp: 0xffb060, street: 0xffb060,
    skyLight: 0x6a7ab0, bounce: 0x22242e, hemiK: 2.0, sunK: 1.5, ribbon: 0x0e0a12, edge: 0xe8f0ff, fret: 0xd8e4ff,
  },
  fhprep: { fog: 0x18221e, fogDensity: 0.0024, skyLight: 0xe0f4ec, bounce: 0x5a6a64, hemiK: 2.0, lamp: 0xe8fff6, edge: 0xe8fff6 },
  fh3am: { zenith: 0x02030a, horizon: 0x0a0e1e, fog: 0x06080e, fogDensity: 0.0036, stars: 1.2, skyLight: 0x3a4a7a, bounce: 0x0a0a12, hemiK: 1.2, sunK: 0.5, lamp: 0x8aa0ff, moon: 0xb8c8ff, edge: 0xc8d8ff },
  fhdawn: {
    zenith: 0x1a2a6a, horizon: 0xe08a7a, skyGlow: 0xffa070, glowDir: [0.3, 0.06, 1], moonDir: [0.3, 0.06, 1], moon: 0xffc0a0, sunSize: 0.9, stars: 0.15,
    fog: 0x7a6a7a, fogDensity: 0.0018, skyLight: 0x9a8ab0, bounce: 0x5a4a4a, hemiK: 1.6, sunK: 1.2, ground: 0x2a3a24, edge: 0xfff0e0, lamp: 0xffc080,
  },
  fhsunrise: {
    zenith: 0x2a4a9a, horizon: 0xffc090, skyGlow: 0xffb060, glowDir: [0.3, 0.1, 1], moonDir: [0.3, 0.1, 1], moon: 0xffe0b0, sunSize: 1.2, stars: 0,
    fog: 0xc8a898, fogDensity: 0.0013, skyLight: 0xc0c0e0, bounce: 0x7a6a50, hemiK: 1.6, sunK: 2.2, ground: 0x3a5a2a, edge: 0xfff4e0, lamp: 0xffd0a0,
  },
  fhwedding: { fog: 0xd8c4b0, fogDensity: 0.0013, stars: 0, skyLight: 0xffe8d4, bounce: 0x9a7a64, hemiK: 1.75, sunK: 1.2, lamp: 0xffd8a0, edge: 0xfff4e8, fret: 0xfff0f4, glow: 0xffb8c8, hold: 0xff4a6a },
  // Nothing Happens Every Week: a bright Sunday, everything innocent, red for red-handed
  sunday: {
    zenith: 0x2c6ade, horizon: 0xc4d8ea, skyGlow: 0xfff0cc, glowDir: [0.5, 0.5, 0.7], skyline: 0x7a9a8a, moonDir: [0.5, 0.5, 0.7], moon: 0xfff2d8,
    fog: 0xb8cce0, fogDensity: 0.0010, stars: 0, sunSize: 0.8, cloud: 0xffffff, clouds: 0.5, windowK: 0.1, glass: 0x4a5a6a,
    ground: 0x5e8a34, street: 0xffe0a0, roof: 0x8a5a4a, wall: 0xe8e0d0, tree: 0x3a6a2a,
    window: 0xffe0b0, windowAlt: 0xffb0c0, lamp: 0xffe0b0,
    ribbon: 0x2a2a34, edge: 0xffffff, fret: 0xffe8e0, glow: 0xff5050, hold: 0xff2a3a, gate: 0xffffff,
    skyLight: 0xb0ccff, bounce: 0x8a8a5a, sunK: 3.0, hemiK: 1.5, fillK: 0.3,
    board: 0x1a1a24, suit: 0x2a2a3a, jacket: 0xffd23a, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xffffff,
  },
  sundaylate: {
    zenith: 0x3a72d8, horizon: 0xf0e4cc, skyGlow: 0xffe0b0, glowDir: [0.6, 0.32, 0.72], moonDir: [0.6, 0.32, 0.72], moon: 0xffe8c8,
    fog: 0xe0d8cc, fogDensity: 0.0012, sunSize: 1, cloud: 0xfff8ec, clouds: 0.4, sunK: 2.8,
  },
  getaway: {
    zenith: 0x2f5ec8, horizon: 0xffd8a0, skyGlow: 0xffb070, glowDir: [0.7, 0.14, 0.7], moonDir: [0.7, 0.14, 0.7], moon: 0xffc888,
    fog: 0xe0c8a8, fogDensity: 0.0011, sunSize: 1.2, cloud: 0xffe0c0, clouds: 0.45, sunK: 2.4, hemiK: 1.4, edge: 0xffe8c0,
  },
  // Your Apartment Smells Like Summer: a hot night, orange windows, then the storm
  summernight2: {
    zenith: 0x0c0a24, horizon: 0x4a2a52, skyGlow: 0xff7a4a, glowDir: [0.2, 0.05, 1], skyline: 0x1a1024, moonDir: [-0.4, 0.5, 0.7], moon: 0xffe0c0,
    fog: 0x2c1a34, fogDensity: 0.0019, stars: 0.5, sunSize: 0,
    ground: 0x100c14, street: 0xffa050, roof: 0x22182a, wall: 0x3a2a30, tree: 0x0f1612,
    window: 0xffb060, windowAlt: 0xff6a9a, lamp: 0xffa050,
    ribbon: 0x201018, edge: 0xffb070, fret: 0xffe0c0, glow: 0xff6a4a, hold: 0xff4fa0, gate: 0xfff4e0,
    skyLight: 0x6a4a8a, bounce: 0x5a3a2a, hemiK: 1.9, sunK: 0.8,
    board: 0x1a1018, suit: 0x1a1420, jacket: 0xff8a4f, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffc890,
  },
  // her apartment by the lamps, the summer night in the windows
  apartment: {
    fog: 0x2a1a16, fogDensity: 0.0026, stars: 0, rain: 0,
    skyLight: 0xe0b890, bounce: 0x6a4030, hemiK: 1.8, sunK: 0.6, lamp: 0xffb060, edge: 0xffc890, glow: 0xffa060,
  },
  rooftops: {
    zenith: 0x080a26, horizon: 0x3a2850, skyGlow: 0xff8a5a, fog: 0x22182e, fogDensity: 0.0015, stars: 0.8,
    skyLight: 0x6a5a9a, hemiK: 1.9,
  },
  storm: {
    zenith: 0x080a12, horizon: 0x262636, skyGlow: 0x5a6a8a, glowDir: [0.2, 0.1, 1], fog: 0x181a26, fogDensity: 0.0024, stars: 0, rain: 0.85,
    skyLight: 0x5a6a90, bounce: 0x2a2a3a, hemiK: 1.7, lamp: 0xffa860, edge: 0xc8d8ff, glow: 0x8aa8ff,
  },
  hallway: {
    fog: 0x16160e, fogDensity: 0.0032, stars: 0, rain: 0,
    skyLight: 0xd0cca0, bounce: 0x3a3a24, hemiK: 1.5, lamp: 0xfff0c8, edge: 0xfff0c8, glow: 0xffe090,
  },
  afterstorm: {
    zenith: 0x0a0a28, horizon: 0x5a3050, skyGlow: 0xff7a5a, glowDir: [0, 0.05, 1], fog: 0x24182a, fogDensity: 0.0011, stars: 0.9, rain: 0,
    skyLight: 0x8a6a9a, hemiK: 1.9, lamp: 0xffb060, edge: 0xffb070, glow: 0xff6a4a,
  },
  attic: { fog: 0x1a120a, fogDensity: 0.004, skyLight: 0xc8a070, hemiK: 1.6, lamp: 0xffc070 },
  blueprint: { fog: 0x0a1a3a, fogDensity: 0.0026, skyLight: 0xa8c0ff, hemiK: 1.8, lamp: 0xcfe0ff, edge: 0xffffff, glow: 0x8ab8ff, fret: 0xe8f0ff },
  moldy: { fog: 0x0e160e, fogDensity: 0.0034, skyLight: 0x8a9a7a, hemiK: 1.6, lamp: 0xd8e0a0 },
  dim: { fog: 0x08040a, fogDensity: 0.0042, skyLight: 0x5a4a6a, hemiK: 1.0, lamp: 0xffb060 },
  // Rent Free: the house in his head, wine-dark and gold, her portrait on every wall
  mansion: {
    zenith: 0x0a0414, horizon: 0x2a1030, skyGlow: 0xc86aff, glowDir: [0, 0.2, 1], skyline: 0x10081a, moonDir: [0.3, 0.8, 0.4], moon: 0xffd8b0,
    fog: 0x1a0818, fogDensity: 0.0034, stars: 0, sunSize: 0,
    ground: 0x0a0408, street: 0xffc070, roof: 0x1a0e18, wall: 0x2a1424, tree: 0x0f1612,
    window: 0xffc878, windowAlt: 0xd08aff, lamp: 0xffc070,
    ribbon: 0x1e0a1a, edge: 0xffd27a, fret: 0xffe8f4, glow: 0xc86aff, hold: 0xc86aff, gate: 0xffffff, gem: 0xffc860,
    skyLight: 0xb08aa0, bounce: 0x4a2030, hemiK: 1.9, sunK: 1.0,
    board: 0x1a0e18, suit: 0x140a14, jacket: 0xc86aff, hair: 0x1a0e0a, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffd27a,
  },
  // A Million Ducks: the screen's blue in the dark, the lobby's red and gold, sodium lamps, a lamp in a bedroom
  auditorium: {
    zenith: 0x02030a, horizon: 0x0a1430, skyGlow: 0x2a6aff, glowDir: [0, 0.1, -1], skyline: 0x050810, moonDir: [0, 0.3, -1], moon: 0x8ab8ff,
    fog: 0x060c1e, fogDensity: 0.0042, stars: 0, sunSize: 0,
    ground: 0x08080c, street: 0x6a8aff, roof: 0x14141c, wall: 0x1a1a24, tree: 0x0d1716,
    window: 0xffd28a, windowAlt: 0x7fb8ff, lamp: 0xffb060,
    ribbon: 0x140c1c, edge: 0x6ad8ff, fret: 0xd8f0ff, glow: 0x3a8aff, hold: 0xff4fb8, gate: 0xffffff, gem: 0xffd23a,
    skyLight: 0x6a86e0, bounce: 0x2a2440, hemiK: 2.2, sunK: 1.0,
    board: 0x14141c, suit: 0x101018, jacket: 0xffd23a, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0x8ac8ff,
  },
  lobby: {
    fog: 0x1e0a12, fogDensity: 0.0042, skyLight: 0xffb898, bounce: 0x5a1a20, hemiK: 1.7, sunK: 0.7, moonDir: [0.2, 1, 0.3], moon: 0xffd0a0,
    lamp: 0xffc070, windowAlt: 0xff4fb8, ribbon: 0x240a14, edge: 0xffd27a, fret: 0xfff0c0, glow: 0xff4f8a, hold: 0x30e0ff, gate: 0xffffff,
  },
  credits: {
    fog: 0x0c1630, fogDensity: 0.0042, skyLight: 0x7aa8ff, bounce: 0x2a2a5a, hemiK: 1.8, moon: 0x9ac8ff, windowAlt: 0x4ab8ff, edge: 0x9fe8ff, hold: 0x30e0ff,
  },
  carpark: {
    zenith: 0x04060f, horizon: 0x1c1834, skyGlow: 0xff8a40, glowDir: [0.3, 0.05, 1], moonDir: [-0.4, 0.5, 0.7], moon: 0xcfd8ff,
    fog: 0x16121e, fogDensity: 0.0022, stars: 0.6, sunSize: 0,
    ground: 0x0c0c10, street: 0xffa040, lamp: 0xffa040, window: 0xffd28a, windowAlt: 0xff5fa0,
    ribbon: 0x1a0e18, edge: 0xffb050, fret: 0xffd8b0, glow: 0xff7a30, hold: 0xff4fb8, gate: 0xffffff, skyline: 0x0c0a14,
    skyLight: 0x4a4a7a, bounce: 0x3a2a2a, hemiK: 1.8, sunK: 0.7,
  },
  room: {
    fog: 0x2a1810, fogDensity: 0.0010, skyLight: 0xffd8b0, bounce: 0x6a3a28, hemiK: 1.9, sunK: 1.5, moonDir: [-0.4, 0.75, 0.4], moon: 0xffd8a0,
    lamp: 0xffc890, ribbon: 0x2a1a12, edge: 0xffe0a0, fret: 0xfff4d8, glow: 0xffb050, hold: 0xff4fb8, gate: 0xffffff, windowAlt: 0xff8a5a,
  },
  roomred: {
    fog: 0x3a0c10, fogDensity: 0.0012, skyLight: 0xff8a80, bounce: 0x6a1a20, hemiK: 1.9, moon: 0xffa090, glow: 0xff3a4a, edge: 0xffb0a0,
  },
  screen: {
    fog: 0x0a1a3a, fogDensity: 0.0026, skyLight: 0x6a96ff, bounce: 0x2a2a4a, hemiK: 2.2, sunK: 1.0, moonDir: [0, 0.3, -1], moon: 0x8ab8ff,
    lamp: 0xffb060, ribbon: 0x140c1c, edge: 0x6ad8ff, fret: 0xd8f0ff, glow: 0x3a8aff, hold: 0xff4fb8, gate: 0xffffff,
  },
  avatar: {
    fog: 0x0c2a5a, fogDensity: 0.003, skyLight: 0x7ab8ff, bounce: 0x2a4a7a, hemiK: 2.1, moon: 0x9ad8ff, edge: 0x9ff0ff, fret: 0xe0fbff, glow: 0x4ab8ff,
  },
  // Technically Thirty-Two: a clear freezing morning, sun across the street in bands
  frost: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2a62d0, horizon: 0xdbe7f5, skyGlow: 0xfff0d8, glowDir: [-0.5, 0.18, 0.85], skyline: 0x8a9ab8, moonDir: [-0.5, 0.18, 0.85], moon: 0xfff0d8,
    fog: 0xc6d4e8, fogDensity: 0.0012, stars: 0, sunSize: 1, snowGround: 0.45, cloud: 0xffffff, clouds: 0.25, shade: 1, breath: 1,
    ground: 0xb0bac8, street: 0xffd8a8, roof: 0x5a6070, wall: 0x8a90a0, tree: 0x3a4a48,
    window: 0xffe0b0, windowAlt: 0xbfe0ff, lamp: 0xffe0b0,
    ribbon: 0x28324a, edge: 0x9fe0ff, fret: 0xe0f4ff, glow: 0xffb070, hold: 0xff7a3a, gate: 0xffffff,
    skyLight: 0xa8c4f0, bounce: 0x8a8070, sunK: 2.8, hemiK: 1.5, fillK: 0.3,
    board: 0x1a1a24, suit: 0x23283a, jacket: 0xff4a5a, hair: 0x2a1a12, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xcfeaff,
  },
  overcast: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x8a96aa, horizon: 0xc6ccd6, skyGlow: 0xdce0e8, moonDir: [-0.5, 0.3, 0.85], moon: 0xd8dce4, sunSize: 0, cloud: 0xd0d4dc, clouds: 0.95,
    fog: 0xb0b8c4, fogDensity: 0.0017, snow: 0.55, snowGround: 0.6, shade: 0, breath: 1.2,
    skyLight: 0xb8c0d0, bounce: 0x7a7a80, sunK: 0.5, hemiK: 2.0, edge: 0xc8e8ff, hold: 0xff7a3a,
  },
  thaw: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x2e6ad4, horizon: 0xf0e4d0, skyGlow: 0xffe0b8, glowDir: [-0.45, 0.22, 0.85], moonDir: [-0.45, 0.22, 0.85], moon: 0xffe8c8, sunSize: 1, cloud: 0xffffff, clouds: 0.3,
    fog: 0xd6d4dc, fogDensity: 0.0012, snow: 0, snowGround: 0.35, shade: 1, breath: 0.8,
    skyLight: 0xb0c4ec, bounce: 0x9a8a70, sunK: 2.8, hemiK: 1.5, edge: 0xffe0b0, hold: 0xff7a3a,
  },
  homesun: {
    windowK: 0.12, glass: 0x5a6a80,
    zenith: 0x3a6ad0, horizon: 0xffe8c8, skyGlow: 0xffd8a0, glowDir: [-0.4, 0.2, 0.9], moonDir: [-0.4, 0.2, 0.9], moon: 0xffe0b0, sunSize: 1.1, cloud: 0xfff4e4, clouds: 0.3,
    fog: 0xe0d4c8, fogDensity: 0.0011, snowGround: 0.25, shade: 1, breath: 0.6,
    skyLight: 0xb8c4e8, bounce: 0xa08a68, sunK: 3.0, hemiK: 1.5, edge: 0xffd8a0, hold: 0xff6a3a,
  },
  // You Are Here: an August afternoon on the hill, to sunset at the top, to the blue hour at home
  august: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x2f6fd0, horizon: 0xd6e4ea, skyGlow: 0xfff0c8, glowDir: [0.42, 0.55, 0.72], skyline: 0x6a8a84, moonDir: [0.42, 0.55, 0.72], moon: 0xfff2d6,
    fog: 0xc6d4d6, fogDensity: 0.0013, stars: 0, sunSize: 1, cloud: 0xffffff, clouds: 0.55,
    ground: 0x5e7a2e, dirt: 0x9a7650, street: 0xffd28a, roof: 0x5a4a40, wall: 0xd8d0c0, tree: 0x2f5a2a,
    window: 0xffd28a, windowAlt: 0xffb0d0, lamp: 0xffd28a,
    ribbon: 0x34241c, edge: 0xffd27a, fret: 0xfff0c0, glow: 0xff9a40, hold: 0xff3d9a, gate: 0xffffff,
    skyLight: 0xa8c8ff, bounce: 0x6a7a3a, sunK: 3.0, hemiK: 1.5, fillK: 0.3, dapple: 0.85, hills: 0,
    board: 0x1a1a1a, suit: 0x2a3040, jacket: 0xff5a36, hair: 0x3a2418, shoes: 0xf4f0f8, gloves: 0x1a1a1a, rim: 0xfff0c0,
  },
  thunder: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x2a323e, horizon: 0x5c6670, skyGlow: 0x8a9aaa, glowDir: [0.42, 0.55, 0.72], skyline: 0x3a4648, moonDir: [0.42, 0.55, 0.72], moon: 0xb8c6d8,
    fog: 0x4c5660, fogDensity: 0.0022, sunSize: 0, cloud: 0x66707a, clouds: 0.95, rain: 0.8,
    ground: 0x3e5228, dirt: 0x5a4632, skyLight: 0x6a7a90, bounce: 0x3a4030, sunK: 0.5, hemiK: 1.2, dapple: 0,
    ribbon: 0x221a18, edge: 0xcfe0ff, hold: 0xff3d9a,
  },
  golden: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x3664c0, horizon: 0xf0dcb4, skyGlow: 0xffc878, glowDir: [0.55, 0.3, 0.78], moonDir: [0.55, 0.3, 0.78], moon: 0xffe4b0,
    fog: 0xdac8a8, fogDensity: 0.0013, sunSize: 1, cloud: 0xfff4e0, clouds: 0.5, rain: 0,
    ground: 0x6e7c2c, dirt: 0xa07a4c, skyline: 0x7a8278, skyLight: 0xb0c0e8, bounce: 0x7a6a3a, sunK: 2.7, hemiK: 1.4, dapple: 0.75,
  },
  ridge: {
    windowK: 0.12, glass: 0x4a5a68,
    zenith: 0x3664c0, horizon: 0xf0dcb4, skyGlow: 0xffc878, glowDir: [0.55, 0.3, 0.78], moonDir: [0.55, 0.3, 0.78], moon: 0xffe4b0,
    fog: 0xdac8a8, fogDensity: 0.0011, sunSize: 1, cloud: 0xfff4e0, clouds: 0.5,
    ground: 0x7e842e, dirt: 0xa07a4c, skyline: 0x7a8278, skyLight: 0xb0c0e8, bounce: 0x7a6a3a, sunK: 2.8, hemiK: 1.4, dapple: 0,
  },
  sunset: {
    windowK: 0.35, glass: 0x4a5a68,
    zenith: 0x2a3a7a, horizon: 0xffa468, skyGlow: 0xff7848, glowDir: [0.7, 0.12, 0.7], moonDir: [0.7, 0.12, 0.7], moon: 0xffb878,
    fog: 0xc08a70, fogDensity: 0.0015, sunSize: 1.1, cloud: 0xffb898, clouds: 0.55,
    ground: 0x5e5c2a, dirt: 0x8a6244, skyline: 0x6a5060, skyLight: 0x9a8ab8, bounce: 0x7a4a30, sunK: 2.0, hemiK: 1.2, dapple: 0.55,
    edge: 0xffc87a, hold: 0xff3d9a,
  },
  sunsetopen: {
    windowK: 0.4, glass: 0x4a5a68,
    zenith: 0x2a3a7a, horizon: 0xffa468, skyGlow: 0xff7848, glowDir: [0.72, 0.08, 0.69], moonDir: [0.72, 0.08, 0.69], moon: 0xffb070,
    fog: 0xc08a70, fogDensity: 0.0012, sunSize: 1.2, cloud: 0xffb898, clouds: 0.55,
    ground: 0x5e5c2a, dirt: 0x8a6244, skyline: 0x6a5060, skyLight: 0x9a8ab8, bounce: 0x7a4a30, sunK: 2.0, hemiK: 1.2, dapple: 0, hills: 0.3,
  },
  summit: {
    windowK: 0.6, glass: 0x2a2a3a,
    zenith: 0x1e2a66, horizon: 0xff8a58, skyGlow: 0xff5c3c, glowDir: [0.75, 0.035, 0.66], moonDir: [0.75, 0.035, 0.66], moon: 0xff9a5a,
    fog: 0xa87070, fogDensity: 0.0009, sunSize: 1.5, cloud: 0xff9a88, clouds: 0.6,
    ground: 0x4a4a28, dirt: 0x7a5440, skyline: 0x4a3a58, skyLight: 0x8a7ab0, bounce: 0x6a3a2a, sunK: 1.6, hemiK: 1.1, dapple: 0, hills: 0.8,
    edge: 0xffd08a, fret: 0xfff0d0, hold: 0xff3d9a,
  },
  bluehour: {
    windowK: 1, glass: 0x030406,
    zenith: 0x0e1638, horizon: 0x6a4a78, skyGlow: 0xff8a70, glowDir: [0.75, -0.02, 0.66], moonDir: [0.75, -0.06, 0.66], moon: 0xffa080,
    fog: 0x3c3a5a, fogDensity: 0.0014, sunSize: 0, stars: 0.35, cloud: 0x5a4a6a, clouds: 0.5,
    ground: 0x2a3020, dirt: 0x4a3a30, skyline: 0x1a1a2e, skyLight: 0x4a4a7a, bounce: 0x2a2a30, sunK: 0.35, hemiK: 1.3, dapple: 0, hills: 1,
    window: 0xffc070, lamp: 0xffc070, edge: 0xffc87a,
  },
  evening: {
    zenith: 0x080c24, horizon: 0x3a3058, skyGlow: 0xc06a70, glowDir: [0.75, -0.02, 0.66], moonDir: [-0.5, 0.4, 0.7], moon: 0xd8e0ff,
    fog: 0x24243c, fogDensity: 0.0016, sunSize: 0, stars: 0.8, cloud: 0x3a3450, clouds: 0.45,
    ground: 0x2a3220, dirt: 0x4a3c30, skyline: 0x12121e, skyLight: 0x5a5a90, bounce: 0x3a3238, sunK: 0.6, hemiK: 1.9, dapple: 0, hills: 1,
    window: 0xffc070, lamp: 0xffc070, street: 0xffc070, edge: 0xffc87a,
  },
  carcrash: {
    zenith: 0x05040f, horizon: 0x3a1744, skyGlow: 0xff3f78, glowDir: [1, 0.04, 0.45], skyline: 0x150a1e, moonDir: [-0.5, 0.42, 0.75], moon: 0xffe3f0,
    fog: 0x2a1236, fogDensity: 0.0021,
    ground: 0x0b0912, street: 0xff8a3d, roof: 0x1d1424, wall: 0x2a2233, tree: 0x0d1716,
    window: 0xffb36b, windowAlt: 0xff6fb5, lamp: 0xffa04a,
    ribbon: 0x2a0d24, edge: 0x5ff2ff, fret: 0xff8fd0, glow: 0xff3d8b, hold: 0xff3d8b, gate: 0xdcffff,
    board: 0x1a1020, suit: 0x0d0b14, jacket: 0xff3f8e, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0x7fe9ff,
  },
  // Summer People: one town, one year
  winter: {
    zenith: 0x060a18, horizon: 0x26324c, skyGlow: 0x8fa8d8, glowDir: [-0.4, 0.05, 1], skyline: 0x101828, moonDir: [0.6, 0.45, 0.7], moon: 0xe8f0ff,
    fog: 0x1e2a40, fogDensity: 0.0024, stars: 1, snow: 0.85, snowGround: 0.8, sunSize: 0,
    ground: 0x1a2030, street: 0xa8c0ff, roof: 0x2a2c38, wall: 0x2a2233, tree: 0x0d1716, water: 0x0a1424, sand: 0x9aa4b8,
    window: 0xffc68a, windowAlt: 0xa8d8ff, lamp: 0xffd8a0,
    ribbon: 0x5a4a44, edge: 0xcfe6ff, fret: 0xd8e6ff, glow: 0x9fc8ff, hold: 0x7fd0ff, gate: 0xffffff, ribbonStyle: 1,
    skyLight: 0x5a6a90, bounce: 0x303848,
    board: 0x1a1a24, suit: 0x1a1a22, jacket: 0x8a78d8, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x222230, rim: 0xbfe0ff,
  },
  spring: {
    zenith: 0x161a44, horizon: 0x8a6a9a, skyGlow: 0xffa8c0, glowDir: [1, 0.04, 0.4], skyline: 0x2a2440, moonDir: [0.6, 0.45, 0.7], moon: 0xfff0f6,
    fog: 0x4a3c5c, fogDensity: 0.0018, stars: 0.35, snow: 0, snowGround: 0, sunSize: 0,
    ground: 0x2a3a2a, street: 0xffd8a0, water: 0x1a2440, sand: 0xc8b49a,
    window: 0xffc68a, windowAlt: 0xffa8d8, lamp: 0xffd8a0,
    ribbon: 0x6a4e3e, edge: 0xffe6c0, fret: 0xffd8e8, glow: 0xffa8c0, hold: 0xff8fb8, gate: 0xfff6e8,
    skyLight: 0x8a7aa8, bounce: 0x5a4a40,
  },
  summer: {
    zenith: 0x2c2a6c, horizon: 0xff9a6a, skyGlow: 0xffb070, glowDir: [1, 0.03, 0.35], skyline: 0x6a3a50, moonDir: [1, 0.06, 0.32], moon: 0xffcf8a,
    fog: 0xa86a6a, fogDensity: 0.0014, stars: 0, snow: 0, snowGround: 0, sunSize: 1,
    ground: 0x3a4a2a, street: 0xffd28a, water: 0x2a3a5a, sand: 0xe8c89a,
    window: 0xffd28a, windowAlt: 0xff9ed2, lamp: 0xffd28a,
    ribbon: 0x7a5640, edge: 0xffe0a0, fret: 0xfff0c8, glow: 0xff9a6a, hold: 0x2fe0ff, gate: 0xfff4d8,
    skyLight: 0xffb08a, bounce: 0x8a5a40,
  },
  summernight: {
    zenith: 0x0a0a26, horizon: 0x3a2056, skyGlow: 0xff6fa8, glowDir: [1, 0.04, 0.35], skyline: 0x1a1030, moonDir: [-0.4, 0.4, 0.8], moon: 0xffeef8,
    fog: 0x2e1c40, fogDensity: 0.0018, stars: 1, sunSize: 0,
    ground: 0x16201a, street: 0xffc070, water: 0x0c1428, sand: 0x8a7a68,
    window: 0xffc070, windowAlt: 0xff8ad0, lamp: 0xffc070,
    ribbon: 0x5a4034, edge: 0xffd28a, fret: 0xffb8e0, glow: 0xff6fa8, hold: 0xff5fa8, gate: 0xfff0e0,
    skyLight: 0x6a5a9a, bounce: 0x5a3a2a,
  },
  september: {
    zenith: 0x14122e, horizon: 0x8a4a3a, skyGlow: 0xff8a50, glowDir: [1, 0.03, 0.4], skyline: 0x3a2030, moonDir: [1, 0.04, 0.4], moon: 0xffb070,
    fog: 0x5a3a40, fogDensity: 0.0019, stars: 0.2, sunSize: 0.7,
    ground: 0x2a2a20, street: 0xffb070, water: 0x1a2236, sand: 0xb89a7a,
    window: 0xffb070, windowAlt: 0xffa0a0, lamp: 0xffb070,
    ribbon: 0x5e4436, edge: 0xffcf9a, fret: 0xffd0b0, glow: 0xff8a50, hold: 0x36d8ff, gate: 0xfff0d8,
    skyLight: 0x9a7a8a, bounce: 0x6a4a3a,
  },
  // Heart of the Party: red and gold, a heart where the moon should be
  party: {
    zenith: 0x0a0414, horizon: 0x4a1430, skyGlow: 0xff4a5e, glowDir: [0.3, 0.04, 1], skyline: 0x1c0a1c, moonDir: [0, -1, 0], moon: 0xff8aa6,
    fog: 0x2c0c24, fogDensity: 0.0019, stars: 0.5, sunSize: 0,
    ground: 0x0e0810, street: 0xffb060, roof: 0x1e1220, wall: 0x2a1e2c, tree: 0x0f1612,
    window: 0xffc070, windowAlt: 0xff5f8a, lamp: 0xffb060,
    ribbon: 0x2a0a18, edge: 0xffd27a, fret: 0xffb3c8, glow: 0xff3355, hold: 0xff4fb8, gate: 0xfff2c8,
    skyLight: 0x7a3a6a, bounce: 0x5a2a2a, heart: 0xff2a50,
    board: 0x1a0f18, suit: 0x0d0b14, jacket: 0xff2a4a, hair: 0xffb3d6, shoes: 0xf4f0f8, gloves: 0x111018, rim: 0xffd27a,
  },
  late: {
    zenith: 0x040714, horizon: 0x18213e, skyGlow: 0x5a78d8, glowDir: [0.3, 0.04, 1], skyline: 0x0c1226, moon: 0xa8b8ff,
    fog: 0x121a30, fogDensity: 0.0022, stars: 0.9,
    ground: 0x0a0c14, street: 0x9fb8ff, window: 0xbfd4ff, windowAlt: 0xff5f6a, lamp: 0xb8c8ff,
    ribbon: 0x10142a, edge: 0x9fc8ff, fret: 0xd0e0ff, glow: 0xff3a4a, hold: 0x6fa8ff, gate: 0xf0f6ff,
    skyLight: 0x3a4a7a, bounce: 0x2a2a3a, heart: 0xff3048,
  },
  vigil: {
    zenith: 0x020206, horizon: 0x120e1c, skyGlow: 0x3a2050, glowDir: [0.3, 0.04, 1], skyline: 0x08060e, moon: 0xff6a80,
    fog: 0x0a0812, fogDensity: 0.0026, stars: 1.3,
    ground: 0x050408, street: 0x5a4a6a, window: 0x7a5a4a, windowAlt: 0x4a3a5a, lamp: 0x6a5a7a,
    ribbon: 0x0a0810, edge: 0x5cffa8, fret: 0x9affd0, glow: 0xff3a5a, hold: 0x4cff9a, gate: 0xe8fff0,
    skyLight: 0x2a2440, bounce: 0x1a1418, heart: 0xff2040,
  },
  encore: {
    zenith: 0x10041a, horizon: 0x6a1840, skyGlow: 0xff5a6a, glowDir: [0.3, 0.04, 1], skyline: 0x2a0c28, moon: 0xffa0b8,
    fog: 0x3a1030, fogDensity: 0.0016, stars: 0.4,
    ground: 0x120810, street: 0xffc070, window: 0xffd28a, windowAlt: 0xff7fd0, lamp: 0xffc070,
    ribbon: 0x34081c, edge: 0xffe08a, fret: 0xffc8e0, glow: 0xff2a55, hold: 0xff4fb8, gate: 0xfff2c8,
    skyLight: 0x8a3a7a, bounce: 0x6a2a3a, heart: 0xff2050,
  },
  rain: {
    zenith: 0x080c16, horizon: 0x283044, skyGlow: 0x6a8ab8, glowDir: [1, 0.04, 0.4], skyline: 0x101420, moonDir: [-0.4, 0.4, 0.8], moon: 0x8090b0,
    fog: 0x1c2434, fogDensity: 0.0027, stars: 0, sunSize: 0, rain: 0.9, snow: 0,
    ground: 0x141a22, street: 0xffc890, water: 0x0a1018, sand: 0x5a5e66,
    window: 0xffc890, windowAlt: 0xffa8d0, lamp: 0xffc890,
    ribbon: 0x3e3430, edge: 0xffd8a8, fret: 0xffe0f0, glow: 0xff8ab8, hold: 0xff6fb0, gate: 0xf4f0ff,
    skyLight: 0x4a5878, bounce: 0x3a3440,
  },
};
