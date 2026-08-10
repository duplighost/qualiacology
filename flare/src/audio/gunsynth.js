// THE GUNSHOT — four layers, one armoury.
//
// Four guns must read as one armoury and still be told apart in the dark with
// your back to the room. The separator is WEIGHT CLASS, carried by a 4th-order
// LOWPASS ladder (BREACHER 200 · LANCE 600 · SIDEARM 900 · REPEATER 1100 Hz),
// and the reason it is a lowpass is the whole mix law: the draft's "highpass"
// ladder put every shot inside EARSHOT's 2.5-5.5 kHz band, and a 200 Hz highpass
// does not make a shotgun chesty — it removes the chest (C2-F11).
//
// The four layers, adapted from CINDERBLOOM §5.1 to FLARE's reserved band:
//
//   1 MECHANICAL  the shared click: triangle 1200 -> 200 Hz over 40 ms. The bolt,
//                 the sear, the action. It skips the weapon ladder on purpose so
//                 the four guns share one hand — its 3rd harmonic at 3.6 kHz is
//                 -19 dB and takes another ~28 dB from the bus filter, which is
//                 exactly how it survives the mix law.
//   2 BODY        the crack. Noise through the weapon's ladder plus the tone
//                 stack. Enters the bus at `bodyIn`, PAST the 400 Hz punch carve
//                 and through the +2 dB 3.5 kHz shelf — it is the only thing in
//                 the game allowed in that lane for 120 ms.
//   3 TAIL        the room answering. Long, dark, non-positional, -9 dB.
//   4 SUB         42 Hz sine, -6 dB, mono, and DELETED beyond 30 m — it is a
//                 near-field phenomenon and keeping it makes distant fire sound
//                 like it is inside your head.
//
// THE ANTI-MACHINE-GUN RULE. Cutoff, tone frequency and layer offsets all jitter
// +/-6% per shot from ctx.rng.fork('gunAudio'). Firing the identical buffer
// twelve times a second phase-locks into a buzzing drone, and that is the single
// most common reason a browser shooter's audio sounds cheap.

import { FEEL } from '../feel.js';
import { clamp, clamp01 } from '../core/math.js';

const A = FEEL.audio;

export const GUN = Object.freeze({
  // Per-weapon body character. The cutoff itself lives in FEEL.audio.weaponFilter
  // (it is a mix-law number, not a texture number); this table is the texture.
  body: Object.freeze({
    breacher: Object.freeze({ dur: 0.180, peak: 0.35, toneType: 'sawtooth', toneHz: 90, subTone: 55 }),
    lance: Object.freeze({ dur: 0.090, peak: 0.22, toneType: 'sawtooth', toneHz: 140, subTone: 80 }),
    sidearm: Object.freeze({ dur: 0.060, peak: 0.16, toneType: 'square', toneHz: 180, subTone: 0 }),
    repeater: Object.freeze({ dur: 0.040, peak: 0.12, toneType: 'square', toneHz: 220, subTone: 0 }),
  }),
  repeaterToneSpan: 40,        // REPEATER's square jitters 220..260 Hz per shot

  jitter: 0.06,                // the anti-machine-gun rule, +/-6%
  layerStagger: 0.003,         // 0-3 ms of deterministic offset between layers

  clickHz: 1200,
  clickEndHz: 200,
  clickGlide: 0.040,
  clickAttack: 0.001,
  clickDur: 0.060,
  clickDecay: 0.020,

  tailHz: 320,
  tailDur: 0.380,
  tailDecay: 0.140,
  tailDb: -9,

  subHz: 42,
  subAttack: 0.008,
  subDur: 0.140,
  subDecay: 0.045,
  subDb: -6,
  subMaxDistance: 30,

  bodyAttack: 0.003,
  bodyNoise: 0.85,
  bodyTone: 0.45,

  emptyResonanceHz: 1400,      // <= 5 rounds: an emptier magazine rings
  emptyRoundsBelow: 5,
  emptyResonanceMix: 0.35,

  dryHz: 260,                  // the dry click, an octave below the live one
  dryEmptyHz: 130,             // ...and another octave down with nothing to load
  dryDur: 0.070,
  dryPeak: 0.14,

  headTone: 880,               // headshot: a clean fifth, instantly legible
  headFifth: 1320,
  headDur: 0.120,
  headPeak: 0.18,

  // The impact language's audio side. `locked` is deliberately far from `graze`
  // (C3-F8): a refused hit must be distinguishable without motion, so it gets a
  // wider gap AND a lower centre frequency, not just a quieter version.
  hit: Object.freeze({
    break: Object.freeze({ hz: 380, dur: 0.150, peak: 0.34, noise: 0.65 }),
    hurt: Object.freeze({ hz: 300, dur: 0.100, peak: 0.24, noise: 0.55 }),
    graze: Object.freeze({ hz: 620, dur: 0.060, peak: 0.14, noise: 0.38 }),
    locked: Object.freeze({ hz: 180, dur: 0.130, peak: 0.20, noise: 0.20 }),
  }),
  hitFilterHz: 1500,
  ownPan: 0.06,                // the weapon sits slightly right of centre
  panSpread: 0.55,
});

