// CURFEW — the gun. Owner: audio. Not a manifest system; audio.js constructs it.
//
// THE FOUR LAYERS, and why the scheduling matters more than any of them:
//
//   1. MECHANICAL  -14 dB, near field only, ~0 reverb — the sear, the bolt, the brass.
//   2. BODY         0 dB, the collapsing noise crack. On the PLAYER's own shot this is the
//                   one signal that bypasses the 400 Hz carve. That bypass is the punch.
//   3. TAIL        -9..0 dB, selected by the openness probe and CROSSFADED, never switched,
//                   or walking out of a stand of pines clicks.
//   4. SUB         -6 dB, mono, gone beyond 30 m. The chest hit.
//
// Every one of those is scheduled with a SUB-FRAME `when` value — `audio.now + (dt - subT)`,
// the instant the trigger actually broke — and NEVER with a `delay` measured from the frame
// boundary. Getting that wrong flams the four layers apart by up to 16.7 ms, puts the sub
// behind its own transient so the shot loses its weight, and starts the 400 Hz punch carve
// AFTER the body transient the carve exists to make room for. It is the single difference
// between a correct-on-paper gunshot and a browser gunshot.
//
// DECORRELATION, three ways, so automatic fire never reads as a machine gun:
//   - 8 baked body variants per weapon, each with its own noise seed and a +-6% cutoff shift;
//   - the variant ring is walked by 1..N-1 per shot, so the SAME buffer can never land on two
//     consecutive rounds (a plain `(i + rand*8) % 8` repeats with p = 1/8, which at 725 rpm is
//     a doubled buffer every half second and audible as a flam);
//   - +-1.5% detune and up to 3 ms of independent per-layer jitter.
//
// donor: cinderbloom/src/audio/guns.js:52-80 (the WEAPONS row schema), :96-100 (normWeapon's
//   loose match — weapons.js publishes a display id, not an armoury key, and a strict lookup
//   silently gave every gun in that project the carbine's body layer), :165-262 (the body /
//   sub / mech bakes), :432-500 (the three tail characters, stereo and decorrelated),
//   :744-838 (shot(): sub-frame when, the variant ring, the log-scale distance mix),
//   :845-878 (_tail: crossfade + the two measured slapbacks).

import { CFG } from '../config.js';
import { clamp, clamp01 } from '../engine/math.js';
import {
  dB, noiseFill, biquad, biquadSweep, envAD, fadeOut, damped, sweepSine,
  grains, saturate, normalizeTo, mixInto, CUE_THREAT,
} from './audio.js';

const sat = clamp01;

/**
 * One row per gun in CFG.weapons.defs. `loud` and rpm live in CFG; these are the
 * ACOUSTIC numbers, which config.js does not own — a request for a CFG.audio.guns
 * block is filed in docs/HANDOFF.md and until then this is their only home.
 * Shapes follow cinderbloom's three archetypes: a sharp mid-forward carbine, a
 * big slow marksman rifle, and a low hollow launcher-ish thump.
 */
export const GUNS = {
  // Bolt rifle — the M0 gun. Big, slow, huge tail. It is the loudest thing you own
  // and CFG.weapons.defs.bolt.loud (26 m of alert radius) says so.
  bolt: {
    bodyDur: 0.46, bodyF0: 1900, bodyF1: 380, bodyQ: 0.75, bodyTau: 0.046,
    coreF0: 132, coreF1: 41, coreTau: 0.052, drive: 2.9,
    mechF: [2400, 7200], mechTau: 0.011, clickF: 1500,
    subF: 36, subTau: 0.070, subDur: 0.34,
    gain: 1.18, tailGain: 1.35,
  },
  // Shotgun — lowest, widest, shortest crack, most low energy, least tail structure.
  shotgun: {
    bodyDur: 0.40, bodyF0: 1150, bodyF1: 210, bodyQ: 1.30, bodyTau: 0.052,
    coreF0: 190, coreF1: 62, coreTau: 0.058, drive: 2.2,
    mechF: [1700, 5400], mechTau: 0.013, clickF: 1150,
    subF: 44, subTau: 0.058, subDur: 0.28,
    gain: 1.10, tailGain: 1.10,
  },
  // Revolver — hard, bright, short. A crack with nothing behind it.
  revolver: {
    bodyDur: 0.30, bodyF0: 2900, bodyF1: 700, bodyQ: 0.90, bodyTau: 0.026,
    coreF0: 175, coreF1: 58, coreTau: 0.030, drive: 2.6,
    mechF: [3000, 8200], mechTau: 0.0075, clickF: 2100,
    subF: 46, subTau: 0.040, subDur: 0.22,
    gain: 0.94, tailGain: 0.85,
  },
  // KV-7 carbine — the one gun Alex has held and blessed. Sharp, mid-forward.
  carbine: {
    bodyDur: 0.34, bodyF0: 2600, bodyF1: 620, bodyQ: 0.85, bodyTau: 0.030,
    coreF0: 168, coreF1: 52, coreTau: 0.034, drive: 2.4,
    mechF: [3200, 8600], mechTau: 0.0085, clickF: 1900,
    subF: 42, subTau: 0.045, subDur: 0.24,
    gain: 1.00, tailGain: 1.00,
  },
};

const BODY_VARIANTS = 8;
const MECH_VARIANTS = 6;
const TAIL_VARIANTS = 2;

/**
 * weapons.js publishes `weapon: <def id>`. Match loosely anyway: a display name,
 * a prefixed model number and any case all resolve, because a strict lookup that
 * misses fails SILENTLY — every gun plays the first one's body and nothing in a
 * smoke test can tell.
 * donor: cinderbloom/src/audio/guns.js:96-100
 */
export function normGun(w) {
  if (typeof w !== 'string') return 'bolt';
  const s = w.toLowerCase();
  if (GUNS[s]) return s;
  for (const k in GUNS) if (s.indexOf(k) >= 0) return k;
  return 'bolt';
}

