/* levels/orchard.js — CHAPTER I: THE WAKE ORCHARD
 *
 * Movement budget this level is designed against (from config.js):
 *   full jump apex     86px  (3.6 cells)  -> mandatory rises never exceed 72
 *   full jump distance ~125px             -> safe gaps <=105, hard gaps <=122
 *   quickstep          ~112px, grounded   -> never required to cross a gap
 *   dive bounce        ~37px per bounce   -> chains give real height
 *
 * The chapter teaches the whole moveset in the order you need it, then asks
 * for all of it at once:
 *
 *   1  Wake            silence, rain, no threat
 *   2  First tell      one wretch, alone, with room
 *   3  The low road    a fallen lintel you can only pass crouched
 *   4  The crow line   two divers; standing still is the mistake
 *   5  Rotten planks   two crumbling steps over the gorge
 *   6  Hound duel      the quickstep, taught by something that commits
 *   7  The shield      first warden, with a bough over his head
 *   8  The climb       five ledges, crows crossing between them
 *   9  High terrace    the first fight where you own the height
 *  10  The pinch       a warden in a corridor too low to jump
 *  11  Gorge II        boughs, a crumble, divers, and a secret beneath
 *  12  Last light      three wretches in a pocket you cannot back out of
 *  13  The Dawn Door
 */

import { Builder } from '../level.js';

const GROUND = 470;

