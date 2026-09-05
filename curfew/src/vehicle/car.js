// vehicle/car.js — the car that finds you. System id 'car', M1+ manifest #19.
// Owner: vehicle. Files: src/vehicle/car.js, src/vehicle/carbody.js. Nothing else.
//
// THE CAR IS A BEAT, NOT A VEHICLE SPAWN (DESIGN decision 14). You never have to use it:
// every major is 600-750 m from its neighbour, which is 90-115 s at sprint, and the
// forest is legs country by construction. So the car does not sit on the map waiting to
// be found. When you are out on a road, far from anywhere lit, it comes down the road
// behind you with one headlight and stops. Nobody explains it.
//
// Three things this file is built around, in order of how much they matter:
//
//   1. Alex's brief: "It should feel nice and easy to do to drive, or to move." That is
//      why the kinematics are MOSSWAY's verbatim — MOSSWAY is a game whose entire
//      subject is driving through a forest and whose numbers were tuned by hand — and
//      why the controls are the four keys you already have your fingers on.
//   2. The arrival is heard before it is seen. The pilot drives the last 30 m
//      (CFG.car.spawn.pilotLast) and brakes to a stop, so the beat is an ENGINE getting
//      louder behind you, not a mesh appearing.
//   3. It is never safe. The engine is a 60 m noise event on the 'noise' bus every
//      0.4 s that it runs; the headlamp makes you visible far past what it lets you see.
//
// THREE FIXES ON PORT, each a real bug in the donor (DESIGN section 3, "The car"):
//   fix 1  Euler order YXZ on every composed pose. MOSSWAY builds a lookAt matrix so it
//          never hits this; a Three car with the default XYZ tilts the horizon the
//          moment you look sideways and up at the same time.
//   fix 2  The pose is INTERPOLATED between fixed steps. prev/curr + present(alpha).
//          This is the CINDERBLOOM teleport and it is the single most-repeated bug in
//          this catalogue (CONTRACT, "The loop").
//   fix 3  MOSSWAY scrubs `vehicle.speed *= 0.58` on a tree hit — donor
//          donors/mossway/game.js:1801, inside resolveTreeCollisions. It is PER FRAME and
//          it is the one frame-rate-dependent line in that file: at 144 fps the same
//          contact costs 2.4x more speed than at 60. Here it is
//          damp(speed, speed * CFG.car.treeHit.targetMul, CFG.car.treeHit.lambda, dt)
//          plus a heading nudge along the trunk, which is also what makes it SLIDE off
//          a trunk instead of stopping dead.
//
// THE LIGHT CENSUS IS PINNED (CONTRACT). This file creates no light, ever. The headlamp
// is `lights.setHeadlights(...)` — the one SpotLight the census allots to it — plus one
// borrowed rover for the warm pool at the lens. DESIGN asks for "two pooled headlight
// spots"; the census in CONTRACT allots exactly one SpotLight to the headlights and the
// census outranks it. See docs/HANDOFF.md.
//
// AND IT IS SWITCHED OFF AGAIN (audit blocker 1, fixed this round). The three
// _setHeadlights(true) sites had no _setHeadlights(false) anywhere in the file, so a
// single autonomous spawn pinned ctx.shared.lit at >= 0.52 for the rest of the session
// and inverted the whole "seeing is how you are seen" trade. There are now three ways it
// goes out: _beginExit, _forceRelease (death / respawn, unconditional), and the PARK
// COOL-DOWN in _stepIdle, which dims the filament over PARK_DARK_S while the block ticks
// and then drops the SpotLight — the arrival is a light coming toward you, the wait is a
// light going out, and then the woods come back.
//
// THE WHEEL BRANCH OF THE SKILL TREE IS WIRED HERE. progression/nodes.js declares four
// hook points whose `runner` is 'car' and every one of them names a call site in this
// file: 'hotwireS' (_beginEnter), 'ramClean' (_ram, round 6), 'onHorn' (_horn) and 'wearRepair'
// (_stepIdle's parked branch). Until this round none of them was ever called, so the whole
// branch was four cards that bought nothing. progress is read LAZILY through `_progress`,
// it is manifest #20 against our #19, and every call site works with it absent.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { clamp, clamp01, damp, dampAngle, lerp, ease, TAU } from '../engine/math.js';
import { ACTIONS } from '../engine/input.js';
import { MASK } from '../world/collision.js';
import { MAJORS } from '../world/placedata.js';
import { buildCarBody, buildDebrisGeometry, DEBRIS_VERTS, WHEEL_OFFSETS, WHEEL_RADIUS, ROOF_Y, DOOR, DOOR_HINGE, FOOTPRINT } from './carbody.js';

const K = CFG.car;
const SP = K.spawn;
const SEAT = K.seat;

/* ---------------------------------------------------------------------------
 * Locals config.js does not own yet. Each carries its donor or its reason; a
 * CFG.car block for them is requested in docs/HANDOFF.md.
 * ------------------------------------------------------------------------- */
const ON_ROAD_D = 5.7;            // [mossway game.js:1825] rd < 5.7 is "on the road"
const MAX_REV_ON = 7.0;           // [mossway game.js:1827-1828]
const MAX_REV_OFF = 4.5;
const CREEP_ON = 4.2, CREEP_OFF = 2.8;   // [mossway game.js:1832]
const HARD_BRAKE_LAMBDA = 8.5;    // [mossway game.js:1834] space
const STEER_LAMBDA = 7.0;         // [mossway game.js:1842] 0.15 s to 63% of lock, measured
const ROLL_LEAN = 0.023;          // rad of body lean at full lock and top speed (= MOSSWAY's
                                  // 0.66 lock * 0.035; the lock is a radius now, see _integrate)
// The pilot's proportional controller (PEACHFUL) was tuned against MOSSWAY's 0.18 rad/s of
// yaw at its 9.5 m/s cruise. The ROUND 5 lock gives 0.96 rad/s at that speed, so its command
// is scaled to the authority it was tuned with; measured, it still parks 1.4 m from its stop
// point with a peak yaw rate of 0.07 rad/s (tests/car.mjs; 0.08 on master).
const PILOT_STEER = 0.19;
// THE VIEW TURNS WITH THE CAR (verification round 1). cam.yaw is world-fixed aim and the
// seat only clamped it to heading +-1.48, so with a lock that turns 54 deg/s at 10 m/s a
// held turn with the mouse still swung the nose out of frame inside a second and pinned
// the view on the A-pillar (measured: 75 deg of lag at 1.5 s, the clamp engaged at 1.67 s).
// Now the heading delta of every driving step is carried into cam.yaw (_carryLook), so the
// mouse is an offset FROM THE NOSE, which is what MOSSWAY's "look added to the heading"
// meant. During the 0.35 s reparent the yaw is eased to the nose at this rate, so a player
// who walked up to the door facing the car does not take the seat looking at the passenger
// window: e^-(9 * 0.35) = 4% of the entry offset is left when the door shuts.
const ENTER_LOOK_LAMBDA = 9.0;
// Rim turns per radian of front-wheel angle: a 12:1 box, so full lock at rest (~19 degrees)
// is the ~200 degrees of rim MOSSWAY's 5.6 * 0.66 drew, and at 23 m/s the rim moves ~40.
const RIM_RATIO = 11.0;
const SAMPLE_FWD = 2.2, SAMPLE_SIDE = 1.25;   // [mossway game.js:1855-1856]
const TILT_LAMBDA = 5.2;          // [mossway game.js:1865-1866]
const BOB_LAMBDA = 8.0;           // [mossway game.js:1873]
const GROUND_LAMBDA = 12.0;       // [peachful vehicle.js:99] damp to ground, not snap
const HIT_COOLDOWN = 0.45;        // [mossway game.js:1809]

/* ---------------------------------------------------------------------------
 * THE ENTRY VERB, rewritten 2026-09-02 on Alex's first playtest.
 *
 * "I've made it to the car. i have no idea how to get into the car lol."
 *
 * He found it, he wanted it, he could not use it. The verb was "hold E for 0.4 s within
 * 2.2 m of the driver door" and nothing anywhere in the world said any part of that. The
 * project runs under a no-captions law and that law is right, but a rule against captions
 * is not a rule against making a verb DISCOVERABLE — so the fix is entirely in the world:
 *
 *   1. THE DOOR IS THE AFFORDANCE. carbody.js cuts a real aperture in the driver's flank
 *      and hangs a real hinged door in it. Parked, it stands ajar with a courtesy light on
 *      the card. A player who walks up to a car in a forest and sees an open driver's door
 *      with a light inside does not need a prompt.
 *   2. PROXIMITY ANSWERS. Inside ANSWER_RANGE the door swings the rest of the way open, the
 *      courtesy light comes up, and it creaks while it does it. He stood next to it and it
 *      did nothing at all; stillness reads as broken exactly the way silence does.
 *   3. THE HOLD IS GONE. A hold exists to stop an accidental entry and nobody accidentally
 *      walks into a car in a forest at night. It is a TAP now, at a radius generous enough
 *      that anywhere you can touch the car is somewhere you can get into it — and because
 *      there is no hold, there is no invisible progress bar to have to show.
 * ------------------------------------------------------------------------- */
// Measured to the driver's door, which sits a metre off the spine: 3.6 m from that point
// covers the whole driver's flank, both ends of the car and the far side of the bonnet.
const ENTER_RANGE = 3.6;
// ...and the belt-and-braces clause: anywhere within this of the car's own centre counts,
// so walking up to the passenger wing and pressing E is not a refusal for a reason nobody
// could see. 2.9 m is a metre past the widest part of the shell.
const ENTER_RANGE_CENTRE = 2.9;
// The door answers you from here. Deliberately much larger than the entry radius: the point
// is that the car reacts BEFORE you are close enough to use it, so the approach itself
// teaches that this thing is openable.
const ANSWER_RANGE = 9.0;
const ANSWER_LAMBDA = 4.2;        // how fast the door swings to its target
const DOOR_AJAR = 0.34;           // parked and nobody near: a hand's width of gap, and a
                                  // slice of the courtesy light showing through it
const REFUSE_RANGE = 16;          // press E further out than the entry radius and the car
                                  // still answers, once, with a handle rattle
const REPARENT = 0.35;            // DESIGN section 3: the camera moves, it never cuts
const EXIT_OFFSET = 1.20;         // DESIGN section 3: 1.2 m off the driver side
const EXIT_MAX_SPEED = 1.6;       // you cannot step out of a moving car; the refusal has a sound

const ENGINE_NOISE_R = 60;        // DESIGN section 3: "the engine is a 60 m disturbance"
const ENGINE_NOISE_EVERY = 0.40;
const COOL_TICKS = 5;             // the engine ticking as it cools, after an arrival
const COOL_GAP = 1.15;

const PILOT_CRUISE = 9.5;         // m/s the pilot holds on its approach
const PILOT_BRAKE_AT = 13.0;      // start shedding speed this far out
const PILOT_ARRIVE = 1.4;         // close enough: cut the engine

// THE RAM (round 6, lane H). CFG.car.ram carries the base speed (DESIGN section 3: 8 m/s,
// no node), the WHEEL node's clean-pop speed and the scrub-by-mass table; CFG.car.trunk the
// stuck-against-a-trunk escape. Both guarded with the shipped numbers, so a config block that
// has not merged yet still drives.
const RAM = K.ram || { speed: 8.0, cleanSpeed: 12.0, scrubLight: 0.15, scrubHeavy: 0.35, massLight: 46, massHeavy: 210, keepFloor: 0.40 };
const TRUNK = K.trunk || { stuckSpeed: 2.5, stuckRamp: 0.50, stuckGain: 0.45 };
const CONTACT_MEMORY = 0.12;      // s without a hit before a trunk contact counts as over
const RAM_RADIUS = 2.4;
const RAM_EVERY = 0.20;

// THE CRUSH (round 7, lane F). Alex, fifth playtest: "more towards the dying light driving
// expansion type style. Car that handles great. CAN CRUSH THINGS WITH IT."
//
// collision.js owns WHAT breaks and at what speed (BREAKABLE_TAGS, breakSpeed). This owns
// what it FEELS like, and the whole brief for that is one sentence of his: nothing floaty,
// "it zips right back to them in a fun way", never "plunk". So:
//   - the bite is proportional to the mass and it is small. A fence costs 8% of your speed,
//     a drum 15%, a waystone 29%, and a tick can never cost more than CRUSH_KEEP_FLOOR;
//   - a thing you clip OFF-CENTRE kicks the nose away from it, once, as an impulse — not a
//     per-frame torque, which would be frame-rate dependent (the MOSSWAY bug, fix 3);
//   - debris flies and settles, out of our own geometry (carbody.js buildDebrisGeometry);
//   - a thud goes out, and the camera takes a short knock.
// Nothing here stops the car. That is the difference between crushing a fence and hitting one.
const CRUSH = K.crush || {};
const CRUSH_R = CRUSH.radius || 1.30;        // the nose disc, a shade wider than the body
const CRUSH_LEAD = CRUSH.lead || 2.05;       // how far ahead of the axle centre it sits
const CRUSH_BAND_LO = -0.10;                 // relative to the car's y: the bumper's bottom
const CRUSH_BAND_HI = 1.55;                  // ...and the top of the bonnet line
const CRUSH_MASS_REF = CRUSH.massRef || 420; // the mass that would cost a full bite
const CRUSH_BITE_MIN = 0.03;
const CRUSH_BITE_MAX = 0.34;
const CRUSH_KEEP_FLOOR = CRUSH.keepFloor || 0.58;   // no single tick may cost more than this
const CRUSH_YAW_MAX = CRUSH.yaw || 0.16;     // rad of nose kick for a dead-off-centre heavy
// The kick is PAID OUT over about a fifth of a second, not written into the heading in one
// step. Two reasons and they agree: a single-frame heading jump is a discontinuity the eye
// reads as a teleport (and tests/car.mjs's jerk gate caught it at 0.60 deg against 0.45),
// and a shove that develops over seven frames is what being knocked sideways feels like.
// The total angle is identical; only its arrival is spread.
const CRUSH_KICK_LAMBDA = 13.0;
const CRUSH_TRAUMA = CRUSH.trauma || 0.46;   // camera knock at the heavy end, short
const CRUSH_WEAR = 0.010;                    // per kg/100: the county wears the car down too
const DEBRIS_POOL = 24;                      // pieces in flight at once; one mesh, one draw
const DEBRIS_LIFE = 2.2;                     // s before a piece is taken down
const DEBRIS_GRAV = 19.0;
const DEBRIS_BOUNCE = 0.28;

// BLOCKER 1. A parked car goes DARK, and the going-dark is a beat rather than a switch:
// the filament falls off over this while the block ticks itself cool, and when it reaches
// zero the census SpotLight goes out with it and the woods come back. Long enough that
// you can watch it happen from the treeline, short enough that a car that arrived and was
// never used stops lighting you up within one approach.
const PARK_DARK_S = 6.5;

// The warm pool the borrowed rover lays on the car's own nose. It is a local because the
// borrow() call and the cool-down scaling both need it and two literals that must agree is
// how they stop agreeing. A CFG.car.lamp block is requested in docs/HANDOFF.md.
const HEAD_POOL = 3.2;

// THE COURTESY LIGHT. A parked car finishes its cool-down completely dark (PARK_DARK_S
// above), which is correct for the headlamp — the beam is what makes you visible, and
// ctx.shared.lit is the whole "seeing is how you are seen" trade. But a car that goes
// COMPLETELY dark in a black forest is a car you cannot find and cannot read, and Alex
// found exactly that. So the beam still goes out and this stays: one borrowed rover, warm,
// weak, at the open door. At 2.4 candela against lights.js's LIT_ROVER_REF of 24 it adds
// about 0.05 to `lit` while you are standing in the doorway and nothing at all from 6 m —
// so it costs you something to stand there, which is the honest trade, and it never
// approaches the 0.52 the headlight beam was pinning it at.
const CABIN_POOL = 2.4;
const CABIN_BORROW_R = 30;        // m: past this the rover is released. The emissive strips
                                  // still draw, so the car keeps its warm line at distance.
const CABIN_LAMBDA = 3.0;

const HORN_NOISE_R = 46;          // the horn ITSELF, before any node makes it a lure
// A held horn repeats like a physical horn, but every new tap answers immediately. The old
// 1.6 s gate returned before reading input's one-step edge, permanently eating valid taps.
const HORN_REPEAT = 0.55;

// Wear. 0 is a car somebody looked after; 1 is one that will not do much more than crawl.
// It starts part-worn because it was already abandoned when it found you.
const WEAR_START = 0.15;
const WEAR_PER_IMPACT = 0.055;    // scaled by how much speed the contact actually cost
const WEAR_PER_RAM_HIT = 0.020;   // a body at speed dents a wing
const WEAR_SPEED_LOSS = 0.28;     // fraction of top speed a fully worn car has lost
const WEAR_LAMP_LOSS = 0.45;      // and the one working lamp browns out with it

const SPAWN_CHECK_EVERY = 0.50;   // the spawn rule is evaluated twice a second, not per frame
const SPAWN_COOLDOWN = 8.0;       // after a spawn or an exit, before another can be considered
const VIEW_CONE_COS = Math.cos(45 * Math.PI / 180);   // the 90 degree cone, half-angle

// DEFECT 2, MEASURED. The beat had never fired in a real session and the rule could not say
// why, because every clause returned void. Reproduced deterministically (kill the player,
// then teleport it to the one road point the suite picks): 96 consecutive checks, 43 refused
// 'player-dead' and 53 refused 'at-a-major', zero spawns, `car.pos` still (0,0,0) — which is
// the "573 m away" in the report, the distance from the origin to the Filling Station.
//
// The chain is: the player dies out on the loop -> controller.js:_respawn puts it at the
// nearest CLAIMED place, and the Filling Station starts claimed -> the player is now 0 m from
// a major -> `minPlayerToMajor` 120 vetoes every check for the rest of the life. Die once and
// the car never comes again until you have walked 120 m, which is not a rule anybody wrote.
//
// Three things below fix it, and none of them conjures a car at a door:
//
//   OWED.  The gates are evaluated in position order and `dead` is tested LAST, so a check
//          that got all the way to a living-player test knows the player was eligible. That
//          dispatch is then OWED: dying does not un-send a car that was already coming. It
//          is redeemed on the first check after the respawn — which is the only clause that
//          is allowed past the major gate, and only once, and only inside OWED_TTL.
//   RECALL. This file's own header promises ">300 m away or lost ... is how you never have to
//          walk back to where you left it". It never did: a lost car parked 1.4 km away was
//          vetoed by the same major gate. A recall is not a new beat, so it skips it too.
//   YARD.  Both of those can now aim a car at a player standing in a lit yard, so the STOP
//          POINT gets a clearance it never had. The old rule gated the PLAYER at 120 m and
//          the car at nothing, so it would happily park 30 m inside Ashfall's 46 m yard.
const OWED_TTL = 60;              // s. A dispatch earned before a death does not wait forever.
const YARD_CLEAR = 16;            // m past a major's own radius. The car parks OUT of the yard.
const RELAX_CONE_MIN = 65;        // m. Last-resort candidates may be ahead, but only this far
                                  // out — at 65 m in this fog a cold, dark car is not visible,
                                  // and the pilot still drives the last 30 m so you hear it.

// ROUND 13: PARKING IS NOT THE ARRIVAL BEAT. A fresh session parks the car cold at the road
// stop nearest the start before the first spawn check, and a respawn re-parks it at the stop
// nearest where you came back. Alex, seventh playtest: "The button for the car doesn't work
// right away. the car seems to spawn after the start of the game" — measured, the car did not
// exist until the player had walked 54 m out of the station yard, and L and both car buttons
// sat dashed and dead for the first ten seconds of every session. And: "make sure the car
// respawns at the road closest to you if you die" — it did not: anything closer than the 300 m
// recall stayed where it was, including the wreck you died in 180 m down the road.
// A park clears the flat by PARK_CLEAR, not YARD_CLEAR: at 54 m the car is a speck from the
// forecourt; at the works-cut stop 42 m from the centre and 25 m from the start it is a car.
const PARK_CLEAR = 4;             // m past a major's flat for a park
const PARK_MIN = 12;              // m. Never on top of the player
const RESPAWN_CAR_KEEP = 60;      // m. A car closer than this to where you come back stays put;
                                  // the nearest legal stops are 34-57 m from every major centre
