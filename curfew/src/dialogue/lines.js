// THE LINE CATALOGUE. The Eleven rewire.
//
// ALEX: "one central system; NPC files and companions request lines, they never play audio
// themselves; every line has a stable id, speaker, subtitle, audio file, world anchor,
// priority, interruptibility, once/repeatable, cooldown, conditions, optional follow-up."
//
// AN ID IS A PROMISE. Once a line has been recorded against an id, that id never changes and
// never means anything else: the wav on disk is named for it. Change the words, keep the id,
// and re-record — never the other way round.
//
// A line with no `file`, or whose file is missing from assets/voices, plays as a SUBTITLE
// ONLY. That is the normal state of this table, on purpose. Alex: "We don't need all those
// lines for characters recorded into voice right now." Only the lines that gate play are
// baked (tools/bake-voices.ps1); the rest ship as text and get a voice when he records one.
//
// FIELDS
//   speaker    who is talking. Shown as the subtitle's eyebrow; also the handle stop() takes.
//   text       the subtitle. Required, even when there is audio: it is the fallback AND the
//              accessibility path, and a line with no words on screen is not in this system.
//   file       a wav under assets/voices. Missing is fine and is logged once, never thrown.
//   priority   1..9. A higher one cuts a line marked `interrupt: true`.
//   once       spoken at most once per save (progress.dialogueOnce).
//   cooldownS  the soonest this id may be heard again.
//   interrupt  may be cut off by something more important. Chatter yes, the radio no.
//   resume     after being cut, the chain picks up at `next` instead of being abandoned.
//   when(ctx)  a condition, checked at say() time. False = the line simply does not happen.
//   next       the id spoken straight after this one. This is what makes a conversation.
//   durS       how long the subtitle holds with no audio. Defaults to the reading time.
//   audibleR   metres. Past this, a world speaker is not heard at all. Radio and car anchors
//              are always audible: you are inside the thing making the sound.

