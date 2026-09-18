// CURFEW — WHO LIVES IN THE HAMLETS. The Eleven rewire, rebuilt for D16.
//
// Modelled on holdfast-life.js and deliberately a third of it. A hamlet has eight people:
// a lookout on the post at the road end, three with rifles, somebody who trades, somebody
// who keeps the fuel, the one whose house has the bed, and one more. There is no shop and
// no gate. You talk to people, and when the lookout has said everything she has to say the
// prompt on her becomes 'E · STAND WITH US' and hamlet-defence.js takes it from there.
//
// SAFETY. A hamlet is LIT GROUND, the way the Holdfast is, and contains() below is how both
// halves of that are said: enemies/enemies.js refuses a hostile spawn inside one, and
// world/safety.js answers peacefulAt() true so the dread lane keeps out as well. While a
// hamlet's defence is LIVE, contains() ignores that one hamlet (C22): the waves have to be
// able to walk in.
//
// FEET. Nobody's height is a number typed here any more. `y` on a person is the storey they
// live on — the boards, the terrace, the mud — and the collision field is asked for the
// actual floor under them (collision.supportHeight), at spawn and again every 0.7 s, so a
// person stands ON the boards their chunk streamed in after they did.
//
// TALK (D10). Each person has a read-through index. Each E press says the next line and
// cuts the one before (dialogue.js's same-mouth rule). After the last line the prompt goes
// DARK — nothing emitted — for the line's reading time + 0.35 s + 8 s, and then the person
// is readable again from line 0. The last line is never repeated on a spam.
//
// The LANTERNS in the geometry are emissive, not lights. What this file borrows is one rover
// per hamlet, over the fire, near the player only.
//
// R3 (2026-09-18). ALEX: "i couldn't ever talk to anyone when i thought i completed it ...
// it looks like the important characters might be able to be killed too. they should get
// back up ... there are definitely supposed to be people you can talk to that will help you
// after the event." So:
//   - NOBODY HERE STAYS DOWN. Every person is spawned neutral, which gives them getsUp (C6,
//     enemies.js): a killing blow lays them on the ground, not in a corpse, and they stand
//     up again. While they are down nobody walks them, talks to them, or fires their rifle.
//   - DURING A SIEGE you can still talk to anyone, and they tell you where the nearest of it
//     is from where you are looking: 'Not now. Behind you.'
//   - WHEN IT HOLDS the lookout says so across the hamlet, the fire swells, and the three
//     rifles are cleared one after another. The trader pays, and from then on his counter is
//     the one shop menu (ui/shop-menu.js), selling what the county sells: ammunition at the
//     dealer's price and gas at the keepers'.

import * as THREE from 'three';
import { faceYaw } from '../enemies/nav.js';
import { readingTime } from '../dialogue/lines.js';
import { CASE_SITE } from './climbs-and-caches.js';
import { MAJOR_BY_ID } from './placedata.js';
import { HAMLET_PLAN } from './hamlets.js';
import { CFG } from '../config.js';
import { STOCK, AMMO_PRICE, AMMO_FULL_LINE } from './dealer.js';
import { ShopMenu } from '../ui/shop-menu.js';

/* ------------------------------------------------------------------- the people -- */
//
// Positions are LOCAL to each hamlet, in the frame hamlets.js builds in (+Z is the road).
// `y` is the storey above the pad (0 the ground, 0.10 Eelwater's water, 0.55 its boards,
// 3.4 The Cut's lower terrace, 1.2 a lookout post). `face` is what they look at. `look` is
// the per-person appearance the PEOPLE lane draws (C14): one palette per hamlet, so each cast
// is visibly its own; within a hamlet the second person of each coat colour wears another of
// the palette's three cuts (variant / 4), so no two people stand there in the same clothes.
//
// `lines` are said before the defence, `thanks` after it is won; `here` is what the lookout
// shouts as each wave arrives. Every line is authored here and handed to the dialogue system
// as an ad-hoc line (priority 4, never recorded).

