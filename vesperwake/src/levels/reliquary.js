/* levels/reliquary.js — CHAPTER II: THE DROWNED RELIQUARY
 *
 * Movement budget this level is designed against (from config.js):
 *   full jump apex      84px  -> a mandatory rise never exceeds 72
 *   full jump distance 127px  -> safe gaps <=105, scary gaps <=120
 *   quickstep          104px, grounded -> never required to cross a gap
 *   crouch tunnel      40-48px of clearance
 *
 * Chapter I taught the moveset. This chapter asks three new questions and
 * lays down one new floor:
 *
 *   moth     a three-shard fan     -> duck the high one, overhead the moth
 *   choir    a high ring, a low    -> crouch, jump, crouch, jump
 *   duelist  a long tell, a 0.1s   -> the perfect step, and nothing else
 *            thrust
 *   water    the reliquary is flooded. It is shallow exactly once, to teach
 *            you what it costs, and deep everywhere after that.
 *
 *   1  Arrival          the nave, the flood, no threat
 *   2  First fan        one moth, alone, with a whole aisle to read it in
 *   3  Shard colonnade  a low road under a crossfire
 *   4  The antechoir    one voice, two rings, nothing else in the room
 *   5  Lily crossing    three pads that sink; do not stop
 *   6  The ferry stone
 *   7  The duel         one duelist, flat clean stone, no furniture
 *   8  The glass stair  saint-glass panes and a bier, moths across the shaft
 *   9  Gallery of voices  rings and a fan, interleaved
 *  10  The pinch        warden ahead, duelist behind, a ceiling too low
 *  11  The sunken transept — and what is bricked up beneath it
 *  12  Vesper light
 *  13  The drowned door
 */

import { Builder } from '../level.js';

const GROUND = 470;

