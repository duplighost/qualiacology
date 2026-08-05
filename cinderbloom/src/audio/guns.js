// =============================================================================
// CINDERBLOOM — PROCEDURAL WEAPON AUDIO
// src/audio/guns.js   (owner: audio agent — CONTRACT §4)
// Implements docs/COMBAT_FEEL.md §5.1–5.3, §4.2, §4.5, §3.6.4, §3.6.6.
//
// A CoD gunshot is a DESIGNED sound, not a noise burst. Four layers, separately
// positioned, separately filtered, separately sent to reverb:
//
//   1. MECHANICAL  3-9 kHz bandpassed noise + a 1.9 kHz click. The bolt, the
//                  sear, the action. 4 ms attack / 28 ms decay. -14 dB. Near
//                  field only — it is gone by 25 m because it is a sound made
//                  by a machine 60 cm from your face.
//   2. BODY        the crack. A 55-120 Hz pulse core under shaped noise whose
//                  bandpass COLLAPSES from ~2.6 kHz to ~600 Hz over 70 ms.
//                  3 ms attack, 90 ms exponential decay, tanh-saturated. 0 dB.
//                  The collapse is the whole thing: a static filter is a hiss.
//   3. TAIL        the environment answering (§5.2). Selected by the openness
//                  probe, crossfaded, never hard-switched. The two discrete
//                  basin slapbacks are scheduled from the probe's MEASURED wall
//                  distances (2d/343), not from a preset. -9 dB.
//   4. SUB         42 Hz. The weight. -6 dB, and REMOVED beyond 30 m, because a
//                  sub on a distant shot puts the firefight inside your head.
//
// THE ANTI-MACHINE-GUN RULE (§5.1, trap 6). Firing one identical buffer twelve
// times a second phase-locks into a buzzing drone, and that single mistake is
// why most browser shooters sound cheap. Three independent decorrelations here:
//   - 8 baked body variants per weapon, each with its own noise seed AND its
//     own +/-6% filter-cutoff scaling baked in;
//   - +/-1.5% playback-rate detune per shot (not +/-6%: a 6% pitch wobble on a
//     rifle reads as a broken tape, and the spectral variation is already in
//     the bake where it belongs);
//   - 0-3 ms deterministic inter-layer stagger, so the four layers never sum
//     to the same composite transient twice.
// Every one of those draws from ctx.rng.fork('gunAudio'). Adding an effect
// elsewhere cannot shift this sequence (trap 9).
//
// PUBLIC (via ctx.sys.audio, which forwards):
//   shot({x,y,z,weapon,ammo,player,subT,dt,indoor})
//   impact(surface,x,y,z,{pen,exit})   ricochet(x,y,z)   whizz(x,y,z,dist)
//   reloadCue(name,{ })                casing(x,y,z)     explosion(x,y,z,{r})
// =============================================================================
import {
  noiseFill, biquad, biquadSweep, envAD, fadeOut, damped, sweepSine, grains,
  saturate, normalizeTo, mixInto, dB,
} from './audio.js';
import { clamp, sat } from '../util/math.js';

// -----------------------------------------------------------------------------
// The armoury (COMBAT_FEEL §3.1). Numbers here are ACOUSTIC character, not
// ballistics — the ballistics live in weapons.js.
// -----------------------------------------------------------------------------
export const WEAPONS = {
  // KV-7 CINDER — 6.8x43 gas-piston carbine. Sharp, hard, mid-forward.
  cinder: {
    bodyDur: 0.34, bodyF0: 2600, bodyF1: 620, bodyQ: 0.85, bodyTau: 0.030,
    coreF0: 168, coreF1: 52, coreTau: 0.034, drive: 2.4,
    mechF: [3200, 8600], mechTau: 0.0085, clickF: 1900,
    subF: 42, subTau: 0.045, subDur: 0.24,
    gain: 1.00, tailGain: 1.00,
  },
  // VS-12 KILN — 8.6 mm marksman. Bigger, slower, more low energy, longer tail.
  kiln: {
    bodyDur: 0.46, bodyF0: 1900, bodyF1: 380, bodyQ: 0.75, bodyTau: 0.046,
    coreF0: 132, coreF1: 41, coreTau: 0.052, drive: 2.9,
    mechF: [2400, 7200], mechTau: 0.011, clickF: 1500,
    subF: 36, subTau: 0.070, subDur: 0.34,
    gain: 1.18, tailGain: 1.35,
  },
  // AC-3 TINDER — 40 mm break-action flare launcher. A hollow THOOMP with no
  // crack at all. It must not sound like a rifle or the player will aim it like
  // one (§3.1: "utterly grounded — it is a flare gun").
  tinder: {
    bodyDur: 0.40, bodyF0: 900, bodyF1: 190, bodyQ: 1.4, bodyTau: 0.055,
    coreF0: 210, coreF1: 74, coreTau: 0.060, drive: 1.5,
    mechF: [1600, 5200], mechTau: 0.014, clickF: 1100,
    subF: 48, subTau: 0.050, subDur: 0.26,
    gain: 0.86, tailGain: 0.80,
  },
};

const BODY_VARIANTS = 8;
const MECH_VARIANTS = 6;
const TAIL_VARIANTS = 2;

/**
 * weapons.js publishes `weapon: 'CINDER'` (the display name), not the armoury
 * key. `WEAPONS['CINDER']` is undefined, so before this existed EVERY weapon in
 * the game played the carbine's body layer — the marksman rifle and the flare
 * launcher were acoustically identical to the AR and nobody would have noticed
 * from the smoke test. Match loosely on purpose: display name, key, prefixed
 * model number ('VS-12 KILN') and lower/upper case all resolve.
 */
export function normWeapon(w) {
  if (typeof w !== 'string') return 'cinder';
  const s = w.toLowerCase();
  if (WEAPONS[s]) return s;
  for (const k in WEAPONS) if (s.indexOf(k) >= 0) return k;
  return 'cinder';
}

// §4.5 surface table — decal/particles are vfx.js's, the audio is ours.
// The first seven are §4.5's; `glass`, `sinter` and `coal` are here because
// `combat.js:IMPACT` emits those three and without them all three fell through
// to 'rock' — so the Blackglass stratum, the sinter crust and the coal measures
// (three of ART §5's six biomes) had no acoustic identity at all while the
// ground under them was painted three different colours.
export const IMPACT_SURFACES = [
  'rock', 'ash', 'flora', 'chitin', 'flesh', 'water', 'metal', 'glass', 'sinter', 'coal',
];

export class GunAudio {
  constructor(audio) {
    this.A = audio;
    this.ctx = audio.ctx;
    this.rng = this.ctx.rng.fork('gunAudio');
    this.shotIndex = 0;
    this._lastBv = 0; this._lastMv = 0;
    this.armoury = Object.create(null);      // key -> bake ms, for debugInfo
    this._stats = { shots: 0, impacts: 0, tails: 0, slaps: 0 };
    // per-shot scratch, reused — zero allocation in the hot path (§4)
    this._o = {};
  }

