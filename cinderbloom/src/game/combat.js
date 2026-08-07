// =============================================================================
// CINDERBLOOM — combat: the moment of contact.
// Owner: combat agent. Implements COMBAT_FEEL §3.3 (damage/range), §4.4
// (tracers), §4.5 (surface-typed impact), §4.6 (hit markers), §4.7 (damage
// numbers), §4.8 (penetration), §4.9 (kill confirmation).
// =============================================================================
//
// ## WHAT LIVES HERE AND WHAT DOES NOT
//
// Combat owns BALLISTICS and FEEDBACK. It does not own the viewmodel (weapons),
// the creature (enemies), the pixels of the marker (hud) or the particles
// (vfx) — it drives all four through their published APIs.
//
// ## PUBLIC API
//
// ### weapons.js — this is your entry point
//
//     ctx.sys.combat.fireShot({
//       ox, oy, oz,          // muzzle in world space
//       dx, dy, dz,          // aim direction (need not be normalised)
//       weapon: 'cinder',    // key into WEAPONS
//       shotIndex: 7,        // round # in this magazine (tracer cadence, §4.4)
//       magLeft: 23,         // rounds remaining AFTER this one (last-3 tracers)
//       cone: 2.1,           // spread HALF-angle in DEGREES, §3.5 — combat
//                            //   samples the uniform disc for you
//       subT: 0.0043,        // seconds already elapsed since the shot, §3.2
//       ads: false,          // narrows the tracer (§4.4) and the flash
//       source: null,        // actor record, or null for the player
//       damageScale: 1,
//     }) -> shot record (also returned so weapons can read the hit)
//
// Set `weapons.ownsTrigger = true` and combat stops driving the trigger itself.
// Until you do, combat runs the KV-7's fire clock off `input.fire` so the game
// has bullets in it — see FALLBACK below.
//
// ### enemies.js
//
//     ctx.bus.on('combat:hit',   ({actor, part, zone, damage, x,y,z, nx,ny,nz, weak, deflect}) => …)
//     ctx.bus.on('combat:kill',  ({actor, ragdoll, x,y,z}) => …)
//     ctx.bus.on('combat:stagger', ({actor}) => …)
//
// Damage is applied here (`actor.hp`) unless the actor exposes
// `actor.user.applyDamage(dmg, info)`, in which case that wins. §6.4's stagger
// window, its 2200 ms immunity and its ×1.25 vulnerability are bookkept here
// because they are damage-model rules; the 620 ms locked animation is yours.
//
// ### hud.js — combat is the model, you are the view
//
//     const s = ctx.sys.combat.hudState();
//     s.marker      // { kind:'normal'|'head'|'weak'|'deflect'|'kill',
//                   //   t, phase, duck, zone, melee, strength, hpFrac, seq }
//                   //   t is seconds since the marker fired; §4.6 curve is
//                   //   expand 60 ms / hold 40 / fade 110, total 210.
//                   //   `hpFrac` is the target's REMAINING health after this
//                   //   hit (-1 when unknown) — it is what lets the marker
//                   //   ESCALATE as a creature nears death. `strength` is
//                   //   dealt/34, i.e. 1.0 = one close-range body round.
//                   //   `melee` marks the heaviest confirm in the game.
//                   //   The record is REUSED; read it, never retain it.
//     s.numbers[]   // { x,y,z, value, weak, t, jitter } world-anchored, §4.7
//     s.hits[]      // rolling log for the killfeed { kind, t, wallbang }
//     s.health, s.maxHealth, s.regenerating, s.lastHitT
//     s.dirs[]      // { angle (rad, 0 = ahead, +right), t, strength } §4.x
//     s.ammo, s.reserve, s.reloading, s.cone (live spread half-angle, degrees)
//
// Also on the bus: `combat:hitmarker`, `combat:damage`, `player:damage`,
// `combat:shot`, `combat:kill`.
//
// ### FALLBACK / staging
//
//     combat.stageBurst({ rounds: 6, ms: 420 })  // deterministic burst NOW
//
// `stageBurst` fires N rounds' worth of state without stepping the sim, so a
// still frame can show a burst in flight. It is what makes the `hipfire` /
// `combat` vistas contain a shooter. It is re-applied after
// `__CB.resetAllTemporal()` so a staged frame survives the temporal wipe.
//
// ### Knobs — `ctx.debug.combat`
//
//     tracerGain, tracerWidth, tracerSpeed, impactGain, damageNumbers,
//     autoFire, hitmarkers, penetration, muzzleFlashFallback,
//     drops, dropMagnetR, dropCollectR, cacheRefill
//     Debug flag: `__CB.toggle('tracers')`
//
// ### AMMO ECONOMY (first-playtest hole: reserve started at 210 and NOTHING
// ### ever refilled it — the game ended silently at shot 241)
//
// The fiction, committed: Thessaly-9's fauna grind spore-crust with gizzard
// nodes of sintered ferrous ash (the same sinter the Benches are made of). The
// KV-7's feed system electro-forms recovered node metal into 6.8 mm projectile
// mass — creatures ARE the ammo supply, which is why fighting sustains itself.
//
//   * Kills drop ember-orange SINTER NODES (pooled InstancedMesh, emissive,
//     bloom-lit — readable at 20 m+). Spawned off the `enemyDeath` bus event so
//     every death path (gunfire, TINDER burn) drops; the `_kill` actor route
//     drops its own. Walk-over pickup: nodes magnetize inside `dropMagnetR`
//     (2.5 m) and credit on contact — sound + HUD pulse land the same frame.
//   * RESUPPLY CACHES: beacon-marked crates at the basin pocket, the channel,
//     Wick Forest and the grotto. Approach within 3 m refills reserve to 210.
//     Re-arms when you leave. Placeholder mesh; proper prop requested.
//   * Reserve is credited to WHOEVER owns the trigger: weapons.js's public
//     `reserve` field when it is live (hudState forwards it), the fallback
//     gun's otherwise. Both stay capped at RESERVE_MAX = 210.
//   * hudState() grew: reserveMax, lowAmmo (<= 2 mags), reserveEmpty,
//     pickupT/pickupRounds (confirm pulse), cacheT. Bus: `combat:ammoPickup`,
//     `combat:cacheRefill`.
//
// ## MELEE (round 11) — COMBAT_FEEL §3.2, finally built
//
//     ctx.sys.combat.meleeStrike()          // start a swing; true if it started
//     ctx.bus.emit('weapon:melee', {})      // same thing, from weapons.js
//     ctx.bus.emit('weapon:melee', {phase:'hit'})   // weapons owns the clock,
//     ctx.bus.emit('weapon:meleeHit', {})           // combat only traces
//     ctx.bus.on('combat:melee', ({phase, x,y,z, damage, actor, kill, zone}) => …)
//       phase: 'swing' | 'hit' | 'kill' | 'world'
//
// 260 ms wind-up / 140 ms active / 380 ms recover / 130 damage, verbatim from
// §3.2. The active window traces EVERY frame until it connects, so a creature
// that closes into the swing is hit. A fallback binding on V runs the clock
// while input.js has no melee key; the first melee event from weapons.js
// retires it permanently. Knobs: `melee`, `meleeFallback`, `meleeAssist`.
// =============================================================================

import * as THREE from 'three';
import { clamp, DEG, ease } from '../util/math.js';
import { PH } from './physics.js';
import { CB_LAYER } from '../engine/renderer.js';
import { SITES } from '../world/terrain.js';

// -----------------------------------------------------------------------------
// TABLES — COMBAT_FEEL §3.2, §3.3, §3.4, §3.5
// -----------------------------------------------------------------------------

/** Range bands. `to` is the upper edge; a 2.0 m linear blend straddles it. */
const CINDER_BANDS = [
  { to: 26, dmg: 34 }, { to: 44, dmg: 28 }, { to: 70, dmg: 24 }, { to: Infinity, dmg: 20 },
];
const KILN_BANDS = [
  { to: 26, dmg: 78 }, { to: 44, dmg: 62 }, { to: Infinity, dmg: 54 },
];

export const WEAPONS = {
  cinder: {
    name: 'KV-7 CINDER', rpm: 725, mag: 30, bands: CINDER_BANDS,
    headMul: 1.60, tracerEvery: 3, tracerLast: 3,
    reloadTac: 2.100, reloadEmpty: 2.850,
    coneHip: 2.100, coneHipMove: 2.900, coneAds: 0.050, coneAdsMove: 0.085,
    bloomHip: 0.160, bloomHipCap: 1.300, bloomAds: 0.012, bloomAdsCap: 0.090,
  },
  kiln: {
    name: 'VS-12 KILN', rpm: 260, mag: 12, bands: KILN_BANDS,
    headMul: 2.00, tracerEvery: 1, tracerLast: 12,
    reloadTac: 2.600, reloadEmpty: 3.200,
    coneHip: 3.400, coneHipMove: 4.200, coneAds: 0.020, coneAdsMove: 0.060,
    bloomHip: 0.240, bloomHipCap: 1.600, bloomAds: 0.008, bloomAdsCap: 0.050,
  },
};

/** §3.3 hit-zone multipliers. The 0.55 and 2.40 are the whole aiming game. */
const ZONE_MUL = { head: 1.60, torso: 1.00, limb: 0.85, plate: 0.55, vent: 2.40 };

/**
 * §3.4 authored aim kick, degrees. Shots 1..16 verbatim; 17+ is the sustained
 * zone (pitch 0.12, yaw from the repeating 8-entry loop).
 */
const KICK = [
  [0.62, 0.00], [0.44, 0.06], [0.42, 0.11], [0.40, 0.17], [0.38, 0.22], [0.34, 0.26],
  [0.30, 0.24], [0.26, 0.14], [0.22, -0.02], [0.20, -0.18], [0.18, -0.28], [0.16, -0.31],
  [0.15, -0.28], [0.14, -0.20], [0.13, -0.09], [0.12, 0.04],
];
const KICK_LOOP = [0.10, 0.18, 0.12, -0.04, -0.16, -0.22, -0.12, 0.02];

/**
 * §4.5 impact table, expressed as the `power` we hand vfx (which owns the
 * colours — gameplay code must never pick one) plus the exit-hit variant.
 * `spl` writes a ripple into the water sim.
 */
const IMPACT = {
  ash: { power: 1.00, exit: 0.55 },
  rock: { power: 0.62, exit: 0.38 },
  sinter: { power: 0.55, exit: 0.34 },
  glass: { power: 0.60, exit: 0.36 },
  flora: { power: 0.85, exit: 0.50 },
  coal: { power: 0.80, exit: 0.48 },
  metal: { power: 0.45, exit: 0.30 },
  flesh: { power: 1.90, exit: 1.10 },
  // §4.5 "chitin / carapace": bright spall on the WORLD, never on the mesh.
  // Only reachable via a non-creature route (a chitin prop, or audio querying
  // `surfaceAt`) — a live creature's burst is fired by enemies.js itself.
  chitin: { power: 0.70, exit: 0.42, vfx: 'metal' },
  // vfx has no `water` surface yet (request filed). 'glass' is the closest
  // cool grey and reads as droplets; the ring comes from water.splash().
  water: { power: 0.55, exit: 0.30, vfx: 'glass', splash: true, decal: false },
};

const TRACER_MAX = 24;
const NUMBER_MAX = 12;
const HIT_LOG = 12;

// -----------------------------------------------------------------------------
// AMMO ECONOMY TABLES. Numbers chosen against §3.3's TTK (reasoning in
// HANDOFF): a skitter costs ~2-4 rounds and refunds 8; a bloomspitter ~5-8 and
// refunds 12; a carapace (plates eat 45% of sloppy fire) costs 15-30 and
// refunds two 15-round nodes. Accurate play banks ammo slowly; spraying drains
// slowly; the reserve number keeps meaning without ever being a wall mid-fight.
// -----------------------------------------------------------------------------
const RESERVE_MAX = 210;                       // = the §3 loadout, 7 mags
const DROP_MAX = 24;                           // pooled; oldest recycled
const DROP_LIFE = 45;                          // s on the ground, then fade
// TUNED AGAINST tests/playthrough.mjs, 2026-08-03. The first full-mission run
// measured 941 shots for 39 kills — 24.1 ROUNDS PER KILL — against a skitter
// drop of 8. Every common kill was a net loss of 16 rounds, so the bot ran
// completely dry (7.3 s at low-ammo) and the run FAILED its ammo assertion.
// That is arithmetic, not variance, and the player asked for resupply to be
// "easy enough". These numbers put a skitter kill near break-even and leave the
// caches as the surplus rather than the lifeline. Re-run playthrough.mjs after
// touching them; "ran dry: false" is the acceptance condition.
const DROPS_FOR = {
  skitter: [14], bloomspitter: [20], carapace: [20, 20],
};
const DROP_DEFAULT = [16];

/**
 * THE REWARD HAS TO LAND ON THE KILL. Player note, 2026-08-01: *"it needs to
 * feel satisfying to kill them somehow."* Round 10 built the economy but the
 * node fell where the creature stood and collecting it was a separate errand —
 * a chore appended to a kill rather than the kill's payoff.
 *
 * So a node born from a kill is thrown out of the WOUND along the killing
 * round, flies free for `DROP_TOSS`, and then homes on the player from up to
 * `dropSeekR` for `DROP_SEEK` seconds. You shoot the thing, its ammunition
 * comes to you, and the loop closes inside a second without a button. After the
 * seek window it settles into an ordinary node with the ordinary 2.5 m magnet,
 * so a node you walked away from is still there later and nothing is lost.
 */
const DROP_TOSS = 0.28;                        // s of free flight before seeking
const DROP_SEEK = 2.60;                        // s of guaranteed long-range seek

/**
 * MELEE — COMBAT_FEEL §3.2 carries exactly one line for it and has since round
 * one: *"Melee | 260 ms wind-up, 140 ms active, 380 ms recover, 130 damage"*.
 * Nothing implemented it. Player, 2026-08-01: *"we likely need a melee button."*
 *
 * The four numbers are verbatim. The three that are not in the spec:
 *   `range`       2.40 m — the capsule is 0.36 m and a Skitter closes to ~1.2 m
 *                 to strike, so this reaches a creature that is already on you
 *                 and nothing that is not.
 *   `assistDeg`   the swing is an ARC, not a laser. Four assist rays at 11°
 *                 (up/down/left/right) let a swing that is off by a body width
 *                 connect. This is target assist, not aim assist: it never
 *                 moves the camera, it only widens what the arc sweeps.
 *   `assistRange` assist rays reach further than the centre ray, because the
 *                 arc's outside travels further than its middle.
 *
 * At 130 damage this one-shots a Skitter (60 hp) and a Bloomspitter, and it is
 * therefore a KILL-FEEL feature as much as a parity feature: it is the heaviest
 * confirm in the game and hud.js treats it that way.
 */
const MELEE = {
  windup: 0.260, active: 0.140, recover: 0.380,
  damage: 130,
  range: 2.40, assistRange: 3.10, assistDeg: 11.0,
  cooldown: 0.060,                             // after recover, before the next
};