// Impact surfaces. collision publishes a `tag` per collider and combat forwards it
// as weapon:hit.kind; anything unknown falls through to 'dirt' rather than to
// silence, because a shot that hits and says nothing reads as a miss.
export const SURFACES = ['wood', 'dirt', 'rock', 'metal', 'flesh', 'water', 'glass', 'foliage'];
// r3: combat speaks 'stone' for every wall, building and rock (TAG_SURFACE), and this file only
// knew 'rock', so a round into a wall made the dirt sound. The rest of combat's words, mapped.
const SURFACE_ALIAS = Object.freeze({
  stone: 'rock', plank: 'wood', tin: 'metal', plate: 'metal', deflect: 'metal',
  snow: 'dirt', cloth: 'foliage',
});

/* r3 SHOOTING FEEL — THE PLAYER'S OWN GUN, HEARD.
 *
 * Everything on the 'weapons' bus reaches the mix through audio.js's 4th-order 1.6 kHz mix-law
 * low-pass, which is -14 dB at 2.4 kHz and -28 dB at 3.6 kHz: the sear, the bolt, the magazine
 * knocks and the dry click all live up there, so they arrived as a dull thud or not at all. The
 * player's own near-field detail now goes on the 'body' bus (the shot's punch layer, which skips
 * the low-pass and the 400 Hz carve), several dB quieter than it was written, so it is CLEAR
 * rather than louder. Remote guns keep the full positional chain. */
const MECH_BODY_DB = -19;            // the player's mechanical layer (was -14 on 'weapons', low-passed)
const HANDLING_K = 0.72;             // reload foley on 'body': .55 -> .40, active .62 -> .45, dry .50 -> .36
/* THE HIT CONFIRMATION. A hit on a body answers with a short dry tick; a head adds a ring; a
 * kill is a low thump under it. Once per trigger pull (a blast is one hit), never positional,
 * and at least 45 ms after the shot so the gun's own crack cannot mask it. Quiet on purpose:
 * it tells you, it does not cheer. */
const CONFIRM_MIN_S = 0.045;
const CONFIRM_GAIN = { tick: 0.20, head: 0.24, kill: 0.30 };
/* THE AUTOMATIC. Every carbine round played the whole 1.5 s forest tail and two slaps, about 150
 * long voices a magazine against a 64-voice pool, and the sum of thirty tails was a wash louder
 * than one shot. Inside a burst the tails are thinned and the slaps are every third round. */
const BURST_S = 0.12, BURST_TAIL_K = 0.45;
/* THE LAST ROUND. The shot that empties the magazine is followed by a small light click: it tells
 * you why the gun is about to reload before the number would. */
const LAST_CLICK = { delay: 0.05, rate: 1.35, gain: 0.22 };

export class GunAudio {
  constructor(ctx, audio) {
    this.ctx = ctx;
    this.A = audio;
    this.rng = ctx.rng.fork('gunAudio');
    this.shotIndex = 0;
    this._lastBv = 0; this._lastMv = 0;
    this._stats = { shots: 0, impacts: 0, tails: 0, slaps: 0, confirms: 0, kills: 0, cycles: 0, brass: 0 };
    this.baked = {};
    this._lastPlayerShot = -9;       // A.now of the player's last shot (the burst rule)
    this._confirmPull = -2;          // the pull that already ticked
    this._killPull = -2;             // the pull that already thumped
    this._surfPull = -2; this._surfN = 0;   // how many surface impacts this pull has said
    // Two channels audio.js does not wire and this file answers on its own: the bolt or pump
    // coming back and going home (weapon.js 'weapon:cycle'), and a spent case landing where it
    // actually landed (viewmodel.js 'brass:land'). Guarded: a headless fixture has no bus.
    const b = ctx.bus;
    this._off = b && b.on ? [
      b.on('weapon:cycle', (p) => { try { this.cycleCue(p || {}); } catch (e) { void e; } }),
      b.on('brass:land', (p) => { try { this.brassLand(p || {}); } catch (e) { void e; } }),
    ] : [];
  }

  dispose() { for (const off of this._off) { try { off(); } catch (e) { void e; } } this._off.length = 0; }

  get sr() { return this.A.sr; }

  /**
   * BOOT bake: the shared layers plus the ONE gun that is in your hands. The
   * other three are ~90 ms each and nobody can fire them yet, so they go on an
   * idle callback (see bakeRest) — and shot() force-bakes on demand anyway, so
   * a browser with no idle callback simply pays for the second gun once.
   * donor: cinderbloom/src/audio/guns.js:131-152 (the lazy armoury)
   */
  bake() {
    const w = this.ctx.systems ? this.ctx.systems.get('weapons') : null;
    const held = w && w.def && w.def.id ? normGun(w.def.id) : 'bolt';
    this.bakeGun(held);
    this._bakeTails();
    this._bakeImpacts();
    this._bakeHandling();
  }

  /** Everything the armoury has that boot did not need. Idle-time work. */
  bakeRest() {
    for (const key in GUNS) this.bakeGun(key);
  }

  bakeGun(key) {
    if (this.baked[key]) return;
    this.baked[key] = true;
    this._bakeBody(key);
    this._bakeMech(key);
  }

  /* ----------------------------------------------------------- the body -- */