export const HAMLETS = Object.freeze({
  eelwater: {
    r: 46, lamp: [-7, 31, 2.8], region: 'fen',
    people: [
      { id: 'eel-greer', name: 'Greer', role: 'lookout', species: 'greer',
        x: 0, z: 30.3, y: 1.2, face: [0, 60], look: { variant: 1, palette: 'fen', hair: 'tied' },
        lines: ['They come up from the road side. They always have.',
          'Three of us can shoot. Ness will not, and the boy is nine.',
          'Tonight, I think. If you are staying, stand with us.'],
        here: ['Here they come.', 'More of them. Hold the boards.', 'Last of it. Do not let them on the boards.'],
        thanks: ['That was the worst of it.', 'The boards held. So did you.'] },
      { id: 'eel-ness', name: 'Ness · smokehouse', role: 'host',
        x: -5.0, z: 6.9, y: 0.55, face: [-8, 7], look: { variant: 0, palette: 'fen', hair: 'loose' },
        lines: ['The smoke keeps. Nothing else out here keeps.',
          'Six years of eel. I could tell you which year one came out of.'],
        thanks: ['You are cold. Come inside.'] },
      { id: 'eel-ord', name: 'Ord · trapper', role: 'trader',
        x: -20.0, z: 6.0, y: 0.55, face: [-30, 6], look: { variant: 2, palette: 'fen', hair: 'cropped' },
        lines: ['Mind the third board. It has been the third board since before this.',
          'The traps come up heavier at the west end. I have stopped asking why.'],
        thanks: ['I sell eel. Nobody buys eel. So this is eel money.',
          'Take it. It is no use to me out here.'] },
      { id: 'eel-hesk', name: 'Hesk · the drums', role: 'gas',
        x: 5.8, z: 30.2, y: 0, face: [7.5, 31], look: { variant: 3, palette: 'fen', hair: 'cropped' },
        lines: ['Diesel for the pump. The pump is for the water. The water does not care.',
          'There was a boat. You do not want to know what happened to the boat.'],
        thanks: ['Two cans. Off the boat that is not coming back.'] },
      { id: 'eel-bram', name: 'Bram', role: 'guard',
        x: -3.6, z: 28.6, y: 0, face: [-3.6, 60], look: { variant: 4, palette: 'fen', hair: 'cropped' },
        lines: ['Road side. That is where it comes from.',
          'I do not sleep before the black hour. Nobody here does.'] },
      { id: 'eel-tam', name: 'Tam', role: 'guard',
        x: 3.6, z: 28.6, y: 0, face: [3.6, 60], look: { variant: 9, palette: 'fen', hair: 'cropped' },
        lines: ['Greer saw the first one. I saw the second.',
          'Keep your torch off the water. It draws them.'] },
      { id: 'eel-wick', name: 'Wick', role: 'guard',
        x: 2.6, z: 16, y: 0.10, face: [0, 40], look: { variant: 6, palette: 'fen', hair: 'tied' },
        lines: ['I check the traps. Something checks them before me.',
          'The cold does not bother me. The other thing does.'] },
      { id: 'eel-boy', name: 'a boy on the boards', role: 'plain',
        x: 19.4, z: -6, y: 0.55, face: [30, -6], walk: [[19.4, -6], [4, -6]],
        look: { variant: 11, palette: 'fen', hair: 'loose' },
        lines: ['I can hold my breath to the smokehouse and back. Do not tell Ness.',
          'Ord says the third board. It is the fourth.'],
        thanks: ['I counted. You got four.'] },
    ],
  },
  'the-cut': {
    r: 50, lamp: [-1, 12, 3.0], region: 'ridge',
    people: [
      { id: 'cut-roan', name: 'Roan', role: 'lookout', species: 'roan',
        x: 0, z: 28.3, y: 1.2, face: [0, 60], look: { variant: 5, palette: 'ridge', hair: 'cropped' },
        lines: ['The road brings them. Same as it brought you.',
          'Dace and Orrin and Hesper have rifles. Hesper can even shoot.',
          'They will come tonight. Stand with us, and I will remember it.'],
        here: ['Here they come.', 'Again. Keep them off the lane.', 'Last of them. Make it count.'],
        // ALEX: "after three conversations he gives a free case lead." The lead is the last
        // thing he says after the defence: the nearest unopened case, pinned on the map.
        thanks: ['Told you I would remember.',
          'There is a sealed case not far from here. Nobody has opened it. Now you know where.'],
        gift: 'case-lead' },
      { id: 'cut-ilke', name: 'Ilke · lime burner', role: 'host',
        x: -5.2, z: 8.6, y: 0, face: [-6.4, 7], look: { variant: 4, palette: 'ridge', hair: 'tied' },
        lines: ['The kiln has not been out. Not once. Somebody is always up.',
          'Lime, mostly. And it keeps the lane warm, which is the real job now.'],
        thanks: ['You have done enough for one night. Come inside.'] },
      { id: 'cut-sarn', name: 'Sarn · at the hoist', role: 'trader',
        x: -15, z: -4.5, y: 3.4, face: [-17, -6], look: { variant: 6, palette: 'ridge', hair: 'cropped' },
        lines: ['Everything up there came up on that rope. Including Meriel.',
          'The face is good stone. We were forty years off finishing it.'],
        thanks: ['We do not pay in lime. Not any more.',
          'Coin. Real coin. Off the last lorry that ever came up here.'] },
      { id: 'cut-meriel', name: 'Meriel · the drums', role: 'gas',
        x: 11.4, z: 23.2, y: 0, face: [13, 24], look: { variant: 7, palette: 'ridge', hair: 'loose' },
        lines: ['From the terrace you can see the road lamps go. One at a time, most nights.',
          'The drums are for the hoist engine. The hoist engine is for nothing, now.'],
        thanks: ['Two cans. The engine will not miss them.'] },
      { id: 'cut-dace', name: 'Dace', role: 'guard',
        x: -4, z: 25, y: 0, face: [-4, 60], look: { variant: 0, palette: 'ridge', hair: 'cropped' },
        lines: ['Stone at my back. That is the whole plan.',
          'They do not like the kiln light. They come anyway.'] },
      { id: 'cut-orrin', name: 'Orrin', role: 'guard',
        x: 4, z: 25, y: 0, face: [4, 60], look: { variant: 9, palette: 'ridge', hair: 'tied' },
        lines: ['I was a quarryman. Now I am this.',
          'If it gets past me it gets Ilke. So it does not get past me.'] },
      { id: 'cut-hesper', name: 'Hesper', role: 'guard',
        x: 10, z: -2.2, y: 3.4, face: [10, 40], look: { variant: 2, palette: 'ridge', hair: 'loose' },
        lines: ['I can hit the road from here. I have.',
          'Up here is where I would want to be, if I were you. I am not you.'] },
      { id: 'cut-pip', name: 'Pip · with the bucket', role: 'plain',
        x: -15.5, z: 9.5, y: 0, face: [-19, 14], walk: [[-15.5, 9.5], [-13.5, 19]],
        look: { variant: 11, palette: 'ridge', hair: 'cropped' },
        lines: ['Lime in the bucket. Lime on my hands. Lime in the bread, probably.',
          'Ilke says the kiln is older than the road. The road says nothing.'],
        thanks: ['I watched from the stair. You were quick.'] },
    ],
  },
  highwood: {
    r: 44, lamp: [0, 1, 3.0], region: 'pines',
    people: [
      { id: 'wood-tobin', name: 'Tobin', role: 'lookout', species: 'sheet',
        x: 0, z: 25.3, y: 1.2, face: [0, 60], look: { variant: 10, palette: 'pines', hair: 'loose' },
        lines: ['Nothing comes through the trees. It comes up the road, same as everyone.',
          'Aldo, Marn and Sif. Three rifles. One of them was mine, before the sheet.',
          'They are close. Stand with us. You would have liked the party.'],
        here: ['Here they come.', 'More. Keep the fire between you and them.', 'Last of them. Then we sit down.'],
        thanks: ['That was the party, then.', 'Wren keeps a bed for whoever needs it. Tonight that is you.'] },
      { id: 'wood-wren', name: 'Wren · the cabin', role: 'host',
        x: -13.2, z: -5.0, y: 0, face: [-14.3, -4], look: { variant: 8, palette: 'pines', hair: 'loose' },
        lines: ['It was a party. It is still a party. We are just quite tired.',
          'I came down first. The others took a year.'],
        thanks: ['Come inside. The bed is made.'] },
      { id: 'wood-pell', name: 'Pell · at the table', role: 'trader',
        x: -2.2, z: -7.2, y: 0, face: [0, -5.5], look: { variant: 9, palette: 'pines', hair: 'cropped' },
        lines: ['Thirteen rungs. I counted them coming down. I am not going back up.',
          'We keep the lanterns cut. It is a thing to do with an evening.'],
        thanks: ['There was a collection. For the band. The band never came.',
          'So it is yours. Do not spend it on a band.'] },
      { id: 'wood-cass', name: 'Cass · at the winch', role: 'gas',
        x: 1.9, z: -11.2, y: 0, face: [3.6, -12.4], look: { variant: 11, palette: 'pines', hair: 'tied' },
        lines: ['The basket takes two. Three if you like each other.',
          'Nobody has gone up in a year. There is nothing up there to go up for.'],
        thanks: ['Two cans. The winch will not need them again.'] },
      { id: 'wood-aldo', name: 'Aldo', role: 'guard',
        x: -4, z: 22, y: 0, face: [-4, 60], look: { variant: 0, palette: 'pines', hair: 'cropped' },
        lines: ['I was the skeleton. Sif was the witch. Marn came as himself.',
          'Fire behind me, road in front. I can live with that.'] },
      { id: 'wood-marn', name: 'Marn', role: 'guard',
        x: 4, z: 22, y: 0, face: [4, 60], look: { variant: 5, palette: 'pines', hair: 'tied' },
        lines: ['They do not like the pumpkins. Neither do I, any more.',
          'The trees hide us from the road. They hide the road from us too.'] },
      // D17: moved from z 13 to z 7. The third rifle in each hamlet stands DEEP and answers
      // only what gets past the first two — Wick is 23-26 m off Eelwater's attack points and
      // Hesper is 38 m off The Cut's, both outside GUARD_SIGHT, but at z 13 Sif was 18.2 m
      // off the east one and inside it, which made Highwood the one hamlet where all three
      // rifles could answer a wave the moment it landed (measured: the three of them cleared
      // wave 1 alone in 10.5 s here against 22 and 39 at the other two). Seven metres back
      // puts her 23.9 m off it, and closer to the fire she talks about.
      { id: 'wood-sif', name: 'Sif', role: 'guard',
        x: 6.5, z: 7, y: 0, face: [3, 40], look: { variant: 2, palette: 'pines', hair: 'loose' },
        lines: ['I was the witch. I still have the hat somewhere.',
          'Sit by the fire if you want. Just do not stand in my line.'] },
      { id: 'wood-lark', name: 'Lark · in a paper crown', role: 'plain',
        x: 12.5, z: 5.5, y: 0, face: [0, 1], walk: [[12.5, 5.5], [5, 4]],
        look: { variant: 7, palette: 'pines', hair: 'loose' },
        lines: ['I was a king. I am still a king. Nobody has said otherwise.',
          'The lanterns are paper. The fire is not. Pell says to remember which.'],
        thanks: ['A king does not thank people. But.'] },
    ],
  },
});

