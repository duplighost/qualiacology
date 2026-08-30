/* levels/belfry.js — CHAPTER III: THE MERIDIAN BELFRY
 *
 * The last chapter, and the only one that assumes you own the whole moveset.
 * It is built out of the machine the bell hangs in: gear-tooth walkways, chain
 * bridges, loose deck plates and counterweights, with the exposed cogwork
 * turning underneath everything you stand on.
 *
 * Movement budget it is authored against (measured, from config.js):
 *   full jump apex     84px   -> a mandatory rise never exceeds 72
 *   full jump distance 127px  -> comfortable gaps <=105, hard gaps <=120
 *   quickstep         104px, grounded — never required to cross a gap
 *   dive bounce        ~37px per bounce, and it chains
 *   crouch tunnel      40-48px of clearance
 *
 *   1  The bell deck        quiet, the bell overhead, nothing asks anything
 *   2  The first hammer     one bellKnight, a wide floor, learn the wave
 *   3  The gearworks        counterweights over the cogs
 *   4  The anchor run       a harrier, and a floor that will not hold you
 *   5  A sun-disc           the last easy breath for a while
 *   6  The censer cot       a room that only lets you out on your knees
 *   7  The gear stair       gear teeth and chain, harriers crossing
 *   8  The long chain       bellKnight and censer, over nothing
 *   9  The service hatch    the relic, and mercy before the descent
 *  10  The counterweights   going down while everything shoots
 *  11  The last lanterns    the corridor where the noise stops
 *  12  THE MERIDIAN BELL    Abbess Ione
 *  13  The Dawn Door
 */

import { Builder } from '../level.js';

const GROUND = 470;