// ROUND 13: the key glyphs. E on the driver's door while the seat is in reach; H at the wheel
// hub for the first seconds in the seat until the horn has been used once this session.
// Alex: "maybe looking at the horn in the car lets you see how to use it the same way."
const HORN_TEACH_S = 6.0;
const _promptP = { kind: 'use', x: 0, y: 0, z: 0, k: 0, label: 'E' };
const _hubV = new THREE.Vector3();

// ROUND 6, LANE H — THE FOV HAS ONE OWNER. This file used to write cam.fov itself in
// present(), comparing against its own last write (an epsilon of 0.02) so as not to fight
// player/camera.js, which writes cam.fov every frame. Measured with tools/carsmooth.mjs on the
// round-5 build: the camera's write won on every frame the car's target had not moved by more
// than the epsilon, so at a HELD speed the speed FOV was simply absent (68) and it reached the
// screen only while the speed was changing — a 6.7 / 10.2 / 13.0 degree second difference at
// 12 / 18 / 23 m/s, the one presentation-side jitter the table found. Now the car never
// touches cam.fov: _driveFov hands the camera a speed term in the STEP through
// camera.setFovBias(), and the camera's single damped fovNow clock (CFG.camera.fovDamp)
// carries it to the screen.

/* Module scratch. The hot path allocates nothing (CONTRACT). */
const _v = new THREE.Vector3();
const _fwd = new THREE.Vector3();
const _org = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _e = new THREE.Euler(0, 0, 0, 'YXZ');
const _s = new THREE.Vector3(1, 1, 1);
const _pos = new THREE.Vector3();
// ROUND 7, lane F: the 'world:broke' payload. Module scratch, written in place and emitted;
// a listener must read it synchronously and never retain it (the same contract as
// controller.js's player:climb payload).
const _brokePayload = { x: 0, y: 0, z: 0, mass: 0, n: 0, tag: null, by: 'car' };   // ROUND 13: `by`

function wrapAngle(a) {
  a = a % TAU;
  if (a > Math.PI) a -= TAU;
  if (a < -Math.PI) a += TAU;
  return a;
}
/** shortest signed angle from a to b */
function angleDelta(a, b) { return wrapAngle(b - a); }

/**
 * ROUND 7, lane F. Collapse one bracketed part of a merged site geometry onto its own
 * centroid. Every triangle in [v0, v1) becomes degenerate and stops covering a pixel;
 * nothing outside the range moves, so the rest of the site is untouched. Returns the
 * part's top in the geometry's own frame, which is where the debris starts.
 *
 * The range comes from sites.js's Kit.open()/close() and rides on the geometry as
 * `userData.breakParts` — see the note there.
 */
function collapsePart(geo, part) {
  const attr = geo.attributes.position;
  const arr = attr.array;
  const v0 = part.v0, v1 = Math.min(part.v1, attr.count);
  if (!(v1 > v0)) return 0;
  let cx = 0, cy = 0, cz = 0, top = -Infinity;
  for (let v = v0; v < v1; v++) {
    const k = v * 3;
    cx += arr[k]; cy += arr[k + 1]; cz += arr[k + 2];
    if (arr[k + 1] > top) top = arr[k + 1];
  }
  const n = v1 - v0;
  cx /= n; cy /= n; cz /= n;
  for (let v = v0; v < v1; v++) {
    const k = v * 3;
    arr[k] = cx; arr[k + 1] = cy; arr[k + 2] = cz;
  }
  attr.needsUpdate = true;
  return top;
}

export class Car {
  static id = 'car';

  constructor(ctx) {
    this.ctx = ctx;

    // ---- simulation pose (MOSSWAY's vehicle record, in Three's basis)
    this.x = 0; this.y = 0; this.z = 0;
    this.heading = 0;
    this.speed = 0;
    // ROUND 13: a take-down asked for by someone else (combat.js) throws its debris along a
    // direction of their choosing instead of the car's own heading and speed.
    this._debDir = false; this._debX = 0; this._debZ = 0; this._debSpd = 0;
    this.steer = 0;
    this.pitch = 0;
    this.roll = 0;
    this.bob = 0;
    this.travel = 0;
    this.wheelRot = 0;
    this.hitCooldown = 0;
    this.lockNow = 0;       // the wheel angle at full lock for the current speed (_integrate)

    // ---- fix 2: prev/curr, lerped by present(alpha). Nothing else may draw the car.
    this.prevX = 0; this.prevY = 0; this.prevZ = 0;
    this.prevHeading = 0; this.prevPitch = 0; this.prevRoll = 0; this.prevBob = 0;
    this.prevWheelRot = 0; this.prevSteer = 0;
    // The door and the courtesy light are simulation state like everything else: they are
    // stepped, they keep prev/curr, and present() lerps them. A door that snapped between
    // fixed steps would be the CINDERBLOOM teleport on the one part of this prop the
    // player is being asked to read.
    this.doorA = 0; this.prevDoorA = 0;
    this.cabin = 0; this.prevCabin = 0;
    this.cabinHandle = null;
    this._creaked = false;        // the swing-wide creak fires once per approach

    // ---- ROUND 7, lane F: the crush. Allocated on the FIRST break, never at boot: a
    // page that never drives through anything never pays for the mesh or the arrays.
    this._deb = null;
    this._crushLast = { n: 0, mass: 0, before: 0, after: 0, keep: 1, tag: null, yaw: 0 };
    this.crushCount = 0; this.crushMass = 0;   // lifetime, for the instruments
    this.kickOwed = 0;         // radians of nose kick still to be paid out (see _payKick)
    this._useConsumed = false;    // a held key acts on its first frame and then shuts up

    // ---- lifecycle
    this.exists = false;
    this.mode = 'none';    // none | arriving | idle | entering | driving | exiting
    // ROUND 13: parked on the first step of a fresh session (see step()), and a parked
    // beacon keeps its one lamp lit past the park cool-down until somebody walks up.
    this._freshParked = false;
    this.beacon = false;
    this._seatS = 0;              // ROUND 13: seconds spent in the seat this session
    this.hotwired = false;  // reset by every spawn: the first entry is always a hotwire
    this.engineOn = false;
    this.headlightsOn = false;
    // 0..1 filament level for the ONE working lamp. `headlightsOn` is the census
    // SpotLight's switch and is a boolean because lights.setHeadlights is; this is the
    // continuous part, and it is what makes the park cool-down a dim and not a cut.
    this.lampFade = 0;
    // How beaten the car is, 0..1. Costs top speed and browns the lamp; the WHEEL branch's
    // 'Keep' node is the only thing in the game that takes any of it back.
    this.wear = WEAR_START;

    // ---- timers, all dt-scoped. No setTimeout anywhere (CONTRACT).
    this.holdT = 0;
    this.enterT = 0;
    this.hotwireT = 0;
    this.crankPips = 0;
    this.coolT = 0;
    this.coolLeft = 0;
    this.spawnCheckT = 0;
    this.spawnCooldown = 2.0;
    // Built once in init: every authored destination with the physical radius of the
    // flat they occupy. The twice-a-second spawn sweep must neither allocate nor fall back
    // to roads.sites(), which contains only the three legacy M0 terrain discs.
    this._spawnSites = null;
    // The dispatch the player earned and then died before it landed. See OWED above.
    this.owed = false;
    this.owedT = 0;

    // THE REFUSAL LEDGER. A rule that silently declines is indistinguishable from a rule
    // that never runs, and this one declined silently for three rounds. Preallocated and
    // written in place: _considerSpawn is on the fixed step and allocates nothing. The
    // director exposes a refusal count for the same reason; this exposes the reason too.
    this._dbg = {
      checks: 0, spawns: 0,
      why: 'never-ran',           // the reason the LAST check gave
      inCar: 0, noSystems: 0, atMajor: 0, noRoad: 0, carIsHere: 0, playerDead: 0,
      noCandidate: 0, ok: 0,
      // what the last check actually measured, so a number can be argued with
      playerRoad: -1, nearestMajor: -1, carDist: -1,
      // what the last candidate sweep saw
      bearings: 0, coneRejects: 0, roadMisses: 0, bandRejects: 0, yardRejects: 0,
      relaxed: false, bestScore: 0,
    };
    this.noiseT = 0;
    this.ramT = 0;
    this.hornT = 0;
    this.hornHeld = false;
    this.hornCount = 0;
    this.hornSoundCount = 0;
    // A horn press is still a real world/progression event if audio is waking from autoplay
    // suspension. Owe at most ONE audible answer and settle it on the first runnable step;
    // a boolean cannot grow into a queue of stale voices while the tab is asleep.
    this.hornSoundPending = false;
    // The hotwire length the WHEEL branch actually granted for THIS entry. The crank pips
    // are spaced off it, so a half-second hotwire still gets three of them.
    this.hotwireTotal = K.hotwire;
    this.refuseLatch = false;
    this._cruise = null;          // test door, see setCruise()

    // ---- pilot
    this.pilotX = 0; this.pilotZ = 0;
    // The winning stop point _findStop wrote. Fields, not a returned Vector2: the sweep
    // runs twice a second on the fixed step and the hot path allocates nothing.
    this._stopX = 0; this._stopZ = 0;
    this._stopTx = 0; this._stopTz = 1;   // ROUND 13: the road tangent at a PARK stop

    // ---- camera reparent
    this.fromX = 0; this.fromY = 0; this.fromZ = 0;
    // The speed term this file last handed the camera (camera.setFovBias, round 6). Kept
    // only so state() can report it: the camera owns cam.fov outright.
    this.fovBias = 0;
    // The trunk escape (round 6): seconds spent slow, throttle held, against a trunk.
    this.stuckT = 0;
    this._throttle = 0;
    // Which way the car slides off the trunk it is touching: +1 / -1, chosen once per
    // contact and kept until the contact ends (0 = no contact). See _resolveContacts.
    this._slideSide = 0;
    this._sinceHit = 99;
    // The last ram, for state() and tests/car.mjs. Written in place on the fixed step.
    this._ramLast = { hits: 0, n: 0, mass: 0, before: 0, after: 0, keep: 1, clean: false };

    // ---- the carry (see _carryPlayer). `_carried` is what WE asked for; the player lane
    // owns whether it took, and owns player:died / player:respawn (integrator decision 3).
    this._carried = false;
    this._carrySeated = false;   // the one-frame placement has happened for this entry

    // ---- render
    this.body = null;
    this.headHandle = null;
    this._roofColliders = [-1, -1, -1];
    this._roofPlaced = false;

    // ---- the 'use' action. engine/input.js has no 'use' in ACTIONS yet (requested in
    // docs/HANDOFF.md), so this shim binds KeyE through input's OWN _down/_up — the same
    // door the DOM listeners use, never a second source of truth — and removes itself
    // the moment engine adds the action.
    this._ownsUseKey = false;
    this._synthUse = false;
    this._synthHorn = false;
    this._onKeyDown = null;
    this._onKeyUp = null;

    this.rng = null;
  }

  /**
   * World position, for anyone who wants to measure to the car (tests/world-game.mjs
   * reads `s.pos`). A preallocated object filled on read — a getter that allocated a
   * Vector3 would be a per-frame garbage source for every caller who polls it.
   * COPY IT; the next read overwrites it.
   */
  get pos() {
    const o = this._posOut || (this._posOut = { x: 0, y: 0, z: 0 });
    o.x = this.x; o.y = this.y; o.z = this.z;
    return o;
  }

  // Siblings are read LAZILY, at use, never captured at construction: construction order
  // is manifest order and VIGIL's combat.js got `undefined` for exactly this.
  get _terrain() { return this.ctx.systems.get('terrain'); }
  get _roads() { return this.ctx.systems.get('roads'); }
  get _collision() { return this.ctx.systems.get('collision'); }
  get _player() { return this.ctx.systems.get('player'); }
  get _camera() { return this.ctx.systems.get('camera'); }
  get _lights() { return this.ctx.systems.get('lights'); }
  get _fx() { return this.ctx.systems.get('fx'); }
  get _enemies() { return this.ctx.systems.get('enemies'); }
  get _input() { return this.ctx.input || this.ctx.systems.get('input'); }
  // The WHEEL branch of the skill tree. progress is manifest #20 and we are #19, so it
  // does not exist when this file is constructed and it may not exist at all in a
  // stripped test build — every read of it is lazy, at use, behind a guard, and every
  // call site below still does the right thing when it returns undefined.
  get _progress() { return this.ctx.systems.get('progress'); }
  get _audio() { return this.ctx.systems.get('audio'); }

  async init() {
    this.rng = this.ctx.rng ? this.ctx.rng.fork('car') : null;
    this._spawnSites = this._buildSpawnSites();

    // ctx.shared does not exist in the M0 ctx bag; CONTRACT says it must, and it is a
    // flat bag of scalars. Create it if absent, then own exactly one key.
    if (!this.ctx.shared) this.ctx.shared = {};
    this.ctx.shared.inCar = false;

    this.body = buildCarBody(this.rng ? this.rng.fork('body') : null);
    this.body.root.visible = false;
    // ctx.scene is read here and not in the constructor: the viewmodel attached its
    // brass pool before gfx had made the scene and ran a whole system on an orphan.
    const scene = this.ctx.scene;
    if (!scene) throw new Error('car: ctx.scene missing (gfx must be manifest #1)');
    scene.add(this.body.root);

    // LISTEN, NEVER EMIT (integrator decision 3): player/controller.js owns player:died
    // and player:respawn and clears its own dead flag. This file only has to let go —
    // without this, a death at 20 m/s leaves the body frozen in a seat it can never get
    // out of, and the respawn puts the player straight back into the car.
    const bus = this.ctx.bus;
    if (bus && bus.on) {
      bus.on('player:died', () => this._forceRelease());
      bus.on('player:respawn', (p) => {
        const wasIn = this._forceRelease();
        // ROUND 13: THE CAR COMES BACK TO THE ROAD NEXT TO YOU. Any car further than
        // RESPAWN_CAR_KEEP from where you came back, or the one you died in, is re-parked at
        // the nearest legal stop — measured before this: a car 180 m away stayed put through
        // 76 'car-is-here' checks with the L arrow pointing at the walk. A car already in
        // the yard stays. A death is not a beat, so no beacon and no pilot.
        const pl = this._player;
        const px = p && Number.isFinite(p.x) ? p.x : (pl ? pl.pos.x : this.x);
        const pz = p && Number.isFinite(p.z) ? p.z : (pl ? pl.pos.z : this.z);
        const d = this.exists ? Math.hypot(this.x - px, this.z - pz) : Infinity;
        if ((!this.exists || wasIn || d > RESPAWN_CAR_KEEP)
            && this._nearestStop(px, pz, PARK_CLEAR, PARK_MIN)) {
          this._park(this._stopX, this._stopZ, this._stopTx, this._stopTz, false);
          this.owed = false; this.owedT = 0;
          return;
        }
        // Redeem an owed dispatch on the FIRST step after the respawn, not up to half a
        // second later. controller.js:_respawn drops the player into the nearest claimed
        // place, so this is exactly the frame the old rule started refusing forever.
        this.spawnCheckT = 0;
        this.spawnCooldown = Math.min(this.spawnCooldown, 0);
      });
    }

    this._bindUse();
  }

  ready() {
    return !!(this.body && this.body.root && this.body.root.parent);
  }

  /* ------------------------------------------------------------------ input */

  _bindUse() {
    if (typeof window === 'undefined') return;
    // The two actions are checked SEPARATELY. The old single guard bailed on the whole
    // binding the moment engine adopted 'use', which would have taken the horn with it —
    // exactly the silent half-failure this project keeps finding.
    const has = (a) => !!(ACTIONS && ACTIONS.indexOf && ACTIONS.indexOf(a) >= 0);
    const ownsUse = has('use'), ownsHorn = has('horn');
    if (ownsUse && ownsHorn) return;                       // engine owns both now
    const inp = this._input;
    if (!inp || typeof inp._down !== 'function' || typeof inp._up !== 'function') return;
    // KeyE is the door, KeyH is the horn. Both go through input's OWN _down/_up — the
    // same door the DOM listeners use, never a second source of truth — so the edge
    // bookkeeping (_pressed, _latch, the deferred release) is input's, not ours.
    const act = (code) => {
      if (code === 'KeyE') return ownsUse ? null : 'use';
      if (code === 'KeyH') return ownsHorn ? null : 'horn';
      return null;
    };
    this._onKeyDown = (ev) => {
      if (ev.repeat) return;
      const a = act(ev.code);
      if (!a) return;
      const i = this._input; if (i && i.enabled !== false) i._down(a);
    };
    this._onKeyUp = (ev) => {
      const a = act(ev.code);
      if (!a) return;
      const i = this._input; if (i) i._up(a);
    };
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup', this._onKeyUp);
    this._ownsUseKey = true;
  }

  /** Test door: drive the hold without a keyboard. __CURFEW can call car.setUse(true). */
  setUse(on) { this._synthUse = !!on; }

  /** Test door: one honk, consumed by the next step. */
  honk() { this._synthHorn = true; }

  /**
   * Test door: pin the speed at `v` m/s (null to let go). The steering integrator, the
   * contacts and the tilt all run exactly as they do in play; only the speed clamp at the
   * end of _integrate is overridden. tests/car.mjs measures the full-lock radius with this,
   * because a circle leaves the road inside a second and the off-road cap then makes
   * "hold 22 m/s" impossible through the throttle. Never set from game code.
   */
  setCruise(v) { this._cruise = (typeof v === 'number' && Number.isFinite(v)) ? v : null; }

  /**
   * warm(): link every program the car will ever need behind the title fade (verification
   * round 1). main.js warm() reveals every hidden object, calls each system's warmup() in
   * manifest order, and post (manifest 101, after us) renders ONE real frame through the
   * composer with everything revealed; then it hides everything again and renders the
   * first real frame. Two of the car's programs were missing from that warm frame, both
   * measured on master 24d5101 with tests/artifacts/probe-programs-D.mjs:
   *
   *   1. the shadow-DEPTH variants of curfew-car (car-shell, car-door-panel, and the
   *      INSTANCED car-wheels): the moon is not placed until lights.present() runs, so in
   *      the warm frame its shadow box is the DirectionalLight default — at (0, 1, 0)
   *      looking straight down at the origin, near 1: the box is y <= 0 within 70 m of
   *      the origin — and the body stood at (0, 0, 0) with its wheels above the plane.
   *      programs 71 -> 72 the moment _place()/placeAt() made the body visible.
   *   2. the INSTANCED main variant of curfew-car (the wheels' HDR program): renderer
   *      compile() links the SCREEN variants of both (it is called with no target bound),
   *      but the play variants link only when the composer's frame draws the mesh into
   *      the HDR buffer, and the wheels at (0, 0, 0) are 1.7 m straight below the warm
   *      camera at (0, 1.68, 0): outside a 68 degree frustum. 72 -> 73 thirteen seconds
   *      into a drive.
   *
   * So for the warm frame the body stands 6 m ahead of the camera, its root 1 m below
   * the moon target's level: every part of it is in the camera's frustum, and its lower
   * half is inside the shadow box, degenerate or real (the target is on the box's axis).
   * The car is not placed, no event fires, present() early-returns while !exists, and
   * the next _sync() puts the root where the car is.
   *
   * MEASURED, both builds, tests/artifacts/probe-progs3.mjs (2026-09-03), as
   * ready / after the title card's own frames / on foot / car placed / seated / after 20 s:
   *   master 24d5101:  68 / 71 / 71 / 72 / 72 / 73     — two link during play
   *   this branch:     71 / 74 / 74 / 74 / 74 / 74     — none link during play
   * The three that link at ready are the car's, linked here. The three the title card links
   * are the same three on both builds and are not the car's; the title card is not play.
   * tests/car.mjs asserts all of it: nothing links from the title onward, across placeAt,
   * the walk to the door, the seat and a 20 s drive. If a lane moves the moon before warm()
   * one day, those checks are the tripwire.
   */
  warmup() {
    if (!this.body) return;
    const L = this._lights;
    const moon = L && L.moon;
    const t = moon && moon.target ? moon.target.position : null;
    const cam = this.ctx.camera;
    if (!cam) return;
    _v.set(0, 0, -1).applyQuaternion(cam.quaternion);
    const x = cam.position.x + _v.x * 6.0, z = cam.position.z + _v.z * 6.0;
    const y = (t ? t.y : 0) - 1.0;
    this.body.root.position.set(x, y, z);
    this.body.root.rotation.set(0, 0, 0, 'YXZ');
    this.body.root.updateMatrixWorld(true);
    // And one real render of the scene into post's HDR buffer, right here, with the body
    // standing there. Moving the body alone was not enough — the depth variants still
    // linked at placeAt; this render links them too, and after it nothing links at
    // placement, at the door, in the seat or over the suite's 20 s drive (the table above
    // is the measurement). It is one extra frame behind the title fade, drawn into the same
    // target the composer's RenderPass draws into, so every program it links is a program
    // play uses — never a screen variant. Why the composer's own warm frame does not draw
    // the shadow pass for these casters was not found; this render is measured to, and the
    // suite's program checks are the tripwire either way.
    const R = this.ctx.renderer, post = this.ctx.systems.get('post'), scene = this.ctx.scene;
    if (R && scene) {
      const prev = R.getRenderTarget();
      const target = post && typeof post.hdrTarget === 'function' ? post.hdrTarget() : null;
      R.setRenderTarget(target);
      R.render(scene, cam);
      R.setRenderTarget(prev);
    }
  }