/* ------------------------------------------------------------------- the system -- */

const NEAR_R = 90;            // spawn the people inside this
const TALK_R = 2.9;
const TALK_DOT = 0.60;
const LAMP_NEAR = 70;
const TALK_REST_S = 8;        // D10: dark this long after the last line's reading time
const WALK_SPEED = 0.62;      // m/s: a stroll, half the Holdfast's 0.74, on boards and dust
const WALK_PAUSE_S = 3;       // s at each end of a route
const LAMP_PEAK = 7.5;        // the fire's borrowed rover
const FLARE_S = 2.5;          // s the fire swells for when the hamlet holds...
const FLARE_GAIN = 1.6;       // ...to (1 + this) times its peak, easing back
const RACK_FIRST_S = 0.9;     // s after the lookout's line the first rifle is cleared
const RACK_GAP_S = 0.45;      // s between the three
const RACK_GAIN = 0.4;        // the dealer's bolt, quietly: three people unloading, not a volley
const GAS_PRICE = 100;        // the tower keepers' can (mechanics.js GAS_PRICE): one county, one price
const AMMO_LINE = (STOCK.find(s => s.ammo) || {}).line || 'One bundle for every gun you own.';
// What anyone says to you mid-siege, by where the nearest of it is from where you are looking.
// 0 nothing standing (between waves), 1 behind, 2 left, 3 right, 4 in front, past them.
const BUSY = Object.freeze(['Not now. There is more coming.', 'Not now. Behind you.',
  'Not now. On your left.', 'Not now. On your right.', 'Not now. Past me.']);
const FLOOR_RECHECK_S = 0.7;  // ask the collision field for the floor this often: a chunk
                              // that streams in after the person did re-floors them inside a
                              // second, and 8 probes a step at most is nothing
/* ---------------------------------------------------------- THE THREE RIFLES (D17) --
 *
 * ALEX asked for "an event where you talk to one, fight off enemies, and then people are
 * thankful". The verification pass at Eelwater got the middle third wrong: wave 1 — three
 * hounds at 6-9 m — was dead on the wave's FIRST step, before the player could pull a
 * trigger. That was holdfast-life._protect lifted whole: 56 m of reach, a shot every 0.8 s
 * from each of three rifles with no phase between them, 68 damage, and never a miss. Against
 * a 55 hp hound (enemies/species.js) one hit is one kill, so three guards deleted three
 * hounds in one frame. 255 damage a second, out to 56 m, was the whole defence.
 *
 * THEY ARE VILLAGERS WITH RIFLES, NOT THE ANSWER. Every number below is picked so the
 * player kills most of what comes and the guards stop him being surrounded:
 *
 *   DMG 24        a hound (55) now takes THREE hits, a poacher (70) three, a standing (60)
 *                 three, a hunter (140) six, a drowned (260) eleven. Nothing in any of the
 *                 three wave tables dies to one rifle, and the heavies are simply not
 *                 something three villagers can shoot down.
 *   SIGHT 20      was 56. The attack points are 11-19 m from the two rifles at the road end
 *                 and 23-38 m from the third, standing deeper in, so the guards answer what
 *                 ARRIVES and never reach out across the approach. The approach is yours.
 *   CADENCE 1.9   was 0.8, and the phase below spreads the three of them across it, so the
 *                 hamlet sounds like three people working bolt rifles and not one machine gun.
 *   REACT 0.8     a target has to have been there this long before the first shot, and the
 *                 clock restarts every time a guard loses it or is made to flinch. This is
 *                 the whole reason wave 1 can no longer die on the frame it arrives.
 *   HIT 0.66/0.22 hit chance at 7 m falling to 20 m. A miss still costs the round, still
 *                 draws its tracer and still makes its noise — it goes WIDE, which is how
 *                 you read that they are missing.
 *   MAG 5 / 3.4   five rounds, then the rifle comes down for 3.4 s (townAim 0, so the body
 *                 lowers it). One decrement and one compare in the hot path.
 *
 * Per rifle that is 5 rounds in 5 x (1.9 + its phase) + 3.4, about 0.35 shots a second; at
 * 13 m (hit 0.46) that is 3.8 damage a second, 12 across all three and in practice less,
 * because a guard who takes a stray swing holds fire for twelve seconds (townFear). Twelve
 * against the old two hundred and fifty-five.
 *
 * MEASURED, tests/hamlets.mjs, the three rifles alone against wave 1 where it actually lands:
 * Eelwater 22.0 s, Highwood 30.5 s, The Cut 39.3 s — against ONE STEP before. Nothing dies on
 * the frame a wave arrives, and the player has every kill he can reach first.
 */
const GUARD_NEAR = 100;       // m from the hamlet: the guards only work while you are here (Holdfast rule)
const GUARD_SIGHT = 20;       // m: what has arrived, not what is coming
const GUARD_CADENCE = 1.90;   // s between shots, one rifle, before its own phase
const GUARD_PHASE = 0.62;     // s of seeded per-guard spread on that cadence, so three rifles
                              // never come down on the same frame
const GUARD_REACT_S = 0.80;   // s a target must be held before the first shot of a sighting
const GUARD_DMG = 24;         // per hit: a hound (55 hp) survives two, the drowned (260) ten
const GUARD_HIT_NEAR = 0.66;  // hit chance at GUARD_NEAR_M or closer
const GUARD_NEAR_M = 7;
const GUARD_HIT_FAR = 0.22;   // ...falling to this at GUARD_SIGHT
const GUARD_MISS_M = 1.35;    // m a missed round passes the body by, at most
const GUARD_VOLLEY_GAP = 0.12;// s between ANY two rifles in the same hamlet. The phase alone
                              // spreads their cadence but not their first shot — all three see
                              // a wave arrive on the same frame — and this is what makes the
                              // hamlet ripple instead of volley. A rifle held back here keeps
                              // its round; it simply waits its turn.
