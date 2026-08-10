// THE ROSTER — five archetypes, derived from FEEL, never re-declared.
//
// CONTRACT §5: every number that governs how the game FEELS lives in
// `src/feel.js` and is read from there. This file owns exactly one frozen table,
// `ENEMY_TABLE`, and everything in it is either (a) a number FEEL does not carry
// and that has been PROPOSED to the integrator in docs/HANDOFF.md, or (b) a
// derivation rule. `ARCHETYPES` below is a DERIVATION of `FEEL.enemies`, not a
// second copy of it — if a stat moves in FEEL it moves here, and if a stat is
// missing from FEEL the derivation throws at import rather than defaulting.
//
// THE ONE THING THIS FILE EXISTS FOR: LEGIBILITY IN THE DARK.
//
// The player must identify what is shooting at them from a SILHOUETTE, in a black
// room, at 40 m. Five channels are available and exactly one of them is banned:
//
//   SHAPE     the authored silhouette strip — vertical bar / low canted bar /
//             tall thin bar / wide yoke / ring. Emissive 0.12-0.18, which is
//             under the bloom prefilter's 0.85 threshold in the HDR buffer at
//             EVERY iris gain (the prefilter reads the scene BEFORE the gain
//             multiply, src/render/post.js), so a strip reads as SHAPE and never
//             as GLARE, needs no external light, and survives greyscale.
//   MOTION    3.6 / 7.2 / 2.8 / 2.4 / 2.7 m/s, and each archetype moves in its
//             own way: the RUNNER never strafes and attacks at once, the WARDEN
//             never stops, the BLOOM only ever closes.
//   TIMING    telegraph 0.34 / 0.32 / 0.80 / 0.34 / 0.80 s, and the cadence
//             jitter that stops six of them firing in unison.
//   SIZE      1.45 -> 2.20 m tall, 0.40 -> 0.70 m radius.
//   HUE       NOTHING. CONTRACT §6. The player has moderate deuteranomaly and
//             every strip in this game is the same warm amber.
//
// FIRE RATE IS AN INTERVAL IN SECONDS, NOT A FREQUENCY. FEEL gives WARDEN 0.55
// and LANTERN 1.80; read as Hz the LANTERN would do 50 dps at 70 m and the game
// would be over. Read as seconds, the roster lands at HUSK 8.2 / RUNNER 25.7 /
// LANTERN 15.6 / WARDEN 25.5 dps against a 100 hp player — a shape where the
// crowd chips, the melee punishes contact and the anchor is the thing you must
// answer. The brief's own cadence formula, `fireRate * (0.85 + rand * 0.30)`,
// only type-checks as a duration. Filed as a finding in docs/HANDOFF.md.

import FEEL from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';

const E = FEEL.enemies;

