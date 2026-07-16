// UNINVITED — the whole story is a misread.
//
// You are a prowler. You broke into a big dark house on the edge of town — the
// old place everyone says is empty, maybe haunted. Your nerves turn every
// ordinary thing into a ghost. The four "spirits" drifting through the rooms are
// the AVERY family, home and frightened, woken by a stranger in their house on a
// storm-black night with the power out. Their lines sound like a haunting. They
// are exactly what a family says to an intruder. You climb toward a pale figure
// at the far window of the top floor — and when you reach it the lights come on,
// it is a dressmaker's form, and there is a police officer in the doorway.

export const FAMILY = {
  mother: { name: 'Claire', color: 'robe',      legs: 'robe',      skin: 'skinLight', hair: 'hairBrown', female: true, longHair: true, h: 0.88 },
  father: { name: 'Mark',   color: 'clothNavy', legs: 'denim',     skin: 'skinMid',   hair: 'hairDark',  broad: true,  h: 0.95 },
  boy:    { name: 'Toby',   color: 'pjBlue',    legs: 'pjBlue',    skin: 'skinLight', hair: 'hairBrown', child: true, h: 0.92 },
  girl:   { name: 'Lucy',   color: 'clothPink', legs: 'clothPink', skin: 'skinMid',   hair: 'hairDark',  child: true, female: true, longHair: true, h: 0.9 },
};

// The player's paranoid inner voice. Keyed by trigger id (see events.js).
// Each reads as dread now and as a guilty man talking himself up in hindsight.
export const MONO = {
  intro: [
    "They say nobody's set foot in this place for years. Not since the lights went out.",
    "So why does it feel like something knows I'm here.",
  ],
  foyer: [
    "The air in here is wrong. Thick. Like the house is holding its breath — waiting for me.",
  ],
  living: [
    "Somebody lived well here, once. Now the dark just sits on everything.",
  ],
  kitchenSee: [
    "…There. By the sink. Something moving in the black. It hasn't seen me. Or it wants me to think that.",
  ],
  studySee: [
    "He's just standing in the dark, muttering to something that isn't there.",
    "Or telling it about me.",
  ],
  stairs: [
    "Every bone in me says leave. But whatever this house keeps, it keeps upstairs.",
  ],
  landing: [
    "Little shoes lined up by a door. Toys. No child has laughed in this house for a long time.",
  ],
  longhall: [
    "That last door, end of the hall. There's a shape in there. Pale. Standing at the window.",
    "It hasn't moved. Go on. Go and look.",
  ],
  masterEnter: [
    "It's her. The lady of the house. She never left — she's been up here all this ti—",
  ],
  // spoken after the cuffs, over black
  after: [
    "…A dressmaker's dummy. An old dress on a stand.",
    "That's all it was. That's all any of it was.",
    "They were just… home.",
  ],
};

// Family speech. Heard as a haunting; in hindsight, a frightened family.
// Nothing here may name the crime — the arrest does that.
export const LINES = {
  mother: [
    'Hello? Is somebody down there?',
    'Mark? …That is not Mark.',
    'I can hear you moving.',
    'You should go. Please. Go.',
    'Why are you here?',
  ],
  father: [
    'Who is that. Show yourself.',
    'I told them where you are. They are coming.',
    'You need to leave. Now.',
    'You do not belong here.',
    'I know you can hear me.',
  ],
  boy: [
    "…Are you the one Mummy's scared of?",
    "You're not s'posed to be in here.",
    'I can see you, you know.',
    "I'm not asleep. I heard you come in.",
  ],
  girl: [
    "You shouldn't be here.",
    'Mummy said to hide.',
    "You're not allowed in here.",
    '…I want my mum.',
  ],
};

// The arrest end-card, then the little newspaper coda that recolours it all.
export const ENDING = {
  arrest:
`You never hear the stair behind you. You never do.

"Hands where I can see them. Behind your back — slowly."

The cuffs close cold around your wrists. Down the hall a small girl is crying, and her mother is holding her, and her father won't stop shaking, and none of them are dead, and none of them are ghosts, and the only uninvited thing in this whole warm house

was you.`,
  epilogue:
`— EASTFIELD GAZETTE —
Prowler seized at Elm Road house

A man was arrested in the early hours after breaking into the family home of Mark and Claire Avery. The couple and their two children were unharmed. "We heard him downstairs and kept the lights off and the doors shut," Mr Avery said. "We were terrified. We just wanted him gone." Police responded within the hour.

UNINVITED`,
};

// Minimal game state. One small inventory: the keys the prowler finds — the far
// bedroom stays locked until the household key is taken from the cellar.
export class GameState {
  constructor() {
    this.flags = {};
    this.seen = new Set();   // one-shot monologue / line ids
    this.keys = new Set();   // keys the prowler is carrying
    this.arrested = false;
    this.won = false;
  }
  once(id) { if (this.seen.has(id)) return false; this.seen.add(id); return true; }
  hasKey(id) { return this.keys.has(id); }
  giveKey(id) { this.keys.add(id); }
}