/**
 * §4.6 marker precedence. A kill must never be overwritten by the next round's
 * plain hit inside its own 60 ms expand, or the payoff is deleted by the
 * follow-through shot. `head` is an ADDITION to the spec's four kinds (see
 * `_marker`): the spec distinguishes a weak point but not a head, and the brief
 * for this round asks for both.
 */
const MARK_RANK = { normal: 0, deflect: 1, head: 2, weak: 3, kill: 4 };

/** The four assist rays, in camera-local (x, y). Right, left, up, down. */
const MELEE_FAN = [[1, 0], [-1, 0], [0, 1], [0, -1]];

// -----------------------------------------------------------------------------
// TRACER SHADERS — one instanced draw, §4.4
// -----------------------------------------------------------------------------

const TRACER_VERT = /* glsl */`
precision highp float;

in vec3 position;          // x = 0..1 along the ribbon, y = -0.5..0.5 across
in vec3 aOrigin;
in vec3 aDir;              // unit
in vec4 aParam;            // x spawnTime, y maxDist, z widthMul, w bornOffset

uniform mat4 projectionMatrix;
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform float uTime;
uniform float uSpeed;      // visual m/s, 340 by spec
uniform float uLen;        // ribbon length, m
uniform float uWidth;      // head half-width, m
uniform float uGain;
uniform float uPxScale;    // world metres per pixel per metre of view depth
uniform float uMinPx;      // screen-space half-width floor, pixels

out float vAcross;
out float vAlong;
out float vAlpha;
out float vHeadMix;
out float vThin;           // 1 = the quad was widened past its physical size

void main(){
  float age = max(0.0, uTime - aParam.x + aParam.w);
  float travel = age * uSpeed;
  float head = min(travel, aParam.y);
  // Hidden for the first 1.2 m so it never draws over the viewmodel.
  float tail = max(head - uLen, 1.2);

  // fade once the round has landed
  float over = max(0.0, travel - aParam.y) / uSpeed;
  float alive = 1.0 - smoothstep(0.0, 0.055, over);
  // first 120 ms are 1.6x wide so the streak visually joins the muzzle flash
  float young = 1.6 - 0.6 * smoothstep(0.0, 0.12, age);

  float s = mix(tail, head, position.x);
  vec3 p = aOrigin + aDir * s;

  vec3 toCam = cameraPosition - p;
  vec3 sideRaw = cross(aDir, toCam);
  float sl = length(sideRaw);
  // A dead pool slot has aDir = 0, so the cross product is 0 and a bare
  // normalize() emits NaN. NaN vertices are not reliably culled on ANGLE and
  // the rasteriser can hand the fragment stage an unbounded triangle.
  vec3 side = sl > 1e-5 ? sideRaw / sl : vec3(1.0, 0.0, 0.0);
  // 0.022 m at the head tapering to 0.006 at the tail
  float w = uWidth * mix(0.27, 1.0, position.x) * aParam.z * young;

  // MINIMUM SCREEN-SPACE WIDTH, and this is the whole reason tracers were
  // invisible rather than merely faint. §4.4's 0.022 m is the physically honest
  // width of a tracer element, but at a 65 deg vertical FOV over 1080 px one
  // pixel subtends about 0.00105 rad, so 0.022 m at 30 m is 0.70 px ACROSS —
  // sub-pixel. A sub-pixel additive line lands on a fraction of one sample,
  // then TAA's neighbourhood clamp treats it as a temporal outlier and removes
  // what little of it survived. Measured before this: staging a 6-round burst
  // moved meanLuma by 0.0003 (0.05%) and the streaks were not findable in a
  // 1080p frame by eye.
  //
  // The fix is what every engine does for thin geometry: widen the quad to a
  // floor in PIXELS and compensate in the fragment shader so total energy is
  // preserved. "uPxScale" is 2*tan(fovY/2)/heightPx, i.e. world metres per
  // pixel per metre of depth, so "uMinPx * uPxScale * dist" is the world
  // half-width of a uMinPx-pixel line at that depth. Near the muzzle the
  // physical width still wins, which is correct — a tracer at 2 m IS fat.
  // NB: identifiers in GLSL comments go in double quotes, never backticks —
  // a backtick closes this JS template literal and the module stops parsing.
  float dist = length(toCam);
  float minW = uMinPx * uPxScale * dist;
  float wOut = max(w, minW);
  // how much we cheated, for the fragment shader's energy compensation
  vThin = w / max(1e-6, wOut);
  p += side * (position.y * 2.0 * wOut);

  vAcross = position.y * 2.0;
  vAlong = position.x;
  float live = step(0.02, head - tail) * step(1e-5, sl) * step(0.5, aParam.y);
  vAlpha = alive * uGain * live;
  vHeadMix = smoothstep(uLen - 0.25, uLen, (head - tail) * position.x);

  // A dead slot collapses to a point rather than shipping a degenerate quad.
  gl_Position = live > 0.0 ? projectionMatrix * viewMatrix * vec4(p, 1.0) : vec4(2.0, 2.0, 2.0, 1.0);
}
`;

const TRACER_FRAG = /* glsl */`
precision highp float;

in float vAcross;
in float vAlong;
in float vAlpha;
in float vHeadMix;
in float vThin;

layout(location = 0) out vec4 outColor;

void main(){
  float r = 1.0 - abs(vAcross);
  if (r <= 0.0) discard;
  float core = pow(r, 2.2);
  // energy falls off toward the tail
  float along = pow(vAlong, 1.6);
  // Energy compensation for the screen-space width floor (see the vertex
  // shader). Full compensation would be "a *= vThin", which conserves total
  // energy exactly and lands us back at an invisible tracer — the whole point
  // of the floor was that the physical line is too dim to survive TAA. Zero
  // compensation turns a 200 m tracer into a laser. sqrt() splits it: a streak
  // widened 3x keeps 58% of its peak, so it carries ~1.7x the physical energy
  // and reads as a line at every range without clipping the HDR target.
  float a = core * along * vAlpha * sqrt(clamp(vThin, 0.02, 1.0));
  if (a <= 0.002) discard;
  vec3 body = vec3(1.00, 0.62, 0.28);
  vec3 col = mix(body, vec3(1.0, 0.94, 0.86), vHeadMix * 0.9);
  // additive: premultiply by alpha and let One/One do the rest
  outColor = vec4(col * a * 3.4, a);
}
`;

export class Combat {
  static id = 'combat';
  static deps = ['weapons', 'enemies'];

  constructor(ctx) {
    this.ctx = ctx;

    // --- shot bookkeeping
    this.shotsFired = 0;
    this.magLeft = WEAPONS.cinder.mag;
    this.reserve = 210;
    this.reloading = 0;
    this.fireClock = 0;
    this.sinceShot = 99;
    this.kickPitch = 0; this.kickYaw = 0;   // §3.4 aim-kick accumulator, degrees
    this._restP = null; this._restY = null; // recovery target, snapshotted once
    this.burstShots = 0;
    this.bloom = 0;

    // --- player
    this.health = 100; this.maxHealth = 100;
    this.lastHitT = -99; this.regenerating = false;

    // --- feedback state (the HUD reads this, it does not compute it)
    //
    // THE CONFIRMATION CHAIN. Everything hud.js needs to make a hit legible
    // inside 60 ms and a KILL unmistakably different from a hit rides on this
    // one record. `kind` alone is not enough and that is why round 10's kills
    // did not land: a kill that differs from a hit only in COLOUR is invisible
    // to this player (ACCESSIBILITY: moderate deuteranomaly, red vs white does
    // not separate). So the marker carries, redundantly:
    //   zone      'head' | 'vent' | 'plate' | 'body' | 'limb' — WHAT you hit
    //   melee     the heaviest confirm in the game gets its own geometry
    //   strength  dealt / 34 (one close-range body round) — hit-strength cue
    //   hpFrac    the target's REMAINING health after this hit, or -1 if the
    //             target does not publish one. This is the escalation: the
    //             marker visibly grows as a creature approaches death, so the
    //             last round of a kill is telegraphed one frame before it lands.
    //   seq       increments per marker so a view can detect a re-fire even
    //             when kind and age look identical.
    this.marker = {
      kind: null, t: 0, phase: 0, duck: false,
      zone: null, melee: false, strength: 1, hpFrac: -1, seq: 0,
    };
    this._markerTimes = [];
    // last kill, for hud escalation + the killfeed's cause-of-death glyph
    this.killT = 99; this.killKind = null; this.killZone = null; this.killMelee = false;
    this.kills = 0;
    this.numbers = [];
    this.hits = [];
    this.dirs = [];

    // --- pools. §4 budget is 0.30 ms/frame at sustained fire and §9.8 caps a
    // 5 s burst at 64 KB, so nothing in the hot path may be an object literal.
    this._pending = [];        // delayed impacts (>60 m) + the §4.9 kill chain
    for (let i = 0; i < 64; i++) {
      this._pending.push({ live: false, t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0, surface: 'ash', power: 1, decal: true });
    }
    this._pendLive = 0;
    this._fireOpts = {
      ox: 0, oy: 0, oz: 0, dx: 0, dy: 0, dz: 0, weapon: 'cinder',
      shotIndex: 0, magLeft: 30, cone: 0, subT: 0, ads: false, t: 0, visualOnly: false,
    };
    this._info = {
      actor: null, part: null, zone: null, damage: 0, weak: false, deflect: false,
      wallbang: false, x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, dx: 0, dy: 0, dz: 0, dist: 0,
    };
    this._killInfo = {
      actor: null, ragdoll: null, x: 0, y: 0, z: 0, damage: 0, wallbang: false,
      zone: null, headshot: false, weak: false, melee: false, kind: null,
    };
    this._impactInfo = { x: 0, y: 0, z: 0, nx: 0, ny: 0, nz: 0, surface: 'ash', power: 1 };
    this._markerInfo = {
      kind: null, duck: false, zone: null, melee: false, strength: 1, hpFrac: -1,
    };
    this._mo = { zone: null, melee: false, strength: 1, hpFrac: -1 };
    this._dmgInfo = { kind: null, wallbang: false };
    this._ragImp = { ix: 0, iy: 0, iz: 0, hx: 0, hy: 0, hz: 0 };
    this._tracerN = 0;

    // --- scratch
    this._hit = {
      t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
      kind: null, surface: 'ash', penCm: 4, tag: null, actor: null, part: null, zone: null,
    };
    this._shot = {
      hit: false, x: 0, y: 0, z: 0, dist: 0, surface: 'ash',
      damage: 0, zone: null, actor: null, kill: false, wallbang: false,
    };
    this._v = new THREE.Vector3();
    this._v2 = new THREE.Vector3();
    this._fwd = new THREE.Vector3();
    this._right = new THREE.Vector3();
    this._up = new THREE.Vector3();
    // dedicated, so `_applySpread` can never tread on a caller's vector
    this._sp1 = new THREE.Vector3();
    this._sp2 = new THREE.Vector3();
    // dedicated, because enemies.js's damage() forwards these straight into
    // vfx.impact() and its own shader hit-flash uniforms
    this._cpt = new THREE.Vector3();
    this._cdir = new THREE.Vector3();
    this._crInfo = { part: 'body', mult: 1, weak: false, armour: false };
    this._forceTracer = undefined;
    this._busTrigger = false;      // latched by the first `weapon:fire`
    this._mirrorCone = null;       // weapons.js's live spread, when it owns the trigger
    this._staged = null;

    // --- ammo economy: pooled drops + caches. Everything preallocated — a
    // pickup is rare but the per-frame drop update is not.
    this._drops = [];
    for (let i = 0; i < DROP_MAX; i++) {
      this._drops.push({
        live: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0,
        age: 0, rounds: 0, seed: 0, rest: false, magnet: false,
        seek: 0,          // s of long-range homing left; > 0 only on kill drops
      });
    }
    this._dropsLive = 0;
    this._dropN = 0;               // ring cursor for recycling the oldest
    this.pickupT = 99;             // s since the last pickup (HUD pulse reads it)
    this.pickupRounds = 0;
    this.cacheT = 99;              // s since the last cache refill
    this.caches = [];
    this._cachesPlaced = false;
    this._pickupInfo = { rounds: 0, reserve: 0, x: 0, y: 0, z: 0 };
    this._cacheInfo = { reserve: RESERVE_MAX, x: 0, y: 0, z: 0 };
    this._ammoInfo = { ammo: 0, reserve: 0 };
    // The wound the killing round made, latched immediately BEFORE the damage
    // call so it is already there when enemies.js's die() emits `enemyDeath`
    // synchronously inside it. That ordering is the whole reason drops can be
    // thrown out of the hit point instead of dribbling out of the body centre.
    this._killCtx = { t: -99, x: 0, y: 0, z: 0, dx: 0, dy: 0, dz: 0, melee: false };

    // --- melee (COMBAT_FEEL §3.2). One state machine, three windows.
    this.melee = {
      phase: 'idle',    // 'idle' | 'windup' | 'active' | 'recover'
      t: 0,             // s in the current phase
      swings: 0,
      hit: false,       // has this swing already connected?
      cool: 0,          // s of cooldown left
      lastHitT: -99,
      lastKillT: -99,
    };
    this._busMelee = false;         // latched by the first weapons.js melee event
    this._prevMeleeKey = false;     // edge detect for the fallback key
    this._meleeInfo = {
      phase: 'swing', x: 0, y: 0, z: 0, damage: 0, actor: null,
      kill: false, zone: null, surface: null,
    };
    // dedicated hit record — `this._hit` belongs to the hitscan path and a
    // melee trace can run on the same frame as a shot
    this._melHit = {
      t: 0, x: 0, y: 0, z: 0, nx: 0, ny: 1, nz: 0,
      kind: null, surface: 'ash', penCm: 4, tag: null, actor: null, part: null, zone: null,
      creature: null, mult: 1, weak: false, armour: false,
    };
    this._melDir = new THREE.Vector3();
    this._melRay = new THREE.Vector3();
    // matrix-compose scratch for the drop InstancedMesh
    this._dM = new THREE.Matrix4();
    this._dQ = new THREE.Quaternion();
    this._dP = new THREE.Vector3();
    this._dS = new THREE.Vector3();
    this._dUp = new THREE.Vector3(0, 1, 0);
  }