  _useHeld() {
    if (this._synthUse) return true;
    const i = this._input;
    return !!(i && i.held && i.held('use'));
  }

  /** A rising edge on the horn. `pressed` is cleared by input.endStep, so this is read
   *  in the fixed step exactly once per press. */
  _hornPressed() {
    if (this._synthHorn) { this._synthHorn = false; return true; }
    const i = this._input;
    return !!(i && i.pressed && i.pressed('horn'));
  }

  _hornHeld() {
    const i = this._input;
    return !!(i && i.held && i.held('horn'));
  }

  _axis(neg, pos) {
    const i = this._input;
    if (!i || !i.held) return 0;
    return (i.held(pos) ? 1 : 0) - (i.held(neg) ? 1 : 0);
  }

  /* ------------------------------------------------------------------- bus  */

  _emit(ev, payload) { if (this.ctx.bus) this.ctx.bus.emit(ev, payload); }

  /**
   * Every sound in this file goes out on the 'noise' bus with a `source` string.
   * There is no audio system yet (manifest 21, another lane) and CONTRACT forbids
   * inventing a local channel, so 'noise {x, z, radius, source}' carries both jobs:
   * it is what the director hears AND it is the cue audio will key on. Silence reads
   * as broken, so the refusals emit too — see docs/HANDOFF.md.
   */
  _noise(source, radius, x, z) {
    if (!this.ctx.bus) return;
    this.ctx.bus.emit('noise', {
      x: x === undefined ? this.x : x,
      z: z === undefined ? this.z : z,
      radius, source,
    });
  }

  /**
   * MEASURED THIS ROUND, and it is the reason "he stood next to it and it did nothing":
   * NOTHING IN THIS FILE HAS EVER MADE A SOUND. Every beat the car has — the arrival, the
   * door creak, the refusal, the crank, the horn, the impact — went out on the 'noise'
   * bus, and the only listener on that channel in the whole game is director/director.js
   * (`director.js:377`). audio.js subscribes to `car:entered` / `car:exited` and to nothing
   * else this file emits. So the car was audible to the AI and inaudible to the player, on
   * a beat whose own header says "the arrival is heard before it is seen".
   *
   * `audio.dread(kind, x, y, z, gain)` is the audio lane's public, pooled, HRTF-panned,
   * occlusion-tested door — `audio.js:1168` — and `DREAD.door` is a real baked door creak
   * (`audio.js:463`, `dr_door`). It is a stand-in and it is honest about being one: proper
   * car foley (a latch, a starter, an idle) is requested from the audio lane in
   * docs/HANDOFF.md. Silence reads as broken, and a stand-in that plays beats a request
   * that has not landed yet.
   *
   * Every call still emits on 'noise' as well — that is what the director hears, and the
   * two jobs are not the same job.
   */
  _say(kind, gain, x, y, z) {
    const a = this._audio;
    if (!a || typeof a.dread !== 'function') return;
    a.dread(kind,
      x === undefined ? this.x : x,
      y === undefined ? this.y + 1.0 : y,
      z === undefined ? this.z : z,
      gain === undefined ? 1 : gain);
  }

  /* ---------------------------------------------------------------- spawning */

  /**
   * One stable no-spawn table for every authored destination. `MAJORS` owns the current
   * centres and most flat radii; the Filling Station and Ashfall reuse two older road-flat
   * discs, so those two radii are resolved by flatId from roads.sites(). Allocates once at
   * init, never in the fixed-step spawn sweep.
   */
  _buildSpawnSites() {
    const roads = this._roads;
    const legacy = roads && typeof roads.sites === 'function' ? roads.sites() : null;
    const out = new Array(MAJORS.length);
    for (let i = 0; i < MAJORS.length; i++) {
      const d = MAJORS[i];
      let radius = d.flat && Number.isFinite(d.flat.radius) ? d.flat.radius : 0;
      if (!(radius > 0) && d.flatId && legacy) {
        for (let j = 0; j < legacy.length; j++) {
          if (legacy[j].id === d.flatId) { radius = legacy[j].radius || 0; break; }
        }
      }
      // Every shipping row has flat.radius or flatId. These fallbacks make a malformed future
      // row conservative rather than turning a destination centre into legal spawn ground.
      if (!(radius > 0)) radius = d.clearR || d.nearR || d.discoverR || 0;
      out[i] = { id: d.id, x: d.x, z: d.z, radius };
    }
    return out;
  }

  /**
   * THE SPAWN RULE, which is the whole design idea. On foot, out past every destination yard,
   * within 60 m of a road, and the car >300 m away or lost: put it on the road 40-90 m
   * off, OUTSIDE the 90 degree view cone measured with the camera's REAL forward (the
   * VIGIL law: a spawn measured against the body's yaw pops into view every time the
   * player is looking over their shoulder), and let the pilot bring it the last 30 m.
   *
   * EVERY EXIT WRITES A REASON. See the DEFECT 2 note at the top of this file for what
   * that cost: 96 silent refusals in a row and a report that read "the car is broken".
   * `_dbg.why` is the last reason, the counters are the lifetime totals, and
   * `state().spawn` is where a test reads them.
   */
  _considerSpawn() {
    const D = this._dbg;
    D.checks++;

    if (this.ctx.shared.inCar) { D.why = 'in-car'; D.inCar++; return; }
    const p = this._player, roads = this._roads;
    if (!p || !roads) { D.why = 'no-systems'; D.noSystems++; return; }

    const px = p.pos.x, pz = p.pos.z;

    // A RECALL is not a new beat: the car exists and is lost, and this file's header
    // promises you never have to walk back to it. An OWED dispatch is one the player
    // already earned and then died before it landed. Both are allowed past the yard gate
    // and nothing else is.
    let carD2 = Infinity;
    if (this.exists) {
      const dx = this.x - px, dz = this.z - pz;
      carD2 = dx * dx + dz * dz;
    }
    D.carDist = this.exists ? Math.sqrt(carD2) : -1;
    const recall = this.exists && carD2 >= SP.lostBeyond * SP.lostBeyond;

    // The car you already have is tested FIRST, not third. It is the cheapest clause and it
    // is the most informative answer to "why did nothing happen" — a ledger that reports
    // 'at-a-major' while a car sits 67 m away is technically true and useless.
    if (this.exists && !recall) { D.why = 'car-is-here'; D.carIsHere++; return; }

    // Out past every authored destination's physical yard. The clearance is its OWN flat
    // radius plus YARD_CLEAR; CFG's floor is zero, so there is no second invisible 120 m
    // moat after the player has already left that shape.
    const sites = this._spawnSites;
    let nearMajor = -1, blocked = false;
    if (sites) {
      for (let i = 0; i < sites.length; i++) {
        const dx = px - sites[i].x, dz = pz - sites[i].z;
        const d = Math.sqrt(dx * dx + dz * dz);
        if (nearMajor < 0 || d < nearMajor) nearMajor = d;
        const r = (sites[i].radius || 0) + YARD_CLEAR;
        if (d < Math.max(SP.minPlayerToMajor, r)) blocked = true;
      }
    }
    D.nearestMajor = nearMajor;
    if (blocked && !recall && !this.owed) { D.why = 'at-a-major'; D.atMajor++; return; }

    // within 60 m of a road.
    const rd = roads.roadDistance(px, pz);
    D.playerRoad = rd;
    if (rd > SP.roadWithin) { D.why = 'no-road'; D.noRoad++; return; }

    // DEAD IS TESTED LAST, ON PURPOSE. Everything above is about WHERE the player is, and
    // a check that reaches this line has proved the player was somewhere a car should come
    // to. So the dispatch is owed: dying does not un-send it, and the respawn — which drops
    // the player into a lit yard — redeems it on the very next check.
    if (p.dead) {
      this.owed = true;
      this.owedT = OWED_TTL;
      D.why = 'player-dead';
      D.playerDead++;
      return;
    }

    // the camera's REAL forward, not the body's yaw.
    const cam = this._camera;
    if (cam && cam.aimDir) cam.aimDir(_fwd);
    else if (this.ctx.camera) this.ctx.camera.getWorldDirection(_fwd);
    else _fwd.set(0, 0, -1);
    const fl = Math.hypot(_fwd.x, _fwd.z) || 1;
    const fx = _fwd.x / fl, fz = _fwd.z / fl;

    // Pass 1 keeps the view cone. Pass 2 only runs when pass 1 found nothing, and it drops
    // the cone for candidates past RELAX_CONE_MIN — a dead-end spur has road on one side
    // only, and refusing forever because the player happens to be facing up it is the same
    // silent decline in a smaller costume.
    let found = this._findStop(px, pz, fx, fz, sites, false);
    if (!found) found = this._findStop(px, pz, fx, fz, sites, true);
    if (!found) { D.why = 'no-candidate'; D.noCandidate++; return; }

    D.why = 'ok';
    D.ok++;
    D.spawns++;
    this.owed = false;
    this.owedT = 0;
    this._place(this._stopX, this._stopZ);
  }

  /**
   * The candidate sweep: 24 bearings x 5 radii, scored to prefer BEHIND the player and the
   * far end of the 40-90 m band so the arrival has road to be heard on. Writes the winner
   * to `_stopX/_stopZ` and returns a boolean — a Vector2 return would allocate on a method
   * the fixed step calls twice a second.
   *
   * THE YARD REJECT IS NEW. The old sweep gated the PLAYER at 120 m from a site centre and
   * the STOP POINT at nothing at all, so with the player at 121 m the car could park 31 m
   * from Ashfall — inside its own 46 m yard. Now the car itself has to clear every yard,
   * which is the half of "it will spawn near them outside of destinations" that was missing.
   */
  _findStop(px, pz, fx, fz, sites, relax) {
    const D = this._dbg;
    const roads = this._roads;
    if (!relax) {
      D.bearings = 0; D.coneRejects = 0; D.roadMisses = 0; D.bandRejects = 0; D.yardRejects = 0;
    }
    D.relaxed = !!relax;
    let bestX = 0, bestZ = 0, bestScore = -Infinity, found = false;
    const jitter = this.rng ? this.rng.next() : 0;
    for (let i = 0; i < 24; i++) {
      const ang = (i + jitter) / 24 * TAU;
      const ux = Math.sin(ang), uz = Math.cos(ang);
      D.bearings++;
      // Outside the 90 degree cone: the dot of the bearing with the real forward.
      const dot = ux * fx + uz * fz;
      if (dot > VIEW_CONE_COS && !relax) { D.coneRejects++; continue; }
      for (let r = SP.max; r >= SP.min; r -= 12) {
        const cx = px + ux * r, cz = pz + uz * r;
        const info = roads.nearestRoadInfo ? roads.nearestRoadInfo(cx, cz, 40) : null;
        if (!info || !info.hit) { D.roadMisses++; continue; }
        const sx = info.x, sz = info.z;
        // re-measure from the ROAD POINT, which is what actually has to land in the band
        const ddx = sx - px, ddz = sz - pz;
        const d = Math.hypot(ddx, ddz);
        if (d < SP.min || d > SP.max) { D.bandRejects++; continue; }
        const bx = ddx / (d || 1), bz = ddz / (d || 1);
        const ahead = bx * fx + bz * fz;
        if (ahead > VIEW_CONE_COS && !(relax && d >= RELAX_CONE_MIN)) { D.coneRejects++; continue; }
        // and it never parks inside any authored destination yard.
        if (sites) {
          let inYard = false;
          for (let k = 0; k < sites.length; k++) {
            const qx = sx - sites[k].x, qz = sz - sites[k].z;
            const rr = (sites[k].radius || 0) + YARD_CLEAR;
            if (qx * qx + qz * qz < rr * rr) { inYard = true; break; }
          }
          if (inYard) { D.yardRejects++; continue; }
        }
        // score: further back is better, further away is better
        const score = (1 - ahead) * 2.0 + d / SP.max;
        if (score > bestScore) { bestScore = score; bestX = sx; bestZ = sz; found = true; }
      }
      if (found && bestScore > 2.6) break;   // good enough; do not burn 96 road queries
    }
    D.bestScore = found ? bestScore : 0;
    if (!found) return false;
    this._stopX = bestX; this._stopZ = bestZ;
    return true;
  }

  /**
   * ROUND 13: the nearest legal road stop to a point — for PARKING, not for the arrival
   * beat. Rings out from the point, 48 bearings a ring; the first ring that finds a road
   * point at least `minD` away and outside every major's flat + `clear` wins, smallest
   * distance first. Writes _stopX/_stopZ and the road's unit tangent _stopTx/_stopTz.
   * Allocates nothing; runs once at boot and once per respawn.
   */
  _nearestStop(px, pz, clear, minD) {
    const roads = this._roads;
    if (!roads || typeof roads.nearestRoadInfo !== 'function') return false;
    const sites = this._spawnSites;
    let found = false, bestD = Infinity, bx = 0, bz = 0, btx = 0, btz = 1;
    for (let r = 12; r <= 120; r += 4) {
      for (let i = 0; i < 48; i++) {
        const ang = (i / 48) * TAU;
        const info = roads.nearestRoadInfo(px + Math.sin(ang) * r, pz + Math.cos(ang) * r, 12);
        if (!info || !info.hit) continue;
        const sx = info.x, sz = info.z;
        const d = Math.hypot(sx - px, sz - pz);
        if (d < minD || d >= bestD) continue;
        let inYard = false;
        if (sites) {
          for (let k = 0; k < sites.length; k++) {
            const qx = sx - sites[k].x, qz = sz - sites[k].z;
            const rr = (sites[k].radius || 0) + clear;
            if (qx * qx + qz * qz < rr * rr) { inYard = true; break; }
          }
        }
        if (inYard) continue;
        found = true; bestD = d; bx = sx; bz = sz; btx = info.tx; btz = info.tz;
      }
      if (found) break;
    }
    if (!found) return false;
    this._stopX = bx; this._stopZ = bz; this._stopTx = btx; this._stopTz = btz;
    return true;
  }

  /**
   * ROUND 13: PARK the car here, cold, on the road, nose pointed AWAY from the nearest major
   * along the road's own tangent (never bestRoadHeadingAt: measured 37 degrees off at the
   * station junction, where its probes see two roads). This is what placeAt always did for
   * tests and screenshot rigs, promoted to the game's own verb. `beacon` keeps the one lamp
   * lit past the park cool-down until somebody walks up to the door.
   */
  _park(x, z, tx, tz, beacon) {
    let fx = Number.isFinite(tx) ? tx : 0, fz = Number.isFinite(tz) ? tz : 1;
    const fl = Math.hypot(fx, fz);
    if (fl < 1e-6) { fx = 0; fz = 1; } else { fx /= fl; fz /= fl; }
    const sites = this._spawnSites;
    if (sites && sites.length) {
      let best = -1, bd = Infinity;
      for (let k = 0; k < sites.length; k++) {
        const qx = x - sites[k].x, qz = z - sites[k].z, d2 = qx * qx + qz * qz;
        if (d2 < bd) { bd = d2; best = k; }
      }
      if (best >= 0 && fx * (x - sites[best].x) + fz * (z - sites[best].z) < 0) { fx = -fx; fz = -fz; }
    }
    this._removeRoof();
    // forward is -Z at heading 0 (see _place), so the heading that points the nose at
    // (fx, fz) is atan2(-fx, -fz).
    this.placeAt(x, z, Math.atan2(-fx, -fz));
    this.beacon = !!beacon;
    this.spawnCooldown = SPAWN_COOLDOWN;
  }

  /**
   * Put the car on the road `pilotLast` metres short of the stop point and hand it to
   * the pilot. It arrives cold: one working headlight, then the engine ticking as it
   * cools, then a door-ajar chime. Nobody explains it.
   */
  _place(stopX, stopZ) {
    const roads = this._roads, terr = this._terrain;
    if (!roads || !terr) return;

    // heading of the road at the stop point, then walk backwards along it.
    let h = roads.bestRoadHeadingAt(stopX, stopZ, null);
    if (h === null || h === undefined || !isFinite(h)) h = 0;
    // bestRoadHeadingAt is MOSSWAY's (+Z at h=0); this file is in Three's basis where
    // forward is -Z. Convert once, here, and never again.
    let heading = wrapAngle(h + Math.PI);

    // Two directions of approach are equally valid roads; take whichever leaves the
    // start further from the player, so the arrival is a longer sound.
    const p = this._player;
    const px = p ? p.pos.x : 0, pz = p ? p.pos.z : 0;
    let bestH = heading, bestX = stopX, bestZ = stopZ, bestD = -1;
    for (let k = 0; k < 2; k++) {
      const hh = k === 0 ? heading : wrapAngle(heading + Math.PI);
      // start = stop - forward * pilotLast   (forward is -Z at heading 0)
      const sx = stopX + Math.sin(hh) * SP.pilotLast;
      const sz = stopZ + Math.cos(hh) * SP.pilotLast;
      if (roads.nearestRoadPoint) {
        const info = roads.nearestRoadInfo(sx, sz, 24);
        if (!info || !info.hit) continue;
        const d = Math.hypot(info.x - px, info.z - pz);
        if (d > bestD) { bestD = d; bestH = hh; bestX = info.x; bestZ = info.z; }
      }
    }

    this.x = bestX; this.z = bestZ;
    this.y = terr.heightAt(this.x, this.z);
    this.heading = bestH;
    this.speed = PILOT_CRUISE;
    this.steer = 0; this.pitch = 0; this.roll = 0; this.bob = 0;
    this.doorA = 0; this.cabin = 0;   // it arrives shut and dark, and opens when it stops
    this._creaked = false;
    this.pilotX = stopX; this.pilotZ = stopZ;

    this.exists = true;
    this.mode = 'arriving';
    this.hotwired = false;      // every spawn is a fresh hotwire
    this.engineOn = true;
    this.hornSoundPending = false;
    this.hitCooldown = 0;
    this.stuckT = 0;
    this.spawnCooldown = SPAWN_COOLDOWN;
    this._sync();
    this._removeRoof();
    this.body.root.visible = true;
    this._setHeadlights(true);
    this._emit('car:spawned', { x: this.x, z: this.z });
    this._noise('car:arrive', ENGINE_NOISE_R);
  }

