// CURFEW — the roster, as six rows of numbers.
//
// This file is DATA ONLY. It builds nothing, imports no THREE, and touches no
// system: enemies.js reads it to drive one state machine six different ways and
// bodies.js reads it for the proportions it has to sculpt. Keeping it inert is
// what makes "add a seventh species" a row rather than a branch.
//
// Every number is DESIGN section 4, and where DESIGN mirrors a game Alex has
// already played the number is VIGIL's, unchanged, on purpose.
//   donor: vigil/src/enemies/species.js:16-38 (SPECIES table shape, thrall row)
//
// CFG has no `enemies` block. Every constant below is therefore a local with its
// reason beside it, and docs/HANDOFF.md carries the request for a CFG home.

import { CFG } from '../config.js';

/* --------------------------------------------------------------------------
   Ownership. DESIGN §4's binding rule: horror bodies are DREAD-owned — never
   spawned by the pressure budget, exempt from HUNT, exempt from XP, outside
   the alive cap. Combat bodies are PRESSURE-owned and pay XP on the kill.
   -------------------------------------------------------------------------- */
export const OWNER = Object.freeze({ PRESSURE: 'pressure', DREAD: 'dread' });

/* Cycle phases a species is allowed to exist in.
   THE VOCABULARY IS EXACTLY 'dusk' | 'night' | 'black' | 'dawn' (integrator
   decision 1, 2026-09-02). That is what world/clock.js writes into
   ctx.shared.phase and what `phase:changed` carries. There is no second
   spelling and no alias table anywhere in this lane: a vocabulary that works by
   accident of which file reads which is a bug waiting for the next edit.
   An ABSENT phase is read as 'night' — the mid-cycle default. */
export const PHASE = Object.freeze({
  DUSK: 'dusk', NIGHT: 'night', BLACK: 'black', DAWN: 'dawn',
});
const ALL_PHASES = [PHASE.DUSK, PHASE.NIGHT, PHASE.BLACK, PHASE.DAWN];
const NIGHT_ONLY = [PHASE.NIGHT, PHASE.BLACK];

/* The telegraph floor is a LAW, not a preference: no attack lands without this
   much legible windup. CFG.director.telegraphMinS is 0.320. Every row below is
   asserted against it by `validate()` at the bottom of this file, which
   enemies.js calls once at construction — a species that violates the law must
   fail loudly at boot, not quietly in the dark. */
export const TELEGRAPH_MIN = CFG.director.telegraphMinS;

/* Body archetypes. bodies.js switches on this; enemies.js uses it only to pick
   a gait. Four separated silhouette heights (DESIGN §4 legibility): 0.90 /
   1.10 / 1.80-2.05 / 2.20. */
export const FORM = Object.freeze({
  QUADRUPED: 'quadruped',   // hound
  SHROUD: 'shroud',         // pallbearer — no legs, it drags
  GAUNT: 'gaunt',           // hunter — arms too long, no face
  HUMAN: 'human',           // poacher — coat, rifle
  PORCELAIN: 'porcelain',   // the Pale — no face, doll joints
  ORDINARY: 'ordinary',     // the Standing Kind — an ordinary body, still
});

/* --------------------------------------------------------------------------
   THE SIX.

   Field contract (enemies.js relies on every one of these existing on every
   row, so the state machine never branches on "does this species have..."):

     id, form, owner, xp, phases[]
     hp, dmg, radius, height, mass
     speed        m/s, the cruise
     burst,pause  seconds of the burst gait; burst >= 1e9 means "never pauses"
     engage       [min, max] metres the attack decision is allowed inside
     standoff     metres of the ring slot it steers to
     telegraph    seconds of legible windup (>= TELEGRAPH_MIN, asserted)
     attack       seconds the committed strike lasts
     strikeAt     seconds into `attack` the damage lands (a fixed point)
     recover      seconds of the breath afterwards
     strikeRange  metres the strike reaches
     deathNoise   metres of alert radius a kill broadcasts (0 = a quiet death)
     eye          hex of the glint that survives full dark
     cloth/skin   linear-ish albedos, deliberately below the torch (FETCH law)

   THE NIGHT-VALUE LAW (measured 2026-09-02, and it is a LAW because this lane
   got it backwards once already). A body must be DARKER than the sky it stands
   against, and the only bright thing on it is the glint. The reference values,
   as relative luminance Y (sRGB -> linear, 0.2126/0.7152/0.0722):

     moon      0xbecfe8  Y 0.614      <- the brightest thing in the frame
     hemi sky  0x6b82ad  Y 0.221
     ambient   0x44556e  Y 0.089

   Every `cloth` below therefore sits at Y 0.005-0.008 (0.5-0.8%) except the
   Pale, which is porcelain on purpose and is allowed to sit near the SKY. It is
   never allowed to sit near the MOON: at its first values (cloth Y 0.453, bone
   Y 0.633) it was as bright as the moon itself, and its own glint was only 1.4x
   its own face — a lamp with eyes painted on rather than a body.

   Every `eye` must clear the body's brightest surface (`bone`) by a wide
   margin, because the glint is what the player is supposed to resolve first, at
   range, before the shape does. Ratios eye:bone after this pass —
   hound 35x, pallbearer 17x, hunter 32x, poacher 20x, pale 3.7x, standing 2.9x.
   The Standing Kind is deliberately last: it is a PERSON and must not beacon.
   -------------------------------------------------------------------------- */

