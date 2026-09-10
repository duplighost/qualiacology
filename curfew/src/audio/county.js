// audio/county.js — THE COUNTY'S OWN SOUNDS. Owner: audio. Not a manifest system: audio.js
// constructs it the way it constructs the bed and the earshot ticker, so there is no `static
// id` here and no SYSTEMS row (tests/reverse-manifest.mjs).
//
// ROUND 22 lane G. Alex, 2026-09-10, "Sound", verbatim where it matters:
//   "Church bells on the hour."
//   "Ice cream truck jingle, far off in the woods. Sometimes it moves."
//   "Alarm clocks. Drive through a neighborhood at 6:30 and hear every one of them going off
//    behind every door." "Coffee makers on timers. You walk in and hear one brewing at 6:00 AM."
//   "A rooster on a farm still crowing at 5:40 every 'morning.' Sound carries a mile."
//   "The dawn chorus. Birds still start singing at five, stop after a minute like they're
//    embarrassed, and don't try again until tomorrow."
//   "Wind chimes deep in the woods with no house near them. They ring before the hounds come."
//   "Lightning... one frame of the whole forest, every silhouette, then black." (thunder is
//    this file's; the bolt is lane F's, on 'weather:lightning')
//   "Somewhere in the woods, a voice calling a dog's name. Over and over." (the voice is this
//    file's; the man is lane C's, on 'dogcaller:call' / 'dogcaller:dead')
//   "A planetarium... Press the button and the dome does a sunrise." (a projector hum and a
//    relay, on lane I's events; NO narration — there are no words in the county's mouth)
//
// THE FALSE DAWN. The county has no hours: its clock is a 14 minute cycle dusk | night |
// black | dawn (world/clock.js). Every "6 AM" in the spec fires at the START of the 'dawn'
// phase — the alarms, the coffee, the rooster, the chorus — and that is the morning that never
// comes. "On the hour" for the bells is every phase change (one toll at dusk, two at night,
// three at the black hour, four at the false dawn) plus one lone toll every 210 s.
//
// THE MIX LAW (audio.js): everything on the world bus is 4th-order lowpassed at 1.6 kHz and
// 2.5-5.5 kHz belongs to the threat cues alone. So nothing here is baked bright: the alarm is
// an old bedside buzzer at 1.2 kHz, the chorus sits at 0.9-1.45 kHz, the jingle's fundamentals
// are 350-880 Hz. Everything is CUE_FLAVOUR (the county being alive) except the dog-caller,
// who is a real man doing a real thing and is CUE_WORLD. Nothing here connects to the master.
//
// FAR SOURCES. playBuf's air absorption clamps at 220 Hz past ~250 m, and the default HRTF
// rolloff makes a 400 m source -34 dB. A bell a kilometre off is neither; so every far cue
// sets air:false with its own lowpass by distance and its own ref/roll/maxDist. A pooled voice
// is reclaimed at its scheduled end, so nothing here loops in the pool: the jingle and the
// alarms are re-triggered one-shots, the projector hum is its own looping node on the world
// bus (bed.js's stem pattern).
//
// Bakes: bells, chimes and thunder on the boot path (a phase change can ring in the first
// minute and lane F's first bolt can land any time); everything else in the idle `rest`
// callback with an on-demand fallback, like the pause piece. Every number is CFG.audio.county's
// or is cited beside its use. The constructor is Node-safe: tests/outer-forest.mjs builds an
// Audio under plain Node.

import { CFG } from '../config.js';
import { clamp } from '../engine/math.js';
import {
  noiseFill, pinkFill, brownFill, biquad, biquadSweep, envAD, fadeOut, fadeIn, damped,
  sweepSine, grains, saturate, normalizeTo, mixInto, CUE_WORLD, CUE_FLAVOUR,
} from './audio.js';
import { radioize } from './radio.js';

const K = (CFG.audio && CFG.audio.county) || {};
const BELL_EVERY_S = K.bellEveryS !== undefined ? K.bellEveryS : 210;
const BELL_RANGE_M = K.bellRangeM !== undefined ? K.bellRangeM : 1800;
const CHIME_COOLDOWN_S = K.chimeCooldownS !== undefined ? K.chimeCooldownS : 25;
const THUNDER_DUCK_DB = K.thunderDuckDb !== undefined ? K.thunderDuckDb : 4;
const THUNDER_DUCK_M = K.thunderDuckM !== undefined ? K.thunderDuckM : 250;
const TRUCK_CHANCE = K.truckChance !== undefined ? K.truckChance : 0.30;
const TRUCK_SPEED = K.truckSpeedMps !== undefined ? K.truckSpeedMps : 0.5;
const TRUCK_HEAR = K.truckHearM || [200, 700];
const DAWN_HOUSES = K.dawnHouses !== undefined ? K.dawnHouses : 4;
const DAWN_RANGE_M = K.dawnRangeM !== undefined ? K.dawnRangeM : 400;
const CHORUS_S = K.chorusS !== undefined ? K.chorusS : 60;
const CHORUS_PER_S = K.chorusPerS !== undefined ? K.chorusPerS : 2.6;
const ROOSTER_RANGE_M = K.roosterRangeM !== undefined ? K.roosterRangeM : 1200;
const ROOSTER_ON = K.rooster !== undefined ? !!K.rooster : true;
const DC_LP_HZ = K.dogcallerLpHz !== undefined ? K.dogcallerLpHz : 1800;
const DC_TAIL_S = K.dogcallerTailS !== undefined ? K.dogcallerTailS : 1.2;
const DC_COOLDOWN_S = K.dogcallerCooldownS !== undefined ? K.dogcallerCooldownS : 4;

// Bells: which majors have one (world/placedata.js kinds). The bell-tower's own shootable
// bell (places._ring) is a different mechanic and is left alone.
const BELL_KINDS = { chapel: 1, steeple: 1, tower: 1, cathedral: 1, 'bell-vault': 1 };
const BELL_HEIGHT = 12;                   // a steeple's bell is up in the air, not on the step
const TOLL_GAP_S = 2.6;                   // a sexton's pull; faster is an alarm, slower is a funeral
const TOLLS = { dusk: 1, night: 2, black: 3, dawn: 4 };
// Dwellings for the false dawn: majors with a door (placedata kinds) and the wilds' homesteads.
const DWELLING_KINDS = { manor: 1, avery: 1, station: 1, holdfast: 1, barn: 1 };
const HOMESTEAD_VARIANTS = { cabin: 1, barn: 1, farm: 1 };
const ALARM_S = 60;                       // "going off behind every door" for a minute, then they give up
const TRUCK_RETHINK_S = 40;               // it parks and moves in stretches, not at a steady creep
const TAIL_COMBS = [0.0297, 0.0371, 0.0411, 0.0437];   // Schroeder's four; a valley is not a hall

const DC_FILES = ['dogcaller-1.wav', 'dogcaller-2.wav', 'dogcaller-3.wav'];

/** A seamless loop (pause.js's loopify): crossfade the overhang back over the head. */
function loopify(b, sr, xfadeSec) {
  const x = Math.min(Math.round(xfadeSec * sr), (b.length / 3) | 0);
  const n = b.length - x;
  const out = new Float32Array(n);
  out.set(b.subarray(0, n));
  for (let i = 0; i < x; i++) {
    const t = i / x;
    out[i] = out[i] * t + b[n + i] * (1 - t);
  }
  return out;
}

/** Lowpass corner for a far source: `top` at the ear, falling with distance, never a mumble. */
function farLp(d, top, k) { return clamp(top * Math.exp(-d / k), 250, top); }

/**
 * A cheap deterministic tail: four feedback combs summed, damped, decaying to -60 dB in
 * `seconds`. The toolkit has makeIR for the live convolvers but no offline convolution, and
 * the dog-caller's tail has to be baked in so it survives the openness blend exactly the same
 * every time he calls.
 */
