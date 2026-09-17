// CURFEW — THE GARAGE, THE FIRST NIGHT. The Eleven rewire.
//
// ALEX: "the wall clock reaches 2:00 AM, pale false-dawn light, no bell, lights fail and the
// clock snaps to 1:00 AM, the radio addresses Oriana by name and warns that light before the
// bell is not morning, the door opens." And: "control immediately, no cutscene, no forced
// camera."
//
// THE 2:00 -> 1:00 SNAP IS THE NIGHT THE CLOCKS FELL BACK. The calendar in the shelter next
// door already circles the first Sunday of November and says FALL BACK (opening.js _papers).
// This is that hour happening, and it is played straight: a wall clock, a light at the
// shutter mouth that is not morning, and the hour taken back.
//
// WHAT THIS SYSTEM MAY NOT DO. It never locks the camera, never takes the feet, never pauses,
// never fades. Every beat is a light, a sound, a redrawn clock face or a moving shutter — the
// player can walk out of the bay at t = 0 and the night still happens behind them. There is
// no bell: the day bell is the ending, and hearing one now would be a lie.
//
// THE SHUTTER IS CLOSED until the beat is over, and its COLLIDER MOVES WITH IT, or the car
// drives through a shut door. Once the beat is done the flag `opening:garage-done` skips the
// whole thing: clock at 1:00, shutter up, radio dark.

import * as THREE from 'three';
import { CFG } from '../config.js';
import { ease } from '../engine/math.js';
import { OPENING as O } from './opening-layout.js';
import { buildBody } from '../enemies/bodies.js';
import { FOOTPRINT } from '../vehicle/carbody.js';
import { tendon } from '../art/character-sculpt.js';

/* -------------------------------------------------------------------- the bay -- */
// dress-station.js serviceBay: x -23.0, z -0.2, 10.2 x 9.6 x 4.65, open on -Z.
const BAY = Object.freeze({ x: -23.0, z: -0.2, w: 10.2, d: 9.6, h: 4.65 });
const SHUTTER_W = 10.0, SHUTTER_H = 4.4;
const SHUTTER_RISE_S = 3.0;
// The work lamp over the bay, BRACKETED BY TWO MEASUREMENTS. Below, at 5.5, the room read at
// luma 3.8 against tests/smoke.mjs's legibility floor of 8 — a garage you cannot see the car
// in. Above, at 26, it lit the station's apron disc (which runs on under the bay) hard enough
// that tests/sites.mjs read the forecourt as claimed ground it is not. A pole lamp out on the
// road is 6.0 and lights a road; this is a lamp over your head in a shut metal box.
const BAY_LIT = 21;
const BAY_DIM = 6;       // after the shutter is up and the night is outside