const WEAPON_BY_ID = new Map(FEEL.weapons.map(w => [w.id, w]));

export class GunSynth {
  constructor(pool, bus, rng) {
    this.pool = pool;
    this.bus = bus;
    this.rng = rng.fork('gunAudio');
    this.shots = 0;
    this.lastWeapon = '';
  }

  /** +/-`amount` fraction, deterministic. Never Math.random(). */
  _wobble(amount) { return 1 + (this.rng.next() * 2 - 1) * amount; }

  /**
   * One player shot. `when` is an absolute audio time so the caller can pass
   * `currentTime + (dt - subT)` and get sample-accurate cadence — sub-frame
   * scheduling is worth more to perceived quality than any single graphics
   * feature, and quantising a 720 rpm gun to the sim frame is the difference
   * between a rifle and a sewing machine.
   */
  shot(weaponId, when, magFrac, distance) {
    const w = WEAPON_BY_ID.get(weaponId);
    const b = GUN.body[weaponId];
    if (!w || !b) return false;

    const t = this.bus.at(when);
    const cut = A.weaponFilter[weaponId] * this._wobble(GUN.jitter);
    const rounds = Math.round(clamp01(magFrac) * w.mag);
    const empty = rounds <= GUN.emptyRoundsBelow;
    const d = distance === undefined ? 0 : distance;

    // --- 2. BODY — the only thing allowed past the 400 Hz carve --------------
    let s = this.pool.spec();
    s.when = t;
    s.peak = b.peak;
    s.attack = GUN.bodyAttack;
    s.dur = b.dur;
    s.decay = b.dur / 3;
    s.noise = GUN.bodyNoise;
    s.tone = GUN.bodyTone;
    s.toneType = b.toneType;
    s.toneHz = (b.toneHz + (weaponId === 'repeater' ? this.rng.next() * GUN.repeaterToneSpan : 0)) * this._wobble(GUN.jitter);
    s.filterHz = empty ? cut * (1 - GUN.emptyResonanceMix) + GUN.emptyResonanceHz * GUN.emptyResonanceMix : cut;
    this.pool.playFlat('gunBody', GUN.ownPan, s);

    // --- 1. MECHANICAL — the shared click, no weapon ladder ------------------
    s = this.pool.spec();
    s.when = t + this.rng.next() * GUN.layerStagger;
    s.peak = A.clickPeak;
    s.attack = GUN.clickAttack;
    s.dur = GUN.clickDur;
    s.decay = GUN.clickDecay;
    s.tone = 1;
    s.toneType = 'triangle';
    s.toneHz = GUN.clickHz * this._wobble(GUN.jitter);
    s.toneEnd = GUN.clickEndHz;
    s.glide = GUN.clickGlide;
    this.pool.playFlat('gun', GUN.ownPan, s);

    // --- 3. TAIL — the room answering ---------------------------------------
    s = this.pool.spec();
    s.when = t + this.rng.next() * GUN.layerStagger;
    s.peak = b.peak * Math.pow(10, GUN.tailDb / 20);
    s.attack = GUN.bodyAttack;
    s.dur = GUN.tailDur;
    s.decay = GUN.tailDecay;
    s.noise = 1;
    s.filterHz = GUN.tailHz;
    this.pool.playFlat('gun', 0, s);

    // --- 4. SUB — near-field only -------------------------------------------
    if (d < GUN.subMaxDistance) {
      s = this.pool.spec();
      s.when = t + this.rng.next() * GUN.layerStagger;
      s.peak = b.peak * Math.pow(10, GUN.subDb / 20);
      s.attack = GUN.subAttack;
      s.dur = GUN.subDur;
      s.decay = GUN.subDecay;
      s.tone = 1;
      s.toneType = 'sine';
      s.toneHz = GUN.subHz;
      this.pool.playFlat('gun', 0, s);
    }

    // The two mix moves that make a shot read as PUNCH rather than LOUD, and
    // the ear that flinches from it.
    this.bus.punch(t);
    this.bus.reflex(t);

    this.shots++;
    this.lastWeapon = weaponId;
    return true;
  }