const GUARD_MAG = 5;          // rounds before the rifle comes down
const GUARD_RELOAD_S = 3.4;   // s it stays down
const GUARD_FLASH_S = 0.05;   // s of borrowed muzzle light
// R3: WHERE A RIFLE LOOKS FROM. The sight line used to run from 1.2 m on the guard to 1.15 m
// on the target: waist to chest. Measured at The Cut, hands-off: a poacher stood 0.4 m behind
// the lookout post (a filled block 1.2 m high), 5.6 and 7 m from the two road-end rifles, and
// shot at the fire for three minutes, because that line grazed the top of the block; its head
// and shoulders were in plain view over it. A rifle is shouldered at the eye, and a guard who
// can only see a head and shoulders still takes the shot, just a harder one.
const GUARD_EYE = 1.55;       // m: the rifle at the shoulder, the eye behind it
const GUARD_CHEST = 1.15;     // m on the target: the first thing aimed at
const GUARD_HEAD_K = 0.85;    // x the target's height: what shows over cover
const GUARD_HEAD_HIT = 0.6;   // x the hit chance when only that much of it shows

/** A villager's hit chance at `d` metres: flat inside GUARD_NEAR_M, linear out to the edge. */
export function guardHitChance(d) {
  if (d <= GUARD_NEAR_M) return GUARD_HIT_NEAR;
  if (d >= GUARD_SIGHT) return GUARD_HIT_FAR;
  const t = (d - GUARD_NEAR_M) / (GUARD_SIGHT - GUARD_NEAR_M);
  return GUARD_HIT_NEAR + (GUARD_HIT_FAR - GUARD_HIT_NEAR) * t;
}

/** The rifle, as numbers, so a node check can read them instead of copying them. */
export const GUARD = Object.freeze({
  near: GUARD_NEAR, sight: GUARD_SIGHT, cadence: GUARD_CADENCE, phase: GUARD_PHASE,
  react: GUARD_REACT_S, dmg: GUARD_DMG, hitNear: GUARD_HIT_NEAR, nearM: GUARD_NEAR_M,
  hitFar: GUARD_HIT_FAR, mag: GUARD_MAG, reload: GUARD_RELOAD_S,
});

// module scratch, never allocated per step: the guard ray, one world point, the prompt
const _from = new THREE.Vector3(), _to = new THREE.Vector3(), _ray = new THREE.Vector3();
// A guard's hit, reused: the round's own line on the ground (dx/dz) so the body it strikes
// is pushed the way the round went (enemies.damage, r3). Owners must not keep it.
const _guardHit = { zone: 'torso', point: null, dist: 0, dx: 0, dz: 0, source: 'guard' };
const _scratch = { x: 0, y: 0, z: 0 };
const _prompt = { kind: 'hold', label: 'E', rank: 9, x: 0, y: 0, z: 0, k: 0, detail: '', subdetail: '', unavailable: false };

export class HamletLife {
  static id = 'hamlet-life';

  constructor(ctx) {
    this.ctx = ctx;
    this.sites = [];          // { id, spec, plan, rec, people[], lamp }
    this.time = 0;
    this.useLock = false;
    this.target = '';
    this.siege = '';          // the hamlet whose defence is live: contains() ignores it (C22)
    this._offs = [];
    // One stream for every round the three rifles ever fire. No Math.random anywhere in src:
    // fork() is the law, and a named fork means adding one never shifts another's sequence.
    this._aim = ctx.rng?.fork ? ctx.rng.fork('hamlet-guard-aim') : null;
    // THE COUNTER, after the trader has paid. Two rows, made once and rewritten in place; the
    // menu itself is made the first time a counter opens (it owns a canvas).
    this._shopRows = [
      { id: 'ammo', name: 'AMMUNITION', price: AMMO_PRICE, line: AMMO_LINE, ammo: true,
        owned: false, full: false, unavailable: false, tag: '', note: '' },
      { id: 'gas', name: 'GAS CAN', price: GAS_PRICE, line: 'One can. It fills the car.', gas: true,
        owned: false, full: false, unavailable: false, tag: '', note: '' },
    ];
    this._shopSpec = { key: '', title: '', rank: 9, cash: 0, x: 0, y: 0, z: 0, offers: this._shopRows, buy: o => this._buy(o) };
    this._menu = null;
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const places = this._sys('places');
    for (const [id, spec] of Object.entries(HAMLETS)) {
      const rec = places?.nodes?.get?.(id);
      if (!rec) continue;
      const site = {
        id, spec, plan: HAMLET_PLAN[id], rec, lamp: null, lastShot: -99, flareT: 0,
        tag: 'siege:' + id, shopKey: 'hamlet:' + id,   // made once: read every step
        people: spec.people.map(p => ({
          ...p, e: null, gen: 0,
          read: 0, restUntil: 0, talks: 0, chain: '',   // D10: this read-through, and which chain it is
          wp: 1, dir: 1, pause: 0, goalY: 0,            // the idle walk
          floorT: 0, homeYaw: 0,
          // THE RIFLE, per guard. `phase` is seeded ONCE, off this person's own fork, so Bram
          // and Tam and Wick keep their own beat for ever and never fire on the same frame.
          // Everything else is plain numbers on the person: no Map, no allocation, no lookup.
          phase: p.role === 'guard' && this.ctx.rng?.fork
            ? this.ctx.rng.fork('hamlet-guard:' + p.id).next() * GUARD_PHASE : 0,
          nextShot: 0, seenT: 0, mag: GUARD_MAG, reloadT: 0, rackT: 0,
        })),
      };
      this.sites.push(site);
    }
    // LIT GROUND, and NOT by pushing a circle into ctx.shared.sanctuaryZones. That array IS
    // world/sanctuaries.js's own `sites` list — it assigns, not merges — and every entry in it
    // is walked each step expecting a lantern crown to draw. contains() below is the whole
    // answer instead: enemies.js checks it before a hostile spawn and world/safety.js checks
    // it first in peacefulAt(), which is what the dread lane and every placement path read.
    this._offs.push(this.ctx.bus.on('save:loaded', () => this._reset()));
    this._offs.push(this.ctx.bus.on('player:respawn', () => this._reset()));
  }

  ready() { return true; }

  /** Is (x, z) inside any hamlet that is not under siege? enemies.js and safety.js ask. */
  contains(x, z, padding = 0) {
    for (const s of this.sites) {
      if (s.id === this.siege) continue;
      const r = s.spec.r + padding;
      const dx = x - s.rec.def.x, dz = z - s.rec.def.z;
      if (dx * dx + dz * dz < r * r) return true;
    }
    return false;
  }

  /** hamlet-defence says which hamlet is live ('' for none). */
  setSiege(id) { this.siege = id || ''; }

  site(id) { for (const s of this.sites) if (s.id === id) return s; return null; }

  /** The first person with this role in a hamlet, or null. */
  person(id, role) {
    const s = this.site(id);
    if (!s) return null;
    for (const q of s.people) if (q.role === role) return q;
    return null;
  }

