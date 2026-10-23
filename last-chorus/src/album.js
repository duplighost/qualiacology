// The record: which songs, in what order, how each one is built.
// Section times are seconds into the song, each on the beat the music changes.
// kinds: intro verse pre chorus post bridge break final outro
// start: 'launch' makes the section open with a lip you fly off (kick = m/s upward).

// a doorway between the rooms of her apartment
const DOOR = { kind: 'wall', hw: 11.5, hh: 30 };
// and between the rooms of the house in his head
const HDOOR = { kind: 'wall', hw: 11.5, hh: 30 };

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