  async init() {
    const { ctx } = this;
    this.physics = ctx.sys.physics || null;
    this.vfx = ctx.sys.vfx || null;
    this.player = ctx.sys.player || null;
    this.input = ctx.sys.input || null;
    this.audio = ctx.sys.audio || null;

    this.rngSpread = ctx.rng.fork('spread');
    this.rngRecoil = ctx.rng.fork('recoil');
    this.rngNum = ctx.rng.fork('dmgnum');
    this.rngDrops = ctx.rng.fork('drops');

    this.knobs = ctx.debug.combat = {
      tracerGain: 1.0,
      tracerWidth: 0.022,     // §4.4 head half-width
      // Screen-space half-width floor, PIXELS. §4.4's 0.022 m is 0.70 px across
      // at 30 m and TAA deletes it; this is what makes a tracer exist. Set to 0
      // to see the spec-pure (invisible) version. Above ~1.8 a near tracer
      // starts to read as a beam rather than a round.
      tracerMinPx: 1.15,
      tracerSpeed: 340,       // §4.4 VISUAL speed; damage is hitscan
      tracerLen: 2.60,
      impactGain: 1.0,
      damageNumbers: false,   // §4.7 — off by default, they are a mobile tell
      autoFire: true,         // fallback trigger while weapons.js is a stub
      muzzleFlashFallback: true,
      hitmarkers: true,
      penetration: true,
      regenDelay: 4.2,        // s after the last hit before regen starts
      regenRate: 33,          // hp/s
      // §3.4 recovery, verbatim. THESE THREE NUMBERS CANNOT SATISFY §9.4 AND
      // THAT IS A CONTRADICTION IN THE SPEC, not a bug here — recorded so the
      // next agent does not "fix" it twice:
      //   §3.4 authors hold 90 ms, fraction 0.72, half-life 130 ms, and calls
      //        the 28% residual (1.002 deg after a 10-shot burst) the asymptote.
      //   §9.4 asserts pitch is 1.00 +/- 0.08 *at 500 ms*.
      // 500 ms minus the 90 ms hold is 3.15 half-lives, which leaves 11% of the
      // 2.58 deg gap = 0.29 deg of excess, so the true value is 1.28 and it does
      // not enter §9.4's window until ~760 ms. §3.4 wins because it states a
      // mechanism with a reason attached, and because the FEEL is the asymptote.
      // recoilHalfLife = 0.108 is the value that makes §9.4 pass, if a future
      // owner decides the acceptance test is the authority instead.
      recoilHoldMs: 90,
      recoverFraction: 0.72,
      recoilHalfLife: 0.130,
      // --- ammo economy
      drops: true,            // kills drop sinter nodes
      dropMagnetR: 2.5,       // m — nodes home on the player inside this
      dropCollectR: 0.85,     // m — contact radius against the capsule centre
      cacheRefill: true,      // resupply caches are live
      dropSeek: true,         // a KILL's nodes fly to you (the payoff, not an errand)
      dropSeekR: 14.0,        // m — how far a kill drop will travel to reach you
      // --- melee
      melee: true,
      // The fallback trigger, exactly like `autoFire`: while weapons.js has no
      // melee and input.js has no V binding, combat runs the §3.2 clock itself
      // off the raw key so the button EXISTS this round. It stands down for good
      // the first time weapons.js emits a melee event (`_busMelee` latch).
      meleeFallback: true,
      meleeAssist: true,      // the four off-axis assist rays
    };

    this._buildTracers();
    this._buildDrops();
    this._buildCaches();

    // Every creature death path funnels through enemies.js's die() and this one
    // event — gunfire, TINDER burn fronts, scripted kills. Hooking the bus here
    // (rather than combat's own kill bookkeeping) means a creature the FIRE
    // killed still feeds the gun, which is the economy's whole fiction.
    ctx.bus.on('enemyDeath', (e) => {
      if (!e || !e.pos) return;
      this._spawnDropsFor(e.kind, e.pos.x, e.pos.y + 0.55, e.pos.z);
    });

    // -------------------------------------------------------------------------
    // THE weapons.js TRIGGER. This is the wire that was missing, and its absence
    // meant the game had TWO GUNS.
    //
    // weapons.js runs the whole trigger itself — the §3.4 authored pattern, the
    // aim kick straight into `player.pitch/yaw`, view kick, weapon kick, the
    // §3.5 uniform-disc spread, the §4.1 muzzle flash, §4.2 brass — and then
    // emits `weapon:fire` with the post-spread direction, carrying a comment
    // that says "combat.js consumes this; tracers are its job". Nothing
    // consumed it. So the visible gun did no damage and drew no tracer, while
    // combat's own FALLBACK trigger ran in parallel on its own clock with its
    // own recoil accumulator and its own muzzle flash. Result: two flashes per
    // shot, two recoil budgets fighting over one camera, and rounds that had no
    // relationship to the animation playing on screen.
    //
    // Three things follow from weapons.js owning the trigger, and getting any
    // of them wrong is worse than not wiring it at all:
    //   * `cone: 0`. `e.dir` is ALREADY spread. Applying our cone on top
    //     squares the spread and the gun stops hitting what it is pointed at.
    //   * no muzzle flash. weapons.js already fired one at the real barrel.
    //   * no recoil. weapons.js already moved the camera; adding ours doubles
    //     the pattern and §3.4's "the player's input consumes the kick budget"
    //     turns into the gun dragging itself at the floor (trap 3).
    // We MIRROR its accumulator instead, so `hudState()` still reports a real
    // kick and a real cone to the HUD without being a second source of truth.
    // -------------------------------------------------------------------------
    ctx.bus.on('weapon:fire', (e) => this._onWeaponFire(e));

    // -------------------------------------------------------------------------
    // THE MELEE WIRE. weapons.js owns the clock and collision acquisition;
    // combat owns the one authoritative damage transaction. The old bridge
    // started a second combat clock when it saw weapons' `phase:'swing'`. Since
    // combat updates later in the same simulation tick, that duplicate clock
    // reached contact one frame first, killed the target, and made the visible
    // weapon report a miss. One button therefore produced a kill and a whiff.
    //
    // A weapon swing now increments combat's public bookkeeping without
    // starting another timeline. A hit consumes the actor/point weapons already
    // resolved and marks the synchronous event handled. Legacy unphased
    // `weapon:melee` and neutral `melee` events still drive combat's fallback.
    // -------------------------------------------------------------------------
    ctx.bus.on('weapon:melee', (e) => {
      this._busMelee = true;
      const ph = e && (e.phase || e.state);
      if (ph === 'swing') {
        const m = this.melee;
        m.swings++; m.phase = 'idle'; m.t = 0; m.hit = false;
        const mi = this._meleeInfo;
        mi.phase = 'swing'; mi.damage = 0; mi.actor = null; mi.kill = false;
        mi.zone = null; mi.surface = null;
        mi.x = e?.origin?.x ?? this.ctx.camera.position.x;
        mi.y = e?.origin?.y ?? this.ctx.camera.position.y;
        mi.z = e?.origin?.z ?? this.ctx.camera.position.z;
        this.ctx.bus.emit('combat:melee', mi);
      } else if (ph === 'hit' || ph === 'connect' || ph === 'active' || ph === 'strike') {
        if (!this._consumeWeaponMelee(e)) this._meleeTrace();
      } else if (!ph) {
        this.meleeStrike(e);
      }
      // `miss` is terminal telemetry, not a request for another swing.
    });
    ctx.bus.on('weapon:meleeHit', (e) => {
      this._busMelee = true;
      if (!this._consumeWeaponMelee(e)) this._meleeTrace();
    });
    ctx.bus.on('melee', (e) => { this._busMelee = true; this.meleeStrike(e); });
  }

  /** weapons.js pulled the trigger. Ballistics and feedback only. */
  _onWeaponFire(e) {
    if (!e) return;
    // Latch: from the first real shot, the fallback trigger stands down for
    // good. Latching (rather than testing a flag weapons.js never sets) is what
    // makes this degrade correctly — while weapons.js is a stub no event ever
    // arrives and the fallback keeps bullets in the frame.
    this._busTrigger = true;
    const W = WEAPONS[this._weaponKey(e)] || WEAPONS.cinder;
    const w = this.ctx.sys.weapons;
    const F = this._fireOpts;
    const o = e.muzzle || e.origin;
    if (!o) return;
    F.ox = o.x; F.oy = o.y; F.oz = o.z;
    F.dx = e.dir.x; F.dy = e.dir.y; F.dz = e.dir.z;
    F.weapon = this._weaponKey(e);
    F.shotIndex = this.shotsFired;
    F.magLeft = e.ammo !== undefined ? e.ammo : this.magLeft;
    F.cone = 0;                                  // e.dir is post-spread already
    F.subT = e.subT || 0;
    F.ads = !!(w && w.adsT > 0.55);
    F.t = this.ctx.time.elapsed - (e.subT || 0);
    F.tracer = e.tracer;                         // weapons.js owns the cadence
    // `_fireOpts` is deliberately reused to keep the hot path allocation-free.
    // stageBurst() marks that record visual-only, so every live weapon event
    // must explicitly clear the flag or the next real magazine becomes a
    // spectacularly convincing stream of harmless tracer cosplay.
    F.visualOnly = false;
    const shot = this.fireShot(F);
    this.shotsFired++;
    this.sinceShot = 0;
    // Mirror, do not accumulate: weapons.js is the source of truth.
    if (w && w.kick) { this.kickPitch = w.kick.pitch; this.kickYaw = w.kick.yaw; }
    if (w && typeof w.spreadDeg === 'number') this._mirrorCone = w.spreadDeg;
    if (W.mag && e.ammo !== undefined) this.magLeft = e.ammo;
    return shot;
  }

  _weaponKey(e) {
    const n = (e && e.weapon ? String(e.weapon) : '').toLowerCase();
    return n.indexOf('kiln') >= 0 ? 'kiln' : 'cinder';
  }

  // ===========================================================================
  // TRACERS
  // ===========================================================================

  _buildTracers() {
    const g = new THREE.InstancedBufferGeometry();
    // a 4-segment ribbon: enough that a long tracer curves with the camera
    const SEG = 4;
    const pos = new Float32Array((SEG + 1) * 2 * 3);
    const idx = [];
    for (let i = 0; i <= SEG; i++) {
      const u = i / SEG;
      pos[(i * 2) * 3] = u; pos[(i * 2) * 3 + 1] = -0.5; pos[(i * 2) * 3 + 2] = 0;
      pos[(i * 2 + 1) * 3] = u; pos[(i * 2 + 1) * 3 + 1] = 0.5; pos[(i * 2 + 1) * 3 + 2] = 0;
      if (i < SEG) {
        const a = i * 2;
        idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setIndex(new THREE.BufferAttribute(new Uint16Array(idx), 1));

    this._trOrigin = new Float32Array(TRACER_MAX * 3);
    this._trDir = new Float32Array(TRACER_MAX * 3);
    this._trParam = new Float32Array(TRACER_MAX * 4);
    const aO = new THREE.InstancedBufferAttribute(this._trOrigin, 3);
    const aD = new THREE.InstancedBufferAttribute(this._trDir, 3);
    const aP = new THREE.InstancedBufferAttribute(this._trParam, 4);
    aO.setUsage(THREE.DynamicDrawUsage); aD.setUsage(THREE.DynamicDrawUsage); aP.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('aOrigin', aO);
    g.setAttribute('aDir', aD);
    g.setAttribute('aParam', aP);
    g.instanceCount = 0;
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e7);
    this._trAttr = { aO, aD, aP };

    this._trU = {
      uTime: { value: 0 },
      uSpeed: { value: 340 },
      uLen: { value: 2.60 },
      uWidth: { value: 0.022 },
      uGain: { value: 1 },
      uPxScale: { value: 0.001 },
      uMinPx: { value: 1.15 },
    };
    const m = new THREE.RawShaderMaterial({
      glslVersion: THREE.GLSL3,
      vertexShader: TRACER_VERT,
      fragmentShader: TRACER_FRAG,
      uniforms: this._trU,
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneFactor,
      blendEquation: THREE.AddEquation,
      side: THREE.DoubleSide,
    });
    // NOT userData.cbWritesGBuffer — the renderer's scan masks this draw's
    // aux attachments for us, exactly as it does for vfx's particles.
    this.tracerMat = m;
    this.tracerMesh = new THREE.Mesh(g, m);
    this.tracerMesh.name = 'combat.tracers';
    this.tracerMesh.frustumCulled = false;
    this.tracerMesh.renderOrder = 30;
    this.tracerMesh.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.tracerMesh);
  }

  /** Ring-allocated: the oldest tracer is recycled when the pool is full. */
  _spawnTracer(ox, oy, oz, dx, dy, dz, dist, widthMul, subT) {
    const i = this._tracerN % TRACER_MAX;
    this._tracerN++;
    const o = i * 3, p = i * 4;
    this._trOrigin[o] = ox; this._trOrigin[o + 1] = oy; this._trOrigin[o + 2] = oz;
    this._trDir[o] = dx; this._trDir[o + 1] = dy; this._trDir[o + 2] = dz;
    this._trParam[p] = this.ctx.time.elapsed;
    this._trParam[p + 1] = Math.max(1.6, dist);
    this._trParam[p + 2] = widthMul;
    this._trParam[p + 3] = subT || 0;      // §3.2: advance by the sub-frame remainder
    this._trDirty = true;
    const live = Math.min(TRACER_MAX, this._tracerN);
    if (this.tracerMesh.geometry.instanceCount < live) this.tracerMesh.geometry.instanceCount = live;
  }

  // ===========================================================================
  // BALLISTICS
  // ===========================================================================

  /** §3.3: banded damage with a 2.0 m linear blend at every boundary. */
  damageAtRange(bands, d) {
    for (let i = 0; i < bands.length; i++) {
      const b = bands[i];
      if (d <= b.to) {
        const next = bands[i + 1];
        if (next && d > b.to - 1.0) {
          const f = (d - (b.to - 1.0)) / 2.0;
          return b.dmg + (next.dmg - b.dmg) * clamp(f, 0, 1);
        }
        if (i > 0 && d < bands[i - 1].to + 1.0) {
          const prev = bands[i - 1];
          const f = (d - (prev.to - 1.0)) / 2.0;
          return prev.dmg + (b.dmg - prev.dmg) * clamp(f, 0, 1);
        }
        return b.dmg;
      }
    }
    return bands[bands.length - 1].dmg;
  }

  /**
   * Uniform disc, §3.5 — `cone·sqrt(u)`, never `cone·u`.
   *
   * TRAP, and it cost a capture cycle: the tangent basis MUST come out of
   * dedicated scratch. This used `this._v` and `this._v2`, and `_fallbackFire`
   * holds the muzzle origin in `this._v2` across the `fireShot()` call — so
   * every shot overwrote the muzzle position with a unit tangent vector and
   * `vfx.muzzle()` drew the flash near the world origin instead of on the gun.
   * In `hipfire`/`combat` that is a bright unexplained blob floating in the
   * mid-field, which is exactly the kind of pixel a hostile critic opens with.
   * Same class of bug as enemies.js's documented T5. Never hand a shared
   * scratch vector to a routine that also takes scratch.
   */
  _applySpread(dx, dy, dz, coneDeg, out) {
    if (coneDeg <= 1e-4) { out.set(dx, dy, dz); return out; }
    const a = this.rngSpread.next() * Math.PI * 2;
    const r = Math.tan(coneDeg * DEG) * Math.sqrt(this.rngSpread.next());
    // build a basis around the aim
    const d = out.set(dx, dy, dz).normalize();
    const upx = Math.abs(d.y) > 0.94 ? 1 : 0;
    const t1 = this._sp1.set(upx, upx ? 0 : 1, 0).cross(d).normalize();
    const t2 = this._sp2.copy(d).cross(t1);
    d.addScaledVector(t1, Math.cos(a) * r).addScaledVector(t2, Math.sin(a) * r).normalize();
    return d;
  }