  get sr() { return this.A.sr; }
  _reg(n, ch) { return this.A._reg(n, ch); }

  // ===========================================================================
  // BAKE
  // ===========================================================================
  /**
   * BOOT bake: the carbine, the tails, the impacts, the handling foley. The
   * marksman rifle and the flare launcher are NOT baked here — 8 body variants
   * of each is 340 ms of a 6 s boot budget (CONTRACT §1) spent on two weapons
   * the player does not have in their hands at t=0. `bakeArmoury()` finishes
   * them on an idle callback after `ready`, and `shot()` force-bakes on demand
   * if something fires one first. Each weapon draws from its own
   * `rng.fork('gunBody:'+key)` stream, so bake ORDER cannot shift any other
   * buffer — deferring is free of determinism risk (CONTRACT §3).
   */
  bake() {
    const t0 = performance.now();
    this.bakeWeapon('cinder');
    this._bakeTails();
    this._bakeImpacts();
    this._bakeFoley();
    this.bakeMs = +(performance.now() - t0).toFixed(1);
  }

  /** The two deferred weapons. Returns ms spent. Safe to call twice. */
  bakeArmoury() {
    const t0 = performance.now();
    for (const key in WEAPONS) this.bakeWeapon(key);
    return +(performance.now() - t0).toFixed(1);
  }

  bakeWeapon(key) {
    // The buffer check is not redundant with the armoury flag. `renderProbe`
    // swaps `audio.buf` for a copy living in an OfflineAudioContext, so a
    // weapon lazily baked DURING a probe writes its buffers into a dict that is
    // thrown away while leaving `armoury[key]` set — after which the flag says
    // "baked" and the live context has no such buffer, permanently. Trusting the
    // flag alone silenced the marksman rifle for the rest of the session.
    if (this.armoury[key] && this.A.buf['gb_' + key + '0']) return 0;
    const t0 = performance.now();
    this._bakeWeaponBody(key);
    this._bakeWeaponMech(key);
    return (this.armoury[key] = +(performance.now() - t0).toFixed(1));
  }

  _bakeWeaponBody(key) {
    const sr = this.sr;
    {
      const W = WEAPONS[key];
      const r = this.ctx.rng.fork('gunBody:' + key);
      const rn = () => r.next();
      for (let v = 0; v < BODY_VARIANTS; v++) {
        // +/-6% deterministic cutoff variation, baked (see header).
        const k = 1 + (v / (BODY_VARIANTS - 1) - 0.5) * 0.12;
        const b = new Float32Array(Math.round(W.bodyDur * sr));

        // (a) the transient. 0.7 ms of full-band noise, high-passed. Without
        //     this the shot has no leading edge and reads as a "whump".
        {
          const n = new Float32Array(Math.round(0.0025 * sr));
          noiseFill(n, rn);
          biquad(n, sr, 'hp', 1400 * k, 0.7);
          envAD(n, sr, 0.00006, 0.0007, 0, 1);
          mixInto(b, n, 1.15);
        }
        // (b) the collapsing noise body — this is the crack
        {
          const n = new Float32Array(b.length);
          noiseFill(n, rn);
          biquadSweep(n, sr, 'bp', W.bodyF0 * k, W.bodyF1 * k, W.bodyQ, 0.070, 1.7);
          biquad(n, sr, 'hp', 190, 0.7);
          envAD(n, sr, 0.0030, W.bodyTau, 0, 1.1);
          mixInto(b, n, 1.0);
        }
        // (c) a second, wider noise skirt so it is not a single resonance
        {
          const n = new Float32Array(b.length);
          noiseFill(n, rn);
          biquadSweep(n, sr, 'bp', W.bodyF0 * 2.4 * k, W.bodyF1 * 1.6 * k, 0.45, 0.030, 2.4);
          envAD(n, sr, 0.0016, W.bodyTau * 0.45, 0, 1.0);
          mixInto(b, n, 0.55);
        }
        // (d) the 55-120 Hz pulse core — the chest hit
        sweepSine(b, sr, W.coreF0 * k, W.coreF1, 0.055, W.coreTau, 0.85);
        // (e) muzzle-brake blast: a short LF puff behind the crack
        {
          const n = new Float32Array(b.length);
          noiseFill(n, rn);
          biquad(n, sr, 'lp', 320 * k, 0.9, 0, 2);
          envAD(n, sr, 0.0018, 0.028, 0, 1);
          mixInto(b, n, 0.55);
        }
        saturate(b, W.drive, 0.85);
        biquad(b, sr, 'hp', 42, 0.7);
        fadeOut(b, sr, 0.03);
        this._reg('gb_' + key + v, [normalizeTo(b, 0.97)]);
      }

      // SUB — 42 Hz sine, 8 ms attack, 140 ms decay (§5.1 layer 4)
      {
        const b = new Float32Array(Math.round(W.subDur * sr));
        sweepSine(b, sr, W.subF * 1.35, W.subF, 0.030, W.subTau, 1.0);
        sweepSine(b, sr, W.subF * 1.5, W.subF * 1.5, 0.01, W.subTau * 0.55, 0.18);
        envAD(b, sr, 0.008, W.subTau, 0, 1);
        biquad(b, sr, 'lp', 140, 0.8);
        fadeOut(b, sr, 0.04);
        this._reg('gsub_' + key, [normalizeTo(b, 0.95)]);
      }
    }
  }

  _bakeWeaponMech(key) {
    const sr = this.sr;
    {
      const W = WEAPONS[key];
      const r = this.ctx.rng.fork('gunMech:' + key);
      const rn = () => r.next();
      for (let v = 0; v < MECH_VARIANTS; v++) {
        const k = 1 + (v / (MECH_VARIANTS - 1) - 0.5) * 0.10;
        const b = new Float32Array(Math.round(0.090 * sr));
        // 3-9 kHz bandpassed noise, 4 ms attack / 28 ms decay
        {
          const n = new Float32Array(b.length);
          noiseFill(n, rn);
          biquad(n, sr, 'hp', W.mechF[0] * k, 0.7, 0, 2);
          biquad(n, sr, 'lp', W.mechF[1] * k, 0.7, 0, 2);
          envAD(n, sr, 0.0040, W.mechTau, 0, 1);
          mixInto(b, n, 1.0);
        }
        // the 1.9 kHz click transient — the sear releasing
        damped(b, sr, W.clickF * k, 0.0016, 0.60);
        damped(b, sr, W.clickF * 2.31 * k, 0.0009, 0.28);
        // bolt/carrier body: a duller knock 12 ms later
        damped(b, sr, 620 * k, 0.010, 0.20, 0, 0.012);
        grains(b, sr, rn, { count: 5, from: 0.004, span: 0.045, len: [0.0006, 0.002], hp: 3000, lp: 11000, amp: 0.5, decay: 1.2 });
        biquad(b, sr, 'hp', 900, 0.7);
        fadeOut(b, sr, 0.012);
        this._reg('gm_' + key + v, [normalizeTo(b, 0.9)]);
      }
    }
  }

