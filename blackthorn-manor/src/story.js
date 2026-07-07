// The case. Blackthorn Manor, Yorkshire. On All Hallows' Eve 1899 Lady
// Constance Blackthorn was found dead beneath the gallery, and her daughter
// Lily, nine years old, vanished the same night. The death was ruled a fall.
// It is 1904. You are a private inquiry agent hired by Constance's sister.

export const PERSONS = [
  { id: 'edmund', name: 'Sir Edmund Blackthorn', note: 'Master of the house. Shut the east wing after the tragedy; died of grief in 1901.' },
  { id: 'constance', name: 'Lady Constance Blackthorn', note: 'Found dead beneath the gallery, All Hallows’ Eve 1899. The inquest ruled it a fall.' },
  { id: 'lily', name: 'Lily Blackthorn', note: 'Nine years old. Vanished the night her mother died. Never found.' },
  { id: 'victor', name: 'Victor Blackthorn', note: 'Sir Edmund’s younger brother. A gambler. Drowned crossing the moor in 1901.' },
  { id: 'grady', name: 'Mrs. Grady', note: 'The housekeeper. Dismissed when the wing was sealed; left letters behind.' },
  { id: 'wicks', name: 'Tom Wicks', note: 'The groundskeeper. Left Blackthorn without notice that same winter.' },
  { id: 'marsh', name: 'Dr. Josiah Marsh', note: 'The county coroner. Ruled the death accidental. Retired suddenly in 1900.' },
];

export const CLUES = {
  clipping:   { title: 'The Newspaper Cutting', core: false, desc: 'The Whitby Gazette, 3rd November 1899 — “TRAGEDY AT BLACKTHORN.” A fall. A missing child. An inquest closed within the week.' },
  coroner:    { title: 'The Coroner’s Confession', core: true, desc: 'Dr. Marsh found bruises above her elbows, and a brass button clenched in her hand — and was made to stay silent. Someone held her before she fell.' },
  ledger:     { title: 'The Forged Cheques', core: true, desc: 'Cheques drawn on the estate in Sir Edmund’s hand — but the hand is wrong. Thousands of pounds, all in the year before her death.' },
  ious:       { title: 'Victor’s Debts', core: true, desc: 'Markers from a Leeds gaming house, signed V.B. He owed more than the estate earned in three years — and someone was paying.' },
  diary:      { title: 'Constance’s Diary', core: true, desc: '“The signatures are not my husband’s. Tonight, after the guests go down, I will have it out with V. on the gallery, away from little ears.”' },
  coat:       { title: 'The Coat Without a Button', core: true, desc: 'Victor’s good black coat, hanging in his press. The second brass button has been torn away, cloth and all.' },
  balustrade: { title: 'The Broken Balustrade', core: true, desc: 'The gallery rail above the foyer, splintered outward and roped off. Wood does not break outward when someone merely falls against it.' },
  drawing:    { title: 'Lily’s Drawing', core: true, desc: 'A child’s crayon drawing: mama at the rail, and behind her a man with a golden watch-chain, arms out. The paper is scored through where his face should be.' },
  gradyLetter:{ title: 'Mrs. Grady’s Unsent Letter', core: false, desc: 'The housekeeper heard the quarrel over money that night — and saw Victor at the library fire before dawn, burning papers.' },
  edmundJournal:{ title: 'Sir Edmund’s Journal', core: false, desc: 'A man unravelling. He heard his daughter’s voice in the walls, and sealed the east wing so no one would hear her but him.' },
  lilyDiary:  { title: 'Lily’s Little Book', core: true, desc: '“Papa showed me the priest’s hole under the church room. If Uncle V. is cross again that is where I shall hide, and no one will ever find me.”' },
  shoe:       { title: 'The Priest Hole', core: false, desc: 'A child’s shoe, a stub of chalk, and drawings on the stone: a house, a lady, a sun. She was here — and then she was not.' },
  wicksLetter:{ title: 'Tom Wicks’ Testament', core: true, desc: 'The groundskeeper found her in the priest hole two nights after. He feared Victor, so he told no one — he carried her out through the tunnel and away.' },
  sisterLetters:{ title: 'Letters from Whitby', core: false, desc: 'Letters to Constance from her sister Margaret in Whitby — the same sister who has now hired you. The trunk smells of lavender and dust.' },
};