// ---------------------------------------------------------------------------
// THE ONE FROZEN TABLE for this module.
//
// Everything here is a number FEEL does not carry. Each is PROPOSED to the
// integrator (docs/HANDOFF.md → requests) rather than smuggled in: the rule is
// "propose numbers, don't write them", and a proposal that lives at its use site
// with the reasoning attached is the only kind the next agent can retune.
// ---------------------------------------------------------------------------
export const ENEMY_TABLE = Object.freeze({
  // ---- AWARENESS (D4) -----------------------------------------------------
  // Three states and one event. The radii are NOT here: they are
  // `weapon.loudness * (1 + flashGain)` and they arrive on the disturbance
  // record from src/weapons/fire.js, which is the only module allowed to know
  // how loud a gun is.
  state: Object.freeze({ unaware: 0, alerted: 1, hunting: 2 }),
  stateName: Object.freeze(['unaware', 'alerted', 'hunting']),

  // An UNAWARE creature sees in a cone; an ALERTED one has already turned toward
  // a bearing, so the cone is what makes "turn toward it" worth anything.
  // cos(62°) — deliberately narrower than the player's 68° FOV, so walking into
  // something's field of view is a decision the player could have made.
  spotConeCos: 0.469,
  // Awareness decays: HUNTING knows a position, and a position goes stale.
  huntMemory: 6.0,             // seconds of pursuit toward a last-known position
  alertMemory: 9.0,            // seconds facing a bearing before standing down
  // A creature that reaches the last-known position and finds nothing drops to
  // ALERTED rather than to UNAWARE — it knows something is here, not where.
  arriveRadius: 1.6,

  // ---- REACTION (D3's third term) ----------------------------------------
  // Seconds between acquiring HUNTING and the first wind-up. `x= 1 - lit*0.30`,
  // so standing in your own light is answered 30% faster.
  reactionBase: 0.52,
  reactionJitter: 0.22,        // +- fraction, from the cadence stream

  // ---- ACCURACY (D3's first term) ----------------------------------------
  // Base probability that a shot connects at the archetype's PREFERRED range,
  // before the light trade. `x= 1 + lit*1.40` — a fully lit player is hit 2.4x
  // as often as one in the dark, which is the whole reciprocal.
  accuracyBase: 0.42,
  accuracyNear: 1.35,          // multiplier at point blank
  accuracyFar: 0.34,           // multiplier at the archetype's max range
  accuracyCeil: 0.94,          // never a guaranteed hit, at any light level
  // A moving player is harder to hit than a standing one. Not in FEEL and it
  // should be: without it, the correct play in a lit room is to stand still.
  accuracyPerSpeed: -0.030,    // per m/s of player speed
  accuracySpeedFloor: 0.55,

  // ---- THE TELEGRAPH LAW --------------------------------------------------
  // `FEEL.enemies.telegraphMin` (0.320 s) is the law. These are the CHANNELS.
  //
  // 2x is the legal floor. 7.5x is derived, not chosen: it is the smallest gain
  // that lifts the DIMMEST archetype's strip (FEEL's 0.12) over the bloom
  // prefilter's 0.85 threshold — 0.12 * 7.5 = 0.90. Any less and the HUSK's tell
  // is the one that does not glow, which is the one archetype the player meets
  // first and sees most. A resting strip tops out at 0.18 and can never bloom at
  // any iris gain, because the prefilter reads the scene BEFORE the gain.
  telegraphGain: 7.5,
  // SAFETY.md rule 4: FLASH-SAFE replaces telegraph brightness PULSES with shape
  // and motion. A monotone ramp on a strip that covers far under 25% of the
  // frame is not a flash by SAFETY's own measurement, so the law's emissive
  // clause survives at its legal minimum instead of being switched off — and the
  // silhouette change is amplified to pay for the difference.
  telegraphGainSafe: 2.0,
  telegraphSilhouetteSafe: 1.45,
  // The wind-up's shape: emissive and silhouette both ease in over the first
  // 70% and hold, so the last 30% of the window is a STEADY loud state rather
  // than a peak the player has to catch.
  telegraphRise: 0.70,
  // A hit landing during a wind-up that removes this fraction of max HP breaks
  // the charge. THE TELEGRAPH IS THE WEAK POINT: the LANTERN's sac sits in
  // impact.js's top-22% weak-point band, so the shot that answers the tell is
  // also the shot that does the most damage.
  chargeBreakFraction: 0.20,
  // ...and it may not be spammed. Without immunity a 720 rpm weapon perma-locks
  // every charger in the room and the encounter evaporates (FEEL.md §6.4's
  // reasoning, applied to the charge instead of to the stagger).
  chargeBreakImmunity: 2.40,

  // ---- ATTACK GEOMETRY ----------------------------------------------------
  strikeHeight: 0.62,          // fraction of height the shot leaves from
  aimHeight: 0.55,             // fraction of the player's height aimed at
  meleeLungeScale: 1.85,       // RUNNER leap speed = speed * this
  meleeLungeTime: 0.34,        // seconds of leap
  meleeRecover: 0.28,          // seconds of recovery after a strike, cannot move
  blastFalloff: 0.45,          // BLOOM damage at the rim of blastRange
  // How many creatures may be inside an attack at once. FEEL.enemies.fireGateMin
  // is the FLOOR; the gate opens with the crowd so a wave of fourteen is not
  // fourteen simultaneous attacks, and never closes below two so a pair is
  // always a real threat.
  attackerPerLive: 0.34,
  // ...and whoever is NOT holding a token holds OFF the ring. This is what
  // "they never stack on your face" means in play: the near ring belongs to
  // whoever is allowed to swing, and everybody else queues behind it.
  queueRing: 2.20,

  // ---- THE FRAME-ONE AUDIO CUE -------------------------------------------
  // Between muzzle flashes the player is often HEARING the fight rather than
  // seeing it, which makes this the primary of the telegraph's three channels.
  // Pitched by the archetype's own `voice` column — the same one EARSHOT's
  // identity stems use — so what a creature sounds like about to hit you and
  // what it sounds like merely near you are the same instrument.
  cueHz: 176, cueGlide: 0.72, cueDur: 0.19, cuePeak: 0.46,

  // ---- MOVEMENT -----------------------------------------------------------
  turnRate: 6.2,               // rad/s once it knows about you, and the reason a
                               // creature that just turned is not yet accurate
  turnRateIdle: 3.4,           // rad/s while UNAWARE — a slow sweep, not a snap
  accel: 26,                   // m/s^2 toward the desired velocity
  separation: 1.15,            // enemy-enemy keep-out = (rA + rB) * this
  separationPush: 2.4,         // m/s of lateral steering, VELOCITY not position
  strafeFlipMin: 1.4,          // seconds before a strafe may reverse
  strafeFlipSpan: 2.2,
  // The keep-out ring is solved as a SWEPT CONSTRAINT on the desired velocity,
  // before integration — never as a positional shove afterwards. A shove is how
  // a creature ends up inside a wall, and it is what `relocations === 0` in the
  // gate is really measuring.
  keepOutSkin: 0.02,
  // What counts as an INTRUSION for the gate's clock. The skin above plus a
  // millimetre of float slop: below this a creature is standing ON the ring,
  // which is where it is supposed to be, not inside it.
  intrusionFloor: 0.03,

  // ---- STAGGER ------------------------------------------------------------
  // FEEL.enemies.staggerTime is 0.08 s. It DAMPS, never zeroes: a creature that
  // stops dead every 83 ms under a REPEATER is a vibrating statue.
  staggerDamp: 0.42,           // speed multiplier at full stagger
  staggerDiminish: 0.55,       // each hit past staggerDiminishAfter keeps this
                               // much of the remaining damp

  // ---- FLINCH (budgeted at FEEL.enemies.flinchBudget = 0.180 s) -----------
  flinchIn: 0.090, flinchHold: 0.040, flinchOut: 0.220,
  flinchLimb: 0.09,            // metres pulled along the bullet direction
  flinchLean: 0.1047,          // 6 degrees, radians

  // ---- DEATH --------------------------------------------------------------
  // Never pop a corpse out of existence. The dying glow HANDS OFF into the
  // permanent scar over exactly the glow decay — the pool is the corpse's light
  // continuing, which is what makes the scar field read as a record rather than
  // as a score.
  deathGlow: 2.60,
  deathFall: 0.42,             // seconds to go down
  corpseHold: 26.0,            // seconds upright-ish before the sink
  corpseSink: 1.20,            // seconds of sinking
  corpseSinkDepth: 0.40,
  corpseCap: 16,

  // ---- HEALTH READOUT -----------------------------------------------------
  // FEEL.enemies.healthDuty: duty 0.15 -> 0.70, 2 Hz -> 1 Hz. DUTY, not
  // frequency: C1-F10 moved wounded state off pulse rate because 4-11 Hz is
  // both a photosensitivity hazard and an alias at the 45 fps floor. Both ends
  // are at or under SAFETY's 3 Hz ceiling, and the edges are softened so the
  // core never presents a hard square edge.
  dutyEdge: 0.12,              // fraction of the cycle spent rising/falling
  coreHeight: 0.58,            // fraction of height
  coreSize: 0.115,

  // ---- FAR TICK -----------------------------------------------------------
  // Beyond FEEL.enemies.farTickDistance the AI ticks on alternating frames.
  // Movement integrates EVERY frame regardless — a creature that moves at half
  // rate at 46 m and full rate at 44 m visibly snaps as you back up.
  farTickPhases: 2,

  // ---- LIGHT --------------------------------------------------------------
  // Consumers read lightNorm, never raw illumination: one HUSK scar saturates
  // every consumer that reads the raw sum (C2-F4).
  litSampleHeight: 0.9,        // metres above the player's feet to sample at
});

