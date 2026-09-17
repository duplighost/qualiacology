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
import { OPENING as O } from './opening-layout.js';
import { buildBody } from '../enemies/bodies.js';

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
// THE THING AT THE DOOR. The whole event is 0.58 s and it happens once per save; the long
// reasoning is on _readyScare below. SCARE_WAIT is the beat of empty yard after the shutter
// locks — the relief that the drop takes away.
const SCARE_FLAG = 'opening:door-scare';
const SCARE_WAIT = 0.65;        // s of nothing after the shutter is fully up
// ALEX, 2026-09-16: "THe scary thing that pops in when the garage door opens has to be
// scarier. What triggers it? timing or leaving the garage? make sure the player sees it."
//
// IT IS TIMING, and it always was: SCARE_WAIT after the shutter locks, once per save, if
// somebody is within SCARE_REACH of the doorway. Leaving the garage has nothing to do with
// it. And that is exactly how it could be missed — the whole thing was 0.58 s, of which 0.33
// was the hold, so a player looking at the car when the clock ran out saw an empty doorway by
// the time they turned round. Two fixes, and only one of them is a number:
//
//   1. IT WAITS FOR YOUR EYES. The drop does not begin until the doorway is inside the
//      camera's forward half, up to SCARE_PATIENCE seconds. Nothing takes the camera — you
//      are never turned — it is the thing being patient, which is worse.
//   2. IT STAYS LONG ENOUGH TO BE SEEN, AND IT MOVES WHILE IT IS THERE. A second of hold, a
//      lunge a third of the way through it, and the bay light dies as it arrives and comes
//      back as it leaves, so the room you were safe in goes with it.
const SCARE_PATIENCE = 7.0;     // s it will wait for the doorway to be in front of you
const SCARE_FACE = -0.05;       // dot of camera forward to the doorway: the forward half
// ALEX, 2026-09-16: "you can exit the door before ever seeing the jump scare."
//
// He is right, and waiting for his eyes is what made it possible. MEASURED: the bay is 9.6 m
// deep and the night starts 8.34 m back from the opening, so a player who walks out while
// looking at the car, the rack or the floor covers the whole distance without the facing gate
// ever passing — and once they are through it, the doorway is BEHIND them and the drop lands
// at their back.
//
// So walking out is the trigger. Inside SCARE_DOOR_NEAR of the opening you are leaving by it,
// whatever you happen to be looking at, and the thing drops into the gap you are walking
// toward with the width of the bay still in front of you. That is 2.8 m of floor from the
// spawn, and a sprint covers it in under half a second — which is the point: it is between
// you and the way out before you get there.
//
// AND IT NEVER SPEAKS TO YOUR BACK. If you are already out on the forecourt it holds, patience
// and all, until the mouth of the garage is properly in front of you again. A scare you were
// facing away from did not happen, and it only gets to happen once.
const SCARE_DOOR_NEAR = 5.5;    // m from the opening, inside the bay: you are on your way out
const SCARE_OUT_FACE = 0.50;    // and from outside it wants the mouth squarely in front of you
const SCARE_DROP = 0.08;        // the fall into the doorway
const SCARE_LUNGE = 0.46;       // when it comes at you, once, inside the hold
const SCARE_LUNGE_S = 0.16;     // and how long that takes
const SCARE_LUNGE_M = 0.62;     // metres it closes
const SCARE_SNATCH = 1.06;      // it is taken back upward at this point
const SCARE_GONE = 1.30;        // and it is out of sight by this one
// THESE ARE THE BODY ORIGIN, WHICH IS ITS FEET, and it hangs head-down — so the origin is
// ABOVE the face by the whole length of the thing. The Marrow is 2.28 m at scale 1.08, so
// its head is 2.46 m below its heels: an origin at 4.02 puts the face at about 1.56, which is
// a standing eye. MEASURED after, not assumed — the first cut inverted about the feet and put
// the entire body under the floor with its ankles showing.
const SCARE_FROM_Y = 7.00;      // above the lintel, where it waits and where it goes back
const SCARE_HOLD_Y = 4.02;      // heels here, face at a standing eye
const SCARE_Z_LOCAL = BAY.z - BAY.d * 0.5 + 0.34;   // just inside the doorway
const _scarePt = new THREE.Vector3();
const SCARE_NEAR = 2.35;        // metres from the body: close enough to fill the frame
const SCARE_REACH = 26;         // nobody in the bay, no scare: spend it on a room with a body in it
const CLOCK_FROM = { h: 1, m: 58, s: 0 };

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
    this._withdrew = false;
    this._offs = [];
  }

  _sys(id) { return this.ctx.systems.get(id); }

  init() {
    const places = this._sys('places');
    const rec = places?.nodes?.get?.(O.id);
    if (!rec) return;                      // no station, no garage: a test world
    this.yaw = rec.yaw; this.padY = rec.padY;
    const cy = Math.cos(rec.yaw), sy = Math.sin(rec.yaw);
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
    const y0 = this.padY + this.shutterK * (SHUTTER_H + 0.18);
    this._collider = col.addCollider({
      kind: 'obb', x: wx, z: wz, halfX: SHUTTER_W * 0.5, halfZ: 0.14, yaw: this.yaw,
      y0, y1: y0 + SHUTTER_H, tag: 'metal', climbable: false,
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
   * nothing to shoot back: it is a body this lane builds, moves for 0.58 s and disposes, like
   * the shutter. And it happens ONCE per save — a scare you get every reload is a nuisance,
   * and Alex's law on sound is "nothing loud or annoying". The stinger is short, the whole
   * event is under a second, and it never happens again.
   */

  /** Build the body, hidden, while the radio is still talking. Never at boot. */
  _readyScare() {
    if (this._scareBody !== undefined) return;
    this._scareBody = null;
    if (this._sys('progress')?.flag(SCARE_FLAG)) return;      // already had it, once is once
    let seed = 20260915;
    const rng = { next: () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; } };
    try {
      const body = buildBody('marrow', rng);
      if (!body?.group) return;
      body.group.visible = false;
      body.group.scale.setScalar(body.scale || 1);
      this.root.add(body.group);
      this._scareBody = body;
    } catch (e) { void e; }                                    // no body, no scare, no crash
  }

  /** Start it, once: on your way out of the bay, or when the opening is in front of you. */
  _beginScare(dt) {
    if (!this._scareBody || this._scareT >= 0) return;
    const p = this._sys('player');
    // The doorway, in WORLD, for the sound and the reach test.
    const dx = this.wx(BAY.x, BAY.z - BAY.d * 0.5), dz = this.wz(BAY.x, BAY.z - BAY.d * 0.5);
    // If nobody is in the bay to be frightened, spend it later rather than on an empty room.
    if (!p?.pos || Math.hypot(p.pos.x - dx, p.pos.z - dz) > SCARE_REACH) return;
    this._scareWait = (this._scareWait || 0) + (dt > 0 ? dt : 1 / 60);

    // Where the body is standing, in the bay's own frame, and how far that is from the gap.
    _scarePt.set(p.pos.x, 0, p.pos.z);
    this.root.worldToLocal(_scarePt);
    const inBay = _scarePt.z > SCARE_Z_LOCAL - 0.35
      && _scarePt.z < BAY.z + BAY.d * 0.5 + 0.6
      && Math.abs(_scarePt.x - BAY.x) < BAY.w * 0.5 + 0.6;
    const toDoor = Math.hypot(BAY.x - _scarePt.x, SCARE_Z_LOCAL - _scarePt.z);

    const cam = this._sys('camera');
    const ax = dx - p.pos.x, az = dz - p.pos.z, d = Math.hypot(ax, az) || 1;
    const dot = cam ? (ax * -Math.sin(cam.yaw) + az * -Math.cos(cam.yaw)) / d : 1;

    // Inside: you are leaving by it, or you are looking at it, or you have stood there long
    // enough. Outside: only with the mouth squarely in front of you, so it is never at a back.
    const go = inBay
      ? (toDoor <= SCARE_DOOR_NEAR || dot >= SCARE_FACE || this._scareWait >= SCARE_PATIENCE)
      : dot >= SCARE_OUT_FACE;
    if (!go) return;
    this._scareT = 0;
    this._scareX = dx; this._scareZ = dz;
    this._sys('progress')?.flag(SCARE_FLAG, 1);
    this._sys('audio')?.dread?.('stinger', dx, this.padY + 1.7, dz, 1);
    this._sys('fx')?.addTrauma?.(0.82);
  }

  _stepScare(dt) {
    const body = this._scareBody;
    if (!body || this._scareT < 0) return;
    this._scareT += dt;
    const t = this._scareT, g = body.group;
    if (t >= SCARE_GONE) { this._endScare(); return; }

    // IT ARRIVES BETWEEN YOU AND THE DOOR, AND CLOSE. Everything here is in the station's
    // LOCAL frame, because that is what `root` is — _buildShutter puts the slats at
    // (BAY.x, padY, BAY.z - BAY.d/2 + 0.22) for the same reason, and a world coordinate on a
    // child of a rotated parent lands in the trees.
    //
    // At the doorway itself it was 7.7 m from where the night starts: a hanging figure across
    // a room, which is a photograph and not a scare. It drops on the line from the body to the
    // opening it has just been watching, SCARE_NEAR metres out — close enough that a 2.3 m
    // thing fills the frame — and never further than the doorway itself.
    const p = this._sys('player');
    // THE LUNGE. Once, a third of the way through the hold, it takes SCARE_LUNGE_M off the
    // gap and keeps it. A thing that hangs perfectly still is a prop; a thing that comes at
    // you once and then stops is a decision.
    const lunge = t <= SCARE_LUNGE ? 0
      : SCARE_LUNGE_M * Math.min(1, (t - SCARE_LUNGE) / SCARE_LUNGE_S);
    let lx = BAY.x, lz = SCARE_Z_LOCAL, faceY = Math.PI;
    if (p?.pos) {
      _scarePt.set(p.pos.x, 0, p.pos.z);
      this.root.worldToLocal(_scarePt);
      const dx = BAY.x - _scarePt.x, dz = SCARE_Z_LOCAL - _scarePt.z;
      const d = Math.hypot(dx, dz) || 1;
      const reach = Math.max(1.25, Math.min(SCARE_NEAR, d) - lunge);
      lx = _scarePt.x + dx / d * reach;
      lz = _scarePt.z + dz / d * reach;
      faceY = Math.atan2(_scarePt.x - lx, _scarePt.z - lz);
    }
    // THE ROOM GOES WITH IT. The bay lamp is crushed to a coal while the thing is in the
    // doorway and comes back as it is snatched away, so the light you were standing in is
    // the second thing it takes.
    this._bayOn(t < SCARE_SNATCH ? BAY_DIM * 0.22 : BAY_DIM);
    g.rotation.set(0, faceY, Math.PI);        // Z is the inversion: it hangs by its heels

    // 1. THE DROP, 0.09 s from above the lintel to eye height. 2. THE HOLD, twitching.
    // 3. THE SNATCH, accelerating upward out through the top of the doorway.
    let y;
    if (t < SCARE_DROP) {
      const k = t / SCARE_DROP;
      y = SCARE_FROM_Y + (SCARE_HOLD_Y - SCARE_FROM_Y) * (1 - (1 - k) * (1 - k));
    } else if (t < SCARE_SNATCH) {
      // Not still: a 14 Hz tremor, and a deeper shudder on the frames it lunges.
      const shudder = t > SCARE_LUNGE && t < SCARE_LUNGE + SCARE_LUNGE_S ? 0.055 : 0.012;
      y = SCARE_HOLD_Y + Math.sin(t * 88) * shudder;
      if (t > SCARE_LUNGE && !this._lunged) {
        this._lunged = true;
        this._sys('fx')?.addTrauma?.(0.34);
        // DREAD.watcher is the county's "cloth and breath" row and this is the one time
        // anything in the game is close enough for it to be literal.
        this._sys('audio')?.dread?.('watcher', this._scareX, this.padY + 1.6, this._scareZ, 1);
      }
    } else {
      const k = (t - SCARE_SNATCH) / (SCARE_GONE - SCARE_SNATCH);
      y = SCARE_HOLD_Y + (SCARE_FROM_Y + 1.6 - SCARE_HOLD_Y) * k * k;
      if (!this._withdrew) {
        this._withdrew = true;
        this._sys('audio')?.dread?.('withdraw', this._scareX, this.padY + 3.2, this._scareZ, 1);
        this._sys('fx')?.addTrauma?.(0.28);
      }
    }
    g.position.set(lx, this.padY + y, lz);
    g.visible = true;

    // Its own 14 Hz twitch, jaw open, eyes up. moveAmp 0: it is not walking anywhere.
    const coil = t < SCARE_DROP ? t / SCARE_DROP : 1;
    // telegraph() is the eye emissive: 1.5 + v*2 on the Marrow. Past its normal range on
    // purpose — this is the only time in the game the thing is 2.3 m from your face in a lit
    // room, and two eyes catching the work lamp is the whole payoff of the drop.
    body.telegraph?.(coil * 2.4);
    body.animate?.({ time: (this.ctx.time?.t || 0), dead: false, moveAmp: 0, coil, swing: 0, gait: 0 });
  }

  _endScare() {
    const body = this._scareBody;
    this._scareT = -1;
    this._scareBody = null;
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