export const KEYS = {
  deskKey:    { name: 'A Small Desk Key', desc: 'Found in Sir Edmund’s coat. It smells of pipe smoke.' },
  chapelKey:  { name: 'The Chapel Key', desc: 'Cold iron, hidden behind Lady Constance’s portrait.' },
  nurseryKey: { name: 'The Nursery Key', desc: 'From Constance’s jewel box. She kept her daughter’s door locked at night. Against whom?' },
  eastwingKey:{ name: 'The East Wing Key', desc: 'From Sir Edmund’s desk. It unlocks the corridor he sealed.' },
  atticKey:   { name: 'The Attic Key', desc: 'From the housekeeper’s key-board, labelled in faded ink.' },
};

/* ------------------------------------------------------------------ */
/*  DOCUMENTS                                                          */
/* ------------------------------------------------------------------ */
export const DOCS = {
  intro: {
    title: 'From the desk of Margaret Ashworth',
    body: `Mr. Hollis —

Five years ago my sister Constance died at Blackthorn Manor, and my niece Lily vanished from the earth. The inquest took four days to decide that a healthy woman of one-and-forty simply fell over a rail she had leaned upon a thousand times.

Everyone who lived in that house is now dead, or gone, or silent. The house alone remains.

I have purchased the keys. Go in, Mr. Hollis. Stay the night if you must. Find out what happened to my sister — and if there is any mercy left in Yorkshire, find out what became of the child.

— M.A.`,
  },
  clipping: {
    title: 'The Whitby Gazette — 3rd November 1899',
    body: `TRAGEDY AT BLACKTHORN MANOR

The county was grieved to learn of the death of Lady Constance Blackthorn, wife of Sir Edmund Blackthorn, upon the night of the 31st October. Her ladyship is understood to have fallen from the gallery of the great hall.

Graver still is the disappearance of the Blackthorns’ daughter, Lily, aged nine, who has not been seen since that night, despite the dragging of the mere and the search of the moor by forty men.

Dr. J. Marsh, coroner, has recorded a verdict of accidental death. Sir Edmund has closed the house to all callers.`,
    clue: 'clipping',
  },
  coroner: {
    title: 'Letter, sealed — Dr. Josiah Marsh',
    body: `To whomever has the courage to open this drawer.

I write what I was not permitted to record.

There was bruising above both elbows, deep, in the shape of gripping fingers. Her ladyship was held — held hard — before she went over. And in her right hand, clenched so fast that I must needs break two of her fingers to free it, was a <em>brass coat button</em>, torn away with its thread.

I showed these things to the magistrate. I was told that the family had suffered enough, that the verdict would be accidental death, and that my pension would be considered in the light of my discretion.

God forgive me, I signed. I am an old man. But I kept this letter, because somebody one day ought to know that Constance Blackthorn did not simply fall.

— J. Marsh, M.D.`,
    clue: 'coroner',
  },
  ledger: {
    title: 'The Estate Cheque-Book',
    body: `A cheque-book of the Yorkshire Penny Bank, hidden behind the false spine of “Sermons, Vol. IX”.

Fourteen cheques drawn in the year 1899, each signed <em>Edmund Blackthorn</em> — nine hundred pounds, four hundred pounds, one thousand two hundred pounds…

You have seen Sir Edmund’s true hand on the estate papers downstairs. It is nothing like this. The E leans the wrong way. The B is looped like a schoolboy’s.

Someone in this house was bleeding the estate white, and signing Edmund’s name to do it. On the last stub, in a woman’s hand, pencilled faint: <em>“I know.”</em>`,
    clue: 'ledger',
  },
  ious: {
    title: 'Markers from the Golden Fleece Club, Leeds',
    body: `A bundle of gaming markers tied with string, stuffed into a riding boot.

“V.B. owes the house £340.” — “V.B. owes Mr. Kessler £1,100, to be paid before Michaelmas, else.” — the word <em>else</em> is underlined twice.

There are nineteen of them. The dates crowd closer together through 1899, and the sums grow monstrous. The last is dated the 29th of October — two days before Lady Constance died.

Whoever V.B. was, by that autumn he was a drowning man — and drowning men clutch at anything.`,
    clue: 'ious',
  },
  diary: {
    title: 'The Diary of Constance Blackthorn — final entry',
    body: `30th October 1899

The bank has written to Edmund again and again I have burned the letter before he rises. Not to protect V. — God knows — but because Edmund’s heart would not survive knowing what his brother is.

But it must end. The cheques are not Edmund’s hand. I have kept the book as proof.

Tomorrow night, when the servants are at the Hallows’ fire and Lily is abed, I will have it out with V. on the gallery, away from little ears. I shall give him one chance to leave this house forever.

I am not afraid of him. He is weak. That is the whole of his tragedy — he was never strong enough to be good.`,
    clue: 'diary',
  },
  gradyLetter: {
    title: 'Unsent letter — Mrs. E. Grady',
    body: `My dear sister —

I must set it down or it will eat me.

On the night her ladyship died I was last from the bonfire, having the kitchen to shut. Crossing the yard I heard them above — her ladyship’s voice, cold as I never heard it, saying <em>you will sign nothing more in this house</em> — and a man’s voice pleading, then not pleading.

Then the crash, and the screaming of the little one somewhere high in the dark, and then nothing at all.

And sister — before dawn, when the house was all constables and weeping, I passed the library and saw Mr. Victor at the grate, feeding papers to the fire, steady as a man shovelling coal.

I said nothing. Sir Edmund pays my wage and Mr. Victor frightens me. I am an old coward and I shall post this letter never.

— E.G.`,
    clue: 'gradyLetter',
  },
  edmundJournal: {
    title: 'Journal of Sir Edmund Blackthorn',
    body: `12th January 1900. They have stopped dragging the mere. I did not tell them that Lily fears water and would never have gone near it. Where does a child go?

4th March. Victor speaks of selling the manor. There is something in the way he cannot sit still in this house. Grief takes men strangely, but this is not grief. I have looked at the accounts. I am not such a fool as my brother believes.

19th March. I heard her tonight. Lily. Singing — very small, very far, under the floors, inside the walls. Grady says it is the wind in the old tunnel. I have dismissed Grady.

2nd April. I have sealed the east wing. If she is in the walls of this house, then she is mine, and no one shall disturb her. I hear her most near the old chapel. I am not mad. A father knows his child’s voice.

I am so tired. If you find this, whoever you are — listen for her. Please. Listen.`,
    clue: 'edmundJournal',
  },
  lilyDiary: {
    title: 'Lily’s Little Book',
    body: `A child’s copy-book, hidden at the back of the wardrobe. Pressed flowers. A drawing of a dog she was not allowed to have.

“Papa showed me a secret today!!! Under the church room there is a room the old priests hid in, behind the wall with the loose stone. Papa says NO ONE has found it in two hundred years. It is our secret, mine and Papas.”

“Uncle V. shouted at Mama again about munny. When he is cross his face goes wrong, like a face in a dream. If he is ever cross at ME I shall run to the priest hole and pull the stone and no one will ever find me, not ever.”

The last pages are empty.`,
    clue: 'lilyDiary',
  },
  wicksLetter: {
    title: 'Testament of Thomas Wicks — left in the dark',
    body: `If anyone ever finds this hole in the earth, then you have found the truth of Blackthorn, so read on.

Two nights after her ladyship died I was in the tunnel about the pipes, and I heard crying in the wall. I knew the old priest hole from my father, that was groundskeeper before me. I pulled the stone and there was Miss Lily, gone quiet as a bird, half dead of cold and thirst.

She would not come out at first. She kept saying — <em>I saw Uncle push Mama. I saw it through the rails. He looked for me after. He called so kindly and looked so hard.</em>

I ought to have gone to the law. But the law had already spoke — accident, it said — and Mr. Victor stood to be master of us all, and I am one man with a spade.

So I did the only thing my heart would allow. I fed her, and when the moon was down I carried her out the old tunnel, over the moor to my cousin Ann at Whitby, that has no children and a kind husband and asks no questions.

I left her shoe and this paper where the truth happened, so the truth would live somewhere, even in the dark.

If you are reading this — she lived. Tell them she lived.

— T. Wicks, November 1899`,
    clue: 'wicksLetter',
  },
  sisterLetters: {
    title: 'Letters from Whitby, tied with ribbon',
    body: `Dozens of letters to Constance from her sister Margaret, spanning twenty years — small news, pressed thrift-flowers, a recipe against chilblains.

The last is dated the 28th of October 1899:

“…and dearest C., whatever this trouble with the accounts may be, do nothing rash and above all do nothing ALONE. Men who are weak are not therefore harmless. Come to Whitby with Lily for the winter. The sea air will do you both good, and V. may rot.

Your loving M.”

She was three days too late.`,
    clue: 'sisterLetters',
  },
  chapelNote: {
    title: 'Card left upon the altar',
    body: `In a shaking hand — Sir Edmund’s hand, from his last year:

“I have had the crypt opened and closed again. She is not among her mothers and fathers. I hear her below this floor and yet she is not IN it. I do not understand what God means by this.

If you hear singing, it is my daughter. Be kind to her. She is afraid of the dark.”`,
  },
  frontDoorNote: {
    title: 'Notice fixed to the door',
    body: `BY ORDER OF THE EXECUTORS

This house and all its contents stand in trust. No person shall enter without written leave of Ashworth & Crane, solicitors, Whitby.

(You have such leave — Margaret Ashworth’s letter of engagement is in your coat pocket. The wind has been at this notice for years; it hangs by one nail.)`,
  },
};