  /**
   * Reload / handling foley (§3.6.4) — weapon-independent, baked once. Each of
   * these is a BEAT the player learns the reload's timing from; they are not
   * decoration, and weapons.js `_beat()` fires them on the millisecond.
   */
  _bakeFoley() {
    const sr = this.sr;
    const r = this.ctx.rng.fork('gunFoley');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);

    const magRelease = () => {
      const b = new Float32Array(N(0.10));
      damped(b, sr, 2650, 0.0022, 0.9);
      damped(b, sr, 4100, 0.0012, 0.40);
      damped(b, sr, 1250, 0.008, 0.25, 0, 0.002);
      grains(b, sr, rn, { count: 3, span: 0.02, len: [0.0006, 0.002], hp: 3000, lp: 9000, amp: 0.4 });
      biquad(b, sr, 'hp', 700, 0.7); fadeOut(b, sr, 0.01);
      return normalizeTo(b, 0.85);
    };
    const magDrop = (empty) => {
      const b = new Float32Array(N(0.36));
      // polymer mag on ash/rock: two or three light knocks, then nothing
      const knocks = empty ? 3 : 2;
      for (let i = 0; i < knocks; i++) {
        const at = 0.02 + i * (0.055 + rn() * 0.05);
        const f = (empty ? 430 : 300) * (1 + rn() * 0.35);
        damped(b, sr, f, 0.011, 0.7 / (i + 1), 0, at);
        damped(b, sr, f * 2.7, 0.004, 0.30 / (i + 1), 0, at);
        grains(b, sr, rn, { count: 4, from: at, span: 0.02, len: [0.0008, 0.003], hp: 1200, lp: 7000, amp: 0.35 / (i + 1) });
      }
      biquad(b, sr, 'hp', 180, 0.7); fadeOut(b, sr, 0.05);
      return normalizeTo(b, 0.7);
    };
    const magIn = () => {
      const b = new Float32Array(N(0.12));
      damped(b, sr, 380, 0.010, 0.8); damped(b, sr, 780, 0.006, 0.35);
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'bp', 2200, 1.0); envAD(n, sr, 0.0006, 0.006);
      mixInto(b, n, 0.35);
      biquad(b, sr, 'lp', 5200, 0.8); fadeOut(b, sr, 0.02);
      return normalizeTo(b, 0.75);
    };
    const magSeat = () => {   // the hard CLACK. Ammo is credited on this sound.
      const b = new Float32Array(N(0.20));
      const n = new Float32Array(b.length);
      noiseFill(n, rn); biquad(n, sr, 'hp', 1800, 0.7, 0, 2); envAD(n, sr, 0.00008, 0.0035);
      mixInto(b, n, 1.0);
      damped(b, sr, 1120, 0.012, 0.85);
      damped(b, sr, 2340, 0.006, 0.45);
      damped(b, sr, 470, 0.020, 0.40);
      damped(b, sr, 168, 0.032, 0.30);
      saturate(b, 1.8, 0.5);
      biquad(b, sr, 'hp', 110, 0.7); fadeOut(b, sr, 0.03);
      return normalizeTo(b, 0.95);
    };
    const boltRelease = () => {  // heavier, metallic, with travel
      const b = new Float32Array(N(0.30));
      // the carrier running forward: a short accelerating rasp
      {
        const n = new Float32Array(N(0.045));
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 1400, 3600, 1.6, 0.040);
        envAD(n, sr, 0.004, 0.016);
        mixInto(b, n, 0.55);
      }
      const at = 0.042;
      {
        const n = new Float32Array(N(0.02));
        noiseFill(n, rn); biquad(n, sr, 'hp', 1600, 0.7, 0, 2); envAD(n, sr, 0.00006, 0.004);
        mixInto(b, n, 1.2, Math.round(at * sr));
      }
      damped(b, sr, 940, 0.016, 0.95, 0, at);
      damped(b, sr, 1870, 0.008, 0.55, 0, at);
      damped(b, sr, 372, 0.028, 0.55, 0, at);
      damped(b, sr, 96, 0.045, 0.45, 0, at);
      saturate(b, 2.0, 0.6);
      biquad(b, sr, 'hp', 70, 0.7); fadeOut(b, sr, 0.04);
      return normalizeTo(b, 1.0);
    };
    const boltLock = () => {
      const b = new Float32Array(N(0.16));
      damped(b, sr, 1420, 0.009, 0.85); damped(b, sr, 2900, 0.004, 0.40);
      damped(b, sr, 520, 0.014, 0.35);
      const n = new Float32Array(N(0.012));
      noiseFill(n, rn); biquad(n, sr, 'hp', 2200, 0.7); envAD(n, sr, 0.00006, 0.0025);
      mixInto(b, n, 0.9);
      biquad(b, sr, 'hp', 260, 0.7); fadeOut(b, sr, 0.02);
      return normalizeTo(b, 0.85);
    };
    const tug = () => {
      const b = new Float32Array(N(0.14));
      grains(b, sr, rn, { count: 6, span: 0.09, len: [0.0008, 0.004], hp: 900, lp: 6000, amp: 0.7, decay: 1.4 });
      damped(b, sr, 300, 0.010, 0.28, 0, 0.006);
      biquad(b, sr, 'hp', 260, 0.7); fadeOut(b, sr, 0.02);
      return normalizeTo(b, 0.5);
    };
    const dryClick = () => {  // 55 ms, §3.6.6
      const b = new Float32Array(N(0.055));
      damped(b, sr, 2850, 0.0018, 0.9); damped(b, sr, 5400, 0.0008, 0.35);
      damped(b, sr, 980, 0.0055, 0.30, 0, 0.001);
      biquad(b, sr, 'hp', 800, 0.7); fadeOut(b, sr, 0.006);
      return normalizeTo(b, 0.7);
    };
    const swap = (out) => {
      const b = new Float32Array(N(0.30));
      grains(b, sr, rn, { count: 12, span: 0.22, len: [0.001, 0.006], hp: out ? 900 : 1400, lp: 8000, amp: 0.8, decay: 1.0 });
      damped(b, sr, out ? 260 : 420, 0.014, 0.35, 0, out ? 0.16 : 0.02);
      biquad(b, sr, 'hp', 400, 0.7); fadeOut(b, sr, 0.04);
      return normalizeTo(b, 0.6);
    };

    // 'enter' (weapons.js beat @0.62/0.70 s) is the fresh magazine coming OUT
    // of the pouch and up to the well — cloth, then a rising metallic scrape.
    // It is a different event from 'contact' (the mag mouth touching the well,
    // = r_magIn) and from 'seat' (the CLACK). Three beats, three sounds; giving
    // them one sound is what makes a reload read as a single blurred noise
    // instead of the four-beat rhythm §3.6.4 specifies.
    const magRise = () => {
      const b = new Float32Array(N(0.24));
      grains(b, sr, rn, { count: 10, span: 0.16, len: [0.002, 0.009], hp: 420, lp: 3000, amp: 0.8, decay: 0.7 });
      const n = new Float32Array(N(0.09));
      noiseFill(n, rn); biquadSweep(n, sr, 'bp', 900, 2600, 2.0, 0.075); envAD(n, sr, 0.014, 0.040, 0.010);
      mixInto(b, n, 0.45, N(0.070));
      damped(b, sr, 1180, 0.005, 0.20, 0, 0.150);
      biquad(b, sr, 'hp', 340, 0.7); fadeOut(b, sr, 0.03);
      return normalizeTo(b, 0.52);
    };
    // 'cancel' — the reload aborted into a firing grip. Kit shifting, no metal.
    const cancel = () => {
      const b = new Float32Array(N(0.20));
      grains(b, sr, rn, { count: 8, span: 0.15, len: [0.0015, 0.007], hp: 600, lp: 4200, amp: 0.7, decay: 1.1 });
      damped(b, sr, 520, 0.008, 0.18, 0, 0.030);
      biquad(b, sr, 'hp', 420, 0.7); fadeOut(b, sr, 0.03);
      return normalizeTo(b, 0.42);
    };

    this._reg('r_magRelease', [magRelease()]);
    this._reg('r_magDrop', [magDrop(false)]);
    this._reg('r_magDropEmpty', [magDrop(true)]);
    this._reg('r_magRise', [magRise()]);
    this._reg('r_cancel', [cancel()]);
    this._reg('r_magIn', [magIn()]);
    this._reg('r_magSeat', [magSeat()]);
    this._reg('r_boltRelease', [boltRelease()]);
    this._reg('r_boltLock', [boltLock()]);
    this._reg('r_tug', [tug()]);
    this._reg('r_dryClick', [dryClick()]);
    this._reg('r_swapOut', [swap(true)]);
    this._reg('r_swapIn', [swap(false)]);

    // brass hitting the ground — the sound people screenshot the picture of
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.13));
      const f = 3100 + rn() * 2600;
      damped(b, sr, f, 0.016, 0.9);
      damped(b, sr, f * 1.63, 0.010, 0.45);
      damped(b, sr, f * 2.41, 0.006, 0.22);
      damped(b, sr, 780, 0.004, 0.18);
      envAD(b, sr, 0.0002, 0.030, 0, 1);
      biquad(b, sr, 'hp', 1200, 0.7); fadeOut(b, sr, 0.02);
      this._reg('brass' + v, [normalizeTo(b, 0.6)]);
    }
  }

  /**
   * §5.2 tails. Three characters, two variants each, stereo and decorrelated.
   * The basin tail carries only its DIFFUSE decay; the two discrete slapbacks
   * are separate scheduled voices at 2d/343 from the live probe, so walking out
   * of a canyon mouth changes the shot rather than changing a preset.
   */
  _bakeTails() {
    const sr = this.sr;
    const r = this.ctx.rng.fork('gunTail');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);

    for (let v = 0; v < TAIL_VARIANTS; v++) {
      // --- INDOOR, 180 ms: strong 250-800 Hz resonance, high flutter
      {
        const n = N(0.20), L = new Float32Array(n), R = new Float32Array(n);
        for (const ch of [L, R]) {
          noiseFill(ch, rn);
          biquad(ch, sr, 'bp', 430 + v * 40, 0.6);
          biquad(ch, sr, 'peak', 280, 6, 9);
          biquad(ch, sr, 'peak', 610, 7, 8);
          biquad(ch, sr, 'peak', 790, 5, 6);
          // flutter echo: a fast periodic amplitude ripple, the room slapping
          for (let i = 0; i < n; i++) {
            ch[i] *= (0.72 + 0.28 * Math.sin(i / sr * 2 * Math.PI * 38)) * Math.exp(-i / (0.042 * sr));
          }
          fadeOut(ch, sr, 0.03);
        }
        this._reg('tail_indoor' + v, [normalizeTo(L, 0.8), normalizeTo(R, 0.8)]);
      }
      // --- BASIN / CANYON, 620 ms diffuse bed
      {
        const n = N(0.68), L = new Float32Array(n), R = new Float32Array(n);
        for (let c = 0; c < 2; c++) {
          const ch = c ? R : L;
          noiseFill(ch, rn);
          const bN = 0.014 * sr;
          for (let i = 0; i < n; i++) {
            const build = i < bN ? (i / bN) * (i / bN) : 1;
            ch[i] *= build * Math.exp(-i / (0.155 * sr));
          }
          biquad(ch, sr, 'lp', 2500 * (c ? 0.93 : 1.07), 0.7);
          biquad(ch, sr, 'hp', 110, 0.7);
          biquad(ch, sr, 'peak', 340, 1.6, 4);
          fadeOut(ch, sr, 0.08);
        }
        this._reg('tail_basin' + v, [normalizeTo(L, 0.8), normalizeTo(R, 0.8)]);
      }
      // --- OPEN, 1200 ms: mostly low-mid, very diffuse, -18 dB
      {
        const n = N(1.25), L = new Float32Array(n), R = new Float32Array(n);
        for (let c = 0; c < 2; c++) {
          const ch = c ? R : L;
          noiseFill(ch, rn);
          const bN = 0.070 * sr;
          for (let i = 0; i < n; i++) {
            const build = i < bN ? Math.sin((i / bN) * Math.PI * 0.5) : 1;
            ch[i] *= build * Math.exp(-i / (0.30 * sr));
          }
          biquad(ch, sr, 'lp', 820 * (c ? 0.9 : 1.1), 0.7, 0, 2);
          biquad(ch, sr, 'hp', 85, 0.7);
          fadeOut(ch, sr, 0.15);
        }
        this._reg('tail_open' + v, [normalizeTo(L, 0.8), normalizeTo(R, 0.8)]);
      }
      // --- SLAP: the discrete reflection atom, scheduled at the measured delay
      {
        const b = new Float32Array(N(0.075));
        noiseFill(b, rn);
        biquadSweep(b, sr, 'bp', 1800, 500, 0.9, 0.030);
        envAD(b, sr, 0.0015, 0.016, 0, 1.2);
        biquad(b, sr, 'hp', 150, 0.7);
        fadeOut(b, sr, 0.012);
        this._reg('slap' + v, [normalizeTo(b, 0.85)]);
      }
    }
  }

  /**
   * §4.5 impacts. Generic sparks-on-everything is the loudest possible
   * "this is a tech demo", so every surface gets its own synthesis path.
   */
  _bakeImpacts() {
    const sr = this.sr;
    const r = this.ctx.rng.fork('gunImpact');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);

    const MK = {
      // basalt: a sharp CRACK plus a stone thock and a puff of grit
      rock: (b) => {
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 6500, 1500, 0.7, 0.020, 2.2);
        envAD(n, sr, 0.00010, 0.013, 0, 1);
        mixInto(b, n, 1.0);
        damped(b, sr, 380 + rn() * 180, 0.014, 0.45);
        damped(b, sr, 1250, 0.006, 0.3);
        grains(b, sr, rn, { count: 8, from: 0.004, span: 0.09, len: [0.0006, 0.0025], hp: 1800, lp: 10000, amp: 0.35, decay: 1.8 });
        biquad(b, sr, 'hp', 220, 0.7);
        saturate(b, 1.6, 0.4);
      },
      // cinder-ash soil: a DULL THUD. No sparks, no crack, nothing bright.
      ash: (b) => {
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'lp', 900, 0.8, 0, 2); biquad(n, sr, 'hp', 70, 0.7);
        envAD(n, sr, 0.0012, 0.038, 0, 1);
        mixInto(b, n, 1.0);
        sweepSine(b, sr, 150, 62, 0.030, 0.030, 0.55);
        grains(b, sr, rn, { count: 10, from: 0.006, span: 0.16, len: [0.001, 0.005], hp: 300, lp: 2200, amp: 0.22, decay: 1.2 });
        biquad(b, sr, 'lp', 2400, 0.8);
      },
      // bloom stalk: a WET SNAP — fibre parting, then a spore puff
      flora: (b) => {
        const n = new Float32Array(N(0.04));
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 3800, 900, 1.8, 0.018);
        envAD(n, sr, 0.0003, 0.009, 0, 1);
        mixInto(b, n, 1.0);
        damped(b, sr, 620, 0.012, 0.45); damped(b, sr, 900, 0.007, 0.25);
        const p = new Float32Array(b.length);
        noiseFill(p, rn); biquadSweep(p, sr, 'bp', 700, 2600, 0.9, 0.12);
        envAD(p, sr, 0.010, 0.075, 0.02);
        mixInto(b, p, 0.42);
        biquad(b, sr, 'hp', 200, 0.7);
      },
      // carapace plate: the "you are wasting ammo" metallic PING
      chitin: (b) => {
        const n = new Float32Array(N(0.02));
        noiseFill(n, rn); biquad(n, sr, 'hp', 2600, 0.7, 0, 2); envAD(n, sr, 0.00008, 0.003);
        mixInto(b, n, 0.9);
        const f = 1650 + rn() * 400;
        damped(b, sr, f, 0.050, 0.85);
        damped(b, sr, f * 1.59, 0.034, 0.45);
        damped(b, sr, f * 2.47, 0.020, 0.25);
        damped(b, sr, f * 0.51, 0.028, 0.30);
        biquad(b, sr, 'hp', 500, 0.7);
      },
      // flesh / bloom vent: wet, low, no ring at all
      flesh: (b) => {
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'lp', 1600, 0.9, 0, 2);
        envAD(n, sr, 0.0006, 0.024, 0, 1);
        mixInto(b, n, 1.0);
        sweepSine(b, sr, 190, 88, 0.028, 0.026, 0.6);
        biquad(b, sr, 'peak', 330, 6, 8);
        const g = new Float32Array(b.length);
        noiseFill(g, rn); biquadSweep(g, sr, 'bp', 500, 1600, 2.0, 0.08); envAD(g, sr, 0.006, 0.040, 0.01);
        mixInto(b, g, 0.30);
        biquad(b, sr, 'lp', 4000, 0.8);
      },
      water: (b) => {
        // A round hitting liquid still starts on the frame it lands. The
        // rising bandpass below peaks ~30 ms in, so it needs a leading edge or
        // the splash trails the impact by two frames.
        {
          const t = new Float32Array(Math.round(0.012 * sr));
          noiseFill(t, rn); biquad(t, sr, 'bp', 2600, 0.8); envAD(t, sr, 0.0002, 0.0035);
          mixInto(b, t, 0.8);
        }
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 500, 4200, 0.8, 0.035, 1.4);
        envAD(n, sr, 0.0009, 0.055, 0, 1);
        mixInto(b, n, 1.0);
        for (let k = 0; k < 10; k++) damped(b, sr, 1600 + rn() * 4200, 0.006, 0.11, 0, 0.02 + rn() * 0.20);
        sweepSine(b, sr, 260, 120, 0.02, 0.020, 0.25);
        biquad(b, sr, 'hp', 220, 0.7);
      },
      // blackglass: a round on obsidian SHATTERS it. Bright crack, then a
      // shower of glass shards falling for 150 ms. Nothing else in the game
      // sounds like this and it is the Blackglass stratum's whole signature.
      glass: (b) => {
        const n = new Float32Array(N(0.03));
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 9000, 2600, 0.7, 0.014, 2.0);
        envAD(n, sr, 0.00006, 0.0075, 0, 1);
        mixInto(b, n, 1.0);
        // the plate ringing as it fails
        damped(b, sr, 3200 + rn() * 900, 0.014, 0.40);
        damped(b, sr, 5400 + rn() * 1200, 0.009, 0.28);
        damped(b, sr, 7900, 0.005, 0.16);
        // shards: a long sparse tinkle. Grains alone read as hiss, so each
        // shard is its own damped sine on top of the grain bed.
        grains(b, sr, rn, { count: 16, from: 0.010, span: 0.17, len: [0.0005, 0.002], hp: 4000, lp: 14000, amp: 0.30, decay: 0.9 });
        for (let k = 0; k < 7; k++) {
          damped(b, sr, 2600 + rn() * 6500, 0.004 + rn() * 0.006, 0.10 + rn() * 0.10, 0, 0.012 + rn() * 0.15);
        }
        biquad(b, sr, 'hp', 900, 0.7);
        saturate(b, 1.4, 0.3);
      },
      // sinter crust: brittle, hollow, a crust BREAKING and then crumbling in.
      // Between rock's crack and ash's thud, and it must not be either.
      sinter: (b) => {
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquadSweep(n, sr, 'bp', 3400, 800, 1.1, 0.030, 1.8);
        envAD(n, sr, 0.00025, 0.020, 0, 1);
        mixInto(b, n, 1.0);
        damped(b, sr, 540 + rn() * 200, 0.020, 0.35);   // the hollow under it
        damped(b, sr, 1420, 0.008, 0.20);
        sweepSine(b, sr, 175, 78, 0.030, 0.026, 0.35);
        // crumble: the crust collapsing into the void for ~140 ms
        grains(b, sr, rn, { count: 20, from: 0.012, span: 0.15, len: [0.0009, 0.0045], hp: 900, lp: 6500, amp: 0.34, decay: 0.8 });
        biquad(b, sr, 'hp', 150, 0.7);
        biquad(b, sr, 'lp', 8000, 0.7);
      },
      // coal / clinker: a DEAD knock. Low, hollow, damped, no ring, then dust.
      coal: (b) => {
        const n = new Float32Array(b.length);
        noiseFill(n, rn); biquad(n, sr, 'bp', 620, 0.8); biquad(n, sr, 'lp', 2000, 0.8);
        envAD(n, sr, 0.0006, 0.026, 0, 1);
        mixInto(b, n, 1.0);
        damped(b, sr, 210 + rn() * 90, 0.024, 0.55);
        damped(b, sr, 430, 0.012, 0.28);
        sweepSine(b, sr, 132, 58, 0.026, 0.030, 0.5);
        grains(b, sr, rn, { count: 12, from: 0.008, span: 0.13, len: [0.001, 0.005], hp: 500, lp: 3400, amp: 0.24, decay: 1.3 });
        biquad(b, sr, 'lp', 3600, 0.8);
        biquad(b, sr, 'hp', 90, 0.7);
      },
      // expedition metal: SPANG
      metal: (b) => {
        const n = new Float32Array(N(0.018));
        noiseFill(n, rn); biquad(n, sr, 'hp', 2000, 0.7, 0, 2); envAD(n, sr, 0.00006, 0.0025);
        mixInto(b, n, 1.0);
        const f = 880 + rn() * 320;
        damped(b, sr, f, 0.070, 0.9);
        damped(b, sr, f * 1.71, 0.045, 0.5);
        damped(b, sr, f * 3.13, 0.024, 0.28);
        damped(b, sr, f * 5.02, 0.012, 0.15);
        saturate(b, 1.8, 0.4);
        biquad(b, sr, 'hp', 300, 0.7);
      },
    };

    for (const s of IMPACT_SURFACES) {
      for (let v = 0; v < 4; v++) {
        const b = new Float32Array(N(s === 'metal' || s === 'chitin' || s === 'glass' ? 0.34 : 0.26));
        MK[s](b);
        fadeOut(b, sr, 0.03);
        this._reg('imp_' + s + v, [normalizeTo(b, 0.9)]);
      }
    }

    // --- ricochet whine (§4.5: 30% chance on metal, 260 ms)
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.34));
      const f0 = 2600 + v * 500;
      // a descending swept tone with vibrato, plus a noisy bed
      {
        const n = b.length; let ph = 0;
        for (let i = 0; i < n; i++) {
          const t = i / n;
          const f = f0 * Math.pow(0.26, t) * (1 + 0.05 * Math.sin(i / sr * 2 * Math.PI * 17));
          ph += 2 * Math.PI * f / sr;
          b[i] += Math.sin(ph) * Math.exp(-i / (0.10 * sr)) * 0.8;
        }
      }
      const n2 = new Float32Array(b.length);
      noiseFill(n2, rn); biquadSweep(n2, sr, 'bp', f0, 700, 3.0, 0.20); envAD(n2, sr, 0.001, 0.07);
      mixInto(b, n2, 0.35);
      envAD(b, sr, 0.0008, 0.10, 0, 1);
      biquad(b, sr, 'hp', 400, 0.7); fadeOut(b, sr, 0.05);
      this._reg('ricochet' + v, [normalizeTo(b, 0.75)]);
    }

    // --- whizz-by: a supersonic crack passing you. Short, wide, doppler-ish.
    for (let v = 0; v < 4; v++) {
      const b = new Float32Array(N(0.10));
      const n = new Float32Array(b.length);
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', 1100, 4200, 1.1, 0.030, 1.0);
      envAD(n, sr, 0.0016, 0.014, 0.004, 1.4);
      mixInto(b, n, 1.0);
      const m = new Float32Array(b.length);
      noiseFill(m, rn); biquadSweep(m, sr, 'bp', 3800, 800, 1.4, 0.045);
      envAD(m, sr, 0.006, 0.020, 0, 1);
      mixInto(b, m, 0.6);
      biquad(b, sr, 'hp', 500, 0.7); fadeOut(b, sr, 0.02);
      this._reg('whizz' + v, [normalizeTo(b, 0.8)]);
    }

    // --- explosion / TINDER ignition burst
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(1.30));
      const n = new Float32Array(b.length);
      noiseFill(n, rn);
      biquadSweep(n, sr, 'lp', 5200, 380, 0.8, 0.40, 1.4);
      envAD(n, sr, 0.0018, 0.22, 0, 1.2);
      mixInto(b, n, 1.0);
      sweepSine(b, sr, 96, 34, 0.16, 0.14, 0.9);
      sweepSine(b, sr, 210, 70, 0.09, 0.07, 0.5);
      // burning tail — the flare round's real job is the 2.4 s ignition sphere
      const f = new Float32Array(b.length);
      noiseFill(f, rn); biquad(f, sr, 'bp', 900, 0.6);
      envAD(f, sr, 0.05, 0.45, 0.15);
      mixInto(b, f, 0.25);
      saturate(b, 2.2, 0.6);
      biquad(b, sr, 'hp', 32, 0.7); fadeOut(b, sr, 0.15);
      this._reg('boom' + v, [normalizeTo(b, 1.0)]);
    }
  }

  // ===========================================================================
  // THE SHOT
  // ===========================================================================
  /**
   * o = {
   *   x,y,z      world position of the muzzle (omit for the player's own gun)
   *   weapon     'cinder' | 'kiln' | 'tinder'      (default 'cinder')
   *   ammo       rounds left; <= 5 adds the hollow 1.4 kHz mag resonance (§3.6.6)
   *   player     true for the local player's weapon (default: true when no x)
   *   subT       seconds ALREADY elapsed since this shot within the sim step
   *   dt         the sim step (default 1/60)
   *   indoor     optional openness override, 0..1
   *   gain       overall trim
   * }
   */
  shot(o = {}) {
    const A = this.A;
    if (!A.enabled || !A.baked) return null;
    const key = normWeapon(o.weapon);
    const W = WEAPONS[key];
    if (!A.buf['gb_' + key + '0']) this.bakeWeapon(key);   // lazy armoury (see bake())
    const r = this.rng;
    const i = this.shotIndex++;
    this._stats.shots++;
    A._stats.shots++;

    const positional = o.x !== undefined && o.x !== null;
    const isPlayer = o.player !== undefined ? !!o.player : !positional;
    const cam = this.ctx.camera;
    const d = positional ? Math.hypot(o.x - cam.position.x, o.y - cam.position.y, o.z - cam.position.z) : 0;

    // sub-frame scheduling (§3.2). Getting this right is worth more to
    // perceived quality than any single graphics feature in this repo.
    const dt = o.dt || (1 / 60);
    const when = A.now + Math.max(0, dt - (o.subT || 0));
    if (A.silent) return null;

    const trim = (o.gain === undefined ? 1 : o.gain) * W.gain;

    // ---- the anti-machine-gun decorrelation -------------------------------
    // Walk the variant ring by 1..N-1 so the SAME body buffer can never play on
    // two consecutive rounds. `(i + rand*8) % 8` repeated with probability 1/8,
    // which at 725 RPM is a doubled buffer roughly every half-second — audible
    // as a flam, and exactly the artefact §5.1 exists to kill.
    const bv = this._lastBv = (this._lastBv + 1 + (r.next() * (BODY_VARIANTS - 1) | 0)) % BODY_VARIANTS;
    const mv = this._lastMv = (this._lastMv + 1 + (r.next() * (MECH_VARIANTS - 1) | 0)) % MECH_VARIANTS;
    const detune = 1 + r.range(-0.015, 0.015);
    const st = [0, r.range(0, 0.003), r.range(0, 0.003), r.range(0, 0.003)];

    // ---- distance mix (§5.2). Log scale — linear puts the crossover in the
    //      wrong 10 m and distant firefights sound like near ones played quietly.
    const near = d < 12;
    const t = d <= 12 ? 0 : d >= 40 ? 1 : Math.log(d / 12) / Math.log(40 / 12);
    const bodyDb = -6 * t;                        // body recedes
    const tailDb = -9 + 9 * t;                    // tail takes over
    const bodyLP = d > 40 ? 2200 : d > 12 ? 20000 * Math.pow(2200 / 20000, t) : 20000;
    const mechG = near ? Math.max(0, 1 - d / 25) : 0;

    const pos = positional ? { x: o.x, y: o.y, z: o.z } : null;
    const P = (extra) => {
      const q = extra;
      if (pos) { q.x = pos.x; q.y = pos.y; q.z = pos.z; q.propagate = !isPlayer; }
      return q;
    };

    // low ammo: an emptier magazine RINGS differently (§3.6.6, ammo <= 5)
    const lowAmmo = o.ammo !== undefined && o.ammo <= 5 && o.ammo > 0;

    // ---- 1. MECHANICAL, -14 dB, near field, ~0 reverb send ----------------
    // NB: `when`, not `delay`. `delay` is measured from `A.now` (the frame
    // boundary) and `when` is the sub-frame instant the trigger actually broke.
    // Passing `delay` here scheduled the body and the mechanical layer up to
    // 16.7 ms EARLIER than the tail and the sub, which (a) flammed the four
    // layers apart, (b) put the sub 16 ms behind its own transient so the shot
    // lost its weight, and (c) started the 400 Hz punch carve AFTER the body
    // transient it exists to make room for — deleting §5.3, which that section
    // calls "the single highest-value line item in §5". This is the bug that
    // makes a correct-on-paper gunshot sound like a browser gunshot.
    if (mechG > 0.02) {
      A.play('gm_' + key + mv, P({
        bus: 'weapons', gain: dB(-14) * trim * mechG, rate: detune,
        send: 0.03, when: when + st[1],
      }));
    }

    // ---- 2. BODY, 0 dB, 0.25 send. The player's own body layer BYPASSES the
    //         400 Hz dip (§5.3) — that is the punch move.
    A.play('gb_' + key + bv, P({
      bus: isPlayer ? 'body' : 'weapons',
      gain: dB(bodyDb) * trim, rate: detune,
      send: 0.25, when: when + st[0],
      lpHz: bodyLP,
      filterHz: 1400, toneDb: lowAmmo ? 5.5 : 0,
    }));

    // ---- 3. TAIL, -9 dB..0 dB, selected by openness and CROSSFADED --------
    this._tail(key, when, dB(tailDb) * trim * W.tailGain, pos, isPlayer, d, o);

    // ---- 4. SUB, -6 dB, mono, non-positional, gone beyond 30 m ------------
    if (d < 30) {
      A.play('gsub_' + key, {
        bus: 'weapons', gain: dB(-6) * trim * (1 - d / 30) * (isPlayer ? 1 : 0.6),
        rate: detune, send: 0, when: when + st[3],
      });
    }

    // ---- the punch move + the auditory reflex -----------------------------
    if (isPlayer) A.punch(when);
    return true;
  }

  /**
   * §5.2 tail selection. openness < 0.25 indoor, 0.25-0.70 basin, > 0.70 open,
   * crossfaded across the bands. Never hard-switch or walking out of a canyon
   * mouth clicks.
   */
  _tail(key, when, gain, pos, isPlayer, d, o) {
    const A = this.A;
    const open = o.indoor !== undefined ? clamp(o.indoor, 0, 1) : A.openness();
    const v = (this.shotIndex & 1);
    const wIndoor = sat((0.32 - open) / 0.16);
    const wOpen = sat((open - 0.62) / 0.16);
    const wBasin = clamp(1 - wIndoor - wOpen, 0, 1);
    const base = { bus: 'weapons', send: 0.14, rate: 1, occl: false };
    const add = (name, g, delay) => {
      if (g < 0.02) return;
      const q = Object.assign({}, base, { gain: gain * g, when: when + (delay || 0) });
      if (pos && d > 18) { q.x = pos.x; q.y = pos.y; q.z = pos.z; q.propagate = !isPlayer; q.air = true; }
      A.play(name, q);
      this._stats.tails++;
    };
    add('tail_indoor' + v, wIndoor, 0.004);
    add('tail_basin' + v, wBasin, 0.010);
    add('tail_open' + v, wOpen * 1.15, 0.020);

    // The two DISCRETE slapbacks, at the probe's measured wall distances.
    // Only for near shots — at 60 m the shooter's slapbacks are not your room.
    if (wBasin > 0.15 && d < 30) {
      const E = A._early;
      for (let k = 0; k < 2; k++) {
        const g = gain * wBasin * E[k][1] * 1.5;
        if (g < 0.02) continue;
        A.play('slap' + (v ^ k), {
          bus: 'weapons', gain: g, when: when + E[k][0],
          rate: 1 - k * 0.06, send: 0.30, occl: false,
        });
        this._stats.slaps++;
      }
    }
  }

  // ===========================================================================
  // IMPACTS, RICOCHETS, WHIZZ-BY, FOLEY
  // ===========================================================================
  /**
   * §4.5. `o.pen` marks a round that punched through: low-pass 1.2 kHz and
   * -5 dB, which is the only thing that makes penetration audible at all.
   */
  impact(surface, x, y, z, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const s = IMPACT_SURFACES.indexOf(surface) >= 0 ? surface : 'rock';
    const r = this.rng;
    const v = r.int(0, 3);
    this._stats.impacts++;
    const pen = !!o.pen;
    // combat.js publishes `power` (0.45 on metal ... 1.90 on flesh) and nothing
    // was reading it, so a round into ash and a round into a creature's vent
    // came out at the same level. Compress it — power is an energy-ish number
    // and mapping it linearly to gain makes flesh 4x louder than metal.
    const pw = o.power === undefined ? 1 : clamp(Math.pow(clamp(o.power, 0.1, 3) / 1.0, 0.45), 0.55, 1.5);
    const g = (o.gain === undefined ? 1 : o.gain) * (pen ? dB(-5) : 1) * pw;
    A.play('imp_' + s + v, {
      x, y, z, bus: 'weapons',
      gain: g * 0.85, rate: (1 + r.range(-0.08, 0.08)) * (pw > 1.1 ? 0.95 : 1),
      send: 0.20 + 0.25 * A.openness(),
      propagate: true,
      lpHz: pen ? 1200 : undefined,
      priority: 2,
    });
    // §4.5 metal: 30% chance of a 260 ms ricochet whine. Glass and sinter
    // deflect too — a shallow hit on obsidian is exactly what ricochets.
    const ricP = s === 'metal' ? 0.30 : s === 'glass' ? 0.22 : s === 'chitin' ? 0.16
      : s === 'rock' ? 0.12 : s === 'sinter' ? 0.08 : 0;
    if (ricP > 0 && r.next() < ricP) this.ricochet(x, y, z, { gain: g * 0.6 });
    return s;
  }

  ricochet(x, y, z, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const r = this.rng;
    return A.play('ricochet' + r.int(0, 2), {
      x, y, z, bus: 'weapons',
      gain: (o.gain ?? 1) * 0.5, rate: 1 + r.range(-0.12, 0.12),
      send: 0.35 + 0.3 * A.openness(), propagate: true, occl: false,
    });
  }

  /**
   * A round passing the listener. `dist` is the miss distance in metres.
   *
   * The one sound in the game whose SOURCE IS MOVING, and the only place a
   * playback-rate ramp is worth its cost: a supersonic round closing at ~800 m/s
   * and receding at the same speed is a Doppler ratio of roughly 1.4 down
   * through 0.7 across the pass, and it is that fall — not the level — that
   * says "that went past my head" rather than "something clicked nearby". The
   * ramp is applied over the buffer's own 100 ms so no scheduling is needed.
   */
  whizz(x, y, z, dist = 1.2, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const r = this.rng;
    const g = clamp(1.4 / Math.max(0.35, dist), 0.05, 1.4);
    // A closer miss has a sharper Doppler transition (the angle sweeps faster).
    const near = sat(1.2 / Math.max(0.4, dist));
    const dop = 1 + 0.30 * near;
    const v = A.play('whizz' + r.int(0, 3), {
      x, y, z, bus: 'weapons',
      gain: (o.gain ?? 1) * g * 0.55, rate: (1 + r.range(-0.10, 0.10)) * dop,
      send: 0.10, occl: false, air: false, priority: 1,
    });
    if (v && v.src) {
      const rate = v.src.playbackRate, T = Math.max(A.now, A.actx.currentTime);
      try {
        rate.setValueAtTime(rate.value, T);
        rate.exponentialRampToValueAtTime(rate.value * (1 - 0.42 * near), T + 0.055);
      } catch (e) { void e; }
    }
    return v;
  }

  /** §4.2 — brass on the ground, at 0.35x gun volume. */
  casing(x, y, z, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const r = this.rng;
    return A.play('brass' + r.int(0, 3), {
      x, y, z, bus: 'weapons',
      gain: (o.gain ?? 1) * 0.35, rate: 1 + r.range(-0.14, 0.14),
      send: 0.12,
    });
  }

  explosion(x, y, z, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    const r = this.rng;
    A.play('boom' + r.int(0, 1), {
      x, y, z, bus: 'weapons', gain: (o.gain ?? 1) * 1.0,
      rate: 1 + r.range(-0.06, 0.06), send: 0.45, propagate: true,
    });
    A.punch(A.now);
    return true;
  }

  /**
   * §3.6.4 reload beats. Each name is one keyframe in the reload; weapons.js
   * calls them on the millisecond and the player learns the timing from them.
   * The sound ALWAYS leads the HUD number, never the reverse.
   */
  reloadCue(name, o = {}) {
    const A = this.A;
    if (!A.baked || A.silent) return null;
    // Two naming conventions land here and BOTH must work. The left column is
    // this file's own vocabulary; the lowercase entries are the literal beat
    // names `weapons.js:_stepReload()` emits on `weapon:beat`
    // (release/drop/enter/contact/seat/boltrelease/tug/cancel). They did not
    // match, so before this the entire reload — every beat of the §3.6.4
    // rhythm — was silent in the shipping build while looking correct in both
    // files. Match case-insensitively too: 'boltrelease' vs 'boltRelease' is
    // exactly the kind of drift that costs an hour.
    const map = {
      magrelease: 'r_magRelease', release: 'r_magRelease',
      magdrop: o.empty ? 'r_magDropEmpty' : 'r_magDrop',
      drop: o.empty ? 'r_magDropEmpty' : 'r_magDrop',
      magrise: 'r_magRise', enter: 'r_magRise',
      magin: 'r_magIn', contact: 'r_magIn',
      magseat: 'r_magSeat', seat: 'r_magSeat',
      boltrelease: 'r_boltRelease', boltlock: 'r_boltLock',
      tug: 'r_tug', dryclick: 'r_dryClick', dry: 'r_dryClick',
      cancel: 'r_cancel',
      swapout: 'r_swapOut', swapin: 'r_swapIn',
      inspectout: 'r_swapOut', inspectin: 'r_cancel',
    };
    const b = map[String(name).toLowerCase()];
    if (!b) return null;
    const r = this.rng;
    const positional = o.x !== undefined;
    const q = {
      bus: 'weapons', gain: (o.gain ?? 1) * (b === 'r_magDrop' || b === 'r_magDropEmpty' ? 0.55 : 0.8),
      rate: 1 + r.range(-0.03, 0.03), send: 0.10 + 0.2 * A.openness(),
      delay: o.delay || 0,
    };
    if (positional) { q.x = o.x; q.y = o.y; q.z = o.z; }
    return A.play(b, q);
  }

  debugInfo() {
    return {
      bakeMs: this.bakeMs || 0,
      weapons: Object.keys(WEAPONS),
      armoury: Object.assign({}, this.armoury),
      surfaces: IMPACT_SURFACES.length,
      bodyVariants: BODY_VARIANTS, mechVariants: MECH_VARIANTS,
      shots: this._stats.shots, tails: this._stats.tails, slaps: this._stats.slaps,
      impacts: this._stats.impacts,
      shotIndex: this.shotIndex,
    };
  }
}

export default GunAudio;