export const SPECIES = {

  /* ---------------------------------------------------------------- HOUND --
     The crowd. ROUND 6 (playtest 5, 2026-09-03: "There are wayyyy too many...
     Very quickly they accumulate and just follow you everywhere"): an order
     ARRIVES as 1-2 hounds (3-4 in the black hour), never as a gang. A pack
     ASSEMBLES around the player over a minute; it is not allowed to land.
     tools/arrivals.mjs measured the old 2-3 landing as five hounds in 0.6 s.
     Burst gait so it never
     beelines: 600 ms of travel, 350 ms of stillness, and it may only commit to
     an attack DURING a pause — move OR attack, never both.
     donor: vigil/src/enemies/species.js:16-24 (thrall) — Alex played this. */
  hound: {
    id: 'hound', form: FORM.QUADRUPED, owner: OWNER.PRESSURE, xp: 20,
    phases: ALL_PHASES,
    hp: 55, dmg: 22, radius: 0.42, height: 1.10, mass: 46,
    speed: 7.5,
    burst: 0.600, pause: 0.350,
    engage: [0, 15], standoff: 3.2,
    telegraph: 0.320, attack: 0.470, strikeAt: 0.10, recover: 0.380,
    strikeRange: 1.90,
    lungeRange: 4.20, lungeSpeed: 11.0, lungeTime: 0.26,
    leapCooldown: 5.5, squadLeapGap: 4.5,   // one squad leap token per 4.5 s
    retreatBelow: 0.25,                     // hp fraction: it breaks for cover
    packMin: 1, packMax: 2, packBlack: 4,   // ARRIVAL size, see the header; director.js _packSize mirrors it
    notice: 30, memAlert: 8.0,      // it smells you at 30 m with a clear line
    deathNoise: 14,
    countsAs: 0.5,                          // hounds count half against headcount
    eye: 0xffd9a0, cloth: 0x121110, skin: 0x1a1512, bone: 0x2b2721,
  },

  /* ----------------------------------------------------------- PALLBEARER --
     Dormant in the ground until noise wakes it, then it RISES where it was
     lying. The strike is committed to a fixed point 0.66 s ahead of you, so it
     is dodged by moving, never by out-DPSing. Chase 5.60 is deliberately under
     SPRINT 6.60: you can ALWAYS outrun it, which is what makes choosing to
     stand and fight a choice.
     donor: fetch/src/enemies.js:1983-2002 (the grave rise: squash 0.34 -> 1) */
  pallbearer: {
    id: 'pallbearer', form: FORM.SHROUD, owner: OWNER.PRESSURE, xp: 24,
    phases: ALL_PHASES,
    hp: 90, dmg: 26, radius: 0.52, height: 2.05, mass: 210,
    speed: 5.60,                            // < CFG.player.SPRINT 6.60, checked below
    burst: 1e9, pause: 0,
    engage: [0, 12], standoff: 1.7,
    telegraph: 1.100, attack: 0.660, strikeAt: 0.660, recover: 0.900,
    strikeRange: 0.96,                      // r 0.96 around the committed point
    dormant: true, wakeNoise: 22, riseTime: 1.40,
    notice: 24, memAlert: 10.0,             // half-blind: it works by sound and by near
    deathNoise: 34,                         // popping is loud: wakes 30-40 m
    countsAs: 1,
    eye: 0xbfd2e8, cloth: 0x14161a, skin: 0x1b1a18, bone: 0x3a3630,
  },

  /* -------------------------------------------------------------- HUNTER --
     Night only. 7.80 m/s in 900/300 ms bursts: FASTER than sprint 6.60 and
     SLOWER than tac-sprint 9.20, so the entire chase is that 1.2 m/s and the
     answer is the verb you have not spent yet. Screams to alert 60 m. It never
     attacks the frame it moves. */
  hunter: {
    id: 'hunter', form: FORM.GAUNT, owner: OWNER.PRESSURE, xp: 90,
    phases: NIGHT_ONLY,
    hp: 140, dmg: 34, radius: 0.48, height: 2.20, mass: 150,
    speed: 7.80,                            // > SPRINT 6.60, < tacSprint 9.20
    burst: 0.900, pause: 0.300,
    engage: [0, 18], standoff: 2.6,
    telegraph: 0.400, attack: 0.340, strikeAt: 0.140, recover: 0.620,
    strikeRange: 2.40,
    screamRadius: 60, screamCooldown: 11.0,
    notice: 44, memAlert: 14.0,             // it is the one that finds you first
    deathNoise: 26,
    countsAs: 1,
    eye: 0xe8f0ff, cloth: 0x0e0f11, skin: 0x191614, bone: 0x322d27,
  },

  /* -------------------------------------------------------------- POACHER --
     A person with a light who has seen yours. UNAWARE -> ALERTED -> HUNTING,
     with 6 s and 9 s memories. ONE brain: preferRange 14 / 26 / 44 makes a
     rusher, a grunt and a marksman out of the same rows. Fires REAL travelling
     bolts you can break line on — never a hit-chance roll. Accuracy scales with
     how lit you are, so the torch is a trade you keep making.
     donor: vigil/src/enemies/enemies.js:69-84 (fireBolt, ballistic solve) */
  poacher: {
    id: 'poacher', form: FORM.HUMAN, owner: OWNER.PRESSURE, xp: 45,
    phases: [PHASE.DUSK, PHASE.NIGHT, PHASE.DAWN],
    hp: 70, dmg: 18, radius: 0.40, height: 1.80, mass: 82,
    speed: 3.40, alertSpeed: 5.20,
    burst: 1e9, pause: 0,
    engage: [0, 52], standoff: 26,
    telegraph: 0.550, attack: 0.320, strikeAt: 0.120, recover: 1.100,
    strikeRange: 52,
    bands: [14, 26, 44],                    // rusher / grunt / marksman
    bandWeights: [0.28, 0.44, 0.28],
    accuracy: 0.42, litGain: 1.40,          // acc x (1 + lit * 1.40)
    spreadDeg: 4.6,                         // the miss cone at accuracy 0
    boltSpeed: 38, boltLife: 3.0, boltRadius: 0.42,
    memAlert: 6.0, memHunt: 9.0,
    fireLoud: 30,
    deathNoise: 18,
    countsAs: 1,
    eye: 0xffcf8a, cloth: 0x181614, skin: 0x241f1c, bone: 0x38332c,
  },

  /* ---------------------------------------------------------------- PALE --
     The weeping-angel rule, lifted verbatim from STILL: it creeps at 0.42 m/s
     ONLY while it is outside the torch cone. Look at it and it does not exist
     as a moving thing. Dread-owned: no XP, exempt from the pressure budget and
     from HUNT. Two sizes so a pair reads as a child and an adult.
     donor: qualiacology/still/src/game/floors.js:381-400 (dot > 0.82, 0.42 m/s,
     the 3.2/s dry joint tick, grab at 0.85) */
  pale: {
    id: 'pale', form: FORM.PORCELAIN, owner: OWNER.DREAD, xp: 0,
    phases: ALL_PHASES,
    hp: 44, dmg: 34, radius: 0.24, height: 1.70, mass: 38,
    childHeight: 0.90, childChance: 0.5,
    speed: 0.42,
    burst: 1e9, pause: 0,
    engage: [0, 0.85], standoff: 0,
    telegraph: 0.340, attack: 0.240, strikeAt: 0.120, recover: 1.400,
    strikeRange: 0.85,                      // the grab
    beamDot: 0.82, beamRange: 16, tickHz: 3.2,
    deathNoise: 0,
    countsAs: 0,
    // Porcelain, brought DOWN under the moon 2026-09-02. Was cloth 0xb9b3a6 /
    // skin 0xc7c1b4 / bone 0xd6d0c2 — Y 0.453 / 0.536 / 0.633, i.e. level with
    // the moon (0.614) and four times the sky (0.221), so a night frame read as
    // pale shapes against a dark ground: exactly backwards. These are Y 0.145 /
    // 0.186 / 0.233: still 20-45x every other body in the roster, so it is
    // unmistakably THE PALE, but it is now a lit object rather than a source,
    // and its glint clears its own face by 3.7x instead of 1.4x.
    eye: 0xf4f0e6, cloth: 0x6e6a60, skin: 0x7c776c, bone: 0x8a8478,
  },

  /* ------------------------------------------------------- STANDING KIND --
     An ordinary body, still. It moves only while unobserved: 42 m cone with
     dot > 0.28 AND an unblocked ray to the head, retested every 0.08 s. You
     learn the rule once and then every still figure in the county is a
     question. Dread-owned.
     donor: qualiacology/marrow/src/entity.js:355-356, 388-405 (observedTime
     accumulates 1x watched and drains 2x unwatched; the hold variant) */
  standing: {
    id: 'standing', form: FORM.ORDINARY, owner: OWNER.DREAD, xp: 0,
    phases: ALL_PHASES,
    hp: 60, dmg: 28, radius: 0.34, height: 1.78, mass: 76,
    speed: 2.60,
    burst: 1e9, pause: 0,
    engage: [0, 1.10], standoff: 0,
    telegraph: 0.360, attack: 0.260, strikeAt: 0.130, recover: 1.600,
    strikeRange: 1.10,
    coneDot: 0.28, coneRange: 42, retest: 0.08, leash: 24,
    deathNoise: 0,
    countsAs: 0,
    // Barely a glint: it is a PERSON, and it must never beacon like the rest of
    // the roster. But 0x2a2c30 measured Y 0.0251 against its own bone at
    // 0.0239 — a ratio of 1.05, which is not "barely a glint", it is NO glint,
    // and at impostor range the two painted dots were the same colour as the
    // card. 0x4d4a45 measures Y 0.069, a ratio of 2.9 — a hint you can catch at
    // conversational distance, and still 9-13x dimmer than any other species'
    // eye. One hex to revert if Alex wants it gone entirely.
    eye: 0x4d4a45,
    cloth: 0x151412, skin: 0x231d19, bone: 0x2f2a24,
  },
};