function bakeTail(dry, sr, seconds, mix) {
  const n = dry.length + Math.round(seconds * sr);
  const out = new Float32Array(n);
  out.set(dry);
  const wet = new Float32Array(n);
  for (let k = 0; k < TAIL_COMBS.length; k++) {
    const L = Math.max(1, Math.round(TAIL_COMBS[k] * sr));
    const g = Math.pow(10, -3 * TAIL_COMBS[k] / seconds);
    const y = new Float32Array(n);
    let lpz = 0;
    for (let i = 0; i < n; i++) {
      const x = i < dry.length ? dry[i] : 0;
      const fb = i >= L ? y[i - L] : 0;
      lpz = lpz * 0.45 + fb * 0.55;          // damping in the loop: highs die first, as in air
      y[i] = x + lpz * g;
      wet[i] += (y[i] - x) * 0.25;
    }
  }
  biquad(wet, sr, 'lp', 1400, 0.7);
  mixInto(out, wet, mix);
  return out;
}

export class County {
  constructor(ctx, A) {
    this.ctx = ctx;
    this.A = A;
    this.rng = ctx.rng.fork('audio:county');
    this.rngTruck = ctx.rng.fork('audio:county:truck');
    this.baked = false;
    this.restBaked = false;
    this.bakeMs = 0;       // the boot-path slice alone (bells, chimes, thunder)
    this.restMs = 0;       // the idle bakes (everything else), all three parts together
    // The idle bake in three parts, one per idle callback, so no single callback is a hitch:
    // 'dawn' (alarms, coffee, rooster, chorus), 'far' (jingle, hum, the siblings' cues),
    // 'radio' (the dial's synthesized parts). Each has an on-demand fallback at its first use.
    this._rest = { dawn: false, far: false, radio: false };

    // listener / player, read once per step
    this._px = 0; this._py = 1.7; this._pz = 0;

    // bells
    this._bellSites = null;                 // [{x, y, z, size}] resolved on first use
    this._bellT = BELL_EVERY_S * 0.5;       // the first lone toll comes early, then on the count
    this._tolls = new Array(12);
    for (let i = 0; i < this._tolls.length; i++) this._tolls[i] = { live: false, at: 0, site: null };

    // the false dawn
    this._dwellings = null;                 // [{x, z, farm}] resolved at the first dawn
    this._houses = new Array(DAWN_HOUSES);
    for (let i = 0; i < DAWN_HOUSES; i++) {
      this._houses[i] = { live: false, x: 0, y: 0, z: 0, next: 0, coffee: false, coffeeNext: 0, v: 0 };
    }
    this._dawnLeft = 0;
    this._roosterT = -1;
    this._roosterSite = null;
    this._chorusLeft = 0;
    this._chorusAcc = 0;

    // chimes
    this._chimeCool = 0;
    this._orderSeen = false;

    // the truck
    this._truck = { on: false, route: null, seg: 0, frac: 0, dir: 1, x: 0, z: 0, next: 0, moving: true, moveT: 0 };

    // the dog-caller: 0 unloaded, 1 loading, 2 ready, 3 failed
    this._dc = { state: 0, cool: 0, dead: false, calls: 0, played: 0, refused: 0 };

    // the dome
    this._hum = { src: null, gain: null, pan: null };

    // optional siblings (lanes E and H)
    this._xing = { on: false, x: 0, z: 0, next: 0 };
    this._ballastCool = 0;

    this._n = { toll: 0, chime: 0, thunder: 0, dawn: 0, alarm: 0, coffee: 0, chorus: 0, rooster: 0,
      truck: 0, xing: 0, trailcam: 0, ballast: 0, hum: 0, button: 0 };
    this._lastThunder = null;
  }

  /* ---------------------------------------------------------------- bake -- */