export function buildBelfry() {
  const b = new Builder({
    id: 'bellfoundry',
    name: 'THE MERIDIAN BELFRY',
    chapter: 'III',
    painter: 'belfry',
    backdrop: {
      early: 'meridian-belfry.webp',
      late: 'meridian-belfry-late.webp',
      light: { x: 0.44, y: 0.14, r: 0.9, strength: 0.17 },
      rain: 40,
      motes: 30,
      gradeTop: '#1b1f3a',
      gradeMid: '#232742',
      gradeLow: '#05060f',
    },
    music: 2,
    camMinY: -260,
    camMaxY: 320,
    height: 900,
  });

  b.spawn(70, GROUND - 60);

  /* -------- 1. THE BELL DECK --------------------------------------- *
   * You arrive under the thing the whole game has been named after and it
   * does nothing. No enemy, no gap. The chapter earns its noise later by
   * being silent here first — same trick as the orchard's opening.        */
  b.floor(0, 1120, GROUND, 'deck');
  b.backProp('greatbell', 340, 24, { r: 172 });
  b.prop('lantern', 170, GROUND, { h: 84, groundY: GROUND });
  b.prop('bellframe', 430, GROUND, { h: 150, w: 130 });
  b.prop('anvil', 560, GROUND);
  b.frontProp('chain', 210, -80, { h: 330, dx: 14, sag: 22 });
  b.frontProp('chain', 520, -80, { h: 300, dx: -10, sag: 18 });
  b.zone('the bell deck', 0, 600, { quiet: true });

  /* -------- 2. THE FIRST HAMMER ------------------------------------ *
   * One bellKnight, alone, on the widest flat floor in the chapter. His
   * shockwave runs 650px along the ground in both directions, so the room
   * has to be long enough that you can see it coming and short of anything
   * to hide behind — the only answer available is to leave the floor. If
   * you try to solve him from the air he swings up instead, which is the
   * other half of the lesson and the reason there is no ledge in here.    */
  b.prop('lantern', 700, GROUND, { h: 78, groundY: GROUND });
  b.enemy('bellKnight', 860, GROUND, { facing: -1 });
  b.prop('gearwheel', 1090, GROUND, { r: 58 });
  b.pickup('heart', 1080, GROUND - 28);
  b.zone('the first hammer', 600, 1120);

  /* -------- 3. THE GEARWORKS --------------------------------------- *
   * The deck ends and the machine is underneath. Two counterweights and a
   * gear tooth between them. Boarding the first one is a 46px step so the
   * idea lands safely; the jump off it is 88px with a 28px rise, which is
   * the honest middle of the budget. Nothing here is timed tight — the
   * pressure is the drop, not the stopwatch.                              */
  b.hazard(1120, GROUND + 36, 810, 400, 'gears');
  b.mover(1166, 442, 92, { toX: 1322, speed: 54, wait: 0.5, tag: 'counterweight' });
  b.ledge(1502, 414, 104, 'gear');
  b.mover(1686, 436, 92, { toX: 1806, speed: 60, phase: 0.5, wait: 0.35, tag: 'counterweight' });
  b.backProp('gearwheel', 1480, 640, { r: 112 });
  b.frontProp('steam', 1240, GROUND + 30, { w: 380 });
  b.frontProp('mist', 1620, GROUND + 40, { w: 360 });
  b.zone('the gearworks', 1120, 1930);

  /* -------- 4. THE ANCHOR RUN -------------------------------------- *
   * The harrier only drops an anchor when it is directly over you, so the
   * counter is to not be under it — and the floor here is two loose deck
   * plates that fall away 0.55s after they take your weight. Standing still
   * is punished twice. The bell frame overhead sits 12px above the top of a
   * full jump: you may use all of your height and still not escape.       */
  b.floor(1930, 260, GROUND, 'deck');
  b.hazard(2190, GROUND + 36, 320, 400, 'gears');
  b.crumble(2218, 464, 84, 'plate');
  b.crumble(2342, 464, 84, 'plate');
  b.block(2170, 240, 340, 76, 'wall');
  b.enemy('harrier', 2330, GROUND, { patrol: 175, facing: -1 });
  b.prop('lantern', 2050, GROUND, { h: 74, groundY: GROUND });
  b.prop('hint', 2140, 372, { glyph: 'up' });
  b.zone('the anchor run', 1930, 2510);

  /* -------- 5. A SUN-DISC ------------------------------------------ */
  b.floor(2510, 1190, GROUND, 'deck');
  b.checkpoint(2590, GROUND);
  b.prop('shrine', 2668, GROUND, { h: 104 });
  b.pickup('heart', 2740, GROUND - 28);
  b.zone('the ringers rest', 2510, 2790);

  /* -------- 6. THE CENSER COT -------------------------------------- *
   * The censer's arc is a circle of radius 84 around its chest. Everything
   * between roughly 53px and 112px of it is lethal; inside that ring and
   * outside it are both safe, and its body only bruises when it is NOT
   * swinging. So the room is built to make you use both safe places: a
   * ceiling at 96px of clearance means you cannot go over it, and the only
   * door out is a 44px slot — a crouch fits, standing does not. Bait the
   * swing, walk into the eye of it, then leave low while it recovers.     */
  b.block(2860, 294, 240, 80, 'wall');
  b.enemy('censer', 2990, GROUND, { facing: -1 });
  /* 96, not 170. "Leave low while it recovers" only works if leaving low is
   * quick: clearing a slot costs (width + 26) px of travel and a slide carries
   * 138. At 170 you came out 58px short and crept the rest at 66px/s with a
   * censer winding up behind you — the opposite of the escape this room is
   * describing. Same arithmetic that broke THE LOW ROAD in chapter 1. */
  b.block(3110, 290, 96, 136, 'wall');
  b.prop('hint', 3130, GROUND - 18, { glyph: 'crouch' });
  b.pickup('heart', 3240, GROUND - 18);
  b.prop('lantern', 2830, GROUND, { h: 68, groundY: GROUND });
  b.zone('the censer cot', 2790, 3340);

  /* -------- 7. THE GEAR STAIR -------------------------------------- *
   * Six surfaces, alternating sides, every rise exactly 60 except the last
   * which is 24 — the stair eases off at the top so the handoff onto the
   * bridge is not the hardest jump in the climb. Two harriers cruise at
   * different heights so the shaft is never safe at only one altitude, and
   * the deck runs all the way underneath: a fall here costs the climb, not
   * the run.                                                              */
  b.ledge(3376, 412, 96, 'gear');
  b.ledge(3520, 352, 100, 'chain');
  b.ledge(3382, 292, 96, 'gear');
  b.ledge(3526, 232, 104, 'chain');
  b.ledge(3388, 172, 100, 'gear');
  b.ledge(3536, 148, 130, 'chain');
  b.enemy('harrier', 3480, 396, { patrol: 130, facing: 1 });
  b.enemy('harrier', 3520, 220, { patrol: 130, facing: -1 });
  /* THE CHAINED HARRIER. Three harriers' worth of health at the top of the
   * stair, where there is one ledge to fight from and a long way down. */
  b.enemy('harrier', 3600, 120, { patrol: 150, facing: -1, hpMult: 3.4, shard: 'harrier' });
  /* And what the shard is for: a girder 186px out from the top of the stair,
   * level with it, over the cogwork. A full jump reaches 127. The step in the
   * air adds the rest — and nothing else in the moveset does. */
  b.gatedLedge(3852, 148, 116, 'girder', 'harrier');
  b.pickup('vitality', 3906, 116);
  b.pickup('heart', 3438, 146);
  b.prop('lantern', 3410, 412, { h: 44, groundY: 412 });
  b.frontProp('chain', 3460, -120, { h: 430, dx: 18, sag: 30 });
  b.zone('the gear stair', 3340, 3720);

  /* -------- 8. THE LONG CHAIN -------------------------------------- *
   * Two spans over the cogwork with a 50px break between them. The
   * bellKnight owns the first: his wave rides the chain, and the break
   * kills it, so the span is both the arena and the escape. The censer owns
   * the second, placed dead centre so the west lip and the east lip are
   * both standoff pockets and the middle is his — you either wait him out
   * or step inside. Neither fight has a floor under it. That is the point. */
  /* the cogwork stops at the machine housing (4640) — past that the shaft is
   * open air, because the lift in beat 10 travels down through it */
  b.hazard(3700, 300, 940, 560, 'gears');
  b.ledge(3720, 148, 280, 'chain');
  b.ledge(4050, 148, 280, 'chain');
  b.enemy('bellKnight', 3860, 148, { facing: -1 });
  b.enemy('censer', 4190, 148, { facing: -1 });
  b.frontProp('steam', 3760, 320, { w: 420 });
  b.frontProp('chain', 4020, -160, { h: 540, dx: 22, sag: 42 });
  b.zone('the long chain', 3720, 4400);

  /* -------- 9. THE SERVICE HATCH ----------------------------------- *
   * A landing, and a lit dead-end shelf 64px below it that goes nowhere —
   * which is the tell. The hatch in the machine housing is a false plate;
   * breaking it wakes the relic hiding on the shelf behind you.
   *
   * The sun-disc here is not in the brief's beat list and it is deliberate:
   * beats 8 and 10 are the two hardest rooms in the game and sending a
   * player back through both of them for one mistake is not difficulty, it
   * is a chore.                                                           */
  b.ledge(4380, 174, 150, 'gear');
  b.checkpoint(4440, 174);
  b.ledge(4420, 238, 150, 'gear');
  b.block(4570, 132, 70, 200, 'block');
  b.breakable(4574, 168, 52, 56, 'falsewall', 'relic');
  b.pickup('relic', 4480, 212, { hidden: true });
  b.prop('lantern', 4448, 238, { h: 46, groundY: 238 });
  b.zone('the service hatch', 4400, 4700);

  /* -------- 10. THE COUNTERWEIGHTS --------------------------------- *
   * The descent: a vertical lift, a gear tooth, and a travelling
   * counterweight, dropping you 330px back to deck level. Every platform
   * here moves or is small, so the four flyers overhead are not fought so
   * much as survived — a crow on the lift line, a harrier dropping anchors
   * onto the one static tooth, a moth fanning the last hop and a choir
   * ringing high and low across all of it. You are meant to arrive at the
   * bottom out of breath.                                                 */
  b.hazard(4640, GROUND, 710, 420, 'gears');
  b.mover(4700, 140, 100, { toY: 392, speed: 62, mode: 'pong', wait: 0.7, tag: 'counterweight' });
  b.ledge(4846, 356, 130, 'gear');
  b.mover(5036, 392, 104, { toX: 5202, speed: 58, wait: 0.4, tag: 'counterweight' });
  b.enemy('crow', 4760, 236, { facing: -1 });
  b.enemy('harrier', 4920, 234, { patrol: 165, facing: -1 });
  b.enemy('moth', 5100, 300, {});
  b.enemy('choir', 5260, 330, {});
  b.backProp('gearwheel', 5000, 620, { r: 130 });
  b.frontProp('steam', 4800, GROUND + 20, { w: 460 });
  b.zone('the counterweights', 4700, 5390);

  /* -------- 11. THE LAST LANTERNS ---------------------------------- *
   * Nothing to fight. Three lanterns, each shorter and dimmer than the one
   * before it, and then the corridor runs out of light. The quiet is the
   * warning.                                                              */
  b.floor(5350, 350, GROUND, 'deck');
  b.checkpoint(5430, GROUND);
  b.prop('shrine', 5490, GROUND, { h: 110 });
  b.prop('lantern', 5560, GROUND, { h: 88, groundY: GROUND });
  b.prop('lantern', 5630, GROUND, { h: 74, groundY: GROUND });
  b.prop('lantern', 5690, GROUND, { h: 58, groundY: GROUND });
  b.pickup('vitality', 5666, GROUND - 32);
  b.zone('the last lanterns', 5390, 5710);

  /* -------- 12. THE MERIDIAN BELL ---------------------------------- *
   * 880 x 400, one unbroken slab of floor from wall to wall, and nothing on
   * it. Ione needs continuous ground for her shockwaves, 620px of clear run
   * for the lunge, and sight of you from anywhere in the room — so the only
   * things in here are two lanterns pinned to the far corners and the bell
   * itself, hung behind the play layer where it cannot block a read.      */
  b.floor(5700, 880, GROUND, 'arena-floor');
  b.arena(5700, GROUND - 400, 880, 400);
  b.backProp('greatbell', 6140, 20, { r: 190 });
  b.prop('lantern', 5720, GROUND, { h: 96, groundY: GROUND });
  b.prop('lantern', 6556, GROUND, { h: 96, groundY: GROUND });
  b.frontProp('chain', 5820, -220, { h: 640, dx: 22, sag: 48 });
  b.frontProp('chain', 6420, -220, { h: 640, dx: -18, sag: 42 });
  b.zone('the meridian bell', 5710, 6600);

  /* -------- 13. THE DAWN DOOR -------------------------------------- *
   * Placed past the arena and shut until she falls.                       */
  b.floor(6580, 200, GROUND, 'deck');
  b.prop('lantern', 6610, GROUND, { h: 66, groundY: GROUND });
  b.exit(6650, GROUND - 128, 68, 128);
  b.zone('the dawn door', 6600, 6860);

  return b.build();
}