  /**
   * THE SHOT. Hitscan with penetration, tracer, surface-typed impact and the
   * whole damage model. Returns the (reused) shot record.
   */
  fireShot(o) {
    const W = WEAPONS[o.weapon] || WEAPONS.cinder;
    const ph = this.physics;
    const S = this._shot;
    S.hit = false; S.damage = 0; S.zone = null; S.actor = null; S.kill = false; S.wallbang = false;
    S.surface = 'ash'; S.dist = 0;

    let ox = o.ox, oy = o.oy, oz = o.oz;
    const aim = this._applySpread(o.dx, o.dy, o.dz, o.cone || 0, this._fwd);
    let dx = aim.x, dy = aim.y, dz = aim.z;

    this.ctx.bus.emit('combat:shot', o);

    // --- tracer cadence, §4.4: every 3rd round plus the last 3 in the mag
    const idx = o.shotIndex !== undefined ? o.shotIndex : this.shotsFired;
    const wantTracer = o.tracer !== undefined ? o.tracer
      : ((idx % W.tracerEvery) === 0 || (o.magLeft !== undefined && o.magLeft < W.tracerLast));

    if (!ph) {
      // physics is not up — still draw the round so the frame has a shooter
      if (wantTracer) this._spawnTracer(ox, oy, oz, dx, dy, dz, 120, o.ads ? 0.70 : 1.0, o.subT);
      return S;
    }

    let traversedCm = 0;
    let pens = 0;
    let damageMul = o.damageScale !== undefined ? o.damageScale : 1;
    let totalT = 0;
    let firstDist = -1;

    for (let bounce = 0; bounce < 3; bounce++) {
      const h = ph.raycast(ox, oy, oz, dx, dy, dz, 512 - totalT, PH.MASK.ALL, this._hit);
      if (!h) break;
      const dist = totalT + h.t;
      if (firstDist < 0) firstDist = dist;
      S.hit = true; S.dist = dist; S.surface = h.surface;
      S.x = h.x; S.y = h.y; S.z = h.z;

      const base = this.damageAtRange(W.bands, dist);
      const zone = h.zone;
      const zmul = zone ? (zone === 'head' ? W.headMul : (ZONE_MUL[zone] || 1)) : 1;
      const pen = Math.max(0.20, 1 - traversedCm / Math.max(0.001, h.penCm || 1));
      const dmg = base * zmul * damageMul * (pens > 0 ? pen : 1);

      // --- an enemies.js creature. It owns its own multiplier, so hand it the
      // BASE (range-attenuated, penetration-attenuated) damage, not `dmg`.
      if (h.kind === 'actor' && h.creature) {
        // Review/capture bursts are cinematography, not gameplay. They still
        // terminate the tracer on the creature so the frame reads correctly,
        // but they may never mutate health, stagger, hit markers, drops, or the
        // mission kill count. This removes the need for a lethal-hit photo guard.
        if (o.visualOnly) break;
        const raw = base * damageMul * (pens > 0 ? pen : 1);
        const dealt = this._applyCreatureDamage(h, raw, dx, dy, dz, dist, pens > 0);
        S.zone = zone; S.actor = h.creature; S.damage = dealt;
        S.wallbang = pens > 0;
        break;
      }
      if (h.kind === 'actor' && h.actor) {
        if (o.visualOnly) break;
        S.zone = zone; S.actor = h.actor; S.damage = dmg;
        S.wallbang = pens > 0;
        this._applyActorDamage(h, dmg, dx, dy, dz, dist, pens > 0);
        break;   // a round does not continue through a creature into another
      }
      this._scheduleImpact(h.x, h.y, h.z, h.nx, h.ny, h.nz, h.surface, dist, pens > 0);

      // --- §4.8 penetration
      if (!this.knobs.penetration || pens >= 2 || h.penCm <= 0) break;
      const exit = this._findExit(ox, oy, oz, dx, dy, dz, h.t, 0.50 - traversedCm * 0.01);
      if (exit < 0) break;                                    // thicker than the budget
      const thickCm = (exit - h.t) * 100;
      if (thickCm >= h.penCm) break;                          // defeated by the material
      traversedCm += thickCm;
      if (traversedCm >= 50) break;
      pens++;
      // exit feedback: a smaller burst on the far side, or penetration is invisible
      const ex = ox + dx * exit, ey = oy + dy * exit, ez = oz + dz * exit;
      this._scheduleImpact(ex, ey, ez, -h.nx, -h.ny, -h.nz, h.surface, dist, true);
      // §4.8: 0.40 deg of deflection per surface exited
      const defl = 0.40 * DEG;
      const jx = (this.rngSpread.next() - 0.5) * 2 * defl;
      const jy = (this.rngSpread.next() - 0.5) * 2 * defl;
      const nd = this._v.set(dx, dy, dz);
      nd.x += jx; nd.y += jy; nd.normalize();
      dx = nd.x; dy = nd.y; dz = nd.z;
      totalT += exit + 0.01;
      ox = ex + dx * 0.01; oy = ey + dy * 0.01; oz = ez + dz * 0.01;
    }

    if (wantTracer) {
      this._spawnTracer(o.ox, o.oy, o.oz, aim.x, aim.y, aim.z,
        firstDist > 0 ? firstDist : 220, o.ads ? 0.70 : 1.0, o.subT);
    }
    return S;
  }

  /**
   * Is this point inside world solid? The two cheap tests that already exist:
   * under the heightfield, or overlapping a prop collider. No raycast, no
   * allocation — `resolveSphere` reports contacts for a 1 cm probe.
   */
  _insideSolid(x, y, z) {
    const ph = this.physics;
    if (ph.terrain && y < ph.terrain.heightAt(x, z)) return true;
    const p = ph.props;
    if (p && p.resolveSphere) {
      const r = p.resolveSphere(x, y, z, 0.01, this._probe || (this._probe = { x: 0, y: 0, z: 0, n: 0, depth: 0, tag: null }));
      if (r.n > 0) return true;
    }
    return false;
  }

  /**
   * March forward from just past the entry point until we are outside solid
   * again. 4 cm steps, so at most 13 samples for the 0.50 m budget. Returns the
   * exit `t`, or −1 if the material is thicker than the budget.
   */
  _findExit(ox, oy, oz, dx, dy, dz, tIn, budget) {
    const step = 0.04;
    const maxT = tIn + Math.min(0.50, Math.max(step, budget));
    for (let t = tIn + step; t <= maxT; t += step) {
      if (!this._insideSolid(ox + dx * t, oy + dy * t, oz + dz * t)) return t;
    }
    return -1;
  }

  // ===========================================================================
  // DAMAGE MODEL
  // ===========================================================================

  /**
   * An enemies.js creature. THE DIVISION OF LABOUR MATTERS, so it is spelled
   * out: enemies.js's `damage()` applies the hitbox multiplier, the stagger
   * vulnerability, the 60 ms shader hit-flash, the surface impact burst, the
   * stagger state machine, death, the corpse ragdoll and the `enemyHit` /
   * `enemyStagger` / `enemyDeath` bus events. Every one of those is on the far
   * side of a file boundary and every one of them is already correct.
   *
   * So combat does exactly four things here that enemies.js does not do, and
   * nothing else:
   *   1. decides the BASE damage from range and penetration (§3.3, §4.8),
   *   2. fires the hit marker (§4.6) — the state machine hud.js reads,
   *   3. the damage number (§4.7) and the killfeed row (§4.9),
   *   4. re-emits `combat:hit` / `combat:kill` so listeners get one vocabulary
   *      regardless of which actor source produced the hit.
   *
   * In particular it does NOT call `_scheduleImpact` (that would double every
   * creature impact burst) and does NOT call `physics.spawnRagdoll` (that would
   * put a second corpse inside the one enemies.js is already simulating).
   * Returns the damage actually dealt, or 0 if the creature was already dead.
   */
  _applyCreatureDamage(h, base, dx, dy, dz, dist, wallbang, melee) {
    const en = this.enemies || (this.enemies = this.ctx.sys.enemies);
    const cr = h.creature;
    if (!en || typeof en.applyDamage !== 'function') return 0;

    const ci = this._crInfo;
    ci.part = h.tag; ci.mult = h.mult; ci.weak = h.weak; ci.armour = h.armour;
    // Dedicated vectors: enemies.js writes `point` into its hit-flash uniform
    // and forwards `dir` to vfx, so neither may be shared scratch.
    const pt = this._cpt.set(h.x, h.y, h.z);
    const dir = this._cdir.set(dx, dy, dz);

    // ORDER IS LOad-BEARING. enemies.js's damage() -> die() -> `enemyDeath`
    // runs synchronously INSIDE applyDamage, and our `enemyDeath` handler is
    // what spawns the ammo nodes. Latching the wound first is therefore the
    // only way a node can be thrown out of the hole the round made.
    const kc = this._killCtx;
    kc.t = this.ctx.time.elapsed;
    kc.x = h.x; kc.y = h.y; kc.z = h.z;
    kc.dx = dx; kc.dy = dy; kc.dz = dz; kc.melee = !!melee;

    const hpBefore = cr.hp;
    let dealt = en.applyDamage(cr, base, pt, dir, ci);
    if (!(dealt > 0)) return 0;                 // already dead, or refused
    const killed = cr.hp <= 0 && hpBefore > 0;

    // A deflect is armour that actually shrugged the round off. A carapace vent
    // is flagged neither, and its 3.6x is the whole reason to flank it.
    const deflect = h.armour && h.mult < 0.8;
    const weak = !!h.weak;
    const zone = h.zone || (weak ? 'vent' : deflect ? 'plate' : 'torso');
    const head = zone === 'head';

    const info = this._info;
    info.actor = cr; info.part = h.tag; info.zone = zone; info.damage = dealt;
    info.weak = weak; info.deflect = deflect; info.wallbang = !!wallbang;
    info.x = h.x; info.y = h.y; info.z = h.z;
    info.nx = h.nx; info.ny = h.ny; info.nz = h.nz;
    info.dx = dx; info.dy = dy; info.dz = dz; info.dist = dist;
    this.ctx.bus.emit('combat:hit', info);

    // §3 of this round's brief: escalation. `hpFrac` is what the target has
    // LEFT after this round landed, so the marker grows across a burst and the
    // player sees the kill coming one hit before it arrives.
    const maxHp = cr.maxHp || (cr.spec && cr.spec.hp) || 100;
    const hpFrac = clamp((cr.hp > 0 ? cr.hp : 0) / Math.max(1, maxHp), 0, 1);
    const kind = killed ? 'kill' : deflect ? 'deflect' : weak ? 'weak' : head ? 'head' : 'normal';
    this._mo.zone = zone; this._mo.melee = !!melee;
    this._mo.strength = dealt / 34;             // 1.0 = one close-range body round
    this._mo.hpFrac = hpFrac;
    this._marker(kind, this._mo);
    this._number(h.x, h.y, h.z, dealt, weak);
    this._log(killed ? 'kill' : deflect ? 'deflect' : weak ? 'weak' : 'hit', wallbang);

    if (killed) {
      this.kills++;
      this.killT = 0;
      this.killZone = zone; this.killMelee = !!melee;
      this.killKind = melee ? 'melee' : head ? 'head' : weak ? 'weak' : 'shot';
      const ki = this._killInfo;
      ki.actor = cr; ki.ragdoll = null;         // enemies.js owns the corpse
      ki.x = h.x; ki.y = h.y; ki.z = h.z;
      ki.damage = dealt; ki.wallbang = !!wallbang;
      ki.zone = zone; ki.headshot = head; ki.weak = weak;
      ki.melee = !!melee; ki.kind = this.killKind;
      this.ctx.bus.emit('combat:kill', ki);
    }
    return dealt;
  }

  _applyActorDamage(h, dmg, dx, dy, dz, dist, wallbang, melee) {
    const a = h.actor;
    const zone = h.zone;
    const weak = zone === 'vent';
    const deflect = zone === 'plate';
    const kc = this._killCtx;
    kc.t = this.ctx.time.elapsed;
    kc.x = h.x; kc.y = h.y; kc.z = h.z;
    kc.dx = dx; kc.dy = dy; kc.dz = dz; kc.melee = !!melee;

    // §6.4 — the stagger is a damage-window rule, so it is bookkept here
    if (a._dmgWin === undefined) { a._dmgWin = 0; a._dmgWinT = 0; a._staggerUntil = -99; a._staggerImmune = -99; }
    const now = this.ctx.time.elapsed;
    if (now - a._dmgWinT > 0.40) { a._dmgWin = 0; a._dmgWinT = now; }
    const vuln = now < a._staggerUntil ? 1.25 : 1.0;
    const applied = dmg * vuln;
    a._dmgWin += applied;

    // Reused record. Listeners must READ it, not retain it — documented in the
    // header. Retaining it would also break determinism across a replay.
    const info = this._info;
    info.actor = a; info.part = h.part; info.zone = zone; info.damage = applied;
    info.weak = weak; info.deflect = deflect; info.wallbang = wallbang;
    info.x = h.x; info.y = h.y; info.z = h.z;
    info.nx = h.nx; info.ny = h.ny; info.nz = h.nz;
    info.dx = dx; info.dy = dy; info.dz = dz; info.dist = dist;

    let killed = false;
    const custom = a.user && typeof a.user.applyDamage === 'function' ? a.user : null;
    if (custom) {
      killed = custom.applyDamage(applied, info) === true;
      if (a.hp !== undefined && custom.hp !== undefined) a.hp = custom.hp;
    } else {
      a.hp -= applied;
      killed = a.hp <= 0 && !a.dead;
    }

    // §4.5 impact on a creature: NO decal on the mesh, shader hit-flash instead
    this._scheduleImpact(h.x, h.y, h.z, h.nx, h.ny, h.nz, deflect ? 'metal' : 'flesh', dist, wallbang, false);
    this.ctx.bus.emit('combat:hit', info);

    if (!killed) {
      const trig = (a._dmgWin >= a.maxHp * 0.35) || (weak && applied >= a.maxHp * 0.25);
      if (trig && now > a._staggerImmune) {
        a._staggerUntil = now + 0.620;
        a._staggerImmune = now + 0.620 + 2.200;
        a._dmgWin = 0;
        this.ctx.bus.emit('combat:stagger', { actor: a });
      }
      const maxHp = a.maxHp || 100;
      this._mo.zone = zone; this._mo.melee = !!melee;
      this._mo.strength = applied / 34;
      this._mo.hpFrac = clamp((a.hp > 0 ? a.hp : 0) / Math.max(1, maxHp), 0, 1);
      this._marker(deflect ? 'deflect' : weak ? 'weak' : zone === 'head' ? 'head' : 'normal', this._mo);
      this._number(h.x, h.y, h.z, applied, weak);
      this._log(deflect ? 'deflect' : weak ? 'weak' : 'hit', wallbang);
    } else {
      this._kill(a, applied, h, dx, dy, dz, wallbang, melee);
    }
  }

