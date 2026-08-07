// GOODFIRE radio.js — the dispatcher's 52 lines and the one-deep scheduler that speaks
// them. Voice bible (spec-season §15): lowercase always, laconic, wit is load-bearing,
// warmth is attention. The twist log line is NOT here — it is unattributed and lives in
// season.js. D-23 per canon-final §12. Params render via {name} substitution.

import { TICK_HZ } from './canon.js';

export const LINES = Object.freeze({
  // fire starts
  'D-1': "saw the whole thing from the tower. you'll do.",
  'D-2': 'smoke on bride creek. campers at the crossing left in a hurry. left their fire too.',
  'D-3': "halloran's burner is throwing sparks again. today one stuck in the decks. bring your legs.",
  'D-4': "somebody was jacklighting deer at the tin camp. their lantern's the size of a barn now. no moon. the fire will do your seeing.",
  'D-5': 'dry lightning walked the ridge about four this morning. i counted five strikes. then i stopped counting smokes.',
  'D-6': "petersen's hay truck threw a spark coming down the grade. wind's out of the north and the town is downhill. i don't like the arithmetic.",
  'D-7': "the hundredyear woke back up in the snags and the east wind found it. they're calling it the crown. no line holds this one. i checked the math twice.",
  // wind and weather
  'D-8': "wind's coming around {direction}. re-read it.",
  'D-9': 'shift coming. northwest, and it means it. finish the thought you\'re on.',
  'D-10': 'gusts to {n}. your ears knew before the grass did.',
  'D-11': "it's laying down. don't trust it yet.",
  'D-12': "evening's coming in damp. it'll quit now. they mostly do.",
  'D-13': 'dawn humidity. the night shift is over.',
  'D-14': 'first rain since june. it apologizes for nothing.',
  // the inversion
  'D-15': "state forester sent a paper. says we can light this mountain on purpose now — small and cool, when the weather's kind. i'll pencil you some dates. bring the torch.",
  'D-16': "no tanker for a planned burn. you don't call your grandmother to rake leaves.",
  'D-26': "it's stalling at the doghair lip. north slope's still holding june rain. lucky.",
  'D-27': "the saddle strike is out. rock doesn't owe lightning anything.",
  'D-28': "she did her best. crown fire doesn't read retardant.",
  'D-29': 'your black in the orchard is paying rent tonight. embers keep landing on nothing.',
  'D-30': "colored outside the lines a little. it's still a burn. stamp's yours.",
  // verbs and events
  'D-17': "the weavers moved to town years back. that's sheep memory up there. let it go if you need to.",
  'D-18': 'an escaped burn is still a burn. write it down. october will thank you.',
  'D-19': "truck's leaving.",
  'D-24': 'spot fire across your line. it jumped clean. they do that.',
  'D-25': "four spots, four catches. i'd clap but i'm holding coffee.",
  'D-33': 'there goes the propane. the polka station is off the air. some losses hit harder than others.',
  'D-36': "your black met its black. nothing left between them. that's the whole trick.",
  'D-37': "your burn's off the leash. happens. box it and we'll call it practice.",
  'D-38': "we lost the {name}. i wrote it down. that's what the book is for.",
  'D-39': "don't fret the cemetery. mowed grass won't carry it, and the residents have seen worse.",
  'D-40': 'i log the quiet too. easiest entries i write.',
  'D-41': "tanker's up. you'll hear her before you see her. everybody does.",
  'D-42': "she says hi. she says don't waste it.",
  // ledger intros (rotate)
  'D-20': 'all right. ledger time. numbers first, then the birds.',
  'D-21': 'the state gets numbers. the mountain gets the last word.',
  'D-22': "sit down, there's coffee. let's count what held.",
  'D-23': "ledger. i'll type, you drink something.", // canon-final §12 rewrite — no "breathe"
  // the crown
  'D-31': "it's catching its breath. don't catch yours.",
  'D-32': 'back. school shortwave. the kids left the antenna up. good kids.',
  'D-34': "state sent a second tanker. don't tell her she's the backup.",
  'D-35': 'it came up here looking for a meal. you spent all summer emptying the pantry the hard way.',
  'D-43': "it hit {month}'s black and split around it. it can't eat the same ground twice.",
  'D-44': "west side. the ewe bench. short grass — your kind of odds. i'll watch.",
  'D-45': "it's off the town. out of wind or out of food, i don't care which. millhaven's still on the map.",
  'D-46': 'we lost some roofs on north street. we did not lose the town. both true. the ledger holds both.',
  // snow and after
  'D-47': "look up. that's not ash.",
  'D-48': "first snow. season's closed. the mountain takes the watch till spring.",
  'D-49': 'fireweed. first again.',
  'D-50': "listen to the larder. loudest it's been in forty years. make of that what you want.",
  'D-51': "the birds don't read ledgers. good thing — the spelling's terrible.",
  'D-52': 'same tower next june. bring your legs. — v.',
});