  /** prev == curr: no interpolation streak across a placement. */
  _sync() {
    this.prevX = this.x; this.prevY = this.y; this.prevZ = this.z;
    this.prevHeading = this.heading;
    this.prevPitch = this.pitch; this.prevRoll = this.roll; this.prevBob = this.bob;
    this.prevWheelRot = this.wheelRot; this.prevSteer = this.steer;
    this.prevDoorA = this.doorA; this.prevCabin = this.cabin;
  }

  /* ----------------------------------------------------------------- lights */

  /**
   * The one working lamp's filament, 0..1. The park cool-down dims it and wear browns it,
   * and both have to be in one number or the two would fight over body.setLamp.
   */
  _filament() {
    return clamp01(this.lampFade) * (1 - WEAR_LAMP_LOSS * clamp01(this.wear));
  }

  /**
   * BLOCKER 1. This file used to call _setHeadlights(TRUE) in three places — _place,
   * _beginEnter and placeAt — and _setHeadlights(false) in NONE of them. One autonomous
   * spawn therefore lit the census SpotLight for the rest of the session: ctx.shared.lit
   * pinned at >= 0.52 forever, and "seeing is how you are seen" inverted into a trade with
   * no cost. It is now switched off on exit, on death/respawn, and by the park cool-down.
   *
   * The lampFade write is deliberately ABOVE the no-change early-out: re-asserting `true`
   * on a car that is already lit but half-way through its cool-down has to bring the
   * filament back up, and the early-out would have swallowed that.
   */
  _setHeadlights(on) {
    on = !!on;
    this.lampFade = on ? 1 : 0;
    if (on === this.headlightsOn) {
      if (on && this.body) this.body.setLamp(this._filament(), true);
      return;
    }
    this.headlightsOn = on;
    const L = this._lights;
    if (!on) {
      if (L && L.setHeadlights) L.setHeadlights(false);
      if (this.headHandle) { if (L) L.release(this.headHandle); this.headHandle = null; }
      if (this.body) this.body.setLamp(0, false);
      return;
    }
    // One borrowed rover for the warm pool ON the lens itself — the census gives the
    // headlights one SpotLight and the beam alone leaves the car's own nose black.
    // ttl 0 = persistent until released.
    if (L && L.borrow && !this.headHandle) {
      this.headHandle = L.borrow('headlamp', this.x, this.y + 1.0, this.z, 0xffdca6, HEAD_POOL, 0);
    }
    if (this.body) this.body.setLamp(this._filament(), true);
  }

  /* ------------------------------------------------------------------ roof  */

  /**
   * The roof is a mantle target and the body is something you take cover behind — but
   * ONLY while it is parked. Colliders are static between bakes (collision.js header)
   * and re-adding three of them every fixed step at 23 m/s is churn nobody needs, so
   * the car is solid when it is still and is a moving pose when it is not. Three
   * circles along the spine, not one OBB: a circle has no yaw convention to get wrong.
   */
  _placeRoof() {
    if (this._roofPlaced) return;
    const col = this._collision;
    if (!col || !col.addCircle) return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const y0 = this.y + 0.30, y1 = this.y + ROOF_Y;
    for (let i = 0; i < 3; i++) {
      const t = (i - 1) * 1.30;
      this._roofColliders[i] = col.addCircle(
        this.x + fx * t, this.z + fz * t, 0.98, y0, y1, 'car', true,
      );
    }
    this._roofPlaced = true;
  }

  /**
   * Is this collider id one of ours? The car adds three roof circles while it is parked
   * and must never depenetrate off them. collision.js is another lane's file, so we do
   * not tag anything there — we own three ids and a three-way compare is cheaper than a
   * string test anyway. Allocates nothing.
   */
  _isOwnCollider(id) {
    if (id === undefined || id === null || id < 0) return false;
    const r = this._roofColliders;
    return id === r[0] || id === r[1] || id === r[2];
  }

  _removeRoof() {
    if (!this._roofPlaced) return;
    const col = this._collision;
    if (col && col.removeCollider) {
      for (let i = 0; i < 3; i++) {
        if (this._roofColliders[i] >= 0) col.removeCollider(this._roofColliders[i]);
        this._roofColliders[i] = -1;
      }
    }
    this._roofPlaced = false;
  }

  /**
   * For lane E's mantle (round 6, BRIEF-COMMON contract): the top of the car body if (x, z)
   * is over its footprint — in the car's yawed local frame — else null. The same answer the
   * three parked roof circles give (_placeRoof: y + ROOF_Y), but true while the car is
   * moving too, and a box rather than three circles so a foot on the bonnet or the tailgate
   * is over the car. Pure; allocates nothing; null while no car exists.
   */
  roofHeightAt(x, z) {
    if (!this.exists) return null;
    const dx = x - this.x, dz = z - this.z;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const lx = dx * rx + dz * rz;          // local X: + is the passenger side
    const lz = -(dx * fx + dz * fz);       // local Z: forward is -Z, so the nose is negative
    if (lx < -FOOTPRINT.hx || lx > FOOTPRINT.hx || lz < FOOTPRINT.z0 || lz > FOOTPRINT.z1) return null;
    return this.y + ROOF_Y;
  }

  /* ------------------------------------------------------------------- step */

  step(dt) {
    // Debris outlives the car: you can crush a fence, park, get out and watch the last
    // splinters settle. So it steps before any of the early returns below.
    this._stepDebris(dt);
    if (!this.body) return;

    this.prevX = this.x; this.prevY = this.y; this.prevZ = this.z;
    this.prevHeading = this.heading;
    this.prevPitch = this.pitch; this.prevRoll = this.roll; this.prevBob = this.bob;
    this.prevWheelRot = this.wheelRot; this.prevSteer = this.steer;
    this.prevDoorA = this.doorA; this.prevCabin = this.cabin;

    this.hitCooldown -= dt;
    this.spawnCooldown -= dt;
    // An owed dispatch expires. A car that was sent for you four deaths ago is not a beat.
    if (this.owed) {
      this.owedT -= dt;
      if (this.owedT <= 0) { this.owed = false; this.owedT = 0; }
    }

    if (!this.exists) {
      // ROUND 13: THE CAR EXISTS FROM THE FIRST STEP. A fresh session parks it cold at the
      // road stop nearest the start, lamp lit as a beacon, so L and both car buttons are live
      // from frame one and the car is in view on the first turn. Done here and not in init():
      // roads' elevation table and the terrain are only guaranteed by the first step.
      if (!this._freshParked) {
        this._freshParked = true;
        const terr = this._terrain, ps = terr && terr.playerStart;
        if (ps && this._nearestStop(ps.x, ps.z, PARK_CLEAR, PARK_MIN)) {
          this._park(this._stopX, this._stopZ, this._stopTx, this._stopTz, true);
          return;
        }
      }
      this.spawnCheckT -= dt;
      if (this.spawnCheckT <= 0) {
        this.spawnCheckT = SPAWN_CHECK_EVERY;
        if (this.spawnCooldown <= 0) this._considerSpawn();
      }
      return;
    }

    switch (this.mode) {
      case 'arriving': this._stepArriving(dt); break;
      case 'idle': this._stepIdle(dt); break;
      case 'entering': this._stepEntering(dt); break;
      case 'driving': this._stepDriving(dt); break;
      case 'exiting': this._stepExiting(dt); break;
      default: break;
    }

    // The seat owns the horn from the instant the door shuts, including the hotwire beat.
    // Previously input was not polled until `driving`, so any H tap during the 1.95 s entry
    // sequence was cleared by input.endStep and could never arrive here later.
    if (this.ctx.shared && this.ctx.shared.inCar
        && (this.mode === 'entering' || this.mode === 'driving')) {
      this._horn(dt);
      this._flushHornSound();
      // ROUND 13: H at the wheel hub, for the first seconds in the seat, until the horn has
      // been used once. The hub rides the car body, so the glyph follows the wheel.
      this._seatS += dt;
      if (this._seatS < HORN_TEACH_S && this.hornCount === 0 && this.body && this.body.steer && this.ctx.bus) {
        this.body.steer.getWorldPosition(_hubV);
        _promptP.kind = 'horn'; _promptP.label = 'H';
        _promptP.x = _hubV.x; _promptP.y = _hubV.y; _promptP.z = _hubV.z; _promptP.k = 0;
        this.ctx.bus.emit('prompt', _promptP);
      }
    } else {
      this.hornT = Math.max(0, this.hornT - dt);
      this.hornHeld = false;
      this.hornSoundPending = false;
    }

    // The door and the courtesy light, every mode. This is the whole of the discoverability
    // fix and it runs outside the mode switch on purpose: the door has an opinion in all
    // six modes and the one that used to be missing was "parked, and somebody is walking
    // toward me".
    this._stepDoor(dt);

    // The seat yaw clamp moves AIM, so it belongs to the step, not to present. camera is
    // manifest 12 and has already integrated this step's look by the time we run.
    this._carryLook(dt);
    this._clampSeatLook();

    // The engine is a disturbance for as long as it runs, wherever it is.
    if (this.engineOn) {
      this.noiseT -= dt;
      if (this.noiseT <= 0) {
        this.noiseT = ENGINE_NOISE_EVERY;
        this._noise('car:engine', ENGINE_NOISE_R);
      }
    }

    // The spawn rule keeps running while a car exists: this is the ">300 m away or
    // lost" clause, which is how you never have to walk back to where you left it.
    if (!this.ctx.shared.inCar) {
      this.spawnCheckT -= dt;
      if (this.spawnCheckT <= 0) {
        this.spawnCheckT = SPAWN_CHECK_EVERY;
        if (this.spawnCooldown <= 0 && (this.mode === 'idle' || this.mode === 'arriving')) {
          this._considerSpawn();
        }
      }
    }
  }

  /* ------------------------------------------------------------- the pilot  */

  /**
   * PEACHFUL's `_pilot` (Desktop/peachful/src/vehicle.js:155-179): sample the path field
   * left and right of a look-ahead point and steer toward the lower one. Here the field
   * is roads.roadDistance and the pilot also has a destination, because it is not
   * cruising — it is arriving. It brakes to a stop at the point the spawn rule chose,
   * SO THE PLAYER HEARS IT ARRIVE.
   */
  _stepArriving(dt) {
    const roads = this._roads;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);

    const dx = this.pilotX - this.x, dz = this.pilotZ - this.z;
    const remaining = Math.hypot(dx, dz);

    // steer: half from the road field ahead, half from the bearing to the stop point.
    let steerIn = 0;
    if (roads) {
      const look = 12;
      const lx = this.x + fx * look, lz = this.z + fz * look;
      const dL = roads.roadDistance(lx - rx * 4.5, lz - rz * 4.5);
      const dR = roads.roadDistance(lx + rx * 4.5, lz + rz * 4.5);
      steerIn = clamp((dR - dL) * 0.42, -1, 1);
    }
    if (remaining > 0.5) {
      const lat = (dx * rx + dz * rz) / remaining;
      const along = (dx * fx + dz * fz) / remaining;
      // a target behind us is a lost cause; just stop.
      if (along < -0.2) { this.pilotX = this.x; this.pilotZ = this.z; }
      else steerIn = clamp(steerIn * 0.45 - lat * 1.9, -1, 1);
    }

    // throttle: cruise, then shed speed into the stop.
    let want = PILOT_CRUISE;
    if (remaining < PILOT_BRAKE_AT) want = PILOT_CRUISE * clamp01(remaining / PILOT_BRAKE_AT);
    const throttle = this.speed < want ? 1 : 0;
    const brake = this.speed > want + 0.6 ? 1 : 0;

    this._integrate(dt, steerIn * PILOT_STEER, throttle, brake, 0);

