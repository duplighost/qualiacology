// RALLY — the ladder. A rival is data: reaction, aim, error, one mechanical signature.
// Personality arrives through how they make YOU swing (judge fix: curriculum, not difficulty curve).
window.RIVALS = [
  {
    id: 'pip', name: 'PIP', title: 'the local optimist',
    color: '#e8b23a', dark: '#a87d1e', eye: '#2b2118',
    music: { bpm: 96, root: 261.63, mode: [0, 2, 4, 5, 7, 9, 11], bright: 0.9 }, // C major, sunny
    ai: {
      react: 0.34,        // slow to read your shot
      speed: 620,         // amble
      err: 90,            // generous aim wobble
      power: 620,         // soft returns
      style: 'book',      // aims safe center-deep, never risks a line
      spin: 0,
    },
  },
  {
    id: 'otto', name: 'OTTO', title: 'the net', // he IS the net
    color: '#d96f32', dark: '#96481c', eye: '#241a12',
    music: { bpm: 108, root: 196.0, mode: [0, 2, 4, 5, 7, 9, 10], bright: 0.7 }, // G mixolydian, burly
    ai: {
      react: 0.26,
      speed: 900,         // fast laterally...
      err: 70,
      power: 900,         // volleys punch
      style: 'net',       // SIGNATURE: rushes the net after every return, kills short balls.
      ceiling: 300,       // ...but can't reach high: mitt won't rise above y=300...
      retreat: 1000,      // ...and won't backpedal past x=1000. A DEEP LOB beats him.
      spin: 0,
    },
  },
  {
    id: 'viv', name: 'VIV', title: 'the spin doctor',
    color: '#c94f8a', dark: '#8c2f5c', eye: '#26101c',
    music: { bpm: 120, root: 293.66, mode: [0, 2, 3, 5, 7, 9, 10], bright: 0.55 }, // D dorian, slinky
    ai: {
      react: 0.24,
      speed: 800,
      err: 60,
      power: 820,
      style: 'spin',      // SIGNATURE: everything comes back with heavy topspin — dipping,
      spin: 30,           // swerving returns. Slice across the ball to tame your reply.
    },
  },
  {
    id: 'sol', name: 'SOL', title: 'the soft touch',
    color: '#5fb8a5', dark: '#357a6c', eye: '#10201c',
    music: { bpm: 84, root: 220.0, mode: [0, 3, 5, 7, 10], bright: 0.65 }, // A minor pentatonic, lazy porch swing
    ai: {
      react: 0.22,        // reads you like a paperback
      speed: 560,         // barely moves. doesn't need to.
      err: 34,
      power: 560,
      style: 'touch',     // SIGNATURE: drop shots that die past the net, then lobs to the fence.
      spin: -12,          // a little backspin so the drops sit down dead. Live at full stretch.
    },
  },
  {
    id: 'jules', name: 'JULES', title: 'you know jules',
    color: '#5a76c9', dark: '#37498c', eye: '#11162b',
    music: { bpm: 116, root: 174.61, mode: [0, 2, 4, 6, 7, 9, 11], bright: 0.8 }, // F lydian, wide open sky
    ai: {
      react: 0.185,
      speed: 980,
      err: 30,
      power: 940,
      style: 'jules',     // SIGNATURE: plays the whole ladder — rushes, spins, drops — and
      spin: 22,           // remembers what beat you last.
    },
  },
];