/* -------------------------------------------------------------------- the beat -- */
const T_TWO = 10.0;        // 2:00. The light at the mouth starts.
const T_FAIL = 17.0;       // it goes out, and the hour goes with it
const T_RADIO = 18.5;      // the pip, and the voice
// THE MESSAGE'S OWN LENGTH DECIDES THE REST OF THE BEAT, so none of these is a guess at it.
// SHUTTER_ON_LAST_WORD is dialogue.js's own tail — 0.25 s of pad after a recording plus a
// 0.35 s fade — so the rise begins on the last word rather than 0.6 s after it.
const SHUTTER_ON_LAST_WORD = 0.60;
// The two recordings are 2.55 s and 15.14 s with about 0.76 s between them: 18.5 s of beat.
// This is the dead-man's handle for a line that never reports itself finished, not a timing.
const RADIO_MAX_S = 30;
const RADIO_SILENT_S = 24;  // no dialogue system at all: hold six seconds, then open
// While the slats are still climbing, the collider hangs this far below them. Without it the
// car's roof (1.97) cleared the lowest slat by a centimetre at 1.29 s of the rise and a
// crouched head at 0.77 s, with the slats still visibly in the way: the door you could glitch
// through was a door that let you under it before it looked open.
const SHUTTER_SKIRT = 0.45;
// THE THING AT THE DOOR. The long reasoning is on _readyScare below. SCARE_WAIT is the beat of
// empty yard after the shutter locks — the relief that the drop takes away.
const SCARE_FLAG = 'opening:door-scare';
const SCARE_WAIT = 0.65;        // s of nothing after the shutter is fully up
// ALEX, 2026-09-16: "THe scary thing that pops in when the garage door opens has to be
// scarier. What triggers it? timing or leaving the garage? make sure the player sees it."
//
// IT IS TIMING, and it always was: SCARE_WAIT after the shutter locks, if somebody is within
// SCARE_REACH of the doorway. And that is exactly how it could be missed — a player looking
// at the car when the clock ran out saw an empty doorway by the time they turned round.
//
//   1. IT WAITS FOR YOUR EYES. The drop does not begin until the doorway is in front of you,
//      up to SCARE_PATIENCE seconds. Nothing takes the camera — you are never turned — it is
//      the thing being patient, which is worse.
//   2. IT STAYS LONG ENOUGH TO BE SEEN, AND IT MOVES WHILE IT IS THERE. A second and a half of
//      hold, a lunge a third of the way in, and the bay light dies as it arrives and comes
//      back as it leaves, so the room you were safe in goes with it.
//   3. IT IS ONLY SPENT IF YOU SAW IT. The flag is written at the snatch, and only if the face
//      was inside the camera's frustum for SCARE_SEEN_S. A drop that played to your back is
//      hidden again and waits for the next facing; it will not do that more than SCARE_TRIES
//      times, because three stingers nobody saw is noise.
const SCARE_PATIENCE = 7.0;     // s it will wait for the doorway to be in front of you
const SCARE_FACE = 0.35;        // dot of camera forward to the doorway: within ~70 degrees
// ALEX, 2026-09-16: "you can exit the door before ever seeing the jump scare."
//
// MEASURED: the bay is 9.6 m deep and the night starts 8.34 m back from the opening, so a
// player who walks out while looking at the car, the rack or the floor covers the whole
// distance without the facing gate ever passing — and once they are through it, the doorway
// is BEHIND them and the drop lands at their back.
//
// So walking out is a trigger too. Inside SCARE_DOOR_NEAR of the opening you are leaving by
// it, whatever you happen to be looking at, and the thing drops into the gap you are walking
// toward. If your eyes were elsewhere it counts for nothing (3 above) and it waits for them.
//
// AND IT NEVER SPEAKS TO YOUR BACK. If you are already out on the forecourt it holds, patience
// and all, until the mouth of the garage is properly in front of you again.
const SCARE_DOOR_NEAR = 5.5;    // m from the opening, inside the bay: you are on your way out
const SCARE_OUT_FACE = 0.50;    // and from outside it wants the mouth squarely in front of you
const SCARE_DROP = 0.08;        // the fall into the doorway
const SCARE_LUNGE = 0.46;       // when it comes at you, once, inside the hold
const SCARE_LUNGE_S = 0.16;     // and how long that takes
const SCARE_LUNGE_M = 0.62;     // metres it closes on foot
const SCARE_LUNGE_M_SEAT = 0.30;// seated: the bumper is already 0.76 m under it; 0.62 put the rags on the bonnet
const SCARE_SNATCH = 1.55;      // on foot: taken back upward at this point (was 1.06: a blink)
const SCARE_GONE_S = 0.30;      // the snatch itself, from the hold to out of sight
// SEATED, the showpiece. It fires as the bumper is about to cross the threshold and drops
// into the windscreen: SCARE_NEAR_CAR out from the EYE (the bumper is 2.64 m from it), face
// at mid-glass, riding ahead of the car on the bearing the camera had at the drop, so the roof
// passes under it. Held until the car's centre is through the plane, or SCARE_SEAT_HOLD.
const SCARE_SEAT_HOLD = 1.6;    // s, the seated hold's ceiling
const SCARE_SEAT_PAST = 0.5;    // m the car's centre must be through the plane to snatch early
const SCARE_NEAR_CAR = 3.4;     // m from the seated eye: 0.76 m past the bumper, in the lamps
const SCARE_SEAT_FACE_Y = 1.45; // face height above car.y: the glass runs 1.26..1.91
const SCARE_SEAT_CONE = 1.05;   // rad off the nose the drop bearing may wander (the glass and the side lights)
const SCARE_CAR_LEAD_M = 1.4;   // fire once the bumper is this close to the plane...
const SCARE_CAR_LEAD_S = 0.45;  // ...or will be there in this many seconds at its speed
const SCARE_CAR_MIN_SPEED = 0.3;// m/s: rolling, not idling against the brake
// ON FOOT. The body origin is its heels and it hangs head-down, so the origin is ABOVE the
// face by HEAD_Y (P.head's local y in marrow-body.js) times the scale. Everything is derived
// from the face target each frame — the first cut carried a fixed heel height and put the
// whole body under the floor when the scale changed.
const SCARE_SCALE = 1.7;        // x the Marrow's own 1.08: a 4.2 m thing in a 4.65 m room
const HEAD_Y = 1.92;            // marrow-body.js P.head.position.y, standing frame
const SCARE_ABOVE = 2.5;        // m above the hold it waits and goes back to (inside the gable)
const SCARE_NEAR = 2.9;         // m from the eye on foot: bigger now, so further, so the head fits the frame
const SCARE_REACH_MIN = 1.0;    // never closer than this, whatever the geometry says
const SCARE_FOOT_FACE_DROP = 0.10;  // face this far under the eye line on foot
const SCARE_CAR_CLEAR = 0.6;    // on foot, the drop stops this short of the parked car's footprint
const SCARE_SEEN_S = 0.25;      // s the face must be inside the frustum for the scare to count
const SCARE_SEEN_MARGIN = 1.10; // the frustum test is on one point; the thing is a metre wide
const SCARE_REARM_S = 3.0;      // s of quiet after an unseen drop before it may try again
const SCARE_TRIES = 3;          // unseen drops per night before it gives up (see 3 above)
// THE REACH. A limb that is not on the Marrow the county fights: seven tapered segments of
// LIMB_SEG_M along +Z, nested so the chain bends at every joint, hung off the shoulder with
// the half-formed second face. Coiled at rest under the rags; from SCARE_LUNGE it uncoils
// toward the eye, joint after joint, and stops LIMB gap short of it.
const LIMB_SEGS = 7;
const LIMB_SEG_M = 0.23;        // body units: 7 x 0.23 x 1.836 = 2.96 m straight, in world
const LIMB_R0 = 0.075;          // base radius, body units (0.14 m in world)
const LIMB_TAPER = 0.009;       // per segment, down to 0.012 at the tip
const LIMB_CURL = 1.3;          // rad per joint at rest: a coil, not a limb (the reach opens toward +bend)
const LIMB_UNCOIL_S = 0.30;     // s for one joint to open
const LIMB_DELAY_S = 0.035;     // s between joints: a whip, root first
const LIMB_SNAP_S = 0.12;       // s to coil again on the snatch
const LIMB_TREMOR = 0.07;       // rad, the 14 Hz shake on the last two joints
const LIMB_WRITHE = 0.10;       // rad, the slow sideways writhe along the chain
const LIMB_TIP_GAP_FOOT = 0.35; // m the tip stops short of the eye on foot
const LIMB_TIP_GAP_SEAT = 0.85; // m seated: 0.3 m outside the glass, which is 0.54 m ahead of the eye
const SEAT = CFG?.car?.seat || { x: -0.31, y: 1.66, z: -0.50 };
const SCARE_Z_LOCAL = BAY.z - BAY.d * 0.5 + 0.34;   // just inside the doorway
const _scarePt = new THREE.Vector3();
const _eyeV = new THREE.Vector3();
const _mountV = new THREE.Vector3();
const SCARE_REACH = 26;         // nobody in the bay, no scare: spend it on a room with a body in it
const CLOCK_FROM = { h: 1, m: 58, s: 0 };
const wrapPi = (a) => ((a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI;

export class GarageOpening {
  static id = 'garage-opening';

  constructor(ctx) {
    this.ctx = ctx;
    this.elapsed = 0;
    this.done = false;
    this.stage = 'waiting';   // waiting | two | failed | radio | opening | done
    this.shutterK = 0;        // 0 closed, 1 fully up
    this.bayLamp = null;
    this.mouthLamp = null;
    this._tick = 0;
    this._collider = -1;
    this._scareT = -1;        // -1 = not running; seconds since the drop otherwise
    this._scareBody = undefined;
    this._scareMode = 'foot'; // 'foot' | 'seat', decided at the drop
    this._scareS = 1;         // the body's total scale (its own x SCARE_SCALE)
    this._scareWait = 0;      // s spent armed and waiting for a facing
    this._scareSeen = 0;      // s the face has been inside the camera's frustum this drop
    this._scareTry = 0;       // unseen drops so far this night
    this._scareSpent = false;
    this._scareBearing = 0;   // seated: the drop's bearing off the car's nose, rad
    this._snatchAt = SCARE_SNATCH;
    this._scareLx = 0; this._scareLz = 0; this._scareFaceY = 0; this._scareYaw = 0;
    this._scareX = 0; this._scareZ = 0;
    this._ex = 0; this._ey = 0; this._ez = 0;   // the eye, in world, this step
    this._reach = null; this._reachSegs = null; this._reachGeos = null; this._reachRest = null;
    this._withdrew = false;
    this._lunged = false;
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const places = this._sys('places');
    const rec = places?.nodes?.get?.(O.id);
    if (!rec) return;                      // no station, no garage: a test world
    this.yaw = rec.yaw; this.padY = rec.padY;
    const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
    this._cy = cy; this._sy = sy;      // the site's frame, for direction (not point) transforms
    this.wx = (lx, lz) => rec.def.x + lx * cy + lz * sy;
    this.wz = (lx, lz) => rec.def.z - lx * sy + lz * cy;

    this.root = new THREE.Group();
    this.root.name = 'garage-opening';
    this.root.position.set(rec.def.x, 0, rec.def.z);
    this.root.rotation.y = rec.yaw;
    this.ctx.scene.add(this.root);

    this._buildClock();
    this._buildShutter();
    this._buildSlatGlow();
    this._buildShade();

    const pr = this._sys('progress');
    if (pr?.flag('opening:garage-done')) {
      // A returning night: the hour has already been taken, the shutter is up, the radio is
      // dark. Nothing about the beat replays and nothing about it is remembered out loud.
      this.done = true; this.stage = 'done'; this.shutterK = 1;
      this._drawClock(1, 0, 0);
      this._placeShutter();
      this.elapsed = 1e6;
    } else {
      this._drawClock(CLOCK_FROM.h, CLOCK_FROM.m, CLOCK_FROM.s);
      this._placeShutter();
    }
    this._offs.push(this.ctx.bus.on('save:loaded', () => {
      if (this._sys('progress')?.flag('opening:garage-done')) {
        this.done = true; this.stage = 'done'; this.shutterK = 1;
        this.elapsed = 1e6; this._drawClock(1, 0, 0); this._placeShutter();
      }
    }));
  }

  ready() { return true; }

  /* ------------------------------------------------------------- the clock -- */

  _buildClock() {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    this._clockCanvas = c;
    this._clockCtx = c.getContext('2d');
    this._clockTex = new THREE.CanvasTexture(c);
    this._clockTex.colorSpace = THREE.NoColorSpace;
    this._clockTex.anisotropy = 4;
    const places = this._sys('places');
    const mat = places.matBody.clone();
    mat.map = this._clockTex; mat.bumpScale = 0;
    this._clockMat = mat;
    const geo = new THREE.PlaneGeometry(0.60, 0.60);
    geo.setAttribute('color',
      new THREE.Float32BufferAttribute(Array(geo.attributes.position.count * 3).fill(1), 3));
    this._clockGeo = geo;
    const m = new THREE.Mesh(geo, mat);
    m.name = 'garage-wall-clock';
    // The LEFT wall, facing +X across the bay. On the back wall it was directly behind the
    // player's start and the beat happened out of frame; here the clock and the shutter mouth
    // are both reachable with one turn of the head, and neither needs the camera taken.
    m.position.set(BAY.x - BAY.w * 0.5 + 0.22, this.padY + 2.45, BAY.z - 1.20);
    m.rotation.y = Math.PI * 0.5;
    this.root.add(m);
    this.clockMesh = m;
  }

  /** Redrawable: the whole reason the clock is a canvas rather than a prop. */
  _drawClock(h, m, s) {
    const c = this._clockCtx;
    if (!c) return;
    const R = 256;
    c.fillStyle = '#1a1c1a'; c.fillRect(0, 0, 512, 512);
    c.fillStyle = '#3c3a30';
    c.beginPath(); c.arc(R, R, 232, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#c9c0a4';
    c.beginPath(); c.arc(R, R, 214, 0, Math.PI * 2); c.fill();
    // the hours
    c.strokeStyle = '#1b1a16';
    for (let i = 0; i < 12; i++) {
      const a = i / 12 * Math.PI * 2;
      const long = i % 3 === 0;
      c.lineWidth = long ? 11 : 5;
      c.beginPath();
      c.moveTo(R + Math.sin(a) * (long ? 172 : 184), R - Math.cos(a) * (long ? 172 : 184));
      c.lineTo(R + Math.sin(a) * 200, R - Math.cos(a) * 200);
      c.stroke();
    }
    const hand = (angle, len, width, colour) => {
      c.strokeStyle = colour; c.lineWidth = width; c.lineCap = 'round';
      c.beginPath(); c.moveTo(R - Math.sin(angle) * 22, R + Math.cos(angle) * 22);
      c.lineTo(R + Math.sin(angle) * len, R - Math.cos(angle) * len); c.stroke();
    };
    const hourA = ((h % 12) + m / 60) / 12 * Math.PI * 2;
    const minA = (m + s / 60) / 60 * Math.PI * 2;
    hand(hourA, 118, 20, '#17150f');
    hand(minA, 176, 13, '#17150f');
    hand(s / 60 * Math.PI * 2, 190, 5, '#6d2a1c');    // the second hand, and it is moving
    c.fillStyle = '#17150f';
    c.beginPath(); c.arc(R, R, 14, 0, Math.PI * 2); c.fill();
    this._clockTex.needsUpdate = true;
  }

  /* ----------------------------------------------------------- the shutter -- */

  _buildShutter() {
    const places = this._sys('places');
    const mat = places.matBody.clone();
    mat.map = places.surfaceTextures?.metal || null;
    mat.bumpMap = places.surfaceTextures?.['metal-bump'] || null;
    mat.bumpScale = 0.02;
    this._shutterMat = mat;
    // Slats, built once into one group that slides up. A merged static mesh cannot move,
    // which is why this is not in dress-station.js with the rest of the bay.
    const g = new THREE.Group();
    g.name = 'garage-shutter';
    const slatGeo = new THREE.BoxGeometry(SHUTTER_W, 0.30, 0.10);
    this._slatGeo = slatGeo;
    const n = Math.round(SHUTTER_H / 0.32);
    for (let i = 0; i < n; i++) {
      const s = new THREE.Mesh(slatGeo, mat);
      s.position.set(0, 0.16 + i * 0.32, 0);
      s.castShadow = true; s.receiveShadow = true;
      g.add(s);
    }
    g.position.set(BAY.x, this.padY, BAY.z - BAY.d * 0.5 + 0.22);
    this.root.add(g);
    this.shutter = g;
  }

  /**
   * Behind the slats: a plane that brightens when the light at the mouth comes up, so what
   * you see first is the seams going pale rather than a lamp appearing out of nowhere.
   * Basic, unlit, additive — never a light.
   */
  _buildSlatGlow() {
    const mat = new THREE.MeshBasicMaterial({
      color: 0xd7dbe2, transparent: true, opacity: 0, depthWrite: false,
      blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    mat.name = 'garage-false-dawn';
    this._glowMat = mat;
    const geo = new THREE.PlaneGeometry(SHUTTER_W - 0.3, SHUTTER_H);
    this._glowGeo = geo;
    const m = new THREE.Mesh(geo, mat);
    m.name = 'garage-slat-glow';
    m.position.set(BAY.x, this.padY + SHUTTER_H * 0.5, BAY.z - BAY.d * 0.5 + 0.34);
    this.root.add(m);
    this.glow = m;
  }

  /** Put the shutter where shutterK says, and move its collider with it. */
  _placeShutter() {
    if (!this.shutter) return;
    this.shutter.position.y = this.padY + this.shutterK * (SHUTTER_H + 0.18);
    this.shutter.visible = this.shutterK < 0.999;
    const col = this._sys('collision');
    if (!col || typeof col.addCollider !== 'function') return;
    // Remove and re-add rather than mutate: addCollider is the only door into that lane.
    if (this._collider >= 0) { col.removeChunk('garage-shutter'); this._collider = -1; }
    if (this.shutterK >= 0.999) return;
    const wx = this.wx(BAY.x, BAY.z - BAY.d * 0.5 + 0.22);
    const wz = this.wz(BAY.x, BAY.z - BAY.d * 0.5 + 0.22);
    const visualY0 = this.padY + this.shutterK * (SHUTTER_H + 0.18);
    // THE SKIRT. While it rises the collider's foot hangs SHUTTER_SKIRT under the lowest slat
    // (never below the floor), so a head or a roof is refused until the slats are visibly
    // clear of it. The top stays where the slats are.
    const y0 = Math.max(this.padY, visualY0 - SHUTTER_SKIRT);
    this._collider = col.addCollider({
      kind: 'obb', x: wx, z: wz, halfX: SHUTTER_W * 0.5, halfZ: 0.14, yaw: this.yaw,
      y0, y1: visualY0 + SHUTTER_H, tag: 'metal', climbable: false,
    }, 'garage-shutter');
  }

  /* ---------------------------------------------------------------- lights -- */

  _bayOn(level) {
    const lights = this._sys('lights');
    if (this._shadeMat) this._shadeMat.emissiveIntensity = level > 0 ? 1.35 : 0;
    if (!lights) return;
    if (this.bayLamp?.inUse) { this.bayLamp.peak = level; return; }
    this.bayLamp = lights.borrow('bay-lamp',
      this.wx(BAY.x, BAY.z), this.padY + 3.7, this.wz(BAY.x, BAY.z), 0xffd8a8, level, 0);
  }

  _bayOff() {
    const lights = this._sys('lights');
    if (this._shadeMat) this._shadeMat.emissiveIntensity = 0;
    if (this.bayLamp) { lights?.release(this.bayLamp); this.bayLamp = null; }
  }

  /**
   * THE BULB ITSELF, under the work-lamp housing dress-station.js hangs over the bay. A rover
   * lights the room; this is the thing you can see is doing it, and it goes out on the same
   * frame the rover does. Emissive, never a second light.
   */
  _buildShade() {
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffe2b6, emissive: 0xffd8a8, emissiveIntensity: 0, roughness: 0.42, metalness: 0,
    });
    mat.name = 'garage-bay-bulb';
    this._shadeMat = mat;
    const geo = new THREE.SphereGeometry(0.115, 14, 10);
    this._shadeGeo = geo;
    const m = new THREE.Mesh(geo, mat);
    m.name = 'garage-bay-bulb';
    m.position.set(BAY.x, this.padY + BAY.h - 0.92, BAY.z);
    this.root.add(m);
  }

  _mouthOff() {
    const lights = this._sys('lights');
    if (this.mouthLamp) { lights?.release(this.mouthLamp); this.mouthLamp = null; }
  }

  /* ------------------------------------------------------------------ step -- */

  step(dt) {
    if (!this.root || !this.ctx.playing || this.ctx.paused) return;
    const p = this._sys('player');
    // Everything here is inside the bay. Off the pad, none of it costs a thing.
    const near = !p?.pos || Math.hypot(p.pos.x - this.wx(BAY.x, BAY.z),
      p.pos.z - this.wz(BAY.x, BAY.z)) < 60;

    if (this.done) {
      // The bay stays a lit place to come back to, dimmer than it was on the night.
      if (near) this._bayOn(BAY_DIM); else this._bayOff();
      // THE THING AT THE DOOR lives on this side of the early return, because the shutter
      // reaching the top is the same frame the beat is declared over.
      if (this._doneT !== undefined && this._scareT < 0 && this._scareBody) {
        this._doneT += dt;
        if (this._doneT >= SCARE_WAIT) this._beginScare(dt);
      }
      // _stepScare owns the bay lamp for as long as it is running, so it runs AFTER the
      // _bayOn(BAY_DIM) above and its write is the one that lands.
      this._stepScare(dt);
      return;
    }

    this.elapsed += dt;
    const t = this.elapsed;

    // The lamp over the bay is on from the first frame: the room has to READ, and
    // tests/smoke.mjs measures a legible frame three seconds in.
    if (this.stage !== 'failed') this._bayOn(BAY_LIT);

    // THE CLOCK, from 1:58, with a second hand and one soft tick a second. The tick is the
    // only thing in the room keeping time, which is what makes taking the hour back land.
    if (this.stage === 'waiting' || this.stage === 'two') {
      const secs = CLOCK_FROM.h * 3600 + CLOCK_FROM.m * 60 + t;
      const h = Math.floor(secs / 3600) % 12, m = Math.floor(secs / 60) % 60, s = Math.floor(secs % 60);
      this._drawClock(h, m, s);
      this._tick -= dt;
      if (this._tick <= 0 && near) { this._tick = 1; this._tickSound(0.10, 1.6); }
    }

    /* --- 2:00. The light at the mouth, and it is not morning. No bell. --- */
    if (this.stage === 'waiting' && t >= T_TWO) {
      this.stage = 'two';
      const lights = this._sys('lights');
      this.mouthLamp = lights?.borrow('false-dawn',
        this.wx(BAY.x, BAY.z - BAY.d * 0.5 - 1.2), this.padY + 2.6,
        this.wz(BAY.x, BAY.z - BAY.d * 0.5 - 1.2), 0xd7dbe2, 0, 0) || null;
      this.ctx.bus.emit('garage:false-dawn', {});
    }
    if (this.stage === 'two') {
      const k = Math.min(1, (t - T_TWO) / 5);
      if (this.mouthLamp?.inUse) this.mouthLamp.peak = k * 9;
      if (this._glowMat) this._glowMat.opacity = k * 0.42;
    }

    /* --- 17 s. It fails, and the hour goes with it. --- */
    if (this.stage === 'two' && t >= T_FAIL) {
      this.stage = 'failed';
      this._mouthOff();
      this._bayOff();
      if (this._glowMat) this._glowMat.opacity = 0;
      this._drawClock(1, 0, 0);            // FALL BACK
      this._tickSound(0.60, 0.5);          // one hard tick, and it is an hour
      this._sys('fx')?.addTrauma?.(0.05);
      this.ctx.bus.emit('garage:fell-back', {});
    }

    /* --- 18.5 s. The pip, the machine, and the voice that knows her name. --- */
    if (this.stage === 'failed' && t >= T_RADIO) {
      this.stage = 'radio';
      this._radioLit = true;
      // ONE SAVED MESSAGE, then the message. dialogue/lines.js chains them with `next`, so
      // this asks for the announcement and the tape follows it on its own.
      const said = this._sys('dialogue')?.say('radio.answerphone', { anchor: 'radio' });
      this._radioT = said ? 0 : RADIO_SILENT_S;   // no dialogue system: wait it out and open anyway
      this._offs.push(this.ctx.bus.on('dialogue:end', (e) => {
        if (e?.id === 'radio.opening' && this.stage === 'radio') this.stage = 'opening';
      }));
    }
    if (this.stage === 'radio') {
      this._radioT += dt;
      // ALEX, 2026-09-15: "maybe The garage door should open on the last word of it."
      //
      // Not on dialogue:end, which is 0.6 s later — that event fires at dur + FADE_S and for
      // a recorded line `dur` is already the audio plus 0.25 s of pad. The wav is trimmed to
      // 0.16 s past its last word, so starting the rise with SHUTTER_ON_LAST_WORD left on the
      // clock puts the shutter moving as she finishes speaking. The dialogue:end hook above
      // stays as the backstop for a build with no recording, where there is no last word.
      const say = this._sys('dialogue')?.state?.();
      if (say && say.active === 'radio.opening' && say.remaining >= 0
          && say.remaining <= SHUTTER_ON_LAST_WORD) this.stage = 'opening';
      if (this._radioT > RADIO_MAX_S) this.stage = 'opening';  // a line that never ends does not hold the door
    }

    /* --- the shutter goes up, and the county is out there. --- */
    if (this.stage === 'opening') {
      if (this.shutterK === 0) {
        this._creak();
        this._readyScare();              // built while the shutter is still moving, never at boot
        this.ctx.bus.emit('garage:opening', {});
      }
      this.shutterK = Math.min(1, this.shutterK + dt / SHUTTER_RISE_S);
      this._placeShutter();
      if (this.shutterK >= 1) {
        this.stage = 'done'; this.done = true;
        this._doneT = 0;
        this._sys('progress')?.flag('opening:garage-done', 1);
        this.ctx.bus.emit('garage:open', {});
      }
    }

  }

  /* ----------------------------------------------------------------- sound -- */

  /** The clock. One pooled damped ring, quiet and short; nothing new is baked for it. */
  _tickSound(gain, rate) {
    const a = this._sys('audio');
    if (!a?.enabled || !a.baked || a.silent || !a.has?.('dmg_ring0') || typeof a.spec !== 'function') return;
    const s = a.spec();
    s.x = this.wx(BAY.x - BAY.w * 0.5 + 0.22, BAY.z - 1.20);
    s.y = this.padY + 2.45;
    s.z = this.wz(BAY.x - BAY.w * 0.5 + 0.22, BAY.z - 1.20);
    s.gain = gain; s.rate = rate; s.bus = 'world'; s.send = 0.10;
    s.lpHz = 5200; s.priority = 3; s.occl = false;
    a.play('dmg_ring0', s);
  }

  /** The shutter. The county's door class, because that is what it is. */
  _creak() {
    this._sys('audio')?.dread?.('door',
      this.wx(BAY.x, BAY.z - BAY.d * 0.5), this.padY + 1.4,
      this.wz(BAY.x, BAY.z - BAY.d * 0.5), 0.72);
  }


  /* =========================================================== THE THING AT THE DOOR ==
   * ALEX, 2026-09-15: "When the garage doors open, that should pull a jump scare. Not
   * something you have to defeat as an enemy. But something that whisks itself away fast in a
   * scary way too. so the player expects it could still be there."
   *
   * IT COMES DOWN, BECAUSE THE DOOR WENT UP. For three seconds the shutter has been dragging
   * the player's eye upward and handing them an empty yard; the relief is the setup. Then, a
   * beat after it locks, the Marrow drops head-first into the doorway on a rope of nothing,
   * inverted, its face at standing eye height and its jaw open, and fills the opening it just
   * finished revealing.
   *
   * IT GOES BACK UP, which is the whole point. Not sideways into the yard, where you could
   * look at it and find it gone — STRAIGHT UP, over the lintel, into the one place you cannot
   * see from inside a garage. The county's own sound for that is already written:
   * audio.js DREAD.withdraw is commented "the watcher being GONE, which is worse than the
   * watcher". It rings as the thing leaves.
   *
   * IT IS NOT AN ENEMY. No collider, no species slot, no director order, nothing to shoot and
   * nothing to shoot back: it is a body this lane builds, moves for under two seconds and
   * disposes, like the shutter. And it is spent ONCE, the first time it is SEEN — a scare you
   * get every reload is a nuisance, and Alex's law on sound is "nothing loud or annoying".
   *
   * THE EYE, NOT THE FEET. Everything is placed from where the camera actually is: on foot
   * that is p.pos and p.eyeY; in the car it is the seat (CFG.car.seat rotated by the heading),
   * because car.js writes p.pos = the car's centre while you are in it, and a drop placed off
   * that lands on the bonnet with its head under the roof. Seated it is the showpiece: it
   * fires as the bumper is about to cross the threshold, drops into the windscreen and rides
   * ahead of the car until the roof is under it, then goes up. On foot, with the car between
   * you and the door (you fuel it at the tail), it drops on the near side of the car.
   *
   * THE REACH. Bigger (SCARE_SCALE) and with a limb the county's Marrow does not have: from
   * the lunge a coiled tendril under the rags uncoils toward your eye and stops a hand short.
   */

  /** Build the body, hidden, while the radio is still talking. Never at boot. */
  _readyScare() {
    if (this._scareBody !== undefined) return;
    this._scareBody = null;
    if (this._sys('progress')?.flag(SCARE_FLAG)) return;      // already seen, once is once
    let seed = 20260915;
    const rng = { next: () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; } };
    try {
      const body = buildBody('marrow', rng);
      if (!body?.group) return;
      body.group.visible = false;
      this._scareS = (body.scale || 1) * SCARE_SCALE;
      body.group.scale.setScalar(this._scareS);
      this.root.add(body.group);
      this._buildReach(body);        // AFTER buildMarrow, so its merge pass never touches the limb
      this._scareBody = body;
    } catch (e) { void e; }                                    // no body, no scare, no crash
  }

  /**
   * The reach: LIMB_SEGS nested Groups, each carrying one tapered tendon() tube along its +Z
   * (so lookAt aims it), hung off the shoulder that carries the half-formed second face
   * (P.sideFace at (-0.19, 1.66, 0.04) in the standing frame; the body's `turn` group flips
   * x and z, so on body.group that is (0.19, 1.66, -0.04)). The shaft is the body's own flesh
   * material and the last two joints its eye material — a wet lit tip — so it costs no new
   * program. Coiled by LIMB_CURL at every joint at rest, pointing down the flank under the rags.
   */
  _buildReach(body) {
    if (!body.shellMat || !body.contactMat) return;
    const mount = new THREE.Group();
    mount.name = 'garage-scare-reach';
    mount.position.set(0.19, 1.66, -0.04);
    // At rest it points down the flank (toward the chest in the standing frame, which is UP
    // toward the rags with the body hung by its heels) and coils there.
    _eyeV.set(0.2, -1, 0.1).normalize();
    _mountV.set(0, 0, 1);
    this._reachRest = new THREE.Quaternion().setFromUnitVectors(_mountV, _eyeV);
    mount.quaternion.copy(this._reachRest);
    body.group.add(mount);
    const segs = [], geos = [];
    let parent = mount;
    for (let i = 0; i < LIMB_SEGS; i++) {
      const r0 = LIMB_R0 - i * LIMB_TAPER, r1 = r0 - LIMB_TAPER, L = LIMB_SEG_M;
      // a slight wander off the axis so the chain reads as sinew rather than a rod
      const geo = tendon([[0, 0, 0], [0.012, 0.006, L * 0.34], [-0.010, -0.005, L * 0.67], [0, 0, L]], r0, r1, 10, 7);
      geos.push(geo);
      const seg = new THREE.Group();
      seg.position.z = i === 0 ? 0 : L;        // each joint sits at the end of the last
      seg.rotation.x = LIMB_CURL;
      const mesh = new THREE.Mesh(geo, i >= LIMB_SEGS - 2 ? body.contactMat : body.shellMat);
      mesh.frustumCulled = false; mesh.castShadow = false;
      seg.add(mesh); parent.add(seg); parent = seg; segs.push(seg);
    }
    this._reach = mount; this._reachSegs = segs; this._reachGeos = geos;
  }

  /** Coiled again, pointing down the flank: the pose it drops in and the pose it leaves in. */
  _coilReach() {
    const segs = this._reachSegs;
    if (!this._reach || !segs) return;
    this._reach.quaternion.copy(this._reachRest);
    for (let i = 0; i < segs.length; i++) segs[i].rotation.set(LIMB_CURL, 0, 0);
  }

  /**
   * Where the camera is, in world, this step: the seat when you are in the car (car.js
   * carries p.pos at the car's CENTRE, half a metre behind the eye and half a metre down),
   * the player's eye otherwise. Returns 'seat' | 'foot' | null. Allocates nothing.
   */
  _eyeWorld() {
    const car = this._sys('car');
    if (this.ctx.shared?.inCar && car?.exists) {
      const h = car.heading, fx = -Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
      // car-local forward is -Z, so a seat at SEAT.z = -0.5 is 0.5 m along `forward`
      this._ex = car.x + rx * SEAT.x - fx * SEAT.z;
      this._ey = car.y + SEAT.y;
      this._ez = car.z + rz * SEAT.x - fz * SEAT.z;
      return 'seat';
    }
    const p = this._sys('player');
    if (!p?.pos) return null;
    this._ex = p.pos.x; this._ey = p.eyeY !== undefined ? p.eyeY : p.pos.y + 1.68; this._ez = p.pos.z;
    return 'foot';
  }

  /** dot of the camera's forward (yaw only) to a world point, from the eye. 1 with no camera. */
  _faceDot(cam, x, z) {
    if (!cam) return 1;
    const ax = x - this._ex, az = z - this._ez, d = Math.hypot(ax, az) || 1;
    return (ax * -Math.sin(cam.yaw) + az * -Math.cos(cam.yaw)) / d;
  }

  /**
   * Is a world point inside the camera's frustum? The real yaw/pitch, the real vertical fov
   * (camera.fovNow is the one damped clock, seat bias included) and the real aspect, with a
   * little margin because the thing being tested is a metre wide and this is one point on it.
   */
  _inView(x, y, z) {
    const cam = this._sys('camera');
    if (!cam) return true;
    const cp = Math.cos(cam.pitch), sp = Math.sin(cam.pitch), sy = Math.sin(cam.yaw), cy = Math.cos(cam.yaw);
    const fx = -sy * cp, fy = sp, fz = -cy * cp;          // forward
    const rx = cy, rz = -sy;                               // right
    const ux = sy * sp, uy = cp, uz = cy * sp;             // up = right x forward
    const vx = x - this._ex, vy = y - this._ey, vz = z - this._ez;
    const depth = vx * fx + vy * fy + vz * fz;
    if (depth <= 0.05) return false;
    const fov = typeof cam.fovNow === 'number' ? cam.fovNow : 68;
    const tanV = Math.tan(fov * 0.5 * Math.PI / 180) * SCARE_SEEN_MARGIN;
    const tanH = tanV * (this.ctx.camera?.aspect || 16 / 9);
    return Math.abs(vx * rx + vz * rz) <= tanH * depth
      && Math.abs(vx * ux + vy * uy + vz * uz) <= tanV * depth;
  }

  /**
   * On foot, with the car parked between you and the door: how far along the drop line the
   * padded footprint begins (a 2D slab test in the car's own frame, the one roofHeightAt
   * uses). Infinity when the line misses the car or the car is behind you; <= 0 when you
   * are standing inside the padding already (the filler cap is at the tail).
   */
  _clearOfCar(car, dx, dz) {
    const wdx = dx * this._cy + dz * this._sy, wdz = -dx * this._sy + dz * this._cy;
    const h = car.heading, fx = -Math.sin(h), fz = -Math.cos(h), rx = Math.cos(h), rz = -Math.sin(h);
    const ox = this._ex - car.x, oz = this._ez - car.z;
    const px = ox * rx + oz * rz, pz = -(ox * fx + oz * fz);      // car-local: nose is -Z
    const vx = wdx * rx + wdz * rz, vz = -(wdx * fx + wdz * fz);
    const pad = SCARE_CAR_CLEAR;
    let tin = -Infinity, tout = Infinity, a, b, t;
    if (Math.abs(vx) < 1e-6) { if (px < -FOOTPRINT.hx - pad || px > FOOTPRINT.hx + pad) return Infinity; }
    else {
      a = (-FOOTPRINT.hx - pad - px) / vx; b = (FOOTPRINT.hx + pad - px) / vx;
      if (a > b) { t = a; a = b; b = t; }
      if (a > tin) tin = a; if (b < tout) tout = b;
    }
    if (Math.abs(vz) < 1e-6) { if (pz < FOOTPRINT.z0 - pad || pz > FOOTPRINT.z1 + pad) return Infinity; }
    else {
      a = (FOOTPRINT.z0 - pad - pz) / vz; b = (FOOTPRINT.z1 + pad - pz) / vz;
      if (a > b) { t = a; a = b; b = t; }
      if (a > tin) tin = a; if (b < tout) tout = b;
    }
    if (tin > tout || tout < 0) return Infinity;
    return tin;
  }

  /**
   * Where the body hangs this step, in the bay's LOCAL frame, from the eye (_eyeWorld first).
   * Seated: SCARE_NEAR_CAR out along the bearing fixed at the drop, face at mid-glass, so it
   * rides ahead of the car. On foot: on the line from the eye to the doorway, SCARE_NEAR out,
   * never over the parked car, face a hand under the eye line. The lunge closes the gap.
   */
  _solvePlace(lunge) {
    const car = this._sys('car');
    _scarePt.set(this._ex, this._ey, this._ez);
    this.root.worldToLocal(_scarePt);
    const elx = _scarePt.x, ely = _scarePt.y, elz = _scarePt.z;
    let lx, lz, faceY;
    if (this._scareMode === 'seat' && car?.exists) {
      const yaw = car.heading + this._scareBearing;
      const wdx = -Math.sin(yaw), wdz = -Math.cos(yaw);
      const dx = wdx * this._cy - wdz * this._sy, dz = wdx * this._sy + wdz * this._cy;   // world dir -> local
      const reach = Math.max(SCARE_REACH_MIN, SCARE_NEAR_CAR - lunge);
      lx = elx + dx * reach; lz = elz + dz * reach;
      faceY = car.y + SCARE_SEAT_FACE_Y;
    } else {
      const ax = BAY.x - elx, az = SCARE_Z_LOCAL - elz;
      const d = Math.hypot(ax, az) || 1;
      const dx = ax / d, dz = az / d;
      let reach = Math.min(SCARE_NEAR, d) - lunge;
      if (car?.exists && !this.ctx.shared?.inCar) reach = Math.min(reach, this._clearOfCar(car, dx, dz));
      reach = Math.max(SCARE_REACH_MIN, reach);
      lx = elx + dx * reach; lz = elz + dz * reach;
      faceY = ely - SCARE_FOOT_FACE_DROP;
    }
    this._scareLx = lx; this._scareLz = lz; this._scareFaceY = faceY;
    // FACING. The record's `turn` puts the face on -Z, and rotation.y = atan2(-dx, -dz) turns
    // -Z toward (dx, dz). MEASURED in node with the vendored three (the first cut used
    // atan2(dx, dz) and hung the thing with its eyes to the wall).
    this._scareYaw = Math.atan2(lx - elx, lz - elz);
    this._scareX = this.wx(lx, lz); this._scareZ = this.wz(lx, lz);
  }

  /**
   * Start it: seated, as the bumper is about to cross the threshold (or when the car has sat
   * there SCARE_PATIENCE); on foot, on your way out of the bay, or when the opening is in
   * front of you, or when you have stood there long enough. A retry after an unseen drop
   * wants your eyes and nothing else — the walk-out and patience gates are what played it to
   * your back the first time.
   */
  _beginScare(dt) {
    if (!this._scareBody || this._scareT >= 0) return;
    const p = this._sys('player');
    // The doorway, in WORLD, for the reach test and the facing.
    const dx = this.wx(BAY.x, BAY.z - BAY.d * 0.5), dz = this.wz(BAY.x, BAY.z - BAY.d * 0.5);
    // If nobody is in the bay to be frightened, spend it later rather than on an empty room.
    if (!p?.pos || Math.hypot(p.pos.x - dx, p.pos.z - dz) > SCARE_REACH) return;
    this._scareWait += dt > 0 ? dt : 1 / 60;
    const where = this._eyeWorld();
    if (!where) return;
    const cam = this._sys('camera');
    const car = this._sys('car');
    const retry = this._scareTry > 0;
    let go = false;

    if (where === 'seat') {
      // The car's centre and its bumper, in the bay's own frame.
      _scarePt.set(car.x, 0, car.z); this.root.worldToLocal(_scarePt);
      const carLx = _scarePt.x, carLz = _scarePt.z;
      const fx = -Math.sin(car.heading), fz = -Math.cos(car.heading);
      _scarePt.set(car.x - fx * FOOTPRINT.z0, 0, car.z - fz * FOOTPRINT.z0);   // z0 < 0: the nose
      this.root.worldToLocal(_scarePt);
      const noseLz = _scarePt.z;
      const inside = carLz > SCARE_Z_LOCAL - SCARE_SEAT_PAST && carLz < BAY.z + BAY.d * 0.5 + 0.6
        && Math.abs(carLx - BAY.x) < BAY.w * 0.5 + 0.6;
      if (inside) {
        const rolling = car.mode === 'driving' && car.speed > SCARE_CAR_MIN_SPEED;
        const lead = Math.max(SCARE_CAR_LEAD_M, car.speed * SCARE_CAR_LEAD_S);
        go = (rolling && noseLz - lead <= SCARE_Z_LOCAL) || this._scareWait >= SCARE_PATIENCE;
      } else {
        go = this._faceDot(cam, dx, dz) >= SCARE_OUT_FACE;   // already out: the mouth in front of you
      }
      if (!go) return;
      this._scareMode = 'seat';
      const b = cam ? wrapPi(cam.yaw - car.heading) : 0;
      this._scareBearing = b < -SCARE_SEAT_CONE ? -SCARE_SEAT_CONE : b > SCARE_SEAT_CONE ? SCARE_SEAT_CONE : b;
      this._snatchAt = SCARE_SEAT_HOLD;
    } else {
      _scarePt.set(this._ex, 0, this._ez); this.root.worldToLocal(_scarePt);
      const inBay = _scarePt.z > SCARE_Z_LOCAL - 0.35
        && _scarePt.z < BAY.z + BAY.d * 0.5 + 0.6
        && Math.abs(_scarePt.x - BAY.x) < BAY.w * 0.5 + 0.6;
      const toDoor = Math.hypot(BAY.x - _scarePt.x, SCARE_Z_LOCAL - _scarePt.z);
      const dot = this._faceDot(cam, dx, dz);
      go = inBay
        ? (dot >= SCARE_FACE || (!retry && (toDoor <= SCARE_DOOR_NEAR || this._scareWait >= SCARE_PATIENCE)))
        : dot >= SCARE_OUT_FACE;
      if (!go) return;
      this._scareMode = 'foot';
      this._snatchAt = SCARE_SNATCH;
    }
    this._scareT = 0;
    this._scareSeen = 0;
    this._scareSpent = false;
    this._lunged = false; this._withdrew = false;
    this._coilReach();
    this._solvePlace(0);
    // THE FLAG IS NOT WRITTEN HERE. It is written at the snatch, if you saw it (_stepScare).
    this._sys('audio')?.dread?.('stinger', this._scareX, this._scareFaceY + 0.3, this._scareZ, 1);
    this._sys('fx')?.addTrauma?.(0.82);
  }

  _stepScare(dt) {
    const body = this._scareBody;
    if (!body || this._scareT < 0) return;
    this._scareT += dt;
    const t = this._scareT, g = body.group;
    const where = this._eyeWorld();
    const car = this._sys('car');
    // SEATED, the snatch comes the frame the car's centre is through the plane — the roof is
    // under it and the thing is over the roof — or at the hold's ceiling, whichever is first.
    if (this._scareMode === 'seat' && where === 'seat' && t < this._snatchAt) {
      _scarePt.set(car.x, 0, car.z); this.root.worldToLocal(_scarePt);
      if (_scarePt.z < SCARE_Z_LOCAL - SCARE_SEAT_PAST) this._snatchAt = t;
    }
    const snatchAt = this._snatchAt;
    if (t >= snatchAt + SCARE_GONE_S) { this._finishScare(); return; }

    // IT ARRIVES BETWEEN YOU AND THE WAY OUT, AND CLOSE. Everything here is in the station's
    // LOCAL frame, because that is what `root` is — _buildShutter puts the slats at
    // (BAY.x, padY, BAY.z - BAY.d/2 + 0.22) for the same reason, and a world coordinate on a
    // child of a rotated parent lands in the trees.
    //
    // THE LUNGE. Once, a third of the way through the hold, it takes SCARE_LUNGE_M off the
    // gap and keeps it. A thing that hangs perfectly still is a prop; a thing that comes at
    // you once and then stops is a decision. The reach uncoils on the same beat.
    const lungeM = this._scareMode === 'seat' ? SCARE_LUNGE_M_SEAT : SCARE_LUNGE_M;
    const lunge = t <= SCARE_LUNGE ? 0
      : lungeM * Math.min(1, (t - SCARE_LUNGE) / SCARE_LUNGE_S);
    if (where) this._solvePlace(lunge);
    const lx = this._scareLx, lz = this._scareLz;
    // The origin is the heels, HEAD_Y x scale above the face it hangs by.
    const originY = this._scareFaceY + HEAD_Y * this._scareS;
    const fromY = originY + SCARE_ABOVE;
    // THE ROOM GOES WITH IT. The bay lamp is crushed to a coal while the thing is in the
    // doorway and comes back as it is snatched away, so the light you were standing in is
    // the second thing it takes.
    this._bayOn(t < snatchAt ? BAY_DIM * 0.22 : BAY_DIM);
    g.rotation.set(0, this._scareYaw, Math.PI);   // Z is the inversion: it hangs by its heels

    // 1. THE DROP, 0.08 s from above the lintel to the face target. 2. THE HOLD, twitching.
    // 3. THE SNATCH, accelerating upward out through the top of the doorway.
    let y;
    if (t < SCARE_DROP) {
      const k = t / SCARE_DROP;
      y = fromY + (originY - fromY) * (1 - (1 - k) * (1 - k));
    } else if (t < snatchAt) {
      // Not still: a 14 Hz tremor, and a deeper shudder on the frames it lunges.
      const shudder = t > SCARE_LUNGE && t < SCARE_LUNGE + SCARE_LUNGE_S ? 0.055 : 0.012;
      y = originY + Math.sin(t * 88) * shudder;
      if (t > SCARE_LUNGE && !this._lunged) {
        this._lunged = true;
        this._sys('fx')?.addTrauma?.(0.34);
        // DREAD.watcher is the county's "cloth and breath" row and this is the one time
        // anything in the game is close enough for it to be literal. It is the reach's sound.
        this._sys('audio')?.dread?.('watcher', this._scareX, this._scareFaceY + 0.2, this._scareZ, 1);
      }
    } else {
      const k = (t - snatchAt) / SCARE_GONE_S;
      y = originY + (SCARE_ABOVE + 1.6) * k * k;
      if (!this._withdrew) {
        this._withdrew = true;
        // SPENT ON SIGHT. Seen for SCARE_SEEN_S and it happened: the flag, the county's sound
        // for the watcher being gone, the kick. Unseen, it leaves without a word and waits.
        this._scareSpent = this._scareSeen >= SCARE_SEEN_S;
        if (this._scareSpent) {
          this._sys('progress')?.flag(SCARE_FLAG, 1);
          this._sys('audio')?.dread?.('withdraw', this._scareX, this._scareFaceY + 1.6, this._scareZ, 1);
          this._sys('fx')?.addTrauma?.(0.28);
        }
      }
    }
    g.position.set(lx, y, lz);
    g.visible = true;
    // Was the face in frame? Counted only while it is actually there.
    if (where && t >= SCARE_DROP && t < snatchAt
        && this._inView(this._scareX, this._scareFaceY, this._scareZ)) this._scareSeen += dt;

    // Its own 14 Hz twitch, jaw open, eyes up. moveAmp 0: it is not walking anywhere.
    const coil = t < SCARE_DROP ? t / SCARE_DROP : 1;
    body.animate?.({ time: (this.ctx.time?.t || 0), dead: false, moveAmp: 0, coil, swing: 0, gait: 0 });
    // telegraph() is the eye emissive: 1.5 + v*2 on the Marrow, and animate() above writes
    // its own value first, so this is the one that lands. The reach's tip shares that
    // material: two eyes at 6 is a payoff, a metre of tendril at 6 is a lamp, so 3.9.
    body.telegraph?.(coil * 1.2);
    this._animateReach(t, snatchAt);
  }

  /**
   * The reach, per frame. The mount is aimed at the eye through the inverted, rotated, scaled
   * parent (three's lookAt premultiplies the parent's inverse rotation, so +Z lands on the
   * target — measured), then slerped back toward its rest pose by how coiled the root still
   * is. The chain straightens joint by joint from SCARE_LUNGE with LIMB_DELAY_S between them;
   * how straight is solved from the mount-to-eye distance so the tip stops LIMB gap short of
   * the eye: a chain of N equal joints each bent by B/N is a circular arc whose chord is
   * L sin(B/2)/(B/2), and sin x / x ~ 1 - x^2/6 gives x from the chord in one line. The first
   * joint starts x above the aim and the rest bend back down, so the arc bulges UP and comes
   * onto the face from above. 14 Hz on the last two joints, a slow writhe along all of them,
   * and everything coils again in LIMB_SNAP_S when it is taken.
   */
  _animateReach(t, snatchAt) {
    const mount = this._reach, segs = this._reachSegs;
    if (!mount || !segs) return;
    this._scareBody.group.updateMatrixWorld(true);   // the mount's world position, its parent's rotation
    _eyeV.set(this._ex, this._ey, this._ez);
    const since = t - SCARE_LUNGE;
    const snapping = t >= snatchAt;
    const kRoot = snapping ? 1 - Math.min(1, (t - snatchAt) / LIMB_SNAP_S)
      : (since <= 0 ? 0 : ease.outCubic(Math.min(1, since / LIMB_UNCOIL_S)));
    mount.lookAt(_eyeV);
    if (kRoot < 1) mount.quaternion.slerp(this._reachRest, 1 - kRoot);
    _mountV.setFromMatrixPosition(mount.matrixWorld);
    const gap = this._scareMode === 'seat' ? LIMB_TIP_GAP_SEAT : LIMB_TIP_GAP_FOOT;
    const chord = Math.max(0.3, _mountV.distanceTo(_eyeV) - gap);
    const straight = LIMB_SEGS * LIMB_SEG_M * this._scareS;
    const r = chord >= straight ? 1 : chord / straight;
    // half the arc's total bend: the series guess, then two Newton steps on sin x / x = r
    // (the guess alone left the tip 0.1 m long at x ~ 1.4, measured in node)
    let x = r >= 0.999 ? 0 : Math.min(2.2, Math.sqrt(6 * (1 - r)));
    if (x > 0) for (let n = 0; n < 2; n++) {
      const s = Math.sin(x), c = Math.cos(x);
      x -= (s / x - r) / ((x * c - s) / (x * x));
    }
    const bend = 2 * x / LIMB_SEGS;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i];
      let k;
      if (snapping) k = kRoot;
      else { const si = since - i * LIMB_DELAY_S; k = si <= 0 ? 0 : ease.outCubic(Math.min(1, si / LIMB_UNCOIL_S)); }
      // rotation.x > 0 turns +Z toward -Y, so the root tilts UP by -(x - bend/2) and every
      // joint after it bends back down by +bend
      const target = i === 0 ? -(x - bend * 0.5) : bend;
      seg.rotation.x = LIMB_CURL + (target - LIMB_CURL) * k;
      const tremor = i >= segs.length - 2 ? Math.sin(t * 88) * LIMB_TREMOR : 0;
      seg.rotation.y = (Math.sin(t * 2.3 + i * 0.9) * LIMB_WRITHE + tremor) * k;
      seg.rotation.z = Math.sin(t * 1.7 + i * 1.3) * LIMB_WRITHE * 0.6 * k;
    }
  }

  /** The end of a drop: over for good if it was seen, hidden and re-armed if it was not. */
  _finishScare() {
    if (this._scareSpent) { this._endScare(); return; }
    const body = this._scareBody;
    this._scareT = -1;
    this._scareTry++;
    if (this._scareTry >= SCARE_TRIES) { this._endScare(); return; }    // enough: nobody is looking
    // Nobody saw it. Hide it where it is (no rebuild: the same body, the same seed, and no
    // hitch), coil the reach, and wait SCARE_REARM_S before it may try again for your eyes.
    if (body) body.group.visible = false;
    this._coilReach();
    this._doneT = -SCARE_REARM_S;
    this._scareWait = 0;
  }

  _endScare() {
    const body = this._scareBody;
    this._scareT = -1;
    this._scareBody = null;
    const geos = this._reachGeos;
    this._reach = null; this._reachSegs = null; this._reachGeos = null;
    if (geos) for (let i = 0; i < geos.length; i++) geos[i].dispose();   // body.dispose() covers only its own sets
    if (!body) return;
    body.group.visible = false;
    body.group.removeFromParent();
    body.dispose?.();
  }

  present() {
    // The radio's one warm pip, lit from the moment the voice starts. An emissive value on a
    // material the bay already has would be cheaper still, but the pip is a mesh in the
    // merged station geometry, so the honest thing is a flag other systems can read.
    void this._radioLit;
  }

  state() {
    return {
      stage: this.stage, done: this.done,
      elapsed: Math.min(999, Math.round(this.elapsed * 10) / 10),
      shutter: Math.round(this.shutterK * 100) / 100,
      bayLit: !!this.bayLamp?.inUse,
      // The thing at the door, for tools/door-scare-check.mjs. Local (station) frame.
      scare: {
        armed: !!this._scareBody, running: this._scareT >= 0,
        t: Math.round(this._scareT * 1000) / 1000, mode: this._scareMode,
        seen: Math.round(this._scareSeen * 1000) / 1000, tries: this._scareTry,
        spent: !!this._scareSpent, snatchAt: this._snatchAt,
        lx: this._scareLx, lz: this._scareLz, faceY: this._scareFaceY,
        x: this._scareX, z: this._scareZ,
      },
    };
  }

  dispose() {
    for (const off of this._offs) off?.();
    this._offs.length = 0;
    this._bayOff(); this._mouthOff();
    if (this._collider >= 0) this._sys('collision')?.removeChunk?.('garage-shutter');
    this._clockGeo?.dispose(); this._clockMat?.dispose(); this._clockTex?.dispose();
    this._shadeGeo?.dispose(); this._shadeMat?.dispose();
    this._slatGeo?.dispose(); this._shutterMat?.dispose();
    this._endScare();
    this._glowGeo?.dispose(); this._glowMat?.dispose();
    this.root?.removeFromParent();
  }
}

export default GarageOpening;