export const LINES = Object.freeze({

  /* ------------------------------------------------------------------- the radio -- */

  // THE OPENING, in the garage, the moment the lights fail and the clock falls back.
  //
  // 2026-09-15. Alex: "i need you to also have like, a voice say 'One Saved Message' Before
  // this one comes on." So it is not a broadcast arriving live any more — it is a message
  // that was left BEFORE tonight, on the machine on the bench, and the machine says so first.
  // That is what makes a radio knowing her name make sense: it never did. Somebody who knew
  // it called, and the tape kept it.
  //
  // The two are ONE beat and the dialogue lane already owns that: `next` plays the message
  // the moment the announcement ends, and the pause between them is the lane's own pacing
  // (0.25 s of pad plus a 0.35 s fade, measured, plus the 0.16 s tail left on the wav) —
  // about three quarters of a second, which is what a machine does before it plays the tape.
  //
  // Priority 9 and interrupt:false on both: nothing in the county cuts this.
  'radio.answerphone': {
    speaker: 'the machine',
    text: 'One saved message.',
    file: 'answerphone-saved.wav',
    priority: 9, once: true, interrupt: false, next: 'radio.opening',
  },
  'radio.opening': {
    speaker: 'radio',
    text: 'Oriana. If it gets light before the bell, it is not morning. Stay off the road until you hear it.',
    file: 'radio-opening.wav',
    priority: 9, once: true, interrupt: false,
  },

  /* ------------------------------------------------------------- the tower keepers -- */

  'keeper.hello': {
    speaker: 'keeper', text: 'Long way up. Long way back down.',
    file: 'mechanic-hello-1.wav', priority: 2, cooldownS: 65, interrupt: true,
  },
  'keeper.hello2': {
    speaker: 'keeper', text: 'You are the one with the car.',
    file: 'mechanic-hello-2.wav', priority: 2, cooldownS: 65, interrupt: true,
  },
  'keeper.gas': {
    speaker: 'keeper', text: 'One can. It fills it.',
    priority: 3, cooldownS: 4, interrupt: true,
  },
  'keeper.look': {
    speaker: 'keeper', text: 'From up here you can see nearly to the water. Take a minute.',
    priority: 3, cooldownS: 4, interrupt: true,
  },
  'keeper.nothing': {
    speaker: 'keeper', text: 'Nothing out there you have not already stood in.',
    priority: 3, cooldownS: 20, interrupt: true,
  },

  /* --------------------------------------------------------------------- the town -- */

  'hale.home': {
    speaker: 'Hale',
    text: 'You have brought the Eleven home, Oriana. I can feel the stone wanting it back.',
    priority: 6, once: true, next: 'hale.bell', interrupt: false,
  },
  'hale.bell': {
    speaker: 'Hale',
    text: 'The day bell. The priory tower in the north pines. Ring it in the Black Hour with your car in the yard, where the bell can see it. Then drive east. All the way to Morning.',
    priority: 6, once: true, interrupt: false,
  },
  // Vera keeps the days. She says the name once, on the first meeting, and never again.
  'vera.name': {
    speaker: 'Vera', text: 'Oriana. I have a page for you.',
    priority: 5, once: true, interrupt: true,
  },

  /* -------------------------------------------------------------------- Oriana -- */
  //
  // HER OWN LINES. Subtitle only, unrecorded, at most one per conversation, and every one of
  // them is a refusal. Alex: "what she recognises, what she refuses to explain." She is not
  // a character who explains; nothing here tells you anything about her.

  'oriana.no':    { speaker: 'Oriana', text: 'No.', priority: 4, cooldownS: 30, interrupt: true },
  'oriana.later': { speaker: 'Oriana', text: 'Later.', priority: 4, cooldownS: 30, interrupt: true },
  'oriana.name':  { speaker: 'Oriana', text: 'Everyone keeps saying that.', priority: 4, once: true, interrupt: true },
  'oriana.bell':  { speaker: 'Oriana', text: 'A bell.', priority: 4, cooldownS: 20, interrupt: true },
  'oriana.somebody': { speaker: 'Oriana', text: 'Somebody is.', priority: 4, cooldownS: 20, interrupt: true },

  /* ------------------------------------------------------------------ companions -- */
  //
  // GREER, Eelwater. The badass. Eel-trapper, hunts what the Mire Bride leaves. Flat and
  // competent; she never asks how you are and never says anything twice.

  'greer.meet':   { speaker: 'Greer', text: 'You came in on the boards. Most people go through them.', priority: 5, once: true },
  'greer.meet2':  { speaker: 'Greer', text: 'I trap eels. What is left of them. Something upriver got into the water and the water got into everything.', priority: 5, once: true, next: 'greer.meet3' },
  'greer.meet3':  { speaker: 'Greer', text: 'I know where she stands. The Bride. I have watched her from a post at forty metres and she never once looked up.', priority: 5, once: true },
  'greer.join':   { speaker: 'Greer', text: 'Right. I have got the road.', priority: 6, once: true },
  'greer.wait':   { speaker: 'Greer', text: 'I will be here.', priority: 5, cooldownS: 8 },
  'greer.boss':   { speaker: 'Greer', text: "This one's yours. I've got the road.", priority: 5, cooldownS: 90, interrupt: true },
  'greer.fen':    { speaker: 'Greer', text: 'Keep to the boards.', priority: 3, cooldownS: 70, interrupt: true },
  'greer.idle':   { speaker: 'Greer', text: "We're burning the hour.", priority: 2, cooldownS: 120, interrupt: true },
  'greer.aware':  { speaker: 'Greer', text: 'Something has us.', priority: 7, cooldownS: 25, interrupt: false },
  'greer.car':    { speaker: 'Greer', text: 'It is taking that better than I would.', priority: 3, cooldownS: 90, interrupt: true },
  'greer.oriana': { speaker: 'Greer', text: 'Oriana. Eyes up.', priority: 4, cooldownS: 180, interrupt: true },

  // ROAN, The Cut. The nasty one. Ex-toll man, charming, never stops trying, never lands it.
  // Alex: "a nasty dude who always hits on the player character." She shuts it down dry every
  // time, in four words or fewer. No romance, no payoff — the joke IS that it never lands.

  'roan.meet':    { speaker: 'Roan', text: "You drive like somebody's waiting for you.", priority: 5, once: true, next: 'roan.meet2' },
  'roan.meet2':   { speaker: 'Oriana', text: 'Somebody is.', priority: 5, once: true, next: 'roan.meet3' },
  'roan.meet3':   { speaker: 'Roan', text: 'Lucky somebody.', priority: 5, once: true, next: 'roan.meet4' },
  'roan.meet4':   { speaker: 'Oriana', text: 'A bell.', priority: 5, once: true },
  'roan.toll':    { speaker: 'Roan', text: 'I worked a toll for nine years. You learn who is running and who is just driving.', priority: 5, once: true, next: 'roan.toll2' },
  'roan.toll2':   { speaker: 'Roan', text: 'You are running. I like that in a person.', priority: 5, once: true },
  'roan.lead':    { speaker: 'Roan', text: 'There is a box up the county nobody has opened. I will tell you where. Free. Because I am generous.', priority: 5, once: true },
  'roan.join':    { speaker: 'Roan', text: 'After you. Always after you.', priority: 6, once: true },
  'roan.wait':    { speaker: 'Roan', text: 'I will keep the kiln warm.', priority: 5, cooldownS: 8 },
  'roan.boss':    { speaker: 'Roan', text: 'I will hold your coat.', priority: 5, cooldownS: 90, interrupt: true },
  'roan.idle':    { speaker: 'Roan', text: 'You have not asked me anything about myself.', priority: 2, cooldownS: 120, interrupt: true },
  'roan.idle2':   { speaker: 'Roan', text: 'Long night. Could be longer.', priority: 2, cooldownS: 150, interrupt: true },
  'roan.aware':   { speaker: 'Roan', text: 'That is not me breathing.', priority: 7, cooldownS: 25, interrupt: false },
  'roan.car':     { speaker: 'Roan', text: 'Careful. She is the only one of us insured.', priority: 3, cooldownS: 90, interrupt: true },
  'roan.oriana':  { speaker: 'Roan', text: 'Oriana. Lovely name. Terrible hours.', priority: 4, cooldownS: 180, interrupt: true },

  // TOBIN, Highwood. The man in the bedsheet. Alex: "a dude with a bedsheet over his body as
  // a ghost costume." He has not taken it off since the last night the sun set, and he never
  // explains it. Nobody in the hamlet mentions it either. Deadpan.

  'tobin.meet':   { speaker: 'Tobin', text: 'Evening.', priority: 5, once: true, next: 'tobin.meet2' },
  'tobin.meet2':  { speaker: 'Tobin', text: 'The party was up here. Then it got dark and stayed dark, and it seemed rude to change.', priority: 5, once: true },
  'tobin.party':  { speaker: 'Tobin', text: 'Sarah did the skeletons. They are paper. Six years of rain and they are still up.', priority: 5, once: true, next: 'tobin.party2' },
  'tobin.party2': { speaker: 'Tobin', text: 'You take a costume off in the morning. That is the whole rule.', priority: 5, once: true },
  'tobin.join':   { speaker: 'Tobin', text: 'I will need the back seat.', priority: 6, once: true },
  'tobin.wait':   { speaker: 'Tobin', text: 'I will haunt the porch.', priority: 5, cooldownS: 8 },
  'tobin.boss':   { speaker: 'Tobin', text: "They don't like the sheet either.", priority: 5, cooldownS: 90, interrupt: true },
  'tobin.car':    { speaker: 'Tobin', text: "I'll sit in the back.", priority: 3, cooldownS: 90, interrupt: true },
  'tobin.false':  { speaker: 'Tobin', text: "That's not it.", priority: 6, cooldownS: 200, interrupt: false },
  'tobin.idle':   { speaker: 'Tobin', text: 'Nothing up here but us and the lanterns.', priority: 2, cooldownS: 120, interrupt: true },
  'tobin.aware':  { speaker: 'Tobin', text: 'Do not run. It is worse if you run.', priority: 7, cooldownS: 25, interrupt: false },
  'tobin.oriana': { speaker: 'Tobin', text: 'Oriana. You would have liked the party.', priority: 4, cooldownS: 180, interrupt: true },

});

export const LINE_IDS = Object.freeze(Object.keys(LINES));

/** Reading time when a line has no audio: about 16 characters a second, never under 2.4 s. */
export function readingTime(text) {
  return Math.max(2.4, (text ? text.length : 0) / 16);
}

export default LINES;