// ---------------------------------------------------------------------------
// Vignettes. Jules is in all of them. Lowercase = the site's house whisper.
// Format: [speakerId|'you'|'voice', line]. 'voice' is the unnamed announcer.
window.DIALOGUE = {
  pre_pip: [
    ['jules', "five names on the sheet. yours last, same as every summer."],
    ['jules', "loser buys the lemonade. that rule's older than both of us."],
    ['pip', "hi!! i've been practicing against the garage all spring. the garage is 0 and 400."],
    ['jules', "be nice to this one."],
  ],
  post_pip: [
    ['pip', "WOW. okay. the garage did not prepare me for that."],
    ['pip', "also — the ball sounds different when you hit it. better. don't tell the garage."],
    ['pip', "i'm gonna go watch you from the good bleacher. the wobbly one."],
    ['jules', "one down. otto's next. don't take the quiet personally."],
  ],
  pre_otto: [
    ['otto', "kid. i don't move much."],
    ['otto', "don't have to. the net and me have an arrangement."],
    ['jules', "he means he lives up there. nothing gets past him low."],
    ['jules', "so don't go low. you've got a whole sky."],
  ],
  post_otto: [
    ['otto', "hm. the sky. never liked it."],
    ['otto', "folks keep saying the ball sings out here. wouldn't know. i work in thuds."],
    ['otto', "good lob, though. honest lob. i'd shake your hand, but i'm forty percent rope."],
    ['jules', "two down. viv's next. watch the ball — it lies."],
  ],
  pre_viv: [
    ['viv', "darling. every ball i send you is going to curve."],
    ['viv', "not because i must. because it's *gorgeous*."],
    ['jules', "her spin eats flat returns. cut across the ball — slice it back plain."],
    ['viv', "tattletale."],
  ],
  post_viv: [
    ['viv', "you took my curve and ironed it flat. brutal. elegant. i'm furious."],
    ['viv', "worse — that last rally is stuck in my head. i'm humming my own defeat. tell no one."],
    ['jules', "sol's last before me. bring your knees."],
  ],
  pre_sol: [
    ['sol', "oh, i don't hit hard, dear."],
    ['sol', "i just put the ball where you were about to not be."],
    ['jules', "she once beat me eleven to nothing and apologized after every point."],
    ['sol', "ten to nothing. don't flatter yourself, jules."],
  ],
  post_sol: [
    ['sol', "there it is. you stopped running to the ball and started listening for it."],
    ['sol', "go on, dear. jules has been waiting all summer. everyone saw it but you."],
  ],
  pre_jules: [
    ['jules', "so."],
    ['jules', "every summer it comes down to us. every summer, somebody buys the lemonade."],
    ['jules', "i've watched you the whole ladder. the lob. the slice. the lunge."],
    ['jules', "show me all of it. i'm not going easy. i never have. that's how you know."],
  ],
  // fires at YOUR match point vs jules, after the scoreboard burns out
  finale: [
    ['jules', "wait."],
    ['jules', "match point. you win this, the music stops. you've noticed that, right?"],
    ['jules', "every point — yours, mine — the song died for it. all summer. every summer. i counted."],
    ['jules', "forget the score. one real rally — hit it *to* me, not past me."],
    ['jules', "let the song finish. just once. i want to hear how it ends."],
  ],
  // soft callout when the ball dies mid-finale (the one rally where failing needs a voice)
  finale_drop: "it's okay. from the top. we've got all summer.",
  // if a rival takes a match off you
  retry: {
    pip: ["i WON?? sorry!! i mean — rematch? please?"],
    otto: ["net wins. net always wins. ...again?"],
    viv: ["delicious. again, darling — you *almost* had the counter."],
    sol: ["you were listening with your feet, dear. try your ears. again."],
    jules: ["i know. i've been doing that to you since we were nine. run it back."],
  },
  ending: [
    ['voice', "the song finished."],
    ['voice', "the scoreboard never came back on. you won't be needing it."],
    ['voice', "you weren't keeping score. you were keeping time."],
    ['jules', "...so that's how it ends."],
    ['jules', "nobody lost. lemonade's on both of us. it always could have been."],
  ],
  // duet re-serve callouts, rotating (soft)
  duet_reserve: [
    "again. we have all night.",
    "fireflies are out. one more.",
    "arm okay? mine too. again.",
    "shh. from the top.",
  ],
};
