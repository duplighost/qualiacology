// The record. Side A and Side B in order, then the bonus track. Each entry loads its track module lazily.
// length: seconds (the groove widths on the record follow it). keepsake: what she leaves behind.
const test = () => import('./test/track.js');
// each track's own folder; the test track until that file exists
const own = (id) => () => import(`./${id}/track.js`).catch((e) => { console.warn(`track ${id}:`, e.message); return test(); });
const T = (id, side, n, title, boss, length, keepsake, load) => ({ id, side, n, title, boss, length, keepsake, load: load || own(id) });

// keepsake: what she leaves when she shatters (said on the results card); prize: how it looks in her groove
export const TRACKS = [
  T('sexy-trauma-costume', 'A', 1, 'Sexy Trauma Costume', 'THE CLERK', 214.9, 'her price tag'),
  T('your-car-is-at-the-bottom-of-the-lake', 'A', 2, 'YOUR CAR IS AT THE BOTTOM OF THE LAKE', 'THE PROBLEM SOLVER', 118.4, 'the spare key'),
  T('pretty-until-proven-guilty', 'A', 3, 'Pretty Until Proven Guilty', 'THE DEFENDANT', 166.9, 'her gold gavel'),
  T('makeup-sex-at-your-funeral', 'A', 4, 'Makeup Sex at Your Funeral', 'THE MOURNER', 214.8, 'the locket'),
  T('kiss-me-like-a-car-crash', 'B', 1, 'Kiss Me Like a Car Crash', 'THE WRECK', 150.5, 'her headlight'),
  T('i-fucked-your-dad', 'B', 2, 'I FUCKED YOUR DAD', 'THE EX', 241.4, 'the teddy bear'),
  T('rent-free', 'B', 3, 'Rent Free', 'THE TENANT', 307.6, 'her copy of the key'),
  T('reverse-psychology-degree', 'B', 4, 'Reverse Psychology Degree', 'THE DOCTOR', 206.4, 'the gold star'),
  T('ptsdream-girl', 'B', 5, 'PTSDream Girl', 'PTSDREAM GIRL', 263.0, 'the pin'),
  T('try-me-free', 'Bonus', 6, 'Try Me Free!', 'THE PRIZE INSIDE', 294.1, 'the prize'),
  T('grocery-store-at-2-am', 'Credits', 7, 'Grocery Store at 2 AM', '', 293.6, 'the plastic bag', () => import('./grocery-store-at-2-am/track.js')),
  { id: 'test', side: 'dev', n: 0, title: 'TEST', boss: 'TEST', length: 118, load: test },
  { id: 'kit-test', side: 'dev', n: 0, title: 'KIT TEST', boss: 'THE CLERK', length: 118, load: () => import('./kit-test/track.js') },
];
const PRIZE = { 'sexy-trauma-costume': 'tag', 'your-car-is-at-the-bottom-of-the-lake': 'key', 'pretty-until-proven-guilty': 'gavel', 'makeup-sex-at-your-funeral': 'locket',
  'kiss-me-like-a-car-crash': 'headlight', 'i-fucked-your-dad': 'teddy', 'rent-free': 'giltkey', 'reverse-psychology-degree': 'star', 'ptsdream-girl': 'pin', 'try-me-free': 'prize', 'grocery-store-at-2-am': 'bag' };
for (const t of TRACKS) t.prize = PRIZE[t.id];
export const trackById = (id) => TRACKS.find((t) => t.id === id) || TRACKS[TRACKS.length - 1];