export const ROSTER = Object.keys(SPECIES);

/* Pool sizes. Allocated at boot; spawn() never allocates. Since round 6 the
   live pressure ceiling is CFG.director.aliveMax = 14 (was 26; DESIGN §4), so
   the pool is generous rather than tight: a corpse holds its slot for 45 s
   before it sinks, and the dread bodies are outside the cap by law and need
   their own slots. */
export const POOL = Object.freeze({
  hound: 16, pallbearer: 8, hunter: 3, poacher: 8, pale: 6, standing: 5,
});

/* Species allowed to answer a pressure order, in the order a budget prefers
   them. Dread-owned rows are deliberately absent: the director must not be
   able to spend its budget on horror. */
export const PRESSURE_ROSTER = ROSTER.filter((k) => SPECIES[k].owner === OWNER.PRESSURE);
export const DREAD_ROSTER = ROSTER.filter((k) => SPECIES[k].owner === OWNER.DREAD);

/**
 * Assert the roster obeys the laws it is written under. enemies.js calls this
 * once in its constructor: a violated law must be a boot failure, because the
 * whole recurring failure mode in this catalogue is a system that runs, looks
 * plausible and is quietly wrong.
 * Returns an array of complaint strings; empty means the roster is legal.
 */
export function validate() {
  const bad = [];
  for (const key of ROSTER) {
    const d = SPECIES[key];
    if (d.id !== key) bad.push(key + ': id does not match its key');
    if (!(d.telegraph >= TELEGRAPH_MIN)) {
      bad.push(key + ': telegraph ' + d.telegraph + ' < the law ' + TELEGRAPH_MIN);
    }
    if (!(d.strikeAt <= d.attack + 1e-9)) bad.push(key + ': strikeAt is past the end of attack');
    if (!(d.hp > 0) || !(d.radius > 0) || !(d.height > 0)) bad.push(key + ': degenerate body');
    if (!Array.isArray(d.engage) || d.engage.length !== 2) bad.push(key + ': engage is not a band');
    if (d.owner === OWNER.DREAD && d.xp !== 0) bad.push(key + ': dread-owned bodies pay no XP');
    if (POOL[key] === undefined) bad.push(key + ': no pool size');
    if (d.owner === OWNER.PRESSURE && !(d.notice > 0) && !d.bands) {
      bad.push(key + ': a pressure body with no notice range can never see you');
    }
  }
  // The two speed relationships the design is BUILT on. If either flips, the
  // chase stops meaning what it was written to mean.
  if (!(SPECIES.pallbearer.speed < CFG.player.SPRINT)) {
    bad.push('pallbearer must stay under SPRINT so you can always outrun it');
  }
  if (!(SPECIES.hunter.speed > CFG.player.SPRINT
     && SPECIES.hunter.speed < CFG.player.tacSprint.speed)) {
    bad.push('hunter must sit between SPRINT and tac-sprint: the chase IS that gap');
  }
  return bad;
}

export default SPECIES;