  /**
   * Dry fire. Empty magazine drops the click an octave; empty RESERVE drops it
   * two and is the only sound in the game that says "there is nothing to load"
   * without a word of text (C3-F12).
   */
  dryFire(when, hasReserve) {
    const s = this.pool.spec();
    s.when = when;
    s.peak = GUN.dryPeak;
    s.attack = GUN.clickAttack;
    s.dur = GUN.dryDur;
    s.decay = GUN.clickDecay;
    s.tone = 1;
    s.toneType = 'square';
    s.toneHz = hasReserve ? GUN.dryHz : GUN.dryEmptyHz;
    s.noise = 0.2;
    s.filterHz = A.weaponFilter.sidearm;
    return this.pool.playFlat('gun', GUN.ownPan, s);
  }

  /** The headshot cue: a sine and a clean fifth above it. */
  headshot(x, y, z, when) {
    let s = this.pool.spec();
    s.when = when;
    s.peak = GUN.headPeak;
    s.attack = GUN.clickAttack;
    s.dur = GUN.headDur;
    s.decay = GUN.headDur / 3;
    s.tone = 1;
    s.toneType = 'sine';
    s.toneHz = GUN.headTone;
    this.pool.playAt('transient', x, y, z, s);

    s = this.pool.spec();
    s.when = when;
    s.peak = GUN.headPeak * 0.5;
    s.attack = GUN.clickAttack;
    s.dur = GUN.headDur;
    s.decay = GUN.headDur / 3;
    s.tone = 1;
    s.toneType = 'triangle';
    s.toneHz = GUN.headFifth;
    return this.pool.playAt('transient', x, y, z, s);
  }

  /**
   * THE ONE LAW's audio channel. Four kinds, four distinguishable sounds, and
   * `locked` is the one that must never be mistaken for a hit that landed.
   */
  hit(kind, x, y, z, when) {
    const h = GUN.hit[kind] || GUN.hit.hurt;
    const s = this.pool.spec();
    s.when = when;
    s.peak = h.peak;
    s.attack = GUN.bodyAttack;
    s.dur = h.dur;
    s.decay = h.dur / 3;
    s.noise = h.noise;
    s.tone = 1 - h.noise;
    s.toneType = 'triangle';
    s.toneHz = h.hz * this._wobble(GUN.jitter);
    s.filterHz = GUN.hitFilterHz;
    return this.pool.playAt('transient', x, y, z, s);
  }

  /** Pan for a world position relative to the listener's right vector. */
  static panFor(rightDot) { return clamp(rightDot * GUN.panSpread, -1, 1); }
}

export function createGunSynth(pool, bus, rng) { return new GunSynth(pool, bus, rng); }