  _bakeBody(key) {
    const sr = this.sr, A = this.A, W = GUNS[key];
    const r = this.ctx.rng.fork('gunBody:' + key);
    const rn = () => r.next();
    for (let v = 0; v < BODY_VARIANTS; v++) {
      // +-6% deterministic cutoff variation, baked, so the variants differ in
      // TIMBRE and not only in noise seed.
      const k = 1 + (v / (BODY_VARIANTS - 1) - 0.5) * 0.12;
      const b = new Float32Array(Math.round(W.bodyDur * sr));

      // (a) the transient. 2.5 ms of high-passed full-band noise. Without this
      //     the shot has no leading edge and reads as a whump.
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
      // (c) a wider skirt so it is not one resonance
      {
        const n = new Float32Array(b.length);
        noiseFill(n, rn);
        biquadSweep(n, sr, 'bp', W.bodyF0 * 2.4 * k, W.bodyF1 * 1.6 * k, 0.45, 0.030, 2.4);
        envAD(n, sr, 0.0016, W.bodyTau * 0.45, 0, 1.0);
        mixInto(b, n, 0.55);
      }
      // (d) the 40-210 Hz pulse core — the chest hit
      sweepSine(b, sr, W.coreF0 * k, W.coreF1, 0.055, W.coreTau, 0.85);
      // (e) muzzle blast: a short LF puff behind the crack
      {
        const n = new Float32Array(b.length);
        noiseFill(n, rn);
        biquad(n, sr, 'lp', 320 * k, 0.9, 0, 2);
        envAD(n, sr, 0.0018, 0.028, 0, 1);
        mixInto(b, n, 0.55);
      }
      // A real gunshot is a CLIPPED acoustic event, not a clean sum.
      saturate(b, W.drive, 0.85);
      biquad(b, sr, 'hp', 42, 0.7);
      fadeOut(b, sr, 0.03);
      A.reg('gb_' + key + v, [normalizeTo(b, 0.97)]);
    }

    // SUB — the sine core, mono, non-positional.
    {
      const b = new Float32Array(Math.round(W.subDur * sr));
      sweepSine(b, sr, W.subF * 1.35, W.subF, 0.030, W.subTau, 1.0);
      sweepSine(b, sr, W.subF * 1.5, W.subF * 1.5, 0.01, W.subTau * 0.55, 0.18);
      envAD(b, sr, 0.008, W.subTau, 0, 1);
      biquad(b, sr, 'lp', 140, 0.8);
      fadeOut(b, sr, 0.04);
      A.reg('gsub_' + key, [normalizeTo(b, 0.95)]);
    }
  }

  _bakeMech(key) {
    const sr = this.sr, A = this.A, W = GUNS[key];
    const r = this.ctx.rng.fork('gunMech:' + key);
    const rn = () => r.next();
    for (let v = 0; v < MECH_VARIANTS; v++) {
      const k = 1 + (v / (MECH_VARIANTS - 1) - 0.5) * 0.10;
      const b = new Float32Array(Math.round(0.090 * sr));
      {
        const n = new Float32Array(b.length);
        noiseFill(n, rn);
        biquad(n, sr, 'hp', W.mechF[0] * k, 0.7, 0, 2);
        biquad(n, sr, 'lp', W.mechF[1] * k, 0.7, 0, 2);
        envAD(n, sr, 0.0040, W.mechTau, 0, 1);
        mixInto(b, n, 1.0);
      }
      damped(b, sr, W.clickF * k, 0.0016, 0.60);          // the sear releasing
      damped(b, sr, W.clickF * 2.31 * k, 0.0009, 0.28);
      damped(b, sr, 620 * k, 0.010, 0.20, 0, 0.012);      // the carrier, 12 ms later
      grains(b, sr, rn, {
        count: 5, from: 0.004, span: 0.045, len: [0.0006, 0.002],
        hp: 3000, lp: 11000, amp: 0.5, decay: 1.2,
      });
      biquad(b, sr, 'hp', 900, 0.7);
      fadeOut(b, sr, 0.012);
      A.reg('gm_' + key + v, [normalizeTo(b, 0.9)]);
    }
  }

  /* ----------------------------------------------------------- the tails -- */