/* ------------------------------------------------------------------ */
/*  ACCUSATION                                                          */
/* ------------------------------------------------------------------ */
export const ACCUSE = {
  intro: 'The air on the landing turns to ice. She is here — the lady of the house, waiting these five years for someone to say it aloud.',
  questions: [
    {
      id: 'who', label: 'Who sent Constance over the rail?',
      options: [
        { id: 'edmund', text: 'Sir Edmund, her husband' },
        { id: 'victor', text: 'Victor, his brother' },
        { id: 'marsh', text: 'Dr. Marsh, the coroner' },
        { id: 'wicks', text: 'Tom Wicks, the groundskeeper' },
      ], answer: 'victor',
    },
    {
      id: 'how', label: 'How did she die?',
      options: [
        { id: 'accident', text: 'She fell — an accident after all' },
        { id: 'pushed', text: 'Seized by the arms and forced over the gallery rail' },
        { id: 'poison', text: 'Poisoned, the fall arranged after' },
        { id: 'struck', text: 'Struck down with a candlestick' },
      ], answer: 'pushed',
    },
    {
      id: 'why', label: 'Why did she die?',
      options: [
        { id: 'affair', text: 'A love affair discovered' },
        { id: 'inherit', text: 'Her inheritance' },
        { id: 'forgery', text: 'She had proof of his forged cheques and gambling debts' },
        { id: 'leaving', text: 'She threatened to leave the house' },
      ], answer: 'forgery',
    },
    {
      id: 'lily', label: 'And the child — what became of Lily?',
      options: [
        { id: 'died', text: 'She died hidden in the priest hole' },
        { id: 'saved', text: 'Tom Wicks found her and carried her away to safety' },
        { id: 'taken', text: 'Victor took her and silenced her' },
        { id: 'moor', text: 'She ran into the moor and was lost' },
      ], answer: 'saved',
    },
  ],
};