  /** §4.9 — the payoff, in layers, in order. */
  _kill(a, dmg, h, dx, dy, dz, wallbang, melee) {
    a.dead = true;
    a.noHit = true;
    const zone = h.zone || 'torso';
    this.kills++;
    this.killT = 0;
    this.killZone = zone; this.killMelee = !!melee;
    this.killKind = melee ? 'melee' : zone === 'head' ? 'head' : zone === 'vent' ? 'weak' : 'shot';
    this._mo.zone = zone; this._mo.melee = !!melee;
    this._mo.strength = dmg / 34; this._mo.hpFrac = 0;
    this._marker('kill', this._mo);
    this._number(h.x, h.y, h.z, dmg, zone === 'vent');
    this._log('kill', wallbang);

    // t+60 ms: ragdoll takes over, killing impulse at the hit bone.
    // damage x 0.70 N.s along the bullet, CLAMPED to 320 so nothing launches.
    const j = Math.min(320, dmg * 0.70);
    let rag = null;
    if (this.physics) {
      const im = this._ragImp;
      im.ix = dx * j; im.iy = dy * j + j * 0.12; im.iz = dz * j;
      im.hx = h.x; im.hy = h.y; im.hz = h.z;
      rag = this.physics.spawnRagdoll(a, im);
    }
    // t+120 ms: spore burst. Queued so the order in §4.9 is actually the order.
    this._queue(this.ctx.time.elapsed + 0.120, a.x, a.y + a.height * 0.5, a.z, 0, 1, 0, 'flora', 1.6, false);
    // ammo economy: physics-actor kills drop the default node. (Creature kills
    // drop via the `enemyDeath` bus event — enemies.js's die() emits it — so
    // this path cannot double them: h.creature never reaches _kill.)
    this._spawnDropsFor(a.kind, a.x, a.y + (a.height || 1) * 0.5, a.z);
    const ki = this._killInfo;
    ki.actor = a; ki.ragdoll = rag; ki.x = a.x; ki.y = a.y; ki.z = a.z;
    ki.damage = dmg; ki.wallbang = !!wallbang;
    ki.zone = zone; ki.headshot = zone === 'head'; ki.weak = zone === 'vent';
    ki.melee = !!melee; ki.kind = this.killKind;
    this.ctx.bus.emit('combat:kill', ki);
  }

  /** Player damage + directional indicator. §4.x / §7. */
  damagePlayer(amount, sx, sy, sz) {
    if (amount <= 0 || this.health <= 0) return;
    this.health = Math.max(0, this.health - amount);
    this.lastHitT = this.ctx.time.elapsed;
    this.regenerating = false;
    let angle = 0;
    if (sx !== undefined && this.player) {
      const px = this.ctx.camera.position.x, pz = this.ctx.camera.position.z;
      const world = Math.atan2(sx - px, -(sz - pz));       // +Z is back, three convention
      angle = world - (this.player.yaw || 0);
      while (angle > Math.PI) angle -= Math.PI * 2;
      while (angle < -Math.PI) angle += Math.PI * 2;
    }
    if (this.dirs.length >= 6) this.dirs.shift();
    this.dirs.push({ angle, t: 0, strength: clamp(amount / 34, 0.25, 1.6) });
    this.ctx.bus.emit('player:damage', { amount, health: this.health, angle });
    if (this.health <= 0) this.ctx.bus.emit('player:down', {});
  }

  // ===========================================================================
  // FEEDBACK
  // ===========================================================================

  /**
   * §4.5 impact latency: under 60 m the effect lands on the SAME frame as the
   * shot; beyond that it is delayed by range/340 to meet the tracer. Damage is
   * always applied instantly, so the delay is atmosphere, never unfairness.
   */
  _scheduleImpact(x, y, z, nx, ny, nz, surface, dist, isExit, decal) {
    const I = IMPACT[surface] || IMPACT.ash;
    const power = (isExit ? I.exit : I.power) * this.knobs.impactGain;
    const useDecal = decal !== undefined ? decal : (I.decal !== undefined ? I.decal : true);
    if (dist <= 60) {
      this._doImpact(x, y, z, nx, ny, nz, surface, power, useDecal);
      return;
    }
    this._queue(this.ctx.time.elapsed + dist / this.knobs.tracerSpeed,
      x, y, z, nx, ny, nz, surface, power, useDecal);
  }

  /** Pooled deferred effect. Silently drops when the pool is full — 64 in
   *  flight is five full magazines past 60 m and the frame has bigger problems. */
  _queue(t, x, y, z, nx, ny, nz, surface, power, decal) {
    for (let i = 0; i < this._pending.length; i++) {
      const p = this._pending[i];
      if (p.live) continue;
      p.live = true; p.t = t;
      p.x = x; p.y = y; p.z = z; p.nx = nx; p.ny = ny; p.nz = nz;
      p.surface = surface; p.power = power; p.decal = decal;
      this._pendLive++;
      return p;
    }
    return null;
  }

  _doImpact(x, y, z, nx, ny, nz, surface, power, decal) {
    const I = IMPACT[surface] || IMPACT.ash;
    const vfx = this.vfx || (this.vfx = this.ctx.sys.vfx);
    if (vfx && vfx.impact) {
      vfx.impact({
        pos: this._v.set(x, y, z),
        normal: this._v2.set(nx, ny, nz),
        surface: I.vfx || surface,
        power,
        decal: decal !== false,
      });
    }
    if (I.splash) this.ctx.sys.water?.splash?.(x, y, z, clamp(power, 0.2, 1.4));
    const ii = this._impactInfo;
    ii.x = x; ii.y = y; ii.z = z; ii.nx = nx; ii.ny = ny; ii.nz = nz;
    ii.surface = surface; ii.power = power;
    this.ctx.bus.emit('combat:impact', ii);
  }

  /**
   * §4.6, and the whole of this round's item 1: THE HIT CONFIRM INSIDE 60 ms.
   * Combat owns the STATE MACHINE; hud.js owns the pixels; audio.js owns the
   * click (it already listens to `combat:hitmarker`). All three land on the
   * frame of the hit, i.e. inside 16.7 ms, which is the only way to be inside
   * 60 ms without hoping.
   *
   * `o` is optional and is READ, never retained: {zone, melee, strength, hpFrac}.
   *
   * `head` is a fifth kind on top of §4.6's four. The spec distinguishes a weak
   * point (2.40x, amber, extra chevron) but has no shape for a head (1.60x),
   * and this round's brief asks for the distinction explicitly. It ranks below
   * `weak` so a vent hit still wins the slot.
   */
  _marker(kind, o) {
    if (!this.knobs.hitmarkers) return;
    const now = this.ctx.time.elapsed;
    const m = this.marker;
    // kill / weak / head markers outrank a plain hit that is already showing
    if (m.kind && m.t < 0.210 && (MARK_RANK[kind] || 0) < (MARK_RANK[m.kind] || 0)) return;
    m.kind = kind; m.t = 0; m.phase = 0; m.seq++;
    m.zone = (o && o.zone) || null;
    m.melee = !!(o && o.melee);
    m.strength = o && typeof o.strength === 'number' ? clamp(o.strength, 0, 4) : 1;
    m.hpFrac = o && typeof o.hpFrac === 'number' ? clamp(o.hpFrac, 0, 1) : -1;
    this._markerTimes.push(now);
    while (this._markerTimes.length && now - this._markerTimes[0] > 0.400) this._markerTimes.shift();
    // §4.6: ducked to -9 dB during sustained fire (>= 3 markers in 400 ms)
    m.duck = this._markerTimes.length >= 3;
    const mi = this._markerInfo;
    mi.kind = kind; mi.duck = m.duck; mi.zone = m.zone;
    mi.melee = m.melee; mi.strength = m.strength; mi.hpFrac = m.hpFrac;
    this.ctx.bus.emit('combat:hitmarker', mi);

    // WEAPON-SIDE FEEDBACK, the third leg of the 60 ms confirm. The gun has to
    // acknowledge the hit or the confirmation lives entirely in the HUD and
    // reads as a UI event rather than a physical one. weapons.js owns the
    // viewmodel, so this is an optional-call into its file rather than an edit
    // to it: the moment it grows `hitFeedback(info)` the leg connects, and
    // until then the bus event above is there for it. Filed in HANDOFF.
    const w = this.ctx.sys.weapons;
    if (w && typeof w.hitFeedback === 'function') {
      try { w.hitFeedback(mi); } catch { /* weapons mid-build; never break a shot */ }
    }
  }

  /** §4.7 — off by default; when on, world-anchored with a deterministic jitter. */
  _number(x, y, z, value, weak) {
    if (!this.knobs.damageNumbers) return;
    if (this.numbers.length >= NUMBER_MAX) this.numbers.shift();
    this.numbers.push({
      x, y, z, value: Math.round(value), weak, t: 0,
      jitter: (this.rngNum.next() - 0.5) * 16,
    });
  }

  _log(kind, wallbang) {
    // Ring of preallocated records — a killfeed that allocates is a killfeed
    // that stutters at 725 RPM.
    if (!this._hitPool) {
      this._hitPool = [];
      for (let i = 0; i < HIT_LOG; i++) this._hitPool.push({ kind: null, wallbang: false, t: 0 });
      this._hitN = 0;
    }
    const r = this._hitPool[this._hitN++ % HIT_LOG];
    r.kind = kind; r.wallbang = !!wallbang; r.t = 0;
    const at = this.hits.indexOf(r);
    if (at >= 0) this.hits.splice(at, 1);
    if (this.hits.length >= HIT_LOG) this.hits.shift();
    this.hits.push(r);
    this._dmgInfo.kind = kind; this._dmgInfo.wallbang = !!wallbang;
    this.ctx.bus.emit('combat:damage', this._dmgInfo);
  }

  // ===========================================================================
  // AMMO ECONOMY — sinter-node drops and resupply caches
  // ===========================================================================

  /** The trigger owner's live reserve (weapons.js when it is real). */
  _reserveNow() {
    const w = this.ctx.sys.weapons;
    const driven = this._busTrigger || !!(w && w.ownsTrigger);
    if (driven && w && typeof w.reserve === 'number') return w.reserve;
    return this.reserve;
  }

  /**
   * Credit rounds to BOTH reserves (they are two counters for one gun — the
   * fallback's and weapons.js's public field), capped at RESERVE_MAX. Emits
   * `weapon:ammo` so hud.js's push path sees the same number its poll path
   * will. Returns what was actually banked.
   */
  _creditReserve(rounds) {
    const cur = this._reserveNow();
    const add = Math.max(0, Math.min(RESERVE_MAX - cur, rounds));
    if (add <= 0) return 0;
    this.reserve = Math.min(RESERVE_MAX, this.reserve + add);
    const w = this.ctx.sys.weapons;
    if (w && typeof w.reserve === 'number') {
      w.reserve = Math.min(RESERVE_MAX, w.reserve + add);
      const ai = this._ammoInfo;
      ai.ammo = typeof w.ammo === 'number' ? w.ammo : this.magLeft;
      ai.reserve = w.reserve;
      this.ctx.bus.emit('weapon:ammo', ai);
    }
    return add;
  }

  /** Emissive instanced nodes. One draw for all 24. */
  _buildDrops() {
    const geo = new THREE.IcosahedronGeometry(0.16, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x241812, roughness: 0.5, metalness: 0.4,
      // Tracer-family amber (1.0/0.62/0.28 is the round in flight; the node is
      // the round before it is made). Emissive + bloom is the 20 m readability.
      // 2.1, not 3.0: at 3.0 the core clipped to a white disc through the ACES
      // curve and the amber identity only survived in the halo (checked in a
      // 2x crop). At 2.1 the hue holds and bloom still carries it at range.
      emissive: new THREE.Color(1.0, 0.40, 0.10), emissiveIntensity: 2.1,
    });
    this.dropMesh = new THREE.InstancedMesh(geo, mat, DROP_MAX);
    this.dropMesh.name = 'combat.ammoDrops';
    this.dropMesh.castShadow = false;
    this.dropMesh.receiveShadow = false;
    this.dropMesh.frustumCulled = false;   // few, moving, magnetized — not worth a sphere
    this.dropMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropMesh.count = 0;
    this.ctx.scene.add(this.dropMesh);