export const LEDGER_INTROS = ['D-20', 'D-21', 'D-22', 'D-23']; // rotate per ceremony

// Generic chatter — droppable, preemptable. Everything else is a scripted beat.
const GENERIC = new Set(['D-8', 'D-10', 'D-11', 'D-24', 'D-25', 'D-39', 'D-40']);

// Lines that only land once per fire; repeats read as a broken record, not a dispatcher.
// (D-38/D-43 repeat legitimately with different params — they key on rendered text.)
const ONCE_PER_FIRE = new Set(['D-9', 'D-11', 'D-17', 'D-24', 'D-25', 'D-26', 'D-27', 'D-28',
  'D-29', 'D-31', 'D-33', 'D-34', 'D-35', 'D-36', 'D-37', 'D-39', 'D-40', 'D-41', 'D-44']);

export const TYPE_CPS = 18;              // chars/s — her typing speed IS the pacing
export const HOLD_TICKS = 4 * TICK_HZ;   // 4 s hold after the line completes

// createRadio(hooks: { show?(text), audio? }) — the game layer renders from state();
// hooks.show fires once when a line begins (toast systems), hooks.audio.radioKey() gives
// the squelch + PTT click. tick() once per frame-or-sim-tick at 30 Hz.
export function createRadio(hooks = {}) {
  let tick = 0;
  let suppressUntil = -1;
  let cur = null;          // { id, text, typeTicks, t0 }
  let queued = null;       // one deep — the scheduler drops the stalest generic
  const said = new Set();  // once-only keys (id, or id+rendered text for param lines)

  function render(id, params) {
    let text = LINES[id];
    if (!text) return null;
    if (params) for (const [k, v] of Object.entries(params)) text = text.split('{' + k + '}').join(String(v));
    return text;
  }

  function start(item) {
    cur = { ...item, t0: tick, typeTicks: Math.max(1, Math.ceil(item.text.length / TYPE_CPS * TICK_HZ)) };
    if (hooks.audio && hooks.audio.radioKey) hooks.audio.radioKey();
    if (hooks.show) hooks.show(cur.text);
  }

  function say(id, params) {
    if (tick < suppressUntil) return false; // the log line owns the screen
    const text = render(id, params);
    if (text == null) return false;
    const onceKey = ONCE_PER_FIRE.has(id) ? id : (id === 'D-43' || id === 'D-38' ? id + '|' + text : null);
    if (onceKey && said.has(onceKey)) return false;
    const scripted = !GENERIC.has(id);
    const item = { id, text, scripted };
    if (!cur) { if (onceKey) said.add(onceKey); start(item); return true; }
    // busy: scripted preempts a generic mid-type; otherwise contend for the one queue slot
    if (scripted && !cur.scripted) {
      if (onceKey) said.add(onceKey);
      if (!queued || !queued.scripted) queued = null; // the interrupted generic's follower dies with it
      start(item);
      return true;
    }
    if (!queued) { if (onceKey) said.add(onceKey); queued = item; return true; }
    if (scripted && !queued.scripted) { if (onceKey) said.add(onceKey); queued = item; return true; }
    return false; // two scripted already in flight — the stalest newcomer waits for no slot
  }

  // suppress(untilTick): twist window / Static Point silence. Clears the air NOW (the
  // retro-cancel: whatever is typing or queued dies) and blocks new lines until the tick.
  function suppress(untilTick) {
    suppressUntil = Math.max(suppressUntil, untilTick);
    cur = null; queued = null;
  }

  function tickFn() {
    tick++;
    if (!cur) {
      if (queued && tick >= suppressUntil) { const q = queued; queued = null; start(q); }
      return;
    }
    const age = tick - cur.t0;
    if (age >= cur.typeTicks + HOLD_TICKS) {
      cur = null;
      if (queued && tick >= suppressUntil) { const q = queued; queued = null; start(q); }
    }
  }

  // state() → null when silent, else { id, text, chars, t01 }: chars = typed count for the
  // typewriter bar; t01 = whole-life progress (type + hold) for fades.
  function state() {
    if (!cur) return null;
    const age = tick - cur.t0;
    const chars = Math.min(cur.text.length, Math.floor(age / TICK_HZ * TYPE_CPS));
    const t01 = Math.min(1, age / (cur.typeTicks + HOLD_TICKS));
    return { id: cur.id, text: cur.text, chars, t01 };
  }

  // reset() at each fire start: once-flags and the air are per-fire, the voice is not
  function reset() { said.clear(); cur = null; queued = null; suppressUntil = -1; }

  return { say, tick: tickFn, suppress, state, reset, get now() { return tick; } };
}