export function buildReliquary() {
  const b = new Builder({
    id: 'saintglass',
    name: 'THE DROWNED RELIQUARY',
    chapter: 'II',
    painter: 'reliquary',
    backdrop: {
      early: 'drowned-reliquary.webp',
      late: 'drowned-reliquary-late.webp',
      light: { x: 0.38, y: 0.20, r: 0.82, strength: 0.16 },
      rain: 0,
      motes: 46,
      gradeTop: '#0d2a2e',
      gradeMid: '#123033',
      gradeLow: '#030d11',
    },
    music: 1,
    camMinY: -220,
    camMaxY: 320,
    height: 900,
  });

  b.spawn(70, GROUND - 60);

  /* -------- 1. ARRIVAL --------------------------------------------- *
   * No threat. The only thing this room does is break the pavement in front
   * of you and let you look down into the flood. The channel is 96px — an
   * easy jump — and the bed under it is only 60px deep, well inside the 84px
   * apex, so the mistake costs one hit and a climb, not a life. Water is
   * expensive everywhere after here; it is cheap exactly once, on purpose. */
  b.floor(0, 520, GROUND, 'ground');
  b.hazard(520, GROUND + 16, 96, 300, 'water');
  b.floor(520, 96, 530, 'silt', 90);          // the shallow bed you can wade out of
  b.floor(616, 464, GROUND, 'ground');
  b.backProp('tree', 210, GROUND, { h: 240 }); // roots that came in through the vault
  b.backProp('tree', 430, GROUND, { h: 190 });
  b.prop('cross', 160, GROUND, { h: 52 });
  b.prop('headstone', 236, GROUND, { h: 36, w: 26 });
  b.prop('urn', 320, GROUND);
  b.prop('lantern', 418, GROUND, { h: 86, groundY: GROUND });
  b.prop('headstone', 486, GROUND, { h: 28, w: 20 });
  b.frontProp('bough', -60, 86, { w: 500 });
  b.frontProp('mist', 470, GROUND + 26, { w: 340 });
  b.zone('the drowned nave', 0, 700, { quiet: true });

  /* -------- 2. FIRST FAN ------------------------------------------- *
   * One moth, hovering 74px up so its level shard arrives at exactly the
   * height of a standing head. Nothing else is in the aisle and the floor is
   * 460px long, so you can back off, watch the fan open twice, and work out
   * that the high shard is a crouch and the moth itself is an overhead.     */
  b.prop('lantern', 700, GROUND, { h: 80, groundY: GROUND });
  b.enemy('moth', 900, GROUND, { facing: -1 });
  b.prop('cross', 1032, GROUND, { h: 46 });
  b.zone('the lamplight aisle', 700, 1080);

  /* -------- 3. SHARD COLONNADE ------------------------------------- *
   * Now the fan is weather rather than an event. Two moths hold the ends of
   * a long run and a fallen lintel sits in the middle with 46px of clearance
   * — crouch fits, standing does not. So the corridor makes you hold the
   * crouch, and holding the crouch is also what answers the shards. The
   * wretch tucked behind the lintel is a gift: its sweep has the same answer
   * you are already using, and a crouch-strike is right there.              */
  b.floor(1080, 1080, GROUND, 'ground');
  b.enemy('moth', 1180, GROUND, { facing: 1 });
  b.block(1340, GROUND - 236, 110, 190, 'tomb');
  b.prop('lantern', 1288, GROUND, { h: 72, groundY: GROUND });
  b.enemy('wretch', 1520, GROUND, { patrol: 44, facing: -1 });
  b.enemy('moth', 1660, GROUND, { facing: -1 });
  b.breakable(1470, GROUND - 30, 22, 30, 'urn', 'heart');
  b.frontProp('chain', 1360, -50, { h: 300, dx: 16, sag: 22 });
  b.zone('the shard colonnade', 1080, 1720);

  /* -------- 4. THE ANTECHOIR --------------------------------------- *
   * One voice, floating 28px off the floor so the high ring passes over a
   * crouch and the low ring skims the stone. 440px of clean nave and nothing
   * else happening — the choir is a metronome, and this is the room where
   * you learn to count it: crouch, jump, crouch, jump.                      */
  b.prop('lantern', 1800, GROUND, { h: 84, groundY: GROUND });
  b.enemy('choir', 2000, GROUND - 28, {});
  b.prop('shrine', 2094, GROUND, { h: 108 });
  b.prop('fence', 1880, GROUND, { w: 70 });
  b.zone('the antechoir', 1720, 2160);

  /* -------- 5. LILY CROSSING --------------------------------------- *
   * The orchard's rotten planks, wearing the flood. Three pads, each of
   * which sinks 0.55s after it takes your weight. The gaps are 36, 32 and 32
   * — trivial jumps — so the only thing being tested is whether you keep
   * moving. The water underneath is deep, and nothing is placed above you:
   * failing here should always be your own hesitation.                      */
  b.hazard(2160, GROUND + 16, 420, 360, 'water');
  b.crumble(2196, 452, 76, 'lily');
  b.crumble(2304, 452, 76, 'lily');
  b.crumble(2412, 452, 76, 'lily');
  b.frontProp('mist', 2180, GROUND + 20, { w: 460 });
  b.floor(2580, 580, GROUND, 'ground');
  b.zone('the lily crossing', 2160, 2580);

  /* -------- 6. THE FERRY STONE ------------------------------------- */
  b.checkpoint(2660, GROUND);
  b.prop('lantern', 2610, GROUND, { h: 78, groundY: GROUND });
  b.pickup('heart', 2730, GROUND - 24);
  b.zone('the ferry stone', 2580, 2800);

  /* -------- 7. THE DUEL -------------------------------------------- *
   * One duelist on 360px of flat, empty, well-lit stone. Nothing to trip on,
   * nothing overhead, no second enemy. It mirrors you at 150px, draws BACK
   * for 0.44s, then thrusts for a tenth of a second. The room is this bare
   * because the lesson is a single frame of timing and any furniture at all
   * would let you blame the furniture.                                      */
  b.prop('lantern', 2830, GROUND, { h: 82, groundY: GROUND });
  b.prop('hint', 2900, GROUND - 66, { glyph: 'step' });
  b.enemy('duelist', 3010, GROUND, { facing: -1 });
  b.prop('lantern', 3128, GROUND, { h: 82, groundY: GROUND });
  b.zone('the mirror aisle', 2800, 3160);

  /* -------- 8. THE GLASS STAIR ------------------------------------- *
   * Up out of the water on three lit panes, 58px apart and alternating
   * sides, then a reliquary bier on chains that rises the last 100px to the
   * gallery. Two moths work the shaft: one at pane height, one up where the
   * bier tops out. You cannot stand and plan on a pane, and you cannot rush
   * the bier — the ride is where you use the overhead strike.               */
  b.hazard(3160, GROUND + 16, 300, 360, 'water');
  b.ledge(3176, 412, 96, 'glass');
  b.ledge(3320, 354, 96, 'glass');
  b.ledge(3176, 296, 96, 'glass');
  b.mover(3300, 296, 104, { toY: 196, speed: 42, mode: 'pong', wait: 0.9, tag: 'bier' });
  b.enemy('moth', 3250, 400, { facing: 1 });
  b.enemy('moth', 3330, 250, { facing: -1 });
  b.frontProp('chain', 3286, -120, { h: 420, dx: 10, sag: 18 });
  b.frontProp('mist', 3180, GROUND + 20, { w: 300 });
  b.zone('the glass stair', 3160, 3460);

  /* -------- 9. GALLERY OF VOICES ----------------------------------- *
   * The two new questions asked at once. The choir's rings alternate high
   * and low on a fixed beat; the moth's fan opens whenever it likes. The
   * rhythm no longer lines up, so you cannot metronome your way through it —
   * you have to read the fan inside the count. There is 560px of gallery so
   * there is always somewhere to stand and re-time.                         */
  b.floor(3460, 560, 180, 'ground', 210);
  b.prop('lantern', 3520, 180, { h: 68, groundY: 180 });
  b.enemy('moth', 3620, 180, { facing: 1 });
  /* THE VESPER MOTH. Four moths' worth of health, hovering over the gallery
   * where the rings and the fan already overlap — you have to solve the room
   * to get a clean overhead on it. It is the only thing in the chapter
   * carrying a shard. */
  b.enemy('moth', 3860, 150, { facing: -1, hpMult: 4.2, shard: 'moth' });
  b.enemy('choir', 3800, 180 - 28, {});
  b.prop('headstone', 3930, 180, { h: 34, w: 24 });
  b.frontProp('railing', 3480, 208, { w: 460 });
  b.frontProp('chain', 3902, -80, { h: 380, dx: 14, sag: 26 });
  b.zone('the gallery of voices', 3460, 4020);

  /* -------- 10. THE BROKEN STAIR + THE PINCH ----------------------- *
   * Two 72px steps down — climbable, so the hound met on the middle one is a
   * fight and not an ambush — and then a 146px drop you cannot climb back
   * out of. That drop is the door closing. Below it: a lintel at 392 leaves
   * 78px of headroom, so you can stand and crouch but you cannot jump over
   * the warden walking at you. The duelist behind was already awake when you
   * landed. The room has exactly two answers and you were taught both.      */
  b.floor(4020, 180, 252, 'ground', 190);
  b.floor(4200, 180, 324, 'ground', 190);
  b.enemy('hound', 4110, 252, { patrol: 40, facing: -1 });
  b.prop('cross', 4250, 324, { h: 42 });
  b.zone('the broken stair', 4020, 4380);

  b.floor(4380, 510, GROUND, 'ground');
  b.enemy('duelist', 4450, GROUND, { facing: 1 });
  b.block(4560, 180, 320, 212, 'tomb');
  b.breakable(4700, GROUND - 30, 22, 30, 'urn', 'heart');
  b.enemy('warden', 4790, GROUND, { facing: -1 });
  b.prop('lantern', 4430, GROUND, { h: 76, groundY: GROUND });
  b.zone('the pinch', 4380, 4890);

  /* -------- 11. THE SUNKEN TRANSEPT + THE SECRET ------------------- *
   * The nave ends on a thin raised pavement and the path continues on two
   * root bridges — one-way ledges, which is the whole trick. Under the first
   * span, 126px down, a shelf runs WEST beneath the pavement to an alcove
   * that has been bricked up. The only way in is Down + Jump through a
   * bridge you are standing on, which is a thing the game has never asked
   * for. Getting out is a fallen pane wedged in the channel: 70px up from
   * the shelf, then 56px up onto the far span. The crow perched over the
   * crossing is the reason you might discover the shelf by accident.        */
  b.floor(4890, 140, GROUND, 'ground', 50);   // thin, so there is a room under it
  b.hazard(5030, 620, 300, 300, 'water');
  b.ledge(5030, 470, 150, 'root');
  b.ledge(5210, 470, 150, 'root');
  b.enemy('crow', 5120, 344, { facing: -1 });

  /* the shelf, the brick, and what is behind it */
  b.ledge(4894, 596, 286, 'root');
  b.block(4894, 520, 22, 76, 'tomb');
  b.breakable(4996, 520, 30, 76, 'falsewall');   // fills the opening, floor to vault
  b.pickup('relic', 4948, 566, { hidden: true });
  b.ledge(5190, 526, 40, 'glass');
  b.frontProp('mist', 5040, 604, { w: 320 });
  b.frontProp('bough', 5000, 92, { w: 400 });
  b.zone('the sunken transept', 4890, 5360);

  /* -------- 12. VESPER LIGHT --------------------------------------- */
  b.floor(5360, 340, GROUND, 'ground');
  b.checkpoint(5420, GROUND);
  b.prop('shrine', 5486, GROUND, { h: 104 });
  b.pickup('heart', 5540, GROUND - 30);
  /* A pane of saint-glass 140px up in the clerestory: a full jump falls 56px
   * short of it, and it stays short until you come back from the orchard
   * carrying the Crow Shard. */
  b.gatedLedge(5412, 338, 100, 'glass', 'crow');
  b.pickup('vitality', 5462, 308);
  b.prop('lantern', 5580, GROUND, { h: 84, groundY: GROUND });
  b.zone('the vesper light', 5360, 5560);

  /* -------- 13. THE DROWNED DOOR ----------------------------------- */
  b.prop('cross', 5602, GROUND, { h: 50 });
  b.exit(5620, GROUND - 128, 64, 128);
  b.zone('the drowned door', 5560, 5940);

  return b.build();
}