const T = ENEMY_TABLE;

// ---------------------------------------------------------------------------
// THE DERIVATION. Reads FEEL.enemies and FEEL.field.deposit; declares nothing.
// A missing stat throws at import — a roster that silently defaults a keep-out
// to zero is a roster that stacks on the player's face and looks like AI.
// ---------------------------------------------------------------------------
const ORDER = ['husk', 'runner', 'lantern', 'warden', 'bloom'];

const SILHOUETTES = Object.freeze({
  'vertical-bar': 0, 'low-canted-bar': 1, 'tall-thin-bar': 2, 'wide-yoke': 3, 'ring': 4,
});

function need(id, src, key) {
  const v = src[key];
  if (typeof v !== 'number' || !Number.isFinite(v)) {
    throw new Error(`enemies/table: FEEL.enemies.${id}.${key} is missing or not finite`);
  }
  return v;
}

function deriveOne(id, index) {
  const f = FEEL.enemies[id];
  if (!f) throw new Error(`enemies/table: FEEL.enemies.${id} does not exist`);
  const dep = FEEL.field.deposit[id];
  if (!dep) throw new Error(`enemies/table: FEEL.field.deposit.${id} does not exist`);
  if (SILHOUETTES[f.silhouette] === undefined) {
    throw new Error(`enemies/table: ${id} declares silhouette "${f.silhouette}", which this module cannot build`);
  }

  const melee = !!f.melee;
  const fuse = f.fuseRange !== undefined;             // the BLOOM: a walking fuse

  // BLOOM carries fuseRange/blastRange instead of range/prefer/fireRate, because
  // it does not shoot — it arrives. The band logic still needs all three, so they
  // are DERIVED from what it does carry rather than invented.
  const range = fuse ? need(id, f, 'fuseRange') : need(id, f, 'range');
  const prefer = fuse ? 0 : need(id, f, 'prefer');
  const fireRate = fuse ? need(id, f, 'telegraph') : need(id, f, 'fireRate');
  const telegraph = need(id, f, 'telegraph');

  // The telegraph law, checked at IMPORT rather than at runtime. An archetype
  // whose authored wind-up is under the law cannot be loaded at all.
  if (telegraph < E.telegraphMin) {
    throw new Error(`enemies/table: ${id} declares telegraph ${telegraph}s, under the law's ${E.telegraphMin}s`);
  }

  // Distance bands. The generic rule is "advance if d > prefer + 3, retreat if
  // d < prefer - 2, else strafe" — but a melee creature has prefer 0, so the
  // generic rule alone parks a RUNNER at 3 m and it can never reach its own
  // 1.6 m range. A melee archetype's band is therefore anchored on its KEEP-OUT
  // and it closes the last gap with a leap, which is also what makes it readable:
  // movement or attack, one at a time, always.
  const advanceAbove = melee ? f.keepOut + 0.30 : prefer + E.bandAdvance;
  const retreatBelow = melee ? -1 : Math.max(f.keepOut, prefer - E.bandRetreat);

  return Object.freeze({
    id, index, melee, fuse,
    hp: need(id, f, 'hp'),
    speed: need(id, f, 'speed'),
    radius: need(id, f, 'radius'),
    height: need(id, f, 'height'),
    dmg: need(id, f, 'dmg'),
    keepOut: need(id, f, 'keepOut'),
    score: need(id, f, 'score'),
    voice: need(id, f, 'voice'),
    armoured: !!f.armoured,
    silhouette: f.silhouette,
    silhouetteIndex: SILHOUETTES[f.silhouette],
    range, prefer, fireRate, telegraph,
    advanceAbove, retreatBelow,
    blastRange: fuse ? need(id, f, 'blastRange') : 0,
    // The deposit is the game's progress, its light and its score, and it comes
    // from FEEL's authoritative table — never from the deleted
    // `r = 3.4 * (0.75 + score/400)` formula, which disagreed with the table for
    // four of six archetypes.
    depositRadius: dep[0],
    depositIntensity: dep[1],
    // Strip emissive, per archetype, spread across FEEL's authored 0.12-0.18
    // window so the five are separable by BRIGHTNESS as well as by shape — a
    // second luminance channel for free, and one that survives greyscale.
    stripEmissive: E.stripEmissive.min
      + (E.stripEmissive.max - E.stripEmissive.min) * (index / (ORDER.length - 1)),
  });
}

