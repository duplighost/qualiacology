/* The route. One afternoon, one direction, hand-placed.
 *
 * Ground nodes are metres, y up. Props sit at a metre mark. Chapters are
 * ranges, and each one asks a different question of the same hand:
 *
 *   1 THE STREET    both directions of the rope, taught by the rope
 *   2 THE CROSSING  holding on is the loving act
 *   3 THE PARK      the cart says hold on, the pack run says let go
 *   4 THE VIADUCT   a climb you cannot make without gripping, then a gap you
 *                   cannot make while gripping
 *   5 THE BEACH     no obstacles, no rope, and whatever you built
 */

import { makeProp } from './world.js';

const G = [];
const g = (x, y) => G.push({ x, y });

/* --- 1. the street ---------------------------------------------------- */
g(-8, 1.6); g(0, 1.6); g(2.6, 1.6); g(4.2, 0);        // the stoop and its step
g(30, 0);
g(31.0, 0); g(32.2, 0.92); g(35.6, 0.92); g(36.8, 0);   // a garden wall, standable
g(74, 0);
g(84, -1.2); g(96, -5.4); g(108, -7.6); g(118, -8.0);  // the hill that tows you
g(150, -8.0);
g(160, -8.6); g(176, -8.6);
g(180, -7.0); g(186, -5.2);                            // a pinch too steep to walk
g(196, -4.4); g(214, -4.4);
g(220, -5.6); g(238, -6.4);
g(246, -6.4); g(247.5, -5.1); g(251.5, -5.1); g(253, -6.4);   // a low wall
g(286, -6.6); g(300, -7.4); g(320, -7.6);

/* --- 2. the crossing -------------------------------------------------- */
g(324, -7.9); g(330, -8.05); g(408, -8.05); g(414, -7.9); g(420, -7.6);

/* --- 3. the park ------------------------------------------------------ */
g(432, -6.8); g(448, -5.9); g(462, -6.6); g(478, -5.4);
g(494, -6.1); g(512, -4.9); g(528, -5.3); g(544, -4.2);
g(560, -4.8); g(578, -3.9); g(596, -4.6); g(612, -3.4);
g(620, -3.9); g(632, -4.6); g(644, -3.9);              // the dip with the pond
g(662, -3.2); g(684, -3.8); g(706, -2.6); g(730, -3.2);
g(752, -2.2); g(776, -2.6); g(796, -1.8);

/* --- 4. the viaduct --------------------------------------------------- */
g(812, -1.4); g(828, -0.6);
/* Five pitches at about forty degrees with small ledges between them. A kid
 * cannot walk up forty degrees. The dog can. That is the entire lesson, and
 * nobody has to say it. */
g(834, 4.4); g(837, 4.8);
g(843, 9.8); g(846, 10.2);
g(852, 15.0); g(855, 15.4);
g(861, 19.6); g(865, 20.0);
g(870, 22.4); g(876, 22.6);
g(940, 22.6);                                          // the lip, and the sea
g(940.01, -6.0); g(945.4, -6.0); g(945.41, 22.6);      // the gap
g(972, 22.6);

/* --- 5. the beach ----------------------------------------------------- */
g(986, 19.4); g(1002, 15.0); g(1020, 10.6); g(1040, 7.0);
g(1062, 4.4); g(1086, 2.6); g(1112, 1.4); g(1140, 0.7);
g(1170, 0.35); g(1200, 0.1); g(1240, -0.1); g(1300, -0.6);

const P = [];
const p = (kind, x, extra) => P.push(makeProp(kind, x, extra));

/* --- street ---------------------------------------------------------- */
p('pigeons', 15, { count: 9, high: 0.3, pull: 0.92, r: 20 });
p('bin', 24);
p('grass', 33);
p('puddle', 44, { high: 0.1 });
p('hydrant', 58, { pull: 0.42 });
p('lamppost', 70);
p('grass', 92);
p('bin', 121);
p('grass', 134);
p('cat', 162, { high: 1.2, pull: 0.94, r: 22 });
p('lamppost', 192);
p('grass', 205);
p('hydrant', 228, { pull: 0.40 });
p('bin', 262);
p('grass', 274);
p('pigeons', 292, { count: 6, high: 0.3, pull: 0.84, r: 16 });
p('lamppost', 316);

/* --- crossing -------------------------------------------------------- */
p('lamppost', 328);
p('cat', 404, { high: 0.5, pull: 0.98, r: 26 });
p('lamppost', 416);

/* --- park ------------------------------------------------------------ */
p('tree', 430, { pull: 0.26, r: 3 });
p('grass', 436);
p('bench', 448, { pull: 0.2, r: 2.5 });
p('ball', 458, { high: 0.2 });
p('grass', 470);
p('tree', 476, { pull: 0.26, r: 3 });
p('sprinkler', 486, { high: 0.4, pull: 0.62 });
p('grass', 502);
p('tree', 508, { pull: 0.26, r: 3 });
p('bin', 516);
p('cart', 544, { high: 0.9, pull: 1.0, r: 13 });
p('grass', 572);
p('bench', 586, { pull: 0.2, r: 2.5 });
p('tree', 596, { pull: 0.26, r: 3 });
p('puddle', 604, { high: 0.1, pull: 0.42 });
p('grass', 628);
p('tree', 648, { pull: 0.26, r: 3 });
p('tree', 664, { pull: 0.26, r: 3 });
p('otherdog', 690, { high: 0.6, pull: 0.99, r: 22 });
p('grass', 742);
p('bench', 726, { pull: 0.2, r: 2.5 });
p('tree', 752, { pull: 0.26, r: 3 });
p('bin', 764);
p('tree', 778, { pull: 0.26, r: 3 });
p('lamppost', 792);

/* --- viaduct --------------------------------------------------------- */
p('grass', 820);
p('grass', 858);
p('gulls', 954, { high: 5.5, pull: 1.0, r: 40 });

/* --- beach ----------------------------------------------------------- */
p('grass', 1000);
p('grass', 1048);
p('grass', 1104);
p('grass', 1168);
p('sea', 1296, { high: 0.4, pull: 0.72, r: 90 });

export const ROUTE = {
  ground: G,
  props: P,
  gaps: [{ x0: 940, x1: 945.4, lip: 22.6, floor: -6 }],
  chapters: [
    { x: -8,   id: 'street',   name: 'the street' },
    { x: 322,  id: 'crossing', name: 'the crossing' },
    { x: 424,  id: 'park',     name: 'the park' },
    { x: 800,  id: 'viaduct',  name: 'the viaduct' },
    { x: 976,  id: 'beach',    name: 'the beach' },
  ],
  end: 1300,
  /* Beats that need a position, kept next to the ground that shapes them. */
  marks: {
    pigeons: 15, lamppost: 70, hillTop: 84, hillBottom: 118,
    cat: 162, pinch: 180, lowWall: 249, pigeons2: 292,
    roadStart: 330, roadEnd: 408, roadCat: 404,
    cart: 544, pond: 604, pack: 690,
    climbStart: 828, lip: 876, gapStart: 940, gapEnd: 945.4,
    gulls: 954, lastDune: 1240, shore: 1284,
  },
};