export function buildOrchard() {
  const b = new Builder({
    id: 'orchard',
    name: 'THE WAKE ORCHARD',
    chapter: 'I',
    painter: 'orchard',
    backdrop: {
      early: 'wake-orchard.webp',
      late: 'wake-orchard-late.webp',
      light: { x: 0.74, y: 0.16, r: 0.86, strength: 0.15 },
      rain: 96,
      motes: 12,
      gradeTop: '#1b2740',
      gradeMid: '#24303c',
      gradeLow: '#060a12',
    },
    music: 0,
    camMinY: -220,
    camMaxY: 320,
    height: 900,
  });

  b.spawn(70, GROUND - 60);

  /* -------- 1. WAKE ------------------------------------------------ *
   * Nothing happens here on purpose. Rain, lantern light, the shapes of
   * graves. You should want to walk right before anything asks you to.  */
  /* one continuous terrace from the gate to the lip of the gorge */
  b.floor(0, 1560, GROUND, 'ground');
  b.backProp('tree', 120, GROUND, { h: 230 });
  b.backProp('tree', 430, GROUND, { h: 180 });
  b.prop('headstone', 150, GROUND, { h: 40, w: 26 });
  b.prop('cross', 236, GROUND, { h: 50 });
  b.prop('headstone', 300, GROUND, { h: 30, w: 20 });
  b.prop('lantern', 380, GROUND, { h: 84, groundY: GROUND });
  b.prop('cross', 470, GROUND, { h: 38 });
  b.prop('urn', 545, GROUND);
  b.frontProp('bough', -80, 96, { w: 470 });
  b.frontProp('mist', 120, GROUND + 8, { w: 520 });
  b.zone('the wake', 0, 700, { quiet: true });

  /* -------- 2. FIRST TELL ------------------------------------------ *
   * One wretch, on flat ground, with a lantern behind it so its silhouette
   * reads. Its sweep is chest-high — the first thing crouching solves.     */
  b.prop('headstone', 640, GROUND, { h: 34, w: 24 });
  b.enemy('wretch', 780, GROUND, { patrol: 70, facing: -1 });
  b.prop('lantern', 900, GROUND, { h: 78, groundY: GROUND });
  b.prop('cross', 960, GROUND, { h: 44 });
  b.zone('first tell', 700, 1010);

  /* -------- 3. THE LOW ROAD ---------------------------------------- *
   * A collapsed lintel. 44px of clearance: a crouch fits, a stand does not,
   * and the tomb above is 220px tall so you cannot go over it. There is no
   * text — the shape of the hole is the instruction.                       */
  b.prop('hint', 1004, GROUND - 66, { glyph: 'crouch' });
  b.block(1030, GROUND - 220, 152, 176, 'tomb');
  b.prop('headstone', 1200, GROUND, { h: 28, w: 20 });
  b.pickup('heart', 1108, GROUND - 22);
  b.zone('the low road', 1010, 1240);

  /* -------- 4. THE CROW LINE --------------------------------------- *
   * Two crows on boughs, staggered so their dive lines cross the path at
   * different heights. Their perches are also the platforms you want.      */
  b.ledge(1250, 396, 92, 'bough');
  b.ledge(1420, 372, 92, 'bough');
  b.enemy('crow', 1296, 396, { facing: 1 });
  b.enemy('crow', 1466, 372, { facing: -1 });
  b.prop('tree', 1350, GROUND, { h: 210 });
  b.prop('lantern', 1530, GROUND, { h: 70, groundY: GROUND });
  b.zone('the crow line', 1240, 1560);

  /* -------- 5. ROTTEN PLANKS --------------------------------------- *
   * The gorge. Two planks, each of which gives way 0.55s after it takes
   * your weight. Gaps are 36 and 30 — trivially jumpable, so the challenge
   * is purely "do not stop", which is the lesson.                          */
  b.hazard(1560, GROUND + 40, 240, 460, 'gorge');
  b.crumble(1596, 448, 76, 'plank');
  b.crumble(1700, 448, 76, 'plank');
  b.frontProp('mist', 1560, GROUND + 30, { w: 300 });
  /* the terrace runs unbroken under the climb and the descent: overshooting a
   * ledge should cost you the climb, not a life. The gorge is the only place
   * in this chapter that kills you for falling. */
  b.floor(1800, 1960, GROUND, 'ground');

  /* -------- 6. HOUND DUEL ------------------------------------------ *
   * Two hounds with room to breathe. A hound's pounce is 0.42s of tell and
   * half a second of committed flight: the exact shape the quickstep is
   * built for. The second hound arrives while you are recovering.          */
  b.enemy('hound', 1930, GROUND, { patrol: 120, facing: -1 });
  b.enemy('hound', 2180, GROUND, { patrol: 140, facing: -1 });
  b.prop('cross', 2050, GROUND, { h: 46 });
  b.prop('lantern', 2270, GROUND, { h: 82, groundY: GROUND });
  b.checkpoint(2320, GROUND);
  b.zone('hound duel', 1800, 2400);

  /* -------- 7. THE SHIELD ------------------------------------------ *
   * The first warden. Whipping him in the face rings off the coffin lid.
   * Two answers are placed in the room: a bough directly over his patrol
   * for the dive, and enough floor to crouch-strike his legs.              */
  b.ledge(2450, 392, 108, 'bough');
  b.enemy('warden', 2560, GROUND, { facing: -1 });
  b.breakable(2660, GROUND - 30, 22, 30, 'urn', 'heart');
  b.zone('the shield', 2400, 2720);

  /* -------- 8. THE CLIMB ------------------------------------------- *
   * Five ledges, alternating sides, each a 58px rise. Crows cross the
   * shaft, so you cannot stand and plan on every step.                     */
  /* the first step sits against the terrace wall, so running into the wall
   * puts the way up directly under your feet — the climb should never be a
   * thing you walk past without seeing */
  b.ledge(2894, 412, 96, 'grave');
  b.ledge(2756, 354, 96, 'bough');
  b.ledge(2894, 296, 96, 'grave');
  b.ledge(2756, 238, 96, 'bough');
  b.ledge(2890, 180, 100, 'grave');
  b.enemy('crow', 2700, 300, { facing: 1 });
  b.enemy('crow', 2960, 224, { facing: -1 });
  /* THE ROOK. Three crows' worth of health, at the top of the climb, and the
   * only thing in the chapter carrying a shard. You cannot reach it without
   * making the climb, and you cannot kill it comfortably without the
   * overhead strike — so it asks for the two things the climb just taught. */
  b.enemy('crow', 2846, 130, { facing: -1, hpMult: 3.2, shard: 'crow' });
  b.prop('lantern', 2690, GROUND, { h: 64, groundY: GROUND });
  b.frontProp('chain', 2846, -60, { h: 470, dx: 26, sag: 30 });

  /* -------- 9. HIGH TERRACE ---------------------------------------- *
   * You arrive with the height advantage, and the game immediately gives
   * you something worth spending it on.                                     */
  b.floor(3000, 340, 156, 'ground', 360);
  b.enemy('wretch', 3130, 156, { patrol: 60, facing: -1 });
  b.prop('headstone', 3230, 156, { h: 32, w: 22 });
  b.prop('fence', 3266, 156, { w: 46 });
  b.frontProp('railing', 3010, 202, { w: 320 });
  /* stepped descent back to the terrace floor */
  b.floor(3340, 200, 268, 'ground', 320);
  b.floor(3540, 220, 356, 'ground', 300);
  b.floor(3760, 600, GROUND, 'ground');
  b.prop('lantern', 3410, 268, { h: 62, groundY: 268 });
  b.zone('high terrace', 2720, 3800);

  /* -------- 10. THE PINCH ------------------------------------------ *
   * A lintel at 392 leaves 78px of headroom: you can stand and you can
   * crouch, but you cannot jump over the warden coming the other way. Two
   * wretches close from behind. The room only has one answer and it is the
   * one you were taught two beats ago.                                      */
  b.block(3880, 180, 480, 212, 'tomb');
  b.enemy('warden', 4230, GROUND, { facing: -1 });
  b.enemy('wretch', 3940, GROUND, { patrol: 40, facing: 1 });
  b.enemy('wretch', 4080, GROUND, { patrol: 40, facing: 1 });
  b.prop('lantern', 4160, GROUND, { h: 74, groundY: GROUND });
  b.zone('the pinch', 3800, 4360);

  /* -------- 11. GORGE II + THE SECRET ------------------------------ *
   * Boughs across the gorge with one plank in the middle and crows working
   * the gap. Beneath the second bough, a hidden shelf runs back west to a
   * false wall — the chapter's relic. You get there by dropping THROUGH the
   * bough (Down + Jump), which is a thing the game has never asked for and
   * which rewards you for knowing your own moveset.                         */
  b.hazard(4360, GROUND + 40, 520, 520, 'gorge');
  b.ledge(4396, 442, 104, 'bough');
  b.crumble(4560, 428, 84, 'plank');
  b.ledge(4700, 442, 104, 'bough');
  b.enemy('crow', 4520, 300, { facing: 1 });
  b.enemy('crow', 4660, 268, { facing: -1 });
  b.frontProp('mist', 4380, GROUND + 24, { w: 560 });

  /* the shelf, and what it hides */
  b.ledge(4360, 596, 190, 'grave');
  b.block(4300, 540, 60, 120, 'tomb');
  b.breakable(4306, 540, 54, 56, 'falsewall', 'relic');
  b.pickup('relic', 4232, 566, { hidden: true });
  b.block(4180, 596, 130, 140, 'tomb');
  b.ledge(4200, 596, 118, 'grave');

  /* -------- 12. LAST LIGHT ----------------------------------------- */
  b.floor(4880, 900, GROUND, 'ground');
  b.checkpoint(4960, GROUND);
  b.prop('shrine', 5060, GROUND, { h: 104 });
  b.enemy('wretch', 5200, GROUND, { patrol: 50, facing: -1 });
  b.enemy('wretch', 5300, GROUND, { patrol: 50, facing: 1 });
  b.enemy('hound', 5400, GROUND, { patrol: 90, facing: -1 });
  b.prop('lantern', 5180, GROUND, { h: 80, groundY: GROUND });
  b.prop('lantern', 5420, GROUND, { h: 80, groundY: GROUND });
  b.prop('cross', 5340, GROUND, { h: 52 });
  b.pickup('heart', 5478, GROUND - 30);
  /* A bough 140px up: out of reach of a full jump on purpose. Come back with
   * the Crow Shard. The first time you see it, that is the whole point. */
  b.gatedLedge(5230, 338, 96, 'bough', 'crow');
  b.pickup('vitality', 5278, 308);
  b.frontProp('bough', 5100, 90, { w: 420 });
  b.zone('last light', 4360, 5500);

  /* -------- 13. THE DAWN DOOR -------------------------------------- */
  b.prop('headstone', 5560, GROUND, { h: 34, w: 24 });
  b.exit(5620, GROUND - 128, 64, 128);
  b.zone('the dawn door', 5500, 5760);

  return b.build();
}