/** The five, in roster order. A DERIVATION of FEEL.enemies — not a copy of it. */
export const ARCHETYPES = Object.freeze(ORDER.map(deriveOne));

const BY_ID = new Map(ARCHETYPES.map(a => [a.id, a]));

/** Throws on an unknown id. A roster typo must not silently become a HUSK. */
export function archetypeOf(id) {
  const a = BY_ID.get(id);
  if (!a) throw new Error(`enemies/table: no archetype "${id}" (have: ${ORDER.join(', ')})`);
  return a;
}

export const hasArchetype = id => BY_ID.has(id);
export const ARCHETYPE_IDS = Object.freeze(ORDER.slice());

// ---------------------------------------------------------------------------
// THE LIGHT TRADE (D3). One function per term, so the three cannot drift apart
// and so a test can assert the curve rather than the consequence.
// ---------------------------------------------------------------------------

/**
 * The ONLY normalisation any consumer may use. Raw illumination saturates every
 * downstream term at one HUSK scar; this lands 0.42 at one scar, 0.75 at four
 * and 0.93 at ten, which is a curve with a middle.
 */
export const lightNorm = illumination => 1 - Math.exp(-Math.max(0, illumination) * FEEL.field.normK);

/** Read the trade at the PLAYER's position — you are lit, or you are not. */
export const litAccuracyMul = lit => 1 + clamp01(lit) * E.litAccuracy;
export const litSpotMul = lit => 1 + clamp01(lit) * E.litSpotRange;
export const litReactionMul = lit => 1 - clamp01(lit) * E.litReaction;