export const ENDINGS = {
  win: `You speak it plainly, into the cold: Victor Blackthorn forged his brother's name, and when Constance confronted him upon the gallery he seized her by the arms and put her over the rail. Lily saw it through the balusters — and Lily LIVED. Tom Wicks carried her over the moor to Whitby, to a cousin's hearth, five miles from where her aunt has grieved for five years.

For a long moment the house holds its breath.

Then — warmth. The candles stand straight. Somewhere above, a door that has been slamming for five years quietly closes. The grey lady on the landing looks at you, and her face is no longer a wound; and between one heartbeat and the next, where she stood, there is only dawn coming through the tall windows.

—

Three days later, in a cottage above the harbour at Whitby, a young woman of fourteen answers the door to her aunt Margaret. She has her mother's eyes.

You take your fee, and you never tell anyone what freed the house — only what you proved. It is enough.

BLACKTHORN MANOR
— the truth, at last —`,
  wrongShort: 'The cold deepens. The candles gutter and die. That is not the truth — and she knows it. Look again. The house keeps its evidence.',
};

/* ------------------------------------------------------------------ */
/*  GAME STATE                                                          */
/* ------------------------------------------------------------------ */
export class GameState {
  constructor() {
    this.clues = new Set();
    this.keys = new Set();
    this.docsRead = new Set();
    this.flags = {};        // arbitrary event flags
    this.accused = false;
    this.won = false;
  }
  addClue(id) { if (!CLUES[id] || this.clues.has(id)) return false; this.clues.add(id); return true; }
  addKey(id) { if (this.keys.has(id)) return false; this.keys.add(id); return true; }
  hasKey(id) { return this.keys.has(id); }
  coreCluesFound() {
    return Object.keys(CLUES).filter(c => CLUES[c].core && this.clues.has(c)).length;
  }
  coreCluesTotal() {
    return Object.keys(CLUES).filter(c => CLUES[c].core).length;
  }
  readyToAccuse() { return this.coreCluesFound() >= this.coreCluesTotal(); }
}

export const OBJECTIVES = [
  { id: 'obj1', text: 'Search Blackthorn Manor. Learn what truly happened on All Hallows’ Eve, 1899.', done: s => s.readyToAccuse() },
  { id: 'obj2', text: 'Find who was bleeding the estate of money.', done: s => s.clues.has('ledger') && s.clues.has('ious') },
  { id: 'obj3', text: 'Learn what the coroner would not record.', done: s => s.clues.has('coroner') },
  { id: 'obj4', text: 'Discover what Lily saw — and where she went.', done: s => s.clues.has('lilyDiary') && s.clues.has('wicksLetter') },
  { id: 'obj5', text: 'When you know the whole truth, face the lady on the grand staircase.', done: s => s.won },
];