    if (remaining <= PILOT_ARRIVE || (this.speed < 0.10 && remaining < 6)) {
      this.speed = 0;
      this.steer = 0;
      this.mode = 'idle';
      this.engineOn = false;
      // arrives cold: the block ticks as it cools, then the door chimes because it is ajar
      this.coolLeft = COOL_TICKS;
      this.coolT = COOL_GAP;
      this._noise('car:door-chime', 24);
      // IT PARKS AND THE DOOR COMES OPEN. The arrival used to end with a mesh standing
      // still in the dark; it now ends with the one thing in the county that is a verb.
      // `_creaked` is re-armed here so the swing-wide creak still fires when he walks up.
      this._creaked = false;
      this._say('door', 0.6);
      this._placeRoof();
    }
  }

  /* -------------------------------------------------------------- parked -- */

  _stepIdle(dt) {
    this.speed = damp(this.speed, 0, 6, dt);
    this.steer = damp(this.steer, 0, 6, dt);
    this._settle(dt);

    // the engine ticking as it cools. Five ticks, slowing, then nothing.
    if (this.coolLeft > 0) {
      this.coolT -= dt;
      if (this.coolT <= 0) {
        this.coolLeft--;
        this.coolT = COOL_GAP * (1 + (COOL_TICKS - this.coolLeft) * 0.35);
        this._noise('car:cool-tick', 12);
      }
    }

    // BLOCKER 1, the beat. A car that arrived on its own and parked used to sit there
    // with its lamp burning for the rest of the session. Now the filament falls away over
    // PARK_DARK_S while the block ticks, and the census SpotLight goes out at the bottom
    // of the fade — so the arrival is a light coming toward you, the wait is a light going
    // out, and the woods come back. Nothing here creates or destroys a light.
    // ROUND 13: a parked BEACON (the fresh-session park) keeps its lamp until approached.
    if (this.headlightsOn && !this.ctx.shared.inCar && !this.beacon) {
      this.lampFade -= dt / PARK_DARK_S;
      if (this.lampFade <= 0) { this.lampFade = 0; this._setHeadlights(false); }
      else if (this.body) this.body.setLamp(this._filament(), false);
    }

    // WHEEL 4, 'Keep' — hook 'wearRepair', base 0 per minute (nodes.js:123-124 names this
    // exact call site as "the parked branch"). Reduced on FRAMES, not on events. With the
    // node unowned the chain hands the 0 straight back and this costs one Map lookup; with
    // it owned, and only somewhere lit, the car mends itself while it sits.
    const pr = this._progress;
    if (pr && typeof pr.perk === 'function') {
      // The CAR's light, not the player's. ctx.shared.lit is sampled at the player, so it
      // answered for whoever was holding the torch instead of for the thing being mended.
      const lg = this._lights;
      const carLit = lg && typeof lg.placeLitAt === 'function' ? lg.placeLitAt(this.x, this.z) : 0;
      const perMin = pr.perk('wearRepair', 0, carLit);
      if (perMin > 0 && this.wear > 0) {
        this.wear = Math.max(0, this.wear - perMin * dt / 60);
        if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), false);
      }
    }

    this._pollEnter(dt);
  }

  /** The driver's door handle, in world space. Writes into `out` — allocates nothing. */
  _doorPoint(out) {
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    // DOOR.z is local (forward = -Z), so it rides MINUS the forward vector. This used to
    // add it, which put the handle 0.6 m aft of the aperture — the same one-sign mirror
    // that put the camera in the back seat (see present()).
    out.x = this.x + rx * DOOR.x - fx * DOOR.z;
    out.z = this.z + rz * DOOR.x - fz * DOOR.z;
    return out;
  }

  /** How far the player is from being able to get in: the door, or the car, whichever is
   *  the kinder read. Returns Infinity when there is no player to measure. */
  _reach() {
    const p = this._player;
    if (!p || !p.pos) return Infinity;
    const o = this._doorOut || (this._doorOut = { x: 0, z: 0 });
    this._doorPoint(o);
    const dDoor = Math.hypot(p.pos.x - o.x, p.pos.z - o.z);
    const dCar = Math.hypot(p.pos.x - this.x, p.pos.z - this.z);
    // Scaled so that "in range" is one comparison against 1 for both clauses at once.
    return Math.min(dDoor / ENTER_RANGE, dCar / ENTER_RANGE_CENTRE) * ENTER_RANGE;
  }

  /**
   * THE DOOR. Parked, it stands ajar; you walk up, it swings wide and the courtesy light
   * comes up with it; you get in, it shuts on you. Every one of those is a fixed-step
   * target and a damp, so it interpolates and so it cannot fight the frame rate.
   *
   * The rover is borrowed only while somebody is near enough to see it land on anything,
   * and it is released the moment they are not: the census is pinned at 13 and the eight
   * rovers are shared with the muzzle, the eyes, the motes and the embers.
   */
  _stepDoor(dt) {
    if (!this.body) return;
    let wantDoor = 0, wantCabin = 0, near = Infinity;

    if (this.mode === 'idle' || this.mode === 'exiting') {
      const p = this._player;
      near = (p && !p.dead) ? this._reach() : Infinity;
      // 1 at the entry radius, 0 at ANSWER_RANGE. This is the "proximity must ANSWER"
      // clause: the car starts opening for you well before you can use it.
      const t = ease.outCubic(clamp01((ANSWER_RANGE - near) / (ANSWER_RANGE - ENTER_RANGE)));
      wantDoor = lerp(DOOR_AJAR, 1, t);
      // dim but never off while it is parked — that dim line is how you find it again
      wantCabin = lerp(0.34, 1, t);
      if (this.mode === 'exiting') { wantDoor = 1; wantCabin = 1; }
      // ONE creak per approach, on the way in, and it re-arms only when you have properly
      // walked away. A sound that retriggers on the edge of its own trigger is a stutter.
      if (!this._creaked && near < ANSWER_RANGE * 0.72) {
        this._creaked = true;
        this.beacon = false;          // ROUND 13: found. The cool-down runs from here.
        const o = this._doorPoint(this._doorOut || (this._doorOut = { x: 0, z: 0 }));
        this._noise('car:door-swing', 14, o.x, o.z);
        this._say('door', 0.55, o.x, this.y + 1.05, o.z);
      } else if (this._creaked && near > ANSWER_RANGE + 4) {
        this._creaked = false;
      }
    } else if (this.mode === 'entering') {
      // it shuts on you as the camera arrives, which is the confirmation that the tap took
      wantDoor = 0; wantCabin = clamp01(1 - this.enterT / (REPARENT * 0.8));
    } else {
      wantDoor = 0; wantCabin = 0;      // arriving, driving
    }

    this.doorA = damp(this.doorA, wantDoor, ANSWER_LAMBDA, dt);
    this.cabin = damp(this.cabin, wantCabin, CABIN_LAMBDA, dt);

    // the borrowed rover: warm light actually landing on the ground beside the door
    const L = this._lights;
    const wantRover = this.cabin > 0.06 && near < CABIN_BORROW_R;
    if (wantRover && !this.cabinHandle && L && L.borrow) {
      const o = this._doorPoint(this._doorOut || (this._doorOut = { x: 0, z: 0 }));
      this.cabinHandle = L.borrow('cabin', o.x, this.y + 1.05, o.z, 0xffc27a, CABIN_POOL * this.cabin, 0);
    } else if (!wantRover && this.cabinHandle) {
      L && L.release(this.cabinHandle);
      this.cabinHandle = null;
    }
  }

  /** Let the courtesy rover go, wherever we are in the lifecycle. */
  _releaseCabin() {
    if (!this.cabinHandle) return;
    const L = this._lights;
    if (L) L.release(this.cabinHandle);
    this.cabinHandle = null;
  }

  /**
   * TAP E, anywhere you could touch the car. No hold: a hold exists to prevent an
   * accidental entry and nobody accidentally walks into a car in a forest at night, and
   * the 0.4 s one this replaces was an invisible progress bar on an undiscoverable verb.
   *
   * `_useConsumed` is what makes a held key a tap: we act on the first frame the key is
   * down and then say nothing until it comes up. It is also what stops the exit's own tap
   * from walking you straight back into the seat on the next frame.
   *
   * A press out of reach still answers — one handle rattle, once — because a refusal that
   * makes no sound is indistinguishable from a game that is not listening, which is
   * exactly what he experienced.
   */
  _pollEnter(dt) {
    void dt;
    const p = this._player;
    // ROUND 13: the key glyph on the driver's door while the seat is in reach.
    if (p && !p.dead && this.mode === 'idle' && this._reach() <= ENTER_RANGE && this.ctx.bus) {
      const o = this._doorPoint(this._doorOut || (this._doorOut = { x: 0, z: 0 }));
      _promptP.kind = 'use'; _promptP.label = 'E';
      _promptP.x = o.x; _promptP.y = this.y + 1.05; _promptP.z = o.z; _promptP.k = 0;
      this.ctx.bus.emit('prompt', _promptP);
    }
    const held = this._useHeld();
    if (!held) { this._useConsumed = false; this.refuseLatch = false; this.holdT = 0; return; }
    if (this._useConsumed) return;
    this._useConsumed = true;
    if (!p || p.dead) return;

    const d = this._reach();
    if (d <= ENTER_RANGE) { this.holdT = 0; this._beginEnter(); return; }
    if (d < REFUSE_RANGE && !this.refuseLatch) {
      this.refuseLatch = true;
      const o = this._doorPoint(this._doorOut || (this._doorOut = { x: 0, z: 0 }));
      this._noise('car:handle-refuse', 6, o.x, o.z);
      this._say('branch', 0.30, o.x, this.y + 1.05, o.z);
    }
  }

  _beginEnter() {
    const cam = this.ctx.camera;
    if (cam) {
      this.fromX = cam.position.x; this.fromY = cam.position.y; this.fromZ = cam.position.z;
    } else { this.fromX = this.x; this.fromY = this.y + SEAT.y; this.fromZ = this.z; }
    this.mode = 'entering';
    this.beacon = false;
    this.enterT = 0;
    // WHEEL 1, 'Hotwire' — hook 'hotwireS', base CFG.car.hotwire (nodes.js:119-120).
    // Read at the moment the door shuts, never captured: a node bought between two entries
    // has to bite on the next one. Clamped at 0 so a hostile chain cannot make it negative.
    const pr = this._progress;
    const hotS = (pr && typeof pr.perk === 'function') ? pr.perk('hotwireS', K.hotwire) : K.hotwire;
    this.hotwireTotal = Number.isFinite(hotS) ? Math.max(0, hotS) : K.hotwire;
    this.hotwireT = this.hotwired ? 0 : this.hotwireTotal;
    this.crankPips = 0;
    this.ctx.shared.inCar = true;
    this.stuckT = 0;
    this._setFovBias(0);          // the speed term starts at zero and rides the reparent up
    this._removeRoof();

    // Freeze the body, then place it ONCE. teleport() collapses prev/curr, which is
    // exactly right for a single placement and exactly wrong every step (the audit bug).
    this._setCarried(true);
    const p = this._player;
    if (!this._carrySeated && p && typeof p.teleport === 'function') {
      p.teleport(this.x, this.z, this.heading);
      this._carrySeated = true;
    }

    this._noise('car:door-creak', 18);
    this._say('door', 0.85);
    this._useConsumed = true;     // the key that got you in does not also get you out
    this._setHeadlights(true);
  }

  _stepEntering(dt) {
    this.speed = damp(this.speed, 0, 8, dt);
    this._settle(dt);
    this.enterT += dt;

    // the player rides with the car from the moment the door shuts, so the world streams
    // around the CAR and the torch, the moon box and the chunk ring all follow it.
    this._carryPlayer();
    this._driveFov(clamp01(this.enterT / REPARENT));

    if (this.enterT < REPARENT) return;

    // A hotwire with an audible crank: three pips of a starter that does not catch, then
    // it does. This only happens on the FIRST entry after a spawn. The pips are spaced off
    // `hotwireTotal`, not off CFG, so WHEEL 1's half-second hotwire is still three pips and
    // not one — the perk makes the beat faster, it does not delete it.
    if (this.hotwireT > 0) {
      const before = this.hotwireT;
      this.hotwireT -= dt;
      const pip = Math.floor((this.hotwireTotal - this.hotwireT) / (this.hotwireTotal / 3));
      if (pip > this.crankPips && before > 0) {
        this.crankPips = pip;
        this._noise('car:crank', 22);
        // AND THE PLAYER HEARS IT. The first entry after a spawn is a 1.6 s hotwire in
        // which, until this line, absolutely nothing happened — no sound, no picture, no
        // motion — and then the car was suddenly running. 1.6 s of nothing is exactly how
        // long it takes to conclude that a control did not work.
        this._say('branch', 0.42, this.x, this.y + 1.2, this.z);
      }
      if (this.hotwireT > 0) return;
      this.hotwired = true;
    }
    this.engineOn = true;
    this.noiseT = 0;
    this.mode = 'driving';
    this._emit('car:entered', null);
    this._noise('car:start', ENGINE_NOISE_R);
  }

  /* ------------------------------------------------------------- driving -- */

  _stepDriving(dt) {
    // A steers left. In Three's basis forward is (-sin h, 0, -cos h), so INCREASING the
    // heading swings the nose to the player's left — the axis goes straight through.
    // (Measured: a negation here turned the car right when you pressed A.)
    const steerIn = this._axis('right', 'left');
    const throttle = this._axis('back', 'forward') > 0 ? 1 : 0;
    const brake = this._axis('back', 'forward') < 0 ? 1 : 0;
    const i = this._input;
    const hardBrake = !!(i && i.held && i.held('jump'));   // Space [mossway game.js:1823]

    this._integrate(dt, steerIn, throttle, brake, hardBrake ? 1 : 0);
    this._carryPlayer();
    this._driveFov(1);
    this._ram(dt);

    // exit: the SAME tap that got you in, so there is one verb to learn and not two, and
    // it still refuses above walking pace — with a sound, because a refusal that makes no
    // sound is the bug this whole round is about.
    if (!this._useHeld()) {
      this._useConsumed = false;
      this.refuseLatch = false;
      this.holdT = 0;
    } else if (!this._useConsumed) {
      this._useConsumed = true;
      if (Math.abs(this.speed) > EXIT_MAX_SPEED) {
        this.refuseLatch = true;
        this._noise('car:door-refuse', 8);
        this._say('branch', 0.30);
      } else {
        this.holdT = 0;
        this._beginExit();
      }
    }
  }

  _beginExit() {
    this.mode = 'exiting';
    this.enterT = 0;
    this.engineOn = false;
    this.speed = 0;
    this.hornSoundPending = false;
    this.coolLeft = COOL_TICKS;
    this.coolT = COOL_GAP;
    this._noise('car:door-creak', 18);
    this._say('door', 0.85);
    // You get out and the door is standing open behind you with the light on, which is
    // both the truth and the thing that makes the car findable again from the treeline.
    this._creaked = true;         // you are AT it; the approach creak re-arms when you leave

    // BLOCKER 1. You turn it off when you get out. Without this the census SpotLight the
    // headlights own stayed lit for the rest of the session and ctx.shared.lit stayed
    // pinned with it, so crouching in a hedge 200 m away still read as standing in a
    // floodlight. The block goes on ticking either way — the engine cooling is the beat,
    // the light going is what gives the woods back.
    this._setHeadlights(false);

    // Unfreeze BEFORE the placement, so the controller owns its own body again from the
    // frame it lands on. The exit teleport is a placement, so the prev/curr collapse in
    // teleport() is what we want here.
    this._setCarried(false);
    this._carrySeated = false;

    // 1.2 m off the driver side, on the ground, facing along the car's heading.
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const ox = this.x - rx * (EXIT_OFFSET + 0.55);
    const oz = this.z - rz * (EXIT_OFFSET + 0.55);
    const p = this._player;
    if (p && p.teleport) {
      const col = this._collision;
      const r = CFG.player && CFG.player.RADIUS ? CFG.player.RADIUS : 0.35;
      const h = CFG.player && CFG.player.STAND_H ? CFG.player.STAND_H : 1.8;
      let tx = ox, tz = oz;
      if (col && col.canOccupy && !col.canOccupy(ox, oz, r, h)) {
        // refuse-rather-than-clip: try the other side, then the tail.
        const ax = this.x + rx * (EXIT_OFFSET + 0.55), az = this.z + rz * (EXIT_OFFSET + 0.55);
        if (col.canOccupy(ax, az, r, h)) { tx = ax; tz = az; }
        else {
          const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
          tx = this.x - fx * 3.2; tz = this.z - fz * 3.2;
        }
      }
      p.teleport(tx, tz, this.heading);
    }

    // present() blends cam.position = lerp(from, seat, t) with t running 1 -> 0 across
    // the exit, so `from` has to be where you are STANDING, not where the camera is now.
    // Capturing cam.position here (which is the seat, because this file put it there)
    // made the exit hold at the seat for 0.35 s and then CUT to the body. Alex's law is
    // that the camera never gets taken away; a cut is the camera being taken away.
    //
    // MEASURED THIS ROUND, and it was a 75 metre cut nobody had ever looked at. This line
    // used to read `p.pos.y + p.eyeY`, but controller.js:331 documents `eyeY` as "absolute
    // world Y" — it already contains pos.y, plus the crouch blend, the slide drop, the land
    // spring and the death sink. Adding pos.y to it DOUBLED the height: on a hill 75 m above
    // sea level the exit blend lifted the camera to 152.95 m over 0.35 s and then dropped it
    // back to 77.32 in a single frame the moment the car let go. Read exactly what
    // player/camera.js:310 reads — renderEyeY, the interpolated one, falling back to eyeY —
    // and the whole thing becomes the 1.75 m step out of a door it was always supposed to be.
    if (p && p.pos) {
      this.fromX = p.pos.x;
      const eye = (typeof p.renderEyeY === 'number' && isFinite(p.renderEyeY)) ? p.renderEyeY
        : (typeof p.eyeY === 'number' && isFinite(p.eyeY)) ? p.eyeY
          : p.pos.y + ((CFG.player && CFG.player.EYE) || 1.68);
      this.fromY = eye;
      this.fromZ = p.pos.z;
    } else {
      const cam = this.ctx.camera;
      if (cam) { this.fromX = cam.position.x; this.fromY = cam.position.y; this.fromZ = cam.position.z; }
    }
  }

  _stepExiting(dt) {
    this._settle(dt);
    this.enterT += dt;
    this._driveFov(1 - clamp01(this.enterT / REPARENT));
    if (this.enterT < REPARENT) return;
    this.mode = 'idle';
    this.ctx.shared.inCar = false;
    this.spawnCooldown = SPAWN_COOLDOWN;
    this._setFovBias(0);          // the seat's speed term leaves with the seat
    this._placeRoof();
    this._emit('car:exited', null);
  }

  /* ---------------------------------------------------- MOSSWAY kinematics  */

  /**
   * donor: donors/mossway/game.js:1813-1876 (updateVehicle) for the SPEED half only — the
   * throttle, brake, creep, drag and caps, verbatim numbers — hosted in PEACHFUL's basis
   * (Desktop/peachful/src/vehicle.js:117-121 _syncBasis — Three's local forward is -Z, so
   * fwd = (-sin, 0, -cos) and right = (cos, 0, -sin)). The STEERING half is not MOSSWAY's
   * any more (round 5, below): a bicycle model with a speed-keyed lock, this project's own.
   * Every constant that CFG.car owns is read from CFG; the rest carry their donor line above.
   */
  _integrate(dt, steerIn, throttle, brake, hardBrake) {
    this._throttle = throttle ? 1 : 0;   // _resolveContacts: the trunk escape counts throttle-held time
    const roads = this._roads, terr = this._terrain;
    const rd = roads ? roads.roadDistance(this.x, this.z) : 99;
    const onRoad = rd < ON_ROAD_D;
    // Wear costs top speed and nothing else: a beaten car is a slower car, which is a read
    // you get through the windscreen instead of off a gauge. WHEEL 4 is the only thing
    // that gives any of it back. At WEAR_START the on-road cap is 22.0 rather than 23.0.
    const worn = 1 - WEAR_SPEED_LOSS * clamp01(this.wear);
    const maxForward = (onRoad ? K.onRoad : K.offRoad) * worn;
    const maxReverse = (onRoad ? MAX_REV_ON : MAX_REV_OFF) * worn;

    if (throttle) this.speed += (onRoad ? K.accelOn : K.accelOff) * dt;
    if (brake) {
      if (this.speed > 0.55) this.speed -= K.brake * dt;
      else this.speed -= (onRoad ? CREEP_ON : CREEP_OFF) * dt;
    }
    if (hardBrake) this.speed = damp(this.speed, 0, HARD_BRAKE_LAMBDA, dt);

    const drag = (onRoad ? 0.20 : 0.72) + Math.abs(this.speed) * (onRoad ? 0.012 : 0.025);
    if (!throttle && !brake) this.speed = damp(this.speed, 0, drag, dt);
    if (this.speed > maxForward) this.speed = damp(this.speed, maxForward, 3.4, dt);
    if (this.speed < -maxReverse) this.speed = damp(this.speed, -maxReverse, 4.0, dt);
    // ONE DELIBERATE DEVIATION from MOSSWAY. Its cap is a damp, not a clamp, so throttle
    // and pull reach equilibrium ABOVE the cap: 23 + accel/lambda = 23 + 7.0/3.4 = 25.06
    // m/s, measured. CFG.car.onRoad says 23.0 and DESIGN's whole "3.5x foot speed / the
    // Hunter is 1.2 m/s slower than you" arithmetic is written against 23.0, so the soft
    // approach is kept and the number is made true.
    this.speed = clamp(this.speed, -maxReverse, maxForward);
    if (this._cruise !== null) this.speed = this._cruise;   // test door only, see setCruise()

    // THE LOCK IS A RADIUS (ROUND 5, Alex: "take turns down smaller roads filled with trees
    // ... really easy and responsive"). MOSSWAY's lock/shrink/effect triple turned a 54 m
    // circle at 10 m/s, measured (CFG.car.turn carries the before/after table). Now a plain
    // bicycle model: the full-lock radius is R(v) = rMin + rCubic * v^3, the wheel angle at
    // full lock is atan(wheelbase / R), and the heading turns at v * tan(steer) / wheelbase.
    // `steer` IS the front wheel angle in radians — present() draws the wheels and the rim
    // off it directly, so what you see the wheels do is what the car does. The damp is the
    // steering rate: 0.15 s to 63% of lock, back within 0.05 rad of centre in 0.25 s of
    // letting go (measured, tests/car.mjs; 0.35 s on master, whose lock was a bigger angle).
    const v = Math.abs(this.speed);
    const R = K.turn.rMin + K.turn.rCubic * v * v * v;
    const lock = Math.atan(K.wheelbase / R);
    this.lockNow = lock;
    this.steer = damp(this.steer, steerIn * lock, STEER_LAMBDA, dt);
    this.heading = wrapAngle(this.heading + this.speed * Math.tan(this.steer) / K.wheelbase * dt);
    this._payKick(dt);          // round 7: whatever the last crush shoved the nose by

    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    this.x += fx * this.speed * dt;
    this.z += fz * this.speed * dt;
    this.travel += Math.abs(this.speed) * dt;
    this.wheelRot -= this.speed * dt / WHEEL_RADIUS;

    // ROUND 7, lane F: BEFORE the contacts resolve. Anything the nose can go through at
    // this speed is retired from the collider field right here, so _resolveContacts a line
    // below never sees it and there is no frame where the car is stopped by a fence it has
    // already broken.
    //
    // THE PILOT CRUSHES TOO, and it has to. Breakables live on the verge and some of them
    // land inside the road ribbon; a pilot that could not go through a 24 kg crate would
    // grind to a halt on the approach and the arrival beat — the one Alex hears before he
    // sees it — would silently stop working. It crushes SILENTLY (no trauma, no thud): the
    // player is not in the car and a camera knock from 60 m away is a bug, not a beat.
    this._crushStep(dt, fx, fz);

    this._resolveContacts(dt, fx, fz);

    // ROUND 7, lane F (Alex: "It's not super smooth"). THE CAR RIDES ON ITS WHEELBASE,
    // NOT ON A POINT. One terrain sample under the centre picks up every ripple the
    // heightfield has at a 2.55 m scale and hands it straight to the seat; averaging the
    // two AXLE points is a physical low-pass — it is what having wheels 2.55 m apart
    // actually does to a body — and it costs one extra heightAt on a step that already
    // takes four in _tilt. The damp stays exactly where it was: this changes what the car
    // is following, not how fast it follows it.
    let gy = 0;
    if (terr) {
      const ax = K.wheelbase * 0.5;
      gy = (terr.heightAt(this.x + fx * ax, this.z + fz * ax)
          + terr.heightAt(this.x - fx * ax, this.z - fz * ax)) * 0.5;
    }
    this.y = damp(this.y, gy, GROUND_LAMBDA, dt);

    this._tilt(dt, onRoad);
  }

  /** Four terrain samples for pitch and roll, clamped [CFG.car.pitchClamp/rollClamp]. */
  _tilt(dt, onRoad) {
    const terr = this._terrain;
    if (!terr) return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    const hf = terr.heightAt(this.x + fx * SAMPLE_FWD, this.z + fz * SAMPLE_FWD);
    const hb = terr.heightAt(this.x - fx * SAMPLE_FWD, this.z - fz * SAMPLE_FWD);
    const hr = terr.heightAt(this.x + rx * SAMPLE_SIDE, this.z + rz * SAMPLE_SIDE);
    const hl = terr.heightAt(this.x - rx * SAMPLE_SIDE, this.z - rz * SAMPLE_SIDE);
    // nose-up on a climb: forward is -Z, so a rising front is a POSITIVE x rotation.
    const wantPitch = Math.atan2(hf - hb, SAMPLE_FWD * 2) * 0.78;
    // roll is about the car's local Z (which points BACKWARD), so a positive roll raises
    // the car's local +X — its RIGHT. Higher ground on the right therefore wants a
    // POSITIVE roll, and a left turn wants a NEGATIVE one, because a body leans OUT of a
    // corner and not into it. Both signs were wrong on the first pass and both are
    // invisible in a number; they show up the moment you look at the horizon.
    // The lean is keyed to the FRACTION of lock, not the wheel angle: the lock is a few
    // degrees at 23 m/s now (CFG.car.turn), and 0.023 is what MOSSWAY's 0.66 * 0.035
    // reached at full lock, so the body leans exactly as far as it did.
    const steerN = this.lockNow > 0 ? clamp(this.steer / this.lockNow, -1, 1) : 0;
    const wantRoll = Math.atan2(hr - hl, SAMPLE_SIDE * 2) * 0.72
      - steerN * Math.min(Math.abs(this.speed) / K.onRoad, 1) * ROLL_LEAN;
    this.pitch = damp(this.pitch, clamp(wantPitch, -K.pitchClamp, K.pitchClamp), TILT_LAMBDA, dt);
    this.roll = damp(this.roll, clamp(wantRoll, -K.rollClamp, K.rollClamp), TILT_LAMBDA, dt);

    const rough = onRoad ? 0.010 : 0.032;   // [mossway game.js:1871]
    const targetBob = Math.sin(this.travel * (onRoad ? 1.35 : 1.8)) * rough
      * Math.min(Math.abs(this.speed), 14);
    this.bob = damp(this.bob, targetBob, BOB_LAMBDA, dt);
  }

  /** Parked/entering/exiting: keep the pose alive on the terrain without driving it. */
  _settle(dt) {
    const terr = this._terrain;
    if (terr) this.y = damp(this.y, terr.heightAt(this.x, this.z), GROUND_LAMBDA, dt);
    this._tilt(dt, true);
  }

  /**
   * FIX 3. Trunks are resolved through collision so the car SLIDES off them; MOSSWAY
   * pushed out of its own tree list and multiplied speed by 0.58 PER FRAME
   * (donors/mossway/game.js:1799-1801), which stops the car dead and does it harder the
   * faster your monitor is. Here: a forward probe for the impact, then depenetration
   * off the two axle points, then a TIME-BASED scrub and a heading nudge along the
   * surface, which is the difference between hitting a tree and glancing off one.
   */
  _resolveContacts(dt, fx, fz) {
    const col = this._collision;
    if (!col) return;
    const feet = this.y;
    let hit = false, nx = 0, nz = 0;

    // --- forward probe: what did we just drive into ---
    if (col.raycast && Math.abs(this.speed) > 0.4) {
      const s = this.speed > 0 ? 1 : -1;
      _org.set(this.x - fx * s * 0.2, feet + 0.85, this.z - fz * s * 0.2);
      _dir.set(fx * s, 0, fz * s);
      const reach = Math.abs(this.speed) * dt + 2.35;
      const r = col.raycast(_org, _dir, reach, MASK.SOLID);
      // AUDIT FIX. This used to read `r.tag !== 'car'`. collision.js only fills `_tag`
      // from the object form of addCollider; addCircle (which is what _placeRoof uses)
      // never sets one, and 'car' there is the CHUNK ID, not a tag. So the guard was
      // dead and the car could depenetrate off its own parked roof. We know our own
      // collider ids — skip by id, and never reach into collision.js to fix it there.
      if (r && r.hit && !r.ground && !this._isOwnCollider(r.id)) {
        hit = true; nx = r.normal.x; nz = r.normal.z;
      }
    }

    // --- depenetration off THREE points along the spine, up to 3 passes ---
    // MEASURED: with only the two axle probes, a trunk beside the car's middle was never
    // seen and the body ended up 0.98 m from a trunk it should have been 1.57 m off —
    // the car ate the tree. Three points at -1.4 / 0 / +1.4 cover a 4.3 m body.
    if (col.debugNearest) {
      for (let pass = 0; pass < 3; pass++) {
        let moved = false;
        for (let a = 0; a < 3; a++) {
          const t = (a - 1) * 1.40;
          const ax = this.x + fx * t, az = this.z + fz * t;
          const near = col.debugNearest(ax, az, 3.0);
          if (!near) continue;
          // copy the scalars: debugNearest returns shared scratch (collision.js:497-506).
          const cx = near.x, cz = near.z, cr = near.radius;
          const y0 = near.y0, y1 = near.y1;
          // Skip our OWN roof colliders by id (collision.js:505 fills out.id). `near.tag`
          // is never set for an addCircle collider, so the old tag compare was dead code.
          if (this._isOwnCollider(near.id)) continue;
          if (y1 < feet + 0.34 || y0 > feet + ROOF_Y) continue;   // a kerb, or an overhang
          const minD = cr + 1.02;
          let dx = ax - cx, dz = az - cz;
          let d = Math.hypot(dx, dz);
          if (d >= minD) continue;
          if (d < 1e-4) { dx = -fz; dz = fx; d = 1; }
          const push = (minD - d) + 0.01;
          this.x += dx / d * push;
          this.z += dz / d * push;
          if (!hit) { nx = dx / d; nz = dz / d; }
          hit = true; moved = true;
        }
        if (!moved) break;
      }
    }

    // THE TRUNK ESCAPE (round 6, lane H — "It's not super smooth"). Full throttle into a
    // trunk used to grind at ~0.7 m/s for ever (round 5's D report): the throttle's 7 m/s^2
    // and the head-on scrub reached equilibrium there, and the slide-off nudge below is
    // scaled by speed / 14, so at 0.7 m/s it was 5% of itself and never turned the car off
    // the bark. Now the time spent slow, throttle held, in contact is counted, and the nudge
    // ramps to its full rate over CFG.car.trunk.stuckRamp seconds of it: the car turns along
    // the trunk and drives off. Letting go, or reversing, zeroes the count.
    // "In contact" has a short memory: the depenetration pushes the car clear by a centimetre
    // and the very next step reads no hit, then the throttle puts it back — so a bare `hit`
    // flickered every other step and the count never got past 0.1 s (measured). Contact ends
    // when nothing has touched for CONTACT_MEMORY seconds.
    if (hit) this._sinceHit = 0; else this._sinceHit += dt;
    const touching = hit || this._sinceHit < CONTACT_MEMORY;
    if (touching && this._throttle && Math.abs(this.speed) < TRUNK.stuckSpeed) this.stuckT += dt;
    else this.stuckT = 0;

    if (!hit) { if (!touching) this._slideSide = 0; return; }

    // The scrub, time-based. CFG.car.treeHit = { targetMul: 0.35, lambda: 12, glance: 0.12 }.
    //
    // ROUND 5. It scrubbed the same whether you drove INTO the trunk or brushed past it,
    // so threading a spur through trees was a crash every time a wing touched bark. The
    // scrub now scales with how square-on the contact is: `into` is the dot of the direction
    // of travel with the trunk's normal (1 = head-on, 0 = a graze along the flank), and the
    // damp target runs from targetMul at head-on to 1 - (1 - targetMul) * glance for a graze.
    // Measured at 6 m/s (tests/car.mjs): head-on still stops the car; a graze that kept
    // 1.34 m/s before keeps most of its speed now. The slide-off nudge below is unchanged.
    const before = this.speed;
    const vs = this.speed >= 0 ? 1 : -1;
    const into = clamp01(-(fx * vs * nx + fz * vs * nz));
    const shaped = K.treeHit.glance + (1 - K.treeHit.glance) * into;
    const mul = 1 - (1 - K.treeHit.targetMul) * shaped;
    this.speed = damp(this.speed, this.speed * mul, K.treeHit.lambda, dt);

    // The nudge: steer along the trunk rather than into it. The tangent is the normal
    // turned 90 degrees; take whichever of the two is closer to where we are pointing —
    // and KEEP IT for the rest of the contact (round 6). Exactly head-on the dot below is
    // zero and float noise decides its sign every step, so the nudge turned left, then
    // right, and the car ground on the bark going nowhere. The side is chosen once, on the
    // first step of a contact: by the wheel if the player is steering, else by the dot.
    const tx = -nz, tz = nx;
    if (this._slideSide === 0) {
      const dot = tx * fx + tz * fz;
      // the tangent's leftness: left = (fz, -fx) in this basis (right is (-fz, fx))
      const leftness = tx * fz - tz * fx;
      if (Math.abs(this.steer) > 0.02 && Math.abs(dot) < 0.35) {
        this._slideSide = (this.steer > 0 ? 1 : -1) * (leftness >= 0 ? 1 : -1);
      } else {
        this._slideSide = dot >= 0 ? 1 : -1;
      }
    }
    const s = this._slideSide;
    const want = Math.atan2(-tx * s, -tz * s);   // inverse of fwd = (-sin, 0, -cos)
    const dh = angleDelta(this.heading, want);
    // ROUND 6: the nudge's gain is the speed OR the time spent stuck, whichever is larger
    // (the accounting above): at 0.7 m/s the speed term is 0.05 and the car sat on the
    // bark; after stuckRamp seconds with the throttle held it is stuckGain — capped there,
    // because the full rate at 90 degrees off the tangent is 5 rad/s, which is a spin and
    // not a slide, and the view rides the nose.
    const gain = Math.max(clamp01(Math.abs(before) / 14), TRUNK.stuckGain * clamp01(this.stuckT / TRUNK.stuckRamp));
    this.heading = wrapAngle(this.heading + dh * gain * 3.2 * dt);

    const lost = Math.abs(before) - Math.abs(this.speed);
    if (this.hitCooldown <= 0 && lost > 0.35) {
      this.hitCooldown = HIT_COOLDOWN;
      this._noise('car:impact', 34);
      // The car keeps the dent. Drive it into enough trees and it will not do 23 any more,
      // and the one working lamp browns out with it — which is the only reason WHEEL 4's
      // 'Keep' has anything to repair.
      this.wear = clamp01(this.wear + clamp01(lost / 9) * WEAR_PER_IMPACT);
      if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), true);
      const fx2 = this._fx;
      if (fx2) {
        // BLOCKER. fx.trauma is a NUMBER (fx/fx.js:52); the setter is addTrauma
        // (fx/fx.js:232). `fx2.trauma(...)` threw a TypeError inside step() the moment
        // trauma went non-zero, and three throws in a row stop the whole loop.
        if (typeof fx2.addTrauma === 'function') fx2.addTrauma(clamp01(lost / 9) * 0.55);
        if (fx2.impact) {
          _v.set(this.x + fx * 2.0, feet + 0.9, this.z + fz * 2.0);
          _dir.set(nx, 0, nz);
          fx2.impact('wood', _v, _dir, clamp01(lost / 6) * 1.4);
        }
      }
    }
  }

  /* ----------------------------------------------------------------- ram -- */

  /**
   * THE RAM, round 6 (lane H). Alex, fifth playtest: "I want to be able to hit the mobsters."
   *
   * This ran only above progress.perk('ramMinSpeed', Infinity) — Infinity ON PURPOSE, so the
   * WHEEL 'Ram' node would be worth a point — and that contradicted DESIGN section 3, which
   * makes ramming a property of the car ("ram kills a pallbearer at >= 8 m/s and staggers a
   * Hunter") and gives the node a DIFFERENT job ("a hit >= 12 m/s pops a body instead of
   * scrubbing speed"). He drove into them and nothing happened. Now:
   *
   *   - at >= CFG.car.ram.speed (8 m/s) enemies.ramHit runs with no node at all; lane A does
   *     the damage by momentum, the stagger and the throw, and returns how many it caught;
   *   - the car PAYS for what it hit: each body scrubs a fraction of the speed keyed to its
   *     def.mass — scrubLight at massLight (a hound) rising to scrubHeavy at massHeavy (a
   *     pallbearer), so a hound is a bump and a pallbearer is a hit — floored at keepFloor,
   *     so no ram ever stops the car dead, and nothing here touches the heading;
   *   - the node (hook 'ramClean', base false) makes a hit at >= cleanSpeed (12 m/s) cost NO
   *     speed: the clean pop DESIGN describes.
   *
   * The bodies are READ off enemies.list() before the hit, with the same disc test ramHit
   * uses, to price it — and never written: lane A owns them. If ramHit reports more bodies
   * than the pricing saw, the difference is priced at the heavy rate, so a hit is never free
   * by accident. A thud goes out on 'noise' as 'car:ram' (the director's ear) and, until the
   * audio lane keys a real one to it (docs/ROUND-6/HANDOFF-H.md), as the dread pool's dry
   * wood at full gain — silence reads as broken. Allocates nothing.
   */
  _ram(dt) {
    this.ramT -= dt;
    if (this.ramT > 0) return;
    const speed = Math.abs(this.speed);
    if (!(speed >= RAM.speed)) return;
    this.ramT = RAM_EVERY;
    const en = this._enemies;
    if (!en || typeof en.ramHit !== 'function') return;
    const fx = -Math.sin(this.heading), fz = -Math.cos(this.heading);
    const s = this.speed > 0 ? 1 : -1;
    const cx = this.x + fx * s * 2.1, cz = this.z + fz * s * 2.1;

    // The node is read on every ram tick, hit or miss: hookReport() counts calls, and a hook
    // point that is only asked when a body happens to be in the disc looks dead all evening.
    const pr = this._progress;
    const owned = !!((pr && typeof pr.perk === 'function') ? pr.perk('ramClean', false) : false);

    // Price the hit BEFORE it lands: what is in the disc, by mass.
    let keep = 1, mass = 0, n = 0;
    const list = typeof en.list === 'function' ? en.list() : en.all;
    if (list && list.length) {
      const r = RAM_RADIUS + 0.4;
      for (let i = 0; i < list.length; i++) {
        const e = list[i];
        if (!e || !e.alive || !e.pos || !e.def) continue;
        const dx = e.pos.x - cx, dz = e.pos.z - cz;
        const rr = r + (e.def.radius || 0);
        if (dx * dx + dz * dz > rr * rr) continue;
        const m = typeof e.def.mass === 'number' ? e.def.mass : RAM.massHeavy;
        const frac = RAM.scrubLight + (RAM.scrubHeavy - RAM.scrubLight)
          * clamp01((m - RAM.massLight) / (RAM.massHeavy - RAM.massLight));
        keep *= 1 - frac;
        mass += m; n++;
      }
    }

    const hits = en.ramHit(cx, cz, RAM_RADIUS, speed, fx * s, fz * s);
    const L = this._ramLast;
    L.hits = hits; L.n = n; L.mass = mass; L.before = this.speed;
    if (!(hits > 0)) { L.keep = 1; L.after = this.speed; L.clean = false; return; }
    for (let k = n; k < hits; k++) keep *= 1 - RAM.scrubHeavy;
    keep = Math.max(keep, RAM.keepFloor);
    const clean = owned && speed >= RAM.cleanSpeed;
    if (clean) keep = 1;
    this.speed *= keep;
    L.keep = keep; L.after = this.speed; L.clean = clean;

    // A ram is not free: the car pays for exactly the bodies it actually hit, never for a
    // swing at air.
    this.wear = clamp01(this.wear + WEAR_PER_RAM_HIT * hits);
    if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), true);
    this._noise('car:ram', 30);
    this._say('branch', 1.0, cx, this.y + 0.9, cz);
    const fxs = this._fx;
    if (fxs) {
      if (typeof fxs.addTrauma === 'function') fxs.addTrauma(clamp01(hits * 0.18) * 0.6 + (1 - keep) * 0.5);
      if (fxs.impact) {
        _v.set(cx, this.y + 0.9, cz);
        _dir.set(-fx * s, 0, -fz * s);
        fxs.impact('flesh', _v, _dir, clamp01(speed / RAM.cleanSpeed));
      }
    }
  }

  /* --------------------------------------------------------------- crush -- */

  /**
   * THE CRUSH, round 7 (lane F). docs/NEXT.md section C: "Crushing things with the car.
   * Needs breakable colliders across three owners' files." They are one owner's files now.
   *
   * Every driving step, one disc at the nose asks the collider field what it can go
   * through at this speed (collision.crush). Everything it names is ALREADY GONE from the
   * field by the time this returns — so the sweep two lines further down in _integrate
   * drives through the hole in the same step, and there is no frame in which the car is
   * both past the fence and still colliding with it.
   *
   * Then we pay for it: a bite of speed by mass, a kick on the nose for anything clipped
   * off-centre, the geometry taken down, debris thrown, a thud, and a short camera knock.
   *
   * Allocates nothing. `col.crush` fills a shared result and we read it before anything
   * else can call it.
   */
  _crushStep(dt, fx, fz) {
    const col = this._collision;
    if (!col || typeof col.crush !== 'function') return 0;
    const speed = Math.abs(this.speed);
    if (speed < 2.6) return 0;
    const s = this.speed > 0 ? 1 : -1;
    // The disc sits at the nose and grows by half a step of travel, so nothing thin slips
    // between two fixed steps at 23 m/s (0.38 m per step).
    const cx = this.x + fx * s * CRUSH_LEAD, cz = this.z + fz * s * CRUSH_LEAD;
    const rad = CRUSH_R + speed * dt * 0.5;
    const n = col.crush(cx, cz, rad, this.y + CRUSH_BAND_LO, this.y + CRUSH_BAND_HI, speed);
    const L = this._crushLast;
    L.n = n; L.before = this.speed; L.after = this.speed; L.keep = 1; L.yaw = 0;
    if (!n) { L.mass = 0; L.tag = null; return 0; }

    const res = col.crushResult();
    const rx = Math.cos(this.heading), rz = -Math.sin(this.heading);
    let keep = 1, kick = 0, heaviest = 0;
    L.mass = res.mass; L.tag = res.tag[0];
    for (let i = 0; i < n; i++) {
      const m = res.m[i];
      if (m > heaviest) { heaviest = m; L.tag = res.tag[i]; }
      keep *= 1 - clamp(m / CRUSH_MASS_REF, CRUSH_BITE_MIN, CRUSH_BITE_MAX);
      // How far off the spine it was, signed: + is the car's right, and a thing on the
      // right shoves the nose LEFT, which is a rising heading in this basis (_tilt).
      const lat = (res.x[i] - this.x) * rx + (res.z[i] - this.z) * rz;
      kick += clamp(lat / CRUSH_R, -1, 1) * clamp01(m / CRUSH_MASS_REF) * CRUSH_YAW_MAX;
      this._takeDown(res.x[i], res.z[i], res.y[i], m, res.tag[i]);
    }
    keep = Math.max(keep, CRUSH_KEEP_FLOOR);
    this.speed *= keep;
    // Owed, not applied: _payKick spends it over the next fifth of a second.
    this.kickOwed = clamp(this.kickOwed + kick, -CRUSH_YAW_MAX * 2, CRUSH_YAW_MAX * 2);
    L.keep = keep; L.after = this.speed; L.yaw = kick;
    this.crushCount += n; this.crushMass += res.mass;

    // The car takes something off it too — a bumper full of fence posts is why WHEEL 4's
    // 'Keep' has anything to repair.
    this.wear = clamp01(this.wear + CRUSH_WEAR * (res.mass / 100));
    if (this.headlightsOn && this.body) this.body.setLamp(this._filament(), true);

    // A thud, on both channels: 'noise' is what the director hears, dread('branch') is dry
    // close wood and is the honest stand-in until the audio lane keys a real crash to
    // source 'car:crush' (docs/ROUND-7/HANDOFF-F.md). The noise goes out whoever is
    // driving — it is a real disturbance in the county either way — but the thud and the
    // camera knock belong to the DRIVER, and the driver may be the pilot.
    const driven = this.mode === 'driving';
    this._noise('car:crush', 24 + Math.min(res.mass, 200) * 0.09, cx, cz);
    if (driven) {
      this._say('branch', clamp(0.55 + res.mass / 260, 0.55, 1.0), cx, this.y + 0.8, cz);
      const fxs = this._fx;
      if (fxs && typeof fxs.addTrauma === 'function') {
        fxs.addTrauma(clamp01(res.mass / 220) * CRUSH_TRAUMA + 0.10);
      }
    }
    // Preallocated, like controller.js's _climbPayload: read it synchronously, never retain
    // it. The hot path allocates nothing (CONTRACT).
    _brokePayload.x = cx; _brokePayload.y = this.y + 0.6; _brokePayload.z = cz;
    _brokePayload.mass = res.mass; _brokePayload.n = n; _brokePayload.tag = L.tag;
    this._emit('world:broke', _brokePayload);
    return n;
  }

  /**
   * Pay out whatever nose kick a crush still owes, exponentially. Called from _integrate
   * every driving step, after the steering and before the position update, so the kick and
   * the wheel go through the same heading and the same interpolation. Costs nothing when
   * nothing is owed.
   */
  _payKick(dt) {
    if (!this.kickOwed) return;
    const d = this.kickOwed * (1 - Math.exp(-CRUSH_KICK_LAMBDA * dt));
    this.kickOwed -= d;
    if (Math.abs(this.kickOwed) < 1e-5) this.kickOwed = 0;
    this.heading = wrapAngle(this.heading + d);
  }

  /**
   * TAKE THE THING DOWN, and throw what is left of it.
   *
   * A destination is ONE merged geometry (sites.js's discipline note), so a broken prop
   * cannot be a mesh we remove. Instead sites.js brackets each smashable thing with
   * `k.solid.open()/close()` and writes its VERTEX RANGE onto the finished geometry as
   * `geometry.userData.breakParts`. Here we find the part whose world position matches the
   * collider that just broke and collapse those vertices to their own centroid: the
   * triangles degenerate, the thing is gone, and not one other triangle in the merge moves.
   *
   * This READS another lane's scene graph (places.group / wilds.group) and writes one
   * attribute on one geometry. It never touches their files. A proper
   * `places.breakPart(x, z)` is requested in docs/ROUND-7/HANDOFF-F.md; until it lands,
   * this is guarded at every step and a miss costs nothing but the debris being generic.
   */
  _takeDown(wx, wz, wy, mass, tag) {
    let colour = null, top = wy;
    const sys = this.ctx.systems;
    for (let s = 0; s < 2; s++) {
      const owner = sys ? sys.get(s === 0 ? 'places' : 'wilds') : null;
      const root = owner && owner.group ? owner.group : null;
      if (!root || !root.children) continue;
      for (let i = 0; i < root.children.length && !colour; i++) {
        const site = root.children[i];
        if (!site) continue;
        const dx = site.position.x - wx, dz = site.position.z - wz;
        if (dx * dx + dz * dz > 3600) continue;          // 60 m: not this site
        site.traverse((o) => {
          if (colour) return;
          const geo = o.geometry;
          const parts = geo && geo.userData ? geo.userData.breakParts : null;
          if (!parts || !parts.length) return;
          o.updateWorldMatrix(true, false);
          for (let p = 0; p < parts.length; p++) {
            const part = parts[p];
            if (part.gone) continue;
            _v.set(part.x, 0, part.z).applyMatrix4(o.matrixWorld);
            const ex = _v.x - wx, ez = _v.z - wz;
            if (ex * ex + ez * ez > 1.0) continue;       // within a metre: this is the one
            colour = part.col || null;
            top = collapsePart(geo, part);
            part.gone = true;
            break;
          }
        });
      }
      if (colour) break;
    }
    this._throwDebris(wx, wy, wz, mass, colour, tag);
    return !!colour;
  }

  /**
   * ROUND 13: BREAKABLE BOXES. The gun and the stock take the same things apart the bumper
   * does, so combat.js asks the car — the owner of the merged-part collapse and the debris
   * pool — to do the taking down, with the debris thrown along the shot at `speed` m/s
   * rather than along the car. Returns true when a merged part was found and collapsed.
   */
  takeDown(wx, wz, wy, mass, tag, dirX, dirZ, speed) {
    const L = Math.hypot(dirX || 0, dirZ || 0);
    this._debDir = L > 1e-6;
    this._debX = this._debDir ? dirX / L : 0;
    this._debZ = this._debDir ? dirZ / L : 0;
    this._debSpd = speed > 0 ? Math.min(speed, 26) : 0;
    let hit = false;
    try { hit = this._takeDown(wx, wz, wy, mass, tag); }
    finally { this._debDir = false; }
    return hit;
  }

  /** Ensure the debris pool exists. One geometry, one mesh, one draw, no new material. */
  _debris() {
    if (this._deb) return this._deb;
    const scene = this.ctx.scene;
    if (!scene) return null;
    // Borrow a material that already exists rather than making one: a new material is a
    // new shader program against CFG.render.budget.programsMax (AGENTS.md). The places
    // lane's body material is the right look — this IS their scenery, in pieces.
    const places = this.ctx.systems ? this.ctx.systems.get('places') : null;
    const mat = (places && places.matBody) || (this.body && this.body.materials && this.body.materials[0]);
    if (!mat) return null;
    const built = buildDebrisGeometry(DEBRIS_POOL);
    const mesh = new THREE.Mesh(built.geo, mat);
    mesh.name = 'car-debris';
    mesh.frustumCulled = false;
    mesh.castShadow = false; mesh.receiveShadow = false;
    mesh.visible = false;
    scene.add(mesh);
    const n = built.pieces;
    const d = {
      geo: built.geo, mesh, base: built.base, baseN: built.baseN, per: built.per, n,
      live: new Uint8Array(n), next: 0, alive: 0,
      x: new Float64Array(n), y: new Float64Array(n), z: new Float64Array(n),
      px: new Float64Array(n), py: new Float64Array(n), pz: new Float64Array(n),
      vx: new Float64Array(n), vy: new Float64Array(n), vz: new Float64Array(n),
      a: new Float64Array(n), b: new Float64Array(n), c: new Float64Array(n),
      pa: new Float64Array(n), pb: new Float64Array(n), pc: new Float64Array(n),
      wa: new Float64Array(n), wb: new Float64Array(n), wc: new Float64Array(n),
      life: new Float64Array(n), rest: new Float64Array(n),
    };
    this._deb = d;
    // Every piece starts collapsed to a point, so the very first frame draws nothing.
    for (let i = 0; i < n; i++) this._parkPiece(i);
    return d;
  }

  /** Collapse one piece's vertices to the origin: 24 degenerate triangles, invisible. */
  _parkPiece(i) {
    const d = this._deb;
    const arr = d.geo.attributes.position.array;
    const v0 = i * d.per * 3, v1 = v0 + d.per * 3;
    for (let v = v0; v < v1; v++) arr[v] = 0;
  }

  /**
   * Throw the pieces. `mass` decides how many and how hard; the car's own heading and speed
   * decide where they go, so debris always leaves along the direction of travel — which is
   * the read that says YOU did that, and not that a thing fell over near you.
   */
  _throwDebris(wx, wy, wz, mass, colour, tag) {
    const d = this._debris();
    if (!d) return 0;
    const pieces = Math.min(10, 4 + Math.round(mass / 14));
    const rng = this.ctx.rng ? this.ctx.rng.fork('car-crush') : null;
    const rnd = () => (rng ? rng.next() : 0.5);
    // along the car, or (ROUND 13, takeDown) along whatever broke it
    const fx = this._debDir ? this._debX : -Math.sin(this.heading);
    const fz = this._debDir ? this._debZ : -Math.cos(this.heading);
    const s = this._debDir ? 1 : (this.speed >= 0 ? 1 : -1);
    const spd = this._debDir ? this._debSpd : Math.min(Math.abs(this.speed), 26);
    const col = d.geo.attributes.color.array;
    // 0.6x THE THING'S OWN ALBEDO. The pieces are thrown 1-3 m in front of the bonnet,
    // which is the core of the headlamp's cone: CFG.lights.headlight is 420 cd with decay
    // 2, so at 1.5 m that is ~187 lux and an albedo the rest of the county renders at 50
    // clips to white there. Photographed at tests/shots/f-crush-debris.png. ART.md 1.9's
    // diagnosis is exactly this — "it blows out because of the albedos it is landing on,
    // not because of the candela" — and the albedo is the half of it this lane owns.
    // Flagged for the art owner in docs/ROUND-7/HANDOFF-F.md: it wants a proper measure
    // against ART 0.3 row 12 (only lamps and glints above 150, on <= 1.5% of the frame).
    const K6 = 0.6;
    const r = (colour ? colour[0] : 0.14) * K6;
    const g = (colour ? colour[1] : 0.13) * K6;
    const b = (colour ? colour[2] : 0.12) * K6;
    for (let p = 0; p < pieces; p++) {
      const i = d.next; d.next = (d.next + 1) % d.n;
      if (!d.live[i]) d.alive++;
      d.live[i] = 1;
      d.x[i] = d.px[i] = wx + (rnd() - 0.5) * 0.9;
      d.y[i] = d.py[i] = wy + (rnd() - 0.3) * 0.7;
      d.z[i] = d.pz[i] = wz + (rnd() - 0.5) * 0.9;
      // Forward with the car, up, and a spray sideways. The forward term is 0.45 of the
      // car's own speed: fast enough that the pieces stay ahead of you for a beat.
      const side = (rnd() - 0.5) * 2;
      d.vx[i] = fx * s * spd * 0.45 + (-fz) * side * (2.4 + rnd() * 3.4) + (rnd() - 0.5) * 1.6;
      d.vz[i] = fz * s * spd * 0.45 + (fx) * side * (2.4 + rnd() * 3.4) + (rnd() - 0.5) * 1.6;
      d.vy[i] = 2.6 + rnd() * 4.2 + spd * 0.10;
      d.a[i] = d.pa[i] = rnd() * TAU; d.b[i] = d.pb[i] = rnd() * TAU; d.c[i] = d.pc[i] = rnd() * TAU;
      d.wa[i] = (rnd() - 0.5) * 16; d.wb[i] = (rnd() - 0.5) * 16; d.wc[i] = (rnd() - 0.5) * 16;
      d.life[i] = DEBRIS_LIFE * (0.72 + rnd() * 0.56);
      d.rest[i] = 0;
      const v0 = i * d.per * 3;
      for (let v = 0; v < d.per; v++) {
        col[v0 + v * 3] = r; col[v0 + v * 3 + 1] = g; col[v0 + v * 3 + 2] = b;
      }
    }
    d.geo.attributes.color.needsUpdate = true;
    d.mesh.visible = true;
    return pieces;
  }

  /** Debris physics. Fixed step, no rendering — present() draws it interpolated. */
  _stepDebris(dt) {
    const d = this._deb;
    if (!d || !d.alive) return;
    const terr = this._terrain;
    for (let i = 0; i < d.n; i++) {
      if (!d.live[i]) continue;
      d.px[i] = d.x[i]; d.py[i] = d.y[i]; d.pz[i] = d.z[i];
      d.pa[i] = d.a[i]; d.pb[i] = d.b[i]; d.pc[i] = d.c[i];
      d.life[i] -= dt;
      if (d.life[i] <= 0) { d.live[i] = 0; d.alive--; this._parkPiece(i); continue; }
      if (d.rest[i] > 0) continue;                    // settled: it just lies there
      d.vy[i] -= DEBRIS_GRAV * dt;
      d.x[i] += d.vx[i] * dt; d.y[i] += d.vy[i] * dt; d.z[i] += d.vz[i] * dt;
      d.a[i] += d.wa[i] * dt; d.b[i] += d.wb[i] * dt; d.c[i] += d.wc[i] * dt;
      const gy = terr ? terr.heightAt(d.x[i], d.z[i]) : 0;
      if (d.y[i] <= gy + 0.06) {
        d.y[i] = gy + 0.06;
        if (d.vy[i] < -1.6) {
          // one bounce, then it lies down: nothing floaty
          d.vy[i] = -d.vy[i] * DEBRIS_BOUNCE;
          d.vx[i] *= 0.48; d.vz[i] *= 0.48;
          d.wa[i] *= 0.42; d.wb[i] *= 0.42; d.wc[i] *= 0.42;
        } else {
          d.vx[i] = 0; d.vy[i] = 0; d.vz[i] = 0;
          d.wa[i] = d.wb[i] = d.wc[i] = 0;
          d.rest[i] = 1;
        }
      }
    }
    if (!d.alive) d.mesh.visible = false;
  }

  /** Debris presentation. Interpolated (CONTRACT), one attribute upload, one draw. */
  _presentDebris(a) {
    const d = this._deb;
    if (!d || !d.mesh.visible) return;
    const pos = d.geo.attributes.position.array;
    const nor = d.geo.attributes.normal.array;
    const base = d.base, baseN = d.baseN, per = d.per;
    for (let i = 0; i < d.n; i++) {
      if (!d.live[i]) continue;
      const x = lerp(d.px[i], d.x[i], a), y = lerp(d.py[i], d.y[i], a), z = lerp(d.pz[i], d.z[i], a);
      const ra = d.pa[i] + angleDelta(d.pa[i], d.a[i]) * a;
      const rb = d.pb[i] + angleDelta(d.pb[i], d.b[i]) * a;
      const rc = d.pc[i] + angleDelta(d.pc[i], d.c[i]) * a;
      // A YXZ rotation as nine numbers. No Matrix4, no Euler, no allocation.
      const sa = Math.sin(ra), ca = Math.cos(ra);
      const sb = Math.sin(rb), cb = Math.cos(rb);
      const sc = Math.sin(rc), cc = Math.cos(rc);
      const m00 = cb * cc + sb * sa * sc, m01 = -cb * sc + sb * sa * cc, m02 = sb * ca;
      const m10 = ca * sc, m11 = ca * cc, m12 = -sa;
      const m20 = -sb * cc + cb * sa * sc, m21 = sb * sc + cb * sa * cc, m22 = cb * ca;
      const o = i * per * 3;
      for (let v = 0; v < per; v++) {
        const k = o + v * 3;
        const bx = base[k], by = base[k + 1], bz = base[k + 2];
        pos[k] = x + m00 * bx + m01 * by + m02 * bz;
        pos[k + 1] = y + m10 * bx + m11 * by + m12 * bz;
        pos[k + 2] = z + m20 * bx + m21 * by + m22 * bz;
        const nx = baseN[k], ny = baseN[k + 1], nz = baseN[k + 2];
        nor[k] = m00 * nx + m01 * ny + m02 * nz;
        nor[k + 1] = m10 * nx + m11 * ny + m12 * nz;
        nor[k + 2] = m20 * nx + m21 * ny + m22 * nz;
      }
    }
    d.geo.attributes.position.needsUpdate = true;
    d.geo.attributes.normal.needsUpdate = true;
  }

  /* ---------------------------------------------------------------- horn -- */

  /**
   * WHEEL 3, 'Horn' — hook 'onHorn' (nodes.js:125-126). H, from the seat.
   *
   * The horn belongs to the CAR: pressing it is a 46 m disturbance whatever you own, and
   * a control that answers with nothing reads as broken. The NODE is what turns it into a
   * TOOL — it wakes everything already alerted inside 80 m and walks it in to this spot,
   * which is what makes "then get out and walk away" a plan rather than a joke. So the
   * hook is fired unconditionally and the tree decides what the sound means. Firing it
   * with nothing installed is also what keeps progress.hookReport() honest: a hook point
   * with installers and zero lifetime runs is the defect that audit hunts for.
   */
  _horn(dt) {
    this.hornT = Math.max(0, this.hornT - dt);
    // Read both doors EVERY fixed step. `pressed` makes every fresh tap immediate even if a
    // previous honk is still ringing; held is the accessibility/focus fallback and repeats
    // at a physical, readable cadence without trusting browser key-repeat.
    const pressed = this._hornPressed();
    const held = this._hornHeld();
    const beganHeld = held && !this.hornHeld;
    this.hornHeld = held;
    if (!pressed && !beganHeld && !(held && this.hornT <= 0)) return;
    this.hornT = HORN_REPEAT;
    this.hornCount++;
    this._noise('car:horn', HORN_NOISE_R);
    // Input, AI hearing and perk hooks are accepted exactly once here. If the browser's
    // audio clock is not ready yet, only the audible answer is deferred; repeated presses
    // while suspended coalesce into the same one-bit debt.
    this.hornSoundPending = !this._soundHorn();
    const pr = this._progress;
    if (pr && typeof pr.fire === 'function') pr.fire('onHorn', this.x, this.z);
  }

  /** Settle one horn sound deferred while audio was unavailable; never replay game effects. */
  _flushHornSound() {
    if (!this.hornSoundPending || !this._soundHorn()) return false;
    this.hornSoundPending = false;
    return true;
  }

  /**
   * A short two-tone horn through audio.js's PUBLIC pooled one-shot door. `noise` is an AI
   * event, not an audible channel, and audio.js does not subscribe to it; that made a
   * mechanically successful H press sound exactly like a failed one.
   *
   * We pitch the existing clean `dmg_ring0` bake down from 3150 Hz to 370 / 466 Hz. At that
   * pitch, on the world bus, it no longer resembles the dry 3.15 kHz damage cue; the close
   * interval is the unmistakable old-car horn. More importantly, car.js creates NO raw
   * AudioNodes: voice limits, scheduling, release, mix law and disposal remain audio.js's.
   */
  _soundHorn() {
    const a = this._audio;
    const ac = a && (a.audioCtx || a.context || a.actx);
    // Fast-forward tests and autoplay-blocked/suspended tabs must never accumulate a future
    // graph. A real E/H gesture resumes audio before this fixed step; if it did not, the AI
    // noise still fires but no sound is booked into a clock that is not advancing.
    if (!a || a.enabled !== true || !a.baked || a.silent || !ac || ac.state !== 'running'
        || typeof a.spec !== 'function' || typeof a.play !== 'function'
        || typeof a.has !== 'function' || !a.has('dmg_ring0')) return false;

    let voices = 0;
    for (let n = 0; n < 2; n++) {
      const rate = (n === 0 ? 370 : 466) / 3150;
      const s = a.spec();
      s.x = null;                // the driver hears their own horn centred in the cabin
      s.gain = n === 0 ? 0.15 : 0.12;
      s.rate = rate;
      s.bus = 'world';
      s.send = 0.08;
      s.air = false; s.occl = false;
      s.lpHz = 1800;
      s.filterHz = 620; s.toneDb = 2.0;
      s.offset = 0.030;
      s.dur = rate * 0.31;       // playBuf divides by rate: exactly 0.31 s at either pitch
      s.priority = 1;
      if (a.play('dmg_ring0', s)) voices++;
    }
    if (voices > 0) this.hornSoundCount++;
    return voices > 0;
  }

  /* --------------------------------------------------------------- carry -- */

  /**
   * While you are in it, the player body rides the car. The chunk ring, the moon's
   * shadow box, the torch and every distance query in the game are keyed off the
   * player, so a passenger who stayed at the door would stream the wrong county.
   *
   * AUDIT FIX, and it is a feel bug, not a tidy-up. This used to call p.teleport() EVERY
   * driving step. teleport() runs the controller's _sync(), which collapses prev == curr
   * == render — so the player's interpolation was dead for the whole drive, and because
   * the controller kept simulating underneath the car it went on emitting player:step
   * and player:land into the dread lane's mimic beat and the audio lane's footsteps
   * while you were sitting in a vehicle. You could hear yourself walking at 23 m/s.
   *
   * THE CARRIED PATH (player lane owns it, added this round):
   *   p.setCarried(true|false)  — the controller freezes: no locomotion, no ground
   *                              resolve, and crucially no player:step / player:land.
   *   p.carryTo(x, y, z)        — optional; write the ridden pose and let the controller
   *                              roll its own prev/curr so interpolation stays alive.
   * With neither present we write p.pos directly, which is still strictly better than
   * teleport because it never calls _sync(). The only teleport is the single placement
   * at _beginEnter — one frame, one time, where a prev/curr collapse is CORRECT.
   */
  _carryPlayer() {
    const p = this._player;
    if (!p) return;
    if (typeof p.carryTo === 'function') { p.carryTo(this.x, this.y, this.z); }
    else if (p.pos) { p.pos.x = this.x; p.pos.y = this.y; p.pos.z = this.z; }
    if (p.vel) p.vel.set(0, 0, 0);
    // yaw is NOT written: the camera lane owns aim, and _clampSeatLook already holds it
    // inside the seat's cone. Writing it here fought the clamp and the mouse both.
  }

  /**
   * Ask the player lane to freeze / unfreeze. `setCarried` is the door; `freeze` is the
   * flag form of the same thing. Neither is required for the car to work — see
   * _carryPlayer — but without one of them the controller keeps stepping under the car.
   */
  _setCarried(on) {
    on = !!on;
    this._carried = on;
    const p = this._player;
    if (!p) return;
    if (typeof p.setCarried === 'function') p.setCarried(on);
    else if (typeof p.freeze === 'boolean') p.freeze = on;
    if (!on && p.vel) p.vel.set(0, 0, 0);
  }

  /**
   * Let go of the player, right now, without running the exit animation. Called from the
   * player:died / player:respawn listeners — we LISTEN to those, we never emit them.
   */
  _forceRelease() {
    const wasIn = !!(this.ctx.shared && this.ctx.shared.inCar);
    this.beacon = false;
    this._setCarried(false);
    this._carrySeated = false;
    this._setFovBias(0);
    this.stuckT = 0;
    this.holdT = 0;
    this.hornT = 0;
    this.hornHeld = false;
    this.hornSoundPending = false;
    this.refuseLatch = false;
    this._useConsumed = true;     // a key still down through a death does not re-enter
    this._creaked = false;
    this._releaseCabin();
    // BLOCKER 1, and this one is unconditional: it runs even when the player was not in
    // the car, because death and respawn are exactly the moments a car left lit somewhere
    // out on the loop would go on pinning ctx.shared.lit with nobody near it. No cool-down
    // beat here — a death is not a beat this file gets to add to.
    this._setHeadlights(false);
    if (!wasIn) return false;
    if (this.ctx.shared) this.ctx.shared.inCar = false;
    this.engineOn = false;
    this.speed = 0; this.steer = 0;
    this.mode = this.exists ? 'idle' : 'none';
    this.spawnCooldown = SPAWN_COOLDOWN;
    if (this.exists) this._placeRoof();
    this._emit('car:exited', null);
    return true;                  // ROUND 13: the respawn listener re-parks a car you died in
  }

  /* ------------------------------------------------------------- present -- */

  /**
   * FIX 2. Everything visible is composed from the interpolated pose. Removing this
   * method leaves the simulation identical and the car a 60 Hz staircase.
   */
  present(alpha) {
    const a = alpha === undefined ? 1 : alpha;
    this._presentDebris(a);              // outlives the car; drawn before the early return
    if (!this.body || !this.exists) return;

    const x = lerp(this.prevX, this.x, a);
    const y = lerp(this.prevY, this.y, a);
    const z = lerp(this.prevZ, this.z, a);
    const h = this.prevHeading + angleDelta(this.prevHeading, this.heading) * a;
    const pitch = lerp(this.prevPitch, this.pitch, a);
    const roll = lerp(this.prevRoll, this.roll, a);
    const bob = lerp(this.prevBob, this.bob, a);
    const steer = lerp(this.prevSteer, this.steer, a);
    const wheelRot = lerp(this.prevWheelRot, this.wheelRot, a);
    const doorA = lerp(this.prevDoorA, this.doorA, a);
    const cabin = lerp(this.prevCabin, this.cabin, a);

    const root = this.body.root;
    root.position.set(x, y + bob, z);
    root.rotation.order = 'YXZ';             // fix 1
    root.rotation.set(pitch, h, roll);
    // No updateMatrixWorld here: the renderer walks the scene once per frame and nothing
    // in this file reads the car's world matrix. Forcing the subtree would be nine
    // redundant compositions every frame for a prop that is one object.

    /* ---- wheels: they steer and they spin ---- */
    const wheels = this.body.wheels;
    for (let i = 0; i < WHEEL_OFFSETS.length; i++) {
      const w = WHEEL_OFFSETS[i];
      // `steer` is the front wheel angle itself (CFG.car.turn): the wheels are drawn at
      // the angle the kinematics turn on, no scaling.
      _e.set(wheelRot, w.front ? steer : 0, 0, 'YXZ');
      _q.setFromEuler(_e);
      _pos.set(w.x, w.y, w.z);
      _m.compose(_pos, _q, _s);
      this.body.wheels.setMatrixAt(i, _m);
    }
    wheels.instanceMatrix.needsUpdate = true;
    // The rim group is tilted back on its column, so its local +Z points up-and-back —
    // at the driver. A positive rotation about it reads counter-clockwise from the seat,
    // which is what a left turn looks like from behind a steering wheel.
    this.body.steer.rotation.z = steer * RIM_RATIO;

    /* ---- the door, and the light behind it ---- */
    // The one part of this prop that is a VERB. Both are interpolated, so the swing is
    // smooth at any frame rate and the light comes up with it rather than in steps.
    if (this.body.setDoor) this.body.setDoor(doorA);
    if (this.body.setCabin) this.body.setCabin(cabin);
    if (this.cabinHandle) {
      // the rover rides the door's own hinge arc, so the pool of warm light on the ground
      // swings out with the panel instead of sitting in the middle of a shut car
      const rx0 = Math.cos(h), rz0 = -Math.sin(h);
      const fx0 = -Math.sin(h), fz0 = -Math.cos(h);
      const swing = doorA * 0.62;
      const lx0 = DOOR_HINGE.x - swing * 0.55, lz0 = DOOR_HINGE.z + 0.62;
      // lz0 is local (forward = -Z): minus the forward vector, like the seat and the door.
      this.cabinHandle.setPosition(
        x + rx0 * lx0 - fx0 * lz0,
        y + bob + 1.05,
        z + rz0 * lx0 - fz0 * lz0,
      );
      if (this.cabinHandle.setIntensity) this.cabinHandle.setIntensity(CABIN_POOL * cabin);
    }

    /* ---- the working headlamp ---- */
    if (this.headlightsOn) {
      const L = this._lights;
      // Self-heal: borrow() returns null when all 32 logical slots are taken, and the
      // switch that asked for it has already latched on. Without this retry a headlamp
      // that lost the draw once stays half-dark for the life of the page — the silent
      // half-failure this project keeps finding.
      if (!this.headHandle && L && L.borrow) {
        this.headHandle = L.borrow('headlamp', x, y + 1.0, z, 0xffdca6, HEAD_POOL, 0);
      }
      const fx = -Math.sin(h), fz = -Math.cos(h);
      const rx = Math.cos(h), rz = -Math.sin(h);
      const lx = x + rx * -0.66 + fx * 2.16;
      const ly = y + bob + 1.02;
      const lz = z + rz * -0.66 + fz * 2.16;
      // ART.md 7.3 — THE COOL-DOWN HAS TO BE A DIM, AND MEASURED IT WAS NOT. The park
      // cool-down faded the lens emissive and the beat looked right on the car, but
      // ctx.shared.lit sat flat at 0.567 through lampFade 0.844 -> 0.226 and then fell off a
      // cliff to 0.069 when the SpotLight was finally switched off. The lamp dimmed; the
      // light in the world did not. That is the working-but-illegible failure again, on the
      // one signal this game trades in — "seeing is how you are seen".
      //
      // Two of the three lamps that make up that beat are ours and are dimmed here:
      //   the lens emissive (body.setLamp, driven by _filament()), and
      //   the borrowed rover that pools warm light on the nose (setIntensity below).
      // The third is the census SpotLight, and gfx/lights.js:555 has no level argument:
      // setHeadlights(on, ...) writes CFG.lights.headlight.intensity or zero and nothing
      // between. The request for a level parameter is in docs/HANDOFF.md; the filament is
      // passed as the eighth argument NOW, which today's signature simply ignores, so the
      // beat completes itself the day that lands with no further edit here.
      const fil = this._filament();
      // aimed forward and 3 degrees down, so 60 m of road is lit and the canopy is not
      if (L && L.setHeadlights) L.setHeadlights(true, lx, ly, lz, fx, -0.055, fz, fil);
      if (this.headHandle && this.headHandle.setPosition) {
        this.headHandle.setPosition(lx + fx * 0.9, ly + 0.05, lz + fz * 0.9);
        // The rover IS ours (lights.js:344 borrow / :161 setIntensity), so this half of the
        // dim works today. HEAD_POOL is the value the borrow asked for; scaling it is the
        // whole of the change.
        if (this.headHandle.setIntensity) this.headHandle.setIntensity(HEAD_POOL * fil);
      }
    }

    /* ---- the seat camera ---- */
    // MOSSWAY game.js:2212-2236 (updateCamera): offset (-0.31, 1.66, -0.50), the look
    // added to the heading, the car's own pitch bled in at 0.12, FOV rising with speed.
    // Composed here, AFTER player/camera.js has written its own pose (manifest 12 vs our
    // 19), so we never fight it and never replace ctx.camera — we mutate it.
    const inCar = this.mode === 'driving' || this.mode === 'entering' || this.mode === 'exiting';
    if (!inCar) return;
    const cam = this.ctx.camera;
    if (!cam) return;

    //
    // ROUND 5, ALEX'S FOURTH PLAYTEST: "it seems to put you in the back seat and you can't
    // see the road well." He was right and this is the line. SEAT is a LOCAL offset in the
    // body's frame — carbody.js builds the dash, the binnacle, the glass line and both
    // pillars around (-0.31, 1.66, -0.50) with forward = -Z, so z = -0.50 is half a metre
    // FORWARD of the origin, between the A-pillars. This composed it as x + fwd * z, and a
    // negative z along the forward vector is half a metre BEHIND the origin: local +0.50,
    // behind the B-pillar, eye-to-eye with the driver's headrest. Measured with the GEOMETRY
    // instrument in tests/car.mjs (rays through the real camera against the car's meshes —
    // the differential luma masks cannot see dark paint over dark road and under-read this
    // 2-3x, verification round 1): at rest the car covered 71.8% of the frame's centre band
    // and 98.3% of its middle third, and the column you steer into was blocked for the whole
    // band. After: 12.9% and 5.5%, the column open down 94% of the band — the A-pillar at
    // the edge and the bonnet's far edge under the road. At 15 m/s on a 13% climb the body
    // pitches nose-up 0.11 and a band of bodywork swings up across the view: 32.9% and
    // 23.1%, the column still open down 65% of the band. A local point (lx, ly, lz) is
    // right * lx + (local +Z) * lz, and local +Z is MINUS the forward vector.
    //
    // And it rides the body's WHOLE rotation, not the heading alone: the body pitches
    // nose-up 0.109 rad on the 13% climb the suite drives, and a seat composed from the
    // heading only sat 0.18 m ahead of and 0.04 m below the real seat there, with the dash
    // that much closer to the eye. Same Euler and order as root.rotation above, so the
    // camera is exactly where carbody.js put the seat, whatever the road is doing.
    _e.set(pitch, h, roll, 'YXZ');
    _v.set(SEAT.x, SEAT.y, SEAT.z).applyEuler(_e);
    const sx = x + _v.x;
    const sy = y + bob * 0.46 + _v.y;
    const sz = z + _v.z;

    // the reparent: 0.35 s of ease, never a cut, and the player keeps the mouse the
    // whole way. Alex's law: never take the camera away at the scary moment.
    let t = 1;
    if (this.mode === 'entering') t = ease.outCubic(clamp01(this.enterT / REPARENT));
    else if (this.mode === 'exiting') t = 1 - ease.outCubic(clamp01(this.enterT / REPARENT));
    if (t < 1) {
      cam.position.set(
        lerp(this.fromX, sx, t),
        lerp(this.fromY, sy, t),
        lerp(this.fromZ, sz, t),
      );
    } else {
      cam.position.set(sx, sy, sz);
    }

    // the car's own pitch bleeds into the view at 0.12 and the roll at 0.5 — enough to
    // feel the camber, not enough to make the horizon a see-saw.
    cam.rotation.order = 'YXZ';              // fix 1: with XYZ, look up + look sideways tilts
    cam.rotation.x += pitch * 0.12 * t;
    cam.rotation.z += roll * 0.50 * t;

    // The FOV is NOT written here (round 6, lane H). The speed term goes to the camera lane
    // in the STEP (_driveFov -> camera.setFovBias) and player/camera.js present() is the one
    // writer of cam.fov. Two writers were measured to leave the speed FOV off the screen at
    // any held speed (the note at the top of the file; tests/car.mjs pins 60 frames at 23).
  }

  /**
   * THE SPEED FOV, round 6 (lane H). 68 -> 74.5 across 0 -> 23 m/s [CFG.car.seat.fov /
   * .fovFast], as a BIAS handed to the camera lane's one damped fovNow clock
   * (player/camera.js setFovBias; damped there by CFG.camera.fovDamp). `t` is the reparent
   * blend — 0 -> 1 over the entry, 1 -> 0 over the exit — so the term arrives and leaves
   * with the seat and the camera lane's own base is what it blends from. Written in STEP,
   * never in present(): the old present-side damp ran on the frame dt and lost the fight
   * for cam.fov (the note at the top of the file).
   */
  _driveFov(t) {
    const want = (SEAT.fovFast - SEAT.fov) * clamp01(Math.abs(this.speed) / K.onRoad) * clamp01(t);
    this._setFovBias(want);
  }

  _setFovBias(v) {
    this.fovBias = v;
    const cam = this._camera;
    if (cam && typeof cam.setFovBias === 'function') cam.setFovBias(v);
  }

  /**
   * The view rides the nose. Written in step, before the clamp, because cam.yaw is AIM and
   * aim is truth: player/camera.js latches currYaw in its own present(), so a write here is
   * interpolated across the frame like the mouse is (camera.js:268-272). Driving: the
   * heading delta of this step — the wheel AND the tree nudge, whatever _integrate did — is
   * added to the yaw, so the mouse is an offset from the nose and a held turn keeps the
   * road in frame. Entering: the yaw is eased toward the nose for the 0.35 s of the
   * reparent only (the hotwire that follows leaves the mouse alone), at ENTER_LOOK_LAMBDA.
   * The pilot's arriving mode and the exit do not touch the view: nobody is in the seat.
   */
  _carryLook(dt) {
    const cam = this._camera;
    if (!cam || typeof cam.yaw !== 'number') return;
    if (this.mode === 'driving') {
      const dh = angleDelta(this.prevHeading, this.heading);
      if (dh !== 0) cam.yaw = wrapAngle(cam.yaw + dh);
    } else if (this.mode === 'entering' && this.enterT < REPARENT) {
      cam.yaw = wrapAngle(dampAngle(cam.yaw, this.heading, ENTER_LOOK_LAMBDA, dt));
    }
  }

  /**
   * The seat yaw clamp, +-1.48 rad [CFG.car.seat.yawClamp]. Written in step (not
   * present) because it moves AIM, and aim is truth. It widens to a full circle during
   * the 0.35 s reparent so that entering never yanks the view — the clamp arrives with
   * you rather than snapping you into the seat.
   */
  _clampSeatLook() {
    const cam = this._camera;
    if (!cam) return;
    const inSeat = this.mode === 'driving' || this.mode === 'entering';
    if (!inSeat) return;
    // The clamp is measured from the nose, and since _carryLook the nose moves the view
    // with it, so in play this only ever bites when the player has looked over a shoulder
    // and the car turns further the same way. It is measured, not assumed: tests/car.mjs
    // holds full lock at 10 m/s with the mouse still and the clamp never engages.
    const t = this.mode === 'driving' ? 1 : clamp01(this.enterT / REPARENT);
    const width = lerp(Math.PI, SEAT.yawClamp, t);
    const d = angleDelta(this.heading, cam.yaw);
    if (d > width) cam.yaw = wrapAngle(this.heading + width);
    else if (d < -width) cam.yaw = wrapAngle(this.heading - width);
  }

  /* ---------------------------------------------------------------- debug -- */

  /** For window.__CURFEW.state(). Allocates; never called in the loop. */
  state() {
    const D = this._dbg;
    return {
      exists: this.exists,
      mode: this.mode,
      x: this.x, y: this.y, z: this.z,
      heading: this.heading,
      speed: this.speed,
      inCar: !!(this.ctx.shared && this.ctx.shared.inCar),
      hotwired: this.hotwired,
      engineOn: this.engineOn,
      headlights: this.headlightsOn,
      beacon: this.beacon,
      lampFade: this.lampFade,
      wear: this.wear,
      hotwireTotal: this.hotwireTotal,
      fovBias: this.fovBias,
      stuckT: this.stuckT,
      horn: { count: this.hornCount, sounds: this.hornSoundCount,
        held: this.hornHeld, repeatIn: this.hornT, pending: this.hornSoundPending },
      // THE LAST RAM (round 6): what it hit, what it cost, and whether the node made it clean.
      ram: { hits: this._ramLast.hits, n: this._ramLast.n, mass: this._ramLast.mass,
        before: this._ramLast.before, after: this._ramLast.after, keep: this._ramLast.keep,
        clean: this._ramLast.clean },
      // THE LAST CRUSH (round 7): what broke, what it cost, how far the nose was kicked,
      // and the lifetime totals a tool can read after a lap of the county.
      crush: { n: this._crushLast.n, mass: this._crushLast.mass, tag: this._crushLast.tag,
        before: this._crushLast.before, after: this._crushLast.after,
        keep: this._crushLast.keep, yaw: this._crushLast.yaw,
        total: this.crushCount, totalMass: this.crushMass,
        debris: this._deb ? this._deb.alive : 0 },
      tris: this.body ? this.body.tris : 0,
      holdT: this.holdT,
      // THE ENTRY VERB, so it can be argued with by a number. `reach` is the distance the
      // rule actually tests (the kinder of door-anchored and centre-anchored); `canEnter`
      // is whether a tap right now would take. Both exist because "I have no idea how to
      // get into the car" was unanswerable from the old state bag.
      door: this.doorA, cabin: this.cabin,
      reach: this._reach(), enterRange: ENTER_RANGE,
      canEnter: this.mode === 'idle' && this._reach() <= ENTER_RANGE,
      cabinLit: !!this.cabinHandle,
      // WHY THE CAR DID NOT COME. A rule that silently declines is indistinguishable from
      // a rule that never runs, and for three rounds this one was the former while being
      // reported as the latter. `why` is the last check's verdict, the counters are the
      // lifetime totals, and the three measurements underneath are what it decided on.
      // Copied out, not handed out: `_dbg` is written in place on the fixed step.
      spawn: {
        checks: D.checks, spawns: D.spawns, why: D.why,
        owed: this.owed, owedT: this.owedT,
        checkIn: this.spawnCheckT, cooldown: this.spawnCooldown,
        playerRoad: D.playerRoad, nearestMajor: D.nearestMajor, carDist: D.carDist,
        refused: {
          inCar: D.inCar, noSystems: D.noSystems, atMajor: D.atMajor, noRoad: D.noRoad,
          carIsHere: D.carIsHere, playerDead: D.playerDead, noCandidate: D.noCandidate,
        },
        sweep: {
          bearings: D.bearings, coneRejects: D.coneRejects, roadMisses: D.roadMisses,
          bandRejects: D.bandRejects, yardRejects: D.yardRejects,
          relaxed: D.relaxed, bestScore: D.bestScore,
        },
      },
    };
  }

  /**
   * Put the car here, cold and parked, with no spawn rule. The test/debug door since round 5;
   * since ROUND 13 also the body of _park(), which is how a fresh session and a respawn put
   * the car on the road (the wrapper adds the nose direction and the beacon).
   */
  placeAt(x, z, heading) {
    const terr = this._terrain;
    this.x = x; this.z = z;
    this.y = terr ? terr.heightAt(x, z) : 0;
    this.heading = heading === undefined ? this.heading : heading;
    this.speed = 0; this.steer = 0; this.kickOwed = 0;
    this.exists = true;
    this.mode = 'idle';
    this.hotwired = false;
    this.engineOn = false;
    this.hornSoundPending = false;
    // A car placed by a test rig or a screenshot pose is a PARKED car, and a parked car in
    // this game stands open with its light on. Seeded rather than left at zero so a rig
    // that renders one frame gets the door it would get after a second of play.
    this.doorA = DOOR_AJAR; this.cabin = 0.34;
    this._creaked = false;
    this._sync();
    this.body.root.visible = true;
    // Lit, then parked — which means the park cool-down in _stepIdle will dim it out over
    // PARK_DARK_S like any other parked car. A screenshot rig that wants the lamp lit
    // should take its frame inside that window or re-call placeAt; a rig that wants the
    // dark car simply steps past it. There is no third state where a car sits lit forever.
    this._setHeadlights(true);
    this._removeRoof();
    this._placeRoof();
    this._emit('car:spawned', { x, z });
  }

  dispose() {
    this.hornSoundPending = false;
    this._setCarried(false);      // never leave the player frozen in a car that is gone
    this._carrySeated = false;
    this._setFovBias(0);
    this._removeRoof();
    this._releaseCabin();
    // Same blocker, last door. This used to release the borrowed rover and leave the
    // census SpotLight burning at a car that no longer exists — a disposed system that
    // goes on lighting the player is the purest form of working-but-wrong. It runs before
    // body.dispose() below, because _setHeadlights writes body.setLamp.
    this._setHeadlights(false);
    if (this.headHandle) {
      const L = this._lights;
      if (L) L.release(this.headHandle);
      this.headHandle = null;
    }
    if (this._ownsUseKey && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this._onKeyDown);
      window.removeEventListener('keyup', this._onKeyUp);
      this._ownsUseKey = false;
    }
    if (this._deb) {
      if (this._deb.mesh.parent) this._deb.mesh.parent.remove(this._deb.mesh);
      this._deb.geo.dispose();      // the material is borrowed; it is not ours to dispose
      this._deb = null;
    }
    if (this.body) { this.body.dispose(); this.body = null; }
    if (this.ctx.shared) this.ctx.shared.inCar = false;
  }
}

export default Car;