  /**
   * Three characters, two decorrelated stereo variants each. The FOREST tail is
   * the one this game lives in: it is not a room and it is not a canyon — it is
   * a diffuse scatter with no discrete reflection at all, because a hundred
   * trunks return a hundred quiet copies and none of them is a wall.
   * donor: cinderbloom/src/audio/guns.js:432-500
   */
  _bakeTails() {
    const sr = this.sr, A = this.A;
    const r = this.ctx.rng.fork('gunTails');
    const rn = () => r.next();

    const stereo = (seconds, build) => {
      const L = new Float32Array(Math.round(seconds * sr));
      const R = new Float32Array(L.length);
      build(L, 0); build(R, 1);
      return [L, R];
    };

    for (let v = 0; v < TAIL_VARIANTS; v++) {
      // interior — a barn, a station, a house. Short, boxy, one flutter.
      {
        const ch = stereo(0.55, (b, c) => {
          noiseFill(b, rn);
          for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-i / (0.10 * sr));
          biquad(b, sr, 'bp', 900 * (c ? 1.06 : 0.94), 0.6);
          for (let f = 0; f < 4; f++) damped(b, sr, 180 + f * 145, 0.05, 0.10, 0, 0.006 + f * 0.011);
          fadeOut(b, sr, 0.06);
        });
        A.reg('tail_room' + v, [normalizeTo(ch[0], 0.8), normalizeTo(ch[1], 0.8)]);
      }
      // FOREST — diffuse, dark, and long. No discrete slap. The canopy eats the
      // top and gives back a hiss that arrives from everywhere at once.
      {
        const ch = stereo(1.5, (b, c) => {
          noiseFill(b, rn);
          for (let i = 0; i < b.length; i++) {
            const t = i / sr;
            // Two-stage decay: the near trunks die in 180 ms, the stand behind
            // them keeps answering for a second and a bit.
            b[i] *= Math.exp(-t / 0.18) * 0.7 + Math.exp(-t / 0.62) * 0.5;
          }
          biquad(b, sr, 'lp', 1500 * (c ? 0.95 : 1.05), 0.6, 0, 2);
          biquad(b, sr, 'hp', 110, 0.7);
          // scattered late returns, dense and quiet: trunks, not walls
          grains(b, sr, rn, {
            count: 26, from: 0.02, span: 1.05, len: [0.004, 0.020],
            hp: 200, lp: 1500, amp: 0.16, decay: 1.4,
          });
          fadeOut(b, sr, 0.20);
        });
        A.reg('tail_forest' + v, [normalizeTo(ch[0], 0.8), normalizeTo(ch[1], 0.8)]);
      }
      // open — the valley answering across the reservoir. Long, bright, sparse.
      {
        const ch = stereo(2.3, (b, c) => {
          noiseFill(b, rn);
          for (let i = 0; i < b.length; i++) b[i] *= Math.exp(-i / (0.85 * sr)) * 0.55;
          biquad(b, sr, 'bp', 620 * (c ? 1.03 : 0.97), 0.45);
          for (let s = 0; s < 5; s++) {
            const at = 0.14 + s * (0.22 + rn() * 0.14);
            grains(b, sr, rn, {
              count: 6, from: at, span: 0.09, len: [0.005, 0.018],
              hp: 220, lp: 2400, amp: 0.30 * Math.exp(-s * 0.5), decay: 1.0,
            });
          }
          fadeOut(b, sr, 0.35);
        });
        A.reg('tail_open' + v, [normalizeTo(ch[0], 0.8), normalizeTo(ch[1], 0.8)]);
      }
      // the two discrete slapbacks, placed at the probe's MEASURED wall distance
      {
        const b = new Float32Array(Math.round(0.16 * sr));
        noiseFill(b, rn);
        biquadSweep(b, sr, 'bp', 1400, 420, 0.8, 0.05, 1.6);
        envAD(b, sr, 0.0012, 0.030, 0, 1);
        fadeOut(b, sr, 0.02);
        A.reg('slap' + v, [normalizeTo(b, 0.75)]);
      }
    }
  }

  /* ---------------------------------------------------------- the impact -- */

  _bakeImpacts() {
    const sr = this.sr, A = this.A;
    const r = this.ctx.rng.fork('gunImpacts');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);
    const REC = {
      wood: { dur: 0.24, hp: 180, lp: 3200, ring: [220, 470, 930], tau: 0.020, grains: 16, drive: 1.6 },
      dirt: { dur: 0.20, hp: 120, lp: 2200, ring: [110, 0, 0], tau: 0.012, grains: 22, drive: 1.2 },
      rock: { dur: 0.26, hp: 400, lp: 8000, ring: [1450, 2600, 4300], tau: 0.010, grains: 18, drive: 2.0 },
      metal: { dur: 0.42, hp: 500, lp: 12000, ring: [1900, 3350, 5900], tau: 0.075, grains: 10, drive: 2.4 },
      flesh: { dur: 0.22, hp: 90, lp: 1500, ring: [90, 160, 0], tau: 0.020, grains: 14, drive: 1.4 },
      water: { dur: 0.34, hp: 200, lp: 5200, ring: [640, 1180, 0], tau: 0.030, grains: 26, drive: 1.1 },
      glass: { dur: 0.36, hp: 900, lp: 14000, ring: [3100, 5200, 7400], tau: 0.045, grains: 24, drive: 1.8 },
      foliage: { dur: 0.20, hp: 700, lp: 9000, ring: [0, 0, 0], tau: 0.008, grains: 30, drive: 1.0 },
    };
    for (const k in REC) {
      const S = REC[k];
      for (let v = 0; v < 3; v++) {
        const b = new Float32Array(N(S.dur));
        {
          const n = new Float32Array(b.length);
          noiseFill(n, rn);
          biquad(n, sr, 'hp', S.hp, 0.7);
          biquad(n, sr, 'lp', S.lp, 0.7);
          envAD(n, sr, 0.0004, S.tau, 0, 1);
          mixInto(b, n, 1.0);
        }
        for (let i = 0; i < S.ring.length; i++) {
          const f = S.ring[i];
          if (f > 0) damped(b, sr, f * (0.94 + rn() * 0.12), S.tau * (1.6 - i * 0.3), 0.42 / (i + 1));
        }
        grains(b, sr, rn, {
          count: S.grains, from: 0.001, span: S.dur * 0.55, len: [0.0008, 0.004],
          hp: S.hp, lp: S.lp, amp: 0.55, decay: 2.2,
        });
        saturate(b, S.drive, 0.6);
        fadeOut(b, sr, 0.02);
        A.reg('imp_' + k + v, [normalizeTo(b, 0.92)]);
      }
    }
    // ricochet — the whine, only off rock/metal/glass
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.44));
      sweepSine(b, sr, 2600 + v * 420, 780, 0.30, 0.13, 0.7);
      sweepSine(b, sr, 3900 + v * 500, 1180, 0.26, 0.10, 0.32);
      biquad(b, sr, 'hp', 500, 0.7);
      fadeOut(b, sr, 0.06);
      A.reg('ric' + v, [normalizeTo(b, 0.7)]);
    }
    // the crack passing your head — the round you did not fire
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(0.09));
      noiseFill(b, rn);
      biquadSweep(b, sr, 'bp', 5200, 900, 1.2, 0.030, 1.6);
      envAD(b, sr, 0.0004, 0.012, 0, 1);
      fadeOut(b, sr, 0.01);
      A.reg('whizz' + v, [normalizeTo(b, 0.8)]);
    }
  }

  /**
   * Handling foley. These are BEATS, not decoration: the player learns the
   * reload's length from them, and weapons.js emits weapon:reload with a phase
   * and a name on the millisecond.
   */
  _bakeHandling() {
    const sr = this.sr, A = this.A;
    const r = this.ctx.rng.fork('gunFoley');
    const rn = () => r.next();
    const N = (s) => Math.round(s * sr);

    const knock = (dur, freqs, taus, amps, hp) => {
      const b = new Float32Array(N(dur));
      for (let i = 0; i < freqs.length; i++) damped(b, sr, freqs[i], taus[i], amps[i]);
      grains(b, sr, rn, { count: 4, span: 0.03, len: [0.0006, 0.002], hp: 2200, lp: 9000, amp: 0.35 });
      biquad(b, sr, 'hp', hp, 0.7);
      fadeOut(b, sr, 0.012);
      return normalizeTo(b, 0.85);
    };

    A.reg('magOut', [knock(0.12, [2650, 4100, 1250], [0.0022, 0.0012, 0.008], [0.9, 0.4, 0.25], 700)]);
    A.reg('magIn', [knock(0.14, [1750, 3200, 520], [0.0035, 0.0015, 0.012], [0.85, 0.35, 0.3], 400)]);
    A.reg('boltBack', [knock(0.16, [900, 2200, 3600], [0.008, 0.003, 0.0015], [0.7, 0.5, 0.3], 500)]);
    A.reg('boltHome', [knock(0.14, [780, 1900, 4300], [0.010, 0.0025, 0.0012], [0.9, 0.4, 0.25], 420)]);
    A.reg('shellIn', [knock(0.10, [1400, 2900], [0.004, 0.0018], [0.6, 0.3], 600)]);
    A.reg('dryClick', [knock(0.07, [2400, 5100], [0.0014, 0.0007], [0.8, 0.3], 1100)]);

    // THE PUMP (r3). A pump gun's identity is the rack: a slide of steel on steel with wood in
    // the hand, ending in a knock. Back is the longer, looser slide; home is short and solid.
    const rack = (dur, slide, slideF, knockAt, freqs, taus, amps, thump) => {
      const b = new Float32Array(N(dur));
      const n = new Float32Array(N(slide));
      noiseFill(n, rn);
      biquadSweep(n, sr, 'bp', slideF[0], slideF[1], 1.1, slide, 1.2);
      envAD(n, sr, slide * 0.35, slide * 0.30, 0, 1.4);
      mixInto(b, n, 0.35);
      for (let i = 0; i < freqs.length; i++) damped(b, sr, freqs[i], taus[i], amps[i], 0, knockAt);
      damped(b, sr, 240, 0.014, thump, 0, knockAt);                      // the wood in the hand
      grains(b, sr, rn, { count: 4, from: knockAt, span: 0.02, len: [0.0006, 0.002], hp: 2000, lp: 9000, amp: 0.3 });
      biquad(b, sr, 'hp', 160, 0.7);
      fadeOut(b, sr, 0.015);
      return normalizeTo(b, 0.85);
    };
    A.reg('pumpBack', [rack(0.20, 0.075, [1800, 3400], 0.070, [620, 1400, 3100], [0.009, 0.004, 0.0016], [0.8, 0.5, 0.25], 0.45)]);
    A.reg('pumpHome', [rack(0.16, 0.045, [2600, 1600], 0.042, [700, 1650, 3600], [0.010, 0.0035, 0.0014], [0.95, 0.45, 0.25], 0.55)]);
    // The revolver's cylinder turning on and the hammer settling: one small bright click.
    A.reg('cylClick', [knock(0.05, [3300, 5600], [0.0012, 0.0006], [0.7, 0.3], 1500)]);

    // THE HIT CONFIRMATION (CONFIRM_GAIN). A tick is two short resonances and 3 ms of air; the
    // head ring is the tick with a thin 2.6 kHz ring on it; the kill is a low falling thump with
    // a knock inside it, felt as much as heard.
    for (let v = 0; v < 3; v++) {
      const k = 1 + (v - 1) * 0.05;
      const b = new Float32Array(N(0.035));
      damped(b, sr, 1850 * k, 0.0018, 0.9);
      damped(b, sr, 3900 * k, 0.0009, 0.45);
      const n = new Float32Array(N(0.003));
      noiseFill(n, rn);
      biquad(n, sr, 'hp', 1800, 0.7); biquad(n, sr, 'lp', 7000, 0.7);
      envAD(n, sr, 0.0002, 0.0009, 0, 1);
      mixInto(b, n, 0.5);
      fadeOut(b, sr, 0.006);
      A.reg('hitTick' + v, [normalizeTo(b, 0.9)]);
    }
    {
      const b = new Float32Array(N(0.09));
      damped(b, sr, 1850, 0.0018, 0.9);
      damped(b, sr, 3900, 0.0009, 0.45);
      damped(b, sr, 2600, 0.012, 0.35, 0, 0.002);
      fadeOut(b, sr, 0.02);
      A.reg('hitHead', [normalizeTo(b, 0.9)]);
    }
    {
      const b = new Float32Array(N(0.20));
      sweepSine(b, sr, 110, 48, 0.090, 0.045, 1.0);
      damped(b, sr, 520, 0.008, 0.35);
      grains(b, sr, rn, { count: 3, from: 0.001, span: 0.012, len: [0.0006, 0.0015], hp: 900, lp: 4000, amp: 0.25 });
      biquad(b, sr, 'hp', 35, 0.7);
      fadeOut(b, sr, 0.04);
      A.reg('killThump', [normalizeTo(b, 0.92)]);
    }

    // a spent case landing — three light knocks and then nothing
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(0.40));
      for (let i = 0; i < 3; i++) {
        const at = 0.02 + i * (0.055 + rn() * 0.05);
        const f = 2400 * (1 + rn() * 0.4);
        damped(b, sr, f, 0.0035, 0.7 / (i + 1), 0, at);
        damped(b, sr, f * 0.42, 0.006, 0.30 / (i + 1), 0, at);
        grains(b, sr, rn, {
          count: 3, from: at, span: 0.02, len: [0.0006, 0.002],
          hp: 2000, lp: 9000, amp: 0.3 / (i + 1),
        });
      }
      biquad(b, sr, 'hp', 800, 0.7);
      fadeOut(b, sr, 0.05);
      A.reg('casing' + v, [normalizeTo(b, 0.6)]);
    }
  }

  /* ------------------------------------------------------------ THE SHOT -- */

  /**
   * `o` is weapons.js's reused weapon:fire payload. It carries `subT` — the
   * sub-frame offset at which the trigger broke — and that number is the whole
   * reason this function exists in the shape it does.
   */
  shot(o) {
    const A = this.A;
    if (!A.enabled || !A.baked || A.silent) return null;
    const key = normGun(o.weapon);
    const W = GUNS[key];
    this.bakeGun(key);
    const r = this.rng;
    this.shotIndex++;
    this._stats.shots++;
    A._stats.shots++;

    // The player's own gun is NON-POSITIONAL: it is at the listener, and panning
    // it produces a rifle that drifts off your shoulder when you turn. Anything
    // else in the county sets `remote` (or `player: false`) and gets the full
    // positional chain: HRTF, air absorption, occlusion and propagation delay.
    const positional = o.ox !== undefined && (o.remote === true || o.player === false);
    const isPlayer = !positional;
    const cam = this.ctx.camera;
    const d = positional && cam
      ? Math.hypot(o.ox - cam.position.x, o.oy - cam.position.y, o.oz - cam.position.z) : 0;

    // SUB-FRAME SCHEDULING. `when` is A.now plus the remainder of the step that
    // had not yet elapsed when the trigger broke. Never a delay from the frame
    // boundary. See the header.
    const dt = o.dt || CFG.loop.FIXED;
    const when = A.now + Math.max(0, dt - (o.subT || 0));

    const trim = (o.gain === undefined ? 1 : o.gain) * W.gain;

    // ---- the anti-machine-gun decorrelation -------------------------------
    const bv = this._lastBv = (this._lastBv + 1 + ((r.next() * (BODY_VARIANTS - 1)) | 0)) % BODY_VARIANTS;
    const mv = this._lastMv = (this._lastMv + 1 + ((r.next() * (MECH_VARIANTS - 1)) | 0)) % MECH_VARIANTS;
    const detune = 1 + r.range(-0.015, 0.015);
    const j1 = r.range(0, 0.003), j2 = r.range(0, 0.003), j3 = r.range(0, 0.003);

    // ---- distance mix, LOG scale. Linear puts the crossover in the wrong ten
    //      metres and a firefight at 60 m sounds like a near one played quietly.
    const t = d <= 12 ? 0 : d >= 40 ? 1 : Math.log(d / 12) / Math.log(40 / 12);
    const bodyDb = -6 * t;
    const tailDb = -9 + 9 * t;
    const bodyLP = d > 40 ? 2200 : d > 12 ? 20000 * Math.pow(2200 / 20000, t) : 20000;
    const mechG = d < 12 ? Math.max(0, 1 - d / 25) : 0;
    const lowAmmo = !!o.lowAmmo;

    // ---- 1. MECHANICAL ----------------------------------------------------
    // Yours goes on 'body', under the low-pass that was burying it (MECH_BODY_DB).
    if (mechG > 0.02) {
      const s = A.spec();
      s.bus = isPlayer ? 'body' : 'weapons';
      // r3: -14 -> -18 for a remote gun, now that the weapons bus is no longer low-passed
      s.gain = dB(isPlayer ? MECH_BODY_DB : -18) * trim * mechG; s.rate = detune;
      s.send = 0.03; s.when = when + j1;
      if (positional) { s.x = o.ox; s.y = o.oy; s.z = o.oz; s.propagate = true; s.priority = 1; }
      A.play('gm_' + key + mv, s);
    }

    // ---- 2. BODY. The player's own body layer goes to the `body` bus, which
    //         BYPASSES the 400 Hz dip. That bypass is the punch move.
    {
      const s = A.spec();
      s.bus = isPlayer ? 'body' : 'weapons';
      s.gain = dB(bodyDb) * trim; s.rate = detune;
      s.send = 0.25; s.when = when; s.lpHz = bodyLP;
      s.filterHz = 1400; s.toneDb = lowAmmo ? 5.5 : 0;
      if (positional) { s.x = o.ox; s.y = o.oy; s.z = o.oz; s.propagate = true; s.priority = 1; }
      A.play('gb_' + key + bv, s);
    }

    // ---- 3. TAIL ----------------------------------------------------------
    // Inside a burst (BURST_S) a round's tail is thinned and its slaps come every third round.
    const burst = isPlayer && A.now - this._lastPlayerShot < BURST_S;
    if (isPlayer) this._lastPlayerShot = A.now;
    this._tail(key, when, dB(tailDb) * trim * W.tailGain * (burst ? BURST_TAIL_K : 1),
      positional ? o : null, isPlayer, d, burst && this.shotIndex % 3 !== 0);

    // ---- 4. SUB -----------------------------------------------------------
    if (d < 30) {
      const s = A.spec();
      s.bus = 'weapons'; s.gain = dB(-6) * trim * (1 - d / 30) * (isPlayer ? 1 : 0.6);
      s.rate = detune; s.send = 0; s.when = when + j3;
      A.play('gsub_' + key, s);
    }

    // ---- the punch move and the auditory reflex ---------------------------
    if (isPlayer) {
      A.punch(when);
      // The brass is no longer a timed sound 0.34 s after every shot (the revolver, which
      // ejects nothing, clicked its way through six phantom cases): the viewmodel's case says
      // 'brass:land' where and when it hits the ground (brassLand below).
      // The revolver's cylinder turns on: one small bright click behind the report.
      if (key === 'revolver') {
        const s = A.spec();
        s.bus = 'body'; s.gain = 0.16; s.send = 0.04; s.when = when + 0.085 + j2;
        s.rate = 0.97 + r.next() * 0.06;
        A.play('cylClick', s);
      }
      // THE LAST ROUND (LAST_CLICK).
      if (o.last) {
        const s = A.spec();
        s.bus = 'body'; s.gain = LAST_CLICK.gain; s.send = 0.04;
        s.when = when + LAST_CLICK.delay; s.rate = LAST_CLICK.rate;
        A.play('dryClick', s);
      }
    }
    return true;
  }

  /**
   * THE HIT CONFIRMATION (CONFIRM_GAIN). Called from impact() for a landing on a body. Once per
   * trigger pull; a kill always thumps, once per pull. Swings do not tick (a buttstroke that
   * lands already stops the world), but a swing that kills still thumps.
   */
  confirm(p) {
    const A = this.A;
    if (!A.enabled || A.silent || !A.baked) return null;
    const pull = typeof p.pull === 'number' ? p.pull : -1;
    const melee = p.weapon === 'melee' || pull < 0;
    const dist = Number.isFinite(p.dist) ? p.dist : 10;
    const when = A.now + CONFIRM_MIN_S + Math.min(0.06, dist / 900);
    let played = false;
    if (!melee && (pull !== this._confirmPull)) {
      this._confirmPull = pull;
      const s = A.spec();
      s.bus = 'body'; s.send = 0.02; s.when = when;
      if (p.zone === 'head') { s.gain = CONFIRM_GAIN.head; s.rate = 1; A.play('hitHead', s); }
      else {
        s.gain = CONFIRM_GAIN.tick * (p.deflected ? 0.7 : 1);
        s.rate = (p.deflected ? 0.72 : 1) * (0.98 + this.rng.next() * 0.04);
        A.play('hitTick' + (this._stats.confirms % 3), s);
      }
      this._stats.confirms++;
      played = true;
    }
    if (p.killed && pull !== this._killPull) {
      this._killPull = pull < 0 ? -3 - this._stats.kills : pull;
      const s = A.spec();
      s.bus = 'body'; s.send = 0.04; s.when = when + 0.012;
      s.gain = CONFIRM_GAIN.kill; s.rate = p.zone === 'head' ? 1.08 : 1;
      A.play('killThump', s);
      this._stats.kills++;
      played = true;
    }
    return played;
  }

  /** The bolt or the pump, back and home (weapon.js 'weapon:cycle'). */
  cycleCue(p) {
    const A = this.A;
    if (!A.enabled || A.silent || !A.baked) return null;
    const key = normGun(p.weapon);
    const back = p.phase === 'back';
    const s = A.spec();
    s.bus = 'body'; s.send = 0.06;
    s.rate = 0.97 + this.rng.next() * 0.05;
    let name;
    if (key === 'shotgun') { name = back ? 'pumpBack' : 'pumpHome'; s.gain = back ? 0.34 : 0.38; s.rate *= 0.92; }
    else { name = back ? 'boltBack' : 'boltHome'; s.gain = back ? 0.30 : 0.34; }
    this._stats.cycles++;
    return A.play(name, s);
  }

  /**
   * A spent case hitting the ground (viewmodel.js 'brass:land', its first bounce): positional,
   * as loud as the fall was hard, bright on a hard floor and near silent in the grass.
   */
  brassLand(p) {
    const A = this.A;
    if (!A.enabled || A.silent || !A.baked) return null;
    if (!Number.isFinite(p.x) || p.soft === 2) return null;          // into water: nothing
    const hard = p.soft ? 0.35 : 1;
    const sp = clamp((p.speed || 2) / 4, 0.3, 1.1);
    const s = A.spec();
    s.x = p.x; s.y = p.y; s.z = p.z;
    s.bus = 'world'; s.send = 0.10; s.priority = 3; s.occl = false;
    s.gain = 0.30 * hard * sp; s.rate = (p.shell ? 0.62 : 0.97) + this.rng.next() * 0.08;
    if (p.soft) s.lpHz = 2600;
    this._stats.brass++;
    return A.play('casing' + (this._stats.brass % 3), s);
  }

  /**
   * Tail selection: openness < 0.32 interior, 0.32-0.62 forest, > 0.62 open,
   * crossfaded across the bands. Never a hard switch.
   *
   * THE OPENNESS PROBE is what makes this read as a place: standing under a
   * closed canopy the same rifle answers dark and short, and on the ridge it
   * answers across the valley. Nobody authored that; six rays did.
   * donor: cinderbloom/src/audio/guns.js:845-878
   */
  _tail(key, when, gain, pos, isPlayer, d, noSlaps = false) {
    const A = this.A;
    const open = A.openness();
    const v = this.shotIndex & 1;
    const wRoom = sat((0.32 - open) / 0.16);
    const wOpen = sat((open - 0.62) / 0.16);
    const wForest = clamp(1 - wRoom - wOpen, 0, 1);

    const add = (name, g, delay) => {
      if (g < 0.02) return;
      const s = A.spec();
      s.bus = 'weapons'; s.send = 0.14; s.occl = false;
      s.gain = gain * g; s.when = when + (delay || 0);
      if (pos && d > 18) { s.x = pos.ox; s.y = pos.oy; s.z = pos.oz; s.propagate = !isPlayer; }
      A.play(name, s);
      this._stats.tails++;
    };
    add('tail_room' + v, wRoom, 0.004);
    add('tail_forest' + v, wForest, 0.010);
    add('tail_open' + v, wOpen * 1.15, 0.020);

    // The two DISCRETE slapbacks, at the probe's measured distances. Near shots
    // only: at 60 m the shooter's slapbacks are not your room.
    if (wForest > 0.15 && d < 30 && !noSlaps) {
      const E = A.early();
      for (let k = 0; k < 2; k++) {
        const g = gain * wForest * E[k][1] * 1.5;
        if (g < 0.02) continue;
        const s = A.spec();
        s.bus = 'weapons'; s.gain = g; s.when = when + E[k][0];
        s.rate = 1 - k * 0.06; s.send = 0.30; s.occl = false;
        A.play('slap' + (v ^ k), s);
        this._stats.slaps++;
      }
    }
  }

  /* ---------------------------------------------------------- the answer -- */

  /**
   * EVERY SHOT MUST ANSWER. combat emits weapon:hit with a surface tag and a
   * point; an unknown tag falls through to dirt, never to silence, because a
   * shot that lands and says nothing reads to the player as a miss.
   */
  impact(p) {
    const A = this.A;
    if (!A.enabled || A.silent) return null;
    // The shooter's side of a hit on a body: the tick (confirm, above).
    if (p.enemy && !p.exit) this.confirm(p);
    // A blast is not eight impacts: the first two surface hits of a pull speak, the rest do not.
    if (!p.enemy && typeof p.pull === 'number' && p.pull >= 0) {
      if (p.pull !== this._surfPull) { this._surfPull = p.pull; this._surfN = 0; }
      if (++this._surfN > 2) return null;
    }
    this._stats.impacts++;
    const k0 = SURFACE_ALIAS[p.kind] || p.kind;
    const kind = SURFACES.indexOf(k0) >= 0 ? k0 : 'dirt';
    const v = (this.shotIndex + this._stats.impacts) % 3;
    const dist = p.dist === undefined ? A.distToListener(p.x, p.y, p.z) : p.dist;

    const s = A.spec();
    s.x = p.x; s.y = p.y; s.z = p.z;
    s.bus = kind === 'flesh' ? 'creatures' : 'world';
    s.gain = clamp(0.85 * (p.deflected ? 0.6 : 1), 0, 1.2);
    s.rate = 0.94 + this.rng.next() * 0.12;
    // Snow and cloth take a round softly: the dirt thud a little lower, the foliage hiss duller.
    if (p.kind === 'snow') { s.rate *= 0.82; s.lpHz = 1800; s.gain *= 0.7; }
    else if (p.kind === 'cloth') { s.rate *= 0.75; s.lpHz = 2400; }
    s.send = 0.22;
    s.priority = 1;                       // threat audio gets the reserved rays
    s.propagate = dist > 25;              // a hit 80 m off arrives a quarter-second late
    A.play('imp_' + kind + v, s);

    // A deflection off rock or metal whines away. It is the sound that tells you
    // the thing you shot did not take it.
    if (p.deflected && (kind === 'rock' || kind === 'metal' || kind === 'glass')) {
      const q = A.spec();
      q.x = p.x; q.y = p.y; q.z = p.z;
      q.bus = 'weapons'; q.gain = 0.35; q.send = 0.35; q.delay = 0.012;   // r3: 0.5, unmuffled
      q.rate = 0.92 + this.rng.next() * 0.2;
      A.play('ric' + (this._stats.impacts % 3), q);
    }
    return true;
  }

  /** A round passing you. Positional, near-field, always priority 1. */
  whizz(x, y, z) {
    const A = this.A;
    if (!A.enabled || A.silent) return null;
    const s = A.spec();
    s.x = x; s.y = y; s.z = z;
    s.bus = 'weapons'; s.gain = 0.5; s.send = 0.08; s.priority = 1; s.occl = false;   // r3: 0.7, unmuffled
    s.cls = CUE_THREAT;                // a round past your ear IS 'you are being shot at'
    s.rate = 0.9 + this.rng.next() * 0.25;
    return A.play('whizz' + (this.shotIndex & 1), s);
  }

  /**
   * The reload beats. weapon:reload carries { phase, name, empty, ammo } and the
   * NAMES are weapons.js's, not ours — so map loosely and always make a sound,
   * because a reload beat that plays nothing is a refusal the player cannot hear.
   */
  reloadCue(p) {
    const A = this.A;
    if (!A.enabled || A.silent) return null;
    const n = String(p.name || p.phase || '').toLowerCase();
    let buf = 'magIn';
    // D2: two beats are named exactly, before the loose chain. 'active' is the hit - the
    // bolt-home seat pitched up a shade (rate 1.08) and a little brighter than a beat, so a
    // hit is FELT as a hit and never as another knock; still nothing loud. 'dry' is the empty
    // gun's click (weapon.js emits it on every dry pull now): quiet, dull, informative.
    // r3: these are YOUR hands, so they go on 'body' (clear, not low-passed) at HANDLING_K.
    let rate = 0.98 + this.rng.next() * 0.05, gain = 0.55;
    if (n === 'active') { buf = 'boltHome'; rate = 1.08; gain = 0.62; }
    else if (n === 'dry') { buf = 'dryClick'; gain = 0.50; }
    else if (n === 'shell') { buf = 'shellIn'; }
    else if (n === 'boltrelease') { buf = 'boltHome'; }
    else if (n.indexOf('out') >= 0 || n.indexOf('release') >= 0 || n.indexOf('drop') >= 0) buf = 'magOut';
    else if (n.indexOf('bolt') >= 0 || n.indexOf('charge') >= 0 || n.indexOf('rack') >= 0) buf = p.empty ? 'boltBack' : 'boltHome';
    else if (n.indexOf('shell') >= 0 || n.indexOf('round') >= 0) buf = 'shellIn';
    else if (n.indexOf('dry') >= 0 || n.indexOf('empty') >= 0) buf = 'dryClick';
    else if (n.indexOf('start') >= 0) buf = 'magOut';
    else if (n.indexOf('end') >= 0 || n.indexOf('seat') >= 0) buf = 'boltHome';
    else if (n.indexOf('cancel') >= 0) buf = 'shellIn';
    const s = A.spec();
    s.bus = 'body'; s.gain = gain * HANDLING_K; s.send = 0.10;
    s.rate = rate;
    return A.play(buf, s);
  }

  stats() { return this._stats; }
}

export default GunAudio;
