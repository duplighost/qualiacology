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
        this.ctx.bus.emit('garage:opening', {});
      }
      this.shutterK = Math.min(1, this.shutterK + dt / SHUTTER_RISE_S);
      this._placeShutter();
      if (this.shutterK >= 1) {
        this.stage = 'done'; this.done = true;
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
    this._glowGeo?.dispose(); this._glowMat?.dispose();
    this.root?.removeFromParent();
  }
}

export default GarageOpening;