    // Additive glow shell — the 20 m readability. The bare nugget checked out
    // at 4.5 m but vanished into the warm mid-field at 20 (captured, eyeballed).
    // A 2.2x breathing halo in the transparent pass is what every shipped
    // shooter does for pickups; the renderer's aux-attachment scan handles the
    // MRT masking exactly as it does for the tracers. One instanced draw.
    const glowGeo = new THREE.SphereGeometry(0.16, 10, 8);
    const glowMat = new THREE.MeshBasicMaterial({
      color: new THREE.Color(1.0, 0.45, 0.14),
      transparent: true, opacity: 0.20,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    this.dropGlow = new THREE.InstancedMesh(glowGeo, glowMat, DROP_MAX);
    this.dropGlow.name = 'combat.ammoDropGlow';
    this.dropGlow.castShadow = false;
    this.dropGlow.receiveShadow = false;
    this.dropGlow.frustumCulled = false;
    this.dropGlow.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.dropGlow.count = 0;
    this.dropGlow.renderOrder = 29;
    this.dropGlow.layers.set(CB_LAYER.TRANSPARENT);
    this.ctx.scene.add(this.dropGlow);
  }

  /**
   * PLACEHOLDER cache meshes (a proper prop is requested in HANDOFF): a squat
   * crate with an amber beacon rod. The rod is 2.3 m of emissive in a world
   * with bloom — it is navigable-by at range, which is the §3 requirement.
   * Terrain height is not known yet at init (physics may still be settling),
   * so placement is deferred to the first update() that can see heightAt.
   */
  _buildCaches() {
    const defs = [
      // the combat pocket (director's 'start'/'channel' spawns live here)
      { name: 'basin-start', x: SITES.pocket.x + 6, z: SITES.pocket.z + 30 },
      { name: 'basin-channel', x: SITES.pocket.x - 6, z: SITES.pocket.z - 8 },
      // landmarks
      { name: 'duff', x: SITES.duff.x + 12, z: SITES.duff.z - 2 },
      { name: 'grotto', x: SITES.grotto.x + 5, z: SITES.grotto.z + 5 },
    ];
    this._cacheGroup = new THREE.Group();
    this._cacheGroup.name = 'combat.ammoCaches';
    const crateMat = this._cacheCrateMat = new THREE.MeshStandardMaterial({
      color: 0x23262b, roughness: 0.48, metalness: 0.62,
    });
    const glowMat = this._cacheGlowMat = new THREE.MeshStandardMaterial({
      color: 0x1a1410, roughness: 0.6, metalness: 0.1,
      emissive: new THREE.Color(1.0, 0.46, 0.12), emissiveIntensity: 2.8,
    });
    const crateGeo = this._cacheCrateGeo = new THREE.BoxGeometry(0.92, 0.55, 0.62);
    const stripGeo = this._cacheStripGeo = new THREE.BoxGeometry(0.94, 0.07, 0.64);
    const rodGeo = this._cacheRodGeo = new THREE.CylinderGeometry(0.022, 0.022, 2.3, 6);
    for (const d of defs) {
      const g = new THREE.Group();
      const crate = new THREE.Mesh(crateGeo, crateMat);
      crate.position.y = 0.28;
      crate.castShadow = true; crate.receiveShadow = true;
      const strip = new THREE.Mesh(stripGeo, glowMat);
      strip.position.y = 0.58;
      const rod = new THREE.Mesh(rodGeo, glowMat);
      rod.position.set(-0.38, 1.65, 0);
      g.add(crate); g.add(strip); g.add(rod);
      g.position.set(d.x, 0, d.z);
      g.visible = false;                       // until placed on real ground
      this._cacheGroup.add(g);
      this.caches.push({ name: d.name, x: d.x, y: 0, z: d.z, group: g, armed: true });
    }
    this.ctx.scene.add(this._cacheGroup);
  }

  _placeCaches() {
    const t = this.physics && this.physics.terrain;
    if (!t || typeof t.heightAt !== 'function') return;
    for (const c of this.caches) {
      c.y = t.heightAt(c.x, c.z);
      c.group.position.y = c.y;
      c.group.visible = true;
      c.group.updateMatrixWorld(true);
    }
    this._cachesPlaced = true;
  }

  /**
   * One kill's worth of nodes, per DROPS_FOR.
   *
   * ITEM 4 OF THE ROUND-11 BRIEF: *"the reward lands on the kill... spawning
   * with the kill and reading as a consequence of it, not as a separate
   * errand."* If `_killCtx` was latched on this frame (it is, for every kill
   * that came from a round or a swing — see `_applyCreatureDamage`), the nodes
   * are born at the WOUND and thrown along the killing round, then seek. A kill
   * from a fire front or a script has no wound, so those fall back to the old
   * behaviour and drop where the body was.
   */
  _spawnDropsFor(kind, x, y, z) {
    if (!this.knobs.drops) return;
    const set = DROPS_FOR[kind] || DROP_DEFAULT;
    const kc = this._killCtx;
    const fresh = (this.ctx.time.elapsed - kc.t) < 0.001;   // same frame = this kill
    for (let i = 0; i < set.length; i++) {
      const d = fresh
        ? this._spawnDrop(kc.x, kc.y, kc.z, set[i], kc)
        : this._spawnDrop(x, y, z, set[i], null);
      void d;
    }
  }

  /**
   * Ring-allocated, like the tracers: the oldest node is recycled when full.
   * `kc` (optional) is the wound this node came out of; with it the node is
   * ejected along the round rather than popped straight up, and it is armed to
   * seek the player (see DROP_SEEK).
   */
  _spawnDrop(x, y, z, rounds, kc) {
    let d = null;
    for (let i = 0; i < DROP_MAX; i++) { if (!this._drops[i].live) { d = this._drops[i]; break; } }
    if (!d) d = this._drops[this._dropN % DROP_MAX];
    else this._dropsLive++;
    this._dropN++;
    d.live = true; d.age = 0; d.rest = false; d.magnet = false;
    d.rounds = rounds;
    d.seed = this.rngDrops.next();
    d.x = x; d.y = y; d.z = z;
    d.seek = 0;
    // a small pop so a multi-node kill scatters readably
    const a = this.rngDrops.next() * Math.PI * 2;
    const sp = 0.7 + this.rngDrops.next() * 0.9;
    d.vx = Math.cos(a) * sp; d.vz = Math.sin(a) * sp;
    d.vy = 2.4 + this.rngDrops.next() * 1.0;
    if (kc) {
      // Out of the wound, along the round, with the scatter kept as the spray.
      // 2.6 m/s (3.4 for a melee kill — the swing has more follow-through and
      // the player is standing right there, so the node has to clear him).
      const push = kc.melee ? 3.4 : 2.6;
      d.vx += kc.dx * push; d.vy += kc.dy * push + 0.6; d.vz += kc.dz * push;
      if (this.knobs.dropSeek) d.seek = DROP_SEEK;
    }
    return d;
  }

  _updateDrops(dt) {
    if (!this._dropsLive) return;
    const terrain = this.physics && this.physics.terrain;
    const pl = this.player;
    const cam = this.ctx.camera;
    // capsule centre, not the eye — nodes should chase the body
    const px = pl ? pl.pos.x : cam.position.x;
    const py = (pl ? pl.pos.y : cam.position.y) - 0.85;
    const pz = pl ? pl.pos.z : cam.position.z;
    const magR = this.knobs.dropMagnetR, colR = this.knobs.dropCollectR;
    const colR2 = colR * colR;
    // a full reserve leaves nodes on the ground for later — nothing is wasted
    const canTake = this._reserveNow() < RESERVE_MAX;
    for (let i = 0; i < DROP_MAX; i++) {
      const d = this._drops[i];
      if (!d.live) continue;
      d.age += dt;
      if (d.age > DROP_LIFE) { d.live = false; this._dropsLive--; continue; }
      d.magnet = false;
      if (d.seek > 0) d.seek = Math.max(0, d.seek - dt);
      if (canTake) {
        const ddx = px - d.x, ddy = py - d.y, ddz = pz - d.z;
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz;
        if (d2 < colR2) { this._collectDrop(d); continue; }
        // A kill drop is airborne for DROP_TOSS so the eye sees it ERUPT from
        // the creature — start homing on frame 1 and it reads as a UI object
        // rather than a piece of the thing you just killed. After the toss it
        // homes from `dropSeekR`; after DROP_SEEK it is an ordinary node with
        // the ordinary 2.5 m magnet and nothing has been lost.
        const seeking = d.seek > 0 && d.age > DROP_TOSS;
        const rad = seeking ? Math.max(magR, this.knobs.dropSeekR) : magR;
        if (d2 < rad * rad) {
          // homing velocity, 5->14 m/s as it closes (up to 21 on the long seek
          // leg so a 14 m return still lands inside a second). Direct velocity,
          // not a force: no orbiting, and at 21 m/s a step is 0.35 m, still
          // inside the 0.85 m collect radius, so it cannot tunnel.
          const dist = Math.sqrt(d2) || 1e-4;
          const near = 1 - Math.min(1, dist / magR);
          const spd = seeking ? (13 + near * 8) : (5 + near * 9);
          d.vx = (ddx / dist) * spd; d.vy = (ddy / dist) * spd; d.vz = (ddz / dist) * spd;
          d.magnet = true; d.rest = false;
        }
      }
      if (d.rest) continue;
      if (!d.magnet) d.vy -= 22 * dt;          // §2.1 gravity
      d.x += d.vx * dt; d.y += d.vy * dt; d.z += d.vz * dt;
      if (!d.magnet && terrain) {
        const gy = terrain.heightAt(d.x, d.z) + 0.16;
        if (d.y < gy) {
          d.y = gy;
          if (d.vy < -2.0) { d.vy = -d.vy * 0.28; d.vx *= 0.7; d.vz *= 0.7; }
          else {
            d.vy = 0; d.vx *= 0.5; d.vz *= 0.5;
            if (Math.abs(d.vx) + Math.abs(d.vz) < 0.2) { d.vx = 0; d.vz = 0; d.rest = true; }
          }
        }
      }
    }
  }

  /** Contact. The confirm chain must land THIS frame (COMBAT_FEEL timing). */
  _collectDrop(d) {
    d.live = false; this._dropsLive--;
    const add = this._creditReserve(d.rounds);
    if (add <= 0) return;                      // raced a cache refill; node spent
    this.pickupT = 0; this.pickupRounds = add;
    const pi = this._pickupInfo;
    pi.rounds = add; pi.reserve = this._reserveNow();
    pi.x = d.x; pi.y = d.y; pi.z = d.z;
    this.ctx.bus.emit('combat:ammoPickup', pi);
    // same-frame audio: the weak-point shimmer pitched up reads as "collected".
    // A dedicated buffer is requested in HANDOFF; this is the wired fallback.
    const au = this.audio || (this.audio = this.ctx.sys.audio);
    if (au && au.play) au.play('hmWeak', { bus: 'ui', gain: 0.5, rate: 1.22, send: 0.04 });
    // a small cool sparkle at the node, no decal
    const vfx = this.vfx || (this.vfx = this.ctx.sys.vfx);
    if (vfx && vfx.impact) {
      vfx.impact({
        pos: this._v.set(d.x, d.y, d.z), normal: this._v2.set(0, 1, 0),
        surface: 'glass', power: 0.4, decal: false,
      });
    }
  }

  _updateCaches(dt) {
    void dt;
    if (!this._cachesPlaced) { this._placeCaches(); if (!this._cachesPlaced) return; }
    if (!this.knobs.cacheRefill) return;
    const pl = this.player;
    const cam = this.ctx.camera;
    const px = pl ? pl.pos.x : cam.position.x;
    const pz = pl ? pl.pos.z : cam.position.z;
    for (let i = 0; i < this.caches.length; i++) {
      const c = this.caches[i];
      const dx = px - c.x, dz = pz - c.z;
      const d2 = dx * dx + dz * dz;
      if (!c.armed) { if (d2 > 4.5 * 4.5) c.armed = true; continue; }
      if (d2 > 3.0 * 3.0) continue;
      const cur = this._reserveNow();
      if (cur >= RESERVE_MAX) continue;        // stays armed until it can help
      const add = this._creditReserve(RESERVE_MAX - cur);
      if (add <= 0) continue;
      c.armed = false;                         // re-arms when the player leaves
      this.cacheT = 0;
      this.pickupT = 0; this.pickupRounds = add;
      const ci = this._cacheInfo;
      ci.reserve = this._reserveNow(); ci.x = c.x; ci.y = c.y; ci.z = c.z;
      this.ctx.bus.emit('combat:cacheRefill', ci);
      const au = this.audio || (this.audio = this.ctx.sys.audio);
      // the two-note kill confirm at low gain reads as "topped off"
      if (au && au.play) au.play('hmKill', { bus: 'ui', gain: 0.45, send: 0.06 });
    }
  }

  /** Visuals: idle bob + spin + pulse; end-of-life shrink. Runs in lateUpdate. */
  _renderDrops() {
    const mesh = this.dropMesh;
    if (!mesh) return;
    const t = this.ctx.time.elapsed;
    const cam = this.ctx.camera;
    let n = 0;
    for (let i = 0; i < DROP_MAX; i++) {
      const d = this._drops[i];
      if (!d.live) continue;
      const ph = d.seed * Math.PI * 2;
      const bob = d.rest ? Math.sin(t * 2.6 + ph) * 0.045 + 0.055 : 0;
      // last 2 s: shrink out rather than pop
      const fade = clamp((DROP_LIFE - d.age) * 0.5, 0, 1);
      const pulse = (1 + 0.16 * Math.sin(t * 5.2 + ph)) * fade;
      this._dP.set(d.x, d.y + bob, d.z);
      this._dQ.setFromAxisAngle(this._dUp, t * 1.7 + ph);
      this._dS.set(pulse, pulse * 0.82, pulse);   // slightly oblate: a nugget, not a ball
      this._dM.compose(this._dP, this._dQ, this._dS);
      mesh.setMatrixAt(n, this._dM);
      // halo: same anchor, breathing, DISTANCE-SCALED — a rim at arm's length
      // (a 2.2x fixed halo read as a beige balloon in the 4.5 m crop), a beacon
      // at 20+. Camera is final here: lateUpdate runs after player moves it.
      const cdx = cam.position.x - d.x, cdy = cam.position.y - d.y, cdz = cam.position.z - d.z;
      const cdist = Math.sqrt(cdx * cdx + cdy * cdy + cdz * cdz);
      const haloBase = clamp(1.15 + cdist * 0.10, 1.3, 3.4);
      const halo = pulse * haloBase * (1 + 0.18 * Math.sin(t * 3.1 + ph));
      this._dS.set(halo, halo, halo);
      this._dM.compose(this._dP, this._dQ, this._dS);
      this.dropGlow.setMatrixAt(n, this._dM);
      n++;
    }
    if (n === 0) {
      // Keep ONE zero-scale instance alive so both programs compile at boot,
      // not as a hitch on the first kill of the game. Degenerate: the vertex
      // stage collapses it, the fragment stage never runs.
      this._dP.set(0, -999, 0);
      this._dQ.identity();
      this._dS.set(0, 0, 0);
      this._dM.compose(this._dP, this._dQ, this._dS);
      mesh.setMatrixAt(0, this._dM);
      this.dropGlow.setMatrixAt(0, this._dM);
      n = 1;
    }
    mesh.count = n;
    this.dropGlow.count = n;
    mesh.instanceMatrix.needsUpdate = true;
    this.dropGlow.instanceMatrix.needsUpdate = true;
    // beacon breath — subtle, shared across caches
    if (this._cacheGlowMat) this._cacheGlowMat.emissiveIntensity = 2.8 + Math.sin(t * 2.2) * 0.7;
  }

  // ===========================================================================
  // FALLBACK TRIGGER — active only while weapons.js does not own it
  // ===========================================================================

  /**
   * The fallback gun is live only while nothing else is driving the trigger.
   * `_busTrigger` latches on the first `weapon:fire`, so this flips itself off
   * the moment weapons.js becomes real and never flickers back.
   */
  get autoFireActive() {
    const w = this.ctx.sys.weapons;
    return this.knobs.autoFire && !this._busTrigger && !(w && w.ownsTrigger);
  }

  /**
   * §3.4 aim kick for shot n (1-based), degrees.
   * Shots 1..16 are the AUTHORED pattern and carry no jitter — acceptance test
   * §9.3 checks `kickAccum.pitch == 3.58 +/- 0.02` after ten shots, which only
   * holds if they are exact. The deterministic +/-8% belongs to the sustained
   * zone (17+), where it is what stops a magazine being mechanically identical.
   */
  _kickFor(n) {
    if (n <= KICK.length) return this._kickOut(KICK[n - 1][0], KICK[n - 1][1]);
    const y = KICK_LOOP[(n - KICK.length - 1) % KICK_LOOP.length];
    const j = 1 + (this.rngRecoil.next() - 0.5) * 0.16;
    return this._kickOut(0.12 * j, y * j);
  }

  _kickOut(p, y) {
    const o = this._kickTmp || (this._kickTmp = [0, 0]);
    o[0] = p; o[1] = y;
    return o;
  }

  _muzzleOrigin(out) {
    const w = this.ctx.sys.weapons;
    if (w && typeof w.muzzleWorld === 'function') { w.muzzleWorld(out); return out; }
    const c = this.ctx.camera;
    this._fwd.set(0, 0, -1).applyQuaternion(c.quaternion);
    this._right.set(1, 0, 0).applyQuaternion(c.quaternion);
    this._up.set(0, 1, 0).applyQuaternion(c.quaternion);
    return out.copy(c.position)
      .addScaledVector(this._fwd, 0.62)
      .addScaledVector(this._right, 0.11)
      .addScaledVector(this._up, -0.10);
  }

  _fallbackFire(subT, visualOnly = false) {
    const W = WEAPONS.cinder;
    const inp = this.input;
    const ads = inp ? inp.aim : false;
    const moving = this.player ? Math.hypot(this.player.vel.x, this.player.vel.z) > 1.4 : false;
    const crouch = inp ? inp.crouch : false;
    const grounded = this.player ? this.player.grounded !== false : true;

    let cone = ads ? (moving ? W.coneAdsMove : W.coneAds) : (moving ? W.coneHipMove : W.coneHip);
    if (!ads && crouch) cone *= 0.78;
    if (!grounded) cone *= 2.40;
    cone += this.bloom;

    this.burstShots++;
    this._restP = null; this._restY = null;   // a new shot re-arms the snapshot
    const k = this._kickFor(this.burstShots);
    const kp = k[0], ky = k[1];
    const mul = ads ? 0.86 : 1.0;
    this.kickPitch += kp * mul * (crouch ? 0.88 : 1) * (grounded ? 1 : 1.55);
    this.kickYaw += ky * mul * (crouch ? 0.88 : 1) * (grounded ? 1 : 1.55);

    // aim direction = camera forward, tilted by the aim-kick accumulator
    const c = this.ctx.camera;
    const pitch = (this.player ? this.player.pitch : 0) + this.kickPitch * DEG;
    const yaw = (this.player ? this.player.yaw : 0) - this.kickYaw * DEG;
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const dx = -Math.sin(yaw) * cp, dy = sp, dz = -Math.cos(yaw) * cp;
    void c;

    const o = this._muzzleOrigin(this._v2);
    this.magLeft--;
    const F = this._fireOpts;
    F.ox = o.x; F.oy = o.y; F.oz = o.z; F.dx = dx; F.dy = dy; F.dz = dz;
    F.weapon = 'cinder'; F.shotIndex = this.shotsFired; F.magLeft = this.magLeft;
    F.cone = cone; F.subT = subT; F.ads = ads; F.visualOnly = !!visualOnly;
    F.tracer = this._forceTracer;      // undefined = fall through to §4.4 cadence
    // §3.2: the sub-frame instant this round actually left the barrel. The
    // audio scheduler needs this, not the frame boundary.
    F.t = this.ctx.time.elapsed - subT;
    const shot = this.fireShot(F);
    this.shotsFired++;
    this.sinceShot = 0;
    this.bloom = Math.min(ads ? W.bloomAdsCap : W.bloomHipCap,
      this.bloom + (ads ? W.bloomAds : W.bloomHip));

    // §3.4 view kick — much larger than the aim kick, and a different channel
    if (this.player && this.player.addRecoil) {
      const vm = ads ? 0.55 : 1.0;
      this.player.addRecoil(kp * 1.6 * vm * DEG, ky * 1.4 * vm * DEG);
    }
    // §4.1 muzzle FX. weapons.js owns this properly; while it is a stub the
    // frame would otherwise contain a silent, flashless gun.
    if (this.knobs.muzzleFlashFallback && !this._stagingQuiet) {
      const vfx = this.vfx || (this.vfx = this.ctx.sys.vfx);
      // `o` is _v2 and `fireShot` used to clobber it via _applySpread — hence
      // the dedicated spread scratch. Re-read it here rather than trusting it.
      vfx?.muzzle?.({ pos: o.set(F.ox, F.oy, F.oz), dir: this._v.set(dx, dy, dz), power: ads ? 0.65 : 1.0 });
    }
    return shot;
  }

  /**
   * A burst, staged instantly, for a still frame.
   *
   * WHY THIS IS NOT JUST "FIRE N ROUNDS AND BACKDATE THEM BY THE RPM INTERVAL",
   * which is what it used to be and why `hipfire` and `combat` contained no
   * visible tracer at all. A round's tracer only exists between leaving the
   * 1.2 m hidden zone and landing, and at the §4.4 visual speed of 340 m/s a
   * 30 m shot is in flight for 88 ms. Backdating six rounds across a 420 ms
   * span therefore put five of them past their impact (faded 55 ms after
   * landing) and left the sixth at travel = 0, where `head - tail` is negative
   * and the quad is deliberately collapsed. Net: zero to one tracer on screen,
   * and the one was a 0.7 px sub-pixel line. Measured: staging a burst moved
   * meanLuma by 0.0003.
   *
   * So the ages are now derived from each round's OWN flight time to its OWN
   * impact point, distributed across the part of the flight where a tracer is
   * actually alive. The first round fired is furthest down-range (87% of its
   * flight), the last is just clear of the muzzle (13%), and every one of them
   * is visible. That is what a shipped screenshot of a burst looks like: a
   * string of streaks receding, not one flash at the barrel.
   */
  stageBurst(o = {}) {
    const rounds = o.rounds !== undefined ? o.rounds : 5;
    const spanMs = o.ms !== undefined ? o.ms : (rounds - 1) * (60000 / WEAPONS.cinder.rpm);
    this._staged = { rounds, ms: spanMs };
    this.burstShots = 0; this.kickPitch = 0; this.kickYaw = 0; this.bloom = 0;
    const now = this.ctx.time.elapsed;
    const speed = Math.max(1, this.knobs.tracerSpeed);
    // Every staged round gets a tracer. The §4.4 every-3rd cadence is right for
    // play but a still frame that happens to land on rounds 1,2 of a 3-cycle
    // shows nothing, and the review set must not be a coin flip.
    this._forceTracer = true;
    for (let i = 0; i < rounds; i++) {
      // One muzzle flash, on the youngest round. Six stacked flashes at one
      // point is 6x the §4.1 energy and clips to a white disc.
      this._stagingQuiet = (i < rounds - 1);
      const before = this._tracerN;
      this._fallbackFire(0, true);
      if (this._tracerN > before) {
        const p = ((this._tracerN - 1) % TRACER_MAX) * 4;
        const dist = Math.max(2.5, this._trParam[p + 1]);
        // i = 0 was fired first, so it is furthest along its flight
        const f = (rounds - i - 0.15) / (rounds + 0.7);
        this._trParam[p] = now - (f * dist) / speed;
        this._trParam[p + 3] = 0;
        this._trDirty = true;
      }
    }
    this._forceTracer = undefined;
    this._stagingQuiet = false;
    this._uploadTracers();
    return this._staged;
  }

  // ===========================================================================
  // MELEE — COMBAT_FEEL §3.2, built this round.
  //
  // Player, 2026-08-01: *"we likely need a melee button."* The same playtest
  // reported creatures leaping and closing constantly; at knife range the rifle
  // is the wrong tool and there was no other tool. At 130 damage this one-shots
  // a Skitter and a Bloomspitter, so it is a kill-feel feature: it exists to
  // resolve the fight that is already on top of you, and it gets the heaviest
  // confirmation in the game.
  // ===========================================================================

  /**
   * Apply the collision weapons.js already resolved. Bus dispatch is
   * synchronous, so setting `handled` here is an acknowledgement the weapon can
   * inspect before it considers its compatibility fallback.
   */
  _consumeWeaponMelee(e) {
    const cr = e?.actor;
    const p = e?.point;
    if (!cr || cr.dead || !(cr.hp > 0) || !p ||
        !Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) return false;

    const h = this._melHit;
    h.t = 0;
    h.x = p.x; h.y = p.y; h.z = p.z;
    h.nx = Number.isFinite(e?.normal?.x) ? e.normal.x : 0;
    h.ny = Number.isFinite(e?.normal?.y) ? e.normal.y : 1;
    h.nz = Number.isFinite(e?.normal?.z) ? e.normal.z : 0;
    h.kind = 'actor'; h.surface = e.surface || 'flesh';
    h.tag = e.zone || 'body'; h.zone = e.zone || 'body';
    h.actor = cr; h.creature = cr;
    // A rifle-butt strike is flat authored damage. It neither jackpots a weak
    // point nor glances off the carapace the way a bullet does.
    h.mult = 1; h.weak = false; h.armour = false;

    const origin = e.origin || this.ctx.camera.position;
    const d = this._melDir.set(p.x - origin.x, p.y - origin.y, p.z - origin.z);
    const dist = d.length();
    if (dist > 1e-5) d.multiplyScalar(1 / dist);
    else if (e.dir && Number.isFinite(e.dir.x) && Number.isFinite(e.dir.y) && Number.isFinite(e.dir.z)) d.copy(e.dir).normalize();
    else d.set(0, 0, -1).applyQuaternion(this.ctx.camera.quaternion);

    const hpBefore = cr.hp;
    const base = Number.isFinite(e.damage) && e.damage > 0 ? e.damage : MELEE.damage;
    const dealt = this._applyCreatureDamage(h, base, d.x, d.y, d.z, dist, false, true);
    const killed = dealt > 0 && cr.hp <= 0 && hpBefore > 0;
    e.damage = dealt;
    e.killed = killed;
    e.handled = true;

    const m = this.melee;
    m.hit = dealt > 0;
    if (dealt > 0) m.lastHitT = this.ctx.time.elapsed;
    if (killed) m.lastKillT = this.ctx.time.elapsed;

    const mi = this._meleeInfo;
    mi.phase = killed ? 'kill' : (dealt > 0 ? 'hit' : 'blocked');
    mi.x = p.x; mi.y = p.y; mi.z = p.z;
    mi.damage = dealt; mi.actor = cr; mi.kill = killed;
    mi.zone = h.zone; mi.surface = h.surface;
    this.ctx.bus.emit('combat:melee', mi);
    return true;
  }

  /**
   * Start a swing. PUBLIC — weapons.js may call this directly instead of, or as
   * well as, emitting `weapon:melee`; calling it latches nothing, so a weapons
   * implementation that drives its own animation off this call still works.
   * Returns true only if a swing actually started (it is not re-triggerable
   * inside its own 780 ms).
   */
  meleeStrike(o) {
    if (!this.knobs.melee) return false;
    const m = this.melee;
    if (m.phase !== 'idle' || m.cool > 0) return false;
    m.phase = 'windup'; m.t = 0; m.hit = false; m.swings++;
    const cam = this.ctx.camera;
    const mi = this._meleeInfo;
    mi.phase = 'swing'; mi.damage = 0; mi.actor = null; mi.kill = false;
    mi.zone = null; mi.surface = null;
    mi.x = cam.position.x; mi.y = cam.position.y; mi.z = cam.position.z;
    this.ctx.bus.emit('combat:melee', mi);
    // The whoosh. audio.js has no melee family yet (requested in HANDOFF); the
    // weapon-foley cloth layer pitched down is a real, wired stand-in and it is
    // better than silence on the one action whose windup has to be readable.
    const au = this.audio || (this.audio = this.ctx.sys.audio);
    if (au && au.buf && au.buf.cloth0) au.play('cloth0', { bus: 'weapons', gain: 0.55, rate: 0.72 });
    void o;
    return true;
  }

  /** Which key is asking. Retired for good once weapons.js emits a melee event. */
  _meleeKeyDown() {
    const i = this.input || (this.input = this.ctx.sys.input);
    if (!i) return false;
    if (typeof i.melee === 'boolean') return i.melee;            // input.js grew the binding
    if (i.synthetic && i.synthetic.melee !== undefined) return !!i.synthetic.melee;
    return !!(i.keys && i.keys.KeyV);                            // V is the convention
  }

  _updateMelee(dt) {
    const m = this.melee;
    if (m.cool > 0) m.cool = Math.max(0, m.cool - dt);

    if (this.knobs.melee && this.knobs.meleeFallback && !this._busMelee) {
      const key = this._meleeKeyDown();
      if (key && !this._prevMeleeKey) this.meleeStrike(null);
      this._prevMeleeKey = key;
    }

    if (m.phase === 'idle') return;
    m.t += dt;
    if (m.phase === 'windup') {
      if (m.t >= MELEE.windup) { m.phase = 'active'; m.t -= MELEE.windup; this._meleeTrace(); }
      return;
    }
    if (m.phase === 'active') {
      // The active window is 140 ms WIDE and it traces every frame inside it
      // until it connects. That is what lets a creature which is closing on you
      // walk into the swing — a single-frame trace at t=260 ms would miss
      // everything that was 0.3 m short when the frame was taken, and melee
      // against a charging target would feel broken for reasons no player could
      // articulate.
      if (!m.hit) this._meleeTrace();
      if (m.t >= MELEE.active) { m.phase = 'recover'; m.t -= MELEE.active; }
      return;
    }
    if (m.t >= MELEE.recover) { m.phase = 'idle'; m.t = 0; m.cool = MELEE.cooldown; }
  }

  /**
   * The arc. Centre ray first at `MELEE.range`; if it finds nothing, four
   * assist rays at ±`assistDeg` reach `assistRange`.
   *
   * TARGET assist, not AIM assist: it never touches the camera, it only widens
   * what the arc sweeps, so it cannot fight the player for the crosshair. Only
   * the CENTRE ray is allowed to hit the world — an assist ray landing on a
   * rock means the swing simply missed, and reporting that as a wall-hit would
   * make the assist read as a bug.
   */
  _meleeTrace() {
    const m = this.melee;
    if (m.hit) return false;
    const ph = this.physics || (this.physics = this.ctx.sys.physics);
    if (!ph) return false;
    const cam = this.ctx.camera;
    const ox = cam.position.x, oy = cam.position.y, oz = cam.position.z;
    const f = this._melDir.set(0, 0, -1).applyQuaternion(cam.quaternion);
    if (this._meleeCast(ox, oy, oz, f.x, f.y, f.z, MELEE.range, true)) return true;
    if (!this.knobs.meleeAssist) return false;
    const tn = Math.tan(MELEE.assistDeg * DEG);
    const FAN = MELEE_FAN;
    for (let i = 0; i < FAN.length; i++) {
      const r = this._melRay.set(FAN[i][0] * tn, FAN[i][1] * tn, -1)
        .normalize().applyQuaternion(cam.quaternion);
      if (this._meleeCast(ox, oy, oz, r.x, r.y, r.z, MELEE.assistRange, false)) return true;
    }
    return false;
  }

  _meleeCast(ox, oy, oz, dx, dy, dz, range, allowWorld) {
    // A swing is a swept volume, not a short bullet ray. Physics owns the
    // nearest-hit ordering between world, proxy actors, and enemies.js's
    // bone-driven capsules; the named primitive keeps that intent explicit and
    // removes the old hidden "is melee currently active?" bridge.
    const h = typeof this.physics.meleeCast === 'function'
      ? this.physics.meleeCast(ox, oy, oz, dx, dy, dz, range, this._melHit)
      : this.physics.raycast(ox, oy, oz, dx, dy, dz, range, PH.MASK.ALL, this._melHit);
    if (!h) return false;
    if (h.kind === 'actor' && (h.creature || h.actor)) {
      this._meleeConnect(h, dx, dy, dz);
      return true;
    }
    if (!allowWorld) return false;
    // A swing into the world. It gets the surface-typed impact and a physical
    // sound, and it gets NO hit marker — the HUD must never confirm a hit on
    // something that was not a target.
    this.melee.hit = true;
    this._scheduleImpact(h.x, h.y, h.z, h.nx, h.ny, h.nz, h.surface, h.t, false, true);
    const mi = this._meleeInfo;
    mi.phase = 'world'; mi.x = h.x; mi.y = h.y; mi.z = h.z;
    mi.damage = 0; mi.actor = null; mi.kill = false; mi.zone = null; mi.surface = h.surface;
    this.ctx.bus.emit('combat:melee', mi);
    return true;
  }

  _meleeConnect(h, dx, dy, dz) {
    const m = this.melee;
    m.hit = true; m.lastHitT = this.ctx.time.elapsed;
    const before = this.kills;
    let dealt = 0;
    if (h.creature) {
      dealt = this._applyCreatureDamage(h, MELEE.damage, dx, dy, dz, h.t, false, true);
    } else {
      const zmul = h.zone === 'head' ? 1.60 : (ZONE_MUL[h.zone] || 1);
      dealt = MELEE.damage * zmul;
      this._applyActorDamage(h, dealt, dx, dy, dz, h.t, false, true);
    }
    const kill = this.kills > before;
    if (kill) m.lastKillT = this.ctx.time.elapsed;
    const mi = this._meleeInfo;
    mi.phase = kill ? 'kill' : 'hit';
    mi.x = h.x; mi.y = h.y; mi.z = h.z;
    mi.damage = dealt; mi.actor = h.creature || h.actor;
    mi.kill = kill; mi.zone = h.zone || null; mi.surface = h.surface || 'flesh';
    this.ctx.bus.emit('combat:melee', mi);
    // The connect. `bodyThud` is the heaviest impact buffer audio.js has and it
    // is exactly the right weight for a rifle butt into chitin; a dedicated
    // melee family is requested in HANDOFF.
    const au = this.audio || (this.audio = this.ctx.sys.audio);
    if (au && au.buf && au.buf.bodyThud) {
      au.playAt('bodyThud', h.x, h.y, h.z, { bus: 'weapons', gain: kill ? 1.0 : 0.85, send: 0.10 });
    }
    return dealt;
  }

  // ===========================================================================
  // FRAME
  // ===========================================================================

  update(dt) {
    const now = this.ctx.time.elapsed;
    this.sinceShot += dt;

    // --- fallback trigger
    if (this.autoFireActive && this.input) {
      const W = WEAPONS.cinder;
      const interval = 60 / W.rpm;
      if (this.reloading > 0) {
        this.reloading -= dt;
        if (this.reloading <= 0) {
          const want = W.mag - this.magLeft;
          const take = Math.min(want, this.reserve);
          this.magLeft += take; this.reserve -= take;
          this.reloading = 0;
        }
      } else if (this.input.reload && this.magLeft < W.mag && this.reserve > 0) {
        this.reloading = this.magLeft > 0 ? W.reloadTac : W.reloadEmpty;
      } else if (this.input.fire && this.magLeft > 0) {
        // §3.2 — FLOAT accumulator, never a frame counter. 725 RPM is 4.966
        // frames; quantising it turns a rifle into a sewing machine.
        this.fireClock += dt;
        let guard = 0;
        while (this.fireClock >= interval && this.magLeft > 0 && guard++ < 4) {
          this.fireClock -= interval;
          this._fallbackFire(this.fireClock);
        }
      } else {
        this.fireClock = Math.min(this.fireClock + dt, interval);
        if (this.magLeft <= 0 && this.reserve > 0 && this.reloading <= 0) this.reloading = W.reloadEmpty;
      }
      // §3.4 recovery: 90 ms hold, then 72% comes back with a 130 ms half-life.
      // The residual MUST be snapshotted at the moment recovery starts. Deriving
      // it from the live accumulator every frame (`rest = kick * 0.28`) makes the
      // target chase the value down and the whole kick decays to zero — the gun
      // then silently auto-recentres and the recoil never mattered.
      if (this.sinceShot > this.knobs.recoilHoldMs * 0.001) {
        const keep = 1 - this.knobs.recoverFraction;
        if (this._restP === null) { this._restP = this.kickPitch * keep; this._restY = this.kickYaw * keep; }
        const k = Math.pow(0.5, dt / Math.max(1e-3, this.knobs.recoilHalfLife));
        this.kickPitch = this._restP + (this.kickPitch - this._restP) * k;
        this.kickYaw = this._restY + (this.kickYaw - this._restY) * k;
      }
      if (this.sinceShot > 0.110) {
        const kb = Math.pow(0.5, dt / (this.input.aim ? 0.140 : 0.180));
        this.bloom *= kb;
        if (this.bloom < 1e-3) this.bloom = 0;
      }
      if (this.sinceShot > 0.35) this.burstShots = 0;
    }

    // --- melee (§3.2). Runs regardless of who owns the trigger.
    this._updateMelee(dt);

    // --- ammo economy: nodes fall/home/collect, caches refill on approach.
    // Runs regardless of who owns the trigger — the economy serves both.
    this.killT += dt;
    this.pickupT += dt; this.cacheT += dt;
    this._updateDrops(dt);
    this._updateCaches(dt);

    // --- delayed impacts (>60 m) and the §4.9 kill chain
    if (this._pendLive) {
      for (let i = 0; i < this._pending.length; i++) {
        const p = this._pending[i];
        if (!p.live || now < p.t) continue;
        p.live = false; this._pendLive--;
        this._doImpact(p.x, p.y, p.z, p.nx, p.ny, p.nz, p.surface, p.power, p.decal);
      }
    }

    // --- feedback ageing
    if (this.marker.kind) {
      this.marker.t += dt;
      const t = this.marker.t;
      this.marker.phase = t < 0.060 ? ease.outQuad(t / 0.060)
        : t < 0.100 ? 1
          : t < 0.210 ? 1 - (t - 0.100) / 0.110 : 0;
      if (t > 0.210 + (this.marker.kind === 'kill' ? 0.05 : 0)) this.marker.kind = null;
    }
    for (let i = this.numbers.length - 1; i >= 0; i--) {
      this.numbers[i].t += dt;
      if (this.numbers[i].t > 0.900) this.numbers.splice(i, 1);
    }
    for (let i = this.hits.length - 1; i >= 0; i--) {
      this.hits[i].t += dt;
      if (this.hits[i].t > 3.84) this.hits.splice(i, 1);
    }
    for (let i = this.dirs.length - 1; i >= 0; i--) {
      this.dirs[i].t += dt;
      if (this.dirs[i].t > 1.10) this.dirs.splice(i, 1);
    }

    // --- health regeneration
    if (this.health > 0 && this.health < this.maxHealth && now - this.lastHitT > this.knobs.regenDelay) {
      this.regenerating = true;
      this.health = Math.min(this.maxHealth, this.health + this.knobs.regenRate * dt);
      if (this.health >= this.maxHealth) this.regenerating = false;
    }
  }

  lateUpdate() {
    const u = this._trU;
    u.uTime.value = this.ctx.time.elapsed;
    u.uSpeed.value = this.knobs.tracerSpeed;
    u.uLen.value = this.knobs.tracerLen;
    u.uWidth.value = this.knobs.tracerWidth;
    u.uGain.value = this.knobs.tracerGain;
    u.uMinPx.value = this.knobs.tracerMinPx;
    // Recomputed every frame, not cached at resize: `renderScale` changes the
    // backing-store height without a resize() call on this system, and the FOV
    // moves continuously through the whole ADS transition (§1.2). A stale
    // pxScale makes tracers thin out exactly when the player aims, which is the
    // one moment they are being looked at.
    const cam = this.ctx.camera;
    const hpx = Math.max(1, this.ctx.size.h * (this.ctx.quality.renderScale || 1));
    u.uPxScale.value = 2 * Math.tan(cam.fov * 0.5 * DEG) / hpx;
    if (this.tracerMesh) this.tracerMesh.visible = this.ctx.debug.flags.tracers !== false;
    if (this._trDirty) this._uploadTracers();
    this._renderDrops();
  }

  _uploadTracers() {
    const a = this._trAttr;
    if (!a) return;
    a.aO.needsUpdate = true; a.aD.needsUpdate = true; a.aP.needsUpdate = true;
    this._trDirty = false;
  }

  // ===========================================================================
  // HUD MODEL + HOUSEKEEPING
  // ===========================================================================

  /**
   * The HUD model. hud.js's header says combat.js wins over anything else for
   * these fields, so when weapons.js owns the trigger this has to forward
   * WEAPONS' numbers rather than the fallback gun's dormant counters — otherwise
   * the crosshair renders a cone the gun does not have and the ammo readout
   * counts down a magazine nobody is shooting.
   */
  hudState() {
    const w = this.ctx.sys.weapons;
    const driven = this._busTrigger || !!(w && w.ownsTrigger);
    const W = WEAPONS.cinder;
    const ads = this.input ? this.input.aim : false;
    const moving = this.player ? Math.hypot(this.player.vel.x, this.player.vel.z) > 1.4 : false;
    const base = ads ? (moving ? W.coneAdsMove : W.coneAds) : (moving ? W.coneHipMove : W.coneHip);
    let cone = base + this.bloom;
    let ammo = this.magLeft, reserve = this.reserve, reloading = this.reloading > 0;
    if (driven && w) {
      if (this._mirrorCone !== null) cone = this._mirrorCone;
      else if (typeof w.spreadDeg === 'number') cone = w.spreadDeg;
      if (typeof w.ammo === 'number') ammo = w.ammo;
      if (typeof w.reserve === 'number') reserve = w.reserve;
      if (w.state !== undefined) reloading = /reload/i.test(String(w.state));
    }
    return {
      marker: this.marker,
      numbers: this.numbers,
      hits: this.hits,
      dirs: this.dirs,
      health: this.health, maxHealth: this.maxHealth,
      regenerating: this.regenerating, lastHitT: this.lastHitT,
      ammo, reserve, reloading,
      cone,                             // the crosshair must render the REAL cone
      kickPitch: this.kickPitch, kickYaw: this.kickYaw,
      trigger: driven ? 'weapons' : 'combat-fallback',
      // --- ammo economy affordances (render requests filed in HANDOFF):
      reserveMax: RESERVE_MAX,
      lowAmmo: reserve <= 60,           // <= 2 mags — subtle warning tier
      reserveEmpty: reserve <= 0,       // unmissable tier: this gun is ending
      pickupT: this.pickupT,            // s since last pickup; pulse for ~0.4 s
      pickupRounds: this.pickupRounds,  // for a "+12" toast
      cacheT: this.cacheT,              // s since a cache refill (bigger confirm)
      dropsLive: this._dropsLive,
      // --- the confirmation chain (round 11). `marker` above already carries
      // zone / melee / strength / hpFrac / seq; these are the ROUND-level facts
      // a view needs that are not on one marker:
      killT: this.killT,                // s since the last kill
      killKind: this.killKind,          // 'shot' | 'head' | 'weak' | 'melee'
      killZone: this.killZone,
      kills: this.kills,
      meleePhase: this.melee.phase,     // 'idle'|'windup'|'active'|'recover'
      meleeT: this.melee.t,
      meleeSwings: this.melee.swings,
    };
  }

  /**
   * `__CB.resetAllTemporal()` runs AFTER gotoVista's 30 sim steps and wipes
   * every particle in vfx. A frame staged with `stageBurst` would therefore
   * photograph an empty landscape; re-staging here is what keeps a combat vista
   * honest rather than blank. Systems reset in registration order and vfx is
   * registered before combat, so its wipe has already happened when we run.
   */
  resetTemporal() {
    for (let i = 0; i < this._pending.length; i++) this._pending[i].live = false;
    this._pendLive = 0;
    this.numbers.length = 0; this.hits.length = 0; this.dirs.length = 0;
    this._restP = null; this._restY = null;
    this.marker.kind = null; this.marker.t = 0; this.marker.phase = 0;
    this.marker.zone = null; this.marker.melee = false;
    this.marker.strength = 1; this.marker.hpFrac = -1;
    this.melee.phase = 'idle'; this.melee.t = 0; this.melee.hit = false; this.melee.cool = 0;
    this.killT = 99;
    this._tracerN = 0;
    this._trParam.fill(0);
    if (this.tracerMesh) this.tracerMesh.geometry.instanceCount = 0;
    this._uploadTracers();
    if (this._staged) {
      const s = this._staged;
      this.magLeft = WEAPONS.cinder.mag;
      this.shotsFired = 0;
      this.stageBurst(s);
      // ONE re-stage per gotoVista. Left armed it would put a burst into every
      // subsequent vista in the review set, including `establish`.
      this._staged = null;
    }
  }

  /** Cancel a pending re-stage without firing one. */
  clearStage() { this._staged = null; }

  debugInfo() {
    return {
      shots: this.shotsFired, mag: this.magLeft, reserve: this.reserve,
      tracers: Math.min(TRACER_MAX, this._tracerN),
      pending: this._pendLive,
      autoFire: this.autoFireActive,
      trigger: (this._busTrigger || !!(this.ctx.sys.weapons && this.ctx.sys.weapons.ownsTrigger))
        ? 'weapons' : 'combat-fallback',
      health: +this.health.toFixed(1),
      kick: [+this.kickPitch.toFixed(3), +this.kickYaw.toFixed(3)],
      staged: this._staged,
      drops: this._dropsLive,
      reserveLive: this._reserveNow(),
      caches: this._cachesPlaced ? this.caches.length : 0,
      kills: this.kills,
      killKind: this.killKind,
      marker: { kind: this.marker.kind, zone: this.marker.zone, melee: this.marker.melee,
        hpFrac: +this.marker.hpFrac.toFixed(3), strength: +this.marker.strength.toFixed(2) },
      melee: {
        phase: this.melee.phase, swings: this.melee.swings,
        t: +this.melee.t.toFixed(3), driver: this._busMelee ? 'weapons' : 'combat-fallback',
      },
    };
  }

  dispose() {
    if (this.tracerMesh) {
      this.ctx.scene.remove(this.tracerMesh);
      this.tracerMesh.geometry.dispose();
      this.tracerMat.dispose();
    }
    if (this.dropMesh) {
      this.ctx.scene.remove(this.dropMesh);
      this.dropMesh.geometry.dispose();
      this.dropMesh.material.dispose();
    }
    if (this.dropGlow) {
      this.ctx.scene.remove(this.dropGlow);
      this.dropGlow.geometry.dispose();
      this.dropGlow.material.dispose();
    }
    if (this._cacheGroup) {
      this.ctx.scene.remove(this._cacheGroup);
      this._cacheCrateGeo.dispose(); this._cacheStripGeo.dispose(); this._cacheRodGeo.dispose();
      this._cacheCrateMat.dispose(); this._cacheGlowMat.dispose();
    }
  }
}