/**
 * The full accuracy roll, in one place. Distance shapes it, the light trade
 * scales it, player speed pays for movement, and nothing ever reaches 1.
 */
export function hitChance(arch, distance, lit, playerSpeed) {
  const t = clamp01(distance / Math.max(1e-3, arch.range));
  const shape = T.accuracyNear + (T.accuracyFar - T.accuracyNear) * t;
  const speedTerm = Math.max(T.accuracySpeedFloor, 1 + T.accuracyPerSpeed * Math.max(0, playerSpeed || 0));
  return clamp(T.accuracyBase * shape * litAccuracyMul(lit) * speedTerm, 0, T.accuracyCeil);
}

/** Spot range grows with how lit the PLAYER is, not with how lit the room is. */
export const spotRange = (arch, lit) => arch.range * litSpotMul(lit);

/** Seconds between acquiring a position and the first wind-up. */
export const reactionTime = (lit, jitter01) =>
  Math.max(0, T.reactionBase * litReactionMul(lit) * (1 + (jitter01 * 2 - 1) * T.reactionJitter));

/**
 * Fire cadence with jitter. `fireRate * (0.85 + rand * 0.30)` — a wave of six
 * that fires in unison reads as a script, and the jitter is the cheapest thing
 * in the game that stops it.
 */
export const fireInterval = (arch, rand01) =>
  arch.fireRate * (E.fireJitter.base + rand01 * E.fireJitter.span);

/**
 * HUNTING pressure. A creature that acquires you from across a 70 m gallery must
 * close faster than one already at knife range, or the fight stalls into a
 * staring contest at the exact moment the player wants it to arrive.
 */
export const huntPressure = distance =>
  1 + (E.hunterPressure - 1) * clamp01((distance - E.hunterFrom) / E.hunterSpan);

/** The stagger damp, with diminishing returns after 3 hits in 1 s. */
export function staggerScale(hitsInWindow) {
  const excess = Math.max(0, hitsInWindow - E.staggerDiminishAfter);
  const bite = (1 - T.staggerDamp) * Math.pow(T.staggerDiminish, excess);
  return 1 - bite;
}

/** How many creatures may be inside an attack at once. */
export const attackerGate = live => Math.max(E.fireGateMin, Math.ceil(live * T.attackerPerLive));

/**
 * The health readout: DUTY CYCLE, never frequency. Returns 0..1 for the core's
 * emissive level this instant. Edges are softened by `dutyEdge` so the core
 * never presents a hard square transition — a soft ramp at 2 Hz is a breath, a
 * hard edge at 2 Hz is a strobe.
 */
export function healthDuty(hpFraction, clock) {
  const d = E.healthDuty;
  const wound = clamp01(1 - clamp01(hpFraction));
  const duty = d.min + (d.max - d.min) * wound;
  const hz = Math.min(FEEL.safety.enemyPulseHzMax, d.hzBase + (d.hzWounded - d.hzBase) * wound);
  const phase = clock * hz;
  const p = phase - Math.floor(phase);
  const edge = T.dutyEdge;
  if (p < edge) return smooth01(p / edge);
  if (p < duty - edge) return 1;
  if (p < duty) return smooth01((duty - p) / edge);
  return 0;
}

function smooth01(t) { const c = clamp01(t); return c * c * (3 - 2 * c); }

export default ARCHETYPES;