  _world(s, lx, lz, ly) {
    const rec = s.rec, c = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
    _scratch.x = rec.def.x + lx * c + lz * sy;
    _scratch.z = rec.def.z - lx * sy + lz * c;
    _scratch.y = rec.padY + (ly || 0);
    return _scratch;
  }

  /**
   * THE FLOOR under a world point, asked from the storey the person lives on.
   * collision.supportHeight searches 0.48 m below and a step above the height it is handed
   * and falls back to bare terrain, which inside the flat pad is the pad. So a person on
   * The Cut's terrace is asked from padY + 3.4 and gets the terrace top when its chunk is
   * resident, and the pad (inside the fill, unseen, for under a second) when it is not.
   */
  _floorAt(wx, wz, refY) {
    const col = this._sys('collision');
    if (col && typeof col.supportHeight === 'function') {
      const h = col.supportHeight(wx, wz, refY, 0.34, 0.45);
      if (Number.isFinite(h)) return h;
    }
    const terrain = this._sys('terrain');
    return terrain && typeof terrain.heightAt === 'function' ? terrain.heightAt(wx, wz) : refY;
  }

  _reset() {
    const en = this._sys('enemies');
    for (const s of this.sites) {
      for (const p of s.people) {
        if (p.e && p.e.gen === p.gen && (p.e.alive || p.e.state === 'corpse')) en?._release?.(p.e);
        p.e = null; p.read = 0; p.restUntil = 0; p.chain = ''; p.wp = 1; p.dir = 1; p.pause = 0;
        p.nextShot = 0; p.seenT = 0; p.mag = GUARD_MAG; p.reloadT = 0; p.rackT = 0;
      }
      s.lastShot = -99; s.flareT = 0;
    }
    this.target = '';
  }

  /* -------------------------------------------------------------- spawn -- */

  _spawn(s, q) {
    const en = this._sys('enemies');
    const at = this._world(s, q.x, q.z, q.y);
    const wx = at.x, wz = at.z, refY = at.y;
    const feetY = this._floorAt(wx, wz, refY);
    let yaw = (q.yaw || 0) + s.rec.yaw;
    if (q.face) { const f = this._world(s, q.face[0], q.face[1], 0); yaw = faceYaw(wx, wz, f.x, f.z); }
    const guard = q.role === 'guard';
    q.e = en.spawn(q.species || (guard ? 'hamlet-guard' : 'resident'), wx, wz, {
      staged: true, neutral: true, initiallyNeutral: true,
      siteGuard: 'hamlet:' + s.id + ':' + q.id,
      feetY, yaw, placementRadius: 0.6,
      townGuard: guard, townCivilian: !guard,
      look: q.look,
    });
    if (!q.e) return;
    q.gen = q.e.gen; q.homeYaw = yaw; q.floorT = 0;
    q.e.townName = q.name;
    q.e.looted = true;          // a person is not a pocket to go through
    q.wp = 1; q.dir = 1; q.pause = 0; q.goalY = feetY;
  }

  /** Re-ask the floor under where the person is standing now. */
  _refloor(q, s, dt) {
    q.floorT -= dt;
    if (q.floorT > 0) return;
    q.floorT = FLOOR_RECHECK_S;
    const e = q.e;
    const h = this._floorAt(e.stagedX, e.stagedZ, s.rec.padY + (q.y || 0));
    if (Math.abs(h - e.stagedY) > 0.02) e.stagedY = h;
  }