  /** Boot path: only what can be asked for in the first minute. Measured in bakeMs. */
  bake() {
    const A = this.A;
    if (!A.actx || this.baked) return;
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    const sr = Math.max(16000, A.sr / 2);
    const N = (s) => Math.round(s * sr);
    const rn = () => this.rng.next();
    const reg = (name, b) => A.reg(name, [b], sr);

    // THE CHURCH BELL. The whisper bell's partial table (audio.js _bakeWhisper) at a lower
    // prime: a church bell is a bigger casting, so the hum is lower and outlives everything.
    // Two sizes so the two nearest churches are told apart by ear.
    const P = [[0.500, 0.55, 5.2], [1.000, 1.00, 3.6], [1.183, 0.42, 2.4],
               [1.506, 0.30, 1.7], [2.000, 0.26, 1.2], [2.514, 0.14, 0.7]];
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(6.0));
      const f = v === 0 ? 165 : 220;
      for (let i = 0; i < P.length; i++) {
        damped(b, sr, f * P[i][0], P[i][2], P[i][1]);
        damped(b, sr, f * P[i][0] * 1.0016, P[i][2] * 0.92, P[i][1] * 0.55, 1.1);
      }
      const strike = new Float32Array(N(0.06));
      noiseFill(strike, rn);
      biquad(strike, sr, 'bp', 1400, 1.0);
      envAD(strike, sr, 0.001, 0.012);
      mixInto(b, strike, 0.30);
      biquad(b, sr, 'hp', 70, 0.7);
      fadeOut(b, sr, 0.4);
      reg('county_bell' + v, normalizeTo(b, 0.90));
    }

    // WIND CHIMES. Five aluminium tubes on a pentatonic-ish set, each with a cent-detuned
    // partner (the shimmer), struck five or six times over three seconds in the order a gust
    // would take them. Three variants so a second approach is not the first one replayed.
    const TUBES = [880, 988, 1109, 1318, 1480];
    for (let v = 0; v < 3; v++) {
      const b = new Float32Array(N(3.6));
      const hits = 5 + ((rn() * 2) | 0);
      for (let h = 0; h < hits; h++) {
        const at = h === 0 ? 0.05 : 0.05 + rn() * 2.4;
        const t = TUBES[(rn() * TUBES.length) | 0];
        const amp = 0.5 + rn() * 0.5;
        damped(b, sr, t, 1.1 + rn() * 0.5, amp, 0, at);
        damped(b, sr, t * 1.0022, 0.9, amp * 0.5, 0.7, at);
        damped(b, sr, t * 2.71, 0.25, amp * 0.18, 0, at);   // a tube's first overtone, brief
      }
      biquad(b, sr, 'hp', 300, 0.7);
      fadeOut(b, sr, 0.3);
      reg('county_chime' + v, normalizeTo(b, 0.80));
    }

    // THUNDER. A crack (pink noise collapsing 1500 -> 180 Hz, the biquadSweep that IS a rifle
    // in guns.js) over a rumble (brown noise with two or three slow swells) that rolls for six
    // seconds. Saturated a little so the swells have edges. The distance lowpass is applied at
    // play, so the bake keeps its mids: a phone hears nothing under 200 Hz and thunder that is
    // only rumble is thunder Alex never hears.
    for (let v = 0; v < 3; v++) {
      const len = 5.5 + v * 0.7;
      const b = new Float32Array(N(len));
      const crack = new Float32Array(N(0.9));
      pinkFill(crack, rn);
      biquadSweep(crack, sr, 'lp', 1500, 180, 0.9, 0.55, 1.6);
      envAD(crack, sr, 0.004 + v * 0.003, 0.22);
      mixInto(b, crack, 1.0);
      const rumble = new Float32Array(N(len));
      brownFill(rumble, rn);
      biquad(rumble, sr, 'lp', 160, 0.8);
      biquad(rumble, sr, 'hp', 28, 0.7);
      // the swells: a slow envelope with a few rolling bumps, never the same shape twice
      const swells = 2 + ((rn() * 2) | 0);
      const bumpAt = [], bumpW = [];
      for (let s = 0; s < swells; s++) { bumpAt.push(0.6 + rn() * (len - 2.0)); bumpW.push(0.35 + rn() * 0.5); }
      let e = 0;
      for (let i = 0; i < rumble.length; i++) {
        if ((i & 63) === 0) {     // the envelope moves in seconds; no exp per sample
          const t = i / sr;
          e = Math.exp(-t / (len * 0.38)) * 0.55;
          for (let s = 0; s < swells; s++) { const d = (t - bumpAt[s]) / bumpW[s]; e += Math.exp(-d * d) * 0.6; }
        }
        rumble[i] *= e;
      }
      mixInto(b, rumble, 0.9);
      saturate(b, 1.6, 0.6);
      fadeOut(b, sr, 0.5);
      reg('county_thunder' + v, normalizeTo(b, 0.95));
    }

    this.baked = true;
    this.bakeMs = (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  }

  /**
   * Off the boot path, one part per idle callback (audio.js's `rest` calls this once and it
   * re-arms itself until every part is baked). MEASURED on this machine with three other
   * lanes' suites running: all three parts together were 1.0 s of wall time in one callback,
   * which is a hitch in the first seconds of play; split, none is.
   */
  bakeRestIdle() {
    const order = ['dawn', 'far', 'radio'];
    let next = null;
    for (let i = 0; i < order.length; i++) if (!this._rest[order[i]]) { next = order[i]; break; }
    if (!next) return;
    try { this.bakeRest(next); } catch (e) { void e; }
    let more = false;
    for (let i = 0; i < order.length; i++) if (!this._rest[order[i]]) more = true;
    if (!more) return;
    const again = () => this.bakeRestIdle();
    if (typeof requestIdleCallback === 'function') requestIdleCallback(again, { timeout: 4000 });
    else if (typeof requestAnimationFrame === 'function') requestAnimationFrame(again);
  }

  /**
   * Off the boot path: the false dawn, the truck, the dome, the siblings, the radio's tones.
   * `part` is 'dawn' | 'far' | 'radio'; with no part, everything still missing (the fallback
   * a first use pays once if the idle callbacks never ran).
   */
  bakeRest(part) {
    const A = this.A;
    if (!A.actx || this.restBaked) return;
    const want = (p) => (!part || part === p) && !this._rest[p];
    const sr = Math.max(16000, A.sr / 2);
    const N = (s) => Math.round(s * sr);
    const rn = () => this.rng.next();
    const reg = (name, b) => A.reg(name, [b], sr);
    const t0 = typeof performance !== 'undefined' ? performance.now() : 0;
    // A struck tine, rendered into a short scratch and mixed in: damped() runs to its floor
    // (nine time constants), which for seventy notes is most of a bake nobody hears.
    const tineBuf = new Float32Array(N(1.2));
    const tine = (b, f, at, amp, tau) => {
      tineBuf.fill(0);
      damped(tineBuf, sr, f, tau, amp);
      damped(tineBuf, sr, f * 2.0, tau * 0.6, amp * 0.35, 0.3);
      damped(tineBuf, sr, f * 3.0, tau * 0.35, amp * 0.12, 0.6);
      fadeOut(tineBuf, sr, 0.05);
      mixInto(b, tineBuf, 1.0, N(at));
    };

    if (want('dawn')) {
    // ALARM CLOCKS. Several clocks per house in ONE buffer, out of phase: an old electro-
    // mechanical buzzer (a 1.05 kHz carrier chopped at 60 Hz), a bedside beeper at 1.25 kHz
    // gated four times a second, and a digital one at 1.4 kHz in bursts. All under the mix law's
    // 1.6 kHz; the harmonics that would make them shrill are exactly what the law removes.
    for (let v = 0; v < 2; v++) {
      const b = new Float32Array(N(6.0));
      const fA = 1250 + v * 40, fB = 1050 - v * 30, fC = 1400 - v * 60;
      const kA = 2 * Math.PI * fA / sr, kB = 2 * Math.PI * fB / sr, kC = 2 * Math.PI * fC / sr;
      const offA = rn() * 0.25, offC = rn() * 1.0;
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        // A: beep 0.125 s on / 0.125 s off
        const gA = ((t + offA) % 0.25) < 0.125 ? 1 : 0;
        // B: 60 Hz chopped carrier, one second on, one second off
        const gB = (t % 2.0) < 1.0 ? (Math.sin(2 * Math.PI * 60 * t) > 0 ? 1 : 0.15) : 0;
        // C: four quick bursts then a rest
        const tc = (t + offC) % 1.6;
        const gC = tc < 0.8 ? (((tc % 0.2) < 0.1) ? 1 : 0) : 0;
        const sqA = Math.sin(kA * i) + Math.sin(2 * kA * i) * 0.35;
        b[i] = sqA * gA * 0.55 + Math.sin(kB * i) * gB * 0.45 + Math.sin(kC * i) * gC * 0.4;
      }
      biquad(b, sr, 'hp', 400, 0.7);
      fadeIn(b, sr, 0.01); fadeOut(b, sr, 0.05);
      reg('county_alarm' + v, normalizeTo(b, 0.70));
    }

    // COFFEE MAKER. A gurgle (brown noise through a 180-400 Hz band with grains for the
    // bubbles) that swells twice, under a steam hiss. Four seconds; it re-triggers.
    {
      const b = new Float32Array(N(4.0));
      brownFill(b, rn);
      biquad(b, sr, 'bp', 280, 0.9, 0, 2);
      for (let i = 0; i < b.length; i++) {
        const t = i / sr;
        b[i] *= 0.5 + 0.5 * Math.sin(t * 2.1) * Math.sin(t * 0.7 + 1.0);
      }
      grains(b, sr, rn, { count: 34, from: 0.1, span: 3.6, len: [0.006, 0.02], hp: 200, lp: 900, amp: 0.7, decay: 0.2 });
      const steam = new Float32Array(N(4.0));
      pinkFill(steam, rn);
      biquad(steam, sr, 'bp', 1100, 0.6);
      envAD(steam, sr, 1.2, 1.4);
      mixInto(b, steam, 0.35);
      fadeIn(b, sr, 0.05); fadeOut(b, sr, 0.2);
      reg('county_coffee', normalizeTo(b, 0.65));
    }

    // THE ROOSTER. Four syllables, short-long-short-long, a sawtooth-rich source whose pitch
    // rises across the third and falls through the fourth, with breath under it and a formant
    // peak near 1.1 kHz. Never played near: ref 40, lowpassed by distance. It is behind one
    // CFG row (county.rooster) because it is the cue most exposed to taste.
    {
      const b = new Float32Array(N(2.4));
      const SYL = [[0.00, 0.20, 540, 620], [0.24, 0.16, 700, 640], [0.44, 0.34, 760, 920], [0.82, 0.70, 900, 560]];
      for (let s = 0; s < SYL.length; s++) {
        const at = SYL[s][0], dur = SYL[s][1], f0 = SYL[s][2], f1 = SYL[s][3];
        const part = new Float32Array(N(dur + 0.25));
        for (let h = 1; h <= 4; h++) sweepSine(part, sr, f0 * h, f1 * h, dur, dur * 0.9, 0.9 / h);
        envAD(part, sr, 0.02, dur * 0.35, dur * 0.5, 0.7);
        const breath = new Float32Array(N(dur + 0.2));
        pinkFill(breath, rn);
        biquad(breath, sr, 'bp', 1200, 0.8);
        envAD(breath, sr, 0.03, dur * 0.4, dur * 0.3);
        mixInto(part, breath, 0.16);
        mixInto(b, part, 1.0, N(at));
      }
      biquad(b, sr, 'peak', 1100, 1.2, 6);
      biquad(b, sr, 'lp', 1500, 0.7, 0, 2);
      biquad(b, sr, 'hp', 300, 0.7);
      fadeOut(b, sr, 0.2);
      reg('county_rooster', normalizeTo(b, 0.85));
    }

    // THE DAWN CHORUS. Four birds: three to five short glides each, 0.9-1.45 kHz, different
    // rhythms. A chorus is a density of these around the player for a minute, then nothing.
    for (let v = 0; v < 4; v++) {
      const notes = 3 + ((rn() * 3) | 0);
      const b = new Float32Array(N(0.35 + notes * 0.22));
      let at = 0.02;
      for (let k = 0; k < notes; k++) {
        const f0 = 950 + rn() * 350, f1 = clamp(f0 + (rn() - 0.5) * 500, 900, 1450);
        const dur = 0.05 + rn() * 0.09;
        const note = new Float32Array(N(dur + 0.08));
        sweepSine(note, sr, f0, f1, dur, dur * 0.8, 1.0);
        envAD(note, sr, 0.006, dur * 0.4, dur * 0.3);
        mixInto(b, note, 0.9, N(at));
        at += dur + 0.06 + rn() * 0.12;
      }
      biquad(b, sr, 'hp', 700, 0.7);
      fadeOut(b, sr, 0.05);
      reg('county_chorus' + v, normalizeTo(b, 0.75));
    }
    this._rest.dawn = true;
    }

    if (want('far')) {
    // THE ICE CREAM TRUCK. Eight bars of a music-box tune at 96 bpm (twenty seconds), a
    // melody over an oom-pah bass, celesta partials, lowpassed at 1.2 kHz because it is
    // always far, and softly clipped because it comes out of a horn speaker on a roof. The
    // tune is this file's own; it only has to be cheerful and wrong.
    {
      const bpm = 96, eighth = 60 / bpm / 2;
      const b = new Float32Array(N(eighth * 64 + 1.5));
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      const MEL = [
        [72, 2], [69, 1], [72, 1], [77, 2], [76, 1], [74, 1],
        [72, 2], [69, 1], [72, 1], [74, 4],
        [74, 2], [70, 1], [74, 1], [79, 2], [77, 1], [76, 1],
        [74, 2], [72, 1], [74, 1], [72, 4],
        [72, 2], [69, 1], [72, 1], [77, 2], [76, 1], [74, 1],
        [76, 1], [77, 1], [79, 1], [81, 1], [79, 2], [76, 2],
        [77, 1], [76, 1], [74, 1], [72, 1], [70, 2], [74, 2],
        [72, 3], [69, 1], [65, 4],
      ];
      let t = 0;
      for (let i = 0; i < MEL.length; i++) { tine(b, hz(MEL[i][0]), t, 0.55, 0.42); t += MEL[i][1] * eighth; }
      // bass and after-beat chords, one bar of each root: F F Bb C7 F C Bb F
      const ROOT = [53, 53, 58, 48, 53, 48, 58, 53];
      const CHORD = [[69, 72], [69, 72], [70, 74], [70, 76], [69, 72], [67, 72], [70, 74], [69, 72]];
      for (let bar = 0; bar < 8; bar++) {
        const t0b = bar * 8 * eighth;
        for (let beat = 0; beat < 4; beat++) {
          const at = t0b + beat * 2 * eighth;
          if (beat % 2 === 0) tine(b, hz(ROOT[bar]), at, 0.5, 0.30);
          else { tine(b, hz(CHORD[bar][0]), at, 0.22, 0.18); tine(b, hz(CHORD[bar][1]), at, 0.22, 0.18); }
        }
      }
      biquad(b, sr, 'hp', 120, 0.7);
      biquad(b, sr, 'lp', 1200, 0.7);
      saturate(b, 1.5, 0.5);
      fadeOut(b, sr, 0.8);
      reg('county_jingle', normalizeTo(b, 0.80));
    }

    // THE PROJECTOR HUM. Mains hum with its harmonics under a fan, four seconds, loopified.
    {
      const b = new Float32Array(N(4.6));
      for (let h = 1; h <= 5; h++) {
        const w = 2 * Math.PI * 120 * h / sr, a = 0.5 / h;
        for (let i = 0; i < b.length; i++) b[i] += Math.sin(w * i + h) * a;
      }
      const fan = new Float32Array(b.length);
      pinkFill(fan, rn);
      biquad(fan, sr, 'lp', 700, 0.7);
      biquad(fan, sr, 'hp', 90, 0.7);
      mixInto(b, fan, 0.9);
      reg('county_hum', normalizeTo(loopify(b, sr, 0.6), 0.6));
    }

    // Lane H's trail cam: a shutter click and the flash capacitor's whine.
    {
      const b = new Float32Array(N(1.1));
      const click = new Float32Array(N(0.02));
      noiseFill(click, rn);
      biquad(click, sr, 'bp', 1300, 1.2);
      envAD(click, sr, 0.0005, 0.004);
      mixInto(b, click, 1.0);
      sweepSine(b, sr, 900, 1500, 0.8, 0.45, 0.35, 0.03);
      biquad(b, sr, 'hp', 500, 0.7);
      fadeOut(b, sr, 0.1);
      reg('county_trailcam', normalizeTo(b, 0.7));
    }

    // Lane H's railroad crossing: the bell, four clangs in two seconds, re-triggered while on.
    {
      const b = new Float32Array(N(2.0));
      for (let k = 0; k < 4; k++) {
        const at = k * 0.5;
        damped(b, sr, 620, 0.32, 0.8, 0, at);
        damped(b, sr, 620 * 1.003, 0.28, 0.4, 0.5, at);
        damped(b, sr, 1130, 0.16, 0.45, 0, at);
        const strike = new Float32Array(N(0.02));
        noiseFill(strike, rn);
        biquad(strike, sr, 'bp', 1200, 1.0);
        envAD(strike, sr, 0.0005, 0.005);
        mixInto(b, strike, 0.3, N(at));
      }
      biquad(b, sr, 'hp', 250, 0.7);
      fadeOut(b, sr, 0.02);
      reg('county_xing', normalizeTo(b, 0.8));
    }

    // Lane E's failing ballast: a 120 Hz buzz with a comb of harmonics, gated by a flicker.
    {
      const b = new Float32Array(N(1.4));
      for (let h = 1; h <= 7; h++) {
        const w = 2 * Math.PI * 120 * h / sr, a = 0.6 / h;
        for (let i = 0; i < b.length; i++) b[i] += Math.sin(w * i) * a;
      }
      let g = 1, nextFlip = 0;
      for (let i = 0; i < b.length; i++) {
        if (i >= nextFlip) { g = rn() < 0.5 ? 1 : 0.25; nextFlip = i + N(0.02 + rn() * 0.12); }
        b[i] *= g;
      }
      biquad(b, sr, 'hp', 100, 0.7);
      fadeIn(b, sr, 0.02); fadeOut(b, sr, 0.15);
      reg('county_ballast', normalizeTo(b, 0.6));
    }
    this._rest.far = true;
    }

    if (want('radio')) {
    // THE RADIO'S SYNTHESIZED PARTS (radio.js STATIONS reference these by `buf`). All through
    // radioize(): 300-3400 Hz, a little saturation, a hiss, so the dashboard receives a
    // transmission and not a bake.
    {
      // EAS attention signal: 853 + 960 Hz for eight seconds, a second of dead air, then the
      // 1050 Hz cue for two seconds. The real thing, at the real frequencies.
      const b = new Float32Array(N(11.5));
      const w1 = 2 * Math.PI * 853 / sr, w2 = 2 * Math.PI * 960 / sr, w3 = 2 * Math.PI * 1050 / sr;
      const n8 = N(8.0), n9 = N(9.0), n11 = N(11.0);
      for (let i = 0; i < n8; i++) b[i] = (Math.sin(w1 * i) + Math.sin(w2 * i)) * 0.45;
      for (let i = n9; i < n11; i++) b[i] = Math.sin(w3 * i) * 0.6;
      // a click at each edge, as a transmitter keys
      for (const at of [0, 8.0, 9.0, 11.0]) {
        const c = new Float32Array(N(0.01)); noiseFill(c, rn); envAD(c, sr, 0.0003, 0.002);
        mixInto(b, c, 0.5, N(at));
      }
      reg('radio_eas', radioize(b, sr, rn, 0.03));
    }
    {
      // the open carrier between messages, with a time tick every second
      const b = new Float32Array(N(12.0));
      pinkFill(b, rn);
      biquad(b, sr, 'lp', 3000, 0.7);
      for (let i = 0; i < b.length; i++) b[i] *= 0.12;
      for (let s = 0; s < 12; s++) {
        const tick = new Float32Array(N(0.03));
        for (let i = 0; i < tick.length; i++) tick[i] = Math.sin(2 * Math.PI * 1000 * i / sr);
        envAD(tick, sr, 0.001, 0.008);
        mixInto(b, tick, 0.22, N(s));
      }
      reg('radio_carrier', radioize(b, sr, rn, 0.02));
    }
    {
      // the morning show's bumper: a major stab, an arpeggio up, and a shaker under it
      const b = new Float32Array(N(6.0));
      const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
      for (const m of [65, 69, 72, 77]) tine(b, hz(m), 0.0, 0.5, 0.9);
      for (let k = 0; k < 4; k++) tine(b, hz([72, 76, 79, 84][k]), 0.6 + k * 0.18, 0.45, 0.6);
      for (const m of [65, 69, 72, 77, 81]) { damped(b, sr, hz(m), 2.2, 0.55, 0, 1.5); damped(b, sr, hz(m) * 2, 1.1, 0.16, 0.4, 1.5); }
      for (let k = 0; k < 24; k++) {
        const sh = new Float32Array(N(0.05)); noiseFill(sh, rn); biquad(sh, sr, 'bp', 2600, 1.4); envAD(sh, sr, 0.002, 0.012);
        mixInto(b, sh, k % 2 ? 0.16 : 0.28, N(1.5 + k * 0.1875));
      }
      fadeOut(b, sr, 0.5);
      reg('radio_bumper', radioize(b, sr, rn, 0.02));
    }
    this._rest.radio = true;
    }

    this.restBaked = this._rest.dawn && this._rest.far && this._rest.radio;
    this.restMs += (typeof performance !== 'undefined' ? performance.now() : 0) - t0;
  }

  /* --------------------------------------------------------------- world -- */

  _sys(id) { return this.ctx.systems ? this.ctx.systems.get(id) : null; }

  _groundY(x, z) {
    const t = this._sys('terrain');
    if (t && t.heightAt) { const y = t.heightAt(x, z); if (Number.isFinite(y)) return y; }
    return 0;
  }

  _readPlayer() {
    const p = this._sys('player');
    if (p && p.pos) { this._px = p.pos.x; this._py = p.pos.y; this._pz = p.pos.z; return; }
    const cam = this.ctx.camera;
    if (cam) { this._px = cam.position.x; this._py = cam.position.y; this._pz = cam.position.z; }
  }

  /** Every major with a bell. Allocates once; the county's churches do not move. */
  _bells() {
    if (this._bellSites) return this._bellSites;
    const out = [];
    const places = this._sys('places');
    let list = null;
    try { list = places && places.all ? places.all() : null; } catch (e) { void e; }
    if (list) {
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p || !BELL_KINDS[p.kind]) continue;
        out.push({ id: p.id, x: p.x, z: p.z, y: this._groundY(p.x, p.z) + BELL_HEIGHT, size: out.length % 2 });
      }
    }
    // Only cache a real answer: places may not have planned yet on the very first step.
    if (out.length) this._bellSites = out;
    return out;
  }

  /** Every door the false dawn can go off behind. Allocates once, at the first dawn. */
  _dwell() {
    if (this._dwellings) return this._dwellings;
    const out = [];
    const places = this._sys('places');
    let list = null;
    try { list = places && places.all ? places.all() : null; } catch (e) { void e; }
    if (list) {
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        if (!p || !DWELLING_KINDS[p.kind]) continue;
        out.push({ id: p.id, x: p.x, z: p.z, farm: p.kind === 'barn' });
      }
    }
    const wilds = this._sys('wilds');
    let sites = null;
    try { sites = wilds && wilds.list ? wilds.list() : null; } catch (e) { void e; }
    if (sites) {
      for (let i = 0; i < sites.length; i++) {
        const s = sites[i];
        if (!s || s.kind !== 'camp') continue;
        let rec = null;
        try { rec = wilds.site(s.id); } catch (e) { void e; }
        const variant = rec && rec.variant;
        if (!variant || !HOMESTEAD_VARIANTS[variant]) continue;
        out.push({ id: s.id, x: s.x, z: s.z, farm: variant === 'farm' || variant === 'barn' });
      }
    }
    if (out.length) this._dwellings = out;
    return out;
  }

  /* --------------------------------------------------------------- bells -- */

  _enqueueToll(site, delayS) {
    const q = this._tolls;
    for (let i = 0; i < q.length; i++) {
      if (q[i].live) continue;
      q[i].live = true; q[i].at = delayS; q[i].site = site;
      return true;
    }
    return false;
  }

  _nearestBells(n, out) {
    const bells = this._bells();
    out.length = 0;
    for (let k = 0; k < n; k++) {
      let best = null, bd = BELL_RANGE_M;
      for (let i = 0; i < bells.length; i++) {
        const b = bells[i];
        if (out.indexOf(b) >= 0) continue;
        const d = Math.hypot(b.x - this._px, b.z - this._pz);
        if (d < bd) { bd = d; best = b; }
      }
      if (!best) break;
      out.push(best);
    }
    return out;
  }

  _toll(site) {
    const A = this.A;
    if (!A.baked || !site) return null;
    const d = Math.hypot(site.x - this._px, site.z - this._pz);
    const s = A.spec();
    s.x = site.x; s.y = site.y; s.z = site.z;
    s.bus = 'world';
    s.gain = 0.85;
    s.air = false; s.lpHz = farLp(d, 4000, 700);
    s.occl = false;
    s.ref = 80; s.roll = 0.6; s.maxDist = 2000;
    s.propagate = true;
    s.send = 0.5;
    s.priority = 3;
    s.cls = CUE_FLAVOUR;
    const v = A.play('county_bell' + site.size, s);
    if (v) { this._n.toll++; if (A.bed) A.bed.onDreadBeat(); }
    return v;
  }

  _stepBells(dt) {
    // the queue: phase tolls spaced TOLL_GAP_S apart, from up to two churches
    const q = this._tolls;
    for (let i = 0; i < q.length; i++) {
      if (!q[i].live) continue;
      q[i].at -= dt;
      if (q[i].at > 0) continue;
      q[i].live = false;
      this._toll(q[i].site);
    }
    // the lone toll: the county's stand-in for hours
    this._bellT -= dt;
    if (this._bellT <= 0) {
      this._bellT = BELL_EVERY_S;
      const near = this._nearestBells(1, this._scratchBells || (this._scratchBells = []));
      if (near.length) this._enqueueToll(near[0], 0);
    }
  }

  /* --------------------------------------------------------- the false dawn -- */

  _startDawn() {
    if (!this._rest.dawn) { try { this.bakeRest('dawn'); } catch (e) { void e; } }
    this._n.dawn++;
    const dw = this._dwell();
    // the nearest DAWN_HOUSES doors inside DAWN_RANGE_M, by insertion sort into the slots
    const H = this._houses;
    for (let i = 0; i < H.length; i++) H[i].live = false;
    let filled = 0;
    const dist = new Array(H.length).fill(Infinity);
    for (let i = 0; i < dw.length; i++) {
      const d = Math.hypot(dw[i].x - this._px, dw[i].z - this._pz);
      if (d > DAWN_RANGE_M) continue;
      let k = filled < H.length ? filled : -1;
      if (k < 0) { let worst = 0; for (let j = 1; j < H.length; j++) if (dist[j] > dist[worst]) worst = j; if (dist[worst] > d) k = worst; }
      if (k < 0) continue;
      if (filled < H.length) filled++;
      dist[k] = d;
      const h = H[k];
      h.live = true; h.x = dw[i].x; h.z = dw[i].z; h.y = this._groundY(dw[i].x, dw[i].z) + 1.6;
      h.next = this.rng.next() * 1.5;            // they do not all go off on the same tick
      h.coffee = (k % 2) === 0;                   // "coffee makers on timers" at half the doors
      h.coffeeNext = 0.5 + this.rng.next() * 2;
      h.v = (this.rng.next() * 2) | 0;
    }
    this._dawnLeft = ALARM_S;

    // the rooster: once, from the nearest farm inside a mile, five to eight seconds in
    this._roosterT = -1; this._roosterSite = null;
    if (ROOSTER_ON) {
      let best = null, bd = ROOSTER_RANGE_M;
      for (let i = 0; i < dw.length; i++) {
        if (!dw[i].farm) continue;
        const d = Math.hypot(dw[i].x - this._px, dw[i].z - this._pz);
        if (d < bd) { bd = d; best = dw[i]; }
      }
      if (best) { this._roosterSite = best; this._roosterT = 5 + this.rng.next() * 3; }
    }

    // the chorus: a minute, then dead silence
    this._chorusLeft = CHORUS_S;
    this._chorusAcc = 0;
  }

  _stepDawn(dt) {
    const A = this.A;
    if (this._dawnLeft > 0) {
      this._dawnLeft -= dt;
      const H = this._houses;
      for (let i = 0; i < H.length; i++) {
        const h = H[i];
        if (!h.live) continue;
        h.next -= dt;
        if (h.next <= 0) {
          const buf = A.buf['county_alarm' + h.v];
          h.next = buf ? buf.duration : 6;
          const s = A.spec();
          s.x = h.x; s.y = h.y; s.z = h.z;
          s.bus = 'world'; s.gain = 0.42;
          s.lpHz = 1500;                          // through a door and a window
          s.occl = true; s.ref = 10; s.roll = 1.4; s.maxDist = 120;
          s.send = 0.2; s.priority = 3; s.cls = CUE_FLAVOUR;
          if (A.play('county_alarm' + h.v, s)) { this._n.alarm++; if (A.bed) A.bed.onDreadBeat(); }
        }
        if (h.coffee) {
          h.coffeeNext -= dt;
          if (h.coffeeNext <= 0) {
            const buf = A.buf.county_coffee;
            h.coffeeNext = (buf ? buf.duration : 4) + 1.0 + this.rng.next() * 2;
            const s = A.spec();
            s.x = h.x + 1.5; s.y = h.y - 0.6; s.z = h.z - 1.0;
            s.bus = 'world'; s.gain = 0.38;
            s.occl = true; s.ref = 6; s.roll = 1.5; s.maxDist = 60;
            s.send = 0.3; s.priority = 3; s.cls = CUE_FLAVOUR;
            if (A.play('county_coffee', s)) { this._n.coffee++; if (A.bed) A.bed.onDreadBeat(); }
          }
        }
      }
      if (this._dawnLeft <= 0) for (let i = 0; i < H.length; i++) H[i].live = false;
    }

    if (this._roosterT >= 0) {
      this._roosterT -= dt;
      if (this._roosterT < 0) {
        const site = this._roosterSite;
        if (site && A.buf.county_rooster) {
          const d = Math.hypot(site.x - this._px, site.z - this._pz);
          const s = A.spec();
          s.x = site.x; s.y = this._groundY(site.x, site.z) + 1.2; s.z = site.z;
          s.bus = 'world'; s.gain = 0.8;
          s.air = false; s.lpHz = farLp(d, 1500, 900);
          s.occl = false; s.ref = 40; s.roll = 0.7; s.maxDist = 1400;
          s.propagate = true; s.send = 0.45; s.priority = 3; s.cls = CUE_FLAVOUR;
          if (A.play('county_rooster', s)) { this._n.rooster++; if (A.bed) A.bed.onDreadBeat(); }
        }
        this._roosterT = -1;
      }
    }

    if (this._chorusLeft > 0) {
      this._chorusLeft -= dt;
      // the birds come in over the first ten seconds and go out on a hard stop
      const ramp = clamp((CHORUS_S - this._chorusLeft) / 10, 0, 1);
      this._chorusAcc += dt * CHORUS_PER_S * ramp;
      while (this._chorusAcc > 1) {
        this._chorusAcc -= 1;
        const az = this.rng.next() * Math.PI * 2;
        const d = 15 + this.rng.next() * 45;
        const s = A.spec();
        s.x = this._px + Math.cos(az) * d; s.z = this._pz + Math.sin(az) * d;
        s.y = this._groundY(s.x, s.z) + 6 + this.rng.next() * 6;
        s.bus = 'world'; s.gain = 0.30 + this.rng.next() * 0.25;
        s.rate = 0.94 + this.rng.next() * 0.12;
        s.occl = false; s.ref = 12; s.roll = 1.2; s.maxDist = 120;
        s.send = 0.35; s.priority = 3; s.cls = CUE_FLAVOUR;
        if (A.play('county_chorus' + ((this.rng.next() * 4) | 0), s)) { this._n.chorus++; if (A.bed) A.bed.onDreadBeat(); }
      }
    }
  }

  /* -------------------------------------------------------------- chimes -- */

  _chime(x, z) {
    const A = this.A;
    if (!A.baked || this._chimeCool > 0) return null;
    this._chimeCool = CHIME_COOLDOWN_S;
    const s = A.spec();
    s.x = x; s.z = z; s.y = this._groundY(x, z) + 3;   // hung from a branch, no house near
    s.bus = 'world'; s.gain = 0.55;
    s.occl = false; s.ref = 20; s.roll = 1.0; s.maxDist = 200;
    s.send = 0.45; s.priority = 3; s.cls = CUE_FLAVOUR;
    const v = A.play('county_chime' + ((this.rng.next() * 3) | 0), s);
    if (v) { this._n.chime++; if (A.bed) A.bed.onDreadBeat(); }
    return v;
  }

  /** Lane C's director order (bearing in its atan2(x, z) convention): the tell, before the body. */
  onOrder(p) {
    this._orderSeen = true;
    if (!p || p.species !== 'hound') return;
    const b = typeof p.bearing === 'number' && isFinite(p.bearing) ? p.bearing : this.rng.next() * Math.PI * 2;
    const d = 30 + this.rng.next() * 20;
    this._chime(this._px + Math.sin(b) * d, this._pz + Math.cos(b) * d);
  }

  /** Fallback while no director:order has ever arrived: ring where the hound appeared. */
  onSpawned(e) {
    if (this._orderSeen || !e || e.species !== 'hound' || !e.pos) return;
    this._chime(e.pos.x, e.pos.z);
  }

  /* ------------------------------------------------------------- thunder -- */

  /** Lane F: 'weather:lightning' {x, z, dist, strength}. Thunder after dist / 340 s. */
  onLightning(p) {
    const A = this.A;
    if (!A.baked || !p) return null;
    const x = typeof p.x === 'number' && isFinite(p.x) ? p.x : this._px;
    const z = typeof p.z === 'number' && isFinite(p.z) ? p.z : this._pz;
    const y = 400;
    const dist = typeof p.dist === 'number' && isFinite(p.dist) && p.dist >= 0 ? p.dist : Math.hypot(x - this._px, z - this._pz);
    const strength = clamp(typeof p.strength === 'number' ? p.strength : 1, 0, 1);
    const v = (this.rng.next() * 3) | 0;
    const s = A.spec();
    s.x = x; s.y = y; s.z = z;
    s.bus = 'world';
    s.gain = (0.6 + 0.6 * strength) / (1 + dist / 1600);
    s.air = false; s.lpHz = farLp(dist, 5000, 600);
    s.occl = false;
    s.ref = 200; s.roll = 0.4; s.maxDist = 6000;
    s.delay = dist / 340;
    s.propagate = false;                    // the delay IS the propagation; not both
    s.send = 0.55; s.priority = 2; s.cls = CUE_FLAVOUR;
    const voice = A.play('county_thunder' + v, s);
    if (voice) {
      this._n.thunder++;
      if (A.bed) A.bed.onDreadBeat();
      if (dist < THUNDER_DUCK_M) A._bedDuck(THUNDER_DUCK_DB, A.now + dist / 340, 0.02, 0.9);
    }
    this._lastThunder = { dist: +dist.toFixed(0), strength, delayS: +(dist / 340).toFixed(2),
      lpHz: Math.round(s.lpHz), gain: +s.gain.toFixed(3), variant: v, voiced: !!voice,
      untilS: voice ? +(voice.until - A.now).toFixed(2) : 0 };
    return voice;
  }

  /* --------------------------------------------------------- the dog-caller -- */

  /** Lane C: 'dogcaller:call' {x, z, name}. The voice, a quarter mile off. */
  onCall(p) {
    const A = this.A;
    this._dc.calls++;
    if (this._dc.dead) { this._dc.refused++; return null; }
    if (this._dc.state === 0) { this._loadDogcaller(); }
    if (this._dc.state !== 2 || !A.baked || this._dc.cool > 0) return null;
    const x = p && typeof p.x === 'number' && isFinite(p.x) ? p.x : this._px;
    const z = p && typeof p.z === 'number' && isFinite(p.z) ? p.z : this._pz;
    const d = Math.hypot(x - this._px, z - this._pz);
    const v = (this.rng.next() * 3) | 0;
    if (!A.buf['dc_call' + v]) return null;
    this._dc.cool = DC_COOLDOWN_S;
    const s = A.spec();
    s.x = x; s.y = this._groundY(x, z) + 1.6; s.z = z;
    s.bus = 'world'; s.gain = 1.0;
    s.air = false; s.lpHz = farLp(d, 3000, 400);
    s.occl = true; s.priority = 2;
    // MEASURED at the master (tools/round22/check-G.mjs, bed held): ref 40 / roll 0.7 peaked
    // -20.6 dBFS at 300 m, level with the wind's RMS — a voice you argue about. He is the
    // county's one tell, so he carries: ref 60 / roll 0.6 is +4 dB there, 0.71 at 100 m.
    s.ref = 60; s.roll = 0.6; s.maxDist = 700;
    s.propagate = true; s.send = 0.5; s.cls = CUE_WORLD;
    const voice = A.play('dc_call' + v, s);
    if (voice) { this._dc.played++; if (A.bed) A.bed.onDreadBeat(); }
    return voice;
  }

  /** Lane C: 'dogcaller:dead'. The call never plays again. */
  onCallerDead() { this._dc.dead = true; }

  /**
   * Fetch and decode the three calls once, on the first call, off every hot path. A missing
   * file is swallowed: the man is lane C's and stays; only his voice is lost.
   */
  _loadDogcaller() {
    const A = this.A;
    if (this._dc.state !== 0) return;
    if (!A.actx || typeof fetch !== 'function') { this._dc.state = 3; return; }
    this._dc.state = 1;
    const load = async () => {
      const actx = A.actx;
      let any = false;
      for (let i = 0; i < DC_FILES.length; i++) {
        try {
          const res = await fetch(new URL('../../assets/voices/' + DC_FILES[i], import.meta.url));
          if (!res.ok) throw new Error('http ' + res.status);
          const bytes = await res.arrayBuffer();
          const dec = await actx.decodeAudioData(bytes.slice(0));
          const src = dec.getChannelData(0);
          const b = new Float32Array(src.length);
          b.set(src);
          const sr = dec.sampleRate;
          // A quarter mile of air, then a valley. Lowpassed twice, no consonants left; a
          // baked tail so the reverb is the same every time, whatever the openness blend.
          biquad(b, sr, 'hp', 220, 0.7);
          biquad(b, sr, 'lp', DC_LP_HZ, 0.7, 0, 2);
          const out = bakeTail(b, sr, DC_TAIL_S, 0.55);
          fadeOut(out, sr, 0.05);
          A.reg('dc_call' + i, [normalizeTo(out, 0.8)], sr);
          any = true;
        } catch (e) { void e; }
      }
      this._dc.state = any ? 2 : 3;
    };
    load().catch(() => { this._dc.state = 3; });
  }

  /* --------------------------------------------------------------- truck -- */

  _truckStart() {
    const T = this._truck;
    const roads = this._sys('roads');
    let routes = null;
    try { routes = roads && roads.routePolylines ? roads.routePolylines() : null; } catch (e) { void e; }
    if (!routes || !routes.length) return false;
    const route = routes[(this.rngTruck.next() * routes.length) | 0];
    if (!route || route.length < 2) return false;
    // a start vertex 300-500 m from the player, or whichever is nearest that band
    let best = 0, bd = Infinity;
    for (let i = 0; i < route.length; i++) {
      const d = Math.hypot(route[i].x - this._px, route[i].z - this._pz);
      const off = d < 300 ? 300 - d : d > 500 ? d - 500 : 0;
      if (off < bd) { bd = off; best = i; }
    }
    T.on = true; T.route = route; T.seg = Math.min(best, route.length - 2); T.frac = 0;
    T.dir = this.rngTruck.next() < 0.5 ? -1 : 1;
    T.x = route[T.seg].x; T.z = route[T.seg].z;
    T.next = 2 + this.rngTruck.next() * 6;
    T.moving = true; T.moveT = TRUCK_RETHINK_S;
    return true;
  }

  _stepTruck(dt) {
    const T = this._truck;
    if (!T.on) return;
    const A = this.A;
    // it parks and moves in stretches: "sometimes it moves"
    T.moveT -= dt;
    if (T.moveT <= 0) { T.moveT = TRUCK_RETHINK_S; T.moving = this.rngTruck.next() < 0.5; }
    if (T.moving) {
      const r = T.route;
      let a = r[T.seg], b = r[T.seg + 1];
      let segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      T.frac += (TRUCK_SPEED * dt) / segLen * T.dir;
      let guard = 0;
      while ((T.frac > 1 || T.frac < 0) && guard++ < 8) {
        if (T.frac > 1) { T.frac -= 1; T.seg++; if (T.seg >= r.length - 1) { T.seg = r.length - 2; T.dir = -1; T.frac = 1 - T.frac; } }
        else { T.frac += 1; T.seg--; if (T.seg < 0) { T.seg = 0; T.dir = 1; T.frac = 1 - T.frac; } }
        a = r[T.seg]; b = r[T.seg + 1];
        segLen = Math.hypot(b.x - a.x, b.z - a.z) || 1;
      }
      T.frac = clamp(T.frac, 0, 1);
      T.x = a.x + (b.x - a.x) * T.frac; T.z = a.z + (b.z - a.z) * T.frac;
    }
    T.next -= dt;
    if (T.next > 0) return;
    const buf = A.buf.county_jingle;
    T.next = (buf ? buf.duration : 20) + 0.5;
    if (!buf) { if (!this._rest.far) { try { this.bakeRest('far'); } catch (e) { void e; } } return; }
    const d = Math.hypot(T.x - this._px, T.z - this._pz);
    if (d < TRUCK_HEAR[0] || d > TRUCK_HEAR[1]) return;   // too close to be a mystery, too far to hear
    const s = A.spec();
    s.x = T.x; s.y = this._groundY(T.x, T.z) + 2.5; s.z = T.z;
    s.bus = 'world'; s.gain = 0.55;
    s.air = false; s.lpHz = farLp(d, 1200, 900);
    s.occl = false; s.ref = 90; s.roll = 0.65; s.maxDist = 1200;
    s.propagate = true; s.send = 0.5; s.priority = 3; s.cls = CUE_FLAVOUR;
    if (A.play('county_jingle', s)) { this._n.truck++; if (A.bed) A.bed.onDreadBeat(); }
  }

  /* ---------------------------------------------------------------- dome -- */

  /** Lane I: the button. A relay closing: the bolt-home knock from the armoury, slowed. */
  onButton(p) {
    const A = this.A;
    if (!A.baked || !A.buf.boltHome) return null;
    const s = A.spec();
    if (p && typeof p.x === 'number' && isFinite(p.x)) { s.x = p.x; s.z = p.z; s.y = typeof p.y === 'number' ? p.y : this._groundY(p.x, p.z) + 1.0; }
    s.bus = 'world'; s.gain = 0.5; s.rate = 0.6;
    s.ref = 3; s.roll = 1.2; s.maxDist = 40;
    s.send = 0.4; s.priority = 2; s.cls = CUE_WORLD;
    const v = A.play('boltHome', s);
    if (v) { this._n.button++; if (A.bed) A.bed.onDreadBeat(); }
    return v;
  }

  /** Lane I: 'planetarium:sunrise' {x, z, seconds}. The projector's hum, its own looping node. */
  onSunrise(p) {
    const A = this.A;
    if (!A.actx || !A.baked) return;
    if (!this._rest.far) { try { this.bakeRest('far'); } catch (e) { void e; } }
    const buf = A.buf.county_hum;
    if (!buf) return;
    if (this._hum.src) return;   // already humming since the button; the sunrise event does not restart it
    this._humStop(0.05);
    const c = A.actx, T = c.currentTime;
    const x = p && typeof p.x === 'number' && isFinite(p.x) ? p.x : this._px;
    const z = p && typeof p.z === 'number' && isFinite(p.z) ? p.z : this._pz;
    try {
      const src = c.createBufferSource();
      src.buffer = buf; src.loop = true;
      const pan = c.createPanner();
      pan.panningModel = 'HRTF'; pan.distanceModel = 'inverse';
      pan.refDistance = 6; pan.rolloffFactor = 1.0; pan.maxDistance = 80;
      const y = 3;
      if (pan.positionX) { pan.positionX.value = x; pan.positionY.value = y; pan.positionZ.value = z; }
      else pan.setPosition(x, y, z);
      const g = c.createGain();
      g.gain.value = 0;
      src.connect(pan); pan.connect(g);
      g.connect((A.busses && A.busses.world) || A.busWorld);
      src.start(T);
      g.gain.setTargetAtTime(0.18, T, 0.5);     // the lamp warms up
      this._hum.src = src; this._hum.gain = g; this._hum.pan = pan;
      this._n.hum++;
      if (A.bed) A.bed.onDreadBeat();
    } catch (e) { void e; }
  }

  /** Lane I: 'planetarium:ended'. Out over two seconds, then the source is stopped. */
  onEnded() { this._humStop(2.0); }

  _humStop(seconds) {
    const A = this.A, H = this._hum;
    if (!H.src) return;
    const c = A.actx;
    try {
      const T = c.currentTime;
      H.gain.gain.cancelScheduledValues(T);
      H.gain.gain.setValueAtTime(H.gain.gain.value, T);
      H.gain.gain.setTargetAtTime(0, T, Math.max(0.01, seconds / 3));
      H.src.stop(T + seconds + 0.2);
    } catch (e) { void e; }
    H.src = null; H.gain = null; H.pan = null;
  }

  /* ------------------------------------------------- siblings (E and H) -- */

  /** Lane E: 'dusk-to-dawn:flicker' {x, z}. A ballast on its way out. */
  onFlicker(p) {
    const A = this.A;
    if (!A.baked || this._ballastCool > 0 || !A.buf.county_ballast) return;
    if (!p || typeof p.x !== 'number' || typeof p.z !== 'number') return;
    this._ballastCool = 0.8;
    const s = A.spec();
    s.x = p.x; s.z = p.z; s.y = this._groundY(p.x, p.z) + 7;
    s.bus = 'world'; s.gain = 0.28;
    s.occl = false; s.ref = 5; s.roll = 1.3; s.maxDist = 40;
    s.send = 0.2; s.priority = 3; s.cls = CUE_FLAVOUR;
    if (A.play('county_ballast', s)) { this._n.ballast++; if (A.bed) A.bed.onDreadBeat(); }
  }

  /** Lane H: 'setpiece:trailcam' {x, y, z}. The click, and the capacitor. */
  onTrailcam(p) {
    const A = this.A;
    if (!A.baked || !A.buf.county_trailcam || !p || typeof p.x !== 'number') return;
    const s = A.spec();
    s.x = p.x; s.z = p.z; s.y = typeof p.y === 'number' ? p.y : this._groundY(p.x, p.z) + 1.5;
    s.bus = 'world'; s.gain = 0.5;
    s.occl = false; s.ref = 4; s.roll = 1.3; s.maxDist = 30;
    s.send = 0.2; s.priority = 2; s.cls = CUE_WORLD;
    if (A.play('county_trailcam', s)) { this._n.trailcam++; if (A.bed) A.bed.onDreadBeat(); }
  }

  /** Lane H: 'setpiece:crossing' {x, z, on}. The bell, while the gates are down. */
  onCrossing(p) {
    if (!p) return;
    const X = this._xing;
    if (p.on && typeof p.x === 'number' && typeof p.z === 'number') { X.on = true; X.x = p.x; X.z = p.z; X.next = 0; }
    else X.on = false;
  }

  _stepXing(dt) {
    const X = this._xing;
    if (!X.on) return;
    X.next -= dt;
    if (X.next > 0) return;
    const A = this.A;
    const buf = A.buf.county_xing;
    X.next = buf ? buf.duration : 2;
    if (!buf) return;
    const s = A.spec();
    s.x = X.x; s.z = X.z; s.y = this._groundY(X.x, X.z) + 4;
    s.bus = 'world'; s.gain = 0.5;
    s.occl = false; s.ref = 30; s.roll = 1.0; s.maxDist = 300;
    s.propagate = true; s.send = 0.4; s.priority = 3; s.cls = CUE_FLAVOUR;
    if (A.play('county_xing', s)) { this._n.xing++; if (A.bed) A.bed.onDreadBeat(); }
  }

  /* ------------------------------------------------------------ signals -- */

  /** Every phase change is an hour: the bells. The dawn is 6 AM; the night is the truck's. */
  onPhase(phase, prev) {
    void prev;
    this._readPlayer();
    const n = TOLLS[phase] || 0;
    if (n > 0) {
      const near = this._nearestBells(2, this._scratchBells || (this._scratchBells = []));
      for (let k = 0; k < near.length; k++) {
        for (let i = 0; i < n; i++) this._enqueueToll(near[k], i * TOLL_GAP_S + k * 0.9);
      }
    }
    if (phase === 'dawn') this._startDawn();
    if (phase === 'night') { if (!this._truck.on && this.rngTruck.next() < TRUCK_CHANCE) this._truckStart(); }
    if (phase === 'black' || phase === 'dawn') this._truck.on = false;
  }

  /* --------------------------------------------------------------- step -- */

  step(dt) {
    if (!this.baked) return;
    this._readPlayer();
    if (this._chimeCool > 0) this._chimeCool -= dt;
    if (this._dc.cool > 0) this._dc.cool -= dt;
    if (this._ballastCool > 0) this._ballastCool -= dt;
    this._stepBells(dt);
    this._stepDawn(dt);
    this._stepTruck(dt);
    this._stepXing(dt);
  }

  dispose() {
    this._humStop(0.05);
    this._truck.on = false;
    this._xing.on = false;
    for (let i = 0; i < this._tolls.length; i++) this._tolls[i].live = false;
  }

  /** The test surface: tools/round22/check-G.mjs reads exactly this. */
  state() {
    const T = this._truck;
    return {
      baked: this.baked, restBaked: this.restBaked, rest: Object.assign({}, this._rest),
      bakeMs: +this.bakeMs.toFixed(1), restMs: +this.restMs.toFixed(1),
      bells: this._bellSites ? this._bellSites.length : 0,
      dwellings: this._dwellings ? this._dwellings.length : 0,
      counts: Object.assign({}, this._n),
      lastThunder: this._lastThunder,
      dawnLeft: +this._dawnLeft.toFixed(1), chorusLeft: +this._chorusLeft.toFixed(1),
      roosterSite: this._roosterSite ? this._roosterSite.id : null, roosterOn: ROOSTER_ON,
      truck: { on: T.on, x: +T.x.toFixed(1), z: +T.z.toFixed(1), moving: T.moving, plays: this._n.truck },
      dogcaller: { state: this._dc.state, dead: this._dc.dead, calls: this._dc.calls, played: this._dc.played,
        refused: this._dc.refused, loaded: !!(this.A.buf && this.A.buf.dc_call0) },
      hum: !!this._hum.src,
      orderSeen: this._orderSeen,
    };
  }
}

export default County;