  /* --------------------------------------------------------------- walk -- */
  // holdfast-life._walk, shortened: a two-point stroll, a pause at each end, a ray ahead so
  // nobody walks into a wall, and a stop when you are close or they are talking.
  _walk(s, q, dt) {
    const e = q.e;
    e.townWalk = 0;
    if (!q.walk || q.walk.length < 2) return;
    if (this.target === q.id || this.siege === s.id) return;
    const d = this._sys('dialogue');
    if (d?.active?.opts?.speakerEntity === e) return;
    if (q.pause > 0) { q.pause -= dt; return; }
    const w = q.walk[q.wp];
    const goal = this._world(s, w[0], w[1], q.y);
    const gx = goal.x, gz = goal.z;
    const dx = gx - e.stagedX, dz = gz - e.stagedZ, dist = Math.hypot(dx, dz);
    if (dist < 0.22) {
      q.wp += q.dir;
      if (q.wp >= q.walk.length || q.wp < 0) { q.dir *= -1; q.wp += q.dir * 2; }
      q.pause = WALK_PAUSE_S + (q.read % 3);
      return;
    }
    const col = this._sys('collision');
    if (col && typeof col.raycast === 'function') {
      _from.set(e.stagedX, e.stagedY + 0.8, e.stagedZ); _ray.set(dx / dist, 0, dz / dist);
      const hit = col.raycast(_from, _ray, 0.65, col.MASK.SOLID);
      if (hit && hit.hit !== false) { q.dir *= -1; q.wp = Math.max(0, Math.min(q.walk.length - 1, q.wp + q.dir)); q.pause = 1; return; }
    }
    const p = this._sys('player');
    if (p?.pos && Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z) < 1.4) return;
    const step = Math.min(dist, WALK_SPEED * dt);
    const yaw = faceYaw(e.stagedX, e.stagedZ, gx, gz);
    const turn = Math.atan2(Math.sin(yaw - e.stagedYaw), Math.cos(yaw - e.stagedYaw));
    e.stagedYaw += turn * Math.min(1, dt * 9);
    e.stagedX += dx / dist * step; e.stagedZ += dz / dist * step;
    e.townWalk = step / Math.max(dt, 0.001);
    // the floor under the new spot, from the storey they live on
    q.goalY = this._floorAt(e.stagedX, e.stagedZ, s.rec.padY + (q.y || 0));
    e.stagedY += (q.goalY - e.stagedY) * Math.min(1, dt * 12);
  }

  /* -------------------------------------------------------------- guards -- */

  _sightAt(a, b, fromH, toH) {
    const col = this._sys('collision');
    if (!col || typeof col.raycast !== 'function') return true;
    _from.set(a.x, a.y + fromH, a.z); _to.set(b.x, b.y + toH, b.z);
    const dx = _to.x - _from.x, dy = _to.y - _from.y, dz = _to.z - _from.z;
    const d = Math.hypot(dx, dy, dz) || 0.001;
    _ray.set(dx / d, dy / d, dz / d);
    const h = col.raycast(_from, _ray, Math.max(0, d - 0.35), col.MASK.SIGHT | col.MASK.GROUND);
    return !(h && h.hit !== false);
  }

  /**
   * What a rifle at `a` can see of body `e` standing at `b`: 0 nothing, 1 its chest, or the
   * height on it (metres over its feet) of the part that shows over cover, head and shoulders.
   */
  _sight(a, b, e) {
    if (this._sightAt(a, b, GUARD_EYE, GUARD_CHEST)) return 1;
    const hh = ((e && e.def && e.def.height) || 0) * ((e && e.scale) || 1) * GUARD_HEAD_K;
    if (hh > GUARD_CHEST + 0.2 && this._sightAt(a, b, GUARD_EYE, hh)) return hh;
    return 0;
  }

  /**
   * SUPPORT FIRE, per hamlet. Every guard standing and neutral picks the nearest hostile
   * inside GUARD_SIGHT it can see and faces it. It does not shoot at it yet: the target has
   * to have been held for GUARD_REACT_S first, and the round itself waits for this guard's
   * own phase of the cadence. When it does fire it is a tracer, a borrowed muzzle light, the
   * dealer's rifle sound, and 24 damage IF it hits — guardHitChance(dist) off the seeded aim
   * stream decides, and a miss throws the tracer wide instead of doing nothing visible.
   *
   * Five rounds, then the rifle comes down for GUARD_RELOAD_S with townAim 0, which the body
   * draws as lowered. A guard hit by a stray swing is flinching (townFear, enemies.js), holds
   * fire until it passes, and has to find its target again afterwards.
   *
   * Nothing here allocates and nothing here can make a guard hostile.
   */
  _protect(s, dt) {
    const en = this._sys('enemies'), p = this._sys('player');
    if (!en || !p?.pos) return;
    if (Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z) > GUARD_NEAR) return;
    for (const q of s.people) {
      if (q.role !== 'guard') continue;
      const g = q.e;
      if (!g?.alive || g.gen !== q.gen || !g.neutral || g.down) continue;
      g.townGuard = true; g.townAim = 0;
      // THE RIFLE COMES DOWN. Out of rounds is three and a half seconds of one fewer gun, and
      // you can see which one it is, because townAim 0 is the lowered pose. The clock runs
      // whatever else is happening, so a reload started under the last body of a wave is
      // finished by the time the next one walks in.
      if (q.reloadT > 0) { q.reloadT -= dt; if (q.reloadT <= 0) q.mag = GUARD_MAG; }
      // flinching: no aim, no shot, and the sighting clock goes back to nothing
      if (g.townFear > 0) { q.seenT = 0; continue; }
      let target = null, dist = GUARD_SIGHT, part = 0;
      for (const e of en.all) {
        if (!e.alive || e.initiallyNeutral || e.neutral) continue;
        // R3: nothing that is on its way out (stood down, C3), on the ground, or one of the
        // hour's officials a round cannot touch. With nothing else in reach the rifle stays down.
        if (e.leaving || e.down || e.goingHome || e.def?.officer) continue;
        const d = Math.hypot(e.pos.x - g.pos.x, e.pos.z - g.pos.z);
        if (d >= dist) continue;
        const seen = this._sight(g.pos, e.pos, e);
        if (seen) { target = e; dist = d; part = seen; }
      }
      if (!target) { q.seenT = 0; if (this.target !== q.id) g.stagedYaw = q.homeYaw; continue; }
      g.stagedYaw = faceYaw(g.pos.x, g.pos.z, target.pos.x, target.pos.z);
      if (q.reloadT > 0) continue;              // still down: faces it, cannot answer it
      g.townAim = 1;
      // and it still has to be brought to bear: nothing is shot on the frame it appears, and
      // this guard's own phase says whether it is the first of the three to get there
      q.seenT += dt;
      if (q.seenT < GUARD_REACT_S + q.phase) continue;
      if (this.time < q.nextShot) continue;
      if (this.time - s.lastShot < GUARD_VOLLEY_GAP) continue;   // wait your turn
      s.lastShot = this.time;
      q.nextShot = this.time + GUARD_CADENCE + q.phase;
      if (--q.mag <= 0) q.reloadT = GUARD_RELOAD_S;

      const mz = g.built?.muzzle, sy = Math.sin(g.stagedYaw), cy = Math.cos(g.stagedYaw), scale = g.scale || 1;
      _from.set(g.pos.x + (mz ? mz.x * cy + mz.z * sy : 0) * scale, g.pos.y + (mz ? mz.y * scale : 1.5), g.pos.z + (mz ? -mz.x * sy + mz.z * cy : 0) * scale);
      // aimed at the chest, or at whatever shows over the cover (a harder shot)
      let dx = target.pos.x - _from.x, dy = target.pos.y + (part === 1 ? 1 : part) - _from.y, dz = target.pos.z - _from.z;
      const hit = (this._aim ? this._aim.next() : 0) < guardHitChance(dist) * (part === 1 ? 1 : GUARD_HEAD_HIT);
      if (!hit) {
        // WIDE. Push the round off the body by up to GUARD_MISS_M across the line of sight,
        // and a hand's worth high or low, so the tracer visibly goes past it. Scalars only.
        const r = this._aim ? this._aim.next() : 0.5;
        const off = (r < 0.5 ? -1 : 1) * (0.55 + Math.abs(r * 2 - 1) * (GUARD_MISS_M - 0.55));
        const fx = dx, fz = dz, fl = Math.hypot(fx, fz) || 0.001;
        dx += (-fz / fl) * off; dz += (fx / fl) * off; dy += off * 0.35;
      }
      const n = Math.hypot(dx, dy, dz) || 0.001;
      _ray.set(dx / n, dy / n, dz / n);
      this._sys('fx')?.tracer?.(_from, _ray, dist);
      this._sys('lights')?.borrow('hamlet-guard', _from.x, _from.y, _from.z, 0xffc27a, 26, GUARD_FLASH_S);
      if (hit) {
        const gl = Math.hypot(_ray.x, _ray.z) || 1;
        _guardHit.point = target.pos; _guardHit.dist = dist; _guardHit.dx = _ray.x / gl; _guardHit.dz = _ray.z / gl;
        en.damage(target, GUARD_DMG, _guardHit);
      }
      this._sys('audio')?.dread?.('dealer-shot', g.pos.x, g.pos.y + 1.5, g.pos.z, 0.16);
      this.ctx.bus.emit('hamlet:guard-shot', { site: s.id, x: g.pos.x, y: g.pos.y + 1.5, z: g.pos.z, target: target.pos, hit });
    }
  }

  /* --------------------------------------------------------------- talk -- */

  /** Which chain a person is on: their lines, or their thanks once the hamlet held. */
  _lines(q, s) {
    const won = !!this._sys('hamlet-defence')?.won?.(s.id);
    const chain = won && q.thanks ? 'thanks' : 'lines';
    if (q.chain !== chain) { q.chain = chain; q.read = 0; q.restUntil = 0; }
    return chain === 'thanks' ? q.thanks : q.lines;
  }

  /**
   * Say the next line. Every line is an ad-hoc object (priority 4, interruptible) handed to
   * the dialogue system, which owns the queue, the subtitle and who may talk over whom. The
   * index only ever moves forward; the rest after the last line is set here and read in
   * step(), where the prompt is.
   */
  _talk(q, s) {
    const d = this._sys('dialogue');
    if (!d) return;
    const lines = this._lines(q, s);
    const i = q.read;
    if (i >= lines.length) return;
    const text = lines[i];
    const ok = d.say({ id: 'hamlet.' + s.id + '.' + q.id + '.' + q.chain + i, speaker: q.name, text, priority: 4, interrupt: true },
      { speakerEntity: q.e, name: q.name });
    if (!ok) return;
    q.read++; q.talks++;
    if (q.read < lines.length) return;
    // THE LAST LINE: the rest starts on the press, not on dialogue:end, so a danger line
    // cutting the person mid-sentence can never leave it unset.
    q.restUntil = this.time + readingTime(text) + 0.35 + TALK_REST_S;
    if (q.chain === 'thanks') {
      // A GIFT lands with the line that says it, not a beat later and not on a separate press.
      if (q.role === 'trader' || q.role === 'gas') this._sys('hamlet-defence')?.thank?.(s.id, q.role, q.e);
      if (q.gift === 'case-lead') this._caseLead();
    }
  }

  /**
   * ROAN'S FREE LEAD. The same thing Bo charges 260 coins for, given away because Roan said
   * he would remember. Nearest unopened, un-rumoured case; nothing if there is none left,
   * and nothing said either — he is not going to admit he had nothing.
   */
  _caseLead() {
    const pr = this._sys('progress');
    const p = this._sys('player');
    if (!pr || !p?.pos) return;
    let best = null, bd = Infinity;
    for (const site of Object.values(CASE_SITE)) {
      if (pr.mapStatus('case:' + site) !== 'unknown') continue;
      const d = MAJOR_BY_ID[site];
      if (!d) continue;
      const dist = Math.hypot(p.pos.x - d.x, p.pos.z - d.z);
      if (dist < bd) { bd = dist; best = { id: 'case:' + site, name: d.name + ' · a sealed case', x: d.x, z: d.z, kind: 'place' }; }
    }
    if (best) pr.learnRumour(best);
  }

  /* ------------------------------------------------------------ the end -- */

  /**
   * THE HAMLET HELD, said out loud (hamlet-defence._win). The lookout says the first of her
   * thanks across the hamlet, and the next time you talk to her she goes on from there; if she
   * is down, the first rifle standing says it instead. Then the three rifles are cleared, one
   * after another (see _rack). Returns whether anybody said it.
   */
  announceHeld(id) {
    const s = this.site(id);
    if (!s) return false;
    let i = 0;
    for (const g of s.people) if (g.role === 'guard') g.rackT = RACK_FIRST_S + RACK_GAP_S * i++;
    const d = this._sys('dialogue');
    if (!d) return false;
    const q = this.person(id, 'lookout');
    if (q?.e?.alive && q.e.gen === q.gen && !q.e.down && q.thanks?.length) {
      const text = q.thanks[0];
      const ok = d.say({ id: 'hamlet.' + id + '.' + q.id + '.thanks0', speaker: q.name, text, priority: 5, interrupt: true, audibleR: 70 },
        { speakerEntity: q.e, name: q.name });
      if (ok) {
        q.chain = 'thanks'; q.read = 1; q.talks++;
        q.restUntil = q.read >= q.thanks.length ? this.time + readingTime(text) + 0.35 + TALK_REST_S : 0;
        return true;
      }
    }
    for (const g of s.people) {
      if (g.role !== 'guard' || !g.e?.alive || g.e.gen !== g.gen || g.e.down) continue;
      return !!d.say({ id: 'hamlet.' + id + '.' + g.id + '.held', speaker: g.name, text: 'That is the last of them.', priority: 5, interrupt: true, audibleR: 70 },
        { speakerEntity: g.e, name: g.name });
    }
    return false;
  }

  /** The fire swells and settles (the same borrowed rover: no new light). */
  flare(id) { const s = this.site(id); if (s) s.flareT = FLARE_S; }

  /** A rifle cleared: the dealer's bolt, quietly, from where the guard stands, rifle down. */
  _rack(q, dt) {
    q.rackT -= dt;
    if (q.rackT > 0) return;
    q.rackT = 0;
    const g = q.e;
    if (!g?.alive || g.down) return;
    g.townAim = 0; q.seenT = 0;
    this._sys('audio')?.dread?.('dealer-rack', g.pos.x, g.pos.y + 1.3, g.pos.z, RACK_GAIN);
  }

  /**
   * Mid-siege, anybody you talk to says one short thing: where the nearest of it is, from
   * where you are looking. It never moves their read-through along.
   */
  _busy(q, s, p) {
    const d = this._sys('dialogue'), en = this._sys('enemies'), cam = this._sys('camera');
    if (!d) return;
    const tag = s.tag;
    let best = null, bd = Infinity;
    for (const e of en?.all || []) {
      if (!e.alive || e.siteGuard !== tag) continue;
      const dd = Math.hypot(e.pos.x - p.pos.x, e.pos.z - p.pos.z);
      if (dd < bd) { bd = dd; best = e; }
    }
    let k = 0;
    if (best && cam) {
      const dx = best.pos.x - p.pos.x, dz = best.pos.z - p.pos.z, l = Math.hypot(dx, dz) || 1;
      const sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
      const ahead = (dx * -sy + dz * -cy) / l, right = (dx * cy - dz * sy) / l;
      k = ahead < -0.45 ? 1 : ahead > 0.6 ? 4 : right < 0 ? 2 : 3;
    }
    d.say({ id: 'hamlet.' + s.id + '.' + q.id + '.busy' + k, speaker: q.name, text: BUSY[k], priority: 4, interrupt: true },
      { speakerEntity: q.e, name: q.name });
  }

  /* ------------------------------------------------------------ the counter -- */

  /** Is every gun you own at its reserve ceiling? Then the AMMUNITION row reads FULL (dealer.js's rule). */
  _ammoFull(w) {
    const owned = w?.owned;
    if (!owned || !owned.length) return false;
    for (let k = 0; k < owned.length; k++) {
      const base = CFG.weapons?.defs?.[owned[k]];
      if (base && w.reserveOf(owned[k]) < base.reserve * 2) return false;
    }
    return true;
  }

  /** The trader's counter, driven every step he is in focus. Rows rewritten in place. */
  _shop(q, s, dt) {
    const pr = this._sys('progress'), w = this._sys('weapons');
    if (!pr) return;
    const ammo = this._shopRows[0];
    ammo.full = this._ammoFull(w); ammo.line = ammo.full ? AMMO_FULL_LINE : AMMO_LINE;
    const spec = this._shopSpec, e = q.e;
    spec.key = s.shopKey; spec.title = q.name; spec.cash = pr.cash();
    spec.x = e.pos.x; spec.y = e.pos.y + 1.6; spec.z = e.pos.z;
    if (!this._menu) this._menu = new ShopMenu(this.ctx);
    this._menu.show(spec, dt);
  }

  /** One purchase, from the menu, only when the row could be bought and the purse covered it. */
  _buy(o) {
    const pr = this._sys('progress'), w = this._sys('weapons');
    if (!pr) return;
    if (o.ammo) {
      if (!w || this._ammoFull(w)) return;
      if (pr.spendCash(o.price, 'hamlet:ammo')) w.addReserveAll(1);
      return;
    }
    if (o.gas && pr.spendCash(o.price, 'hamlet:gas')) pr.addGas(1);
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.ctx.playing || this.ctx.paused) { this._menu?.close(); return; }
    this.time += dt;
    const p = this._sys('player');
    const en = this._sys('enemies');
    const lights = this._sys('lights');
    const defence = this._sys('hamlet-defence');
    if (!p?.pos || !en) { this._menu?.close(); return; }
    const use = this.ctx.input.held('use');
    if (!use) this.useLock = false;

    let talkTo = null, talkSite = null, best = TALK_R;
    for (const s of this.sites) {
      const d = Math.hypot(p.pos.x - s.rec.def.x, p.pos.z - s.rec.def.z);

      // ONE ROVER PER HAMLET, over the fire, and only while you are in it. The lanterns in
      // the geometry are emissive and cost nothing; this is the light that reaches the ground.
      // When the hamlet holds it swells and settles (flare), on the same rover.
      if (d < LAMP_NEAR && !p.dead) {
        const at = this._world(s, s.spec.lamp[0], s.spec.lamp[1], s.spec.lamp[2]);
        if (!s.lamp?.inUse) s.lamp = lights?.borrow('hamlet', at.x, at.y, at.z, 0xffb06a, LAMP_PEAK, 0) || null;
        if (s.lamp) { const f = s.flareT / FLARE_S; s.lamp.peak = LAMP_PEAK * (1 + FLARE_GAIN * f * f); }
      } else if (s.lamp) { lights?.release(s.lamp); s.lamp = null; }
      if (s.flareT > 0) s.flareT = Math.max(0, s.flareT - dt);

      // Out of reach, they go (and so does anything that is not standing, so a corpse can
      // never keep a lookout's one pool slot). Not while this hamlet's siege is live: you can
      // back off a hundred metres and the rifles are still there when you come back.
      const live = this.siege === s.id;
      if (d > NEAR_R && !live) {
        for (const q of s.people) {
          if (q.e && q.e.gen === q.gen && (q.e.alive || q.e.state === 'corpse')) en._release(q.e);
          q.e = null;
        }
        continue;
      }

      // the host's door takes the press there (hamlet-defence); asked once a step per hamlet
      const atDoor = !!defence?.atDoor?.(s.id);
      for (const q of s.people) {
        if (!q.e || q.e.gen !== q.gen) { q.e = null; this._spawn(s, q); if (!q.e) continue; }
        if (!q.e.alive || !q.e.neutral) continue;
        if (q.rackT > 0) this._rack(q, dt);
        // C6: on the ground, or getting up. Nobody walks it, re-floors it or talks to it.
        if (q.e.down) continue;
        this._refloor(q, s, dt);
        this._walk(s, q, dt);

        if (defence?.resting || atDoor) continue;
        const pos = q.e.pos;
        const dd = Math.hypot(p.pos.x - pos.x, p.pos.z - pos.z);
        if (dd > best || Math.abs(p.pos.y - pos.y) > 2.2) continue;
        const cam = this._sys('camera');
        if (!cam) continue;
        const dot = ((pos.x - p.pos.x) * -Math.sin(cam.yaw) + (pos.z - p.pos.z) * -Math.cos(cam.yaw)) / (dd || 1);
        if (dot < TALK_DOT) continue;
        best = dd; talkTo = q; talkSite = s;
      }
      this._protect(s, dt);
    }

    if (!this._focus(p, talkTo, talkSite, use, dt)) this._menu?.close();
  }

  /** The person you are facing: the counter, a word mid-siege, or the read-through. True when the counter is open. */
  _focus(p, talkTo, talkSite, use, dt) {
    if (!talkTo || p.dead || this.ctx.shared.inCar) { this.target = ''; return false; }
    const defence = this._sys('hamlet-defence');
    const e = talkTo.e;
    const live = this.siege === talkSite.id;

    // THE COUNTER. Once the trader has paid, he sells. Not on the press that paid, while E is
    // still down from it: that press was the line, not the start of a purchase hold.
    if (!live && talkTo.role === 'trader' && defence?.traderOpen?.(talkSite.id) && !(use && this.useLock)) {
      this.target = talkTo.id;
      e.stagedYaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
      this._shop(talkTo, talkSite, dt);
      return true;
    }

    const pp = _prompt;   // one payload, rewritten every step: hud.js copies the fields in its listener
    pp.x = e.pos.x; pp.y = e.pos.y + 1.6; pp.z = e.pos.z; pp.detail = talkTo.name;

    // MID-SIEGE: they will talk, briefly, and what they say is where to look.
    if (live) {
      this.target = talkTo.id;
      e.stagedYaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
      pp.rank = 9; pp.subdetail = 'E · TALK';
      this.ctx.bus.emit('prompt', pp);
      if (use && !this.useLock) { this.useLock = true; this._busy(talkTo, talkSite, p); }
      return false;
    }

    const lines = this._lines(talkTo, talkSite);
    const finished = talkTo.read >= lines.length;
    // THE ASK. The lookout, read through, with a defence still to be had: her prompt is the
    // ask, rank 10 so it beats ordinary talk, and it stays until you take it or the hamlet
    // holds. It never rests, and it never goes back to line 0 underneath you.
    const offer = talkTo.role === 'lookout' && talkTo.talks >= lines.length && talkTo.chain === 'lines'
      && !!defence?.canOffer?.(talkSite.id);
    if (!offer) {
      if (finished && this.time < talkTo.restUntil) { this.target = ''; return false; }   // D10: dark
      if (finished) talkTo.read = 0;                                                     // readable again
    }
    this.target = talkTo.id;
    e.stagedYaw = faceYaw(e.pos.x, e.pos.z, p.pos.x, p.pos.z);
    const d = this._sys('dialogue');
    const listening = !!(d?.active?.opts?.speakerEntity === e);
    pp.rank = offer ? 10 : 9;
    pp.subdetail = offer ? 'E · STAND WITH US' : listening ? 'E · LISTEN' : 'E · TALK';
    this.ctx.bus.emit('prompt', pp);
    if (!use || this.useLock) return false;
    this.useLock = true;
    if (offer) { defence.start(talkSite.id); return false; }
    this._talk(talkTo, talkSite);
    return false;
  }

  state() {
    return {
      hamlets: this.sites.map(s => ({
        id: s.id, lit: !!s.lamp?.inUse,
        standing: s.people.filter(q => q.e?.alive && !q.e.down).length,
        down: s.people.filter(q => q.e?.alive && q.e.down).length,
        talks: s.people.reduce((n, q) => n + q.talks, 0),
        // D17: what the three rifles are actually doing, for a report and for the suites
        rifles: s.people.filter(q => q.role === 'guard')
          .map(q => ({ id: q.id, mag: q.mag, reloading: q.reloadT > 0, aiming: q.seenT > 0 })),
      })),
      target: this.target,
      siege: this.siege,
      shop: !!this._menu?.showing,
    };
  }

  present() { this._menu?.present(); }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    const lights = this._sys('lights');
    for (const s of this.sites) if (s.lamp) { lights?.release(s.lamp); s.lamp = null; }
    this._reset();
    this._menu?.dispose(); this._menu = null;
  }
}

export default HamletLife;
